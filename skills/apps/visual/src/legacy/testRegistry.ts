/**
 * 测试套件注册表 — 静态收集所有可执行测试的元信息。
 *
 * 分为两类：
 * - node:   Node.js CLI 测试（展示命令与预期数量）
 * - verify:  自动验证页（dist/verify.html，构建后可用）
 *
 * 旧 visual/test-runner.html 浏览器端测试已随静态运行时移除，引擎/渲染回归
 * 由 apps/visual 的 vitest 单元测试 + playwright e2e 覆盖。
 */

export type TestSuiteType = 'node' | 'browser' | 'verify';

export interface TestSuite {
  id: string;
  name: string;
  type: TestSuiteType;
  description: string;
  /** 预期测试项数（Node 测试从上次运行记录） */
  expectedCount: number;
  /** Node 测试的 CLI 命令 */
  cliCommand?: string;
  /** 验证页的入口 URL */
  url?: string;
  /** 测试覆盖的模块/能力 */
  covers: string[];
}

export const TEST_SUITES: TestSuite[] = [
  // ── Node CLI 测试 ──────────────────────────────────
  {
    id: 'smoke-react-shell',
    name: 'React Shell 结构冒烟测试',
    type: 'node',
    description: '验证 React Shell 的文件结构、路由注册、canvas 数量、legacy 桥接、CopyContextButton 契约等。',
    expectedCount: 166,
    cliCommand: 'cd apps/visual && pnpm test',
    covers: ['AppShell', 'workspaceRegistry', 'CopyContextButton', 'DynamicTianPanBackground', 'pure-ts-engines'],
  },
  {
    id: 'check-react-migration',
    name: 'React 迁移契约检查',
    type: 'node',
    description: '验证 Phase 5-11 的核心迁移契约：CommandBar 不直接操作 DOM、年份跳转、Split Reader、测试控制台与通用解读/图例组件。',
    expectedCount: 58,
    cliCommand: 'node apps/visual/scripts/check-react-migration.mjs',
    covers: ['CommandBar', 'commandIntents', 'InterpretationCard', 'LegendPanel', 'AncientTextSplitReader', 'TestRunnerConsole'],
  },
  {
    id: 'check-doc-contracts',
    name: '文档契约检查',
    type: 'node',
    description: '验证 README / SKILL / tool-index / EVOLUTION 等文档中引用的文件、映射表、引擎脚本确实存在。',
    expectedCount: 58,
    cliCommand: 'node apps/visual/scripts/check-doc-contracts.mjs',
    covers: ['README.md', 'SKILL.md', 'tool-index.md', 'knowledge-base/mappings'],
  },
  {
    id: 'check-mapping-schema',
    name: '风水映射表 schema 校验',
    type: 'node',
    description: '验证 6 个风水 JSON 映射表的字段完整性、方位覆盖、八宅与飞星规则结构。',
    expectedCount: 476,
    cliCommand: 'node apps/visual/scripts/check-mapping-schema.mjs',
    covers: ['life-trigram.json', 'eight-mansions.json', 'twenty-four-mountains.json', 'yearly-flying-stars.json', 'three-essentials.json', 'form-sha-cures.json'],
  },

  {
    id: 'check-knowledge-references',
    name: '知识引用浏览器校验',
    type: 'node',
    description: '验证知识引用查询模块、React 面板接入，以及二十四山、八宅、飞星等映射表可命中。',
    expectedCount: 37,
    cliCommand: 'node apps/visual/scripts/check-knowledge-references.mjs',
    covers: ['KnowledgeReferencePanel', 'queryKnowledgeReferences', 'fengshui/_index.md', 'fengshui/mappings'],
  },

  {
    id: 'check-search-index',
    name: '全局搜索索引校验',
    type: 'node',
    description: '验证 searchEngine.ts 的术语/映射表/古籍索引与实际文件清单对齐，并校验搜索浮层挂载与入口命令。',
    expectedCount: 59,
    cliCommand: 'node apps/visual/scripts/check-search-index.mjs',
    covers: ['knowledge-base/fengshui', 'GlobalSearch', 'KB_INDEX'],
  },

  // ── 自动验证页 ──────────────────────────────────────
  {
    id: 'verify-page',
    name: 'React Shell 自动验证页',
    type: 'verify',
    description: '构建后生成的 dist/verify.html，自动访问每个 hash 路由，检查标题、canvas 数量与非空像素。',
    expectedCount: 11,
    cliCommand: 'cd apps/visual && pnpm run build && pnpm run preview',
    url: '/verify.html',
    covers: ['所有模块路由', 'h2 标题', 'canvas 数量', 'canvas 像素'],
  },
];

export function getTestSuitesByType(type: TestSuiteType): TestSuite[] {
  return TEST_SUITES.filter((suite) => suite.type === type);
}

export function getTotalExpectedCount(): number {
  return TEST_SUITES.reduce((sum, suite) => sum + suite.expectedCount, 0);
}
