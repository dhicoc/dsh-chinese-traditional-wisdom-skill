/**
 * taisuiEngine — 太岁/流年神煞化解引擎
 *
 * 按年支推算：
 * - 太岁方位（本年值守方位，不可动土）
 * - 岁破方位（与太岁对冲，同样不宜动土）
 * - 三煞方位（劫煞/灾煞/岁煞，三者同方，最凶）
 * - 五黄方位（流年五黄大煞，飞星推算）
 * - 化解建议（颜色/物品/方位禁忌）
 *
 * 纯 TS 规则实现，无外部依赖。
 */

import type { ExportSnapshot, Tone } from './baseTypes';

// ─── 常量 ───

const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 地支→方位（24山简化为12方位） */
const ZHI_DIRECTION: Record<string, string> = {
  '子': '北方', '丑': '东北方', '寅': '东北方',
  '卯': '东方', '辰': '东南方', '巳': '东南方',
  '午': '南方', '未': '西南方', '申': '西南方',
  '酉': '西方', '戌': '西北方', '亥': '西北方',
};

/** 地支→八卦方位 */
const ZHI_BAGUA: Record<string, string> = {
  '子': '坎', '丑': '艮', '寅': '艮',
  '卯': '震', '辰': '巽', '巳': '巽',
  '午': '离', '未': '坤', '申': '坤',
  '酉': '兑', '戌': '乾', '亥': '乾',
};

/** 对冲地支 */
const CHONG: Record<string, string> = {
  '子': '午', '丑': '未', '寅': '申', '卯': '酉',
  '辰': '戌', '巳': '亥', '午': '子', '未': '丑',
  '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳',
};

/** 三煞方位（年支→三煞所在方位地支） */
const SANSHA: Record<string, string[]> = {
  '申子辰': ['巳', '午', '未'],   // 水局→南方三煞
  '寅午戌': ['亥', '子', '丑'],   // 火局→北方三煞
  '亥卯未': ['申', '酉', '戌'],   // 木局→西方三煞
  '巳酉丑': ['寅', '卯', '辰'],   // 金局→东方三煞
};

/** 五黄推算（上元甲子起一白，流年飞星顺飞，五黄所在宫位）
 * 简化：用年数推算五黄入中宫的飞星
 */
function getFiveYellowDirection(year: number): string {
  // 2000年五黄在坎（北方），每减一年五黄逆飞一位
  // 2000→坎, 2001→坤, 2002→震... 顺飞
  // 公式：(year - 2000) % 9 飞星序：1坎2坤3震4巽5中6乾7兑8艮9离
  const offset = ((year - 2000) % 9 + 9) % 9;
  const flyingOrder = ['坎', '坤', '震', '巽', '中', '乾', '兑', '艮', '离'];
  return flyingOrder[offset];
}

/** 五黄方位→方位名 */
const BAGUA_DIRECTION: Record<string, string> = {
  '坎': '北方', '坤': '西南方', '震': '东方', '巽': '东南方',
  '中': '中宫', '乾': '西北方', '兑': '西方', '艮': '东北方', '离': '南方',
};

/** 五行→颜色 */
const WUXING_COLOR: Record<string, string> = {
  '金': '白色、金色、银色',
  '木': '绿色、青色',
  '水': '黑色、蓝色',
  '火': '红色、紫色',
  '土': '黄色、棕色',
};

/** 方位→五行 */
const DIRECTION_WUXING: Record<string, string> = {
  '坎': '水', '坤': '土', '震': '木', '巽': '木',
  '中': '土', '乾': '金', '兑': '金', '艮': '土', '离': '火',
};

/** 太岁化解建议 */
const TAISUI_REMEDY: Record<string, string> = {
  '子': '太岁在北方坎水位。此方不宜动土、装修、钉钉。可摆放六帝铜钱或铜葫芦化泄水气。色宜白色、金色（金生水，泄太岁之力）。',
  '丑': '太岁在东北方艮土位。不宜动土。可摆放铜麒麟或陶瓷葫芦。色宜白色、金色（金泄土）。',
  '寅': '太岁在东北方艮土位。不宜动土。可摆放水晶或铜器。色宜白色、金色。',
  '卯': '太岁在东方震木位。不宜动土。可摆放红色饰品或九紫灯（火泄木）。色宜红色、紫色。',
  '辰': '太岁在东南方巽木位。不宜动土。可摆放红色饰品或陶瓷器。色宜红色。',
  '巳': '太岁在东南方巽木位。不宜动土。可摆放九紫灯或红色中国结。色宜红色。',
  '午': '太岁在南方离火位。不宜动土。可摆放黄色陶瓷或水晶（土泄火）。色宜黄色、棕色。',
  '未': '太岁在西南方坤土位。不宜动土。可摆放铜葫芦或六帝钱。色宜白色、金色。',
  '申': '太岁在西南方坤土位。不宜动土。可摆放铜麒麟或金属饰品。色宜白色、金色。',
  '酉': '太岁在西方兑金位。不宜动土。可摆放黑色饰品或水景（水泄金）。色宜黑色、蓝色。',
  '戌': '太岁在西北方乾金位。不宜动土。可摆放蓝色饰品或水族箱。色宜黑色、蓝色。',
  '亥': '太岁在西北方乾金位。不宜动土。可摆放黑色饰品或铜葫芦。色宜黑色、蓝色。',
};

// ─── 类型 ───

export interface TaisuiData {
  year: number;
  yearZhi: string;
  taisui: {
    zhi: string;
    direction: string;
    bagua: string;
    remedy: string;
  };
  suiPo: {
    zhi: string;
    direction: string;
    bagua: string;
    note: string;
  };
  sanSha: {
    zhiList: string[];
    direction: string;
    note: string;
  };
  fiveYellow: {
    bagua: string;
    direction: string;
    note: string;
  };
  recommendations: Array<{ label: string; value: string; tone: Tone }>;
  export_snapshot: ExportSnapshot;
}

// ─── 计算 ───

/** 取年支 */
function getYearZhi(year: number): string {
  // 以立春为界，简化用公历年份
  return DI_ZHI[((year - 4) % 12 + 12) % 12];
}

/** 取三煞方位 */
function getSanSha(yearZhi: string): string[] {
  // 三合局判断
  const shenZiChen = ['申', '子', '辰'];
  const yinWuXu = ['寅', '午', '戌'];
  const haiMaoWei = ['亥', '卯', '未'];
  const siYouChou = ['巳', '酉', '丑'];
  if (shenZiChen.includes(yearZhi)) return SANSHA['申子辰'];
  if (yinWuXu.includes(yearZhi)) return SANSHA['寅午戌'];
  if (haiMaoWei.includes(yearZhi)) return SANSHA['亥卯未'];
  if (siYouChou.includes(yearZhi)) return SANSHA['巳酉丑'];
  return [];
}

export function calcTaisui(year: number): TaisuiData {
  const yearZhi = getYearZhi(year);
  const chongZhi = CHONG[yearZhi];
  const sanShaList = getSanSha(yearZhi);
  const fiveYellowBagua = getFiveYellowDirection(year);

  // 太岁
  const taisuiDirection = ZHI_DIRECTION[yearZhi];
  const taisuiBagua = ZHI_BAGUA[yearZhi];
  const taisuiRemedy = TAISUI_REMEDY[yearZhi] || `太岁在${taisuiDirection}，此方不宜动土。`;

  // 岁破
  const suiPoDirection = ZHI_DIRECTION[chongZhi];
  const suiPoBagua = ZHI_BAGUA[chongZhi];

  // 三煞
  const sanShaDirection = sanShaList.length > 0
    ? `${ZHI_DIRECTION[sanShaList[0]]}（${sanShaList.map(z => z).join('、')}）`
    : '未知';

  // 五黄
  const fiveYellowDirection = BAGUA_DIRECTION[fiveYellowBagua];
  const fiveYellowWuxing = DIRECTION_WUXING[fiveYellowBagua];
  const fiveYellowNote = `五黄大煞在${fiveYellowDirection}（${fiveYellowBagua}宫）。此方不宜动土、安门、安床。宜用${WUXING_COLOR[fiveYellowWuxing === '土' ? '金' : '土']}物品化泄。`;

  // 综合建议
  const recommendations: Array<{ label: string; value: string; tone: Tone }> = [
    { label: '太岁方', value: taisuiRemedy, tone: '凶' },
    { label: '岁破方', value: `岁破在${suiPoDirection}（${suiPoBagua}宫），与太岁对冲，同样不宜动土、装修。`, tone: '凶' },
    { label: '三煞方', value: `三煞在${sanShaDirection}方。此方最凶，忌动土、修造、安葬。宜静不宜动。`, tone: '凶' },
    { label: '五黄方', value: fiveYellowNote, tone: '凶' },
    { label: '年度总则', value: `${year}年（${yearZhi}年）太岁在${taisuiDirection}、岁破在${suiPoDirection}、三煞在${sanShaDirection}、五黄在${fiveYellowDirection}。此四方本年均不宜大兴土木。其余方位可正常使用。`, tone: '中' },
  ];

  const snapshot: ExportSnapshot = {
    summary: `${year}年${yearZhi}年：太岁${taisuiDirection}、岁破${suiPoDirection}、三煞${sanShaList.join('')}方、五黄${fiveYellowDirection}。四方不宜动土。`,
    tags: ['太岁流年', `${year}年`, `太岁${taisuiDirection}`, `岁破${suiPoDirection}`, `五黄${fiveYellowDirection}`],
    sections: [
      { heading: '太岁方位', body: taisuiRemedy },
      { heading: '岁破方位', body: `岁破在${suiPoDirection}（${suiPoBagua}宫），与太岁对冲。不宜动土、装修、搬迁。` },
      { heading: '三煞方位', body: `三煞在${sanShaDirection}方（${sanShaList.join('、')}）。三煞为劫煞、灾煞、岁煞，最凶之神。此方忌动土、修造、安葬。` },
      { heading: '五黄大煞', body: fiveYellowNote },
      { heading: '年度化解总则', body: recommendations[4].value },
    ],
    sourceNotes: '太岁/三煞/五黄方位为传统风水规则推算，仅供参考。实际布局请结合专业风水师意见。',
  };

  return {
    year,
    yearZhi,
    taisui: { zhi: yearZhi, direction: taisuiDirection, bagua: taisuiBagua, remedy: taisuiRemedy },
    suiPo: { zhi: chongZhi, direction: suiPoDirection, bagua: suiPoBagua, note: `岁破在${suiPoDirection}，不宜动土` },
    sanSha: { zhiList: sanShaList, direction: sanShaDirection, note: `三煞在${sanShaDirection}方，最凶` },
    fiveYellow: { bagua: fiveYellowBagua, direction: fiveYellowDirection, note: fiveYellowNote },
    recommendations,
    export_snapshot: snapshot,
  };
}
