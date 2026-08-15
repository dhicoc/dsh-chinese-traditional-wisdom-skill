import type { BaziBirth } from './baziEngine';
import type { SolarBirth } from './birthBridge';
import type { BazhaiInput } from './bazhaiEngine';
import type { FeixingInput } from './feixingEngine';
import { asLocalToolError, LocalToolError } from './localToolErrors';
import { isLocalToolName, LOCAL_TOOL_NAMES, type LocalToolName } from './localToolRegistry';
import type { TrueSolarTimeResolution, VerifiedBirthLocation } from './trueSolarTime';
import type { ZiweiInput } from './ziweiEngine';

export interface TrueSolarTimeToolInput {
  birth: BaziBirth;
  location: VerifiedBirthLocation;
}

export interface BaziToolInput {
  birth: BaziBirth;
  timeBasis: 'true-solar-verified' | 'civil-unverified';
  civilFallbackConfirmed?: boolean;
  trueSolarResolution?: TrueSolarTimeResolution;
  shenShaTrineSource?: 'year' | 'day';
  transitDate?: string;
}

export interface DivinationBirth {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  gender?: '男' | '女';
}

export interface LiuyaoToolInput {
  birth: DivinationBirth;
  method?: 'coin' | 'time' | 'manual' | 'yarrow';
  yaoValues?: string;
  question?: string;
  seed?: number;
}

export interface QimenToolInput {
  birth: DivinationBirth;
  question?: string;
}

export interface DaliurenToolInput {
  birth: DivinationBirth;
  school?: 'classic' | 'gufa' | 'daxquan';
}

export interface TaiyiToolInput {
  birth: DivinationBirth;
  jiStyle?: 0 | 1 | 2 | 3 | 4;
  acumYear?: 0 | 1 | 2 | 3;
}

export interface MeihuaToolInput {
  birth: DivinationBirth;
  method?: 'time' | 'number' | 'yarrow';
  numberA?: number;
  numberB?: number;
}

export interface XingxiuToolInput {
  birth: { year: number; month: number; day: number };
  method?: 'lookup' | 'rotational';
  queryDate: string;
}

export interface YunqiToolInput {
  year: number;
  birthMonth?: number;
  birthDay?: number;
  currentMonth: number;
}

export interface ChenguzToolInput {
  birth: BaziBirth;
  baziTimeContext: Input;
  version?: 'standard' | 'folk' | 'full';
}

export interface AlmanacToolInput {
  date: string;
}

export interface DailyRhythmToolInput {
  date: string;
  hour: number;
  constitution?: string;
}

export interface XiYongToolInput {
  dayMasterWuxing: '木' | '火' | '土' | '金' | '水';
  elements: Record<'木' | '火' | '土' | '金' | '水', number>;
}

export interface NameToolInput {
  surname: string;
  givenName: string;
  birthYear?: number;
  birth?: BaziBirth;
  baziTimeContext?: Input;
}

export interface CeziToolInput {
  char: string;
  aspect?: '事业' | '感情' | '财利' | '健康' | '综合';
  birth?: BaziBirth;
  baziTimeContext?: Input;
}

export interface HuangjiToolInput {
  birth: { year: number; month: number; day: number; hour: number; minute: number };
}

export interface DreamToolInput {
  keyword: string;
  useFull: boolean;
}

export interface ConstitutionTendencyToolInput {
  wuyun?: { dayun: string };
  liuqi?: { sitian: string; zaquan: string };
}

export interface ConstitutionAnswerToolInput {
  type: '气虚质' | '阳虚质' | '阴虚质' | '痰湿质' | '湿热质' | '血瘀质' | '气郁质' | '特禀质';
  score: 1 | 2 | 3 | 4 | 5;
}

export interface ConstitutionAssessmentToolInput {
  answers: ConstitutionAnswerToolInput[];
}

export interface ConstitutionQuestionnaireToolInput extends Input {}

export interface ComboAnnualFortuneToolInput {
  birth: BaziBirth;
  baziTimeContext: Input;
  targetYear?: number;
  currentMonth?: number;
}

export interface ComboMonthlyFortuneToolInput {
  birth: BaziBirth;
  baziTimeContext: Input;
  targetYear: number;
  targetMonth: number;
  constitution?: '平和质' | '气虚质' | '阳虚质' | '阴虚质' | '痰湿质' | '湿热质' | '血瘀质' | '气郁质' | '特禀质';
}

export interface ComboDailyWellnessToolInput {
  birth: BaziBirth;
  baziTimeContext: Input;
  now: { year: number; month: number; day: number; hour: number };
  constitution?: ComboMonthlyFortuneToolInput['constitution'];
  targetYear?: number;
}

export interface ComboDecisionToolInput {
  birth: DivinationBirth;
  question: string;
  seed?: number;
}

export interface ComboSpaceTimeToolInput {
  birth: BaziBirth;
  targetYear?: number;
}

export interface ComboSanshiToolInput {
  birth: DivinationBirth;
  question: string;
  liurenSchool?: 'classic' | 'gufa' | 'daxquan';
}

export interface ComboSanshiClassicToolInput extends ComboSanshiToolInput {
  taiyiJiStyle?: 0 | 1 | 2 | 3 | 4;
  taiyiAcumYear?: 0 | 1 | 2 | 3;
}

export interface ComboZeriToolInput {
  birth: BaziBirth;
  purpose: '开业' | '结婚' | '搬家' | '动土' | '出行' | '签约' | '安葬' | '祈福';
  startDate: string;
  endDate: string;
  targetYear?: number;
  topN?: number;
}

export interface ComboMarriagePersonToolInput {
  birth: BaziBirth;
  baziTimeContext: Input;
  surname?: string;
  givenName?: string;
  label?: string;
}

export interface ComboMarriageToolInput {
  personA: ComboMarriagePersonToolInput;
  personB: ComboMarriagePersonToolInput;
  scene?: '婚恋' | '合伙' | '合作';
  targetYear?: number;
  purpose?: ComboZeriToolInput['purpose'];
}

export interface LocalToolInputByName {
  resolve_true_solar_time: TrueSolarTimeToolInput;
  bazi_calculate: BaziToolInput;
  ziwei_chart: ZiweiInput;
  calc_feixing: FeixingInput;
  calc_bazhai: BazhaiInput;
  cast_liuyao: LiuyaoToolInput;
  arrange_qimen: QimenToolInput;
  liuren_calculate: DaliurenToolInput;
  taiyi_calculate: TaiyiToolInput;
  cast_meihua: MeihuaToolInput;
  xingxiu_daily: XingxiuToolInput;
  calc_yunqi: YunqiToolInput;
  calc_chenguz: ChenguzToolInput;
  get_almanac: AlmanacToolInput;
  get_daily_rhythm: DailyRhythmToolInput;
  calc_xiyong: XiYongToolInput;
  dream_interpret: DreamToolInput;
  analyze_name: NameToolInput;
  cast_cezi: CeziToolInput;
  huangji_calculate: HuangjiToolInput;
  get_constitution_tendency: ConstitutionTendencyToolInput;
  assess_constitution: ConstitutionAssessmentToolInput;
  list_constitution_questionnaire: ConstitutionQuestionnaireToolInput;
  combo_annual_fortune: ComboAnnualFortuneToolInput;
  combo_monthly_fortune: ComboMonthlyFortuneToolInput;
  combo_daily_wellness: ComboDailyWellnessToolInput;
  combo_decision: ComboDecisionToolInput;
  combo_space_time: ComboSpaceTimeToolInput;
  combo_sanshi: ComboSanshiToolInput;
  combo_sanshi_classic: ComboSanshiClassicToolInput;
  combo_zeri: ComboZeriToolInput;
  combo_marriage: ComboMarriageToolInput;
}

type AssertNever<Value extends never> = Value;
type MissingLocalToolContracts = Exclude<LocalToolName, keyof LocalToolInputByName>;
type UnexpectedLocalToolContracts = Exclude<keyof LocalToolInputByName, LocalToolName>;
type _LocalToolRegistryCoversContracts = AssertNever<MissingLocalToolContracts>;
type _LocalToolContractsMatchRegistry = AssertNever<UnexpectedLocalToolContracts>;

export { LOCAL_TOOL_NAMES };
export type { LocalToolName };

export type LocalToolContractInput = LocalToolInputByName[LocalToolName];
export type ParsedLocalToolCall = {
  [Tool in LocalToolName]: { tool: Tool; input: LocalToolInputByName[Tool] };
}[LocalToolName];

type Input = Record<string, unknown>;

const CONSTITUTION_TYPES = ['气虚质', '阳虚质', '阴虚质', '痰湿质', '湿热质', '血瘀质', '气郁质', '特禀质'] as const;
const CONSTITUTION_QUESTION_COUNTS: Record<ConstitutionAnswerToolInput['type'], number> = {
  气虚质: 8,
  阳虚质: 6,
  阴虚质: 8,
  痰湿质: 7,
  湿热质: 5,
  血瘀质: 6,
  气郁质: 7,
  特禀质: 5,
};
const COMBO_CONSTITUTION_TYPES = ['平和质', ...CONSTITUTION_TYPES] as const;
const DIRECTIONS = new Set(['东', '东南', '南', '西南', '西', '西北', '北', '东北']);

function object(value: unknown, label: string): Input {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}必须是 JSON 对象。`);
  return value as Input;
}

function integer(value: unknown, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error(`${label}必须是 ${min}-${max} 的整数。`);
  }
  return value as number;
}

function dateParts(year: number, month: number, day: number, label: string): void {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${label}不是有效公历日期。`);
  }
}

function dateString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label}必须是 yyyy-mm-dd 格式的日期。`);
  const [yearValue, month, day] = value.split('-').map(Number);
  dateParts(yearValue, month, day, label);
  return value;
}

function birth(value: unknown, label: string): BaziBirth {
  const input = object(value, label);
  const year = integer(input.year, `${label}.year`, 1, 9999);
  const month = integer(input.month, `${label}.month`, 1, 12);
  const day = integer(input.day, `${label}.day`, 1, 31);
  const hour = integer(input.hour, `${label}.hour`, 0, 23);
  const minute = input.minute === undefined ? 0 : integer(input.minute, `${label}.minute`, 0, 59);
  const gender = input.gender;
  if (gender !== '男' && gender !== '女') throw new Error(`${label}.gender 必须是“男”或“女”。`);
  dateParts(year, month, day, label);
  return { year, month, day, hour, minute, gender, isLunar: input.isLunar === true, useExactCalendar: input.useExactCalendar !== false };
}

function divinationBirth(value: unknown): DivinationBirth {
  const input = object(value, 'birth');
  const yearValue = integer(input.year, 'birth.year', 1, 9999);
  const month = integer(input.month, 'birth.month', 1, 12);
  const day = integer(input.day, 'birth.day', 1, 31);
  const hour = integer(input.hour, 'birth.hour', 0, 23);
  const minute = input.minute === undefined ? 0 : integer(input.minute, 'birth.minute', 0, 59);
  const date = new Date(Date.UTC(yearValue, month - 1, day));
  if (date.getUTCFullYear() !== yearValue || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('birth不是有效公历日期。');
  }
  if (input.gender !== undefined && input.gender !== '男' && input.gender !== '女') throw new Error('birth.gender 必须是“男”或“女”。');
  return { year: yearValue, month, day, hour, minute, gender: input.gender as DivinationBirth['gender'] };
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label}必须是有限数字。`);
  return value;
}

function nonEmptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label}必须是非空字符串。`);
  return value.trim();
}

function huangjiBirth(value: unknown): HuangjiToolInput['birth'] {
  const input = object(value, 'birth');
  const birthYear = year(input.year, 'birth.year');
  const month = integer(input.month, 'birth.month', 1, 12);
  const day = integer(input.day, 'birth.day', 1, 31);
  const hour = integer(input.hour, 'birth.hour', 0, 23);
  const minute = input.minute === undefined ? 0 : integer(input.minute, 'birth.minute', 0, 59);
  dateParts(birthYear, month, day, 'birth');
  return { year: birthYear, month, day, hour, minute };
}

function solarBirth(value: BaziBirth): SolarBirth {
  return {
    year: value.year,
    month: value.month,
    day: value.day,
    hour: value.hour,
    minute: value.minute ?? 0,
    gender: value.gender === '女' ? '女' : '男',
    useExactCalendar: value.useExactCalendar !== false,
  };
}

function parseTrueSolarResolution(value: unknown, label: string): TrueSolarTimeResolution {
  const resolution = object(value, label);
  if (resolution.status !== 'resolved' || resolution.source !== 'agent-verified') {
    throw new Error(`${label}必须是已核验的真太阳时结果。`);
  }
  const location = object(resolution.location, `${label}.location`);
  const longitude = finiteNumber(location.longitude, `${label}.location.longitude`);
  if (longitude < -180 || longitude > 180) throw new Error(`${label}.location.longitude 必须是 -180 至 180 的数字。`);
  const ianaTimeZone = nonEmptyString(location.ianaTimeZone, `${label}.location.ianaTimeZone`);
  if (!ianaTimeZone.includes('/')) throw new Error(`${label}.location.ianaTimeZone 必须是 IANA 时区。`);
  const civilBirth = birth(resolution.civilBirth, `${label}.civilBirth`);
  const trueSolarBirth = birth(resolution.trueSolarBirth, `${label}.trueSolarBirth`);
  return {
    status: 'resolved',
    source: 'agent-verified',
    civilBirth: solarBirth(civilBirth),
    trueSolarBirth: solarBirth(trueSolarBirth),
    location: {
      displayName: nonEmptyString(location.displayName, `${label}.location.displayName`),
      longitude,
      ianaTimeZone,
      utcOffsetMinutes: integer(location.utcOffsetMinutes, `${label}.location.utcOffsetMinutes`, -840, 840),
      utcOffsetEvidence: nonEmptyString(location.utcOffsetEvidence, `${label}.location.utcOffsetEvidence`),
    },
    longitudeCorrectionMinutes: finiteNumber(resolution.longitudeCorrectionMinutes, `${label}.longitudeCorrectionMinutes`),
    equationOfTimeMinutes: finiteNumber(resolution.equationOfTimeMinutes, `${label}.equationOfTimeMinutes`),
    trueSolarCorrectionMinutes: finiteNumber(resolution.trueSolarCorrectionMinutes, `${label}.trueSolarCorrectionMinutes`),
    crossedDate: resolution.crossedDate === true,
    crossedShichen: resolution.crossedShichen === true,
    crossedZiChu: resolution.crossedZiChu === true,
    evidence: Array.isArray(resolution.evidence) && resolution.evidence.every((item) => typeof item === 'string')
      ? resolution.evidence
      : (() => { throw new Error(`${label}.evidence 必须是字符串数组。`); })(),
  };
}

function baziTimeContext(value: unknown): Input {
  const context = object(value, 'baziTimeContext');
  if (context.timeBasis !== 'true-solar-verified' && context.timeBasis !== 'civil-unverified') {
    throw new Error('baziTimeContext.timeBasis 必须是 true-solar-verified 或 civil-unverified。');
  }
  if (context.timeBasis === 'civil-unverified') {
    if (context.civilFallbackConfirmed !== true) {
      throw new Error('baziTimeContext.timeBasis=civil-unverified 必须显式传 civilFallbackConfirmed=true。');
    }
    return { timeBasis: context.timeBasis, civilFallbackConfirmed: true };
  }

  if (context.trueSolarBirth !== undefined) {
    throw new Error('baziTimeContext.timeBasis=true-solar-verified 必须提供完整 trueSolarResolution。');
  }
  if (context.trueSolarResolution === undefined) {
    throw new Error('baziTimeContext.timeBasis=true-solar-verified 必须提供完整 trueSolarResolution。');
  }

  return {
    timeBasis: context.timeBasis,
    trueSolarResolution: parseTrueSolarResolution(
      context.trueSolarResolution,
      'baziTimeContext.trueSolarResolution',
    ),
  };
}

function year(value: unknown, label: string): number {
  return integer(value, label, 1, 9999);
}

function direction(value: unknown, label: string): string {
  if (typeof value !== 'string' || !DIRECTIONS.has(value)) throw new Error(`${label}必须是八方位之一。`);
  return value;
}

export function parseLocalToolInput(tool: string, rawInput: unknown): LocalToolContractInput {
  if (!isLocalToolName(tool)) {
    throw new LocalToolError('UNKNOWN_TOOL', `未知本地工具：${tool}`, tool);
  }

  try {
    const input = object(rawInput, '工具输入');

    switch (tool) {
    case 'resolve_true_solar_time': {
      const location = object(input.location, 'location');
      if (typeof location.displayName !== 'string' || !location.displayName.trim()) throw new Error('location.displayName 必须是非空字符串。');
      if (typeof location.longitude !== 'number' || !Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180) throw new Error('location.longitude 必须是 -180 至 180 的数字。');
      if (typeof location.ianaTimeZone !== 'string' || !location.ianaTimeZone.includes('/')) throw new Error('location.ianaTimeZone 必须是 IANA 时区。');
      const utcOffsetMinutes = integer(location.utcOffsetMinutes, 'location.utcOffsetMinutes', -840, 840);
      if (typeof location.utcOffsetEvidence !== 'string' || !location.utcOffsetEvidence.trim()) throw new Error('location.utcOffsetEvidence 必须是非空字符串。');
      return {
        birth: birth(input.birth, 'birth'),
        location: {
          displayName: location.displayName,
          longitude: location.longitude,
          ianaTimeZone: location.ianaTimeZone,
          utcOffsetMinutes,
          utcOffsetEvidence: location.utcOffsetEvidence,
        },
      };
    }
    case 'bazi_calculate': {
      const timeBasis = input.timeBasis;
      if (timeBasis !== 'true-solar-verified' && timeBasis !== 'civil-unverified') throw new Error('timeBasis 必须是 true-solar-verified 或 civil-unverified。');
      if (input.shenShaTrineSource !== undefined && input.shenShaTrineSource !== 'year' && input.shenShaTrineSource !== 'day') throw new Error('shenShaTrineSource 必须是 year 或 day。');
      if (timeBasis === 'civil-unverified' && input.civilFallbackConfirmed !== true) {
        throw new Error('timeBasis=civil-unverified 必须显式传 civilFallbackConfirmed=true。');
      }
      if (timeBasis === 'true-solar-verified' && input.trueSolarBirth !== undefined) {
        throw new Error('timeBasis=true-solar-verified 必须提供完整 trueSolarResolution。');
      }
      if (timeBasis === 'true-solar-verified' && input.trueSolarResolution === undefined) {
        throw new Error('timeBasis=true-solar-verified 必须提供完整 trueSolarResolution。');
      }
      const trueSolarResolution = input.trueSolarResolution === undefined
        ? undefined
        : parseTrueSolarResolution(input.trueSolarResolution, 'trueSolarResolution');
      const transitDate = input.transitDate === undefined ? undefined : dateString(input.transitDate, 'transitDate');
      return {
        birth: birth(input.birth, 'birth'),
        timeBasis,
        civilFallbackConfirmed: input.civilFallbackConfirmed as boolean | undefined,
        trueSolarResolution,
        shenShaTrineSource: input.shenShaTrineSource as 'year' | 'day' | undefined,
        transitDate,
      } as BaziToolInput;
    }
    case 'ziwei_chart': {
      const parsedBirth = birth(input.birth, 'birth');
      const transit = input.transit === undefined ? undefined : object(input.transit, 'transit');
      if (transit) {
        year(transit.year, 'transit.year');
        integer(transit.month, 'transit.month', 1, 12);
      }
      const mingGua = input.mingGua === undefined ? undefined : object(input.mingGua, 'mingGua');
      if (mingGua) {
        nonEmptyString(mingGua.trigram, 'mingGua.trigram');
        nonEmptyString(mingGua.group, 'mingGua.group');
      }
      return {
        birth: {
          year: parsedBirth.year,
          month: parsedBirth.month,
          day: parsedBirth.day,
          hour: parsedBirth.hour,
          gender: parsedBirth.gender,
        },
        mingGua: mingGua ? {
          trigram: mingGua.trigram as string,
          group: mingGua.group as string,
        } : undefined,
        transit: transit ? {
          year: transit.year as number,
          month: transit.month as number,
        } : undefined,
      } as ZiweiInput;
    }
    case 'calc_feixing': {
      if (input.year !== undefined) year(input.year, 'year');
      if (input.birthYear !== undefined) year(input.birthYear, 'birthYear');
      if (input.gender !== undefined && input.gender !== '男' && input.gender !== '女') throw new Error('gender 必须是“男”或“女”。');
      return {
        year: input.year as number | undefined,
        gender: input.gender as '男' | '女' | undefined,
        birthYear: input.birthYear as number | undefined,
      } as FeixingInput;
    }
    case 'calc_bazhai': {
      year(input.birthYear, 'birthYear');
      if (input.gender !== '男' && input.gender !== '女') throw new Error('gender 必须是“男”或“女”。');
      if (input.year !== undefined) year(input.year, 'year');
      for (const key of ['door', 'bedroom', 'kitchen'] as const) {
        if (input[key] !== undefined) direction(input[key], key);
      }
      return {
        birthYear: input.birthYear as number,
        gender: input.gender as '男' | '女',
        door: input.door as string | undefined,
        bedroom: input.bedroom as string | undefined,
        kitchen: input.kitchen as string | undefined,
        year: input.year as number | undefined,
      } as BazhaiInput;
    }
    case 'cast_liuyao': {
      const method = input.method ?? 'coin';
      if (!['coin', 'time', 'manual', 'yarrow'].includes(method as string)) throw new Error('method 必须是 coin、time、manual 或 yarrow。');
      if (method === 'manual' && (typeof input.yaoValues !== 'string' || !/^[6-9]{6}$/.test(input.yaoValues))) {
        throw new Error('method=manual 必须提供 6 位 6-9 的 yaoValues。');
      }
      if (input.seed !== undefined) finiteNumber(input.seed, 'seed');
      if (input.question !== undefined && typeof input.question !== 'string') throw new Error('question 必须是字符串。');
      return {
        birth: divinationBirth(input.birth),
        method,
        yaoValues: input.yaoValues as string | undefined,
        question: input.question as string | undefined,
        seed: input.seed as number | undefined,
      } as LiuyaoToolInput;
    }
    case 'arrange_qimen': {
      if (input.question !== undefined && typeof input.question !== 'string') throw new Error('question 必须是字符串。');
      return {
        birth: divinationBirth(input.birth),
        question: input.question as string | undefined,
      } as QimenToolInput;
    }
    case 'liuren_calculate': {
      const school = input.school ?? 'classic';
      if (!['classic', 'gufa', 'daxquan'].includes(school as string)) throw new Error('school 必须是 classic、gufa 或 daxquan。');
      return {
        birth: divinationBirth(input.birth),
        school,
      } as DaliurenToolInput;
    }
    case 'taiyi_calculate': {
      const jiStyle = input.jiStyle ?? 0;
      const acumYear = input.acumYear ?? 0;
      if (!Number.isInteger(jiStyle) || ![0, 1, 2, 3, 4].includes(jiStyle as number)) throw new Error('jiStyle 必须是 0-4 的整数。');
      if (!Number.isInteger(acumYear) || ![0, 1, 2, 3].includes(acumYear as number)) throw new Error('acumYear 必须是 0-3 的整数。');
      return {
        birth: divinationBirth(input.birth),
        jiStyle,
        acumYear,
      } as TaiyiToolInput;
    }
    case 'cast_meihua': {
      const method = input.method ?? 'time';
      if (!['time', 'number', 'yarrow'].includes(method as string)) throw new Error('method 必须是 time、number 或 yarrow。');
      if (method === 'number') {
        finiteNumber(input.numberA, 'numberA');
        finiteNumber(input.numberB, 'numberB');
      }
      return {
        birth: divinationBirth(input.birth),
        method,
        numberA: input.numberA as number | undefined,
        numberB: input.numberB as number | undefined,
      } as MeihuaToolInput;
    }
    case 'xingxiu_daily': {
      const birthInput = object(input.birth, 'birth');
      const birthYear = year(birthInput.year, 'birth.year');
      const birthMonth = integer(birthInput.month, 'birth.month', 1, 12);
      const birthDay = integer(birthInput.day, 'birth.day', 1, 31);
      dateParts(birthYear, birthMonth, birthDay, 'birth');
      if (birthInput.isLunar === true) throw new Error('xingxiu_daily 暂只支持公历 birth。');
      const method = input.method ?? 'rotational';
      if (method !== 'lookup' && method !== 'rotational') throw new Error('method 必须是 lookup 或 rotational。');
      return {
        birth: { year: birthYear, month: birthMonth, day: birthDay },
        method,
        queryDate: dateString(input.queryDate, 'queryDate'),
      } as XingxiuToolInput;
    }
    case 'calc_yunqi': {
      const inputYear = year(input.year, 'year');
      const hasBirthMonth = input.birthMonth !== undefined;
      const hasBirthDay = input.birthDay !== undefined;
      if (hasBirthMonth !== hasBirthDay) throw new Error('birthMonth 与 birthDay 必须同时提供。');
      const birthMonth = hasBirthMonth ? integer(input.birthMonth, 'birthMonth', 1, 12) : undefined;
      const birthDay = hasBirthDay ? integer(input.birthDay, 'birthDay', 1, 31) : undefined;
      if (birthMonth !== undefined && birthDay !== undefined) dateParts(inputYear, birthMonth, birthDay, 'birth');
      return { year: inputYear, birthMonth, birthDay, currentMonth: integer(input.currentMonth, 'currentMonth', 1, 12) } as YunqiToolInput;
    }
    case 'calc_chenguz': {
      if (input.version !== undefined && input.version !== 'standard' && input.version !== 'folk' && input.version !== 'full') {
        throw new Error('version 必须是 standard、folk 或 full。');
      }
      return {
        birth: birth(input.birth, 'birth'),
        baziTimeContext: baziTimeContext(input.baziTimeContext),
        version: input.version,
      } as ChenguzToolInput;
    }
    case 'get_almanac':
      return { date: dateString(input.date, 'date') } as AlmanacToolInput;
    case 'get_daily_rhythm': {
      if (input.constitution !== undefined && typeof input.constitution !== 'string') throw new Error('constitution 必须是字符串。');
      return {
        date: dateString(input.date, 'date'),
        hour: integer(input.hour, 'hour', 0, 23),
        constitution: input.constitution as string | undefined,
      } as DailyRhythmToolInput;
    }
    case 'calc_xiyong': {
      if (!['木', '火', '土', '金', '水'].includes(input.dayMasterWuxing as string)) throw new Error('dayMasterWuxing 必须是五行之一。');
      const rawElements = object(input.elements, 'elements');
      const elements = Object.fromEntries(['木', '火', '土', '金', '水'].map((element) => {
        const value = finiteNumber(rawElements[element], `elements.${element}`);
        if (value < 0) throw new Error(`elements.${element}必须是非负数字。`);
        return [element, value];
      })) as XiYongToolInput['elements'];
      return { dayMasterWuxing: input.dayMasterWuxing as XiYongToolInput['dayMasterWuxing'], elements };
    }
    case 'dream_interpret': {
      if (input.useFull !== undefined && typeof input.useFull !== 'boolean') throw new Error('useFull 必须是布尔值。');
      return { keyword: nonEmptyString(input.keyword, 'keyword'), useFull: input.useFull ?? false } as DreamToolInput;
    }
    case 'analyze_name': {
      const birthInput = input.birth === undefined ? undefined : birth(input.birth, 'birth');
      const birthYear = input.birthYear === undefined ? undefined : year(input.birthYear, 'birthYear');
      if (birthInput && birthYear !== undefined && birthInput.year !== birthYear) throw new Error('birthYear 必须与 birth.year 一致。');
      const context = input.baziTimeContext === undefined ? undefined : baziTimeContext(input.baziTimeContext);
      if (birthInput && !context) throw new Error('提供 birth 时必须提供 baziTimeContext。');
      if (!birthInput && context) throw new Error('未提供 birth 时不能提供 baziTimeContext。');
      return { surname: nonEmptyString(input.surname, 'surname'), givenName: nonEmptyString(input.givenName, 'givenName'), birthYear, birth: birthInput, baziTimeContext: context } as NameToolInput;
    }
    case 'cast_cezi': {
      const char = nonEmptyString(input.char, 'char');
      if (Array.from(char).length !== 1) throw new Error('char 必须恰好包含一个字符。');
      const aspect = input.aspect ?? '综合';
      if (!['事业', '感情', '财利', '健康', '综合'].includes(aspect as string)) throw new Error('aspect 必须是事业、感情、财利、健康或综合。');
      const birthInput = input.birth === undefined ? undefined : birth(input.birth, 'birth');
      const context = input.baziTimeContext === undefined ? undefined : baziTimeContext(input.baziTimeContext);
      if (birthInput && !context) throw new Error('提供 birth 时必须提供 baziTimeContext。');
      if (!birthInput && context) throw new Error('未提供 birth 时不能提供 baziTimeContext。');
      return { char, aspect: aspect as CeziToolInput['aspect'], birth: birthInput, baziTimeContext: context } as CeziToolInput;
    }
    case 'huangji_calculate':
      return { birth: huangjiBirth(input.birth) } as HuangjiToolInput;
    case 'get_constitution_tendency': {
      const wuyun = input.wuyun === undefined ? undefined : object(input.wuyun, 'wuyun');
      const liuqi = input.liuqi === undefined ? undefined : object(input.liuqi, 'liuqi');
      if (wuyun?.dayun !== undefined && typeof wuyun.dayun !== 'string') throw new Error('wuyun.dayun 必须是字符串。');
      if (liuqi?.sitian !== undefined && typeof liuqi.sitian !== 'string') throw new Error('liuqi.sitian 必须是字符串。');
      if (liuqi?.zaquan !== undefined && typeof liuqi.zaquan !== 'string') throw new Error('liuqi.zaquan 必须是字符串。');
      return {
        wuyun: wuyun ? { dayun: (wuyun.dayun as string | undefined) ?? '' } : undefined,
        liuqi: liuqi ? { sitian: (liuqi.sitian as string | undefined) ?? '', zaquan: (liuqi.zaquan as string | undefined) ?? '' } : undefined,
      } as ConstitutionTendencyToolInput;
    }
    case 'assess_constitution': {
      if (input.answers === undefined) return { answers: [] } as ConstitutionAssessmentToolInput;
      if (!Array.isArray(input.answers)) throw new Error('answers 必须是答题数组。');
      if (input.answers.length === 0) return { answers: [] } as ConstitutionAssessmentToolInput;
      const counts: Record<string, number> = {};
      const answers = input.answers.map((value, index) => {
        const answer = object(value, `answers[${index}]`);
        if (!CONSTITUTION_TYPES.includes(answer.type as ConstitutionAnswerToolInput['type'])) throw new Error(`answers[${index}].type 必须是八种偏颇体质之一。`);
        const score = integer(answer.score, `answers[${index}].score`, 1, 5) as ConstitutionAnswerToolInput['score'];
        const type = answer.type as ConstitutionAnswerToolInput['type'];
        counts[type] = (counts[type] ?? 0) + 1;
        return { type, score };
      });
      for (const type of CONSTITUTION_TYPES) {
        if (counts[type] !== CONSTITUTION_QUESTION_COUNTS[type]) throw new Error(`${type}必须提供 ${CONSTITUTION_QUESTION_COUNTS[type]} 题答案。`);
      }
      return { answers } as ConstitutionAssessmentToolInput;
    }
    case 'list_constitution_questionnaire':
      return {} as ConstitutionQuestionnaireToolInput;
    case 'combo_annual_fortune': {
      const birthInput = birth(input.birth, 'birth');
      const context = baziTimeContext(input.baziTimeContext);
      return {
        birth: birthInput,
        baziTimeContext: context,
        targetYear: input.targetYear === undefined ? undefined : year(input.targetYear, 'targetYear'),
        currentMonth: input.currentMonth === undefined ? undefined : integer(input.currentMonth, 'currentMonth', 1, 12),
      } as ComboAnnualFortuneToolInput;
    }
    case 'combo_monthly_fortune': {
      const constitution = input.constitution as ComboMonthlyFortuneToolInput['constitution'];
      if (constitution !== undefined && !COMBO_CONSTITUTION_TYPES.includes(constitution)) {
        throw new Error('constitution 必须是九种体质之一。');
      }
      return {
        birth: birth(input.birth, 'birth'),
        baziTimeContext: baziTimeContext(input.baziTimeContext),
        targetYear: year(input.targetYear, 'targetYear'),
        targetMonth: integer(input.targetMonth, 'targetMonth', 1, 12),
        constitution,
      } as ComboMonthlyFortuneToolInput;
    }
    case 'combo_daily_wellness': {
      const nowInput = object(input.now, 'now');
      const nowYear = year(nowInput.year, 'now.year');
      const nowMonth = integer(nowInput.month, 'now.month', 1, 12);
      const nowDay = integer(nowInput.day, 'now.day', 1, 31);
      dateParts(nowYear, nowMonth, nowDay, 'now');
      const constitution = input.constitution as ComboDailyWellnessToolInput['constitution'];
      if (constitution !== undefined && !COMBO_CONSTITUTION_TYPES.includes(constitution)) {
        throw new Error('constitution 必须是九种体质之一。');
      }
      return {
        birth: birth(input.birth, 'birth'),
        baziTimeContext: baziTimeContext(input.baziTimeContext),
        now: { year: nowYear, month: nowMonth, day: nowDay, hour: integer(nowInput.hour, 'now.hour', 0, 23) },
        constitution,
        targetYear: input.targetYear === undefined ? undefined : year(input.targetYear, 'targetYear'),
      } as ComboDailyWellnessToolInput;
    }
    case 'combo_decision':
      return {
        birth: divinationBirth(input.birth),
        question: nonEmptyString(input.question, 'question'),
        seed: input.seed === undefined ? undefined : finiteNumber(input.seed, 'seed'),
      } as ComboDecisionToolInput;
    case 'combo_space_time':
      return {
        birth: birth(input.birth, 'birth'),
        targetYear: input.targetYear === undefined ? undefined : year(input.targetYear, 'targetYear'),
      } as ComboSpaceTimeToolInput;
    case 'combo_sanshi': {
      const liurenSchool = input.liurenSchool ?? 'classic';
      if (!['classic', 'gufa', 'daxquan'].includes(liurenSchool as string)) throw new Error('liurenSchool 必须是 classic、gufa 或 daxquan。');
      return {
        birth: divinationBirth(input.birth),
        question: nonEmptyString(input.question, 'question'),
        liurenSchool: liurenSchool as ComboSanshiToolInput['liurenSchool'],
      } as ComboSanshiToolInput;
    }
    case 'combo_sanshi_classic': {
      const liurenSchool = input.liurenSchool ?? 'classic';
      const taiyiJiStyle = input.taiyiJiStyle ?? 0;
      const taiyiAcumYear = input.taiyiAcumYear ?? 0;
      if (!['classic', 'gufa', 'daxquan'].includes(liurenSchool as string)) throw new Error('liurenSchool 必须是 classic、gufa 或 daxquan。');
      if (!Number.isInteger(taiyiJiStyle) || ![0, 1, 2, 3, 4].includes(taiyiJiStyle as number)) throw new Error('taiyiJiStyle 必须是 0-4 的整数。');
      if (!Number.isInteger(taiyiAcumYear) || ![0, 1, 2, 3].includes(taiyiAcumYear as number)) throw new Error('taiyiAcumYear 必须是 0-3 的整数。');
      return {
        birth: divinationBirth(input.birth),
        question: nonEmptyString(input.question, 'question'),
        liurenSchool: liurenSchool as ComboSanshiClassicToolInput['liurenSchool'],
        taiyiJiStyle: taiyiJiStyle as ComboSanshiClassicToolInput['taiyiJiStyle'],
        taiyiAcumYear: taiyiAcumYear as ComboSanshiClassicToolInput['taiyiAcumYear'],
      } as ComboSanshiClassicToolInput;
    }
    case 'combo_zeri': {
      const startDate = dateString(input.startDate, 'startDate');
      const endDate = dateString(input.endDate, 'endDate');
      if (startDate > endDate) throw new Error('endDate 必须不早于 startDate。');
      const start = Date.parse(`${startDate}T00:00:00Z`);
      const end = Date.parse(`${endDate}T00:00:00Z`);
      if ((end - start) / 86_400_000 + 1 > 400) throw new Error('日期区间最多支持 400 天。');
      const purpose = input.purpose;
      if (!['开业', '结婚', '搬家', '动土', '出行', '签约', '安葬', '祈福'].includes(purpose as string)) {
        throw new Error('purpose 必须是开业、结婚、搬家、动土、出行、签约、安葬或祈福。');
      }
      return {
        birth: birth(input.birth, 'birth'),
        purpose: purpose as ComboZeriToolInput['purpose'],
        startDate,
        endDate,
        targetYear: input.targetYear === undefined ? undefined : year(input.targetYear, 'targetYear'),
        topN: input.topN === undefined ? undefined : integer(input.topN, 'topN', 1, 50),
      } as ComboZeriToolInput;
    }
    case 'combo_marriage': {
      const parsePerson = (value: unknown, label: string): ComboMarriagePersonToolInput => {
        const person = object(value, label);
        const hasSurname = person.surname !== undefined;
        const hasGivenName = person.givenName !== undefined;
        if (hasSurname !== hasGivenName) throw new Error(`${label}.surname 与 ${label}.givenName 必须同时提供。`);
        return {
          birth: birth(person.birth, `${label}.birth`),
          baziTimeContext: baziTimeContext(person.baziTimeContext),
          surname: hasSurname ? nonEmptyString(person.surname, `${label}.surname`) : undefined,
          givenName: hasGivenName ? nonEmptyString(person.givenName, `${label}.givenName`) : undefined,
          label: person.label === undefined ? undefined : nonEmptyString(person.label, `${label}.label`),
        };
      };
      const personA = parsePerson(input.personA, 'personA');
      const personB = parsePerson(input.personB, 'personB');
      const hasNamesA = personA.surname !== undefined;
      const hasNamesB = personB.surname !== undefined;
      if (hasNamesA !== hasNamesB) throw new Error('personA 与 personB 的姓名必须同时完整提供，或同时省略。');
      const scene = input.scene ?? '婚恋';
      if (!['婚恋', '合伙', '合作'].includes(scene as string)) throw new Error('scene 必须是婚恋、合伙或合作。');
      const purpose = input.purpose;
      if (purpose !== undefined && !['开业', '结婚', '搬家', '动土', '出行', '签约', '安葬', '祈福'].includes(purpose as string)) {
        throw new Error('purpose 必须是开业、结婚、搬家、动土、出行、签约、安葬或祈福。');
      }
      return {
        personA,
        personB,
        scene: scene as ComboMarriageToolInput['scene'],
        targetYear: input.targetYear === undefined ? undefined : year(input.targetYear, 'targetYear'),
        purpose: purpose as ComboMarriageToolInput['purpose'],
      } as ComboMarriageToolInput;
    }
      default:
        throw new LocalToolError('UNKNOWN_TOOL', `未知本地工具：${tool}`, tool);
    }
  } catch (error) {
    throw asLocalToolError('INVALID_INPUT', error, tool);
  }
}

export function parseLocalToolCall(tool: string, rawInput: unknown): ParsedLocalToolCall {
  const input = parseLocalToolInput(tool, rawInput);
  return { tool: tool as LocalToolName, input } as ParsedLocalToolCall;
}
