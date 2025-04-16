// src/utils/stream.ts
import type { Context } from 'elysia';

// 定义一个简单的流管理器
class StreamManager {
  private clients: Set<Context & { send: (chunk: string) => void }> = new Set();

  // 添加客户端连接
  addClient(ctx: Context & { send: (chunk: string) => void }) {
    this.clients.add(ctx);
    console.log(`[Stream] 客户端已连接，当前连接数: ${this.clients.size}`);

    // 当客户端断开连接时移除
    ctx.request.signal.addEventListener('abort', () => {
      this.removeClient(ctx);
    });
  }

  // 移除客户端连接
  removeClient(ctx: Context & { send: (chunk: string) => void }) {
    if (this.clients.has(ctx)) {
      this.clients.delete(ctx);
      console.log(`[Stream] 客户端已断开，当前连接数: ${this.clients.size}`);
    }
  }

  // 向所有客户端广播数据
  broadcast(data: unknown) {
    if (this.clients.size === 0) {
      return; // 没有客户端连接，直接返回
    }
    const message = `data: ${JSON.stringify(data)}\n\n`;
    // 创建一个副本进行迭代，防止在迭代过程中修改集合导致问题
    const clientsCopy = new Set(this.clients);
    clientsCopy.forEach((client) => {
      // 再次检查客户端是否仍在集合中，以处理并发移除的情况
      if (this.clients.has(client)) {
        try {
          // 检查连接是否仍然有效
          if (!client.request.signal.aborted) {
            client.send(message);
          } else {
            // 如果连接已中止，则移除
            this.removeClient(client);
          }
        } catch (error) {
          console.error('[Stream] 发送消息失败:', error);
          // 发送失败也尝试移除客户端
          this.removeClient(client);
        }
      }
    });
  }

  // 获取当前连接数
  getConnectionCount(): number {
    return this.clients.size;
  }
}

// 创建并导出单例
export const perfStreamManager = new StreamManager();

// 创建 SSE 流处理函数
export const createPerfStream = (ctx: Context) => {
  ctx.set.headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    // 'Transfer-Encoding': 'chunked', // SSE 通常不需要这个
  };
  ctx.set.status = 200;

  // 创建一个可写流
  const stream = new ReadableStream({
    start(controller) {
      // 定义发送函数
      const send = (chunk: string) => {
        try {
          // 检查控制器是否仍然可用
          // desiredSize 为 null 表示流未关闭且缓冲区未满
          if (controller.desiredSize === null || controller.desiredSize > 0) {
             controller.enqueue(chunk);
          } else {
             console.warn('[Stream] Controller buffer full or closed, cannot enqueue.');
             // 如果缓冲区满或关闭，可能需要移除客户端或采取其他措施
             cleanup();
          }
        } catch (e) {
          // 如果无法入队（例如流已关闭），则尝试移除客户端
          console.error('[Stream] Enqueue failed:', e);
          cleanup();
        }
      };

      // 定义清理函数
      const cleanup = () => {
        perfStreamManager.removeClient(clientContext);
        try {
          // 检查控制器是否已经关闭
          if (controller.desiredSize !== null) {
             controller.close(); // 尝试关闭控制器
          }
        } catch (closeError) {
          // 忽略关闭错误
          // console.error('[Stream] Error closing controller:', closeError);
        }
      };

      // 创建包含发送函数的客户端上下文
      const clientContext = {
        ...ctx,
        send,
      };

      // 将上下文添加到管理器中，以便广播
      perfStreamManager.addClient(clientContext);

      // 发送初始连接确认消息（可选）
      send(': 连接成功\n\n');

      // 监听请求中止信号
      ctx.request.signal.addEventListener('abort', cleanup);

    },
    cancel(reason) {
      // 当流被取消时（例如客户端断开连接），从管理器中移除
      // 注意：这里的 ctx 是原始的 Context，需要找到对应的 clientContext 来移除
      // 但由于我们在 start 中已经通过 abort 事件处理了移除，这里可能不需要重复操作
      // 如果需要更精确的查找，可能需要给 clientContext 添加唯一标识符
      console.log('[Stream] Stream cancelled:', reason);
      // 查找并移除对应的客户端
      for (const client of perfStreamManager['clients']) {
         if (client.request === ctx.request) {
           perfStreamManager.removeClient(client);
           break;
         }
      }
    },
  });

  return stream;
};