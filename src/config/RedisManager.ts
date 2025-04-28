import { consola } from 'consola';
import { createClient, type RedisClientType } from 'redis';
import { maskAPIKey } from '../utils';

// const redisKeyPrefix = ...
const REDIS_KEY = 'gemini:keyUsageCount';
/**
 * Redis客户端管理器
 * 负责Redis连接和操作的封装
 * 全局单例模式实现
 */
export class RedisManager {
  private static instance: RedisManager | null = null;
  private client: RedisClientType;
  public ready: Promise<true>;

  /**
   * 获取RedisManager单例实例
   */
  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  /**
   * 私有构造函数，防止外部直接创建实例
   */
  private constructor() {
    const REDIS_URL = Bun.env.REDIS_URL;
    if (!REDIS_URL) {
      throw new Error('REDIS_URL 未配置');
    }

    this.client = createClient({ url: REDIS_URL });
    this.client.on('error', (error) => {
      consola.error(`Redis连接中断(${REDIS_URL}): ${(error as Error).message}`);
    });

    this.ready = this.connect();
  }

  /**
   * 连接到Redis服务器
   */
  private async connect(): Promise<true> {
    await this.client.connect();
    consola.success('Redis连接成功');
    return true;
  }

  /**
   * 从Redis加载密钥使用计数
   */
  public async loadKeyCounts(keys: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    if (keys.length === 0) return result;

    const exists = await this.client.exists(REDIS_KEY);
    if (exists === 0) {
      consola.warn(`Redis中未找到历史密钥使用计数: ${REDIS_KEY}`);
      return result;
    }

    const counts = await this.client.hmGet(REDIS_KEY, keys);
    // docker exec -it my-redis redis-cli -n 1 HMGET gemini:keyUsageCount key1 key2

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
      await this.client.hSet(REDIS_KEY, key, count.toString());
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
    await this.client.quit();
    consola.info('Redis连接已关闭');
    RedisManager.instance = null; // 关闭连接后重置实例
  }
}
