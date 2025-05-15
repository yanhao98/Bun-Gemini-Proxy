# Bun-Gemini-Proxy

一个用于Google Gemini API的高性能代理服务器，使用Bun和Elysia开发。

## 特性

- ⚡ 高性能：基于Bun运行时，提供快速的API请求转发
- 🔑 密钥管理：支持多个API密钥，自动负载均衡

## 快速开始

### 环境要求

- [Bun](https://bun.sh/)

### 安装

```bash
# 安装依赖
bun install
```

### 配置

创建一个`.env`文件在项目根目录下，添加以下内容：

```env
# 必须配置项
GEMINI_API_KEYS=your-key-1,your-key-2,your-key-3
AUTH_KEY=your-auth-key
GEMINI_BASE_URL=https://generativelanguage.googleapis.com

# 可选配置项
REDIS_URL=redis://127.0.0.1:6379/1
```

### 运行

```bash
# 开发模式
bun dev

# 生产模式
bun run src/server.ts
```

访问 `http://localhost:7860` 查看状态页面。

### Docker部署

也可以使用Docker来运行：

```bash
# 运行容器
docker run -p 7860:7860 --env-file .env ghcr.io/yanhao98/bun-gemini-proxy:main
```

或者使用docker compose：

```bash
docker compose up -d --wait --no-build
```

## API使用

该服务提供以下端点：

### Gemini API

```bash
# 生成内容
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: YOUR_AUTH_KEY" \
  -d '{"contents":[{"parts":[{"text":"写一首关于春天的诗"}]}]}' \
  "http://localhost:7860/v1beta/models/gemini-2.5-pro-exp-03-25:streamGenerateContent?alt=sse"
```

### OpenAI兼容接口

```bash
# 聊天补全
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_KEY" \
  -d '{"model":"gemini-2.5-pro-exp-03-25","messages":[{"role":"user","content":"你好"}]}' \
  "http://localhost:7860/v1beta/openai/chat/completions"
```

## 开发

```bash
# 运行测试
bun test

# 代码检查
bun lint

# 代码格式化
bun format
```

## 许可证

MIT

## 资料

- https://ai.google.dev/gemini-api/docs?hl=zh-cn
- https://github.com/google-gemini/generative-ai-js
- https://github.com/googleapis/js-genai
- https://github.com/PublicAffairs/openai-gemini

---

- [Bun.redis 问题](https://github.com/oven-sh/bun/issues?q=label%3Aredis%20state%3Aopen)
  - [database 支持问题](https://github.com/oven-sh/bun/issues/19126)
  - [自动重连 问题](https://github.com/oven-sh/bun/issues/19131)
