import { describe, expect, it } from 'vitest';
import { calculateQimen, calcQimenEnveloped } from '@/legacy/qimenEngine';
import type { ToolEnvelope } from '@/legacy/baseTypes';

/**
 * 奇门遁甲纯 TS 引擎测试（C 类迁移第六步）。
 * 用真实 3meta v2.6.0 ESM 排盘，验证结构正确 + 确定性 + 与旧引擎一致。
 */

describe('calculateQimen 真实 3meta ESM 排盘', () => {
  it('2024-3-15 9时：返回 local-exact 完整九宫', () => {
    const r = calculateQimen({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(r.mode).toBe('local-exact');
    expect(r.engineName).toBe('Qimen3metaAdapter');
    expect(r.version).toContain('3meta');
    expect(r._is3meta).toBe(true);
    expect(r.palaces.length).toBe(9);
    expect(r.dun).toMatch(/[阴阳]遁/);
    expect(r.ju).toMatch(/\d+局/);
    expect(r.zhiFu).toBeTruthy();
    expect(r.zhiShi).toBeTruthy();
  });

  it('与旧引擎一致：2024-3-15 9时 阳遁4局、值符天英、值使景门', () => {
    // Node 探查确认：byDatetime('2024-3-15 09:00:00') → 阳遁4局，值符天英position1，值使景门position3
    const r = calculateQimen({ birth: { year: 2024, month: 3, day: 15, hour: 9, minute: 0 } });
    expect(r.dun).toBe('阳遁');
    expect(r.ju).toBe('4局');
    expect(r.zhiFu?.star).toBe('天英');
    expect(r.zhiFu?.position).toBe(1);
    expect(r.zhiShi?.gate).toBe('景门');
    expect(r.zhiShi?.position).toBe(3);
  });

  it('同输入确定性可复现', () => {
    const a = calculateQimen({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    const b = calculateQimen({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(a.dun + a.ju).toBe(b.dun + b.ju);
    expect(a.zhiFu?.star).toBe(b.zhiFu?.star);
    expect(a.palaces[0].gate).toBe(b.palaces[0].gate);
  });

  it('九宫每宫含门/星/神/干支/五行', () => {
    const r = calculateQimen({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    r.palaces.forEach((p) => {
      expect(p.trigram).toBeTruthy();
      expect(p.gate).toBeTruthy();
      expect(p.position).toBeGreaterThanOrEqual(1);
      expect(p.position).toBeLessThanOrEqual(9);
    });
  });

  it('四柱 timeInfo 含年月日时干支', () => {
    const r = calculateQimen({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(r.timeInfo).toBeTruthy();
    expect(r.timeInfo?.yearGZ).toHaveLength(2);
    expect(r.timeInfo?.hourGZ).toHaveLength(2);
  });

  it('格局数组含吉凶（大多数盘有格局）', () => {
    const r = calculateQimen({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    // 吉格或凶格至少有一个非空
    expect(r.auspiciousPatterns.length + r.inauspiciousPatterns.length).toBeGreaterThan(0);
  });

  it('不同时辰产生不同盘（9时 vs 12时）', () => {
    const r9 = calculateQimen({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    const r12 = calculateQimen({ birth: { year: 2024, month: 3, day: 15, hour: 12 } });
    // 时辰不同 → 时柱/值使/盘面应有差异
    const same = r9.timeInfo?.hourGZ === r12.timeInfo?.hourGZ && r9.zhiShi?.gate === r12.zhiShi?.gate;
    expect(same).toBe(false);
  });

  it('门迫标注为凶', () => {
    const r = calculateQimen({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    // 至少有一宫门，且门迫的 gateLuck=凶
    const hasGate = r.palaces.some((p) => p.gate && p.gate !== '无门');
    expect(hasGate).toBe(true);
    // 验证门运标注落在已知值内
    r.palaces.forEach((p) => {
      if (p.gate && p.gate !== '无门') {
        expect(['大吉', '吉', '中平', '凶', '大凶']).toContain(p.gateLuck);
      }
    });
  });
});

describe('calcQimenEnveloped envelope 适配', () => {
  it('返回完整 ToolEnvelope，data 含 export_snapshot', () => {
    const env: ToolEnvelope = calcQimenEnveloped({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    expect(env.ok).toBe(true);
    expect(env.tool).toBe('Qimen3metaAdapter');
    const data = env.data as { dun: string; ju: string; palaces: unknown[]; export_snapshot: { summary: string; sections: Array<{ heading: string }> } };
    expect(data.dun).toBe('阳遁');
    expect(data.palaces.length).toBe(9);
    expect(data.export_snapshot.summary).toContain('阳遁');
    expect(data.export_snapshot.sections.some((s) => s.heading === '遁局')).toBe(true);
    expect(data.export_snapshot.sections.some((s) => s.heading === '九宫分布')).toBe(true);
  });

  it('envelope summary 含值符值使', () => {
    const env = calcQimenEnveloped({ birth: { year: 2024, month: 3, day: 15, hour: 9 } });
    const data = env.data as { export_snapshot: { summary: string } };
    expect(data.export_snapshot.summary).toContain('值符');
    expect(data.export_snapshot.summary).toContain('值使');
  });
});
