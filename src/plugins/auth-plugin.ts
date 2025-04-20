import { Elysia } from 'elysia';

import { createGeminiError } from '../utils';
import { GEMINI_API_HEADER_NAME } from '../utils/const';
import { perfLog } from '../utils/logger';

export const auth = new Elysia({ name: '@h/auth' })
  .use((await import('elysia-requestid')).requestID().as('plugin'))
  // .use((await import('@elysiajs/bearer')).bearer())
  .onBeforeHandle((ctx) => {
    perfLog(ctx, `[🔑] [认证]`, ctx.path);
    // console.debug(
    //   `headers: ${JSON.stringify({
    //     headers: ctx.request.headers,
    //     query: ctx.query,
    //   })}`,
    // );

    const authorization = ctx.request.headers.get('Authorization');

    const authKey =
      ctx.request.headers.get(GEMINI_API_HEADER_NAME) ??
      new URLSearchParams(ctx.query).get('key') ??
      (authorization?.startsWith('Bearer ') ? authorization?.slice(7) : null);

    if (!authKey || authKey !== Bun.env.AUTH_KEY) {
      console.debug(`headers: `, ctx.request.headers);
    }

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
