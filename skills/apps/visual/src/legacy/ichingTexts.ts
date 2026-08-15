/**
 * ichingTexts — 64卦古典文本查询（卦辞/爻辞/彖传）
 *
 * 数据来源：kintaiyi (MIT) 的 data.pkl「易經卦爻詳解」字段，已导出为 JSON。
 * 每卦含 8 条文本：0=卦辞，1-6=初爻到上爻辞，7=彖传。
 * 繁体中文古籍原文。
 */

import texts from './ichingTexts.json';

type HexagramTexts = Record<string, string>; // { "0": 卦辞, "1": 初爻, ... "7": 彖传 }

const TEXTS = texts as Record<string, HexagramTexts>;

/** 64卦名 → 简体名映射（数据是繁体，按需转） */
const SIMPLIFY: Record<string, string> = {
  '乾': '乾', '坤': '坤', '屯': '屯', '蒙': '蒙', '需': '需', '訟': '讼',
  '師': '师', '比': '比', '小畜': '小畜', '履': '履', '泰': '泰', '否': '否',
  '同人': '同人', '大有': '大有', '謙': '谦', '豫': '豫', '隨': '随', '蠱': '蛊',
  '臨': '临', '觀': '观', '噬嗑': '噬嗑', '賁': '贲', '剝': '剥', '復': '复',
  '无妄': '无妄', '無妄': '无妄', '大畜': '大畜', '頤': '颐', '大過': '大过', '坎': '坎', '離': '离',
  '咸': '咸', '恆': '恒', '遯': '遁', '大壯': '大壮', '晉': '晋', '明夷': '明夷',
  '家人': '家人', '睽': '睽', '蹇': '蹇', '解': '解', '損': '损', '益': '益',
  '夬': '夬', '姤': '姤', '萃': '萃', '升': '升', '困': '困', '井': '井',
  '革': '革', '鼎': '鼎', '震': '震', '艮': '艮', '漸': '渐', '歸妹': '归妹',
  '豐': '丰', '旅': '旅', '巽': '巽', '兌': '兑', '渙': '涣', '節': '节',
  '中孚': '中孚', '小過': '小过', '既濟': '既济', '未濟': '未济',
};

export interface HexagramClassicalText {
  /** 卦名（简体） */
  name: string;
  /** 卦辞 */
  guaCi: string;
  /** 爻辞（初爻到上爻，6条） */
  yaoCi: string[];
  /** 彖传 */
  tuanZhuan: string;
}

export interface CanonicalHexagram extends HexagramClassicalText {
  number: number;
  upperTrigram: string;
  lowerTrigram: string;
}

const HEXAGRAM_LAYOUT: Array<[string, string, string]> = [
  ['乾', '乾', '乾'], ['坤', '坤', '坤'], ['屯', '坎', '震'], ['蒙', '艮', '坎'], ['需', '坎', '乾'], ['訟', '乾', '坎'], ['師', '坤', '坎'], ['比', '坎', '坤'],
  ['小畜', '巽', '乾'], ['履', '乾', '兑'], ['泰', '坤', '乾'], ['否', '乾', '坤'], ['同人', '乾', '离'], ['大有', '离', '乾'], ['謙', '坤', '艮'], ['豫', '震', '坤'],
  ['隨', '兑', '震'], ['蠱', '艮', '巽'], ['臨', '坤', '兑'], ['觀', '巽', '坤'], ['噬嗑', '离', '震'], ['賁', '艮', '离'], ['剝', '艮', '坤'], ['復', '坤', '震'],
  ['无妄', '乾', '震'], ['大畜', '艮', '乾'], ['頤', '艮', '震'], ['大過', '兑', '巽'], ['坎', '坎', '坎'], ['離', '离', '离'], ['咸', '兑', '艮'], ['恆', '震', '巽'],
  ['遯', '乾', '艮'], ['大壯', '震', '乾'], ['晉', '离', '坤'], ['明夷', '坤', '离'], ['家人', '巽', '离'], ['睽', '离', '兑'], ['蹇', '坎', '艮'], ['解', '震', '坎'],
  ['損', '艮', '兑'], ['益', '巽', '震'], ['夬', '兑', '乾'], ['姤', '乾', '巽'], ['萃', '兑', '坤'], ['升', '坤', '巽'], ['困', '兑', '坎'], ['井', '坎', '巽'],
  ['革', '兑', '离'], ['鼎', '离', '巽'], ['震', '震', '震'], ['艮', '艮', '艮'], ['漸', '巽', '艮'], ['歸妹', '震', '兑'], ['豐', '震', '离'], ['旅', '离', '艮'],
  ['巽', '巽', '巽'], ['兌', '兑', '兑'], ['渙', '巽', '坎'], ['節', '坎', '兑'], ['中孚', '巽', '兑'], ['小過', '震', '艮'], ['既濟', '坎', '离'], ['未濟', '离', '坎'],
];

function resolveRawTextName(name: string): string {
  if (TEXTS[name]) return name;
  const simplifiedName = SIMPLIFY[name] ?? name;
  return Object.keys(TEXTS).find((key) => (SIMPLIFY[key] ?? key) === simplifiedName) ?? name;
}

const CANONICAL_HEXAGRAMS = HEXAGRAM_LAYOUT.map(([rawName, upperTrigram, lowerTrigram], index) => {
  const textName = resolveRawTextName(rawName);
  return {
    ...parseText(textName, TEXTS[textName]),
    number: index + 1,
    upperTrigram,
    lowerTrigram,
  };
});

export function resolveHexagram(upperTrigram: string, lowerTrigram: string): CanonicalHexagram | null {
  return CANONICAL_HEXAGRAMS.find((hexagram) => hexagram.upperTrigram === upperTrigram && hexagram.lowerTrigram === lowerTrigram) ?? null;
}

export function getCanonicalHexagram(number: number): CanonicalHexagram | null {
  return CANONICAL_HEXAGRAMS[number - 1] ?? null;
}

/**
 * 按卦名查古典文本。支持繁体/简体卦名。
 * @param hexName 卦名（如「乾」「天地否」「乾为天」）
 * @returns 古典文本，找不到返回 null
 */
export function getHexagramText(hexName: string): HexagramClassicalText | null {
  // 先直接查
  if (TEXTS[hexName]) return parseText(hexName, TEXTS[hexName]);
  // 尝试去掉「为天」等后缀（六爻卦名格式如「乾为天」→「乾」）
  const baseName = hexName.replace(/为.$/, '').replace(/為.$/, '');
  if (TEXTS[baseName]) return parseText(baseName, TEXTS[baseName]);
  // 尝试从六爻卦名提取（如「天地否」→「否」，取最后一两个字）
  const lastChar = hexName.slice(-1);
  if (TEXTS[lastChar]) return parseText(lastChar, TEXTS[lastChar]);
  const lastTwo = hexName.slice(-2);
  if (TEXTS[lastTwo]) return parseText(lastTwo, TEXTS[lastTwo]);
  // 遍历匹配
  for (const key of Object.keys(TEXTS)) {
    if (hexName.includes(key) || key.includes(hexName)) return parseText(key, TEXTS[key]);
  }
  return null;
}

function parseText(rawName: string, data: HexagramTexts): HexagramClassicalText {
  return {
    name: SIMPLIFY[rawName] ?? rawName,
    guaCi: data['0'] ?? '',
    yaoCi: [data['1'] ?? '', data['2'] ?? '', data['3'] ?? '', data['4'] ?? '', data['5'] ?? '', data['6'] ?? ''],
    tuanZhuan: data['7'] ?? '',
  };
}
