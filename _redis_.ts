import { redis, RedisClient } from 'bun';

// Creating a custom client
const client = new RedisClient(Bun.env.REDIS_URL);

// Explicitly connect
await client.connect();

await client.set('counter', '0');

await client.incr('counter');

await client.expire('counter', 10);

const result = await client.get('counter');
console.debug(`result :>> `, result);

// Explicitly close the connection when done
// client.close();

// --- hmget 的使用好像有问题。
{
  const key = 'hmset:test';
  const hmsetResult = await redis.hmset(key, [
    'name',
    'Alice',
    'age',
    '30',
    'active',
    'true',
  ]);
  console.debug(`hmsetResult :>> `, hmsetResult);

  const hmgetResult = await redis.hmget(key, ['name', 'age']);
  console.debug(`hmgetResult :>> `, hmgetResult);

  const mixedResult = await client.hmget(key, ['name', 'nonexistent']);
  console.debug(`mixedResult :>> `, mixedResult);
}
