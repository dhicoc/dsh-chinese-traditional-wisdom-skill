import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const mappingDir = path.join(root, "knowledge-base", "fengshui", "mappings");

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

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(mappingDir, file), "utf8"));
}

function stringify(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(stringify).join(" ");
  if (typeof value === "object") return Object.values(value).map(stringify).join(" ");
  return String(value);
}

function contains(value, term) {
  return stringify(value).includes(term);
}

const knowledgeReferencePath = "apps/visual/src/lib/knowledgeReference.ts";
const panelPath = "apps/visual/src/components/shared/KnowledgeReferencePanel.tsx";
const workspaces = [
  "apps/visual/src/features/fengshui/FengshuiWorkspace.tsx",
  "apps/visual/src/features/bazhai/BazhaiWorkspace.tsx",
  "apps/visual/src/features/feixing/FeixingWorkspace.tsx"
];

check(fs.existsSync(path.join(root, knowledgeReferencePath)), "应存在 knowledgeReference.ts 查询模块");
check(fs.existsSync(path.join(root, panelPath)), "应存在 KnowledgeReferencePanel.tsx 组件");

const knowledgeReference = read(knowledgeReferencePath);
const panel = read(panelPath);

[
  "life-trigram.json",
  "eight-mansions.json",
  "twenty-four-mountains.json",
  "yearly-flying-stars.json",
  "three-essentials.json",
  "form-sha-cures.json"
].forEach((file) => {
  check(knowledgeReference.includes(file), "knowledgeReference.ts 应导入 " + file);
});
check(knowledgeReference.includes("searchAll"), "knowledgeReference.ts 应复用古籍书目索引");
check(knowledgeReference.includes("citationId"), "knowledgeReference.ts 应传递稳定 citation ID");
check(knowledgeReference.includes("queryKnowledgeReferences"), "knowledgeReference.ts 应导出 queryKnowledgeReferences");
check(knowledgeReference.includes("KnowledgeReferenceHit"), "knowledgeReference.ts 应导出 KnowledgeReferenceHit 类型");
check(panel.includes("queryKnowledgeReferences"), "KnowledgeReferencePanel 应调用 queryKnowledgeReferences");
check(panel.includes("citationId"), "KnowledgeReferencePanel 应展示古籍 citation ID");
check(panel.includes("映射表") && panel.includes("古籍索引"), "KnowledgeReferencePanel 应区分映射表与古籍索引");
check(panel.includes("点击术语") || panel.includes("输入关键词"), "KnowledgeReferencePanel 应提示点击术语或输入关键词");

workspaces.forEach((file) => {
  const source = read(file);
  check(source.includes("KnowledgeReferencePanel"), file + " 应接入 KnowledgeReferencePanel");
  check(source.includes("initialTerm"), file + " 应提供 initialTerm");
  // terms prop 可为数组字面量 terms={[ 或预处理变量 terms={xxx}，均算提供可点击术语列表
  check(/terms=\{/.test(source), file + " 应提供可点击术语列表 terms prop");
});

const mountains = readJson("twenty-four-mountains.json");
check(mountains.data.some((row) => row.mountain === "子" && row.bagua === "坎"), "二十四山应能以“坎/子”命中罗盘映射");
check(Object.values(mountains.trigram_to_mountains).some((items) => items.includes("壬") && items.includes("子") && items.includes("癸")), "二十四山应提供八卦三山反查");

const eightMansions = readJson("eight-mansions.json");
check(Boolean(eightMansions.legend.star_meanings["生气"]), "八宅应能以“生气”命中游年星义");
check(Object.values(eightMansions.data).some((table) => Object.keys(table).some((key) => key.includes("北"))), "八宅应能以方位命中命卦表");

const flyingStars = readJson("yearly-flying-stars.json");
check(Object.values(flyingStars.nine_stars).some((star) => star.name === "五黄"), "飞星应能以“五黄”命中九星表");
check(Object.values(flyingStars.nine_stars).some((star) => contains(star, "病符")), "飞星应能以“病符”命中二黑星义");

const lifeTrigram = readJson("life-trigram.json");
check(Object.values(lifeTrigram.remainder_to_trigram).some((item) => item.trigram === "坎"), "命卦应能以“坎”命中余数映射");
check(contains(lifeTrigram.east_group, "东四命") && contains(lifeTrigram.west_group, "西四命"), "命卦应提供东四命/西四命分组引用");

const threeEssentials = readJson("three-essentials.json");
check(Boolean(threeEssentials.concept["门"]), "阳宅三要应能以“门”命中概念引用");
check(threeEssentials.door_main_combinations.key_combinations.some((item) => contains(item, "乾门")), "阳宅三要应能命中门主组合引用");

const formSha = readJson("form-sha-cures.json");
check(formSha.form_sha_table.some((item) => item.name === "反弓煞"), "形煞表应能以“反弓煞”命中条目");
check(formSha.form_sha_table.some((item) => contains(item, "八卦镜")), "形煞表应提供化解字段引用");

const fengshuiIndex = read("knowledge-base/fengshui/_index.md");
check(fengshuiIndex.includes("八宅") || fengshuiIndex.includes("阳宅"), "风水知识库索引应提供古籍入口线索");
check(knowledgeReference.includes("queryAncientIndex"), "knowledgeReference.ts 应实现古籍索引查询");

console.log('knowledge references: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  failures.forEach((item) => console.error('- ' + item));
  process.exitCode = 1;
}
