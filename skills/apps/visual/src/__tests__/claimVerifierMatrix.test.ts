import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runLocalTool } from '@/legacy/directRunner';
import type { ToolEnvelope } from '@/legacy/baseTypes';
import { validateBaziClaims, type BaziPresentationClaim } from '@/legacy/claimVerification/baziClaimVerifier';
import { validateBazhaiClaims, type BazhaiPresentationClaim } from '@/legacy/claimVerification/bazhaiClaimVerifier';
import { validateCalendarClaims, type CalendarPresentationClaim } from '@/legacy/claimVerification/calendarClaimVerifier';
import { validateComboClaims, type ComboPresentationClaim } from '@/legacy/claimVerification/comboClaimVerifier';
import { validateDailyClaims, type DailyPresentationClaim } from '@/legacy/claimVerification/dailyClaimVerifier';
import { validateDivinationClaims, type DivinationPresentationClaim } from '@/legacy/claimVerification/divinationClaimVerifier';
import { validateFeixingClaims, type FeixingPresentationClaim } from '@/legacy/claimVerification/feixingClaimVerifier';
import { validateNumericAssertionClaims } from '@/legacy/claimVerification/numericAssertionVerifier';
import { validateZiweiClaims, type ZiweiPresentationClaim } from '@/legacy/claimVerification/ziweiClaimVerifier';
import { getZiweiHoroscopeSummary, type ZiweiBirth, type ZiweiData } from '@/legacy/ziweiEngine';

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../__fixtures__/local-tools',
);

async function resultData<T>(tool: string, fixtureName: string): Promise<T> {
  const input = JSON.parse(await readFile(path.join(fixtureDir, fixtureName), 'utf8'));
  const result = await runLocalTool(tool as never, input) as ToolEnvelope<T>;
  expect(result.ok).toBe(true);
  return result.data;
}

describe('claims verifier 回归矩阵', () => {
  it('八字：接受真实排盘 claim，拒绝篡改与不存在的大运选择器', async () => {
    const data = await resultData<any>('bazi_calculate', 'bazi_calculate.success.json');
    const luck = data.luck[0];
    const valid: BaziPresentationClaim[] = [
      { kind: 'pillar', pillar: 'day', value: `${data.pillars.day.stem}${data.pillars.day.branch}` },
      { kind: 'elementCount', element: '金', value: data.elements.金 },
      { kind: 'luck', ageStart: luck.ageStart, value: `${luck.stem}${luck.branch}` },
    ];

    expect(validateBaziClaims(data, valid)).toEqual({ valid: true, violations: [] });
    expect(validateBaziClaims(data, [{ kind: 'dayMaster', value: '错' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateBaziClaims(data, [{ kind: 'luck', ageStart: -1, value: '不存在' }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
    expect(validateBaziClaims(data, [{ tool: 'ziwei_chart', kind: 'dayMaster', value: data.dayMaster } as BaziPresentationClaim]).violations[0]).toMatchObject({
      code: 'tool-mismatch',
      tool: 'bazi_calculate',
      claimTool: 'ziwei_chart',
    });
  });

  it('八字动态层：接受真实事实，拒绝篡改、缺失动态层和错误关系选择器', async () => {
    const transit = await resultData<any>('bazi_calculate', 'bazi_calculate.transit.success.json');
    const currentLuck = transit.transit.decadal.current;
    const natalRelation = transit.transit.relations.yearly.natal[0];
    const valid: BaziPresentationClaim[] = [
      { kind: 'transitTargetDate', value: transit.transit.targetDate },
      { kind: 'transitNominalAge', value: transit.transit.nominalAge },
      { kind: 'transitDecadal', field: 'direction', value: transit.transit.decadal.direction },
      { kind: 'transitDecadal', field: 'ganZhi', value: currentLuck ? `${currentLuck.stem}${currentLuck.branch}` : '' },
      { kind: 'transitMinor', field: 'ganZhi', value: `${transit.transit.minor.stem}${transit.transit.minor.branch}` },
      { kind: 'transitPillar', layer: 'yearly', field: 'ganZhi', value: `${transit.transit.yearly.stem}${transit.transit.yearly.branch}` },
      { kind: 'transitRelation', layer: 'yearly', reference: 'natal', referenceKey: natalRelation.referenceKey, value: natalRelation.relations[0] },
    ];

    expect(validateBaziClaims(transit, valid)).toEqual({ valid: true, violations: [] });
    expect(validateBaziClaims(transit, [{ kind: 'transitNominalAge', value: transit.transit.nominalAge + 1 }]).valid).toBe(false);
    expect(validateBaziClaims(transit, [{ kind: 'transitRelation', layer: 'yearly', reference: 'natal', referenceKey: 'hour', value: '伏吟' }]).violations[0]).toMatchObject({ expected: undefined });

    const natal = await resultData<any>('bazi_calculate', 'bazi_calculate.success.json');
    expect(validateBaziClaims(natal, [{ kind: 'transitTargetDate', value: '2025-07-15' }]).violations[0]).toMatchObject({ expected: undefined });
  });

  it('八宅：接受真实命卦与方位 claim，拒绝篡改与不存在方向', async () => {
    const data = await resultData<any>('calc_bazhai', 'calc_bazhai.success.json');
    const direction = data.directions[0];
    const valid: BazhaiPresentationClaim[] = [
      { kind: 'mingGua', field: 'trigram', value: data.mingGua.trigram },
      { kind: 'direction', direction: direction.direction, field: 'star', value: direction.star },
      { kind: 'annual', field: 'taisuiDirection', value: data.taisui.taisui.direction },
    ];

    expect(validateBazhaiClaims(data, valid)).toEqual({ valid: true, violations: [] });
    expect(validateBazhaiClaims(data, [{ kind: 'mingGua', field: 'num', value: data.mingGua.num + 1 }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateBazhaiClaims(data, [{ kind: 'direction', direction: '不存在', field: 'star', value: '生气' }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
    expect(validateBazhaiClaims(data, [{ tool: 'calc_feixing', kind: 'mingGua', field: 'num', value: data.mingGua.num } as BazhaiPresentationClaim]).violations[0]).toMatchObject({ code: 'tool-mismatch' });
  });

  it('飞星：接受真实中宫与宫位 claim，拒绝篡改与不存在宫位', async () => {
    const data = await resultData<any>('calc_feixing', 'calc_feixing.success.json');
    const palace = data.grid.flat()[0];
    const valid: FeixingPresentationClaim[] = [
      { kind: 'year', value: data.year },
      { kind: 'center', field: 'centerStar', value: data.center.centerStar },
      { kind: 'palace', palace: palace.palace, field: 'starNum', value: palace.starNum },
    ];

    expect(validateFeixingClaims(data, valid)).toEqual({ valid: true, violations: [] });
    expect(validateFeixingClaims(data, [{ kind: 'year', value: data.year + 1 }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateFeixingClaims(data, [{ kind: 'palace', palace: '不存在', field: 'starNum', value: 1 }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
    expect(validateFeixingClaims(data, [{ tool: 'calc_bazhai', kind: 'year', value: data.year } as FeixingPresentationClaim]).violations[0]).toMatchObject({ code: 'tool-mismatch' });
  });

  it('紫微：接受本命与动态层 claim，拒绝篡改、不存在宫位及缺失动态层', async () => {
    const data = await resultData<ZiweiData>('ziwei_chart', 'ziwei_chart.success.json');
    const [palaceName, palace] = Object.entries(data.palaces)[0];
    const birth: ZiweiBirth = {
      ...data.birthInfo,
      gender: data.birthInfo.gender === '女' ? '女' : '男',
    };
    const transit = getZiweiHoroscopeSummary(birth, 2026, 8);
    const valid: ZiweiPresentationClaim[] = [
      { kind: 'palace', palace: palaceName, field: 'position', value: palace.position },
      { kind: 'metadata', field: 'soul', value: data.soul ?? '' },
      { kind: 'transit', field: 'age', value: transit.age.nominalAge },
    ];

    expect(validateZiweiClaims(data, valid, transit)).toEqual({ valid: true, violations: [] });
    expect(validateZiweiClaims(data, [{ kind: 'palace', palace: palaceName, field: 'position', value: '错' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateZiweiClaims(data, [{ kind: 'palace', palace: '不存在', field: 'position', value: '命宫' }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
    expect(validateZiweiClaims(data, [{ kind: 'transit', field: 'age', value: transit.age.nominalAge }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
    expect(validateZiweiClaims(data, [{ tool: 'bazi_calculate', kind: 'metadata', field: 'soul', value: data.soul ?? '' } as ZiweiPresentationClaim]).violations[0]).toMatchObject({ code: 'tool-mismatch' });
  });

  it('历法：接受五运六气与黄历 claim，拒绝篡改、错误结果种类和不存在时辰', async () => {
    const yunqi = await resultData<any>('calc_yunqi', 'calc_yunqi.success.json');
    const almanac = await resultData<any>('get_almanac', 'get_almanac.success.json');
    const hour = almanac.hours[0];
    const valid: CalendarPresentationClaim[] = [
      { kind: 'yunqiYear', field: 'year', value: yunqi.year },
      { kind: 'yunqiWuyun', field: 'dayun', value: yunqi.wuyun.dayun },
      { kind: 'yunqiStep', step: yunqi.liuqi.zhuke[0].step, field: 'qi', value: yunqi.liuqi.zhuke[0].qi },
    ];

    expect(validateCalendarClaims('yunqi', yunqi, valid)).toEqual({ valid: true, violations: [] });
    expect(validateCalendarClaims('yunqi', yunqi, [{ kind: 'yunqiYear', field: 'year', value: yunqi.year + 1 }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateCalendarClaims('almanac', almanac, [{ kind: 'almanacHour', label: hour.label, field: 'ganZhi', value: hour.ganZhi }])).toEqual({ valid: true, violations: [] });
    expect(validateCalendarClaims('almanac', almanac, [{ kind: 'yunqiYear', field: 'year', value: yunqi.year }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
    expect(validateCalendarClaims('almanac', almanac, [{ kind: 'almanacHour', label: '不存在', field: 'luck', value: '吉' }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
    expect(validateCalendarClaims('yunqi', yunqi, [{ tool: 'get_almanac', kind: 'yunqiYear', field: 'year', value: yunqi.year } as CalendarPresentationClaim]).violations[0]).toMatchObject({ code: 'tool-mismatch' });
  });

  it('历法：星宿分支接受真实 claim，拒绝篡改与跨工具 claim', async () => {
    const data = await resultData<any>('xingxiu_daily', 'xingxiu_daily.success.json');
    const valid: CalendarPresentationClaim[] = [
      { tool: 'xingxiu_daily', kind: 'xingxiu', field: 'zhiXiu', value: data.zhiXiu },
    ];

    expect(validateCalendarClaims('xingxiu', data, valid)).toEqual({ valid: true, violations: [] });
    expect(validateCalendarClaims('xingxiu', data, [{ tool: 'xingxiu_daily', kind: 'xingxiu', field: 'zhiXiu', value: `${data.zhiXiu}错` }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateCalendarClaims('xingxiu', data, [{ tool: 'get_almanac', kind: 'xingxiu', field: 'zhiXiu', value: data.zhiXiu } as CalendarPresentationClaim]).violations[0]).toMatchObject({
      code: 'tool-mismatch', tool: 'xingxiu_daily', claimTool: 'get_almanac',
    });
  });

  it('组合：接受真实择日 claim，拒绝篡改、越界索引和跨工具 claim', async () => {
    const data = await resultData<any>('combo_zeri', 'combo_zeri.success.json');
    const valid: ComboPresentationClaim[] = [
      { tool: 'combo_zeri', kind: 'zeriPurpose', value: data.zeriPurpose },
      { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 0, field: 'date', value: data.rankedDays[0].date },
    ];

    expect(validateComboClaims('combo_zeri', data, valid)).toEqual({ valid: true, violations: [] });
    expect(validateComboClaims('combo_zeri', data, [{ tool: 'combo_zeri', kind: 'zeriRange', field: 'scannedDays', value: data.range.scannedDays + 1 }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateComboClaims('combo_zeri', data, [{ tool: 'combo_zeri', kind: 'zeriRankedDay', index: -1, field: 'date', value: '不存在' }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
    expect(validateComboClaims('combo_zeri', data, [{ tool: 'combo_monthly_fortune', kind: 'monthlyMode', value: 'local-exact' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', expected: undefined });
  });

  it('组合：补齐养生、月运和婚配工具的有效、篡改与跨工具 claim', async () => {
    const wellness = await resultData<any>('combo_daily_wellness', 'combo_daily_wellness.success.json');
    const monthly = await resultData<any>('combo_monthly_fortune', 'combo_monthly_fortune.success.json');
    const marriage = await resultData<any>('combo_marriage', 'combo_marriage.success.json');

    expect(validateComboClaims('combo_daily_wellness', wellness, [{ tool: 'combo_daily_wellness', kind: 'wellnessContext', field: 'date', value: wellness.context.date }])).toEqual({ valid: true, violations: [] });
    expect(validateComboClaims('combo_daily_wellness', wellness, [{ tool: 'combo_daily_wellness', kind: 'wellnessContext', field: 'date', value: '1900-01-01' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateComboClaims('combo_daily_wellness', wellness, [{ tool: 'combo_monthly_fortune', kind: 'wellnessContext', field: 'date', value: wellness.context.date } as ComboPresentationClaim]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'combo_daily_wellness', claimTool: 'combo_monthly_fortune' });
    expect(validateComboClaims('combo_daily_wellness', wellness, [{ tool: 'combo_daily_wellness', kind: 'wellnessRecommendation', index: -1, field: 'label', value: '不存在' }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });

    expect(validateComboClaims('combo_monthly_fortune', monthly, [{ tool: 'combo_monthly_fortune', kind: 'monthlyContext', field: 'month', value: monthly.context.month }])).toEqual({ valid: true, violations: [] });
    expect(validateComboClaims('combo_monthly_fortune', monthly, [{ tool: 'combo_monthly_fortune', kind: 'monthlyContext', field: 'month', value: monthly.context.month + 1 }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateComboClaims('combo_monthly_fortune', monthly, [{ tool: 'combo_marriage', kind: 'monthlyContext', field: 'month', value: monthly.context.month } as ComboPresentationClaim]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'combo_monthly_fortune', claimTool: 'combo_marriage' });

    expect(validateComboClaims('combo_marriage', marriage, [{ tool: 'combo_marriage', kind: 'marriageScene', value: marriage.scene }])).toEqual({ valid: true, violations: [] });
    expect(validateComboClaims('combo_marriage', marriage, [{ tool: 'combo_marriage', kind: 'marriageScene', value: marriage.scene === '婚恋' ? '合伙' : '婚恋' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateComboClaims('combo_marriage', marriage, [{ tool: 'combo_annual_fortune', kind: 'marriageScene', value: marriage.scene } as ComboPresentationClaim]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'combo_marriage', claimTool: 'combo_annual_fortune' });
  });

  it('日用：接受真实姓名与喜用 claim，拒绝篡改、数组顺序变化和跨工具 claim', async () => {
    const name = await resultData<any>('analyze_name', 'analyze_name.success.json');
    const xiyong = await resultData<any>('calc_xiyong', 'calc_xiyong.success.json');
    const valid: DailyPresentationClaim[] = [
      { tool: 'analyze_name', kind: 'nameRating', field: 'totalScore', value: name.totalScore },
      { tool: 'analyze_name', kind: 'nameDimension', name: name.dimensions[0].name, field: 'score', value: name.dimensions[0].score },
    ];

    expect(validateDailyClaims('analyze_name', name, valid)).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('analyze_name', name, [{ tool: 'analyze_name', kind: 'nameRating', field: 'totalScore', value: name.totalScore + 1 }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDailyClaims('calc_xiyong', xiyong, [{ tool: 'calc_xiyong', kind: 'xiyongElements', group: 'similar', value: [...xiyong.similar].reverse() }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDailyClaims('analyze_name', name, [{ tool: 'analyze_name', kind: 'nameDimension', name: '不存在', field: 'score', value: 1 }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
    expect(validateDailyClaims('analyze_name', name, [{ tool: 'calc_xiyong', kind: 'xiyong', field: 'shen', value: '金' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', expected: undefined });
  });

  it('日用：补齐体质倾向、解梦和测字工具分支', async () => {
    const tendency = await resultData<any>('get_constitution_tendency', 'get_constitution_tendency.success.json');
    const dream = await resultData<any>('dream_interpret', 'dream_interpret.success.json');
    const cezi = await resultData<any>('cast_cezi', 'cast_cezi.success.json');

    expect(validateDailyClaims('get_constitution_tendency', tendency, [{ tool: 'get_constitution_tendency', kind: 'constitutionTendency', index: 0, field: 'type', value: tendency.tendencies[0].type }])).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('get_constitution_tendency', tendency, [{ tool: 'get_constitution_tendency', kind: 'constitutionTendency', index: 0, field: 'type', value: '不存在' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDailyClaims('get_constitution_tendency', tendency, [{ tool: 'dream_interpret', kind: 'dreamSearch', field: 'hit', value: true }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'get_constitution_tendency', claimTool: 'dream_interpret' });
    expect(validateDailyClaims('get_constitution_tendency', tendency, [{ tool: 'get_constitution_tendency', kind: 'constitutionTendency', index: -1, field: 'type', value: '不存在' }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });

    expect(validateDailyClaims('dream_interpret', dream, [{ tool: 'dream_interpret', kind: 'dreamEntry', index: 0, field: 'title', value: dream.entries[0].title }])).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('dream_interpret', dream, [{ tool: 'dream_interpret', kind: 'dreamEntry', index: 0, field: 'title', value: '不存在' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDailyClaims('dream_interpret', dream, [{ tool: 'cast_cezi', kind: 'cezi', field: 'char', value: cezi.char }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'dream_interpret', claimTool: 'cast_cezi' });
    expect(validateDailyClaims('dream_interpret', dream, [{ tool: 'dream_interpret', kind: 'dreamEntry', index: -1, field: 'title', value: '不存在' }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });

    expect(validateDailyClaims('cast_cezi', cezi, [{ tool: 'cast_cezi', kind: 'cezi', field: 'char', value: cezi.char }])).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('cast_cezi', cezi, [{ tool: 'cast_cezi', kind: 'cezi', field: 'char', value: `${cezi.char}错` }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDailyClaims('cast_cezi', cezi, [{ tool: 'calc_chenguz', kind: 'chenguzVersion', field: 'id', value: 'standard' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'cast_cezi', claimTool: 'calc_chenguz' });
  });

  it('日用：补齐称骨、节律和体质评估工具分支', async () => {
    const chenguz = await resultData<any>('calc_chenguz', 'calc_chenguz.success.json');
    const rhythm = await resultData<any>('get_daily_rhythm', 'get_daily_rhythm.success.json');
    const assessment = await resultData<any>('assess_constitution', 'assess_constitution.success.json');

    expect(validateDailyClaims('calc_chenguz', chenguz, [{ tool: 'calc_chenguz', kind: 'chenguzTotal', field: 'text', value: chenguz.totalText }])).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('calc_chenguz', chenguz, [{ tool: 'calc_chenguz', kind: 'chenguzTotal', field: 'text', value: '错' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDailyClaims('calc_chenguz', chenguz, [{ tool: 'get_daily_rhythm', kind: 'rhythm', field: 'date', value: '1900-01-01' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'calc_chenguz', claimTool: 'get_daily_rhythm' });

    expect(validateDailyClaims('get_daily_rhythm', rhythm, [{ tool: 'get_daily_rhythm', kind: 'rhythm', field: 'date', value: rhythm.date }])).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('get_daily_rhythm', rhythm, [{ tool: 'get_daily_rhythm', kind: 'rhythm', field: 'date', value: '1900-01-01' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDailyClaims('get_daily_rhythm', rhythm, [{ tool: 'assess_constitution', kind: 'constitution', field: 'dominantType', value: '平和质' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'get_daily_rhythm', claimTool: 'assess_constitution' });

    expect(validateDailyClaims('assess_constitution', assessment, [{ tool: 'assess_constitution', kind: 'constitution', field: 'dominantType', value: assessment.dominantType }])).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('assess_constitution', assessment, [{ tool: 'assess_constitution', kind: 'constitution', field: 'dominantType', value: '不存在' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDailyClaims('assess_constitution', assessment, [{ tool: 'analyze_name', kind: 'nameRating', field: 'grade', value: 'A' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'assess_constitution', claimTool: 'analyze_name' });
  });

  it('占测：接受真实六爻 claim，拒绝篡改、越界选择器和跨工具 claim', async () => {
    const data = await resultData<any>('cast_liuyao', 'cast_liuyao.success.json');
    const valid: DivinationPresentationClaim[] = [
      { tool: 'cast_liuyao', kind: 'hexagram', field: 'name', value: data.hexagramName },
      { tool: 'cast_liuyao', kind: 'yao', field: 'changingYao', value: data.changingYao.join('、') },
    ];

    expect(validateDivinationClaims('cast_liuyao', data, valid)).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('cast_liuyao', data, [{ tool: 'cast_liuyao', kind: 'hexagram', field: 'name', value: '错卦' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDivinationClaims('arrange_qimen', await resultData<any>('arrange_qimen', 'arrange_qimen.success.json'), [{ tool: 'arrange_qimen', kind: 'palace', position: -1, field: 'gate', value: '开门' }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
    expect(validateDivinationClaims('cast_liuyao', data, [{ tool: 'cast_meihua', kind: 'yao', field: 'changingLine', value: 1 }]).violations[0]).toMatchObject({ code: 'tool-mismatch', expected: undefined });
  });

  it('占测：补齐梅花与奇门工具分支', async () => {
    const meihua = await resultData<any>('cast_meihua', 'cast_meihua.success.json');
    const qimen = await resultData<any>('arrange_qimen', 'arrange_qimen.success.json');

    expect(validateDivinationClaims('cast_meihua', meihua, [{ tool: 'cast_meihua', kind: 'hexagram', field: 'name', value: meihua.hexagramName }])).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('cast_meihua', meihua, [{ tool: 'cast_meihua', kind: 'hexagram', field: 'name', value: '错卦' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDivinationClaims('cast_meihua', meihua, [{ tool: 'arrange_qimen', kind: 'basic', field: 'dun', value: '阳遁' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'cast_meihua', claimTool: 'arrange_qimen' });

    expect(validateDivinationClaims('arrange_qimen', qimen, [{ tool: 'arrange_qimen', kind: 'basic', field: 'dun', value: qimen.dun }])).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('arrange_qimen', qimen, [{ tool: 'arrange_qimen', kind: 'basic', field: 'dun', value: '错局' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDivinationClaims('arrange_qimen', qimen, [{ tool: 'liuren_calculate', kind: 'basic', field: 'jieqi', value: '夏至' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'arrange_qimen', claimTool: 'liuren_calculate' });
    expect(validateDivinationClaims('arrange_qimen', qimen, [{ tool: 'arrange_qimen', kind: 'palace', position: -1, field: 'gate', value: '开门' }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
  });

  it('占测：补齐大六壬、太乙和皇极工具分支', async () => {
    const liuren = await resultData<any>('liuren_calculate', 'liuren_calculate.success.json');
    const taiyi = await resultData<any>('taiyi_calculate', 'taiyi_calculate.success.json');
    const huangji = await resultData<any>('huangji_calculate', 'huangji_calculate.success.json');

    expect(validateDivinationClaims('liuren_calculate', liuren, [{ tool: 'liuren_calculate', kind: 'basic', field: 'jieqi', value: liuren.basicInfo.jieqi }])).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('liuren_calculate', liuren, [{ tool: 'liuren_calculate', kind: 'basic', field: 'jieqi', value: '不存在' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDivinationClaims('liuren_calculate', liuren, [{ tool: 'taiyi_calculate', kind: 'basic', field: 'yearGz', value: '甲子' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'liuren_calculate', claimTool: 'taiyi_calculate' });
    expect(validateDivinationClaims('liuren_calculate', liuren, [{ tool: 'liuren_calculate', kind: 'sike', position: 1, field: 'shangShen', value: liuren.siKe.list.find((item: any) => item.position === 1)?.shangShen ?? '' }])).toEqual({ valid: true, violations: [] });

    expect(validateDivinationClaims('taiyi_calculate', taiyi, [{ tool: 'taiyi_calculate', kind: 'basic', field: 'yearGz', value: taiyi.basicInfo.yearGz }])).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('taiyi_calculate', taiyi, [{ tool: 'taiyi_calculate', kind: 'basic', field: 'yearGz', value: '错' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDivinationClaims('taiyi_calculate', taiyi, [{ tool: 'huangji_calculate', kind: 'lunarMonth', value: 1 }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'taiyi_calculate', claimTool: 'huangji_calculate' });

    expect(validateDivinationClaims('huangji_calculate', huangji, [{ tool: 'huangji_calculate', kind: 'cycle', field: 'hui', value: huangji.cycles.hui }])).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('huangji_calculate', huangji, [{ tool: 'huangji_calculate', kind: 'cycle', field: 'hui', value: huangji.cycles.hui + 1 }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDivinationClaims('huangji_calculate', huangji, [{ tool: 'cast_liuyao', kind: 'hexagram', field: 'name', value: '乾为天' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'huangji_calculate', claimTool: 'cast_liuyao' });
    expect(validateDivinationClaims('huangji_calculate', huangji, [{ tool: 'huangji_calculate', kind: 'gua', layer: 'year', value: huangji.gua.year }])).toEqual({ valid: true, violations: [] });
  });

  it('数值断言：接受真实嵌套数值，拒绝篡改、非法路径、数组越界和跨工具', async () => {
    const data = await resultData<any>('calc_feixing', 'calc_feixing.success.json');
    const result = { data };
    const path = 'data.center.centerStar';

    expect(validateNumericAssertionClaims('calc_feixing', result, [{ tool: 'calc_feixing', path, value: data.center.centerStar }])).toEqual({ valid: true, violations: [] });
    expect(validateNumericAssertionClaims('calc_feixing', result, [{ path, value: data.center.centerStar + 1 }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateNumericAssertionClaims('calc_feixing', result, [{ path: 'center.centerStar', value: data.center.centerStar }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
    expect(validateNumericAssertionClaims('calc_feixing', result, [{ path: 'data.grid.99.starNum', value: 1 }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
    expect(validateNumericAssertionClaims('calc_feixing', result, [{ tool: 'calc_bazhai', path, value: data.center.centerStar }]).violations[0]).toMatchObject({
      code: 'tool-mismatch',
      expected: undefined,
      message: '该凭证属于 calc_bazhai，不能校验 calc_feixing 的数值断言。',
    });
  });

  it('共享 violation 契约保留目标工具、索引、种类和实际值', async () => {
    const data = await resultData<any>('calc_feixing', 'calc_feixing.success.json');
    const result = { data };
    const path = 'data.center.centerStar';

    expect(validateNumericAssertionClaims('calc_feixing', result, [{ path, value: data.center.centerStar + 1 }]).violations[0]).toMatchObject({
      index: 0, tool: 'calc_feixing', kind: 'numericAssertion', code: 'value-mismatch', actual: data.center.centerStar + 1,
    });
    expect(validateNumericAssertionClaims('calc_feixing', result, [{ path: 'data.grid.99.starNum', value: 1 }]).violations[0]).toMatchObject({
      index: 0, tool: 'calc_feixing', kind: 'numericAssertion', code: 'selector-not-found', actual: 1, expected: undefined,
    });
    expect(validateNumericAssertionClaims('calc_feixing', result, [{ tool: 'calc_bazhai', path, value: data.center.centerStar }]).violations[0]).toMatchObject({
      index: 0, tool: 'calc_feixing', claimTool: 'calc_bazhai', kind: 'numericAssertion', code: 'tool-mismatch', actual: data.center.centerStar,
    });
  });
});
