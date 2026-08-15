import type { AnnualFortuneResult, DailyWellnessResult, MonthlyFortuneResult, ZeriResult } from '../comboEngine';
import type { MarriageResult } from '../marriageCombo';
import {
  claimToolMismatch,
  createClaimViolation,
  type ClaimValidation,
  type ClaimViolation,
} from './claimContract';

export type ComboPresentationTool = 'combo_annual_fortune' | 'combo_zeri' | 'combo_daily_wellness' | 'combo_monthly_fortune' | 'combo_marriage';

type MarriagePerson = 'personA' | 'personB';
type Wuxing = '木' | '火' | '土' | '金' | '水';
type ChongHeRelationField = 'chong' | 'liuHe' | 'sanHe' | 'hai' | 'xing' | 'ganHe' | 'ganChong';

export type ComboPresentationClaim =
  | { tool: string; kind: 'annualContext'; field: 'targetYear'; value: number }
  | { tool: string; kind: 'annualContext'; field: 'mingGuaTrigram' | 'mingGuaGroup'; value: string }
  | { tool: string; kind: 'zeriPurpose'; value: ZeriResult['zeriPurpose'] }
  | { tool: string; kind: 'zeriRange'; field: 'start' | 'end' | 'scannedDays'; value: string | number }
  | { tool: string; kind: 'zeriRankedDay'; index: number; field: 'date' | 'lunarDate' | 'dayGanZhi' | 'score' | 'tone' | 'chongOwner' | 'hitsAnnualSha'; value: string | number | boolean }
  | { tool: string; kind: 'zeriAnnualSha'; field: 'taisui' | 'suiPo' | 'sanSha' | 'fiveYellow'; value: string }
  | { tool: string; kind: 'zeriPersonalDirection'; index: number; field: 'star' | 'direction'; value: string }
  | { tool: string; kind: 'monthlyContext'; field: 'year' | 'month' | 'monthGanZhi' | 'jieqi'; value: string | number }
  | { tool: string; kind: 'monthlyMode'; value: MonthlyFortuneResult['mode'] }
  | { tool: string; kind: 'wellnessContext'; field: 'date' | 'jieqi' | 'season' | 'shichen' | 'meridian'; value: string }
  | { tool: string; kind: 'wellnessConstitution'; field: 'type' | 'source' | 'reason'; value: string }
  | { tool: string; kind: 'wellnessJieqi'; field: 'jieqi' | 'season' | 'feature' | 'diet' | 'lifestyle' | 'exercise' | 'acupoints' | 'principle'; value: string }
  | { tool: string; kind: 'wellnessMeridian'; field: 'name' | 'time' | 'hours' | 'meridian' | 'organ' | 'function' | 'advice' | 'wuxing'; value: string }
  | { tool: string; kind: 'wellnessDirection'; value: string }
  | { tool: string; kind: 'wellnessRecommendation'; index: number; field: 'label' | 'value' | 'tone'; value: string }
  | { tool: string; kind: 'marriageScene'; value: MarriageResult['scene'] }
  | { tool: string; kind: 'marriagePerson'; person: MarriagePerson; field: 'dayGanZhi' | 'dayMaster' | 'dayMasterWuxing'; value: string }
  | { tool: string; kind: 'marriageElement'; person: MarriagePerson; element: Wuxing; value: number }
  | { tool: string; kind: 'marriageMingGua'; person: MarriagePerson; field: 'trigram' | 'group'; value: string }
  | { tool: string; kind: 'marriageChongHe'; index: number; field: 'pillar' | 'aGanZhi' | 'bGanZhi'; value: string }
  | { tool: string; kind: 'marriageChongHeRelation'; index: number; field: ChongHeRelationField; value: boolean };

export type ComboClaimViolation = ClaimViolation<
  ComboPresentationClaim['kind'],
  string | number | boolean
>;

export type ComboClaimValidation = ClaimValidation<ComboClaimViolation>;

type ComboPresentationData = AnnualFortuneResult | ZeriResult | DailyWellnessResult | MonthlyFortuneResult | MarriageResult;

export function validateComboClaims(
  tool: ComboPresentationTool,
  data: ComboPresentationData,
  claims: ComboPresentationClaim[],
): ComboClaimValidation {
  const violations: ComboClaimViolation[] = [];

  claims.forEach((claim, index) => {
    if (claimToolMismatch(claim, tool)) {
      violations.push(createClaimViolation({
        index,
        tool,
        claimTool: claim.tool,
        kind: claim.kind,
        message: `${claim.kind} 与本次${tool}传统规则输出不一致。`,
        actual: claim.value,
      }));
      return;
    }

    const expected = getExpectedValue(tool, data, claim);
    if (expected === undefined || claim.value !== expected) {
      violations.push(createClaimViolation({
        index,
        tool,
        claimTool: claim.tool,
        kind: claim.kind,
        message: `${claim.kind} 与本次${tool}传统规则输出不一致。`,
        expected,
        actual: claim.value,
      }));
    }
  });

  return { valid: violations.length === 0, violations };
}

function getExpectedValue(
  tool: ComboPresentationTool,
  data: ComboPresentationData,
  claim: ComboPresentationClaim,
): string | number | boolean | undefined {
  if (tool === 'combo_annual_fortune') {
    const annual = data as AnnualFortuneResult;
    switch (claim.kind) {
      case 'annualContext':
        if (claim.field === 'targetYear') return annual.context.targetYear;
        return claim.field === 'mingGuaTrigram'
          ? annual.context.mingGua.trigram
          : annual.context.mingGua.group;
      default:
        return undefined;
    }
  }

  if (tool === 'combo_zeri') {
    const zeri = data as ZeriResult;
    switch (claim.kind) {
      case 'zeriPurpose':
        return zeri.zeriPurpose;
      case 'zeriRange':
        return zeri.range[claim.field];
      case 'zeriRankedDay':
        return zeri.rankedDays[claim.index]?.[claim.field];
      case 'zeriAnnualSha':
        return zeri.annualSha[claim.field];
      case 'zeriPersonalDirection':
        return zeri.personalAuspicious[claim.index]?.[claim.field];
      default:
        return undefined;
    }
  }

  if (tool === 'combo_monthly_fortune') {
    const monthly = data as MonthlyFortuneResult;
    switch (claim.kind) {
      case 'monthlyContext':
        return monthly.context[claim.field];
      case 'monthlyMode':
        return monthly.mode;
      default:
        return undefined;
    }
  }

  if (tool === 'combo_marriage') {
    const marriage = data as MarriageResult;
    switch (claim.kind) {
      case 'marriageScene':
        return marriage.scene;
      case 'marriagePerson':
        return marriage[claim.person][claim.field];
      case 'marriageElement':
        return marriage[claim.person].elements[claim.element];
      case 'marriageMingGua':
        return marriage[claim.person].mingGua[claim.field];
      case 'marriageChongHe':
        return marriage.chongHeScan[claim.index]?.[claim.field];
      case 'marriageChongHeRelation':
        return marriage.chongHeScan[claim.index]?.relation[claim.field];
      default:
        return undefined;
    }
  }

  const wellness = data as DailyWellnessResult;
  switch (claim.kind) {
    case 'wellnessContext':
      return wellness.context[claim.field];
    case 'wellnessConstitution':
      return wellness.constitution[claim.field];
    case 'wellnessJieqi':
      return wellness.jieqiWellness[claim.field];
    case 'wellnessMeridian':
      return wellness.meridianHour[claim.field];
    case 'wellnessDirection':
      return wellness.directionTip;
    case 'wellnessRecommendation':
      return wellness.recommendations[claim.index]?.[claim.field];
    default:
      return undefined;
  }
}
