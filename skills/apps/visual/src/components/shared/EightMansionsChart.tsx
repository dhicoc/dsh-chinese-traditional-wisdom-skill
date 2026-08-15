import type { EightMansionsGrid, EightMansionSector } from '@/legacy/canvasRenderers';

/**
 * EightMansionsChart — 八宅大游年 SVG 命盘（Phase 10 图表替换）
 *
 * 替代八宅工作区的 legacy Canvas `renderEightMansions`。8 方向扇区（每 45°）
 * 按吉凶配色，每扇区显示方向名、游年星、吉凶、含义；中心圆显示命卦符号
 * 与卦名、命组。配色对齐 legacy `MANSION_COLORS`。
 */

interface EightMansionsChartProps {
  grid: EightMansionsGrid;
  year: number;
  gender: string;
  size?: number;
}

// 八宅吉凶颜色（对齐 legacy fengshui.js MANSION_COLORS）
const MANSION_COLORS: Record<string, string> = {
  大吉: 'var(--wz-wood)',
  吉: 'var(--chart-good-soft)',
  中性: 'var(--chart-text-faint)',
  次凶: 'var(--wz-earth)',
  凶: 'var(--wz-fire)',
  大凶: 'var(--c-cinnabar-deep)',
};

// 平行 triplet 映射：用于 rgb(var(--triplet) / alpha) 形式的 alpha 背景
// 吉类→--wood（兜底），凶类→--cinnabar/-700（精确），中性→--spirit（兜底）
const MANSION_TRIPLET: Record<string, string> = {
  大吉: '--wood',
  吉: '--wood',
  中性: '--spirit',
  次凶: '--earth',
  凶: '--cinnabar',
  大凶: '--cinnabar-700',
};

/** 将 hex 颜色转为指定透明度的 rgba（用于扇区低透明背景） */
function hexAlpha(hex: string, alpha: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 生成环形扇区 path（北=0° 顺时针数学角度，SVG 坐标 y 向下） */
function sectorPath(cx: number, cy: number, rIn: number, rOut: number, deg: number): string {
  // 每扇区跨 45°，居中于 deg
  const startDeg = deg - 22.5 - 90; // -90 把北转到上方
  const endDeg = deg + 22.5 - 90;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + rOut * Math.cos(toRad(startDeg));
  const y1 = cy + rOut * Math.sin(toRad(startDeg));
  const x2 = cx + rOut * Math.cos(toRad(endDeg));
  const y2 = cy + rOut * Math.sin(toRad(endDeg));
  const x3 = cx + rIn * Math.cos(toRad(endDeg));
  const y3 = cy + rIn * Math.sin(toRad(endDeg));
  const x4 = cx + rIn * Math.cos(toRad(startDeg));
  const y4 = cy + rIn * Math.sin(toRad(startDeg));
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 0 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/** 径向文字：沿扇区中线方向放置。返回 x/y 与旋转角度。
 *  南半圈（90°~270°）文字会倒置，需 +180° 让字正过来；切勿同时反转字符，
 *  否则 rotate 与 reverse 叠加会产生镜像。 */
function radialLabel(cx: number, cy: number, deg: number, r: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);
  const flip = deg > 90 && deg < 270;
  const rotate = flip ? deg + 180 : deg;
  return { x, y, rotate };
}

export function EightMansionsChart({ grid, year, gender, size = 500 }: EightMansionsChartProps) {
  const W = size;
  const H = size;
  const cx = W / 2;
  const cy = H / 2;
  const ringIn = 75;
  // 顶部留出标题带，避免扇区顶部与标题文字重叠
  const ringOut = Math.min(W, H) / 2 - 40;

  const masterColor = MANSION_COLORS['大吉'] || 'var(--wz-wood)';

  return (
    <svg
      data-testid="eight-mansions-chart"
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block h-auto w-full max-w-[520px]"
      role="img"
      aria-label={`八宅命盘 ${grid.trigram}卦 ${grid.group}`}
    >
      {/* 标题 */}
      <text x={cx} y={18} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text)" style={{ fontSize: 15, fontWeight: 700 }}>
        八宅命盘 — {year}年 {gender}命
      </text>

      {/* 8 方向扇区 */}
      {grid.sectors.map((s: EightMansionSector) => {
        const color = MANSION_COLORS[s.luck] || 'var(--chart-text-faint)';
        const triplet = MANSION_TRIPLET[s.luck] || '--spirit';
        const dirLabel = radialLabel(cx, cy, s.deg, ringIn + 18);
        const starLabel = radialLabel(cx, cy, s.deg, ringIn + 52);
        const luckLabel = radialLabel(cx, cy, s.deg, ringIn + 84);
        const meaningLabel = radialLabel(cx, cy, s.deg, ringIn + 116);
        return (
          <g key={s.direction}>
            {/* 扇区背景 */}
            <path
              d={sectorPath(cx, cy, ringIn, ringOut, s.deg)}
              fill={`rgb(var(${triplet}) / 0.18)`}
              stroke="var(--chart-line)"
              strokeWidth={0.6}
            />
            {/* 方向名 */}
            <g transform={`translate(${dirLabel.x.toFixed(2)} ${dirLabel.y.toFixed(2)}) rotate(${dirLabel.rotate})`}>
              <text textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text)" style={{ fontSize: 13, fontWeight: 700 }}>
                {s.direction}
              </text>
            </g>
            {/* 游年星名（大字） */}
            <g transform={`translate(${starLabel.x.toFixed(2)} ${starLabel.y.toFixed(2)}) rotate(${starLabel.rotate})`}>
              <text textAnchor="middle" dominantBaseline="middle" fill={color} style={{ fontSize: 16, fontWeight: 700 }}>
                {s.star}
              </text>
            </g>
            {/* 吉凶 */}
            <g transform={`translate(${luckLabel.x.toFixed(2)} ${luckLabel.y.toFixed(2)}) rotate(${luckLabel.rotate})`}>
              <text textAnchor="middle" dominantBaseline="middle" fill={color} style={{ fontSize: 11 }}>
                {`【${s.luck}】`}
              </text>
            </g>
            {/* 含义（小字） */}
            <g transform={`translate(${meaningLabel.x.toFixed(2)} ${meaningLabel.y.toFixed(2)}) rotate(${meaningLabel.rotate})`}>
              <text textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-mid)" style={{ fontSize: 10 }}>
                {s.meaning}
              </text>
            </g>
          </g>
        );
      })}

      {/* 扇区环边框 */}
      <circle cx={cx} cy={cy} r={ringOut} fill="none" stroke="var(--chart-line-faint)" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={ringIn} fill="none" stroke="var(--chart-line-faint)" strokeWidth={1} />

      {/* 分隔线（每 45°） */}
      {grid.sectors.map((s) => {
        const rad = ((s.deg - 90 + 22.5) * Math.PI) / 180;
        return (
          <line
            key={`sep-${s.direction}`}
            x1={cx + ringIn * Math.cos(rad)}
            y1={cy + ringIn * Math.sin(rad)}
            x2={cx + ringOut * Math.cos(rad)}
            y2={cy + ringOut * Math.sin(rad)}
            stroke="var(--chart-line)"
            strokeWidth={0.5}
          />
        );
      })}

      {/* 中心：命卦 */}
      <circle cx={cx} cy={cy} r={52} fill="var(--chart-surface)" stroke={masterColor} strokeWidth={3} />
      <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle" fill={masterColor} style={{ fontSize: 28, fontWeight: 700 }}>
        {grid.trigramSymbol}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text)" style={{ fontSize: 13 }}>
        {grid.trigram}
      </text>
      <text x={cx} y={cy + 32} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-faint)" style={{ fontSize: 11 }}>
        {grid.group}
      </text>
    </svg>
  );
}
