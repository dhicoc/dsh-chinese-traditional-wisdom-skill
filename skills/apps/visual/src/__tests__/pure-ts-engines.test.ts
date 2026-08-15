import { describe, expect, it } from 'vitest';
import {
  getHouseGua,
  checkMingZhaiCompatibility,
  getPersonalDirections,
  getSectorAnalysis,
  EIGHT_MANSIONS_DATA_EXPORTED_FOR_TEST,
} from '@/legacy/bazhaiHouse';

/**
 * 验证 B 类引擎参数化后升为 A 类：不依赖 window.CORE，
 * 仅用内嵌常量或入参即可在 Node 环境独立计算。
 */

describe('bazhaiHouse 纯 TS 路径（无 window 依赖）', () => {
  it('getHouseGua 按朝向定宅卦', () => {
    const south = getHouseGua('南');
    expect(south?.trigram).toBe('离');
    expect(south?.group).toBe('东四宅');
    const north = getHouseGua('北');
    expect(north?.trigram).toBe('坎');
    expect(north?.group).toBe('东四宅');
    expect(getHouseGua('不正的方位')).toBeNull();
  });

  it('getPersonalDirections 不传 mansionsData 也能算（走内嵌常量）', () => {
    // 坎命：生气在东南、天医在东、延年在南、伏位在北
    const dirs = getPersonalDirections('坎');
    expect(dirs).not.toBeNull();
    const shengqi = dirs!.auspicious.find((d) => d.star === '生气');
    expect(shengqi?.direction).toBe('东南');
    const jueming = dirs!.inauspicious.find((d) => d.star === '绝命');
    expect(jueming?.direction).toBe('西南');
  });

  it('getPersonalDirections 传入自定义 mansionsData 时用入参', () => {
    const custom = {
      坎: { 北: '伏位', 东: '生气', 南: '天医', 东南: '延年', 西: '绝命', 西南: '五鬼', 东北: '六煞', 西北: '祸害' },
    };
    const dirs = getPersonalDirections('坎', custom);
    expect(dirs!.auspicious.find((d) => d.star === '生气')?.direction).toBe('东');
    expect(dirs!.inauspicious.find((d) => d.star === '绝命')?.direction).toBe('西');
  });

  it('getSectorAnalysis 不传 mansionsData 返回八方用途', () => {
    const analysis = getSectorAnalysis('离');
    expect(analysis).not.toBeNull();
    expect(analysis!.length).toBe(8);
    // 离命伏位在南
    const south = analysis!.find((a) => a.direction === '南');
    expect(south?.use.star).toBe('伏位');
  });

  it('checkMingZhaiCompatibility 不传 mansionsData 也能算弥补方位', () => {
    // 坎命（东四）住兑宅（西四）→ 不相配，弥补生气位（坎命生气在东南）
    const house = getHouseGua('西')!; // 兑宅
    const compat = checkMingZhaiCompatibility('坎', house);
    expect(compat?.level).toBe('不相配');
    expect(compat?.remedyDirection).toBe('东南');
  });

  it('乾卦方位表内嵌数据与修复后 fengshui.js 一致（东北天医/东五鬼/南绝命/西生气）', () => {
    // 这是之前修复的乾卦错位 bug 的回归保护
    const qian = EIGHT_MANSIONS_DATA_EXPORTED_FOR_TEST['乾'];
    expect(qian['东北']).toBe('天医');
    expect(qian['东']).toBe('五鬼');
    expect(qian['南']).toBe('绝命');
    expect(qian['西']).toBe('生气');
  });
});
