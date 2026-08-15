# -*- coding: utf-8 -*-
"""
梅花易数推算 (Meihua Yishu / Plum Blossom Divination Calculator)

纯 Python 实现，无需外部依赖。

Usage:
  python scripts/meihua_calc.py --time          # 以当前时间起卦
  python scripts/meihua_calc.py --numbers 3 8 6  # 以数字起卦
  python scripts/meihua_calc.py --date 2026-06-27  # 以日期起卦
  python scripts/meihua_calc.py --time --json
"""

import sys, json, time, math
from datetime import datetime

# 八卦
BAGUA = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']
BAGUA_NUM = {'乾':1,'兑':2,'离':3,'震':4,'巽':5,'坎':6,'艮':7,'坤':8}
BAGUA_WUXING = {'乾':'金','兑':'金','离':'火','震':'木','巽':'木','坎':'水','艮':'土','坤':'土'}
BAGUA_QUXIANG = {
    '乾': '天,刚健,自强不息',
    '兑': '泽,喜悦,口舌交流',
    '离': '火,光明,热情美丽',
    '震': '雷,震动,奋发行动',
    '巽': '风,顺入,谦逊灵活',
    '坎': '水,险陷,智慧隐忍',
    '艮': '山,静止,稳固坚守',
    '坤': '地,柔顺,厚德载物',
}

# 五行相生相克
WUXING_SHENG = {'木':'火','火':'土','土':'金','金':'水','水':'木'}
WUXING_KE = {'木':'土','土':'水','水':'火','火':'金','金':'木'}

def num_to_gua(n):
    """Convert number (1-8) to trigram."""
    idx = (n - 1) % 8
    return BAGUA[idx]

def calc_interaction(shang, xia):
    """Calculate body-use interaction."""
    wx_shang = BAGUA_WUXING[shang]
    wx_xia = BAGUA_WUXING[xia]

    if wx_shang == wx_xia:
        return '比和 (吉)'
    if WUXING_SHENG.get(wx_xia) == wx_shang:
        return '用生体 (吉)'
    if WUXING_SHENG.get(wx_shang) == wx_xia:
        return '体生用 (凶)'
    if WUXING_KE.get(wx_xia) == wx_shang:
        return '用克体 (大凶)'
    if WUXING_KE.get(wx_shang) == wx_xia:
        return '体克用 (凶中带吉)'
    return ''

def calculate(numbers):
    """Calculate Meihua divination from three numbers."""
    if len(numbers) < 3:
        # Pad with current time
        now = datetime.now()
        while len(numbers) < 3:
            numbers.append(now.second % 8 + 1)

    shang_gua_num = numbers[0] % 8
    if shang_gua_num == 0:
        shang_gua_num = 8
    xia_gua_num = numbers[1] % 8
    if xia_gua_num == 0:
        xia_gua_num = 8
    dong_yao = numbers[2] % 6
    if dong_yao == 0:
        dong_yao = 6

    shang_gua = num_to_gua(shang_gua_num)
    xia_gua = num_to_gua(xia_gua_num)

    ben_gua = shang_gua + xia_gua
    interaction = calc_interaction(shang_gua, xia_gua)

    result = {
        'input_numbers': numbers,
        'shang_gua': {'name': shang_gua, 'wuxing': BAGUA_WUXING[shang_gua],
                      'quxiang': BAGUA_QUXIANG[shang_gua], 'number': shang_gua_num},
        'xia_gua': {'name': xia_gua, 'wuxing': BAGUA_WUXING[xia_gua],
                    'quxiang': BAGUA_QUXIANG[xia_gua], 'number': xia_gua_num},
        'ben_gua': ben_gua,
        'dong_yao': dong_yao,
        'ti_yong': {
            'ti_gua': xia_gua,
            'ti_wuxing': BAGUA_WUXING[xia_gua],
            'yong_gua': shang_gua,
            'yong_wuxing': BAGUA_WUXING[shang_gua],
            'interaction': interaction,
        },
    }
    return result


def calculate_by_time():
    """Calculate using current time."""
    now = datetime.now()
    month = now.month
    day = now.day
    hour = now.hour
    return calculate([month, day, hour + 1])


def main():
    import argparse
    parser = argparse.ArgumentParser(description='梅花易数推算 (Meihua Yishu)')
    parser.add_argument('--time', action='store_true', help='Use current time')
    parser.add_argument('--date', type=str, help='Use date (YYYY-MM-DD)')
    parser.add_argument('--numbers', type=int, nargs=3, help='Three numbers')
    parser.add_argument('--json', action='store_true', help='JSON output')
    args = parser.parse_args()

    if args.time:
        result = calculate_by_time()
    elif args.date:
        parts = args.date.split('-')
        result = calculate([int(parts[0]) % 8 + 1, int(parts[1]) % 8 + 1, int(parts[2]) % 6 + 1])
    elif args.numbers:
        result = calculate(list(args.numbers))
    else:
        # Default: use current time
        result = calculate_by_time()

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f'=== 梅花易数 ===')
        print(f'上卦: {result["shang_gua"]["name"]} ({result["shang_gua"]["wuxing"]}) - {result["shang_gua"]["quxiang"]}')
        print(f'下卦: {result["xia_gua"]["name"]} ({result["xia_gua"]["wuxing"]}) - {result["xia_gua"]["quxiang"]}')
        print(f'本卦: {result["ben_gua"]}')
        print(f'动爻: 第{result["dong_yao"]}爻')
        print(f'\n体用生克:')
        print(f'  体卦: {result["ti_yong"]["ti_gua"]} ({result["ti_yong"]["ti_wuxing"]})')
        print(f'  用卦: {result["ti_yong"]["yong_gua"]} ({result["ti_yong"]["yong_wuxing"]})')
        print(f'  结果: {result["ti_yong"]["interaction"]}')


if __name__ == '__main__':
    main()
