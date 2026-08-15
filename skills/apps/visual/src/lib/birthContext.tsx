import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_BIRTH, type BirthData, type SolarBirth, toSolarBirth } from '@/legacy/birthBridge';
import { resolveTrueSolarTime, type TrueSolarTimeResolution } from '@/engine-api/trueSolarTime';
import {
  BIRTH_INTENT_EVENT,
  CIVIL_TIME_FALLBACK_INTENT_EVENT,
  REFRESH_ALL_INTENT_EVENT,
  TRUE_SOLAR_TIME_INTENT_EVENT,
  type BirthIntentDetail,
  type CivilTimeFallbackIntentDetail,
  type RefreshAllIntentDetail,
  type TrueSolarTimeIntentDetail,
} from '@/lib/commandIntents';

/* ── Context 类型 ─────────────────────────────────────── */

export type BaziTimeStatus =
  | { status: 'awaiting-agent-verification'; civilBirth: SolarBirth }
  | { status: 'true-solar-verified'; resolution: TrueSolarTimeResolution }
  | { status: 'civil-unverified'; civilBirth: SolarBirth; notice: '未完成真太阳时复核' };

interface BirthContextValue {
  /** 用户输入的生辰（可能是农历或公历） */
  birth: BirthData;
  /** 转换后的公历生辰（未校正；供各工作区默认使用） */
  solarBirth: SolarBirth;
  /** 八字专用时间状态；仅 Agent 已核验的本地计算结果可改变排盘时间 */
  baziTimeStatus: BaziTimeStatus;
  /**
   * 引擎是否可用。
   * 拔除 visual/ 旧桥后纯 TS 引擎始终就绪；字段名保留以兼容既有 UI。
   */
  legacyReady: boolean;
  updateBirth: (patch: Partial<BirthData>) => void;
  resetBirth: () => void;
}

const BirthContext = createContext<BirthContextValue | null>(null);

function matchesTrueSolarResolution(resolution: TrueSolarTimeResolution): boolean {
  const recomputed = resolveTrueSolarTime(resolution.civilBirth, resolution.location);
  return JSON.stringify({
    trueSolarBirth: resolution.trueSolarBirth,
    longitudeCorrectionMinutes: resolution.longitudeCorrectionMinutes,
    equationOfTimeMinutes: resolution.equationOfTimeMinutes,
    trueSolarCorrectionMinutes: resolution.trueSolarCorrectionMinutes,
    crossedDate: resolution.crossedDate,
    crossedShichen: resolution.crossedShichen,
    crossedZiChu: resolution.crossedZiChu,
    evidence: resolution.evidence,
  }) === JSON.stringify({
    trueSolarBirth: recomputed.trueSolarBirth,
    longitudeCorrectionMinutes: recomputed.longitudeCorrectionMinutes,
    equationOfTimeMinutes: recomputed.equationOfTimeMinutes,
    trueSolarCorrectionMinutes: recomputed.trueSolarCorrectionMinutes,
    crossedDate: recomputed.crossedDate,
    crossedShichen: recomputed.crossedShichen,
    crossedZiChu: recomputed.crossedZiChu,
    evidence: recomputed.evidence,
  });
}

/* ── Provider ────────────────────────────────────────── */

export function BirthProvider({ children }: { children: ReactNode }) {
  const [birth, setBirth] = useState<BirthData>(DEFAULT_BIRTH);
  const [trueSolarResolution, setTrueSolarResolution] = useState<TrueSolarTimeResolution | null>(null);
  const [civilFallbackConfirmed, setCivilFallbackConfirmed] = useState(false);
  const birthRef = useRef<BirthData>(DEFAULT_BIRTH);

  useEffect(() => {
    birthRef.current = birth;
  }, [birth]);

  const updateBirth = useCallback((patch: Partial<BirthData>) => {
    setBirth((prev) => ({ ...prev, ...patch }));
    setTrueSolarResolution(null);
    setCivilFallbackConfirmed(false);
  }, []);

  const resetBirth = useCallback(() => {
    updateBirth(DEFAULT_BIRTH);
  }, [updateBirth]);

  useEffect(() => {
    function handleBirthIntent(event: Event) {
      const detail = (event as CustomEvent<BirthIntentDetail>).detail;
      if (!detail?.patch) return;
      updateBirth(detail.patch);
    }

    window.addEventListener(BIRTH_INTENT_EVENT, handleBirthIntent);
    return () => window.removeEventListener(BIRTH_INTENT_EVENT, handleBirthIntent);
  }, [updateBirth]);

  useEffect(() => {
    function handleTrueSolarTime(event: Event) {
      const detail = (event as CustomEvent<TrueSolarTimeIntentDetail>).detail;
      if (!detail?.resolution || detail.source !== 'agent-local') return;
      const currentCivilBirth = toSolarBirth(birthRef.current);
      const resolvedCivilBirth = detail.resolution.civilBirth;
      if (
        currentCivilBirth.year !== resolvedCivilBirth.year
        || currentCivilBirth.month !== resolvedCivilBirth.month
        || currentCivilBirth.day !== resolvedCivilBirth.day
        || currentCivilBirth.hour !== resolvedCivilBirth.hour
        || currentCivilBirth.minute !== resolvedCivilBirth.minute
        || currentCivilBirth.gender !== resolvedCivilBirth.gender
        || !matchesTrueSolarResolution(detail.resolution)
      ) return;
      setTrueSolarResolution(detail.resolution);
      setCivilFallbackConfirmed(false);
    }

    function handleCivilTimeFallback(event: Event) {
      const detail = (event as CustomEvent<CivilTimeFallbackIntentDetail>).detail;
      if (detail?.source !== 'user-confirmed') return;
      setTrueSolarResolution(null);
      setCivilFallbackConfirmed(true);
    }

    window.addEventListener(TRUE_SOLAR_TIME_INTENT_EVENT, handleTrueSolarTime);
    window.addEventListener(CIVIL_TIME_FALLBACK_INTENT_EVENT, handleCivilTimeFallback);
    return () => {
      window.removeEventListener(TRUE_SOLAR_TIME_INTENT_EVENT, handleTrueSolarTime);
      window.removeEventListener(CIVIL_TIME_FALLBACK_INTENT_EVENT, handleCivilTimeFallback);
    };
  }, []);

  useEffect(() => {
    function handleRefreshAll(event: Event) {
      const detail = (event as CustomEvent<RefreshAllIntentDetail>).detail;
      void detail;
      // 强制触发依赖 solarBirth 的 useMemo 重算
      setBirth((prev) => ({ ...prev }));
    }

    window.addEventListener(REFRESH_ALL_INTENT_EVENT, handleRefreshAll);
    return () => window.removeEventListener(REFRESH_ALL_INTENT_EVENT, handleRefreshAll);
  }, []);

  const value = useMemo<BirthContextValue>(() => {
    const solarBirth = toSolarBirth(birth);
    const baziTimeStatus: BaziTimeStatus = trueSolarResolution
      ? { status: 'true-solar-verified', resolution: trueSolarResolution }
      : civilFallbackConfirmed
        ? { status: 'civil-unverified', civilBirth: solarBirth, notice: '未完成真太阳时复核' }
        : { status: 'awaiting-agent-verification', civilBirth: solarBirth };
    return {
      birth,
      solarBirth,
      baziTimeStatus,
      legacyReady: true,
      updateBirth,
      resetBirth,
    };
  }, [birth, civilFallbackConfirmed, resetBirth, trueSolarResolution, updateBirth]);

  return <BirthContext.Provider value={value}>{children}</BirthContext.Provider>;
}

/* ── Hook ────────────────────────────────────────────── */

export function useBirth(): BirthContextValue {
  const ctx = useContext(BirthContext);
  if (!ctx) {
    throw new Error('useBirth must be used within BirthProvider');
  }
  return ctx;
}
