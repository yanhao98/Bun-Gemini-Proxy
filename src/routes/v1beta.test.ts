import OpenAI from 'openai';
import { treaty } from '@elysiajs/eden';
import { beforeAll, describe, expect, it as ittt, spyOn } from 'bun:test';
import Elysia from 'elysia';
import { v1betaRoutes } from './v1beta';
import { GoogleGenAI } from '@google/genai';

let q = '';
q = '‘莎士比亚’是几个字？';
// q = 'Write a poem about the moon in the style of Shakespeare.';

describe('v1beta 仅本地调试', async () => {
  let it = ittt;
  if ('vscode' !== process.env.TERM_PROGRAM) {
    console.info('非 vscode 环境，跳过测试');
    it = ittt.skip as typeof it;
  }

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
          headers: { 'x-goog-api-key': Bun.env.AUTH_KEY },
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
});

describe('openai 兼容', () => {
  // beforeAll(() => {
  //   Bun.env.AUTH_KEY = 'test-auth-key-1234567890';
  // });

  let it = ittt;
  if ('vscode' !== process.env.TERM_PROGRAM) {
    console.info('非 vscode 环境，跳过测试');
    it = ittt.skip as typeof it;
  }

  function createOpenAI() {
    return new OpenAI({
      // apiKey: Bun.env.GEMINI_API_KEY,
      // baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: Bun.env.AUTH_KEY,
      baseURL: 'http://localhost:7860/v1beta/openai/',
    });
  }

  // https://ai.google.dev/gemini-api/docs/openai?hl=zh-cn#javascript_1
  it('列出模型', async () => {
    const openai = createOpenAI();
    const list = await openai.models.list();
    console.debug(`list.data.length :>> `, list.data.length);
    expect(list.data.length).toBeGreaterThan(0);
  });
  it('检索模型', async () => {
    const openai = createOpenAI();
    const model = await openai.models.retrieve('gemini-2.0-flash');
    expect(model.id).toBe('models/gemini-2.0-flash');
  });

  it('是流式', async () => {
    const openai = createOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!!' },
      ],
      stream: true,
    });

    let count = 0;
    let text = '';
    for await (const chunk of completion) {
      text += chunk.choices[0].delta.content;
      count++;
    }
    expect(count).toBeGreaterThan(0);
    expect(text).toContain('H');
    console.debug(`text :>> `, text);
  });

  it('非流式', async () => {
    const openai = createOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!!' },
      ],
      stream: false,
    });
    expect(completion.choices[0].message.content).toContain('H'); // Hello/Hi
  });
});

describe('GoogleGenAI', () => {
  let it = ittt;
  if ('vscode' !== process.env.TERM_PROGRAM) {
    console.info('非 vscode 环境，跳过测试');
    it = ittt.skip as typeof it;
  }

  const ai = new GoogleGenAI({
    apiKey: Bun.env.AUTH_KEY,
    httpOptions: { baseUrl: 'http://localhost:7860' },
  });

  it('非流式', async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: 'Hello, world!',
    });
    expect(response.text).toContain('H'); // Hello/Hi
  });

  it('是流式', async () => {
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash-001',
      contents: 'Hello, world!',
    });
    let count = 0;
    let text = '';
    for await (const chunk of response) {
      text += chunk.text;
      count++;
    }
    expect(count).toBeGreaterThan(0);
    expect(text).toContain('H'); // Hello/Hi
    console.debug(`text :>> `, text);
  });
});
