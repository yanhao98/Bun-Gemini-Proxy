// eslint-disable-next-line no-unused-vars
import { Html } from '@elysiajs/html';
import { BaseLayout } from './BaseLayout';
import prettyMs from 'pretty-ms';

export function MainPage() {
  return (
    <BaseLayout>
      System Status: Active | Uptime: {prettyMs(process.uptime() * 1000)}
    </BaseLayout>
  );
}
