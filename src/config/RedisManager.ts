import { consola } from 'consola';
import { createClient } from 'redis';
import { maskAPIKey } from '../utils';

/**
 * Redis客户端管理器
 * 负责Redis连接和操作的封装
 */
export class RedisManager {
  private redisClient: ReturnType<typeof createClient>;
  public ready: Promise<true>;

  constructor(private redisUrl: string = Bun.env.REDIS_URL || '') {
    if (!this.redisUrl) {
      consola.warn('REDIS_URL 未配置，请检查环境变量');
    }

    this.redisClient = createClient({ url: this.redisUrl });
    this.redisClient.on('error', (error) => {
      consola.error(
        `Redis连接中断(${this.redisUrl}): ${(error as Error).message}`,
      );
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
  public async loadKeyCounts(
    redisKey: string,
    keys: string[],
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    if (keys.length === 0) return result;

    const exists = await this.redisClient.exists(redisKey);
    if (exists === 0) {
      consola.warn(`Redis中未找到历史密钥使用计数: ${redisKey}`);
      return result;
    }

    const counts = await this.redisClient.hmGet(redisKey, keys);

    keys.forEach((key, index) => {
      const count = counts[index];
      if (count !== null) result.set(key, parseInt(count));
    });

    return result;
  }

  /**
   * 更新Redis中的密钥使用计数
   */
  public async updateKeyCount(
    redisKey: string,
    key: string,
    count: number,
  ): Promise<void> {
    try {
      await this.redisClient.hSet(redisKey, key, count.toString());
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
