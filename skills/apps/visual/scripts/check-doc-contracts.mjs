import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
let passed = 0;
let failed = 0;
const failures = [];

function check(condition, message) {
  if (condition) passed++;
  else {
    failed++;
    failures.push(message);
  }
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

const requiredFiles = [
  "README.md",
  "README_en.md",
  "README_AI.md",
  "SKILL.md",
  "RULES.md",
  "tool-index.md",
  "EVOLUTION.md",
  "ROADMAP.md",
  "docs/RESEARCH-ROADMAP.md",
  "docs/RULE-CHANGELOG.md",
  "docs/ENGINE-PACKAGE-EVALUATION.md",
  "requirements.txt",
  "apps/visual/package.json",
  "apps/visual/scripts/run-engine.ts",
  "apps/visual/src/legacy/directRunner.ts",
  "apps/visual/src/legacy/baseTypes.ts",
  "apps/visual/src/legacy/trueSolarTime.ts",
  "apps/visual/src/lib/modules.ts",
  "templates/visual-report.md",
  "knowledge-base/fengshui/mappings/SCHEMA.md",
  "knowledge-base/fengshui/mappings/life-trigram.json",
  "knowledge-base/fengshui/mappings/eight-mansions.json",
  "knowledge-base/fengshui/mappings/twenty-four-mountains.json",
  "knowledge-base/fengshui/mappings/yearly-flying-stars.json",
  "knowledge-base/fengshui/mappings/three-essentials.json",
  "knowledge-base/fengshui/mappings/form-sha-cures.json",
  "bootstrap/bazi-engine.md",
  "bootstrap/ziwei-engine.md",
  "bootstrap/liuyao-engine.md",
  "bootstrap/meihua-yishu-engine.md",
  "bootstrap/yunqi-integration.md",
  "bootstrap/constitution-questionnaire.md",
  "bootstrap/fengshui-guide.md"
];
requiredFiles.forEach((relPath) => check(exists(relPath), `缺少直调架构文件: ${relPath}`));

const docs = Object.fromEntries([
  "README.md",
  "README_AI.md",
  "SKILL.md",
  "RULES.md",
  "tool-index.md",
  "ROADMAP.md",
  "EVOLUTION.md",
  "docs/RESEARCH-ROADMAP.md"
].map((relPath) => [relPath, read(relPath)]));
const readmeEnglish = read("README_en.md");
const runner = read("apps/visual/scripts/run-engine.ts");
const packageJson = read("apps/visual/package.json");
const packageLockPath = path.join(root, "apps/visual/package-lock.json");
const releaseVerification = read("docs/RELEASE-VERIFICATION.md");
const ruleChangelog = read("docs/RULE-CHANGELOG.md");
const enginePackageEvaluation = read("docs/ENGINE-PACKAGE-EVALUATION.md");
const pythonRequirements = read("requirements.txt");
const directRunner = read("apps/visual/src/legacy/directRunner.ts");
const localToolRegistry = read("apps/visual/src/legacy/localToolRegistry.ts");
const trueSolarTime = read("apps/visual/src/legacy/trueSolarTime.ts");
const modules = read("apps/visual/src/lib/modules.ts");

function extractMatches(content, pattern) {
  return [...content.matchAll(pattern)].map((match) => match[1]);
}

function checkSameToolNames(label, actual, expected) {
  const actualNames = [...new Set(actual)];
  const missing = expected.filter((name) => !actualNames.includes(name));
  const unexpected = actualNames.filter((name) => !expected.includes(name));
  check(missing.length === 0 && unexpected.length === 0 && actualNames.length === expected.length,
    `${label} 与 LOCAL_TOOL_NAMES 不一致：缺少 ${missing.join('、') || '无'}；多出 ${unexpected.join('、') || '无'}。`);
}

for (const [name, content] of Object.entries(docs)) {
  check(content.includes("ToolEnvelope"), `${name} 缺少 ToolEnvelope 直调契约`);
  check(content.includes("local-exact") || content.includes("本地精确"), `${name} 缺少 local-exact / 本地精确口径`);
  check(content.includes("local-approx") || content.includes("本地近似"), `${name} 缺少 local-approx / 本地近似口径`);
  check(content.includes("模型不得自行推演") || content.includes("不得自行推演") || content.includes("禁止模型自行推演"), `${name} 缺少禁止模型自行推演规则`);
  check(!/\bMCP\b|mcp-server|setup-mcp|stdio|JSON-RPC|MCP SDK|presentationToken|numericAssertionToken/.test(content), `${name} 仍含已移除架构术语`);
}

check(docs["README.md"].includes("README_en.md") && readmeEnglish.includes("README.md"),
  "中英文 README 缺少双向语言跳转链接。");
check(readmeEnglish.includes("ToolEnvelope") && readmeEnglish.includes("local-exact") && readmeEnglish.includes("local-approx"),
  "README_en.md 缺少本地结果或计算口径说明。");
check(readmeEnglish.includes("resolve_true_solar_time") && readmeEnglish.includes("trueSolarBirth") && readmeEnglish.includes("trueSolarResolution"),
  "README_en.md 缺少真太阳时输入或输出说明。");
check(readmeEnglish.includes("transitDate") && readmeEnglish.includes("local-fallback"),
  "README_en.md 缺少八字动态层说明。");
check(!/\bMCP\b|mcp-server|setup-mcp|stdio|JSON-RPC|MCP SDK|presentationToken|numericAssertionToken/.test(readmeEnglish),
  "README_en.md 仍含已移除架构术语。");

check(runner.includes("runLocalTool"), "run-engine.ts 未调用本地 direct runner");
check(runner.includes("pnpm engine <tool> <input-json-file>"), "run-engine.ts 缺少 CLI 用法");
check(packageJson.includes('"engine": "tsx scripts/run-engine.ts"'), "apps/visual/package.json 缺少 engine script");
check(packageJson.includes('"packageManager": "pnpm@10.26.1"'), "apps/visual/package.json 必须固定 pnpm 10.26.1。");
check(packageJson.includes('"node": ">=24.12.0 <25"'), "apps/visual/package.json 必须声明 Node 24.12.x 运行范围。");
check(!packageJson.includes('"latest"'), "apps/visual/package.json 不得使用 latest 依赖范围。");
check(!fs.existsSync(packageLockPath), "apps/visual 不得维护非权威的 package-lock.json。");
check(releaseVerification.includes("pnpm install --frozen-lockfile"), "RELEASE-VERIFICATION.md 必须使用冻结 pnpm 安装。");
for (const qualityGate of [
  "check-doc-contracts.mjs",
  "check-knowledge-references.mjs",
  "check-mapping-schema.mjs",
  "check-react-migration.mjs",
  "check-search-index.mjs",
]) {
  check(releaseVerification.includes(qualityGate), `RELEASE-VERIFICATION.md 缺少阶段 E 质量门: ${qualityGate}`);
}
check(pythonRequirements.includes("not required to install, publish, or run the Dashboard or CLI"),
  "requirements.txt 必须声明 Python 依赖仅用于离线交叉校验。");
check(ruleChangelog.includes("## 变更条目格式") && ruleChangelog.includes("兼容性影响") && ruleChangelog.includes("回归证据"),
  "RULE-CHANGELOG.md 必须记录来源、兼容性影响与回归证据。");
check(enginePackageEvaluation.includes("## 结论：暂不拆分") && enginePackageEvaluation.includes("pnpm engine") && enginePackageEvaluation.includes("ToolEnvelope") && enginePackageEvaluation.includes("Dashboard"),
  "ENGINE-PACKAGE-EVALUATION.md 必须记录本地包拆分的 CLI、结果契约与 Dashboard 兼容性结论。");
check(directRunner.includes("runLocalTool"), "directRunner.ts 缺少 runLocalTool");

const localToolNames = extractMatches(
  localToolRegistry.match(/export const LOCAL_TOOL_REGISTRY = \{([\s\S]*?)\} as const/)?.[1] ?? '',
  /^\s{2}([a-z_]+): \{\},$/gm,
);
check(localToolNames.length > 0, "localToolRegistry.ts 缺少 LOCAL_TOOL_REGISTRY 运行时清单");
check(directRunner.includes('parseLocalToolCall'), "directRunner.ts 未通过共享工具契约解析输入");

const toolIndex = docs["tool-index.md"];
const documentedTools = extractMatches(toolIndex, /\| `([^`]+)` \| `src\/__fixtures__\/local-tools\/[^`]+\.success\.json` \|/g);
checkSameToolNames("tool-index.md CLI 工具表", documentedTools, localToolNames);

for (const tool of localToolNames) {
  const successFixturePath = `apps/visual/src/__fixtures__/local-tools/${tool}.success.json`;
  const boundaryFixturePath = `apps/visual/src/__fixtures__/local-tools/${tool}.boundary.json`;
  const failureFixturePath = `apps/visual/src/__fixtures__/local-tools/${tool}.failure.json`;
  check(exists(successFixturePath), `缺少 ${tool} 的 success fixture: ${successFixturePath}`);
  check(exists(boundaryFixturePath), `缺少 ${tool} 的 boundary fixture: ${boundaryFixturePath}`);
  check(exists(failureFixturePath), `缺少 ${tool} 的 failure fixture: ${failureFixturePath}`);
  check(toolIndex.includes(`| \`${tool}\` | \`src/__fixtures__/local-tools/${tool}.success.json\` |`),
    `tool-index.md 缺少 ${tool} 的 CLI fixture 行。`);
}

const trueSolarTimeFixtureMatrix = [
  "apps/visual/src/__fixtures__/local-tools/resolve_true_solar_time.success.json",
  "apps/visual/src/__fixtures__/local-tools/resolve_true_solar_time.cross-date.success.json",
  "apps/visual/src/__fixtures__/local-tools/resolve_true_solar_time.shichen-zi-chu.success.json",
  "apps/visual/src/__fixtures__/local-tools/bazi_calculate.civil-fallback.success.json",
];
for (const fixturePath of trueSolarTimeFixtureMatrix) {
  check(exists(fixturePath), `缺少真太阳时固定矩阵 fixture: ${fixturePath}`);
}
check(toolIndex.includes("真太阳时固定 fixture 矩阵"), "tool-index.md 缺少真太阳时固定 fixture 矩阵说明。");
for (const fixtureName of trueSolarTimeFixtureMatrix.map((fixturePath) => path.basename(fixturePath))) {
  check(toolIndex.includes(fixtureName), `tool-index.md 缺少真太阳时矩阵 fixture: ${fixtureName}`);
}

check(trueSolarTime.includes("resolveTrueSolarTime"), "trueSolarTime.ts 缺少本地校准函数");
for (const [name, content] of Object.entries(docs)) {
  check(content.includes("resolve_true_solar_time"), `${name} 缺少真太阳时入口`);
  check(content.includes("trueSolarBirth"), `${name} 缺少 trueSolarBirth 传递规则`);
  check(content.includes("trueSolarResolution"), `${name} 缺少 trueSolarResolution 传递规则`);
  check(content.includes("未完成真太阳时复核"), `${name} 缺少民用时间 fallback 标识`);
}

check(modules.includes("export const MODULES"), "modules.ts 缺少 MODULES 注册表");
check(modules.includes("getModuleById"), "modules.ts 缺少 getModuleById");

const mappingDir = path.join(root, "knowledge-base", "fengshui", "mappings");
const mappingCount = fs.readdirSync(mappingDir).filter((name) => name.endsWith(".json")).length;
check(mappingCount === 6, `映射表数量应为 6，当前为 ${mappingCount}`);

const baziGuide = read("bootstrap/bazi-engine.md");
const fengshuiGuide = read("bootstrap/fengshui-guide.md");
const ziweiGuide = read("bootstrap/ziwei-engine.md");
const yunqiGuide = read("bootstrap/yunqi-integration.md");
const liuyaoGuide = read("bootstrap/liuyao-engine.md");
const meihuaGuide = read("bootstrap/meihua-yishu-engine.md");
const constitutionGuide = read("bootstrap/constitution-questionnaire.md");
const engineFixtures = read("docs/ENGINE-REGRESSION-FIXTURES.md");
const visualReportTemplate = read("templates/visual-report.md");
const templateFiles = [
  "templates/career-consultation.md",
  "templates/comprehensive-report.md",
  "templates/health-consultation.md",
  "templates/marriage-consultation.md",
  "reference-tcm.md",
];
const templateContent = templateFiles.map(read).join("\n");
const allCheckedDocumentation = [
  ...Object.values(docs),
  baziGuide,
  fengshuiGuide,
  ziweiGuide,
  yunqiGuide,
  liuyaoGuide,
  meihuaGuide,
  constitutionGuide,
  engineFixtures,
  visualReportTemplate,
  templateContent,
].join("\n");

check(baziGuide.includes("timeBasis") && baziGuide.includes("civilFallbackConfirmed"),
  "bootstrap/bazi-engine.md 缺少 CLI 必填的 timeBasis / civilFallbackConfirmed 规则。");
check(baziGuide.includes("TrueSolarTimeResolution"),
  "bootstrap/bazi-engine.md 未说明 resolve_true_solar_time 的 TrueSolarTimeResolution 返回例外。");
check(baziGuide.includes("transitDate") && baziGuide.includes("ToolEnvelope.data.transit") && baziGuide.includes("bazi_calculate.transit.success.json"),
  "bootstrap/bazi-engine.md 缺少八字动态层的 transitDate、data.transit 或 CLI fixture 说明。");
check(docs["SKILL.md"].includes("transitDate") && docs["SKILL.md"].includes("local-fallback"),
  "SKILL.md 缺少八字动态层的 transitDate 或小运降级披露规则。");
check(docs["README_AI.md"].includes("transitDate") && docs["README_AI.md"].includes("ToolEnvelope.data.transit"),
  "README_AI.md 缺少八字动态层的 transitDate 或 data.transit 路由说明。");
check(toolIndex.includes("bazi_calculate.transit.success.json") && toolIndex.includes("bazi_calculate.transit.failure.json"),
  "tool-index.md 缺少八字动态层的 success 或 failure fixture 导航。");
check(!yunqiGuide.includes("| solar |"),
  "bootstrap/yunqi-integration.md 将内部 solar 参数误写为 CLI 输入。");
check(yunqiGuide.includes("validateCalendarClaims('yunqi', data, claims)"),
  "bootstrap/yunqi-integration.md 缺少 validateCalendarClaims 的 resultKind 参数。");
check(liuyaoGuide.includes("validateDivinationClaims('cast_liuyao', data, claims)"),
  "bootstrap/liuyao-engine.md 缺少 validateDivinationClaims 的工具参数。");
check(meihuaGuide.includes("validateDivinationClaims('cast_meihua', data, claims)"),
  "bootstrap/meihua-yishu-engine.md 缺少 validateDivinationClaims 的工具参数。");
check(!meihuaGuide.includes("local-approx"),
  "bootstrap/meihua-yishu-engine.md 错误声明梅花降级模式为 local-approx。");
check(constitutionGuide.includes("validateDailyClaims('assess_constitution', data, claims)"),
  "bootstrap/constitution-questionnaire.md 缺少 validateDailyClaims 的工具参数。");
check(fengshuiGuide.includes("result_meta.calculationConfig"),
  "bootstrap/fengshui-guide.md 缺少风水计算口径披露规则。");
check(ziweiGuide.includes("result_meta.calculationConfig"),
  "bootstrap/ziwei-engine.md 缺少紫微计算口径披露规则。");
check(engineFixtures.includes("lunar-typescript") && !engineFixtures.includes("lunar-javascript") && engineFixtures.includes("calc_feixing") && engineFixtures.includes("calc_bazhai") && engineFixtures.includes("get_almanac"),
  "ENGINE-REGRESSION-FIXTURES.md 未同步 lunar-typescript 或 P9 calculationConfig 覆盖。");
check(visualReportTemplate.includes("本次本地 ToolEnvelope") && visualReportTemplate.includes("result_meta.calculationConfig"),
  "templates/visual-report.md 未要求使用本次本地 ToolEnvelope 与 calculationConfig。");

const forbiddenLegacyReferences = /calculate_yunqi_api\.py|ziwei-doushu|heming-knowledge|lunar-javascript|#外部参考来源归档/;
check(!forbiddenLegacyReferences.test(allCheckedDocumentation),
  "文档仍含已移除的工具、依赖或失效锚点引用。");

console.log(`doc contracts: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  failures.forEach((message) => console.error(`- ${message}`));
  process.exitCode = 1;
}
