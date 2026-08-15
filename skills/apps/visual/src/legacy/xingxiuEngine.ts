/**
 * xingxiuEngine — 二十八星宿引擎
 *
 * 用 lunar-javascript 的 getXiu()/getXiuLuck()/getXiuSong() 取当日值宿，
 * 查二十八宿数据表补全禽星/四象/五行/曜/象征/宜忌。
 *
 * 数据来源：中国传统天文学二十八宿体系（《史记·天官书》《通胜》），属公知传统知识。
 * 禽星全称格式：动物 + 曜 + 宿名（如"角木蛟"=蛟+木+角）。
 */

import type { ToolEnvelope, ExportSnapshot } from './baseTypes';

// ─── 二十八宿数据表 ───

export type XiangType = '东方青龙' | '南方朱雀' | '西方白虎' | '北方玄武';

export interface XingXiuEntry {
  /** 宿名（单字） */
  name: string;
  /** 禽星全称（如"角木蛟"） */
  fullName: string;
  /** 四象 */
  xiang: XiangType;
  /** 五行 */
  wuxing: string;
  /** 七曜（日月火水木金土） */
  yao: string;
  /** 禽星动物 */
  animal: string;
  /** 象征含义 */
  symbol: string;
  /** 西方对应（主要恒星/星座） */
  western: string;
  /** 传统值日宜 */
  yi: string;
  /** 传统值日忌 */
  ji: string;
}

/** 二十八宿完整数据（按传统顺序：东方七宿→南方→西方→北方） */
const XINGXIU_DATA: Record<string, XingXiuEntry> = {
  // 东方青龙七宿（春，木）
  '角': { name: '角', fullName: '角木蛟', xiang: '东方青龙', wuxing: '木', yao: '木', animal: '蛟', symbol: '龙角，起始、决策', western: '室女座α', yi: '祭祀、祈福', ji: '嫁娶、动土' },
  '亢': { name: '亢', fullName: '亢金龙', xiang: '东方青龙', wuxing: '金', yao: '金', animal: '龙', symbol: '龙咽喉，精明但反复', western: '室女座κ', yi: '婚姻、祭祀', ji: '出行' },
  '氐': { name: '氐', fullName: '氐土貉', xiang: '东方青龙', wuxing: '土', yao: '土', animal: '貉', symbol: '龙根基，谋略八面玲珑', western: '天秤座α', yi: '交易、安床', ji: '嫁娶' },
  '房': { name: '房', fullName: '房日兔', xiang: '东方青龙', wuxing: '日', yao: '日', animal: '兔', symbol: '龙腹天驷，幸运但需低调', western: '天蝎座π', yi: '祭祀、嫁娶', ji: '动土' },
  '心': { name: '心', fullName: '心月狐', xiang: '东方青龙', wuxing: '月', yao: '月', animal: '狐', symbol: '龙心，坚毅正义但疑心重', western: '天蝎座σ', yi: '祭祀', ji: '嫁娶、出行、动土' },
  '尾': { name: '尾', fullName: '尾火虎', xiang: '东方青龙', wuxing: '火', yao: '火', animal: '虎', symbol: '龙尾，谨慎竞争', western: '天蝎座μ', yi: '造作、嫁娶', ji: '出行' },
  '箕': { name: '箕', fullName: '箕水豹', xiang: '东方青龙', wuxing: '水', yao: '水', animal: '豹', symbol: '簸箕形，智慧开放但家庭易淡薄', western: '人马座γ', yi: '造仓、掘井', ji: '嫁娶、祭祀' },
  // 南方朱雀七宿（夏，火）
  '井': { name: '井', fullName: '井木犴', xiang: '南方朱雀', wuxing: '木', yao: '木', animal: '犴', symbol: '井，廉正', western: '双子座μ', yi: '祭祀、祈福', ji: '开市' },
  '鬼': { name: '鬼', fullName: '鬼金羊', xiang: '南方朱雀', wuxing: '金', yao: '金', animal: '羊', symbol: '鬼，主丧祠', western: '巨蟹座θ', yi: '祭祀', ji: '嫁娶、出行' },
  '柳': { name: '柳', fullName: '柳土獐', xiang: '南方朱雀', wuxing: '土', yao: '土', animal: '獐', symbol: '垂柳', western: '长蛇座δ', yi: '修造、作灶', ji: '嫁娶' },
  '星': { name: '星', fullName: '星日马', xiang: '南方朱雀', wuxing: '日', yao: '日', animal: '马', symbol: '星宿核心', western: '长蛇座α', yi: '祭祀、祈福', ji: '嫁娶、动土' },
  '张': { name: '张', fullName: '张月鹿', xiang: '南方朱雀', wuxing: '月', yao: '月', animal: '鹿', symbol: '张弓', western: '长蛇座υ¹', yi: '嫁娶、开市', ji: '安葬' },
  '翼': { name: '翼', fullName: '翼火蛇', xiang: '南方朱雀', wuxing: '火', yao: '火', animal: '蛇', symbol: '鸟翼', western: '巨爵座α', yi: '祭祀、祈福', ji: '嫁娶、出行' },
  '轸': { name: '轸', fullName: '轸水蚓', xiang: '南方朱雀', wuxing: '水', yao: '水', animal: '蚓', symbol: '车辕', western: '乌鸦座γ', yi: '嫁娶、入宅', ji: '安葬' },
  // 西方白虎七宿（秋，金）
  '奎': { name: '奎', fullName: '奎木狼', xiang: '西方白虎', wuxing: '木', yao: '木', animal: '狼', symbol: '骨盆鞋底形，耿直热情', western: '仙女座ζ', yi: '嫁娶、安床', ji: '出行' },
  '娄': { name: '娄', fullName: '娄金狗', xiang: '西方白虎', wuxing: '金', yao: '金', animal: '狗', symbol: '聚众', western: '白羊座β', yi: '嫁娶、祭祀', ji: '动土' },
  '胃': { name: '胃', fullName: '胃土雉', xiang: '西方白虎', wuxing: '土', yao: '土', animal: '雉', symbol: '天仓仓库', western: '白羊座35', yi: '祭祀、造仓', ji: '嫁娶' },
  '昴': { name: '昴', fullName: '昴日鸡', xiang: '西方白虎', wuxing: '日', yao: '日', animal: '鸡', symbol: '髦头，宽厚勤奋', western: '金牛座昴星团', yi: '祭祀', ji: '嫁娶、动土' },
  '毕': { name: '毕', fullName: '毕月乌', xiang: '西方白虎', wuxing: '月', yao: '月', animal: '乌', symbol: '网', western: '金牛座ε', yi: '祭祀、祈福', ji: '嫁娶' },
  '觜': { name: '觜', fullName: '觜火猴', xiang: '西方白虎', wuxing: '火', yao: '火', animal: '猴', symbol: '嘴形', western: '猎户座附近', yi: '祭祀', ji: '嫁娶、出行' },
  '参': { name: '参', fullName: '参水猿', xiang: '西方白虎', wuxing: '水', yao: '水', animal: '猿', symbol: '参宿核心', western: '猎户座δ', yi: '祭祀、祈福', ji: '嫁娶' },
  // 北方玄武七宿（冬，水）
  '斗': { name: '斗', fullName: '斗木獬', xiang: '北方玄武', wuxing: '木', yao: '木', animal: '獬', symbol: '南斗，生死天庙', western: '人马座φ', yi: '祭祀、祈福', ji: '嫁娶' },
  '牛': { name: '牛', fullName: '牛金牛', xiang: '北方玄武', wuxing: '金', yao: '金', animal: '牛', symbol: '牵牛星', western: '摩羯座β', yi: '祭祀', ji: '嫁娶、动土、出行' },
  '女': { name: '女', fullName: '女土蝠', xiang: '北方玄武', wuxing: '土', yao: '土', animal: '蝠', symbol: '织女相关', western: '宝瓶座ε', yi: '祭祀、祈福', ji: '嫁娶' },
  '虚': { name: '虚', fullName: '虚日鼠', xiang: '北方玄武', wuxing: '日', yao: '日', animal: '鼠', symbol: '虚墟，主肃杀但值日多吉', western: '宝瓶座β', yi: '祭祀、嫁娶', ji: '安葬' },
  '危': { name: '危', fullName: '危月燕', xiang: '北方玄武', wuxing: '月', yao: '月', animal: '燕', symbol: '高屋顶，急躁但善良', western: '宝瓶座α', yi: '祭祀', ji: '嫁娶、造作' },
  '室': { name: '室', fullName: '室火猪', xiang: '北方玄武', wuxing: '火', yao: '火', animal: '猪', symbol: '房屋营室', western: '飞马座α', yi: '祭祀、祈福', ji: '嫁娶' },
  '壁': { name: '壁', fullName: '壁水貐', xiang: '北方玄武', wuxing: '水', yao: '水', animal: '貐', symbol: '墙壁屏障，修造安门吉', western: '飞马座γ', yi: '修造、安门', ji: '嫁娶' },
};

/** 二十八宿顺序（用于轮转/排序） */
const XIU_ORDER = ['角', '亢', '氐', '房', '心', '尾', '箕', '井', '鬼', '柳', '星', '张', '翼', '轸', '奎', '娄', '胃', '昴', '毕', '觜', '参', '斗', '牛', '女', '虚', '危', '室', '壁'];

// ─── lunar-javascript Solar 入口 ───

interface LunarLike {
  getXiu?: () => string;
  getXiuLuck?: () => string;
  getXiuSong?: () => string;
  getDayInGanZhiExact?: () => string;
  getDayInGanZhi?: () => string;
  getDayGanZhi?: () => string;
}
interface SolarLike {
  fromYmd?(y: number, mo: number, d: number): { getLunar(): LunarLike };
  fromYmdHms?(y: number, mo: number, d: number, h: number, mi: number, s: number): { getLunar(): LunarLike };
}

// ─── 结果类型 ───

export interface XingXiuResult {
  /** 查询日 yyyy-mm-dd；未显式传入时为系统当天 */
  queryDate: string;
  /** 当日值宿名（单字）—— 查询日/今天的值宿 */
  zhiXiu: string;
  /** 当日值宿禽星全称 */
  zhiXiuFull: string;
  /** 当日值宿四象 */
  xiang: string;
  /** 五行 */
  wuxing: string;
  /** 七曜 */
  yao: string;
  /** 禽星动物 */
  animal: string;
  /** 象征含义 */
  symbol: string;
  /** 西方对应 */
  western: string;
  /** 当日值宿吉凶 */
  luck: string;
  /** 歌诀 */
  song: string;
  /** 宜 */
  yi: string;
  /** 忌 */
  ji: string;
  /** 日干支 */
  dayGanZhi: string;
  /** 本命星宿（出生日值宿，决定性格倾向） */
  benMingXiu: string;
  benMingXiuFull: string;
  benMingXiang: string;
  benMingSymbol: string;
  benMingLuck: string;
  /** 本命星宿宜 */
  benMingYi: string;
  /** 本命星宿忌 */
  benMingJi: string;
  /** 二十八宿全表（供可视化） */
  allXiu: XingXiuEntry[];
  /** 使用的算法 */
  method: string;
  engineName: string;
  mode: string;
  confidenceNote: string;
}

export interface XingXiuBirth {
  year: number;
  month: number;
  day: number;
  /** 是否农历（true=农历输入需转公历，false/undefined=公历） */
  isLunar?: boolean;
}

/** 值宿算法：日支星期查表法（lunar-javascript默认）或连续轮转法（部分网站用） */
export type XiuMethod = 'lookup' | 'rotational';

export interface XingXiuInput {
  birth: XingXiuBirth;
  solar?: SolarLike | null;
  /** 值宿算法：lookup=日支+星期查表（默认），rotational=公历连续日轮转 */
  method?: XiuMethod;
  /** 显式查询日 yyyy-mm-dd；不传时仍查询系统当天，但该结果不能用于呈现校验 */
  queryDate?: string;
}

// ─── 连续轮转法 ───
// 基准：2004-7-30 = 斗（用户验证点），公历日序连续轮转28宿
// 偏移量：纯算术儒略日（时区无关）模28 + 24 = 斗（XIU_ORDER 中斗=index 21；旧实现用本地
//         时区 Date 计算 JD 会因时区差异（UTC vs +8）偏移一天导致星宿错位，改纯算术消除时区依赖）
const XIU_ROTATIONAL_OFFSET = 24;

/** 纯算术儒略日（Fliegel-Van Flandern，时区无关）。替代 new Date().getTime() 避免本地时区偏移。 */
function julianDayArithmetic(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const yy = year + 4800 - a;
  const mm = month + 12 * a - 3;
  return day + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

function calcXiuByRotation(year: number, month: number, day: number): string {
  const jd = julianDayArithmetic(year, month, day);
  return XIU_ORDER[(((jd % 28) + XIU_ROTATIONAL_OFFSET) % 28 + 28) % 28];
}

// ─── 主入口 ───

export function calculateXingXiu(input: XingXiuInput): XingXiuResult {
  const { birth, solar, method = 'rotational' } = input;
  let zhiXiu = '';
  let luck = '';
  let song = '';
  let dayGanZhi = '';
  let mode: 'local-exact' | 'local-approx' = 'local-approx';

  // 当日值宿默认用系统当天；显式 queryDate 时按指定日期计算。
  const today = new Date();
  const parsedQueryDate = input.queryDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const todayY = parsedQueryDate ? Number(parsedQueryDate[1]) : today.getFullYear();
  const todayM = parsedQueryDate ? Number(parsedQueryDate[2]) : today.getMonth() + 1;
  const todayD = parsedQueryDate ? Number(parsedQueryDate[3]) : today.getDate();
  const queryDate = `${todayY}-${String(todayM).padStart(2, '0')}-${String(todayD).padStart(2, '0')}`;

  if (solar && method === 'lookup') {
    try {
      const s = solar.fromYmdHms
        ? solar.fromYmdHms(todayY, todayM, todayD, 12, 0, 0)
        : solar.fromYmd?.(todayY, todayM, todayD);
      const lunar = s && typeof s.getLunar === 'function' ? s.getLunar() : null;
      if (lunar) {
        zhiXiu = typeof lunar.getXiu === 'function' ? lunar.getXiu() : '';
        luck = typeof lunar.getXiuLuck === 'function' ? lunar.getXiuLuck() : '';
        song = typeof lunar.getXiuSong === 'function' ? lunar.getXiuSong() : '';
        const callFirst = (obj: LunarLike, names: string[]): string => {
          for (const n of names) {
            const v = (obj as Record<string, unknown>)[n];
            if (typeof v === 'function') return (v as () => unknown).call(obj) as string;
          }
          return '';
        };
        dayGanZhi = callFirst(lunar, ['getDayInGanZhiExact', 'getDayInGanZhi', 'getDayGanZhi']);
        if (zhiXiu) mode = 'local-exact';
      }
    } catch {
      /* 降级近似 */
    }
  }

  // 连续轮转法：直接算（不需要 lunar-javascript）
  if (method === 'rotational' || !zhiXiu) {
    zhiXiu = calcXiuByRotation(todayY, todayM, todayD);
    if (!luck) luck = '—';
    if (!song) song = '';
    if (method === 'rotational') mode = 'local-exact';
  }

  const entry = XINGXIU_DATA[zhiXiu] ?? XINGXIU_DATA['角'];

  // 本命星宿 = 出生日的值宿（用 birth 日期算，和当日值宿分开）
  // 如果 birth 是农历，先转公历再算轮转法
  let birthY = birth.year, birthM = birth.month, birthD = birth.day;
  if (birth.isLunar) {
    try {
      const w = (typeof window !== 'undefined' ? window : globalThis) as unknown as { Lunar?: { fromYmd: (y: number, m: number, d: number) => { getSolar: () => { getYear: () => number; getMonth: () => number; getDay: () => number } } } };
      if (w.Lunar) {
        const s = w.Lunar.fromYmd(birth.year, birth.month, birth.day).getSolar();
        birthY = s.getYear(); birthM = s.getMonth(); birthD = s.getDay();
      }
    } catch { /* 用原始日期 */ }
  }
  const benMingXiuName = calcXiuByRotation(birthY, birthM, birthD);
  const benMingEntry = XINGXIU_DATA[benMingXiuName] ?? XINGXIU_DATA['角'];

  return {
    queryDate,
    zhiXiu,
    zhiXiuFull: entry.fullName,
    xiang: entry.xiang,
    wuxing: entry.wuxing,
    yao: entry.yao,
    animal: entry.animal,
    symbol: entry.symbol,
    western: entry.western,
    luck,
    song,
    yi: entry.yi,
    ji: entry.ji,
    dayGanZhi,
    // 本命星宿 = 出生日的值宿（独立计算，和当日值宿分开）
    benMingXiu: benMingXiuName,
    benMingXiuFull: benMingEntry.fullName,
    benMingXiang: benMingEntry.xiang,
    benMingSymbol: benMingEntry.symbol,
    benMingLuck: '—',
    benMingYi: benMingEntry.yi,
    benMingJi: benMingEntry.ji,
    allXiu: XIU_ORDER.map((n) => XINGXIU_DATA[n]).filter(Boolean),
    method: method === 'rotational' ? '连续轮转法' : '日支星期查表法',
    engineName: 'XingXiuEngine',
    mode,
    confidenceNote: '二十八宿值日信息仅作传统文化参考。',
  };
}

// ─── ToolEnvelope 适配 ───

export interface XingXiuData extends XingXiuResult {
  export_snapshot: ExportSnapshot;
}

export function calcXingXiuEnveloped(input: XingXiuInput): ToolEnvelope<XingXiuData> {
  const result = calculateXingXiu(input);
  const { zhiXiuFull, xiang, luck, yi, ji, symbol, benMingXiuFull, benMingXiang, benMingSymbol } = result;

  const snapshot: ExportSnapshot = {
    summary: `${zhiXiuFull}（${xiang}）值日，${luck}。宜${yi}；忌${ji}。本命星宿${benMingXiuFull}（${benMingXiang}）。${symbol}。`,
    tags: ['二十八星宿', zhiXiuFull, xiang, result.wuxing + '宿', luck, '本命' + benMingXiuFull],
    sections: [
      { heading: '值日宿', body: `${zhiXiuFull}（${xiang}），五行${result.wuxing}，七曜${result.yao}，禽星${result.animal}。${symbol}。` },
      { heading: '本命星宿', body: `${benMingXiuFull}（${benMingXiang}）。${benMingSymbol}。本命星宿由出生日值宿决定，影响性格倾向与人生主题。` },
      { heading: '吉凶宜忌', body: `${luck}。宜：${yi}。忌：${ji}。` },
      { heading: '西方对应', body: result.western },
      ...(result.song ? [{ heading: '歌诀', body: result.song }] : []),
    ],
    sourceNotes: '二十八星宿内容仅作传统文化参考。',
  };

  return {
    ok: true,
    tool: result.engineName,
    version: result.mode,
    input_normalized: input as unknown as Record<string, unknown>,
    data: { ...result, export_snapshot: snapshot },
    warnings: [result.confidenceNote],
  };
}
