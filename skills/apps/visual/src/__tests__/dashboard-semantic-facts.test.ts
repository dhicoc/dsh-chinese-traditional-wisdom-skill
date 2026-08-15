import { describe, expect, it } from 'vitest';
import { calcCeziEnveloped, calcChenguzEnveloped } from '@/engine-api/folklore';
import {
  calcAnnualFortuneCombo,
  calcDailyWellnessCombo,
  calcMonthlyFortuneCombo,
  calcSpaceTimeCombo,
  calcDecisionCombo,
  calcSanshiCombo,
  calcSanshiClassicCombo,
  calcZeriCombo,
} from '@/engine-api/combo';
import { calcMarriageCombo } from '@/engine-api/marriage';
import { calcZiweiEnveloped } from '@/engine-api/ziwei';
import { calcYunqiEnveloped } from '@/engine-api/yunqi';
import { createCeziFactChecks, sanitizeCeziEnvelope } from '@/features/cezi/CeziWorkspace';
import { createChenguzFactChecks, sanitizeChenguzEnvelope } from '@/features/chenguz/ChenguzWorkspace';
import { createComboFactChecks, sanitizeComboEnvelope } from '@/features/combo/ComboWorkspace';
import { createYunqiFactChecks, sanitizeYunqiEnvelope } from '@/features/yunqi/YunqiWorkspace';
import { createZiweiFactChecks, sanitizeZiweiEnvelope } from '@/features/ziwei/ZiweiWorkspace';
import { createQimenFactChecks } from '@/features/qimen/QimenWorkspace';
import { createLiuyaoFactChecks } from '@/features/liuyao/LiuyaoWorkspace';
import { calcQimenEnveloped, calcLiuyaoEnveloped } from '@/engine-api/divination';
import { toUserPresentation, type ReadingLike, type StructuredFactCheck } from '@/legacy/reportLayers';

const SAFE_ERROR_MESSAGE = '本次计算未能完成，请核对输入后重试。';

const BIRTH = { year: 2024, month: 3, day: 15, hour: 9, minute: 0, gender: '男' };
const SOLAR = null;
const DISCLAIMERS = ['本报告仅作传统文化参考，不构成保证或专业建议。'];

function expectPresentationMatchesSnapshot(
  envelope: { ok: boolean; data: { export_snapshot: ReadingLike } },
  factChecks: StructuredFactCheck[],
) {
  const presentation = toUserPresentation(envelope, { factChecks, disclaimers: DISCLAIMERS });
  expect(presentation.exportReport).toEqual({
    summary: envelope.data.export_snapshot.summary,
    sections: envelope.data.export_snapshot.sections,
  });
  expect(presentation.semanticReport?.facts).toEqual(
    factChecks.filter(({ validation }) => validation.valid).map(({ fact }) => fact),
  );
  expect(factChecks.every(({ validation }) => validation.valid)).toBe(true);
}

describe('Dashboard 同源 presentation 的核验事实', () => {
  it('测字和称骨只产生白名单 facts，并与成功 envelope 的导出快照同源', async () => {
    const cezi = await calcCeziEnveloped({ char: '明', birth: BIRTH, solar: SOLAR });
    const chenguz = calcChenguzEnveloped({ birth: BIRTH, solar: SOLAR });

    expect(cezi.ok).toBe(true);
    expect(chenguz.ok).toBe(true);
    if (!cezi.ok || !chenguz.ok) throw new Error('expected successful envelopes');

    const ceziFacts = createCeziFactChecks(cezi.data);
    const chenguzFacts = createChenguzFactChecks(chenguz.data);
    expect(ceziFacts.map(({ fact }) => fact.label)).toEqual(['所测字', '康熙笔画', '数理', '字形结构']);
    expect(chenguzFacts.map(({ fact }) => fact.label)).toEqual(['总骨重', '版本', '年支', '农历月']);
    expectPresentationMatchesSnapshot(cezi, ceziFacts);
    expectPresentationMatchesSnapshot(chenguz, chenguzFacts);
  });

  it('五运六气成功 envelope 只产生经逐条核验的白名单 facts，并与导出快照同源', () => {
    const yunqi = calcYunqiEnveloped({ year: 2025, currentMonth: 3, solar: SOLAR });

    expect(yunqi.ok).toBe(true);
    if (!yunqi.ok) throw new Error('expected successful yunqi envelope');

    const facts = createYunqiFactChecks(yunqi.data);
    expect(facts.map(({ fact }) => fact.label)).toEqual(['年份', '天干', '地支', '岁运', '司天']);
    expect(facts.map(({ fact }) => fact.value)).toEqual([
      String(yunqi.data.year),
      yunqi.data.tiangan,
      yunqi.data.dizhi,
      yunqi.data.wuyun.dayun,
      yunqi.data.liuqi.sitian,
    ]);
    expectPresentationMatchesSnapshot(yunqi, facts);

    const invalid: StructuredFactCheck = {
      fact: { ...facts[0].fact, value: '篡改值' },
      validation: { valid: false },
    };
    const presentation = toUserPresentation(yunqi, { factChecks: [facts[0], invalid], disclaimers: DISCLAIMERS });
    expect(presentation.semanticReport?.facts).toEqual([facts[0].fact]);
  });

  it('五种已支持联合模式的成功 envelope 仅接纳各自有效 facts', async () => {
    const annual = calcAnnualFortuneCombo({ birth: BIRTH, targetYear: 2025, currentMonth: 3, solar: SOLAR });
    const monthly = calcMonthlyFortuneCombo({ birth: BIRTH, targetYear: 2025, targetMonth: 3, solar: SOLAR });
    const wellness = calcDailyWellnessCombo({ birth: BIRTH, now: { year: 2025, month: 3, day: 15, hour: 9 }, targetYear: 2025, solar: SOLAR });
    const zeri = calcZeriCombo({ birth: BIRTH, purpose: '开业', startDate: '2025-03-16', endDate: '2025-03-22', topN: 5, solar: SOLAR });
    const marriage = await calcMarriageCombo({
      personA: { birth: BIRTH, label: '男方', solar: SOLAR },
      personB: { birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '女' }, label: '女方' },
      scene: '婚恋',
      targetYear: 2025,
    });

    for (const [comboType, envelope, factChecks] of [
      ['annual', annual, () => createComboFactChecks({ comboType: 'annual', data: annual.data })],
      ['monthly', monthly, () => createComboFactChecks({ comboType: 'monthly', data: monthly.data })],
      ['wellness', wellness, () => createComboFactChecks({ comboType: 'wellness', data: wellness.data })],
      ['zeri', zeri, () => createComboFactChecks({ comboType: 'zeri', data: zeri.data })],
      ['marriage', marriage, () => createComboFactChecks({ comboType: 'marriage', data: marriage.data })],
    ] as const) {
      expect(envelope.ok).toBe(true);
      if (!envelope.ok) throw new Error(`expected ${comboType} envelope`);
      expectPresentationMatchesSnapshot(envelope, factChecks());
    }
  });

  it('奇门与六爻成功 envelope 只产生经逐条核验的白名单 facts，并与同一导出快照一致', () => {
    const qimen = calcQimenEnveloped({ birth: BIRTH });
    const liuyao = calcLiuyaoEnveloped({ birth: BIRTH, method: 'manual', yaoValues: '789789', solar: SOLAR });

    expect(qimen.ok).toBe(true);
    expect(liuyao.ok).toBe(true);
    if (!qimen.ok || !liuyao.ok) throw new Error('expected successful divination envelopes');

    const qimenFacts = createQimenFactChecks(qimen.data);
    const liuyaoFacts = createLiuyaoFactChecks(liuyao.data);
    expect(qimenFacts.map(({ fact }) => fact.label)).toEqual(['阴阳遁', '局数', '值符', '值使']);
    expect(liuyaoFacts.map(({ fact }) => fact.label)).toEqual(['本卦', '变卦', '世爻', '动爻']);
    expectPresentationMatchesSnapshot(qimen, qimenFacts);
    expectPresentationMatchesSnapshot(liuyao, liuyaoFacts);

    const noChangedName = { ...liuyao.data, changingHexagramName: '' };
    expect(createLiuyaoFactChecks(noChangedName).map(({ fact }) => fact.label)).not.toContain('变卦');

    const invalid: StructuredFactCheck = {
      fact: { ...qimenFacts[0].fact, value: '篡改值' },
      validation: { valid: false },
    };
    const presentation = toUserPresentation(qimen, { factChecks: [qimenFacts[0], invalid], disclaimers: DISCLAIMERS });
    expect(presentation.semanticReport?.facts).toEqual([qimenFacts[0].fact]);
  });

  it('紫微成功 envelope 只产生白名单本命 facts，并与同一导出快照一致', () => {
    const ziwei = calcZiweiEnveloped({
      birth: { year: 1990, month: 6, day: 15, hour: 12, gender: '男' },
      mingGua: { trigram: '乾', group: '西四命' },
      transit: { year: 2025, month: 3 },
    });

    expect(ziwei.ok).toBe(true);
    if (!ziwei.ok) throw new Error('expected successful ziwei envelope');

    const palaceName = Object.keys(ziwei.data.palaces).find((name) => ziwei.data.palaces[name]?.stars.length) ?? Object.keys(ziwei.data.palaces)[0];
    expect(palaceName).toBeTruthy();
    const facts = createZiweiFactChecks(ziwei.data, palaceName!);

    expect(facts.map(({ fact }) => fact.label)).toEqual(['五行局', '命主', `${palaceName}宫位`, `${palaceName}主星`]);
    expect(facts.map(({ fact }) => fact.value)).toEqual([
      String(ziwei.data.fiveElementsClass),
      String(ziwei.data.soul),
      String(ziwei.data.palaces[palaceName!]?.position),
      String(ziwei.data.palaces[palaceName!]?.stars[0]),
    ]);
    expectPresentationMatchesSnapshot(ziwei, facts);

    const invalid: StructuredFactCheck = {
      fact: { ...facts[0].fact, value: '篡改值' },
      validation: { valid: false },
    };
    const presentation = toUserPresentation(ziwei, { factChecks: [facts[0], invalid], disclaimers: DISCLAIMERS });
    expect(presentation.semanticReport?.facts).toEqual([facts[0].fact]);
    expect(presentation.semanticReport?.facts).not.toContainEqual(invalid.fact);
  });

  it('五运六气失败 envelope 在 Dashboard 边界净化内部 message 且不产生 report、facts 或 exportReport', () => {
    const failure = sanitizeYunqiEnvelope({
      ok: false,
      tool: 'calc_yunqi',
      version: 'test',
      input_normalized: {},
      data: {},
      error: { code: 'internal_failure', message: 'yunqi failed envelope sentinel' },
    } as Parameters<typeof sanitizeYunqiEnvelope>[0]);

    expect(failure.data).toBeNull();
    const presentation = toUserPresentation(failure, { factChecks: [], disclaimers: DISCLAIMERS });
    expect(presentation.state).toBe('error');
    expect(presentation.error?.message).toBe(SAFE_ERROR_MESSAGE);
    expect(presentation.error?.message).not.toContain('yunqi failed envelope sentinel');
    expect(presentation.report).toBeNull();
    expect(presentation.semanticReport).toBeNull();
    expect(presentation.exportReport).toBeNull();
  });

  it('紫微失败 presentation 不产生 report、facts 或 exportReport', () => {
    const failure = sanitizeZiweiEnvelope({
      ok: false,
      tool: 'ziwei_chart',
      version: 'test',
      input_normalized: {},
      data: {},
      error: { code: 'internal_failure', message: 'ziwei internal sentinel' },
    } as Parameters<typeof sanitizeZiweiEnvelope>[0]);

    const presentation = toUserPresentation(failure, { factChecks: [], disclaimers: DISCLAIMERS });
    expect(presentation.state).toBe('error');
    expect(presentation.error?.message).toBe(SAFE_ERROR_MESSAGE);
    expect(presentation.report).toBeNull();
    expect(presentation.semanticReport).toBeNull();
    expect(presentation.exportReport).toBeNull();
  });

  it('未支持的联合模式绝不产生 facts', () => {
    const decision = calcDecisionCombo({ birth: BIRTH, question: '今年适合换工作吗？', solar: SOLAR });
    const space = calcSpaceTimeCombo({ birth: BIRTH, targetYear: 2025, solar: SOLAR });
    const sanshi = calcSanshiCombo({ birth: BIRTH, question: '今年适合换工作吗？', solar: SOLAR, liurenSchool: 'classic' });
    const sanshiClassic = calcSanshiClassicCombo({ birth: BIRTH, question: '今年适合换工作吗？', solar: SOLAR, liurenSchool: 'classic' });

    for (const [comboType, envelope] of [
      ['decision', decision],
      ['space', space],
      ['sanshi', sanshi],
      ['sanshi-classic', sanshiClassic],
    ] as const) {
      expect(envelope.ok).toBe(true);
      if (!envelope.ok) throw new Error(`expected ${comboType} envelope`);
      expect(createComboFactChecks({ comboType, data: envelope.data })).toEqual([]);
    }
  });

  it('不将篡改后的失败核验事实带入 presentation', async () => {
    const cezi = await calcCeziEnveloped({ char: '明', birth: BIRTH, solar: SOLAR });
    expect(cezi.ok).toBe(true);
    if (!cezi.ok) throw new Error('expected successful envelope');

    const verified = createCeziFactChecks(cezi.data)[0];
    const tampered: StructuredFactCheck = {
      fact: { ...verified.fact, value: `${verified.fact.value}错` },
      validation: { valid: false },
    };
    const presentation = toUserPresentation(cezi, { factChecks: [verified, tampered], disclaimers: DISCLAIMERS });

    expect(presentation.semanticReport?.facts).toEqual([verified.fact]);
    expect(presentation.semanticReport?.facts).not.toContainEqual(tampered.fact);
  });

  it('三个 Dashboard 适配边界均净化失败 envelope 的内部 message', () => {
    const internalFailure = {
      ok: false,
      tool: 'internal_tool',
      version: 'internal',
      input_normalized: {},
      data: {},
      error: { code: 'internal_failure', message: 'internal sentinel must not reach DOM' },
    };

    for (const sanitize of [
      () => sanitizeCeziEnvelope(internalFailure as Parameters<typeof sanitizeCeziEnvelope>[0]),
      () => sanitizeChenguzEnvelope(internalFailure as Parameters<typeof sanitizeChenguzEnvelope>[0]),
      () => sanitizeComboEnvelope(internalFailure),
    ]) {
      const presentation = toUserPresentation(sanitize());
      expect(presentation.state).toBe('error');
      expect(presentation.error?.message).toBe(SAFE_ERROR_MESSAGE);
      expect(presentation.error?.message).not.toContain('internal sentinel');
      expect(presentation.report).toBeNull();
      expect(presentation.semanticReport).toBeNull();
      expect(presentation.exportReport).toBeNull();
    }
  });
});
