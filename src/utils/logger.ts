function _performanceNow(): string {
  return `⏱️ ${String(performance.now()).padEnd(14, '0')}`;
}

type LogCtx = {
  requestID: string | number;
  begin?: number;
  [key: string]: unknown;
};

export function createLogger() {
  return function log(ctx: LogCtx, ...args: unknown[]): void {
    console.debug(
      /* `[${_performanceNow()}]`, */
      `📝 [${ctx.requestID}]`,
      ctx.begin ? `[${(performance.now() - ctx.begin).toFixed(3)}ms]` : '',
      ...args,
    );
  };
}

/**
 * 默认logger实例
 */
export const perfLog = createLogger();
