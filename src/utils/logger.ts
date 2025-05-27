import dayjs from 'dayjs';
import prettyMs from 'pretty-ms';

// 定义日志上下文类型
export interface LogCtx {
  requestID: string | number;
  begin?: number;
}

/**
 * 格式化日志函数
 */
export function log(ctx: LogCtx, ...messages: string[]): void {
  const { requestID, begin } = ctx;

  // 计算请求耗时
  const elapsedStr = begin ? `(${prettyMs(performance.now() - begin)})` : '';

  const timeStr = dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');

  // 格式化并输出日志
  const logMessage = `${timeStr} [${requestID}] ${elapsedStr} ${messages.join(
    ' ',
  )}\n`;
  console.log(logMessage.trim());
}
