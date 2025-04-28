import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { RedisManager } from './RedisManager';
import { consola, LogLevels } from 'consola';

describe('RedisManager', () => {
  // 存储原始环境变量
  const originalRedisURL = Bun.env.REDIS_URL;

  beforeAll(() => {
    consola.level = LogLevels.verbose;
    // 设置测试用的 REDIS_URL
    Bun.env.REDIS_URL = 'redis://localhost:6379/1';
  });

  afterAll(() => {
    // 恢复原始环境变量
    Bun.env.REDIS_URL = originalRedisURL;
  });

  it('能正常连接到Redis', async () => {
    // 实例化 RedisManager 并等待连接完成
    const manager = RedisManager.getInstance();
    // await manager.ready;
    expect(manager.ready).resolves.toBe(true);
    // 关闭 Redis 连接
    await manager.close();
  });
});
