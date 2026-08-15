import { describe, expect, it } from 'vitest';
import { routeQuery } from '@/lib/agentRouter';

describe('agentRouter routeQuery', () => {
  it('routes a career question to bazi', () => {
    const route = routeQuery('我想看事业');
    expect(route?.module).toBe('bazi');
    expect(route?.reason).toContain('事业');
  });

  it('routes a wealth question to bazi', () => {
    const route = routeQuery('今年财运怎么样');
    expect(route?.module).toBe('bazi');
  });

  it('routes a marriage question to bazi', () => {
    const route = routeQuery('什么时候能结婚');
    expect(route?.module).toBe('bazi');
  });

  it('routes a divination decision to liuyao', () => {
    const route = routeQuery('要不要换工作');
    expect(route?.module).toBe('liuyao');
    expect(route?.reason).toContain('占断');
  });

  it('routes fengshui questions to fengshui', () => {
    const route = routeQuery('办公室风水布局');
    expect(route?.module).toBe('fengshui');
  });

  it('routes health/constitution to tizhi', () => {
    const route = routeQuery('我气虚怎么调养');
    expect(route?.module).toBe('tizhi');
  });

  it('extracts birth info and defaults to bazi when no module signal', () => {
    const route = routeQuery('1990-06-15 12 男');
    expect(route?.module).toBe('bazi');
    expect(route?.birthPatch).toMatchObject({ year: 1990, month: 6, day: 15, hour: 12, gender: '男' });
  });

  it('combines birth info with intent routing', () => {
    const route = routeQuery('1990-06-15 12 男 我想看事业');
    expect(route?.module).toBe('bazi');
    expect(route?.birthPatch).toMatchObject({ year: 1990, gender: '男' });
    expect(route?.question).toContain('事业');
  });

  it('routes almanac queries', () => {
    const route = routeQuery('今天宜什么');
    expect(route?.module).toBe('almanac');
  });

  it('routes name analysis', () => {
    const route = routeQuery('帮我看名字五行');
    expect(route?.module).toBe('namewuxing');
  });

  it('returns null for empty or unrecognizable input', () => {
    expect(routeQuery('')).toBeNull();
    expect(routeQuery('   ')).toBeNull();
    // 无任何关键词、无日期的纯助词串
    expect(routeQuery('的吗呢')).toBeNull();
  });

  it('routes liuyao explicit command and keeps liuyao detail', () => {
    const route = routeQuery('六爻 今日财运');
    expect(route?.module).toBe('liuyao');
    expect(route?.liuyao).toMatchObject({ method: 'coin', question: '今日财运' });
  });

  it('routes meihua explicit command with engine-compatible detail', () => {
    const route = routeQuery('梅花 数字 3 5');
    expect(route?.module).toBe('meihua');
    expect(route?.meihua).toMatchObject({ method: 'number', numberA: 3, numberB: 5 });
  });

  it('routes reader explicit command and keeps reader detail', () => {
    const route = routeQuery('古籍 生气');
    expect(route?.module).toBe('reader');
    expect(route?.reader).toMatchObject({ term: '生气' });
  });

  it('detects lunar birth in loose extraction', () => {
    const route = routeQuery('农历 1992-3-4 23 男');
    expect(route?.birthPatch).toMatchObject({ isLunar: true, year: 1992, gender: '男' });
  });

  it('routes personality questions to bazi', () => {
    const route = routeQuery('我脾气怎么样');
    expect(route?.module).toBe('bazi');
    expect(route?.reason).toContain('性格');
  });

  it('routes exam/study questions to bazi', () => {
    const route = routeQuery('我的学业运势怎么样');
    expect(route?.module).toBe('bazi');
    expect(route?.reason).toContain('学业');
  });

  it('routes ziwei star questions to ziwei', () => {
    const route = routeQuery('我的紫微命宫是什么星曜');
    expect(route?.module).toBe('ziwei');
  });

  it('routes bazhai bedroom questions to bazhai', () => {
    const route = routeQuery('八宅卧室方位');
    expect(route?.module).toBe('bazhai');
  });

  it('routes rhythm meridian questions to rhythm', () => {
    const route = routeQuery('子午流注是什么');
    expect(route?.module).toBe('rhythm');
  });

  it('returns alternatives when multiple modules score close', () => {
    // 风水 + 八宅都命中"方位/八宅"类
    const route = routeQuery('办公室八宅方位布局');
    expect(route).not.toBeNull();
    expect(route?.alternatives).toBeDefined();
    expect(route?.alternatives?.length).toBeGreaterThan(0);
  });

  it('alternatives excludes the chosen module', () => {
    const route = routeQuery('办公室八宅方位布局');
    if (route?.alternatives) {
      route.alternatives.forEach((alt) => {
        expect(alt.module).not.toBe(route.module);
      });
    }
  });
});
