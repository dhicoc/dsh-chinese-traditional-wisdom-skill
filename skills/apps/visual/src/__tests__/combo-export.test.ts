import { describe, expect, it } from 'vitest';
import { createComboExportReport } from '@/features/combo/comboExport';

describe('联合分析匿名导出', () => {
  it('不导出占问原文、双方身份资料或体质分类', () => {
    const report = createComboExportReport({
      comboName: '合婚配对',
      comboType: 'marriage',
      source: {
        summary: '张三与李四在1990-06-15和1992-08-20的合婚结果：气虚质，适合共同创业。',
        sections: [
          { heading: '占问', body: '我是否应该离开现在的工作，和李四结婚？' },
          { heading: '体质针对性建议', body: '气虚质应避免熬夜。' },
          { heading: '双方资料', body: '张三（男，1990-06-15）与李四（女，1992-08-20）。' },
        ],
      },
    });
    const text = [report.summary, ...report.sections.map((section) => `${section.heading}\n${section.body}`)].join('\n');

    expect(text).toContain('已完成合婚配对联合分析');
    expect(text).toContain('不包含占问原文、出生资料、姓名、性别、体质或健康信息');
    for (const sensitiveValue of ['张三', '李四', '1990-06-15', '1992-08-20', '气虚质', '我是否应该离开现在的工作']) {
      expect(text).not.toContain(sensitiveValue);
    }
  });

  it('对全部联合方案只导出匿名化文化参考边界', () => {
    const report = createComboExportReport({
      comboName: '事件决策',
      comboType: 'decision',
      source: {
        summary: '针对「是否换工作」的三种术数同参。',
        sections: [{ heading: '综合判断', body: '个人化推断内容。' }],
      },
    });

    expect(report.sections).toEqual([
      {
        heading: '导出隐私边界',
        body: '本报告仅确认已运行所选联合分析方案，不包含占问原文、出生资料、姓名、性别、体质或健康信息。传统术数与养生内容仅作文化参考，不构成现实决策或医疗建议。',
      },
    ]);
  });
});
