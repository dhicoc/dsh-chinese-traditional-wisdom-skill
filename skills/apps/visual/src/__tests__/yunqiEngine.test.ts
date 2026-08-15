import { describe, expect, it } from 'vitest';
import { calculateYunqi, calcYunqiEnveloped } from '@/legacy/yunqiEngine';
import type { ToolEnvelope } from '@/legacy/baseTypes';

const jieqiSolar = {
  fromYmdHms: () => ({
    getLunar: () => ({
      getJieQiTable: () => ({
        大寒: { getYear: () => 2024, getMonth: () => 1, getDay: () => 20 },
        春分: { getYear: () => 2024, getMonth: () => 3, getDay: () => 20 },
        小满: { getYear: () => 2024, getMonth: () => 5, getDay: () => 21 },
        大暑: { getYear: () => 2024, getMonth: () => 7, getDay: () => 22 },
        秋分: { getYear: () => 2024, getMonth: () => 9, getDay: () => 22 },
        小雪: { getYear: () => 2024, getMonth: () => 11, getDay: () => 22 },
      }),
    }),
  }),
};

describe('calculateYunqi 纯 TS 计算', () => {
  it('2024年甲辰：岁运土运太过、司天太阳寒水、在泉太阴湿土', () => {
    const result = calculateYunqi({ year: 2024, currentMonth: 6 });

    expect(result.tiangan).toBe('甲');
    expect(result.dizhi).toBe('辰');
    expect(result.wuyun.dayun).toBe('土运太过');
    expect(result.liuqi.sitian).toBe('太阳寒水');
    expect(result.liuqi.zaiquan).toBe('太阴湿土');
    expect(result.mode).toBe('local-approx');
  });

  it('以查询日期和大寒划分运气年，且六气步采用左闭右开边界', () => {
    const beforeDahan = calculateYunqi({ year: 2024, targetDate: '2024-01-19', solar: jieqiSolar });
    const dahan = calculateYunqi({ year: 2024, targetDate: '2024-01-20', solar: jieqiSolar });
    const chunfen = calculateYunqi({ year: 2024, targetDate: '2024-03-20', solar: jieqiSolar });
    const xiaoman = calculateYunqi({ year: 2024, targetDate: '2024-05-21', solar: jieqiSolar });

    expect(beforeDahan.year).toBe(2023);
    expect(dahan.year).toBe(2024);
    expect(dahan.liuqi.current_step?.step).toBe('初之气');
    expect(chunfen.liuqi.current_step?.step).toBe('二之气');
    expect(xiaoman.liuqi.current_step?.step).toBe('三之气');
    expect(chunfen.liuqi.current_step?.startDate).toBe('2024-03-20');
    expect(chunfen.liuqi.current_step?.endDate).toBe('2024-05-21');
  });

  it('客气六步含六步，三之气为司天，终之气为在泉', () => {
    const result = calculateYunqi({ year: 2024, currentMonth: 6 });

    expect(result.liuqi.zhuke).toHaveLength(6);
    expect(result.liuqi.zhuke[2].step).toBe('三之气');
    expect(result.liuqi.zhuke[2].qi).toBe(result.liuqi.sitian);
    expect(result.liuqi.zhuke[5].qi).toBe(result.liuqi.zaiquan);
  });

  it('主运和客运均保留五行、太少与交替规则', () => {
    const result = calculateYunqi({ year: 2024, currentMonth: 6 });

    expect(result.wuyun.zhuyun).toEqual([
      { element: '木', taiShao: '太' },
      { element: '火', taiShao: '少' },
      { element: '土', taiShao: '太' },
      { element: '金', taiShao: '少' },
      { element: '水', taiShao: '太' },
    ]);
    expect(result.wuyun.keyun).toEqual([
      { element: '土', taiShao: '太' },
      { element: '金', taiShao: '少' },
      { element: '水', taiShao: '太' },
      { element: '木', taiShao: '少' },
      { element: '火', taiShao: '太' },
    ]);
  });

  it('运气格局以可验证规则呈现，太一天符仅为天符与岁会同时成立', () => {
    const taiyiTianfu = calculateYunqi({ year: 1978, targetDate: '1978-06-15' });
    const nonTaiyiTianfu = calculateYunqi({ year: 1980, targetDate: '1980-06-15' });
    const pingqi = calculateYunqi({ year: 2018, currentMonth: 6 });

    expect(taiyiTianfu.patterns.taiyiTianfu).toBe(true);
    expect(`${nonTaiyiTianfu.tiangan}${nonTaiyiTianfu.dizhi}`).toBe('庚申');
    expect(nonTaiyiTianfu.patterns.tianfu).toBe(false);
    expect(nonTaiyiTianfu.patterns.suihui).toBe(true);
    expect(nonTaiyiTianfu.patterns.taiyiTianfu).toBe(false);
    expect(pingqi.patterns.pingqi).toBe(true);
  });

  it.each([
    [1949, '己丑'],
    [1979, '己未'],
    [1978, '戊午'],
  ])('太一天符例证：%d年%s', (year, ganzhi) => {
    const result = calculateYunqi({ year, targetDate: `${year}-06-15` });

    expect(`${result.tiangan}${result.dizhi}`).toBe(ganzhi);
    expect(result.patterns.tianfu).toBe(true);
    expect(result.patterns.suihui).toBe(true);
    expect(result.patterns.taiyiTianfu).toBe(true);
  });

  it('气候与调养观察不使用疾病诊断名称', () => {
    const result = calculateYunqi({ year: 2024, currentMonth: 6 });

    expect(result.observation).toContain('传统气机观察');
    expect(result.observation).not.toMatch(/高血压|骨质疏松|感冒|疾病/);
  });

  it('传入 solar 但节气表不可用时回退近似模式', () => {
    const fakeSolar = { fromYmd: () => ({ getLunar: () => ({}) }) };
    const result = calculateYunqi({ year: 2024, solar: fakeSolar as never, currentMonth: 6 });

    expect(result.mode).toBe('local-approx');
  });
});

describe('calcYunqiEnveloped envelope 适配', () => {
  it('返回完整 ToolEnvelope，导出快照包含年度结构与传统文化免责声明', () => {
    const envelope: ToolEnvelope = calcYunqiEnveloped({ year: 2024, currentMonth: 6 });
    const data = envelope.data as {
      tiangan: string;
      dizhi: string;
      export_snapshot: { summary: string; sections: Array<{ heading: string; body: string }> };
    };

    expect(envelope.ok).toBe(true);
    expect(envelope.tool).toBe('YunqiEngine');
    expect(data.tiangan).toBe('甲');
    expect(data.export_snapshot.summary).toContain('甲辰');
    expect(data.export_snapshot.sections.some(({ heading }) => heading === '运气格局')).toBe(true);
    expect(data.export_snapshot.sections.some(({ body }) => body.includes('不构成医学诊断或治疗建议'))).toBe(true);
  });

  it('导出运气格局采用太一天符经文定义', () => {
    const envelope = calcYunqiEnveloped({ year: 1978, targetDate: '1978-06-15' });
    const data = envelope.data as {
      export_snapshot: { sections: Array<{ heading: string; body: string }> };
    };
    const section = data.export_snapshot.sections.find(({ heading }) => heading === '运气格局');

    expect(section?.body).toContain('太一天符');
    expect(section?.body).toContain('《素问·六微旨大论》');
    expect(section?.body).toContain('天符岁会');
    expect(section?.body).toContain('标识天符与岁会同时成立');
    expect(section?.body).toContain('传统文化与气候病机理论学习参考');
    expect(section?.body).not.toContain('太乙天符');
    expect(section?.body).not.toContain('贵人');
    expect(section?.body).not.toContain('taiyiTianfu');
    expect(section?.body).not.toContain('yunqiEngine.ts');
    expect(section?.body).not.toContain('疾病诊断');
    expect(section?.body).not.toContain('现实预测');
  });

  it('参考推算模式带岁运提示', () => {
    const envelope = calcYunqiEnveloped({ year: 2024, currentMonth: 6 });

    expect(envelope.warnings?.some((warning) => warning.includes('岁运信息仅作辅助参考'))).toBe(true);
  });
});
