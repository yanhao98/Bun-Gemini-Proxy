export {};

// https://gist.github.com/kaitk/fa1e10e4af615b99bc1edd65e8ad7402

// const encoder = new TextEncoder();

// .use((await import('elysia-compress')).compression({}))
/* .use(
    (await import('@labzzhq/compressor')).compression({
      compress_stream: false,
    }),
  ) */

// https://elysiajs.com/essential/life-cycle.html#example-5
// .mapResponse(async ({ response, set }) => {
//   let text: string;
//   let isJson: boolean;

//   if (response instanceof Response) {
//     text = await response.text();
//     isJson =
//       response.headers.get('Content-Type')?.includes('application/json') ??
//       false;
//   } else {
//     isJson = typeof response === 'object';
//     text = isJson ? JSON.stringify(response) : (response?.toString() ?? '');
//   }
//   if (text === '{}') {
//     return;
//   }

//   if (text) {
//     set.headers['Content-Encoding'] = 'gzip';

//     return new Response(Bun.gzipSync(encoder.encode(text)), {
//       headers: {
//         'Content-Type': `${
//           isJson ? 'application/json' : 'text/plain'
//         }; charset=utf-8`,
//       },
//     });
//   }
// })
