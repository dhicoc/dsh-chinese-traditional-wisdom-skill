/**
 * BaziPillarsChart — 八字四柱 SVG 主盘（Phase 10，重设计 v2）
 *
 * 设计口径对齐 TASTE_SKILL_UI「Academic Dark Mode」与其它 SVG 组件
 * (RadarChart/ZiweiPalaceGrid)：暗色卡片底 + 低饱和五行色 + 衬线大字。
 *
 * 每柱结构：柱标签 → 天干格（衬线大字 + 左侧五行色竖条）→ 地支格
 * （同上）→ 藏干行（五行色点 + 小字）。日柱以金色竖条 + 柔和高亮边框
 * 标识。五行色采用 TASTE_SKILL_UI 低饱和 token，而非 Material 鲜艳色。
 */

import type { BaziPillars } from '@/legacy/canvasRenderers';
import type { ShenShaItem } from '@/legacy/shensha';

interface BaziPillarsChartProps {
  pillars: BaziPillars;
  size?: number;
  /** 神煞（按柱位分组标注在盘面，可选） */
  shenSha?: ShenShaItem[];
  activeShenShaPillar?: '年' | '月' | '日' | '时' | null;
  onSelectShenShaPillar?: (pillar: '年' | '月' | '日' | '时') => void;
}

// 天干 → 五行（对齐 legacy CORE.stemWuxing）
const STEM_WUXING: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

// 地支 → 五行（对齐 legacy CORE.branchWuxing）
const BRANCH_WUXING: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

// 五行低饱和色（对齐 TASTE_SKILL_UI 五行 token）
const WX_COLOR: Record<string, string> = {
  木: 'var(--wz-wood)',
  火: 'var(--wz-fire)',
  土: 'var(--wz-earth)',
  金: 'var(--wz-metal)',
  水: 'var(--wz-water)',
};

// 五行浅色（用于极轻底纹，保持暗主题基调）
const WX_TINT: Record<string, string> = {
  木: 'rgb(var(--wood) / 0.10)',
  火: 'rgb(var(--cinnabar) / 0.10)',
  土: 'rgb(var(--earth) / 0.10)',
  金: 'rgb(var(--metal) / 0.08)',
  水: 'rgb(var(--water) / 0.18)',
};

function stemWuxing(stem: string): string {
  return STEM_WUXING[stem] ?? '';
}
function branchWuxing(branch: string): string {
  return BRANCH_WUXING[branch] ?? '';
}

const DAY_ACCENT = 'var(--c-gold)'; // 日柱金色点缀

export function BaziPillarsChart({
  pillars,
  size = 620,
  shenSha,
  activeShenShaPillar,
  onSelectShenShaPillar,
}: BaziPillarsChartProps) {
  const W = size;
  const H = 500;

  const colCount = 4;
  const cellW = 132;
  const cellGap = 20;
  const stemH = 128;
  const branchH = 128;
  const colContentH = stemH + 10 + branchH;
  const totalW = colCount * cellW + (colCount - 1) * cellGap;
  const startX = (W - totalW) / 2;
  const startY = 64;

  const cols = [
    { label: '年柱', data: pillars.year },
    { label: '月柱', data: pillars.month },
    { label: '日柱', data: pillars.day, isDay: true },
    { label: '时柱', data: pillars.hour },
  ];

  // 神煞按柱位分组：{ '年': [...], '月': [...], '日': [...], '时': [...] }
  const shenShaByPillar: Record<string, ShenShaItem[]> = { 年: [], 月: [], 日: [], 时: [] };
  if (shenSha) {
    for (const s of shenSha) {
      (shenShaByPillar[s.pillar] ??= []).push(s);
    }
  }
  // 柱标签 → pillar 键映射（年柱→年，月柱→月，日柱→日，时柱→时）
  const pillarKeyOf = (label: string): string => label.charAt(0);

  return (
    <svg
      data-testid="bazi-pillars-chart"
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block h-auto w-full max-w-[660px]"
      role="img"
      aria-label="八字四柱主盘"
    >
      <defs>
        <linearGradient id="bazi-bg-v2" x1="0" y1="0" x2={0} y2={H}>
          <stop offset="0" stopColor="var(--chart-surface)" />
          <stop offset="1" stopColor="var(--chart-bg)" />
        </linearGradient>
        <linearGradient id="bazi-day-tint" x1="0" y1="0" x2={0} y2={1}>
          <stop offset="0" stopColor="rgb(var(--gold) / 0.14)" />
          <stop offset="1" stopColor="rgb(var(--gold) / 0.04)" />
        </linearGradient>
      </defs>

      {/* 背景 */}
      <rect x={0} y={0} width={W} height={H} rx={12} fill="url(#bazi-bg-v2)" stroke="rgb(var(--jade) / 0.16)" strokeWidth={1} />

      {/* 标题 */}
      <text x={W / 2} y={26} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text)" style={{ fontSize: 16, fontWeight: 700, letterSpacing: 2 }}>
        八字四柱
      </text>
      <line x1={W / 2 - 40} y1={40} x2={W / 2 + 40} y2={40} stroke="rgb(var(--jade) / 0.35)" strokeWidth={1} />

      {/* 逐柱 */}
      {cols.map((col, i) => {
        const d = col.data;
        if (!d) return null;
        const x = startX + i * (cellW + cellGap);
        const stemWx = stemWuxing(d.stem);
        const branchWx = branchWuxing(d.branch);
        const stemColor = WX_COLOR[stemWx] ?? 'var(--chart-text-mid)';
        const stemTint = WX_TINT[stemWx] ?? 'transparent';
        const branchColor = WX_COLOR[branchWx] ?? 'var(--chart-text-mid)';
        const branchTint = WX_TINT[branchWx] ?? 'transparent';
        const accent = col.isDay ? DAY_ACCENT : null;

        const branchY = startY + stemH + 10;
        const hiddenY = branchY + branchH + 22;
        const hidden = d.hidden ?? [];
        const barW = 4;

        return (
          <g key={col.label}>
            {/* 柱标签 */}
            <text x={x + cellW / 2} y={startY - 16} textAnchor="middle" dominantBaseline="middle" fill={accent ?? 'var(--chart-text-faint)'} style={{ fontSize: 11, fontWeight: accent ? 700 : 400, letterSpacing: 1 }}>
              {col.label}
            </text>

            {/* 天干格 */}
            <rect x={x} y={startY} width={cellW} height={stemH} rx={8} fill={accent ? 'url(#bazi-day-tint)' : stemTint} stroke={accent ?? 'rgb(var(--jade) / 0.22)'} strokeWidth={accent ? 1.5 : 1} />
            {/* 左侧五行色竖条 */}
            <rect x={x} y={startY + 8} width={barW} height={stemH - 16} rx={2} fill={stemColor} />
            {/* 五行小标（右上角） */}
            <text x={x + cellW - 10} y={startY + 12} textAnchor="end" dominantBaseline="middle" fill={stemColor} style={{ fontSize: 9, fontWeight: 600, opacity: 0.7 }}>
              {stemWx}
            </text>
            {/* 天干大字（衬线） */}
            <text x={x + cellW / 2 + 4} y={startY + stemH / 2 + 2} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text)" style={{ fontSize: 48, fontWeight: 700, fontFamily: '"Noto Serif SC","SimSun","KaiTi",serif' }}>
              {d.stem}
            </text>

            {/* 地支格 */}
            <rect x={x} y={branchY} width={cellW} height={branchH} rx={8} fill={branchTint} stroke={accent ?? 'rgb(var(--jade) / 0.22)'} strokeWidth={accent ? 1.5 : 1} />
            <rect x={x} y={branchY + 8} width={barW} height={branchH - 16} rx={2} fill={branchColor} />
            <text x={x + cellW - 10} y={branchY + 12} textAnchor="end" dominantBaseline="middle" fill={branchColor} style={{ fontSize: 9, fontWeight: 600, opacity: 0.7 }}>
              {branchWx}
            </text>
            <text x={x + cellW / 2 + 4} y={branchY + branchH / 2 + 2} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text)" style={{ fontSize: 48, fontWeight: 700, fontFamily: '"Noto Serif SC","SimSun","KaiTi",serif' }}>
              {d.branch}
            </text>

            {/* 藏干行：五行色点 + 小字横排 */}
            {hidden.length > 0 && (
              <g>
                {hidden.map((h, hi) => {
                  const hw = cellW - 16;
                  const slot = hw / hidden.length;
                  const hx = x + 8 + slot * hi + slot / 2;
                  const hwColor = WX_COLOR[stemWuxing(h)] ?? 'var(--chart-text-mid)';
                  return (
                    <g key={hi}>
                      <circle cx={hx - slot / 2 + 4} cy={hiddenY + 8} r={3} fill={hwColor} />
                      <text x={hx + 2} y={hiddenY + 8} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-sub)" style={{ fontSize: 11, fontFamily: '"Noto Serif SC","SimSun",serif' }}>
                        {h}
                      </text>
                    </g>
                  );
                })}
                <text x={x + cellW / 2} y={hiddenY + 24} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-line-faint)" style={{ fontSize: 8 }}>
                  藏干
                </text>
              </g>
            )}

            {/* 神煞行：按柱位索引，完整明细在主盘下方呈现 */}
            {(() => {
              const pillar = pillarKeyOf(col.label) as '年' | '月' | '日' | '时';
              const ss = shenShaByPillar[pillar] ?? [];
              if (ss.length === 0) return null;
              const selected = pillar === activeShenShaPillar;
              const sealX = x + 8;
              const sealY = hiddenY + 46;
              const sealW = cellW - 16;
              const select = () => onSelectShenShaPillar?.(pillar);
              return (
                <g
                  role="button"
                  tabIndex={0}
                  aria-label={`${col.label}神煞，${ss.length} 项`}
                  aria-pressed={selected}
                  onClick={select}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      select();
                    }
                  }}
                  style={{ cursor: onSelectShenShaPillar ? 'pointer' : 'default' }}
                >
                  <rect
                    x={sealX}
                    y={sealY}
                    width={sealW}
                    height={26}
                    rx={4}
                    fill={selected ? 'rgb(var(--cinnabar) / 0.16)' : 'rgb(var(--cinnabar) / 0.06)'}
                    stroke={selected ? 'rgb(var(--cinnabar) / 0.72)' : 'rgb(var(--cinnabar) / 0.32)'}
                  />
                  <text x={sealX + sealW / 2} y={sealY + 14} textAnchor="middle" dominantBaseline="middle" fill="rgb(var(--cinnabar) / 0.9)" style={{ fontSize: 10, fontWeight: 600 }}>
                    神煞 {ss.length}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}
