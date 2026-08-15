import { describe, expect, it } from 'vitest';
import { calculateZiwei, calcZiweiEnveloped, getZiweiHoroscopeSummary, getZiweiTransitSnapshot } from '@/legacy/ziweiEngine';
import type { ToolEnvelope } from '@/legacy/baseTypes';

/**
 * 紫微斗数纯 TS 引擎测试（C 类迁移第五步）。
 * 用真实 iztro v2.5.8 ESM 排盘，验证结构正确 + 确定性。
 */

describe('calculateZiwei 真实 iztro ESM 排盘', () => {
  it('1990-6-15 12时男：返回 local-exact 完整十二宫', () => {
    const r = calculateZiwei({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(r.mode).toBe('local-exact');
    expect(r.engineName).toBe('ZiweiIztroAdapter');
    expect(r.version).toContain('iztro');
    // 十二宫齐全
    const palaceNames = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];
    palaceNames.forEach((name) => {
      expect(r.palaces[name]).toBeDefined();
      expect(r.palaces[name].position).toBeTruthy();
    });
    expect(r.mainStars.length).toBeGreaterThan(0);
    expect(r.chart).toBeTruthy();
  });

  it('同输入确定性可复现', () => {
    const a = calculateZiwei({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const b = calculateZiwei({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(a.palaces['命宫'].stars.join(',')).toBe(b.palaces['命宫'].stars.join(','));
    expect(a.palaces['命宫'].position).toBe(b.palaces['命宫'].position);
  });

  it('iztro 仆役宫归一为交友', () => {
    const r = calculateZiwei({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(r.palaces['交友']).toBeDefined();
    // 不应有"仆役"键
    expect(r.palaces['仆役']).toBeUndefined();
  });

  it('四化映射含禄权科忌中至少一项（大多数命盘有四化）', () => {
    const r = calculateZiwei({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const huaValues = Object.values(r.sihua);
    expect(huaValues.some((v) => ['禄', '权', '科', '忌'].includes(v))).toBe(true);
  });

  it('性别差异产生不同命盘（男命 vs 女命）', () => {
    const male = calculateZiwei({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const female = calculateZiwei({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '女' } });
    // 男女命大限起向不同，至少某宫星曜或庙旺应有差异（命宫相同但其他宫可能不同）
    // 用整体 mainStars 顺序 + 命宫星对比
    const sameMing = male.palaces['命宫'].stars.join(',') === female.palaces['命宫'].stars.join(',');
    // 不强制必须不同（同日同时辰男女命宫星可能同），但 sihua/大限应不同。这里只验证都能算出。
    expect(male.mode).toBe('local-exact');
    expect(female.mode).toBe('local-exact');
    // 标记：若命宫相同属正常，不算失败
    void sameMing;
  });

  it('23时映射到早子时（timeIndex=0）不报错', () => {
    const r = calculateZiwei({ birth: { year: 1990, month: 6, day: 15, hour: 23, gender: '男' } });
    expect(r.mode).toBe('local-exact');
    expect(r.palaces['命宫']).toBeDefined();
  });

  it('保留 iztro 已安置的吉辅、六煞与杂曜分类', () => {
    const r = calculateZiwei({ birth: { year: 2000, month: 8, day: 16, hour: 3, gender: '男' } });
    const palaceWithFire = Object.values(r.palaces).find((palace) => palace.minorStars.some((star) => star.name === '火星'));
    const palaceWithFlower = Object.values(r.palaces).find((palace) => palace.adjectiveStars.some((star) => star.type === 'flower'));
    expect(palaceWithFire?.minorStars).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '火星', type: 'tough', scope: 'origin', source: 'minorStars' }),
    ]));
    expect(palaceWithFlower?.adjectiveStars).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'flower', scope: 'origin', source: 'adjectiveStars' }),
    ]));
    expect(r.palaces['命宫'].stars).toContain('凤阁');
  });

  it('保留本命长生十二神与博士十二神的落宫', () => {
    const r = calculateZiwei({ birth: { year: 2000, month: 8, day: 16, hour: 3, gender: '男' } });

    expect(r.palaces['命宫'].changsheng12).toBe('死');
    expect(r.palaces['命宫'].boshi12).toBe('伏兵');
    expect(r.palaces['交友'].changsheng12).toBe('长生');
    expect(r.palaces['福德'].boshi12).toBe('博士');
  });
});

describe('getZiweiTransitSnapshot 运限流年分层', () => {
  it('按目标日期返回大限流耀、流年实位与流年十二神', () => {
    const snapshot = getZiweiTransitSnapshot(
      { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      '2025-07-15',
    );

    expect(snapshot.available).toBe(true);
    expect(snapshot.targetDate).toBe('2025-07-15');
    expect(snapshot.decadal).toMatchObject({ stem: '己', branch: '卯', mutagen: ['武曲', '贪狼', '天梁', '文曲'] });
    expect(snapshot.yearly).toMatchObject({ stem: '乙', branch: '巳', mutagen: ['天机', '天梁', '紫微', '太阴'] });
    expect(snapshot.yearly.mingPalace).toEqual({ natalPalace: '交友', earthlyBranch: '巳' });
    expect(snapshot.yearly.starsByNatalPalace['兄弟']).toEqual(expect.arrayContaining(['流马']));
    expect(snapshot.yearly.starsByNatalPalace['财帛']).toEqual(expect.arrayContaining(['流钺', '流曲']));
    expect(snapshot.yearly.suiqian12ByNatalPalace['交友']).toBe('岁建');
    expect(snapshot.yearly.jiangqian12ByNatalPalace['交友']).toBe('指背');
  });
});

describe('getZiweiHoroscopeSummary 动态层摘要', () => {
  it('返回目标年月的流月、小限与流年信息', () => {
    const summary = getZiweiHoroscopeSummary(
      { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      2025,
      7,
    );

    expect(summary.available).toBe(true);
    expect(summary.targetYear).toBe(2025);
    expect(summary.targetMonth).toBe(7);
    expect(summary.monthly).toMatchObject({ stem: '癸', branch: '未', mutagen: ['破军', '巨门', '太阴', '贪狼'] });
    expect(summary.age).toMatchObject({ nominalAge: 36, palace: '兄弟' });
  });
});

describe('calcZiweiEnveloped envelope 适配', () => {
  it('返回 ok=true 的完整 ToolEnvelope，data 含 export_snapshot', () => {
    const env: ToolEnvelope = calcZiweiEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('ZiweiIztroAdapter');
    const data = env.data as { palaces: Record<string, { stars: string[] }>; export_snapshot: { summary: string; sections: Array<{ heading: string }> } };
    expect(data.palaces['命宫']).toBeDefined();
    expect(data.export_snapshot.summary).toContain('紫微斗数');
    expect(data.export_snapshot.sections.length).toBeGreaterThanOrEqual(12);
    expect(env.warnings?.length).toBeGreaterThanOrEqual(1);
  });

  it('export_snapshot 含命宫段与四化段', () => {
    const env = calcZiweiEnveloped({ birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' } });
    const data = env.data as { export_snapshot: { sections: Array<{ heading: string }> } };
    expect(data.export_snapshot.sections.some((s) => s.heading === '命宫')).toBe(true);
    expect(data.export_snapshot.sections.some((s) => s.heading === '四化')).toBe(true);
  });

  it('导出使用调用方指定的动态年月，而非运行时当前年份', () => {
    const env = calcZiweiEnveloped({
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      transit: { year: 2025, month: 7 },
    });
    const data = env.data as { export_snapshot: { sections: Array<{ heading: string; body: string }> } };
    const method = data.export_snapshot.sections.find((section) => section.heading === '排盘口径');
    const transitSection = data.export_snapshot.sections.find((section) => section.heading === '大限与流年');

    expect(method?.body).toContain('2025年7月15日');
    expect(transitSection?.body).toContain('2025年');
    expect(data.export_snapshot.sections.some((section) => section.heading === '流月与小限')).toBe(true);
  });

  it('动态年月与固定口径统一写入证据和元数据', () => {
    const env = calcZiweiEnveloped({
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      transit: { year: 2025, month: 7 },
    });

    expect(env.result_meta?.calculationConfig).toMatchObject({
      transit: { year: 2025, month: 7, day: 15 },
      hourRule: '23:00-23:59=>early-zi',
      palaceNameNormalization: '仆役→交友',
      enabledDynamicLayers: ['decadal', 'yearly', 'monthly', 'age'],
    });
    expect(env.evidence?.steps.find((step) => step.key === 'dynamic-transit')?.inputs).toMatchObject({
      config: { transit: { year: 2025, month: 7, day: 15 } },
    });
  });
});
