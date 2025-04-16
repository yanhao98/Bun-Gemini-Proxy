import { perfStreamManager } from './stream';

function _performanceNow(): string {
  return `⏱️ ${String(performance.now()).padEnd(14, '0')}`;
}

type LogCtx = {
  requestID: string | number;
  [key: string]: unknown;
};

export function createLogger() {
  return function log(ctx: LogCtx, ...args: unknown[]): void {
    console.debug(
      /* `[${_performanceNow()}]`, */ `📝 [${ctx.requestID}]`,
      ...args,
    );
    // 将日志数据广播到 SSE 流
    perfStreamManager.broadcast({ ctx, args });
  };
}

/**
 * 默认logger实例
 */
export const perfLog = createLogger();
