export type LocalToolErrorCode =
  | 'UNKNOWN_TOOL'
  | 'INVALID_JSON'
  | 'INVALID_INPUT'
  | 'UNSUPPORTED_INPUT'
  | 'INPUT_COMBINATION_INVALID'
  | 'ENGINE_FAILURE'
  | 'INPUT_READ_FAILURE';

export class LocalToolError extends Error {
  readonly code: LocalToolErrorCode;
  readonly tool?: string;

  constructor(code: LocalToolErrorCode, message: string, tool?: string) {
    super(message);
    this.name = 'LocalToolError';
    this.code = code;
    this.tool = tool;
  }
}

export function asLocalToolError(
  code: LocalToolErrorCode,
  error: unknown,
  tool?: string,
): LocalToolError {
  if (error instanceof LocalToolError) return error;
  return new LocalToolError(
    code,
    error instanceof Error ? error.message : String(error),
    tool,
  );
}

export function localToolErrorPayload(error: unknown, tool?: string) {
  const normalized = error instanceof LocalToolError
    ? error
    : asLocalToolError('ENGINE_FAILURE', error, tool);

  return {
    ok: false as const,
    error: {
      code: normalized.code,
      ...(normalized.tool === undefined ? {} : { tool: normalized.tool }),
      message: normalized.message,
    },
  };
}
