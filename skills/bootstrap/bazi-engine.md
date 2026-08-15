# 八字排盘引擎集成指南

> 八字的确定性数据必须由本地引擎产生；模型仅解释结果。

## 本地直调

```bash
cd apps/visual && pnpm engine bazi_calculate <input-json-file>
```

实现：`apps/visual/src/legacy/baziEngine.ts`；CLI 由 `lunar-typescript` 提供精确历法入口，结果按实际路径标识为 `local-exact` 或 `local-approx`。

## 真太阳时默认预处理

民用出生时间不能直接称为真太阳时。先执行：

```bash
cd apps/visual && pnpm engine resolve_true_solar_time <input-json-file>
```

输入必须包含 `birth` 与经外部核验的 `location`（`displayName`、`longitude`、`ianaTimeZone`、`utcOffsetMinutes`、`utcOffsetEvidence`）。该工具是 CLI 的返回例外，直接返回 `TrueSolarTimeResolution`，不包裹在 `ToolEnvelope.data` 中。固定流程如下：

1. 外部核验出生地点经度、IANA 时区、出生当日 UTC 偏移、夏令时和 `utcOffsetEvidence`。
2. 运行 `resolve_true_solar_time`，取得 `trueSolarBirth` 与完整 `trueSolarResolution`。
3. 将真太阳时出生记录同时作为 `birth` 与 `trueSolarBirth` 或 `trueSolarResolution` 传给 `bazi_calculate`，并设置 `timeBasis: 'true-solar-verified'`。
4. 无法可靠核验时，只能在用户知情下使用民用出生记录，设置 `timeBasis: 'civil-unverified'` 与 `civilFallbackConfirmed: true`，并标注“未完成真太阳时复核”。

模型与 Dashboard 都不得猜测地点、历史时区、夏令时或均时差。

## 输入

| 字段 | 说明 |
|---|---|
| birth.year/month/day/hour/minute | 公历出生时间；时分边界必须准确 |
| birth.gender | 男或女 |
| timeBasis | 必填：`true-solar-verified` 或 `civil-unverified` |
| trueSolarBirth / trueSolarResolution | `true-solar-verified` 时必填；出生记录必须与 `birth` 一致 |
| civilFallbackConfirmed | `civil-unverified` 时必须为 `true` |
| shenShaTrineSource | 可选：`year` 或 `day` |
| transitDate | 可选：目标公历日期，严格为 `YYYY-MM-DD`；提供后返回统一动态层 |

## 查询指定日期的动态层

查看指定日期的大运、小运、流年、流月和流日时，继续调用 `bazi_calculate`，并在既有八字输入中增加 `transitDate`。例如，以下输入按用户确认的民用时间计算：

```json
{
  "birth": { "year": 1990, "month": 6, "day": 15, "hour": 12, "minute": 0, "gender": "男" },
  "timeBasis": "civil-unverified",
  "civilFallbackConfirmed": true,
  "shenShaTrineSource": "year",
  "transitDate": "2025-07-15"
}
```

运行：

```bash
cd apps/visual && pnpm engine bazi_calculate - < src/__fixtures__/local-tools/bazi_calculate.transit.success.json
```

不要为动态层创建其他工具名，也不要把 `transitDate` 传给 Dashboard Runner。CLI / Skill / Agent 经 `parseLocalToolInput()` 和 `runLocalTool()` 执行；Dashboard 保持按页面直接调用纯 TypeScript 引擎。

## 输出与校验

结果包含四柱、十神、五行、大运、神煞及警告。提供 `transitDate` 时，从本次 `ToolEnvelope.data.transit` 读取动态层：`targetDate`、`nominalAge`、`decadal`、`minor`、`yearly`、`monthly`、`daily` 与 `relations`。本命四柱不因目标日期而改变。

小运按目标日期的虚岁定位。`minor.source: "lunar-exact"` 表示来自本地历法序列；`"local-fallback"` 表示使用确定性本地降级规则，必须在结果解读中披露。`relations` 仅包含可复核的干支关系和派生标签，不得直接推出事业、婚恋、健康、财富或其他现实结果。

最终呈现确定性字段前，只从本次 `ToolEnvelope.data` 组织结构化 claims，并调用本地 `validateBaziClaims(data, claims)`。例如，可校验 `transitTargetDate`、`transitNominalAge`、`transitDecadal`、`transitMinor`、`transitPillar` 与 `transitRelation`；关系 claim 必须同时指定层级、参照类型和本命柱选择器。保留 `result_meta.calculationConfig`，其中包含实际历法、神煞、起运和动态层口径；Runner 会补充实际 `timeBasis`。校验不覆盖格局解释、用神建议、健康含义或其他自由文本。

## 解读边界

- 四柱、干支、五行计数和大运等事实必须逐项来自引擎。
- 格局、性格、事业、婚恋和健康相关文本均为传统文化解释，须与事实分开书写。
- 健康内容不能构成诊断或治疗建议；遵守 `RULES.md`。
