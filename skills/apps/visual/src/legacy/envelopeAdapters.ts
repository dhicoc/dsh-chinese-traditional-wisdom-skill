/**
 * envelopeAdapters.ts —— A 类纯 TS 引擎的 ToolEnvelope 适配层
 *
 * 架构层优化第 2 步：把已确认为 A 类（零 DOM 依赖）的引擎各包一个
 * `xxxEnveloped` 函数，统一返回 ToolEnvelope，供本地运行器直接调用。
 *
 * 收录引擎：
 * - calcXiYongEnveloped   喜用神推算（输入：日主五行 + 五行计数）
 * - calcNameRatingEnveloped 姓名五维评分（输入：姓 + 名 + 出生年）
 * - getConstitutionTendencyEnveloped 五运六气体质倾向（输入：岁运/司天/在泉 或 yunqiData）
 *
 * 设计原则：
 * - 不替换原函数，原调用方继续用 calcXiYong/calcNameRating/...，零回归。
 * - envelope 的 data 主体 = 原结果 + export_snapshot（稳定段表，供 LLM/报告渲染）。
 * - 全部纯计算，无 window/document/canvas 依赖，Node 可直接 import。
 */

import { calcXiYong, type XiYongResult } from './xiyong';
import { calcNameRating, type NameRatingResult } from './nameRating';
import { analyzeName } from './nameWuxing';
import { getConstitutionTendency, type ConstitutionTendency } from './constitutionTendency';
import { wrapEnvelope, type ToolEnvelope, type ExportSnapshot } from './baseTypes';

// ──────────────────────────────────────────────────────────────────────
//  喜用神
// ──────────────────────────────────────────────────────────────────────

export interface XiYongData extends XiYongResult {
  export_snapshot: ExportSnapshot;
}

/**
 * 喜用神推算 —— ToolEnvelope 版本。
 * @param dayMasterWuxing 日主五行（如「金」）
 * @param elements 五行计数 {木,火,土,金,水}
 */
export function calcXiYongEnveloped(
  dayMasterWuxing: string,
  elements: Record<string, number>,
): ToolEnvelope<XiYongData> {
  const input = { dayMasterWuxing, elements };
  const result = calcXiYong(dayMasterWuxing, elements);

  const elSummary = Object.keys(elements).map((k) => `${k}:${elements[k]}`).join(' ');
  const snapshot: ExportSnapshot = {
    summary: `日主${dayMasterWuxing}，同类${result.similarPoint}分、异类${result.heterogeneousPoint}分，判为${result.qiangRuo}，喜用神为${result.shen}。`,
    tags: ['喜用神', dayMasterWuxing + '命', result.qiangRuo, '喜' + result.shen],
    sections: [
      { heading: '强弱判断', body: `同类（日主${dayMasterWuxing}+印${result.similar.slice(1).join('')}）${result.similarPoint}分，异类${result.heterogeneousPoint}分。${result.qiangRuo}。` },
      { heading: '喜用神', body: `${result.qiangRuo} → 喜用神取${result.shen}。${result.confidenceNote}` },
      { heading: '五行分布', body: elSummary || '无' },
    ],
    sourceNotes: result.confidenceNote,
  };

  return wrapEnvelope(
    { ...result, engineName: 'XiYongAdapter', mode: 'local', confidenceNote: result.confidenceNote },
    input,
    snapshot,
  ) as unknown as ToolEnvelope<XiYongData>;
}

// ──────────────────────────────────────────────────────────────────────
//  姓名五维评分
// ──────────────────────────────────────────────────────────────────────

export interface NameRatingData extends NameRatingResult {
  export_snapshot: ExportSnapshot;
}

/**
 * 姓名五维评分 —— ToolEnvelope 版本。
 * 从最原始输入（姓 + 名 + 出生年）一路算到评分。
 * @param surname 姓氏（如「张」）
 * @param givenName 名（如「伟」）
 * @param birthYear 出生年（用于生肖契合度），可选
 */
export async function calcNameRatingEnveloped(
  surname: string,
  givenName: string,
  birthYear?: number,
  birth?: { year: number; month: number; day: number; hour: number; minute?: number; gender?: string },
  solar?: unknown,
): Promise<ToolEnvelope<NameRatingData>> {
  const input = { surname, givenName, birthYear, birth };
  const analysis = await analyzeName(surname, givenName);
  const result = calcNameRating(analysis, birthYear, birth, solar);

  const dimDetail = result.dimensions.map((d) => `${d.name}${d.score}分(权重${d.weight}%):${d.detail}`).join('；');
  const snapshot: ExportSnapshot = {
    summary: `姓名「${surname}${givenName}」综合${result.totalScore}分，等级${result.grade}。`,
    tags: ['姓名评分', result.grade, birth ? `${birth.year}年生（含八字用神补强）` : birthYear ? `${birthYear}年生` : '未提供出生年'],
    sections: [
      { heading: '综合评级', body: `总分${result.totalScore}，等级「${result.grade}」。${result.confidenceNote}` },
      { heading: '五维明细', body: dimDetail || '无' },
    ],
    sourceNotes: result.confidenceNote,
  };

  const env = wrapEnvelope(
    { ...result, engineName: 'NameRatingAdapter', mode: 'local', confidenceNote: result.confidenceNote },
    input,
    snapshot,
  ) as unknown as ToolEnvelope<NameRatingData>;
  if (analysis.hasUnrecorded) {
    env.warnings = [...(env.warnings ?? []), '姓名含未收录字，笔画为估算，评分仅供参考'];
  }
  return env;
}

// ──────────────────────────────────────────────────────────────────────
//  五运六气体质倾向
// ──────────────────────────────────────────────────────────────────────

export interface ConstitutionTendencyData extends ConstitutionTendency {
  export_snapshot: ExportSnapshot;
}

/**
 * 五运六气体质倾向 —— ToolEnvelope 版本。
 * @param yunqiData 五运六气结果（需含 wuyun.dayun / liuqi.sitian / liuqi.zaiquan）
 */
export function getConstitutionTendencyEnveloped(
  yunqiData: { wuyun?: { dayun: string }; liuqi?: { sitian: string; zaquan: string } },
): ToolEnvelope<ConstitutionTendencyData> {
  const input = {
    dayun: yunqiData?.wuyun?.dayun ?? '',
    sitian: yunqiData?.liuqi?.sitian ?? '',
    zaquan: yunqiData?.liuqi?.zaquan ?? '',
  };
  const result = getConstitutionTendency(yunqiData);

  // getConstitutionTendency 可能返回 null（岁运/司天都空）
  if (!result) {
    return {
      ok: false,
      tool: 'ConstitutionTendencyAdapter',
      version: 'local',
      input_normalized: input,
      data: {} as ConstitutionTendencyData,
      error: { code: 'insufficient_input', message: '岁运与司天均为空，无法推算体质倾向' },
    };
  }

  const tendencyList = result.tendencies.map((t) => `${t.type}（${t.reason}）`).join('、');
  const snapshot: ExportSnapshot = {
    summary: `岁运${result.dayun}、司天${result.sitian}、在泉${result.zaiquan}，体质倾向参考：${result.tendencies.map((t) => t.type).join('、')}。`,
    tags: ['五运六气体质', result.dayun, result.sitian],
    sections: [
      { heading: '运气背景', body: `岁运${result.dayun}，司天${result.sitian}，在泉${result.zaiquan}。` },
      { heading: '体质倾向', body: tendencyList || '无明确倾向。' },
      { heading: '边界说明', body: result.note },
    ],
    sourceNotes: result.note,
  };

  return wrapEnvelope(
    { ...result, engineName: 'ConstitutionTendencyAdapter', mode: 'local', confidenceNote: result.note },
    input,
    snapshot,
  ) as unknown as ToolEnvelope<ConstitutionTendencyData>;
}
