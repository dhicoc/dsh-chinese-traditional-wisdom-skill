/**
 * daliurenEngine — 大六壬纯 TS 引擎
 *
 * 参考来源：Jam0731/MingPan (MIT License, Copyright 釀玄齋) 的算法逻辑，
 * kentang2017/kinliuren (MIT) 的算法参考，d1210182010/daliuren-web-engine (MIT) 的 JSON 结构。
 * 仅借鉴算法思想，按本项目模式重写为函数式纯 TS + ToolEnvelope。
 *
 * 大六壬核心：天地盘（月将加时辰起盘）→ 四课（日干支推演）→ 三传（九宗门推演）→ 神煞 + 格局。
 * 算法全部是干支推算 + 查表 + 规则匹配，无天文计算。节气由 lunar-javascript Solar 提供。
 *
 * 输入：birth（年月日时）+ Solar（可选，精确节气干支）
 * 输出：ToolEnvelope<DaliurenData>，含天地盘/四课/三传/神煞/格局 + export_snapshot
 */

import type { ToolEnvelope, ExportSnapshot } from './baseTypes';

// ─── 基础序列 ───

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
type DiZhi = (typeof DI_ZHI)[number];
type TianGan = (typeof TIAN_GAN)[number];

/** 十二天将（顺序） */
const TIAN_JIANG = ['贵', '蛇', '雀', '合', '勾', '龙', '空', '虎', '常', '玄', '阴', '后'] as const;
type TianJiangShort = (typeof TIAN_JIANG)[number];

/** 天将全称 */
const TIAN_JIANG_FULL: Record<string, string> = {
  '贵': '贵人', '蛇': '螣蛇', '雀': '朱雀', '合': '六合',
  '勾': '勾陈', '龙': '青龙', '空': '天空', '虎': '白虎',
  '常': '太常', '玄': '玄武', '阴': '太阴', '后': '天后',
};

/** 月将名 → 地支 */
const YUE_JIANG_NAME: Record<string, string> = {
  '亥': '登明', '戌': '河魁', '酉': '从魁', '申': '传送',
  '未': '小吉', '午': '胜光', '巳': '太乙', '辰': '天罡',
  '卯': '太冲', '寅': '功曹', '丑': '大吉', '子': '神后',
};

// ─── 五行 ───

const GAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
const ZHI_WUXING: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

/** 五行关系（上→下） */
function wuxingRelation(shang: string, xia: string): string {
  const sheng: Record<string, string> = { 金: '水', 水: '木', 木: '火', 火: '土', 土: '金' };
  const ke: Record<string, string> = { 金: '木', 木: '土', 土: '水', 水: '火', 火: '金' };
  if (shang === xia) return '比和';
  if (ke[shang] === xia) return '克'; // 上克下
  if (ke[xia] === shang) return '被克'; // 下贼上
  if (sheng[shang] === xia) return '生'; // 上生下
  if (sheng[xia] === shang) return '被生'; // 下生上
  return '比和';
}

/** 六亲 */
const LIUQIN_MAP: Record<string, string> = {
  '被生': '父母', '生': '子孙', '克': '妻财', '比和': '兄弟', '被克': '官鬼',
};

// ─── 日干寄宫 ───
const GAN_JI_GONG: Record<string, DiZhi> = {
  '甲': '寅', '乙': '辰', '丙': '巳', '丁': '未', '戊': '巳',
  '己': '未', '庚': '申', '辛': '戌', '壬': '亥', '癸': '丑',
};

// ─── 流派 ───
// 大六壬天将推算在历代文献中存在三处主要分歧：贵人顺逆的判定、四课天将所承之位、
// 以及日干寄宫表。本项目以 school 字段切换，默认 classic 与历史排盘完全一致。
export type DaliurenSchool = 'classic' | 'gufa' | 'daxquan';

export const DALIUREN_SCHOOLS: Record<DaliurenSchool, { name: string; note: string }> = {
  classic: {
    name: '通行（天盘临方定顺逆）',
    note: '贵人起例依日干昼夜；顺逆以贵人天盘落支临阳方（巳午未申酉戌）则逆、临阴方则顺；四课天将查下神所在宫，日干经寄宫转地支。',
  },
  gufa: {
    name: '古法（昼顺夜逆·上神承将）',
    note: '贵人起例依日干昼夜；顺逆径以昼顺夜逆，不依天盘临方；四课天将查上神所临之宫。',
  },
  daxquan: {
    name: '《大全》（地盘落宫定顺逆）',
    note: '贵人起例依日干昼夜；顺逆以贵人地盘落宫居阳方则逆、居阴方则顺；四课天将查下神所在宫，日干经寄宫转地支。',
  },
};

/** 阳方地支（用于顺逆判定） */
const YANG_POS = ['巳', '午', '未', '申', '酉', '戌'];

// ─── 节气 → 月将 ───
const JIEQI_YUE_JIANG: Record<string, DiZhi> = {
  '雨水': '亥', '惊蛰': '亥', '春分': '戌', '清明': '戌',
  '谷雨': '酉', '立夏': '酉', '小满': '申', '芒种': '申',
  '夏至': '未', '小暑': '未', '大暑': '午', '立秋': '午',
  '处暑': '巳', '白露': '巳', '秋分': '辰', '寒露': '辰',
  '霜降': '卯', '立冬': '卯', '小雪': '寅', '大雪': '寅',
  '冬至': '丑', '小寒': '丑', '大寒': '子', '立春': '子',
};

// ─── 贵人起点 ───
const GUIREN_START: Record<string, { day: DiZhi; night: DiZhi }> = {
  '甲': { day: '丑', night: '未' }, '戊': { day: '丑', night: '未' }, '庚': { day: '丑', night: '未' },
  '乙': { day: '子', night: '申' }, '己': { day: '子', night: '申' },
  '丙': { day: '亥', night: '酉' }, '丁': { day: '亥', night: '酉' },
  '壬': { day: '巳', night: '卯' }, '癸': { day: '巳', night: '卯' },
  '辛': { day: '午', night: '寅' },
};

/** 昼夜判断（时支） */
const DAY_NIGHT_MAP: Record<string, '昼' | '夜'> = {
  '卯': '昼', '辰': '昼', '巳': '昼', '午': '昼', '未': '昼', '申': '昼',
  '酉': '夜', '戌': '夜', '亥': '夜', '子': '夜', '丑': '夜', '寅': '夜',
};

// ─── 旬空 ───
const XUN_KONG: Record<string, [DiZhi, DiZhi]> = {
  '甲子': ['戌', '亥'], '甲戌': ['申', '酉'], '甲申': ['午', '未'],
  '甲午': ['辰', '巳'], '甲辰': ['寅', '卯'], '甲寅': ['子', '丑'],
};

/** 六十甲子 */
const JIA_ZI_60: string[] = (() => {
  const r: string[] = [];
  for (let i = 0; i < 60; i++) r.push(TIAN_GAN[i % 10] + DI_ZHI[i % 12]);
  return r;
})();

// ─── 地支关系 ───
const ZHI_CHONG: Record<string, string> = {
  '子': '午', '午': '子', '丑': '未', '未': '丑', '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯', '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
};

// ─── 驿马 ───
const YI_MA: Record<string, string> = {
  '寅': '申', '午': '申', '戌': '申', '申': '寅', '子': '寅', '辰': '寅',
  '巳': '亥', '酉': '亥', '丑': '亥', '亥': '巳', '卯': '巳', '未': '巳',
};

// ─── 八专日 ───
const BA_ZHUAN_DAYS = ['壬子', '甲寅', '乙卯', '丁巳', '己未', '庚申', '辛酉', '癸亥'];
const GAN_ZHI_SAME_POSITION = ['甲寅', '丁未', '己未', '庚申', '癸丑'];

// ─── lunar-javascript Solar 入口（参数化）───
interface LunarLike {
  getJieQiPre?: () => string;
  getJieQi?: () => string;
  getDayInGanZhiExact?: () => string;
  getDayInGanZhi?: () => string;
  getDayGanZhi?: () => string;
  getTimeInGanZhiExact?: () => string;
  getTimeInGanZhi?: () => string;
  getTimeGanZhi?: () => string;
  getMonthInGanZhiExact?: () => string;
  getMonthInGanZhi?: () => string;
  getJieQiTable?: () => Record<string, unknown>;
}
interface SolarLike {
  fromYmd?(y: number, mo: number, d: number): { getLunar(): LunarLike };
  fromYmdHms?(y: number, mo: number, d: number, h: number, mi: number, s: number): { getLunar(): LunarLike };
}

// ─── 结果类型 ───

export interface TianDiPanInfo {
  tianPan: string[]; // 天盘十二支（按地盘顺序）
  diPan: string[]; // 地盘固定
  tianJiang: string[]; // 十二天将（按地盘顺序）
  yueJiang: string; // 月将地支
  yueJiangName: string; // 月将名
  diToTian: Record<string, string>; // 地支→天盘地支
  diToJiang: Record<string, string>; // 地支→天将
}

export interface SiKeItem {
  position: 1 | 2 | 3 | 4;
  shangShen: string; // 上神（天盘地支）
  xiaShen: string; // 下神（地盘地支或日干）
  tianJiang: string; // 天将
  relation: string; // 上下关系
}

export interface SiKeInfo {
  list: [SiKeItem, SiKeItem, SiKeItem, SiKeItem];
  dayGan: string;
  dayZhi: string;
  dayGanJiGong: string;
}

export interface ChuanInfo {
  position: string; // 初传/中传/末传
  diZhi: string;
  tianJiang: string;
  liuQin: string;
  xunKong: string | null;
}

export interface SanChuanInfo {
  chuChuan: ChuanInfo;
  zhongChuan: ChuanInfo;
  moChuan: ChuanInfo;
  geJu: string;
  geJuDetail: string;
}

export interface ShenShaInfo {
  riMa: string;
  yueMa: string;
  dingMa: string;
  huaGai: string;
  shanDian: string;
}

export interface DaliurenResult {
  basicInfo: {
    jieqi: string;
    dayGanZhi: string;
    hourGanZhi: string;
    dayNight: string;
    yueJiang: string;
    yueJiangName: string;
  };
  tianDiPan: TianDiPanInfo;
  siKe: SiKeInfo;
  sanChuan: SanChuanInfo;
  shenSha: ShenShaInfo;
  engineName: string;
  mode: string;
  school: DaliurenSchool;
  confidenceNote: string;
}

// ─── 天地盘 ───

function calcTianDiPan(jieqi: string, hourZhi: string, dayGan: string, school: DaliurenSchool = 'classic'): TianDiPanInfo {
  const yueJiang = JIEQI_YUE_JIANG[jieqi] ?? '子';
  const yueJiangName = YUE_JIANG_NAME[yueJiang] ?? '神后';
  const hourIndex = DI_ZHI.indexOf(hourZhi as DiZhi);
  const yueJiangIndex = DI_ZHI.indexOf(yueJiang as DiZhi);

  // 天盘：月将加临时辰，顺布十二支（按地盘顺序排列）
  const tianPan: string[] = [];
  for (let i = 0; i < 12; i++) {
    const diPanIndex = (hourIndex + i) % 12;
    tianPan[diPanIndex] = DI_ZHI[(yueJiangIndex + i) % 12];
  }

  const diPan = [...DI_ZHI];
  const dayNight = DAY_NIGHT_MAP[hourZhi] ?? '昼';

  // 天将：贵人起点 + 顺逆（流派分歧在此）
  const guirenCfg = GUIREN_START[dayGan];
  const guirenStart = dayNight === '昼' ? guirenCfg.day : guirenCfg.night;
  const guirenIndex = DI_ZHI.indexOf(guirenStart);
  // 贵人在天盘的落支
  const guirenTianZhi = tianPan[guirenIndex];
  // 贵人在地盘的落支（即 guirenStart 本身）
  const guirenDiZhi = guirenStart;

  // 顺逆判定随流派：
  // classic —— 贵人天盘落支临阳方则逆、阴方则顺
  // daxquan —— 贵人地盘落宫居阳方则逆、阴方则顺
  // gufa    —— 径以昼顺夜逆，不依临方
  let isReverse: boolean;
  if (school === 'gufa') {
    isReverse = dayNight === '夜';
  } else if (school === 'daxquan') {
    isReverse = YANG_POS.includes(guirenDiZhi);
  } else {
    isReverse = YANG_POS.includes(guirenTianZhi);
  }

  const tianJiang: string[] = new Array(12);
  if (isReverse) {
    const rev = ['贵', '后', '阴', '玄', '常', '虎', '空', '龙', '勾', '合', '雀', '蛇'];
    for (let i = 0; i < 12; i++) tianJiang[(guirenIndex + i) % 12] = rev[i];
  } else {
    for (let i = 0; i < 12; i++) tianJiang[(guirenIndex + i) % 12] = TIAN_JIANG[i];
  }

  const diToTian: Record<string, string> = {};
  const diToJiang: Record<string, string> = {};
  for (let i = 0; i < 12; i++) {
    diToTian[diPan[i]] = tianPan[i];
    diToJiang[diPan[i]] = tianJiang[i];
  }

  return { tianPan, diPan, tianJiang, yueJiang, yueJiangName, diToTian, diToJiang };
}

// ─── 四课 ───

function calcSiKe(dayGan: string, dayZhi: string, tdp: TianDiPanInfo, school: DaliurenSchool = 'classic'): SiKeInfo {
  const { diToTian, diToJiang } = tdp;
  const dayGanJiGong = GAN_JI_GONG[dayGan];

  const yiShang = diToTian[dayGanJiGong];
  const erShang = diToTian[yiShang];
  const sanShang = diToTian[dayZhi];
  const siShang = diToTian[sanShang];

  // 承将之位随流派：
  // classic / daxquan —— 查下神所在宫（日干须经寄宫转地支，"干寄宫以知将"）
  // gufa              —— 查上神所临之宫
  const buildKe = (pos: 1 | 2 | 3 | 4, shang: string, xia: string): SiKeItem => {
    const lookupZhi = school === 'gufa'
      ? (shang)                                       // 上神所临之宫
      : (GAN_JI_GONG[xia] ?? xia);                    // 下神所在宫（天干转寄宫）
    return {
      position: pos,
      shangShen: shang,
      xiaShen: xia,
      tianJiang: diToJiang[lookupZhi] ?? '',
      relation: keRelation(shang, xia),
    };
  };

  return {
    list: [
      buildKe(1, yiShang, dayGan),
      buildKe(2, erShang, yiShang),
      buildKe(3, sanShang, dayZhi),
      buildKe(4, siShang, sanShang),
    ],
    dayGan,
    dayZhi,
    dayGanJiGong,
  };
}

function keRelation(shang: string, xia: string): string {
  const shangWx = ZHI_WUXING[shang] ?? GAN_WUXING[shang] ?? '土';
  const xiaWx = ZHI_WUXING[xia] ?? GAN_WUXING[xia] ?? '土';
  const rel = wuxingRelation(shangWx, xiaWx);
  switch (rel) {
    case '克': return '上克下';
    case '被克': return '下贼上';
    case '生': return '上生下';
    case '被生': return '下生上';
    default: return '比和';
  }
}

function analyzeSiKe(siKe: SiKeInfo) {
  const s = { shangKeXia: 0, xiaZeiShang: 0, biHe: 0, shangShengXia: 0, xiaShengShang: 0 };
  for (const k of siKe.list) {
    if (k.relation === '上克下') s.shangKeXia++;
    else if (k.relation === '下贼上') s.xiaZeiShang++;
    else if (k.relation === '比和') s.biHe++;
    else if (k.relation === '上生下') s.shangShengXia++;
    else if (k.relation === '下生上') s.xiaShengShang++;
  }
  return s;
}

// ─── 阴阳 ───
function yinYang(s: string): '阳' | '阴' {
  if (['甲', '丙', '戊', '庚', '壬'].includes(s)) return '阳';
  if (['子', '寅', '辰', '午', '申', '戌'].includes(s)) return '阳';
  return '阴';
}

// ─── 三传（九宗门）───

function calcSanChuan(siKe: SiKeInfo, tdp: TianDiPanInfo, dayGanZhi: string, hourZhi: string, _school: DaliurenSchool = 'classic'): SanChuanInfo {
  const { diToTian, diToJiang, yueJiang } = tdp;
  const dayGan = dayGanZhi[0];
  const dayZhi = dayGanZhi[1];
  const stats = analyzeSiKe(siKe);

  const isFuYin = yueJiang === hourZhi;
  const isFanYin = checkFanYin(tdp);
  const isBaZhuan = BA_ZHUAN_DAYS.includes(dayGanZhi);
  const isGanZhiSamePos = GAN_ZHI_SAME_POSITION.includes(dayGanZhi);
  const isFanYinBaZhuan = isGanZhiSamePos && stats.xiaZeiShang === 4;

  let chuChuanZhi: string;
  let geJu: string;
  let geJuDetail: string;

  if (isFanYin || isFanYinBaZhuan) {
    const r = handleFanYin(siKe, dayGan, dayZhi, stats, isFanYinBaZhuan);
    chuChuanZhi = r.chuChuan; geJu = '返吟'; geJuDetail = r.detail;
  } else if (isFuYin) {
    const r = handleFuYin(dayGan, dayZhi);
    chuChuanZhi = r.chuChuan; geJu = '伏吟'; geJuDetail = r.detail;
  } else if (isBaZhuan && stats.shangKeXia === 0 && stats.xiaZeiShang === 0) {
    const r = handleBaZhuan(dayGan, dayZhi);
    chuChuanZhi = r.chuChuan; geJu = '八专'; geJuDetail = r.detail;
  } else if (stats.xiaZeiShang === 1 && stats.shangKeXia === 0) {
    chuChuanZhi = siKe.list.find((k) => k.relation === '下贼上')!.shangShen;
    geJu = '贼克'; geJuDetail = '重审';
  } else if (stats.shangKeXia === 1 && stats.xiaZeiShang === 0) {
    chuChuanZhi = siKe.list.find((k) => k.relation === '上克下')!.shangShen;
    geJu = '贼克'; geJuDetail = '元首';
  } else if (stats.xiaZeiShang >= 1) {
    const r = handleMultipleZeiKe(siKe, tdp, dayGan, '下贼上');
    chuChuanZhi = r.chuChuan; geJu = r.geJu; geJuDetail = r.detail;
  } else if (stats.shangKeXia >= 2) {
    const r = handleMultipleZeiKe(siKe, tdp, dayGan, '上克下');
    chuChuanZhi = r.chuChuan; geJu = r.geJu; geJuDetail = r.detail;
  } else if (stats.shangKeXia === 0 && stats.xiaZeiShang === 0) {
    const r = handleNoZeiKe(siKe, tdp, dayGan);
    chuChuanZhi = r.chuChuan; geJu = r.geJu; geJuDetail = r.detail;
  } else {
    chuChuanZhi = siKe.list[0].shangShen; geJu = '贼克'; geJuDetail = '元首';
  }

  // 中传末传
  let zhongZhi: string, moZhi: string;
  if (isFanYin) {
    zhongZhi = ZHI_CHONG[chuChuanZhi];
    moZhi = ZHI_CHONG[zhongZhi];
  } else {
    zhongZhi = diToTian[chuChuanZhi];
    moZhi = diToTian[zhongZhi];
  }

  const chu = buildChuan('初传', chuChuanZhi, diToJiang, dayGan, dayGanZhi);
  const zhong = buildChuan('中传', zhongZhi, diToJiang, dayGan, dayGanZhi);
  const mo = buildChuan('末传', moZhi, diToJiang, dayGan, dayGanZhi);

  return { chuChuan: chu, zhongChuan: zhong, moChuan: mo, geJu, geJuDetail };
}

function buildChuan(pos: string, zhi: string, diToJiang: Record<string, string>, dayGan: string, dayGanZhi: string): ChuanInfo {
  const dayWx = GAN_WUXING[dayGan] ?? '土';
  const chuanWx = ZHI_WUXING[zhi] ?? '土';
  const rel = wuxingRelation(dayWx, chuanWx);
  const liuQin = LIUQIN_MAP[rel] ?? '兄弟';
  const xk = getXunKong(dayGanZhi, zhi);
  return { position: pos, diZhi: zhi, tianJiang: diToJiang[zhi] ?? '', liuQin, xunKong: xk };
}

function getXunKong(dayGanZhi: string, zhi: string): string | null {
  const idx = JIA_ZI_60.indexOf(dayGanZhi);
  if (idx < 0) return null;
  const xunStart = Math.floor(idx / 10) * 10;
  const xunHead = JIA_ZI_60[xunStart];
  const kong = XUN_KONG[xunHead];
  if (kong && kong.includes(zhi as DiZhi)) return zhi;
  return null;
}

function checkFanYin(tdp: TianDiPanInfo): boolean {
  let cnt = 0;
  for (let i = 0; i < 12; i++) {
    if (ZHI_CHONG[DI_ZHI[i]] === tdp.diToTian[DI_ZHI[i]]) cnt++;
  }
  return cnt >= 6;
}

function handleMultipleZeiKe(siKe: SiKeInfo, tdp: TianDiPanInfo, dayGan: string, target: string) {
  const matching = siKe.list.filter((k) => k.relation === target);
  if (matching.length === 1) return { chuChuan: matching[0].shangShen, geJu: '贼克', detail: target === '下贼上' ? '重审' : '元首' };

  const dayYy = yinYang(dayGan);
  const sameYy = matching.filter((k) => yinYang(k.shangShen) === dayYy);
  if (sameYy.length === 1) return { chuChuan: sameYy[0].shangShen, geJu: '比用', detail: '知一' };

  const candidates = sameYy.length > 0 ? sameYy : matching;
  const sheHai = candidates.map((k) => ({ ke: k, depth: sheHaiDepth(k.shangShen, k.xiaShen) }));
  sheHai.sort((a, b) => b.depth - a.depth);
  const detail = sheHai.length >= 2 && sheHai[0].depth === sheHai[1].depth ? '察微' : '见机';
  return { chuChuan: sheHai[0].ke.shangShen, geJu: '涉害', detail };
}

function sheHaiDepth(shang: string, xia: string): number {
  const shangWx = ZHI_WUXING[shang] ?? '土';
  const startIdx = DI_ZHI.indexOf(xia as DiZhi);
  const endIdx = DI_ZHI.indexOf(shang as DiZhi);
  let cnt = 0, cur = startIdx;
  while (cur !== endIdx) {
    const curWx = ZHI_WUXING[DI_ZHI[cur]];
    if (wuxingRelation(shangWx, curWx) === '克') cnt++;
    cur = (cur - 1 + 12) % 12;
  }
  return cnt;
}

function handleNoZeiKe(siKe: SiKeInfo, tdp: TianDiPanInfo, dayGan: string) {
  const dayWx = GAN_WUXING[dayGan] ?? '土';
  for (const k of siKe.list) {
    const kWx = ZHI_WUXING[k.shangShen] ?? '土';
    const rel = wuxingRelation(kWx, dayWx);
    if (rel === '克') return { chuChuan: k.shangShen, geJu: '遥克', detail: '蒿矢' };
    if (rel === '被克') return { chuChuan: k.shangShen, geJu: '遥克', detail: '弹射' };
  }
  const yy = yinYang(dayGan);
  return { chuChuan: tdp.diToTian['酉'], geJu: '昴星', detail: yy === '阳' ? '虎视' : '冬蛇掩目' };
}

function handleFanYin(siKe: SiKeInfo, dayGan: string, dayZhi: string, stats: ReturnType<typeof analyzeSiKe>, isFB: boolean) {
  if (isFB) return { chuChuan: YI_MA[dayZhi] ?? '寅', detail: '绝嗣' };
  if (stats.xiaZeiShang > 0) {
    const m = siKe.list.filter((k) => k.relation === '下贼上');
    if (m.length === 1) return { chuChuan: m[0].shangShen, detail: '无依' };
    const yy = yinYang(dayGan);
    const same = m.filter((k) => yinYang(k.shangShen) === yy);
    return { chuChuan: (same[0] ?? m[0]).shangShen, detail: '无依' };
  }
  if (stats.shangKeXia > 0) {
    const m = siKe.list.filter((k) => k.relation === '上克下');
    if (m.length === 1) return { chuChuan: m[0].shangShen, detail: '无依' };
    const yy = yinYang(dayGan);
    const same = m.filter((k) => yinYang(k.shangShen) === yy);
    return { chuChuan: (same[0] ?? m[0]).shangShen, detail: '无依' };
  }
  return { chuChuan: YI_MA[dayZhi] ?? '寅', detail: '无亲' };
}

function handleFuYin(dayGan: string, dayZhi: string) {
  if (yinYang(dayGan) === '阳') return { chuChuan: GAN_JI_GONG[dayGan], detail: '自任' };
  return { chuChuan: dayZhi, detail: '杜传' };
}

function handleBaZhuan(dayGan: string, dayZhi: string) {
  const idx = DI_ZHI.indexOf(dayZhi as DiZhi);
  const target = yinYang(dayGan) === '阳' ? (idx + 2) % 12 : (idx - 2 + 12) % 12;
  return { chuChuan: DI_ZHI[target], detail: '帷簿' };
}

// ─── 神煞 ───

function calcShenSha(dayGanZhi: string): ShenShaInfo {
  const dayZhi = dayGanZhi[1];
  const riMa: Record<string, string> = {
    '子': '寅', '丑': '亥', '寅': '申', '卯': '巳', '辰': '寅', '巳': '亥',
    '午': '申', '未': '巳', '申': '寅', '酉': '亥', '戌': '申', '亥': '巳',
  };
  const huaGai: Record<string, string> = {
    '子': '戌', '丑': '丑', '寅': '戌', '卯': '未', '辰': '戌', '巳': '丑',
    '午': '戌', '未': '未', '申': '戌', '酉': '丑', '戌': '戌', '亥': '未',
  };
  const shanDian: Record<string, string> = {
    '子': '辰', '丑': '辰', '寅': '未', '卯': '未', '辰': '戌', '巳': '戌',
    '午': '丑', '未': '丑', '申': '寅', '酉': '寅', '戌': '卯', '亥': '卯',
  };
  const idx = JIA_ZI_60.indexOf(dayGanZhi);
  const xunStart = Math.floor(idx / 10) * 10;
  const dingMaMap: Record<number, string> = { 0: '卯', 10: '丑', 20: '亥', 30: '酉', 40: '未', 50: '巳' };
  // 月马（按三合局）
  const yueMaMap: Record<string, string> = { '寅': '午', '午': '午', '戌': '午', '申': '子', '子': '子', '辰': '子', '巳': '卯', '酉': '卯', '丑': '卯', '亥': '巳', '卯': '巳', '未': '巳' };
  return {
    riMa: riMa[dayZhi] ?? '寅',
    yueMa: yueMaMap[dayZhi] ?? '寅',
    dingMa: dingMaMap[xunStart] ?? '卯',
    huaGai: huaGai[dayZhi] ?? '戌',
    shanDian: shanDian[dayZhi] ?? '辰',
  };
}

// ─── 从 lunar-javascript 取节气+干支 ───

function callFirst(obj: LunarLike | undefined, names: string[]): string {
  if (!obj) return '';
  for (const n of names) {
    const v = (obj as Record<string, unknown>)[n];
    if (typeof v === 'function') return (v as (...a: unknown[]) => unknown).call(obj) as string;
    if (v !== undefined) return String(v);
  }
  return '';
}

function resolveDaliurenInput(birth: DaliurenBirth, solar?: SolarLike | null): {
  jieqi: string; dayGanZhi: string; hourGanZhi: string; mode: 'local-exact' | 'local-approx';
} {
  if (solar) {
    try {
      const s = solar.fromYmdHms
        ? solar.fromYmdHms(birth.year, birth.month, birth.day, birth.hour, birth.minute || 0, 0)
        : solar.fromYmd?.(birth.year, birth.month, birth.day);
      const lunar = s && typeof s.getLunar === 'function' ? s.getLunar() : null;
      if (lunar) {
        const dayGz = callFirst(lunar, ['getDayInGanZhiExact', 'getDayInGanZhi', 'getDayGanZhi']);
        const hourGz = callFirst(lunar, ['getTimeInGanZhiExact', 'getTimeInGanZhi', 'getTimeGanZhi']);
        // 节气：lunar-javascript 没有 getJieQiPre，getJieQi 只返回当日节气点（非当天则空）
        // 用 getJieQiTable + 日期比较找当前所处节气
        let jieqi = '';
        if (typeof lunar.getJieQiTable === 'function') {
          jieqi = jieqiFromTable(lunar.getJieQiTable(), birth);
        }
        if (!jieqi && typeof lunar.getJieQi === 'function') jieqi = lunar.getJieQi();
        if (dayGz && hourGz) return { jieqi, dayGanZhi: dayGz, hourGanZhi: hourGz, mode: 'local-exact' };
      }
    } catch {
      /* 降级近似 */
    }
  }
  // 近似：用公历推干支（基准日 1900-01-31 甲辰，同 baziEngine）
  const dayGz = approxDayGanZhi(birth.year, birth.month, birth.day);
  const hourIdx = Math.floor((birth.hour + 1) / 2) % 12;
  const hourGz = approxHourGanZhi(dayGz, hourIdx);
  const jieqi = approxJieqi(birth.month, birth.day);
  return { jieqi, dayGanZhi: dayGz, hourGanZhi: hourGz, mode: 'local-approx' };
}

/** 从 lunar-javascript getJieQiTable() 结果找当前日期所处节气。
 *  jieQiTable 含中文名节气（如"芒种"）和英文名（如"DA_XUE"），只取中文节气名。
 *  值可能是 Date / Solar 对象 / 日期字符串，统一用 toString() 解析。
 */
function jieqiFromTable(table: Record<string, unknown>, birth: { year: number; month: number; day: number }): string {
  if (!table) return '';
  const today = new Date(birth.year, birth.month - 1, birth.day);
  const entries: Array<{ name: string; date: Date }> = [];
  for (const [name, value] of Object.entries(table)) {
    // 只取中文节气名（含中文字符的 key）
    if (!/[一-鿿]/.test(name)) continue;
    let d: Date | null = null;
    if (value instanceof Date) {
      d = value;
    } else if (typeof value === 'string') {
      d = new Date(value);
    } else if (value && typeof value === 'object') {
      // lunar-javascript vendor 版返回 Solar 对象，toString() 输出 "1989-12-07" 格式
      const s = String(value);
      const m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (m) d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    if (d) entries.push({ name, date: d });
  }
  entries.sort((a, b) => a.date.getTime() - b.date.getTime());
  let current = '';
  for (const e of entries) {
    if (e.date <= today) current = e.name;
  }
  return current;
}

function approxDayGanZhi(year: number, month: number, day: number): string {
  const base = new Date(1900, 0, 31);
  const tgt = new Date(year, month - 1, day);
  const diff = Math.round((tgt.getTime() - base.getTime()) / 86400000);
  const sexa = ((41 + diff - 1) % 60 + 60) % 60;
  return JIA_ZI_60[sexa];
}

function approxHourGanZhi(dayGz: string, hourIdx: number): string {
  const dayGanIdx = TIAN_GAN.indexOf(dayGz[0] as TianGan);
  const hourGanIdx = (dayGanIdx * 2 + hourIdx) % 10;
  return TIAN_GAN[hourGanIdx] + DI_ZHI[hourIdx];
}

function approxJieqi(month: number, day: number): string {
  // 节气日近似表（按公历月日顺序，1月小寒为年初）
  // 返回当前日期所处节气的上一个节气点（即当前节气）
  const terms = [
    { m: 1, d: 6, j: '小寒' }, { m: 1, d: 20, j: '大寒' },
    { m: 2, d: 4, j: '立春' }, { m: 2, d: 19, j: '雨水' },
    { m: 3, d: 6, j: '惊蛰' }, { m: 3, d: 21, j: '春分' },
    { m: 4, d: 5, j: '清明' }, { m: 4, d: 20, j: '谷雨' },
    { m: 5, d: 6, j: '立夏' }, { m: 5, d: 21, j: '小满' },
    { m: 6, d: 6, j: '芒种' }, { m: 6, d: 21, j: '夏至' },
    { m: 7, d: 7, j: '小暑' }, { m: 7, d: 23, j: '大暑' },
    { m: 8, d: 8, j: '立秋' }, { m: 8, d: 23, j: '处暑' },
    { m: 9, d: 8, j: '白露' }, { m: 9, d: 23, j: '秋分' },
    { m: 10, d: 8, j: '寒露' }, { m: 10, d: 24, j: '霜降' },
    { m: 11, d: 7, j: '立冬' }, { m: 11, d: 22, j: '小雪' },
    { m: 12, d: 7, j: '大雪' }, { m: 12, d: 22, j: '冬至' },
  ];
  let current = '冬至'; // 年末默认
  for (const t of terms) {
    if (month < t.m || (month === t.m && day < t.d)) break;
    current = t.j;
  }
  return current;
}

// ─── 主入口 ───

export interface DaliurenBirth {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
}

export interface DaliurenInput {
  birth: DaliurenBirth;
  solar?: SolarLike | null;
  /** 天将推算流派，默认 classic（与历史排盘一致） */
  school?: DaliurenSchool;
}

export function calculateDaliuren(input: DaliurenInput): DaliurenResult {
  const { birth, solar } = input;
  const school = input.school ?? 'classic';
  const { jieqi, dayGanZhi, hourGanZhi, mode } = resolveDaliurenInput(birth, solar);

  const dayGan = dayGanZhi[0];
  const dayZhi = dayGanZhi[1];
  const hourZhi = hourGanZhi[1];
  const dayNight = DAY_NIGHT_MAP[hourZhi] ?? '昼';

  const tianDiPan = calcTianDiPan(jieqi, hourZhi, dayGan, school);
  const siKe = calcSiKe(dayGan, dayZhi, tianDiPan, school);
  const sanChuan = calcSanChuan(siKe, tianDiPan, dayGanZhi, hourZhi, school);
  const shenSha = calcShenSha(dayGanZhi);

  const schoolName = DALIUREN_SCHOOLS[school].name;
  return {
    basicInfo: { jieqi, dayGanZhi, hourGanZhi, dayNight, yueJiang: tianDiPan.yueJiang, yueJiangName: tianDiPan.yueJiangName },
    tianDiPan,
    siKe,
    sanChuan,
    shenSha,
    engineName: 'DaliurenEngine',
    mode,
    school,
    confidenceNote: `本解读结合天地盘、四课、三传、神煞与格局观察。天将采用${schoolName}：${DALIUREN_SCHOOLS[school].note}。不同传承的看法可能不同，宜结合所问事项参考。`,
  };
}

// ─── ToolEnvelope 适配 ───

export interface DaliurenData extends DaliurenResult {
  export_snapshot: ExportSnapshot;
}

export function calcDaliurenEnveloped(input: DaliurenInput): ToolEnvelope<DaliurenData> {
  const result = calculateDaliuren(input);
  const { basicInfo, sanChuan, siKe, tianDiPan, shenSha, school } = result;
  const schoolName = DALIUREN_SCHOOLS[school].name;

  const gejuStr = `${sanChuan.geJu}·${sanChuan.geJuDetail}`;
  const chuanStr = `初传${sanChuan.chuChuan.diZhi}(${sanChuan.chuChuan.tianJiang}/${sanChuan.chuChuan.liuQin}) → 中传${sanChuan.zhongChuan.diZhi}(${sanChuan.zhongChuan.tianJiang}) → 末传${sanChuan.moChuan.diZhi}(${sanChuan.moChuan.tianJiang})`;
  const keStr = siKe.list.map((k) => `第${k.position}课 ${k.shangShen}上${k.xiaShen}下(${k.relation})`).join('；');
  const panStr = DI_ZHI.map((d) => `${d}:${tianDiPan.diToTian[d]}(${tianDiPan.diToJiang[d]})`).join(' ');

  const snapshot: ExportSnapshot = {
    summary: `${basicInfo.dayGanZhi}日${basicInfo.hourGanZhi}时${basicInfo.dayNight}占，月将${tianDiPan.yueJiangName}（${tianDiPan.yueJiang}），${gejuStr}。${chuanStr}。`,
    tags: ['大六壬', gejuStr, `月将${tianDiPan.yueJiangName}`, basicInfo.dayNight + '占', `天将·${schoolName}`],
    sections: [
      { heading: '格局', body: `${gejuStr}。${basicInfo.dayGanZhi}日${basicInfo.hourGanZhi}时${basicInfo.dayNight}占，节气${basicInfo.jieqi}，月将${tianDiPan.yueJiangName}。` },
      { heading: '三传', body: chuanStr + '。' },
      { heading: '四课', body: keStr + '。' },
      { heading: '天地盘', body: `月将${tianDiPan.yueJiangName}加${basicInfo.hourGanZhi[1]}时：${panStr}。` },
      { heading: '神煞', body: `日马${shenSha.riMa}、月马${shenSha.yueMa}、丁马${shenSha.dingMa}、华盖${shenSha.huaGai}、闪电${shenSha.shanDian}。` },
      // 口径说明单独成段：heading 含"口径"会被 reportLayers 归为技术细节剔除出用户视图，
      // 但保留在 sourceNotes 与 snapshot 内，供导出/溯源。
      { heading: '天将口径', body: `${schoolName}：${DALIUREN_SCHOOLS[school].note}` },
    ],
    sourceNotes: '大六壬内容仅作传统卜筮文化参考。',
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
