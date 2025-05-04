import { GoogleGenAI } from '@google/genai';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { consola, LogLevels } from 'consola';
import OpenAI from 'openai';
import { keyManager } from '../config/keys';
import { gemini_v1betaRoutes } from './gemini_v1beta';
import { mockServerConfig_port_6666 } from '../../mocks/gemini_v1beta.MockServerConfig_6666';
import { treaty } from '@elysiajs/eden';
import { GEMINI_API_HEADER_NAME } from '../utils/const';
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
      // apiKey: Bun.env.GEMINI_API_KEY,
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
    apiKey: Bun.env.AUTH_KEY,
    httpOptions: { baseUrl: 'http://localhost:7777' },
  });

  it('GoogleGenAI非流式', async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
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

describe('Gemini treaty', () => {
  beforeEach(() => {
    Bun.env.AUTH_KEY = 'test-auth-key';
  });

  it('Gemini treaty', async () => {
    const { error, data } = await treaty(gemini_v1betaRoutes).v1beta.models.get(
      {
        headers: {
          [GEMINI_API_HEADER_NAME]: Bun.env.AUTH_KEY,
        },
      },
    );
    expect(error).toBeNull();
    expect(data).toBeDefined();
    const models = (data as any).models as Record<string, any>[];
    expect(models.length).toBeGreaterThan(0);
    expect(JSON.stringify(models)).not.toContain('deprecated');
  });
});
