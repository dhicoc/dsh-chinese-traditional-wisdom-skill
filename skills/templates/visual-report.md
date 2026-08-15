# 全量一次性可视化报告模板

> 使用此模板在文字报告之外，生成一份**全量静态 HTML 可视化报告**，覆盖所有分析模块。
> 不含交互式控件、不含输入面板。用户双击文件即可在浏览器中查看。
> 保存为 `visual-report-{脱敏标识}.html`。

## 使用方式

1. 仅从本次本地 `ToolEnvelope.data` 或真太阳时 `TrueSolarTimeResolution` 提取数据，填入下方 HTML 模板的 `REPORT_DATA` 对象；模型不得自行计算或补全盘面字段。
2. 同时记录每个已使用 `ToolEnvelope` 的能力模式、脱敏输入摘要与 `result_meta.calculationConfig`，使报告可追溯实际规则口径。
3. 将完整 HTML 保存为 `.html` 文件并呈现给用户

## HTML 模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>传统文化智慧 · 可视化报告</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:"Noto Sans SC","Microsoft YaHei",sans-serif;background:#F5F0EB;color:#2C1810;padding:30px 20px;}
  .report-container{max-width:820px;margin:0 auto;}
  .report-header{text-align:center;padding:24px 0 14px;border-bottom:2px solid #D7CCC8;margin-bottom:24px;}
  .report-header h1{font-size:24px;color:#3E2723;font-weight:bold;letter-spacing:2px;}
  .report-header .subtitle{font-size:13px;color:#8D6E63;margin-top:6px;}
  .section{background:#FFF;border-radius:10px;padding:20px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:1px solid #EFEBE6;}
  .section h2{font-size:16px;color:#5D4037;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #EFEBE6;}
  canvas{display:block;margin:0 auto;max-width:100%;}
  .footer{text-align:center;font-size:11px;color:#BCAAA4;padding:20px 0 10px;}
</style>
</head>
<body>
<div class="report-container">

  <div class="report-header">
    <h1>中国传统文化智慧 · 可视化报告</h1>
    <p class="subtitle">{脱敏标识} · {日期}</p>
  </div>

  <!-- 1. 八字命盘 -->
  <div class="section">
    <h2>📋 八字命盘</h2>
    <canvas id="bazi-canvas" width="600" height="400"></canvas>
  </div>

  <!-- 2. 五行平衡 -->
  <div class="section">
    <h2>🌿 五行平衡</h2>
    <canvas id="wuxing-canvas" width="520" height="440"></canvas>
  </div>

  <!-- 3. 紫微斗数 -->
  <div class="section" id="ziwei-section" style="display:none;">
    <h2>⭐ 紫微斗数</h2>
    <canvas id="ziwei-canvas" width="650" height="550"></canvas>
  </div>

  <!-- 4. 六爻 -->
  <div class="section" id="liuyao-section" style="display:none;">
    <h2>🔮 六爻占卜</h2>
    <canvas id="liuyao-canvas" width="450" height="500"></canvas>
  </div>

  <!-- 5. 梅花易数 -->
  <div class="section" id="meihua-section" style="display:none;">
    <h2>🌸 梅花易数</h2>
    <canvas id="meihua-canvas" width="500" height="450"></canvas>
  </div>

  <!-- 6. 风水罗盘 -->
  <div class="section" id="compass-section" style="display:none;">
    <h2>🧭 风水罗盘</h2>
    <canvas id="compass-canvas" width="480" height="480"></canvas>
  </div>

  <!-- 7. 流年飞星 -->
  <div class="section" id="feixing-section" style="display:none;">
    <h2>⭐ 流年飞星</h2>
    <canvas id="feixing-canvas" width="450" height="450"></canvas>
  </div>

  <!-- 8. 八宅大游年 -->
  <div class="section" id="bazhai-section" style="display:none;">
    <h2>🏠 八宅大游年</h2>
    <canvas id="bazhai-canvas" width="500" height="500"></canvas>
  </div>

  <!-- 9. 五运六气 -->
  <div class="section" id="yunqi-section" style="display:none;">
    <h2>☯ 五运六气</h2>
    <canvas id="yunqi-canvas" width="550" height="450"></canvas>
  </div>

  <!-- 10. 体质辨识 -->
  <div class="section" id="constitution-section" style="display:none;">
    <h2>🧬 体质辨识</h2>
    <canvas id="constitution-canvas" width="400" height="400"></canvas>
  </div>

  <div class="footer">
    本报告由 chinese-traditional-wisdom-ai-agent-workflow 生成 · 传统文化视角参考
  </div>
</div>

<!-- ─── 分析数据 ─── -->
<script>
window.REPORT_DATA = {
  version: "0.2.0",
  generatedAt: "2026-07-02T00:00:00+08:00",
  sourceEnvelopes: [
    // 仅记录脱敏摘要与本次本地 ToolEnvelope 的能力模式、result_meta.calculationConfig。
    // 真太阳时预处理记录 TrueSolarTimeResolution 的必要证据摘要，不伪装为 ToolEnvelope。
  ],
  sourceNotes: [
    "八字与五运六气可来自本地近似引擎，节气/历法存在简化。",
    "紫微、六爻、梅花字段为 null 时自动隐藏；演示数据不得写成精确排盘。"
  ],
  // === 八字 (必填) ===
  bazi: {
    year:   { stem: "庚", branch: "午", hidden: ["丁","己"] },
    month:  { stem: "丙", branch: "戌", hidden: ["戊","辛","丁"] },
    day:    { stem: "戊", branch: "子", hidden: ["癸"] },
    hour:   { stem: "丁", branch: "巳", hidden: ["丙","庚","戊"] },
    dayMaster: "戊",
    gender: "男"
  },
  wuxing: { "木": 2, "火": 5, "土": 4, "金": 3, "水": 2 },

  // === 紫微斗数 (可选) ===
  ziwei: null,

  // === 六爻 (可选) ===
  liuyao: null,

  // === 梅花易数 (可选) ===
  meihua: null,

  // === 流年飞星 (可选) ===
  feixing: null,

  // === 八宅大游年 (可选) ===
  bazhai: null,

  // === 五运六气 (可选) ===
  yunqi: null,

  // === 体质 (可选) ===
  constitution: null
};
</script>

<!-- ─── 依赖模块 ─── -->
<script src="../js/core.js"></script>
<script src="../js/bazi.js"></script>
<script src="../js/ziwei.js"></script>
<script src="../js/divination.js"></script>
<script src="../js/fengshui.js"></script>
<script src="../js/health.js"></script>

<script>
(function() {
  var d = window.REPORT_DATA;

  // 1. 八字
  if (d.bazi && VizModules.bazi) {
    VizModules.bazi.render('bazi-canvas', d.bazi);
    CORE.bindCanvasTooltip('bazi-canvas', function(mx,my){
      var p=d.bazi; var keys=['year','month','day','hour'];
      var cellW=108,cellGap=14,stemH=56,branchH=56;
      var totalW=4*cellW+3*cellGap,startX=(600-totalW)/2,startY=38;
      for(var i=0;i<4;i++){var pi=p[keys[i]];if(!pi)continue;
        var x=startX+i*(cellW+cellGap);
        if(mx>=x&&mx<=x+cellW&&my>=startY&&my<=startY+stemH)return{term:pi.stem};
        if(mx>=x&&mx<=x+cellW&&my>=startY+stemH+4&&my<=startY+stemH+4+branchH)return{term:pi.branch};}
      return null;
    });
  }

  // 2. 五行
  if (d.wuxing && VizModules.bazi) {
    VizModules.bazi.renderWuxing('wuxing-canvas', d.wuxing);
  }

  // 3. 紫微
  if (d.ziwei && VizModules.ziwei) {
    document.getElementById('ziwei-section').style.display='';
    VizModules.ziwei.render('ziwei-canvas', d.ziwei);
  }

  // 4. 六爻
  if (d.liuyao && VizModules.divination) {
    document.getElementById('liuyao-section').style.display='';
    VizModules.divination.renderLiuyao('liuyao-canvas', d.liuyao);
  }

  // 5. 梅花
  if (d.meihua && VizModules.divination) {
    document.getElementById('meihua-section').style.display='';
    VizModules.divination.renderMeihua('meihua-canvas', d.meihua);
  }

  // 6. 罗盘 (无数据依赖, 始终渲染)
  if (VizModules.fengshui) {
    document.getElementById('compass-section').style.display='';
    VizModules.fengshui.renderCompass('compass-canvas');
  }

  // 7. 流年飞星
  if (d.feixing && VizModules.fengshui) {
    document.getElementById('feixing-section').style.display='';
    VizModules.fengshui.renderFlyingStars('feixing-canvas', d.feixing);
  }

  // 8. 八宅大游年
  if (d.bazhai && VizModules.fengshui) {
    document.getElementById('bazhai-section').style.display='';
    VizModules.fengshui.renderEightMansions('bazhai-canvas', d.bazhai);
  }

  // 9. 五运六气
  if (d.yunqi && VizModules.health) {
    document.getElementById('yunqi-section').style.display='';
    VizModules.health.renderYunqi('yunqi-canvas', d.yunqi);
  }

  // 10. 体质
  if (d.constitution && VizModules.health) {
    document.getElementById('constitution-section').style.display='';
    VizModules.health.renderConstitution('constitution-canvas', d.constitution);
  }
})();
</script>
</body>
</html>
```

## REPORT_DATA 字段说明

**所有确定性数据必须由本次本地 `ToolEnvelope.data` 或真太阳时 `TrueSolarTimeResolution` 提取后填入；AI 只负责脱敏、组织与解释，用户双击 HTML 文件即可直接查看，无需任何操作。**

| 字段 | 类型 | AI 必须填 | 说明 |
|------|------|----------|------|
| version | String | 是 | REPORT_DATA 结构版本，当前为 `0.2.0` |
| generatedAt | String | 是 | 报告生成时间，ISO 字符串 |
| sourceEnvelopes | Array | 是 | 每项本地 ToolEnvelope 的脱敏输入摘要、能力模式与 `result_meta.calculationConfig`；真太阳时单列校正证据摘要 |
| sourceNotes | Array | 是 | 数据来源、近似算法和外部引擎边界说明 |
| bazi | Object | **是** | 八字四柱: {year,month,day,hour 各 {stem,branch,hidden[]}, dayMaster, gender} |
| wuxing | Object | **是** | 五行计数: {"木":n,"火":n,"土":n,"金":n,"水":n} |
| ziwei | Object | 否 | 紫微命盘数据: {birthInfo, mingGua, palaces:{宫名:{stars[],position,miaoxian}}, sihua, mainStars} |
| liuyao | Object | 否 | 六爻卦象: {lines:[{yin,changing,branch,relation,god}...], hexagramName, shiYao, yingYao} |
| meihua | Object | 否 | 梅花易数: {upperTrigram:{name}, lowerTrigram:{name}, changingLine, bodyTrigram, useTrigram} |
| feixing | Object | 否 | 流年飞星: {year, flyingStars:{中:n,乾:n,兑:n,艮:n,离:n,坎:n,坤:n,震:n,巽:n}} |
| bazhai | Object | 否 | 八宅大游年: {year, gender, mingGua:{trigram,group}, eightMansions:{...}} |
| yunqi | Object | 否 | 五运六气: {year, tiangan, dizhi, wuyun:{dayun,zhuyun,keyun}, liuqi:{sitian,zaiquan,zhuke[]}, disease_tendency} |
| constitution | Object | 否 | 体质: {scores:{平和质:n,...}, dominant:"平和质"} |

## 注意事项

1. 模板中的 `../js/` 路径假设 HTML 文件与 `visual/` 同级。如保存到其他位置，需调整路径或内联 JS
2. 所有可选字段设为 `null` 时对应板块自动隐藏；字段缺失时应在文字报告中说明原因
3. 文件名格式：`visual-report-{脱敏标识}.html`，避免覆盖
