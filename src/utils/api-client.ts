import type { Context, SingletonBase } from 'elysia';
import { keyManager } from '../managers/keys';
import { GEMINI_API_HEADER_NAME, MODEL_NAME_MAPPINGS } from './const';
import { maskAPIKey } from './index';
import { log, type LogCtx } from './logger';

type RequestContextWithID = Context<
  {},
  { derive: { requestID: string | number; begin: number } } & SingletonBase
>;



/**
 * 向 Gemini API 发送请求的通用客户端
 */
export async function handleGeminiApiRequest(ctx: RequestContextWithID) {
  // 监听请求取消事件
  ctx.request.signal!.addEventListener('abort', () => {
    log(
      { requestID: ctx.requestID, begin: ctx.begin },
      `[请求取消] 请求已取消`,
    );
  });

  // 获取API密钥
  const xGoogApiKey = keyManager.getNextApiKey();
  log(
    { requestID: ctx.requestID, begin: ctx.begin },
    `[密钥分配] API密钥已分配: ${maskAPIKey(xGoogApiKey)}`,
  );

  // 构建目标URL
  let targetUrl = buildRequestUrl(ctx);

  // 应用模型名称映射
  targetUrl = applyModelNameMappings(targetUrl, ctx);

  // 发送请求
  log(
    { requestID: ctx.requestID, begin: ctx.begin },
    `[请求转发] 转发至Gemini API: ${targetUrl}`,
  );

  try {
    const resp = await fetch(targetUrl, {
      method: ctx.request.method,
      headers: buildRequestHeaders(ctx, xGoogApiKey),
      body: ctx.request.body,
      signal: ctx.request.signal,
      verbose: !true,
    });

    // 记录响应信息
    log(
      { requestID: ctx.requestID, begin: ctx.begin },
      `[响应接收] Gemini API返回状态码: ${resp.status}`,
      `内容类型: ${resp.headers.get('content-type')}`,
      ...(resp.ok ? [`✅`] : [`❌`, await resp.clone().text()]),
    );

    // 处理错误响应
    if (!resp.ok) {
      return handleErrorResponse(resp, {
        requestID: ctx.requestID,
        begin: ctx.begin,
        request: ctx.request,
      });
    }

    // 检查响应体是否存在
    if (!resp.body) {
      return buildGeminiErrorResponse(`无法获取响应流`, 502);
    }

    // 根据内容类型处理响应
    return resp.headers.get('content-type')?.includes('text/event-stream') // isStream
      ? createProperStreamResponse(
          { begin: ctx.begin, requestID: ctx.requestID },
          resp,
        )
      : resp;
  } catch (error) {
    log(
      { requestID: ctx.requestID, begin: ctx.begin },
      `[请求错误] 请求失败: ${error}`,
    );
    return buildGeminiErrorResponse(`请求目标服务器时出错: ${error}`, 502);
  }
}

/**
 * 应用模型名称映射
 */
function applyModelNameMappings(
  url: string,
  ctx: RequestContextWithID,
): string {
  let targetUrl = url;

  // 对URL中的所有可能的模型名称进行映射处理
  Object.entries(MODEL_NAME_MAPPINGS).forEach(([source, target]) => {
    if (targetUrl.includes(source)) {
      targetUrl = targetUrl.replace(source, target);
      log(
        { requestID: ctx.requestID, begin: ctx.begin },
        `[模型映射] 模型名称映射: ${source} => ${target}`,
      );
    }
  });

  return targetUrl;
}

/**
 * 处理错误响应
 */
async function handleErrorResponse(
  resp: Response,
  ctx: LogCtx & { request: Request },
): Promise<Response> {
  try {
    // 尝试解析上游返回的错误信息
    const errorData = await resp.json();
    if (errorData.error) {
      // 只保留 message 和 status，不保留 details
      return buildGeminiErrorResponse(
        `目标服务器响应错误: ${errorData.error.message || resp.status}`,
        resp.status,
      );
    }
  } catch (e) {
    // 解析失败时使用基本错误信息
    log(
      { requestID: ctx.requestID, begin: ctx.begin },
      `[错误处理] 解析错误信息失败: ${e}`,
    );
  }

  return buildGeminiErrorResponse(
    `目标服务器响应错误: ${resp.status}`,
    resp.status,
  );
}

/**
 * 创建优化的流式响应
 */
function createProperStreamResponse(
  ctx: { begin: number; requestID: string | number },
  originalResponse: Response,
): Response {
  const originalBody = originalResponse.body!;

  // 创建转换流，实现零拷贝传递
  const transformStream = new TransformStream({
    start(_controller) {
      log(
        { begin: ctx.begin, requestID: ctx.requestID },
        `[流处理] 开始零拷贝流处理`,
      );
    },
    transform(chunk, controller) {
      // 直接传递数据块，不进行额外的复制或缓冲
      controller.enqueue(chunk);

      log(
        { requestID: ctx.requestID, begin: ctx.begin },
        `[数据流传输] 零拷贝传输数据分片，长度: ${chunk?.byteLength || 0} 字节`,
      );
    },
    flush(_controller) {
      log(
        { begin: ctx.begin, requestID: ctx.requestID },
        `[流处理] 零拷贝流处理完成`,
      );
    },
  });

  // 将原始响应流直接连接到转换流，避免内存复制
  originalBody.pipeTo(transformStream.writable).catch((err) => {
    console.error('流处理错误:', err);
  });

  // 返回优化过的流响应
  return new Response(transformStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * 构建请求头
 */
function buildRequestHeaders(
  ctx: RequestContextWithID,
  xGoogApiKey: string,
): Headers {
  const path = new URL(ctx.request.url).pathname;
  const headers = new Headers({
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // 根据路径选择正确的认证头
  if (path.startsWith('/v1beta/openai')) {
    headers.set('authorization', `Bearer ${xGoogApiKey}`);
  } else {
    headers.set(GEMINI_API_HEADER_NAME, xGoogApiKey);
  }
  return headers;
}

/**
 * 构建请求URL
 */
function buildRequestUrl(ctx: RequestContextWithID): string {
  const path = new URL(ctx.request.url).pathname;
  const baseUrl =
    Bun.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';

  let targetUrl = `${baseUrl}${path}`;
  const searchParams = new URLSearchParams(ctx.query);
  searchParams.delete('key');
  const queryString = searchParams.toString();
  if (queryString) targetUrl += `?${queryString}`;

  return targetUrl;
}

/**
 * 构建Gemini错误响应
 */
function buildGeminiErrorResponse(
  errorMessage: string,
  errorCode: number,
): Response {
  const errorJson = {
    error: {
      message: errorMessage,
    },
  };
  return new Response(JSON.stringify(errorJson), {
    status: errorCode,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
