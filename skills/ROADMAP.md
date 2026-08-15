# ROADMAP.md — 本地直调 Skill 主路线图

## 方向与不变边界

本项目的唯一运行模型是本地、一次性、可复核的 Skill 调用：

```text
Skill / Agent → Local Engine CLI → ToolEnvelope / 真太阳时校正结果 → validate*Claims(data, claims) → 解读与报告

Dashboard 是独立的浏览器端入口，按页面直接调用纯 TypeScript 引擎，不经 CLI Runner；后续 CLI 契约工作不改变该边界。
```

后续演进不改变以下边界：

- 计算、排盘、映射、评分与其他确定性事实只由本地 TypeScript 引擎生成；模型不得自行推演。
- Agent 只负责路由、补问、调用工具与分层解释，不维护计算会话状态。
- `ToolEnvelope` 是本次确定性结果的唯一事实来源；`validate*Claims(data, claims)` 只核验结构化 claims。
- 真太阳时通过 `resolve_true_solar_time` 接收已外部核验的地点与历史时区证据，并生成 `trueSolarBirth`、`trueSolarResolution`；无法核验时必须明确“未完成真太阳时复核”的民用时间 fallback。
- 项目保持离线优先、无账户、无远程服务端状态，也不新增协议适配层或 token 校验机制。

技术实施细则见 [`docs/RESEARCH-ROADMAP.md`](docs/RESEARCH-ROADMAP.md)；架构决策历史见 [`EVOLUTION.md`](EVOLUTION.md)。

## 当前完成基线

- 32 个本地工具通过 `apps/visual/scripts/run-engine.ts` 和 `src/legacy/directRunner.ts` 调用。
- 除 `resolve_true_solar_time` 返回 `TrueSolarTimeResolution` 外，CLI 核心结果统一为 `ToolEnvelope`，并标识 `local-exact`、`local-approx`、民俗体验与降级状态。
- 八字、紫微、八宅、飞星、历法、占测、日用与联合分析均有无状态 `validate*Claims(data, claims)` 校验入口；所有校验器共享 violation 契约，并统一区分值不一致、选择器不存在与跨工具凭证。
- CLI 工具表、Runner 分发、success fixture、真太阳时民用降级、P9 风水/历法口径与 6 个风水映射表已接入契约检查；Dashboard 交互与报告隐私仍由对应测试覆盖。
- CI 覆盖类型检查、单元测试、烟测、文档/数据契约和生产构建；跨浏览器 E2E 是发布前的完整验证层。

## 近期：输入与引擎契约

### 目标

让 CLI、Dashboard、测试和 Agent 使用同一份明确输入契约，减少 `legacy` 引擎之间的隐式耦合。

### 可交付项

1. 按领域整理本地引擎的稳定公开导出层，避免 Dashboard 或组合工具跨模块依赖内部实现。
2. 为 32 个工具建立共享 TypeScript 输入类型、JSON 示例与稳定错误语义，并让 `LOCAL_TOOL_NAMES` 成为工具清单单一真源。
3. 维护八字神煞、紫微动态层、风水口径与历法边界的可披露 `calculationConfig`；飞星、八宅和黄历的稳定口径已完成 P9 fixture 回归。
4. 为真太阳时跨日期、时辰边界、子初边界和无证据 fallback 建立固定夹具。

### 验收

- 每个工具均有可执行 CLI 输入示例或 fixture，并稳定输出 `ToolEnvelope` 或真太阳时校正结果。
- 工具清单、CLI 文档与 Runner 注册表自动或契约化保持一致。
- 规则口径改变会触发对应 fixture 或 `calculationConfig` 回归失败；飞星、八宅和黄历已覆盖此门。

## 中期：结构化事实与可复现呈现

### 目标

扩大可验证的确定性事实覆盖，同时不把传统解释、建议或现实效果伪装成已验证内容。

### 可交付项

1. 已统一所有 `validate*Claims(data, claims)` 的 violation 与跨工具拒绝语义：共享 `value-mismatch`、`selector-not-found`、`tool-mismatch` 错误代码，并兼容既有单领域 claim 输入。
2. 为每个校验器覆盖有效 claims、篡改 claims 和跨工具 claims 三类回归测试。
3. 让报告与 Dashboard 明确分开“结构化事实核对”“传统解释”“行动建议”“免责声明”。
4. 维护古籍条目的稳定引用 ID，使文化背景、规则出处和本次引擎结果可追溯但不混淆。

### 验收

- `valid: true` 只能表示结构化 claims 与本次 `ToolEnvelope.data` 一致。
- 任一篡改值或跨工具 claim 均由对应校验器拒绝。
- 导出报告不把自由文本、预测、医疗建议或现实效果标注为“已自动验证”。

## 中期：隐私、报告与 Dashboard 体验

### 目标

让用户看得懂结果从哪里来、何时是精确计算、何时是近似或民用降级，并保证本地数据最小化。

### 可交付项

1. 固化报告版本、输入摘要和能力模式，同时继续脱敏完整出生日期、地点和身份信息。
2. 完善运限时间轴、组合结果来源说明和本地历史的版本化策略。
3. 为关键排盘和图表提供可访问性、移动端和跨浏览器回归场景。
4. 继续让 Dashboard 显示 `local-exact`、`local-approx`、民俗体验、演示和降级状态。

### 验收

- 隐私回归测试验证历史、收藏、报告和浏览器存储不保留不必要的敏感字段。
- 桌面 Chromium/WebKit 与移动 Chrome/Safari 的 E2E 场景稳定通过。
- 用户可从任一报告或卡片辨别结构化事实、传统解释和建议的边界。

## 远期：本地分发与维护

### 目标

让 Skill 在不同 Agent CLI 中可靠安装和运行，同时保持本地一次性调用模型。

### 可交付项

1. 提供可复制的工具输入模板、故障排查指南和发布前验证命令。
2. 评估将引擎拆分为独立本地包的成本，仅在不破坏现有 CLI 契约时推进。
3. 维护依赖升级、浏览器测试运行时、映射表来源和规则版本的变更日志。

### 验收

- 新安装环境可依据 `SKILL.md`、`tool-index.md` 和输入模板执行本地工具。
- 依赖或规则升级都能通过固定夹具、文档契约和全量质量门发现兼容性变化。
- 不引入账户、远程计算、服务端会话、协议桥接或持久 token 状态。

## 质量门与非目标

每次修改引擎、运行器、校验器或用户可见架构说明后，至少运行：

```text
cd apps/visual
pnpm typecheck
pnpm test:unit
node scripts/smoke-react-shell.mjs
node scripts/check-doc-contracts.mjs
pnpm build
```

涉及 Dashboard 交互、隐私或响应式布局时，还应运行 `pnpm test:e2e`；资源受限环境可按浏览器项目单线程执行完整 E2E。

非目标：不恢复已移除的外部协议层、服务端状态、远程账户体系、模型自行排盘，或以“claims 校验”承诺传统解释、建议、预测、医疗安全或现实效果已经验证。
