/**
 * bazhaiHouse — 八宅宅卦 + 命宅相配。
 *
 * 数据与规则提炼自 Sudo-Biao/suangua（MIT）core/fengshui/calculator.py 的
 * get_house_gua / check_compatibility / get_sector_direction，对齐本项目
 * core.js trigramDirection 卦—方位映射。
 *
 * 约定：宅卦按房屋「朝向方」定（朝南=离宅），与 suangua 一致。
 * 命宅相配：东四命住东四宅、西四命住西四宅为相配；否则不相配，建议
 * 重点布局个人生气位弥补。引文出自《八宅明镜》。
 */

/** 卦数 → 卦名（洛书序：1坎 2坤 3震 4巽 6乾 7兑 8艮 9离） */
const GUA_NUM_TO_NAME: Record<number, string> = {
  1: '坎', 2: '坤', 3: '震', 4: '巽',
  6: '乾', 7: '兑', 8: '艮', 9: '离',
};

/** 卦名 → 卦数 */
const GUA_NAME_TO_NUM: Record<string, number> = {
  坎: 1, 坤: 2, 震: 3, 巽: 4, 乾: 6, 兑: 7, 艮: 8, 离: 9,
};

/** 朝向方位 → 宅卦数（对齐 suangua DIRECTION_GUA） */
const DIRECTION_GUA: Record<string, number> = {
  南: 9, 北: 1, 东: 3, 西: 7,
  东南: 4, 西北: 6, 东北: 8, 西南: 2,
};

const EAST_FOUR = [1, 3, 4, 9]; // 坎离震巽
const WEST_FOUR = [2, 6, 7, 8]; // 乾坤艮兑

/** 宅卦名（含方位标注） */
const HOUSE_NAME: Record<number, string> = {
  1: '坎宅（坐北朝南）',
  2: '坤宅（坐西南朝东北）',
  3: '震宅（坐东朝西）',
  4: '巽宅（坐东南朝西北）',
  6: '乾宅（坐西北朝东南）',
  7: '兑宅（坐西朝东）',
  8: '艮宅（坐东北朝西南）',
  9: '离宅（坐南朝北）',
};

/** 卦五行（用于命宅生克细化） */
const GUA_WUXING: Record<string, string> = {
  坎: '水', 坤: '土', 震: '木', 巽: '木',
  乾: '金', 兑: '金', 艮: '土', 离: '火',
};

/**
 * 八宅大游年方位表：命卦 → { 方位: 游年星 }。
 * 与 visual/js/fengshui.js 的 EIGHT_MANSIONS_DATA 同源（已修复乾卦错位）。
 * 内嵌一份使本模块在无 window 环境下也能独立计算（A 类纯 TS）；
 * 运行时若 window.CORE.eightMansionsData 存在则优先用其覆盖（保持旧调用方零改动）。
 */
const EIGHT_MANSIONS_DATA: Record<string, Record<string, string>> = {
  坎: { 北: '伏位', 东北: '五鬼', 东: '天医', 东南: '生气', 南: '延年', 西南: '绝命', 西: '祸害', 西北: '六煞' },
  坤: { 北: '绝命', 东北: '生气', 东: '祸害', 东南: '五鬼', 南: '六煞', 西南: '伏位', 西: '天医', 西北: '延年' },
  震: { 北: '天医', 东北: '六煞', 东: '伏位', 东南: '延年', 南: '生气', 西南: '祸害', 西: '绝命', 西北: '五鬼' },
  巽: { 北: '生气', 东北: '祸害', 东: '延年', 东南: '伏位', 南: '天医', 西南: '六煞', 西: '五鬼', 西北: '绝命' },
  乾: { 北: '六煞', 东北: '天医', 东: '五鬼', 东南: '祸害', 南: '绝命', 西南: '延年', 西: '生气', 西北: '伏位' },
  兑: { 北: '祸害', 东北: '延年', 东: '五鬼', 东南: '绝命', 南: '六煞', 西南: '天医', 西: '伏位', 西北: '生气' },
  艮: { 北: '五鬼', 东北: '伏位', 东: '六煞', 东南: '祸害', 南: '绝命', 西南: '生气', 西: '延年', 西北: '天医' },
  离: { 北: '延年', 东北: '绝命', 东: '生气', 东南: '天医', 南: '伏位', 西南: '五鬼', 西: '祸害', 西北: '六煞' },
};

/** 仅供测试/外部校验：导出内嵌八宅方位表（与 fengshui.js EIGHT_MANSIONS_DATA 同源） */
export const EIGHT_MANSIONS_DATA_EXPORTED_FOR_TEST = EIGHT_MANSIONS_DATA;

/**
 * 解析八宅方位数据源。
 * - 调用方传入 mansionsData 时直接用（A 类路径，可在 Node 环境运行）。
 * - 未传时回退读 window.CORE.eightMansionsData（旧 JS 暴露），再回退内嵌常量。
 * 这样既支持纯 TS 独立计算，又保持旧调用方零改动。
 */
function resolveMansionsData(mansionsData?: Record<string, Record<string, string>> | null): Record<string, Record<string, string>> | null {
  if (mansionsData) return mansionsData;
  try {
    if (typeof window !== 'undefined') {
      const w = window as unknown as { CORE?: { eightMansionsData?: Record<string, Record<string, string>> } };
      if (w.CORE?.eightMansionsData) return w.CORE.eightMansionsData;
    }
  } catch {
    /* window 不可用时走内嵌 */
  }
  return EIGHT_MANSIONS_DATA;
}

export interface HouseGua {
  /** 朝向方位 */
  facing: string;
  /** 宅卦名 */
  trigram: string;
  /** 宅卦数 */
  num: number;
  /** 宅卦全称 */
  name: string;
  /** 东四宅 / 西四宅 */
  group: string;
}

export interface MingZhaiCompatibility {
  level: '相配' | '不相配';
  /** 命卦名 */
  mingGua: string;
  /** 命卦组（东四命/西四命） */
  mingGroup: string;
  /** 宅卦名 */
  houseGua: string;
  /** 宅卦组（东四宅/西四宅） */
  houseGroup: string;
  /** 命卦五行 */
  mingWuxing: string;
  /** 宅卦五行 */
  houseWuxing: string;
  /** 命宅五行生克关系（比和/相生/相克） */
  wuxingRelation: string;
  /** 详判含《八宅明镜》引文 */
  detail: string;
  /** 不相配时的弥补建议方位（个人生气位方向），相配时为空 */
  remedyDirection: string;
}

/** 命卦推算结果 */
export interface MingGua {
  trigram: string;
  group: string; // 东四命 / 西四命
  num?: number; // 卦数（1坎2坤3震4巽6乾7兑8艮9离）
}

/**
 * 命卦推算（纯 TS，从 core.js calcMingGua 移植）。
 * 1900-1999 用传统男减女加公式；2000 年起世纪调整版（男 9-y、女 y+6）。
 * 5 男寄坤2、女寄艮8。rem==0→9。
 * @param year 公历年
 * @param gender 男 / 女
 */
export function calcMingGua(year: number, gender?: string): MingGua {
  const y2 = year % 100;
  let rem: number;
  if (year >= 2000) {
    rem = gender === '男' ? (9 - y2) % 9 : (y2 + 6) % 9;
  } else {
    rem = gender === '男' ? (100 - y2) % 9 : (y2 - 4) % 9;
  }
  rem = ((rem % 9) + 9) % 9; // 归一化防负数
  if (rem === 0) rem = 9;
  if (rem === 5) rem = gender === '男' ? 2 : 8;
  const map: Record<number, MingGua> = {
    1: { trigram: '坎', group: '东四命', num: 1 },
    2: { trigram: '坤', group: '西四命', num: 2 },
    3: { trigram: '震', group: '东四命', num: 3 },
    4: { trigram: '巽', group: '东四命', num: 4 },
    6: { trigram: '乾', group: '西四命', num: 6 },
    7: { trigram: '兑', group: '西四命', num: 7 },
    8: { trigram: '艮', group: '西四命', num: 8 },
    9: { trigram: '离', group: '东四命', num: 9 },
  };
  return map[rem] ?? { trigram: '?', group: '?' };
}

/** 按朝向方位定宅卦。 */
export function getHouseGua(facing: string): HouseGua | null {
  const num = DIRECTION_GUA[facing];
  if (!num) return null;
  const trigram = GUA_NUM_TO_NAME[num];
  const group = EAST_FOUR.includes(num) ? '东四宅' : '西四宅';
  return { facing, trigram, num, name: HOUSE_NAME[num], group };
}

/** 命宅相配判断（含五行生克与引文）。 */
export function checkMingZhaiCompatibility(
  mingGua: string,
  houseGua: HouseGua,
  mansionsData?: Record<string, Record<string, string>> | null,
): MingZhaiCompatibility | null {
  const mingNum = GUA_NAME_TO_NUM[mingGua];
  if (!mingNum) return null;
  const mingGroup = EAST_FOUR.includes(mingNum) ? '东四命' : '西四命';
  const houseGroup = houseGua.group;
  const mingWuxing = GUA_WUXING[mingGua] ?? '';
  const houseWuxing = GUA_WUXING[houseGua.trigram] ?? '';
  const wuxingRelation = relateWuxing(mingWuxing, houseWuxing);

  if (mingGroup[0] === houseGroup[0]) {
    return {
      level: '相配',
      mingGua,
      mingGroup,
      houseGua: houseGua.name,
      houseGroup,
      mingWuxing,
      houseWuxing,
      wuxingRelation,
      detail: `命卦${mingGua}（${mingWuxing}）与${houseGua.name}（${houseWuxing}）同属${mingGroup.slice(0, 1)}四宅。《八宅明镜》云：东四命住东四宅，西四命住西四宅，同类相得则吉。`,
      remedyDirection: '',
    };
  }
  // 不相配：找个人生气位方向作为弥补
  const remedy = getPersonalDirection(mingGua, '生气', mansionsData);
  return {
    level: '不相配',
    mingGua,
    mingGroup,
    houseGua: houseGua.name,
    houseGroup,
    mingWuxing,
    houseWuxing,
    wuxingRelation,
    detail: `命卦${mingGua}（${mingWuxing}）与${houseGua.name}（${houseWuxing}）不同类。《八宅明镜》云：东命住西宅，或西命住东宅，命宅相克则凶。建议重点布局个人生气位（${remedy}）弥补。`,
    remedyDirection: remedy,
  };
}

/** 五行生克关系描述。 */
function relateWuxing(a: string, b: string): string {
  if (!a || !b) return '';
  if (a === b) return '比和';
  const sheng: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const ke: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  if (sheng[a] === b) return `${a}生${b}`;
  if (sheng[b] === a) return `${b}生${a}`;
  if (ke[a] === b) return `${a}克${b}`;
  if (ke[b] === a) return `${b}克${a}`;
  return '';
}

/**
 * 取个人某游年星所在方位。
 * @param mansionsData 可选八宅方位表；未传则走 resolveMansionsData（window.CORE 或内嵌）
 */
function getPersonalDirection(mingGua: string, star: string, mansionsData?: Record<string, Record<string, string>> | null): string {
  const map = resolveMansionsData(mansionsData)?.[mingGua];
  if (!map) return '未知';
  for (const [dir, name] of Object.entries(map)) {
    if (name === star) return dir;
  }
  return '未知';
}

/** 取个人四吉方 / 四凶方速查。 */
export function getPersonalDirections(
  mingGua: string,
  mansionsData?: Record<string, Record<string, string>> | null,
): { auspicious: { star: string; direction: string }[]; inauspicious: { star: string; direction: string }[] } | null {
  const map = resolveMansionsData(mansionsData)?.[mingGua];
  if (!map) return null;
  const auspiciousStars = ['生气', '天医', '延年', '伏位'];
  const inauspiciousStars = ['绝命', '五鬼', '六煞', '祸害'];
  const pick = (stars: string[]) =>
    stars.map((star) => {
      const direction = Object.entries(map).find(([, name]) => name === star)?.[0] ?? '未知';
      return { star, direction };
    });
  return { auspicious: pick(auspiciousStars), inauspicious: pick(inauspiciousStars) };
}

/** 八方位选项（朝向下拉用）。 */
export const FACING_OPTIONS = ['南', '北', '东', '西', '东南', '西北', '东北', '西南'] as const;

/**
 * 游年星方位用途宜忌 + 古典九星详描。
 * 数据提炼自 suangua SECTOR_QUALITY + knowledge.fengshui_classical.py
 * BAYUAN_JIUXING（《八宅明镜》《阳宅三要》古典星名/主象/适宜/化解）。
 */
export interface SectorUse {
  /** 游年星名（生气/天医/...） */
  star: string;
  /** 古典九星名（贪狼木星等） */
  classicalName: string;
  /** 吉凶等级 */
  quality: string;
  /** 主象（该星主导意象） */
  meaning: string;
  /** 方位用途宜忌（宜置卧室/书房/厨房/厕所等） */
  advice: string;
  /** 凶位化解物品（吉位为空） */
  remedy?: string;
}

const SECTOR_USE: Record<string, SectorUse> = {
  生气: {
    star: '生气',
    classicalName: '贪狼木星',
    quality: '大吉',
    meaning: '升官发财，生机勃勃，子嗣繁荣',
    advice: '宜置大门、主卧、书房；作财位、旺丁位',
  },
  天医: {
    star: '天医',
    classicalName: '巨门土星',
    quality: '吉',
    meaning: '贵人相助，平安健康，家庭和睦',
    advice: '宜置主卧、厨房、客厅；作求贵人之位',
  },
  延年: {
    star: '延年',
    classicalName: '武曲金星',
    quality: '吉',
    meaning: '长寿延年，婚姻美满，事业稳定',
    advice: '宜置主卧、客厅；作夫妻感情和谐位',
  },
  伏位: {
    star: '伏位',
    classicalName: '辅弼木星',
    quality: '中性',
    meaning: '稳固守成，小有所成',
    advice: '宜置书房、储藏室、辅助空间',
  },
  祸害: {
    star: '祸害',
    classicalName: '廉贞火星',
    quality: '凶',
    meaning: '口舌是非，小病小灾，财有所损',
    advice: '宜置厕所、储物间（化凶为用），切忌主卧大门',
    remedy: '金属物品化土煞（铜铃/六帝钱），或安置厕所储物间压之',
  },
  六煞: {
    star: '六煞',
    classicalName: '文曲水星',
    quality: '次凶',
    meaning: '桃花煞，感情不顺，破财',
    advice: '宜置厕所、杂物间，不宜主卧大门',
    remedy: '绿色植物化水煞（木泄水），或置厕所杂物间压之',
  },
  五鬼: {
    star: '五鬼',
    classicalName: '廉贞火星变',
    quality: '凶',
    meaning: '口舌是非、鬼怪盗贼、火灾',
    advice: '宜置厕所、厨房（火化火），不可作主要空间',
    remedy: '陶瓷土类物品化火煞（土泄火），置厨房以火化火',
  },
  绝命: {
    star: '绝命',
    classicalName: '破军金星',
    quality: '大凶',
    meaning: '绝后无嗣、大病大凶、破财散家',
    advice: '宜置厕所（绝命归厕最化煞），切勿作大门主卧',
    remedy: '蓝色黑色物品化金煞（水泄金），绝命归厕最化煞',
  },
};

/** 取某游年星的方位用途宜忌详描。 */
export function getSectorUse(star: string): SectorUse | null {
  return SECTOR_USE[star] ?? null;
}

/**
 * 取个人命卦八方方位用途分析（按方位排列，含星名/吉凶/主象/宜忌）。
 */
export function getSectorAnalysis(
  mingGua: string,
  mansionsData?: Record<string, Record<string, string>> | null,
): { direction: string; use: SectorUse }[] | null {
  const map = resolveMansionsData(mansionsData)?.[mingGua];
  if (!map) return null;
  return Object.entries(map).map(([direction, star]) => ({
    direction,
    use: getSectorUse(star) ?? {
      star,
      classicalName: '',
      quality: '',
      meaning: '',
      advice: '',
    },
  }));
}

/**
 * 形煞化解表。
 * 数据提炼自 suangua knowledge/fengshui_classical.py 的
 * SHAQT_HUAJIE（7 形煞）+ SHAJIAO_HUAJIE（外六煞 + 内七煞），
 * 综合各典（路冲/天斩/壁刀/反弓/镰刀/烟囱/穿堂/镜煞/梁压等）。
 */
export interface ShapeSha {
  /** 煞名 */
  name: string;
  /** 形成条件 */
  form: string;
  /** 影响 */
  effect: string;
  /** 化解法 */
  remedy: string;
  /** 分类：外部形煞 / 内部形煞 */
  category: '外部形煞' | '内部形煞';
}

export const SHAPE_SHA: ShapeSha[] = [
  // ── 外部形煞 ──
  { name: '路冲煞', category: '外部形煞', form: '道路直冲大门或窗户', effect: '财气外散，意外血光多', remedy: '门前种植、屏风遮挡、泰山石敢当' },
  { name: '天斩煞', category: '外部形煞', form: '两栋高楼之间的刀形缝隙正对住宅', effect: '血光手术之灾', remedy: '风铃、葫芦挡煞，或移门避之' },
  { name: '壁刀煞', category: '外部形煞', form: '对面建筑墙角直冲住宅', effect: '破财、小人是非', remedy: '八卦镜反射、门帘化解' },
  { name: '反弓煞', category: '外部形煞', form: '弯曲道路凸面对向住宅', effect: '财气背离，退财', remedy: '避免住在弯道外侧，或植树遮挡' },
  { name: '镰刀煞', category: '外部形煞', form: '高架桥弧形切割到住宅', effect: '意外血光，运势被切', remedy: '墙面放凸面镜反射' },
  { name: '烟囱煞', category: '外部形煞', form: '附近烟囱正对住宅', effect: '健康受损，火气过旺', remedy: '植树遮挡，或迁居' },
  // ── 内部形煞 ──
  { name: '穿堂煞', category: '内部形煞', form: '大门与后门或窗户在一条直线', effect: '财气直穿而过，守财难', remedy: '屏风遮挡，改变布局阻断直线' },
  { name: '镜煞', category: '内部形煞', form: '大型镜面正对大门或床', effect: '财气反射，睡眠不宁', remedy: '移除或遮挡镜面' },
  { name: '梁压煞', category: '内部形煞', form: '横梁压床头或压沙发', effect: '头痛、压力、运势受阻', remedy: '吊顶包梁，或移床位沙发避之' },
  { name: '开门见灶', category: '内部形煞', form: '进门直见厨房炉灶', effect: '破财，财气被火烧', remedy: '屏风或门帘遮挡视线' },
  { name: '开门见厕', category: '内部形煞', form: '进门直见厕所', effect: '疾病污秽入门', remedy: '屏风遮挡，常闭厕门' },
  { name: '房门对冲', category: '内部形煞', form: '两个卧室门正对', effect: '口舌是非，家人不和', remedy: '门帘遮挡，或常闭一门' },
];

// ─── 八宅 + 飞星合参 ───────────────────────────────────

import { MING_GUA_DIRECTIONS, PALACE_TO_DIR } from './flyingStarRemedies';

/** 卦名 → 卦数 */
const GUA_NAME_TO_NUM_COMPAT: Record<string, number> = {
  坎: 1, 坤: 2, 震: 3, 巽: 4, 乾: 6, 兑: 7, 艮: 8, 离: 9,
};

/** 飞星网格单元（与 canvasRenderers getFeixingGrid 返回一致） */
interface FeixingCell {
  palace: string;
  starNum: number;
  starName: string;
  wuxing: string;
  luck: string;
}
type FeixingGrid = FeixingCell[][];

export interface BazhaiFeixingCombo {
  /** 个人生气位（八宅最旺财方） */
  shengqiDirection: string;
  /** 年飞星财位（八白所在方位） */
  caiweiDirection: string;
  /** 个人生气位与年飞星财位是否重合 */
  doubleWealth: boolean;
  /** 重合方位（双重旺财），不重合为空 */
  doubleWealthDirection: string;
  /** 五黄凶位所在方位 */
  wuhuangDirection: string;
  /** 二黑病符所在方位 */
  erheiDirection: string;
  /** 合参建议条目 */
  suggestions: { label: string; value: string; tone: '吉' | '凶' | '中' }[];
}

/**
 * 八宅（个人命卦静态方位吉凶）与流年飞星（年动态方位吉凶）合参。
 * - 个人生气位与年飞星八白财位重合 → 「双重旺财方位」特别提示。
 * - 标注当年五黄煞、二黑病符方位与化煞建议。
 * @param mingGua 命卦名（坎/坤/...）
 * @param feixingGrid 年飞星 3×3 网格（来自 getFeixingGrid）
 */
export function combineBazhaiFeixing(
  mingGua: string,
  feixingGrid: FeixingGrid | null,
): BazhaiFeixingCombo | null {
  const guaNum = GUA_NAME_TO_NUM_COMPAT[mingGua];
  if (!guaNum) return null;
  const dirs = MING_GUA_DIRECTIONS[guaNum];
  if (!dirs) return null;

  const shengqiDirection = dirs.shengqi;

  // 从飞星网格找八白(8)/五黄(5)/二黑(2)所在宫位 → 方位
  let caiweiDirection = '未知';
  let wuhuangDirection = '未知';
  let erheiDirection = '未知';
  if (feixingGrid) {
    for (const row of feixingGrid) {
      for (const cell of row) {
        if (cell.starNum === 8) caiweiDirection = PALACE_TO_DIR[cell.palace] ?? '未知';
        if (cell.starNum === 5) wuhuangDirection = PALACE_TO_DIR[cell.palace] ?? '未知';
        if (cell.starNum === 2) erheiDirection = PALACE_TO_DIR[cell.palace] ?? '未知';
      }
    }
  }

  const doubleWealth = shengqiDirection === caiweiDirection && shengqiDirection !== '未知';
  const doubleWealthDirection = doubleWealth ? shengqiDirection : '';

  const suggestions: BazhaiFeixingCombo['suggestions'] = [];
  if (doubleWealth) {
    suggestions.push({
      label: '双重旺财方位',
      value: `个人生气位与流年八白财位同在${doubleWealthDirection}方，本年此方财气最旺，宜作主卧、财位，置招财物品。`,
      tone: '吉',
    });
  } else {
    suggestions.push({
      label: '个人财位',
      value: `个人生气位在${shengqiDirection}方（八宅旺财丁），流年八白财位在${caiweiDirection}方。两方皆宜催财，可分别布局。`,
      tone: '吉',
    });
  }
  if (wuhuangDirection !== '未知') {
    suggestions.push({
      label: '五黄煞方位',
      value: `本年五黄大煞在${wuhuangDirection}方，忌动土修造，宜置厕所储物压之，用六帝钱、铜风铃、葫芦化煞。`,
      tone: '凶',
    });
  }
  if (erheiDirection !== '未知') {
    suggestions.push({
      label: '二黑病符方位',
      value: `本年二黑病符在${erheiDirection}方，主疾病，宜置厕所，用铜葫芦、六帝钱化煞，忌作主卧厨房。`,
      tone: '凶',
    });
  }

  return {
    shengqiDirection,
    caiweiDirection,
    doubleWealth,
    doubleWealthDirection,
    wuhuangDirection,
    erheiDirection,
    suggestions,
  };
}
