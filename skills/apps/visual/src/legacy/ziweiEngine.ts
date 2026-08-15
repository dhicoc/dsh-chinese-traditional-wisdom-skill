/**
 * ziweiEngine — 紫微斗数纯 TS 引擎（C 类迁移第五步）
 *
 * 从 engine-adapters.js 的 ZiweiIztroAdapter 移植为纯 TS，
 * 用 ESM `import { astro } from 'iztro'` 替代 window.iztro 全局。
 *
 * - iztro v2.5.8（MIT）npm 包导出 { data, star, util, astro }，astro.bySolar 与
 *   vendor 全局版 window.iztro.astro.bySolar 调用方式一致。
 * - 输出结构与旧 adapter 完全一致（palaces/sihua/mainStars/birthInfo/mingGua/chart），
 *   ZiweiPalaceGrid/渲染器可直接消费。
 * - 旧 JS ZiweiIztroAdapter 保留作 EngineAdapterRegistry fallback，零回归。
 *
 * 本地运行器可直接 import { calcZiweiEnveloped } from './ziweiEngine'，
 * 无需 window、无需 vendor script loader。
 */

import { astro } from 'iztro';
import type { ToolEnvelope, ExportSnapshot } from './baseTypes';
import { resolveZiweiEngineConfig } from './engineConfig';

/** iztro palace 名称映射：iztro 中文输出 → 本项目渲染器宫名（仆役→交友） */
const IZTRO_PALACE_MAP: Record<string, string> = {
  命宫: '命宫', 兄弟: '兄弟', 夫妻: '夫妻', 子女: '子女',
  财帛: '财帛', 疾厄: '疾厄', 迁移: '迁移', 仆役: '交友',
  官禄: '官禄', 田宅: '田宅', 福德: '福德', 父母: '父母',
};

/** 天干 → 四化星名（对齐 engine-adapters getStarName） */
const STEM_STAR_MAP: Record<string, string> = {
  甲: '廉贞', 乙: '破军', 丙: '武曲', 丁: '太阳', 戊: '天同',
  己: '廉贞', 庚: '天府', 辛: '太阴', 壬: '武曲', 癸: '贪狼',
};

const BRANCHES = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

export interface ZiweiBirth {
  year: number;
  month: number;
  day: number;
  hour: number;
  gender: '男' | '女';
}

export interface ZiweiMingGua {
  trigram: string;
  group: string;
}

export type ZiweiStarType =
  | 'major'
  | 'soft'
  | 'tough'
  | 'adjective'
  | 'flower'
  | 'helper'
  | 'lucun'
  | 'tianma';

export type ZiweiStarScope = 'origin' | 'decadal' | 'yearly' | 'monthly' | 'daily' | 'hourly';

export interface ZiweiStar {
  name: string;
  type: ZiweiStarType;
  scope: ZiweiStarScope;
  brightness?: string;
  mutagen?: string;
  source: 'majorStars' | 'minorStars' | 'adjectiveStars';
}

export interface ZiweiPalace {
  stars: string[];
  majorStars: ZiweiStar[];
  minorStars: ZiweiStar[];
  adjectiveStars: ZiweiStar[];
  changsheng12?: string;
  boshi12?: string;
  position: string;
  miaoxian: string;
  earthlyBranch?: string;
}

export interface ZiweiResult {
  engineName: string;
  mode: 'local-exact' | 'demo';
  version: string;
  birthInfo: { year: number; month: number; day: number; hour: number; gender: string };
  mingGua: ZiweiMingGua;
  palaces: Record<string, ZiweiPalace>;
  sihua: Record<string, string>;
  mainStars: string[];
  chart: unknown; // iztro 原始 chart（供高级消费，渲染器不读）
  confidenceNote?: string;
  /** 五行局（如「木三局」） */
  fiveElementsClass?: string;
  /** 命主/身主 */
  soul?: string;
  body?: string;
  /** 身宫地支（命主此生关注之宫） */
  bodyPalaceBranch?: string;
  /** 来因宫地支（先天业力聚焦之宫） */
  originalPalaceBranch?: string;
  /** 星座/生肖 */
  sign?: string;
  zodiac?: string;
}

interface IztroStar {
  name: string;
  brightness?: string;
  type?: string;
  scope?: string;
  mutagen?: string;
}
interface IztroPalace {
  name: string;
  majorStars?: IztroStar[];
  minorStars?: IztroStar[];
  adjectiveStars?: IztroStar[];
  changsheng12?: string;
  boshi12?: string;
  earthlyBranch?: string;
}

function toZiweiStars(stars: IztroStar[] | undefined, source: ZiweiStar['source']): ZiweiStar[] {
  if (!Array.isArray(stars)) return [];
  return stars.flatMap((star) => {
    if (!star?.name || !star.type || !star.scope) return [];
    return [{
      name: star.name,
      type: star.type as ZiweiStarType,
      scope: star.scope as ZiweiStarScope,
      brightness: star.brightness,
      mutagen: star.mutagen,
      source,
    }];
  });
}

/** 将 iztro palaces 数组转换为本项目渲染器格式（对齐 transformIztroPalaces） */
function transformIztroPalaces(iztroPalaces: IztroPalace[]): Record<string, ZiweiPalace> {
  const result: Record<string, ZiweiPalace> = {};
  if (!Array.isArray(iztroPalaces)) return result;
  let brIdx = 0;
  iztroPalaces.forEach((p) => {
    if (!p) return;
    const pName = IZTRO_PALACE_MAP[p.name];
    if (!pName) return;
    const majorStars = toZiweiStars(p.majorStars, 'majorStars');
    const minorStars = toZiweiStars(p.minorStars, 'minorStars');
    const adjectiveStars = toZiweiStars(p.adjectiveStars, 'adjectiveStars');
    const brightness = majorStars.find((star) => star.brightness)?.brightness ?? '';
    let branchIndex = p.earthlyBranch ? BRANCHES.indexOf(p.earthlyBranch.substring(0, 1)) : brIdx % 12;
    if (branchIndex < 0) branchIndex = brIdx % 12;
    const branch = BRANCHES[branchIndex] || BRANCHES[brIdx % 12];
    result[pName] = {
      stars: [...majorStars, ...minorStars, ...adjectiveStars].map((star) => star.name),
      majorStars,
      minorStars,
      adjectiveStars,
      changsheng12: p.changsheng12,
      boshi12: p.boshi12,
      position: branch,
      miaoxian: brightness || '平',
      earthlyBranch: p.earthlyBranch || '',
    };
    brIdx++;
  });
  return result;
}

/** 从 iztro chart 提取四化映射 { 星名: 禄/权/科/忌 }。
 *  iztro ESM 版四化标在每颗星的 mutagen 字段上（非顶层 sihua 对象），
 *  遍历所有宫位的所有星，找 mutagen 非空的即为四化星。
 */
function extractSihuaFromChart(palaces: IztroPalace[]): Record<string, string> {
  const result: Record<string, string> = {};
  if (!Array.isArray(palaces)) return result;
  palaces.forEach((p) => {
    (['majorStars', 'minorStars', 'adjectiveStars'] as const).forEach((k) => {
      const stars = (p as unknown as Record<string, IztroStar[] | undefined>)[k];
      if (Array.isArray(stars)) {
        stars.forEach((s) => {
          const sr = s as unknown as Record<string, unknown>;
          if (s && s.name && sr.mutagen) {
            result[s.name] = String(sr.mutagen);
          }
        });
      }
    });
  });
  return result;
}

/** 提取所有主星列表（对齐 extractMainStars） */
function extractMainStars(iztroPalaces: IztroPalace[]): string[] {
  const stars: string[] = [];
  if (!Array.isArray(iztroPalaces)) return stars;
  iztroPalaces.forEach((p) => {
    if (p && p.majorStars && Array.isArray(p.majorStars)) {
      p.majorStars.forEach((s) => {
        if (s && s.name && !stars.includes(s.name)) stars.push(s.name);
      });
    }
  });
  return stars;
}

export interface ZiweiTransitQuery {
  year: number;
  month: number;
}

export interface ZiweiInput {
  birth: ZiweiBirth;
  mingGua?: ZiweiMingGua;
  transit?: ZiweiTransitQuery;
}

/**
 * 紫微斗数计算 —— 纯 TS 版（ESM import iztro）。
 * 失败时返回 demo 模式结果（与旧 adapter fallback 一致，但这里不引入演示 RNG，
 * 而是返回空 palaces + demo 标记，由上层决定是否用 buildFallbackZiweiData）。
 */
export function calculateZiwei(input: ZiweiInput): ZiweiResult {
  const birth = input.birth;
  const mingGua = input.mingGua ?? { trigram: '?', group: '?' };

  // hour → timeIndex：0=早子时(23-1)...12=晚子时(23-1)
  let timeIndex = Math.floor((birth.hour + 1) / 2);
  if (timeIndex === 12) timeIndex = 0; // 23:00-23:59 → 早子时
  const genderKey = birth.gender === '男' ? '男' : '女';
  const solarDateStr = `${birth.year}-${birth.month}-${birth.day}`;

  const chart = astro.bySolar(solarDateStr, timeIndex, genderKey) as unknown as {
    palaces: IztroPalace[];
    sihua: Record<string, string>;
    fiveElementsClass?: string;
    soul?: string;
    body?: string;
    earthlyBranchOfBodyPalace?: string;
    earthlyBranchOfSoulPalace?: string;
    sign?: string;
    zodiac?: string;
  };
  if (!chart || !chart.palaces || !Array.isArray(chart.palaces)) {
    return {
      engineName: 'ZiweiIztroAdapter',
      mode: 'demo',
      version: 'iztro@2.5.8',
      birthInfo: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender },
      mingGua,
      palaces: {},
      sihua: {},
      mainStars: [],
      chart: null,
      confidenceNote: '暂未生成完整命盘，请稍后重试。',
    };
  }

  return {
    engineName: 'ZiweiIztroAdapter',
    mode: 'local-exact',
    version: 'iztro@2.5.8',
    birthInfo: { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender },
    mingGua,
    palaces: transformIztroPalaces(chart.palaces),
    sihua: extractSihuaFromChart(chart.palaces),
    mainStars: extractMainStars(chart.palaces),
    chart,
    confidenceNote: '紫微斗数各家安星与解读方法略有差异，本页内容宜结合整体命盘参考。',
    fiveElementsClass: chart.fiveElementsClass,
    soul: chart.soul,
    body: chart.body,
    bodyPalaceBranch: chart.earthlyBranchOfBodyPalace,
    originalPalaceBranch: chart.earthlyBranchOfSoulPalace,
    sign: chart.sign,
    zodiac: chart.zodiac,
  };
}

// ─── ToolEnvelope 适配 ───
export interface ZiweiData extends ZiweiResult {
  export_snapshot: ExportSnapshot;
}

export function calcZiweiEnveloped(input: ZiweiInput): ToolEnvelope<ZiweiData> {
  const result = calculateZiwei(input);
  const palaceNames = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];
  const ming = result.palaces['命宫'];
  const mainStarsSummary = result.mainStars.slice(0, 14).join('、');
  const sihuaSummary = Object.keys(result.sihua).map((star) => `${star}${result.sihua[star]}`).join('、');
  const now = new Date();
  const config = resolveZiweiEngineConfig({
    year: input.transit?.year ?? now.getFullYear(),
    month: input.transit?.month ?? now.getMonth() + 1,
  });
  const { year: transitYear, month: transitMonth } = config.transit;

  const sections: Array<{ heading: string; body: string }> = [
    {
      heading: '排盘口径',
      body: `本命盘以公历出生日期和时辰换算，使用 ${result.version} 排盘。动态层按${transitYear}年${transitMonth}月15日查询，当前展示大限、流年、流月与小限；流日、流时及三方四正尚未启用。`,
    },
  ];
  if (result.fiveElementsClass || result.soul || result.body) {
    sections.push({
      heading: '命盘元',
      body: [
        result.fiveElementsClass ? `五行局${result.fiveElementsClass}` : '',
        result.soul ? `命主${result.soul}` : '',
        result.body ? `身主${result.body}` : '',
        result.bodyPalaceBranch ? `身宫在${result.bodyPalaceBranch}` : '',
        result.originalPalaceBranch ? `来因宫在${result.originalPalaceBranch}` : '',
      ].filter(Boolean).join('，') + '。',
    });
  }
  if (ming) {
    sections.push({ heading: '命宫', body: `命宫在${ming.position}方，主星：${ming.stars.join('、') || '无'}，庙旺：${ming.miaoxian}。` });
  }
  palaceNames.forEach((name) => {
    const p = result.palaces[name];
    if (p && name !== '命宫') {
      sections.push({ heading: name, body: `${name}在${p.position}方，星曜：${p.stars.join('、') || '无'}，庙旺：${p.miaoxian}。` });
    }
  });
  if (sihuaSummary) sections.push({ heading: '四化', body: sihuaSummary + '。' });

  const hs = getZiweiHoroscopeSummary(
    { year: result.birthInfo.year, month: result.birthInfo.month, day: result.birthInfo.day, hour: result.birthInfo.hour, gender: result.birthInfo.gender as '男' | '女' },
    transitYear,
    transitMonth,
  );
  if (hs.available) {
    const hText = [
      hs.decadal.name && hs.decadal.stem ? `${hs.decadal.name}（${hs.decadal.stem}${hs.decadal.branch}）` : '',
      hs.yearly.stem ? `流年${hs.yearly.stem}${hs.yearly.branch}` : '',
      hs.age.nominalAge ? `虚岁${hs.age.nominalAge}` : '',
      hs.age.palace ? `小限在${hs.age.palace}` : '',
      hs.yearlyJiStar ? `流年化忌${hs.yearlyJiStar}` : '',
    ].filter(Boolean).join('，');
    if (hText) sections.push({ heading: '大限与流年', body: `${hs.targetYear}年${hText}。` });

    const monthText = [
      hs.monthly.stem ? `流月${hs.monthly.stem}${hs.monthly.branch}` : '',
      hs.monthly.mutagen.length ? `流月四化${hs.monthly.mutagen.join('、')}` : '',
      hs.yearlyMingPalace !== '未知' ? `流年命宫居${hs.yearlyMingPalace}` : '',
    ].filter(Boolean).join('，');
    if (monthText) sections.push({ heading: '流月与小限', body: `${transitMonth}月${monthText}。` });
  }

  const snapshot: ExportSnapshot = {
    summary: result.mode === 'local-exact'
      ? `紫微斗数${result.birthInfo.year}年${result.birthInfo.month}月${result.birthInfo.day}日${result.birthInfo.hour}时${result.birthInfo.gender}命，${result.fiveElementsClass ? `五行局${result.fiveElementsClass}，` : ''}${result.soul ? `命主${result.soul}、` : ''}${result.body ? `身主${result.body}，` : ''}命宫主星：${ming?.stars.join('、') || '未知'}，四化：${sihuaSummary || '未知'}。`
      : '暂未生成完整命盘，请稍后重试。',
    tags: ['紫微斗数', ...(ming?.stars || [])],
    sections: sections.length ? sections : [{ heading: '说明', body: result.confidenceNote || '' }],
    sourceNotes: result.confidenceNote || '紫微斗数命盘参考',
  };

  const dynamicTransitSummary = hs.available
    ? `${hs.targetYear}年${hs.targetMonth}月：大限${hs.decadal.stem}${hs.decadal.branch}，流年${hs.yearly.stem}${hs.yearly.branch}，流月${hs.monthly.stem}${hs.monthly.branch}，小限${hs.age.nominalAge}岁居${hs.age.palace}宫。`
    : `${transitYear}年${transitMonth}月动态层未能生成。`;
  const dynamicLimitations = '当前未启用流日、流时及三方四正；不得将未返回的动态层补充为确定性结论。';
  const env: ToolEnvelope<ZiweiData> = {
    ok: result.mode === 'local-exact',
    tool: result.engineName,
    version: result.version,
    input_normalized: input as unknown as Record<string, unknown>,
    data: { ...result, export_snapshot: snapshot },
    warnings: [result.confidenceNote || ''],
    evidence: {
      steps: [
        {
          key: 'natal-chart',
          stage: '本命定盘',
          status: result.mode === 'local-exact' ? 'ok' : 'fallback',
          inputs: { birth: result.birthInfo },
          result: `十二宫${Object.keys(result.palaces).length}宫，命宫${ming?.position ?? '未知'}，四化${sihuaSummary || '未知'}。`,
          promptText: `本命盘使用 ${result.version} 生成十二宫与四化。`,
          sources: ['SylarLong/iztro@2.5.8'],
          limitation: result.confidenceNote,
        },
        {
          key: 'palace-normalization',
          stage: '宫位归一',
          status: 'ok',
          inputs: { sourcePalaceName: '仆役' },
          result: '仆役宫统一显示为交友宫。',
          dependsOnStepKeys: ['natal-chart'],
          promptText: '引擎输出中的仆役宫已统一为交友宫。',
          sources: ['项目宫位名称归一规则'],
        },
        {
          key: 'dynamic-transit',
          stage: '动态层查询',
          status: hs.available ? 'ok' : 'fallback',
          inputs: { config },
          result: dynamicTransitSummary,
          dependsOnStepKeys: ['natal-chart'],
          promptText: dynamicTransitSummary,
          sources: ['SylarLong/iztro@2.5.8 horoscope'],
          limitation: dynamicLimitations,
        },
      ],
      facts: [
        { level: '主证', title: `命宫${ming?.position ?? '未知'} · ${ming?.stars.join('、') || '无主星资料'}`, detail: `四化：${sihuaSummary || '未知'}。`, source: 'SylarLong/iztro@2.5.8', tags: ['本命', '命宫', '四化'] },
        { level: '应期', title: `${transitYear}年${transitMonth}月动态层`, detail: dynamicTransitSummary, source: 'SylarLong/iztro@2.5.8 horoscope', tags: ['大限', '流年', '流月', '小限'] },
        { level: '限制', title: '紫微动态层边界', detail: dynamicLimitations, source: '项目动态层口径', tags: ['边界'] },
      ],
      limitations: [result.confidenceNote || '紫微斗数各家安星与解读方法略有差异，应结合整体命盘参考。', dynamicLimitations],
    },
    result_meta: {
      engineVersion: result.version,
      evidenceSchemaVersion: '0.1.0',
      algorithm: 'iztro 紫微斗数本命盘与 horoscope 动态层',
      calculationConfig: { ...config },
    },
  };
  if (result.mode !== 'local-exact') {
    env.error = { code: 'demo_fallback', message: '暂未生成完整命盘，请稍后重试。' };
  }
  return env;
}

// ─── 紫微流年/大限摘要（供年度运势 combo 接入紫微维度）───

/** iztro horoscope 子结构（decadal/yearly/age 共用形态） */
interface IztroHoroscopePeriod {
  index?: number;
  name?: string;
  heavenlyStem?: string;
  earthlyBranch?: string;
  palaceNames?: string[];
  mutagen?: string[];
  stars?: unknown[];
  yearlyDecStar?: unknown[];
  nominalAge?: number;
}

interface IztroHoroscope {
  decadal?: IztroHoroscopePeriod;
  yearly?: IztroHoroscopePeriod;
  monthly?: IztroHoroscopePeriod;
  age?: IztroHoroscopePeriod & { nominalAge?: number };
}

interface IztroTransitStar { name?: string }
interface IztroTransitDecStar {
  suiqian12?: string[];
  jiangqian12?: string[];
}
interface IztroTransitPeriod extends Omit<IztroHoroscopePeriod, 'stars' | 'yearlyDecStar'> {
  stars?: IztroTransitStar[][];
  yearlyDecStar?: IztroTransitDecStar;
}
interface IztroTransitHoroscope {
  decadal?: IztroTransitPeriod;
  yearly?: IztroTransitPeriod;
}

export interface ZiweiTransitPeriod {
  stem: string;
  branch: string;
  mutagen: string[];
  starsByNatalPalace: Record<string, string[]>;
}

export interface ZiweiTransitSnapshot {
  targetDate: string;
  decadal: ZiweiTransitPeriod;
  yearly: ZiweiTransitPeriod & {
    mingPalace: { natalPalace: string; earthlyBranch: string };
    suiqian12ByNatalPalace: Record<string, string>;
    jiangqian12ByNatalPalace: Record<string, string>;
  };
  available: boolean;
}

function normalizeIztroPalaceName(name: string | undefined): string {
  return name ? IZTRO_PALACE_MAP[name] ?? name : '未知';
}

function transitStarsByNatalPalace(palaces: IztroPalace[], stars: IztroTransitStar[][] | undefined): Record<string, string[]> {
  return palaces.reduce<Record<string, string[]>>((result, palace, index) => {
    const palaceName = normalizeIztroPalaceName(palace.name);
    result[palaceName] = (stars?.[index] ?? []).flatMap((star) => star.name ? [star.name] : []);
    return result;
  }, {});
}

function transitDeitiesByNatalPalace(palaces: IztroPalace[], deities: string[] | undefined): Record<string, string> {
  return palaces.reduce<Record<string, string>>((result, palace, index) => {
    const deity = deities?.[index];
    if (deity) result[normalizeIztroPalaceName(palace.name)] = deity;
    return result;
  }, {});
}

export function getZiweiTransitSnapshot(birth: ZiweiBirth, targetDate: string): ZiweiTransitSnapshot {
  const empty: ZiweiTransitSnapshot = {
    targetDate,
    decadal: { stem: '', branch: '', mutagen: [], starsByNatalPalace: {} },
    yearly: {
      stem: '',
      branch: '',
      mutagen: [],
      starsByNatalPalace: {},
      mingPalace: { natalPalace: '未知', earthlyBranch: '' },
      suiqian12ByNatalPalace: {},
      jiangqian12ByNatalPalace: {},
    },
    available: false,
  };
  try {
    let timeIndex = Math.floor((birth.hour + 1) / 2);
    if (timeIndex === 12) timeIndex = 0;
    const chart = astro.bySolar(`${birth.year}-${birth.month}-${birth.day}`, timeIndex, birth.gender) as unknown as {
      horoscope?: (date: string) => IztroTransitHoroscope;
      palaces?: IztroPalace[];
    };
    if (!chart?.palaces || typeof chart.horoscope !== 'function') return empty;
    const horoscope = chart.horoscope(targetDate);
    const decadal = horoscope.decadal ?? {};
    const yearly = horoscope.yearly ?? {};
    const mingPalace = chart.palaces[yearly.index ?? -1];
    return {
      targetDate,
      decadal: {
        stem: decadal.heavenlyStem ?? '',
        branch: decadal.earthlyBranch ?? '',
        mutagen: decadal.mutagen ?? [],
        starsByNatalPalace: transitStarsByNatalPalace(chart.palaces, decadal.stars),
      },
      yearly: {
        stem: yearly.heavenlyStem ?? '',
        branch: yearly.earthlyBranch ?? '',
        mutagen: yearly.mutagen ?? [],
        starsByNatalPalace: transitStarsByNatalPalace(chart.palaces, yearly.stars),
        mingPalace: {
          natalPalace: normalizeIztroPalaceName(mingPalace?.name),
          earthlyBranch: mingPalace?.earthlyBranch ?? '',
        },
        suiqian12ByNatalPalace: transitDeitiesByNatalPalace(chart.palaces, yearly.yearlyDecStar?.suiqian12),
        jiangqian12ByNatalPalace: transitDeitiesByNatalPalace(chart.palaces, yearly.yearlyDecStar?.jiangqian12),
      },
      available: true,
    };
  } catch {
    return empty;
  }
}

/** 流年/大限摘要 */
export interface ZiweiHoroscopeSummary {
  /** 目标年份 */
  targetYear: number;
  /** 目标月份（流月查询锚点） */
  targetMonth: number;
  /** 大限：名称（如「第三大限」）+ 天干地支 */
  decadal: { name: string; stem: string; branch: string; mutagen: string[] };
  /** 流年：天干地支 + 流年四化星（mutagen 顺序：[化禄, 化权, 化科, 化忌]） */
  yearly: { stem: string; branch: string; mutagen: string[] };
  /** 小限：虚岁 + 所在宫位 */
  age: { nominalAge: number; palace: string };
  /** 命宫在流年盘中的宫位名（palaceNames[命宫索引]） */
  yearlyMingPalace: string;
  /** 本命命宫主星（供 combo 判四化是否入命） */
  mingMainStars: string[];
  /** 流年化忌星（mutagen[3]） */
  yearlyJiStar: string;
  /** 流年化禄星（mutagen[0]） */
  yearlyLuStar: string;
  /** 流月：天干地支 + 流月四化星（mutagen 顺序同 yearly） */
  monthly: { stem: string; branch: string; mutagen: string[] };
  /** 一句话摘要（供 combo tone 推断与展示） */
  summary: string;
  /** 是否成功取到 horoscope（iztro 不可用或异常时 false） */
  available: boolean;
}

/**
 * 取紫微流年/大限摘要（iztro horoscope）。
 * 给定出生信息 + 目标年份，返回该年大限/流年/小限的结构化摘要。
 * iztro 不可用或 horoscope 抛错时返回 available=false 的空壳，不抛异常。
 *
 * @param targetYear 目标年份（公历）
 * @param targetMonth 目标月（horoscope 需完整日期，传 1-12，默认 7）
 */
export function getZiweiHoroscopeSummary(
  birth: ZiweiBirth,
  targetYear: number,
  targetMonth = 7,
): ZiweiHoroscopeSummary {
  const empty: ZiweiHoroscopeSummary = {
    targetYear,
    targetMonth,
    decadal: { name: '未知', stem: '', branch: '', mutagen: [] },
    yearly: { stem: '', branch: '', mutagen: [] },
    age: { nominalAge: 0, palace: '未知' },
    yearlyMingPalace: '未知',
    mingMainStars: [],
    yearlyJiStar: '',
    yearlyLuStar: '',
    monthly: { stem: '', branch: '', mutagen: [] },
    summary: '紫微流年数据不可用',
    available: false,
  };
  try {
    let timeIndex = Math.floor((birth.hour + 1) / 2);
    if (timeIndex === 12) timeIndex = 0;
    const genderKey = birth.gender === '男' ? '男' : '女';
    const solarDateStr = `${birth.year}-${birth.month}-${birth.day}`;
    const chart = astro.bySolar(solarDateStr, timeIndex, genderKey) as unknown as {
      horoscope?: (d: string) => IztroHoroscope;
      palaces?: IztroPalace[];
    };
    if (!chart || typeof chart.horoscope !== 'function') return empty;
    // horoscope 需完整 yyyy-mm-dd；传目标年某日，流年四化/大限取决于年支与年龄，与具体日无关
    const h = chart.horoscope(`${targetYear}-${String(targetMonth).padStart(2, '0')}-15`);
    if (!h) return empty;

    const decadal = h.decadal ?? {};
    const yearly = h.yearly ?? {};
    const monthly = h.monthly ?? {};
    const age = h.age ?? {};

    // 流年命宫：palaceNames 数组中「命宫」所在位置
    const yearlyMingPalace = yearly.palaceNames?.find((n) => n === '命宫')
      ?? yearly.palaceNames?.[0]
      ?? '未知';

    // 本命命宫主星（供 combo 判四化入命）
    const mingMainStars = extractMainStars(chart.palaces ?? []).filter((s) => {
      // 取命宫主星：palaces 中 name === '命宫'
      const mingPalace = (chart.palaces ?? []).find((p) => p.name === '命宫');
      return mingPalace?.majorStars?.some((s2) => s2.name === s);
    });

    const decadalName = decadal.name || '大限';
    const decadalStem = decadal.heavenlyStem || '';
    const decadalBranch = decadal.earthlyBranch || '';
    const yearlyStem = yearly.heavenlyStem || '';
    const yearlyBranch = yearly.earthlyBranch || '';
    const yearlyMutagen = yearly.mutagen ?? [];
    const decadalMutagen = decadal.mutagen ?? [];
    // mutagen 顺序：[化禄, 化权, 化科, 化忌]
    const yearlyLuStar = yearlyMutagen[0] ?? '';
    const yearlyJiStar = yearlyMutagen[3] ?? '';

    const monthlyStem = monthly.heavenlyStem || '';
    const monthlyBranch = monthly.earthlyBranch || '';
    const monthlyMutagen = monthly.mutagen ?? [];

    const summary = `${targetYear}年流年${yearlyStem}${yearlyBranch}，流年四化${yearlyMutagen.join('、') || '无'}（${yearlyLuStar}化禄、${yearlyJiStar}化忌）；` +
      `当前${decadalName}（${decadalStem}${decadalBranch}），大限四化${decadalMutagen.join('、') || '无'}；` +
      `流月${monthlyStem}${monthlyBranch}，流月四化${monthlyMutagen.join('、') || '无'}；` +
      `小限${age.nominalAge ?? '?'}岁居${age.palaceNames?.[0] ?? '未知'}宫，流年命宫居${yearlyMingPalace}。`;

    return {
      targetYear,
      targetMonth,
      decadal: { name: decadalName, stem: decadalStem, branch: decadalBranch, mutagen: decadalMutagen },
      yearly: { stem: yearlyStem, branch: yearlyBranch, mutagen: yearlyMutagen },
      monthly: { stem: monthlyStem, branch: monthlyBranch, mutagen: monthlyMutagen },
      age: { nominalAge: age.nominalAge ?? 0, palace: age.palaceNames?.[0] ?? '未知' },
      yearlyMingPalace,
      mingMainStars,
      yearlyJiStar,
      yearlyLuStar,
      summary,
      available: true,
    };
  } catch {
    return empty;
  }
}
