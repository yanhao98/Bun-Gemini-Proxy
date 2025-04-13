import { beforeEach, describe as describee, it } from 'bun:test';

import { Elysia } from 'elysia';

/* 
curl "http://localhost:3000/elysia-demo/hello" \
        -d ''
*/

// .listen(3000);
// console.debug(`生命周期app.server?.port :>> `, 生命周期app.server?.port);

let describe = describee;
// describe = (() => {}) as any;

describe('_test_sth_', () => {
  beforeEach(() => {
    console.debug(''.padEnd(40, '-'));
  });

  const stream_app = new Elysia().get('/', async function* (_ctx) {
    _ctx.request.signal.onabort = () => {
      console.debug('onabort');
    };

    console.debug('发送#1');
    yield 'a\n';
    await Bun.sleep(1000);

    console.debug('发送#2');
    yield 'aa\n';
    await Bun.sleep(1000);

    console.debug('发送#3');
    yield '正\n';
    await Bun.sleep(1000);

    console.debug('发送#4');
    yield '正正\n';
  }).listen(3000);

  it('stream_app', async () => {
    const response = await stream_app.handle(new Request('http://localhost/'));

    const reader = response.body!.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      console.debug(`value :>> `, value);
      console.debug(`value.length :>> `, value.length);
    }
  });

  it('TextDecoderStream', async () => {
    const response = await stream_app.handle(new Request('http://localhost/'));

    // 使用 TextDecoderStream 解码流式数据
    const stream = response.body!.pipeThrough(new TextDecoderStream('utf-8'));
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      console.debug(`value :>> `, value);
      console.debug(`value.length :>> `, value.length);
    }
  });

  it('测试请求到一半取消了', async () => {
    const request = new Request('http://localhost/');
    const response = await stream_app.handle(request);
    console.debug(`response.status :>> `, response.status);

    const reader = response.body?.getReader();

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      console.debug(`value :>> `, new TextDecoder().decode(value));
      reader?.cancel();
      // response.body!.cancel();
      // request.signal.dispatchEvent(new Event('abort'));
    }
  });
});
