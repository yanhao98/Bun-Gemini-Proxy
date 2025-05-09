import { consola } from 'consola';
import { KeyManagerWithRedis } from './config/KeyManager.WithRedis';
import { keyManager } from './config/keys';
import { app } from './server.app';

import si from 'systeminformation';

// 获取系统内存使用情况
await si.mem()
  .then((data) => {
    console.log('系统内存使用情况:');
    console.log(`总内存: ${(data.total / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`已用内存: ${(data.used / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`空闲内存: ${(data.free / 1024 / 1024 / 1024).toFixed(2)} GB`);
  })
  .catch((error) => console.error('获取系统内存信息失败:', error));


const t1 = performance.now();

consola.info(
  `🥳 进程启动耗时: ${process.uptime() * 1000} 毫秒 | 版本: ${
    process.env.VERSION
  } | 平台: ${process.platform}`,
);

keyManager.loadApiKeys();
if (keyManager instanceof KeyManagerWithRedis) {
  let redisReady = false;
  process.on('SIGTERM', async () => {
    console.log('📣 接收到 SIGTERM 信号，正在优雅地关闭Redis连接...');
    if (!redisReady) {
      console.log('❌ Redis连接尚未准备好，直接退出进程...');
      process.exit(0);
    }
    await (keyManager as KeyManagerWithRedis).redisManager.close();
  });

  console.time('Redis连接初始化耗时');
  await keyManager.ready;
  redisReady = true;
  console.timeEnd('Redis连接初始化耗时');
}

app.listen({ port: 7860 /* , idleTimeout: 60 */ /* seconds */ });

consola.success(`🦊 Gemini 代理服务启动成功! 运行于 ${app.server?.url}`);

consola.success(`🦊 服务启动耗时: ${performance.now() - t1} 毫秒`);

process.on('SIGTERM', async () => {
  console.log('接收到 SIGTERM 信号，正在优雅地关闭服务器...');

  const closeActiveConnections = true;
  await app.stop(closeActiveConnections);

  process.exit(0);
});
