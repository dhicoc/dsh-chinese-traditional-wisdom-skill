/**
 * baziEngine — 八字排盘纯 TS 引擎（C 类迁移第四步）
 *
 * 整合 visual/js/engines/bazi-engine.js（本地近似 BaziEngine）与
 * engine-adapters.js 的 BaziLunarAdapter（精确节气干支）两条路径：
 * - 传入 solar（lunar-javascript Solar 入口）→ 走精确节气干支（local-exact）
 * - 未传 solar → 走本地近似（节气日近似表 + 基准日推日柱，local-approx）
 *
 * 两条路径输出结构一致（对齐 engine-adapters.js buildBaziResultFromPillars），
 * 渲染器/BaziWorkspace 可直接消费。旧 JS 保留作 EngineAdapterRegistry fallback，零回归。
 */

import type { ToolEnvelope, ExportSnapshot } from './baseTypes';
import type { CalculationStep } from './envelopeEvidence';
import type { ResolvedBaziBirth } from './birthTimeCorrection';
import { analyzeAdvancedBazi, type AdvancedBaziAnalysis } from './advancedBazi';
import { relationBetweenPillars } from './ganZhiChongHe';
import { resolveBaziEngineConfig } from './engineConfig';
import { calcShenSha, type ShenShaItem, type TrineSource } from './shensha';

const TG = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DZ = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 柱 key → 中文名（避免 toReading/snapshot 输出「year柱」中英混合） */
const PILLAR_CN: Record<string, string> = { year: '年', month: '月', day: '日', hour: '时' };
const STEM_WX = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
const STEM_YY = ['阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴', '阳', '阴'];
const BRANCH_WX = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];

const HIDDEN: Record<string, string[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'],
  卯: ['乙'], 辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'],
  午: ['丁', '己'], 未: ['己', '丁', '乙'], 申: ['庚', '壬', '戊'],
  酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};

// ─── lunar-javascript Solar/Lunar 入口类型（参数化）──
interface LunarEightCharLike {
  getYear?: () => string;
  getYearGanZhi?: () => string;
  year?: string;
  yearGanZhi?: string;
  getMonth?: () => string;
  getMonthGanZhi?: () => string;
  month?: string;
  monthGanZhi?: string;
  getDay?: () => string;
  getDayGanZhi?: () => string;
  day?: string;
  dayGanZhi?: string;
  getTime?: () => string;
  getTimeGanZhi?: () => string;
  getHour?: () => string;
  hour?: string;
  timeGanZhi?: string;
  /** lunar-javascript 大运入口 */
  /** lunar-javascript/lunar-typescript 大运入口（gender: string 或 number） */
  getYun?: (gender: string | number) => LunarYunLike;
}

/** lunar-javascript 大运对象（getYun 返回） */
interface LunarYunLike {
  getDaYun?: (n?: number) => Array<LunarDaYunLike>;
  isForward?: () => boolean;
  getStartSolar?: () => { toYmd?: () => string; toString?: () => string };
}

interface LunarXiaoYunLike {
  getGanZhi?: () => string;
  getAge?: () => number;
  getYear?: () => number;
}

/** lunar-javascript 单个大运对象 */
interface LunarDaYunLike {
  getGanZhi?: () => string;
  getStartAge?: () => number;
  getStartYear?: () => number;
  getEndYear?: () => number;
  getXiaoYun?: (n?: number) => Array<LunarXiaoYunLike>;
}
interface LunarLike {
  getEightChar?: () => LunarEightCharLike;
}

interface LunarTransitLike {
  getMonthInGanZhiExact?: () => string;
  getMonthInGanZhi?: () => string;
  getDayInGanZhiExact?: () => string;
  getDayInGanZhi?: () => string;
}

interface SolarLike {
  fromYmd?(y: number, mo: number, d: number): { getLunar(): unknown };
  fromYmdHms?(y: number, mo: number, d: number, h: number, mi: number, s: number): { getLunar(): unknown };
}

export interface BaziBirth {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  gender?: string;
  isLunar?: boolean;
  useExactCalendar?: boolean;
}

export interface BaziInput {
  birth: BaziBirth;
  /** 八字定盘使用的民用/校正时间上下文 */
  timeContext?: ResolvedBaziBirth;
  /** 可选 lunar-javascript Solar 入口（精确节气干支） */
  solar?: SolarLike | null;
  /** 神煞三合局查取口径：'year' 年支查（传统主流，默认）/ 'day' 日支查（流派之一） */
  shenShaTrineSource?: TrineSource;
  /** 可选动态层目标公历日期 */
  transitDate?: string;
}

export interface BaziPillar {
  stem: string;
  branch: string;
  stemIndex: number;
  branchIndex: number;
}
export interface BaziPillars {
  year: BaziPillar;
  month: BaziPillar;
  day: BaziPillar;
  hour: BaziPillar;
}

export interface BaziLuck {
  ageStart: number;
  stem: string;
  branch: string;
  stemWuxing: string;
  /** 起运年份（精确路径 lunar 提供） */
  startYear?: number;
  /** 该运结束年份（精确路径） */
  endYear?: number;
}

export interface BaziResult {
  engineName: string;
  mode: 'local-exact' | 'local-approx';
  confidenceNote: string;
  sourceProject?: string;
  pillars: BaziPillars;
  dayMaster: string;
  dayMasterWuxing: string;
  dayMasterYinYang: string;
  gender: string;
  hiddenStems: Record<string, string[]>;
  shishen: Record<string, { stem: string; branch: string }>;
  shishenList: Record<string, string>;
  elements: Record<string, number>;
  luck: BaziLuck[];
  luckDirection: '顺行' | '逆行';
  luckStartSolar?: string;
  advancedAnalysis: AdvancedBaziAnalysis;
  shenSha: ShenShaItem[];
  /** 本命局神煞所用的三合局查取口径 */
  shenShaTrineSource: TrineSource;
  calendar?: { provider: string; exactSolarTerms: boolean };
}

export interface BaziTransitRelation {
  pillar: string;
  ganZhi: string;
  relations: string[];
}

export interface BaziTransitSnapshot {
  targetYear: number;
  age: number;
  luck: BaziLuck[];
  luckDirection: '顺行' | '逆行';
  luckStartSolar?: string;
  currentLuck: BaziLuck | null;
  yearly: {
    stem: string;
    branch: string;
    stemShiShen: string;
    stemWuxing: string;
  };
  natalRelations: BaziTransitRelation[];
  luckRelations: string[];
  available: boolean;
}

export interface BaziMonthDayPillar {
  stem: string;
  branch: string;
  stemShiShen: string;
  stemWuxing: string;
  natalRelations: BaziTransitRelation[];
  luckRelations: string[];
}

export interface BaziMonthDaySnapshot {
  targetDate: string;
  currentLuck: BaziLuck | null;
  monthly: BaziMonthDayPillar;
  daily: BaziMonthDayPillar;
  available: boolean;
}

export type BaziDynamicLayerName = 'yearly' | 'monthly' | 'daily';
export type BaziRelationReference = 'natal' | 'decadal' | 'minor';
export type BaziRelationName =
  | '天干合'
  | '天干冲'
  | '六合'
  | '三合'
  | '六冲'
  | '相害'
  | '相刑'
  | '天克地冲'
  | '岁运并临'
  | '伏吟'
  | '反吟';

export interface BaziDynamicPillar {
  stem: string;
  branch: string;
  stemShiShen: string;
  stemWuxing: string;
}

export interface BaziMinorFortune extends BaziDynamicPillar {
  nominalAge: number;
  source: 'lunar-exact' | 'local-fallback';
}

export interface BaziRelationMatch {
  reference: BaziRelationReference;
  referenceKey?: 'year' | 'month' | 'day' | 'hour';
  referenceGanZhi: string;
  relations: BaziRelationName[];
}

export interface BaziDynamicRelations {
  natal: BaziRelationMatch[];
  decadal: BaziRelationMatch[];
  minor: BaziRelationMatch[];
}

export interface BaziDynamicLayer {
  targetDate: string;
  nominalAge: number;
  decadal: {
    direction: '顺行' | '逆行';
    startSolar?: string;
    current: BaziLuck | null;
    all: BaziLuck[];
  };
  minor: BaziMinorFortune;
  yearly: BaziDynamicPillar;
  monthly: BaziDynamicPillar;
  daily: BaziDynamicPillar;
  relations: Record<BaziDynamicLayerName, BaziDynamicRelations>;
  available: boolean;
  limitations: string[];
}

// ─── 十神 ───
function getShiShen(dayStem: number, otherStem: number): string {
  const d = dayStem, o = otherStem;
  const diff = (o - d + 10) % 10;
  const same = (d % 2 === 0) === (o % 2 === 0);
  if (diff === 0) return same ? '比肩' : '劫财';
  if (diff === 1) return same ? '偏印' : '正印';
  if (diff === 2) return '食神';
  if (diff === 3) return '伤官';
  if (diff === 4) return '偏财';
  if (diff === 5) return '正财';
  if (diff === 6) return '七杀';
  if (diff === 7) return '正官';
  if (diff === 8) return same ? '比肩' : '劫财';
  if (diff === 9) return same ? '偏印' : '正印';
  return '';
}

// ─── 本地近似：节气日近似表 ───
const SOLAR_TERMS = [
  { m: 2, d: 4 }, { m: 3, d: 6 }, { m: 4, d: 5 },
  { m: 5, d: 6 }, { m: 6, d: 6 }, { m: 7, d: 7 },
  { m: 8, d: 7 }, { m: 9, d: 8 }, { m: 10, d: 8 },
  { m: 11, d: 7 }, { m: 12, d: 7 }, { m: 1, d: 6 },
];
function getMonthIndex(year: number, month: number, day: number): number {
  let idx = 0;
  for (let i = 0; i < SOLAR_TERMS.length; i++) {
    const t = SOLAR_TERMS[i];
    if (month > t.m || (month === t.m && day >= t.d)) idx = i + 1;
  }
  return idx >= 12 ? 0 : idx;
}

function calcPillarsLocal(year: number, month: number, day: number, hour: number): BaziPillars {
  // 年柱（立春前用上年）
  let yStem = (year - 4) % 10;
  let yBranch = (year - 4) % 12;
  if (month < 2 || (month === 2 && day < 4)) {
    yStem = (year - 5) % 10;
    yBranch = (year - 5) % 12;
  }
  if (yStem < 0) yStem += 10;
  if (yBranch < 0) yBranch += 12;

  // 月柱
  const monthIdx = getMonthIndex(year, month, day);
  let mStem = (yStem * 2 + monthIdx + 2) % 10;
  if (mStem < 0) mStem += 10;
  const mBranch = (monthIdx + 2) % 12;

  // 日柱（1900-01-01 = 甲子索引35 = 己亥）
  const ref = new Date(1900, 0, 1);
  const tgt = new Date(year, month - 1, day);
  const days = Math.round((tgt.getTime() - ref.getTime()) / 86400000);
  let sexa = (35 + days) % 60;
  if (sexa < 0) sexa += 60;
  let dStem = sexa % 10;
  let dBranch = sexa % 12;

  // 时柱
  const hBranch = Math.floor((hour + 1) / 2) % 12;
  let hStem = (dStem * 2 + hBranch) % 10;
  if (hStem < 0) hStem += 10;

  // 子时 23:00+ 日柱用次日
  if (hour >= 23) {
    const nextDay = (sexa + 1) % 60;
    dStem = nextDay % 10;
    dBranch = nextDay % 12;
    hStem = (dStem * 2 + 0) % 10;
  }

  return {
    year: { stem: TG[yStem], branch: DZ[yBranch], stemIndex: yStem, branchIndex: yBranch },
    month: { stem: TG[mStem], branch: DZ[mBranch], stemIndex: mStem, branchIndex: mBranch },
    day: { stem: TG[dStem], branch: DZ[dBranch], stemIndex: dStem, branchIndex: dBranch },
    hour: { stem: TG[hStem], branch: DZ[hBranch], stemIndex: hStem, branchIndex: hBranch },
  };
}

// ─── 五行统计（茎2 + 支2 + 藏干1）──
function calcElements(pillars: BaziPillars): Record<string, number> {
  const c: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  (['year', 'month', 'day', 'hour'] as const).forEach((k) => {
    const p = pillars[k];
    c[STEM_WX[p.stemIndex]] += 2;
    c[BRANCH_WX[p.branchIndex]] += 2;
    (HIDDEN[p.branch] || []).forEach((h) => {
      const hi = TG.indexOf(h);
      if (hi >= 0) c[STEM_WX[hi]] += 1;
    });
  });
  return c;
}

function getLuckDirection(pillars: BaziPillars, gender: string): '顺行' | '逆行' {
  const yYang = pillars.year.stemIndex % 2 === 0;
  const isMale = gender === '男';
  return (yYang && isMale) || (!yYang && !isMale) ? '顺行' : '逆行';
}

// ─── 大运（简化 3 岁起运）──
function calcLuck(pillars: BaziPillars, gender: string): BaziLuck[] {
  const mStem = pillars.month.stemIndex;
  const mBranch = pillars.month.branchIndex;
  const forward = getLuckDirection(pillars, gender) === '顺行';
  const luck: BaziLuck[] = [];
  for (let i = 0; i < 8; i++) {
    const age = 3 + i * 10;
    const ls = forward ? (mStem + i + 1) % 10 : (mStem - i - 1 + 10) % 10;
    const lb = forward ? (mBranch + i + 1) % 12 : (mBranch - i - 1 + 12) % 12;
    luck.push({ ageStart: age, stem: TG[ls], branch: DZ[lb], stemWuxing: STEM_WX[ls] });
  }
  return luck;
}

/**
 * 精确大运（lunar-javascript getYun/getDaYun）。
 * 精确起运年龄（按节气余气折算），并带起运/结束年份。跳过 lunar 的胎运段（index 0）。
 * 返回 null 表示 lunar 能力不可用（调用方降级简化大运）。
 */
interface LunarLuckMetadata {
  luck: BaziLuck[];
  direction: '顺行' | '逆行';
  startSolar?: string;
}

function calcLuckWithLunar(solar: SolarLike, birth: BaziBirth): LunarLuckMetadata | null {
  try {
    const s = solar.fromYmdHms
      ? solar.fromYmdHms(birth.year, birth.month, birth.day, birth.hour, birth.minute || 0, 0)
      : solar.fromYmd?.(birth.year, birth.month, birth.day);
    const lunar = (s && typeof s.getLunar === 'function' ? s.getLunar() : null) as LunarLike | null;
    const eightChar = lunar && typeof lunar.getEightChar === 'function' ? lunar.getEightChar() : null;
    const getYun = eightChar && typeof eightChar.getYun === 'function' ? eightChar.getYun : null;
    if (!getYun) return null;
    const yun = getYun.call(eightChar, birth.gender === '女' ? 0 : 1);
    const getDaYun = yun && typeof yun.getDaYun === 'function' ? yun.getDaYun : null;
    if (!getDaYun) return null;
    const daYun = getDaYun.call(yun);
    if (!Array.isArray(daYun)) return null;

    const luck: BaziLuck[] = [];
    for (const d of daYun) {
      const gz = d && typeof d.getGanZhi === 'function' ? d.getGanZhi() : '';
      const stem = gz.charAt(0);
      const branch = gz.charAt(1);
      const stemIndex = TG.indexOf(stem);
      // 跳过胎运段（干支为空，出生前，startAge < 1）
      if (stemIndex < 0) continue;
      const ageStart = d.getStartAge ? d.getStartAge() : 0;
      luck.push({
        ageStart,
        stem,
        branch,
        stemWuxing: STEM_WX[stemIndex],
        startYear: d.getStartYear ? d.getStartYear() : undefined,
        endYear: d.getEndYear ? d.getEndYear() : undefined,
      });
    }
    if (!luck.length) return null;
    const startSolar = yun.getStartSolar?.();
    const startSolarText = startSolar?.toYmd?.() ?? startSolar?.toString?.();
    return {
      luck,
      direction: yun.isForward?.() === false ? '逆行' : '顺行',
      startSolar: startSolarText,
    };
  } catch {
    return null;
  }
}

// ─── 由 pillars 构建完整结果（对齐 engine-adapters buildBaziResultFromPillars）──
function buildResultFromPillars(
  pillars: BaziPillars,
  birth: BaziBirth,
  luck: BaziLuck[],
  mode: 'local-exact' | 'local-approx',
  confidenceNote: string,
  sourceProject: string | undefined,
  trineSource: TrineSource,
  luckDirection = getLuckDirection(pillars, birth.gender || '男'),
  luckStartSolar?: string,
): BaziResult {
  const dm = pillars.day.stemIndex;
  const hiddenStems: Record<string, string[]> = {};
  const shishenList: Record<string, string> = {};
  const shishen: Record<string, { stem: string; branch: string }> = {};
  (['year', 'month', 'day', 'hour'] as const).forEach((k) => {
    hiddenStems[k] = HIDDEN[pillars[k].branch] || [];
    shishenList[k] = getShiShen(dm, pillars[k].stemIndex);
    const mainH = hiddenStems[k].length ? TG.indexOf(hiddenStems[k][0]) : -1;
    shishen[k] = { stem: shishenList[k], branch: mainH >= 0 ? getShiShen(dm, mainH) : '' };
  });
  const result: BaziResult = {
    engineName: mode === 'local-exact' ? 'BaziLunarAdapter' : 'BaziEngine',
    mode,
    confidenceNote,
    sourceProject,
    pillars,
    dayMaster: pillars.day.stem,
    dayMasterWuxing: STEM_WX[dm],
    dayMasterYinYang: STEM_YY[dm],
    gender: birth.gender || '男',
    hiddenStems,
    shishen,
    shishenList,
    elements: calcElements(pillars),
    luck,
    luckDirection,
    luckStartSolar,
    advancedAnalysis: analyzeAdvancedBazi(pillars),
    shenSha: calcShenSha(pillars, trineSource, (birth.gender ?? '男') as '男' | '女'),
    shenShaTrineSource: trineSource,
  };
  if (mode === 'local-exact') result.calendar = { provider: 'lunar-javascript', exactSolarTerms: true };
  return result;
}

// ─── 精确路径：lunar-javascript 取节气干支 ───
function callFirst(obj: LunarEightCharLike | undefined, names: string[]): string {
  if (!obj) return '';
  for (const name of names) {
    const v = (obj as Record<string, unknown>)[name];
    // 用 call(obj) 保证 this 绑定（lunar-javascript 方法依赖 this 访问内部 _p）
    if (typeof v === 'function') return (v as (...a: unknown[]) => unknown).call(obj) as string;
    if (v !== undefined) return String(v);
  }
  return '';
}

function extractPillarText(eightChar: LunarEightCharLike, keys: string[]): string {
  const value = callFirst(eightChar, keys);
  const s = value && typeof value.toString === 'function' ? value.toString() : '';
  return String(s || '').replace(/\s/g, '').slice(0, 2);
}

function pillarFromText(text: string): { stem: string; branch: string; stemIndex: number; branchIndex: number } {
  const stem = text.charAt(0);
  const branch = text.charAt(1);
  const stemIndex = TG.indexOf(stem);
  const branchIndex = DZ.indexOf(branch);
  if (stemIndex < 0 || branchIndex < 0) throw new Error('无法解析干支: ' + text);
  return { stem, branch, stemIndex, branchIndex };
}

function calcPillarsWithLunar(birth: BaziBirth, solar: SolarLike): BaziPillars | null {
  const s = solar.fromYmdHms
    ? solar.fromYmdHms(birth.year, birth.month, birth.day, birth.hour, birth.minute || 0, 0)
    : solar.fromYmd?.(birth.year, birth.month, birth.day);
  const lunar = (s && typeof s.getLunar === 'function' ? s.getLunar() : null) as LunarLike | null;
  const eightChar = lunar && typeof lunar.getEightChar === 'function' ? lunar.getEightChar() : null;
  if (!eightChar) return null;
  return {
    year: pillarFromText(extractPillarText(eightChar, ['getYear', 'getYearGanZhi', 'year', 'yearGanZhi'])),
    month: pillarFromText(extractPillarText(eightChar, ['getMonth', 'getMonthGanZhi', 'month', 'monthGanZhi'])),
    day: pillarFromText(extractPillarText(eightChar, ['getDay', 'getDayGanZhi', 'day', 'dayGanZhi'])),
    hour: pillarFromText(extractPillarText(eightChar, ['getTime', 'getTimeGanZhi', 'getHour', 'hour', 'timeGanZhi'])),
  };
}

// ─── 主入口 ───
export function calculateBazi(input: BaziInput): BaziResult {
  const birth = input.birth;
  const gender = birth.gender || '男';
  const trineSource: TrineSource = input.shenShaTrineSource ?? 'year';

  // 精确路径
  if (birth.useExactCalendar !== false && input.solar) {
    try {
      const pillars = calcPillarsWithLunar(birth, input.solar);
      if (pillars) {
        // 精确大运（lunar getYun 节气余气起运）；不可用则降级简化
        const lunarLuck = calcLuckWithLunar(input.solar, birth);
        const luck = lunarLuck?.luck ?? calcLuck(pillars, gender);
        const hasExactLuck = luck.length > 0 && luck[0].startYear !== undefined;
        return buildResultFromPillars(
          pillars, birth, luck, 'local-exact',
          hasExactLuck
            ? '已通过 lunar-javascript/Solar 全局对象读取节气干支；大运按节气余气精确起运。'
            : '已通过 lunar-javascript/Solar 全局对象读取节气干支；起运沿用本地简化大运。',
          '6tail/lunar-javascript',
          trineSource,
          lunarLuck?.direction,
          lunarLuck?.startSolar,
        );
      }
    } catch {
      /* 降级近似 */
    }
  }

  // 近似路径
  const pillars = calcPillarsLocal(birth.year, birth.month, birth.day, birth.hour);
  const luck = calcLuck(pillars, gender);
  return buildResultFromPillars(
    pillars, birth, luck, 'local-approx',
    '纯 JS 本地快速排盘；月柱使用近似节气，起运按 3 岁简化，适合可视化与学习参考。',
    undefined,
    trineSource,
  );
}

function describeTransitRelations(referenceGanZhi: string, yearlyGanZhi: string): string[] {
  const relation = relationBetweenPillars(referenceGanZhi, yearlyGanZhi);
  return [
    relation.ganHe ? '天干合' : '',
    relation.ganChong ? '天干冲' : '',
    relation.liuHe ? '六合' : '',
    relation.sanHe ? '三合' : '',
    relation.chong ? '六冲' : '',
    relation.hai ? '相害' : '',
    relation.xing ? '相刑' : '',
  ].filter(Boolean);
}

function buildTransitRelations(pillars: BaziPillars, transitGanZhi: string): BaziTransitRelation[] {
  return (['year', 'month', 'day', 'hour'] as const).map((key) => {
    const pillar = pillars[key];
    const ganZhi = `${pillar.stem}${pillar.branch}`;
    return { pillar: `${PILLAR_CN[key]}柱`, ganZhi, relations: describeTransitRelations(ganZhi, transitGanZhi) };
  }).filter((item) => item.relations.length > 0);
}

export function getBaziTransitSnapshot(input: BaziInput['birth'], targetYear: number, solar?: SolarLike | null): BaziTransitSnapshot {
  const empty: BaziTransitSnapshot = {
    targetYear,
    age: 0,
    luck: [],
    luckDirection: '顺行',
    currentLuck: null,
    yearly: { stem: '', branch: '', stemShiShen: '', stemWuxing: '' },
    natalRelations: [],
    luckRelations: [],
    available: false,
  };
  if (!Number.isInteger(targetYear)) return empty;
  try {
    const result = calculateBazi({ birth: input, solar });
    const age = targetYear - input.year;
    const currentLuck = result.luck.reduce<BaziLuck | null>((active, item) => (
      item.ageStart <= age && (!active || item.ageStart > active.ageStart) ? item : active
    ), null);
    const stemIndex = ((targetYear - 4) % 10 + 10) % 10;
    const branchIndex = ((targetYear - 4) % 12 + 12) % 12;
    const yearlyGanZhi = `${TG[stemIndex]}${DZ[branchIndex]}`;
    const natalRelations = buildTransitRelations(result.pillars, yearlyGanZhi);
    const luckGanZhi = currentLuck ? `${currentLuck.stem}${currentLuck.branch}` : '';
    return {
      targetYear,
      age,
      luck: result.luck,
      luckDirection: result.luckDirection,
      luckStartSolar: result.luckStartSolar,
      currentLuck,
      yearly: {
        stem: TG[stemIndex],
        branch: DZ[branchIndex],
        stemShiShen: getShiShen(result.pillars.day.stemIndex, stemIndex),
        stemWuxing: STEM_WX[stemIndex],
      },
      natalRelations,
      luckRelations: luckGanZhi ? describeTransitRelations(luckGanZhi, yearlyGanZhi) : [],
      available: true,
    };
  } catch {
    return empty;
  }
}

function createEmptyMonthDayPillar(): BaziMonthDayPillar {
  return { stem: '', branch: '', stemShiShen: '', stemWuxing: '', natalRelations: [], luckRelations: [] };
}

function parseSolarDate(date: string): { year: number; month: number; day: number } | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return { year, month, day };
}

function createMonthDayPillar(result: BaziResult, ganZhi: string, currentLuck: BaziLuck | null): BaziMonthDayPillar {
  const stem = ganZhi.charAt(0);
  const branch = ganZhi.charAt(1);
  const stemIndex = TG.indexOf(stem);
  if (stemIndex < 0 || DZ.indexOf(branch) < 0) return createEmptyMonthDayPillar();
  const luckGanZhi = currentLuck ? `${currentLuck.stem}${currentLuck.branch}` : '';
  return {
    stem,
    branch,
    stemShiShen: getShiShen(result.pillars.day.stemIndex, stemIndex),
    stemWuxing: STEM_WX[stemIndex],
    natalRelations: buildTransitRelations(result.pillars, ganZhi),
    luckRelations: luckGanZhi ? describeTransitRelations(luckGanZhi, ganZhi) : [],
  };
}

function emptyDynamicPillar(): BaziDynamicPillar {
  return { stem: '', branch: '', stemShiShen: '', stemWuxing: '' };
}

function emptyDynamicRelations(): BaziDynamicRelations {
  return { natal: [], decadal: [], minor: [] };
}

function emptyDynamicLayer(targetDate: string, limitation: string): BaziDynamicLayer {
  return {
    targetDate,
    nominalAge: 0,
    decadal: { direction: '顺行', current: null, all: [] },
    minor: { nominalAge: 0, ...emptyDynamicPillar(), source: 'local-fallback' },
    yearly: emptyDynamicPillar(),
    monthly: emptyDynamicPillar(),
    daily: emptyDynamicPillar(),
    relations: { yearly: emptyDynamicRelations(), monthly: emptyDynamicRelations(), daily: emptyDynamicRelations() },
    available: false,
    limitations: [limitation, '动态层仅作传统文化规则参照，不对应现实结果保证。'],
  };
}

function dynamicPillar(result: BaziResult, ganZhi: string): BaziDynamicPillar {
  const stem = ganZhi.charAt(0);
  const branch = ganZhi.charAt(1);
  const stemIndex = TG.indexOf(stem);
  if (stemIndex < 0 || DZ.indexOf(branch) < 0) return emptyDynamicPillar();
  return {
    stem,
    branch,
    stemShiShen: getShiShen(result.pillars.day.stemIndex, stemIndex),
    stemWuxing: STEM_WX[stemIndex],
  };
}

function localMinorGanZhi(result: BaziResult, nominalAge: number): string {
  const offset = Math.max(0, nominalAge - 1);
  const direction = result.luckDirection === '顺行' ? 1 : -1;
  const stemIndex = (result.pillars.month.stemIndex + direction * (offset + 1) + 200) % 10;
  const branchIndex = (result.pillars.month.branchIndex + direction * (offset + 1) + 240) % 12;
  return `${TG[stemIndex]}${DZ[branchIndex]}`;
}

function createMinorFortune(result: BaziResult, birth: BaziBirth, nominalAge: number, solar?: SolarLike | null): BaziMinorFortune {
  let ganZhi = '';
  if (solar?.fromYmdHms) {
    try {
      const solarBirth = solar.fromYmdHms(birth.year, birth.month, birth.day, birth.hour, birth.minute ?? 0, 0);
      const lunar = solarBirth.getLunar() as LunarLike;
      const eightChar = lunar.getEightChar?.();
      const yun = eightChar?.getYun?.(birth.gender === '女' ? 0 : 1);
      const exact = yun?.getDaYun?.()
        .flatMap((daYun) => daYun.getXiaoYun?.() ?? [])
        .find((item) => item.getAge?.() === nominalAge);
      ganZhi = exact?.getGanZhi?.() ?? '';
    } catch {
      ganZhi = '';
    }
  }
  const pillar = dynamicPillar(result, ganZhi || localMinorGanZhi(result, nominalAge));
  return { nominalAge, ...pillar, source: ganZhi ? 'lunar-exact' : 'local-fallback' };
}

export function deriveRelationNames(referenceGanZhi: string, targetGanZhi: string): BaziRelationName[] {
  const relation = relationBetweenPillars(referenceGanZhi, targetGanZhi);
  const names: BaziRelationName[] = [
    relation.ganHe ? '天干合' : null,
    relation.ganChong ? '天干冲' : null,
    relation.liuHe ? '六合' : null,
    relation.sanHe ? '三合' : null,
    relation.chong ? '六冲' : null,
    relation.hai ? '相害' : null,
    relation.xing ? '相刑' : null,
  ].filter((name): name is BaziRelationName => name !== null);
  if (referenceGanZhi === targetGanZhi) names.push('伏吟');
  if (relation.ganChong && relation.chong) names.push('天克地冲', '反吟');
  return names;
}

export function buildDynamicRelationMatches(
  pillars: BaziPillars,
  targetGanZhi: string,
  currentLuck: BaziLuck | null,
  minor: BaziMinorFortune,
  layer: BaziDynamicLayerName,
): BaziDynamicRelations {
  const natal = (['year', 'month', 'day', 'hour'] as const).flatMap((referenceKey) => {
    const referenceGanZhi = `${pillars[referenceKey].stem}${pillars[referenceKey].branch}`;
    const relations = deriveRelationNames(referenceGanZhi, targetGanZhi);
    return relations.length ? [{ reference: 'natal' as const, referenceKey, referenceGanZhi, relations }] : [];
  });
  const decadalGanZhi = currentLuck ? `${currentLuck.stem}${currentLuck.branch}` : '';
  const decadalRelations = decadalGanZhi ? deriveRelationNames(decadalGanZhi, targetGanZhi) : [];
  if (layer === 'yearly' && decadalGanZhi === targetGanZhi) decadalRelations.push('岁运并临');
  const minorGanZhi = `${minor.stem}${minor.branch}`;
  const minorRelations = deriveRelationNames(minorGanZhi, targetGanZhi);
  return {
    natal,
    decadal: decadalRelations.length ? [{ reference: 'decadal', referenceGanZhi: decadalGanZhi, relations: [...new Set(decadalRelations)] }] : [],
    minor: minorRelations.length ? [{ reference: 'minor', referenceGanZhi: minorGanZhi, relations: minorRelations }] : [],
  };
}

export function getBaziMonthDaySnapshot(input: BaziInput['birth'], targetDate: string, solar?: SolarLike | null): BaziMonthDaySnapshot {
  const empty: BaziMonthDaySnapshot = {
    targetDate,
    currentLuck: null,
    monthly: createEmptyMonthDayPillar(),
    daily: createEmptyMonthDayPillar(),
    available: false,
  };
  const date = parseSolarDate(targetDate);
  if (!date || !solar) return empty;
  try {
    const result = calculateBazi({ birth: input, solar });
    const age = date.year - input.year;
    const currentLuck = result.luck.reduce<BaziLuck | null>((active, item) => (
      item.ageStart <= age && (!active || item.ageStart > active.ageStart) ? item : active
    ), null);
    const lunar = solar.fromYmd?.(date.year, date.month, date.day).getLunar() as LunarTransitLike;
    const monthlyGanZhi = lunar.getMonthInGanZhiExact?.() ?? lunar.getMonthInGanZhi?.() ?? '';
    const dailyGanZhi = lunar.getDayInGanZhiExact?.() ?? lunar.getDayInGanZhi?.() ?? '';
    const monthly = createMonthDayPillar(result, monthlyGanZhi, currentLuck);
    const daily = createMonthDayPillar(result, dailyGanZhi, currentLuck);
    if (!monthly.stem || !daily.stem) return empty;
    return { targetDate, currentLuck, monthly, daily, available: true };
  } catch {
    return empty;
  }
}

export function buildBaziDynamicLayer(
  birth: BaziInput['birth'],
  targetDate: string,
  solar?: SolarLike | null,
): BaziDynamicLayer {
  const date = parseSolarDate(targetDate);
  if (!date) return emptyDynamicLayer(targetDate, '目标日期不是有效公历日期。');
  if (!solar) return emptyDynamicLayer(targetDate, '缺少精确历法入口，无法计算流月与流日。');

  try {
    const result = calculateBazi({ birth, solar });
    const nominalAge = date.year - birth.year + 1;
    const actualAge = date.year - birth.year;
    const currentLuck = result.luck.reduce<BaziLuck | null>((active, item) => (
      item.ageStart <= actualAge && (!active || item.ageStart > active.ageStart) ? item : active
    ), null);
    const lunar = solar.fromYmd?.(date.year, date.month, date.day).getLunar() as LunarTransitLike;
    const monthlyGanZhi = lunar.getMonthInGanZhiExact?.() ?? lunar.getMonthInGanZhi?.() ?? '';
    const dailyGanZhi = lunar.getDayInGanZhiExact?.() ?? lunar.getDayInGanZhi?.() ?? '';
    const yearlyGanZhi = `${TG[((date.year - 4) % 10 + 10) % 10]}${DZ[((date.year - 4) % 12 + 12) % 12]}`;
    const yearly = dynamicPillar(result, yearlyGanZhi);
    const monthly = dynamicPillar(result, monthlyGanZhi);
    const daily = dynamicPillar(result, dailyGanZhi);
    if (!yearly.stem || !monthly.stem || !daily.stem) {
      return emptyDynamicLayer(targetDate, '无法从精确历法取得完整的流年月日干支。');
    }
    const minor = createMinorFortune(result, birth, nominalAge, solar);

    return {
      targetDate,
      nominalAge,
      decadal: { direction: result.luckDirection, startSolar: result.luckStartSolar, current: currentLuck, all: result.luck },
      minor,
      yearly,
      monthly,
      daily,
      relations: {
        yearly: buildDynamicRelationMatches(result.pillars, yearlyGanZhi, currentLuck, minor, 'yearly'),
        monthly: buildDynamicRelationMatches(result.pillars, monthlyGanZhi, currentLuck, minor, 'monthly'),
        daily: buildDynamicRelationMatches(result.pillars, dailyGanZhi, currentLuck, minor, 'daily'),
      },
      available: true,
      limitations: ['动态层仅作传统文化规则参照，不对应现实结果保证。'],
    };
  } catch {
    return emptyDynamicLayer(targetDate, '动态层计算失败，未生成可验证的干支结果。');
  }
}

// ─── ToolEnvelope 适配 ───
export interface BaziData extends BaziResult {
  transit?: BaziDynamicLayer;
  export_snapshot: ExportSnapshot;
}

function formatBirthTime(birth: BaziBirth): string {
  return `${birth.year}-${String(birth.month).padStart(2, '0')}-${String(birth.day).padStart(2, '0')} ${String(birth.hour).padStart(2, '0')}:${String(birth.minute ?? 0).padStart(2, '0')}`;
}

export function calcBaziEnveloped(input: BaziInput): ToolEnvelope<BaziData> {
  const result = calculateBazi(input);
  const transit = input.transitDate ? buildBaziDynamicLayer(input.birth, input.transitDate, input.solar) : undefined;
  const config = resolveBaziEngineConfig({
    mode: result.mode,
    shenShaTrineSource: result.shenShaTrineSource,
    hasExactLuck: result.luck.some((luck) => luck.startYear !== undefined),
  });
  const p = result.pillars;
  const pillarsStr = [p.year, p.month, p.day, p.hour].map((col) => col.stem + col.branch).join(' ');
  const dm = result.dayMaster;
  const dmWx = result.dayMasterWuxing;
  const dmYy = result.dayMasterYinYang;
  const els = result.elements;
  const elSummary = Object.keys(els).map((k) => `${k}:${els[k]}`).join(' ');
  let maxEl = '', maxVal = -1, minEl = '', minVal = Infinity;
  Object.keys(els).forEach((k) => { if (els[k] > maxVal) { maxVal = els[k]; maxEl = k; } if (els[k] < minVal) { minVal = els[k]; minEl = k; } });
  const strength = result.advancedAnalysis.support.strength;
  const dynamicSteps: CalculationStep[] = transit ? [
    { key: 'transit-date', stage: '动态层定锚', status: transit.available ? 'ok' : 'fallback', inputs: { targetDate: transit.targetDate }, result: `虚岁${transit.nominalAge}`, dependsOnStepKeys: ['settle'], promptText: `动态层目标日期 ${transit.targetDate}，虚岁${transit.nominalAge}`, limitation: transit.limitations.join('；') },
    { key: 'transit-minor', stage: '小运', status: transit.minor.source === 'lunar-exact' ? 'ok' : 'fallback', inputs: { nominalAge: transit.nominalAge }, result: `${transit.minor.stem}${transit.minor.branch}`, dependsOnStepKeys: ['transit-date'], promptText: `小运 ${transit.minor.stem}${transit.minor.branch}，按虚岁定位`, limitation: transit.minor.source === 'lunar-exact' ? undefined : '小运使用本地降级规则' },
    { key: 'transit-yearly', stage: '流年', status: transit.available ? 'ok' : 'fallback', result: `${transit.yearly.stem}${transit.yearly.branch}`, dependsOnStepKeys: ['transit-date'], promptText: `流年 ${transit.yearly.stem}${transit.yearly.branch}` },
    { key: 'transit-monthly', stage: '流月', status: transit.available ? 'ok' : 'fallback', result: `${transit.monthly.stem}${transit.monthly.branch}`, dependsOnStepKeys: ['transit-date'], promptText: `流月 ${transit.monthly.stem}${transit.monthly.branch}` },
    { key: 'transit-daily', stage: '流日', status: transit.available ? 'ok' : 'fallback', result: `${transit.daily.stem}${transit.daily.branch}`, dependsOnStepKeys: ['transit-date'], promptText: `流日 ${transit.daily.stem}${transit.daily.branch}` },
    { key: 'transit-relations', stage: '干支关系', status: transit.available ? 'ok' : 'fallback', result: transit.available ? JSON.stringify(transit.relations) : '', dependsOnStepKeys: ['transit-minor', 'transit-yearly', 'transit-monthly', 'transit-daily'], promptText: '动态柱与原局、大运、小运的结构关系', limitation: '关系仅作传统规则参照，不自动推导现实场景结论。' },
  ] : [];

  const snapshot: ExportSnapshot = {
    summary: `你的日主为${dm}${dmWx}。盘中${maxEl}的表现相对更明显，${minEl}相对较少；按当前规则，整体力量${strength === '身强' ? '偏强' : strength === '身弱' ? '偏弱' : '较平衡'}。五行分布仅用于辅助观察。`,
    tags: ['八字', dmWx + '命', dmYy + '干', strength],
    sections: [
      ...(input.timeContext ? [{
        heading: '排盘口径',
        body: input.timeContext.applied
          ? `民用出生时间：${formatBirthTime(input.timeContext.civilBirth)}；排盘时间：${formatBirthTime(input.timeContext.correctedBirth)}。已按出生地点经度换算地方平太阳时（校正 ${input.timeContext.correctionMinutes >= 0 ? '+' : ''}${input.timeContext.correctionMinutes} 分钟）。${input.timeContext.crossedDate || input.timeContext.crossedShichen || input.timeContext.crossedZiChu ? '校时已跨越' + [input.timeContext.crossedDate ? '日期' : '', input.timeContext.crossedShichen ? '时辰' : '', input.timeContext.crossedZiChu ? '子初换日边界' : ''].filter(Boolean).join('、') + '，按子初换日口径定盘。' : '按子初换日口径定盘。'}`
          : `排盘时间采用民用出生时间 ${formatBirthTime(input.timeContext.civilBirth)}；未启用经度校时，按子初换日口径定盘。`,
      }] : []),
      { heading: '四柱', body: `年柱 ${p.year.stem}${p.year.branch}、月柱 ${p.month.stem}${p.month.branch}、日柱 ${p.day.stem}${p.day.branch}、时柱 ${p.hour.stem}${p.hour.branch}。` },
      { heading: '五行分布', body: `${elSummary}。最旺：${maxEl}(${maxVal})，最弱：${minEl}(${minVal})。` },
      { heading: '十神', body: (['year', 'month', 'day', 'hour'] as const).map((k) => `${PILLAR_CN[k]}柱${result.shishenList[k]}`).join('、') + '。' },
      { heading: '日主力量', body: `按当前排盘规则，日主${dm}的力量${strength === '身强' ? '偏强' : strength === '身弱' ? '偏弱' : '较平衡'}。除五行分布外，出生季节、日主是否有根和整体结构也会影响判断，因此此处仅作初步参考。` },
      { heading: '整体状态', body: `出生季节力量：${result.advancedAnalysis.monthCommand.reason}${result.advancedAnalysis.monthCommand.obtainsCommand ? '与日主较相合。' : '对日主支持相对较少。'} 当前判断为${strength === '身强' ? '整体偏强' : strength === '身弱' ? '整体偏弱' : '整体较平衡'}。` },
      { heading: '平衡方向', body: `可优先参考${result.advancedAnalysis.fuyii.usefulElements.join('、')}，帮助五行力量趋于协调。${result.advancedAnalysis.seasonalAdjustment.reason.join('')}` },
      { heading: '进阶观察', body: `结构观察：${result.advancedAnalysis.pattern.name}${result.advancedAnalysis.pattern.status}，${result.advancedAnalysis.pattern.reason.join('')} 从格：${result.advancedAnalysis.followPattern.status === '成立' ? result.advancedAnalysis.followPattern.type : '暂不按从格看'}，${result.advancedAnalysis.followPattern.reason.join('')} 化气：${result.advancedAnalysis.transformation.status === '成立' ? `${result.advancedAnalysis.transformation.element}化成立` : '暂不按化气看'}，${result.advancedAnalysis.transformation.reason.join('')} 不同流派对这些进阶观察可能有不同取法，宜结合整体命盘参考。` },
      { heading: '大运', body: '以下列出传统命理中每十年左右的阶段划分；起运年龄会因计算方法与流派而有差异。' + result.luck.map((l) => `${l.ageStart}岁起 ${l.stem}${l.branch}（${l.stemWuxing}${l.startYear ? `，${l.startYear}-${l.endYear}` : ''}）`).join('；') + '。' },
      ...(transit ? [{
        heading: '动态层',
        body: transit.available
          ? `目标日期：${transit.targetDate}；虚岁${transit.nominalAge}；当前大运：${transit.decadal.current ? `${transit.decadal.current.stem}${transit.decadal.current.branch}` : '尚未起运'}；小运：${transit.minor.stem}${transit.minor.branch}（${transit.minor.source === 'lunar-exact' ? '精确历法' : '本地降级'}）；流年：${transit.yearly.stem}${transit.yearly.branch}；流月：${transit.monthly.stem}${transit.monthly.branch}；流日：${transit.daily.stem}${transit.daily.branch}。`
          : `目标日期：${transit.targetDate}；动态层不可用。${transit.limitations.join('')}`,
      }] : []),
      { heading: '神煞', body: '神煞是传统命理的辅助标记，不宜单独作为判断依据。' + (result.shenSha.length ? result.shenSha.map((s) => `${s.name}（${s.branch}·${s.pillar}柱）`).join('、') + '。' : '本命盘未检出常见神煞。') + `本页按${result.shenShaTrineSource === 'year' ? '出生年份' : '出生日'}的地支查取桃花、驿马、华盖与将星。` },
      { heading: '使用提醒', body: '本报告依传统命理规则整理，适合用于传统文化学习与自我观察，不作为现实决策依据。' },
    ],
    sourceNotes: '八字命盘依传统命理规则整理，仅作传统文化参考。',
  };

  return {
    ok: true,
    tool: result.engineName,
    version: result.mode,
    input_normalized: input as unknown as Record<string, unknown>,
    data: { ...result, ...(transit ? { transit } : {}), export_snapshot: snapshot },
    warnings: [result.confidenceNote, ...(result.mode === 'local-approx' ? ['月柱信息仅作辅助参考'] : [])],
    evidence: {
      steps: [
        { key: 'settle', stage: '定盘', status: result.mode === 'local-exact' ? 'ok' : 'approx', inputs: { year: input.birth.year, month: input.birth.month, day: input.birth.day, hour: input.birth.hour, minute: input.birth.minute ?? 0, gender: input.birth.gender ?? '男', config }, result: pillarsStr, promptText: `四柱 ${pillarsStr}` },
        { key: 'elements', stage: '五行统计', status: 'ok', inputs: pillarsStr, result: elSummary, dependsOnStepKeys: ['settle'], promptText: `五行分布 ${elSummary}` },
        { key: 'daymaster', stage: '日主判定', status: 'ok', inputs: { dm, dmWx, dmYy }, result: `${dm}${dmYy}${dmWx}`, dependsOnStepKeys: ['settle'], promptText: `日主为${dm}（${dmYy}${dmWx}）` },
        { key: 'advanced', stage: '命局要览', status: 'ok', inputs: pillarsStr, result: `月令${result.advancedAnalysis.monthCommand.dayMasterState}、${result.advancedAnalysis.support.strength}、${result.advancedAnalysis.fuyii.principle}、${result.advancedAnalysis.pattern.name}${result.advancedAnalysis.pattern.status}、从格${result.advancedAnalysis.followPattern.status}、化气${result.advancedAnalysis.transformation.status}`, dependsOnStepKeys: ['settle', 'elements', 'daymaster'], promptText: `月令、通根、得势显示${result.advancedAnalysis.support.strength}，${result.advancedAnalysis.pattern.name}${result.advancedAnalysis.pattern.status}。判断次序：${result.advancedAnalysis.priority.join('；')}`, limitation: result.advancedAnalysis.confidenceNote },
        { key: 'luck', stage: '大运', status: result.luck.some((l) => l.startYear !== undefined) ? 'ok' : 'approx', inputs: { gender: input.birth.gender }, result: result.luck.map((l) => `${l.ageStart}岁起 ${l.stem}${l.branch}`).join('；'), dependsOnStepKeys: ['settle'], promptText: '大运起始年龄与干支', limitation: result.luck.some((l) => l.startYear !== undefined) ? undefined : '起运年龄仅作参考' },
        ...dynamicSteps,
      ],
      facts: [
        { level: '主证', title: `日主${dm}${dmYy}${dmWx}`, detail: `综合判断为${strength}；五行偏旺${maxEl}、偏弱${minEl}`, source: '五行分布参考', tags: ['日主', '五行'] },
        { level: '主证', title: `四柱 ${pillarsStr}`, detail: `十神 ${['year', 'month', 'day', 'hour'].map((k) => `${PILLAR_CN[k]}${result.shishenList[k]}`).join(' ')}`, source: '出生资料排盘', tags: ['四柱'] },
        { level: '主证', title: `命局要览 ${strength} · ${result.advancedAnalysis.fuyii.principle}`, detail: `月令${result.advancedAnalysis.monthCommand.dayMasterState}，${result.advancedAnalysis.pattern.name}${result.advancedAnalysis.pattern.status}，调候取${result.advancedAnalysis.seasonalAdjustment.usefulElements.join('、')}`, source: '命理基础规则', tags: ['月令', '扶抑', '格局', '调候'] },
        { level: '辅证', title: `神煞 ${result.shenSha.map((s) => s.name).join('、') || '无'}`, detail: result.shenSha.length ? result.shenSha.map((s) => `${s.name}(${s.branch}·${s.pillar})`).join('、') : '未检出常见神煞', source: '神煞规则表', tags: ['神煞'] },
        ...(transit ? [{
          level: '应期' as const,
          title: `动态层 ${transit.targetDate}`,
          detail: transit.available
            ? `虚岁${transit.nominalAge}；小运${transit.minor.stem}${transit.minor.branch}；流年${transit.yearly.stem}${transit.yearly.branch}；流月${transit.monthly.stem}${transit.monthly.branch}；流日${transit.daily.stem}${transit.daily.branch}`
            : transit.limitations.join('；'),
          source: transit.minor.source === 'lunar-exact' ? 'lunar-typescript 历法与八字规则' : '本地动态层规则',
          tags: ['动态层', '小运', '流年', '流月', '流日'],
        }] : []),
        { level: '限制', title: '日主强弱提示', detail: '五行数量仅作辅助参考，宜结合月令、格局与调候综合观察', source: '命理解读提示', tags: ['边界'] },
        { level: '限制', title: '命理解读提示', detail: result.advancedAnalysis.confidenceNote, source: '命理基础规则', tags: ['边界', '命局要览'] },
      ],
      limitations: ['五行数量仅作辅助参考，宜结合月令、格局与调候综合观察', result.advancedAnalysis.confidenceNote, '大运起始年龄仅作参考', ...(transit ? transit.limitations : [])],
    },
    result_meta: {
      engineVersion: result.mode,
      evidenceSchemaVersion: '0.1.0',
      algorithm: '四柱排盘',
      calculationConfig: {
        ...config,
        ...(transit ? {
          dynamicLayer: {
            enabled: true,
            targetDate: transit.targetDate,
            minorFortuneAgeBasis: 'nominal-age',
            minorFortuneSource: transit.minor.source,
            monthlyPillarRule: 'solar-term-exact',
            dailyPillarRule: 'lunar-exact',
            relationRules: ['gan-he', 'gan-chong', 'liu-he', 'san-he', 'chong', 'hai', 'xing', 'tian-ke-di-chong', 'sui-yun-bing-lin', 'fu-yin', 'fan-yin'],
          },
        } : {}),
      },
    },
  };
}
