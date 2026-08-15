import { useEffect, useRef } from 'react';

/**
 * 玄机天象背景 — Canvas 2D 粒子系统
 *
 * 四层融合，从远到近、从天到气：
 *  ① 星宿流光层：二十八宿星点明灭 + 紫微垣 + 偶发流星
 *  ② 符箓水墨层：朱砂符字浮现消散 + 水墨晕染扩散
 *  ③ 太极八卦层：居中缓慢旋转太极图 + 八卦爻线环绕
 *  ④ 五行粒子层：五色粒子按相生方向(木火土金水)旋涡流动
 *
 * 设计原则：
 *  - 背景永远是背景：所有层 opacity ≤ 0.35，不抢前景
 *  - 节奏分层：星宿慢(分钟级)、符箓中(十几秒)、太极慢转(60s/圈)、粒子(秒级)
 *  - 配色守一：严格用 design-tokens 五行色 + 朱砂 + 鎏金
 *  - 可访问性：aria-hidden、prefers-reduced-motion 下只绘制静态星图
 *  - 性能：单 Canvas + rAF，粒子 ~150，星点预生成，DPR 自适应
 */

// ─── 配色（从 CSS 变量读取，宣纸主题分派）─────────────────
// Canvas 2D 不解析 var()，需经 getComputedStyle 取计算值；
// 初始化读取一次即可，单一主题无需监听变化。
const COLORS = {
  bg: '#f3eee1',
  bgInner: '#f6f2e7',
  cinnabar: '#b23a26',
  jade: '#3d6053',
  gold: '#8a6d35',
  wood: '#4a7250',
  fire: '#b23a26',
  earth: '#a67c44',
  metal: '#857c6c',
  water: '#3d5a6e',
};

const COLOR_VAR_MAP = {
  bg: '--chart-page',
  bgInner: '--chart-bg',
  cinnabar: '--c-cinnabar',
  jade: '--c-jade',
  gold: '--c-gold',
  wood: '--wz-wood',
  fire: '--wz-fire',
  earth: '--wz-earth',
  metal: '--wz-metal',
  water: '--wz-water',
} as const;

/** 从 CSS 变量刷新调色板；返回是否有实际变化 */
function refreshThemeColors(): void {
  const style = getComputedStyle(document.documentElement);
  (Object.keys(COLOR_VAR_MAP) as Array<keyof typeof COLOR_VAR_MAP>).forEach((key) => {
    const value = style.getPropertyValue(COLOR_VAR_MAP[key]).trim();
    if (value) COLORS[key] = value;
  });
}

/** 读取三元组变量（如 --gold: "138 109 53"）并合成 rgba() 字符串 */
function cssRgba(varName: string, alpha: number): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const triplet = raw ? raw.split(/\s+/).join(',') : '138,109,53';
  return `rgba(${triplet},${alpha})`;
}

// ─── 二十八宿（简化选取，凑成星图）─────────────────
const STARS_28 = [
  '角', '亢', '氐', '房', '心', '尾', '箕', // 东方苍龙
  '斗', '牛', '女', '虚', '危', '室', '壁', // 北方玄武
  '奎', '娄', '胃', '昴', '毕', '觜', '参', // 西方白虎
  '井', '鬼', '柳', '星', '张', '翼', '轸', // 南方朱雀
];

// ─── 符箓字符（道家常用符文）─────────────────
const RUNES = ['乾', '坤', '震', '巽', '坎', '离', '艮', '兑', '雷', '水', '火', '风', '令', '敕', '罡', '炁'];

// ─── 八卦爻象（从下到上爻线，true=阳爻，false=阴爻）─────────────────
const BAGUA = [
  { name: '乾', lines: [true, true, true] }, // ☰ 三阳
  { name: '兑', lines: [true, true, false] }, // ☱ 上阴
  { name: '离', lines: [true, false, true] }, // ☲ 中阴
  { name: '震', lines: [true, false, false] }, // ☳ 初阳
  { name: '巽', lines: [false, true, true] }, // ☴ 初阴
  { name: '坎', lines: [false, true, false] }, // ☵ 中阳
  { name: '艮', lines: [false, false, true] }, // ☶ 上阳
  { name: '坤', lines: [false, false, false] }, // ☷ 三阴
];

// ─── 五行相生顺序（存 key，绘制时实时解析 COLORS，主题切换即时生效）─────────────────
const WUXING_CYCLE = [
  { key: 'wood' },
  { key: 'fire' },
  { key: 'earth' },
  { key: 'metal' },
  { key: 'water' },
] as const;

interface Star {
  x: number;
  y: number;
  size: number;
  phase: number; // 明灭相位
  speed: number;
  label?: string;
  bright: boolean; // 紫微垣亮星
}

interface RuneMark {
  x: number;
  y: number;
  char: string;
  size: number;
  phase: number;
  speed: number;
  rotation: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  elementIndex: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface InkBlot {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  colorKey: 'cinnabar' | 'gold' | 'jade';
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** 生成静态星图（含二十八宿标签 + 紫微垣亮星） */
function generateStars(w: number, h: number): Star[] {
  const stars: Star[] = [];
  // 二十八宿：沿椭圆分布，带标签
  STARS_28.forEach((label, i) => {
    const angle = (i / STARS_28.length) * Math.PI * 2;
    const rx = w * 0.42;
    const ry = h * 0.42;
    const cx = w / 2;
    const cy = h / 2;
    stars.push({
      x: cx + Math.cos(angle) * rx + rand(-30, 30),
      y: cy + Math.sin(angle) * ry + rand(-30, 30),
      size: rand(1.2, 2.2),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.003, 0.008),
      label,
      bright: false,
    });
  });
  // 紫微垣亮星：中央偏上区域，少量明亮
  for (let i = 0; i < 14; i++) {
    stars.push({
      x: rand(w * 0.3, w * 0.7),
      y: rand(h * 0.25, h * 0.55),
      size: rand(1.8, 3),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.005, 0.012),
      bright: true,
    });
  }
  // 散布小星
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: rand(0, w),
      y: rand(0, h),
      size: rand(0.5, 1.4),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.002, 0.006),
      bright: false,
    });
  }
  return stars;
}

function generateRunes(w: number, h: number): RuneMark[] {
  const runes: RuneMark[] = [];
  for (let i = 0; i < 10; i++) {
    runes.push({
      x: rand(w * 0.05, w * 0.95),
      y: rand(h * 0.05, h * 0.95),
      char: RUNES[Math.floor(rand(0, RUNES.length))],
      size: rand(22, 34),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.0008, 0.0018),
      rotation: rand(-0.3, 0.3),
    });
  }
  return runes;
}

/** 画太极图（含阴阳鱼） */
function drawTaiji(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rotation: number, alpha: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.globalAlpha = alpha;

  // 外圈描边
  ctx.strokeStyle = COLORS.jade;
  ctx.lineWidth = 1;
  ctx.globalAlpha = alpha * 0.5;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // 阴阳鱼
  ctx.globalAlpha = alpha * 0.35;
  // 阳鱼（右明）
  ctx.fillStyle = COLORS.metal;
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);
  ctx.arc(0, -r / 2, r / 2, Math.PI / 2, -Math.PI / 2);
  ctx.fill();
  // 阴鱼（左暗）
  ctx.fillStyle = COLORS.bg;
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2);
  ctx.arc(0, -r / 2, r / 2, -Math.PI / 2, Math.PI / 2, true);
  ctx.arc(0, r / 2, r / 2, -Math.PI / 2, Math.PI / 2);
  ctx.fill();

  // 鱼眼
  ctx.fillStyle = COLORS.metal;
  ctx.globalAlpha = alpha * 0.5;
  ctx.beginPath();
  ctx.arc(0, -r / 2, r / 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.bg;
  ctx.beginPath();
  ctx.arc(0, r / 2, r / 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** 画八卦爻线环 */
function drawBaguaRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rotation: number, alpha: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.globalAlpha = alpha;

  BAGUA.forEach((g, i) => {
    const angle = (i / BAGUA.length) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    // 三条爻线，从内到外
    g.lines.forEach((yang, lineIdx) => {
      const lineR = r + 8 + lineIdx * 6;
      const lx = Math.cos(angle) * lineR;
      const ly = Math.sin(angle) * lineR;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(angle + Math.PI / 2);
      ctx.strokeStyle = yang ? COLORS.jade : COLORS.gold;
      ctx.lineWidth = yang ? 2 : 2;
      ctx.globalAlpha = alpha * 0.4;
      if (yang) {
        // 阳爻：一长横
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(7, 0);
        ctx.stroke();
      } else {
        // 阴爻：两短横
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(-2, 0);
        ctx.moveTo(2, 0);
        ctx.lineTo(7, 0);
        ctx.stroke();
      }
      ctx.restore();
    });
  });
  ctx.restore();
}

export function DynamicTianPanBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const motionOverride = new URLSearchParams(window.location.search).get('motion') || localStorage.getItem('tianpan-motion');
    // 动态背景是观赏性核心体验，默认始终开启；仅在用户显式 ?motion=off / localStorage=tianpan-motion=off 时关闭
    // （不再跟随系统 prefers-reduced-motion，避免玄学工具台背景被系统辅助设置误停）
    void 0;
    const reduced = motionOverride === 'off' || motionOverride === 'reduce';
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let runes: RuneMark[] = [];
    const particles: Particle[] = [];
    const meteors: Meteor[] = [];
    const inks: InkBlot[] = [];

    function resize() {
      if (!canvas || !ctx) return;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = generateStars(w, h);
      runes = generateRunes(w, h);
    }

    function spawnParticle() {
      const cx = w / 2;
      const cy = h / 2;
      const angle = rand(0, Math.PI * 2);
      const dist = rand(Math.min(w, h) * 0.15, Math.min(w, h) * 0.48);
      const elementIndex = Math.floor(rand(0, WUXING_CYCLE.length));
      // 相生方向：木→火→土→金→水→木，即顺时针环流
      const flowAngle = angle + Math.PI / 2 + rand(-0.3, 0.3);
      const speed = rand(0.3, 0.8);
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: Math.cos(flowAngle) * speed,
        vy: Math.sin(flowAngle) * speed,
        life: 0,
        maxLife: rand(300, 600),
        size: rand(1, 2.4),
        elementIndex,
      });
    }

    function spawnMeteor() {
      const fromTop = Math.random() < 0.5;
      meteors.push({
        x: rand(0, w),
        y: fromTop ? -20 : rand(0, h * 0.3),
        vx: rand(2, 4) * (Math.random() < 0.5 ? 1 : -1),
        vy: rand(2, 4),
        life: 0,
        maxLife: rand(40, 70),
      });
    }

    function spawnInk() {
      const colorKeys = ['cinnabar', 'gold', 'jade'] as const;
      inks.push({
        x: rand(w * 0.1, w * 0.9),
        y: rand(h * 0.1, h * 0.9),
        radius: 0,
        maxRadius: rand(60, 140),
        life: 0,
        maxLife: rand(200, 400),
        colorKey: colorKeys[Math.floor(rand(0, colorKeys.length))],
      });
    }

    function drawStars(t: number) {
      if (!ctx) return;
      stars.forEach((s) => {
        const twinkle = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        const a = (s.bright ? 0.55 : 0.3) * twinkle;
        ctx.globalAlpha = a;
        ctx.fillStyle = s.bright ? COLORS.jade : COLORS.metal;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        if (s.label) {
          ctx.globalAlpha = a * 0.5;
          ctx.fillStyle = COLORS.jade;
          ctx.font = '10px "Noto Serif CJK SC", serif';
          ctx.fillText(s.label, s.x + 4, s.y + 3);
        }
      });
      ctx.globalAlpha = 1;
    }

    function drawRunes(t: number) {
      if (!ctx) return;
      runes.forEach((r) => {
        const phase = (t * r.speed + r.phase) % (Math.PI * 2);
        // 浮现消散：sin 曲线，只在中间段可见
        const visibility = Math.sin(phase);
        if (visibility <= 0) return;
        const a = visibility * 0.25;
        ctx.globalAlpha = a;
        ctx.fillStyle = COLORS.cinnabar;
        ctx.font = `${r.size}px "Noto Serif CJK SC", serif`;
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rotation);
        ctx.fillText(r.char, 0, 0);
        ctx.restore();
      });
      ctx.globalAlpha = 1;
    }

    function drawInks() {
      if (!ctx) return;
      for (let i = inks.length - 1; i >= 0; i--) {
        const ink = inks[i];
        ink.life++;
        const p = ink.life / ink.maxLife;
        if (p >= 1) {
          inks.splice(i, 1);
          continue;
        }
        ink.radius = ink.maxRadius * (1 - Math.pow(1 - p, 3));
        const a = (1 - p) * 0.08;
        ctx.globalAlpha = a;
        ctx.fillStyle = COLORS[ink.colorKey];
        ctx.beginPath();
        ctx.arc(ink.x, ink.y, ink.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawMeteors() {
      if (!ctx) return;
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life++;
        m.x += m.vx;
        m.y += m.vy;
        if (m.life >= m.maxLife) {
          meteors.splice(i, 1);
          continue;
        }
        const a = (1 - m.life / m.maxLife) * 0.7;
        const tailLen = 40;
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tailLen / 4, m.y - m.vy * tailLen / 4);
        grad.addColorStop(0, cssRgba('--gold', a));
        grad.addColorStop(1, cssRgba('--gold', 0));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * tailLen / 4, m.y - m.vy * tailLen / 4);
        ctx.stroke();
        // 头部光点
        ctx.globalAlpha = a;
        ctx.fillStyle = COLORS.metal;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    function drawParticles() {
      if (!ctx) return;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        // 轻微向心引力，形成旋涡
        const cx = w / 2;
        const cy = h / 2;
        const dx = cx - p.x;
        const dy = cy - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        p.vx += (dx / dist) * 0.002;
        p.vy += (dy / dist) * 0.002;

        if (p.life >= p.maxLife || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
          particles.splice(i, 1);
          continue;
        }
        const lifeP = p.life / p.maxLife;
        const a = Math.sin(lifeP * Math.PI) * 0.5;
        const el = WUXING_CYCLE[p.elementIndex];
        ctx.globalAlpha = a;
        ctx.fillStyle = COLORS[el.key];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    let rafId = 0;

    function frame(t: number) {
      if (!ctx || !canvas) return;
      // 清屏（带渐变底，色值随主题）
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.2);
      bgGrad.addColorStop(0, COLORS.bgInner);
      bgGrad.addColorStop(1, COLORS.bg);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // ② 星宿层（最远）
      drawStars(t);

      // 流星（偶发）
      if (!reduced && Math.random() < 0.004) spawnMeteor();
      drawMeteors();

      // ② 符箓水墨层
      drawInks();
      if (!reduced && inks.length < 4 && Math.random() < 0.008) spawnInk();
      drawRunes(t);

      // ③ 太极八卦层（中心）
      const cx = w / 2;
      const cy = h / 2;
      const baseR = Math.min(w, h) * 0.12;
      const taijiRotation = reduced ? 0 : (t * 0.0002) % (Math.PI * 2); // ~60s/圈
      drawTaiji(ctx, cx, cy, baseR, taijiRotation, 0.6);
      const baguaR = baseR * 1.9;
      const baguaRotation = reduced ? 0 : -(t * 0.00012) % (Math.PI * 2); // 反向更慢
      drawBaguaRing(ctx, cx, cy, baguaR, baguaRotation, 0.5);

      // ④ 五行粒子层
      if (!reduced) {
        while (particles.length < 150) spawnParticle();
      }
      drawParticles();

      // reduced-motion 下不调度下一帧，仅保留单张静态星图
      if (!reduced) rafId = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);

    // 初始化读取一次 CSS 变量（单一主题，无需监听变化）
    refreshThemeColors();

    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else if (!reduced) {
        rafId = requestAnimationFrame(frame);
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    if (reduced) {
      // reduced-motion：只画一帧静态
      frame(0);
    } else {
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div className="dynamic-tianpan-background" aria-hidden="true">
      <canvas ref={canvasRef} className="tianpan-canvas" />
    </div>
  );
}
