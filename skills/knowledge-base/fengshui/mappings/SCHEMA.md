# 风水映射表 Schema 约定

本目录 6 个 JSON 文件保持现有路径和业务含义不变，新增以下结构约束用于维护和回归测试。

## 通用字段

每个映射表必须包含：

- `name`：表名。
- `description`：用途说明。
- `source`：主要来源或综合来源。
- `version`：表结构版本。

## 文件级约束

| 文件 | 关键约束 |
|------|----------|
| `life-trigram.json` | `remainder_to_trigram` 覆盖 `1` 到 `9`；`east_group`、`west_group` 均声明命卦、吉方、凶方。 |
| `eight-mansions.json` | `legend.star_meanings` 覆盖八游年星；`data` 中每个命卦覆盖北、东北、东、东南、南、西南、西、西北。 |
| `twenty-four-mountains.json` | `data` 必须为 24 条；每条包含 `order`、`mountain`、`direction`、`degree_start`、`degree_end`、`wuxing`、`bagua`。 |
| `yearly-flying-stars.json` | `nine_stars` 覆盖 `1` 到 `9`；`yearly_flying_stars` 至少包含一个可查年份，后续可逐步扩充。 |
| `three-essentials.json` | `concept` 包含门、主、灶；`door_main_combinations.key_combinations` 保留门主组合样例。 |
| `form-sha-cures.json` | `form_sha_table` 为非空数组；每条包含 `name`、`type`、`description`、`severity`、`effect`、`standard_cure`。 |

## 校验入口

在仓库根目录执行：

```bash
node apps/visual/scripts/check-mapping-schema.mjs
```

该脚本只校验结构完整性和覆盖范围，不判断传统术数规则本身是否正确。
