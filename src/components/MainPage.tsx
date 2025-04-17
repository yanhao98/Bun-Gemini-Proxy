import type { Server } from 'bun';
import { BaseLayout } from './BaseLayout';
import prettyMs from 'pretty-ms';
import type { PropsWithChildren } from '@kitajs/html';
import { maskAPIKey } from '../utils';

interface Props {
  pendingRequests: Server['pendingRequests'];
  keyUsageStats: Record<string, number>;
  keyCount: number;
}

function toIIFEString(fn: Function): string {
  if (typeof fn !== 'function') {
    console.warn('toIIFEString 预期接收一个函数，但收到了:', fn);
    return ''; // 返回空字符串或抛出错误
  }
  return `(${fn.toString()})()`;
}

export function MainPage({
  pendingRequests,
  keyUsageStats,
  keyCount,
}: PropsWithChildren<Props>) {
  function handleClick() {
    window.location.reload();
  }
  // 获取内存占用信息
  const mem = process.memoryUsage();
  // 格式化为 MB
  const formatMB = (n: number) => (n / 1024 / 1024).toFixed(2) + ' MB';
  return (
    <BaseLayout>
      <div class="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h1 class="text-3xl font-bold mb-6 text-gray-800 border-b pb-3">
          <button onclick={toIIFEString(handleClick)}> 🐰 </button>
          Bun 运行中
        </h1>

        <div class="space-y-4">
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <span class="text-gray-600 font-medium">运行时间</span>
            <span class="text-gray-800">
              {prettyMs(process.uptime() * 1000)}
            </span>
          </div>

          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <span class="text-gray-600 font-medium">待处理请求</span>
            <span class="text-gray-800">{pendingRequests.toString()}</span>
          </div>

          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <span class="text-gray-600 font-medium">API密钥数量</span>
            <span class="text-gray-800">{keyCount}</span>
          </div>

          <div class="bg-gray-50 p-4 rounded-md space-y-2">
            <h2 class="text-gray-700 font-medium mb-2">内存占用</h2>
            <div class="grid grid-cols-1 gap-2">
              <div class="flex justify-between items-center">
                <span class="text-gray-600">常驻内存（RSS）</span>
                <span class="text-gray-800 font-mono">{formatMB(mem.rss)}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600">已用堆内存</span>
                <span class="text-gray-800 font-mono">
                  {formatMB(mem.heapUsed)}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600">堆总量</span>
                <span class="text-gray-800 font-mono">
                  {formatMB(mem.heapTotal)}
                </span>
              </div>
            </div>
          </div>

          <button
            class="mt-6 w-full px-4 py-2 bg-blue-500 text-white rounded-md font-medium transition-colors duration-200 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            onclick={toIIFEString(handleClick)}
          >
            刷新
          </button>

          {Object.keys(keyUsageStats).length > 0 && (
            <div class="bg-gray-50 p-4 rounded-md space-y-2">
              <h2 class="text-gray-700 font-medium mb-2">API密钥使用情况</h2>
              <div class="grid grid-cols-1 gap-2">
                {Object.entries(keyUsageStats).map(([key, count]) => (
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600">{maskAPIKey(key)}</span>
                    <span class="text-gray-800 font-mono">{count} 次</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseLayout>
  );
}
