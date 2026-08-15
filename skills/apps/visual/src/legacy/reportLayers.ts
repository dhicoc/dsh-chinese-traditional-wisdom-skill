/**
 * reportLayers — 报告四层显式分层（ROADMAP 功能层增强 Step 2）
 *
 * 把 toReading()/export_snapshot 的平铺 sections 归类为四层显式分层：
 *   1. tldr        — 一句话总结 + 总体吉凶定调（取 summary）
 *   2. highlights  — 关键亮点 / 风险点（用神/用星/吉位/凶位/应期/格局等核心结论，带 tone）
 *   3. details     — 详细分析 + 古典依据（剩余 sections）
 *   4. actions     — 可执行建议（布局/化解/择日/策略等，带 category）
 *
 * 设计原则：
 * - 不改 toReading/export_snapshot 的返回结构（向后兼容），只在渲染层重组。
 * - 归类按 heading 关键词匹配；无命中的 section 全放 details（安全兜底）。
 * - tone 由 body 内容关键词判定（大吉/吉/中平/凶/大凶/不利/身强/身弱等）。
 * - 专项解读模式 toFocusedReport 按 question 关键词过滤 highlights/actions。
 */

// ─── 类型 ───

export interface ReadingSection {
  heading: string;
  body: string;
}

export interface ReadingLike {
  summary: string;
  tags?: string[];
  sections: ReadingSection[];
  sourceNotes?: string;
}

// Tone 已收口到 baseTypes，此处 re-export 保持既有导入路径兼容
export type Tone = import('./baseTypes').Tone;

/** 强弱维度（用于日主强弱等中性但需醒目的 highlight，独立于吉凶 tone） */
export type Strength = '强' | '弱' | null;

export interface Highlight {
  label: string;
  value: string;
  tone: Tone;
  /** 强弱标识（从 body 检测偏强/身强/偏弱/身弱，命理中性，不占吉凶 tone） */
  strength: Strength;
}

export type ActionCategory = '生活调整' | '养生' | '心性' | '择吉' | '决策';

export interface Action {
  text: string;
  category: ActionCategory;
}

export interface LayerReport {
  /** 第一层：一句话总结 + 总体吉凶定调 */
  tldr: string;
  /** 总体吉凶定调（从 tldr/tags 推断） */
  overallTone: Tone;
  /** 第二层：关键亮点 / 风险点 */
  highlights: Highlight[];
  /** 第三层：详细分析 + 古典依据 */
  details: ReadingSection[];
  /** 第四层：可执行建议 */
  actions: Action[];
  /** 来源说明 */
  sourceNotes?: string;
  /** 原始 tags（透传） */
  tags?: string[];
}

export interface StructuredFact {
  label: string;
  value: string;
  tool: string;
}

export interface StructuredFactCheck {
  fact: StructuredFact;
  validation: { valid: boolean };
}

export interface SemanticReport {
  facts: StructuredFact[];
  traditionalInterpretations: ReadingSection[];
  actions: Action[];
  disclaimers: string[];
}

export const DEFAULT_TRADITIONAL_DISCLAIMER = '本报告提供传统文化解释参考，不构成对现实结果、医疗、法律或财务事项的保证或专业建议。';

export interface UserPresentation {
  state: 'success' | 'error';
  report: LayerReport | null;
  semanticReport: SemanticReport | null;
  exportReport: ReadingLike | null;
  notices: string[];
  warnings: string[];
  error?: { code: string; message: string };
}

// ─── 归类规则 ───

/** 核心结论类 heading → 归 highlights */
const HIGHLIGHT_HEADINGS = [
  '命宫', '四化', '值符值使', '世应用神', '体用生克', '喜用神',
  '日主强弱', '日主力量', '强弱判断', '格局', '遁局', '综合评级', '卦象',
];

/** 可执行建议类 heading → 归 actions */
const ACTION_HEADINGS = ['策略指导', '化解', '布局建议', '择日', '行动建议'];

/** 技术细节类 heading → 直接剔除（不展示给用户，属内部实现/口径说明）
 *  这些是给 AI/开发者的，非命理结论：起卦方式、边界说明、年份边界、口径差异等 */
const TECHNICAL_HEADINGS = ['起卦方式', '边界说明', '年份边界', '说明', '口径', '引擎', '历法', '版本'];

/** action 分类关键词（用于判定 category） */
const ACTION_CATEGORY_KW: Array<{ kw: string[]; category: ActionCategory }> = [
  { kw: ['进', '退', '变', '守', '顺', '出击', '保守', '静观', '主动', '把握'], category: '决策' },
  { kw: ['布局', '方位', '摆放', '财位', '催财', '化煞', '卧室', '厨房', '书房'], category: '生活调整' },
  { kw: ['养生', '食疗', '经络', '作息', '锻炼', '饮食', '体质'], category: '养生' },
  { kw: ['禅', '修心', '心性', '情绪', '豁达', '随缘', '放下'], category: '心性' },
  { kw: ['择日', '择吉', '时机', '时间窗口', '宜', '忌'], category: '择吉' },
];

/** tone 判定关键词 */
const TONE_KW: Array<{ kw: string[]; tone: Tone }> = [
  { kw: ['大吉', '吉格', '用生体', '可成', '身强', '高', '旺', '相', '阳遁', '生门', '休门', '开门'], tone: '吉' },
  { kw: ['大凶', '凶格', '用克体', '不利', '大凶', '身弱', '死', '囚', '绝命', '五鬼', '祸害', '六煞', '死门', '惊门', '伤门'], tone: '凶' },
  { kw: ['中平', '比和', '平顺', '平衡', '伏位', '景门', '杜门'], tone: '中' },
];

/** 从文本判定 tone */
function detectTone(text: string): Tone {
  for (const { kw, tone } of TONE_KW) {
    if (kw.some((k) => text.includes(k))) return tone;
  }
  return '中';
}

/** 检测强弱维度（独立于吉凶，用于日主强弱等中性信息） */
function detectStrength(text: string): Strength {
  if (/偏强|身强|偏旺|得令|得地|得势/.test(text)) return '强';
  if (/偏弱|身弱|偏衰|失令|失地|失势/.test(text)) return '弱';
  return null;
}

/** 判定 action 分类 */
function detectActionCategory(text: string): ActionCategory {
  for (const { kw, category } of ACTION_CATEGORY_KW) {
    if (kw.some((k) => text.includes(k))) return category;
  }
  return '生活调整';
}

/** 从 summary/tags 推断总体吉凶定调 */
function detectOverallTone(summary: string, tags?: string[]): Tone {
  const text = summary + (tags ? ' ' + tags.join(' ') : '');
  return detectTone(text);
}

// ─── 主函数 ───

/**
 * 把平铺 reading 归类为四层 LayerReport。
 * @param reading toReading()/export_snapshot 返回值（需含 summary + sections）
 */
export function toFourLayer(reading: ReadingLike): LayerReport {
  const highlights: Highlight[] = [];
  const details: ReadingSection[] = [];
  const actions: Action[] = [];

  for (const section of reading.sections) {
    // 技术细节段直接剔除（起卦方式/边界说明/口径等，不展示给用户）
    if (TECHNICAL_HEADINGS.some((h) => section.heading.includes(h))) continue;
    const isHighlight = HIGHLIGHT_HEADINGS.some((h) => section.heading.includes(h));
    const isAction = ACTION_HEADINGS.some((h) => section.heading.includes(h));

    if (isHighlight) {
      // 提取 body 的核心句（首句或全 body 截断）
      const coreValue = section.body.split('。')[0] || section.body;
      highlights.push({
        label: section.heading,
        value: coreValue.slice(0, 80),
        tone: detectTone(section.body),
        strength: detectStrength(section.body),
      });
      // 高亮段也保留进 details 供详细查看？不——高亮段不重复进 details，避免冗余
    } else if (isAction) {
      // body 可能含多条建议，按句拆
      const sentences = section.body.split(/[；。\n]/).filter((s) => s.trim().length > 2);
      for (const s of sentences) {
        if (s.trim().length < 4) continue;
        actions.push({ text: s.trim(), category: detectActionCategory(s) });
      }
    } else {
      details.push(section);
    }
  }

  return {
    tldr: reading.summary,
    overallTone: detectOverallTone(reading.summary, reading.tags),
    highlights,
    details,
    actions,
    sourceNotes: reading.sourceNotes,
    tags: reading.tags,
  };
}

export function toSemanticReport(
  reading: ReadingLike,
  options: {
    factChecks?: StructuredFactCheck[];
    disclaimers?: string[];
  } = {},
): SemanticReport {
  const layered = toFourLayer(reading);
  return {
    facts: (options.factChecks ?? [])
      .filter(({ validation }) => validation.valid)
      .map(({ fact }) => fact),
    traditionalInterpretations: [
      ...layered.highlights.map(({ label, value }) => ({ heading: label, body: value })),
      ...layered.details,
    ],
    actions: layered.actions,
    disclaimers: uniqueText(options.disclaimers ?? []),
  };
}

type EnvelopeData = {
  export_snapshot?: ReadingLike;
  timeSource?: { notice?: unknown };
};

type EnvelopeLike = {
  ok: boolean;
  data?: EnvelopeData;
  warnings?: unknown;
  error?: { code?: unknown; message?: unknown };
};

function uniqueText(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim()))];
}

const INTERNAL_WARNING_PATTERN = /lunar-javascript|solar\b|6tail|adapter|engine|\b(?:source|tool|version|mode|provider|evidence|result_meta|timeSource|engineName)\b|本地(?:表|简化|快速)|全局对象|字段|文件名|\.tsx?\b|\.json\b/i;
const GENERIC_CALENDAR_NOTICE = '本次推算已按传统历法口径处理，结果仅作传统文化参考。';

export function toUserWarnings(values: unknown[]): string[] {
  return uniqueText(values).map((warning) => (
    INTERNAL_WARNING_PATTERN.test(warning) ? GENERIC_CALENDAR_NOTICE : warning
  )).filter((warning, index, warnings) => warnings.indexOf(warning) === index);
}

/**
 * 将 ToolEnvelope 收束为用户可见呈现模型。
 * 正文只取 export_snapshot；计算状态与 warnings 单独保留；内部 evidence、result_meta 与 sourceNotes 不进入导出内容。
 */
export function toUserPresentation(
  envelope: EnvelopeLike,
  semanticOptions: {
    factChecks?: StructuredFactCheck[];
    disclaimers?: string[];
  } = {},
): UserPresentation {
  if (!envelope.ok) {
    const message = typeof envelope.error?.message === 'string' && envelope.error.message.trim()
      ? envelope.error.message.trim()
      : '本次计算未能完成，请核对输入后重试。';
    return {
      state: 'error',
      report: null,
      semanticReport: null,
      exportReport: null,
      notices: [],
      warnings: [],
      error: {
        code: typeof envelope.error?.code === 'string' && envelope.error.code.trim() ? envelope.error.code : 'calculation_failed',
        message,
      },
    };
  }

  const snapshot = envelope.data?.export_snapshot;
  const timeSourceNotice = envelope.data?.timeSource?.notice;
  return {
    state: 'success',
    report: snapshot ? toFourLayer(snapshot) : null,
    semanticReport: snapshot ? toSemanticReport(snapshot, semanticOptions) : null,
    exportReport: snapshot ? { summary: snapshot.summary, sections: snapshot.sections } : null,
    notices: uniqueText([timeSourceNotice]),
    warnings: toUserWarnings(Array.isArray(envelope.warnings) ? envelope.warnings : []),
  };
}

// ─── 专项解读模式 ───

/** 问题领域 → 关键词 */
const QUESTION_DOMAINS: Array<{ domain: string; kw: string[] }> = [
  { domain: '事业', kw: ['事业', '工作', '求职', '升职', '晋升', '换工作', '转型', '官禄', '官', '职位', '求职'] },
  { domain: '财运', kw: ['财', '钱', '利', '收益', '生意', '买卖', '股票', '投资', '财运', '效益'] },
  { domain: '健康', kw: ['健康', '病', '疾', '体质', '养生', '身体', '疾病', '医疗'] },
  { domain: '感情', kw: ['感情', '婚姻', '婚恋', '恋爱', '夫妻', '伴侣', '合婚', '桃花', '男友', '女友', '丈夫', '妻子'] },
  { domain: '学业', kw: ['学业', '考试', '读书', '学习', '升学', '文昌'] },
  { domain: '风水', kw: ['风水', '房子', '房屋', '住宅', '办公室', '布局', '朝向', '方位', '选址'] },
];

/** 识别问题领域 */
export function detectQuestionDomain(question: string): string | null {
  for (const { domain, kw } of QUESTION_DOMAINS) {
    if (kw.some((k) => question.includes(k))) return domain;
  }
  return null;
}

/** 领域 → 关联的 highlight label / action category 关键词 */
const DOMAIN_RELEVANT: Record<string, { highlightKw: string[]; actionCategories: ActionCategory[] }> = {
  事业: { highlightKw: ['官禄', '官', '事业', '格局', '值符', '世应用神', '日主强弱'], actionCategories: ['决策', '择吉'] },
  财运: { highlightKw: ['财', '妻财', '财位', '值符', '喜用神', '体用生克'], actionCategories: ['决策', '生活调整'] },
  健康: { highlightKw: ['疾病', '体质', '司天', '岁运', '日主强弱', '喜用神'], actionCategories: ['养生'] },
  感情: { highlightKw: ['夫妻', '桃花', '命宫', '世应用神', '体用生克'], actionCategories: ['心性', '生活调整'] },
  学业: { highlightKw: ['文昌', '喜用神', '命宫', '格局'], actionCategories: ['择吉', '决策'] },
  风水: { highlightKw: ['方位', '值符值使', '遁局', '格局'], actionCategories: ['生活调整', '择吉'] },
};

/**
 * 专项解读模式：根据问题过滤 highlights/actions，只给与问题相关的层。
 * @param reading 平铺 reading
 * @param question 用户问题（如"今年适合换工作吗"）
 */
export function toFocusedReport(reading: ReadingLike, question: string): LayerReport {
  const full = toFourLayer(reading);
  const domain = detectQuestionDomain(question);
  if (!domain) return full; // 无法识别领域 → 返回完整四层

  const relevant = DOMAIN_RELEVANT[domain];
  if (!relevant) return full;

  // 过滤 highlights：label 或 value 含领域相关关键词
  const filteredHighlights = full.highlights.filter(
    (h) => relevant.highlightKw.some((k) => h.label.includes(k) || h.value.includes(k)),
  );
  // 过滤 actions：只保留相关 category
  const filteredActions = full.actions.filter((a) => relevant.actionCategories.includes(a.category));

  // details 保留全量（详细分析不删，供深入查看），但 tldr 改为领域导向
  const domainTldr = `针对「${question}」的${domain}分析：${full.tldr}`;

  return {
    ...full,
    tldr: domainTldr,
    highlights: filteredHighlights.length ? filteredHighlights : full.highlights,
    actions: filteredActions.length ? filteredActions : full.actions,
  };
}
