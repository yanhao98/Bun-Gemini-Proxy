import { Elysia } from 'elysia';
import { z } from 'zod';
import { auth } from '../plugins/auth-plugin';
import { beginPlugin } from '../plugins/begin-plugin';
import { handleGeminiApiRequest } from '../utils/api-client';

const _modelsResponseSchema = z.object({
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
  .use((await import('elysia-requestid')).requestID().as('plugin'))
  .use(auth)
  .get('/openai/models', handleGeminiApiRequest)
  .get('/openai/models/:model', handleGeminiApiRequest)
  .post('/openai/chat/completions', handleGeminiApiRequest)
  .get('/models', handleGeminiApiRequest)
  .post('/models/:modelAndMethod', handleGeminiApiRequest);
