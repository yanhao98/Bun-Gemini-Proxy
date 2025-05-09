import cors from '@elysiajs/cors';
import { html } from '@elysiajs/html';
import { serverTiming } from '@elysiajs/server-timing';
import { swagger } from '@elysiajs/swagger';
import Elysia from 'elysia';
import { errorHandler } from './plugins/error-handler';
import { mainRoutes } from './routes/_main';
import { gemini_v1betaRoutes } from './routes/gemini_v1beta';

export const app = new Elysia()
  // .use((await import('./plugins/trace')).trace.as('global'))
  .use(errorHandler())
  .use(html())
  .use(swagger())
  // >>> Routes >>>
  .use(mainRoutes)
  .use(gemini_v1betaRoutes)
  // <<< Routes <<<
  .use(cors())
  .use(serverTiming({ enabled: true }));
