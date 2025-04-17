import { RpcStatus } from '@google/generative-ai/server';

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

/**
 * 处理 Gemini API 的错误响应
 * @param response Fetch API 响应对象
 * @returns 格式化的错误对象
 */
export async function handleGeminiErrorResponse(
  response: Response,
): Promise<unknown> {
  if (!response.ok) {
    let responseText = await response.clone().text();
    try {
      const jsonResponse = JSON.parse(responseText);
      if (jsonResponse.error) {
        responseText = jsonResponse.error.message;
      }
    } catch {}

    return createGeminiError(
      response.status,
      `[Gemini API错误] 状态码: ${response.status}, 详情: ${responseText}`,
    );
  } else {
    throw new Error('响应状态码不是错误状态');
  }
}
