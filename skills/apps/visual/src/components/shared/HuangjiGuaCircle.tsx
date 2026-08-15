import { useState } from 'react';

/**
 * HuangjiGuaCircle — 皇极经世先天六十四卦圆图 SVG
 *
 * 邵雍先天六十四卦圆图。双环布局：
 * - 外环：64卦名沿圆切线方向旋转排列，所有卦名都显示（淡色），高亮卦加粗着色
 * - 内环：64卦6爻小图（阳实阴虚），径向朝心
 * - 中心：会/运/世 + 积年 + 选中卦，分区清晰
 *
 * 文字质量：卦名按圆心角旋转、textAnchor 居中，左右两侧文字不会挤入圆内；
 * 中心文字分行固定间距，字号梯级（标题>周期>积年>选中卦）。
 */

// 先天六十四卦序（邵雍圆图顺序，乾起逆时针）
const XIANTIAN_64: string[] =
  '乾,夬,大有,大壯,小畜,需,大畜,泰,履,兌,睽,歸妹,中孚,節,損,臨,同人,革,離,豐,家人,既濟,賁,明夷,无妄,隨,噬嗑,震,益,屯,頤,復,姤,大過,鼎,恆,巽,井,蠱,升,訟,困,未濟,解,渙,坎,蒙,師,遯,咸,旅,小過,漸,蹇,艮,謙,否,萃,晉,豫,觀,比,剝,坤'.split(',');

// 64卦6位爻码（7阳8阴，从下到上）——与 huangjiEngine GUA_CODE 同源
const GUA_CODE: Record<string, string> = {
  '乾': '777777', '坤': '888888', '屯': '787877', '蒙': '778787',
  '需': '777787', '訟': '787777', '師': '888787', '比': '787888',
  '小畜': '788777', '履': '777887', '泰': '888777', '否': '777888',
  '同人': '777878', '大有': '878777', '謙': '888778', '豫': '877888',
  '隨': '887877', '蠱': '778788', '臨': '888887', '觀': '788888',
  '噬嗑': '878877', '賁': '778878', '剝': '888778', '復': '877888',
  '无妄': '777877', '大畜': '778777', '頤': '778877', '大過': '887788',
  '坎': '787787', '離': '878878', '咸': '887778', '恆': '788877',
  '遯': '777778', '大壯': '877777', '晉': '888878', '明夷': '878888',
  '家人': '788878', '睽': '878887', '蹇': '787778', '解': '877787',
  '損': '778887', '益': '788877', '夬': '887777', '姤': '777788',
  '萃': '888887', '升': '788888', '困': '787887', '井': '788787',
  '革': '878887', '鼎': '788878', '震': '877877', '艮': '778778',
  '漸': '788778', '歸妹': '887877', '豐': '878877', '旅': '778878',
  '巽': '788788', '兌': '887887', '渙': '788787', '節': '787887',
  '中孚': '887788', '小過': '778877', '既濟': '787878', '未濟': '878787',
};

export interface HuangjiGuaCircleProps {
  /** 当前正卦（金色高亮） */
  zhengGua: string;
  /** 当前世卦（玉色高亮） */
  shiGua: string;
  /** 当前年卦（朱砂色高亮） */
  yearGua: string;
  /** 会/运/世（中心显示） */
  hui: number;
  yun: number;
  shi: number;
  /** 积年（中心显示） */
  acumYear: number;
  /** viewBox 尺寸，默认 520 */
  size?: number;
}

// 高亮类型配色
const HIGHLIGHT: Record<string, { ring: string; label: string; text: string; bg: string }> = {
  zheng: { ring: 'var(--c-gold)', label: '正卦', text: 'var(--wz-earth)', bg: 'rgb(var(--earth) / 0.12)' },   // 金
  shi: { ring: 'var(--c-jade)', label: '世卦', text: 'var(--wz-wood)', bg: 'rgb(var(--wood) / 0.12)' },      // 玉
  year: { ring: 'var(--c-cinnabar-deep)', label: '年卦', text: 'var(--wz-fire)', bg: 'rgb(var(--cinnabar) / 0.12)' },     // 朱砂
};

export function HuangjiGuaCircle({ zhengGua, shiGua, yearGua, hui, yun, shi, acumYear, size = 520 }: HuangjiGuaCircleProps) {
  const [selected, setSelected] = useState<string>(zhengGua);
  // viewBox 下方留 48 单位给三卦总览+图例，避免与最下方卦名重叠
  const legendSpace = 48;
  const viewH = size + legendSpace;
  const cx = size / 2;
  const cy = size / 2;
  // 双环几何
  const nameRadius = size / 2 - 16;      // 卦名所在环半径
  const guaRadius = size / 2 - 58;       // 爻象所在环半径
  const innerRadius = guaRadius - 32;    // 中心圆半径
  const sector = (2 * Math.PI) / 64;     // 每卦占的角度

  // 一卦可兼任多角色（如正卦=年卦），返回全部角色
  const rolesOf = (name: string): Array<keyof typeof HIGHLIGHT> => {
    const roles: Array<keyof typeof HIGHLIGHT> = [];
    if (name === zhengGua) roles.push('zheng');
    if (name === shiGua) roles.push('shi');
    if (name === yearGua) roles.push('year');
    return roles;
  };
  // 爻象着色优先级：年卦（最具体）> 世卦 > 正卦
  const primaryRoleOf = (name: string): keyof typeof HIGHLIGHT | null => {
    const roles = rolesOf(name);
    if (roles.includes('year')) return 'year';
    if (roles.includes('shi')) return 'shi';
    if (roles.includes('zheng')) return 'zheng';
    return null;
  };

  const selectedRoles = rolesOf(selected);
  const selectedHL = primaryRoleOf(selected);

  return (
    <svg
      viewBox={`0 0 ${size} ${viewH}`}
      className="h-auto w-full select-none"
      data-testid="huangji-gua-circle"
      role="img"
      aria-label="皇极经世先天六十四卦圆图"
    >
      <defs>
        <radialGradient id="hj-center-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--chart-surface)" />
          <stop offset="100%" stopColor="var(--chart-inset)" />
        </radialGradient>
      </defs>

      {/* 外圈装饰双环 */}
      <circle cx={cx} cy={cy} r={nameRadius + 8} fill="none" stroke="var(--wz-earth)" strokeWidth={0.8} strokeOpacity={0.3} />
      <circle cx={cx} cy={cy} r={nameRadius - 6} fill="none" stroke="var(--wz-earth)" strokeWidth={0.4} strokeOpacity={0.18} />
      <circle cx={cx} cy={cy} r={guaRadius + 10} fill="none" stroke="var(--wz-earth)" strokeWidth={0.4} strokeOpacity={0.15} />

      {/* 64卦围圈 */}
      {XIANTIAN_64.map((name, i) => {
        // 乾在正上方（-90°），顺时针排列
        const angle = -Math.PI / 2 + i * sector;
        const midAngle = angle + sector / 2;
        const roles = rolesOf(name);
        const hl = primaryRoleOf(name);
        const isSel = name === selected;
        const code = GUA_CODE[name] ?? '777777';

        // 卦名位置
        const nx = cx + nameRadius * Math.cos(midAngle);
        const ny = cy + nameRadius * Math.sin(midAngle);
        const gx = cx + guaRadius * Math.cos(midAngle);
        const gy = cy + guaRadius * Math.sin(midAngle);

        // 卦名沿切线旋转（与圆平行），左右半圆翻转正读；
        // 仅高亮三卦 + 选中卦显示文字（圆图保持干净），普通卦 hover 通过 title 提示
        const degRaw = (midAngle * 180) / Math.PI;
        const degNorm = (degRaw + 360) % 360;
        let rotDeg = degRaw + 90;                            // 真实切线方向，与圆完全平行
        if (degNorm > 90 && degNorm < 270) rotDeg += 180;    // 左半圆翻转，正读
        const showName = roles.length > 0 || isSel;          // 仅高亮/选中显示文字

        // 爻象小图：6爻径向排列（内爻靠近圆心、外爻靠外），宽沿切线
        const yaoLen = 11;
        const yaoThick = 1.9;
        const yaoGap = 1.1;
        const guaRotDeg = degRaw;

        return (
          <g key={name}>
            {/* 高亮扇形背景（任一角色即高亮；多角色用年卦色） */}
            {roles.length > 0 && (
              <path
                d={describeSector(cx, cy, guaRadius + 11, innerRadius + 2, angle, angle + sector)}
                fill={HIGHLIGHT[hl!].bg}
                stroke="none"
              />
            )}

            {/* 卦名（仅高亮三卦 + 选中卦显示，沿切线旋转正读；大字清晰） */}
            {showName && (
              <g
                transform={`translate(${nx} ${ny}) rotate(${rotDeg})`}
                className="cursor-pointer"
                onClick={() => setSelected(name)}
              >
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill={hl ? HIGHLIGHT[hl].text : 'var(--chart-text)'}
                  style={{ fontFamily: '"Noto Serif SC","Songti SC",serif' }}
                >
                  {name}
                </text>
              </g>
            )}

            {/* 爻象小图（内环，径向排列，hover 显示卦名 tooltip） */}
            <g
              transform={`translate(${gx} ${gy}) rotate(${guaRotDeg})`}
              className="cursor-pointer"
              onClick={() => setSelected(name)}
            >
              <title>{name}</title>
              {code.split('').map((c, yi) => {
                // yi=0 初爻在最内（靠近圆心，局部 y 负方向），yi=5 上爻在最外
                const yy = -(5 - yi) * (yaoThick + yaoGap) + (5 * (yaoThick + yaoGap)) / 2 - (yaoThick + yaoGap) / 2;
                const isYang = c === '7';
                const fill = hl ? HIGHLIGHT[hl].ring : isSel ? 'var(--wz-water)' : 'var(--chart-text-faint)';
                const op = hl ? 1 : isSel ? 0.9 : 0.65;
                return isYang ? (
                  <rect key={yi} x={-yaoLen / 2} y={yy} width={yaoLen} height={yaoThick} fill={fill} fillOpacity={op} rx={0.3} />
                ) : (
                  <g key={yi} fill={fill} fillOpacity={op}>
                    <rect x={-yaoLen / 2} y={yy} width={yaoLen * 0.42} height={yaoThick} rx={0.3} />
                    <rect x={yaoLen * 0.08} y={yy} width={yaoLen * 0.42} height={yaoThick} rx={0.3} />
                  </g>
                );
              })}
              {/* 高亮卦外环描边 */}
              {hl && (
                <circle r={13} fill="none" stroke={HIGHLIGHT[hl].ring} strokeWidth={1.4} strokeOpacity={0.85} />
              )}
            </g>
          </g>
        );
      })}

      {/* 中心信息圆 */}
      <circle cx={cx} cy={cy} r={innerRadius} fill="url(#hj-center-bg)" stroke="var(--wz-earth)" strokeWidth={1} strokeOpacity={0.4} />
      <circle cx={cx} cy={cy} r={innerRadius - 4} fill="none" stroke="var(--wz-earth)" strokeWidth={0.4} strokeOpacity={0.2} />

      {/* 中心文字：分区固定间距，字号梯级 */}
      <text x={cx} y={cy - 34} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--wz-earth)"
        style={{ fontFamily: '"Noto Serif SC","Songti SC",serif' }}>
        皇极经世
      </text>
      <line x1={cx - 22} y1={cy - 24} x2={cx + 22} y2={cy - 24} stroke="var(--wz-earth)" strokeWidth={0.5} strokeOpacity={0.4} />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={10} fill="var(--chart-text-mid)">
        第 {hui} 会 · 第 {yun} 运 · 第 {shi} 世
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize={9} fill="var(--chart-text-faint)" letterSpacing={0.5}>
        积年 {acumYear}
      </text>
      <line x1={cx - 22} y1={cy + 18} x2={cx + 22} y2={cy + 18} stroke="var(--wz-earth)" strokeWidth={0.5} strokeOpacity={0.4} />
      {/* 选中卦名 */}
      <text x={cx} y={cy + 36} textAnchor="middle" fontSize={16} fontWeight={700}
        fill={selectedHL ? HIGHLIGHT[selectedHL].text : 'var(--chart-text)'}
        style={{ fontFamily: '"Noto Serif SC","Songti SC",serif' }}>
        {selected}
      </text>
      {selectedRoles.length > 0 && (
        <text x={cx} y={cy + 50} textAnchor="middle" fontSize={8.5} letterSpacing={1}
          fill={HIGHLIGHT[selectedRoles[selectedRoles.length - 1]].ring}>
          {selectedRoles.map((r) => HIGHLIGHT[r].label).join('·')}
        </text>
      )}

      {/* 三卦当前值总览（圆外，始终可见，解决多角色重叠时看不到年卦） */}
      <g transform={`translate(${cx} ${size + 12})`} fontSize={10} textAnchor="middle">
        <text x={-80} y={0} fill={HIGHLIGHT.zheng.text} fontWeight={600} style={{ fontFamily: '"Noto Serif SC","Songti SC",serif' }}>
          正卦 {zhengGua}
        </text>
        <text x={0} y={0} fill={HIGHLIGHT.shi.text} fontWeight={600} style={{ fontFamily: '"Noto Serif SC","Songti SC",serif' }}>
          世卦 {shiGua}
        </text>
        <text x={80} y={0} fill={HIGHLIGHT.year.text} fontWeight={600} style={{ fontFamily: '"Noto Serif SC","Songti SC",serif' }}>
          年卦 {yearGua}
        </text>
      </g>

      {/* 图例（圆外底部居中，三列等距，避开卦名环） */}
      <g transform={`translate(${cx} ${size + 26})`} fontSize={8} fill="var(--chart-text-faint)">
        <g transform="translate(-92 0)">
          <circle cx={0} cy={0} r={4.5} fill="none" stroke="var(--c-gold)" strokeWidth={1.3} />
          <text x={9} y={3.2}>正卦·主运</text>
        </g>
        <g transform="translate(-28 0)">
          <circle cx={0} cy={0} r={4.5} fill="none" stroke="var(--c-jade)" strokeWidth={1.3} />
          <text x={9} y={3.2}>世卦·主世</text>
        </g>
        <g transform="translate(36 0)">
          <circle cx={0} cy={0} r={4.5} fill="none" stroke="var(--c-cinnabar-deep)" strokeWidth={1.3} />
          <text x={9} y={3.2}>年卦·本年</text>
        </g>
      </g>
    </svg>
  );
}

/**
 * 描述一个扇形（环形切片）路径：从 angle1 到 angle2，外半径 outerR 到内半径 innerR。
 * 用于高亮卦的扇区背景。
 */
function describeSector(cx: number, cy: number, outerR: number, innerR: number, angle1: number, angle2: number): string {
  const p1x = cx + outerR * Math.cos(angle1);
  const p1y = cy + outerR * Math.sin(angle1);
  const p2x = cx + outerR * Math.cos(angle2);
  const p2y = cy + outerR * Math.sin(angle2);
  const p3x = cx + innerR * Math.cos(angle2);
  const p3y = cy + innerR * Math.sin(angle2);
  const p4x = cx + innerR * Math.cos(angle1);
  const p4y = cy + innerR * Math.sin(angle1);
  const large = angle2 - angle1 > Math.PI ? 1 : 0;
  return [
    `M ${p1x} ${p1y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${p2x} ${p2y}`,
    `L ${p3x} ${p3y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${p4x} ${p4y}`,
    'Z',
  ].join(' ');
}
