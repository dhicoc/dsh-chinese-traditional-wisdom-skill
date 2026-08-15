import type { BaziData } from '../baziEngine';
import {
  claimToolMismatch,
  createClaimViolation,
  type ClaimValidation,
  type ClaimViolation,
} from './claimContract';

const BAZI_TOOL = 'bazi_calculate';

type BaziClaim =
  | { kind: 'pillar'; pillar: 'year' | 'month' | 'day' | 'hour'; value: string }
  | { kind: 'dayMaster'; value: string }
  | { kind: 'elementCount'; element: '木' | '火' | '土' | '金' | '水'; value: number }
  | { kind: 'strength'; value: '身强' | '身弱' | '中和' }
  | { kind: 'luck'; ageStart: number; value: string }
  | { kind: 'shenSha'; value: string }
  | { kind: 'transitTargetDate'; value: string }
  | { kind: 'transitNominalAge'; value: number }
  | { kind: 'transitDecadal'; field: 'direction' | 'ganZhi'; value: string }
  | { kind: 'transitMinor'; field: 'nominalAge' | 'ganZhi' | 'stemShiShen' | 'stemWuxing'; value: string | number }
  | { kind: 'transitPillar'; layer: 'yearly' | 'monthly' | 'daily'; field: 'ganZhi' | 'stemShiShen' | 'stemWuxing'; value: string }
  | { kind: 'transitRelation'; layer: 'yearly' | 'monthly' | 'daily'; reference: 'natal' | 'decadal' | 'minor'; referenceKey?: 'year' | 'month' | 'day' | 'hour'; value: string };

export type BaziPresentationClaim = BaziClaim & { tool?: string };

export type BaziClaimViolation = ClaimViolation<BaziPresentationClaim['kind'], string | number>;

export type BaziClaimValidation = ClaimValidation<BaziClaimViolation>;

export function validateBaziClaims(data: BaziData, claims: BaziPresentationClaim[]): BaziClaimValidation {
  const violations: BaziClaimViolation[] = [];

  claims.forEach((claim, index) => {
    if (claimToolMismatch(claim, BAZI_TOOL)) {
      violations.push(createClaimViolation({
        index,
        tool: BAZI_TOOL,
        claimTool: claim.tool,
        kind: claim.kind,
        message: '',
        actual: claim.value,
      }));
      return;
    }

    if (claim.kind === 'pillar') {
      const pillar = data.pillars[claim.pillar];
      const expected = `${pillar.stem}${pillar.branch}`;
      if (claim.value !== expected) {
        violations.push(createClaimViolation({ index, tool: BAZI_TOOL, claimTool: claim.tool, kind: claim.kind, message: `${claim.pillar} 柱与本次排盘不一致。`, expected, actual: claim.value }));
      }
      return;
    }

    if (claim.kind === 'dayMaster') {
      if (claim.value !== data.dayMaster) {
        violations.push(createClaimViolation({ index, tool: BAZI_TOOL, claimTool: claim.tool, kind: claim.kind, message: '日主与本次排盘不一致。', expected: data.dayMaster, actual: claim.value }));
      }
      return;
    }

    if (claim.kind === 'elementCount') {
      const expected = data.elements[claim.element];
      if (claim.value !== expected) {
        violations.push(createClaimViolation({ index, tool: BAZI_TOOL, claimTool: claim.tool, kind: claim.kind, message: `${claim.element} 五行计数与本次排盘不一致。`, expected, actual: claim.value }));
      }
      return;
    }

    if (claim.kind === 'strength') {
      const expected = data.advancedAnalysis.support.strength;
      if (claim.value !== expected) {
        violations.push(createClaimViolation({ index, tool: BAZI_TOOL, claimTool: claim.tool, kind: claim.kind, message: '日主强弱与本次排盘不一致。', expected, actual: claim.value }));
      }
      return;
    }

    if (claim.kind === 'luck') {
      const luck = data.luck.find((item) => item.ageStart === claim.ageStart);
      const expected = luck ? `${luck.stem}${luck.branch}` : undefined;
      if (claim.value !== expected) {
        violations.push(createClaimViolation({ index, tool: BAZI_TOOL, claimTool: claim.tool, kind: claim.kind, message: `${claim.ageStart} 岁起的大运与本次排盘不一致。`, expected, actual: claim.value }));
      }
      return;
    }

    const transit = data.transit;
    if (claim.kind === 'transitTargetDate') {
      const expected = transit?.targetDate;
      if (claim.value !== expected) {
        violations.push(createClaimViolation({ index, tool: BAZI_TOOL, claimTool: claim.tool, kind: claim.kind, message: '动态层目标日期与本次排盘不一致。', expected, actual: claim.value }));
      }
      return;
    }

    if (claim.kind === 'transitNominalAge') {
      const expected = transit?.nominalAge;
      if (claim.value !== expected) {
        violations.push(createClaimViolation({ index, tool: BAZI_TOOL, claimTool: claim.tool, kind: claim.kind, message: '动态层虚岁与本次排盘不一致。', expected, actual: claim.value }));
      }
      return;
    }

    if (claim.kind === 'transitDecadal') {
      const expected = claim.field === 'direction'
        ? transit?.decadal.direction
        : transit?.decadal.current
          ? `${transit.decadal.current.stem}${transit.decadal.current.branch}`
          : undefined;
      if (claim.value !== expected) {
        violations.push(createClaimViolation({ index, tool: BAZI_TOOL, claimTool: claim.tool, kind: claim.kind, message: `动态层十年大运${claim.field}与本次排盘不一致。`, expected, actual: claim.value }));
      }
      return;
    }

    if (claim.kind === 'transitMinor') {
      const expected = claim.field === 'ganZhi'
        ? transit ? `${transit.minor.stem}${transit.minor.branch}` : undefined
        : transit?.minor[claim.field];
      if (claim.value !== expected) {
        violations.push(createClaimViolation({ index, tool: BAZI_TOOL, claimTool: claim.tool, kind: claim.kind, message: `动态层小运${claim.field}与本次排盘不一致。`, expected, actual: claim.value }));
      }
      return;
    }

    if (claim.kind === 'transitPillar') {
      const pillar = transit?.[claim.layer];
      const expected = claim.field === 'ganZhi'
        ? pillar ? `${pillar.stem}${pillar.branch}` : undefined
        : pillar?.[claim.field];
      if (claim.value !== expected) {
        violations.push(createClaimViolation({ index, tool: BAZI_TOOL, claimTool: claim.tool, kind: claim.kind, message: `动态层${claim.layer}${claim.field}与本次排盘不一致。`, expected, actual: claim.value }));
      }
      return;
    }

    if (claim.kind === 'transitRelation') {
      const matches = transit?.relations[claim.layer][claim.reference] ?? [];
      const expected = matches.some((item) =>
        item.referenceKey === claim.referenceKey && item.relations.includes(claim.value as never),
      ) ? claim.value : undefined;
      if (claim.value !== expected) {
        violations.push(createClaimViolation({ index, tool: BAZI_TOOL, claimTool: claim.tool, kind: claim.kind, message: '动态层关系选择器与本次排盘不一致。', expected, actual: claim.value }));
      }
      return;
    }

    const shenShaNames = new Set(data.shenSha.map((item) => item.name));
    const exists = shenShaNames.has(claim.value) || (claim.value === '无' && data.shenSha.length === 0);
    if (!exists) {
      violations.push(createClaimViolation({ index, tool: BAZI_TOOL, claimTool: claim.tool, kind: claim.kind, message: `神煞“${claim.value}”未出现在本次排盘。`, expected: undefined, actual: claim.value }));
    }
  });

  return { valid: violations.length === 0, violations };
}
