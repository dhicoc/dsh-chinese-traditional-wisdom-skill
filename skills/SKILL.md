---
name: chinese-traditional-wisdom-ai-agent-workflow
description: 中国传统文化整体智慧咨询系统。遇到人生困惑、健康调养、事业决策、婚恋、择居、占卜或传统文化问题时，使用本地确定性引擎并遵守伦理边界。
---

# 中国传统文化整体智慧咨询系统

## 0. 本地直调前置检查

> **硬规则：模型不得自行推演、排盘、校时、算数、补全干支或把参考文本伪装为本次计算。**

1. 将本文件所在目录记为 `<SKILL_ROOT>`，读取 `RULES.md` 与 `tool-index.md`。
2. 确认 `apps/visual/scripts/run-engine.ts` 存在；需要执行时使用 Node `24.12.x` 与 pnpm `10.26.1`，在 `apps/visual` 运行 `pnpm install --frozen-lockfile`。
3. 选择本地工具后，准备 JSON 输入文件并执行：

```bash
cd apps/visual && pnpm engine <tool> <input-json-file>
```

4. 除 `resolve_true_solar_time` 直接返回 `TrueSolarTimeResolution` 外，CLI 返回 `ToolEnvelope`。只从该次 `ToolEnvelope.data` 提取确定性事实；用对应本地 `validate*Claims(data, claims)` 核对结构化 claims 后，才能写成“本次引擎结果”。
5. 引擎失败时遵守 Fail-Two：停止盲目重试，检查输入和备用方案；不要用模型记忆补答。

本地 CLI 与 Dashboard 都使用纯 TypeScript 引擎；CLI 经 `parseLocalToolInput()` / `runLocalTool()` 执行一次性契约，Dashboard 按页面直接调用纯引擎。Python 工具仅可作命令行交叉验证，不是对话计算数据源。

## 1. 三层路由

| 层 | 分类 | 作用 |
|---|---|---|
| 问题类型 | 健康、事业、婚恋、学业、择居、占卜、心灵、综合 | 选择场景 |
| 学科 | 八字、紫微、六爻、梅花、奇门、大六壬、太乙、五运六气、体质、风水、姓名、儒释道 | 选择本地工具与参考 |
| 融合深度 | 轻度、标准、深度 | 决定是否调用联合分析与报告模板 |

缺少出生时间、性别、起卦方式、住宅坐向等必要输入时必须追问。不得默认子时，不得猜测用户未提供的字段。

## 2. 本地工具与数据流

```text
用户输入 → 路由与参数检查 → pnpm engine <tool> <input-json-file>
         → ToolEnvelope → validate*Claims(data, claims)
         → 事实、文化解释、建议和免责声明分层输出
```

32 个工具分为：时间校准 1 个、排盘/日用 22 个、联合分析 9 个；完整名称和引擎文件见 `tool-index.md`。

- `ToolEnvelope` 是确定性事实的唯一来源。
- 本地校验函数只比较结构化字段：柱、宫位、星曜、数值、日期、枚举、映射和排序项等。
- 校验不能验证自由文本、传统解释、应期、策略、医疗建议、现实效果或综合结论。
- 失败的 claim 必须删除或重新从本次结果提取；不得换词继续当作事实。

## 3. 真太阳时

此链路只用于八字预处理：

1. 收集民用出生记录（公历年月日、时分、性别、可定位出生地）。
2. 在外部可靠来源核验经度、IANA 时区、出生当日 UTC 偏移、夏令时和 `utcOffsetEvidence`；模型不得凭记忆填写。
3. 调用 `resolve_true_solar_time`，直接取得 `trueSolarBirth` 与 `trueSolarResolution`。
4. 真太阳时路径将该出生记录同时作为八字 `birth` 与 `trueSolarBirth` 或 `trueSolarResolution`，并传入 `timeBasis: 'true-solar-verified'`，再解读其返回的 `ToolEnvelope`。
5. 无法可靠核验时，先告知限制；仅在用户知情下使用民用出生记录，传入 `timeBasis: 'civil-unverified'` 与 `civilFallbackConfirmed: true`，并标注“未完成真太阳时复核”。

Dashboard 只能展示核验、待核验和民用降级状态，不能自行猜测地点或历史时区。

## 4. 八字动态层

当问题需要查看指定日期的大运、小运、流年、流月或流日时，仍调用 `bazi_calculate`，并加入可选公历字段 `transitDate: "YYYY-MM-DD"`；不要新建或猜测其他动态层工具。结果从本次 `ToolEnvelope.data.transit` 读取：其中包含目标日期、虚岁小运、十年大运、流年、流月、流日及可复核的干支关系。

小运按目标日期的虚岁定位，`minor.source` 为 `lunar-exact` 时表示来自本地历法序列，为 `local-fallback` 时必须在解读中说明使用了本地降级规则。关系字段只说明干支规则事实，不可据此直接断言事业、婚恋、健康、财富或其他现实结果。完整输入示例与 claims 写法见 `bootstrap/bazi-engine.md`。

CLI / Skill / Agent 必须经 `parseLocalToolInput()` 和 `runLocalTool()` 取得 `ToolEnvelope`；Dashboard 仍按页面直接调用纯 TypeScript 引擎，不经 CLI Runner。

## 5. 解读与报告

- 先呈现经过本地结果核对的结构化事实，再以明确的“传统解释”“文化背景”“建议”区分自由文本。
- 健康问题先建议就医；中医养生只作文化参考。
- 所有预测性内容须声明非绝对预测，并给出建设性、非宿命化建议。
- 静态报告使用 `templates/visual-report.md`；交互式 Dashboard 使用 `cd apps/visual && pnpm dev`。
- 保持 `local-exact`、`local-approx`、民俗体验、演示和降级状态可见。

## 5. 领域引导

| 场景 | 主入口 |
|---|---|
| 八字 | `bootstrap/bazi-engine.md` |
| 紫微 | `bootstrap/ziwei-engine.md` |
| 六爻 | `bootstrap/liuyao-engine.md` |
| 梅花 | `bootstrap/meihua-yishu-engine.md` |
| 五运六气 | `bootstrap/yunqi-integration.md` |
| 体质 | `bootstrap/constitution-questionnaire.md` |
| 风水 | `bootstrap/fengshui-guide.md` |

reference 文件和古籍知识库只用于解释框架与引用，不能代替本次本地计算。
