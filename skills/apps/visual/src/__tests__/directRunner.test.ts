import { describe, expect, it } from 'vitest';
import { runLocalTool } from '@/legacy/directRunner';
import { resolveTrueSolarTime, type TrueSolarTimeResolution } from '@/engine-api/trueSolarTime';
import { LocalToolError } from '@/legacy/localToolErrors';
import { parseLocalToolCall, parseLocalToolInput } from '@/legacy/toolContracts';

const BIRTH = { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } as const;

function createTrueSolarResolution(): TrueSolarTimeResolution {
  return resolveTrueSolarTime(
    { ...BIRTH, minute: 0, useExactCalendar: true },
    {
      displayName: '北京市，中国',
      longitude: 116.4074,
      ianaTimeZone: 'Asia/Shanghai',
      utcOffsetMinutes: 480,
      utcOffsetEvidence: 'IANA 时区历史规则核验：当地 UTC+08:00',
    },
  );
}

describe('runLocalTool', () => {
  it('requires confirmed civil fallback and returns Bazi timeSource context directly', async () => {
    await expect(runLocalTool('bazi_calculate', {
      birth: BIRTH,
      timeBasis: 'civil-unverified',
    })).rejects.toThrow('civilFallbackConfirmed=true');

    const envelope = await runLocalTool('bazi_calculate', {
      birth: BIRTH,
      timeBasis: 'civil-unverified',
      civilFallbackConfirmed: true,
    });

    const result = envelope as Exclude<typeof envelope, { status: 'resolved' }>;
    expect(result.ok).toBe(true);
    expect((result.data as { timeSource: { timeBasis: string } }).timeSource.timeBasis).toBe('civil-unverified');
  });

  it('rejects unverifiable true-solar contexts and accepts a locally resolved context', async () => {
    const trueSolarResolution = createTrueSolarResolution();
    const { trueSolarBirth } = trueSolarResolution;

    await expect(runLocalTool('bazi_calculate', {
      birth: trueSolarBirth,
      timeBasis: 'true-solar-verified',
      trueSolarBirth,
    })).rejects.toThrow('完整 trueSolarResolution');

    await expect(runLocalTool('bazi_calculate', {
      birth: trueSolarBirth,
      timeBasis: 'true-solar-verified',
      trueSolarResolution: { trueSolarBirth },
    })).rejects.toThrow('真太阳时结果');

    await expect(runLocalTool('bazi_calculate', {
      birth: trueSolarBirth,
      timeBasis: 'true-solar-verified',
      trueSolarResolution,
    })).resolves.toMatchObject({
      data: { timeSource: { timeBasis: 'true-solar-verified' } },
    });
  });

  it('parses bazi transitDate, strips unknown fields, and passes it to the envelope', async () => {
    const input = parseLocalToolInput('bazi_calculate', {
      birth: BIRTH,
      timeBasis: 'civil-unverified',
      civilFallbackConfirmed: true,
      transitDate: '2025-07-15',
      unexpected: 'sentinel',
    });

    expect(input).toMatchObject({ transitDate: '2025-07-15' });
    expect(input).not.toHaveProperty('unexpected');

    const result = await runLocalTool('bazi_calculate', {
      birth: BIRTH,
      timeBasis: 'civil-unverified',
      civilFallbackConfirmed: true,
      transitDate: '2025-07-15',
    });

    expect(result).toMatchObject({
      input_normalized: { transitDate: '2025-07-15' },
      data: { transit: { targetDate: '2025-07-15', available: true } },
    });
  });

  it.each(['2025-2-03', '2025-02-30', '2025/02/03', 20250203])(
    'rejects invalid bazi transitDate %o',
    (transitDate) => {
      expect(() => parseLocalToolInput('bazi_calculate', {
        birth: BIRTH,
        timeBasis: 'civil-unverified',
        civilFallbackConfirmed: true,
        transitDate,
      })).toThrow('transitDate');
    },
  );

  it('returns annual combo output with direct context', async () => {
    const envelope = await runLocalTool('combo_annual_fortune', {
      birth: BIRTH,
      baziTimeContext: {
        timeBasis: 'civil-unverified',
        civilFallbackConfirmed: true,
      },
      targetYear: 2026,
      currentMonth: 8,
    });

    const result = envelope as Exclude<typeof envelope, { status: 'resolved' }>;
    expect(result.ok).toBe(true);
    expect((result.data as { comboName: string }).comboName).toBe('年度综合运势');
    expect((result.data as { timeSource: { timeBasis: string } }).timeSource.timeBasis).toBe('civil-unverified');
  });

  it('classifies a tool without an input contract before the Runner can use raw input', () => {
    expect(() => parseLocalToolInput('not_a_tool', {})).toThrow('未知本地工具：not_a_tool');
    try {
      parseLocalToolInput('not_a_tool', {});
    } catch (error) {
      expect(error).toBeInstanceOf(LocalToolError);
      expect(error).toMatchObject({ code: 'UNKNOWN_TOOL', tool: 'not_a_tool' });
    }
  });

  it('classifies an unknown tool name before using raw input', async () => {
    await expect(runLocalTool('not_a_tool', {})).rejects.toMatchObject({
      code: 'UNKNOWN_TOOL',
      tool: 'not_a_tool',
      message: '未知本地工具：not_a_tool',
    });
  });

  it('pairs a local tool with its normalized input contract', () => {
    const call = parseLocalToolCall('calc_yunqi', {
      year: 2026,
      currentMonth: 8,
      unexpected: 'sentinel',
    });

    expect(call).toEqual({
      tool: 'calc_yunqi',
      input: { year: 2026, birthMonth: undefined, birthDay: undefined, currentMonth: 8 },
    });
    expect(() => parseLocalToolCall('not_a_tool', {})).toThrow('未知本地工具：not_a_tool');
  });

  it('requires a confirmed Bazi time context for calc_chenguz', async () => {
    await expect(runLocalTool('calc_chenguz', {
      birth: BIRTH,
    })).rejects.toThrow('baziTimeContext必须是 JSON 对象。');

    const envelope = await runLocalTool('calc_chenguz', {
      birth: BIRTH,
      baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true },
    });
    const result = envelope as Exclude<typeof envelope, { status: 'resolved' }>;
    expect((result.data as { timeSource: { timeBasis: string } }).timeSource.timeBasis).toBe('civil-unverified');
  });

  it('rejects an invalid combo_marriage scene before calculating', async () => {
    await expect(runLocalTool('combo_marriage', {
      personA: {
        birth: BIRTH,
        baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true },
      },
      personB: {
        birth: { year: 1988, month: 3, day: 20, hour: 8, gender: '女' },
        baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true },
      },
      scene: 'invalid-scene',
    })).rejects.toThrow('scene 必须是婚恋、合伙或合作。');
  });

  it('strips unknown fields from divination tool inputs and envelopes', async () => {
    const qimenInput = parseLocalToolInput('arrange_qimen', {
      birth: BIRTH,
      question: '今日出行是否顺利？',
      unexpected: 'sentinel',
    });
    expect(qimenInput).toMatchObject({
      birth: BIRTH,
      question: '今日出行是否顺利？',
    });
    expect(qimenInput).not.toHaveProperty('unexpected');

    const meihuaInput = parseLocalToolInput('cast_meihua', {
      birth: BIRTH,
      method: 'number',
      numberA: 12,
      numberB: 34,
      unexpected: 'sentinel',
    });
    expect(meihuaInput).toMatchObject({
      birth: BIRTH,
      method: 'number',
      numberA: 12,
      numberB: 34,
    });
    expect(meihuaInput).not.toHaveProperty('unexpected');

    const liuyaoInput = parseLocalToolInput('cast_liuyao', {
      birth: BIRTH,
      method: 'manual',
      yaoValues: '678987',
      question: '项目能否推进？',
      seed: 2026,
      unexpected: 'sentinel',
    });
    expect(liuyaoInput).toMatchObject({
      birth: BIRTH,
      method: 'manual',
      yaoValues: '678987',
      question: '项目能否推进？',
      seed: 2026,
    });
    expect(liuyaoInput).not.toHaveProperty('unexpected');

    for (const [tool, input] of [
      ['arrange_qimen', { birth: BIRTH, question: '今日出行是否顺利？', unexpected: 'sentinel' }],
      ['cast_meihua', { birth: BIRTH, method: 'number', numberA: 12, numberB: 34, unexpected: 'sentinel' }],
      ['cast_liuyao', { birth: BIRTH, method: 'manual', yaoValues: '678987', question: '项目能否推进？', seed: 2026, unexpected: 'sentinel' }],
    ] as const) {
      const envelope = await runLocalTool(tool, input);
      expect((envelope as { input_normalized: unknown }).input_normalized).not.toHaveProperty('unexpected');
    }
  });

  it('strips unknown fields from feixing and bazhai tool inputs', async () => {
    const feixingInput = parseLocalToolInput('calc_feixing', {
      year: 2026,
      gender: '女',
      birthYear: 1992,
      unexpected: 'sentinel',
    });
    expect(feixingInput).toEqual({ year: 2026, gender: '女', birthYear: 1992 });

    const bazhaiInput = parseLocalToolInput('calc_bazhai', {
      birthYear: 1990,
      gender: '男',
      door: '东',
      bedroom: '南',
      kitchen: '北',
      year: 2026,
      unexpected: 'sentinel',
    });
    expect(bazhaiInput).toEqual({
      birthYear: 1990,
      gender: '男',
      door: '东',
      bedroom: '南',
      kitchen: '北',
      year: 2026,
    });

    const feixing = await runLocalTool('calc_feixing', {
      year: 2026,
      gender: '女',
      birthYear: 1992,
      unexpected: 'sentinel',
    });
    expect((feixing as { input_normalized: unknown }).input_normalized).toEqual({
      year: 2026,
      gender: '女',
      birthYear: 1992,
    });

    const bazhai = await runLocalTool('calc_bazhai', {
      birthYear: 1990,
      gender: '男',
      door: '东',
      bedroom: '南',
      kitchen: '北',
      year: 2026,
      unexpected: 'sentinel',
    });
    expect((bazhai as { input_normalized: unknown }).input_normalized).toEqual({
      birthYear: 1990,
      gender: '男',
      door: '东',
      bedroom: '南',
      kitchen: '北',
      year: 2026,
    });
  });

  it('strips unknown fields from ziwei tool inputs and envelopes', async () => {
    const input = parseLocalToolInput('ziwei_chart', {
      birth: {
        ...BIRTH,
        minute: 30,
        isLunar: true,
        useExactCalendar: false,
      },
      mingGua: { trigram: '离', group: '东四命', unexpected: 'sentinel' },
      transit: { year: 2025, month: 7, unexpected: 'sentinel' },
      unexpected: 'sentinel',
    });
    expect(input).toEqual({
      birth: BIRTH,
      mingGua: { trigram: '离', group: '东四命' },
      transit: { year: 2025, month: 7 },
    });

    const envelope = await runLocalTool('ziwei_chart', {
      birth: {
        ...BIRTH,
        minute: 30,
        isLunar: true,
        useExactCalendar: false,
      },
      mingGua: { trigram: '离', group: '东四命', unexpected: 'sentinel' },
      transit: { year: 2025, month: 7, unexpected: 'sentinel' },
      unexpected: 'sentinel',
    });
    expect((envelope as { input_normalized: unknown }).input_normalized).toEqual({
      birth: BIRTH,
      mingGua: { trigram: '离', group: '东四命' },
      transit: { year: 2025, month: 7 },
    });
  });

  it('strips unknown fields from bazi, liuren and taiyi tool inputs', async () => {
    const baziInput = parseLocalToolInput('bazi_calculate', {
      birth: BIRTH,
      timeBasis: 'civil-unverified',
      civilFallbackConfirmed: true,
      shenShaTrineSource: 'day',
      unexpected: 'sentinel',
    });
    expect(baziInput).toMatchObject({
      birth: BIRTH,
      timeBasis: 'civil-unverified',
      civilFallbackConfirmed: true,
      shenShaTrineSource: 'day',
    });
    expect(baziInput).not.toHaveProperty('unexpected');

    const liurenInput = parseLocalToolInput('liuren_calculate', {
      birth: BIRTH,
      school: 'gufa',
      unexpected: 'sentinel',
    });
    expect(liurenInput).toMatchObject({ birth: BIRTH, school: 'gufa' });
    expect(liurenInput).not.toHaveProperty('unexpected');

    const taiyiInput = parseLocalToolInput('taiyi_calculate', {
      birth: BIRTH,
      jiStyle: 2,
      acumYear: 3,
      unexpected: 'sentinel',
    });
    expect(taiyiInput).toMatchObject({ birth: BIRTH, jiStyle: 2, acumYear: 3 });
    expect(taiyiInput).not.toHaveProperty('unexpected');

    const bazi = await runLocalTool('bazi_calculate', {
      birth: BIRTH,
      timeBasis: 'civil-unverified',
      civilFallbackConfirmed: true,
      shenShaTrineSource: 'day',
      unexpected: 'sentinel',
    });
    expect((bazi as { data: { timeSource: { timeBasis: string } } }).data.timeSource.timeBasis).toBe('civil-unverified');
    expect((bazi as { input_normalized: unknown }).input_normalized).not.toHaveProperty('unexpected');

    for (const [tool, input] of [
      ['liuren_calculate', { birth: BIRTH, school: 'gufa', unexpected: 'sentinel' }],
      ['taiyi_calculate', { birth: BIRTH, jiStyle: 2, acumYear: 3, unexpected: 'sentinel' }],
    ] as const) {
      const envelope = await runLocalTool(tool, input);
      expect((envelope as { input_normalized: unknown }).input_normalized).not.toHaveProperty('unexpected');
    }
  });

  it('strips unknown fields from a complete verified true-solar time context', async () => {
    const resolution = createTrueSolarResolution();
    const baziTimeContext = {
      timeBasis: 'true-solar-verified',
      trueSolarResolution: { ...resolution, unexpectedResolution: 'sentinel' },
      unexpectedContext: 'sentinel',
    };
    const input = parseLocalToolInput('calc_chenguz', {
      birth: resolution.trueSolarBirth,
      baziTimeContext,
    });
    expect(input).toMatchObject({
      baziTimeContext: {
        timeBasis: 'true-solar-verified',
        trueSolarResolution: { trueSolarBirth: resolution.trueSolarBirth },
      },
    });
    expect((input as { baziTimeContext: unknown }).baziTimeContext).not.toHaveProperty('unexpectedContext');
    expect((input as { baziTimeContext: { trueSolarResolution: unknown } }).baziTimeContext.trueSolarResolution).not.toHaveProperty('unexpectedResolution');

    const envelope = await runLocalTool('calc_chenguz', {
      birth: resolution.trueSolarBirth,
      baziTimeContext,
    });
    expect((envelope as { data: { timeSource: { verification: unknown } } }).data.timeSource.verification).toMatchObject({
      trueSolarBirth: resolution.trueSolarBirth,
    });
    expect((envelope as { data: { timeSource: { verification: unknown } } }).data.timeSource.verification).not.toHaveProperty('unexpectedResolution');
  });

  it('strips unknown fields from complete bazi true-solar inputs', async () => {
    const resolution = createTrueSolarResolution();
    const trueSolarResolution = { ...resolution, unexpectedResolution: 'sentinel' };
    const input = parseLocalToolInput('bazi_calculate', {
      birth: resolution.trueSolarBirth,
      timeBasis: 'true-solar-verified',
      trueSolarResolution,
    });
    expect((input as { trueSolarResolution: unknown }).trueSolarResolution).not.toHaveProperty('unexpectedResolution');

    const envelope = await runLocalTool('bazi_calculate', {
      birth: resolution.trueSolarBirth,
      timeBasis: 'true-solar-verified',
      trueSolarResolution,
    });
    expect((envelope as { data: { timeSource: { verification: unknown } } }).data.timeSource.verification).not.toHaveProperty('unexpectedResolution');
  });

  it('strips unknown fields from true-solar locations', async () => {
    const location = {
      displayName: '北京市，中国',
      longitude: 116.4074,
      ianaTimeZone: 'Asia/Shanghai',
      utcOffsetMinutes: 480,
      utcOffsetEvidence: 'IANA 时区历史规则核验：当地 UTC+08:00',
      unexpected: 'sentinel',
    };
    const input = parseLocalToolInput('resolve_true_solar_time', {
      birth: BIRTH,
      location,
    });
    expect((input as { location: unknown }).location).not.toHaveProperty('unexpected');

    const result = await runLocalTool('resolve_true_solar_time', {
      birth: BIRTH,
      location,
    });
    expect((result as { location: unknown }).location).not.toHaveProperty('unexpected');
  });

  it('normalizes inputs for Runner branches that inject Solar', async () => {
    const yunqi = await runLocalTool('calc_yunqi', {
      year: 2026,
      birthMonth: 6,
      birthDay: 15,
      currentMonth: 8,
      unexpected: 'sentinel',
    });
    expect((yunqi as { input_normalized: unknown }).input_normalized).toMatchObject({
      year: 2026,
      birthMonth: 6,
      birthDay: 15,
      currentMonth: 8,
    });
    expect((yunqi as { input_normalized: unknown }).input_normalized).not.toHaveProperty('unexpected');

    const rhythm = await runLocalTool('get_daily_rhythm', {
      date: '2026-08-10',
      hour: 9,
      constitution: '平和质',
      unexpected: 'sentinel',
    });
    expect((rhythm as { input_normalized: unknown }).input_normalized).toEqual({
      date: '2026-08-10',
      hour: 9,
      constitution: '平和质',
    });

    const marriage = await runLocalTool('combo_marriage', {
      personA: {
        birth: BIRTH,
        baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true },
        label: '甲方',
        unexpected: 'sentinel',
      },
      personB: {
        birth: { year: 1988, month: 3, day: 20, hour: 8, gender: '女' },
        baziTimeContext: { timeBasis: 'civil-unverified', civilFallbackConfirmed: true },
        label: '乙方',
        unexpected: 'sentinel',
      },
      scene: '合作',
      targetYear: 2026,
      purpose: '签约',
      unexpected: 'sentinel',
    });
    expect((marriage as { input_normalized: unknown }).input_normalized).toEqual({
      personA: { birthYear: 1990, gender: '男', label: '甲方' },
      personB: { birthYear: 1988, gender: '女', label: '乙方' },
      scene: '合作',
    });
  });
});
