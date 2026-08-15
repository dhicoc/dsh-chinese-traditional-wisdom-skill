/**
 * charMeanings.ts —— charMeanings.json 的静态包装模块。
 *
 * 设计目的：nameStrokes.ts 的 getCharMeaning 通过 `await import('./charMeanings')`
 * 动态加载本模块，从而把约 1.69MB 的字义出处文本从姓名五行/测字的静态 chunk 中剥离，
 * 改为按需懒加载（Vite 自动拆分为独立 chunk，不掉入首屏 bundle）。
 *
 * 为什么用 TS 包装而非直接动态 import .json：
 *   Node / tsx 下动态 import JSON 需要 import assertion（assert / with），不同运行环境行为不一致，
 *   易踩坑；本包装模块静态 import 再 export，加载行为在各环境一致，规避该问题。
 *
 * 数据仅用于「字义出处」展示，不参与任何评分计算
 * （评分依赖 kangxiStrokes.json 的 {k,w}，二者零耦合）。
 */
import charMeaningsData from './charMeanings.json';

export const CHAR_MEANINGS: Record<string, string> = charMeaningsData as Record<string, string>;
