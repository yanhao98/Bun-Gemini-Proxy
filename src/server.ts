import cors from '@elysiajs/cors';
import { html } from '@elysiajs/html';
import { serverTiming } from '@elysiajs/server-timing';
import { swagger } from '@elysiajs/swagger';
import { consola } from 'consola';
import Elysia from 'elysia';
import { errorHandler } from './plugins/error-handler';
import { mainRoutes } from './routes/main';
import { v1betaRoutes } from './routes/v1beta';

consola.info(`🦊 进程启动耗时: ${process.uptime() * 1000} 毫秒`);
const t1 = performance.now();

export const app = new Elysia()
  // .use((await import('./plugins/trace')).trace.as('global'))
  .use(errorHandler())
  .use(html())
  .use(swagger())
  // >>> Routes >>>
  .use(mainRoutes)
  .use(v1betaRoutes)
  // <<< Routes <<<
  .use(cors())
  .use(serverTiming({ enabled: true }))
  .listen({ port: 7860, idleTimeout: 60 * 1000 });

consola.success(`🦊 Gemini 代理服务启动成功! 运行于 ${app.server?.url}`);

consola.success(`🦊 服务启动耗时: ${performance.now() - t1} 毫秒`);

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await app.stop(/* closeActiveConnections */ true);
});
