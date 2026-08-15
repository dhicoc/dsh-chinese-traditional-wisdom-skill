import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runLocalTool } from '@/legacy/directRunner';
import { LocalToolError } from '@/legacy/localToolErrors';
import { LOCAL_TOOL_NAMES, parseLocalToolInput } from '@/legacy/toolContracts';
import { NESTED_WHITELIST_CASES, SUCCESS_TOOL_FIXTURES } from './localToolMatrix';

const fixtureDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../__fixtures__/local-tools',
);

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(fixtureDir, name), 'utf8'));
}

type SuccessCase = {
  tool: string;
  name: string;
  assert: (result: any) => void;
};

const successCases: SuccessCase[] = [
  {
    tool: 'resolve_true_solar_time',
    name: 'resolve_true_solar_time.success.json',
    assert: (result) => expect(result).toMatchObject({ status: 'resolved', source: 'agent-verified', trueSolarBirth: { hour: 11, minute: 4 } }),
  },
  {
    tool: 'resolve_true_solar_time',
    name: 'resolve_true_solar_time.boundary.json',
    assert: (result) => expect(result).toMatchObject({ crossedShichen: true, crossedZiChu: true }),
  },
  {
    tool: 'resolve_true_solar_time',
    name: 'resolve_true_solar_time.cross-date.success.json',
    assert: (result) => expect(result).toMatchObject({
      crossedDate: true,
      trueSolarBirth: { year: 1990, month: 6, day: 14, hour: 12, minute: 10 },
    }),
  },
  {
    tool: 'resolve_true_solar_time',
    name: 'resolve_true_solar_time.shichen-zi-chu.success.json',
    assert: (result) => expect(result).toMatchObject({
      crossedShichen: true,
      crossedZiChu: true,
      trueSolarBirth: { hour: 23, minute: 5 },
    }),
  },
  {
    tool: 'bazi_calculate',
    name: 'bazi_calculate.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { timeSource: { timeBasis: 'civil-unverified' } } }),
  },
  {
    tool: 'bazi_calculate',
    name: 'bazi_calculate.civil-fallback.success.json',
    assert: (result) => expect(result).toMatchObject({
      ok: true,
      data: { timeSource: { timeBasis: 'civil-unverified', notice: '未完成真太阳时复核' } },
    }),
  },
  {
    tool: 'bazi_calculate',
    name: 'bazi_calculate.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { shenShaTrineSource: 'day', pillars: { hour: { branch: '子' } } } }),
  },
  {
    tool: 'bazi_calculate',
    name: 'bazi_calculate.transit.success.json',
    assert: (result) => expect(result).toMatchObject({
      ok: true,
      input_normalized: { transitDate: '2025-07-15' },
      data: { transit: { targetDate: '2025-07-15', available: true, minor: { nominalAge: 36 } } },
      result_meta: { calculationConfig: { shenShaTrineSource: 'year', dynamicLayer: { enabled: true, targetDate: '2025-07-15', minorFortuneAgeBasis: 'nominal-age' } } },
    }),
  },
  {
    tool: 'bazi_calculate',
    name: 'bazi_calculate.transit.boundary.json',
    assert: (result) => expect(result).toMatchObject({
      ok: true,
      input_normalized: { transitDate: '2026-02-04' },
      data: { transit: { targetDate: '2026-02-04', available: true } },
      result_meta: { calculationConfig: { shenShaTrineSource: 'day', dynamicLayer: { enabled: true, targetDate: '2026-02-04', minorFortuneAgeBasis: 'nominal-age' } } },
    }),
  },
  {
    tool: 'ziwei_chart',
    name: 'ziwei_chart.success.json',
    assert: (result) => expect(result).toMatchObject({
      ok: true,
      data: { mode: 'local-exact', birthInfo: { gender: '男' } },
      result_meta: { calculationConfig: { transit: { year: 2025, month: 7, day: 15 }, hourRule: '23:00-23:59=>early-zi', palaceNameNormalization: '仆役→交友', enabledDynamicLayers: ['decadal', 'yearly', 'monthly', 'age'] } },
    }),
  },
  {
    tool: 'ziwei_chart',
    name: 'ziwei_chart.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { mode: 'local-exact', birthInfo: { hour: 23, gender: '女' } } }),
  },
  {
    tool: 'calc_feixing',
    name: 'calc_feixing.success.json',
    assert: (result) => expect(result).toMatchObject({
      ok: true,
      data: { year: 2025, mingGua: { trigram: expect.any(String) } },
      result_meta: { calculationConfig: { annualCenterStarAnchor: { year: 1984, star: 7 }, flightOrder: '中→乾→兑→艮→离→坎→坤→震→巽', yuanYun: { startYear: 1864, cycleYears: 20 }, mingGuaRule: 'birth-year-gender' } },
    }),
  },
  {
    tool: 'calc_feixing',
    name: 'calc_feixing.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { year: 1 }, result_meta: { calculationConfig: { flightOrder: '中→乾→兑→艮→离→坎→坤→震→巽' } } }),
  },
  {
    tool: 'calc_bazhai',
    name: 'calc_bazhai.success.json',
    assert: (result) => expect(result).toMatchObject({
      ok: true,
      data: { mingGua: { trigram: expect.any(String) }, menZhuZao: expect.any(Object) },
      result_meta: { calculationConfig: { mingGuaRule: 'birth-year-gender', directionsRule: 'eight-mansions-dayou-nian', taisuiRule: 'gregorian-year-branch' } },
    }),
  },
  {
    tool: 'calc_bazhai',
    name: 'calc_bazhai.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { taisui: expect.any(Object) }, result_meta: { calculationConfig: { taisuiRule: 'gregorian-year-branch' } } }),
  },
  {
    tool: 'cast_liuyao',
    name: 'cast_liuyao.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { hexagramName: '天风姤', changingYao: [1] } }),
  },
  {
    tool: 'cast_liuyao',
    name: 'cast_liuyao.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { hexagramName: '乾为天', changingYao: [] } }),
  },
  {
    tool: 'arrange_qimen',
    name: 'arrange_qimen.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { mode: 'local-exact', dun: '阳遁', ju: '4局', palaces: expect.any(Array) } }),
  },
  {
    tool: 'arrange_qimen',
    name: 'arrange_qimen.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { mode: 'local-exact', timeInfo: { yearGZ: '甲辰', monthGZ: '丁卯', dayGZ: '戊寅', hourGZ: '丁巳' } } }),
  },
  {
    tool: 'liuren_calculate',
    name: 'liuren_calculate.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { school: 'classic', siKe: { list: expect.any(Array) } } }),
  },
  {
    tool: 'liuren_calculate',
    name: 'liuren_calculate.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { school: 'gufa' } }),
  },
  {
    tool: 'taiyi_calculate',
    name: 'taiyi_calculate.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { basicInfo: { jiStyleName: '年计', acumYearName: '太乙统宗' } } }),
  },
  {
    tool: 'taiyi_calculate',
    name: 'taiyi_calculate.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { basicInfo: { jiStyleName: '分计', acumYearName: '太乙局' } } }),
  },
  {
    tool: 'cast_meihua',
    name: 'cast_meihua.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { upperTrigram: { name: '离' }, lowerTrigram: { name: '坤' }, changingLine: 2, sourceMethod: '数字起卦' } }),
  },
  {
    tool: 'cast_meihua',
    name: 'cast_meihua.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { mode: 'local-exact', sourceMethod: expect.stringContaining('农历') } }),
  },
  {
    tool: 'xingxiu_daily',
    name: 'xingxiu_daily.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { queryDate: '2024-03-15', method: '连续轮转法', allXiu: expect.any(Array) } }),
  },
  {
    tool: 'xingxiu_daily',
    name: 'xingxiu_daily.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { queryDate: '2024-02-29', method: '日支星期查表法', mode: 'local-exact' } }),
  },
  {
    tool: 'calc_yunqi',
    name: 'calc_yunqi.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { tiangan: '甲', dizhi: '辰', liuqi: { current_step: { step: '三之气' } } } }),
  },
  {
    tool: 'calc_yunqi',
    name: 'calc_yunqi.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { year: 2023, yearBoundary: expect.stringContaining('2023年运气'), liuqi: { current_step: { step: '终之气' } } } }),
  },
  {
    tool: 'calc_chenguz',
    name: 'calc_chenguz.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { versionId: 'standard', totalText: expect.any(String), timeSource: { timeBasis: 'civil-unverified' } } }),
  },
  {
    tool: 'calc_chenguz',
    name: 'calc_chenguz.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { versionId: 'folk', versionName: expect.any(String), timeSource: { timeBasis: 'civil-unverified' } } }),
  },
  {
    tool: 'get_almanac',
    name: 'get_almanac.success.json',
    assert: (result) => expect(result).toMatchObject({
      ok: true,
      data: { solarDate: expect.stringContaining('2024年2月10日'), hours: expect.any(Array) },
      result_meta: { calculationConfig: { provider: 'lunar-typescript', calendarMode: 'exact-gregorian-lunar', hourRangeRule: '子时23-1' } },
    }),
  },
  {
    tool: 'get_almanac',
    name: 'get_almanac.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { solarDate: expect.stringContaining('2024年2月29日') }, result_meta: { calculationConfig: { calendarMode: 'exact-gregorian-lunar' } } }),
  },
  {
    tool: 'get_daily_rhythm',
    name: 'get_daily_rhythm.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { date: '2024-07-24', meridian: { meridian: expect.any(String) } } }),
  },
  {
    tool: 'get_daily_rhythm',
    name: 'get_daily_rhythm.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { date: '2024-02-29', meridian: { meridian: expect.any(String) } } }),
  },
  {
    tool: 'calc_xiyong',
    name: 'calc_xiyong.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { dayMasterWuxing: '金', qiangRuo: '身弱', shen: '金', similarPoint: 6, heterogeneousPoint: 14 } }),
  },
  {
    tool: 'calc_xiyong',
    name: 'calc_xiyong.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { qiangRuo: '平衡', shen: '水', similarPoint: 2, heterogeneousPoint: 2 } }),
  },
  {
    tool: 'dream_interpret',
    name: 'dream_interpret.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, input_normalized: { keyword: '蛇', useFull: false }, data: { hit: true, entries: expect.any(Array) } }),
  },
  {
    tool: 'dream_interpret',
    name: 'dream_interpret.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { hit: false } }),
  },
  {
    tool: 'analyze_name',
    name: 'analyze_name.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { totalScore: expect.any(Number), grade: expect.any(String), dimensions: expect.any(Array) } }),
  },
  {
    tool: 'analyze_name',
    name: 'analyze_name.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { timeSource: { timeBasis: 'civil-unverified' } } }),
  },
  {
    tool: 'cast_cezi',
    name: 'cast_cezi.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, input_normalized: { char: '明', aspect: '事业', hasBirth: false }, data: { char: '明', strokes: expect.any(Number), baziComplement: null } }),
  },
  {
    tool: 'cast_cezi',
    name: 'cast_cezi.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { char: '江', charWuxing: '水', baziComplement: { complement: expect.any(String) }, timeSource: { timeBasis: 'civil-unverified' } } }),
  },
  {
    tool: 'huangji_calculate',
    name: 'huangji_calculate.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { mode: 'local-exact', cycles: { acumYear: 69007 }, gua: { zheng: '鼎' } } }),
  },
  {
    tool: 'huangji_calculate',
    name: 'huangji_calculate.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { mode: 'local-exact', solarDate: expect.stringContaining('23:59'), gua: { minute: expect.any(String) } } }),
  },
  {
    tool: 'get_constitution_tendency',
    name: 'get_constitution_tendency.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, input_normalized: { dayun: '木运太过', sitian: '厥阴风木', zaquan: '少阳相火' }, data: { tendencies: expect.arrayContaining([expect.objectContaining({ type: '气郁质' })]), engineName: 'ConstitutionTendencyAdapter' } }),
  },
  {
    tool: 'list_constitution_questionnaire',
    name: 'list_constitution_questionnaire.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, input_normalized: {}, data: { groups: expect.any(Array) }, summary: [expect.stringContaining('8 组、52 题')] }),
  },
  {
    tool: 'list_constitution_questionnaire',
    name: 'list_constitution_questionnaire.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { groups: expect.arrayContaining([{ type: '气虚质', questions: expect.any(Array) }]) } }),
  },
  {
    tool: 'assess_constitution',
    name: 'assess_constitution.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, input_normalized: { answerCount: 52, dominantType: '平和质' }, data: { dominantType: '平和质', scores: { 平和质: 100 }, tone: '吉' } }),
  },
  {
    tool: 'combo_annual_fortune',
    name: 'combo_annual_fortune.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, tool: 'AnnualFortuneComboEngine', data: { comboName: '年度综合运势', context: { targetYear: 2026 }, subsystems: expect.any(Array), timeSource: { timeBasis: 'civil-unverified' } } }),
  },
  {
    tool: 'combo_annual_fortune',
    name: 'combo_annual_fortune.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { context: { targetYear: 1990 }, timeSource: { timeBasis: 'civil-unverified' } } }),
  },
  {
    tool: 'combo_monthly_fortune',
    name: 'combo_monthly_fortune.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, tool: 'MonthlyFortuneComboEngine', data: { comboName: '月度运势', context: { year: 2026, month: 8, jieqi: expect.any(String) }, subsystems: expect.any(Array), timeSource: { timeBasis: 'civil-unverified' } } }),
  },
  {
    tool: 'combo_monthly_fortune',
    name: 'combo_monthly_fortune.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { context: { year: 2026, month: 1 }, timeSource: { timeBasis: 'civil-unverified' } } }),
  },
  {
    tool: 'combo_daily_wellness',
    name: 'combo_daily_wellness.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, tool: 'DailyWellnessComboEngine', data: { comboName: '今日养生建议', context: { date: '2026年8月10日', shichen: expect.any(String) }, constitution: { type: '气虚质', source: '问卷' }, timeSource: { timeBasis: 'civil-unverified' } } }),
  },
  {
    tool: 'combo_daily_wellness',
    name: 'combo_daily_wellness.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { context: { date: '2026年8月10日', shichen: '子时' }, constitution: { source: '五运六气倾向参考' }, timeSource: { timeBasis: 'civil-unverified' } } }),
  },
  {
    tool: 'combo_decision',
    name: 'combo_decision.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, tool: 'DecisionComboEngine', input_normalized: { seed: 20260810 }, data: { comboName: '事件决策', subsystems: expect.any(Array) } }),
  },
  {
    tool: 'combo_decision',
    name: 'combo_decision.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, input_normalized: { birth: { hour: 23, minute: 59 } }, data: { comboName: '事件决策' } }),
  },
  {
    tool: 'combo_space_time',
    name: 'combo_space_time.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, tool: 'SpaceTimeComboEngine', data: { comboName: '空间+时间', inputs: { targetYear: 2026 } } }),
  },
  {
    tool: 'combo_space_time',
    name: 'combo_space_time.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { comboName: '空间+时间', inputs: { targetYear: 1990 } } }),
  },
  {
    tool: 'combo_sanshi',
    name: 'combo_sanshi.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, tool: 'SanshiComboEngine', input_normalized: { liurenSchool: 'gufa' }, data: { comboName: '三式互参', subsystems: expect.arrayContaining([expect.objectContaining({ name: '大六壬', envelope: expect.objectContaining({ data: expect.objectContaining({ school: 'gufa' }) }) })]) } }),
  },
  {
    tool: 'combo_sanshi',
    name: 'combo_sanshi.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, input_normalized: { liurenSchool: 'classic' }, data: { comboName: '三式互参' } }),
  },
  {
    tool: 'combo_sanshi_classic',
    name: 'combo_sanshi_classic.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, tool: 'SanshiClassicComboEngine', input_normalized: { liurenSchool: 'gufa', taiyiJiStyle: 1, taiyiAcumYear: 2 }, data: { comboName: '三式合一', subsystems: expect.any(Array) } }),
  },
  {
    tool: 'combo_sanshi_classic',
    name: 'combo_sanshi_classic.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, input_normalized: { liurenSchool: 'classic', taiyiJiStyle: 0, taiyiAcumYear: 0 }, data: { comboName: '三式合一' } }),
  },
  {
    tool: 'combo_zeri',
    name: 'combo_zeri.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, tool: 'ZeriComboEngine', data: { comboName: '综合择日', range: { scannedDays: 31 }, rankedDays: expect.any(Array) } }),
  },
  {
    tool: 'combo_zeri',
    name: 'combo_zeri.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { range: { start: '2024-02-29', end: '2024-02-29', scannedDays: 1 } } }),
  },
  {
    tool: 'combo_marriage',
    name: 'combo_marriage.success.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, tool: 'combo_marriage', data: { comboName: '合婚配对', scene: '婚恋', nameMatch: expect.any(Number), timeSource: { personA: { timeBasis: 'civil-unverified' }, personB: { timeBasis: 'civil-unverified' } } } }),
  },
  {
    tool: 'combo_marriage',
    name: 'combo_marriage.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: true, data: { comboName: '合婚配对', scene: '婚恋', nameMatch: null, timeSource: { personA: { timeBasis: 'civil-unverified' }, personB: { timeBasis: 'civil-unverified' } } } }),
  },
];

type BoundaryCase = {
  tool: string;
  name: string;
  assert: (result: any) => void;
};

const boundaryCases: BoundaryCase[] = [
  {
    tool: 'get_constitution_tendency',
    name: 'get_constitution_tendency.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: false, error: { code: 'insufficient_input' }, input_normalized: { dayun: '', sitian: '', zaquan: '' } }),
  },
  {
    tool: 'assess_constitution',
    name: 'assess_constitution.boundary.json',
    assert: (result) => expect(result).toMatchObject({ ok: false, error: { code: 'NO_ANSWERS' }, input_normalized: { answerCount: 0 } }),
  },
];

describe('local tool input fixtures', () => {
  successCases.forEach(({ tool, name, assert }) => {
    it(`${tool} executes ${name}`, async () => {
      assert(await runLocalTool(tool, await fixture(name)));
    });
  });

  it('keeps the success fixture matrix aligned with local tool contracts', async () => {
    expect(SUCCESS_TOOL_FIXTURES.map(({ tool }) => tool)).toEqual(LOCAL_TOOL_NAMES);
    await Promise.all(SUCCESS_TOOL_FIXTURES.map(({ name }) => fixture(name)));
  });

  SUCCESS_TOOL_FIXTURES.forEach(({ tool, name }) => {
    it(`${tool} strips top-level sentinel fields from parser and Runner output`, async () => {
      const sentinel = `p5-sentinel-${tool}`;
      const input = { ...await fixture(name) as Record<string, unknown>, unexpected: sentinel };

      expect(JSON.stringify(parseLocalToolInput(tool, input))).not.toContain(sentinel);
      expect(JSON.stringify(await runLocalTool(tool, input))).not.toContain(sentinel);
    });
  });

  NESTED_WHITELIST_CASES.forEach(({ tool, inject }) => {
    it(`${tool} strips nested sentinel fields from parser and Runner output`, async () => {
      const sentinel = `p6-sentinel-${tool}`;
      const fixtureCase = SUCCESS_TOOL_FIXTURES.find((candidate) => candidate.tool === tool);
      if (!fixtureCase) throw new Error(`${tool} 缺少成功 fixture。`);
      const input = await fixture(fixtureCase.name) as Record<string, unknown>;
      inject(input, sentinel);

      expect(JSON.stringify(parseLocalToolInput(tool, input))).not.toContain(sentinel);
      expect(JSON.stringify(await runLocalTool(tool, input))).not.toContain(sentinel);
    });
  });

  boundaryCases.forEach(({ tool, name, assert }) => {
    it(`${tool} returns its business boundary for ${name}`, async () => {
      assert(await runLocalTool(tool, await fixture(name)));
    });
  });

  [
    ['resolve_true_solar_time', 'resolve_true_solar_time.failure.json'],
    ['bazi_calculate', 'bazi_calculate.failure.json'],
    ['bazi_calculate', 'bazi_calculate.transit.failure.json'],
    ['ziwei_chart', 'ziwei_chart.failure.json'],
    ['calc_feixing', 'calc_feixing.failure.json'],
    ['calc_bazhai', 'calc_bazhai.failure.json'],
    ['cast_liuyao', 'cast_liuyao.failure.json'],
    ['arrange_qimen', 'arrange_qimen.failure.json'],
    ['liuren_calculate', 'liuren_calculate.failure.json'],
    ['taiyi_calculate', 'taiyi_calculate.failure.json'],
    ['cast_meihua', 'cast_meihua.failure.json'],
    ['xingxiu_daily', 'xingxiu_daily.failure.json'],
    ['calc_yunqi', 'calc_yunqi.failure.json'],
    ['calc_chenguz', 'calc_chenguz.failure.json'],
    ['get_almanac', 'get_almanac.failure.json'],
    ['get_daily_rhythm', 'get_daily_rhythm.failure.json'],
    ['calc_xiyong', 'calc_xiyong.failure.json'],
    ['dream_interpret', 'dream_interpret.failure.json'],
    ['analyze_name', 'analyze_name.failure.json'],
    ['cast_cezi', 'cast_cezi.failure.json'],
    ['huangji_calculate', 'huangji_calculate.failure.json'],
    ['get_constitution_tendency', 'get_constitution_tendency.failure.json'],
    ['assess_constitution', 'assess_constitution.failure.json'],
    ['combo_annual_fortune', 'combo_annual_fortune.failure.json'],
    ['combo_monthly_fortune', 'combo_monthly_fortune.failure.json'],
    ['combo_daily_wellness', 'combo_daily_wellness.failure.json'],
    ['combo_decision', 'combo_decision.failure.json'],
    ['combo_space_time', 'combo_space_time.failure.json'],
    ['combo_sanshi', 'combo_sanshi.failure.json'],
    ['combo_sanshi_classic', 'combo_sanshi_classic.failure.json'],
    ['combo_zeri', 'combo_zeri.failure.json'],
    ['combo_marriage', 'combo_marriage.failure.json'],
  ].forEach(([tool, name]) => {
    it(`${tool} classifies ${name} as invalid input`, async () => {
      await expect(runLocalTool(tool, await fixture(name))).rejects.toBeInstanceOf(LocalToolError);
      await expect(runLocalTool(tool, await fixture(name))).rejects.toMatchObject({
        code: 'INVALID_INPUT',
        tool,
      });
    });
  });
});
