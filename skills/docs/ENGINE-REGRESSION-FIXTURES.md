# 命理引擎规则来源与回归夹具

> 适用范围：八字与紫微斗数的确定性排盘、动态层和导出快照。
>
> 本文记录运行时来源、适用边界及 CI 应固定校验的样例。夹具用于防止依赖升级或规则改动造成无意漂移，不构成对现实结果的绝对断言。

## 共同原则

- 盘面、干支、运限与星曜必须来自本地确定性引擎；Agent 只能引用本次 `ToolEnvelope` 的 `data`、`export_snapshot`、`evidence` 与 `warnings` 组织说明。
- 本命层与动态层分开：浏览流年、流月、流日或小限时，不改写出生四柱或本命十二宫。
- 外部依赖以 `apps/visual/package.json` 为准。升级 `lunar-typescript`、`iztro` 或其适配层前，必须先复核本页夹具。
- 流派不同的判断须显式标明边界；没有固定来源或尚未启用的能力不得伪装为计算结论。

## 已解析 EngineConfig 口径

- `result_meta.calculationConfig` 记录本次实际生效的已解析口径，不以调用方原始入参替代实际计算路径；对应口径也会出现在关键 `evidence.steps` 的输入摘要中。
- 八字唯一可选的流派项为 `shenShaTrineSource`：默认 `year`（按年支查三合局），可显式为 `day`（按日支查）。`calendarMode`、`luckStartMethod`、`dayBoundaryRule` 由本次实际路径解析：精确历法与节气起运可用时分别为 `exact`、`lunar-solar-terms`；否则为 `approx`、`three-years-approx`；换日固定为 `zi-chu-next-day`。
- 直接八字调用会写入 `timeBasis`：仅为 `true-solar-verified` 或经用户确认的 `civil-unverified`。地点和历史时区依据保留在 `data.timeSource`。
- 紫微唯一可选项为动态层目标 `transit.year/month`；解析后固定补为该月 15 日。排盘固定使用 `iztro@2.5.8`、`23:00-23:59=>early-zi` 与 `仆役→交友`归一，已启用层级仅为大限、流年、流月、小限。
- 流日、流时、三方四正和未定义的流派开关不属于当前 `EngineConfig`，Agent 不得自行指定或补全其结果。
- 飞星 `calc_feixing` 固定披露 `annualCenterStarAnchor`、`flightOrder`、`yuanYun` 与 `mingGuaRule`；八宅 `calc_bazhai` 固定披露 `mingGuaRule`、`directionsRule` 与 `taisuiRule`；黄历 `get_almanac` 固定披露 `provider: 'lunar-typescript'`、`calendarMode` 与 `hourRangeRule`。三者均由 `localToolFixtures.test.ts` 的 success 与 boundary fixture 回归。

## 八字

| 规则或层级 | 运行来源 | 适用边界 | 回归夹具 |
|---|---|---|---|
| 四柱、节气月、日干支 | `lunar-typescript`，由 `solarEntry.ts` 注入 `baziEngine.ts` | 精确路径依赖 Solar 入口；不可用时仅降级为本地近似，不能标为精确排盘 | `baziEngine.test.ts`：1990-06-15 12:00 男命本命、节气流月与流日 |
| 大运与起运 | `lunar-typescript` 的 `getYun/getDaYun` | 精确路径保留顺逆、起运日期和年份；依赖不可用时采用本地简化大运并披露 | `baziEngine.test.ts`：顺行与起运日期；2025 年大运/流年夹具 |
| 流年 | 干支六十甲子 + 本命/当前大运关系规则 | 仅叠加显示，不改写本命四柱 | `baziEngine.test.ts`：2025 乙巳、当前壬午大运及原局关系 |
| 流月、流日 | `lunar-typescript` 的精确月干支、日干支 | 必须使用完整目标日期；流月按节气月，不按公历月直接推断 | `baziEngine.test.ts`：2025-07-15 癸未月、乙酉日及关系夹具 |
| 神煞 | 项目内 `shensha.ts` 规则表 | 神煞仅辅助观察；桃花、驿马、华盖、将星明确区分按年支或日支查法 | `baziEngine.test.ts`：年支/日支查法切换、魁罡、同柱去重 |
| 高阶判断 | 项目内 `advancedBazi.ts` | 普通格取月支主气透干；化气仅取日干与相邻干五合；从格须日主极弱、无根无助且力量集中 | `advancedBazi.test.ts`：扶抑、普通格、从格、化气、调候、通关、病药夹具 |

## 紫微斗数

| 规则或层级 | 运行来源 | 适用边界 | 回归夹具 |
|---|---|---|---|
| 本命十二宫、主辅杂曜、四化 | `SylarLong/iztro@2.5.8`，经 `ziweiEngine.ts` 归一化 | `仆役`统一映射为`交友`；本命为固定出生输入结果 | `ziweiEngine.test.ts`：1990-06-15 12:00 男命十二宫、确定性、交友宫归一；2000-08-16 03:00 男命长生/博士十二神 |
| 大限、流年与流年十二神 | `iztro` horoscope | 动态查询以完整目标日期为锚点；仅展示已返回的流耀与十二神 | `ziweiEngine.test.ts`：2025-07-15 的己卯大限、乙巳流年、流马/流钺/流曲与岁前/将前夹具 |
| 流月与小限 | `iztro` horoscope | 查询锚点必须同时保留目标年与目标月；当前不启用流日、流时与三方四正 | `ziweiEngine.test.ts`：2025 年 7 月癸未流月、四化、小限 36 虚岁居兄弟宫 |
| 导出动态层 | `calcZiweiEnveloped` | 必须使用调用方传入的年月，不能依赖运行时当前日期 | `ziweiEngine.test.ts`：2025 年 7 月导出快照夹具 |

## 变更检查

1. 修改八字或紫微引擎前，先运行：
   ```text
   pnpm exec vitest run src/__tests__/baziEngine.test.ts src/__tests__/advancedBazi.test.ts src/__tests__/ziweiEngine.test.ts
   ```
2. 变更涉及 UI 或导出时，继续运行对应 E2E、`pnpm run typecheck` 与 `pnpm run build`。
3. 若夹具变化来自有意的上游引擎升级，提交中必须说明版本、受影响层级、对比结果和用户可见边界；不能仅更新断言以使 CI 通过。
