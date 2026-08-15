import type { YunqiData } from '@/legacy/canvasRenderers';

interface YunqiChartProps {
  data: YunqiData;
  size?: number;
}

const QI_COLORS: Record<string, string> = {
  厥阴风木: 'var(--wz-wood)',
  少阴君火: 'var(--wz-fire)',
  少阳相火: 'var(--c-cinnabar-deep)',
  太阴湿土: 'var(--wz-earth)',
  阳明燥金: 'var(--wz-metal)',
  太阳寒水: 'var(--wz-water)',
};
const QI_LIGHT: Record<string, string> = {
  厥阴风木: 'rgb(var(--wood) / 0.12)',
  少阴君火: 'rgb(var(--cinnabar) / 0.10)',
  少阳相火: 'rgb(var(--cinnabar-700) / 0.10)',
  太阴湿土: 'rgb(var(--earth) / 0.12)',
  阳明燥金: 'rgb(var(--metal) / 0.14)',
  太阳寒水: 'rgb(var(--water) / 0.12)',
};
const WX_COLORS: Record<string, string> = { 金: 'var(--wz-metal)', 木: 'var(--wz-wood)', 水: 'var(--wz-water)', 火: 'var(--wz-fire)', 土: 'var(--wz-earth)' };

function displayPatterns(data: YunqiData): string[] {
  const patterns = data.patterns;
  if (!patterns) return [];
  return [
    patterns.tianfu && '天符',
    patterns.suihui && '岁会',
    patterns.taiyiTianfu && '太一天符',
    patterns.tongTianfu && '同天符',
    patterns.tongSuihui && '同岁会',
    patterns.pingqi && '平气',
    patterns.qihua && `齐化${patterns.qihua}`,
    patterns.jianhua && `兼化${patterns.jianhua}`,
    `${patterns.zhengdui.qi}${patterns.zhengdui.type}`,
  ].filter(Boolean) as string[];
}

function transportText(steps: YunqiData['wuyun']['zhuyun']): string {
  return steps.map(({ element, taiShao }) => `${element}${taiShao}`).join('　');
}

export function YunqiChart({ data, size = 620 }: YunqiChartProps) {
  const W = size;
  const H = 510;
  const yearChars = `${data.tiangan}${data.dizhi}`;
  const currentStep = data.liuqi.current_step as { step?: string } | undefined;
  const patterns = displayPatterns(data);
  const steps = data.liuqi.zhuke;
  const gap = 5;
  const x0 = 20;
  const totalWidth = W - x0 * 2;
  const stepWidth = (totalWidth - gap * (steps.length - 1)) / Math.max(steps.length, 1);

  return (
    <svg data-testid="yunqi-chart" viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-[680px]" role="img" aria-label={`五运六气 ${data.year}年 ${yearChars}，查询日期${data.targetDate ?? ''}`}>
      <defs>
        <linearGradient id="yunqi-bg" x1="0" y1="0" x2="0" y2={H}>
          <stop offset="0" stopColor="var(--chart-surface)" />
          <stop offset="1" stopColor="var(--chart-inset)" />
        </linearGradient>
      </defs>
      <rect x={3} y={3} width={W - 6} height={H - 6} rx={10} fill="url(#yunqi-bg)" stroke="var(--chart-line-strong)" />
      <rect x={3} y={3} width={W - 6} height={34} rx={10} fill="var(--chart-deep)" />
      <text x={W / 2} y={20} textAnchor="middle" dominantBaseline="middle" fill="var(--c-gold)" style={{ fontSize: 15, fontWeight: 700 }}>五运六气 · {data.year}年 · {data.targetDate}</text>

      <text x={W / 2} y={72} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text)" style={{ fontSize: 40, fontWeight: 700, fontFamily: '"Noto Serif SC",serif' }}>{yearChars}</text>
      <text x={W / 2} y={104} textAnchor="middle" dominantBaseline="middle" fill="var(--c-gold)" style={{ fontSize: 14, fontWeight: 700 }}>{data.wuyun.dayun}</text>
      <text x={W / 2} y={126} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-faint)" style={{ fontSize: 10 }}>主运　{transportText(data.wuyun.zhuyun)}</text>
      <text x={W / 2} y={143} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-faint)" style={{ fontSize: 10 }}>客运　{transportText(data.wuyun.keyun)}</text>

      <line x1={30} y1={158} x2={W - 30} y2={158} stroke="var(--chart-line-strong)" strokeDasharray="3 3" />
      <rect x={W / 2 - 182} y={172} width={175} height={28} rx={6} fill="var(--chart-deep)" stroke="var(--wz-fire)" />
      <text x={W / 2 - 95} y={186} textAnchor="middle" dominantBaseline="middle" fill="var(--wz-fire)" style={{ fontSize: 12, fontWeight: 700 }}>司天　{data.liuqi.sitian}</text>
      <rect x={W / 2 + 7} y={172} width={175} height={28} rx={6} fill="var(--chart-deep)" stroke="var(--wz-earth)" />
      <text x={W / 2 + 95} y={186} textAnchor="middle" dominantBaseline="middle" fill="var(--wz-earth)" style={{ fontSize: 12, fontWeight: 700 }}>在泉　{data.liuqi.zaiquan}</text>

      <text x={W / 2} y={220} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-faint)" style={{ fontSize: 11 }}>客气六步 · 查询日期所在步位以金边标出</text>
      {steps.map((step, index) => {
        const x = x0 + index * (stepWidth + gap);
        const color = QI_COLORS[step.qi] ?? 'var(--chart-text-faint)';
        const active = step.step === currentStep?.step;
        return (
          <g key={step.step}>
            <rect x={x} y={235} width={stepWidth} height={136} rx={6} fill={QI_LIGHT[step.qi] ?? 'var(--chart-inset)'} stroke={active ? 'var(--c-gold)' : color} strokeWidth={active ? 2.5 : 1.2} />
            <rect x={x + 1} y={236} width={stepWidth - 2} height={6} rx={3} fill={color} />
            {active && <text x={x + stepWidth / 2} y={255} textAnchor="middle" dominantBaseline="middle" fill="var(--c-gold)" style={{ fontSize: 8, fontWeight: 700 }}>当前所处</text>}
            <text x={x + stepWidth / 2} y={active ? 274 : 260} textAnchor="middle" dominantBaseline="middle" fill={color} style={{ fontSize: 11, fontWeight: 700 }}>{step.qi}</text>
            <text x={x + stepWidth / 2} y={294} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-mid)" style={{ fontSize: 10 }}>{step.step}</text>
            <text x={x + stepWidth / 2} y={313} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-faint)" style={{ fontSize: 8 }}>{step.startDate}</text>
            <text x={x + stepWidth / 2} y={329} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-faint)" style={{ fontSize: 8 }}>至 {step.endDate} 前</text>
            <text x={x + stepWidth / 2} y={351} textAnchor="middle" dominantBaseline="middle" fill={color} style={{ fontSize: 9 }}>主气 {step.zhuqi}</text>
          </g>
        );
      })}

      <text x={W / 2} y={401} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-faint)" style={{ fontSize: 11 }}>传统运气格局</text>
      {patterns.length ? <text x={W / 2} y={421} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text)" style={{ fontSize: 11, fontWeight: 700 }}>{patterns.join('　')}</text> : <text x={W / 2} y={421} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text)" style={{ fontSize: 11, fontWeight: 700 }}>未见特别格局标识</text>}
      <rect x={30} y={440} width={W - 60} height={38} rx={7} fill="var(--chart-deep)" stroke="var(--chart-line-strong)" />
      <text x={W / 2} y={459} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-faint)" style={{ fontSize: 10 }}>{data.observation}</text>
      <text x={W / 2} y={493} textAnchor="middle" dominantBaseline="middle" fill="var(--chart-text-faint)" style={{ fontSize: 9 }}>五行：{Object.entries(WX_COLORS).map(([element]) => element).join('　')}</text>
    </svg>
  );
}
