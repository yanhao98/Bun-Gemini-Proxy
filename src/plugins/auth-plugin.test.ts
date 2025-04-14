import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { GEMINI_API_HEADER_NAME } from '../utils/const';
import { auth } from './auth-plugin';

describe('auth-plugin', () => {
  // 存储原始环境变量
  const originalAuthKey = Bun.env.AUTH_KEY;

  beforeAll(() => {
    // 设置测试用的 AUTH_KEY
    Bun.env.AUTH_KEY = 'test-auth-key';
  });

  afterAll(() => {
    // 恢复原始环境变量
    Bun.env.AUTH_KEY = originalAuthKey;
  });

  it('没有提供API密钥时应返回401错误', async () => {
    // 创建一个带有 auth 插件的应用
    const app = new Elysia().use(auth).get('/', () => 'ok');

    // 发送一个不包含 API 密钥的请求
    const response = await app.handle(new Request('http://localhost/'));

    // 验证响应
    expect(response.status).toBe(401);
    const responseBody = await response.json();
    expect(responseBody.error).toBeDefined();
    expect(responseBody.error.code).toBe(401);
    expect(responseBody.error.message).toContain('未提供有效的API密钥');
  });

  it('提供无效API密钥时应返回403错误', async () => {
    // 创建一个带有 auth 插件的应用
    const app = new Elysia().use(auth).get('/', () => 'ok');

    // 发送一个包含无效 API 密钥的请求
    const headers = new Headers();
    headers.set(GEMINI_API_HEADER_NAME, 'invalid-key');

    const response = await app.handle(
      new Request('http://localhost/', { headers }),
    );

    // 验证响应
    expect(response.status).toBe(403);
    const responseBody = await response.json();
    expect(responseBody.error).toBeDefined();
    expect(responseBody.error.code).toBe(403);
    expect(responseBody.error.message).toContain('提供的API密钥无效');
  });

  it('提供有效API密钥时应通过认证 - headers', async () => {
    // 创建一个带有 auth 插件和模拟端点的应用
    const app = new Elysia().use(auth).get('/', () => '');

    // 发送一个包含有效 API 密钥的请求
    const response = await app.handle(
      new Request('http://localhost/', {
        headers: {
          [GEMINI_API_HEADER_NAME]: 'test-auth-key',
        },
      }),
    );

    // 验证响应
    expect(response.status).toBe(200);
  });

  it('提供有效API密钥时应通过认证 - query', async () => {
    // 创建一个带有 auth 插件和模拟端点的应用
    const app = new Elysia().use(auth).get('/', () => '');

    // 发送一个包含有效 API 密钥的请求
    const response = await app.handle(
      new Request('http://localhost/?key=test-auth-key'),
    );

    // 验证响应
    expect(response.status).toBe(200);
  });
});
