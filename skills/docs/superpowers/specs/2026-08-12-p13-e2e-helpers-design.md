# P1.4a 用户侧 E2E 公共助手设计

**日期：** 2026-08-12  
**状态：** 已确认，待实施计划  
**范围：** 为全部现有 `p13*.spec.ts` 用户侧验收抽取稳定、最小的 Playwright 公共助手。

## 背景

P1.3 已建立按真实用户入口验证 Dashboard 工作区的 Playwright 用户侧验收。23 个 `p13*.spec.ts` 中反复出现三类技术操作：通过命令面板导航到指定工作区、定位响应式双份 DOM 中可见的全局出生资料输入、以及断言页面不产生横向溢出。

这些操作不是模块的业务验收本身，但在各 spec 中重复实现。近期出生时间边界验收已经说明，页面的稳定可访问名称调整后，分散的定位会使整组回归脆弱。P1.4a 将这些跨模块的测试基础设施收敛到单一来源，同时保留每个 spec 对真实业务操作、结果刷新和传统文化边界的独立断言。

## 目标

1. 在 `apps/visual/e2e` 创建一个公共 helper 模块，供全部 `p13*.spec.ts` 导入。
2. 统一命令面板导航、可见全局出生字段定位与移动端横向溢出断言。
3. 迁移所有适用的 P1.3 spec，删除等价的文件内 helper 和重复 selector。
4. 保持各模块的业务输入、结果、边界、隐私和图表断言在原 spec 中。
5. 以完整 P1.3 四浏览器矩阵验证迁移不改变验收覆盖。

## 非目标

- 不修改 Dashboard 产品代码、`BirthPanel` 可访问名称或 workspace 行为。
- 不修改 `playwright.config.ts`、浏览器项目、超时策略或测试命令。
- 不把所有业务动作封装为通用 DSL。
- 不新增或扩展 `tizhi`、`testing` 的 P1.3 用户侧验收范围。
- 不改变命令面板、出生资料或布局的产品语义。

## 设计

### 文件与导出

创建 `apps/visual/e2e/p13-helpers.ts`，只依赖 `@playwright/test` 的 `expect`、`Page` 与 `Locator` 类型，并导出：

```ts
export const BASE_URL: string;

export async function openWorkspace(
  page: Page,
  title: string,
  workspaceId: string,
): Promise<Locator>;

export function visibleBirthInput(
  page: Page,
  field: 'year' | 'month' | 'day' | 'hour' | 'minute',
): Locator;

export async function fillVisibleBirthField(
  page: Page,
  field: 'year' | 'month' | 'day' | 'hour' | 'minute',
  value: string,
): Promise<void>;

export async function expectNoHorizontalOverflow(page: Page): Promise<void>;
```

### 命令面板导航

`openWorkspace()` 必须使用用户可见的命令面板路径：

1. 访问 `BASE_URL`；
2. 等待 `[data-testid="app-shell"]` 可见；
3. 点击“打开命令面板”；
4. 在 `command-input` 输入模块标题；
5. 点击同时包含模块标题和“导航”的 `command-result`；
6. 等待 `[data-testid="workspace-${workspaceId}"]` 可见；
7. 返回该 workspace locator。

该函数不点击内部 tab，不绕过 UI 直接改状态，也不对模块 heading 或业务内容做断言。调用 spec 继续拥有这些业务断言。

### 可见全局出生资料输入

响应式 Shell 可能保留桌面和移动两份出生资料 DOM。`visibleBirthInput()` 必须按字段映射到唯一且稳定的 aria-label，并只匹配可见 input：

| field | aria-label |
| --- | --- |
| `year` | `全局出生年` |
| `month` | `全局出生月` |
| `day` | `全局出生日` |
| `hour` | `全局出生时` |
| `minute` | `全局出生分` |

`fillVisibleBirthField()` 使用该 locator 填写值并触发 `blur()`，使测试沿用用户输入离焦后提交草稿值的真实行为。它不代替针对模块特有输入的填写操作。

### 布局边界

`expectNoHorizontalOverflow()` 读取 `document.documentElement.scrollWidth`，并断言它不超过当前 `page.viewportSize()` 宽度加 1 像素。该容差与现有 P1.3 测试保持一致。

调用者只在当前已有布局断言的测试中改为使用该 helper；P1.4a 不要求为此前没有布局断言的模块增加新的产品验收要求。

## 迁移策略

1. 所有 `p13*.spec.ts` 从本地定义迁移到 `p13-helpers.ts` 的等价导入。
2. 所有重复 `openWorkspace()` 定义删除，改用公共 `openWorkspace()`；原有传入的标题、workspace id 和调用后的业务断言不变。
3. 所有 `input[aria-label="全局出生…"]:visible` 直接定位改为 `visibleBirthInput()` 或 `fillVisibleBirthField()`；当现有流程需要 `fill()` 后自行 `press('Tab')` 的特定事件时，使用 `visibleBirthInput()` 保持该事件序列。
4. 所有本地 `expectNoHorizontalOverflow()` 与等价 `scrollWidth` 表达式改为公共 helper。
5. `p13b` 的首页“我想看运势”入口是该测试的专属用户路径；它不被 `openWorkspace()` 替换。
6. 没有上述重复模式的 spec 只增加必要 import，不为形式统一引入无用 helper。

## 错误处理与可维护性

- helper 不吞没 Playwright 异常；失败时应保留原生 locator、操作与超时信息。
- `workspaceId` 保持字符串参数，不从模块注册表导入运行时代码，避免 E2E 测试基础设施与产品模块注册表耦合。
- 出生字段使用受限联合类型，阻止拼错 aria-label 或传入未声明字段。
- 不创建宽泛的 selector 工厂、自动重试或业务断言包装器；这些会降低失败定位精度。

## 验证

### 迁移正确性

- TypeScript 类型检查必须通过，验证 helper 的导出、导入和字段联合类型。
- 运行 `p13b-birth-boundary`，验证首页八字入口及出生时分填写仍在四浏览器通过。
- 运行完整 P1.3 用户侧矩阵：

```cmd
set "PLAYWRIGHT_BROWSERS_PATH=D:\Caches\ms-playwright" && npx playwright test p13 --reporter=line
```

预期为 124 项四浏览器回归全部通过；若文件数因仅做重构而改变，必须说明原因且不能减少既有业务场景。

### 项目质量门

```cmd
npm run typecheck
npm run test:unit
npm run test
node scripts/check-doc-contracts.mjs
npm run build
```

所有命令必须通过。构建中已有的 Vite `__dirname` 前瞻性提示和 chunk 大小提示不属于本次范围，不应为获得绿色结果而静默抑制或顺带修改。

## 完成标准

- `p13-helpers.ts` 是 P1.3 共用导航、出生字段和布局检查的唯一来源。
- 所有适用的 23 个 `p13*.spec.ts` 已迁移，重复 helper 已移除。
- 每个 spec 仍保留原先的模块业务操作和断言。
- `p13b` 定向矩阵、完整 P1.3 矩阵和全量质量门均通过。
- 不修改 Dashboard 产品代码、P1.3 验收范围或用户已有的动态层计划文件。
