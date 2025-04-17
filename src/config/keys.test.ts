import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import { consola } from 'consola';
import { KeyManager } from './keys';

describe('KeyManager', () => {
  // 存储原始环境变量
  const originalApiKeys = Bun.env.GEMINI_API_KEYS;

  // 模拟 consola 函数
  beforeEach(() => {
    // 模拟 consola 的方法
    mock.module('consola', () => ({
      consola: {
        warn: mock(),
        success: mock(),
      },
    }));
  });

  afterEach(() => {
    // 恢复原始环境变量
    Bun.env.GEMINI_API_KEYS = originalApiKeys;
  });

  it('当没有环境变量时应该发出警告', () => {
    // 清除环境变量
    Bun.env.GEMINI_API_KEYS = undefined;

    // 监视 consola.warn
    const warnSpy = spyOn(consola, 'warn');

    // 创建 KeyManager 实例
    const manager = new KeyManager();

    // 验证警告被调用
    expect(warnSpy).toHaveBeenCalledWith(
      '没有找到 GEMINI_API_KEYS 环境变量，请检查 .env 文件',
    );

    // 验证密钥数量为0
    expect(manager.getKeyCount()).toBe(0);

    // 验证获取密钥时抛出错误
    expect(() => manager.getNextApiKey()).toThrow('没有可用的 API 密钥');
  });

  it('当API密钥列表为空时应该发出警告', () => {
    // 设置空的API密钥环境变量
    Bun.env.GEMINI_API_KEYS = '';

    // 监视 consola.warn
    const warnSpy = spyOn(consola, 'warn');

    // 创建 KeyManager 实例
    const manager = new KeyManager();

    // 验证警告被调用 - 修正期望的警告消息
    expect(warnSpy).toHaveBeenCalledWith(
      '没有找到 GEMINI_API_KEYS 环境变量，请检查 .env 文件',
    );

    // 验证密钥数量为0
    expect(manager.getKeyCount()).toBe(0);
  });

  it('应该成功加载API密钥', () => {
    // 设置测试用的API密钥
    Bun.env.GEMINI_API_KEYS = 'key1,key2,key3';

    // 监视 consola.success
    const successSpy = spyOn(consola, 'success');

    // 创建 KeyManager 实例
    const manager = new KeyManager();

    // 验证成功消息被调用
    expect(successSpy).toHaveBeenCalledWith('成功加载了 3 个 API 密钥');

    // 验证密钥数量
    expect(manager.getKeyCount()).toBe(3);
  });

  it('应该去除API密钥中的空格', () => {
    // 设置测试用的API密钥，包含空格
    Bun.env.GEMINI_API_KEYS = ' key1 , key2 , key3 ';

    // 创建 KeyManager 实例
    const manager = new KeyManager();

    // 获取密钥并验证它是去除空格后的有效密钥之一
    const key = manager.getNextApiKey();
    expect(['key1', 'key2', 'key3']).toContain(key);

    // 验证获取的密钥没有空格（通过检查前后是否有多余空格）
    expect(key).toBe(key.trim());
    expect(key).not.toContain(' ');
  });

  it('应该移除重复的API密钥', () => {
    // 设置测试用的API密钥，包含重复项
    Bun.env.GEMINI_API_KEYS = 'key1,key2,key1,key3,key2';

    // 创建 KeyManager 实例
    const manager = new KeyManager();

    // 验证密钥数量（去重后应该只有3个）
    expect(manager.getKeyCount()).toBe(3);

    // 验证选择的密钥是否在有效范围内
    const key = manager.getNextApiKey();
    expect(['key1', 'key2', 'key3']).toContain(key);
  });

  it('应该以加权随机方式选择密钥', () => {
    // 设置测试用的API密钥
    Bun.env.GEMINI_API_KEYS = 'key1,key2,key3';

    // 创建 KeyManager 实例
    const manager = new KeyManager();

    // 获取100次密钥，验证所有密钥都被使用到
    const usedKeys = new Set();
    for (let i = 0; i < 100; i++) {
      usedKeys.add(manager.getNextApiKey());
    }

    // 验证所有密钥都被使用到
    expect(usedKeys.size).toBe(3);
    expect(usedKeys.has('key1')).toBe(true);
    expect(usedKeys.has('key2')).toBe(true);
    expect(usedKeys.has('key3')).toBe(true);
  });

  it('应该优先选择使用次数较少的密钥', () => {
    // 设置测试用的API密钥
    Bun.env.GEMINI_API_KEYS = 'key1,key2,key3';

    // 创建 KeyManager 实例并获取私有属性访问
    const manager = new KeyManager();

    // 统计每个密钥被选中的次数
    const counts = { key1: 0, key2: 0, key3: 0 };

    // 第一轮：各选一次，应该是均匀分布的
    for (let i = 0; i < 3; i++) {
      const key = manager.getNextApiKey();
      counts[key as keyof typeof counts]++;
    }

    // 验证第一轮后每个密钥都被使用了一次
    expect(counts.key1).toBe(1);
    expect(counts.key2).toBe(1);
    expect(counts.key3).toBe(1);

    // 重置计数器，准备第二轮测试
    Object.keys(counts).forEach(
      (key) => (counts[key as keyof typeof counts] = 0),
    );

    // 模拟一个密钥使用较多的情况
    // 需要访问私有属性，这里通过类型断言和索引访问来实现
    // @ts-ignore - 访问私有属性用于测试
    (manager as any).keyUsageCount.set('key1', 5);
    // @ts-ignore - 访问私有属性用于测试
    (manager as any).keyUsageCount.set('key2', 2);
    // @ts-ignore - 访问私有属性用于测试
    (manager as any).keyUsageCount.set('key3', 0);

    // 获取下一个密钥，应该是使用次数最少的key3
    const nextKey = manager.getNextApiKey();
    expect(nextKey).toBe('key3');
  });
});
