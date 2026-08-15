import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const INTERNAL_EVIDENCE_SENTINEL = 'INTERNAL_EVIDENCE_SENTINEL';
const EXPORT_NOTICE = 'COMBO_EXPORT_NOTICE';
const EXPORT_WARNING = 'COMBO_EXPORT_WARNING';
const engineState = vi.hoisted(() => ({
  wellnessFailure: false,
  marriageThrows: false,
  lastSuccessEnvelope: null as unknown,
}));
const solarBirth = { year: 1990, month: 6, day: 15, hour: 12, minute: 0, gender: '男' };
const birth = { year: 1990, month: 6, day: 15, hour: 12, gender: '男', isLunar: false };
const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

vi.mock('@/lib/birthContext', () => ({
  useBirth: () => ({ birth, solarBirth }),
}));

vi.mock('@/lib/commandIntents', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/commandIntents')>();
  return { ...actual, dispatchCommandFeedback: vi.fn() };
});
vi.mock('@/engine-api/calendar', () => ({ getSolarEntry: () => null }));

vi.mock('@/engine-api/combo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/engine-api/combo')>();
  const withExportMarkers = <T extends { ok: boolean; data: object }>(result: T) => ({
    ...result,
    data: {
      ...result.data,
      timeSource: { notice: EXPORT_NOTICE },
      evidence: INTERNAL_EVIDENCE_SENTINEL,
    },
    warnings: [EXPORT_WARNING],
  });
  return {
    ...actual,
    calcAnnualFortuneCombo: (input: Parameters<typeof actual.calcAnnualFortuneCombo>[0]) => {
      const result = withExportMarkers(actual.calcAnnualFortuneCombo(input));
      engineState.lastSuccessEnvelope = result;
      return result;
    },
    calcDailyWellnessCombo: (input: Parameters<typeof actual.calcDailyWellnessCombo>[0]) => {
      if (engineState.wellnessFailure) {
        return {
          ok: false,
          tool: 'combo_daily_wellness',
          version: 'internal',
          input_normalized: input,
          data: {},
          error: { code: 'internal_failure', message: 'combo internal sentinel' },
        };
      }
      const result = actual.calcDailyWellnessCombo(input);
      engineState.lastSuccessEnvelope = result;
      return result;
    },
  };
});

vi.mock('@/engine-api/marriage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/engine-api/marriage')>();
  return {
    ...actual,
    calcMarriageCombo: async (...args: Parameters<typeof actual.calcMarriageCombo>) => {
      if (engineState.marriageThrows) throw new Error('marriage internal sentinel');
      return actual.calcMarriageCombo(...args);
    },
  };
});

import { ComboWorkspace, createComboFactChecks } from '@/features/combo/ComboWorkspace';
import type { AnnualFortuneResult } from '@/engine-api/combo';

const SAFE_ERROR_MESSAGE = '本次计算未能完成，请核对输入后重试。';

function restoreUrlMethod(name: 'createObjectURL' | 'revokeObjectURL', descriptor: PropertyDescriptor | undefined) {
  if (descriptor) Object.defineProperty(URL, name, descriptor);
  else Reflect.deleteProperty(URL, name);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  restoreUrlMethod('createObjectURL', originalCreateObjectURL);
  restoreUrlMethod('revokeObjectURL', originalRevokeObjectURL);
  engineState.wellnessFailure = false;
  engineState.marriageThrows = false;
  engineState.lastSuccessEnvelope = null;
});

describe('ComboWorkspace presentation 边界', () => {
  it('导出年度联合分析的真实 HTML，保留用户可见报告语义且不泄露内部 evidence', async () => {
    let downloadedBlob: Blob | undefined;
    const createObjectUrl = vi.fn((blob: Blob) => {
      downloadedBlob = blob;
      return 'blob:combo-report';
    });
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<ComboWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: /年度综合运势/ }));

    await screen.findByRole('button', { name: '导出报告' });
    await waitFor(() => expect(engineState.lastSuccessEnvelope).not.toBeNull());
    expect(screen.getByText('本次参考范围')).toBeInTheDocument();
    expect(screen.getByText('仅说明本次参考所采用的方法及已知注意事项，不展示个人资料。')).toBeInTheDocument();
    expect(screen.queryByText(INTERNAL_EVIDENCE_SENTINEL)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '导出报告' }));

    await waitFor(() => expect(anchorClick).toHaveBeenCalledOnce());
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:combo-report');
    const html = await downloadedBlob?.text();
    const envelope = engineState.lastSuccessEnvelope as {
      data: AnnualFortuneResult;
    };

    expect(html).toContain('已完成年度综合运势联合分析，仅作传统文化参考。');
    expect(html).toContain('本报告仅确认已运行所选联合分析方案，不包含占问原文、出生资料、姓名、性别、体质或健康信息。');
    expect(html).toContain('限制与注意事项');
    expect(html).toContain('本次采用所选联合分析方案；报告仅保留分析类型，不保留个人资料。');
    expect(html).not.toContain('local-exact');
    expect(html).not.toContain('combo_annual_fortune');
    const downloadedText = new DOMParser()
      .parseFromString(html?.replace(/<br>/g, '\n') ?? '', 'text/html')
      .body.textContent;
    expect(downloadedText).not.toContain(envelope.data.export_snapshot.summary);
    expect(downloadedText).not.toContain(envelope.data.export_snapshot.sections[0]?.body ?? '');
    expect(html).toContain('COMBO_EXPORT_NOTICE');
    expect(html).toContain('导出内容已按隐私边界脱敏处理。');
    expect(html).not.toContain('COMBO_EXPORT_WARNING');
    expect(html).not.toContain(INTERNAL_EVIDENCE_SENTINEL);
  });

  it('引擎返回失败 envelope 时只呈现固定安全文案', async () => {
    engineState.wellnessFailure = true;
    const { container } = render(<ComboWorkspace />);

    expect(await screen.findByText(SAFE_ERROR_MESSAGE)).toBeInTheDocument();
    expect(container.textContent).not.toContain('combo internal sentinel');
    expect(container.textContent).not.toContain(INTERNAL_EVIDENCE_SENTINEL);
    expect(screen.queryByText('暂无结果')).not.toBeInTheDocument();
  });

  it('婚配异步计算抛错时也呈现固定安全文案', async () => {
    engineState.marriageThrows = true;
    const { container } = render(<ComboWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: /合婚配对/ }));

    expect(await screen.findByText(SAFE_ERROR_MESSAGE)).toBeInTheDocument();
    expect(container.textContent).not.toContain('marriage internal sentinel');
    expect(container.textContent).not.toContain(INTERNAL_EVIDENCE_SENTINEL);
    expect(screen.queryByText('暂无结果')).not.toBeInTheDocument();
  });
});
