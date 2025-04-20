declare module 'bun' {
  interface Env {
    GEMINI_BASE_URL?: string;
    GEMINI_API_KEYS?: string;
    AUTH_KEY?: string;
    REDIS_URL?: string;
  }
}
