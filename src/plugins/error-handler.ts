import { consola } from 'consola';
import { Elysia } from 'elysia';

export const errorHandler = () => {
  const app = new Elysia({
    name: '@h/errorHandler',
  });
  app.onError(async function onErrorHandler({ code, request }) {
    consola.error(`🦊 错误: code: ${code}`);
    console.error(request);
  });

  return app.as('plugin');
};
