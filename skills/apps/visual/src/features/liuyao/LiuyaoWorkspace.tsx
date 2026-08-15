import { useEffect, useMemo, useState } from 'react';
import { getSolarEntry } from '@/engine-api/calendar';
import { ControlField } from '@/components/shared/ControlField';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { HexagramChart } from '@/components/shared/HexagramChart';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { TermExplanationPanel } from '@/components/shared/TermExplanationPanel';
import type { LiuyaoData } from '@/legacy/canvasRenderers';
import type { LiuyaoLine } from '@/legacy/divinationTypes';
import { calcLiuyaoEnveloped, type LiuyaoData as EngineLiuyaoData, type LiuyaoInput } from '@/engine-api/divination';
import { validateDivinationClaims, type DivinationPresentationClaim } from '@/legacy/claimVerification/divinationClaimVerifier';
import { getCanonicalHexagram } from '@/legacy/ichingTexts';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';
import { toUserPresentation, type StructuredFactCheck } from '@/legacy/reportLayers';
import type { ToolEnvelope } from '@/engine-api/types';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useBirth } from '@/lib/birthContext';
import type { ModuleId } from '@/lib/modules';
import { dispatchReaderSearchIntent, LIUYAO_INTENT_EVENT, type LiuyaoIntentDetail } from '@/lib/commandIntents';

type CastMethod = 'coin' | 'time' | 'manual' | 'yarrow';

interface LiuyaoResult extends LiuyaoData {
  palace?: string;
  palaceElement?: string;
  palaceIndex?: number;
  upperTrigram?: string;
  lowerTrigram?: string;
  dayStem?: string;
  changingYao?: number[];
  changingHexagramName?: string;
  changingHexagramNumber?: number;
  engineName?: string;
  mode?: string;
  confidenceNote?: string;
  // 补齐 ichingshifa 能力
  xunkong?: string[];
  monthJian?: string;
  dayJian?: string;
  monthGanZhi?: string;
  dayGanZhi?: string;
  shenYao?: number;
  hiddenStars?: { relation: string; hiddenStem: string; hiddenBranch: string; hiddenBranchElement: string; hiddenAtPureYao: number }[];
  lines: (LiuyaoLine & { stem?: string; branchElement?: string; wangShuai?: string })[];
}

const METHOD_OPTIONS: { value: CastMethod; label: string; hint: string }[] = [
  { value: 'coin', label: '铜钱法', hint: '三枚铜钱摇六次，确定性 RNG' },
  { value: 'time', label: '时间起卦', hint: '按年月日时取数定卦与动爻' },
  { value: 'yarrow', label: '揲蓍法', hint: '大衍五十策三变一爻，传统蓍草' },
  { value: 'manual', label: '手动爻值', hint: '6 位 6-9 字符串(初→上)' },
];

const DEFAULT_FALLBACK: LiuyaoResult = {
  lines: [
    { yin: false, changing: false, branch: '子', relation: '子孙', god: '青龙', stem: '甲', branchElement: '水' },
    { yin: true, changing: false, branch: '寅', relation: '妻财', god: '朱雀', stem: '甲', branchElement: '木' },
    { yin: false, changing: true, branch: '辰', relation: '父母', god: '勾陈', stem: '甲', branchElement: '土' },
    { yin: true, changing: false, branch: '午', relation: '官鬼', god: '螣蛇', stem: '壬', branchElement: '火' },
    { yin: false, changing: false, branch: '申', relation: '兄弟', god: '白虎', stem: '壬', branchElement: '金' },
    { yin: true, changing: true, branch: '戌', relation: '父母', god: '玄武', stem: '壬', branchElement: '土' },
  ],
  hexagramName: '乾为天',
  hexagramNumber: 1,
  isOriginal: true,
  yongShen: '妻财',
  shiYao: 6,
  yingYao: 3,
  palace: '乾宫',
  palaceElement: '金',
  dayStem: '甲',
  changingYao: [3, 6],
  changingHexagramName: '坤为地',
  engineName: 'fallback',
  mode: 'fallback-demo',
  confidenceNote: '请填写占问事项后查看相应解读。',
};

function isValidYaoValues(v: string) {
  return /^[6-9]{6}$/.test(v.replace(/\s/g, ''));
}

export function createLiuyaoFactChecks(data: EngineLiuyaoData): StructuredFactCheck[] {
  const claims: Array<{ claim: DivinationPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'cast_liuyao', kind: 'hexagram', field: 'name', value: data.hexagramName }, label: '本卦', value: data.hexagramName },
    ...(data.changingHexagramName ? [{ claim: { tool: 'cast_liuyao', kind: 'hexagram', field: 'changedName', value: data.changingHexagramName } as DivinationPresentationClaim, label: '变卦', value: data.changingHexagramName }] : []),
    { claim: { tool: 'cast_liuyao', kind: 'yao', field: 'shiYao', value: data.shiYao }, label: '世爻', value: String(data.shiYao) },
    { claim: { tool: 'cast_liuyao', kind: 'yao', field: 'changingYao', value: data.changingYao.join('、') } as DivinationPresentationClaim, label: '动爻', value: data.changingYao.join('、') },
  ];
  return claims.map(({ claim, label, value }) => ({
    fact: { label, value, tool: 'cast_liuyao' },
    validation: validateDivinationClaims('cast_liuyao', data, [claim]),
  }));
}

export function LiuyaoWorkspace({ onSelectModule }: { onSelectModule?: (id: ModuleId) => void }) {
  const { solarBirth } = useBirth();
  const [method, setMethod] = useState<CastMethod>('coin');
  const [question, setQuestion] = useState('');
  const [yaoValues, setYaoValues] = useState('789789');
  const [castCount, setCastCount] = useState(0);

  useEffect(() => {
    function handleLiuyaoIntent(event: Event) {
      const detail = (event as CustomEvent<LiuyaoIntentDetail>).detail;
      if (!detail) return;

      if (detail.method) setMethod(detail.method);
      if (typeof detail.question === 'string') setQuestion(detail.question);
      if (detail.yaoValues && isValidYaoValues(detail.yaoValues)) {
        setYaoValues(detail.yaoValues.replace(/\s/g, ''));
        setMethod('manual');
      }
      if (detail.recast || detail.method === 'coin') {
        setCastCount((count) => count + 1);
      }
    }

    window.addEventListener(LIUYAO_INTENT_EVENT, handleLiuyaoIntent);
    return () => window.removeEventListener(LIUYAO_INTENT_EVENT, handleLiuyaoIntent);
  }, []);

  const ready = true;

  const input = useMemo<LiuyaoInput>(() => {
    const next: LiuyaoInput = { birth: solarBirth, method, solar: getSolarEntry() as never };
    if (question) next.question = question;
    if (method === 'manual' && isValidYaoValues(yaoValues)) next.yaoValues = yaoValues.replace(/\s/g, '');
    if (method === 'coin' || method === 'yarrow') next.seed = solarBirth.year * 10000 + solarBirth.month * 100 + solarBirth.day + solarBirth.hour + castCount * 7919;
    return next;
  }, [solarBirth, method, question, yaoValues, castCount]);
  const envelope = useMemo<ToolEnvelope<EngineLiuyaoData> | null>(() => {
    if (!ready) return null;
    try {
      const result = calcLiuyaoEnveloped(input);
      return result.ok ? result : {
        ...result,
        error: { code: 'calculation_failed', message: '本次计算未能完成，请核对输入后重试。' },
      };
    } catch {
      return {
        ok: false,
        tool: 'cast_liuyao',
        version: 'unknown',
        input_normalized: input as unknown as Record<string, unknown>,
        data: {} as EngineLiuyaoData,
        error: { code: 'calculation_exception', message: '本次计算未能完成，请核对输入后重试。' },
      };
    }
  }, [ready, input]);
  const factChecks = useMemo(() => envelope?.ok ? createLiuyaoFactChecks(envelope.data) : [], [envelope]);
  const presentation = useMemo(() => envelope ? toUserPresentation(envelope, {
    factChecks,
    disclaimers: ['六爻为传统文化占问参考，不作为现实决策依据。'],
  }) : null, [envelope, factChecks]);
  const reportMetadata = useMemo(() => envelope ? createWorkspaceReportMetadata({
    moduleId: 'liuyao',
    inputSummary: '本次已按所选起卦方式完成起卦参考；报告不记录占问原文。',
  }) : null, [envelope]);
  const exportPresentation = useMemo(() => presentation?.exportReport && reportMetadata ? ({
    report: presentation.exportReport,
    notices: presentation.notices,
    warnings: presentation.warnings,
    semanticReport: presentation.semanticReport,
    reportMetadata,
  }) : null, [presentation, reportMetadata]);
  const result = (envelope?.ok ? envelope.data : (!ready ? DEFAULT_FALLBACK : null)) as LiuyaoResult | null;

  const changedLines = useMemo<LiuyaoData | null>(() => {
    if (!result?.changingYao || result.changingYao.length === 0) return null;
    const lines = result.lines.map((l) => ({ ...l, yin: l.changing ? !l.yin : l.yin, changing: false }));
    return { ...result, lines, isOriginal: false, hexagramName: result.changingHexagramName ?? result.hexagramName };
  }, [result]);

  const isReal = envelope?.ok ?? false;
  const palaceSummary = result?.palace ? `${result.palace} · 五行${result.palaceElement ?? '?'}` : '—';

  function openClassicalReading() {
    if (!envelope?.ok) return;
    const data = envelope.data;
    const hexagram = getCanonicalHexagram(data.hexagramNumber);
    const changingHexagram = getCanonicalHexagram(data.changingHexagramNumber);
    if (!hexagram || !changingHexagram) return;
    onSelectModule?.('reader');
    window.setTimeout(() => dispatchReaderSearchIntent({
      term: hexagram.name,
      iching: {
        hexagramName: hexagram.name,
        hexagramNumber: hexagram.number,
        changingHexagramName: changingHexagram.name,
        changingHexagramNumber: changingHexagram.number,
        changingLines: data.changingYao,
      },
      raw: '本次六爻起卦结果',
    }), 0);
  }

  const contextPayload = useMemo(
    () => ({
      项目: '六爻占卜',
      起卦方式: method,
      生辰: solarBirth,
      所问事项: question || '未填写',
      本卦: result?.hexagramName,
      变卦: result?.changingHexagramName,
      用神: result?.yongShen,
      世爻: result?.shiYao,
      应爻: result?.yingYao,
      动爻: result?.changingYao,
    }),
    [result, method, solarBirth, question],
  );

  if (presentation?.state === 'error') {
    return (
      <section className="space-y-4">
        <InterpretationCard title="计算未完成" subtitle="请核对输入">
          <p className="text-sm text-jade-100/55">{presentation.error?.message}</p>
        </InterpretationCard>
      </section>
    );
  }

  if (!result) {
    return <section className="space-y-4"><LoadingSkeleton label="正在排盘" /></section>;
  }

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">六爻占卜</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              周易六爻占卜：起卦后排出纳甲、六亲、六神、世应、用神与变卦，据用神旺衰与动爻断吉凶。
              支持铜钱法、时间起卦、手动爻值三种方式；用神依问题事项自动选取。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="liuyao" title="六爻占卜摘要" payload={contextPayload} />
            {exportPresentation && <ExportReportButton module="六爻占卜" presentation={exportPresentation} />}
          </div>
        </div>
        <p className="mt-3 rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
          六爻为传统文化占问参考，非绝对预测；同一事不宜反复起卦。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          <ControlField label="起卦方式">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as CastMethod)}
              className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
            >
              {METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} — {opt.hint}
                </option>
              ))}
            </select>
          </ControlField>

          <ControlField label="占问事项（影响用神选取）" hint="可选">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="如：今日财运、能否升职、考试、病情"
              className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
            />
          </ControlField>

          {method === 'manual' && (
            <ControlField label="爻值（初爻→上爻）" hint="6 位，6老阴/7少阳/8少阴/9老阳">
              <input
                value={yaoValues}
                onChange={(e) => setYaoValues(e.target.value)}
                inputMode="numeric"
                placeholder="789789"
                className="rounded-card border border-white/10 bg-ink-900 px-3 py-2 font-mono text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
              />
            </ControlField>
          )}

          {method === 'coin' && (
            <button
              type="button"
              onClick={() => setCastCount((c) => c + 1)}
              className="w-full rounded-card border border-cinnabar-500/50 bg-cinnabar-500/20 px-4 py-2.5 text-sm font-semibold text-jade-50 transition hover:bg-cinnabar-500/30 active:scale-[0.99]"
            >
              再起一卦
            </button>
          )}

          <InterpretationCard
            title="卦象概要"
            badge={isReal ? '起卦结果' : '填写事项后查看'}
            items={[
              { label: '本卦', value: result.hexagramName },
              { label: '变卦', value: result.changingHexagramName ?? '—' },
              { label: '宫属', value: palaceSummary },
              { label: '世爻', value: `第${result.shiYao}爻` },
              { label: '应爻', value: `第${result.yingYao}爻` },
              { label: '用神', value: result.yongShen },
              { label: '动爻', value: result.changingYao && result.changingYao.length ? result.changingYao.join('、') : '无' },
              { label: '日干支', value: result.dayGanZhi || result.dayStem || '?' },
              { label: '月干支', value: result.monthGanZhi || '?' },
              { label: '月建', value: result.monthJian || '?' },
              { label: '日建', value: result.dayJian || '?' },
              { label: '空亡', value: result.xunkong && result.xunkong.length ? result.xunkong.join('、') : '—' },
              ...(result.shenYao ? [{ label: '身爻', value: `第${result.shenYao}爻` }] : []),
            ]}
          />

          {envelope?.ok && (
            <button type="button" onClick={openClassicalReading} className="w-full rounded-card border border-jade-500/35 bg-jade-500/10 px-4 py-2.5 text-sm font-medium text-jade-100 transition hover:border-jade-500/60 hover:bg-jade-500/16">
              阅读本次关联《周易》原文
            </button>
          )}

          {/* 伏神 */}
          {result.hiddenStars && result.hiddenStars.length > 0 && (
            <div className="rounded-card border border-gold-500/20 bg-gold-500/5 p-3">
              <p className="text-xs font-semibold text-gold-400">伏神</p>
              <p className="mt-0.5 text-[10px] text-gold-400/50">本宫卦有而当前卦缺的六亲</p>
              <div className="mt-2 space-y-1">
                {result.hiddenStars.map((h, i) => (
                  <div key={i} className="text-xs">
                    <span className="text-gold-400/80">{h.relation}</span>
                    <span className="ml-2 text-jade-100/55">{h.hiddenStem}{h.hiddenBranch}（{h.hiddenBranchElement}）</span>
                    <span className="ml-1 text-[10px] text-jade-100/35">本宫第{h.hiddenAtPureYao}爻</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="rounded-card border border-white/8 bg-black/24 p-3 text-xs leading-5 text-jade-100/55">
            生辰由顶部「全局生辰」统一管理。输入求测事项后自动选用神。
          </p>
          <TermExplanationPanel
            ready={ready}
            initialTerm="用神"
            terms={['世爻', '应爻', '用神', '原神', '忌神', '动爻', '变爻', '纳甲', '六亲', '六神', '青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武', '妻财', '官鬼', '父母', '子孙', '兄弟']}
            description="点击术语查看通俗解释。"
          />
          {presentation?.report && (
            <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <FourLayerReport
                report={presentation.report}
                semanticReport={presentation.semanticReport}
                notices={presentation.notices}
                warnings={presentation.warnings}
                reportMetadata={reportMetadata ?? undefined}
                title="六爻解读"
              />
            </div>
          )}
        </aside>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <section className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-2">
                <div>
                  <h3 className="text-base font-semibold text-jade-50">本卦</h3>
                  <p className="mt-0.5 text-xs leading-5 text-jade-100/45">
                    京房纳甲：六神(左)、爻象、地支六亲(右)、世应标记。
                  </p>
                </div>
              </div>
              <div className="canvas-stage overflow-x-auto rounded-card border border-jade-500/18 bg-ink-950/92 p-3">
                {ready ? (
                  <ZoomableSvg title="本卦">
                    <HexagramChart data={result as LiuyaoData} />
                  </ZoomableSvg>
                ) : (
                  <LoadingSkeleton label="正在排盘" />
                )}
              </div>
            </section>
            {changedLines ? (
              <section className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
                <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-2">
                  <div>
                    <h3 className="text-base font-semibold text-jade-50">变卦</h3>
                    <p className="mt-0.5 text-xs leading-5 text-jade-100/45">动爻阴阳互变后的卦象。</p>
                  </div>
                  <span className="rounded-full border border-cinnabar-500/30 bg-cinnabar-500/10 px-2.5 py-1 text-[10px] text-cinnabar-400">变卦</span>
                </div>
                <div className="canvas-stage overflow-x-auto rounded-card border border-jade-500/18 bg-ink-950/92 p-3">
                  <ZoomableSvg title="变卦">
                    <HexagramChart data={changedLines} />
                  </ZoomableSvg>
                </div>
              </section>
            ) : (
              <div className="flex min-h-[520px] items-center justify-center rounded-panel border border-dashed border-white/10 bg-black/16 p-6 text-center text-sm text-jade-100/45">
                无动爻，本卦即所占之卦。
              </div>
            )}
          </div>

          <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4">
            <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-3">
              <h3 className="text-base font-semibold text-jade-100">纳甲六爻明细</h3>
              <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] text-jade-100/45">
                从初爻到上爻
              </span>
            </div>
            <div className="overflow-hidden rounded-card border border-white/10">
              <div className="grid grid-cols-7 bg-white/[0.035] text-center text-[11px] text-jade-100/45">
                {['爻位', '阴阳', '纳甲(干支)', '五行', '六亲', '六神', '旺衰'].map((h) => (
                  <div key={h} className="border-b border-white/10 px-2 py-2">
                    {h}
                  </div>
                ))}
              </div>
              {result.lines.map((line, i) => {
                const yaoNum = i + 1;
                const isShi = result.shiYao === yaoNum;
                const isYing = result.yingYao === yaoNum;
                return (
                  <div
                    key={yaoNum}
                    className={`grid grid-cols-7 border-b border-white/8 text-center text-xs last:border-b-0 ${
                      line.changing ? 'bg-cinnabar-500/8' : 'bg-black/8'
                    }`}
                  >
                    <div className="px-2 py-2.5 text-jade-100/55">
                      {yaoNum}
                      {isShi && <span className="ml-1 text-jade-400">世</span>}
                      {isYing && <span className="ml-1 text-jade-400">应</span>}
                    </div>
                    <div className={`px-2 py-2.5 ${line.yin ? 'text-jade-100/70' : 'text-jade-400'}`}>
                      {line.yin ? '阴' : '阳'}
                      {line.changing && <span className="ml-1 text-cinnabar-500">动</span>}
                    </div>
                    <div className="px-2 py-2.5 font-mono text-jade-100">
                      {line.stem ?? '?'}
                      {line.branch}
                    </div>
                    <div className="px-2 py-2.5 text-jade-100/55">{line.branchElement ?? '?'}</div>
                    <div className="px-2 py-2.5 text-jade-100/70">{line.relation}</div>
                    <div className="px-2 py-2.5 text-jade-100/55">{line.god}</div>
                    <div className={`px-2 py-2.5 ${
                      line.wangShuai === '旺' ? 'text-jade-400' :
                      line.wangShuai === '相' ? 'text-jade-300' :
                      line.wangShuai === '死' ? 'text-cinnabar-400' :
                      line.wangShuai === '囚' ? 'text-cinnabar-400/70' :
                      'text-jade-100/45'
                    }`}>{line.wangShuai || '—'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
