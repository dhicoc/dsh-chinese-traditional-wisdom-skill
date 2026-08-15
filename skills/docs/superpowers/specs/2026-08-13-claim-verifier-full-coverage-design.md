# Claim 校验器全分支回归覆盖设计

## 目标

为所有已支持但尚未进入回归矩阵的多工具 verifier 分支补齐真实数据驱动测试。每个工具分支都必须证明：真实结构化 claim 被接受、篡改值被拒绝、其他工具来源的 claim 被拒绝。

## 范围

只修改 `apps/visual/src/__tests__/claimVerifierMatrix.test.ts`，并在必要时复用现有 `resultData()`、fixture 与 `validate*Claims()` 入口。测试通过 `runLocalTool()` 从既有 CLI fixture 取得真实 `ToolEnvelope.data`，不伪造引擎输出。

补齐的工具分支：

| Verifier | 追加覆盖工具 |
| --- | --- |
| 历法 | `xingxiu_daily` |
| 联合分析 | `combo_daily_wellness`、`combo_monthly_fortune`、`combo_marriage` |
| 日用 | `get_constitution_tendency`、`dream_interpret`、`cast_cezi`、`calc_chenguz`、`get_daily_rhythm`、`assess_constitution` |
| 占测 | `cast_meihua`、`arrange_qimen`、`liuren_calculate`、`taiyi_calculate`、`huangji_calculate` |

既有覆盖保持不变：`calc_yunqi`、`get_almanac`、`combo_annual_fortune`、`combo_zeri`、`analyze_name`、`calc_xiyong` 与 `cast_liuyao`。

## 测试策略

每个追加工具分支至少建立一个表驱动案例，包含：

1. 从 success fixture 读取结果，使用其中的稳定字段生成有效 claim，并断言 `{ valid: true, violations: [] }`。
2. 修改同一稳定字段的值，断言首个 violation 的 `code` 为 `value-mismatch`。
3. 保持 claim 结构但将 `tool` 改为同 verifier 内另一工具，断言首个 violation 的 `code` 为 `tool-mismatch`，并包含当前目标工具与来源工具。

对有稳定索引或选择器的分支，额外覆盖越界索引、缺失名称或不存在宫位，并断言 `selector-not-found`：

- 黄历/星宿与日用列表：不存在索引或条目名称；
- 择日、养生建议、婚配冲合：越界数组索引；
- 奇门、六壬、太乙、皇极：不存在位置、阶段或层级。

所有 claim 仅选择引擎已输出的确定性字段，例如日期、干支、枚举、数值、位置、宫位、主星、评分、排序或结构化映射。不得为解释文本、建议、健康效果、婚恋/事业结论或现实结果增加 claim。

## 共享契约断言

在已有跨工具案例基础上，至少增加一个共享字段形状断言，固定验证：

- 所有 violation 含 `index`、`tool`、`kind` 与 `actual`；
- 跨工具 violation 还含 `claimTool`，且 `code` 为 `tool-mismatch`；
- 缺失选择器使用 `selector-not-found`，值不一致使用 `value-mismatch`。

这不改变 `claimContract.ts` 的 `expected === undefined` 分类规则；该规则在当前联合 claim 类型下有效，因为没有 claim 将 `undefined` 作为可验证的合法值。

## 非目标

- 不改变 `claimContract.ts`、任一 verifier 的公开类型或行为。
- 不迁移 Dashboard 到 CLI Runner，不修改 Dashboard 的直接纯引擎调用边界。
- 不扩张 claim 校验到传统解释、行动建议、免责声明、自由文本、预测、医疗安全性或现实效果。
- 不新增 fixture、CLI 工具、远程服务、账户或协议适配层。

## 验收

- 每个 `CalendarPresentationKind`、`ComboPresentationTool`、`DailyPresentationTool` 与 `DivinationPresentationTool` 的受支持工具分支，均有真实 fixture 驱动的有效、篡改和跨工具回归。
- 缺失选择器的适用分支稳定返回 `selector-not-found`。
- 全量矩阵仍断言共享 violation 关键字段，不仅断言布尔值。
- `pnpm typecheck`、定向 claim Vitest、完整单元测试与既有质量门通过。
