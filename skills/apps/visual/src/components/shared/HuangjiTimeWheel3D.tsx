import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GUA_CODE, XIANTIAN_64 } from './HuangjiGuaCircle';
import {
  createHuangjiTimeWheelModel,
  type HuangjiPart,
  type HuangjiTheme3D,
} from './three/createHuangjiTimeWheelModel';
import {
  ThreeChartHost,
  resolveThreeChartCssColor,
  type ThreeChartCameraConfig,
  type ThreeChartSetupContext,
} from './three/ThreeChartHost';

interface HuangjiTimeWheel3DProps {
  zhengGua: string;
  shiGua: string;
  yearGua: string;
  hui: number;
  yun: number;
  shi: number;
  acumYear: number;
  onUnavailable?: () => void;
}
type CameraView = 'top' | 'orbit';
interface RuntimeState {
  hovered: string | null;
  selected: string | null;
  cameraView: CameraView;
  touring: boolean;
  exploded: boolean;
}
const CAMERA: ThreeChartCameraConfig = {
  fov: 29,
  near: 0.1,
  far: 90,
  position: [0, 23, 0.001],
  up: [0, 0, -1],
  target: [0, 0, 0],
  minDistance: 11,
  maxDistance: 44,
  minPolarAngle: 0.025,
  maxPolarAngle: Math.PI * 0.43,
};
function theme(): HuangjiTheme3D {
  return {
    page: resolveThreeChartCssColor('--chart-page', '#efeadd'),
    surface: resolveThreeChartCssColor('--chart-surface', '#f0ecdf'),
    text: resolveThreeChartCssColor('--chart-text', '#2b2924'),
    muted: resolveThreeChartCssColor('--chart-text-mid', '#80796b'),
    gold: resolveThreeChartCssColor('--wz-earth', '#c59a3b'),
    jade: resolveThreeChartCssColor('--wz-wood', '#3f7454'),
    cinnabar: resolveThreeChartCssColor('--wz-fire', '#c63e2b'),
    brass: resolveThreeChartCssColor('--c-gold', '#a28a55'),
  };
}
export function HuangjiTimeWheel3D(props: HuangjiTimeWheel3DProps) {
  const { zhengGua, shiGua, yearGua, hui, yun, shi, acumYear, onUnavailable } =
    props;
  const [selected, setSelected] = useState<string | null>(zhengGua);
  const [hovered, setHovered] = useState<string | null>(null);
  const [cameraView, setCameraView] = useState<CameraView>('top');
  const [touring, setTouring] = useState(false);
  const [exploded, setExploded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectedIndex = selected ? XIANTIAN_64.indexOf(selected) : -1;
  const selectedCode = useMemo(
    () => (selected ? (GUA_CODE[selected] ?? '888888') : ''),
    [selected],
  );
  const roleText = useMemo(() => {
    if (!selected) return '';
    return (
      [
        selected === zhengGua ? '正卦' : '',
        selected === shiGua ? '世卦' : '',
        selected === yearGua ? '年卦' : '',
      ]
        .filter(Boolean)
        .join(' · ') || '六十四卦'
    );
  }, [selected, zhengGua, shiGua, yearGua]);
  const setup = useCallback(
    (runtime: ThreeChartSetupContext) => {
      const { host, canvas, scene, camera, setCameraPosition } = runtime;
      canvasRef.current = canvas;
      const model = createHuangjiTimeWheelModel({
        guaNames: XIANTIAN_64,
        guaCode: GUA_CODE,
        zhengGua,
        shiGua,
        yearGua,
        hui,
        yun,
        shi,
        acumYear,
        theme: theme(),
      });
      scene.add(model.root);
      scene.add(new THREE.HemisphereLight('#fff8e8', '#c8d7dc', 1.9));
      const key = new THREE.DirectionalLight('#fff3d8', 2.5);
      key.position.set(-5, 9, 6);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.normalBias = 0.035;
      key.shadow.bias = -0.00025;
      key.shadow.camera.left = -7;
      key.shadow.camera.right = 7;
      key.shadow.camera.top = 7;
      key.shadow.camera.bottom = -7;
      scene.add(key);
      const rim = new THREE.DirectionalLight('#dce7d9', 0.75);
      rim.position.set(6, 5, -6);
      scene.add(rim);
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(7, 128),
        new THREE.ShadowMaterial({ color: '#625d52', opacity: 0.1 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.26;
      ground.receiveShadow = true;
      scene.add(ground);
      const raycaster = new THREE.Raycaster(),
        pointer = new THREE.Vector2(),
        down = new THREE.Vector2();
      let tour = false,
        currentView: CameraView = 'top',
        currentExploded = false;
      const locate = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        return raycaster.intersectObjects(model.selectable, false)[0]
          ?.object as HuangjiPart | undefined;
      };
      const onDown = (e: PointerEvent) => down.set(e.clientX, e.clientY);
      const onMove = (e: PointerEvent) => {
        const hit = locate(e);
        setHovered(hit?.userData.value ?? null);
        canvas.style.cursor = hit ? 'pointer' : 'grab';
      };
      const onLeave = () => {
        setHovered(null);
        canvas.style.cursor = 'grab';
      };
      const onClick = (e: PointerEvent) => {
        if (down.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 6)
          return;
        const value = locate(e)?.userData.value;
        if (value) setSelected(value);
      };
      const onRuntime = (e: Event) => {
        const d = (e as CustomEvent<RuntimeState>).detail;
        model.setFocus(d.hovered, d.selected);
        model.setExploded(d.exploded);
        tour = d.touring;
        const changed =
          d.cameraView !== currentView || d.exploded !== currentExploded;
        currentView = d.cameraView;
        currentExploded = d.exploded;
        if (d.cameraView === 'top') model.dial.rotation.y = 0;
        if (changed)
          setCameraPosition(
            d.cameraView === 'top'
              ? [0, 23, 0.001]
              : d.exploded
                ? [19, 14, 19]
                : [15, 18, 15],
          );
        host.dataset.layersSeparated = String(d.exploded);
      };
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('click', onClick);
      canvas.addEventListener('huangji-runtime', onRuntime);
      host.addEventListener('pointerleave', onLeave);
      return {
        onFrame: (_t: number, delta: number) => {
          if (tour && delta > 0) model.dial.rotation.y += delta * 0.00024;
          host.dataset.dialRotation = model.dial.rotation.y.toFixed(4);
        },
        dispose: () => {
          canvas.removeEventListener('pointerdown', onDown);
          canvas.removeEventListener('pointermove', onMove);
          canvas.removeEventListener('click', onClick);
          canvas.removeEventListener('huangji-runtime', onRuntime);
          host.removeEventListener('pointerleave', onLeave);
          delete host.dataset.layersSeparated;
          delete host.dataset.dialRotation;
          canvasRef.current = null;
          model.dispose();
          ground.geometry.dispose();
          (ground.material as THREE.Material).dispose();
        },
      };
    },
    [zhengGua, shiGua, yearGua, hui, yun, shi, acumYear],
  );
  useEffect(() => {
    canvasRef.current?.dispatchEvent(
      new CustomEvent<RuntimeState>('huangji-runtime', {
        detail: { hovered, selected, cameraView, touring, exploded },
      }),
    );
  }, [hovered, selected, cameraView, touring, exploded]);
  const move = (delta: number) =>
    setSelected(XIANTIAN_64[(selectedIndex + delta + 64) % 64]);
  return (
    <ThreeChartHost
      testId="huangji-time-wheel-3d"
      ariaLabel={`交互式三维皇极经世六十四卦时间轮。正卦${zhengGua}，世卦${shiGua}，年卦${yearGua}。可拖拽旋转、滚轮缩放，方向键选择卦位。`}
      camera={CAMERA}
      setup={setup}
      onUnavailable={onUnavailable}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          move(-1);
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          move(1);
        }
        if (e.key === 'Escape') setSelected(zhengGua);
      }}
    >
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div
          className="rounded-card border border-jade-500/18 bg-[var(--chart-surface)]/92 px-3 py-2 text-xs shadow-instrument backdrop-blur-sm"
          aria-live="polite"
        >
          <strong className="text-[var(--chart-text)]">
            {selected ?? zhengGua}
          </strong>
          <span className="ml-2 text-[var(--chart-text-mid)]">
            {roleText} · {selectedCode}
          </span>
        </div>
        <div
          className="pointer-events-auto flex flex-wrap justify-end gap-1 rounded-full border border-jade-500/18 bg-[var(--chart-surface)]/92 p-1 shadow-instrument backdrop-blur-sm"
          role="group"
          aria-label="皇极时间轮视角与层级控制"
        >
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs ${cameraView === 'top' ? 'bg-jade-500/18 text-[var(--chart-text)]' : 'text-[var(--chart-text-mid)]'}`}
            aria-pressed={cameraView === 'top'}
            onClick={() => {
              setCameraView('top');
              setTouring(false);
            }}
          >
            俯视
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs ${cameraView === 'orbit' ? 'bg-jade-500/18 text-[var(--chart-text)]' : 'text-[var(--chart-text-mid)]'}`}
            aria-pressed={cameraView === 'orbit'}
            onClick={() => {
              setCameraView('orbit');
              setTouring(false);
            }}
          >
            时间轮
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs ${touring ? 'bg-jade-500/18 text-[var(--chart-text)]' : 'text-[var(--chart-text-mid)]'}`}
            aria-pressed={touring}
            onClick={() => {
              setCameraView('orbit');
              setTouring((v) => !v);
            }}
          >
            巡行
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-xs ${exploded ? 'bg-jade-500/18 text-[var(--chart-text)]' : 'text-[var(--chart-text-mid)]'}`}
            aria-pressed={exploded}
            onClick={() => {
              setCameraView('orbit');
              setExploded((v) => !v);
            }}
          >
            {exploded ? '合拢' : '分层'}
          </button>
        </div>
      </div>
      <span className="sr-only">
        三维时间轮只表达现有六十四卦与会运世数据，不执行卦序、爻码、周期或积年的计算。精确阅读和导出请使用二维模式。
      </span>
    </ThreeChartHost>
  );
}
