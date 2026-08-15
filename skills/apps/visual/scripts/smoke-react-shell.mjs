/**
 * smoke-react-shell.mjs — React Shell 轻量结构冒烟测试
 *
 * 零依赖、纯 Node 脚本，沿用 visual/js/tests/check-doc-contracts.mjs 的风格。
 * 验证 React app 关键运行时契约（不启动浏览器）：
 *   - #bazi 工作区渲染 SVG 四柱主盘 + 五行平衡（Phase 10 已从 Canvas 迁移至 BaziPillarsChart + FiveElementsChart）
 *   - #yunqi 工作区渲染 SVG 综合图（岁运·司天·在泉，Phase 10 已从 Canvas 迁移至 YunqiChart）
 *   - #meihua 工作区渲染 SVG 卦画（梅花易数，Phase 10 已从 Canvas 迁移至 MeihuaChart）
 *   - #liuyao 工作区渲染 SVG 卦画（六爻占卜，Phase 10 已从 Canvas 迁移至 HexagramChart）
 *   - #ziwei 工作区渲染 SVG 命盘（紫微斗数，Phase 10 已从 Canvas 迁移至 ZiweiPalaceGrid）
 *   - #feixing 工作区渲染 SVG 九宫飞星图（Phase 10 已从 Canvas 迁移至 NinePalaceGrid）
 *   - #bazhai 工作区渲染 SVG 八宅命盘（Phase 10 已从 Canvas 迁移至 EightMansionsChart）
 *   - #fengshui 工作区渲染 SVG 二十四山罗盘（Phase 10 已从 Canvas 迁移至 FengshuiCompass）
 *   - AppShell 通过统一 workspace registry 路由各工作区
 *   - 纯 TS 引擎就绪（solarEntry / *Engine.ts，无 visual/ ?raw 桥）
 *   - canvasRenderers 暴露飞星/八宅纯 TS API
 *
 * 运行：node apps/visual/scripts/smoke-react-shell.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(appRoot, 'src');
const repoRoot = path.resolve(appRoot, '../..');
let passed = 0;
let failed = 0;
const failures = [];

function check(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(message);
  }
}

function read(relPath) {
  return fs.readFileSync(relPath, 'utf8');
}

function exists(relPath) {
  return fs.existsSync(relPath);
}

function countOccurrences(haystack, needle) {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count++;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

// ── 0. Sidebar brand uses the custom 玄轨星核 logo ───────────
const sidebarNav = read(path.join(srcRoot, 'components/app-shell/SidebarNav.tsx'));
check(
  sidebarNav.includes("import { XuanOrbitLogo } from './XuanOrbitLogo';"),
  'SidebarNav 应导入 XuanOrbitLogo 作为侧边栏品牌图标',
);
check(
  sidebarNav.includes('<XuanOrbitLogo className="h-9 w-9" />'),
  'SidebarNav 应在 brand-seal 中渲染 玄轨星核 图标',
);
check(
  !sidebarNav.includes('>\n            玄\n          </div>'),
  'brand-seal 不应继续直接渲染文字 玄',
);

check(exists(path.join(appRoot, 'index.html')), 'apps/visual/index.html 应存在，作为 React Dashboard 的 vite 入口');

// ── 1. #bazi: 四柱主盘与五行平衡均已迁移至 SVG（Phase 10） ──
const baziWorkspace = read(path.join(srcRoot, 'features/bazi/BaziWorkspace.tsx'));
const baziCanvasCount = countOccurrences(baziWorkspace, '<CanvasPanel');
check(baziCanvasCount === 0, `#bazi 已完全迁移至 SVG，不应再出现 <CanvasPanel，实际 ${baziCanvasCount} 次`);
check(baziWorkspace.includes('BaziPillarsChart'), '#bazi 四柱主盘应使用 BaziPillarsChart SVG 组件');
check(baziWorkspace.includes('FiveElementsChart'), '#bazi 五行平衡应使用 FiveElementsChart SVG 组件');
check(
  !baziWorkspace.includes('renderLegacyBazi') && !baziWorkspace.includes('renderLegacyWuxing'),
  '#bazi 不应再调用 renderLegacyBazi / renderLegacyWuxing（已由 SVG 组件替换）',
);
check(baziWorkspace.includes('calcBaziEnveloped') || baziWorkspace.includes('calculateBazi'), '#bazi 应通过纯 TS baziEngine 计算四柱');
check(baziWorkspace.includes('getSolarEntry'), '#bazi 应使用 npm lunar-typescript Solar 入口');
check(baziWorkspace.includes('useBirth'), '#bazi 应读取全局生辰上下文');
check(!baziWorkspace.includes('loadLegacyScripts'), '#bazi 不应再加载 visual/ 旧桥');

// ── 2. #yunqi: 已迁移至 SVG（Phase 10） ─────────────────
const yunqiPath = path.join(srcRoot, 'features/yunqi/YunqiWorkspace.tsx');
check(exists(yunqiPath), 'YunqiWorkspace.tsx 应位于 features/yunqi/ 目录');
if (exists(yunqiPath)) {
  const yunqiWorkspace = read(yunqiPath);
  const yunqiCanvasCount = countOccurrences(yunqiWorkspace, '<CanvasPanel');
  check(yunqiCanvasCount === 0, `#yunqi 已迁移至 SVG，不应再出现 <CanvasPanel，实际 ${yunqiCanvasCount} 次`);
  check(yunqiWorkspace.includes('YunqiChart'), '#yunqi 应使用 YunqiChart SVG 组件');
  check(
    !yunqiWorkspace.includes('renderLegacyYunqi'),
    '#yunqi 不应再调用 renderLegacyYunqi（已由 YunqiChart 替换）',
  );
}

// 旧路径不应再存在（已迁移）
check(
  !exists(path.join(srcRoot, 'features/bazi/YunqiWorkspace.tsx')),
  'features/bazi/YunqiWorkspace.tsx 已迁移，旧路径不应存在',
);

// tizhi 模块由 ConstitutionWorkspace 承载，旧 TizhiWorkspace.tsx 是死代码不应存在
check(
  !exists(path.join(srcRoot, 'features/tizhi/TizhiWorkspace.tsx')),
  'features/tizhi/TizhiWorkspace.tsx 是死代码（tizhi 由 ConstitutionWorkspace 承载），应已删除',
);
check(
  !exists(path.join(srcRoot, 'features/tizhi')),
  'features/tizhi 空目录应已清理',
);

// ── 联合分析报告导出 ─────────────────────────────────────
const comboWorkspace = read(path.join(srcRoot, 'features/combo/ComboWorkspace.tsx'));
check(
  countOccurrences(comboWorkspace, '<ExportReportButton') === 1,
  '联合分析结果区应仅保留一个报告导出按钮',
);
check(
  comboWorkspace.includes('presentation={exportPresentation}'),
  '联合分析报告导出应传入当前 exportPresentation',
);
check(
  !comboWorkspace.includes('report={result.envelope?.data.export_snapshot ?? null}'),
  '联合分析报告导出不应直接传入 raw export_snapshot',
);

// ── 3. #tizhi 使用 SVG RadarChart（Phase 10 升级） ────────
const tizhiPath = path.join(srcRoot, 'features/constitution/ConstitutionWorkspace.tsx');
check(exists(tizhiPath), 'ConstitutionWorkspace.tsx 应位于 features/constitution/ 目录');
if (exists(tizhiPath)) {
  const tizhiWorkspace = read(tizhiPath);
  const tizhiCanvasCount = countOccurrences(tizhiWorkspace, '<CanvasPanel');
  check(tizhiCanvasCount === 0, `#tizhi Phase 10 后不应再用 CanvasPanel，实际出现 ${tizhiCanvasCount} 次`);
  check(tizhiWorkspace.includes('RadarChart'), 'ConstitutionWorkspace 应使用 RadarChart SVG 组件');
  check(tizhiWorkspace.includes('radarAxes'), 'ConstitutionWorkspace 应构建 radarAxes 数据');
}

// ── 3b. #meihua 有 1 个 canvas（梅花易数迁移） ────────────
const meihuaPath = path.join(srcRoot, 'features/meihua/MeihuaWorkspace.tsx');
check(exists(meihuaPath), 'MeihuaWorkspace.tsx 应位于 features/meihua/ 目录');
if (exists(meihuaPath)) {
  const meihuaWorkspace = read(meihuaPath);
  const meihuaCanvasCount = countOccurrences(meihuaWorkspace, '<CanvasPanel');
  check(meihuaCanvasCount === 0, `#meihua 已迁移至 SVG，不应再出现 <CanvasPanel，实际 ${meihuaCanvasCount} 次`);
  check(
    meihuaWorkspace.includes('MeihuaChart'),
    'MeihuaWorkspace 应使用 MeihuaChart 渲染 SVG 卦画',
  );
  check(
    !meihuaWorkspace.includes('renderLegacyMeihua'),
    'MeihuaWorkspace 不应再调用 renderLegacyMeihua（已由 MeihuaChart 替换）',
  );
  check(meihuaWorkspace.includes('MEIHUA_INTENT_EVENT'), 'MeihuaWorkspace 应监听梅花快捷命令 intent');
  check(meihuaWorkspace.includes('setMethod'), 'MeihuaWorkspace 应可通过快捷命令更新起卦方式');
  check(
    meihuaWorkspace.includes('setNumberA') && meihuaWorkspace.includes('setNumberB'),
    'MeihuaWorkspace 应可通过快捷命令更新数字起卦输入',
  );
  check(meihuaWorkspace.includes('calcMeihuaEnveloped'), 'MeihuaWorkspace 应通过公开计算入口生成卦象');
}

// ── 3c. #liuyao 有 canvas 并接真实纳甲引擎 ────────────────
const liuyaoPath = path.join(srcRoot, 'features/liuyao/LiuyaoWorkspace.tsx');
check(exists(liuyaoPath), 'LiuyaoWorkspace.tsx 应位于 features/liuyao/ 目录');
if (exists(liuyaoPath)) {
  const liuyaoWorkspace = read(liuyaoPath);
  const liuyaoCanvasCount = countOccurrences(liuyaoWorkspace, '<CanvasPanel');
  check(liuyaoCanvasCount === 0, `#liuyao 已迁移至 SVG，不应再出现 <CanvasPanel，实际 ${liuyaoCanvasCount} 次`);
  check(
    liuyaoWorkspace.includes('HexagramChart'),
    'LiuyaoWorkspace 应使用 HexagramChart 渲染本卦/变卦 SVG 卦画',
  );
  check(
    !liuyaoWorkspace.includes('renderLegacyLiuyao'),
    'LiuyaoWorkspace 不应再调用 renderLegacyLiuyao（已由 HexagramChart 替换）',
  );
  check(
    liuyaoWorkspace.includes('calculateLiuyao') || liuyaoWorkspace.includes('calcLiuyaoEnveloped'),
    'LiuyaoWorkspace 应通过纯 TS liuyaoEngine 起卦',
  );
  check(!liuyaoWorkspace.includes('loadLegacyScripts'), 'LiuyaoWorkspace 不应再加载 visual/ 旧桥');
  check(liuyaoWorkspace.includes('LIUYAO_INTENT_EVENT'), 'LiuyaoWorkspace 应监听六爻快捷命令 intent');
  check(liuyaoWorkspace.includes('setQuestion'), 'LiuyaoWorkspace 应可通过快捷命令更新占问事项');
  check(liuyaoWorkspace.includes('setCastCount'), 'LiuyaoWorkspace 应可通过快捷命令触发重新起卦');
}

// ── 3d. #ziwei 使用 SVG 命盘（Phase 10 图表替换：CanvasPanel → ZiweiPalaceGrid） ────
const ziweiPath = path.join(srcRoot, 'features/ziwei/ZiweiWorkspace.tsx');
check(exists(ziweiPath), 'ZiweiWorkspace.tsx 应位于 features/ziwei/ 目录');
const ziweiGridPath = path.join(srcRoot, 'components/shared/ZiweiPalaceGrid.tsx');
check(exists(ziweiGridPath), 'ZiweiPalaceGrid.tsx 应位于 components/shared/ 目录');
if (exists(ziweiPath)) {
  const ziweiWorkspace = read(ziweiPath);
  const ziweiCanvasCount = countOccurrences(ziweiWorkspace, '<CanvasPanel');
  check(ziweiCanvasCount === 0, `#ziwei 已迁移至 SVG，不应再出现 <CanvasPanel，实际 ${ziweiCanvasCount} 次`);
  check(
    ziweiWorkspace.includes('ZiweiPalaceGrid'),
    'ZiweiWorkspace 应使用 ZiweiPalaceGrid 渲染 SVG 命盘',
  );
  check(
    ziweiWorkspace.includes('calculateZiwei') || ziweiWorkspace.includes('calcZiweiEnveloped'),
    'ZiweiWorkspace 应通过纯 TS ziweiEngine（iztro ESM）排盘',
  );
  check(!ziweiWorkspace.includes('loadLegacyScripts'), 'ZiweiWorkspace 不应再加载 visual/ 旧桥');
  check(
    ziweiWorkspace.includes('useBirth'),
    'ZiweiWorkspace 应读取全局生辰上下文',
  );
}
if (exists(ziweiGridPath)) {
  const grid = read(ziweiGridPath);
  check(grid.includes('data-testid="ziwei-palace-grid"'), 'ZiweiPalaceGrid 应暴露 data-testid 便于测试');
  check(grid.includes('BRANCH_TO_GRID'), 'ZiweiPalaceGrid 应按地支映射 4x4 环形布局');
  check(grid.includes('巳') && grid.includes('戌') && grid.includes('亥'), 'ZiweiPalaceGrid 外环应覆盖全部地支含戌亥');
}

// ── 3e. #feixing 有 1 个 canvas（流年飞星迁移） ──────────
const feixingPath = path.join(srcRoot, 'features/feixing/FeixingWorkspace.tsx');
check(exists(feixingPath), 'FeixingWorkspace.tsx 应位于 features/feixing/ 目录');
if (exists(feixingPath)) {
  const feixingWorkspace = read(feixingPath);
  const feixingCanvasCount = countOccurrences(feixingWorkspace, '<CanvasPanel');
  check(feixingCanvasCount === 0, `#feixing 已迁移至 SVG，不应再出现 <CanvasPanel，实际 ${feixingCanvasCount} 次`);
  check(
    feixingWorkspace.includes('NinePalaceGrid'),
    'FeixingWorkspace 应使用 NinePalaceGrid 渲染 SVG 九宫飞星图',
  );
  check(
    feixingWorkspace.includes('getFeixingGrid'),
    'FeixingWorkspace 应通过 getFeixingGrid 获取九宫网格数据',
  );
  check(
    !feixingWorkspace.includes('renderLegacyFlyingStars'),
    'FeixingWorkspace 不应再调用 renderLegacyFlyingStars（已由 NinePalaceGrid 替换）',
  );
}

// ── 3c. #bazhai 有 1 个 canvas（八宅大游年迁移） ─────────
const bazhaiPath = path.join(srcRoot, 'features/bazhai/BazhaiWorkspace.tsx');
check(exists(bazhaiPath), 'BazhaiWorkspace.tsx 应位于 features/bazhai/ 目录');
if (exists(bazhaiPath)) {
  const bazhaiWorkspace = read(bazhaiPath);
  const bazhaiCanvasCount = countOccurrences(bazhaiWorkspace, '<CanvasPanel');
  check(bazhaiCanvasCount === 0, `#bazhai 已迁移至 SVG，不应再出现 <CanvasPanel，实际 ${bazhaiCanvasCount} 次`);
  check(
    bazhaiWorkspace.includes('EightMansionsChart'),
    'BazhaiWorkspace 应使用 EightMansionsChart 渲染 SVG 八宅命盘',
  );
  check(
    bazhaiWorkspace.includes('getBazhaiGrid'),
    'BazhaiWorkspace 应通过 getBazhaiGrid 获取八宅扇区数据',
  );
  check(
    !bazhaiWorkspace.includes('renderLegacyEightMansions'),
    'BazhaiWorkspace 不应再调用 renderLegacyEightMansions（已由 EightMansionsChart 替换）',
  );
}

// ── 3d. #fengshui: 已迁移至 SVG（Phase 10 收官） ─────────
const fengshuiPath = path.join(srcRoot, 'features/fengshui/FengshuiWorkspace.tsx');
check(exists(fengshuiPath), 'FengshuiWorkspace.tsx 应位于 features/fengshui/ 目录');
if (exists(fengshuiPath)) {
  const fengshuiWorkspace = read(fengshuiPath);
  const fengshuiCanvasCount = countOccurrences(fengshuiWorkspace, '<CanvasPanel');
  check(fengshuiCanvasCount === 0, `#fengshui 已迁移至 SVG，不应再出现 <CanvasPanel，实际 ${fengshuiCanvasCount} 次`);
  check(
    fengshuiWorkspace.includes('FengshuiCompass'),
    'FengshuiWorkspace 应使用 FengshuiCompass 渲染 SVG 二十四山罗盘',
  );
  check(
    !fengshuiWorkspace.includes('renderLegacyCompass'),
    'FengshuiWorkspace 不应再调用 renderLegacyCompass（已由 FengshuiCompass 替换）',
  );
}

// ── 3f. testRegistry 测试套件注册表 ──────────────────────
const testRegistryPath = path.join(srcRoot, 'legacy/testRegistry.ts');
check(exists(testRegistryPath), 'testRegistry.ts 应位于 legacy/ 目录');
if (exists(testRegistryPath)) {
  const testRegistry = read(testRegistryPath);
  check(testRegistry.includes('smoke-react-shell'), 'testRegistry 应注册 smoke-react-shell 套件');
  check(testRegistry.includes('check-doc-contracts'), 'testRegistry 应注册 check-doc-contracts 套件');
  check(testRegistry.includes('check-mapping-schema'), 'testRegistry 应注册 check-mapping-schema 套件');
  check(testRegistry.includes('check-knowledge-references'), 'testRegistry 应注册 check-knowledge-references 套件');
  check(testRegistry.includes('check-search-index'), 'testRegistry 应注册 check-search-index 套件');
  check(testRegistry.includes('verify-page'), 'testRegistry 应注册 verify-page 套件');
  check(testRegistry.includes('TestSuiteType'), 'testRegistry 应导出 TestSuiteType 类型');
}

// ── 3h. #reader 迁移（古籍 Split Reader，Phase 8） ──────
const readerPath = path.join(srcRoot, 'features/knowledge/AncientTextSplitReader.tsx');
check(exists(readerPath), 'AncientTextSplitReader.tsx 应位于 features/knowledge/ 目录');
if (exists(readerPath)) {
  const readerWorkspace = read(readerPath);
  const readerCanvasCount = countOccurrences(readerWorkspace, '<CanvasPanel');
  check(readerCanvasCount === 0, `#reader 不应使用 CanvasPanel，实际出现 ${readerCanvasCount} 次`);
  check(
    readerWorkspace.includes('TEXT_PAIRS'),
    'AncientTextSplitReader 应内置 TEXT_PAIRS 文本对数据',
  );
  check(
    readerWorkspace.includes('?raw'),
    'AncientTextSplitReader 应通过 Vite ?raw 导入古籍原文',
  );
  check(
    readerWorkspace.includes('八宅明镜'),
    'AncientTextSplitReader 应包含八宅明镜古籍',
  );
  check(
    !readerWorkspace.includes('mappingJson') && !readerWorkspace.includes('eight-mansions.json'),
    'AncientTextSplitReader 不应加载或展示内部映射字段与文件名',
  );
  check(
    readerWorkspace.includes('renderMarkdownLite') && !readerWorkspace.includes('highlightJson'),
    'AncientTextSplitReader 应仅渲染古籍原文，不展示原始映射数据',
  );
  check(readerWorkspace.includes('READER_SEARCH_INTENT_EVENT'), 'AncientTextSplitReader 应监听古籍搜索 intent');
  check(readerWorkspace.includes('setSearchTerm'), 'AncientTextSplitReader 应可通过快捷命令更新搜索词');
}

// ── 3i. CommandBar 命令面板（Phase 7） ──────────────────
const commandBarPath = path.join(srcRoot, 'components/app-shell/CommandBar.tsx');
const commandBar = read(commandBarPath);
check(
  commandBar.includes('CommandPalette'),
  'CommandBar 应包含 CommandPalette 命令面板组件',
);
check(
  commandBar.includes("'k'") && commandBar.includes('metaKey'),
  'CommandBar 应监听 ⌘K/Ctrl+K 快捷键',
);
check(
  commandBar.includes('fuzzyMatch'),
  'CommandBar 应实现模糊搜索',
);
check(
  commandBar.includes('ArrowDown') && commandBar.includes('ArrowUp') && commandBar.includes('Enter'),
  'CommandBar 应支持键盘导航（↑↓Enter）',
);
check(
  commandBar.includes('action-global-search') && commandBar.includes('openSearchModal'),
  'CommandBar 应包含全局搜索快捷操作',
);
check(
  !commandBar.includes('querySelector'),
  'CommandBar 不应通过 querySelector 直接操作 DOM',
);
check(
  commandBar.includes('dispatchCopyContextIntent(active.id)'),
  'CommandBar 复制当前上下文应派发 copy intent',
);
check(
  commandBar.includes("dispatchYearIntent('feixing'") && commandBar.includes("dispatchYearIntent('yunqi'"),
  'CommandBar 应支持输入年份跳转飞星/五运六气',
);
check(commandBar.includes('parseBirthCommand'), 'CommandBar 应解析全局生辰修改命令');
check(commandBar.includes('dispatchBirthIntent'), 'CommandBar 应派发全局生辰修改 intent');
check(commandBar.includes('dispatchRefreshAllIntent'), 'CommandBar 应派发全局刷新 intent');
check(commandBar.includes('dispatchLiuyaoIntent'), 'CommandBar 应派发六爻快捷命令 intent');
check(commandBar.includes('dispatchMeihuaIntent'), 'CommandBar 应派发梅花快捷命令 intent');
check(commandBar.includes('dispatchReaderSearchIntent'), 'CommandBar 应派发古籍搜索 intent');
check(commandBar.includes('COMMAND_FEEDBACK_EVENT'), 'CommandBar 应监听命令执行反馈事件');
check(commandBar.includes('data-testid="command-bar"'), 'CommandBar 搜索入口应提供稳定 data-testid');
check(commandBar.includes('data-testid="command-palette"'), 'CommandBar 面板应提供稳定 data-testid');
check(commandBar.includes('COMMAND_FEEDBACK_EVENT') || commandBar.includes('dispatchCommandFeedback'), 'CommandBar 应派发 COMMAND_FEEDBACK_EVENT 反馈（GlobalToast 统一渲染）');
check(fs.existsSync(path.join(srcRoot, 'components/shared/GlobalToast.tsx')), 'GlobalToast 组件应存在（统一反馈渲染）');
check(commandBar.includes('dispatchCommandFeedback(buildCommandFeedback(item))'), 'CommandBar 选择命令后应派发标准反馈');
check(commandBar.includes("onSelectModule('liuyao')"), 'CommandBar 六爻快捷命令应跳转 liuyao 模块');
check(commandBar.includes("onSelectModule('meihua')"), 'CommandBar 梅花快捷命令应跳转 meihua 模块');
check(commandBar.includes("onSelectModule('reader')"), 'CommandBar 古籍搜索命令应跳转 reader 模块');

// ── 3j. BirthPanel 全局出生资料同步 ──────────────────────
const birthPanelPath = path.join(srcRoot, 'components/shared/BirthPanel.tsx');
check(exists(birthPanelPath), 'BirthPanel.tsx 应位于 components/shared/ 目录');
if (exists(birthPanelPath)) {
  const birthPanel = read(birthPanelPath);
  check(birthPanel.includes('useBirth'), 'BirthPanel 应使用 useBirth hook');
  check(birthPanel.includes('updateBirth'), 'BirthPanel 应调用 updateBirth 更新出生资料');
  check(birthPanel.includes('全局生辰'), 'BirthPanel 应显示全局生辰摘要');
  check(birthPanel.includes('legacyReady'), 'BirthPanel 应显示 legacy 同步状态');
}

const birthContextPath = path.join(srcRoot, 'lib/birthContext.tsx');
check(exists(birthContextPath), 'birthContext.tsx 应位于 lib/ 目录');
if (exists(birthContextPath)) {
  const birthContext = read(birthContextPath);
  check(birthContext.includes('BirthProvider'), 'birthContext 应导出 BirthProvider');
  check(birthContext.includes('useBirth'), 'birthContext 应导出 useBirth hook');
  check(!birthContext.includes('loadLegacyScripts'), 'birthContext 不应再加载旧脚本桥');
  check(birthContext.includes('toSolarBirth'), 'birthContext 应使用 toSolarBirth 转公历');
  check(birthContext.includes('BIRTH_INTENT_EVENT'), 'birthContext 应监听 CommandBar 生辰更新 intent');
  check(birthContext.includes('REFRESH_ALL_INTENT_EVENT'), 'birthContext 应监听 CommandBar 全局刷新 intent');
}

const birthBridgePath = path.join(srcRoot, 'legacy/birthBridge.ts');
check(exists(birthBridgePath), 'birthBridge.ts 应位于 legacy/ 目录');
if (exists(birthBridgePath)) {
  const birthBridge = read(birthBridgePath);
  check(birthBridge.includes('writeFortuneBirth'), 'birthBridge 应导出 writeFortuneBirth');
  check(birthBridge.includes('readFortuneBirth'), 'birthBridge 应导出 readFortuneBirth');
}

// ── 3l. 动态天盘背景 ─────────────────────────────────
const tianpanPath = path.join(srcRoot, 'components/app-shell/DynamicTianPanBackground.tsx');
check(exists(tianpanPath), 'DynamicTianPanBackground.tsx 应位于 app-shell 目录');
if (exists(tianpanPath)) {
  const tianpan = read(tianpanPath);
  check(tianpan.includes('dynamic-tianpan-background'), '动态背景组件应输出 dynamic-tianpan-background 根节点');
  check(tianpan.includes('aria-hidden="true"'), '动态背景应 aria-hidden，避免干扰辅助技术');
  check(tianpan.includes('<canvas'), '动态背景应使用 Canvas 渲染粒子系统');
  check(tianpan.includes('STARS_28'), '动态背景应包含二十八宿星图');
  check(tianpan.includes('wood') && tianpan.includes('water'), '动态背景应包含五行粒子层');
  check(tianpan.includes('BAGUA'), '动态背景应包含八卦爻线');
  check(tianpan.includes('prefers-reduced-motion'), '动态背景组件应处理 reduced-motion 降级');
}

const globalStyles = read(path.join(srcRoot, 'styles/globals.css'));
check(globalStyles.includes('.dynamic-tianpan-background'), 'globals.css 应定义动态天盘背景样式');
check(globalStyles.includes('.tianpan-canvas'), 'globals.css 应定义 canvas 撑满样式');
check(globalStyles.includes('tianpan-disc-rotate'), '动态天盘应使用慢速旋转动画');
check(globalStyles.includes('prefers-reduced-motion: reduce'), '动态天盘应支持 reduced-motion 降级');

// ── 3l. App.tsx 接入 BirthProvider ──────────────────────
const appTsx = read(path.join(srcRoot, 'App.tsx'));
check(appTsx.includes('BirthProvider'), 'App.tsx 应使用 BirthProvider 包裹 AppShell');

// ── 4. AppShell 路由契约 ─────────────────────────────────
const appShell = read(path.join(srcRoot, 'components/app-shell/AppShell.tsx'));
check(appShell.includes("resolveWorkspace(activeModule)"), 'AppShell 应使用统一 workspace registry 解析工作区');

const workspaceRegistry = read(path.join(srcRoot, 'components/app-shell/workspaceRegistry.tsx'));
// 懒加载形式：`bazi: lazy(() => import(...).then((m) => ({ default: m.BaziWorkspace })))`
// 断言匹配 `m.<Workspace>` 与 `lazy(` 标识，确认注册存在且为懒加载
check(workspaceRegistry.includes('lazy('), 'workspaceRegistry 应使用懒加载注册工作区');
check(workspaceRegistry.includes("m.MeihuaWorkspace"), 'workspaceRegistry 应注册 meihua 工作区');
check(workspaceRegistry.includes("m.LiuyaoWorkspace"), 'workspaceRegistry 应注册 liuyao 工作区');
check(workspaceRegistry.includes("m.ZiweiWorkspace"), 'workspaceRegistry 应注册 ziwei 工作区');
check(workspaceRegistry.includes("m.FengshuiWorkspace"), 'workspaceRegistry 应注册 fengshui 工作区');
check(!workspaceRegistry.includes("TestRunnerConsole"), 'workspaceRegistry 不应注册内部测试控制台');
check(workspaceRegistry.includes("m.AncientTextSplitReader"), 'workspaceRegistry 应注册 reader 工作区');
check(workspaceRegistry.includes("m.BaziWorkspace"), 'workspaceRegistry 应注册 bazi 工作区');
check(workspaceRegistry.includes("m.YunqiWorkspace"), 'workspaceRegistry 应注册 yunqi 工作区');
check(workspaceRegistry.includes("m.ConstitutionWorkspace"), 'workspaceRegistry 应注册 tizhi 工作区');
check(workspaceRegistry.includes("resolveWorkspace"), 'workspaceRegistry 应导出 resolveWorkspace');

// ── 3k. BirthPanel 接入（侧边栏） ────────────────────────
check(sidebarNav.includes('BirthPanel'), 'SidebarNav 应接入 BirthPanel（全局生辰控制台移至侧边栏）');

// ── 5. 纯 TS 引擎路径（已拔除 visual/ 旧桥） ─────────────
check(!exists(path.join(srcRoot, 'legacy/loadLegacyScripts.ts')), 'loadLegacyScripts.ts 应已删除');
check(exists(path.join(srcRoot, 'legacy/solarEntry.ts')), 'solarEntry.ts 应提供 npm lunar-typescript 入口');
check(exists(path.join(srcRoot, 'legacy/termExplanations.ts')), 'termExplanations.ts 应提供纯 TS 术语表');
check(exists(path.join(srcRoot, 'legacy/termExplanations.json')), 'termExplanations.json 词表应存在');
check(exists(path.join(srcRoot, 'legacy/baziEngine.ts')), 'baziEngine.ts 纯 TS 引擎应存在');
check(exists(path.join(srcRoot, 'legacy/ziweiEngine.ts')), 'ziweiEngine.ts 纯 TS 引擎应存在');
check(exists(path.join(srcRoot, 'legacy/liuyaoEngine.ts')), 'liuyaoEngine.ts 纯 TS 引擎应存在');
check(exists(path.join(srcRoot, 'legacy/yunqiEngine.ts')), 'yunqiEngine.ts 纯 TS 引擎应存在');

const solarEntry = read(path.join(srcRoot, 'legacy/solarEntry.ts'));
check(solarEntry.includes("from 'lunar-typescript'"), 'solarEntry 应从 npm 包 lunar-typescript 导入');
check(!solarEntry.includes('?raw'), 'solarEntry 不应 ?raw 加载 visual/vendor');

const birthCtx = read(path.join(srcRoot, 'lib/birthContext.tsx'));
check(!birthCtx.includes('loadLegacyScripts'), 'birthContext 不应再加载 visual/ 旧桥');
check(birthCtx.includes('legacyReady: true') || birthCtx.includes('legacyReady:true'), 'birthContext 引擎应始终就绪');

const toolRegistry = read(path.join(srcRoot, 'legacy/toolRegistry.ts'));
check(toolRegistry.includes('MODULES'), 'toolRegistry 应从 MODULES 构建工具目录');
check(!toolRegistry.includes('window.ToolManifest'), 'toolRegistry 不应读 window.ToolManifest');
check(!toolRegistry.includes('window.CapabilityRegistry'), 'toolRegistry 不应读 window.CapabilityRegistry');

// ── 6. 源码不得再 ?raw import visual/ ─────────────────────
function walkTs(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkTs(p, out);
    else if (/\.(ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}
const visualRawHits = [];
for (const f of walkTs(srcRoot)) {
  const text = read(f);
  // 只把真正的 import 路径算违规（忽略注释）
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  if (code.includes('visual/js/') && code.includes('?raw')) visualRawHits.push(path.relative(repoRoot, f));
  if (code.includes('visual/vendor/') && code.includes('?raw')) visualRawHits.push(path.relative(repoRoot, f));
}
check(visualRawHits.length === 0, `src 不得再 ?raw 引用 visual/，实际命中: ${visualRawHits.join(', ') || '无'}`);

// ── 7. canvasRenderers 纯 TS 飞星/八宅 API ───────────────
const canvasRenderers = read(path.join(srcRoot, 'legacy/canvasRenderers.ts'));
const expectedRenderers = [
  'getFlyingStars',
  'getFeixingGrid',
  'getFeixingSummary',
  'getBazhaiGrid',
  'getBazhaiSummary',
  'deriveDominantConstitution',
];
for (const name of expectedRenderers) {
  check(canvasRenderers.includes(name), `canvasRenderers 应导出 ${name}`);
}
check(!canvasRenderers.includes('getLegacyCORE'), 'canvasRenderers 不应再依赖 getLegacyCORE');
check(!canvasRenderers.includes('LegacyVizModules'), 'canvasRenderers 不应再依赖 LegacyVizModules');
check(!canvasRenderers.includes('renderLegacyBazi'), 'canvasRenderers 不应再导出 renderLegacy* Canvas 包装');

// ── 8. CopyContextButton 与通用组件契约 ─────────────────
const commandIntentsPath = path.join(srcRoot, 'lib/commandIntents.ts');
check(exists(commandIntentsPath), 'commandIntents.ts 应位于 lib/ 目录');
if (exists(commandIntentsPath)) {
  const commandIntents = read(commandIntentsPath);
  check(commandIntents.includes('ctw:copy-context'), 'commandIntents 应定义 copy context 事件');
  check(commandIntents.includes('ctw:set-year'), 'commandIntents 应定义年份跳转事件');
  check(commandIntents.includes('ctw:set-birth'), 'commandIntents 应定义全局生辰更新事件');
  check(commandIntents.includes('ctw:refresh-all'), 'commandIntents 应定义全局刷新事件');
  check(commandIntents.includes('ctw:liuyao-command'), 'commandIntents 应定义六爻快捷命令事件');
  check(commandIntents.includes('ctw:meihua-command'), 'commandIntents 应定义梅花快捷命令事件');
  check(commandIntents.includes('ctw:reader-search'), 'commandIntents 应定义古籍搜索命令事件');
  check(commandIntents.includes('ctw:command-feedback'), 'commandIntents 应定义命令执行反馈事件');
  check(commandIntents.includes('parseBirthCommand'), 'commandIntents 应导出生辰命令解析器');
  check(commandIntents.includes('parseLiuyaoCommand'), 'commandIntents 应导出六爻命令解析器');
  check(commandIntents.includes('parseMeihuaCommand'), 'commandIntents 应导出梅花命令解析器');
  check(commandIntents.includes('parseReaderSearchCommand'), 'commandIntents 应导出古籍搜索命令解析器');
  check(commandIntents.includes('isRefreshAllCommand'), 'commandIntents 应导出刷新命令识别器');
  check(commandIntents.includes('buildCommandFeedback'), 'commandIntents 应导出命令反馈消息构建器');
  check(commandIntents.includes('recordCommandHistory'), 'commandIntents 应导出命令历史记录器');
  check(commandIntents.includes('listCommandHistory'), 'commandIntents 应导出命令历史列表');
  check(commandIntents.includes('CommandHistoryEntry'), 'commandIntents 应定义命令历史条目类型');
}

check(commandBar.includes('recordCommandHistory'), 'CommandBar 应记录命令执行历史');
check(commandBar.includes('listCommandHistory'), 'CommandBar 应支持历史重放动态项');
check(commandBar.includes('history-'), 'CommandBar 历史重放项应有稳定 id 前缀');


// ── 8b. agentRouter 路由层（Phase 8） ─────────────────
const agentRouterPath = path.join(srcRoot, 'lib/agentRouter.ts');
check(exists(agentRouterPath), 'agentRouter.ts 应位于 lib/ 目录');
if (exists(agentRouterPath)) {
  const agentRouter = read(agentRouterPath);
  check(agentRouter.includes('export function routeQuery'), 'agentRouter 应导出 routeQuery 路由函数');
  check(agentRouter.includes('AgentRoute'), 'agentRouter 应定义 AgentRoute 类型');
  check(agentRouter.includes('QUESTION_INTENT'), 'agentRouter 应定义问句意图路由表');
  check(agentRouter.includes('TOPIC_KEYWORDS'), 'agentRouter 应定义主题关键词锚点');
  check(agentRouter.includes('alternatives'), 'agentRouter 应支持次要建议模块');
  check(agentRouter.includes('性格'), 'agentRouter 应覆盖性格分析锚点');
  check(agentRouter.includes('学业'), 'agentRouter 应覆盖学业考试锚点');
  check(agentRouter.includes('紫微'), 'agentRouter 应覆盖紫微斗数锚点');
}

check(commandBar.includes('routeQuery'), 'CommandBar 应接入工具建议路由');
check(commandBar.includes('agent-route-'), 'CommandBar 应提供工具建议动态项');
check(commandBar.includes('建议打开'), 'CommandBar 工具建议项应可识别');
check(commandBar.includes('pendingRoute'), 'CommandBar 应维护待确认工具建议');
check(commandBar.includes('AgentConfirmPanel'), 'CommandBar 应挂载工具建议确认面板');

const agentConfirmPath = path.join(srcRoot, 'components/app-shell/AgentConfirmPanel.tsx');
check(exists(agentConfirmPath), 'AgentConfirmPanel.tsx 应位于 app-shell 目录');
if (exists(agentConfirmPath)) {
  const agentConfirm = read(agentConfirmPath);
  check(agentConfirm.includes('export function AgentConfirmPanel'), 'AgentConfirmPanel 应导出组件');
  check(agentConfirm.includes('data-testid="agent-confirm-panel"'), 'AgentConfirmPanel 应有稳定 testid');
  check(agentConfirm.includes('agent-confirm-execute'), 'AgentConfirmPanel 应有确认执行按钮');
  check(agentConfirm.includes('agent-confirm-cancel'), 'AgentConfirmPanel 应有取消按钮');
  check(agentConfirm.includes('agent-confirm-birth'), 'AgentConfirmPanel 应展示生辰预填信息');
  check(agentConfirm.includes('agent-confirm-alternatives'), 'AgentConfirmPanel 应展示次要建议');
}



const copyButton = read(path.join(srcRoot, 'components/shared/CopyContextButton.tsx'));
check(copyButton.includes("'copied'"), 'CopyContextButton 应包含 copied 状态');
check(copyButton.includes("'已复制'"), 'CopyContextButton 复制成功应显示已复制');
check(copyButton.includes('commandScope'), 'CopyContextButton 应支持 CommandBar commandScope');
check(copyButton.includes('COPY_CONTEXT_INTENT'), 'CopyContextButton 应监听复制命令意图');

const interpretationPath = path.join(srcRoot, 'components/shared/InterpretationCard.tsx');
const legendPath = path.join(srcRoot, 'components/shared/LegendPanel.tsx');
check(exists(interpretationPath), 'InterpretationCard.tsx 应位于 components/shared/ 目录');
check(exists(legendPath), 'LegendPanel.tsx 应位于 components/shared/ 目录');
if (exists(interpretationPath)) {
  const interpretation = read(interpretationPath);
  check(interpretation.includes('InterpretationItem'), 'InterpretationCard 应支持结构化解读条目');
}
if (exists(legendPath)) {
  const legend = read(legendPath);
  check(legend.includes('LegendItem'), 'LegendPanel 应支持结构化图例条目');
}
const feixingWorkspaceForShared = read(path.join(srcRoot, 'features/feixing/FeixingWorkspace.tsx'));
check(feixingWorkspaceForShared.includes('InterpretationCard'), 'FeixingWorkspace 应接入 InterpretationCard');
check(feixingWorkspaceForShared.includes('LegendPanel'), 'FeixingWorkspace 应接入 LegendPanel');

// ── 汇总 ─────────────────────────────────────────────────
const line = '─'.repeat(56);
console.log(line);
console.log('React Shell smoke test');
console.log(line);
console.log(`passed: ${passed}`);
console.log(`failed: ${failed}`);
if (failures.length > 0) {
  console.log('');
  console.log('failures:');
  for (const f of failures) console.log(`  ✗ ${f}`);
}
console.log(line);

if (failed > 0) process.exit(1);
