import type { ExportReportSnapshot } from '@/components/shared/ExportReportButton';

interface AnonymousExportInput {
  source: ExportReportSnapshot;
}

export function createCeziExportReport({ source: _source }: AnonymousExportInput): ExportReportSnapshot {
  return {
    summary: '已完成本地测字分析，仅作传统文化参考。',
    sections: [{
      heading: '导出隐私边界',
      body: '本报告仅确认已完成测字分析，不包含所测字、原始问题、出生资料或八字补益信息。传统民俗内容仅作文化参考，不构成现实决策或专业建议。',
    }],
  };
}

export function createChenguzExportReport({ source: _source }: AnonymousExportInput): ExportReportSnapshot {
  return {
    summary: '已完成本地称骨计算，仅作传统文化参考。',
    sections: [{
      heading: '导出隐私边界',
      body: '本报告仅确认已完成称骨计算，不包含出生资料、农历日期、时支或派生四柱信息。传统民俗内容仅作文化参考，不构成现实决策或专业建议。',
    }],
  };
}

function createDirectionExportReport({ source: _source }: AnonymousExportInput): ExportReportSnapshot {
  return {
    summary: '已完成本地方位分析，仅作传统文化参考。',
    sections: [{
      heading: '导出隐私边界',
      body: '本报告仅确认已完成本地方位分析，不包含出生资料、性别、具体年份、房屋坐向、住址或其他原始输入。传统文化内容仅作参考，不构成现实决策或专业建议。',
    }],
  };
}

export const createBazhaiExportReport = createDirectionExportReport;
export const createFeixingExportReport = createDirectionExportReport;
export const createFengshuiExportReport = createDirectionExportReport;
