import type { RpcStatus } from '@google/generative-ai/server';

/**
 * 对 API Key 进行掩码处理，保留前4位和后4位，中间用 **** 替换
 */
export function maskAPIKey(apiKey: string): string {
  return apiKey.replace(/(.{4})(.*)(.{4})/, '$1****$3');
}

export function createGeminiError(code: number, message: string) {
  return {
    error: {
      code,
      message,
    } satisfies RpcStatus,
  };
}
