/**
 * FengshuiCompass — 二十四山 SVG 罗盘（增强版）
 *
 * 三环结构：外环二十四山、中环八卦符号+卦名、内环八方向，中心十字。
 * 增强：支持坐向旋转、飞星吉凶叠加、八宅游年星叠加。
 */

interface PalaceOverlay {
  palace?: string;
  starNum?: number;
  starName?: string;
  starLuck?: string;
  usageLabel?: string;
  mansionStar?: string;
  mansionLuck?: string;
}

interface FengshuiCompassProps {
  size?: number;
  /** 坐向（如 "子午"=坐子向午），传入则罗盘旋转使朝向指向上方 */
  facing?: string;
  /** 各方位叠加数据（飞星+八宅） */
  overlay?: Record<string, PalaceOverlay>;
}

const MOUNTAINS = [
  '壬', '子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳',
  '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥',
];

const YANG_MOUNTAINS = new Set(['壬', '甲', '丙', '庚', '乾', '艮', '子', '寅', '辰', '午', '申', '戌']);

const TRIGRAMS: { tri: string; deg: number; label: string; symbol: string }[] = [
  { tri: '坎', deg: 0, label: '北', symbol: '☵' },
  { tri: '艮', deg: 45, label: '东北', symbol: '☶' },
  { tri: '震', deg: 90, label: '东', symbol: '☳' },
  { tri: '巽', deg: 135, label: '东南', symbol: '☴' },
  { tri: '离', deg: 180, label: '南', symbol: '☲' },
  { tri: '坤', deg: 225, label: '西南', symbol: '☷' },
  { tri: '兑', deg: 270, label: '西', symbol: '☱' },
  { tri: '乾', deg: 315, label: '西北', symbol: '☰' },
];

// 二十四山 → 角度（从北顺时针，每山15°）
const MOUNTAIN_DEG: Record<string, number> = {};
MOUNTAINS.forEach((m, i) => { MOUNTAIN_DEG[m] = i * 15; });

// 八方位标签
const DIR_LABELS: Record<string, string> = {
  '北': '北', '东北': '东北', '东': '东', '东南': '东南',
  '南': '南', '西南': '西南', '西': '西', '西北': '西北',
};

// 宫位 → 方位
const PALACE_TO_DIR: Record<string, string> = {
  '坎': '北', '坤': '西南', '震': '东', '巽': '东南',
  '中': '中', '乾': '西北', '兑': '西', '艮': '东北', '离': '南',
};

const LUCK_COLOR: Record<string, string> = {
  '大吉': 'var(--wz-wood)', '吉': 'var(--wz-wood)',
  '大凶': 'var(--wz-fire)', '凶': 'var(--wz-fire)', '次凶': 'var(--wz-fire)',
  '中平': 'var(--chart-text-mid)', '中性': 'var(--chart-text-mid)',
};

// 平行映射：luckColor + '20' / '18' / '15' 的 hex-alpha 拼接等价 rgb(var(--triplet) / alpha)。
// '20' → 0x20/255≈0.125；'18' → 0x18/255≈0.094；'15' → 0x15/255≈0.082。
const LUCK_COLOR_ALPHA: Record<string, Record<string, string>> = {
  '大吉': { '20': 'rgb(var(--wood) / 0.125)', '18': 'rgb(var(--wood) / 0.094)', '15': 'rgb(var(--wood) / 0.082)' },
  '吉':   { '20': 'rgb(var(--wood) / 0.125)', '18': 'rgb(var(--wood) / 0.094)', '15': 'rgb(var(--wood) / 0.082)' },
  '大凶': { '20': 'rgb(var(--cinnabar) / 0.125)', '18': 'rgb(var(--cinnabar) / 0.094)', '15': 'rgb(var(--cinnabar) / 0.082)' },
  '凶':   { '20': 'rgb(var(--cinnabar) / 0.125)', '18': 'rgb(var(--cinnabar) / 0.094)', '15': 'rgb(var(--cinnabar) / 0.082)' },
  '次凶': { '20': 'rgb(var(--cinnabar) / 0.125)', '18': 'rgb(var(--cinnabar) / 0.094)', '15': 'rgb(var(--cinnabar) / 0.082)' },
  '中平': { '20': 'rgb(var(--spirit) / 0.125)', '18': 'rgb(var(--spirit) / 0.094)', '15': 'rgb(var(--spirit) / 0.082)' },
  '中性': { '20': 'rgb(var(--spirit) / 0.125)', '18': 'rgb(var(--spirit) / 0.094)', '15': 'rgb(var(--spirit) / 0.082)' },
};

const MOUNTAIN_TO_DIR: Record<string, string> = {
  '子': '北', '癸': '北', '壬': '北',
  '丑': '东北', '艮': '东北', '寅': '东北',
  '甲': '东', '卯': '东', '乙': '东',
  '辰': '东南', '巽': '东南', '巳': '东南',
  '丙': '南', '午': '南', '丁': '南',
  '未': '西南', '坤': '西南', '申': '西南',
  '庚': '西', '酉': '西', '辛': '西',
  '戌': '西北', '乾': '西北', '亥': '西北',
};

/** 环形扇区 path */
function sectorPath(cx: number, cy: number, rIn: number, rOut: number, deg: number, half: number): string {
  const startDeg = deg - half - 90;
  const endDeg = deg + half - 90;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + rOut * Math.cos(toRad(startDeg));
  const y1 = cy + rOut * Math.sin(toRad(startDeg));
  const x2 = cx + rOut * Math.cos(toRad(endDeg));
  const y2 = cy + rOut * Math.sin(toRad(endDeg));
  const x3 = cx + rIn * Math.cos(toRad(endDeg));
  const y3 = cy + rIn * Math.sin(toRad(endDeg));
  const x4 = cx + rIn * Math.cos(toRad(startDeg));
  const y4 = cy + rIn * Math.sin(toRad(startDeg));
  const largeArc = half * 2 > 180 ? 1 : 0;
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/** 径向文字定位 */
function radial(cx: number, cy: number, deg: number, r: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);
  const flip = deg > 90 && deg < 270;
  return { x, y, rotate: flip ? deg + 180 : deg, flip };
}

export function FengshuiCompass({ size = 500, facing, overlay }: FengshuiCompassProps) {
  const W = size;
  const H = size;
  const cx = W / 2;
  const cy = H / 2;
  const R1 = 235;
  const R1i = 195;
  const R2 = 190;
  const R2i = 142;
  const R3 = 138;
  const R3i = 88;
  const RC = 38;

  // 坐向旋转角度：facing 格式如 "子午"(坐子向午)，午在正南(180°)，
  // 旋转使朝向(第二个字)指向上方(0°/360°)
  const facingRotation = (() => {
    if (!facing || facing.length < 2) return 0;
    const facingMountain = facing.charAt(1); // 朝向山
    const deg = MOUNTAIN_DEG[facingMountain];
    if (deg == null) return 0;
    // 使朝向指向上方：旋转 -deg 度
    return -deg;
  })();

  return (
    <svg
      data-testid="fengshui-compass"
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block h-auto w-full max-w-[520px]"
      role="img"
      aria-label={`二十四山风水罗盘${facing ? `，坐${facing.charAt(0)}向${facing.charAt(1)}` : ''}`}
    >
      {/* 旋转组：按坐向旋转整个罗盘 */}
      <g transform={`rotate(${facingRotation} ${cx} ${cy})`}>
        {/* 背景 */}
        <circle cx={cx} cy={cy} r={R1 + 4} fill="var(--chart-surface)" stroke="var(--chart-line-strong)" strokeWidth={1.5} />

        {/* 外环：二十四山 */}
        {MOUNTAINS.map((mtn, i) => {
          const isYang = YANG_MOUNTAINS.has(mtn);
          const centerDeg = (i - 1) * 15;
          const p = radial(cx, cy, centerDeg, (R1 + R1i) / 2);
          const dir = MOUNTAIN_TO_DIR[mtn] || '';
          const ov = overlay?.[dir];
          // 飞星叠加：如果该方位有飞星数据，用吉凶色填充扇区
          const luckKey = ov?.starLuck ?? null;
          const luckColor = luckKey ? LUCK_COLOR[luckKey] : null;
          return (
            <g key={mtn}>
              <path
                d={sectorPath(cx, cy, R1i, R1, centerDeg, 7.5)}
                fill={luckKey ? LUCK_COLOR_ALPHA[luckKey]['20'] : (isYang ? 'var(--chart-deep)' : 'var(--chart-band)')}
                stroke="var(--chart-line)"
                strokeWidth={0.6}
              />
              <g transform={`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${p.rotate})`}>
                <text textAnchor="middle" dominantBaseline="middle"
                  fill={luckColor ?? (isYang ? 'var(--wz-earth)' : 'var(--wz-water)')}
                  style={{ fontSize: 12 }}
                >
                  {mtn}
                </text>
              </g>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={R1} fill="none" stroke="var(--chart-line-faint)" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={R1i} fill="none" stroke="var(--chart-line-faint)" strokeWidth={1.5} />

        {/* 中环：八卦符号 + 卦名 + 游年星（首字） */}
        {TRIGRAMS.map((t) => {
          const pSym = radial(cx, cy, t.deg, R2 - 16);
          const pName = radial(cx, cy, t.deg, R2i + 20);
          const pStar = radial(cx, cy, t.deg, R2i + 6);
          const dir = t.label;
          const ov = overlay?.[dir];
          const luckKey = ov?.mansionLuck ?? null;
          const luckColor = luckKey ? LUCK_COLOR[luckKey] : null;
          // 游年星只显示首字避免超出中环边界，完整名称在侧栏
          const starShort = ov?.mansionStar ? ov.mansionStar.charAt(0) : '';
          return (
            <g key={t.tri}>
              <path
                d={sectorPath(cx, cy, R2i, R2, t.deg, 22.5)}
                fill={luckKey ? LUCK_COLOR_ALPHA[luckKey]['18'] : 'var(--chart-inset)'}
                stroke="var(--chart-line)"
                strokeWidth={0.6}
              />
              <g transform={`translate(${pSym.x.toFixed(2)} ${pSym.y.toFixed(2)}) rotate(${pSym.rotate})`}>
                <text textAnchor="middle" dominantBaseline="middle" fill="var(--c-gold)" style={{ fontSize: 15 }}>
                  {t.symbol}
                </text>
              </g>
              <g transform={`translate(${pName.x.toFixed(2)} ${pName.y.toFixed(2)}) rotate(${pName.rotate})`}>
                <text textAnchor="middle" dominantBaseline="middle" fill={luckColor ?? 'var(--chart-text-mid)'} style={{ fontSize: 10 }}>
                  {t.tri}
                </text>
              </g>
              {starShort && (
                <g transform={`translate(${pStar.x.toFixed(2)} ${pStar.y.toFixed(2)}) rotate(${pStar.rotate})`}>
                  <text textAnchor="middle" dominantBaseline="middle" fill={luckColor ?? 'var(--chart-text-faint)'} style={{ fontSize: 9 }} >
                    {starShort}
                    <title>{ov?.mansionStar}</title>
                  </text>
                </g>
              )}
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={R2} fill="none" stroke="var(--chart-line-faint)" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={R2i} fill="none" stroke="var(--chart-line-faint)" strokeWidth={1.5} />

        {/* 内环：八方向 + 飞星编号 */}
        {TRIGRAMS.map((t) => {
          const pDir = radial(cx, cy, t.deg, R3i + 10);
          const pStar = radial(cx, cy, t.deg, R3 - 8);
          const dir = t.label;
          const ov = overlay?.[dir];
          const luckKey = ov?.starLuck ?? null;
          const luckColor = luckKey ? LUCK_COLOR[luckKey] : null;
          return (
            <g key={`dir-${t.tri}`}>
              <path
                d={sectorPath(cx, cy, R3i, R3, t.deg, 22.5)}
                fill={luckKey ? LUCK_COLOR_ALPHA[luckKey]['15'] : 'var(--chart-inset)'}
                stroke="var(--chart-line)"
                strokeWidth={0.6}
              />
              <g transform={`translate(${pDir.x.toFixed(2)} ${pDir.y.toFixed(2)}) rotate(${pDir.rotate})`}>
                <text textAnchor="middle" dominantBaseline="middle" fill={luckColor ?? 'var(--chart-text)'} style={{ fontSize: 11, fontWeight: 700 }}>
                  {t.label}
                </text>
              </g>
              {ov?.starNum && (
                <g transform={`translate(${pStar.x.toFixed(2)} ${pStar.y.toFixed(2)}) rotate(${pStar.rotate})`}>
                  <text textAnchor="middle" dominantBaseline="middle" fill={luckColor ?? 'var(--chart-text-mid)'} style={{ fontSize: 10 }}>
                    {ov.starNum}{ov.starName?.slice(0,2) ?? ''}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={R3} fill="none" stroke="var(--chart-line-faint)" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={R3i} fill="none" stroke="var(--chart-line-faint)" strokeWidth={1.5} />

        {/* 中心十字 */}
        <circle cx={cx} cy={cy} r={RC} fill="var(--chart-surface)" stroke="var(--chart-line-faint)" strokeWidth={1.5} />
        {[
          { label: '北', angle: -90, color: 'var(--wz-fire)' },
          { label: '南', angle: 90, color: 'var(--chart-text)' },
          { label: '东', angle: 0, color: 'var(--chart-text)' },
          { label: '西', angle: 180, color: 'var(--chart-text)' },
        ].map((d) => {
          const rad = d.angle * (Math.PI / 180);
          const x2 = cx + RC * 0.64 * Math.cos(rad);
          const y2 = cy + RC * 0.64 * Math.sin(rad);
          const lr = RC * 0.8;
          const lx = cx + lr * Math.cos(rad);
          const ly = cy + lr * Math.sin(rad);
          return (
            <g key={d.label}>
              <line x1={cx} y1={cy} x2={x2} y2={y2} stroke={d.color} strokeWidth={d.angle === -90 ? 2.5 : 1.5} />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={d.color} style={{ fontSize: 11, fontWeight: d.angle === -90 ? 700 : 400 }}>
                {d.label}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={3} fill="var(--chart-text)" />

        {/* 坐向标识：在朝向方位画一个箭头 */}
        {facing && facing.length >= 2 && (
          <g>
            {(() => {
              const facingDeg = MOUNTAIN_DEG[facing.charAt(1)] ?? 0;
              const sittingDeg = MOUNTAIN_DEG[facing.charAt(0)] ?? 180;
              // 朝向箭头（外环外侧）
              const fr = radial(cx, cy, facingDeg, R1 + 28);
              const sr = radial(cx, cy, sittingDeg, R1 + 28);
              return (
                <>
                  <text x={fr.x} y={fr.y} textAnchor="middle" dominantBaseline="middle" fill="var(--wz-fire)" style={{ fontSize: 14, fontWeight: 700 }}>
                    ▲向
                  </text>
                  <text x={sr.x} y={sr.y} textAnchor="middle" dominantBaseline="middle" fill="var(--wz-wood)" style={{ fontSize: 14, fontWeight: 700 }}>
                    ▼坐
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </g>
    </svg>
  );
}
