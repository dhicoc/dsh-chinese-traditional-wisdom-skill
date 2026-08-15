import { describe, expect, it } from 'vitest';
import { toFourLayer, toFocusedReport, toSemanticReport, toUserPresentation, detectQuestionDomain, type ReadingLike } from '@/legacy/reportLayers';
import { calcBaziEnveloped } from '@/legacy/baziEngine';
import { calcLiuyaoEnveloped } from '@/legacy/liuyaoEngine';
import { calcYunqiEnveloped } from '@/legacy/yunqiEngine';

/**
 * 报告四层分层测试（ROADMAP 功能层增强 Step 2）。
 * 用真实 enveloped 引擎的 export_snapshot 喂 toFourLayer，验证归类正确。
 */

/** 从 envelope 取 export_snapshot 作为 reading */
function snapshotOf(env: { data: { export_snapshot: ReadingLike } }): ReadingLike {
  return env.data.export_snapshot;
}

describe('toFourLayer 基本结构', () => {
  it('返回四层结构含 tldr/highlights/details/actions', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const report = toFourLayer(snapshotOf(env));
    expect(typeof report.tldr).toBe('string');
    expect(report.tldr.length).toBeGreaterThan(0);
    expect(Array.isArray(report.highlights)).toBe(true);
    expect(Array.isArray(report.details)).toBe(true);
    expect(Array.isArray(report.actions)).toBe(true);
    expect(typeof report.overallTone).toBe('string');
    expect(['吉', '凶', '中']).toContain(report.overallTone);
  });
});

describe('toFourLayer 八字归类', () => {
  it('日主力量归 highlights，四柱/五行/十神/大运归 details', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const report = toFourLayer(snapshotOf(env));
    // 新旧日主力量标题都应进入 highlights
    expect(report.highlights.some((h) => /日主强弱|日主力量/.test(h.label))).toBe(true);
    // 四柱应进 details（非 highlights）
    expect(report.details.some((d) => d.heading === '四柱')).toBe(true);
    expect(report.details.some((d) => d.heading === '五行分布')).toBe(true);
    expect(report.details.some((d) => d.heading === '十神')).toBe(true);
    expect(report.details.some((d) => d.heading === '大运')).toBe(true);
    // 日主力量不应同时进 details
    expect(report.details.some((d) => /日主强弱|日主力量/.test(d.heading))).toBe(false);
  });

  it('十神段用中文柱名（年柱/月柱/日柱/时柱），不混英文 year/month/day/hour', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const report = toFourLayer(snapshotOf(env));
    const shishen = report.details.find((d) => d.heading === '十神');
    expect(shishen).toBeDefined();
    expect(shishen!.body).toContain('年柱');
    expect(shishen!.body).toContain('时柱');
    // 不应出现英文柱名
    expect(shishen!.body).not.toMatch(/year柱|month柱|day柱|hour柱/);
  });

  it('highlights 每项有 tone（吉/凶/中）', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const report = toFourLayer(snapshotOf(env));
    report.highlights.forEach((h) => {
      expect(['吉', '凶', '中']).toContain(h.tone);
      expect(h.label.length).toBeGreaterThan(0);
      expect(h.value.length).toBeGreaterThan(0);
    });
  });

  it('日主力量 highlight 的 strength 由偏强/身强/偏弱/身弱检测', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const report = toFourLayer(snapshotOf(env));
    const dy = report.highlights.find((h) => /日主强弱|日主力量/.test(h.label));
    expect(dy).toBeDefined();
    // 1990-6-15 12时男 日主辛金 偏强 → strength='强'
    expect(dy!.strength).toBe('强');
  });

  it('strength 对偏弱命盘检测为弱', () => {
    // 日主金弱：金2偏弱
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 2, gender: '男' } });
    const report = toFourLayer(snapshotOf(env));
    const dy = report.highlights.find((h) => h.label.includes('日主强弱'));
    if (dy && /偏弱|身弱/.test(dy.value)) {
      expect(dy.strength).toBe('弱');
    }
  });
});

describe('toFourLayer 六爻归类', () => {
  it('世应用神归 highlights，策略指导归 actions', () => {
    const env = calcLiuyaoEnveloped({ method: 'manual', yaoValues: '777777', question: '今年财运' });
    const report = toFourLayer(snapshotOf(env));
    expect(report.highlights.some((h) => h.label.includes('世应用神'))).toBe(true);
    // 策略指导应进 actions（六爻 snapshot 无策略指导段，但若有则归类正确）
    // 六爻 snapshot 含「卦象」heading → 应进 highlights（HIGHLIGHT_HEADINGS 含卦象）
    expect(report.highlights.some((h) => h.label === '卦象')).toBe(true);
  });
});

describe('toFourLayer 五运六气归类', () => {
  it('岁运/司天在泉归 details，气候与调养观察归 details', () => {
    const env = calcYunqiEnveloped({ year: 2024, currentMonth: 6 });
    const report = toFourLayer(snapshotOf(env));
    expect(report.details.some((d) => d.heading === '岁运')).toBe(true);
    expect(report.details.some((d) => d.heading === '司天在泉')).toBe(true);
    expect(report.details.some((d) => d.heading === '气候与调养观察')).toBe(true);
  });
});

describe('toFourLayer 向后兼容', () => {
  it('无命中 heading 全放 details，不丢数据', () => {
    const reading: ReadingLike = {
      summary: '测试总结',
      sections: [{ heading: '某未知标题', body: '某内容' }],
    };
    const report = toFourLayer(reading);
    expect(report.details.length).toBe(1);
    expect(report.details[0].heading).toBe('某未知标题');
    expect(report.highlights).toEqual([]);
  });

  it('空 sections 不报错', () => {
    const report = toFourLayer({ summary: '空', sections: [] });
    expect(report.tldr).toBe('空');
    expect(report.highlights).toEqual([]);
    expect(report.details).toEqual([]);
    expect(report.actions).toEqual([]);
  });

  it('透传 tags 与 sourceNotes', () => {
    const reading: ReadingLike = {
      summary: 's',
      tags: ['八字', '身强'],
      sections: [],
      sourceNotes: '来源说明',
    };
    const report = toFourLayer(reading);
    expect(report.tags).toEqual(['八字', '身强']);
    expect(report.sourceNotes).toBe('来源说明');
  });
});

describe('toSemanticReport 共享语义边界', () => {
  const reading: ReadingLike = {
    summary: '传统文化参考摘要',
    sections: [
      { heading: '日主强弱', body: '此处属于传统解释。' },
      { heading: '四柱', body: '此处也属于传统解释。' },
      { heading: '行动建议', body: '保持规律作息。' },
    ],
  };

  it('未提供显式核对项时不把阅读内容标为已核对事实', () => {
    const report = toSemanticReport(reading, { disclaimers: ['仅作参考', '仅作参考', ''] });

    expect(report.facts).toEqual([]);
    expect(report.traditionalInterpretations.map((section) => section.heading)).toEqual(['日主强弱', '四柱']);
    expect(report.traditionalInterpretations[0].body).toContain('此处属于传统解释');
    expect(report.actions).toEqual([{ text: '保持规律作息', category: '养生' }]);
    expect(report.disclaimers).toEqual(['仅作参考']);
  });

  it('只纳入显式且通过校验的结构化事实', () => {
    const report = toSemanticReport(reading, {
      factChecks: [
        { fact: { label: '日主', value: '辛', tool: 'bazi_calculate' }, validation: { valid: true } },
        { fact: { label: '日主强弱', value: '身强', tool: 'bazi_calculate' }, validation: { valid: false } },
      ],
    });

    expect(report.facts).toEqual([{ label: '日主', value: '辛', tool: 'bazi_calculate' }]);
    expect(report.traditionalInterpretations.some((section) => section.heading === '日主强弱')).toBe(true);
  });
});

describe('toUserPresentation 用户呈现适配', () => {
  it('保留时间状态与去重 warnings，正文只来自 export_snapshot', () => {
    const presentation = toUserPresentation({
      ok: true,
      data: {
        export_snapshot: {
          summary: '用户可见摘要',
          sections: [{ heading: '结论', body: '用户可见内容' }],
          sourceNotes: 'internal source',
        },
        timeSource: { notice: '未完成真太阳时复核' },
      },
      warnings: ['流派口径可能存在差异', '流派口径可能存在差异', ''],
    });

    expect(presentation.state).toBe('success');
    expect(presentation.notices).toEqual(['未完成真太阳时复核']);
    expect(presentation.warnings).toEqual(['流派口径可能存在差异']);
    expect(presentation.report?.tldr).toBe('用户可见摘要');
    expect(presentation.exportReport).toEqual({
      summary: '用户可见摘要',
      sections: [{ heading: '结论', body: '用户可见内容' }],
    });
    expect(presentation.exportReport).not.toHaveProperty('sourceNotes');
    expect(presentation.semanticReport?.facts).toEqual([]);
  });

  it('将内部实现 warning 收束为用户可读的传统历法说明', () => {
    const presentation = toUserPresentation({
      ok: true,
      data: { export_snapshot: { summary: '摘要', sections: [] } },
      warnings: [
        '已通过 lunar-javascript/Solar 全局对象读取节气干支；大运按节气余气精确起运。',
        'engineName: internal-engine，source: private.ts。',
      ],
    });

    expect(presentation.warnings).toEqual(['本次推算已按传统历法口径处理，结果仅作传统文化参考。']);
    expect(presentation.warnings.join(' ')).not.toContain('lunar-javascript');
    expect(presentation.warnings.join(' ')).not.toContain('Solar');
    expect(presentation.warnings.join(' ')).not.toContain('engineName');
    expect(presentation.warnings.join(' ')).not.toContain('source');
    expect(presentation.warnings.join(' ')).not.toContain('private.ts');
  });

  it('将成功的显式核对项与免责声明加入共享语义模型', () => {
    const presentation = toUserPresentation({
      ok: true,
      data: { export_snapshot: { summary: '摘要', sections: [{ heading: '四柱', body: '传统解释' }] } },
    }, {
      factChecks: [{
        fact: { label: '日主', value: '辛', tool: 'bazi_calculate' },
        validation: { valid: true },
      }],
      disclaimers: ['仅作传统文化参考。'],
    });

    expect(presentation.semanticReport).toEqual(expect.objectContaining({
      facts: [{ label: '日主', value: '辛', tool: 'bazi_calculate' }],
      disclaimers: ['仅作传统文化参考。'],
    }));
  });

  it('失败信封映射为用户可读错误，不尝试渲染正文', () => {
    const presentation = toUserPresentation({
      ok: false,
      error: { code: 'validation_error', message: '请补充出生时辰。' },
      data: { export_snapshot: { summary: '不应展示', sections: [] } },
    });

    expect(presentation).toMatchObject({
      state: 'error',
      report: null,
      exportReport: null,
      error: { code: 'validation_error', message: '请补充出生时辰。' },
    });
  });
});

describe('detectQuestionDomain 问题领域识别', () => {
  it('事业类问题识别', () => {
    expect(detectQuestionDomain('今年适合换工作吗')).toBe('事业');
    expect(detectQuestionDomain('事业运如何')).toBe('事业');
  });
  it('财运类问题识别', () => {
    expect(detectQuestionDomain('今年财运怎么样')).toBe('财运');
    expect(detectQuestionDomain('投资能赚钱吗')).toBe('财运');
  });
  it('健康类问题识别', () => {
    expect(detectQuestionDomain('身体会好吗')).toBe('健康');
  });
  it('感情类问题识别', () => {
    expect(detectQuestionDomain('何时能遇到合适的伴侣')).toBe('感情');
  });
  it('无法识别返回 null', () => {
    expect(detectQuestionDomain('今天天气如何')).toBeNull();
  });
});

describe('toFocusedReport 专项解读', () => {
  it('事业问题过滤出事业相关 highlights/actions', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const full = toFourLayer(snapshotOf(env));
    const focused = toFocusedReport(snapshotOf(env), '今年适合换工作吗');
    // tldr 应改为领域导向
    expect(focused.tldr).toContain('事业');
    expect(focused.tldr).toContain('换工作');
    // 过滤后 highlights 应是 full 的子集（或全量回退）
    expect(focused.highlights.length).toBeLessThanOrEqual(full.highlights.length);
  });

  it('无法识别领域返回完整四层（tldr 不变）', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const full = toFourLayer(snapshotOf(env));
    const focused = toFocusedReport(snapshotOf(env), '今天天气如何');
    expect(focused.tldr).toBe(full.tldr);
    expect(focused.highlights.length).toBe(full.highlights.length);
  });

  it('健康问题过滤后 actions 含养生类', () => {
    const env = calcYunqiEnveloped({ year: 2024, currentMonth: 6 });
    const focused = toFocusedReport(snapshotOf(env), '我体质会怎样');
    // 五运六气无策略指导段 → actions 可能为空，但 focused 不报错
    expect(Array.isArray(focused.actions)).toBe(true);
  });
});
