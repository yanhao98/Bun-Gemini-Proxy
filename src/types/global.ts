declare module 'bun' {
  interface Env {
    GEMINI_BASE_URL?: string;
    GEMINI_API_KEYS?: string;
    REDIS_URL?: string;
    AUTH_KEY?: string;
    // LOG_DIR?: string;
  }
}
