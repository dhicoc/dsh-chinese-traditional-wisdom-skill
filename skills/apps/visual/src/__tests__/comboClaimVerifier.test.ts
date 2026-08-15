import { describe, expect, it } from 'vitest';
import { calcAnnualFortuneCombo } from '@/legacy/comboEngine';
import {
  validateComboClaims,
  type ComboPresentationClaim,
} from '@/legacy/claimVerification/comboClaimVerifier';

const birth = { year: 1990, month: 6, day: 15, hour: 12, gender: '男' };

describe('组合年度运势 claim 校验', () => {
  const data = calcAnnualFortuneCombo({ birth, targetYear: 2026 }).data;

  it('接受 calcAnnualFortuneCombo 的 targetYear 和命卦有效 claims', () => {
    const claims: ComboPresentationClaim[] = [
      { tool: 'combo_annual_fortune', kind: 'annualContext', field: 'targetYear', value: data.context.targetYear },
      { tool: 'combo_annual_fortune', kind: 'annualContext', field: 'mingGuaTrigram', value: data.context.mingGua.trigram },
      { tool: 'combo_annual_fortune', kind: 'annualContext', field: 'mingGuaGroup', value: data.context.mingGua.group },
    ];

    expect(validateComboClaims('combo_annual_fortune', data, claims)).toEqual({ valid: true, violations: [] });
  });

  it('拒绝被篡改的 targetYear', () => {
    const result = validateComboClaims('combo_annual_fortune', data, [
      { tool: 'combo_annual_fortune', kind: 'annualContext', field: 'targetYear', value: data.context.targetYear + 1 },
    ]);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual([
      expect.objectContaining({ kind: 'annualContext', expected: data.context.targetYear, actual: data.context.targetYear + 1 }),
    ]);
  });

  it('拒绝跨工具 claim', () => {
    const result = validateComboClaims('combo_annual_fortune', data, [
      { tool: 'combo_monthly_fortune', kind: 'monthlyMode', value: 'local-exact' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.violations).toEqual([
      expect.objectContaining({
        tool: 'combo_annual_fortune',
        claimTool: 'combo_monthly_fortune',
        kind: 'monthlyMode',
        code: 'tool-mismatch',
        expected: undefined,
      }),
    ]);
  });
});
