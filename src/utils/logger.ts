import dayjs from 'dayjs';
import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import prettyMs from 'pretty-ms';

export const LOG_DIR = Bun.env.LOG_DIR || path.join(process.cwd(), 'logs');
// 创建日志目录
mkdirSync(LOG_DIR, { recursive: true });

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

  // >> 将日志写入文件
  const logFileName = `${dayjs().format('HHmmss')}-${requestID}.log`;
  const logFile = path.join(LOG_DIR, logFileName);
  try {
    appendFileSync(logFile, logMessage);
    console.log(`日志已写入 ${logFile}`);
  } catch (error) {
    console.error(`写入日志到 ${logFile} 失败:`, error);
  }
  // <<<
}
