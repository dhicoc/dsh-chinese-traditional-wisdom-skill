# P1.4b 全局 Shell 用户侧 E2E 验收设计

**日期：** 2026-08-12
**状态：** 已确认，待实施计划
**范围：** 为 Dashboard 全局 Shell、新用户出生资料入口、命令面板导航闭环与响应式布局增加四浏览器真实用户验收。

## 背景

P1.3 已覆盖各传统文化工作区的真实使用路径，P1.4a 已把跨模块的命令面板导航、可见出生输入与横向溢出检查收敛到 `p13-helpers.ts`。但现有 `smoke.spec.ts` 仍只验证 Shell 元素可见、基础响应式结构和无控制台错误；它没有覆盖用户在全局出生资料面板完成修改和重置、通过命令面板真正抵达工作区，或在桌面和移动入口中验证整个 Shell 的无横向溢出。

P1.4b 补足这个 Shell 层的用户验收空白。它只验证用户可见入口和本地结果变化，不改变 Dashboard 直接调用纯 TypeScript 引擎的架构边界。

## 目标

1. 将基础冒烟与真实 Shell 用户验收分离，新增独立的 `p14b-shell-user-acceptance.spec.ts`。
2. 验证桌面用户能看到“玄枢”品牌、侧栏中的全局生辰面板，并通过该面板提交出生年份、观察摘要和首页命盘刷新、确认重置后恢复默认资料。
3. 验证用户通过命令面板搜索并选择“八字命盘”后真正抵达目标工作区。
4. 验证移动用户能访问主内容区的全局生辰面板，且桌面与移动 Shell 都没有横向溢出。
5. 复用 P1.4a 的 `BASE_URL`、`openWorkspace()`、`visibleBirthInput()` 与 `expectNoHorizontalOverflow()`，不创建重复 helper。
6. 在 Chromium、WebKit、Mobile Chrome、Mobile Safari 四个 Playwright 项目中执行验收。

## 非目标

- 不修改 Dashboard 产品代码、`BirthPanel`、模块注册表、引擎调用或 `playwright.config.ts`。
- 不迁移 Dashboard 到 `parseLocalToolInput()`、`runLocalTool()`、CLI 或 MCP。
- 不测试 `tizhi` / 体质辨识，也不把内部测试控制台纳入用户验收。
- 不重复 `interactions.spec.ts` 已覆盖的命令面板打开、`Ctrl+K`、关键词过滤或 `Escape` 关闭等低层交互。
- 不替代 P1.3 中对模块结果、传统文化边界、隐私或专属入口的验收。
- 不修改用户已有的 `docs/superpowers/plans/2026-08-10-bazi-dynamic-layer.md`。

## 测试组织

创建 `apps/visual/e2e/p14b-shell-user-acceptance.spec.ts`。该文件是 Shell 级真实用户场景，不加入 `smoke.spec.ts`：

- `smoke.spec.ts` 继续承担应用启动、可见元素和基础结构的快速健康检查。
- `p14b-shell-user-acceptance.spec.ts` 承担完整用户路径、数据提交、原生确认重置、导航结果与布局边界。

测试只依赖 `@playwright/test` 与 `./p13-helpers`，不导入产品运行时代码或绕过 UI 直接更改状态。

## 场景设计

### 1. 桌面：出生资料提交、首页结果刷新与重置

在桌面视口 `1440×900` 中：

1. 打开 `BASE_URL`，等待 `[data-testid="app-shell"]` 可见。
2. 确认标题“玄枢”、`[data-testid="sidebar-nav"]` 和可见的全局出生年输入存在。
3. 记录首页 `[data-testid="home-bazi-plate"]` 的初始文本，以及可见出生年输入的初始值 `1990`。
4. 使用 `visibleBirthInput(page, 'year')` 填入 `1991`，再 `press('Tab')`，以验证 `BirthPanel` 仅在离焦时提交 draft 的真实语义。
5. 断言输入值和“全局生辰”摘要包含 `1991-06-15`；等待首页命盘文本与修改前不同。
6. 处理原生确认对话框：断言其文本为 `确定重置生辰为默认值（1990-06-15 12时 男）？` 并接受；点击“重置”。
7. 断言年份恢复 `1990`、摘要恢复 `1990-06-15`，且默认生辰提示重新出现。
8. 断言桌面页面无横向溢出。

命盘刷新只以 `home-bazi-plate` 文本变化为用户可见结果依据，不锁定具体干支文案，以保留引擎结果的正常演进空间。

### 2. 命令面板：从搜索到工作区的导航闭环

调用 `openWorkspace(page, '八字命盘', 'bazi')`：

1. 按真实用户路径打开命令面板、输入模块标题并选择包含“导航”的结果。
2. 断言 `[data-testid="workspace-bazi"]` 可见。
3. 在 workspace 内断言“八字命盘”用户可见内容出现。

此场景不重复命令面板本身的触发、快捷键和关闭行为；这些已由 `interactions.spec.ts` 负责。它只证明搜索选择可完成导航结果。

### 3. 移动：出生资料入口与全局布局边界

在移动视口 `375×667` 中：

1. 打开 `BASE_URL`，等待 Shell 可见。
2. 确认 `[data-testid="workspace-tabs"]` 可见，桌面侧栏不作为移动断言对象。
3. 使用 `visibleBirthInput(page, 'year')` 确认可见全局出生年输入存在，证明用户可从移动主内容区编辑资料。
4. 断言“全局生辰”以及默认出生提示可见。
5. 使用 `expectNoHorizontalOverflow(page)` 验证完整移动 Shell 的 `scrollWidth` 不超过视口宽度加 1 像素。

## 定位与状态约束

- 由于 Shell 同时保留桌面和移动出生资料 DOM，所有全局出生数字字段都必须由 `visibleBirthInput()` 定位；不得使用裸 `getByLabel('年')` 或未带 `:visible` 的 `aria-label` selector。
- 出生数字字段使用 draft state，只在 `blur` 时调用 `updateBirth()`；场景 1 必须保留 `fill()` 后 `press('Tab')`，不能用会隐藏该语义的 `fillVisibleBirthField()`。
- 重置是原生 `window.confirm()` 门槛后的用户操作；测试必须侦听、验证并接受该对话框，不能通过 `page.evaluate()`、存储重置或直接调用业务状态实现。
- 所有导航通过 `openWorkspace()` 的命令面板路径进行；不通过 tab click、hash 修改或内部 state 绕行。
- 布局断言复用 `expectNoHorizontalOverflow()`，不复制 `scrollWidth` 表达式。

## 验证

### 定向四浏览器验收

在 `apps/visual` 目录运行：

```cmd
set "PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright" && npx playwright test p14b-shell-user-acceptance --reporter=line
```

预期三个场景在四浏览器项目中全部通过，即 `12 passed`。

### 回归与质量门

在 `apps/visual` 目录运行：

```cmd
npm run typecheck
npm run test:unit
npm run test
node scripts/check-doc-contracts.mjs
npm run build
```

并运行完整 P1.3 四浏览器回归，确保公共 helper 的既有调用不受影响：

```cmd
set "PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright" && npx playwright test p13 --reporter=line
```

预期质量门均成功，P1.3 保持 `124 passed`。构建中已有的 Vite `__dirname` 前瞻提示和 chunk size 提示不属于本次范围，不应为获得绿色结果顺带抑制或修改。

## 完成标准

- 新的 Shell 用户验收文件与 `smoke.spec.ts` 职责清晰分离。
- 桌面场景证明出生年份离焦提交会刷新首页命盘，且用户接受确认后能重置回默认值。
- 命令面板场景证明从搜索到八字工作区的真实导航闭环。
- 移动场景证明可见全局出生资料入口与无横向溢出。
- 所有场景复用 P1.4a helper，且没有重复低层命令面板交互覆盖。
- 定向四浏览器验收、完整 P1.3 矩阵和项目质量门通过。
- 没有产品代码、Dashboard 架构边界或用户已有动态层计划文件被修改。
