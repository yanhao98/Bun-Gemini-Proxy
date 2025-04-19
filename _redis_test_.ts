const redisClient = new Bun.RedisClient('redis://localhost:6379');
// redisClient.onconnect = () => {
//   console.debug(
//     `[${process.uptime().toFixed(3)} s]`,
//     '[redisClient] connected',
//   );
// };
// Bun.redis.onconnect = () => {
//   console.debug(`[${process.uptime().toFixed(3)} s]`, '[Bun.redis] connected');
// };
let canCloseFlag = false;
redisClient.onclose = () => {
  console.debug(
    `❌ [${process.uptime().toFixed(3)} s]`,
    '[redisClient] closed',
  );
};
Bun.redis.onclose = () => {
  console.debug(`❌ [${process.uptime().toFixed(3)} s]`, '[Bun.redis] closed');
};

await redisClient.connect();
await Bun.redis.connect();

function intervalCallback(clienttt: Bun.RedisClient, name: string) {
  console.debug(
    `[${process.uptime().toFixed(3)} s]`,
    `${name}.connected :>> `,
    clienttt.connected,
  );
  if (!clienttt.connected) {
    if (!canCloseFlag) clienttt.close();
    canCloseFlag = true;

    clienttt
      .connect()
      .then(() => {
        console.debug(`重连 ${name} 成功`);
      })
      .catch((err) => {
        console.debug(`重连 ${name} 失败`, err);
      });
    // setTimeout(() => {
    //   process.exit(1);
    // }, 1000 * 10);
  }
}

setInterval(intervalCallback, 1000, redisClient, '1️⃣  redisClient');
setInterval(intervalCallback, 1000, Bun.redis, '2️⃣    Bun.redis');

export {};
