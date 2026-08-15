# 风水（堪舆）分析引擎集成指南

> 风水内容以本地确定性映射表、古籍引用和明确的传统文化边界为基础；不作必然吉凶保证。

## 本地资料与直调

- 确定性映射表：`knowledge-base/fengshui/mappings/`。
- 古籍全文：`knowledge-base/fengshui/`。
- 需要八宅、飞星、命卦或门主灶时，运行相应本地工具：

```bash
cd apps/visual && pnpm engine calc_bazhai <input-json-file>
cd apps/visual && pnpm engine calc_feixing <input-json-file>
```

工具返回 `ToolEnvelope`。命卦、方位、飞星和映射条目等结构化事实需以本次 `data` 调用本地 `validateBazhaiClaims`、`validateFeixingClaims` 或对应校验函数核对；古籍释义、布局建议、化解方案和综合判断不属于 claims。

同时保留 `result_meta.calculationConfig` 作为本次实际规则口径：`calc_feixing` 披露中宫锚点、飞布顺序、元运与命卦规则；`calc_bazhai` 披露命卦、大游年与太岁规则。它用于复现和解释计算路径，不是自由文本结论的校验结果。

## 分析顺序

1. 收集坐向、格局、大门/主卧/厨房、周边环境和目标年份；缺失时追问。
2. 先查本地 JSON 映射表，取得可重复的命卦、八宅、二十四山、飞星或门主灶基础数据。
3. 再读对应古籍文本，作为传统语境和出处。
4. 区分“结构化事实”“古籍解释”“建议”，不能将后两者说成已验证计算结果。

## 资料索引

| 需求 | 本地资料 |
|---|---|
| 命卦 | `life-trigram.json` |
| 八宅方位 | `eight-mansions.json` |
| 二十四山 | `twenty-four-mountains.json` |
| 流年飞星 | `yearly-flying-stars.json` |
| 门主灶 | `three-essentials.json` |
| 形煞参考 | `form-sha-cures.json` |

## 合规边界

- 使用“宜、不宜、倾向、传统说法”等表达，避免“必吉、必凶”。
- 不要求上传住宅真实照片或可识别地址。
- 涉及装修、结构改造或安全问题时，提醒咨询建筑、物业或其他专业人员。
- 风水与命理、五运六气的联合分析仍须分别取得各本地引擎的本次结果。
