/**
 * generate-verify-page.mjs — 生成 React Shell 人工/自动回归验证页 dist/verify.html
 *
 * 设计目标：
 *   1. 在页面标注每个模块的用户可读参考范围
 *   2. 内嵌浏览器端最小 verify 脚本：
 *      - 自动访问每个 hash
 *      - 检查 h2 标题
 *      - 检查 canvas 数量
 *   3. canvas 数量与标题从各 workspace 源码派生，避免与实现漂移
 *
 * 运行：node apps/visual/scripts/generate-verify-page.mjs
 * 产物：apps/visual/dist/verify.html（需通过静态服务器访问，如 npm run preview）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const appRoot = resolve(process.cwd());
const srcRoot = resolve(appRoot, 'src');
const distRoot = resolve(appRoot, 'dist');

/** 模块能力模式 → 徽章文案 + 颜色（与 src/lib/modules.ts 的 status 对齐）。 */
const MODE_BADGE = {
  'local-exact': { label: '传统历法推算', title: '按传统历法口径推算', color: '#2a9d8f' },
  'local-approx': { label: '传统方法参考', title: '按传统方法提供参考', color: '#0a9396' },
  demo: { label: '示例展示', title: '示例展示内容', color: '#e9c46a' },
  knowledge: { label: '知识参考', title: '传统文化知识参考', color: '#94a3b8' },
  derived: { label: '综合说明', title: '综合整理说明', color: '#a78bfa' },
};

/**
 * 每个模块的验证规格。
 * - workspace: 源码文件相对路径（用于派生 canvas 数与 h2 标题）
 * - titleMatch: 浏览器端用于匹配 h2 文本的子串
 * - checkPixels: 是否对 canvas 做非空像素检查（验证 renderer 确实绘制了内容）
 * - note: 额外说明
 */
const MODULE_SPECS = [
  { id: 'home', hash: '#home', mode: 'derived', workspace: 'features/home/HomeDashboard.tsx', titleMatch: '工作台', checkPixels: false, note: 'HomeDashboard 入口聚合' },
  { id: 'bazi', hash: '#bazi', mode: 'local-exact', workspace: 'features/bazi/BaziWorkspace.tsx', titleMatch: '八字命盘', checkPixels: true },
  { id: 'ziwei', hash: '#ziwei', mode: 'local-exact', workspace: 'features/ziwei/ZiweiWorkspace.tsx', titleMatch: '紫微斗数', checkPixels: true },
  { id: 'liuyao', hash: '#liuyao', mode: 'local-exact', workspace: 'features/liuyao/LiuyaoWorkspace.tsx', titleMatch: '六爻占卜', checkPixels: true },
  { id: 'meihua', hash: '#meihua', mode: 'local-approx', workspace: 'features/meihua/MeihuaWorkspace.tsx', titleMatch: '梅花易数', checkPixels: true },
  { id: 'fengshui', hash: '#fengshui', mode: 'knowledge', workspace: 'features/fengshui/FengshuiWorkspace.tsx', titleMatch: '风水罗盘', checkPixels: true },
  { id: 'feixing', hash: '#feixing', mode: 'local-approx', workspace: 'features/feixing/FeixingWorkspace.tsx', titleMatch: '流年飞星', checkPixels: true },
  { id: 'bazhai', hash: '#bazhai', mode: 'local-approx', workspace: 'features/bazhai/BazhaiWorkspace.tsx', titleMatch: '八宅大游年', checkPixels: true },
  { id: 'yunqi', hash: '#yunqi', mode: 'local-exact', workspace: 'features/yunqi/YunqiWorkspace.tsx', titleMatch: '五运六气', checkPixels: true },
  { id: 'tizhi', hash: '#tizhi', mode: 'derived', workspace: 'features/constitution/ConstitutionWorkspace.tsx', titleMatch: '体质辨识', checkPixels: true },
  { id: 'reader', hash: '#reader', mode: 'knowledge', workspace: 'features/knowledge/AncientTextSplitReader.tsx', titleMatch: '古籍阅读', checkPixels: false, note: '古籍对照阅读器，无 canvas' },
];

function readSrc(rel) {
  const full = resolve(srcRoot, rel);
  if (!existsSync(full)) return '';
  return readFileSync(full, 'utf8');
}

function countCanvas(source) {
  let count = 0;
  let idx = source.indexOf('<CanvasPanel');
  while (idx !== -1) {
    count++;
    idx = source.indexOf('<CanvasPanel', idx + 1);
  }
  return count;
}

function extractH2(source) {
  // 优先匹配 JSX 语法 <h2 className=...>（避免匹配字符串字面量中的 <h2 class=...>）
  const jsxMatch = source.match(/<h2\s+className[^>]*>([\s\S]*?)<\/h2>/);
  if (jsxMatch) return jsxMatch[1].replace(/<[^>]+>/g, '').trim();
  // 回退：匹配任意 <h2>
  const match = source.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  if (!match) return '';
  return match[1].replace(/<[^>]+>/g, '').trim();
}

// ── 从源码派生每个模块的期望值 ──────────────────────────
const modules = MODULE_SPECS.map((spec) => {
  const source = readSrc(spec.workspace);
  return {
    id: spec.id,
    hash: spec.hash,
    mode: spec.mode,
    titleMatch: spec.titleMatch,
    note: spec.note || '',
    checkPixels: spec.checkPixels,
    expectedCanvas: countCanvas(source),
    expectedTitle: extractH2(source),
    workspace: spec.workspace,
  };
});

const generatedAt = new Date().toISOString();

// ── 注入到浏览器脚本的模块数据 ──────────────────────────
const modulesJson = JSON.stringify(
  modules.map((m) => ({
    id: m.id,
    hash: m.hash,
    titleMatch: m.titleMatch,
    expectedCanvas: m.expectedCanvas,
    checkPixels: m.checkPixels,
  })),
);

function badge(mode) {
  const b = MODE_BADGE[mode] || MODE_BADGE.derived;
  return `<span class="badge" style="border-color:${b.color};color:${b.color}" title="${b.title}">${b.label}</span>`;
}

// ── 构建表格行（静态展示模式 + 期望值） ──────────────────
const rows = modules
  .map(
    (m) => `<tr data-module="${m.id}">
  <td><code>${m.hash}</code></td>
  <td>${m.id}</td>
  <td>${badge(m.mode)}</td>
  <td class="num">${m.expectedCanvas}</td>
  <td class="title">${m.expectedTitle || '<span class="muted">（未解析到 h2）</span>'}</td>
  <td class="status-cell" data-status="pending"><span class="dot pending"></span><span class="status-text">待运行</span></td>
  <td class="detail"></td>
</tr>`,
  )
  .join('\n');

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React Shell Verify</title>
    <style>
      :root { color-scheme: dark; }
      body { font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif; background: #0b0f14; color: #e5e7eb; padding: 28px; margin: 0; }
      h1 { margin: 0 0 4px; font-size: 22px; }
      .sub { color: #94a3b8; font-size: 13px; margin-bottom: 18px; }
      .toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
      button { background: #2a9d8f; color: #04141a; border: none; border-radius: 8px; padding: 8px 16px; font-weight: 600; cursor: pointer; font-size: 13px; }
      button:hover { background: #34b8a7; }
      button:disabled { opacity: 0.5; cursor: default; }
      #summary { font-size: 13px; color: #cbd5e1; }
      table { border-collapse: collapse; width: 100%; font-size: 13px; background: #111827; border-radius: 10px; overflow: hidden; }
      th, td { padding: 9px 12px; text-align: left; border-bottom: 1px solid #1f2937; vertical-align: middle; }
      th { background: #0f172a; color: #94a3b8; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
      tr:last-child td { border-bottom: none; }
      code { background: #1f2937; padding: 1px 6px; border-radius: 4px; font-size: 12px; color: #6ee7b7; }
      .num { text-align: center; font-variant-numeric: tabular-nums; color: #e5e7eb; }
      .title { color: #cbd5e1; max-width: 260px; }
      .muted { color: #64748b; }
      .badge { display: inline-block; padding: 2px 8px; border: 1px solid; border-radius: 999px; font-size: 11px; font-weight: 600; }
      .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
      .dot.pending { background: #64748b; }
      .dot.pass { background: #2a9d8f; }
      .dot.fail { background: #ef4444; }
      .status-cell { white-space: nowrap; }
      .detail { color: #f59e0b; font-size: 12px; }
      tr.fail-row { background: rgba(239, 68, 68, 0.06); }
      iframe { display: none; }
      .legend { margin-top: 14px; font-size: 12px; color: #64748b; }
      .legend span { margin-right: 12px; }
      .note { color: #f59e0b; font-size: 11px; }
    </style>
  </head>
  <body>
    <h1>React Shell Verify</h1>
    <p class="sub">自动访问每个 hash 路由，检查 h2 标题、canvas 数量、canvas 非空像素和 E2E 交互组件。生成于 ${generatedAt}</p>
    <div class="toolbar">
      <button id="run">运行 verify</button>
      <span id="summary">尚未运行</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>hash</th><th>模块</th><th>模式</th><th>期望 canvas</th><th>期望标题</th><th>状态</th><th>详情</th>
        </tr>
      </thead>
      <tbody id="tbody">
${rows}
      </tbody>
    </table>
    <div id="e2e-results" class="panel" style="margin-top:16px;"></div>
    <p class="legend">
      <span><span class="dot pass"></span>通过</span>
      <span><span class="dot fail"></span>失败</span>
      <span class="muted">提示：需通过静态服务器访问本页（如 <code>npm run preview</code>），file:// 下应用资源无法加载。</span>
    </p>
    <iframe id="frame" title="verify-frame"></iframe>

    <script>
      const MODULES = ${modulesJson};
      const frame = document.getElementById('frame');
      const runBtn = document.getElementById('run');
      const summaryEl = document.getElementById('summary');
      const rows = document.querySelectorAll('#tbody tr[data-module]');

      function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

      // 检查 canvas 是否有非空像素（renderer 确实绘制了内容）
      function canvasHasPixels(doc) {
        const canvases = doc.querySelectorAll('canvas');
        if (canvases.length === 0) return { ok: true, empty: 0, total: 0 };
        let empty = 0;
        for (const cv of canvases) {
          try {
            const ctx = cv.getContext('2d');
            if (!ctx) { empty++; continue; }
            const w = cv.width || 0;
            const h = cv.height || 0;
            if (w === 0 || h === 0) { empty++; continue; }
            // 采样：取中心区域 1x1 像素，判断是否非全透明/非纯背景
            const pixel = ctx.getImageData(Math.floor(w / 2), Math.floor(h / 2), 1, 1).data;
            // alpha 为 0 视为空；或 RGB 全为背景色（#fafaf5 ≈ 250,250,245）
            const isTransparent = pixel[3] === 0;
            const isBg = pixel[0] >= 248 && pixel[1] >= 248 && pixel[2] >= 240 && pixel[3] === 255;
            if (isTransparent || isBg) empty++;
          } catch (e) {
            // 跨域 tainted canvas 无法读取，计入空（保守）
            empty++;
          }
        }
        return { ok: empty === 0, empty, total: canvases.length };
      }

      function readFrameState() {
        try {
          const doc = frame.contentDocument;
          if (!doc || !doc.body) return null;
          const h2 = doc.querySelector('h2');
          const canvasEls = doc.querySelectorAll('canvas');
          return {
            h2: h2 ? h2.textContent.trim() : '',
            canvas: canvasEls.length,
          };
        } catch (e) {
          return null;
        }
      }

      function setRowStatus(moduleId, status, detail) {
        const row = document.querySelector('tr[data-module="' + moduleId + '"]');
        if (!row) return;
        const cell = row.querySelector('.status-cell');
        const dot = cell.querySelector('.dot');
        const text = cell.querySelector('.status-text');
        dot.className = 'dot ' + status;
        text.textContent = status === 'pass' ? '通过' : status === 'fail' ? '失败' : '运行中';
        row.classList.toggle('fail-row', status === 'fail');
        row.querySelector('.detail').textContent = detail || '';
      }

      function waitForLoad(timeoutMs) {
        return new Promise((resolve) => {
          let done = false;
          function finish() { if (!done) { done = true; resolve(); } }
          frame.addEventListener('load', finish, { once: true });
          setTimeout(finish, timeoutMs);
        });
      }

      async function pollUntil(match, timeoutMs) {
        const deadline = Date.now() + timeoutMs;
        let last = null;
        while (Date.now() < deadline) {
          await sleep(180);
          last = readFrameState();
          if (!last) continue;
          const titleOk = last.h2 && last.h2.indexOf(match.titleMatch) !== -1;
          const canvasOk = last.canvas === match.expectedCanvas;
          if (titleOk && canvasOk) {
            return { ok: true, state: last };
          }
        }
        return { ok: false, state: last };
      }

      async function run() {
        runBtn.disabled = true;
        summaryEl.textContent = '运行中…';
        let pass = 0;
        let fail = 0;

        // 首次完整加载应用（带 home hash）
        frame.src = './index.html#home';
        await waitForLoad(4000);
        await sleep(400);

        for (const m of MODULES) {
          setRowStatus(m.id, 'pending', '');
          // 通过 hash 切换路由（不触发整页刷新，依赖 App.tsx 的 hashchange 监听）
          try {
            frame.contentWindow.location.hash = m.hash.replace('#', '');
          } catch (e) {
            // 跨域降级：直接改 src
            frame.src = './index.html' + m.hash;
            await waitForLoad(4000);
          }
          const result = await pollUntil(m, 8000);
          const state = result.state || { h2: '', canvas: -1 };
          const titleOk = state.h2.indexOf(m.titleMatch) !== -1;
          const canvasOk = state.canvas === m.expectedCanvas;
          // canvas 非空像素检查（仅对 checkPixels 模块）
          let pixelOk = true;
          let pixelDetail = '';
          if (m.checkPixels && canvasOk && m.expectedCanvas > 0) {
            try {
              const px = canvasHasPixels(frame.contentDocument);
              pixelOk = px.ok;
              if (!px.ok) pixelDetail = '空 canvas ' + px.empty + '/' + px.total;
            } catch (e) {
              pixelOk = false;
              pixelDetail = '像素检查异常';
            }
          }
          if (titleOk && canvasOk && pixelOk) {
            pass++;
            setRowStatus(m.id, 'pass', '');
          } else {
            fail++;
            const parts = [];
            if (!titleOk) parts.push('标题不符（实际: ' + (state.h2 || '空') + '）');
            if (!canvasOk) parts.push('canvas 不符（期望 ' + m.expectedCanvas + '，实际 ' + state.canvas + '）');
            if (pixelDetail) parts.push(pixelDetail);
            setRowStatus(m.id, 'fail', parts.join('；'));
          }
        }

        summaryEl.textContent = 'passed: ' + pass + ' / ' + MODULES.length + '，failed: ' + fail;
        runBtn.disabled = false;
      }

      runBtn.addEventListener('click', run);

      // ── E2E 交互组件检查 ──────────────────────────
      function runE2EChecks() {
        const e2eSection = document.getElementById('e2e-results');
        if (!e2eSection) return;
        const checks = [
          { id: 'e2e-commandbar', label: 'CommandBar 存在', test: () => { const el = frame.contentDocument && frame.contentDocument.querySelector('header[aria-label]'); return !!el || (frame.contentDocument && frame.contentDocument.querySelector('header.sticky') !== null); } },
          { id: 'e2e-birthpanel', label: 'BirthPanel 全局生辰存在', test: () => { const doc = frame.contentDocument; if (!doc) return false; return doc.body.textContent.indexOf('全局生辰') !== -1; } },
          { id: 'e2e-cmdk-hint', label: '⌘K 快捷键提示可见', test: () => { const doc = frame.contentDocument; if (!doc) return false; return doc.body.textContent.indexOf('⌘K') !== -1; } },
          { id: 'e2e-sidebar', label: 'SidebarNav 导航存在', test: () => { const doc = frame.contentDocument; if (!doc) return false; return doc.querySelector('aside nav') !== null; } },
          { id: 'e2e-workspace-tabs', label: 'WorkspaceTabs 标签栏存在', test: () => { const doc = frame.contentDocument; if (!doc) return false; return doc.querySelector('[role=tablist]') !== null; } },
          { id: 'e2e-pure-ts-ready', label: '纯 TS 引擎就绪（无 visual/ 旧桥）', test: () => { const w = frame.contentWindow; return !!(w && !w.LegacyCORE && !w.LegacyVizModules); } },
        ];
        let pass = 0, fail = 0;
        let html = '<h2 style="margin-top:24px;font-size:16px;color:#e5e7eb;">E2E 交互检查</h2>';
        for (const c of checks) {
          let ok = false;
          try { ok = c.test(); } catch (e) { ok = false; }
          if (ok) pass++; else fail++;
          html += '<div style="padding:6px 12px;border-bottom:1px solid #1f2937;"><span class="dot ' + (ok ? 'pass' : 'fail') + '"></span>' + c.label + '</div>';
        }
        html += '<p style="padding:8px 12px;font-size:12px;color:#94a3b8;">E2E 通过: ' + pass + ' / ' + checks.length + '</p>';
        e2eSection.innerHTML = html;
      }

      // 页面加载后自动运行 verify（需先手动点击 run 按钮，但加载后自动执行 E2E 检查）
      // 先加载应用 iframe，然后运行 E2E 检查
      frame.addEventListener('load', () => {
        setTimeout(runE2EChecks, 1000);
      });
    </script>
  </body>
</html>`;

if (!existsSync(distRoot)) mkdirSync(distRoot, { recursive: true });
const out = resolve(distRoot, 'verify.html');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html, 'utf8');

// 控制台报告
const line = '─'.repeat(56);
console.log(line);
console.log('verify page generated →', out);
console.log(line);
console.log('modules:');
for (const m of modules) {
  const b = MODE_BADGE[m.mode] || MODE_BADGE.derived;
  console.log('  ' + m.hash.padEnd(10) + ' ' + b.label.padEnd(14) + ' canvas=' + m.expectedCanvas + '  h2=' + (m.expectedTitle || '(none)'));
}
console.log(line);
console.log('用静态服务器打开 dist/verify.html（如 npm run preview 后访问 /verify.html）');
