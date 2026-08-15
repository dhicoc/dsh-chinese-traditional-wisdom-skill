import { describe, expect, it } from 'vitest';
import { createAlmanacExportReport } from '@/features/almanac/almanacExport';

describe('createAlmanacExportReport', () => {
  it('不导出所选日期、农历日期或日柱细节', () => {
    const report = createAlmanacExportReport({
      source: {
        summary: '2026-08-14 黄历参考。',
        sections: [{ heading: '日期信息', body: '公历：2026-08-14\n农历：七月初二\n日柱：丙午' }],
      },
    });
    const text = [report.summary, ...report.sections.map((section) => section.body)].join('\n');

    expect(text).toContain('已完成本地黄历查询，仅作传统文化参考。');
    expect(text).toContain('不包含所选日期、农历日期、干支或时辰细节');
    expect(text).not.toContain('2026-08-14');
    expect(text).not.toContain('七月初二');
    expect(text).not.toContain('丙午');
  });
});
