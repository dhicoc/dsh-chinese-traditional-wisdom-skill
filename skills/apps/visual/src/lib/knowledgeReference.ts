import eightMansions from '@kb/fengshui/mappings/eight-mansions.json';
import formShaCures from '@kb/fengshui/mappings/form-sha-cures.json';
import lifeTrigram from '@kb/fengshui/mappings/life-trigram.json';
import threeEssentials from '@kb/fengshui/mappings/three-essentials.json';
import twentyFourMountains from '@kb/fengshui/mappings/twenty-four-mountains.json';
import yearlyFlyingStars from '@kb/fengshui/mappings/yearly-flying-stars.json';
import { searchAll } from '@/legacy/searchEngine';

export type KnowledgeReferenceKind = 'mapping' | 'ancient-index';

export interface KnowledgeReferenceHit {
  id: string;
  citationId?: string;
  kind: KnowledgeReferenceKind;
  title: string;
  source: string;
  category: string;
  field: string;
  completeness: '完整映射' | '索引线索';
  summary: string;
  details: string[];
}

interface QueryOptions {
  limit?: number;
}

type PlainRecord = Record<string, unknown>;

const SOURCE_LABELS: Record<string, string> = {
  'life-trigram.json': '命卦映射表',
  'eight-mansions.json': '八宅大游年映射表',
  'twenty-four-mountains.json': '二十四山映射表',
  'yearly-flying-stars.json': '流年飞星映射表',
  'three-essentials.json': '阳宅三要映射表',
  'form-sha-cures.json': '形煞化解映射表',
  '_index.md': '风水知识库索引',
};

function normalizeTerm(term: string): string {
  return term.trim().toLocaleLowerCase('zh-CN');
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(stringify).join(' ');
  if (typeof value === 'object') return Object.values(value as PlainRecord).map(stringify).join(' ');
  return String(value);
}

function includesTerm(value: unknown, term: string): boolean {
  return stringify(value).toLocaleLowerCase('zh-CN').includes(term);
}

function pushUnique(hits: KnowledgeReferenceHit[], hit: KnowledgeReferenceHit): void {
  if (!hits.some((item) => item.id === hit.id)) hits.push(hit);
}

function mappingHit(input: Omit<KnowledgeReferenceHit, 'kind' | 'completeness'>): KnowledgeReferenceHit {
  return { ...input, kind: 'mapping', completeness: '完整映射' };
}

function queryTwentyFourMountains(term: string, hits: KnowledgeReferenceHit[]): void {
  const data = twentyFourMountains as { data: Array<Record<string, string | number>>; trigram_to_mountains: Record<string, string[]> };

  data.data.forEach((row) => {
    if (!includesTerm(row, term)) return;
    const mountain = String(row.mountain);
    pushUnique(hits, mappingHit({
      id: 'twenty-four-mountains:' + mountain,
      title: mountain + '山 · ' + row.direction,
      source: 'twenty-four-mountains.json',
      category: SOURCE_LABELS['twenty-four-mountains.json'],
      field: 'data[]',
      summary: mountain + '属' + row.wuxing + '，归' + row.bagua + '卦，度数 ' + row.degree_start + '°–' + row.degree_end + '°。',
      details: ['方位：' + row.direction, '阴阳：' + (row.yin_yang ?? '未标注'), '三合：' + (row.sanhe ?? '未标注')],
    }));
  });

  Object.entries(data.trigram_to_mountains).forEach(([trigram, mountains]) => {
    if (!includesTerm([trigram, mountains], term)) return;
    pushUnique(hits, mappingHit({
      id: 'trigram-mountains:' + trigram,
      title: trigram + '卦三山',
      source: 'twenty-four-mountains.json',
      category: SOURCE_LABELS['twenty-four-mountains.json'],
      field: 'trigram_to_mountains',
      summary: trigram + '卦对应 ' + mountains.join('、') + ' 三山。',
      details: ['用于罗盘方位与八卦分区的快速对照。'],
    }));
  });
}

function queryEightMansions(term: string, hits: KnowledgeReferenceHit[]): void {
  const data = eightMansions as {
    legend: { star_meanings: Record<string, string>; stars_by_luck: Record<string, string[]> };
    data: Record<string, Record<string, { star: string; luck: string; meaning: string }>>;
  };

  Object.entries(data.legend.star_meanings).forEach(([star, meaning]) => {
    if (!includesTerm([star, meaning], term)) return;
    const group = Object.entries(data.legend.stars_by_luck).find(([, stars]) => stars.includes(star))?.[0] ?? '未分组';
    pushUnique(hits, mappingHit({
      id: 'eight-mansions-star:' + star,
      title: star + ' · 游年星义',
      source: 'eight-mansions.json',
      category: SOURCE_LABELS['eight-mansions.json'],
      field: 'legend.star_meanings',
      summary: meaning,
      details: ['吉凶分组：' + group],
    }));
  });

  Object.entries(data.data).forEach(([lifeName, table]) => {
    Object.entries(table).forEach(([direction, item]) => {
      if (!includesTerm([lifeName, direction, item], term)) return;
      pushUnique(hits, mappingHit({
        id: 'eight-mansions:' + lifeName + ':' + direction,
        title: lifeName + ' · ' + direction,
        source: 'eight-mansions.json',
        category: SOURCE_LABELS['eight-mansions.json'],
        field: 'data.{命卦}.{方位}',
        summary: direction + '为' + item.star + '，吉凶：' + item.luck + '。' + item.meaning,
        details: ['命卦：' + lifeName, '游年：' + item.star],
      }));
    });
  });
}

function queryLifeTrigram(term: string, hits: KnowledgeReferenceHit[]): void {
  const data = lifeTrigram as {
    remainder_to_trigram: Record<string, { trigram?: string; pinyin?: string; wuxing?: string; group?: string; gua_number?: number; description?: string }>;
    east_group: { name: string; trigrams: string[]; lucky_directions: string[]; unlucky_directions: string[] };
    west_group: { name: string; trigrams: string[]; lucky_directions: string[]; unlucky_directions: string[] };
  };

  Object.entries(data.remainder_to_trigram).forEach(([remainder, item]) => {
    if (!includesTerm([remainder, item], term)) return;
    pushUnique(hits, mappingHit({
      id: 'life-trigram:' + remainder,
      title: item.trigram ? item.trigram + '卦命 · 余数 ' + remainder : '余数 ' + remainder,
      source: 'life-trigram.json',
      category: SOURCE_LABELS['life-trigram.json'],
      field: 'remainder_to_trigram',
      summary: item.trigram ? item.trigram + '卦属' + item.wuxing + '，' + item.group + '，卦数 ' + item.gua_number + '。' : item.description ?? '特殊余数规则。',
      details: [item.pinyin ? '拼音：' + item.pinyin : '余数 5 需按性别寄宫。'],
    }));
  });

  [data.east_group, data.west_group].forEach((group) => {
    if (!includesTerm(group, term)) return;
    pushUnique(hits, mappingHit({
      id: 'life-group:' + group.name,
      title: group.name,
      source: 'life-trigram.json',
      category: SOURCE_LABELS['life-trigram.json'],
      field: group.name === '东四命' ? 'east_group' : 'west_group',
      summary: group.name + '包含 ' + group.trigrams.join('、') + '，宜 ' + group.lucky_directions.join('、') + '。',
      details: ['不利方：' + group.unlucky_directions.join('、')],
    }));
  });
}

function queryFlyingStars(term: string, hits: KnowledgeReferenceHit[]): void {
  const data = yearlyFlyingStars as {
    nine_stars: Record<string, { name: string; wuxing: string; star_name: string; luck: string; meaning: string; disease?: string; cure_if_bad?: string }>;
    yearly_flying_stars: Record<string, unknown>;
  };

  Object.entries(data.nine_stars).forEach(([number, star]) => {
    if (!includesTerm([number, star], term)) return;
    pushUnique(hits, mappingHit({
      id: 'flying-star:' + number,
      title: star.name + (star.star_name ? '（' + star.star_name + '）' : ''),
      source: 'yearly-flying-stars.json',
      category: SOURCE_LABELS['yearly-flying-stars.json'],
      field: 'nine_stars',
      summary: star.name + '属' + star.wuxing + '，吉凶：' + star.luck + '。' + star.meaning,
      details: [star.disease ? '关联提示：' + star.disease : '暂无特别关联提示。', star.cure_if_bad ? '传统化解：' + star.cure_if_bad : '暂无传统化解说明。'],
    }));
  });

  Object.entries(data.yearly_flying_stars).forEach(([key, value]) => {
    if (!includesTerm([key, value], term)) return;
    pushUnique(hits, mappingHit({
      id: 'yearly-flying:' + key,
      title: '流年飞星排布规则',
      source: 'yearly-flying-stars.json',
      category: SOURCE_LABELS['yearly-flying-stars.json'],
      field: 'yearly_flying_stars.' + key,
      summary: stringify(value).slice(0, 120),
      details: ['与该关键词相关的流年飞星说明。'],
    }));
  });
}

function queryThreeEssentials(term: string, hits: KnowledgeReferenceHit[]): void {
  const data = threeEssentials as {
    concept: Record<string, string>;
    door_main_combinations: { key_combinations: Array<Record<string, string>> };
    stove_rules: Record<string, unknown>;
  };

  Object.entries(data.concept).forEach(([name, meaning]) => {
    if (!includesTerm([name, meaning], term)) return;
    pushUnique(hits, mappingHit({
      id: 'three-essentials:' + name,
      title: '阳宅三要 · ' + name,
      source: 'three-essentials.json',
      category: SOURCE_LABELS['three-essentials.json'],
      field: 'concept',
      summary: meaning,
      details: ['用于门、主、灶三者关系的基础解释。'],
    }));
  });

  data.door_main_combinations.key_combinations.forEach((item, index) => {
    if (!includesTerm(item, term)) return;
    pushUnique(hits, mappingHit({
      id: 'door-main:' + index,
      title: item.door + ' · ' + item.main,
      source: 'three-essentials.json',
      category: SOURCE_LABELS['three-essentials.json'],
      field: 'door_main_combinations.key_combinations',
      summary: item.star + '（' + item.luck + '）：' + item.judgment,
      details: ['传统调整：' + item.cure],
    }));
  });

  if (includesTerm(data.stove_rules, term)) {
    pushUnique(hits, mappingHit({
      id: 'stove-rules',
      title: '灶位规则',
      source: 'three-essentials.json',
      category: SOURCE_LABELS['three-essentials.json'],
      field: 'stove_rules',
      summary: '灶位规则中包含该关键词，适合继续查看阳宅三要映射表。',
      details: [stringify(data.stove_rules).slice(0, 160)],
    }));
  }
}

function queryFormSha(term: string, hits: KnowledgeReferenceHit[]): void {
  const data = formShaCures as { categories: Record<string, string>; form_sha_table: Array<Record<string, string>> };

  Object.entries(data.categories).forEach(([name, meaning]) => {
    if (!includesTerm([name, meaning], term)) return;
    pushUnique(hits, mappingHit({
      id: 'sha-category:' + name,
      title: '形煞分类 · ' + name,
      source: 'form-sha-cures.json',
      category: SOURCE_LABELS['form-sha-cures.json'],
      field: 'categories',
      summary: meaning,
      details: ['用于形势派煞气分类的快速入口。'],
    }));
  });

  data.form_sha_table.forEach((item) => {
    if (!includesTerm(item, term)) return;
    pushUnique(hits, mappingHit({
      id: 'form-sha:' + item.name,
      title: item.name,
      source: 'form-sha-cures.json',
      category: SOURCE_LABELS['form-sha-cures.json'],
      field: 'form_sha_table',
      summary: item.type + ' · ' + item.severity + '：' + item.description,
      details: ['影响：' + item.effect, '常规化解：' + item.standard_cure],
    }));
  });
}

function queryAncientIndex(term: string, hits: KnowledgeReferenceHit[]): void {
  searchAll(term)
    .kb
    .slice(0, 6)
    .forEach((entry) => {
      pushUnique(hits, {
        id: entry.citationId,
        citationId: entry.citationId,
        kind: 'ancient-index',
        title: entry.title,
        source: entry.file,
        category: entry.category,
        field: entry.file,
        completeness: '索引线索',
        summary: entry.summary,
        details: [
          entry.author ? `作者：${entry.author}` : '作者：未标注',
          `完整性：${entry.completeness}`,
          '可作为继续阅读古籍正文的入口。',
        ],
      });
    });
}

export function queryKnowledgeReferences(rawTerm: string, options: QueryOptions = {}): KnowledgeReferenceHit[] {
  const term = normalizeTerm(rawTerm);
  if (!term) return [];

  const hits: KnowledgeReferenceHit[] = [];
  queryTwentyFourMountains(term, hits);
  queryEightMansions(term, hits);
  queryLifeTrigram(term, hits);
  queryFlyingStars(term, hits);
  queryThreeEssentials(term, hits);
  queryFormSha(term, hits);
  queryAncientIndex(term, hits);

  return hits.slice(0, options.limit ?? 12);
}

export const KNOWLEDGE_REFERENCE_PRESETS = ['坎', '离', '生气', '五黄', '二十四山', '门', '反弓煞'] as const;
