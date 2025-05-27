import chalk from 'chalk';
import modelsJsonData from './_gemoni-json/models.json';

// 配置常量
const CONFIG = {
  PORT_RANGE: { min: 3000, max: 9999 },
  STREAM_DELAY: 100,
  MAX_PORT_RETRIES: 100,
} as const;

const encoder = new TextEncoder();

// 响应头配置
const HEADERS = {
  BASE: {
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'x-content-type-options': 'nosniff',
  },
  JSON: {
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'x-content-type-options': 'nosniff',
    'Content-Type': 'application/json; charset=utf-8',
  },
  STREAM: {
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'x-content-type-options': 'nosniff',
    'Content-Type': 'text/event-stream; charset=utf-8',
  },
} as const;

// Mock 响应数据
const MOCK_DATA = {
  GEMINI_STREAM: [
    ...Array.from({ length: 5 }, (_, i) => ({
      candidates: [
        { content: { parts: [{ text: `MOCK_${i + 1}\n` }], role: 'model' } },
      ],
      usageMetadata: {
        promptTokenCount: 9,
        totalTokenCount: 9,
        promptTokensDetails: [{ modality: 'TEXT', tokenCount: 9 }],
      },
      modelVersion: 'gemini-1.5-flash',
    })),
    {
      candidates: [
        {
          content: { parts: [{ text: 'MOCK_DONE\n' }], role: 'model' },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: {
        promptTokenCount: 9,
        candidatesTokenCount: 15,
        totalTokenCount: 24,
        promptTokensDetails: [{ modality: 'TEXT', tokenCount: 9 }],
        candidatesTokensDetails: [{ modality: 'TEXT', tokenCount: 15 }],
      },
      modelVersion: 'gemini-1.5-flash',
    },
  ],
  NON_STREAM: {
    candidates: [
      {
        content: { parts: [{ text: 'MOCK_DONE\n' }], role: 'model' },
        finishReason: 'STOP',
      },
    ],
    usageMetadata: {
      promptTokenCount: 9,
      candidatesTokenCount: 15,
      totalTokenCount: 24,
      promptTokensDetails: [{ modality: 'TEXT', tokenCount: 9 }],
      candidatesTokensDetails: [{ modality: 'TEXT', tokenCount: 15 }],
    },
    modelVersion: 'gemini-1.5-flash',
  },
  // OpenAI 兼容数据
  OPENAI_STREAM: [
    {
      choices: [
        { delta: { content: 'MOCK_1\n', role: 'assistant' }, index: 0 },
      ],
      created: 1745680998,
      model: 'gemini-2.0-flash',
      object: 'chat.completion.chunk',
    },
    {
      choices: [
        { delta: { content: 'MOCK_2\n', role: 'assistant' }, index: 0 },
      ],
      created: 1745680998,
      model: 'gemini-2.0-flash',
      object: 'chat.completion.chunk',
    },
    {
      choices: [
        { delta: { content: 'MOCK_3\n', role: 'assistant' }, index: 0 },
      ],
      created: 1745680998,
      model: 'gemini-2.0-flash',
      object: 'chat.completion.chunk',
    },
    {
      choices: [
        {
          delta: { content: 'MOCK_DONE\n', role: 'assistant' },
          finish_reason: 'stop',
          index: 0,
        },
      ],
      created: 1745680998,
      model: 'gemini-2.0-flash',
      object: 'chat.completion.chunk',
    },
  ],
  OPENAI_MODELS: {
    object: 'list',
    data: [
      { id: 'models/chat-bison-001', object: 'model', owned_by: 'google' },
      { id: 'models/text-bison-001', object: 'model', owned_by: 'google' },
      { id: 'models/gemini-1.5-flash', object: 'model', owned_by: 'google' },
      { id: 'models/gemini-1.5-pro', object: 'model', owned_by: 'google' },
      { id: 'models/gemini-2.0-flash', object: 'model', owned_by: 'google' },
    ],
  },
  OPENAI_MODEL_RETRIEVE: {
    id: 'models/gemini-2.0-flash',
    object: 'model',
    owned_by: 'google',
  },
  OPENAI_COMPLETION: {
    choices: [
      {
        finish_reason: 'stop',
        index: 0,
        message: {
          content: 'Hello! How can I help you today?\n',
          role: 'assistant',
        },
      },
    ],
    created: 1745682706,
    model: 'gemini-2.0-flash',
    object: 'chat.completion',
    usage: {
      completion_tokens: 8,
      prompt_tokens: 10,
      total_tokens: 18,
    },
  },
} as const;

// 工具函数
function createJsonResponse(data: any): Response {
  return new Response(JSON.stringify(data), { headers: HEADERS.JSON });
}

function createStreamResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, { headers: HEADERS.STREAM });
}

function createStreamData(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function logRequest(
  method: string,
  path: string,
  query?: URLSearchParams,
): void {
  const queryStr = query?.toString() ? `?${query.toString()}` : '';
  console.log(chalk.blue(`📥 [${method}] ${path}${queryStr}`));
}

// 路由处理器类
class RouteHandler {
  private routes: Map<string, () => Response | Promise<Response>>;

  constructor() {
    this.routes = new Map();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // 模型列表路由
    this.routes.set('/v1beta/models', () => {
      return createJsonResponse(modelsJsonData);
    });

    // 生成内容路由（流式和非流式）
    this.routes.set('/v1beta/models/gemini-1.5-flash:generateContent', () => {
      return createJsonResponse(MOCK_DATA.NON_STREAM);
    });

    this.routes.set(
      '/v1beta/models/gemini-1.5-flash:streamGenerateContent',
      () => {
        return this.createStreamingResponse();
      },
    );

    this.routes.set('/v1beta/models/gemini-1.5-pro:generateContent', () => {
      return createJsonResponse(MOCK_DATA.NON_STREAM);
    });

    this.routes.set(
      '/v1beta/models/gemini-1.5-pro:streamGenerateContent',
      () => {
        return this.createStreamingResponse();
      },
    );

    // OpenAI 兼容路由
    this.routes.set('/v1beta/openai/models', () => {
      return createJsonResponse(MOCK_DATA.OPENAI_MODELS);
    });
  }

  private createStreamingResponse(): Response {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (const chunk of MOCK_DATA.GEMINI_STREAM) {
            const data = createStreamData(chunk);
            controller.enqueue(encoder.encode(data));
            await new Promise((resolve) =>
              setTimeout(resolve, CONFIG.STREAM_DELAY),
            );
          }
        } catch (error) {
          console.error('流式响应错误:', error);
        } finally {
          controller.close();
        }
      },
    });

    return createStreamResponse(stream);
  }

  private createOpenAIStreamingResponse(): Response {
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (const chunk of MOCK_DATA.OPENAI_STREAM) {
            const data = createStreamData(chunk);
            controller.enqueue(encoder.encode(data));
            await new Promise((resolve) =>
              setTimeout(resolve, CONFIG.STREAM_DELAY),
            );
          }
        } catch (error) {
          console.error('OpenAI流式响应错误:', error);
        } finally {
          controller.close();
        }
      },
    });

    return createStreamResponse(stream);
  }

  async handle(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const path = url.pathname;
      const method = req.method;

      logRequest(method, path, url.searchParams);

      // 首先检查固定路由
      const fixedHandler = this.routes.get(path);
      if (fixedHandler) {
        return await fixedHandler();
      }

      // 处理动态路由和模式匹配

      // Gemini 通用生成内容路由: /v1beta/models/{model_name}:generateContent
      if (
        path.includes('/v1beta/models/') &&
        path.endsWith(':generateContent') &&
        method === 'POST'
      ) {
        const modelName = path
          .split('/v1beta/models/')[1]
          .split(':generateContent')[0];
        console.log(
          chalk.green.bold(
            `🎭📝 [MOCK] 模拟 Gemini 非流式响应 (${modelName}) 📝🎭`,
          ),
        );
        return createJsonResponse(MOCK_DATA.NON_STREAM);
      }

      // Gemini 通用流式生成内容路由: /v1beta/models/{model_name}:streamGenerateContent
      if (
        path.includes('/v1beta/models/') &&
        path.endsWith(':streamGenerateContent') &&
        method === 'POST'
      ) {
        const modelName = path
          .split('/v1beta/models/')[1]
          .split(':streamGenerateContent')[0];
        console.log(
          chalk.green.bold(
            `🎭🌊 [MOCK] 模拟 Gemini 流式响应 (${modelName}) 🌊🎭`,
          ),
        );
        return this.createStreamingResponse();
      }

      // OpenAI 模型检索: /v1beta/openai/models/{model_id}
      if (path.startsWith('/v1beta/openai/models/') && method === 'GET') {
        const modelId = path.split('/').pop();
        console.log(
          chalk.green.bold(`🎭🔍 [MOCK] 模拟 OpenAI 检索模型: ${modelId} 🔍🎭`),
        );
        return createJsonResponse({
          ...MOCK_DATA.OPENAI_MODEL_RETRIEVE,
          id: `models/${modelId}`,
        });
      }

      // OpenAI 聊天完成: /v1beta/openai/chat/completions
      if (path === '/v1beta/openai/chat/completions' && method === 'POST') {
        const requestBody = await req.json();
        const isStream = requestBody.stream === true;

        if (isStream) {
          console.log(
            chalk.yellow.bold(`🎭🌊 [MOCK] 模拟 OpenAI 流式响应 🌊🎭`),
          );
          return this.createOpenAIStreamingResponse();
        } else {
          console.log(
            chalk.yellow.bold(`🎭📝 [MOCK] 模拟 OpenAI 非流式响应 📝🎭`),
          );
          return createJsonResponse(MOCK_DATA.OPENAI_COMPLETION);
        }
      }

      // 默认响应
      return createJsonResponse({
        error: 'Not Found',
        path,
        available_routes: Array.from(this.routes.keys()).concat([
          '/v1beta/openai/models/{model_id}',
          '/v1beta/openai/chat/completions',
        ]),
      });
    } catch (error) {
      console.error('请求处理错误:', error);
      return createJsonResponse({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  }
}

// 端口查找函数
async function findAvailablePort(): Promise<number> {
  const { min, max } = CONFIG.PORT_RANGE;
  let attempts = 0;

  while (attempts < CONFIG.MAX_PORT_RETRIES) {
    const port = Math.floor(Math.random() * (max - min + 1)) + min;

    try {
      // 尝试在端口上创建服务器来测试可用性
      const testServer = Bun.serve({
        port,
        fetch() {
          return new Response('test');
        },
      });

      testServer.stop();
      return port;
    } catch {
      attempts++;
    }
  }

  throw new Error('无法找到可用端口');
}

// 主函数
export async function startMockServer(): Promise<number> {
  const port = await findAvailablePort();
  const routeHandler = new RouteHandler();

  console.log(chalk.green.bold(`🎭🚀 [MOCK-SERVER] 启动在端口 ${port} 🚀🎭`));

  Bun.serve({
    port,
    async fetch(req) {
      return await routeHandler.handle(req);
    },
  });

  return port;
}

// 如果作为主模块直接运行，启动服务器进行测试
if (import.meta.main) {
  console.log('🧪 直接运行优化后的MockServer进行测试...');

  try {
    const port = await startMockServer();
    console.log(`✅ MockServer启动成功，端口: ${port}`);

    // 简单测试
    setTimeout(async () => {
      try {
        const testUrl = `http://localhost:${port}/v1beta/models`;
        console.log(`🧪 测试请求: ${testUrl}`);

        const response = await fetch(testUrl);
        const data = await response.json();

        console.log('✅ 测试成功! 模型总数:', data.models.length);
        console.log('🎉 优化后的MockServer运行完全正常！');
      } catch (error) {
        console.error('❌ 测试失败:', error);
      }
    }, 1000);
  } catch (error) {
    console.error('❌ MockServer启动失败:', error);
  }
}
