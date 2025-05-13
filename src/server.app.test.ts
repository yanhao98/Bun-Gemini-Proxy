import { describe, expect, it } from 'bun:test';
import { app } from './server.app';

describe('server.ts', () => {
  it('首页不用认证', async () => {
    const response = await app.handle(new Request('http://localhost/'));
    expect(response.status).toBe(200);
  });

  it('/v1beta/models/:modelAndMethod 需要认证', async () => {
    const response = await app.handle(
      new Request(
        'http://localhost/v1beta/models/gemini-1.5-flash:streamGenerateContent',
        {
          method: 'POST',
        },
      ),
    );
    expect(response.status).toBe(401);
  });
});
