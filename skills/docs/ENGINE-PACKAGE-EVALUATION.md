# 本地引擎独立包拆分评估

- **评估日期**：2026-08-14
- **范围**：仅评估将确定性引擎拆为独立本地包的成本与兼容性；本次不移动源码、不发布包、不改变现有入口。
- **依据**：`ROADMAP.md` 的“远期：本地分发与维护”仅授权评估，且要求不破坏既有 CLI 契约。

## 当前兼容性边界

| 边界 | 当前实现 | 拆分时必须保持 |
| --- | --- | --- |
| CLI | `apps/visual/scripts/run-engine.ts` 读取一次性 JSON，并调用 `legacy/directRunner.ts` | `pnpm engine <tool> <input-json-file>`、stdin 行为和稳定错误 JSON 不变。 |
| 工具清单 | `LOCAL_TOOL_REGISTRY` / `LOCAL_TOOL_NAMES` 是 32 个 CLI 工具的运行时单一来源 | 工具名、输入白名单、success/boundary/failure fixture 和 `tool-index.md` 对账不变。 |
| 结果 | 普通工具返回 `ToolEnvelope`；真太阳时例外返回 `TrueSolarTimeResolution` | JSON 结构、错误语义、`result_meta.calculationConfig` 与真太阳时可信输入边界不变。 |
| Dashboard | 工作区通过 `engine-api/` 直接调用纯 TypeScript 函数，不经过 CLI Runner | 浏览器端不得导入 Node API、不得调用 `runLocalTool()` 或 `parseLocalToolInput()`。 |
| 发布 | `apps/visual` 使用 pnpm 锁定依赖，CI 覆盖质量门和四浏览器 E2E | 本地安装、冻结锁文件、构建与四浏览器矩阵必须继续可复现。 |

## 候选拆分边界

1. **确定性计算核心**：`legacy/*Engine.ts`、纯规则表、历法适配与 `ToolEnvelope` 类型可作为未来候选核心。
2. **CLI 适配层**：`toolContracts.ts`、`directRunner.ts`、`localToolErrors.ts` 与 `run-engine.ts` 应保留为本仓库的 CLI 边界；它们包含输入脱敏、可信时间检查和稳定错误语义。
3. **Dashboard 适配层**：现有 `engine-api/` 应继续作为浏览器端公共入口。它当前是 thin re-export 边界，并由 `engineApi.test.ts` 以函数引用相同性防止行为漂移。
4. **不应拆入计算包的内容**：报告渲染、历史存储、搜索、知识阅读、命令面板、浏览器测试和用户界面状态。

## 成本与风险

- 现有 `engine-api/` 仍指向 `legacy/` 纯函数；若立即拆出核心包，需要同时迁移所有 re-export、路径别名、构建解析和类型导出。
- Dashboard 工作区不仅调用公开引擎，还直接使用报告、校验、展示类型、知识数据和存储能力。实际拆分将触及跨层导入，而不只是移动计算文件。
- 32 个工具的 CLI 分发、输入白名单和 fixture 矩阵与 `runLocalTool()` 紧密耦合。任何包边界错误都可能使 CLI、文档与 Dashboard 得到不同的计算或错误结果。
- 独立包还会新增版本策略、发布流程、依赖升级协调、双入口构建和跨包测试的持续维护成本；当前不存在需要被独立消费的第二个本地应用或已确认的分发需求。

## 结论：暂不拆分

当前不进入实际包拆分。现有 `engine-api/` 已提供浏览器端公共边界，CLI 的 `pnpm engine` / `ToolEnvelope` 契约及 Dashboard 直调边界均被测试和 CI 覆盖；在没有第二个受支持消费者或明确独立发布需求前，拆包只会增加跨层迁移与版本维护风险，未带来可验证收益。

## 重新评估的前置条件

仅在以下任一条件满足时重新评估：

1. 有第二个本地应用或 CLI 需要消费同一确定性引擎；
2. 已确认独立包的本地发布、版本和依赖维护责任人；
3. 可以先建立无行为差异的核心入口，并证明 32 个工具 fixture、CLI 错误、`ToolEnvelope`、真太阳时输入、Dashboard 构建和四浏览器 E2E 全部保持兼容。

届时应先提交独立的迁移设计，明确包名、导出表、版本策略、Node/浏览器双入口和回滚方案；在设计获批前不得改变现有目录或 CLI 契约。

## 回归证据

- `src/__tests__/engineApi.test.ts`：公共 `engine-api/` 导出与既有纯函数保持同一引用。
- `src/__tests__/directRunner.test.ts`、`localToolFixtures.test.ts`、`localToolMatrix.ts`：CLI 输入、32 工具分发、fixture 与脱敏边界。
- `src/__tests__/modules.test.ts`：Dashboard 不调用 CLI Runner 或 CLI 输入解析。
- `scripts/check-doc-contracts.mjs`：工具表、fixture、Runner、发布约束和本评估文档的持续检查。
- `.github/workflows/ci.yml`：冻结安装、质量门与 Chromium、WebKit、Mobile Chrome、Mobile Safari E2E 矩阵。
