import { useEffect, useMemo, useState } from 'react';
import { getSolarEntry } from '@/engine-api/calendar';
import { calcMeihuaEnveloped, type MeihuaData, type MeihuaInput } from '@/engine-api/divination';
import { ControlField } from '@/components/shared/ControlField';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { MeihuaChart } from '@/components/shared/MeihuaChart';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { validateDivinationClaims, type DivinationPresentationClaim } from '@/legacy/claimVerification/divinationClaimVerifier';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';
import { toUserPresentation, type StructuredFactCheck } from '@/legacy/reportLayers';
import type { ToolEnvelope } from '@/engine-api/types';
import { useBirth } from '@/lib/birthContext';
import type { ModuleId } from '@/lib/modules';
import { dispatchReaderSearchIntent, MEIHUA_INTENT_EVENT, type MeihuaIntentDetail } from '@/lib/commandIntents';

type CastMethod = 'time' | 'number' | 'yarrow';

const METHOD_OPTIONS: Array<{ value: CastMethod; label: string; hint: string }> = [
  { value: 'time', label: '时间起卦', hint: '按生辰的历法时间取数' },
  { value: 'number', label: '数字起卦', hint: '输入两个数字定上下卦与动爻' },
  { value: 'yarrow', label: '揲蓍法', hint: '按生辰生成确定性蓍草起卦结果' },
];

function parseNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function createMeihuaFactChecks(data: MeihuaData): StructuredFactCheck[] {
  const claims: Array<{ claim: DivinationPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'cast_meihua', kind: 'hexagram', field: 'classicalName', value: data.classicalHexagramName }, label: '本卦', value: data.classicalHexagramName },
    { claim: { tool: 'cast_meihua', kind: 'hexagram', field: 'changedClassicalName', value: data.changingClassicalHexagramName }, label: '变卦', value: data.changingClassicalHexagramName },
    { claim: { tool: 'cast_meihua', kind: 'yao', field: 'changingLine', value: data.changingLine }, label: '动爻', value: `第${data.changingLine}爻` },
  ];
  return claims.map(({ claim, label, value }) => ({
    fact: { label, value, tool: 'cast_meihua' },
    validation: validateDivinationClaims('cast_meihua', data, [claim]),
  }));
}

export function MeihuaWorkspace({ onSelectModule }: { onSelectModule?: (id: ModuleId) => void }) {
  const { solarBirth } = useBirth();
  const [method, setMethod] = useState<CastMethod>('time');
  const [numberA, setNumberA] = useState('3');
  const [numberB, setNumberB] = useState('5');

  useEffect(() => {
    function handleMeihuaIntent(event: Event) {
      const detail = (event as CustomEvent<MeihuaIntentDetail>).detail;
      if (!detail) return;
      if (detail.method) setMethod(detail.method);
      if (typeof detail.numberA === 'number') setNumberA(String(detail.numberA));
      if (typeof detail.numberB === 'number') setNumberB(String(detail.numberB));
    }

    window.addEventListener(MEIHUA_INTENT_EVENT, handleMeihuaIntent);
    return () => window.removeEventListener(MEIHUA_INTENT_EVENT, handleMeihuaIntent);
  }, []);

  const input = useMemo<MeihuaInput>(() => {
    const next: MeihuaInput = { birth: solarBirth, method };
    if (method === 'number') {
      const first = parseNumber(numberA);
      const second = parseNumber(numberB);
      if (first !== undefined) next.numberA = first;
      if (second !== undefined) next.numberB = second;
    }
    return next;
  }, [solarBirth, method, numberA, numberB]);

  const envelope = useMemo<ToolEnvelope<MeihuaData> | null>(() => {
    try {
      return calcMeihuaEnveloped(input, getSolarEntry() as never);
    } catch {
      return null;
    }
  }, [input]);

  const factChecks = useMemo(() => envelope?.ok ? createMeihuaFactChecks(envelope.data) : [], [envelope]);
  const presentation = useMemo(() => envelope ? toUserPresentation(envelope, {
    factChecks,
    disclaimers: ['梅花易数为传统文化观察参考，不作为现实决策依据。'],
  }) : null, [envelope, factChecks]);
  const reportMetadata = useMemo(() => createWorkspaceReportMetadata({
    moduleId: 'meihua',
    inputSummary: '本次已按所选起卦方式完成梅花易数参考；报告不保留具体数字或出生资料。',
  }), []);
  const exportPresentation = useMemo(() => presentation?.exportReport ? ({
    report: presentation.exportReport,
    notices: presentation.notices,
    warnings: presentation.warnings,
    semanticReport: presentation.semanticReport,
    reportMetadata,
  }) : null, [presentation, reportMetadata]);
  const data = envelope?.ok ? envelope.data : null;

  const contextPayload = useMemo(() => ({
    项目: '梅花易数',
    起卦方式: data?.sourceMethod,
    本卦: data?.classicalHexagramName,
    变卦: data?.changingClassicalHexagramName,
    动爻: data?.changingLine,
    体用关系: data?.bodyUseRelation,
  }), [data]);

  function openClassicalReading() {
    if (!envelope?.ok || !data) return;
    onSelectModule?.('reader');
    window.setTimeout(() => dispatchReaderSearchIntent({
      term: data.classicalHexagramName,
      iching: {
        hexagramName: data.classicalHexagramName,
        hexagramNumber: data.hexagramNumber,
        changingHexagramName: data.changingClassicalHexagramName,
        changingHexagramNumber: data.changingHexagramNumber,
        changingLines: [data.changingLine],
      },
      raw: '本次梅花易数起卦结果',
    }), 0);
  }

  if (presentation?.state === 'error' || !data) {
    return <section className="space-y-4"><LoadingSkeleton label="正在排盘" /></section>;
  }

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">梅花易数</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              以时间、数字或揲蓍法起卦，呈现本卦、互卦、变卦与体用关系。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="meihua" title="梅花易数摘要" payload={contextPayload} />
            {exportPresentation && <ExportReportButton module="梅花易数" presentation={exportPresentation} />}
          </div>
        </div>
        <p className="mt-3 rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
          梅花易数为传统文化观察参考，非绝对预测或现实决策依据。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          <ControlField label="起卦方式">
            <select
              aria-label="起卦方式"
              value={method}
              onChange={(event) => setMethod(event.target.value as CastMethod)}
              className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
            >
              {METHOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label} — {option.hint}</option>)}
            </select>
          </ControlField>

          {method === 'number' && (
            <>
              <ControlField label="数字一">
                <input aria-label="数字一" value={numberA} onChange={(event) => setNumberA(event.target.value)} inputMode="numeric" className="w-full rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45" />
              </ControlField>
              <ControlField label="数字二">
                <input aria-label="数字二" value={numberB} onChange={(event) => setNumberB(event.target.value)} inputMode="numeric" className="w-full rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45" />
              </ControlField>
            </>
          )}

          <InterpretationCard title="卦象概要" badge={data.sourceMethod} items={[
            { label: '本卦', value: data.classicalHexagramName },
            { label: '变卦', value: data.changingClassicalHexagramName },
            { label: '动爻', value: `第${data.changingLine}爻` },
            { label: '体卦', value: data.bodyTrigram },
            { label: '用卦', value: data.useTrigram },
            { label: '体用', value: data.bodyUseRelation },
          ]} />

          <button type="button" onClick={openClassicalReading} className="w-full rounded-card border border-jade-500/35 bg-jade-500/10 px-4 py-2.5 text-sm font-medium text-jade-100 transition hover:border-jade-500/60 hover:bg-jade-500/16">
            阅读本次关联《周易》原文
          </button>

          {presentation && presentation.report && (
            <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <FourLayerReport report={presentation.report} semanticReport={presentation.semanticReport} notices={presentation.notices} warnings={presentation.warnings} reportMetadata={reportMetadata} title="梅花易数解读" />
            </div>
          )}
        </aside>

        <section className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <h3 className="text-lg font-semibold text-jade-50">本卦 · 互卦 · 变卦</h3>
          <p className="mt-1 text-sm leading-6 text-jade-100/55">卦象按所选起卦方式计算。</p>
          <div className="canvas-stage mt-4 overflow-x-auto rounded-card border border-jade-500/18 bg-ink-950/92 p-3">
            <ZoomableSvg title="梅花易数 本卦·互卦·变卦"><MeihuaChart data={data} /></ZoomableSvg>
          </div>
        </section>
      </div>
    </section>
  );
}
