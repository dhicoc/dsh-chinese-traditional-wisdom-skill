/**
 * marriageCombo — 合婚 / 配对联合分析（combo 新类型）
 *
 * 输入双方出生信息（+可选姓名），整合：
 * - 八字日柱/日主/五行 + 干支冲合（六冲/六合/三合/相害/相刑/天干五合/相冲）
 * - 用神互补（双方喜用神是否互补对方五行）
 * - 紫微轻量对照（命宫/夫妻宫主星互照）
 * - 姓名匹配（双方姓名五行相生相克 + 五格评分对照）
 * - 婚房风水建议（双方命卦 → 东四/西四宅匹配 + 吉方）
 * - 吉日推荐（zeri purpose=嫁娶，避开双方日柱冲 + 太岁三煞）
 *
 * 适配婚恋 / 合伙 / 合作三类关系（解读文案中性，不预设性别）。
 */

import type { ToolEnvelope, ExportSnapshot, Tone } from './baseTypes';
import { calcBaziEnveloped, type BaziResult, type BaziBirth } from './baziEngine';
import { calcXiYongEnveloped } from './envelopeAdapters';
import { calcNameRatingEnveloped } from './envelopeAdapters';
import { getZiweiHoroscopeSummary } from './ziweiEngine';
import { calcMingGua, getPersonalDirections } from './bazhaiHouse';
import { calcZeriCombo, type ZeriPurpose } from './comboEngine';
import { calcTaisui } from './taisuiEngine';
import {
  relationBetweenPillars,
  relationScore,
  isChong,
  type ChongHeRelation,
} from './ganZhiChongHe';

// ─── 类型 ─────────────────────────────────────────────

export type MarriageScene = '婚恋' | '合伙' | '合作';

export interface PersonInput {
  birth: BaziBirth;
  /** 姓氏（可选，用于姓名匹配） */
  surname?: string;
  /** 名字（可选） */
  givenName?: string;
  /** 称谓，如"男方/女方"、"甲方/乙方" */
  label?: string;
  solar?: unknown;
}

export interface MarriageComboInput {
  personA: PersonInput;
  personB: PersonInput;
  scene?: MarriageScene;
  /** 择吉日的目标年份（默认双方 birth 较大年或当前年） */
  targetYear?: number;
  /** 关系用途描述（用于择日 purpose） */
  purpose?: ZeriPurpose;
}

export interface PersonSummary {
  label: string;
  dayGanZhi: string; // 日柱
  dayMaster: string; // 日主天干
  dayMasterWuxing: string; // 日主五行
  elements: Record<string, number>; // 五行计数
  xiyongShen: string; // 喜用神五行
  mingGua: { trigram: string; group: string }; // 命卦
  nameScore?: number; // 姓名评分
  nameGrade?: string;
  ziweiMingStars: string[]; // 紫微命宫主星
}

export interface ChongHeScanItem {
  pillar: string; // 年柱/月柱/日柱/时柱
  aGanZhi: string;
  bGanZhi: string;
  relation: ChongHeRelation;
  score: number;
  note: string; // 文字说明
}

export interface MarriageResult {
  comboName: string;
  purpose: string;
  scene: MarriageScene;
  personA: PersonSummary;
  personB: PersonSummary;
  /** 五行互补度 0-100 */
  wuxingComplement: number;
  /** 冲合总分（正为吉，负为凶） */
  chongHeTotalScore: number;
  /** 逐柱冲合扫描 */
  chongHeScan: ChongHeScanItem[];
  /** 姓名匹配度 0-100（未提供姓名时 null） */
  nameMatch: number | null;
  /** 紫微合盘对照摘要 */
  ziweiCompare: string;
  /** 综合契合度 0-100 */
  overallScore: number;
  grade: string; // 上上/上吉/中吉/中平/中下/下下
  synthesis: string;
  recommendations: { label: string; value: string; tone: Tone }[];
  /** 婚房/办公风水建议 */
  fengshuiAdvice: string;
  /** 吉日推荐（zeri 嫁娶/开市） */
  auspiciousDays: string[];
  export_snapshot: ExportSnapshot;
  engineName: string;
  mode: string;
  confidenceNote: string;
}

// ─── 辅助 ─────────────────────────────────────────────

const WUXING_SHENG: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const WUXING_KE: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

function gradeFromScore(score: number): string {
  if (score >= 90) return '上上';
  if (score >= 80) return '上吉';
  if (score >= 70) return '中吉';
  if (score >= 60) return '中平';
  if (score >= 50) return '中下';
  return '下下';
}

function toneFromScore(score: number): Tone {
  if (score >= 70) return '吉';
  if (score < 50) return '凶';
  return '中';
}

function pillarGanZhi(p: { stem: string; branch: string }): string {
  return `${p.stem}${p.branch}`;
}

const PILLAR_KEYS = ['year', 'month', 'day', 'hour'] as const;
const PILLAR_NAMES: Record<string, string> = { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' };

function relationNote(rel: ChongHeRelation): string {
  const parts: string[] = [];
  if (rel.ganHe) parts.push('天干五合（吉）');
  if (rel.liuHe) parts.push('地支六合（吉）');
  if (rel.sanHe) parts.push('三合局（吉）');
  if (rel.ganChong) parts.push('天干相冲（凶）');
  if (rel.chong) parts.push('六冲（凶）');
  if (rel.hai) parts.push('相害（凶）');
  if (rel.xing) parts.push('相刑（凶）');
  return parts.length ? parts.join('、') : '无明显冲合';
}

// ─── 主函数 ─────────────────────────────────────────────

export async function calcMarriageCombo(input: MarriageComboInput): Promise<ToolEnvelope<MarriageResult>> {
  const scene = input.scene ?? '婚恋';
  const { personA, personB } = input;

  // ── 双方八字 ──
  const baziA = calcBaziEnveloped({ birth: personA.birth, solar: (personA.solar ?? null) as never });
  const baziB = calcBaziEnveloped({ birth: personB.birth, solar: (personB.solar ?? null) as never });
  const bA = baziA.data as BaziResult;
  const bB = baziB.data as BaziResult;

  // ── 双方喜用神（calcXiYongEnveloped 入参为 日主五行 + 五行计数）──
  const xiyongA = calcXiYongEnveloped(bA.dayMasterWuxing, bA.elements);
  const xiyongB = calcXiYongEnveloped(bB.dayMasterWuxing, bB.elements);
  const shenA = (xiyongA.data as { shen?: string }).shen ?? '';
  const shenB = (xiyongB.data as { shen?: string }).shen ?? '';

  // ── 双方命卦 ──
  const guaA = calcMingGua(personA.birth.year, personA.birth.gender ?? '男');
  const guaB = calcMingGua(personB.birth.year, personB.birth.gender ?? '男');

  // ── 双方紫微（命宫主星轻量对照；夫妻宫需完整 palaces，超出轻量范围）──
  const zwA = getZiweiHoroscopeSummary(
    { year: personA.birth.year, month: personA.birth.month, day: personA.birth.day, hour: personA.birth.hour, gender: (personA.birth.gender ?? '男') as '男' | '女' },
    input.targetYear ?? personA.birth.year,
    7,
  );
  const zwB = getZiweiHoroscopeSummary(
    { year: personB.birth.year, month: personB.birth.month, day: personB.birth.day, hour: personB.birth.hour, gender: (personB.birth.gender ?? '男') as '男' | '女' },
    input.targetYear ?? personB.birth.year,
    7,
  );

  // ── 双方姓名评分（可选）──
  let nameScoreA: number | undefined;
  let nameGradeA: string | undefined;
  let nameScoreB: number | undefined;
  let nameGradeB: string | undefined;
  if (personA.surname && personA.givenName) {
    const nr = await calcNameRatingEnveloped(personA.surname, personA.givenName, personA.birth.year, { ...personA.birth, gender: personA.birth.gender ?? '男' }, personA.solar as never);
    nameScoreA = (nr.data as { totalScore?: number }).totalScore;
    nameGradeA = (nr.data as { grade?: string }).grade;
  }
  if (personB.surname && personB.givenName) {
    const nr = await calcNameRatingEnveloped(personB.surname, personB.givenName, personB.birth.year, { ...personB.birth, gender: personB.birth.gender ?? '男' }, personB.solar as never);
    nameScoreB = (nr.data as { totalScore?: number }).totalScore;
    nameGradeB = (nr.data as { grade?: string }).grade;
  }

  const labelA = personA.label ?? '甲方';
  const labelB = personB.label ?? '乙方';

  const personSummaryA: PersonSummary = {
    label: labelA,
    dayGanZhi: pillarGanZhi(bA.pillars.day),
    dayMaster: bA.dayMaster,
    dayMasterWuxing: bA.dayMasterWuxing,
    elements: bA.elements,
    xiyongShen: shenA,
    mingGua: { trigram: guaA.trigram, group: guaA.group },
    nameScore: nameScoreA,
    nameGrade: nameGradeA,
    ziweiMingStars: zwA.mingMainStars,
  };
  const personSummaryB: PersonSummary = {
    label: labelB,
    dayGanZhi: pillarGanZhi(bB.pillars.day),
    dayMaster: bB.dayMaster,
    dayMasterWuxing: bB.dayMasterWuxing,
    elements: bB.elements,
    xiyongShen: shenB,
    mingGua: { trigram: guaB.trigram, group: guaB.group },
    nameScore: nameScoreB,
    nameGrade: nameGradeB,
    ziweiMingStars: zwB.mingMainStars,
  };

  // ── 逐柱冲合扫描 ──
  const chongHeScan: ChongHeScanItem[] = PILLAR_KEYS.map((k) => {
    const aGZ = pillarGanZhi(bA.pillars[k]);
    const bGZ = pillarGanZhi(bB.pillars[k]);
    const rel = relationBetweenPillars(aGZ, bGZ);
    const score = relationScore(rel);
    return { pillar: PILLAR_NAMES[k], aGanZhi: aGZ, bGanZhi: bGZ, relation: rel, score, note: relationNote(rel) };
  });
  // 日柱权重最大（日柱代表本人与配偶宫）
  const chongHeTotalScore = chongHeScan.reduce((sum, item) => sum + item.score * (item.pillar === '日柱' ? 3 : 1), 0);

  // ── 五行互补度 ──
  // 逻辑：A 的喜用神五行是否在 B 的五行里偏多（B 能补 A），反之亦然；+ 日主五行相生相克
  function wuxingComplementCalc(): number {
    let score = 50; // 基础分
    const elA = bA.elements;
    const elB = bB.elements;
    // A 的用神在 B 的五行中是否充足
    if (shenA && elB[shenA] !== undefined) {
      score += Math.min(20, (elB[shenA] ?? 0) * 5);
    }
    if (shenB && elA[shenB] !== undefined) {
      score += Math.min(20, (elA[shenB] ?? 0) * 5);
    }
    // 日主五行关系：相生 +10，比和 +5，相克 -10
    const dmA = bA.dayMasterWuxing;
    const dmB = bB.dayMasterWuxing;
    if (WUXING_SHENG[dmA] === dmB || WUXING_SHENG[dmB] === dmA) score += 10;
    else if (dmA === dmB) score += 5;
    else if (WUXING_KE[dmA] === dmB || WUXING_KE[dmB] === dmA) score -= 10;
    return Math.max(0, Math.min(100, score));
  }
  const wuxingComplement = wuxingComplementCalc();

  // ── 姓名匹配度 ──
  function nameMatchCalc(): number | null {
    if (nameScoreA === undefined || nameScoreB === undefined) return null;
    // 双方姓名评分均值 + 日主五行相生相克微调
    const avg = (nameScoreA + nameScoreB) / 2;
    let adj = 0;
    const dmA = bA.dayMasterWuxing;
    const dmB = bB.dayMasterWuxing;
    if (WUXING_SHENG[dmA] === dmB || WUXING_SHENG[dmB] === dmA) adj = 5;
    else if (WUXING_KE[dmA] === dmB || WUXING_KE[dmB] === dmA) adj = -5;
    return Math.max(0, Math.min(100, Math.round(avg + adj)));
  }
  const nameMatch = nameMatchCalc();

  // ── 紫微合盘对照（轻量：命宫主星互照）──
  const zwCompareParts: string[] = [];
  if (zwA.available && zwB.available) {
    zwCompareParts.push(`${labelA}命宫${zwA.mingMainStars.join('、') || '无主星'}`);
    zwCompareParts.push(`${labelB}命宫${zwB.mingMainStars.join('、') || '无主星'}`);
    // 双方命宫主星是否有相同星曜（性格底色共鸣）
    const overlap = zwA.mingMainStars.filter((s) => zwB.mingMainStars.includes(s));
    if (overlap.length) zwCompareParts.push(`双方命宫共${overlap.join('、')}，性格底色有共鸣`);
    else zwCompareParts.push('双方命宫主星不同，性格互补为主');
  } else {
    zwCompareParts.push('暂未取得紫微命宫主星资料，本次以八字、五行、姓名与命卦信息为主参看');
  }
  const ziweiCompare = zwCompareParts.join('；') + '。';

  // ── 综合契合度 ──
  // 权重：冲合 35% + 五行互补 30% + 姓名 20%（无姓名则分给五行）+ 紫微 15%
  let overall = 0;
  // 冲合分映射到 0-100（score 范围约 -30~30 → 映射）
  const chongHeNorm = Math.max(0, Math.min(100, 50 + chongHeTotalScore * 2));
  overall += chongHeNorm * 0.35;
  overall += wuxingComplement * 0.3;
  if (nameMatch !== null) {
    overall += nameMatch * 0.2;
    overall += (zwA.available && zwB.available ? 60 : 50) * 0.15;
  } else {
    overall += wuxingComplement * 0.2; // 无姓名，权重转给五行
    overall += (zwA.available && zwB.available ? 60 : 50) * 0.15;
  }
  const overallScore = Math.round(Math.max(0, Math.min(100, overall)));
  const grade = gradeFromScore(overallScore);
  const overallTone = toneFromScore(overallScore);

  // ── 风水建议 ──
  const sameGroup = guaA.group === guaB.group;
  const fengshuiAdvice = sameGroup
    ? `双方命卦同属${guaA.group}（${guaA.trigram}/${guaB.trigram}），宅命相配，婚房/办公宜选${guaA.group}宅（${guaA.group === '东四命' ? '东/东南/南/北' : '西/西北/西南/东北'}方位）。`
    : `双方命卦分属${guaA.group}（${guaA.trigram}）与${guaB.group}（${guaB.trigram}），宅命不完全相配，婚房宜以${guaA.group === '东四命' ? '东四宅' : '西四宅'}为主，兼顾另一方用门主灶方位调和。吉方：${getPersonalDirections(guaA.trigram)?.auspicious.map((d) => d.direction).slice(0, 2).join('、') ?? '未知'}。`;

  // ── 吉日推荐（zeri 嫁娶/开市）──
  const purpose: ZeriPurpose = input.purpose ?? (scene === '婚恋' ? '结婚' : '开业');
  const taisui = calcTaisui(input.targetYear ?? personA.birth.year);
  let auspiciousDays: string[] = [];
  try {
    const zeri = calcZeriCombo({
      birth: personA.birth,
      solar: (personA.solar ?? null) as never,
      purpose,
      targetYear: input.targetYear,
    } as never);
    const zData = zeri.data as { recommendedDays?: { date?: string; reason?: string }[] };
    auspiciousDays = (zData.recommendedDays ?? []).slice(0, 3).map((d) => `${d.date ?? ''}${d.reason ? '（' + d.reason + '）' : ''}`);
  } catch {
    auspiciousDays = ['择日数据不可用'];
  }

  // ── 综合结论 ──
  const dayChong = chongHeScan.find((s) => s.pillar === '日柱');
  const synthesis = `${scene}配对：${labelA}（日柱${personSummaryA.dayGanZhi}，日主${bA.dayMaster}${bA.dayMasterWuxing}，用神${shenA || '未知'}）与${labelB}（日柱${personSummaryB.dayGanZhi}，日主${bB.dayMaster}${bB.dayMasterWuxing}，用神${shenB || '未知'}）。` +
    `日柱${dayChong?.note ?? '无明显冲合'}。五行互补度${wuxingComplement}，${nameMatch !== null ? `姓名匹配度${nameMatch}，` : ''}综合契合度${overallScore}（${grade}）。` +
    `${sameGroup ? '宅命相配。' : '宅命需调和。'}${zwA.available ? '紫微合盘可对照。' : ''}`;

  // ── 建议 ──
  const recommendations: MarriageResult['recommendations'] = [];
  if (overallScore >= 70) {
    recommendations.push({ label: '总体契合', value: `综合契合度${overallScore}（${grade}），多方术数显示相配，宜积极推进${scene === '婚恋' ? '婚恋' : '合作'}。`, tone: '吉' });
  } else if (overallScore < 50) {
    recommendations.push({ label: '总体谨慎', value: `综合契合度${overallScore}（${grade}），冲合或五行互补欠佳，宜慎重考量、多接触磨合再做决定。`, tone: '凶' });
  } else {
    recommendations.push({ label: '总体中平', value: `综合契合度${overallScore}（${grade}），有利有弊，需结合现实基础与相处磨合综合判断。`, tone: '中' });
  }
  if (dayChong && dayChong.relation.chong) {
    recommendations.push({ label: '日柱相冲', value: `日柱${personSummaryA.dayGanZhi}与${personSummaryB.dayGanZhi}六冲，夫妻宫/合伙根基易有冲突，需多包容沟通。`, tone: '凶' });
  }
  if (dayChong && (dayChong.relation.liuHe || dayChong.relation.ganHe)) {
    recommendations.push({ label: '日柱相合', value: `日柱${personSummaryA.dayGanZhi}与${personSummaryB.dayGanZhi}天合地合，根基稳固，易相互吸引。`, tone: '吉' });
  }
  if (wuxingComplement >= 70) {
    recommendations.push({ label: '五行互补', value: '双方五行与用神互补良好，相处中能彼此补益。', tone: '吉' });
  }
  recommendations.push({ label: '风水建议', value: fengshuiAdvice, tone: '中' });
  if (auspiciousDays.length && auspiciousDays[0] !== '择日数据不可用') {
    recommendations.push({ label: '吉日推荐', value: `${purpose}吉日：${auspiciousDays.join('；')}。`, tone: '吉' });
  }
  void taisui;

  // ── export_snapshot ──
  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: [scene as string, `契合${grade}`, `日柱${dayChong?.note ?? '无明显冲合'}`, `五行互补${wuxingComplement}`],
    sections: [
      { heading: '双方概览', body: `${labelA}：日柱${personSummaryA.dayGanZhi}，日主${bA.dayMaster}${bA.dayMasterWuxing}，用神${shenA || '未知'}，命卦${guaA.trigram}（${guaA.group}）${nameScoreA !== undefined ? `，姓名${nameScoreA}（${nameGradeA}）` : ''}。${labelB}：日柱${personSummaryB.dayGanZhi}，日主${bB.dayMaster}${bB.dayMasterWuxing}，用神${shenB || '未知'}，命卦${guaB.trigram}（${guaB.group}）${nameScoreB !== undefined ? `，姓名${nameScoreB}（${nameGradeB}）` : ''}。` },
      { heading: '五行互补度', body: `互补度${wuxingComplement}/100。A用神${shenA || '未知'}在B五行中${shenA ? `${elCount(bB.elements, shenA)}个` : '未知'}，B用神${shenB || '未知'}在A五行中${shenB ? `${elCount(bA.elements, shenB)}个` : '未知'}。日主五行${bA.dayMasterWuxing}与${bB.dayMasterWuxing}。` },
      { heading: '干支冲合', body: chongHeScan.map((s) => `${s.pillar}：${s.aGanZhi}↔${s.bGanZhi}，${s.note}（${s.score > 0 ? '+' : ''}${s.score}）`).join('；') + '。' },
      { heading: '紫微合盘', body: ziweiCompare },
      { heading: '姓名匹配', body: nameMatch !== null ? `双方姓名匹配度${nameMatch}/100（${nameGradeA}/${nameGradeB}）。` : '未提供姓名，跳过姓名匹配。' },
      { heading: '风水建议', body: fengshuiAdvice },
      { heading: '吉日推荐', body: auspiciousDays.length ? `${purpose}吉日：${auspiciousDays.join('；')}。` : '暂无。' },
      { heading: '综合评级', body: `综合契合度${overallScore}/100（${grade}）。` },
    ],
  };

  const result: MarriageResult = {
    comboName: scene === '婚恋' ? '合婚配对' : `${scene}配对`,
    purpose: scene + '配对联合分析',
    scene,
    personA: personSummaryA,
    personB: personSummaryB,
    wuxingComplement,
    chongHeTotalScore,
    chongHeScan,
    nameMatch,
    ziweiCompare,
    overallScore,
    grade,
    synthesis,
    recommendations,
    fengshuiAdvice,
    auspiciousDays,
    export_snapshot: snapshot,
    engineName: 'marriageCombo',
    mode: 'local-exact',
    confidenceNote: '本解读结合八字冲合、命卦、紫微与姓名等内容，宜结合双方实际相处情况参考。',
  };

  const warnings: string[] = [];
  if (!zwA.available || !zwB.available) warnings.push('紫微合盘信息暂未显示，请结合其他内容参考');
  if (nameMatch === null) warnings.push('未提供双方姓名，姓名匹配部分暂未显示');

  return {
    ok: true,
    tool: 'combo_marriage',
    version: '1.0.0',
    input_normalized: {
      personA: { birthYear: personA.birth.year, gender: personA.birth.gender, label: labelA },
      personB: { birthYear: personB.birth.year, gender: personB.birth.gender, label: labelB },
      scene,
    },
    data: result,
    summary: [synthesis],
    warnings,
  };
}

function elCount(elements: Record<string, number>, wuxing: string): number {
  return elements[wuxing] ?? 0;
}

// 抑制未使用导入告警（isChong 预留给未来逐项深查）
void isChong;
