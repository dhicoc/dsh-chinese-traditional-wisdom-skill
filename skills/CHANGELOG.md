# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与语义化版本。发布前阶段没有正式 tag；`v1.0.0` 是首个稳定版本。

## [Unreleased]

### Fixed

- 八字十神此前只按「目标天干索引 − 日主索引」查固定表，未使用日主自身五行，导致 100 组日主×天干中有 40 组错位：阳干日主在索引差 1、8 处把比劫与印的锚点插反，阴干日主有 6/10 组五行分界线整体偏移，并连带影响四柱与藏干十神、动态层的流年/流月/流日十神及报告文案。现改由五行生克与阴阳同异推导，与进阶分析既有口径一致。
- Dashboard SVG 图表右键复制会丢失页面 CSS 变量、生成黑色 PNG，且异步渲染后可能失去剪贴板用户授权的问题；导出现在固化实际绘制样式并在右键手势内启动写入。

### Security

- `source-map-js` 升到已修补的 `1.2.2`（GHSA-68fv-2mgg-jv7q）。
- 构建工具（`vite`、`typescript`、`tailwindcss`、`postcss`、`autoprefixer`、`@vitejs/plugin-react`）由 `dependencies` 归位到 `devDependencies`，使 `pnpm audit --prod` 只审计真正随静态产物考虑的依赖，不再把构建期传递依赖（`tailwindcss>chokidar>braces`）计为生产漏洞。

### Added

- 皇极经世新增按需加载的 Three.js 六十四卦时间轮：64卦源序与六爻纹样、正卦/世卦/年卦三角色轨道、会运世积年核心、俯视/时间轮/巡行/分层控制，并保留二维 SVG 精读与 WebGL 降级。
- 二十八星宿新增按需加载的 Three.js 三维星盘：28 宿四象分组、值日/本命双高亮、俯视/浑天/巡游/星环控制、指针与键盘选择，并保留二维 SVG 精读和 WebGL 降级。
- 抽取通用 `ThreeChartHost`，统一 3D 图表的 OrbitControls、悬停滚轮捕获、相机距离、响应式、离屏暂停、Context Lost 回退和资源销毁。
- 风水罗盘新增按需加载的 Three.js 三维交互模式：真实浅浮雕层盘、八卦实体爻线、俯视/立体/自转/分层控制、指针与键盘选择、WebGL/SVG 渐进降级；二维 SVG 继续作为精确阅读与导出默认。
- 周易六十四卦完整知识切片：文王卦序、上下卦矩阵、六爻定位、卦辞/六爻辞/彖传、错综互变、六爻/梅花联动及独立 `engine:iching-lookup`。

### Changed

- 六爻结果的 `hexagramNumber` / `changingHexagramNumber` 统一改用文王卦序，修复此前按对象插入顺序编号的问题。
- 古籍阅读器升级为面向读者的本地典籍书库：提供 30 篇书目浏览、作者与主题筛选、原文检索、阅读导览和友好状态提示，并隐藏内部引用、路径与整理标记。

## [1.0.0] - 2026-08-21

### Added

- 32 个本地 TypeScript 工具的统一 registry、输入契约、CLI 分发与标准 fixture。
- Agent 自描述命令：`engine:list`、`engine:describe`、`engine:verify`、`engine:present`。
- 隐私安全 provenance、canonical JSON、结果包生成与完整性验证。
- `engine:plan` 参数规划器、`engine:bazi-time-sensitivity` 时辰不确定性及 `engine:compare-rules` 六域规则比较。
- 24 个 Dashboard 工作区、完整命令面板、结构化报告、古籍全文检索与 95 个稳定章节深链接。
- 知识 Manifest、第三方来源清单、字义/古籍索引/解梦数据分片与 bundle budget。
- 本地历史 opt-in 保存预览、自动过期、一键清空和可复核结果包导入/导出。
- 19 项离线 Skill 行为评测并接入 GitHub Actions。

### Changed

- TypeScript 成为 Agent 与 Dashboard 唯一用户可见计算来源；Python 仅作离线 oracle。
- `bazi_calculate` 必须显式声明 `timeBasis`；真太阳时仅接受完整且可复算的核验证据。
- 飞星、八宅和联合工具的年份、月份与目标日期改为显式输入，不再由 CLI 读取系统时间。
- 生产报告全面使用类型化语义，不再从自由文本关键词推断 tone 或 action。
- 本地历史从自动保存改为默认不保存、确认后保存。

### Privacy

- 结果包固定 `inputIncluded: false`、`replayable: false`。
- 历史、报告、fixture 和评测报告不保存真实完整生辰、地点、姓名或原始问题。
- 不提供远端账户、同步、服务端 session、持久 token 或远程计算。

### Security

- 将 `postcss` 的传递依赖 `nanoid` 从 3.3.17 强制升级到已修复的 3.3.18，消除 GHSA-2v37-7h3g-55p8。
- 默认 Python oracle requirements 改为可在 Python 3.13 冷安装的固定版本；原生六爻 oracle 移为可选。
- 新增发布契约、官方 npm audit、隔离 Python 安装与密钥扫描证据。

### Performance

- 字义拆分为 32 片、古籍搜索索引拆分为 4 片、解梦数据拆分为 22 片。
- 所有 JavaScript gzip 均低于 250KB；发布基线最大 gzip 为 217461 bytes。

### Verification

- 69 个测试文件、800 项单元测试。
- 19/19 Skill 行为评测。
- 四浏览器全量 E2E 456/456。
- 发布级真实用户全链路与四浏览器证据已归档在 v1.0.0 GitHub Release。

### Product Decisions

- P0-03 细粒度安全文案扫描不实施；保留全局免责声明。
- P1-02 能力状态四维拆分不实施。
- P3-04 `riskSafetyGate` 不实施，不新增工具执行阻断。
- 完整输入历史持久化不实施，采用更严格的“不保存”。

[1.0.0]: https://github.com/dhicoc/chinese-traditional-wisdom-skill/releases/tag/v1.0.0
