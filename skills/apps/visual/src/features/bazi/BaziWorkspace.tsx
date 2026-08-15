import { useMemo, useState } from 'react';
import { getSolarEntry } from '@/engine-api/calendar';
import { BaziPillarsChart } from '@/components/shared/BaziPillarsChart';
import { CopyContextButton } from '@/components/shared/CopyContextButton';

import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { FiveElementsChart } from '@/components/shared/FiveElementsChart';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { TermExplanationPanel } from '@/components/shared/TermExplanationPanel';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { buildBaziDynamicLayer, calculateBazi as calculateBaziPure, calcBaziEnveloped, calcXiYong, type BaziData } from '@/engine-api/bazi';
import type { AdvancedBaziAnalysis } from '@/legacy/advancedBazi';
import type { TrineSource } from '@/legacy/shensha';
import { validateBaziClaims, type BaziPresentationClaim } from '@/legacy/claimVerification/baziClaimVerifier';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';
import { toUserPresentation, type StructuredFactCheck } from '@/legacy/reportLayers';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { type BaziPillars, type WuxingStats } from '@/legacy/canvasRenderers';
import type { ShenShaItem } from '@/legacy/shensha';
import type { SolarBirth } from '@/legacy/birthBridge';
import { useBirth } from '@/lib/birthContext';

const DEFAULT_PILLARS: BaziPillars = {
  year: { stem: '甲', branch: '辰' },
  month: { stem: '丙', branch: '寅' },
  day: { stem: '戊', branch: '午' },
  hour: { stem: '庚', branch: '申' },
  dayMaster: '戊',
  gender: '男',
};

const DEFAULT_WUXING: WuxingStats = { 木: 2, 火: 3, 土: 1, 金: 0, 水: 2 };
const WUXING_COLORS: Record<keyof WuxingStats, string> = {
  木: 'var(--c-jade)',
  火: 'var(--wz-fire)',
  土: 'var(--wz-earth)',
  金: 'var(--wz-metal)',
  水: 'var(--wz-water)',
};

const PILLAR_LABEL: Record<string, string> = {
  year: '年',
  month: '月',
  day: '日',
  hour: '时',
};

interface BaziResult {
  pillars?: unknown;
  elements?: Partial<WuxingStats>;
  dayMaster?: string;
  dayMasterWuxing?: string;
  engineName?: string;
  mode?: string;
  confidenceNote?: string;
  hiddenStems?: Record<string, string[]>;
  shishen?: Record<string, { stem: string; branch: string }>;
  shishenList?: Record<string, string>;
  advancedAnalysis?: AdvancedBaziAnalysis;
  shenSha?: ShenShaItem[];
  shenShaTrineSource?: TrineSource;
}

function calculateBazi(solarBirth: SolarBirth, ready: boolean, trineSource: TrineSource) {
  if (!ready) {
    return { result: null, pillars: { ...DEFAULT_PILLARS, gender: solarBirth.gender }, wuxing: DEFAULT_WUXING, envelope: null };
  }
  try {
    const solarEntry = getSolarEntry();
    const env = calcBaziEnveloped({ birth: solarBirth, solar: solarEntry, shenShaTrineSource: trineSource });
    const pure = calculateBaziPure({ birth: solarBirth, solar: solarEntry, shenShaTrineSource: trineSource });
    const pillars: BaziPillars = {
      year: { stem: pure.pillars.year.stem, branch: pure.pillars.year.branch, hidden: pure.hiddenStems.year },
      month: { stem: pure.pillars.month.stem, branch: pure.pillars.month.branch, hidden: pure.hiddenStems.month },
      day: { stem: pure.pillars.day.stem, branch: pure.pillars.day.branch, hidden: pure.hiddenStems.day },
      hour: { stem: pure.pillars.hour.stem, branch: pure.pillars.hour.branch, hidden: pure.hiddenStems.hour },
      dayMaster: pure.dayMaster,
      gender: pure.gender,
    };
    return { result: pure as unknown as BaziResult, pillars, wuxing: { ...DEFAULT_WUXING, ...pure.elements }, envelope: env };
  } catch {
    return {
      result: null,
      pillars: { ...DEFAULT_PILLARS, gender: solarBirth.gender },
      wuxing: DEFAULT_WUXING,
      envelope: null,
    };
  }
}

function birthSummary(solarBirth: SolarBirth) {
  return solarBirth.year + '-' + String(solarBirth.month).padStart(2, '0') + '-' + String(solarBirth.day).padStart(2, '0') + ' ' + String(solarBirth.hour).padStart(2, '0') + ':' + String(solarBirth.minute).padStart(2, '0');
}

function getTodayDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function updateTransitYear(transitDate: string, year: string) {
  const targetYear = Number(year);
  if (!Number.isInteger(targetYear) || targetYear < 1900 || targetYear > 2100) return transitDate;
  const [currentYear, month, day] = transitDate.split('-').map(Number);
  if (!currentYear || !month || !day) return transitDate;
  const lastDay = new Date(targetYear, month, 0).getDate();
  return `${targetYear}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

function shiftTransitDate(transitDate: string, days: number) {
  const [year, month, day] = transitDate.split('-').map(Number);
  if (!year || !month || !day) return transitDate;
  const next = new Date(year, month - 1, day + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

function selectDecadalStart(transitDate: string, startYear?: number) {
  return startYear ? updateTransitYear(transitDate, String(startYear)) : transitDate;
}

function createBaziFactChecks(data: BaziData): StructuredFactCheck[] {
  const claims: Array<{ claim: BaziPresentationClaim; label: string; value: string }> = [
    { claim: { kind: 'dayMaster', value: data.dayMaster }, label: '日主', value: data.dayMaster },
    { claim: { kind: 'elementCount', element: '木', value: data.elements.木 }, label: '木五行数量', value: String(data.elements.木) },
    { claim: { kind: 'elementCount', element: '火', value: data.elements.火 }, label: '火五行数量', value: String(data.elements.火) },
    { claim: { kind: 'elementCount', element: '土', value: data.elements.土 }, label: '土五行数量', value: String(data.elements.土) },
    { claim: { kind: 'elementCount', element: '金', value: data.elements.金 }, label: '金五行数量', value: String(data.elements.金) },
    { claim: { kind: 'elementCount', element: '水', value: data.elements.水 }, label: '水五行数量', value: String(data.elements.水) },
    { claim: { kind: 'strength', value: data.advancedAnalysis.support.strength }, label: '日主强弱', value: data.advancedAnalysis.support.strength },
  ];

  return claims.map(({ claim, label, value }) => ({
    fact: { label, value, tool: 'bazi_calculate' },
    validation: validateBaziClaims(data, [claim]),
  }));
}

export function BaziWorkspace() {
  const { birth, baziTimeStatus } = useBirth();
  const solarBirth = baziTimeStatus.status === 'true-solar-verified'
    ? baziTimeStatus.resolution.trueSolarBirth
    : baziTimeStatus.civilBirth;
  const [trineSource, setTrineSource] = useState<TrineSource>('year');
  const [activeShenShaPillar, setActiveShenShaPillar] = useState<'年' | '月' | '日' | '时' | null>(null);
  const [transitDate, setTransitDate] = useState(getTodayDate);
  const transitYear = transitDate.slice(0, 4);

  const ready = true;
  const { result, pillars, wuxing, envelope } = useMemo(
    () => calculateBazi(solarBirth, ready, trineSource),
    [solarBirth, ready, trineSource],
  );
  const transit = useMemo(
    () => buildBaziDynamicLayer(solarBirth, transitDate, getSolarEntry()),
    [solarBirth, transitDate],
  );
  const shenSha = result?.shenSha ?? [];
  const firstShenShaPillar = (['年', '月', '日', '时'] as const).find((pillar) => shenSha.some((item) => item.pillar === pillar)) ?? null;
  const selectedShenShaPillar = activeShenShaPillar && shenSha.some((item) => item.pillar === activeShenShaPillar)
    ? activeShenShaPillar
    : firstShenShaPillar;
  const selectedShenShaItems = selectedShenShaPillar
    ? shenSha.filter((item) => item.pillar === selectedShenShaPillar)
    : [];
  const factChecks = useMemo(
    () => envelope?.ok ? createBaziFactChecks(envelope.data) : [],
    [envelope],
  );
  const presentation = useMemo(
    () => envelope
      ? toUserPresentation(envelope, {
        factChecks,
        disclaimers: ['本报告提供结构化计算与传统文化解释参考，不构成对现实结果、医疗、法律或财务事项的保证或专业建议。'],
      })
      : null,
    [envelope, factChecks],
  );
  const reportMetadata = useMemo(() => envelope ? createWorkspaceReportMetadata({
    moduleId: 'bazi',
    inputSummary: `本次按出生资料排盘；神煞查法：按${trineSource === 'year' ? '年支' : '日支'}。`,
    timeBasis: baziTimeStatus.status === 'true-solar-verified'
      ? 'true-solar-verified'
      : 'civil-unverified',
  }) : null, [baziTimeStatus.status, envelope, trineSource]);
  const exportPresentation = useMemo(() => {
    if (!presentation?.exportReport || !reportMetadata) return null;
    const timeNotice = baziTimeStatus.status === 'true-solar-verified'
      ? '已核验真太阳时。'
      : '民用时间（未完成真太阳时复核）。';
    return {
      report: presentation.exportReport,
      notices: [...presentation.notices, timeNotice],
      warnings: presentation.warnings,
      semanticReport: presentation.semanticReport,
      reportMetadata,
    };
  }, [baziTimeStatus.status, presentation, reportMetadata]);
  const pillarRows = [
    ['年柱', pillars.year],
    ['月柱', pillars.month],
    ['日柱', pillars.day],
    ['时柱', pillars.hour],
  ] as const;
  const maxWuxing = Math.max(1, ...Object.values(wuxing));
  const xiyong = useMemo(() => {
    const dmWx = result?.dayMasterWuxing;
    if (!dmWx) return null;
    return calcXiYong(dmWx, wuxing);
  }, [result?.dayMasterWuxing, wuxing]);
  const contextPayload = useMemo(
    () => ({
      项目: '八字命盘',
      民用出生时间: baziTimeStatus.status === 'true-solar-verified'
        ? baziTimeStatus.resolution.civilBirth
        : baziTimeStatus.civilBirth,
      排盘时间: solarBirth,
      时间来源: baziTimeStatus.status === 'true-solar-verified'
        ? '已核验真太阳时'
        : baziTimeStatus.status === 'civil-unverified'
          ? '民用时间（未完成真太阳时复核）'
          : '民用时间（尚未完成真太阳时核验）',
      四柱: pillars,
      五行: wuxing,
    }),
    [baziTimeStatus, solarBirth, pillars, wuxing],
  );

  return (
    <section className="space-y-5">
      <div className="console-panel rounded-panel border border-jade-500/20 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-400">八字命盘</p>
            <h2 className="mt-1 font-serif text-2xl font-semibold tracking-[0.08em] text-jade-50">八字排盘</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              根据出生时间排出四柱，并从五行平衡角度提供传统命理参考。
            </p>
            <p className="mt-2 text-xs text-jade-100/50">
              民用时间：{birthSummary(baziTimeStatus.status === 'true-solar-verified' ? baziTimeStatus.resolution.civilBirth : baziTimeStatus.civilBirth)} · {birth.isLunar ? '农历' : '公历'} · {solarBirth.gender}
            </p>
            {baziTimeStatus.status === 'true-solar-verified' && (
              <>
                <p className="mt-1 text-xs text-jade-300/80">
                  排盘时间：{birthSummary(solarBirth)}（已核验真太阳时，校正 {baziTimeStatus.resolution.trueSolarCorrectionMinutes >= 0 ? '+' : ''}{baziTimeStatus.resolution.trueSolarCorrectionMinutes} 分钟）
                </p>
                {(baziTimeStatus.resolution.crossedDate || baziTimeStatus.resolution.crossedShichen || baziTimeStatus.resolution.crossedZiChu) && (
                  <p className="mt-1 text-xs text-gold-300/80">
                    真太阳时已跨越{[baziTimeStatus.resolution.crossedDate ? '日期' : '', baziTimeStatus.resolution.crossedShichen ? '时辰' : '', baziTimeStatus.resolution.crossedZiChu ? '子初换日边界' : ''].filter(Boolean).join('、')}，按子初换日口径定盘。
                  </p>
                )}
              </>
            )}
            {baziTimeStatus.status === 'awaiting-agent-verification' && (
              <p className="mt-1 text-xs text-gold-300/80">
                尚未完成真太阳时核验；当前按民用时间展示，尚未采用真太阳时排盘。
              </p>
            )}
            {baziTimeStatus.status === 'civil-unverified' && (
              <p className="mt-1 text-xs text-gold-300/80">
                未完成真太阳时复核：已按用户确认的民用出生记录排盘。
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="bazi" title="八字命盘摘要" payload={contextPayload} />
            <ExportReportButton module="八字命盘" presentation={exportPresentation} />
          </div>
        </div>
      </div>

      <section className="bazi-summary-grid grid gap-px overflow-hidden border border-jade-500/20 bg-jade-500/20 sm:grid-cols-2 xl:grid-cols-4" aria-label="命局摘要">
        {[
          ['日主', `${result?.dayMaster ?? pillars.dayMaster ?? '?'} · ${result?.dayMasterWuxing ?? '?'}`],
          ['整体平衡状态', result?.advancedAnalysis?.support.strength ?? xiyong?.qiangRuo ?? '—'],
          ['参考平衡元素', xiyong?.shen ?? '—'],
          ['出生季节力量', result?.advancedAnalysis?.monthCommand.branch ? `${result.advancedAnalysis.monthCommand.branch}月 · ${result.advancedAnalysis.monthCommand.obtainsCommand ? '得令' : '失令'}` : '—'],
        ].map(([label, value]) => (
          <div key={label} className="bg-ink-950/90 px-4 py-3">
            <p className="text-xs text-jade-100/50">{label}</p>
            <p className="mt-1 font-serif text-lg text-jade-50">{value}</p>
          </div>
        ))}
      </section>

      <div className="bazi-console-grid grid gap-4 xl:grid-cols-12">
        <div className="order-1 flex flex-col gap-4 xl:col-span-8">
          <section className="order-1 console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-jade-50">四柱主盘</h3>
                <p className="mt-1 text-sm leading-6 text-jade-100/55">
                  四柱分别对应出生的年、月、日、时；日柱作为观察其他干支关系的参照。
                </p>
              </div>
            </div>
            <div className="mb-3 rounded-card border border-white/8 bg-ink-900/40 px-3 py-2.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-jade-100/70">桃花、驿马、华盖、将星查法</p>
                  <p className="mt-1 text-[11px] leading-4 text-jade-100/45">
                    {trineSource === 'year' ? '神煞查法有不同传统；本页默认按出生年份的地支查取，仅作辅助参考。' : '当前按出生日的地支查取，可与默认查法对照阅读，仅作辅助参考。'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {([['year', '按年支查'], ['day', '按日支查']] as Array<[TrineSource, string]>).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTrineSource(id)}
                      className={`rounded-full px-3 py-1 text-xs transition-colors ${
                        id === trineSource
                          ? 'border border-jade-500/50 bg-jade-500/20 text-jade-100'
                          : 'border border-white/10 bg-ink-900/60 text-jade-100/55 hover:border-jade-500/30 hover:text-jade-100/80'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="canvas-stage overflow-x-auto rounded-card border border-jade-500/18 bg-ink-950/92 p-3">
              {ready ? (
                <ZoomableSvg title="四柱主盘">
                  <BaziPillarsChart
                    pillars={pillars}
                    shenSha={shenSha}
                    activeShenShaPillar={selectedShenShaPillar}
                    onSelectShenShaPillar={setActiveShenShaPillar}
                  />
                </ZoomableSvg>
              ) : (
                <LoadingSkeleton label="正在排盘" />
              )}
            </div>
            {selectedShenShaPillar && selectedShenShaItems.length > 0 && (
              <section className="mt-4 border-t border-jade-500/16 pt-4" aria-labelledby="pillar-shensha-title">
                <div className="mb-3 flex items-center justify-between">
                  <h4 id="pillar-shensha-title" className="text-sm font-semibold text-jade-100">
                    {selectedShenShaPillar}柱神煞
                  </h4>
                  <span className="rounded-full border border-cinnabar-500/25 bg-cinnabar-500/10 px-2 py-0.5 text-[11px] text-cinnabar-500">
                    {selectedShenShaItems.length} 项
                  </span>
                </div>
                <ul className="space-y-2">
                  {selectedShenShaItems.map((item) => (
                    <li key={`${item.name}-${item.branch}-${item.pillar}`} className="rounded-card border border-white/8 bg-white/[0.025] px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-jade-50">{item.name}</span>
                        <span className="text-xs text-cinnabar-500/85">{item.category}</span>
                        <span className="text-xs text-jade-100/50">临{item.branch}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-jade-100/60">{item.meaning}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </section>

          <section className="order-2 console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument" aria-labelledby="bazi-table-title">
            <div className="mb-4 flex items-end justify-between border-b border-white/8 pb-3">
              <div>
                <h3 id="bazi-table-title" className="text-lg font-semibold text-jade-50">四柱对照</h3>
                <p className="mt-1 text-sm text-jade-100/55">按出生的年、月、日、时依次查看干支，以及它们与日主形成的关系。</p>
              </div>
              <span className="text-xs text-jade-100/45">日柱为命局参照</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[620px] w-full border-collapse text-center">
                <thead>
                  <tr className="border-y border-white/10 text-xs text-jade-100/55">
                    <th scope="col" className="w-20 px-3 py-2 text-left font-medium">层次</th>
                    {pillarRows.map(([label]) => <th key={label} scope="col" className="px-3 py-2 font-medium">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/8">
                    <th scope="row" className="px-3 py-2 text-left text-xs font-medium text-jade-100/55">天干十神</th>
                    {(['year', 'month', 'day', 'hour'] as const).map((key) => <td key={key} className="px-3 py-2 text-sm text-cinnabar-500">{result?.shishenList?.[key] ?? '—'}</td>)}
                  </tr>
                  <tr className="border-b border-white/8">
                    <th scope="row" className="px-3 py-3 text-left text-xs font-medium text-jade-100/55">天干</th>
                    {pillarRows.map(([label, pillar]) => <td key={label} className="px-3 py-3 font-serif text-3xl text-jade-50">{pillar.stem}</td>)}
                  </tr>
                  <tr className="border-b border-white/8">
                    <th scope="row" className="px-3 py-3 text-left text-xs font-medium text-jade-100/55">地支</th>
                    {pillarRows.map(([label, pillar]) => <td key={label} className="px-3 py-3 font-serif text-3xl text-jade-50">{pillar.branch}</td>)}
                  </tr>
                  <tr>
                    <th scope="row" className="px-3 py-2 text-left text-xs font-medium text-jade-100/55">藏干</th>
                    {(['year', 'month', 'day', 'hour'] as const).map((key) => <td key={key} className="px-3 py-2 text-sm text-jade-100/70">{result?.hiddenStems?.[key]?.join(' · ') || '—'}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {transit.available && (
            <section className="order-5 console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument" aria-labelledby="bazi-transit-title">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 id="bazi-transit-title" className="text-lg font-semibold text-jade-50">动态层：大运 · 小运 · 流年</h3>
                  <p className="mt-1 text-sm leading-6 text-jade-100/55">大运按周岁定位，小运按虚岁定位；均以目标日期为锚点，不改变本命四柱。</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-jade-100/65">
                  目标年份
                  <input
                    type="number"
                    value={transitYear}
                    min="1900"
                    max="2100"
                    onChange={(event) => setTransitDate((current) => updateTransitYear(current, event.target.value))}
                    className="w-24 rounded border border-white/10 bg-black/30 px-2 py-1 text-sm text-jade-50 outline-none focus:border-jade-500/60"
                  />
                </label>
              </div>
              <p className="mt-2 text-xs leading-5 text-jade-100/45">动态层均按目标日期计算；本命盘保持不变。小运按虚岁定位。</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <section className="rounded-card border border-jade-500/20 bg-jade-500/10 px-3 py-2.5">
                  <p className="text-xs font-semibold text-jade-100/70">当前大运</p>
                  <p className="mt-1 text-sm text-jade-50">
                    {transit.decadal.current
                      ? `${transit.decadal.direction} · ${transit.decadal.current.ageStart}岁起 · ${transit.decadal.current.stem}${transit.decadal.current.branch}`
                      : `${transit.decadal.direction} · 尚未起运`}
                  </p>
                  <p className="mt-1 text-xs text-jade-100/55">
                    {transit.decadal.startSolar
                      ? `起运时间：${transit.decadal.startSolar}`
                      : transit.decadal.current?.startYear && transit.decadal.current.endYear
                        ? `${transit.decadal.current.startYear}–${transit.decadal.current.endYear}`
                        : '起运时间按当前采用的传统计算方法估算'}
                  </p>
                </section>
                <section className="rounded-card border border-gold-300/20 bg-gold-300/10 px-3 py-2.5">
                  <p className="text-xs font-semibold text-jade-100/70">当前小运</p>
                  <p className="mt-1 text-sm text-jade-50">虚岁{transit.minor.nominalAge} · {transit.minor.stem}{transit.minor.branch}</p>
                  <p className="mt-1 text-xs text-jade-100/55">{transit.minor.stemShiShen} · 五行{transit.minor.stemWuxing} · 依传统历法口径推算</p>
                </section>
                <section className="rounded-card border border-cinnabar-500/20 bg-cinnabar-500/10 px-3 py-2.5">
                  <p className="text-xs font-semibold text-jade-100/70">流年</p>
                  <p className="mt-1 text-sm text-jade-50">{transit.targetDate.slice(0, 4)}年 · {transit.yearly.stem}{transit.yearly.branch}</p>
                  <p className="mt-1 text-xs text-jade-100/55">流年天干{transit.yearly.stem}为{transit.yearly.stemShiShen} · 五行{transit.yearly.stemWuxing}</p>
                </section>
              </div>
              <section className="mt-3" aria-labelledby="bazi-luck-timeline-title">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 id="bazi-luck-timeline-title" className="text-sm font-semibold text-jade-100">大运时间轴</h4>
                    <p className="mt-1 text-xs leading-5 text-jade-100/45">点击任一运段可将目标日期跳转至该段起始年；当前段由目标日期自动高亮。</p>
                  </div>
                  <span className="text-xs text-jade-100/45">{transit.decadal.direction}</span>
                </div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="list" aria-label="大运时间轴">
                  {transit.decadal.all.map((luck) => {
                    const isCurrent = transit.decadal.current?.ageStart === luck.ageStart;
                    const label = `${luck.ageStart}岁起 ${luck.stem}${luck.branch}${luck.startYear && luck.endYear ? ` ${luck.startYear}至${luck.endYear}` : ''}`;
                    return (
                      <button
                        key={`${luck.ageStart}-${luck.stem}${luck.branch}`}
                        type="button"
                        role="listitem"
                        aria-pressed={isCurrent}
                        aria-label={`选择大运：${label}`}
                        disabled={!luck.startYear}
                        onClick={() => setTransitDate((current) => selectDecadalStart(current, luck.startYear))}
                        className={`min-w-36 shrink-0 rounded-card border px-3 py-2.5 text-left transition-colors ${
                          isCurrent
                            ? 'border-jade-500/55 bg-jade-500/15 text-jade-50'
                            : 'border-white/8 bg-white/[0.025] text-jade-100/75 hover:border-jade-500/35 hover:bg-jade-500/5'
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        <p className="text-xs font-semibold">{luck.ageStart}岁起</p>
                        <p className="mt-1 text-lg">{luck.stem}{luck.branch}</p>
                        <p className="mt-1 text-xs text-jade-100/55">{luck.stemWuxing}{luck.startYear && luck.endYear ? ` · ${luck.startYear}–${luck.endYear}` : ''}</p>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section className="mt-3 rounded-card border border-white/8 bg-white/[0.025] px-3 py-2.5">
                <p className="text-xs font-semibold text-jade-100/70">流年关系</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {([
                    ['原局', transit.relations.yearly.natal],
                    ['大运', transit.relations.yearly.decadal],
                    ['小运', transit.relations.yearly.minor],
                  ] as const).flatMap(([reference, matches]) => matches.map((item) => (
                    <span key={`${reference}-${item.referenceKey ?? item.referenceGanZhi}`} className="rounded-full border border-cinnabar-500/25 bg-cinnabar-500/10 px-2 py-0.5 text-xs text-cinnabar-400">
                      {reference}{item.referenceKey ? `${PILLAR_LABEL[item.referenceKey] ?? item.referenceKey}柱` : item.referenceGanZhi} · {item.relations.join('、')}
                    </span>
                  )))}
                  {[...transit.relations.yearly.natal, ...transit.relations.yearly.decadal, ...transit.relations.yearly.minor].length === 0 && (
                    <span className="text-xs text-jade-100/50">未发现本规则重点标记的干支互动</span>
                  )}
                </div>
              </section>
            </section>
          )}
          {result?.advancedAnalysis && (
            <section className="order-3 console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument" aria-labelledby="bazi-advanced-title">
              <div>
                <h3 id="bazi-advanced-title" className="text-lg font-semibold text-jade-50">命局要览</h3>
                <p className="mt-1 text-sm leading-6 text-jade-100/55">从出生季节、日主支持度与五行关系，观察命盘的整体平衡状态。</p>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ['出生季节力量', `${result.advancedAnalysis.monthCommand.branch}月 · ${result.advancedAnalysis.monthCommand.dayMasterState} · ${result.advancedAnalysis.monthCommand.obtainsCommand ? '较有支持' : '支持较少'}`, result.advancedAnalysis.monthCommand.reason],
                  ['平衡方向', `${result.advancedAnalysis.support.strength} · ${result.advancedAnalysis.fuyii.principle === '抑强' ? '适度疏泄' : result.advancedAnalysis.fuyii.principle === '扶弱' ? '适度补足' : '保持协调'} · 参考${result.advancedAnalysis.fuyii.usefulElements.join('、')}`, result.advancedAnalysis.fuyii.reason.join('')],
                  ['结构观察', `${result.advancedAnalysis.pattern.name} · ${result.advancedAnalysis.pattern.status}`, result.advancedAnalysis.pattern.reason.join('')],
                  ['从格', result.advancedAnalysis.followPattern.status === '成立' ? result.advancedAnalysis.followPattern.type : '不按从格看', result.advancedAnalysis.followPattern.reason.join('')],
                  ['化气', result.advancedAnalysis.transformation.status === '成立' ? `${result.advancedAnalysis.transformation.element}化成立` : '暂不按化气看', result.advancedAnalysis.transformation.reason.join('')],
                  ['季节平衡 / 五行协调', `季节平衡参考${result.advancedAnalysis.seasonalAdjustment.usefulElements.join('、')} · ${result.advancedAnalysis.passage.status === '成立' ? `${result.advancedAnalysis.passage.conflict}之间可参考${result.advancedAnalysis.passage.element}协调` : '未见需要特别协调的五行关系'}`, [...result.advancedAnalysis.seasonalAdjustment.reason, ...result.advancedAnalysis.passage.reason].join('')],
                  ['特殊组合提示', `${result.advancedAnalysis.remedy.status === '成立' ? result.advancedAnalysis.remedy.remedy : '未发现本规则特别标记的组合'}`, result.advancedAnalysis.remedy.reason.join('')],
                ].map(([label, value, detail]) => (
                  <section key={label} className="rounded-card border border-white/8 bg-white/[0.025] px-3 py-2.5">
                    <p className="text-xs font-semibold text-jade-100/70">{label}</p>
                    <p className="mt-1 text-sm text-jade-50">{value}</p>
                    <p className="mt-1 text-xs leading-5 text-jade-100/55">{detail}</p>
                  </section>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-jade-100/45">判断次序：{result.advancedAnalysis.priority.join('；')}。</p>
              <p className="mt-1 text-xs leading-5 text-jade-100/45">命局解读依传统命理规则整理，适合用于传统文化学习与自我观察，不作为现实决策依据。</p>
            </section>
          )}
          <section className="order-6 console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument" aria-labelledby="bazi-month-day-title">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 id="bazi-month-day-title" className="text-lg font-semibold text-jade-50">流月 · 流日与关系</h3>
                <p className="mt-1 text-sm leading-6 text-jade-100/55">流月按节气月干支、流日按精确日干支推算；关系只展示可复核的干支规则事实。</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-jade-100/65">
                <button
                  type="button"
                  onClick={() => setTransitDate((current) => shiftTransitDate(current, -1))}
                  className="rounded border border-white/10 bg-black/30 px-2 py-1 text-jade-100/70 transition-colors hover:border-jade-500/40 hover:text-jade-50"
                >
                  前一日
                </button>
                <label className="flex items-center gap-2">
                  目标日期
                  <input
                    type="date"
                    value={transitDate}
                    onChange={(event) => setTransitDate(event.target.value)}
                    className="rounded border border-white/10 bg-black/30 px-2 py-1 text-sm text-jade-50 outline-none focus:border-jade-500/60"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setTransitDate((current) => shiftTransitDate(current, 1))}
                  className="rounded border border-white/10 bg-black/30 px-2 py-1 text-jade-100/70 transition-colors hover:border-jade-500/40 hover:text-jade-50"
                >
                  后一日
                </button>
              </div>
            </div>
            {transit.available ? (
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {([['流月', 'monthly', transit.monthly], ['流日', 'daily', transit.daily]] as const).map(([label, layer, pillar]) => {
                  const relations = transit.relations[layer];
                  const relationGroups = [
                    ['原局', relations.natal],
                    ['大运', relations.decadal],
                    ['小运', relations.minor],
                  ] as const;
                  return (
                    <section key={label} className="rounded-card border border-white/8 bg-white/[0.025] px-3 py-2.5">
                      <p className="text-xs font-semibold text-jade-100/70">{label}</p>
                      <p className="mt-1 text-lg text-jade-50">{pillar.stem}{pillar.branch}</p>
                      <p className="mt-1 text-xs text-jade-100/55">天干{pillar.stem}为{pillar.stemShiShen} · 五行{pillar.stemWuxing}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {relationGroups.flatMap(([reference, matches]) => matches.map((item) => (
                          <span key={`${label}-${reference}-${item.referenceKey ?? item.referenceGanZhi}`} className="rounded-full border border-cinnabar-500/25 bg-cinnabar-500/10 px-2 py-0.5 text-xs text-cinnabar-400">
                            {reference}{item.referenceKey ? `${PILLAR_LABEL[item.referenceKey] ?? item.referenceKey}柱` : item.referenceGanZhi} · {item.relations.join('、')}
                          </span>
                        )))}
                        {relationGroups.every(([, matches]) => matches.length === 0) && (
                          <span className="text-xs text-jade-100/50">未发现本规则重点标记的干支互动</span>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-gold-300/80">{transit.limitations.join(' ')}</p>
            )}
            <p className="mt-3 text-xs leading-5 text-jade-100/45">传统文化参考：上述关系不推导事业、婚恋、健康或财富等现实结论。</p>
          </section>
        </div>

        <aside className="order-1 space-y-4 xl:col-span-4">
          <section className="console-panel rounded-panel border border-jade-500/20 bg-ink-950/90 p-4 shadow-instrument">
            <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-3">
              <h3 className="text-lg font-semibold text-jade-50">五行能量</h3>
              <span className="rounded-full border border-jade-500/25 bg-jade-500/10 px-2.5 py-1 text-[10px] text-jade-400">统计</span>
            </div>
            <div className="space-y-3">
              {(Object.keys(wuxing) as Array<keyof WuxingStats>).map((key) => {
                const value = wuxing[key];
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-jade-100/70">{key}</span>
                      <span className="font-mono text-jade-100/55">{value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full rounded-full" style={{ width: Math.max(8, (value / maxWuxing) * 100) + '%', backgroundColor: WUXING_COLORS[key] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-jade-50">五行平衡</h3>
                <p className="mt-1 text-sm leading-6 text-jade-100/55">
                  根据四柱中的天干、地支和藏干，展示五行力量的相对分布。
                </p>
              </div>
            </div>
            <div className="canvas-stage overflow-x-auto rounded-card border border-jade-500/18 bg-ink-950/92 p-3">
              {ready ? (
                <ZoomableSvg title="五行平衡">
                  <FiveElementsChart stats={wuxing} />
                </ZoomableSvg>
              ) : (
                <LoadingSkeleton label="正在排盘" />
              )}
            </div>
          </section>
        </aside>
      </div>

      <section className="grid gap-4 xl:grid-cols-12" aria-label="辅助阅读">
        <div className="xl:col-span-5">
          <TermExplanationPanel
            ready={ready}
            initialTerm="日主"
            terms={["日主","十神","喜用神","身强","身弱","月令","得令","失令","通根","扶抑","格局","从格","化气","调候","通关","病药","本命盘","冲合刑害","正印","偏印","正官","七杀","正财","偏财","比肩","劫财","食神","伤官","五行","纳音"]}
            description="读完盘面后，可在这里查看术语的通俗说明。"
          />
        </div>
        {presentation?.report && (
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument xl:col-span-7">
            <FourLayerReport
              report={presentation.report}
              semanticReport={presentation.semanticReport}
              title="命盘解读"
              notices={presentation.notices}
              warnings={presentation.warnings}
              reportMetadata={reportMetadata ?? undefined}
            />
          </div>
        )}
      </section>
    </section>
  );
}
