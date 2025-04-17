export function toIIFEString(fn: Function): string {
  if (typeof fn !== 'function') {
    console.warn('toIIFEString 预期接收一个函数，但收到了:', fn);
    return ''; // 返回空字符串或抛出错误
  }
  return `(${fn.toString()})()`;
}
