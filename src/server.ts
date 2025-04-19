import cors from '@elysiajs/cors';
import { html } from '@elysiajs/html';
import { serverTiming } from '@elysiajs/server-timing';
import { swagger } from '@elysiajs/swagger';
import { consola } from 'consola';
import Elysia from 'elysia';
import { errorHandler } from './plugins/error-handler';
import { mainRoutes } from './routes/main';
import { v1betaRoutes } from './routes/v1beta';
import { keyManager } from './config/keys';

consola.info(`🦊 进程启动耗时: ${process.uptime() * 1000} 毫秒`);
const t1 = performance.now();

if (Bun.env.NODE_ENV !== 'test') {
  await keyManager.ready; // 等待密钥初始化完成
}

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
  .listen({ port: 7860, idleTimeout: 60 /* seconds */ });

consola.success(`🦊 Gemini 代理服务启动成功! 运行于 ${app.server?.url}`);

consola.success(`🦊 服务启动耗时: ${performance.now() - t1} 毫秒`);

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await app.stop(/* closeActiveConnections */ true);
});
