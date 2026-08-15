import { describe, expect, it } from 'vitest';
import { calculateTaiyi, calcTaiyiEnveloped, JI_STYLE_NAMES, ACUM_YEAR_NAMES } from '@/legacy/taiyiEngine';
import type { JiStyle, AcumYearMethod } from '@/legacy/taiyiEngine';

/**
 * 太乙神数纯 TS 引擎测试。
 * 参考 kintaiyi (MIT) 算法逻辑，验证起局/格局/神煞/主客算结构。
 */

describe('calculateTaiyi 结构验证', () => {
  it('返回完整太乙盘结构', () => {
    const r = calculateTaiyi({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(r.engineName).toBe('TaiyiEngine');
    expect(r.basicInfo.dayGz).toHaveLength(2);
    expect(r.basicInfo.hourGz).toHaveLength(2);
    expect(r.basicInfo.jiStyleName).toBe('年计');
    expect(r.basicInfo.acumYearName).toBe('太乙统宗');
    // 局式
    expect(r.kook.wen).toBeTruthy();
    expect(r.kook.num).toBeGreaterThan(0);
    expect(r.kook.num).toBeLessThanOrEqual(72);
    expect(['阳遁', '阴遁']).toContain(r.kook.dun);
    // 太乙落宫
    expect(r.taiyi.gong).toBeTruthy();
    expect([1, 2, 3, 4, 6, 7, 8, 9]).toContain(r.taiyi.num);
    // 文昌/始击/定目
    expect(r.wenchang.gong).toBeTruthy();
    expect(r.shiji.gong).toBeTruthy();
    expect(r.dingmu.gong).toBeTruthy();
    // 主客算
    expect(typeof r.home.cal).toBe('number');
    expect(typeof r.away.cal).toBe('number');
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9]).toContain(r.home.general);
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9]).toContain(r.away.general);
    // 神煞
    expect(r.shenSha.tianyi).toBeTruthy();
    expect(r.shenSha.earthyi).toBeTruthy();
    expect(r.shenSha.fourGod).toBeTruthy();
    // 格局
    expect(Object.keys(r.geju).length).toBeGreaterThan(0);
    // 八门
    expect(Object.keys(r.eightDoors).length).toBeGreaterThan(0);
    // tone
    expect(['吉', '凶', '中']).toContain(r.tone);
    // export_snapshot
    expect(r.export_snapshot.summary).toContain('太乙');
    expect(r.export_snapshot.sections.length).toBeGreaterThan(0);
  });

  it('5 种计式都能跑通', () => {
    const styles: JiStyle[] = [0, 1, 2, 3, 4];
    for (const js of styles) {
      const r = calculateTaiyi({ birth: { year: 2024, month: 3, day: 15, hour: 9 }, jiStyle: js });
      expect(r.basicInfo.jiStyleName).toBe(JI_STYLE_NAMES[js]);
      expect(r.kook.num).toBeGreaterThan(0);
      expect(r.taiyi.gong).toBeTruthy();
    }
  });

  it('4 种积年法都能跑通', () => {
    const methods: AcumYearMethod[] = [0, 1, 2, 3];
    for (const ay of methods) {
      const r = calculateTaiyi({ birth: { year: 2024, month: 3, day: 15, hour: 9 }, acumYear: ay });
      expect(r.basicInfo.acumYearName).toBe(ACUM_YEAR_NAMES[ay]);
      expect(r.kook.num).toBeGreaterThan(0);
    }
  });

  it('Solar 参数化：精确 vs 近似都能返回合法结构', () => {
    const exact = calculateTaiyi({ birth: { year: 2024, month: 3, day: 15, hour: 9 }, solar: null });
    expect(exact.mode).toBe('local-approx');
    expect(exact.taiyi.gong).toBeTruthy();
  });
});

describe('calcTaiyiEnveloped 信封验证', () => {
  it('返回 ok=true 的 ToolEnvelope', () => {
    const env = calcTaiyiEnveloped({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('TaiyiEngine');
    expect(env.version).toBeTruthy();
    expect(env.data).toBeDefined();
    expect((env.warnings ?? []).length).toBeGreaterThan(0);
    expect(env.data.export_snapshot.summary).toContain('太乙');
  });

  it('export_snapshot sections 含局式/太乙落宫/主客算/格局', () => {
    const env = calcTaiyiEnveloped({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    const headings = env.data.export_snapshot.sections.map((s) => s.heading);
    expect(headings).toContain('局式');
    expect(headings).toContain('太乙落宫');
    expect(headings).toContain('主客算');
    expect(headings).toContain('格局');
  });
});

describe('格局判断', () => {
  it('格局对象每个 key 都有描述', () => {
    const r = calculateTaiyi({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    for (const [k, v] of Object.entries(r.geju)) {
      expect(k).toBeTruthy();
      expect(v).toBeTruthy();
      expect(v.length).toBeGreaterThan(0);
    }
  });
});
