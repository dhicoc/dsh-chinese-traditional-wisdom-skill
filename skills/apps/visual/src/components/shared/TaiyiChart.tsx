/**
 * TaiyiChart — 太乙神数九宫落宫 SVG 式盘
 *
 * 太乙九宫按洛书方位排布 3×3：
 *   上排(南)：巽9  午2  坤7
 *   中排：    卯4  中5  酉6
 *   下排(北)：艮3  子8  乾1
 * 每宫标注：宫名 + 太乙/文昌/始击/定目/主将/客将 落宫标记。
 * 太乙所在宫金色高亮，主将(我方)玉色、客将(对方)朱砂色对立区分。
 */

export interface TaiyiChartProps {
  /** 太乙落宫名（乾/午/艮/卯/中/酉/坤/子/巽） */
  taiyiGong: string;
  /** 文昌落宫 */
  wenchangGong: string;
  /** 始击落宫 */
  shijiGong: string;
  /** 定目落宫 */
  dingmuGong: string;
  /** 主大将落宫名 */
  homeGeneralGong: string;
  /** 客大将落宫名 */
  awayGeneralGong: string;
  /** 八门分布：宫数→门名 */
  eightDoors: Record<number, string>;
  /** 局式（如"阳遁十九局"） */
  kookWen: string;
}

/** 太乙宫数→宫名 */
const GONG_BY_NUM: Record<number, string> = { 1: '乾', 2: '午', 3: '艮', 4: '卯', 5: '中', 6: '酉', 7: '坤', 8: '子', 9: '巽' };
/** 宫名→宫数 */
const NUM_BY_GONG: Record<string, number> = Object.fromEntries(Object.entries(GONG_BY_NUM).map(([n, g]) => [g, Number(n)]));

/** 洛书 3×3 方位：每格 [宫名, 行, 列]（行0=上南，行2=下北） */
const PALACE_POS: Array<{ gong: string; row: number; col: number }> = [
  { gong: '巽', row: 0, col: 0 }, { gong: '午', row: 0, col: 1 }, { gong: '坤', row: 0, col: 2 },
  { gong: '卯', row: 1, col: 0 }, { gong: '中', row: 1, col: 1 }, { gong: '酉', row: 1, col: 2 },
  { gong: '艮', row: 2, col: 0 }, { gong: '子', row: 2, col: 1 }, { gong: '乾', row: 2, col: 2 },
];

/** 八门吉凶色 */
const DOOR_COLOR: Record<string, string> = {
  '开': 'var(--wz-wood)', '休': 'var(--wz-wood)', '生': 'var(--wz-wood)',
  '伤': 'var(--wz-fire)', '死': 'var(--wz-fire)', '惊': 'var(--wz-fire)',
  '杜': 'var(--chart-text-mid)', '景': 'var(--c-gold)',
};

/** 各星将标记色 */
const MARK_COLOR: Record<string, string> = {
  '太乙': 'var(--wz-earth)',
  '文昌': 'var(--wz-water)',
  '始击': 'var(--wz-fire)',
  '定目': 'var(--chart-text-sub)',
  '主将': 'var(--wz-wood)',
  '客将': 'var(--wz-fire)',
};

export function TaiyiChart(props: TaiyiChartProps) {
  const { taiyiGong, wenchangGong, shijiGong, dingmuGong, homeGeneralGong, awayGeneralGong, eightDoors, kookWen } = props;

  const W = 420;
  const H = 460;
  const titleH = 36;
  const footerH = 32;
  const gridAreaH = H - titleH - footerH;
  const cell = Math.floor(gridAreaH / 3);
  const gap = 3;
  const totalW = cell * 3 + gap * 2;
  const gridX = Math.floor((W - totalW) / 2);
  const gridY = titleH + Math.floor((gridAreaH - totalW) / 2);

  /** 宫名→该宫的星将列表 */
  const marks: Record<string, Array<{ name: string; color: string }>> = {};
  const addMark = (gong: string, name: string) => {
    if (!gong) return;
    (marks[gong] ??= []).push({ name, color: MARK_COLOR[name] });
  };
  addMark(taiyiGong, '太乙');
  addMark(wenchangGong, '文昌');
  addMark(shijiGong, '始击');
  addMark(dingmuGong, '定目');
  addMark(homeGeneralGong, '主将');
  addMark(awayGeneralGong, '客将');

  return (
    <svg
      data-testid="taiyi-chart"
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto w-full max-w-[420px]"
      role="img"
      aria-label="太乙九宫落宫式盘"
    >
      {/* 标题 */}
      <text x={W / 2} y={22} textAnchor="middle" className="fill-jade-50" style={{ fontSize: 14, fontWeight: 600, fontFamily: 'serif' }}>
        太乙九宫落宫 · {kookWen}
      </text>

      {/* 九宫 */}
      {PALACE_POS.map(({ gong, row, col }) => {
        const x = gridX + col * (cell + gap);
        const y = gridY + row * (cell + gap);
        const num = NUM_BY_GONG[gong];
        const isTaiyi = gong === taiyiGong;
        const isCenter = gong === '中';
        const door = eightDoors[num];
        const doorColor = door ? DOOR_COLOR[door] : 'var(--chart-text-faint)';
        const palaceMarks = marks[gong] ?? [];

        // 太乙宫金色高亮边框，其余用门色淡边框
        const borderColor = isTaiyi ? 'var(--wz-earth)' : 'rgb(var(--foreground) / 0.12)';
        const bgColor = isTaiyi ? 'rgb(var(--earth) / 0.12)' : isCenter ? 'var(--chart-surface)' : 'var(--chart-inset)';

        return (
          <g key={gong}>
            <rect
              x={x} y={y} width={cell} height={cell}
              rx={10} fill={bgColor} stroke={borderColor} strokeWidth={isTaiyi ? 2 : 1}
            />
            {/* 宫名（左上） */}
            <text
              x={x + 12} y={y + 20}
              className="fill-jade-100" style={{ fontSize: 16, fontWeight: 600, fontFamily: 'serif', opacity: 0.9 }}
            >
              {gong}
            </text>
            {/* 宫数（右上小字） */}
            <text
              x={x + cell - 10} y={y + 18}
              textAnchor="end"
              className="fill-jade-100" style={{ fontSize: 10, fontFamily: 'monospace', opacity: 0.35 }}
            >
              {num}
            </text>
            {/* 八门（中部，门色） */}
            {door && (
              <text
                x={x + cell / 2} y={y + cell / 2 + 2}
                textAnchor="middle"
                style={{ fontSize: 15, fontWeight: 600, fontFamily: 'serif', fill: doorColor, opacity: 0.78 }}
              >
                {door}门
              </text>
            )}
            {/* 星将标记（下半部，按行排布） */}
            {palaceMarks.map((m, i) => {
              const cols = 2;
              const mr = Math.floor(i / cols);
              const mc = i % cols;
              const mx = x + cell / 2 + (mc - 0.5) * (cell * 0.42);
              const my = y + cell * 0.72 + mr * 16;
              return (
                <g key={m.name}>
                  <circle cx={mx - 14} cy={my - 4} r={3} fill={m.color} />
                  <text
                    x={mx - 8} y={my}
                    style={{ fontSize: 10, fontFamily: 'serif', fill: m.color, opacity: 0.95 }}
                  >
                    {m.name}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* 底部图例 */}
      <g>
        <text x={gridX} y={H - 10} style={{ fontSize: 10, fontFamily: 'serif', fill: 'var(--wz-earth)' }}>★太乙</text>
        <text x={gridX + 56} y={H - 10} style={{ fontSize: 10, fontFamily: 'serif', fill: MARK_COLOR['主将'] }}>●主将</text>
        <text x={gridX + 112} y={H - 10} style={{ fontSize: 10, fontFamily: 'serif', fill: MARK_COLOR['客将'] }}>●客将</text>
        <text x={gridX + 168} y={H - 10} style={{ fontSize: 10, fontFamily: 'serif', fill: MARK_COLOR['文昌'] }}>●文昌</text>
        <text x={gridX + 224} y={H - 10} style={{ fontSize: 10, fontFamily: 'serif', fill: MARK_COLOR['始击'] }}>●始击</text>
        <text x={gridX + 280} y={H - 10} style={{ fontSize: 10, fontFamily: 'serif', fill: MARK_COLOR['定目'] }}>●定目</text>
      </g>
    </svg>
  );
}
