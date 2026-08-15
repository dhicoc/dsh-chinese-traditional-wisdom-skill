import { useEffect, useMemo, useState } from 'react';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { FengshuiCompass } from '@/components/shared/FengshuiCompass';
import { KnowledgeReferencePanel } from '@/components/shared/KnowledgeReferencePanel';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { createFengshuiExportReport } from '@/features/anonymousExport';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';
import {
  getFeixingGrid,
  getBazhaiGrid,
  NINE_STAR_REMEDIES,
  MING_GUA_DIRECTIONS,
  PALACE_TO_DIR,
  getYuanYun,
} from '@/engine-api/bazhai';
import { useBirth } from '@/lib/birthContext';

// 坐向选项（坐山→朝向）
const FACING_OPTIONS = [
  { value: '', label: '不选（静态罗盘）' },
  { value: '子午', label: '坐子向午（坐北朝南）' },
  { value: '午子', label: '坐午向子（坐南朝北）' },
  { value: '卯酉', label: '坐卯向酉（坐东朝西）' },
  { value: '酉卯', label: '坐酉向卯（坐西朝东）' },
  { value: '巽乾', label: '坐巽向乾（坐东南朝西北）' },
  { value: '乾巽', label: '坐乾向巽（坐西北朝东南）' },
  { value: '艮坤', label: '坐艮向坤（坐东北朝西南）' },
  { value: '坤艮', label: '坐坤向艮（坐西南朝东北）' },
];

// 卦名 → 卦数
function trigramToGuaNum(trigram: string): number | null {
  const map: Record<string, number> = { '坎': 1, '坤': 2, '震': 3, '巽': 4, '乾': 6, '兑': 7, '艮': 8, '离': 9 };
  return map[trigram] ?? null;
}

export function FengshuiWorkspace() {
  const { solarBirth } = useBirth();
  const [facing, setFacing] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [draftYear, setDraftYear] = useState(String(new Date().getFullYear()));
  useEffect(() => { setDraftYear(String(year)); }, [year]);
  const commitYearDraft = () => {
    const n = Number.parseInt(draftYear, 10);
    if (Number.isNaN(n) || draftYear.trim() === '') { setDraftYear(String(year)); return; }
    setYear(n);
  };

  const ready = true;

  // 飞星九宫数据
  const feixingGrid = useMemo(() => (ready ? getFeixingGrid(year) : null), [ready, year]);
  // 八宅命盘数据（读全局生辰）
  const bazhaiGrid = useMemo(() => (ready ? getBazhaiGrid(solarBirth.year, solarBirth.gender) : null), [ready, solarBirth]);

  // 组合罗盘叠加数据：飞星 + 八宅游年星
  const overlay = useMemo(() => {
    const result: Record<string, {
      starNum?: number; starName?: string; starLuck?: string; usageLabel?: string;
      mansionStar?: string; mansionLuck?: string;
    }> = {};

    // 飞星
    if (feixingGrid) {
      feixingGrid.flat().forEach((cell) => {
        const dir = PALACE_TO_DIR[cell.palace];
        if (!dir || dir === '中') return;
        const remedy = NINE_STAR_REMEDIES[cell.starNum];
        result[dir] = {
          ...result[dir],
          starNum: cell.starNum,
          starName: remedy?.name?.slice(0, 3) ?? '',
          starLuck: remedy?.nature ?? '',
          usageLabel: remedy?.usageLabel ?? '',
        };
      });
    }

    // 八宅游年星
    if (bazhaiGrid) {
      bazhaiGrid.sectors.forEach((s) => {
        const dir = s.direction;
        if (!dir) return;
        result[dir] = {
          ...result[dir],
          mansionStar: s.star,
          mansionLuck: s.luck,
        };
      });
    }

    return result;
  }, [feixingGrid, bazhaiGrid]);

  // 命卦吉方
  const mingGuaDirs = useMemo(() => {
    if (!bazhaiGrid?.trigram) return null;
    const guaNum = trigramToGuaNum(bazhaiGrid.trigram);
    if (!guaNum) return null;
    return MING_GUA_DIRECTIONS[guaNum] ?? null;
  }, [bazhaiGrid]);

  // 元运
  const yuanYun = useMemo(() => getYuanYun(year), [year]);

  const contextPayload = useMemo(() => ({
    项目: '风水罗盘',
    房屋坐向: facing || '未选',
    年份: year,
    命卦: bazhaiGrid?.trigram ?? '?',
  }), [facing, year, bazhaiGrid]);

  // 方位吉凶一览
  const directionSummary = useMemo(() => {
    if (!feixingGrid) return null;
    const flat = feixingGrid.flat();
    const findDir = (starNum: number) => {
      const cell = flat.find((c) => c.starNum === starNum);
      return cell ? PALACE_TO_DIR[cell.palace] ?? cell.palace : '';
    };
    return {
      wealth: findDir(8),
      study: findDir(4),
      romance: findDir(1),
      illness: findDir(2),
      danger: findDir(5),
    };
  }, [feixingGrid]);
  const exportReport = useMemo(() => ({
    summary: `${year}年${facing ? `坐${facing.charAt(0)}向${facing.charAt(1)}的` : ''}方位参考。`,
    sections: [
      { heading: '基本资料', body: `年份：${year}\n元运：${yuanYun.name}（${yuanYun.startYear}-${yuanYun.endYear}）\n房屋坐向：${facing ? `坐${facing.charAt(0)}向${facing.charAt(1)}` : '未设置'}\n命卦：${bazhaiGrid ? `${bazhaiGrid.trigram}卦 · ${bazhaiGrid.group}` : '—'}` },
      ...(directionSummary ? [{ heading: '流年方位', body: `财位：${directionSummary.wealth}方\n文昌位：${directionSummary.study}方\n桃花位：${directionSummary.romance}方\n病符位：${directionSummary.illness}方\n五黄位：${directionSummary.danger}方` }] : []),
      ...(mingGuaDirs ? [{ heading: '个人方位参考', body: `生气位：${mingGuaDirs.shengqi}方\n天医位：${mingGuaDirs.tianyi}方\n延年位：${mingGuaDirs.niannian}方\n绝命位：${mingGuaDirs.jueming}方` }] : []),
      ...(feixingGrid ? [{ heading: '留意方位', body: feixingGrid.flat().filter((cell) => ['大凶', '凶'].includes(NINE_STAR_REMEDIES[cell.starNum]?.nature ?? '')).map((cell) => { const remedy = NINE_STAR_REMEDIES[cell.starNum]; const direction = PALACE_TO_DIR[cell.palace] ?? cell.palace; return `${direction}方 · ${remedy.name}\n${remedy.remedy ? `建议：${remedy.remedy}` : '宜保持安静整洁。'}`; }).join('\n\n') || '暂无特别留意的方位。' }] : []),
    ],
  }), [bazhaiGrid, directionSummary, facing, feixingGrid, mingGuaDirs, year, yuanYun]);
  const reportMetadata = useMemo(() => createWorkspaceReportMetadata({
    moduleId: 'fengshui',
    inputSummary: '已生成罗盘方位参考；报告不保留具体年份、房屋坐向、出生资料、住址或其他原始输入。',
  }), []);

  return (
    <section className="space-y-4">
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">风水罗盘</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              二十四山罗盘，支持坐向旋转、流年飞星吉凶叠加、八宅游年星标注与命卦合参。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="fengshui" title="风水罗盘摘要" payload={contextPayload} />
            <ExportReportButton
              module="风水罗盘"
              report={createFengshuiExportReport({ source: exportReport })}
              reportMetadata={reportMetadata}
            />
          </div>
        </div>
      </div>

      {/* 元运标识 */}
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-gold-500/20 bg-gold-500/5 p-3">
        <span className="rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-semibold text-gold-400">
          {yuanYun.name}（{yuanYun.startYear}-{yuanYun.endYear}）
        </span>
        {bazhaiGrid && (
          <span className="text-xs text-jade-400">命卦：{bazhaiGrid.trigram}卦 · {bazhaiGrid.group}</span>
        )}
        {facing && (
          <span className="text-xs text-cinnabar-400">坐{facing.charAt(0)}向{facing.charAt(1)}</span>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-panel border border-ink-700 bg-black/24 p-4">
          {/* 坐向选择 */}
          <div>
            <p className="mb-2 text-xs font-semibold text-jade-100/70">房屋坐向</p>
            <select
              aria-label="房屋坐向"
              value={facing}
              onChange={(e) => setFacing(e.target.value)}
              className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
            >
              {FACING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 流年年份 */}
          <div>
            <p className="mb-2 text-xs font-semibold text-jade-100/70">流年年份</p>
            <input
              aria-label="流年年份"
              type="number"
              min={1900}
              max={2100}
              inputMode="numeric"
              value={draftYear}
              onChange={(e) => setDraftYear(e.target.value)}
              onBlur={commitYearDraft}
              className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
            />
          </div>

          {/* 方位吉凶一览 */}
          {directionSummary && (
            <div className="rounded-card border border-white/8 bg-white/[0.025] p-4">
              <p className="text-sm font-semibold text-jade-100/70">流年方位吉凶</p>
              <div className="mt-2 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gold-400">财位</span><span className="text-jade-100/70">{directionSummary.wealth}方</span></div>
                <div className="flex justify-between"><span className="text-jade-400">文昌位</span><span className="text-jade-100/70">{directionSummary.study}方</span></div>
                <div className="flex justify-between"><span className="text-cinnabar-400">桃花位</span><span className="text-jade-100/70">{directionSummary.romance}方</span></div>
                <div className="flex justify-between"><span className="text-cinnabar-300">病符位</span><span className="text-jade-100/70">{directionSummary.illness}方</span></div>
                <div className="flex justify-between"><span className="text-cinnabar-300">五黄凶位</span><span className="text-jade-100/70">{directionSummary.danger}方</span></div>
              </div>
            </div>
          )}

          {/* 命卦合参 */}
          {mingGuaDirs && (
            <div className="rounded-card border border-jade-500/20 bg-jade-500/5 p-4">
              <p className="text-sm font-semibold text-jade-400">命卦合参</p>
              <p className="mt-0.5 text-xs text-jade-100/45">基于全局生辰推算个人吉方</p>
              <div className="mt-2 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-jade-400">生气位</span><span className="text-jade-100/70">{mingGuaDirs.shengqi}方</span></div>
                <div className="flex justify-between"><span className="text-jade-400">天医位</span><span className="text-jade-100/70">{mingGuaDirs.tianyi}方</span></div>
                <div className="flex justify-between"><span className="text-jade-400">延年位</span><span className="text-jade-100/70">{mingGuaDirs.niannian}方</span></div>
                <div className="flex justify-between"><span className="text-cinnabar-400">绝命位</span><span className="text-jade-100/70">{mingGuaDirs.jueming}方</span></div>
              </div>
              {directionSummary && mingGuaDirs.shengqi === directionSummary.wealth && (
                <p className="mt-2 rounded-card border border-gold-500/30 bg-gold-500/10 p-2 text-[11px] text-gold-400">
                  ✦ 大利财运：个人生气位与年飞星财位重合，双重旺财方位！
                </p>
              )}
            </div>
          )}

          {/* 化煞建议 */}
          {feixingGrid && (
            <div className="rounded-card border border-white/8 bg-white/[0.025] p-4">
              <p className="text-sm font-semibold text-jade-100/70">化煞建议</p>
              <div className="mt-2 space-y-2">
                {feixingGrid.flat().filter((cell) => {
                  const r = NINE_STAR_REMEDIES[cell.starNum];
                  return r && (r.nature === '大凶' || r.nature === '凶');
                }).map((cell) => {
                  const r = NINE_STAR_REMEDIES[cell.starNum];
                  const dir = PALACE_TO_DIR[cell.palace] ?? cell.palace;
                  return (
                    <div key={cell.palace} className="rounded-card border border-cinnabar-500/20 bg-cinnabar-500/5 p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-cinnabar-400">{dir}·{r.name}</span>
                        <span className="rounded-full border border-cinnabar-500/30 bg-cinnabar-500/10 px-1.5 py-0.5 text-[10px] text-cinnabar-400">{r.usageLabel}</span>
                      </div>
                      {r.remedy && <p className="mt-1 text-[11px] leading-4 text-cinnabar-400/70">化煞：{r.remedy}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
            罗盘展示仅作传统文化学习与方位认知参考，不构成实地勘测或布局建议。
          </p>

          <KnowledgeReferencePanel
            initialTerm="坎"
            terms={["坎", "离", "二十四山", "壬", "子", "癸", "反弓煞", "飞星", "八宅", "生气", "天医"]}
            description="点击术语查看二十四山、形煞与古籍索引。"
          />
        </aside>

        <section className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-jade-50">二十四山罗盘</h3>
              <p className="mt-1 text-sm leading-6 text-jade-100/55">
                三环罗盘：外环二十四山（飞星吉凶色）、中环八卦（八宅游年星）、内环八方向（飞星编号）。
                {facing && ` 当前坐${facing.charAt(0)}向${facing.charAt(1)}，罗盘已旋转对准。`}
              </p>
            </div>
          </div>
          <div className="canvas-stage overflow-x-auto rounded-card border border-jade-500/18 bg-ink-950/92 p-3">
            {ready ? (
              <ZoomableSvg title={`二十四山罗盘${facing ? ` 坐${facing.charAt(0)}向${facing.charAt(1)}` : ''}`}>
                <FengshuiCompass facing={facing || undefined} overlay={overlay} />
              </ZoomableSvg>
            ) : (
              <LoadingSkeleton label="正在排盘" />
            )}
          </div>

          {/* 图例 */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-jade-500/40" />吉星方位</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-cinnabar-500/40" />凶星方位</span>
            {facing && <><span className="text-cinnabar-400">▲向</span><span className="text-jade-400">▼坐</span></>}
          </div>
        </section>
      </div>
    </section>
  );
}
