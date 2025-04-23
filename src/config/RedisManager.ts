import { consola } from 'consola';
import { createClient, type RedisClientType } from 'redis';
import { maskAPIKey } from '../utils';

// const redisKeyPrefix = ...
const REDIS_KEY = 'gemini:keyUsageCount';
/**
 * Redis客户端管理器
 * 负责Redis连接和操作的封装
 */
export class RedisManager {
  private redisClient: RedisClientType;
  public ready: Promise<true>;

  constructor() {
    const REDIS_URL = Bun.env.REDIS_URL;
    if (!REDIS_URL) {
      throw new Error('REDIS_URL 未配置');
    }

    this.redisClient = createClient({ url: REDIS_URL });
    this.redisClient.on('error', (error) => {
      consola.error(`Redis连接中断(${REDIS_URL}): ${(error as Error).message}`);
    });

    this.ready = this.connect();
  }

  /**
   * 连接到Redis服务器
   */
  private async connect(): Promise<true> {
    await this.redisClient.connect();
    consola.success('Redis连接成功');
    return true;
  }

  /**
   * 从Redis加载密钥使用计数
   */
  public async loadKeyCounts(keys: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    if (keys.length === 0) return result;

    const exists = await this.redisClient.exists(REDIS_KEY);
    if (exists === 0) {
      consola.warn(`Redis中未找到历史密钥使用计数: ${REDIS_KEY}`);
      return result;
    }

    const counts = await this.redisClient.hmGet(REDIS_KEY, keys);

    keys.forEach((key, index) => {
      const count = counts[index];
      if (count !== null) result.set(key, parseInt(count));
    });

    return result;
  }

  /**
   * 更新Redis中的密钥使用计数
   */
  public async updateKeyCount(key: string, count: number): Promise<void> {
    try {
      await this.redisClient.hSet(REDIS_KEY, key, count.toString());
      consola.info(`Redis密钥使用计数更新成功: ${maskAPIKey(key)} = ${count}`);
    } catch (error) {
      consola.error(
        `更新Redis密钥使用计数失败: ${maskAPIKey(key)} = ${count} - ${
          (error as Error).message
        }`,
      );
    }
  }

  /**
   * 关闭Redis连接
   */
  public async close(): Promise<void> {
    await this.redisClient.quit();
    consola.info('Redis连接已关闭');
  }
}
