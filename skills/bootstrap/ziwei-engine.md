# 紫微斗数排盘引擎集成指南

> 紫微宫位、星曜、四化和动态层事实必须由本地引擎计算，模型不得自行排盘。

## 本地直调

```bash
cd apps/visual && pnpm engine ziwei_chart <input-json-file>
```

实现：`apps/visual/src/legacy/ziweiEngine.ts`，使用本地 `iztro` 计算并输出 `ToolEnvelope`。引擎不可用时只能展示明确标识的演示或降级数据，不能把它说成真实命盘。

## 输入

| 字段 | 说明 |
|---|---|
| birth.year/month/day/hour | 公历出生信息 |
| birth.gender | 男或女 |
| transit.year/month | 需要动态层时提供 |

八字真太阳时是独立预处理链路；紫微不借用未经其输入契约支持的地点或校时字段。

## 输出与校验

结果可包含十二宫、星曜、四化、五行局、命主、身主和动态层。呈现这些确定性事实时：

1. 只从本次 `ToolEnvelope.data` 提取宫位、星曜、四化或元资料。
2. 用本地 `validateZiweiClaims(data, claims)` 核验结构化 claims。
3. 仅在通过时表述为本次命盘事实。
4. 保留 `result_meta.calculationConfig`，其中披露实际 `iztro` 版本、动态层目标日期、早子时与宫名归一等计算口径。

传统星曜释义、条件性推论、合婚判断、建议和自由文本不进入 claims，也不应被称为已验证。

## 解读边界

紫微流派口径可能不同，应说明引擎版本与能力状态。所有预测性语言须遵守 `RULES.md` 的非绝对化与积极导向要求。
