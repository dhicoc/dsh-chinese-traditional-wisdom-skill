import { describe, expect, it } from 'vitest';
import { calculateMeihua, calcMeihuaEnveloped, type MeihuaInput } from '@/legacy/meihuaEngine';
import type { ToolEnvelope } from '@/legacy/baseTypes';

/**
 * 梅花易数纯 TS 引擎测试（C 类迁移第一步）。
 * 重点：验证确定性、数字/时间两种起卦、envelope 结构。
 * 与旧 engine-adapters.js 同输入对照由下方确定性样例保证（取数规则一致）。
 */

describe('calculateMeihua 纯 TS 计算', () => {
  it('数字起卦：上卦=na%8, 下卦=(na+nb)%8, 动爻=(na+nb)%6', () => {
    // na=3, nb=5: 上卦=3→离(index2), 下卦=8%8=0→8坤(index7), 动爻=8%6=2
    const input: MeihuaInput = { birth: { year: 1990, month: 6, day: 15, hour: 12 }, method: 'number', numberA: 3, numberB: 5 };
    const r = calculateMeihua(input);
    expect(r.upperTrigram.name).toBe('离');
    expect(r.lowerTrigram.name).toBe('坤');
    expect(r.changingLine).toBe(2);
    expect(r.classicalHexagramName).toBe('晋');
    expect(r.hexagramNumber).toBe(35);
    expect(r.sourceMethod).toBe('数字起卦');
    expect(r.mode).toBe('local'); // 数字起卦不依赖 solar
  });

  it('时间起卦无 solar 时走公历近似，确定性可复现', () => {
    const birth = { year: 2024, month: 3, day: 15, hour: 9 };
    const r1 = calculateMeihua({ birth });
    const r2 = calculateMeihua({ birth });
    expect(r1.upperTrigram.name).toBe(r2.upperTrigram.name);
    expect(r1.lowerTrigram.name).toBe(r2.lowerTrigram.name);
    expect(r1.changingLine).toBe(r2.changingLine);
    expect(r1.mode).toBe('local');
    expect(r1.sourceMethod).toContain('公历');
  });

  it('时间起卦与旧 engine-adapters.js 公式一致（2024-3-15 9时 → 兑/坤/2爻动）', () => {
    // 手算（旧 JS line 348-351 公式，MEIHUA_TRIGRAMS=[乾,兑,离,震,巽,坎,艮,坤]）：
    // hourNumber = modOne(floor((9+1)/2)+1, 12) = modOne(6,12) = 6
    // sum = 2024+3+15 = 2042
    // upperIdx = modOne(2042,8) = 2 → MEIHUA_TRIGRAMS[1] = 兑
    // lowerIdx = modOne(2042+6,8) = modOne(2048,8) = 8 → MEIHUA_TRIGRAMS[7] = 坤
    // moveLine = modOne(2048,6) = 2
    const r = calculateMeihua({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(r.upperTrigram.name).toBe('兑');
    expect(r.lowerTrigram.name).toBe('坤');
    expect(r.changingLine).toBe(2);
  });

  it('动爻≤3 时体卦=上卦、用卦=下卦；>3 时反之', () => {
    // 数字起卦精确控制动爻：na=1,nb=1 → 动爻=2%6=2 → 体=上卦
    const r2 = calculateMeihua({ birth: { year: 2024, month: 1, day: 1, hour: 1 }, method: 'number', numberA: 1, numberB: 1 });
    if (r2.changingLine <= 3) {
      expect(r2.bodyTrigram).toBe(r2.upperTrigram.name);
      expect(r2.useTrigram).toBe(r2.lowerTrigram.name);
    } else {
      expect(r2.bodyTrigram).toBe(r2.lowerTrigram.name);
      expect(r2.useTrigram).toBe(r2.upperTrigram.name);
    }
  });

  it('bodyUseRelation 落在五种关系之内，fortuneLevel 对应', () => {
    const r = calculateMeihua({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(['用生体', '体生用', '体克用', '用克体', '比和']).toContain(r.bodyUseRelation);
    expect(r.fortuneLevel).toBeTruthy();
  });

  it('错卦综卦正确（乾↔坤、震↔巽 互换；综卦上下颠倒）', () => {
    // na=1,nb=7 → 上卦=1乾, 下卦=8坤
    const r = calculateMeihua({ birth: { year: 2024, month: 1, day: 1, hour: 1 }, method: 'number', numberA: 1, numberB: 7 });
    expect(r.upperTrigram.name).toBe('乾');
    expect(r.lowerTrigram.name).toBe('坤');
    expect(r.cuoTrigram.upper).toBe('坤');
    expect(r.cuoTrigram.lower).toBe('乾');
    expect(r.zongTrigram.upper).toBe('坤'); // 综卦=上下颠倒
    expect(r.zongTrigram.lower).toBe('乾');
  });

  it('变卦：动爻改变对应爻后得到的卦', () => {
    const r = calculateMeihua({ birth: { year: 2024, month: 1, day: 1, hour: 1 }, method: 'number', numberA: 1, numberB: 1 });
    // 有动爻则变卦名应与本卦不同（除非动后恰好同名，极少）
    expect(r.changingHexagramName).toBeTruthy();
  });
});

describe('calcMeihuaEnveloped envelope 适配', () => {
  it('返回完整 ToolEnvelope，data 含 export_snapshot', () => {
    const env: ToolEnvelope = calcMeihuaEnveloped({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('LocalMeihuaTimeAdapter');
    expect(typeof env.version).toBe('string');
    const data = env.data as { hexagramName: string; export_snapshot: { summary: string; sections: Array<{ heading: string }> } };
    expect(data.hexagramName).toBeTruthy();
    expect(data.export_snapshot.summary).toContain('爻动');
    expect(data.export_snapshot.sections.length).toBeGreaterThanOrEqual(8);
    expect(env.warnings?.length).toBeGreaterThanOrEqual(1); // confidenceNote
  });

  it('数字起卦 envelope 也工作', () => {
    const env = calcMeihuaEnveloped({ birth: { year: 2024, month: 1, day: 1, hour: 1 }, method: 'number', numberA: 3, numberB: 5 });
    expect(env.ok).toBe(true);
    const data = env.data as { sourceMethod: string };
    expect(data.sourceMethod).toBe('数字起卦');
  });
});
