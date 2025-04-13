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
        // 创建一个AbortController用于取消上游请求
        const controller = new AbortController();
        const signal = controller.signal;
        
        // 组合多个信号源：请求超时和手动取消
        const timeoutSignal = AbortSignal.timeout(30 * 1000); // 30秒超时
        
        // 监听客户端请求取消
        ctx.request.signal.addEventListener('abort', () => {
          perfLog(ctx, `[请求取消] 客户端取消了请求，正在取消上游请求...`);
          controller.abort(); // 取消上游请求
        }, { once: true });

        // 监听超时信号
        timeoutSignal.addEventListener('abort', () => {
          perfLog(ctx, `[请求超时] 请求超过了30秒时限，正在取消上游请求...`);
          controller.abort('请求超时'); // 带有原因的取消
        }, { once: true });

        const response = await fetch(apiURL, {
          method: 'POST',
          headers: { [GEMINI_API_HEADER_NAME]: xGoogApiKey },
          body: ctx.request.body,
          signal, // 使用我们的AbortController的信号
        });
        
        perfLog(ctx, `[响应接收] Gemini API返回状态码: ${response.status}`);

        ctx.set.status = response.status;

        if (!response.ok) return await response.clone().json();

        for await (const value of response.body!.values()) {
          // 在每次yield之前检查客户端是否已取消请求
          if (ctx.request.signal.aborted) {
            perfLog(ctx, `[数据流中断] 客户端已取消请求，停止数据传输`);
            break; // 停止迭代
          }
          
          perfLog(
            ctx,
            `[数据流传输] 接收数据分片，长度: ${value?.length} 字节`,
          );
          yield new TextDecoder().decode(value);
        }
        perfLog(ctx, `[数据流传输] 数据流传输完成`);
      } catch (error: unknown) {
        const typedError = error as Error;
        
        // 检查是否是因为客户端取消而导致的错误
        if (ctx.request.signal.aborted) {
          perfLog(ctx, `[请求取消] 因客户端取消请求而终止上游调用`);
          return; // 客户端已断开连接，无需返回错误
        }
        
        perfLog(ctx, `[请求异常] Gemini API调用失败: ${typedError.message}`);
        console.debug(error);
        
        ctx.set.status = typedError.name === 'TimeoutError' || typedError.name === 'AbortError' ? 504 : 500;
        return createGeminiError(
          ctx.set.status as number,
          typedError.name === 'TimeoutError' || typedError.name === 'AbortError'
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
