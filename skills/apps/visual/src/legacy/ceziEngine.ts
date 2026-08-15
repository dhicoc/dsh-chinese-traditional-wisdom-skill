/**
 * ceziEngine — 测字（字占）引擎
 *
 * 输入一个字，分析：
 * - 笔画（康熙）+ 数理吉凶（81 数理表，复用 fate dayanList）
 * - 字义五行 + 字义本义（复用 kangxiStrokes / charMeanings）
 * - 字形结构 + 结构象义（charStructure）
 * - 偏旁部首象义（charStructure）
 * - 可选八字用神补益（传入 birth 时，判断该字五行是否补日主用神）
 *
 * 输出：吉凶定调 + 性格/事件预示 + 事业/感情影响 + 改字/起名建议
 */

import type { ToolEnvelope, ExportSnapshot, Tone } from './baseTypes';
import { getKangxiStrokes, getCharWuxing, getCharMeaning, estimateStrokes } from './nameStrokes';
import { analyzeCharStructure, type CharStructureInfo } from './charStructure';
import { calcBaziEnveloped, type BaziResult, type BaziBirth } from './baziEngine';
import { calcXiYongEnveloped } from './envelopeAdapters';

// 复用 nameWuxing 的 81 数理（这里重新声明最小结构避免循环依赖耦合）
import dayanList from './dayanList.json';

interface DaYan {
  number: number;
  lucky: string;
  skyNine: string;
  comment: string;
  femaleUnsuitable: boolean;
  maxLuck: boolean;
}
const DAYAN: DaYan[] = dayanList as DaYan[];

function dayanFind(n: number): DaYan {
  const idx = ((n - 1) % 81 + 81) % 81;
  return DAYAN[idx];
}

// ─── 类型 ─────────────────────────────────────────────

export interface CeziInput {
  /** 所测字（取首字） */
  char: string;
  /** 可选生辰（结合八字用神补益判断） */
  birth?: BaziBirth;
  /** 可选问题方向：事业/感情/财利/健康/综合 */
  aspect?: '事业' | '感情' | '财利' | '健康' | '综合';
  solar?: unknown;
}

export interface CeziResult {
  char: string;
  strokes: number;
  strokesEstimated: boolean;
  /** 笔画数理（81 数理） */
  shuli: { number: number; lucky: string; skyNine: string; comment: string };
  /** 字义五行 */
  charWuxing: string;
  /** 字义本义（说文/形声） */
  meaning: string;
  /** 字形结构 + 象义 */
  structure: CharStructureInfo;
  /** 八字用神补益（传入 birth 时） */
  baziComplement: { dayMaster: string; xiyongShen: string; complement: '补用神' | '生扶' | '克耗' | '无关系'; score: number; detail: string } | null;
  tone: Tone;
  /** 综合吉凶定调 */
  verdict: string;
  /** 性格/事件预示 */
  personality: string;
  /** 事业影响 */
  careerAdvice: string;
  /** 感情影响 */
  loveAdvice: string;
  /** 改字/起名建议 */
  nameAdvice: string;
  synthesis: string;
  export_snapshot: ExportSnapshot;
  engineName: string;
  mode: string;
  confidenceNote: string;
}

// ─── 辅助 ─────────────────────────────────────────────

const WUXING_SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const WUXING_KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

// 字义五行 → 偏旁象义兜底（单字偏旁识别有限时用五行补象）
const WUXING_SYMBOLISM: Record<string, string> = {
  木: '木主仁，主生长、条达、仁慈',
  火: '火主礼，主炎热、光明、急躁',
  土: '土主信，主承载、稳重、守信',
  金: '金主义，主刚毅、果决、肃杀',
  水: '水主智，主流动、智慧、变化',
};

/** 取偏旁象义：优先用偏旁表，未收录时用字义五行兜底 */
function radicalSymbolismFor(structure: CharStructureInfo, charWuxing: string): string {
  if (structure.radicalSymbolism && !structure.radicalSymbolism.includes('未收录')) return structure.radicalSymbolism;
  if (charWuxing && WUXING_SYMBOLISM[charWuxing]) return WUXING_SYMBOLISM[charWuxing];
  return '象义未明';
}

function toneFromLucky(lucky: string): Tone {
  if (lucky.includes('吉')) return '吉';
  if (lucky.includes('凶')) return '凶';
  return '中';
}

/** 字义五行 + 数理 + 结构 → 综合定调 */
function computeVerdict(strokes: number, charWuxing: string, shuliLucky: string, structure: CharStructureInfo): { tone: Tone; verdict: string } {
  const parts: string[] = [];
  let tone = toneFromLucky(shuliLucky);
  parts.push(`笔画${strokes}画，数理${shuliLucky}（${dayanFind(strokes).skyNine}）`);
  if (charWuxing) parts.push(`字义属${charWuxing}`);
  parts.push(`结构${structure.structure}（${structure.symbolism.split('，')[0]}）`);
  if (structure.radicalSymbolism && !structure.radicalSymbolism.includes('未收录')) {
    parts.push(`偏旁${structure.radical}：${structure.radicalSymbolism.split('，')[0]}`);
  } else if (charWuxing && WUXING_SYMBOLISM[charWuxing]) {
    parts.push(`五行${charWuxing}：${WUXING_SYMBOLISM[charWuxing].split('，')[0]}`);
  }
  // 结构吉凶微调：包围/独体偏守，左右/上下偏和
  if (tone === '中' && (structure.structure === '上下' || structure.structure === '左右' || structure.structure === '品字')) tone = '吉';
  const verdict = parts.join('；') + '。';
  return { tone, verdict };
}

/** 八字用神补益判断 */
function computeBaziComplement(charWuxing: string, birth: BaziBirth, solar: unknown): CeziResult['baziComplement'] {
  if (!charWuxing) return null;
  try {
    const baziEnv = calcBaziEnveloped({ birth, solar: (solar ?? null) as never });
    const bazi = baziEnv.data as BaziResult;
    const xyEnv = calcXiYongEnveloped(bazi.dayMasterWuxing, bazi.elements);
    const shen = (xyEnv.data as { shen?: string }).shen ?? '';
    if (!shen) return null;
    // 用神五行 == 字五行 → 补用神
    // 字五行生用神 / 用神生字五行 → 生扶
    // 字五行克用神 / 用神克字五行 → 克耗
    let complement: '补用神' | '生扶' | '克耗' | '无关系' = '无关系';
    let score = 50;
    let detail = '';
    if (charWuxing === shen) {
      complement = '补用神';
      score = 90;
      detail = `字义${charWuxing}与日主喜用神${shen}同行，直接补益用神，大吉`;
    } else if (WUXING_SHENG[charWuxing] === shen || WUXING_SHENG[shen] === charWuxing) {
      complement = '生扶';
      score = 75;
      detail = `字义${charWuxing}与用神${shen}相生，生扶用神，吉`;
    } else if (WUXING_KE[charWuxing] === shen || WUXING_KE[shen] === charWuxing) {
      complement = '克耗';
      score = 35;
      detail = `字义${charWuxing}与用神${shen}相克，克耗用神，不利`;
    } else {
      complement = '无关系';
      score = 55;
      detail = `字义${charWuxing}与用神${shen}比和无关，中性`;
    }
    return { dayMaster: bazi.dayMaster, xiyongShen: shen, complement, score, detail };
  } catch {
    return null;
  }
}

/** 性格/事件预示（字义 + 偏旁 + 结构综合） */
function computePersonality(char: string, structure: CharStructureInfo, charWuxing: string, meaning: string): string {
  const parts: string[] = [];
  if (meaning) parts.push(`字义本义：${meaning.slice(0, 60)}${meaning.length > 60 ? '…' : ''}`);
  if (structure.radicalSymbolism && !structure.radicalSymbolism.includes('未收录')) parts.push(`偏旁${structure.radical}主${structure.radicalSymbolism}`);
  else if (charWuxing && WUXING_SYMBOLISM[charWuxing]) parts.push(`五行属${charWuxing}，${WUXING_SYMBOLISM[charWuxing]}`);
  parts.push(`字形${structure.structure}，${structure.symbolism}`);
  if (charWuxing) parts.push(`五行属${charWuxing}，性格偏${wuxingPersonality(charWuxing)}`);
  return parts.join('；') + '。';
}

function wuxingPersonality(w: string): string {
  switch (w) {
    case '木': return '仁慈、向上、条达，亦可能固执';
    case '火': return '热情、急躁、光明，亦可能冲动';
    case '土': return '稳重、守信、包容，亦可能保守';
    case '金': return '果决、刚毅、正义，亦可能冷酷';
    case '水': return '智慧、灵活、柔韧，亦可能多虑';
    default: return '不明';
  }
}

// ─── 主函数 ─────────────────────────────────────────────

export async function calcCezi(input: CeziInput): Promise<CeziResult> {
  const char = (input.char ?? '').trim()[0] ?? '';
  const aspect = input.aspect ?? '综合';

  // 笔画
  let strokes = getKangxiStrokes(char);
  let estimated = false;
  if (strokes === null) {
    strokes = estimateStrokes(char);
    estimated = true;
  }

  // 数理
  const shuli = dayanFind(strokes);

  // 字义五行 + 本义
  const charWuxing = getCharWuxing(char);
  const meaning = await getCharMeaning(char);

  // 结构 + 偏旁
  const structure = analyzeCharStructure(char);

  // 八字补益
  const baziComplement = input.birth ? computeBaziComplement(charWuxing, input.birth, input.solar) : null;

  // 定调
  const { tone, verdict } = computeVerdict(strokes, charWuxing, shuli.lucky, structure);

  // 性格
  const personality = computePersonality(char, structure, charWuxing, meaning);

  // 事业/感情/改字建议
  const careerAdvice = adviceByAspect(aspect, '事业', tone, charWuxing, structure, baziComplement);
  const loveAdvice = adviceByAspect(aspect, '感情', tone, charWuxing, structure, baziComplement);
  const nameAdvice = computeNameAdvice(char, charWuxing, baziComplement, tone);

  // 综合
  const synthesis = `测「${char}」字：${verdict}` +
    (baziComplement ? ` 八字用神补益：${baziComplement.detail}。` : '') +
    `${aspect === '综合' ? '' : `问${aspect}，`}` + (tone === '吉' ? '总体偏吉，宜顺势而为。' : tone === '凶' ? '总体偏凶，宜慎重谨慎。' : '中性，吉凶参半，看后续用法。');

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['测字', char, `数理${shuli.lucky}`, charWuxing ? `属${charWuxing}` : '五行未录', structure.structure],
    sections: [
      { heading: '笔画数理', body: `${char}字康熙${strokes}画${estimated ? '（未收录，估算值）' : ''}，数理${shuli.lucky}（${shuli.skyNine}）：${shuli.comment}` },
      { heading: '字义五行', body: charWuxing ? `字义五行属${charWuxing}。${meaning ? `本义：${meaning.slice(0, 100)}${meaning.length > 100 ? '…' : ''}` : '字义未收录。'}` : '字义五行未收录，按笔画数理与结构断之。' },
      { heading: '字形结构', body: `结构：${structure.structure}（${structure.symbolism}）。偏旁${structure.radical}：${radicalSymbolismFor(structure, charWuxing)}` },
      ...(baziComplement ? [{ heading: '八字用神补益', body: `日主${baziComplement.dayMaster}，喜用神${baziComplement.xiyongShen}。${baziComplement.detail}（补益度${baziComplement.score}）` }] : []),
      { heading: '性格预示', body: personality },
      { heading: '事业影响', body: careerAdvice },
      { heading: '感情影响', body: loveAdvice },
      { heading: '改字/起名建议', body: nameAdvice },
      { heading: '综合定调', body: synthesis },
    ],
  };

  return {
    char,
    strokes,
    strokesEstimated: estimated,
    shuli: { number: shuli.number, lucky: shuli.lucky, skyNine: shuli.skyNine, comment: shuli.comment },
    charWuxing,
    meaning,
    structure,
    baziComplement,
    tone,
    verdict,
    personality,
    careerAdvice,
    loveAdvice,
    nameAdvice,
    synthesis,
    export_snapshot: snapshot,
    engineName: 'ceziEngine',
    mode: 'local-exact',
    confidenceNote: '本解读从笔画、数理、字形结构、字义五行与八字补益等角度综合参考。',
  };
}

function adviceByAspect(targetAspect: string, field: '事业' | '感情', tone: Tone, charWuxing: string, structure: CharStructureInfo, bazi: CeziResult['baziComplement']): string {
  // 问的方向与该字段一致时详述，否则简述
  const focused = targetAspect === field || targetAspect === '综合';
  const prefix = field === '事业' ? '事业' : '感情';
  if (tone === '吉') {
    let s = `${prefix}方面偏吉：`;
    if (field === '事业') s += structure.structure === '包围' ? '宜守成、稳进，不宜冒进开拓。' : structure.structure === '独体' ? '宜独立创业、单打独斗，不宜合伙。' : '宜顺水推舟，把握时机。';
    else s += structure.structure === '左右' || structure.structure === '上下' ? '阴阳调和，宜相互扶持。' : '缘分稳固，宜珍惜。';
    if (bazi && bazi.complement === '补用神') s += ` 字补用神，对你${prefix}尤利。`;
    return focused ? s : s.slice(0, s.indexOf('：') + 1) + '偏吉。';
  }
  if (tone === '凶') {
    let s = `${prefix}方面偏凶：`;
    if (field === '事业') s += structure.structure === '包围' ? '易受困受阻，宜守不宜攻，待时而动。' : structure.structure === '独体' ? '孤立无援，宜寻求合作。' : '宜谨慎，防口舌是非。';
    else s += structure.structure === '独体' ? '易孤单，宜主动结缘。' : '宜多包容沟通，防争执。';
    if (bazi && bazi.complement === '克耗') s += ` 字克耗用神，对你${prefix}不利，建议改字。`;
    return focused ? s : s.slice(0, s.indexOf('：') + 1) + '偏凶。';
  }
  return `${prefix}方面中性：吉凶参半，看个人修为与用法。`;
}

function computeNameAdvice(char: string, charWuxing: string, bazi: CeziResult['baziComplement'], tone: Tone): string {
  const parts: string[] = [];
  if (bazi) {
    if (bazi.complement === '补用神') parts.push(`该字${char}（${charWuxing}）正补你用神${bazi.xiyongShen}，起名/用字宜保留`);
    else if (bazi.complement === '克耗') parts.push(`该字${char}（${charWuxing}）克耗你用神${bazi.xiyongShen}，起名建议替换为属${bazi.xiyongShen}或生${bazi.xiyongShen}之字`);
    else parts.push(`该字${char}（${charWuxing}）与用神${bazi.xiyongShen}关系中性，起名可用但非最佳`);
  } else {
    parts.push('未提供生辰，无法判断用神补益；若用于起名，建议另结合八字喜用神分析');
  }
  if (tone === '凶') parts.push('数理偏凶，若用于姓名建议搭配吉理字或更换');
  else if (tone === '吉') parts.push('数理偏吉，宜入名');
  return parts.join('；') + '。';
}

// ─── enveloped 版本 ─────────────────────────────────────

export async function calcCeziEnveloped(input: CeziInput): Promise<ToolEnvelope<CeziResult>> {
  const result = await calcCezi(input);
  const warnings: string[] = [];
  if (result.strokesEstimated) warnings.push(`「${input.char}」未收录康熙笔画，已用估算值，数理仅供参考`);
  if (!result.charWuxing) warnings.push(`「${input.char}」未收录字义五行，五行维度降级`);
  if (!result.meaning) warnings.push(`「${input.char}」未收录字义本义`);
  if (input.birth && !result.baziComplement) warnings.push('八字用神补益计算失败，该维度降级');

  return {
    ok: true,
    tool: 'cast_cezi',
    version: '1.0.0',
    input_normalized: { char: input.char, aspect: input.aspect ?? '综合', hasBirth: Boolean(input.birth) },
    data: result,
    summary: [result.synthesis],
    warnings,
  };
}
