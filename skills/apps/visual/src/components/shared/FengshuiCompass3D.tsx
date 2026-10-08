import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  createFengshuiCompassModel,
  type CompassOverlay3D,
  type CompassPart,
  type CompassTheme3D,
} from './three/createFengshuiCompassModel';
import {
  ThreeChartHost,
  resolveThreeChartCssColor,
  type ThreeChartCameraConfig,
  type ThreeChartSetupContext,
} from './three/ThreeChartHost';
import { MOUNTAINS, TRIGRAMS, YANG_MOUNTAINS } from './FengshuiCompass';

interface FengshuiCompass3DProps {
  facing?: string;
  overlay?: Record<string, CompassOverlay3D>;
  onUnavailable?: () => void;
}

type CameraView = 'top' | 'orbit';
interface RuntimeState {
  hovered: string | null;
  selected: string | null;
  exploded: boolean;
  cameraView: CameraView;
  spinning: boolean;
}

const CAMERA_CONFIG: ThreeChartCameraConfig = {
  fov: 28,
  near: 0.1,
  far: 80,
  position: [0, 22.5, 0.001],
  up: [0, 0, -1],
  target: [0, 0, 0],
  minDistance: 11,
  maxDistance: 42,
  minPolarAngle: 0.025,
  maxPolarAngle: Math.PI * 0.43,
};

function readTheme(): CompassTheme3D {
  return {
    page: resolveThreeChartCssColor('--chart-page', '#f3efe3'),
    surface: resolveThreeChartCssColor('--chart-surface', '#f5f1e5'),
    text: resolveThreeChartCssColor('--chart-text', '#2b2924'),
    textMuted: resolveThreeChartCssColor('--chart-text-mid', '#766f61'),
    line: resolveThreeChartCssColor('--chart-line', '#beb396'),
    jade: resolveThreeChartCssColor('--wz-wood', '#3f7454'),
    cinnabar: resolveThreeChartCssColor('--wz-fire', '#c63e2b'),
    brass: resolveThreeChartCssColor('--c-gold', '#a28a55'),
  };
}

export function FengshuiCompass3D({ facing, overlay, onUnavailable }: FengshuiCompass3DProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [exploded, setExploded] = useState(false);
  const [cameraView, setCameraView] = useState<CameraView>('top');
  const [spinning, setSpinning] = useState(false);
  const runtimeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectedIndex = selected ? MOUNTAINS.indexOf(selected) : -1;
  const selectedOverlay = useMemo(() => {
    if (!selected) return null;
    const degrees = MOUNTAINS.indexOf(selected) * 15;
    const trigram = TRIGRAMS.reduce((best, item) => Math.abs(item.deg - degrees) < Math.abs(best.deg - degrees) ? item : best, TRIGRAMS[0]);
    return { direction: trigram.label, data: overlay?.[trigram.label] };
  }, [overlay, selected]);

  const setup = useCallback((runtime: ThreeChartSetupContext) => {
    const { host, canvas, scene, camera, controls, setCameraPosition } = runtime;
    runtimeCanvasRef.current = canvas;
    const theme = readTheme();
    const model = createFengshuiCompassModel({ mountains: MOUNTAINS, yangMountains: YANG_MOUNTAINS, trigrams: TRIGRAMS, facing, overlay, theme });
    scene.add(model.root);

    scene.add(new THREE.HemisphereLight('#fff8e8', '#c8d0c5', 2.0));
    const key = new THREE.DirectionalLight('#fff4da', 2.65);
    key.position.set(-4, 8, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -7;
    key.shadow.normalBias = 0.035;
    key.shadow.bias = -0.00025;
    scene.add(key);
    const rim = new THREE.DirectionalLight('#dce7d9', 0.8);
    rim.position.set(5, 4, -5);
    scene.add(rim);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(7, 128),
      new THREE.ShadowMaterial({ color: '#665f50', opacity: 0.1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    scene.add(ground);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerDown = new THREE.Vector2();
    let spinActive = false;
    let currentView: CameraView = 'top';
    let currentExploded = false;

    const locate = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(model.selectable, false)[0]?.object as CompassPart | undefined;
    };
    const onPointerDown = (event: PointerEvent) => pointerDown.set(event.clientX, event.clientY);
    const onPointerMove = (event: PointerEvent) => {
      const hit = locate(event);
      setHovered(hit?.userData.value ?? null);
      canvas.style.cursor = hit ? 'pointer' : 'grab';
    };
    const onPointerLeave = () => { setHovered(null); canvas.style.cursor = 'grab'; };
    const onClick = (event: PointerEvent) => {
      if (pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 6) return;
      const value = locate(event)?.userData.value;
      if (value && MOUNTAINS.includes(value)) setSelected((current) => current === value ? null : value);
    };
    const onRuntime = (event: Event) => {
      const detail = (event as CustomEvent<RuntimeState>).detail;
      model.setExploded(detail.exploded);
      if (!detail.exploded) model.setFocus(detail.hovered, detail.selected);
      spinActive = detail.spinning;
      const viewChanged = detail.cameraView !== currentView;
      const explodedChanged = detail.exploded !== currentExploded;
      currentView = detail.cameraView;
      currentExploded = detail.exploded;
      if (viewChanged || explodedChanged) {
        setCameraPosition(detail.cameraView === 'top'
          ? [0, 22.5, 0.001]
          : detail.exploded
            ? [22, 16, 22]
            : [16, 20, 16]);
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('compass-runtime', onRuntime);
    host.addEventListener('pointerleave', onPointerLeave);

    return {
      onFrame: (_time: number, delta: number) => {
        if (spinActive && delta > 0) model.dial.rotation.y += delta * 0.00032;
        host.dataset.dialRotation = model.dial.rotation.y.toFixed(4);
      },
      dispose: () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('click', onClick);
        canvas.removeEventListener('compass-runtime', onRuntime);
        host.removeEventListener('pointerleave', onPointerLeave);
        delete host.dataset.dialRotation;
        runtimeCanvasRef.current = null;
        model.dispose();
        ground.geometry.dispose();
        (ground.material as THREE.Material).dispose();
      },
    };
  }, [facing, overlay]);

  useEffect(() => {
    runtimeCanvasRef.current?.dispatchEvent(new CustomEvent<RuntimeState>('compass-runtime', {
      detail: { hovered, selected, exploded, cameraView, spinning },
    }));
  }, [hovered, selected, exploded, cameraView, spinning]);

  const moveSelection = (delta: number) => {
    const next = (selectedIndex + delta + MOUNTAINS.length) % MOUNTAINS.length;
    setSelected(MOUNTAINS[next]);
  };

  return (
    <ThreeChartHost
      testId="fengshui-compass-3d"
      ariaLabel={`交互式三维二十四山风水罗盘${facing ? `，坐${facing.charAt(0)}向${facing.charAt(1)}` : ''}。可拖拽旋转、滚轮缩放，左右方向键选择山位。`}
      camera={CAMERA_CONFIG}
      setup={setup}
      onUnavailable={onUnavailable}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); moveSelection(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); moveSelection(1); }
        if (event.key === 'Escape') setSelected(null);
      }}
    >
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="rounded-card border border-jade-500/18 bg-[var(--chart-surface)]/90 px-3 py-2 text-xs shadow-instrument backdrop-blur-sm" aria-live="polite">
          {selected ? (
            <><strong className="text-[var(--chart-text)]">{selected}山</strong><span className="ml-2 text-[var(--chart-text-mid)]">{selectedOverlay?.direction}{selectedOverlay?.data?.starNum ? ` · ${selectedOverlay.data.starNum}${selectedOverlay.data.starName ?? ''}` : ''}</span></>
          ) : <span className="text-[var(--chart-text-mid)]">拖拽旋转 · 滚轮缩放 · 点击二十四山</span>}
        </div>
        <div className="pointer-events-auto flex flex-wrap justify-end gap-1 rounded-full border border-jade-500/18 bg-[var(--chart-surface)]/92 p-1 shadow-instrument backdrop-blur-sm" role="group" aria-label="三维罗盘视角与层盘控制">
          <button type="button" className={`rounded-full px-3 py-1.5 text-xs ${cameraView === 'top' ? 'bg-jade-500/18 text-[var(--chart-text)]' : 'text-[var(--chart-text-mid)]'}`} aria-pressed={cameraView === 'top'} onClick={() => { setCameraView('top'); setSpinning(false); }}>俯视</button>
          <button type="button" className={`rounded-full px-3 py-1.5 text-xs ${cameraView === 'orbit' ? 'bg-jade-500/18 text-[var(--chart-text)]' : 'text-[var(--chart-text-mid)]'}`} aria-pressed={cameraView === 'orbit'} onClick={() => { setCameraView('orbit'); setSpinning(false); }}>立体</button>
          <button type="button" className={`rounded-full px-3 py-1.5 text-xs ${spinning ? 'bg-jade-500/18 text-[var(--chart-text)]' : 'text-[var(--chart-text-mid)]'}`} aria-pressed={spinning} onClick={() => { setCameraView('orbit'); setSpinning((value) => !value); }}>自转</button>
          <button type="button" className={`rounded-full px-3 py-1.5 text-xs ${exploded ? 'bg-jade-500/18 text-[var(--chart-text)]' : 'text-[var(--chart-text-mid)]'}`} aria-pressed={exploded} onClick={() => setExploded((value) => !value)}>{exploded ? '合拢' : '分层'}</button>
        </div>
      </div>
      <span className="sr-only">三维模式只改变视觉展示，不进行任何排盘或数值计算。精确文字阅读和图像复制请切换到二维模式。</span>
    </ThreeChartHost>
  );
}
