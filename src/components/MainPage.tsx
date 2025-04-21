import type { Server } from 'bun';
import { BaseLayout } from './BaseLayout';
import prettyMs from 'pretty-ms';
import type { PropsWithChildren } from '@kitajs/html';
import { maskAPIKey } from '../utils';
import { toIIFEString } from './utils';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: Bun.env.AUTH_KEY,
  baseURL: 'http://localhost:7860/v1beta/openai/',
});

interface Props {
  pendingRequests: Server['pendingRequests'];
  keyUsageStats: Record<string, number>;
  keyCount: number;
}

export async function MainPage({
  pendingRequests,
  keyUsageStats,
  keyCount,
}: PropsWithChildren<Props>) {
  const randomSeed = Math.random().toString(36).substring(7); // Generate a short random string
  const completion = await openai.chat.completions.create({
    model: 'gemini-2.5-flash-preview-04-17', // Or whichever model you are actually using
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      {
        role: 'user',
        content: `给我一个随机冷知识。为了确保随机性，请参考这个词：${randomSeed}。(不要输出多余的信息，直接给冷知识)`,
      },
    ],
    stream: false,
    temperature: 1.2, // 尝试增加温度值
  });
  const content = completion.choices[0].message.content;

  function handleClick() {
    window.location.reload();
  }

  function handleToggleDarkMode() {
    document.documentElement.classList.toggle('dark');
  }

  // 获取内存占用信息
  const mem = process.memoryUsage();
  // 格式化为 MB
  const formatMB = (n: number) => (n / 1024 / 1024).toFixed(2) + ' MB';
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
          {/* 冷知识展示 */}
          <div class="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-md my-4">
            <span class="text-yellow-800 dark:text-yellow-200 font-medium">
              冷知识：
            </span>
            <span class="text-yellow-900 dark:text-yellow-100 ml-2">
              {content}
            </span>
          </div>
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
