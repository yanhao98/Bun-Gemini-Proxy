import { treaty } from '@elysiajs/eden';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { describe, it as ittt, setDefaultTimeout, spyOn } from 'bun:test';
import Elysia from 'elysia';
import { v1betaRoutes } from './v1beta';
setDefaultTimeout(10 * 60 * 60 * 1000);

let q = '';
q = '‘莎士比亚’是几个字？';
// q = 'Write a poem about the moon in the style of Shakespeare.';

describe('v1beta 仅本地调试', async () => {
  let it = ittt;
  if ('vscode' !== process.env.TERM_PROGRAM) {
    console.info('非 vscode 环境，跳过测试');
    it = ittt.skip as typeof it;
  }

  it('接口转发', async () => {
    spyOn(console, 'log') /* .mockImplementation(() => {}) */;

    console.log('[👤] 请求开始'.padEnd(80, '--'));
    const { data, error, response } = await treaty(
      new Elysia()
        // .use((await import('../plugins/trace')).trace)
        .use(v1betaRoutes),
    )
      .v1beta.models({
        modelAndMethod: 'gemini-1.5-flash:streamGenerateContent',
      })
      .post(
        { contents: [{ parts: [{ text: q }] }] },
        {
          headers: {
            host: 'localhost:7860',
            connection: 'keep-alive',
            'content-type': 'application/json',
            accept: '*/*',
            'accept-language': '*',
            'sec-fetch-mode': 'cors',
            'user-agent': 'node',
            'accept-encoding': 'gzip, deflate',
            'x-goog-api-client': 'genai-js/0.18.0',
            'x-goog-api-key': Bun.env.AUTH_KEY,
          },
          query: {
            alt: 'sse',
          },
        },
      );

    if (error) {
      console.log(
        `[👤] 请求失败: [${error.status}] ${JSON.stringify(
          error.value,
          null,
          4,
        )}`,
      );
      if (!response.body?.locked)
        for await (const value of response.body!.values()) {
          console.log(`[👤] 上游数据流. 长度: ${value?.length}`);
        }
    } else {
      console.log(`[👤] response.status :>> `, response.status);
      for await (const chunk of data /* response.body!.values() */) {
        console.log(`[👤] 收到数据. 长度: ${chunk?.length}`);
        // console.log(chunk);
      }
    }

    console.log('[👤] 请求结束.');
  });

  it('@google/generative-ai', async () => {
    const t1 = performance.now();
    const genAI = new GoogleGenerativeAI(Bun.env.AUTH_KEY);
    const model = genAI.getGenerativeModel(
      { model: 'gemini-1.5-flash' },
      {
        baseUrl: 'https://oo1dev-bun-gemini-proxy.hf.space',
      },
    );
    try {
      const result = await model.generateContentStream(q);
      const finalResponse = await result.response;
      const text = finalResponse.text();
      console.log(`text :>> `, text);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error(`Unknown error: ${error}`);
      }
    }
    console.debug(`耗时: ${performance.now() - t1}ms`);
  });
});
