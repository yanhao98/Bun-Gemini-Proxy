import { Elysia } from 'elysia';

import { createGeminiError } from '../utils';
import { GEMINI_API_HEADER_NAME } from '../utils/const';
import { perfLog } from '../utils/logger';

export const auth = new Elysia({ name: '@h/auth' })
  .use((await import('elysia-requestid')).requestID().as('plugin'))
  .onBeforeHandle((ctx) => {
    perfLog(ctx, `[🔑] 检查请求头: ${JSON.stringify(ctx.request.headers)}`);
    const authKey = ctx.request.headers.get(GEMINI_API_HEADER_NAME);

    if (!authKey) {
      return ctx.error(
        401,
        createGeminiError(401, '未提供有效的API密钥，请检查请求头'),
      );
    }

    if (authKey !== Bun.env.AUTH_KEY) {
      return ctx.error(
        403,
        createGeminiError(403, '提供的API密钥无效，请检查密钥是否正确'),
      );
    }
  })
  .as('plugin');
