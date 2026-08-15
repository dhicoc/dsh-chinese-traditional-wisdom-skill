# 梅花易数引擎集成指南

> 梅花卦象和体用关系必须由本地引擎产生；模型不得自行起卦。

## 本地直调

```bash
cd apps/visual && pnpm engine cast_meihua <input-json-file>
```

实现：`apps/visual/src/legacy/meihuaEngine.ts`。CLI Runner 固定注入 `lunar-typescript` 的 `Solar`，时间起卦会标识为 `local-exact`；数字起卦或直接调用引擎且未提供 Solar 时标识为 `local`。

## 输入与输出

输入应包含起卦方法、时间或数字、问题及必要的出生信息。输出 `ToolEnvelope`，可含上下卦、互卦、变卦、动爻、体用、五行关系和规则结果。

## 校验边界

- 只从本次 `ToolEnvelope.data` 提取卦象、动爻、体用、五行关系等结构化 claims。
- 使用本地 `validateDivinationClaims('cast_meihua', data, claims)` 核验；失败则删除断言或重新提取。
- 应期、吉凶、策略、传统解释与建议均为自由文本，不在校验范围内。

外部资料可作研究与交叉验证，受许可证限制的项目不进入运行代码。所有输出遵守 `RULES.md` 的文化参考和非绝对化要求。
