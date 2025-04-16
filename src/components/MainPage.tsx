import type { Server } from 'bun';
import { BaseLayout } from './BaseLayout';
import prettyMs from 'pretty-ms';

interface Props {
  pendingRequests: Server['pendingRequests'];
}

export function MainPage({ pendingRequests }: Props) {
  return (
    <BaseLayout>
      {`运行时间：${prettyMs(
        process.uptime() * 1000,
      )} | 待处理请求：${pendingRequests.toString()}
      <button
        onclick="window.location.reload()"
        style="padding: 2px 8px;"
      >
        刷新
      </button>`}
    </BaseLayout>
  );
}
