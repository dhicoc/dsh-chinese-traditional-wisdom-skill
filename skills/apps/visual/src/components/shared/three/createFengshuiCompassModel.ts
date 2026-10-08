import * as THREE from 'three';

export interface CompassOverlay3D {
  starNum?: number;
  starName?: string;
  starLuck?: string;
  usageLabel?: string;
  mansionStar?: string;
  mansionLuck?: string;
}

export interface CompassTheme3D {
  page: string;
  surface: string;
  text: string;
  textMuted: string;
  line: string;
  jade: string;
  cinnabar: string;
  brass: string;
}

export interface CompassModelOptions {
  mountains: readonly string[];
  yangMountains: ReadonlySet<string>;
  trigrams: readonly { tri: string; deg: number; label: string; symbol: string }[];
  facing?: string;
  overlay?: Record<string, CompassOverlay3D>;
  theme: CompassTheme3D;
}

export interface CompassPart extends THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> {
  userData: {
    kind: 'mountain' | 'trigram' | 'direction';
    value: string;
    baseY: number;
  };
}

export interface FengshuiCompassModel {
  root: THREE.Group;
  dial: THREE.Group;
  selectable: CompassPart[];
  setFocus: (hovered: string | null, selected: string | null) => void;
  setExploded: (exploded: boolean) => void;
  dispose: () => void;
}

const TRIGRAM_LINES: Record<string, readonly number[]> = {
  乾: [1, 1, 1], 兑: [0, 1, 1], 离: [1, 0, 1], 震: [0, 0, 1],
  巽: [1, 1, 0], 坎: [0, 1, 0], 艮: [1, 0, 0], 坤: [0, 0, 0],
};

const mountainDegrees = new Map(
  ['壬','子','癸','丑','艮','寅','甲','卯','乙','辰','巽','巳','丙','午','丁','未','坤','申','庚','酉','辛','戌','乾','亥']
    .map((name, index) => [name, index * 15]),
);

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
  for (let index = 0; index <= steps; index += 1) {
    const angle = THREE.MathUtils.lerp(start, end, index / steps);
    const x = Math.sin(angle) * outer;
    const y = -Math.cos(angle) * outer;
    if (index === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  for (let index = steps; index >= 0; index -= 1) {
    const angle = THREE.MathUtils.lerp(start, end, index / steps);
    shape.lineTo(Math.sin(angle) * inner, -Math.cos(angle) * inner);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 2);
}

function standardMaterial(base: THREE.Color | string, roughness: number, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: base, roughness, metalness, side: THREE.DoubleSide });
}

function makeTextTexture(text: string, tint: string, fontSize = 108, width = 256, height = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable');
  context.clearRect(0, 0, width, height);
  context.fillStyle = tint;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `700 ${fontSize}px "Noto Serif CJK SC", "Microsoft YaHei", serif`;
  context.fillText(text, width / 2, height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function horizontalLabel(text: string, tint: string, width: number, radius: number, degrees: number, height: number): THREE.Mesh {
  const fontSize = text.length <= 1 ? 108 : text.length === 2 ? 88 : text.length === 3 ? 70 : text.length === 4 ? 58 : 48;
  const texture = makeTextTexture(text, tint, fontSize);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 0.5), material);
  const position = polar(radius, degrees);
  mesh.position.set(position.x, height, position.z);
  mesh.rotation.x = -Math.PI / 2;
  const normalizedDegrees = ((degrees % 360) + 360) % 360;
  mesh.rotation.z = -THREE.MathUtils.degToRad(degrees)
    + (normalizedDegrees > 90 && normalizedDegrees < 270 ? Math.PI : 0);
  mesh.renderOrder = 20;
  mesh.userData.explodeWithParent = true;
  return mesh;
}

function reliefBar(width: number, depth: number, height: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.explodeWithParent = true;
  return mesh;
}

function luckAccent(luck: string | undefined, theme: CompassTheme3D): THREE.Color {
  if (luck && /凶/.test(luck)) return safeColor(theme.cinnabar, '#c63e2b');
  if (luck && /吉/.test(luck)) return safeColor(theme.jade, '#3f7454');
  return safeColor(theme.textMuted, '#766f61');
}

export function createFengshuiCompassModel(options: CompassModelOptions): FengshuiCompassModel {
  const resources = new Set<{ dispose: () => void }>();
  const keep = <T extends { dispose: () => void }>(resource: T): T => { resources.add(resource); return resource; };
  const root = new THREE.Group();
  root.name = 'root';
  const dial = new THREE.Group();
  dial.name = 'fengshui-compass-dial';
  const mountainLayer = new THREE.Group();
  mountainLayer.name = 'mountain-layer';
  const trigramLayer = new THREE.Group();
  trigramLayer.name = 'trigram-layer';
  const directionLayer = new THREE.Group();
  directionLayer.name = 'direction-ring';
  mountainLayer.name = 'mountain-ring';
  trigramLayer.name = 'trigram-ring';
  const separatorRims = new THREE.Group();
  separatorRims.name = 'separator-rims';
  const outerFrame = new THREE.Group();
  outerFrame.name = 'outer-frame';
  const orientationLayer = new THREE.Group();
  orientationLayer.name = 'orientation-layer';
  dial.add(mountainLayer, trigramLayer, directionLayer, separatorRims, outerFrame, orientationLayer);
  root.add(dial);

  const ivoryColor = safeColor(options.theme.surface, '#f5f1e5');
  const pageColor = safeColor(options.theme.page, '#f3efe3');
  const jadeColor = safeColor(options.theme.jade, '#3f7454');
  const redColor = safeColor(options.theme.cinnabar, '#c63e2b');
  const brassColor = safeColor(options.theme.brass, '#a28a55');
  const textColor = safeColor(options.theme.text, '#2b2924');
  const edgeMaterial = keep(standardMaterial(brassColor, 0.68, 0.28));
  const baseMaterial = keep(standardMaterial(pageColor, 0.91));
  const ivoryMaterial = keep(standardMaterial(ivoryColor, 0.88));
  const darkMaterial = keep(standardMaterial(textColor, 0.68));
  const trigramMaterial = keep(standardMaterial(brassColor.clone().multiplyScalar(0.86), 0.55, 0.35));

  const base = new THREE.Mesh(keep(new THREE.CylinderGeometry(5, 5, 0.24, 192)), baseMaterial);
  base.position.y = -0.11;
  base.name = 'disc';
  base.receiveShadow = true;
  base.castShadow = true;
  dial.add(base);

  const selectable: CompassPart[] = [];
  const makeSector = (
    kind: CompassPart['userData']['kind'], value: string, inner: number, outer: number,
    degrees: number, halfSpan: number, height: number, fill: THREE.Color,
  ) => {
    const material = keep(standardMaterial(fill, 0.86));
    material.emissive.copy(fill).multiplyScalar(0.025);
    const geometry = keep(sectorGeometry(inner, outer, degrees, halfSpan));
    const mesh = new THREE.Mesh(geometry, material) as unknown as CompassPart;
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = height;
    mesh.name = `${kind}-${value}`;
    mesh.receiveShadow = true;
    mesh.userData = { kind, value, baseY: height };
    const layer = kind === 'mountain' ? mountainLayer : kind === 'trigram' ? trigramLayer : directionLayer;
    layer.add(mesh);
    selectable.push(mesh);
    return mesh;
  };

  options.mountains.forEach((mountain, index) => {
    const degrees = index * 15;
    const nearest = options.trigrams.reduce((best, trigram) => Math.abs(trigram.deg - degrees) < Math.abs(best.deg - degrees) ? trigram : best, options.trigrams[0]);
    const overlay = options.overlay?.[nearest.label];
    const accent = options.yangMountains.has(mountain) ? jadeColor : redColor;
    const fill = ivoryColor.clone().lerp(accent, overlay?.starLuck ? 0.17 : 0.09);
    makeSector('mountain', mountain, 3.84, 4.73, degrees, 7.2, 0.066, fill);
    const label = horizontalLabel(mountain, options.yangMountains.has(mountain) ? options.theme.jade : options.theme.cinnabar, 0.72, 4.33, degrees, 0.125);
    label.name = `mountain-label-${mountain}`;
    mountainLayer.add(label);
  });

  options.trigrams.forEach((trigram) => {
    const overlay = options.overlay?.[trigram.label];
    const accent = luckAccent(overlay?.mansionLuck ?? overlay?.starLuck, options.theme);
    const warm = ivoryColor.clone().lerp(accent, 0.12);
    makeSector('trigram', trigram.tri, 2.8, 3.74, trigram.deg, 22.1, 0.058, warm);
    makeSector('direction', trigram.label, 1.86, 2.72, trigram.deg, 22.1, 0.052, ivoryColor.clone().lerp(accent, 0.1));

    const directionLabel = horizontalLabel(trigram.label, accent.getStyle(), 0.98, 1.48, trigram.deg, 0.132);
    directionLabel.name = `direction-label-${trigram.label}`;
    directionLayer.add(directionLabel);
    const starText = overlay?.starNum ? `${overlay.starNum}${overlay.starName?.slice(0, 3) ?? ''}` : trigram.symbol;
    const starLabel = horizontalLabel(starText, accent.getStyle(), 0.86, 2.48, trigram.deg, 0.132);
    starLabel.name = `star-label-${trigram.tri}`;
    trigramLayer.add(starLabel);

    const trigramGroup = new THREE.Group();
    const center = polar(3.3, trigram.deg);
    trigramGroup.position.set(center.x, 0.14, center.z);
    trigramGroup.rotation.y = -THREE.MathUtils.degToRad(trigram.deg);
    trigramGroup.name = `trigram-bars-${trigram.tri}`;
    const pattern = TRIGRAM_LINES[trigram.tri] ?? [1, 1, 1];
    pattern.forEach((solid, row) => {
      const z = (row - 1) * 0.13;
      if (solid) {
        const bar = reliefBar(0.36, 0.055, 0.048, trigramMaterial);
        bar.position.z = z;
        trigramGroup.add(bar);
      } else {
        [-0.115, 0.115].forEach((x) => {
          const bar = reliefBar(0.13, 0.055, 0.048, trigramMaterial);
          bar.position.set(x, 0, z);
          trigramGroup.add(bar);
        });
      }
    });
    trigramLayer.add(trigramGroup);
  });

  const center = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.8, 0.8, 0.13, 96)), ivoryMaterial);
  center.position.y = 0.01;
  center.name = 'center-dial';
  center.castShadow = true;
  center.receiveShadow = true;
  dial.add(center);

  const radii = [0.8, 1.84, 2.76, 3.78, 4.76, 4.93];
  radii.forEach((radius, index) => {
    const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(radius, index === radii.length - 1 ? 0.022 : 0.028, 8, 192)), edgeMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.103 + index * 0.003;
    ring.name = `ring-ridge-${index}`;
    ring.castShadow = true;
    ring.userData.explodeWithParent = true;
    (index >= radii.length - 2 ? outerFrame : separatorRims).add(ring);
  });

  for (let index = 0; index < 8; index += 1) {
    const degrees = index * 45 - 22.5;
    const position = polar(3.29, degrees);
    const divider = reliefBar(0.022, 1.9, 0.04, edgeMaterial);
    divider.position.set(position.x, 0.105, position.z);
    divider.rotation.y = -THREE.MathUtils.degToRad(degrees);
    divider.name = `major-divider-${index}`;
    dial.add(divider);
  }
  for (let index = 0; index < 24; index += 1) {
    const degrees = index * 15 - 7.5;
    const position = polar(4.285, degrees);
    const divider = reliefBar(0.014, 0.87, 0.032, edgeMaterial);
    divider.position.set(position.x, 0.108, position.z);
    divider.rotation.y = -THREE.MathUtils.degToRad(degrees);
    divider.name = `mountain-divider-${index}`;
    mountainLayer.add(divider);
  }

  const north = reliefBar(0.04, 0.5, 0.045, keep(standardMaterial(redColor, 0.62)));
  north.position.set(0, 0.16, -0.28);
  dial.add(north);
  const south = reliefBar(0.03, 0.42, 0.04, darkMaterial);
  south.position.set(0, 0.155, 0.24);
  dial.add(south);
  const eastWest = reliefBar(0.72, 0.03, 0.04, darkMaterial);
  eastWest.position.y = 0.155;
  dial.add(eastWest);
  const pin = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.075, 0.075, 0.085, 32)), darkMaterial);
  pin.position.y = 0.2;
  pin.castShadow = true;
  pin.name = 'center-pin';
  dial.add(pin);
  ([['北', 0, options.theme.cinnabar], ['东', 90, options.theme.text], ['南', 180, options.theme.text], ['西', 270, options.theme.text]] as const)
    .forEach(([label, degrees, tint]) => {
      const mesh = horizontalLabel(label, tint, 0.48, 0.62, degrees, 0.19);
      mesh.rotation.z = 0;
      dial.add(mesh);
    });

  if (options.facing && options.facing.length >= 2) {
    const facingDeg = mountainDegrees.get(options.facing.charAt(1)) ?? 0;
    const sittingDeg = mountainDegrees.get(options.facing.charAt(0)) ?? 180;
    dial.rotation.y = -THREE.MathUtils.degToRad(facingDeg);
    const facingLabel = horizontalLabel('▲向', options.theme.cinnabar, 0.74, 4.74, facingDeg, 0.19);
    const sittingLabel = horizontalLabel('▼坐', options.theme.jade, 0.74, 4.74, sittingDeg, 0.19);
    orientationLayer.add(facingLabel, sittingLabel);
  }

  const setFocus = (hovered: string | null, selected: string | null) => {
    selectable.forEach((part) => {
      const active = part.userData.value === selected;
      const hot = part.userData.value === hovered;
      part.position.y = part.userData.baseY;
      part.material.emissiveIntensity = active ? 0.42 : hot ? 0.22 : 0.025;
    });
  };

  const setExploded = (exploded: boolean) => {
    mountainLayer.position.y = exploded ? 1.28 : 0;
    trigramLayer.position.y = exploded ? 0.78 : 0;
    directionLayer.position.y = exploded ? 0.36 : 0;
    selectable.forEach((part) => {
      part.position.y = part.userData.baseY;
      part.material.emissiveIntensity = 0.025;
    });
  };

  root.userData.sculptRuntime = {
    destructionGroups: { disc: [base], rings: [...separatorRims.children, ...outerFrame.children] },
    parts: ['root', 'outer-frame', 'mountain-ring', 'trigram-ring', 'direction-ring', 'separator-rims', 'center-dial', 'orientation-layer'],
  };

  return {
    root,
    dial,
    selectable,
    setFocus,
    setExploded,
    dispose: () => {
      root.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshBasicMaterial) object.material.map?.dispose();
      });
      resources.forEach((resource) => resource.dispose());
    },
  };
}
