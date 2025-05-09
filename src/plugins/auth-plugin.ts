import { Elysia } from 'elysia';

import { createGeminiError } from '../utils';
import { GEMINI_API_HEADER_NAME } from '../utils/const';
import { log } from '../utils/logger';
import { beginPlugin } from './begin-plugin';

export const auth = new Elysia({ name: '@h/auth' })
  .use(beginPlugin)
  .use((await import('elysia-requestid')).requestID().as('global'))
  // .use((await import('@elysiajs/bearer')).bearer())
  .onBeforeHandle((ctx) => {
    const authorization = ctx.request.headers.get('Authorization');

    const authKey =
      ctx.request.headers.get(GEMINI_API_HEADER_NAME) ??
      new URLSearchParams(ctx.query).get('key') ??
      (authorization?.startsWith('Bearer ') ? authorization?.slice(7) : null);

    if (!authKey) {
      log(
        { requestID: ctx.requestID, begin: ctx.begin },
        `⚠️ [认证] 未提供API密钥`,
      );
      ctx.set.status = 401;
      return createGeminiError(401, '未提供有效的API密钥，请检查请求头');
    }

    if (authKey !== Bun.env.AUTH_KEY) {
      log(
        { requestID: ctx.requestID, begin: ctx.begin },
        `❌ [认证] 提供的API密钥无效`,
      );
      ctx.set.status = 403;
      return createGeminiError(403, '提供的API密钥无效，请检查密钥是否正确');
    }
    log(
      { requestID: ctx.requestID, begin: ctx.begin },
      `✅ [认证] API密钥验证成功`,
    );
  })
  .as('global');
