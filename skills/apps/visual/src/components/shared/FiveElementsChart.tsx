import { useMemo } from 'react';

/**
 * FiveElementsChart — 五行相生相克 SVG 图（Phase 10 图表替换）
 *
 * 替代八字工作区的 legacy Canvas `bazi.renderWuxing`。五边形 5 顶点按
 * 相生循环排列（木→火→土→金→水），相邻边为相生（带箭头虚线），隔点
 * 连线为相克（带箭头实线），顶点圆圈显示该五行计数。配色对齐 legacy
 * CORE.wuxingColor / wuxingColorLight / wuxingColorDark。
 */

export interface FiveElementsStats {
  木: number;
  火: number;
  土: number;
  金: number;
  水: number;
}

interface FiveElementsChartProps {
  stats: FiveElementsStats;
  /** viewBox 宽（方形绘图区），默认 420 */
  size?: number;
}

// 相生循环顺序：木→火→土→金→水→木
const WUXING_ORDER = ['木', '火', '土', '金', '水'] as const;

// 配色对齐 legacy CORE.wuxingColor / Light / Dark
const WX_COLOR: Record<string, string> = {
  金: 'var(--wz-metal)', 木: 'var(--wz-wood)', 水: 'var(--wz-water)', 火: 'var(--wz-fire)', 土: 'var(--wz-earth)',
};
const WX_COLOR_LIGHT: Record<string, string> = {
  金: 'var(--chart-surface)', 木: 'var(--chart-inset)', 水: 'var(--chart-band)', 火: 'var(--chart-bg)', 土: 'var(--chart-deep)',
};
const WX_COLOR_DARK: Record<string, string> = {
  金: 'var(--wz-metal)', 木: 'var(--wz-wood)', 水: 'var(--wz-water)', 火: 'var(--wz-fire)', 土: 'var(--wz-earth)',
};

// 箭头标记 id 前缀，避免多实例冲突
let arrowSeq = 0;

export function FiveElementsChart({ stats, size = 420 }: FiveElementsChartProps) {
  const arrowId = useMemo(() => `wx-arrow-${++arrowSeq}`, []);

  const cx = size / 2;
  const cy = size / 2 - 6;
  const outerR = size * 0.36;
  const vertexR = 26;

  // 5 顶点：正上方起始，顺时针，每 72°
  const pts = useMemo(
    () =>
      WUXING_ORDER.map((wx, i) => {
        const angle = ((i * 72 - 90) * Math.PI) / 180;
        return {
          wx,
          x: cx + outerR * Math.cos(angle),
          y: cy + outerR * Math.sin(angle),
          idx: i,
        };
      }),
    [cx, cy, outerR],
  );

  const maxVal = Math.max(1, ...WUXING_ORDER.map((wx) => stats[wx] ?? 0));

  // 相生：相邻顶点 i → i+1
  const shengEdges = pts.map((p, i) => {
    const to = pts[(i + 1) % 5];
    const mx = (p.x + to.x) / 2;
    const my = (p.y + to.y) / 2;
    return { from: p, to, mx, my, color: WX_COLOR[to.wx] };
  });

  // 相克：隔点 i → i+2
  const keEdges = pts.map((p, i) => {
    const to = pts[(i + 2) % 5];
    const mx = (p.x + to.x) / 2;
    const my = (p.y + to.y) / 2;
    return { from: p, to, mx, my };
  });

  return (
    <svg
      data-testid="five-elements-chart"
      viewBox={`0 0 ${size} ${size + 40}`}
      className="mx-auto block h-auto w-full max-w-[460px]"
      role="img"
      aria-label="五行相生相克图"
    >
      <defs>
        <marker
          id={`${arrowId}-sheng`}
          markerWidth="9"
          markerHeight="9"
          refX="7"
          refY="4.5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L9,4.5 L0,9 Z" fill="rgb(var(--gold) / 0.7)" />
        </marker>
        <marker
          id={`${arrowId}-ke`}
          markerWidth="9"
          markerHeight="9"
          refX="7"
          refY="4.5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L9,4.5 L0,9 Z" fill="var(--wz-fire)" />
        </marker>
      </defs>

      {/* 外五边形辅助线 */}
      <polygon
        points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="rgb(var(--gold) / 0.18)"
        strokeWidth={1}
        strokeDasharray="4 4"
      />

      {/* 相克连线（隔点，先画在底层） */}
      {keEdges.map((e, i) => (
        <line
          key={`ke-${i}`}
          x1={e.from.x}
          y1={e.from.y}
          x2={e.to.x}
          y2={e.to.y}
          stroke="var(--wz-fire)"
          strokeWidth={1.5}
          strokeOpacity={0.45}
          markerEnd={`url(#${arrowId}-ke)`}
        />
      ))}

      {/* 相生连线（相邻边，虚线带箭头） */}
      {shengEdges.map((e, i) => (
        <line
          key={`sheng-${i}`}
          x1={e.from.x}
          y1={e.from.y}
          x2={e.to.x}
          y2={e.to.y}
          stroke="rgb(var(--gold) / 0.55)"
          strokeWidth={2}
          strokeDasharray="5 4"
          markerEnd={`url(#${arrowId}-sheng)`}
        />
      ))}

      {/* 相生 / 相克 标签 */}
      {shengEdges.map((e, i) => (
        <text
          key={`sheng-label-${i}`}
          x={e.mx}
          y={e.my - 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--chart-text-faint)"
          style={{ fontSize: 10 }}
        >
          生
        </text>
      ))}
      {keEdges.map((e, i) => (
        <text
          key={`ke-label-${i}`}
          x={e.mx}
          y={e.my - 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--c-cinnabar-deep)"
          style={{ fontSize: 10 }}
        >
          克
        </text>
      ))}

      {/* 顶点圆圈 + 计数 + 五行标签 */}
      {pts.map((p) => {
        const count = stats[p.wx] ?? 0;
        const color = WX_COLOR[p.wx];
        const light = WX_COLOR_LIGHT[p.wx];
        const dark = WX_COLOR_DARK[p.wx];
        const labelY = p.y + vertexR + 16;
        return (
          <g key={p.wx}>
            <circle cx={p.x} cy={p.y} r={vertexR} fill={light} stroke={color} strokeWidth={2.5}>
              <title>{p.wx}：{count}</title>
            </circle>
            <text
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={dark}
              style={{ fontSize: 20, fontWeight: 700 }}
            >
              {count}
            </text>
            <text
              x={p.x}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={color}
              style={{ fontSize: 17, fontWeight: 700 }}
            >
              {p.wx}
            </text>
          </g>
        );
      })}

      {/* 中心文字 */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--c-gold)"
        style={{ fontSize: 13, fontWeight: 700, pointerEvents: 'none' }}
      >
        <tspan x={cx} dy="-0.6em">五行</tspan>
        <tspan x={cx} dy="1.2em">平衡</tspan>
      </text>

      {/* 图例 */}
      <g transform={`translate(0, ${size + 14})`}>
        <line
          x1={cx - 150}
          y1={10}
          x2={cx - 90}
          y2={10}
          stroke="rgb(var(--gold) / 0.55)"
          strokeWidth={2}
          strokeDasharray="5 4"
        />
        <text x={cx - 70} y={10} textAnchor="start" dominantBaseline="middle" fill="var(--c-gold)" style={{ fontSize: 11 }}>
          相生
        </text>
        <line x1={cx + 10} y1={10} x2={cx + 70} y2={10} stroke="var(--wz-fire)" strokeWidth={1.5} />
        <text x={cx + 90} y={10} textAnchor="start" dominantBaseline="middle" fill="var(--c-cinnabar-deep)" style={{ fontSize: 11 }}>
          相克
        </text>
      </g>

      {/* 隐性最大值，供比例参考（不显示，保留给后续增强） */}
      <metadata>{`max=${maxVal}`}</metadata>
    </svg>
  );
}
