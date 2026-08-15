import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const mappingDir = path.join(root, "knowledge-base", "fengshui", "mappings");
const directions = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
const files = [
  "life-trigram.json",
  "eight-mansions.json",
  "twenty-four-mountains.json",
  "yearly-flying-stars.json",
  "three-essentials.json",
  "form-sha-cures.json"
];

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

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(mappingDir, file), "utf8"));
}

function hasKeys(obj, keys, label) {
  keys.forEach((key) => check(obj && Object.prototype.hasOwnProperty.call(obj, key), `${label} 缺少 ${key}`));
}

files.forEach((file) => {
  check(fs.existsSync(path.join(mappingDir, file)), `${file} 文件不存在`);
});

const all = Object.fromEntries(files.map((file) => [file, readJson(file)]));
Object.entries(all).forEach(([file, json]) => hasKeys(json, ["name", "description", "source", "version"], file));

const life = all["life-trigram.json"];
hasKeys(life, ["formula", "remainder_to_trigram", "east_group", "west_group"], "life-trigram.json");
for (let i = 1; i <= 9; i++) check(Boolean(life.remainder_to_trigram[String(i)]), `life-trigram.json 缺少余数 ${i}`);
["east_group", "west_group"].forEach((group) => hasKeys(life[group], ["name", "trigrams", "lucky_directions", "unlucky_directions"], `life-trigram.json ${group}`));

const mansions = all["eight-mansions.json"];
hasKeys(mansions, ["legend", "data"], "eight-mansions.json");
["生气", "天医", "延年", "伏位", "绝命", "五鬼", "六煞", "祸害"].forEach((star) => {
  check(Boolean(mansions.legend.star_meanings[star]), `eight-mansions.json 缺少 ${star} 星义`);
});
Object.entries(mansions.data).forEach(([name, table]) => {
  directions.forEach((direction) => {
    check(Object.keys(table).some((key) => key.startsWith(direction + "(")), `eight-mansions.json ${name} 缺少 ${direction}`);
  });
});

const mountains = all["twenty-four-mountains.json"];
hasKeys(mountains, ["data", "trigram_to_mountains"], "twenty-four-mountains.json");
check(Array.isArray(mountains.data) && mountains.data.length === 24, "twenty-four-mountains.json data 必须为 24 条");
mountains.data.forEach((row, index) => {
  hasKeys(row, ["order", "mountain", "direction", "degree_start", "degree_end", "wuxing", "bagua"], `twenty-four-mountains.json 第 ${index + 1} 条`);
});
["坎", "艮", "震", "巽", "离", "坤", "兑", "乾"].forEach((trigram) => {
  check(Array.isArray(mountains.trigram_to_mountains[trigram]) && mountains.trigram_to_mountains[trigram].length === 3, `twenty-four-mountains.json 缺少 ${trigram} 三山`);
});

const flying = all["yearly-flying-stars.json"];
hasKeys(flying, ["nine_stars", "yearly_flying_stars"], "yearly-flying-stars.json");
for (let i = 1; i <= 9; i++) {
  hasKeys(flying.nine_stars[String(i)], ["name", "wuxing", "star_name", "luck", "meaning"], `yearly-flying-stars.json 九星 ${i}`);
}
check(Object.keys(flying.yearly_flying_stars).length >= 1, "yearly-flying-stars.json yearly_flying_stars 至少覆盖 1 年");

const essentials = all["three-essentials.json"];
hasKeys(essentials, ["concept", "door_main_combinations", "stove_rules"], "three-essentials.json");
["门", "主", "灶"].forEach((key) => check(Boolean(essentials.concept[key]), `three-essentials.json concept 缺少 ${key}`));
check(Array.isArray(essentials.door_main_combinations.key_combinations), "three-essentials.json 缺少 key_combinations 数组");

const sha = all["form-sha-cures.json"];
hasKeys(sha, ["categories", "form_sha_table"], "form-sha-cures.json");
check(Array.isArray(sha.form_sha_table) && sha.form_sha_table.length >= 1, "form-sha-cures.json form_sha_table 不应为空");
sha.form_sha_table.forEach((row, index) => {
  hasKeys(row, ["name", "type", "description", "severity", "effect", "standard_cure"], `form-sha-cures.json 第 ${index + 1} 条`);
});

console.log(`mapping schema: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  failures.forEach((item) => console.error(`- ${item}`));
  process.exitCode = 1;
}
