import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { XingXiuEntry } from '@/legacy/xingxiuEngine';
import {
  createXingXiuArmillaryModel,
  type MansionPart,
  type XingXiuTheme3D,
} from './three/createXingXiuArmillaryModel';
import {
  ThreeChartHost,
  resolveThreeChartCssColor,
  type ThreeChartCameraConfig,
  type ThreeChartSetupContext,
} from './three/ThreeChartHost';

interface XingXiuChart3DProps {
  allXiu: XingXiuEntry[];
  zhiXiu: string;
  benMingXiu: string;
  onUnavailable?: () => void;
}

type CameraView = 'top' | 'orbit';
interface RuntimeState {
  hovered: string | null;
  selected: string | null;
  cameraView: CameraView;
  touring: boolean;
  armillary: boolean;
}

const CAMERA_CONFIG: ThreeChartCameraConfig = {
  fov: 30,
  near: .1,
  far: 90,
  position: [0, 23, .001],
  up: [0, 0, -1],
  target: [0, 0, 0],
  minDistance: 11,
  maxDistance: 44,
  minPolarAngle: .025,
  maxPolarAngle: Math.PI * .44,
};

function readTheme(): XingXiuTheme3D {
  return {
    page: resolveThreeChartCssColor('--chart-page', '#efeadd'),
    surface: resolveThreeChartCssColor('--chart-surface', '#f0ecdf'),
    text: resolveThreeChartCssColor('--chart-text', '#2b2924'),
    muted: resolveThreeChartCssColor('--chart-text-mid', '#766f61'),
    qinglong: resolveThreeChartCssColor('--wz-wood', '#3f7454'),
    zhuque: resolveThreeChartCssColor('--wz-fire', '#c63e2b'),
    baihu: resolveThreeChartCssColor('--c-gold', '#9b814d'),
    xuanwu: resolveThreeChartCssColor('--wz-water', '#365f78'),
    gold: resolveThreeChartCssColor('--wz-earth', '#c59a3b'),
    brass: resolveThreeChartCssColor('--c-gold', '#a28a55'),
  };
}

export function XingXiuChart3D({ allXiu, zhiXiu, benMingXiu, onUnavailable }: XingXiuChart3DProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [cameraView, setCameraView] = useState<CameraView>('top');
  const [touring, setTouring] = useState(false);
  const [armillary, setArmillary] = useState(false);
  const runtimeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const names = useMemo(() => allXiu.map((entry) => entry.name), [allXiu]);
  const activeEntry = useMemo(() => allXiu.find((entry) => entry.name === selected) ?? null, [allXiu, selected]);

  const setup = useCallback((runtime: ThreeChartSetupContext) => {
    const { host, canvas, scene, camera, setCameraPosition } = runtime;
    runtimeCanvasRef.current = canvas;
    const model = createXingXiuArmillaryModel({ allXiu, zhiXiu, benMingXiu, theme: readTheme() });
    scene.add(model.root);
    scene.add(new THREE.HemisphereLight('#fff8e8', '#c8d7dc', 1.9));
    const key = new THREE.DirectionalLight('#fff3d8', 2.45);
    key.position.set(-5, 9, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.normalBias=.035; key.shadow.bias=-.00025;
    key.shadow.camera.left=-7;key.shadow.camera.right=7;key.shadow.camera.top=7;key.shadow.camera.bottom=-7;scene.add(key);
    const rim = new THREE.DirectionalLight('#c9dcf0', .78); rim.position.set(6,5,-6); scene.add(rim);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(7,128),new THREE.ShadowMaterial({color:'#625d52',opacity:.1}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.26;ground.receiveShadow=true;scene.add(ground);

    const raycaster=new THREE.Raycaster();const pointer=new THREE.Vector2();const pointerDown=new THREE.Vector2();
    let tourActive=false;let armillaryActive=false;let currentView:CameraView='top';
    const locate=(event:PointerEvent)=>{const rect=canvas.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(model.selectable,false)[0]?.object as MansionPart|undefined;};
    const onPointerDown=(event:PointerEvent)=>pointerDown.set(event.clientX,event.clientY);
    const onPointerMove=(event:PointerEvent)=>{const hit=locate(event);setHovered(hit?.userData.value??null);canvas.style.cursor=hit?'pointer':'grab';};
    const onPointerLeave=()=>{setHovered(null);canvas.style.cursor='grab';};
    const onClick=(event:PointerEvent)=>{if(pointerDown.distanceTo(new THREE.Vector2(event.clientX,event.clientY))>6)return;const value=locate(event)?.userData.value;if(value&&names.includes(value))setSelected((current)=>current===value?null:value);};
    const onRuntime=(event:Event)=>{const detail=(event as CustomEvent<RuntimeState>).detail;model.setFocus(detail.hovered,detail.selected);model.setArmillary(detail.armillary);tourActive=detail.touring;armillaryActive=detail.armillary;if(detail.cameraView!==currentView){currentView=detail.cameraView;setCameraPosition(detail.cameraView==='top'?[0,23,.001]:[13.5,16,13.5]);}host.dataset.armillaryVisible=String(detail.armillary);};
    canvas.addEventListener('pointerdown',onPointerDown);canvas.addEventListener('pointermove',onPointerMove);canvas.addEventListener('click',onClick);canvas.addEventListener('xingxiu-runtime',onRuntime);host.addEventListener('pointerleave',onPointerLeave);
    return {onFrame:(_time:number,delta:number)=>{if(tourActive&&delta>0)model.dial.rotation.y+=delta*.00026;if(armillaryActive&&delta>0){model.armillary.rotation.y+=delta*.00011;model.armillary.rotation.z+=delta*.000035;}host.dataset.dialRotation=model.dial.rotation.y.toFixed(4);},dispose:()=>{canvas.removeEventListener('pointerdown',onPointerDown);canvas.removeEventListener('pointermove',onPointerMove);canvas.removeEventListener('click',onClick);canvas.removeEventListener('xingxiu-runtime',onRuntime);host.removeEventListener('pointerleave',onPointerLeave);delete host.dataset.armillaryVisible;delete host.dataset.dialRotation;runtimeCanvasRef.current=null;model.dispose();ground.geometry.dispose();(ground.material as THREE.Material).dispose();}};
  }, [allXiu, benMingXiu, names, zhiXiu]);

  useEffect(()=>{runtimeCanvasRef.current?.dispatchEvent(new CustomEvent<RuntimeState>('xingxiu-runtime',{detail:{hovered,selected,cameraView,touring,armillary}}));},[hovered,selected,cameraView,touring,armillary]);
  const moveSelection=(delta:number)=>{const index=selected?names.indexOf(selected):-1;setSelected(names[(index+delta+names.length)%names.length]);};

  return (
    <ThreeChartHost
      testId="xingxiu-chart-3d"
      ariaLabel={`交互式三维二十八星宿星盘。值日${zhiXiu}，本命${benMingXiu}。可拖拽旋转、滚轮缩放，左右方向键选择星宿。`}
      camera={CAMERA_CONFIG}
      setup={setup}
      onUnavailable={onUnavailable}
      onKeyDown={(event)=>{if(event.key==='ArrowLeft'){event.preventDefault();moveSelection(-1);}if(event.key==='ArrowRight'){event.preventDefault();moveSelection(1);}if(event.key==='Escape')setSelected(null);}}
    >
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="rounded-card border border-jade-500/18 bg-[var(--chart-surface)]/92 px-3 py-2 text-xs shadow-instrument backdrop-blur-sm" aria-live="polite">
          {activeEntry?<><strong className="text-[var(--chart-text)]">{activeEntry.fullName}</strong><span className="ml-2 text-[var(--chart-text-mid)]">{activeEntry.xiang} · {activeEntry.yao}曜</span></>:<span className="text-[var(--chart-text-mid)]">点击星宿查看 · 拖拽旋转 · 滚轮缩放</span>}
        </div>
        <div className="pointer-events-auto flex flex-wrap justify-end gap-1 rounded-full border border-jade-500/18 bg-[var(--chart-surface)]/92 p-1 shadow-instrument backdrop-blur-sm" role="group" aria-label="三维星宿视角与星环控制">
          <button type="button" className={`rounded-full px-3 py-1.5 text-xs ${cameraView==='top'?'bg-jade-500/18 text-[var(--chart-text)]':'text-[var(--chart-text-mid)]'}`} aria-pressed={cameraView==='top'} onClick={()=>{setCameraView('top');setTouring(false);setArmillary(false);}}>俯视</button>
          <button type="button" className={`rounded-full px-3 py-1.5 text-xs ${cameraView==='orbit'?'bg-jade-500/18 text-[var(--chart-text)]':'text-[var(--chart-text-mid)]'}`} aria-pressed={cameraView==='orbit'} onClick={()=>{setCameraView('orbit');setTouring(false);setArmillary(true);}}>浑天</button>
          <button type="button" className={`rounded-full px-3 py-1.5 text-xs ${touring?'bg-jade-500/18 text-[var(--chart-text)]':'text-[var(--chart-text-mid)]'}`} aria-pressed={touring} onClick={()=>{setCameraView('orbit');setTouring((value)=>!value);}}>巡游</button>
          <button type="button" className={`rounded-full px-3 py-1.5 text-xs ${armillary?'bg-jade-500/18 text-[var(--chart-text)]':'text-[var(--chart-text-mid)]'}`} aria-pressed={armillary} onClick={()=>{setCameraView('orbit');setArmillary((value)=>!value);}}>{armillary?'收起星环':'展开星环'}</button>
        </div>
      </div>
      <span className="sr-only">三维星盘只表达现有四象与二十八宿分组，不生成天文学坐标或新的传统事实。精确阅读与导出请使用二维模式。</span>
    </ThreeChartHost>
  );
}
