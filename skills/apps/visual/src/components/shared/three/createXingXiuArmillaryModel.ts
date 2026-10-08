import * as THREE from 'three';
import type { XingXiuEntry } from '@/legacy/xingxiuEngine';

export interface XingXiuTheme3D {
  page: string;
  surface: string;
  text: string;
  muted: string;
  qinglong: string;
  zhuque: string;
  baihu: string;
  xuanwu: string;
  gold: string;
  brass: string;
}

export interface XingXiuModelOptions {
  allXiu: readonly XingXiuEntry[];
  zhiXiu: string;
  benMingXiu: string;
  theme: XingXiuTheme3D;
}

export interface MansionPart extends THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> {
  userData: { value: string; baseY: number; xiang: string };
}

export interface XingXiuArmillaryModel {
  root: THREE.Group;
  dial: THREE.Group;
  armillary: THREE.Group;
  selectable: MansionPart[];
  setFocus: (hovered: string | null, selected: string | null) => void;
  setArmillary: (visible: boolean) => void;
  dispose: () => void;
}

const QUADRANT_CENTER: Record<string, number> = {
  '南方朱雀': 0,
  '西方白虎': 90,
  '北方玄武': 180,
  '东方青龙': 270,
};

const SYMBOL_LABEL: Record<string, string> = {
  '南方朱雀': '南 · 朱雀',
  '西方白虎': '西 · 白虎',
  '北方玄武': '北 · 玄武',
  '东方青龙': '东 · 青龙',
};

function safeColor(value: string, fallback: string): THREE.Color {
  try { return new THREE.Color(value); } catch { return new THREE.Color(fallback); }
}

function polar(radius: number, degrees: number): THREE.Vector3 {
  const angle = THREE.MathUtils.degToRad(degrees);
  return new THREE.Vector3(Math.sin(angle) * radius, 0, -Math.cos(angle) * radius);
}

function sectorGeometry(inner: number, outer: number, centerDeg: number, halfSpanDeg: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  const steps = Math.max(8, Math.ceil(halfSpanDeg * 1.5));
  const start = THREE.MathUtils.degToRad(centerDeg - halfSpanDeg);
  const end = THREE.MathUtils.degToRad(centerDeg + halfSpanDeg);
  for (let i = 0; i <= steps; i += 1) {
    const angle = THREE.MathUtils.lerp(start, end, i / steps);
    const x = Math.sin(angle) * outer;
    const y = -Math.cos(angle) * outer;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i -= 1) {
    const angle = THREE.MathUtils.lerp(start, end, i / steps);
    shape.lineTo(Math.sin(angle) * inner, -Math.cos(angle) * inner);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 2);
}

function material(color: THREE.Color | string, roughness: number, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, side: THREE.DoubleSide });
}

function textTexture(lines: readonly string[], tint: string, width = 384, height = 180): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D unavailable');
  context.clearRect(0, 0, width, height);
  context.fillStyle = tint;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const primary = lines[0] ?? '';
  const primarySize = primary.length <= 3 ? 70 : 58;
  context.font = `700 ${primarySize}px "Noto Serif CJK SC", "Microsoft YaHei", serif`;
  context.fillText(primary, width / 2, lines.length > 1 ? height * 0.42 : height / 2);
  if (lines[1]) {
    context.globalAlpha = 0.72;
    context.font = '600 40px "Microsoft YaHei", sans-serif';
    context.fillText(lines[1], width / 2, height * 0.73);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function labelPlane(lines: readonly string[], tint: string, planeWidth: number, radius: number, degrees: number, height: number): THREE.Mesh {
  const texture = textTexture(lines, tint);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(planeWidth, planeWidth * 0.47),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  );
  const position = polar(radius, degrees);
  mesh.position.set(position.x, height, position.z);
  mesh.rotation.x = -Math.PI / 2;
  const normalized = ((degrees % 360) + 360) % 360;
  mesh.rotation.z = -THREE.MathUtils.degToRad(degrees) + (normalized > 90 && normalized < 270 ? Math.PI : 0);
  mesh.renderOrder = 20;
  mesh.userData.explodeWithParent = true;
  return mesh;
}

export function createXingXiuArmillaryModel(options: XingXiuModelOptions): XingXiuArmillaryModel {
  const resources = new Set<{ dispose: () => void }>();
  const keep = <T extends { dispose: () => void }>(resource: T): T => { resources.add(resource); return resource; };
  const root = new THREE.Group(); root.name = 'root';
  const dial = new THREE.Group(); dial.name = 'mansion-ring'; root.add(dial);
  const armillary = new THREE.Group(); armillary.name = 'armillary-rings'; root.add(armillary);
  const theme = options.theme;
  const colors: Record<string, THREE.Color> = {
    '东方青龙': safeColor(theme.qinglong, '#3f7454'),
    '南方朱雀': safeColor(theme.zhuque, '#c63e2b'),
    '西方白虎': safeColor(theme.baihu, '#9b814d'),
    '北方玄武': safeColor(theme.xuanwu, '#365f78'),
  };
  const paper = keep(material(theme.page, .9));
  const ivory = safeColor(theme.surface, '#f0ecdf');
  const brass = keep(material(theme.brass, .5, .62));

  const base = new THREE.Mesh(keep(new THREE.CylinderGeometry(5, 5, .24, 192)), paper);
  base.position.y = -.12; base.name = 'base-disc'; base.castShadow = true; base.receiveShadow = true; root.add(base);

  const quadrantGroup = new THREE.Group(); quadrantGroup.name = 'four-symbol-quadrants'; dial.add(quadrantGroup);
  Object.entries(QUADRANT_CENTER).forEach(([xiang, degrees]) => {
    const fill = ivory.clone().lerp(colors[xiang], .14);
    const mesh = new THREE.Mesh(keep(sectorGeometry(1.45, 3.48, degrees, 44.2)), keep(material(fill, .82)));
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = .045; mesh.name = `quadrant-${xiang}`; mesh.receiveShadow = true;
    quadrantGroup.add(mesh);
    const symbol = labelPlane([SYMBOL_LABEL[xiang]], colors[xiang].getStyle(), 1.25, 2.35, degrees, .14);
    symbol.name = `symbol-label-${xiang}`; quadrantGroup.add(symbol);
  });

  const groups = new Map<string, XingXiuEntry[]>();
  options.allXiu.forEach((entry) => groups.set(entry.xiang, [...(groups.get(entry.xiang) ?? []), entry]));
  const selectable: MansionPart[] = [];
  groups.forEach((entries, xiang) => {
    const center = QUADRANT_CENTER[xiang] ?? 0;
    entries.forEach((entry, index) => {
      const degrees = center - (90 / 2) + (index + .5) * (90 / 7);
      const isDaily = entry.name === options.zhiXiu;
      const isNatal = entry.name === options.benMingXiu;
      const accent = isDaily ? safeColor(theme.gold, '#c59a3b') : isNatal ? colors['北方玄武'] : colors[xiang];
      const fill = ivory.clone().lerp(accent, isDaily || isNatal ? .24 : .1);
      const mat = keep(material(fill, isDaily || isNatal ? .52 : .78));
      mat.emissive.copy(accent).multiplyScalar(isDaily || isNatal ? .16 : .025);
      const sector = new THREE.Mesh(keep(sectorGeometry(3.56, 4.76, degrees, 5.9)), mat) as unknown as MansionPart;
      sector.rotation.x = -Math.PI / 2; sector.position.y = .065; sector.name = `mansion-${entry.name}`;
      sector.userData = { value: entry.name, baseY: .065, xiang }; sector.receiveShadow = true; selectable.push(sector); dial.add(sector);
      const label = labelPlane([entry.fullName, entry.yao], accent.getStyle(), .95, 4.17, degrees, .155);
      label.name = `mansion-label-${entry.name}`; dial.add(label);
      const starPosition = polar(3.32, degrees);
      const star = new THREE.Mesh(keep(new THREE.SphereGeometry(isDaily || isNatal ? .11 : .065, 20, 12)), keep(material(accent, .34, isDaily ? .45 : .12)));
      star.position.set(starPosition.x, .17, starPosition.z); star.name = `star-node-${entry.name}`; star.castShadow = true; dial.add(star);
      if (isDaily || isNatal) {
        const halo = new THREE.Mesh(keep(new THREE.TorusGeometry(.18, .022, 8, 40)), keep(material(accent, .3, .4)));
        halo.rotation.x = Math.PI / 2; halo.position.set(starPosition.x, .18, starPosition.z); halo.name = isDaily ? 'daily-halo' : 'natal-halo'; dial.add(halo);
      }
    });
  });

  const center = new THREE.Mesh(keep(new THREE.CylinderGeometry(1.12, 1.12, .14, 96)), keep(material(theme.surface, .78)));
  center.position.y = .035; center.name = 'center-core'; center.castShadow = true; center.receiveShadow = true; root.add(center);
  const centerLabel = labelPlane([`值日 · ${options.zhiXiu}`, `本命 · ${options.benMingXiu}`], theme.text, 1.85, 0, 0, .18);
  centerLabel.position.set(0, .18, 0); centerLabel.rotation.z = 0; centerLabel.name = 'center-summary'; root.add(centerLabel);

  [1.18, 3.5, 4.8, 4.95].forEach((radius, index) => {
    const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(radius, index > 1 ? .025 : .02, 8, 160)), brass);
    ring.rotation.x = Math.PI / 2; ring.position.y = .12; ring.name = `dial-ring-${index}`; ring.castShadow = true; root.add(ring);
  });
  const guideMaterial = keep(new THREE.LineDashedMaterial({ color: theme.brass, transparent: true, opacity: .28, dashSize: .12, gapSize: .1 }));
  const guidePoints = [polar(3.5,0),polar(3.5,90),polar(3.5,180),polar(3.5,270),polar(3.5,0)].map((p)=>new THREE.Vector3(p.x,.13,p.z));
  const guide = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(guidePoints)), guideMaterial); guide.computeLineDistances(); guide.name='quadrant-guides'; root.add(guide);

  const ringA = new THREE.Mesh(keep(new THREE.TorusGeometry(3.05, .035, 10, 160)), brass); ringA.position.y=.35; ringA.rotation.x=Math.PI/2; armillary.add(ringA);
  const ringB = new THREE.Mesh(keep(new THREE.TorusGeometry(3.05, .03, 10, 160)), brass); ringB.position.y=.35; ringB.rotation.z=Math.PI/2; armillary.add(ringB);
  const ringC = new THREE.Mesh(keep(new THREE.TorusGeometry(3.05, .025, 10, 160)), brass); ringC.position.y=.35; ringC.rotation.x=Math.PI/4; armillary.add(ringC);
  armillary.visible = false;

  const setFocus = (hovered: string | null, selected: string | null) => {
    selectable.forEach((part) => {
      const active = part.userData.value === selected;
      const hot = part.userData.value === hovered;
      part.position.y = part.userData.baseY;
      part.material.emissiveIntensity = active ? .5 : hot ? .25 : .04;
    });
  };
  const setArmillary = (visible: boolean) => { armillary.visible = visible; };
  root.userData.sculptRuntime={parts:['root','base-disc','four-symbol-quadrants','mansion-ring','armillary-rings','center-core','highlight-layer']};
  return {root,dial,armillary,selectable,setFocus,setArmillary,dispose:()=>{root.traverse((object)=>{if(object instanceof THREE.Mesh&&object.material instanceof THREE.MeshBasicMaterial)object.material.map?.dispose();});resources.forEach((resource)=>resource.dispose());}};
}
