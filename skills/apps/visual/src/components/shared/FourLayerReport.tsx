import { useState } from 'react';
import { getReportMetadataItems, type ReportMetadata } from '@/legacy/reportMetadata';
import { DEFAULT_TRADITIONAL_DISCLAIMER, toSemanticReport, type LayerReport, type SemanticReport, type Tone, type ActionCategory, type Strength } from '@/legacy/reportLayers';

/**
 * FourLayerReport — 报告四层显式分层渲染组件（ROADMAP 功能层增强 Step 2）
 *
 * 把 toReading()/export_snapshot 经 toFourLayer 归类后，按四层展示：
 *   1. tldr        — 一句话总结 + 总体吉凶徽章
 *   2. highlights  — 关键亮点/风险点（吉=绿/凶=红/中=灰）
 *   3. details     — 详细分析 + 古典依据（可折叠）
 *   4. actions     — 可执行建议（按 category 分组）
 *
 * 兼容旧平铺 sections：toFourLayer 无命中时全放 details，本组件照常渲染。
 */

const TONE_STYLE: Record<Tone, { label: string; border: string; bg: string; text: string }> = {
  吉: { label: '吉', border: 'border-jade-500/40', bg: 'bg-jade-500/12', text: 'text-jade-300' },
  凶: { label: '凶', border: 'border-cinnabar-500/40', bg: 'bg-cinnabar-500/12', text: 'text-cinnabar-300' },
  中: { label: '中', border: 'border-white/15', bg: 'bg-white/5', text: 'text-jade-100/55' },
};

/** 强弱标识样式（独立于吉凶，日主强弱等中性信息用） */
const STRENGTH_STYLE: Record<Exclude<Strength, null>, { label: string; text: string; border: string }> = {
  强: { label: '身强', text: 'text-gold-300', border: 'border-gold-500/40' },
  弱: { label: '身弱', text: 'text-cyan-300', border: 'border-cyan-500/40' },
};

const CATEGORY_LABEL: Record<ActionCategory, string> = {
  生活调整: '生活调整',
  养生: '养生',
  心性: '心性修行',
  择吉: '择吉时机',
  决策: '决策策略',
};

const CATEGORY_STYLE: Record<ActionCategory, string> = {
  生活调整: 'border-jade-500/25 bg-jade-500/8 text-jade-300',
  养生: 'border-gold-500/25 bg-gold-500/8 text-gold-300',
  心性: 'border-purple-500/25 bg-purple-500/8 text-purple-300',
  择吉: 'border-cinnabar-500/25 bg-cinnabar-500/8 text-cinnabar-300',
  决策: 'border-jade-500/30 bg-jade-500/10 text-jade-200',
};

interface FourLayerReportProps {
  report: LayerReport;
  semanticReport?: SemanticReport | null;
  /** 标题（如"八字四层报告"） */
  title?: string;
  /** 计算状态或时间来源提示 */
  notices?: string[];
  /** 用户应知的限制与注意事项 */
  warnings?: string[];
  /** 与 HTML 导出共用的受控报告信息 */
  reportMetadata?: ReportMetadata;
  /** 默认是否展开 details，默认 false */
  defaultDetailsOpen?: boolean;
}

export function FourLayerReport({ report, semanticReport, title, notices = [], warnings = [], reportMetadata, defaultDetailsOpen = false }: FourLayerReportProps) {
  const [detailsOpen, setDetailsOpen] = useState(defaultDetailsOpen);
  const toneStyle = TONE_STYLE[report.overallTone];
  const resolvedSemanticReport = semanticReport ?? toSemanticReport({
    summary: report.tldr,
    tags: report.tags,
    sections: [
      ...report.highlights.map(({ label, value }) => ({ heading: label, body: value })),
      ...report.details,
      ...(report.actions.length ? [{ heading: '行动建议', body: report.actions.map((action) => action.text).join('。') }] : []),
    ],
  }, {
    disclaimers: [DEFAULT_TRADITIONAL_DISCLAIMER],
  });
  const disclaimers = resolvedSemanticReport.disclaimers;

  // actions 按 category 分组
  const actionGroups = new Map<ActionCategory, string[]>();
  for (const a of report.actions) {
    const arr = actionGroups.get(a.category) ?? [];
    arr.push(a.text);
    actionGroups.set(a.category, arr);
  }

  return (
    <section className="space-y-3">
      {title && <h4 className="text-sm font-semibold text-jade-100">{title}</h4>}

      {reportMetadata && (
        <div className="rounded-card border border-jade-500/30 bg-jade-500/8 px-3 py-2.5">
          <p className="text-xs font-semibold text-jade-300">本次分析口径</p>
          <dl className="mt-2 space-y-1.5 text-xs leading-5 text-jade-100/75">
            {getReportMetadataItems(reportMetadata).map(({ label, value }) => (
              <div key={label} className="flex gap-2">
                <dt className="shrink-0 text-jade-100/50">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {notices.length > 0 && (
        <div className="rounded-card border border-gold-500/30 bg-gold-500/8 px-3 py-2.5">
          <p className="text-xs font-semibold text-gold-300">计算状态</p>
          <ul className="mt-1 space-y-1 text-xs leading-5 text-jade-100/75">
            {notices.map((notice) => <li key={notice}>· {notice}</li>)}
          </ul>
        </div>
      )}

      {resolvedSemanticReport.facts.length ? (
        <div className="rounded-card border border-jade-500/30 bg-jade-500/8 px-3 py-2.5">
          <p className="text-xs font-semibold text-jade-300">结构化事实核对</p>
          <p className="mt-1 text-xs leading-5 text-jade-100/60">以下内容已与本次推算结果核对；不包含传统解释、建议或现实效果判断。</p>
          <dl className="mt-2 space-y-1.5 text-xs leading-5 text-jade-100/75">
            {resolvedSemanticReport.facts.map((fact) => (
              <div key={`${fact.tool}-${fact.label}`} className="flex gap-2">
                <dt className="shrink-0 text-jade-100/50">{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {warnings.length > 0 && (
        <div className="rounded-card border border-cinnabar-500/25 bg-cinnabar-500/8 px-3 py-2.5">
          <p className="text-xs font-semibold text-cinnabar-300">使用限制与注意事项</p>
          <ul className="mt-1 space-y-1 text-xs leading-5 text-jade-100/75">
            {warnings.map((warning) => <li key={warning}>· {warning}</li>)}
          </ul>
        </div>
      )}

      {disclaimers.length > 0 && (
        <div className="rounded-card border border-gold-500/30 bg-gold-500/8 px-3 py-2.5">
          <p className="text-xs font-semibold text-gold-300">免责声明</p>
          <ul className="mt-1 space-y-1 text-xs leading-5 text-jade-100/75">
            {disclaimers.map((disclaimer) => <li key={disclaimer}>· {disclaimer}</li>)}
          </ul>
        </div>
      )}

      {/* 第一层：tldr + 总体吉凶 */}
      <div className={`rounded-card border ${toneStyle.border} ${toneStyle.bg} p-3.5`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-6 text-jade-50">{report.tldr}</p>
          <span className={`shrink-0 rounded-full border ${toneStyle.border} ${toneStyle.bg} px-2.5 py-1 text-[11px] font-semibold ${toneStyle.text}`}>
            {toneStyle.label}
          </span>
        </div>
      </div>

      {/* 第二层：highlights 亮点/风险（单列全宽，与 tldr 对齐） */}
      {report.highlights.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-jade-100/55">值得留意的方向</p>
          <div className="space-y-2">
            {report.highlights.map((h, i) => {
              const hs = TONE_STYLE[h.tone];
              const ss = h.strength ? STRENGTH_STYLE[h.strength] : null;
              return (
                <div key={i} className={`rounded-card border ${hs.border} ${hs.bg} px-3 py-2`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-jade-100/70">{h.label}</span>
                    <div className="flex items-center gap-1">
                      {ss && (
                        <span className={`rounded-full border ${ss.border} bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold ${ss.text}`}>
                          {ss.label}
                        </span>
                      )}
                      {/* tone 徽章只在非"中"时显示（"中"是默认态，省略避免与强弱标混淆） */}
                      {h.tone !== '中' && (
                        <span className={`text-[10px] font-semibold ${hs.text}`}>{hs.label}</span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-jade-100/65">{h.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 第三层：details 详细分析（可折叠） */}
      {report.details.length > 0 && (
        <div className="rounded-card border border-white/8 bg-black/30 p-3">
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-medium text-jade-100/55 transition hover:text-jade-100/80"
          >
            <span>查看传统解释</span>
            <span>{detailsOpen ? '收起 ▲' : '展开 ▼'}</span>
          </button>
          {detailsOpen && (
            <dl className="mt-2.5 space-y-2.5">
              {report.details.map((d, i) => (
                <div key={i} className="rounded-card bg-black/40 px-3 py-2">
                  <dt className="text-xs text-jade-100/55">{d.heading}</dt>
                  <dd className="mt-1 whitespace-pre-line text-xs leading-5 text-jade-100/70">{d.body}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      {/* 第四层：actions 可执行建议（按 category 分组） */}
      {report.actions.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-jade-100/55">可执行建议</p>
          <div className="space-y-2">
            {Array.from(actionGroups.entries()).map(([category, items]) => (
              <div key={category} className={`rounded-card border ${CATEGORY_STYLE[category]} px-3 py-2`}>
                <p className="text-xs font-semibold">{CATEGORY_LABEL[category]}</p>
                <ul className="mt-1 space-y-1 text-xs leading-5 text-jade-100/70">
                  {items.map((text, i) => (
                    <li key={i}>· {text}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* sourceNotes 不渲染给用户（属技术来源说明，如 lunar-javascript/口径差异）。
          disclaimer 由各工作区自己的使用说明卡负责。sourceNotes 字段保留供 AI contextPayload 使用。 */}
    </section>
  );
}
