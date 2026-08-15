import { useMemo, useState } from 'react';
import {
  analyzeName,
  calcNameRating,
  type NameAnalysis,
  type NameRatingBirth,
} from '@/engine-api/name';
import { getSolarEntry } from '@/engine-api/calendar';
import { ControlField } from '@/components/shared/ControlField';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { FiveElementsChart } from '@/components/shared/FiveElementsChart';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';
import { createNamewuxingExportReport } from '@/features/namewuxing/namewuxingExport';
import { useBirth } from '@/lib/birthContext';

/**
 * 姓名五行工作区
 * 基于康熙字典笔画 + 五格剖象法 + 三才配置吉凶。
 * 民俗文化参考，不构成命名建议。
 */

const LUCK_COLOR: Record<string, string> = {
  吉: 'border-jade-500/30 bg-jade-500/10 text-jade-400',
  大吉: 'border-jade-500/40 bg-jade-500/15 text-jade-300',
  凶: 'border-cinnabar-500/30 bg-cinnabar-500/10 text-cinnabar-400',
  半吉半凶: 'border-gold-500/30 bg-gold-500/10 text-gold-400',
  半吉: 'border-gold-500/30 bg-gold-500/10 text-gold-400',
};

export function NamewuxingWorkspace() {
  const { solarBirth } = useBirth();
  const [surname, setSurname] = useState('');
  const [givenName, setGivenName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [useBaziBoost, setUseBaziBoost] = useState(false);
  const [analysis, setAnalysis] = useState<NameAnalysis | null>(null);

  const handleAnalyze = async () => {
    const s = surname.trim();
    const g = givenName.trim();
    if (s && g) setAnalysis(await analyzeName(s, g));
  };

  const wuxingStats = useMemo(() => {
    if (!analysis) return { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    return analysis.wuxingBalance as { 木: number; 火: number; 土: number; 金: number; 水: number };
  }, [analysis]);

  const rating = useMemo(() => {
    if (!analysis) return null;
    const year = Number.parseInt(birthYear, 10);
    const birthYearNum = Number.isNaN(year) ? solarBirth.year : year;
    let birth: NameRatingBirth | undefined;
    let solar: unknown;
    if (useBaziBoost) {
      birth = {
        year: solarBirth.year, month: solarBirth.month, day: solarBirth.day,
        hour: solarBirth.hour, minute: solarBirth.minute, gender: solarBirth.gender,
      };
      solar = getSolarEntry();
    }
    return calcNameRating(analysis, birthYearNum, birth, solar);
  }, [analysis, birthYear, solarBirth, useBaziBoost]);
  const exportReport = useMemo(
    () => (analysis ? createNamewuxingExportReport(analysis, wuxingStats, rating) : null),
    [analysis, rating, wuxingStats],
  );
  const reportMetadata = useMemo(() => createWorkspaceReportMetadata({
    moduleId: 'namewuxing',
    inputSummary: `已完成输入文字的五行与笔画结构分析；八字加权：${useBaziBoost ? '已启用' : '未启用'}；报告不记录姓名原文。`,
  }), [useBaziBoost]);

  return (
    <div className="space-y-6">
      {/* 头部说明 */}
      <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-jade-50">姓名五行</h2>
            <p className="text-sm text-jade-100/55">康熙笔画 · 五格剖象法 · 文化参考</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1 text-xs text-jade-400">
              民俗参考
            </span>
            <ExportReportButton module="姓名五行" report={exportReport} reportMetadata={reportMetadata} />
          </div>
        </div>
      </div>

      {/* 输入区 */}
      <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="grid gap-4 md:grid-cols-3">
          <ControlField label="姓氏" hint="支持复姓">
            <input
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              placeholder="如：张 / 司马"
              maxLength={2}
              className="w-full min-w-0 rounded-card border border-jade-500/20 bg-ink-900/80 px-3 py-2 text-sm text-jade-100/80 outline-none focus:border-jade-500/50"
            />
          </ControlField>
          <ControlField label="名字" hint="单字或双字">
            <input
              type="text"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              placeholder="如：伟 / 子涵"
              maxLength={2}
              className="w-full min-w-0 rounded-card border border-jade-500/20 bg-ink-900/80 px-3 py-2 text-sm text-jade-100/80 outline-none focus:border-jade-500/50"
            />
          </ControlField>
          <ControlField label="出生年" hint="可选，用于生肖契合度">
            <input
              type="number"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="如：1990"
              min={1900}
              max={2100}
              inputMode="numeric"
              className="w-full min-w-0 rounded-card border border-jade-500/20 bg-ink-900/80 px-3 py-2 text-sm text-jade-100/80 outline-none focus:border-jade-500/50"
            />
          </ControlField>
          <div className="flex items-center gap-2 self-end pb-1">
            <input
              type="checkbox"
              id="bazi-boost"
              checked={useBaziBoost}
              onChange={(e) => setUseBaziBoost(e.target.checked)}
              className="h-4 w-4 rounded border-jade-500/30 bg-ink-900 accent-jade-500"
            />
            <label htmlFor="bazi-boost" className="text-xs text-jade-100/60">
              用全局生辰算八字用神补强
              <span className="ml-1 text-jade-100/35">（看名字是否补益八字喜用神）</span>
            </label>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!surname.trim() || !givenName.trim()}
          className="mt-4 rounded-card bg-jade-500/20 px-4 py-2 text-sm font-medium text-jade-400 transition-colors hover:bg-jade-500/30 disabled:opacity-50"
        >
          分析五行
        </button>
      </div>

      {/* 分析结果 */}
      {analysis && (
        <div className="space-y-4">
          {/* 未收录提示 */}
          {analysis.hasUnrecorded && (
            <div className="rounded-card border border-gold-500/30 bg-gold-500/10 p-3 text-xs leading-5 text-gold-400">
              ⚠ 部分汉字未收录在内置康熙笔画表中，对应笔画为估算值（见下方字元列表标注）。如需精确结果，建议使用常见汉字或补充笔画数据。
            </div>
          )}

          {/* 字元笔画明细 */}
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-base font-semibold text-jade-50">字元笔画</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-xs text-jade-100/45">姓氏（{analysis.surnameChars.length} 字）</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.surnameChars.map((c, i) => (
                    <div key={i} className="w-28 rounded-card border border-white/8 bg-white/[0.03] px-3 py-2 text-center" title={c.meaning || undefined}>
                      <div className="font-serif text-lg text-jade-100/80">{c.char}</div>
                      <div className="mt-0.5 text-xs text-jade-100/55">
                        {c.strokes} 画 · 笔{c.wuxing}
                      </div>
                      {c.meaningWuxing && (
                        <div className="text-[10px] text-jade-300/70">字义{c.meaningWuxing}</div>
                      )}
                      {c.estimated && <div className="text-[10px] text-gold-400">估算</div>}
                      {c.meaning && (
                        <div className="mt-1 border-t border-white/5 pt-1 text-[10px] leading-4 text-jade-100/55 line-clamp-2">
                          {c.meaning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-jade-100/45">名字（{analysis.givenChars.length} 字）</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.givenChars.map((c, i) => (
                    <div key={i} className="w-28 rounded-card border border-white/8 bg-white/[0.03] px-3 py-2 text-center" title={c.meaning || undefined}>
                      <div className="font-serif text-lg text-jade-100/80">{c.char}</div>
                      <div className="mt-0.5 text-xs text-jade-100/55">
                        {c.strokes} 画 · 笔{c.wuxing}
                      </div>
                      {c.meaningWuxing && (
                        <div className="text-[10px] text-jade-300/70">字义{c.meaningWuxing}</div>
                      )}
                      {c.estimated && <div className="text-[10px] text-gold-400">估算</div>}
                      {c.meaning && (
                        <div className="mt-1 border-t border-white/5 pt-1 text-[10px] leading-4 text-jade-100/55 line-clamp-2">
                          {c.meaning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-between border-t border-white/5 pt-2 text-sm">
              <span className="text-jade-100/45">总笔画</span>
              <span className="font-semibold text-jade-100/80">{analysis.totalStrokes} 画</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* 五格数理 */}
            <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <h3 className="mb-3 text-base font-semibold text-jade-50">五格数理</h3>
              <div className="space-y-2">
                {analysis.wuGeEntries.map((e) => (
                  <div key={e.name} className="rounded-card border border-white/5 bg-white/[0.02] px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-10 text-sm font-semibold text-jade-100/70">{e.name}</span>
                        <span className="font-mono text-lg text-jade-100/80">{e.value}</span>
                        <span className="text-xs text-jade-100/45">{e.wuxing}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {e.femaleUnsuitable && (
                          <span className="rounded-full border border-cinnabar-500/25 bg-cinnabar-500/8 px-1.5 py-0.5 text-[10px] text-cinnabar-400" title="女性不宜此数">
                            女性不宜
                          </span>
                        )}
                        {e.maxLuck && (
                          <span className="rounded-full border border-gold-500/30 bg-gold-500/10 px-1.5 py-0.5 text-[10px] text-gold-400" title="最大好运数">
                            最大好运
                          </span>
                        )}
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${LUCK_COLOR[e.luck] ?? ''}`}>
                          {e.luck}
                        </span>
                      </div>
                    </div>
                    {e.skyNine && (
                      <div className="mt-1.5 flex items-baseline gap-2">
                        <span className="shrink-0 text-xs text-jade-300/70">{e.skyNine}</span>
                        <span className="text-[11px] leading-5 text-jade-100/45">{e.comment}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-jade-100/55">
                天格=姓笔画+1；人格=姓末字+名首字；地格=名笔画和（单名+1）；外格=总格-人格+1；总格=全名笔画和。九星名与数理详注来自 fate 大衍数表。
              </p>
            </div>

            {/* 三才配置 */}
            <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <h3 className="mb-3 text-base font-semibold text-jade-50">三才配置</h3>
              <div className="grid grid-cols-3 gap-2">
                {['天格', '人格', '地格'].map((label, i) => {
                  const wx = analysis.sanCai.config[i];
                  return (
                    <div key={label} className="rounded-card border border-white/8 bg-white/[0.03] p-3 text-center">
                      <div className="mb-1 text-xs text-jade-100/45">{label}</div>
                      <div className="font-serif text-2xl text-jade-300">{wx}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 rounded-card border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-jade-100/45">配置吉凶</span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${LUCK_COLOR[analysis.sanCai.luck] ?? 'text-jade-100/55'}`}>
                    {analysis.sanCai.luck}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-jade-100/55">{analysis.sanCai.desc}</p>
              </div>
            </div>
          </div>

          {/* 五维评分（fate P3 简化版） */}
          {rating && (
            <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument md:col-span-2">
              <div className="mb-4 flex items-center justify-between border-b border-white/8 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-jade-50">五维评分</h3>
                  <p className="mt-0.5 text-xs text-jade-100/45">五格30% · 三才15% · 五行平衡25% · 字义五行20% · 命理契合10%{useBaziBoost ? '（含八字用神补强）' : ''}</p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-3xl font-bold text-jade-400">{rating.totalScore}</div>
                  <div className="text-xs text-jade-300">{rating.grade}</div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-5">
                {rating.dimensions.map((d) => (
                  <div key={d.name} className="rounded-card border border-white/8 bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-jade-100/55">{d.name}</span>
                      <span className="font-mono text-xs text-jade-100/55">{Math.round(d.weight * 100)}%</span>
                    </div>
                    <div className="mt-1 font-mono text-xl font-semibold text-jade-300">{d.score}</div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-jade-500/60"
                        style={{ width: `${Math.max(4, d.score)}%` }}
                      />
                    </div>
                    <div className="mt-2 text-[10px] leading-4 text-jade-100/55">{d.detail}</div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-jade-100/55">{rating.confidenceNote}</p>
            </div>
          )}

          {/* 五行平衡（复用 FiveElementsChart） */}
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-base font-semibold text-jade-50">五行平衡</h3>
            <ZoomableSvg title="姓名五行平衡">
              <FiveElementsChart stats={wuxingStats} />
            </ZoomableSvg>
            <p className="mt-2 text-center text-[11px] text-jade-100/55">
              统计姓名各字五行分布；相生相克图供参考。
            </p>
          </div>
        </div>
      )}

      {/* 边界说明 */}
      <InterpretationCard title="使用说明" subtitle="文化参考">
        {analysis?.confidenceNote || '基于康熙字典笔画与五格剖象法推算；姓名学为传统文化参考，不构成命名决策依据。'}
      </InterpretationCard>
    </div>
  );
}
