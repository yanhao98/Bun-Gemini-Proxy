import { consola } from 'consola';

/**
 * Gemini API密钥管理器
 * 负责管理API密钥并提供加权随机选择功能
 */
export class KeyManager {
  protected apiKeys: string[] = [];
  protected keyUsageCount: Map<string, number> = new Map();

  constructor() {}

  /**
   * 从环境变量加载API密钥，并去除重复的密钥
   */
  public loadApiKeys(): void {
    const keysFromEnv = Bun.env.GEMINI_API_KEYS;

    if (!keysFromEnv) {
      consola.warn('GEMINI_API_KEYS 环境变量未配置，请检查.env文件或部署配置');
      return;
    }

    // 将逗号分隔的密钥字符串转换为数组并去重
    const keyArray = keysFromEnv
      .split(',')
      .map((key) => key.trim())
      .filter((key) => key.length > 0);

    this.apiKeys = [...new Set(keyArray)];

    if (this.apiKeys.length === 0) {
      consola.warn('API密钥列表为空，请检查GEMINI_API_KEYS环境变量配置');
    } else {
      consola.success(`已从环境变量加载 ${this.apiKeys.length} 个API密钥`);
    }

    // 初始化使用计数器
    this.resetUsageCounters();
  }

  /**
   * 重置所有密钥的使用计数
   */
  protected resetUsageCounters(): void {
    this.keyUsageCount.clear();
    this.apiKeys.forEach((key) => this.keyUsageCount.set(key, 0));
  }

  /**
   * 获取下一个可用的API密钥（加权随机选择方式）
   * 使用次数较少的密钥有更高的概率被选中
   * @throws {Error} 如果没有可用的API密钥
   */
  public getNextApiKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error(
        '没有可用的 API 密钥，请确保已调用 loadApiKeys() 方法并正确配置 GEMINI_API_KEYS 环境变量',
      );
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
    this.updateKeyUsage(
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
