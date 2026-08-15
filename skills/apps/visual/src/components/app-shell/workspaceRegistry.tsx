import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { HomeDashboard } from '@/features/home/HomeDashboard';
import type { ModuleId } from '@/lib/modules';

interface WorkspaceProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

/**
 * 懒加载：除默认首页（首屏直出）外，其余 23 个工作区均按需动态 import。
 * 这样首屏不再打包全部排盘引擎（lunar-javascript / iztro / 3meta 等），
 * 用户点开对应标签时才拉取对应 chunk，显著缩小首屏体积。
 * 注意：各工作区为具名导出（export function XxxWorkspace），
 * React.lazy 需要 default 导出，故用 .then(m => ({ default: m.Xxx })) 适配。
 */
type WorkspaceComponent = ComponentType<WorkspaceProps> | LazyExoticComponent<ComponentType<WorkspaceProps>>;

export const WORKSPACE_COMPONENTS: Partial<Record<ModuleId, WorkspaceComponent>> = {
  bazi: lazy(() => import('@/features/bazi/BaziWorkspace').then((m) => ({ default: m.BaziWorkspace }))),
  yunqi: lazy(() => import('@/features/yunqi/YunqiWorkspace').then((m) => ({ default: m.YunqiWorkspace }))),
  meihua: lazy(() => import('@/features/meihua/MeihuaWorkspace').then((m) => ({ default: m.MeihuaWorkspace }))),
  qimen: lazy(() => import('@/features/qimen/QimenWorkspace').then((m) => ({ default: m.QimenWorkspace }))),
  liuyao: lazy(() => import('@/features/liuyao/LiuyaoWorkspace').then((m) => ({ default: m.LiuyaoWorkspace }))),
  ziwei: lazy(() => import('@/features/ziwei/ZiweiWorkspace').then((m) => ({ default: m.ZiweiWorkspace }))),
  tizhi: lazy(() => import('@/features/constitution/ConstitutionWorkspace').then((m) => ({ default: m.ConstitutionWorkspace }))),
  feixing: lazy(() => import('@/features/feixing/FeixingWorkspace').then((m) => ({ default: m.FeixingWorkspace }))),
  bazhai: lazy(() => import('@/features/bazhai/BazhaiWorkspace').then((m) => ({ default: m.BazhaiWorkspace }))),
  fengshui: lazy(() => import('@/features/fengshui/FengshuiWorkspace').then((m) => ({ default: m.FengshuiWorkspace }))),
  reader: lazy(() => import('@/features/knowledge/AncientTextSplitReader').then((m) => ({ default: m.AncientTextSplitReader }))),
  history: lazy(() => import('@/features/history/HistoryPanel').then((m) => ({ default: m.HistoryWorkspace }))),
  // 日用工具扩展 (v0.4)
  almanac: lazy(() => import('@/features/almanac/AlmanacWorkspace').then((m) => ({ default: m.AlmanacWorkspace }))),
  namewuxing: lazy(() => import('@/features/namewuxing/NamewuxingWorkspace').then((m) => ({ default: m.NamewuxingWorkspace }))),
  dream: lazy(() => import('@/features/dream/DreamWorkspace').then((m) => ({ default: m.DreamWorkspace }))),
  rhythm: lazy(() => import('@/features/rhythm/RhythmWorkspace').then((m) => ({ default: m.RhythmWorkspace }))),
  combo: lazy(() => import('@/features/combo/ComboWorkspace').then((m) => ({ default: m.ComboWorkspace }))),
  liuren: lazy(() => import('@/features/liuren/LiurenWorkspace').then((m) => ({ default: m.LiurenWorkspace }))),
  xingxiu: lazy(() => import('@/features/xingxiu/XingXiuWorkspace').then((m) => ({ default: m.XingXiuWorkspace }))),
  taiyi: lazy(() => import('@/features/taiyi/TaiyiWorkspace').then((m) => ({ default: m.TaiyiWorkspace }))),
  huangji: lazy(() => import('@/features/huangji/HuangjiWorkspace').then((m) => ({ default: m.HuangjiWorkspace }))),
  cezi: lazy(() => import('@/features/cezi/CeziWorkspace').then((m) => ({ default: m.CeziWorkspace }))),
  chenguz: lazy(() => import('@/features/chenguz/ChenguzWorkspace').then((m) => ({ default: m.ChenguzWorkspace }))),
};

export function resolveWorkspace(moduleId: ModuleId): WorkspaceComponent {
  return WORKSPACE_COMPONENTS[moduleId] ?? HomeDashboard;
}
