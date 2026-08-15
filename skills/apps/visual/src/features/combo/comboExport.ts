import type { ExportReportSnapshot } from '@/components/shared/ExportReportButton';

type ComboType = 'annual' | 'monthly' | 'decision' | 'space' | 'sanshi' | 'sanshi-classic' | 'wellness' | 'zeri' | 'marriage';

interface ComboExportInput {
  comboName: string;
  comboType: ComboType;
  source: ExportReportSnapshot;
}

export function createComboExportReport({ comboName, comboType: _comboType, source: _source }: ComboExportInput): ExportReportSnapshot {
  return {
    summary: `已完成${comboName}联合分析，仅作传统文化参考。`,
    sections: [{
      heading: '导出隐私边界',
      body: '本报告仅确认已运行所选联合分析方案，不包含占问原文、出生资料、姓名、性别、体质或健康信息。传统术数与养生内容仅作文化参考，不构成现实决策或医疗建议。',
    }],
  };
}
