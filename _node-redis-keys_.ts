import { keyManager } from './src/config/keys';

// await Bun.sleep(1000);
await keyManager.ready;

const xGoogApiKey = keyManager.getNextApiKey();
console.log(`[👤] 分配的API密钥: ${xGoogApiKey}`);
