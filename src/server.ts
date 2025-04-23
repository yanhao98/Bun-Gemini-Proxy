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
import { KeyManagerWithRedis } from './config/KeyManagerWithRedis';

consola.info(`🦊 进程启动耗时: ${process.uptime() * 1000} 毫秒`);
const t1 = performance.now();

if (keyManager instanceof KeyManagerWithRedis) {
  let redisReady = false;
  process.on('SIGTERM', async () => {
    console.log('接收到 SIGTERM 信号，正在优雅地关闭Redis连接...');
    if (!redisReady) {
      console.log('Redis连接尚未准备好，直接退出进程...');
      process.exit(0);
    }
    await (keyManager as KeyManagerWithRedis).redisManager.close();
  });
  await keyManager.ready;
  redisReady = true;
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
  console.log('接收到 SIGTERM 信号，正在优雅地关闭服务器...');

  const closeActiveConnections = true;
  await app.stop(closeActiveConnections);

  process.exit(0);
});
