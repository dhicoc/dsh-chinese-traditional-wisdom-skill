import type { BaziPillar, BaziPillars } from './baziEngine';

const ELEMENTS = ['木', '火', '土', '金', '水'] as const;
type Element = typeof ELEMENTS[number];
type MonthState = '旺' | '相' | '休' | '囚' | '死' | '余气';
type Status = '成立' | '不成立';

const STEM_ELEMENTS: Record<string, Element> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

const HIDDEN: Record<string, string[]> = {
  子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
  辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'],
};

const MONTH_STATE: Record<string, Record<Element, MonthState>> = {
  寅: { 木: '旺', 火: '相', 土: '死', 金: '囚', 水: '休' }, 卯: { 木: '旺', 火: '相', 土: '死', 金: '囚', 水: '休' },
  辰: { 木: '余气', 火: '相', 土: '旺', 金: '休', 水: '囚' },
  巳: { 木: '休', 火: '旺', 土: '相', 金: '死', 水: '囚' }, 午: { 木: '休', 火: '旺', 土: '相', 金: '死', 水: '囚' },
  未: { 木: '囚', 火: '余气', 土: '旺', 金: '相', 水: '死' },
  申: { 木: '死', 火: '囚', 土: '休', 金: '旺', 水: '相' }, 酉: { 木: '死', 火: '囚', 土: '休', 金: '旺', 水: '相' },
  戌: { 木: '囚', 火: '余气', 土: '旺', 金: '相', 水: '死' },
  亥: { 木: '相', 火: '死', 土: '囚', 金: '休', 水: '旺' }, 子: { 木: '相', 火: '死', 土: '囚', 金: '休', 水: '旺' },
  丑: { 木: '囚', 火: '死', 土: '旺', 金: '相', 水: '余气' },
};

const ROOT_BRANCHES: Record<Element, string[]> = {
  木: ['寅', '卯', '辰', '亥', '未'], 火: ['巳', '午', '未', '寅', '戌'], 土: ['辰', '戌', '丑', '未'],
  金: ['申', '酉', '戌', '丑', '巳'], 水: ['亥', '子', '丑', '申', '辰'],
};

const PATTERN_NAMES: Record<string, string> = {
  比肩: '建禄格', 劫财: '劫财格', 食神: '食神格', 伤官: '伤官格', 偏财: '偏财格', 正财: '正财格',
  七杀: '七杀格', 正官: '正官格', 偏印: '偏印格', 正印: '正印格',
};

const TRANSFORMATIONS: Array<{ stems: [string, string]; element: Element }> = [
  { stems: ['甲', '己'], element: '土' }, { stems: ['乙', '庚'], element: '金' }, { stems: ['丙', '辛'], element: '水' },
  { stems: ['丁', '壬'], element: '木' }, { stems: ['戊', '癸'], element: '火' },
];

export interface AdvancedBaziAnalysis {
  monthCommand: { branch: string; monthElement: Element; dayMasterState: string; obtainsCommand: boolean; reason: string };
  support: { obtainsRoot: boolean; obtainsMomentum: boolean; strength: '身强' | '身弱' | '中和'; reason: string[] };
  pattern: { name: string; status: Status; primaryGod: string; exposed: boolean; policy: string; reason: string[] };
  followPattern: { type: string; status: Status; policy: string; reason: string[] };
  transformation: { element: Element | ''; status: Status; policy: string; reason: string[] };
  fuyii: { principle: '扶弱' | '抑强' | '调和'; usefulElements: Element[]; reason: string[] };
  seasonalAdjustment: { usefulElements: Element[]; reason: string[] };
  passage: { conflict: string; element: Element | ''; status: Status; reason: string[] };
  remedy: { illness: string; remedy: string; status: Status; reason: string[] };
  priority: string[];
  confidenceNote: string;
}

function produces(a: Element): Element {
  return ELEMENTS[(ELEMENTS.indexOf(a) + 1) % ELEMENTS.length];
}

function controls(a: Element): Element {
  return ELEMENTS[(ELEMENTS.indexOf(a) + 2) % ELEMENTS.length];
}

function tenGod(dayStem: string, otherStem: string): string {
  const dayElement = STEM_ELEMENTS[dayStem];
  const otherElement = STEM_ELEMENTS[otherStem];
  const samePolarity = (['甲', '丙', '戊', '庚', '壬'].includes(dayStem)) === (['甲', '丙', '戊', '庚', '壬'].includes(otherStem));
  if (dayElement === otherElement) return samePolarity ? '比肩' : '劫财';
  if (produces(dayElement) === otherElement) return samePolarity ? '食神' : '伤官';
  if (controls(dayElement) === otherElement) return samePolarity ? '偏财' : '正财';
  if (controls(otherElement) === dayElement) return samePolarity ? '七杀' : '正官';
  return samePolarity ? '偏印' : '正印';
}

function pillarsList(pillars: BaziPillars): BaziPillar[] {
  return [pillars.year, pillars.month, pillars.day, pillars.hour];
}

function countElement(pillars: BaziPillars, element: Element): number {
  return pillarsList(pillars).reduce((sum, pillar) => (
    sum + (STEM_ELEMENTS[pillar.stem] === element ? 2 : 0) + (HIDDEN[pillar.branch] ?? []).filter((stem) => STEM_ELEMENTS[stem] === element).length
  ), 0);
}

function hasStemGod(pillars: BaziPillars, dayStem: string, gods: string[]): boolean {
  return pillarsList(pillars).some((pillar) => pillar.stem !== dayStem && gods.includes(tenGod(dayStem, pillar.stem)));
}

function chooseWeakest(elements: Element[], pillars: BaziPillars): Element[] {
  return [...elements].sort((a, b) => countElement(pillars, a) - countElement(pillars, b));
}

function seasonalAdjustment(monthBranch: string): { usefulElements: Element[]; reason: string[] } {
  if (['亥', '子', '丑'].includes(monthBranch)) return { usefulElements: ['木', '火'], reason: ['冬令寒湿，先取火暖局，木可引火。'] };
  if (['巳', '午', '未'].includes(monthBranch)) return { usefulElements: ['水', '金'], reason: ['夏令炎燥，先取水润局，金可生水。'] };
  if (['寅', '卯', '辰'].includes(monthBranch)) return { usefulElements: ['火'], reason: ['春令木旺湿寒，取火以暖局、泄秀。'] };
  return { usefulElements: ['水'], reason: ['秋令金燥，取水润燥。'] };
}

function analyzePassage(pillars: BaziPillars): AdvancedBaziAnalysis['passage'] {
  const present = ELEMENTS.filter((element) => countElement(pillars, element) > 0);
  const rules: Array<{ conflict: string; pair: [Element, Element]; element: Element }> = [
    { conflict: '木土', pair: ['木', '土'], element: '火' }, { conflict: '火金', pair: ['火', '金'], element: '土' },
    { conflict: '土水', pair: ['土', '水'], element: '金' }, { conflict: '金木', pair: ['金', '木'], element: '水' },
    { conflict: '水火', pair: ['水', '火'], element: '木' },
  ];
  const match = rules.find((rule) => rule.pair.every((element) => present.includes(element)));
  if (!match) return { conflict: '', element: '', status: '不成立', reason: ['未检出两行相战的通关条件。'] };
  return { conflict: match.conflict, element: match.element, status: '成立', reason: [`${match.conflict}两行同现，取${match.element}为通关。`] };
}

export function analyzeAdvancedBazi(pillars: BaziPillars): AdvancedBaziAnalysis {
  const dayStem = pillars.day.stem;
  const dayElement = STEM_ELEMENTS[dayStem];
  const monthBranch = pillars.month.branch;
  const monthElement = STEM_ELEMENTS[HIDDEN[monthBranch][0]];
  const state = MONTH_STATE[monthBranch][dayElement];
  const obtainsCommand = state === '旺' || state === '相' || state === '余气';
  const rootBranches = ROOT_BRANCHES[dayElement];
  const obtainsRoot = pillarsList(pillars).some((pillar) => rootBranches.includes(pillar.branch));
  const obtainsMomentum = hasStemGod(pillars, dayStem, ['比肩', '劫财', '正印', '偏印']);
  const supportCount = countElement(pillars, dayElement) + countElement(pillars, ELEMENTS[(ELEMENTS.indexOf(dayElement) + 4) % 5]);
  const drainCount = ELEMENTS.filter((element) => element !== dayElement && element !== ELEMENTS[(ELEMENTS.indexOf(dayElement) + 4) % 5]).reduce((sum, element) => sum + countElement(pillars, element), 0);
  const strength = obtainsCommand && (obtainsRoot || obtainsMomentum) || supportCount >= drainCount + 2
    ? '身强' : !obtainsCommand && !obtainsRoot && !obtainsMomentum && supportCount + 2 < drainCount ? '身弱' : '中和';
  const fuyii = strength === '身强'
    ? { principle: '抑强' as const, usefulElements: [controls(dayElement), produces(dayElement), ELEMENTS[(ELEMENTS.indexOf(dayElement) + 3) % 5]], reason: ['日主得令或扶助较多，取克、泄、耗。'] }
    : strength === '身弱'
      ? { principle: '扶弱' as const, usefulElements: [dayElement, ELEMENTS[(ELEMENTS.indexOf(dayElement) + 4) % 5]], reason: ['日主失令且少根少助，取比劫、印星生扶。'] }
      : { principle: '调和' as const, usefulElements: chooseWeakest([...ELEMENTS], pillars).slice(0, 2), reason: ['日主强弱中和，优先补全局偏弱五行。'] };
  const primaryStem = HIDDEN[monthBranch][0];
  const primaryGod = tenGod(dayStem, primaryStem);
  const exposed = [pillars.year.stem, pillars.month.stem, pillars.hour.stem].includes(primaryStem);
  const patternPolicy = '月支主气透于年、月或时干时，按其十神取普通格；日干不作透干。';
  const pattern = primaryGod === '比肩' || primaryGod === '劫财'
    ? { name: PATTERN_NAMES[primaryGod], status: '不成立' as const, primaryGod, exposed, policy: patternPolicy, reason: ['月支主气为比劫，按本规则不以比劫单独定普通格。'] }
    : exposed
      ? { name: PATTERN_NAMES[primaryGod], status: '成立' as const, primaryGod, exposed, policy: patternPolicy, reason: [`月支${monthBranch}主气${primaryStem}透于天干，对日主为${primaryGod}。`] }
      : { name: PATTERN_NAMES[primaryGod], status: '不成立' as const, primaryGod, exposed, policy: patternPolicy, reason: [`月支${monthBranch}主气${primaryStem}对日主为${primaryGod}，但未透于年、月或时干。`] };
  const dominant = chooseWeakest([...ELEMENTS], pillars).reverse()[0];
  const followType = dominant === controls(dayElement) ? '从财' : controls(dominant) === dayElement ? '从杀' : dominant === produces(dayElement) ? '从儿' : '';
  const followPolicy = '从格属于少见的特殊格局，只有日主极弱、全局力量高度集中时才考虑。';
  const followEligible = strength === '身弱' && !obtainsRoot && !obtainsMomentum && countElement(pillars, dominant) >= 6 && countElement(pillars, dayElement) <= 2;
  const followFailures = [
    strength !== '身弱' ? '日主仍有自身力量，并非极弱。' : '',
    obtainsRoot ? '日主在地支仍有根气。' : '',
    obtainsMomentum ? '命局仍有同类或生扶日主的力量。' : '',
    countElement(pillars, dominant) < 6 ? '全局力量尚未集中到单一五行。' : '',
    countElement(pillars, dayElement) > 2 ? '日主自身力量仍未弱到从格程度。' : '',
  ].filter(Boolean);
  const followPattern = followEligible && followType
    ? { type: followType, status: '成立' as const, policy: followPolicy, reason: [`日主无根少助，${dominant}力量集中，可按${followType}方向参看。`] }
    : { type: '', status: '不成立' as const, policy: followPolicy, reason: followFailures.length ? followFailures : ['整体力量并未呈现适合从格的单一倾向。'] };
  const pillarArray = pillarsList(pillars);
  const dayIndex = 2;
  const transform = TRANSFORMATIONS.find((rule) => {
    const partner = rule.stems[0] === dayStem ? rule.stems[1] : rule.stems[1] === dayStem ? rule.stems[0] : '';
    return Boolean(partner && pillarArray.some((pillar, index) => Math.abs(index - dayIndex) === 1 && pillar.stem === partner));
  });
  const transformationPolicy = '化气需日干与相邻天干相合，并得到月令或全局五行的支持；条件较严格。';
  const transformation: AdvancedBaziAnalysis['transformation'] = transform && (monthElement === transform.element || countElement(pillars, transform.element) >= 4)
    ? { element: transform.element, status: '成立', policy: transformationPolicy, reason: [`日干${dayStem}与相邻天干相合，且${transform.element}力量足以支持转化。`] }
    : { element: '', status: '不成立', policy: transformationPolicy, reason: ['未见同时具备相邻天干相合与足够五行支持的条件。'] };
  const passage = analyzePassage(pillars);
  const hasSevenKillings = hasStemGod(pillars, dayStem, ['七杀']);
  const hasOfficer = hasStemGod(pillars, dayStem, ['正官']);
  const hasFood = hasStemGod(pillars, dayStem, ['食神']);
  const hasSeal = hasStemGod(pillars, dayStem, ['正印', '偏印']);
  const remedy = hasSevenKillings && hasFood
    ? { illness: '七杀', remedy: '食神制杀', status: '成立' as const, reason: ['七杀与食神同时透干，按食神制杀取药。'] }
    : hasSevenKillings && hasSeal
      ? { illness: '七杀', remedy: '印化杀', status: '成立' as const, reason: ['七杀与印星同时透干，按印化杀取药。'] }
      : hasOfficer && hasFood
        ? { illness: '伤官见官风险', remedy: '印星通关', status: '不成立' as const, reason: ['官星与食伤同现，但未检出透干伤官和印星的完整条件。'] }
        : { illness: '', remedy: '', status: '不成立' as const, reason: ['命局中暂无明显的病药对应。'] };

  return {
    monthCommand: { branch: monthBranch, monthElement, dayMasterState: state, obtainsCommand, reason: `日主${dayElement}在${monthBranch}月为${state}。` },
    support: { obtainsRoot, obtainsMomentum, strength, reason: [`${obtainsRoot ? '地支有根' : '地支少根'}。`, `${obtainsMomentum ? '天干见比印助力' : '天干少比印助力'}。`, `支持计数${supportCount}，异类计数${drainCount}。`] },
    pattern,
    followPattern,
    transformation,
    fuyii,
    seasonalAdjustment: seasonalAdjustment(monthBranch),
    passage,
    remedy,
    priority: ['化气成立后顺化气参看', '从格成立后顺旺势参看', '调候与通关用于修正寒暖燥湿或相战', '常规格局与扶抑作为基础取用', '病药作为辅助观察'],
    confidenceNote: '本页从月令、根气、助力、寒暖燥湿等角度辅助观察命局。普通格取月支主气透干，化气仅取日干与相邻干五合；格局、从格与化气的看法因流派而异，宜结合整体命盘参考。',
  };
}
