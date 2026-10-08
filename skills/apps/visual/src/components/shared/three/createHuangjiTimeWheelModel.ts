import * as THREE from 'three';

export interface HuangjiTheme3D {
  page: string;
  surface: string;
  text: string;
  muted: string;
  gold: string;
  jade: string;
  cinnabar: string;
  brass: string;
}
export interface HuangjiModelOptions {
  guaNames: readonly string[];
  guaCode: Record<string, string>;
  zhengGua: string;
  shiGua: string;
  yearGua: string;
  hui: number;
  yun: number;
  shi: number;
  acumYear: number;
  theme: HuangjiTheme3D;
}
export interface HuangjiPart
  extends THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> {
  userData: { value: string; baseY: number };
}
export interface HuangjiTimeWheelModel {
  root: THREE.Group;
  dial: THREE.Group;
  selectable: HuangjiPart[];
  setFocus: (hovered: string | null, selected: string | null) => void;
  setExploded: (value: boolean) => void;
  dispose: () => void;
}
function safeColor(value: string, fallback: string) {
  try {
    return new THREE.Color(value);
  } catch {
    return new THREE.Color(fallback);
  }
}
function polar(radius: number, degrees: number) {
  const a = THREE.MathUtils.degToRad(degrees);
  return new THREE.Vector3(Math.sin(a) * radius, 0, -Math.cos(a) * radius);
}
function sectorGeometry(
  inner: number,
  outer: number,
  center: number,
  half: number,
) {
  const shape = new THREE.Shape();
  const steps = 8;
  const a0 = THREE.MathUtils.degToRad(center - half),
    a1 = THREE.MathUtils.degToRad(center + half);
  for (let i = 0; i <= steps; i++) {
    const a = THREE.MathUtils.lerp(a0, a1, i / steps),
      x = Math.sin(a) * outer,
      y = -Math.cos(a) * outer;
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i--) {
    const a = THREE.MathUtils.lerp(a0, a1, i / steps);
    shape.lineTo(Math.sin(a) * inner, -Math.cos(a) * inner);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 2);
}
function mat(color: THREE.Color | string, roughness: number, metalness = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    side: THREE.DoubleSide,
  });
}
function guaTexture(name: string, code: string, tint: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 224;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('Canvas 2D unavailable');
  c.clearRect(0, 0, 256, 224);
  c.fillStyle = tint;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `700 ${name.length >= 3 ? 48 : 62}px "Noto Serif CJK SC","Microsoft YaHei",serif`;
  c.fillText(name, 128, 38);
  const normalized = (code || '888888').padEnd(6, '8').slice(0, 6);
  c.strokeStyle = tint;
  c.lineWidth = 8;
  c.lineCap = 'round';
  for (let row = 0; row < 6; row++) {
    const y = 78 + row * 24,
      solid = normalized[5 - row] === '7';
    c.beginPath();
    if (solid) {
      c.moveTo(72, y);
      c.lineTo(184, y);
    } else {
      c.moveTo(72, y);
      c.lineTo(118, y);
      c.moveTo(138, y);
      c.lineTo(184, y);
    }
    c.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}
function labelPlane(
  name: string,
  code: string,
  tint: string,
  radius: number,
  degrees: number,
  height: number,
) {
  const texture = guaTexture(name, code, tint);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.72),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const p = polar(radius, degrees);
  mesh.position.set(p.x, height, p.z);
  mesh.rotation.x = -Math.PI / 2;
  const n = ((degrees % 360) + 360) % 360;
  mesh.rotation.z =
    -THREE.MathUtils.degToRad(degrees) + (n > 90 && n < 270 ? Math.PI : 0);
  mesh.renderOrder = 20;
  return mesh;
}
function rolePlaque(label: string, tint: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D unavailable');
  context.clearRect(0, 0, 128, 128);
  context.fillStyle = tint;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '700 92px "Noto Serif CJK SC","Microsoft YaHei",serif';
  context.fillText(label, 64, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.32),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 35;
  return mesh;
}

function simpleText(lines: readonly string[], tint: string, width = 2.2) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('Canvas 2D unavailable');
  c.clearRect(0, 0, 512, 256);
  c.fillStyle = tint;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  lines.forEach((line, i) => {
    c.font = `${i === 0 ? '700 54' : '600 36'}px "Noto Serif CJK SC","Microsoft YaHei",serif`;
    c.fillText(line, 256, 58 + i * 52);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width * 0.5),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 30;
  return mesh;
}
export function createHuangjiTimeWheelModel(
  options: HuangjiModelOptions,
): HuangjiTimeWheelModel {
  const resources = new Set<{ dispose: () => void }>();
  const keep = <T extends { dispose: () => void }>(r: T) => {
    resources.add(r);
    return r;
  };
  const root = new THREE.Group();
  root.name = 'root';
  const dial = new THREE.Group();
  dial.name = 'time-wheel';
  root.add(dial);
  const guaLayer = new THREE.Group();
  guaLayer.name = 'hexagram-ring';
  const roleLayer = new THREE.Group();
  roleLayer.name = 'role-rings';
  const coreLayer = new THREE.Group();
  coreLayer.name = 'cycle-core';
  dial.add(guaLayer, roleLayer);
  root.add(coreLayer);
  const theme = options.theme;
  const ivory = safeColor(theme.surface, '#f0ecdf'),
    neutral = safeColor(theme.muted, '#80796b'),
    gold = safeColor(theme.gold, '#c59a3b'),
    jade = safeColor(theme.jade, '#3f7454'),
    red = safeColor(theme.cinnabar, '#c63e2b');
  const paper = keep(mat(theme.page, 0.9)),
    brass = keep(mat(theme.brass, 0.48, 0.62));
  const base = new THREE.Mesh(
    keep(new THREE.CylinderGeometry(5, 5, 0.24, 192)),
    paper,
  );
  base.position.y = -0.12;
  base.name = 'base-disc';
  base.castShadow = true;
  base.receiveShadow = true;
  root.add(base);
  const selectable: HuangjiPart[] = [];
  const roles = (name: string) => ({
    zheng: name === options.zhengGua,
    shi: name === options.shiGua,
    year: name === options.yearGua,
  });
  options.guaNames.forEach((name, index) => {
    const degrees = (index * 360) / 64;
    const r = roles(name);
    const accent = r.year ? red : r.shi ? jade : r.zheng ? gold : neutral;
    const fill = ivory
      .clone()
      .lerp(accent, r.year || r.shi || r.zheng ? 0.22 : 0.055);
    const material = keep(mat(fill, r.year || r.shi || r.zheng ? 0.56 : 0.82));
    material.emissive
      .copy(accent)
      .multiplyScalar(r.year || r.shi || r.zheng ? 0.13 : 0.018);
    const sector = new THREE.Mesh(
      keep(sectorGeometry(3.34, 4.84, degrees, 2.68)),
      material,
    ) as unknown as HuangjiPart;
    sector.rotation.x = -Math.PI / 2;
    sector.position.y = 0.06;
    sector.name = `gua-${name}`;
    sector.userData = { value: name, baseY: 0.06 };
    sector.receiveShadow = true;
    selectable.push(sector);
    guaLayer.add(sector);
    const label = labelPlane(
      name,
      options.guaCode[name] ?? '888888',
      accent.getStyle(),
      4.12,
      degrees,
      0.16,
    );
    label.name = `gua-label-${name}`;
    guaLayer.add(label);
  });
  [1.48, 2.18, 2.62, 3.06, 3.28, 3.32, 4.88, 4.98].forEach((radius, i) => {
    const ring = new THREE.Mesh(
      keep(new THREE.TorusGeometry(radius, i > 5 ? 0.024 : 0.018, 8, 180)),
      brass,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.12;
    ring.name = `time-ring-${i}`;
    ring.castShadow = true;
    roleLayer.add(ring);
  });
  const marker = (
    name: string,
    radius: number,
    color: THREE.Color,
    label: string,
  ) => {
    const idx = options.guaNames.indexOf(name);
    if (idx < 0) return;
    const degrees = (idx * 360) / 64,
      p = polar(radius, degrees);
    const halo = new THREE.Mesh(
      keep(new THREE.TorusGeometry(0.14, 0.025, 8, 40)),
      keep(mat(color, 0.35, 0.4)),
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.set(p.x, 0.18, p.z);
    halo.name = `${label}-track`;
    roleLayer.add(halo);
    const plaquePosition = polar(radius - 0.22, degrees);
    const plaque = rolePlaque(label, color.getStyle());
    plaque.position.set(plaquePosition.x, 0.23, plaquePosition.z);
    roleLayer.add(plaque);
  };
  marker(options.zhengGua, 3.06, gold, '正');
  marker(options.shiGua, 2.62, jade, '世');
  marker(options.yearGua, 2.18, red, '年');
  const center = new THREE.Mesh(
    keep(new THREE.CylinderGeometry(1.44, 1.44, 0.16, 96)),
    keep(mat(theme.surface, 0.78)),
  );
  center.position.y = 0.03;
  center.name = 'cycle-core';
  center.castShadow = true;
  center.receiveShadow = true;
  coreLayer.add(center);
  const core = simpleText(
    [
      '皇极经世',
      `第 ${options.hui} 会 · 第 ${options.yun} 运 · 第 ${options.shi} 世`,
      `积年 ${options.acumYear}`,
    ],
    theme.text,
    2.35,
  );
  core.position.set(0, 0.19, 0);
  core.rotation.z = 0;
  coreLayer.add(core);
  const setFocus = (hovered: string | null, selected: string | null) =>
    selectable.forEach((part) => {
      const active = part.userData.value === selected,
        hot = part.userData.value === hovered;
      part.position.y = part.userData.baseY;
      part.material.emissiveIntensity = active ? 0.48 : hot ? 0.22 : 0.025;
    });
  const setExploded = (value: boolean) => {
    guaLayer.position.y = value ? 1.05 : 0;
    roleLayer.position.y = value ? 0.55 : 0;
    coreLayer.position.y = value ? 0.22 : 0;
    selectable.forEach((p) => (p.position.y = p.userData.baseY));
  };
  root.userData.sculptRuntime = {
    parts: [
      'root',
      'base-disc',
      'hexagram-ring',
      'role-rings',
      'cycle-core',
      'highlight-layer',
      'layer-pivots',
    ],
  };
  return {
    root,
    dial,
    selectable,
    setFocus,
    setExploded,
    dispose: () => {
      root.traverse((o) => {
        if (
          o instanceof THREE.Mesh &&
          o.material instanceof THREE.MeshBasicMaterial
        )
          o.material.map?.dispose();
      });
      resources.forEach((r) => r.dispose());
    },
  };
}
