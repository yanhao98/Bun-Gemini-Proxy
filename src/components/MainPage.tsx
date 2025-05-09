import type { Server } from 'bun';
import { BaseLayout } from './BaseLayout';
import prettyMs from 'pretty-ms';
import type { PropsWithChildren } from '@kitajs/html';
import { maskAPIKey } from '../utils';
import { toIIFEString } from './utils';
import { readFileSync } from 'fs';

// 创建获取cgroup内存使用的函数
function getCgroupMemoryUsage() {
  // 只在Linux平台上尝试读取cgroup信息
  if (process.platform !== 'linux') {
    return null;
  }

  try {
    // 尝试读取不同路径的cgroup内存信息
    const possiblePaths = [
      // cgroups v2 路径
      '/sys/fs/cgroup/memory.current',
      // cgroups v1 路径
      '/sys/fs/cgroup/memory/memory.usage_in_bytes',
      // Docker中常见的cgroups v1路径
      '/sys/fs/cgroup/memory.usage_in_bytes',
      // 其他可能的路径
      '/proc/self/cgroup',
    ];

    for (const path of possiblePaths) {
      try {
        const content = readFileSync(path, 'utf8');
        // 对于memory.current和usage_in_bytes文件，内容直接是数字
        if (path !== '/proc/self/cgroup') {
          return Number(content.trim());
        }
        // 如果是/proc/self/cgroup，需要解析进一步获取内存信息
        else {
          // 在这种情况下，我们得到cgroup路径，但还需要额外的处理
          // 这里只是返回一个标志值，表示检测到了cgroup但无法直接获取内存值
          return -1;
        }
      } catch {
        // 忽略单个文件的错误，继续尝试下一个
        continue;
      }
    }

    // 如果所有路径都失败
    return null;
  } catch (error) {
    // 如果读取失败，忽略错误
    console.error('无法读取cgroup内存信息', error);
    return null;
  }
}

// 格式化为 MB
const formatMB = (n: number) => (n / 1024 / 1024).toFixed(2) + ' MB';

interface Props {
  pendingRequests: Server['pendingRequests'];
  keyUsageStats: Record<string, number>;
  keyCount: number;
}

export function MainPage({
  pendingRequests,
  keyUsageStats,
  keyCount,
}: PropsWithChildren<Props>) {
  // 获取内存占用信息
  const mem = process.memoryUsage();
  // 获取cgroups内存使用量
  const cgroupMemoryUsage = getCgroupMemoryUsage();

  function handleClick() {
    window.location.reload();
  }

  function handleToggleDarkMode() {
    document.documentElement.classList.toggle('dark');
  }

  return (
    <BaseLayout>
      <div class="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg ">
        <div class="flex justify-between items-center border-b pb-3">
          <h1 class="text-3xl font-bold mb-0 text-gray-800 dark:text-gray-100">
            <a href="/"> 🐰 </a>
            Bun 运行中
          </h1>
          <button
            class="p-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 "
            onclick={toIIFEString(handleToggleDarkMode)}
            aria-label="切换暗色模式"
          >
            🌓
          </button>
        </div>

        <div class="space-y-4 mt-6">
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md ">
            <span class="text-gray-600 dark:text-gray-300 font-medium">
              运行时间
            </span>
            <span class="text-gray-800 dark:text-gray-200">
              {prettyMs(process.uptime() * 1000)}
            </span>
          </div>

          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md ">
            <span class="text-gray-600 dark:text-gray-300 font-medium">
              运行平台
            </span>
            <span class="text-gray-800 dark:text-gray-200">
              {process.platform}
            </span>
          </div>

          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md ">
            <span class="text-gray-600 dark:text-gray-300 font-medium">
              版本
            </span>
            <span class="text-gray-800 dark:text-gray-200">
              {process.env.VERSION || '未指定'}
            </span>
          </div>

          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md ">
            <span class="text-gray-600 dark:text-gray-300 font-medium">
              待处理请求
            </span>
            <span class="text-gray-800 dark:text-gray-200">
              {pendingRequests.toString()}
            </span>
          </div>

          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md ">
            <span class="text-gray-600 dark:text-gray-300 font-medium">
              API密钥数量
            </span>
            <span class="text-gray-800 dark:text-gray-200">{keyCount}</span>
          </div>

          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-md space-y-2 ">
            <h2 class="text-gray-700 dark:text-gray-300 font-medium mb-2">
              内存占用
            </h2>
            <div class="grid grid-cols-1 gap-2">
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">
                  常驻内存（RSS）
                </span>
                <span class="text-gray-800 dark:text-gray-200 font-mono">
                  {formatMB(mem.rss)}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">已用堆内存</span>
                <span class="text-gray-800 dark:text-gray-200 font-mono">
                  {formatMB(mem.heapUsed)}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">堆总量</span>
                <span class="text-gray-800 dark:text-gray-200 font-mono">
                  {formatMB(mem.heapTotal)}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-600 dark:text-gray-400">
                  容器实际内存
                </span>
                <span class="text-gray-800 dark:text-gray-200 font-mono">
                  {cgroupMemoryUsage ? formatMB(cgroupMemoryUsage) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <button
            class="mt-6 w-full px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-md font-medium  hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-opacity-50"
            onclick={toIIFEString(handleClick)}
          >
            刷新
          </button>

          {Object.keys(keyUsageStats).length > 0 && (
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-md space-y-2 ">
              <h2 class="text-gray-700 dark:text-gray-300 font-medium mb-2">
                API密钥使用情况
              </h2>
              <div class="grid grid-cols-1 gap-2">
                {Object.entries(keyUsageStats).map(([key, count]) => (
                  <div class="flex justify-between items-center">
                    <span class="text-gray-600 dark:text-gray-400">
                      {maskAPIKey(key)}
                    </span>
                    <span class="text-gray-800 dark:text-gray-200 font-mono">
                      {count} 次
                    </span>
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
