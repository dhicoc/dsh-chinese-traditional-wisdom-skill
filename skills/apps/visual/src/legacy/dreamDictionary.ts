/**
 * dreamDictionary — 周公解梦查表引擎。
 *
 * 数据来源（均 MIT 许可）：
 * - 现代解读层：oswin-hu/zhougong_dream 9550 条（精选 137 条内嵌于 dreamData.ts，
 *   全量 9548 条放 public/dream/dream-dictionary.json 运行时 fetch）。
 * - 古文原典层：KianReed/dreamlogic-mcp 952 条原版周公解梦古文断语（内嵌）。
 *
 * 提供：关键词搜索（精确→包含→古文）、吉凶配色、大类分类、多系统联动提示
 * （梦见水→北方位/飞星坎宫等），与八宅/飞星模块的方位体系对齐。
 */

import { DREAM_ENTRIES, DREAM_CLASSICS, type DreamEntry, type DreamClassic } from './dream-data/dreamData';

export type { DreamEntry, DreamClassic };

/** 吉凶 → 显示色（对齐 TASTE_SKILL_UI） */
export const LUCK_COLOR: Record<string, string> = {
  大吉: 'var(--wz-wood)',
  吉: 'var(--chart-good-soft)',
  中平: 'var(--chart-text-faint)',
  凶: 'var(--wz-fire)',
  大凶: 'var(--c-cinnabar-deep)',
};

/** 吉凶 → alpha 用的 RGB triplet 变量（用于 rgb(var(--triplet) / a) 形式） */
export const LUCK_ALPHA: Record<string, string> = {
  大吉: 'var(--wood)',
  吉: 'var(--wood)',
  中平: 'var(--spirit)',
  凶: 'var(--cinnabar)',
  大凶: 'var(--cinnabar-700)',
};

/** 现代大类（10类，来自 zg_dreams biglx） */
export const BIG_CATEGORIES = ['人物', '动物', '植物', '物品', '活动', '生活', '自然', '鬼神', '建筑', '其它'] as const;

/** 吉凶排序权重（用于结果排序：大吉最前，大凶最后） */
const LUCK_ORDER: Record<string, number> = { 大吉: 0, 吉: 1, 中平: 2, 凶: 3, 大凶: 4 };

export interface DreamSearchResult {
  /** 现代解读（可能多条，来自精选/全量库） */
  entries: DreamEntry[];
  /** 古文原典（可能多条，来自古文层） */
  classics: DreamClassic[];
  /** 是否命中 */
  hit: boolean;
}

/** 在梦象条目列表中搜索关键词。 */
function searchEntries(entries: DreamEntry[], keyword: string): DreamEntry[] {
  if (!keyword) return [];
  const kw = keyword.trim();
  if (!kw) return [];
  // 排除空 title 脏数据；只匹配 title 包含关键词的条目。
  // 注意不能用 kw.includes(e.title)：空 title 会让任何 kw 都命中，
  // 且短 title（如"大"）会误匹配长关键词（如"大象"）。
  const pool = entries.filter((e) => e.title && e.title.trim());
  const exact = pool.filter((e) => e.title === kw);
  if (exact.length) return exact.sort((a, b) => (LUCK_ORDER[a.luck] ?? 2) - (LUCK_ORDER[b.luck] ?? 2));
  const starts = pool.filter((e) => e.title.startsWith(kw));
  if (starts.length) return starts.sort((a, b) => a.title.length - b.title.length || (LUCK_ORDER[a.luck] ?? 2) - (LUCK_ORDER[b.luck] ?? 2));
  const includes = pool.filter((e) => e.title.includes(kw));
  return includes.sort((a, b) => a.title.length - b.title.length || (LUCK_ORDER[a.luck] ?? 2) - (LUCK_ORDER[b.luck] ?? 2));
}

/** 在古文原典中搜索关键词。 */
function searchClassics(keyword: string): DreamClassic[] {
  if (!keyword) return [];
  const kw = keyword.trim();
  if (!kw) return [];
  const exact = DREAM_CLASSICS.filter((c) => c.keyword === kw);
  if (exact.length) return exact;
  const includes = DREAM_CLASSICS.filter((c) => c.keyword.includes(kw) || kw.includes(c.keyword));
  return includes.slice(0, 8);
}

/** 全量库缓存（运行时 fetch public/dream/dream-dictionary.json） */
let fullEntriesCache: DreamEntry[] | null = null;
let fullLoadingPromise: Promise<DreamEntry[]> | null = null;

/** 加载全量 9548 条梦象库（按需，仅调用一次）。 */
export function loadFullDictionary(): Promise<DreamEntry[]> {
  if (fullEntriesCache) return Promise.resolve(fullEntriesCache);
  if (fullLoadingPromise) return fullLoadingPromise;
  fullLoadingPromise = fetch('/dream/dream-dictionary.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as unknown as DreamEntry[];
    })
    .then((data) => {
      // 清洗空 title 脏数据
      fullEntriesCache = data.filter((e) => e.title && e.title.trim() && e.biglx && e.biglx.trim());
      return fullEntriesCache;
    })
    .catch((err) => {
      fullLoadingPromise = null;
      console.warn('全量周公解梦库加载失败，回退精选库:', err);
      return DREAM_ENTRIES;
    });
  return fullLoadingPromise;
}

/**
 * 搜索周公解梦。先查内嵌精选库 + 古文层（即时），可选合并全量库结果。
 * @param keyword 梦象关键词（如"蛇"、"梦见水"）
 * @param useFull 是否合并全量库（需已 loadFullDictionary）
 */
export function searchDream(keyword: string, useFull = false): DreamSearchResult {
  const pool = useFull && fullEntriesCache ? [...DREAM_ENTRIES, ...fullEntriesCache.filter((e) => !DREAM_ENTRIES.some((s) => s.title === e.title))] : DREAM_ENTRIES;
  const entries = searchEntries(pool, keyword);
  const classics = searchClassics(keyword);
  return { entries, classics, hit: entries.length > 0 || classics.length > 0 };
}

/** 取热门推荐梦象（从精选库按吉凶均匀抽样）。 */
export function getHotDreams(count = 8): DreamEntry[] {
  const pools: Record<string, DreamEntry[]> = { 大吉: [], 吉: [], 中平: [], 凶: [], 大凶: [] };
  DREAM_ENTRIES.forEach((e) => { (pools[e.luck] ?? (pools[e.luck] = [])).push(e); });
  const result: DreamEntry[] = [];
  const order: (keyof typeof pools)[] = ['大吉', '凶', '吉', '大凶', '中平'];
  let i = 0;
  while (result.length < count && order.some((k) => pools[k].length)) {
    const k = order[i % order.length];
    if (pools[k].length) result.push(pools[k].shift()!);
    i++;
  }
  return result;
}

/** 多系统联动提示：梦象 → 相关方位/五行（与八宅/飞星方位体系对齐）。 */
export interface DreamLink {
  label: string;
  value: string;
}

/** 梦象关键词 → 联动方位/五行（提炼自传统"梦象应方位"说法，参考性提示）。 */
const DREAM_LINK_MAP: Record<string, DreamLink[]> = {
  水: [{ label: '对应方位', value: '北方（坎卦·水）' }, { label: '飞星应', value: '一白贪狼水星' }],
  火: [{ label: '对应方位', value: '南方（离卦·火）' }, { label: '飞星应', value: '九紫右弼火星' }],
  蛇: [{ label: '对应方位', value: '东南（巽卦）' }, { label: '五行', value: '蛇属火，应南方' }],
  龙: [{ label: '对应方位', value: '东方（震卦·木）' }, { label: '飞星应', value: '三碧禄存木星' }],
  虎: [{ label: '对应方位', value: '西方（兑卦·金）' }],
  马: [{ label: '对应方位', value: '南方（离卦·火）' }],
  牛: [{ label: '对应方位', value: '东北（艮卦·土）' }],
  山: [{ label: '对应方位', value: '东北（艮卦·土）' }],
  太阳: [{ label: '对应方位', value: '东方/南方（火）' }],
  月亮: [{ label: '对应方位', value: '北方（水）' }],
  风: [{ label: '对应方位', value: '东南（巽卦·木）' }],
  雷: [{ label: '对应方位', value: '东方（震卦·木）' }],
  花: [{ label: '对应方位', value: '东南（巽卦·木）' }],
  树: [{ label: '对应方位', value: '东方/东南（木）' }],
  土: [{ label: '对应方位', value: '中央/东北西南（土）' }],
  金: [{ label: '对应方位', value: '西方/西北（金）' }],
};

/** 取梦象的联动提示（按关键词匹配 DREAM_LINK_MAP）。 */
export function getDreamLinks(keyword: string): DreamLink[] {
  if (!keyword) return [];
  const kw = keyword.trim();
  for (const key of Object.keys(DREAM_LINK_MAP)) {
    if (kw === key || kw.includes(key) || key.includes(kw)) return DREAM_LINK_MAP[key];
  }
  return [];
}

/** 大类 → 推荐筛选标签描述 */
export const CATEGORY_DESC: Record<string, string> = {
  人物: '梦见各类人物：亲人/陌生人/名人/职业角色',
  动物: '梦见动物：蛇/狗/猫/鱼/鸟/昆虫等',
  植物: '梦见植物：花/草/树/水果/蔬菜',
  物品: '梦见物品：钱/车/房/衣物/器物',
  活动: '梦见活动：吃饭/工作/旅行/打架/考试',
  生活: '梦见生活场景：结婚/怀孕/搬家/生病',
  自然: '梦见自然现象：日/月/星/雨/雪/雷/山/水',
  鬼神: '梦见鬼神：鬼/神/佛/庙/灵魂',
  建筑: '梦见建筑：房子/庙/桥/路/楼梯',
  其它: '其它梦象',
};
