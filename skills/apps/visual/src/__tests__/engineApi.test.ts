import { describe, expect, it } from 'vitest';
import {
  buildBaziDynamicLayer,
  calcBaziEnveloped,
  calculateBazi,
} from '@/engine-api/bazi';
import {
  DALIUREN_SCHOOLS,
  calcAnnualFortuneCombo,
  calcDecisionCombo,
} from '@/engine-api/combo';
import { calcMarriageCombo } from '@/engine-api/marriage';
import {
  getAlmanacData,
  getLunarEntry,
  getSolarEntry,
} from '@/engine-api/calendar';
import {
  analyzeName,
  calcNameRating,
} from '@/engine-api/name';
import {
  getMeridianByHour,
  MERIDIAN_HOURS,
  queryJieqiWellness,
  WUXING_COLORS,
} from '@/engine-api/rhythm';
import {
  calcDaliurenEnveloped,
  calcLiuyaoEnveloped,
  calcMeihuaEnveloped,
  calcQimenEnveloped,
  calcTaiyiEnveloped,
  DALIUREN_SCHOOLS as DALIUREN_SCHOOLS_DIVINATION,
} from '@/engine-api/divination';
import {
  calcMenZhuZao,
  calcMingGua,
  calcTaisui,
  combineBazhaiFeixing,
  getBazhaiGrid,
  getBazhaiSummary,
  getFeixingSummary,
  getYuanYun,
  NINE_STAR_REMEDIES,
} from '@/engine-api/bazhai';
import {
  calcCezi,
  calcChenguz,
  calcHuangjiEnveloped,
  calcXingXiuEnveloped,
} from '@/engine-api/folklore';
import {
  calculateScoresFromAnswers,
  deriveDominantConstitution,
  getConstitutionTendency,
} from '@/engine-api/daily';
import {
  calcYunqiEnveloped,
  calculateYunqi,
} from '@/engine-api/yunqi';
import {
  calcZiweiEnveloped,
  calculateZiwei,
  getZiweiTransitSnapshot,
} from '@/engine-api/ziwei';
import {
  calculateEquationOfTimeMinutes,
  resolveTrueSolarTime,
} from '@/engine-api/trueSolarTime';
import {
  buildBaziDynamicLayer as buildBaziDynamicLayerLegacy,
  calcBaziEnveloped as calcBaziEnvelopedLegacy,
  calculateBazi as calculateBaziLegacy,
} from '@/legacy/baziEngine';
import {
  calcAnnualFortuneCombo as calcAnnualFortuneComboLegacy,
  calcDecisionCombo as calcDecisionComboLegacy,
} from '@/legacy/comboEngine';
import {
  calcDaliurenEnveloped as calcDaliurenEnvelopedLegacy,
  DALIUREN_SCHOOLS as DALIUREN_SCHOOLS_LEGACY,
} from '@/legacy/daliurenEngine';
import { calcLiuyaoEnveloped as calcLiuyaoEnvelopedLegacy } from '@/legacy/liuyaoEngine';
import { calcMeihuaEnveloped as calcMeihuaEnvelopedLegacy } from '@/legacy/meihuaEngine';
import { calcMarriageCombo as calcMarriageComboLegacy } from '@/legacy/marriageCombo';
import { calcMenZhuZao as calcMenZhuZaoLegacy } from '@/legacy/menZhuZaoEngine';
import { calcQimenEnveloped as calcQimenEnvelopedLegacy } from '@/legacy/qimenEngine';
import { calcTaiyiEnveloped as calcTaiyiEnvelopedLegacy } from '@/legacy/taiyiEngine';
import { calcTaisui as calcTaisuiLegacy } from '@/legacy/taisuiEngine';
import { calcYunqiEnveloped as calcYunqiEnvelopedLegacy, calculateYunqi as calculateYunqiLegacy } from '@/legacy/yunqiEngine';
import { calcZiweiEnveloped as calcZiweiEnvelopedLegacy, calculateZiwei as calculateZiweiLegacy, getZiweiTransitSnapshot as getZiweiTransitSnapshotLegacy } from '@/legacy/ziweiEngine';
import {
  calculateEquationOfTimeMinutes as calculateEquationOfTimeMinutesLegacy,
  resolveTrueSolarTime as resolveTrueSolarTimeLegacy,
} from '@/legacy/trueSolarTime';
import {
  calcMingGua as calcMingGuaLegacy,
  combineBazhaiFeixing as combineBazhaiFeixingLegacy,
} from '@/legacy/bazhaiHouse';
import {
  deriveDominantConstitution as deriveDominantConstitutionLegacy,
  getBazhaiGrid as getBazhaiGridLegacy,
  getBazhaiSummary as getBazhaiSummaryLegacy,
  getFeixingSummary as getFeixingSummaryLegacy,
} from '@/legacy/canvasRenderers';
import { calcCezi as calcCeziLegacy } from '@/legacy/ceziEngine';
import { calcChenguz as calcChenguzLegacy } from '@/legacy/chenguzEngine';
import { calculateScoresFromAnswers as calculateScoresFromAnswersLegacy } from '@/legacy/constitutionQuestionnaire';
import { getAlmanacData as getAlmanacDataLegacy } from '@/legacy/almanacData';
import { queryJieqiWellness as queryJieqiWellnessLegacy } from '@/legacy/jieqiWellness';
import {
  getMeridianByHour as getMeridianByHourLegacy,
  MERIDIAN_HOURS as MERIDIAN_HOURS_LEGACY,
  WUXING_COLORS as WUXING_COLORS_LEGACY,
} from '@/legacy/meridianClock';
import { analyzeName as analyzeNameLegacy } from '@/legacy/nameWuxing';
import { calcNameRating as calcNameRatingLegacy } from '@/legacy/nameRating';
import {
  getLunarEntry as getLunarEntryLegacy,
  getSolarEntry as getSolarEntryLegacy,
} from '@/legacy/solarEntry';
import { NINE_STAR_REMEDIES as NINE_STAR_REMEDIES_LEGACY, getYuanYun as getYuanYunLegacy } from '@/legacy/flyingStarRemedies';
import { calcHuangjiEnveloped as calcHuangjiEnvelopedLegacy } from '@/legacy/huangjiEngine';
import { calcXingXiuEnveloped as calcXingXiuEnvelopedLegacy } from '@/legacy/xingxiuEngine';
import { getConstitutionTendency as getConstitutionTendencyLegacy } from '@/legacy/constitutionTendency';

describe('engine-api', () => {
  it('公开八字 API 仅转发既有纯引擎函数', () => {
    expect(calculateBazi).toBe(calculateBaziLegacy);
    expect(calcBaziEnveloped).toBe(calcBaziEnvelopedLegacy);
    expect(buildBaziDynamicLayer).toBe(buildBaziDynamicLayerLegacy);
  });

  it('公开历法 API 仅转发既有精确历法与黄历函数', () => {
    expect(getSolarEntry).toBe(getSolarEntryLegacy);
    expect(getLunarEntry).toBe(getLunarEntryLegacy);
    expect(getAlmanacData).toBe(getAlmanacDataLegacy);
  });

  it('公开姓名 API 仅转发既有本地计算函数', () => {
    expect(analyzeName).toBe(analyzeNameLegacy);
    expect(calcNameRating).toBe(calcNameRatingLegacy);
  });

  it('公开节律 API 仅转发既有本地计算函数和映射', () => {
    expect(queryJieqiWellness).toBe(queryJieqiWellnessLegacy);
    expect(getMeridianByHour).toBe(getMeridianByHourLegacy);
    expect(MERIDIAN_HOURS).toBe(MERIDIAN_HOURS_LEGACY);
    expect(WUXING_COLORS).toBe(WUXING_COLORS_LEGACY);
  });

  it('公开组合 API 仅转发既有纯引擎函数和选项', () => {
    expect(calcAnnualFortuneCombo).toBe(calcAnnualFortuneComboLegacy);
    expect(calcDecisionCombo).toBe(calcDecisionComboLegacy);
    expect(DALIUREN_SCHOOLS).toBe(DALIUREN_SCHOOLS_LEGACY);
  });

  it('公开合婚 API 保持既有异步组合函数', () => {
    expect(calcMarriageCombo).toBe(calcMarriageComboLegacy);
  });

  it('公开紫微与五运六气 API 仅转发既有纯引擎函数', () => {
    expect(calculateZiwei).toBe(calculateZiweiLegacy);
    expect(calcZiweiEnveloped).toBe(calcZiweiEnvelopedLegacy);
    expect(getZiweiTransitSnapshot).toBe(getZiweiTransitSnapshotLegacy);
    expect(calculateYunqi).toBe(calculateYunqiLegacy);
    expect(calcYunqiEnveloped).toBe(calcYunqiEnvelopedLegacy);
  });

  it('公开真太阳时 API 仅转发既有本地计算函数', () => {
    expect(calculateEquationOfTimeMinutes).toBe(calculateEquationOfTimeMinutesLegacy);
    expect(resolveTrueSolarTime).toBe(resolveTrueSolarTimeLegacy);
  });

  it('公开三式与六爻 API 仅转发既有纯引擎函数和选项', () => {
    expect(calcQimenEnveloped).toBe(calcQimenEnvelopedLegacy);
    expect(calcLiuyaoEnveloped).toBe(calcLiuyaoEnvelopedLegacy);
    expect(calcMeihuaEnveloped).toBe(calcMeihuaEnvelopedLegacy);
    expect(calcDaliurenEnveloped).toBe(calcDaliurenEnvelopedLegacy);
    expect(DALIUREN_SCHOOLS_DIVINATION).toBe(DALIUREN_SCHOOLS_LEGACY);
    expect(calcTaiyiEnveloped).toBe(calcTaiyiEnvelopedLegacy);
  });

  it('公开八宅 API 仅转发既有本地计算函数', () => {
    expect(getBazhaiGrid).toBe(getBazhaiGridLegacy);
    expect(getBazhaiSummary).toBe(getBazhaiSummaryLegacy);
    expect(combineBazhaiFeixing).toBe(combineBazhaiFeixingLegacy);
    expect(calcTaisui).toBe(calcTaisuiLegacy);
    expect(calcMenZhuZao).toBe(calcMenZhuZaoLegacy);
  });

  it('公开日常参考 API 仅转发既有本地计算函数', () => {
    expect(deriveDominantConstitution).toBe(deriveDominantConstitutionLegacy);
    expect(calculateScoresFromAnswers).toBe(calculateScoresFromAnswersLegacy);
    expect(getConstitutionTendency).toBe(getConstitutionTendencyLegacy);
  });

  it('公开飞星与方位 API 仅转发既有本地计算函数和映射', () => {
    expect(getFeixingSummary).toBe(getFeixingSummaryLegacy);
    expect(getYuanYun).toBe(getYuanYunLegacy);
    expect(calcMingGua).toBe(calcMingGuaLegacy);
    expect(NINE_STAR_REMEDIES).toBe(NINE_STAR_REMEDIES_LEGACY);
  });

  it('公开民俗 API 仅转发既有本地计算函数', () => {
    expect(calcXingXiuEnveloped).toBe(calcXingXiuEnvelopedLegacy);
    expect(calcHuangjiEnveloped).toBe(calcHuangjiEnvelopedLegacy);
    expect(calcCezi).toBe(calcCeziLegacy);
    expect(calcChenguz).toBe(calcChenguzLegacy);
  });
});
