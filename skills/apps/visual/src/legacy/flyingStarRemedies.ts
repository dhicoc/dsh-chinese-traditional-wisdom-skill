/**
 * flyingStarRemedies — 九星化煞建议与方位用途数据
 *
 * 提炼自 Sudo-Biao/suangua (MIT) 的 NINE_STARS 数据表，
 * 含化煞物品、适宜房间用途、健康注意、事业提示。
 * 用于增强流年飞星模块的展示层。
 */

export interface NineStarRemedy {
  /** 星编号 1-9 */
  num: number;
  /** 星名（如「一白贪狼星」） */
  name: string;
  /** 五行 */
  element: string;
  /** 吉凶 */
  nature: '吉' | '大吉' | '凶' | '大凶';
  /** 方位用途标签 */
  usageLabel: string;
  /** 适宜房间用途 */
  roomUse: string[];
  /** 事业提示 */
  career: string;
  /** 健康注意 */
  health: string;
  /** 化煞物品（凶星才有） */
  remedy?: string;
  /** 建议颜色 */
  colors?: string;
  /** 具体摆设物品 */
  items?: string;
  /** 含义简述 */
  meaning: string;
}

export const NINE_STAR_REMEDIES: Record<number, NineStarRemedy> = {
  1: {
    num: 1, name: '一白贪狼星', element: '水', nature: '吉',
    usageLabel: '桃花位',
    roomUse: ['书房', '主卧（单身或学生）'],
    career: '利文学、外交、贸易、演讲',
    health: '注意肾脏、泌尿系统',
    colors: '黑色、蓝色、白色',
    items: '水种植物、鱼缸、黑色水晶',
    meaning: '主桃花、文学、学业、贵人、口才',
  },
  2: {
    num: 2, name: '二黑巨门星', element: '土', nature: '大凶',
    usageLabel: '病符位',
    roomUse: ['厕所', '储物室（避免卧室厨房）'],
    career: '此宫位不利工作，防官非',
    health: '脾胃、妇科、腹部疾病',
    remedy: '铜葫芦、六帝钱、铜钟化煞',
    colors: '白色、金色（金泄土）',
    items: '铜葫芦一对、六帝铜钱、铜钟、金属饰品',
    meaning: '主疾病、孕产风险、官非口舌',
  },
  3: {
    num: 3, name: '三碧禄存星', element: '木', nature: '凶',
    usageLabel: '是非位',
    roomUse: ['厕所', '厨房（火克木，化解口舌）'],
    career: '防口舌纷争，合同纠纷',
    health: '肝胆、神经系统、肢体受伤',
    remedy: '红色物品化解（火克木）',
    colors: '红色、紫色（火泄木）',
    items: '红色中国结、九紫灯、红色地毯、紫水晶',
    meaning: '主口舌是非、争吵、官司',
  },
  4: {
    num: 4, name: '四绿文昌星', element: '木', nature: '吉',
    usageLabel: '文昌位',
    roomUse: ['书房', '儿童房', '办公室'],
    career: '利文职、学术、写作、教育',
    health: '注意肝胆，整体较平稳',
    colors: '绿色、青色',
    items: '文昌塔、毛笔架、绿色植物、书柜',
    meaning: '主文学、考试、桃花、聪明才智',
  },
  5: {
    num: 5, name: '五黄廉贞星', element: '土', nature: '大凶',
    usageLabel: '五黄凶位',
    roomUse: ['避免一切活动，尤其忌动土'],
    career: '此方位开工动土必出大事',
    health: '五脏皆有风险，尤其重病',
    remedy: '六帝钱、铜风铃、葫芦化煞（最重要）',
    colors: '白色、金色（金泄土，切勿用黄色红色）',
    items: '六帝铜钱挂门、铜风铃、铜葫芦、金属钟',
    meaning: '主灾祸、疾病、死亡、破财，最凶之星',
  },
  6: {
    num: 6, name: '六白武曲星', element: '金', nature: '吉',
    usageLabel: '武贵位',
    roomUse: ['主卧（当家者）', '书房', '客厅主位'],
    career: '利军警、管理、投资、武职',
    health: '头部、肺部注意',
    colors: '白色、金色、黄色',
    items: '金属摆件、铜马、水晶球、白色水晶',
    meaning: '主武职、权力、偏财、贵人',
  },
  7: {
    num: 7, name: '七赤破军星', element: '金', nature: '凶',
    usageLabel: '破败位',
    roomUse: ['厕所', '储物室'],
    career: '防被骗、合同纠纷、口舌',
    health: '肺部、皮肤、手术',
    remedy: '蓝色水晶球、水种植物化解',
    colors: '黑色、蓝色（水泄金）',
    items: '蓝色水晶球、水种富贵竹、黑色曜石',
    meaning: '主口舌、血光、盗贼、破财',
  },
  8: {
    num: 8, name: '八白左辅星', element: '土', nature: '大吉',
    usageLabel: '财位',
    roomUse: ['主卧', '客厅', '财位（放招财物品）'],
    career: '最利置业、投资、经营',
    health: '脾胃平稳，整体健康',
    colors: '黄色、棕色、红色',
    items: '黄水晶球、貔貅、金蟾、聚宝盆、红色地毯',
    meaning: '主财帛、房产、旺丁旺财',
  },
  9: {
    num: 9, name: '九紫右弼星', element: '火', nature: '吉',
    usageLabel: '喜庆位',
    roomUse: ['客厅', '主卧（夫妻）'],
    career: '利名声、喜庆、升迁、婚事',
    health: '心脑血管、眼睛注意',
    colors: '红色、紫色、绿色',
    items: '九紫灯、红色鲜花、紫水晶、红色中国结',
    meaning: '主喜庆、婚姻、名声、贵人',
  },
};

/**
 * 三元九运表（提炼自 fengshui.skill references/feixing.md）
 */
export interface YuanYun {
  num: number;
  name: string;
  startYear: number;
  endYear: number;
  centerStar: number;
  /** 当令旺星 */
  wangStar: number;
  /** 生气星（将来旺） */
  shengStar: number;
  /** 退气星（刚退） */
  tuiStar: number;
}

export const YUAN_YUN: YuanYun[] = [
  { num: 1, name: '一运', startYear: 1864, endYear: 1883, centerStar: 1, wangStar: 1, shengStar: 2, tuiStar: 9 },
  { num: 2, name: '二运', startYear: 1884, endYear: 1903, centerStar: 2, wangStar: 2, shengStar: 3, tuiStar: 1 },
  { num: 3, name: '三运', startYear: 1904, endYear: 1923, centerStar: 3, wangStar: 3, shengStar: 4, tuiStar: 2 },
  { num: 4, name: '四运', startYear: 1924, endYear: 1943, centerStar: 4, wangStar: 4, shengStar: 5, tuiStar: 3 },
  { num: 5, name: '五运', startYear: 1944, endYear: 1963, centerStar: 5, wangStar: 5, shengStar: 6, tuiStar: 4 },
  { num: 6, name: '六运', startYear: 1964, endYear: 1983, centerStar: 6, wangStar: 6, shengStar: 7, tuiStar: 5 },
  { num: 7, name: '七运', startYear: 1984, endYear: 2003, centerStar: 7, wangStar: 7, shengStar: 8, tuiStar: 6 },
  { num: 8, name: '八运', startYear: 2004, endYear: 2023, centerStar: 8, wangStar: 8, shengStar: 9, tuiStar: 7 },
  { num: 9, name: '九运', startYear: 2024, endYear: 2043, centerStar: 9, wangStar: 9, shengStar: 1, tuiStar: 8 },
];

/** 取指定年份的元运 */
export function getYuanYun(year: number): YuanYun {
  return YUAN_YUN.find((y) => year >= y.startYear && year <= y.endYear) ?? YUAN_YUN[8];
}

/** 九星旺衰状态（按元运变化） */
export interface StarStatus {
  star: number;
  status: '当令旺' | '生气' | '退气' | '失令' | '凶星';
  description: string;
}

/** 取指定元运的九星旺衰状态 */
export function getStarStatuses(yuanYun: YuanYun): StarStatus[] {
  return [
    { star: yuanYun.wangStar, status: '当令旺', description: '当运最旺之星，主大吉' },
    { star: yuanYun.shengStar, status: '生气', description: '将来旺星，有发展潜力' },
    { star: yuanYun.tuiStar, status: '退气', description: '刚退之气，余气尚存' },
    { star: 5, status: '凶星', description: '五黄大凶，主灾病' },
    { star: 2, status: '凶星', description: '二黑病符，主疾病' },
  ];
}

/**
 * 命卦吉方表（八星 → 方位）。
 * 数据直接由项目权威 EIGHT_MANSIONS_DATA（visual/js/fengshui.js，乾卦已修正）
 * 反推生成，确保与八宅模块一致。此前转录自 suangua MING_GUA_LUCKY 的版本
 * 存在系统性方位错位（坎/坤/兑/艮/乾等多卦四凶位错位），已据此校正。
 */
export interface MingGuaDirections {
  shengqi: string;   // 生气位（最旺财丁）
  tianyi: string;    // 天医位（利健康）
  niannian: string;  // 延年位（利婚姻）
  fuwei: string;     // 伏位（稳定守成）
  jueming: string;   // 绝命位（最凶）
  wugui: string;     // 五鬼位（官非灾祸）
  liusha: string;    // 六煞位（破财损丁）
  huohai: string;    // 祸害位（口舌疾病）
}

export const MING_GUA_DIRECTIONS: Record<number, MingGuaDirections> = {
  1: { shengqi: '东南', tianyi: '东', niannian: '南', fuwei: '北', jueming: '西南', wugui: '东北', liusha: '西北', huohai: '西' },
  2: { shengqi: '东北', tianyi: '西', niannian: '西北', fuwei: '西南', jueming: '北', wugui: '东南', liusha: '南', huohai: '东' },
  3: { shengqi: '南', tianyi: '北', niannian: '东南', fuwei: '东', jueming: '西', wugui: '西北', liusha: '东北', huohai: '西南' },
  4: { shengqi: '北', tianyi: '南', niannian: '东', fuwei: '东南', jueming: '西北', wugui: '西', liusha: '西南', huohai: '东北' },
  6: { shengqi: '西', tianyi: '东北', niannian: '西南', fuwei: '西北', jueming: '南', wugui: '东', liusha: '北', huohai: '东南' },
  7: { shengqi: '西北', tianyi: '西南', niannian: '东北', fuwei: '西', jueming: '东南', wugui: '东', liusha: '南', huohai: '北' },
  8: { shengqi: '西南', tianyi: '西北', niannian: '西', fuwei: '东北', jueming: '南', wugui: '北', liusha: '东', huohai: '东南' },
  9: { shengqi: '东', tianyi: '东南', niannian: '北', fuwei: '南', jueming: '东北', wugui: '西南', liusha: '西北', huohai: '西' },
};

/** 方位 → 九宫宫位映射（洛书） */
const DIR_TO_PALACE: Record<string, string> = {
  '北': '坎', '西南': '坤', '东': '震', '东南': '巽',
  '中': '中', '西北': '乾', '西': '兑', '东北': '艮', '南': '离',
};

/** 宫位 → 方位映射（反向） */
const PALACE_TO_DIR: Record<string, string> = Object.fromEntries(
  Object.entries(DIR_TO_PALACE).map(([k, v]) => [v, k]),
);

export { DIR_TO_PALACE, PALACE_TO_DIR };
