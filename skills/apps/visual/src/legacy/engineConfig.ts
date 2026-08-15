export type ShenShaTrineSource = 'year' | 'day';

export interface ResolvedBaziEngineConfig {
  calendarMode: 'exact' | 'approx';
  shenShaTrineSource: ShenShaTrineSource;
  dayBoundaryRule: 'zi-chu-next-day';
  luckStartMethod: 'lunar-solar-terms' | 'three-years-approx';
}

export interface ResolvedZiweiEngineConfig {
  provider: 'iztro@2.5.8';
  transit: { year: number; month: number; day: 15 };
  hourRule: '23:00-23:59=>early-zi';
  palaceNameNormalization: '仆役→交友';
  enabledDynamicLayers: ['decadal', 'yearly', 'monthly', 'age'];
}

export function resolveBaziEngineConfig(input: {
  mode: 'local-exact' | 'local-approx';
  shenShaTrineSource?: ShenShaTrineSource;
  hasExactLuck: boolean;
}): ResolvedBaziEngineConfig {
  return {
    calendarMode: input.mode === 'local-exact' ? 'exact' : 'approx',
    shenShaTrineSource: input.shenShaTrineSource ?? 'year',
    dayBoundaryRule: 'zi-chu-next-day',
    luckStartMethod: input.hasExactLuck ? 'lunar-solar-terms' : 'three-years-approx',
  };
}

export function resolveZiweiEngineConfig(transit: { year: number; month: number }): ResolvedZiweiEngineConfig {
  return {
    provider: 'iztro@2.5.8',
    transit: { ...transit, day: 15 },
    hourRule: '23:00-23:59=>early-zi',
    palaceNameNormalization: '仆役→交友',
    enabledDynamicLayers: ['decadal', 'yearly', 'monthly', 'age'],
  };
}

export interface ResolvedFeixingEngineConfig {
  annualCenterStarAnchor: { year: 1984; star: 7 };
  flightOrder: '中→乾→兑→艮→离→坎→坤→震→巽';
  yuanYun: { startYear: 1864; cycleYears: 20 };
  mingGuaRule: 'birth-year-gender';
}

export interface ResolvedBazhaiEngineConfig {
  mingGuaRule: 'birth-year-gender';
  directionsRule: 'eight-mansions-dayou-nian';
  taisuiRule: 'gregorian-year-branch';
}

export interface ResolvedAlmanacEngineConfig {
  provider: 'lunar-typescript';
  calendarMode: 'exact-gregorian-lunar';
  hourRangeRule: '子时23-1';
}

export function resolveFeixingEngineConfig(): ResolvedFeixingEngineConfig {
  return {
    annualCenterStarAnchor: { year: 1984, star: 7 },
    flightOrder: '中→乾→兑→艮→离→坎→坤→震→巽',
    yuanYun: { startYear: 1864, cycleYears: 20 },
    mingGuaRule: 'birth-year-gender',
  };
}

export function resolveBazhaiEngineConfig(): ResolvedBazhaiEngineConfig {
  return {
    mingGuaRule: 'birth-year-gender',
    directionsRule: 'eight-mansions-dayou-nian',
    taisuiRule: 'gregorian-year-branch',
  };
}

export function resolveAlmanacEngineConfig(): ResolvedAlmanacEngineConfig {
  return {
    provider: 'lunar-typescript',
    calendarMode: 'exact-gregorian-lunar',
    hourRangeRule: '子时23-1',
  };
}
