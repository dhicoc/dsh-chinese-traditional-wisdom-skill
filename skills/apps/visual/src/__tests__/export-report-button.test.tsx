import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createExportReportHtml, ExportReportButton, type ExportUserPresentation } from '@/components/shared/ExportReportButton';
import { createReportMetadata } from '@/legacy/reportMetadata';

vi.mock('@/lib/birthContext', () => ({
  useBirth: () => ({
    birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男', isLunar: false },
    solarBirth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
  }),
}));

vi.mock('@/lib/commandIntents', () => ({
  dispatchCommandFeedback: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ExportReportButton', () => {
  it('生成可独立打开且转义正文的 HTML 报告', () => {
    const html = createExportReportHtml({
      title: '八字 <报告>',
      generatedAt: '2026/8/7 12:00:00',
      report: {
        summary: '日主 & 喜用神',
        sections: [{ heading: '结论 <一>', body: '保留 <标签>\n并换行' }],
      },
    });

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('八字 &lt;报告&gt;');
    expect(html).toContain('日主 &amp; 喜用神');
    expect(html).toContain('结论 &lt;一&gt;');
    expect(html).toContain('传统解释');
    expect(html).toContain('保留 &lt;标签&gt;<br>并换行');
    expect(html).toContain('免责声明');
    expect(html).toContain('本报告提供传统文化解释参考，不构成对现实结果、医疗、法律或财务事项的保证或专业建议。');
    expect(html).toContain('本报告内容仅作传统文化参考。');
  });

  it('以显式语义区块直观导出，并仅显示通过校验的事实', () => {
    const html = createExportReportHtml({
      title: '测试报告',
      generatedAt: '2026/8/7 12:00:00',
      report: { summary: '摘要', sections: [{ heading: '不应平铺', body: '旧章节内容' }] },
      semanticReport: {
        facts: [{ label: '日主 <核对>', value: '辛 & 金', tool: 'bazi_calculate' }],
        traditionalInterpretations: [{ heading: '命局观察', body: '保留 <传统解释>' }],
        actions: [{ text: '保持 <规律> 作息', category: '生活调整' }],
        disclaimers: ['不构成 <医疗> 建议。'],
      },
    });

    expect(html).toContain('结构化事实核对');
    expect(html).toContain('传统解释');
    expect(html).toContain('行动建议');
    expect(html).toContain('免责声明');
    expect(html).toContain('日主 &lt;核对&gt;');
    expect(html).toContain('辛 &amp; 金');
    expect(html).toContain('保留 &lt;传统解释&gt;');
    expect(html).toContain('保持 &lt;规律&gt; 作息');
    expect(html).toContain('不构成 &lt;医疗&gt; 建议。');
    expect(html).not.toContain('不应平铺');
    expect(html).not.toContain('旧章节内容');
  });

  it('从有效 presentation 的语义报告导出已核对事实，不暴露运行时附加内部字段', () => {
    const presentation: ExportUserPresentation = {
      report: { summary: '摘要', sections: [] },
      semanticReport: {
        facts: [{ label: '值宿', value: '角', tool: 'xingxiu_daily' }],
        traditionalInterpretations: [],
        actions: [],
        disclaimers: [],
      },
    };
    const reportWithInternalField = {
      ...presentation.report,
      evidence: 'INTERNAL_EVIDENCE_SENTINEL',
    };
    const presentationWithInternalField = {
      ...presentation,
      report: reportWithInternalField,
      internalEvidence: 'INTERNAL_EVIDENCE_SENTINEL',
    };
    const html = createExportReportHtml({
      title: '星宿报告',
      generatedAt: '2026/8/7 12:00:00',
      ...presentationWithInternalField,
    });

    expect(html).toContain('结构化事实核对');
    expect(html).toContain('值宿');
    expect(html).toContain('角');
    expect(html).not.toContain('INTERNAL_EVIDENCE_SENTINEL');
  });

  it('以 HTML Blob 和 .html 文件名下载传入的结构化报告', async () => {
    let downloadedBlob: Blob | undefined;
    let downloadName = '';
    const createObjectUrl = vi.fn((blob: Blob) => {
      downloadedBlob = blob;
      return 'blob:report';
    });
    const revokeObjectUrl = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
    });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl });

    render(
      <ExportReportButton
        module="八字命盘"
        report={{ summary: '结构化摘要', sections: [{ heading: '命局要览', body: '日主辛金' }] }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '导出报告' }));

    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(downloadedBlob?.type).toBe('text/html;charset=utf-8');
    expect(downloadName).toMatch(/^八字命盘-\d+\.html$/);
    expect(downloadName).not.toContain('1990');
    await waitFor(() => expect(revokeObjectUrl).toHaveBeenCalledWith('blob:report'));
    await expect(downloadedBlob?.text()).resolves.toContain('结构化摘要');
    await expect(downloadedBlob?.text()).resolves.toContain('命局要览');
    await expect(downloadedBlob?.text()).resolves.not.toContain('出生资料：');
    await expect(downloadedBlob?.text()).resolves.not.toContain('1990年出生，男，公历');
  });

  it('只导出摘要与章节，不输出快照附带的内部元信息', () => {
    const report = {
      summary: '用户可见摘要',
      sections: [{ heading: '用户章节', body: '用户可见内容' }],
      sourceNotes: 'lunar-javascript / internal adapter',
      tags: ['local-exact', 'engineName'],
    };
    const html = createExportReportHtml({
      title: '测试报告',
      generatedAt: '2026/8/7 12:00:00',
      report,
    });

    expect(html).toContain('用户可见摘要');
    expect(html).toContain('用户可见内容');
    expect(html).not.toContain('lunar-javascript');
    expect(html).not.toContain('internal adapter');
    expect(html).not.toContain('local-exact');
    expect(html).not.toContain('engineName');
  });

  it('导出用户级计算状态与注意事项', () => {
    const html = createExportReportHtml({
      title: '测试报告',
      generatedAt: '2026/8/7 12:00:00',
      report: { summary: '摘要', sections: [] },
      notices: ['未完成真太阳时复核'], 
      warnings: ['流派口径可能存在差异'],
    });

    expect(html).toContain('计算状态');
    expect(html).toContain('未完成真太阳时复核');
    expect(html).toContain('使用限制与注意事项');
    expect(html).toContain('流派口径可能存在差异');
  });

  it('导出报告会收束内部 warning，且不显示实现标识', () => {
    const html = createExportReportHtml({
      title: '测试报告',
      generatedAt: '2026/8/7 12:00:00',
      report: { summary: '摘要', sections: [] },
      warnings: [
        '已通过 lunar-javascript/Solar 全局对象读取节气干支；大运按节气余气精确起运。',
        'engineName: internal-engine，来源 private.ts。',
      ],
    });

    expect(html).toContain('本次推算已按传统历法口径处理，结果仅作传统文化参考。');
    expect(html).not.toContain('lunar-javascript');
    expect(html).not.toContain('Solar');
    expect(html).not.toContain('engineName');
    expect(html).not.toContain('internal-engine');
    expect(html).not.toContain('private.ts');
    expect(html).not.toContain('本地计算结果');
    expect(html).toContain('本次计算结果');
  });

  it('以与 Dashboard 相同的字段和顺序导出本次分析口径', () => {
    const reportMetadata = createReportMetadata({
      inputSummary: '本次按出生资料排盘；报告不保留完整出生资料。',
      reportVersion: '1.0',
      capabilityMode: '按出生资料排盘',
      timeBasis: 'civil-unverified',
    });
    const html = createExportReportHtml({
      title: '测试报告',
      generatedAt: '2026/8/7 12:00:00',
      report: { summary: '摘要', sections: [] },
      reportMetadata,
    });

    const labels = ['本次分析说明', '报告版本', '结果状态', '时间口径'];
    expect(html).toContain('本次分析口径');
    expect(html.indexOf(labels[0])).toBeLessThan(html.indexOf(labels[1]));
    expect(html.indexOf(labels[1])).toBeLessThan(html.indexOf(labels[2]));
    expect(html.indexOf(labels[2])).toBeLessThan(html.indexOf(labels[3]));
    expect(html).toContain('按出生资料排盘');
    expect(html).toContain('民用时间（未完成真太阳时复核）');
    expect(html).not.toContain('BaziLunarAdapter');
    expect(html).not.toContain('local-exact');
    expect(html).not.toContain('@0.3.0');
  });

  it('未传入报告时不读取页面文本或导出内部说明', async () => {
    let downloadedBlob: Blob | undefined;
    const pageContent = document.createElement('main');
    pageContent.textContent = 'engineName: internal-engine\nsource: private.ts\n不应进入报告';
    document.body.append(pageContent);
    const createObjectUrl = vi.fn((blob: Blob) => {
      downloadedBlob = blob;
      return 'blob:default-report';
    });
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<ExportReportButton module="测试页面" />);
    fireEvent.click(screen.getByRole('button', { name: '导出报告' }));

    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    const html = await downloadedBlob?.text();
    expect(html).toContain('当前页面尚未生成可导出的结果，请先完成输入或计算后再试。');
    expect(html).not.toContain('internal-engine');
    expect(html).not.toContain('private.ts');
    pageContent.remove();
  });
});
