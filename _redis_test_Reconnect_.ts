import { $ } from 'bun';
import Redis from 'ioredis';

console.debug(`Bun.version :>> `, Bun.version);
console.debug();

async function startRedis() {
  await $`docker rm -f my-redis || true`.quiet();
  await $`docker run -d --name my-redis -p 6379:6379 redis`.quiet();
  // await Bun.sleep(100);
  console.debug('Redis server started');
  await $`docker logs my-redis -n 3`;
}

async function restartRedis() {
  await $`docker restart my-redis`.quiet();
  console.debug('Redis server restarted');
  await $`docker logs my-redis -n 3`;
}

async function testIoRedis() {
  console.debug('>>> ioredis test', ''.padEnd(50, '-'));
  await startRedis();
  // 创建 Redis 客户端
  const redis = new Redis({
    host: 'localhost', // Redis 服务器地址
    port: 6379, // 默认端口
  });
  // redis.on('error', (err) => {
  //   console.error('Redis error:', err.message);
  // });
  const valueBeforeStart = await redis.get('key-ioredis');
  console.log('Redis value before start:', valueBeforeStart);

  // 写入数据
  await redis.set('key-ioredis', 'value');
  // 读取数据
  const value = await redis.get('key-ioredis');
  console.log('Redis value After set:', value);
  await restartRedis();

  // 读取数据
  const valueAfterRestart = await redis.get('key-ioredis');
  console.log('Redis value after restart server:', valueAfterRestart);
  // 关闭 Redis 客户端
  await redis.quit();
  console.debug('<<< ioredis test');
}

async function testBunRedis() {
  console.debug('>>> Bun.Redis test', ''.padEnd(50, '-'));
  await startRedis();
  // 创建 Redis 客户端
  const client = new Bun.RedisClient('redis://localhost:6379');
  client.onclose = () => {
    console.debug(
      `❌ [${process.uptime().toFixed(3)} s]`,
      '[Bun.redis] closed',
    );
  };
  client.onconnect = () => {
    console.debug(
      `✅ [${process.uptime().toFixed(3)} s]`,
      '[Bun.redis] connected',
    );
  };
  await client.connect();
  client.onclose = () => {
    console.debug(
      `❌ [${process.uptime().toFixed(3)} s]`,
      '[Bun.redis] closed',
    );
  };

  const valueBeforeStart = await client.get('key-Bun.Redis');
  console.log('Redis value before start:', valueBeforeStart);

  // 写入数据
  await client.set('key-Bun.Redis', 'value');
  // 读取数据
  const value = await client.get('key-Bun.Redis');
  console.log('Redis value After set:', value);
  await restartRedis();

  // 读取数据
  const valueAfterRestart = await client.get('key-Bun.Redis');
  console.log('Redis value after restart:', valueAfterRestart);

  console.debug('<<< Bun.Redis test');
}

try {
  await testIoRedis();
  console.debug();
  await testBunRedis();
} catch (e) {
  console.error('Error:', (e as Error).message);
} finally {
  console.debug('------');
}

await Bun.sleep(100);
const newClient = new Bun.RedisClient('redis://localhost:6379');
const newClientValue = await newClient.get('key-Bun.Redis');
console.log('Redis value after restart with new client:', newClientValue);
