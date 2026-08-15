/**
 * taiyiEngine — 太乙神数纯 TS 引擎
 *
 * 参考 kentang2017/kintaiyi (MIT License, v0.2.4) 算法逻辑，按本项目纯 TS 引擎模式重写。
 * kintaiyi 作者：kentang。许可证：MIT。仅借鉴算法逻辑，未复制其代码文本。
 *
 * 太乙神数：传统三式之首，擅推天文异象、国运人事、事件吉凶与应期。
 * 核心算法全部是干支推算 + 查表 + 模运算，无天文计算。
 * 节气/干支/农历由 lunar-javascript Solar 提供（参数化，传入走精确，未传走近似）。
 *
 * 输入：birth（年月日时）+ jiStyle（年/月/日/时计）+ acumYearMethod（统宗/金镜/淘金歌/太乙局）+ Solar（可选）
 */

import type { ToolEnvelope, ExportSnapshot, Tone } from './baseTypes';

// ─── 基础常量 ───

const TIAN_GAN = '甲乙丙丁戊己庚辛壬癸';
const DI_ZHI = '子丑寅卯辰巳午未申酉戌亥';
const DI_ZHI_ARR = DI_ZHI.split('');
const DI_ZHI_REVERSED = [...DI_ZHI_ARR].reverse();

/** 60 甲子 */
const JIAZI: string[] = Array.from({ length: 60 }, (_, i) => TIAN_GAN[i % 10] + DI_ZHI[i % 12]);

// ─── 太乙核心数据表（从 kintaiyi config.py 内联，MIT）───

/** 72 局太乙落宫（72 单字符，每3局一个宫名：1-3乾/4-6午/7-9艮...） */
const TAIYI_PAI = '乾乾乾午午午艮艮艮卯卯卯酉酉酉坤坤坤子子子巽巽巽乾乾乾午午午艮艮艮卯卯卯酉酉酉坤坤坤子子子巽巽巽乾乾乾午午午艮艮艮卯卯卯酉酉酉坤坤坤子子子巽巽巽';
/** 72 局始击（72 单字符序列） */
const SF_LIST = '坤戌亥丑寅辰巳坤酉乾丑寅辰午坤酉亥子艮辰巳未申戌亥艮卯巽未丑戌子艮卯巳午坤戌亥丑寅辰巳坤酉乾丑寅辰午坤酉亥子艮辰巳未申戌亥艮卯巽未丑戌子艮卯巳午';
/** 四神（36 字符，cycle 到 72：每3字符一组×12宫×2轮） */
const FOUR_GOD = '乾乾乾午午午艮艮艮卯卯卯中中中酉酉酉坤坤坤子子子巽巽巽巳巳巳申申申寅寅寅';
/** 天乙（36 字符，cycle 到 72） */
const SKY_YI = '酉酉酉坤坤坤子子子巽巽巽巳巳巳申申申寅寅寅乾乾乾午午午艮艮艮卯卯卯中中中';
/** 地乙（36 字符，cycle 到 72） */
const EARTH_YI = '巽巽巽巳巳巳申申申寅寅寅乾乾乾午午午艮艮艮卯卯卯中中中酉酉酉坤坤坤子子子';
/** 直符（36 字符，cycle 到 72） */
const ZHI_FU = '中中中酉酉酉坤坤坤子子子巽巽巽巳巳巳申申申寅寅寅乾乾乾午午午艮艮艮卯卯卯';
/** 72 局文昌（阳遁/阴遁各72） */
const SKYEYES_DICT: Record<string, string[]> = {
  '阳': '申酉戌乾乾亥子丑艮寅卯辰巽巳午未坤坤申酉戌乾乾亥子丑艮寅卯辰巽巳午未坤坤申酉戌乾乾亥子丑艮寅卯辰巽巳午未坤坤申酉戌乾乾亥子丑艮寅卯辰巽巳午未坤坤'.split(''),
  '阴': '寅卯辰巽巽巳午未坤申酉戌乾亥子丑艮艮寅卯辰巽巽巳午未坤申酉戌乾亥子丑艮艮寅卯辰巽巽巳午未坤申酉戌乾亥子丑艮艮寅卯辰巽巽巳午未坤申酉戌乾亥子丑艮艮'.split(''),
};
/** 文昌处境（72局，阳遁） */
const SKYEYES_SUMMARY: Record<string, string[]> = {
  '阳': ',始击击,,内迫,,,辰迫,,囚,,囚,,,,,,囚,囚,客挟,,,,,,,,囚,囚,始击击,,,始击击,始击掩,始击掩,,,,囚,辰迫,,客挟,客挟,囚,客挟,宫迫,,主挟，宫迫,辰迫,,,,主挟，辰迫,宫迫,宫迫,始击掩,,,,客挟,,,,,,主挟,辰击,,始击掩,始击击,始击击,囚,始击击'.split(','),
};

/** 16 宫序列 */
const SIXTEEN = '子丑艮寅卯辰巽巳午未坤申酉戌乾亥';
const SIXTEEN_ARR = SIXTEEN.split('');
/** 宫→序号 */
const GONG_NUM: Record<string, number> = Object.fromEntries(SIXTEEN_ARR.map((g, i) => [g, i + 1]));
/** 序号→宫 */
const GONG1 = SIXTEEN_ARR;
/** 辰→宫数（gong2） */
const GONG2: Record<string, number> = Object.fromEntries(
  '亥子丑艮寅卯辰巽巳午未坤申酉戌乾'.split('').map((g, i) => [g, [8, 8, 3, 3, 4, 4, 9, 9, 2, 2, 7, 7, 6, 6, 1, 1][i]]),
);
/** 八宫序（太乙顺行） */
const NUM = [8, 3, 4, 9, 2, 7, 6, 1];
/** 九宫序→宫名 */
const NUM2GONG: Record<number, string> = Object.fromEntries(
  [1, 2, 3, 4, 6, 7, 8, 9].map((n, i) => [n, '乾午艮卯中酉坤子巽'.split('')[i]]),
);
/** 间辰（jc） */
const JC = '丑寅辰巳未申戌亥'.split('');
/** jc1 */
const JC1 = '巽艮坤乾'.split('');
/** 太乙间辰（tyjc） */
const TYJC = [1, 3, 7, 9];
/** 八门 */
const DOOR = '开休生伤杜景死惊'.split('');
/** 九星（金函玉镜 golden_d） */
const GOLDEN_D = '太乙摄提轩辕招摇天符青龙咸池太阴天乙'.match(/../g) as string[];
/** 28 宿 */
const SU = '角亢氐房心尾箕斗牛女虚危室壁奎娄胃昴毕觜参井鬼柳星张翼轸'.match(/../g) as string[];
/** 宿→宫 */
const SU_GONG: Record<string, string> = Object.fromEntries(
  '子丑艮寅卯辰巽巳午未坤申酉戌乾亥'.split('').map((g, i) => [g, '虚斗牛尾房亢角翼星鬼井参昴娄奎室'.split('')[i]]),
);

/** 算数→描述用（l_num，16 宫对应算数） */
const L_NUM = [8, 8, 3, 3, 4, 4, 9, 9, 2, 2, 7, 7, 6, 6, 1, 1];

/** 主客算查表（find_cal，72 局 × [主算,客算,定算]） */
const FIND_CAL_YANG: number[][] = [[7,13,13],[6,1,1],[1,40,32],[25,17,10],[25,14,1],[25,10,12],[8,25,9],[1,22,3],[3,15,33],[1,12,25],[4,4,13],[37,1,4],[18,19,19],[10,9,9],[9,7,6],[1,33,26],[7,27,16],[7,26,11],[8,32,14],[7,26,2],[2,17,33],[16,30,1],[16,23,32],[16,17,23],[39,40,40],[32,31,31],[31,28,31],[14,9,38],[13,39,26],[10,32,17],[33,10,34],[25,8,24],[24,3,15],[26,4,11],[25,28,1],[25,27,36],[1,7,7],[6,35,35],[35,34,26],[27,19,12],[27,16,3],[27,12,34],[8,17,1],[23,14,32],[32,7,25],[5,16,29],[4,8,17],[1,5,8],[24,25,25],[16,15,15],[15,13,6],[39,31,24],[38,25,14],[38,24,9],[16,3,22],[15,34,10],[10,25,10],[12,26,27],[12,19,28],[12,13,19],[33,34,34],[26,25,25],[25,22,18],[16,11,7],[15,1,28],[12,34,19],[25,2,26],[17,8,16],[16,32,7],[30,4,15],[29,32,5],[29,31,9]];
const FIND_CAL_YING: number[][] = [[5,29,7],[4,17,1],[1,16,30],[25,33,2],[25,30,1],[17,26,10],[2,3,3],[1,7,7],[7,33,27],[1,24,25],[6,26,19],[35,23,8],[12,37,12],[12,27,11],[11,25,4],[1,15,24],[3,9,16],[3,8,9],[14,16,16],[13,10,10],[10,1,39],[24,14,1],[24,7,40],[16,1,29],[31,16,32],[30,7,29],[29,4,26],[8,25,32],[7,15,26],[2,8,15],[27,28,28],[27,26,26],[26,18,15],[29,22,9],[25,10,1],[25,9,34],[1,25,3],[4,13,37],[37,12,26],[33,1,10],[33,38,9],[25,34,38],[2,1,1],[39,38,38],[38,31,25],[7,1,31],[6,32,25],[1,29,14],[16,1,17],[16,31,15],[15,29,4],[33,7,16],[32,1,8],[32,8,1],[16,18,18],[15,12,12],[12,3,1],[18,8,35],[18,1,34],[10,35,25],[27,22,28],[26,3,25],[25,4,12],[16,33,3],[15,23,34],[10,16,23],[25,26,26],[25,24,24],[24,16,13],[32,28,15],[31,16,7],[31,15,1]];

/** 积年常数（统宗/金镜/淘金歌/太乙局） */
const TN_DICT: Record<number, number> = { 0: 10153917, 1: 1936557, 2: 10154193, 3: 10153917 };

/** 节气名序列 */
const JIEQI_NAME = '小寒大寒立春雨水惊蛰春分清明谷雨立夏小满芒种夏至小暑大暑立秋处暑白露秋分寒露霜降立冬小雪大雪冬至'.match(/../g) as string[];

/** 五行关系（用于主客相关） */
const WUXING_RELATION_2: Record<string, string> = Object.fromEntries(
  '火水金火木金水土土木,水火火金金木土水木土,火火金金木木土土水水,火木水金木水土火金土,木火金水水木火土土金'.split(',').map((s, i) => [s, '克我,我克,比和,生我,我生'.split(',')[i]]),
);

/** 干支五行 */
function ganzhiWuxing(gz: string): string {
  const map: Record<string, string> = Object.fromEntries(
    '甲寅乙卯震巽,丙巳丁午离,壬亥癸子坎,庚申辛酉乾兑,未丑戊己未辰戌艮坤'.split(',').map((s, i) => [s, '木火水金土'.split('')[i]]),
  );
  for (const keys of Object.keys(map)) {
    if (keys.includes(gz)) return map[keys];
  }
  return '';
}

// ─── 工具函数 ───

/** new_list：把 olist 从 o 位置轮转 */
function newList<T>(olist: T[], o: T): T[] {
  const a = olist.indexOf(o);
  if (a < 0) return olist;
  return [...olist.slice(a), ...olist.slice(0, a)];
}

/** multi_key_dict_get：key 是 tuple，查 k 在哪个 tuple 里 */
function multiKeyDictGet<T>(d: Record<string, T>, k: string): T | undefined {
  for (const keys of Object.keys(d)) {
    if (keys.includes(k)) return d[keys];
  }
  return undefined;
}

/** divide：反复除尽 */
function divideNum(num: number, d: number): number {
  let n = num;
  while (n % d === 0) n = Math.floor(n / d);
  return n;
}

/** 数转中文（简化版，1-72 够用） */
function an2cn(n: number): string {
  const units = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n <= 10) return ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][n] ?? String(n);
  if (n < 20) return '十' + units[n % 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    return units[t] + '十' + (u ? units[u] : '');
  }
  return String(n);
}

/** 算数描述（cal_des） */
function calDes(num: number): string[] {
  const numdict: Record<number, string> = { 1: '杂阴', 2: '纯阴', 3: '纯阳', 4: '杂阳', 6: '纯阴', 7: '杂阴' };
  const t: string[] = [];
  if (num > 10 && num % 10 > 5) t.push('三才足数');
  if (num < 10) t.push('无天，二曜虚蚀、五纬失度、慧孛飞流、霜雹为害');
  if (num % 10 < 5) t.push('无地，有崩地震、川竭蝗蝻之象');
  if (num % 10 === 0) t.push('无人，口舌妖言更相残贼，疾疫、迁移、流亡');
  const nd = numdict[num];
  if (nd) t.push(nd);
  return t;
}

// ─── Solar 参数化（同六壬/二十八宿模式）───

interface SolarLike {
  fromYmd?(y: number, mo: number, d: number): unknown;
}

interface BirthInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  gender?: string;
}

/** 从 window 取 Solar 入口 */
function getSolarEntry(): SolarLike | null {
  if (typeof window !== 'undefined') {
    const w = window as unknown as { Solar?: SolarLike };
    return w.Solar ?? null;
  }
  return null;
}

/** 干支结果：[年柱, 月柱, 日柱, 时柱]（每个是2字符） */
interface GanZhiResult {
  yearGz: string;
  monthGz: string;
  dayGz: string;
  hourGz: string;
  mode: 'local-exact' | 'local-approx';
}

/** 取四柱干支。solar 传入走精确（lunar-javascript），否则走近似（公历直接推干支） */
function getGanZhi(birth: BirthInput, solar: SolarLike | null): GanZhiResult {
  if (solar?.fromYmd) {
    try {
      const s = solar.fromYmd(birth.year, birth.month, birth.day) as {
        getYearGZ: () => { tg: number; dz: number };
        getMonthGZ: () => { tg: number; dz: number };
        getDayGZ: () => { tg: number; dz: number };
        getHourGZ: (h: number) => { tg: number; dz: number };
      };
      const yGz = s.getYearGZ();
      const mGz = s.getMonthGZ();
      const dGz = s.getDayGZ();
      const hGz = s.getHourGZ(birth.hour);
      return {
        yearGz: TIAN_GAN[yGz.tg] + DI_ZHI[yGz.dz],
        monthGz: TIAN_GAN[mGz.tg] + DI_ZHI[mGz.dz],
        dayGz: TIAN_GAN[dGz.tg] + DI_ZHI[dGz.dz],
        hourGz: TIAN_GAN[hGz.tg] + DI_ZHI[hGz.dz],
        mode: 'local-exact',
      };
    } catch {
      // 回退到近似
    }
  }
  // 近似：用公历直接推干支（不依赖 lunar-javascript）
  return { ...approxGanZhi(birth), mode: 'local-approx' };
}

/** 近似干支推算（公历） */
function approxGanZhi(birth: BirthInput): Omit<GanZhiResult, 'mode'> {
  // 以 1900-01-31（甲辰日）为基准，但用通用算法
  // 年柱：以立春为界，近似用公历年份（2月4日前算上一年）
  let y = birth.year;
  if (birth.month === 1 || (birth.month === 2 && birth.day < 4)) y -= 1;
  const yearGz = TIAN_GAN[((y - 4) % 10 + 10) % 10] + DI_ZHI[((y - 4) % 12 + 12) % 12];
  // 月柱：以节气为界，近似用公历月份
  const monthBranch = [11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // 寅月起
  const mb = monthBranch[birth.month - 1];
  const yearGanIdx = ((y - 4) % 10 + 10) % 10;
  const monthGanIdx = (yearGanIdx * 2 + Math.floor((birth.month + 1) / 2)) % 10;
  const monthGz = TIAN_GAN[monthGanIdx] + DI_ZHI[mb];
  // 日柱：以 2000-01-07（甲子日）为基准
  const base = Date.UTC(2000, 0, 7) / 86400000;
  const cur = Date.UTC(birth.year, birth.month - 1, birth.day) / 86400000;
  const dayIdx = Math.floor(cur - base) % 60;
  const dayGz = JIAZI[(dayIdx % 60 + 60) % 60];
  // 时柱
  const hourBranch = Math.floor((birth.hour + 1) / 2) % 12;
  const dayGanIdx = JIAZI.indexOf(dayGz) % 10;
  const hourGanIdx = (dayGanIdx * 2 + hourBranch) % 10;
  const hourGz = TIAN_GAN[hourGanIdx] + DI_ZHI[hourBranch];
  return { yearGz, monthGz, dayGz, hourGz };
}

/** 取农历年（用于积年数）。solar 传入走精确。 */
function getLunarYear(birth: BirthInput, solar: SolarLike | null): number {
  if (solar?.fromYmd) {
    try {
      const s = solar.fromYmd(birth.year, birth.month, birth.day) as { getLunar: () => { getYear: () => number } };
      return s.getLunar().getYear();
    } catch {
      // 回退
    }
  }
  // 近似：公历年，2月前算上一年（粗糙）
  let y = birth.year;
  if (birth.month === 1 || (birth.month === 2 && birth.day < 4)) y -= 1;
  return y;
}

/** 取节气（用于阴阳遁判断） */
function getJieqi(birth: BirthInput, solar: SolarLike | null): string {
  if (solar?.fromYmd) {
    try {
      const s = solar.fromYmd(birth.year, birth.month, birth.day) as {
        getJieQiTable: () => Record<string, unknown>;
      };
      const table = s.getJieQiTable();
      // 找当前日期前最近的节气
      const jieqiList = JIEQI_NAME;
      let nearest = '冬至';
      let nearestDiff = Infinity;
      for (const jq of jieqiList) {
        const v = table[jq];
        if (v == null) continue;
        const d = new Date(String(v).replace(/-/g, '/'));
        const cur = new Date(birth.year, birth.month - 1, birth.day);
        const diff = (cur.getTime() - d.getTime()) / 86400000;
        if (diff >= 0 && diff < nearestDiff) {
          nearestDiff = diff;
          nearest = jq;
        }
      }
      return nearest;
    } catch {
      // 回退
    }
  }
  // 近似：按公历月份估节气
  const monthJq = ['小寒', '立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪'];
  return monthJq[birth.month - 1] ?? '冬至';
}

// ─── 太乙计式与积年法类型 ───

export type JiStyle = 0 | 1 | 2 | 3 | 4; // 年计/月计/日计/時計/分计
export type AcumYearMethod = 0 | 1 | 2 | 3; // 统宗/金镜/淘金歌/太乙局

export const JI_STYLE_NAMES: Record<JiStyle, string> = { 0: '年计', 1: '月计', 2: '日计', 3: '時計', 4: '分计' };
export const ACUM_YEAR_NAMES: Record<AcumYearMethod, string> = { 0: '太乙统宗', 1: '太乙金镜', 2: '太乙淘金歌', 3: '太乙局' };

// ─── 太乙核心算法 ───

class TaiyiCore {
  private birth: BirthInput;
  private solar: SolarLike | null;
  private gz: GanZhiResult;
  private lunarYear: number;
  private cache: Record<string, unknown> = {};

  constructor(birth: BirthInput, solar: SolarLike | null) {
    this.birth = birth;
    this.solar = solar;
    this.gz = getGanZhi(birth, solar);
    this.lunarYear = getLunarYear(birth, solar);
  }

  private dayGz(): string {
    return this.gz.dayGz;
  }

  /** 太岁 */
  taishui(jiStyle: JiStyle): string {
    const branches = [this.gz.yearGz[1], this.gz.monthGz[1], this.gz.dayGz[1], this.gz.hourGz[1], this.gz.hourGz[1]];
    return branches[jiStyle] ?? this.gz.yearGz[1];
  }

  /** 太乙积年数 */
  accnum(jiStyle: JiStyle, acumYear: AcumYearMethod): number {
    const cacheKey = `accnum_${jiStyle}_${acumYear}`;
    if (cacheKey in this.cache) return this.cache[cacheKey] as number;

    const tnC = TN_DICT[acumYear] ?? TN_DICT[0];
    const ly = this.lunarYear;
    let result: number;

    if (jiStyle === 0) {
      // 年计
      result = tnC + ly + (ly < 0 ? 1 : 0);
    } else if (jiStyle === 1) {
      // 月计
      const accyear = tnC + ly - 1 + (ly < 0 ? 2 : 0);
      const lunarMonth = this.getLunarMonth();
      result = accyear * 12 + 2 + lunarMonth;
    } else if (jiStyle === 2) {
      // 日计
      const diffVal = this.daysBetween(1900, 6, 19);
      const offset = [185, 184, 183, 182][acumYear] ?? 185;
      const configNum = 708011105 - acumYear - offset;
      let base = configNum + diffVal;
      if (acumYear === 3) {
        base = Math.round((ly - 423) * (235 / 19) * 29.5306 + this.getLunarDay());
      }
      // 修正：确保 %60 对应日干支
      if (acumYear === 0) {
        const dayGz = this.dayGz();
        const jiaziIdx = JIAZI.indexOf(dayGz) + 1;
        const currentMod = ((base % 60) + 60) % 60;
        const adjustment = ((jiaziIdx - currentMod) % 60 + 60) % 60;
        result = base + adjustment;
      } else {
        result = base;
      }
    } else if (jiStyle === 3) {
      // 時计
      const diffValTwo = this.daysBetween(1900, 12, 21);
      const configNum = 708011105 - [0, 10153917, 10153917, 0][acumYear];
      const accday = configNum + diffValTwo;
      result = ((accday - 1) * 12) + Math.floor((this.birth.hour + 1) / 2) + (acumYear !== 1 ? 1 : -11);
      if (acumYear === 3) {
        // 太乙局時計特殊
        const dgz = this.dayGz();
        const zhiNum = DI_ZHI.indexOf(this.gz.hourGz[1]) + 1;
        const dgzNum = JIAZI.indexOf(dgz) + 1;
        result = zhiNum; // 简化：太乙局時計用时支
        void dgzNum;
      }
    } else {
      // 分计
      const diffValTwo = this.daysBetween(1900, 12, 21);
      const configNum = 708011105 - [0, 10153917, 10153917, 0][acumYear];
      const accday = configNum + diffValTwo;
      const base = ((accday - 1) * 23) + (this.birth.hour * 10500) + ((this.birth.minute ?? 0) + 1);
      result = base; // 简化，不做干支修正
    }

    this.cache[cacheKey] = result;
    return result;
  }

  private getLunarMonth(): number {
    if (this.solar?.fromYmd) {
      try {
        const s = this.solar.fromYmd(this.birth.year, this.birth.month, this.birth.day) as { getLunar: () => { getMonth: () => number } };
        return s.getLunar().getMonth();
      } catch {
        // 回退
      }
    }
    return this.birth.month;
  }

  private getLunarDay(): number {
    if (this.solar?.fromYmd) {
      try {
        const s = this.solar.fromYmd(this.birth.year, this.birth.month, this.birth.day) as { getLunar: () => { getDay: () => number } };
        return s.getLunar().getDay();
      } catch {
        // 回退
      }
    }
    return this.birth.day;
  }

  /** 日期差（天数） */
  private daysBetween(refYear: number, refMonth: number, refDay: number): number {
    const cur = Date.UTC(this.birth.year, this.birth.month - 1, this.birth.day);
    const ref = Date.UTC(refYear, refMonth - 1, refDay);
    return Math.floor((cur - ref) / 86400000);
  }

  /** 太乙局数 */
  kook(jiStyle: JiStyle, acumYear: AcumYearMethod): { wen: string; num: number; nian: string; dun: string } {
    const jq = getJieqi(this.birth, this.solar);
    const dz = newList(JIEQI_NAME, '冬至').slice(0, 12);
    const hz = newList(JIEQI_NAME, '夏至').slice(0, 12);
    const jqmap: Record<string, string> = { [dz.join('')]: '冬至', [hz.join('')]: '夏至' };
    const k = this.accnum(jiStyle, acumYear) % 72 || 72;
    const threeYearMap: Record<number, string> = Object.fromEntries(
      Array.from({ length: 72 }, (_, i) => [i + 1, ['理天', '理地', '理人'][i % 3]]),
    );
    const nian = threeYearMap[k] ?? '理天';
    let dun: string;
    if (jiStyle === 0 || jiStyle === 1 || jiStyle === 2) {
      dun = '阳遁';
    } else {
      dun = multiKeyDictGet(jqmap, jq) === '夏至' ? '阴遁' : '阳遁';
    }
    if (jiStyle === 4) {
      const gz = this.gz;
      const isYangGan = '甲丙戊庚壬'.includes(gz.dayGz[0]);
      const jqSide = multiKeyDictGet(jqmap, jq);
      const shenMap = isYangGan
        ? { '申酉戌亥子丑': '阳遁', '寅卯辰巳午未': '阴遁' }
        : { '申酉戌亥子丑': '阴遁', '寅卯辰巳午未': '阳遁' };
      const shenMap2 = jqSide === '冬至' ? shenMap : Object.fromEntries(
        Object.entries(shenMap).map(([k, v]) => [k, v === '阳遁' ? '阴遁' : '阳遁']),
      );
      dun = multiKeyDictGet(shenMap2, gz.hourGz[1]) ?? '阳遁';
    }
    return { wen: `${dun}${an2cn(k)}局`, num: k, nian, dun };
  }

  /** 太乙所在（落宫数） */
  ty(jiStyle: JiStyle, acumYear: AcumYearMethod): number {
    const arrangement = [8, 3, 4, 9, 2, 7, 6, 1, 8, 3, 4, 9, 2, 7, 6, 1]; // 重复以填12
    const arrangementR = [...arrangement].reverse();
    const yyDict: Record<string, number[]> = {
      '阳': Array.from({ length: 72 }, (_, i) => (arrangement.slice(3, 15).concat(arrangement.slice(0)))[i % 12] ?? arrangement[i % 8]),
      '阴': Array.from({ length: 72 }, (_, i) => (arrangementR.slice(0, 12).concat(arrangementR.slice(15)))[i % 12] ?? arrangementR[i % 8]),
    };
    // 简化：直接用 kook.num 索引
    const kook = this.kook(jiStyle, acumYear);
    const dun = kook.dun[0] === '阳' ? '阳' : '阴';
    // 太乙顺行八宫，每宫3局：用 num-1 对 8 取模映射
    const order = dun === '阳' ? arrangement.slice(0, 8) : arrangementR.slice(0, 8);
    return order[(kook.num - 1) % 8] ?? 1;
  }

  /** 太乙落宫名 */
  tyGong(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const kook = this.kook(jiStyle, acumYear);
    return TAIYI_PAI[kook.num - 1] ?? '中';
  }

  /** 文昌（天目） */
  skyeyes(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const kook = this.kook(jiStyle, acumYear);
    const dun = kook.dun[0] === '阳' ? '阳' : '阴';
    return SKYEYES_DICT[dun][kook.num - 1] ?? '中';
  }

  /** 文昌处境 */
  skyeyesDes(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const kook = this.kook(jiStyle, acumYear);
    return SKYEYES_SUMMARY['阳'][kook.num - 1] ?? '';
  }

  /** 始击 */
  sf(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const kook = this.kook(jiStyle, acumYear);
    return SF_LIST[kook.num - 1] ?? '中';
  }

  /** 合神 */
  hegod(jiStyle: JiStyle): string {
    const map: Record<string, string> = Object.fromEntries(
      DI_ZHI_ARR.map((d, i) => [d, newList(DI_ZHI_REVERSED, '丑')[i]]),
    );
    return map[this.taishui(jiStyle)] ?? '子';
  }

  /** 计神 */
  jigod(jiStyle: JiStyle): string {
    const kook = this.kook(jiStyle as JiStyle, 0);
    const yy = kook.dun[0] === '阳' ? '阳' : '阴';
    const mapF: Record<string, string> = Object.fromEntries(
      DI_ZHI_ARR.map((d, i) => [d, newList(DI_ZHI_REVERSED, '寅')[i]]),
    );
    const mapR: Record<string, string> = Object.fromEntries(
      DI_ZHI_REVERSED.map((d, i) => [d, newList(DI_ZHI_ARR, '酉')[i]]),
    );
    const ts = this.taishui(jiStyle);
    return yy === '阳' ? (mapF[ts] ?? '寅') : (mapR[ts] ?? '酉');
  }

  /** 定目 */
  se(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const wc = this.skyeyes(jiStyle, acumYear);
    const hg = this.hegod(jiStyle);
    const ts = this.taishui(jiStyle);
    const start = newList(GONG1, hg);
    const wcList = newList(GONG1, wc);
    const startIdx = start.indexOf(ts) + 1;
    return wcList.slice(0, startIdx)[startIdx - 1] ?? wc;
  }

  /** 主算 */
  homeCal(jiStyle: JiStyle, acumYear: AcumYearMethod): number {
    const wancheong = this.skyeyes(jiStyle, acumYear);
    const wcNum = Object.fromEntries(newList(SIXTEEN_ARR, '亥').map((g, i) => [g, L_NUM[i]]))[wancheong] ?? 0;
    const taiyi = this.ty(jiStyle, acumYear);
    const wcOrder = newList(NUM, wcNum);
    const idx = wcOrder.indexOf(taiyi);
    if (idx < 0) return taiyi;
    return wcOrder.slice(0, idx).reduce((a, b) => a + b, 0);
  }

  /** 客算 */
  awayCal(jiStyle: JiStyle, acumYear: AcumYearMethod): number {
    const shiji = this.sf(jiStyle, acumYear);
    const sfNum = Object.fromEntries(newList(SIXTEEN_ARR, '亥').map((g, i) => [g, L_NUM[i]]))[shiji] ?? 0;
    const taiyi = this.ty(jiStyle, acumYear);
    const sfOrder = newList(NUM, sfNum);
    const idx = sfOrder.indexOf(taiyi);
    if (idx < 0) return taiyi;
    return sfOrder.slice(0, idx).reduce((a, b) => a + b, 0);
  }

  /** 定算 */
  setCal(jiStyle: JiStyle, acumYear: AcumYearMethod): number {
    const setcal = this.se(jiStyle, acumYear);
    const seNum = Object.fromEntries(newList(SIXTEEN_ARR, '亥').map((g, i) => [g, L_NUM[i]]))[setcal] ?? 0;
    const taiyi = this.ty(jiStyle, acumYear);
    const seOrder = newList(NUM, seNum);
    const idx = seOrder.indexOf(taiyi);
    if (idx < 0) return taiyi;
    return seOrder.slice(0, idx).reduce((a, b) => a + b, 0);
  }

  /** 主大将 */
  homeGeneral(jiStyle: JiStyle, acumYear: AcumYearMethod): number {
    const kook = this.kook(jiStyle, acumYear);
    const dun = kook.dun[0] === '阳' ? '阳' : '阴';
    const table = dun === '阳' ? FIND_CAL_YANG : FIND_CAL_YING;
    const homeCal = table[kook.num - 1]?.[0] ?? this.homeCal(jiStyle, acumYear);
    if (homeCal < 10) return homeCal;
    if (homeCal % 10 === 0) return 1;
    if (homeCal > 10 && homeCal < 20) return homeCal - 10;
    if (homeCal > 20 && homeCal < 30) return homeCal - 20;
    if (homeCal > 30 && homeCal < 40) return homeCal - 30;
    return this.homeCal(jiStyle, acumYear);
  }

  /** 主参将 */
  homeVgen(jiStyle: JiStyle, acumYear: AcumYearMethod): number {
    const vg = (this.homeGeneral(jiStyle, acumYear) * 3) % 10;
    return vg === 0 ? 5 : vg;
  }

  /** 客大将 */
  awayGeneral(jiStyle: JiStyle, acumYear: AcumYearMethod): number {
    const kook = this.kook(jiStyle, acumYear);
    const dun = kook.dun[0] === '阳' ? '阳' : '阴';
    const table = dun === '阳' ? FIND_CAL_YANG : FIND_CAL_YING;
    const awayCal = table[kook.num - 1]?.[1] ?? this.awayCal(jiStyle, acumYear);
    if (awayCal === 1) return 1;
    if (awayCal < 10) return awayCal;
    if (awayCal % 10 === 0) return 5;
    if (awayCal > 10 && awayCal < 20) return awayCal - 10;
    if (awayCal > 20 && awayCal < 30) return awayCal - 20;
    if (awayCal > 30 && awayCal < 40) return awayCal - 30;
    return 5;
  }

  /** 客参将 */
  awayVgen(jiStyle: JiStyle, acumYear: AcumYearMethod): number {
    const vg = (this.awayGeneral(jiStyle, acumYear) * 3) % 10;
    return vg === 0 ? 5 : vg;
  }

  /** 四神（36 字符 cycle 到 72） */
  fgd(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const kook = this.kook(jiStyle, acumYear);
    return FOUR_GOD[(kook.num - 1) % 36] ?? '中';
  }
  /** 天乙（36 字符 cycle 到 72） */
  skyyi(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const kook = this.kook(jiStyle, acumYear);
    return SKY_YI[(kook.num - 1) % 36] ?? '中';
  }
  /** 地乙（36 字符 cycle 到 72） */
  earthyi(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const kook = this.kook(jiStyle, acumYear);
    return EARTH_YI[(kook.num - 1) % 36] ?? '中';
  }
  /** 直符（36 字符 cycle 到 72） */
  zhifu(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const kook = this.kook(jiStyle, acumYear);
    return ZHI_FU[(kook.num - 1) % 36] ?? '中';
  }
  /** 飞符 */
  flyfu(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const fly = Math.floor((this.accnum(jiStyle, acumYear) % 360 % 36) / 3);
    const map: Record<number, string> = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [i + 1, newList(DI_ZHI_ARR, '辰')[i]]),
    );
    return map[fly] ?? '中';
  }

  /** 君基：(accnum+250) % 360 // 30 映射到 1-12，查 new_list(di_zhi, "寅") */
  kingbase(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const acc = this.accnum(jiStyle, acumYear);
    const kingBase = Math.floor(((acc + 250) % 360) / 30) || 1;
    const order = newList(DI_ZHI_ARR, '寅');
    return order[kingBase - 1] ?? '寅';
  }
  /** 臣基：cycle(officer_base) 按 kook.num 查（36 字符 cycle 到 72） */
  officerbase(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const kook = this.kook(jiStyle, acumYear);
    return OFFICER_BASE[(kook.num - 1) % 36] ?? '巳';
  }
  /** 民基：cycle(new_list(di_zhi, "丑")) 按 kook.num 查 */
  pplbase(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const kook = this.kook(jiStyle, acumYear);
    const order = newList(DI_ZHI_ARR, '丑');
    return order[(kook.num - 1) % 12] ?? '丑';
  }

  /** 五福（取宫名） */
  wufu(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const acc = this.accnum(jiStyle, acumYear);
    const f = (acc + 250) % 225 % 45;
    const fv = f % 5;
    if (fv === 0) return NUM2GONG[5] ?? '中';
    return NUM2GONG[[1, 3, 5, 7, 9][fv - 1] ?? 1] ?? '中';
  }
  /** 大游 */
  bigyo(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const acc = this.accnum(jiStyle, acumYear);
    let big = (acc + 34) % 288;
    if (big > 36) big = Math.floor(big / 36);
    if (big < 6) big = 6;
    const map: Record<number, number> = Object.fromEntries([7, 8, 9, 1, 2, 3, 4, 6].map((n, i) => [n, i + 1]));
    const v = map[Math.floor(big)] ?? 1;
    return NUM2GONG[[7, 8, 9, 1, 2, 3, 4, 6][v - 1] ?? 7] ?? '中';
  }
  /** 小游 */
  smyo(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const acc = this.accnum(jiStyle, acumYear);
    const small = acc % 360;
    let sm: number;
    if (small < 24) {
      sm = small % 3;
    } else {
      sm = small % 24;
      if (small > 10) sm = small - 9;
    }
    const map: Record<number, number> = Object.fromEntries([1, 2, 3, 4, 6, 7, 8, 9].map((n, i) => [n, i + 1]));
    const v = map[Math.floor(sm % 3) || 1] ?? 1;
    return NUM2GONG[[1, 2, 3, 4, 6, 7, 8, 9][v - 1] ?? 1] ?? '中';
  }

  /** 阳九 */
  yangjiu(): string {
    const y = this.lunarYear;
    let getyj = (y + 12607) % 4560 % 456 % 12;
    if (getyj >= 12) getyj = getyj % 12;
    if (getyj === 0) getyj = 12;
    return newList(DI_ZHI_ARR, '寅')[getyj - 1] ?? '寅';
  }
  /** 百六 */
  baliu(): string {
    const y = this.lunarYear;
    let getbl = (y + 12607) % 4320 % 288 % 24;
    if (getbl > 12) getbl = (getbl - 12) % 12;
    if (getbl === 0) getbl = 12;
    return newList(DI_ZHI_ARR, '卯')[getbl - 1] ?? '酉';
  }

  /** 推八门分布 */
  getEightDoors(jiStyle: JiStyle, acumYear: AcumYearMethod): Record<number, string> {
    const taiyi = this.ty(jiStyle, acumYear);
    const newTyOrder = newList(NUM, taiyi);
    const acc = this.accnum(jiStyle, acumYear);
    const doorZhi = acc % 240;
    let zhi = Math.floor(doorZhi / 30);
    if (doorZhi % 30 !== 0) zhi += 1;
    if (zhi === 0) zhi = 1;
    const doors = newList(DOOR, DOOR[(zhi - 1) % 8] ?? DOOR[0]);
    const result: Record<number, string> = {};
    newTyOrder.forEach((n, i) => {
      result[n] = doors[i] ?? DOOR[0];
    });
    return result;
  }

  /** 推三门具不具 */
  threedoors(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const taiyi = this.ty(jiStyle, acumYear);
    const doors = this.getEightDoors(jiStyle, acumYear);
    const door = doors[taiyi];
    if (door && '休生开'.includes(door)) return '三门不具。';
    return '三门具。';
  }

  /** 推五将发不发 */
  fivegenerals(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const hg = this.homeGeneral(jiStyle, acumYear);
    const ag = this.awayGeneral(jiStyle, acumYear);
    const des = this.skyeyesDes(jiStyle, acumYear);
    if (des === '' && hg !== 5 && ag !== 5) return '五将发。';
    if (hg === 5) return '主将主参不出中门，杜塞无门。';
    if (ag === 5) return '客将客参不出中门，杜塞无门。';
    return `${des}。五将不发。`;
  }

  /** 推主客相关法 */
  wcNSj(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const wc = this.skyeyes(jiStyle, acumYear);
    const sj = this.sf(jiStyle, acumYear);
    const wcF = ganzhiWuxing(wc);
    const sjF = ganzhiWuxing(sj);
    const homeG = this.homeGeneral(jiStyle, acumYear);
    const taiyi = this.ty(jiStyle, acumYear);
    const relation = WUXING_RELATION_2[wcF + sjF] ?? '';
    if (relation === '我克' && taiyi === homeG) return '主将囚，不利主';
    if (relation === '我克' && taiyi !== homeG) return '主克客，主胜';
    if (relation === '克我') return '关得主人，客胜';
    if (['比和', '生我', '我生'].includes(relation)) return `关${relation}，和`;
    return '主客相当';
  }

  /** 推多少以占胜负 */
  suenwl(jiStyle: JiStyle, acumYear: AcumYearMethod): string {
    const hc = this.homeCal(jiStyle, acumYear);
    const ac = this.awayCal(jiStyle, acumYear);
    const hg = this.homeGeneral(jiStyle, acumYear);
    const ag = this.awayGeneral(jiStyle, acumYear);
    if (ac < hc && hg !== 5) return '客以少算临多，主人胜也。';
    if (ac < hc && hg === 5) return '虽客以少算临多，惟主人不出中门，主客俱不利，和。';
    if (ac > hc && ag !== 5) return '客以多算临少，主人败也。';
    if (ac > hc && ag === 5) return '虽客以多算临少，惟客人不出中门，主客俱不利，和。';
    return '主客旗鼓相当。';
  }

  /** 释格局：掩迫关囚击格对提挟 */
  shiGeju(jiStyle: JiStyle, acumYear: AcumYearMethod): Record<string, string> {
    const chen2gong = GONG2;
    const gong2chen: Record<number, string[]> = {};
    for (const [ch, p] of Object.entries(chen2gong)) {
      (gong2chen[p] ??= []).push(ch);
    }
    const eightOrder = [1, 2, 3, 4, 6, 7, 8, 9];
    const opp: Record<number, number> = { 1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4 };
    const gongOfChen = (ch: string): number | undefined => chen2gong[ch];

    const ty = this.ty(jiStyle, acumYear);
    const wc = this.skyeyes(jiStyle, acumYear);
    const sj = this.sf(jiStyle, acumYear);
    const se = this.se(jiStyle, acumYear);
    const hd = this.homeGeneral(jiStyle, acumYear);
    const hv = this.homeVgen(jiStyle, acumYear);
    const ad = this.awayGeneral(jiStyle, acumYear);
    const av = this.awayVgen(jiStyle, acumYear);
    const generals: Array<[string, number]> = [['主大', hd], ['主参', hv], ['客大', ad], ['客參', av]];
    const results: Record<string, string> = {};

    // 释掩
    if (gongOfChen(sj) === ty) results['掩'] = '始击临太乙宫，阴盛阳衰、君弱臣强之象';
    // 释囚
    if (gongOfChen(wc) === ty) results['关囚(文昌)'] = '文昌与太乙同宫，拘系执正，不利为主';
    for (const [nm, g] of generals) {
      if (g === ty && g !== 5) results[`囚(${nm})`] = `${nm}与太乙同宫为囚，下犯上之象`;
    }
    // 释关
    for (let i = 0; i < generals.length; i++) {
      for (let j = i + 1; j < generals.length; j++) {
        if (generals[i][1] === generals[j][1] && generals[i][1] !== 5) {
          results[`关(${generals[i][0]}、${generals[j][0]})`] = '主客四将同宫，相持争锋，不利有为';
        }
      }
    }
    // 释格
    const oppTy = opp[ty];
    if (oppTy) {
      if (gongOfChen(sj) === oppTy) results['格(始击)'] = '始击在太乙对宫，政事上下相格、盗侮其君';
      if (ad === oppTy) results['格(客大)'] = '客大在太乙对宫为格';
      if (av === oppTy) results['格(客参)'] = '客参在太乙对宫为格';
    }
    // 释对
    if (oppTy && gongOfChen(wc) === oppTy) results['对'] = '文昌与太乙相对，大臣怀二、将吏挟奸';
    // 释迫/击
    const prevG = eightOrder[(eightOrder.indexOf(ty) - 1 + 8) % 8];
    const nextG = eightOrder[(eightOrder.indexOf(ty) + 1) % 8];
    const chens = gong2chen[ty] ?? [];
    let outChen: string | null = null;
    let inChen: string | null = null;
    if (chens.length === 2) {
      const p0 = SIXTEEN_ARR.indexOf(chens[0]);
      const p1 = SIXTEEN_ARR.indexOf(chens[1]);
      outChen = SIXTEEN_ARR[(p1 + 1) % 16];
      inChen = SIXTEEN_ARR[(p0 - 1 + 16) % 16];
    }
    for (const [nm, ch] of [['文昌', wc], ['始击', sj], ['定目', se]] as Array<[string, string]>) {
      if (gongOfChen(ch) === ty) continue;
      if (ch === outChen) results[`辰迫(外、${nm})`] = `${nm}在太乙前一辰，外辰迫，灾急而重`;
      else if (ch === inChen) results[`辰迫(内、${nm})`] = `${nm}在太乙后一辰，内辰迫，灾尤速`;
      const og = gongOfChen(ch);
      if (og === nextG) results[`宫迫(外、${nm})`] = `${nm}在太乙前一宫，外宫迫，灾缓而轻`;
      else if (og === prevG) results[`宫迫(内、${nm})`] = `${nm}在太乙后一宫，内宫迫`;
    }
    for (const [nm, g] of generals) {
      if (g === 5 || g === ty) continue;
      if (g === nextG) results[`宫迫(外、${nm})`] = `${nm}在太乙前一宫，外宫迫`;
      else if (g === prevG) results[`宫迫(内、${nm})`] = `${nm}在太乙后一宫，内宫迫`;
    }
    // 释击
    if (gongOfChen(sj) !== ty) {
      if (sj === outChen) results['击(外辰)'] = '始击在太乙前一辰，外辰击，诸侯侵凌';
      else if (sj === inChen) results['击(内辰)'] = '始击在太乙后一辰，内辰击，亲王后妃凭凌';
      if (gongOfChen(sj) === nextG) results['击(外宫)'] = '始击在太乙前一宫，外宫击';
      else if (gongOfChen(sj) === prevG) results['击(内宫)'] = '始击在太乙后一宫，内宫击';
    }
    // 释提挟
    if (gongOfChen(wc) !== ty && gongOfChen(sj) !== ty && chens.length === 2) {
      const tyMid = (SIXTEEN_ARR.indexOf(chens[0]) + SIXTEEN_ARR.indexOf(chens[1])) / 2;
      const side = (idx: number): string => {
        const d = (idx - tyMid + 16) % 16;
        return d > 0 && d < 8 ? '外' : d > 8 ? '内' : '中';
      };
      const swc = side(SIXTEEN_ARR.indexOf(wc));
      const ssj = side(SIXTEEN_ARR.indexOf(sj));
      if (swc !== '中' && ssj !== '中' && swc !== ssj) {
        results['提挟'] = '二目(文昌、始击)挟太乙，政由大臣、下专权之象';
      }
    }
    // 释执提
    const doors = this.getEightDoors(jiStyle, acumYear);
    const kaiGong = Object.entries(doors).find(([, d]) => d === '开')?.[0];
    const shengGong = Object.entries(doors).find(([, d]) => d === '生')?.[0];
    for (const g of [kaiGong, shengGong]) {
      if (g == null) continue;
      const gn = Number(g);
      if (gn === ty) results['执(开生门合)'] = '太乙与开生门合，执提之象，不可举事';
      else if (opp[ty] && gn === opp[ty]) results['提格(开生门冲)'] = '太乙与开生门冲，提格之象';
    }
    // 释四郭固
    if (gongOfChen(wc) === ty && hd === hv && hd !== 5) {
      results['四郭固'] = '文昌囚太乙宫、主二将相关，坚壁固守，不可有为';
    } else if (gongOfChen(sj) === ty && ad !== 5 && (ad === av || ad === hd || av === hv)) {
      results['四郭固'] = '客目临太乙宫、客主二将相关，四郭固，宜固守';
    }

    if (Object.keys(results).length === 0) results['无格局'] = '太乙无掩迫关囚击格对提挟诸格局，主客清明';
    return results;
  }

  /** 十六宫分布 */
  sixteenGong(jiStyle: JiStyle, acumYear: AcumYearMethod): Record<string, string> {
    const acc = this.accnum(jiStyle, acumYear);
    const entries: Array<[string, string]> = [
      [this.skyeyes(jiStyle, acumYear), '文昌'],
      [this.taishui(jiStyle), '太岁'],
      [this.hegod(jiStyle), '合神'],
      [this.jigod(jiStyle), '计神'],
      [this.sf(jiStyle, acumYear), '始击'],
      [this.se(jiStyle, acumYear), '定计'],
      [this.kingbase(jiStyle, acumYear), '君基'],
      [this.officerbase(jiStyle, acumYear), '臣基'],
      [this.pplbase(jiStyle, acumYear), '民基'],
      [this.fgd(jiStyle, acumYear), '四神'],
      [this.skyyi(jiStyle, acumYear), '天乙'],
      [this.earthyi(jiStyle, acumYear), '地乙'],
      [this.zhifu(jiStyle, acumYear), '直符'],
      [this.flyfu(jiStyle, acumYear), '飞符'],
      [NUM2GONG[this.homeGeneral(jiStyle, acumYear)] ?? '中', '主大'],
      [NUM2GONG[this.homeVgen(jiStyle, acumYear)] ?? '中', '主参'],
      [NUM2GONG[this.awayGeneral(jiStyle, acumYear)] ?? '中', '客大'],
      [NUM2GONG[this.awayVgen(jiStyle, acumYear)] ?? '中', '客参'],
      [NUM2GONG[this.ty(jiStyle, acumYear)] ?? '中', '太乙'],
    ];
    const res: Record<string, string> = {};
    for (const g of [...SIXTEEN_ARR, '中']) res[g] = '';
    for (const [gong, name] of entries) {
      if (gong in res && gong) res[gong] += name;
    }
    return res;
  }
}

const OFFICER_BASE = '巳巳午午午未未未申申申酉酉酉戌戌戌亥亥亥子子子丑丑丑寅寅寅卯卯卯辰辰辰巳';

// ─── 输入/输出类型 ───

export interface TaiyiInput {
  birth: BirthInput;
  /** 太乙计式，默认年计 0 */
  jiStyle?: JiStyle;
  /** 积年法，默认统宗 0 */
  acumYear?: AcumYearMethod;
  /** Solar 入口（精确历法），可选 */
  solar?: SolarLike | null;
}

export interface TaiyiData {
  engineName: string;
  mode: 'local-exact' | 'local-approx';
  basicInfo: {
    yearGz: string;
    monthGz: string;
    dayGz: string;
    hourGz: string;
    jieqi: string;
    jiStyleName: string;
    acumYearName: string;
  };
  kook: { wen: string; num: number; nian: string; dun: string };
  taiyi: { gong: string; num: number };
  wenchang: { gong: string; des: string };
  shiji: { gong: string };
  dingmu: { gong: string };
  hegod: string;
  jigod: string;
  home: { cal: number; general: number; vgen: number; calDes: string[] };
  away: { cal: number; general: number; vgen: number; calDes: string[] };
  setCal: { cal: number };
  shenSha: {
    tianyi: string;
    earthyi: string;
    fourGod: string;
    zhifu: string;
    flyfu: string;
    kingbase: string;
    officerbase: string;
    pplbase: string;
    wufu: string;
    bigyo: string;
    smyo: string;
    yangjiu: string;
    baliu: string;
  };
  geju: Record<string, string>;
  eightDoors: Record<number, string>;
  threedoors: string;
  fivegenerals: string;
  wcNSj: string;
  suenwl: string;
  sixteenGong: Record<string, string>;
  tone: Tone;
  confidenceNote: string;
  export_snapshot: ExportSnapshot;
}

// ─── 主装配 ───

export function calculateTaiyi(input: TaiyiInput): TaiyiData {
  const { birth, jiStyle = 0, acumYear = 0, solar = getSolarEntry() } = input;
  const core = new TaiyiCore(birth, solar);
  const js = jiStyle;
  const ay = acumYear;

  const kook = core.kook(js, ay);
  const tyNum = core.ty(js, ay);
  const tyGong = core.tyGong(js, ay);
  const wcGong = core.skyeyes(js, ay);
  const wcDes = core.skyeyesDes(js, ay);
  const sjGong = core.sf(js, ay);
  const seGong = core.se(js, ay);
  const homeCal = core.homeCal(js, ay);
  const awayCal = core.awayCal(js, ay);
  const setCal = core.setCal(js, ay);
  const geju = core.shiGeju(js, ay);

  // tone 定调：据格局吉凶 + 主客算
  const gejuKeys = Object.keys(geju);
  const hasJiGeju = gejuKeys.some((k) => ['掩', '囚', '关', '迫', '击', '格'].some((x) => k.includes(x)));
  const hasJi = gejuKeys.includes('无格局') || (!hasJiGeju && core.fivegenerals(js, ay).includes('发') && !core.fivegenerals(js, ay).includes('不'));
  let tone: Tone = '中';
  if (gejuKeys.includes('无格局') && core.threedoors(js, ay).includes('不具') && core.fivegenerals(js, ay) === '五将发。') tone = '吉';
  else if (hasJiGeju && ['掩', '囚', '击'].some((x) => gejuKeys.some((k) => k.includes(x)))) tone = '凶';
  else if (hasJi) tone = '吉';

  const mode = getGanZhi(birth, solar).mode;
  const gz = getGanZhi(birth, solar);

  const confidenceNote = '太乙神数为传统三式占断参考，非绝对预言，决策请结合现实理性判断。';

  const data: TaiyiData = {
    engineName: 'TaiyiEngine',
    mode,
    basicInfo: {
      yearGz: gz.yearGz,
      monthGz: gz.monthGz,
      dayGz: gz.dayGz,
      hourGz: gz.hourGz,
      jieqi: getJieqi(birth, solar),
      jiStyleName: JI_STYLE_NAMES[js],
      acumYearName: ACUM_YEAR_NAMES[ay],
    },
    kook,
    taiyi: { gong: tyGong, num: tyNum },
    wenchang: { gong: wcGong, des: wcDes },
    shiji: { gong: sjGong },
    dingmu: { gong: seGong },
    hegod: core.hegod(js),
    jigod: core.jigod(js),
    home: { cal: homeCal, general: core.homeGeneral(js, ay), vgen: core.homeVgen(js, ay), calDes: calDes(homeCal) },
    away: { cal: awayCal, general: core.awayGeneral(js, ay), vgen: core.awayVgen(js, ay), calDes: calDes(awayCal) },
    setCal: { cal: setCal },
    shenSha: {
      tianyi: core.skyyi(js, ay),
      earthyi: core.earthyi(js, ay),
      fourGod: core.fgd(js, ay),
      zhifu: core.zhifu(js, ay),
      flyfu: core.flyfu(js, ay),
      kingbase: core.kingbase(js, ay),
      officerbase: core.officerbase(js, ay),
      pplbase: core.pplbase(js, ay),
      wufu: core.wufu(js, ay),
      bigyo: core.bigyo(js, ay),
      smyo: core.smyo(js, ay),
      yangjiu: core.yangjiu(),
      baliu: core.baliu(),
    },
    geju,
    eightDoors: core.getEightDoors(js, ay),
    threedoors: core.threedoors(js, ay),
    fivegenerals: core.fivegenerals(js, ay),
    wcNSj: core.wcNSj(js, ay),
    suenwl: core.suenwl(js, ay),
    sixteenGong: core.sixteenGong(js, ay),
    tone,
    confidenceNote,
    export_snapshot: {
      summary: '',
      tags: [],
      sections: [],
      sourceNotes: confidenceNote,
    },
  };

  // 填充 export_snapshot
  const gejuStr = gejuKeys.includes('无格局') ? '无格局' : gejuKeys.join('、');
  data.export_snapshot = {
    summary: `${data.basicInfo.dayGz}日${data.basicInfo.hourGz}时${data.basicInfo.jiStyleName}（${data.basicInfo.acumYearName}），${kook.wen}，太乙在${tyGong}宫，文昌${wcGong}，始击${sjGong}。格局：${gejuStr}。`,
    tags: ['太乙神数', data.basicInfo.jiStyleName, kook.wen, `太乙${tyGong}宫`, tone === '吉' ? '偏吉' : tone === '凶' ? '偏凶' : '平稳'],
    sections: [
      { heading: '局式', body: `${kook.wen}（${data.basicInfo.jiStyleName}·${data.basicInfo.acumYearName}），${kook.nian}，${kook.dun}。` },
      { heading: '太乙落宫', body: `太乙在${tyGong}宫（${tyNum}），文昌（天目）在${wcGong}，始击在${sjGong}，定目在${seGong}。` },
      { heading: '主客算', body: `主算${homeCal}（${calDes(homeCal).join('、') || '平稳'}），客算${awayCal}（${calDes(awayCal).join('、') || '平稳'}），定算${setCal}。主大将${data.home.general}，客大将${data.away.general}。` },
      { heading: '格局', body: gejuStr === '无格局' ? '太乙无掩迫关囚击格对提挟诸格局，主客清明。' : gejuKeys.map((k) => `${k}：${geju[k]}`).join('；') + '。' },
      { heading: '八门三将', body: `${core.threedoors(js, ay)} ${core.fivegenerals(js, ay)} ${core.suenwl(js, ay)}` },
      { heading: '主客相关', body: core.wcNSj(js, ay) + '。' },
      { heading: '神煞', body: `天乙${data.shenSha.tianyi}、地乙${data.shenSha.earthyi}、四神${data.shenSha.fourGod}、直符${data.shenSha.zhifu}、五福${data.shenSha.wufu}、大游${data.shenSha.bigyo}、小游${data.shenSha.smyo}、阳九${data.shenSha.yangjiu}、百六${data.shenSha.baliu}。` },
      { heading: '使用提醒', body: '本局依传统太乙神数规则整理，适合用于传统文化学习与自我观察，不作为现实决策依据。' },
    ],
    sourceNotes: '传统太乙神数参考。',
  };

  return data;
}

export function calcTaiyiEnveloped(input: TaiyiInput): ToolEnvelope<TaiyiData> {
  const result = calculateTaiyi(input);
  return {
    ok: true,
    tool: result.engineName,
    version: result.mode,
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings: [result.confidenceNote],
  };
}
