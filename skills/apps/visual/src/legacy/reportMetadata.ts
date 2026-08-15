import { getModuleById, type ModuleId } from '@/lib/modules';

export type ReportTimeBasis = 'true-solar-verified' | 'civil-unverified';

export interface ReportMetadata {
  inputSummary: string;
  reportVersion?: string;
  capabilityMode?: string;
  timeBasis?: string;
}

export interface ReportMetadataItem {
  label: '本次分析说明' | '报告版本' | '结果状态' | '时间口径';
  value: string;
}

export interface ReportMetadataInput {
  inputSummary: string;
  reportVersion?: string;
  capabilityMode?: string;
  timeBasis?: ReportTimeBasis;
}

export interface WorkspaceReportMetadataInput {
  moduleId: Exclude<ModuleId, 'home'>;
  inputSummary: string;
  timeBasis?: ReportTimeBasis;
}

const TIME_BASIS_LABEL: Record<ReportTimeBasis, string> = {
  'true-solar-verified': '已核验真太阳时',
  'civil-unverified': '民用时间（未完成真太阳时复核）',
};

export function createReportMetadata(input: ReportMetadataInput): ReportMetadata {
  return {
    inputSummary: input.inputSummary,
    ...(input.reportVersion ? { reportVersion: input.reportVersion } : {}),
    ...(input.capabilityMode ? { capabilityMode: input.capabilityMode } : {}),
    ...(input.timeBasis ? { timeBasis: TIME_BASIS_LABEL[input.timeBasis] } : {}),
  };
}

export function createWorkspaceReportMetadata(input: WorkspaceReportMetadataInput): ReportMetadata {
  const module = getModuleById(input.moduleId);
  return createReportMetadata({
    ...input,
    reportVersion: '1.0',
    capabilityMode: module.statusLabel,
  });
}

export function getReportMetadataItems(metadata: ReportMetadata): ReportMetadataItem[] {
  return [
    { label: '本次分析说明', value: metadata.inputSummary },
    ...(metadata.reportVersion ? [{ label: '报告版本' as const, value: metadata.reportVersion }] : []),
    ...(metadata.capabilityMode ? [{ label: '结果状态' as const, value: metadata.capabilityMode }] : []),
    ...(metadata.timeBasis ? [{ label: '时间口径' as const, value: metadata.timeBasis }] : []),
  ];
}
