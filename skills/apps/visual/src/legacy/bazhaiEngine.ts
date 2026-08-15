/**
 * bazhaiEngine — 八宅大游年本地计算引擎。
 *
 * 组合 bazhaiHouse（命卦/宅卦/个人八方吉凶/方位分析）+ menZhuZaoEngine（门主灶）
 * + taisuiEngine（太岁三煞）成完整 ToolEnvelope，供本地运行器调用 calc_bazhai。
 * 纯计算，零外部依赖（不依赖 solar，只需出生年+性别推命卦）。
 */

import type { ToolEnvelope, ExportSnapshot, Tone } from './baseTypes';
import {
  calcMingGua,
  getSectorAnalysis,
  type MingGua,
} from './bazhaiHouse';
import { calcMenZhuZao, type MenZhuZaoData } from './menZhuZaoEngine';
import { calcTaisui, type TaisuiData } from './taisuiEngine';
import { resolveBazhaiEngineConfig } from './engineConfig';

export interface BazhaiInput {
  /** 出生年（推命卦，必填） */
  birthYear: number;
  /** 性别（推命卦，必填） */
  gender: '男' | '女';
  /** 大门方位（传则算门主灶） */
  door?: string;
  /** 主卧方位 */
  bedroom?: string;
  /** 厨房灶位方位 */
  kitchen?: string;
  /** 查询年份（算太岁三煞，默认今年） */
  year?: number;
}

export interface BazhaiResult {
  /** 命卦 */
  mingGua: MingGua;
  /** 个人八方吉凶（生气/天医/延年/伏位/绝命/五鬼/六煞/祸害） */
  directions: Array<{ direction: string; star: string; quality: string; meaning: string; advice: string }>;
  /** 门主灶分析（传 door/bedroom/kitchen 时有） */
  menZhuZao?: MenZhuZaoData;
  /** 太岁三煞（按 year） */
  taisui: TaisuiData;
  tone: Tone;
  synthesis: string;
  export_snapshot: ExportSnapshot;
  engineName: string;
  mode: string;
  confidenceNote: string;
}

function toneFromMingGua(group: string, menZhuZao?: MenZhuZaoData): Tone {
  // 门主灶三关系若有凶则整体偏凶，否则按命卦组中性偏吉
  if (menZhuZao) {
    const rels = [menZhuZao.doorBedroomRelation, menZhuZao.doorKitchenRelation, menZhuZao.bedroomKitchenRelation];
    if (rels.some((r) => r.tone === '凶')) return '凶';
    if (rels.every((r) => r.tone === '吉')) return '吉';
  }
  return '中';
}

export function calcBazhai(input: BazhaiInput): ToolEnvelope<BazhaiResult> {
  const config = resolveBazhaiEngineConfig();
  const { birthYear, gender } = input;
  if (!birthYear || !gender) {
    return {
      ok: false,
      tool: 'calc_bazhai',
      version: '1.0.0',
      input_normalized: { birthYear, gender },
      data: null as unknown as BazhaiResult,
      summary: [],
      error: { code: 'MISSING_INPUT', message: '八宅推算需出生年 + 性别（推命卦）。' },
    };
  }

  const mingGua = calcMingGua(birthYear, gender);
  if (!mingGua?.trigram || mingGua.trigram === '?') {
    return {
      ok: false,
      tool: 'calc_bazhai',
      version: '1.0.0',
      input_normalized: { birthYear, gender },
      data: null as unknown as BazhaiResult,
      summary: [],
      error: { code: 'CALC_FAILED', message: `无法推算 ${birthYear} 年${gender}命卦。` },
    };
  }

  const sectorAnalysis = getSectorAnalysis(mingGua.trigram) ?? [];
  const directions = sectorAnalysis.map((s) => ({
    direction: s.direction,
    star: s.use.star,
    quality: s.use.quality,
    meaning: s.use.meaning,
    advice: s.use.advice,
  }));

  // 门主灶（三方位都传才算）
  let menZhuZao: MenZhuZaoData | undefined;
  if (input.door && input.bedroom && input.kitchen) {
    try {
      menZhuZao = calcMenZhuZao({ door: input.door, bedroom: input.bedroom, kitchen: input.kitchen });
    } catch {
      /* 方位不合法则跳过 */
    }
  }

  const year = input.year ?? new Date().getFullYear();
  const taisui = calcTaisui(year);

  const tone = toneFromMingGua(mingGua.group, menZhuZao);

  const luckyDirs = directions.filter((d) => d.quality.includes('吉')).map((d) => `${d.direction}(${d.star})`);
  const unluckyDirs = directions.filter((d) => d.quality.includes('凶')).map((d) => `${d.direction}(${d.star})`);

  const synthesis = `命卦${mingGua.trigram}（${mingGua.group}，卦数${mingGua.num ?? '?'}）。吉方：${luckyDirs.join('、') || '无'}；凶方：${unluckyDirs.join('、') || '无'}。${year}年太岁在${taisui.taisui.direction}、三煞在${taisui.sanSha.direction}，此二方忌动土。${menZhuZao ? `门主灶：门${input.door}主${input.bedroom}灶${input.kitchen}，门主${menZhuZao.doorBedroomRelation.type}（${menZhuZao.doorBedroomRelation.tone}）。` : ''}`;

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['八宅', `${mingGua.trigram}命`, mingGua.group, `${year}年太岁`],
    sections: [
      { heading: '命卦', body: `出生${birthYear}年${gender}，命卦${mingGua.trigram}（${mingGua.group}，卦数${mingGua.num ?? '?'}）。` },
      { heading: '个人八方吉凶', body: directions.map((d) => `${d.direction}：${d.star}（${d.quality}）${d.meaning}`).join('；') + '。' },
      { heading: '吉方用途', body: directions.filter((d) => d.quality.includes('吉')).map((d) => `${d.direction}（${d.star}）：${d.advice}`).join('；') + '。' },
      ...(menZhuZao ? [
        { heading: '门主灶', body: `大门${menZhuZao.door.direction}（${menZhuZao.door.bagua}）、主卧${menZhuZao.bedroom.direction}（${menZhuZao.bedroom.bagua}）、厨房${menZhuZao.kitchen.direction}（${menZhuZao.kitchen.bagua}）。门主${menZhuZao.doorBedroomRelation.type}（${menZhuZao.doorBedroomRelation.tone}）：${menZhuZao.doorBedroomRelation.detail}。门灶${menZhuZao.doorKitchenRelation.type}（${menZhuZao.doorKitchenRelation.tone}）：${menZhuZao.doorKitchenRelation.detail}。主灶${menZhuZao.bedroomKitchenRelation.type}（${menZhuZao.bedroomKitchenRelation.tone}）：${menZhuZao.bedroomKitchenRelation.detail}。` },
      ] : []),
      { heading: '太岁三煞', body: `${year}年太岁在${taisui.taisui.direction}（${taisui.taisui.bagua}），岁破在${taisui.suiPo.direction}，三煞在${taisui.sanSha.direction}（${taisui.sanSha.zhiList.join('、')}）。此三方全年忌动土兴造，宜静。${taisui.taisui.remedy ?? ''}` },
    ],
    sourceNotes: '八宅命卦按出生年+性别推算（东四/西四命）；个人八方与大游星按八宅明镜传统口径，民俗参考。',
  };

  const result: BazhaiResult = {
    mingGua,
    directions,
    menZhuZao,
    taisui,
    tone,
    synthesis,
    export_snapshot: snapshot,
    engineName: 'bazhaiEngine',
    mode: 'local-exact',
    confidenceNote: '八宅命卦按出生年+性别推算；个人八方与大游星按八宅明镜传统口径，民俗参考。',
  };

  return {
    ok: true,
    tool: 'calc_bazhai',
    version: '1.0.0',
    input_normalized: { birthYear, gender, door: input.door, bedroom: input.bedroom, kitchen: input.kitchen, year },
    data: result,
    summary: [synthesis],
    warnings: [result.confidenceNote],
    result_meta: {
      engineVersion: '1.0.0',
      evidenceSchemaVersion: '0.1.0',
      algorithm: '八宅命卦与大游年',
      calculationConfig: { ...config },
    },
  };
}

export function calcBazhaiEnveloped(input: BazhaiInput): ToolEnvelope<BazhaiResult> {
  return calcBazhai(input);
}
