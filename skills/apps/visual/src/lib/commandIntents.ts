import type { BirthData } from '@/legacy/birthBridge';
import type { TrueSolarTimeResolution } from '@/engine-api/trueSolarTime';
// 副作用导入：确保 historyStore 模块在应用启动即求值，
// 从而把 HistoryStore 挂到 window（commandIntents 的 getHistoryStore 依赖它，
// 否则命令历史/收藏记录为死代码）。原 visual/ 旧桥移除后此处需显式触发。
import '@/legacy/historyStore';

export const COPY_CONTEXT_INTENT = 'ctw:copy-context';
export const YEAR_INTENT_EVENT = 'ctw:set-year';
export const YEAR_INTENT_STORAGE_KEY = 'ctw.pendingYear';
export const BIRTH_INTENT_EVENT = 'ctw:set-birth';
export const TRUE_SOLAR_TIME_INTENT_EVENT = 'ctw:set-true-solar-time';
export const CIVIL_TIME_FALLBACK_INTENT_EVENT = 'ctw:confirm-civil-time-fallback';
export const REFRESH_ALL_INTENT_EVENT = 'ctw:refresh-all';
export const LIUYAO_INTENT_EVENT = 'ctw:liuyao-command';
export const MEIHUA_INTENT_EVENT = 'ctw:meihua-command';
export const READER_SEARCH_INTENT_EVENT = 'ctw:reader-search';
export const COMMAND_FEEDBACK_EVENT = 'ctw:command-feedback';

export type YearIntentTarget = 'feixing' | 'yunqi';
export type LiuyaoCommandMethod = 'coin' | 'time' | 'manual';
export type MeihuaCommandMethod = 'time' | 'number' | 'yarrow';

export interface CopyContextIntentDetail {
  scope: string;
}

export interface YearIntentDetail {
  target: YearIntentTarget;
  year: number;
}

export interface BirthIntentDetail {
  patch: Partial<BirthData>;
  source: 'command-bar';
  raw: string;
}

export interface TrueSolarTimeIntentDetail {
  resolution: TrueSolarTimeResolution;
  source: 'agent-local';
}

export interface CivilTimeFallbackIntentDetail {
  source: 'user-confirmed';
}

export interface RefreshAllIntentDetail {
  source: 'command-bar';
  raw?: string;
  nonce: number;
}

export interface LiuyaoIntentDetail {
  method?: LiuyaoCommandMethod;
  question?: string;
  yaoValues?: string;
  recast?: boolean;
  raw: string;
}

export interface MeihuaIntentDetail {
  method?: MeihuaCommandMethod;
  numberA?: number;
  numberB?: number;
  raw: string;
}

export interface ReaderSearchIntentDetail {
  term: string;
  citationId?: string;
  iching?: {
    hexagramName: string;
    hexagramNumber: number;
    changingHexagramName?: string;
    changingHexagramNumber?: number;
    changingLines: number[];
  };
  raw: string;
}

let pendingReaderSearchIntent: ReaderSearchIntentDetail | null = null;

export interface CommandFeedbackDetail {
  title: string;
  description?: string;
  tone: 'success' | 'info';
}

const TRIGRAM_ALIASES: Record<string, string> = {
  qian: '乾',
  dui: '兑',
  li: '离',
  zhen: '震',
  xun: '巽',
  kan: '坎',
  gen: '艮',
  kun: '坤',
  乾: '乾',
  兑: '兑',
  离: '离',
  震: '震',
  巽: '巽',
  坎: '坎',
  艮: '艮',
  坤: '坤',
};

export function normalizeCommandYear(value: number | string, fallback = 2026): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(2100, Math.max(1900, Math.trunc(parsed)));
}

export function extractCommandYear(query: string): number | null {
  const match = query.match(/(?:^|\D)((?:19|20)\d{2}|2100)(?:\D|$)/);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  if (year < 1900 || year > 2100) return null;
  return year;
}

export function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function pendingYearKey(target: YearIntentTarget): string {
  return YEAR_INTENT_STORAGE_KEY + '.' + target;
}

function compactQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ');
}

function parseGender(query: string): BirthData['gender'] | undefined {
  const lower = query.toLowerCase();
  if (/[女]/.test(query) || /\b(female|woman|girl|f)\b/.test(lower)) return '女';
  if (/[男]/.test(query) || /\b(male|man|boy|m)\b/.test(lower)) return '男';
  return undefined;
}

function stripCommandWords(query: string, words: string[]): string {
  let result = query;
  words.forEach((word) => {
    result = result.replace(new RegExp(word, 'gi'), ' ');
  });
  return compactQuery(result);
}

export function parseBirthCommand(query: string): BirthIntentDetail | null {
  const raw = compactQuery(query);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const hasBirthKeyword = /生辰|出生|生日|birth|农历|陰曆|阴历|lunar|公历|公曆|阳历|陽曆|solar/.test(lower);
  if (!hasBirthKeyword) return null;

  const dateMatch = raw.match(/(\d{4})[-/.年\s]+(\d{1,2})[-/.月\s]+(\d{1,2})(?:日)?(?:\s+(\d{1,2}))?/);
  if (!dateMatch) return null;

  const patch: Partial<BirthData> = {
    year: clampInt(Number.parseInt(dateMatch[1], 10), 1900, 2100, 1990),
    month: clampInt(Number.parseInt(dateMatch[2], 10), 1, 12, 1),
    day: clampInt(Number.parseInt(dateMatch[3], 10), 1, 31, 1),
  };
  if (dateMatch[4]) {
    patch.hour = clampInt(Number.parseInt(dateMatch[4], 10), 0, 23, 0);
  }

  const gender = parseGender(raw);
  if (gender) patch.gender = gender;
  if (/农历|陰曆|阴历|lunar/.test(lower)) patch.isLunar = true;
  if (/公历|公曆|阳历|陽曆|solar/.test(lower)) patch.isLunar = false;

  return { patch, source: 'command-bar', raw };
}

export function isRefreshAllCommand(query: string): boolean {
  const raw = compactQuery(query).toLowerCase();
  return /^(刷新|刷新全部|重算|重新计算|refresh|refresh all|recalculate)$/.test(raw);
}

export function parseLiuyaoCommand(query: string): LiuyaoIntentDetail | null {
  const raw = compactQuery(query);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (!/六爻|liuyao|起卦|占卜/.test(lower)) return null;

  const detail: LiuyaoIntentDetail = { raw };
  const manualMatch = raw.match(/[6-9]{6}/);
  if (/手动|manual/.test(lower) || manualMatch) {
    detail.method = 'manual';
    if (manualMatch) detail.yaoValues = manualMatch[0];
  } else if (/时间|time/.test(lower)) {
    detail.method = 'time';
  } else {
    detail.method = 'coin';
    detail.recast = true;
  }

  const question = stripCommandWords(raw, ['六爻', 'liuyao', '起卦', '占卜', '铜钱', 'coin', '手动', 'manual', '时间', 'time', '[6-9]{6}']);
  if (question) detail.question = question;
  return detail;
}

export function parseMeihuaCommand(query: string): MeihuaIntentDetail | null {
  const raw = compactQuery(query);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (!/梅花|meihua/.test(lower)) return null;

  const detail: MeihuaIntentDetail = { raw };
  if (/揲蓍|蓍草|yarrow/.test(lower)) {
    detail.method = 'yarrow';
    return detail;
  }
  if (/数字|number/.test(lower)) {
    const values = raw.match(/-?\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) ?? [];
    if (values.length >= 2) {
      detail.method = 'number';
      detail.numberA = values[0];
      detail.numberB = values[1];
      return detail;
    }
    return detail;
  }
  detail.method = 'time';
  return detail;
}

export function parseReaderSearchCommand(query: string): ReaderSearchIntentDetail | null {
  const raw = compactQuery(query);
  if (!raw) return null;
  const match = raw.match(/^(?:古籍|reader|split|搜古籍|查古籍)\s+(.+)$/i);
  if (!match?.[1]) return null;
  return { term: match[1].trim(), raw };
}

export function dispatchCopyContextIntent(scope: string): void {
  window.dispatchEvent(new CustomEvent<CopyContextIntentDetail>(COPY_CONTEXT_INTENT, { detail: { scope } }));
}

export function dispatchYearIntent(target: YearIntentTarget, yearValue: number): void {
  const year = normalizeCommandYear(yearValue);
  try {
    window.sessionStorage.setItem(YEAR_INTENT_STORAGE_KEY, String(year));
    window.sessionStorage.setItem(pendingYearKey(target), String(year));
  } catch {
    // sessionStorage 可能在隐私模式或 file:// 受限环境不可用；事件仍可完成当前页跳转。
  }
  window.dispatchEvent(new CustomEvent<YearIntentDetail>(YEAR_INTENT_EVENT, { detail: { target, year } }));
}

export function dispatchBirthIntent(detail: BirthIntentDetail): void {
  window.dispatchEvent(new CustomEvent<BirthIntentDetail>(BIRTH_INTENT_EVENT, { detail }));
}

export function dispatchTrueSolarTimeIntent(detail: TrueSolarTimeIntentDetail): void {
  window.dispatchEvent(new CustomEvent<TrueSolarTimeIntentDetail>(TRUE_SOLAR_TIME_INTENT_EVENT, { detail }));
}

export function dispatchCivilTimeFallbackIntent(): void {
  window.dispatchEvent(new CustomEvent<CivilTimeFallbackIntentDetail>(CIVIL_TIME_FALLBACK_INTENT_EVENT, {
    detail: { source: 'user-confirmed' },
  }));
}

export function dispatchRefreshAllIntent(raw?: string): void {
  window.dispatchEvent(new CustomEvent<RefreshAllIntentDetail>(REFRESH_ALL_INTENT_EVENT, {
    detail: { source: 'command-bar', raw, nonce: Date.now() },
  }));
}

export function dispatchLiuyaoIntent(detail: LiuyaoIntentDetail): void {
  window.dispatchEvent(new CustomEvent<LiuyaoIntentDetail>(LIUYAO_INTENT_EVENT, { detail }));
}

export function dispatchMeihuaIntent(detail: MeihuaIntentDetail): void {
  window.dispatchEvent(new CustomEvent<MeihuaIntentDetail>(MEIHUA_INTENT_EVENT, { detail }));
}

export function dispatchReaderSearchIntent(detail: ReaderSearchIntentDetail): void {
  pendingReaderSearchIntent = detail;
  window.dispatchEvent(new CustomEvent<ReaderSearchIntentDetail>(READER_SEARCH_INTENT_EVENT, { detail }));
}

export function consumeReaderSearchIntent(): ReaderSearchIntentDetail | null {
  const detail = pendingReaderSearchIntent;
  pendingReaderSearchIntent = null;
  return detail;
}

export function dispatchCommandFeedback(detail: CommandFeedbackDetail): void {
  window.dispatchEvent(new CustomEvent<CommandFeedbackDetail>(COMMAND_FEEDBACK_EVENT, { detail }));
}

export function buildCommandFeedback(item: { label: string; group: string; hint?: string }): CommandFeedbackDetail {
  return {
    title: '已执行：' + item.label,
    description: item.group + (item.hint ? ' · ' + item.hint : ''),
    tone: item.group === '导航' ? 'info' : 'success',
  };
}

export function readPendingCommandYear(target: YearIntentTarget, fallback = 2026): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.sessionStorage.getItem(pendingYearKey(target)) ?? window.sessionStorage.getItem(YEAR_INTENT_STORAGE_KEY);
    if (!raw) return fallback;
    return normalizeCommandYear(raw, fallback);
  } catch {
    return fallback;
  }
}

/* ── 命令历史/收藏（复用 legacy HistoryStore） ─────────── */

export interface CommandHistoryEntry {
  id: string;
  module: string;
  title: string;
  summary: string;
  tags: string[];
  mode: string;
  createdAt: string;
  favorite: boolean;
  reportVersion: string;
  capabilityMode: string;
  inputSummary: string;
}

interface HistoryStoreLike {
  add: (entry: Partial<CommandHistoryEntry>) => CommandHistoryEntry | null;
  list: () => CommandHistoryEntry[];
  listFavorites: () => CommandHistoryEntry[];
  toggleFavorite: (id: string) => boolean;
  remove: (id: string) => void;
  clear: () => void;
  clearFavorites: () => void;
  getCount: () => number;
}

function getHistoryStore(): HistoryStoreLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { HistoryStore?: HistoryStoreLike };
  return w.HistoryStore ?? null;
}

/**
 * 记录一条命令执行历史（脱敏，复用 legacy HistoryStore）。
 * 返回写入的条目，或 null 表示 store 未就绪。
 */
export function recordCommandHistory(entry: {
  module: string;
  title: string;
  summary?: string;
  tags?: string[];
  mode?: string;
  reportVersion?: string;
  capabilityMode?: string;
  inputSummary?: string;
}): CommandHistoryEntry | null {
  const store = getHistoryStore();
  if (!store) return null;
  return store.add({
    module: entry.module,
    title: entry.title,
    summary: entry.summary ?? '',
    tags: entry.tags ?? [],
    mode: entry.mode ?? 'command',
    reportVersion: entry.reportVersion ?? '1.0',
    capabilityMode: entry.capabilityMode ?? '命令入口（command）',
    inputSummary: entry.inputSummary ?? '已执行本地命令；不记录原始输入。',
  });
}

export function listCommandHistory(): CommandHistoryEntry[] {
  return getHistoryStore()?.list() ?? [];
}

export function listCommandFavorites(): CommandHistoryEntry[] {
  return getHistoryStore()?.listFavorites() ?? [];
}

export function isHistoryStoreReady(): boolean {
  return getHistoryStore() !== null;
}

