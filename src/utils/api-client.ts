// eslint-disable no-invalid-fetch-options
import { dns } from 'bun';
import type { Context, SingletonBase } from 'elysia';
import { keyManager } from '../config/keys';
import { GEMINI_API_HEADER_NAME } from './const';
import { maskAPIKey } from './index';
import { perfLog } from './logger';

if (Bun.env.GEMINI_BASE_URL /* 测试用例可能没这个环境变量 */)
  dns.prefetch(new URL(Bun.env.GEMINI_BASE_URL).hostname);

type RequestContextWithID = Context<
  {},
  { derive: { requestID: string | number; begin: number } } & SingletonBase
>;

/**
 * 向 Gemini API 发送请求的通用客户端
 */
export async function handleGeminiApiRequest(ctx: RequestContextWithID) {
  // TODO: GEMINI_BASE_URL 不要 /v1beta
  const path = ctx.path.replace('/v1beta', '');
  ctx.request.signal!.addEventListener('abort', () => {
    perfLog(
      { requestID: ctx.requestID, begin: ctx.begin },
      `[请求取消] 请求已取消`,
    );
  });

  const xGoogApiKey = keyManager.getNextApiKey();
  perfLog(
    { requestID: ctx.requestID, begin: ctx.begin },
    `[密钥分配] API密钥已分配: ${maskAPIKey(xGoogApiKey)}`,
  );
  const targetUrl = buildRequestUrl(ctx);

  perfLog(
    { requestID: ctx.requestID, begin: ctx.begin },
    `[请求转发] 转发至Gemini API: ${targetUrl}`,
  );
  const resp = await fetch(targetUrl, {
    method: ctx.request.method,
    headers: buildRequestHeaders(path, xGoogApiKey),
    body: ctx.request.body,
    signal: ctx.request.signal,
    verbose: !true,
  });
  perfLog(
    { requestID: ctx.requestID, begin: ctx.begin },
    `[响应接收] Gemini API返回状态码: ${resp.status}`,
    ` 内容类型: ${resp.headers.get('content-type')}`,
    ...(resp.ok ? [`✅`] : [`❌`, await resp.clone().text()]),
  );

  if (!resp.ok) {
    // TODO: build Gemini API 错误响应
    return new Response(`目标服务器响应错误: ${resp.status}`, { status: 502 });
  }

  if (!resp.body) {
    // TODO: build Gemini API 错误响应
    return new Response('无法获取响应流', { status: 502 });
  }

  const isStream = resp.headers
    .get('content-type')
    ?.includes('text/event-stream');
  // 处理非流式响应
  if (!isStream) return resp;

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
      perfLog(
        { begin: ctx.begin, requestID: ctx.requestID },
        `[流处理] 开始零拷贝流处理`,
      );
    },
    transform(chunk, controller) {
      // 直接传递数据块，不进行额外的复制或缓冲
      controller.enqueue(chunk);

      perfLog(
        { requestID: ctx.requestID, begin: ctx.begin },
        `[数据流传输] 零拷贝传输数据分片，长度: ${chunk?.byteLength || 0} 字节`,
      );
    },
    flush(_controller) {
      perfLog(
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

function buildRequestHeaders(path: string, xGoogApiKey: string) {
  const headers = new Headers({
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // 根据路径选择正确的认证头
  if (path.startsWith('/openai')) {
    headers.set('authorization', `Bearer ${xGoogApiKey}`);
  } else {
    headers.set(GEMINI_API_HEADER_NAME, xGoogApiKey);
  }
  return headers;
}

function buildRequestUrl(ctx: RequestContextWithID) {
  const path = ctx.path.replace('/v1beta', '');
  let targetUrl = `${Bun.env.GEMINI_BASE_URL}${path}`;
  const searchParams = new URLSearchParams(ctx.query);
  searchParams.delete('key');
  const queryString = searchParams.toString();
  if (queryString) targetUrl += `?${queryString}`;
  return targetUrl;
}
