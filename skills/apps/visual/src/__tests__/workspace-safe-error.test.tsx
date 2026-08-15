import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const { yunqiEngineMock, ziweiEngineMock, qimenEngineMock, liuyaoEngineMock } = vi.hoisted(() => ({
  yunqiEngineMock: vi.fn<() => unknown>(() => {
    throw new Error('yunqi internal sentinel');
  }),
  ziweiEngineMock: vi.fn<() => unknown>(() => {
    throw new Error('ziwei internal sentinel');
  }),
  qimenEngineMock: vi.fn<() => unknown>(() => {
    throw new Error('qimen internal sentinel');
  }),
  liuyaoEngineMock: vi.fn<() => unknown>(() => {
    throw new Error('liuyao internal sentinel');
  }),
}));

vi.mock('@/lib/birthContext', () => {
  const solarBirth = { year: 1990, month: 6, day: 15, hour: 12, minute: 0, gender: '男' };
  return { useBirth: () => ({ solarBirth }) };
});

vi.mock('@/engine-api/calendar', () => ({
  getSolarEntry: () => null,
}));

vi.mock('@/engine-api/divination', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/engine-api/divination')>();
  return {
    ...actual,
    calcTaiyiEnveloped: () => {
      throw new Error('taiyi internal detail');
    },
    calcDaliurenEnveloped: () => {
      throw new Error('liuren internal detail');
    },
    calcQimenEnveloped: qimenEngineMock,
    calcLiuyaoEnveloped: liuyaoEngineMock,
  };
});

vi.mock('@/engine-api/ziwei', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/engine-api/ziwei')>();
  return {
    ...actual,
    calcZiweiEnveloped: ziweiEngineMock,
  };
});

vi.mock('@/engine-api/yunqi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/engine-api/yunqi')>();
  return {
    ...actual,
    calcYunqiEnveloped: yunqiEngineMock,
  };
});

vi.mock('@/engine-api/folklore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/engine-api/folklore')>();
  return {
    ...actual,
    calcXingXiuEnveloped: () => {
      throw new Error('internal dependency detail');
    },
    calcHuangjiEnveloped: () => {
      throw new Error('huangji internal detail');
    },
    calcCeziEnveloped: () => {
      throw new Error('cezi internal sentinel');
    },
    calcChenguzEnveloped: () => {
      throw new Error('chenguz internal sentinel');
    },
  };
});

import { CeziWorkspace } from '@/features/cezi/CeziWorkspace';
import { ChenguzWorkspace } from '@/features/chenguz/ChenguzWorkspace';
import { HuangjiWorkspace } from '@/features/huangji/HuangjiWorkspace';
import { LiurenWorkspace } from '@/features/liuren/LiurenWorkspace';
import { QimenWorkspace } from '@/features/qimen/QimenWorkspace';
import { LiuyaoWorkspace } from '@/features/liuyao/LiuyaoWorkspace';
import { TaiyiWorkspace } from '@/features/taiyi/TaiyiWorkspace';
import { XingXiuWorkspace } from '@/features/xingxiu/XingXiuWorkspace';
import { YunqiWorkspace } from '@/features/yunqi/YunqiWorkspace';
import { ZiweiWorkspace } from '@/features/ziwei/ZiweiWorkspace';

const SAFE_ERROR_MESSAGE = '本次计算未能完成，请核对输入后重试。';

function expectSafeErrorState(container: HTMLElement, internalDetail: string, successContent: string) {
  expect(screen.getByText(SAFE_ERROR_MESSAGE)).toBeInTheDocument();
  expect(container.textContent).not.toContain(internalDetail);
  expect(screen.queryByText('暂无结果')).not.toBeInTheDocument();
  expect(screen.queryByText(successContent)).not.toBeInTheDocument();
}

afterEach(() => cleanup());

describe('Workspace 计算错误呈现', () => {
  it('奇门与六爻直接引擎抛异常时仅显示受控错误面板', () => {
    for (const [Workspace, detail, title] of [
      [QimenWorkspace, 'qimen internal sentinel', '九宫式盘'],
      [LiuyaoWorkspace, 'liuyao internal sentinel', '本卦'],
    ] as const) {
      const { container, unmount } = render(<Workspace />);
      expectSafeErrorState(container, detail, title);
      expect(screen.queryByRole('button', { name: '导出报告' })).not.toBeInTheDocument();
      unmount();
    }
  });

  it('奇门与六爻失败 envelope 不泄露 sentinel 或展示 fallback 成功内容', () => {
    qimenEngineMock.mockReturnValueOnce({ ok: false, tool: 'arrange_qimen', version: 'test', input_normalized: {}, data: {}, error: { code: 'internal_failure', message: 'qimen failure sentinel' } });
    liuyaoEngineMock.mockReturnValueOnce({ ok: false, tool: 'cast_liuyao', version: 'test', input_normalized: {}, data: {}, error: { code: 'internal_failure', message: 'liuyao failure sentinel' } });

    const qimen = render(<QimenWorkspace />);
    expectSafeErrorState(qimen.container, 'qimen failure sentinel', '九宫式盘');
    qimen.unmount();
    const liuyao = render(<LiuyaoWorkspace />);
    expectSafeErrorState(liuyao.container, 'liuyao failure sentinel', '本卦');
    expect(liuyao.container.textContent).not.toContain('乾为天');
    expect(screen.queryByRole('button', { name: '导出报告' })).not.toBeInTheDocument();
  });

  it('五运六气直接引擎计算抛异常时不泄露内部错误或展示成功内容', () => {
    const { container } = render(<YunqiWorkspace />);

    expectSafeErrorState(container, 'yunqi internal sentinel', '岁运 · 司天 · 在泉');
    expect(screen.queryByText('五运六气解读')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '导出报告' })).not.toBeInTheDocument();
  });

  it('五运六气直接引擎返回失败 envelope 时只显示受控错误面板', () => {
    yunqiEngineMock.mockReturnValueOnce({
      ok: false,
      tool: 'calc_yunqi',
      version: 'test',
      input_normalized: {},
      data: {},
      error: { code: 'internal_failure', message: 'yunqi failed envelope sentinel' },
    });
    const { container } = render(<YunqiWorkspace />);

    expectSafeErrorState(container, 'yunqi failed envelope sentinel', '岁运 · 司天 · 在泉');
    expect(screen.queryByText('五运六气解读')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '导出报告' })).not.toBeInTheDocument();
  });

  it('测字异步直接引擎计算抛异常时只显示安全文案', async () => {
    const { container } = render(<CeziWorkspace />);

    expect(await screen.findByText(SAFE_ERROR_MESSAGE)).toBeInTheDocument();
    expect(container.textContent).not.toContain('cezi internal sentinel');
    expect(screen.queryByText('暂无结果')).not.toBeInTheDocument();
  });

  it('紫微直接引擎计算抛异常时只显示受控错误面板', () => {
    const { container } = render(<ZiweiWorkspace />);

    expectSafeErrorState(container, 'ziwei internal sentinel', '命盘解读');
    expect(screen.queryByText('十二宫命盘')).not.toBeInTheDocument();
    expect(screen.queryByText(/命宫星曜/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '导出报告' })).not.toBeInTheDocument();
  });

  it('紫微直接引擎返回失败 envelope 时只显示受控错误面板', () => {
    ziweiEngineMock.mockReturnValueOnce({
      ok: false,
      tool: 'ziwei_chart',
      version: 'test',
      input_normalized: {},
      data: {},
      error: { code: 'internal_failure', message: 'ziwei failed envelope sentinel' },
    });
    const { container } = render(<ZiweiWorkspace />);

    expectSafeErrorState(container, 'ziwei failed envelope sentinel', '命盘解读');
    expect(screen.queryByText('十二宫命盘')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '导出报告' })).not.toBeInTheDocument();
  });

  it('称骨直接引擎计算抛异常时只显示安全文案', () => {
    const { container } = render(<ChenguzWorkspace />);

    expectSafeErrorState(container, 'chenguz internal sentinel', '称骨');
  });

  it('星宿直接引擎计算抛异常时只显示安全文案', () => {
    const { container } = render(<XingXiuWorkspace />);

    expectSafeErrorState(container, 'internal dependency detail', '二十八星宿');
  });

  it('太乙直接引擎计算抛异常时只显示安全文案', () => {
    const { container } = render(<TaiyiWorkspace />);

    expectSafeErrorState(container, 'taiyi internal detail', '太乙神数');
  });

  it('大六壬直接引擎计算抛异常时只显示安全文案', () => {
    const { container } = render(<LiurenWorkspace />);

    expectSafeErrorState(container, 'liuren internal detail', '大六壬');
  });

  it('皇极经世直接引擎计算抛异常时只显示安全文案', () => {
    const { container } = render(<HuangjiWorkspace />);

    expectSafeErrorState(container, 'huangji internal detail', '皇极经世');
  });
});
