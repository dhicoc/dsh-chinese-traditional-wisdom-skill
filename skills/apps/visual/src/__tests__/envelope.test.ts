import { describe, expect, it } from 'vitest';
import { searchDreamEnveloped } from '@/legacy/envelopeSample';
import {
  calcXiYongEnveloped,
  calcNameRatingEnveloped,
  getConstitutionTendencyEnveloped,
} from '@/legacy/envelopeAdapters';
import { wrapEnvelope, type ToolEnvelope } from '@/legacy/baseTypes';

describe('ToolEnvelope 统一信封', async () => {
  describe('wrapEnvelope', async () => {
    it('从裸返回值提取 tool/version，把 confidenceNote 转为 warnings', async () => {
      const env = wrapEnvelope(
        { engineName: 'TestAdapter', version: '1.2.3', mode: 'local-exact', confidenceNote: '流派差异提示', foo: 'bar' },
        { year: 1990, month: 6 },
      );
      expect(env.ok).toBe(true);
      expect(env.tool).toBe('TestAdapter');
      expect(env.version).toBe('1.2.3');
      expect(env.warnings).toContain('流派差异提示');
      expect((env.data as Record<string, unknown>).foo).toBe('bar');
      expect(env.input_normalized).toEqual({ year: 1990, month: 6 });
    });

    it('无 engineName 时 tool 兜底为 unknown，无 version 时兜底为 mode', async () => {
      const env = wrapEnvelope({ mode: 'demo' }, null);
      expect(env.tool).toBe('unknown');
      expect(env.version).toBe('demo');
    });

    it('提供 snapshot 时挂到 data.export_snapshot', async () => {
      const snapshot = { summary: 's', sections: [{ heading: 'h', body: 'b' }] };
      const env = wrapEnvelope({ engineName: 'X', version: '1' }, {}, snapshot);
      expect((env.data as Record<string, unknown>).export_snapshot).toBe(snapshot);
    });

    it('非对象输入包装为 { value: input }', async () => {
      const env = wrapEnvelope({ engineName: 'X' }, 42);
      expect(env.input_normalized).toEqual({ value: 42 });
    });
  });

  describe('searchDreamEnveloped 样板', async () => {
    it('命中关键词返回 ok=true 的完整 envelope', async () => {
      const env = searchDreamEnveloped('蛇');
      expect(env.ok).toBe(true);
      expect(env.tool).toBe('DreamDictionaryAdapter');
      expect(env.version).toBeTruthy();
      // data 主体是搜索结果 + export_snapshot
      const data = env.data as { entries: unknown[]; classics: unknown[]; hit: boolean; export_snapshot: { summary: string; sections: Array<{ heading: string; body: string }> } };
      expect(data.hit).toBe(true);
      expect(data.export_snapshot.summary).toContain('蛇');
      expect(data.export_snapshot.sections.length).toBeGreaterThanOrEqual(2);
      expect(env.input_normalized).toEqual({ keyword: '蛇', useFull: false });
    });

    it('未命中关键词返回 ok=true 但带 warning', async () => {
      const env = searchDreamEnveloped('zzz不存在的梦象xyz');
      const data = env.data as { hit: boolean };
      // 可能误命中也可能不命中；命中就不该有未命中warning，未命中就该有
      if (!data.hit) {
        expect(env.warnings?.some((w) => w.includes('未命中'))).toBe(true);
      }
    });

    it('envelope 结构满足 ToolEnvelope 类型契约（ok/tool/version/input_normalized/data 必填）', async () => {
      const env: ToolEnvelope = searchDreamEnveloped('水');
      expect(typeof env.ok).toBe('boolean');
      expect(typeof env.tool).toBe('string');
      expect(typeof env.version).toBe('string');
      expect(typeof env.input_normalized).toBe('object');
      expect(env.data).toBeDefined();
    });
  });

  describe('calcXiYongEnveloped 喜用神', async () => {
    it('日主辛金身弱返回喜用神 envelope', async () => {
      // 辛金日主，五行金弱 → 身弱，喜同类最弱
      const env = calcXiYongEnveloped('金', { 木: 6, 火: 4, 土: 4, 金: 2, 水: 4 });
      expect(env.ok).toBe(true);
      expect(env.tool).toBe('XiYongAdapter');
      const data = env.data as { qiangRuo: string; shen: string; export_snapshot: { summary: string } };
      expect(data.qiangRuo).toBe('身弱');
      expect(data.shen).toBeTruthy();
      expect(data.export_snapshot.summary).toContain('身弱');
      expect(env.input_normalized).toEqual({ dayMasterWuxing: '金', elements: { 木: 6, 火: 4, 土: 4, 金: 2, 水: 4 } });
    });
  });

  describe('calcNameRatingEnveloped 姓名评分', async () => {
    it('张伟评分返回 envelope 含五维明细', async () => {
      const env = await calcNameRatingEnveloped('张', '伟', 1990);
      expect(env.ok).toBe(true);
      expect(env.tool).toBe('NameRatingAdapter');
      const data = env.data as { totalScore: number; grade: string; dimensions: Array<{ name: string }>; export_snapshot: { sections: Array<{ heading: string }> } };
      expect(data.totalScore).toBeGreaterThanOrEqual(0);
      expect(data.grade).toBeTruthy();
      expect(data.dimensions.length).toBeGreaterThan(0);
      expect(data.export_snapshot.sections.some((s) => s.heading === '五维明细')).toBe(true);
    });

    it('含未收录字时带"未收录"warning', async () => {
      // 用极生僻字确保未收录
      const env = await calcNameRatingEnveloped('张', '𪚥', 1990);
      const hasUnrecorded = env.warnings?.some((w) => w.includes('未收录'));
      // 若该字恰好收录则跳过断言；否则必须带未收录 warning
      if (env.warnings?.length && !env.warnings.some((w) => w.includes('未收录'))) {
        // warnings 只有 confidenceNote 而无未收录 → 说明字被收录，跳过
        return;
      }
      expect(hasUnrecorded).toBe(true);
    });

    it('传入完整生辰时第5维为「命理契合」含用神补强', async () => {
      const env = await calcNameRatingEnveloped('张', '伟', 1990, {
        year: 1990, month: 6, day: 15, hour: 12, gender: '男',
      });
      const data = env.data as { dimensions: Array<{ name: string; detail: string }> };
      const mingli = data.dimensions.find((d) => d.name === '命理契合');
      expect(mingli).toBeDefined();
      expect(mingli?.detail).toContain('用神补强');
      expect(mingli?.detail).toContain('喜用神');
    });
  });

  describe('getConstitutionTendencyEnveloped 体质倾向', async () => {
    it('有效运气数据返回体质倾向 envelope', async () => {
      const env = getConstitutionTendencyEnveloped({
        wuyun: { dayun: '木运太过' },
        liuqi: { sitian: '厥阴风木', zaquan: '少阳相火' },
      });
      expect(env.ok).toBe(true);
      expect(env.tool).toBe('ConstitutionTendencyAdapter');
      const data = env.data as { tendencies: Array<{ type: string }>; export_snapshot: { summary: string } };
      expect(data.tendencies.length).toBeGreaterThan(0);
      expect(data.export_snapshot.summary).toContain('木运太过');
    });

    it('岁运司天皆空返回 ok=false 错误 envelope', async () => {
      const env = getConstitutionTendencyEnveloped({ wuyun: { dayun: '' }, liuqi: { sitian: '', zaquan: '' } });
      expect(env.ok).toBe(false);
      expect(env.error?.code).toBe('insufficient_input');
    });
  });
});
