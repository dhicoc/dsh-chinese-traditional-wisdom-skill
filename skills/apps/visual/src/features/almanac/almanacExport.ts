import type { ExportReportSnapshot } from '@/components/shared/ExportReportButton';

interface AlmanacExportInput {
  source: ExportReportSnapshot;
}

export function createAlmanacExportReport({ source: _source }: AlmanacExportInput): ExportReportSnapshot {
  return {
    summary: '已完成本地黄历查询，仅作传统文化参考。',
    sections: [{
      heading: '导出隐私边界',
      body: '本报告仅确认已完成黄历查询，不包含所选日期、农历日期、干支或时辰细节。传统民俗内容仅作文化参考，不构成现实决策或专业建议。',
    }],
  };
}
