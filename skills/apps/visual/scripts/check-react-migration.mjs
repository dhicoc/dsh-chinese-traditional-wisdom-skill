import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const appRoot = path.join(root, "apps", "visual");
const srcRoot = path.join(appRoot, "src");

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
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function moduleIdsFromModulesSource(source) {
  const unionBlock = source.match(/export type ModuleId =([\s\S]*?);/);
  if (!unionBlock) return [];
  return Array.from(unionBlock[1].matchAll(/'([^']+)'/g)).map((match) => match[1]);
}

// ── React 架构核心模块应存在（不再依赖 loadLegacyScripts / 旧 visual/react.html）──
check(exists("apps/visual/src/lib/commandIntents.ts"), "应存在 CommandBar 命令意图模块 commandIntents.ts");
check(exists("apps/visual/src/components/shared/InterpretationCard.tsx"), "应存在通用 InterpretationCard.tsx");
check(exists("apps/visual/src/components/shared/LegendPanel.tsx"), "应存在通用 LegendPanel.tsx");
check(exists("apps/visual/scripts/generate-verify-page.mjs"), "应保留 React Shell verify.html 生成脚本");
check(exists("apps/visual/src/legacy/engineAdapters.ts"), "应存在 React 侧 EngineAdapterRegistry 包装模块");
check(exists("apps/visual/index.html"), "应存在 apps/visual/index.html 作为 React Dashboard vite 入口");
check(!exists("apps/visual/src/legacy/loadLegacyScripts.ts"), "loadLegacyScripts 桥接应已移除（纯 TS 引擎直连）");

const modules = read("apps/visual/src/lib/modules.ts");
const registry = read("apps/visual/src/components/app-shell/workspaceRegistry.tsx");
const commandBar = read("apps/visual/src/components/app-shell/CommandBar.tsx");
const commandIntents = read("apps/visual/src/lib/commandIntents.ts");
const copyButton = read("apps/visual/src/components/shared/CopyContextButton.tsx");
const homeDashboard = read("apps/visual/src/features/home/HomeDashboard.tsx");
const splitReader = read("apps/visual/src/features/knowledge/AncientTextSplitReader.tsx");
const testConsole = read("apps/visual/src/features/testing/TestRunnerConsole.tsx");
const testRegistry = read("apps/visual/src/legacy/testRegistry.ts");
const feixing = read("apps/visual/src/features/feixing/FeixingWorkspace.tsx");
const yunqi = read("apps/visual/src/features/yunqi/YunqiWorkspace.tsx");
const smoke = read("apps/visual/scripts/smoke-react-shell.mjs");
const engineAdapters = read("apps/visual/src/legacy/engineAdapters.ts");
const baziWorkspace = read("apps/visual/src/features/bazi/BaziWorkspace.tsx");
const ziweiWorkspace = read("apps/visual/src/features/ziwei/ZiweiWorkspace.tsx");

const ids = moduleIdsFromModulesSource(modules);
const workspaceIds = ids.filter((value) => value !== "home" && value !== "testing");
check(ids.includes("home"), "MODULES 应保留 home 模块 id");
check(ids.length >= 14, "React MODULES 应覆盖 home + 至少 13 个工作区模块（当前含日用工具/测试/阅读器/历史，数量随演进增长）");
for (const id of workspaceIds) {
  check(registry.includes(id + ":"), "workspaceRegistry 应注册模块 " + id);
}
check(registry.includes("HomeDashboard"), "workspaceRegistry 应把未命中模块回退到 HomeDashboard");

// ── CommandBar 行为契约（保留）──
check(!commandBar.includes("querySelector"), "CommandBar 不应通过 querySelector 直接操作 DOM");
check(commandBar.includes("dispatchCopyContextIntent"), "CommandBar 复制上下文应派发 copy intent");
check(commandBar.includes("ArrowDown"), "CommandBar 应支持 ArrowDown 键盘导航");
check(commandBar.includes("ArrowUp"), "CommandBar 应支持 ArrowUp 键盘导航");
check(commandBar.includes("Enter"), "CommandBar 应支持 Enter 选择命令");
check(commandBar.includes("ctrlKey") && commandBar.includes("metaKey"), "CommandBar 应支持 Ctrl+K / Cmd+K 打开");

// ── 命令意图与复制上下文（保留）──
check(commandIntents.includes("ctw:copy-context"), "commandIntents 应定义复制上下文事件名");
check(commandIntents.includes("ctw:set-year"), "commandIntents 应定义年份跳转事件名");
check(commandIntents.includes("extractCommandYear"), "commandIntents 应暴露年份解析函数");
check(copyButton.includes("commandScope"), "CopyContextButton 应支持 commandScope 作用域");
check(copyButton.includes("COPY_CONTEXT_INTENT"), "CopyContextButton 应监听 CommandBar copy intent");
check(homeDashboard.includes('commandScope="home"'), "HomeDashboard 应提供首页上下文复制作用域");

// ── 引擎调用契约（预存重构后：Workspace 直连纯 TS 引擎，不走 LegacyAdapter）──
check(engineAdapters.includes("getLegacyEngineAdapter"), "engineAdapters 应保留 getLegacyEngineAdapter 包装（兼容层）");
check(baziWorkspace.includes("useBirth"), "BaziWorkspace 应使用全局生辰上下文");
check(baziWorkspace.includes("calcBaziEnveloped") || baziWorkspace.includes("calculateBazi"), "BaziWorkspace 应直连纯 TS baziEngine 计算");
check(ziweiWorkspace.includes("useBirth"), "ZiweiWorkspace 应使用全局生辰上下文");

// ── 年份跳转（保留）──
check(feixing.includes("readPendingCommandYear('feixing')"), "FeixingWorkspace 应读取 CommandBar 暂存年份");
check(feixing.includes("YEAR_INTENT_EVENT"), "FeixingWorkspace 应监听年份跳转事件");
check(feixing.includes("InterpretationCard"), "FeixingWorkspace 应接入 InterpretationCard");
check(feixing.includes("LegendPanel"), "FeixingWorkspace 应接入 LegendPanel");
check(yunqi.includes("readPendingCommandYear('yunqi'"), "YunqiWorkspace 应读取 CommandBar 暂存年份");
check(yunqi.includes("YEAR_INTENT_EVENT"), "YunqiWorkspace 应监听年份跳转事件");

// ── 首页与知识阅读器（保留；HomeDashboard 用 toolRegistry 而非旧 visual capabilities）──
check(homeDashboard.includes("getLegacyTools") && homeDashboard.includes("getCapabilityForTool"), "HomeDashboard 应接入 toolRegistry 的 ToolManifest / Capability 数据");
check(splitReader.includes("?raw"), "AncientTextSplitReader 应通过构建期 ?raw 引入古籍/映射内容");
check(testConsole.includes("TEST_SUITES"), "TestRunnerConsole 应使用 TEST_SUITES 注册表");
check(testRegistry.includes("check-react-migration"), "TestRunnerConsole 注册表应包含 React 迁移契约测试");
check(smoke.includes("InterpretationCard.tsx") && smoke.includes("LegendPanel.tsx"), "React Shell 冒烟测试应覆盖通用解读/图例组件");

check(modules.includes("紫微斗数") && modules.includes("十二宫"), "MODULES 紫微说明应含十二宫排盘口径");
check(modules.includes("数字起卦"), "MODULES 梅花说明应同步数字起卦能力口径");

console.log("React migration contract check");
console.log("passed:", passed);
console.log("failed:", failed);
if (failed > 0) {
  console.error("Failures:");
  failures.forEach((message) => console.error("- " + message));
  process.exit(1);
}
