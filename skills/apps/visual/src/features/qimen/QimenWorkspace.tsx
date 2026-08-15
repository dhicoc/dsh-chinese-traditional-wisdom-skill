import { useMemo } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { TermExplanationPanel } from '@/components/shared/TermExplanationPanel';
import { calcQimenEnveloped, type QimenData } from '@/engine-api/divination';
import { validateDivinationClaims, type DivinationPresentationClaim } from '@/legacy/claimVerification/divinationClaimVerifier';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';
import { toUserPresentation, type StructuredFactCheck } from '@/legacy/reportLayers';
import type { ToolEnvelope } from '@/engine-api/types';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { QimenChart } from '@/components/shared/QimenChart';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useBirth } from '@/lib/birthContext';

/**
 * 奇门遁甲工作区
 * 3meta v2.6.0 真实时家奇门排盘：三奇六仪、九星、八门、八神、
 * 值符值使、空亡、马星、旺相休囚、十二长生、吉凶格局自动检测。
 * 3meta 未加载时回退简化排盘。文化学习参考。
 */

interface QimenPalace {
  position: number;
  trigram: string;
  palace: string;
  palaceNum: number;
  gate: string;
  gateLuck: string;
  star: string;
  starLuck: string;
  deity: string;
  godLuck: string;
  heavenlyStem: string;
  earthlyStem: string;
  earthBranch: string;
  fiveElements: string;
  status: { star: string; gate: string } | null;
  innerOuter: string;
  voidness: { hasVoidness: boolean; voidInPalace: string[] } | null;
  isZhiFu: boolean;
  isZhiShi: boolean;
  horse: boolean;
  auspiciousPatterns: string[];
  inauspiciousPatterns: string[];
  tenStemResponse: { heavenlyToEarthly: string; timeToDay: string } | null;
}

export function createQimenFactChecks(data: QimenData): StructuredFactCheck[] {
  const claims: Array<{ claim: DivinationPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'arrange_qimen', kind: 'basic', field: 'dun', value: data.dun }, label: '阴阳遁', value: data.dun },
    { claim: { tool: 'arrange_qimen', kind: 'basic', field: 'ju', value: data.ju }, label: '局数', value: data.ju },
    ...(data.zhiFu ? [{ claim: { tool: 'arrange_qimen', kind: 'zhiFu', field: 'star', value: data.zhiFu.star } as DivinationPresentationClaim, label: '值符', value: data.zhiFu.star }] : []),
    ...(data.zhiShi ? [{ claim: { tool: 'arrange_qimen', kind: 'zhiShi', field: 'gate', value: data.zhiShi.gate } as DivinationPresentationClaim, label: '值使', value: data.zhiShi.gate }] : []),
  ];
  return claims.map(({ claim, label, value }) => ({
    fact: { label, value, tool: 'arrange_qimen' },
    validation: validateDivinationClaims('arrange_qimen', data, [claim]),
  }));
}

interface QimenResult {
  engineName: string;
  mode: string;
  confidenceNote: string;
  birthInfo: { year: number; month: number; day: number; hour: number };
  timeInfo: { yearGZ: string; monthGZ: string; dayGZ: string; hourGZ: string } | null;
  dun: string;
  ju: string;
  yuan: string;
  season: string;
  monthElement: string;
  zhiFu: { star: string; position: number; heavenlyStem?: string } | null;
  zhiShi: { gate: string; position: number } | null;
  palaces: QimenPalace[];
  auspiciousPatterns: string[];
  inauspiciousPatterns: string[];
  summary: string;
  _is3meta: boolean;
}


export function QimenWorkspace() {
  const { solarBirth } = useBirth();

  const ready = true;
  const envelope = useMemo<ToolEnvelope<QimenData> | null>(() => {
    if (!ready) return null;
    try {
      const result = calcQimenEnveloped({ birth: solarBirth });
      return result.ok ? result : {
        ...result,
        error: { code: 'calculation_failed', message: '本次计算未能完成，请核对输入后重试。' },
      };
    } catch {
      return {
        ok: false,
        tool: 'arrange_qimen',
        version: 'unknown',
        input_normalized: { birth: solarBirth },
        data: {} as QimenData,
        error: { code: 'calculation_exception', message: '本次计算未能完成，请核对输入后重试。' },
      };
    }
  }, [ready, solarBirth]);
  const factChecks = useMemo(() => envelope?.ok ? createQimenFactChecks(envelope.data) : [], [envelope]);
  const presentation = useMemo(() => envelope ? toUserPresentation(envelope, {
    factChecks,
    disclaimers: ['奇门遁甲结果仅作传统术数文化学习参考，不作为现实决策依据。'],
  }) : null, [envelope, factChecks]);
  const reportMetadata = useMemo(() => envelope ? createWorkspaceReportMetadata({
    moduleId: 'qimen',
    inputSummary: '本次按出生资料排出时家奇门盘；报告不保留完整出生资料。',
  }) : null, [envelope]);
  const exportPresentation = useMemo(() => presentation?.exportReport && reportMetadata ? ({
    report: presentation.exportReport,
    notices: presentation.notices,
    warnings: presentation.warnings,
    semanticReport: presentation.semanticReport,
    reportMetadata,
  }) : null, [presentation, reportMetadata]);
  const result = envelope?.ok ? envelope.data as QimenResult : null;

  const contextPayload = useMemo(
    () => ({
      项目: '奇门遁甲',
      生辰: solarBirth,
      阴阳遁: result?.dun,
      局数: result?.ju,
      值符: result?.zhiFu,
      值使: result?.zhiShi,
      吉格: result?.auspiciousPatterns,
      凶格: result?.inauspiciousPatterns,
    }),
    [result, solarBirth],
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

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">奇门遁甲</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-jade-100/55">
              时家奇门排盘 · 文化学习参考
            </p>
            <p data-testid="qimen-culture-disclaimer" className="mt-3 rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
              奇门遁甲结果仅作传统术数文化学习参考，不作为现实决策依据。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="qimen" title="奇门遁甲摘要" payload={contextPayload} />
            {exportPresentation && <ExportReportButton module="奇门遁甲命盘" presentation={exportPresentation} />}
          </div>
        </div>
      </div>

      {!ready && (
        <div className="rounded-card border border-jade-500/20 bg-jade-500/10 p-4 text-sm text-jade-100/55">
          <LoadingSkeleton label="正在排盘" />
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* 排盘概要：局式信息 + 四柱 + 值符值使 + 吉凶格局，紧凑单卡 */}
          <InterpretationCard
            title="排盘概要"
            badge={result.mode === 'local-exact' ? '按出生资料排盘' : '参考推算'}
          >
            {/* 局式 + 四柱：两列 */}
            <div className="grid gap-3 sm:grid-cols-2">
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-2 rounded-card bg-black/40 px-3 py-1.5">
                  <dt className="text-jade-100/55">阴阳遁</dt>
                  <dd className="text-jade-100">{result.dun}</dd>
                </div>
                <div className="flex justify-between gap-2 rounded-card bg-black/40 px-3 py-1.5">
                  <dt className="text-jade-100/55">局数</dt>
                  <dd className="text-jade-100">{result.ju}</dd>
                </div>
                {result.yuan && (
                  <div className="flex justify-between gap-2 rounded-card bg-black/40 px-3 py-1.5">
                    <dt className="text-jade-100/55">元</dt>
                    <dd className="text-jade-100">{result.yuan}</dd>
                  </div>
                )}
                {result.season && (
                  <div className="flex justify-between gap-2 rounded-card bg-black/40 px-3 py-1.5">
                    <dt className="text-jade-100/55">季节</dt>
                    <dd className="text-jade-100">{result.season}</dd>
                  </div>
                )}
                {result.monthElement && (
                  <div className="flex justify-between gap-2 rounded-card bg-black/40 px-3 py-1.5">
                    <dt className="text-jade-100/55">月令五行</dt>
                    <dd className="text-jade-100">{result.monthElement}</dd>
                  </div>
                )}
              </dl>
              <dl className="space-y-1.5 text-xs">
                {result.timeInfo && (
                  <>
                    <div className="flex justify-between gap-2 rounded-card bg-black/40 px-3 py-1.5">
                      <dt className="text-jade-100/55">年柱</dt>
                      <dd className="text-jade-100">{result.timeInfo.yearGZ}</dd>
                    </div>
                    <div className="flex justify-between gap-2 rounded-card bg-black/40 px-3 py-1.5">
                      <dt className="text-jade-100/55">月柱</dt>
                      <dd className="text-jade-100">{result.timeInfo.monthGZ}</dd>
                    </div>
                    <div className="flex justify-between gap-2 rounded-card bg-black/40 px-3 py-1.5">
                      <dt className="text-jade-100/55">日柱</dt>
                      <dd className="text-jade-100">{result.timeInfo.dayGZ}</dd>
                    </div>
                    <div className="flex justify-between gap-2 rounded-card bg-black/40 px-3 py-1.5">
                      <dt className="text-jade-100/55">时柱</dt>
                      <dd className="text-jade-100">{result.timeInfo.hourGZ}</dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between gap-2 rounded-card bg-black/40 px-3 py-1.5">
                  <dt className="text-jade-100/55">值符</dt>
                  <dd className="text-jade-100">{result.zhiFu ? `${result.zhiFu.star}（${result.zhiFu.position}宫）` : '—'}</dd>
                </div>
                <div className="flex justify-between gap-2 rounded-card bg-black/40 px-3 py-1.5">
                  <dt className="text-jade-100/55">值使</dt>
                  <dd className="text-jade-100">{result.zhiShi ? `${result.zhiShi.gate}（${result.zhiShi.position}宫）` : '—'}</dd>
                </div>
              </dl>
            </div>
            {/* 吉凶格局：单行紧凑 */}
            <div className="mt-3 space-y-1.5">
              <div className="flex flex-wrap items-start gap-1.5">
                <span className="mt-0.5 shrink-0 rounded-full border border-jade-500/30 bg-jade-500/10 px-2 py-0.5 text-[10px] font-semibold text-jade-400">吉格</span>
                {result.auspiciousPatterns.length > 0 ? (
                  result.auspiciousPatterns.map((pat, i) => (
                    <span key={i} className="rounded-full border border-jade-500/20 bg-jade-500/8 px-2 py-0.5 text-[11px] text-jade-300">{pat}</span>
                  ))
                ) : (
                  <span className="text-[11px] text-jade-100/40">无</span>
                )}
              </div>
              <div className="flex flex-wrap items-start gap-1.5">
                <span className="mt-0.5 shrink-0 rounded-full border border-cinnabar-500/30 bg-cinnabar-500/10 px-2 py-0.5 text-[10px] font-semibold text-cinnabar-400">凶格</span>
                {result.inauspiciousPatterns.length > 0 ? (
                  result.inauspiciousPatterns.map((pat, i) => (
                    <span key={i} className="rounded-full border border-cinnabar-500/20 bg-cinnabar-500/8 px-2 py-0.5 text-[11px] text-cinnabar-300">{pat}</span>
                  ))
                ) : (
                  <span className="text-[11px] text-jade-100/40">无</span>
                )}
              </div>
            </div>
          </InterpretationCard>

          {/* 九宫式盘 */}
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-2 text-base font-semibold text-jade-50">九宫式盘</h3>
            <ZoomableSvg title="奇门九宫式盘">
              <QimenChart
                palaces={result.palaces}
                dunJu={`${result.dun}${result.ju}`}
              />
            </ZoomableSvg>
          </div>

          {/* 各宫格局详情 */}
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-sm font-semibold text-jade-50">各宫格局详情</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {result.palaces.filter((p) => p.auspiciousPatterns.length > 0 || p.inauspiciousPatterns.length > 0 || p.tenStemResponse?.heavenlyToEarthly || p.tenStemResponse?.timeToDay).map((p) => (
                <div key={p.position} className={`rounded-card border p-2.5 ${p.isZhiFu ? 'border-jade-500/30 bg-jade-500/6' : p.isZhiShi ? 'border-gold-500/25 bg-gold-500/5' : 'border-white/8 bg-black/30'}`}>
                  <p className="text-xs font-semibold text-jade-100/80">{p.trigram}宫（{p.position}）· {p.gate} {p.star} {p.deity}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                    {p.auspiciousPatterns.map((pat, i) => (
                      <span key={`a${i}`} className="text-jade-400">★{pat}</span>
                    ))}
                    {p.inauspiciousPatterns.map((pat, i) => (
                      <span key={`i${i}`} className="text-cinnabar-400">✗{pat}</span>
                    ))}
                  </div>
                  {(p.tenStemResponse?.heavenlyToEarthly || p.tenStemResponse?.timeToDay) && (
                    <div className="mt-1 text-[10px] leading-4 text-jade-100/55">
                      {p.tenStemResponse.heavenlyToEarthly && <div>{p.tenStemResponse.heavenlyToEarthly}</div>}
                      {p.tenStemResponse.timeToDay && <div>{p.tenStemResponse.timeToDay}</div>}
                    </div>
                  )}
                </div>
              ))}
              {result.palaces.every((p) => p.auspiciousPatterns.length === 0 && p.inauspiciousPatterns.length === 0 && !p.tenStemResponse?.heavenlyToEarthly && !p.tenStemResponse?.timeToDay) && (
                <p className="text-[11px] text-jade-100/45">本局各宫无明显格局与十干应期。</p>
              )}
            </div>
          </div>
        </div>
      )}

      {ready && (
        <TermExplanationPanel
          ready={ready}
          initialTerm="值符"
          terms={["值符","值使","八门","九星","八神","三奇六仪","休门","生门","伤门","杜门","景门","死门","惊门","开门","天蓬","天任","天冲","天辅","天英","天芮","天柱","天心","天禽","直符","腾蛇","太阴","六合","白虎","玄武","九地","九天","阳遁","阴遁","局数","空亡","马星"]}
          description="点击术语查看奇门遁甲通俗解释。"
        />
      )}
      {presentation?.report && (
        <div className="console-panel mt-4 rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <FourLayerReport
            report={presentation.report}
            semanticReport={presentation.semanticReport}
            notices={presentation.notices}
            warnings={presentation.warnings}
            reportMetadata={reportMetadata ?? undefined}
            title="奇门遁甲解读"
          />
        </div>
      )}
    </section>
  );
}
