export {
  getBazhaiGrid,
  getBazhaiSummary,
  getFeixingGrid,
} from '@/legacy/canvasRenderers';

export type {
  EightMansionsGrid,
  EightMansionsSummary,
  FlyingStarGrid,
} from '@/legacy/canvasRenderers';

export {
  checkMingZhaiCompatibility,
  combineBazhaiFeixing,
  getHouseGua,
  getPersonalDirections,
  getSectorAnalysis,
  SHAPE_SHA,
  FACING_OPTIONS,
} from '@/legacy/bazhaiHouse';

export type {
  BazhaiFeixingCombo,
  HouseGua,
  MingZhaiCompatibility,
  SectorUse,
  ShapeSha,
} from '@/legacy/bazhaiHouse';

export { calcTaisui } from '@/legacy/taisuiEngine';
export type { TaisuiData } from '@/legacy/taisuiEngine';

export { calcMenZhuZao } from '@/legacy/menZhuZaoEngine';
export type { MenZhuZaoData, MenZhuZaoInput } from '@/legacy/menZhuZaoEngine';

export { getFeixingSummary } from '@/legacy/canvasRenderers';
export type { FlyingStarsSummary } from '@/legacy/canvasRenderers';

export { calcMingGua } from '@/legacy/bazhaiHouse';
export type { MingGua } from '@/legacy/bazhaiHouse';

export {
  DIR_TO_PALACE,
  getStarStatuses,
  getYuanYun,
  MING_GUA_DIRECTIONS,
  NINE_STAR_REMEDIES,
  PALACE_TO_DIR,
  YUAN_YUN,
} from '@/legacy/flyingStarRemedies';

export type {
  MingGuaDirections,
  NineStarRemedy,
  StarStatus,
  YuanYun,
} from '@/legacy/flyingStarRemedies';
