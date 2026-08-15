import type {
  BaziPillars,
  ConstitutionData,
  ConstitutionScores,
  ConstitutionType,
  EightMansionsData,
  EightMansionsSummary,
  FlyingStarsData,
  FlyingStarsSummary,
  WuxingStats,
  YunqiData,
} from './baseTypes';
import type { LegacyWindow as BaseLegacyWindow } from './legacyGlobals';
import type { LegacyBaziModule, LegacyFengshuiModule, LegacyHealthModule, LegacyZiweiModule, LegacyCORE } from './legacyPrivateTypes';
export type {
  BaziPillars,
  ConstitutionData,
  ConstitutionScores,
  ConstitutionType,
  EightMansionsData,
  EightMansionsSummary,
  FlyingStarsData,
  FlyingStarsSummary,
  WuxingStats,
  YunqiData,
};

export interface LiuyaoLine {
  yin: boolean;
  changing: boolean;
  branch: string;
  relation: string;
  god: string;
}

export interface LiuyaoData {
  lines: LiuyaoLine[];
  hexagramName: string;
  hexagramNumber: number;
  isOriginal: boolean;
  yongShen: string;
  shiYao: number;
  yingYao: number;
}

export interface TrigramDisplay {
  name: string;
  symbol: string;
  nature?: string;
}

export interface MeihuaData {
  upperTrigram: TrigramDisplay;
  lowerTrigram: TrigramDisplay;
  changingLine: number;
  mutualUpper?: TrigramDisplay;
  mutualLower?: TrigramDisplay;
  bodyTrigram: string;
  useTrigram: string;
  bodyUseRelation: string;
  /** 吉凶分级（大吉/可成/不利/大凶/平顺） */
  fortuneLevel?: string;
  /** 吉凶详述 */
  fortuneDetail?: string;
  /** 策略指导（进/退/变/守/顺） */
  strategy?: string;
  /** 体卦卦德 */
  bodyGuaDe?: string;
  /** 用卦卦德 */
  useGuaDe?: string;
  /** 错卦 */
  cuoTrigram?: { upper: string; lower: string; name: string };
  /** 综卦 */
  zongTrigram?: { upper: string; lower: string; name: string };
  hexagramName: string;
  changingHexagramName?: string;
}

export const MEIHUA_TRIGRAMS = [
  { value: '乾', label: '乾☰(天)', symbol: '☰', nature: '天' },
  { value: '兑', label: '兑☱(泽)', symbol: '☱', nature: '泽' },
  { value: '离', label: '离☲(火)', symbol: '☲', nature: '火' },
  { value: '震', label: '震☳(雷)', symbol: '☳', nature: '雷' },
  { value: '巽', label: '巽☴(风)', symbol: '☴', nature: '风' },
  { value: '坎', label: '坎☵(水)', symbol: '☵', nature: '水' },
  { value: '艮', label: '艮☶(山)', symbol: '☶', nature: '山' },
  { value: '坤', label: '坤☷(地)', symbol: '☷', nature: '地' },
] as const;

export interface LegacyDivinationModule {
  renderLiuyao: (canvasId: string, data: LiuyaoData) => void;
  renderMeihua: (canvasId: string, data: MeihuaData) => void;
}

export interface LegacyWindow extends BaseLegacyWindow {
  LegacyCORE?: LegacyCORE;
  LegacyVizModules?: {
    bazi?: LegacyBaziModule;
    health?: LegacyHealthModule;
    fengshui?: LegacyFengshuiModule;
    divination?: LegacyDivinationModule;
    ziwei?: LegacyZiweiModule;
  };
  YunqiEngine?: {
    calculate: (year: number) => YunqiData;
  };
}
