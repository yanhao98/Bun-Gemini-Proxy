import { Elysia } from 'elysia';
import { requestID } from 'elysia-requestid';
import { createGeminiError } from '../utils';
import { GEMINI_API_HEADER_NAME } from '../utils/const';
import { log } from '../utils/logger';
import { beginPlugin } from './begin-plugin';

/**
 * 认证插件
 * 验证请求中的API密钥是否有效
 */
export const auth = new Elysia({ name: '@h/auth' })
  .use(beginPlugin)
  .use(requestID().as('global'))
  // .use((await import('@elysiajs/bearer')).bearer())
  .onBeforeHandle((ctx) => {
    // 提取认证密钥
    const authKey = extractAuthKey({
      query: ctx.query,
      headers: ctx.request.headers,
    });

    if (!authKey) {
      log(
        { requestID: ctx.requestID, begin: ctx.begin },
        `⚠️ [认证] 未提供API密钥`,
      );
      ctx.set.status = 401;
      return createGeminiError(401, '未提供有效的API密钥，请检查请求头');
    }

    // 验证密钥
    if (!isValidAuthKey(authKey)) {
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
  .as('scoped');

export interface AuthRequestCtx {
  query: Record<string, string>;
  headers: Headers;
}

/**
 * 从请求中提取认证密钥
 * 支持多种认证方式：请求头、查询参数、Bearer认证
 */
export function extractAuthKey({
  query,
  headers,
}: AuthRequestCtx): string | undefined {
  const authorization = headers.get('Authorization');

  return (
    headers.get(GEMINI_API_HEADER_NAME) ??
    new URLSearchParams(query).get('key') ??
    (authorization?.startsWith('Bearer ') ? authorization?.slice(7) : undefined)
  );
}

/**
 * 验证认证密钥是否有效
 */
function isValidAuthKey(key: string): boolean {
  const validKey = Bun.env.AUTH_KEY;

  if (!validKey) {
    console.warn(`⚠️ [系统] 未配置AUTH_KEY环境变量`);
    return false;
  }

  return key === validKey;
}
