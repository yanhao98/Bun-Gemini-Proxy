// https://elysiajs.com/patterns/trace#trace-1

import Elysia from 'elysia';

export const trace = new Elysia({ name: '@h/traceHandler' }).trace(
  async ({
    id,
    onRequest,
    onParse,
    onTransform,
    onBeforeHandle,
    onHandle,
    onAfterHandle,
    onMapResponse,
    onError,
    onAfterResponse,
  }) => {
    console.debug(`[🕵️‍♂️ 0️⃣ ] [id: ${id}]`.padEnd(80, '-'));

    onRequest(({ begin, onStop }) => {
      onStop(({ end }) => {
        console.debug(
          `[🕵️‍♂️ 1️⃣ ] [${'onRequest'.padStart(15)}] 耗时: ${end - begin}ms`,
        );
      });
    });

    onParse(({ begin, onStop }) => {
      onStop(({ end }) => {
        console.debug(
          `[🕵️‍♂️ 2️⃣ ] [${'onParse'.padStart(15)}] 耗时: ${end - begin}ms`,
        );
      });
    });

    onTransform(({ begin, onStop }) => {
      onStop(({ end }) => {
        console.debug(
          `[🕵️‍♂️ 3️⃣ ] [${'onTransform'.padStart(15)}] 耗时: ${end - begin}ms`,
        );
      });
    });

    onBeforeHandle(({ onStop }) => {
      onStop(({ elapsed }) => {
        console.debug(
          `[🕵️‍♂️ 4️⃣ ] [${'onBeforeHandle'.padStart(15)}] 耗时: ${elapsed}ms`,
        );
      });
    });

    onHandle(({ begin, onStop }) => {
      onStop(({ end }) => {
        console.debug(
          `[🕵️‍♂️ 5️⃣ ] [${'onHandle'.padStart(15)}] 耗时: ${end - begin}ms`,
        );
      });
    });

    onAfterHandle(({ begin, onStop }) => {
      onStop(({ end }) => {
        console.debug(
          `[🕵️‍♂️ 6️⃣ ] [${'onAfterHandle'.padStart(15)}] 耗时: ${end - begin}ms`,
        );
      });
    });

    onError(({ begin, onStop }) => {
      onStop(({ end }) => {
        console.debug(
          `[🕵️‍♂️ 8️⃣ ] [${'onError'.padStart(15)}] 耗时: ${end - begin}ms`,
        );
      });
    });

    onMapResponse(({ begin, onStop }) => {
      onStop(({ end }) => {
        console.debug(
          `[🕵️‍♂️ 7️⃣ ] [${'onMapResponse'.padStart(15)}] 耗时: ${end - begin}ms`,
        );
      });
    });

    onAfterResponse(({ begin, onStop }) => {
      onStop(({ end }) => {
        console.debug(
          `[🕵️‍♂️ 9️⃣ ] [${'onAfterResponse'.padStart(15)}] 耗时: ${end - begin}ms`,
        );
      });
    });
  },
);
