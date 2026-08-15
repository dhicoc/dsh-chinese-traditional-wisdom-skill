# Claim 校验器全分支回归覆盖 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为每个多工具 claim verifier 的受支持工具分支补齐真实 fixture 驱动的有效、篡改与跨工具回归，并固定共享 violation 契约字段。

**Architecture:** 只扩展 `claimVerifierMatrix.test.ts`，继续通过 `resultData()` 调用 `runLocalTool()` 取得既有 success fixture 的 `ToolEnvelope.data`。每个分支选择引擎直接输出的稳定字段；测试只调用既有 `validate*Claims()`，不修改 `claimContract.ts`、verifier、CLI 或 Dashboard。日用与占测 claim 是按 `tool` 判别的联合类型：跨工具回归必须传入来源工具自身合法的 `kind`/字段组合，由入口的 `claimToolMismatch()` 拒绝；不得把目标工具的 claim 仅替换 `tool`，也不得用双重断言绕过类型检查。

**Tech Stack:** TypeScript、Vitest、既有 `runLocalTool()`、既有 JSON fixtures。

---

## 文件结构

- Modify: `apps/visual/src/__tests__/claimVerifierMatrix.test.ts`
  - 保留现有代表性回归。
  - 新增历法、组合、日用、占测的缺失工具分支矩阵。
  - 固定 `value-mismatch`、`selector-not-found`、`tool-mismatch` 以及共享 violation 字段。
- Verify: `apps/visual/src/__tests__/claimVerifierMatrix.test.ts`
  - 通过现有 success fixture 执行所有新增分支。

### Task 1: 为星宿与组合工具补齐三类回归

**Files:**
- Modify: `apps/visual/src/__tests__/claimVerifierMatrix.test.ts`，在既有“历法”与“组合”测试后追加测试组。
- Test: `apps/visual/src/__tests__/claimVerifierMatrix.test.ts`

- [ ] **Step 1: 写入星宿分支的失败测试**

在历法测试后追加以下测试。它使用 `xingxiu_daily.success.json` 的日期查询结果，核验 `zhiXiu`；篡改值必须是 `value-mismatch`，将同 verifier 的 tool 改为 `get_almanac` 必须是 `tool-mismatch`。

```ts
  it('历法：星宿分支接受真实 claim，拒绝篡改与跨工具 claim', async () => {
    const data = await resultData<any>('xingxiu_daily', 'xingxiu_daily.success.json');
    const valid: CalendarPresentationClaim[] = [
      { tool: 'xingxiu_daily', kind: 'xingxiu', field: 'zhiXiu', value: data.zhiXiu },
    ];

    expect(validateCalendarClaims('xingxiu', data, valid)).toEqual({ valid: true, violations: [] });
    expect(validateCalendarClaims('xingxiu', data, [{ tool: 'xingxiu_daily', kind: 'xingxiu', field: 'zhiXiu', value: `${data.zhiXiu}错` }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateCalendarClaims('xingxiu', data, [{ tool: 'get_almanac', kind: 'xingxiu', field: 'zhiXiu', value: data.zhiXiu } as CalendarPresentationClaim]).violations[0]).toMatchObject({
      code: 'tool-mismatch', tool: 'xingxiu_daily', claimTool: 'get_almanac',
    });
  });
```

- [ ] **Step 2: 运行新增星宿测试，确认当前矩阵在未补齐前失败**

Run:

```text
cd apps/visual
pnpm exec vitest run src/__tests__/claimVerifierMatrix.test.ts
```

Expected: 如果测试尚未写入会没有新增断言；写入后应通过，因为 verifier 已支持该分支。任何失败都必须先读取 fixture 输出与 `calendarClaimVerifier.ts`，不得修改 verifier 来迁就测试。

- [ ] **Step 3: 写入三个组合工具的真实字段、篡改和跨工具测试**

追加一个测试，使用 `combo_daily_wellness.success.json` 的 `context.date`、`combo_monthly_fortune.success.json` 的 `context.month`、`combo_marriage.success.json` 的 `scene`。每个分支均验证有效、篡改与工具来源错误：

```ts
  it('组合：补齐养生、月运和婚配工具的有效、篡改与跨工具 claim', async () => {
    const wellness = await resultData<any>('combo_daily_wellness', 'combo_daily_wellness.success.json');
    const monthly = await resultData<any>('combo_monthly_fortune', 'combo_monthly_fortune.success.json');
    const marriage = await resultData<any>('combo_marriage', 'combo_marriage.success.json');

    expect(validateComboClaims('combo_daily_wellness', wellness, [{ tool: 'combo_daily_wellness', kind: 'wellnessContext', field: 'date', value: wellness.context.date }])).toEqual({ valid: true, violations: [] });
    expect(validateComboClaims('combo_daily_wellness', wellness, [{ tool: 'combo_daily_wellness', kind: 'wellnessContext', field: 'date', value: '1900-01-01' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateComboClaims('combo_daily_wellness', wellness, [{ tool: 'combo_monthly_fortune', kind: 'wellnessContext', field: 'date', value: wellness.context.date } as ComboPresentationClaim]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'combo_daily_wellness', claimTool: 'combo_monthly_fortune' });

    expect(validateComboClaims('combo_monthly_fortune', monthly, [{ tool: 'combo_monthly_fortune', kind: 'monthlyContext', field: 'month', value: monthly.context.month }])).toEqual({ valid: true, violations: [] });
    expect(validateComboClaims('combo_monthly_fortune', monthly, [{ tool: 'combo_monthly_fortune', kind: 'monthlyContext', field: 'month', value: monthly.context.month + 1 }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateComboClaims('combo_monthly_fortune', monthly, [{ tool: 'combo_marriage', kind: 'monthlyContext', field: 'month', value: monthly.context.month } as ComboPresentationClaim]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'combo_monthly_fortune', claimTool: 'combo_marriage' });

    expect(validateComboClaims('combo_marriage', marriage, [{ tool: 'combo_marriage', kind: 'marriageScene', value: marriage.scene }])).toEqual({ valid: true, violations: [] });
    expect(validateComboClaims('combo_marriage', marriage, [{ tool: 'combo_marriage', kind: 'marriageScene', value: marriage.scene === '恋爱' ? '结婚' : '恋爱' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateComboClaims('combo_marriage', marriage, [{ tool: 'combo_annual_fortune', kind: 'marriageScene', value: marriage.scene } as ComboPresentationClaim]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'combo_marriage', claimTool: 'combo_annual_fortune' });
  });
```

- [ ] **Step 4: 为组合数组选择器增加一个越界断言**

在上述组合测试中，以养生推荐为例，追加：

```ts
    expect(validateComboClaims('combo_daily_wellness', wellness, [{ tool: 'combo_daily_wellness', kind: 'wellnessRecommendation', index: -1, field: 'label', value: '不存在' }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
```

- [ ] **Step 5: 运行历法和组合覆盖测试**

Run:

```text
cd apps/visual
pnpm exec vitest run src/__tests__/claimVerifierMatrix.test.ts
```

Expected: PASS；星宿、养生、月运、婚配各有有效、篡改、跨工具断言，养生推荐越界返回 `selector-not-found`。

### Task 2: 为日用 verifier 的六个缺失工具补齐三类回归

**Files:**
- Modify: `apps/visual/src/__tests__/claimVerifierMatrix.test.ts`，在既有“日用”测试后追加测试组。
- Test: `apps/visual/src/__tests__/claimVerifierMatrix.test.ts`

- [ ] **Step 1: 写入体质倾向、解梦和测字测试**

新增一个测试，分别使用稳定字段 `tendencies[0].type`、`entries[0].title`、`char`；每项均用真实值验证成功、改写字段验证 `value-mismatch`、换成另一日用工具来源验证 `tool-mismatch`：

```ts
  it('日用：补齐体质倾向、解梦和测字工具分支', async () => {
    const tendency = await resultData<any>('get_constitution_tendency', 'get_constitution_tendency.success.json');
    const dream = await resultData<any>('dream_interpret', 'dream_interpret.success.json');
    const cezi = await resultData<any>('cast_cezi', 'cast_cezi.success.json');

    expect(validateDailyClaims('get_constitution_tendency', tendency, [{ tool: 'get_constitution_tendency', kind: 'constitutionTendency', index: 0, field: 'type', value: tendency.tendencies[0].type }])).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('get_constitution_tendency', tendency, [{ tool: 'get_constitution_tendency', kind: 'constitutionTendency', index: 0, field: 'type', value: '不存在' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDailyClaims('get_constitution_tendency', tendency, [{ tool: 'dream_interpret', kind: 'dreamSearch', field: 'hit', value: true }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'get_constitution_tendency', claimTool: 'dream_interpret' });

    expect(validateDailyClaims('dream_interpret', dream, [{ tool: 'dream_interpret', kind: 'dreamEntry', index: 0, field: 'title', value: dream.entries[0].title }])).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('dream_interpret', dream, [{ tool: 'dream_interpret', kind: 'dreamEntry', index: 0, field: 'title', value: '不存在' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDailyClaims('dream_interpret', dream, [{ tool: 'cast_cezi', kind: 'cezi', field: 'char', value: cezi.char }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'dream_interpret', claimTool: 'cast_cezi' });

    expect(validateDailyClaims('cast_cezi', cezi, [{ tool: 'cast_cezi', kind: 'cezi', field: 'char', value: cezi.char }])).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('cast_cezi', cezi, [{ tool: 'cast_cezi', kind: 'cezi', field: 'char', value: `${cezi.char}错` }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDailyClaims('cast_cezi', cezi, [{ tool: 'calc_chenguz', kind: 'chenguzVersion', field: 'id', value: 'standard' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'cast_cezi', claimTool: 'calc_chenguz' });
  });
```

- [ ] **Step 2: 为体质倾向和解梦写入选择器越界断言**

在同一测试末尾追加：

```ts
    expect(validateDailyClaims('get_constitution_tendency', tendency, [{ tool: 'get_constitution_tendency', kind: 'constitutionTendency', index: -1, field: 'type', value: '不存在' }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
    expect(validateDailyClaims('dream_interpret', dream, [{ tool: 'dream_interpret', kind: 'dreamEntry', index: -1, field: 'title', value: '不存在' }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
```

- [ ] **Step 3: 写入称骨、节律与体质评估测试**

新增一个测试，选取 `total.text`、`date`、`dominantType`，对每个工具验证有效、篡改与跨工具：

```ts
  it('日用：补齐称骨、节律和体质评估工具分支', async () => {
    const chenguz = await resultData<any>('calc_chenguz', 'calc_chenguz.success.json');
    const rhythm = await resultData<any>('get_daily_rhythm', 'get_daily_rhythm.success.json');
    const assessment = await resultData<any>('assess_constitution', 'assess_constitution.success.json');

    expect(validateDailyClaims('calc_chenguz', chenguz, [{ tool: 'calc_chenguz', kind: 'chenguzTotal', field: 'text', value: chenguz.totalText }])).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('calc_chenguz', chenguz, [{ tool: 'calc_chenguz', kind: 'chenguzTotal', field: 'text', value: '错' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDailyClaims('calc_chenguz', chenguz, [{ tool: 'get_daily_rhythm', kind: 'rhythm', field: 'date', value: '1900-01-01' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'calc_chenguz', claimTool: 'get_daily_rhythm' });

    expect(validateDailyClaims('get_daily_rhythm', rhythm, [{ tool: 'get_daily_rhythm', kind: 'rhythm', field: 'date', value: rhythm.date }])).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('get_daily_rhythm', rhythm, [{ tool: 'get_daily_rhythm', kind: 'rhythm', field: 'date', value: '1900-01-01' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDailyClaims('get_daily_rhythm', rhythm, [{ tool: 'assess_constitution', kind: 'constitution', field: 'dominantType', value: '平和质' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'get_daily_rhythm', claimTool: 'assess_constitution' });

    expect(validateDailyClaims('assess_constitution', assessment, [{ tool: 'assess_constitution', kind: 'constitution', field: 'dominantType', value: assessment.dominantType }])).toEqual({ valid: true, violations: [] });
    expect(validateDailyClaims('assess_constitution', assessment, [{ tool: 'assess_constitution', kind: 'constitution', field: 'dominantType', value: '不存在' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDailyClaims('assess_constitution', assessment, [{ tool: 'analyze_name', kind: 'nameRating', field: 'grade', value: 'A' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'assess_constitution', claimTool: 'analyze_name' });
  });
```

- [ ] **Step 4: 运行日用扩展覆盖测试**

Run:

```text
cd apps/visual
pnpm exec vitest run src/__tests__/claimVerifierMatrix.test.ts
```

Expected: PASS；六个日用分支均有真实成功、篡改与跨工具覆盖，两个索引 selector 场景返回 `selector-not-found`。

### Task 3: 为占测 verifier 的五个缺失工具补齐三类回归

**Files:**
- Modify: `apps/visual/src/__tests__/claimVerifierMatrix.test.ts`，在既有“占测”测试后追加测试组。
- Test: `apps/visual/src/__tests__/claimVerifierMatrix.test.ts`

- [ ] **Step 1: 写入梅花与奇门测试**

新增一个测试。梅花使用 `hexagramName`；奇门使用 `dun`。每个分支验证有效、篡改、跨工具；奇门还保留不存在宫位 selector：

```ts
  it('占测：补齐梅花与奇门工具分支', async () => {
    const meihua = await resultData<any>('cast_meihua', 'cast_meihua.success.json');
    const qimen = await resultData<any>('arrange_qimen', 'arrange_qimen.success.json');

    expect(validateDivinationClaims('cast_meihua', meihua, [{ tool: 'cast_meihua', kind: 'hexagram', field: 'name', value: meihua.hexagramName }])).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('cast_meihua', meihua, [{ tool: 'cast_meihua', kind: 'hexagram', field: 'name', value: '错卦' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDivinationClaims('cast_meihua', meihua, [{ tool: 'arrange_qimen', kind: 'basic', field: 'dun', value: '阳遁' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'cast_meihua', claimTool: 'arrange_qimen' });

    expect(validateDivinationClaims('arrange_qimen', qimen, [{ tool: 'arrange_qimen', kind: 'basic', field: 'dun', value: qimen.dun }])).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('arrange_qimen', qimen, [{ tool: 'arrange_qimen', kind: 'basic', field: 'dun', value: '错局' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDivinationClaims('arrange_qimen', qimen, [{ tool: 'liuren_calculate', kind: 'basic', field: 'jieqi', value: '夏至' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'arrange_qimen', claimTool: 'liuren_calculate' });
    expect(validateDivinationClaims('arrange_qimen', qimen, [{ tool: 'arrange_qimen', kind: 'palace', position: -1, field: 'gate', value: '开门' }]).violations[0]).toMatchObject({ code: 'selector-not-found', expected: undefined });
  });
```

- [ ] **Step 2: 写入大六壬、太乙和皇极测试**

新增一个测试，选择 `basicInfo.jieqi`、`basicInfo.yearGz`、`cycles.hui`。每个工具分支均验证有效、篡改、跨工具：

```ts
  it('占测：补齐大六壬、太乙和皇极工具分支', async () => {
    const liuren = await resultData<any>('liuren_calculate', 'liuren_calculate.success.json');
    const taiyi = await resultData<any>('taiyi_calculate', 'taiyi_calculate.success.json');
    const huangji = await resultData<any>('huangji_calculate', 'huangji_calculate.success.json');

    expect(validateDivinationClaims('liuren_calculate', liuren, [{ tool: 'liuren_calculate', kind: 'basic', field: 'jieqi', value: liuren.basicInfo.jieqi }])).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('liuren_calculate', liuren, [{ tool: 'liuren_calculate', kind: 'basic', field: 'jieqi', value: '不存在' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDivinationClaims('liuren_calculate', liuren, [{ tool: 'taiyi_calculate', kind: 'basic', field: 'yearGz', value: '甲子' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'liuren_calculate', claimTool: 'taiyi_calculate' });

    expect(validateDivinationClaims('taiyi_calculate', taiyi, [{ tool: 'taiyi_calculate', kind: 'basic', field: 'yearGz', value: taiyi.basicInfo.yearGz }])).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('taiyi_calculate', taiyi, [{ tool: 'taiyi_calculate', kind: 'basic', field: 'yearGz', value: '错' }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDivinationClaims('taiyi_calculate', taiyi, [{ tool: 'huangji_calculate', kind: 'lunarMonth', value: 1 }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'taiyi_calculate', claimTool: 'huangji_calculate' });

    expect(validateDivinationClaims('huangji_calculate', huangji, [{ tool: 'huangji_calculate', kind: 'cycle', field: 'hui', value: huangji.cycles.hui }])).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('huangji_calculate', huangji, [{ tool: 'huangji_calculate', kind: 'cycle', field: 'hui', value: huangji.cycles.hui + 1 }]).violations[0]).toMatchObject({ code: 'value-mismatch' });
    expect(validateDivinationClaims('huangji_calculate', huangji, [{ tool: 'cast_liuyao', kind: 'hexagram', field: 'name', value: '乾为天' }]).violations[0]).toMatchObject({ code: 'tool-mismatch', tool: 'huangji_calculate', claimTool: 'cast_liuyao' });
  });
```

- [ ] **Step 3: 为大六壬、太乙与皇极补 selector-not-found 断言**

在该测试末尾追加：

```ts
    expect(validateDivinationClaims('liuren_calculate', liuren, [{ tool: 'liuren_calculate', kind: 'sike', position: 1, field: 'shangShen', value: liuren.siKe.list.find((item: any) => item.position === 1)?.shangShen ?? '' }])).toEqual({ valid: true, violations: [] });
    expect(validateDivinationClaims('huangji_calculate', huangji, [{ tool: 'huangji_calculate', kind: 'gua', layer: 'year', value: huangji.gua.year }])).toEqual({ valid: true, violations: [] });
```

Do not add impossible union values solely to force a selector failure: `sike.position` and `gua.layer` are deliberately closed TypeScript unions. Existing qimen invalid-palace coverage is the selector regression for divination's open numeric selector path.

- [ ] **Step 4: 运行占测扩展覆盖测试**

Run:

```text
cd apps/visual
pnpm exec vitest run src/__tests__/claimVerifierMatrix.test.ts
```

Expected: PASS；梅花、奇门、六壬、太乙、皇极各有真实成功、篡改、跨工具覆盖；奇门越界宫位稳定返回 `selector-not-found`。

### Task 4: 固定共享 violation 形状并完成验证

**Files:**
- Modify: `apps/visual/src/__tests__/claimVerifierMatrix.test.ts`，在数值断言测试后追加共享契约测试。
- Test: `apps/visual/src/__tests__/claimVerifierMatrix.test.ts`

- [ ] **Step 1: 写入共享字段形状测试**

追加测试，使用现有 `calc_feixing` 数据。它对值不一致、缺失路径和跨工具逐一固定 `index`、`tool`、`kind`、`actual` 与 `claimTool`：

```ts
  it('共享 violation 契约保留目标工具、索引、种类和实际值', async () => {
    const data = await resultData<any>('calc_feixing', 'calc_feixing.success.json');
    const result = { data };
    const path = 'data.center.centerStar';

    expect(validateNumericAssertionClaims('calc_feixing', result, [{ path, value: data.center.centerStar + 1 }]).violations[0]).toMatchObject({
      index: 0, tool: 'calc_feixing', kind: 'numericAssertion', code: 'value-mismatch', actual: data.center.centerStar + 1,
    });
    expect(validateNumericAssertionClaims('calc_feixing', result, [{ path: 'data.grid.99.starNum', value: 1 }]).violations[0]).toMatchObject({
      index: 0, tool: 'calc_feixing', kind: 'numericAssertion', code: 'selector-not-found', actual: 1, expected: undefined,
    });
    expect(validateNumericAssertionClaims('calc_feixing', result, [{ tool: 'calc_bazhai', path, value: data.center.centerStar }]).violations[0]).toMatchObject({
      index: 0, tool: 'calc_feixing', claimTool: 'calc_bazhai', kind: 'numericAssertion', code: 'tool-mismatch', actual: data.center.centerStar,
    });
  });
```

- [ ] **Step 2: 运行定向类型检查与完整 claim 矩阵**

Run:

```text
cd apps/visual
pnpm typecheck
pnpm exec vitest run src/__tests__/claimVerifierMatrix.test.ts src/__tests__/comboClaimVerifier.test.ts
```

Expected: typecheck exits 0；Vitest exits 0；所有原有与新增回归通过。

- [ ] **Step 3: 运行完整单元测试**

Run:

```text
cd apps/visual
pnpm test:unit
```

Expected: Vitest exits 0；没有因共享 violation 类型、未提交 verifier 改动或新增矩阵测试引起的其他测试回归。

- [ ] **Step 4: 审阅最小差异并提交用户选定的 claim 工作**

Run:

```text
git diff --check
git diff -- apps/visual/src/__tests__/claimVerifierMatrix.test.ts
```

Expected: 无空白错误；仅增加测试覆盖，不改生产 verifier、Dashboard、CLI 或 fixture。

仅在用户明确要求提交整个当前 claim 改动集合时，暂存该集合的 claim verifier、测试、路线图和 `claimContract.ts` 文件；不得暂存 `.gitignore` 或任何无关用户改动。建议提交信息：

```text
test(claims): 覆盖多工具校验分支
```
