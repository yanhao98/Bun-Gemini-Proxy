import Elysia from 'elysia';
import { MainPage } from '../components/MainPage';

export const mainRoutes = new Elysia()
  .get('/favicon.ico', () => {
    return new Response(null, {
      status: 204,
      headers: { 'Content-Type': 'image/x-icon' },
    });
  })
  .get('/', function get_main(app) {
    return <MainPage pendingRequests={app.server?.pendingRequests || 0} />;
  });
