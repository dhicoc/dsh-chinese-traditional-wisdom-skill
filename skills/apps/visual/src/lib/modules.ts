export type ModuleGroup = '易学源流' | '术数排盘' | '堪舆风水' | '医道运气' | '日用工具' | '知识检索' | '古籍与历史';

export type ModuleStatus = 'local-exact' | 'local-approx' | 'demo' | 'knowledge' | 'derived' | 'folk-experience';

export type ModuleId =
  | 'home'
  | 'bazi'
  | 'ziwei'
  | 'liuyao'
  | 'meihua'
  | 'qimen'
  | 'fengshui'
  | 'feixing'
  | 'bazhai'
  | 'yunqi'
  | 'tizhi'
  | 'almanac'
  | 'namewuxing'
  | 'dream'
  | 'rhythm'
  | 'testing'
  | 'reader'
  | 'history'
  | 'combo'
  | 'liuren'
  | 'xingxiu'
  | 'taiyi'
  | 'huangji'
  | 'cezi'
  | 'chenguz';

export interface WisdomModule {
  id: ModuleId;
  group: ModuleGroup;
  title: string;
  shortTitle: string;
  status: ModuleStatus;
  statusLabel: string;
  privacyLevel: string;
  questionTypes: string[];
  accent: string;
  description: string;
}

export const MODULES: WisdomModule[] = [
  {
    id: 'home',
    group: '易学源流',
    title: '首页',
    shortTitle: '首页',
    status: 'derived',
    statusLabel: '工具导航',
    privacyLevel: '不保存个人资料',
    questionTypes: ['工具目录', '使用说明'],
    accent: '#4a7250',
    description: '浏览传统文化工具，查看使用说明与隐私提示。',
  },
  {
    id: 'bazi',
    group: '术数排盘',
    title: '八字命盘',
    shortTitle: '八字',
    status: 'local-exact',
    statusLabel: '按出生资料排盘',
    privacyLevel: '仅本地计算',
    questionTypes: ['命盘', '五行', '十神'],
    accent: '#b23a26',
    description: '按出生年月日时排出四柱，查看五行与十神的基础解读。',
  },
  {
    id: 'ziwei',
    group: '术数排盘',
    title: '紫微斗数',
    shortTitle: '紫微',
    status: 'local-exact',
    statusLabel: '按出生资料排盘',
    privacyLevel: '仅本地计算',
    questionTypes: ['十二宫', '星曜', '四化'],
    accent: '#8f2d1d',
    description: '紫微斗数：按生辰排十二宫命盘，显示十四主星、辅星、四化，分析性格与运势走向。',
  },
  {
    id: 'liuyao',
    group: '术数排盘',
    title: '六爻占卜',
    shortTitle: '六爻',
    status: 'local-exact',
    statusLabel: '传统方法参考',
    privacyLevel: '仅本地计算',
    questionTypes: ['纳甲', '世应', '用神', '六亲', '六神'],
    accent: '#b05c33',
    description: '可通过铜钱、时间或手动输入起卦，查看纳甲、六亲、六神、世应与变卦。',
  },
  {
    id: 'meihua',
    group: '术数排盘',
    title: '梅花易数',
    shortTitle: '梅花',
    status: 'local-approx',
    statusLabel: '传统方法参考',
    privacyLevel: '仅本地计算',
    questionTypes: ['时间起卦', '数字起卦', '体用'],
    accent: '#8a6d35',
    description: '可按时间或数字起卦，查看上下卦、动爻、体用生克、互卦、变卦与错综卦。',
  },
  {
    id: 'qimen',
    group: '术数排盘',
    title: '奇门遁甲',
    shortTitle: '奇门',
    status: 'local-exact',
    statusLabel: '按出生资料排盘',
    privacyLevel: '仅本地计算',
    questionTypes: ['时家奇门', '九宫', '门星神'],
    accent: '#8a8172',
    description: '时家奇门遁甲排盘，查看三奇六仪、九星、八门、八神、值符值使、空亡马星与格局提示。',
  },
  {
    id: 'liuren',
    group: '术数排盘',
    title: '大六壬',
    shortTitle: '六壬',
    status: 'local-exact',
    statusLabel: '按出生资料排盘',
    privacyLevel: '仅本地计算',
    questionTypes: ['事件占断', '应期推算', '三传四课', '神煞格局'],
    accent: '#3d5a6e',
    description: '大六壬（六壬神课）：天地盘、四课、三传（九宗门贼克/比用/涉害/遥克/昴星/八专/伏吟/返吟）、神煞、格局。传统三式之一，擅长事件细节与应期推算。',
  },
  {
    id: 'xingxiu',
    group: '术数排盘',
    title: '二十八星宿',
    shortTitle: '星宿',
    status: 'local-exact',
    statusLabel: '按出生资料排盘',
    privacyLevel: '仅本地计算',
    questionTypes: ['值日星宿', '吉凶宜忌', '四象禽星', '择日参考'],
    accent: '#3d5a6e',
    description: '二十八星宿：每日值宿查询、吉凶宜忌、四象（青龙/朱雀/白虎/玄武）分组、禽星全称、七曜五行。传统择吉与天文历法基础。',
  },
  {
    id: 'taiyi',
    group: '术数排盘',
    title: '太乙神数',
    shortTitle: '太乙',
    status: 'local-exact',
    statusLabel: '按出生资料排盘',
    privacyLevel: '仅本地计算',
    questionTypes: ['事件占断', '主客胜负', '应期推算', '格局吉凶'],
    accent: '#6f5a85',
    description: '太乙神数：传统三式之首。太乙积年推局数，太乙落宫、文昌始击定目、主客算与四将，据掩迫关囚击格等格局断事件吉凶与主客胜负。',
  },
  {
    id: 'huangji',
    group: '术数排盘',
    title: '皇极经世',
    shortTitle: '皇极',
    status: 'local-exact',
    statusLabel: '按出生资料排盘',
    privacyLevel: '仅本地计算',
    questionTypes: ['元会运世', '宇宙周期', '长期运势', '大势推演'],
    accent: '#a67c44',
    description: '皇极经世：邵雍象数学巅峰。以元会运世宇宙周期（1元=129600年）定位时空，推九卦配置（正卦主一运大势、世卦主一世气数、年卦主本年应象），擅长期宏观推演。',
  },
  {
    id: 'fengshui',
    group: '堪舆风水',
    title: '风水罗盘',
    shortTitle: '罗盘',
    status: 'knowledge',
    statusLabel: '知识参考',
    privacyLevel: '不含个人资料',
    questionTypes: ['二十四山', '八卦'],
    accent: '#4a7250',
    description: '查看二十四山与八卦方位的相关说明。',
  },
  {
    id: 'feixing',
    group: '堪舆风水',
    title: '流年飞星',
    shortTitle: '飞星',
    status: 'local-approx',
    statusLabel: '传统方法参考',
    privacyLevel: '仅年份输入',
    questionTypes: ['九宫', '飞星'],
    accent: '#4a7250',
    description: '按年份渲染九宫飞星结构和吉凶提示。',
  },
  {
    id: 'bazhai',
    group: '堪舆风水',
    title: '八宅大游年',
    shortTitle: '八宅',
    status: 'local-approx',
    statusLabel: '传统方法参考',
    privacyLevel: '仅出生年与性别',
    questionTypes: ['命卦', '宅卦'],
    accent: '#3d5a6e',
    description: '展示东四命、西四命与八宅游年吉凶结构。',
  },
  {
    id: 'combo',
    group: '术数排盘',
    title: '联合分析',
    shortTitle: '联合',
    status: 'local-exact',
    statusLabel: '综合参考',
    privacyLevel: '仅本地计算',
    questionTypes: ['综合运势', '月度运势', '事件决策', '空间布局', '择吉日', '合婚配对'],
    accent: '#7a6390',
    description: '结合八字、紫微、奇门、六爻、梅花、黄历与体质等传统视角，提供运势、问事、择日、空间与合婚参考。',
  },
  {
    id: 'yunqi',
    group: '医道运气',
    title: '五运六气',
    shortTitle: '运气',
    status: 'local-exact',
    statusLabel: '按出生资料排盘',
    privacyLevel: '仅年份输入',
    questionTypes: ['岁运', '司天', '在泉'],
    accent: '#4a7250',
    description: '按年份推算岁运、司天在泉与六步客气。',
  },
  {
    id: 'tizhi',
    group: '医道运气',
    title: '体质辨识',
    shortTitle: '体质',
    status: 'derived',
    statusLabel: '体质参考',
    privacyLevel: '仅本地评分',
    questionTypes: ['九种体质', '雷达图'],
    accent: '#8a6d35',
    description: '用九种体质评分展示偏颇倾向和调养提示。',
  },
  // 日用工具扩展 (v0.4)
  {
    id: 'almanac',
    group: '日用工具',
    title: '每日黄历',
    shortTitle: '黄历',
    status: 'folk-experience',
    statusLabel: '民俗体验',
    privacyLevel: '不保存个人资料',
    questionTypes: ['宜忌', '时辰', '节气'],
    accent: '#b23a26',
    description: '基于农历日期展示当日宜忌、吉时凶时、节气物候等民俗参考信息，不做吉凶预测。',
  },
  {
    id: 'namewuxing',
    group: '日用工具',
    title: '姓名五行',
    shortTitle: '姓名',
    status: 'folk-experience',
    statusLabel: '民俗体验',
    privacyLevel: '仅本地计算',
    questionTypes: ['笔画', '五行', '三才', '用神补强'],
    accent: '#4a7250',
    description: '分析姓名汉字的笔画五行与三才配置，五维评分含命理契合（生肖契合+八字喜用神补强）。作为文化参考，不构成命名建议。',
  },
  {
    id: 'dream',
    group: '日用工具',
    title: '周公解梦',
    shortTitle: '解梦',
    status: 'folk-experience',
    statusLabel: '民俗参考',
    privacyLevel: '不保存个人资料',
    questionTypes: ['梦象', '吉凶', '古文断语'],
    accent: '#635478',
    description: '基于开源周公解梦库（9550条现代解读+952条古文断语）提供梦象吉凶寓意查询，民俗参考，非预言绝对。',
  },
  {
    id: 'rhythm',
    group: '日用工具',
    title: '每日节律',
    shortTitle: '节律',
    status: 'folk-experience',
    statusLabel: '民俗体验',
    privacyLevel: '不保存个人资料',
    questionTypes: ['时辰', '经络', '养生'],
    accent: '#8a6d35',
    description: '展示十二时辰与经络气血流注的对应关系，提供养生节律参考。',
  },
  {
    id: 'reader',
    group: '古籍与历史',
    title: '古籍阅读',
    shortTitle: '古籍',
    status: 'knowledge',
    statusLabel: '知识参考',
    privacyLevel: '不含个人资料',
    questionTypes: ['古籍原文', '相关说明', '搜索'],
    accent: '#8a6d35',
    description: '阅读古籍原文与相关说明，支持关键词搜索与重点标记；现收录《八宅明镜》。',
  },
  {
    id: 'history',
    group: '古籍与历史',
    title: '本地历史与收藏',
    shortTitle: '历史',
    status: 'derived',
    statusLabel: '本地存储',
    privacyLevel: '脱敏摘要',
    questionTypes: ['历史', '收藏', '隐私'],
    accent: '#8a6d35',
    description: '自动保存最近 30 条脱敏阅读摘要，不保存完整姓名、完整出生日期或具体地点。',
  },
  {
    id: 'cezi',
    group: '日用工具',
    title: '测字 · 字占',
    shortTitle: '测字',
    status: 'local-approx',
    statusLabel: '传统方法参考',
    privacyLevel: '仅本地计算',
    questionTypes: ['测字', '字占', '起名参考'],
    accent: '#a67c44',
    description: '输入一个字，分析康熙笔画数理、字义五行、字形结构与偏旁象义，可选结合八字用神补益，给出吉凶定调与事业/感情影响及改字起名建议。象数 + 字义占卜。',
  },
  {
    id: 'chenguz',
    group: '日用工具',
    title: '袁天罡称骨',
    shortTitle: '称骨',
    status: 'local-exact',
    statusLabel: '按出生资料排盘',
    privacyLevel: '仅本地计算',
    questionTypes: ['称骨', '命格', '骨重'],
    accent: '#a67c44',
    description: '袁天罡称骨算命：按出生年月日时（农历）查四柱骨重，总重对应称骨歌一段，定命格轻重。骨越重命越贵，骨轻则多劳。用全局生辰直接算。',
  },
];

export const MODULE_GROUPS = Array.from(new Set(MODULES.map((module) => module.group)));

export function getModuleById(id: ModuleId) {
  return MODULES.find((module) => module.id === id) ?? MODULES[0];
}

export function isModuleId(value: string): value is ModuleId {
  return MODULES.some((module) => module.id === value);
}
