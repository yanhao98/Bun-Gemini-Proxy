import { Elysia, t } from 'elysia';
import { keyManager } from '../config/keys';
import { auth } from '../plugins/auth-plugin';
import { createGeminiError, maskAPIKey } from '../utils';
import {
  GEMINI_API_HEADER_NAME,
  GEMINI_API_VERSION,
  GEMINI_BASE_URL,
} from '../utils/const';
import { perfLog } from '../utils/logger';

export const v1betaRoutes = new Elysia({ prefix: '/v1beta' })
  .use((await import('elysia-requestid')).requestID().as('plugin'))
  .use(auth)
  .get('/models', async function models(ctx) {
    const xGoogApiKey = keyManager.getNextApiKey();
    perfLog(ctx, `[密钥分配] API密钥已分配: ${maskAPIKey(xGoogApiKey)}`);
    const apiURL = `${GEMINI_BASE_URL}/${GEMINI_API_VERSION}/models`;
    perfLog(ctx, `[请求转发] 转发至Gemini API: ${apiURL}`);
    const response = await fetch(apiURL, {
      method: 'GET',
      headers: { [GEMINI_API_HEADER_NAME]: xGoogApiKey },
      signal: AbortSignal.timeout(10 * 1000), // 超时
    });
    perfLog(ctx, `[响应接收] Gemini API返回状态码: ${response.status}`);
    ctx.set.status = response.status;
    return response.json() as Promise<unknown>;
  })
  .post(
    '/models/:modelAndMethod',
    async function* handle_post_v1beta_models_model_and_action(ctx) {
      const xGoogApiKey = keyManager.getNextApiKey();
      perfLog(ctx, `[密钥分配] API密钥已分配: ${maskAPIKey(xGoogApiKey)}`);

      let apiURL = `${GEMINI_BASE_URL}/${GEMINI_API_VERSION}/models/${ctx.params.modelAndMethod}`;
      const searchParams = new URLSearchParams(ctx.query);
      searchParams.delete('key');
      apiURL += `?${searchParams.toString()}`;

      perfLog(ctx, `[请求转发] 转发至Gemini API: ${apiURL}`);
      try {
        const response = await fetch(apiURL, {
          method: 'POST',
          headers: { [GEMINI_API_HEADER_NAME]: xGoogApiKey },
          body: ctx.request.body,
          signal: AbortSignal.timeout(5 * 60 * 1000), // 超时
        });
        perfLog(ctx, `[响应接收] Gemini API返回状态码: ${response.status}`);

        ctx.set.status = response.status;

        // XXX: 处理错误响应？
        // if (response.status === 400)
        //   return makeGeminiErrorJson(400, { ... });

        if (!response.ok) return await response.clone().json();

        for await (const value of response.body!.values()) {
          perfLog(
            ctx,
            `[数据流传输] 接收数据分片，长度: ${value?.length} 字节`,
          );
          yield new TextDecoder().decode(value);
        }
        perfLog(ctx, `[数据流传输] 数据流传输完成`);
      } catch (error: unknown) {
        const typedError = error as Error;
        perfLog(ctx, `[请求异常] Gemini API调用失败: ${typedError.message}`);
        console.debug(error);
        ctx.set.status = typedError.name === 'TimeoutError' ? 504 : 500;
        return createGeminiError(
          ctx.set.status as number,
          typedError.name === 'TimeoutError'
            ? `请求超时`
            : `请求失败: ${typedError.message}`,
        );
      }
    },
    {
      query: t.Object({
        alt: t.Optional(t.Literal('sse')),
      }),
    },
  );
