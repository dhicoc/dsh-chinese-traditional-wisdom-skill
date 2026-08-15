export type LegacyMode = 'not-loaded' | 'loading' | 'ready' | 'error';

export interface LegacyState {
  mode: LegacyMode;
  error?: string;
}

export interface LegacyWindow extends Window {
  ToolManifest?: unknown;
  CapabilityRegistry?: unknown;
  EngineAdapterRegistry?: unknown;
  FORTUNE?: unknown;
  VizModules?: unknown;
}

export function getLegacyWindow(): LegacyWindow {
  return window as LegacyWindow;
}
