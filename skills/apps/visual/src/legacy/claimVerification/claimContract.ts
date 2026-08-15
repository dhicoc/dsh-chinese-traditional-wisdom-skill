export type ClaimViolationCode = 'value-mismatch' | 'selector-not-found' | 'tool-mismatch';

export interface ToolScopedClaim {
  tool?: string;
  kind: string;
  value: unknown;
}

export interface ClaimViolation<Kind extends string = string, Value = unknown> {
  index: number;
  tool: string;
  claimTool?: string;
  kind: Kind;
  code: ClaimViolationCode;
  message: string;
  expected?: Value;
  actual: Value;
}

export interface ClaimValidation<Violation extends ClaimViolation = ClaimViolation> {
  valid: boolean;
  violations: Violation[];
}

export function claimToolMismatch(claim: ToolScopedClaim, tool: string): boolean {
  return claim.tool !== undefined && claim.tool !== tool;
}

export function createClaimViolation<Kind extends string, Value>({
  index,
  tool,
  claimTool,
  kind,
  message,
  expected,
  actual,
}: {
  index: number;
  tool: string;
  claimTool?: string;
  kind: Kind;
  message: string;
  expected?: Value;
  actual: Value;
}): ClaimViolation<Kind, Value> {
  const toolMismatch = claimTool !== undefined && claimTool !== tool;
  return {
    index,
    tool,
    ...(claimTool === undefined ? {} : { claimTool }),
    kind,
    code: toolMismatch ? 'tool-mismatch' : expected === undefined ? 'selector-not-found' : 'value-mismatch',
    message: toolMismatch ? `该凭证属于 ${claimTool}，不能校验 ${tool} 的断言。` : message,
    expected,
    actual,
  };
}
