/**
 * constitutionTendency — 五运六气体质倾向参考
 *
 * 根据出生年岁运（太过/不及）与司天在泉，推算体质偏向参考。
 * 辅助参考，不替代问卷——主评分仍是问卷驱动。
 */

export interface ConstitutionTendency {
  /** 岁运 */
  dayun: string;
  /** 司天 */
  sitian: string;
  /** 在泉 */
  zaiquan: string;
  /** 体质倾向（按倾向强度排序） */
  tendencies: { type: string; reason: string }[];
  /** 口径说明 */
  note: string;
}

/** 岁运 → 体质倾向映射 */
const DAYUN_TENDENCY: Record<string, { types: string[]; reason: string }> = {
  '木运太过': { types: ['气郁质', '血瘀质'], reason: '木运太过，肝气偏旺，易气郁化火' },
  '木运不及': { types: ['气虚质'], reason: '木运不及，肝气不足，易疲乏气短' },
  '火运太过': { types: ['阴虚质', '湿热质'], reason: '火运太过，心火偏亢，易阴虚内热' },
  '火运不及': { types: ['阳虚质'], reason: '火运不及，心阳不足，易畏寒怕冷' },
  '土运太过': { types: ['痰湿质'], reason: '土运太过，脾湿偏盛，易痰湿困脾' },
  '土运不及': { types: ['气虚质'], reason: '土运不及，脾虚失运，易消化不良' },
  '金运太过': { types: ['气郁质'], reason: '金运太过，肺气肃降过甚，易气机收敛' },
  '金运不及': { types: ['气虚质', '特禀质'], reason: '金运不及，肺卫不固，易外感过敏' },
  '水运太过': { types: ['阳虚质', '血瘀质'], reason: '水运太过，寒气偏盛，易寒凝血瘀' },
  '水运不及': { types: ['阴虚质'], reason: '水运不及，肾阴不足，易阴虚内热' },
};

/** 司天 → 体质倾向映射 */
const SITIAN_TENDENCY: Record<string, { types: string[]; reason: string }> = {
  '厥阴风木': { types: ['气郁质'], reason: '风木司天，肝风内动倾向' },
  '少阴君火': { types: ['阴虚质', '湿热质'], reason: '君火司天，心火偏亢倾向' },
  '少阳相火': { types: ['湿热质'], reason: '相火司天，火热偏盛倾向' },
  '太阴湿土': { types: ['痰湿质'], reason: '湿土司天，痰湿偏盛倾向' },
  '阳明燥金': { types: ['阴虚质'], reason: '燥金司天，津液偏燥倾向' },
  '太阳寒水': { types: ['阳虚质', '血瘀质'], reason: '寒水司天，寒凝偏盛倾向' },
};

/**
 * 根据岁运、司天、在泉推算体质倾向参考。
 * @param yunqiData 五运六气计算结果（需含 wuyun.dayun, liuqi.sitian, liuqi.zaiquan）
 */
export function getConstitutionTendency(yunqiData: {
  wuyun?: { dayun: string };
  liuqi?: { sitian: string; zaquan: string };
}): ConstitutionTendency | null {
  const dayun = yunqiData?.wuyun?.dayun || '';
  const sitian = yunqiData?.liuqi?.sitian || '';
  const zaiquan = yunqiData?.liuqi?.zaquan || '';

  if (!dayun && !sitian) return null;

  const tendencies: { type: string; reason: string }[] = [];
  const seen = new Set<string>();

  // 岁运倾向
  if (dayun && DAYUN_TENDENCY[dayun]) {
    const d = DAYUN_TENDENCY[dayun];
    for (const t of d.types) {
      if (!seen.has(t)) {
        tendencies.push({ type: t, reason: d.reason });
        seen.add(t);
      }
    }
  }

  // 司天倾向
  if (sitian && SITIAN_TENDENCY[sitian]) {
    const s = SITIAN_TENDENCY[sitian];
    for (const t of s.types) {
      if (!seen.has(t)) {
        tendencies.push({ type: t, reason: s.reason });
        seen.add(t);
      } else {
        // 已有体质，补充理由
        const existing = tendencies.find((e) => e.type === t);
        if (existing) existing.reason += '；' + s.reason;
      }
    }
  }

  return {
    dayun,
    sitian,
    zaiquan,
    tendencies,
    note: '基于出生年岁运与司天在泉的体质倾向参考（五运六气推算），为辅助参考，不替代问卷自评。实际体质受生活习惯、环境、情绪等多因素影响。',
  };
}
