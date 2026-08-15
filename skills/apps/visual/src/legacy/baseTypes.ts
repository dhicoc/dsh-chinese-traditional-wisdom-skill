export type WuxingStats = Record<'木' | '火' | '土' | '金' | '水', number>;

/** 命理通用吉凶定调（吉/中/凶），供 combo 一致性检验与四层报告共用 */
export type Tone = '吉' | '凶' | '中';

import type { EvidenceBundle, ResultMeta } from './envelopeEvidence';

// ──────────────────────────────────────────────────────────────────────
//  ToolEnvelope —— 统一工具输出信封（借鉴 horosa-skill ToolEnvelope）
//
//  目的：让每个引擎 Adapter 的 calculate() 返回统一结构，而非裸对象。
//  这样：(1) React 工作区、报告导出、本地运行器消费同一份结构；
//        (2) Agent 拿到稳定段表（export_snapshot）而非自由文本；
//        (3) 各引擎均可独立调用，无需额外协议包装。
//
//  渐进式策略：旧 Adapter 仍返回裸对象，通过 wrapEnvelope() 包成信封；
//  新引擎直接返回 ToolEnvelope。export_snapshot 放在 data 内部（对齐
//  horosa 真实结构，而非 envelope 顶层）。
//
//  许可证注意：horosa 为 AGPL-3.0，此处仅借鉴字段设计思想，未复制其代码。
// ──────────────────────────────────────────────────────────────────────

/** 引擎版本来源（从 package.json / Adapter 常量读取，不硬编码到类型） */
export interface ToolVersion {
  /** 引擎名，如 "BaziLunarAdapter" */
  tool: string;
  /** 引擎版本号，如 "0.3.0" 或 "iztro@2.5.8" */
  version: string;
}

/** 输入归一化快照：记录实际参与计算的有效输入（脱敏后可入历史/导出） */
export type InputNormalized = Record<string, unknown>;

/**
 * 导出快照：机器可读 + 人类可读的稳定段表，供 LLM 消费与报告渲染。
 * 对应 horosa 的 export_snapshot（放在 data 内部）。
 * 复用现有 toReading() 的 sections 结构，向后兼容。
 */
export interface ExportSnapshot {
  /** 一句话总结 */
  summary: string;
  /** 标签（如 ["八字","木命","身强"]） */
  tags?: string[];
  /** 分段解读：[{ heading, body }]，与 toReading().sections 同构 */
  sections: Array<{ heading: string; body: string }>;
  /** 数据来源说明（对应 toReading().sourceNotes） */
  sourceNotes?: string;
}

/**
 * 统一工具输出信封。
 * ok=false 时 data 可为空，error 必填；ok=true 时 data 必填。
 */
export interface ToolEnvelope<TData = unknown> {
  /** 计算是否成功 */
  ok: boolean;
  /** 引擎名 */
  tool: string;
  /** 引擎版本号 */
  version: string;
  /** 实际参与计算的有效输入（归一化后） */
  input_normalized: InputNormalized;
  /** 计算结果主体（含 export_snapshot 子字段时为 { ..., export_snapshot }） */
  data: TData;
  /** 摘要条目（人类可读的要点列表） */
  summary?: string[];
  /** 警告/注意事项（如降级原因、流派差异、边界提示） */
  warnings?: string[];
  /** 错误信息（ok=false 时必填） */
  error?: { code: string; message: string };
  /** 证据链（口径披露/计算步骤/事实断言，供 AI 转述，不进 UI 文案） */
  evidence?: EvidenceBundle;
  /** 结果元数据（引擎版本/算法/实际口径） */
  result_meta?: ResultMeta;
}

/**
 * 把旧 Adapter 的裸返回值包装成 ToolEnvelope。
 * 供渐进式迁移使用——新引擎应直接返回 ToolEnvelope，无需此函数。
 *
 * @param result 引擎 calculate() 的裸返回值（可能已含 engineName/mode/confidenceNote）
 * @param input  原始输入（用于 input_normalized）
 * @param snapshot 可选的导出快照（来自 toReading()）
 */
export function wrapEnvelope<TData>(
  result: TData & { engineName?: string; mode?: string; confidenceNote?: string; version?: string },
  input: unknown,
  snapshot?: ExportSnapshot | null,
): ToolEnvelope<TData> {
  const r = result as Record<string, unknown>;
  const tool = (r.engineName as string) ?? 'unknown';
  const version = (r.version as string) ?? (r.mode as string) ?? '0';
  const warnings: string[] = [];
  if (r.confidenceNote) warnings.push(String(r.confidenceNote));
  // 若提供了 snapshot，挂到 data 内部（对齐 horosa：export_snapshot 在 data 内）
  const data = snapshot ? { ...result, export_snapshot: snapshot } : result;
  return {
    ok: true,
    tool,
    version,
    input_normalized: (input && typeof input === 'object' ? { ...(input as Record<string, unknown>) } : { value: input }) as InputNormalized,
    data,
    warnings,
  };
}


export interface BaziPillars {
  year: { stem: string; branch: string; hidden?: string[] };
  month: { stem: string; branch: string; hidden?: string[] };
  day: { stem: string; branch: string; hidden?: string[] };
  hour: { stem: string; branch: string; hidden?: string[] };
  dayMaster: string;
  gender: string;
}

export interface YunqiData {
  year: number;
  targetDate?: string;
  tiangan: string;
  dizhi: string;
  wuyun: {
    dayun: string;
    zhuyun: Array<{ element: string; taiShao: '太' | '少' }>;
    keyun: Array<{ element: string; taiShao: '太' | '少' }>;
  };
  liuqi: {
    sitian: string;
    zaiquan: string;
    zhuke: Array<{ step: string; qi: string; start: string; end: string; startDate: string; endDate: string; zhuqi: string }>;
    current_step?: unknown;
    kezhujialin?: string;
  };
  observation?: string;
  disease_tendency?: string;
  patterns?: {
    tianfu: boolean;
    suihui: boolean;
    taiyiTianfu: boolean;
    tongTianfu: boolean;
    tongSuihui: boolean;
    pingqi: boolean;
    qihua: string | null;
    jianhua: string | null;
    zhengdui: { qi: string; type: '正化' | '对化' };
  };
  engineName?: string;
  mode?: string;
  confidenceNote?: string;
}

export const CONSTITUTION_TYPES = [
  '平和质',
  '气虚质',
  '阳虚质',
  '阴虚质',
  '痰湿质',
  '湿热质',
  '血瘀质',
  '气郁质',
  '特禀质',
] as const;

export type ConstitutionType = (typeof CONSTITUTION_TYPES)[number];
export type ConstitutionScores = Record<ConstitutionType, number>;

export interface ConstitutionData {
  scores: ConstitutionScores;
  dominant: ConstitutionType | '';
}

export interface FlyingStarsData {
  year: number;
}

export interface EightMansionsData {
  year: number;
  gender: '男' | '女';
}

export interface FlyingStarsSummary {
  centerStar: number;
  starName: string;
  wuxing: string;
  luck: string;
}

/** 单个九宫格单元（宫位 + 飞星信息） */
export interface FlyingStarCell {
  palace: string;
  starNum: number;
  starName: string;
  wuxing: string;
  luck: string;
}

/** 3×3 九宫飞星网格（行优先：row0=巽离坤，row1=震中兑，row2=艮坎乾） */
export type FlyingStarGrid = FlyingStarCell[][];

export interface EightMansionsSummary {
  trigram: string;
  group: string;
}

/** 八宅单个方向扇区（方向 + 游年星 + 吉凶 + 含义 + 方位角度） */
export interface EightMansionSector {
  direction: string;
  deg: number;
  star: string;
  luck: string;
  meaning: string;
}

/** 八宅命盘完整数据：命卦 + 8 方向扇区 */
export interface EightMansionsGrid {
  trigram: string;
  trigramSymbol: string;
  group: string;
  sectors: EightMansionSector[];
}
