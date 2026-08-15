/**
 * jieqiWellness — 24 节气 × 九种体质 调养规则库
 *
 * 缺口补齐（2026-07-13）：项目已有九种体质问卷 + 五运六气倾向 + 子午流注时辰，
 * 但缺「节气维度」——本模块补 24 节气通用调养 + 体质×节气针对性建议。
 *
 * 数据：
 * - JIEQI_24：24 节气通用调养（饮食/起居/运动/穴位/季节特征）
 * - JIEQI_CONSTITUTION：9 体质在 24 节气下的针对性加减建议
 * - getJieqiByDate：按公历月日取当前所处节气（近似表，无依赖；可传入 lunar-javascript
 *   的 getJieQiTable 精确推算，复用 daliurenEngine 的 jieqiFromTable 思路）
 *
 * 纯 TS 规则实现，无外部依赖。返回结构化建议，供 comboEngine 聚合与 Dashboard 渲染。
 */

export interface JieqiWellness {
  /** 节气名 */
  jieqi: string;
  /** 季节 */
  season: string;
  /** 节气特征（气候与物候） */
  feature: string;
  /** 通用饮食建议 */
  diet: string;
  /** 通用起居建议 */
  lifestyle: string;
  /** 通用运动建议 */
  exercise: string;
  /** 通用穴位保健 */
  acupoints: string;
  /** 调养总则 */
  principle: string;
}

/** 体质在节气下的针对性加减建议 */
export interface ConstitutionJieqiAdvice {
  /** 体质类型 */
  type: string;
  /** 该节气下该体质的特殊建议（叠加在通用建议之上） */
  advice: string;
  /** 该节气需特别注意的事项 */
  caution: string;
}

/** 24 节气通用调养表（按公历顺序，从立春开始为春季首节气） */
export const JIEQI_24: Record<string, JieqiWellness> = {
  '立春': { jieqi: '立春', season: '春', feature: '阳气升发，万物复苏，乍暖还寒', diet: '宜辛甘升阳：葱、姜、韭菜、芽菜；少酸收', lifestyle: '夜卧早起，广步于庭，渐减冬衣勿骤减', exercise: '慢跑、散步、舒展筋骨，宜动不宜剧烈', acupoints: '足三里、太冲（疏肝升阳）', principle: '养肝升阳，顺应春生之气' },
  '雨水': { jieqi: '雨水', season: '春', feature: '降水增多，湿气渐起，肝旺脾弱', diet: '宜健脾祛湿：山药、茯苓、薏米；少生冷油腻', lifestyle: '防湿邪，保持居处干燥，勿坐湿地', exercise: '八段锦、太极，舒缓为主', acupoints: '阴陵泉、足三里（健脾化湿）', principle: '疏肝健脾，防湿困脾' },
  '惊蛰': { jieqi: '惊蛰', season: '春', feature: '蛰虫始振，阳气奋发，风邪渐盛', diet: '宜清温升阳：梨、菠菜、芹菜；少寒凉', lifestyle: '避风邪，春捂勿早减衣', exercise: '放风筝、登山，舒展阳气', acupoints: '太冲、风池（疏肝祛风）', principle: '升阳达肝，防风邪外袭' },
  '春分': { jieqi: '春分', season: '春', feature: '昼夜平分，阴阳平衡，肝气最旺', diet: '宜平肝和胃：荠菜、春笋、枸杞；忌大辛大寒', lifestyle: '起居有常，调畅情志，忌怒', exercise: '瑜伽、慢跑，动静相宜', acupoints: '太冲、期门（平肝理气）', principle: '调和阴阳，平肝养肝' },
  '清明': { jieqi: '清明', season: '春', feature: '气清景明，湿气渐重，花粉渐多', diet: '宜清淡疏肝：菊花、桑叶、菠菜；少肥甘', lifestyle: '踏青舒郁，防过敏，保持心情舒畅', exercise: '踏青、散步、太极', acupoints: '太冲、合谷（开四关疏肝）', principle: '疏肝清热，防过敏' },
  '谷雨': { jieqi: '谷雨', season: '春', feature: '雨生百谷，湿温渐起，肝余脾渐', diet: '宜健脾化湿：扁豆、冬瓜、赤小豆；少酸涩', lifestyle: '防湿温，居处通风', exercise: '慢跑、五禽戏，微微汗出', acupoints: '阴陵泉、丰隆（化痰祛湿）', principle: '健脾祛湿，承春启夏' },
  '立夏': { jieqi: '立夏', season: '夏', feature: '阳气渐盛，心火渐旺，万物繁茂', diet: '宜清心养心：莲子、百合、苦瓜；少辛辣', lifestyle: '夜卧早起，午间小憩，养心气', exercise: '太极拳、散步，忌大汗', acupoints: '神门、内关（养心安神）', principle: '养心安神，清心降火' },
  '小满': { jieqi: '小满', season: '夏', feature: '湿热渐盛，心火偏亢，皮肤易疮', diet: '宜清热利湿：黄瓜、冬瓜、绿豆；少肥甘厚味', lifestyle: '防湿热，皮肤清洁，忌熬夜上火', exercise: '游泳、散步，忌烈日下剧烈运动', acupoints: '曲池、阴陵泉（清热利湿）', principle: '清热利湿，养心安神' },
  '芒种': { jieqi: '芒种', season: '夏', feature: '湿热交蒸，倦怠乏力，心烦易怒', diet: '宜清热祛湿：薏米、绿豆、西瓜；少冷饮', lifestyle: '午休养心，防中暑，情志宜静', exercise: '散步、八段锦，避正午烈日', acupoints: '内关、足三里（益气清心）', principle: '清热祛湿，益气养心' },
  '夏至': { jieqi: '夏至', season: '夏', feature: '阳气最盛，阴气始生，心火最旺', diet: '宜清心解暑：西瓜、绿豆、莲藕；忌冰饮伤阳', lifestyle: '夜卧早起，顺阴阳交接，午休重要', exercise: '清晨或傍晚散步，忌大汗淋漓', acupoints: '神门、太冲（清心平肝）', principle: '养阳护阴，清心解暑' },
  '小暑': { jieqi: '小暑', season: '夏', feature: '暑热渐盛，湿气加重，食欲减退', diet: '宜清淡消暑：丝瓜、苦瓜、荷叶；少油腻', lifestyle: '防暑降温，饮食清淡，忌贪凉', exercise: '游泳、太极，避高温时段', acupoints: '足三里、中脘（健脾开胃）', principle: '消暑健脾，防暑防湿' },
  '大暑': { jieqi: '大暑', season: '夏', feature: '一年最热，湿热交蒸，易中暑', diet: '宜清热利湿：绿豆汤、西瓜、薏米；忌辛辣油腻', lifestyle: '避暑防湿，午睡忌过长，居处通风', exercise: '室内舒展，忌烈日下运动', acupoints: '合谷、曲池（清热泻火）', principle: '清热利湿，防暑护心' },
  '立秋': { jieqi: '立秋', season: '秋', feature: '阳气渐收，阴气渐长，燥邪初起', diet: '宜润肺养阴：梨、银耳、百合；少辛燥', lifestyle: '早卧早起，收敛神气，秋冻适度', exercise: '登山、慢跑，收敛阳气', acupoints: '太渊、肺俞（润肺养阴）', principle: '润肺养阴，收敛阳气' },
  '处暑': { jieqi: '处暑', season: '秋', feature: '暑气止，燥渐盛，秋乏渐显', diet: '宜滋阴润燥：莲藕、蜂蜜、芝麻；少寒凉', lifestyle: '防秋乏，早睡早起，适当午休', exercise: '散步、登山，舒缓为主', acupoints: '太溪、三阴交（滋阴润燥）', principle: '滋阴润燥，防秋乏' },
  '白露': { jieqi: '白露', season: '秋', feature: '凉燥渐盛，易伤肺阴，鼻咽干', diet: '宜润肺生津：梨、百合、杏仁；少辛温', lifestyle: '防凉燥，增衣保暖，忌露身', exercise: '慢跑、太极，避晨寒', acupoints: '鱼际、太渊（润肺生津）', principle: '润肺防燥，保暖养阴' },
  '秋分': { jieqi: '秋分', season: '秋', feature: '昼夜平分，凉燥明显，阳气内收', diet: '宜平补润燥：山药、莲子、银耳；少寒凉辛辣', lifestyle: '起居有常，情志安宁，秋冻有度', exercise: '登高、慢跑，动静结合', acupoints: '太溪、足三里（平补肺肾）', principle: '平调阴阳，润燥养肺' },
  '寒露': { jieqi: '寒露', season: '秋', feature: '寒凉渐重，燥邪伤肺，易感冒', diet: '宜温润养肺：核桃、山药、大枣；少生冷', lifestyle: '防寒保暖，足部保暖重要', exercise: '散步、八段锦，避寒晨', acupoints: '足三里、关元（温阳固本）', principle: '温润养肺，防寒固本' },
  '霜降': { jieqi: '霜降', season: '秋', feature: '气肃霜降，寒燥交加，脾易受困', diet: '宜温补健脾：板栗、山药、白萝卜；少寒凉', lifestyle: '防寒燥，添衣保暖，护脾胃', exercise: '散步、五禽戏，微微汗出', acupoints: '足三里、中脘（健脾温中）', principle: '温补健脾，承秋启冬' },
  '立冬': { jieqi: '立冬', season: '冬', feature: '阳气潜藏，阴气盛极，万物闭藏', diet: '宜温补藏阳：羊肉、核桃、板栗；少生冷', lifestyle: '早卧晚起，必待日光，保暖藏阳', exercise: '室内运动，忌大汗泄阳', acupoints: '关元、命门（温阳补肾）', principle: '温补藏阳，补肾固本' },
  '小雪': { jieqi: '小雪', season: '冬', feature: '寒渐盛，阳气藏，情志易抑郁', diet: '宜温阳益肾：羊肉、核桃、桂圆；少寒凉', lifestyle: '防寒保暖，调畅情志，多晒太阳', exercise: '室内太极、八段锦，避寒', acupoints: '涌泉、命门（温阳益肾）', principle: '温阳益肾，调畅情志' },
  '大雪': { jieqi: '大雪', season: '冬', feature: '寒盛雪大，阳气深藏，易关节痛', diet: '宜温补益肾：牛肉、羊肉、山药；少咸寒', lifestyle: '防寒保暖，护腰膝，早卧晚起', exercise: '室内舒展，忌受寒', acupoints: '命门、肾俞（温肾壮阳）', principle: '温补益肾，防寒护阳' },
  '冬至': { jieqi: '冬至', season: '冬', feature: '阴极阳生，一阳初动，最宜养藏', diet: '宜温补养藏：羊肉、当归、生姜；忌寒凉泄阳', lifestyle: '早卧晚起，护一阳初生，节欲保精', exercise: '室内静养，太极、站桩，忌大汗', acupoints: '关元、神阙（温阳养藏）', principle: '护一阳初生，温养肾精' },
  '小寒': { jieqi: '小寒', season: '冬', feature: '寒气盛，阳气藏，易寒凝血瘀', diet: '宜温阳散寒：羊肉、桂圆、生姜；少寒凉', lifestyle: '防寒保暖，护头颈腰膝，早卧晚起', exercise: '室内运动，避寒晨', acupoints: '大椎、关元（温阳散寒）', principle: '温阳散寒，防寒凝血瘀' },
  '大寒': { jieqi: '大寒', season: '冬', feature: '一年最冷，阴盛极，阳气将萌', diet: '宜温补固本：羊肉、核桃、黑芝麻；少寒凉', lifestyle: '防寒固本，早卧晚起，情志安宁', exercise: '室内舒展，忌受寒', acupoints: '命门、涌泉（温肾固本）', principle: '温补固本，承冬启春' },
};

/** 体质在节气下的针对性建议（9 体质 × 季节关键节气示例）。
 *  未命中时回退到体质通用调养方向（constitutionQuestionnaire 的 direction/diet/acupoints）。 */
export const JIEQI_CONSTITUTION: Array<{
  jieqi: string;
  advices: ConstitutionJieqiAdvice[];
}> = [
  {
    jieqi: '立春',
    advices: [
      { type: '气虚质', advice: '气虚者春升乏力，宜补气升阳：黄芪茶、山药粥，晨起缓行升阳气', caution: '忌晨起剧烈运动耗气，防春困加重' },
      { type: '气郁质', advice: '春应肝，气郁者宜疏肝达郁：玫瑰花茶、踏青舒郁，太冲按揉', caution: '忌情志郁怒，春日肝旺易郁结化火' },
      { type: '阳虚质', advice: '阳虚者春寒尤甚，宜温阳升发：葱姜煮水、晒背，勿骤减衣', caution: '忌过早减衣，防倒春寒伤阳' },
      { type: '阴虚质', advice: '阴虚者春燥易上火，宜滋阴柔肝：菊花枸杞茶、银耳', caution: '忌辛温升散太过，防助火伤阴' },
    ],
  },
  {
    jieqi: '大暑',
    advices: [
      { type: '湿热质', advice: '湿热者盛夏最苦，宜清热利湿重剂：绿豆薏米汤、冬瓜荷叶汤，合谷曲池', caution: '忌肥甘油腻助湿，忌贪凉郁遏湿热' },
      { type: '痰湿质', advice: '痰湿者暑湿困脾，宜化痰祛湿：陈皮薏米粥，阴陵泉丰隆', caution: '忌冷饮冰品助痰湿，午睡勿过长' },
      { type: '阴虚质', advice: '阴虚者暑热伤阴，宜滋阴清热：麦冬莲子汤、西瓜，三阴交太溪', caution: '忌汗出太过伤阴，烈日下久行' },
      { type: '阳虚质', advice: '阳虚者夏宜借天阳补阳：晨晒太阳、生姜红枣茶，勿贪凉', caution: '忌过食冷饮伤阳，空调温度勿过低' },
    ],
  },
  {
    jieqi: '立秋',
    advices: [
      { type: '气虚质', advice: '气虚者秋燥伤肺气，宜润肺益气：山药百合粥、黄芪，足三里太渊', caution: '忌汗出当风，防秋燥伤肺气' },
      { type: '阴虚质', advice: '阴虚者秋燥最伤阴，宜滋阴润燥重剂：银耳百合梨汤、麦冬', caution: '忌辛温燥烈，防燥邪伤阴化火' },
      { type: '痰湿质', advice: '痰湿者秋宜健脾化痰：陈皮茯苓粥，丰隆阴陵泉', caution: '忌肥甘滋腻助痰，秋补勿过早' },
      { type: '气郁质', advice: '秋悲易伤气郁者，宜疏肝畅情：合欢花茶、登高舒郁', caution: '忌悲秋伤肝，情志宜畅' },
    ],
  },
  {
    jieqi: '冬至',
    advices: [
      { type: '阳虚质', advice: '阳虚者冬至最宜温补：当归生姜羊肉汤、艾灸关元命门', caution: '忌寒凉泄阳，节欲保精护一阳初生' },
      { type: '气虚质', advice: '气虚者冬宜补气藏阳：黄芪炖鸡、山药粥，足三里关元', caution: '忌大汗泄气，早卧晚起养藏' },
      { type: '阴虚质', advice: '阴虚者冬宜滋阴补肾：枸杞银耳、黑芝麻，三阴交太溪', caution: '忌温燥太过伤阴，羊肉宜配滋阴' },
      { type: '血瘀质', advice: '寒凝血瘀者冬至最重，宜温通活血：桂圆红枣姜茶、艾灸', caution: '忌寒凉凝滞，保暖防血脉瘀阻' },
    ],
  },
];

/** 24 节气近似日期表（公历月日顺序，1月小寒为年初）。
 *  无依赖近似，用于未传入 lunar-javascript 时。精确推算传 jieQiTable。 */
const JIEQI_APPROX: Array<{ m: number; d: number; j: string }> = [
  { m: 1, d: 6, j: '小寒' }, { m: 1, d: 20, j: '大寒' },
  { m: 2, d: 4, j: '立春' }, { m: 2, d: 19, j: '雨水' },
  { m: 3, d: 6, j: '惊蛰' }, { m: 3, d: 21, j: '春分' },
  { m: 4, d: 5, j: '清明' }, { m: 4, d: 20, j: '谷雨' },
  { m: 5, d: 6, j: '立夏' }, { m: 5, d: 21, j: '小满' },
  { m: 6, d: 6, j: '芒种' }, { m: 6, d: 21, j: '夏至' },
  { m: 7, d: 7, j: '小暑' }, { m: 7, d: 23, j: '大暑' },
  { m: 8, d: 8, j: '立秋' }, { m: 8, d: 23, j: '处暑' },
  { m: 9, d: 8, j: '白露' }, { m: 9, d: 23, j: '秋分' },
  { m: 10, d: 8, j: '寒露' }, { m: 10, d: 24, j: '霜降' },
  { m: 11, d: 7, j: '立冬' }, { m: 11, d: 22, j: '小雪' },
  { m: 12, d: 7, j: '大雪' }, { m: 12, d: 22, j: '冬至' },
];

/** lunar-javascript getJieQiTable() 结果类型（值可能是 Date / Solar / 日期字符串） */
type JieQiTableLike = Record<string, unknown>;

/** 从 lunar-javascript getJieQiTable() 结果找当前日期所处节气（最近一个已过节气点）。
 *  复用 daliurenEngine.jieqiFromTable 的解析思路。 */
export function jieqiFromTable(table: JieQiTableLike | undefined, date: { year: number; month: number; day: number }): string {
  if (!table) return approxJieqi(date.month, date.day);
  const today = new Date(date.year, date.month - 1, date.day);
  const entries: Array<{ name: string; date: Date }> = [];
  for (const [name, value] of Object.entries(table)) {
    if (!/[一-鿿]/.test(name)) continue; // 只取中文节气名
    let d: Date | null = null;
    if (value instanceof Date) d = value;
    else if (typeof value === 'string') d = new Date(value);
    else if (value && typeof value === 'object') {
      const m = String(value).match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (m) d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    if (d) entries.push({ name, date: d });
  }
  if (entries.length === 0) return approxJieqi(date.month, date.day);
  entries.sort((a, b) => a.date.getTime() - b.date.getTime());
  let current = '冬至';
  for (const e of entries) {
    if (e.date <= today) current = e.name;
  }
  return current;
}

/** 无依赖近似：按公历月日取当前所处节气 */
export function approxJieqi(month: number, day: number): string {
  let current = '冬至';
  for (const t of JIEQI_APPROX) {
    if (month < t.m || (month === t.m && day < t.d)) break;
    current = t.j;
  }
  return current;
}

export interface JieqiQueryResult {
  /** 当前所处节气 */
  jieqi: string;
  /** 节气调养数据 */
  wellness: JieqiWellness;
  /** 命中的体质针对性建议（可能为空） */
  constitutionAdvice: ConstitutionJieqiAdvice[];
  /** 口径（精确/近似） */
  mode: 'local-exact' | 'local-approx';
}

/**
 * 查询某日期的节气调养 + 体质针对性建议。
 * @param date 公历日期 { year, month, day }
 * @param constitution 可选体质类型（气虚质等），命中时返回针对性建议
 * @param jieQiTable 可选 lunar-javascript getJieQiTable() 结果，传入走精确
 */
export function queryJieqiWellness(
  date: { year: number; month: number; day: number },
  constitution?: string,
  jieQiTable?: JieQiTableLike,
): JieqiQueryResult {
  const jieqi = jieQiTable ? jieqiFromTable(jieQiTable, date) : approxJieqi(date.month, date.day);
  const wellness = JIEQI_24[jieqi] ?? JIEQI_24['冬至'];
  const entry = JIEQI_CONSTITUTION.find((e) => e.jieqi === jieqi);
  const constitutionAdvice = entry
    ? entry.advices.filter((a) => !constitution || a.type === constitution)
    : [];
  return {
    jieqi,
    wellness,
    constitutionAdvice,
    mode: jieQiTable ? 'local-exact' : 'local-approx',
  };
}
