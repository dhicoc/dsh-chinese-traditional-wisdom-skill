import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NESTED_WHITELIST_CASES, SUCCESS_TOOL_FIXTURES } from './localToolMatrix';

const require = createRequire(import.meta.url);
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tsxCli = require.resolve('tsx/cli');
const fixture = (name: string) => path.join(appRoot, 'src/__fixtures__/local-tools', name);

type CliResult = {
  code: number | null;
  stdout: string;
  stderr: string;
};

function runEngine(args: string[], input?: string): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, 'scripts/run-engine.ts', ...args], {
      cwd: appRoot,
      stdio: 'pipe',
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(input);
  });
}

describe('run-engine CLI', () => {
  it('returns a JSON envelope from an input file', async () => {
    const result = await runEngine(['list_constitution_questionnaire', fixture('list_constitution_questionnaire.success.json')]);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      tool: 'list_constitution_questionnaire',
      data: { groups: expect.any(Array) },
    });
  });

  it('accepts JSON from stdin', async () => {
    const result = await runEngine(['list_constitution_questionnaire', '-'], '{}');

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      tool: 'list_constitution_questionnaire',
    });
  });

  it('executes the fixed true solar time fixture matrix', async () => {
    const matrix = [
      {
        tool: 'resolve_true_solar_time',
        name: 'resolve_true_solar_time.success.json',
        expected: { trueSolarBirth: { hour: 11, minute: 4 } },
      },
      {
        tool: 'resolve_true_solar_time',
        name: 'resolve_true_solar_time.cross-date.success.json',
        expected: {
          crossedDate: true,
          trueSolarBirth: { year: 1990, month: 6, day: 14, hour: 12, minute: 10 },
        },
      },
      {
        tool: 'resolve_true_solar_time',
        name: 'resolve_true_solar_time.shichen-zi-chu.success.json',
        expected: {
          crossedShichen: true,
          crossedZiChu: true,
          trueSolarBirth: { hour: 23, minute: 5 },
        },
      },
      {
        tool: 'bazi_calculate',
        name: 'bazi_calculate.civil-fallback.success.json',
        expected: {
          ok: true,
          data: { timeSource: { timeBasis: 'civil-unverified', notice: '未完成真太阳时复核' } },
        },
      },
    ];

    for (const { tool, name, expected } of matrix) {
      const result = await runEngine([tool, fixture(name)]);

      expect(result.code).toBe(0);
      expect(result.stderr).toBe('');
      expect(JSON.parse(result.stdout)).toMatchObject(expected);
    }
  }, 15_000);

  it('preserves a business boundary envelope as a successful CLI result', async () => {
    const result = await runEngine(['assess_constitution', fixture('assess_constitution.boundary.json')]);

    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: false,
      error: { code: 'NO_ANSWERS' },
    });
  });

  it('returns a stable JSON error for a contract failure', async () => {
    const result = await runEngine(['calc_chenguz', fixture('calc_chenguz.failure.json')]);

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        tool: 'calc_chenguz',
        message: 'version 必须是 standard、folk 或 full。',
      },
    });
  });

  it('returns a stable JSON error for invalid JSON', async () => {
    const result = await runEngine(['list_constitution_questionnaire', '-'], '{');

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_JSON', tool: 'list_constitution_questionnaire' },
    });
  });

  it('returns a stable JSON error for an unknown tool', async () => {
    const result = await runEngine(['not_a_tool', '-'], '{}');

    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      error: {
        code: 'UNKNOWN_TOOL',
        tool: 'not_a_tool',
        message: '未知本地工具：not_a_tool',
      },
    });
  });

  it('does not serialize nested sentinel fields from CLI stdin', async () => {
    for (const { tool, inject } of NESTED_WHITELIST_CASES) {
      const sentinel = `p6-cli-sentinel-${tool}`;
      const fixtureCase = SUCCESS_TOOL_FIXTURES.find((candidate) => candidate.tool === tool);
      if (!fixtureCase) throw new Error(`${tool} 缺少成功 fixture。`);
      const input = JSON.parse(await readFile(fixture(fixtureCase.name), 'utf8')) as Record<string, unknown>;
      inject(input, sentinel);
      const result = await runEngine([tool, '-'], JSON.stringify(input));

      expect(result.code).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).not.toContain(sentinel);
    }
  }, 60_000);

  it('does not serialize top-level sentinel fields from every CLI tool', async () => {
    for (const { tool, name } of SUCCESS_TOOL_FIXTURES) {
      const sentinel = `p5-cli-sentinel-${tool}`;
      const input = {
        ...JSON.parse(await readFile(fixture(name), 'utf8')) as Record<string, unknown>,
        unexpected: sentinel,
      };
      const result = await runEngine([tool, '-'], JSON.stringify(input));

      expect(result.code).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).not.toContain(sentinel);
    }
  }, 60_000);
});
