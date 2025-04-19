import { RedisClient } from 'bun';
import { consola } from 'consola';
import { maskAPIKey } from '../utils';

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
    // 从环境变量中获取API密钥
    const keysFromEnv = Bun.env.GEMINI_API_KEYS;

    if (!keysFromEnv) {
      consola.warn('GEMINI_API_KEYS 环境变量未配置，请检查.env文件或部署配置');
      return;
    }

    // 将逗号分隔的密钥字符串转换为数组并去重
    const keyArray = keysFromEnv.split(',').map((key) => key.trim());
    this.apiKeys = [...new Set(keyArray)].filter((key) => key.length > 0);
    // console.debug(`从环境变量加载的API密钥: `, JSON.stringify(this.apiKeys));

    if (this.apiKeys.length === 0) {
      consola.warn('API密钥列表为空，请检查GEMINI_API_KEYS环境变量配置');
    } else {
      consola.success(`已加载 ${this.apiKeys.length} 个API密钥`);
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
}

/**
 * 带有Redis支持的Gemini API密钥管理器
 * 从Redis读取和保存密钥使用计数
 */
export class KeyManagerWithRedis extends KeyManager {
  private REDIS_KEY: string = 'gemini:keyUsageCount';
  private redisClient: RedisClient;
  ready: Promise<void>;

  constructor() {
    super();
    if (!Bun.env.REDIS_URL) {
      consola.warn('REDIS_URL 环境变量未配置');
    }
    this.redisClient = new RedisClient(Bun.env.REDIS_URL);
    this.ready = this.initializeKeyUsageCount();
  }

  /**
   * 从Redis获取使用计数
   */
  private async initializeKeyUsageCount(): Promise<void> {
    await this.redisClient.connect();
    this.redisClient.onclose = (error) => {
      consola.error(`Redis连接中断(${Bun.env.REDIS_URL}): ${error.message}`);
    };
    await Bun.sleep(1); // >>> https://github.com/oven-sh/bun/issues/19126

    const exists = await this.redisClient.exists(this.REDIS_KEY);

    if (exists === false) {
      consola.warn(`Redis中未找到历史密钥使用计数(${Bun.env.REDIS_URL})`);
      return;
    }

    const keys = this.apiKeys;
    if (keys.length) {
      let i = 0;
      const counts = await this.redisClient.hmget(this.REDIS_KEY, keys);
      keys.forEach((key, index) => {
        const count = counts[index];
        if (count !== null) {
          i++;
          this.keyUsageCount.set(key, parseInt(count));
        }
      });
      consola.success(
        `从Redis加载了${i}个密钥的历史使用计数(${Bun.env.REDIS_URL})`,
      );
    }
  }

  /**
   * 获取下一个可用的API密钥，并将使用计数保存到Redis
   */
  public getNextApiKey(): string {
    const selectedKey = super.getNextApiKey();

    // 更新Redis中的使用计数（非阻塞方式）
    const currentCount = this.keyUsageCount.get(selectedKey) || 0;
    this.redisClient
      .hmset(this.REDIS_KEY, [selectedKey, currentCount.toString()])
      .then(() => {
        consola.success(
          `更新Redis密钥使用计数成功: ${maskAPIKey(selectedKey)}`,
        );
      })
      .catch(function hmsetCatch(error) {
        consola.error(`更新Redis密钥使用计数失败: ${error.message}`);
      });

    return selectedKey;
  }
}

// 导出单例实例
export const keyManager = new KeyManagerWithRedis();
