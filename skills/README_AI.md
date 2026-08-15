# AI 执行指南

> AI Agent 必须先读 [SKILL.md](SKILL.md) 与 [RULES.md](RULES.md)。本项目采用 **Skill → 本地 Engine/CLI → ToolEnvelope → 本地 claims 校验 → 语言化解读** 的直调架构。

## 1. 就绪检查

```text
1. 由本文件路径确定 <SKILL_ROOT>。
2. 确认存在 SKILL.md、RULES.md、tool-index.md、bootstrap/、apps/visual/。
3. 需要运行引擎时，使用 Node `24.12.x` 与 pnpm `10.26.1`，在 apps/visual 安装锁定依赖：pnpm install --frozen-lockfile。
4. 读取用户问题，按三层路由选择工具；缺少必填输入时先追问。
5. 不得因为引擎未运行而改用模型记忆自行排盘、校时、算数或判断规则。
```

本地命令行入口：

```bash
cd apps/visual && pnpm engine <tool> <input-json-file>
```

除 `resolve_true_solar_time` 直接输出 `TrueSolarTimeResolution` 外，命令输出 JSON `ToolEnvelope`。`run-engine.ts` 支持输入文件，也支持从 stdin 接收 JSON。不得把用户的完整生辰写入长期日志或案例记录。

## 2. 执行链路

```text
用户输入
  → 问题类型 / 学科 / 融合深度路由
  → 选择本地 tool 与 JSON 输入
  → pnpm engine <tool> <input-json-file>
  → 读取本次 ToolEnvelope（真太阳时工具读取 TrueSolarTimeResolution）
  → validate*Claims(data, claims)
  → 仅据已核验结构化事实进行语言化解读
```

- **模型职责**：路由、补问、解释、文化背景、建设性建议、免责声明。
- **引擎职责**：所有确定性盘面、干支、数值、映射和组合结果。
- **校验职责**：本地 `validate*Claims(data, claims)` 仅比较结构化数据与结构化 claims。
- **禁止**：模型不得自己推算、补全、修正或把参考文件内容冒充为本次计算结果；模型不得自行推演确定性事实。

## 3. 32 个本地工具

工具名、输入与输出定义见 [tool-index.md](tool-index.md)。工具按四类使用：

1. 时间校准：`resolve_true_solar_time`。
2. 排盘与日用：八字、紫微、六爻、奇门、大六壬、星宿、太乙、皇极、梅花、五运六气、姓名、喜用神、体质、解梦、测字、称骨、黄历、飞星、八宅、节律与问卷。
3. 联合分析：年度、月度、决策、空间时间、三式、养生、择日与合婚。
4. 本地路由和参数检查：按本次请求在 Skill 侧完成；缺参必须追问，不得猜填。

### 八字动态层路由

需要查询指定日期的大运、小运、流年、流月或流日时，继续使用 `bazi_calculate`，在既有输入中加入严格格式的 `transitDate: "YYYY-MM-DD"`。从本次 `ToolEnvelope.data.transit` 读取动态事实；小运按虚岁定位，并根据 `minor.source` 披露本地历法序列或 `local-fallback`。不要新建动态层工具，也不要让 Dashboard 经过 CLI Runner。

## 4. claims 校验边界

在最终文本中呈现确定性事实前，从本次 `ToolEnvelope.data` 提取最小 claims 集并调用对应本地 `validate*Claims(data, claims)`：

- 八字、紫微、八宅、飞星、历法、占测、日用和联合分析各自只校验已有结构化字段。
- 校验通过只代表 claims 与本次结果一致；**不能**验证自由文本、传统解释、置信说明、应期、策略、建议、医疗安全性或现实结果。
- 校验失败时删除断言或重新从当前结果提取；不得改写为“看似合理”的结论。
- 输出可写“结构化事实已与本次本地引擎结果核对”，不得写“整段自由文本已验证”。

## 5. 真太阳时

1. 收集民用出生年月日、时分、性别和足以定位的出生地。
2. 通过外部可靠资料核验经度、IANA 时区、出生当日 UTC 偏移、夏令时及 `utcOffsetEvidence`；不得凭模型记忆猜测。
3. 调用 `resolve_true_solar_time`，取得 `trueSolarBirth` 与 `trueSolarResolution`。
4. 真太阳时路径将该出生记录同时作为八字 `birth` 与 `trueSolarBirth` 或 `trueSolarResolution`，并传入 `timeBasis: 'true-solar-verified'`。
5. 无法可靠核验时，先告知限制；仅在用户知情下使用民用出生记录，传入 `timeBasis: 'civil-unverified'` 与 `civilFallbackConfirmed: true`，并标注“未完成真太阳时复核”。

## 6. 可视化与报告

- 静态报告：按 `templates/visual-report.md` 写入本次结果的脱敏数据。
- Dashboard：`cd apps/visual && pnpm dev`。
- 报告与 Dashboard 均须显示 `local-exact`、`local-approx`、民俗体验、演示或降级状态；不能把演示数据表述为精确排盘。

## 7. 故障处理

同一操作连续失败两次，按 RULES.md 的 Fail-Two 规则停止重试，检查输入、依赖和 `tool-index.md` 的备用方案。引擎不可用时如实告知“当前本地引擎无法产生可复核计算结果”，不要用模型知识凑答。

## 8. 输出底线

- 命理结论注明“传统文化参考，非绝对预测”。
- 健康症状先建议就医；不得给出诊断、处方或替代治疗建议。
- 不将完整生辰、具体地点或可识别身份保存到 field-journal。
