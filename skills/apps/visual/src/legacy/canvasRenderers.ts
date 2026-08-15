/**
 * canvasRenderers — 风水/体质等纯 TS 辅助（原 LegacyCORE / VizModules 桥已移除）
 *
 * 飞星九宫、八宅命盘、体质主导判定均本地计算，无 window / visual/ 依赖。
 * 类型仍从此文件 re-export，供 SVG 组件与工作区使用。
 */

import type {
  BaziPillars,
  ConstitutionData,
  ConstitutionScores,
  ConstitutionType,
  EightMansionSector,
  EightMansionsData,
  EightMansionsGrid,
  EightMansionsSummary,
  FlyingStarCell,
  FlyingStarGrid,
  FlyingStarsData,
  FlyingStarsSummary,
  WuxingStats,
  YunqiData,
} from './baseTypes';
import { CONSTITUTION_TYPES } from './baseTypes';
import { calcMingGua, EIGHT_MANSIONS_DATA_EXPORTED_FOR_TEST } from './bazhaiHouse';
import type { LiuyaoData, MeihuaData } from './divinationTypes';

export type {
  BaziPillars,
  ConstitutionData,
  ConstitutionScores,
  ConstitutionType,
  EightMansionSector,
  EightMansionsData,
  EightMansionsGrid,
  EightMansionsSummary,
  FlyingStarCell,
  FlyingStarGrid,
  FlyingStarsData,
  FlyingStarsSummary,
  WuxingStats,
  YunqiData,
  LiuyaoData,
  MeihuaData,
};
export { MEIHUA_TRIGRAMS } from './divinationTypes';
export { CONSTITUTION_TYPES };

/** 九星名/五行/吉凶（与旧 CORE.nineStars 对齐） */
const NINE_STARS: Array<{ name: string; wuxing: string; luck: string }> = [
  { name: '一白', wuxing: '水', luck: '吉' },
  { name: '二黑', wuxing: '土', luck: '凶' },
  { name: '三碧', wuxing: '木', luck: '凶' },
  { name: '四绿', wuxing: '木', luck: '吉' },
  { name: '五黄', wuxing: '土', luck: '大凶' },
  { name: '六白', wuxing: '金', luck: '吉' },
  { name: '七赤', wuxing: '金', luck: '凶' },
  { name: '八白', wuxing: '土', luck: '吉' },
  { name: '九紫', wuxing: '火', luck: '吉' },
];

/** 游年星含义（与旧 CORE.eightMansionStars 对齐） */
const EIGHT_MANSION_STARS: Record<string, { luck: string; meaning: string }> = {
  生气: { luck: '大吉', meaning: '旺丁发财，百事吉昌' },
  天医: { luck: '吉', meaning: '健康长寿，逢凶化吉' },
  延年: { luck: '吉', meaning: '夫妻和睦，福寿绵长' },
  伏位: { luck: '中性', meaning: '安稳平淡，宜守不宜攻' },
  绝命: { luck: '大凶', meaning: '伤病灾祸，家业破败' },
  五鬼: { luck: '凶', meaning: '火灾官非，意外不断' },
  六煞: { luck: '次凶', meaning: '口舌是非，婚姻不顺' },
  祸害: { luck: '凶', meaning: '官非争斗，小人是非' },
};

/** 八卦符号 */
const TRIGRAM_SYMBOLS: Record<string, string> = {
  坎: '☵', 坤: '☷', 震: '☳', 巽: '☴', 乾: '☰', 兑: '☱', 艮: '☶', 离: '☲',
};

/** 方位 → 中心角（与旧 CORE.trigramDirection 对齐） */
const DIR_DEG: Record<string, number> = {
  北: 0, 东北: 45, 东: 90, 东南: 135, 南: 180, 西南: 225, 西: 270, 西北: 315,
};

/** 洛书方位 → 3×3 网格 */
const FLYING_STAR_GRID: string[][] = [
  ['巽', '离', '坤'],
  ['震', '中', '兑'],
  ['艮', '坎', '乾'],
];

/** 八方向顺序（从北起顺时针） */
const EIGHT_DIRECTIONS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'] as const;

/** 流年中宫飞星（以 1984 为七赤入中锚点，与旧 CORE.getYearCenterStar 一致） */
export function getYearCenterStar(year: number): number {
  let n = 7 - ((year - 1984) % 9);
  while (n <= 0) n += 9;
  while (n > 9) n -= 9;
  return n;
}

/** 九宫顺飞：中→乾→兑→艮→离→坎→坤→震→巽 */
export function getFlyingStars(year: number): Record<string, number> {
  const center = getYearCenterStar(year);
  const palaces = ['中', '乾', '兑', '艮', '离', '坎', '坤', '震', '巽'];
  const result: Record<string, number> = {};
  palaces.forEach((p, i) => {
    let n = center + i;
    while (n > 9) n -= 9;
    result[p] = n;
  });
  return result;
}

export function deriveDominantConstitution(scores: ConstitutionScores): ConstitutionType | '' {
  let maxScore = -1;
  let dominant: ConstitutionType | '' = '';
  for (const type of CONSTITUTION_TYPES) {
    const score = scores[type] ?? 0;
    if (score > maxScore) {
      maxScore = score;
      dominant = type;
    }
  }
  return maxScore <= 0 ? '' : dominant;
}

export function getFeixingSummary(year: number): FlyingStarsSummary | null {
  const stars = getFlyingStars(year);
  const centerStar = stars['中'] ?? 0;
  if (centerStar < 1 || centerStar > 9) return null;
  const info = NINE_STARS[centerStar - 1];
  if (!info) return null;
  return { centerStar, starName: info.name, wuxing: info.wuxing, luck: info.luck };
}

export function getFeixingGrid(year: number): FlyingStarGrid | null {
  const stars = getFlyingStars(year);
  return FLYING_STAR_GRID.map((row) =>
    row.map((palace): FlyingStarCell => {
      const starNum = stars[palace] ?? 0;
      const info = NINE_STARS[starNum - 1] ?? { name: '', wuxing: '', luck: '' };
      return { palace, starNum, starName: info.name, wuxing: info.wuxing, luck: info.luck };
    }),
  );
}

export function getBazhaiSummary(year: number, gender: '男' | '女'): EightMansionsSummary | null {
  const gua = calcMingGua(year, gender);
  if (!gua?.trigram || gua.trigram === '?') return null;
  return { trigram: gua.trigram, group: gua.group };
}

export function getBazhaiGrid(year: number, gender: '男' | '女'): EightMansionsGrid | null {
  const gua = calcMingGua(year, gender);
  if (!gua?.trigram || gua.trigram === '?') return null;
  const masterTri = gua.trigram;
  const mansionMap = EIGHT_MANSIONS_DATA_EXPORTED_FOR_TEST[masterTri];
  if (!mansionMap) return null;
  const sectors: EightMansionSector[] = EIGHT_DIRECTIONS.map((dir) => {
    const star = mansionMap[dir] ?? '';
    const info = EIGHT_MANSION_STARS[star] ?? { luck: '', meaning: '' };
    return { direction: dir, deg: DIR_DEG[dir] ?? 0, star, luck: info.luck, meaning: info.meaning };
  });
  return {
    trigram: masterTri,
    trigramSymbol: TRIGRAM_SYMBOLS[masterTri] ?? '',
    group: gua.group,
    sectors,
  };
}
