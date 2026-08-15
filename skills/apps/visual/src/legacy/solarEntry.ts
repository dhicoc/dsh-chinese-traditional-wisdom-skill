/**
 * solarEntry — lunar-typescript ESM 入口（纯 npm，不依赖 visual/vendor 或 window 全局）
 *
 * React 与本地运行器共用：需要精确历法时传入 getSolarEntry() / getLunarEntry()。
 */

import { Solar, Lunar } from 'lunar-typescript';

export type SolarEntry = typeof Solar;
export type LunarEntry = typeof Lunar;

/** 公历 Solar 构造入口（fromYmd / fromYmdHms） */
export function getSolarEntry(): SolarEntry {
  return Solar as SolarEntry;
}

/** 农历 Lunar 构造入口（fromYmd） */
export function getLunarEntry(): LunarEntry {
  return Lunar as LunarEntry;
}
