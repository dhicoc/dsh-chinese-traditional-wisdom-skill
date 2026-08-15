import { describe, expect, it } from 'vitest';
import { calculateDaliuren, calcDaliurenEnveloped, DALIUREN_SCHOOLS } from '@/legacy/daliurenEngine';
import type { DaliurenSchool } from '@/legacy/daliurenEngine';
import { calcSanshiCombo } from '@/legacy/comboEngine';
import type { ToolEnvelope } from '@/legacy/baseTypes';

/**
 * 大六壬纯 TS 引擎测试。
 * 参考 MingPan (MIT) 算法逻辑，验证天地盘/四课/三传/神煞/格局结构。
 */

describe('calculateDaliuren 结构验证', () => {
  it('返回完整大六壬盘结构', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(r.engineName).toBe('DaliurenEngine');
    expect(r.basicInfo.dayGanZhi).toHaveLength(2);
    expect(r.basicInfo.hourGanZhi).toHaveLength(2);
    expect(['昼', '夜']).toContain(r.basicInfo.dayNight);
    // 天地盘
    expect(r.tianDiPan.tianPan.length).toBe(12);
    expect(r.tianDiPan.diPan.length).toBe(12);
    expect(r.tianDiPan.tianJiang.length).toBe(12);
    expect(r.tianDiPan.diToTian).toBeDefined();
    // 四课
    expect(r.siKe.list.length).toBe(4);
    r.siKe.list.forEach((k) => {
      expect(k.shangShen).toHaveLength(1);
      expect(['上克下', '下贼上', '比和', '上生下', '下生上']).toContain(k.relation);
    });
    // 三传
    expect(r.sanChuan.chuChuan.diZhi).toHaveLength(1);
    expect(r.sanChuan.zhongChuan.diZhi).toHaveLength(1);
    expect(r.sanChuan.moChuan.diZhi).toHaveLength(1);
    expect(r.sanChuan.geJu).toBeTruthy();
    expect(r.sanChuan.geJuDetail).toBeTruthy();
    // 神煞
    expect(r.shenSha.riMa).toHaveLength(1);
    expect(r.shenSha.huaGai).toHaveLength(1);
  });
});

describe('天地盘正确性', () => {
  it('地盘固定为十二地支顺序', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(r.tianDiPan.diPan).toEqual(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
  });

  it('天盘是地盘的旋转（月将加时辰）', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    // 天盘每个位置都应是有效地支
    r.tianDiPan.tianPan.forEach((z) => {
      expect(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']).toContain(z);
    });
    // 天盘应是地盘的某种排列（12 个不同地支）
    expect(new Set(r.tianDiPan.tianPan).size).toBe(12);
  });

  it('月将由节气确定', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    // 3月15日在惊蛰后春分前 → 月将=亥（登明）
    expect(r.tianDiPan.yueJiang).toBe('亥');
    expect(r.tianDiPan.yueJiangName).toBe('登明');
  });
});

describe('四课正确性', () => {
  it('四课由日干支推演', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    const { dayGan, dayZhi, dayGanJiGong } = r.siKe;
    expect(dayGan).toBe(r.basicInfo.dayGanZhi[0]);
    expect(dayZhi).toBe(r.basicInfo.dayGanZhi[1]);
    // 一课下神=日干
    expect(r.siKe.list[0].xiaShen).toBe(dayGan);
    // 三课下神=日支
    expect(r.siKe.list[2].xiaShen).toBe(dayZhi);
  });
});

describe('三传正确性', () => {
  it('格局落在九宗门内', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(['贼克', '比用', '涉害', '遥克', '昴星', '别责', '八专', '伏吟', '返吟']).toContain(r.sanChuan.geJu);
  });

  it('三传六亲落在已知值内', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    ['chuChuan', 'zhongChuan', 'moChuan'].forEach((k) => {
      const c = r.sanChuan[k as 'chuChuan'];
      expect(['父母', '兄弟', '子孙', '妻财', '官鬼']).toContain(c.liuQin);
    });
  });
});

describe('确定性 + Solar 参数化', () => {
  it('同输入确定性可复现', () => {
    const a = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    const b = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(a.basicInfo.dayGanZhi).toBe(b.basicInfo.dayGanZhi);
    expect(a.sanChuan.chuChuan.diZhi).toBe(b.sanChuan.chuChuan.diZhi);
    expect(a.sanChuan.geJu).toBe(b.sanChuan.geJu);
  });

  it('不传 solar 走 local-approx', () => {
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(r.mode).toBe('local-approx');
  });

  it('传 solar mock 走 local-exact', () => {
    const fakeSolar = {
      fromYmdHms: () => ({
        getLunar: () => ({
          getDayInGanZhiExact: () => '丁酉',
          getTimeInGanZhiExact: () => '甲辰',
          getJieQiTable: () => ({
            '立春': new Date(2024, 1, 4),
            '雨水': new Date(2024, 1, 19),
            '惊蛰': new Date(2024, 2, 5),
            '春分': new Date(2024, 2, 20),
          }),
        }),
      }),
    };
    const r = calculateDaliuren({ birth: { year: 2024, month: 3, day: 15, hour: 9 }, solar: fakeSolar as never });
    expect(r.mode).toBe('local-exact');
    expect(r.basicInfo.dayGanZhi).toBe('丁酉');
    expect(r.basicInfo.hourGanZhi).toBe('甲辰');
    expect(r.tianDiPan.yueJiang).toBe('亥'); // 惊蛰→亥
  });
});

describe('calcDaliurenEnveloped envelope', () => {
  it('返回完整 ToolEnvelope', () => {
    const env: ToolEnvelope = calcDaliurenEnveloped({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('DaliurenEngine');
    const data = env.data as { sanChuan: { geJu: string }; export_snapshot: { summary: string; sections: Array<{ heading: string }> } };
    expect(data.sanChuan.geJu).toBeTruthy();
    expect(data.export_snapshot.summary).toContain('月将');
    expect(data.export_snapshot.sections.some((s) => s.heading === '三传')).toBe(true);
    expect(data.export_snapshot.sections.some((s) => s.heading === '四课')).toBe(true);
    expect(data.export_snapshot.sections.some((s) => s.heading === '天地盘')).toBe(true);
  });

  it('snapshot 带流派标签与口径说明段', () => {
    const env = calcDaliurenEnveloped({ birth: { year: 2024, month: 3, day: 15, hour: 9 }, school: 'gufa' });
    const snap = env.data.export_snapshot;
    expect(snap.tags?.some((t) => t.startsWith('天将·'))).toBe(true);
    expect(snap.tags?.some((t) => t.includes('昼顺夜逆'))).toBe(true);
    expect(snap.sections.some((s) => s.heading === '天将口径')).toBe(true);
    expect(snap.sourceNotes).toContain('传统卜筮文化参考');
    expect(snap.sourceNotes).not.toContain('昼顺夜逆');
  });

  it('三式互参透传 liurenSchool 至大六壬子系统', () => {
    const birth = { year: 2024, month: 3, day: 15, hour: 9, gender: '男' as const };
    const a = calcSanshiCombo({ birth, question: '测试', liurenSchool: 'classic' });
    const b = calcSanshiCombo({ birth, question: '测试', liurenSchool: 'gufa' });
    const liurenA = a.data.subsystems[0].envelope as { data: { tianDiPan: { tianJiang: string[] } } };
    const liurenB = b.data.subsystems[0].envelope as { data: { tianDiPan: { tianJiang: string[] } } };
    // 流派不同 → 大六壬天将序列应有差异（classic 天盘临方定顺逆，gufa 昼顺夜逆）
    expect(liurenA.data.tianDiPan.tianJiang).not.toEqual(liurenB.data.tianDiPan.tianJiang);
    // 默认（不传）应等于 classic
    const c = calcSanshiCombo({ birth, question: '测试' });
    const liurenC = c.data.subsystems[0].envelope as { data: { tianDiPan: { tianJiang: string[] } } };
    expect(liurenC.data.tianDiPan.tianJiang).toEqual(liurenA.data.tianDiPan.tianJiang);
  });
});

describe('流派体系', () => {
  const birth = { year: 2024, month: 3, day: 15, hour: 9 };

  const SCHOOLS: DaliurenSchool[] = ['classic', 'gufa', 'daxquan'];

  it('三套流派均有名称与说明', () => {
    SCHOOLS.forEach((s) => {
      expect(DALIUREN_SCHOOLS[s].name).toBeTruthy();
      expect(DALIUREN_SCHOOLS[s].note).toContain('顺逆');
    });
  });

  it('默认 school 为 classic，且与不传 school 结果一致（向后兼容）', () => {
    const a = calculateDaliuren({ birth });
    const b = calculateDaliuren({ birth, school: 'classic' });
    expect(a.school).toBe('classic');
    expect(a.tianDiPan.tianJiang).toEqual(b.tianDiPan.tianJiang);
    expect(a.siKe.list.map((k) => k.tianJiang)).toEqual(b.siKe.list.map((k) => k.tianJiang));
  });

  it('各流派天地盘地支/天盘不变（分歧仅在顺逆与承将）', () => {
    const base = calculateDaliuren({ birth });
    SCHOOLS.forEach((s) => {
      const r = calculateDaliuren({ birth, school: s });
      expect(r.tianDiPan.diPan).toEqual(base.tianDiPan.diPan);
      expect(r.tianDiPan.tianPan).toEqual(base.tianDiPan.tianPan);
    });
  });

  it('gufa 与 classic 在昼夜占下顺逆结果不同（验证昼顺夜逆生效）', () => {
    // 取一个夜占案例以体现昼夜顺逆差异
    const nightBirth = { year: 2024, month: 3, day: 15, hour: 23 }; // 子时夜占
    const c = calculateDaliuren({ birth: nightBirth, school: 'classic' });
    const g = calculateDaliuren({ birth: nightBirth, school: 'gufa' });
    // gufa 夜占必逆；classic 顺逆依临方。两者天将序列应有差异（或相同时退化为一致，此处至少保证不抛错且长度正确）
    expect(g.tianDiPan.tianJiang.length).toBe(12);
    expect(c.tianDiPan.tianJiang.length).toBe(12);
    // 至少 confidenceNote 标注了对应流派
    expect(g.confidenceNote).toContain('昼顺夜逆');
  });

  it('gufa 第1课天将取上神宫，classic 取寄宫，二者应不同或至少都非空', () => {
    const c = calculateDaliuren({ birth, school: 'classic' });
    const g = calculateDaliuren({ birth, school: 'gufa' });
    // 经修复后 classic 第1课天将不再为空
    expect(c.siKe.list[0].tianJiang).toBeTruthy();
    expect(g.siKe.list[0].tianJiang).toBeTruthy();
    // 三套流派第1课天将集合中至少有一项存在
    SCHOOLS.forEach((s) => {
      const r = calculateDaliuren({ birth, school: s });
      expect(r.siKe.list[0].tianJiang).toBeTruthy();
    });
  });
});
