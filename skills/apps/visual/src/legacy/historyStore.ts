/*
 * historyStore — 本地历史与收藏（纯 TS localStorage，不依赖 visual/js/history-store.js）
 */

export const HISTORY_SCHEMA_VERSION = 2;

export interface HistoryEntry {
  id: string;
  module: string;
  title: string;
  summary: string;
  tags: string[];
  mode: string;
  createdAt: string;
  favorite: boolean;
  schemaVersion: number;
  reportVersion: string;
  capabilityMode: string;
  inputSummary: string;
}

const HISTORY_KEY = 'FORTUNE_HISTORY';
const FAVORITES_KEY = 'FORTUNE_FAVORITES';
const MAX_HISTORY = 30;

function safeParse(json: string | null): Partial<HistoryEntry>[] {
  try {
    const value: unknown = JSON.parse(json || '[]');
    return Array.isArray(value) ? value.filter((entry): entry is Partial<HistoryEntry> => Boolean(entry) && typeof entry === 'object') : [];
  } catch {
    return [];
  }
}

function generateId(): string {
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function redactSensitiveText(value: string): string {
  return value
    .replace(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, '****')
    .replace(/\d{4}年\d{1,2}月\d{1,2}日/g, '****')
    .replace(/(?:姓名|名字|称呼)\s*[:：]\s*[\u4e00-\u9fff]{2,4}/g, (match) => match.replace(/[\u4e00-\u9fff]{2,4}$/, '已脱敏'))
    .replace(/(?:出生)?地点\s*[:：]\s*[^，。；、\n]{2,40}/g, (match) => match.replace(/[:：].*$/, '：已脱敏'))
    .replace(/(?:[\u4e00-\u9fff]{2,}(?:省|自治区|特别行政区))?[\u4e00-\u9fff]{2,}市[\u4e00-\u9fff]{2,}(?:区|县|镇|乡|街道)/g, '地点已脱敏');
}

function migrateHistoryEntry(entry: Partial<HistoryEntry>): Partial<HistoryEntry> {
  const schemaVersion = typeof entry.schemaVersion === 'number' && Number.isInteger(entry.schemaVersion)
    ? entry.schemaVersion
    : 0;
  if (schemaVersion <= 0) {
    return {
      ...entry,
      schemaVersion: 1,
      reportVersion: entry.reportVersion || 'unknown',
      capabilityMode: entry.capabilityMode || entry.mode || 'unknown',
      inputSummary: entry.inputSummary || '未提供',
    };
  }
  if (schemaVersion === 1) {
    return {
      ...entry,
      schemaVersion: HISTORY_SCHEMA_VERSION,
      capabilityMode: entry.capabilityMode || entry.mode || 'unknown',
      inputSummary: entry.inputSummary || '未提供',
    };
  }
  return entry;
}

function sanitizeHistoryEntry(entry: Partial<HistoryEntry>): HistoryEntry {
  const mode = String(entry.mode || 'unknown').slice(0, 20);
  return {
    id: entry.id || generateId(),
    module: String(entry.module || 'unknown').slice(0, 30),
    title: redactSensitiveText(String(entry.title || '').slice(0, 120)),
    summary: redactSensitiveText(String(entry.summary || '').slice(0, 500)),
    tags: Array.isArray(entry.tags) ? entry.tags.slice(0, 10).map((tag) => redactSensitiveText(String(tag).slice(0, 30))) : [],
    mode,
    createdAt: entry.createdAt || new Date().toISOString(),
    favorite: entry.favorite === true,
    schemaVersion: HISTORY_SCHEMA_VERSION,
    reportVersion: String(entry.reportVersion || 'unknown').slice(0, 20),
    capabilityMode: redactSensitiveText(String(entry.capabilityMode || mode).slice(0, 80)),
    inputSummary: redactSensitiveText(String(entry.inputSummary || '未提供').slice(0, 120)),
  };
}

function setEntries(key: string, entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(entries));
  } catch {
    /* quota */
  }
}

function getEntries(key: string): HistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  let original: Partial<HistoryEntry>[];
  try {
    original = safeParse(localStorage.getItem(key));
  } catch {
    return [];
  }
  const migrated = original.map(migrateHistoryEntry);
  const sanitized = migrated.map(sanitizeHistoryEntry);
  if (JSON.stringify(original) !== JSON.stringify(sanitized)) setEntries(key, sanitized);
  return sanitized;
}

function getHistory(): HistoryEntry[] {
  return getEntries(HISTORY_KEY);
}

function setHistory(entries: HistoryEntry[]): void {
  setEntries(HISTORY_KEY, entries.map(sanitizeHistoryEntry));
}

function getFavorites(): HistoryEntry[] {
  return getEntries(FAVORITES_KEY);
}

function setFavorites(entries: HistoryEntry[]): void {
  setEntries(FAVORITES_KEY, entries.map(sanitizeHistoryEntry));
}

function syncFavorites(history: HistoryEntry[]): void {
  const existingById = new Map(getFavorites().map((entry) => [entry.id, entry]));
  setFavorites(history.filter((entry) => entry.favorite).map((entry) => ({ ...existingById.get(entry.id), ...entry, favorite: true })));
}

export const HistoryStore = {
  add(entry: Partial<HistoryEntry>): HistoryEntry | null {
    if (!entry?.module) return null;
    const clean = sanitizeHistoryEntry(entry);
    let history = getHistory();
    const existingIdx = history.findIndex((item) => item.module === clean.module && item.title === clean.title);
    if (existingIdx >= 0) {
      clean.favorite = history[existingIdx].favorite;
      history.splice(existingIdx, 1);
    }
    history.unshift(clean);
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    setHistory(history);
    syncFavorites(history);
    return clean;
  },
  list(): HistoryEntry[] {
    return getHistory();
  },
  listFavorites(): HistoryEntry[] {
    const history = getHistory();
    const favorites = history.filter((entry) => entry.favorite);
    if (favorites.length || !getFavorites().length) {
      setFavorites(favorites);
      return favorites;
    }
    return getFavorites();
  },
  toggleFavorite(id: string): boolean {
    const history = getHistory();
    const item = history.find((entry) => entry.id === id);
    if (!item) return false;
    item.favorite = !item.favorite;
    setHistory(history);
    syncFavorites(history);
    return item.favorite;
  },
  remove(id: string): void {
    const history = getHistory().filter((entry) => entry.id !== id);
    setHistory(history);
    syncFavorites(history);
  },
  clear(): void {
    setHistory([]);
  },
  clearFavorites(): void {
    const history = getHistory().map((entry) => ({ ...entry, favorite: false }));
    setHistory(history);
    setFavorites([]);
  },
  getCount(): number {
    return getHistory().length;
  },
};

if (typeof window !== 'undefined') {
  (window as unknown as { HistoryStore: typeof HistoryStore }).HistoryStore = HistoryStore;
}
