import { consola } from 'consola';
import { KeyManager } from './KeyManager';
import { KeyManagerWithRedis } from './KeyManager.WithRedis';

/**
 * 创建密钥管理器的工厂函数
 */
export function createKeyManager(): KeyManager {
  const redisUrl = Bun.env.REDIS_URL;

  if (redisUrl && redisUrl.trim()) {
    consola.info('检测到REDIS_URL配置，使用Redis支持的密钥管理器');
    return new KeyManagerWithRedis();
  } else {
    consola.info('未检测到REDIS_URL配置，使用基础密钥管理器');
    return new KeyManager();
  }
}

export const keyManager = createKeyManager();
