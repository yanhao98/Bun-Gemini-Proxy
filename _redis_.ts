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

{
  console.debug('=====================');
  const redisKey = 'test:keyUsageCount';
  const hmsetResult = await client.hmset(redisKey, ['key1', '1', 'key2', '0']);
  console.debug(`hmsetResult :>> `, hmsetResult);

  const hmgetResult = await client.hmget(redisKey, ['key1', 'key2', 'key3']);
  console.debug(`hmgetResult :>> `, hmgetResult);

  const hmsetResult2 = await client.hmset(redisKey, ['key1', '2']);
  console.debug(`hmsetResult2 :>> `, hmsetResult2);

  const hmgetResult2 = await client.hmget(redisKey, ['key1', 'key2']);
  console.debug(`hmgetResult2 :>> `, hmgetResult2);
  // ---
  // hmsetResult :>>  OK
  // hmgetResult :>>  [ "1", "0", null ]
  // hmsetResult2 :>>  OK
  // hmgetResult2 :>>  [ "2", "0" ]
}
