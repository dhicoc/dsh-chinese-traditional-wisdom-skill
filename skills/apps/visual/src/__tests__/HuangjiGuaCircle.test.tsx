import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { HuangjiGuaCircle } from '@/components/shared/HuangjiGuaCircle';

/**
 * 皇极经世先天六十四卦圆图测试。
 */

describe('HuangjiGuaCircle', () => {
  it('渲染 64 卦圆图并含三卦高亮', () => {
    const { container } = render(
      <HuangjiGuaCircle zhengGua="鼎" shiGua="恆" yearGua="豐" hui={7} yun={192} shi={2301} acumYear={69007} />,
    );
    const svg = container.querySelector('[data-testid="huangji-gua-circle"]');
    expect(svg).toBeTruthy();
    // 中心显示会/运/世 + 积年
    const texts = svg?.querySelectorAll('text');
    const allText = Array.from(texts ?? []).map((t) => t.textContent ?? '').join(' ');
    expect(allText).toContain('第 7 会');
    expect(allText).toContain('第 192 运');
    expect(allText).toContain('积年 69007');
    // 正卦鼎、世卦恆、年卦豐 卦名应出现在高亮标签
    expect(allText).toContain('鼎');
    expect(allText).toContain('正卦');
    expect(allText).toContain('世卦');
    expect(allText).toContain('年卦');
    // 方案B：普通卦名不在 text 显示（圆图干净），但通过 <title> tooltip 可查
    const titles = svg?.querySelectorAll('title');
    const allTitles = Array.from(titles ?? []).map((t) => t.textContent ?? '').join(' ');
    expect(allTitles).toContain('乾');
    expect(allTitles).toContain('坤');
    expect(allTitles).toContain('復');
  });

  it('高亮三卦在先天序中有确定位置', () => {
    const XIANTIAN = '乾,夬,大有,大壯,小畜,需,大畜,泰,履,兌,睽,歸妹,中孚,節,損,臨,同人,革,離,豐,家人,既濟,賁,明夷,无妄,隨,噬嗑,震,益,屯,頤,復,姤,大過,鼎,恆,巽,井,蠱,升,訟,困,未濟,解,渙,坎,蒙,師,遯,咸,旅,小過,漸,蹇,艮,謙,否,萃,晉,豫,觀,比,剝,坤'.split(',');
    expect(XIANTIAN).toContain('鼎');
    expect(XIANTIAN).toContain('恆');
    expect(XIANTIAN).toContain('豐');
    expect(XIANTIAN.length).toBe(64);
  });

  it('不同正卦更新高亮', () => {
    const { container, rerender } = render(
      <HuangjiGuaCircle zhengGua="乾" shiGua="坤" yearGua="復" hui={1} yun={1} shi={1} acumYear={67017} />,
    );
    let texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent ?? '').join(' ');
    expect(texts).toContain('乾');
    rerender(
      <HuangjiGuaCircle zhengGua="坤" shiGua="乾" yearGua="姤" hui={1} yun={1} shi={1} acumYear={67017} />,
    );
    texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent ?? '').join(' ');
    expect(texts).toContain('正卦');
  });
});
