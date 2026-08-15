# Dashboard 结构化事实接入设计

## 目标

完成共享语义模型在 Dashboard 内的真实事实核对接入。除八字外，逐页将本次计算的确定性结果字段构造成显式 claim，经对应 `validate*Claims()` 单条验证后，交给 `toUserPresentation()` 和 `SemanticReport`。页面和 HTML 导出必须展示同一批验证通过的事实。

本设计只覆盖当前已使用 `FourLayerReport` 的页面。专属直绘页面的共享浏览器内呈现留待后续批次处理。

## 不变量

- Dashboard 继续直接调用纯 TypeScript 引擎，不迁移到 `parseLocalToolInput()`、`runLocalTool()`、CLI Runner 或 MCP。
- 事实只来自当前次成功计算的同源数据，并且只在对应 verifier 对单条 claim 返回 `valid: true` 时显示。
- 不从 `export_snapshot`、摘要、页面卡片、传统解释、格局、神煞、建议、预测、医疗建议或现实效果生成事实。
- 传统解释、行动建议和免责声明继续保留，并与结构化事实核对明确分区。
- 失败、加载中、默认展示值和异常 fallback 不生成结构化事实。
- 不修改、暂存或提交用户已有的 `.gitignore` 改动。

## 页面批次

### 第一批：结果与报告同源的 envelope 页面

以下页面应以当前成功 `ToolEnvelope.data` 生成 `StructuredFactCheck[]`，随后使用 `toUserPresentation(envelope, { factChecks, disclaimers })`。每个页面选取 2 至 4 个 verifier 已支持的确定性字段。

| 页面 | 工具与 verifier | 可验证事实 |
| --- | --- | --- |
| 二十八星宿 | `xingxiu_daily` / `validateCalendarClaims()` | 值宿、值宿全称、四象、五行 |
| 太乙神数 | `taiyi_calculate` / `validateDivinationClaims()` | 日干支、局式、太乙落宫、主算 |
| 大六壬 | `liuren_calculate` / `validateDivinationClaims()` | 日干支、月将、第一课上神、初传 |
| 皇极经世 | `huangji_calculate` / `validateDivinationClaims()` | 积年、会、世卦、世爻 |
| 测字 | `cast_cezi` / `validateDailyClaims()` | 所测字、康熙笔画、数理、字形结构 |
| 称骨 | `calc_chenguz` / `validateDailyClaims()` | 总骨重、版本、年支、农历月 |
| 联合分析：年度 | `combo_annual_fortune` / `validateComboClaims()` | 目标年份、命卦卦象、命卦分组 |
| 联合分析：月度 | `combo_monthly_fortune` / `validateComboClaims()` | 年份、月份、月干支、节气 |
| 联合分析：每日养生 | `combo_daily_wellness` / `validateComboClaims()` | 日期、节气、季节、时辰 |
| 联合分析：择日 | `combo_zeri` / `validateComboClaims()` | 目的、起止日期、扫描天数、首个候选日期 |
| 联合分析：婚配 | `combo_marriage` / `validateComboClaims()` | 场景、双方日干支、双方命卦分组 |

页面级 `createXxxFactChecks(data)` 必须显式定义标签、值和 claim。每条 claim 独立调用 verifier，确保单个字段不通过时不影响其他通过项。

### 第二批：先收束双算，再接入事实

紫微斗数、五运六气、奇门遁甲和六爻当前分别计算页面盘面与报告快照。接入事实前，必须令盘面、报告与 facts 依赖同一次成功计算结果或同一个成功 envelope；不得比较或混用双算结果。

| 页面 | 工具与 verifier | 可验证事实 |
| --- | --- | --- |
| 紫微斗数 | `ziwei_chart` / `validateZiweiClaims()` | 五行局、命主、已选宫位、该宫一颗主星 |
| 五运六气 | `calc_yunqi` / `validateCalendarClaims()` | 年份、干支、岁运、司天 |
| 奇门遁甲 | `arrange_qimen` / `validateDivinationClaims()` | 阴阳遁、局数、值符、值使 |
| 六爻 | `cast_liuyao` / `validateDivinationClaims()` | 本卦、变卦（存在时）、世爻、动爻 |

异常回退盘面、默认数据和未成功的 envelope 必须保留现有展示行为，但 `factChecks` 为 `[]`。

### 第三批：无 claim 合约的联合分析模式

下列模式当前没有受支持的 `ComboPresentationTool` 与 claim 类型：事件决策、时空布局、三式合参、三式经典合参。

这些模式继续使用已有 `FourLayerReport` 的传统解释、行动建议与免责声明，但不产生 `facts`。本轮不扩张 `comboClaimVerifier.ts` 的公开合约。

## 数据流

每个已接入页面遵守以下数据流：

```text
纯 TypeScript 引擎 → 成功 ToolEnvelope.data → 显式页面 claim
→ 每条 validate*Claims(data, [claim]) → StructuredFactCheck[]
→ toUserPresentation(envelope, { factChecks, disclaimers })
→ FourLayerReport / ExportReportButton
```

`toUserPresentation()` 是页面与导出的共同语义来源。页面应传入 `presentation.report`、`presentation.semanticReport`、`presentation.notices` 与 `presentation.warnings`；导出应使用同一 `presentation` 派生的 export presentation。

## 实现结构

- 各 Workspace 在文件内定义小型 `createXxxFactChecks(data)` 函数，遵循现有 `createBaziFactChecks()` 样式。
- 不引入按路径动态读取并自动制造事实的通用 helper，避免页面展示字段被无意提升为事实。
- 在联合分析 Workspace 内，先按当前 `comboType` 收窄 `data` 的宽联合类型，再生成相关模式的 facts。
- 异步页面仅在当前请求仍有效、envelope 成功且 data 存在时更新 presentation；旧请求与取消请求不得覆盖新的语义结果。
- 原有专属盘面、图表和解释布局保持不变；本轮只替换报告与导出使用的数据源。

## 测试

### 单元测试

- 各页面的事实映射使用真实或最小确定性结果 fixture 验证。
- 正确数据生成预期 facts。
- 篡改单一字段时，只有对应 facts 被排除。
- 传统解释文本、建议与不在 verifier claim 白名单内的字段不进入 facts。
- 无 claim 合约的联合分析模式产生空 facts。

### 组件和端到端测试

- 有验证 facts 的报告显示“结构化事实核对”。
- 事实为空时不显示该区，但继续显示“传统解释”与免责声明。
- 导出内容与页面呈现使用同一 facts 集合。
- 增加跨 Workspace E2E：至少覆盖一个第一批页面、一个第二批页面和一个第三批空 facts 模式。

## 验收条件

- 第一批所有页面均将至少 2 个 verifier 支持的、当前计算同源的确定性字段呈现为 verified facts。
- 第二批页面完成同源收束后，才开始产生 verified facts；失败或 fallback 结果不产生 facts。
- 第三批联合模式保持 facts 为空，且不会因共享展示默认逻辑生成伪事实。
- 任意页面的传统解释、建议、免责声明均不被标记为结构化事实。
- `pnpm typecheck`、相关 Vitest、完整单元测试、构建、文档契约检查和适用的 Playwright 回归按项目既定质量门执行。
