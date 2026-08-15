/**
 * nameStrokes — 康熙字典笔画 + 字义五行数据。
 *
 * 数据来自 babyname/fate 项目 resources/character.json (MIT)，
 * 已提取 char → {k: kangxi_stroke, w: wu_xing} 精简为 JSON。
 * 简体字映射到其繁体本字的康熙笔画（如「伟」→「偉」11 画），符合
 * 传统姓名学「以康熙字典为准」的口径。
 *
 * 共 22107 个可起名汉字，覆盖极广；未收录字回退估算并在 UI 标注。
 */

import kangxiData from './kangxiStrokes.json';

interface CharEntry {
  /** 康熙笔画 */
  k: number;
  /** 字义五行（用于补八字参考） */
  w: string;
}

const KANGXI: Record<string, CharEntry> = kangxiData as Record<string, CharEntry>;

/**
 * 取汉字康熙笔画数。未收录时返回 null（由调用方标注「未收录」并回退估算）。
 */
export function getKangxiStrokes(char: string): number | null {
  return KANGXI[char]?.k ?? null;
}

/** 取汉字字义五行（fate 数据的 wu_xing 字段）。未收录返回空串。 */
export function getCharWuxing(char: string): string {
  return KANGXI[char]?.w ?? '';
}

/**
 * 字义出处文本（charMeanings.json，约 1.69MB）按需动态加载，避免拖入姓名五行/测字的静态 chunk。
 * 仅用于展示（字义出处），不参与任何评分计算；评分所需的 {k,w} 来自 kangxiStrokes.json（静态 import）。
 */
let charMeaningsCache: Record<string, string> | null = null;
async function loadCharMeanings(): Promise<Record<string, string>> {
  if (!charMeaningsCache) {
    const mod = await import('./charMeanings');
    charMeaningsCache = mod.CHAR_MEANINGS;
  }
  return charMeaningsCache;
}

/** 取汉字字义出处（fate character.json 的 meaning 字段，19931 字）。未收录返回空串。 */
export async function getCharMeaning(char: string): Promise<string> {
  const CHAR_MEANINGS = await loadCharMeanings();
  return CHAR_MEANINGS[char] ?? '';
}

/** 未收录字回退估算：用 Unicode 编码取模，仅作占位，UI 会标注「未收录」。 */
export function estimateStrokes(char: string): number {
  const code = char.charCodeAt(0);
  return ((code % 18) + 4); // 4..21 之间的占位值
}
