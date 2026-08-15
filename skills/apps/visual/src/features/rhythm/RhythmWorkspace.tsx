import { useMemo, useState } from 'react';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { MeridianClock } from '@/components/shared/MeridianClock';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';
import {
  getMeridianByHour,
  MERIDIAN_HOURS,
  queryJieqiWellness,
  type MeridianHour,
  WUXING_COLORS,
} from '@/engine-api/rhythm';

/**
 * 每日节律工作区
 * 展示：
 *  - 子午流注圆形经络钟（12 时辰当令经络，当前时辰高亮）
 *  - 当前节气调养条带（24 节气饮食/起居/运动/穴位）
 *  - 十二时辰经络列表 + 选中详情
 */

// 获取当前时辰（首次渲染时取系统时间）
function useCurrentMeridian(): MeridianHour | null {
  const [sc] = useState(() => getMeridianByHour(new Date().getHours()));
  return sc ?? null;
}

export function RhythmWorkspace() {
  const currentShiChen = useCurrentMeridian();
  const [selectedShiChen, setSelectedShiChen] = useState<MeridianHour | null>(null);

  // 当前节气调养（近似，无 lunar-javascript 依赖；精确需 combo_daily_wellness）
  const jieqi = useMemo(() => {
    const d = new Date();
    return queryJieqiWellness({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
  }, []);
  const exportReport = useMemo(() => {
    const focusedShiChen = selectedShiChen ?? currentShiChen;
    return {
      summary: `${jieqi.jieqi}节气调养与十二时辰经络参考。`,
      sections: [
        { heading: '节气调养', body: `${jieqi.wellness.season}季 · ${jieqi.wellness.principle}\n${jieqi.wellness.feature}` },
        { heading: '日常建议', body: `饮食：${jieqi.wellness.diet}\n起居：${jieqi.wellness.lifestyle}\n运动：${jieqi.wellness.exercise}\n穴位：${jieqi.wellness.acupoints}` },
        ...(focusedShiChen ? [{ heading: '时辰养护', body: `${focusedShiChen.name}（${focusedShiChen.time}）\n当令经络：${focusedShiChen.meridian}\n对应脏腑：${focusedShiChen.organ}\n生理活动：${focusedShiChen.function}\n养生建议：${focusedShiChen.advice}` }] : []),
      ],
    };
  }, [currentShiChen, jieqi, selectedShiChen]);
  const reportMetadata = useMemo(() => createWorkspaceReportMetadata({
    moduleId: 'rhythm',
    inputSummary: '已生成通用节气与时辰节律参考；报告不保留具体日期、健康数据或其他个人输入。',
  }), []);

  return (
    <div className="space-y-6">
      {/* 头部说明 */}
      <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-jade-50">每日节律</h2>
            <p className="text-sm text-jade-100/55">子午流注经络钟 · 二十四节气调养</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-jade-500/30 bg-jade-500/10 px-3 py-1 text-xs text-jade-500">
              养生参考
            </span>
            <ExportReportButton module="每日节律" report={exportReport} reportMetadata={reportMetadata} />
          </div>
        </div>
      </div>

      {/* 当前节气调养条带 */}
      <div className="console-panel rounded-panel border border-gold-500/20 bg-gold-500/5 p-4 shadow-instrument">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <span className="text-xs text-gold-400/70">当前节气</span>
            <h3 className="text-xl font-bold text-gold-300">{jieqi.jieqi}</h3>
          </div>
          <span className="rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs text-gold-400">
            {jieqi.wellness.season}季 · {jieqi.wellness.principle}
          </span>
        </div>
        <p className="mb-3 text-xs text-gold-400/60">{jieqi.wellness.feature}</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-card border border-white/5 bg-ink-900/50 p-3">
            <h4 className="mb-1 text-sm text-gold-400/70">饮食</h4>
            <p className="text-xs leading-5 text-jade-100/75">{jieqi.wellness.diet}</p>
          </div>
          <div className="rounded-card border border-white/5 bg-ink-900/50 p-3">
            <h4 className="mb-1 text-sm text-gold-400/70">起居</h4>
            <p className="text-xs leading-5 text-jade-100/75">{jieqi.wellness.lifestyle}</p>
          </div>
          <div className="rounded-card border border-white/5 bg-ink-900/50 p-3">
            <h4 className="mb-1 text-sm text-gold-400/70">运动</h4>
            <p className="text-xs leading-5 text-jade-100/75">{jieqi.wellness.exercise}</p>
          </div>
          <div className="rounded-card border border-white/5 bg-ink-900/50 p-3">
            <h4 className="mb-1 text-sm text-gold-400/70">穴位</h4>
            <p className="text-xs leading-5 text-jade-100/75">{jieqi.wellness.acupoints}</p>
          </div>
        </div>
        <p className="mt-3 text-[10px] text-gold-400/40">
          节气调养为通用参考；针对性加减（结合个人体质）见「联合分析 · 今日养生建议」。
        </p>
      </div>

      {/* 经络钟 + 当前时辰 */}
      <div className="grid gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <h3 className="mb-3 text-base font-semibold text-jade-50">子午流注经络钟</h3>
          <ZoomableSvg title="子午流注经络钟">
            <MeridianClock
              current={currentShiChen}
              selected={selectedShiChen}
              onSelect={setSelectedShiChen}
            />
          </ZoomableSvg>
          <p className="mt-3 text-center text-[10px] text-jade-100/45">
            金色高亮为当前时辰，玉色为选中时辰。点击扇区查看详情。
          </p>
        </div>

        {/* 当前时辰详情 */}
        {currentShiChen && (
          <div className="console-panel rounded-panel border border-jade-500/30 bg-jade-500/5 p-4 shadow-instrument">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <span className="text-xs text-jade-500">当前时辰</span>
                <h3 className="text-2xl font-bold text-jade-50">{currentShiChen.name}</h3>
              </div>
              <div className="text-right">
                <div className="text-sm text-jade-100/55">{currentShiChen.time}</div>
                <div
                  className="mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium"
                  style={{
                    backgroundColor: `${WUXING_COLORS[currentShiChen.wuxing]}20`,
                    color: WUXING_COLORS[currentShiChen.wuxing],
                  }}
                >
                  {currentShiChen.wuxing} · {currentShiChen.meridian}
                </div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-card border border-white/5 bg-ink-900/50 p-3">
                <h4 className="mb-1 text-sm text-jade-100/55">生理活动</h4>
                <p className="text-sm text-jade-100/80">{currentShiChen.function}</p>
              </div>
              <div className="rounded-card border border-white/5 bg-ink-900/50 p-3">
                <h4 className="mb-1 text-sm text-jade-100/55">养生建议</h4>
                <p className="text-sm text-jade-500">{currentShiChen.advice}</p>
              </div>
            </div>
          </div>
        )}

        {/* 选中时辰详情 */}
        {selectedShiChen && (
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-jade-50">{selectedShiChen.name}</h3>
                <p className="text-sm text-jade-100/55">{selectedShiChen.time}</p>
              </div>
              <div
                className="rounded-full px-4 py-2 text-lg font-bold"
                style={{
                  backgroundColor: `${WUXING_COLORS[selectedShiChen.wuxing]}20`,
                  color: WUXING_COLORS[selectedShiChen.wuxing],
                }}
              >
                {selectedShiChen.wuxing}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-card border border-white/5 bg-ink-900/50 p-3">
                <h4 className="mb-1 text-sm text-jade-100/55">当令经络</h4>
                <p className="text-base font-medium text-jade-100/80">{selectedShiChen.meridian}</p>
              </div>
              <div className="rounded-card border border-white/5 bg-ink-900/50 p-3">
                <h4 className="mb-1 text-sm text-jade-100/55">对应脏腑</h4>
                <p className="text-base font-medium text-jade-100/80">{selectedShiChen.organ}</p>
              </div>
              <div className="rounded-card border border-white/5 bg-ink-900/50 p-3">
                <h4 className="mb-1 text-sm text-jade-100/55">生理功能</h4>
                <p className="text-sm text-jade-100/70">{selectedShiChen.function}</p>
              </div>
              <div className="rounded-card border border-jade-500/20 bg-jade-500/5 p-3">
                <h4 className="mb-1 text-sm text-jade-500">养生建议</h4>
                <p className="text-sm text-jade-400">{selectedShiChen.advice}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 时辰列表（紧凑网格，辅助钟面） */}
      <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <h3 className="mb-4 text-base font-semibold text-jade-50">十二时辰</h3>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-6">
          {MERIDIAN_HOURS.map((sc) => (
            <button
              key={sc.name}
              onClick={() => setSelectedShiChen(sc)}
              className={`rounded-card border p-3 text-left transition-all ${
                selectedShiChen?.name === sc.name
                  ? 'border-jade-500/50 bg-jade-500/10'
                  : 'border-jade-500/20 bg-ink-900/50 hover:border-jade-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-jade-100/80">{sc.name}</span>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: WUXING_COLORS[sc.wuxing] }}
                />
              </div>
              <div className="mt-1 text-xs text-jade-100/45">{sc.hours}时</div>
              <div className="mt-1 text-xs" style={{ color: WUXING_COLORS[sc.wuxing] }}>
                {sc.meridian}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 养生原则 */}
      <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <h3 className="mb-3 text-base font-semibold text-jade-50">养生节律原则</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-card border border-white/5 bg-ink-900/50 p-3">
            <h4 className="mb-2 text-sm font-medium text-jade-500">顺应天时</h4>
            <p className="text-xs text-jade-100/55">日出而作，日落而息。白天阳气盛宜活动，夜晚阴气盛宜休息。</p>
          </div>
          <div className="rounded-card border border-white/5 bg-ink-900/50 p-3">
            <h4 className="mb-2 text-sm font-medium text-jade-500">因时养生</h4>
            <p className="text-xs text-jade-100/55">不同时辰对应不同脏腑，在当令时辰养护对应脏腑效果最佳。</p>
          </div>
          <div className="rounded-card border border-white/5 bg-ink-900/50 p-3">
            <h4 className="mb-2 text-sm font-medium text-jade-500">平衡作息</h4>
            <p className="text-xs text-jade-100/55">保持规律作息，避免长期熬夜或饮食不节，维护气血正常运行。</p>
          </div>
        </div>
      </div>

      {/* 边界说明 */}
      <InterpretationCard title="使用说明" subtitle="养生参考">
        十二时辰养生理论源自《黄帝内经》经络学说，二十四节气调养源自中医顺时养生传统，均为传统中医养生参考。个人体质差异较大，如有健康问题请咨询专业医师。本工具仅供养生节律了解，不做医疗诊断。
      </InterpretationCard>
    </div>
  );
}
