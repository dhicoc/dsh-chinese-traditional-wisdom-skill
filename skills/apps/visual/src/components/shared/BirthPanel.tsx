import { useEffect, useState } from 'react';
import { useBirth } from '@/lib/birthContext';
import { dispatchCivilTimeFallbackIntent } from '@/lib/commandIntents';
import { ControlField } from '@/components/shared/ControlField';
import { DEFAULT_BIRTH } from '@/legacy/birthBridge';

/**
 * 全局出生资料面板 — 同步到旧 FORTUNE 全局数据。
 * 放在 CommandBar 下方，所有工作区共享同一份出生资料。
 * UX P0：默认生辰时自动展开 + 高亮提示，引导新用户先填生辰。
 */
export function BirthPanel() {
  const { birth, baziTimeStatus, legacyReady, updateBirth, resetBirth } = useBirth();

  // 判断是否仍为默认生辰（用户未修改过）
  const isDefaultBirth =
    birth.year === DEFAULT_BIRTH.year &&
    birth.month === DEFAULT_BIRTH.month &&
    birth.day === DEFAULT_BIRTH.day &&
    birth.hour === DEFAULT_BIRTH.hour &&
    birth.gender === DEFAULT_BIRTH.gender;

  // 默认生辰时自动展开，引导用户修改。
  // expandedOnce：默认即展开过，避免修改生辰数据（如+1年）使 isDefaultBirth 变 false 时意外折叠。
  const [userToggled, setUserToggled] = useState(false);
  const [userToggledHidden, setUserToggledHidden] = useState(false);
  const [expandedOnce] = useState(true);
  const expanded = userToggledHidden ? false : (userToggled || isDefaultBirth || expandedOnce);

  // 数字字段 draft（字符串态）：允许输入框清空/编辑中间态，blur 时再提交
  const [draftYear, setDraftYear] = useState(String(birth.year));
  const [draftMonth, setDraftMonth] = useState(String(birth.month));
  const [draftDay, setDraftDay] = useState(String(birth.day));
  const [draftHour, setDraftHour] = useState(String(birth.hour));
  const [draftMinute, setDraftMinute] = useState(String(birth.minute));
  // birth 外部变化（reset / 路由跳转）时同步回 draft
  useEffect(() => { setDraftYear(String(birth.year)); }, [birth.year]);
  useEffect(() => { setDraftMonth(String(birth.month)); }, [birth.month]);
  useEffect(() => { setDraftDay(String(birth.day)); }, [birth.day]);
  useEffect(() => { setDraftHour(String(birth.hour)); }, [birth.hour]);
  useEffect(() => { setDraftMinute(String(birth.minute)); }, [birth.minute]);

  /** blur 时把 draft 提交为 number；空或非法时回退到当前 birth 值 */
  const commitDraft = (field: 'year' | 'month' | 'day' | 'hour' | 'minute', draft: string, fallback: number) => {
    const n = Number.parseInt(draft, 10);
    if (Number.isNaN(n) || draft.trim() === '') {
      // 回退：把 draft 复位回当前 birth 值
      if (field === 'year') setDraftYear(String(birth.year));
      else if (field === 'month') setDraftMonth(String(birth.month));
      else if (field === 'day') setDraftDay(String(birth.day));
      else if (field === 'hour') setDraftHour(String(birth.hour));
      else setDraftMinute(String(birth.minute));
      return;
    }
    updateBirth({ [field]: n } as Partial<typeof birth>);
    void fallback;
  };

  const summary = `${birth.year}-${String(birth.month).padStart(2, '0')}-${String(birth.day).padStart(2, '0')} ${String(birth.hour).padStart(2, '0')}:${String(birth.minute).padStart(2, '0')} ${birth.gender} ${birth.isLunar ? '农历' : '公历'}`;

  const handleToggle = () => {
    if (isDefaultBirth && !userToggledHidden && !userToggled) {
      // 首次点击（默认展开状态）→ 收起
      setUserToggledHidden(true);
    } else {
      setUserToggled(!userToggled);
      setUserToggledHidden(false);
    }
  };

  return (
    <div className={`rounded-panel p-3 transition ${
      isDefaultBirth
        ? 'border border-gold-500/30 bg-gold-500/5 shadow-[0_0_20px_rgb(var(--gold)/0.08)]'
        : 'border border-ink-700 bg-ink-850/60'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleToggle}
          className="flex min-w-0 items-center gap-2 text-left text-sm text-jade-100/70 transition hover:text-jade-100"
        >
          <span className="font-mono text-xs text-jade-400">{expanded ? '▾' : '▸'}</span>
          <span className="shrink-0 font-semibold">全局生辰</span>
          <span className="truncate text-jade-100/45">{summary}</span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${legacyReady ? 'border-jade-500/25 bg-jade-500/10 text-jade-400' : 'border-white/10 bg-ink-700/50 text-jade-100/30'}`}>
            {legacyReady ? '已更新' : '准备中'}
          </span>
          {expanded && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('确定重置生辰为默认值（1990-06-15 12时 男）？')) {
                  resetBirth();
                }
              }}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-jade-100/55 transition hover:text-jade-100"
            >
              重置
            </button>
          )}
        </div>
      </div>

      {/* 默认生辰提示 */}
      {isDefaultBirth && (
        <div className="mt-2 flex items-center gap-2 rounded-card border border-gold-500/20 bg-gold-500/8 px-3 py-2">
          <span className="text-gold-400">⚠</span>
          <span className="text-xs text-gold-400/80">
            当前为默认生辰（1990-06-15），请修改为您的真实出生信息以查看真实排盘结果。
          </span>
        </div>
      )}

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* 年月日时：2×2 网格，数字字段宽够清晰 */}
          <div className="grid grid-cols-2 gap-2">
            <ControlField
              label="年"
              ariaLabel="全局出生年"
              type="number"
              min={1900}
              max={2100}
              inputMode="numeric"
              value={draftYear}
              onChange={(e) => setDraftYear(e.target.value)}
              onBlur={() => commitDraft('year', draftYear, birth.year)}
            />
            <ControlField
              label="月"
              ariaLabel="全局出生月"
              type="number"
              min={1}
              max={12}
              inputMode="numeric"
              value={draftMonth}
              onChange={(e) => setDraftMonth(e.target.value)}
              onBlur={() => commitDraft('month', draftMonth, birth.month)}
            />
            <ControlField
              label="日"
              ariaLabel="全局出生日"
              type="number"
              min={1}
              max={31}
              inputMode="numeric"
              value={draftDay}
              onChange={(e) => setDraftDay(e.target.value)}
              onBlur={() => commitDraft('day', draftDay, birth.day)}
            />
            <ControlField
              label="时"
              ariaLabel="全局出生时"
              type="number"
              min={0}
              max={23}
              inputMode="numeric"
              value={draftHour}
              onChange={(e) => setDraftHour(e.target.value)}
              onBlur={() => commitDraft('hour', draftHour, birth.hour)}
            />
            <ControlField
              label="分"
              ariaLabel="全局出生分"
              type="number"
              min={0}
              max={59}
              inputMode="numeric"
              value={draftMinute}
              onChange={(e) => setDraftMinute(e.target.value)}
              onBlur={() => commitDraft('minute', draftMinute, birth.minute)}
            />
          </div>

          {/* 性别 + 历法：同一行，左右各半 */}
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs text-jade-100/45">
              <span>性别</span>
              <select
                value={birth.gender}
                onChange={(e) => updateBirth({ gender: e.target.value as '男' | '女' })}
                className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
              >
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-jade-100/45">历法</span>
              <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-black/30 p-0.5 self-start">
                <button
                  type="button"
                  onClick={() => updateBirth({ isLunar: false })}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${!birth.isLunar ? 'bg-jade-500/20 text-jade-300' : 'text-jade-100/40 hover:text-jade-100/60'}`}
                >
                  公历
                </button>
                <button
                  type="button"
                  onClick={() => updateBirth({ isLunar: true })}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${birth.isLunar ? 'bg-jade-500/20 text-jade-300' : 'text-jade-100/40 hover:text-jade-100/60'}`}
                >
                  农历
                </button>
              </div>
            </div>
          </div>

          {/* 精确节气：单独一行 */}
          <label className="flex items-center gap-2 text-xs text-jade-100/55">
            <input
              type="checkbox"
              checked={birth.useExactCalendar}
              onChange={(e) => updateBirth({ useExactCalendar: e.target.checked })}
              className="h-3.5 w-3.5 accent-jade-500"
            />
            精确节气
          </label>

          <section className="rounded-card border border-white/10 bg-black/15 px-3 py-2" aria-label="八字真太阳时状态">
            <p className="text-xs font-medium text-jade-100/70">八字真太阳时</p>
            {baziTimeStatus.status === 'true-solar-verified' && (
              <p className="mt-2 text-[11px] leading-5 text-jade-300/80">
                已完成真太阳时核验，排盘采用校正后的出生时间。
              </p>
            )}
            {baziTimeStatus.status === 'awaiting-agent-verification' && (
              <p className="mt-2 text-[11px] leading-5 text-jade-100/45">
                请提供可定位的出生地，以核对地点、历史时区与夏令时；完成核验后将以校正后的出生时间排盘。
              </p>
            )}
            {baziTimeStatus.status === 'civil-unverified' && (
              <p className="mt-2 text-[11px] leading-5 text-gold-300/80">
                未完成真太阳时复核：已按您确认的民用出生记录排盘，不应称为真太阳时结果。
              </p>
            )}
            {baziTimeStatus.status === 'awaiting-agent-verification' && (
              <button
                type="button"
                onClick={() => dispatchCivilTimeFallbackIntent()}
                className="mt-2 rounded-full border border-gold-500/30 px-2.5 py-1 text-[10px] text-gold-300 transition hover:bg-gold-500/10"
              >
                确认按民用时间排盘
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
