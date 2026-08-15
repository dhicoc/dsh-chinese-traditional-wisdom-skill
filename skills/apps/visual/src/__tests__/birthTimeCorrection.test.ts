import { describe, expect, it } from 'vitest';
import { resolveBaziBirthTime } from '@/legacy/birthTimeCorrection';

const birth = {
  year: 2000,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  gender: '男' as const,
  useExactCalendar: true,
};

describe('resolveBaziBirthTime 出生时间边界', () => {
  it('默认不校时，完整保留民用出生时间', () => {
    const result = resolveBaziBirthTime(birth);

    expect(result).toMatchObject({
      civilBirth: birth,
      correctedBirth: birth,
      correctionMinutes: 0,
      applied: false,
      dayBoundaryRule: 'zi-chu-next-day',
    });
  });

  it('经度校时要求同时提供经度与出生时实际 UTC 偏移', () => {
    const result = resolveBaziBirthTime(birth, {
      timeCorrectionMode: 'longitude',
      longitude: 116.4,
    });

    expect(result).toMatchObject({ applied: false, correctionMinutes: 0 });
    expect(result.reason).toContain('实际 UTC 偏移');
  });

  it('按经度与实际 UTC 偏移计算地方平太阳时', () => {
    const result = resolveBaziBirthTime(birth, {
      timeCorrectionMode: 'longitude',
      longitude: 120,
      utcOffsetMinutes: 480,
      offsetSource: 'manual',
    });

    expect(result).toMatchObject({
      applied: true,
      correctionMinutes: 0,
      correctedBirth: birth,
    });
  });

  it('校时跨越时辰时显式标记', () => {
    const result = resolveBaziBirthTime({ ...birth, hour: 13, minute: 0 }, {
      timeCorrectionMode: 'longitude',
      longitude: 115,
      utcOffsetMinutes: 480,
    });

    expect(result).toMatchObject({
      correctionMinutes: -20,
      correctedBirth: expect.objectContaining({ hour: 12, minute: 40 }),
      crossedShichen: true,
    });
  });

  it('校时跨越日期时使用纯 UTC 算术正规化', () => {
    const result = resolveBaziBirthTime({ ...birth, hour: 0, minute: 10 }, {
      timeCorrectionMode: 'longitude',
      longitude: 105,
      utcOffsetMinutes: 480,
    });

    expect(result).toMatchObject({
      correctionMinutes: -60,
      correctedBirth: expect.objectContaining({ year: 1999, month: 12, day: 31, hour: 23, minute: 10 }),
      crossedDate: true,
      crossedZiChu: true,
    });
  });

  it('子初换日边界变动被明确标记', () => {
    const result = resolveBaziBirthTime({ ...birth, hour: 22, minute: 50 }, {
      timeCorrectionMode: 'longitude',
      longitude: 122.5,
      utcOffsetMinutes: 480,
    });

    expect(result).toMatchObject({
      correctionMinutes: 10,
      correctedBirth: expect.objectContaining({ hour: 23, minute: 0 }),
      crossedZiChu: true,
      dayBoundaryRule: 'zi-chu-next-day',
    });
  });
});
