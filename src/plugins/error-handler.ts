import { consola } from 'consola';
import { Elysia } from 'elysia';

export const errorHandler = () => {
  const app = new Elysia({
    name: '@h/errorHandler',
  });
  app.onError(async function onErrorHandler({ code, request, error }) {
    consola.error(`🦊 错误: code: ${code}, error: ${error}`);
    console.error(request);
  });

  return app.as('global');
};
