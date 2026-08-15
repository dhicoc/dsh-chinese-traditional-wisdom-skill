import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const INTERNAL_EVIDENCE_SENTINEL = 'QIMEN_LIUYAO_INTERNAL_EVIDENCE_SENTINEL';
const EXPORT_NOTICE = 'QIMEN_LIUYAO_EXPORT_NOTICE';
const EXPORT_WARNING = 'QIMEN_LIUYAO_EXPORT_WARNING';
const engineState = vi.hoisted(() => ({
  qimenEnvelope: null as unknown,
  liuyaoEnvelope: null as unknown,
  qimenStableEnvelope: null as unknown,
  liuyaoStableEnvelope: null as unknown,
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

vi.mock('@/engine-api/divination', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/engine-api/divination')>();
  const withExportMarkers = <T extends { data: object }>(result: T) => ({
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
    calcQimenEnveloped: (input: Parameters<typeof actual.calcQimenEnveloped>[0]) => {
      const result = engineState.qimenStableEnvelope ??= withExportMarkers(actual.calcQimenEnveloped(input));
      engineState.qimenEnvelope = result;
      return result;
    },
    calcLiuyaoEnveloped: (input: Parameters<typeof actual.calcLiuyaoEnveloped>[0]) => {
      const result = engineState.liuyaoStableEnvelope ??= withExportMarkers(actual.calcLiuyaoEnveloped(input));
      engineState.liuyaoEnvelope = result;
      return result;
    },
  };
});

import { QimenWorkspace, createQimenFactChecks } from '@/features/qimen/QimenWorkspace';
import { LiuyaoWorkspace, createLiuyaoFactChecks } from '@/features/liuyao/LiuyaoWorkspace';

type ExportEnvelope = {
  data: {
    export_snapshot: { summary: string; sections: Array<{ heading: string; body: string }> };
  };
};

function restoreUrlMethod(name: 'createObjectURL' | 'revokeObjectURL', descriptor: PropertyDescriptor | undefined) {
  if (descriptor) Object.defineProperty(URL, name, descriptor);
  else Reflect.deleteProperty(URL, name);
}

async function downloadHtml() {
  let downloadedBlob: Blob | undefined;
  const createObjectUrl = vi.fn((blob: Blob) => {
    downloadedBlob = blob;
    return 'blob:workspace-report';
  });
  const revokeObjectUrl = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl });
  const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

  fireEvent.click(screen.getByRole('button', { name: '导出报告' }));
  await waitFor(() => expect(anchorClick).toHaveBeenCalledOnce());
  expect(createObjectUrl).toHaveBeenCalledOnce();
  expect(revokeObjectUrl).toHaveBeenCalledWith('blob:workspace-report');
  return downloadedBlob?.text();
}

function expectSnapshotInHtml(html: string | undefined, envelope: ExportEnvelope) {
  expect(html).toContain(envelope.data.export_snapshot.summary);
  for (const section of envelope.data.export_snapshot.sections) {
    expect(html).toContain(section.heading);
  }
  expect(html).toContain(EXPORT_NOTICE);
  expect(html).toContain(EXPORT_WARNING);
  expect(html).not.toContain(INTERNAL_EVIDENCE_SENTINEL);
}

function expectSemanticPresentationOnPage(verifiedFact: { label: string; value: string } | undefined) {
  expect(verifiedFact).toBeDefined();
  const factsPanel = screen.getByText('结构化事实核对').parentElement;
  const noticesPanel = screen.getByText('计算状态').parentElement;
  const warningsPanel = screen.getByText('使用限制与注意事项').parentElement;
  expect(factsPanel).not.toBeNull();
  expect(noticesPanel).not.toBeNull();
  expect(warningsPanel).not.toBeNull();
  expect(within(factsPanel!).getByText(verifiedFact?.label ?? '')).toBeInTheDocument();
  expect(within(factsPanel!).getByText(verifiedFact?.value ?? '')).toBeInTheDocument();
  expect(within(noticesPanel!).getByText((_, element) => element?.tagName === 'LI' && element.textContent?.includes(EXPORT_NOTICE) === true)).toBeInTheDocument();
  expect(within(warningsPanel!).getByText((_, element) => element?.tagName === 'LI' && element.textContent?.includes(EXPORT_WARNING) === true)).toBeInTheDocument();
}

function expectExportMarkersOnEnvelope(envelope: unknown) {
  expect(envelope).toMatchObject({
    data: { timeSource: { notice: EXPORT_NOTICE } },
    warnings: [EXPORT_WARNING],
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  restoreUrlMethod('createObjectURL', originalCreateObjectURL);
  restoreUrlMethod('revokeObjectURL', originalRevokeObjectURL);
  engineState.qimenEnvelope = null;
  engineState.liuyaoEnvelope = null;
  engineState.qimenStableEnvelope = null;
  engineState.liuyaoStableEnvelope = null;
});

describe('奇门与六爻 Workspace 导出呈现', () => {
  it('奇门成功 direct engine result 导出完整语义报告且不泄露内部 evidence', async () => {
    render(<QimenWorkspace />);

    await screen.findByRole('button', { name: '导出报告' });
    await waitFor(() => expect(engineState.qimenEnvelope).not.toBeNull());
    const envelope = engineState.qimenStableEnvelope as ExportEnvelope & { data: Parameters<typeof createQimenFactChecks>[0] };
    expectExportMarkersOnEnvelope(envelope);
    const verifiedFact = createQimenFactChecks(envelope.data).find(({ validation }) => validation.valid)?.fact;
    expectSemanticPresentationOnPage(verifiedFact);
    const html = await downloadHtml();

    expectSnapshotInHtml(html, envelope);
    expect(html).toContain(verifiedFact?.label);
    expect(html).toContain(verifiedFact?.value);
  });

  it('六爻成功 direct engine result 导出完整语义报告且不泄露内部 evidence', async () => {
    render(<LiuyaoWorkspace />);

    await screen.findByRole('button', { name: '导出报告' });
    await waitFor(() => expect(engineState.liuyaoEnvelope).not.toBeNull());
    const envelope = engineState.liuyaoStableEnvelope as ExportEnvelope & { data: Parameters<typeof createLiuyaoFactChecks>[0] };
    expectExportMarkersOnEnvelope(envelope);
    const verifiedFact = createLiuyaoFactChecks(envelope.data).find(({ validation }) => validation.valid)?.fact;
    expectSemanticPresentationOnPage(verifiedFact);
    const html = await downloadHtml();

    expectSnapshotInHtml(html, envelope);
    expect(html).toContain(verifiedFact?.label);
    expect(html).toContain(verifiedFact?.value);
  });
});
