# -*- coding: utf-8 -*-
"""
八字推算 (BaZi / Four Pillars Calculator)

计算四柱（年柱、月柱、日柱、时柱）、十神、五行统计、大运。

Usage:
  python scripts/bazi_calc.py 1990-05-15 --gender male --hour 15
  python scripts/bazi_calc.py 1990-05-15 --gender female --hour 15 --json
  python scripts/bazi_calc.py 1990-05-15 --gender male --json --full
"""

import sys, json, math
from datetime import date, datetime

# Add parent to path
sys.path.insert(0, __file__[:__file__.rfind('scripts')])
from scripts.lib.wuxing import (
    TIANGAN, DIZHI, TIANGAN_WUXING, DIZHI_WUXING,
    DIZHI_HIDDEN_STEMS, SEXAGENARY, SHENGXIAO,
    sexagenary_by_index, tiangan_index, dizhi_index,
)

# Reference: 1900-01-01 = sexagenary index 35 (己亥)
REFERENCE_DATE = date(1900, 1, 1)
REFERENCE_SEXAGENARY = 35  # 己亥

# 十神 (Ten Gods) - based on day stem vs other stems
SHI_SHEN_MAP = {
    ('比肩', '比肩'): '比肩', ('劫财', '劫财'): '劫财',
    ('偏印', '正印'): '偏印', ('正印', '偏印'): '正印',
    ('偏财', '正财'): '偏财', ('正财', '偏财'): '正财',
    ('七杀', '正官'): '七杀', ('正官', '七杀'): '正官',
    ('食神', '伤官'): '食神', ('伤官', '食神'): '伤官',
}

# 时柱 mapping: day_stem_index -> [hour_branch_index] stem
SHI_ZHU_TABLE = [
    # 甲己 乙庚 丙辛 丁壬 戊癸
    [0,2,4,6,8],     # 子 (23-1)
    [2,4,6,8,0],     # 丑 (1-3)
    [4,6,8,0,2],     # 寅 (3-5)
    [6,8,0,2,4],     # 卯 (5-7)
    [8,0,2,4,6],     # 辰 (7-9)
    [0,2,4,6,8],     # 巳 (9-11)
    [2,4,6,8,0],     # 午 (11-13)
    [4,6,8,0,2],     # 未 (13-15)
    [6,8,0,2,4],     # 申 (15-17)
    [8,0,2,4,6],     # 酉 (17-19)
    [0,2,4,6,8],     # 戌 (19-21)
    [2,4,6,8,0],     # 亥 (21-23)
]

# 立春日期（简化版，1900-2100年）
LICHUN_DATES = {
    1900: (2,4), 1901: (2,4), 1902: (2,5), 1903: (2,5), 1904: (2,5),
    1905: (2,4), 1906: (2,5), 1907: (2,5), 1908: (2,5), 1909: (2,4),
    1910: (2,5), 1911: (2,5), 1912: (2,5), 1913: (2,4), 1914: (2,5),
    1915: (2,5), 1916: (2,5), 1917: (2,4), 1918: (2,5), 1919: (2,5),
    1920: (2,5), 1921: (2,4), 1922: (2,5), 1923: (2,5), 1924: (2,5),
    1925: (2,4), 1926: (2,5), 1927: (2,5), 1928: (2,5), 1929: (2,4),
    1930: (2,5), 1931: (2,5), 1932: (2,5), 1933: (2,4), 1934: (2,5),
    1935: (2,5), 1936: (2,5), 1937: (2,4), 1938: (2,5), 1939: (2,5),
    1940: (2,5), 1941: (2,4), 1942: (2,5), 1943: (2,5), 1944: (2,5),
    1945: (2,4), 1946: (2,5), 1947: (2,5), 1948: (2,5), 1949: (2,4),
    1950: (2,5), 1951: (2,5), 1952: (2,5), 1953: (2,4), 1954: (2,5),
    1955: (2,5), 1956: (2,5), 1957: (2,4), 1958: (2,5), 1959: (2,5),
    1960: (2,5), 1961: (2,4), 1962: (2,5), 1963: (2,5), 1964: (2,5),
    1965: (2,4), 1966: (2,5), 1967: (2,5), 1968: (2,5), 1969: (2,4),
    1970: (2,5), 1971: (2,5), 1972: (2,5), 1973: (2,4), 1974: (2,5),
    1975: (2,5), 1976: (2,5), 1977: (2,4), 1978: (2,5), 1979: (2,5),
    1980: (2,5), 1981: (2,4), 1982: (2,5), 1983: (2,5), 1984: (2,5),
    1985: (2,4), 1986: (2,5), 1987: (2,5), 1988: (2,5), 1989: (2,4),
    1990: (2,5), 1991: (2,5), 1992: (2,5), 1993: (2,4), 1994: (2,5),
    1995: (2,5), 1996: (2,5), 1997: (2,4), 1998: (2,5), 1999: (2,5),
    2000: (2,5), 2001: (2,4), 2002: (2,5), 2003: (2,5), 2004: (2,5),
    2005: (2,4), 2006: (2,5), 2007: (2,5), 2008: (2,5), 2009: (2,4),
    2010: (2,5), 2011: (2,5), 2012: (2,5), 2013: (2,4), 2014: (2,5),
    2015: (2,5), 2016: (2,5), 2017: (2,4), 2018: (2,5), 2019: (2,5),
    2020: (2,5), 2021: (2,4), 2022: (2,5), 2023: (2,5), 2024: (2,5),
    2025: (2,4), 2026: (2,5), 2027: (2,5), 2028: (2,5), 2029: (2,4),
    2030: (2,5), 2031: (2,5), 2032: (2,5), 2033: (2,4), 2034: (2,5),
    2035: (2,5), 2036: (2,5), 2037: (2,4), 2038: (2,5), 2039: (2,5),
    2040: (2,5), 2041: (2,4), 2042: (2,5), 2043: (2,5), 2044: (2,5),
    2045: (2,4), 2046: (2,5), 2047: (2,5), 2048: (2,5), 2049: (2,4),
    2050: (2,5), 2051: (2,5), 2052: (2,5), 2053: (2,4), 2054: (2,5),
    2055: (2,5), 2056: (2,5), 2057: (2,4), 2058: (2,5), 2059: (2,5),
    2060: (2,5), 2061: (2,4), 2062: (2,5), 2063: (2,5), 2064: (2,5),
    2065: (2,4), 2066: (2,5), 2067: (2,5), 2068: (2,5), 2069: (2,4),
    2070: (2,5), 2071: (2,5), 2072: (2,5), 2073: (2,4), 2074: (2,5),
    2075: (2,5), 2076: (2,5), 2077: (2,4), 2078: (2,5), 2079: (2,5),
    2080: (2,5), 2081: (2,4), 2082: (2,5), 2083: (2,5), 2084: (2,5),
    2085: (2,4), 2086: (2,5), 2087: (2,5), 2088: (2,5), 2089: (2,4),
    2090: (2,5), 2091: (2,5), 2092: (2,5), 2093: (2,4), 2094: (2,5),
    2095: (2,5), 2096: (2,5), 2097: (2,4), 2098: (2,5), 2099: (2,5),
    2100: (2,5),
}

# Solar term month approximation
SOLAR_TERM_MONTH = {
    (2,4): 1, (3,6): 2, (4,5): 3, (5,6): 4, (6,6): 5, (7,7): 6,
    (8,8): 7, (9,8): 8, (10,8): 9, (11,7): 10, (12,7): 11, (1,6): 0,
}

def get_lichun(year):
    if year in LICHUN_DATES:
        return date(year, *LICHUN_DATES[year])
    return date(year, 2, 4)  # fallback

def calc_year_pillar(year, month, day):
    """年柱 with 立春 correction."""
    dt = date(year, month, day)
    lichun = get_lichun(year)
    if dt < lichun:
        year -= 1
    gan_idx = (year - 4) % 10
    zhi_idx = (year - 4) % 12
    return TIANGAN[gan_idx], DIZHI[zhi_idx], gan_idx, zhi_idx

def calc_month_pillar(year, month, day, year_gan):
    """月柱 via solar term approximation."""
    dt = date(year, month, day)
    # Check if before 立春 (month 0)
    lichun = get_lichun(year)
    if dt < lichun:
        solar_month = 0  # 丑月
    else:
        solar_month = None
        for (m, d), sm in sorted(SOLAR_TERM_MONTH.items()):
            ref = date(year if m > 1 else year + 1, m, d) if m <= month else date(year + 1, m, d)
            if (sm == 0 and m == 1 and d == 6):
                ref = date(year + 1, 1, 6)
            target = date(year, month, day) if sm != 0 or m != 1 else date(year + 1, month, day)
            if dt >= date(year, m, d) if m > 1 or (m == 1 and sm == 0) else dt >= date(year + 1, m, d):
                # check
                pass
        # Simplified: use month number
        if month >= 3:
            solar_month = month - 2
        elif month == 2 and day >= lichun.day:
            solar_month = 1
        else:
            solar_month = 0

    # 五虎遁: year_gan -> month stem start
    wuhudun_start = {0:2, 2:4, 4:6, 6:8, 8:0}  # 甲己→丙, 乙庚→戊, ...
    # Actually: 甲己之年丙作首, 乙庚之岁戊为头, 丙辛之年寻庚上, 丁壬壬寅顺水流, 戊癸何处起, 甲寅之上好追求
    year_gan_idx = tiangan_index(year_gan)
    start_map = {0:2, 2:4, 4:6, 6:8, 8:0}  # day stem index -> first month stem index
    start_stem = start_map.get(year_gan_idx % 10, 2)
    stem_idx = (start_stem + solar_month) % 10
    zhi_idx = (solar_month + 2) % 12  # 寅=2
    return TIANGAN[stem_idx], DIZHI[zhi_idx], stem_idx, zhi_idx

def calc_day_pillar(year, month, day):
    """日柱 via days from reference."""
    dt = date(year, month, day)
    delta = (dt - REFERENCE_DATE).days
    idx = (REFERENCE_SEXAGENARY + delta) % 60
    pair = sexagenary_by_index(idx)
    gan = pair[0]
    zhi = pair[1]
    return gan, zhi, tiangan_index(gan), dizhi_index(zhi)

def calc_hour_pillar(hour, day_gan_idx):
    """时柱 from hour + day stem."""
    branch_idx = (hour + 1) // 2 % 12
    table_row = SHI_ZHU_TABLE[branch_idx]
    day_group = day_gan_idx % 10 // 2  # 0:甲乙, 1:丙丁, 2:戊己, 3:庚辛, 4:壬癸
    stem_idx = table_row[day_group]
    return TIANGAN[stem_idx], DIZHI[branch_idx], stem_idx, branch_idx

def calc_ten_gods(day_gan_idx, other_gan_idx):
    """Calculate 十神 between day stem and another stem."""
    wx_day = TIANGAN_WUXING[day_gan_idx]
    wx_other = TIANGAN_WUXING[other_gan_idx]
    yy_day = day_gan_idx % 2  # 0=阳, 1=阴
    yy_other = other_gan_idx % 2

    from scripts.lib.wuxing import WUXING_SHENG, WUXING_KE
    if wx_day == wx_other:
        return '比肩' if yy_day == yy_other else '劫财'
    if WUXING_SHENG.get(wx_other) == wx_day:
        return '偏印' if yy_day != yy_other else '正印'
    if WUXING_SHENG.get(wx_day) == wx_other:
        return '食神' if yy_day == yy_other else '伤官'
    if WUXING_KE.get(wx_other) == wx_day:
        return '七杀' if yy_day != yy_other else '正官'
    if WUXING_KE.get(wx_day) == wx_other:
        return '偏财' if yy_day != yy_other else '正财'
    return ''

def calc_elements(gan, zhi, gan_weight=2, zhi_weight=2, hidden_weight=1):
    """Calculate 五行 statistics."""
    stats = {'木':0, '火':0, '土':0, '金':0, '水':0}
    gan_idx = tiangan_index(gan)
    zhi_idx = dizhi_index(zhi)
    if gan_idx >= 0:
        stats[TIANGAN_WUXING[gan_idx]] += gan_weight
    if zhi_idx >= 0:
        stats[DIZHI_WUXING[zhi_idx]] += zhi_weight
        for hg in DIZHI_HIDDEN_STEMS.get(DIZHI[zhi_idx], []):
            stats[TIANGAN_WUXING[tiangan_index(hg)]] += hidden_weight
    return stats

def calc_luck(day_gan_idx, gender, year_gan_idx):
    """Calculate 大运 periods."""
    is_yang = year_gan_idx % 2 == 0  # 阳年
    is_male = gender == 'male'
    forward = (is_yang and is_male) or (not is_yang and not is_male)

    # Starting age (simplified: 8 periods)
    start_age = 3
    luck_periods = []
    base_stem = day_gan_idx
    base_zhi = day_gan_idx % 12
    for i in range(8):
        if forward:
            s = (base_stem + i + 1) % 10
            z = (base_zhi + i + 1) % 12
        else:
            s = (base_stem - i - 1) % 10
            z = (base_zhi - i - 1) % 12
        age_start = start_age + i * 10
        age_end = age_start + 9
        luck_periods.append({
            'age': f'{age_start}-{age_end}',
            'pillar': TIANGAN[s] + DIZHI[z],
            'stem': TIANGAN[s],
            'branch': DIZHI[z],
        })
    return luck_periods


def calculate(birth_date, gender='male', hour=None, birth_time=None):
    """Main calculation function."""
    parts = birth_date.split('-')
    year, month, day = int(parts[0]), int(parts[1]), int(parts[2])

    if hour is None and birth_time is not None:
        hour = birth_time  # birth_time is the hour int

    # 年柱
    y_gan, y_zhi, y_gi, y_zi = calc_year_pillar(year, month, day)
    # 月柱
    m_gan, m_zhi, m_gi, m_zi = calc_month_pillar(year, month, day, y_gan)
    # 日柱
    d_gan, d_zhi, d_gi, d_zi = calc_day_pillar(year, month, day)
    # 时柱
    if hour is not None:
        h_gan, h_zhi, h_gi, h_zi = calc_hour_pillar(hour, d_gi)
    else:
        h_gan, h_zhi, h_gi, h_zi = '?', '?', -1, -1

    pillars = {
        'year': {'stem': y_gan, 'branch': y_zhi, 'gan_idx': y_gi, 'zhi_idx': y_zi},
        'month': {'stem': m_gan, 'branch': m_zhi, 'gan_idx': m_gi, 'zhi_idx': m_zi},
        'day': {'stem': d_gan, 'branch': d_zhi, 'gan_idx': d_gi, 'zhi_idx': d_zi},
        'hour': {'stem': h_gan, 'branch': h_zhi, 'gan_idx': h_gi, 'zhi_idx': h_zi},
    }

    # 四柱八字
    bazi = f'{y_gan}{y_zhi} {m_gan}{m_zhi} {d_gan}{d_zhi} {h_gan}{h_zhi}'

    # 五行统计
    all_stems = [s['stem'] for p in pillars.values() if s['stem'] != '?']
    all_branches = [p['branch'] for p in pillars.values() if p['branch'] != '?']

    elements = {'木':0,'火':0,'土':0,'金':0,'水':0}
    for s in all_stems:
        idx = tiangan_index(s)
        if idx >= 0:
            elements[TIANGAN_WUXING[idx]] += 2
    for b in all_branches:
        idx = dizhi_index(b)
        if idx >= 0:
            elements[DIZHI_WUXING[idx]] += 2
            for hg in DIZHI_HIDDEN_STEMS.get(b, []):
                elements[TIANGAN_WUXING[tiangan_index(hg)]] += 1

    # 十神
    shishen = {}
    for pillar_name, p in pillars.items():
        if p['gan_idx'] >= 0 and d_gi >= 0:
            ss = calc_ten_gods(d_gi, p['gan_idx'])
            shishen[pillar_name] = {'stem_ten_god': ss}

    # 大运
    luck = calc_luck(d_gi, gender, y_gi)

    result = {
        'birth_date': birth_date,
        'gender': '男' if gender == 'male' else '女',
        'bazi': bazi,
        'year_pillar': f'{y_gan}{y_zhi}',
        'month_pillar': f'{m_gan}{m_zhi}',
        'day_pillar': f'{d_gan}{d_zhi}',
        'hour_pillar': f'{h_gan}{h_zhi}',
        'day_stem': d_gan,
        'day_branch': d_zhi,
        'elements': elements,
        'shishen': shishen,
        'luck': luck,
        'shengxiao': SHENGXIAO.get((y_zi) % 12, ''),
    }
    return result


def main():
    import argparse
    parser = argparse.ArgumentParser(description='八字推算 (BaZi Calculator)')
    parser.add_argument('birth_date', help='出生日期 (YYYY-MM-DD)')
    parser.add_argument('--gender', choices=['male', 'female'], default='male', help='性别')
    parser.add_argument('--hour', type=int, default=None, help='出生时辰 (0-23)')
    parser.add_argument('--json', action='store_true', help='JSON output')
    args = parser.parse_args()

    result = calculate(args.birth_date, args.gender, args.hour)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f'=== 八字排盘 ===')
        print(f'出生: {result["birth_date"]} 性别: {result["gender"]}')
        print(f'八字: {result["bazi"]}')
        print(f'日主: {result["day_stem"]}')
        print(f'生肖: {result["shengxiao"]}')
        print(f'\n五行统计:')
        for wx, count in result['elements'].items():
            bar = '█' * int(count)
            print(f'  {wx}: {count} {bar}')
        print(f'\n大运:')
        for lp in result['luck'][:4]:
            print(f'  {lp["age"]}岁: {lp["pillar"]}')


if __name__ == '__main__':
    main()
