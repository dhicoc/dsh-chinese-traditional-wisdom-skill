import { readFile } from 'node:fs/promises';
import { stdin, stderr, stdout } from 'node:process';
import { runLocalTool } from '../src/legacy/directRunner.ts';
import { LocalToolError, localToolErrorPayload } from '../src/legacy/localToolErrors.ts';

async function readInput(path?: string, tool?: string): Promise<unknown> {
  let text: string;
  try {
    text = path && path !== '-'
      ? await readFile(path, 'utf8')
      : await new Promise<string>((resolve, reject) => {
        let data = '';
        stdin.setEncoding('utf8');
        stdin.on('data', (chunk) => { data += chunk; });
        stdin.on('end', () => resolve(data));
        stdin.on('error', reject);
      });
  } catch (error) {
    throw new LocalToolError('INPUT_READ_FAILURE', error instanceof Error ? error.message : String(error), tool);
  }

  if (!text.trim()) {
    throw new LocalToolError('INVALID_JSON', '需要 JSON 输入文件，或通过 stdin 提供 JSON。', tool);
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new LocalToolError('INVALID_JSON', error instanceof Error ? error.message : String(error), tool);
  }
}

async function main() {
  const [tool, inputFile] = process.argv.slice(2);
  if (!tool) throw new LocalToolError('INVALID_INPUT', '用法：pnpm engine <tool> <input-json-file>（或将 JSON 传入 stdin）。');
  const result = await runLocalTool(tool, await readInput(inputFile, tool));
  stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((error: unknown) => {
  stderr.write(`${JSON.stringify(localToolErrorPayload(error))}\n`);
  process.exitCode = 1;
});
