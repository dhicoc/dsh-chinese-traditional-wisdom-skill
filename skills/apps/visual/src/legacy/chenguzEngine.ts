/**
 * chenguzEngine — 袁天罡称骨算命
 *
 * 按出生年月日时（农历）查四柱骨重，总重对应称骨歌。
 * - 年骨重：按60甲子年（天干+地支联合定重）
 * - 月骨重：按农历月（1-12）
 * - 日骨重：按农历日（1-30）
 * - 时骨重：按时支（子-亥）
 *
 * 复用 calcBaziEnveloped 取年柱/时支干支；农历月日由 lunar-javascript Solar.getLunar() 取。
 *
 * 多版本：称骨法无唯一正本，本引擎收录三个民间传抄版本供用户切换，
 * 数据见 chenguzVersions.ts。不裁定哪个为正本。
 */

import type { ToolEnvelope, ExportSnapshot, Tone } from './baseTypes';
import { calcBaziEnveloped, type BaziBirth, type BaziResult } from './baziEngine';
import {
  getVersion,
  DEFAULT_CHENGUZ_VERSION,
  SHARED_MONTH_BONE,
  SHARED_DAY_BONE,
  SHARED_HOUR_BONE,
  type ChenguzVersionId,
  type ChenguzVersion,
} from './chenguzVersions';

// ─── 骨重单位：两、钱（1 两 = 10 钱）──
export interface BoneWeight {
  liang: number; // 两
  qian: number;  // 钱
}

export interface ChenguzInput {
  birth: BaziBirth;
  solar?: unknown;
  /** 称骨版本，默认 'standard' 通行工整本 */
  version?: ChenguzVersionId;
}

export interface ChenguzResult {
  /** 四柱骨重 */
  yearBone: { branch: string; weight: BoneWeight; };
  monthBone: { lunarMonth: number; weight: BoneWeight; };
  dayBone: { lunarDay: number; weight: BoneWeight; };
  hourBone: { branch: string; weight: BoneWeight; };
  /** 总重 */
  total: BoneWeight;
  /** 总重文字（如「三两八钱」） */
  totalText: string;
  /** 称骨歌诀 */
  song: string;
  /** 歌诀白话解读 */
  interpretation: string;
  tone: Tone;
  synthesis: string;
  export_snapshot: ExportSnapshot;
  engineName: string;
  mode: string;
  confidenceNote: string;
  /** 本次所用版本 */
  versionId: ChenguzVersionId;
  versionName: string;
  versionNote: string;
}

// ─── 辅助 ─────────────────────────────────────────────

/** 数字 → 中文两钱（如 3 两 8 钱） */
const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
function boneToText(b: BoneWeight): string {
  const liangStr = b.liang < 10 ? CN_NUM[b.liang] : String(b.liang);
  return `${liangStr}两${b.qian === 0 ? '' : CN_NUM[b.qian] + '钱'}`;
}

/** 总重（两+钱转成总钱数） */
function totalQian(b: BoneWeight): number {
  return b.liang * 10 + b.qian;
}

function addBone(a: BoneWeight, b: BoneWeight): BoneWeight {
  const totalQ = a.liang * 10 + a.qian + b.liang * 10 + b.qian;
  return { liang: Math.floor(totalQ / 10), qian: totalQ % 10 };
}

/** 总重 → tone */
function toneFromTotal(total: BoneWeight): Tone {
  const q = totalQian(total);
  if (q >= 50) return '吉';
  if (q < 30) return '凶';
  return '中';
}

/** 取农历月日（从 lunar-javascript Solar.getLunar()） */
function getLunarMonthDay(birth: BaziBirth, solar: unknown): { month: number; day: number } | null {
  try {
    const s = solar as {
      fromYmdHms?: (y: number, mo: number, d: number, h: number, mi: number, sec: number) => { getLunar(): unknown };
      fromYmd?: (y: number, mo: number, d: number) => { getLunar(): unknown };
    };
    const solarObj = s.fromYmdHms
      ? s.fromYmdHms(birth.year, birth.month, birth.day, birth.hour, birth.minute ?? 0, 0)
      : s.fromYmd?.(birth.year, birth.month, birth.day);
    if (!solarObj) return null;
    const lunar = solarObj.getLunar() as {
      getMonthInChinese?: () => string;
      getDayInChinese?: () => string;
    };
    // 农历月日为中文数字，需转数字
    const monthStr = lunar.getMonthInChinese?.() ?? ''; // 如 "正" "二" "腊"
    const dayStr = lunar.getDayInChinese?.() ?? ''; // 如 "初一" "二十"
    const month = chineseMonthToNum(monthStr);
    const day = chineseDayToNum(dayStr);
    if (month < 1 || day < 1) return null;
    return { month, day };
  } catch {
    return null;
  }
}

const MONTH_CN: Record<string, number> = { 正: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 冬: 11, 腊: 12, 十二: 12 };
function chineseMonthToNum(s: string): number {
  return MONTH_CN[s] ?? 0;
}

function chineseDayToNum(s: string): number {
  // lunar-javascript getDayInChinese 返回如 "初一"…"三十"
  const map: Record<string, number> = {
   初一:1,初二:2,初三:3,初四:4,初五:5,初六:6,初七:7,初八:8,初九:9,初十:10,
   十一:11,十二:12,十三:13,十四:14,十五:15,十六:16,十七:17,十八:18,十九:19,二十:20,
   廿一:21,廿二:22,廿三:23,廿四:24,廿五:25,廿六:26,廿七:27,廿八:28,廿九:29,三十:30,
  };
  return map[s] ?? 0;
}

// ─── 主函数 ─────────────────────────────────────────────

export function calcChenguz(input: ChenguzInput): ToolEnvelope<ChenguzResult> {
  const { birth, solar } = input;
  const ver: ChenguzVersion = getVersion(input.version ?? DEFAULT_CHENGUZ_VERSION);

  // 取八字四柱（年柱、时支）
  const baziEnv = calcBaziEnveloped({ birth, solar: (solar ?? null) as never });
  const bazi = baziEnv.data as BaziResult;
  const yearStem = bazi.pillars.year.stem;     // 如 "甲"
  const yearBranch = bazi.pillars.year.branch; // 如 "子"
  const yearGanzhi = `${yearStem}${yearBranch}`; // 完整干支年，如 "甲子"
  const hourBranch = bazi.pillars.hour.branch;

  // 取农历月日
  const lunarMD = getLunarMonthDay(birth, solar);
  const lunarMonth = lunarMD?.month ?? birth.month;
  const lunarDay = lunarMD?.day ?? birth.day;

  // 四柱骨重（年骨重按版本取，月/日/时三版共享）
  const yearBoneW = ver.yearBone[yearGanzhi] ?? { liang: 0, qian: 0 };
  const monthBoneW = SHARED_MONTH_BONE[lunarMonth] ?? { liang: 0, qian: 0 };
  const dayBoneW = SHARED_DAY_BONE[lunarDay] ?? { liang: 0, qian: 0 };
  const hourBoneW = SHARED_HOUR_BONE[hourBranch] ?? { liang: 0, qian: 0 };

  const total = addBone(addBone(addBone(yearBoneW, monthBoneW), dayBoneW), hourBoneW);
  const totalText = boneToText(total);
  const totalQ = totalQian(total);
  const song = ver.song[totalQ] ?? '称骨歌未收录此重量，请核对骨重计算。';
  const tone = toneFromTotal(total);

  // 白话解读（按重量区间概括）
  const interpretation = interpretTotal(total, totalText);

  const synthesis = `称骨算命（${ver.name}）：年(${yearGanzhi})${boneToText(yearBoneW)} + 月(农历${lunarMonth}月)${boneToText(monthBoneW)} + 日(农历${lunarDay})${boneToText(dayBoneW)} + 时(${hourBranch})${boneToText(hourBoneW)} = 总重${totalText}。${song}`;

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['称骨', totalText, `年${yearGanzhi}`, `时${hourBranch}`, ver.name],
    sections: [
      { heading: '四柱骨重', body: `年(${yearGanzhi})：${boneToText(yearBoneW)}；月(农历${lunarMonth}月)：${boneToText(monthBoneW)}；日(农历${lunarDay})：${boneToText(dayBoneW)}；时(${hourBranch})：${boneToText(hourBoneW)}。` },
      { heading: '总骨重', body: `总重${totalText}（${totalQ}钱）。${interpretation}` },
      { heading: '称骨歌', body: song },
      { heading: '版本', body: `${ver.name}：${ver.note}` },
    ],
  };

  const result: ChenguzResult = {
    yearBone: { branch: yearGanzhi, weight: yearBoneW },
    monthBone: { lunarMonth, weight: monthBoneW },
    dayBone: { lunarDay, weight: dayBoneW },
    hourBone: { branch: hourBranch, weight: hourBoneW },
    total,
    totalText,
    song,
    interpretation,
    tone,
    synthesis,
    export_snapshot: snapshot,
    engineName: 'chenguzEngine',
    mode: lunarMD ? 'local-exact' : 'local-approx',
    confidenceNote: `称骨法的歌诀版本并不统一，当前采用「${ver.name}」。结果仅作传统文化参考。`,
    versionId: ver.id,
    versionName: ver.name,
    versionNote: ver.note,
  };

  const warnings: string[] = [];
  if (!lunarMD) warnings.push('农历月日取值失败，已按输入月日近似计算');
  if (!ver.yearBone[yearGanzhi]) warnings.push(`年干支${yearGanzhi}未在骨重表中，年骨重按0计`);
  if (!ver.song[totalQ]) warnings.push(`总重${totalText}（${totalQ}钱）在「${ver.name}」中未收录，可能该版本缺此条`);

  return {
    ok: true,
    tool: 'calc_chenguz',
    version: '1.0.0',
    input_normalized: { birthYear: birth.year, yearGanzhi, hourBranch, lunarMonth, lunarDay, chenguzVersion: ver.id },
    data: result,
    summary: [synthesis],
    warnings,
  };
}

function interpretTotal(total: BoneWeight, totalText: string): string {
  const q = totalQian(total);
  if (q >= 60) return `${totalText}，骨重极厚，命格尊贵，古论王侯将相之命，今世多为非凡成就、显达一方之人。`;
  if (q >= 50) return `${totalText}，骨重厚实，福禄丰盈，衣食无忧，事业有成，晚年享福。`;
  if (q >= 40) return `${totalText}，骨重中等偏上，劳碌有成，中年渐顺，需勤勉得福。`;
  if (q >= 30) return `${totalText}，骨重中等，平生多劳，先难后易，靠自身勤恳立家。`;
  return `${totalText}，骨重较轻，平生多波折，宜安分守己、积德行善以转福。`;
}

/** 别名：enveloped 版本（同 calcChenguz，保持命名一致性） */
export function calcChenguzEnveloped(input: ChenguzInput): ToolEnvelope<ChenguzResult> {
  return calcChenguz(input);
}
