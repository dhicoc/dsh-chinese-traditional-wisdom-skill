/**
 * DataModeBadge — 数据模式人话提示（UX P0）
 *
 * 把技术标签 local-exact/fallback-demo/local-approx/demo 转成普通用户
 * 可读的提示，让用户知道当前看到的是真实排盘还是演示数据。
 */

interface DataModeBadgeProps {
  /** 引擎 mode 字段 */
  mode?: string;
  /** 是否 legacy 已就绪 */
  ready?: boolean;
}

interface ModeInfo {
  label: string;
  color: string;
  icon: string;
}

function getModeInfo(mode: string | undefined, ready: boolean | undefined): ModeInfo {
  if (!ready) {
    return { label: '正在生成结果…', color: 'text-jade-100/55 border-white/10 bg-white/[0.02]', icon: '◌' };
  }
  switch (mode) {
    case 'local-exact':
      return { label: '按出生资料排盘', color: 'text-jade-400 border-jade-500/30 bg-jade-500/10', icon: '✓' };
    case 'local-approx':
      return { label: '参考推算', color: 'text-jade-300 border-jade-500/25 bg-jade-500/8', icon: '≈' };
    case 'local':
      return { label: '传统方法参考', color: 'text-jade-300 border-jade-500/25 bg-jade-500/8', icon: '≈' };
    case 'fallback-demo':
    case 'demo':
      return { label: '请填写出生资料后查看命盘', color: 'text-gold-400 border-gold-500/30 bg-gold-500/10', icon: '⚠' };
    case 'derived':
      return { label: '综合整理', color: 'text-jade-100/55 border-white/10 bg-white/[0.03]', icon: '→' };
    case 'knowledge':
      return { label: '知识参考', color: 'text-jade-100/55 border-white/10 bg-white/[0.03]', icon: '📖' };
    case 'folk-experience':
      return { label: '民俗参考', color: 'text-jade-100/55 border-white/10 bg-white/[0.03]', icon: '民俗' };
    default:
      return { label: '状态暂不可识别', color: 'text-jade-100/55 border-white/10 bg-white/[0.03]', icon: '?' };
  }
}

export function DataModeBadge({ mode, ready }: DataModeBadgeProps) {
  const info = getModeInfo(mode, ready);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${info.color}`}>
      <span className="text-[10px]">{info.icon}</span>
      {info.label}
    </span>
  );
}
