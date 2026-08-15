import { useMemo, useState } from 'react';
import { getSolarEntry } from '@/engine-api/calendar';
import { ControlField } from '@/components/shared/ControlField';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { TaiyiChart } from '@/components/shared/TaiyiChart';
import { ZoomableSvg } from '@/components/shared/ZoomableSvg';
import { useBirth } from '@/lib/birthContext';
import { calcTaiyiEnveloped, JI_STYLE_NAMES, ACUM_YEAR_NAMES, type TaiyiData, type JiStyle, type AcumYearMethod } from '@/engine-api/divination';
import { validateDivinationClaims, type DivinationPresentationClaim } from '@/legacy/claimVerification/divinationClaimVerifier';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';
import { toUserPresentation, type StructuredFactCheck } from '@/legacy/reportLayers';
import type { ToolEnvelope } from '@/engine-api/types';

export function createTaiyiFactChecks(data: TaiyiData): StructuredFactCheck[] {
  const claims: Array<{ claim: DivinationPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'taiyi_calculate', kind: 'basic', field: 'dayGz', value: data.basicInfo.dayGz }, label: '日干支', value: data.basicInfo.dayGz },
    { claim: { tool: 'taiyi_calculate', kind: 'kook', field: 'wen', value: data.kook.wen }, label: '局式', value: data.kook.wen },
    { claim: { tool: 'taiyi_calculate', kind: 'position', subject: 'taiyi', field: 'gong', value: data.taiyi.gong }, label: '太乙落宫', value: data.taiyi.gong },
    { claim: { tool: 'taiyi_calculate', kind: 'calculation', side: 'home', field: 'cal', value: data.home.cal }, label: '主算', value: String(data.home.cal) },
  ];
  return claims.map(({ claim, label, value }) => ({
    fact: { label, value, tool: 'taiyi_calculate' },
    validation: validateDivinationClaims('taiyi_calculate', data, [claim]),
  }));
}

/** 宫数→宫名（太乙九宫：1乾/2午/3艮/4卯/5中/6酉/7坤/8子/9巽） */
const NUM2GONG: Record<number, string> = { 1: '乾', 2: '午', 3: '艮', 4: '卯', 5: '中', 6: '酉', 7: '坤', 8: '子', 9: '巽' };

/**
 * 太乙神数工作区。
 * 起局信息 + 太乙落宫/文昌始击 + 主客算 + 格局 + 神煞 + 四层报告。
 * 文字卡片呈现，不做 SVG 式盘（后续可选）。
 */

export function TaiyiWorkspace() {
  const { solarBirth } = useBirth();
  const [jiStyle, setJiStyle] = useState<JiStyle>(0);
  const [acumYear, setAcumYear] = useState<AcumYearMethod>(0);

  const result = useMemo<{ envelope: ToolEnvelope<TaiyiData> | null; loading: boolean }>(() => {
    try {
      const solarEntry = getSolarEntry();
      const env = calcTaiyiEnveloped({ birth: solarBirth, jiStyle, acumYear, solar: solarEntry ?? null });
      return { envelope: env, loading: false };
    } catch (error) {
      return {
        envelope: {
          ok: false,
          tool: 'taiyi_calculate',
          version: 'unknown',
          input_normalized: { birth: solarBirth, jiStyle, acumYear },
          data: {} as TaiyiData,
          error: {
            code: 'calculation_exception',
            message: '本次计算未能完成，请核对输入后重试。',
          },
        },
        loading: false,
      };
    }
  }, [solarBirth, jiStyle, acumYear]);

  const data = result.envelope?.data;
  const factChecks = useMemo(
    () => result.envelope?.ok ? createTaiyiFactChecks(result.envelope.data) : [],
    [result.envelope],
  );
  const presentation = useMemo(
    () => result.envelope
      ? toUserPresentation(result.envelope, {
        factChecks,
        disclaimers: ['太乙神数结果仅作传统术数文化学习参考，不构成对现实结果的保证或专业建议。'],
      })
      : null,
    [result.envelope, factChecks],
  );
  const reportMetadata = useMemo(() => result.envelope ? createWorkspaceReportMetadata({
    moduleId: 'taiyi',
    inputSummary: '已按所选计式与积年法完成太乙起局。',
  }) : null, [result.envelope]);
  const exportPresentation = useMemo(() => presentation?.exportReport && reportMetadata ? ({
    report: presentation.exportReport,
    notices: presentation.notices,
    warnings: presentation.warnings,
    semanticReport: presentation.semanticReport,
    reportMetadata,
  }) : null, [presentation, reportMetadata]);

  if (result.loading) {
    return (
      <section className="space-y-4">
        <LoadingSkeleton label="正在排盘" />
      </section>
    );
  }

  if (presentation?.state === 'error') {
    return (
      <section className="space-y-4">
        <InterpretationCard title="计算未完成" subtitle="请核对输入">
          <p className="text-sm text-jade-100/55">{presentation.error?.message}</p>
        </InterpretationCard>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="space-y-4">
        <InterpretationCard title="暂无结果" subtitle="请确认生辰">
          <p className="text-sm text-jade-100/55">太乙神数需完整生辰信息，请在顶部「全局生辰」面板填写。</p>
        </InterpretationCard>
      </section>
    );
  }

  const { basicInfo, kook, taiyi, wenchang, shiji, dingmu, home, away, shenSha, geju } = data;
  const birthSummary = `${solarBirth.year}-${String(solarBirth.month).padStart(2, '0')}-${String(solarBirth.day).padStart(2, '0')} ${String(solarBirth.hour).padStart(2, '0')}:00`;

  const gejuList = Object.entries(geju).filter(([k]) => k !== '无格局');
  const hasGeju = gejuList.length > 0;

  const contextPayload = {
    项目: '太乙神数',
    计式: basicInfo.jiStyleName,
    积年法: basicInfo.acumYearName,
    生辰: { 年份: solarBirth.year, 性别: solarBirth.gender },
    日干支: basicInfo.dayGz,
    时干支: basicInfo.hourGz,
    局式: kook.wen,
    太乙落宫: taiyi.gong,
  };

  return (
    <section className="space-y-4">
      {/* 头部 */}
      <div className="rounded-panel border border-ink-700 bg-ink-850/78 p-4 shadow-instrument">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-jade-100">太乙神数</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-jade-100/55">
              传统三式之首：以太乙积年推局数，太乙落宫、文昌始击定目、主客算与四将，据掩迫关囚击格等格局断事件吉凶与主客胜负。
            </p>
            <p className="mt-3 rounded-card border border-jade-500/20 bg-jade-500/10 p-3 text-xs leading-5 text-jade-100/55">
              太乙神数结果仅作传统术数文化学习参考，不作为现实决策依据。
            </p>
          </div>
          <div className="flex gap-2">
            <CopyContextButton commandScope="taiyi" title="太乙神数摘要" payload={contextPayload} />
            <ExportReportButton module="太乙神数" presentation={exportPresentation} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* 左侧：排盘信息 + 计式选择 + 神煞 */}
        <aside className="space-y-4">
          <InterpretationCard
            title="排盘信息"
            items={[
              { label: '生辰', value: birthSummary },
              { label: '日干支', value: basicInfo.dayGz },
              { label: '时干支', value: basicInfo.hourGz },
              { label: '节气', value: basicInfo.jieqi || '—' },
              { label: '局式', value: kook.wen },
              { label: '三元', value: kook.nian },
            ]}
          />
          <InterpretationCard
            title="计式与积年法"
            items={[]}
          >
            <div className="space-y-3">
              <ControlField label="太乙计式" hint="年/月/日/时计">
                <select
                  value={jiStyle}
                  onChange={(e) => setJiStyle(Number(e.target.value) as JiStyle)}
                  className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
                >
                  {(Object.keys(JI_STYLE_NAMES) as unknown as JiStyle[]).map((s) => (
                    <option key={s} value={s}>{JI_STYLE_NAMES[s]}</option>
                  ))}
                </select>
              </ControlField>
              <ControlField label="积年法" hint="统宗/金镜/淘金歌/太乙局">
                <select
                  value={acumYear}
                  onChange={(e) => setAcumYear(Number(e.target.value) as AcumYearMethod)}
                  className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
                >
                  {(Object.keys(ACUM_YEAR_NAMES) as unknown as AcumYearMethod[]).map((s) => (
                    <option key={s} value={s}>{ACUM_YEAR_NAMES[s]}</option>
                  ))}
                </select>
              </ControlField>
            </div>
          </InterpretationCard>
          <InterpretationCard
            title="神煞"
            items={[
              { label: '天乙', value: shenSha.tianyi },
              { label: '地乙', value: shenSha.earthyi },
              { label: '四神', value: shenSha.fourGod },
              { label: '直符', value: shenSha.zhifu },
              { label: '飞符', value: shenSha.flyfu },
              { label: '君基', value: shenSha.kingbase },
              { label: '臣基', value: shenSha.officerbase },
              { label: '民基', value: shenSha.pplbase },
              { label: '五福', value: shenSha.wufu },
              { label: '大游', value: shenSha.bigyo },
              { label: '小游', value: shenSha.smyo },
              { label: '阳九', value: shenSha.yangjiu },
              { label: '百六', value: shenSha.baliu },
            ]}
          />
          {presentation?.report && (
            <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
              <FourLayerReport
                report={presentation.report}
                semanticReport={presentation.semanticReport}
                notices={presentation.notices}
                warnings={presentation.warnings}
                reportMetadata={reportMetadata ?? undefined}
                title="太乙神数解读"
              />
            </div>
          )}
        </aside>

        {/* 右侧：太乙式盘 + 落宫 + 主客算 + 格局 */}
        <div className="space-y-4">
          {/* 太乙九宫落宫 SVG 式盘 */}
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-2 text-sm font-semibold text-jade-50">太乙九宫式盘</h3>
            <ZoomableSvg title="太乙九宫落宫">
              <TaiyiChart
                taiyiGong={taiyi.gong}
                wenchangGong={wenchang.gong}
                shijiGong={shiji.gong}
                dingmuGong={dingmu.gong}
                homeGeneralGong={NUM2GONG[home.general] ?? '中'}
                awayGeneralGong={NUM2GONG[away.general] ?? '中'}
                eightDoors={data.eightDoors}
                kookWen={kook.wen}
              />
            </ZoomableSvg>
          </div>

          {/* 太乙落宫 + 文昌始击定目 */}
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-sm font-semibold text-jade-50">太乙落宫与二目</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-card border border-gold-500/25 bg-gold-500/8 p-3 text-center">
                <p className="text-[10px] text-gold-400/70">太乙</p>
                <p className="mt-1 font-serif text-xl text-gold-200">{taiyi.gong}</p>
                <p className="text-[10px] text-jade-100/40">{taiyi.num}宫</p>
              </div>
              <div className="rounded-card border border-white/8 bg-black/30 p-3 text-center">
                <p className="text-[10px] text-jade-100/45">文昌（天目）</p>
                <p className="mt-1 font-serif text-xl text-jade-100">{wenchang.gong}</p>
                <p className="text-[10px] text-jade-100/40">{wenchang.des || '—'}</p>
              </div>
              <div className="rounded-card border border-white/8 bg-black/30 p-3 text-center">
                <p className="text-[10px] text-jade-100/45">始击</p>
                <p className="mt-1 font-serif text-xl text-jade-100">{shiji.gong}</p>
                <p className="text-[10px] text-jade-100/40">客目</p>
              </div>
              <div className="rounded-card border border-white/8 bg-black/30 p-3 text-center">
                <p className="text-[10px] text-jade-100/45">定目</p>
                <p className="mt-1 font-serif text-xl text-jade-100">{dingmu.gong}</p>
                <p className="text-[10px] text-jade-100/40">定计</p>
              </div>
            </div>
          </div>

          {/* 主客算 */}
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-sm font-semibold text-jade-50">主客算与四将</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-card border border-jade-500/20 bg-jade-500/6 p-3">
                <p className="text-xs font-semibold text-jade-300">主（我方）</p>
                <p className="mt-1 text-sm text-jade-100/70">主算 <span className="font-mono text-jade-100">{home.cal}</span></p>
                <p className="text-[11px] text-jade-100/45">{home.calDes.join('、') || '平稳'}</p>
                <p className="mt-1 text-sm text-jade-100/70">主大将 <span className="font-mono text-jade-100">{home.general}</span> · 主参 <span className="font-mono text-jade-100">{home.vgen}</span></p>
              </div>
              <div className="rounded-card border border-cinnabar-500/20 bg-cinnabar-500/6 p-3">
                <p className="text-xs font-semibold text-cinnabar-300">客（对方）</p>
                <p className="mt-1 text-sm text-jade-100/70">客算 <span className="font-mono text-jade-100">{away.cal}</span></p>
                <p className="text-[11px] text-jade-100/45">{away.calDes.join('、') || '平稳'}</p>
                <p className="mt-1 text-sm text-jade-100/70">客大将 <span className="font-mono text-jade-100">{away.general}</span> · 客参 <span className="font-mono text-jade-100">{away.vgen}</span></p>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-jade-100/50">{data.suenwl}</p>
          </div>

          {/* 格局 */}
          <div className="console-panel rounded-panel border border-gold-500/20 bg-gold-500/6 p-4 shadow-instrument">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-jade-50">格局</h3>
              <span className={`rounded-full border px-3 py-1 text-xs ${hasGeju ? 'border-cinnabar-500/30 bg-cinnabar-500/10 text-cinnabar-400' : 'border-jade-500/30 bg-jade-500/10 text-jade-400'}`}>
                {hasGeju ? `${gejuList.length}项成格` : '无格局'}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {hasGeju ? (
                gejuList.map(([k, v]) => (
                  <div key={k} className="rounded-card border border-white/8 bg-black/30 p-2">
                    <p className="text-xs font-semibold text-gold-300">{k}</p>
                    <p className="mt-0.5 text-[11px] leading-5 text-jade-100/55">{v}</p>
                  </div>
                ))
              ) : (
                <p className="text-[11px] leading-5 text-jade-100/50">太乙无掩迫关囚击格对提挟诸格局，主客清明。</p>
              )}
            </div>
          </div>

          {/* 八门三将 */}
          <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <h3 className="mb-3 text-sm font-semibold text-jade-50">八门与三将</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[11px] text-jade-100/45">三门</p>
                <p className="text-jade-100/70">{data.threedoors}</p>
              </div>
              <div>
                <p className="text-[11px] text-jade-100/45">五将</p>
                <p className="text-jade-100/70">{data.fivegenerals}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[11px] text-jade-100/45">主客相关</p>
                <p className="text-jade-100/70">{data.wcNSj}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
