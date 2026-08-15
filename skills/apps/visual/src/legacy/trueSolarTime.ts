import type { SolarBirth } from './birthBridge';

export interface VerifiedBirthLocation {
  displayName: string;
  longitude: number;
  ianaTimeZone: string;
  utcOffsetMinutes: number;
  utcOffsetEvidence: string;
}

export interface TrueSolarTimeResolution {
  status: 'resolved';
  source: 'agent-verified';
  civilBirth: SolarBirth;
  trueSolarBirth: SolarBirth;
  location: VerifiedBirthLocation;
  longitudeCorrectionMinutes: number;
  equationOfTimeMinutes: number;
  trueSolarCorrectionMinutes: number;
  crossedDate: boolean;
  crossedShichen: boolean;
  crossedZiChu: boolean;
  evidence: string[];
}

function getDayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86_400_000) + 1;
}

export function calculateEquationOfTimeMinutes(year: number, month: number, day: number): number {
  const dayOfYear = getDayOfYear(year, month, day);
  const angle = (2 * Math.PI * (dayOfYear - 81)) / 364;

  return Math.round(
    9.87 * Math.sin(2 * angle)
    - 7.53 * Math.cos(angle)
    - 1.5 * Math.sin(angle),
  );
}

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

function sameDate(left: SolarBirth, right: SolarBirth): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

export function resolveTrueSolarTime(
  civilBirth: SolarBirth,
  location: VerifiedBirthLocation,
): TrueSolarTimeResolution {
  const longitudeCorrectionMinutes = Math.round(4 * location.longitude - location.utcOffsetMinutes);
  const equationOfTimeMinutes = calculateEquationOfTimeMinutes(
    civilBirth.year,
    civilBirth.month,
    civilBirth.day,
  );
  const trueSolarCorrectionMinutes = longitudeCorrectionMinutes + equationOfTimeMinutes;
  const trueSolarBirth = normalizeSolarBirth(civilBirth, trueSolarCorrectionMinutes);

  return {
    status: 'resolved',
    source: 'agent-verified',
    civilBirth,
    trueSolarBirth,
    location,
    longitudeCorrectionMinutes,
    equationOfTimeMinutes,
    trueSolarCorrectionMinutes,
    crossedDate: !sameDate(civilBirth, trueSolarBirth),
    crossedShichen: shichenIndex(civilBirth.hour) !== shichenIndex(trueSolarBirth.hour),
    crossedZiChu: (civilBirth.hour === 23) !== (trueSolarBirth.hour === 23),
    evidence: [location.utcOffsetEvidence],
  };
}
