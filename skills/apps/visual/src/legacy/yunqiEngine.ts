import type { ToolEnvelope, ExportSnapshot } from './baseTypes';

const TG = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DZ = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const WUXING = ['木', '火', '土', '金', '水'] as const;
const STEP_NAMES = ['初之气', '二之气', '三之气', '四之气', '五之气', '终之气'] as const;
const STEP_TERMS = [['大寒', '春分'], ['春分', '小满'], ['小满', '大暑'], ['大暑', '秋分'], ['秋分', '小雪'], ['小雪', '大寒']] as const;

const WUYUN_TABLE: Record<string, { element: string; taiShao: '太' | '少' }> = {
  甲: { element: '土', taiShao: '太' }, 乙: { element: '金', taiShao: '少' },
  丙: { element: '水', taiShao: '太' }, 丁: { element: '木', taiShao: '少' },
  戊: { element: '火', taiShao: '太' }, 己: { element: '土', taiShao: '少' },
  庚: { element: '金', taiShao: '太' }, 辛: { element: '水', taiShao: '少' },
  壬: { element: '木', taiShao: '太' }, 癸: { element: '火', taiShao: '少' },
};
const SITIAN_TABLE: Record<string, string> = { 子: '少阴君火', 午: '少阴君火', 丑: '太阴湿土', 未: '太阴湿土', 寅: '少阳相火', 申: '少阳相火', 卯: '阳明燥金', 酉: '阳明燥金', 辰: '太阳寒水', 戌: '太阳寒水', 巳: '厥阴风木', 亥: '厥阴风木' };
const ZAIQUAN_TABLE: Record<string, string> = { 少阴君火: '阳明燥金', 太阴湿土: '太阳寒水', 少阳相火: '厥阴风木', 阳明燥金: '少阴君火', 太阳寒水: '太阴湿土', 厥阴风木: '少阳相火' };
const LIUQI_ORDER = ['厥阴风木', '少阴君火', '太阴湿土', '少阳相火', '阳明燥金', '太阳寒水'];
const ZHUQI_ORDER = ['厥阴风木', '少阴君火', '少阳相火', '太阴湿土', '阳明燥金', '太阳寒水'];
const LIUQI_WUXING: Record<string, string> = { 厥阴风木: '木', 少阴君火: '火', 少阳相火: '火', 太阴湿土: '土', 阳明燥金: '金', 太阳寒水: '水' };
const DIZHI_WUXING: Record<string, string> = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const FALLBACK_TERMS: Record<string, [number, number]> = { 大寒: [1, 20], 春分: [3, 20], 小满: [5, 21], 大暑: [7, 23], 秋分: [9, 23], 小雪: [11, 22] };

interface JieQiEntry { getYear?: () => number; getMonth?: () => number; getDay?: () => number; }
interface SolarLike { fromYmd?(year: number, month: number, day: number): { getLunar(): { getJieQiTable?: () => Record<string, JieQiEntry | string> } }; fromYmdHms?(year: number, month: number, day: number, hour: number, minute: number, second: number): { getLunar(): { getJieQiTable?: () => Record<string, JieQiEntry | string> } }; }
interface CalendarDate { year: number; month: number; day: number; }

export interface YunqiTransport { element: string; taiShao: '太' | '少'; }
export interface YunqiStep { step: string; qi: string; start: string; end: string; startDate: string; endDate: string; zhuqi: string; }
export interface YunqiPatterns { tianfu: boolean; suihui: boolean; taiyiTianfu: boolean; tongTianfu: boolean; tongSuihui: boolean; pingqi: boolean; qihua: string | null; jianhua: string | null; zhengdui: { qi: string; type: '正化' | '对化' }; }
export interface YunqiResult { engineName: string; mode: 'local-exact' | 'local-approx'; confidenceNote: string; year: number; targetDate: string; tiangan: string; dizhi: string; yearBoundary: string; wuyun: { dayun: string; zhuyun: YunqiTransport[]; keyun: YunqiTransport[]; }; liuqi: { sitian: string; zaiquan: string; zhuke: YunqiStep[]; current_step: YunqiStep | null; kezhujialin: string; }; patterns: YunqiPatterns; observation: string; disease_tendency: string; }
export interface YunqiInput { year: number; targetDate?: string; birthMonth?: number; birthDay?: number; solar?: SolarLike | null; currentMonth?: number; }

function pad(value: number): string { return String(value).padStart(2, '0'); }
function formatDate(date: CalendarDate): string { return `${date.year}-${pad(date.month)}-${pad(date.day)}`; }
function compareDate(left: CalendarDate, right: CalendarDate): number { return left.year - right.year || left.month - right.month || left.day - right.day; }
function parseDate(value: string): CalendarDate | null { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); if (!match) return null; const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])); return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null; }
function fallbackDate(year: number, term: string): CalendarDate { const [month, day] = FALLBACK_TERMS[term] ?? FALLBACK_TERMS.大寒; return { year, month, day }; }

function getTerm(year: number, term: string, solar?: SolarLike | null): { date: CalendarDate; exact: boolean } {
  if (solar) {
    try {
      const source = solar.fromYmdHms ? solar.fromYmdHms(year, 7, 1, 0, 0, 0) : solar.fromYmd?.(year, 7, 1);
      const table = source?.getLunar().getJieQiTable?.();
      const keys: Record<string, string> = { 大寒: 'DA_HAN', 春分: 'CHUN_FEN', 小满: 'XIAO_MAN', 大暑: 'DA_SHU', 秋分: 'QIU_FEN', 小雪: 'XIAO_XUE' };
      const item = table?.[term] ?? table?.[keys[term]];
      if (item && typeof item !== 'string' && item.getYear?.() && item.getMonth?.() && item.getDay?.()) return { date: { year: item.getYear(), month: item.getMonth(), day: item.getDay() }, exact: true };
    } catch { /* fall through */ }
  }
  return { date: fallbackDate(year, term), exact: false };
}

function getGanzhi(year: number): [string, string] { return [TG[((year - 4) % 10 + 10) % 10], DZ[((year - 4) % 12 + 12) % 12]]; }
function transport(elements: readonly string[], anchor: string, taiShao: '太' | '少'): YunqiTransport[] { const anchorIndex = elements.indexOf(anchor); return elements.map((element, index) => ({ element, taiShao: Math.abs(index - anchorIndex) % 2 === 0 ? taiShao : taiShao === '太' ? '少' : '太' })); }
function cycleNext(element: string, distance: number): string { return WUXING[(WUXING.indexOf(element as typeof WUXING[number]) + distance + WUXING.length) % WUXING.length]; }
function getKeZhuJiaLin(keqi: string, zhuqi: string): string { const ke = LIUQI_WUXING[keqi]; const zhu = LIUQI_WUXING[zhuqi]; if (!ke || !zhu) return '未知'; if (ke === zhu) return '客主同气'; if (cycleNext(ke, 1) === zhu) return '客气生主气'; if (cycleNext(zhu, 1) === ke) return '主气生客气'; if (cycleNext(ke, 2) === zhu) return '客气克主气'; if (cycleNext(zhu, 2) === ke) return '主气克客气'; return '未知'; }

function getPatterns(dayun: string, taiShao: '太' | '少', dizhi: string, sitian: string, zaiquan: string): YunqiPatterns {
  const sitianElement = LIUQI_WUXING[sitian];
  const zaiquanElement = LIUQI_WUXING[zaiquan];
  const tianfu = dayun === sitianElement;
  const suihui = dayun === DIZHI_WUXING[dizhi];
  const zhengdui: Record<string, { qi: string; type: '正化' | '对化' }> = { 午: { qi: '少阴君火', type: '正化' }, 子: { qi: '少阴君火', type: '对化' }, 未: { qi: '太阴湿土', type: '正化' }, 丑: { qi: '太阴湿土', type: '对化' }, 寅: { qi: '少阳相火', type: '正化' }, 申: { qi: '少阳相火', type: '对化' }, 酉: { qi: '阳明燥金', type: '正化' }, 卯: { qi: '阳明燥金', type: '对化' }, 辰: { qi: '太阳寒水', type: '正化' }, 戌: { qi: '太阳寒水', type: '对化' }, 巳: { qi: '厥阴风木', type: '正化' }, 亥: { qi: '厥阴风木', type: '对化' } };
  return { tianfu, suihui, taiyiTianfu: tianfu && suihui, tongTianfu: taiShao === '太' && dayun === zaiquanElement, tongSuihui: taiShao === '少' && dayun === zaiquanElement, pingqi: (taiShao === '太' && cycleNext(sitianElement, 2) === dayun) || (taiShao === '少' && (sitianElement === dayun || cycleNext(sitianElement, 1) === dayun)), qihua: taiShao === '太' ? cycleNext(dayun, 4) : null, jianhua: taiShao === '少' ? cycleNext(dayun, 4) : null, zhengdui: zhengdui[dizhi] };
}

function getObservation(dayun: string, sitian: string): string {
  const byDayun: Record<string, string> = { 土运太过: '湿滞偏重时，宜留意起居干爽与饮食节制', 土运不及: '运化偏弱时，宜重视饮食规律与作息稳定', 金运太过: '燥象偏显时，宜留意环境湿度与作息调护', 金运不及: '燥润失衡时，宜注意起居调适', 水运太过: '寒湿偏著时，宜注意保暖与劳逸平衡', 水运不及: '收藏不足时，宜注意休息与节律调养', 木运太过: '风动偏显时，宜保持情志舒展与规律作息', 木运不及: '条达不足时，宜适度舒展身心', 火运太过: '热象偏显时，宜避暑节劳、保持心境平和', 火运不及: '温煦不足时，宜注意保暖与作息节律' };
  const bySitian: Record<string, string> = { 少阴君火: '火热时令宜注意避暑与安静调摄', 太阴湿土: '湿气偏重时宜关注居处通风干爽', 少阳相火: '暑热偏盛时宜注意劳逸与补水', 阳明燥金: '燥气偏显时宜注意环境润泽', 太阳寒水: '寒气偏显时宜注意保暖避寒', 厥阴风木: '风气偏动时宜注意起居有常' };
  return `传统气机观察：${byDayun[dayun]}；${bySitian[sitian]}。`;
}

export function calculateYunqi(input: YunqiInput): YunqiResult {
  const target = input.targetDate ? parseDate(input.targetDate) : null;
  const targetDate = target ?? { year: input.year, month: input.birthMonth ?? input.currentMonth ?? new Date().getMonth() + 1, day: input.birthDay ?? 15 };
  const dahan = getTerm(targetDate.year, '大寒', input.solar);
  const year = compareDate(targetDate, dahan.date) < 0 ? targetDate.year - 1 : targetDate.year;
  const [tiangan, dizhi] = getGanzhi(year);
  const dayun = WUYUN_TABLE[tiangan];
  const dayunName = `${dayun.element}运${dayun.taiShao === '太' ? '太过' : '不及'}`;
  const sitian = SITIAN_TABLE[dizhi];
  const zaiquan = ZAIQUAN_TABLE[sitian];
  const terms = STEP_TERMS.map(([start]) => getTerm(year, start, input.solar));
  const nextDahan = getTerm(year + 1, '大寒', input.solar);
  const allTerms = [...terms, nextDahan];
  const sitianIndex = LIUQI_ORDER.indexOf(sitian);
  const zhuke = STEP_NAMES.map((step, index) => ({ step, qi: LIUQI_ORDER[(sitianIndex - 2 + index + 6) % 6], start: STEP_TERMS[index][0], end: STEP_TERMS[index][1], startDate: formatDate(allTerms[index].date), endDate: formatDate(allTerms[index + 1].date), zhuqi: ZHUQI_ORDER[index] }));
  const currentStep = zhuke.find((step) => { const start = parseDate(step.startDate); const end = parseDate(step.endDate); return Boolean(start && end && compareDate(targetDate, start) >= 0 && compareDate(targetDate, end) < 0); }) ?? zhuke[0];
  const keyunElements = Array.from({ length: 5 }, (_, index) => cycleNext(dayun.element, index));
  const patterns = getPatterns(dayun.element, dayun.taiShao, dizhi, sitian, zaiquan);
  const exact = dahan.exact && allTerms.every((term) => term.exact);
  const observation = getObservation(dayunName, sitian);
  return { engineName: 'YunqiEngine', mode: exact ? 'local-exact' : 'local-approx', confidenceNote: exact ? '本次推算已按节气日期划分运气年度与六气步位。' : '本次推算已按传统历法口径处理，结果仅作传统文化参考。', year, targetDate: formatDate(targetDate), tiangan, dizhi, yearBoundary: `运气年度以大寒为界；查询日期为${formatDate(targetDate)}，归入${year}年运气。`, wuyun: { dayun: dayunName, zhuyun: transport(WUXING, dayun.element, dayun.taiShao), keyun: transport(keyunElements, dayun.element, dayun.taiShao) }, liuqi: { sitian, zaiquan, zhuke, current_step: currentStep, kezhujialin: getKeZhuJiaLin(currentStep.qi, currentStep.zhuqi) }, patterns, observation, disease_tendency: observation };
}

export interface YunqiData extends YunqiResult { export_snapshot: ExportSnapshot; }
function describeTransport(steps: YunqiTransport[]): string { return steps.map(({ element, taiShao }) => `${element}${taiShao}`).join(' → '); }
function describePatterns(patterns: YunqiPatterns): string { return [patterns.tianfu && '天符', patterns.suihui && '岁会', patterns.taiyiTianfu && '太一天符', patterns.tongTianfu && '同天符', patterns.tongSuihui && '同岁会', patterns.pingqi && '平气', patterns.qihua && `齐化${patterns.qihua}`, patterns.jianhua && `兼化${patterns.jianhua}`, `${patterns.zhengdui.qi}${patterns.zhengdui.type}`].filter(Boolean).join('、') || '未见特别格局标识'; }

export function calcYunqiEnveloped(input: YunqiInput): ToolEnvelope<YunqiData> {
  const result = calculateYunqi(input);
  const snapshot: ExportSnapshot = { summary: `${result.year}年（${result.tiangan}${result.dizhi}）${result.wuyun.dayun}，司天${result.liuqi.sitian}，在泉${result.liuqi.zaiquan}。`, tags: ['五运六气', `${result.tiangan}${result.dizhi}年`, result.wuyun.dayun, result.liuqi.sitian], sections: [
    { heading: '查询日期', body: `查询日期为${result.targetDate}；${result.yearBoundary}` },
    { heading: '岁运', body: `${result.tiangan}年为${result.wuyun.dayun}。主运：${describeTransport(result.wuyun.zhuyun)}；客运：${describeTransport(result.wuyun.keyun)}。` },
    { heading: '司天在泉', body: `司天为${result.liuqi.sitian}，在泉为${result.liuqi.zaiquan}。` },
    { heading: '客气六步', body: result.liuqi.zhuke.map((step) => `${step.step}（${step.startDate}至${step.endDate}前）：${step.qi}`).join('；') + '。' },
    { heading: '当前步位', body: `${result.liuqi.current_step?.step}为${result.liuqi.current_step?.qi}，与${result.liuqi.current_step?.zhuqi}的客主加临为${result.liuqi.kezhujialin}。` },
    { heading: '运气格局', body: `传统运气格局：${describePatterns(result.patterns)}。太一天符据《素问·六微旨大论》“天符岁会……太一天符之会也”标识天符与岁会同时成立；仅作传统文化与气候病机理论学习参考。` },
    { heading: '气候与调养观察', body: `${result.observation}以上内容仅作传统文化与气候病机理论学习参考，不构成医学诊断或治疗建议；如有不适，请咨询执业医师。` },
  ], sourceNotes: '五运六气内容仅作传统文化与日常调养参考。' };
  return { ok: true, tool: result.engineName, version: result.mode, input_normalized: input as unknown as Record<string, unknown>, data: { ...result, export_snapshot: snapshot }, warnings: [result.confidenceNote, '岁运信息仅作辅助参考'] };
}
