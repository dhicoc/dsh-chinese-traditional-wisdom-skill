import type { DaliurenData } from '../daliurenEngine';
import type { HuangjiData } from '../huangjiEngine';
import type { LiuyaoData } from '../liuyaoEngine';
import type { MeihuaData } from '../meihuaEngine';
import type { QimenData } from '../qimenEngine';
import type { TaiyiData } from '../taiyiEngine';
import {
  claimToolMismatch,
  createClaimViolation,
  type ClaimValidation,
  type ClaimViolation,
} from './claimContract';

export type DivinationPresentationTool = 'cast_liuyao' | 'cast_meihua' | 'arrange_qimen' | 'liuren_calculate' | 'taiyi_calculate' | 'huangji_calculate';

type DivinationData = LiuyaoData | MeihuaData | QimenData | DaliurenData | TaiyiData | HuangjiData;

export type DivinationPresentationClaim =
  | { tool: 'cast_liuyao'; kind: 'hexagram'; field: 'name' | 'changedName' | 'palace' | 'palaceElement' | 'dayGanZhi' | 'monthGanZhi'; value: string }
  | { tool: 'cast_liuyao'; kind: 'yao'; field: 'shiYao' | 'yingYao'; value: number }
  | { tool: 'cast_liuyao'; kind: 'yao'; field: 'changingYao'; value: string }
  | { tool: 'cast_meihua'; kind: 'hexagram'; field: 'name' | 'changedName' | 'classicalName' | 'changedClassicalName' | 'bodyTrigram' | 'useTrigram' | 'bodyUseRelation'; value: string }
  | { tool: 'cast_meihua'; kind: 'hexagram'; field: 'number' | 'changedNumber'; value: number }
  | { tool: 'cast_meihua'; kind: 'yao'; field: 'changingLine'; value: number }
  | { tool: 'cast_meihua'; kind: 'trigram'; position: 'upper' | 'lower'; field: 'name' | 'nature' | 'element'; value: string }
  | { tool: 'arrange_qimen'; kind: 'basic'; field: 'dun' | 'ju' | 'yuan' | 'season' | 'monthElement'; value: string }
  | { tool: 'arrange_qimen'; kind: 'zhiFu'; field: 'star' | 'heavenlyStem'; value: string }
  | { tool: 'arrange_qimen'; kind: 'zhiFu'; field: 'position'; value: number }
  | { tool: 'arrange_qimen'; kind: 'zhiShi'; field: 'gate'; value: string }
  | { tool: 'arrange_qimen'; kind: 'zhiShi'; field: 'position'; value: number }
  | { tool: 'arrange_qimen'; kind: 'palace'; position: number; field: 'trigram' | 'gate' | 'star' | 'deity' | 'heavenlyStem' | 'earthlyStem' | 'earthBranch'; value: string }
  | { tool: 'liuren_calculate'; kind: 'basic'; field: 'jieqi' | 'dayGanZhi' | 'hourGanZhi' | 'dayNight' | 'yueJiang' | 'yueJiangName'; value: string }
  | { tool: 'liuren_calculate'; kind: 'sike'; position: 1 | 2 | 3 | 4; field: 'shangShen' | 'xiaShen' | 'tianJiang' | 'relation'; value: string }
  | { tool: 'liuren_calculate'; kind: 'sanchuan'; stage: 'chuChuan' | 'zhongChuan' | 'moChuan'; field: 'diZhi' | 'tianJiang' | 'liuQin'; value: string }
  | { tool: 'liuren_calculate'; kind: 'sanchuan'; stage: 'chuChuan' | 'zhongChuan' | 'moChuan'; field: 'xunKong'; value: string | null }
  | { tool: 'taiyi_calculate'; kind: 'basic'; field: 'yearGz' | 'monthGz' | 'dayGz' | 'hourGz' | 'jieqi' | 'jiStyleName' | 'acumYearName'; value: string }
  | { tool: 'taiyi_calculate'; kind: 'kook'; field: 'wen' | 'nian' | 'dun'; value: string }
  | { tool: 'taiyi_calculate'; kind: 'kook'; field: 'num'; value: number }
  | { tool: 'taiyi_calculate'; kind: 'position'; subject: 'taiyi' | 'wenchang' | 'shiji' | 'dingmu'; field: 'gong'; value: string }
  | { tool: 'taiyi_calculate'; kind: 'position'; subject: 'taiyi'; field: 'num'; value: number }
  | { tool: 'taiyi_calculate'; kind: 'calculation'; side: 'home' | 'away'; field: 'cal' | 'general' | 'vgen'; value: number }
  | { tool: 'huangji_calculate'; kind: 'ganZhi'; pillar: 'year' | 'month' | 'day' | 'hour'; value: string }
  | { tool: 'huangji_calculate'; kind: 'lunarMonth'; value: number }
  | { tool: 'huangji_calculate'; kind: 'cycle'; field: 'acumYear' | 'hui' | 'yun' | 'shi'; value: number }
  | { tool: 'huangji_calculate'; kind: 'gua'; layer: 'zheng' | 'yun' | 'shi' | 'xun' | 'year' | 'month' | 'day' | 'hour' | 'minute'; value: string }
  | { tool: 'huangji_calculate'; kind: 'movingLine'; layer: 'yun' | 'shi' | 'xun'; value: number };

export type DivinationClaimViolation = ClaimViolation<
  DivinationPresentationClaim['kind'],
  string | number | null
>;

export type DivinationClaimValidation = ClaimValidation<DivinationClaimViolation>;

export function validateDivinationClaims(
  tool: DivinationPresentationTool,
  data: DivinationData,
  claims: DivinationPresentationClaim[],
): DivinationClaimValidation {
  const violations: DivinationClaimViolation[] = [];

  claims.forEach((claim, index) => {
    if (claimToolMismatch(claim, tool)) {
      violations.push(createClaimViolation({
        index,
        tool,
        claimTool: claim.tool,
        kind: claim.kind,
        message: '',
        actual: claim.value,
      }));
      return;
    }

    const expected = getExpectedValue(data, claim);
    if (claim.value !== expected) {
      violations.push(createClaimViolation({
        index,
        tool,
        claimTool: claim.tool,
        kind: claim.kind,
        message: `${claim.kind} 与本次${tool}盘面结果不一致。`,
        expected,
        actual: claim.value,
      }));
    }
  });

  return { valid: violations.length === 0, violations };
}

function getExpectedValue(data: DivinationData, claim: DivinationPresentationClaim): string | number | null | undefined {
  switch (claim.tool) {
    case 'cast_liuyao': {
      const result = data as LiuyaoData;
      if (claim.kind === 'hexagram') {
        if (claim.field === 'name') return result.hexagramName;
        if (claim.field === 'changedName') return result.changingHexagramName;
        return result[claim.field];
      }
      if (claim.field === 'changingYao') return result.changingYao.join('、');
      return result[claim.field];
    }
    case 'cast_meihua': {
      const result = data as MeihuaData;
      if (claim.kind === 'hexagram') {
        if (claim.field === 'name') return result.hexagramName;
        if (claim.field === 'changedName') return result.changingHexagramName;
        if (claim.field === 'classicalName') return result.classicalHexagramName;
        if (claim.field === 'changedClassicalName') return result.changingClassicalHexagramName;
        if (claim.field === 'number') return result.hexagramNumber;
        if (claim.field === 'changedNumber') return result.changingHexagramNumber;
        return result[claim.field];
      }
      if (claim.kind === 'yao') return result.changingLine;
      return (claim.position === 'upper' ? result.upperTrigram : result.lowerTrigram)[claim.field];
    }
    case 'arrange_qimen': {
      const result = data as QimenData;
      if (claim.kind === 'basic') return result[claim.field];
      if (claim.kind === 'zhiFu') return result.zhiFu?.[claim.field];
      if (claim.kind === 'zhiShi') return result.zhiShi?.[claim.field];
      return result.palaces.find((palace) => palace.position === claim.position)?.[claim.field];
    }
    case 'liuren_calculate': {
      const result = data as DaliurenData;
      if (claim.kind === 'basic') return result.basicInfo[claim.field];
      if (claim.kind === 'sike') return result.siKe.list.find((item) => item.position === claim.position)?.[claim.field];
      return result.sanChuan[claim.stage][claim.field];
    }
    case 'taiyi_calculate': {
      const result = data as TaiyiData;
      if (claim.kind === 'basic') return result.basicInfo[claim.field];
      if (claim.kind === 'kook') return result.kook[claim.field];
      if (claim.kind === 'position') {
        if (claim.subject === 'taiyi') return result.taiyi[claim.field];
        return result[claim.subject].gong;
      }
      return result[claim.side][claim.field];
    }
    case 'huangji_calculate': {
      const result = data as HuangjiData;
      if (claim.kind === 'ganZhi') return result.ganZhi[claim.pillar];
      if (claim.kind === 'lunarMonth') return result.lunarMonth;
      if (claim.kind === 'cycle') return result.cycles[claim.field];
      if (claim.kind === 'gua') return result.gua[claim.layer];
      return result.movingLines[claim.layer];
    }
  }
}
