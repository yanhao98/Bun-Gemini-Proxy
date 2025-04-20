export const GEMINI_BASE_URL = (() => {
  if (Bun.env.GEMINI_BASE_URL?.endsWith('/')) {
    return Bun.env.GEMINI_BASE_URL.slice(0, -1);
  }
  return (
    Bun.env.GEMINI_BASE_URL ??
    'https://generativelanguage.googleapis.com/v1beta'
  );
})();

export const GEMINI_API_HEADER_NAME = 'x-goog-api-key';
