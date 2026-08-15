/**
 * searchEngine — 全局搜索纯函数（从 visual/js/search.js 迁移，零 DOM 依赖）
 *
 * 统一搜索三个数据源：
 * 1. termExplanations — 303 条术语通俗解释（来自 legacy/termExplanations.json）
 * 2. mappings — 6 个风水 JSON 映射表索引
 * 3. knowledge-base — 31 个古籍文件索引
 *
 * 搜索逻辑纯函数，UI 浮层由 features/search/SearchModal.tsx 消费。
 */

import terms from './termExplanations.json';

// ─── 类型 ─────────────────────────────────────────────

export interface TermResult {
  term: string;
  explanation: string;
}

export interface MappingResult {
  file: string;
  source: string;
  title: string;
  category: string;
  completeness: string;
  summary: string;
  score: number;
}

export interface KbResult {
  file: string;
  citationId: string;
  title: string;
  author: string;
  category: string;
  completeness: string;
  summary: string;
  score: number;
}

export interface SearchResult {
  terms: TermResult[];
  mappings: MappingResult[];
  kb: KbResult[];
}

export interface IndexStats {
  mappings: number;
  knowledgeBase: number;
  mappingFiles: string[];
  knowledgeBaseFiles: string[];
}

// ─── 映射表索引（自包含，与映射 JSON 文件一一对应）──

interface MappingIndex {
  file: string;
  title: string;
  source: string;
  category: string;
  completeness: string;
  summary: string;
  tags: string[];
}

const MAPPING_INDEX: MappingIndex[] = [
  { file: 'life-trigram.json', title: '命卦速查表', source: 'knowledge-base/fengshui/mappings/life-trigram.json', category: '八宅命卦', completeness: '完整映射', summary: '根据出生年份和性别计算东四命/西四命', tags: ['命卦', '东四命', '西四命', '八宅', '八卦'] },
  { file: 'eight-mansions.json', title: '八宅大游年', source: 'knowledge-base/fengshui/mappings/eight-mansions.json', category: '八宅大游年', completeness: '完整映射', summary: '八宅派的八方吉凶星曜（生气/天医/延年/伏位/绝命/五鬼/六煞/祸害）', tags: ['八宅', '大游年', '吉星', '凶星', '生气', '绝命'] },
  { file: 'twenty-four-mountains.json', title: '二十四山', source: 'knowledge-base/fengshui/mappings/twenty-four-mountains.json', category: '罗盘方位', completeness: '完整映射', summary: '24山方位度数、五行属性、吉凶信息', tags: ['二十四山', '方位', '罗盘', '度数'] },
  { file: 'yearly-flying-stars.json', title: '流年飞星', source: 'knowledge-base/fengshui/mappings/yearly-flying-stars.json', category: '玄空飞星', completeness: '完整映射', summary: '玄空九星逐年飞布方位、吉凶色、化解方法', tags: ['飞星', '玄空', '九星', '流年', '紫白'] },
  { file: 'three-essentials.json', title: '阳宅三要', source: 'knowledge-base/fengshui/mappings/three-essentials.json', category: '阳宅门主灶', completeness: '完整映射', summary: '阳宅门主灶三要素的吉凶判断', tags: ['阳宅', '三要', '门', '主', '灶'] },
  { file: 'form-sha-cures.json', title: '形煞分类与化解', source: 'knowledge-base/fengshui/mappings/form-sha-cures.json', category: '形煞化解', completeness: '完整映射', summary: '常见风水形煞的识别、影响和化解方法', tags: ['形煞', '煞气', '化解', '风水'] },
];

// ─── 古籍索引（从 knowledge-base/fengshui/_index.md 提取）──

export interface KnowledgeBaseEntry {
  file: string;
  citationId: string;
  title: string;
  author: string;
  category: string;
  completeness: string;
  summary: string;
  tags: string[];
}

type KbIndex = Omit<KnowledgeBaseEntry, 'citationId'>;

const KB_INDEX: KbIndex[] = [
  { file: '01-situation-form/葬書-內篇.md', title: '葬书·内篇', author: '郭璞', category: '形势派', completeness: '完整', summary: '风水形势派纲领，论生气、藏风、得水', tags: ['葬书', '郭璞', '形势', '生气', '风水'] },
  { file: '01-situation-form/葬書-外篇.md', title: '葬书·外篇', author: '郭璞', category: '形势派', completeness: '完整', summary: '葬书外篇，续论形势与山水', tags: ['葬书', '郭璞', '形势'] },
  { file: '01-situation-form/葬書-雜篇.md', title: '葬书·杂篇', author: '郭璞', category: '形势派', completeness: '完整', summary: '葬书杂篇，补充形势断法', tags: ['葬书', '郭璞', '形势'] },
  { file: '01-situation-form/撼龙经.md', title: '撼龙经', author: '杨筠松', category: '形势派', completeness: '完整', summary: '形势派核心经典，详论龙脉识别', tags: ['撼龙经', '杨筠松', '龙脉', '形势'] },
  { file: '01-situation-form/疑龙经.md', title: '疑龙经', author: '杨筠松', category: '形势派', completeness: '部分', summary: '辨真假龙穴', tags: ['疑龙经', '杨筠松', '龙穴'] },
  { file: '01-situation-form/雪心赋.md', title: '雪心赋', author: '卜应天', category: '形势派', completeness: '完整', summary: '形势派重要文献', tags: ['雪心赋', '卜应天', '形势'] },
  { file: '01-situation-form/葬经翼.md', title: '葬经翼', author: '缪希雍', category: '形势派', completeness: '完整', summary: '形势派文献', tags: ['葬经翼', '缪希雍', '形势'] },
  { file: '02-principle-form/青囊经.md', title: '青囊经', author: '黄石公', category: '理气派', completeness: '完整', summary: '玄空理论之祖，含白话注释', tags: ['青囊经', '黄石公', '玄空', '理气'] },
  { file: '02-principle-form/青囊序.md', title: '青囊序', author: '曾文辿', category: '理气派', completeness: '完整', summary: '青囊经序文', tags: ['青囊序', '曾文辿', '玄空'] },
  { file: '02-principle-form/天玉经.md', title: '天玉经', author: '杨筠松', category: '理气派', completeness: '完整', summary: '玄空理气核心经典，详论玄空飞星', tags: ['天玉经', '杨筠松', '玄空', '飞星'] },
  { file: '02-principle-form/都天宝照经.md', title: '都天宝照经', author: '杨筠松', category: '理气派', completeness: '完整', summary: '玄空理气经典', tags: ['都天宝照经', '杨筠松', '玄空'] },
  { file: '02-principle-form/催官篇.md', title: '催官篇', author: '赖文俊', category: '理气派', completeness: '完整', summary: '理气派经典，论星峰方位与官禄', tags: ['催官篇', '赖文俊', '理气', '官禄'] },
  { file: '03-yang-house/阳宅三要.md', title: '阳宅三要', author: '赵九峰', category: '阳宅派', completeness: '完整', summary: '阳宅派核心经典，论门主灶三要', tags: ['阳宅三要', '门主灶', '阳宅'] },
  { file: '03-yang-house/八宅明镜.md', title: '八宅明镜', author: '箬冠道人', category: '阳宅派', completeness: '部分', summary: '八宅派经典，论东四/西四命与宅匹配', tags: ['八宅明镜', '八宅', '东四命', '西四命'] },
  { file: '03-yang-house/阳宅十书-全文.md', title: '阳宅十书·全文', author: '', category: '阳宅派', completeness: '完整', summary: '阳宅十书十章合集', tags: ['阳宅十书', '阳宅', '大游年', '福元'] },
  { file: '03-yang-house/阳宅十书-第1章-论宅外形.md', title: '阳宅十书·论宅外形', author: '', category: '阳宅派', completeness: '完整', summary: '住宅外形与环境判断', tags: ['阳宅十书', '宅外形', '形煞'] },
  { file: '03-yang-house/阳宅十书-第2章-论福元.md', title: '阳宅十书·论福元', author: '', category: '阳宅派', completeness: '完整', summary: '福元与命宅匹配', tags: ['阳宅十书', '福元', '命卦'] },
  { file: '03-yang-house/阳宅十书-第3章-论大游年.md', title: '阳宅十书·论大游年', author: '', category: '阳宅派', completeness: '完整', summary: '八宅大游年规则', tags: ['阳宅十书', '大游年', '八宅'] },
  { file: '03-yang-house/阳宅十书-第4章-论穿宫九星.md', title: '阳宅十书·论穿宫九星', author: '', category: '阳宅派', completeness: '完整', summary: '穿宫九星与宅法', tags: ['阳宅十书', '九星', '穿宫'] },
  { file: '03-yang-house/阳宅十书-第5章-论元空装卦.md', title: '阳宅十书·论元空装卦', author: '', category: '阳宅派', completeness: '完整', summary: '元空装卦规则', tags: ['阳宅十书', '元空', '装卦'] },
  { file: '03-yang-house/阳宅十书-第6章-论开门修造门.md', title: '阳宅十书·论开门修造门', author: '', category: '阳宅派', completeness: '完整', summary: '开门与修门规则', tags: ['阳宅十书', '开门', '修造'] },
  { file: '03-yang-house/阳宅十书-第7章-论放水.md', title: '阳宅十书·论放水', author: '', category: '阳宅派', completeness: '完整', summary: '放水与水路规则', tags: ['阳宅十书', '放水', '水法'] },
  { file: '03-yang-house/阳宅十书-第8章-论宅内形.md', title: '阳宅十书·论宅内形', author: '', category: '阳宅派', completeness: '完整', summary: '宅内形局判断', tags: ['阳宅十书', '宅内形', '布局'] },
  { file: '03-yang-house/阳宅十书-第9章-论宅选择.md', title: '阳宅十书·论宅选择', author: '', category: '阳宅派', completeness: '完整', summary: '择宅规则', tags: ['阳宅十书', '择宅', '选址'] },
  { file: '03-yang-house/阳宅十书-第10章-论符镇.md', title: '阳宅十书·论符镇', author: '', category: '阳宅派', completeness: '完整', summary: '符镇与化解记录', tags: ['阳宅十书', '符镇', '化解'] },
  { file: '04-comprehensive/宅经.md', title: '宅经', author: '', category: '综合类', completeness: '完整', summary: '黄帝宅经，综合宅法', tags: ['宅经', '黄帝宅经', '阳宅'] },
  { file: '04-comprehensive/管氏地理指蒙.md', title: '管氏地理指蒙', author: '管辂', category: '综合类', completeness: '部分', summary: '风水综合性经典，含序言与首章内容', tags: ['管氏地理指蒙', '管辂', '风水'] },
  { file: '04-comprehensive/地理大全.md', title: '地理大全', author: '李国木', category: '综合类', completeness: '目录', summary: '地理大全卷目结构', tags: ['地理大全', '风水', '目录'] },
  { file: '05-others/博山篇.md', title: '博山篇', author: '黄妙应', category: '其他', completeness: '完整', summary: '形法经典，八章全', tags: ['博山篇', '黄妙应', '形法'] },
  { file: '05-others/入地眼全书.md', title: '入地眼全书', author: '静道和尚', category: '其他', completeness: '框架', summary: '含五十字诀等框架内容', tags: ['入地眼全书', '风水', '五十字诀'] },
];

// ─── 搜索函数 ─────────────────────────────────────────

function indexOf(haystack: string, needle: string): number {
  return haystack.toLowerCase().indexOf(needle.toLowerCase());
}

export function createKnowledgeCitationId(file: string): string {
  return `kb://fengshui/${file}`;
}

const KNOWLEDGE_BASE_ENTRIES: KnowledgeBaseEntry[] = KB_INDEX.map((entry) => ({
  ...entry,
  citationId: createKnowledgeCitationId(entry.file),
}));

export function findKnowledgeBaseEntry(citationId: string): KnowledgeBaseEntry | null {
  return KNOWLEDGE_BASE_ENTRIES.find((entry) => entry.citationId === citationId) ?? null;
}

/** 全文搜索三源，返回按 score 降序的结果 */
export function searchAll(query: string): SearchResult {
  if (!query || query.length < 1) return { terms: [], mappings: [], kb: [] };
  const q = query.toLowerCase();

  // 1. 术语解释
  const terms_: TermResult[] = [];
  const termMap = terms as Record<string, string>;
  for (const key of Object.keys(termMap)) {
    const explanation = termMap[key];
    if (indexOf(key, q) !== -1 || indexOf(explanation, q) !== -1) {
      terms_.push({ term: key, explanation });
    }
  }

  // 2. 映射表
  const mappings: MappingResult[] = [];
  for (const m of MAPPING_INDEX) {
    let score = 0;
    if (indexOf(m.title, q) !== -1) score += 3;
    if (indexOf(m.summary, q) !== -1) score += 2;
    for (const t of m.tags) if (indexOf(t, q) !== -1) score += 3;
    if (score > 0) {
      mappings.push({ file: m.file, source: m.source, title: m.title, category: m.category, completeness: m.completeness, summary: m.summary, score });
    }
  }
  mappings.sort((a, b) => b.score - a.score);

  // 3. 古籍
  const kb: KbResult[] = [];
  for (const k of KB_INDEX) {
    let score = 0;
    if (indexOf(k.title, q) !== -1) score += 3;
    if (indexOf(k.summary, q) !== -1) score += 2;
    if (k.author && indexOf(k.author, q) !== -1) score += 2;
    for (const t of k.tags) if (indexOf(t, q) !== -1) score += 3;
    if (score > 0) {
      kb.push({
        file: k.file,
        citationId: createKnowledgeCitationId(k.file),
        title: k.title,
        author: k.author,
        category: k.category,
        completeness: k.completeness,
        summary: k.summary,
        score,
      });
    }
  }
  kb.sort((a, b) => b.score - a.score);

  return { terms: terms_, mappings, kb };
}

/** 索引统计（供契约测试与诊断面板使用） */
export function getIndexStats(): IndexStats {
  return {
    mappings: MAPPING_INDEX.length,
    knowledgeBase: KB_INDEX.length,
    mappingFiles: MAPPING_INDEX.map((m) => m.file),
    knowledgeBaseFiles: KB_INDEX.map((k) => k.file),
  };
}
