/**
 * browserTestRunner — 页内浏览器测试占位
 *
 * 领域规则改由 Vitest 单测（apps/visual/src/__tests__）覆盖。
 * 此模块保留 API，避免 TestRunnerConsole 崩溃；内联套件列表为空。
 */

export interface BrowserTestResult {
  id: string;
  name: string;
  passed: number;
  failed: number;
  details: string[];
  durationMs: number;
  error?: string;
}

export interface BrowserTestSpec {
  id: string;
  name: string;
  source: string;
  globalName: string;
  requires: string[];
}

/** 已无 visual/ 旧测试脚本依赖；请运行 pnpm test:unit */
export const BROWSER_TEST_SPECS: BrowserTestSpec[] = [];

export function runBrowserTest(spec: BrowserTestSpec): BrowserTestResult {
  return {
    id: spec.id,
    name: spec.name,
    passed: 0,
    failed: 0,
    details: [],
    durationMs: 0,
    error: '旧 visual/ 浏览器测试已移除。请使用 pnpm test:unit（Vitest）。',
  };
}

export async function runAllBrowserTests(
  onEach?: (result: BrowserTestResult) => void,
): Promise<BrowserTestResult[]> {
  const results = BROWSER_TEST_SPECS.map((spec) => runBrowserTest(spec));
  results.forEach((r) => onEach?.(r));
  if (results.length === 0) {
    const empty: BrowserTestResult = {
      id: 'no-browser-specs',
      name: '无页内浏览器套件',
      passed: 0,
      failed: 0,
      details: ['已迁移至 Vitest：cd apps/visual && pnpm test:unit'],
      durationMs: 0,
    };
    onEach?.(empty);
    return [empty];
  }
  return results;
}
