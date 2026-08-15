/**
 * envelopeSample.ts —— ToolEnvelope 样板
 *
 * 这是「架构层优化第一步」的样板（ROADMAP「功能层增强计划」同批，但属工程化层）：
 * 证明一个干净的纯 TS 引擎（A 类，零 DOM 依赖）如何返回统一 ToolEnvelope，
 * 供本地运行器复用。
 *
 * 设计要点：
 * - 不替换 dreamDictionary.searchDream 原函数（DreamWorkspace 继续用原函数，零回归）。
 * - 新增 searchDreamEnveloped()，包成 ToolEnvelope 返回。
 * - 用 wrapEnvelope() 辅助函数包装，未来新引擎可直接构造 envelope，无需 wrap。
 * - 全部纯计算，无 window/document/canvas 依赖 —— Node 环境可直接 import。
 */

import { searchDream, type DreamSearchResult } from './dreamDictionary';
import { wrapEnvelope, type ToolEnvelope, type ExportSnapshot } from './baseTypes';

/** 解梦计算的 data 主体 = 原始搜索结果 + export_snapshot */
export interface DreamSearchData extends DreamSearchResult {
  export_snapshot: ExportSnapshot;
}

/**
 * 周公解梦搜索 —— ToolEnvelope 版本。
 * @param keyword 梦象关键词
 * @param useFull 是否合并全量库
 */
export function searchDreamEnveloped(keyword: string, useFull = false): ToolEnvelope<DreamSearchData> {
  const input = { keyword, useFull };
  const result = searchDream(keyword, useFull);

  // 构造 export_snapshot：把搜索结果转成稳定段表，供 LLM / 报告渲染消费
  const topEntry = result.entries[0];
  const snapshot: ExportSnapshot = {
    summary: result.hit
      ? `「${keyword}」的传统梦象解读${topEntry ? `；首条判为${topEntry.luck}` : ''}`
      : `「${keyword}」暂未找到对应梦象，建议换用更通用的关键词`,
    tags: result.hit ? ['周公解梦', topEntry?.luck ?? '—'] : ['周公解梦', '未命中'],
    sections: [
      {
        heading: '现代解读',
        body: result.entries.slice(0, 5).map((e) => `【${e.title}·${e.luck}】${e.meaning}`).join('\n') || '无',
      },
      {
        heading: '古文原典',
        body: result.classics.slice(0, 5).map((c) => `${c.original}（断语：${c.interpretation}）`).join('\n') || '无',
      },
    ],
    sourceNotes: '传统梦象解读仅作民俗文化参考。',
  };

  // 用 wrapEnvelope 包装：自动从 result 提取 tool/version，把 confidenceNote 转为 warnings
  const env = wrapEnvelope(
    // dreamDictionary 无 engineName/confidenceNote，这里补上元信息
    { ...result, engineName: 'DreamDictionaryAdapter', mode: useFull ? 'local-full' : 'local-curated', confidenceNote: '民俗梦象解读参考，非预言绝对' },
    input,
    snapshot,
  );

  // 未命中时给一个 warning
  if (!result.hit) {
    env.warnings = [...(env.warnings ?? []), `未命中关键词「${keyword}」，可尝试更通用的表述`];
  }

  return env as unknown as ToolEnvelope<DreamSearchData>;
}
