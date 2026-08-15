/**
 * meridianClock — 子午流注十二时辰经络数据（共享）
 *
 * 子午流注：12 时辰对应 12 经络，气血当令时段养护对应脏腑效果最佳。
 * 数据源自《黄帝内经》经络学说，为传统中医养生参考。
 *
 * 从 RhythmWorkspace 提取为共享模块，供：
 *  - RhythmWorkspace / MeridianClock SVG 渲染
 *  - jieqiWellness / comboEngine 取当前时辰经络
 *  - combo_daily_wellness 本地工具
 */

export interface MeridianHour {
  /** 时辰名（子时/丑时/...） */
  name: string;
  /** 时段显示 */
  time: string;
  /** 小时范围（起-止，跨午夜用 start>end 表示） */
  hours: string;
  /** 当令经络 */
  meridian: string;
  /** 对应脏腑 */
  organ: string;
  /** 生理活动 */
  function: string;
  /** 通用养生建议 */
  advice: string;
  /** 五行 */
  wuxing: string;
}

export const MERIDIAN_HOURS: MeridianHour[] = [
  { name: '子时', time: '23:00 - 01:00', hours: '23-1', meridian: '胆经', organ: '胆', function: '胆汁代谢，阳气初生', advice: '深度睡眠，养胆气', wuxing: '水' },
  { name: '丑时', time: '01:00 - 03:00', hours: '1-3', meridian: '肝经', organ: '肝', function: '肝血回流，解毒修复', advice: '熟睡养肝，忌熬夜', wuxing: '木' },
  { name: '寅时', time: '03:00 - 05:00', hours: '3-5', meridian: '肺经', organ: '肺', function: '气血重新分配', advice: '深度睡眠，养肺气', wuxing: '金' },
  { name: '卯时', time: '05:00 - 07:00', hours: '5-7', meridian: '大肠经', organ: '大肠', function: '排毒排便，阳气上升', advice: '起床排便，喝温水', wuxing: '金' },
  { name: '辰时', time: '07:00 - 09:00', hours: '7-9', meridian: '胃经', organ: '胃', function: '消化吸收，气血旺盛', advice: '吃早餐，易消化', wuxing: '土' },
  { name: '巳时', time: '09:00 - 11:00', hours: '9-11', meridian: '脾经', organ: '脾', function: '运化水谷，生化气血', advice: '工作学习，忌久坐', wuxing: '土' },
  { name: '午时', time: '11:00 - 13:00', hours: '11-13', meridian: '心经', organ: '心', function: '血液循环，阳气最盛', advice: '午餐小憩，养心气', wuxing: '火' },
  { name: '未时', time: '13:00 - 15:00', hours: '13-15', meridian: '小肠经', organ: '小肠', function: '分清泌浊，吸收营养', advice: '适度活动，助消化', wuxing: '火' },
  { name: '申时', time: '15:00 - 17:00', hours: '15-17', meridian: '膀胱经', organ: '膀胱', function: '排毒代谢，精力下降', advice: '多喝水，适度运动', wuxing: '水' },
  { name: '酉时', time: '17:00 - 19:00', hours: '17-19', meridian: '肾经', organ: '肾', function: '藏精蓄锐，准备休养', advice: '晚餐清淡，忌过劳', wuxing: '水' },
  { name: '戌时', time: '19:00 - 21:00', hours: '19-21', meridian: '心包经', organ: '心包', function: '保护心脏，情绪平稳', advice: '放松身心，忌激动', wuxing: '火' },
  { name: '亥时', time: '21:00 - 23:00', hours: '21-23', meridian: '三焦经', organ: '三焦', function: '通调水道，准备入眠', advice: '准备睡觉，忌熬夜', wuxing: '水' },
];

/** 五行颜色映射 */
export const WUXING_COLORS: Record<string, string> = {
  '金': 'var(--wz-metal)',
  '木': 'var(--wz-wood)',
  '水': 'var(--wz-water)',
  '火': 'var(--wz-fire)',
  '土': 'var(--wz-earth)',
};

/** 按小时（0-23）取当令时辰经络 */
export function getMeridianByHour(hour: number): MeridianHour | null {
  return MERIDIAN_HOURS.find((sc) => {
    const [start, end] = sc.hours.split('-').map(Number);
    if (start > end) return hour >= start || hour < end; // 跨午夜（子时 23-1）
    return hour >= start && hour < end;
  }) ?? null;
}
