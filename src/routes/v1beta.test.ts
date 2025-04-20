import OpenAI from 'openai';
import { treaty } from '@elysiajs/eden';
import { describe, expect, it as ittt, spyOn } from 'bun:test';
import Elysia from 'elysia';
import { v1betaRoutes } from './v1beta';

let q = '';
q = '‘莎士比亚’是几个字？';
// q = 'Write a poem about the moon in the style of Shakespeare.';

describe('v1beta 仅本地调试', async () => {
  let it = ittt;
  if ('vscode' !== process.env.TERM_PROGRAM) {
    console.info('非 vscode 环境，跳过测试');
    it = ittt.skip as typeof it;
  }

  // TODO: 非流式。

  it('转发streamGenerateContent', async () => {
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

  it('models', async () => {
    const { data, error, response } = await treaty(
      v1betaRoutes,
    ).v1beta.models.get({
      query: {
        key: Bun.env.AUTH_KEY,
      },
    });

    console.debug(`response.status :>> `, response.status);
    console.debug(`response.statusText :>> `, response.statusText);
    console.debug(`error?.value :>> `, error?.value);
    if (data) {
      console.debug(`Object.keys(data) :>> `, Object.keys(data));
      console.debug(`typeof data :>> `, typeof data);
      expect(data).toBeDefined();
      expect(data).toBeInstanceOf(Object);
      expect(data).toHaveProperty('models');
      const modelsLength = Object.keys((data as any).models).length;
      console.debug(`modelsLength :>> `, modelsLength);
    }
  });

  // https://ai.google.dev/gemini-api/docs/openai?hl=zh-cn#javascript_1
  it('openai 兼容', async () => {
    const openai = new OpenAI({
      // apiKey: Bun.env.GEMINI_API_KEY,
      // baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: Bun.env.AUTH_KEY,
      baseURL: 'http://localhost:7860/v1beta/openai/',
    });

    // 列出模型
    // const list = await openai.models.list();
    // console.debug(`list.data.length :>> `, list.data.length);

    // // 检索模型
    // const model = await openai.models.retrieve('gemini-2.0-flash');
    // console.debug(model.id);

    // 流式
    const completion = await openai.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!!' },
      ],
      stream: true,
    });

    for await (const chunk of completion) {
      console.log(chunk.choices[0].delta.content);
    }
  });
});
