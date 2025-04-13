import { beforeEach, describe as describee, it } from 'bun:test';

import { treaty } from '@elysiajs/eden';
import { Elysia } from 'elysia';
import { randomUUID } from 'crypto';

import { GEMINI_API_HEADER_NAME } from './src/utils/const';

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

  const stream_app = new Elysia().get('/', async function* () {
    yield 'a';
    yield 'aa';
    await Bun.sleep(10);

    yield '正';
    yield '正正';
  });

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

  it('生命周期', async () => {
    treaty(
      new Elysia()
        // .use((await import('./src/plugins/trace')).trace)
        // .use((await import('./src/plugins/auth-plugin')).auth)
        .group('/elysia-demo', (app) =>
          app
            // .onError(function error(_ctx) {
            //   console.debug('😄# onError'.padEnd(40, '--'));
            //   console.debug(`_ctx.set.status :>> `, _ctx.set.status);
            //   _ctx.set.status = 502;
            //   console.debug(`_ctx.set.status :>> `, _ctx.set.status);
            //   // return {
            //   //   error: true,
            //   //   message: 'errorrrrr',
            //   // };
            // })
            // .onRequest(function request(_ctx) {
            //   // console.debug(`ctx :>> `, _ctx);
            //   console.debug('😄#1 request'.padEnd(40, '--'));
            // })
            // .onParse(function parse(_ctx) {
            //   // console.debug(`_ctx :>> `, _ctx);
            //   console.debug('😄#2 parse'.padEnd(40, '--'));
            // })
            // .on('transform', function transform() {
            //   console.debug('😄#2 transform'.padEnd(40, '--'));
            // })
            // .on('beforeHandle', function beforeHandle() {
            //   console.debug('😄#3 beforeHandle'.padEnd(40, '--'));
            // })
            // .on('afterHandle', function afterHandle() {
            //   console.debug('😄#4 afterHandle'.padEnd(40, '--'));
            // })
            // .on('mapResponse', function mapResponse(ctx) {
            //   console.debug('😄#5 mapResponse'.padEnd(40, '--'));
            //   // console.debug(`ctx.response :>> `, ctx.response);
            //   // return { x: 's' };
            // })
            // .on('afterResponse', function afterResponse() {
            //   console.debug('😄#6 afterResponse'.padEnd(40, '--'));
            // })
            // .parser('ssss', (data) => {
            //   console.debug('parser'.padEnd(40, '--'));
            //   return data;
            // })
            // .mapResponse(function mapResponseee(ctx) {
            //   console.debug('##');
            //   // return new Response({
            //   //   a: 'b',
            //   // });
            // })
            .post(
              '/hello',
              async function* fnnn(_ctx) {
                console.debug('fnnn');
                // return _ctx.error(501, 'returnnn ctx.error');
                try {
                  if ('#' === String('#')) {
                    throw new Error('throwww');
                  } else {
                    yield '1';
                  }
                } catch {
                  return {
                    error: true,
                    message: 'error from catch',
                  };
                }
                return { message: 'Hello, World!' };
              },
              // {
              //   query: t.Object({
              //     alt: t.Optional(
              //       t.Literal('sse', {
              //         error: {
              //           message: 'alt 必须是 sse',
              //         },
              //       }),
              //     ),
              //   }),
              // },
            )
            .get('/hello', () => 'Hello, World!'),
        ),
    )
      ['elysia-demo'].hello.post(
        {},
        {
          query: {
            /* alt: 'sse' */
          },
          headers: {
            [GEMINI_API_HEADER_NAME]: Bun.env.AUTH_KEY,
          },
        },
      )
      .then((r) => {
        console.debug(`r.data :>> `, r.data);
        console.debug(`r.error :>> `, !!r.error);
        console.debug(`r.error?.value :>> `, r.error?.value);
        console.debug(`r.response.status :>> `, r.response.status);
        console.debug(`r.response :>> `, r.response);
      });
  });

  it('.derive()', async () => {
    const app = new Elysia()
      .use(
        (await import('elysia-requestid'))
          .requestID({
            uuid: () => {
              const reqID = randomUUID() + '#1';
              console.debug(`reqID :>> `, reqID);
              return reqID;
            },
          })
          .as('scoped'),
      )
      .get('/', (_ctx) => {
        // console.debug(`_ctx :>> `, _ctx);
        console.debug(`_ctx.requestID :>> `, _ctx.requestID);
        return {
          '_ctx.requestID': _ctx.requestID,
        };
      });

    {
      const r = await treaty(app).index.get();
      console.debug(`r.data :>> `, r.data);
    }

    console.debug(''.padEnd(40, '-'));
    {
      const app2 = new Elysia()
        .use(
          (await import('elysia-requestid'))
            .requestID({
              uuid: () => {
                const reqID = randomUUID() + '#2';
                console.debug(`reqID :>> `, reqID);
                return reqID;
              },
              // header: 'id-2',
            })
            .as('global'),
        )
        .use(app)

        .get('/222', (_ctx) => {
          console.debug(`2#######_ctx.requestID :>> `, _ctx.requestID);
          return {
            '_ctx.requestID': _ctx.requestID,
          };
        });

      const r1111 = await treaty(app2)[222].get();
      console.debug(`r2222.data :>> `, r1111.data);
      console.debug(`r2222.response.headers :>> `, r1111.response.headers);

      console.debug(''.padEnd(40, '-'));

      const r2222 = await treaty(app2).index.get();
      console.debug(`r2222.data :>> `, r2222.data);
      console.debug(`r2222.response.headers :>> `, r2222.response.headers);
    }
  });
});
