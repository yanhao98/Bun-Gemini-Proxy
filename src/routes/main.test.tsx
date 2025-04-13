import { describe, it, expect } from 'bun:test';
import { mainRoutes } from './main';

describe('主路由', () => {
  describe('GET /favicon.ico', () => {
    it('应返回 204 状态码', async () => {
      const response = await mainRoutes.handle(
        new Request('http://localhost/favicon.ico'),
      );

      expect(response.status).toBe(204);
    });

    it('应返回 content-type 为 image/x-icon 的头信息', async () => {
      const response = await mainRoutes.handle(
        new Request('http://localhost/favicon.ico'),
      );

      expect(response.headers.get('Content-Type')).toBe('image/x-icon');
    });

    it('应返回空的响应体', async () => {
      const response = await mainRoutes.handle(
        new Request('http://localhost/favicon.ico'),
      );

      const body = await response.text();
      expect(body).toBe('');
    });
  });

  describe('GET /', () => {
    it('应返回包含 HTML', async () => {
      const response = await mainRoutes.handle(
        new Request('http://localhost/'),
      );

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain('<html lang="zh-CN">');
    });
  });
});
