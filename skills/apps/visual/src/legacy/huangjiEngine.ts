/**
 * huangjiEngine — 皇极经世纯 TS 引擎
 *
 * 参考kentang2017/kinwangji（MIT，https://github.com/kentang2017/kinwangji）
 * 的 wanji.py 核心算法，纯 TS 重写。历法部分复用本项目已集成的
 * 6tail/lunar-javascript（节气/干支/农历），不引入 ephem/sxtwl 依赖。
 *
 * 邵雍《皇极经世》宇宙周期：
 * - 1元 = 129600年 = 12会 × 30运 × 12世 × 30年
 * - 1会 = 10800年，1运 = 360年，1世 = 30年
 * - 积年 = 67017 + year（67017 为传统偏移，定当前在第7会）
 *
 * 皇极四卦（九卦配置）：
 * - 正卦：积年 ÷ 2160 映射 60卦循环（主卦，一运一卦）
 * - 运卦：正卦变一爻（动爻 = 运%6）
 * - 世卦：运卦变一爻（动爻 = 世÷2%6）
 * - 旬卦：世卦变一爻（动爻由年柱所在旬甲定）
 * - 年卦/月卦/日卦/时卦/分卦：依60甲子序与卦循环推算
 *
 * 输入：birth（年月日时分）+ Solar（可选精确历法）
 * 输出：ToolEnvelope<HuangjiData>，含会/运/世 + 9卦 + 动爻 + 周期解读
 */

import type { ToolEnvelope, ExportSnapshot } from './baseTypes';

// ─── 64卦数字码表（6位7/8，从下到上6爻，7阳8阴）───
// 标准先天卦序推导：每卦 = 下卦3爻 + 上卦3爻
// 八卦：乾☰777 兑☱887 离☲878 震☳877 巽☴788 坎☵787 艮☶778 坤☷888
const GUA_CODE: Record<string, string> = {
  '乾': '777777', '坤': '888888', '屯': '787877', '蒙': '778787',
  '需': '777787', '訟': '787777', '師': '888787', '比': '787888',
  '小畜': '788777', '履': '777887', '泰': '888777', '否': '777888',
  '同人': '777878', '大有': '878777', '謙': '888778', '豫': '877888',
  '隨': '887877', '蠱': '778788', '臨': '888887', '觀': '788888',
  '噬嗑': '878877', '賁': '778878', '剝': '888778', '復': '877888',
  '无妄': '777877', '大畜': '778777', '頤': '778877', '大過': '887788',
  '坎': '787787', '離': '878878', '咸': '887778', '恆': '788877',
  '遯': '777778', '大壯': '877777', '晉': '888878', '明夷': '878888',
  '家人': '788878', '睽': '878887', '蹇': '787778', '解': '877787',
  '損': '778887', '益': '788877', '夬': '887777', '姤': '777788',
  '萃': '888887', '升': '788888', '困': '787887', '井': '788787',
  '革': '878887', '鼎': '788878', '震': '877877', '艮': '778778',
  '漸': '788778', '歸妹': '887877', '豐': '878877', '旅': '778878',
  '巽': '788788', '兌': '887887', '渙': '788787', '節': '787887',
  '中孚': '887788', '小過': '778877', '既濟': '787878', '未濟': '878787',
};

// 反向：码→卦名（取首个匹配）
const CODE_GUA: Record<string, string> = {};
for (const [name, code] of Object.entries(GUA_CODE)) {
  if (!(code in CODE_GUA)) CODE_GUA[code] = name;
}

// ─── 皇极60卦循环（排除乾坤离坎，会运世主循环用）───
// 复=1 ... 剥=60，乾坤离坎不在60卦中（皇极特例）
const WANGJI_GUA_60: string[] =
  '復,頤,屯,益,震,噬嗑,隨,无妄,明夷,賁,既濟,家人,豐,革,同人,臨,損,節,中孚,歸妹,睽,兌,履,泰,大畜,需,小畜,大壯,大有,夬,姤,大過,鼎,恆,巽,井,蠱,升,訟,困,未濟,解,渙,蒙,師,遯,咸,旅,小過,漸,蹇,艮,謙,否,萃,晉,豫,觀,比,剝'.split(',');

// 皇极64卦序列（含乾坤，乾坤在32/64位）
const WANGJI_GUA_64: string[] =
  '復,頤,屯,益,震,噬嗑,隨,无妄,明夷,賁,既濟,家人,豐,離,革,同人,臨,損,節,中孚,歸妹,睽,兌,履,泰,大畜,需,小畜,大壯,大有,夬,乾,姤,大過,鼎,恆,巽,井,蠱,升,訟,困,未濟,解,渙,坎,蒙,師,遯,咸,旅,小過,漸,蹇,艮,謙,否,萃,晉,豫,觀,比,剝,坤'.split(',');

// 四正卦邻居（乾坤离坎不在60卦循环，命中时取邻居）
const SPECIAL_GUA_NEIGHBOR: Record<string, string> = {
  '乾': '姤', '坤': '復', '離': '革', '坎': '蒙',
};

// 60甲子
const JIAZI: string[] = (() => {
  const STEMS = '甲乙丙丁戊己庚辛壬癸';
  const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
  const out: string[] = [];
  for (let i = 0; i < 60; i++) out.push(STEMS[i % 10] + BRANCHES[i % 12]);
  return out;
})();

// 六旬甲首 → 起爻位
const SHI_SHUN: Record<string, number> = {
  '甲子': 1, '甲戌': 2, '甲申': 3, '甲午': 4, '甲辰': 5, '甲寅': 6,
};

// ─── 工具函数 ───

/** 爻翻转：7→8，8→7 */
const TOGGLE: Record<string, string> = { '7': '8', '8': '7' };

/** 单爻变：翻转第 yao 爻（1=初爻在下，6=上爻） */
function change(code: string, yao: number): string {
  const idx = yao - 1; // 码从下到上，索引0=初爻
  return code.slice(0, idx) + TOGGLE[code[idx]] + code.slice(idx + 1);
}

/** 码→卦名（取首个匹配） */
function codeToGua(code: string): string {
  return CODE_GUA[code] ?? '?';
}

/** 卦名→码（繁体查表，兼容简体回退） */
function guaToCode(name: string): string | undefined {
  if (name in GUA_CODE) return GUA_CODE[name];
  // 简体回退
  const SIMPLIFY_TO_TRAD: Record<string, string> = {
    '讼': '訟', '师': '師', '谦': '謙', '随': '隨', '蛊': '蠱', '临': '臨',
    '观': '觀', '贲': '賁', '剥': '剝', '复': '復', '颐': '頤', '过': '過',
    '离': '離', '恒': '恆', '遁': '遯', '壮': '壯', '晋': '晉', '损': '損',
    '夬': '夬', '升': '升', '困': '困', '革': '革', '鼎': '鼎', '渐': '漸',
    '归': '歸', '丰': '豐', '兑': '兌', '涣': '渙', '节': '節', '济': '濟',
  };
  const trad = SIMPLIFY_TO_TRAD[name[0]] ? name.replace(name[0], SIMPLIFY_TO_TRAD[name[0]]) : name;
  return GUA_CODE[trad] ?? GUA_CODE[name];
}

/** 60卦循环旋转：从 target 卦起，生成60卦序列（target为四正卦时取邻居） */
function rotateGuaCycle(target: string): string[] {
  let start = target;
  if (!(WANGJI_GUA_60.includes(start))) {
    start = SPECIAL_GUA_NEIGHBOR[start] ?? WANGJI_GUA_60[0];
  }
  const idx = WANGJI_GUA_60.indexOf(start);
  const out: string[] = [];
  for (let i = 0; i < 60; i++) out.push(WANGJI_GUA_60[(idx + i) % 60]);
  return out;
}

// ─── 周期分解 ───

/** 积年 → (积年, 会, 运, 世) */
function computeCycles(year: number): { acumYear: number; hui: number; yun: number; shi: number } {
  // year=0 视为1（无公元0年的口径）
  const y = year === 0 ? 1 : year;
  const acumYear = year < 0 ? 67017 + year + 1 : 67017 + year;
  const hui = Math.floor(acumYear / 10800) + 1;
  const yun = Math.floor(acumYear / 360) + 1;
  const shi = Math.floor(acumYear / 30) + (year < 0 ? 2 : 1);
  return { acumYear, hui, yun, shi };
}

// ─── 月卦推导（从年卦码逐爻翻转）───

/** 把年卦码归一为7/8（9→7,6→8）后逐对翻转得12月卦码 */
function deriveMonthHexagrams(yearGuaCode: string): string[] {
  const normalize = (c: string) => (c === '9' ? '7' : c === '6' ? '8' : c);
  const ny = yearGuaCode.split('').map(normalize).join('');
  const first = TOGGLE[ny[0]] + ny.slice(1);
  const second = TOGGLE[first[0]] + TOGGLE[first[1]] + first.slice(2);
  const third = second.slice(0, 1) + TOGGLE[second[1]] + TOGGLE[second[2]] + second.slice(3);
  const forth = third.slice(0, 2) + TOGGLE[third[2]] + TOGGLE[third[3]] + third.slice(4);
  const fifth = forth.slice(0, 3) + TOGGLE[forth[3]] + TOGGLE[forth[4]] + forth.slice(5);
  const sixth = fifth.slice(0, 4) + TOGGLE[fifth[4]] + TOGGLE[fifth[5]];
  // 每卦管两个月
  return [first, first, second, second, third, third, forth, forth, fifth, fifth, sixth, sixth];
}

// ─── 类型 ───

export interface HuangjiBirth {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
}

interface SolarLike {
  fromYmdHms?(y: number, mo: number, d: number, h: number, mi: number, s: number): { getLunar(): LunarLike };
  fromYmd?(y: number, mo: number, d: number): { getLunar(): LunarLike };
}

interface LunarLike {
  getYearInGanZhi(): string;
  getMonthInGanZhi(): string;
  getDayInGanZhi(): string;
  getTimeInGanZhi(): string;
  getMonthInChinese(): string;
  getDayInChinese(): string;
}

export interface HuangjiData {
  engineName: string;
  mode: string;
  version: string;
  /** 公历日期 */
  solarDate: string;
  /** 干支（年/月/日/时） */
  ganZhi: { year: string; month: string; day: string; hour: string };
  /** 农历月（1-12，用于月卦） */
  lunarMonth: number;
  /** 周期：积年/会/运/世 */
  cycles: { acumYear: number; hui: number; yun: number; shi: number };
  /** 元会运世周期定位描述 */
  cyclePosition: string;
  /** 9卦配置 */
  gua: {
    zheng: string;   // 正卦
    yun: string;     // 运卦
    shi: string;     // 世卦
    xun: string;     // 旬卦
    year: string;    // 年卦
    month: string;   // 月卦
    day: string;     // 日卦
    hour: string;    // 时卦
    minute: string;  // 分卦
  };
  /** 动爻 */
  movingLines: { yun: number; shi: number; xun: number };
  /** 整体趋势解读 */
  interpretation: string;
  export_snapshot: ExportSnapshot;
  confidenceNote: string;
}

export interface HuangjiInput {
  birth: HuangjiBirth;
  solar?: SolarLike | null;
}

// ─── 六旬甲首推算：年柱所在旬的甲首 ───

/** 60甲子中某干支所在旬的甲首（甲子/甲戌/甲申/甲午/甲辰/甲寅） */
function jiaziShun(ganZhi: string): string {
  const idx = JIAZI.indexOf(ganZhi);
  if (idx < 0) return '甲子';
  const shunStart = Math.floor(idx / 10) * 10;
  return JIAZI[shunStart];
}

// ─── 主计算 ───

/**
 * 皇极经世九卦推算 —— 纯 TS。
 * 历法（干支/农历月）复用 lunar-javascript；无 solar 走公历近似（月柱按节气近似）。
 */
export function calculateHuangji(input: HuangjiInput): HuangjiData {
  const { birth, solar } = input;
  const minute = birth.minute ?? 0;
  let year = birth.year;
  const month = birth.month;
  const day = birth.day;
  const hour = birth.hour;

  // 干支 + 农历月（复用 lunar-javascript）
  let ygz = '', mgz = '', dgz = '', hgz = '', lunarMonth = 1;
  let lunarMonthCN = '';
  let mode = 'local-approx';
  try {
    if (solar) {
      const s = solar.fromYmdHms
        ? solar.fromYmdHms(year, month, day, hour, minute, 0)
        : solar.fromYmd?.(year, month, day);
      const lunar = s && typeof s.getLunar === 'function' ? s.getLunar() : null;
      if (lunar) {
        ygz = lunar.getYearInGanZhi();
        mgz = lunar.getMonthInGanZhi();
        dgz = lunar.getDayInGanZhi();
        hgz = lunar.getTimeInGanZhi();
        lunarMonthCN = lunar.getMonthInChinese();
        // 农历月数字（初一…腊月 → 1-12）
        const monthMap: Record<string, number> = {
          '正': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
          '七': 7, '八': 8, '九': 9, '十': 10, '冬': 11, '腊': 12,
        };
        lunarMonth = monthMap[lunarMonthCN.replace('月', '')] ?? 1;
        mode = 'local-exact';
        // 农历跨年：农历12月但公历1月 → 年份-1
        if (lunarMonthCN === '腊月' && month === 1) year = year - 1;
      }
    }
  } catch {
    /* lunar-javascript 不可用，回退近似 */
  }

  // 近似回退：无 solar 时用简化干支（年柱按立春、月柱按节气近似）
  if (!ygz) {
    ygz = approxYearGanZhi(year, month, day);
    mgz = approxMonthGanZhi(year, month, day);
    dgz = approxDayGanZhi(year, month, day);
    hgz = approxHourGanZhi(dgz, hour);
    lunarMonth = approxLunarMonth(month);
  }

  // 周期分解
  const { acumYear, hui, yun, shi } = computeCycles(year);

  // 正卦：积年 ÷ 2160 映射60卦循环
  const mainIdx = Math.round(acumYear / 2160) % 60;
  const zhengGua = WANGJI_GUA_60[((mainIdx % 60) + 60) % 60] ?? WANGJI_GUA_60[0];

  // 运卦：正卦变一爻（动爻 = 运%6，0→6）
  const zhengCode = guaToCode(zhengGua) ?? '777777';
  const normalizedZheng = zhengCode.replace(/6/g, '8').replace(/9/g, '7');
  const yunYao = yun % 6 === 0 ? 6 : yun % 6;
  const yunCode = change(normalizedZheng, yunYao);
  const yunGua = codeToGua(yunCode);

  // 世卦：运卦变一爻（动爻 = floor(世/2)%6，0→6）
  const shiYao = (Math.floor(shi / 2) % 6) || 6;
  const shiCode = change(yunCode, shiYao);
  const shiGua = codeToGua(shiCode);

  // 旬卦：世卦变一爻（动爻由年柱所在旬甲首定）
  const shunName = jiaziShun(ygz);
  const shunYao = SHI_SHUN[shunName] ?? 1;
  const xunCode = change(shiCode, shunYao);
  const xunGua = codeToGua(xunCode);

  // 年卦：世卦起60卦循环，按年柱映射
  const yearGua = (() => {
    try {
      const cycle = rotateGuaCycle(shiGua);
      const yzIdx = JIAZI.indexOf(ygz);
      if (yzIdx >= 0) return cycle[yzIdx % 60];
    } catch { /* fallthrough */ }
    // 回退：按农历年序映射60卦
    const cyear = ygz || `${year}`;
    const cyc = rotateGuaCycle(shiGua);
    return cyc[Math.abs(year) % 60];
  })();

  // 月卦：从年卦码逐爻翻转得12月卦，取农历月
  const yearCode = guaToCode(yearGua) ?? '777777';
  const monthCodes = deriveMonthHexagrams(yearCode);
  const monthGua = codeToGua(monthCodes[(lunarMonth - 1) % 12]);

  // 日卦：月卦起60卦循环，按日柱映射
  const dayGua = (() => {
    const cycle = rotateGuaCycle(monthGua);
    const dzIdx = JIAZI.indexOf(dgz);
    return cycle[(dzIdx >= 0 ? dzIdx : Math.abs(year + day)) % 60];
  })();

  // 时卦：日卦起60卦循环，按时柱映射
  const hourGua = (() => {
    const cycle = rotateGuaCycle(dayGua);
    const hzIdx = JIAZI.indexOf(hgz);
    return cycle[(hzIdx >= 0 ? hzIdx : hour) % 60];
  })();

  // 分卦：时卦在60卦序的位置 + 分钟偏移
  const fenGua = (() => {
    const baseIdx = WANGJI_GUA_60.indexOf(hourGua);
    const adjusted = ((baseIdx >= 0 ? baseIdx : 0) + minute) % 60;
    return WANGJI_GUA_60[adjusted];
  })();

  // 周期定位描述
  const cyclePosition = `积年${acumYear}年，处于第${hui}会、第${yun}运、第${shi}世。` +
    `（1元=129600年=12会×30运×12世×30年，当前会运世定位为皇极经世宇宙周期坐标）`;

  // 趋势解读
  const interpretation = `皇极经世以邵雍「元会运世」宇宙周期定位当下时空。` +
    `正卦${zhengGua}主一运（360年）大势，运卦${yunGua}（动${yunYao}爻）管一运之内流变，` +
    `世卦${shiGua}（动${shiYao}爻）主一世（30年）气数，旬卦${xunGua}（动${shunYao}爻）应十年一旬之机。` +
    `当年得年卦${yearGua}，当月（农历${lunarMonthCN || lunarMonth + '月'}）月卦${monthGua}，当日日卦${dayGua}，当时时卦${hourGua}。` +
    `正卦为大势所向，世卦为当下三十年气运，年卦为本年具体应象。`;

  const snapshot: ExportSnapshot = {
    summary: `${birth.year}年${month}月${day}日${hour}时皇极排盘：正卦${zhengGua}、运卦${yunGua}、世卦${shiGua}、旬卦${xunGua}。处于第${hui}会第${yun}运第${shi}世（积年${acumYear}）。`,
    tags: ['皇极经世', `${hui}会${yun}运${shi}世`, `正卦${zhengGua}`, `世卦${shiGua}`],
    sections: [
      { heading: '周期定位', body: cyclePosition },
      { heading: '干支', body: `年柱${ygz}、月柱${mgz}、日柱${dgz}、时柱${hgz}。农历${lunarMonthCN || lunarMonth + '月'}。` },
      { heading: '正卦（主运）', body: `${zhengGua}：一运（360年）大势主卦。` },
      { heading: '运卦', body: `${yunGua}，动第${yunYao}爻。正卦变爻所得，主一运之内流变。` },
      { heading: '世卦（主世）', body: `${shiGua}，动第${shiYao}爻。主一世（30年）气数。` },
      { heading: '旬卦', body: `${xunGua}，动第${shunYao}爻。年柱在${shunName}旬，应十年一旬之机。` },
      { heading: '年卦', body: `${yearGua}：本年具体应象。` },
      { heading: '月卦', body: `${monthGua}：农历${lunarMonthCN || lunarMonth + '月'}当月卦象。` },
      { heading: '日卦', body: `${dayGua}：当日卦象。` },
      { heading: '时卦', body: `${hourGua}：当时卦象。` },
      { heading: '分卦', body: `${fenGua}：分刻卦象（按分钟偏移）。` },
      { heading: '趋势解读', body: interpretation },
    ],
    sourceNotes: '皇极经世为传统象数参考，适合用于传统文化学习与自我观察。',
  };

  return {
    engineName: 'HuangjiEngine',
    mode,
    version: '0.1.0',
    solarDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    ganZhi: { year: ygz, month: mgz, day: dgz, hour: hgz },
    lunarMonth,
    cycles: { acumYear, hui, yun, shi },
    cyclePosition,
    gua: { zheng: zhengGua, yun: yunGua, shi: shiGua, xun: xunGua, year: yearGua, month: monthGua, day: dayGua, hour: hourGua, minute: fenGua },
    movingLines: { yun: yunYao, shi: shiYao, xun: shunYao },
    interpretation,
    export_snapshot: snapshot,
    confidenceNote: snapshot.sourceNotes!,
  };
}

// ─── 近似干支（无 lunar-javascript 时回退）───

const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

/** 近似年柱（按立春2月4日） */
function approxYearGanZhi(year: number, month: number, day: number): string {
  const y = (month < 2 || (month === 2 && day < 4)) ? year - 1 : year;
  const stem = STEMS[((y - 4) % 10 + 10) % 10];
  const branch = BRANCHES[((y - 4) % 12 + 12) % 12];
  return stem + branch;
}

/** 近似月柱（按节气近似换月） */
function approxMonthGanZhi(year: number, month: number, day: number): string {
  // 节气近似换月日
  const jieDays = [6, 4, 6, 5, 6, 6, 7, 8, 8, 8, 7, 7]; // 每月节气近似日
  let monthIdx = month - 1;
  if (day < jieDays[month - 1]) monthIdx = month - 2;
  if (monthIdx < 0) monthIdx = 11;
  // 月支：寅月起正月
  const branch = BRANCHES[((monthIdx + 2) % 12 + 12) % 12];
  const yearStem = STEMS[((year - 4) % 10 + 10) % 10];
  // 五虎遁：年干定月干
  const startIdx: Record<string, number> = { '甲': 2, '己': 2, '乙': 4, '庚': 4, '丙': 6, '辛': 6, '丁': 8, '壬': 8, '戊': 0, '癸': 0 };
  const stemIdx = ((startIdx[yearStem] ?? 2) + monthIdx) % 10;
  return STEMS[stemIdx] + branch;
}

/** 近似日柱（1900-01-01=甲戌为基准） */
function approxDayGanZhi(year: number, month: number, day: number): string {
  const base = new Date(1900, 0, 1);
  const target = new Date(year, month - 1, day);
  const delta = Math.floor((target.getTime() - base.getTime()) / 86400000);
  const idx = ((delta % 60) + 60) % 60;
  // 1900-01-01 = 甲戌 = JIAZI[0]起算偏移：甲戌在60甲子中索引10
  return JIAZI[(idx + 10) % 60];
}

/** 近似时柱 */
function approxHourGanZhi(dayGanZhi: string, hour: number): string {
  const shiIdx = Math.floor((hour + 1) / 2) % 12; // 子时=0
  const branch = BRANCHES[shiIdx];
  // 五鼠遁：日干定子时干
  const dayStem = dayGanZhi[0];
  const startIdx: Record<string, number> = { '甲': 0, '己': 0, '乙': 2, '庚': 2, '丙': 4, '辛': 4, '丁': 6, '壬': 6, '戊': 8, '癸': 8 };
  const stemIdx = ((startIdx[dayStem] ?? 0) + shiIdx) % 10;
  return STEMS[stemIdx] + branch;
}

/** 近似农历月（按公历月粗估） */
function approxLunarMonth(month: number): number {
  return month <= 2 ? 12 + month : month - 2;
}

// ─── ToolEnvelope 适配 ───

export function calcHuangjiEnveloped(input: HuangjiInput): ToolEnvelope<HuangjiData> {
  const result = calculateHuangji(input);
  const warnings: string[] = [result.confidenceNote];
  if (result.mode !== 'local-exact') {
    warnings.push('未传入精确历法入口，干支与农历月走公历近似，月卦/日卦可能偏差');
  }
  return {
    ok: true,
    tool: result.engineName,
    version: result.version,
    input_normalized: input as unknown as Record<string, unknown>,
    data: result,
    warnings,
  };
}
