import { getZiweiHoroscopeSummary, type ZiweiData } from '../ziweiEngine';
import {
  claimToolMismatch,
  createClaimViolation,
  type ClaimValidation,
  type ClaimViolation,
} from './claimContract';

const ZIWEI_TOOL = 'ziwei_chart';

export type ZiweiPresentationClaim = (
  | { kind: 'palace'; palace: string; field: 'position' | 'miaoxian'; value: string }
  | { kind: 'palaceStar'; palace: string; value: string }
  | { kind: 'sihua'; star: string; value: string }
  | { kind: 'mainStar'; value: string }
  | { kind: 'metadata'; field: 'fiveElementsClass' | 'soul' | 'body' | 'bodyPalaceBranch' | 'originalPalaceBranch'; value: string }
  | { kind: 'transit'; field: 'decadal' | 'yearly' | 'monthly' | 'age' | 'yearlyMingPalace' | 'yearlyJiStar'; value: string | number }
) & { tool?: string };

export type ZiweiClaimViolation = ClaimViolation<ZiweiPresentationClaim['kind'], string | number>;

export type ZiweiClaimValidation = ClaimValidation<ZiweiClaimViolation>;

export function validateZiweiClaims(
  data: ZiweiData,
  claims: ZiweiPresentationClaim[],
  transit?: ReturnType<typeof getZiweiHoroscopeSummary>,
): ZiweiClaimValidation {
  const violations: ZiweiClaimViolation[] = [];

  claims.forEach((claim, index) => {
    if (claimToolMismatch(claim, ZIWEI_TOOL)) {
      violations.push(createClaimViolation({
        index,
        tool: ZIWEI_TOOL,
        claimTool: claim.tool,
        kind: claim.kind,
        message: '',
        actual: claim.value,
      }));
      return;
    }

    if (claim.kind === 'palace') {
      const expected = data.palaces[claim.palace]?.[claim.field];
      if (claim.value !== expected) {
        violations.push(createClaimViolation({
          index,
          tool: ZIWEI_TOOL,
          claimTool: claim.tool,
          kind: claim.kind,
          message: `${claim.palace}${claim.field === 'position' ? '宫位' : '庙旺'}与本次命盘不一致。`,
          expected,
          actual: claim.value,
        }));
      }
      return;
    }

    if (claim.kind === 'palaceStar') {
      const found = data.palaces[claim.palace]?.stars.includes(claim.value) === true;
      if (!found) {
        violations.push(createClaimViolation({
          index,
          tool: ZIWEI_TOOL,
          claimTool: claim.tool,
          kind: claim.kind,
          message: `星曜“${claim.value}”未出现在本次${claim.palace}。`,
          expected: undefined,
          actual: claim.value,
        }));
      }
      return;
    }

    if (claim.kind === 'sihua') {
      const expected = data.sihua[claim.star];
      if (claim.value !== expected) {
        violations.push(createClaimViolation({
          index,
          tool: ZIWEI_TOOL,
          claimTool: claim.tool,
          kind: claim.kind,
          message: `星曜“${claim.star}”的四化与本次命盘不一致。`,
          expected,
          actual: claim.value,
        }));
      }
      return;
    }

    if (claim.kind === 'mainStar') {
      const found = data.mainStars.includes(claim.value);
      if (!found) {
        violations.push(createClaimViolation({
          index,
          tool: ZIWEI_TOOL,
          claimTool: claim.tool,
          kind: claim.kind,
          message: `星曜“${claim.value}”未出现在本次本命主星集合。`,
          expected: undefined,
          actual: claim.value,
        }));
      }
      return;
    }

    if (claim.kind === 'metadata') {
      const expected = data[claim.field];
      if (claim.value !== expected) {
        violations.push(createClaimViolation({
          index,
          tool: ZIWEI_TOOL,
          claimTool: claim.tool,
          kind: claim.kind,
          message: `${claim.field} 与本次命盘不一致。`,
          expected,
          actual: claim.value,
        }));
      }
      return;
    }

    const expected = transit ? getTransitValue(transit, claim.field) : undefined;
    if (claim.value !== expected) {
      violations.push(createClaimViolation({
        index,
        tool: ZIWEI_TOOL,
        claimTool: claim.tool,
        kind: claim.kind,
        message: `${claim.field} 与本次目标年月动态层不一致。`,
        expected,
        actual: claim.value,
      }));
    }
  });

  return { valid: violations.length === 0, violations };
}

function getTransitValue(transit: ReturnType<typeof getZiweiHoroscopeSummary>, field: Extract<ZiweiPresentationClaim, { kind: 'transit' }>['field']): string | number {
  if (field === 'decadal') return `${transit.decadal.stem}${transit.decadal.branch}`;
  if (field === 'yearly') return `${transit.yearly.stem}${transit.yearly.branch}`;
  if (field === 'monthly') return `${transit.monthly.stem}${transit.monthly.branch}`;
  if (field === 'age') return transit.age.nominalAge;
  if (field === 'yearlyMingPalace') return transit.yearlyMingPalace;
  return transit.yearlyJiStar;
}
