// eslint-disable no-invalid-fetch-options
import type { Context, SingletonBase } from 'elysia';
import { keyManager } from '../config/keys';
import { GEMINI_API_HEADER_NAME } from './const';
import { maskAPIKey } from './index';
import { log } from './logger';

type RequestContextWithID = Context<
  {},
  { derive: { requestID: string | number; begin: number } } & SingletonBase
>;

/**
 * 向 Gemini API 发送请求的通用客户端
 */
export async function handleGeminiApiRequest(ctx: RequestContextWithID) {
  ctx.request.signal!.addEventListener('abort', () => {
    log(
      { requestID: ctx.requestID, begin: ctx.begin },
      `[请求取消] 请求已取消`,
    );
  });

  const xGoogApiKey = keyManager.getNextApiKey();
  log(
    { requestID: ctx.requestID, begin: ctx.begin },
    `[密钥分配] API密钥已分配: ${maskAPIKey(xGoogApiKey)}`,
  );
  const targetUrl = buildRequestUrl(ctx);

  log(
    { requestID: ctx.requestID, begin: ctx.begin },
    `[请求转发] 转发至Gemini API: ${targetUrl}`,
  );
  const resp = await fetch(targetUrl, {
    method: ctx.request.method,
    headers: buildRequestHeaders(ctx, xGoogApiKey),
    body: ctx.request.body,
    signal: ctx.request.signal,
    verbose: !true,
  });
  log(
    { requestID: ctx.requestID, begin: ctx.begin },
    `[响应接收] Gemini API返回状态码: ${resp.status}`,
    `内容类型: ${resp.headers.get('content-type')}`,
    ...(resp.ok ? [`✅`] : [`❌`, await resp.clone().text()]),
  );

  if (!resp.ok) {
    return buildGeminiErrorResponse(
      `目标服务器响应错误: ${resp.status}`,
      resp.status,
      resp.statusText,
    );
  }

  if (!resp.body) {
    return buildGeminiErrorResponse(`无法获取响应流`, 502, 'Bad Gateway');
  }

  // 处理非流式响应
  if (!resp.headers.get('content-type')?.includes('text/event-stream'))
    return resp;

  return createProperStreamResponse(
    { begin: ctx.begin, requestID: ctx.requestID },
    resp,
  );
}

function createProperStreamResponse(
  ctx: { begin: number; requestID: string | number },
  originalResponse: Response,
) {
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

  // 将原始响应流直接连接到转换流
  // 使用 pipeTo 而不是读取整个流再写入，避免内存复制
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

function buildRequestHeaders(ctx: RequestContextWithID, xGoogApiKey: string) {
  const path = ctx.path;
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

function buildRequestUrl(ctx: RequestContextWithID) {
  const path = ctx.path;
  let targetUrl = `${Bun.env.GEMINI_BASE_URL}${path}`;
  const searchParams = new URLSearchParams(ctx.query);
  searchParams.delete('key');
  const queryString = searchParams.toString();
  if (queryString) targetUrl += `?${queryString}`;
  return targetUrl;
}

function buildGeminiErrorResponse(
  errorMessage: string,
  errorCode: number,
  errorStatus: string,
): Response {
  const errorJson = {
    error: {
      code: errorCode,
      message: `${errorMessage}`,
      status: errorStatus,
    },
  };

  return new Response(JSON.stringify(errorJson), { status: errorCode });
}
