import { GoogleGenAI } from '@google/genai';
import { afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { consola, LogLevels } from 'consola';
import OpenAI from 'openai';
import { mockServerConfig_port_6666 } from '../../mocks/gemini_v1beta.MockServerConfig_6666';
import { keyManager } from '../managers/keys';
import { gemini_v1betaRoutes } from './gemini_v1beta';
consola.level = LogLevels.verbose;

Bun.serve(mockServerConfig_port_6666);

beforeAll(async () => {
  Bun.env.GEMINI_BASE_URL = 'http://localhost:6666';
  Bun.env.AUTH_KEY = 'test-auth-key';
  Bun.env.GEMINI_API_KEYS = 'test-api-key-1,test-api-key-2,';
  keyManager.loadApiKeys();
  gemini_v1betaRoutes.listen({ port: 7777 });
});

afterEach(async () => {
  await Bun.sleep(1);
});

describe('OpenAI 兼容', () => {
  function createOpenAI() {
    return new OpenAI({
      // apiKey: Bun.env.TEST_GEMINI_API_KEY,
      // baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: Bun.env.AUTH_KEY,
      baseURL: 'http://localhost:7777/v1beta/openai/',
      maxRetries: 0,
    });
  }

  // https://ai.google.dev/gemini-api/docs/openai?hl=zh-cn#javascript_1
  it('OpenAI列出模型', async () => {
    const openai = createOpenAI();
    const list = await openai.models.list();
    console.debug(`list.data.length :>> `, list.data.length);
    expect(list.data.length).toBeGreaterThan(0);
  });
  it('OpenAI检索模型', async () => {
    const openai = createOpenAI();
    const model = await openai.models.retrieve('gemini-2.0-flash');
    expect(model.id).toBe('models/gemini-2.0-flash');
  });

  it('OpenAI是流式', async () => {
    const openai = createOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!!' },
      ],
      stream: true,
    });

    let chunk_counter = 0;
    let text = '';
    for await (const chunk of completion) {
      text += chunk.choices[0].delta.content;
      chunk_counter++;
    }
    expect(chunk_counter).toBeGreaterThan(0);
    expect(text).toContain('MOCK_DONE');
    console.debug(`text :>> `, text);
  });

  it('OpenAI非流式', async () => {
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
  const ai = new GoogleGenAI({
    // apiKey: Bun.env.TEST_GEMINI_API_KEY,
    // httpOptions: { baseUrl: 'https://generativelanguage.googleapis.com' },
    apiKey: Bun.env.AUTH_KEY,
    httpOptions: { baseUrl: 'http://localhost:7777' },
  });

  it('GoogleGenAI列出模型', async () => {
    const models = await ai.models.list();
    for (const model of models.page) {
      // console.debug(`model :>> `, model.name);
      expect(JSON.stringify(model)).not.toContain('deprecated');
      expect(JSON.stringify(model)).not.toContain('1.5');
    }
    expect(models.pageSize).toBeGreaterThan(0);
  });

  it('GoogleGenAI非流式', async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro-preview-03-25', //  => gemini-2.5-pro-exp-03-25
      contents: '',
    });
    console.debug(`response.text :>> `, response.text);
    expect(response.text).toContain('MOCK_DONE');
  });

  it('GoogleGenAI是流式', async () => {
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash-001',
      contents: '',
    });
    let count = 0;
    let text = '';
    for await (const chunk of response) {
      text += chunk.text;
      count++;
    }
    expect(count).toBeGreaterThan(0);
    expect(text).toContain('MOCK_DONE');
    console.debug(`text :>> `, text);
  });
});
