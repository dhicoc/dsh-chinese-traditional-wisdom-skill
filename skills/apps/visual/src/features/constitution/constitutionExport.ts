import type { ExportReportSnapshot } from '@/components/shared/ExportReportButton';

export function createConstitutionExportReport(): ExportReportSnapshot {
  return {
    summary: '体质辨识文化参考。',
    sections: [{
      heading: '使用说明',
      body: '本报告不包含问卷答案、评分、主要体质或出生年倾向，仅保留中医体质文化与日常调养的通用参考。体质辨识不替代医疗诊断；如有不适或健康问题，请咨询专业医师。',
    }],
  };
}
