import { consola } from 'consola';
import { maskAPIKey } from '../utils';
import { createClient } from 'redis';

/**
 * Gemini API密钥管理器
 * 负责管理API密钥并提供加权随机选择功能
 */
export class KeyManager {
  protected apiKeys: string[] = [];
  protected keyUsageCount: Map<string, number> = new Map();

  constructor() {
    this.loadApiKeys();
  }

  /**
   * 从环境变量加载API密钥，并去除重复的密钥
   */
  private loadApiKeys(): void {
    const keysFromEnv = Bun.env.GEMINI_API_KEYS;

    if (!keysFromEnv) {
      consola.warn('GEMINI_API_KEYS 环境变量未配置，请检查.env文件或部署配置');
      return;
    }
    // 将逗号分隔的密钥字符串转换为数组并去重
    const keyArray = keysFromEnv.split(',').map((key) => key.trim());
    this.apiKeys = [...new Set(keyArray)].filter((key) => key.length > 0);

    if (this.apiKeys.length === 0) {
      consola.warn('API密钥列表为空，请检查GEMINI_API_KEYS环境变量配置');
    } else {
      consola.success(`已从环境变量加载 ${this.apiKeys.length} 个API密钥`);
    }
    // 初始化使用计数器
    this.apiKeys.forEach((key) => this.keyUsageCount.set(key, 0));
  }

  /**
   * 获取下一个可用的API密钥（加权随机选择方式）
   * 使用次数较少的密钥有更高的概率被选中
   */
  public getNextApiKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error('没有可用的 API 密钥');
    }

    // 查找当前使用次数最少的值
    const minUsage = Math.min(...Array.from(this.keyUsageCount.values()));

    // 找出使用次数等于最小使用次数的所有密钥
    const leastUsedKeys = this.apiKeys.filter(
      (key) => this.keyUsageCount.get(key) === minUsage,
    );

    // 从使用次数最少的密钥中随机选择一个
    const selectedKey =
      leastUsedKeys[Math.floor(Math.random() * leastUsedKeys.length)];

    // 更新使用计数
    this.keyUsageCount.set(
      selectedKey,
      (this.keyUsageCount.get(selectedKey) || 0) + 1,
    );

    return selectedKey;
  }
  /**
   * 获取可用的API密钥数量
   */
  public getKeyCount(): number {
    return this.apiKeys.length;
  }

  /**
   * 获取所有密钥的使用计数，按使用次数排序
   */
  public getKeyUsageStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    // 将 Map 转换为数组，按使用次数排序
    const sortedEntries = Array.from(this.keyUsageCount.entries()).sort(
      (a, b) => b[1] - a[1],
    ); // 从高到低排序

    // 将排序后的结果转换为对象
    sortedEntries.forEach(([key, count]) => {
      stats[key] = count;
    });

    return stats;
  }

  /**
   * 更新特定密钥的使用计数
   * @param key API密钥
   * @param count 使用次数
   */
  protected updateKeyUsage(key: string, count: number): void {
    this.keyUsageCount.set(key, count);
  }

  /**
   * 获取所有API密钥
   */
  protected getApiKeys(): string[] {
    return [...this.apiKeys];
  }

  /**
   * 获取指定密钥的使用次数
   */
  protected getKeyUsageCount(key: string): number {
    return this.keyUsageCount.get(key) || 0;
  }
}

/**
 * Redis客户端管理器
 * 负责Redis连接和操作的封装
 */
export class RedisManager {
  private redisClient: ReturnType<typeof createClient>;
  public ready: Promise<void>;

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
  private async connect(): Promise<void> {
    await this.redisClient.connect();
    consola.success('Redis连接成功');
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

/**
 * 带有Redis支持的Gemini API密钥管理器
 */
export class KeyManagerWithRedis extends KeyManager {
  private redisManager: RedisManager;
  private readonly REDIS_KEY: string = 'gemini:keyUsageCount';
  public ready: Promise<void>;

  constructor(redisUrl?: string) {
    super();
    this.redisManager = new RedisManager(redisUrl);
    this.ready = this.initializeKeyUsageCount().catch((error) =>
      consola.error(`初始化Redis密钥使用计数失败: ${(error as Error).message}`),
    );
  }

  /**
   * 从Redis初始化密钥使用计数
   */
  private async initializeKeyUsageCount(): Promise<void> {
    // 等待Redis连接就绪
    await this.redisManager.ready;

    // 获取所有API密钥
    const keys = this.getApiKeys();

    // 从Redis加载密钥使用计数
    const counts = await this.redisManager.loadKeyCounts(this.REDIS_KEY, keys);

    // 更新内存中的使用计数
    counts.forEach((count, key) => {
      this.updateKeyUsage(key, count);
    });

    const totalUsage = Array.from(this.keyUsageCount.values()).reduce((sum, count) => sum + count, 0);
    consola.success(`Redis密钥使用计数初始化完成，总使用次数: ${totalUsage}`);
  }

  /**
   * 获取下一个可用的API密钥，并将使用计数保存到Redis
   */
  public getNextApiKey(): string {
    const selectedKey = super.getNextApiKey();

    // 获取当前使用次数
    const currentCount = this.getKeyUsageCount(selectedKey);

    // 更新Redis中的使用计数（非阻塞方式）
    this.redisManager.updateKeyCount(this.REDIS_KEY, selectedKey, currentCount);
    return selectedKey;
  }
}

/**
 * 创建密钥管理器的工厂函数
 */
export function createKeyManager(): KeyManager {
  const redisUrl = Bun.env.REDIS_URL;

  if (redisUrl && redisUrl.trim()) {
    consola.info('检测到REDIS_URL配置，使用Redis支持的密钥管理器');
    return new KeyManagerWithRedis(redisUrl);
  } else {
    consola.info('未检测到REDIS_URL配置，使用基础密钥管理器');
    return new KeyManager();
  }
}

export const keyManager = createKeyManager();
