import { describe, expect, it } from 'vitest';
import {
  createBazhaiExportReport,
  createCeziExportReport,
  createChenguzExportReport,
  createFeixingExportReport,
  createFengshuiExportReport,
} from '@/features/anonymousExport';

describe('匿名导出投影', () => {
  it('测字导出不保留所测字、原始解读或八字补益', () => {
    const report = createCeziExportReport({
      source: {
        summary: '测「明」字：结合1990-06-15出生资料，八字用神补益为火。',
        sections: [{ heading: '综合解读', body: '明字对事业有利，日主甲木。' }],
      },
    });
    const exported = JSON.stringify(report);

    expect(exported).toContain('已完成本地测字分析，仅作传统文化参考。');
    expect(exported).toContain('不包含所测字、原始问题、出生资料或八字补益信息');
    expect(exported).not.toContain('明');
    expect(exported).not.toContain('1990-06-15');
    expect(exported).not.toContain('甲木');
  });

  it('称骨导出不保留农历月日、年时支或原始称骨歌', () => {
    const report = createChenguzExportReport({
      source: {
        summary: '庚午年农历五月廿三午时，总骨重三两二钱。',
        sections: [{ heading: '称骨歌', body: '初年运限未曾亨，纵有功名在后成。' }],
      },
    });
    const exported = JSON.stringify(report);

    expect(exported).toContain('已完成本地称骨计算，仅作传统文化参考。');
    expect(exported).toContain('不包含出生资料、农历日期、时支或派生四柱信息');
    expect(exported).not.toContain('庚午');
    expect(exported).not.toContain('五月廿三');
    expect(exported).not.toContain('午时');
    expect(exported).not.toContain('初年运限');
  });

  it('方位类导出不保留出生资料、年份或房屋坐向', () => {
    const source = {
      summary: '1990年男命卦与2026年坐子向午方位参考。',
      sections: [{ heading: '基本资料', body: '出生年：1990\n性别：男\n房屋坐向：坐子向午' }],
    };

    const exported = JSON.stringify([
      createBazhaiExportReport({ source }),
      createFeixingExportReport({ source }),
      createFengshuiExportReport({ source }),
    ]);

    expect(exported).toContain('仅确认已完成本地方位分析');
    expect(exported).not.toContain('1990');
    expect(exported).not.toContain('2026');
    expect(exported).not.toContain('男');
    expect(exported).not.toContain('坐子向午');
  });
});
