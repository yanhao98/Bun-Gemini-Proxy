# Bun-Gemini-Proxy

```bash
curl "http://localhost:7860/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse" \
        -H 'Content-Type: application/json' \
        -H 'x-goog-api-key: hhh' \
        -d '{ "contents":[{"parts":[{"text": "Write long a story about a magic backpack."}]}]}'
```

## 资料

- https://ai.google.dev/gemini-api/docs/get-started/tutorial?lang=rest&hl=zh-cn
- https://github.com/google-gemini/generative-ai-js
