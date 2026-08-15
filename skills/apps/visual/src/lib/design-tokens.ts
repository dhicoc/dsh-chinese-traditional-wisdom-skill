/**
 * 观象台 · 宋韵极简（宣纸主题）设计 token（语义参考）
 *
 * 注意：本文件是「语义 → CSS 变量」的权威对照表（文档性模块），
 * 实际变量值在 src/styles/globals.css 的 :root 分派（单一浅色主题）。
 * SVG 组件直接引用 var(--chart-*) / var(--wz-*)；
 * Canvas/JS 侧经 getComputedStyle 读取计算值（参考 DynamicTianPanBackground）。
 */
export const designTokens = {
  colors: {
    background: 'var(--chart-page)',      // 主背景（宣纸 / 深夜暖墨）
    backgroundRaised: 'var(--chart-bg)',
    surface: 'var(--chart-surface)',      // 浮起面
    surfaceRaised: 'var(--chart-inset)',  // 沉下面
    border: 'var(--chart-line)',          // 发丝线
    ink: 'var(--chart-text)',             // 主文字/主线条
    inkSoft: 'var(--chart-text-mid)',     // 次要文字
    cinnabar: 'var(--c-cinnabar)',        // 朱砂
    jade: 'var(--c-jade)',                // 松烟绿
    gold: 'var(--c-gold)',                // 鎏金
    talisman: 'var(--c-gold)',            // 鎏金别名
    wuxing: {
      wood: 'var(--wz-wood)',
      fire: 'var(--wz-fire)',
      earth: 'var(--wz-earth)',
      metal: 'var(--wz-metal)',
      water: 'var(--wz-water)',
    },
  },
  radius: {
    panel: '2px',
    card: '2px',
    control: '2px',
  },
} as const;
