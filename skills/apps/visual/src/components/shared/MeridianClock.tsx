import { MERIDIAN_HOURS, WUXING_COLORS, type MeridianHour } from '@/legacy/meridianClock';

/**
 * MeridianClock — 子午流注圆形经络钟 SVG
 *
 * 12 时辰按钟面顺时针排列（子时在正上方 12 点位置，对应 23-1 点），
 * 每个扇区显示时辰名 + 经络名，五行配色，当前时辰金色高亮。
 * 中心显示当前时辰详情。
 */

interface MeridianClockProps {
  /** 当前时辰（高亮）；不传则不高亮 */
  current?: MeridianHour | null;
  /** 选中的时辰（点击态，玉色高亮） */
  selected?: MeridianHour | null;
  /** 点击扇区回调 */
  onSelect?: (sc: MeridianHour) => void;
}

const SIZE = 420;
const CENTER = SIZE / 2;
const OUTER_R = 196;
const INNER_R = 118;
const LABEL_R = (OUTER_R + INNER_R) / 2;

/** 子时（23-1）在正上方，顺时针 12 等分。每扇区 30°。
 *  角度从 -90°（正上方）起，顺时针递增。 */
function hourAngle(index: number): number {
  return -90 + index * 30;
}

function polar(angleDeg: number, r: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [CENTER + r * Math.cos(a), CENTER + r * Math.sin(a)];
}

/** 扇区路径（环形扇区，从 innerR 到 outerR，跨 30°） */
function sectorPath(index: number): string {
  const a0 = hourAngle(index) - 15;
  const a1 = hourAngle(index) + 15;
  const [x1o, y1o] = polar(a0, OUTER_R);
  const [x2o, y2o] = polar(a1, OUTER_R);
  const [x2i, y2i] = polar(a1, INNER_R);
  const [x1i, y1i] = polar(a0, INNER_R);
  return `M ${x1o} ${y1o} A ${OUTER_R} ${OUTER_R} 0 0 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${INNER_R} ${INNER_R} 0 0 0 ${x1i} ${y1i} Z`;
}

export function MeridianClock({ current, selected, onSelect }: MeridianClockProps) {
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-[420px] mx-auto"
      role="img"
      aria-label="子午流注经络时钟"
      data-testid="meridian-clock"
    >
      {/* 外环底色 */}
      <circle cx={CENTER} cy={CENTER} r={OUTER_R + 6} fill="var(--chart-page)" stroke="rgb(var(--jade) / 0.18)" strokeWidth={1} />
      <circle cx={CENTER} cy={CENTER} r={INNER_R - 6} fill="var(--chart-bg)" stroke="rgb(var(--jade) / 0.12)" strokeWidth={1} />

      {/* 12 扇区 */}
      {MERIDIAN_HOURS.map((sc, i) => {
        const isCurrent = current?.name === sc.name;
        const isSelected = selected?.name === sc.name;
        const color = WUXING_COLORS[sc.wuxing] ?? 'var(--chart-text-faint)';
        const [lx, ly] = polar(hourAngle(i), LABEL_R);
        const fillOpacity = isCurrent ? 0.22 : isSelected ? 0.16 : 0.08;
        const strokeColor = isCurrent ? 'var(--c-gold)' : isSelected ? 'rgb(var(--jade) / 0.55)' : 'rgb(var(--foreground) / 0.1)';
        const strokeWidth = isCurrent ? 2 : isSelected ? 1.5 : 1;

        return (
          <g
            key={sc.name}
            onClick={() => onSelect?.(sc)}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}
          >
            <path
              d={sectorPath(i)}
              fill={color}
              fillOpacity={fillOpacity}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {/* 五行色点 */}
            <circle
              cx={polar(hourAngle(i), INNER_R + 12)[0]}
              cy={polar(hourAngle(i), INNER_R + 12)[1]}
              r={3.5}
              fill={color}
              opacity={0.9}
            />
            {/* 时辰名 + 经络名 */}
            <text
              x={lx}
              y={ly - 6}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
              fontWeight={isCurrent ? 700 : 500}
              fill={isCurrent ? 'var(--c-gold)' : 'var(--chart-text)'}
              fontFamily="'Noto Serif CJK SC', serif"
            >
              {sc.name}
            </text>
            <text
              x={lx}
              y={ly + 9}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fill={color}
              opacity={0.92}
            >
              {sc.meridian}
            </text>
          </g>
        );
      })}

      {/* 中心：当前时辰详情 */}
      <text
        x={CENTER}
        y={CENTER - 22}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fill="rgb(var(--foreground) / 0.55)"
      >
        {current ? '当前时辰' : '经络时钟'}
      </text>
      {current ? (
        <>
          <text
            x={CENTER}
            y={CENTER - 4}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={26}
            fontWeight={700}
            fill="var(--c-gold)"
            fontFamily="'Noto Serif CJK SC', serif"
          >
            {current.name}
          </text>
          <text
            x={CENTER}
            y={CENTER + 18}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fill={WUXING_COLORS[current.wuxing] ?? 'var(--chart-text-faint)'}
          >
            {current.meridian} · {current.wuxing}
          </text>
          <text
            x={CENTER}
            y={CENTER + 34}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill="rgb(var(--foreground) / 0.5)"
          >
            {current.time}
          </text>
        </>
      ) : (
        <text
          x={CENTER}
          y={CENTER + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fill="rgb(var(--foreground) / 0.4)"
        >
          12 时辰当令
        </text>
      )}

      {/* 当前时辰指针线 */}
      {current && (() => {
        const idx = MERIDIAN_HOURS.findIndex((s) => s.name === current.name);
        if (idx < 0) return null;
        const [px, py] = polar(hourAngle(idx), INNER_R - 8);
        return (
          <line
            x1={CENTER}
            y1={CENTER}
            x2={px}
            y2={py}
            stroke="var(--c-gold)"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.7}
          />
        );
      })()}
    </svg>
  );
}
