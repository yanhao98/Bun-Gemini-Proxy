import modelsJson from '../_gemoni-json/models.json';
const encoder = new TextEncoder();
const mockHeaders = {
  // 'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'x-content-type-options': 'nosniff',
};
const mockHeadersJson = {
  ...mockHeaders,
  'Content-Type': 'application/json; charset=utf-8',
};
const mockHeadersStream = {
  ...mockHeaders,
  'Content-Type': 'text/event-stream; charset=utf-8',
};

const GeminiStreamJsons = [
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
      candidatesTokenCount: 882,
      totalTokenCount: 891,
      promptTokensDetails: [{ modality: 'TEXT', tokenCount: 9 }],
      candidatesTokensDetails: [{ modality: 'TEXT', tokenCount: 882 }],
    },
    modelVersion: 'gemini-1.5-flash',
  },
];

const openaiStreamJsons = [
  {
    choices: [{ delta: { content: 'MOCK_1\n', role: 'assistant' }, index: 0 }],
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
];

export const geminiStreamMockServerConfig_6666: Bun.ServeFunctionOptions<
  unknown,
  {}
> = {
  port: 6666,
  async fetch(req) {
    console.debug(`🎭 模拟服务器收到请求`);
    console.debug(`    method: ${req.method}`);
    console.debug(`       url: ${req.url}`);
    if (req.method === 'POST')
      console.debug(`      body: ${JSON.stringify(await req.clone().json())}`);
    console.debug(`   headers: ${JSON.stringify(req.headers)}`);

    // /v1beta
    if (req.url.includes('/v1beta')) {
      if (new URL(req.url).pathname === '/v1beta/models') {
        /* 
        curl --location 'https://generativelanguage.googleapis.com/v1beta/models' \
        --header 'Accept-Encoding: deflate' \
        --header 'x-goog-api-key: hh'
        */
        console.debug(`🎭 模拟 Gemini 列出模型`);
        return new Response(JSON.stringify(modelsJson), {
          headers: mockHeadersJson,
        });
      }
      // OpenAI检索模型
      if (req.url.includes('/openai/models/gemini')) {
        console.debug(`🎭 模拟 OpenAI 检索模型`);
        return new Response(
          JSON.stringify({
            id: 'models/gemini-2.0-flash',
            object: 'model',
            owned_by: 'google',
          }),
          { headers: mockHeadersJson },
        );
      }

      // OpenAI 列出模型
      if (req.url.includes('/openai/models')) {
        console.debug(`🎭 模拟 OpenAI 列出模型`);
        return new Response(
          JSON.stringify({
            object: 'list',
            data: [
              {
                id: 'models/chat-bison-001',
                object: 'model',
                owned_by: 'google',
              },
              {
                id: 'models/text-bison-001',
                object: 'model',
                owned_by: 'google',
              },
            ],
          }),
          { headers: mockHeadersJson },
        );
      }

      // Gemini 流式
      if (req.url.includes('streamGenerateContent')) {
        console.debug(`🎭 模拟 Gemini 流式`);
        const stream = new ReadableStream({
          async start(controller) {
            for (const item of GeminiStreamJsons) {
              if (req.signal.aborted) {
                console.debug(
                  '🎭 模拟服务器',
                  '客户端已断开连接，将不再发送数据，跳出循环',
                );
                break;
              }

              const message = 'data: ' + JSON.stringify(item) + '\n\n';
              console.debug('🎭 模拟服务器发送数据:', message);
              controller.enqueue(encoder.encode(message));
              await Bun.sleep(100);
            }
            controller.close();
          },
        });
        return new Response(stream, { headers: mockHeadersStream });
      }

      // Gemini 非流式
      if (req.url.includes('generateContent')) {
        console.debug(`🎭 模拟 Gemini 非流式`);
        return new Response(JSON.stringify(GeminiStreamJsons.slice(-1)[0]), {
          headers: mockHeadersJson,
        });
      }

      // OpenAI 兼容流式
      if (
        req.url.includes('/openai/chat/completions') &&
        (await req.clone().json()).stream === true
      ) {
        console.debug(`🎭 模拟 OpenAI 流式`);
        const stream = new ReadableStream({
          async start(controller) {
            for (const item of openaiStreamJsons) {
              if (req.signal.aborted) {
                console.debug(
                  '🎭 模拟服务器',
                  '客户端已断开连接，将不再发送数据，跳出循环',
                );
                break;
              }
              const message = 'data: ' + JSON.stringify(item) + '\n\n';
              console.debug('🎭 模拟服务器发送数据:', message);
              controller.enqueue(encoder.encode(message));
              await Bun.sleep(100);
            }
            console.debug(`🎭 模拟服务器发送数据: [DONE]` + '\n\n');
            controller.enqueue(encoder.encode(`data: [DONE]` + '\n\n'));
            await Bun.sleep(100);

            controller.close();
          },
        });
        return new Response(stream, {
          headers: mockHeadersStream,
        });
      }
      // OpenAI 兼容非流式
      if (
        req.url.includes('/openai/chat/completions') &&
        (await req.clone().json()).stream === false
      ) {
        console.debug(`🎭 模拟 OpenAI 非流式`);
        return new Response(
          JSON.stringify({
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
              completion_tokens: 10,
              prompt_tokens: 8,
              total_tokens: 18,
            },
          }),
          {
            headers: mockHeadersJson,
          },
        );
      }
    }

    return new Response('Hello from mock server');
  },
};
