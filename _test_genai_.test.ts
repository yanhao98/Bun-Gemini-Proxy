import { GoogleGenAI } from '@google/genai';
import { describe, it as ittt } from 'bun:test';

describe('GoogleGenAI', () => {
  let it = ittt;
  if ('vscode' !== process.env.TERM_PROGRAM) {
    console.info('非 vscode 环境，跳过测试');
    it = ittt.skip as typeof it;
  }

  it('generateContent', async () => {
    // for (let i = 0; i < 50; i++) {
    //   main();
    // }

    async function main() {
      const ai = new GoogleGenAI({
        apiKey: Bun.env.AUTH_KEY,
        httpOptions: {
          baseUrl: 'https://oo1dev-bun-gemini-proxy.hf.space',
        },
      });
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: 'Hello, world!',
      });
      console.log(response.text);
    }
    main();
    await Bun.sleep(1000);
  });
});
