// prevents TS errors
// declare var globalThis: Worker;

globalThis.onmessage = (event: MessageEvent) => {
  console.log(`[isMainThread: ${Bun.isMainThread}]`, event.data);
  postMessage('world');
};
