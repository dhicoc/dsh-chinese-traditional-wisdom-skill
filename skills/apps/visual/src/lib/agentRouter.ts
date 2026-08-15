import type { ModuleId } from '@/lib/modules';
import { MODULES, type WisdomModule } from '@/lib/modules';
import type { BirthData } from '@/legacy/birthBridge';
import {
  clampInt,
  parseBirthCommand,
  parseLiuyaoCommand,
  parseMeihuaCommand,
  parseReaderSearchCommand,
  type LiuyaoIntentDetail,
  type MeihuaIntentDetail,
  type ReaderSearchIntentDetail,
} from '@/lib/commandIntents';

/**
 * Agent 路由层（Phase 8 雏形）
 *
 * 把自然语言提问路由到最合适的本地工具模块，并预填上下文。
 * 纯本地规则路由，不调用 LLM，确定性可测。
 */

export interface AgentRoute {
  module: ModuleId;
  reason: string;
  birthPatch?: Partial<BirthData>;
  liuyao?: LiuyaoIntentDetail;
  meihua?: MeihuaIntentDetail;
  reader?: ReaderSearchIntentDetail;
  question?: string;
  /** 次要建议模块（评分接近但未采纳） */
  alternatives?: Array<{ module: ModuleId; reason: string }>;
}

interface ModuleSignal {
  id: ModuleId;
  score: number;
  reason: string;
}

const STOP_WORDS = new Set([
  '的', '了', '吗', '呢', '啊', '我', '想', '看', '查', '问', '请问', '一下',
  '是', '不', '有', '没', '会', '能', '可以', '应该', '这个', '那个',
  'the', 'a', 'an', 'is', 'are', 'can', 'i', 'want', 'to', 'my', 'me',
]);

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[，。？！,.?!、；;：:]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

function scoreModule(query: string, module: WisdomModule): number {
  const lower = query.toLowerCase();
  let score = 0;

  // 标题精确命中
  if (lower.includes(module.title.toLowerCase())) score += 10;
  if (lower.includes(module.shortTitle.toLowerCase())) score += 6;

  // questionTypes 命中
  module.questionTypes.forEach((qt) => {
    if (lower.includes(qt.toLowerCase())) score += 5;
  });

  // 描述关键词命中
  const descTokens = tokenize(module.description);
  const queryTokens = tokenize(query);
  queryTokens.forEach((qt) => {
    if (descTokens.includes(qt)) score += 2;
  });

  // 主题关键词加权（人工锚点）
  const topicKeywords = TOPIC_KEYWORDS[module.id] ?? [];
  topicKeywords.forEach((kw) => {
    if (lower.includes(kw.toLowerCase())) score += 4;
  });

  return score;
}

const TOPIC_KEYWORDS: Partial<Record<ModuleId, string[]>> = {
  bazi: ['八字', '四柱', '命盘', '五行', '十神', '命理', '运势', '事业', '财运', '婚姻', '出生', '生辰', '命局', '性格', '性格分析', '日主', '格局', '用神', '流月', '大运', '偏财', '正财', '正官', '七杀', '食神', '伤官', '比肩', '劫财', '偏印', '正印'],
  ziwei: ['紫微', '斗数', '十二宫', '星曜', '四化', '命宫', '身宫', '紫微斗数', '天府', '天机', '太阳', '武曲', '天同', '廉贞', '贪狼', '巨门', '天相', '天梁', '七杀', '破军', '辅星', '文昌', '文曲'],
  liuyao: ['六爻', '起卦', '占卜', '纳甲', '世应', '用神', '六亲', '六神', '铜钱', '断卦', '占事', '摇卦', '卦象', '本卦', '变卦', '静爻', '动爻'],
  meihua: ['梅花', '易数', '体用', '互卦', '变卦', '时间起卦', '数字起卦', '上卦', '下卦', '动爻'],
  fengshui: ['风水', '罗盘', '二十四山', '方位', '堪舆', '阳宅', '阴宅', '八卦方位', '形势', '理气', '峦头', '水法', '山向'],
  feixing: ['飞星', '九宫', '流年', '玄空', '九运', '元运', '紫白九星', '一白', '二黑', '三碧', '四绿', '五黄', '六白', '七赤', '八白', '九紫'],
  bazhai: ['八宅', '游年', '命卦', '宅卦', '东四命', '西四命', '生气', '延年', '天医', '伏位', '祸害', '六煞', '五鬼', '绝命', '开门', '卧室方位'],
  yunqi: ['五运六气', '运气', '岁运', '司天', '在泉', '客气', '主气', '六气', '风木', '热火', '湿土', '燥金', '寒水', '初之气', '二之气'],
  tizhi: ['体质', '九种体质', '阳虚', '阴虚', '气虚', '痰湿', '湿热', '血瘀', '气郁', '特禀', '平和', '怕冷', '怕热', '乏力', '易疲劳', '湿气'],
  almanac: ['黄历', '宜忌', '吉时', '凶时', '节气', '物候', '农历', '今日宜', '今日忌', '吉日', '择日', '搬家', '动土', '嫁娶', '出行'],
  namewuxing: ['姓名', '起名', '改名', '笔画', '三才', '五行', '名字', '测名', '姓名学', '天格', '人格', '地格', '外格', '总格'],
  dream: ['梦', '解梦', '梦境', '意象', '做梦', '梦到', '梦见', '周公解梦'],
  rhythm: ['节律', '时辰', '经络', '养生', '子午流注', '气血', '子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时', '胆经', '肝经', '肺经', '大肠经'],
  reader: ['古籍', '原文', '八宅明镜', '经典', '书', '经典原文', '古籍对照', '注释'],
};

const QUESTION_INTENT: Array<{ pattern: RegExp; module: ModuleId; reason: string }> = [
  // 占断决策类优先（要不要/能不能 等强占断信号）
  { pattern: /(要不要|能不能|成不成|该不该|占一卦|起卦|占卜|决断|犹豫|选择|该选|该去)/, module: 'liuyao', reason: '占断决策 → 六爻占卜' },
  { pattern: /(事业|工作|升职|求职|职业|职场|跳槽|创业)/, module: 'bazi', reason: '事业相关 → 八字命盘' },
  { pattern: /(财运|求财|赚钱|破财|投资|理财|偏财|正财)/, module: 'bazi', reason: '财运相关 → 八字命盘' },
  { pattern: /(婚姻|感情|恋爱|结婚|对象|桃花|合婚|脱单|相亲)/, module: 'bazi', reason: '婚姻感情 → 八字命盘' },
  { pattern: /(性格|脾气|性情|为人|什么样的人)/, module: 'bazi', reason: '性格分析 → 八字命盘' },
  { pattern: /(学业|考试|考研|升学|成绩|学习)/, module: 'bazi', reason: '学业考试 → 八字命盘' },
  { pattern: /(子女|孩子|怀孕|生子|后代)/, module: 'bazi', reason: '子女相关 → 八字命盘' },
  { pattern: /(父母|长辈|父亲|母亲|孝道)/, module: 'bazi', reason: '父母长辈 → 八字命盘' },
  { pattern: /(大运|流月|十年运|每年运)/, module: 'bazi', reason: '大运流月 → 八字命盘' },
  { pattern: /(健康|疾病|身体|生病|调养|养生|长寿)/, module: 'tizhi', reason: '健康体质 → 体质辨识' },
  { pattern: /(体质|气虚|阳虚|阴虚|痰湿|湿热|怕冷|怕热|乏力)/, module: 'tizhi', reason: '体质辨识 → 九种体质' },
  { pattern: /(八宅|游年|命卦|宅卦|东四|西四|卧室|厨房方位)/, module: 'bazhai', reason: '八宅布局 → 八宅大游年' },
  { pattern: /(风水|方位|房子|住宅|办公室|布局|坐向|户型)/, module: 'fengshui', reason: '风水方位 → 风水罗盘' },
  { pattern: /(流年|今年|明年|运势|太岁|年运)/, module: 'feixing', reason: '流年运势 → 流年飞星' },
  { pattern: /(五运六气|运气|岁运|司天|在泉|六气)/, module: 'yunqi', reason: '运气推算 → 五运六气' },
  { pattern: /(黄历|宜忌|吉日|择日|今天宜|搬家|动土|嫁娶)/, module: 'almanac', reason: '黄历宜忌 → 每日黄历' },
  { pattern: /(姓名|名字|起名|改名|测名)/, module: 'namewuxing', reason: '姓名分析 → 姓名五行' },
  { pattern: /(梦|解梦|梦境|梦见|梦到)/, module: 'dream', reason: '解梦 → 周公解梦' },
  { pattern: /(节律|时辰|经络|子午流注|养生节律)/, module: 'rhythm', reason: '养生节律 → 每日节律' },
  { pattern: /(紫微|斗数|十二宫|星曜|四化)/, module: 'ziwei', reason: '紫微排盘 → 紫微斗数' },
  { pattern: /(古籍|原文|经典|书|古籍对照)/, module: 'reader', reason: '古籍阅读 → Split Reader' },
];

/**
 * 把自然语言 query 路由到模块 + 预填上下文。
 * 返回 null 表示无法识别为 agent 提问（应回退到普通命令搜索）。
 */
export function routeQuery(query: string): AgentRoute | null {
  const raw = query.trim();
  if (!raw) return null;

  // 1. 先尝试抽取出生信息（复用 birth parser，但不要求 birth 关键词——agent 场景更宽松）
  const birthPatch = extractBirthLoose(raw);

  // 2. 显式 divination 命令优先走原 parser，并强制锁定模块
  const liuyao = parseLiuyaoCommand(raw) ?? undefined;
  const meihua = parseMeihuaCommand(raw) ?? undefined;
  const reader = parseReaderSearchCommand(raw) ?? undefined;

  if (liuyao) {
    return {
      module: 'liuyao',
      reason: '六爻命令 → 六爻占卜',
      birthPatch: extractBirthLoose(raw),
      liuyao,
      question: extractQuestion(raw),
    };
  }
  if (meihua) {
    return {
      module: 'meihua',
      reason: '梅花命令 → 梅花易数',
      birthPatch: extractBirthLoose(raw),
      meihua,
      question: extractQuestion(raw),
    };
  }
  if (reader) {
    return {
      module: 'reader',
      reason: '古籍命令 → Split Reader',
      birthPatch: extractBirthLoose(raw),
      reader,
      question: extractQuestion(raw),
    };
  }

  // 3. 模块评分
  const signals: ModuleSignal[] = MODULES.map((module) => ({
    id: module.id,
    score: scoreModule(raw, module),
    reason: module.title,
  })).filter((s) => s.score > 0);

  // 4. 问句意图强信号
  let intentModule: ModuleId | null = null;
  let intentReason = '';
  for (const intent of QUESTION_INTENT) {
    if (intent.pattern.test(raw)) {
      intentModule = intent.module;
      intentReason = intent.reason;
      break;
    }
  }

  // 5. 综合决策
  let bestModule: ModuleId | null = null;
  let reason = '';

  if (intentModule) {
    // 问句意图强信号 +8 分加成
    const intentSignal = signals.find((s) => s.id === intentModule);
    if (intentSignal) intentSignal.score += 8;
    else signals.push({ id: intentModule, score: 8, reason: intentReason });
    bestModule = intentModule;
    reason = intentReason;
  }

  // 取最高分模块
  signals.sort((a, b) => b.score - a.score);
  if (!bestModule && signals.length > 0 && signals[0].score >= 4) {
    bestModule = signals[0].id;
    reason = '关键词匹配 → ' + signals[0].reason;
  } else if (bestModule && signals.length > 0) {
    // 如果评分最高的模块比 intent 模块高出很多，采纳评分最高
    if (signals[0].id !== bestModule && signals[0].score > (signals.find((s) => s.id === bestModule)?.score ?? 0) + 4) {
      bestModule = signals[0].id;
      reason = '关键词匹配 → ' + signals[0].reason;
    }
  }

  if (!bestModule) {
    // 有出生信息但没模块 → 默认八字
    if (birthPatch) {
      bestModule = 'bazi';
      reason = '检测到生辰 → 八字命盘';
      signals.push({ id: 'bazi', score: 4, reason });
    } else {
      return null;
    }
  }

  // 6. 抽取问题文本（去掉出生信息部分）
  const question = extractQuestion(raw);

  // 7. 计算次要建议（评分接近但未采纳的模块）
  const alternatives: Array<{ module: ModuleId; reason: string }> = [];
  const sorted = [...signals].sort((a, b) => b.score - a.score);
  for (const sig of sorted) {
    if (sig.id === bestModule) continue;
    if (sig.score >= 4) {
      alternatives.push({ module: sig.id, reason: '关键词匹配 → ' + sig.reason });
    }
    if (alternatives.length >= 2) break;
  }

  return {
    module: bestModule,
    reason,
    birthPatch,
    liuyao: liuyao && bestModule === 'liuyao' ? liuyao : undefined,
    meihua: meihua && bestModule === 'meihua' ? meihua : undefined,
    reader: reader && bestModule === 'reader' ? reader : undefined,
    question,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
  };
}

function extractBirthLoose(query: string): Partial<BirthData> | undefined {
  // 先试严格 birth parser
  const strict = parseBirthCommand(query);
  if (strict) return strict.patch;

  // 松散：有日期 + 性别 也算
  const dateMatch = query.match(/(\d{4})[-/.年\s]+(\d{1,2})[-/.月\s]+(\d{1,2})(?:日)?(?:\s+(\d{1,2}))?/);
  if (!dateMatch) return undefined;

  const patch: Partial<BirthData> = {
    year: clampInt(Number.parseInt(dateMatch[1], 10), 1900, 2100, 1990),
    month: clampInt(Number.parseInt(dateMatch[2], 10), 1, 12, 1),
    day: clampInt(Number.parseInt(dateMatch[3], 10), 1, 31, 1),
  };
  if (dateMatch[4]) {
    patch.hour = clampInt(Number.parseInt(dateMatch[4], 10), 0, 23, 0);
  }
  const lower = query.toLowerCase();
  if (/[女]/.test(query) || /\b(female|woman|girl|f)\b/.test(lower)) patch.gender = '女';
  else if (/[男]/.test(query) || /\b(male|man|boy|m)\b/.test(lower)) patch.gender = '男';
  if (/农历|陰曆|阴历|lunar/.test(lower)) patch.isLunar = true;

  return patch;
}

function extractQuestion(query: string): string | undefined {
  // 去掉日期、性别、历法词，保留问题部分
  let q = query
    .replace(/\d{4}[-/.年\s]+\d{1,2}[-/.月\s]+\d{1,2}(?:日)?(?:\s+\d{1,2})?/g, ' ')
    .replace(/[男女]/g, ' ')
    .replace(/农历|阴历|陰曆|公历|阳历|公曆|陽曆|lunar|solar/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!q) return undefined;
  return q;
}
