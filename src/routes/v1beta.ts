import { z } from 'zod';
import { dns } from 'bun';
import { Elysia, t } from 'elysia';
import { keyManager } from '../config/keys';
import { auth } from '../plugins/auth-plugin';
import {
  createGeminiError,
  handleGeminiErrorResponse,
  maskAPIKey,
} from '../utils';
import {
  GEMINI_API_HEADER_NAME,
  GEMINI_API_VERSION,
  GEMINI_BASE_URL,
} from '../utils/const';
import { perfLog } from '../utils/logger';
import { beginPlugin } from '../plugins/begin-plugin';

const modelsResponseSchema = z.object({
  models: z.array(
    z
      .object({
        name: z.string(),
        description: z.string().optional(),
      })
      .passthrough(), // 允许未定义的键通过
  ),
});

setTimeout(() => {
  dns.prefetch(new URL(GEMINI_BASE_URL).hostname);
  // fetch.preconnect(`${GEMINI_BASE_URL}/${GEMINI_API_VERSION}`);
}, 1);

export const v1betaRoutes = new Elysia({ prefix: '/v1beta' })
  .use(beginPlugin)
  .use((await import('elysia-requestid')).requestID().as('plugin'))
  .use(auth)
  .get('/models', async function models(ctx): Promise<unknown> {
    // ctx.server!.timeout(ctx.request, 10 * 1000);

    const xGoogApiKey = keyManager.getNextApiKey();
    perfLog(ctx, `[密钥分配] API密钥已分配: ${maskAPIKey(xGoogApiKey)}`);

    const apiURL = `${GEMINI_BASE_URL}/${GEMINI_API_VERSION}/models`;
    perfLog(ctx, `[请求转发] 转发至Gemini API: ${apiURL}`);

    const response = await fetch(apiURL, {
      method: 'GET',
      headers: { [GEMINI_API_HEADER_NAME]: xGoogApiKey },
      signal: AbortSignal.timeout(9 * 1000), // 超时
      verbose: true,
    });
    perfLog(ctx, `[响应接收] Gemini API返回状态码: ${response.status}`);

    ctx.set.status = response.status;

    if (!response.ok) return handleGeminiErrorResponse(response);

    const jsonResponse = await response.json();
    const { models, ...rest } = modelsResponseSchema.parse(jsonResponse);

    return {
      ...rest,
      models: models
        // 过滤掉包含 "deprecated" 的描述的模型
        .filter(({ description }) => !description?.includes('deprecated')),
    };
  })
  .post(
    '/models/:modelAndMethod',
    async function* handle_post_v1beta_models_model_and_action(ctx) {
      ctx.request.signal.addEventListener('abort', () => {
        perfLog(ctx, `[请求取消] 请求已取消`);
      });

      const modelAndMethod = ctx.params.modelAndMethod;
      const model = modelAndMethod.split(':')[0];
      const method = modelAndMethod.split(':')[1];

      const xGoogApiKey = keyManager.getNextApiKey();
      perfLog(ctx, `[密钥分配] API密钥已分配: ${maskAPIKey(xGoogApiKey)}`);

      let apiURL = `${GEMINI_BASE_URL}/${GEMINI_API_VERSION}/models/${ctx.params.modelAndMethod}`;
      const searchParams = new URLSearchParams(ctx.query);
      searchParams.delete('key');
      const queryString = searchParams.toString();
      // 检查是否有剩余参数，并直接拼接查询字符串
      if (queryString) apiURL += `?${queryString}`;

      perfLog(
        ctx,
        `[请求转发]`,
        `模型: ${model}, 方法: ${method}`, // streamGenerateContent/generateContent
        `转发至Gemini API: ${apiURL}`,
      );
      try {
        const response = await fetch(apiURL, {
          method: 'POST',
          headers: { [GEMINI_API_HEADER_NAME]: xGoogApiKey },
          body: ctx.request.body,
          signal: AbortSignal.timeout(10 * 60 * 1000), // 超时
        });
        perfLog(
          ctx,
          `[响应接收] Gemini API返回状态码: ${response.status}`,
          ` 内容类型: ${response.headers.get('content-type')}`,
          ...(response.ok ? [`✅`] : [`❌`, await response.clone().text()]),
        );

        ctx.set.status = response.status;

        if (!response.ok) return handleGeminiErrorResponse(response);

        if (method === 'generateContent') {
          // 非流式响应
          return await response.json();
        }

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
