import Elysia from 'elysia';
import { MainPage } from '../components/MainPage';

function generateFaviconResponse() {
  return new Response(null, {
    status: 204,
    headers: { 'Content-Type': 'image/x-icon' },
  });
}
export const mainRoutes = new Elysia()
  .get('/favicon.ico', generateFaviconResponse)
  .get('/apple-touch-icon.png', generateFaviconResponse)
  .get('/', function get_main(app) {
    return <MainPage pendingRequests={app.server?.pendingRequests || 0} />;
  });
