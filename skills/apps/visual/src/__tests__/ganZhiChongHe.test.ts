import { describe, it, expect } from 'vitest';
import {
  isChong,
  isLiuHe,
  isSanHe,
  isHai,
  isXing,
  isGanHe,
  isGanChong,
  relationBetweenPillars,
  relationScore,
} from '@/legacy/ganZhiChongHe';

describe('ganZhiChongHe 地支六冲', () => {
  it('子午相冲', () => {
    expect(isChong('子', '午')).toBe(true);
    expect(isChong('午', '子')).toBe(true);
  });
  it('辰戌相冲', () => {
    expect(isChong('辰', '戌')).toBe(true);
  });
  it('子丑不相冲', () => {
    expect(isChong('子', '丑')).toBe(false);
  });
  it('同支不相冲', () => {
    expect(isChong('子', '子')).toBe(false);
  });
});

describe('ganZhiChongHe 地支六合', () => {
  it('子丑六合', () => {
    expect(isLiuHe('子', '丑')).toBe(true);
  });
  it('寅亥六合', () => {
    expect(isLiuHe('寅', '亥')).toBe(true);
  });
  it('子午不六合', () => {
    expect(isLiuHe('子', '午')).toBe(false);
  });
});

describe('ganZhiChongHe 地支三合局', () => {
  it('申子辰同属水局', () => {
    expect(isSanHe('申', '子')).toBe(true);
    expect(isSanHe('子', '辰')).toBe(true);
    expect(isSanHe('申', '辰')).toBe(true);
  });
  it('亥卯未同属木局', () => {
    expect(isSanHe('亥', '卯')).toBe(true);
    expect(isSanHe('卯', '未')).toBe(true);
  });
  it('申丑不同局', () => {
    expect(isSanHe('申', '丑')).toBe(false);
  });
});

describe('ganZhiChongHe 相害', () => {
  it('子未相害', () => {
    expect(isHai('子', '未')).toBe(true);
  });
  it('子丑不相害', () => {
    expect(isHai('子', '丑')).toBe(false);
  });
});

describe('ganZhiChongHe 相刑', () => {
  it('子卯无礼之刑', () => {
    expect(isXing('子', '卯')).toBe(true);
  });
  it('寅巳申相刑', () => {
    expect(isXing('寅', '巳')).toBe(true);
    expect(isXing('巳', '申')).toBe(true);
  });
  it('辰辰自刑', () => {
    expect(isXing('辰', '辰')).toBe(true);
  });
  it('子子不自刑', () => {
    expect(isXing('子', '子')).toBe(false);
  });
});

describe('ganZhiChongHe 天干五合', () => {
  it('甲己合', () => {
    expect(isGanHe('甲', '己')).toBe(true);
  });
  it('戊癸合', () => {
    expect(isGanHe('戊', '癸')).toBe(true);
  });
  it('甲乙不合', () => {
    expect(isGanHe('甲', '乙')).toBe(false);
  });
});

describe('ganZhiChongHe 天干相冲', () => {
  it('甲庚冲', () => {
    expect(isGanChong('甲', '庚')).toBe(true);
  });
  it('丙壬冲', () => {
    expect(isGanChong('丙', '壬')).toBe(true);
  });
  it('戊己不冲（居中）', () => {
    expect(isGanChong('戊', '己')).toBe(false);
  });
});

describe('relationBetweenPillars 整柱关系', () => {
  it('甲子 vs 己午：天干五合 + 地支六冲（天合地冲）', () => {
    const rel = relationBetweenPillars('甲子', '己午');
    expect(rel.ganHe).toBe(true); // 甲己合
    expect(rel.chong).toBe(true); // 子午冲
  });
  it('甲子 vs 庚午：天干相冲 + 地支六冲（天克地冲，最凶）', () => {
    const rel = relationBetweenPillars('甲子', '庚午');
    expect(rel.ganChong).toBe(true); // 甲庚冲
    expect(rel.chong).toBe(true); // 子午冲
    expect(relationScore(rel)).toBeLessThan(0);
  });
  it('子丑 vs 午未：地支双六合（吉）', () => {
    const rel = relationBetweenPillars('子丑', '午未');
    // 取第二字为支：丑 vs 未 → 冲。此例说明函数取柱中支判断
    expect(rel.chong).toBe(true); // 丑未冲
  });
});

describe('relationScore 评分', () => {
  it('六合得正分', () => {
    expect(relationScore({ chong: false, liuHe: true, sanHe: false, hai: false, xing: false, ganHe: false, ganChong: false })).toBe(3);
  });
  it('六冲得负分', () => {
    expect(relationScore({ chong: true, liuHe: false, sanHe: false, hai: false, xing: false, ganHe: false, ganChong: false })).toBe(-3);
  });
  it('天克地冲为最负', () => {
    const score = relationScore({ chong: true, liuHe: false, sanHe: false, hai: false, xing: false, ganHe: false, ganChong: true });
    expect(score).toBe(-5);
  });
});
