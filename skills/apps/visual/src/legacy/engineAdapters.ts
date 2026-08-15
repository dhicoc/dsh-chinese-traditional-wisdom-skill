/**
 * engineAdapters — 兼容层已废弃
 *
 * 旧路径通过 window.EngineAdapterRegistry 调用 visual/js 引擎。
 * React 已全部改走纯 TS *Engine.ts；本文件仅保留类型占位，调用始终返回 null。
 */

export interface LegacyEngineAdapter<TInput = unknown, TResult = unknown, TRender = TResult> {
  engineName: string;
  mode: string;
  version: string;
  confidenceNote: string;
  calculate: (input: TInput) => TResult;
  toRenderData: (result: TResult, input?: TInput) => TRender;
  toReading?: (result: TResult, input?: TInput) => unknown;
}

export function getLegacyEngineAdapter<TInput = unknown, TResult = unknown, TRender = TResult>(
  _name: string,
): LegacyEngineAdapter<TInput, TResult, TRender> | null {
  void _name;
  return null;
}

export function calculateWithLegacyAdapter<TInput, TResult>(_name: string, _input: TInput): TResult | null {
  void _name;
  void _input;
  return null;
}

export function renderDataWithLegacyAdapter<TInput, TResult, TRender>(
  _name: string,
  _result: TResult,
  _input?: TInput,
): TRender | null {
  void _name;
  void _result;
  void _input;
  return null;
}

export function readingWithLegacyAdapter<TInput, TResult>(_name: string, _result: TResult, _input?: TInput): unknown {
  void _name;
  void _result;
  void _input;
  return null;
}
