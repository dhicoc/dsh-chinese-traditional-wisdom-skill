/**
 * almanacData — 基于内置 lunar-javascript 的真实每日黄历数据。
 *
 * 替代旧 AlmanacWorkspace 的 seed 伪造数据，统一走 6tail/lunar-javascript
 * 引擎：干支、宜忌、彭祖百忌、吉神凶煞、神位方位、冲煞、时辰吉凶、
 * 纳音星宿等均为真实历法推算。引擎未加载时返回 null，由 UI 显示降级提示。
 */

import type { ToolEnvelope, ExportSnapshot } from './baseTypes';
import { resolveAlmanacEngineConfig } from './engineConfig';

export interface AlmanacTimeHour {
  /** 时辰干支，如「壬子」 */
  ganZhi: string;
  /** 时段名，如「子时」 */
  label: string;
  /** 天神名，如「天刑」 */
  tianShen: string;
  /** 黄道/黑道 */
  tianShenType: string;
  /** 吉 / 凶 */
  luck: string;
  yi: string[];
  ji: string[];
}

export interface AlmanacData {
  /** 公历日期，如「2026年7月8日」 */
  solarDate: string;
  /** 农历日期，如「农历六月初十四」 */
  lunarDate: string;
  /** 年柱 */
  yearGanZhi: string;
  /** 月柱 */
  monthGanZhi: string;
  /** 日柱 */
  dayGanZhi: string;
  /** 生肖 */
  zodiac: string;
  /** 节气（若当日为节气点） */
  jieQi?: string;
  /** 节日 */
  festivals: string[];
  /** 日纳音，如「杨柳木」 */
  dayNaYin: string;
  /** 二十八星宿 */
  dayXiu: string;
  /** 星宿歌诀 */
  dayXiuSong: string;
  /** 日天神，如「玄武」 */
  dayTianShen: string;
  /** 黄道/黑道 */
  dayTianShenType: string;
  /** 宜 */
  yi: string[];
  /** 忌 */
  ji: string[];
  /** 吉神宜趋 */
  jiShen: string[];
  /** 凶煞宜忌 */
  xiongSha: string[];
  /** 彭祖百忌 */
  pengZu: string;
  /** 喜神方位 */
  xiPosition: string;
  /** 福神方位 */
  fuPosition: string;
  /** 财神方位 */
  caiPosition: string;
  /** 阳贵神方位 */
  yangGuiPosition: string;
  /** 阴贵神方位 */
  yinGuiPosition: string;
  /** 冲煞描述 */
  chong: string;
  /** 煞方 */
  sha: string;
  /** 时辰吉凶 */
  hours: AlmanacTimeHour[];
  /** 六曜（赤口/先胜等） */
  liuYao?: string;
  /** 日九星（玄空九星，含 index） */
  dayNineStar?: string;
  /** 数据来源说明 */
  confidenceNote: string;
}

interface LunarLike {
  getYearInGanZhi(): string;
  getMonthInGanZhi(): string;
  getDayInGanZhi(): string;
  getYearShengXiao(): string;
  getDayYi(): string[];
  getDayJi(): string[];
  getDayJiShen(): string[];
  getDayXiongSha(): string[];
  getPengZuGan(): string;
  getPengZuZhi(): string;
  getDayNaYin(): string;
  getXiu(): string;
  getXiuSong(): string;
  getDayTianShen(): string;
  getDayTianShenType(): string;
  getLiuYao?(): string;
  getDayNineStar?(): { toString?: () => string; index?: number };
  getDayPositionXiDesc(): string;
  getDayPositionFuDesc(): string;
  getDayPositionCaiDesc(): string;
  getDayPositionYangGuiDesc(): string;
  getDayPositionYinGuiDesc(): string;
  getDayChongDesc(): string;
  getDaySha(): string;
  getJieQi?(): string;
  getFestivals(): string[];
  getTimes(): LunarTimeLike[];
  getDayInChinese(): string;
  getMonthInChinese(): string;
}

interface LunarTimeLike {
  getGanZhi(): string;
  getZhi(): string;
  getTianShen(): string;
  getTianShenType(): string;
  getTianShenLuck(): string;
  getYi(): string[];
  getJi(): string[];
}

interface SolarLike {
  fromYmd(year: number, month: number, day: number): { getLunar(): LunarLike };
}

interface LegacyWindowWithLunar extends Window {
  Solar?: SolarLike;
}

const ZHI_LABELS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 时辰地支 → 时段名（含时辰范围） */
function hourLabel(zhi: string): string {
  const map: Record<string, string> = {
    子: '子时 23-1', 丑: '丑时 1-3', 寅: '寅时 3-5', 卯: '卯时 5-7',
    辰: '辰时 7-9', 巳: '巳时 9-11', 午: '午时 11-13', 未: '未时 13-15',
    申: '申时 15-17', 酉: '酉时 17-19', 戌: '戌时 19-21', 亥: '亥时 21-23',
  };
  return map[zhi] ?? zhi;
}

/**
 * 取指定公历日期的黄历数据。
 * @param dateStr 公历日期字符串 yyyy-mm-dd
 * @param solar 可选 lunar-javascript Solar 入口；传入时走纯 TS 路径（A 类，可传入 lunar-javascript 的 ESM 版）。
 *              未传时回退读 window.Solar（旧 JS 暴露），两者皆不可用返回 null。
 */
export function getAlmanacData(dateStr: string, solar?: SolarLike | null): AlmanacData | null {
  const solarEntry = solar ?? (() => {
    try {
      if (typeof window !== 'undefined') return (window as LegacyWindowWithLunar).Solar ?? null;
    } catch {
      /* window 不可用 */
    }
    return null;
  })();
  if (!solarEntry) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [year, month, day] = parts;

  let lunar: LunarLike;
  try {
    lunar = solarEntry.fromYmd(year, month, day).getLunar();
  } catch {
    return null;
  }

  try {
    const times = lunar.getTimes() || [];
    const hours: AlmanacTimeHour[] = times.map((t) => {
      const zhi = t.getZhi();
      return {
        ganZhi: t.getGanZhi(),
        label: hourLabel(zhi in ZHI_LABELS ? zhi : zhi),
        tianShen: t.getTianShen(),
        tianShenType: t.getTianShenType(),
        luck: t.getTianShenLuck(),
        yi: t.getYi() || [],
        ji: t.getJi() || [],
      };
    });

    let jieQi: string | undefined;
    if (typeof lunar.getJieQi === 'function') {
      jieQi = lunar.getJieQi() || undefined;
    }

    return {
      solarDate: `${year}年${month}月${day}日`,
      lunarDate: `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
      yearGanZhi: lunar.getYearInGanZhi(),
      monthGanZhi: lunar.getMonthInGanZhi(),
      dayGanZhi: lunar.getDayInGanZhi(),
      zodiac: lunar.getYearShengXiao(),
      jieQi,
      festivals: lunar.getFestivals() || [],
      dayNaYin: lunar.getDayNaYin(),
      dayXiu: lunar.getXiu(),
      dayXiuSong: lunar.getXiuSong(),
      dayTianShen: lunar.getDayTianShen(),
      dayTianShenType: lunar.getDayTianShenType(),
      yi: lunar.getDayYi() || [],
      ji: lunar.getDayJi() || [],
      jiShen: lunar.getDayJiShen() || [],
      xiongSha: lunar.getDayXiongSha() || [],
      pengZu: `${lunar.getPengZuGan()} ${lunar.getPengZuZhi()}`,
      xiPosition: lunar.getDayPositionXiDesc(),
      fuPosition: lunar.getDayPositionFuDesc(),
      caiPosition: lunar.getDayPositionCaiDesc(),
      yangGuiPosition: lunar.getDayPositionYangGuiDesc(),
      yinGuiPosition: lunar.getDayPositionYinGuiDesc(),
      chong: lunar.getDayChongDesc(),
      sha: lunar.getDaySha(),
      hours,
      liuYao: typeof lunar.getLiuYao === 'function' ? lunar.getLiuYao() : undefined,
      dayNineStar: typeof lunar.getDayNineStar === 'function'
        ? (() => {
            try { const n = lunar.getDayNineStar?.(); return n && typeof n.toString === 'function' ? n.toString() : n?.index !== undefined ? String(n.index) : undefined; } catch { return undefined; }
          })()
        : undefined,
      confidenceNote: '宜忌内容为传统民俗参考，不作为决策依据。',
    };
  } catch {
    // 任一 getter 抛错时降级，避免整页黑屏
    return null;
  }
}

// ─── ToolEnvelope 包装（供本地运行器调用）──

export interface AlmanacInput {
  /** 公历日期 yyyy-mm-dd，缺省取今天 */
  date?: string;
  /** 可选 lunar-javascript Solar 入口（传入 ESM 版） */
  solar?: SolarLike | null;
}

/**
 * 每日黄历（enveloped 版）：按公历日期返回完整黄历数据 + 四层报告快照。
 * 供本地运行器调用 get_almanac 工具。
 */
export function getAlmanacEnveloped(input: AlmanacInput = {}): ToolEnvelope<AlmanacData> {
  const config = resolveAlmanacEngineConfig();
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const dateStr = input.date?.trim() || today;
  const data = getAlmanacData(dateStr, input.solar ?? null);

  if (!data) {
    return {
      ok: false,
      tool: 'get_almanac',
      version: '1.0.0',
      input_normalized: { date: dateStr },
      data: data as unknown as AlmanacData,
      summary: [],
      error: { code: 'SOLAR_UNAVAILABLE', message: `无法取到 ${dateStr} 的黄历数据，可能精确历法入口（lunar-javascript）未加载。` },
    };
  }

  const yiStr = data.yi.length ? data.yi.join('、') : '无';
  const jiStr = data.ji.length ? data.ji.join('、') : '无';
  const synthesis = `${data.solarDate}（${data.lunarDate}）${data.dayGanZhi}日，${data.zodiac}年。宜：${yiStr}；忌：${jiStr}。${data.dayTianShenType}（${data.dayTianShen}），冲${data.chong}煞${data.sha}。喜神${data.xiPosition}、财神${data.caiPosition}。`;

  const snapshot: ExportSnapshot = {
    summary: synthesis,
    tags: ['黄历', data.dayGanZhi, data.zodiac, data.dayTianShenType],
    sections: [
      { heading: '干支纳音', body: `${data.yearGanZhi}年 ${data.monthGanZhi}月 ${data.dayGanZhi}日（${data.dayNaYin}），生肖${data.zodiac}，星宿${data.dayXiu}${data.liuYao ? `，六曜${data.liuYao}` : ''}${data.dayNineStar ? `，九星${data.dayNineStar}` : ''}。` },
      { heading: '宜忌', body: `宜：${yiStr}。忌：${jiStr}。` },
      { heading: '吉神凶煞', body: `吉神宜趋：${data.jiShen.join('、') || '无'}。凶煞宜忌：${data.xiongSha.join('、') || '无'}。彭祖百忌：${data.pengZu}。` },
      { heading: '神位方位', body: `喜神${data.xiPosition}、福神${data.fuPosition}、财神${data.caiPosition}、阳贵${data.yangGuiPosition}、阴贵${data.yinGuiPosition}。` },
      { heading: '冲煞', body: `冲：${data.chong}；煞：${data.sha}。` },
      { heading: '时辰吉凶', body: data.hours.map((h) => `${h.label} ${h.ganZhi}（${h.tianShenType}/${h.luck}）宜${h.yi.join('、') || '无'}忌${h.ji.join('、') || '无'}`).join('；') + '。' },
      ...(data.jieQi ? [{ heading: '节气', body: `今日为${data.jieQi}。` }] : []),
      ...(data.festivals.length ? [{ heading: '节日', body: data.festivals.join('、') + '。' }] : []),
    ],
    sourceNotes: data.confidenceNote,
  };

  return {
    ok: true,
    tool: 'get_almanac',
    version: '1.0.0',
    input_normalized: { date: dateStr },
    data: { ...data, export_snapshot: snapshot } as AlmanacData & { export_snapshot: ExportSnapshot },
    summary: [synthesis],
    warnings: [data.confidenceNote],
    result_meta: {
      engineVersion: '1.0.0',
      evidenceSchemaVersion: '0.1.0',
      algorithm: '黄历公农历转换与日时宜忌',
      calculationConfig: { ...config },
    },
  };
}
