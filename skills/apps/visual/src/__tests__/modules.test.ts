import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { MODULES, type ModuleId, type ModuleGroup, type ModuleStatus } from '@/lib/modules';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '..');

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(srcRoot, relativePath), 'utf8');
}

describe('Modules Registry', () => {
  it('should have modules defined', () => {
    expect(MODULES.length).toBeGreaterThan(0);
  });

  it('should have unique module ids', () => {
    const ids = MODULES.map(m => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have required fields for each module', () => {
    MODULES.forEach(module => {
      expect(module.id).toBeDefined();
      expect(module.group).toBeDefined();
      expect(module.title).toBeDefined();
      expect(module.shortTitle).toBeDefined();
      expect(module.status).toBeDefined();
      expect(module.statusLabel).toBeDefined();
      expect(module.privacyLevel).toBeDefined();
      expect(module.questionTypes).toBeDefined();
      expect(module.accent).toBeDefined();
      expect(module.description).toBeDefined();
    });
  });

  it('should have valid module ids', () => {
    const validIds: ModuleId[] = [
      'home', 'bazi', 'ziwei', 'liuyao', 'meihua', 'qimen',
      'fengshui', 'feixing', 'bazhai', 'yunqi', 'tizhi',
      'almanac', 'namewuxing', 'dream', 'rhythm',
      'reader', 'history', 'combo', 'liuren', 'xingxiu', 'taiyi', 'huangji', 'cezi', 'chenguz'
    ];
    const ids = MODULES.map(m => m.id);
    ids.forEach(id => {
      expect(validIds).toContain(id);
    });
  });

  it('should categorize modules into valid groups', () => {
    const validGroups: ModuleGroup[] = [
      '易学源流', '术数排盘', '堪舆风水', '医道运气', '日用工具', '知识检索', '古籍与历史'
    ];
    MODULES.forEach(module => {
      expect(validGroups).toContain(module.group);
    });
  });

  it('should have home as first module', () => {
    expect(MODULES[0].id).toBe('home');
  });

  it('should have consistent status metadata', () => {
    const validStatuses: ModuleStatus[] = ['local-exact', 'local-approx', 'demo', 'knowledge', 'derived', 'folk-experience'];
    MODULES.forEach(module => {
      expect(validStatuses).toContain(module.status);
    });
  });

  it('should have non-empty question types', () => {
    MODULES.forEach(module => {
      expect(module.questionTypes.length).toBeGreaterThan(0);
    });
  });
});

describe('Daily Utility Tools (v0.4)', () => {
  it('should include all four daily utility tools', () => {
    const utilityIds = ['almanac', 'namewuxing', 'dream', 'rhythm'];
    const ids = MODULES.map(m => m.id);
    utilityIds.forEach(id => {
      expect(ids).toContain(id);
    });
  });

  it('should have daily utility tools in correct group', () => {
    const utilityModules = MODULES.filter(m =>
      ['almanac', 'namewuxing', 'dream', 'rhythm'].includes(m.id)
    );
    utilityModules.forEach(module => {
      expect(module.group).toBe('日用工具');
    });
  });

  it('should have folk-experience status for utility tools', () => {
    const utilityModules = MODULES.filter(m =>
      ['almanac', 'namewuxing', 'dream', 'rhythm'].includes(m.id)
    );
    utilityModules.forEach(module => {
      expect(module.status).toBe('folk-experience');
    });
  });
});

describe('AppShell global reference notice', () => {
  it('should present the shared ancient-text and folk-reference boundary', () => {
    const source = readSource('components/app-shell/AppShell.tsx');

    expect(source).toContain('整理自古籍、传统民俗与既有规则');
    expect(source).toContain('未作现实世界验证，仅供学习和参考');
  });
});

describe('Sidebar birth panel layout', () => {
  it('should keep the local privacy notice visible when the birth panel is expanded', () => {
    const source = readSource('components/app-shell/SidebarNav.tsx');

    expect(source).toContain('mt-3 min-h-0 flex-1 overflow-y-auto');
    expect(source).toContain('mt-auto shrink-0 pt-3');
  });
});

describe('Dashboard development workspace boundary', () => {
  it('should not expose the test runner as a user workspace', () => {
    const registrySource = readSource('components/app-shell/workspaceRegistry.tsx');

    expect(MODULES.map((module) => module.id)).not.toContain('testing');
    expect(registrySource).not.toContain('TestRunnerConsole');
  });
});

describe('Bazi true solar time runtime boundary', () => {
  it('should only let an agent-verified true solar result change the Bazi input time', () => {
    const contextSource = readSource('lib/birthContext.tsx');
    const workspaceSource = readSource('features/bazi/BaziWorkspace.tsx');
    const panelSource = readSource('components/shared/BirthPanel.tsx');

    expect(contextSource).toContain("status: 'awaiting-agent-verification'");
    expect(contextSource).toContain("status: 'true-solar-verified'");
    expect(contextSource).toContain("status: 'civil-unverified'");
    expect(contextSource).not.toContain('resolveBaziBirthTime');
    expect(workspaceSource).toContain("baziTimeStatus.status === 'true-solar-verified'");
    expect(workspaceSource).toContain('baziTimeStatus.resolution.trueSolarBirth');
    expect(workspaceSource).not.toContain('地方平太阳时');
    expect(panelSource).toContain('请提供可定位的出生地，以核对地点、历史时区与夏令时');
    expect(panelSource).toContain('完成核验后将以校正后的出生时间排盘');
    expect(panelSource).not.toContain('经度（东正西负）');
    expect(panelSource).not.toContain('实际 UTC 偏移（分钟）');
  });
});

describe('Bazi dynamic layer dashboard boundary', () => {
  it('should render the pure engine dynamic layer without invoking CLI contracts', () => {
    const source = readSource('features/bazi/BaziWorkspace.tsx');

    expect(source).toContain('buildBaziDynamicLayer');
    expect(source).not.toContain('getBaziTransitSnapshot');
    expect(source).not.toContain('getBaziMonthDaySnapshot');
    expect(source).not.toContain('runLocalTool');
    expect(source).not.toContain('parseLocalToolInput');
    expect(source).toContain('当前小运');
    expect(source).toContain('小运按虚岁定位');
    expect(source).toContain('动态层均按目标日期计算；本命盘保持不变。');
    expect(source).toContain('传统文化参考');
  });
});

describe('XuanOrbitLogo', () => {
  it('should be a decorative celestial orbit icon with the approved structure', () => {
    const source = readSource('components/app-shell/XuanOrbitLogo.tsx');

    expect(source).toContain('export function XuanOrbitLogo');
    expect(source).toContain('aria-hidden="true"');
    expect(source).toContain('viewBox="0 0 100 100"');
    expect(source).toContain('data-logo-part="outer-disc"');
    expect(source).toContain('data-logo-part="horizontal-orbit"');
    expect(source).toContain('data-logo-part="vertical-orbit"');
    expect(source).toContain('data-logo-part="star-core"');
    expect(source).toContain('data-logo-part="anchor-star-left"');
    expect(source).toContain('data-logo-part="anchor-star-right"');
    expect(source).not.toContain('>玄<');
  });
});
