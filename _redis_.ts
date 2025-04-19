import { RedisClient } from 'bun';

{
  const client = new RedisClient(Bun.env.REDIS_URL);
  client.onconnect = function (this) {
    console.debug(`this :>> `, typeof this);
  };
  // client.onclose = function (this) {
  //   console.debug(`this :>> `, typeof this);
  // };
  client.onclose = (error) => {
    console.debug(`RedisClient.onclose :>> `, error.message);
  };

  await client.connect();
  await Bun.sleep(1);

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

  client.close();
}
