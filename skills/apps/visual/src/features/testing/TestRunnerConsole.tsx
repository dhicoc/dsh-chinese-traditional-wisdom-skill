import { useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { BROWSER_TEST_SPECS, runAllBrowserTests, type BrowserTestResult } from '@/legacy/browserTestRunner';
import { getLegacyCapabilities, getLegacyTools } from '@/legacy/toolRegistry';
import {
  TEST_SUITES,
  getTotalExpectedCount,
  getTestSuitesByType,
  type TestSuite,
  type TestSuiteType,
} from '@/legacy/testRegistry';

/* ── 环境诊断 ─────────────────────────────────────────── */

interface EnvInfo {
  browser: string;
  protocol: string;
  legacyMode: string;
  toolCount: number;
  capabilityCount: number;
}

function detectBrowser(ua: string): string {
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/')) return 'Safari';
  return ua.slice(0, 40);
}

function collectEnvInfo(): EnvInfo {
  const tools = getLegacyTools();
  const capabilities = getLegacyCapabilities();
  return {
    browser: detectBrowser(navigator.userAgent),
    protocol: window.location.protocol,
    legacyMode: 'pure-ts',
    toolCount: tools.length,
    capabilityCount: Object.keys(capabilities).length,
  };
}

/* ── 类型标签 ─────────────────────────────────────────── */

const TYPE_META: Record<TestSuiteType, { label: string; color: string; border: string }> = {
  node: { label: 'Node CLI', color: 'var(--chart-text-faint)', border: 'var(--chart-text-faint)' },
  browser: { label: 'Browser', color: 'var(--wz-water)', border: 'rgb(var(--water) / 0.2)' },
  verify: { label: 'Verify', color: 'var(--wz-earth)', border: 'rgb(var(--earth) / 0.2)' },
};

/* ── 测试套件卡片 ─────────────────────────────────────── */

function SuiteCard({ suite }: { suite: TestSuite }) {
  const meta = TYPE_META[suite.type];

  return (
    <article className="flex min-h-40 flex-col rounded-card border border-white/8 bg-white/[0.035] p-4 transition hover:border-white/16">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-jade-100">{suite.name}</p>
          <p className="mt-1.5 text-xs leading-5 text-jade-100/55">{suite.description}</p>
        </div>
        <span
          className="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold"
          style={{ borderColor: meta.border, color: meta.color }}
        >
          {meta.label}
        </span>
      </div>

      {/* 覆盖范围 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {suite.covers.map((item) => (
          <span key={item} className="rounded-full bg-black/24 px-2 py-0.5 text-[10px] text-jade-100/45">
            {item}
          </span>
        ))}
      </div>

      {/* 预期数量 */}
      {suite.expectedCount > 0 && (
        <p className="mt-3 text-xs text-jade-100/45">
          预期 <span className="font-mono text-jade-100/70">{suite.expectedCount}</span> 项
        </p>
      )}

      {/* 操作入口 */}
      <div className="mt-auto border-t border-white/8 pt-3">
        {suite.type === 'node' && suite.cliCommand && (
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-card border border-white/8 bg-black/30 px-3 py-1.5 text-xs text-jade-500">
              {suite.cliCommand}
            </code>
            <CopyContextButton
              label="复制命令"
              title={`${suite.name} CLI 命令`}
              payload={{ command: suite.cliCommand }}
            />
          </div>
        )}
        {suite.type === 'browser' && suite.url && (
          <a
            href={suite.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1.5 text-xs font-semibold text-jade-500 transition hover:bg-jade-500/20"
          >
            打开 test-runner →
          </a>
        )}
        {suite.type === 'verify' && (
          <div className="flex items-center gap-2">
            <a
              href={suite.url}
              className="inline-flex items-center gap-1.5 rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1.5 text-xs font-semibold text-jade-500 transition hover:bg-jade-500/20"
            >
              打开 verify.html →
            </a>
            <span className="text-[10px] text-jade-100/45">需先 npm run build</span>
          </div>
        )}
      </div>
    </article>
  );
}

/* ── 主组件 ───────────────────────────────────────────── */

export function TestRunnerConsole() {
  const legacyReady = true;
  // 页内浏览器套件已空（迁至 Vitest）；按钮仍可跑占位提示
  const [inlineRunning, setInlineRunning] = useState(false);
  const [inlineResults, setInlineResults] = useState<BrowserTestResult[]>([]);

  const handleRunInlineTests = () => {
    if (inlineRunning) return;
    setInlineRunning(true);
    setInlineResults([]);
    runAllBrowserTests((r) => {
      setInlineResults((prev) => [...prev, r]);
    }).then((all) => {
      setInlineResults(all);
      setInlineRunning(false);
    });
  };

  const inlineTotalPassed = inlineResults.reduce((s, r) => s + r.passed, 0);
  const inlineTotalFailed = inlineResults.reduce((s, r) => s + r.failed, 0);
  const inlineHasErrors = inlineResults.some((r) => r.error);

  const env = useMemo(() => collectEnvInfo(), []);

  const nodeSuites = getTestSuitesByType('node');
  const browserSuites = getTestSuitesByType('browser');
  const verifySuites = getTestSuitesByType('verify');
  const totalExpected = getTotalExpectedCount();

  const contextPayload = useMemo(
    () => ({
      module: 'testing',
      mode: 'test-runner-console',
      environment: env,
      suiteCount: TEST_SUITES.length,
      totalExpected,
      suites: TEST_SUITES.map((s) => ({ id: s.id, name: s.name, type: s.type, expectedCount: s.expectedCount })),
    }),
    [env, totalExpected],
  );

  return (
    <section className="space-y-4">
      {/* 标题区 */}
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">测试控制台</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              汇总所有测试入口：Node CLI 结构测试、浏览器端引擎测试、自动验证页。Phase 9 第二版——支持在页内运行浏览器端测试并展示 rolling logs 与失败详情。
            </p>
          </div>
          <CopyContextButton commandScope="testing" title="测试控制台上下文" payload={contextPayload} />
        </div>
      </div>

      {/* 摘要仪表盘 */}
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-card border border-white/8 bg-white/[0.04] p-4">
          <p className="font-mono text-3xl font-semibold text-jade-500">{TEST_SUITES.length}</p>
          <p className="mt-1 text-sm text-jade-100/55">测试套件</p>
        </div>
        <div className="rounded-card border border-white/8 bg-white/[0.04] p-4">
          <p className="font-mono text-3xl font-semibold text-jade-100">{totalExpected}</p>
          <p className="mt-1 text-sm text-jade-100/55">预期测试项</p>
        </div>
        <div className="rounded-card border border-white/8 bg-white/[0.04] p-4">
          <p className="font-mono text-3xl font-semibold text-jade-100">{env.toolCount}</p>
          <p className="mt-1 text-sm text-jade-100/55">已注册工具</p>
        </div>
        <div className="rounded-card border border-white/8 bg-white/[0.04] p-4">
          <p className="font-mono text-3xl font-semibold text-jade-100">{env.capabilityCount}</p>
          <p className="mt-1 text-sm text-jade-100/55">能力注册项</p>
        </div>
      </div>

      {/* 环境诊断 */}
      <div className="rounded-panel border border-ink-700 bg-black/24 p-4">
        <h3 className="font-serif text-lg font-semibold text-jade-100">环境诊断</h3>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-card border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs text-jade-100/45">浏览器</p>
            <p className="mt-1 text-jade-100/80">{env.browser}</p>
          </div>
          <div className="rounded-card border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs text-jade-100/45">页面协议</p>
            <p className="mt-1 font-mono text-jade-100/80">{env.protocol}</p>
          </div>
          <div className="rounded-card border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs text-jade-100/45">Legacy 引擎</p>
            <p className="mt-1">
              <span
                className={`font-mono ${env.legacyMode === 'ready' ? 'text-jade-500' : env.legacyMode === 'error' ? 'text-cinnabar-500' : 'text-jade-100/55'}`}
              >
                {env.legacyMode}
              </span>
            </p>
          </div>
          <div className="rounded-card border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs text-jade-100/45">截图建议</p>
            <p className="mt-1 text-xs leading-5 text-jade-100/55">失败时截取本页和环境信息，保留首个失败详情。</p>
          </div>
          <div className="rounded-card border border-white/8 bg-white/[0.03] p-3">
            <p className="text-xs text-jade-100/45">测试分类</p>
            <p className="mt-1 text-xs leading-5 text-jade-100/55">Node 测试在终端运行；浏览器测试在 test-runner.html 运行。</p>
          </div>
        </div>
      </div>

      {/* Node CLI 测试 */}
      <div className="rounded-panel border border-ink-700 bg-ink-850/72 p-4">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/8 pb-3">
          <h3 className="font-serif text-xl font-semibold text-jade-100">Node CLI 测试</h3>
          <span className="text-xs text-jade-100/45">{nodeSuites.length} 个套件</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {nodeSuites.map((suite) => (
            <SuiteCard key={suite.id} suite={suite} />
          ))}
        </div>
      </div>

      {/* 浏览器端测试 */}
      <div className="rounded-panel border border-ink-700 bg-ink-850/72 p-4">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/8 pb-3">
          <h3 className="font-serif text-xl font-semibold text-jade-100">浏览器端测试</h3>
          <span className="text-xs text-jade-100/45">{browserSuites.length} 个套件 · 跳转旧 test-runner.html</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {browserSuites.map((suite) => (
            <SuiteCard key={suite.id} suite={suite} />
          ))}
        </div>
        <div className="mt-4 rounded-card border border-jade-500/20 bg-jade-500/8 p-3">
          <p className="text-xs leading-5 text-jade-100/55">
            浏览器测试入口为旧 <code className="text-jade-500">visual/test-runner.html</code>，在独立页面加载旧引擎后依次运行八字、五运六气、数据桥接、质量基线、全局同步和可视化渲染测试。
            点击任意套件的"打开 test-runner"将在新标签页中运行全部浏览器测试。
          </p>
        </div>

        {/* Phase 9 第二版：页内运行浏览器测试 */}
        <div className="mt-4 rounded-card border border-jade-500/25 bg-ink-950/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-jade-100">页内运行（Phase 9 v2）</h4>
              <p className="mt-0.5 text-xs text-jade-100/45">
                在本页直接加载测试脚本运行，无需跳转。当前支持 {BROWSER_TEST_SPECS.length} 个套件。
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunInlineTests}
              disabled={inlineRunning || !legacyReady}
              className="rounded-card border border-jade-500/40 bg-jade-500/15 px-4 py-2 text-sm font-medium text-jade-300 transition hover:bg-jade-500/25 disabled:opacity-40"
            >
              {inlineRunning ? '运行中…' : '运行页内测试'}
            </button>
          </div>

          {!legacyReady && (
            <p className="text-xs text-jade-100/45">等待 legacy 引擎加载完成后可运行。</p>
          )}

          {inlineResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-jade-400">✓ 通过 {inlineTotalPassed}</span>
                <span className={inlineTotalFailed > 0 ? 'text-cinnabar-400' : 'text-jade-100/55'}>
                  ✗ 失败 {inlineTotalFailed}
                </span>
                {inlineHasErrors && <span className="text-gold-400">⚠ 有运行错误</span>}
              </div>
              {inlineResults.map((r) => (
                <div key={r.id} className="rounded-card border border-white/8 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-jade-100/80">{r.name}</span>
                    <span className="font-mono text-xs text-jade-100/55">
                      {r.error ? '错误' : `${r.passed} 通过 / ${r.failed} 失败`} · {r.durationMs}ms
                    </span>
                  </div>
                  {r.error && (
                    <p className="mt-2 text-xs text-gold-400">运行错误：{r.error}</p>
                  )}
                  {!r.error && r.details.length > 0 && (
                    <ul className="mt-2 max-h-40 space-y-0.5 overflow-auto text-[11px] leading-5">
                      {r.details.map((d, i) => (
                        <li
                          key={i}
                          className={d.startsWith('❌') ? 'text-cinnabar-400' : 'text-jade-100/55'}
                        >
                          {d}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 自动验证页 */}
      <div className="rounded-panel border border-ink-700 bg-ink-850/72 p-4">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/8 pb-3">
          <h3 className="font-serif text-xl font-semibold text-jade-100">自动验证页</h3>
          <span className="text-xs text-jade-100/45">{verifySuites.length} 个套件</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {verifySuites.map((suite) => (
            <SuiteCard key={suite.id} suite={suite} />
          ))}
        </div>
        <div className="mt-4 rounded-card border border-jade-500/20 bg-jade-500/8 p-3">
          <p className="text-xs leading-5 text-jade-100/55">
            <code className="text-jade-500">dist/verify.html</code> 由 <code className="text-jade-500">generate-verify-page.mjs</code> 在构建时自动生成。
            它通过 iframe 逐个访问每个 hash 路由，检查 h2 标题、canvas 数量和 canvas 非空像素，适用于 React Shell 的人工+自动回归。
          </p>
        </div>
      </div>
    </section>
  );
}
