import { describe, expect, it } from 'vitest';
import { getCanonicalHexagram, resolveHexagram } from '@/legacy/ichingTexts';

describe('六十四卦精确解析', () => {
  it('按上卦与下卦精确解析，不以组合卦象名称模糊匹配', () => {
    expect(resolveHexagram('离', '坤')).toMatchObject({
      number: 35,
      name: '晋',
      upperTrigram: '离',
      lowerTrigram: '坤',
    });
    expect(resolveHexagram('乾', '兑')).toMatchObject({ number: 10, name: '履' });
    expect(resolveHexagram('离', '艮')).toMatchObject({ number: 56, name: '旅' });
  });

  it('卦序号可回查同一正式卦名与古籍文本', () => {
    const hexagram = getCanonicalHexagram(35);

    expect(hexagram).toMatchObject({ name: '晋', upperTrigram: '离', lowerTrigram: '坤' });
    expect(hexagram?.guaCi).toBeTruthy();
    expect(hexagram?.yaoCi).toHaveLength(6);
    expect(hexagram?.tuanZhuan).toBeTruthy();
  });
});
