/**
 * MeihuaChart — 梅花易数 SVG 卦画（Phase 10 图表替换）
 *
 * 替代梅花工作区的 legacy Canvas `renderMeihua`。包含本卦卦画(左)、
 * 卦名/上下卦/变卦/动爻(右)、互卦 inset(右上)、体用生克(底部)。
 *
 * 八卦爻线：阳=整段实线，阴=左右两段中间留隙。爻序上爻在顶。
 * 互卦 inset 框高按内容自适应，根治 legacy Canvas 文字溢出问题。
 */

import type { MeihuaData, TrigramDisplay } from '@/legacy/divinationTypes';

interface MeihuaChartProps {
  data: MeihuaData;
  size?: number;
}

// 八卦 → 三爻（从上到下）。阳={yin:false}，阴={yin:true}
// 乾☰ 兑☱ 离☲ 震☳ 巽☴ 坎☵ 艮☶ 坤☷
const TRIGRAM_LINES: Record<string, { yin: boolean }[]> = {
  乾: [{ yin: false }, { yin: false }, { yin: false }],
  兑: [{ yin: true }, { yin: false }, { yin: false }],
  离: [{ yin: false }, { yin: true }, { yin: false }],
  震: [{ yin: true }, { yin: true }, { yin: false }],
  巽: [{ yin: false }, { yin: false }, { yin: true }],
  坎: [{ yin: true }, { yin: false }, { yin: true }],
  艮: [{ yin: false }, { yin: true }, { yin: true }],
  坤: [{ yin: true }, { yin: true }, { yin: true }],
};

function trigramLines(name: string): { yin: boolean }[] {
  return TRIGRAM_LINES[name] || TRIGRAM_LINES.乾;
}

// 单个三爻绘制（从上到下）
function TrigramBars({ cx, startY, name, barW, barH, gap }: { cx: number; startY: number; name: string; barW: number; barH: number; gap: number }) {
  const lines = trigramLines(name);
  return (
    <g>
      {lines.map((line, i) => {
        const y = startY + i * (barH + gap);
        const leftX = cx - barW / 2;
        if (line.yin) {
          const g = Math.max(4, barW * 0.18);
          const segW = (barW - g) / 2;
          return (
            <g key={i}>
              <rect x={leftX} y={y} width={segW} height={barH} fill="var(--c-gold)" rx={2} />
              <rect x={leftX + segW + g} y={y} width={segW} height={barH} fill="var(--c-gold)" rx={2} />
            </g>
          );
        }
        return <rect key={i} x={leftX} y={y} width={barW} height={barH} fill="var(--c-gold)" rx={2} />;
      })}
    </g>
  );
}

export function MeihuaChart({ data, size = 500 }: MeihuaChartProps) {
  const W = size;
  const H = 450;

  // 卦画区
  const barCX = 100;
  const barW = 100;
  const barH = 12;
  const lineGap = 10;
  const triGap = 55;
  const upperStartY = 42;
  const lowerStartY = upperStartY + 3 * (barH + lineGap) + triGap;
  const infoX = 210;

  const upperTri = data.upperTrigram || ({} as TrigramDisplay);
  const lowerTri = data.lowerTrigram || ({} as TrigramDisplay);

  // 动爻位置：1-3 在下卦，4-6 在上卦
  const ch = data.changingLine;
  let changingDotY: number | null = null;
  if (ch) {
    if (ch <= 3) {
      const idx = 3 - ch; // 下卦：ch=1=最下爻(lines[2])
      changingDotY = lowerStartY + idx * (barH + lineGap);
    } else {
      const idx = 6 - ch; // 上卦：ch=4=最下爻(lines[2])
      changingDotY = upperStartY + idx * (barH + lineGap);
    }
  }

  // 互卦 inset（右上角，框高按内容自适应）
  const mutualX = 360;
  const mutualY = 38;
  const mu = data.mutualUpper;
  const ml = data.mutualLower;
  const hasMutual = !!(mu || ml);
  // 内部内容垂直排布：标题 + 上互(符号+名) + 下互(符号+名)
  let mutualBoxH = 0;
  if (hasMutual) {
    mutualBoxH = 14 + 30 + 13 + 30 + 13 + 8; // 标题+上互符号+上互名+下互符号+下互名+padding
    if (!mu || !ml) mutualBoxH = 14 + 30 + 13 + 8;
  }

  // 体用生克（底部）
  const tiYongY = 240;
  const boxY = tiYongY + 28;
  const boxW = 72;
  const boxH = 52;
  const bodyName = data.bodyTrigram || '';
  const useName = data.useTrigram || '';
  const relation = data.bodyUseRelation || '';
  const arrX1 = infoX + boxW + 8;
  const arrX2 = infoX + boxW + 58;

  const relHint =
    relation === '生' ? '体生用 → 泄气，事倍功半' :
    relation === '克' ? '体克用 → 费力，己方占优' :
    relation === '比和' ? '体用比和 → 顺遂，诸事和谐' : '';

  return (
    <svg
      data-testid="meihua-chart"
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block h-auto w-full max-w-[520px]"
      role="img"
      aria-label={`梅花易数 ${data.hexagramName}`}
    >
      {/* 背景 */}
      <rect x={0} y={0} width={W} height={H} rx={8} fill="var(--chart-surface)" stroke="var(--chart-line)" strokeWidth={1.5} />

      {/* ── 左栏：本卦卦画 ── */}
      <TrigramBars cx={barCX} startY={upperStartY} name={upperTri.name} barW={barW} barH={barH} gap={lineGap} />
      <TrigramBars cx={barCX} startY={lowerStartY} name={lowerTri.name} barW={barW} barH={barH} gap={lineGap} />

      {/* 动爻标记 */}
      {changingDotY !== null && (
        <g>
          <circle cx={barCX + barW / 2 + 14} cy={changingDotY + barH / 2} r={7} fill="var(--wz-fire)" />
          <text x={barCX + barW / 2 + 14} y={changingDotY + barH / 2} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text)" style={{ fontSize: 9, fontWeight: 700 }}>
            变
          </text>
        </g>
      )}

      {/* ── 右栏：卦名 + 上下卦 + 变卦 + 动爻 ── */}
      {data.hexagramName && (
        <text x={infoX} y={56} textAnchor="start" dominantBaseline="middle" fill="var(--c-gold)" style={{ fontSize: 24, fontWeight: 700 }}>
          {data.hexagramName}
        </text>
      )}
      {upperTri.name && (
        <text x={infoX} y={86} textAnchor="start" dominantBaseline="middle" fill="var(--chart-text-sub)" style={{ fontSize: 15 }}>
          上: {upperTri.symbol} {upperTri.name}
        </text>
      )}
      {lowerTri.name && (
        <text x={infoX} y={110} textAnchor="start" dominantBaseline="middle" fill="var(--chart-text-sub)" style={{ fontSize: 15 }}>
          下: {lowerTri.symbol} {lowerTri.name}
        </text>
      )}
      {data.changingHexagramName && (
        <text x={infoX} y={142} textAnchor="start" dominantBaseline="middle" fill="var(--chart-text)" style={{ fontSize: 15 }}>
          变卦: {data.changingHexagramName}
        </text>
      )}
      {ch && (
        <text x={infoX} y={172} textAnchor="start" dominantBaseline="middle" fill="var(--chart-text-faint)" style={{ fontSize: 13 }}>
          动爻: {ch}爻
        </text>
      )}

      {/* ── 互卦 inset（右上角，框高自适应） ── */}
      {hasMutual && (
        <g>
          <rect
            x={mutualX - 6}
            y={mutualY - 4}
            width={120}
            height={mutualBoxH}
            rx={6}
            fill="var(--chart-inset)"
            stroke="var(--chart-line-strong)"
            strokeWidth={1}
          />
          <text x={mutualX + 54} y={mutualY + 6} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-faint)" style={{ fontSize: 12 }}>
            互卦
          </text>
          {mu?.symbol && (
            <text x={mutualX + 54} y={mutualY + 32} textAnchor="middle" dominantBaseline="middle" fill="var(--c-gold)" style={{ fontSize: 26 }}>
              {mu.symbol}
            </text>
          )}
          {mu?.name && (
            <text x={mutualX + 54} y={mutualY + 56} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-faint)" style={{ fontSize: 11 }}>
              {mu.name}
            </text>
          )}
          {ml?.symbol && (
            <text x={mutualX + 54} y={mutualY + 78} textAnchor="middle" dominantBaseline="middle" fill="var(--c-gold)" style={{ fontSize: 26 }}>
              {ml.symbol}
            </text>
          )}
          {ml?.name && (
            <text x={mutualX + 54} y={mutualY + 102} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-faint)" style={{ fontSize: 11 }}>
              {ml.name}
            </text>
          )}
        </g>
      )}

      {/* ── 体用生克 ── */}
      <text x={infoX} y={tiYongY} textAnchor="start" dominantBaseline="middle" fill="var(--c-gold)" style={{ fontSize: 16, fontWeight: 700 }}>
        体用生克
      </text>

      {/* 体卦（蓝） */}
      <g>
        <rect x={infoX} y={boxY} width={boxW} height={boxH} rx={8} fill="var(--chart-band)" stroke="var(--wz-water)" strokeWidth={2} />
        <text x={infoX + boxW / 2} y={boxY + boxH / 2 - 2} textAnchor="middle" dominantBaseline="middle" fill="var(--wz-water)" style={{ fontSize: 24, fontWeight: 700 }}>
          {bodyName}
        </text>
        <text x={infoX + boxW / 2} y={boxY - 6} textAnchor="middle" dominantBaseline="middle" fill="var(--wz-water)" style={{ fontSize: 10 }}>
          体卦
        </text>
      </g>

      {/* 关系箭头 + 标签 */}
      <line x1={arrX1} y1={boxY + boxH / 2} x2={arrX2} y2={boxY + boxH / 2} stroke="var(--chart-text-faint)" strokeWidth={2} markerEnd="url(#meihua-arrow)" />
      {relation && (
        <text x={(arrX1 + arrX2) / 2} y={boxY + boxH / 2 - 8} textAnchor="middle" dominantBaseline="middle" fill="var(--wz-fire)" style={{ fontSize: 15, fontWeight: 700 }}>
          {relation}
        </text>
      )}

      {/* 用卦（红） */}
      <g>
        <rect x={infoX + boxW + 28} y={boxY} width={boxW} height={boxH} rx={8} fill="var(--chart-deep)" stroke="var(--wz-fire)" strokeWidth={2} />
        <text x={infoX + boxW + 28 + boxW / 2} y={boxY + boxH / 2 - 2} textAnchor="middle" dominantBaseline="middle" fill="var(--wz-fire)" style={{ fontSize: 24, fontWeight: 700 }}>
          {useName}
        </text>
        <text x={infoX + boxW + 28 + boxW / 2} y={boxY - 6} textAnchor="middle" dominantBaseline="middle" fill="var(--wz-fire)" style={{ fontSize: 10 }}>
          用卦
        </text>
      </g>

      {/* 释义 */}
      {relHint && (
        <text x={infoX} y={boxY + boxH + 18} textAnchor="start" dominantBaseline="middle" fill="var(--chart-text-sub)" style={{ fontSize: 12 }}>
          释义: {relHint}
        </text>
      )}

      <defs>
        <marker id="meihua-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L10,5 L0,10 Z" fill="var(--chart-text-faint)" />
        </marker>
      </defs>
    </svg>
  );
}
