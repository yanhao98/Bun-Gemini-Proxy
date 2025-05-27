import cors from '@elysiajs/cors';
import { html } from '@elysiajs/html';
import { serverTiming } from '@elysiajs/server-timing';
import { swagger } from '@elysiajs/swagger';
import Elysia from 'elysia';
import { requestID } from 'elysia-requestid';
import { errorHandler } from './plugins/error-handler';
import { mainRoutes } from './routes/_main';
import { gemini_v1betaRoutes } from './routes/gemini_v1beta';

// 创建基础应用实例
export const app = new Elysia()
  // .use((await import('./plugins/trace')).trace.as('global'))
  // 添加全局中间件
  .use(requestID().as('global'))
  .use(errorHandler())
  .use(html())
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Gemini API 代理服务',
          version: process.env.VERSION as string,
          description: '一个简单的Gemini API 代理服务',
        },
        tags: [
          { name: 'main', description: '主页' },
          { name: 'gemini', description: 'Gemini API 代理' },
        ],
      },
    }),
  )
  .use(cors())
  .use(serverTiming({ enabled: true }))

  // 路由
  /* .use(
    staticPlugin({
      prefix: '/logs',
      assets: LOG_DIR,
      alwaysStatic: false,
    }),
  ) */
  .use(mainRoutes)
  .use(gemini_v1betaRoutes);
