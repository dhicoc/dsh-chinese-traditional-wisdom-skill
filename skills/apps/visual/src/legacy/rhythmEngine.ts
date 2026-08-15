/**
 * rhythmEngine — 每日节律（节气调养 + 时辰经络）本地计算引擎。
 *
 * 组合 jieqiWellness（24节气调养+体质针对性建议）+ meridianClock（十二时辰经络当令）
 * 成 ToolEnvelope，供本地运行器调用 get_daily_rhythm 工具。
 * 节气可走 lunar-javascript 精确推算（传 solar）或近似（不传）。
 */

import type { ToolEnvelope, ExportSnapshot, Tone } from './baseTypes';
import { queryJieqiWellness, type JieqiWellness, type ConstitutionJieqiAdvice } from './jieqiWellness';
import { getMeridianByHour, type MeridianHour } from './meridianClock';

interface SolarLike {
  fromYmd(year: number, month: number, day: number): { getLunar(): { getJieQiTable(): Record<string, unknown> } };
}

export interface RhythmInput {
  /** 公历日期 yyyy-mm-dd，默认今天 */
  date?: string;
  /** 时辰（0-23），默认当前小时 */
  hour?: number;
  /** 体质类型（可选，命中节气体质建议） */
  constitution?: string;
  /** 可选 lunar-javascript Solar 入口（精确节气） */
  solar?: SolarLike | null;
}

export interface RhythmResult {
  date: string;
  /** 当前节气 */
  jieqi: string;
  /** 节气调养 */
  wellness: JieqiWellness;
  /** 体质针对性建议 */
  constitutionAdvice: ConstitutionJieqiAdvice[];
  /** 当前时辰经络 */
  meridian: MeridianHour | null;
  /** 口径 */
  mode: 'local-exact' | 'local-approx';
  tone: Tone;
  synthesis: string;
  export_snapshot: ExportSnapshot;
  engineName: string;
  confidenceNote: string;
}

export function getDailyRhythm(input: RhythmInput = {}): ToolEnvelope<RhythmResult> {
  const now = new Date();
  const dateStr = input.date?.trim() || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return {
      ok: false,
      tool: 'get_daily_rhythm',
      version: '1.0.0',
      input_normalized: { date: dateStr },
      data: null as unknown as RhythmResult,
      summary: [],
      error: { code: 'BAD_DATE', message: `日期格式无效：${dateStr}，需 yyyy-mm-dd。` },
    };
  }
  const [year, month, day] = parts;
  const hour = input.hour ?? now.getHours();

  // 精确节气表（传 solar 时）
  let jieQiTable: Record<string, unknown> | undefined;
  if (input.solar) {
    try {
      jieQiTable = input.solar.fromYmd(year, month, day).getLunar().getJieQiTable();
    } catch {
      /* 降级近似 */
    }
  }

  const qr = queryJieqiWellness({ year, month, day }, input.constitution, jieQiTable);
  const meridian = getMeridianByHour(hour);

  const tone: Tone = '中';
  const synthesis = `${dateStr}（${qr.jieqi}）调养：${qr.wellness.principle}。当前${hour}时${meridian ? `属${meridian.meridian}经当令（${meridian.hours}），${meridian.advice}` : ''}。${qr.constitutionAdvice.length ? `体质${input.constitution}针对性建议：${qr.constitutionAdvice[0].advice}` : ''}`;

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['每日节律', qr.jieqi, meridian?.meridian ?? ''],
    sections: [
      { heading: '当前节气', body: `${dateStr}处于「${qr.jieqi}」节气（${qr.wellness.season}）。${qr.wellness.feature}。调养总则：${qr.wellness.principle}` },
      { heading: '节气调养', body: `饮食：${qr.wellness.diet}。起居：${qr.wellness.lifestyle}。运动：${qr.wellness.exercise}。穴位保健：${qr.wellness.acupoints}。` },
      ...(qr.constitutionAdvice.length ? [{ heading: '体质针对性建议', body: qr.constitutionAdvice.map((a) => `${a.type}：${a.advice}`).join('；') + '。' }] : []),
      ...(meridian ? [{ heading: '时辰经络', body: `${meridian.time}（${meridian.hours}）属${meridian.meridian}经当令，对应${meridian.organ}。${meridian.advice}` }] : []),
    ],
    sourceNotes: '节气与经络内容仅作传统养生参考。',
  };

  const result: RhythmResult = {
    date: dateStr,
    jieqi: qr.jieqi,
    wellness: qr.wellness,
    constitutionAdvice: qr.constitutionAdvice,
    meridian,
    mode: qr.mode,
    tone,
    synthesis,
    export_snapshot: snapshot,
    engineName: 'rhythmEngine',
    confidenceNote: '经络时辰内容参照子午流注，属于民俗养生参考。',
  };

  return {
    ok: true,
    tool: 'get_daily_rhythm',
    version: '1.0.0',
    input_normalized: { date: dateStr, hour, constitution: input.constitution },
    data: result,
    summary: [synthesis],
    warnings: [result.confidenceNote],
  };
}

export function getDailyRhythmEnveloped(input: RhythmInput): ToolEnvelope<RhythmResult> {
  return getDailyRhythm(input);
}
