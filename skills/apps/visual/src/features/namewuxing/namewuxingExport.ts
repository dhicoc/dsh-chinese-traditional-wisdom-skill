import type { ExportReportSnapshot } from '@/components/shared/ExportReportButton';
import type { NameAnalysis } from '@/engine-api/name';

type NameRating = {
  totalScore: number;
  grade: string;
  dimensions: Array<{ name: string; score: number }>;
};

export function createNamewuxingExportReport(
  analysis: NameAnalysis,
  wuxingStats: Record<string, number>,
  rating: NameRating | null,
): ExportReportSnapshot {
  return {
    summary: '姓名五行与五格数理参考（姓名已脱敏）。',
    sections: [
      {
        heading: '笔画摘要',
        body: `姓氏字数：${analysis.surnameChars.length}字\n名字字数：${analysis.givenChars.length}字\n总笔画：${analysis.totalStrokes}画`,
      },
      {
        heading: '五格与三才',
        body: `${analysis.wuGeEntries.map((item) => `${item.name}${item.value}·${item.wuxing}·${item.luck}`).join('\n')}\n三才：${analysis.sanCai.config} · ${analysis.sanCai.luck}\n${analysis.sanCai.desc}`,
      },
      { heading: '五行分布', body: Object.entries(wuxingStats).map(([element, value]) => `${element}：${value}`).join('\n') },
      ...(rating ? [{ heading: '综合评分', body: `总分：${rating.totalScore} · ${rating.grade}\n${rating.dimensions.map((item) => `${item.name}：${item.score}分`).join('\n')}` }] : []),
    ],
  };
}
