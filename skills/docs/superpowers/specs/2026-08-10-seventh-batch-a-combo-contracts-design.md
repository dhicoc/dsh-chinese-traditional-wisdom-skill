# 第七批 A 联合工具输入契约设计

## 目标

为 `combo_decision`、`combo_space_time`、`combo_sanshi`、`combo_sanshi_classic` 与 `combo_zeri` 建立可执行的本地输入契约、稳定 fixture 和表驱动回归。

## 范围

- 复用既有出生时间、日期、非空文本和数值校验器。
- 为五项工具增加 success、boundary、failure fixture。
- 补齐三式工具 Runner 未透传的大六壬流派与太乙参数。
- 从 `combo_space_time` 的公开输入移除未参与计算的 `facing`。
- 择日拒绝倒置或超过 400 天的日期区间，避免引擎静默截断。

## 非目标

- 不为本批工具添加 `baziTimeContext` 或 `timeSource`。它们不调用八字排盘，出生时间用于起局、命卦或生肖参考，不能误标为八字真太阳时。
- 不实现 `facing` 的方位计算。
- 不改变组合引擎对分歧、历法降级或空候选日的正常 `ok: true` 表达。

## 契约

- 决策工具：起局出生时间、非空问题和可选有限数值种子。
- 时空工具：含性别的有效出生资料和可选目标年。
- 三式工具：起局出生时间、非空问题，以及可选 `classic`、`gufa` 或 `daxquan` 流派；传统三式还接收太乙计式 `0-4` 与积年法 `0-3`。
- 择日工具：含性别的出生资料、八种用途、有效且顺序正确的起止日期、最多 400 天区间、可选目标年与 `1-50` 的 `topN`。

## 验收

- 非法结构、枚举、日期或范围在 Runner 前抛出。
- 正常引擎分歧与择日空结果仍保持成功 envelope。
- success/boundary/failure fixture 均可通过本地 CLI 与 Vitest 回归。
- 全量类型、单测、契约、烟测与构建质量门通过。
