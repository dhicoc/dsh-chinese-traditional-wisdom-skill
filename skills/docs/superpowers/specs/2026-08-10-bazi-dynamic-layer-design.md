# 八字动态层设计

**日期：** 2026-08-10  
**状态：** 已确认，待实施计划  
**范围：** 八字动态层的纯引擎、CLI / Skill 契约、Dashboard 直调展示与回归验证。

## 背景

项目已具备本命八字、精确或降级的大运、流年、流月、流日，以及原局与当前大运的部分干支关系计算。`BaziWorkspace` 已按目标日期浏览这些动态信息，但动态结果仍分散在多个 snapshot 函数中，小运尚未实现，`bazi_calculate` 的 CLI / Skill 输出也无法请求或验证同一动态层。

本工作将现有动态计算收敛为一个可复用、可披露、可验证的公共事实模型。它不改变 Dashboard 的直接纯引擎调用路径；CLI / Skill 则继续通过既有 `parseLocalToolInput()` 和 `runLocalTool()` 公开同一模型。

## 目标

1. 用一个目标日期同时计算大运、虚岁小运、流年、流月与流日。
2. 保证本命四柱、本命五行、十神和神煞不被动态层修改或混入。
3. 让 `bazi_calculate` 在可选输入 `transitDate` 存在时返回动态层，未传时保持既有输出兼容。
4. 让 Dashboard、CLI 与 Skill 共享同一纯引擎动态事实与口径披露。
5. 对动态事实、关系、降级路径建立 parser、fixture、CLI 和 claims verifier 回归。

## 非目标

- 不把 Dashboard 改为调用 CLI Runner。
- 不新建独立 `bazi_transit` 工具。
- 不将干支关系自动推断为事业、婚恋、财富、健康或现实结果。
- 不改变本命四柱、神煞、真太阳时与大运起运的既有口径。
- 不在本次引入云端、通知、账户、跨设备同步或生产部署。

## 调用边界

### Dashboard

Dashboard 保持浏览器端直调纯 TypeScript 引擎：

```text
BaziWorkspace → calculateBazi / buildBaziDynamicLayer
```

Dashboard 不经过 `parseLocalToolInput()` 或 `runLocalTool()`，不新增 Dashboard-to-Runner 路由。

### CLI / Skill

CLI 与 Skill 保持既有公共入口：

```text
Skill / Agent → Local Engine CLI → parseLocalToolInput()
→ runLocalTool('bazi_calculate') → calcBaziEnveloped()
→ ToolEnvelope.data / validateBaziClaims()
```

当调用者提供 `transitDate` 时，Runner 将其传入 enveloped 八字引擎；否则不构造动态层。

## 输入契约

在 `BaziToolInput` 中增加可选字段：

```ts
transitDate?: string;
```

其语义为真实公历目标日期，格式必须为 `YYYY-MM-DD`。

`parseLocalToolInput('bazi_calculate', rawInput)` 必须：

- 未提供时保持向后兼容；
- 提供时拒绝非字符串、错误格式或不存在的公历日期；
- 继续执行既有 `timeBasis`、民用时间确认与真太阳时出生记录一致性校验；
- 按当前策略静默剥离未声明字段，包括动态层未声明嵌套字段。

## 数据模型

`BaziData` 在存在目标日期时可选地包含 `transit`：

```ts
interface BaziDynamicLayer {
  targetDate: string;
  nominalAge: number;
  decadal: {
    direction: '顺行' | '逆行';
    startSolar?: string;
    current: BaziLuck | null;
    all: BaziLuck[];
  };
  minor: BaziMinorFortune;
  yearly: BaziDynamicPillar;
  monthly: BaziDynamicPillar;
  daily: BaziDynamicPillar;
  relations: {
    yearly: BaziDynamicRelations;
    monthly: BaziDynamicRelations;
    daily: BaziDynamicRelations;
  };
  available: boolean;
  limitations: string[];
}

interface BaziMinorFortune {
  nominalAge: number;
  stem: string;
  branch: string;
  stemShiShen: string;
  stemWuxing: string;
  source: 'lunar-exact' | 'local-fallback';
}

interface BaziDynamicPillar {
  stem: string;
  branch: string;
  stemShiShen: string;
  stemWuxing: string;
}

interface BaziDynamicRelations {
  natal: BaziRelationMatch[];
  decadal: BaziRelationMatch[];
  minor: BaziRelationMatch[];
}

interface BaziRelationMatch {
  reference: 'natal' | 'decadal' | 'minor';
  referenceKey?: 'year' | 'month' | 'day' | 'hour';
  referenceGanZhi: string;
  relations: BaziRelationName[];
}
```

未提供 `transitDate` 时不返回 `data.transit`。提供但无法得到可靠动态数据时，返回具有 `targetDate`、`available: false` 与明确 `limitations` 的动态层；不返回标记为可用的空干支。

## 时间层与年龄口径

| 层 | 定位依据 | 与本命层关系 |
| --- | --- | --- |
| 本命 | 出生资料和既有时间依据 | 固定，不随目标日期变化 |
| 大运 | 既有精确起运优先、当前周岁定位 | 独立于本命四柱 |
| 小运 | 目标日期对应的虚岁 | 独立动态层，不替代大运 |
| 流年 | 目标日期所在公历年 | 独立动态层 |
| 流月 | 目标日期对应的节气精确月干支 | 独立动态层 |
| 流日 | 目标日期对应的精确日干支 | 独立动态层 |

小运虚岁公式固定为：

```text
nominalAge = targetDate.year - birth.year + 1
```

出生当年为虚岁 1。Dashboard 必须明确区分“小运按虚岁”与“当前大运按周岁／精确起运年龄”。

## 小运来源与降级

小运优先使用已接入 `lunar-typescript` 的稳定 API。纯引擎内部封装第三方对象，不让 Dashboard、CLI 或 Skill 直接调用其方法。

- 能取得稳定 API 结果时：`source: 'lunar-exact'`；
- API 不存在、异常或无法取得有效干支时：使用明确的本地 fallback，并标记 `source: 'local-fallback'`；
- fallback 必须在 `limitations`、evidence 与 `result_meta.calculationConfig` 中披露；
- 不得将 fallback 表述为与 lunar 精确结果同等级的事实。

## 关系规则

每个动态柱（流年、流月、流日）分别与本命四柱、当前大运和当前小运比较。

基础关系：

- 天干合；
- 天干冲；
- 六合；
- 三合；
- 六冲；
- 相害；
- 相刑。

由基础关系确定性派生的复合标签：

| 标签 | 派生条件 |
| --- | --- |
| 天克地冲 | 同一对干支同时命中天干冲与六冲 |
| 岁运并临 | 流年与当前大运的干支完全相同 |
| 伏吟 | 动态柱与被比较柱干支完全相同 |
| 反吟 | 动态柱与被比较柱同时天干冲、六冲 |

关系层只输出结构化事实和标签，不输出吉凶或现实场景结论。

## CLI / Skill 输出与披露

`calcBaziEnveloped()` 取得可选 `transitDate` 后，在 `data.transit` 输出动态层。

`result_meta.calculationConfig` 在动态层启用时增加：

```ts
{
  dynamicLayer: {
    enabled: true,
    targetDate: 'YYYY-MM-DD',
    minorFortuneAgeBasis: 'nominal-age',
    minorFortuneSource: 'lunar-exact' | 'local-fallback',
    monthlyPillarRule: 'solar-term-exact',
    dailyPillarRule: 'lunar-exact',
    relationRules: [
      'gan-he', 'gan-chong', 'liu-he', 'san-he', 'chong', 'hai', 'xing',
      'tian-ke-di-chong', 'sui-yun-bing-lin', 'fu-yin', 'fan-yin',
    ],
  },
}
```

动态层成功时，`evidence` 增加目标日期解析、虚岁定位、当前大运、小运、流年、流月、流日与关系比对的步骤和事实。`export_snapshot` 新增“动态层”段落，只包含目标日期、虚岁、动态干支和已命中的关系。

所有动态层说明都应包含传统文化参考边界，不得将规则关系描述为现实结果保证。

## Claims verifier

扩展 `BaziPresentationClaim`，保留现有本命 claim，并加入动态层的强类型 claim：

```ts
type BaziPresentationClaim =
  | ExistingNatalClaim
  | { kind: 'transitTargetDate'; value: string }
  | { kind: 'transitNominalAge'; value: number }
  | { kind: 'transitDecadal'; field: 'direction' | 'ganZhi'; value: string }
  | { kind: 'transitMinor'; field: 'nominalAge' | 'ganZhi' | 'stemShiShen' | 'stemWuxing'; value: number | string }
  | { kind: 'transitPillar'; layer: 'yearly' | 'monthly' | 'daily'; field: 'ganZhi' | 'stemShiShen' | 'stemWuxing'; value: string }
  | {
      kind: 'transitRelation';
      layer: 'yearly' | 'monthly' | 'daily';
      reference: 'natal' | 'decadal' | 'minor';
      referenceKey?: 'year' | 'month' | 'day' | 'hour';
      value: string;
    };
```

动态层不存在时，动态 claim 必须失败并产生 `expected: undefined`。关系 claim 以成员关系验证，必须同时匹配层、参照层和本命柱选择器，不能因相同关系名称而误通过。

## Dashboard 展示

Dashboard 使用统一动态层模型，不改变其纯引擎直调边界。

### 目标日期

`transitDate` 是唯一动态锚点：

- 改变年份同步更新流年、小运、当前大运；
- 改变日期更新流月、流日；跨年时全部动态层同步更新；
- 本命层保持不变；
- 展示“动态层均按目标日期计算；本命盘保持不变”。

### 展示顺序

本命四柱之后按以下固定顺序展示：

1. 当前大运：顺逆、起运日期／年龄、当前大运和所有大运阶段卡片；
2. 当前小运：虚岁、干支、十神、五行、来源标签；
3. 流年：年份、干支、十神、五行和关系；
4. 流月与流日：目标日期对应干支、十神、五行和关系。

不把动态柱放进本命四柱表或本命五行统计。

### 关系与状态

关系标签使用清晰来源，例如：

```text
原局·日柱辛亥 · 天干合
大运甲子 · 六冲
小运丙寅 · 伏吟
流年与大运 · 岁运并临
```

没有命中时显示“未发现本规则重点标记的干支互动”。不自动显示“吉”“凶”或现实场景解释。

动态层显示 `本地精确`、`部分降级` 或 `不可用` 状态，并披露：目标日期、虚岁／大运年龄口径差异、真太阳时或民用时间依据，以及传统文化参考免责声明。

## 测试与质量门

### 引擎测试

在 `baziEngine.test.ts` 覆盖：

- 指定目标日期返回完整动态层；
- 虚岁在出生年为 1，跨年正确递增；
- 大运保持既有周岁／精确起运定位；
- 小运精确路径与 fallback 的来源披露；
- 流年、流月、流日干支及天干十神；
- 天克地冲、岁运并临、伏吟、反吟的最小金标样例；
- 非法日期返回 `available: false` 且限制明确；
- 未传 `transitDate` 时本命输出不改变。

### CLI 契约与 Runner 测试

覆盖：

- 合法 `transitDate`；
- 格式错误和不存在的日期；
- 未声明字段剥离；
- Runner 将日期传至 enveloped 八字引擎；
- 真太阳时和民用时间既有契约不回归；
- CLI stdout 不泄漏 sentinel 字段。

### Fixture、E2E 与 claims 测试

新增：

```text
bazi_calculate.transit.success.json
bazi_calculate.transit.boundary.json
bazi_calculate.transit.failure.json
```

覆盖常规完整动态层、节气／跨年／起运边界以及非法 `transitDate`。更新 `localToolFixtures.test.ts`、CLI E2E 和 `claimVerifierMatrix.test.ts`，对每个新增动态 claim 测试有效值、篡改值、缺失动态层和不存在关系选择器。

### Dashboard 测试

至少验证：

- 本命层和动态层的文本区块独立；
- 目标日期变化更新动态层；
- 大运周岁与小运虚岁均明确可见；
- 小运来源、降级状态和免责声明可见；
- Dashboard 未引入 Runner。

### 全量质量门

实施完成前运行：

```text
pnpm exec vitest run <目标测试>
pnpm typecheck
pnpm test:unit
node scripts/smoke-react-shell.mjs
node scripts/check-doc-contracts.mjs
pnpm build
```

## 实施顺序

1. 定义统一动态层、小运和关系模型，收敛现有 snapshot 函数。
2. 实现小运精确／fallback 路径和复合关系派生。
3. 扩展 `BaziToolInput`、parser、Runner 和 enveloped 输出。
4. 扩展 evidence、export snapshot、calculationConfig 和八字 claim verifier。
5. 添加引擎、契约、fixture、CLI、claims 矩阵回归。
6. 将 Dashboard 的零散 snapshot 消费迁移至统一动态层，增加小运、来源和状态展示。
7. 执行全量质量门。
