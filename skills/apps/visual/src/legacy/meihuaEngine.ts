/**
 * meihuaEngine — 梅花易数纯 TS 计算引擎（C 类迁移第一步）
 *
 * 从 visual/js/engine-adapters.js 的 calculateLocalMeihua / buildMeihuaResult
 * 移植为纯 TS，剥离 window.Solar 依赖：Solar 入口改为可选入参，传入时走
 * 精确农历取数（A 类路径，可传入 lunar-javascript ESM 入口），
 * 未传时回退公历年月日 + 本地时辰序数（与原 engine-adapters.js fallback 一致）。
 *
 * 输出结构与旧 buildMeihuaResult 完全一致，MeihuaData/canvasRenderers 可直接消费。
 * 旧 JS calculateLocalMeihua 保留作 EngineAdapterRegistry fallback，零回归。
 *
 * 数据提炼自 muyen/meihua-yishu SKILL.md 与 handsomejustin/meihua-yi engine.py
 * （卦德/吉凶分级/策略指导/错综卦，仅规则参考，未复制代码）。
 */

import type { ToolEnvelope, ExportSnapshot } from './baseTypes';
import { getHexagramText, resolveHexagram } from './ichingTexts';

// ── 八卦基础 ──────────────────────────────────────────────

const MEIHUA_TRIGRAMS = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];

interface TrigramNature {
  symbol: string;
  nature: string;
  element: string;
  /** 三爻（从下到上），true=阴爻 */
  lines: [boolean, boolean, boolean];
}

const MEIHUA_NATURE: Record<string, TrigramNature> = {
  乾: { symbol: '☰', nature: '天', element: '金', lines: [false, false, false] },
  兑: { symbol: '☱', nature: '泽', element: '金', lines: [true, false, false] },
  离: { symbol: '☲', nature: '火', element: '火', lines: [false, true, false] },
  震: { symbol: '☳', nature: '雷', element: '木', lines: [true, true, false] },
  巽: { symbol: '☴', nature: '风', element: '木', lines: [false, false, true] },
  坎: { symbol: '☵', nature: '水', element: '水', lines: [true, false, true] },
  艮: { symbol: '☶', nature: '山', element: '土', lines: [false, true, true] },
  坤: { symbol: '☷', nature: '地', element: '土', lines: [true, true, true] },
};

const MEIHUA_ELEMENT_GENERATES: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const MEIHUA_ELEMENT_CONTROLS: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

// ── 卦德 / 吉凶分级 / 策略（提炼自 muyen/meihua-yishu）──

const MEIHUA_GUA_DE: Record<string, string> = {
  乾: '健（刚健不息）', 兑: '悦（喜悦和悦）', 离: '丽（附丽光明）',
  震: '动（奋发振动）', 巽: '入（顺入渗透）', 坎: '陷（险陷下沉）',
  艮: '止（静止安止）', 坤: '顺（柔顺承载）',
};

const MEIHUA_FORTUNE_LEVEL: Record<string, { level: string; detail: string }> = {
  用生体: { level: '大吉', detail: '用卦生体卦，事可成，多得助力' },
  体生用: { level: '不利', detail: '体卦生用卦，泄气耗散，事倍功半' },
  体克用: { level: '可成', detail: '体卦克用卦，费力可成，己方占优' },
  用克体: { level: '大凶', detail: '用卦克体卦，受阻受损，宜避不宜争' },
  比和: { level: '平顺', detail: '体用同五行，和顺平稳，诸事谐调' },
};

const MEIHUA_STRATEGY: Record<string, string> = {
  用生体: '进——有利可图，宜主动出击、把握机会',
  体生用: '退——耗散之象，宜保守积蓄、不宜大举',
  体克用: '变——费力可成，宜调整策略、以巧取胜',
  用克体: '守——受制之象，宜静观待变、避免冲动',
  比和: '顺——和顺之象，宜维持现状、稳步推进',
};

// ── 辅助函数 ──────────────────────────────────────────────

/** 1-based 取模（n % base，0 → base） */
function modOne(value: number, base: number): number {
  const n = Number(value) || 0;
  const r = n % base;
  return r === 0 ? base : r;
}

function meihuaTrigramInfo(name: string) {
  const info = MEIHUA_NATURE[name] || MEIHUA_NATURE['乾'];
  return { name: name || '乾', symbol: info.symbol, nature: info.nature, element: info.element };
}

function trigramFromLines(lines: boolean[]): string {
  const key = lines.map((yin) => (yin ? '1' : '0')).join('');
  for (const name in MEIHUA_NATURE) {
    if (MEIHUA_NATURE[name].lines.map((yin) => (yin ? '1' : '0')).join('') === key) return name;
  }
  return '乾';
}

function changedTrigramName(name: string, localLineFromBottom: number): string {
  const info = MEIHUA_NATURE[name] || MEIHUA_NATURE['乾'];
  const lines = info.lines.slice() as boolean[];
  const indexFromTop = 3 - localLineFromBottom;
  lines[indexFromTop] = !lines[indexFromTop];
  return trigramFromLines(lines);
}

function cuoTrigram(name: string): string {
  const cuoMap: Record<string, string> = { 乾: '坤', 坤: '乾', 震: '巽', 巽: '震', 坎: '离', 离: '坎', 艮: '兑', 兑: '艮' };
  return cuoMap[name] || name;
}

function zongTrigram(upper: string, lower: string): { upper: string; lower: string } {
  return { upper: lower, lower: upper };
}

function getBodyUseRelation(bodyName: string, useName: string): string {
  const bodyElement = (MEIHUA_NATURE[bodyName] || {}).element;
  const useElement = (MEIHUA_NATURE[useName] || {}).element;
  if (!bodyElement || !useElement) return '';
  if (bodyElement === useElement) return '比和';
  if (MEIHUA_ELEMENT_GENERATES[useElement] === bodyElement) return '用生体';
  if (MEIHUA_ELEMENT_GENERATES[bodyElement] === useElement) return '体生用';
  if (MEIHUA_ELEMENT_CONTROLS[useElement] === bodyElement) return '用克体';
  if (MEIHUA_ELEMENT_CONTROLS[bodyElement] === useElement) return '体克用';
  return '';
}

// ── lunar-javascript Solar 入口类型（参数化）──

interface LunarLike {
  getYear?: () => number | string;
  getMonth?: () => number | string;
  getDay?: () => number | string;
  getTimeZhi?: () => string;
}
interface SolarLike {
  fromYmdHms?(y: number, mo: number, d: number, h: number, mi: number, s: number): { getLunar(): LunarLike };
  fromYmd?(y: number, mo: number, d: number): { getLunar(): LunarLike };
}

const DZ = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export interface MeihuaBirth {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
}

/**
 * 取起卦用的年月日时数。传入 Solar 时走精确农历，否则走公历 + 本地时辰序数。
 */
function getMeihuaDateNumbers(birth: MeihuaBirth, solar?: SolarLike | null) {
  if (solar) {
    try {
      const s = solar.fromYmdHms
        ? solar.fromYmdHms(birth.year, birth.month, birth.day, birth.hour, birth.minute || 0, 0)
        : solar.fromYmd?.(birth.year, birth.month, birth.day);
      const lunar = s && typeof s.getLunar === 'function' ? s.getLunar() : null;
      if (lunar) {
        const call = (obj: LunarLike, names: string[]): unknown => {
          for (const n of names) {
            const v = (obj as Record<string, unknown>)[n];
            // 用 call(obj) 保证 this 绑定（lunar-javascript 方法依赖 this 访问内部 _p）
            if (typeof v === 'function') return (v as (...a: unknown[]) => unknown).call(obj);
            if (v !== undefined) return v;
          }
          return '';
        };
        const lunarYear = Number(call(lunar, ['getYear', 'year'])) || birth.year;
        const lunarMonth = Math.abs(Number(call(lunar, ['getMonth', 'month']))) || birth.month;
        const lunarDay = Number(call(lunar, ['getDay', 'day'])) || birth.day;
        const timeZhi = String(call(lunar, ['getTimeZhi', 'timeZhi']) || '');
        const timeIndex = DZ.indexOf(timeZhi) + 1;
        return {
          year: lunarYear,
          month: lunarMonth,
          day: lunarDay,
          hourNumber: timeIndex > 0 ? timeIndex : modOne(Math.floor((birth.hour + 1) / 2) + 1, 12),
          source: 'lunar-javascript 农历年月日与时支',
        };
      }
    } catch {
      /* fall through to 公历 */
    }
  }
  return {
    year: birth.year,
    month: birth.month,
    day: birth.day,
    hourNumber: modOne(Math.floor((birth.hour + 1) / 2) + 1, 12),
    source: '公历年月日与本地时辰序数',
  };
}

// ── 核心结果类型（与旧 buildMeihuaResult 输出一致）──

export interface MeihuaResult {
  upperTrigram: ReturnType<typeof meihuaTrigramInfo>;
  lowerTrigram: ReturnType<typeof meihuaTrigramInfo>;
  changingLine: number;
  mutualUpper: ReturnType<typeof meihuaTrigramInfo>;
  mutualLower: ReturnType<typeof meihuaTrigramInfo>;
  bodyTrigram: string;
  useTrigram: string;
  bodyUseRelation: string;
  fortuneLevel: string;
  fortuneDetail: string;
  strategy: string;
  bodyGuaDe: string;
  useGuaDe: string;
  cuoTrigram: { upper: string; lower: string; name: string };
  zongTrigram: { upper: string; lower: string; name: string };
  hexagramName: string;
  hexagramNumber: number;
  classicalHexagramName: string;
  changingHexagramName: string;
  changingHexagramNumber: number;
  changingClassicalHexagramName: string;
  sourceMethod: string;
  numbers: { year: number; month: number; day: number; hourNumber: number; source: string };
  engineName: string;
  mode: string;
  confidenceNote: string;
}

/**
 * 构造梅花易数结果。上下卦/动爻确定后派生互卦/变卦/体用/吉凶/错综。
 */
function buildMeihuaResult(
  upperIndex: number,
  lowerIndex: number,
  movingLine: number,
  birth: MeihuaBirth,
  sourceLabel: string,
  numbers: { year: number; month: number; day: number; hourNumber: number; source: string },
  mode: 'local-exact' | 'local',
): MeihuaResult {
  const upper = MEIHUA_TRIGRAMS[upperIndex - 1];
  const lower = MEIHUA_TRIGRAMS[lowerIndex - 1];
  const upperLines = MEIHUA_NATURE[upper].lines;
  const lowerLines = MEIHUA_NATURE[lower].lines;
  // 底卦在下、上卦在上；逐爻从下到上排列（用于互卦取 2-3-4 / 3-4-5 爻）
  const bottomLines = lowerLines.slice().reverse().concat(upperLines.slice().reverse());
  const mutualLower = trigramFromLines([bottomLines[3], bottomLines[2], bottomLines[1]]);
  const mutualUpper = trigramFromLines([bottomLines[4], bottomLines[3], bottomLines[2]]);
  let changedUpper = upper;
  let changedLower = lower;
  if (movingLine <= 3) changedLower = changedTrigramName(lower, movingLine);
  else changedUpper = changedTrigramName(upper, movingLine - 3);
  const bodyTrigram = movingLine <= 3 ? upper : lower;
  const useTrigram = movingLine <= 3 ? lower : upper;
  const hexagramName = MEIHUA_NATURE[upper].nature + MEIHUA_NATURE[lower].nature;
  const changedHexagramName = MEIHUA_NATURE[changedUpper].nature + MEIHUA_NATURE[changedLower].nature;
  const canonicalHexagram = resolveHexagram(upper, lower);
  const changedCanonicalHexagram = resolveHexagram(changedUpper, changedLower);
  if (!canonicalHexagram || !changedCanonicalHexagram) throw new Error('未能识别六十四卦。');
  const relation = getBodyUseRelation(bodyTrigram, useTrigram);
  const fortune = MEIHUA_FORTUNE_LEVEL[relation] || { level: '—', detail: '' };
  const strategy = MEIHUA_STRATEGY[relation] || '';
  const cuoUpper = cuoTrigram(upper);
  const cuoLower = cuoTrigram(lower);
  const zong = zongTrigram(upper, lower);
  return {
    upperTrigram: meihuaTrigramInfo(upper),
    lowerTrigram: meihuaTrigramInfo(lower),
    changingLine: movingLine,
    mutualUpper: meihuaTrigramInfo(mutualUpper),
    mutualLower: meihuaTrigramInfo(mutualLower),
    bodyTrigram,
    useTrigram,
    bodyUseRelation: relation,
    fortuneLevel: fortune.level,
    fortuneDetail: fortune.detail,
    strategy,
    bodyGuaDe: MEIHUA_GUA_DE[bodyTrigram] || '',
    useGuaDe: MEIHUA_GUA_DE[useTrigram] || '',
    cuoTrigram: { upper: cuoUpper, lower: cuoLower, name: MEIHUA_NATURE[cuoUpper].nature + MEIHUA_NATURE[cuoLower].nature },
    zongTrigram: { upper: zong.upper, lower: zong.lower, name: MEIHUA_NATURE[zong.upper].nature + MEIHUA_NATURE[zong.lower].nature },
    hexagramName,
    hexagramNumber: canonicalHexagram.number,
    classicalHexagramName: canonicalHexagram.name,
    changingHexagramName: changedHexagramName,
    changingHexagramNumber: changedCanonicalHexagram.number,
    changingClassicalHexagramName: changedCanonicalHexagram.name,
    sourceMethod: sourceLabel,
    numbers,
    engineName: 'LocalMeihuaTimeAdapter',
    mode,
    confidenceNote: '本解读根据年月日时取数，观察本卦、互卦、变卦、体用生克、错卦与综卦。不同流派的取数方法可能不同，宜结合具体情境参考。',
  };
}

export interface MeihuaInput {
  birth: MeihuaBirth;
  /** time = 时间起卦（默认），number = 数字起卦，yarrow = 揲蓍法起卦 */
  method?: 'time' | 'number' | 'yarrow';
  /** method=number 时的两个数字 */
  numberA?: number;
  numberB?: number;
}

/**
 * 梅花易数计算 —— 纯 TS 版。
 * @param input 起卦输入
 * @param solar 可选 lunar-javascript Solar 入口（精确农历取数）；未传走公历近似
 */
export function calculateMeihua(input: MeihuaInput, solar?: SolarLike | null): MeihuaResult {
  const birth = input.birth;
  const method = input.method || 'time';

  if (method === 'yarrow') {
    // 揲蓍法：大衍50策三变一爻，六爻成卦，动爻由老阳/老阴决定
    const seed = birth.year * 10000 + birth.month * 100 + birth.day + (birth.hour || 0) + 3;
    const numbers = { year: 0, month: 0, day: 0, hourNumber: 0, source: '揲蓍法：大衍五十策三变一爻' };
    let s = Math.abs(seed) % 233280;
    const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const lines: number[] = []; // 每爻 6/7/8/9
    for (let yao = 0; yao < 6; yao++) {
      let sticks = 49;
      let remSum = 0;
      for (let change = 0; change < 3; change++) {
        const left = 1 + Math.floor(rng() * (sticks - 1));
        const right = sticks - left;
        const leftRem = ((left - 1) % 4) || 4;
        const rightRem = ((right % 4) || 4);
        remSum += leftRem + rightRem + 1;
        sticks = 48 - leftRem - rightRem;
      }
      lines.push(remSum <= 9 ? 9 : remSum === 10 ? 7 : remSum === 11 ? 8 : 6);
    }
    // 从6爻恢复上下卦+动爻
    const lowerLines = lines.slice(0, 3).map(v => v === 7 || v === 9); // true=阳
    const upperLines = lines.slice(3).map(v => v === 7 || v === 9);
    const changingIdx = lines.findIndex(v => v === 6 || v === 9); // 第一个动爻
    const movingLine = changingIdx >= 0 ? changingIdx + 1 : 1;
    const trigramFromYangLines = (yangLines: boolean[]) => trigramFromLines(yangLines.map((yang) => !yang));
    const lower = trigramFromYangLines(lowerLines);
    const upper = trigramFromYangLines(upperLines);
    return buildMeihuaResult(
      MEIHUA_TRIGRAMS.indexOf(upper) + 1,
      MEIHUA_TRIGRAMS.indexOf(lower) + 1,
      movingLine, birth, '揲蓍法', numbers, 'local',
    );
  }

  if (method === 'number' && input.numberA != null && input.numberB != null) {
    const na = Math.abs(Number(input.numberA) || 0);
    const nb = Math.abs(Number(input.numberB) || 0);
    const numbers = { year: na, month: nb, day: 0, hourNumber: 0, source: `数字起卦：上卦=${na}%8, 下卦=(${na}+${nb})%8, 动爻=(${na}+${nb})%6` };
    const upperIndex = modOne(na, 8);
    const lowerIndex = modOne(na + nb, 8);
    const movingLine = modOne(na + nb, 6);
    return buildMeihuaResult(upperIndex, lowerIndex, movingLine, birth, '数字起卦', numbers, 'local');
  }

  // 时间起卦
  const numbers = getMeihuaDateNumbers(birth, solar);
  const upperIdx = modOne(numbers.year + numbers.month + numbers.day, 8);
  const lowerIdx = modOne(numbers.year + numbers.month + numbers.day + numbers.hourNumber, 8);
  const moveLine = modOne(numbers.year + numbers.month + numbers.day + numbers.hourNumber, 6);
  const mode: 'local-exact' | 'local' = solar ? 'local-exact' : 'local';
  return buildMeihuaResult(upperIdx, lowerIdx, moveLine, birth, numbers.source, numbers, mode);
}

// ── ToolEnvelope 适配 ─────────────────────────────────────

export interface MeihuaData extends MeihuaResult {
  export_snapshot: ExportSnapshot;
}

/** 梅花易数的 ToolEnvelope 本地运行器版本。 */
export function calcMeihuaEnveloped(input: MeihuaInput, solar?: SolarLike | null): ToolEnvelope<MeihuaData> {
  const result = calculateMeihua(input, solar);
  const upper = result.upperTrigram;
  const lower = result.lowerTrigram;
  const classicalText = getHexagramText(result.classicalHexagramName);
  const sections: Array<{ heading: string; body: string }> = [
    { heading: '本卦', body: `上卦${upper.name}(${upper.nature}/${upper.element})、下卦${lower.name}(${lower.nature}/${lower.element})，成卦${result.classicalHexagramName}。` },
    { heading: '动爻与变卦', body: `${result.changingLine}爻动，变卦${result.changingClassicalHexagramName}。动爻在上卦则下卦为体、上卦为用；动爻在下卦则上卦为体、下卦为用。` },
    { heading: '体用生克', body: `体卦${result.bodyTrigram}（${result.bodyGuaDe}），用卦${result.useTrigram}（${result.useGuaDe}），关系${result.bodyUseRelation}。${result.fortuneDetail}` },
    { heading: '策略指导', body: result.strategy || '—' },
    { heading: '互卦/错综', body: `互卦${result.mutualUpper.name}${result.mutualLower.name}（中间过程）；错卦${result.cuoTrigram.name}、综卦${result.zongTrigram.name}（反观参考）。` },
  ];
  if (classicalText) {
    sections.push({ heading: '卦辞', body: classicalText.guaCi });
    const movingYao = result.changingLine;
    if (classicalText.yaoCi[movingYao - 1]) {
      sections.push({ heading: `${movingYao}爻辞`, body: classicalText.yaoCi[movingYao - 1] });
    }
    sections.push({ heading: '彖传', body: classicalText.tuanZhuan });
  }
  sections.push({ heading: '使用提醒', body: '本卦依传统梅花易数规则整理，适合用于传统文化学习与自我观察，不作为现实决策依据。' });
  const snapshot: ExportSnapshot = {
    summary: `上卦${upper.name}(${upper.nature})、下卦${lower.name}(${lower.nature})，${result.changingLine}爻动。体卦${result.bodyTrigram}、用卦${result.useTrigram}，体用${result.bodyUseRelation}，${result.fortuneLevel}。`,
    tags: ['梅花易数', result.hexagramName, '动爻' + result.changingLine, result.bodyUseRelation, result.fortuneLevel],
    sections,
    sourceNotes: '梅花易数内容仅作传统文化参考。',
  };

  return {
    ok: true,
    tool: result.engineName,
    version: result.mode,
    input_normalized: input as unknown as Record<string, unknown>,
    data: { ...result, export_snapshot: snapshot },
    warnings: [result.confidenceNote],
  };
}
