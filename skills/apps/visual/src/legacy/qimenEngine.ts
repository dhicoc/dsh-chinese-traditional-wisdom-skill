/**
 * qimenEngine — 奇门遁甲纯 TS 引擎（C 类迁移第六步，最后一个）
 *
 * 从 visual/js/engines/qimen-engine.js 移植为纯 TS，
 * 用 ESM `import { QimenChart } from '3meta'` 替代 window.ThreeMeta 全局。
 *
 * - 3meta v2.6.0（MIT）npm 包导出 QimenChart.byDatetime，结构与旧 vendor 版一致。
 * - 两条路径：3meta 真实排盘（local-exact）+ 简化 fallback（local-approx，无 3meta 时）。
 * - 输出结构与旧 QimenEngine.calculate 一致，QimenWorkspace/渲染器可直接消费。
 * - 旧 JS 保留作 EngineAdapterRegistry fallback，零回归。
 */

import { QimenChart } from '3meta';
import type { ToolEnvelope, ExportSnapshot } from './baseTypes';

// ─── 简化 fallback 数据（与旧 engine 一致）───
const PALACES = ['坎', '坤', '震', '巽', '中', '乾', '兑', '艮', '离'];
const PALACE_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const DOORS = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'];
const STARS = ['天蓬', '天任', '天冲', '天辅', '天英', '天芮', '天柱', '天心', '天禽'];
const GODS = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
const DOOR_LUCK: Record<string, string> = { 休门: '吉', 生门: '大吉', 开门: '吉', 伤门: '凶', 杜门: '凶', 景门: '中平', 死门: '大凶', 惊门: '凶' };
const STAR_LUCK: Record<string, string> = { 天心: '大吉', 天任: '吉', 天辅: '吉', 天禽: '吉', 天蓬: '凶', 天芮: '凶', 天柱: '凶', 天冲: '中平', 天英: '中平' };
const GOD_LUCK: Record<string, string> = { 值符: '大吉', 太阴: '吉', 六合: '吉', 九天: '吉', 腾蛇: '凶', 白虎: '凶', 玄武: '凶', 九地: '中平' };

export interface QimenBirth {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
}

export interface QimenInput {
  birth: QimenBirth;
  question?: string;
}

export interface QimenPalace {
  position: number;
  trigram: string;
  palace: string;
  palaceNum: number;
  gate: string;
  gateLuck: string;
  star: string;
  starLuck: string;
  deity: string;
  godLuck: string;
  heavenlyStem: string;
  earthlyStem: string;
  earthBranch: string;
  fiveElements: string;
  status: { star: string; gate: string } | null;
  innerOuter: string;
  voidness: { hasVoidness: boolean; voidInPalace: string[] } | null;
  isZhiFu: boolean;
  isZhiShi: boolean;
  horse: boolean;
  auspiciousPatterns: string[];
  inauspiciousPatterns: string[];
  tenStemResponse: { heavenlyToEarthly: string; timeToDay: string } | null;
}

export interface QimenResult {
  engineName: string;
  mode: 'local-exact' | 'local-approx';
  version: string;
  confidenceNote: string;
  sourceProject?: string;
  license?: string;
  birthInfo: { year: number; month: number; day: number; hour: number; minute?: number };
  timeInfo: { yearGZ: string; monthGZ: string; dayGZ: string; hourGZ: string } | null;
  dun: string;
  ju: string;
  yuan: string;
  season: string;
  monthElement: string;
  zhiFu: { star: string; position: number; heavenlyStem?: string } | null;
  zhiShi: { gate: string; position: number } | null;
  palaces: QimenPalace[];
  auspiciousPatterns: string[];
  inauspiciousPatterns: string[];
  summary: string;
  /** 求测事项（透传，供报告引用） */
  question?: string;
  _is3meta: boolean;
}

// ─── 3meta 真实排盘 ───
interface ThreeMetaPalace {
  position: number;
  trigram: string;
  gate: string | string[];
  gatePressure?: string;
  star: string | string[];
  deity: string | string[];
  heavenlyStem: string | string[];
  earthlyStem: string | string[];
  earthBranch: string | string[];
  fiveElements?: string;
  status?: { star?: string; gate?: string };
  innerOuter?: string;
  voidness?: { hasVoidness?: boolean; voidInPalace?: string[] };
  isZhiFu?: boolean;
  isZhiShi?: boolean;
  isPostHorse?: boolean;
  auspiciousPatterns?: Array<{ name?: string; type?: string }>;
  inauspiciousPatterns?: Array<{ name?: string; type?: string }>;
  tenStemResponse?: {
    heavenlyToEarthly?: { description?: string };
    timeToDay?: { description?: string };
  };
}
interface ThreeMetaChart {
  palaces: ThreeMetaPalace[];
  ju?: { type: string; number: number };
  yuan?: string;
  season?: string;
  monthElement?: string;
  zhiFu?: { star: string; position: number; heavenlyStem?: string };
  zhiShi?: { gate: string; position: number };
  postHorse?: unknown;
  fourPillars?: {
    year: { stem: string; branch: string };
    month: { stem: string; branch: string };
    day: { stem: string; branch: string };
    hour: { stem: string; branch: string };
  };
  timeInfo?: unknown;
  specialPatterns?: {
    auspiciousPatterns?: Array<{ name?: string; type?: string }>;
    inauspiciousPatterns?: Array<{ name?: string; type?: string }>;
    menPo?: unknown;
    wuBuYuShi?: unknown;
  };
}

function arrToStr(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v.join('+');
  return v || '';
}

function getGateLuck(gate: string | string[], pressure?: string): string {
  if (typeof gate !== 'string') return '中平';
  const luck = DOOR_LUCK[gate] || '中平';
  if (pressure === '迫') return '凶';
  return luck;
}
function getStarLuck(star: string | string[]): string {
  if (Array.isArray(star)) return star.map((s) => STAR_LUCK[s] || '中平').join('/');
  return STAR_LUCK[star] || '中平';
}
function getGodLuck(deity: string | string[]): string {
  if (typeof deity !== 'string') return '中平';
  return GOD_LUCK[deity] || '中平';
}

function buildPalacesFrom3meta(chart: ThreeMetaChart): QimenPalace[] {
  return chart.palaces.map((p) => ({
    position: p.position,
    trigram: p.trigram,
    palaceNum: p.position,
    palace: p.trigram,
    gate: typeof p.gate === 'string' ? p.gate : '无门',
    gateLuck: getGateLuck(p.gate, p.gatePressure),
    star: arrToStr(p.star),
    starLuck: getStarLuck(p.star),
    deity: typeof p.deity === 'string' ? p.deity : '无神',
    godLuck: getGodLuck(p.deity),
    heavenlyStem: arrToStr(p.heavenlyStem),
    earthlyStem: arrToStr(p.earthlyStem),
    earthBranch: arrToStr(p.earthBranch),
    fiveElements: p.fiveElements || '',
    status: p.status ? { star: p.status.star || '', gate: p.status.gate || '' } : null,
    innerOuter: p.innerOuter || '',
    voidness: p.voidness ? { hasVoidness: !!p.voidness.hasVoidness, voidInPalace: p.voidness.voidInPalace || [] } : null,
    isZhiFu: !!p.isZhiFu,
    isZhiShi: !!p.isZhiShi,
    horse: !!p.isPostHorse,
    auspiciousPatterns: (p.auspiciousPatterns || []).map((a) => a.name || a.type || ''),
    inauspiciousPatterns: (p.inauspiciousPatterns || []).map((a) => a.name || a.type || ''),
    tenStemResponse: p.tenStemResponse ? {
      heavenlyToEarthly: p.tenStemResponse.heavenlyToEarthly?.description || '',
      timeToDay: p.tenStemResponse.timeToDay?.description || '',
    } : null,
  }));
}

function calculateWith3meta(year: number, month: number, day: number, hour: number, minute: number, question: string): QimenResult {
  const datetime = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute || 0).padStart(2, '0')}:00`;
  const chart = QimenChart.byDatetime(datetime) as ThreeMetaChart;
  const palaces = buildPalacesFrom3meta(chart);
  const specialPatterns = chart.specialPatterns || {};
  const auspicious = specialPatterns.auspiciousPatterns || [];
  const inauspicious = specialPatterns.inauspiciousPatterns || [];
  const fp = chart.fourPillars;

  return {
    engineName: 'Qimen3metaAdapter',
    mode: 'local-exact',
    version: '3meta@2.6.0',
    confidenceNote: '本解读包含三奇六仪、九星、八门、八神、值符值使、空亡、马星及格局等内容。不同流派在起局和格局解读上可能存在差异，宜结合所问事项参考。',
    sourceProject: '3metaJun/3meta (MIT)',
    license: 'MIT',
    birthInfo: { year, month, day, hour, minute },
    timeInfo: chart.timeInfo && fp ? {
      yearGZ: fp.year.stem + fp.year.branch,
      monthGZ: fp.month.stem + fp.month.branch,
      dayGZ: fp.day.stem + fp.day.branch,
      hourGZ: fp.hour.stem + fp.hour.branch,
    } : null,
    dun: chart.ju ? chart.ju.type : '',
    ju: chart.ju ? chart.ju.number + '局' : '',
    yuan: chart.yuan || '',
    season: chart.season || '',
    monthElement: chart.monthElement || '',
    zhiFu: chart.zhiFu ? { star: chart.zhiFu.star, position: chart.zhiFu.position, heavenlyStem: chart.zhiFu.heavenlyStem } : null,
    zhiShi: chart.zhiShi ? { gate: chart.zhiShi.gate, position: chart.zhiShi.position } : null,
    palaces,
    auspiciousPatterns: auspicious.map((a) => a.name || a.type || ''),
    inauspiciousPatterns: inauspicious.map((a) => a.name || a.type || ''),
    summary: (chart.ju ? chart.ju.type + chart.ju.number + '局' : '') +
      '，值符' + (chart.zhiFu ? chart.zhiFu.star : '') +
      '、值使' + (chart.zhiShi ? chart.zhiShi.gate : '') +
      '。吉格' + auspicious.length + '、凶格' + inauspicious.length + '。',
    question: question || '',
    _is3meta: true,
  };
}

// ─── 简化 fallback（与旧 calculateSimplified 一致）───
function calculateSimplified(year: number, month: number, day: number, hour: number, question: string): QimenResult {
  const juNum = ((year + month + day + hour) % 9) + 1;
  const dun = month >= 5 && month <= 10 ? '阴遁' : '阳遁';
  const seed = (year * 1000 + month * 100 + day * 10 + hour) % 8;

  const doorArr: Array<{ palace: string; palaceNum: number; door: string; luck: string }> = [];
  const starArr: Array<{ palace: string; star: string; luck: string }> = [];
  const godArr: Array<{ palace: string; god: string; luck: string }> = [];
  let palaceIdx = 0;
  for (let i = 0; i < 8; i++) {
    while (palaceIdx === 4) palaceIdx++;
    doorArr.push({ palace: PALACES[palaceIdx], palaceNum: PALACE_NUMS[palaceIdx], door: DOORS[(seed + i) % 8], luck: DOOR_LUCK[DOORS[(seed + i) % 8]] || '中平' });
    palaceIdx++;
  }
  palaceIdx = 0;
  const starSeed = (seed + 3) % 9;
  for (let j = 0; j < 8; j++) {
    while (palaceIdx === 4) palaceIdx++;
    starArr.push({ palace: PALACES[palaceIdx], star: STARS[(starSeed + j) % 9], luck: STAR_LUCK[STARS[(starSeed + j) % 9]] || '中平' });
    palaceIdx++;
  }
  palaceIdx = 0;
  const godSeed = (seed + 5) % 8;
  for (let k = 0; k < 8; k++) {
    while (palaceIdx === 4) palaceIdx++;
    godArr.push({ palace: PALACES[palaceIdx], god: GODS[(godSeed + k) % 8], luck: GOD_LUCK[GODS[(godSeed + k) % 8]] || '中平' });
    palaceIdx++;
  }

  const palaces: QimenPalace[] = doorArr.map((d, i) => ({
    position: d.palaceNum, trigram: d.palace, palace: d.palace, palaceNum: d.palaceNum,
    gate: d.door, gateLuck: d.luck,
    star: starArr[i] ? starArr[i].star : '', starLuck: starArr[i] ? starArr[i].luck : '',
    deity: godArr[i] ? godArr[i].god : '', godLuck: godArr[i] ? godArr[i].luck : '',
    heavenlyStem: '', earthlyStem: '', earthBranch: '',
    fiveElements: '', status: null, innerOuter: '', voidness: null,
    isZhiFu: i === 0, isZhiShi: i === 0, horse: false,
    auspiciousPatterns: [], inauspiciousPatterns: [], tenStemResponse: null,
  }));

  return {
    engineName: 'LocalQimenSimplifiedAdapter',
    mode: 'local-approx',
    version: '1.0.0',
    confidenceNote: '当前结果以年月日时排出局式，并展示八门、九星与八神分布，适合作为传统文化学习参考。',
    sourceProject: 'local:qimenEngine.ts',
    license: 'project-local',
    birthInfo: { year, month, day, hour },
    timeInfo: null,
    dun,
    ju: juNum + '局',
    yuan: '', season: '', monthElement: '',
    zhiFu: { star: starArr[0] ? starArr[0].star : '天心', position: 1 },
    zhiShi: { gate: doorArr[0] ? doorArr[0].door : '休门', position: 1 },
    palaces,
    auspiciousPatterns: [],
    inauspiciousPatterns: [],
    summary: dun + juNum + '局，值符' + (starArr[0] ? starArr[0].star : '') + '、值使' + (doorArr[0] ? doorArr[0].door : '') + '。简化排盘。',
    question: question || '',
    _is3meta: false,
  };
}

// ─── 主入口 ───
export function calculateQimen(input: QimenInput): QimenResult {
  const birth = input.birth || ({} as QimenBirth);
  const year = birth.year || 1990;
  const month = birth.month || 1;
  const day = birth.day || 1;
  const hour = birth.hour || 0;
  const minute = birth.minute || 0;
  const question = input.question || '';

  try {
    return calculateWith3meta(year, month, day, hour, minute, question);
  } catch {
    return calculateSimplified(year, month, day, hour, question);
  }
}

// ─── ToolEnvelope 适配 ───
export interface QimenData extends QimenResult {
  export_snapshot: ExportSnapshot;
}

export function calcQimenEnveloped(input: QimenInput): ToolEnvelope<QimenData> {
  const result = calculateQimen(input);
  const zhiFuStar = result.zhiFu?.star || '未知';
  const zhiShiGate = result.zhiShi?.gate || '未知';
  const palaceDesc = result.palaces.slice(0, 9).map((p) => `${p.trigram}宫(${p.position}):门${p.gate}/${p.star}/神${p.deity}`).join('；');

  const snapshot: ExportSnapshot = {
    summary: result.summary,
    tags: ['奇门遁甲', result.dun, result.ju, '值符' + zhiFuStar, '值使' + zhiShiGate],
    sections: [
      { heading: '遁局', body: `${result.dun}${result.ju}，${result.yuan || ''}${result.season ? '·' + result.season : ''}。月令五行：${result.monthElement || '未知'}。` },
      { heading: '值符值使', body: `值符${zhiFuStar}（${result.zhiFu?.position || '?'}宫），值使${zhiShiGate}（${result.zhiShi?.position || '?'}宫）。` },
      { heading: '九宫分布', body: palaceDesc + '。' },
      { heading: '格局', body: `吉格${result.auspiciousPatterns.length}：${result.auspiciousPatterns.join('、') || '无'}；凶格${result.inauspiciousPatterns.length}：${result.inauspiciousPatterns.join('、') || '无'}。` },
      { heading: '四柱', body: result.timeInfo ? `${result.timeInfo.yearGZ}年 ${result.timeInfo.monthGZ}月 ${result.timeInfo.dayGZ}日 ${result.timeInfo.hourGZ}时` : '当前时刻信息暂未齐备。' },
      { heading: '使用提醒', body: '本局依传统奇门遁甲规则整理，适合用于传统文化学习与自我观察，不作为现实决策依据。' },
    ],
    sourceNotes: '传统奇门遁甲参考。',
  };

  return {
    ok: true,
    tool: result.engineName,
    version: result.version,
    input_normalized: input as unknown as Record<string, unknown>,
    data: { ...result, export_snapshot: snapshot },
    warnings: [result.confidenceNote, ...(result.mode === 'local-approx' ? ['当前局式仅作传统文化参考'] : [])],
  };
}
