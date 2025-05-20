export const GEMINI_API_HEADER_NAME = 'x-goog-api-key';

// 模型名称映射表
export const MODEL_NAME_MAPPINGS: Record<string, string> = {
  'gemini-2.5-pro-preview-03-25': 'gemini-2.5-pro-exp-03-25',
};

// 付费模型配置
export const PAID_MODELS_CONFIG = {
  'gemini-2.5-pro-preview-05-06': {
    AUTH_KEY_MAP: {
      'auth-key-1': 'sk-1',
      'auth-key-2': 'sk-2',
    },
  },
};
