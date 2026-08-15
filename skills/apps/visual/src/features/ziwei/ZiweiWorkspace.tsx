import { useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { LegendPanel } from '@/components/shared/LegendPanel';
import { ZiweiPalaceGrid } from '@/components/shared/ZiweiPalaceGrid';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { TermExplanationPanel } from '@/components/shared/TermExplanationPanel';
import {
  calcZiweiEnveloped,
  getZiweiHoroscopeSummary,
  getZiweiTransitSnapshot,
  type ZiweiData,
  type ZiweiPalace,
  type ZiweiStar,
} from '@/engine-api/ziwei';
import type { ToolEnvelope } from '@/engine-api/types';
import { validateZiweiClaims, type ZiweiPresentationClaim } from '@/legacy/claimVerification/ziweiClaimVerifier';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';
import { toUserPresentation, type StructuredFactCheck } from '@/legacy/reportLayers';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import type { SolarBirth } from '@/legacy/birthBridge';
import { useBirth } from '@/lib/birthContext';

interface ZiweiMingGua {
  trigram: string;
  group: string;
}

const PALACE_NAMES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'] as const;
const STARS = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'] as const;
const POSITIONS = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'] as const;
const BRIGHTNESS = ['庙', '旺', '得', '利', '平', '陷'] as const;

const STAR_GROUPS: Array<{ label: string; types: ZiweiStar['type'][] }> = [
  { label: '主星', types: ['major'] },
  { label: '吉辅', types: ['soft', 'lucun', 'tianma'] },
  { label: '六煞', types: ['tough'] },
  { label: '桃花', types: ['flower'] },
  { label: '解厄 / 辅曜', types: ['helper'] },
  { label: '杂曜', types: ['adjective'] },
];

function calcMingGua(year: number, gender: '男' | '女'): ZiweiMingGua {
  const sum = String(year)
    .split('')
    .map((char) => Number.parseInt(char, 10))
    .reduce((acc, value) => acc + value, 0);
  const value = ((gender === '男' ? 11 : 4) - (sum % 9) + 9) % 9 || 9;
  const map: Record<number, ZiweiMingGua> = {
    1: { trigram: '坎', group: '东四命' },
    2: { trigram: '坤', group: '西四命' },
    3: { trigram: '震', group: '东四命' },
    4: { trigram: '巽', group: '东四命' },
    6: { trigram: '乾', group: '西四命' },
    7: { trigram: '兑', group: '西四命' },
    8: { trigram: '艮', group: '西四命' },
    9: { trigram: '离', group: '东四命' },
  };
  return map[value] ?? { trigram: '坎', group: '东四命' };
}

function createSeededGenerator(seedValue: number) {
  let seed = seedValue % 233280;
  return function next() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function buildFallbackZiweiData(solarBirth: SolarBirth, mingGua: ZiweiMingGua): ZiweiData {
  const next = createSeededGenerator(
    solarBirth.year * 1000000 + solarBirth.month * 10000 + solarBirth.day * 100 + solarBirth.hour + (solarBirth.gender === '女' ? 7 : 3),
  );

  const palaces = PALACE_NAMES.reduce<Record<string, ZiweiPalace>>((acc, palaceName, index) => {
    const starCount = Math.floor(next() * 3) + 1;
    const starSet = new Set<string>();
    while (starSet.size < starCount) {
      starSet.add(STARS[Math.floor(next() * STARS.length)]);
    }
    const majorStars: ZiweiStar[] = Array.from(starSet).map((name) => ({
      name,
      type: 'major',
      scope: 'origin',
      source: 'majorStars',
    }));
    acc[palaceName] = {
      stars: Array.from(starSet),
      majorStars,
      minorStars: [],
      adjectiveStars: [],
      position: POSITIONS[(index + solarBirth.month - 1) % POSITIONS.length],
      miaoxian: BRIGHTNESS[Math.floor(next() * BRIGHTNESS.length)],
    };
    return acc;
  }, {});

  return {
    birthInfo: { year: solarBirth.year, month: solarBirth.month, day: solarBirth.day, hour: solarBirth.hour, gender: solarBirth.gender },
    mingGua,
    palaces,
    sihua: { 廉贞: '禄', 破军: '权', 武曲: '科', 太阳: '忌' },
    mainStars: [...STARS],
    chart: null,
    export_snapshot: {
      summary: '暂未生成完整命盘，请稍后重试。',
      sections: [],
    },
    engineName: 'FallbackZiweiShell',
    mode: 'demo',
    version: 'react-shell',
  };
}

const SAFE_ERROR_MESSAGE = '本次计算未能完成，请核对输入后重试。';

/** Dashboard 边界：失败信封绝不把引擎内部错误带到用户界面。 */
export function sanitizeZiweiEnvelope(envelope: ToolEnvelope<ZiweiData>): ToolEnvelope<ZiweiData> {
  if (envelope.ok) return envelope;
  return {
    ...envelope,
    error: { code: 'calculation_failed', message: SAFE_ERROR_MESSAGE },
  };
}

function createZiweiFailureEnvelope(
  solarBirth: SolarBirth,
  mingGua: ZiweiMingGua,
  transit: { year: number; month: number },
): ToolEnvelope<ZiweiData> {
  return sanitizeZiweiEnvelope({
    ok: false,
    tool: 'ziwei_chart',
    version: 'unknown',
    input_normalized: { birth: solarBirth, mingGua, transit },
    data: {} as ZiweiData,
    error: { code: 'calculation_exception', message: SAFE_ERROR_MESSAGE },
  });
}

/** 仅输出本命白名单事实；每条候选均独立与当前成功命盘核验。 */
export function createZiweiFactChecks(data: ZiweiData, palaceName: string): StructuredFactCheck[] {
  const palace = data.palaces[palaceName];
  const candidates: Array<{ claim: ZiweiPresentationClaim; label: string; value: string }> = [];
  if (data.fiveElementsClass) candidates.push({
    claim: { tool: 'ziwei_chart', kind: 'metadata', field: 'fiveElementsClass', value: data.fiveElementsClass },
    label: '五行局', value: data.fiveElementsClass,
  });
  if (data.soul) candidates.push({
    claim: { tool: 'ziwei_chart', kind: 'metadata', field: 'soul', value: data.soul },
    label: '命主', value: data.soul,
  });
  if (palace?.position) candidates.push({
    claim: { tool: 'ziwei_chart', kind: 'palace', palace: palaceName, field: 'position', value: palace.position },
    label: `${palaceName}宫位`, value: palace.position,
  });
  const firstStar = palace?.stars[0];
  if (firstStar) candidates.push({
    claim: { tool: 'ziwei_chart', kind: 'palaceStar', palace: palaceName, value: firstStar },
    label: `${palaceName}主星`, value: firstStar,
  });
  return candidates.map(({ claim, label, value }) => ({
    fact: { label, value: String(value), tool: 'ziwei_chart' },
    validation: validateZiweiClaims(data, [claim]),
  }));
}

export function ZiweiWorkspace() {
  const { solarBirth } = useBirth();
  const [activePalace, setActivePalace] = useState<string | null>(null);
  const [transitYear, setTransitYear] = useState(() => String(new Date().getFullYear()));
  const [transitMonth, setTransitMonth] = useState(() => String(new Date().getMonth() + 1));

  const ready = true;
  const transitQuery = useMemo(() => ({
    year: Number(transitYear) || new Date().getFullYear(),
    month: Math.min(12, Math.max(1, Number(transitMonth) || new Date().getMonth() + 1)),
  }), [transitMonth, transitYear]);
  const mingGua = useMemo(() => calcMingGua(solarBirth.year, solarBirth.gender), [solarBirth.gender, solarBirth.year]);
  const envelope = useMemo(() => {
    try {
      return sanitizeZiweiEnvelope(calcZiweiEnveloped({ birth: solarBirth, mingGua, transit: transitQuery }));
    } catch {
      return createZiweiFailureEnvelope(solarBirth, mingGua, transitQuery);
    }
  }, [mingGua, solarBirth, transitQuery]);
  const successData = envelope.ok ? envelope.data : null;
  const fallbackData = useMemo(() => buildFallbackZiweiData(solarBirth, mingGua), [mingGua, solarBirth]);
  const data = successData ?? fallbackData;
  const transitDate = `${transitQuery.year}-${String(transitQuery.month).padStart(2, '0')}-15`;
  const transit = useMemo(() => getZiweiTransitSnapshot(solarBirth, transitDate), [solarBirth, transitDate]);
  const horoscope = useMemo(
    () => getZiweiHoroscopeSummary(solarBirth, transitQuery.year, transitQuery.month),
    [solarBirth, transitQuery],
  );
  const firstPalaceWithStars = Object.keys(data.palaces).find((name) => data.palaces[name]?.stars.length > 0)
    ?? Object.keys(data.palaces)[0]
    ?? null;
  const selectedPalaceName = activePalace && data.palaces[activePalace] ? activePalace : firstPalaceWithStars;
  const selectedPalace = selectedPalaceName ? data.palaces[selectedPalaceName] : null;
  const factChecks = useMemo(
    () => successData && selectedPalaceName ? createZiweiFactChecks(successData, selectedPalaceName) : [],
    [selectedPalaceName, successData],
  );
  const presentation = useMemo(() => toUserPresentation(envelope, {
    factChecks,
    disclaimers: ['紫微斗数结果仅作传统文化学习参考，不作为现实决策依据。'],
  }), [envelope, factChecks]);
  const reportMetadata = useMemo(() => createWorkspaceReportMetadata({
    moduleId: 'ziwei',
    inputSummary: '本次包含本命盘及所选年份、月份的动态参考；报告不保留完整出生资料。',
  }), []);
  const exportPresentation = useMemo(() => presentation.exportReport ? ({
    report: presentation.exportReport,
    notices: presentation.notices,
    warnings: presentation.warnings,
    semanticReport: presentation.semanticReport,
    reportMetadata,
  }) : null, [presentation, reportMetadata]);
  const natalDeities = PALACE_NAMES.flatMap((palace) => {
    const item = data.palaces[palace];
    if (!item?.changsheng12 || !item.boshi12) return [];
    return [{ palace, changsheng12: item.changsheng12, boshi12: item.boshi12 }];
  });
  const palaceCount = Object.keys(data.palaces || {}).length;
  const contextPayload = useMemo(
    () => ({
      项目: '紫微斗数命盘',
      生辰: data.birthInfo,
      宫位数: palaceCount,
      命卦: data.mingGua,
    }),
    [data.birthInfo, data.mingGua, palaceCount],
  );

  if (presentation.state === 'error') {
    return (
      <section className="space-y-4">
        <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
          <h2 className="font-serif text-2xl font-semibold text-jade-100">紫微斗数</h2>
        </div>
        <section className="rounded-panel border border-cinnabar-500/30 bg-cinnabar-500/10 p-4" aria-labelledby="ziwei-error-title">
          <h3 id="ziwei-error-title" className="text-lg font-semibold text-jade-50">计算未完成</h3>
          <p className="mt-2 text-sm leading-6 text-jade-100/65">{SAFE_ERROR_MESSAGE}</p>
        </section>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">紫微斗数</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              紫微斗数排盘：读取顶部全局生辰，排出十二宫、十四主星、四化与庙旺利得，据命宫主星与四化解读命局。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="ziwei" title="紫微斗数命盘摘要" payload={contextPayload} />
            {exportPresentation && <ExportReportButton module="紫微斗数命盘" presentation={exportPresentation} />}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          <InterpretationCard
            title="命盘信息"
            items={[
              { label: '宫位', value: String(palaceCount) + ' 宫' },
              { label: '命卦', value: data.mingGua.trigram + '卦 · ' + data.mingGua.group },
              { label: '五行局', value: data.fiveElementsClass || '—' },
              { label: '命主 / 身主', value: [data.soul, data.body].filter(Boolean).join(' / ') || '—' },
              { label: '身宫', value: data.bodyPalaceBranch ? `${data.bodyPalaceBranch}位` : '—' },
              { label: '来因宫', value: data.originalPalaceBranch ? `${data.originalPalaceBranch}位` : '—' },
            ]}
          />

          <LegendPanel
            title="十四主星"
            items={data.mainStars.slice(0, 14).map((star, index) => ({
              label: star,
              value: index < 6 ? '北斗/中天系' : '南斗/辅曜系',
              color: index < 6 ? 'var(--wz-fire)' : 'var(--wz-water)',
            }))}
          />

          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
            生辰资料统一由顶部"全局生辰"面板管理；修改后本页会重新排盘。
          </p>
          <TermExplanationPanel
            ready={ready}
            initialTerm="紫微"
            terms={["紫微","天机","太阳","武曲","天同","廉贞","天府","太阴","贪狼","巨门","天相","天梁","七杀","破军","庙旺","落陷","四化","命宫","福德"]}
            description="点击星曜或术语查看通俗解释。"
          />
          {presentation.report && (
            <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <FourLayerReport
                report={presentation.report}
                semanticReport={presentation.semanticReport}
                notices={presentation.notices}
                warnings={presentation.warnings}
                reportMetadata={reportMetadata}
                title="命盘解读"
              />
            </div>
          )}
        </aside>

        <section className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-jade-50">十二宫命盘</h3>
              <p className="mt-1 text-sm leading-6 text-jade-100/55">
                十二宫命盘：外环十二地支各居一格；点击宫位可检视主星、吉辅、六煞、杂曜与桃花等本命星曜分类。
              </p>
            </div>
          </div>
          <section className="mb-4 rounded-card border border-jade-500/20 bg-jade-500/10 px-3 py-2.5" aria-labelledby="ziwei-method-title">
            <h4 id="ziwei-method-title" className="text-xs font-semibold text-jade-100/80">排盘口径</h4>
            <p className="mt-1 text-xs leading-5 text-jade-100/60">
              本命盘按公历出生日期与时辰换算；动态层以 {transitDate} 为查询日期，当前可查看大限、流年、流月与小限。流日、流时及三方四正暂未提供。
            </p>
          </section>
          <div className="canvas-stage overflow-x-auto rounded-card border border-jade-500/18 bg-ink-950/92 p-3">
            {!ready ? (
              <LoadingSkeleton label="正在排盘" />
            ) : (
              <ZoomableSvg title="紫微斗数十二宫命盘">
                <ZiweiPalaceGrid data={data} activePalace={selectedPalaceName} onSelectPalace={setActivePalace} />
              </ZoomableSvg>
            )}
          </div>
          {selectedPalaceName && selectedPalace && (
            <section className="mt-4 border-t border-jade-500/16 pt-4" aria-labelledby="ziwei-palace-stars-title">
              <div className="mb-3 flex items-center justify-between">
                <h4 id="ziwei-palace-stars-title" className="text-sm font-semibold text-jade-100">
                  {selectedPalaceName}星曜
                </h4>
                <span className="rounded-full border border-jade-500/25 bg-jade-500/10 px-2 py-0.5 text-[11px] text-jade-300">
                  本命 · {selectedPalace.stars.length} 颗
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {STAR_GROUPS.map((group) => {
                  const stars = [...selectedPalace.majorStars, ...selectedPalace.minorStars, ...selectedPalace.adjectiveStars]
                    .filter((star) => group.types.includes(star.type));
                  if (stars.length === 0) return null;
                  return (
                    <section key={group.label} className="rounded-card border border-white/8 bg-white/[0.025] px-3 py-2.5">
                      <p className="mb-1.5 text-xs font-semibold text-jade-100/70">{group.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {stars.map((star) => (
                          <span
                            key={`${star.source}-${star.name}`}
                            className={`rounded-full border px-2 py-0.5 text-xs ${
                              star.type === 'tough'
                                ? 'border-cinnabar-500/30 bg-cinnabar-500/10 text-cinnabar-500'
                                : star.type === 'flower'
                                  ? 'border-rose-400/30 bg-rose-400/10 text-rose-200'
                                  : 'border-jade-500/25 bg-jade-500/10 text-jade-100/80'
                            }`}
                          >
                            {star.name}{star.mutagen ? `化${star.mutagen}` : ''}
                          </span>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
          )}
          {transit.available && (
            <section className="mt-4 border-t border-jade-500/16 pt-4" aria-labelledby="ziwei-transit-title">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 id="ziwei-transit-title" className="text-sm font-semibold text-jade-100">大限 · 流年</h4>
                  <p className="mt-1 text-xs leading-5 text-jade-100/50">按目标年月查看大限、流年、流月、小限与流年十二神。</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-jade-100/65">
                  <label className="flex items-center gap-2">
                    目标年份
                    <input
                      type="number"
                      value={transitYear}
                      min="1900"
                      max="2100"
                      onChange={(event) => setTransitYear(event.target.value)}
                      className="w-24 rounded border border-white/10 bg-black/30 px-2 py-1 text-sm text-jade-50 outline-none focus:border-jade-500/60"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    月份
                    <input
                      type="number"
                      value={transitMonth}
                      min="1"
                      max="12"
                      onChange={(event) => setTransitMonth(event.target.value)}
                      className="w-16 rounded border border-white/10 bg-black/30 px-2 py-1 text-sm text-jade-50 outline-none focus:border-jade-500/60"
                    />
                  </label>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <section className="rounded-card border border-jade-500/20 bg-jade-500/10 px-3 py-2.5">
                  <p className="text-xs font-semibold text-jade-100/70">大限</p>
                  <p className="mt-1 text-sm text-jade-50">{transit.decadal.stem}{transit.decadal.branch}</p>
                  <p className="mt-1 text-xs text-jade-100/55">化禄 {transit.decadal.mutagen[0] || '—'} · 化权 {transit.decadal.mutagen[1] || '—'} · 化科 {transit.decadal.mutagen[2] || '—'} · 化忌 {transit.decadal.mutagen[3] || '—'}</p>
                </section>
                <section className="rounded-card border border-cinnabar-500/20 bg-cinnabar-500/10 px-3 py-2.5">
                  <p className="text-xs font-semibold text-jade-100/70">流年</p>
                  <p className="mt-1 text-sm text-jade-50">{transit.yearly.stem}{transit.yearly.branch} · 命宫落{transit.yearly.mingPalace.natalPalace}{transit.yearly.mingPalace.earthlyBranch}</p>
                  <p className="mt-1 text-xs text-jade-100/55">化禄 {transit.yearly.mutagen[0] || '—'} · 化权 {transit.yearly.mutagen[1] || '—'} · 化科 {transit.yearly.mutagen[2] || '—'} · 化忌 {transit.yearly.mutagen[3] || '—'}</p>
                </section>
                {horoscope.available && (
                  <section className="rounded-card border border-gold-300/20 bg-gold-300/10 px-3 py-2.5">
                    <p className="text-xs font-semibold text-jade-100/70">流月 · 小限</p>
                    <p className="mt-1 text-sm text-jade-50">{transitQuery.month}月 {horoscope.monthly.stem}{horoscope.monthly.branch} · 虚岁 {horoscope.age.nominalAge || '—'}</p>
                    <p className="mt-1 text-xs text-jade-100/55">小限在{horoscope.age.palace || '—'} · 化禄 {horoscope.monthly.mutagen[0] || '—'} · 化忌 {horoscope.monthly.mutagen[3] || '—'}</p>
                  </section>
                )}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {PALACE_NAMES.map((palace) => {
                  const decadalStars = transit.decadal.starsByNatalPalace[palace] ?? [];
                  const yearlyStars = transit.yearly.starsByNatalPalace[palace] ?? [];
                  const suiqian = transit.yearly.suiqian12ByNatalPalace[palace];
                  const jiangqian = transit.yearly.jiangqian12ByNatalPalace[palace];
                  if (!decadalStars.length && !yearlyStars.length && !suiqian && !jiangqian) return null;
                  return (
                    <section key={palace} className="rounded-card border border-white/8 bg-white/[0.025] px-3 py-2.5">
                      <p className="text-xs font-semibold text-jade-100/70">{palace}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {decadalStars.map((star) => <span key={`decadal-${star}`} className="rounded-full border border-jade-500/25 bg-jade-500/10 px-2 py-0.5 text-xs text-jade-100/80">{star}</span>)}
                        {yearlyStars.map((star) => <span key={`yearly-${star}`} className="rounded-full border border-cinnabar-500/25 bg-cinnabar-500/10 px-2 py-0.5 text-xs text-cinnabar-400">{star}</span>)}
                        {suiqian && <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-xs text-jade-100/65">岁前 · {suiqian}</span>}
                        {jiangqian && <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-xs text-jade-100/65">将前 · {jiangqian}</span>}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
          )}
          {natalDeities.length === PALACE_NAMES.length && (
            <section className="mt-4 border-t border-jade-500/16 pt-4" aria-labelledby="ziwei-natal-deities-title">
              <div className="mb-3 flex items-center justify-between">
                <h4 id="ziwei-natal-deities-title" className="text-sm font-semibold text-jade-100">本命十二神</h4>
                <span className="rounded-full border border-cinnabar-500/25 bg-cinnabar-500/10 px-2 py-0.5 text-[11px] text-cinnabar-400">十二宫</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {natalDeities.map((item) => (
                  <section key={item.palace} className="rounded-card border border-white/8 bg-white/[0.025] px-3 py-2.5">
                    <p className="text-xs font-semibold text-jade-100/70">{item.palace}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-jade-500/25 bg-jade-500/10 px-2 py-0.5 text-xs text-jade-100/80">长生 · {item.changsheng12}</span>
                      <span className="rounded-full border border-cinnabar-500/25 bg-cinnabar-500/10 px-2 py-0.5 text-xs text-cinnabar-400">博士 · {item.boshi12}</span>
                    </div>
                  </section>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </section>
  );
}
