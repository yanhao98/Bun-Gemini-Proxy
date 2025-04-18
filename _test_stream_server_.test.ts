import { describe, it } from 'bun:test';
import { Elysia } from 'elysia';

let t0: DOMHighResTimeStamp;

const log = (type: '客户端' | '服务端', ...args: any[]) => {
  const icon = type === '客户端' ? '🟩' : '🟦';
  console.debug(
    icon,
    type + ':',
    (performance.now() - t0).toFixed(2).padEnd(6, '0'),
    ':>>',
    ...args,
  );
};

const app = new Elysia()
  .get('/sse', async function* (_ctx) {
    _ctx.request.signal.addEventListener('abort', () => {
      log('服务端', 'aborted');
    });
    await Bun.sleep(100);
    yield 'a';

    await Bun.sleep(100);
    yield 'aa';

    await Bun.sleep(100);
    yield 'aaa';

    await Bun.sleep(100);
    yield 'aaaa';

    await Bun.sleep(100);
    yield 'aaaaa';
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);

describe('Elysia', () => {
  it('stream_app', async () => {
    const controller = new AbortController();
    t0 = performance.now();
    const request = new Request('http://localhost:3000/sse', {
      signal: controller.signal,
    });

    setTimeout(() => {
      controller.abort();
      log('客户端', '取消请求');
    }, 200);
    try {
      const response = await fetch(request);
      log('客户端', '请求完成[首次]');
      console.debug(
        `response.headers.get('content-type') :>> `,
        response.headers.get('content-type'),
      );

      const reader = response.body!.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        log('客户端', `value :>> `, value);
        log('客户端', `value.length :>> `, value.length);
      }
    } catch (error) {
      log('客户端', '请求失败', (error as Error).message);
    } finally {
      log('客户端', 'finally');
    }

    await Bun.sleep(100);
  });
});
