import {
  claimToolMismatch,
  createClaimViolation,
  type ClaimValidation,
  type ClaimViolation,
} from './claimContract';

export type NumericAssertionClaim = {
  path: string;
  value: number;
} & { tool?: string };

export type NumericAssertionViolation = ClaimViolation<'numericAssertion', number> & {
  path: string;
};

export type NumericAssertionValidation = ClaimValidation<NumericAssertionViolation>;

export function validateNumericAssertionClaims(
  tool: string,
  result: Record<string, unknown>,
  claims: NumericAssertionClaim[],
): NumericAssertionValidation {
  const violations: NumericAssertionViolation[] = [];

  claims.forEach((claim, index) => {
    const toolMismatch = claimToolMismatch({ ...claim, kind: 'numericAssertion' }, tool);
    if (toolMismatch) {
      const violation = createClaimViolation({
        index,
        tool,
        claimTool: claim.tool,
        kind: 'numericAssertion',
        message: '',
        expected: undefined,
        actual: claim.value,
      });
      violations.push({
        ...violation,
        path: claim.path,
        message: `该凭证属于 ${claim.tool}，不能校验 ${tool} 的数值断言。`,
      });
      return;
    }

    const expected = getNumericValue(result, claim.path);
    if (claim.value !== expected) {
      violations.push({
        ...createClaimViolation({
          index,
          tool,
          claimTool: claim.tool,
          kind: 'numericAssertion',
          message: `路径 ${claim.path} 的数值与本次 ${tool} 结果不一致，或该路径不是有限数值。`,
          expected,
          actual: claim.value,
        }),
        path: claim.path,
      });
    }
  });

  return { valid: violations.length === 0, violations };
}

function getNumericValue(result: Record<string, unknown>, path: string): number | undefined {
  if (!path.startsWith('data.')) return undefined;

  const value = path.slice('data.'.length).split('.').reduce<unknown>((current, segment) => {
    if (Array.isArray(current)) {
      const index = Number(segment);
      return Number.isInteger(index) && index >= 0 ? current[index] : undefined;
    }
    if (current && typeof current === 'object') return (current as Record<string, unknown>)[segment];
    return undefined;
  }, result.data);

  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
