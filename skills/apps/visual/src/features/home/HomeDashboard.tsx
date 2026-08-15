import { useMemo } from 'react';
import { calculateBazi as calculateBaziPure } from '@/engine-api/bazi';
import { getSolarEntry } from '@/engine-api/calendar';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { HomeBaziPlate } from '@/components/shared/HomeBaziPlate';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import type { ModuleId } from '@/lib/modules';
import { MODULES } from '@/lib/modules';
import { type BaziPillars } from '@/legacy/canvasRenderers';
import { getCapabilityForTool, getLegacyTools, type LegacyTool } from '@/legacy/toolRegistry';
import type { SolarBirth } from '@/legacy/birthBridge';
import { useBirth } from '@/lib/birthContext';

const FALLBACK_PILLARS: BaziPillars = {
  year: { stem: '甲', branch: '辰' },
  month: { stem: '丙', branch: '寅' },
  day: { stem: '戊', branch: '午' },
  hour: { stem: '庚', branch: '申' },
  dayMaster: '戊',
  gender: '男',
};

/** 根据出生资料取得四柱；失败时仅显示占位内容，不作为结果说明。 */
function resolvePillars(solarBirth: SolarBirth, ready: boolean): { pillars: BaziPillars } {
  if (!ready) return { pillars: { ...FALLBACK_PILLARS, gender: solarBirth.gender } };
  try {
    const pure = calculateBaziPure({ birth: solarBirth, solar: getSolarEntry() });
    const pillars: BaziPillars = {
      year: { stem: pure.pillars.year.stem, branch: pure.pillars.year.branch, hidden: pure.hiddenStems.year },
      month: { stem: pure.pillars.month.stem, branch: pure.pillars.month.branch, hidden: pure.hiddenStems.month },
      day: { stem: pure.pillars.day.stem, branch: pure.pillars.day.branch, hidden: pure.hiddenStems.day },
      hour: { stem: pure.pillars.hour.stem, branch: pure.pillars.hour.branch, hidden: pure.hiddenStems.hour },
      dayMaster: pure.dayMaster,
      gender: pure.gender,
    };
    return { pillars };
  } catch {
    return { pillars: { ...FALLBACK_PILLARS, gender: solarBirth.gender } };
  }
}

interface HomeDashboardProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

function isModuleId(value: string): value is ModuleId {
  return MODULES.some((module) => module.id === value);
}

function modeCounts(tools: LegacyTool[]) {
  let local = 0;
  let demo = 0;
  tools.forEach((tool) => {
    const mode = getCapabilityForTool(tool)?.mode ?? '';
    if (mode === 'local' || mode === 'local-exact' || mode === 'local-approx' || mode === 'derived' || mode === 'knowledge') local += 1;
    if (mode === 'demo' || mode === 'fallback-demo' || mode === 'external-required') demo += 1;
  });
  return { local, demo };
}

export function HomeDashboard({ activeModule, onSelectModule }: HomeDashboardProps) {
  const { solarBirth } = useBirth();
  const tools = useMemo(() => getLegacyTools(), []);

  const ready = true;
  const legacyReady = ready;
  const { pillars } = useMemo(() => resolvePillars(solarBirth, ready), [solarBirth, ready]);

  const selected = MODULES.find((module) => module.id === activeModule) ?? MODULES[0];
  const grouped = useMemo(
    () => tools.reduce<Record<string, LegacyTool[]>>((acc, tool) => {
      acc[tool.category] = acc[tool.category] ?? [];
      acc[tool.category].push(tool);
      return acc;
    }, {}),
    [tools],
  );
  const counts = modeCounts(tools);

  return (
    <section className="space-y-5" data-testid="home-dashboard">
      {/* 场景化入口（UX P1） */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: '我想看运势', desc: '八字命盘 · 五行喜用', module: 'bazi' as ModuleId, icon: '运' },
          { label: '我想起名', desc: '姓名五行 · 五格评分', module: 'namewuxing' as ModuleId, icon: '名' },
          { label: '我想问事', desc: '六爻纳甲 · 事件占断', module: 'liuyao' as ModuleId, icon: '卜' },
          { label: '我想看风水', desc: '二十四山 · 八卦方位', module: 'fengshui' as ModuleId, icon: '堪' },
        ].map((entry, idx) => (
          <button
            key={entry.label}
            type="button"
            onClick={() => onSelectModule(entry.module)}
            className={`group flex items-center gap-3 rounded-panel border border-ink-700 bg-ink-850/60 p-4 text-left transition hover:border-jade-500/30 hover:bg-ink-850/80 ct-animate-slide-up ct-delay-${idx + 1}`}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-jade-500/25 bg-jade-500/10 font-serif text-lg text-jade-400 transition group-hover:bg-jade-500/20">
              {entry.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-jade-100">{entry.label}</p>
              <p className="mt-0.5 truncate text-xs text-jade-100/45">{entry.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <section className="console-panel rounded-panel border border-jade-500/20 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-semibold tracking-[0.1em] text-jade-50">四柱 / 九宫工作台</h2>
          </div>
          <CopyContextButton
            commandScope="home"
            title="工具目录摘要"
            payload={{ 当前页面: selected, 工具数量: tools.length, 可用工具: counts.local }}
          />
        </div>
        <div className="mt-4">
          {ready ? (
            <div className="mx-auto max-w-[460px]">
              <ZoomableSvg title="四柱 / 九宫命盘">
                <HomeBaziPlate pillars={pillars} size={460} />
              </ZoomableSvg>
            </div>
          ) : (
            <div className="mx-auto max-w-[460px]">
              <LoadingSkeleton label="正在排盘" />
            </div>
          )}
          <p className="mt-2 text-center text-[11px] text-jade-100/45">
            {ready ? '双击可放大查看，右键可复制图像' : '正在生成四柱命盘…'}
          </p>
        </div>
      </section>

      <div className="grid gap-4">
        {Object.entries(grouped).map(([group, groupTools]) => (
          <section key={group} className="console-panel rounded-panel border border-ink-700 bg-ink-950/82 p-4">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/8 pb-3">
              <h3 className="font-serif text-base font-semibold tracking-[0.12em] text-jade-100">{group}</h3>
              <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-jade-100/45">{groupTools.length} 个入口</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {groupTools.map((tool) => {
                return (
                  <button key={tool.id} type="button" onClick={() => isModuleId(tool.entryTab) && onSelectModule(tool.entryTab)} className="flex items-center justify-between gap-3 rounded-card border border-white/8 bg-black/25 px-3 py-3 text-left transition hover:border-jade-500/25 hover:bg-white/[0.04]">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-jade-100">{tool.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-jade-100/55">{tool.questionTypes.slice(0, 2).join(' / ')}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
