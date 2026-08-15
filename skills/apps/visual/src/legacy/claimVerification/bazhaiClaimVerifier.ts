import type { BazhaiResult } from '../bazhaiEngine';
import {
  claimToolMismatch,
  createClaimViolation,
  type ClaimValidation,
  type ClaimViolation,
  type ToolScopedClaim,
} from './claimContract';

const TOOL = 'calc_bazhai';

type BazhaiClaim =
  | { kind: 'mingGua'; field: 'trigram' | 'group'; value: string }
  | { kind: 'mingGua'; field: 'num'; value: number }
  | { kind: 'direction'; direction: string; field: 'star' | 'quality'; value: string }
  | {
    kind: 'annual';
    field: 'yearZhi' | 'taisuiZhi' | 'taisuiDirection' | 'taisuiBagua' | 'suiPoZhi' | 'suiPoDirection' | 'suiPoBagua' | 'sanShaZhiList' | 'sanShaDirection' | 'fiveYellowBagua' | 'fiveYellowDirection';
    value: string;
  };

export type BazhaiPresentationClaim = BazhaiClaim & { tool?: string };

export type BazhaiClaimViolation = ClaimViolation<BazhaiPresentationClaim['kind'], string | number>;

export type BazhaiClaimValidation = ClaimValidation<BazhaiClaimViolation>;

export function validateBazhaiClaims(data: BazhaiResult, claims: BazhaiPresentationClaim[]): BazhaiClaimValidation {
  const violations: BazhaiClaimViolation[] = [];

  claims.forEach((claim, index) => {
    if (claimToolMismatch(claim as ToolScopedClaim, TOOL)) {
      violations.push(createClaimViolation({
        index,
        tool: TOOL,
        claimTool: claim.tool,
        kind: claim.kind,
        message: '',
        actual: claim.value,
      }));
      return;
    }

    if (claim.kind === 'mingGua') {
      const expected = data.mingGua[claim.field];
      if (claim.value !== expected) {
        violations.push(createClaimViolation({ index, tool: TOOL, claimTool: claim.tool, kind: claim.kind, message: `命卦${claim.field} 与本次推算结果不一致。`, expected, actual: claim.value }));
      }
      return;
    }

    if (claim.kind === 'direction') {
      const expected = data.directions.find((direction) => direction.direction === claim.direction)?.[claim.field];
      if (claim.value !== expected) {
        violations.push(createClaimViolation({ index, tool: TOOL, claimTool: claim.tool, kind: claim.kind, message: `${claim.direction}方的${claim.field === 'star' ? '游年星' : '吉凶'}与本次推算结果不一致。`, expected, actual: claim.value }));
      }
      return;
    }

    const expected = getAnnualValue(data, claim.field);
    if (claim.value !== expected) {
      violations.push(createClaimViolation({ index, tool: TOOL, claimTool: claim.tool, kind: claim.kind, message: `${claim.field} 与本次目标年份方位结果不一致。`, expected, actual: claim.value }));
    }
  });

  return { valid: violations.length === 0, violations };
}

function getAnnualValue(data: BazhaiResult, field: Extract<BazhaiPresentationClaim, { kind: 'annual' }>['field']): string {
  if (field === 'yearZhi') return data.taisui.yearZhi;
  if (field === 'taisuiZhi') return data.taisui.taisui.zhi;
  if (field === 'taisuiDirection') return data.taisui.taisui.direction;
  if (field === 'taisuiBagua') return data.taisui.taisui.bagua;
  if (field === 'suiPoZhi') return data.taisui.suiPo.zhi;
  if (field === 'suiPoDirection') return data.taisui.suiPo.direction;
  if (field === 'suiPoBagua') return data.taisui.suiPo.bagua;
  if (field === 'sanShaZhiList') return data.taisui.sanSha.zhiList.join('、');
  if (field === 'sanShaDirection') return data.taisui.sanSha.direction;
  if (field === 'fiveYellowBagua') return data.taisui.fiveYellow.bagua;
  return data.taisui.fiveYellow.direction;
}
