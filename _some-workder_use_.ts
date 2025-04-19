// https://bun.sh/docs/api/workers
const worker = new Worker('./_some-workder_.ts', {
  smol: true,
});

worker.addEventListener('open', () => {
  console.log(`[isMainThread: ${Bun.isMainThread}]`, 'worker is ready');
});
worker.postMessage('hello');
worker.onmessage = (event) => {
  console.log(`[isMainThread: ${Bun.isMainThread}]`, event.data);
};

// worker.unref();

setTimeout(() => {
  process.exit(0);
}, 1000);
