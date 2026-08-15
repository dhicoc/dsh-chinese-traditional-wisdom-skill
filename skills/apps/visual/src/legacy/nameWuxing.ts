/**
 * nameWuxing — 姓名五格剖象法 + 三才配置吉凶计算。
 *
 * 五格：天格、人格、地格、外格、总格。三才取天/人/地格五行配置吉凶。
 * 笔画尾数 → 五行（康熙标准）：1/2 木、3/4 火、5/6 土、7/8 金、9/0 水。
 *
 * 这是传统姓名学的参考框架，非科学结论；UI 必须标注「文化参考」。
 */

import { getKangxiStrokes, getCharWuxing, getCharMeaning, estimateStrokes } from './nameStrokes';
import dayanList from './dayanList.json';
import sancaiDetails from './sancaiDetails.json';

/** 笔画尾数 → 五行 */
function strokesToWuxing(strokes: number): string {
  const tail = strokes % 10;
  if (tail === 1 || tail === 2) return '木';
  if (tail === 3 || tail === 4) return '火';
  if (tail === 5 || tail === 6) return '土';
  if (tail === 7 || tail === 8) return '金';
  return '水'; // 9 / 0
}

/** 81 数理记录（来自 fate dayan.go，含九星名/详注/女性不宜/最大好运标记） */
interface DaYan {
  number: number;
  lucky: string;
  skyNine: string;
  comment: string;
  femaleUnsuitable: boolean;
  maxLuck: boolean;
}

const DAYAN: DaYan[] = dayanList as DaYan[];

/** 取数理记录；超过 81 按 fate 规则循环取模。 */
function dayanFind(n: number): DaYan {
  const idx = ((n - 1) % 81 + 81) % 81;
  return DAYAN[idx] ?? { number: n, lucky: '—', skyNine: '', comment: '', femaleUnsuitable: false, maxLuck: false };
}

/** 三才详描表（来自 fate sancai_data.go，118 组） */
const SANCAI_DETAILS = sancaiDetails as Record<string, string>;

/** 三才配置吉凶表（天-人-地 → 吉凶），仅收录常见配置 */
const SANCAI_LUCK: Record<string, { luck: string; desc: string }> = {
  '木木木': { luck: '大吉', desc: '根基稳固，向上发展' },
  '木木火': { luck: '吉', desc: '受上司引荐，顺调发达' },
  '木木土': { luck: '凶', desc: '向下发展，易陷困弱' },
  '木火木': { luck: '吉', desc: '上进顺利，博得名利' },
  '木火火': { luck: '吉', desc: '性慧颖，可成大业' },
  '木火土': { luck: '吉', desc: '受长辈提拔，安稳' },
  '木土木': { luck: '凶', desc: '基础不稳，易生变故' },
  '木土火': { luck: '凶', desc: '阻碍多，劳而不获' },
  '木土土': { luck: '凶', desc: '向下发展，难成大功' },
  '木土金': { luck: '凶', desc: '基础弱，易生破败' },
  '木金木': { luck: '凶', desc: '克天格，基础动摇' },
  '木金火': { luck: '凶', desc: '克上克下，多灾' },
  '木金土': { luck: '凶', desc: '少有成功，孤独' },
  '木金金': { luck: '凶', desc: '克上，难成功' },
  '木水木': { luck: '吉', desc: '得长辈提拔，顺调' },
  '木水火': { luck: '凶', desc: '克上，易生灾厄' },
  '木水土': { luck: '凶', desc: '基础不稳，变动多' },
  '木水金': { luck: '凶', desc: '克上，难安定' },
  '木水水': { luck: '吉', desc: '得下属助，发展顺' },
  '火木木': { luck: '吉', desc: '向上顺调，博得名利' },
  '火木火': { luck: '吉', desc: '性灵活，得众人助' },
  '火木土': { luck: '吉', desc: '受长辈提拔，安稳' },
  '火木金': { luck: '凶', desc: '克下，易生变故' },
  '火木水': { luck: '凶', desc: '克下，事业易破' },
  '火火木': { luck: '吉', desc: '上进伸展，博得名利' },
  '火火火': { luck: '凶', desc: '过于刚强，易生灾' },
  '火火土': { luck: '吉', desc: '受长辈提拔，安稳' },
  '火火金': { luck: '凶', desc: '克下，易生破败' },
  '火火水': { luck: '凶', desc: '克下，多灾厄' },
  '火土木': { luck: '吉', desc: '得长辈提拔，顺调' },
  '火土火': { luck: '吉', desc: '受长辈引荐，发达' },
  '火土土': { luck: '吉', desc: '基础稳固，安泰' },
  '火土金': { luck: '吉', desc: '得长辈提拔，成功' },
  '火土水': { luck: '凶', desc: '克下，易生破败' },
  '火金木': { luck: '凶', desc: '克上克下，多灾' },
  '火金火': { luck: '凶', desc: '克上，难成功' },
  '火金土': { luck: '凶', desc: '基础弱，难发展' },
  '火金金': { luck: '凶', desc: '克上，多困弱' },
  '火金水': { luck: '凶', desc: '克上，灾厄频生' },
  '火水木': { luck: '凶', desc: '克上，易生灾厄' },
  '火水火': { luck: '凶', desc: '克上，难安定' },
  '火水土': { luck: '凶', desc: '克上，基础动摇' },
  '火水金': { luck: '凶', desc: '克上，多破败' },
  '火水水': { luck: '凶', desc: '克上，多灾变' },
  '土木木': { luck: '凶', desc: '基础弱，向下发展' },
  '土木火': { luck: '凶', desc: '基础弱，难成事' },
  '土木土': { luck: '凶', desc: '基础不稳，变故多' },
  '土木金': { luck: '凶', desc: '基础弱，易破败' },
  '土木水': { luck: '凶', desc: '基础弱，灾厄多' },
  '土火木': { luck: '吉', desc: '受长辈提拔，顺调' },
  '土火火': { luck: '吉', desc: '得长辈助，发达' },
  '土火土': { luck: '吉', desc: '基础稳固，安泰' },
  '土火金': { luck: '吉', desc: '得长辈助，成功' },
  '土火水': { luck: '凶', desc: '克下，易破败' },
  '土土木': { luck: '吉', desc: '基础稳固，向上' },
  '土土火': { luck: '吉', desc: '受长辈提拔，发达' },
  '土土土': { luck: '吉', desc: '温厚老实，安稳' },
  '土土金': { luck: '吉', desc: '基础稳固，成功' },
  '土土水': { luck: '凶', desc: '克下，易破败' },
  '土金木': { luck: '凶', desc: '克下，难发展' },
  '土金火': { luck: '凶', desc: '克下，多灾' },
  '土金土': { luck: '吉', desc: '得长辈助，顺调' },
  '土金金': { luck: '吉', desc: '受长辈助，成功' },
  '土金水': { luck: '凶', desc: '克下，易破败' },
  '土水木': { luck: '凶', desc: '基础动摇，多灾' },
  '土水火': { luck: '凶', desc: '基础弱，难成功' },
  '土水土': { luck: '凶', desc: '基础不稳，变动' },
  '土水金': { luck: '凶', desc: '基础弱，破败' },
  '土水水': { luck: '凶', desc: '基础动摇，多病' },
  '金木木': { luck: '凶', desc: '克上，基础动摇' },
  '金木火': { luck: '凶', desc: '克上，多灾厄' },
  '金木土': { luck: '凶', desc: '克上，难安定' },
  '金木金': { luck: '凶', desc: '克上克下，多灾' },
  '金木水': { luck: '凶', desc: '克上，易破败' },
  '金火木': { luck: '凶', desc: '克上，难成功' },
  '金火火': { luck: '凶', desc: '克上，多困弱' },
  '金火土': { luck: '凶', desc: '克上，难发展' },
  '金火金': { luck: '凶', desc: '克上，灾厄频' },
  '金火水': { luck: '凶', desc: '克上，多灾变' },
  '金土木': { luck: '吉', desc: '得长辈助，顺调' },
  '金土火': { luck: '吉', desc: '受长辈提拔，发达' },
  '金土土': { luck: '吉', desc: '基础稳固，安泰' },
  '金土金': { luck: '吉', desc: '受长辈助，成功' },
  '金土水': { luck: '凶', desc: '克下，易破败' },
  '金金木': { luck: '凶', desc: '克下，难发展' },
  '金金火': { luck: '凶', desc: '克下，多灾' },
  '金金土': { luck: '吉', desc: '受长辈助，顺调' },
  '金金金': { luck: '吉', desc: '刚强果断，成功' },
  '金金水': { luck: '凶', desc: '克下，易破败' },
  '金水木': { luck: '吉', desc: '得长辈提拔，顺调' },
  '金水火': { luck: '凶', desc: '克上，易灾厄' },
  '金水土': { luck: '凶', desc: '基础动摇，多变' },
  '金水金': { luck: '吉', desc: '得长辈助，成功' },
  '金水水': { luck: '吉', desc: '得下属助，发展' },
  '水木木': { luck: '吉', desc: '得长辈提拔，顺调' },
  '水木火': { luck: '吉', desc: '受长辈引荐，发达' },
  '水木土': { luck: '吉', desc: '基础稳固，安泰' },
  '水木金': { luck: '凶', desc: '克下，易破败' },
  '水木水': { luck: '吉', desc: '得长辈助，发展' },
  '水火木': { luck: '凶', desc: '克上，易灾厄' },
  '水火火': { luck: '凶', desc: '克上，难安定' },
  '水火土': { luck: '凶', desc: '克上，基础动摇' },
  '水火金': { luck: '凶', desc: '克上，多破败' },
  '水火水': { luck: '凶', desc: '克上，多灾变' },
  '水土木': { luck: '凶', desc: '基础动摇，多灾' },
  '水土火': { luck: '凶', desc: '基础弱，难成功' },
  '水土土': { luck: '凶', desc: '基础不稳，变动' },
  '水土金': { luck: '凶', desc: '基础弱，破败' },
  '水土水': { luck: '凶', desc: '基础动摇，多病' },
  '水金木': { luck: '凶', desc: '克下，难发展' },
  '水金火': { luck: '凶', desc: '克下，多灾' },
  '水金土': { luck: '吉', desc: '得长辈助，顺调' },
  '水金金': { luck: '吉', desc: '受长辈助，成功' },
  '水金水': { luck: '吉', desc: '得长辈助，发展' },
  '水水木': { luck: '吉', desc: '得长辈提拔，顺调' },
  '水水火': { luck: '凶', desc: '克上，易灾厄' },
  '水水土': { luck: '凶', desc: '基础动摇，多变' },
  '水水金': { luck: '吉', desc: '得长辈助，成功' },
  '水水水': { luck: '吉', desc: '温厚，得众助' },
};

export interface NameChar {
  char: string;
  strokes: number;
  /** 笔画尾数五行（五格体系用） */
  wuxing: string;
  /** 字义五行（fate 数据，用于补八字参考），未收录为空 */
  meaningWuxing: string;
  /** 字义出处（fate character.json 的 meaning 字段），未收录为空 */
  meaning: string;
  /** 是否为未收录字（回退估算） */
  estimated: boolean;
}

export interface WuGe {
  tian: number; ren: number; di: number; wai: number; zong: number;
}

export interface WuGeEntry {
  name: string;
  value: number;
  wuxing: string;
  luck: string;
  /** 九星名（如「太极之数」「春日牡丹」） */
  skyNine: string;
  /** 数理详注 */
  comment: string;
  desc: string;
  /** 是否女性不宜此数 */
  femaleUnsuitable: boolean;
  /** 是否最大好运数（41 数） */
  maxLuck: boolean;
}

export interface SanCaiConfig {
  config: string; // 如「木火土」
  luck: string;
  desc: string;
}

export interface NameAnalysis {
  surnameChars: NameChar[];
  givenChars: NameChar[];
  hasUnrecorded: boolean;
  wuGe: WuGe;
  wuGeEntries: WuGeEntry[];
  sanCai: SanCaiConfig;
  wuxingBalance: Record<string, number>;
  totalStrokes: number;
  confidenceNote: string;
}

/** 解析姓名字串为带笔画/五行的字元数组 */
async function parseChars(text: string): Promise<{ chars: NameChar[]; hasUnrecorded: boolean }> {
  const chars: NameChar[] = [];
  let hasUnrecorded = false;
  for (const ch of text) {
    const s = getKangxiStrokes(ch);
    const meaningWx = getCharWuxing(ch);
    const meaning = await getCharMeaning(ch);
    if (s === null) {
      hasUnrecorded = true;
      const est = estimateStrokes(ch);
      chars.push({ char: ch, strokes: est, wuxing: strokesToWuxing(est), meaningWuxing: meaningWx, meaning, estimated: true });
    } else {
      chars.push({ char: ch, strokes: s, wuxing: strokesToWuxing(s), meaningWuxing: meaningWx, meaning, estimated: false });
    }
  }
  return { chars, hasUnrecorded };
}

const WU_GE_DESC: Record<string, string> = {
  天格: '祖上根基、先天运势',
  人格: '主运、自身核心运势',
  地格: '前运、早晚年环境',
  外格: '副运、人际外界关系',
  总格: '后运、中晚年总运势',
};

/**
 * 计算五格剖象法。
 * 规则（单姓单名/单姓双名/复姓等通用）：
 * - 天格 = 姓氏笔画和 + 1
 * - 人格 = 姓氏末字 + 名字首字
 * - 地格 = 名字笔画和 + 1（单名）；双名为名字两字和
 * - 外格 = 总格 - 人格 + 1
 * - 总格 = 姓氏 + 名字所有笔画和
 */
function calcWuGe(surnameChars: NameChar[], givenChars: NameChar[]): WuGe {
  const surnameSum = surnameChars.reduce((s, c) => s + c.strokes, 0);
  const givenSum = givenChars.reduce((s, c) => s + c.strokes, 0);
  const surnameLast = surnameChars[surnameChars.length - 1]?.strokes ?? 0;
  const givenFirst = givenChars[0]?.strokes ?? 0;

  const tian = surnameSum + 1;
  const ren = surnameLast + givenFirst;
  const di = givenChars.length === 1 ? givenSum + 1 : givenSum;
  const zong = surnameSum + givenSum;
  const wai = zong - ren + 1;
  return { tian, ren, di, wai, zong };
}

export async function analyzeName(surname: string, givenName: string): Promise<NameAnalysis> {
  const { chars: surnameChars, hasUnrecorded: sUnrec } = await parseChars(surname.trim());
  const { chars: givenChars, hasUnrecorded: gUnrec } = await parseChars(givenName.trim());
  const hasUnrecorded = sUnrec || gUnrec;

  const wg = calcWuGe(surnameChars, givenChars);

  const makeWuGeEntry = (name: string, value: number): WuGeEntry => {
    const dy = dayanFind(value);
    return {
      name,
      value,
      wuxing: strokesToWuxing(value),
      luck: dy.lucky,
      skyNine: dy.skyNine,
      comment: dy.comment,
      desc: WU_GE_DESC[name] ?? '',
      femaleUnsuitable: dy.femaleUnsuitable,
      maxLuck: dy.maxLuck,
    };
  };

  const wuGeEntries: WuGeEntry[] = [
    makeWuGeEntry('天格', wg.tian),
    makeWuGeEntry('人格', wg.ren),
    makeWuGeEntry('地格', wg.di),
    makeWuGeEntry('外格', Math.max(wg.wai, 1)),
    makeWuGeEntry('总格', wg.zong),
  ];

  // 三才取天/人/地格五行
  const tianWx = strokesToWuxing(wg.tian);
  const renWx = strokesToWuxing(wg.ren);
  const diWx = strokesToWuxing(wg.di);
  const sanCaiKey = tianWx + renWx + diWx;
  const sanCaiLuck = SANCAI_LUCK[sanCaiKey]?.luck ?? '—';
  // 详描优先用 fate 完整 118 组表；缺失则回退 SANCAI_LUCK 简短 desc
  const sanCaiDesc = SANCAI_DETAILS[sanCaiKey] ?? SANCAI_LUCK[sanCaiKey]?.desc ?? '配置较少见，需结合整体判断';
  const sanCaiInfo = { luck: sanCaiLuck, desc: sanCaiDesc };

  // 五行平衡：统计姓 + 名各字五行
  const wuxingBalance: Record<string, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
  [...surnameChars, ...givenChars].forEach((c) => {
    wuxingBalance[c.wuxing] = (wuxingBalance[c.wuxing] ?? 0) + 1;
  });

  const totalStrokes = wg.zong;

  return {
    surnameChars,
    givenChars,
    hasUnrecorded,
    wuGe: wg,
    wuGeEntries,
    sanCai: { config: sanCaiKey, luck: sanCaiInfo.luck, desc: sanCaiInfo.desc },
    wuxingBalance,
    totalStrokes,
    confidenceNote: hasUnrecorded
      ? '部分汉字未收录在康熙笔画表中，笔画为估算（已标注），结果仅供参考。'
      : '基于康熙字典笔画与五格剖象法推算；姓名学为传统文化参考，不构成命名决策依据。',
  };
}
