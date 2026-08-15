/**
 * ganZhiChongHe — 干支冲合关系表（合婚/配对分析用）
 *
 * 传统命理固定规则，纯数据 + 纯函数。零 DOM 依赖，可被 combo/marriage 及其他
 * 需要干支关系判断的模块复用。
 *
 * 地支关系：六冲 / 六合 / 三合局 / 相害 / 相刑
 * 天干关系：五合 / 相冲
 */

// ─── 地支索引（0=子 … 11=亥）──
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

// ─── 六冲（相隔 6 位，对宫）── 子午 丑未 寅申 卯酉 辰戌 巳亥
export const SIX_CHONG: ReadonlyArray<[string, string]> = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
];

// ─── 六合（暗中合，化气）── 子丑 寅亥 卯戌 辰酉 巳申 午未
export const SIX_HE: ReadonlyArray<[string, string]> = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未'],
];

// ─── 三合局（生旺墓三方合）── 申子辰合水局 / 亥卯未合木局 / 寅午戌合火局 / 巳酉丑合金局
export const THREE_HE: ReadonlyArray<[string, string, string]> = [
  ['申', '子', '辰'], ['亥', '卯', '未'], ['寅', '午', '戌'], ['巳', '酉', '丑'],
];

// ─── 相害（穿）── 子未 丑午 寅巳 卯辰 申亥 酉戌
export const SIX_HAI: ReadonlyArray<[string, string]> = [
  ['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌'],
];

// ─── 相刑 ──
// 寅巳申无恩之刑 / 丑戌未恃势之刑 / 子卯无礼之刑 / 辰午酉亥自刑
export const XING: ReadonlyArray<readonly string[]> = [
  ['寅', '巳', '申'], ['丑', '戌', '未'], ['子', '卯'], ['辰', '辰'], ['午', '午'], ['酉', '酉'], ['亥', '亥'],
];

// ─── 天干五合（化气）── 甲己合土 乙庚合金 丙辛合水 丁壬合木 戊癸合火
export const FIVE_HE: ReadonlyArray<[string, string]> = [
  ['甲', '己'], ['乙', '庚'], ['丙', '辛'], ['丁', '壬'], ['戊', '癸'],
];

// ─── 天干相冲（七杀关系）── 甲庚 乙辛 丙壬 丁癸（戊己居中不冲）
export const STEM_CHONG: ReadonlyArray<[string, string]> = [
  ['甲', '庚'], ['乙', '辛'], ['丙', '壬'], ['丁', '癸'],
];

// ─── 查询函数 ─────────────────────────────────────────

function pairMatch(table: ReadonlyArray<readonly string[]>, a: string, b: string): boolean {
  return table.some((row) => row.includes(a) && row.includes(b) && a !== b);
}

/** 两地支是否六冲 */
export function isChong(a: string, b: string): boolean {
  return pairMatch(SIX_CHONG, a, b);
}

/** 两地支是否六合 */
export function isLiuHe(a: string, b: string): boolean {
  return pairMatch(SIX_HE, a, b);
}

/** 两地支是否同属一个三合局 */
export function isSanHe(a: string, b: string): boolean {
  return THREE_HE.some((triple) => triple.includes(a) && triple.includes(b) && a !== b);
}

/** 两地支是否相害 */
export function isHai(a: string, b: string): boolean {
  return pairMatch(SIX_HAI, a, b);
}

/** 两地支是否相刑（含自刑：同支） */
export function isXing(a: string, b: string): boolean {
  if (a === b) return ['辰', '午', '酉', '亥'].includes(a); // 自刑
  return pairMatch(XING, a, b);
}

/** 两天干是否五合 */
export function isGanHe(a: string, b: string): boolean {
  return pairMatch(FIVE_HE, a, b);
}

/** 两天干是否相冲 */
export function isGanChong(a: string, b: string): boolean {
  return pairMatch(STEM_CHONG, a, b);
}

export interface ChongHeRelation {
  chong: boolean; // 六冲
  liuHe: boolean; // 六合
  sanHe: boolean; // 三合
  hai: boolean; // 相害
  xing: boolean; // 相刑
  ganHe: boolean; // 天干五合（若传入干）
  ganChong: boolean; // 天干相冲（若传入干）
}

/** 综合判断一对干支柱的关系（a/b 各为一柱，如"甲子"与"己未"） */
export function relationBetweenPillars(a: string, b: string): ChongHeRelation {
  const aStem = a[0] ?? '';
  const aBranch = a[1] ?? '';
  const bStem = b[0] ?? '';
  const bBranch = b[1] ?? '';
  return {
    chong: isChong(aBranch, bBranch),
    liuHe: isLiuHe(aBranch, bBranch),
    sanHe: isSanHe(aBranch, bBranch),
    hai: isHai(aBranch, bBranch),
    xing: isXing(aBranch, bBranch),
    ganHe: isGanHe(aStem, bStem),
    ganChong: isGanChong(aStem, bStem),
  };
}

/** 关系评分：合 +吉，冲/害/刑 +凶，用于量化双方四柱契合度 */
export function relationScore(rel: ChongHeRelation): number {
  let score = 0;
  if (rel.liuHe) score += 3;
  if (rel.sanHe) score += 3;
  if (rel.ganHe) score += 3;
  if (rel.chong) score -= 3;
  if (rel.hai) score -= 2;
  if (rel.xing) score -= 2;
  if (rel.ganChong) score -= 2;
  return score;
}
