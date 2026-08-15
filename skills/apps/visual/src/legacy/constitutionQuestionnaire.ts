/**
 * constitutionQuestionnaire — 中医九种体质标准化问卷
 *
 * 基于中华中医药学会《中医体质分类与判定》标准，
 * 问卷数据来自 bootstrap/constitution-questionnaire.md。
 * 每题 1-5 分（1=没有，2=很少，3=有时，4=经常，5=总是），
 * 转换分 = (原始分 - 题数) / (题数 × 4) × 100。
 */

export interface QuestionItem {
  /** 问题文本 */
  text: string;
  /** 该问题对应的体质类型 */
  type: string;
}

export interface ConstitutionGroup {
  /** 体质类型名 */
  type: string;
  /** 该体质的问卷题目 */
  questions: string[];
  /** 调养方向 */
  direction: string;
  /** 食疗参考 */
  diet: string;
  /** 穴位保健 */
  acupoints: string;
}

export const QUESTIONNAIRE: ConstitutionGroup[] = [
  {
    type: '气虚质',
    questions: [
      '您容易疲乏吗？',
      '您容易气短，呼吸短促吗？',
      '您容易心慌吗？',
      '您容易头晕或站起时晕眩吗？',
      '您比别人容易患感冒吗？',
      '您喜欢安静、懒得说话吗？',
      '您说话声音低弱无力吗？',
      '您活动量稍大就容易出虚汗吗？',
    ],
    direction: '补气健脾',
    diet: '黄芪、党参、山药',
    acupoints: '足三里、气海',
  },
  {
    type: '阳虚质',
    questions: [
      '您手脚发凉吗？',
      '您胃脘部、背部或腰膝部怕冷吗？',
      '您感到怕冷、衣服比别人穿得多吗？',
      '您比一般人耐受不了寒冷吗？',
      '您比别人容易患感冒吗？',
      '您吃（喝）凉的东西容易腹泻吗？',
    ],
    direction: '温阳祛寒',
    diet: '生姜、肉桂、羊肉',
    acupoints: '关元、命门',
  },
  {
    type: '阴虚质',
    questions: [
      '您感到手脚心发热吗？',
      '您感觉身体、脸上发热吗？',
      '您皮肤或口唇干吗？',
      '您口唇的颜色比一般人红吗？',
      '您容易便秘或大便干燥吗？',
      '您面部两颧潮红或偏红吗？',
      '您感到眼睛干涩吗？',
      '您感到口干咽燥，总想喝水吗？',
    ],
    direction: '滋阴清热',
    diet: '百合、麦冬、银耳',
    acupoints: '三阴交、太溪',
  },
  {
    type: '痰湿质',
    questions: [
      '您感到胸闷或腹部胀满吗？',
      '您感到身体沉重不轻松或不爽快吗？',
      '您腹部肥满松软吗？',
      '您有额部油脂分泌多的现象吗？',
      '您上眼睑比别人肿（轻微隆起）吗？',
      '您嘴里有黏黏的感觉吗？',
      '您平时痰多，特别是咽喉部总感到有痰堵着吗？',
    ],
    direction: '化痰祛湿',
    diet: '陈皮、薏米、冬瓜',
    acupoints: '丰隆、阴陵泉',
  },
  {
    type: '湿热质',
    questions: [
      '您面部或鼻部有油腻感或者油亮发光吗？',
      '您易生痤疮或疮疖吗？',
      '您感到口苦或嘴里有异味吗？',
      '您大便黏滞不爽、有解不尽的感觉吗？',
      '您小便时尿道有发热感、尿色浓吗？',
    ],
    direction: '清热利湿',
    diet: '绿豆、苦瓜、薏米',
    acupoints: '阴陵泉、曲池',
  },
  {
    type: '血瘀质',
    questions: [
      '您皮肤在不知不觉中会出现青紫瘀斑吗？',
      '您两颧部有细微红丝吗？',
      '您身体上有哪里疼痛吗？',
      '您面色晦暗或容易出现褐斑吗？',
      '您容易有黑眼圈吗？',
      '您容易忘事（健忘）吗？',
    ],
    direction: '活血化瘀',
    diet: '山楂、红花、桃仁',
    acupoints: '血海、膈俞',
  },
  {
    type: '气郁质',
    questions: [
      '您感到闷闷不乐、情绪低沉吗？',
      '您容易精神紧张、焦虑不安吗？',
      '您多愁善感、感情脆弱吗？',
      '您容易感到害怕或受惊吓吗？',
      '您胁肋部或乳房胀痛吗？',
      '您无缘无故叹气吗？',
      '您咽喉部有异物感、吐之不出咽之不下吗？',
    ],
    direction: '疏肝理气',
    diet: '玫瑰花、合欢花、佛手',
    acupoints: '太冲、期门',
  },
  {
    type: '特禀质',
    questions: [
      '您没有感冒也会打喷嚏吗？',
      '您没有感冒也会鼻塞、流鼻涕吗？',
      '您有因过敏导致起荨麻疹（风团、风疙瘩）的情况吗？',
      '您皮肤容易过敏（起红疙瘩、发痒）吗？',
      '您皮肤一抓就红并出现抓痕吗？',
    ],
    direction: '固表防敏',
    diet: '黄芪、白术、防风',
    acupoints: '足三里、风池',
  },
];

/**
 * 将问卷原始分转换为标准分（0-100）
 * 转换分 = (原始分 - 题数) / (题数 × 4) × 100
 */
export function convertScore(rawScore: number, questionCount: number): number {
  if (questionCount === 0) return 0;
  const score = ((rawScore - questionCount) / (questionCount * 4)) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * 根据问卷答案计算九种体质得分
 * @param answers 扁平化答案数组，每项 { type, score(1-5) }
 * @returns ConstitutionScores
 */
export function calculateScoresFromAnswers(
  answers: { type: string; score: number }[],
): Record<string, number> {
  const groups: Record<string, number[]> = {};
  for (const a of answers) {
    if (!groups[a.type]) groups[a.type] = [];
    groups[a.type].push(a.score);
  }

  const result: Record<string, number> = {};
  for (const group of QUESTIONNAIRE) {
    const scores = groups[group.type] || [];
    const raw = scores.reduce((s, v) => s + v, 0);
    result[group.type] = convertScore(raw, group.questions.length);
  }

  // 平和质：如果所有偏颇体质 < 40，平和质 = 100 - max(偏颇体质)
  // 如果有偏颇体质 >= 40，平和质降低
  const biased = QUESTIONNAIRE.filter((g) => g.type !== '平和质').map((g) => result[g.type] || 0);
  const maxBiased = Math.max(...biased, 0);
  if (maxBiased < 40) {
    result['平和质'] = Math.round(100 - maxBiased * 0.5);
  } else {
    result['平和质'] = Math.round(Math.max(0, 60 - (maxBiased - 40) * 1.5));
  }

  return result;
}
