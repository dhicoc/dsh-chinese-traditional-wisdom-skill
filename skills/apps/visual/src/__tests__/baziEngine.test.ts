import { describe, expect, it } from 'vitest';
import {
  buildBaziDynamicLayer,
  buildDynamicRelationMatches,
  calculateBazi,
  calcBaziEnveloped,
  deriveRelationNames,
  getBaziMonthDaySnapshot,
  getBaziTransitSnapshot,
} from '@/legacy/baziEngine';
import { getSolarEntry } from '@/legacy/solarEntry';
import type { ToolEnvelope } from '@/legacy/baseTypes';
import { calcShenSha } from '@/legacy/shensha';
import type { ShenShaItem } from '@/legacy/shensha';

/**
 * 八字纯 TS 引擎测试（C 类迁移第四步）。
 * 与旧 BaziEngine.calculate / BaziLunarAdapter 同输入对照。
 */

describe('calculateBazi 本地近似路径（无 solar）', () => {
  it('1990-6-15 12时男：年柱庚午（与旧引擎一致）', () => {
    // (1990-4)%10=6→庚，(1990-4)%12=6→午
    const r = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(r.pillars.year.stem).toBe('庚');
    expect(r.pillars.year.branch).toBe('午');
    expect(r.dayMaster).toBe(r.pillars.day.stem);
    expect(r.advancedAnalysis).toMatchObject({
      monthCommand: { branch: r.pillars.month.branch },
      support: { strength: expect.any(String) },
      fuyii: { principle: expect.any(String), usefulElements: expect.any(Array) },
    });
    expect(r.mode).toBe('local-approx');
    expect(r.engineName).toBe('BaziEngine');
  });

  it('立春前用上年年柱（1月属于上年干支）', () => {
    // 1990-1-15 在立春(2-4)前 → 年柱用 1989 = 己巳
    // (1989-4)%10=5→己, (1989-4)%12=1985%12=5→巳
    const r = calculateBazi({ birth: { year: 1990, month: 1, day: 15, hour: 12, gender: '男' } });
    expect(r.pillars.year.stem).toBe('己');
    expect(r.pillars.year.branch).toBe('巳');
  });

  it('五行统计含茎2+支2+藏干1权重，5 个五行键齐全', () => {
    const r = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(r.elements).toHaveProperty('木');
    expect(r.elements).toHaveProperty('火');
    expect(r.elements).toHaveProperty('土');
    expect(r.elements).toHaveProperty('金');
    expect(r.elements).toHaveProperty('水');
    const total = Object.values(r.elements).reduce((s, v) => s + v, 0);
    expect(total).toBeGreaterThan(0);
  });

  it('十神按日干与各柱天干定，落在十神名内', () => {
    const r = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const valid = ['比肩', '劫财', '偏印', '正印', '食神', '伤官', '偏财', '正财', '七杀', '正官'];
    (['year', 'month', 'day', 'hour'] as const).forEach((k) => {
      expect(valid).toContain(r.shishenList[k]);
    });
    // 日柱十神为比肩（日干对自身）
    expect(r.shishenList.day).toBe('比肩');
  });

  it('大运 8 步，3 岁起运，顺逆按年干阴阳+性别', () => {
    const r = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(r.luck.length).toBe(8);
    expect(r.luck[0].ageStart).toBe(3);
    expect(r.luck[1].ageStart).toBe(13);
    // 庚午年：庚=阳干(index6偶) → 男顺行
    expect(r.luck[0].stem).toBeTruthy();
  });

  it('藏干表齐全（每地支有藏干）', () => {
    const r = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    (['year', 'month', 'day', 'hour'] as const).forEach((k) => {
      expect(r.hiddenStems[k].length).toBeGreaterThan(0);
    });
  });

  it('子时 23:00+ 日柱用次日', () => {
    const r22 = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 22, gender: '男' } });
    const r23 = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 23, gender: '男' } });
    // 23 时日柱应为次日，与 22 时不同
    const d22 = r22.pillars.day.stem + r22.pillars.day.branch;
    const d23 = r23.pillars.day.stem + r23.pillars.day.branch;
    expect(d22).not.toBe(d23);
  });
});

describe('calculateBazi 精确路径（传 solar mock）', () => {
  it('传入 solar 走 local-exact，用 lunar 八字干支', () => {
    // mock solar：返回固定八字 丙午 辛卯 丁酉 辛亥（对应 engine-adapters 测试口径）
    const fakeSolar = {
      fromYmdHms: () => ({
        getLunar: () => ({
          getEightChar: () => ({
            getYear: () => '丙午',
            getMonth: () => '辛卯',
            getDay: () => '丁酉',
            getHour: () => '辛亥',
          }),
        }),
      }),
    };
    const r = calculateBazi({ birth: { year: 2026, month: 4, day: 4, hour: 21, gender: '男' }, solar: fakeSolar as never });
    expect(r.mode).toBe('local-exact');
    expect(r.engineName).toBe('BaziLunarAdapter');
    expect(r.pillars.year.stem).toBe('丙');
    expect(r.pillars.year.branch).toBe('午');
    expect(r.pillars.month.stem).toBe('辛');
    expect(r.pillars.day.stem).toBe('丁');
    expect(r.pillars.hour.stem).toBe('辛');
    expect(r.calendar?.provider).toBe('lunar-javascript');
  });

  it('精确大运保留顺逆行和起运日期元数据', () => {
    const r = calculateBazi({
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      solar: getSolarEntry(),
    });

    expect(r.luckDirection).toBe('顺行');
    expect(r.luckStartSolar).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('solar 抛错时降级 local-approx', () => {
    const badSolar = { fromYmd: () => { throw new Error('boom'); } };
    const r = calculateBazi({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' }, solar: badSolar as never });
    expect(r.mode).toBe('local-approx');
  });
});

describe('getBaziTransitSnapshot 大运流年分层', () => {
  it('按目标年份返回独立大运与流年十神', () => {
    const snapshot = getBaziTransitSnapshot(
      { year: 1990, month: 6, day: 15, hour: 12, gender: '男', useExactCalendar: false },
      2025,
    );

    expect(snapshot.available).toBe(true);
    expect(snapshot.targetYear).toBe(2025);
    expect(snapshot.yearly).toMatchObject({ stem: '乙', branch: '巳', stemShiShen: '正印' });
    expect(snapshot.currentLuck).toMatchObject({ ageStart: 33, stem: '壬', branch: '午' });
    expect(snapshot.natalRelations).toEqual(expect.arrayContaining([
      expect.objectContaining({ pillar: '年柱', ganZhi: '庚午', relations: expect.arrayContaining(['天干合']) }),
      expect.objectContaining({ pillar: '月柱', ganZhi: '戊寅', relations: expect.arrayContaining(['相害', '相刑']) }),
    ]));
    expect(snapshot.luckRelations).toEqual([]);
    expect(snapshot.luck).toHaveLength(8);
  });
});

describe('getBaziMonthDaySnapshot 流月流日分层', () => {
  it('按目标日期返回节气月与精确日干支、十神和原局关系', () => {
    const snapshot = getBaziMonthDaySnapshot(
      { year: 1990, month: 6, day: 15, hour: 12, gender: '男', useExactCalendar: false },
      '2025-07-15',
      getSolarEntry(),
    );

    expect(snapshot.available).toBe(true);
    expect(snapshot.targetDate).toBe('2025-07-15');
    expect(snapshot.monthly).toMatchObject({ stem: '癸', branch: '未', stemShiShen: '正官', stemWuxing: '水' });
    expect(snapshot.daily).toMatchObject({ stem: '乙', branch: '酉', stemShiShen: '正印', stemWuxing: '木' });
    expect(snapshot.monthly.natalRelations).toEqual(expect.arrayContaining([
      expect.objectContaining({ pillar: '年柱', ganZhi: '庚午', relations: expect.arrayContaining(['六合']) }),
    ]));
    expect(snapshot.daily.natalRelations).toEqual(expect.arrayContaining([
      expect.objectContaining({ pillar: '年柱', ganZhi: '庚午', relations: expect.arrayContaining(['天干合']) }),
    ]));
  });

  it('日期无效时返回不可用快照', () => {
    const snapshot = getBaziMonthDaySnapshot(
      { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      '2025-02-30',
      getSolarEntry(),
    );

    expect(snapshot.available).toBe(false);
  });
});

describe('buildBaziDynamicLayer 统一动态层', () => {
  const birth = { year: 1990, month: 6, day: 15, hour: 12, gender: '男', useExactCalendar: false };

  it('按目标日期返回彼此独立的大运、小运、流年、流月与流日', () => {
    const layer = buildBaziDynamicLayer(birth, '2025-07-15', getSolarEntry());

    expect(layer).toMatchObject({
      targetDate: '2025-07-15',
      nominalAge: 36,
      decadal: { direction: '顺行', current: { ageStart: 33, stem: '壬', branch: '午' } },
      yearly: { stem: '乙', branch: '巳', stemShiShen: '正印', stemWuxing: '木' },
      monthly: { stem: '癸', branch: '未', stemShiShen: '正官', stemWuxing: '水' },
      daily: { stem: '乙', branch: '酉', stemShiShen: '正印', stemWuxing: '木' },
      available: true,
    });
    expect(layer.minor).toMatchObject({
      nominalAge: 36,
      source: expect.stringMatching(/^(lunar-exact|local-fallback)$/),
    });
    expect(layer.minor.stem).toHaveLength(1);
    expect(layer.minor.branch).toHaveLength(1);
    expect(layer.limitations).toContain('动态层仅作传统文化规则参照，不对应现实结果保证。');
  });

  it('小运固定按虚岁，在出生当年为一且跨年递增', () => {
    expect(buildBaziDynamicLayer(birth, '1990-06-15', getSolarEntry()).nominalAge).toBe(1);
    expect(buildBaziDynamicLayer(birth, '1991-01-01', getSolarEntry()).nominalAge).toBe(2);
  });

  it('非法目标日期返回不可用层且不伪造动态干支', () => {
    const layer = buildBaziDynamicLayer(birth, '2025-02-30', getSolarEntry());

    expect(layer).toMatchObject({ targetDate: '2025-02-30', available: false });
    expect(layer.yearly).toEqual({ stem: '', branch: '', stemShiShen: '', stemWuxing: '' });
    expect(layer.limitations).toContain('目标日期不是有效公历日期。');
  });

  it('构造动态层不会改变既有本命计算', () => {
    const natal = calculateBazi({ birth, solar: getSolarEntry() });
    buildBaziDynamicLayer(birth, '2025-07-15', getSolarEntry());
    const repeated = calculateBazi({ birth, solar: getSolarEntry() });

    expect(repeated.pillars).toEqual(natal.pillars);
    expect(repeated.elements).toEqual(natal.elements);
    expect(repeated.shenSha).toEqual(natal.shenSha);
  });

  it('派生伏吟、反吟和天克地冲时保留基础关系', () => {
    expect(deriveRelationNames('甲子', '甲子')).toContain('伏吟');

    const clash = deriveRelationNames('甲子', '庚午');
    expect(clash).toEqual(expect.arrayContaining(['天干冲', '六冲', '天克地冲', '反吟']));

    const stemOnly = deriveRelationNames('甲丑', '庚寅');
    expect(stemOnly).toContain('天干冲');
    expect(stemOnly).not.toContain('天克地冲');
    expect(stemOnly).not.toContain('反吟');
  });

  it('流年与当前大运干支相同则标记岁运并临', () => {
    const relations = buildDynamicRelationMatches(
      {
        year: { stem: '甲', branch: '子', stemIndex: 0, branchIndex: 0 },
        month: { stem: '乙', branch: '丑', stemIndex: 1, branchIndex: 1 },
        day: { stem: '丙', branch: '寅', stemIndex: 2, branchIndex: 2 },
        hour: { stem: '丁', branch: '卯', stemIndex: 3, branchIndex: 3 },
      },
      '甲子',
      { ageStart: 1, stem: '甲', branch: '子', stemWuxing: '木' },
      { nominalAge: 1, stem: '戊', branch: '辰', stemShiShen: '食神', stemWuxing: '土', source: 'local-fallback' },
      'yearly',
    );

    expect(relations.decadal).toEqual([
      expect.objectContaining({ reference: 'decadal', referenceGanZhi: '甲子', relations: expect.arrayContaining(['伏吟', '岁运并临']) }),
    ]);
  });
});

describe('calcShenSha 神煞推算（甲日干 · 午日支 · 年支子 fixture）', () => {
  const fixture = {
    year: { stem: '甲', branch: '子' },
    month: { stem: '丙', branch: '寅' },
    day: { stem: '甲', branch: '午' },
    hour: { stem: '庚', branch: '申' },
  };
  it('默认年支查：禄神(寅·月)、驿马(寅·月)、将星(子·年)、月德贵人(丙·月)', () => {
    // 年支子 → 三合申子辰 → 将星子、驿马寅、华盖辰、桃花酉
    const ss = calcShenSha(fixture);
    const names = ss.map((s) => s.name);
    expect(names).toContain('禄神');
    expect(names).toContain('驿马');
    expect(names).toContain('将星');
    expect(names).toContain('月德贵人');
    expect(ss.find((s) => s.name === '将星')?.pillar).toBe('年');
    expect(ss.find((s) => s.name === '驿马')?.pillar).toBe('月');
    expect(ss.find((s) => s.name === '禄神')?.pillar).toBe('月');
  });
  it('日支查口径：将星(午·日)、驿马(申·时)', () => {
    // 日支午 → 三合寅午戌 → 将星午、驿马申、华盖戌、桃花卯
    const ss = calcShenSha(fixture, 'day');
    expect(ss.find((s) => s.name === '将星')?.pillar).toBe('日');
    expect(ss.find((s) => s.name === '驿马')?.pillar).toBe('时');
  });
  it('年支查与日支查将星落柱不同（口径切换有效）', () => {
    const yearBased = calcShenSha(fixture, 'year');
    const dayBased = calcShenSha(fixture, 'day');
    expect(yearBased.find((s) => s.name === '将星')?.pillar).toBe('年');
    expect(dayBased.find((s) => s.name === '将星')?.pillar).toBe('日');
  });
  it('甲午日柱不计魁罡，庚戌等四日才计', () => {
    expect(calcShenSha(fixture).some((s) => s.name === '魁罡')).toBe(false);
    const kg = calcShenSha({
      year: { stem: '庚', branch: '子' },
      month: { stem: '庚', branch: '寅' },
      day: { stem: '庚', branch: '戌' },
      hour: { stem: '庚', branch: '子' },
    });
    expect(kg.some((s) => s.name === '魁罡')).toBe(true);
  });
  it('相同神煞在同一柱同一地支只保留一项', () => {
    const ss = calcShenSha({
      year: { stem: '庚', branch: '子' },
      month: { stem: '乙', branch: '丑' },
      day: { stem: '庚', branch: '寅' },
      hour: { stem: '丁', branch: '亥' },
    });
    const taijiAtHour = ss.filter((item) => item.name === '太极贵人' && item.pillar === '时' && item.branch === '亥');
    expect(taijiAtHour).toHaveLength(1);
  });
});

describe('calcBaziEnveloped envelope 适配', () => {
  it('返回完整 ToolEnvelope，data 含 export_snapshot', () => {
    const env: ToolEnvelope = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('BaziEngine');
    const data = env.data as { dayMaster: string; pillars: { year: { stem: string } }; export_snapshot: { summary: string; sections: Array<{ heading: string }> } };
    expect(data.pillars.year.stem).toBe('庚');
    expect(data.export_snapshot.summary).toContain('日主');
    expect(data.export_snapshot.sections.some((s) => s.heading === '四柱')).toBe(true);
    expect(data.export_snapshot.sections.some((s) => s.heading === '整体状态')).toBe(true);
    expect(data.export_snapshot.sections.some((s) => s.heading === '平衡方向')).toBe(true);
    expect(data.export_snapshot.sections.some((s) => s.heading === '进阶观察')).toBe(true);
    expect(data.export_snapshot.sections.some((s) => s.heading === '大运')).toBe(true);
    const full = env.data as { shenSha?: ShenShaItem[]; advancedAnalysis: { support: { strength: string } }; export_snapshot: { summary: string; sections: Array<{ heading: string; body: string }> } };
    const strengthSection = full.export_snapshot.sections.find((section) => section.heading === '日主力量');
    const overviewSection = full.export_snapshot.sections.find((section) => section.heading === '整体状态');
    expect(full.export_snapshot.summary).toContain('整体力量');
    expect(strengthSection?.body).toContain('初步参考');
    expect(overviewSection?.body).toContain('当前判断为');
    expect(Array.isArray(full.shenSha)).toBe(true);
    expect(full.export_snapshot.sections.some((s) => s.heading === '神煞')).toBe(true);
  });

  it('传 transitDate 时在 data、evidence、快照与 calculationConfig 输出动态层', () => {
    const env = calcBaziEnveloped({
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      solar: getSolarEntry(),
      transitDate: '2025-07-15',
    });
    const data = env.data as {
      transit?: { targetDate: string; nominalAge: number; available: boolean };
      export_snapshot: { sections: Array<{ heading: string; body: string }> };
    };

    expect(data.transit).toMatchObject({ targetDate: '2025-07-15', nominalAge: 36, available: true });
    expect(data.export_snapshot.sections.find((section) => section.heading === '动态层')?.body).toContain('虚岁36');
    expect(env.evidence?.steps.map((step) => step.key)).toEqual(expect.arrayContaining([
      'transit-date', 'transit-minor', 'transit-yearly', 'transit-monthly', 'transit-daily', 'transit-relations',
    ]));
    expect(env.result_meta?.calculationConfig).toMatchObject({
      dynamicLayer: expect.objectContaining({ enabled: true, targetDate: '2025-07-15', minorFortuneAgeBasis: 'nominal-age' }),
    });
  });

  it('未传 transitDate 时保持既有本命 envelope 形状', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const data = env.data as { transit?: unknown; export_snapshot: { sections: Array<{ heading: string }> } };

    expect(data.transit).toBeUndefined();
    expect(data.export_snapshot.sections.some((section) => section.heading === '动态层')).toBe(false);
    expect(env.result_meta?.calculationConfig).not.toHaveProperty('dynamicLayer');
  });

  it('校正后时间用于定盘，并在快照保留用户可读口径', () => {
    const correctedBirth = { year: 1990, month: 6, day: 16, hour: 0, minute: 10, gender: '男' as const };
    const env = calcBaziEnveloped({
      birth: correctedBirth,
      timeContext: {
        civilBirth: { year: 1990, month: 6, day: 15, hour: 23, minute: 10, gender: '男', useExactCalendar: false },
        correctedBirth: { ...correctedBirth, useExactCalendar: false },
        correctionMinutes: 60,
        applied: true,
        reason: '测试校时。',
        crossedDate: true,
        crossedShichen: true,
        crossedZiChu: true,
        dayBoundaryRule: 'zi-chu-next-day',
      },
    });
    const direct = calculateBazi({ birth: correctedBirth });
    const data = env.data as { pillars: { day: { stem: string; branch: string } }; export_snapshot: { sections: Array<{ heading: string; body: string }> } };
    const timeSection = data.export_snapshot.sections.find((section) => section.heading === '排盘口径');

    expect(`${data.pillars.day.stem}${data.pillars.day.branch}`).toBe(`${direct.pillars.day.stem}${direct.pillars.day.branch}`);
    expect(timeSection?.body).toContain('民用出生时间：1990-06-15 23:10');
    expect(timeSection?.body).toContain('排盘时间：1990-06-16 00:10');
    expect(timeSection?.body).toContain('子初换日口径');
  });

  it('精确历法快照不包含实现或依赖名称', () => {
    const env = calcBaziEnveloped({
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      solar: getSolarEntry(),
    });
    const data = env.data as { export_snapshot: { sections: Array<{ heading: string; body: string }> } };
    const exportedText = data.export_snapshot.sections.map((section) => section.body).join('\n');

    expect(exportedText).not.toContain('lunar-javascript');
    expect(exportedText).not.toContain('Solar 全局对象');
    expect(exportedText).not.toContain('五行计数近似');
    expect(exportedText).not.toContain('简化口径');
    expect(exportedText).not.toContain('节气余气起运');
    expect(exportedText).toContain('传统文化学习');
  });

  it('参考推算模式带月柱提示', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(env.warnings?.some((w) => w.includes('月柱信息仅作辅助参考'))).toBe(true);
  });

  it('证据链 evidence 结构完整（步骤/事实/限制/元数据）', () => {
    const env = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(env.evidence).toBeDefined();
    expect(env.evidence!.steps.length).toBeGreaterThan(0);
    expect(env.evidence!.facts.length).toBeGreaterThan(0);
    expect(env.evidence!.limitations.length).toBeGreaterThan(0);
    expect(env.result_meta).toBeDefined();
    expect(env.result_meta!.evidenceSchemaVersion).toBe('0.1.0');
    // 事实含主证日主 + 限制边界
    const facts = env.evidence!.facts;
    expect(facts.some((f) => f.level === '主证' && f.title.includes('日主'))).toBe(true);
    expect(facts.some((f) => f.level === '主证' && f.title.includes('命局要览'))).toBe(true);
    expect(env.evidence!.steps.some((step) => step.key === 'advanced')).toBe(true);
    expect(facts.some((f) => f.level === '限制')).toBe(true);
    // 每步骤有 promptText（供 AI 转述）
    env.evidence!.steps.forEach((s) => expect(s.promptText.length).toBeGreaterThan(0));
  });

  it('默认与显式神煞口径均解析并写入证据与元数据', () => {
    const defaultEnv = calcBaziEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const explicitEnv = calcBaziEnveloped({
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      shenShaTrineSource: 'day',
    });

    expect(defaultEnv.result_meta?.calculationConfig).toMatchObject({
      calendarMode: 'approx',
      shenShaTrineSource: 'year',
      dayBoundaryRule: 'zi-chu-next-day',
      luckStartMethod: 'three-years-approx',
    });
    expect(explicitEnv.result_meta?.calculationConfig).toMatchObject({ shenShaTrineSource: 'day' });
    expect(explicitEnv.evidence?.steps.find((step) => step.key === 'settle')?.inputs).toMatchObject({
      config: { shenShaTrineSource: 'day' },
    });
  });
});
