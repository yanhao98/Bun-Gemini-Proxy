import { consola } from 'consola';
import { KeyManager } from './KeyManager';
import { RedisManager } from './RedisManager';

/**
 * 带有Redis支持的Gemini API密钥管理器
 * 在标准密钥管理器的基础上添加Redis持久化功能
 */
export class KeyManagerWithRedis extends KeyManager {
  // Redis管理器实例
  public redisManager: RedisManager;
  // Redis初始化完成的Promise
  public ready: Promise<void>;

  constructor() {
    super();
    // 获取Redis管理器实例
    this.redisManager = RedisManager.getInstance();
    // 初始化密钥使用计数
    this.ready = this.initializeKeyUsageCount().catch((error) => {
      consola.error(`初始化Redis密钥使用计数失败: ${(error as Error).message}`);
    });
  }

  /**
   * 从Redis初始化密钥使用计数
   */
  private async initializeKeyUsageCount(): Promise<void> {
    // 等待Redis连接就绪
    await this.redisManager.ready;

    // 获取所有API密钥
    const keys = this.getApiKeys();
    if (keys.length === 0) {
      consola.warn('没有API密钥可供Redis加载使用计数');
      return;
    }

    // 从Redis加载密钥使用计数
    const counts = await this.redisManager.loadKeyCounts(keys);

    // 更新内存中的使用计数
    counts.forEach((count, key) => {
      this.updateKeyUsage(key, count);
    });

    const totalUsage = Array.from(this.keyUsageCount.values()).reduce(
      (sum, count) => sum + count,
      0,
    );
    consola.success(`Redis密钥使用计数初始化完成，总使用次数: ${totalUsage}`);
  }

  /**
   * 获取下一个可用的API密钥，并将使用计数保存到Redis
   * 继承并扩展基类方法
   */
  public getNextApiKey(): string {
    // 调用父类方法获取密钥
    const selectedKey = super.getNextApiKey();

    // 获取当前使用次数
    const currentCount = this.getKeyUsageCount(selectedKey);

    // 更新Redis中的使用计数（非阻塞方式）
    this.redisManager
      .updateKeyCount(selectedKey, currentCount)
      .catch((error) => {
        consola.error(`更新Redis密钥使用计数失败: ${(error as Error).message}`);
      });

    return selectedKey;
  }
}
