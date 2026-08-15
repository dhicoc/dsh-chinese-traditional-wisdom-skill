import { describe, expect, it } from 'vitest';
import { calculateLiuyao, calcLiuyaoEnveloped } from '@/legacy/liuyaoEngine';
import type { ToolEnvelope } from '@/legacy/baseTypes';

/**
 * 六爻纳甲纯 TS 引擎测试（C 类迁移第三步）。
 * 与旧 liuyao-engine.js 同输入对照（manual 起卦确定性，用固定爻值锁定）。
 */

describe('calculateLiuyao manual 起卦', () => {
  it('全阳 777777 → 乾为天，乾宫本宫，世6应3', () => {
    const r = calculateLiuyao({ method: 'manual', yaoValues: '777777' });
    expect(r.hexagramName).toBe('乾为天');
    expect(r.upperTrigram).toBe('乾');
    expect(r.lowerTrigram).toBe('乾');
    expect(r.palace).toBe('乾宫');
    expect(r.palaceElement).toBe('金');
    expect(r.shiYao).toBe(6);
    expect(r.yingYao).toBe(3);
    expect(r.changingYao).toEqual([]); // 7=少阳静
    expect(r.changingHexagramName).toBe('乾为天'); // 无动爻，变卦=本卦
  });

  it('全阴 888888 → 坤为地，坤宫本宫，世6应3', () => {
    const r = calculateLiuyao({ method: 'manual', yaoValues: '888888' });
    expect(r.hexagramName).toBe('坤为地');
    expect(r.palace).toBe('坤宫');
    expect(r.palaceElement).toBe('土');
    expect(r.shiYao).toBe(6);
    expect(r.yingYao).toBe(3);
  });

  it('初爻动 677777 → 本卦天风姤（初阴），变卦乾为天，动爻[1]', () => {
    // 6=老阴(变,阴) 7=少阳(静,阳)。677777: 初爻阴、二~上阳 → 下卦[阴阳阳]=巽，上卦[阳阳阳]=乾 → 天风姤
    // 初爻动(6)→初爻变阳 → 下卦变乾 → 变卦乾为天
    const r = calculateLiuyao({ method: 'manual', yaoValues: '677777' });
    expect(r.hexagramName).toBe('天风姤');
    expect(r.changingYao).toEqual([1]);
    expect(r.changingHexagramName).toBe('乾为天');
    expect(r.lines[0].changing).toBe(true);
    expect(r.lines[0].yin).toBe(true); // 6=老阴
  });

  it('六亲按宫卦五行与爻地支五行定（乾宫金：子水→子孙）', () => {
    // 乾为天：乾内卦纳甲起甲子，初爻地支=子(水)，宫金→金生水=我生=子孙
    const r = calculateLiuyao({ method: 'manual', yaoValues: '777777' });
    expect(r.lines[0].branch).toBe('子');
    expect(r.lines[0].branchElement).toBe('水');
    expect(r.lines[0].relation).toBe('子孙');
    expect(r.lines[0].stem).toBe('甲'); // 乾内卦纳甲甲
  });

  it('六神按日干起（甲日初爻=青龙）', () => {
    // 用 solar mock 让日干=甲。简单做法：不传 solar，approxDayStem 不确定，
    // 这里直接构造一个返回甲日的 solar mock。
    const fakeSolar = {
      fromYmd: () => ({
        getLunar: () => ({
          getDayGan: () => '甲',
          getDayInGanZhi: () => '甲子',
          getDayInGanZhiExact: () => '甲子',
          getMonthInGanZhi: () => '丙寅',
          getDayXunKong: () => '戌亥',
        }),
      }),
    };
    const r = calculateLiuyao({ method: 'manual', yaoValues: '777777', solar: fakeSolar as never });
    expect(r.dayStem).toBe('甲');
    expect(r.lines[0].god).toBe('青龙'); // 甲乙日青龙起初爻
    expect(r.lines[1].god).toBe('朱雀');
    expect(r.lines[5].god).toBe('玄武');
    expect(r.mode).toBe('local-exact');
    expect(r.dayGanZhi).toBe('甲子');
    expect(r.xunkong).toEqual(['戌', '亥']);
    expect(r.monthJian).toBe('寅');
  });

  it('用神按问题事项映射（问财运→妻财）', () => {
    const r = calculateLiuyao({ method: 'manual', yaoValues: '777777', question: '今年财运如何' });
    expect(r.yongShen).toBe('妻财');
  });

  it('用神无问题按性别默认（男→妻财，女→官鬼）', () => {
    const male = calculateLiuyao({ method: 'manual', yaoValues: '777777', birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(male.yongShen).toBe('妻财');
    const female = calculateLiuyao({ method: 'manual', yaoValues: '777777', birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '女' } });
    expect(female.yongShen).toBe('官鬼');
  });

  it('illegal yaoValues 抛错', () => {
    expect(() => calculateLiuyao({ method: 'manual', yaoValues: '123456' })).toThrow();
    expect(() => calculateLiuyao({ method: 'manual', yaoValues: '777' })).toThrow();
  });
});

describe('calculateLiuyao coin/time 起卦', () => {
  it('coin 起卦同 seed 确定性可复现', () => {
    const a = calculateLiuyao({ method: 'coin', seed: 12345, birth: { year: 1990, month: 6, day: 15, hour: 12 } });
    const b = calculateLiuyao({ method: 'coin', seed: 12345, birth: { year: 1990, month: 6, day: 15, hour: 12 } });
    expect(a.hexagramName).toBe(b.hexagramName);
    expect(a.lines.map((l) => l.yin).join('')).toBe(b.lines.map((l) => l.yin).join(''));
  });

  it('time 起卦确定性（与旧 castFromTime 公式一致）', () => {
    const r = calculateLiuyao({ method: 'time', birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    // 旧公式：hourNum=floor((9+1)/2)%12+1=6; sum=2042; upper=2042%8||8=2→兑; lower=(2042+6)%8||8=0→8坤; move=(2048)%6||6=2
    expect(r.upperTrigram).toBe('兑');
    expect(r.lowerTrigram).toBe('坤');
    expect(r.changingYao).toEqual([2]);
  });
});

describe('calcLiuyaoEnveloped envelope 适配', () => {
  it('返回完整 ToolEnvelope，data 含 export_snapshot', () => {
    const env: ToolEnvelope = calcLiuyaoEnveloped({ method: 'manual', yaoValues: '777777' });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('LocalLiuyaoNajiaAdapter');
    const data = env.data as { hexagramName: string; shiYao: number; export_snapshot: { summary: string; sections: Array<{ heading: string }> } };
    expect(data.hexagramName).toBe('乾为天');
    expect(data.shiYao).toBe(6);
    expect(data.export_snapshot.summary).toContain('乾为天');
    expect(data.export_snapshot.sections.length).toBeGreaterThanOrEqual(6);
  });

  it('动爻时变卦名出现在 summary', () => {
    const env = calcLiuyaoEnveloped({ method: 'manual', yaoValues: '677777' });
    const data = env.data as { hexagramName: string; changingHexagramName: string; export_snapshot: { summary: string } };
    // 本卦天风姤 → 变卦乾为天
    expect(data.hexagramName).toBe('天风姤');
    expect(data.changingHexagramName).toBe('乾为天');
    expect(data.export_snapshot.summary).toContain('天风姤');
    expect(data.export_snapshot.summary).toContain('乾为天');
  });
});
