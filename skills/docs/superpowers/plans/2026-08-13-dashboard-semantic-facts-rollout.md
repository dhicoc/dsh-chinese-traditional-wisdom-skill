# Dashboard 结构化事实接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 11 个现有 `FourLayerReport` Dashboard Workspace 接入仅经 verifier 单条验证通过的结构化事实，并保证页面和 HTML 导出使用同一语义结果。

**Architecture:** 每个 Workspace 显式定义一个小型 `createXxxFactChecks(data)` 纯函数；函数为每条白名单 claim 单独调用其 `validate*Claims()` verifier，返回 `StructuredFactCheck[]`。成功 `ToolEnvelope` 通过 `toUserPresentation()` 统一生成报告、语义模型和导出模型；双算页面先收束为单一成功 envelope 数据源，未支持的联合分析模式显式返回空 facts。

**Tech Stack:** TypeScript、React、Vite、Vitest、React Testing Library、Playwright、pnpm。

---

## 文件结构

### 修改的共享测试与入口

- `apps/visual/src/__tests__/dashboard-semantic-facts.test.ts`：新增纯事实映射与 presentation 过滤回归。
- `apps/visual/src/__tests__/four-layer-report.test.tsx`：验证由 presentation 提供的 facts 区及空 facts 边界。
- `apps/visual/src/__tests__/export-report-button.test.tsx`：验证 presentation 的 validated facts 与 HTML 导出一致。
- `apps/visual/e2e/dashboard-semantic-facts.spec.ts`：跨 Workspace 用户侧事实/空 facts/导出边界回归。

### 第一批：已有 envelope 的 Workspace

- `apps/visual/src/features/xingxiu/XingXiuWorkspace.tsx`
- `apps/visual/src/features/taiyi/TaiyiWorkspace.tsx`
- `apps/visual/src/features/liuren/LiurenWorkspace.tsx`
- `apps/visual/src/features/huangji/HuangjiWorkspace.tsx`
- `apps/visual/src/features/cezi/CeziWorkspace.tsx`
- `apps/visual/src/features/chenguz/ChenguzWorkspace.tsx`
- `apps/visual/src/features/combo/ComboWorkspace.tsx`

### 第二批：收束双算后接入的 Workspace

- `apps/visual/src/features/ziwei/ZiweiWorkspace.tsx`
- `apps/visual/src/features/yunqi/YunqiWorkspace.tsx`
- `apps/visual/src/features/qimen/QimenWorkspace.tsx`
- `apps/visual/src/features/liuyao/LiuyaoWorkspace.tsx`

### 既有实现和合约（只读参考）

- `apps/visual/src/features/bazi/BaziWorkspace.tsx`：现有页面级事实映射范式。
- `apps/visual/src/legacy/reportLayers.ts`：`StructuredFactCheck`、`toUserPresentation()`、valid-only filtering。
- `apps/visual/src/components/shared/FourLayerReport.tsx`：页面 facts 区。
- `apps/visual/src/components/shared/ExportReportButton.tsx`：导出 facts 区。
- `apps/visual/src/legacy/claimVerification/{calendar,divination,daily,combo,ziwei}ClaimVerifier.ts`：当前 claim 白名单；本计划不扩张它们。

## 全局实现规则

所有 `createXxxFactChecks()` 遵循下面的局部模式。不要抽象成按路径读取字段的通用 helper，避免 UI 数据被自动升级为事实：

```ts
function createExampleFactChecks(data: ExampleData): StructuredFactCheck[] {
  const candidates: Array<{ claim: ExampleClaim; label: string; value: string }> = [
    { claim: { kind: 'example', value: data.value }, label: '示例字段', value: data.value },
  ];

  return candidates.map(({ claim, label, value }) => ({
    fact: { label, value, tool: 'example_tool' },
    validation: validateExampleClaims(data, [claim]),
  }));
}
```

每个 Workspace 使用相同的 presentation 结构：

```ts
const factChecks = useMemo(
  () => envelope?.ok ? createExampleFactChecks(envelope.data) : [],
  [envelope],
);

const presentation = useMemo(
  () => envelope
    ? toUserPresentation(envelope, {
      factChecks,
      disclaimers: ['本报告提供结构化计算与传统文化解释参考，不构成对现实结果、医疗、法律或财务事项的保证或专业建议。'],
    })
    : null,
  [envelope, factChecks],
);
```

渲染和导出必须共用该 presentation：

```tsx
{presentation?.report && (
  <FourLayerReport
    report={presentation.report}
    semanticReport={presentation.semanticReport}
    notices={presentation.notices}
    warnings={presentation.warnings}
    title="模块解读"
  />
)}

{presentation?.exportReport && (
  <ExportReportButton
    module="模块名称"
    presentation={{
      report: presentation.exportReport,
      semanticReport: presentation.semanticReport,
      notices: presentation.notices,
      warnings: presentation.warnings,
    }}
  />
)}
```

---

### Task 1: 建立事实映射的单元测试支架

**Files:**
- Create: `apps/visual/src/__tests__/dashboard-semantic-facts.test.ts`
- Modify: `apps/visual/src/__tests__/four-layer-report.test.tsx`
- Modify: `apps/visual/src/__tests__/export-report-button.test.tsx`

- [ ] **Step 1: 写入共享 semantic filtering 的失败测试**

在 `dashboard-semantic-facts.test.ts` 添加以下最小测试，先固定“每条单独 validation、无效项不会泄漏到 facts”的行为：

```ts
import { describe, expect, it } from 'vitest';
import { toUserPresentation, type StructuredFactCheck } from '@/legacy/reportLayers';

describe('Dashboard structured fact presentation', () => {
  it('keeps only independently validated facts in the presentation and export model', () => {
    const factChecks: StructuredFactCheck[] = [
      { fact: { label: '值宿', value: '角', tool: 'xingxiu_daily' }, validation: { valid: true } },
      { fact: { label: '传统建议', value: '宜静守', tool: 'xingxiu_daily' }, validation: { valid: false } },
    ];
    const presentation = toUserPresentation({
      ok: true,
      data: { export_snapshot: { summary: '传统解释', sections: [{ heading: '建议', body: '宜静守。' }] } },
    }, { factChecks, disclaimers: ['仅作传统文化参考。'] });

    expect(presentation.semanticReport?.facts).toEqual([
      { label: '值宿', value: '角', tool: 'xingxiu_daily' },
    ]);
    expect(presentation.exportReport).toEqual({
      summary: '传统解释',
      sections: [{ heading: '建议', body: '宜静守。' }],
    });
  });
});
```

- [ ] **Step 2: 运行新增测试，确认既有语义过滤行为被固定**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/dashboard-semantic-facts.test.ts
```

Expected: PASS. This is a characterization test of existing `toUserPresentation()` and establishes the new test file before Workspace helpers are added.

- [ ] **Step 3: 扩展 FourLayerReport 对 presentation facts 的组件断言**

在 `four-layer-report.test.tsx` 的 semantic report 测试区添加：

```tsx
it('renders validated facts while keeping traditional interpretation separate', () => {
  render(
    <FourLayerReport
      report={toFourLayer({ summary: '摘要', sections: [{ heading: '四柱', body: '传统解释。' }] })}
      semanticReport={{
        facts: [{ label: '日干支', value: '甲子', tool: 'taiyi_calculate' }],
        traditionalInterpretations: [{ heading: '四柱', body: '传统解释。' }],
        actions: [],
        disclaimers: ['仅作传统文化参考。'],
      }}
    />,
  );

  expect(screen.getByText('结构化事实核对')).toBeInTheDocument();
  expect(screen.getByText('日干支')).toBeInTheDocument();
  expect(screen.getByText('甲子')).toBeInTheDocument();
  expect(screen.getByText('查看传统解释')).toBeInTheDocument();
  expect(screen.getByText('仅作传统文化参考。')).toBeInTheDocument();
});
```

- [ ] **Step 4: 扩展 HTML 导出对 valid-only presentation 的断言**

在 `export-report-button.test.tsx` 中调用 `createExportReportHtml()`，添加：

```ts
it('exports only validated presentation facts', () => {
  const html = createExportReportHtml('二十八星宿', {
    report: { summary: '摘要', sections: [{ heading: '传统解释', body: '仅供参考。' }] },
    semanticReport: {
      facts: [{ label: '值宿', value: '角', tool: 'xingxiu_daily' }],
      traditionalInterpretations: [{ heading: '传统解释', body: '仅供参考。' }],
      actions: [],
      disclaimers: ['仅作传统文化参考。'],
    },
    notices: [],
    warnings: [],
  });

  expect(html).toContain('结构化事实核对');
  expect(html).toContain('值宿');
  expect(html).toContain('角');
  expect(html).not.toContain('evidence');
});
```

- [ ] **Step 5: 运行共享单元测试**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/dashboard-semantic-facts.test.ts src/__tests__/four-layer-report.test.tsx src/__tests__/export-report-button.test.tsx
```

Expected: PASS.

- [ ] **Step 6: 提交共享测试支架**

```cmd
git add apps/visual/src/__tests__/dashboard-semantic-facts.test.ts apps/visual/src/__tests__/four-layer-report.test.tsx apps/visual/src/__tests__/export-report-button.test.tsx
git commit -m "test(report): 固定 Dashboard 事实呈现边界"
```

---

### Task 2: 接入二十八星宿、太乙、大六壬与皇极经世

**Files:**
- Modify: `apps/visual/src/features/xingxiu/XingXiuWorkspace.tsx`
- Modify: `apps/visual/src/features/taiyi/TaiyiWorkspace.tsx`
- Modify: `apps/visual/src/features/liuren/LiurenWorkspace.tsx`
- Modify: `apps/visual/src/features/huangji/HuangjiWorkspace.tsx`
- Modify: `apps/visual/src/__tests__/dashboard-semantic-facts.test.ts`

- [ ] **Step 1: 写失败测试，定义第一组页面的 facts 标签与工具**

在新测试文件使用这些真实 engine envelopes 或现有测试 fixture 取得 `data`，并断言每个 helper 至少保留两项：

```ts
expect(createXingxiuFactChecks(xingxiuData).map(({ fact }) => fact.label)).toEqual([
  '当日值宿', '值宿全称', '所属四象', '五行',
]);
expect(createTaiyiFactChecks(taiyiData).map(({ fact }) => fact.tool)).toEqual([
  'taiyi_calculate', 'taiyi_calculate', 'taiyi_calculate', 'taiyi_calculate',
]);
expect(createLiurenFactChecks(liurenData).every(({ validation }) => validation.valid)).toBe(true);
expect(createHuangjiFactChecks(huangjiData).map(({ fact }) => fact.label)).toEqual([
  '积年', '会', '世卦', '世爻',
]);
```

Import helpers from their Workspaces only after exporting the pure functions; do not mount the Workspaces.

- [ ] **Step 2: 运行定向测试，确认 helpers 尚未导出**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/dashboard-semantic-facts.test.ts
```

Expected: FAIL with missing exported `createXingxiuFactChecks`, `createTaiyiFactChecks`, `createLiurenFactChecks`, and `createHuangjiFactChecks`.

- [ ] **Step 3: 在星宿页面实现显式 facts 与统一 presentation**

在 `XingXiuWorkspace.tsx`：

1. 导入 `validateCalendarClaims`、`CalendarPresentationClaim`、`toUserPresentation`、`StructuredFactCheck`。
2. 在组件前导出以下 helper：

```ts
export function createXingxiuFactChecks(data: XingxiuData): StructuredFactCheck[] {
  const candidates: Array<{ claim: CalendarPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'xingxiu_daily', kind: 'xingxiu', field: 'zhiXiu', value: data.zhiXiu }, label: '当日值宿', value: data.zhiXiu },
    { claim: { tool: 'xingxiu_daily', kind: 'xingxiu', field: 'zhiXiuFull', value: data.zhiXiuFull }, label: '值宿全称', value: data.zhiXiuFull },
    { claim: { tool: 'xingxiu_daily', kind: 'xingxiu', field: 'xiang', value: data.xiang }, label: '所属四象', value: data.xiang },
    { claim: { tool: 'xingxiu_daily', kind: 'xingxiu', field: 'wuxing', value: data.wuxing }, label: '五行', value: data.wuxing },
  ];
  return candidates.map(({ claim, label, value }) => ({
    fact: { label, value, tool: 'xingxiu_daily' },
    validation: validateCalendarClaims('xingxiu', data, [claim]),
  }));
}
```

3. 用当前 `result.envelope` 生成 `factChecks` 与 `presentation`。
4. 将导出按钮替换成 presentation 输入，并向 `FourLayerReport` 传入 `semanticReport/notices/warnings`。

- [ ] **Step 4: 在太乙、大六壬、皇极页面实现对应 helpers**

分别导出并使用下列 helpers。每条 candidate 仍需使用单条 verifier 调用。

```ts
export function createTaiyiFactChecks(data: TaiyiData): StructuredFactCheck[] {
  const candidates: Array<{ claim: DivinationPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'taiyi_calculate', kind: 'basic', field: 'dayGz', value: data.basicInfo.dayGz }, label: '日干支', value: data.basicInfo.dayGz },
    { claim: { tool: 'taiyi_calculate', kind: 'kook', field: 'wen', value: data.kook.wen }, label: '局式', value: data.kook.wen },
    { claim: { tool: 'taiyi_calculate', kind: 'position', subject: 'taiyi', field: 'gong', value: data.taiyi.gong }, label: '太乙落宫', value: data.taiyi.gong },
    { claim: { tool: 'taiyi_calculate', kind: 'calculation', side: 'home', field: 'cal', value: data.home.cal }, label: '主算', value: String(data.home.cal) },
  ];
  return candidates.map(({ claim, label, value }) => ({ fact: { label, value, tool: 'taiyi_calculate' }, validation: validateDivinationClaims('taiyi_calculate', data, [claim]) }));
}
```

```ts
export function createLiurenFactChecks(data: DaliurenData): StructuredFactCheck[] {
  const firstKe = data.siKe.list.find((item) => item.position === 1);
  const candidates: Array<{ claim: DivinationPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'liuren_calculate', kind: 'basic', field: 'dayGanZhi', value: data.basicInfo.dayGanZhi }, label: '日干支', value: data.basicInfo.dayGanZhi },
    { claim: { tool: 'liuren_calculate', kind: 'basic', field: 'yueJiangName', value: data.basicInfo.yueJiangName }, label: '月将', value: data.basicInfo.yueJiangName },
    ...(firstKe ? [{ claim: { tool: 'liuren_calculate', kind: 'sike', position: 1, field: 'shangShen', value: firstKe.shangShen } as DivinationPresentationClaim, label: '第一课上神', value: firstKe.shangShen }] : []),
    { claim: { tool: 'liuren_calculate', kind: 'sanchuan', stage: 'chuChuan', field: 'diZhi', value: data.sanChuan.chuChuan.diZhi }, label: '初传', value: data.sanChuan.chuChuan.diZhi },
  ];
  return candidates.map(({ claim, label, value }) => ({ fact: { label, value, tool: 'liuren_calculate' }, validation: validateDivinationClaims('liuren_calculate', data, [claim]) }));
}
```

```ts
export function createHuangjiFactChecks(data: HuangjiData): StructuredFactCheck[] {
  const candidates: Array<{ claim: DivinationPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'huangji_calculate', kind: 'cycle', field: 'acumYear', value: data.cycles.acumYear }, label: '积年', value: String(data.cycles.acumYear) },
    { claim: { tool: 'huangji_calculate', kind: 'cycle', field: 'hui', value: data.cycles.hui }, label: '会', value: String(data.cycles.hui) },
    { claim: { tool: 'huangji_calculate', kind: 'gua', layer: 'shi', value: data.gua.shi }, label: '世卦', value: data.gua.shi },
    { claim: { tool: 'huangji_calculate', kind: 'movingLine', layer: 'shi', value: data.movingLines.shi }, label: '世爻', value: String(data.movingLines.shi) },
  ];
  return candidates.map(({ claim, label, value }) => ({ fact: { label, value, tool: 'huangji_calculate' }, validation: validateDivinationClaims('huangji_calculate', data, [claim]) }));
}
```

For each Workspace, replace the old `toFourLayer(envelope.data.export_snapshot)` consumption with presentation consumption. Do not change any board/chart detail rendering sourced from `data`.

- [ ] **Step 5: 运行第一组页面测试和类型检查**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/dashboard-semantic-facts.test.ts src/__tests__/claimVerifierMatrix.test.ts
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual typecheck
```

Expected: PASS.

- [ ] **Step 6: 提交第一组同源页面**

```cmd
git add apps/visual/src/features/xingxiu/XingXiuWorkspace.tsx apps/visual/src/features/taiyi/TaiyiWorkspace.tsx apps/visual/src/features/liuren/LiurenWorkspace.tsx apps/visual/src/features/huangji/HuangjiWorkspace.tsx apps/visual/src/__tests__/dashboard-semantic-facts.test.ts
git commit -m "feat(report): 接入星宿与术数核验事实"
```

---

### Task 3: 接入测字、称骨与已支持联合分析模式

**Files:**
- Modify: `apps/visual/src/features/cezi/CeziWorkspace.tsx`
- Modify: `apps/visual/src/features/chenguz/ChenguzWorkspace.tsx`
- Modify: `apps/visual/src/features/combo/ComboWorkspace.tsx`
- Modify: `apps/visual/src/__tests__/dashboard-semantic-facts.test.ts`

- [ ] **Step 1: 写失败测试，覆盖 folklore 与 combo 映射边界**

追加下列断言：

```ts
expect(createCeziFactChecks(ceziData).map(({ fact }) => fact.label)).toEqual([
  '所测字', '康熙笔画', '数理', '字形结构',
]);
expect(createChenguzFactChecks(chenguzData).map(({ fact }) => fact.label)).toEqual([
  '总骨重', '版本', '年支', '农历月',
]);
expect(createComboFactChecks('decision', decisionData)).toEqual([]);
expect(createComboFactChecks('sanshi', sanshiData)).toEqual([]);
expect(createComboFactChecks('annual', annualData).every(({ validation }) => validation.valid)).toBe(true);
```

- [ ] **Step 2: 运行测试，确认 helpers 尚未导出**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/dashboard-semantic-facts.test.ts
```

Expected: FAIL with missing `createCeziFactChecks`, `createChenguzFactChecks`, and `createComboFactChecks`.

- [ ] **Step 3: 将测字改为 envelope 单一来源并接入 facts**

在 `CeziWorkspace.tsx`：

1. 将 `calcCezi` 导入替换为 `calcCeziEnveloped`，其来源保持 `@/engine-api/folklore`。
2. 异步 effect 调用：

```ts
const envelope = await calcCeziEnveloped({ char, aspect, birth: solarBirth, solar: getSolarEntry() });
if (cancelled) return;
setResult(envelope.ok ? { envelope } : { envelope });
```

保留原有 cancellation guard；状态只保存 envelope，不保存从 `toFourLayer()` 预先派生的报告。

3. 导出 helper：

```ts
export function createCeziFactChecks(data: CeziResult): StructuredFactCheck[] {
  const candidates: Array<{ claim: DailyPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'cast_cezi', kind: 'cezi', field: 'char', value: data.char }, label: '所测字', value: data.char },
    { claim: { tool: 'cast_cezi', kind: 'cezi', field: 'strokes', value: data.strokes }, label: '康熙笔画', value: String(data.strokes) },
    { claim: { tool: 'cast_cezi', kind: 'ceziShuli', field: 'lucky', value: data.shuli.lucky }, label: '数理', value: data.shuli.lucky },
    { claim: { tool: 'cast_cezi', kind: 'ceziStructure', field: 'structure', value: data.structure.structure }, label: '字形结构', value: data.structure.structure },
  ];
  return candidates.map(({ claim, label, value }) => ({ fact: { label, value, tool: 'cast_cezi' }, validation: validateDailyClaims('cast_cezi', data, [claim]) }));
}
```

4. 仅在 `envelope?.ok` 时构造 `factChecks` 和 `presentation`；报告与导出均用 presentation。

- [ ] **Step 4: 将称骨改为 envelope 单一来源并接入 facts**

在 `ChenguzWorkspace.tsx` 将 `calcChenguz` 替换为 `calcChenguzEnveloped`，并让 `useMemo()` 保留 envelope。导出：

```ts
export function createChenguzFactChecks(data: ChenguzResult): StructuredFactCheck[] {
  const candidates: Array<{ claim: DailyPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'calc_chenguz', kind: 'chenguzTotal', field: 'text', value: data.totalText }, label: '总骨重', value: data.totalText },
    { claim: { tool: 'calc_chenguz', kind: 'chenguzVersion', field: 'name', value: data.versionName }, label: '版本', value: data.versionName },
    { claim: { tool: 'calc_chenguz', kind: 'chenguzBone', component: 'yearBone', field: 'branch', value: data.yearBone.branch }, label: '年支', value: data.yearBone.branch },
    { claim: { tool: 'calc_chenguz', kind: 'chenguzBone', component: 'monthBone', field: 'lunarMonth', value: data.monthBone.lunarMonth }, label: '农历月', value: String(data.monthBone.lunarMonth) },
  ];
  return candidates.map(({ claim, label, value }) => ({ fact: { label, value, tool: 'calc_chenguz' }, validation: validateDailyClaims('calc_chenguz', data, [claim]) }));
}
```

Only successful envelopes get presentation; preserve visual fallback behavior without facts.

- [ ] **Step 5: 实现联合分析按模式收窄的 helper**

在 `ComboWorkspace.tsx` 导出：

```ts
export function createComboFactChecks(comboType: ComboType, data: ComboResult): StructuredFactCheck[] {
  if (comboType === 'decision' || comboType === 'space' || comboType === 'sanshi' || comboType === 'sanshi-classic') return [];

  const candidates = comboType === 'annual'
    ? [
        { claim: { tool: 'combo_annual_fortune', kind: 'annualContext', field: 'targetYear', value: data.context.targetYear } as ComboPresentationClaim, label: '目标年份', value: String(data.context.targetYear), tool: 'combo_annual_fortune' },
        { claim: { tool: 'combo_annual_fortune', kind: 'annualContext', field: 'mingGuaTrigram', value: data.context.mingGua.trigram } as ComboPresentationClaim, label: '命卦卦象', value: data.context.mingGua.trigram, tool: 'combo_annual_fortune' },
      ]
    : [];

  return candidates.map(({ claim, label, value, tool }) => ({
    fact: { label, value, tool },
    validation: validateComboClaims(tool as ComboPresentationTool, data, [claim]),
  }));
}
```

Complete the same explicit candidate pattern for:

- `monthly`: `year`、`month`、`monthGanZhi`、`jieqi`;
- `wellness`: `date`、`jieqi`、`season`、`shichen`;
- `zeri`: `zeriPurpose`、`range.start`、`range.end`、`range.scannedDays` and `rankedDays[0].date` only if index 0 exists;
- `marriage`: `scene`、`personA.dayGanZhi`、`personB.dayGanZhi`、both `mingGua.group`.

Each candidate must call `validateComboClaims()` separately. Do not type-cast `decision`, `space`, `sanshi`, or `sanshi-classic` to `ComboPresentationTool`; they return `[]` before any verifier call.

Create presentation only when `isCurrentResult && result.envelope?.ok && data` is true. Update both report and export to consume the same presentation.

- [ ] **Step 6: 运行 folklore、combo 与类型测试**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/dashboard-semantic-facts.test.ts src/__tests__/ceziEngine.test.ts src/__tests__/chenguzEngine.test.ts src/__tests__/comboClaimVerifier.test.ts src/__tests__/claimVerifierMatrix.test.ts
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual typecheck
```

Expected: PASS.

- [ ] **Step 7: 提交 folklore 与联合分析接入**

```cmd
git add apps/visual/src/features/cezi/CeziWorkspace.tsx apps/visual/src/features/chenguz/ChenguzWorkspace.tsx apps/visual/src/features/combo/ComboWorkspace.tsx apps/visual/src/__tests__/dashboard-semantic-facts.test.ts
git commit -m "feat(report): 接入日用与联合分析核验事实"
```

---

### Task 4: 收束紫微与五运六气的双算数据源

**Files:**
- Modify: `apps/visual/src/features/ziwei/ZiweiWorkspace.tsx`
- Modify: `apps/visual/src/features/yunqi/YunqiWorkspace.tsx`
- Modify: `apps/visual/src/__tests__/dashboard-semantic-facts.test.ts`

- [ ] **Step 1: 写失败测试，固定“成功同源才有 facts”**

使用成功 envelope data 和 `null`/fallback 状态，追加：

```ts
expect(createZiweiFactChecks(ziweiData, '命宫').every(({ validation }) => validation.valid)).toBe(true);
expect(createYunqiFactChecks(yunqiData).map(({ fact }) => fact.label)).toEqual([
  '年份', '干支', '岁运', '司天',
]);
expect(createPresentationForOptionalEnvelope(null)).toBeNull();
```

Implement `createPresentationForOptionalEnvelope` only in the test if necessary; do not add a production generic abstraction. The intent is to prove a null envelope cannot reach `toUserPresentation()`.

- [ ] **Step 2: 运行测试，确认 helpers 尚未导出**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/dashboard-semantic-facts.test.ts
```

Expected: FAIL with missing `createZiweiFactChecks` and `createYunqiFactChecks`.

- [ ] **Step 3: 将紫微盘面、报告、导出和 facts 收束到成功 envelope**

In `ZiweiWorkspace.tsx`:

1. Preserve the existing fallback data only for board rendering when no successful envelope exists.
2. Create one memoized `envelope = calcZiweiEnveloped(...)` for the exact current birth inputs.
3. Set `data` for successful board/report/export/facts to `envelope.ok ? envelope.data : null`; use fallback only in the board-only render branch.
4. Export:

```ts
export function createZiweiFactChecks(data: ZiweiData, palaceName: string): StructuredFactCheck[] {
  const palace = data.palaces[palaceName];
  const candidates: Array<{ claim: ZiweiPresentationClaim; label: string; value: string }> = [
    { claim: { kind: 'metadata', field: 'fiveElementsClass', value: data.fiveElementsClass }, label: '五行局', value: data.fiveElementsClass },
    { claim: { kind: 'metadata', field: 'soul', value: data.soul }, label: '命主', value: data.soul },
    ...(palace ? [{ claim: { kind: 'palace', palace: palaceName, field: 'position', value: palace.position } as ZiweiPresentationClaim, label: `${palaceName}宫位`, value: palace.position }] : []),
    ...(palace?.stars[0] ? [{ claim: { kind: 'palaceStar', palace: palaceName, value: palace.stars[0] } as ZiweiPresentationClaim, label: `${palaceName}宫主星`, value: palace.stars[0] }] : []),
  ];
  return candidates.map(({ claim, label, value }) => ({ fact: { label, value, tool: 'ziwei_chart' }, validation: validateZiweiClaims(data, [claim]) }));
}
```

5. Pass only the successful envelope to `toUserPresentation()`; no fallback enters `factChecks`.

- [ ] **Step 4: 将五运六气图表、报告、导出和 facts 收束到同一 envelope**

Replace the independent `calculateYunqi()` chart calculation and `calcYunqiEnveloped()` report calculation with one memoized/envelope-driven result. Its `data` is the only source for chart/cards, report, export and facts.

Export:

```ts
export function createYunqiFactChecks(data: YunqiData): StructuredFactCheck[] {
  const candidates: Array<{ claim: CalendarPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'calc_yunqi', kind: 'yunqiYear', field: 'year', value: data.year }, label: '年份', value: String(data.year) },
    { claim: { tool: 'calc_yunqi', kind: 'yunqiYear', field: 'tiangan', value: data.tiangan }, label: '天干', value: data.tiangan },
    { claim: { tool: 'calc_yunqi', kind: 'yunqiYear', field: 'dizhi', value: data.dizhi }, label: '地支', value: data.dizhi },
    { claim: { tool: 'calc_yunqi', kind: 'yunqiWuyun', field: 'dayun', value: data.wuyun.dayun }, label: '岁运', value: data.wuyun.dayun },
    { claim: { tool: 'calc_yunqi', kind: 'yunqiLiuqi', field: 'sitian', value: data.liuqi.sitian }, label: '司天', value: data.liuqi.sitian },
  ];
  return candidates.map(({ claim, label, value }) => ({
    fact: { label, value, tool: 'calc_yunqi' },
    validation: validateCalendarClaims('yunqi', data, [claim]),
  }));
}
```

The verifier has separate `tiangan` and `dizhi` claims. Keep them as two facts; do not create a combined `干支` fact unless the verifier later gains a single combined claim that validates both values together.

- [ ] **Step 5: 运行紫微、五运六气测试与类型检查**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/dashboard-semantic-facts.test.ts src/__tests__/ziweiEngine.test.ts src/__tests__/yunqiEngine.test.ts src/__tests__/claimVerifierMatrix.test.ts
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual typecheck
```

Expected: PASS.

- [ ] **Step 6: 提交紫微与五运六气收束**

```cmd
git add apps/visual/src/features/ziwei/ZiweiWorkspace.tsx apps/visual/src/features/yunqi/YunqiWorkspace.tsx apps/visual/src/__tests__/dashboard-semantic-facts.test.ts
git commit -m "feat(report): 收束紫微与五运六气事实来源"
```

---

### Task 5: 收束奇门与六爻的双算数据源

**Files:**
- Modify: `apps/visual/src/features/qimen/QimenWorkspace.tsx`
- Modify: `apps/visual/src/features/liuyao/LiuyaoWorkspace.tsx`
- Modify: `apps/visual/src/__tests__/dashboard-semantic-facts.test.ts`

- [ ] **Step 1: 写失败测试，固定成功 envelope 和 fallback 的差异**

Append:

```ts
expect(createQimenFactChecks(qimenData).map(({ fact }) => fact.label)).toEqual([
  '阴阳遁', '局数', '值符', '值使',
]);
expect(createLiuyaoFactChecks(liuyaoData).some(({ fact }) => fact.label === '本卦')).toBe(true);
expect(createLiuyaoFactChecks(liuyaoData).every(({ validation }) => validation.valid)).toBe(true);
```

Additionally test a helper caller convention: `envelope.ok ? createLiuyaoFactChecks(envelope.data) : []` returns `[]` for a failure envelope. Do not pass `DEFAULT_FALLBACK` to the helper.

- [ ] **Step 2: 运行测试，确认 helpers 尚未导出**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/dashboard-semantic-facts.test.ts
```

Expected: FAIL with missing `createQimenFactChecks` and `createLiuyaoFactChecks`.

- [ ] **Step 3: 收束奇门并实现 facts**

Make `calcQimenEnveloped()` the successful source for board, report, export and facts. Existing ready/null visual branch may remain but must not create a presentation.

```ts
export function createQimenFactChecks(data: QimenData): StructuredFactCheck[] {
  const candidates: Array<{ claim: DivinationPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'arrange_qimen', kind: 'basic', field: 'dun', value: data.dun }, label: '阴阳遁', value: data.dun },
    { claim: { tool: 'arrange_qimen', kind: 'basic', field: 'ju', value: data.ju }, label: '局数', value: data.ju },
    ...(data.zhiFu ? [{ claim: { tool: 'arrange_qimen', kind: 'zhiFu', field: 'star', value: data.zhiFu.star } as DivinationPresentationClaim, label: '值符', value: data.zhiFu.star }] : []),
    ...(data.zhiShi ? [{ claim: { tool: 'arrange_qimen', kind: 'zhiShi', field: 'gate', value: data.zhiShi.gate } as DivinationPresentationClaim, label: '值使', value: data.zhiShi.gate }] : []),
  ];
  return candidates.map(({ claim, label, value }) => ({ fact: { label, value, tool: 'arrange_qimen' }, validation: validateDivinationClaims('arrange_qimen', data, [claim]) }));
}
```

- [ ] **Step 4: 收束六爻并实现 facts**

Use one successful `calcLiuyaoEnveloped(input)` result for board/report/export/facts. Keep `DEFAULT_FALLBACK` only as display fallback and never send it to `toUserPresentation()` or `createLiuyaoFactChecks()`.

```ts
export function createLiuyaoFactChecks(data: LiuyaoData): StructuredFactCheck[] {
  const candidates: Array<{ claim: DivinationPresentationClaim; label: string; value: string }> = [
    { claim: { tool: 'cast_liuyao', kind: 'hexagram', field: 'name', value: data.hexagramName }, label: '本卦', value: data.hexagramName },
    ...(data.changingHexagramName ? [{ claim: { tool: 'cast_liuyao', kind: 'hexagram', field: 'changedName', value: data.changingHexagramName } as DivinationPresentationClaim, label: '变卦', value: data.changingHexagramName }] : []),
    { claim: { tool: 'cast_liuyao', kind: 'yao', field: 'shiYao', value: data.shiYao }, label: '世爻', value: String(data.shiYao) },
    { claim: { tool: 'cast_liuyao', kind: 'yao', field: 'changingYao', value: data.changingYao.join('、') }, label: '动爻', value: data.changingYao.join('、') },
  ];
  return candidates.map(({ claim, label, value }) => ({ fact: { label, value, tool: 'cast_liuyao' }, validation: validateDivinationClaims('cast_liuyao', data, [claim]) }));
}
```

- [ ] **Step 5: 运行奇门、六爻测试与类型检查**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/dashboard-semantic-facts.test.ts src/__tests__/qimenEngine.test.ts src/__tests__/liuyaoEngine.test.ts src/__tests__/claimVerifierMatrix.test.ts
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual typecheck
```

Expected: PASS.

- [ ] **Step 6: 提交奇门与六爻收束**

```cmd
git add apps/visual/src/features/qimen/QimenWorkspace.tsx apps/visual/src/features/liuyao/LiuyaoWorkspace.tsx apps/visual/src/__tests__/dashboard-semantic-facts.test.ts
git commit -m "feat(report): 收束奇门与六爻事实来源"
```

---

### Task 6: 添加跨 Workspace 用户回归

**Files:**
- Create: `apps/visual/e2e/dashboard-semantic-facts.spec.ts`
- Modify: `apps/visual/e2e/p13-helpers.ts` only if an existing helper cannot express an already-established interaction

- [ ] **Step 1: 写失败的跨 Workspace Playwright 覆盖**

Create this spec using existing `openWorkspace()` helper. It must cover one first-batch page, one second-batch page, and one no-contract combo mode:

```ts
import { expect, test } from '@playwright/test';
import { openWorkspace } from './p13-helpers';

test.describe('Dashboard 结构化事实边界', () => {
  test('星宿呈现 verifier 通过的事实，并保留传统解释与免责声明', async ({ page }) => {
    await openWorkspace(page, '二十八星宿', 'xingxiu');
    const workspace = page.locator('[data-testid="workspace-xingxiu"]');
    await expect(workspace.getByText('结构化事实核对', { exact: true })).toBeVisible();
    await expect(workspace.getByText('当日值宿', { exact: true })).toBeVisible();
    await expect(workspace.getByText('传统文化学习参考', { exact: false })).toBeVisible();
  });

  test('五运六气刷新年份后只显示当前计算事实', async ({ page }) => {
    await openWorkspace(page, '五运六气', 'yunqi');
    const workspace = page.locator('[data-testid="workspace-yunqi"]');
    await expect(workspace.getByText('结构化事实核对', { exact: true })).toBeVisible();
    await expect(workspace.getByText('年份', { exact: true })).toBeVisible();
  });

  test('无 verifier 合约的事件决策不显示事实区，仍显示传统报告', async ({ page }) => {
    await openWorkspace(page, '联合分析', 'combo');
    const workspace = page.loc('[data-testid="workspace-combo"]');
    await workspace.getByRole('button', { name: /事件决策/ }).click();
    await expect(workspace.getByText('综合解读', { exact: false })).toBeVisible();
    await expect(workspace.getByText('结构化事实核对', { exact: true })).not.toBeVisible();
  });
});
```

Use actual Workspace labels and test IDs after reading the current components; do not invent selectors if different.

- [ ] **Step 2: 运行新 E2E，确认当前失败属于未接入 facts**

Before the Workspace implementation lands, Run:

```cmd
set PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright&& pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual test:e2e -- e2e/dashboard-semantic-facts.spec.ts --project=chromium
```

Expected: initial facts assertions fail because non-Bazi pages do not yet provide semantic facts.

- [ ] **Step 3: 在所有 Workspace 任务合并后运行 Chromium 定向回归**

Run the same command after Tasks 2–5.

Expected: PASS.

- [ ] **Step 4: 运行受影响既有页面的 Chromium 回归**

```cmd
set PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright&& pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual test:e2e -- e2e/p13v-xingxiu-user-acceptance.spec.ts e2e/p13l-taiyi-user-acceptance.spec.ts e2e/p13k-liuren-user-acceptance.spec.ts e2e/p13p-huangji-user-acceptance.spec.ts e2e/p13u-cezi-user-acceptance.spec.ts e2e/p13q-chenguz-user-acceptance.spec.ts e2e/p13f-ziwei-user-acceptance.spec.ts e2e/p13j-yunqi-user-acceptance.spec.ts e2e/p13m-qimen-user-acceptance.spec.ts e2e/p13i-liuyao-meihua-user-acceptance.spec.ts e2e/p13d-user-acceptance.spec.ts --project=chromium
```

Expected: PASS.

- [ ] **Step 5: 提交 E2E 覆盖**

```cmd
git add apps/visual/e2e/dashboard-semantic-facts.spec.ts apps/visual/e2e/p13-helpers.ts
git commit -m "test(report): 覆盖跨页面结构化事实边界"
```

Only stage `p13-helpers.ts` if it was actually modified.

---

### Task 7: 执行完整质量门并更新 roadmap 状态

**Files:**
- Modify: `ROADMAP.md` only if its existing checklist has a precise shared-semantic-model completion item that becomes fully true after all tests pass.

- [ ] **Step 1: 运行完整静态与单元质量门**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual typecheck
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual test:unit
node D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual\scripts\smoke-react-shell.mjs
node D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual\scripts\check-doc-contracts.mjs
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual build
```

Expected: all commands exit 0. Record any pre-existing Vite config warning separately; do not suppress it.

- [ ] **Step 2: 运行完整 E2E，按浏览器项目分批以避免已知 WebKit 并行瞬态问题**

Run Chromium first:

```cmd
set PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright&& pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual test:e2e -- --project=chromium
```

Then WebKit:

```cmd
set PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright&& pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual test:e2e -- --project=webkit
```

Then mobile projects:

```cmd
set PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright&& pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual test:e2e -- --project="Mobile Chrome"
set PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright&& pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual test:e2e -- --project="Mobile Safari"
```

Expected: each completed project exits 0. If WebKit reproduces the existing startup timeout, report it verbatim and separately rerun only the failed spec; do not claim suite-wide green from isolated reruns.

- [ ] **Step 3: 仅在 ROADMAP 精确条目可被验证为完成时更新状态**

Read the exact relevant `ROADMAP.md` checklist item. If all 21 Workspace browser entries are not complete (the 9 direct-draw pages remain out of scope), do **not** mark the overall Dashboard semantic boundary item complete. Instead leave ROADMAP unchanged and record that only the `FourLayerReport` rollout segment is complete.

- [ ] **Step 4: 提交最终验证与可能的 roadmap 更新**

If `ROADMAP.md` changed:

```cmd
git add ROADMAP.md
git commit -m "docs(roadmap): 记录报告语义接入进度"
```

If it did not change, do not create an empty commit.

- [ ] **Step 5: 确认提交后的工作区状态**

Run:

```cmd
git status --short
```

Expected: only the pre-existing user-owned `.gitignore` modification remains. Do not stage, revert, or include it in any commit.

---

## Plan self-review

- **Spec coverage:** Tasks 2–3 implement all first-batch same-envelope pages and the five supported combo modes. Tasks 4–5 handle all four double-calculation pages before facts. Task 3 preserves no-contract combo modes as empty facts. Task 6 provides first/second/third-batch E2E coverage. Task 7 runs all specified quality gates without claiming unsupported completion.
- **No verifier expansion:** Every listed field is a current `CalendarPresentationClaim`、`DivinationPresentationClaim`、`DailyPresentationClaim`、`ComboPresentationClaim` or `ZiweiPresentationClaim`; suggestions, predictions, patterns and free text are omitted.
- **Source integrity:** Each presentation is sourced by a successful envelope. Existing fallback display data remains presentation-only and is never sent to a fact helper.
- **Scope boundary:** The 9 direct-draw Workspaces are not changed. The plan does not use CLI Runner, `runLocalTool()`, MCP, or `parseLocalToolInput()` in Dashboard production code.
