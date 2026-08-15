# -*- coding: utf-8 -*-
"""
紫微斗数推算 (Ziwei Doushu Calculator)

依赖: iztro-py (pip install iztro-py)

Usage:
  python scripts/ziwei_calc.py 1990-05-15 --gender male --hour 15
  python scripts/ziwei_calc.py 1990-05-15 --gender male --hour 15 --json
"""

import sys, json

def calculate(birth_date, gender='male', hour=12):
    """Calculate Ziwei chart using iztro-py."""
    try:
        from iztro import astrolabe
    except ImportError:
        return {'error': 'iztro-py not installed. Run: pip install iztro-py'}

    try:
        # Parse date
        parts = birth_date.split('-')
        year, month, day = int(parts[0]), int(parts[1]), int(parts[2])

        # iztro-py API:
        # astrolabe.generate(year, month, day, hour, gender, fix=True)
        result = astrolabe.generate(year, month, day, hour, gender, fix=True)

        # Extract key data
        palaces = []
        if hasattr(result, 'palaces'):
            for p in result.palaces:
                palaces.append({
                    'name': getattr(p, 'name', ''),
                    'stars': [{'name': s.name, 'brightness': s.brightness} for s in getattr(p, 'stars', []) if hasattr(s, 'name')],
                })

        minggong = result.minggong if hasattr(result, 'minggong') else None
        shenggong = result.shenggong if hasattr(result, 'shenggong') else None

        return {
            'birth_date': birth_date,
            'gender': gender,
            'minggong': getattr(minggong, 'name', '') if minggong else '',
            'shenggong': getattr(shenggong, 'name', '') if shenggong else '',
            'palaces': palaces,
            'day_stem': result.day_stem if hasattr(result, 'day_stem') else '',
            'day_branch': result.day_branch if hasattr(result, 'day_branch') else '',
        }
    except Exception as e:
        return {'error': f'Calculation failed: {str(e)}'}


def main():
    import argparse
    parser = argparse.ArgumentParser(description='紫微斗数推算 (Ziwei Calculator)')
    parser.add_argument('birth_date', help='Birth date (YYYY-MM-DD)')
    parser.add_argument('--gender', choices=['male', 'female'], default='male', help='Gender')
    parser.add_argument('--hour', type=int, default=12, help='Birth hour (0-23)')
    parser.add_argument('--json', action='store_true', help='JSON output')
    args = parser.parse_args()

    result = calculate(args.birth_date, args.gender, args.hour)

    if 'error' in result:
        print(f'ERROR: {result["error"]}')
        sys.exit(1)

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(f'=== 紫微斗数排盘 ===')
        print(f'出生: {result["birth_date"]} 性别: {"男" if args.gender == "male" else "女"}')
        print(f'命宫: {result.get("minggong", "")}')
        print(f'身宫: {result.get("shenggong", "")}')
        print(f'\n十二宫:')
        for p in result.get('palaces', [])[:6]:
            star_names = ', '.join([s['name'] for s in p.get('stars', [])[:3]])
            print(f'  {p["name"]}: {star_names}')


if __name__ == '__main__':
    main()
