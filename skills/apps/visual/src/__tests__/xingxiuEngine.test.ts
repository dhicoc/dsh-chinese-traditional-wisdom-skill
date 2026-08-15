import { describe, expect, it } from 'vitest';
import { calculateXingXiu, calcXingXiuEnveloped } from '@/legacy/xingxiuEngine';
import type { ToolEnvelope } from '@/legacy/baseTypes';

/**
 * 二十八星宿引擎测试。
 */

describe('calculateXingXiu 结构验证', () => {
  it('返回完整星宿结果', () => {
    const r = calculateXingXiu({ birth: { year: 2024, month: 3, day: 15 } });
    expect(r.engineName).toBe('XingXiuEngine');
    expect(r.zhiXiu).toHaveLength(1);
    expect(r.zhiXiuFull).toBeTruthy();
    expect(['东方青龙', '南方朱雀', '西方白虎', '北方玄武']).toContain(r.xiang);
    expect(['吉', '凶', '—']).toContain(r.luck);
    expect(r.allXiu.length).toBe(28);
    // 本命星宿
    expect(r.benMingXiu).toHaveLength(1);
    expect(r.benMingXiuFull).toBeTruthy();
    expect(['东方青龙', '南方朱雀', '西方白虎', '北方玄武']).toContain(r.benMingXiang);
    expect(r.benMingSymbol).toBeTruthy();
  });

  it('二十八宿全表含所有宿', () => {
    const r = calculateXingXiu({ birth: { year: 2024, month: 3, day: 15 } });
    const names = r.allXiu.map((x) => x.name);
    ['角', '亢', '氐', '房', '心', '尾', '箕', '井', '鬼', '柳', '星', '张', '翼', '轸', '奎', '娄', '胃', '昴', '毕', '觜', '参', '斗', '牛', '女', '虚', '危', '室', '壁'].forEach((n) => {
      expect(names).toContain(n);
    });
  });

  it('每宿含禽星全称+四象+五行+曜+动物', () => {
    const r = calculateXingXiu({ birth: { year: 2024, month: 3, day: 15 } });
    r.allXiu.forEach((x) => {
      expect(x.fullName).toContain(x.name);
      expect(x.fullName.length).toBeGreaterThanOrEqual(3);
      expect(x.animal).toBeTruthy();
      expect(x.wuxing).toBeTruthy();
    });
  });
});

describe('Solar 参数化', () => {
  it('传 solar mock 走精确路径', () => {
    const fakeSolar = {
      fromYmdHms: () => ({
        getLunar: () => ({
          getXiu: () => '牛',
          getXiuLuck: () => '凶',
          getXiuSong: () => '牛星造作主灾危',
          getDayInGanZhiExact: () => '丁酉',
        }),
      }),
    };
    const r = calculateXingXiu({ birth: { year: 2024, month: 3, day: 15 }, solar: fakeSolar as never, method: 'lookup' });
    expect(r.mode).toBe('local-exact');
    expect(r.zhiXiu).toBe('牛');
    expect(r.zhiXiuFull).toBe('牛金牛');
    expect(r.xiang).toBe('北方玄武');
    expect(r.luck).toBe('凶');
    expect(r.song).toContain('牛星造作');
  });

  it('默认轮转法不传 solar 也走 local-exact', () => {
    const r = calculateXingXiu({ birth: { year: 2024, month: 3, day: 15 } });
    expect(r.mode).toBe('local-exact');
    expect(r.zhiXiu).toHaveLength(1);
  });

  it('轮转法 2004-7-30 本命星宿 = 斗木獬（对齐 bmcx）', () => {
    const r = calculateXingXiu({ birth: { year: 2004, month: 7, day: 30 }, method: 'rotational' });
    expect(r.benMingXiu).toBe('斗');
    expect(r.benMingXiuFull).toBe('斗木獬');
    expect(r.benMingXiang).toBe('北方玄武');
  });

  it('当日值宿用今天日期（非出生日）', () => {
    const r = calculateXingXiu({ birth: { year: 2004, month: 7, day: 30 }, method: 'rotational' });
    // 当日值宿应该和本命星宿不同（除非今天恰好是2004-7-30）
    const today = new Date();
    if (today.getFullYear() !== 2004 || today.getMonth() !== 6 || today.getDate() !== 30) {
      expect(r.zhiXiu).not.toBe(r.benMingXiu);
    }
  });

  it('查表法 2004-7-30 = 牛金牛（lunar-javascript默认）', () => {
    const fakeSolar = {
      fromYmdHms: () => ({
        getLunar: () => ({
          getXiu: () => '牛',
          getXiuLuck: () => '凶',
          getXiuSong: () => '牛星造作主灾危',
          getDayInGanZhiExact: () => '庚戌',
        }),
      }),
    };
    const r = calculateXingXiu({ birth: { year: 2004, month: 7, day: 30 }, solar: fakeSolar as never, method: 'lookup' });
    expect(r.zhiXiu).toBe('牛');
    expect(r.zhiXiuFull).toBe('牛金牛');
  });
});

describe('calcXingXiuEnveloped envelope', () => {
  it('返回完整 ToolEnvelope', () => {
    const env: ToolEnvelope = calcXingXiuEnveloped({ birth: { year: 2024, month: 3, day: 15 } });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('XingXiuEngine');
    const data = env.data as { zhiXiuFull: string; xiang: string; allXiu: unknown[]; export_snapshot: { summary: string; sections: Array<{ heading: string }> } };
    expect(data.zhiXiuFull).toBeTruthy();
    expect(data.allXiu.length).toBe(28);
    expect(data.export_snapshot.summary).toContain('值日');
    expect(data.export_snapshot.sections.some((s) => s.heading === '值日宿')).toBe(true);
    expect(data.export_snapshot.sections.some((s) => s.heading === '吉凶宜忌')).toBe(true);
  });
});
