import { Elysia } from 'elysia';

export const beginPlugin = new Elysia({ name: '@h/beginPlugin' })
  .derive(() => {
    return {
      begin: performance.now(),
    };
  })
  .as('global');
