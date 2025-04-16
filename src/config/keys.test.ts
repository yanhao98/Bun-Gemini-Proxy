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

    // 验证第一个密钥没有空格
    expect(manager.getNextApiKey()).toBe('key1');
  });

  it('应该移除重复的API密钥', () => {
    // 设置测试用的API密钥，包含重复项
    Bun.env.GEMINI_API_KEYS = 'key1,key2,key1,key3,key2';

    // 创建 KeyManager 实例
    const manager = new KeyManager();

    // 验证密钥数量（去重后应该只有3个）
    expect(manager.getKeyCount()).toBe(3);
    
    // 验证轮询行为是否正确（确保密钥已去重）
    expect(manager.getNextApiKey()).toBe('key1');
    expect(manager.getNextApiKey()).toBe('key2');
    expect(manager.getNextApiKey()).toBe('key3');
    expect(manager.getNextApiKey()).toBe('key1'); // 应该回到第一个密钥
  });

  it('应该以轮询方式获取API密钥', () => {
    // 设置测试用的API密钥
    Bun.env.GEMINI_API_KEYS = 'key1,key2,key3';

    // 创建 KeyManager 实例
    const manager = new KeyManager();

    // 验证轮询行为
    expect(manager.getNextApiKey()).toBe('key1');
    expect(manager.getNextApiKey()).toBe('key2');
    expect(manager.getNextApiKey()).toBe('key3');
    // 应该回到第一个密钥
    expect(manager.getNextApiKey()).toBe('key1');
  });
});
