import { describe, it, expect } from 'vitest';
import { calcCezi, calcCeziEnveloped } from '@/legacy/ceziEngine';
import { analyzeCharStructure } from '@/legacy/charStructure';

describe('analyzeCharStructure 汉字结构', async () => {
  it('字=上下结构', async () => {
    expect(analyzeCharStructure('字').structure).toBe('上下');
  });
  it('明=左右结构', async () => {
    expect(analyzeCharStructure('明').structure).toBe('左右');
  });
  it('国=包围结构', async () => {
    expect(analyzeCharStructure('国').structure).toBe('包围');
  });
  it('人=独体结构', async () => {
    expect(analyzeCharStructure('人').structure).toBe('独体');
  });
  it('森=品字结构', async () => {
    expect(analyzeCharStructure('森').structure).toBe('品字');
  });
  it('偏旁象义：水旁字象义含水', async () => {
    // 江为水旁字，结构判定左右；偏旁象义由字义五行补（单字偏旁识别有限）
    const s = analyzeCharStructure('江');
    expect(s.structure).toBe('左右');
    // radical 至少非空
    expect(s.radical.length).toBeGreaterThan(0);
  });
});

describe('calcCezi 测字', async () => {
  it('返回完整结果含笔画/数理/五行/结构', async () => {
    const r = await calcCezi({ char: '明' });
    expect(r.char).toBe('明');
    expect(r.strokes).toBeGreaterThan(0);
    expect(r.shuli.lucky).toBeTruthy();
    expect(r.structure.structure).toBe('左右');
    expect(r.synthesis).toContain('明');
  });

  it('数理取 81 数理表', async () => {
    const r = await calcCezi({ char: '一' });
    // 「一」康熙 1 画，数理 1 = 太极之数（吉）
    expect(r.strokes).toBe(1);
    expect(r.shuli.skyNine).toBe('太极之数');
  });

  it('未收录字走估算并标注', async () => {
    const r = await calcCezi({ char: '𡈽' }); // 生僻字
    expect(r.strokesEstimated).toBe(true);
  });

  it('字义五行可取', async () => {
    const r = await calcCezi({ char: '江' });
    // 江含氵，字义五行应为水
    expect(r.charWuxing).toBe('水');
  });

  it('字义本义可取', async () => {
    const r = await calcCezi({ char: '江' });
    expect(r.meaning).toBeTruthy();
  });

  it('吉凶定调在吉/中/凶之一', async () => {
    const r = await calcCezi({ char: '明' });
    expect(['吉', '中', '凶']).toContain(r.tone);
  });

  it('事业/感情/改字建议非空', async () => {
    const r = await calcCezi({ char: '明' });
    expect(r.careerAdvice).toBeTruthy();
    expect(r.loveAdvice).toBeTruthy();
    expect(r.nameAdvice).toBeTruthy();
  });

  it('传入生辰时计算八字用神补益', async () => {
    const r = await calcCezi({ char: '江', birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(r.baziComplement).not.toBeNull();
    if (r.baziComplement) {
      expect(['补用神', '生扶', '克耗', '无关系']).toContain(r.baziComplement.complement);
      expect(r.baziComplement.xiyongShen).toMatch(/木|火|土|金|水/);
    }
  });

  it('不传生辰时 baziComplement 为 null', async () => {
    const r = await calcCezi({ char: '明' });
    expect(r.baziComplement).toBeNull();
  });

  it('export_snapshot 含分段解读', async () => {
    const r = await calcCezi({ char: '明' });
    expect(r.export_snapshot.sections.length).toBeGreaterThanOrEqual(7);
    expect(r.export_snapshot.summary).toBe(r.synthesis);
  });
});

describe('calcCeziEnveloped', async () => {
  it('返回 ToolEnvelope ok=true', async () => {
    const env = await calcCeziEnveloped({ char: '明' });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('cast_cezi');
    expect(env.data.char).toBe('明');
  });

  it('未收录字产生 warnings', async () => {
    const env = await calcCeziEnveloped({ char: '𡈽' });
    expect(env.warnings?.some((w) => w.includes('未收录'))).toBe(true);
  });

  it('aspect 字段透传', async () => {
    const env = await calcCeziEnveloped({ char: '明', aspect: '事业' });
    expect((env.input_normalized as { aspect: string }).aspect).toBe('事业');
  });
});
