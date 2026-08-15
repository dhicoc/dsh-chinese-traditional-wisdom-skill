# -*- coding: utf-8 -*-
"""
Full Consultation Pipeline — 全链路咨询编排
顺序调用所有引擎生成综合咨询报告。

Usage:
  python scripts/full_consultation.py 1990-05-15 --gender male --hour 15
  python scripts/full_consultation.py 1990-05-15 --json
  python scripts/full_consultation.py 1990-05-15 --all --json
"""
import sys, json, os, subprocess

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

def run_script(name, args, timeout=30):
    path = os.path.join(SCRIPTS_DIR, name)
    if not os.path.exists(path):
        return {'error': 'Script not found: ' + path}
    try:
        cmd = [sys.executable, path] + args + ['--json']
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        if r.returncode == 0 and r.stdout.strip():
            return json.loads(r.stdout)
        return {'error': r.stderr[:300] if r.stderr else 'unknown error'}
    except subprocess.TimeoutExpired:
        return {'error': 'timeout'}
    except Exception as e:
        return {'error': str(e)}

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Full consultation pipeline')
    parser.add_argument('birth_date', help='Birth date (YYYY-MM-DD)')
    parser.add_argument('--gender', choices=['male', 'female'], default='male')
    parser.add_argument('--hour', type=int, default=12, help='Birth hour (0-23)')
    parser.add_argument('--all', action='store_true', help='Run all available engines')
    parser.add_argument('--json', action='store_true', help='JSON output')
    args = parser.parse_args()

    bazi_args = [args.birth_date, '--gender', args.gender, '--hour', str(args.hour)]
    yunqi_args = [args.birth_date.split('-')[0]]
    ziwei_args = [args.birth_date, '--gender', args.gender, '--hour', str(args.hour)]

    gender_cn = chr(30007) if args.gender == 'male' else chr(22899)

    # Always run core engines
    sys.stderr.write('[1/6] BaZi (八字)...\n')
    bazi = run_script('bazi_calc.py', bazi_args)

    sys.stderr.write('[2/6] WuYun-LiuQi (五运六气)...\n')
    yunqi = run_script('yunqi_calc.py', yunqi_args)

    sys.stderr.write('[3/6] Meihua Yishu (梅花易数)...\n')
    meihua = run_script('meihua_calc.py', ['--date', args.birth_date])

    # Optional engines (require pip packages)
    results = {
        'bazi': bazi if 'error' not in bazi else {'error': bazi['error']},
        'yunqi': yunqi if 'error' not in yunqi else {'error': yunqi['error']},
        'meihua': meihua if 'error' not in meihua else {'error': meihua['error']},
    }

    if args.all:
        sys.stderr.write('[4/6] Ziwei (紫微斗数)...\n')
        ziwei = run_script('ziwei_calc.py', ziwei_args, timeout=15)
        results['ziwei'] = ziwei if 'error' not in ziwei else {'error': ziwei['error']}

        # Liuyao: random divination example
        sys.stderr.write('[5/6] Liuyao (六爻)...\n')
        liuyao = run_script('liuyao_calc.py', ['--random'], timeout=15)
        results['liuyao'] = liuyao if 'error' not in liuyao else {'error': liuyao['error']}

        sys.stderr.write('[6/6] Constitution (中医体质)...\n')
        results['constitution'] = {
            'note': '体质分析需要用户填写问卷。请参考 bootstrap/constitution-questionnaire.md'}

    report = {
        'input': {
            'birth_date': args.birth_date,
            'gender': gender_cn,
            'hour': args.hour,
        },
        **results,
    }

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        b = report['bazi']
        y = report['yunqi']
        m = report['meihua']
        z = report.get('ziwei', {})
        l = report.get('liuyao', {})

        print()
        print('=== Full Consultation Report ===')
        print('Birth:', args.birth_date, 'Gender:', gender_cn)
        print()
        if 'error' not in b:
            print('[*] BaZi:', b.get('bazi', 'N/A'))
            print('    Elements:', json.dumps(b.get('elements', {}), ensure_ascii=False))
        if 'error' not in y:
            print('[*] YunQi:', y.get('dayun_display', 'N/A'))
        if 'error' not in m:
            print('[*] Meihua:', m.get('ben_gua', ''), '|', m.get('ti_yong', {}).get('interaction', ''))
        if 'error' not in z:
            print('[*] Ziwei:', z.get('minggong', ''), z.get('shenggong', ''))
        if 'error' not in l:
            print('[*] Liuyao:', l.get('hexagram_name', ''))
        print()
        print('* This report is AI-generated for traditional culture learning only *')

if __name__ == '__main__':
    main()
