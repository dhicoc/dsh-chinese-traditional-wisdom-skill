# 五运六气太一天符经文口径 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将五运六气模块的用户可见“太乙天符”迁移为《黄帝内经·素问》CTP 通行文本所据的“太一天符”，以“天符与岁会同时成立”为判据，并补充可审计的经文例证与回归测试。

**Architecture:** 现有纯计算字段 `taiyiTianfu` 已与目标内部拼写一致，保留该字段，不制造无意义的重命名或兼容别名。`yunqiEngine.ts` 以《六微旨大论》“天符岁会……太一天符之会也”说明既有 `tianfu && suihui` 判据；《六元正纪大论》中可明确连写的己丑、己未、戊午仅作回归例证，不构成额外枚举算法。图表、工作区术语与导出报告统一呈现“太一天符”，不暴露内部字段、文件名或实现细节。

**Tech Stack:** TypeScript、React、Vite、Vitest、React Testing Library、pnpm。

---

## 经文边界与判定约束

- 规范底本：CTP《黄帝内经·素问》运气七篇通行文本。
- 定义依据：CTP《六微旨大论》：`天符岁会何如。岐伯曰：太一天符之会也。`
- 计算判据：`taiyiTianfu = tianfu && suihui`。该表达对应上述“天符岁会”定义，不能标称为由年例表反推。
- 可明确的回归例证：CTP《六元正纪大论》中的 `己丑太一天符`、`己未太一天符`、`戊午太一天符`。
- 不能转为单年枚举的歧义句：`乙卯天符，乙酉岁会，太一天符`。可作为出处背景，但不得推断“太一天符”单独对应乙卯或乙酉。
- 名称边界：用户可见文本一律使用“太一天符”；当前内部字段 `taiyiTianfu` 保持不变；删除“太乙天符”。
- 安全边界：继续表述为传统文化与气候病机理论学习参考，不构成医学诊断或治疗建议；不得添加“贵人”、疾病预断、现实预测或贵贱断语。

## 文件结构

### 修改

- `apps/visual/src/legacy/yunqiEngine.ts`
  - 保持 `taiyiTianfu: tianfu && suihui` 的计算关系。
  - 将格局序列与导出报告的旧名称替换为“太一天符”。
  - 在导出格局章节补入克制的《素问·六微旨大论》定义说明。
- `apps/visual/src/components/shared/YunqiChart.tsx`
  - 将图表格局标签从“太乙天符”迁移为“太一天符”。
- `apps/visual/src/features/yunqi/YunqiWorkspace.tsx`
  - 将术语面板列表从“太乙天符”迁移为“太一天符”。
- `apps/visual/src/__tests__/yunqiEngine.test.ts`
  - 增加经文定义、己丑/己未/戊午例证、相邻反例及导出文案回归。
- `apps/visual/src/__tests__/yunqi-workspace.test.tsx`
  - 验证图表显示新名称且不显示旧名称。

### 只读参考

- `apps/visual/src/legacy/baseTypes.ts`：`taiyiTianfu` 类型已存在，确认不需修改。
- `apps/visual/src/legacy/reportLayers.ts`：确认“运气格局”仍作为用户报告 details 输出。
- `apps/visual/src/__tests__/reportLayers.test.ts`：既有五运六气报告分层回归。
- CTP《六微旨大论》：`https://ctext.org/huangdi-neijing/liu-wei-zhi-da-lun`
- CTP《六元正纪大论》：`https://ctext.org/huangdi-neijing/liu-yuan-zheng-ji-da-lun`

## Task 1: 固定经文判据和可明确年例

**Files:**
- Modify: `apps/visual/src/__tests__/yunqiEngine.test.ts:75-83`
- Modify: `apps/visual/src/legacy/yunqiEngine.ts:56-65`

- [ ] **Step 1: 写入失败的经文判据与名称迁移测试**

替换现有“太乙天符”测试，使用现有内部字段 `taiyiTianfu`，只断言用户名称不再出现在报告测试中：

```ts
it('按《素问·六微旨大论》以天符与岁会同成立判定太一天符', () => {
  const taiyiTianfu = calculateYunqi({ year: 1978, targetDate: '1978-06-15' });
  const nearbyYear = calculateYunqi({ year: 1980, targetDate: '1980-06-15' });

  expect(taiyiTianfu.patterns.tianfu).toBe(true);
  expect(taiyiTianfu.patterns.suihui).toBe(true);
  expect(taiyiTianfu.patterns.taiyiTianfu).toBe(true);
  expect(nearbyYear.patterns.taiyiTianfu).toBe(
    nearbyYear.patterns.tianfu && nearbyYear.patterns.suihui,
  );
});
```

- [ ] **Step 2: 写入《六元正纪大论》可明确连写年例的失败测试**

在同一 `describe('calculateYunqi 纯 TS 计算', ...)` 中追加。六月查询日期避免大寒前跨入前一运气年。

```ts
it.each([
  [1949, '己丑'],
  [1979, '己未'],
  [1978, '戊午'],
])('将《六元正纪大论》列明的%s年标为太一天符', (year, ganZhi) => {
  const result = calculateYunqi({ year, targetDate: `${year}-06-15` });

  expect(`${result.tiangan}${result.dizhi}`).toBe(ganZhi);
  expect(result.patterns.tianfu).toBe(true);
  expect(result.patterns.suihui).toBe(true);
  expect(result.patterns.taiyiTianfu).toBe(true);
});
```

- [ ] **Step 3: 运行定向测试，确认旧的测试名称和文案仍使迁移不完整**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/yunqiEngine.test.ts
```

Expected: FAIL，现有测试标题或后续报告断言仍引用“太乙天符”；新年例计算本身应已通过，因为现有 `taiyiTianfu` 判据相同。

- [ ] **Step 4: 使判据在代码中以经文语义清晰表达**

在 `getPatterns()` 保留并整理以下局部变量与返回字段，不新增年例表：

```ts
const tianfu = dayun === sitianElement;
const suihui = dayun === DIZHI_WUXING[dizhi];

return {
  tianfu,
  suihui,
  taiyiTianfu: tianfu && suihui,
  tongTianfu: taiShao === '太' && dayun === zaiquanElement,
  tongSuihui: taiShao === '少' && dayun === zaiquanElement,
  pingqi: (taiShao === '太' && cycleNext(sitianElement, 2) === dayun)
    || (taiShao === '少' && (sitianElement === dayun || cycleNext(sitianElement, 1) === dayun)),
  qihua: taiShao === '太' ? cycleNext(dayun, 4) : null,
  jianhua: taiShao === '少' ? cycleNext(dayun, 4) : null,
  zhengdui: zhengdui[dizhi],
};
```

不修改 `YunqiPatterns` 类型或 `baseTypes.ts`，因为内部字段已为 `taiyiTianfu`。

- [ ] **Step 5: 运行定向测试，确认判据和年例通过**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/yunqiEngine.test.ts
```

Expected: PASS，输出包含三个经文明示年例。

- [ ] **Step 6: 审阅本任务的差异；不提交**

Run:

```cmd
git diff -- apps/visual/src/legacy/yunqiEngine.ts apps/visual/src/__tests__/yunqiEngine.test.ts
```

Expected: 仅包含经文判据测试、明确年例和用户名称迁移的相关改动。本仓库有用户已有未提交工作，未经单独要求不得暂存、提交或推送。

## Task 2: 用“太一天符”和克制出处更新导出报告

**Files:**
- Modify: `apps/visual/src/__tests__/yunqiEngine.test.ts:101-116`
- Modify: `apps/visual/src/legacy/yunqiEngine.ts:98-109`

- [ ] **Step 1: 写入失败的导出报告测试**

在 `describe('calcYunqiEnveloped envelope 适配', ...)` 添加：

```ts
it('以太一天符名称和经文定义导出传统运气格局', () => {
  const envelope = calcYunqiEnveloped({ year: 1978, targetDate: '1978-06-15' });
  const patternSection = envelope.data.export_snapshot.sections.find(
    (section) => section.heading === '运气格局',
  );

  expect(patternSection?.body).toContain('太一天符');
  expect(patternSection?.body).toContain('《素问·六微旨大论》');
  expect(patternSection?.body).toContain('天符岁会');
  expect(patternSection?.body).not.toContain('太乙天符');
  expect(patternSection?.body).not.toContain('贵人');
});
```

- [ ] **Step 2: 运行定向测试，确认报告仍使用旧名称而失败**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/yunqiEngine.test.ts
```

Expected: FAIL，报告正文仍包含“太乙天符”且没有《素问·六微旨大论》出处。

- [ ] **Step 3: 迁移格局序列和导出章节文案**

在 `describePatterns()` 将旧数组项替换为：

```ts
patterns.taiyiTianfu && '太一天符',
```

在 `calcYunqiEnveloped()` 的 `运气格局` section 使用：

```ts
{
  heading: '运气格局',
  body: `传统运气格局：${describePatterns(result.patterns)}。太一天符据《素问·六微旨大论》“天符岁会……太一天符之会也”标识天符与岁会同时成立；仅作传统文化与气候病机理论学习参考。`,
},
```

不得加入“贵人”、疾病预断、现实结论、内部字段名、文件名或实现细节。

- [ ] **Step 4: 运行定向测试，确认导出报告通过**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/yunqiEngine.test.ts
```

Expected: PASS。

- [ ] **Step 5: 审阅本任务的差异；不提交**

Run:

```cmd
git diff -- apps/visual/src/legacy/yunqiEngine.ts apps/visual/src/__tests__/yunqiEngine.test.ts
```

Expected: 报告只新增经文定义和学习参考限制，不改变其他报告章节。

## Task 3: 迁移图表和工作区术语入口

**Files:**
- Modify: `apps/visual/src/__tests__/yunqi-workspace.test.tsx:1-20`
- Modify: `apps/visual/src/components/shared/YunqiChart.tsx:27-40`
- Modify: `apps/visual/src/features/yunqi/YunqiWorkspace.tsx:127`

- [ ] **Step 1: 写入图表用户名称迁移失败测试**

在 `yunqi-workspace.test.tsx` 新增必要 import 与独立测试：

```tsx
import { YunqiChart } from '@/components/shared/YunqiChart';
import { calculateYunqi } from '@/legacy/yunqiEngine';

it('图表使用太一天符且不显示旧名称', () => {
  const data = {
    ...calculateYunqi({ year: 1978, targetDate: '1978-06-15' }),
    export_snapshot: { summary: '', sections: [] },
  };

  render(<YunqiChart data={data} />);

  expect(screen.getByText('太一天符')).toBeInTheDocument();
  expect(screen.queryByText('太乙天符')).not.toBeInTheDocument();
});
```

不要依赖 `YunqiWorkspace` 默认当天日期命中太一天符。

- [ ] **Step 2: 运行工作区测试，确认图表仍显示旧名称而失败**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/yunqi-workspace.test.tsx
```

Expected: FAIL，断言显示图表仍渲染“太乙天符”。

- [ ] **Step 3: 迁移图表标签**

在 `displayPatterns()` 将：

```ts
patterns.taiyiTianfu && '太乙天符',
```

替换为：

```ts
patterns.taiyiTianfu && '太一天符',
```

保持其余格局顺序不变。

- [ ] **Step 4: 迁移工作区术语入口**

在 `YunqiWorkspace.tsx` 的 `TermExplanationPanel` `terms` 数组中，将：

```ts
'太乙天符',
```

替换为：

```ts
'太一天符',
```

不新增独立释义词条，除非既有 `TermExplanationPanel` 中存在同一术语词典且能提供已收录的经文依据；避免编造释义。

- [ ] **Step 5: 运行图表、引擎和报告相关回归**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec vitest run src/__tests__/yunqi-workspace.test.tsx src/__tests__/yunqiEngine.test.ts src/__tests__/reportLayers.test.ts
```

Expected: PASS。

## Task 4: 全量旧名审计与项目验证

**Files:**
- Modify only if required by search results: `apps/visual/src/**/*.ts`, `apps/visual/src/**/*.tsx`, `apps/visual/src/**/*.md`
- Test: `apps/visual/src/__tests__/yunqiEngine.test.ts`
- Test: `apps/visual/src/__tests__/yunqi-workspace.test.tsx`
- Test: `apps/visual/src/__tests__/reportLayers.test.ts`

- [ ] **Step 1: 搜索旧用户名称**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec rg "太乙天符" src
```

Expected: exit code 1，且没有匹配输出。若存在结果，只修改五运六气相关的用户文本或测试，不能改动独立的太乙数模块。

- [ ] **Step 2: 搜索内部字段与新用户名称**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual exec rg "taiyiTianfu|太一天符" src
```

Expected: 内部字段出现于类型、引擎、图表和测试；用户可见文本只出现“太一天符”，不出现 `taiyiTianfu`。

- [ ] **Step 3: 运行完整单元测试**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual test:unit
```

Expected: 全部通过，至少 `Test Files 56 passed (56)` 与 `Tests 671 passed (671)`；新增测试后总数可以增加。

- [ ] **Step 4: 运行类型检查和生产构建**

Run:

```cmd
pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual typecheck && pnpm --dir D:\HuaweiMoveData\Users\DELL\Desktop\claude\chinese-traditional-wisdom-skill\apps\visual build
```

Expected: exit code 0。若继续出现 Vite `__dirname` native config loader 或 chunk size 提示，记录为既有非阻塞警告，不为本任务改构建配置。

- [ ] **Step 5: 审阅最终差异与工作区状态；不提交、不推送**

Run:

```cmd
git diff --check && git diff -- apps/visual/src/legacy/yunqiEngine.ts apps/visual/src/components/shared/YunqiChart.tsx apps/visual/src/features/yunqi/YunqiWorkspace.tsx apps/visual/src/__tests__/yunqiEngine.test.ts apps/visual/src/__tests__/yunqi-workspace.test.tsx && git status --short
```

Expected: 无空白错误；仅报告本轮文件和用户既有未提交改动。不得清理、覆盖、暂存、提交或推送。

## Plan self-review

- **覆盖性：** Task 1 固定《六微旨大论》判据与《六元正纪大论》可明确年例；Task 2 覆盖导出报告的经文依据与安全文字；Task 3 覆盖图表及术语入口；Task 4 覆盖旧名清除、全量回归、类型与构建验证。
- **歧义控制：** 只将己丑、己未、戊午作为可明确连写年例；不把“乙卯天符，乙酉岁会，太一天符”转成硬编码枚举。
- **类型一致性：** 内部统一保留既有 `taiyiTianfu`；用户可见统一为“太一天符”。
- **范围控制：** 不改独立的太乙数模块 `taiyiEngine.ts`；不添加疾病、预后、贵贱或现实预测内容；不暴露内部字段与实现来源。
