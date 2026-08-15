import { getModuleById } from '@/lib/modules';
import type { AgentRoute } from '@/lib/agentRouter';
import type { BirthData } from '@/legacy/birthBridge';

interface AgentConfirmPanelProps {
  route: AgentRoute;
  onConfirm: () => void;
  onCancel: () => void;
}

function birthSummary(patch: Partial<BirthData>): string {
  const parts: string[] = [];
  if (patch.year || patch.month || patch.day) {
    const y = patch.year ?? '?';
    const m = String(patch.month ?? '?').padStart(2, '0');
    const d = String(patch.day ?? '?').padStart(2, '0');
    parts.push(`${y}-${m}-${d}`);
  }
  if (typeof patch.hour === 'number') parts.push(String(patch.hour).padStart(2, '0') + ':00');
  if (patch.gender) parts.push(patch.gender);
  if (patch.isLunar === true) parts.push('农历');
  else if (patch.isLunar === false) parts.push('公历');
  return parts.join(' · ');
}

export function AgentConfirmPanel({ route, onConfirm, onCancel }: AgentConfirmPanelProps) {
  const target = getModuleById(route.module);

  return (
    <div
      data-testid="agent-confirm-panel"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[12vh] backdrop-blur-sm ct-animate-fade-in"
      onClick={onCancel}
    >
      <div
        data-testid="agent-confirm-card"
        className="w-full max-w-xl overflow-hidden rounded-panel border border-jade-500/30 bg-ink-850/95 shadow-2xl ct-animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-jade-400">✦</span>
            <h2 className="text-sm font-semibold text-jade-50">工具建议确认</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            data-testid="agent-confirm-cancel-top"
            className="rounded border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] text-jade-100/45 hover:text-jade-100"
          >
            ESC
          </button>
        </div>

        {/* 解析结果 */}
        <div className="space-y-3 px-4 py-4 text-sm">
          <div data-testid="agent-confirm-target" className="rounded-card border border-jade-500/25 bg-jade-500/8 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-400">目标工具</p>
            <p className="mt-1 text-lg font-semibold text-jade-50">{target.title}</p>
            <p className="mt-1 text-xs text-jade-100/55">{route.reason}</p>
          </div>

          {route.question && (
            <div data-testid="agent-confirm-question" className="rounded-card border border-white/8 bg-black/24 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-100/45">识别问题</p>
              <p className="mt-1 text-jade-100">{route.question}</p>
            </div>
          )}

          {route.birthPatch && (
            <div data-testid="agent-confirm-birth" className="rounded-card border border-gold-500/25 bg-gold-500/8 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-400">将更新全局生辰</p>
              <p className="mt-1 font-mono text-jade-100">{birthSummary(route.birthPatch)}</p>
            </div>
          )}

          {(route.liuyao || route.meihua || route.reader) && (
            <div data-testid="agent-confirm-extra" className="rounded-card border border-white/8 bg-black/24 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-100/45">附加操作</p>
              <ul className="mt-1 space-y-1 text-xs text-jade-100/70">
                {route.liuyao && <li>六爻起卦：{route.liuyao.method ?? 'coin'}{route.liuyao.question ? ' · ' + route.liuyao.question : ''}</li>}
                {route.meihua && <li>梅花排盘：{route.meihua.method === 'number' ? `数字 ${route.meihua.numberA ?? '?'}/${route.meihua.numberB ?? '?'}` : route.meihua.method === 'yarrow' ? '揲蓍法' : '时间起卦'}</li>}
                {route.reader && <li>古籍搜索：{route.reader.term}</li>}
              </ul>
            </div>
          )}

          {route.alternatives && route.alternatives.length > 0 && (
            <div data-testid="agent-confirm-alternatives" className="rounded-card border border-white/8 bg-black/24 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-jade-100/45">其他可能适用</p>
              <ul className="mt-1 space-y-1 text-xs text-jade-100/70">
                {route.alternatives.map((alt) => (
                  <li key={alt.module}>· {getModuleById(alt.module).title}（{alt.reason}）</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs leading-5 text-jade-100/40">
            确认后将跳转到「{target.title}」，并带入已填写的信息。
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-2 border-t border-white/8 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            data-testid="agent-confirm-cancel"
            className="rounded-card border border-white/10 bg-black/30 px-4 py-2 text-xs text-jade-100/60 transition hover:text-jade-100"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="agent-confirm-execute"
            className="rounded-card border border-jade-500/45 bg-jade-500/20 px-4 py-2 text-xs font-semibold text-jade-50 transition hover:bg-jade-500/30 active:scale-[0.98]"
          >
            确认执行
          </button>
        </div>
      </div>
    </div>
  );
}
