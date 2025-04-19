import { keyManager } from './src/config/keys';

await keyManager.ready;

console.debug(
  `keyManager.getKeyUsageStats() :>> `,
  keyManager.getKeyUsageStats(),
);

console.debug(`keyManager.getNextApiKey() :>> `, keyManager.getNextApiKey());

console.debug(
  `keyManager.getKeyUsageStats() :>> `,
  keyManager.getKeyUsageStats(),
);

setInterval(() => {
  console.debug(
    performance.now(),
    `Bun.redis.connected :>> `,
    Bun.redis.connected,
  );
  if (!Bun.redis.connected) {
    process.exit(1);
  }
}, 1000);
