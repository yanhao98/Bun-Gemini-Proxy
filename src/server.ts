import { consola } from 'consola';
import { KeyManagerWithRedis } from './managers/KeyManager.WithRedis';
import { keyManager } from './managers/keys';
import { app } from './server.app';
import si from 'systeminformation';
import { log } from './utils/logger';

// 异步函数用于获取系统信息
async function getSystemInfo() {
  try {
    const memInfo = await si.mem();
    consola.info('系统内存使用情况:');
    consola.info(
      `总内存: ${(memInfo.total / 1024 / 1024 / 1024).toFixed(2)} GB`,
    );
    consola.info(
      `已用内存: ${(memInfo.used / 1024 / 1024 / 1024).toFixed(2)} GB`,
    );
    consola.info(
      `空闲内存: ${(memInfo.free / 1024 / 1024 / 1024).toFixed(2)} GB`,
    );
  } catch (error) {
    consola.error('获取系统内存信息失败:', error);
  }
}

// 启动应用
async function startApp() {
  const startTime = performance.now();

  await getSystemInfo();

  consola.info(
    `🥳 进程启动耗时: ${process.uptime() * 1000} 毫秒 | 版本: ${
      process.env.VERSION
    } | 平台: ${process.platform}`,
  );

  // 加载API密钥
  keyManager.loadApiKeys();

  // 如果使用Redis，等待连接初始化
  if (keyManager instanceof KeyManagerWithRedis) {
    let redisReady = false;

    // 设置SIGTERM处理程序以优雅关闭Redis连接
    process.on('SIGTERM', async () => {
      consola.info('📣 接收到 SIGTERM 信号，正在优雅地关闭Redis连接...');
      if (!redisReady) {
        consola.warn('❌ Redis连接尚未准备好，直接退出进程...');
        process.exit(0);
      }
      await (keyManager as KeyManagerWithRedis).redisManager.close();
    });

    // 初始化Redis连接
    console.time('Redis连接初始化耗时');
    try {
      await keyManager.ready;
      redisReady = true;
      console.timeEnd('Redis连接初始化耗时');
    } catch (error) {
      consola.error('Redis初始化失败:', error);
    }
  }

  // 启动服务器
  const port = Number(process.env.PORT) || 7860;
  app.listen({
    port,
    // idleTimeout: 60 /* seconds */
  });

  consola.success(`🦊 Gemini 代理服务启动成功! 运行于 ${app.server?.url}`);
  consola.success(`🦊 服务启动耗时: ${performance.now() - startTime} 毫秒`);
}

// 设置全局错误处理
process.on('uncaughtException', (error) => {
  consola.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason) => {
  consola.error('未处理的Promise拒绝:', reason);
});

// 设置优雅关闭服务器
process.on('SIGTERM', async () => {
  consola.info('接收到 SIGTERM 信号，正在优雅地关闭服务器...');

  try {
    const closeActiveConnections = true;
    await app.stop(closeActiveConnections);
    consola.success('服务器已成功关闭');
  } catch (error) {
    consola.error('关闭服务器时出错:', error);
  }

  process.exit(0);
});

// 启动应用
startApp()
  .then(() => {
    log({ requestID: 'server' }, '应用启动成功');
  })
  .catch((error) => {
    consola.fatal('应用启动失败:', error);
    process.exit(1);
  });
