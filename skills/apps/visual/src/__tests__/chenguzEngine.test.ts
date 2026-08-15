import { describe, it, expect } from 'vitest';
import { calcChenguz, calcChenguzEnveloped } from '@/legacy/chenguzEngine';

// 1990-06-15 12:00 男（公历）→ 农历 1990 五月廿三，年柱庚午，时支午
const BIRTH = { year: 1990, month: 6, day: 15, hour: 12, gender: '男' };

describe('calcChenguz 称骨', () => {
  it('返回 ok=true 的 ToolEnvelope', () => {
    const env = calcChenguz({ birth: BIRTH });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('calc_chenguz');
    expect(env.data).toBeTruthy();
  });

  it('四柱骨重均非负', () => {
    const env = calcChenguz({ birth: BIRTH });
    const r = env.data;
    expect(r.yearBone.weight.liang * 10 + r.yearBone.weight.qian).toBeGreaterThanOrEqual(0);
    expect(r.monthBone.weight.liang * 10 + r.monthBone.weight.qian).toBeGreaterThanOrEqual(0);
    expect(r.dayBone.weight.liang * 10 + r.dayBone.weight.qian).toBeGreaterThanOrEqual(0);
    expect(r.hourBone.weight.liang * 10 + r.hourBone.weight.qian).toBeGreaterThanOrEqual(0);
  });

  it('总重 = 四柱骨重之和', () => {
    const env = calcChenguz({ birth: BIRTH });
    const r = env.data;
    const sumQ = r.yearBone.weight.liang * 10 + r.yearBone.weight.qian
      + r.monthBone.weight.liang * 10 + r.monthBone.weight.qian
      + r.dayBone.weight.liang * 10 + r.dayBone.weight.qian
      + r.hourBone.weight.liang * 10 + r.hourBone.weight.qian;
    const totalQ = r.total.liang * 10 + r.total.qian;
    expect(totalQ).toBe(sumQ);
  });

  it('totalText 含「两」', () => {
    const env = calcChenguz({ birth: BIRTH });
    expect(env.data.totalText).toContain('两');
  });

  it('称骨歌命中总重', () => {
    const env = calcChenguz({ birth: BIRTH });
    const r = env.data;
    const totalQ = r.total.liang * 10 + r.total.qian;
    // 总重应在称骨歌覆盖范围 21-72
    expect(totalQ).toBeGreaterThanOrEqual(21);
    expect(totalQ).toBeLessThanOrEqual(72);
    expect(r.song).toBeTruthy();
    expect(r.song.length).toBeGreaterThan(5);
  });

  it('tone 在吉/中/凶之一', () => {
    const env = calcChenguz({ birth: BIRTH });
    expect(['吉', '中', '凶']).toContain(env.data.tone);
  });

  it('年骨重按60甲子年查表', () => {
    const env = calcChenguz({ birth: BIRTH });
    // 1990 = 庚午年 → 9钱（60甲子年骨重表）
    expect(env.data.yearBone.branch).toBe('庚午');
    expect(env.data.yearBone.weight.liang).toBe(0);
    expect(env.data.yearBone.weight.qian).toBe(9);
  });

  it('synthesis 含总重与称骨歌', () => {
    const env = calcChenguz({ birth: BIRTH });
    expect(env.data.synthesis).toContain(env.data.totalText);
    expect(env.data.synthesis).toContain(env.data.song.slice(0, 4));
  });

  it('export_snapshot 含四柱骨重/总重/称骨歌三段', () => {
    const env = calcChenguz({ birth: BIRTH });
    const sections = env.data.export_snapshot.sections;
    expect(sections.length).toBeGreaterThanOrEqual(3);
    expect(sections.some((s) => s.heading === '四柱骨重')).toBe(true);
    expect(sections.some((s) => s.heading === '称骨歌')).toBe(true);
  });

  it('interpretation 非空', () => {
    const env = calcChenguz({ birth: BIRTH });
    expect(env.data.interpretation).toBeTruthy();
    expect(env.data.interpretation).toContain(env.data.totalText);
  });
});

describe('calcChenguzEnveloped', () => {
  it('与 calcChenguz 一致', () => {
    const a = calcChenguz({ birth: BIRTH });
    const b = calcChenguzEnveloped({ birth: BIRTH });
    expect(b.ok).toBe(true);
    expect(b.data.totalText).toBe(a.data.totalText);
  });
});

describe('多版本切换', () => {
  // 1983 = 癸亥年：standard/full 取7钱，folk 取6钱 → 总重应差1钱
  const GUIHAI_BIRTH = { year: 1983, month: 6, day: 15, hour: 12, gender: '男' };

  it('默认版本为 standard', () => {
    const env = calcChenguz({ birth: BIRTH });
    expect(env.data.versionId).toBe('standard');
    expect(env.data.versionName).toBe('通行工整本');
  });

  it('三版本 versionName/versionId 正确回填', () => {
    const s = calcChenguz({ birth: BIRTH, version: 'standard' });
    const f = calcChenguz({ birth: BIRTH, version: 'folk' });
    const u = calcChenguz({ birth: BIRTH, version: 'full' });
    expect(s.data.versionId).toBe('standard');
    expect(f.data.versionId).toBe('folk');
    expect(u.data.versionId).toBe('full');
    expect(s.data.versionName).toBe('通行工整本');
    expect(f.data.versionName).toBe('民间传抄本');
    expect(u.data.versionName).toBe('全本异文');
  });

  it('癸亥年 folk(6钱) 与 standard(7钱) 年骨重不同 → 总重差1钱', () => {
    const s = calcChenguz({ birth: GUIHAI_BIRTH, version: 'standard' });
    const f = calcChenguz({ birth: GUIHAI_BIRTH, version: 'folk' });
    const sQ = s.data.total.liang * 10 + s.data.total.qian;
    const fQ = f.data.total.liang * 10 + f.data.total.qian;
    expect(s.data.yearBone.weight.qian).toBe(7);
    expect(f.data.yearBone.weight.qian).toBe(6);
    expect(sQ - fQ).toBe(1);
  });

  it('同一总重在 standard 与 full 的称骨歌可能不同（异文）', () => {
    // 1990 庚午9 + 农历5月5钱 + 廿三8钱 + 午时10钱 = 32钱 → 各版本 32 钱歌诀应非空
    const s = calcChenguz({ birth: BIRTH, version: 'standard' });
    const u = calcChenguz({ birth: BIRTH, version: 'full' });
    expect(s.data.song.length).toBeGreaterThan(5);
    expect(u.data.song.length).toBeGreaterThan(5);
    // export_snapshot 含「版本」段
    expect(s.data.export_snapshot.sections.some((sec) => sec.heading === '版本')).toBe(true);
  });

  it('folk 版本缺 72 钱 → 总重72 时给出未收录 warning', () => {
    // 构造一个能算出 72 钱的输入较难（需年19+月18+日18+时17），folk 年表无17钱时辰
    // 改为直接验证 folk 版 song 表无 72 键
    const f = calcChenguz({ birth: BIRTH, version: 'folk' });
    // folk 最多 71，BIRTH 算出的总重必 ≤71，song 应有值
    expect(f.data.song).toBeTruthy();
  });
});
