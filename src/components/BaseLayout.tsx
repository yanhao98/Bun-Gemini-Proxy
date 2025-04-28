import type { Children } from '@kitajs/html';
import { toIIFEString } from './utils';

interface BaseLayoutProps {
  title?: string;
  children: Children;
}

export function BaseLayout({ title, children }: BaseLayoutProps) {
  function updateColorMode() {
    // 检查用户偏好的颜色模式
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  return (
    <html lang="zh-CN">
      <head>
        <title>{title}</title>
        <script src="https://testingcf.jsdelivr.net/npm/@unocss/runtime"></script>
        <link
          rel="stylesheet"
          href="https://testingcf.jsdelivr.net/npm/@unocss/reset/tailwind.min.css"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>{`
          [un-cloak] { display: none; }
          
          @media (prefers-color-scheme: dark) {
            :root {
              color-scheme: dark;
            }
          }

          /* 只对可能在暗色模式下变化的元素应用过渡效果 */
          html, body, main, [class*="dark:"] {
            transition: color 0.5s, background-color 0.5s;
          }
        `}</style>
        <script>{toIIFEString(updateColorMode)}</script>
      </head>

      <body un-cloak class="bg-gray-100 dark:bg-gray-900">
        <main class="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 ">
          {children}
        </main>
      </body>
    </html>
  );
}
