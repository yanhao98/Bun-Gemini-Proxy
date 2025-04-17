import { consola } from 'consola';

/**
 * Gemini API密钥管理器
 * 负责管理API密钥并提供加权随机选择功能
 */
export class KeyManager {
  private apiKeys: string[] = [];
  private keyUsageCount: Map<string, number> = new Map();

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
      consola.warn('没有找到 GEMINI_API_KEYS 环境变量，请检查 .env 文件');
      return;
    }

    // 将逗号分隔的密钥字符串转换为数组并去重
    const keyArray = keysFromEnv.split(',').map((key) => key.trim());
    this.apiKeys = [...new Set(keyArray)].filter((key) => key.length > 0);
    // console.debug(`从环境变量加载的API密钥: `, JSON.stringify(this.apiKeys));

    if (this.apiKeys.length === 0) {
      consola.warn('API密钥列表为空');
    } else {
      consola.success(`成功加载了 ${this.apiKeys.length} 个 API 密钥`);
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
   * 获取所有密钥的使用计数
   */
  public getKeyUsageStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.keyUsageCount.forEach((count, key) => {
      stats[key] = count;
    });
    return stats;
  }
}

// 导出单例实例
export const keyManager = new KeyManager();
