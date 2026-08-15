/**
 * envelopeEvidence — 证据链协议（借鉴 mingyu prompt-evidence 设计思想）
 *
 * 把"口径披露 / 不伪造证据"从 prompt 软约束升级为**类型强制**的结构：
 * 每个引擎输出可带 evidence，记录计算步骤、事实断言（含边界限制）、口径说明。
 * AI 解读时必须基于 evidence 转述，不能凭模型自身知识补数值。
 *
 * 设计原则：
 * - evidence 只进 ToolEnvelope.data，**不进 UI 文案**（UI 只消费 summary）
 * - 每条事实可溯源（source 指向古籍/历表/算法）
 * - limitation 封死解释边界：只记录盘面资料，不得由单柱推出性格/六亲/健康等
 */

/** 证据等级：主证=核心依据 / 辅证=旁证 / 反证=反向依据 / 限制=边界说明 / 应期=时间应象 */
export type EvidenceLevel = '主证' | '辅证' | '反证' | '限制' | '应期';

/** 单条事实/证据条目 */
export interface PromptEvidenceItem {
  level: EvidenceLevel;
  /** 断言标题，如「日主丙火偏弱」 */
  title: string;
  /** 详情（可选） */
  detail?: string;
  /** 来源（古籍/历表/算法/引擎步骤），如「lunar-javascript 节气表」 */
  source?: string;
  /** 标签（可选，如 "四柱" "大运" "神煞"） */
  tags?: string[];
}

/** 计算步骤（引擎内部如何算出结果，可审计） */
export interface CalculationStep {
  /** 步骤标识 */
  key: string;
  /** 阶段，如「定盘」「四柱生成」「大运推算」 */
  stage: string;
  /** 状态：ok=精确 / approx=近似 / fallback=降级 */
  status: 'ok' | 'approx' | 'fallback';
  /** 输入摘要 */
  inputs?: unknown;
  /** 输出摘要 */
  result?: unknown;
  /** 依赖的步骤 key */
  dependsOnStepKeys?: string[];
  /** 供 AI 解读的步骤说明文本 */
  promptText: string;
  /** 来源（可选） */
  sources?: string[];
  /** 该步骤的边界限制（可选） */
  limitation?: string;
}

/** 证据链集合（附加到 ToolEnvelope 的 data 上） */
export interface EvidenceBundle {
  /** 计算步骤链（可审计） */
  steps: CalculationStep[];
  /** 事实断言（可溯源） */
  facts: PromptEvidenceItem[];
  /** 边界限制汇总 */
  limitations: string[];
}

/** 结果元数据：版本/算法/口径/哈希（借鉴 mingyu result.ts 设计思想） */
export interface ResultMeta {
  /** 引擎版本 */
  engineVersion: string;
  /** 证据结构版本 */
  evidenceSchemaVersion: string;
  /** 采用的算法/流派，如「子平格局派」 */
  algorithm?: string;
  /** 实际采用口径（如真太阳时/平太阳时、立春/正月初一分界） */
  calculationConfig?: Record<string, unknown>;
}

/** 稳定序列化：拒绝 NaN/Infinity/循环引用，用于输入哈希 */
export function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, val) => {
    if (typeof val === 'number' && !Number.isFinite(val)) return undefined;
    if (val && typeof val === 'object') {
      if (seen.has(val)) return undefined;
      seen.add(val);
    }
    return val;
  });
}

/** FNV-1a 64 位哈希（简化 32 位版，够用于去重/标识） */
export function hashStableValue(value: unknown): string {
  const str = stableStringify(value) ?? '';
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** 规范化 + 去重证据条目（按 level|title|detail|source 拼 key） */
export function normalizeEvidence(items: PromptEvidenceItem[]): PromptEvidenceItem[] {
  const seen = new Set<string>();
  const out: PromptEvidenceItem[] = [];
  for (const item of items) {
    const key = [item.level, item.title, item.detail ?? '', item.source ?? ''].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      level: item.level,
      title: item.title.trim(),
      detail: item.detail?.trim(),
      source: item.source,
      tags: item.tags,
    });
  }
  // 排序：主证 → 辅证 → 反证 → 应期 → 限制
  const order: Record<EvidenceLevel, number> = { 主证: 0, 辅证: 1, 反证: 2, 应期: 3, 限制: 4 };
  return out.sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9));
}
