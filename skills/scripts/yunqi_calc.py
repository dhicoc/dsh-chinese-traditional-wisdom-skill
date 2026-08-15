# -*- coding: utf-8 -*-
"""
五运六气推算 (WuYun-LiuQi / Five Movements & Six Qi Calculator)

Usage:
  python scripts/yunqi_calc.py 2026
  python scripts/yunqi_calc.py 2026 --month 6 --day 27
  python scripts/yunqi_calc.py 2026 --json
"""

import sys, json

WUXING = ['木', '火', '土', '金', '水']
TIANGAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
DIZHI   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

# 岁运: 甲己土, 乙庚金, 丙辛水, 丁壬木, 戊癸火
WUYUN_MAP = {0:'土',2:'金',4:'水',6:'木',8:'火'}
WUYUN_LEVEL = {0:'土',2:'金',4:'水',6:'木',8:'火'}
DAYUN_TOOGUO = {0:(False,True),1:(True,False),2:(False,True),3:(True,False),
                4:(False,True),5:(True,False),6:(False,True),7:(True,False),
                8:(False,True),9:(True,False)}  # (yang_odd → guo/不及)... 甲/丙/戊/庚/壬=阳年太过

def calc_dayun(year):
    gan_idx = (year - 4) % 10
    wx = WUYUN_MAP.get(gan_idx % 10, '?')
    is_excess = gan_idx % 2 == 0  # 阳干=太过
    level = '太过' if is_excess else '不及'
    return {'gan': TIANGAN[gan_idx], 'wuxing': wx, 'level': level,
            'gan_idx': gan_idx}

# 司天在泉
SITIAN_TABLE = {
    0:'少阴君火',1:'太阴湿土',2:'少阳相火',
    3:'阳明燥金',4:'太阳寒水',5:'厥阴风木'
}

def calc_sitian_zaiquan(year):
    zhi = (year - 4) % 12
    idx = zhi // 2
    dz = DIZHI[zhi]
    sitian = SITIAN_TABLE.get(idx % 6, '?')
    zaiquan = SITIAN_TABLE.get((idx + 3) % 6, '?')
    return {'dizhi': dz, 'sitian': sitian, 'zaiquan': zaiquan}

# 客气六步
LIUQI_ORDER = ['厥阴风木','少阴君火','太阴湿土','少阳相火','阳明燥金','太阳寒水']

def calc_keqi(year):
    zhi = (year - 4) % 12
    sitian_idx = zhi // 2
    start_idx = (sitian_idx - 2 + 6) % 6
    steps = []
    liuqi_names = ['初之气','二之气','三之气','四之气','五之气','六之气']
    for i in range(6):
        qi = LIUQI_ORDER[(start_idx + i) % 6]
        is_sitian = (i == 3)
        is_zaiquan = (i == 0)
        label = f'司天' if is_sitian else (f'在泉' if is_zaiquan else '')
        marking = '★' if is_sitian else ('☆' if is_zaiquan else '')
        steps.append({'step': liuqi_names[i], 'qi': qi, 'marking': marking,
                      'is_sitian': is_sitian, 'is_zaiquan': is_zaiquan})
    return steps

def calc(year, month=None, day=None):
    dayun = calc_dayun(year)
    sitian = calc_sitian_zaiquan(year)
    keqi = calc_keqi(year)

    result = {
        'year': year,
        'ganzhi_year': TIANGAN[(year-4)%10] + DIZHI[(year-4)%12],
        'dayun': dayun,
        'dayun_display': f'{dayun["wuxing"]}运{dayun["level"]}',
        'sitian': sitian['sitian'],
        'zaiquan': sitian['zaiquan'],
        'keqi_steps': keqi,
        'shengxiao': ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'][(year-4)%12],
    }

    if month is not None and day is not None:
        # Dahan boundary check for yunqi year
        if (month == 1 and day < 20) or (month == 2 and day < 4 and month == 2):
            result['yunqi_year'] = year - 1
            result['yunqi_ganzhi'] = TIANGAN[(year-5)%10] + DIZHI[(year-5)%12]
        else:
            result['yunqi_year'] = year
            result['yunqi_ganzhi'] = result['ganzhi_year']

    return result

def main():
    import argparse
    parser = argparse.ArgumentParser(description='五运六气推算')
    parser.add_argument('year', type=int, help='年份')
    parser.add_argument('--month', type=int, help='月份')
    parser.add_argument('--day', type=int, help='日期')
    parser.add_argument('--json', action='store_true', help='JSON output')
    args = parser.parse_args()

    result = calc(args.year, args.month, args.day)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f'=== {args.year}年 五运六气 ===')
        print(f'干支: {result["ganzhi_year"]}  生肖: {result["shengxiao"]}')
        print(f'\n岁运: {result["dayun_display"]}')
        print(f'  天干: {result["dayun"]["gan"]} → {result["dayun"]["wuxing"]}运{result["dayun"]["level"]}')
        print(f'\n司天: {result["sitian"]}')
        print(f'在泉: {result["zaiquan"]}')
        print(f'\n客气六步:')
        for s in result['keqi_steps']:
            print(f'  {s["step"]}: {s["qi"]} {s["marking"]}')

if __name__ == '__main__':
    main()
