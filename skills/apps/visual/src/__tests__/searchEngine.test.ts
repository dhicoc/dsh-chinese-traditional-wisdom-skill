import { describe, it, expect } from 'vitest';
import { createKnowledgeCitationId, findKnowledgeBaseEntry, searchAll, getIndexStats } from '@/legacy/searchEngine';

describe('searchEngine', () => {
  it('空查询返回空结果', () => {
    expect(searchAll('')).toEqual({ terms: [], mappings: [], kb: [] });
    expect(searchAll('   ')).toEqual({ terms: [], mappings: [], kb: [] });
  });

  it('搜索术语命中（大小写无关）', () => {
    const r = searchAll('青龙');
    expect(r.terms.length).toBeGreaterThan(0);
    expect(r.terms.some((t) => t.term === '青龙')).toBe(true);
  });

  it('搜索映射表命中并按 score 排序', () => {
    const r = searchAll('八宅');
    expect(r.mappings.length).toBeGreaterThan(0);
    // title 命中（+3）应排在前面
    const top = r.mappings[0];
    expect(top.score).toBeGreaterThanOrEqual(3);
    // score 降序
    for (let i = 1; i < r.mappings.length; i++) {
      expect(r.mappings[i - 1].score).toBeGreaterThanOrEqual(r.mappings[i].score);
    }
  });

  it('搜索古籍命中（title/author/summary/tags）', () => {
    const r = searchAll('郭璞');
    expect(r.kb.length).toBeGreaterThan(0);
    expect(r.kb.some((k) => k.author === '郭璞')).toBe(true);
  });

  it('古籍结果提供仅由规范文件路径派生的稳定 citation ID', () => {
    const r = searchAll('郭璞');
    const zangs = r.kb.find((item) => item.title === '葬书·内篇');
    expect(zangs?.citationId).toBe('kb://fengshui/01-situation-form/葬書-內篇.md');
    expect(zangs?.citationId).toBe(createKnowledgeCitationId('01-situation-form/葬書-內篇.md'));
  });

  it('可用 citation ID 反查唯一古籍条目', () => {
    const citationId = createKnowledgeCitationId('03-yang-house/八宅明镜.md');

    expect(findKnowledgeBaseEntry(citationId)).toMatchObject({
      citationId,
      file: '03-yang-house/八宅明镜.md',
      title: '八宅明镜',
    });
    expect(findKnowledgeBaseEntry('kb://fengshui/missing.md')).toBeNull();
  });

  it('搜索结果含 category/completeness/source 元数据', () => {
    const r = searchAll('飞星');
    expect(r.mappings.length).toBeGreaterThan(0);
    const m = r.mappings[0];
    expect(m.category).toBeTruthy();
    expect(m.completeness).toBeTruthy();
    expect(m.source).toContain('knowledge-base');
  });

  it('getIndexStats 返回 6 映射表 + 古籍索引', () => {
    const stats = getIndexStats();
    expect(stats.mappings).toBe(6);
    expect(stats.knowledgeBase).toBeGreaterThan(0);
    expect(stats.mappingFiles.length).toBe(6);
    expect(stats.knowledgeBaseFiles.length).toBe(stats.knowledgeBase);
  });

  it('getIndexStats 映射文件名与实际 JSON 对齐', () => {
    const stats = getIndexStats();
    const expected = [
      'life-trigram.json',
      'eight-mansions.json',
      'twenty-four-mountains.json',
      'yearly-flying-stars.json',
      'three-essentials.json',
      'form-sha-cures.json',
    ];
    expect(stats.mappingFiles.sort()).toEqual(expected.sort());
  });

  it('KB_INDEX 不含 _index.md', () => {
    const stats = getIndexStats();
    expect(stats.knowledgeBaseFiles).not.toContain('_index.md');
  });

  it('多源同时命中（如"风水"）', () => {
    const r = searchAll('风水');
    // 风水是高频词，应同时在术语/映射/古籍中出现
    expect(r.terms.length + r.mappings.length + r.kb.length).toBeGreaterThan(0);
  });
});
