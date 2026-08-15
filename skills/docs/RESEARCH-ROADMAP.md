# 本地直调 Skill 技术实施路线图

> 更新日期：2026-08-09。本文是 [`ROADMAP.md`](../ROADMAP.md) 的技术实施细则，不重复定义产品优先级或架构历史。

## 当前链路与实现落点

```text
SKILL.md / RULES.md
  → Agent 收集、核验必要输入
  → apps/visual/scripts/run-engine.ts
  → apps/visual/src/legacy/directRunner.ts
  → 本地 TypeScript 引擎
  → ToolEnvelope（真太阳时工具例外：TrueSolarTimeResolution）
  → apps/visual/src/legacy/claimVerification/validate*Claims(data, claims)
  → 解读、报告或用户可读说明

Dashboard 按页面直接调用纯 TypeScript 引擎，不经过 `run-engine.ts`、`parseLocalToolInput()` 或 `runLocalTool()`；这是与 CLI 并列的浏览器端入口。
```

| 责任 | 主入口 | 实施约束 |
| --- | --- | --- |
| Skill 路由与输入边界 | `SKILL.md`、`RULES.md`、`tool-index.md` | Agent 不自行计算确定性事实。 |
| CLI 调度 | `apps/visual/scripts/run-engine.ts` | 一次性 JSON 输入、JSON 输出、不维护会话状态。 |
| 工具注册 | `apps/visual/src/legacy/toolContracts.ts` | `LOCAL_TOOL_NAMES` 是 32 个 CLI 工具名的运行时单一真源；Runner 负责分发。 |
| 计算结果 | `apps/visual/src/legacy/*Engine.ts` | 返回 `ToolEnvelope` 或真太阳时校正结果。 |
| 事实校验 | `apps/visual/src/legacy/claimVerification/` | 仅接受本次 `data` 与结构化 `claims`。 |
| 可视化与报告 | `apps/visual/src/features/`、`templates/visual-report.md` | 显示能力模式、降级状态与解释边界。 |

`run-engine.ts` 通过 `pnpm engine <tool> <input-json-file>` 执行。输入来自 stdin 时同样是一次性 JSON。模型不得自行推演确定性盘面、干支、数值或规则匹配。校验器不验证自由文本、解释、建议、预测、医疗安全性或现实效果。

## 实施阶段 A：输入与公开引擎边界

### 目标

将当前 `legacy` 内的可用能力收敛为可追踪、可测试的本地公开接口。

### 工作包

1. 为工具输入建立按领域复用的 TypeScript 类型，供 CLI、Dashboard、组合工具和 fixture 使用。
2. 以 `toolContracts.ts` 的 `LOCAL_TOOL_NAMES` 为 CLI 工具名运行时单一真源，并让 `directRunner.ts` 按其输入类型分发，避免文档手写清单漂移。
3. 为每个工具维护最小成功输入、边界输入和失败输入 fixture；可从 `apps/visual/src/__tests__/` 的现有 Vitest 模式扩展。
4. 维护 `result_meta.calculationConfig` 的口径差异：八字神煞、紫微动态层、飞星/八宅与历法边界均须有 fixture。飞星、八宅和黄历已完成 P9 覆盖。

### 完成定义

- 所有公开工具均可由 Runner 使用 fixture 执行。
- 类型、输入示例、错误文案与工具注册表一致。
- 口径变动有固定 fixture，而非只依赖人工截图判断。

## 实施阶段 B：结构化事实校验

### 目标

在不扩大校验语义的前提下，补齐结构化、稳定、可重复计算的原子事实。

### 工作包

1. 已统一 `claimVerification/` 内 `validate*Claims` 的 violation 表达和跨工具拒绝模式：共享目标工具、凭证来源和三类稳定错误代码，并保持既有调用兼容。
2. 对每个 verifier 维护三组测试：正确 claims、篡改值、跨工具 claims。
3. 仅为柱、宫位、星曜、日期、枚举、数值、映射、排序等稳定字段增加 claims；不为综合结论添加伪校验。
4. 维持年度组合的窄范围原则：如 `combo_annual_fortune` 只校验 `targetYear` 与命卦 context，不校验 tone、建议或综合结论。

### 完成定义

- `valid: true` 只表示 claims 与同次结果一致。
- 校验测试能说明拒绝原因，而非仅断言布尔值。
- 用户可见文案不把通过 claims 的结果扩大成传统解释或现实效果验证。

## 实施阶段 C：真太阳时与可信输入

### 目标

保持计算边界清晰：引擎只校正已核验输入，Agent 不猜地点、历史时区或夏令时。

### 工作包

1. 固化 `resolve_true_solar_time` 的输入 fixture，包括经度、IANA 时区、UTC 偏移、夏令时与 `utcOffsetEvidence`。
2. 覆盖跨日期、时辰边界、子初边界和民用时间 fallback。
3. 维持 `timeBasis='true-solar-verified'` 必须在 `trueSolarResolution` 中传入完整、可重新计算且与出生字段一致的 `TrueSolarTimeResolution` 运行时边界；不得接受裸 `trueSolarBirth` 或简化结果。
4. 维持 `timeBasis='civil-unverified'` 必须显式 `civilFallbackConfirmed=true` 的知情降级。

### 完成定义

- 结果始终显示 `timeSource`，民用降级明确为“未完成真太阳时复核”。
- Dashboard 与 CLI 均不能绕过核验边界自行生成真太阳时。

## 实施阶段 D：报告、隐私与跨浏览器体验

### 目标

让本地结果可阅读、可导出、可回归测试，同时最小化敏感数据留存。

### 工作包

1. 将结构化事实、古籍背景、传统解释、建议和免责声明作为不同报告层维护。
2. 为静态报告版本、能力模式、脱敏输入摘要和引用 ID 建立稳定输出规则。
3. 扩展 `apps/visual/e2e/` 的隐私、响应式、导航、图表和本地能力标识测试。
4. 保留桌面 Chromium/WebKit、移动 Chrome/Safari 的完整 E2E 项目；资源紧张时以单线程按项目运行。

### 完成定义

- 历史、收藏、报告和浏览器存储不泄露完整出生日期、地点或身份信息。
- 所有工作区可在四类浏览器视口中打开、导航、生成图表并导出摘要。
- 结果的 `local-exact`、`local-approx`、民俗体验和降级状态始终可见。

## 实施阶段 E：分发、依赖与规则维护

### 目标

使本地 Skill 的安装、更新和规则变更可预测且可回归。

### 工作包

1. 将 `tool-index.md` 的 CLI 示例与各领域 `bootstrap/` 输入模板保持同步。
2. 在依赖升级时运行规则 fixture、文档契约、映射 schema 与完整浏览器 E2E。
3. 记录映射表和古籍引用 ID 的变动来源与兼容性影响。
4. 仅评估不破坏 CLI 契约的本地包拆分；不增加远程调用、账户、服务端状态或协议适配层。

### 完成定义

- 新安装环境可按文档完成工具调用和完整质量门。
- 依赖或规则变动有可审计的测试证据与变更记录。

## 验收命令

基础质量门：

```text
cd apps/visual
pnpm typecheck
pnpm test:unit
node scripts/smoke-react-shell.mjs
node scripts/check-doc-contracts.mjs
node scripts/check-knowledge-references.mjs
node scripts/check-mapping-schema.mjs
node scripts/check-react-migration.mjs
node scripts/check-search-index.mjs
pnpm build
```

涉及 Dashboard 交互、隐私、可访问性或响应式布局时：

```text
pnpm test:e2e
```

若同机多浏览器并发造成资源竞争，可保留同一测试矩阵，改为按 `chromium`、`webkit`、`Mobile Chrome`、`Mobile Safari` 项目单线程执行；不得因资源限制跳过移动端或 WebKit 覆盖。
