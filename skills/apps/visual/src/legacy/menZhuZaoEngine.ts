/**
 * menZhuZaoEngine — 门主灶三要引擎
 *
 * 门主灶三要是阳宅风水的核心规则：
 * - 门（大门方位）：主宰出入、纳气
 * - 主（主卧方位）：主宰主人健康、夫妻
 * - 灶（厨房方位）：主宰饮食、财运
 *
 * 三者方位五行相生相合为吉，相克相冲为凶。
 * 纯 TS 规则实现，无外部依赖。
 */

import type { ExportSnapshot, Tone } from './baseTypes';

// ─── 常量 ───

/** 八方位→八卦 */
const DIRECTION_BAGUA: Record<string, string> = {
  '北': '坎', '东北': '艮', '东': '震', '东南': '巽',
  '南': '离', '西南': '坤', '西': '兑', '西北': '乾',
};

/** 八卦→五行 */
const BAGUA_WUXING: Record<string, string> = {
  '乾': '金', '兑': '金', '坎': '水', '离': '火',
  '震': '木', '巽': '木', '艮': '土', '坤': '土',
};

/** 五行相生 */
const SHENG: Record<string, string> = { '金': '水', '水': '木', '木': '火', '火': '土', '土': '金' };
/** 五行相克 */
const KE: Record<string, string> = { '金': '木', '木': '土', '土': '水', '水': '火', '火': '金' };

/** 五行→颜色建议 */
const WUXING_COLOR: Record<string, string> = {
  '金': '白色、金色', '木': '绿色、青色', '水': '黑色、蓝色',
  '火': '红色、紫色', '土': '黄色、棕色',
};

// ─── 类型 ───

export interface MenZhuZaoInput {
  /** 大门方位（北/东北/东/东南/南/西南/西/西北） */
  door: string;
  /** 主卧方位 */
  bedroom: string;
  /** 厨房灶位方位 */
  kitchen: string;
}

export interface MenZhuZaoData {
  door: { direction: string; bagua: string; wuxing: string };
  bedroom: { direction: string; bagua: string; wuxing: string };
  kitchen: { direction: string; bagua: string; wuxing: string };
  /** 门主关系 */
  doorBedroomRelation: { type: string; tone: Tone; detail: string };
  /** 门灶关系 */
  doorKitchenRelation: { type: string; tone: Tone; detail: string };
  /** 主灶关系 */
  bedroomKitchenRelation: { type: string; tone: Tone; detail: string };
  /** 综合吉凶 */
  overall: { tone: Tone; summary: string };
  /** 化解建议 */
  remedies: string[];
  export_snapshot: ExportSnapshot;
}

// ─── 计算 ───

function getDirectionInfo(dir: string): { direction: string; bagua: string; wuxing: string } {
  const bagua = DIRECTION_BAGUA[dir] ?? '坎';
  const wuxing = BAGUA_WUXING[bagua] ?? '水';
  return { direction: dir, bagua, wuxing };
}

function relationBetween(a: string, b: string): { type: string; tone: Tone; detail: string } {
  if (a === b) return { type: '比和', tone: '吉', detail: `${a}与${b}同五行，比和相助，和谐平稳。` };
  if (SHENG[a] === b) return { type: '相生', tone: '吉', detail: `${a}生${b}（${a}→${b}），生助有情，吉。` };
  if (SHENG[b] === a) return { type: '相生', tone: '吉', detail: `${b}生${a}（${b}→${a}），受生得助，吉。` };
  if (KE[a] === b) return { type: '相克', tone: '凶', detail: `${a}克${b}（${a}→${b}），克制伤损，凶。宜用通关五行化解。` };
  if (KE[b] === a) return { type: '相克', tone: '凶', detail: `${b}克${a}（${b}→${a}），受克受损，凶。宜用通关五行化解。` };
  return { type: '无关系', tone: '中', detail: `${a}与${b}无生克关系。` };
}

/** 通关化解：a克b，用中间五行通关（如金克木，用水通关） */
function tongGuan(a: string, b: string): string | null {
  if (KE[a] !== b) return null;
  // 找中间五行：a生X，X生b
  for (const wx of ['金', '木', '水', '火', '土']) {
    if (SHENG[a] === wx && SHENG[wx] === b) {
      return `宜用${WUXING_COLOR[wx]}（${wx}）通关：${a}生${wx}生${b}，化克为生。`;
    }
  }
  return null;
}

export function calcMenZhuZao(input: MenZhuZaoInput): MenZhuZaoData {
  const door = getDirectionInfo(input.door);
  const bedroom = getDirectionInfo(input.bedroom);
  const kitchen = getDirectionInfo(input.kitchen);

  const doorBedroomRelation = relationBetween(door.wuxing, bedroom.wuxing);
  const doorKitchenRelation = relationBetween(door.wuxing, kitchen.wuxing);
  const bedroomKitchenRelation = relationBetween(bedroom.wuxing, kitchen.wuxing);

  // 综合吉凶
  const relations = [doorBedroomRelation, doorKitchenRelation, bedroomKitchenRelation];
  const auspicious = relations.filter(r => r.tone === '吉').length;
  const inauspicious = relations.filter(r => r.tone === '凶').length;
  let overallTone: Tone = '中';
  let overallSummary: string;
  if (auspicious >= 2 && inauspicious === 0) {
    overallTone = '吉';
    overallSummary = `门主灶三要：三组关系全吉或两吉一平，格局优良。`;
  } else if (inauspicious >= 2) {
    overallTone = '凶';
    overallSummary = `门主灶三要：两组以上相克，格局不佳，需化解。`;
  } else {
    overallTone = '中';
    overallSummary = `门主灶三要：一吉一凶一平，格局一般，部分需调整。`;
  }

  // 化解建议
  const remedies: string[] = [];
  if (doorBedroomRelation.tone === '凶') {
    const tg = tongGuan(door.wuxing, bedroom.wuxing) ?? tongGuan(bedroom.wuxing, door.wuxing);
    if (tg) remedies.push(`门主${doorBedroomRelation.type}：${tg}`);
  }
  if (doorKitchenRelation.tone === '凶') {
    const tg = tongGuan(door.wuxing, kitchen.wuxing) ?? tongGuan(kitchen.wuxing, door.wuxing);
    if (tg) remedies.push(`门灶${doorKitchenRelation.type}：${tg}`);
  }
  if (bedroomKitchenRelation.tone === '凶') {
    const tg = tongGuan(bedroom.wuxing, kitchen.wuxing) ?? tongGuan(kitchen.wuxing, bedroom.wuxing);
    if (tg) remedies.push(`主灶${bedroomKitchenRelation.type}：${tg}`);
  }
  if (remedies.length === 0 && inauspicious === 0) {
    remedies.push('门主灶三要格局和谐，无需特别化解。可在吉位摆放对应五行颜色饰品增强。');
  }

  const snapshot: ExportSnapshot = {
    summary: overallSummary,
    tags: ['门主灶三要', `门${door.bagua}(${door.wuxing})`, `主${bedroom.bagua}(${bedroom.wuxing})`, `灶${kitchen.bagua}(${kitchen.wuxing})`, overallTone === '吉' ? '格局优良' : overallTone === '凶' ? '需化解' : '格局一般'],
    sections: [
      { heading: '门主关系', body: `大门${door.direction}（${door.bagua}宫${door.wuxing}）↔ 主卧${bedroom.direction}（${bedroom.bagua}宫${bedroom.wuxing}）：${doorBedroomRelation.detail}` },
      { heading: '门灶关系', body: `大门${door.direction}（${door.bagua}宫${door.wuxing}）↔ 厨房${kitchen.direction}（${kitchen.bagua}宫${kitchen.wuxing}）：${doorKitchenRelation.detail}` },
      { heading: '主灶关系', body: `主卧${bedroom.direction}（${bedroom.bagua}宫${bedroom.wuxing}）↔ 厨房${kitchen.direction}（${kitchen.bagua}宫${kitchen.wuxing}）：${bedroomKitchenRelation.detail}` },
      { heading: '综合判定', body: overallSummary },
      ...(remedies.length > 0 ? [{ heading: '化解建议', body: remedies.join('\n') }] : []),
    ],
    sourceNotes: '门主灶三要为传统阳宅风水规则，仅供参考。实际布局请结合专业风水师意见。',
  };

  return {
    door, bedroom, kitchen,
    doorBedroomRelation, doorKitchenRelation, bedroomKitchenRelation,
    overall: { tone: overallTone, summary: overallSummary },
    remedies,
    export_snapshot: snapshot,
  };
}
