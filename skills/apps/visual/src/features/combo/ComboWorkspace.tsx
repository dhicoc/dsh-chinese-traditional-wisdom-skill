import { useEffect, useMemo, useState } from 'react';
import { getSolarEntry } from '@/engine-api/calendar';
import { CopyContextButton } from '@/components/shared/CopyContextButton';
import { ExportReportButton } from '@/components/shared/ExportReportButton';
import { InterpretationCard } from '@/components/shared/InterpretationCard';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { FourLayerReport } from '@/components/shared/FourLayerReport';
import { useBirth } from '@/lib/birthContext';
import {
  calcAnnualFortuneCombo,
  calcDecisionCombo,
  calcSpaceTimeCombo,
  calcSanshiCombo,
  calcSanshiClassicCombo,
  calcDailyWellnessCombo,
  calcZeriCombo,
  calcMonthlyFortuneCombo,
  DALIUREN_SCHOOLS,
  type ComboResult,
  type AnnualFortuneResult,
  type DailyWellnessResult,
  type DaliurenSchool,
  type ZeriResult,
  type ZeriPurpose,
  type MonthlyFortuneResult,
  type SubsystemResult,
} from '@/engine-api/combo';
import { calcMarriageCombo, type MarriageResult, type MarriageScene } from '@/engine-api/marriage';
import type { ToolEnvelope } from '@/engine-api/types';
import { QUESTIONNAIRE } from '@/legacy/constitutionQuestionnaire';
import { validateComboClaims, type ComboPresentationClaim } from '@/legacy/claimVerification/comboClaimVerifier';
import { createWorkspaceReportMetadata } from '@/legacy/reportMetadata';
import { toUserPresentation, type StructuredFactCheck } from '@/legacy/reportLayers';
import { createComboExportReport } from '@/features/combo/comboExport';

/**
 * 联合分析工作区（ROADMAP 功能层增强 Step 1 的 Dashboard 入口）。
 *
 * 跨系统联合模块：
 * - 年度综合运势 = 八字 + 五运六气 + 奇门 + 命卦方位
 * - 事件决策 = 六爻 + 梅花 + 奇门（三卜交叉验证）
 * - 空间+时间 = 飞星 + 八宅命卦 + 奇门吉方
 * - 三式互参 = 大六壬 + 奇门 + 梅花
 * - 三式合一 = 奇门 + 太乙 + 大六壬
 * - 今日养生建议 = 体质 + 24节气 + 子午流注时辰 + 太岁/飞星方位
 *
 * 用全局生辰调对应 combo 函数，结果用 FourLayerReport 四层渲染 + 子系统卡片 + 一致性徽章。
 */

type ComboType = 'annual' | 'monthly' | 'decision' | 'space' | 'sanshi' | 'sanshi-classic' | 'wellness' | 'zeri' | 'marriage';
type SupportedComboData = ComboResult | AnnualFortuneResult | DailyWellnessResult | ZeriResult | MonthlyFortuneResult | MarriageResult;
type ComboPresentationData = AnnualFortuneResult | DailyWellnessResult | ZeriResult | MonthlyFortuneResult | MarriageResult;
type ComboFactCheckInput =
  | { comboType: 'annual'; data: AnnualFortuneResult }
  | { comboType: 'monthly'; data: MonthlyFortuneResult }
  | { comboType: 'wellness'; data: DailyWellnessResult }
  | { comboType: 'zeri'; data: ZeriResult }
  | { comboType: 'marriage'; data: MarriageResult }
  | { comboType: 'decision' | 'space' | 'sanshi' | 'sanshi-classic'; data: ComboResult };

const SAFE_ERROR_MESSAGE = '本次计算未能完成，请核对输入后重试。';

/** Dashboard 边界：只净化失败 envelope，成功结果保持引擎原样。 */
export function sanitizeComboEnvelope<T>(envelope: ToolEnvelope<T>): ToolEnvelope<T> {
  if (envelope.ok) return envelope;
  return { ...envelope, error: { code: 'calculation_failed', message: SAFE_ERROR_MESSAGE } };
}

function createComboFailureEnvelope(comboType: ComboType): ToolEnvelope<ComboResult | DailyWellnessResult | ZeriResult | MonthlyFortuneResult | MarriageResult> {
  return sanitizeComboEnvelope({
    ok: false,
    tool: 'combo_dashboard',
    version: 'unknown',
    input_normalized: { comboType },
    data: {} as ComboResult | DailyWellnessResult | ZeriResult | MonthlyFortuneResult | MarriageResult,
    error: { code: 'calculation_exception', message: SAFE_ERROR_MESSAGE },
  });
}

function ResultSources({ subsystems }: { subsystems: SubsystemResult[] }) {
  if (subsystems.length === 0) return null;

  return (
    <InterpretationCard title="本次参考范围" subtitle="参与的传统方法与注意事项">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {subsystems.map((subsystem) => {
          const warnings = subsystem.envelope.warnings ?? [];
          return (
            <section key={subsystem.name} className="rounded-card border border-jade-500/20 bg-jade-500/5 px-3 py-2" aria-label={`${subsystem.name}参考范围`}>
              <p className="text-xs font-medium text-jade-300">{subsystem.name}</p>
              <p className="mt-1 text-[11px] leading-4 text-jade-100/55">本次参考已纳入该传统方法。</p>
              {warnings.length > 0 && <p className="mt-1 text-[11px] leading-4 text-gold-300/80">注意：{warnings.join('；')}</p>}
            </section>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-5 text-jade-100/45">仅说明本次参考所采用的方法及已知注意事项，不展示个人资料。</p>
    </InterpretationCard>
  );
}

function factChecksFor<T extends ComboPresentationData>(
  tool: 'combo_annual_fortune' | 'combo_zeri' | 'combo_daily_wellness' | 'combo_monthly_fortune' | 'combo_marriage',
  data: T,
  rows: Array<{ claim: ComboPresentationClaim; label: string; value: string }>,
): StructuredFactCheck[] {
  return rows.map(({ claim, label, value }) => ({
    fact: { label, value, tool },
    // validateComboClaims exposes a broad union; each builder below binds its checked tool and data together.
    validation: validateComboClaims(tool, data, [claim]),
  }));
}

function annualFactChecks(data: AnnualFortuneResult): StructuredFactCheck[] {
  return factChecksFor('combo_annual_fortune', data, [
    { claim: { tool: 'combo_annual_fortune', kind: 'annualContext', field: 'targetYear', value: data.context.targetYear }, label: '目标年份', value: String(data.context.targetYear) },
    { claim: { tool: 'combo_annual_fortune', kind: 'annualContext', field: 'mingGuaTrigram', value: data.context.mingGua.trigram }, label: '命卦', value: data.context.mingGua.trigram },
    { claim: { tool: 'combo_annual_fortune', kind: 'annualContext', field: 'mingGuaGroup', value: data.context.mingGua.group }, label: '命卦分组', value: data.context.mingGua.group },
  ]);
}

function monthlyFactChecks(data: MonthlyFortuneResult): StructuredFactCheck[] {
  return factChecksFor('combo_monthly_fortune', data, (['year', 'month', 'monthGanZhi', 'jieqi'] as const).map((field) => ({
    claim: { tool: 'combo_monthly_fortune', kind: 'monthlyContext', field, value: data.context[field] },
    label: ({ year: '年份', month: '月份', monthGanZhi: '月干支', jieqi: '节气' } as const)[field], value: String(data.context[field]),
  })));
}

function wellnessFactChecks(data: DailyWellnessResult): StructuredFactCheck[] {
  return factChecksFor('combo_daily_wellness', data, (['date', 'jieqi', 'season', 'shichen'] as const).map((field) => ({
    claim: { tool: 'combo_daily_wellness', kind: 'wellnessContext', field, value: data.context[field] },
    label: ({ date: '日期', jieqi: '节气', season: '季节', shichen: '时辰' } as const)[field], value: data.context[field],
  })));
}

function zeriFactChecks(data: ZeriResult): StructuredFactCheck[] {
  const rows: Array<{ claim: ComboPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'combo_zeri', kind: 'zeriPurpose', value: data.zeriPurpose }, label: '择日用途', value: data.zeriPurpose },
    ...(['start', 'end', 'scannedDays'] as const).map((field) => ({ claim: { tool: 'combo_zeri' as const, kind: 'zeriRange' as const, field, value: data.range[field] }, label: ({ start: '区间起', end: '区间止', scannedDays: '扫描天数' } as const)[field], value: String(data.range[field]) })),
  ];
  if (data.rankedDays[0]) rows.push({ claim: { tool: 'combo_zeri', kind: 'zeriRankedDay', index: 0, field: 'date', value: data.rankedDays[0].date }, label: '首选吉日', value: data.rankedDays[0].date });
  return factChecksFor('combo_zeri', data, rows);
}

function marriageFactChecks(data: MarriageResult): StructuredFactCheck[] {
  return factChecksFor('combo_marriage', data, [
    { claim: { tool: 'combo_marriage', kind: 'marriageScene', value: data.scene }, label: '关系场景', value: data.scene },
    { claim: { tool: 'combo_marriage', kind: 'marriagePerson', person: 'personA', field: 'dayGanZhi', value: data.personA.dayGanZhi }, label: '甲方日柱', value: data.personA.dayGanZhi },
    { claim: { tool: 'combo_marriage', kind: 'marriagePerson', person: 'personB', field: 'dayGanZhi', value: data.personB.dayGanZhi }, label: '乙方日柱', value: data.personB.dayGanZhi },
    { claim: { tool: 'combo_marriage', kind: 'marriageMingGua', person: 'personA', field: 'group', value: data.personA.mingGua.group }, label: '甲方命卦分组', value: data.personA.mingGua.group },
    { claim: { tool: 'combo_marriage', kind: 'marriageMingGua', person: 'personB', field: 'group', value: data.personB.mingGua.group }, label: '乙方命卦分组', value: data.personB.mingGua.group },
  ]);
}

export function createComboFactChecks(input: ComboFactCheckInput): StructuredFactCheck[] {
  switch (input.comboType) {
    case 'annual': return annualFactChecks(input.data);
    case 'monthly': return monthlyFactChecks(input.data);
    case 'wellness': return wellnessFactChecks(input.data);
    case 'zeri': return zeriFactChecks(input.data);
    case 'marriage': return marriageFactChecks(input.data);
    default: return [];
  }
}

const COMBO_OPTIONS: Array<{
  key: ComboType;
  label: string;
  desc: string;
  icon: string;
}> = [
  { key: 'annual', label: '年度综合运势', desc: '八字 + 五运六气 + 奇门 + 紫微流年 + 命卦方位', icon: '运' },
  { key: 'monthly', label: '月度运势', desc: '流月干支 + 五运六气 + 节气 + 紫微流月', icon: '月' },
  { key: 'decision', label: '事件决策', desc: '六爻 + 梅花 + 奇门 三卜交叉验证', icon: '决' },
  { key: 'space', label: '空间 + 时间', desc: '飞星 + 八宅命卦 + 奇门吉方布局', icon: '堪' },
  { key: 'sanshi', label: '三式互参', desc: '大六壬 + 奇门 + 梅花 传统三式', icon: '式' },
  { key: 'sanshi-classic', label: '三式合一', desc: '奇门 + 太乙 + 大六壬 真正传统三式', icon: '叁' },
  { key: 'wellness', label: '今日养生建议', desc: '体质 + 24节气 + 时辰经络 + 方位', icon: '养' },
  { key: 'zeri', label: '综合择日', desc: '黄历宜忌 + 神煞 + 太岁三煞 + 命卦吉方', icon: '择' },
  { key: 'marriage', label: '合婚配对', desc: '双方八字冲合 + 用神互补 + 紫微对照 + 姓名匹配 + 风水吉日', icon: '合' },
];

const ZERI_PURPOSES: ZeriPurpose[] = ['开业', '结婚', '搬家', '动土', '出行', '签约', '安葬', '祈福'];

/** 取今天 yyyy-mm-dd */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 取偏移 N 天后的 yyyy-mm-dd */
function shiftStr(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function ComboWorkspace() {
  const { solarBirth } = useBirth();
  const [comboType, setComboType] = useState<ComboType>('wellness');
  const [question, setQuestion] = useState('今年整体运势如何？');
  const [targetYear, setTargetYear] = useState<number>(solarBirth.year);
  const [targetMonth, setTargetMonth] = useState<number>(new Date().getMonth() + 1);
  const [liurenSchool, setLiurenSchool] = useState<DaliurenSchool>('classic');
  const [constitution, setConstitution] = useState<string>('');
  const [zeriPurpose, setZeriPurpose] = useState<ZeriPurpose>('开业');
  const [zeriStart, setZeriStart] = useState<string>(shiftStr(todayStr(), 1));
  const [zeriEnd, setZeriEnd] = useState<string>(shiftStr(todayStr(), 30));
  const [zeriTopN, setZeriTopN] = useState<number>(5);
  // combo 通用数字字段 draft（允许清空/编辑中间态，blur 时再提交）
  const [draftTargetYear, setDraftTargetYear] = useState(String(solarBirth.year));
  const [draftTargetMonth, setDraftTargetMonth] = useState(String(new Date().getMonth() + 1));
  const [draftZeriTopN, setDraftZeriTopN] = useState('5');
  useEffect(() => { setDraftTargetYear(String(targetYear)); }, [targetYear]);
  useEffect(() => { setDraftTargetMonth(String(targetMonth)); }, [targetMonth]);
  useEffect(() => { setDraftZeriTopN(String(zeriTopN)); }, [zeriTopN]);
  const commitComboDraft = (field: 'targetYear' | 'targetMonth' | 'zeriTopN', draft: string) => {
    const n = Number.parseInt(draft, 10);
    if (Number.isNaN(n) || draft.trim() === '') {
      if (field === 'targetYear') setDraftTargetYear(String(targetYear));
      else if (field === 'targetMonth') setDraftTargetMonth(String(targetMonth));
      else setDraftZeriTopN(String(zeriTopN));
      return;
    }
    if (field === 'targetYear') setTargetYear(n);
    else if (field === 'targetMonth') setTargetMonth(Math.max(1, Math.min(12, n)));
    else setZeriTopN(Math.max(1, Math.min(20, n)));
  };
  // 合婚：第二人输入（第一人用全局生辰）
  const [partnerYear, setPartnerYear] = useState<number>(1990);
  const [partnerMonth, setPartnerMonth] = useState<number>(6);
  const [partnerDay, setPartnerDay] = useState<number>(15);
  const [partnerHour, setPartnerHour] = useState<number>(12);
  const [partnerGender, setPartnerGender] = useState<string>('女');
  const [partnerSurname, setPartnerSurname] = useState<string>('');
  const [partnerGivenName, setPartnerGivenName] = useState<string>('');
  const [mySurname, setMySurname] = useState<string>('');
  const [myGivenName, setMyGivenName] = useState<string>('');
  const [marriageScene, setMarriageScene] = useState<MarriageScene>('婚恋');
  // 合婚数字字段 draft（字符串态）：允许清空/编辑中间态，blur 时再提交为 number
  const [draftPartnerYear, setDraftPartnerYear] = useState('1990');
  const [draftPartnerMonth, setDraftPartnerMonth] = useState('6');
  const [draftPartnerDay, setDraftPartnerDay] = useState('15');
  const [draftPartnerHour, setDraftPartnerHour] = useState('12');
  useEffect(() => { setDraftPartnerYear(String(partnerYear)); }, [partnerYear]);
  useEffect(() => { setDraftPartnerMonth(String(partnerMonth)); }, [partnerMonth]);
  useEffect(() => { setDraftPartnerDay(String(partnerDay)); }, [partnerDay]);
  useEffect(() => { setDraftPartnerHour(String(partnerHour)); }, [partnerHour]);
  const commitPartnerDraft = (field: 'year' | 'month' | 'day' | 'hour', draft: string) => {
    const n = Number.parseInt(draft, 10);
    if (Number.isNaN(n) || draft.trim() === '') {
      // 回退到当前值
      if (field === 'year') setDraftPartnerYear(String(partnerYear));
      else if (field === 'month') setDraftPartnerMonth(String(partnerMonth));
      else if (field === 'day') setDraftPartnerDay(String(partnerDay));
      else setDraftPartnerHour(String(partnerHour));
      return;
    }
    if (field === 'year') setPartnerYear(n);
    else if (field === 'month') setPartnerMonth(n);
    else if (field === 'day') setPartnerDay(n);
    else setPartnerHour(n);
  };

  const [result, setResult] = useState<{
    comboType: ComboType | null;
    envelope: ToolEnvelope<ComboResult | DailyWellnessResult | ZeriResult | MonthlyFortuneResult | MarriageResult> | null;
    loading: boolean;
  }>({ comboType: null, envelope: null, loading: false });

  useEffect(() => {
    let cancelled = false;
    setResult({ comboType, envelope: null, loading: true });
    void (async () => {
      let envelope: ToolEnvelope<ComboResult | DailyWellnessResult | ZeriResult | MonthlyFortuneResult | MarriageResult> | null = null;
      try {
        const solar = getSolarEntry() ?? null;
        const birthInput = {
          year: solarBirth.year, month: solarBirth.month, day: solarBirth.day,
          hour: solarBirth.hour, minute: solarBirth.minute, gender: solarBirth.gender,
        };
        if (comboType === 'annual') {
          envelope = calcAnnualFortuneCombo({ birth: birthInput, targetYear, solar, currentMonth: new Date().getMonth() + 1 }) as ToolEnvelope<ComboResult>;
        } else if (comboType === 'monthly') {
          envelope = calcMonthlyFortuneCombo({
            birth: birthInput,
            targetYear,
            targetMonth,
            constitution: constitution || undefined,
            solar,
          }) as ToolEnvelope<MonthlyFortuneResult>;
        } else if (comboType === 'decision') {
          envelope = calcDecisionCombo({ birth: birthInput, question, solar }) as ToolEnvelope<ComboResult>;
        } else if (comboType === 'sanshi') {
          envelope = calcSanshiCombo({ birth: birthInput, question, solar, liurenSchool: liurenSchool }) as ToolEnvelope<ComboResult>;
        } else if (comboType === 'sanshi-classic') {
          envelope = calcSanshiClassicCombo({ birth: birthInput, question, solar, liurenSchool: liurenSchool }) as ToolEnvelope<ComboResult>;
        } else if (comboType === 'wellness') {
          const d = new Date();
          envelope = calcDailyWellnessCombo({
            birth: birthInput,
            now: { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours() },
            constitution: constitution || undefined,
            targetYear: d.getFullYear(),
            solar,
          }) as ToolEnvelope<DailyWellnessResult>;
        } else if (comboType === 'zeri') {
          envelope = calcZeriCombo({
            birth: birthInput,
            purpose: zeriPurpose,
            startDate: zeriStart,
            endDate: zeriEnd,
            topN: zeriTopN,
            solar,
          }) as ToolEnvelope<ZeriResult>;
        } else if (comboType === 'marriage') {
          envelope = await calcMarriageCombo({
            personA: {
              birth: birthInput,
              surname: mySurname || undefined,
              givenName: myGivenName || undefined,
              label: marriageScene === '婚恋' ? '男方' : '甲方',
              solar,
            },
            personB: {
              birth: { year: partnerYear, month: partnerMonth, day: partnerDay, hour: partnerHour, gender: partnerGender },
              surname: partnerSurname || undefined,
              givenName: partnerGivenName || undefined,
              label: marriageScene === '婚恋' ? '女方' : '乙方',
            },
            scene: marriageScene,
            targetYear,
          }) as ToolEnvelope<MarriageResult>;
        } else {
          envelope = calcSpaceTimeCombo({ birth: birthInput, targetYear, solar }) as ToolEnvelope<ComboResult>;
        }
        if (!cancelled) setResult({ comboType, envelope: sanitizeComboEnvelope(envelope), loading: false });
      } catch {
        if (!cancelled) setResult({ comboType, envelope: createComboFailureEnvelope(comboType), loading: false });
      }
    })();
    return () => { cancelled = true; };
  }, [comboType, solarBirth, question, targetYear, targetMonth, liurenSchool, constitution, zeriPurpose, zeriStart, zeriEnd, zeriTopN, partnerYear, partnerMonth, partnerDay, partnerHour, partnerGender, partnerSurname, partnerGivenName, mySurname, myGivenName, marriageScene]);

  const isCurrentResult = result.comboType === comboType;
  const data = isCurrentResult && result.envelope?.ok
    ? result.envelope.data as SupportedComboData
    : undefined;
  const factChecks = useMemo(() => {
    if (!isCurrentResult || !result.envelope?.ok) return [];
    switch (comboType) {
      case 'annual': return createComboFactChecks({ comboType, data: result.envelope.data as AnnualFortuneResult });
      case 'monthly': return createComboFactChecks({ comboType, data: result.envelope.data as MonthlyFortuneResult });
      case 'wellness': return createComboFactChecks({ comboType, data: result.envelope.data as DailyWellnessResult });
      case 'zeri': return createComboFactChecks({ comboType, data: result.envelope.data as ZeriResult });
      case 'marriage': return createComboFactChecks({ comboType, data: result.envelope.data as MarriageResult });
      default: return createComboFactChecks({ comboType, data: result.envelope.data as ComboResult });
    }
  }, [comboType, isCurrentResult, result.envelope]);
  const presentation = useMemo(() => isCurrentResult && result.envelope
    ? toUserPresentation(result.envelope, {
      factChecks,
      disclaimers: ['联合分析结果仅作传统文化学习参考，不作为现实决策依据。'],
    })
    : null, [factChecks, isCurrentResult, result.envelope]);
  const reportMetadata = useMemo(() => result.envelope ? createWorkspaceReportMetadata({
    moduleId: 'combo',
    inputSummary: '本次采用所选联合分析方案；报告仅保留分析类型，不保留个人资料。',
  }) : null, [result.envelope]);
  const exportPresentation = useMemo(() => presentation?.exportReport && data && result.comboType ? ({
    report: createComboExportReport({
      comboName: data.comboName,
      comboType: result.comboType,
      source: presentation.exportReport,
    }),
    notices: presentation.notices,
    warnings: ['导出内容已按隐私边界脱敏处理。'],
    reportMetadata: reportMetadata ?? undefined,
  }) : null, [data, presentation, reportMetadata, result.comboType]);
  const birthSummary = `${solarBirth.year}-${String(solarBirth.month).padStart(2, '0')}-${String(solarBirth.day).padStart(2, '0')} ${String(solarBirth.hour).padStart(2, '0')}:00 ${solarBirth.gender}`;

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="console-panel rounded-panel border border-purple-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-jade-50">联合分析</h2>
            <p className="text-sm text-jade-100/55">多种传统术数综合参看 · 一站式解答</p>
          </div>
          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-400">综合参看</span>
        </div>
        <p className="mt-3 text-xs leading-5 text-jade-100/45">
          同一件事用多种术数一起看，结论更稳。各术数看法一致时宜把握，看法有出入时已为你标出权衡要点。
        </p>
      </div>

      {/* combo 类型选择 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COMBO_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setComboType(opt.key)}
            className={`group flex items-center gap-3 rounded-panel border p-3 text-left transition ${
              comboType === opt.key
                ? 'border-purple-500/45 bg-purple-500/10'
                : 'border-ink-700 bg-ink-850/60 hover:border-purple-500/25 hover:bg-ink-850/80'
            }`}
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border font-serif text-base transition ${
              comboType === opt.key
                ? 'border-purple-500/40 bg-purple-500/15 text-purple-300'
                : 'border-jade-500/25 bg-jade-500/10 text-jade-400'
            }`}>
              {opt.icon}
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${comboType === opt.key ? 'text-purple-200' : 'text-jade-100'}`}>{opt.label}</p>
              <p className="mt-0.5 truncate text-xs text-jade-100/45">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* 输入区 */}
      <div className="console-panel rounded-panel border border-jade-500/16 bg-ink-950/90 p-4 shadow-instrument">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-3">
          <p className="text-sm font-semibold text-jade-100">输入参数</p>
        </div>
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="text-jade-100/55">生辰：<span className="font-mono text-jade-100">{birthSummary}</span></span>
          </div>
          {(comboType === 'annual' || comboType === 'space') && (
            <label className="flex items-center gap-2 text-sm text-jade-100/70">
              <span className="text-jade-100/55">欲测年份</span>
              <input
                type="number"
                min={1900}
                max={2100}
                value={draftTargetYear}
                onChange={(e) => setDraftTargetYear(e.target.value)}
                onBlur={() => commitComboDraft('targetYear', draftTargetYear)}
                className="w-24 rounded-card border border-jade-500/20 bg-ink-900/80 px-2 py-1 text-sm text-jade-100/80 outline-none focus:border-jade-500/50"
              />
            </label>
          )}
          {comboType === 'monthly' && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <label className="flex items-center gap-2 text-jade-100/70">
                <span className="text-jade-100/55">欲测年份</span>
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  value={draftTargetYear}
                  onChange={(e) => setDraftTargetYear(e.target.value)}
                  onBlur={() => commitComboDraft('targetYear', draftTargetYear)}
                  className="w-24 rounded-card border border-jade-500/20 bg-ink-900/80 px-2 py-1 text-sm text-jade-100/80 outline-none focus:border-jade-500/50"
                />
              </label>
              <label className="flex items-center gap-2 text-jade-100/70">
                <span className="text-jade-100/55">月份</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={draftTargetMonth}
                  onChange={(e) => setDraftTargetMonth(e.target.value)}
                  onBlur={() => commitComboDraft('targetMonth', draftTargetMonth)}
                  className="w-16 rounded-card border border-jade-500/20 bg-ink-900/80 px-2 py-1 text-sm text-jade-100/80 outline-none focus:border-jade-500/50"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm sm:min-w-[220px] sm:flex-1">
                <span className="text-jade-100/55">体质（可选，节气调养针对性加减）</span>
                <select
                  value={comboType === 'monthly' ? constitution : ''}
                  onChange={(e) => setConstitution(e.target.value)}
                  className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
                >
                  <option value="">通用节气调养（不区分体质）</option>
                  {QUESTIONNAIRE.map((g) => (
                    <option key={g.type} value={g.type}>{g.type}（{g.direction}）</option>
                  ))}
                  <option value="平和质">平和质（阴阳气血调和）</option>
                </select>
              </label>
            </div>
          )}
          {(comboType === 'decision' || comboType === 'sanshi' || comboType === 'sanshi-classic') && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-jade-100/55">求测事项</span>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="如：今年适合换工作吗"
                className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
              />
            </label>
          )}
          {comboType === 'wellness' && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-jade-100/55">体质类型（可选，不填则按五运六气倾向推断）</span>
              <select
                value={constitution}
                onChange={(e) => setConstitution(e.target.value)}
                className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
              >
                <option value="">按出生年五运六气倾向推断</option>
                {QUESTIONNAIRE.map((g) => (
                  <option key={g.type} value={g.type}>{g.type}（{g.direction}）</option>
                ))}
                <option value="平和质">平和质（阴阳气血调和）</option>
              </select>
              <span className="text-[10px] text-jade-100/35">建议先到「体质辨识」完成问卷自评，得到主体质后回此选择，建议更精准。</span>
            </label>
          )}
          {comboType === 'zeri' && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-jade-100/55">择日用途</span>
                <select
                  aria-label="择日用途"
                  value={zeriPurpose}
                  onChange={(e) => setZeriPurpose(e.target.value as ZeriPurpose)}
                  className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
                >
                  {ZERI_PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-jade-100/55">区间起（含）</span>
                <input
                  aria-label="择日区间起"
                  type="date"
                  value={zeriStart}
                  onChange={(e) => setZeriStart(e.target.value)}
                  className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-jade-100/55">区间止（含）</span>
                <input
                  aria-label="择日区间止"
                  type="date"
                  value={zeriEnd}
                  onChange={(e) => setZeriEnd(e.target.value)}
                  className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-jade-100/55">返回前 N 个吉日</span>
                <input
                  aria-label="择日返回数量"
                  type="number"
                  min={1}
                  max={20}
                  value={draftZeriTopN}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDraftZeriTopN(value);
                    const topN = Number.parseInt(value, 10);
                    if (topN >= 1 && topN <= 20) setZeriTopN(topN);
                  }}
                  onBlur={() => commitComboDraft('zeriTopN', draftZeriTopN)}
                  className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
                />
              </label>
              <p className="text-[10px] text-jade-100/35 sm:col-span-2 lg:col-span-4">
                逐日取真实黄历宜忌+神煞，叠加本年太岁/三煞/五黄凶方与命卦吉方评分排序。动土/安葬用途自动剔除犯太岁岁破方位之日。
              </p>
            </div>
          )}
          {comboType === 'marriage' && (
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-jade-100/55">关系类型</span>
                <select
                  aria-label="合婚关系类型"
                  value={marriageScene}
                  onChange={(e) => setMarriageScene(e.target.value as MarriageScene)}
                  className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
                >
                  <option value="婚恋">婚恋（结婚/找对象）</option>
                  <option value="合伙">合伙（合伙创业）</option>
                  <option value="合作">合作（项目合作）</option>
                </select>
              </label>
              <p className="text-xs text-jade-100/55">甲方（你自己）生辰：<span className="font-mono text-jade-100">{birthSummary}</span></p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-jade-100/55">乙方出生年</span>
                  <input aria-label="合婚乙方出生年" type="number" min={1900} max={2100} value={draftPartnerYear} onChange={(e) => setDraftPartnerYear(e.target.value)} onBlur={() => commitPartnerDraft('year', draftPartnerYear)} className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition-colors duration-200 focus:border-jade-500/45" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-jade-100/55">月</span>
                  <input type="number" min={1} max={12} value={draftPartnerMonth} onChange={(e) => setDraftPartnerMonth(e.target.value)} onBlur={() => commitPartnerDraft('month', draftPartnerMonth)} className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition-colors duration-200 focus:border-jade-500/45" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-jade-100/55">日</span>
                  <input type="number" min={1} max={31} value={draftPartnerDay} onChange={(e) => setDraftPartnerDay(e.target.value)} onBlur={() => commitPartnerDraft('day', draftPartnerDay)} className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition-colors duration-200 focus:border-jade-500/45" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-jade-100/55">时（0-23）</span>
                  <input type="number" min={0} max={23} value={draftPartnerHour} onChange={(e) => setDraftPartnerHour(e.target.value)} onBlur={() => commitPartnerDraft('hour', draftPartnerHour)} className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition-colors duration-200 focus:border-jade-500/45" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-jade-100/55">乙方性别</span>
                  <select value={partnerGender} onChange={(e) => setPartnerGender(e.target.value)} className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition-colors duration-200 focus:border-jade-500/45">
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-jade-100/55">甲方姓名（可选）</span>
                  <input type="text" value={mySurname} onChange={(e) => setMySurname(e.target.value)} placeholder="姓" className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition-colors duration-200 focus:border-jade-500/45" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-jade-100/55">甲方名（可选）</span>
                  <input type="text" value={myGivenName} onChange={(e) => setMyGivenName(e.target.value)} placeholder="名" className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition-colors duration-200 focus:border-jade-500/45" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-jade-100/55">乙方姓名（可选）</span>
                  <input aria-label="合婚乙方姓名" type="text" value={partnerSurname} onChange={(e) => setPartnerSurname(e.target.value)} placeholder="姓" className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition-colors duration-200 focus:border-jade-500/45" />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-jade-100/55">乙方名（可选）</span>
                  <input aria-label="合婚乙方名" type="text" value={partnerGivenName} onChange={(e) => setPartnerGivenName(e.target.value)} placeholder="名" className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition-colors duration-200 focus:border-jade-500/45" />
                </label>
              </div>
              <p className="text-[10px] text-jade-100/35">
                输入双方出生信息，分析八字日柱冲合、用神互补、紫微命宫对照、姓名匹配、婚房风水与吉日。姓名为可选，不填则跳过姓名维度。仅供文化参考。
              </p>
            </div>
          )}
          {(comboType === 'sanshi' || comboType === 'sanshi-classic') && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-jade-100/55">大六壬天将流派</span>
              <select
                value={liurenSchool}
                onChange={(e) => setLiurenSchool(e.target.value as DaliurenSchool)}
                className="w-full min-w-0 box-border rounded-card border border-white/10 bg-ink-900 px-3 py-2 text-sm text-jade-100 outline-none transition focus:border-jade-500/45"
              >
                {(Object.keys(DALIUREN_SCHOOLS) as DaliurenSchool[]).map((s) => (
                  <option key={s} value={s}>{DALIUREN_SCHOOLS[s].name}</option>
                ))}
              </select>
              <span className="text-[10px] text-jade-100/35">{DALIUREN_SCHOOLS[liurenSchool].note}</span>
            </label>
          )}
        </div>
      </div>

      {/* 结果区 */}
      {result.loading && <LoadingSkeleton label="联合分析计算中" />}
      {!result.loading && presentation?.state === 'error' && (
        <InterpretationCard title="计算未完成" subtitle="请核对输入">
          <p className="text-sm text-jade-100/55">{presentation.error?.message}</p>
        </InterpretationCard>
      )}
      {!result.loading && !presentation && !data && (
        <InterpretationCard title="暂无结果" subtitle="请确认生辰后重试">
          <p className="text-sm text-jade-100/55">联合分析需要完整生辰信息，请在顶部「全局生辰」面板填写。</p>
        </InterpretationCard>
      )}
      {!result.loading && data && presentation?.report && (
        <div className="space-y-4 ct-animate-fade-in">
          {/* 子系统卡片（wellness/monthly 无一致性检验，走维度展示；zeri 走吉日列表） */}
          {comboType === 'zeri' ? (
            <ZeriDayList data={data as ZeriResult} />
          ) : comboType === 'wellness' ? (
            <InterpretationCard
              title="养生维度"
              subtitle="体质 · 节气 · 时辰 · 方位"
            >
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(data as DailyWellnessResult).subsystems.map((s) => (
                  <div key={s.name} className="rounded-card border border-jade-500/20 bg-jade-500/5 px-3 py-2">
                    <span className="text-xs font-medium text-jade-300">{s.name}</span>
                    <p className="mt-1 text-[11px] leading-4 text-jade-100/60">{s.summary}</p>
                  </div>
                ))}
              </div>
            </InterpretationCard>
          ) : comboType === 'monthly' ? (
            <InterpretationCard
              title={`月度维度 · ${(data as MonthlyFortuneResult).context.year}年${(data as MonthlyFortuneResult).context.month}月`}
              subtitle={`流月${(data as MonthlyFortuneResult).context.monthGanZhi} · 节气${(data as MonthlyFortuneResult).context.jieqi}`}
            >
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {(data as MonthlyFortuneResult).subsystems.map((s) => (
                  <div key={s.name} className="rounded-card border border-jade-500/20 bg-jade-500/5 px-3 py-2">
                    <span className="text-xs font-medium text-jade-300">{s.name}</span>
                    <p className="mt-1 text-[11px] leading-4 text-jade-100/60">{s.summary}</p>
                  </div>
                ))}
              </div>
            </InterpretationCard>
          ) : comboType === 'marriage' ? (
            <MarriageResultView data={data as MarriageResult} />
          ) : (
            <InterpretationCard
              title="各术数看法"
              subtitle={(data as ComboResult).consistency?.aligned ? '各术数看法一致，结论较稳' : '各术数看法有出入，已为你标出权衡要点'}
            >
              <div className="grid gap-2 sm:grid-cols-3">
                {((data as ComboResult).subsystems ?? []).map((s) => {
                  const tone = (s as { tone?: string }).tone;
                  return (
                    <div key={s.name} className={`rounded-card border px-3 py-2 ${
                      tone === '吉' ? 'border-jade-500/30 bg-jade-500/8'
                      : tone === '凶' ? 'border-cinnabar-500/30 bg-cinnabar-500/8'
                      : 'border-white/10 bg-white/5'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-jade-100/70">{s.name}</span>
                        <span className={`text-[10px] font-semibold ${
                          tone === '吉' ? 'text-jade-300' : tone === '凶' ? 'text-cinnabar-300' : 'text-jade-100/55'
                        }`}>{tone === '吉' ? '偏吉' : tone === '凶' ? '偏凶' : '平稳'}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-jade-100/55">{s.summary}</p>
                    </div>
                  );
                })}
              </div>
              {(data as ComboResult).consistency && !(data as ComboResult).consistency.aligned && ((data as ComboResult).consistency.conflicts?.length ?? 0) > 0 && (
                <div className="mt-2 rounded-card border border-cinnabar-500/20 bg-cinnabar-500/8 px-3 py-2">
                  <p className="text-xs text-cinnabar-300/80">⚠️ 看法有出入：{(data as ComboResult).consistency.conflicts.join('；')}</p>
                </div>
              )}
            </InterpretationCard>
          )}

          {comboType !== 'wellness' && comboType !== 'monthly' && comboType !== 'zeri' && comboType !== 'marriage' && (
            <ResultSources subsystems={(data as ComboResult).subsystems ?? []} />
          )}

          <div className="console-panel rounded-panel border border-purple-500/16 bg-ink-950/90 p-4 shadow-instrument">
            <FourLayerReport report={presentation.report} semanticReport={presentation.semanticReport} notices={presentation.notices} warnings={presentation.warnings} reportMetadata={reportMetadata ?? undefined} title={`${data.comboName}解读`} />
          </div>

          <div className="flex justify-end gap-2">
            <ExportReportButton module={data.comboName} presentation={exportPresentation} />
            <CopyContextButton
              commandScope="combo"
              title="联合分析摘要"
              payload={{
                comboName: data.comboName,
                comboType,
                birth: { year: solarBirth.year, gender: solarBirth.gender },
                targetYear: comboType !== 'decision' ? targetYear : undefined,
                question: (comboType === 'decision' || comboType === 'sanshi' || comboType === 'sanshi-classic') ? question : undefined,
                constitution: (comboType === 'wellness' || comboType === 'monthly') ? constitution || undefined : undefined,
                targetMonth: comboType === 'monthly' ? (data as MonthlyFortuneResult).context.month : undefined,
                synthesis: data.synthesis,
                ...(comboType === 'zeri' ? {
                  zeriPurpose: (data as ZeriResult).zeriPurpose,
                  range: (data as ZeriResult).range,
                  rankedDays: (data as ZeriResult).rankedDays.map((d) => ({
                    date: d.date, lunarDate: d.lunarDate, dayGanZhi: d.dayGanZhi, score: d.score, tone: d.tone, reasons: d.reasons,
                  })),
                  annualSha: (data as ZeriResult).annualSha,
                } : (comboType === 'wellness' || comboType === 'monthly' || comboType === 'marriage') ? {} : { consistency: (data as ComboResult).consistency }),
                ...(comboType === 'zeri' ? {} : comboType === 'marriage' ? {
                  marriage: {
                    scene: (data as MarriageResult).scene,
                    overallScore: (data as MarriageResult).overallScore,
                    grade: (data as MarriageResult).grade,
                    wuxingComplement: (data as MarriageResult).wuxingComplement,
                    nameMatch: (data as MarriageResult).nameMatch,
                    chongHeTotalScore: (data as MarriageResult).chongHeTotalScore,
                    personA: (data as MarriageResult).personA,
                    personB: (data as MarriageResult).personB,
                    chongHeScan: ((data as MarriageResult).chongHeScan ?? []).map((s) => ({
                      pillar: s.pillar, aGanZhi: s.aGanZhi, bGanZhi: s.bGanZhi, note: s.note, score: s.score,
                    })),
                    ziweiCompare: (data as MarriageResult).ziweiCompare,
                    fengshuiAdvice: (data as MarriageResult).fengshuiAdvice,
                    auspiciousDays: (data as MarriageResult).auspiciousDays,
                  },
                } : {
                  subsystems: (comboType === 'wellness' ? (data as DailyWellnessResult).subsystems
                    : comboType === 'monthly' ? (data as MonthlyFortuneResult).subsystems
                    : (data as ComboResult).subsystems).map((s) => ({
                    name: s.name,
                    tone: (s as { tone?: string }).tone,
                    summary: s.summary,
                  })),
                }),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** 综合择日吉日列表渲染 */
function ZeriDayList({ data }: { data: ZeriResult }) {
  const toneColor = (t: string) =>
    t === '吉' ? 'border-jade-500/30 bg-jade-500/8 text-jade-300'
    : t === '凶' ? 'border-cinnabar-500/30 bg-cinnabar-500/8 text-cinnabar-300'
    : 'border-white/10 bg-white/5 text-jade-100/60';
  return (
    <InterpretationCard
      title={`优选吉日 · ${data.zeriPurpose}`}
      badge={`共${data.range.scannedDays}天 · 筛出${data.rankedDays.length}个吉日`}
      subtitle={`本年凶方：太岁${data.annualSha.taisui} · 岁破${data.annualSha.suiPo} · 三煞${data.annualSha.sanSha} · 五黄${data.annualSha.fiveYellow}`}
    >
      {data.rankedDays.length === 0 ? (
        <p className="text-sm text-jade-100/55">区间内无符合「{data.zeriPurpose}」的吉日。建议放宽区间或调整用途。</p>
      ) : (
        <div className="space-y-2" data-testid="zeri-ranked-days">
          {data.rankedDays.map((d, idx) => (
            <div key={d.date} data-testid="zeri-ranked-day" className="rounded-card border border-white/10 bg-ink-900/60 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-purple-500/15 text-xs font-semibold text-purple-300">{idx + 1}</span>
                  <span data-testid="zeri-ranked-day-date" className="text-sm font-medium text-jade-100">{d.date}</span>
                  <span className="text-xs text-jade-100/45">{d.lunarDate} · {d.dayGanZhi}日</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-jade-100/55">评分 <span className="font-mono text-jade-100">{d.score}</span></span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneColor(d.tone)}`}>
                    {d.tone === '吉' ? '吉' : d.tone === '凶' ? '凶' : '中'}
                  </span>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-jade-100/55">{d.reasons.join('；')}</p>
              {d.almanac && d.almanac.hours.filter((h) => h.luck === '吉').length > 0 && (
                <p className="mt-1 text-[10px] text-jade-300/70">
                  吉时：{d.almanac.hours.filter((h) => h.luck === '吉').slice(0, 4).map((h) => `${h.label}（${h.ganZhi}）`).join('、')}
                </p>
              )}
            </div>
          ))}
          {data.rejected.length > 0 && (
            <details className="mt-2 rounded-card border border-white/8 bg-ink-900/40 px-3 py-2">
              <summary className="cursor-pointer text-xs text-jade-100/45">淘汰概要（{data.rejected.length}条）</summary>
              <ul className="mt-1.5 space-y-0.5 text-[10px] leading-4 text-jade-100/40">
                {data.rejected.map((r) => (
                  <li key={r.date}>{r.date}：{r.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </InterpretationCard>
  );
}

/** 合婚配对结果视图：双方概览 + 互补度 + 冲合扫描 + 紫微/姓名/风水/吉日 */
function MarriageResultView({ data }: { data: MarriageResult }) {
  const m = data;
  const toneColor = m.overallScore >= 70 ? 'text-jade-300' : m.overallScore < 50 ? 'text-red-300' : 'text-amber-300';
  return (
    <InterpretationCard
      title={`${m.comboName} · 综合契合度 ${m.overallScore}（${m.grade}）`}
      subtitle={m.scene + '配对 · 八字冲合 + 用神互补 + 紫微对照 + 姓名匹配 + 风水吉日'}
    >
      <div className="space-y-3">
        {/* 综合契合度大字 */}
        <div className="flex items-center gap-3 rounded-card border border-white/8 bg-ink-900/40 px-4 py-3">
          <span className={`text-2xl font-bold ${toneColor}`}>{m.overallScore}</span>
          <span className="text-sm text-jade-100/55">/100 · {m.grade}</span>
          <div className="ml-auto flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-jade-500/25 bg-jade-500/10 px-2 py-0.5 text-jade-300">五行互补 {m.wuxingComplement}</span>
            {m.nameMatch !== null && <span className="rounded-full border border-jade-500/25 bg-jade-500/10 px-2 py-0.5 text-jade-300">姓名匹配 {m.nameMatch}</span>}
            <span className={`rounded-full border px-2 py-0.5 ${m.chongHeTotalScore >= 0 ? 'border-jade-500/25 bg-jade-500/10 text-jade-300' : 'border-red-500/25 bg-red-500/10 text-red-300'}`}>冲合 {m.chongHeTotalScore >= 0 ? '+' : ''}{m.chongHeTotalScore}</span>
          </div>
        </div>

        {/* 双方概览 */}
        <div className="grid gap-2 sm:grid-cols-2">
          {[m.personA, m.personB].map((p) => (
            <div key={p.label} className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-xs">
              <p className="font-semibold text-jade-200">{p.label}</p>
              <p className="mt-1 text-jade-100/60">日柱 <span className="font-mono text-jade-100">{p.dayGanZhi}</span> · 日主 {p.dayMaster}({p.dayMasterWuxing}) · 用神 {p.xiyongShen || '未知'}</p>
              <p className="text-jade-100/50">命卦 {p.mingGua.trigram}（{p.mingGua.group}）{p.nameScore !== undefined ? ` · 姓名 ${p.nameScore}（${p.nameGrade}）` : ''}</p>
              {p.ziweiMingStars.length > 0 && <p className="text-jade-100/45">紫微命宫：{p.ziweiMingStars.join('、')}</p>}
            </div>
          ))}
        </div>

        {/* 逐柱冲合扫描 */}
        <div>
          <p className="mb-1 text-xs font-semibold text-jade-100/70">干支冲合（日柱权重最大）</p>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
            {(m.chongHeScan ?? []).map((s) => (
              <div key={s.pillar} className={`rounded-card border px-3 py-2 text-[11px] ${s.score > 0 ? 'border-jade-500/25 bg-jade-500/5' : s.score < 0 ? 'border-red-500/25 bg-red-500/5' : 'border-white/8 bg-ink-900/40'}`}>
                <p className="font-medium text-jade-100/70">{s.pillar}</p>
                <p className="mt-0.5 font-mono text-jade-100">{s.aGanZhi} ↔ {s.bGanZhi}</p>
                <p className="mt-0.5 text-jade-100/55">{s.note}</p>
                <p className={`mt-0.5 ${s.score >= 0 ? 'text-jade-300' : 'text-red-300'}`}>{s.score > 0 ? '+' : ''}{s.score}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 紫微/姓名/风水/吉日 */}
        <div className="space-y-1.5 text-xs">
          <p className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-jade-100/60"><span className="text-jade-300">紫微对照：</span>{m.ziweiCompare}</p>
          <p className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-jade-100/60"><span className="text-jade-300">风水建议：</span>{m.fengshuiAdvice}</p>
          {m.auspiciousDays.length > 0 && m.auspiciousDays[0] !== '择日数据不可用' && (
            <p className="rounded-card border border-white/8 bg-ink-900/40 px-3 py-2 text-jade-100/60"><span className="text-jade-300">吉日推荐：</span>{m.auspiciousDays.join('；')}</p>
          )}
        </div>
      </div>
    </InterpretationCard>
  );
}
