/**
 * xiyong — 八字喜用神计算（fate P2，简化版）。
 *
 * 算法参考 babyname/fate 的 `internal/bazi/xiyong.go`：
 * - 同类 = 日主五行 + 生我五行（印）
 * - 异类 = 其余五行（我生、克我、我克）
 * - 日主强弱：同类总分 > 异类总分 → 身强，反之身弱
 * - 喜用神：身弱取同类里最弱五行；身强取异类里最弱五行
 *
 * 简化口径：fate 的 point() 用「令」分数权重（tiangan/dizhi 表），
 * 本项目改用八字 adapter 已有的五行计数（elements）作为分数，
 * 标注「基于五行计数近似」与 fate 令分数口径的区别。
 */

export interface XiYongResult {
  /** 日主五行 */
  dayMasterWuxing: string;
  /** 同类五行（日主 + 印/生我） */
  similar: string[];
  /** 异类五行 */
  heterogeneous: string[];
  /** 同类总分 */
  similarPoint: number;
  /** 异类总分 */
  heterogeneousPoint: number;
  /** 身强 / 身弱 */
  qiangRuo: '身强' | '身弱' | '平衡';
  /** 喜用神五行 */
  shen: string;
  /** 口径说明 */
  confidenceNote: string;
}

const SHENG = ['木', '火', '土', '金', '水'];

/** 生我五行（印）：木←水, 火←木, 土←火, 金←土, 水←金 */
function shengMe(wx: string): string {
  const i = SHENG.indexOf(wx);
  if (i < 0) return '';
  return SHENG[(i + 4) % 5];
}

/**
 * 计算喜用神。
 * @param dayMasterWuxing 日主五行（如「金」）
 * @param elements 五行计数 {木,火,土,金,水}
 */
export function calcXiYong(
  dayMasterWuxing: string,
  elements: Record<string, number>,
): XiYongResult {
  const dm = dayMasterWuxing;
  const yin = shengMe(dm);
  const similar = [dm, yin].filter(Boolean);
  const heterogeneous = SHENG.filter((wx) => !similar.includes(wx));

  const similarPoint = similar.reduce((s, wx) => s + (elements[wx] ?? 0), 0);
  const heterogeneousPoint = heterogeneous.reduce((s, wx) => s + (elements[wx] ?? 0), 0);

  const qiangRuo: XiYongResult['qiangRuo'] =
    similarPoint > heterogeneousPoint ? '身强' : similarPoint < heterogeneousPoint ? '身弱' : '平衡';

  // 喜用神：身弱→同类最弱；身强→异类最弱；平衡→全局最弱
  const pickMin = (list: string[]): string => {
    let minWx = list[0];
    let minVal = Infinity;
    for (const wx of list) {
      const v = elements[wx] ?? 0;
      if (v < minVal) {
        minVal = v;
        minWx = wx;
      }
    }
    return minWx;
  };

  let shen: string;
  if (qiangRuo === '身弱') {
    shen = pickMin(similar);
  } else if (qiangRuo === '身强') {
    shen = pickMin(heterogeneous);
  } else {
    shen = pickMin(SHENG);
  }

  return {
    dayMasterWuxing: dm,
    similar,
    heterogeneous,
    similarPoint,
    heterogeneousPoint,
    qiangRuo,
    shen,
    confidenceNote:
      '基于五行计数近似推算（fate 令分数口径的简化版）：同类=日主+印，异类=其余；身弱取同类最弱为喜用，身强取异类最弱为喜用。不同流派在喜用神判定上可能有差异，仅供参考。',
  };
}
