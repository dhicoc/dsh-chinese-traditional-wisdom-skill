# -*- coding: utf-8 -*-
"""Guard for the offline BaZi ten-gods oracle (scripts/bazi_calc.py::calc_ten_gods).

The expected table below is the canonical 十神 table, written out per day stem
independently of the implementation, so it cannot drift with the code it checks.

Relation is decided by element interaction plus yin/yang polarity:
  同我 → 比肩 (同阴阳) / 劫财 (异阴阳)
  我生 → 食神 / 伤官
  我克 → 偏财 / 正财
  克我 → 七杀 / 正官
  生我 → 偏印 / 正印

Run: python scripts/check_bazi_ten_gods.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scripts.lib.wuxing import TIANGAN
from scripts.bazi_calc import calc_ten_gods, calculate

# 每行 = 某个日主（行首字符）对十天干（甲…癸，列序固定）的十神。
EXPECTED = {
    '甲': ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'],
    '乙': ['劫财', '比肩', '伤官', '食神', '正财', '偏财', '正官', '七杀', '正印', '偏印'],
    '丙': ['偏印', '正印', '比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官'],
    '丁': ['正印', '偏印', '劫财', '比肩', '伤官', '食神', '正财', '偏财', '正官', '七杀'],
    '戊': ['七杀', '正官', '偏印', '正印', '比肩', '劫财', '食神', '伤官', '偏财', '正财'],
    '己': ['正官', '七杀', '正印', '偏印', '劫财', '比肩', '伤官', '食神', '正财', '偏财'],
    '庚': ['偏财', '正财', '七杀', '正官', '偏印', '正印', '比肩', '劫财', '食神', '伤官'],
    '辛': ['正财', '偏财', '正官', '七杀', '正印', '偏印', '劫财', '比肩', '伤官', '食神'],
    '壬': ['食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印', '比肩', '劫财'],
    '癸': ['伤官', '食神', '正财', '偏财', '正官', '七杀', '正印', '偏印', '劫财', '比肩'],
}


PILLAR_KEYS = [('year', 'year_pillar'), ('month', 'month_pillar'), ('day', 'day_pillar'), ('hour', 'hour_pillar')]

# 端到端冒烟：calculate() 是 calc_ten_gods 的唯一调用方，若它无法运行，
# 上表的十神口径就永远不会被执行到。
SMOKE_CASES = [
    ('1990-06-15', 'male', 12),
    ('1985-11-03', 'female', 7),
]


def main():
    passed = 0
    failures = []
    for day_idx, day in enumerate(TIANGAN):
        for other_idx, other in enumerate(TIANGAN):
            expected = EXPECTED[day][other_idx]
            actual = calc_ten_gods(day_idx, other_idx)
            if actual == expected:
                passed += 1
            else:
                failures.append(f'{day}日主见{other}: got {actual!r}, expected {expected!r}')

    for birth_date, gender, hour in SMOKE_CASES:
        try:
            result = calculate(birth_date, gender, hour)
        except Exception as exc:  # noqa: BLE001 - 冒烟要报出任何失败形态
            failures.append(f'calculate({birth_date}, {gender}, {hour}) raised {type(exc).__name__}: {exc}')
            continue

        day = result['day_stem']
        for pillar_name, pillar_key in PILLAR_KEYS:
            stem = result[pillar_key][0]
            actual = result['shishen'].get(pillar_name, {}).get('stem_ten_god')
            expected = EXPECTED[day][TIANGAN.index(stem)]
            if actual == expected:
                passed += 1
            else:
                failures.append(
                    f'calculate({birth_date}) {pillar_name}柱 {day}日主见{stem}: got {actual!r}, expected {expected!r}'
                )

    if failures:
        for line in failures[:20]:
            print(f'  {line}')
        if len(failures) > 20:
            print(f'  ... and {len(failures) - 20} more')
        print(f'bazi ten-gods oracle: {passed} passed, {len(failures)} failed')
        return 1

    print(f'bazi ten-gods oracle: {passed} passed, 0 failed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
