# Bun-Gemini-Proxy

```bash
curl "http://localhost:7860/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse" \
        -H 'Content-Type: application/json' \
        -H 'x-goog-api-key: hhh' \
        -d '{ "contents":[{"parts":[{"text": "Write long a story about a magic backpack."}]}]}'
```

## 资料

- https://ai.google.dev/gemini-api/docs/rate-limits?hl=zh-cn
- https://github.com/google-gemini/generative-ai-js
- https://github.com/googleapis/js-genai
- https://github.com/PublicAffairs/openai-gemini

---

- [Bun.redis 问题](https://github.com/oven-sh/bun/issues?q=label%3Aredis%20state%3Aopen)
  - [database 支持问题](https://github.com/oven-sh/bun/issues/19126)
  - [自动重连 问题](https://github.com/oven-sh/bun/issues/19131)
