import { useEffect, useRef, type KeyboardEventHandler, type ReactNode } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface ThreeChartCameraConfig {
  fov?: number;
  near?: number;
  far?: number;
  position: readonly [number, number, number];
  up?: readonly [number, number, number];
  target?: readonly [number, number, number];
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
  dampingFactor?: number;
}

export interface ThreeChartSetupContext {
  host: HTMLDivElement;
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  setCameraPosition: (position: readonly [number, number, number]) => void;
}

export interface ThreeChartSceneController {
  onFrame?: (time: number, delta: number) => void;
  dispose?: () => void;
}

interface ThreeChartHostProps {
  testId: string;
  ariaLabel: string;
  camera: ThreeChartCameraConfig;
  setup: (context: ThreeChartSetupContext) => ThreeChartSceneController | void;
  onUnavailable?: () => void;
  onKeyDown?: KeyboardEventHandler<HTMLCanvasElement>;
  className?: string;
  children?: ReactNode;
}

export function resolveThreeChartCssColor(variable: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const probe = document.createElement('span');
  probe.style.color = `var(${variable})`;
  probe.style.position = 'fixed';
  probe.style.pointerEvents = 'none';
  probe.style.opacity = '0';
  document.body.appendChild(probe);
  const result = getComputedStyle(probe).color || fallback;
  probe.remove();
  return result;
}

export function ThreeChartHost({
  testId,
  ariaLabel,
  camera: cameraConfig,
  setup,
  onUnavailable,
  onKeyDown,
  className = 'max-w-[680px]',
  children,
}: ThreeChartHostProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      onUnavailable?.();
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1 : 1.25));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(cameraConfig.fov ?? 28, 1, cameraConfig.near ?? 0.1, cameraConfig.far ?? 80);
    camera.position.set(...cameraConfig.position);
    if (cameraConfig.up) camera.up.set(...cameraConfig.up);
    const target = cameraConfig.target ?? [0, 0, 0];
    camera.lookAt(...target);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = cameraConfig.dampingFactor ?? 0.065;
    controls.minDistance = cameraConfig.minDistance ?? 8;
    controls.maxDistance = cameraConfig.maxDistance ?? 42;
    controls.minPolarAngle = cameraConfig.minPolarAngle ?? 0.025;
    controls.maxPolarAngle = cameraConfig.maxPolarAngle ?? Math.PI * 0.46;
    controls.target.set(...target);
    controls.autoRotate = false;

    const syncCameraDataset = () => {
      host.dataset.cameraPosition = camera.position.toArray().map((value) => value.toFixed(3)).join(',');
      host.dataset.cameraDistance = camera.position.distanceTo(controls.target).toFixed(3);
    };
    controls.addEventListener('change', syncCameraDataset);
    controls.update();
    syncCameraDataset();
    host.dataset.controlsEnabled = 'true';

    const setCameraPosition = (position: readonly [number, number, number]) => {
      camera.position.set(...position);
      controls.target.set(...target);
      controls.enabled = true;
      controls.update();
      host.dataset.controlsEnabled = 'true';
    };

    let pointerInside = false;
    const onHostPointerEnter = () => {
      pointerInside = true;
      host.dataset.wheelCapture = 'active';
    };
    const onHostPointerLeave = () => {
      pointerInside = false;
      delete host.dataset.wheelCapture;
    };
    const onWheel = (event: WheelEvent) => {
      if (!pointerInside) return;
      event.preventDefault();
      event.stopPropagation();
      controls.enabled = true;
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? Math.max(1, host.clientHeight)
          : 1;
      const currentDistance = camera.position.distanceTo(controls.target);
      const nextDistance = THREE.MathUtils.clamp(
        currentDistance * Math.exp(event.deltaY * unit * 0.0012),
        controls.minDistance,
        controls.maxDistance,
      );
      const direction = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(direction, nextDistance);
      controls.update();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      onUnavailable?.();
    };

    host.addEventListener('pointerenter', onHostPointerEnter);
    host.addEventListener('pointerleave', onHostPointerLeave);
    host.addEventListener('wheel', onWheel, { passive: false, capture: true });
    canvas.addEventListener('webglcontextlost', onContextLost);

    const resize = () => {
      const rect = host.getBoundingClientRect();
      renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
      camera.aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    let visible = true;
    const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibilityObserver.observe(host);
    resize();

    let controller: ThreeChartSceneController | void;
    try {
      controller = setup({ host, canvas, renderer, scene, camera, controls, setCameraPosition });
    } catch (error) {
      console.error('ThreeChartHost setup failed', error);
      onUnavailable?.();
      controls.dispose();
      renderer.dispose();
      return;
    }

    let running = true;
    let frame = 0;
    let lastFrameAt = 0;
    const frameInterval = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 33;
    const render = (time = 0) => {
      if (!running) return;
      frame = requestAnimationFrame(render);
      if (!visible || document.hidden || time - lastFrameAt < frameInterval) return;
      const delta = lastFrameAt > 0 ? Math.min(100, time - lastFrameAt) : 0;
      lastFrameAt = time;
      controller?.onFrame?.(time, delta);
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      host.removeEventListener('pointerenter', onHostPointerEnter);
      host.removeEventListener('pointerleave', onHostPointerLeave);
      host.removeEventListener('wheel', onWheel, { capture: true });
      canvas.removeEventListener('webglcontextlost', onContextLost);
      controller?.dispose?.();
      controls.removeEventListener('change', syncCameraDataset);
      controls.dispose();
      renderer.dispose();
      delete host.dataset.controlsEnabled;
      delete host.dataset.cameraPosition;
      delete host.dataset.cameraDistance;
      delete host.dataset.wheelCapture;
    };
  }, [cameraConfig, onUnavailable, setup]);

  return (
    <div
      ref={hostRef}
      className={`relative mx-auto aspect-square w-full overflow-hidden rounded-card ${className}`}
      data-testid={testId}
      data-wheel-zoom="hover-capture"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-jade-400/70"
        tabIndex={0}
        role="img"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
      />
      {children}
    </div>
  );
}
