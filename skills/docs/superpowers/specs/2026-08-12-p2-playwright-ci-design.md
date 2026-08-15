# P2 发布级 Playwright E2E GitHub Actions 设计

**日期：** 2026-08-12
**状态：** 已确认，待实施计划
**范围：** 将既有四浏览器 Playwright 用户验收纳入 GitHub Actions，作为独立于现有质量门的发布级 CI 验证。

## 背景

Dashboard 已有以真实用户入口为中心的 Playwright E2E 回归：Chromium、WebKit、Mobile Chrome 与 Mobile Safari 四个项目共同覆盖桌面与移动用户路径。`apps/visual/playwright.config.ts` 已在 CI 环境启用 `forbidOnly`、两次重试、单 worker，以及失败重试的 trace、失败截图和视频采集。

当前 `.github/workflows/ci.yml` 只运行类型检查、Vitest、Shell 与文档/映射检查以及生产构建，未执行 `pnpm test:e2e`。这使本地已验证的跨浏览器用户验收不构成 GitHub 上的合并与发布质量门。

P2 将现有测试配置接入 CI；不调整产品功能、测试场景或 Dashboard 的本地直调架构边界。

## 目标

1. 保留 `Visual quality gates` job 的当前职责和执行内容。
2. 新增独立的 Playwright E2E job，并以四项目 matrix 并行执行：`chromium`、`webkit`、`Mobile Chrome`、`Mobile Safari`。
3. 每个 matrix job 安装项目 pnpm 依赖及其对应的 Playwright 浏览器和 Linux 系统依赖。
4. 每个 matrix job 只执行其指定项目：`pnpm test:e2e --project "<project>"`。
5. 测试失败时上传 HTML 报告和 `test-results`，供 GitHub Actions 中定位失败、查看截图、trace 与视频。
6. 在 `push` 至 `main` 与全部 `pull_request` 中执行；任何一个浏览器项目失败都应使 CI 失败。

## 非目标

- 不修改 `apps/visual/playwright.config.ts`、Playwright 项目清单、超时、重试次数、worker 策略或测试用例。
- 不修改 Dashboard、CLI、本地引擎、ToolEnvelope、输入契约、claims 校验或 MCP 边界。
- 不将 Dashboard 改为调用 `parseLocalToolInput()`、`runLocalTool()` 或 CLI。
- 不合并或处理 `package-lock.json` 与 `pnpm-lock.yaml` 并存的问题。
- 不新增键盘可访问性、体质辨识、内部测试控制台或其他新的用户验收范围。
- 不修改用户已有的 `docs/superpowers/plans/2026-08-10-bazi-dynamic-layer.md`。

## 工作流设计

### 保持现有质量门

现有 `visual` job 继续在 `apps/visual` 工作目录内执行：

```text
pnpm install --no-frozen-lockfile
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

该 job 不增加 Playwright 安装或 E2E 执行，保持其快速基础质量门职责明确。

### 新增 Playwright E2E matrix job

新增一个独立 job，显示名称为 `Playwright E2E (<project>)`，运行环境为 `ubuntu-latest`，并使用与现有 `visual` job 相同的工作目录、pnpm 版本、Node 版本及 pnpm lockfile 缓存配置。

matrix 的 `project` 值必须精确匹配 `playwright.config.ts` 中的项目名：

```yaml
matrix:
  project:
    - chromium
    - webkit
    - Mobile Chrome
    - Mobile Safari
```

不设置 `fail-fast: false`：任一项目失败即可尽快中止其余尚未开始的 matrix 工作，并使整个 CI 失败。已启动的 job 仍可自行完成或失败，其上传结果可供诊断。

每个 matrix job 按以下顺序执行：

1. checkout；
2. 配置 pnpm 和 Node 20，复用 `apps/visual/pnpm-lock.yaml` 的 pnpm 缓存；
3. 运行 `pnpm install --no-frozen-lockfile`；
4. 运行 `pnpm exec playwright install --with-deps <browser>`，仅安装当前项目需要的浏览器及 Linux 依赖；
5. 运行 `pnpm test:e2e --project "<project>"`。

浏览器安装映射如下：

| Playwright 项目 | 安装浏览器 |
| --- | --- |
| `chromium` | `chromium` |
| `Mobile Chrome` | `chromium` |
| `webkit` | `webkit` |
| `Mobile Safari` | `webkit` |

移动项目只改变 Playwright device 配置，浏览器二进制与其桌面引擎一致。因此 matrix 应提供单独的 `browser` 字段，避免把项目名称直接传给 `playwright install`。

`webServer` 已在 CI 下自动执行 Vite 服务启动且不会复用外部服务；E2E job 不新增后台服务、固定等待或 `TEST_BASE_URL` 覆盖。

### 失败诊断产物

Playwright 配置的 HTML reporter 默认写入 `apps/visual/playwright-report/`，失败相关数据写入 `apps/visual/test-results/`。在 E2E 命令后新增一个条件为 `if: failure()` 的上传步骤：

- 上传 `playwright-report/`，artifact 名包含 matrix 项目名；
- 上传 `test-results/`，artifact 名包含 matrix 项目名；
- 配置 `if-no-files-found: ignore`，避免测试在报告目录产生前失败时掩盖原始失败；
- 设置有限的保留期限，建议 `retention-days: 14`，以限制失败附件的长期存储。

报告和结果仅在失败时上传。正常 CI 不产生额外 artifact 存储开销；失败时保留 Playwright 已配置的截图、trace 和视频证据。

## 执行与失败语义

- matrix 中每个 job 都执行其项目完整 E2E 范围，而非只挑选 P1.3/P1.4b 文件。
- 四个 job 合计等价于一次 `pnpm test:e2e` 的四浏览器覆盖，但让浏览器级结果独立、可并行且可诊断。
- Playwright 配置已通过 `process.env.CI` 强制单 worker、允许两次重试并禁止 `test.only`；CI workflow 不重复实现这些策略。
- `pnpm test:e2e --project "Mobile Chrome"` 和 `pnpm test:e2e --project "Mobile Safari"` 中的引号必须保留，以确保带空格项目名作为单一参数传入。
- `push` 到 `main` 与 `pull_request` 均由已有触发器覆盖；不添加 schedule、手动 dispatch 或只针对路径变更的跳过规则。

## 验证

### 工作流静态复核

1. 确认 YAML matrix 值与 `playwright.config.ts` 的四个项目名称逐字一致。
2. 确认每个项目映射到正确的 Playwright 浏览器二进制。
3. 确认 E2E job 使用 `apps/visual` 作为工作目录，命令、报告和测试结果路径均相对此目录。
4. 确认 artifact 上传仅在 `failure()` 时触发，且不会因目录缺失遮蔽测试失败。
5. 确认原有 `visual` job 的步骤未被移除或替换。

### 本地回归

在 `apps/visual` 目录，使用四个项目分别验证现有命令可独立运行：

```cmd
set "PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright" && pnpm test:e2e --project chromium --reporter=line
set "PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright" && pnpm test:e2e --project webkit --reporter=line
set "PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright" && pnpm test:e2e --project "Mobile Chrome" --reporter=line
set "PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright" && pnpm test:e2e --project "Mobile Safari" --reporter=line
```

再运行项目既有质量门：

```cmd
pnpm typecheck
pnpm test:unit
pnpm test
node scripts/check-doc-contracts.mjs
pnpm build
```

### GitHub Actions 验收

将工作流提交并推送后，观察同一 commit 的 GitHub Actions：

- `Visual quality gates` 成功；
- 四个 `Playwright E2E` matrix job 均成功；
- 若故意或偶发失败，确认对应项目的 HTML report 和 `test-results` artifact 可下载；
- 如 GitHub 入队存在短暂延迟，应按 branch/run 查询后再判断是否触发，不能将即时空列表视为未触发。

构建中已有的 Vite `__dirname` 前瞻提示及 chunk size 提示不属于 P2 范围，不应为制造绿色结果而压制或修改。

## 完成标准

- GitHub Actions 中保留现有 `Visual quality gates` job，并新增四项目 Playwright E2E matrix job。
- Chromium、WebKit、Mobile Chrome、Mobile Safari 均作为独立必经 CI 检查执行。
- 每个 job 安装恰当浏览器及依赖，并且只执行对应项目的完整 E2E 范围。
- 任一浏览器项目失败将使 CI 失败，且失败时可下载 matrix 项目对应的 HTML report 与 `test-results`。
- 本地独立项目回归和现有质量门通过，推送后的 GitHub Actions 通过。
- 未改变产品行为、Dashboard 直调引擎边界、测试覆盖范围或用户已有的动态层计划文件。
