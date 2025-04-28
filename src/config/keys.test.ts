import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createKeyManager } from './keys';
import { KeyManager } from './KeyManager';
import { KeyManagerWithRedis } from './KeyManager.WithRedis';

describe('createKeyManager', () => {
  let originalRedisUrl: string | undefined;

  beforeEach(() => {
    // 保存原始的 REDIS_URL 值
    originalRedisUrl = Bun.env.REDIS_URL;
  });

  afterEach(() => {
    // 恢复原始的 REDIS_URL 值
    Bun.env.REDIS_URL = originalRedisUrl;
  });

  it('当设置了 REDIS_URL 时，应返回 KeyManagerWithRedis 的实例', () => {
    Bun.env.REDIS_URL = 'redis://localhost:6379'; // 设置一个有效的 Redis URL
    const manager = createKeyManager();
    expect(manager).toBeInstanceOf(KeyManagerWithRedis);
  });

  it('当未设置 REDIS_URL 时，应返回 KeyManager 的实例', () => {
    delete Bun.env.REDIS_URL; // 确保 REDIS_URL 未定义
    const manager = createKeyManager();
    expect(manager).toBeInstanceOf(KeyManager);
  });

  it('当 REDIS_URL 为空字符串时，应返回 KeyManager 的实例', () => {
    Bun.env.REDIS_URL = ''; // 设置 REDIS_URL 为空字符串
    const manager = createKeyManager();
    expect(manager).toBeInstanceOf(KeyManager);
  });

  it('当 REDIS_URL 只包含空格时，应返回 KeyManager 的实例', () => {
    Bun.env.REDIS_URL = '   '; // 设置 REDIS_URL 为仅包含空格的字符串
    const manager = createKeyManager();
    expect(manager).toBeInstanceOf(KeyManager);
  });
});
