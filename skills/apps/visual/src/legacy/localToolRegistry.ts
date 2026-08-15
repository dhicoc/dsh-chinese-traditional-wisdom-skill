export const LOCAL_TOOL_REGISTRY = {
  resolve_true_solar_time: {},
  bazi_calculate: {},
  ziwei_chart: {},
  calc_feixing: {},
  calc_bazhai: {},
  cast_liuyao: {},
  arrange_qimen: {},
  liuren_calculate: {},
  taiyi_calculate: {},
  cast_meihua: {},
  xingxiu_daily: {},
  calc_yunqi: {},
  calc_chenguz: {},
  get_almanac: {},
  get_daily_rhythm: {},
  calc_xiyong: {},
  dream_interpret: {},
  analyze_name: {},
  cast_cezi: {},
  huangji_calculate: {},
  get_constitution_tendency: {},
  assess_constitution: {},
  list_constitution_questionnaire: {},
  combo_annual_fortune: {},
  combo_monthly_fortune: {},
  combo_daily_wellness: {},
  combo_decision: {},
  combo_space_time: {},
  combo_sanshi: {},
  combo_sanshi_classic: {},
  combo_zeri: {},
  combo_marriage: {},
} as const;

export type LocalToolName = keyof typeof LOCAL_TOOL_REGISTRY;

export const LOCAL_TOOL_NAMES = Object.keys(LOCAL_TOOL_REGISTRY) as LocalToolName[];

export function isLocalToolName(tool: string): tool is LocalToolName {
  return Object.prototype.hasOwnProperty.call(LOCAL_TOOL_REGISTRY, tool);
}
