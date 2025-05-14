import { Elysia } from 'elysia';
import { z } from 'zod';
import { auth } from '../plugins/auth-plugin';
import { beginPlugin } from '../plugins/begin-plugin';
import { handleGeminiApiRequest } from '../utils/api-client';
import { log } from '../utils/logger';

const modelsDataSchema = z.object({
  models: z.array(
    z
      .object({
        name: z.string(),
        description: z.string().optional(),
      })
      .passthrough(), // 允许未定义的键通过
  ),
});

export const gemini_v1betaRoutes = new Elysia({ prefix: '/v1beta' })
  .use(beginPlugin)
  .use((await import('elysia-requestid')).requestID().as('global'))
  .use(auth)
  .get('/openai/models', handleGeminiApiRequest)
  .get('/openai/models/:model', handleGeminiApiRequest)
  .post('/openai/chat/completions', handleGeminiApiRequest)
  .get('/models', handleGeminiApiRequest, {
    afterHandle: [
      async (ctx) => {
        const response = ctx.response;
        if (response instanceof Response && response.ok) {
          log(
            { requestID: ctx.requestID, begin: ctx.begin },
            `[响应处理] 过滤模型列表`,
          );
          return {
            models: modelsDataSchema
              .parse(await response.clone().json())
              .models.filter(
                (model) =>
                  !model.description?.includes('deprecated') &&
                  !model.name.includes('1.5'),
              ),
          };
        }
      },
    ],
  })
  .post('/models/:modelAndMethod', handleGeminiApiRequest);
