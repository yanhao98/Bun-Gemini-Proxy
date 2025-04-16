import { consola } from 'consola';

/**
 * Gemini API密钥管理器
 * 负责管理API密钥并提供轮询功能
 */
export class KeyManager {
  private apiKeys: string[] = [];
  private currentIndex: number = 0;

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
  }

  /**
   * 获取下一个可用的API密钥（轮询方式）
   */
  public getNextApiKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error('没有可用的 API 密钥');
    }

    // 获取当前密钥
    const apiKey = this.apiKeys[this.currentIndex];

    // 更新索引，实现轮询
    this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;

    return apiKey;
  }

  /**
   * 获取可用的API密钥数量
   */
  public getKeyCount(): number {
    return this.apiKeys.length;
  }
}

// 导出单例实例
export const keyManager = new KeyManager();
