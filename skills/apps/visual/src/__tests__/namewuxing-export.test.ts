import { describe, expect, it } from 'vitest';
import { createNamewuxingExportReport } from '@/features/namewuxing/namewuxingExport';

describe('createNamewuxingExportReport', () => {
  it('仅导出脱敏的笔画与结构结果，不导出姓名或单字', () => {
    const report = createNamewuxingExportReport({
      surnameChars: [{ char: '张', strokes: 11, wuxing: '火' }],
      givenChars: [{ char: '伟', strokes: 6, wuxing: '土' }],
      totalStrokes: 14,
      wuxingBalance: { 木: 0, 火: 1, 土: 0, 金: 1, 水: 0 },
      wuGeEntries: [{ name: '人格', value: 14, wuxing: '火', luck: '凶' }],
      sanCai: { config: '火火火', luck: '吉', desc: '配置说明' },
    } as never, { 木: 0, 火: 1, 土: 0, 金: 1, 水: 0 }, null);
    const text = [report.summary, ...report.sections.map((section) => `${section.heading}\n${section.body}`)].join('\n');

    expect(text).toContain('姓名已脱敏');
    expect(text).toContain('姓氏字数：1字');
    expect(text).toContain('名字字数：1字');
    expect(text).toContain('总笔画：14画');
    expect(text).not.toContain('张');
    expect(text).not.toContain('伟');
    expect(text).not.toContain('姓氏：');
    expect(text).not.toContain('名字：');
  });
});
