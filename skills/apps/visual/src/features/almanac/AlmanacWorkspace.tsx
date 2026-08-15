import { useState, useEffect, useMemo } from 'react';
import { getAlmanacData, getSolarEntry, type AlmanacData } from '@/engine-api/calendar';
import { ControlField } from '@/components/shared/ControlField';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { createAlmanacExportReport } from '@/features/almanac/almanacExport';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';

/**
 * 每日黄历工作区
 * 基于内置 lunar-javascript 真实历法推算：干支、宜忌、彭祖百忌、吉神凶煞、
 * 神位方位、冲煞、时辰吉凶、纳音星宿。民俗参考，不做吉凶预测。
 */
export function AlmanacWorkspace() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [almanac, setAlmanac] = useState<AlmanacData | null>(null);
  
  useEffect(() => {
    setAlmanac(getAlmanacData(selectedDate, getSolarEntry() as never));
  }, [selectedDate]);

  const jiHours = useMemo(() => almanac?.hours.filter((h) => h.luck === '吉') ?? [], [almanac]);
  const xiongHours = useMemo(() => almanac?.hours.filter((h) => h.luck === '凶') ?? [], [almanac]);
  const reportMetadata = useMemo(() => createWorkspaceReportMetadata({
    moduleId: 'almanac',
    inputSummary: '已生成所选日期的黄历与日用民俗参考；报告不保留具体日期。',
  }), []);
  const exportReport = useMemo(() => {
    if (!almanac) return null;
    return {
      summary: `${almanac.solarDate}黄历参考。`,
      sections: [
        { heading: '日期信息', body: `公历：${almanac.solarDate}\n农历：${almanac.lunarDate}\n年柱：${almanac.yearGanZhi} · ${almanac.zodiac}年\n月柱：${almanac.monthGanZhi}\n日柱：${almanac.dayGanZhi} · ${almanac.dayNaYin}\n节气：${almanac.jieQi || '—'}\n冲煞：冲${almanac.chong} · 煞${almanac.sha}` },
        { heading: '宜与忌', body: `宜：${almanac.yi.join('、') || '—'}\n忌：${almanac.ji.join('、') || '—'}\n彭祖百忌：${almanac.pengZu}` },
        { heading: '吉神凶煞', body: `吉神宜趋：${almanac.jiShen.join('、') || '—'}\n凶煞宜忌：${almanac.xiongSha.join('、') || '—'}` },
        { heading: '方位与时辰', body: `喜神：${almanac.xiPosition}\n福神：${almanac.fuPosition}\n财神：${almanac.caiPosition}\n吉时：${jiHours.map((item) => item.ganZhi).join('、') || '—'}\n凶时：${xiongHours.map((item) => item.ganZhi).join('、') || '—'}` },
      ],
    };
  }, [almanac, jiHours, xiongHours]);

  return (
    <div className="space-y-6">
      {/* 头部说明 */}
      <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-jade-50">每日黄历</h2>
            <p className="text-sm text-jade-100/55">民俗参考 · 非预测结论</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-jade-500/25 bg-jade-500/10 px-3 py-1 text-xs text-jade-400">
              当日参考
            </span>
            <ExportReportButton
              module="每日黄历"
              report={exportReport ? createAlmanacExportReport({ source: exportReport }) : null}
              reportMetadata={reportMetadata}
            />
          </div>
        </div>
      </div>

      {/* 日期选择 */}
      <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <ControlField label="选择日期">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-card border border-jade-500/20 bg-ink-900/80 px-3 py-2 text-sm text-jade-100/80 outline-none focus:border-jade-500/50"
          />
        </ControlField>
      </div>

      {/* 加载中 / 错误 */}
            
      {/* 黄历内容 */}
      {almanac && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* 基本信息 */}
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-base font-semibold text-jade-50">基本信息</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-jade-100/45">公历</span>
                <span className="text-jade-100/80">{almanac.solarDate}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-jade-100/45">农历</span>
                <span className="text-jade-100/80">{almanac.lunarDate}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-jade-100/45">年柱</span>
                <span className="text-jade-100/80">{almanac.yearGanZhi} · {almanac.zodiac}年</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-jade-100/45">月柱</span>
                <span className="text-jade-100/80">{almanac.monthGanZhi}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-jade-100/45">日柱</span>
                <span className="text-jade-100/80">{almanac.dayGanZhi} · {almanac.dayNaYin}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-jade-100/45">日天神</span>
                <span className="text-jade-100/80">{almanac.dayTianShen} · {almanac.dayTianShenType}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-jade-100/45">二十八宿</span>
                <span className="text-jade-100/80">{almanac.dayXiu}</span>
              </div>
              {almanac.jieQi && (
                <div className="flex justify-between border-b border-white/5 py-2">
                  <span className="text-jade-100/45">节气</span>
                  <span className="text-jade-400">{almanac.jieQi}</span>
                </div>
              )}
              {almanac.festivals.length > 0 && (
                <div className="flex justify-between border-b border-white/5 py-2">
                  <span className="text-jade-100/45">节日</span>
                  <span className="text-jade-100/80">{almanac.festivals.join('、')}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-white/5 py-2">
                <span className="text-jade-100/45">冲煞</span>
                <span className="text-jade-100/80">冲{almanac.chong} · 煞{almanac.sha}</span>
              </div>
            </div>
          </div>

          {/* 宜忌 */}
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-base font-semibold text-jade-500">宜</h3>
              <span className="text-xs text-jade-100/45">适宜之事</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {almanac.yi.length > 0 ? almanac.yi.map((item) => (
                <span key={item} className="rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1 text-sm text-jade-400">
                  {item}
                </span>
              )) : <span className="text-sm text-jade-100/45">无</span>}
            </div>
            <div className="my-4 border-t border-white/5" />
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-base font-semibold text-cinnabar-500">忌</h3>
              <span className="text-xs text-jade-100/45">回避之事</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {almanac.ji.length > 0 ? almanac.ji.map((item) => (
                <span key={item} className="rounded-full border border-cinnabar-500/30 bg-cinnabar-500/10 px-3 py-1 text-sm text-cinnabar-400">
                  {item}
                </span>
              )) : <span className="text-sm text-jade-100/45">无</span>}
            </div>
            <div className="my-4 border-t border-white/5" />
            <div className="mb-2 flex items-center gap-3">
              <h4 className="text-sm font-semibold text-jade-100/70">彭祖百忌</h4>
            </div>
            <p className="text-sm leading-6 text-jade-100/55">{almanac.pengZu}</p>
          </div>

          {/* 吉神凶煞 */}
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-base font-semibold text-jade-50">吉神凶煞</h3>
            <div className="mb-3">
              <p className="mb-2 text-xs text-jade-100/45">吉神宜趋</p>
              <div className="flex flex-wrap gap-2">
                {almanac.jiShen.length > 0 ? almanac.jiShen.map((item) => (
                  <span key={item} className="rounded-full border border-jade-500/25 bg-jade-500/8 px-2.5 py-1 text-xs text-jade-300">
                    {item}
                  </span>
                )) : <span className="text-xs text-jade-100/45">无</span>}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-cinnabar-400/70">凶煞宜忌</p>
              <div className="flex flex-wrap gap-2">
                {almanac.xiongSha.length > 0 ? almanac.xiongSha.map((item) => (
                  <span key={item} className="rounded-full border border-cinnabar-500/25 bg-cinnabar-500/8 px-2.5 py-1 text-xs text-cinnabar-300">
                    {item}
                  </span>
                )) : <span className="text-xs text-jade-100/45">无</span>}
              </div>
            </div>
          </div>

          {/* 神位方位 */}
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-base font-semibold text-jade-50">神位方位</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between rounded-card border border-white/5 bg-white/[0.03] px-3 py-2">
                <span className="text-jade-100/45">喜神</span>
                <span className="text-jade-100/80">{almanac.xiPosition}</span>
              </div>
              <div className="flex justify-between rounded-card border border-white/5 bg-white/[0.03] px-3 py-2">
                <span className="text-jade-100/45">福神</span>
                <span className="text-jade-100/80">{almanac.fuPosition}</span>
              </div>
              <div className="flex justify-between rounded-card border border-white/5 bg-white/[0.03] px-3 py-2">
                <span className="text-jade-100/45">财神</span>
                <span className="text-jade-100/80">{almanac.caiPosition}</span>
              </div>
              <div className="flex justify-between rounded-card border border-white/5 bg-white/[0.03] px-3 py-2">
                <span className="text-jade-100/45">阳贵</span>
                <span className="text-jade-100/80">{almanac.yangGuiPosition}</span>
              </div>
              <div className="flex justify-between rounded-card border border-white/5 bg-white/[0.03] px-3 py-2">
                <span className="text-jade-100/45">阴贵</span>
                <span className="text-jade-100/80">{almanac.yinGuiPosition}</span>
              </div>
            </div>
          </div>

          {/* 时辰吉凶 */}
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument md:col-span-2">
            <h3 className="mb-3 text-base font-semibold text-jade-50">十二时辰吉凶</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {almanac.hours.map((h) => (
                <div
                  key={h.ganZhi}
                  className={`rounded-card border px-3 py-2 text-sm ${
                    h.luck === '吉'
                      ? 'border-jade-500/25 bg-jade-500/8'
                      : 'border-cinnabar-500/25 bg-cinnabar-500/8'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-jade-100/80">{h.ganZhi}</span>
                    <span className={`text-xs ${h.luck === '吉' ? 'text-jade-400' : 'text-cinnabar-400'}`}>
                      {h.label} · {h.luck}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-jade-100/45">
                    {h.tianShen} · {h.tianShenType}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-jade-100/55">
              吉时 {jiHours.length} 辰 · 凶时 {xiongHours.length} 辰；时辰宜忌仅作民俗参考。
            </p>
          </div>
        </div>
      )}

      {/* 使用说明（人话 disclaimer，不显示技术 confidenceNote） */}
      <InterpretationCard title="使用说明" subtitle="民俗参考">
        宜忌为传统民俗参考，不作为决策依据。
      </InterpretationCard>
    </div>
  );
}
