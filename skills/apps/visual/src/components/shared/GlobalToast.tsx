import { useEffect, useRef, useState } from 'react';
import { COMMAND_FEEDBACK_EVENT, type CommandFeedbackDetail } from '@/lib/commandIntents';

/**
 * GlobalToast — 全局操作反馈 toast（UX P1）
 *
 * 监听 COMMAND_FEEDBACK_EVENT，在页面底部居中显示反馈提示。
 * 所有工作区通过 dispatchCommandFeedback() 触发，统一交互反馈。
 *
 * 入场：fade-in（key 变化触发重挂载播放入场动画）。
 * 退场：先切到 leaving 态 opacity-0 过渡 180ms，再卸载，避免硬切。
 */
export function GlobalToast() {
  const [toast, setToast] = useState<(CommandFeedbackDetail & { _id: number }) | null>(null);
  const [leaving, setLeaving] = useState(false);
  const idRef = useRef(0);
  const hideTimer = useRef<number | undefined>(undefined);
  const leaveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    function handleFeedback(event: Event) {
      const detail = (event as CustomEvent<CommandFeedbackDetail>).detail;
      window.clearTimeout(hideTimer.current);
      window.clearTimeout(leaveTimer.current);
      setLeaving(false);
      setToast({ ...detail, _id: ++idRef.current });
      // 2.6s 后开始退场过渡
      hideTimer.current = window.setTimeout(() => {
        setLeaving(true);
        // 180ms 淡出后卸载
        leaveTimer.current = window.setTimeout(() => setToast(null), 180);
      }, 2600);
    }
    window.addEventListener(COMMAND_FEEDBACK_EVENT, handleFeedback);
    return () => {
      window.removeEventListener(COMMAND_FEEDBACK_EVENT, handleFeedback);
      window.clearTimeout(hideTimer.current);
      window.clearTimeout(leaveTimer.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      key={toast._id}
      className={`pointer-events-none fixed bottom-6 left-1/2 z-[10000] -translate-x-1/2 rounded-full border px-5 py-2.5 text-sm shadow-[0_12px_40px_rgb(var(--shadow-rgb)/0.5)] backdrop-blur-md transition-opacity duration-200 ${
        leaving ? 'opacity-0' : 'opacity-100'
      } ct-animate-fade-in ${
        toast.tone === 'success'
          ? 'border-jade-500/30 bg-ink-900/95 text-jade-300'
          : 'border-white/10 bg-ink-900/95 text-jade-100/70'
      }`}
    >
      <span className="font-semibold">{toast.title}</span>
      {toast.description && <span className="ml-2 text-jade-100/45">{toast.description}</span>}
    </div>
  );
}
