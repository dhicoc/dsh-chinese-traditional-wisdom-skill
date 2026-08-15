import type { ExportReportSnapshot } from '@/components/shared/ExportReportButton';

interface DreamExportInput {
  entries: Array<{ meaning: string }>;
  classics: Array<{ original: string; interpretation: string }>;
  links: Array<{ label: string; value: string }>;
}

export function createDreamExportReport({ entries, classics, links }: DreamExportInput): ExportReportSnapshot {
  return {
    summary: '梦象分类检索结果，仅作传统民俗文化参考。',
    sections: [
      ...(entries.length > 0 ? [{ heading: '现代解读', body: entries.slice(0, 8).map((entry) => entry.meaning).join('\n\n') }] : []),
      ...(classics.length > 0 ? [{ heading: '古文断语', body: classics.slice(0, 6).map((item) => `${item.original}\n断语：${item.interpretation}`).join('\n\n') }] : []),
      ...(links.length > 0 ? [{ heading: '方位参看', body: links.map((item) => `${item.label}：${item.value}`).join('\n') }] : []),
    ],
  };
}
