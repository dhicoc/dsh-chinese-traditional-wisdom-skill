# 六爻卜卦引擎集成指南

> 六爻盘面必须由本地纳甲引擎计算；模型只可解释本次结果。

## 本地直调

```bash
cd apps/visual && pnpm engine cast_liuyao <input-json-file>
```

实现：`apps/visual/src/legacy/liuyaoEngine.ts`。CLI Runner 固定注入 `lunar-typescript` 的 `Solar`，通常产生 `local-exact` 日干支与空亡；直接调用引擎且不提供 Solar 时才会标记 `local-approx`。

## 输入与输出

输入包含起卦方式、问题、出生或起卦时间及必要爻值。输出 `ToolEnvelope`，其中包含本卦、变卦、纳甲、六亲、六神、世应、用神、空亡与旺衰等结构化盘面。

## 校验和解释

- 盘面事实必须从本次 `ToolEnvelope.data` 提取，并使用本地 `validateDivinationClaims('cast_liuyao', data, claims)` 核对。
- 卦名、动爻、干支、世应、六亲、三传或局式等可作为结构化 facts。
- 吉凶、应期、策略、传统解释和行动建议不属于 claims；不能被表述为已自动校验。
- 重要决策仅供文化参考，不能替代法律、医疗、财务或安全判断。

`ichingshifa` 等 Python 工具可用于离线交叉验证，不代替本地 Engine/CLI 的当前结果。
