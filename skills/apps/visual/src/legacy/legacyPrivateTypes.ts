export interface LegacyBaziModule {
  render: (canvasId: string, pillars: import('./canvasRenderers').BaziPillars) => void;
  renderWuxing: (canvasId: string, stats: import('./canvasRenderers').WuxingStats) => void;
}

export interface LegacyHealthModule {
  renderYunqi: (canvasId: string, data: import('./canvasRenderers').YunqiData) => void;
  renderConstitution: (canvasId: string, data: import('./canvasRenderers').ConstitutionData) => void;
}

/** 八方向名（北、东北、东、东南、南、西南、西、西北） */
export type EightDirection = '北' | '东北' | '东' | '东南' | '南' | '西南' | '西' | '西北';

/** 八宅游年星名 */
export type MansionStarName = '生气' | '天医' | '延年' | '伏位' | '绝命' | '五鬼' | '六煞' | '祸害';

/** 八宅游年映射表：命卦 → 方向 → 游年星名 */
export type EightMansionsDataMap = Record<string, Record<EightDirection, MansionStarName>>;

export interface LegacyFengshuiModule {
  renderCompass: (canvasId: string) => void;
  renderFlyingStars: (canvasId: string, data: import('./canvasRenderers').FlyingStarsData) => void;
  renderEightMansions: (canvasId: string, data: import('./canvasRenderers').EightMansionsData) => void;
  /** 八宅游年映射表（与 legacy fengshui.js EIGHT_MANSIONS_DATA 同源） */
  eightMansionsData: EightMansionsDataMap;
}

export interface LegacyNineStar {
  name: string;
  wuxing: string;
  luck: string;
}

export interface LegacyMansionStar {
  luck: string;
  meaning: string;
}

export interface LegacyMingGua {
  trigram: string;
  group: string;
}

export interface LegacyCORE {
  nineStars: LegacyNineStar[];
  getFlyingStars: (year: number) => Record<string, number>;
  calcMingGua: (year: number, gender: string) => LegacyMingGua;
  eightMansionStars: Record<string, LegacyMansionStar>;
  trigrams: string[];
  trigramsSymbol: string[];
  trigramDirection: Record<string, { deg: number; label: string }>;
}

export interface LegacyZiweiModule {
  render: (canvasId: string, data: unknown) => void;
}
