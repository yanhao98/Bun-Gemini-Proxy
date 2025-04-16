import cors from '@elysiajs/cors';
import { html } from '@elysiajs/html';
import { serverTiming } from '@elysiajs/server-timing';
import { swagger } from '@elysiajs/swagger';
import { consola } from 'consola';
import Elysia from 'elysia';
import { errorHandler } from './plugins/error-handler';
import { mainRoutes } from './routes/main';
import { v1betaRoutes } from './routes/v1beta';
import { createPerfStream } from './utils/stream';
import { perfLog } from './utils/logger';

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
  // 添加性能日志 SSE 流路由
  .get('/events/perflog', createPerfStream)
  // <<< Routes <<<
  .use(cors())
  .use(serverTiming({ enabled: true }))
  .listen({ port: 7860, idleTimeout: 255 }); // 设置为Bun允许的最大空闲超时(255秒)以支持SSE长连接

consola.success(
  `🦊 Gemini 代理服务启动成功! 运行于 ${app.server?.hostname}:${app.server?.port}`,
);

consola.success(`🦊 服务启动耗时: ${performance.now() - t1} 毫秒`);

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await app.stop(/* closeActiveConnections */ true);
});

setInterval(() => {
  perfLog(
    {
      requestID: 'server',
    },
    '当前连接数:',
    app.server?.pendingRequests || 0,
  );
}, 3000);
