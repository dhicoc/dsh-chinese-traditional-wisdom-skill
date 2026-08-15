import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");

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

// ── 搜索引擎源（已迁移为纯 TS，不再依赖旧 visual/js/search.js）──
const enginePath = "apps/visual/src/legacy/searchEngine.ts";
const termJsonPath = "apps/visual/src/legacy/termExplanations.json";
const modalPath = "apps/visual/src/features/search/SearchModal.tsx";

check(exists(enginePath), "应存在 apps/visual/src/legacy/searchEngine.ts 搜索引擎纯函数");
check(exists(termJsonPath), "应存在 termExplanations.json 术语数据");
check(exists(modalPath), "应存在 features/search/SearchModal.tsx 搜索浮层组件");
check(!exists("visual/js/search.js"), "旧 visual/js/search.js 应已移除");

const engine = read(enginePath);
const modal = read(modalPath);

// ── 搜索引擎契约 ──
check(engine.includes("export function searchAll"), "searchEngine 应导出 searchAll(query)");
check(engine.includes("export function getIndexStats"), "searchEngine 应导出 getIndexStats()");
check(engine.includes("export interface SearchResult"), "searchEngine 应导出 SearchResult 类型");
check(engine.includes("export interface IndexStats"), "searchEngine 应导出 IndexStats 类型");

// ── 索引数量契约 ──
const mappingDir = path.join(root, "knowledge-base", "fengshui", "mappings");
const actualMappingFiles = fs.readdirSync(mappingDir).filter((name) => name.endsWith(".json"));
check(actualMappingFiles.length === 6, `映射表索引应覆盖 6 个 JSON 映射表，实际 ${actualMappingFiles.length}`);

// termExplanations 条数
const termJson = JSON.parse(read(termJsonPath));
const termCount = Object.keys(termJson).length;
check(termCount >= 280, `术语解释索引应 >= 280 条，实际 ${termCount}`);

// 古籍 Markdown 文件数（不含 _index.md；mappings/ 下的 SCHEMA.md 是 schema 文档不算古籍）
const fengshuiDir = path.join(root, "knowledge-base", "fengshui");
function collectMarkdownFiles(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (name === "mappings") continue; // mappings 目录放 JSON + SCHEMA.md，非古籍正文
      out.push(...collectMarkdownFiles(full));
    } else if (name.endsWith(".md") && name !== "_index.md") {
      out.push(path.relative(fengshuiDir, full).replace(/\\/g, "/"));
    }
  }
  return out;
}
const actualKbFiles = collectMarkdownFiles(fengshuiDir);

const kbIndexMatches = engine.match(/KB_INDEX:\s*KbIndex\[\]\s*=\s*\[/);
check(Boolean(kbIndexMatches), "searchEngine 应定义 KB_INDEX 古籍索引数组");
// 只数 KB_INDEX 数组段内的条目（MAPPING_INDEX 也是 { file, title } 格式，需隔离）
const kbSection = engine.slice(engine.indexOf("KB_INDEX:"));
const kbEntryCount = (kbSection.match(/\{ file: '[^']+', title:/g) || []).length;
check(kbEntryCount === actualKbFiles.length, `古籍索引条目数应与实际文件数一致（${actualKbFiles.length}），引擎内 ${kbEntryCount} 条`);

// ── 索引覆盖：每个映射表 JSON 应在 MAPPING_INDEX 中 ──
actualMappingFiles.forEach((file) => {
  check(engine.includes(`file: '${file}'`), `MAPPING_INDEX 应包含映射表 ${file}`);
});

// ── 索引覆盖：每个古籍 md（相对路径）应在 KB_INDEX 中 ──
actualKbFiles.forEach((file) => {
  check(engine.includes(`'${file}'`), `KB_INDEX 应包含古籍 ${file}`);
});
check(!engine.includes("'_index.md'"), "KB_INDEX 不应把 _index.md 当作正文条目");

// ── 浮层组件契约 ──
check(modal.includes("openSearchModal"), "SearchModal 应导出 openSearchModal 触发函数");
check(modal.includes("OPEN_SEARCH_INTENT_EVENT"), "SearchModal 应定义 OPEN_SEARCH_INTENT_EVENT 事件");
check(modal.includes("searchAll"), "SearchModal 应调用 searchAll 检索");
check(modal.includes("dispatchReaderSearchIntent"), "SearchModal 点击古籍应派发 reader 搜索意图");

// ── AppShell 挂载契约 ──
const appShell = read("apps/visual/src/components/app-shell/AppShell.tsx");
check(appShell.includes("SearchModal"), "AppShell 应挂载 SearchModal");
const commandBar = read("apps/visual/src/components/app-shell/CommandBar.tsx");
check(commandBar.includes("openSearchModal"), "CommandBar 应提供全局搜索入口命令");

console.log("────────────────────────────────────────────────────────");
console.log("search index contracts");
console.log("────────────────────────────────────────────────────────");
console.log(`passed: ${passed}`);
console.log(`failed: ${failed}`);
if (failed > 0) {
  failures.forEach((item) => console.error(`- ${item}`));
  process.exitCode = 1;
}
