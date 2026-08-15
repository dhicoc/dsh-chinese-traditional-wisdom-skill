/**
 * constitutionAssessEngine — 体质问卷自评本地计算引擎。
 *
 * 与 get_constitution_tendency（按出生年五运六气倾向推断）互补：
 * 本工具按用户实际答题算九种体质转化分 + 主体质 + 调养建议，更贴近真实体质。
 * 供本地运行器调用 assess_constitution 工具。
 */

import type { ToolEnvelope, ExportSnapshot, Tone } from './baseTypes';
import { QUESTIONNAIRE, calculateScoresFromAnswers, type ConstitutionGroup } from './constitutionQuestionnaire';

export interface ConstitutionAnswer {
  /** 体质类型（对应 QUESTIONNAIRE 的 type，如"气虚质"） */
  type: string;
  /** 该题得分（1-5，1=没有 2=很少 3=有时 4=经常 5=总是） */
  score: number;
}

export interface AssessInput {
  /** 用户答题（每题 {type, score}） */
  answers: ConstitutionAnswer[];
}

export interface AssessResult {
  /** 九种体质转化分（0-100） */
  scores: Record<string, number>;
  /** 主体质（得分最高且偏颇体质≥40 或平和质达标） */
  dominantType: string;
  /** 主体质调养 */
  dominantAdvice: ConstitutionGroup;
  /** 各体质调养摘要 */
  advices: Array<{ type: string; score: number; direction: string; diet: string }>;
  tone: Tone;
  synthesis: string;
  export_snapshot: ExportSnapshot;
  engineName: string;
  mode: string;
  confidenceNote: string;
}

function toneFromScore(score: number): Tone {
  if (score >= 60) return '凶'; // 偏颇明显，需调养
  if (score >= 40) return '中';
  return '吉';
}

export function assessConstitution(input: AssessInput): ToolEnvelope<AssessResult> {
  if (!input.answers || !Array.isArray(input.answers) || input.answers.length === 0) {
    return {
      ok: false,
      tool: 'assess_constitution',
      version: '1.0.0',
      input_normalized: { answerCount: 0 },
      data: null as unknown as AssessResult,
      summary: [],
      error: { code: 'NO_ANSWERS', message: '体质自评需传入答题数据（answers: {type, score}[]）。可先用 get_constitution_questionnaire 获取题目。' },
    };
  }

  const scores = calculateScoresFromAnswers(input.answers);

  // 主体质：偏颇体质中≥40 取最高；都<40 则平和质
  const biased = QUESTIONNAIRE.filter((g) => g.type !== '平和质');
  let dominantType = '平和质';
  let maxBiasedScore = 0;
  for (const g of biased) {
    if ((scores[g.type] ?? 0) > maxBiasedScore) {
      maxBiasedScore = scores[g.type] ?? 0;
      dominantType = g.type;
    }
  }
  if (maxBiasedScore < 40) {
    dominantType = '平和质';
  }

  const dominantGroup = QUESTIONNAIRE.find((g) => g.type === dominantType) ?? QUESTIONNAIRE[0];
  const dominantScore = scores[dominantType] ?? 0;

  const advices = QUESTIONNAIRE.map((g) => ({
    type: g.type,
    score: scores[g.type] ?? 0,
    direction: g.direction,
    diet: g.diet,
  })).sort((a, b) => b.score - a.score);

  const tone = dominantType === '平和质' ? '吉' : toneFromScore(dominantScore);

  const biasedList = advices.filter((a) => a.type !== '平和质' && a.score >= 40).map((a) => `${a.type}(${a.score})`);
  const synthesis = `主体质：${dominantType}（转化分${dominantScore}）。${dominantType === '平和质' ? '体质较为平和，继续保持良好作息饮食。' : `调养方向：${dominantGroup.direction}；食疗：${dominantGroup.diet}；穴位：${dominantGroup.acupoints}。`}${biasedList.length ? `兼有偏颇：${biasedList.join('、')}，需兼顾调养。` : ''}`;

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['体质辨识', dominantType],
    sections: [
      { heading: '主体质', body: `根据问卷转化分，主体质为「${dominantType}」（得分${dominantScore}）。${dominantType === '平和质' ? '阴阳气血调和，保持现状即可。' : dominantGroup.direction}` },
      ...(dominantType !== '平和质' ? [
        { heading: '调养建议', body: `调养方向：${dominantGroup.direction}。食疗参考：${dominantGroup.diet}。穴位保健：${dominantGroup.acupoints}。` },
      ] : []),
      { heading: '九种体质得分', body: advices.map((a) => `${a.type}：${a.score}分${a.score >= 40 && a.type !== '平和质' ? '（偏颇明显）' : ''}`).join('；') + '。' },
    ],
    sourceNotes: '体质按《中医九种体质》问卷转化分判定；自评结果仅供参考，具体请咨询中医师。',
  };

  const result: AssessResult = {
    scores,
    dominantType,
    dominantAdvice: dominantGroup,
    advices,
    tone,
    synthesis,
    export_snapshot: snapshot,
    engineName: 'constitutionAssessEngine',
    mode: 'questionnaire-self-assess',
    confidenceNote: '体质按《中医九种体质》问卷转化分判定；自评结果仅供参考，具体请咨询中医师。',
  };

  return {
    ok: true,
    tool: 'assess_constitution',
    version: '1.0.0',
    input_normalized: { answerCount: input.answers.length, dominantType },
    data: result,
    summary: [synthesis],
    warnings: [result.confidenceNote, '本分析为文化参考，非医疗诊断，需咨询医师'],
  };
}

export function assessConstitutionEnveloped(input: AssessInput): ToolEnvelope<AssessResult> {
  return assessConstitution(input);
}

/** 列出问卷题目（供 AI 先取题问用户） */
export function listConstitutionQuestionnaire(): Array<{ type: string; questions: string[] }> {
  return QUESTIONNAIRE.map((g) => ({ type: g.type, questions: g.questions }));
}
