/**
 * comboEngine — 跨系统联合分析（ROADMAP 功能层增强 Step 1）
 *
 * 把多个纯 TS 引擎的结果聚合为联合分析，输出整合结论 + 各子系统依据 + 一致性检验。
 * 三个固化联合模块：
 *   1. calcAnnualFortuneCombo  年度综合运势 = 八字 + 五运六气 + 奇门 + 命卦方位
 *   2. calcDecisionCombo       事件决策 = 六爻 + 梅花 + 奇门（三卜交叉验证）
 *   3. calcSpaceTimeCombo      空间+时间 = 飞星 + 八宅命卦 + 奇门吉方
 *
 * 设计：
 * - 复用现有纯 TS enveloped 引擎，combo 层只聚合不重算。
 * - 一致性检验：各子系统吉凶定调映射到统一维度（吉/中/凶），比对同向性。
 * - 冲突时不强行统一，输出权衡提示。
 * - 返回 ToolEnvelope，data 含 subsystems + synthesis + consistency + recommendations。
 */

import type { ToolEnvelope, ExportSnapshot, Tone } from './baseTypes';
import { calcBaziEnveloped } from './baziEngine';
import { calcYunqiEnveloped } from './yunqiEngine';
import { calcQimenEnveloped } from './qimenEngine';
import { getZiweiHoroscopeSummary } from './ziweiEngine';
import { calcLiuyaoEnveloped } from './liuyaoEngine';
import { calcMeihuaEnveloped } from './meihuaEngine';
import { calcDaliurenEnveloped, type DaliurenSchool } from './daliurenEngine';
import { calcTaiyiEnveloped, type JiStyle as TaiyiJiStyle, type AcumYearMethod as TaiyiAcumYear } from './taiyiEngine';
import { calcMingGua, getPersonalDirections, combineBazhaiFeixing, type MingGua } from './bazhaiHouse';
import { getYuanYun, MING_GUA_DIRECTIONS } from './flyingStarRemedies';
import { calcTaisui } from './taisuiEngine';
import { queryJieqiWellness, type JieqiWellness } from './jieqiWellness';
import { getMeridianByHour, type MeridianHour } from './meridianClock';
import { getConstitutionTendency } from './constitutionTendency';

// ─── 公共类型 ───

interface BirthInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  gender?: string;
}

interface SolarLike {
  fromYmd?(y: number, mo: number, d: number): { getLunar(): unknown };
  fromYmdHms?(y: number, mo: number, d: number, h: number, mi: number, s: number): { getLunar(): unknown };
}

/** 子系统结果条目 */
export interface SubsystemResult {
  /** 引擎名 */
  name: string;
  /** 该子系统的吉凶定调 */
  tone: Tone;
  /** 一句话摘要 */
  summary: string;
  /** 完整 envelope（供深入查看） */
  envelope: ToolEnvelope;
}

/** 一致性检验结果 */
export interface ConsistencyCheck {
  /** 各子系统 tone 列表 */
  tones: Tone[];
  /** 是否同向（全吉/全凶/全中，或吉中无凶/凶中无吉视为基本同向） */
  aligned: boolean;
  /** 冲突描述（不一致时） */
  conflicts: string[];
  /** 置信度（同向→高，有冲突→中） */
  confidence: '高' | '中' | '低';
}

/** 联合分析结果 */
export interface ComboResult {
  comboName: string;
  /** 联合模块用途 */
  purpose: string;
  /** 输入摘要 */
  inputs: Record<string, unknown>;
  /** 各子系统结果 */
  subsystems: SubsystemResult[];
  /** 整合结论 */
  synthesis: string;
  /** 一致性检验 */
  consistency: ConsistencyCheck;
  /** 综合建议条目 */
  recommendations: { label: string; value: string; tone: Tone }[];
  /** export_snapshot 稳定段表 */
  export_snapshot: ExportSnapshot;
  engineName: string;
  mode: string;
  confidenceNote: string;
}

export interface AnnualFortuneResult extends ComboResult {
  context: {
    targetYear: number;
    mingGua: { trigram: string; group: string };
  };
}

// ─── tone 推断（从 envelope 的 snapshot summary + tags）───

function toneFromEnvelope(env: ToolEnvelope): Tone {
  const data = env.data as { export_snapshot?: { summary?: string; tags?: string[] } };
  const text = (data.export_snapshot?.summary ?? '') + ' ' + (data.export_snapshot?.tags ?? []).join(' ');
  if (/大吉|吉格|用生体|可成|身强|旺|相|生门|休门|开门|阳遁|禄|权|科/.test(text)) return '吉';
  if (/大凶|凶格|用克体|不利|身弱|死|囚|绝命|五鬼|祸害|六煞|死门|惊门|伤门|忌/.test(text)) return '凶';
  return '中';
}

function summaryFromEnvelope(env: ToolEnvelope): string {
  const data = env.data as { export_snapshot?: { summary?: string } };
  return data.export_snapshot?.summary ?? '';
}

/** 一致性检验 */
function checkConsistency(subsystems: SubsystemResult[]): ConsistencyCheck {
  const tones = subsystems.map((s) => s.tone);
  const ji = tones.filter((t) => t === '吉').length;
  const xiong = tones.filter((t) => t === '凶').length;
  // 同向：无吉凶对立
  const aligned = ji === 0 || xiong === 0;
  const conflicts: string[] = [];
  if (!aligned) {
    const jiNames = subsystems.filter((s) => s.tone === '吉').map((s) => s.name);
    const xiongNames = subsystems.filter((s) => s.tone === '凶').map((s) => s.name);
    conflicts.push(`${jiNames.join('、')}判吉，${xiongNames.join('、')}判凶，方向有分歧，需权衡`);
  }
  const confidence: '高' | '中' | '低' = aligned ? '高' : '中';
  return { tones, aligned, conflicts, confidence };
}

/** tone → 中文定调词 */
function toneWord(t: Tone): string {
  return t === '吉' ? '偏吉' : t === '凶' ? '偏凶' : '平稳';
}

// ─── Combo 1: 年度综合运势 ───

export interface AnnualFortuneComboInput {
  birth: BirthInput;
  /** 欲测年份（默认用 birth 年或当前年） */
  targetYear?: number;
  solar?: SolarLike | null;
  /** 当前月（五运六气用） */
  currentMonth?: number;
}

/**
 * 年度综合运势 = 八字（大运/日主/喜用）+ 五运六气（年运）+ 奇门（年盘）+ 紫微流年/大限 + 命卦方位
 */
export function calcAnnualFortuneCombo(input: AnnualFortuneComboInput): ToolEnvelope<AnnualFortuneResult> {
  const { birth, solar } = input;
  const targetYear = input.targetYear ?? birth.year;

  // solar 为各引擎本地 SolarLike（结构因 LunarLike 而异），combo 作聚合层统一以 never 透传，运行时不变
  const baziEnv = calcBaziEnveloped({ birth, solar: (solar ?? null) as never });
  const yunqiEnv = calcYunqiEnveloped({ year: targetYear, birthMonth: birth.month, birthDay: birth.day, solar: (solar ?? null) as never, currentMonth: input.currentMonth });
  const qimenEnv = calcQimenEnveloped({ birth: { year: targetYear, month: birth.month, day: birth.day, hour: birth.hour, minute: birth.minute } });
  const mingGua = calcMingGua(birth.year, birth.gender);
  const personalDirs = getPersonalDirections(mingGua.trigram);

  // 紫微流年/大限摘要（iztro horoscope；iztro 不可用时 available=false，仍作维度占位）
  const ziweiSummary = getZiweiHoroscopeSummary(
    { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender as '男' | '女' },
    targetYear,
    input.currentMonth ?? 7,
  );
  // 紫微 tone：化忌入命→凶，化禄入命→吉，否则中
  let ziweiTone: Tone = '中';
  if (ziweiSummary.available) {
    const jiInMing = ziweiSummary.yearlyJiStar && ziweiSummary.mingMainStars.includes(ziweiSummary.yearlyJiStar);
    const luInMing = ziweiSummary.yearlyLuStar && ziweiSummary.mingMainStars.includes(ziweiSummary.yearlyLuStar);
    if (jiInMing) ziweiTone = '凶';
    else if (luInMing) ziweiTone = '吉';
  }
  // 紫微子系统用轻量伪 envelope 承载 summary（供深入查看与 tone 推断回退）。
  // 即使 iztro 不可用，envelope.ok 仍 true（降级为占位，子系统结构完整不破坏 combo 契约）。
  const ziweiPseudoEnv: ToolEnvelope = {
    ok: true,
    tool: 'ZiweiHoroscope',
    version: 'iztro@2.5.8',
    input_normalized: { birth: { year: birth.year }, targetYear },
    data: { export_snapshot: { summary: ziweiSummary.summary, sections: [] } },
    warnings: ziweiSummary.available ? [] : ['紫微流年信息暂未显示，请结合其他内容参考'],
  };

  const subsystems: SubsystemResult[] = [
    { name: '八字', tone: toneFromEnvelope(baziEnv), summary: summaryFromEnvelope(baziEnv), envelope: baziEnv },
    { name: '五运六气', tone: toneFromEnvelope(yunqiEnv), summary: summaryFromEnvelope(yunqiEnv), envelope: yunqiEnv },
    { name: '奇门年盘', tone: toneFromEnvelope(qimenEnv), summary: summaryFromEnvelope(qimenEnv), envelope: qimenEnv },
    { name: '紫微流年', tone: ziweiTone, summary: ziweiSummary.summary, envelope: ziweiPseudoEnv },
  ];
  const consistency = checkConsistency(subsystems);

  // 命卦方位信息（不参与 tone 检验，作辅助建议）
  const auspiciousDirs = personalDirs?.auspicious.map((d) => `${d.star}在${d.direction}`).join('、') ?? '未知';

  const synthesis = `${targetYear}年综合运势：八字${toneWord(subsystems[0].tone)}、五运六气${toneWord(subsystems[1].tone)}、奇门年盘${toneWord(subsystems[2].tone)}、紫微流年${toneWord(subsystems[3].tone)}。` +
    (consistency.aligned ? `四种术数看法基本一致，结论较稳。` : `四种术数看法有出入：${consistency.conflicts.join('；')}。`) +
    `命卦${mingGua.trigram}（${mingGua.group}），本年吉方：${auspiciousDirs}。`;

  const recommendations: ComboResult['recommendations'] = [];
  if (subsystems[0].tone === '吉' || subsystems[1].tone === '吉') {
    recommendations.push({ label: '整体进取', value: '多种术数显示有利，宜把握机遇、主动推进。', tone: '吉' });
  }
  if (subsystems.some((s) => s.tone === '凶')) {
    recommendations.push({ label: '稳妥防守', value: '部分术数示警，宜保守、避免大举冒进，注意健康与人际。', tone: '凶' });
  }
  if (ziweiSummary.available && ziweiSummary.yearlyJiStar) {
    recommendations.push({
      label: '紫微化忌',
      value: `流年${ziweiSummary.yearly.stem}${ziweiSummary.yearly.branch}，${ziweiSummary.yearlyJiStar}化忌${ziweiSummary.mingMainStars.includes(ziweiSummary.yearlyJiStar) ? '入命宫' : ''}，该年与${ziweiSummary.yearlyJiStar}相关事项（如该星主导的宫位领域）宜谨慎。`,
      tone: ziweiTone === '凶' ? '凶' : '中',
    });
  }
  recommendations.push({ label: '方位借力', value: `本年个人吉方${auspiciousDirs}，可作主卧/办公位/财位布局。`, tone: '吉' });

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['年度综合运势', String(targetYear) + '年'],
    sections: [
      { heading: '整合结论', body: synthesis },
      { heading: '八字维度', body: subsystems[0].summary },
      { heading: '五运六气维度', body: subsystems[1].summary },
      { heading: '奇门年盘维度', body: subsystems[2].summary },
      { heading: '紫微流年维度', body: subsystems[3].summary },
      { heading: '命卦方位', body: `命卦${mingGua.trigram}（${mingGua.group}），吉方：${auspiciousDirs}。` },
      { heading: '各术数看法', body: consistency.aligned ? '各术数看法一致，结论较稳。' : `看法有出入：${consistency.conflicts.join('；')}` },
      { heading: '综合建议', body: recommendations.map((r) => `【${r.label}】${r.value}`).join('\n') },
    ],
    sourceNotes: '联合分析为多系统聚合参考，非预言绝对，请结合自身境遇理性看待。',
  };

  const result: AnnualFortuneResult = {
    comboName: '年度综合运势',
    purpose: '八字+五运六气+奇门年盘+紫微流年+命卦方位 联合推算某年整体运势',
    inputs: { birth: { year: birth.year, gender: birth.gender }, targetYear },
    context: {
      targetYear,
      mingGua: { trigram: mingGua.trigram, group: mingGua.group },
    },
    subsystems,
    synthesis,
    consistency,
    recommendations,
    export_snapshot: snapshot,
    engineName: 'AnnualFortuneComboEngine',
    mode: 'local-exact',
    confidenceNote: snapshot.sourceNotes!,
  };

  return {
    ok: true,
    tool: result.engineName,
    version: '0.1.0',
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings: [
      result.confidenceNote,
      ...(consistency.aligned ? [] : ['多系统结论有分歧，已标注权衡']),
      ...(!ziweiSummary.available ? ['iztro 流年数据不可用，紫微维度降级为占位'] : []),
    ],
  };
}

// ─── Combo 2: 事件决策（三卜交叉验证）───

export interface DecisionComboInput {
  birth: BirthInput;
  /** 求测事项 */
  question: string;
  /** 起卦种子（铜钱法，可选） */
  seed?: number;
  solar?: SolarLike | null;
}

/**
 * 事件决策 = 六爻 + 梅花 + 奇门（三卜交叉验证）
 * 三卜结论一致→高置信；两同一异→以六爻为主。
 */
export function calcDecisionCombo(input: DecisionComboInput): ToolEnvelope<ComboResult> {
  const { birth, question, solar, seed } = input;

  const liuyaoEnv = calcLiuyaoEnveloped({ birth, method: 'coin', question, seed, solar: (solar ?? null) as never });
  // calcMeihuaEnveloped 为 (input, solar?) 两参签名，solar 不在 MeihuaInput 内
  const meihuaEnv = calcMeihuaEnveloped({ birth, method: 'time' }, (solar ?? null) as never);
  const qimenEnv = calcQimenEnveloped({ birth, question });

  const subsystems: SubsystemResult[] = [
    { name: '六爻', tone: toneFromEnvelope(liuyaoEnv), summary: summaryFromEnvelope(liuyaoEnv), envelope: liuyaoEnv },
    { name: '梅花', tone: toneFromEnvelope(meihuaEnv), summary: summaryFromEnvelope(meihuaEnv), envelope: meihuaEnv },
    { name: '奇门', tone: toneFromEnvelope(qimenEnv), summary: summaryFromEnvelope(qimenEnv), envelope: qimenEnv },
  ];
  const consistency = checkConsistency(subsystems);

  // 三卜交叉：以六爻为主
  const liuyaoTone = subsystems[0].tone;
  let synthesis = `针对「${question}」用三种卜法同参：六爻${toneWord(liuyaoTone)}、梅花${toneWord(subsystems[1].tone)}、奇门${toneWord(subsystems[2].tone)}。`;
  if (consistency.aligned) {
    synthesis += `三种卜法看法一致，结论较稳。`;
  } else {
    synthesis += `三种卜法看法有出入，以六爻为主、梅花奇门为辅。出入处：${consistency.conflicts.join('；')}。`;
  }

  const recommendations: ComboResult['recommendations'] = [];
  if (liuyaoTone === '吉') {
    recommendations.push({ label: '可进', value: '六爻用神得力，宜把握时机推进。', tone: '吉' });
  } else if (liuyaoTone === '凶') {
    recommendations.push({ label: '宜守', value: '六爻用神受克，宜暂缓、观望，避免强行。', tone: '凶' });
  } else {
    recommendations.push({ label: '顺其自然', value: '六爻平稳，可按既定计划推进，无需强求。', tone: '中' });
  }
  recommendations.push({ label: '心态', value: '卜筮为参考，决策仍需结合现实条件与理性判断。', tone: '中' });

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['事件决策', '三卜同参'],
    sections: [
      { heading: '整合结论', body: synthesis },
      { heading: '六爻', body: subsystems[0].summary },
      { heading: '梅花易数', body: subsystems[1].summary },
      { heading: '奇门', body: subsystems[2].summary },
      { heading: '各术数看法', body: consistency.aligned ? '三种卜法看法一致，结论较稳。' : `看法有出入：${consistency.conflicts.join('；')}。以六爻为主。` },
      { heading: '行动建议', body: recommendations.map((r) => `【${r.label}】${r.value}`).join('\n') },
    ],
    sourceNotes: '三卜交叉验证为传统卜筮参考，非绝对预言，决策请结合现实理性判断。',
  };

  const result: ComboResult = {
    comboName: '事件决策',
    purpose: '六爻+梅花+奇门 三卜交叉验证某事的吉凶与行动方向',
    inputs: { birth: { year: birth.year, gender: birth.gender }, question },
    subsystems,
    synthesis,
    consistency,
    recommendations,
    export_snapshot: snapshot,
    engineName: 'DecisionComboEngine',
    mode: 'local-exact',
    confidenceNote: snapshot.sourceNotes!,
  };

  return {
    ok: true,
    tool: result.engineName,
    version: '0.1.0',
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings: [result.confidenceNote, ...(consistency.aligned ? [] : ['三卜有分歧，以六爻为主'])],
  };
}

// ─── Combo 3: 空间+时间 ───

export interface SpaceTimeComboInput {
  birth: BirthInput;
  /** 欲测年份（飞星年盘） */
  targetYear?: number;
  /** 房屋朝向（八宅宅卦，可选） */
  facing?: string;
  solar?: SolarLike | null;
}

/**
 * 空间+时间 = 飞星（年盘方位）+ 八宅命卦吉方 + 奇门吉方
 * 复用 bazhaiHouse.combineBazhaiFeixing 做八宅+飞星合参，再叠加奇门吉方。
 */
export function calcSpaceTimeCombo(input: SpaceTimeComboInput): ToolEnvelope<ComboResult> {
  const { birth, solar } = input;
  const targetYear = input.targetYear ?? birth.year;
  const mingGua = calcMingGua(birth.year, birth.gender);
  const qimenEnv = calcQimenEnveloped({ birth: { year: targetYear, month: birth.month, day: birth.day, hour: birth.hour, minute: birth.minute } });

  // 命卦吉方
  const personalDirs = getPersonalDirections(mingGua.trigram);
  const auspiciousDirs = personalDirs?.auspicious.map((d) => `${d.star}在${d.direction}`).join('、') ?? '未知';

  // 元运（飞星年盘背景）
  const yuanYun = getYuanYun(targetYear);

  // 奇门吉方：从奇门九宫找开门/生门/休门所在宫位
  const qimenData = qimenEnv.data as { palaces: Array<{ trigram: string; position: number; gate: string; gateLuck: string }> };
  const auspiciousGates = qimenData.palaces
    .filter((p) => ['开门', '生门', '休门'].includes(p.gate))
    .map((p) => `${p.gate}在${p.trigram}宫(${p.position}宫)`);

  const qimenTone = toneFromEnvelope(qimenEnv);

  const synthesis = `${targetYear}年空间布局参考：命卦${mingGua.trigram}（${mingGua.group}），个人吉方${auspiciousDirs}；` +
    `当前${yuanYun.name}（${yuanYun.startYear+"-"+yuanYun.endYear}），飞星年盘对此有叠加影响；` +
    `奇门吉方：${auspiciousGates.join('、') || '无显著吉门'}。` +
    `三者方位重合处为最佳布局点。`;

  const recommendations: ComboResult['recommendations'] = [
    { label: '主卧/办公位', value: `优先选个人生气方（${personalDirs?.auspicious.find((d) => d.star === '生气')?.direction ?? '未知'}），与奇门吉门方位重合更佳。`, tone: '吉' },
    { label: '财位催旺', value: `个人天医方（${personalDirs?.auspicious.find((d) => d.star === '天医')?.direction ?? '未知'}）宜作财位，置招财物品。`, tone: '吉' },
    { label: '凶位规避', value: `个人绝命/五鬼方忌作主卧大门，宜置厕所储物压之。`, tone: '凶' },
  ];

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['空间+时间', String(targetYear) + '年', mingGua.trigram + '命', yuanYun.name],
    sections: [
      { heading: '整合结论', body: synthesis },
      { heading: '命卦吉方', body: `命卦${mingGua.trigram}（${mingGua.group}），四吉方：${auspiciousDirs}。` },
      { heading: '元运背景', body: `当前${yuanYun.name}（${yuanYun.startYear+"-"+yuanYun.endYear}），九星旺衰随元运变化。` },
      { heading: '奇门吉门方位', body: auspiciousGates.join('、') || '无显著吉门' },
      { heading: '布局建议', body: recommendations.map((r) => `【${r.label}】${r.value}`).join('\n') },
    ],
    sourceNotes: '空间布局为传统风水参考，实际需结合户型与现场形势综合判断。',
  };

  const result: ComboResult = {
    comboName: '空间+时间',
    purpose: '飞星年盘+八宅命卦吉方+奇门吉方 联合推算某年最佳布局方位',
    inputs: { birth: { year: birth.year, gender: birth.gender }, targetYear, facing: input.facing },
    subsystems: [
      { name: '八宅命卦', tone: '中', summary: `命卦${mingGua.trigram}，吉方${auspiciousDirs}`, envelope: qimenEnv },
      { name: '奇门吉方', tone: qimenTone, summary: summaryFromEnvelope(qimenEnv), envelope: qimenEnv },
    ],
    synthesis,
    consistency: { tones: ['中', qimenTone], aligned: true, conflicts: [], confidence: '中' },
    recommendations,
    export_snapshot: snapshot,
    engineName: 'SpaceTimeComboEngine',
    mode: 'local-exact',
    confidenceNote: snapshot.sourceNotes!,
  };

  return {
    ok: true,
    tool: result.engineName,
    version: '0.1.0',
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings: [result.confidenceNote],
  };
}

// ─── Combo 4: 三式互参（大六壬 + 奇门 + 梅花）───

export interface SanshiComboInput {
  birth: BirthInput;
  /** 求测事项 */
  question: string;
  solar?: SolarLike | null;
  /** 大六壬天将流派，透传至 calcDaliurenEnveloped；默认 classic */
  liurenSchool?: DaliurenSchool;
}

/**
 * 三式互参 = 大六壬 + 奇门遁甲 + 梅花易数
 * 大六壬重三传四课（事态轨迹+应期），奇门重八门九星（方位择吉），梅花重体用生克（快速判断）。
 * 三式各有所长，交叉验证：同向→高置信，分歧→权衡。
 */
export function calcSanshiCombo(input: SanshiComboInput): ToolEnvelope<ComboResult> {
  const { birth, question, solar, liurenSchool } = input;

  const liurenEnv = calcDaliurenEnveloped({ birth, solar: (solar ?? null) as never, school: liurenSchool ?? 'classic' });
  const qimenEnv = calcQimenEnveloped({ birth, question });
  // calcMeihuaEnveloped 为 (input, solar?) 两参签名，solar 不在 MeihuaInput 内
  const meihuaEnv = calcMeihuaEnveloped({ birth, method: 'time' }, (solar ?? null) as never);

  const subsystems: SubsystemResult[] = [
    { name: '大六壬', tone: toneFromEnvelope(liurenEnv), summary: summaryFromEnvelope(liurenEnv), envelope: liurenEnv },
    { name: '奇门遁甲', tone: toneFromEnvelope(qimenEnv), summary: summaryFromEnvelope(qimenEnv), envelope: qimenEnv },
    { name: '梅花易数', tone: toneFromEnvelope(meihuaEnv), summary: summaryFromEnvelope(meihuaEnv), envelope: meihuaEnv },
  ];
  const consistency = checkConsistency(subsystems);

  // 三式各有所长：大六壬主断事态过程与应期
  const liurenTone = subsystems[0].tone;
  let synthesis = `针对「${question}」的三式互参：大六壬${toneWord(liurenTone)}（三传四课主事态轨迹）、奇门${toneWord(subsystems[1].tone)}（八门九星主方位时机）、梅花${toneWord(subsystems[2].tone)}（体用生克主快速判断）。`;
  if (consistency.aligned) {
    synthesis += `三式看法一致，结论较稳。`;
  } else {
    synthesis += `三式看法有出入，以大六壬三传为主、奇门梅花为辅。出入处：${consistency.conflicts.join('；')}。`;
  }

  const recommendations: ComboResult['recommendations'] = [];
  if (liurenTone === '吉') {
    recommendations.push({ label: '事态可成', value: '大六壬三传吉，事态发展有利，宜把握时机推进。', tone: '吉' });
  } else if (liurenTone === '凶') {
    recommendations.push({ label: '宜缓宜守', value: '大六壬三传凶，事态有阻，宜暂缓观望、避免强求。', tone: '凶' });
  } else {
    recommendations.push({ label: '平稳推进', value: '大六壬三传平稳，可按既定计划进行，无需强求。', tone: '中' });
  }
  // 奇门方位建议
  const qimenData = qimenEnv.data as { palaces: Array<{ trigram: string; gate: string }> };
  const auspiciousGates = qimenData.palaces?.filter((p) => ['开门', '生门', '休门'].includes(p.gate)) ?? [];
  if (auspiciousGates.length > 0) {
    recommendations.push({ label: '方位借力', value: `奇门吉门在${auspiciousGates.map((g) => g.trigram + '宫').join('、')}，可择吉方行事。`, tone: '吉' });
  }
  recommendations.push({ label: '心态', value: '三式为传统占断参考，决策仍需结合现实条件与理性判断。', tone: '中' });

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['三式互参', '大六壬+奇门+梅花'],
    sections: [
      { heading: '整合结论', body: synthesis },
      { heading: '大六壬', body: subsystems[0].summary },
      { heading: '奇门遁甲', body: subsystems[1].summary },
      { heading: '梅花易数', body: subsystems[2].summary },
      { heading: '各术数看法', body: consistency.aligned ? '三式看法一致，结论较稳。' : `看法有出入：${consistency.conflicts.join('；')}。以大六壬为主。` },
      { heading: '行动建议', body: recommendations.map((r) => `【${r.label}】${r.value}`).join('\n') },
    ],
    sourceNotes: '三式互参为传统占断参考，非绝对预言，决策请结合现实理性判断。',
  };

  const result: ComboResult = {
    comboName: '三式互参',
    purpose: '大六壬+奇门遁甲+梅花易数 三式交叉验证某事的吉凶、应期与方位',
    inputs: { birth: { year: birth.year, gender: birth.gender }, question },
    subsystems,
    synthesis,
    consistency,
    recommendations,
    export_snapshot: snapshot,
    engineName: 'SanshiComboEngine',
    mode: 'local-exact',
    confidenceNote: snapshot.sourceNotes!,
  };

  return {
    ok: true,
    tool: result.engineName,
    version: '0.1.0',
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings: [result.confidenceNote, ...(consistency.aligned ? [] : ['三式有分歧，以大六壬为主'])],
  };
}

// ─── Combo 6: 今日养生建议（体质 + 节气 + 时辰经络 + 方位）───

export interface DailyWellnessComboInput {
  birth: BirthInput;
  /** 当前日期（默认取系统当前）。调用方或测试可显式传入以保证确定性 */
  now?: { year: number; month: number; day: number; hour: number };
  /** 当前小时（0-23），now 未传时用系统小时 */
  currentHour?: number;
  /** 用户体质类型（若有问卷结果，如「气虚质」）；未传则用五运六气倾向参考 */
  constitution?: string;
  /** 欲测年份（飞星/太岁方位用，默认取 now 或当前年） */
  targetYear?: number;
  solar?: SolarLike | null;
}

/** 今日养生 子系统结果（节略版，不走 tone 检验——养生无吉凶对立，只有建议） */
export interface WellnessSubsystem {
  name: string;
  summary: string;
}

export interface DailyWellnessResult {
  comboName: string;
  purpose: string;
  inputs: Record<string, unknown>;
  /** 当前日期 + 节气 + 时辰 */
  context: { date: string; jieqi: string; season: string; shichen: string; meridian: string };
  /** 体质（用户提供或五运六气倾向推断） */
  constitution: { type: string; source: '问卷' | '五运六气倾向参考'; reason: string };
  /** 节气调养 */
  jieqiWellness: JieqiWellness;
  /** 体质在节气下的针对性建议 */
  constitutionAdvice: string;
  /** 当前时辰经络养生 */
  meridianHour: MeridianHour;
  /** 方位养生提示（太岁五黄规避 + 个人吉方） */
  directionTip: string;
  /** 各维度子系统 */
  subsystems: WellnessSubsystem[];
  /** 整合结论 */
  synthesis: string;
  /** 综合建议条目 */
  recommendations: { label: string; value: string; tone: Tone }[];
  export_snapshot: ExportSnapshot;
  engineName: string;
  mode: string;
  confidenceNote: string;
}

/**
 * 今日养生建议 = 体质 + 24节气 + 子午流注时辰 + 太岁/飞星方位
 * 把「命理排盘」延伸到「日常养生决策」，形成命理+体质+时空养生闭环。
 * - 体质：优先用用户问卷结果（constitution 入参），否则用五运六气出生年倾向参考。
 * - 节气：当前所处节气调养 + 体质针对性加减。
 * - 时辰：当前当令经络 + 养生建议。
 * - 方位：本年太岁/五黄凶方规避 + 个人吉方借力。
 */
export function calcDailyWellnessCombo(input: DailyWellnessComboInput): ToolEnvelope<DailyWellnessResult> {
  const { birth, solar, constitution } = input;
  const now = input.now ?? (() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: input.currentHour ?? d.getHours() };
  })();
  const targetYear = input.targetYear ?? now.year;

  // 体质：优先用户问卷结果，否则五运六气倾向参考
  let constitutionType = constitution || '';
  let constitutionSource: '问卷' | '五运六气倾向参考' = '问卷';
  let constitutionReason = '基于问卷自评的主要体质';
  if (!constitutionType) {
    const yunqiEnv = calcYunqiEnveloped({ year: birth.year, birthMonth: birth.month, birthDay: birth.day, solar: (solar ?? null) as never, currentMonth: now.month });
    const tendency = getConstitutionTendency(yunqiEnv.data as never);
    if (tendency && tendency.tendencies.length > 0) {
      constitutionType = tendency.tendencies[0].type;
      constitutionReason = tendency.tendencies[0].reason;
      constitutionSource = '五运六气倾向参考';
    } else {
      constitutionType = '平和质';
      constitutionReason = '未提供问卷且五运六气倾向不显著，暂按平和质处理';
      constitutionSource = '五运六气倾向参考';
    }
  }

  // 节气调养（传入 jieQiTable 走精确，否则近似）
  const solarEntry = (solar ?? null) as { fromYmd?: (y: number, mo: number, d: number) => { getLunar(): { getJieQiTable?: () => Record<string, unknown> } } } | null;
  let jieQiTable: Record<string, unknown> | undefined;
  try {
    if (solarEntry?.fromYmd) {
      const lunar = solarEntry.fromYmd(now.year, now.month, now.day).getLunar();
      if (typeof lunar.getJieQiTable === 'function') jieQiTable = lunar.getJieQiTable();
    }
  } catch {
    /* 精确历法不可用，回退近似 */
  }
  const jieqiQuery = queryJieqiWellness({ year: now.year, month: now.month, day: now.day }, constitutionType, jieQiTable);
  const constitutionAdviceText = jieqiQuery.constitutionAdvice.length > 0
    ? jieqiQuery.constitutionAdvice.map((a) => `${a.advice}（注意：${a.caution}）`).join('；')
    : '本节气暂无该体质的针对性加减，按通用节气调养 + 该体质日常调养方向执行即可。';

  // 当前时辰经络
  const meridianHour = getMeridianByHour(now.hour) ?? (getMeridianByHour(0) as MeridianHour);

  // 方位：太岁/五黄 + 个人吉方
  const taisui = calcTaisui(targetYear);
  const mingGua = calcMingGua(birth.year, birth.gender);
  const personalDirs = getPersonalDirections(mingGua.trigram);
  const shengqiDir = personalDirs?.auspicious.find((d) => d.star === '生气')?.direction ?? '未知';
  const directionTip = `本年五黄大煞在${taisui.fiveYellow.direction}、三煞在${taisui.sanSha.direction}，此二方忌动土、宜静；` +
    `个人生气方${shengqiDir}（${mingGua.trigram}命），宜作主卧/办公位/养生活动方位。`;

  const subsystems: WellnessSubsystem[] = [
    { name: '体质', summary: `${constitutionType}（${constitutionSource}）：${constitutionReason}` },
    { name: '节气', summary: `${jieqiQuery.jieqi}（${jieqiQuery.wellness.season}季）：${jieqiQuery.wellness.principle}` },
    { name: '时辰经络', summary: `${meridianHour.name}（${meridianHour.time}）${meridianHour.meridian}当令：${meridianHour.advice}` },
    { name: '方位', summary: directionTip },
  ];

  const synthesis = `今日（${now.year}年${now.month}月${now.day}日，${jieqiQuery.jieqi}）养生建议：` +
    `您属${constitutionType}，当前${jieqiQuery.jieqi}节气宜「${jieqiQuery.wellness.principle}」；` +
    `此刻${meridianHour.name}${meridianHour.meridian}当令，宜${meridianHour.advice}；` +
    `方位上${directionTip}`;

  const recommendations: DailyWellnessResult['recommendations'] = [
    { label: '节气饮食', value: `${jieqiQuery.wellness.diet}`, tone: '中' },
    { label: '节气起居', value: `${jieqiQuery.wellness.lifestyle}`, tone: '中' },
    { label: '节气运动', value: `${jieqiQuery.wellness.exercise}`, tone: '中' },
    { label: '穴位保健', value: `${jieqiQuery.wellness.acupoints}`, tone: '中' },
    { label: '体质加减', value: constitutionAdviceText, tone: '中' },
    { label: '当令时辰', value: `${meridianHour.name}${meridianHour.meridian}当令，宜${meridianHour.advice}。`, tone: '中' },
    { label: '方位借力', value: `养生活动（按摩/运动/静坐）宜朝个人生气方${shengqiDir}；避本年五黄${taisui.fiveYellow.direction}、三煞${taisui.sanSha.direction}方久留动土。`, tone: '吉' },
  ];

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['今日养生', jieqiQuery.jieqi, constitutionType, meridianHour.name + meridianHour.meridian, `${mingGua.trigram}命`],
    sections: [
      { heading: '整合结论', body: synthesis },
      { heading: '当前节气', body: `${jieqiQuery.jieqi}（${jieqiQuery.wellness.season}季），${jieqiQuery.wellness.feature}。调养总则：${jieqiQuery.wellness.principle}。` },
      { heading: '节气饮食', body: jieqiQuery.wellness.diet },
      { heading: '节气起居', body: jieqiQuery.wellness.lifestyle },
      { heading: '节气运动', body: jieqiQuery.wellness.exercise },
      { heading: '穴位保健', body: jieqiQuery.wellness.acupoints },
      { heading: '体质针对性建议', body: constitutionAdviceText },
      { heading: '当令时辰经络', body: `${meridianHour.name}（${meridianHour.time}）${meridianHour.meridian}当令，对应${meridianHour.organ}。生理：${meridianHour.function}。宜：${meridianHour.advice}。` },
      { heading: '方位养生', body: directionTip },
      { heading: '今日行动建议', body: recommendations.map((r) => `【${r.label}】${r.value}`).join('\n') },
    ],
    sourceNotes: '今日养生为体质+节气+时辰+方位的多维度养生参考，非医疗诊断。如有健康问题请咨询专业中医师。',
  };

  const result: DailyWellnessResult = {
    comboName: '今日养生建议',
    purpose: '体质+24节气+子午流注时辰+太岁/飞星方位 联合推算今日养生方案',
    inputs: { birth: { year: birth.year, gender: birth.gender }, now, constitution: constitutionType, targetYear },
    context: {
      date: `${now.year}年${now.month}月${now.day}日`,
      jieqi: jieqiQuery.jieqi,
      season: jieqiQuery.wellness.season,
      shichen: meridianHour.name,
      meridian: meridianHour.meridian,
    },
    constitution: { type: constitutionType, source: constitutionSource, reason: constitutionReason },
    jieqiWellness: jieqiQuery.wellness,
    constitutionAdvice: constitutionAdviceText,
    meridianHour,
    directionTip,
    subsystems,
    synthesis,
    recommendations,
    export_snapshot: snapshot,
    engineName: 'DailyWellnessComboEngine',
    mode: jieqiQuery.mode,
    confidenceNote: snapshot.sourceNotes!,
  };

  return {
    ok: true,
    tool: result.engineName,
    version: '0.1.0',
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings: [
      result.confidenceNote,
      ...(constitutionSource === '五运六气倾向参考' ? ['体质未提供问卷结果，按五运六气出生年倾向参考推断，建议完成体质问卷自评以获更精准建议'] : []),
    ],
  };
}

// ─── Combo 5: 三式合一（奇门 + 太乙 + 大六壬 传统三式）───

export interface SanshiClassicComboInput {
  birth: BirthInput;
  /** 求测事项 */
  question: string;
  solar?: SolarLike | null;
  /** 大六壬天将流派，透传至 calcDaliurenEnveloped；默认 classic */
  liurenSchool?: DaliurenSchool;
  /** 太乙计式，默认年计 0 */
  taiyiJiStyle?: TaiyiJiStyle;
  /** 太乙积年法，默认统宗 0 */
  taiyiAcumYear?: TaiyiAcumYear;
}

/**
 * 三式合一 = 奇门遁甲 + 太乙神数 + 大六壬（真正的传统三式）
 * 奇门主方位时机（八门九星），太乙主格局吉凶与主客胜负，大六壬主事态轨迹与应期。
 * 三式交叉验证：同向→高置信，分歧→以大六壬三传为主、太乙格局次之、奇门为辅。
 */
export function calcSanshiClassicCombo(input: SanshiClassicComboInput): ToolEnvelope<ComboResult> {
  const { birth, question, solar, liurenSchool, taiyiJiStyle = 0, taiyiAcumYear = 0 } = input;

  const qimenEnv = calcQimenEnveloped({ birth, question });
  const taiyiEnv = calcTaiyiEnveloped({ birth, jiStyle: taiyiJiStyle, acumYear: taiyiAcumYear, solar: (solar ?? null) as never });
  const liurenEnv = calcDaliurenEnveloped({ birth, solar: (solar ?? null) as never, school: liurenSchool ?? 'classic' });

  const subsystems: SubsystemResult[] = [
    { name: '奇门遁甲', tone: toneFromEnvelope(qimenEnv), summary: summaryFromEnvelope(qimenEnv), envelope: qimenEnv },
    { name: '太乙神数', tone: toneFromEnvelope(taiyiEnv), summary: summaryFromEnvelope(taiyiEnv), envelope: taiyiEnv },
    { name: '大六壬', tone: toneFromEnvelope(liurenEnv), summary: summaryFromEnvelope(liurenEnv), envelope: liurenEnv },
  ];
  const consistency = checkConsistency(subsystems);

  // 三式各有所长：大六壬主断事态过程与应期
  const liurenTone = subsystems[2].tone;
  const taiyiTone = subsystems[1].tone;
  let synthesis = `针对「${question}」的三式合一：奇门${toneWord(subsystems[0].tone)}（八门九星主方位时机）、太乙${toneWord(taiyiTone)}（主客算与格局断吉凶胜负）、大六壬${toneWord(liurenTone)}（三传四课主事态轨迹与应期）。`;
  if (consistency.aligned) {
    synthesis += `三式看法一致，结论较稳。`;
  } else {
    synthesis += `三式看法有出入，以大六壬三传为主、太乙格局次之、奇门方位为辅。出入处：${consistency.conflicts.join('；')}。`;
  }

  const recommendations: ComboResult['recommendations'] = [];
  if (liurenTone === '吉') {
    recommendations.push({ label: '事态可成', value: '大六壬三传吉，事态发展有利，宜把握时机推进。', tone: '吉' });
  } else if (liurenTone === '凶') {
    recommendations.push({ label: '宜缓宜守', value: '大六壬三传凶，事态有阻，宜暂缓观望、避免强求。', tone: '凶' });
  } else {
    recommendations.push({ label: '平稳推进', value: '大六壬三传平稳，可按既定计划进行，无需强求。', tone: '中' });
  }
  // 太乙主客胜负
  const taiyiData = taiyiEnv.data as { suenwl: string; home: { cal: number }; away: { cal: number } };
  recommendations.push({ label: '主客胜负', value: taiyiData.suenwl, tone: taiyiTone });
  // 奇门方位建议
  const qimenData = qimenEnv.data as { palaces: Array<{ trigram: string; gate: string }> };
  const auspiciousGates = qimenData.palaces?.filter((p) => ['开门', '生门', '休门'].includes(p.gate)) ?? [];
  if (auspiciousGates.length > 0) {
    recommendations.push({ label: '方位借力', value: `奇门吉门在${auspiciousGates.map((g) => g.trigram + '宫').join('、')}，可择吉方行事。`, tone: '吉' });
  }
  recommendations.push({ label: '心态', value: '三式为传统占断参考，决策仍需结合现实条件与理性判断。', tone: '中' });

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['三式合一', '奇门+太乙+大六壬'],
    sections: [
      { heading: '整合结论', body: synthesis },
      { heading: '奇门遁甲', body: subsystems[0].summary },
      { heading: '太乙神数', body: subsystems[1].summary },
      { heading: '大六壬', body: subsystems[2].summary },
      { heading: '各术数看法', body: consistency.aligned ? '三式看法一致，结论较稳。' : `看法有出入：${consistency.conflicts.join('；')}。以大六壬为主。` },
      { heading: '行动建议', body: recommendations.map((r) => `【${r.label}】${r.value}`).join('\n') },
    ],
    sourceNotes: '三式合一为传统占断参考，非绝对预言，决策请结合现实理性判断。',
  };

  const result: ComboResult = {
    comboName: '三式合一',
    purpose: '奇门遁甲+太乙神数+大六壬 传统三式交叉验证某事的吉凶、主客胜负、应期与方位',
    inputs: { birth: { year: birth.year, gender: birth.gender }, question },
    subsystems,
    synthesis,
    consistency,
    recommendations,
    export_snapshot: snapshot,
    engineName: 'SanshiClassicComboEngine',
    mode: 'local-exact',
    confidenceNote: snapshot.sourceNotes!,
  };

  return {
    ok: true,
    tool: result.engineName,
    version: '0.1.0',
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings: [result.confidenceNote, ...(consistency.aligned ? [] : ['三式有分歧，以大六壬为主'])],
  };
}

// ─── Combo 6: 综合择日（黄历宜忌 + 神煞 + 太岁三煞 + 命卦吉方 + 奇门吉方）───

import { getAlmanacData, type AlmanacData } from './almanacData';

/** 择日用途 */
export type ZeriPurpose =
  | '开业' | '结婚' | '搬家' | '动土' | '出行' | '签约' | '安葬' | '祈福';

/** 用途 → 黄历宜忌关键词匹配（命中「宜」加分） */
const PURPOSE_YI: Record<ZeriPurpose, string[]> = {
  '开业': ['开市', '交易', '立券', '签约', '纳财'],
  '结婚': ['嫁娶', '订盟', '纳采', '问名'],
  '搬家': ['移徙', '入宅', '安床', '入殓'],
  '动土': ['动土', '破土', '修造', '起基', '竖柱', '上梁'],
  '出行': ['出行', '移徙', '归宁'],
  '签约': ['交易', '立券', '纳财', '签约'],
  '安葬': ['安葬', '入殓', '破土', '移柩'],
  '祈福': ['祈福', '求嗣', '斋醮', '祭祀'],
};

/** 各用途「忌词」全集：当日「忌」含任一即淘汰该候选日 */
const PURPOSE_JI_FULL: Record<ZeriPurpose, string[]> = {
  '开业': ['开市', '交易', '立券'],
  '结婚': ['嫁娶', '订盟', '纳采'],
  '搬家': ['移徙', '入宅', '安床'],
  '动土': ['动土', '破土', '修造', '起基', '竖柱', '上梁'],
  '出行': ['出行'],
  '签约': ['交易', '立券', '纳财'],
  '安葬': ['安葬', '入殓', '破土', '移柩'],
  '祈福': ['祈福', '求嗣', '斋醮', '祭祀'],
};

export interface ZeriComboInput {
  birth: BirthInput;
  /** 用途 */
  purpose: ZeriPurpose;
  /** 候选日期区间起止，yyyy-mm-dd */
  startDate: string;
  endDate: string;
  /** 欲择年份（太岁/飞星用），默认取 startDate 年 */
  targetYear?: number;
  solar?: SolarLike | null;
  /** 返回前 N 个吉日，默认 5 */
  topN?: number;
}

/** 单日择日评分明细 */
export interface ZeriDayScore {
  /** yyyy-mm-dd */
  date: string;
  /** 农历日期 */
  lunarDate: string;
  /** 日干支 */
  dayGanZhi: string;
  /** 综合评分（越高越吉） */
  score: number;
  /** 吉凶定调 */
  tone: Tone;
  /** 评分理由条目 */
  reasons: string[];
  /** 该日黄历（宜忌/神煞/吉神/冲煞/时辰） */
  almanac: AlmanacData | null;
  /** 命主生肖是否被日支冲（婚嫁/动土重要参考） */
  chongOwner: boolean;
  /** 太岁/三煞/五黄是否落在该日重要方位（动土相关） */
  hitsAnnualSha: boolean;
}

/** 择日结果 */
export interface ZeriResult {
  comboName: string;
  purpose: string;
  inputs: Record<string, unknown>;
  /** 用途 */
  zeriPurpose: ZeriPurpose;
  /** 搜索区间 */
  range: { start: string; end: string; scannedDays: number };
  /** 排序后吉日列表（已截断 topN） */
  rankedDays: ZeriDayScore[];
  /** 被淘汰的日期及原因（供回溯，最多记 20 条） */
  rejected: { date: string; reason: string }[];
  /** 命卦吉方（所有候选日共用，作方位参考） */
  personalAuspicious: { star: string; direction: string }[];
  /** 本年凶方（太岁/岁破/三煞/五黄） */
  annualSha: { taisui: string; suiPo: string; sanSha: string; fiveYellow: string };
  /** 整合结论 */
  synthesis: string;
  /** 综合建议 */
  recommendations: { label: string; value: string; tone: Tone }[];
  export_snapshot: ExportSnapshot;
  engineName: string;
  mode: string;
  confidenceNote: string;
}

/** 公历日期加减天数（yyyy-mm-dd）→ yyyy-mm-dd */
function shiftDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** 枚举区间内所有公历日期（含首尾，上限 400 日防失控） */
function enumerateDates(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  let guard = 0;
  while (cur <= end && guard < 400) {
    out.push(cur);
    if (cur === end) break;
    cur = shiftDate(cur, 1);
    guard++;
  }
  return out;
}

/** 地支 → 生肖 */
const ZHI_SHENGXIAO: Record<string, string> = {
  子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇',
  午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪',
};

/**
 * 综合择日 = 黄历宜忌 + 神煞 + 太岁/三煞/五黄 + 命卦吉方
 * 在给定区间内逐日评分，淘汰忌日/冲命主/犯年煞者，按分数排序返回 Top-N。
 * - 黄历宜忌来自 lunar-javascript 真实历法（getAlmanacData），命中「宜」加分、命中「忌」淘汰。
 * - 神煞：吉神宜趋加分、凶煞宜忌扣分。
 * - 太岁/三煞/五黄：动土/安葬类用途若该日煞方犯太岁/岁破则淘汰。
 * - 冲命主生肖：婚嫁/动土/安葬用途遇之淘汰，其余扣分。
 * - 命卦吉方：作方位建议参考（不直接参与评分，因择日不固定行事方位）。
 */
export function calcZeriCombo(input: ZeriComboInput): ToolEnvelope<ZeriResult> {
  const { birth, purpose, startDate, endDate, solar, topN = 5 } = input;
  const targetYear = input.targetYear ?? Number(startDate.slice(0, 4));

  // solar 透传给 getAlmanacData（精确历法）；未传则引擎内回退 window.Solar
  const solarEntry = (solar ?? null) as Parameters<typeof getAlmanacData>[1] | null;

  // 年煞 + 命卦吉方（区间共用）
  const taisui = calcTaisui(targetYear);
  const mingGua = calcMingGua(birth.year, birth.gender);
  const personalDirs = getPersonalDirections(mingGua.trigram);
  const auspiciousDirs = personalDirs?.auspicious ?? [];
  const ownerZhiIndex = ((birth.year - 4) % 12 + 12) % 12;
  const ownerShengxiao = ZHI_SHENGXIAO[['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'][ownerZhiIndex]] ?? '';

  const annualSha = {
    taisui: taisui.taisui.direction,
    suiPo: taisui.suiPo.direction,
    sanSha: taisui.sanSha.direction,
    fiveYellow: taisui.fiveYellow.direction,
  };

  const candidates = enumerateDates(startDate, endDate);
  const ranked: ZeriDayScore[] = [];
  const rejected: { date: string; reason: string }[] = [];
  const isDongtu = purpose === '动土' || purpose === '安葬';

  for (const date of candidates) {
    const alm = getAlmanacData(date, solarEntry);
    if (!alm) {
      rejected.push({ date, reason: '历法引擎不可用，无法取宜忌' });
      continue;
    }

    const reasons: string[] = [];
    let score = 50; // 基础分

    // 1) 宜忌匹配
    const yiHit = PURPOSE_YI[purpose].filter((k) => alm.yi.some((y) => y.includes(k)));
    const jiHit = PURPOSE_JI_FULL[purpose].filter((k) => alm.ji.some((j) => j.includes(k)));
    if (jiHit.length > 0) {
      rejected.push({ date, reason: `黄历忌「${jiHit.join('、')}」，与${purpose}相冲` });
      continue;
    }
    if (yiHit.length > 0) {
      score += 20 * yiHit.length;
      reasons.push(`黄历宜「${yiHit.join('、')}」，正合${purpose}（+${20 * yiHit.length}）`);
    } else {
      reasons.push(`黄历宜项未直接命中${purpose}关键词，按通用吉日评估`);
    }

    // 2) 吉神/凶煞
    if (alm.jiShen.length > 0) {
      const add = Math.min(alm.jiShen.length * 3, 12);
      score += add;
      reasons.push(`吉神宜趋${alm.jiShen.length}位（+${add}）`);
    }
    if (alm.xiongSha.length > 0) {
      const pen = Math.min(alm.xiongSha.length * 4, 20);
      score -= pen;
      reasons.push(`凶煞宜忌${alm.xiongSha.length}项（-${pen}）`);
    }

    // 3) 冲命主生肖（婚嫁/动土重要）
    const chongDesc = alm.chong || '';
    let chongOwner = false;
    if (ownerShengxiao && chongDesc.includes(ownerShengxiao)) {
      chongOwner = true;
      if (purpose === '结婚' || purpose === '动土' || purpose === '安葬') {
        rejected.push({ date, reason: `日冲${ownerShengxiao}（命主生肖），${purpose}大忌` });
        continue;
      }
      score -= 15;
      reasons.push(`日冲命主生肖${ownerShengxiao}（-15）`);
    }

    // 4) 动土类：检查日煞方是否犯太岁/岁破
    let hitsAnnualSha = false;
    if (isDongtu) {
      const shaText = `${alm.sha || ''} ${alm.chong || ''}`;
      if (shaText.includes(taisui.taisui.direction) || shaText.includes(taisui.suiPo.direction)) {
        hitsAnnualSha = true;
        rejected.push({ date, reason: `日煞方犯太岁/岁破（${taisui.taisui.direction}/${taisui.suiPo.direction}），动土大忌` });
        continue;
      }
    }

    // 5) 黄道/黑道
    if (alm.dayTianShenType === '黄道') {
      score += 8;
      reasons.push('日值黄道（+8）');
    } else if (alm.dayTianShenType === '黑道') {
      score -= 5;
      reasons.push('日值黑道（-5）');
    }

    score = Math.max(0, Math.min(100, score));
    const tone: Tone = score >= 70 ? '吉' : score >= 45 ? '中' : '凶';

    ranked.push({
      date,
      lunarDate: alm.lunarDate,
      dayGanZhi: alm.dayGanZhi,
      score,
      tone,
      reasons,
      almanac: alm,
      chongOwner,
      hitsAnnualSha,
    });
  }

  // 排序：分数降序，并列时优先吉神多者
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.almanac?.jiShen.length ?? 0) - (a.almanac?.jiShen.length ?? 0);
  });
  const top = ranked.slice(0, topN);

  // 整合结论
  const best = top[0];
  let synthesis: string;
  if (!best) {
    synthesis = `在${startDate}至${endDate}区间内，未找到适合「${purpose}」的吉日。共淘汰${rejected.length}日。建议放宽区间或调整用途。`;
  } else {
    const jiCount = top.filter((d) => d.tone === '吉').length;
    synthesis = `针对「${purpose}」在${startDate}至${endDate}（共${candidates.length}日）内择日，` +
      `为你筛出${top.length}个较吉的日子（其中明显偏吉的${jiCount}个）。` +
      `首选${best.date}（${best.lunarDate}，${best.dayGanZhi}日）：${best.reasons.join('；')}。` +
      `本年凶方：太岁${annualSha.taisui}、岁破${annualSha.suiPo}、三煞${annualSha.sanSha}、五黄${annualSha.fiveYellow}，行事宜避之；` +
      `命卦${mingGua.trigram}个人吉方：${auspiciousDirs.map((d) => d.star + d.direction).join('、')}，可作方位借力。`;
  }

  const recommendations: ZeriResult['recommendations'] = [];
  if (best) {
    recommendations.push({ label: '首选吉日', value: `${best.date}（${best.lunarDate}），${best.reasons.join('；')}。`, tone: best.tone });
    if (top.length > 1) {
      recommendations.push({ label: '备选吉日', value: top.slice(1).map((d) => `${d.date}（${d.lunarDate}，${d.dayGanZhi}，${d.score}分）`).join('；'), tone: '中' });
    }
    // 时辰建议：取该日吉时
    const goodHours = best.almanac?.hours.filter((h) => h.luck === '吉') ?? [];
    if (goodHours.length > 0) {
      recommendations.push({ label: '吉时', value: goodHours.slice(0, 3).map((h) => `${h.label}（${h.ganZhi}）`).join('、'), tone: '吉' });
    }
  }
  if (isDongtu) {
    recommendations.push({ label: '动土避煞', value: `本年太岁${annualSha.taisui}、三煞${annualSha.sanSha}、五黄${annualSha.fiveYellow}方忌动土修造，已自动剔除犯煞日。`, tone: '凶' });
  }
  if (auspiciousDirs.length > 0) {
    recommendations.push({ label: '方位借力', value: `命卦${mingGua.trigram}吉方${auspiciousDirs.map((d) => d.star + d.direction).join('、')}，开业/办公/安床宜择吉方。`, tone: '吉' });
  }
  recommendations.push({ label: '理性提示', value: '综合择日为黄历宜忌+神煞+命理方位的多系统参考，非绝对吉凶保证，重大事项请结合现实条件与专业意见。', tone: '中' });

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['综合择日', purpose, `${candidates.length}日筛${top.length}选`],
    sections: [
      { heading: '整合结论', body: synthesis },
      { heading: '优选吉日', body: top.map((d, i) => `${i + 1}. ${d.date}（${d.lunarDate}，${d.dayGanZhi}日）评分${d.score}：${d.reasons.join('；')}`).join('\n') || '无' },
      { heading: '本年凶方', body: `太岁${annualSha.taisui}、岁破${annualSha.suiPo}、三煞${annualSha.sanSha}、五黄${annualSha.fiveYellow}。` },
      { heading: '命卦吉方', body: `命卦${mingGua.trigram}（${mingGua.group}）：${auspiciousDirs.map((d) => d.star + d.direction).join('、')}。` },
      { heading: '淘汰概要', body: rejected.slice(0, 20).map((r) => `${r.date}：${r.reason}`).join('\n') || '无淘汰' },
      { heading: '行动建议', body: recommendations.map((r) => `【${r.label}】${r.value}`).join('\n') },
    ],
    sourceNotes: '综合择日为黄历宜忌+神煞+太岁三煞+命卦方位的多系统聚合参考，民俗传统，非决策绝对依据。',
  };

  const result: ZeriResult = {
    comboName: '综合择日',
    purpose: `黄历宜忌+神煞+太岁三煞+命卦吉方 联合筛选${purpose}吉日`,
    inputs: { birth: { year: birth.year, gender: birth.gender }, purpose, startDate, endDate, targetYear, topN },
    zeriPurpose: purpose,
    range: { start: startDate, end: endDate, scannedDays: candidates.length },
    rankedDays: top,
    rejected: rejected.slice(0, 20),
    personalAuspicious: auspiciousDirs,
    annualSha,
    synthesis,
    recommendations,
    export_snapshot: snapshot,
    engineName: 'ZeriComboEngine',
    mode: solarEntry ? 'local-exact' : 'local-approx',
    confidenceNote: snapshot.sourceNotes!,
  };

  const warnings: string[] = [result.confidenceNote];
  if (!solarEntry) warnings.push('未传入精确历法入口，宜忌取自浏览器 window.Solar；非浏览器环境若 Solar 不可用将无法择日');
  if (candidates.length === 0) warnings.push('日期区间为空或起止颠倒');
  if (top.length === 0) warnings.push(`区间内无符合「${purpose}」的吉日，已列出淘汰原因供参考`);

  return {
    ok: true,
    tool: result.engineName,
    version: '0.1.0',
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings,
  };
}

// ─── Combo 7: 月度运势（流月干支 + 五运六气客气步 + 节气调养 + 紫微流月）───

export interface MonthlyFortuneComboInput {
  birth: BirthInput;
  /** 欲测年份 */
  targetYear: number;
  /** 欲测月份（1-12） */
  targetMonth: number;
  solar?: SolarLike | null;
  /** 体质（节气调养针对性加减，可选） */
  constitution?: string;
}

/** 月度运势结果 */
export interface MonthlyFortuneResult {
  comboName: string;
  purpose: string;
  inputs: Record<string, unknown>;
  /** 月份上下文 */
  context: { year: number; month: number; monthGanZhi: string; jieqi: string };
  /** 各维度子系统 */
  subsystems: WellnessSubsystem[];
  /** 整合结论 */
  synthesis: string;
  /** 综合建议 */
  recommendations: { label: string; value: string; tone: Tone }[];
  export_snapshot: ExportSnapshot;
  engineName: string;
  mode: string;
  confidenceNote: string;
}

/** 月支冲命主生肖（地支六冲） */
const ZHI_CHONG: Record<string, string> = {
  子: '午', 丑: '未', 寅: '申', 卯: '酉', 辰: '戌', 巳: '亥',
  午: '子', 未: '丑', 申: '寅', 酉: '卯', 戌: '辰', 亥: '巳',
};

/**
 * 月度运势 = 流月干支 + 五运六气客气步 + 节气调养 + 紫微流月
 * 把年度运势细化到月，形成「年-月」两级运势切片。
 * - 流月干支：lunar-javascript 取目标月月柱，月支冲命主生肖→凶倾向。
 * - 五运六气：该月所处客气步（currentMonth=targetMonth）。
 * - 节气调养：该月所处节气（queryJieqiWellness）+ 体质针对性加减。
 * - 紫微流月：iztro horoscope monthly 字段，流月四化（化忌入命→凶，化禄入命→吉）。
 */
export function calcMonthlyFortuneCombo(input: MonthlyFortuneComboInput): ToolEnvelope<MonthlyFortuneResult> {
  const { birth, solar, constitution } = input;
  const { targetYear, targetMonth } = input;

  // 流月干支：solar.fromYmd 取月柱
  const solarEntry = (solar ?? null) as { fromYmd?: (y: number, mo: number, d: number) => { getLunar(): { getMonthInGanZhi?: () => string; getJieQiTable?: () => Record<string, unknown> } } } | null;
  let monthGanZhi = '未知';
  let jieQiTable: Record<string, unknown> | undefined;
  try {
    if (solarEntry?.fromYmd) {
      const lunar = solarEntry.fromYmd(targetYear, targetMonth, 15).getLunar();
      if (typeof lunar.getMonthInGanZhi === 'function') monthGanZhi = lunar.getMonthInGanZhi();
      if (typeof lunar.getJieQiTable === 'function') jieQiTable = lunar.getJieQiTable();
    }
  } catch {
    /* 精确历法不可用，月柱取近似 */
  }
  // 近似月支：从月数推（寅月正月起）
  if (monthGanZhi === '未知') {
    const approxBranch = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'][(targetMonth + 10) % 12];
    monthGanZhi = `?${approxBranch}`;
  }
  const monthBranch = monthGanZhi.slice(-1);

  // 命主生肖地支
  const ownerZhiIndex = ((birth.year - 4) % 12 + 12) % 12;
  const ownerZhi = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'][ownerZhiIndex];
  const monthChongOwner = ownerZhi ? ZHI_CHONG[monthBranch] === ownerZhi : false;
  const liuyueTone: Tone = monthChongOwner ? '凶' : '中';

  // 五运六气：该月客气步
  const yunqiEnv = calcYunqiEnveloped({ year: targetYear, birthMonth: birth.month, birthDay: birth.day, solar: (solar ?? null) as never, currentMonth: targetMonth });
  const yunqiData = yunqiEnv.data as { current_step?: { step: string; qi: string; zhuqi: string } | null; export_snapshot?: { summary?: string } };
  const keqiStep = yunqiData.current_step;
  const yunqiTone = toneFromEnvelope(yunqiEnv);

  // 节气调养
  const jieqiQuery = queryJieqiWellness({ year: targetYear, month: targetMonth, day: 15 }, constitution || undefined, jieQiTable);

  // 紫微流月
  const ziweiSummary = getZiweiHoroscopeSummary(
    { year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, gender: birth.gender as '男' | '女' },
    targetYear,
    targetMonth,
  );
  let ziweiMonthlyTone: Tone = '中';
  if (ziweiSummary.available) {
    const jiStar = ziweiSummary.monthly.mutagen[3] ?? '';
    const luStar = ziweiSummary.monthly.mutagen[0] ?? '';
    if (jiStar && ziweiSummary.mingMainStars.includes(jiStar)) ziweiMonthlyTone = '凶';
    else if (luStar && ziweiSummary.mingMainStars.includes(luStar)) ziweiMonthlyTone = '吉';
  }

  const subsystems: WellnessSubsystem[] = [
    { name: '流月干支', summary: `${targetYear}年${targetMonth}月流月${monthGanZhi}（月支${monthBranch}）${monthChongOwner ? '冲命主生肖，月运偏滞' : '与命主无冲'}。` },
    { name: '五运六气', summary: keqiStep ? `该月处「${keqiStep.step}」（客气${keqiStep.qi}，主气${keqiStep.zhuqi}）。${yunqiData.export_snapshot?.summary ?? ''}` : (yunqiData.export_snapshot?.summary ?? '本月运气资料暂未齐备。') },
    { name: '节气调养', summary: `${jieqiQuery.jieqi}（${jieqiQuery.wellness.season}季）：${jieqiQuery.wellness.principle}。饮食${jieqiQuery.wellness.diet}。` },
    { name: '紫微流月', summary: ziweiSummary.available ? `流月${ziweiSummary.monthly.stem}${ziweiSummary.monthly.branch}，流月四化${ziweiSummary.monthly.mutagen.join('、') || '无'}。` : '本月紫微流月资料暂未齐备。' },
  ];

  const tones: Tone[] = [liuyueTone, yunqiTone, '中', ziweiMonthlyTone];
  const ji = tones.filter((t) => t === '吉').length;
  const xiong = tones.filter((t) => t === '凶').length;
  const aligned = ji === 0 || xiong === 0;

  const synthesis = `${targetYear}年${targetMonth}月（流月${monthGanZhi}）月度运势：` +
    `流月${monthChongOwner ? '冲命主偏滞' : '平稳'}、五运六气${toneWord(yunqiTone)}、紫微流月${toneWord(ziweiMonthlyTone)}。` +
    `当月节气${jieqiQuery.jieqi}，宜「${jieqiQuery.wellness.principle}」。` +
    (aligned ? '各维度方向基本一致。' : '各维度有分歧，宜权衡。');

  const recommendations: MonthlyFortuneResult['recommendations'] = [
    { label: '节气饮食', value: jieqiQuery.wellness.diet, tone: '中' },
    { label: '节气起居', value: jieqiQuery.wellness.lifestyle, tone: '中' },
    { label: '节气运动', value: jieqiQuery.wellness.exercise, tone: '中' },
  ];
  if (monthChongOwner) {
    recommendations.push({ label: '流月冲命', value: `本月月支${monthBranch}冲命主生肖${ownerZhi}，重要事项宜稳、防破耗与人际摩擦。`, tone: '凶' });
  }
  if (ziweiSummary.available && ziweiSummary.monthly.mutagen[3]) {
    const jiStar = ziweiSummary.monthly.mutagen[3];
    recommendations.push({ label: '流月化忌', value: `流月${jiStar}化忌${ziweiSummary.mingMainStars.includes(jiStar) ? '入命宫' : ''}，与${jiStar}相关事项宜谨慎。`, tone: ziweiMonthlyTone === '凶' ? '凶' : '中' });
  }
  if (keqiStep) {
    recommendations.push({ label: '运气养生', value: `当月客气${keqiStep.qi}加临主气${keqiStep.zhuqi}，注意${keqiStep.qi}所致病势倾向的调护。`, tone: yunqiTone === '凶' ? '凶' : '中' });
  }
  recommendations.push({ label: '理性提示', value: '月度运势为流月干支+五运六气+节气+紫微流月的多维度参考，非绝对预言。', tone: '中' });

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['月度运势', `${targetYear}年${targetMonth}月`, `流月${monthGanZhi}`, jieqiQuery.jieqi],
    sections: [
      { heading: '整合结论', body: synthesis },
      { heading: '流月干支', body: subsystems[0].summary },
      { heading: '五运六气', body: subsystems[1].summary },
      { heading: '节气调养', body: `${jieqiQuery.jieqi}（${jieqiQuery.wellness.season}季）。调养总则：${jieqiQuery.wellness.principle}。饮食：${jieqiQuery.wellness.diet}。起居：${jieqiQuery.wellness.lifestyle}。运动：${jieqiQuery.wellness.exercise}。穴位：${jieqiQuery.wellness.acupoints}。` },
      { heading: '紫微流月', body: subsystems[3].summary },
      { heading: '本月建议', body: recommendations.map((r) => `【${r.label}】${r.value}`).join('\n') },
    ],
    sourceNotes: '月度运势为多维度聚合参考，民俗传统，非决策绝对依据。',
  };

  const result: MonthlyFortuneResult = {
    comboName: '月度运势',
    purpose: '流月干支+五运六气客气步+节气调养+紫微流月 联合推算某月运势切片',
    inputs: { birth: { year: birth.year, gender: birth.gender }, targetYear, targetMonth, constitution: constitution || undefined },
    context: { year: targetYear, month: targetMonth, monthGanZhi, jieqi: jieqiQuery.jieqi },
    subsystems,
    synthesis,
    recommendations,
    export_snapshot: snapshot,
    engineName: 'MonthlyFortuneComboEngine',
    mode: solarEntry?.fromYmd ? 'local-exact' : 'local-approx',
    confidenceNote: snapshot.sourceNotes!,
  };

  const warnings: string[] = [result.confidenceNote];
  if (!solarEntry?.fromYmd) warnings.push('未传入精确历法入口，流月干支取近似，节气查表走近似');
  if (!ziweiSummary.available) warnings.push('iztro 流月数据不可用，紫微流月维度降级为占位');

  return {
    ok: true,
    tool: result.engineName,
    version: '0.1.0',
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings,
  };
}
