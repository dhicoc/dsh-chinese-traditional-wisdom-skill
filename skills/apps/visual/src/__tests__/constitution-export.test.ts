import { describe, expect, it } from 'vitest';
import { createConstitutionExportReport } from '@/features/constitution/constitutionExport';

describe('createConstitutionExportReport', () => {
  it('只导出通用文化参考，不导出评分、主要体质或出生年倾向', () => {
    const report = createConstitutionExportReport();
    const text = [report.summary, ...report.sections.map((section) => section.body)].join('\n');

    expect(text).toContain('体质辨识文化参考');
    expect(text).toContain('不包含问卷答案、评分、主要体质或出生年倾向');
    expect(text).not.toContain('气虚质');
    expect(text).not.toContain('85分');
    expect(text).not.toContain('司天');
  });
});
