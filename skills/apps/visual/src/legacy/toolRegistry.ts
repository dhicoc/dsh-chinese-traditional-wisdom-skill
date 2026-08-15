/**
 * toolRegistry — 纯 TS 工具目录与能力标签（从 MODULES 派生，不读浏览器全局 registry）
 */

import { MODULES, type ModuleId, type ModuleStatus, type WisdomModule } from '@/lib/modules';

export interface LegacyTool {
  id: string;
  title: string;
  icon: string;
  category: string;
  entryTab: ModuleId;
  capabilityKey: string;
  questionTypes: string[];
  requiredInputs: string[];
  privacyLevel: string;
  reportSection: string;
  accent: string;
  intro: string;
  description: string;
}

export interface LegacyCapability {
  label: string;
  mode: string;
  modeLabel: string;
  note: string;
}

const STATUS_TO_MODE: Record<ModuleStatus, string> = {
  'local-exact': 'local-exact',
  'local-approx': 'local-approx',
  demo: 'demo',
  knowledge: 'knowledge',
  derived: 'derived',
  'folk-experience': 'folk-experience',
};

function moduleToTool(module: WisdomModule): LegacyTool {
  return {
    id: module.id,
    title: module.title,
    icon: module.shortTitle.slice(0, 1),
    category: module.group,
    entryTab: module.id,
    capabilityKey: module.id,
    questionTypes: module.questionTypes,
    requiredInputs: [],
    privacyLevel: module.privacyLevel,
    reportSection: module.id,
    accent: module.accent,
    intro: module.description,
    description: module.description,
  };
}

export function getLegacyTools(): LegacyTool[] {
  return MODULES.filter((module) => module.id !== 'home').map(moduleToTool);
}

export function getLegacyCapabilities(): Record<string, LegacyCapability> {
  const out: Record<string, LegacyCapability> = {};
  for (const module of MODULES) {
    if (module.id === 'home') continue;
    out[module.id] = {
      label: module.title,
      mode: STATUS_TO_MODE[module.status] ?? module.status,
      modeLabel: module.statusLabel,
      note: module.description,
    };
  }
  return out;
}

export function getCapabilityForTool(tool: LegacyTool) {
  const capabilities = getLegacyCapabilities();
  return capabilities[tool.capabilityKey] ?? capabilities[tool.id];
}

export function getToolModeLabel(tool: LegacyTool) {
  const capability = getCapabilityForTool(tool);
  return capability?.modeLabel ?? '能力待确认';
}

export function countLegacyToolsByMode(tools: LegacyTool[], predicate: (mode: string) => boolean) {
  const capabilities = getLegacyCapabilities();
  return tools.filter((tool) => predicate(capabilities[tool.capabilityKey]?.mode ?? '')).length;
}
