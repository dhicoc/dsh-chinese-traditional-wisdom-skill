import type {
  DayBoundaryRule,
  OffsetSource,
  SolarBirth,
  TimeCorrectionMode,
} from './birthBridge';

export interface TimeCorrectionInput {
  timeCorrectionMode?: TimeCorrectionMode;
  longitude?: number;
  utcOffsetMinutes?: number;
  offsetSource?: OffsetSource;
  dayBoundaryRule?: DayBoundaryRule;
}

export interface ResolvedBaziBirth {
  civilBirth: SolarBirth;
  correctedBirth: SolarBirth;
  correctionMinutes: number;
  applied: boolean;
  reason: string;
  crossedDate: boolean;
  crossedShichen: boolean;
  crossedZiChu: boolean;
  dayBoundaryRule: DayBoundaryRule;
}

const DAY_BOUNDARY_RULE: DayBoundaryRule = 'zi-chu-next-day';

function normalizeSolarBirth(birth: SolarBirth, minutesToAdd: number): SolarBirth {
  const date = new Date(Date.UTC(
    birth.year,
    birth.month - 1,
    birth.day,
    birth.hour,
    birth.minute + minutesToAdd,
  ));

  return {
    ...birth,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

function shichenIndex(hour: number): number {
  return Math.floor(((hour + 1) % 24) / 2);
}

function isZiChu(hour: number): boolean {
  return hour === 23;
}

function sameDate(left: SolarBirth, right: SolarBirth): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

/**
 * 以地方平太阳时解析八字专用排盘时间。
 *
 * 用户必须自行提供出生时实际 UTC 偏移（已包含当时夏令时）；本函数不推断地点、时区或历史 DST。
 */
export function resolveBaziBirthTime(
  civilBirth: SolarBirth,
  input: TimeCorrectionInput = {},
): ResolvedBaziBirth {
  const dayBoundaryRule = input.dayBoundaryRule ?? DAY_BOUNDARY_RULE;
  const mode = input.timeCorrectionMode ?? 'none';
  const hasLongitude = typeof input.longitude === 'number' && Number.isFinite(input.longitude);
  const hasOffset = typeof input.utcOffsetMinutes === 'number' && Number.isFinite(input.utcOffsetMinutes);
  const canApplyLongitudeCorrection = mode === 'longitude' && hasLongitude && hasOffset;

  if (!canApplyLongitudeCorrection) {
    return {
      civilBirth,
      correctedBirth: civilBirth,
      correctionMinutes: 0,
      applied: false,
      reason: mode === 'longitude'
        ? '未提供完整的经度与出生时实际 UTC 偏移，排盘时间保持民用时间。'
        : '未启用经度校时，排盘时间采用民用时间。',
      crossedDate: false,
      crossedShichen: false,
      crossedZiChu: false,
      dayBoundaryRule,
    };
  }

  const standardMeridian = (input.utcOffsetMinutes as number / 60) * 15;
  const correctionMinutes = Math.round(4 * ((input.longitude as number) - standardMeridian));
  const correctedBirth = normalizeSolarBirth(civilBirth, correctionMinutes);

  return {
    civilBirth,
    correctedBirth,
    correctionMinutes,
    applied: true,
    reason: `已按经度 ${input.longitude}° 与实际 UTC 偏移 ${input.utcOffsetMinutes} 分钟换算地方平太阳时。`,
    crossedDate: !sameDate(civilBirth, correctedBirth),
    crossedShichen: shichenIndex(civilBirth.hour) !== shichenIndex(correctedBirth.hour),
    crossedZiChu: isZiChu(civilBirth.hour) !== isZiChu(correctedBirth.hour),
    dayBoundaryRule,
  };
}
