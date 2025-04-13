// eslint-disable-next-line no-unused-vars
import { Html } from '@elysiajs/html';

interface BaseLayoutProps {
  title?: string;
  children: string | string[];
}

export function BaseLayout({ title, children }: BaseLayoutProps) {
  return (
    <html lang="zh-CN">
      <head>
        <title>{title}</title>
        <script src="https://cdn.jsdelivr.net/npm/@unocss/runtime"></script>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@unocss/reset/tailwind.min.css"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>{`[un-cloak] { display: none; }`}</style>
      </head>

      <body un-cloak>
        <main class="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-900">
          {children}
        </main>
      </body>
    </html>
  );
}
