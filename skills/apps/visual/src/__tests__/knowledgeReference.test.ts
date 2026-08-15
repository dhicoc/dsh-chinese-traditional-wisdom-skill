import { describe, expect, it } from 'vitest';
import { queryKnowledgeReferences } from '@/lib/knowledgeReference';

describe('knowledgeReference', () => {
  it('古籍引用返回稳定 citation ID', () => {
    const hit = queryKnowledgeReferences('郭璞').find((item) => item.title === '葬书·内篇');

    expect(hit?.kind).toBe('ancient-index');
    expect(hit?.citationId).toBe('kb://fengshui/01-situation-form/葬書-內篇.md');
    expect(hit?.source).toBe('01-situation-form/葬書-內篇.md');
  });

  it('映射表引用不伪装为古籍 citation', () => {
    const hit = queryKnowledgeReferences('生气').find((item) => item.kind === 'mapping');

    expect(hit).toBeDefined();
    expect(hit?.citationId).toBeUndefined();
  });
});
