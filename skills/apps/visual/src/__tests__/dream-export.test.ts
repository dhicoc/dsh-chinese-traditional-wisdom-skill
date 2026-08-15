import { describe, expect, it } from 'vitest';
import { createDreamExportReport } from '@/features/dream/dreamExport';

describe('createDreamExportReport', () => {
  it('保留民俗参考内容但不导出查询原文或个人叙述', () => {
    const report = createDreamExportReport({
      entries: [{ meaning: '传统条目解读' }],
      classics: [{ original: '古文条目', interpretation: '古文断语说明' }],
      links: [{ label: '方位参看', value: '北方' }],
    });
    const text = [report.summary, ...report.sections.map((section) => section.body)].join('\n');

    expect(text).toContain('梦象分类检索结果');
    expect(text).toContain('传统条目解读');
    expect(text).toContain('古文条目');
    expect(text).toContain('方位参看：北方');
    expect(text).not.toContain('梦见前任和我吵架');
  });
});
