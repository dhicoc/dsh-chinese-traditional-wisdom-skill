import { describe, expect, it } from 'vitest';
import {
  calculateEquationOfTimeMinutes,
  resolveTrueSolarTime,
} from '@/legacy/trueSolarTime';

const civilBirth = {
  year: 1990,
  month: 6,
  day: 15,
  hour: 12,
  minute: 0,
  gender: '男' as const,
  useExactCalendar: true,
};

const verifiedLocation = {
  displayName: '纽约市，纽约州，美国',
  longitude: -74.006,
  ianaTimeZone: 'America/New_York',
  utcOffsetMinutes: -240,
  utcOffsetEvidence: 'IANA 时区历史规则核验：当地夏令时 UTC-04:00',
};

describe('resolveTrueSolarTime', () => {
  it('叠加经度校正与均时差，并保留核验依据', () => {
    const result = resolveTrueSolarTime(civilBirth, verifiedLocation);

    expect(result).toMatchObject({
      status: 'resolved',
      source: 'agent-verified',
      longitudeCorrectionMinutes: -56,
      equationOfTimeMinutes: calculateEquationOfTimeMinutes(1990, 6, 15),
      trueSolarBirth: expect.objectContaining({ hour: 11, minute: 4 }),
      evidence: [verifiedLocation.utcOffsetEvidence],
    });
    expect(result.trueSolarCorrectionMinutes).toBe(
      result.longitudeCorrectionMinutes + result.equationOfTimeMinutes,
    );
  });

  it('校正跨越日期时使用 UTC 算术正规化', () => {
    const result = resolveTrueSolarTime(
      { ...civilBirth, hour: 0, minute: 10 },
      {
        ...verifiedLocation,
        displayName: '国际日期变更线东侧示例',
        longitude: 0,
        ianaTimeZone: 'Etc/GMT-12',
        utcOffsetMinutes: 720,
      },
    );

    expect(result.crossedDate).toBe(true);
    expect(result.trueSolarBirth).toEqual(expect.objectContaining({
      year: 1990,
      month: 6,
      day: 14,
      hour: 12,
      minute: 10,
    }));
  });

  it('跨子初与时辰时显式标记', () => {
    const result = resolveTrueSolarTime(
      { ...civilBirth, hour: 22, minute: 55 },
      {
        ...verifiedLocation,
        displayName: '东经 122.5 度示例',
        longitude: 122.5,
        ianaTimeZone: 'Asia/Shanghai',
        utcOffsetMinutes: 480,
      },
    );

    expect(result).toMatchObject({
      trueSolarCorrectionMinutes: 10,
      trueSolarBirth: expect.objectContaining({ hour: 23, minute: 5 }),
      crossedShichen: true,
      crossedZiChu: true,
    });
  });
});
