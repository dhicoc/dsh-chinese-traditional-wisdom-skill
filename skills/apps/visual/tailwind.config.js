/** @type {import('tailwindcss').Config} */
/*
 * 观象台 · 宋韵极简（宣纸主题）
 * 设计原则见项目根目录 .impeccable.md：
 * 纸为底，墨为骨 · 朱砂不过三 · 简繁两便 · 字即装饰 · 静而微动
 *
 * 架构：颜色全部走 CSS 变量（rgb 三元组 + <alpha-value>），
 * 变量值在 globals.css 的 :root 分派（单一浅色主题）。
 *
 * token 语义：
 *   ink  → 纸面层级（950=主背景 … 600=结构线）
 *   jade → 墨文字（50 最浓 … 400 淡墨）+ 松烟绿点缀（500–600）
 *   gold → 鎏金；cinnabar → 朱砂；wuxing → 五行矿物色
 *   white→ 墨色；black → 暖影
 *   —— border-white/10、bg-black/30 等 opacity 工具类语义即发丝墨线 / 纸面下沉
 */
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: v('--ink-950'), // 主背景位
          900: v('--ink-900'), // 浮起面
          850: v('--ink-850'), // 沉下面
          800: v('--ink-800'), // 深面
          700: v('--ink-700'), // 发丝线
          600: v('--ink-600'), // 结构线
        },
        jade: {
          50: v('--jade-50'),   // 最浓文字
          100: v('--jade-100'), // 主文字
          200: v('--jade-200'),
          300: v('--jade-300'),
          400: v('--jade-400'), // 次文字
          500: v('--jade-500'), // 松烟绿·点缀
          600: v('--jade-600'),
        },
        cinnabar: {
          500: v('--cinnabar-500'),
          600: v('--cinnabar-600'),
          700: v('--cinnabar-700'),
        },
        gold: {
          400: v('--gold-400'),
          500: v('--gold-500'),
          600: v('--gold-600'),
        },
        talisman: {
          400: v('--talisman-400'),
          500: v('--talisman-500'),
          600: v('--talisman-600'),
        },
        wuxing: {
          wood: v('--wood'),
          fire: v('--fire'),
          earth: v('--earth'),
          metal: v('--metal'),
          water: v('--water'),
        },
        // 语义翻转对：随主题互换亮暗
        white: v('--white'),
        black: v('--black'),
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Consolas', 'monospace'],
        serif: ['"Noto Serif SC"', '"Songti SC"', 'STSong', 'STZhongsong', 'SimSun', 'serif'],
      },
      borderRadius: {
        panel: '2px',
        card: '2px',
      },
      boxShadow: {
        instrument: '0 1px 0 rgb(var(--shadow-rgb) / 0.03), 0 14px 36px rgb(var(--shadow-rgb) / 0.08)',
        glowJade: '0 0 0 1px rgb(var(--jade) / 0.16)',
      },
    },
  },
  plugins: [],
};
