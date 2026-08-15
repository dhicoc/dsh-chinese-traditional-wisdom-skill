# @dhicoc/dsh-chinese-traditional-wisdom-skill

> 把「玄枢 · 中华传统智慧」Skill 封装为 **DeepSeek Harness（dsh）** 插件，让你在 dsh 对话里直接调用一套本地优先的中国传统文化咨询工作流。
>
> *A dsh (DeepSeek Harness) Cordis plugin that packages the "Chinese Traditional Wisdom" Skill (玄枢) so you can invoke a local-first traditional-culture consultation workflow directly from a dsh conversation.*

<p align="center">
  <img src="skills/chinese-traditional-wisdom-ai-agent-workflow.png" alt="玄枢" width="140" />
</p>

## 这是什么

本仓库是一个 **dsh Cordis 插件**（由 `skill2dsh` 生成），它把 Skill `chinese-traditional-wisdom-ai-agent-workflow`（产品名 **玄枢**）原样打包进 dsh。装上之后，当你在 dsh 里提出人生困惑、健康调养、事业决策、婚恋、择居、占问或传统文化相关问题时，dsh 会加载这个 Skill，由 AI Agent 按 `SKILL.md` 的路由规则调用**本地确定性引擎**完成排盘与推演，再分层输出事实、文化解释与现实建议。

**玄枢**本身是一个本地优先的传统文化参考工具：

- 核心计算（八字、紫微、六爻、梅花、奇门、大六壬、太乙、五运六气、体质、风水、姓名等）在**本地纯 TypeScript 引擎**中运行，不把完整生辰上传到远端。
- 模型**不自行推演或补全**干支 / 数值；所有确定性事实来自本次本地引擎结果（`ToolEnvelope`）。
- 输出严格区分「本地计算事实 / 传统文化解释 / 现实行动建议 / 免责声明」四层，避免把文化阐释误当确定结论。
- 附带一个 **Dashboard**（24 个工作区），可本地浏览盘面、修改输入并查看可视化结果。

> ⚠️ 传统文化参考，非绝对预测。本插件不构成医疗诊断、投资建议或现实结果保证。详见下方「使用边界」。

## 包含哪些能力

| 分类 | 能力 |
|---|---|
| 命理排盘 | 八字（四柱 / 五行 / 十神 / 大运小运 / 流年流月流日动态层）、紫微斗数 |
| 占测 | 六爻、梅花易数、奇门遁甲、大六壬、太乙神数、皇极经世、测字 |
| 历法与日用 | 每日黄历、二十八星宿、五运六气、每日节律、袁天罡称骨 |
| 日用民俗 | 姓名五行、周公解梦 |
| 堪舆风水 | 风水罗盘、流年飞星、八宅大游年 |
| 健康文化参考 | 九种体质辨识问卷（不替代医疗） |
| 综合 | 年度 / 月度 / 决策 / 空间时间 / 三式 / 择日 / 合婚等联合分析 |
| 知识与数据 | 古籍阅读（《八宅明镜》等）、本地历史与收藏（脱敏） |

底层共 **32 个本地 CLI 工具**（时间校准 1 + 排盘 / 日用 22 + 联合分析 9），完整名称、输入契约与 fixture 见 `skills/tool-index.md`。

## 安装到 dsh

```bash
dsh plugin add github:dhicoc/dsh-chinese-traditional-wisdom-skill
```

该命令会把插件加入当前 profile 的 `package.json`（`dependencies` + `dsh.profile.bundles`）并安装到 `node_modules/@dhicoc/`。重启 `dsh web` 后即可在对话中调用。

> 手动安装：把 `"@dhicoc/dsh-chinese-traditional-wisdom-skill": "github:dhicoc/dsh-chinese-traditional-wisdom-skill"` 同时加入 profile 的 `dependencies` 与 `dsh.profile.bundles`，再 `pnpm install`。

## 在 dsh 中怎么用

安装并重启后，直接用自然语言描述问题即可，例如：

- “帮我用八字看一下 1990 年农历 X 月 X 日 X 时出生的四柱和喜用神”
- “想用六爻占一下要不要换工作”
- “紫微斗数排个盘”
- “查一下今天的黄历宜忌”

Agent 会先确认缺失的必要输入（出生时间、性别、起卦方式等，**不会猜填**），再调用本地引擎计算，最后分层给出结果。

## 仓库结构

```text
lib/index.js          # dsh 插件扫描器：递归发现 skills/ 下的 SKILL.md，并用 ctx.skills.registerProvider 注册
skills/               # 原样 vendored 的玄枢 Skill 内容（SKILL.md + 配套 .ts/.py 资源 + Dashboard），未经转换器修改
  SKILL.md            # Skill 主入口：路由、调用顺序与输出规范
  RULES.md            # 伦理、隐私、健康与输入完整性边界
  apps/visual/        # Dashboard + 纯 TypeScript 引擎 + 测试
  bootstrap/          # 分领域使用说明（八字 / 紫微 / 六爻 / 梅花 / 风水 …）
  knowledge-base/     # 传统文化资料与本地确定性映射表
  tool-index.md       # 32 个本地工具清单、标准 fixture 与 CLI 参考
cordis.patch.yml      # dsh bundle 注册描述（id: chinese-traditional-wisdom-skill）
package.json
```

## 开发 / 自测

```bash
node _selftest.mjs     # 用 mock 的 ctx.skills 验证「发现 SKILL.md + get() 返回正文」
```

## 发布

本插件通过 GitHub Actions（`.github/workflows/publish.yml`）发布到 npm：

- 触发方式：推送 `v*` tag（如 `v1.0.0`）或在 GitHub 创建 Release。
- 发布命令：`npm publish --access public`，使用仓库 secret `NPM_TOKEN` 鉴权。
- 包名：`@dhicoc/dsh-chinese-traditional-wisdom-skill`。

## 使用边界与隐私

- 不把传统文化结果当作绝对预测，也不替代个人判断、法律意见、财务建议或医疗服务。
- 健康问题出现症状、急性不适或持续困扰时，应优先就医。
- 不在日志或提交中保存完整生辰、精确地点或可识别身份信息。
- 完整伦理与安全规则见 `skills/RULES.md`。

## 许可证

MIT
