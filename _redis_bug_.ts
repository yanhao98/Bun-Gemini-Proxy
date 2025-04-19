// https://github.com/oven-sh/bun/issues/19126
async function testBunRedis(sleep: boolean, database: number) {
  console.debug('=====================# Hash Operations');
  console.debug(`   sleep :>> `, sleep);
  console.debug(`database :>> `, database);

  const redisKey = 'test:Hash Operations';

  const client = new Bun.RedisClient(Bun.env.REDIS_URL);

  await client.connect();
  if (sleep) {
    await Bun.sleep(1);
  }

  const hmsetResult = await client.hmset(redisKey, ['key1', '1', 'key2', '0']);
  console.debug(`hmsetResult :>> `, hmsetResult);

  const exists = await client.exists(redisKey);
  console.debug(`exists :>> `, exists);

  async function hmgetttest() {
    const fields = ['key1', 'key2', 'key3'];
    const hmgetResult = await client.hmget(redisKey, fields);
    console.debug(`hmgetResult :>> `, hmgetResult);
  }

  await hmgetttest();
  await hmgetttest();
}

await testBunRedis(false, 0);
await testBunRedis(true, 0);

await testBunRedis(false, 1);
await testBunRedis(true, 1);

export {};
