import { useCallback, useState } from 'react';
import { DEFAULT_TRADITIONAL_DISCLAIMER, toSemanticReport, toUserWarnings, type SemanticReport } from '@/legacy/reportLayers';
import { getReportMetadataItems, type ReportMetadata } from '@/legacy/reportMetadata';
import { dispatchCommandFeedback } from '@/lib/commandIntents';

export interface ExportReportSnapshot {
  summary: string;
  sections: Array<{ heading: string; body: string }>;
}

export interface ExportUserPresentation {
  report: ExportReportSnapshot;
  notices?: string[];
  warnings?: string[];
  semanticReport?: SemanticReport | null;
  reportMetadata?: ReportMetadata;
}

interface ExportReportButtonProps {
  module?: string;
  report?: ExportReportSnapshot | null;
  presentation?: ExportUserPresentation | null;
  reportMetadata?: ReportMetadata;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character] ?? character));
}

export function createExportReportHtml({
  title,
  generatedAt,
  report,
  notices = [],
  warnings = [],
  semanticReport,
  reportMetadata,
}: {
  title: string;
  generatedAt: string;
  report: ExportReportSnapshot;
  notices?: string[];
  warnings?: string[];
  semanticReport?: SemanticReport | null;
  reportMetadata?: ReportMetadata;
}): string {
  const resolvedSemanticReport = semanticReport ?? toSemanticReport(report, {
    disclaimers: [DEFAULT_TRADITIONAL_DISCLAIMER],
  });
  const factSection = resolvedSemanticReport.facts.length ? `
    <section class="facts">
      <h2>结构化事实核对</h2>
      <p class="boundary">以下内容已与本次推算结果核对；不包含传统解释、建议或现实效果判断。</p>
      <dl>${resolvedSemanticReport.facts.map((fact) => `<div><dt>${escapeHtml(fact.label)}</dt><dd>${escapeHtml(fact.value)}</dd></div>`).join('')}</dl>
    </section>` : '';
  const interpretationSection = resolvedSemanticReport.traditionalInterpretations.length ? `
    <section>
      <h2>传统解释</h2>
      ${resolvedSemanticReport.traditionalInterpretations.map((section) => `<h3>${escapeHtml(section.heading)}</h3><p>${escapeHtml(section.body).replace(/\n/g, '<br>')}</p>`).join('')}
    </section>` : '';
  const actionSection = resolvedSemanticReport.actions.length ? `
    <section>
      <h2>行动建议</h2>
      <ul>${resolvedSemanticReport.actions.map((action) => `<li>${escapeHtml(action.text)}</li>`).join('')}</ul>
    </section>` : '';
  const disclaimerSection = resolvedSemanticReport.disclaimers.length ? `
    <aside class="disclaimer">
      <h2>免责声明</h2>
      <ul>${resolvedSemanticReport.disclaimers.map((disclaimer) => `<li>${escapeHtml(disclaimer)}</li>`).join('')}</ul>
    </aside>` : '';
  const content = `${factSection}${interpretationSection}${actionSection}${disclaimerSection}`;
  const userWarnings = toUserWarnings(warnings);
  const noticeSection = notices.length ? `
    <aside class="notice">
      <h2>计算状态</h2>
      <ul>${notices.map((notice) => `<li>${escapeHtml(notice)}</li>`).join('')}</ul>
    </aside>` : '';
  const warningSection = userWarnings.length ? `
    <aside class="warning">
      <h2>使用限制与注意事项</h2>
      <ul>${userWarnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>
    </aside>` : '';
  const metadataSection = reportMetadata ? `
    <section class="report-metadata">
      <h2>本次分析口径</h2>
      <dl>${getReportMetadataItems(reportMetadata).map(({ label, value }) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
    </section>` : '';

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3eee1; color: #2e2823; font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif; line-height: 1.8; }
    main { width: min(860px, calc(100% - 32px)); margin: 40px auto; padding: 44px; background: #f7f3e8; border: 1px solid #d9d1bd; box-shadow: 0 8px 24px rgb(46 40 35 / 0.08); }
    header { padding-bottom: 24px; border-bottom: 1px solid #d9d1bd; }
    .eyebrow { margin: 0; color: #3d6053; font-size: 12px; letter-spacing: 0.12em; }
    h1, h2 { font-family: "Noto Serif SC", "Songti SC", "SimSun", serif; font-weight: 600; }
    h1 { margin: 6px 0 0; font-size: 30px; letter-spacing: 0.08em; }
    .meta { margin: 14px 0 0; color: #5c5348; font-size: 14px; }
    .summary { margin: 28px 0; padding: 18px 20px; border: 1px solid #c7bda5; background: #efe9da; font-family: "Noto Serif SC", "Songti SC", serif; font-size: 17px; }
    aside { margin: 18px 0; padding: 14px 16px; border: 1px solid #d9d1bd; }
    aside.notice { border-color: #b99b4d; background: #f4edda; }
    aside.warning { border-color: #b86a52; background: #f7e9e2; }
    aside.disclaimer { border-color: #9a8060; background: #eee5d5; }
    section { padding: 22px 0; border-top: 1px solid #d9d1bd; }
    section.facts { border-top-color: #92ad9f; }
    h2 { margin: 0 0 10px; color: #3d6053; font-size: 20px; }
    h3 { margin: 18px 0 4px; color: #51463c; font-size: 16px; }
    .boundary { color: #5c5348; font-size: 14px; }
    dl { margin: 14px 0 0; }
    dl > div { display: grid; grid-template-columns: minmax(7em, 0.35fr) 1fr; gap: 12px; padding: 8px 0; border-top: 1px dashed #d9d1bd; }
    dt { color: #5c5348; }
    dd { margin: 0; font-weight: 600; }
    ul { margin: 0; padding-left: 20px; }
    p { margin: 0; white-space: normal; }
    footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #d9d1bd; color: #6f6659; font-size: 12px; }
    @media print { body { background: #fff; } main { width: 100%; margin: 0; border: 0; box-shadow: none; } }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="eyebrow">传统文化参考</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="meta">生成时间：${escapeHtml(generatedAt)}<br>本次计算结果</p>
    </header>
    <div class="summary">${escapeHtml(report.summary).replace(/\n/g, '<br>')}</div>
    ${metadataSection}
    ${noticeSection}
    ${warningSection}
    ${content}
    <footer>本报告内容仅作传统文化参考。</footer>
  </main>
</body>
</html>`;
}

function defaultReport(title: string): ExportReportSnapshot {
  return {
    summary: `${title}报告`,
    sections: [{ heading: '报告内容', body: '当前页面尚未生成可导出的结果，请先完成输入或计算后再试。' }],
  };
}

export function ExportReportButton({ module, report, presentation, reportMetadata }: ExportReportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const title = module ?? '命盘报告';

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const content = createExportReportHtml({
        title,
        generatedAt: new Date().toLocaleString('zh-CN'),
        report: presentation?.report ?? report ?? defaultReport(title),
        notices: presentation?.notices,
        warnings: presentation?.warnings,
        semanticReport: presentation?.semanticReport,
        reportMetadata: presentation?.reportMetadata ?? reportMetadata,
      });
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}-${Date.now()}.html`;
      document.body.append(a);
      a.click();
      window.setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 0);
      dispatchCommandFeedback({
        title: '报告已导出',
        description: `${title} · 可在浏览器中打开`,
        tone: 'success',
      });
    } catch {
      dispatchCommandFeedback({
        title: '导出失败',
        description: '生成报告时出错',
        tone: 'info',
      });
    } finally {
      setExporting(false);
    }
  }, [presentation, report, reportMetadata, title]);

  return (
    <button
      type="button"
      onClick={() => void handleExport()}
      disabled={exporting}
      className="inline-flex items-center gap-1.5 rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1.5 text-xs font-semibold text-jade-400 transition hover:bg-jade-500/20 disabled:opacity-50"
    >
      {exporting ? '导出中…' : '导出报告'}
    </button>
  );
}
