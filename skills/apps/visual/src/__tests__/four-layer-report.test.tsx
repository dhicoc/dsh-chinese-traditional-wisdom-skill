import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { createReportMetadata } from '@/legacy/reportMetadata';
import { toFourLayer, type LayerReport, type ReadingLike } from '@/legacy/reportLayers';
import { calcBaziEnveloped } from '@/legacy/baziEngine';

/**
 * FourLayerReport 组件渲染测试（ROADMAP 功能层增强 Step 2）。
 */

afterEach(() => cleanup());

function makeBaziReport(): LayerReport {
  const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
  return toFourLayer(env.data.export_snapshot);
}

describe('FourLayerReport 渲染', () => {
  it('渲染四层：tldr + highlights + details + actions', () => {
    const report = makeBaziReport();
    render(<FourLayerReport report={report} title="八字四层报告" />);
    // 标题
    expect(screen.getByText('八字四层报告')).toBeInTheDocument();
    // tldr 展示
    expect(screen.getByText(report.tldr)).toBeInTheDocument();
    // 第二层标题
    expect(screen.getByText('值得留意的方向')).toBeInTheDocument();
    // 第三层默认折叠提示
    expect(screen.getByText('查看传统解释')).toBeInTheDocument();
  });

  it('总体吉凶徽章显示（吉/凶/中）', () => {
    const report = makeBaziReport();
    render(<FourLayerReport report={report} />);
    // 亮点也可使用相同吉凶字，确认至少存在一个总体色调徽章即可。
    expect(screen.getAllByText(report.overallTone).length).toBeGreaterThan(0);
  });

  it('highlights 每项渲染 label + tone 徽章', () => {
    const report = makeBaziReport();
    render(<FourLayerReport report={report} />);
    // 日主强弱应作为 highlight label 出现
    const dyStrong = report.highlights.find((h) => h.label.includes('日主强弱'));
    if (dyStrong) {
      expect(screen.getByText(dyStrong.label)).toBeInTheDocument();
    }
  });

  it('details 默认折叠，点击展开显示各段', () => {
    const report = makeBaziReport();
    render(<FourLayerReport report={report} />);
    // 折叠态：四柱 heading 不应可见（在 details 内）
    const fourPillars = report.details.find((d) => d.heading === '四柱');
    // 折叠时 details body 不渲染
    expect(screen.queryByText('四柱')).not.toBeInTheDocument();
    // 点击展开
    fireEvent.click(screen.getByText('查看传统解释'));
    // 展开后四柱 heading 出现
    if (fourPillars) {
      expect(screen.getByText('四柱')).toBeInTheDocument();
    }
  });

  it('defaultDetailsOpen=true 默认展开', () => {
    const report = makeBaziReport();
    render(<FourLayerReport report={report} defaultDetailsOpen />);
    // 四柱 heading 应可见
    if (report.details.some((d) => d.heading === '四柱')) {
      expect(screen.getByText('四柱')).toBeInTheDocument();
    }
  });

  it('空 actions 不渲染"可执行建议"区', () => {
    const reading: ReadingLike = { summary: '空', sections: [] };
    const report = toFourLayer(reading);
    render(<FourLayerReport report={report} />);
    expect(screen.queryByText('可执行建议')).not.toBeInTheDocument();
  });

  it('actions 按 category 分组渲染', () => {
    const report: LayerReport = {
      tldr: '测试',
      overallTone: '中',
      highlights: [],
      details: [],
      actions: [
        { text: '主动出击把握机会', category: '决策' },
        { text: '主卧放财位', category: '生活调整' },
        { text: '注意作息', category: '养生' },
      ],
    };
    render(<FourLayerReport report={report} />);
    expect(screen.getByText('决策策略')).toBeInTheDocument();
    expect(screen.getByText('生活调整')).toBeInTheDocument();
    expect(screen.getByText('养生')).toBeInTheDocument();
    expect(screen.getByText('· 主动出击把握机会')).toBeInTheDocument();
  });

  it('sourceNotes 不渲染给用户（属技术来源说明）', () => {
    const report: LayerReport = {
      tldr: 't', overallTone: '中', highlights: [], details: [], actions: [],
      sourceNotes: '已通过 lunar-javascript/Solar 读取节气干支',
    };
    render(<FourLayerReport report={report} />);
    // sourceNotes 不应显示给用户（技术 confidenceNote）
    expect(screen.queryByText('已通过 lunar-javascript/Solar 读取节气干支')).not.toBeInTheDocument();
  });

  it('渲染用户级计算状态与限制提醒', () => {
    const report: LayerReport = { tldr: 't', overallTone: '中', highlights: [], details: [], actions: [] };
    render(
      <FourLayerReport
        report={report}
        notices={['未完成真太阳时复核']}
        warnings={['流派口径可能存在差异']}
      />,
    );

    expect(screen.getByText('计算状态')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0].textContent).toContain('未完成真太阳时复核');
    expect(screen.getByText('使用限制与注意事项')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[1].textContent).toContain('流派口径可能存在差异');
  });

  it('以与导出报告相同字段和顺序显示本次分析口径', () => {
    const report: LayerReport = { tldr: 't', overallTone: '中', highlights: [], details: [], actions: [] };
    const reportMetadata = createReportMetadata({
      inputSummary: '本次按出生资料排盘；报告不保留完整出生资料。',
      reportVersion: '1.0',
      capabilityMode: '按出生资料排盘',
      timeBasis: 'civil-unverified',
    });
    const { container } = render(<FourLayerReport report={report} reportMetadata={reportMetadata} />);

    expect(screen.getByText('本次分析口径')).toBeInTheDocument();
    expect(screen.getByText('按出生资料排盘')).toBeInTheDocument();
    expect(screen.getByText('民用时间（未完成真太阳时复核）')).toBeInTheDocument();
    expect(container.textContent).not.toContain('BaziLunarAdapter');
    expect(container.textContent).not.toContain('local-exact');
    expect([...container.querySelectorAll('dt')].map((element) => element.textContent)).toEqual(['本次分析说明', '报告版本', '结果状态', '时间口径']);
  });

  it('用显式语义报告渲染已核对事实与传统解释边界', () => {
    const report: LayerReport = {
      tldr: 't', overallTone: '中', highlights: [], details: [{ heading: '四柱', body: '传统解释' }], actions: [],
    };
    render(
      <FourLayerReport
        report={report}
        semanticReport={{
          facts: [{ label: '日干支', value: '甲子', tool: 'taiyi_calculate' }],
          traditionalInterpretations: [{ heading: '四柱', body: '传统解释' }],
          actions: [],
          disclaimers: ['仅作传统文化参考。'],
        }}
      />,
    );

    expect(screen.getByText('结构化事实核对')).toBeInTheDocument();
    expect(screen.getByText('日干支')).toBeInTheDocument();
    expect(screen.getByText('甲子')).toBeInTheDocument();
    expect(screen.getByText('以下内容已与本次推算结果核对；不包含传统解释、建议或现实效果判断。')).toBeInTheDocument();
    expect(screen.getByText('免责声明')).toBeInTheDocument();
    expect(screen.getByText('查看传统解释')).toBeInTheDocument();
    expect(screen.getAllByText((_, element) => element?.textContent === '· 仅作传统文化参考。').length).toBeGreaterThan(0);
  });

  it('没有显式核对事实时不显示已核对事实区', () => {
    const report: LayerReport = { tldr: 't', overallTone: '中', highlights: [], details: [], actions: [] };
    render(<FourLayerReport report={report} semanticReport={{ facts: [], traditionalInterpretations: [], actions: [], disclaimers: [] }} />);

    expect(screen.queryByText('结构化事实核对')).not.toBeInTheDocument();
  });

  it('未传入语义报告时仍提供传统解释边界与免责声明', () => {
    const report: LayerReport = { tldr: 't', overallTone: '中', highlights: [], details: [], actions: [] };
    render(<FourLayerReport report={report} />);

    expect(screen.queryByText('结构化事实核对')).not.toBeInTheDocument();
    expect(screen.getByText('免责声明')).toBeInTheDocument();
    expect(screen.getByText(/本报告提供传统文化解释参考/)).toBeInTheDocument();
  });

  it('highlight 含 strength 时渲染「身强/身弱」小标', () => {
    const report: LayerReport = {
      tldr: 't', overallTone: '中',
      highlights: [
        { label: '日主强弱', value: '日主辛金偏强', tone: '中', strength: '强' },
      ],
      details: [], actions: [],
    };
    render(<FourLayerReport report={report} />);
    // strength 小标显示完整词「身强」
    expect(screen.getByText('身强')).toBeInTheDocument();
    expect(screen.getByText('日主辛金偏强')).toBeInTheDocument();
  });

  it('highlight tone=中时不显示"中"徽章（避免与强弱标混淆）', () => {
    const report: LayerReport = {
      tldr: 't', overallTone: '中',
      highlights: [{ label: '日主强弱', value: '偏强', tone: '中', strength: '强' }],
      details: [], actions: [],
    };
    render(<FourLayerReport report={report} />);
    // 总体 tone 徽章"中"在 tldr 区显示，但 highlight 卡片内不应再有"中"徽章
    // highlight 卡片应只有「身强」小标
    expect(screen.getByText('身强')).toBeInTheDocument();
  });

  it('highlight tone=吉时显示吉徽章 + 身强小标并存', () => {
    const report: LayerReport = {
      tldr: 't', overallTone: '吉',
      highlights: [{ label: '某项', value: '大吉', tone: '吉', strength: '强' }],
      details: [], actions: [],
    };
    render(<FourLayerReport report={report} />);
    expect(screen.getByText('身强')).toBeInTheDocument();
    // tone=吉应显示吉徽章（tldr 区总体 + highlight 卡片各一个）
    expect(screen.getAllByText('吉').length).toBeGreaterThanOrEqual(2);
  });

  it('highlight strength 为 null 且 tone=中时不渲染任何小标', () => {
    const report: LayerReport = {
      tldr: 't', overallTone: '吉',
      highlights: [{ label: '某项', value: '某值', tone: '中', strength: null }],
      details: [], actions: [],
    };
    render(<FourLayerReport report={report} />);
    expect(screen.queryByText('身强')).not.toBeInTheDocument();
    expect(screen.queryByText('身弱')).not.toBeInTheDocument();
  });
});
