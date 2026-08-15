/**
 * HomeBaziPlate — 首页「四柱 / 九宫工作台」环形命盘 SVG。
 *
 * 替换原 CSS .home-plate 装饰盘：
 * - 数据来自真实八字引擎（BaziPillars），不再写死假四柱；
 * - 纯 SVG 绘制，由 ZoomableSvg 包裹，恢复双击放大 + 右键复制为图像；
 * - 四角四柱（年/月/日/时）+ 中心日主，按五行低饱和色着色，日柱高亮。
 * 视觉对齐 TASTE_SKILL_UI 学术暗模式与 BaziPillarsChart。
 */

import type { BaziPillars } from '@/legacy/canvasRenderers';

interface HomeBaziPlateProps {
  pillars: BaziPillars;
  size?: number;
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

const DAY_ACCENT = 'var(--c-gold)';

function stemWuxing(stem: string): string {
  return STEM_WUXING[stem] ?? '';
}
function branchWuxing(branch: string): string {
  return BRANCH_WUXING[branch] ?? '';
}

interface CellPos {
  label: string;
  key: 'year' | 'month' | 'day' | 'hour';
  cx: number;
  cy: number;
  isDay?: boolean;
}

export function HomeBaziPlate({ pillars, size = 360 }: HomeBaziPlateProps) {
  const VB = 360;
  const C = VB / 2;
  const cell = 116;
  const half = cell / 2;

  // 四角四柱：年(左上) 月(右上) 日(左下·高亮) 时(右下)
  const cells: CellPos[] = [
    { label: '年柱', key: 'year', cx: 92, cy: 92 },
    { label: '月柱', key: 'month', cx: 268, cy: 92 },
    { label: '日柱', key: 'day', cx: 92, cy: 268, isDay: true },
    { label: '时柱', key: 'hour', cx: 268, cy: 268 },
  ];

  const dayMaster = pillars.dayMaster ?? pillars.day?.stem ?? '?';
  const dmWx = stemWuxing(dayMaster);
  const dmColor = WX_COLOR[dmWx] ?? 'var(--chart-text-mid)';

  return (
    <svg
      data-testid="home-bazi-plate"
      viewBox={`0 0 ${VB} ${VB}`}
      width={size}
      height={size}
      role="img"
      aria-label="首页四柱环形命盘"
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id="home-plate-bg" cx="0.5" cy="0.5" r="0.62">
          <stop offset="0" stopColor="var(--chart-surface)" />
          <stop offset="1" stopColor="var(--chart-bg)" />
        </radialGradient>
        <linearGradient id="home-day-tint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(var(--gold) / 0.16)" />
          <stop offset="1" stopColor="rgb(var(--gold) / 0.04)" />
        </linearGradient>
      </defs>

      {/* 底盘 */}
      <circle cx={C} cy={C} r={176} fill="url(#home-plate-bg)" stroke="rgb(var(--jade) / 0.18)" strokeWidth={1} />
      {/* 外装饰环 */}
      <circle cx={C} cy={C} r={170} fill="none" stroke="rgb(var(--jade) / 0.22)" strokeWidth={1} strokeDasharray="2 6" />
      <circle cx={C} cy={C} r={158} fill="none" stroke="rgb(var(--jade) / 0.10)" strokeWidth={1} />

      {/* 四角四柱 */}
      {cells.map((c) => {
        const p = pillars[c.key];
        if (!p) return null;
        const x = c.cx - half;
        const y = c.cy - half;
        const stemWx = stemWuxing(p.stem);
        const branchWx = branchWuxing(p.branch);
        const stemColor = WX_COLOR[stemWx] ?? 'var(--chart-text-mid)';
        const branchColor = WX_COLOR[branchWx] ?? 'var(--chart-text-mid)';
        const accent = c.isDay ? DAY_ACCENT : null;

        return (
          <g key={c.key}>
            <rect
              x={x}
              y={y}
              width={cell}
              height={cell}
              rx={12}
              fill={accent ? 'url(#home-day-tint)' : 'rgb(var(--foreground) / 0.025)'}
              stroke={accent ?? 'rgb(var(--jade) / 0.22)'}
              strokeWidth={accent ? 1.5 : 1}
            />
            {/* 柱标签 */}
            <text x={c.cx} y={y + 16} textAnchor="middle" dominantBaseline="middle" fill={accent ?? 'var(--chart-text-faint)'} style={{ fontSize: 11, fontWeight: accent ? 700 : 400, letterSpacing: 1 }}>
              {c.label}
            </text>
            {/* 左侧五行色竖条（天干） */}
            <rect x={x + 6} y={y + 24} width={3} height={32} rx={1.5} fill={stemColor} />
            {/* 天干大字 */}
            <text x={c.cx + 2} y={y + 44} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text)" style={{ fontSize: 30, fontWeight: 700, fontFamily: '"Noto Serif SC","SimSun","KaiTi",serif' }}>
              {p.stem}
            </text>
            {/* 分隔线 */}
            <line x1={x + 18} y1={y + 62} x2={x + cell - 18} y2={y + 62} stroke="rgb(var(--foreground) / 0.08)" strokeWidth={1} />
            {/* 左侧五行色竖条（地支） */}
            <rect x={x + 6} y={y + 66} width={3} height={32} rx={1.5} fill={branchColor} />
            {/* 地支大字 */}
            <text x={c.cx + 2} y={y + 86} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text)" style={{ fontSize: 30, fontWeight: 700, fontFamily: '"Noto Serif SC","SimSun","KaiTi",serif' }}>
              {p.branch}
            </text>
          </g>
        );
      })}

      {/* 中心日主圆 */}
      <circle cx={C} cy={C} r={48} fill="var(--chart-bg)" stroke={dmColor} strokeWidth={2} />
      <circle cx={C} cy={C} r={42} fill="none" stroke={dmColor} strokeWidth={1} opacity={0.4} />
      <text x={C} y={C - 20} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-faint)" style={{ fontSize: 9, letterSpacing: 2 }}>
        日主
      </text>
      <text x={C - 9} y={C + 6} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text)" style={{ fontSize: 24, fontWeight: 700, fontFamily: '"Noto Serif SC","SimSun","KaiTi",serif' }}>
        {dayMaster}
      </text>
      <text x={C + 14} y={C + 8} textAnchor="middle" dominantBaseline="middle" fill={dmColor} style={{ fontSize: 13, fontWeight: 600, fontFamily: '"Noto Serif SC","SimSun","KaiTi",serif' }}>
        {dmWx || ''}
      </text>
    </svg>
  );
}
