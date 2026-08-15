import { useMemo, useState } from 'react';
import { getSolarEntry } from '@/engine-api/calendar';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { XingXiuChart } from '@/components/shared/XingXiuChart';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { useBirth } from '@/lib/birthContext';
import { calcXingXiuEnveloped, type XingXiuData, type XingXiuEntry, type XiuMethod } from '@/engine-api/folklore';
import { validateCalendarClaims, type CalendarPresentationClaim } from '@/legacy/claimVerification/calendarClaimVerifier';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';
import { toUserPresentation, type StructuredFactCheck } from '@/legacy/reportLayers';
import type { ToolEnvelope } from '@/engine-api/types';

export function createXingxiuFactChecks(data: XingXiuData): StructuredFactCheck[] {
  const claims: Array<{ claim: CalendarPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'xingxiu_daily', kind: 'xingxiu', field: 'zhiXiu', value: data.zhiXiu }, label: '当日值宿', value: data.zhiXiu },
    { claim: { tool: 'xingxiu_daily', kind: 'xingxiu', field: 'zhiXiuFull', value: data.zhiXiuFull }, label: '值宿全称', value: data.zhiXiuFull },
    { claim: { tool: 'xingxiu_daily', kind: 'xingxiu', field: 'xiang', value: data.xiang }, label: '所属四象', value: data.xiang },
    { claim: { tool: 'xingxiu_daily', kind: 'xingxiu', field: 'wuxing', value: data.wuxing }, label: '五行', value: data.wuxing },
  ];
  return claims.map(({ claim, label, value }) => ({
    fact: { label, value, tool: 'xingxiu_daily' },
    validation: validateCalendarClaims('xingxiu', data, [claim]),
  }));
}

/**
 * 二十八星宿工作区。
 * 四象分组展示二十八宿 + 当日值宿高亮 + 吉凶宜忌 + 四层报告。
 */

const XIANG_ORDER = ['东方青龙', '南方朱雀', '西方白虎', '北方玄武'] as const;
const XIANG_COLOR: Record<string, string> = {
  '东方青龙': 'var(--wz-wood)',
  '南方朱雀': 'var(--wz-fire)',
  '西方白虎': 'var(--wz-metal)',
  '北方玄武': 'var(--wz-water)',
};

export function XingXiuWorkspace() {
  const { solarBirth } = useBirth();

  const [method, setMethod] = useState<XiuMethod>('rotational');

  const result = useMemo<{ envelope: ToolEnvelope<XingXiuData> | null }>(() => {
    try {
      const solarEntry = getSolarEntry();
      return { envelope: calcXingXiuEnveloped({ birth: solarBirth, solar: solarEntry ?? null, method }) };
    } catch (error) {
      return {
        envelope: {
          ok: false,
          tool: 'xingxiu_daily',
          version: 'unknown',
          input_normalized: { birth: solarBirth, method },
          data: {} as XingXiuData,
          error: {
            code: 'calculation_exception',
            message: '本次计算未能完成，请核对输入后重试。',
          },
        },
      };
    }
  }, [solarBirth, method]);

  const data = result.envelope?.data;
  const factChecks = useMemo(
    () => result.envelope?.ok ? createXingxiuFactChecks(result.envelope.data) : [],
    [result.envelope],
  );
  const presentation = useMemo(
    () => result.envelope
      ? toUserPresentation(result.envelope, {
        factChecks,
        disclaimers: ['二十八星宿结果仅作传统文化学习参考，不构成对现实结果的保证或专业建议。'],
      })
      : null,
    [result.envelope, factChecks],
  );
  const reportMetadata = useMemo(() => result.envelope ? createWorkspaceReportMetadata({
    moduleId: 'xingxiu',
    inputSummary: '已按所选星宿计算方式生成值宿与日用参考；不保留出生资料或精确日期。',
  }) : null, [result.envelope]);
  const exportPresentation = useMemo(() => presentation?.exportReport ? ({
    report: presentation.exportReport,
    notices: presentation.notices,
    warnings: presentation.warnings,
    semanticReport: presentation.semanticReport,
    reportMetadata: reportMetadata ?? undefined,
  }) : null, [presentation, reportMetadata]);
  const grouped = useMemo(() => {
    const map: Record<string, XingXiuEntry[]> = {};
    for (const x of data?.allXiu ?? []) {
      (map[x.xiang] ??= []).push(x);
    }
    return map;
  }, [data]);
  const contextPayload = useMemo(() => ({
    项目: '二十八星宿',
    日期: `${solarBirth.year}-${solarBirth.month}-${solarBirth.day}`,
    当日值宿: data?.zhiXiuFull ?? '—',
    所属四象: data?.xiang ?? '—',
    宜忌参考: data?.luck ?? '—',
  }), [data, solarBirth]);

  if (presentation?.state === 'error') {
    return (
      <section className="space-y-4">
        <InterpretationCard title="计算未完成" subtitle="请核对输入">
          <p className="text-sm text-jade-100/55">{presentation.error?.message}</p>
        </InterpretationCard>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="space-y-4">
        <InterpretationCard title="暂无结果" subtitle="请确认生辰">
          <p className="text-sm text-jade-100/55">二十八星宿需日期信息，请在顶部「全局生辰」面板填写。</p>
        </InterpretationCard>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* 头部 */}
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">二十八星宿</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              本页同时呈现两项独立结果：本命星宿按出生日期排定；当日值宿按当前查询日期计算，用作日用宜忌参考，二者不互相替代。
            </p>
            <p className="mt-3 rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
              二十八星宿结果仅作传统文化学习参考，不作为现实决策依据。
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <CopyContextButton commandScope="xingxiu" title="二十八星宿摘要" payload={contextPayload} />
              <ExportReportButton module="二十八星宿" presentation={exportPresentation} />
            </div>
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/30 p-0.5">
              <button
                type="button"
                onClick={() => setMethod('lookup')}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${method === 'lookup' ? 'bg-jade-500/20 text-jade-300' : 'text-jade-100/40 hover:text-jade-100/60'}`}
              >
                查表法
              </button>
              <button
                type="button"
                onClick={() => setMethod('rotational')}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${method === 'rotational' ? 'bg-jade-500/20 text-jade-300' : 'text-jade-100/40 hover:text-jade-100/60'}`}
              >
                轮转法
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* 左侧：当日值宿 + 四层报告 */}
        <aside className="space-y-4">
          <div className="rounded-card border border-gold-500/25 bg-gold-500/8 p-4 text-center">
            <p className="text-xs text-gold-400/60">当日值宿</p>
            <p className="mt-1 text-[11px] leading-5 text-jade-100/45">查询日期：{data.queryDate} · 用于日用宜忌参考。</p>
            <p className="mt-2 font-serif text-3xl text-gold-200">{data.zhiXiuFull}</p>
            <p className="mt-1 text-sm" style={{ color: XIANG_COLOR[data.xiang] ?? 'var(--chart-text-faint)' }}>{data.xiang}</p>
            <p className="mt-2 text-xs text-jade-100/55">{data.wuxing}宿 · 七曜{data.yao} · 禽星{data.animal}</p>
            <span className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs font-semibold ${data.luck === '吉' ? 'border-jade-500/40 bg-jade-500/10 text-jade-300' : data.luck === '凶' ? 'border-cinnabar-500/40 bg-cinnabar-500/10 text-cinnabar-300' : 'border-white/15 text-jade-100/45'}`}>
              {data.luck}
            </span>
            <p className="mt-2 text-xs text-jade-100/45">{data.symbol}</p>
          </div>
          <div className="rounded-card border border-purple-500/25 bg-purple-500/8 p-4 text-center">
            <p className="text-xs text-purple-400/60">本命星宿</p>
            <p className="mt-1 text-[11px] leading-5 text-jade-100/45">按出生日期排定，用于本命星宿参考。</p>
            <p className="mt-2 font-serif text-2xl text-purple-200">{data.benMingXiuFull}</p>
            <p className="mt-1 text-sm" style={{ color: XIANG_COLOR[data.benMingXiang] ?? 'var(--chart-text-faint)' }}>{data.benMingXiang}</p>
            <p className="mt-2 text-xs text-jade-100/45">{data.benMingSymbol}</p>
          </div>
          <InterpretationCard
            title="宜忌"
            items={[
              { label: '宜', value: data.yi },
              { label: '忌', value: data.ji },
              { label: '西方对应', value: data.western },
            ]}
          />
          {data.song && (
            <InterpretationCard title="歌诀">
              <p className="text-xs leading-5 text-jade-100/55">{data.song}</p>
            </InterpretationCard>
          )}
          {presentation?.report && (
            <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <FourLayerReport
                report={presentation.report}
                semanticReport={presentation.semanticReport}
                notices={presentation.notices}
                warnings={presentation.warnings}
                reportMetadata={reportMetadata ?? undefined}
                title="二十八星宿解读"
              />
            </div>
          )}
        </aside>

        {/* 右侧：四象方位图 + 四象分组 */}
        <div className="space-y-3">
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-2 text-sm font-semibold text-jade-50">四象方位图</h3>
            <ZoomableSvg title="二十八星宿四象方位图">
              <XingXiuChart allXiu={data.allXiu} zhiXiu={data.zhiXiu} benMingXiu={data.benMingXiu} />
            </ZoomableSvg>
            <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-jade-100/40">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gold-500/60" />★ 当日值宿</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500/60" />◆ 本命星宿</span>
            </div>
          </div>
          {XIANG_ORDER.map((xiang) => (
            <div key={xiang} className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <div className="flex items-center gap-2 border-b border-white/8 pb-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: XIANG_COLOR[xiang] }} />
                <h3 className="text-sm font-semibold text-jade-50">{xiang}</h3>
                <span className="text-[10px] text-jade-100/35">7宿</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
                {grouped[xiang]?.map((x) => {
                  const isToday = x.name === data.zhiXiu;
                  return (
                    <div
                      key={x.name}
                      className={`rounded-card border p-2 text-center ${isToday ? 'border-gold-500/50 bg-gold-500/15' : 'border-white/8 bg-black/30'}`}
                    >
                      <p className={`font-serif text-base ${isToday ? 'text-gold-200' : 'text-jade-100/80'}`}>{x.fullName}</p>
                      <p className="text-[10px] text-jade-100/35">{x.yao}曜</p>
                      {isToday && <p className="mt-0.5 text-[9px] text-gold-400">今日值宿</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
