/**
 * HexagramChart — 六爻卦画 SVG 组件（Phase 10 图表替换）
 *
 * 替代六爻工作区的 legacy Canvas `renderLiuyao`。逐爻绘制六神(左)、
 * 爻线(中)、动爻标记、地支+六亲(右)、世应标签；底部卦名与用神。
 *
 * 爻序遵循六爻传统：上爻在顶、初爻在底（lines 数组为初爻→上爻，
 * 渲染时反向排列）。阳爻为整段实线，阴爻为左右两段中间留隙。
 */

export interface HexagramLine {
  yin: boolean;
  changing?: boolean;
  branch?: string;
  relation?: string;
  god?: string;
  stem?: string;
  branchElement?: string;
}

export interface HexagramChartData {
  lines: HexagramLine[];
  hexagramName?: string;
  yongShen?: string;
  shiYao?: number;
  yingYao?: number;
  isOriginal?: boolean;
}

interface HexagramChartProps {
  data: HexagramChartData;
  /** 是否高亮变卦标题色，默认按 isOriginal 自动判断 */
  size?: number;
}

// 六神顺序与配色（对齐 legacy CORE.sixGods / sixGodsColor）
const SIX_GODS = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
const SIX_GODS_COLOR = [
  'var(--wz-wood)',
  'var(--wz-fire)',
  'var(--wz-earth)',
  'var(--c-jade)',
  'var(--chart-text-faint)',
  'var(--wz-water)',
];

function godColor(god: string): string {
  const idx = SIX_GODS.indexOf(god);
  return idx >= 0 ? SIX_GODS_COLOR[idx] : 'var(--chart-text-faint)';
}

// 世/应配色（对齐 legacy COLORS.labelShi / labelYing）
const SHI_COLOR = 'var(--wz-fire)';
const YING_COLOR = 'var(--wz-water)';

export function HexagramChart({ data, size = 450 }: HexagramChartProps) {
  const lines = data.lines || [];
  const isOriginal = data.isOriginal !== false;

  // 布局参数（与 legacy Canvas liuyaoRender 对齐）
  const W = size;
  const H = 500;
  const topPad = 32;
  const rowH = 66;
  const barCX = W / 2 - 7;
  const barW = 178;
  const barH = 18;
  const sixGodX = 16;
  const branchRelX = W - 95;
  const shiYingX = W - 132;
  const yaoStartY = topPad + 2;

  // 传统六爻：上爻在顶、初爻在底。lines 为初爻→上爻，渲染从上爻起。
  const renderOrder = lines.slice(0, 6).map((line, i) => ({ line, yaoNum: i + 1 })).reverse();

  const titleColor = isOriginal ? 'var(--c-gold)' : 'var(--chart-text-mid)'; // 本卦金 / 变卦紫
  const barColor = 'var(--chart-text)';

  return (
    <svg
      data-testid="hexagram-chart"
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block h-auto w-full max-w-[470px]"
      role="img"
      aria-label={`${isOriginal ? '本卦' : '变卦'} ${data.hexagramName ?? ''}`}
    >
      {/* 标题 */}
      <text
        x={W / 2}
        y={14}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={titleColor}
        style={{ fontSize: 16, fontWeight: 700 }}
      >
        {isOriginal ? '本卦' : '变卦'}
      </text>

      {/* 逐爻（上爻→初爻） */}
      {renderOrder.map(({ line, yaoNum }, rowIdx) => {
        const rowY = yaoStartY + rowIdx * rowH;
        const yin = !!line.yin;
        const changing = !!line.changing;
        const midY = rowY + barH / 2;
        const leftX = barCX - barW / 2;

        // 阴爻：左右两段，中间留 18% gap
        const gap = Math.max(6, barW * 0.18);
        const segW = (barW - gap) / 2;

        return (
          <g key={`yao-${yaoNum}`}>
            {/* 六神（左侧） */}
            {line.god && (
              <text
                x={sixGodX}
                y={midY}
                textAnchor="start"
                dominantBaseline="middle"
                fill={godColor(line.god)}
                style={{ fontSize: 13 }}
              >
                {line.god}
              </text>
            )}

            {/* 爻线 */}
            {yin ? (
              <>
                <rect x={leftX} y={rowY} width={segW} height={barH} fill={barColor} rx={2} />
                <rect x={leftX + segW + gap} y={rowY} width={segW} height={barH} fill={barColor} rx={2} />
              </>
            ) : (
              <rect x={leftX} y={rowY} width={barW} height={barH} fill={barColor} rx={2} />
            )}

            {/* 动爻标记 */}
            {changing && (
              <g>
                <circle cx={barCX + barW / 2 + 14} cy={midY} r={7} fill="var(--wz-fire)" />
                <text
                  x={barCX + barW / 2 + 14}
                  y={midY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="var(--chart-surface)"
                  style={{ fontSize: 9, fontWeight: 700 }}
                >
                  动
                </text>
              </g>
            )}

            {/* 世 / 应 标记 */}
            {data.shiYao === yaoNum && (
              <g>
                <rect x={shiYingX - 10} y={midY - 10} width={20} height={20} rx={4} fill="var(--chart-inset)" stroke={SHI_COLOR} strokeWidth={1.5} />
                <text x={shiYingX} y={midY} textAnchor="middle" dominantBaseline="middle" fill={SHI_COLOR} style={{ fontSize: 13, fontWeight: 700 }}>
                  世
                </text>
              </g>
            )}
            {data.yingYao === yaoNum && (
              <g>
                <rect x={shiYingX - 10} y={midY - 10} width={20} height={20} rx={4} fill="var(--chart-band)" stroke={YING_COLOR} strokeWidth={1.5} />
                <text x={shiYingX} y={midY} textAnchor="middle" dominantBaseline="middle" fill={YING_COLOR} style={{ fontSize: 13, fontWeight: 700 }}>
                  应
                </text>
              </g>
            )}

            {/* 地支 + 六亲（右侧） */}
            {(line.branch || line.relation) && (
              <text
                x={branchRelX}
                y={midY}
                textAnchor="start"
                dominantBaseline="middle"
                fill="var(--chart-text)"
                style={{ fontSize: 13 }}
              >
                {line.branch}
                {line.relation ? ` ${line.relation}` : ''}
              </text>
            )}
          </g>
        );
      })}

      {/* 底部：卦名 + 用神 */}
      {(() => {
        const bottomY = yaoStartY + 6 * rowH + 4;
        return (
          <g>
            {data.hexagramName && (
              <text
                x={W / 2}
                y={bottomY + 10}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={titleColor}
                style={{ fontSize: 20, fontWeight: 700 }}
              >
                {data.hexagramName}
              </text>
            )}
            {data.yongShen && (
              <text
                x={W / 2}
                y={bottomY + 36}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--chart-text-sub)"
                style={{ fontSize: 13 }}
              >
                用神: {data.yongShen}
              </text>
            )}
          </g>
        );
      })()}
    </svg>
  );
}
