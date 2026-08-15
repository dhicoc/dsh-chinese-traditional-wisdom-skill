# 发布前验证与故障排查

本指南面向维护者与本地安装环境，说明发布或合并前如何验证 CLI、Dashboard 与公开文档的一致性。它不改变既有架构：Dashboard 直接调用纯 TypeScript 引擎；CLI / Skill / Agent 通过本地 Engine/CLI 取得 `ToolEnvelope`，并在呈现确定性事实前完成本地 claims 校验。

> 传统文化参考，非绝对预测。不得以模型记忆代替本次本地引擎结果，也不得将完整生辰、精确地点或可识别身份写入 fixture、日志或提交记录。

## 1. 安装与最小可运行检查

在仓库根目录进入可视化应用。项目固定使用 Node `24.12.x`、pnpm `10.26.1` 与 `pnpm-lock.yaml`；请先启用匹配的 Corepack/pnpm，再以冻结模式安装，避免安装过程重解依赖：

```bash
cd apps/visual
pnpm install --frozen-lockfile
```

`package-lock.json` 不是本项目的锁文件，不应重新生成或提交。根目录的 `requirements.txt` 仅供维护遗留 Python 辅助脚本时离线交叉校验；它不属于 Dashboard 或 CLI 的发布必需依赖。

用标准 fixture 验证本地 CLI 可读取 stdin、调用引擎并输出 JSON：

```bash
pnpm engine bazi_calculate - < src/__fixtures__/local-tools/bazi_calculate.success.json
```

除 `resolve_true_solar_time` 外，成功结果必须是本次计算的 `ToolEnvelope`。`resolve_true_solar_time` 直接输出 `TrueSolarTimeResolution`；其 `trueSolarBirth` 与 `trueSolarResolution` 只能用于已核验地点、IANA 时区、UTC 偏移、夏令时及 `utcOffsetEvidence` 的真太阳时路径。

```bash
pnpm engine resolve_true_solar_time src/__fixtures__/local-tools/resolve_true_solar_time.success.json
```

如果不能可靠核验时间资料，只能使用已确认的民用时间 fallback，并在结果中保留“未完成真太阳时复核”。不要把该结果描述为真太阳时结果。

## 2. 发布前质量门

每项命令均在 `apps/visual` 中执行。先完成本地快速门，再运行完整浏览器回归：

```bash
pnpm typecheck
pnpm test:unit
node scripts/smoke-react-shell.mjs
node scripts/check-doc-contracts.mjs
node scripts/check-knowledge-references.mjs
node scripts/check-mapping-schema.mjs
node scripts/check-react-migration.mjs
node scripts/check-search-index.mjs
pnpm build
pnpm test:e2e
```

- `pnpm typecheck`：检查 TypeScript 项目引用与类型。
- `pnpm test:unit`：运行 Vitest 引擎、契约与回归测试。
- `node scripts/smoke-react-shell.mjs`：运行 React Shell smoke 检查。
- `node scripts/check-doc-contracts.mjs`：核对 32 个 CLI 工具、`LOCAL_TOOL_NAMES`、success fixture、Runner、分发约束与公开文档契约。
- `node scripts/check-knowledge-references.mjs`：核对知识引用 ID 与引用边界。
- `node scripts/check-mapping-schema.mjs`：核对风水映射表的来源、版本、结构与覆盖范围。
- `node scripts/check-react-migration.mjs`：核对浏览器端没有绕过公开引擎边界。
- `node scripts/check-search-index.mjs`：核对知识搜索索引与源文件一致。
- `pnpm build`：执行 TypeScript 构建、Vite 打包与验证页生成。
- `pnpm test:e2e`：启动本地 Vite 服务，并验证 Chromium、WebKit、Mobile Chrome 与 Mobile Safari。

只改文档时，至少运行文档契约检查与 `git diff --check`。改动引擎、输入契约、计算结果、Dashboard 或端到端交互时，必须运行上述完整质量门。

## 3. Playwright 浏览器与四浏览器回归

首次运行或浏览器缓存缺失时，先安装 Playwright 所需浏览器：

```bash
pnpm exec playwright install
```

若环境将浏览器缓存放在自定义路径，安装与测试必须使用同一路径。例如 Windows 本地缓存可设置为：

```bash
set PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright
pnpm exec playwright install
pnpm test:e2e
```

可按项目定位失败，但发布前仍应运行全部项目：

```bash
pnpm exec playwright test --project=chromium
pnpm exec playwright test --project=webkit
pnpm exec playwright test --project="Mobile Chrome"
pnpm exec playwright test --project="Mobile Safari"
```

CI 中会对四个项目分别执行。CI 启用 `forbidOnly`、两次重试与单 worker；失败重试会保留 trace、截图和视频。不要因为单一浏览器失败而将测试跳过、降低断言或关闭重试产物。

## 4. 失败产物定位

本地 Playwright 失败后，先阅读终端输出给出的测试名和产物路径，再打开：

- `apps/visual/playwright-report/`：HTML 报告。
- `apps/visual/test-results/`：失败测试对应的 trace、screenshot、video。

可用下列命令查看某个 trace：

```bash
pnpm exec playwright show-trace <trace.zip>
```

远程 CI 失败时，下载对应浏览器 job 上传的 HTML report 与 `test-results` artifact；先以失败浏览器的 trace 确认页面状态、定位器与网络/控制台信息，再决定是否修改测试或实现。不要仅凭 Chromium 结果推断 WebKit 或移动端行为。

## 5. 常见故障排查

### CLI 无法运行或 fixture 失败

1. 确认当前目录是 `apps/visual`，且已在 Node `24.12.x`、pnpm `10.26.1` 下执行 `pnpm install --frozen-lockfile`。
2. 使用 `tool-index.md` 中对应工具的 `.success.json` fixture 重现；不要用包含真实个人资料的输入提交问题。
3. 确认工具名位于 `LOCAL_TOOL_NAMES`，且 fixture 与 `tool-index.md` 的表格行一致。
4. 区分输出类型：普通工具读取 `ToolEnvelope.data`；`resolve_true_solar_time` 读取 `TrueSolarTimeResolution`，不应访问 `ToolEnvelope.data`。
5. 对八字指定日期场景，使用严格格式 `transitDate: "YYYY-MM-DD"`，并从 `ToolEnvelope.data.transit` 读取动态层；若小运为 `local-fallback`，必须披露该降级来源。

### 文档契约检查失败

`check-doc-contracts.mjs` 的错误信息会指出缺失文件、失配工具名或缺少的关键文本。优先按错误修正来源，而不是手工修改生成结果：

- 新增或删除 CLI 工具时，同步 `LOCAL_TOOL_NAMES`、`directRunner.ts` 分发、success fixture、`tool-index.md` 与相关文档。
- 调整真太阳时、动态层或计算口径时，保留 `ToolEnvelope`、`local-exact`、`local-approx`、`trueSolarBirth`、`trueSolarResolution` 和“未完成真太阳时复核”等公开边界。
- 文档不得引入已移除的 MCP、JSON-RPC 或旧依赖表述。

### 真太阳时或日期边界不符合预期

先复现 `resolve_true_solar_time` 的 success、boundary 与 failure fixture，再检查经度、IANA 时区、UTC 偏移、夏令时证据和 `utcOffsetEvidence`。跨日期、跨时辰或子初边界都必须由当前 `TrueSolarTimeResolution` 的结构化结果决定；缺乏可靠外部证据时回到民用时间 fallback，并清楚披露限制。

### 浏览器测试超时或只在 WebKit / 移动端失败

先通过 HTML report 和 trace 判断是实现回归、定位器歧义还是动画/尺寸稳定性问题：

- Dashboard 同时保留桌面与移动 DOM 时，测试定位器必须限定可见元素，避免严格模式命中双份控件。
- 响应式 SVG 在 WebKit resize 后可能暂时没有尺寸；使用轮询等待实际尺寸，而非固定 sleep。
- 对视觉装饰动画可在测试中使用 reduced motion；不要移除产品逻辑来迁就测试。
- 每个浏览器项目独立复现，避免连续批量导航将一次动画状态泄漏到下一断言。

### 构建出现 Vite 提示

现有 Vite `__dirname` 前瞻提示和 chunk-size warning 属于已知提示，不是通过删除检查、压制 warning 或修改构建阈值来“修复”的对象。只有在本次变更实际引入新的构建错误、包体异常增长或运行时问题时，才针对根因处理。

## 6. 停止条件与升级

同一操作连续失败两次，遵守 [RULES.md](../RULES.md) 的 Fail-Two 原则：停止盲目重试，保留失败命令、最小脱敏输入、终端输出和测试产物，重新检查依赖、输入契约及 `tool-index.md` 的备用说明。

当本地引擎无法产生可复核计算结果时，如实说明“当前本地引擎无法产生可复核计算结果”。不得用模型自行推演确定性事实补足输出。对健康、法律、财务或高风险现实决策，继续遵守项目既有的专业转介与免责声明边界。
