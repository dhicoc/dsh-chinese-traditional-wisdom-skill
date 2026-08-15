import { useEffect, useMemo, useState } from 'react';
import { calculateYunqi } from '@/engine-api/yunqi';
import { getSolarEntry } from '@/engine-api/calendar';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { ControlField } from '@/components/shared/ControlField';
import { RadarChart, type RadarAxis } from '@/components/shared/RadarChart';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';
import { createConstitutionExportReport } from '@/features/constitution/constitutionExport';
import {
  calculateScoresFromAnswers,
  deriveDominantConstitution,
  getConstitutionTendency,
  type ConstitutionScores,
} from '@/engine-api/daily';
import { CONSTITUTION_TYPES } from '@/legacy/baseTypes';
import { QUESTIONNAIRE } from '@/legacy/constitutionQuestionnaire';
import { useBirth } from '@/lib/birthContext';

const DEFAULT_SCORES: ConstitutionScores = {
  平和质: 65, 气虚质: 45, 阳虚质: 30, 阴虚质: 25,
  痰湿质: 50, 湿热质: 35, 血瘀质: 20, 气郁质: 40, 特禀质: 15,
};

const SCORE_OPTIONS = [
  { value: 1, label: '没有' },
  { value: 2, label: '很少' },
  { value: 3, label: '有时' },
  { value: 4, label: '经常' },
  { value: 5, label: '总是' },
];

export function ConstitutionWorkspace() {
  const { solarBirth } = useBirth();
  const [scores, setScores] = useState<ConstitutionScores>(DEFAULT_SCORES);
  // 手动调分 draft（字符串态，允许清空/编辑中间态，blur 时提交）
  const [draftScores, setDraftScores] = useState<Record<string, string>>(
    () => Object.fromEntries(CONSTITUTION_TYPES.map((t) => [t, String(DEFAULT_SCORES[t])])) as Record<string, string>,
  );
  useEffect(() => {
    setDraftScores((prev) => {
      const next = { ...prev };
      for (const t of CONSTITUTION_TYPES) next[t] = String(scores[t]);
      return next;
    });
  }, [scores]);
  const commitScoreDraft = (type: string) => {
    const draft = draftScores[type] ?? '';
    const n = Number.parseInt(draft, 10);
    if (Number.isNaN(n) || draft.trim() === '') {
      setDraftScores((prev) => ({ ...prev, [type]: String(scores[type as keyof ConstitutionScores]) }));
      return;
    }
    setScores((prev) => ({ ...prev, [type]: Math.max(0, Math.min(100, n)) } as ConstitutionScores));
  };
  const [questionMode, setQuestionMode] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);

  const ready = true;

  // 五运六气体质倾向参考
  const yunqiTendency = useMemo(() => {
    if (!ready) return null;
    const yunqiResult = calculateYunqi({ year: solarBirth.year, birthMonth: solarBirth.month, birthDay: solarBirth.day, solar: getSolarEntry() });
    return getConstitutionTendency(yunqiResult as never);
  }, [ready, solarBirth]);

  const dominant = useMemo(() => deriveDominantConstitution(scores), [scores]);
  const radarAxes = useMemo<RadarAxis[]>(() => {
    return CONSTITUTION_TYPES.map((type) => ({ label: type, value: scores[type], max: 100 }));
  }, [scores]);
  const highlightIndex = useMemo(() => {
    if (!dominant) return undefined;
    const idx = CONSTITUTION_TYPES.indexOf(dominant);
    return idx >= 0 ? idx : undefined;
  }, [dominant]);

  const contextPayload = useMemo(() => ({
    体质评分: scores,
    主要体质: dominant,
    医疗提示: '体质辨识仅作中医文化参考，不替代医疗诊断。',
  }), [scores, dominant]);
  const exportReport = useMemo(createConstitutionExportReport, []);
  const reportMetadata = useMemo(() => createWorkspaceReportMetadata({
    moduleId: 'tizhi',
    inputSummary: '已完成体质倾向评分；报告不包含问卷答案、症状或其他健康数据。',
  }), []);

  // 问卷答题
  const handleAnswer = (questionKey: string, score: number) => {
    setAnswers((prev) => ({ ...prev, [questionKey]: score }));
  };

  const calculateFromAnswers = () => {
    const flatAnswers: { type: string; score: number }[] = [];
    for (const group of QUESTIONNAIRE) {
      for (let i = 0; i < group.questions.length; i++) {
        const key = `${group.type}-${i}`;
        const ans = answers[key];
        if (ans) flatAnswers.push({ type: group.type, score: ans });
      }
    }
    if (flatAnswers.length === 0) return;
    const newScores = calculateScoresFromAnswers(flatAnswers);
    setScores(newScores as ConstitutionScores);
    setQuestionMode(false);
  };

  const activeGroup = QUESTIONNAIRE[activeGroupIdx];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = QUESTIONNAIRE.reduce((s, g) => s + g.questions.length, 0);

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">体质辨识</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              基于中华中医药学会《中医体质分类与判定》标准问卷自评，结合五运六气出生年倾向参考。体质评分由问卷驱动，非生辰推算。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="tizhi" title="体质辨识摘要" payload={contextPayload} />
            <ExportReportButton module="体质辨识" report={exportReport} reportMetadata={reportMetadata} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
        <aside className="space-y-4">
          {/* 模式切换 */}
          <div className="flex gap-2 rounded-card border border-white/8 bg-white/[0.02] p-1">
            <button
              type="button"
              onClick={() => setQuestionMode(true)}
              className={`flex-1 rounded-card px-3 py-2 text-xs font-medium transition ${questionMode ? 'bg-jade-500/15 text-jade-300' : 'text-jade-100/45 hover:text-jade-100'}`}
            >
              问卷模式
            </button>
            <button
              type="button"
              onClick={() => setQuestionMode(false)}
              className={`flex-1 rounded-card px-3 py-2 text-xs font-medium transition ${!questionMode ? 'bg-jade-500/15 text-jade-300' : 'text-jade-100/45 hover:text-jade-100'}`}
            >
              手动调整
            </button>
          </div>

          {/* 问卷模式 */}
          {questionMode ? (
            <div className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
              {/* 体质分组选择 */}
              <div className="flex flex-wrap gap-1.5">
                {QUESTIONNAIRE.map((g, i) => (
                  <button
                    key={g.type}
                    type="button"
                    onClick={() => setActiveGroupIdx(i)}
                    className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                      i === activeGroupIdx
                        ? 'border border-jade-500/40 bg-jade-500/12 text-jade-300'
                        : 'border border-white/8 text-jade-100/45 hover:text-jade-100'
                    }`}
                  >
                    {g.type}
                  </button>
                ))}
              </div>

              {/* 当前体质的问题 */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-serif text-base font-semibold text-jade-100">{activeGroup.type}</h3>
                  <p className="mt-0.5 text-xs text-jade-100/55">调养方向：{activeGroup.direction} · 食疗：{activeGroup.diet}</p>
                </div>
                {activeGroup.questions.map((q, qi) => {
                  const key = `${activeGroup.type}-${qi}`;
                  return (
                    <div key={key} className="rounded-card border border-white/5 bg-white/[0.02] p-3">
                      <p className="text-sm text-jade-100/70">{q}</p>
                      <div className="mt-2 flex gap-1.5">
                        {SCORE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleAnswer(key, opt.value)}
                            className={`rounded-card px-2.5 py-1 text-xs transition ${
                              answers[key] === opt.value
                                ? 'border border-jade-500/40 bg-jade-500/15 text-jade-300'
                                : 'border border-white/8 text-jade-100/55 hover:text-jade-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 进度 + 导航 */}
              <div className="space-y-2 border-t border-white/5 pt-3">
                <p className="text-xs text-jade-100/55">已答 {answeredCount}/{totalQuestions} 题</p>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveGroupIdx(Math.max(0, activeGroupIdx - 1))}
                    disabled={activeGroupIdx === 0}
                    className="rounded-card border border-white/10 px-3 py-1.5 text-xs text-jade-100/55 transition hover:text-jade-100 disabled:opacity-30"
                  >
                    上一组
                  </button>
                  {activeGroupIdx < QUESTIONNAIRE.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setActiveGroupIdx(activeGroupIdx + 1)}
                      className="rounded-card border border-jade-500/30 bg-jade-500/10 px-3 py-1.5 text-xs text-jade-400 transition hover:bg-jade-500/20"
                    >
                      下一组
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={calculateFromAnswers}
                      disabled={answeredCount === 0}
                      className="rounded-card border border-jade-500/40 bg-jade-500/15 px-3 py-1.5 text-xs font-medium text-jade-300 transition hover:bg-jade-500/25 disabled:opacity-30"
                    >
                      计算体质 →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* 手动调整模式 */
            <div className="space-y-3 rounded-panel border border-ink-700 bg-black/24 p-4">
              <p className="text-xs text-jade-100/45">手动微调各体质评分（0-100）：</p>
              {CONSTITUTION_TYPES.map((type) => (
                <ControlField key={type} label={type}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    inputMode="numeric"
                    value={draftScores[type] ?? ''}
                    onChange={(e) => setDraftScores((prev) => ({ ...prev, [type]: e.target.value }))}
                    onBlur={() => commitScoreDraft(type)}
                    className="w-full min-w-0 rounded-card border border-jade-500/20 bg-ink-900/80 px-3 py-2 text-sm text-jade-100/80 outline-none focus:border-jade-500/50"
                  />
                </ControlField>
              ))}
            </div>
          )}

          {/* 五运六气倾向参考 */}
          {yunqiTendency && yunqiTendency.tendencies.length > 0 && (
            <div className="rounded-card border border-gold-500/20 bg-gold-500/5 p-4">
              <h3 className="text-sm font-semibold text-gold-400">五运六气体质倾向参考</h3>
              <p className="mt-1 text-xs text-gold-400/60">
                出生年：{yunqiTendency.dayun} · 司天{yunqiTendency.sitian}
              </p>
              <div className="mt-2 space-y-1.5">
                {yunqiTendency.tendencies.map((t) => (
                  <div key={t.type} className="text-xs">
                    <span className="font-medium text-gold-400/80">{t.type}</span>
                    <span className="ml-2 text-jade-100/45">{t.reason}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-4 text-gold-400/40">{yunqiTendency.note}</p>
            </div>
          )}
        </aside>

        {/* 雷达图 + 结果 */}
        <div className="space-y-4">
          <div className="rounded-panel border border-ink-700 bg-ink-850/60 p-4">
            <div className="mb-3 flex items-center justify-between border-b border-white/8 pb-2">
              <h3 className="font-serif text-sm font-semibold text-jade-100/70">九种体质雷达图</h3>
            </div>
            <ZoomableSvg title="九种体质雷达图">
              <RadarChart axes={radarAxes} highlightIndex={highlightIndex} title="九种体质雷达图" />
            </ZoomableSvg>
            <p className="mt-3 text-center text-[10px] text-jade-100/55">
              体质评分基于问卷自评，非生辰推算；金色顶点为主要体质。
            </p>
          </div>

          {/* 主体质 + 调养建议 */}
          {dominant && (
            <div className="rounded-panel border border-ink-700 bg-ink-850/60 p-4">
              <div className="mb-3 flex items-center gap-3 border-b border-white/8 pb-2">
                <span className="text-xs text-jade-100/45">主要体质</span>
                <span className="font-serif text-xl font-semibold text-jade-400">{dominant}</span>
              </div>
              {(() => {
                const group = QUESTIONNAIRE.find((g) => g.type === dominant);
                if (!group) return null;
                return (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-card border border-white/5 bg-white/[0.02] p-3">
                      <p className="text-xs text-jade-100/45">调养方向</p>
                      <p className="mt-1 text-sm text-jade-100/80">{group.direction}</p>
                    </div>
                    <div className="rounded-card border border-white/5 bg-white/[0.02] p-3">
                      <p className="text-xs text-jade-100/45">食疗参考</p>
                      <p className="mt-1 text-sm text-jade-100/80">{group.diet}</p>
                    </div>
                    <div className="rounded-card border border-white/5 bg-white/[0.02] p-3">
                      <p className="text-xs text-jade-100/45">穴位保健</p>
                      <p className="mt-1 text-sm text-jade-100/80">{group.acupoints}</p>
                    </div>
                  </div>
                );
              })()}
              <p className="mt-3 rounded-card border border-cinnabar-500/20 bg-cinnabar-500/5 p-2 text-[11px] leading-5 text-cinnabar-400/60">
                以上调养建议仅供参考，具体请咨询中医师。体质可随季节、年龄、环境变化而转变。
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
