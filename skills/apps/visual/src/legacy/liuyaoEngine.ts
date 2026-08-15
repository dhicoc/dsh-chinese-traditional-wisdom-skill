/**
 * liuyaoEngine — 六爻纳甲纯 TS 引擎（C 类迁移第三步）
 *
 * 从 visual/js/engines/liuyao-engine.js 移植为纯 TS。原引擎为自研京房八宫纳甲体系，
 * 无外部依赖，仅日干/日干支取数用 window.Solar（lunar-javascript）。剥离后：
 * - Solar 入口参数化（传入走精确日干支 local-exact，未传走基准日近似 local-approx）
 * - 其余全部纯查表 + 确定性计算，可在 Node 环境直接 import
 *
 * 输出结构与旧 LiuyaoEngine.calculate 完全一致，divinationTypes/渲染器可直接消费。
 * 旧 JS 保留作 EngineAdapterRegistry fallback，零回归。
 *
 * 规则来源：《京房易传》八宫纳甲、《增删卜易》《卜筮正宗》六亲世应、日干安六神。
 * 爻值口径与 ichingshifa 同：6=老阴(变) 7=少阳 8=少阴 9=老阳(变)，从初爻到上爻。
 */

import type { ToolEnvelope, ExportSnapshot } from './baseTypes';
import { getHexagramText } from './ichingTexts';

// ─── 八卦爻线（初/中/上，true=阴）───
const TRIGRAM_LINES: Record<string, [boolean, boolean, boolean]> = {
  乾: [false, false, false],
  兑: [false, false, true],
  离: [false, true, false],
  震: [false, true, true],
  巽: [true, false, false],
  坎: [true, false, true],
  艮: [true, true, false],
  坤: [true, true, true],
};
const TRIGRAM_ELEMENT: Record<string, string> = {
  乾: '金', 兑: '金', 离: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土',
};

// ─── 八宫（每宫 8 卦 [上卦, 下卦]）───
const PALACE_HEXAGRAMS: Record<string, [string, string][]> = {
  乾宫: [['乾', '乾'], ['乾', '巽'], ['乾', '艮'], ['乾', '坤'], ['巽', '坤'], ['艮', '坤'], ['离', '坤'], ['离', '乾']],
  坎宫: [['坎', '坎'], ['坎', '兑'], ['坎', '震'], ['坎', '离'], ['兑', '离'], ['震', '离'], ['坤', '离'], ['坤', '坎']],
  艮宫: [['艮', '艮'], ['艮', '离'], ['艮', '乾'], ['艮', '兑'], ['离', '兑'], ['乾', '兑'], ['巽', '兑'], ['巽', '艮']],
  震宫: [['震', '震'], ['震', '坤'], ['震', '坎'], ['震', '巽'], ['坤', '巽'], ['坎', '巽'], ['兑', '巽'], ['兑', '震']],
  巽宫: [['巽', '巽'], ['巽', '乾'], ['巽', '离'], ['巽', '震'], ['乾', '震'], ['离', '震'], ['艮', '震'], ['艮', '巽']],
  离宫: [['离', '离'], ['离', '艮'], ['离', '巽'], ['离', '坎'], ['艮', '坎'], ['巽', '坎'], ['乾', '坎'], ['乾', '离']],
  坤宫: [['坤', '坤'], ['坤', '震'], ['坤', '兑'], ['坤', '乾'], ['震', '乾'], ['兑', '乾'], ['坎', '乾'], ['坎', '坤']],
  兑宫: [['兑', '兑'], ['兑', '坎'], ['兑', '坤'], ['兑', '艮'], ['坎', '艮'], ['坤', '艮'], ['震', '艮'], ['震', '兑']],
};

// ─── 64 卦名（键 = 上卦|下卦）───
const HEXAGRAM_NAMES: Record<string, string> = {
  '乾|乾': '乾为天', '坤|坤': '坤为地', '震|震': '震为雷', '巽|巽': '巽为风',
  '坎|坎': '坎为水', '离|离': '离为火', '艮|艮': '艮为山', '兑|兑': '兑为泽',
  '乾|坤': '天地否', '坤|乾': '地天泰', '乾|震': '天雷无妄', '震|乾': '雷天大壮',
  '乾|巽': '天风姤', '巽|乾': '风天小畜', '乾|坎': '天水讼', '坎|乾': '水天需',
  '乾|离': '天火同人', '离|乾': '火天大有', '乾|艮': '天山遁', '艮|乾': '山天大畜',
  '乾|兑': '天泽履', '兑|乾': '泽天夬', '坤|震': '地雷复', '震|坤': '雷地豫',
  '坤|巽': '地风升', '巽|坤': '风地观', '坤|坎': '地水师', '坎|坤': '水地比',
  '坤|离': '地火明夷', '离|坤': '火地晋', '坤|艮': '地山谦', '艮|坤': '山地剥',
  '坤|兑': '地泽临', '兑|坤': '泽地萃', '震|巽': '雷风恒', '巽|震': '风雷益',
  '震|坎': '雷水解', '坎|震': '水雷屯', '震|离': '雷火丰', '离|震': '火雷噬嗑',
  '震|艮': '雷山小过', '艮|震': '山雷颐', '震|兑': '雷泽归妹', '兑|震': '泽雷随',
  '巽|坎': '风水涣', '坎|巽': '水风井', '巽|离': '风火家人', '离|巽': '火风鼎',
  '巽|艮': '风山渐', '艮|巽': '山风蛊', '巽|兑': '风泽中孚', '兑|巽': '泽风大过',
  '坎|离': '水火既济', '离|坎': '火水未济', '坎|艮': '水山蹇', '艮|坎': '山水蒙',
  '坎|兑': '水泽节', '兑|坎': '泽水困', '离|艮': '火山旅', '艮|离': '山火贲',
  '离|兑': '火泽睽', '兑|离': '泽火革', '艮|兑': '山泽损', '兑|艮': '泽山咸',
};

// ─── 纳甲表 ───
const NAJIA_INNER: Record<string, { stem: string; start: string; dir: 'yang' | 'yin' }> = {
  乾: { stem: '甲', start: '子', dir: 'yang' },
  坎: { stem: '戊', start: '寅', dir: 'yang' },
  艮: { stem: '丙', start: '辰', dir: 'yang' },
  震: { stem: '庚', start: '子', dir: 'yang' },
  巽: { stem: '辛', start: '丑', dir: 'yin' },
  离: { stem: '己', start: '卯', dir: 'yin' },
  坤: { stem: '乙', start: '未', dir: 'yin' },
  兑: { stem: '丁', start: '巳', dir: 'yin' },
};
const NAJIA_OUTER: Record<string, { stem: string; start: string; dir: 'yang' | 'yin' }> = {
  乾: { stem: '壬', start: '午', dir: 'yang' },
  坎: { stem: '戊', start: '申', dir: 'yang' },
  艮: { stem: '丙', start: '戌', dir: 'yang' },
  震: { stem: '庚', start: '午', dir: 'yang' },
  巽: { stem: '辛', start: '未', dir: 'yin' },
  离: { stem: '己', start: '酉', dir: 'yin' },
  坤: { stem: '癸', start: '丑', dir: 'yin' },
  兑: { stem: '丁', start: '亥', dir: 'yin' },
};

const YANG_BRANCHES = ['子', '寅', '辰', '午', '申', '戌'];
const YIN_BRANCHES = ['丑', '亥', '酉', '未', '巳', '卯'];

function takeBranchSeq(start: string, dir: 'yang' | 'yin', count: number): string[] {
  const seq = dir === 'yang' ? YANG_BRANCHES : YIN_BRANCHES;
  let idx = seq.indexOf(start);
  if (idx < 0) idx = 0;
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(seq[(idx + i) % seq.length]);
  return out;
}

// ─── 六神 ───
const SIX_GODS = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
const DAY_STEM_GOD_START: Record<string, number> = {
  甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5,
};

// ─── 六亲 ───
const BRANCH_ELEMENT: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};
const GENERATES: Record<string, string> = { 金: '水', 水: '木', 木: '火', 火: '土', 土: '金' };
const CONTROLS: Record<string, string> = { 金: '木', 木: '土', 土: '水', 水: '火', 火: '金' };

function sixRelation(palaceElement: string, branchElement: string): string {
  if (palaceElement === branchElement) return '兄弟';
  if (GENERATES[branchElement] === palaceElement) return '父母';
  if (GENERATES[palaceElement] === branchElement) return '子孙';
  if (CONTROLS[palaceElement] === branchElement) return '妻财';
  if (CONTROLS[branchElement] === palaceElement) return '官鬼';
  return '兄弟';
}

// ─── 世应 ───
const SHI_POSITION = [6, 1, 2, 3, 4, 5, 4, 3];

// ─── 用神 ───
const YONGSHEN_BY_TOPIC: Array<{ kw: string[]; yong: string }> = [
  { kw: ['官', '功名', '事业', '工作', '求职', '升职', '晋升', '职位', '官非', '诉讼', '病', '疾', '丈夫', '男友'], yong: '官鬼' },
  { kw: ['父母', '长辈', '文书', '合同', '房屋', '房子', '车辆', '考试', '学业', '读书', '证书'], yong: '父母' },
  { kw: ['子女', '孩子', '下属', '宠物', '药', '医药', '医生', '病愈'], yong: '子孙' },
  { kw: ['兄弟', '朋友', '竞争', '同事', '同辈', '合伙'], yong: '兄弟' },
  { kw: ['财', '钱', '利', '收益', '生意', '买卖', '股票', '投资', '效益', '财运'], yong: '妻财' },
  { kw: ['世', '自己', '本人', '求测', '我'], yong: '世爻' },
  { kw: ['应', '他人', '对方', '他'], yong: '应爻' },
];

const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const JIAZI: string[] = [];
for (let i = 0; i < 60; i++) JIAZI.push(TIANGAN[i % 10] + DIZHI[i % 12]);

const XUNKONG: Record<string, string[]> = {
  甲子: ['戌', '亥'], 甲戌: ['申', '酉'], 甲申: ['午', '未'],
  甲午: ['辰', '巳'], 甲辰: ['寅', '卯'], 甲寅: ['子', '丑'],
};

const MONTH_ELEMENT: Record<string, string> = {
  寅: '木', 卯: '木', 巳: '火', 午: '火', 申: '金', 酉: '金',
  亥: '水', 子: '水', 丑: '土', 辰: '土', 未: '土', 戌: '土',
};

// ─── lunar-javascript Solar 入口类型（参数化）──
interface LunarLike {
  getDayGan?: () => string;
  getDayInGanZhi?: () => string;
  getDayGanZhi?: () => string;
  getDayInGanZhiExact?: () => string;
  getMonthInGanZhi?: () => string;
  getMonthInGanZhiExact?: () => string;
  getDayXunKong?: () => string;
}
interface SolarLike {
  fromYmd?(y: number, mo: number, d: number): { getLunar(): LunarLike };
  fromYmdHms?(y: number, mo: number, d: number, h: number, mi: number, s: number): { getLunar(): LunarLike };
}

// ─── 爻/卦类型 ───
interface CastedLine { yin: boolean; changing: boolean }
interface NajiaLine { stem: string; branch: string; branchElement: string; relation: string; god?: string }
interface HexagramInfo {
  name: string; upper: string; lower: string;
  upperElement: string; lowerElement: string;
  palace: string; palaceName: string; palaceIndex: number; palaceElement: string;
}

function trigramFromLines(threeLines: boolean[]): string {
  const key = threeLines.map((y) => (y ? '1' : '0')).join('');
  for (const name in TRIGRAM_LINES) {
    if (TRIGRAM_LINES[name].map((y) => (y ? '1' : '0')).join('') === key) return name;
  }
  return '乾';
}

function linesToTrigrams(lines: boolean[]): { upper: string; lower: string } {
  const lowerLines = [lines[0], lines[1], lines[2]];
  const upperLines = [lines[3], lines[4], lines[5]];
  return { upper: trigramFromLines(upperLines), lower: trigramFromLines(lowerLines) };
}

function lookupHexagram(upper: string, lower: string): HexagramInfo {
  let name = HEXAGRAM_NAMES[upper + '|' + lower];
  if (!name) name = upper + lower;
  let palace = upper;
  let palaceIndex = 0;
  let palaceName = upper + '宫';
  for (const pn of Object.keys(PALACE_HEXAGRAMS)) {
    PALACE_HEXAGRAMS[pn].forEach((pair, idx) => {
      if (pair[0] === upper && pair[1] === lower) {
        palaceName = pn;
        palace = pn.replace('宫', '');
        palaceIndex = idx;
      }
    });
  }
  return {
    name, upper, lower,
    upperElement: TRIGRAM_ELEMENT[upper],
    lowerElement: TRIGRAM_ELEMENT[lower],
    palace, palaceName, palaceIndex,
    palaceElement: TRIGRAM_ELEMENT[palace],
  };
}

function buildNajia(hex: { upper: string; lower: string; palaceElement: string }): NajiaLine[] {
  const innerRule = NAJIA_INNER[hex.lower];
  const outerRule = NAJIA_OUTER[hex.upper];
  const lowerBranches = takeBranchSeq(innerRule.start, innerRule.dir, 3);
  const upperBranches = takeBranchSeq(outerRule.start, outerRule.dir, 3);
  const lines: NajiaLine[] = [];
  for (let i = 0; i < 3; i++) {
    const br = lowerBranches[i];
    lines.push({ stem: innerRule.stem, branch: br, branchElement: BRANCH_ELEMENT[br], relation: sixRelation(hex.palaceElement, BRANCH_ELEMENT[br]) });
  }
  for (let j = 0; j < 3; j++) {
    const br = upperBranches[j];
    lines.push({ stem: outerRule.stem, branch: br, branchElement: BRANCH_ELEMENT[br], relation: sixRelation(hex.palaceElement, BRANCH_ELEMENT[br]) });
  }
  return lines;
}

function assignSixGods<T extends NajiaLine & { god?: string }>(lines: T[], dayStem: string): T[] {
  const start = DAY_STEM_GOD_START[dayStem] ?? 0;
  for (let i = 0; i < lines.length; i++) lines[i].god = SIX_GODS[(start + i) % 6];
  return lines;
}

function shiYing(hex: HexagramInfo): { shi: number; ying: number } {
  const shi = SHI_POSITION[hex.palaceIndex] || 6;
  const ying = ((shi - 1 + 3) % 6) + 1;
  return { shi, ying };
}

function resolveYongShen(question: string | undefined, gender: string | undefined): string {
  if (question) {
    const q = String(question);
    for (const group of YONGSHEN_BY_TOPIC) {
      for (const kw of group.kw) {
        if (q.indexOf(kw) >= 0) return group.yong;
      }
    }
  }
  if (gender === '男') return '妻财';
  if (gender === '女') return '官鬼';
  return '世爻';
}

// ─── 起卦 ───
export interface LiuyaoBirth {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  gender?: string;
  useExactCalendar?: boolean;
}

export interface LiuyaoInput {
  birth?: LiuyaoBirth;
  method?: 'coin' | 'time' | 'manual' | 'yarrow';
  /** method=manual: 6 位 6-9 字符串（初爻到上爻） */
  yaoValues?: string;
  question?: string;
  seed?: number;
  /** 可选 lunar-javascript Solar 入口（精确日干支/空亡） */
  solar?: SolarLike | null;
}

function yaoValueToLine(v: number): CastedLine {
  if (v === 6) return { yin: true, changing: true };
  if (v === 7) return { yin: false, changing: false };
  if (v === 8) return { yin: true, changing: false };
  if (v === 9) return { yin: false, changing: true };
  return { yin: false, changing: false };
}

function parseYaoValues(str: string): CastedLine[] {
  const s = str.replace(/\s/g, '');
  if (s.length !== 6 || !/^[6-9]{6}$/.test(s)) {
    throw new Error('yaoValues 必须是 6 位 6-9 字符串（初爻到上爻）');
  }
  const lines: CastedLine[] = [];
  for (let i = 0; i < 6; i++) lines.push(yaoValueToLine(Number(s.charAt(i))));
  return lines;
}

function castFromTime(birth: LiuyaoBirth): CastedLine[] {
  const year = Number(birth.year) || 1990;
  const month = Number(birth.month) || 6;
  const day = Number(birth.day) || 15;
  const hour = Number(birth.hour) || 12;
  const hourNum = Math.floor((hour + 1) / 2) % 12 + 1;
  const trigramOrder = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
  const upperIdx = ((year + month + day) % 8) || 8;
  const lowerIdx = ((year + month + day + hourNum) % 8) || 8;
  const movingLine = ((year + month + day + hourNum) % 6) || 6;
  const upper = trigramOrder[upperIdx - 1];
  const lower = trigramOrder[lowerIdx - 1];
  const lowerLines = TRIGRAM_LINES[lower].slice();
  const upperLines = TRIGRAM_LINES[upper].slice();
  const allLines = lowerLines.concat(upperLines);
  return allLines.map((y, idx) => ({ yin: y, changing: idx + 1 === movingLine }));
}

/**
 * 揲蓍法（大衍之数）起卦 —— 模拟传统 50 策三变一爻。
 *
 * 算法：50 策取 1 不用（太极），余 49 策。
 * 每变：分二 → 挂一 → 揲四 → 归奇，三变得一爻。
 * 三变结果：9（老阳·动）、8（少阴·不动）、7（少阳·不动）、6（老阴·动）。
 * 概率：老阳 1/16，少阴 5/16，少阳 3/16，老阴 7/16（传统蓍草概率）。
 */
function castYarrow(input: LiuyaoInput): CastedLine[] {
  const rng = makeRng(input);
  const lines: CastedLine[] = [];
  for (let yao = 0; yao < 6; yao++) {
    let sticks = 49; // 大衍五十，其用四十九
    let remainderSum = 0;
    for (let change = 0; change < 3; change++) {
      // 分二：随机分成左右两堆
      const left = 1 + Math.floor(rng() * (sticks - 1));
      const right = sticks - left;
      // 挂一：从右堆取1（第一变取右，后两变取左也可，简化统一取右堆1）
      const takeFrom = right > 1 ? right : left;
      const afterGua = sticks - 1;
      // 揲四：分别对左右堆（去掉挂1后）除以4取余
      const leftRemainder = ((left - (takeFrom === right ? 0 : 1)) % 4) || 4;
      const rightRemainder = ((right - (takeFrom === right ? 1 : 0)) % 4) || 4;
      // 归奇：余数之和
      remainderSum += leftRemainder + rightRemainder + 1; // +1 为挂一
      sticks = afterGua - leftRemainder - rightRemainder;
    }
    // 三变后 remainderSum 为 9/10/11/12（含3次挂一）
    // 9=老阳(动) 10=少阳(不动) 11=少阴(不动) 12=老阴(动)
    // 简化映射：奇数为阳，偶数为阴；9/12为动爻
    let val: number;
    if (remainderSum <= 9) val = 9;      // 老阳
    else if (remainderSum === 10) val = 7; // 少阳
    else if (remainderSum === 11) val = 8; // 少阴
    else val = 6;                          // 老阴
    lines.push(yaoValueToLine(val));
  }
  return lines;
}

function makeRng(input: LiuyaoInput): () => number {
  let seed: number;
  if (input.seed != null) {
    seed = Number(input.seed) || 1;
  } else if (input.birth) {
    const b = input.birth;
    seed = b.year * 10000 + b.month * 100 + b.day + (b.hour || 0) + (b.gender === '女' ? 7 : 3);
  } else {
    seed = 1;
  }
  let s = Math.abs(seed) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function castLines(input: LiuyaoInput): CastedLine[] {
  const method = input.method || 'coin';
  if (method === 'manual' && input.yaoValues) return parseYaoValues(String(input.yaoValues));
  if (method === 'time' && input.birth) return castFromTime(input.birth);
  if (method === 'yarrow') return castYarrow(input);
  const rng = makeRng(input);
  const lines: CastedLine[] = [];
  for (let i = 0; i < 6; i++) {
    let heads = 0;
    for (let c = 0; c < 3; c++) if (rng() < 0.5) heads++;
    let val: number;
    if (heads === 3) val = 9;
    else if (heads === 2) val = 7;
    else if (heads === 1) val = 8;
    else val = 6;
    lines.push(yaoValueToLine(val));
  }
  return lines;
}

// ─── 卦序号 ───
let _hexOrder: string[] | null = null;
function hexagramIndex(name: string): number {
  if (!_hexOrder) {
    const order: string[] = [];
    Object.keys(HEXAGRAM_NAMES).forEach((k) => order.push(HEXAGRAM_NAMES[k]));
    _hexOrder = order;
  }
  const idx = _hexOrder.indexOf(name) + 1;
  return idx || 0;
}

// ─── 空亡/旺衰/身爻/伏神 ───
function getDayXunkong(dayGanZhi: string): string[] {
  if (!dayGanZhi || dayGanZhi.length < 2) return [];
  const idx = JIAZI.indexOf(dayGanZhi);
  if (idx < 0) return [];
  const xunStart = Math.floor(idx / 10) * 10;
  const xunHead = JIAZI[xunStart];
  return XUNKONG[xunHead] || [];
}

function wangShuai(element: string, monthBranch: string): string {
  const monthEl = MONTH_ELEMENT[monthBranch];
  if (!monthEl || !element) return '平';
  if (element === monthEl) return '旺';
  if (GENERATES[monthEl] === element) return '相';
  if (GENERATES[element] === monthEl) return '休';
  if (CONTROLS[element] === monthEl) return '囚';
  if (CONTROLS[monthEl] === element) return '死';
  return '平';
}

const CHONG_MAP: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
};

function getShenYao(shiPos: number, lines: Array<{ branch: string }>): number {
  if (!shiPos || shiPos < 1 || shiPos > 6) return 0;
  const shiBranch = lines[shiPos - 1] ? lines[shiPos - 1].branch : '';
  if (!shiBranch) return 0;
  const chongBranch = CHONG_MAP[shiBranch];
  if (!chongBranch) return 0;
  for (let i = 0; i < lines.length; i++) if (lines[i].branch === chongBranch) return i + 1;
  return 0;
}

interface HiddenStar {
  relation: string; hiddenStem: string; hiddenBranch: string;
  hiddenBranchElement: string; hiddenAtPureYao: number;
}
function getHiddenStars(hex: HexagramInfo, currentRelations: string[]): HiddenStar[] {
  const palacePure = PALACE_HEXAGRAMS[hex.palaceName][0];
  const pureHex = { upper: palacePure[0], lower: palacePure[1], palaceElement: hex.palaceElement };
  const pureNajia = buildNajia(pureHex);
  const pureRelations = pureNajia.map((nj) => nj.relation);
  const currentSet: Record<string, boolean> = {};
  currentRelations.forEach((r) => { currentSet[r] = true; });
  const missing: HiddenStar[] = [];
  for (let i = 0; i < pureRelations.length; i++) {
    if (!currentSet[pureRelations[i]]) {
      missing.push({
        relation: pureRelations[i],
        hiddenStem: pureNajia[i].stem,
        hiddenBranch: pureNajia[i].branch,
        hiddenBranchElement: pureNajia[i].branchElement,
        hiddenAtPureYao: i + 1,
      });
    }
  }
  const seen: Record<string, boolean> = {};
  return missing.filter((m) => {
    if (seen[m.relation]) return false;
    seen[m.relation] = true;
    return true;
  });
}

// ─── 日干/日干支（Solar 参数化）───
function resolveDayStem(birth: Partial<LiuyaoBirth>, solar?: SolarLike | null): string {
  if (birth && birth.useExactCalendar !== false && solar) {
    try {
      const s = solar.fromYmdHms
        ? solar.fromYmdHms(birth.year ?? 0, birth.month ?? 0, birth.day ?? 0, birth.hour || 12, birth.minute || 0, 0)
        : solar.fromYmd?.(birth.year ?? 0, birth.month ?? 0, birth.day ?? 0);
      const lunar = s && typeof s.getLunar === 'function' ? s.getLunar() : null;
      if (lunar) {
        let dayStem = '';
        if (typeof lunar.getDayGan === 'function') dayStem = String(lunar.getDayGan() || '');
        if (!dayStem && typeof lunar.getDayInGanZhi === 'function') dayStem = String(lunar.getDayInGanZhi() || '').charAt(0);
        if (!dayStem && typeof lunar.getDayGanZhi === 'function') dayStem = String(lunar.getDayGanZhi() || '').charAt(0);
        dayStem = dayStem.replace(/\s/g, '');
        if (dayStem.length >= 1 && /甲|乙|丙|丁|戊|己|庚|辛|壬|癸/.test(dayStem.charAt(0))) return dayStem.charAt(0);
      }
    } catch {
      /* 降级近似 */
    }
  }
  return approxDayStem(birth?.year || 1990, birth?.month || 6, birth?.day || 15);
}

function approxDayStem(year: number, month: number, day: number): string {
  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  // 基准日 1900-01-31 为甲辰日（干支序 41，甲为 stem[0]）
  const base = new Date(1900, 0, 31);
  const target = new Date(year, (month || 1) - 1, day || 1);
  if (isNaN(target.getTime())) return '甲';
  const diffDays = Math.round((target.getTime() - base.getTime()) / 86400000);
  const stemIdx = (((41 + diffDays - 1) % 10) + 10) % 10;
  return STEMS[stemIdx];
}

interface DayGanZhiInfo {
  dayStem: string; dayBranch: string; dayGanZhi: string;
  monthStem: string; monthBranch: string; monthGanZhi: string;
  xunkong?: string;
}
function resolveDayGanZhi(birth: Partial<LiuyaoBirth>, solar?: SolarLike | null): DayGanZhiInfo {
  if (birth && birth.useExactCalendar !== false && solar) {
    try {
      const s = solar.fromYmdHms
        ? solar.fromYmdHms(birth.year ?? 0, birth.month ?? 0, birth.day ?? 0, birth.hour || 12, birth.minute || 0, 0)
        : solar.fromYmd?.(birth.year ?? 0, birth.month ?? 0, birth.day ?? 0);
      const lunar = s && typeof s.getLunar === 'function' ? s.getLunar() : null;
      if (lunar) {
        let dayGz = '';
        if (typeof lunar.getDayInGanZhiExact === 'function') dayGz = lunar.getDayInGanZhiExact();
        else if (typeof lunar.getDayInGanZhi === 'function') dayGz = lunar.getDayInGanZhi();
        let monthGz = '';
        if (typeof lunar.getMonthInGanZhiExact === 'function') monthGz = lunar.getMonthInGanZhiExact();
        else if (typeof lunar.getMonthInGanZhi === 'function') monthGz = lunar.getMonthInGanZhi();
        let xk = '';
        if (typeof lunar.getDayXunKong === 'function') xk = lunar.getDayXunKong();
        const result: DayGanZhiInfo = {
          dayStem: dayGz ? dayGz.charAt(0) : '',
          dayBranch: dayGz ? dayGz.charAt(1) : '',
          dayGanZhi: dayGz || '',
          monthStem: monthGz ? monthGz.charAt(0) : '',
          monthBranch: monthGz ? monthGz.charAt(1) : '',
          monthGanZhi: monthGz || '',
        };
        if (xk) result.xunkong = xk;
        return result;
      }
    } catch {
      /* 降级 */
    }
  }
  return { dayStem: resolveDayStem(birth, null), dayBranch: '', dayGanZhi: '', monthStem: '', monthBranch: '', monthGanZhi: '' };
}

// ─── 结果类型（与旧 LiuyaoEngine.calculate 输出一致）───

export interface LiuyaoLine {
  yin: boolean;
  changing: boolean;
  stem: string;
  branch: string;
  branchElement: string;
  relation: string;
  god: string;
  wangShuai: string;
}

export interface LiuyaoResult {
  lines: LiuyaoLine[];
  hexagramName: string;
  hexagramNumber: number;
  isOriginal: boolean;
  yongShen: string;
  shiYao: number;
  yingYao: number;
  palace: string;
  palaceElement: string;
  palaceIndex: number;
  upperTrigram: string;
  lowerTrigram: string;
  dayStem: string;
  changingYao: number[];
  changingHexagramName: string;
  changingHexagramNumber: number;
  xunkong: string[];
  monthJian: string;
  dayJian: string;
  monthGanZhi: string;
  dayGanZhi: string;
  shenYao: number;
  hiddenStars: HiddenStar[];
  engineName: string;
  mode: 'local-exact' | 'local-approx';
  version: string;
  sourceProject: string;
  license: string;
  confidenceNote: string;
}

// ─── 主入口 ───
export function calculateLiuyao(input: LiuyaoInput): LiuyaoResult {
  // birth 缺省时用空对象兜底，字段均为可选；以 Partial 显式标注，避免 {} 丢失属性类型
  const birth: Partial<LiuyaoBirth> = input.birth ?? {};
  const solar = input.solar;
  const dayStem = resolveDayStem(birth, solar);
  const casted = castLines(input);
  const tris = linesToTrigrams(casted.map((l) => l.yin));
  const hex = lookupHexagram(tris.upper, tris.lower);
  const najiaLines = buildNajia(hex);
  assignSixGods(najiaLines, dayStem);
  const shiYingRes = shiYing(hex);

  const lines: LiuyaoLine[] = najiaLines.map((nj, i) => ({
    yin: casted[i].yin,
    changing: casted[i].changing,
    stem: nj.stem,
    branch: nj.branch,
    branchElement: nj.branchElement,
    relation: nj.relation,
    god: nj.god || '',
    wangShuai: '平',
  }));

  const yongShen = resolveYongShen(input.question, birth.gender);

  const dayGz = resolveDayGanZhi(birth, solar);
  const dayBranch = dayGz.dayBranch || '';
  const monthBranch = dayGz.monthBranch || '';
  let xunkong: string[] = [];
  if (dayGz.xunkong) {
    xunkong = (dayGz.xunkong as string).split('').filter((c) => c);
  } else if (dayGz.dayGanZhi) {
    xunkong = getDayXunkong(dayGz.dayGanZhi);
  }
  for (let i = 0; i < lines.length; i++) lines[i].wangShuai = wangShuai(lines[i].branchElement, monthBranch);

  const currentRelations = lines.map((l) => l.relation);
  const hiddenStars = getHiddenStars(hex, currentRelations);
  const shenYao = getShenYao(shiYingRes.shi, lines);

  const changedLines = lines.map((l) => ({ yin: l.changing ? !l.yin : l.yin }));
  const changedTris = linesToTrigrams(changedLines.map((l) => l.yin));
  const changedHex = lookupHexagram(changedTris.upper, changedTris.lower);
  const changingYao: number[] = [];
  lines.forEach((l, i) => { if (l.changing) changingYao.push(i + 1); });

  const mode: 'local-exact' | 'local-approx' = solar && birth.useExactCalendar !== false ? 'local-exact' : 'local-approx';

  return {
    lines,
    hexagramName: hex.name,
    hexagramNumber: hexagramIndex(hex.name),
    isOriginal: true,
    yongShen,
    shiYao: shiYingRes.shi,
    yingYao: shiYingRes.ying,
    palace: hex.palaceName,
    palaceElement: hex.palaceElement,
    palaceIndex: hex.palaceIndex,
    upperTrigram: hex.upper,
    lowerTrigram: hex.lower,
    dayStem,
    changingYao,
    changingHexagramName: changingYao.length ? changedHex.name : hex.name,
    changingHexagramNumber: changingYao.length ? hexagramIndex(changedHex.name) : hexagramIndex(hex.name),
    xunkong,
    monthJian: monthBranch,
    dayJian: dayBranch,
    monthGanZhi: dayGz.monthGanZhi || '',
    dayGanZhi: dayGz.dayGanZhi || '',
    shenYao,
    hiddenStars,
    engineName: 'LocalLiuyaoNajiaAdapter',
    mode,
    version: '1.0.0',
    sourceProject: 'local:liuyaoEngine.ts; reference: bopo/najia, ichingshifa',
    license: 'project-local',
    confidenceNote: '本解读结合纳甲、六亲、六神、世应、用神与变卦等内容。不同流派对纳甲地支顺逆和六神起例的看法可能不同，宜结合所问事项参考。',
  };
}

// ─── ToolEnvelope 适配 ───
export interface LiuyaoData extends LiuyaoResult {
  export_snapshot: ExportSnapshot;
}

export function calcLiuyaoEnveloped(input: LiuyaoInput): ToolEnvelope<LiuyaoData> {
  const result = calculateLiuyao(input);
  const hexName = result.hexagramName;
  const changedHex = result.changingHexagramName;
  const moveYao = result.changingYao.join('、') || '无';
  const yong = result.yongShen;
  const palace = result.palace;
  const palaceEl = result.palaceElement;
  const linesDesc = result.lines.map((l, i) => `${i + 1}爻 ${l.stem}${l.branch} ${l.relation} ${l.god} ${l.yin ? '阴' : '阳'}${l.changing ? '【动】' : ''}`).join('；');

  // 查古典文本
  const classicalText = getHexagramText(hexName);
  const sections: Array<{ heading: string; body: string }> = [
    { heading: '卦象', body: `本卦${hexName}${changedHex !== hexName ? '，动爻变出' + changedHex : '，无动爻'}。属${palace}(五行${palaceEl})。` },
    { heading: '世应用神', body: `世爻第${result.shiYao}爻(求测人)，应爻第${result.yingYao}爻(对方/所测之事)。用神${yong}。` },
    { heading: '纳甲六亲六神', body: linesDesc + '。' },
    { heading: '动爻与变卦', body: `动爻：${moveYao}${changedHex !== hexName ? '，变卦' + changedHex : '。'}` },
    { heading: '空亡/月建/日建', body: `空亡：${result.xunkong.join('、') || '未知'}；月建${result.monthJian || '未知'}，日建${result.dayJian || '未知'}${result.dayGanZhi ? '（' + result.dayGanZhi + '）' : ''}。` },
    { heading: '旺衰/伏神/身爻', body: `身爻第${result.shenYao || '无'}爻；伏神：${result.hiddenStars.map((h) => h.relation + '(' + h.hiddenBranch + ')').join('、') || '无'}。` },
  ];
  if (classicalText) {
    sections.push({ heading: '卦辞', body: classicalText.guaCi });
    // 加动爻对应的爻辞
    for (const yaoNum of result.changingYao) {
      if (classicalText.yaoCi[yaoNum - 1]) {
        sections.push({ heading: `${yaoNum}爻辞`, body: classicalText.yaoCi[yaoNum - 1] });
      }
    }
    sections.push({ heading: '彖传', body: classicalText.tuanZhuan });
  }
  sections.push({ heading: '使用提醒', body: '本卦依传统六爻规则整理，适合用于传统文化学习与自我观察，不作为现实决策依据。' });

  const snapshot: ExportSnapshot = {
    summary: `${hexName}${changedHex !== hexName ? ' → ' + changedHex : ''}，属${palace}(五行${palaceEl})，世${result.shiYao}应${result.yingYao}，用神${yong}。动爻：${moveYao}。`,
    tags: ['六爻纳甲', hexName, '宫' + palace, '用神' + yong, '动爻' + moveYao, ...(changedHex !== hexName ? ['变' + changedHex] : [])],
    sections,
    sourceNotes: '六爻内容仅作传统卜筮文化参考。',
  };

  return {
    ok: true,
    tool: result.engineName,
    version: result.version,
    input_normalized: input as unknown as Record<string, unknown>,
    data: { ...result, export_snapshot: snapshot },
    warnings: [result.confidenceNote, ...(result.mode === 'local-approx' ? ['日干支与空亡仅作辅助参考'] : [])],
  };
}
