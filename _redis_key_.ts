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
