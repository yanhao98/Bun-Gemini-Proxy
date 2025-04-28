import dayjs from 'dayjs';

/**
 * 格式化当前时间为 YYYY-MM-DD HH:MM:SS.mmm 格式
 */
function formatDateTime(): string {
  return dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');
}

type LogCtx = {
  requestID: string | number;
  begin?: number;
  [key: string]: unknown;
};

export function createLogger() {
  return function log(ctx: LogCtx, ...args: unknown[]): void {
    console.debug(
      `[${formatDateTime()}]`,
      `📝 [${ctx.requestID}]`,
      ctx.begin
        ? `[${(performance.now() - ctx.begin).toFixed(3)}ms]`
        : undefined,
      ...args,
    );
  };
}

/**
 * 默认logger实例
 */
export const perfLog = createLogger();
