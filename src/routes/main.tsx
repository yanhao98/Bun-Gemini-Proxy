import Elysia from 'elysia';
// eslint-disable-next-line no-unused-vars
import { Html } from '@elysiajs/html';
import { MainPage } from '../components/MainPage';

export const mainRoutes = new Elysia()
  .get('/favicon.ico', () => {
    return new Response(null, {
      status: 204,
      headers: { 'Content-Type': 'image/x-icon' },
    });
  })
  .get('/', function get_main() {
    return <MainPage />;
  });
