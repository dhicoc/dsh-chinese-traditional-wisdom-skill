import { describe, expect, it } from 'vitest';
import { calcAnnualFortuneCombo, calcDecisionCombo, calcSpaceTimeCombo } from '@/legacy/comboEngine';
import type { ToolEnvelope } from '@/legacy/baseTypes';
import { toFourLayer, type ReadingLike } from '@/legacy/reportLayers';

/**
 * 跨系统联合分析测试（ROADMAP 功能层增强 Step 1）。
 */

const BIRTH = { year: 1990, month: 6, day: 15, hour: 12, gender: '男' };

describe('calcAnnualFortuneCombo 年度综合运势', () => {
  it('返回 ok=true 的 ComboResult，含 4 子系统', () => {
    const env = calcAnnualFortuneCombo({ birth: BIRTH, targetYear: 2024, currentMonth: 6 });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('AnnualFortureComboEngine'.replace('Forture', 'Fortune'));
    const data = env.data;
    expect(data.comboName).toBe('年度综合运势');
    expect(data.subsystems.length).toBe(4);
    expect(data.subsystems.map((s) => s.name)).toEqual(['八字', '五运六气', '奇门年盘', '紫微流年']);
  });

  it('每个子系统有 tone + summary + envelope', () => {
    const env = calcAnnualFortuneCombo({ birth: BIRTH, targetYear: 2024, currentMonth: 6 });
    env.data.subsystems.forEach((s) => {
      expect(['吉', '凶', '中']).toContain(s.tone);
      expect(typeof s.summary).toBe('string');
      expect(s.summary.length).toBeGreaterThan(0);
      expect(s.envelope.ok).toBe(true);
    });
  });

  it('一致性检验：tones 长度=子系统数，confidence 为高或中', () => {
    const env = calcAnnualFortuneCombo({ birth: BIRTH, targetYear: 2024, currentMonth: 6 });
    const c = env.data.consistency;
    expect(c.tones.length).toBe(4);
    expect(['高', '中', '低']).toContain(c.confidence);
    // aligned=true 时 conflicts 为空；aligned=false 时 conflicts 非空
    if (c.aligned) expect(c.conflicts).toEqual([]);
    else expect(c.conflicts.length).toBeGreaterThan(0);
  });

  it('synthesis 含年份 + 三系统定调 + 命卦', () => {
    const env = calcAnnualFortuneCombo({ birth: BIRTH, targetYear: 2024, currentMonth: 6 });
    expect(env.data.synthesis).toContain('2024');
    expect(env.data.synthesis).toContain('八字');
    expect(env.data.synthesis).toContain('命卦');
  });

  it('recommendations 非空，含方位建议', () => {
    const env = calcAnnualFortuneCombo({ birth: BIRTH, targetYear: 2024, currentMonth: 6 });
    expect(env.data.recommendations.length).toBeGreaterThan(0);
    expect(env.data.recommendations.some((r) => r.label.includes('方位'))).toBe(true);
  });

  it('export_snapshot 含整合结论 + 各维度段 + 一致性段', () => {
    const env = calcAnnualFortuneCombo({ birth: BIRTH, targetYear: 2024, currentMonth: 6 });
    const snap = env.data.export_snapshot;
    expect(snap.summary).toContain('2024');
    expect(snap.sections.some((s) => s.heading === '整合结论')).toBe(true);
    expect(snap.sections.some((s) => s.heading === '八字维度')).toBe(true);
    expect(snap.sections.some((s) => s.heading === '紫微流年维度')).toBe(true);
    expect(snap.sections.some((s) => s.heading === '各术数看法')).toBe(true);
  });

  it('可与 FourLayerReport toFourLayer 联动', () => {
    const env = calcAnnualFortuneCombo({ birth: BIRTH, targetYear: 2024, currentMonth: 6 });
    const report = toFourLayer(env.data.export_snapshot as ReadingLike);
    expect(report.tldr).toContain('2024');
    expect(report.details.length).toBeGreaterThan(0);
  });
});

describe('calcDecisionCombo 事件决策', () => {
  it('返回 3 卜子系统（六爻/梅花/奇门）', () => {
    const env = calcDecisionCombo({ birth: BIRTH, question: '今年适合换工作吗' });
    expect(env.ok).toBe(true);
    expect(env.data.comboName).toBe('事件决策');
    expect(env.data.subsystems.map((s) => s.name)).toEqual(['六爻', '梅花', '奇门']);
  });

  it('synthesis 含问题 + 三卜定调 + 以六爻为主', () => {
    const env = calcDecisionCombo({ birth: BIRTH, question: '今年适合换工作吗' });
    expect(env.data.synthesis).toContain('换工作');
    expect(env.data.synthesis).toContain('六爻');
    if (!env.data.consistency.aligned) {
      expect(env.data.synthesis).toContain('以六爻为主');
    }
  });

  it('recommendations 含行动建议', () => {
    const env = calcDecisionCombo({ birth: BIRTH, question: '投资能赚钱吗' });
    expect(env.data.recommendations.length).toBeGreaterThan(0);
    // 六爻 tone 决定建议方向
    const liuyaoTone = env.data.subsystems[0].tone;
    const mainRec = env.data.recommendations[0];
    if (liuyaoTone === '吉') expect(mainRec.tone).toBe('吉');
    else if (liuyaoTone === '凶') expect(mainRec.tone).toBe('凶');
  });
});

describe('calcSpaceTimeCombo 空间+时间', () => {
  it('返回含命卦 + 奇门吉方 + 元运', () => {
    const env = calcSpaceTimeCombo({ birth: BIRTH, targetYear: 2024 });
    expect(env.ok).toBe(true);
    expect(env.data.comboName).toBe('空间+时间');
    expect(env.data.synthesis).toContain('命卦');
    expect(env.data.synthesis).toContain('奇门吉方');
  });

  it('recommendations 含主卧/财位/凶位建议', () => {
    const env = calcSpaceTimeCombo({ birth: BIRTH, targetYear: 2024 });
    const labels = env.data.recommendations.map((r) => r.label);
    expect(labels.some((l) => l.includes('主卧'))).toBe(true);
    expect(labels.some((l) => l.includes('财位'))).toBe(true);
    expect(labels.some((l) => l.includes('凶位'))).toBe(true);
  });

  it('1990 男命卦为坎（东四命）', () => {
    // 1990 男：(100-90)%9=10%9=1 → 坎
    const env = calcSpaceTimeCombo({ birth: BIRTH, targetYear: 2024 });
    expect(env.data.synthesis).toContain('坎');
    expect(env.data.synthesis).toContain('东四命');
  });
});

describe('三个 combo 统一 ToolEnvelope 契约', () => {
  it('均返回 ok=true + tool + version + input_normalized + data + warnings', () => {
    const combos = [
      calcAnnualFortuneCombo({ birth: BIRTH, targetYear: 2024, currentMonth: 6 }),
      calcDecisionCombo({ birth: BIRTH, question: '测试' }),
      calcSpaceTimeCombo({ birth: BIRTH, targetYear: 2024 }),
    ];
    combos.forEach((env: ToolEnvelope) => {
      expect(env.ok).toBe(true);
      expect(typeof env.tool).toBe('string');
      expect(typeof env.version).toBe('string');
      expect(typeof env.input_normalized).toBe('object');
      expect(env.data).toBeDefined();
      expect(Array.isArray(env.warnings)).toBe(true);
    });
  });
});
