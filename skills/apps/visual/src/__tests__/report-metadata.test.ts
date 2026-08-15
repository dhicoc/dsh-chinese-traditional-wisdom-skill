import { describe, expect, it } from 'vitest';
import { createReportMetadata, createWorkspaceReportMetadata, getReportMetadataItems } from '@/legacy/reportMetadata';

describe('reportMetadata', () => {
  it('按固定顺序生成用户说明、报告版本、结果状态与时间口径', () => {
    const metadata = createReportMetadata({
      inputSummary: '本次按出生资料排盘；报告不保留完整出生资料。',
      reportVersion: '1.0',
      capabilityMode: '按出生资料排盘',
      timeBasis: 'true-solar-verified',
    });

    expect(getReportMetadataItems(metadata)).toEqual([
      { label: '本次分析说明', value: '本次按出生资料排盘；报告不保留完整出生资料。' },
      { label: '报告版本', value: '1.0' },
      { label: '结果状态', value: '按出生资料排盘' },
      { label: '时间口径', value: '已核验真太阳时' },
    ]);
  });

  it('工作区元数据生成用户可读的报告版本和结果状态，不生成内部实现或原始输入', () => {
    const metadata = createWorkspaceReportMetadata({
      moduleId: 'bazi',
      inputSummary: '本次按出生资料排盘；报告不保留完整出生资料。',
      timeBasis: 'civil-unverified',
    });
    const visibleText = getReportMetadataItems(metadata).map(({ label, value }) => `${label}\n${value}`).join('\n');

    expect(visibleText).toContain('报告版本\n1.0');
    expect(visibleText).toContain('结果状态\n按出生资料排盘');
    expect(visibleText).toContain('民用时间（未完成真太阳时复核）');
    expect(visibleText).not.toContain('BaziLunarAdapter');
    expect(visibleText).not.toContain('local-exact');
    expect(visibleText).not.toContain('1990年6月15日');
    expect(visibleText).not.toContain('出生地点');
  });

  it('对不适用的时间口径不生成占位信息', () => {
    const metadata = createReportMetadata({
      inputSummary: '本次提供指定日期的民俗参考。',
    });

    expect(getReportMetadataItems(metadata)).toEqual([
      { label: '本次分析说明', value: '本次提供指定日期的民俗参考。' },
    ]);
  });
});
