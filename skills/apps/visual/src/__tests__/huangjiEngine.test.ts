import { describe, expect, it } from 'vitest';
import { calcHuangjiEnveloped, calculateHuangji } from '@/legacy/huangjiEngine';
import { toFourLayer, type ReadingLike } from '@/legacy/reportLayers';

/**
 * 皇极经世引擎测试。
 * 用 fakeSolar mock 真实干支（1990-06-15 12:00 = 庚午年/壬午月/辛亥日/甲午时，农历五月廿三，
 * 经 lunar-javascript 真实历法核验），验证 9 卦配置自洽与周期分解正确。
 */

const BIRTH = { year: 1990, month: 6, day: 15, hour: 12, minute: 0 };

// mock lunar-javascript Solar：返回 1990-06-15 12:00 的真实干支（经 lunar-javascript 历法核验）
const fakeSolar = {
  fromYmdHms: (_y: number, _mo: number, _d: number, _h: number, _mi: number, _s: number) => ({
    getLunar: () => ({
      getYearInGanZhi: () => '庚午',
      getMonthInGanZhi: () => '壬午',
      getDayInGanZhi: () => '辛亥',
      getTimeInGanZhi: () => '甲午',
      getMonthInChinese: () => '五月',
      getDayInChinese: () => '廿三',
    }),
  }),
  fromYmd: (y: number, mo: number, d: number) => fakeSolar.fromYmdHms(y, mo, d, 0, 0, 0),
};

const SOLAR = fakeSolar as unknown as Parameters<typeof calcHuangjiEnveloped>[0]['solar'];

describe('calculateHuangji 皇极经世', () => {
  it('返回完整九卦配置 + 周期分解', () => {
    const r = calculateHuangji({ birth: BIRTH, solar: SOLAR });
    expect(r.engineName).toBe('HuangjiEngine');
    expect(r.mode).toBe('local-exact');
    // 周期：积年 67017+1990 = 69007
    expect(r.cycles.acumYear).toBe(67017 + 1990);
    expect(r.cycles.hui).toBe(Math.floor((67017 + 1990) / 10800) + 1);
    expect(r.cycles.yun).toBe(Math.floor((67017 + 1990) / 360) + 1);
    // 9 卦齐全
    for (const g of Object.values(r.gua)) {
      expect(g).toBeTruthy();
      expect(g.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('正卦落在 60 卦循环内', () => {
    const r = calculateHuangji({ birth: BIRTH, solar: SOLAR });
    const WANGJI_60 = '復,頤,屯,益,震,噬嗑,隨,无妄,明夷,賁,既濟,家人,豐,革,同人,臨,損,節,中孚,歸妹,睽,兌,履,泰,大畜,需,小畜,大壯,大有,夬,姤,大過,鼎,恆,巽,井,蠱,升,訟,困,未濟,解,渙,蒙,師,遯,咸,旅,小過,漸,蹇,艮,謙,否,萃,晉,豫,觀,比,剝'.split(',');
    expect(WANGJI_60).toContain(r.gua.zheng);
  });

  it('动爻在 1-6 范围', () => {
    const r = calculateHuangji({ birth: BIRTH, solar: SOLAR });
    for (const yao of [r.movingLines.yun, r.movingLines.shi, r.movingLines.xun]) {
      expect(yao).toBeGreaterThanOrEqual(1);
      expect(yao).toBeLessThanOrEqual(6);
    }
  });

  it('干支来自 mock 历法（真实值）', () => {
    const r = calculateHuangji({ birth: BIRTH, solar: SOLAR });
    expect(r.ganZhi.year).toBe('庚午');
    expect(r.ganZhi.month).toBe('壬午');
    expect(r.ganZhi.day).toBe('辛亥');
    expect(r.ganZhi.hour).toBe('甲午');
  });

  it('正卦=鼎（积年69007÷2160=32，W60[32]=鼎，关键算法锚点）', () => {
    const r = calculateHuangji({ birth: BIRTH, solar: SOLAR });
    expect(r.cycles.acumYear).toBe(69007);
    expect(r.gua.zheng).toBe('鼎');
  });

  it('无 solar 时走近似模式仍出 9 卦', () => {
    const r = calculateHuangji({ birth: BIRTH, solar: null });
    expect(r.mode).toBe('local-approx');
    expect(r.gua.zheng).toBeTruthy();
    expect(r.gua.year).toBeTruthy();
    // 近似干支仍符合干支格式
    expect(r.ganZhi.year).toMatch(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
  });

  it('不同年份会/运/世随周期变化', () => {
    const r1 = calculateHuangji({ birth: { ...BIRTH, year: 1990 }, solar: SOLAR });
    const r2 = calculateHuangji({ birth: { ...BIRTH, year: 2050 }, solar: SOLAR });
    expect(r2.cycles.shi).toBeGreaterThan(r1.cycles.shi);
    expect(r2.cycles.acumYear).toBeGreaterThan(r1.cycles.acumYear);
  });

  it('卦象可重复（确定性）', () => {
    const r1 = calculateHuangji({ birth: BIRTH, solar: SOLAR });
    const r2 = calculateHuangji({ birth: BIRTH, solar: SOLAR });
    expect(r1.gua).toEqual(r2.gua);
    expect(r1.cycles).toEqual(r2.cycles);
  });
});

describe('calcHuangjiEnveloped envelope', () => {
  it('返回 ok=true 的 ToolEnvelope 含完整 export_snapshot', () => {
    const env = calcHuangjiEnveloped({ birth: BIRTH, solar: SOLAR });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('HuangjiEngine');
    const data = env.data;
    expect(data.export_snapshot.summary).toContain('皇极');
    expect(data.export_snapshot.summary).toContain('正卦');
    expect(data.export_snapshot.sections.some((s) => s.heading === '周期定位')).toBe(true);
    expect(data.export_snapshot.sections.some((s) => s.heading === '正卦（主运）')).toBe(true);
    expect(data.export_snapshot.sections.some((s) => s.heading === '趋势解读')).toBe(true);
    expect(env.warnings?.some((w) => w.includes('皇极'))).toBe(true);
  });

  it('无 solar 时 warning 含近似提示', () => {
    const env = calcHuangjiEnveloped({ birth: BIRTH, solar: null });
    expect(env.warnings?.some((w) => w.includes('近似'))).toBe(true);
  });

  it('与 FourLayerReport toFourLayer 联动', () => {
    const env = calcHuangjiEnveloped({ birth: BIRTH, solar: SOLAR });
    const report = toFourLayer(env.data.export_snapshot as ReadingLike);
    expect(report.tldr).toContain('皇极');
    expect(report.details.length).toBeGreaterThan(0);
  });
});
