import { Elysia } from 'elysia';

import { createGeminiError } from '../utils';
import { GEMINI_API_HEADER_NAME } from '../utils/const';
import { perfLog } from '../utils/logger';
import { bearer } from '@elysiajs/bearer';

export const auth = new Elysia({ name: '@h/auth' })
  .use((await import('elysia-requestid')).requestID().as('plugin'))
  .use(bearer())
  .onBeforeHandle((ctx) => {
    perfLog(
      ctx,
      `[🔑] [认证] headers: ${JSON.stringify({
        headers: ctx.request.headers,
        query: ctx.query,
      })}`,
    );

    const authKey =
      ctx.request.headers.get(GEMINI_API_HEADER_NAME) ||
      new URLSearchParams(ctx.query).get('key') ||
      (ctx.bearer as string | null);

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
