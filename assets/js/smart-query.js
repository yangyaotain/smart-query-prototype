const welcomeBlock = document.getElementById("welcomeBlock");
const answerBlock = document.getElementById("answerBlock");
const conversationHistory = document.getElementById("conversationHistory");
const mainPanel = document.getElementById("mainPanel");
const questionInput = document.getElementById("questionInput");
const suggestPop = document.getElementById("suggestPop");
const userQuestionBubble = document.getElementById("userQuestionBubble");
const thinkingBox = document.getElementById("thinkingBox");
const thinkingTitle = document.getElementById("thinkingTitle");
const thinkingElapsed = document.getElementById("thinkingElapsed");
const resultCard = document.getElementById("resultCard");
const resultTitle = document.getElementById("resultTitle");
const aiConclusion = document.getElementById("aiConclusion");
const insightBox = document.getElementById("insightBox");
const conclusionTags = document.getElementById("conclusionTags");
const answerActionBar = document.getElementById("answerActionBar");
const inlineAnalysisToggle = document.getElementById("inlineAnalysisToggle");
const inlineAnalysisPanel = document.getElementById("inlineAnalysisPanel");
const inlineAnalysisExportTrigger = document.getElementById("inlineAnalysisExportTrigger");
const inlineAnalysisExportMenu = document.getElementById("inlineAnalysisExportMenu");
const analysisResult = document.getElementById("analysisResult");
const analysisReportTitle = document.getElementById("analysisReportTitle");
const resultViewToolbar = document.getElementById("resultViewToolbar");
const chartResult = document.getElementById("chartResult");
const tableResult = document.getElementById("tableResult");
const feedbackDetailPanel = document.getElementById("feedbackDetailPanel");
const chartArea = document.getElementById("chartArea");
const modalMask = document.getElementById("modalMask");
const saveModal = document.getElementById("saveModal");
const feedbackModal = document.getElementById("feedbackModal");
const attributionResult = document.getElementById("attributionResult");
const attributionReportTitle = document.getElementById("attributionReportTitle");
const trendResult = document.getElementById("trendResult");
const trendReportTitle = document.getElementById("trendReportTitle");
const comparisonResult = document.getElementById("comparisonResult");
const comparisonReportTitle = document.getElementById("comparisonReportTitle");
const templateResult = document.getElementById("templateResult");
const templateReportTitle = document.getElementById("templateReportTitle");
const deleteModal = document.getElementById("deleteModal");
const uploadModal = document.getElementById("uploadModal");
const exportMenu = document.getElementById("exportMenu");
const exportTrigger = document.getElementById("exportTrigger");
const addMenu = document.getElementById("addMenu");
const askMenu = document.getElementById("askMenu");
const chartContextMenu = document.getElementById("chartContextMenu");
const historyContextMenu = document.getElementById("historyContextMenu");
const favoriteContextMenu = document.getElementById("favoriteContextMenu");
const imageUploadInput = document.getElementById("imageUploadInput");
const fileUploadInput = document.getElementById("fileUploadInput");
const attachmentPreviewList = document.getElementById("attachmentPreviewList");
const themeName = document.getElementById("themeName");
const themeDesc = document.getElementById("themeDesc");
const themeIndicatorCount = document.getElementById("themeIndicatorCount");
const themeIndicatorList = document.getElementById("themeIndicatorList");
const followupContextChip = document.getElementById("followupContextChip");
const followupChipTitle = document.getElementById("followupChipTitle");
const followupPrefix = document.getElementById("followupPrefix");
const sendBtn = document.getElementById("sendBtn");
const associateList = document.getElementById("associateList");
let activeSideItem = null;
let pendingUpload = null;
let selectedChartMenuAction = "";
let answerVote = "";
let pendingFollowupContext = null;
let thinkingElapsedSeconds = 0;
let thinkingElapsedTimer = null;
let reportTypingTimer = null;
let conclusionTypingTimer = null;
let isAnswering = false;
let currentAnswerMode = "qa";
let currentQuestionText = "近6个月华东区销售额趋势如何？";
let currentAnswerTitle = "华东区近6个月销售额趋势分析";

let resultChart = null;
let reportChart = null;
let attributionChart = null;
let trendChart = null;
let comparisonChart = null;
let currentResultView = "line";
let lastWordExportScope = null;
let currentSaveType = "";
let currentReportSaveMode = "new";
let activeReportPicker = "";

const resultChartData = [
  { name: "1月", value: 2180 },
  { name: "2月", value: 2360 },
  { name: "3月", value: 2510 },
  { name: "4月", value: 2890, anomaly: true, anomalyTip: "异常 +15.1%" },
  { name: "5月", value: 3120 },
  { name: "6月", value: 3248 }
];

function getSmartQueryChartTheme() {
  return window.getSmartQueryThemeColors();
}

function getResultChartPalette() {
  const theme = getSmartQueryChartTheme();
  return [
    theme.primary,
    theme.primaryAccent,
    theme.focusBorder,
    theme.primaryBorder,
    theme.primaryBorderSoft,
    "#fbbf24",
    "#f59e0b"
  ];
}

const feedbackRecords = {
  sql: {
    status: "已处理",
    resultType: "修正SQL",
    question: "华东区销售额趋势为什么和看板不一致？",
    answerTitle: "华东区近6个月销售额趋势分析",
    type: "数据不准确",
    desc: "问数结果里 4 月销售额明显偏低，看板中同口径数据没有下降。",
    submittedAt: "2026-05-09 09:32",
    processedAt: "2026-05-09 16:30",
    originalSql: "SELECT DATE_FORMAT(order_date, '%Y-%m') AS month,\n       SUM(amount) AS sales_amount\nFROM sales_order\nWHERE region = '华东'\nGROUP BY DATE_FORMAT(order_date, '%Y-%m')\nORDER BY month;",
    correctedSql: "SELECT DATE_FORMAT(order_date, '%Y-%m') AS month,\n       SUM(pay_amount) AS sales_amount\nFROM sales_order\nWHERE region = '华东'\n  AND order_status = 'paid'\nGROUP BY DATE_FORMAT(order_date, '%Y-%m')\nORDER BY month;"
  },
  metric: {
    status: "已处理",
    resultType: "沉淀指标",
    question: "客户复购率下降原因能不能直接看到？",
    answerTitle: "客户复购率趋势分析",
    type: "指标缺失",
    desc: "当前只能查订单数，复购率没有标准指标，业务需要按区域和客户等级拆分。",
    submittedAt: "2026-05-08 15:18",
    processedAt: "2026-05-08 18:42",
    metric: {
      name: "客户复购率",
      type: "衍生指标",
      source: "客户数据仓库 / PostgreSQL",
      formula: "复购客户数 / 成交客户数",
      desc: "统计周期内发生 2 次及以上成交的客户占全部成交客户的比例。"
    }
  },
  reply: {
    status: "已处理",
    resultType: "回复用户",
    question: "为什么没有展示同比？",
    answerTitle: "华东区销售额趋势分析",
    type: "结论不合理",
    desc: "用户问题未明确要求同比，但希望知道本次结果缺少同比的原因。",
    submittedAt: "2026-05-07 11:06",
    processedAt: "2026-05-07 14:20",
    reply: "本次问题未包含同比维度，系统默认返回近周期趋势。后续可直接提问“销售额趋势及同比变化”，系统会同时返回同比指标。"
  },
  pendingSql: {
    status: "待处理",
    question: "SQL 执行失败，提示 amount 字段不存在",
    answerTitle: "本周 GMV 汇总分析",
    type: "SQL 执行失败",
    desc: "用户问题是“本周 GMV”，后台生成 SQL 使用了旧字段 amount。",
    submittedAt: "2026-05-09 10:52"
  },
  pendingChart: {
    status: "待处理",
    question: "渠道转化率对比的图表不适合展示趋势",
    answerTitle: "渠道转化率趋势分析",
    type: "图表不合适",
    desc: "结果用了饼图，想看各渠道近 8 周转化率变化。",
    submittedAt: "2026-05-08 15:21"
  },
  pendingReason: {
    status: "待处理",
    question: "库存周转偏慢产品没有说明判断阈值",
    answerTitle: "库存周转偏慢产品分析",
    type: "结论不合理",
    desc: "系统回答只给了 SKU 列表，没有说明偏慢阈值，业务看不出判断依据。",
    submittedAt: "2026-05-08 11:40"
  }
};

const trendForecastData = [
  { name: "7月", value: 3380, upper: 3540, lower: 3220, mom: 4.1, yoy: 30.5 },
  { name: "8月", value: 3520, upper: 3720, lower: 3320, mom: 4.1, yoy: 28.2 },
  { name: "9月", value: 3680, upper: 3910, lower: 3450, mom: 4.5, yoy: 25.8 }
];

const suggestionPool = [
  "近6个月华东区销售额趋势如何？",
  "本月各渠道订单转化率对比",
  "本季度销售目标完成情况怎么样？",
  "华东区销售额同比增长多少？",
  "各产品线销售贡献占比如何？",
  "本月销售额排名前10的客户有哪些？",
  "本季度各区域销售业绩对比",
  "上月新增客户数量及来源分布",
  "近30天销售毛利率变化",
  "本月退款金额TOP10商品",
  "近一年华东区客单价变化",
  "本季度品牌销售排名",
  "本月线上线下渠道占比",
  "近6个月新客复购率趋势",
  "今年累计销售目标完成进度",
  "重点客户的订单异常波动",
  "各渠道转化效率对比",
  "库存周转天数本月趋势"
];

const themeDescMap = {
  "全部": "查看所有分析主题及关联数据模型，便于跨主题快速检索与提问。",
  "销售分析": "覆盖销售额、订单量、渠道转化、区域业绩、产品销售等核心经营指标。",
  "客户分析": "覆盖新增客户、复购率、客户价值分层、流失预警等客户经营主题。",
  "库存分析": "覆盖库存金额、周转天数、滞销品识别、缺货风险和补货建议。",
  "财务分析": "覆盖收入、毛利率、费用结构、预算执行与利润贡献分析。",
  "经营概览": "整合销售、客户、库存和财务指标，形成经营全景与关键风险预警。"
};

const themeIndicatorMap = {
  "全部": [
    { name: "销售额", synonyms: "销售收入、GMV、成交金额", desc: "统计指定时间范围内的销售收入表现，用于分析销售规模和趋势。" },
    { name: "订单量", synonyms: "订单数、成交单量、交易笔数", desc: "统计订单成交数量，用于判断业务活跃度和销售规模。" },
    { name: "成交客户数", synonyms: "购买客户、下单客户、成交人数", desc: "统计产生实际成交的客户数量，用于衡量客户转化效果。" },
    { name: "客单价", synonyms: "平均订单金额、人均消费", desc: "衡量单笔订单的平均价值，用于分析价格带和客户消费能力。" },
    { name: "新增客户数", synonyms: "新客数、首次成交客户", desc: "统计首次产生交易的客户数量，用于观察拉新效果。" },
    { name: "复购率", synonyms: "重复购买率、回购率", desc: "衡量客户重复购买情况，用于评估客户留存和忠诚度。" },
    { name: "库存金额", synonyms: "库存价值、在库金额", desc: "统计当前库存占用金额，用于分析库存资金压力。" },
    { name: "库存周转天数", synonyms: "周转天数、存货周转周期", desc: "衡量库存从入库到销售的周转效率，用于识别库存积压。" },
    { name: "收入", synonyms: "营业收入、业务收入", desc: "统计企业经营收入，用于观察整体经营规模。" },
    { name: "毛利率", synonyms: "销售毛利率、利润率", desc: "衡量销售收入中的毛利占比，用于分析盈利质量。" },
    { name: "预算完成率", synonyms: "预算达成率、预算执行率", desc: "衡量实际结果与预算目标的完成情况，用于跟踪经营计划。" }
  ],
  "销售分析": [
    { name: "销售额", synonyms: "销售收入、GMV、成交金额", desc: "统计指定时间范围内的销售收入表现，用于分析销售规模和趋势。" },
    { name: "订单量", synonyms: "订单数、成交单量、交易笔数", desc: "统计订单成交数量，用于判断业务活跃度和销售规模。" },
    { name: "成交客户数", synonyms: "购买客户、下单客户、成交人数", desc: "统计产生实际成交的客户数量，用于衡量客户转化效果。" },
    { name: "客单价", synonyms: "平均订单金额、人均消费", desc: "衡量单笔订单的平均价值，用于分析价格带和客户消费能力。" },
    { name: "渠道转化率", synonyms: "转化率、渠道成交率", desc: "统计各销售渠道从访问到成交的转化表现，用于评估渠道效率。" },
    { name: "区域销售额", synonyms: "区域收入、地区GMV", desc: "按区域统计销售收入，用于对比不同区域的业绩贡献。" },
    { name: "商品销售额", synonyms: "商品收入、产品销售额", desc: "统计商品维度的销售收入，用于识别重点商品和热销品类。" },
    { name: "销售件数", synonyms: "销量、销售数量、售出件数", desc: "统计商品售出数量，用于判断商品动销情况和需求变化。" },
    { name: "毛利额", synonyms: "毛利、销售毛利、利润贡献", desc: "统计销售产生的毛利贡献，用于分析经营质量和利润空间。" },
    { name: "新增客户数", synonyms: "新客数、首次成交客户", desc: "统计首次产生交易的客户数量，用于观察拉新效果。" },
    { name: "复购率", synonyms: "重复购买率、回购率", desc: "衡量客户重复购买情况，用于评估客户留存和忠诚度。" }
  ],
  "客户分析": [
    { name: "新增客户数", synonyms: "新客数、首次成交客户", desc: "统计首次产生交易的客户数量，用于观察拉新效果。" },
    { name: "成交客户数", synonyms: "购买客户、下单客户、成交人数", desc: "统计产生实际成交的客户数量，用于衡量客户转化效果。" },
    { name: "复购率", synonyms: "重复购买率、回购率", desc: "衡量客户重复购买情况，用于评估客户留存和忠诚度。" },
    { name: "客户流失率", synonyms: "流失率、客户减少率", desc: "统计客户流失占比，用于识别客户关系风险。" },
    { name: "客户生命周期价值", synonyms: "客户价值、LTV", desc: "衡量客户在生命周期内创造的综合价值。" },
    { name: "高价值客户数", synonyms: "重点客户、核心客户", desc: "统计达到高价值标准的客户数量，用于支持重点客户运营。" }
  ],
  "库存分析": [
    { name: "库存金额", synonyms: "库存价值、在库金额", desc: "统计当前库存占用金额，用于分析库存资金压力。" },
    { name: "库存周转天数", synonyms: "周转天数、存货周转周期", desc: "衡量库存从入库到销售的周转效率，用于识别库存积压。" },
    { name: "滞销商品数", synonyms: "滞销品、慢动销商品", desc: "统计销售缓慢的商品数量，用于发现清理和促销对象。" },
    { name: "缺货风险商品数", synonyms: "缺货预警、断货风险", desc: "统计存在缺货风险的商品数量，用于辅助补货决策。" },
    { name: "安全库存达成率", synonyms: "安全库存率、库存保障率", desc: "衡量库存是否满足安全库存要求，用于判断供应保障能力。" }
  ],
  "财务分析": [
    { name: "收入", synonyms: "营业收入、业务收入", desc: "统计企业经营收入，用于观察整体经营规模。" },
    { name: "毛利率", synonyms: "销售毛利率、利润率", desc: "衡量销售收入中的毛利占比，用于分析盈利质量。" },
    { name: "费用率", synonyms: "费用占比、经营费用率", desc: "衡量费用相对收入的占比，用于评估费用控制水平。" },
    { name: "利润额", synonyms: "利润、净收益", desc: "统计经营利润结果，用于衡量业务盈利贡献。" },
    { name: "预算完成率", synonyms: "预算达成率、预算执行率", desc: "衡量实际结果与预算目标的完成情况，用于跟踪经营计划。" }
  ],
  "经营概览": [
    { name: "销售额", synonyms: "销售收入、GMV、成交金额", desc: "统计指定时间范围内的销售收入表现，用于分析销售规模和趋势。" },
    { name: "订单量", synonyms: "订单数、成交单量、交易笔数", desc: "统计订单成交数量，用于判断业务活跃度和销售规模。" },
    { name: "成交客户数", synonyms: "购买客户、下单客户、成交人数", desc: "统计产生实际成交的客户数量，用于衡量客户转化效果。" },
    { name: "库存金额", synonyms: "库存价值、在库金额", desc: "统计当前库存占用金额，用于分析库存资金压力。" },
    { name: "毛利率", synonyms: "销售毛利率、利润率", desc: "衡量销售收入中的毛利占比，用于分析盈利质量。" },
    { name: "预算完成率", synonyms: "预算达成率、预算执行率", desc: "衡量实际结果与预算目标的完成情况，用于跟踪经营计划。" }
  ]
};

const qaThinkingSteps = [
  ["识别业务意图", "识别问题类型、业务对象和时间范围。"],
  ["匹配分析主题", "根据当前上下文匹配销售分析主题。"],
  ["匹配指标与维度", "匹配销售额指标，以及月份、区域等分析维度。"],
  ["关联数据模型", "关联销售订单表、区域组织表和相关字段。"],
  ["生成图表结果", "生成结论、趋势图和明细数据表。"]
];

const analysisThinkingSteps = [
  ["识别解读目标", "识别当前问答的核心结论、时间范围和业务对象。"],
  ["提炼关键变化", "提炼趋势拐点、增速变化和量价结构特征。"],
  ["关联业务因素", "关联活动、渠道和季节因素，定位核心驱动。"],
  ["生成解读报告", "输出结论、指标解读、外部因素与行动建议。"],
  ["校验表达口径", "统一术语与业务口径，确保内容可复用到汇报场景。"]
];

const attributionThinkingSteps = [
  ["锁定异常对象", "识别问题中的异常指标点，定位时间、区域与口径。"],
  ["量化异常幅度", "对比基线增速，计算超出阈值的偏离程度。"],
  ["选择拆解维度", "依据指标特征匹配渠道、产品线、客户等关键维度。"],
  ["计算贡献占比", "对各维度的增量与占比进行排序，识别主因。"],
  ["生成归因结论", "输出根因解释、可持续性判断与行动建议。"]
];

const trendThinkingSteps = [
  ["加载历史时序", "对齐近 6 个月销售额时间序列与同期参考数据。"],
  ["分解趋势季节", "拆出趋势项、季节项与残差，校准节假日影响。"],
  ["拟合预测模型", "采用 Holt-Winters 三参数指数平滑结合业务规则修正。"],
  ["计算置信区间", "基于历史波动估计 90% 置信带，量化预测不确定性。"],
  ["生成趋势报告", "输出概述、预测明细、模型依据、风险机会与节奏建议。"]
];

const comparisonThinkingSteps = [
  ["读取上传文件", "解析 2025 年 1-6 月华东区销售明细（约 7.5 万行），提取销售额、订单量、客单价等字段。"],
  ["校验数据口径", "对齐时间字段、区域、币种与销售口径，确保两期数据可比。"],
  ["对齐同比维度", "与当前 2026 年同期数据按月份、区域、渠道、产品维度逐一对齐。"],
  ["计算同比差异", "对销售额、订单量、客单价、复购率、退货率、毛利率等核心指标计算同比变化。"],
  ["生成对比报告", "输出概述、关键指标对比表、月度对比图、差异原因拆解与行动建议。"]
];

const templateThinkingSteps = [
  ["识别报告需求", "识别用户需要生成 5 月份销售分析月报。"],
  ["匹配数据口径", "对齐销售额、订单量、客单价等核心指标统计口径与数据源。"],
  ["按月份提取数据", "按 5 月份从数据模型抽取业绩、区域、渠道、产品数据。"],
  ["生成报告章节", "生成业绩概述、指标完成、区域贡献、风险与下月计划等章节。"],
  ["格式化与校对", "校对术语、数据单位与同环比口径，输出最终月报。"]
];

const analysisReportTasks = [
  { id: "reportCoreConclusion", text: "华东区近6个月销售额保持持续增长，6月达到3248万元，较1月提升49.0%。4月后增长速度明显加快，整体趋势稳定向上。", block: 0 },
  { id: "reportMetric1", text: "销售额：1月 2180 万提升至 6月 3248 万，规模增长清晰。", block: 1 },
  { id: "reportMetric2", text: "环比：4月环比 +15.1% 为阶段最高，5月、6月仍维持正增长。", block: 1 },
  { id: "reportMetric3", text: "量价：订单量与客单价同步上升，说明增长具备结构性支撑。", block: 1 },
  { id: "reportExternal1", text: "营销活动：4月促销活动提升转化效率，对新增销售贡献明显。", block: 2 },
  { id: "reportExternal2", text: "渠道变化：线上渠道贡献提升，加速整体销售规模放大。", block: 2 },
  { id: "reportExternal3", text: "季节因素：二季度需求回暖，与销售增速抬升阶段一致。", block: 2 },
  { id: "reportAdvice1", text: "区域拆解：建议继续下钻至城市层级，识别高增长贡献来源。", block: 3 },
  { id: "reportAdvice2", text: "活动归因：按活动类型和渠道评估ROI，沉淀可复制增长策略。", block: 3 },
  { id: "reportAdvice3", text: "客户分层：结合新客/复购结构，验证增长可持续性与质量。", block: 3 }
];

// 用户下拉菜单的开关由 common.js 接管，这里只在它打开时关闭其他下拉。
document.addEventListener("user-menu-open", function () {
  if (typeof hideExport === "function") hideExport();
  if (typeof hideAddMenu === "function") hideAddMenu();
  if (typeof hideAskMenu === "function") hideAskMenu();
  if (typeof hideSideMenus === "function") hideSideMenus();
  if (typeof hideChartContextMenu === "function") hideChartContextMenu();
});

function switchSideTab(type) {
  document.getElementById("historyTab").classList.toggle("active", type === "history");
  document.getElementById("favoriteTab").classList.toggle("active", type === "favorite");
  document.getElementById("historyList").classList.toggle("hidden", type !== "history");
  document.getElementById("favoriteList").classList.toggle("hidden", type !== "favorite");
  hideSideMenus();
}

function toggleHistoryMore(event) {
  const button = event.currentTarget;
  const group = button.dataset.group;
  if (!group) return;

  const hiddenItems = document.querySelectorAll(`[data-more-group="${group}"]`);
  const isExpanded = button.dataset.expanded === "true";
  hiddenItems.forEach((item) => {
    item.classList.toggle("hidden", isExpanded);
  });

  button.dataset.expanded = String(!isExpanded);
  button.textContent = isExpanded ? "更多..." : "收起";
}

function hideSideMenus() {
  historyContextMenu.classList.add("hidden");
  favoriteContextMenu.classList.add("hidden");
}

function hideChartContextMenu() {
  if (!chartContextMenu) return;
  chartContextMenu.classList.add("hidden");
}

function setChartMenuSelection(action) {
  if (!chartContextMenu) return;
  chartContextMenu.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("selected", button.dataset.action === action);
  });
}

function openChartContextMenu(event) {
  if (!chartContextMenu) return;
  event.preventDefault();
  event.stopPropagation();
  hideExport();
  hideSideMenus();
  setChartMenuSelection(selectedChartMenuAction);
  chartContextMenu.style.left = `${event.clientX}px`;
  chartContextMenu.style.top = `${event.clientY}px`;
  chartContextMenu.classList.remove("hidden");
}

function openSideMenu(event, type) {
  event.preventDefault();
  event.stopPropagation();
  activeSideItem = event.currentTarget;
  hideExport();
  hideSideMenus();
  hideChartContextMenu();

  const menu = type === "favorite" ? favoriteContextMenu : historyContextMenu;
  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;
  menu.classList.remove("hidden");
}

function sideMenuAction(action) {
  hideSideMenus();
  if (action === "编辑标题") {
    startEditSideTitle();
    return;
  }
  if (action === "删除") {
    openDeleteConfirm();
    return;
  }
  showToast(`${action}操作已模拟`);
}

function startEditSideTitle() {
  if (!activeSideItem) return;
  const titleEl = activeSideItem.querySelector("strong");
  if (!titleEl) return;

  const oldTitle = titleEl.textContent.trim();
  const input = document.createElement("input");
  input.className = "history-title-input";
  input.value = oldTitle;
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  const save = () => {
    const nextTitle = input.value.trim() || oldTitle;
    const nextStrong = document.createElement("strong");
    nextStrong.textContent = nextTitle;
    input.replaceWith(nextStrong);
    showToast("标题已保存");
  };

  input.addEventListener("blur", save, { once: true });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") input.blur();
    if (event.key === "Escape") {
      input.value = oldTitle;
      input.blur();
    }
  });
}

function openDeleteConfirm() {
  if (!activeSideItem) return;
  const title = activeSideItem.querySelector("strong")?.textContent.trim() || "该条历史对话";
  document.getElementById("deleteTitle").textContent = title;
  modalMask.classList.remove("hidden");
  deleteModal.classList.remove("hidden");
}

function confirmDelete() {
  if (activeSideItem) {
    activeSideItem.remove();
    activeSideItem = null;
  }
  closeModal();
  showToast("已删除历史对话");
}

function triggerUpload(type) {
  if (type === "image") {
    imageUploadInput.click();
    return;
  }
  fileUploadInput.click();
}

function handleUploadSelected(type, file) {
  if (!file) return;
  const previewUrl = type === "image" ? URL.createObjectURL(file) : "";
  addAttachmentPreview({ type, file, previewUrl });
}

function openUploadModal(type) {
  closeModal();
  modalMask.classList.remove("hidden");
  uploadModal.classList.remove("hidden");

  const isImage = type === "image";
  const fileName = pendingUpload?.file?.name || (isImage ? "图片" : "附件");
  document.getElementById("uploadTitle").textContent = isImage ? "上传图片" : "上传附件";
  document.getElementById("uploadDesc").textContent = isImage
    ? "上传图片后，可结合图片内容进行问数和分析。"
    : "上传附件后，可结合文件内容进行问数和分析。";
  const preview = document.getElementById("uploadConfirmPreview");
  preview.innerHTML = isImage && pendingUpload?.previewUrl
    ? `<img src="${pendingUpload.previewUrl}" alt="图片预览" /><strong>${fileName}</strong><span>确认后将添加到对话框</span>`
    : `<div class="upload-icon">↗</div><strong>${fileName}</strong><span>确认后将添加到对话框</span>`;
}

function addAttachmentPreview(upload) {
  attachmentPreviewList.classList.remove("hidden");

  const chip = document.createElement("div");
  chip.className = "attachment-chip";
  const fileSize = formatFileSize(upload.file.size);
  chip.innerHTML = upload.type === "image"
    ? `<img src="${upload.previewUrl}" alt="图片附件" /><div class="attachment-info"><strong>${upload.file.name}</strong><span>${fileSize}</span></div><button class="attachment-remove" type="button">×</button>`
    : `<div class="attachment-file-icon">文</div><div class="attachment-info"><strong>${upload.file.name}</strong><span>${fileSize}</span></div><button class="attachment-remove" type="button">×</button>`;

  chip.querySelector(".attachment-remove").addEventListener("click", () => {
    chip.remove();
    if (!attachmentPreviewList.children.length) {
      attachmentPreviewList.classList.add("hidden");
    }
  });

  attachmentPreviewList.appendChild(chip);
}

function formatFileSize(size) {
  if (!size) return "0KB";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function fillQuestion(text) {
  if (!questionInput) return;
  questionInput.value = text;
  handleQuestionInput();
  questionInput.focus();
}

function showSuggest() {
  handleQuestionInput();
}

function positionSuggestPop() {
  if (!suggestPop) return;
  const inputCard = document.querySelector(".input-card");
  const inputShell = document.querySelector(".input-shell");
  if (!inputCard || !inputShell) return;
  const cardRect = inputCard.getBoundingClientRect();
  const shellRect = inputShell.getBoundingClientRect();
  const bottomOffset = Math.max(shellRect.bottom - cardRect.top + 10, 0);
  suggestPop.style.setProperty("--suggest-pop-bottom", `${bottomOffset}px`);
}

function handleQuestionInput() {
  if (!questionInput || !suggestPop) return;
  const text = questionInput.value;
  const trimmed = text.trim();
  if (!trimmed) {
    suggestPop.classList.add("hidden");
    return;
  }
  const matches = getMatchedSuggestions(trimmed);
  if (!matches.length) {
    suggestPop.classList.add("hidden");
    return;
  }
  renderSuggestions(matches, trimmed);
  positionSuggestPop();
  suggestPop.classList.remove("hidden");
}

function scoreSuggestion(item, input) {
  if (!input) return 0;
  if (item === input) return 999;
  if (item.includes(input)) return 500 + input.length;
  let charScore = 0;
  for (const ch of input) {
    if (item.includes(ch)) charScore += 1;
  }
  return charScore;
}

function getMatchedSuggestions(input) {
  return suggestionPool
    .map((item) => ({ item, score: scoreSuggestion(item, input) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((entry) => entry.item);
}

function renderSuggestions(items, input) {
  if (!associateList) return;
  associateList.innerHTML = "";
  items.forEach((text) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = highlightMatch(text, input);
    btn.addEventListener("click", () => runSuggestedQuestion(text));
    associateList.appendChild(btn);
  });
}

function highlightMatch(text, input) {
  const escapedText = escapeHtml(text);
  if (!input) return escapedText;
  const escapedInput = escapeHtml(input);
  if (escapedText.includes(escapedInput)) {
    return escapedText.split(escapedInput).join(`<mark>${escapedInput}</mark>`);
  }
  return escapedText;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function runSuggestedQuestion(text) {
  if (!questionInput) return;
  questionInput.value = text;
  suggestPop?.classList.add("hidden");
  runQuestion();
}

function handleThemeChange(theme) {
  if (!themeName || !themeDesc) return;
  themeName.textContent = theme;
  themeDesc.textContent = themeDescMap[theme] || themeDescMap["经营概览"];
  renderThemeIndicators(theme);
}

function renderThemeIndicators(theme) {
  if (!themeIndicatorList) return;
  const indicators = themeIndicatorMap[theme] || themeIndicatorMap["经营概览"] || [];
  if (themeIndicatorCount) {
    themeIndicatorCount.textContent = `关联指标 ${indicators.length} 个`;
  }
  themeIndicatorList.innerHTML = indicators.map((item) => `
    <div class="theme-indicator-item">
      <div class="theme-indicator-main">
        <strong>${escapeHtml(item.name)}</strong>
        <span title="同义词：${escapeHtml(item.synonyms)}">同义词：${escapeHtml(item.synonyms)}</span>
      </div>
      <p>${escapeHtml(item.desc)}</p>
    </div>
  `).join("");
}

function toggleModelItem(item) {
  if (!item) return;
  item.classList.toggle("expanded");
}
window.toggleModelItem = toggleModelItem;
renderThemeIndicators(themeName?.textContent?.trim() || "销售分析");

function renderThinkingTimeline(mode = "qa") {
  const timeline = thinkingBox?.querySelector(".timeline");
  if (!timeline) return;
  let steps;
  if (mode === "analysis") steps = analysisThinkingSteps;
  else if (mode === "attribution") steps = attributionThinkingSteps;
  else if (mode === "trend") steps = trendThinkingSteps;
  else if (mode === "comparison") steps = comparisonThinkingSteps;
  else if (mode === "template") steps = templateThinkingSteps;
  else steps = qaThinkingSteps;
  timeline.innerHTML = steps.map(([title, desc]) => (
    `<div class="step"><div class="step-dot loading">·</div><div><strong>${title}</strong><span>${desc}</span></div></div>`
  )).join("");
}

const SMART_MODE_RULES = [
  {
    mode: "template",
    patterns: [
      "模板分析", "模板套用", "套用模板", "按模板", "模板月报", "模板生成",
      "月度报告", "月度月报", "月度分析报告", "月报模板", "月报生成", "销售月报", "月度总结"
    ]
  },
  {
    mode: "comparison",
    patterns: [
      "对比分析", "横向对比", "纵向对比", "同期对比", "同比对比", "环比对比",
      "同比变化", "差异分析", "差异对比", "对比一下", "对比下", "做对比", "做个对比",
      "比较一下", "比较下", "做个比较", "比较分析", "同比环比"
    ]
  },
  {
    mode: "attribution",
    patterns: [
      "归因分析", "归因", "异常归因", "原因分析", "根因分析", "根本原因",
      "异常诊断", "异常分析", "为什么会", "为什么", "是什么原因", "原因是什么",
      "什么原因导致", "影响因素", "造成的原因", "什么影响"
    ]
  },
  {
    mode: "trend",
    patterns: [
      "趋势分析", "走势分析", "趋势预测", "走势预测", "销售预测", "业绩预测",
      "预测未来", "预测一下", "预测下", "未来3个月", "未来三个月",
      "未来走势", "未来趋势", "后续走势", "后续趋势"
    ]
  },
  {
    mode: "analysis",
    patterns: [
      "数据解读", "深度解读", "详细解读", "解读一下", "解读下", "做个解读",
      "进行解读", "深度分析", "详细分析", "深入分析", "做个分析", "分析一下", "分析下",
      "数据洞察", "深入洞察"
    ]
  }
];

function detectModeFromText(text) {
  if (!text) return "qa";
  const lower = String(text).toLowerCase();
  for (const rule of SMART_MODE_RULES) {
    if (rule.patterns.some((p) => lower.includes(p.toLowerCase()))) return rule.mode;
  }
  return "qa";
}

// ==================== 智能标题生成 ====================
function extractTimeKeyword(text) {
  if (!text) return "";
  const patterns = [
    [/未来三个月|未来3个月/, "未来3个月"],
    [/未来一年|未来1年/, "未来1年"],
    [/未来半年/, "未来半年"],
    [/未来\s*(\d+)\s*个月/, (m) => `未来${m[1]}个月`],
    [/近\s*(\d+)\s*个月/, (m) => `近${m[1]}个月`],
    [/上半年/, "上半年"],
    [/下半年/, "下半年"],
    [/第一季度|一季度|Q1/i, "Q1"],
    [/第二季度|二季度|Q2/i, "Q2"],
    [/第三季度|三季度|Q3/i, "Q3"],
    [/第四季度|四季度|Q4/i, "Q4"],
    [/(20\d{2})\s*年/, (m) => `${m[1]}年`],
    [/(\d{1,2})\s*月/, (m) => `${m[1]}月`],
    [/本月|当月|这个月/, "本月"],
    [/上个月|上月/, "上月"],
    [/今年/, "今年"],
    [/去年/, "去年"]
  ];
  for (const [re, val] of patterns) {
    const m = text.match(re);
    if (m) return typeof val === "function" ? val(m) : val;
  }
  return "";
}

function extractRegionKeyword(text) {
  if (!text) return "";
  if (/华南|广东|广州|深圳|福建/.test(text)) return "华南区";
  if (/华北|北京|天津|河北/.test(text)) return "华北区";
  if (/华东|上海|江苏|浙江|苏州|杭州/.test(text)) return "华东区";
  if (/西南|四川|重庆|成都/.test(text)) return "西南区";
  if (/西北|陕西|甘肃|西安/.test(text)) return "西北区";
  if (/东北|辽宁|吉林|黑龙江/.test(text)) return "东北区";
  return "";
}

function extractSubjectKeyword(text) {
  if (!text) return "";
  if (/客户|复购|留存|新客|老客/.test(text)) return "客户";
  if (/订单|转化|成单/.test(text)) return "订单";
  if (/库存|周转|SKU|备货/i.test(text)) return "库存";
  if (/财务|利润|毛利|净利|成本/.test(text)) return "财务";
  if (/产品|品类|品牌/.test(text)) return "产品";
  if (/渠道|线上|线下|经销商/.test(text)) return "渠道";
  return "";
}

function getCurrentThemeSubject() {
  const text = themeName?.textContent?.trim() || "销售分析";
  if (text.includes("客户")) return "客户";
  if (text.includes("库存")) return "库存";
  if (text.includes("财务")) return "财务";
  if (text.includes("经营")) return "经营";
  return "销售";
}

function generateAnswerTitle(userInput, mode) {
  if (mode === "qa") return "华东区近6个月销售额趋势分析";

  const region = extractRegionKeyword(userInput) || "华东区";
  const subject = extractSubjectKeyword(userInput) || getCurrentThemeSubject();
  const time = extractTimeKeyword(userInput);

  switch (mode) {
    case "analysis":
      return `${region}${subject}数据深度解读`;
    case "attribution":
      return time
        ? `${region}${time}${subject}异常归因分析`
        : `${region}${subject}异常归因分析`;
    case "trend":
      return time
        ? `${region}${subject}${time}趋势预测分析`
        : `${region}${subject}趋势预测分析`;
    case "comparison":
      return time
        ? `${region}${time}${subject}对比分析`
        : `${region}${subject}对比分析`;
    case "template":
      return time
        ? `${time}${subject}分析月报`
        : `${subject}分析月报`;
    default:
      return `${region}${subject}分析`;
  }
}

function runQuestion() {
  archiveCurrentMessageIfNeeded();
  const inputText = questionInput.value.trim();
  const ctx = pendingFollowupContext;

  let submittedQuestion;
  let answerTitle;
  let mode = "qa";

  if (ctx) {
    const actionText = inputText || "继续追问";
    submittedQuestion = actionText;
    if (ctx.action === "analysis") mode = "analysis";
    else if (ctx.action === "attribution") mode = "attribution";
    else if (ctx.action === "trend") mode = "trend";
    else if (ctx.action === "comparison") mode = "comparison";
    else if (ctx.action === "template") mode = "template";
    else mode = "qa";
    answerTitle = generateAnswerTitle(actionText, mode);
  } else {
    submittedQuestion = inputText || "近6个月华东区销售额趋势如何？";
    mode = detectModeFromText(submittedQuestion);
    answerTitle = generateAnswerTitle(submittedQuestion, mode);
  }

  currentQuestionText = submittedQuestion;
  currentAnswerTitle = answerTitle;
  suggestPop.classList.add("hidden");
  welcomeBlock.classList.add("hidden");
  answerBlock.classList.remove("hidden");
  mainPanel.classList.remove("initial-state");
  questionInput.value = "";
  clearFollowupContext();
  startAnswerSimulation({
    mode,
    questionText: submittedQuestion,
    answerTitle
  });
}

function resetChat() {
  if (isAnswering) {
    isAnswering = false;
    if (conclusionTypingTimer) {
      clearInterval(conclusionTypingTimer);
      conclusionTypingTimer = null;
    }
    if (reportTypingTimer) {
      clearInterval(reportTypingTimer);
      reportTypingTimer = null;
    }
    stopThinkingElapsedTimer();
  }
  updateSendButton();
  welcomeBlock.classList.remove("hidden");
  answerBlock.classList.add("hidden");
  if (conversationHistory) conversationHistory.innerHTML = "";
  mainPanel.classList.add("initial-state");
  questionInput.value = "";
  suggestPop.classList.add("hidden");
  clearFollowupContext();
  resetAnswerSimulation();
  closeModal();
  closeDrawer();
}

function handleSendClick() {
  if (isAnswering) {
    stopAnswerSimulation();
    return;
  }
  runQuestion();
}

function stopAnswerSimulation() {
  isAnswering = false;
  if (conclusionTypingTimer) {
    clearInterval(conclusionTypingTimer);
    conclusionTypingTimer = null;
  }
  if (reportTypingTimer) {
    clearInterval(reportTypingTimer);
    reportTypingTimer = null;
  }
  stopThinkingElapsedTimer();
  aiConclusion?.classList.remove("typing-cursor");
  updateSendButton();
  showToast("已停止生成");
}

function finishAnswerSimulation() {
  if (!isAnswering) return;
  isAnswering = false;
  updateSendButton();
}

function updateSendButton() {
  if (!sendBtn) return;
  if (isAnswering) {
    sendBtn.classList.add("is-stopping");
    sendBtn.setAttribute("aria-label", "停止生成");
  } else {
    sendBtn.classList.remove("is-stopping");
    sendBtn.setAttribute("aria-label", "发送");
  }
}

function startAnswerSimulation(options = {}) {
  currentAnswerMode = options.mode || currentAnswerMode || "qa";
  currentQuestionText = options.questionText || currentQuestionText;
  currentAnswerTitle = options.answerTitle || currentAnswerTitle;
  userQuestionBubble.textContent = currentQuestionText;
  if (resultTitle) resultTitle.textContent = currentAnswerTitle;
  renderThinkingTimeline(currentAnswerMode);
  resetAnswerSimulation();
  answerBlock.classList.remove("hidden");
  isAnswering = true;
  updateSendButton();
  startThinkingElapsedTimer();
  const thinkingDurationMs = 3000;
  const stepDelayMs = 600;

  const dots = thinkingBox.querySelectorAll(".step-dot");

  dots.forEach((dot, index) => {
    setTimeout(() => {
      if (!isAnswering) return;
      dots.forEach((item, itemIndex) => {
        if (itemIndex < index) {
          item.classList.remove("loading");
          item.textContent = "✓";
        }
      });
    }, index * stepDelayMs);
  });

  setTimeout(() => {
    if (!isAnswering) return;
    dots.forEach((dot) => {
      dot.classList.remove("loading");
      dot.textContent = "✓";
    });
    if (thinkingElapsedSeconds < 3) {
      thinkingElapsedSeconds = 3;
      updateThinkingElapsed();
    }
    stopThinkingElapsedTimer();
    thinkingTitle.textContent = "思考过程";
    thinkingBox.classList.add("collapsed");
    resultCard.classList.remove("hidden");
    if (currentAnswerMode === "analysis") {
      startAnalysisReportSimulation();
      return;
    }
    if (currentAnswerMode === "attribution") {
      startAttributionReportSimulation();
      return;
    }
    if (currentAnswerMode === "trend") {
      startTrendReportSimulation();
      return;
    }
    if (currentAnswerMode === "comparison") {
      startComparisonReportSimulation();
      return;
    }
    if (currentAnswerMode === "template") {
      startTemplateReportSimulation();
      return;
    }
    startTypewriterConclusion();
  }, thinkingDurationMs);
}

function resetAnswerSimulation() {
  if (!thinkingBox || !resultCard) return;
  stopThinkingElapsedTimer();
  thinkingElapsedSeconds = 0;
  updateThinkingElapsed();
  thinkingTitle.textContent = "思考过程";
  thinkingBox.classList.remove("hidden");
  thinkingBox.classList.remove("collapsed");
  resultCard.classList.add("hidden");
  aiConclusion.textContent = "";
  aiConclusion.classList.remove("typing-cursor");
  insightBox?.classList.remove("hidden");
  conclusionTags.classList.add("hidden");
  resultViewToolbar.classList.add("hidden");
  chartResult.classList.add("hidden");
  tableResult.classList.add("hidden");
  analysisResult?.classList.add("hidden");
  attributionResult?.classList.add("hidden");
  trendResult?.classList.add("hidden");
  comparisonResult?.classList.add("hidden");
  templateResult?.classList.add("hidden");
  feedbackDetailPanel?.classList.add("hidden");
  if (feedbackDetailPanel) feedbackDetailPanel.innerHTML = "";
  answerActionBar?.classList.add("hidden");
  hideInlineAnalysisExportMenu();
  resetAnalysisReportTyping();
  answerVote = "";
  document.querySelectorAll(".answer-action-btn[data-vote]").forEach((button) => {
    button.classList.remove("active");
  });
  document.querySelectorAll("#resultViewToolbar [data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === "line");
  });
  currentResultView = "line";
  thinkingBox.querySelectorAll(".step-dot").forEach((dot) => {
    dot.classList.add("loading");
    dot.textContent = "·";
  });
  [
    "reportCoreConclusion",
    "reportMetric1",
    "reportMetric2",
    "reportMetric3",
    "reportExternal1",
    "reportExternal2",
    "reportExternal3",
    "reportAdvice1",
    "reportAdvice2",
    "reportAdvice3"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
  document.querySelectorAll(".current-chat-message .analysis-report-block").forEach((block) => {
    block.classList.add("report-block-pending");
    block.classList.remove("report-block-revealed");
  });
  const reportEmbeddedChart = document.getElementById("reportEmbeddedChart");
  if (reportEmbeddedChart) reportEmbeddedChart.classList.remove("revealed");
  const reportFooter = document.getElementById("reportFooter");
  if (reportFooter) reportFooter.classList.remove("revealed");
  [
    "attributionCoreConclusion",
    "attributionDriver1",
    "attributionDriver2",
    "attributionDriver3",
    "attributionDriver4",
    "attributionSustain1",
    "attributionSustain2",
    "attributionSustain3",
    "attributionAction1",
    "attributionAction2",
    "attributionAction3"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
  const attributionEmbeddedChart = document.getElementById("attributionEmbeddedChart");
  if (attributionEmbeddedChart) attributionEmbeddedChart.classList.remove("revealed");
  const attributionFooter = document.getElementById("attributionFooter");
  if (attributionFooter) attributionFooter.classList.remove("revealed");
  [
    "trendOverview",
    "trendModelIntro",
    "trendRiskUp1",
    "trendRiskUp2",
    "trendRiskUp3",
    "trendRiskDown1",
    "trendRiskDown2",
    "trendRiskDown3",
    "trendActionPace",
    "trendActionStock",
    "trendActionMonitor"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
  const trendEmbeddedChart = document.getElementById("trendEmbeddedChart");
  if (trendEmbeddedChart) trendEmbeddedChart.classList.remove("revealed");
  const trendFooter = document.getElementById("trendFooter");
  if (trendFooter) trendFooter.classList.remove("revealed");
  [
    "comparisonOverview",
    "comparisonDriverM1",
    "comparisonDriverM2",
    "comparisonDriverC1",
    "comparisonDriverC2",
    "comparisonDriverS1",
    "comparisonDriverS2",
    "comparisonAction1",
    "comparisonAction2",
    "comparisonAction3",
    "templateSummary",
    "templateOverview",
    "templateRisk1",
    "templateRisk2",
    "templateRisk3",
    "templatePlan1",
    "templatePlan2",
    "templatePlan3"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
  const comparisonEmbeddedChart = document.getElementById("comparisonEmbeddedChart");
  if (comparisonEmbeddedChart) comparisonEmbeddedChart.classList.remove("revealed");
  const comparisonFooter = document.getElementById("comparisonFooter");
  if (comparisonFooter) comparisonFooter.classList.remove("revealed");
  const templateFooter = document.getElementById("templateFooter");
  if (templateFooter) templateFooter.classList.remove("revealed");
}

function updateThinkingElapsed() {
  if (!thinkingElapsed) return;
  thinkingElapsed.textContent = `(用时${thinkingElapsedSeconds}s)`;
}

function startThinkingElapsedTimer() {
  stopThinkingElapsedTimer();
  thinkingElapsedSeconds = 0;
  updateThinkingElapsed();
  thinkingElapsedTimer = setInterval(() => {
    thinkingElapsedSeconds += 1;
    updateThinkingElapsed();
  }, 1000);
}

function stopThinkingElapsedTimer() {
  if (!thinkingElapsedTimer) return;
  clearInterval(thinkingElapsedTimer);
  thinkingElapsedTimer = null;
}

function startTypewriterConclusion() {
  const text = "近6个月华东区销售额整体呈持续上升趋势，6月销售额达到3248万元，较1月增长约49.0%。其中4月至6月增长明显，主要受渠道促销活动和重点客户订单增长影响。";
  let index = 0;
  aiConclusion.textContent = "";
  aiConclusion.classList.add("typing-cursor");

  conclusionTypingTimer = setInterval(() => {
    if (!isAnswering) {
      clearInterval(conclusionTypingTimer);
      conclusionTypingTimer = null;
      return;
    }
    aiConclusion.textContent += text[index] || "";
    index += 1;

    if (index >= text.length) {
      clearInterval(conclusionTypingTimer);
      conclusionTypingTimer = null;
      aiConclusion.classList.remove("typing-cursor");
      scrollToAnswerBottom();
      setTimeout(() => {
        if (!isAnswering) return;
        conclusionTags.classList.remove("hidden");
        scrollToAnswerBottom();
      }, 220);
      setTimeout(() => {
        if (!isAnswering) return;
        tableResult.classList.remove("hidden");
        scrollToAnswerBottom();
      }, 760);
      setTimeout(() => {
        if (!isAnswering) return;
        resultViewToolbar.classList.remove("hidden");
        chartResult.classList.remove("hidden");
        setResultView(currentResultView || "line", false);
        scrollToAnswerBottom();
      }, 1320);
      setTimeout(() => {
        if (!isAnswering) return;
        answerActionBar?.classList.remove("hidden");
        scrollToAnswerBottom();
        finishAnswerSimulation();
      }, 1420);
    }
  }, 34);
}

function showFeedbackDetail(key) {
  const record = feedbackRecords[key];
  if (!record) return;
  if (isAnswering) {
    isAnswering = false;
    if (conclusionTypingTimer) {
      clearInterval(conclusionTypingTimer);
      conclusionTypingTimer = null;
    }
    if (reportTypingTimer) {
      clearInterval(reportTypingTimer);
      reportTypingTimer = null;
    }
    stopThinkingElapsedTimer();
    updateSendButton();
  }
  hideSideMenus();
  closeModal();
  closeDrawer();
  clearFollowupContext();
  document.querySelectorAll("#favoriteList .history-item").forEach((item) => {
    item.classList.remove("active");
  });
  const activeItem = document.querySelector(`#favoriteList .history-item[onclick="showFeedbackDetail('${key}')"]`);
  if (activeItem) activeItem.classList.add("active");

  currentAnswerMode = "qa";
  currentQuestionText = record.question;
  currentAnswerTitle = record.answerTitle || generateAnswerTitle(record.question, "qa");
  userQuestionBubble.textContent = currentQuestionText;
  if (resultTitle) resultTitle.textContent = currentAnswerTitle;
  if (resultTitle && resultTitle.nextElementSibling) {
    resultTitle.nextElementSibling.textContent = "分析主题：销售分析 · 查询时间：2026-05-09 08:43 · 数据更新时间：2026-05-09 08:00";
  }

  welcomeBlock.classList.add("hidden");
  answerBlock.classList.remove("hidden");
  mainPanel.classList.remove("initial-state");
  if (conversationHistory) conversationHistory.innerHTML = "";
  resetAnswerSimulation();
  answerBlock.classList.remove("hidden");
  thinkingBox.classList.add("hidden");
  resultCard.classList.remove("hidden");
  aiConclusion.textContent = "近6个月华东区销售额整体呈持续上升趋势，6月销售额达到3248万元，较1月增长约49.0%。其中4月至6月增长明显，主要受渠道促销活动和重点客户订单增长影响。";
  aiConclusion.classList.remove("typing-cursor");
  conclusionTags.classList.remove("hidden");
  tableResult.classList.remove("hidden");
  resultViewToolbar.classList.remove("hidden");
  chartResult.classList.remove("hidden");
  answerActionBar?.classList.remove("hidden");
  renderFeedbackDetail(record);
  currentResultView = "line";
  setResultView(currentResultView || "line", false);
  requestAnimationFrame(() => scrollToAnswerBottom());
  setTimeout(scrollToAnswerBottom, 180);
}

function renderFeedbackDetail(record) {
  if (!feedbackDetailPanel) return;
  feedbackDetailPanel.innerHTML = feedbackDetailHTML(record);
  feedbackDetailPanel.classList.remove("hidden");
}

function feedbackDetailHTML(record) {
  const statusClass = record.status === "已处理" ? "done" : "pending";
  const resultHTML = record.status === "已处理"
    ? feedbackProcessedHTML(record)
    : '<div class="feedback-result-card"><h4>处理结果</h4><div class="feedback-pending-box">该反馈已提交至运营管理后台，当前处于待处理状态。处理完成后会在这里展示处理结果。</div></div>';
  return ''
    + '<section class="feedback-detail-card">'
    +   '<div class="feedback-detail-head"><h4>反馈内容</h4><em class="feedback-status ' + statusClass + '">' + record.status + '</em></div>'
    +   '<div class="feedback-detail-grid">'
    +     feedbackCell("反馈类型", record.type)
    +     feedbackCell("提交时间", record.submittedAt)
    +     feedbackCell("用户问题", record.question, true)
    +     feedbackCell("反馈说明", record.desc, true)
    +   '</div>'
    + '</section>'
    + resultHTML;
}

function feedbackCell(label, value, full) {
  return '<div class="feedback-detail-cell' + (full ? " full" : "") + '">'
    + '<div class="feedback-detail-label">' + escapeHTML(label) + '</div>'
    + '<div class="feedback-detail-value">' + escapeHTML(value || "—") + '</div>'
    + '</div>';
}

function feedbackProcessedHTML(record) {
  if (record.resultType === "修正SQL") {
    return '<div class="feedback-result-card"><div class="feedback-detail-head"><h4>处理结果</h4><em class="feedback-status done">修正SQL</em></div>'
      + '<div class="feedback-sql-grid">'
      + '<div class="feedback-sql-block"><strong>原执行 SQL</strong>' + feedbackSqlEditor(record.originalSql || "") + '</div>'
      + '<div class="feedback-sql-block"><strong>修正后 SQL</strong>' + feedbackSqlEditor(record.correctedSql || "") + '</div>'
      + '</div></div>';
  }
  if (record.resultType === "沉淀指标") {
    const m = record.metric || {};
    return '<div class="feedback-result-card"><div class="feedback-detail-head"><h4>处理结果</h4><em class="feedback-status done">沉淀指标</em></div>'
      + '<div class="feedback-metric-list">'
      + metricCell("指标名称", m.name)
      + metricCell("指标类型", m.type)
      + metricCell("数据源", m.source)
      + metricCell("计算公式", m.formula)
      + metricCell("指标说明", m.desc, true)
      + '</div></div>';
  }
  return '<div class="feedback-result-card"><div class="feedback-detail-head"><h4>处理结果</h4><em class="feedback-status done">回复用户</em></div>'
    + '<p class="feedback-reply-box">' + escapeHTML(record.reply || "—") + '</p></div>';
}

function metricCell(label, value, full) {
  return '<div class="' + (full ? "full" : "") + '"><strong>' + escapeHTML(label) + '</strong><div class="feedback-detail-value">' + escapeHTML(value || "—") + '</div></div>';
}

function feedbackSqlEditor(sql) {
  const formatted = formatFeedbackSQL(sql || "");
  const lines = Math.max(8, formatted.split("\n").length);
  return '<div class="feedback-sql-editor ke-sql-editor is-light is-readonly" data-role="sql-editor">'
    + '<div class="ke-sql-toolbar">'
    + '<span class="ke-sql-dot"></span><span class="ke-sql-dot"></span><span class="ke-sql-dot"></span>'
    + '<strong>SQL Editor</strong>'
    + '</div>'
    + '<div class="ke-sql-body">'
    + '<div class="ke-sql-lines" aria-hidden="true">' + feedbackLineNumbers(lines) + '</div>'
    + '<div class="ke-sql-code">'
    + '<pre class="ke-sql-highlight" aria-hidden="true">' + highlightFeedbackSQL(formatted) + '</pre>'
    + '<textarea class="ke-sql-input" readonly spellcheck="false" rows="' + lines + '">' + escapeHTML(formatted) + '</textarea>'
    + '</div></div></div>';
}

function feedbackLineNumbers(count) {
  let html = "";
  for (let i = 1; i <= count; i += 1) html += "<span>" + i + "</span>";
  return html;
}

function highlightFeedbackSQL(sql) {
  let html = escapeHTML(sql || "");
  html = html.replace(/('(?:''|[^'])*')/g, '<span class="ke-sql-str">$1</span>');
  html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="ke-sql-num">$1</span>');
  html = html.replace(/\b(SELECT|FROM|WHERE|AND|OR|GROUP BY|ORDER BY|LIMIT|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|ON|AS|SUM|COUNT|AVG|MIN|MAX|DISTINCT|DATE_FORMAT|DATE_SUB|CURDATE|INTERVAL|CASE|WHEN|THEN|ELSE|END|IN|NOT|NULL|IS|LIKE)\b/gi, (match) => {
    const upper = match.toUpperCase();
    const cls = /^(SUM|COUNT|AVG|MIN|MAX|DATE_FORMAT|DATE_SUB|CURDATE)$/.test(upper) ? "ke-sql-fn" : "ke-sql-kw";
    return '<span class="' + cls + '">' + match + "</span>";
  });
  return html;
}

function formatFeedbackSQL(sql) {
  let value = String(sql || "").trim();
  if (!value) return "";
  value = value.replace(/\s+/g, " ");
  value = value.replace(/\s+(FROM|WHERE|GROUP BY|ORDER BY|LIMIT|HAVING)\b/gi, "\n$1");
  value = value.replace(/\s+(LEFT JOIN|RIGHT JOIN|INNER JOIN|JOIN)\b/gi, "\n$1");
  value = value.replace(/\s+(AND|OR)\b/gi, "\n  $1");
  value = value.replace(/,\s*/g, ",\n       ");
  value = value.replace(/\n\s*(FROM|WHERE|GROUP BY|ORDER BY|LIMIT|HAVING|LEFT JOIN|RIGHT JOIN|INNER JOIN|JOIN)\b/gi, (_, keyword) => "\n" + keyword.toUpperCase());
  return value;
}

function escapeHTML(value) {
  return String(value == null ? "" : value).replace(/[&<>"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[c]));
}

function resetAnalysisReportTyping() {
  if (!reportTypingTimer) return;
  clearInterval(reportTypingTimer);
  reportTypingTimer = null;
}

function revealReportBlock(index) {
  const block = document.querySelector(`.current-chat-message .analysis-report-block[data-report-block="${index}"]`);
  if (!block) return;
  block.classList.remove("report-block-pending");
  block.classList.add("report-block-revealed");
  scrollToAnswerBottom();
}

function revealReportEmbeddedChart() {
  const chart = document.getElementById("reportEmbeddedChart");
  if (!chart) return;
  chart.classList.add("revealed");
  ensureReportChart();
  scrollToAnswerBottom();
}

function ensureReportChart() {
  renderReportChart(document.getElementById("reportChartCanvas"));
}

function renderReportChart(dom) {
  if (!dom || typeof echarts === "undefined") return;
  let inst = echarts.getInstanceByDom(dom);
  if (!inst) {
    if (!dom.clientWidth || !dom.clientHeight) {
      requestAnimationFrame(() => renderReportChart(dom));
      return;
    }
    inst = echarts.init(dom, null, { renderer: "canvas" });
    bindChartResizeHandlerOnce();
  }
  inst.setOption(buildReportChartOption(), true);
  inst.resize();
  if (dom.id === "reportChartCanvas") reportChart = inst;
}

function buildReportChartOption() {
  const theme = getSmartQueryChartTheme();
  const months = resultChartData.map((d) => d.name);
  const values = resultChartData.map((d) => d.value);
  const anomalyIndex = resultChartData.findIndex((d) => d.anomaly);
  const anomalyData = anomalyIndex >= 0
    ? [{ name: "异常", coord: [resultChartData[anomalyIndex].name, resultChartData[anomalyIndex].value] }]
    : [];

  return {
    grid: { top: 36, left: 50, right: 22, bottom: 32 },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(17, 24, 39, 0.92)",
      borderWidth: 0,
      padding: [8, 10],
      textStyle: { color: "#fff", fontSize: 12 },
      axisPointer: {
        type: "line",
        lineStyle: { color: theme.primaryBorderSoft, width: 1, type: "dashed" }
      },
      formatter: (params) => {
        const p = params[0];
        const idx = p.dataIndex;
        const datum = resultChartData[idx];
        const prev = idx > 0 ? resultChartData[idx - 1].value : null;
        let html = `<strong>${datum.name}</strong><br/>销售额：${datum.value}万`;
        if (prev != null) {
          const pct = ((datum.value - prev) / prev) * 100;
          const sign = pct >= 0 ? "+" : "";
          html += `<br/>环比：${sign}${pct.toFixed(1)}%`;
        }
        if (datum.anomaly) {
          html += `<br/><span style="color:#fdba74;">${datum.anomalyTip}</span>`;
        }
        return html;
      }
    },
    xAxis: {
      type: "category",
      data: months,
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#dbe5f7" } },
      axisLabel: { color: "#7e8aa3", fontSize: 11 }
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#eef2f7", type: "dashed" } },
      axisLabel: { color: "#7e8aa3", fontSize: 11, formatter: "{value}" }
    },
    series: [{
      name: "销售额",
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: 8,
      lineStyle: { width: 3, color: theme.primary },
      itemStyle: { color: theme.primary, borderColor: "#fff", borderWidth: 2 },
      areaStyle: {
        color: {
          type: "linear",
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: theme.primaryRgba(0.32) },
            { offset: 1, color: theme.primaryRgba(0) }
          ]
        }
      },
      emphasis: {
        focus: "series",
        itemStyle: {
          borderWidth: 3,
          shadowBlur: 12,
          shadowColor: theme.primaryRgba(0.45)
        }
      },
      markPoint: {
        symbol: "roundRect",
        symbolSize: [70, 20],
        symbolOffset: [0, -24],
        itemStyle: {
          color: "#fff7ed",
          borderColor: "#fed7aa",
          borderWidth: 1,
          shadowBlur: 8,
          shadowColor: "rgba(180, 83, 9, 0.16)",
          shadowOffsetY: 3
        },
        label: {
          formatter: () => resultChartData[anomalyIndex]?.anomalyTip || "异常",
          color: "#b45309",
          fontSize: 11,
          fontWeight: 700
        },
        data: anomalyData
      },
      data: values
    }]
  };
}

function revealReportFooter() {
  const footer = document.getElementById("reportFooter");
  if (!footer) return;
  footer.classList.add("revealed");
  scrollToAnswerBottom();
}

function startAnalysisReportTypewriter() {
  const tasks = analysisReportTasks;

  const revealedBlocks = new Set();
  let taskIndex = 0;

  const typeText = (task, el, onComplete) => {
    let idx = 0;
    reportTypingTimer = setInterval(() => {
      if (!isAnswering) {
        clearInterval(reportTypingTimer);
        reportTypingTimer = null;
        return;
      }
      el.textContent += task.text[idx] || "";
      idx += 1;
      if (idx >= task.text.length) {
        clearInterval(reportTypingTimer);
        reportTypingTimer = null;
        onComplete();
      }
    }, 18);
  };

  const typeNext = () => {
    if (!isAnswering) return;
    if (taskIndex >= tasks.length) {
      setTimeout(() => {
        if (!isAnswering) return;
        revealReportFooter();
        finishAnswerSimulation();
      }, 240);
      return;
    }

    const task = tasks[taskIndex];
    const el = document.getElementById(task.id);
    if (!el) {
      taskIndex += 1;
      typeNext();
      return;
    }

    const startTyping = () => {
      if (!isAnswering) return;
      typeText(task, el, () => {
        const finishedTaskIndex = taskIndex;
        taskIndex += 1;

        if (tasks[finishedTaskIndex].id === "reportCoreConclusion") {
          setTimeout(() => {
            if (!isAnswering) return;
            revealReportEmbeddedChart();
            setTimeout(typeNext, 320);
          }, 160);
          return;
        }

        setTimeout(typeNext, 80);
      });
    };

    if (!revealedBlocks.has(task.block)) {
      revealedBlocks.add(task.block);
      revealReportBlock(task.block);
      setTimeout(startTyping, 280);
      return;
    }

    startTyping();
  };

  typeNext();
}

function startAnalysisReportSimulation() {
  aiConclusion.textContent = "";
  aiConclusion.classList.remove("typing-cursor");
  insightBox?.classList.add("hidden");
  conclusionTags.classList.add("hidden");
  tableResult.classList.add("hidden");
  chartResult.classList.add("hidden");
  resultViewToolbar.classList.add("hidden");
  answerActionBar?.classList.add("hidden");
  attributionResult?.classList.add("hidden");
  trendResult?.classList.add("hidden");
  comparisonResult?.classList.add("hidden");
  templateResult?.classList.add("hidden");
  if (analysisReportTitle) {
    analysisReportTitle.textContent = `${currentAnswerTitle} · 数据分析报告`;
  }
  analysisResult?.classList.remove("hidden");
  scrollToAnswerBottom();
  setTimeout(startAnalysisReportTypewriter, 240);
}

function revealAttributionBlock(index) {
  const block = document.querySelector(`.current-chat-message .attribution-report-section .analysis-report-block[data-attribution-block="${index}"]`);
  if (!block) return;
  block.classList.remove("report-block-pending");
  block.classList.add("report-block-revealed");
  scrollToAnswerBottom();
}

function revealAttributionEmbeddedChart() {
  const chart = document.getElementById("attributionEmbeddedChart");
  if (!chart) return;
  chart.classList.add("revealed");
  ensureAttributionChart();
  scrollToAnswerBottom();
}

function revealAttributionFooter() {
  const footer = document.getElementById("attributionFooter");
  if (!footer) return;
  footer.classList.add("revealed");
  scrollToAnswerBottom();
}

function ensureAttributionChart() {
  renderAttributionChart(document.getElementById("attributionChartCanvas"));
}

function renderAttributionChart(dom) {
  if (!dom || typeof echarts === "undefined") return;
  let inst = echarts.getInstanceByDom(dom);
  if (!inst) {
    if (!dom.clientWidth || !dom.clientHeight) {
      requestAnimationFrame(() => renderAttributionChart(dom));
      return;
    }
    inst = echarts.init(dom, null, { renderer: "canvas" });
    bindChartResizeHandlerOnce();
  }
  inst.setOption(buildAttributionChartOption(), true);
  inst.resize();
  if (dom.id === "attributionChartCanvas") attributionChart = inst;
}

function buildAttributionChartOption() {
  const theme = getSmartQueryChartTheme();
  const months = resultChartData.map((d) => d.name);
  const values = resultChartData.map((d) => d.value);
  const anomalyIndex = resultChartData.findIndex((d) => d.anomaly);
  const anomalyName = anomalyIndex >= 0 ? resultChartData[anomalyIndex].name : null;
  const anomalyValue = anomalyIndex >= 0 ? resultChartData[anomalyIndex].value : null;
  const anomalyData = anomalyIndex >= 0
    ? [{ name: "异常", coord: [anomalyName, anomalyValue] }]
    : [];

  return {
    grid: { top: 36, left: 50, right: 22, bottom: 32 },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(17, 24, 39, 0.92)",
      borderWidth: 0,
      padding: [8, 10],
      textStyle: { color: "#fff", fontSize: 12 },
      axisPointer: {
        type: "line",
        lineStyle: { color: "#fed7aa", width: 1, type: "dashed" }
      },
      formatter: (params) => {
        const p = params[0];
        const idx = p.dataIndex;
        const datum = resultChartData[idx];
        const prev = idx > 0 ? resultChartData[idx - 1].value : null;
        let html = `<strong>${datum.name}</strong><br/>销售额：${datum.value}万`;
        if (prev != null) {
          const pct = ((datum.value - prev) / prev) * 100;
          const sign = pct >= 0 ? "+" : "";
          html += `<br/>环比：${sign}${pct.toFixed(1)}%`;
        }
        if (datum.anomaly) {
          html += `<br/><span style="color:#fdba74;">${datum.anomalyTip}（异常归因对象）</span>`;
        }
        return html;
      }
    },
    xAxis: {
      type: "category",
      data: months,
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#f3d6b3" } },
      axisLabel: {
        color: (value) => value === anomalyName ? "#b45309" : "#7e8aa3",
        fontSize: 11,
        fontWeight: (value) => value === anomalyName ? 700 : 400
      }
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#f5ead8", type: "dashed" } },
      axisLabel: { color: "#7e8aa3", fontSize: 11 }
    },
    series: [{
      name: "销售额",
      type: "line",
      smooth: true,
      symbol: "circle",
      symbolSize: (val, params) => params.dataIndex === anomalyIndex ? 14 : 7,
      lineStyle: { width: 2.5, color: theme.primary },
      itemStyle: {
        color: (params) => params.dataIndex === anomalyIndex ? "#f97316" : theme.primary,
        borderColor: "#fff",
        borderWidth: 2,
        shadowBlur: (params) => params.dataIndex === anomalyIndex ? 14 : 0,
        shadowColor: "rgba(249, 115, 22, 0.55)"
      },
      areaStyle: {
        color: {
          type: "linear",
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: theme.primaryRgba(0.22) },
            { offset: 1, color: theme.primaryRgba(0) }
          ]
        }
      },
      markLine: anomalyName ? {
        silent: true,
        symbol: "none",
        lineStyle: { color: "#f97316", type: "dashed", width: 1.5 },
        label: { show: false },
        data: [{ xAxis: anomalyName }]
      } : undefined,
      markPoint: {
        symbol: "roundRect",
        symbolSize: [86, 22],
        symbolOffset: [0, -28],
        itemStyle: {
          color: "#fff7ed",
          borderColor: "#f97316",
          borderWidth: 1.2,
          shadowBlur: 10,
          shadowColor: "rgba(249, 115, 22, 0.25)",
          shadowOffsetY: 3
        },
        label: {
          formatter: () => `异常点 ${resultChartData[anomalyIndex]?.anomalyTip || ""}`,
          color: "#b45309",
          fontSize: 11,
          fontWeight: 700
        },
        data: anomalyData
      },
      data: values
    }]
  };
}

function startAttributionReportTypewriter() {
  const tasks = [
    { id: "attributionCoreConclusion", text: "4月华东区销售额 2890 万元，环比 +15.1%，显著超出近 6 个月平均环比增速（+6.7%）+8.4pct，属于结构性异常增长。增量 380 万元主要来自线上渠道大促 + 重点客户集中下单 + 高端新品首销。", block: 0, embedChart: true },
    { id: "attributionDriver1", text: "4·25 线上大促：活动期间 GMV 同比 +38%，线上渠道占比由 35% 提升至 42%。", block: 2 },
    { id: "attributionDriver2", text: "A 系列高端新品上市：4 月首销贡献订单 110 万元，单价高于均值 28%，拉升整体客单价。", block: 2 },
    { id: "attributionDriver3", text: "大客户集中放量：客户 X、Y 的季度采购在 4 月统一落账，单月增量 95 万元。", block: 2 },
    { id: "attributionDriver4", text: "履约能力提升：4 月平均交付周期由 6 天缩短至 4 天，订单兑付率显著改善。", block: 2 },
    { id: "attributionSustain1", text: "大客户订单一次性：X、Y 为季度集中采购，5 月预计回落 60~80 万元。", block: 3 },
    { id: "attributionSustain2", text: "大促效应不可持续：4·25 大促拉动集中在 4 月，5 月需求会回归常态。", block: 3 },
    { id: "attributionSustain3", text: "新品后劲较强：A 系列在 5、6 月仍有补货预期，月均贡献 80~100 万元。", block: 3 },
    { id: "attributionAction1", text: "5 月剔除促销影响后跟踪线上自然销，评估真实需求增量。", block: 4 },
    { id: "attributionAction2", text: "与 X、Y 协商分月供货节奏，平滑大客户波动。", block: 4 },
    { id: "attributionAction3", text: "提前为 A 系列新品备货 + 营销侧重，承接 5、6 月需求。", block: 4 }
  ];

  const revealedBlocks = new Set();
  let taskIndex = 0;

  const typeText = (task, el, onComplete) => {
    let idx = 0;
    reportTypingTimer = setInterval(() => {
      if (!isAnswering) {
        clearInterval(reportTypingTimer);
        reportTypingTimer = null;
        return;
      }
      el.textContent += task.text[idx] || "";
      idx += 1;
      if (idx >= task.text.length) {
        clearInterval(reportTypingTimer);
        reportTypingTimer = null;
        onComplete();
      }
    }, 18);
  };

  const typeNext = () => {
    if (!isAnswering) return;
    if (taskIndex >= tasks.length) {
      setTimeout(() => {
        if (!isAnswering) return;
        revealAttributionFooter();
        finishAnswerSimulation();
      }, 240);
      return;
    }

    const task = tasks[taskIndex];
    const el = document.getElementById(task.id);
    if (!el) {
      taskIndex += 1;
      typeNext();
      return;
    }

    const startTyping = () => {
      if (!isAnswering) return;
      typeText(task, el, () => {
        const finishedTask = tasks[taskIndex];
        taskIndex += 1;

        if (finishedTask.embedChart) {
          setTimeout(() => {
            if (!isAnswering) return;
            revealAttributionEmbeddedChart();
            setTimeout(() => {
              if (!isAnswering) return;
              if (!revealedBlocks.has(1)) {
                revealedBlocks.add(1);
                revealAttributionBlock(1);
              }
              setTimeout(typeNext, 520);
            }, 320);
          }, 160);
          return;
        }

        setTimeout(typeNext, 80);
      });
    };

    if (!revealedBlocks.has(task.block)) {
      revealedBlocks.add(task.block);
      revealAttributionBlock(task.block);
      setTimeout(startTyping, 280);
      return;
    }

    startTyping();
  };

  typeNext();
}

function startAttributionReportSimulation() {
  aiConclusion.textContent = "";
  aiConclusion.classList.remove("typing-cursor");
  insightBox?.classList.add("hidden");
  conclusionTags.classList.add("hidden");
  tableResult.classList.add("hidden");
  chartResult.classList.add("hidden");
  resultViewToolbar.classList.add("hidden");
  answerActionBar?.classList.add("hidden");
  analysisResult?.classList.add("hidden");
  trendResult?.classList.add("hidden");
  comparisonResult?.classList.add("hidden");
  templateResult?.classList.add("hidden");
  if (attributionReportTitle) {
    attributionReportTitle.textContent = `${currentAnswerTitle} · 归因分析报告`;
  }
  attributionResult?.classList.remove("hidden");
  scrollToAnswerBottom();
  setTimeout(startAttributionReportTypewriter, 240);
}

function revealTrendBlock(index) {
  const block = document.querySelector(`.current-chat-message .trend-report-section .analysis-report-block[data-trend-block="${index}"]`);
  if (!block) return;
  block.classList.remove("report-block-pending");
  block.classList.add("report-block-revealed");
  scrollToAnswerBottom();
}

function revealTrendEmbeddedChart() {
  const chart = document.getElementById("trendEmbeddedChart");
  if (!chart) return;
  chart.classList.add("revealed");
  ensureTrendChart();
  scrollToAnswerBottom();
}

function revealTrendFooter() {
  const footer = document.getElementById("trendFooter");
  if (!footer) return;
  footer.classList.add("revealed");
  scrollToAnswerBottom();
}

function ensureTrendChart() {
  renderTrendChart(document.getElementById("trendChartCanvas"));
}

function renderTrendChart(dom) {
  if (!dom || typeof echarts === "undefined") return;
  let inst = echarts.getInstanceByDom(dom);
  if (!inst) {
    if (!dom.clientWidth || !dom.clientHeight) {
      requestAnimationFrame(() => renderTrendChart(dom));
      return;
    }
    inst = echarts.init(dom, null, { renderer: "canvas" });
    bindChartResizeHandlerOnce();
  }
  inst.setOption(buildTrendChartOption(), true);
  inst.resize();
  if (dom.id === "trendChartCanvas") trendChart = inst;
}

function buildTrendChartOption() {
  const theme = getSmartQueryChartTheme();
  const months = [...resultChartData.map((d) => d.name), ...trendForecastData.map((d) => d.name)];
  const lastHistoryName = resultChartData[resultChartData.length - 1].name;

  const historyValues = [
    ...resultChartData.map((d) => d.value),
    ...trendForecastData.map(() => null)
  ];
  const forecastValues = [
    ...resultChartData.map((d, i) => i === resultChartData.length - 1 ? d.value : null),
    ...trendForecastData.map((d) => d.value)
  ];
  const upperValues = [
    ...resultChartData.map((d, i) => i === resultChartData.length - 1 ? d.value : null),
    ...trendForecastData.map((d) => d.upper)
  ];
  const lowerValues = [
    ...resultChartData.map((d, i) => i === resultChartData.length - 1 ? d.value : null),
    ...trendForecastData.map((d) => d.lower)
  ];

  return {
    grid: { top: 44, left: 50, right: 24, bottom: 32 },
    legend: {
      top: 6,
      right: 12,
      icon: "roundRect",
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { color: "#4b5563", fontSize: 11 },
      data: [
        { name: "实际", itemStyle: { color: theme.primary } },
        { name: "预测", itemStyle: { color: "#7c3aed" } },
        { name: "置信区间", itemStyle: { color: "#c4b5fd" } }
      ]
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(17, 24, 39, 0.92)",
      borderWidth: 0,
      padding: [8, 10],
      textStyle: { color: "#fff", fontSize: 12 },
      axisPointer: {
        type: "line",
        lineStyle: { color: "#d8c8ff", width: 1, type: "dashed" }
      },
      formatter: (params) => {
        const idx = params[0].dataIndex;
        const monthName = months[idx];
        const isForecast = idx >= resultChartData.length;
        if (!isForecast) {
          const datum = resultChartData[idx];
          const prev = idx > 0 ? resultChartData[idx - 1].value : null;
          let html = `<strong>${monthName}（实际）</strong><br/>销售额：${datum.value} 万`;
          if (prev != null) {
            const pct = ((datum.value - prev) / prev) * 100;
            const sign = pct >= 0 ? "+" : "";
            html += `<br/>环比：${sign}${pct.toFixed(1)}%`;
          }
          return html;
        }
        const fIdx = idx - resultChartData.length;
        const f = trendForecastData[fIdx];
        return `<strong>${monthName}（预测）</strong><br/>预测值：${f.value} 万<br/>置信区间：${f.lower} ~ ${f.upper}<br/>环比：+${f.mom.toFixed(1)}% · 同比：+${f.yoy.toFixed(1)}%`;
      }
    },
    xAxis: {
      type: "category",
      data: months,
      boundaryGap: false,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#e5dcff" } },
      axisLabel: {
        color: "#7e8aa3",
        fontSize: 11,
        formatter: (val) => {
          const isForecast = months.indexOf(val) >= resultChartData.length;
          return isForecast ? `{f|${val}}` : val;
        },
        rich: { f: { color: "#7c3aed", fontWeight: 600 } }
      }
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#ece4ff", type: "dashed" } },
      axisLabel: { color: "#7e8aa3", fontSize: 11 }
    },
    series: [
      {
        name: "置信区间",
        type: "line",
        stack: "confidence",
        data: lowerValues,
        symbol: "none",
        lineStyle: { opacity: 0 },
        itemStyle: { color: "rgba(124, 58, 237, 0)" },
        areaStyle: { color: "rgba(124, 58, 237, 0)" },
        showInLegend: false,
        silent: true
      },
      {
        name: "置信区间",
        type: "line",
        stack: "confidence",
        data: upperValues.map((v, i) => v == null ? null : (v - (lowerValues[i] || 0))),
        symbol: "none",
        lineStyle: { opacity: 0 },
        areaStyle: { color: "rgba(167, 139, 250, 0.18)" },
        silent: true
      },
      {
        name: "实际",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        connectNulls: false,
        lineStyle: { width: 2.5, color: theme.primary },
        itemStyle: { color: theme.primary, borderColor: "#fff", borderWidth: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: theme.primaryRgba(0.22) },
              { offset: 1, color: theme.primaryRgba(0) }
            ]
          }
        },
        data: historyValues
      },
      {
        name: "预测",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        connectNulls: false,
        lineStyle: { width: 2.5, color: "#7c3aed", type: "dashed" },
        itemStyle: { color: "#7c3aed", borderColor: "#fff", borderWidth: 2 },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: "#a78bfa", type: "dashed", width: 1.4 },
          label: {
            show: true,
            position: "insideEndTop",
            formatter: "预测起点",
            color: "#7c3aed",
            fontSize: 11,
            fontWeight: 600
          },
          data: [{ xAxis: lastHistoryName }]
        },
        data: forecastValues
      }
    ]
  };
}

function startTrendReportTypewriter() {
  const tasks = [
    { id: "trendOverview", text: "近 6 个月销售额从 1 月 2180 万元持续增长到 6 月 3248 万元（+49.0%）。基于历史趋势 + 季节性 + 业务节奏修正，未来 3 个月（7-9 月）预计为 3380、3520、3680 万元，环比保持 +4~4.5%，第三季度合计 10580 万元，同比 +28.1%。", block: 0, embedChart: true },
    { id: "trendModelIntro", text: "预测以近 6 个月销售时序为底层数据，采用 Holt-Winters 三参数指数平滑（α=0.62、β=0.18、γ=0.30），叠加 4·25 大促与 9 月双节季节性修正，并按业务规则对新品上市与大客户节奏进行权重调整。", block: 2 },
    { id: "trendRiskUp1", text: "9 月双节叠加旺季，节奏与活动有望进一步放大销售增速。", block: 3 },
    { id: "trendRiskUp2", text: "A 系列高端新品渠道铺货持续扩张，对客单价具备拉升空间。", block: 3 },
    { id: "trendRiskUp3", text: "重点大客户 Q3 续约与新签订单可能带来额外增量。", block: 3 },
    { id: "trendRiskDown1", text: "Q3 高基数效应使同比增速可能逐月走弱，需警惕环比放缓。", block: 3 },
    { id: "trendRiskDown2", text: "原材料成本与渠道返利波动，可能挤压主推产品毛利。", block: 3 },
    { id: "trendRiskDown3", text: "若 7 月线上自然销不及预期，需向下重新校准 8-9 月预测。", block: 3 },
    { id: "trendActionPace", text: "按 7 月 +4.1% / 8 月 +4.1% / 9 月 +4.5% 制定团队 KPI 与回款节奏，9 月双节按上限冲刺。", block: 4 },
    { id: "trendActionStock", text: "A 系列新品按预测上限（≈9% 上浮）备货；老品按中位预测备货，避免库存积压。", block: 4 },
    { id: "trendActionMonitor", text: "周度跟踪订单转化率、客单价与库存周转；若任一指标连续 2 周偏离基线 ±3%，触发预测重校准。", block: 4 }
  ];

  const revealedBlocks = new Set();
  let taskIndex = 0;

  const typeText = (task, el, onComplete) => {
    let idx = 0;
    reportTypingTimer = setInterval(() => {
      if (!isAnswering) {
        clearInterval(reportTypingTimer);
        reportTypingTimer = null;
        return;
      }
      el.textContent += task.text[idx] || "";
      idx += 1;
      if (idx >= task.text.length) {
        clearInterval(reportTypingTimer);
        reportTypingTimer = null;
        onComplete();
      }
    }, 18);
  };

  const typeNext = () => {
    if (!isAnswering) return;
    if (taskIndex >= tasks.length) {
      setTimeout(() => {
        if (!isAnswering) return;
        revealTrendFooter();
        finishAnswerSimulation();
      }, 240);
      return;
    }

    const task = tasks[taskIndex];
    const el = document.getElementById(task.id);
    if (!el) {
      taskIndex += 1;
      typeNext();
      return;
    }

    const startTyping = () => {
      if (!isAnswering) return;
      typeText(task, el, () => {
        const finishedTask = tasks[taskIndex];
        taskIndex += 1;

        if (finishedTask.embedChart) {
          setTimeout(() => {
            if (!isAnswering) return;
            revealTrendEmbeddedChart();
            setTimeout(() => {
              if (!isAnswering) return;
              if (!revealedBlocks.has(1)) {
                revealedBlocks.add(1);
                revealTrendBlock(1);
              }
              setTimeout(typeNext, 460);
            }, 320);
          }, 160);
          return;
        }

        setTimeout(typeNext, 80);
      });
    };

    if (!revealedBlocks.has(task.block)) {
      revealedBlocks.add(task.block);
      revealTrendBlock(task.block);
      setTimeout(startTyping, 280);
      return;
    }

    startTyping();
  };

  typeNext();
}

function startTrendReportSimulation() {
  aiConclusion.textContent = "";
  aiConclusion.classList.remove("typing-cursor");
  insightBox?.classList.add("hidden");
  conclusionTags.classList.add("hidden");
  tableResult.classList.add("hidden");
  chartResult.classList.add("hidden");
  resultViewToolbar.classList.add("hidden");
  answerActionBar?.classList.add("hidden");
  analysisResult?.classList.add("hidden");
  attributionResult?.classList.add("hidden");
  comparisonResult?.classList.add("hidden");
  templateResult?.classList.add("hidden");
  if (trendReportTitle) {
    trendReportTitle.textContent = `${currentAnswerTitle} · 趋势分析报告`;
  }
  trendResult?.classList.remove("hidden");
  scrollToAnswerBottom();
  setTimeout(startTrendReportTypewriter, 240);
}

// ==================== 对比分析 (Comparison) ====================
function revealComparisonBlock(index) {
  const block = document.querySelector(
    `.current-chat-message .comparison-report-section .analysis-report-block[data-comparison-block="${index}"]`
  );
  if (!block) return;
  block.classList.remove("report-block-pending");
  block.classList.add("report-block-revealed");
  scrollToAnswerBottom();
}

function revealComparisonEmbeddedChart() {
  const chart = document.getElementById("comparisonEmbeddedChart");
  if (!chart) return;
  chart.classList.add("revealed");
  ensureComparisonChart();
  scrollToAnswerBottom();
}

function revealComparisonFooter() {
  const footer = document.getElementById("comparisonFooter");
  if (!footer) return;
  footer.classList.add("revealed");
  scrollToAnswerBottom();
}

function ensureComparisonChart() {
  renderComparisonChart(document.getElementById("comparisonChartCanvas"));
}

function renderComparisonChart(dom) {
  if (!dom || typeof echarts === "undefined") return;
  let inst = echarts.getInstanceByDom(dom);
  if (!inst) {
    if (!dom.clientWidth || !dom.clientHeight) {
      requestAnimationFrame(() => renderComparisonChart(dom));
      return;
    }
    inst = echarts.init(dom, null, { renderer: "canvas" });
    bindChartResizeHandlerOnce();
  }
  inst.setOption(buildComparisonChartOption(), true);
  inst.resize();
  if (dom.id === "comparisonChartCanvas") comparisonChart = inst;
}

function buildComparisonChartOption() {
  const values2026 = resultChartData.map((d) => d.value);
  const values2025 = [1690, 1820, 1950, 2230, 2410, 2540];
  const categories = ["1月", "2月", "3月", "4月", "5月", "6月"];
  const yoyValues = values2026.map((v, i) => {
    const base = values2025[i] || 1;
    return Number((((v - base) / base) * 100).toFixed(1));
  });

  return {
    grid: { top: 56, left: 56, right: 56, bottom: 36 },
    legend: {
      top: 6,
      itemWidth: 14,
      itemHeight: 8,
      data: ["2025 年 1-6 月", "2026 年 1-6 月", "同比增长率"],
      textStyle: { color: "#475569", fontSize: 12 }
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      borderWidth: 0,
      padding: [8, 10],
      textStyle: { color: "#fff", fontSize: 12 },
      axisPointer: {
        type: "shadow",
        shadowStyle: { color: "rgba(20, 184, 166, 0.08)" }
      },
      formatter: (params) => {
        let html = `<strong>${params[0].name}</strong>`;
        const v25 = params.find((p) => p.seriesName.indexOf("2025") >= 0)?.value || 0;
        const v26 = params.find((p) => p.seriesName.indexOf("2026") >= 0)?.value || 0;
        const yoy = params.find((p) => p.seriesName === "同比增长率")?.value || 0;
        params.forEach((p) => {
          if (p.seriesName === "同比增长率") {
            html += `<br/>${p.marker}${p.seriesName}：${p.value >= 0 ? "+" : ""}${p.value}%`;
          } else {
            html += `<br/>${p.marker}${p.seriesName}：${p.value} 万`;
          }
        });
        if (v25 && v26) {
          const diff = v26 - v25;
          const sign = diff >= 0 ? "+" : "";
          html += `<br/><span style="color:#5eead4">差值：${sign}${diff} 万 · ${sign}${yoy}%</span>`;
        }
        return html;
      }
    },
    xAxis: {
      type: "category",
      data: categories,
      boundaryGap: true,
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      axisTick: { show: false },
      axisLabel: { color: "#475569", fontSize: 12 }
    },
    yAxis: [
      {
        type: "value",
        name: "销售额（万元）",
        nameTextStyle: { color: "#94a3b8", fontSize: 11, padding: [0, 0, 0, 30] },
        splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#94a3b8", fontSize: 11 }
      },
      {
        type: "value",
        name: "同比 (%)",
        nameTextStyle: { color: "#94a3b8", fontSize: 11, padding: [0, 30, 0, 0] },
        splitLine: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#94a3b8", fontSize: 11, formatter: "{value}%" },
        min: 0,
        max: 50
      }
    ],
    series: [
      {
        name: "同比增长率",
        type: "bar",
        yAxisIndex: 1,
        data: yoyValues,
        barWidth: 16,
        z: 1,
        itemStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: "rgba(45, 212, 191, 0.45)" }, { offset: 1, color: "rgba(45, 212, 191, 0.12)" }]
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: "top",
          color: "#0f766e",
          fontSize: 10,
          fontWeight: 600,
          formatter: (p) => `+${p.value}%`
        }
      },
      {
        name: "2025 年 1-6 月",
        type: "line",
        yAxisIndex: 0,
        data: values2025,
        z: 2,
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: { color: "#94a3b8", width: 2, type: "dashed" },
        itemStyle: { color: "#94a3b8", borderColor: "#fff", borderWidth: 2 },
        label: { show: true, position: "bottom", color: "#64748b", fontSize: 11, fontWeight: 500 }
      },
      {
        name: "2026 年 1-6 月",
        type: "line",
        yAxisIndex: 0,
        data: values2026,
        z: 3,
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { color: "#0d9488", width: 2.6 },
        itemStyle: { color: "#0d9488", borderColor: "#fff", borderWidth: 2 },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: "rgba(13, 148, 136, 0.18)" }, { offset: 1, color: "rgba(13, 148, 136, 0.02)" }]
          }
        },
        label: { show: true, position: "top", color: "#0f766e", fontSize: 11, fontWeight: 700 }
      }
    ]
  };
}

function startComparisonReportTypewriter() {
  const tasks = [
    { id: "comparisonOverview", text: "基于上传的 2025 年 1-6 月华东区销售明细（约 7.5 万行）与当前查询的 2026 年同期数据进行同比对比：销售额 16,308 万 vs 12,640 万，同比 +29.0%；订单量 +14.9%、客单价 +12.3%；复购率 +4.2pp、退货率 -0.9pp、毛利率 +2.3pp。规模拉动 + 量价齐升 + 客户粘性改善 + 盈利质量提升，四重驱动支撑同期业绩高质量增长。", block: 0, embedChart: true },
    { id: "comparisonDriverM1", text: "2026 年新增 4·25 大促与 6·18 升级 2 场年中活动，新增订单贡献占总增量的 21%。", block: 3 },
    { id: "comparisonDriverM2", text: "直播带货 GMV 占比由 2025 年的 5% 提升至 2026 年的 12%，是新增量的主要来源。", block: 3 },
    { id: "comparisonDriverC1", text: "线上自营渠道占比由 2025 年的 35% 提升至 2026 年的 41%，规模效应放大。", block: 3 },
    { id: "comparisonDriverC2", text: "私域复购贡献同比提升 4 个百分点，留存型增量稳健。", block: 3 },
    { id: "comparisonDriverS1", text: "高端系列与主推新品上量，带动客单价同比 +12.3%，结构升级显著。", block: 3 },
    { id: "comparisonDriverS2", text: "户外 / 出行品类同比 +28%，与销售结构改善方向吻合。", block: 3 },
    { id: "comparisonAction1", text: "沿用 2026 营销节奏与渠道组合，巩固已验证的 +29% 同比增速与高 ROI 模式。", block: 4 },
    { id: "comparisonAction2", text: "识别 2026 高增长贡献区域，反向复制到 2025 同期表现偏弱的城市与渠道。", block: 4 },
    { id: "comparisonAction3", text: "周度跟踪销售额、客单价、退货率三项核心指标，同比波动 ±5% 触发预警与干预。", block: 4 }
  ];

  const revealedBlocks = new Set();
  let taskIndex = 0;

  const typeText = (task, el, onComplete) => {
    let idx = 0;
    reportTypingTimer = setInterval(() => {
      if (!isAnswering) {
        clearInterval(reportTypingTimer);
        reportTypingTimer = null;
        return;
      }
      el.textContent += task.text[idx] || "";
      idx += 1;
      if (idx >= task.text.length) {
        clearInterval(reportTypingTimer);
        reportTypingTimer = null;
        onComplete();
      }
    }, 18);
  };

  const typeNext = () => {
    if (!isAnswering) return;
    if (taskIndex >= tasks.length) {
      setTimeout(() => {
        if (!isAnswering) return;
        revealComparisonFooter();
        finishAnswerSimulation();
      }, 240);
      return;
    }

    const task = tasks[taskIndex];
    const el = document.getElementById(task.id);
    if (!el) {
      taskIndex += 1;
      typeNext();
      return;
    }

    const startTyping = () => {
      if (!isAnswering) return;
      typeText(task, el, () => {
        const finishedTask = tasks[taskIndex];
        taskIndex += 1;

        if (finishedTask.embedChart) {
          setTimeout(() => {
            if (!isAnswering) return;
            // 先显示对比表格区块（block 1），让用户看到数据
            if (!revealedBlocks.has(1)) {
              revealedBlocks.add(1);
              revealComparisonBlock(1);
            }
            setTimeout(() => {
              if (!isAnswering) return;
              // 再展示对比图表区块（block 2）
              if (!revealedBlocks.has(2)) {
                revealedBlocks.add(2);
                revealComparisonBlock(2);
              }
              revealComparisonEmbeddedChart();
              setTimeout(typeNext, 480);
            }, 360);
          }, 200);
          return;
        }

        setTimeout(typeNext, 80);
      });
    };

    if (!revealedBlocks.has(task.block)) {
      revealedBlocks.add(task.block);
      revealComparisonBlock(task.block);
      setTimeout(startTyping, 280);
      return;
    }

    startTyping();
  };

  typeNext();
}

function startComparisonReportSimulation() {
  aiConclusion.textContent = "";
  aiConclusion.classList.remove("typing-cursor");
  insightBox?.classList.add("hidden");
  conclusionTags.classList.add("hidden");
  tableResult.classList.add("hidden");
  chartResult.classList.add("hidden");
  resultViewToolbar.classList.add("hidden");
  answerActionBar?.classList.add("hidden");
  analysisResult?.classList.add("hidden");
  attributionResult?.classList.add("hidden");
  trendResult?.classList.add("hidden");
  templateResult?.classList.add("hidden");
  if (comparisonReportTitle) {
    comparisonReportTitle.textContent = `${currentAnswerTitle} · 对比分析报告`;
  }
  comparisonResult?.classList.remove("hidden");
  scrollToAnswerBottom();
  setTimeout(startComparisonReportTypewriter, 240);
}

// ==================== 模板分析 (Template) ====================
function revealTemplateBlock(index) {
  const block = document.querySelector(
    `.current-chat-message .template-report-section .analysis-report-block[data-template-block="${index}"]`
  );
  if (!block) return;
  block.classList.remove("report-block-pending");
  block.classList.add("report-block-revealed");
  scrollToAnswerBottom();
}

function revealTemplateFooter() {
  const footer = document.getElementById("templateFooter");
  if (!footer) return;
  footer.classList.add("revealed");
  scrollToAnswerBottom();
}

function startTemplateReportTypewriter() {
  const tasks = [
    { id: "templateSummary", text: "5 月华东区销售业绩亮眼：销售额 3,108 万元（达成率 105.0%、同比 +33.6%），订单量 4.18 万单，客单价 743 元，毛利率 32.5%。月度核心指标全部达标，整体延续高质量增长态势。", block: 0 },
    { id: "templateOverview", text: "5 月华东区销售额 3,108 万元，同比 +33.6%、环比 +4.1%；订单量 4.18 万单，同比 +28.2%；客单价 743 元，同比 +4.2%；毛利率 32.5%，较目标高 1.5 个百分点；复购率 26.8%，较 4 月提升 2.1pp。整体延续 4 月增长态势，月度销售额目标达成 105.0%，超额完成 4.96 个百分点。", block: 1 },
    { id: "templateRisk1", text: "客单价微降的二三线城市，需关注价格敏感型客户流失，启动定向留存运营。", block: 4 },
    { id: "templateRisk2", text: "经销商库存周转放慢至 38 天，存在压货风险，建议主动调整发货节奏。", block: 4 },
    { id: "templateRisk3", text: "智能配件品类退货率上升 0.4pp，需复盘上市批次质量与售后口径。", block: 4 },
    { id: "templatePlan1", text: "6 月延续大促节奏（6·18 + 私域返场），重点提升二线城市覆盖与新客获取。", block: 4 },
    { id: "templatePlan2", text: "新增 2 场区域专项活动，目标 ROI ≥ 5，覆盖南通、宁波、温州三地。", block: 4 },
    { id: "templatePlan3", text: "升级私域用户运营，5 月复购率 +2.1pp 基础上，目标 6 月复购率再 +1pp。", block: 4 }
  ];

  const revealedBlocks = new Set();
  let taskIndex = 0;

  const typeText = (task, el, onComplete) => {
    let idx = 0;
    reportTypingTimer = setInterval(() => {
      if (!isAnswering) {
        clearInterval(reportTypingTimer);
        reportTypingTimer = null;
        return;
      }
      el.textContent += task.text[idx] || "";
      idx += 1;
      if (idx >= task.text.length) {
        clearInterval(reportTypingTimer);
        reportTypingTimer = null;
        onComplete();
      }
    }, 18);
  };

  const typeNext = () => {
    if (!isAnswering) return;
    if (taskIndex >= tasks.length) {
      setTimeout(() => {
        if (!isAnswering) return;
        // 摘要后还要展示完成情况、区域贡献两个静态块
        if (!revealedBlocks.has(2)) {
          revealedBlocks.add(2);
          revealTemplateBlock(2);
        }
        if (!revealedBlocks.has(3)) {
          revealedBlocks.add(3);
          revealTemplateBlock(3);
        }
        setTimeout(() => {
          if (!isAnswering) return;
          revealTemplateFooter();
          finishAnswerSimulation();
        }, 320);
      }, 240);
      return;
    }

    const task = tasks[taskIndex];
    const el = document.getElementById(task.id);
    if (!el) {
      taskIndex += 1;
      typeNext();
      return;
    }

    const startTyping = () => {
      if (!isAnswering) return;
      typeText(task, el, () => {
        taskIndex += 1;

        // 摘要打完后顺势展示业绩概述（block 1）；进入到风险预警块前先展示完成度/区域贡献
        if (taskIndex < tasks.length && tasks[taskIndex].block === 4) {
          if (!revealedBlocks.has(2)) {
            revealedBlocks.add(2);
            revealTemplateBlock(2);
          }
          setTimeout(() => {
            if (!isAnswering) return;
            if (!revealedBlocks.has(3)) {
              revealedBlocks.add(3);
              revealTemplateBlock(3);
            }
            setTimeout(typeNext, 360);
          }, 360);
          return;
        }

        setTimeout(typeNext, 80);
      });
    };

    if (!revealedBlocks.has(task.block)) {
      revealedBlocks.add(task.block);
      revealTemplateBlock(task.block);
      setTimeout(startTyping, 280);
      return;
    }

    startTyping();
  };

  typeNext();
}

function startTemplateReportSimulation() {
  aiConclusion.textContent = "";
  aiConclusion.classList.remove("typing-cursor");
  insightBox?.classList.add("hidden");
  conclusionTags.classList.add("hidden");
  tableResult.classList.add("hidden");
  chartResult.classList.add("hidden");
  resultViewToolbar.classList.add("hidden");
  answerActionBar?.classList.add("hidden");
  analysisResult?.classList.add("hidden");
  attributionResult?.classList.add("hidden");
  trendResult?.classList.add("hidden");
  comparisonResult?.classList.add("hidden");
  if (templateReportTitle) {
    templateReportTitle.textContent = `${currentAnswerTitle} · 5 月份销售分析月报`;
  }
  templateResult?.classList.remove("hidden");
  scrollToAnswerBottom();
  setTimeout(startTemplateReportTypewriter, 240);
}

function copyAnswerContent() {
  let text = aiConclusion?.textContent?.trim() || "";
  if (!text && currentAnswerMode === "analysis") {
    const reportSection = document.getElementById("analysisResult");
    if (reportSection && !reportSection.classList.contains("hidden")) {
      text = reportSection.innerText?.trim() || "";
    }
  }
  if (!text && currentAnswerMode === "comparison") {
    const reportSection = document.getElementById("comparisonResult");
    if (reportSection && !reportSection.classList.contains("hidden")) {
      text = reportSection.innerText?.trim() || "";
    }
  }
  if (!text && currentAnswerMode === "template") {
    const reportSection = document.getElementById("templateResult");
    if (reportSection && !reportSection.classList.contains("hidden")) {
      text = reportSection.innerText?.trim() || "";
    }
  }
  if (!text && currentAnswerMode === "attribution") {
    const reportSection = document.getElementById("attributionResult");
    if (reportSection && !reportSection.classList.contains("hidden")) {
      text = reportSection.innerText?.trim() || "";
    }
  }
  if (!text && currentAnswerMode === "trend") {
    const reportSection = document.getElementById("trendResult");
    if (reportSection && !reportSection.classList.contains("hidden")) {
      text = reportSection.innerText?.trim() || "";
    }
  }
  if (!text) {
    showToast("当前无可复制内容");
    return;
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast("已复制回答内容"))
      .catch(() => fallbackCopyText(text));
    return;
  }
  fallbackCopyText(text);
}

function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  showToast(copied ? "已复制回答内容" : "复制失败，请手动复制");
}

function regenerateAnswer() {
  showToast("正在重新生成回答");
  startAnswerSimulation({
    mode: currentAnswerMode,
    questionText: currentQuestionText,
    answerTitle: currentAnswerTitle
  });
}

function setAnswerVote(vote) {
  answerVote = answerVote === vote ? "" : vote;
  document.querySelectorAll(".answer-action-btn[data-vote]").forEach((button) => {
    button.classList.toggle("active", button.dataset.vote === answerVote);
  });
  if (answerVote === "like") showToast("已标记为喜欢");
  if (answerVote === "dislike") showToast("已标记为不喜欢");
  if (!answerVote) showToast("已取消评价");
}

function startDataInterpretation() {
  archiveCurrentMessageIfNeeded();
  const baseTitle = resultTitle?.textContent?.trim() || currentAnswerTitle;
  currentQuestionText = `${baseTitle}-数据解读`;
  currentAnswerTitle = currentQuestionText;
  showToast("正在生成数据解读");
  startAnswerSimulation({
    mode: "analysis",
    questionText: currentQuestionText,
    answerTitle: currentAnswerTitle
  });
}

function archiveCurrentMessageIfNeeded() {
  if (!answerBlock || answerBlock.classList.contains("hidden")) return;
  if (!conversationHistory) return;
  const currentMessage = answerBlock.querySelector(".current-chat-message");
  const questionText = userQuestionBubble?.textContent?.trim();
  if (!currentMessage || !questionText) return;

  const archived = currentMessage.cloneNode(true);
  archived.classList.remove("current-chat-message");
  archived.classList.add("archived-message");
  archived.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  const keepInteractive = ".action-dropdown-btn, .answer-action-btn, .chart-point";
  archived.querySelectorAll("[onclick]").forEach((el) => {
    if (el.matches(keepInteractive)) return;
    el.removeAttribute("onclick");
  });

  archived.querySelectorAll(".chart-switch [data-view]").forEach((btn) => {
    const type = btn.dataset.view;
    btn.setAttribute("onclick", `setArchivedResultView('${type}', this)`);
  });

  const archivedCanvas = archived.querySelector(".chart-canvas");
  if (archivedCanvas) {
    archivedCanvas.innerHTML = "";
    archivedCanvas.removeAttribute("_echarts_instance_");
  }
  archived.querySelectorAll(".report-chart-canvas").forEach((c) => {
    c.innerHTML = "";
    c.removeAttribute("_echarts_instance_");
  });

  conversationHistory.appendChild(archived);

  const archivedChartCard = archived.querySelector(".chart-card");
  const chartShown = archivedChartCard && !archivedChartCard.classList.contains("hidden");
  if (archivedCanvas && resultChart && chartShown) {
    const view = currentResultView || "line";
    requestAnimationFrame(() => renderArchivedChart(archivedCanvas, view));
  }

  const archivedAnalysisReport = archived.querySelector(".analysis-report-section");
  const analysisShown = archivedAnalysisReport && !archivedAnalysisReport.classList.contains("hidden");
  const archivedAnalysisCanvas = archivedAnalysisReport?.querySelector(".report-chart-canvas");
  if (archivedAnalysisCanvas && reportChart && analysisShown) {
    requestAnimationFrame(() => renderArchivedReportChart(archivedAnalysisCanvas));
  }

  const archivedAttributionReport = archived.querySelector(".attribution-report-section");
  const attributionShown = archivedAttributionReport && !archivedAttributionReport.classList.contains("hidden");
  const archivedAttributionCanvas = archivedAttributionReport?.querySelector(".report-chart-canvas");
  if (archivedAttributionCanvas && attributionChart && attributionShown) {
    requestAnimationFrame(() => renderArchivedAttributionChart(archivedAttributionCanvas));
  }

  const archivedTrendReport = archived.querySelector(".trend-report-section");
  const trendShown = archivedTrendReport && !archivedTrendReport.classList.contains("hidden");
  const archivedTrendCanvas = archivedTrendReport?.querySelector(".report-chart-canvas");
  if (archivedTrendCanvas && trendChart && trendShown) {
    requestAnimationFrame(() => renderArchivedTrendChart(archivedTrendCanvas));
  }

  const archivedComparisonReport = archived.querySelector(".comparison-report-section");
  const comparisonShown = archivedComparisonReport && !archivedComparisonReport.classList.contains("hidden");
  const archivedComparisonCanvas = archivedComparisonReport?.querySelector(".report-chart-canvas");
  if (archivedComparisonCanvas && comparisonChart && comparisonShown) {
    requestAnimationFrame(() => renderArchivedComparisonChart(archivedComparisonCanvas));
  }
}

function scrollToAnswerBottom() {
  const chatScroll = document.querySelector(".chat-scroll");
  if (!chatScroll) return;
  chatScroll.scrollTo({
    top: chatScroll.scrollHeight,
    behavior: "smooth"
  });
}

function setResultView(type, animate = true) {
  document.querySelectorAll("#resultViewToolbar [data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === type);
  });

  tableResult.classList.remove("hidden");
  if (animate) chartResult.classList.remove("hidden");

  currentResultView = type;
  ensureResultChart(() => {
    if (!resultChart) return;
    resultChart.setOption(buildResultChartOption(type), true);
    resultChart.resize();
  });
}

function ensureResultChart(callback) {
  if (resultChart) {
    if (callback) callback();
    return;
  }
  if (typeof echarts === "undefined") return;
  const dom = document.getElementById("chartCanvas");
  if (!dom) return;
  if (!dom.clientWidth || !dom.clientHeight) {
    requestAnimationFrame(() => ensureResultChart(callback));
    return;
  }
  resultChart = echarts.init(dom, null, { renderer: "canvas" });
  bindChartResizeHandlerOnce();
  if (callback) callback();
}

function setArchivedResultView(type, btn) {
  if (!btn) return;
  const scopeRoot = btn.closest(".archived-message");
  if (!scopeRoot) return;
  const toolbar = scopeRoot.querySelector(".chart-switch");
  const dom = scopeRoot.querySelector(".chart-canvas");
  if (toolbar) {
    toolbar.querySelectorAll("[data-view]").forEach((b) => {
      b.classList.toggle("active", b.dataset.view === type);
    });
  }
  if (!dom || typeof echarts === "undefined") return;
  let inst = echarts.getInstanceByDom(dom);
  if (!inst) {
    if (!dom.clientWidth || !dom.clientHeight) {
      requestAnimationFrame(() => setArchivedResultView(type, btn));
      return;
    }
    inst = echarts.init(dom, null, { renderer: "canvas" });
    bindChartResizeHandlerOnce();
  }
  inst.setOption(buildResultChartOption(type), true);
  inst.resize();
}

function renderArchivedChart(dom, type) {
  if (!dom || typeof echarts === "undefined") return;
  if (!dom.clientWidth || !dom.clientHeight) {
    requestAnimationFrame(() => renderArchivedChart(dom, type));
    return;
  }
  let inst = echarts.getInstanceByDom(dom);
  if (!inst) {
    inst = echarts.init(dom, null, { renderer: "canvas" });
    bindChartResizeHandlerOnce();
  }
  inst.setOption(buildResultChartOption(type), true);
  inst.resize();
}

function renderArchivedReportChart(dom) {
  if (!dom || typeof echarts === "undefined") return;
  if (!dom.clientWidth || !dom.clientHeight) {
    requestAnimationFrame(() => renderArchivedReportChart(dom));
    return;
  }
  let inst = echarts.getInstanceByDom(dom);
  if (!inst) {
    inst = echarts.init(dom, null, { renderer: "canvas" });
    bindChartResizeHandlerOnce();
  }
  inst.setOption(buildReportChartOption(), true);
  inst.resize();
}

function renderArchivedAttributionChart(dom) {
  if (!dom || typeof echarts === "undefined") return;
  if (!dom.clientWidth || !dom.clientHeight) {
    requestAnimationFrame(() => renderArchivedAttributionChart(dom));
    return;
  }
  let inst = echarts.getInstanceByDom(dom);
  if (!inst) {
    inst = echarts.init(dom, null, { renderer: "canvas" });
    bindChartResizeHandlerOnce();
  }
  inst.setOption(buildAttributionChartOption(), true);
  inst.resize();
}

function renderArchivedTrendChart(dom) {
  if (!dom || typeof echarts === "undefined") return;
  if (!dom.clientWidth || !dom.clientHeight) {
    requestAnimationFrame(() => renderArchivedTrendChart(dom));
    return;
  }
  let inst = echarts.getInstanceByDom(dom);
  if (!inst) {
    inst = echarts.init(dom, null, { renderer: "canvas" });
    bindChartResizeHandlerOnce();
  }
  inst.setOption(buildTrendChartOption(), true);
  inst.resize();
}

function renderArchivedComparisonChart(dom) {
  if (!dom || typeof echarts === "undefined") return;
  if (!dom.clientWidth || !dom.clientHeight) {
    requestAnimationFrame(() => renderArchivedComparisonChart(dom));
    return;
  }
  let inst = echarts.getInstanceByDom(dom);
  if (!inst) {
    inst = echarts.init(dom, null, { renderer: "canvas" });
    bindChartResizeHandlerOnce();
  }
  inst.setOption(buildComparisonChartOption(), true);
  inst.resize();
}

function bindChartResizeHandlerOnce() {
  if (bindChartResizeHandlerOnce._bound) return;
  bindChartResizeHandlerOnce._bound = true;
  window.addEventListener("resize", () => {
    if (typeof echarts === "undefined") return;
    document.querySelectorAll(".chart-canvas, .report-chart-canvas").forEach((dom) => {
      const inst = echarts.getInstanceByDom(dom);
      if (inst) inst.resize();
    });
  });
}

function buildResultChartOption(type) {
  if (type === "pie") return buildPieChartOption();
  return buildAxisChartOption(type);
}

function buildPieChartOption() {
  const theme = getSmartQueryChartTheme();
  const total = resultChartData.reduce((sum, item) => sum + item.value, 0);
  return {
    color: getResultChartPalette(),
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(17, 24, 39, 0.92)",
      borderWidth: 0,
      padding: [10, 12],
      textStyle: { color: "#fff", fontSize: 12 },
      formatter: (params) => `${params.name}<br/>销售额：${params.value}万 (${params.percent}%)`
    },
    legend: {
      orient: "vertical",
      right: 28,
      top: "middle",
      icon: "circle",
      itemGap: 12,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: "#3b4a64", fontSize: 12 },
      formatter: (name) => {
        const item = resultChartData.find((d) => d.name === name);
        if (!item) return name;
        const pct = ((item.value / total) * 100).toFixed(1);
        return `${name}  ${item.value}万 (${pct}%)`;
      }
    },
    series: [{
      type: "pie",
      radius: ["44%", "68%"],
      center: ["32%", "52%"],
      avoidLabelOverlap: true,
      itemStyle: {
        borderColor: "#fff",
        borderWidth: 2,
        borderRadius: 4
      },
      label: { show: false },
      labelLine: { show: false },
      emphasis: {
        scale: true,
        scaleSize: 6,
        itemStyle: {
          shadowBlur: 18,
          shadowOffsetY: 4,
          shadowColor: theme.primaryRgba(0.35)
        }
      },
      data: resultChartData.map((d) => ({ name: d.name, value: d.value }))
    }]
  };
}

function buildAxisChartOption(type) {
  const theme = getSmartQueryChartTheme();
  const months = resultChartData.map((d) => d.name);
  const values = resultChartData.map((d) => d.value);
  const isBar = type === "bar";
  const isArea = type === "area";
  const anomalyIndex = resultChartData.findIndex((d) => d.anomaly);
  const anomalyData = anomalyIndex >= 0
    ? [{ name: "异常", coord: [resultChartData[anomalyIndex].name, resultChartData[anomalyIndex].value] }]
    : [];

  const markPoint = {
    symbol: "roundRect",
    symbolSize: [78, 22],
    symbolOffset: [0, -28],
    itemStyle: {
      color: "#fff7ed",
      borderColor: "#fed7aa",
      borderWidth: 1,
      shadowBlur: 8,
      shadowColor: "rgba(180, 83, 9, 0.16)",
      shadowOffsetY: 3
    },
    label: {
      formatter: () => resultChartData[anomalyIndex]?.anomalyTip || "异常",
      color: "#b45309",
      fontSize: 11,
      fontWeight: 700
    },
    data: anomalyData
  };

  const lineSeries = {
    name: "销售额",
    type: "line",
    smooth: true,
    symbol: "circle",
    symbolSize: 9,
    showSymbol: true,
    lineStyle: { width: 3, color: theme.primary },
    itemStyle: { color: theme.primary, borderColor: "#fff", borderWidth: 2 },
    emphasis: {
      focus: "series",
      itemStyle: {
        borderWidth: 3,
        shadowBlur: 12,
        shadowColor: theme.primaryRgba(0.45)
      }
    },
    markPoint,
    data: values
  };

  if (isArea) {
    lineSeries.areaStyle = {
      color: {
        type: "linear",
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: theme.primaryRgba(0.32) },
          { offset: 1, color: theme.primaryRgba(0) }
        ]
      }
    };
  }

  const barSeries = {
    name: "销售额",
    type: "bar",
    barWidth: 22,
    itemStyle: {
      borderRadius: [10, 10, 4, 4],
      color: {
        type: "linear",
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: theme.primary },
          { offset: 1, color: theme.focusBorder }
        ]
      }
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 14,
        shadowOffsetY: 6,
        shadowColor: theme.primaryRgba(0.32)
      }
    },
    markPoint,
    data: values
  };

  return {
    grid: { top: 56, left: 56, right: 28, bottom: 38 },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(17, 24, 39, 0.92)",
      borderWidth: 0,
      padding: [10, 12],
      textStyle: { color: "#fff", fontSize: 12 },
      axisPointer: {
        type: "line",
        lineStyle: { color: theme.primaryBorderSoft, width: 1, type: "dashed" }
      },
      formatter: (params) => {
        const p = params[0];
        const idx = p.dataIndex;
        const datum = resultChartData[idx];
        const prev = idx > 0 ? resultChartData[idx - 1].value : null;
        let html = `<strong style="font-size:13px;">${datum.name}</strong><br/>销售额：${datum.value}万`;
        if (prev != null) {
          const pct = ((datum.value - prev) / prev) * 100;
          const sign = pct >= 0 ? "+" : "";
          html += `<br/>环比：${sign}${pct.toFixed(1)}%`;
        }
        if (datum.anomaly) {
          html += `<br/><span style="color:#fdba74;">${datum.anomalyTip}</span>`;
        }
        return html;
      }
    },
    xAxis: {
      type: "category",
      data: months,
      boundaryGap: isBar,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#dbe5f7" } },
      axisLabel: { color: "#7e8aa3", fontSize: 12, fontWeight: 500 }
    },
    yAxis: {
      type: "value",
      name: "万元",
      nameTextStyle: { color: "#9aa6bd", fontSize: 11, padding: [0, 0, 6, -28] },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#eef2f7", type: "dashed" } },
      axisLabel: { color: "#7e8aa3", fontSize: 11 }
    },
    series: [isBar ? barSeries : lineSeries]
  };
}

function toggleThinkingDetail() {
  thinkingBox.classList.toggle("collapsed");
}

function openDrawer() {
  document.getElementById("drawerMask").classList.remove("hidden");
  document.getElementById("analysisDrawer").classList.remove("hidden");
}

function closeDrawer() {
  document.getElementById("drawerMask").classList.add("hidden");
  document.getElementById("analysisDrawer").classList.add("hidden");
}

function openFeedback() {
  closeDrawer();
  modalMask.classList.remove("hidden");
  feedbackModal.classList.remove("hidden");
}

// 仪表盘图表目录（与「我的仪表盘」侧栏保持一致）
const DASHBOARD_DIR_TREE = [
  { id: 'n1', name: '销售分析', children: [
    { id: 'n1-1', name: '区域销售', children: [
      { id: 'n1-1-1', name: '华东大区' },
      { id: 'n1-1-2', name: '华北大区' },
      { id: 'n1-1-3', name: '华南大区' },
    ]},
    { id: 'n1-2', name: '渠道转化', children: [
      { id: 'n1-2-1', name: '线上渠道' },
      { id: 'n1-2-2', name: '线下渠道' },
    ]},
    { id: 'n1-3', name: '目标达成' },
  ]},
  { id: 'n2', name: '客户分析', children: [
    { id: 'n2-1', name: '客户画像', children: [
      { id: 'n2-1-1', name: '行业分布' },
      { id: 'n2-1-2', name: '等级分布' },
    ]},
    { id: 'n2-2', name: '客户复购' },
  ]},
  { id: 'n3', name: '库存分析', children: [
    { id: 'n3-1', name: '仓库分布', children: [
      { id: 'n3-1-1', name: '华东仓' },
      { id: 'n3-1-2', name: '华北仓' },
    ]},
  ]},
  { id: 'n4', name: '财务分析' },
];

const REPORT_SAVE_DIR_TREE = [
  { id: 'c1', name: '销售经营', children: [
    { id: 'r1', name: '二季度销售复盘报告', kind: 'report' },
    { id: 'r2', name: '4月经营分析报告', kind: 'report' },
    { id: 'r3', name: '华东区销售专题分析', kind: 'report' },
  ]},
  { id: 'c2', name: '渠道与产品', children: [
    { id: 'r4', name: '渠道转化专项报告', kind: 'report' },
    { id: 'r5', name: '产品线毛利分析报告', kind: 'report' },
  ]},
  { id: 'c3', name: '客户运营', children: [
    { id: 'r6', name: '重点客户复购报告', kind: 'report' },
    { id: 'r7', name: '客户分层运营报告', kind: 'report' },
  ]},
  { id: 'c4', name: '管理层汇报', children: [
    { id: 'r8', name: '月度经营汇报', kind: 'report' },
  ]},
];

const REPORT_SECTION_TREE = [
  { id: 's1', name: '报告摘要', kind: 'section' },
  { id: 's2', name: '核心指标表现', kind: 'section', children: [
    { id: 's2-1', name: '销售额趋势', kind: 'section' },
    { id: 's2-2', name: '目标完成情况', kind: 'section' },
  ]},
  { id: 's3', name: '区域销售表现', kind: 'section', children: [
    { id: 's3-1', name: '华东区表现', kind: 'section' },
    { id: 's3-2', name: '重点区域对比', kind: 'section' },
  ]},
  { id: 's4', name: '经营建议', kind: 'section' },
];

function renderDirTree() {
  const root = document.getElementById('saveDirTree');
  if (!root) return;
  function walk(items, level, parentPath) {
    return items.map((it) => {
      const path = parentPath.concat(it.name);
      const hasChildren = !!(it.children && it.children.length);
      const isLeaf = !hasChildren;
      let html = '<div class="dir-tree-node ' + (hasChildren ? 'expanded' : 'leaf') + '" data-id="' + it.id + '">';
      html += '<div class="dir-tree-row" data-path="' + path.join(' / ') + '" data-leaf="' + (isLeaf ? 1 : 0) + '" style="padding-left:' + (10 + (level - 1) * 18) + 'px">';
      if (hasChildren) {
        html += '<span class="dir-tree-toggle">▾</span>';
      } else {
        html += '<span class="dir-tree-toggle empty"></span>';
      }
      html += '<span class="dir-tree-icon"></span>';
      html += '<span class="dir-tree-label">' + it.name + '</span>';
      html += '</div>';
      if (hasChildren) {
        html += '<div class="dir-tree-children">' + walk(it.children, level + 1, path) + '</div>';
      }
      html += '</div>';
      return html;
    }).join('');
  }
  root.innerHTML = walk(DASHBOARD_DIR_TREE, 1, []);

  root.onclick = function (e) {
    const toggle = e.target.closest('.dir-tree-toggle');
    const row = e.target.closest('.dir-tree-row');
    if (!row) return;
    const node = row.parentElement;
    if (toggle && !toggle.classList.contains('empty')) {
      e.stopPropagation();
      if (node.classList.contains('expanded')) {
        node.classList.remove('expanded');
        node.classList.add('collapsed');
        toggle.textContent = '▸';
      } else {
        node.classList.remove('collapsed');
        node.classList.add('expanded');
        toggle.textContent = '▾';
      }
      return;
    }
    root.querySelectorAll('.dir-tree-row.active').forEach((el) => el.classList.remove('active'));
    row.classList.add('active');
    const path = row.dataset.path;
    document.getElementById('saveDirText').textContent = path;
    closeDirPicker();
  };
}

function positionDirPanel() {
  const panel = document.getElementById('saveDirPanel');
  const trigger = document.getElementById('saveDirTrigger');
  if (!panel || !trigger) return;
  // 由于 .modal 上有 transform，会让其内部 position: fixed 变为相对 modal 定位。
  // 把 panel 临时挂到 body，脱离 modal 的容器块。
  if (panel.parentElement !== document.body) {
    document.body.appendChild(panel);
  }
  const rect = trigger.getBoundingClientRect();
  panel.style.left = rect.left + 'px';
  panel.style.width = rect.width + 'px';
  const panelMax = 320;
  const spaceBelow = window.innerHeight - rect.bottom;
  if (spaceBelow < panelMax + 16 && rect.top > panelMax + 16) {
    panel.style.top = (rect.top - panelMax - 6) + 'px';
  } else {
    panel.style.top = (rect.bottom + 6) + 'px';
  }
}

function toggleDirPicker(e) {
  e.stopPropagation();
  const panel = document.getElementById('saveDirPanel');
  const trigger = document.getElementById('saveDirTrigger');
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    trigger.classList.add('open');
    positionDirPanel();
    window.addEventListener('resize', positionDirPanel);
    window.addEventListener('scroll', positionDirPanel, true);
    setTimeout(() => document.addEventListener('click', onDocClickClose), 0);
  } else {
    closeDirPicker();
  }
}

function closeDirPicker() {
  const panel = document.getElementById('saveDirPanel');
  const trigger = document.getElementById('saveDirTrigger');
  if (!panel) return;
  panel.classList.add('hidden');
  if (trigger) trigger.classList.remove('open');
  document.removeEventListener('click', onDocClickClose);
  window.removeEventListener('resize', positionDirPanel);
  window.removeEventListener('scroll', positionDirPanel, true);
}

function onDocClickClose(e) {
  const picker = document.getElementById('saveDirPicker');
  const panel = document.getElementById('saveDirPanel');
  if (picker && picker.contains(e.target)) return;
  if (panel && panel.contains(e.target)) return;
  closeDirPicker();
}

function filterDirTree(kw) {
  const q = (kw || '').trim().toLowerCase();
  const tree = document.getElementById('saveDirTree');
  if (!tree) return;
  const nodes = tree.querySelectorAll('.dir-tree-node');
  if (!q) {
    nodes.forEach((n) => (n.style.display = ''));
    return;
  }
  nodes.forEach((n) => (n.style.display = 'none'));
  nodes.forEach((n) => {
    const label = n.querySelector(':scope > .dir-tree-row .dir-tree-label').textContent.toLowerCase();
    if (label.includes(q)) {
      let cur = n;
      while (cur && cur !== tree) {
        if (cur.classList && cur.classList.contains('dir-tree-node')) {
          cur.style.display = '';
          cur.classList.remove('collapsed');
          cur.classList.add('expanded');
          const t = cur.querySelector(':scope > .dir-tree-row > .dir-tree-toggle');
          if (t && !t.classList.contains('empty')) t.textContent = '▾';
        }
        cur = cur.parentElement;
      }
    }
  });
}

function getReportPickerConfig(kind) {
  const map = {
    category: {
      pickerId: 'reportCategoryPicker',
      triggerId: 'reportCategoryTrigger',
      panelId: 'reportCategoryPanel',
      treeId: 'reportCategoryTree',
      textId: 'reportCategoryText',
      searchId: 'reportCategorySearch',
      data: REPORT_SAVE_DIR_TREE.map((c) => ({ id: c.id, name: c.name, kind: 'category' })),
      selectable: ['category'],
      empty: '没有匹配的分类',
    },
    existing: {
      pickerId: 'reportExistingPicker',
      triggerId: 'reportExistingTrigger',
      panelId: 'reportExistingPanel',
      treeId: 'reportExistingTree',
      textId: 'reportExistingText',
      searchId: 'reportExistingSearch',
      data: REPORT_SAVE_DIR_TREE.map((c) => ({
        id: c.id,
        name: c.name,
        kind: 'category',
        children: (c.children || []).map((r) => Object.assign({}, r, { kind: 'report' })),
      })),
      selectable: ['report'],
      empty: '没有匹配的报告',
    },
    section: {
      pickerId: 'reportSectionPicker',
      triggerId: 'reportSectionTrigger',
      panelId: 'reportSectionPanel',
      treeId: 'reportSectionTree',
      textId: 'reportSectionText',
      searchId: 'reportSectionSearch',
      data: REPORT_SECTION_TREE,
      selectable: ['section'],
      empty: '没有匹配的报告目录',
    },
  };
  return map[kind];
}

function renderReportPicker(kind) {
  const cfg = getReportPickerConfig(kind);
  if (!cfg) return;
  const tree = document.getElementById(cfg.treeId);
  if (!tree) return;

  function walk(items, level, parentPath) {
    return items.map((it) => {
      const itemKind = it.kind || 'category';
      const path = parentPath.concat(it.name);
      const hasChildren = !!(it.children && it.children.length);
      const selectable = cfg.selectable.includes(itemKind);
      const stateCls = hasChildren ? 'expanded' : 'leaf';
      let html = '<div class="dir-tree-node ' + stateCls + '" data-id="' + escapeHTML(it.id) + '" data-kind="' + escapeHTML(itemKind) + '">';
      html += '<div class="dir-tree-row" data-selectable="' + (selectable ? '1' : '0') + '" data-path="' + escapeHTML(path.join(' / ')) + '" style="padding-left:' + (10 + (level - 1) * 18) + 'px">';
      html += hasChildren ? '<span class="dir-tree-toggle">▾</span>' : '<span class="dir-tree-toggle empty"></span>';
      html += '<span class="dir-tree-icon"></span>';
      html += '<span class="dir-tree-label">' + escapeHTML(it.name) + '</span>';
      html += '</div>';
      if (hasChildren) {
        html += '<div class="dir-tree-children">' + walk(it.children, level + 1, path) + '</div>';
      }
      html += '</div>';
      return html;
    }).join('');
  }

  tree.innerHTML = walk(cfg.data, 1, []);

  tree.onclick = function (e) {
    const toggle = e.target.closest('.dir-tree-toggle');
    const row = e.target.closest('.dir-tree-row');
    if (!row) return;
    const node = row.parentElement;
    const hasToggle = toggle && !toggle.classList.contains('empty');
    const selectable = row.dataset.selectable === '1';
    if (hasToggle && (toggle === e.target || !selectable)) {
      e.stopPropagation();
      toggleReportTreeNode(node, toggle);
      return;
    }
    if (!selectable) {
      const t = node.querySelector(':scope > .dir-tree-row > .dir-tree-toggle');
      if (t && !t.classList.contains('empty')) toggleReportTreeNode(node, t);
      return;
    }
    tree.querySelectorAll('.dir-tree-row.active').forEach((el) => el.classList.remove('active'));
    row.classList.add('active');
    document.getElementById(cfg.textId).textContent = row.dataset.path;
    closeReportPickers();
  };
}

function toggleReportTreeNode(node, toggle) {
  if (!node || !toggle) return;
  if (node.classList.contains('expanded')) {
    node.classList.remove('expanded');
    node.classList.add('collapsed');
    toggle.textContent = '▸';
  } else {
    node.classList.remove('collapsed');
    node.classList.add('expanded');
    toggle.textContent = '▾';
  }
}

function filterReportPicker(kind, kw) {
  const cfg = getReportPickerConfig(kind);
  if (!cfg) return;
  const tree = document.getElementById(cfg.treeId);
  if (!tree) return;
  const q = (kw || '').trim().toLowerCase();
  const nodes = tree.querySelectorAll('.dir-tree-node');
  if (!q) {
    nodes.forEach((n) => (n.style.display = ''));
    const empty = tree.querySelector('.dir-tree-empty');
    if (empty) empty.remove();
    return;
  }
  nodes.forEach((n) => (n.style.display = 'none'));
  nodes.forEach((n) => {
    const label = n.querySelector(':scope > .dir-tree-row .dir-tree-label').textContent.toLowerCase();
    if (label.includes(q)) {
      let cur = n;
      while (cur && cur !== tree) {
        if (cur.classList && cur.classList.contains('dir-tree-node')) {
          cur.style.display = '';
          cur.classList.remove('collapsed');
          cur.classList.add('expanded');
          const t = cur.querySelector(':scope > .dir-tree-row > .dir-tree-toggle');
          if (t && !t.classList.contains('empty')) t.textContent = '▾';
        }
        cur = cur.parentElement;
      }
    }
  });
  const hasVisible = Array.from(nodes).some((n) => n.style.display !== 'none');
  let empty = tree.querySelector('.dir-tree-empty');
  if (!hasVisible) {
    if (!empty) {
      empty = document.createElement('div');
      empty.className = 'dir-tree-empty';
      tree.appendChild(empty);
    }
    empty.textContent = cfg.empty;
  } else if (empty) {
    empty.remove();
  }
}

function positionReportPicker(kind) {
  const cfg = getReportPickerConfig(kind);
  if (!cfg) return;
  const panel = document.getElementById(cfg.panelId);
  const trigger = document.getElementById(cfg.triggerId);
  if (!panel || !trigger) return;
  if (panel.parentElement !== document.body) {
    document.body.appendChild(panel);
  }
  const rect = trigger.getBoundingClientRect();
  panel.style.left = rect.left + 'px';
  panel.style.width = rect.width + 'px';
  const panelMax = 320;
  const spaceBelow = window.innerHeight - rect.bottom;
  if (spaceBelow < panelMax + 16 && rect.top > panelMax + 16) {
    panel.style.top = (rect.top - panelMax - 6) + 'px';
  } else {
    panel.style.top = (rect.bottom + 6) + 'px';
  }
}

function toggleReportPicker(e, kind) {
  e.stopPropagation();
  const cfg = getReportPickerConfig(kind);
  if (!cfg) return;
  const panel = document.getElementById(cfg.panelId);
  const trigger = document.getElementById(cfg.triggerId);
  if (!panel || !trigger) return;
  const willOpen = panel.classList.contains('hidden');
  closeDirPicker();
  closeReportPickers();
  if (!willOpen) return;
  activeReportPicker = kind;
  panel.classList.remove('hidden');
  trigger.classList.add('open');
  positionReportPicker(kind);
  window.addEventListener('resize', onReportPickerReposition);
  window.addEventListener('scroll', onReportPickerReposition, true);
  setTimeout(() => document.addEventListener('click', onDocClickCloseReportPicker), 0);
}

function onReportPickerReposition() {
  if (activeReportPicker) positionReportPicker(activeReportPicker);
}

function closeReportPickers() {
  ['category', 'existing', 'section'].forEach((kind) => {
    const cfg = getReportPickerConfig(kind);
    if (!cfg) return;
    const panel = document.getElementById(cfg.panelId);
    const trigger = document.getElementById(cfg.triggerId);
    if (panel) panel.classList.add('hidden');
    if (trigger) trigger.classList.remove('open');
  });
  activeReportPicker = '';
  document.removeEventListener('click', onDocClickCloseReportPicker);
  window.removeEventListener('resize', onReportPickerReposition);
  window.removeEventListener('scroll', onReportPickerReposition, true);
}

function onDocClickCloseReportPicker(e) {
  const cfg = getReportPickerConfig(activeReportPicker);
  if (!cfg) return;
  const picker = document.getElementById(cfg.pickerId);
  const panel = document.getElementById(cfg.panelId);
  if (picker && picker.contains(e.target)) return;
  if (panel && panel.contains(e.target)) return;
  closeReportPickers();
}

function renderReportSavePickers() {
  ['category', 'existing', 'section'].forEach((kind) => {
    const cfg = getReportPickerConfig(kind);
    const search = cfg ? document.getElementById(cfg.searchId) : null;
    if (search) search.value = '';
    renderReportPicker(kind);
  });
  document.getElementById('reportCategoryText').textContent = '销售经营';
  document.getElementById('reportExistingText').textContent = '销售经营 / 二季度销售复盘报告';
  document.getElementById('reportSectionText').textContent = '区域销售表现';
}

function switchReportSaveMode(mode) {
  currentReportSaveMode = mode === 'existing' ? 'existing' : 'new';
  document.querySelectorAll('#reportSaveSwitch [data-report-mode]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.reportMode === currentReportSaveMode);
  });
  document.getElementById('reportSaveNewForm').classList.toggle('hidden', currentReportSaveMode !== 'new');
  document.getElementById('reportSaveExistingForm').classList.toggle('hidden', currentReportSaveMode !== 'existing');
  closeReportPickers();
}

function getCurrentResultTitle() {
  const visibleTitle = resultTitle && !resultCard.classList.contains('hidden') ? resultTitle.textContent.trim() : '';
  return visibleTitle || currentAnswerTitle || currentQuestionText || '智能问数分析报告';
}

function setupContentPicker() {
  const picker = document.getElementById('saveContentPicker');
  if (!picker) return;
  picker.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    const card = cb.closest('.content-card');
    card.classList.toggle('checked', cb.checked);
    cb.onchange = () => card.classList.toggle('checked', cb.checked);
  });
}

function openSave(type) {
  closeDrawer();
  closeModal();
  currentSaveType = type || "";
  modalMask.classList.remove("hidden");
  saveModal.classList.remove("hidden");

  const title = document.getElementById("saveTitle");
  const sub = document.getElementById("saveSub");
  const dashMode = document.getElementById("saveModeDashboard");
  const otherMode = document.getElementById("saveModeOther");
  const reportMode = document.getElementById("saveModeReport");

  if (type === "dashboard") {
    title.textContent = "添加到我的仪表盘";
    sub.textContent = "AI 已为你推荐保存目录";
    dashMode.classList.remove("hidden");
    otherMode.classList.add("hidden");
    if (reportMode) reportMode.classList.add("hidden");
    document.getElementById("saveInputName").value = "华东区近6个月销售额趋势";
    document.getElementById("saveDirText").textContent = "销售分析 / 区域销售";
    document.querySelectorAll('#saveContentPicker input[type="checkbox"]').forEach((cb) => {
      cb.checked = (cb.value === "chart");
      cb.closest('.content-card').classList.toggle('checked', cb.checked);
    });
    renderDirTree();
    setupContentPicker();
    return;
  }

  // 其他类型保留原有结构
  dashMode.classList.add("hidden");
  otherMode.classList.toggle("hidden", type === "report");
  if (reportMode) reportMode.classList.toggle("hidden", type !== "report");
  const tip = document.getElementById("saveTip");
  const field1 = document.getElementById("saveField1");
  const field2 = document.getElementById("saveField2");
  const input1 = document.getElementById("saveInput1");
  const input2 = document.getElementById("saveInput2");
  const desc = document.getElementById("saveDesc");

  if (type === "board") {
    title.textContent = "添加到我的看板";
    sub.textContent = "AI 已推荐看板和布局位置";
    tip.textContent = "AI 建议将该图表添加到「销售经营看板」的「区域销售趋势」区域，并放置在第一行右侧位置。";
    field1.textContent = "选择看板";
    field2.textContent = "添加区域";
    input1.value = "销售经营看板";
    input2.value = "区域销售趋势 / 第一行右侧";
    desc.value = "作为区域销售趋势组件展示，图表尺寸建议为中等。";
    return;
  }

  if (type === "report") {
    title.textContent = "添加到我的报告";
    sub.textContent = "请选择添加方式和报告位置";
    document.getElementById("reportNewName").value = getCurrentResultTitle();
    renderReportSavePickers();
    switchReportSaveMode("new");
  }
}

function closeModal() {
  modalMask.classList.add("hidden");
  saveModal.classList.add("hidden");
  feedbackModal.classList.add("hidden");
  deleteModal.classList.add("hidden");
  uploadModal.classList.add("hidden");
  if (typeof closeDirPicker === "function") closeDirPicker();
  if (typeof closeReportPickers === "function") closeReportPickers();
}

function saveSuccess() {
  if (currentSaveType === "report") {
    if (currentReportSaveMode === "new") {
      const name = (document.getElementById("reportNewName").value || "").trim();
      const category = (document.getElementById("reportCategoryText").textContent || "").trim();
      if (!name) {
        showToast("请填写报告名称");
        return;
      }
      if (!category) {
        showToast("请选择所属分类");
        return;
      }
    } else {
      const report = (document.getElementById("reportExistingText").textContent || "").trim();
      const section = (document.getElementById("reportSectionText").textContent || "").trim();
      if (!report) {
        showToast("请选择报告");
        return;
      }
      if (!section) {
        showToast("请选择报告目录");
        return;
      }
    }
  }
  closeModal();
  showToast("已添加成功，内容保留来源标识");
}

function exportAction(type) {
  hideExport();
  if (type === "word") {
    exportWordReport(lastWordExportScope);
    return;
  }
  const exportLabelMap = {
    image: "导出图片",
    pdf: "导出 PDF",
    excel: "导出 Excel"
  };
  showToast(`${exportLabelMap[type] || "导出"}已开始`);
}

function hideInlineAnalysisExportMenu() {
  if (!inlineAnalysisExportMenu) return;
  inlineAnalysisExportMenu.classList.add("hidden");
}

function toggleInlineAnalysisExport(event) {
  if (!inlineAnalysisExportMenu || !inlineAnalysisExportTrigger) return;
  event.stopPropagation();
  const isOpen = !inlineAnalysisExportMenu.classList.contains("hidden");
  if (isOpen) {
    hideInlineAnalysisExportMenu();
    return;
  }

  const triggerRect = event.currentTarget?.getBoundingClientRect?.()
    || inlineAnalysisExportTrigger.getBoundingClientRect();
  const panelRect = inlineAnalysisPanel?.getBoundingClientRect?.();
  if (triggerRect && panelRect) {
    inlineAnalysisExportMenu.style.right = "auto";
    inlineAnalysisExportMenu.style.bottom = "auto";
    inlineAnalysisExportMenu.classList.remove("hidden");
    inlineAnalysisExportMenu.style.visibility = "hidden";
    const menuRect = inlineAnalysisExportMenu.getBoundingClientRect();
    const menuWidth = menuRect.width || inlineAnalysisExportMenu.scrollWidth || 0;
    const menuHeight = menuRect.height || inlineAnalysisExportMenu.scrollHeight || 0;
    inlineAnalysisExportMenu.style.visibility = "";
    inlineAnalysisExportMenu.classList.add("hidden");

    const left = Math.min(
      Math.max(8, triggerRect.left - panelRect.left),
      Math.max(8, panelRect.width - menuWidth - 8)
    );
    let top = triggerRect.top - panelRect.top - menuHeight - 8;
    if (top < 8) {
      top = triggerRect.bottom - panelRect.top + 8;
    }

    inlineAnalysisExportMenu.style.left = `${left}px`;
    inlineAnalysisExportMenu.style.top = `${top}px`;
  }

  inlineAnalysisExportMenu.classList.remove("hidden");
}

function exportAnalysisAction(type) {
  const exportLabelMap = {
    image: "导出图片",
    pdf: "导出 PDF",
    word: "导出 Word"
  };
  hideInlineAnalysisExportMenu();
  showToast(`数据解读${exportLabelMap[type] || "导出"}已开始`);
}

function toggleExport(event) {
  if (!exportMenu) return;
  event.stopPropagation();
  hideInlineAnalysisExportMenu();
  hideChartContextMenu();
  hideAddMenu();
  hideAskMenu();

  const triggerBtn = event.currentTarget;
  const archivedRoot = triggerBtn?.closest?.(".archived-message");
  const currentRoot = triggerBtn?.closest?.(".current-chat-message");
  lastWordExportScope = archivedRoot || currentRoot || document.querySelector(".current-chat-message");

  const isOpen = !exportMenu.classList.contains("hidden");
  if (isOpen) {
    hideExport();
    return;
  }

  const triggerRect = event.currentTarget?.getBoundingClientRect?.() || exportTrigger?.getBoundingClientRect?.();
  if (triggerRect) {
    exportMenu.classList.remove("hidden");
    exportMenu.style.visibility = "hidden";
    const menuWidth = exportMenu.getBoundingClientRect().width || exportMenu.scrollWidth || 0;
    exportMenu.style.visibility = "";
    exportMenu.classList.add("hidden");
    const left = Math.min(
      Math.max(8, triggerRect.right - menuWidth),
      window.innerWidth - menuWidth - 8
    );
    exportMenu.style.left = `${left}px`;
    exportMenu.style.top = `${triggerRect.bottom + 8}px`;
  }
  exportMenu.classList.remove("hidden");
}

function hideExport() {
  if (!exportMenu) return;
  exportMenu.classList.add("hidden");
}

function hideAddMenu() {
  if (!addMenu) return;
  addMenu.classList.add("hidden");
}

function hideAskMenu() {
  if (!askMenu) return;
  askMenu.classList.add("hidden");
}

function positionDropdownMenu(menu, trigger) {
  if (!menu || !trigger) return;
  const triggerRect = trigger.getBoundingClientRect();
  menu.classList.remove("hidden");
  menu.style.visibility = "hidden";
  menu.style.maxHeight = "";
  const menuRect = menu.getBoundingClientRect();
  const menuWidth = menuRect.width || menu.scrollWidth || 0;
  const menuHeight = menuRect.height || menu.scrollHeight || 0;
  menu.style.visibility = "";
  menu.classList.add("hidden");

  const margin = 8;
  const gap = 8;
  const left = Math.min(
    Math.max(margin, triggerRect.right - menuWidth),
    window.innerWidth - menuWidth - margin
  );
  menu.style.left = `${left}px`;

  const spaceBelow = window.innerHeight - triggerRect.bottom - margin;
  const spaceAbove = triggerRect.top - margin;
  let top;
  let cappedHeight = "";
  if (menuHeight + gap <= spaceBelow) {
    top = triggerRect.bottom + gap;
  } else if (menuHeight + gap <= spaceAbove) {
    top = triggerRect.top - gap - menuHeight;
  } else if (spaceAbove >= spaceBelow) {
    cappedHeight = `${Math.max(spaceAbove - gap, 120)}px`;
    top = margin;
  } else {
    cappedHeight = `${Math.max(spaceBelow - gap, 120)}px`;
    top = triggerRect.bottom + gap;
  }
  menu.style.top = `${top}px`;
  if (cappedHeight) {
    menu.style.maxHeight = cappedHeight;
    menu.style.overflowY = "auto";
  } else {
    menu.style.maxHeight = "";
    menu.style.overflowY = "";
  }
}

function toggleAddMenu(event) {
  if (!addMenu) return;
  event.stopPropagation();
  hideExport();
  hideAskMenu();
  hideInlineAnalysisExportMenu();
  hideChartContextMenu();
  hideSideMenus();
  const isOpen = !addMenu.classList.contains("hidden");
  if (isOpen) {
    hideAddMenu();
    return;
  }
  positionDropdownMenu(addMenu, event.currentTarget);
  addMenu.classList.remove("hidden");
}

function toggleAskMenu(event) {
  if (!askMenu) return;
  event.stopPropagation();
  hideExport();
  hideAddMenu();
  hideInlineAnalysisExportMenu();
  hideChartContextMenu();
  hideSideMenus();
  const isOpen = !askMenu.classList.contains("hidden");
  if (isOpen) {
    hideAskMenu();
    return;
  }
  positionDropdownMenu(askMenu, event.currentTarget);
  askMenu.classList.remove("hidden");
}

function addToTarget(type) {
  hideAddMenu();
  openSave(type);
}

const followupActionPresets = {
  free: { prefill: "", action: "qa" },
  interpret: { prefill: "对这6个月的销售趋势进行整体解读分析", action: "analysis" },
  attribution: { prefill: "对4月异常增长进行归因分析", action: "attribution" },
  trend: { prefill: "预测未来3个月的销售趋势", action: "trend" },
  comparison: { prefill: "请根据我上传的数据，进行对比分析", action: "comparison" },
  template: { prefill: "请生成 5 月份销售分析月报", action: "template" }
};

const FOLLOWUP_PREFIXES = {
  analysis: "数据解读：",
  attribution: "归因分析：",
  trend: "趋势分析：",
  comparison: "对比分析：",
  template: "模板分析："
};
const FOLLOWUP_PLACEHOLDERS = {
  analysis: "请输入您要数据解读的要求，例如解读范围、解读关键点等",
  attribution: "请输入您要归因分析的要求，例如归因维度、关注的异常点等",
  trend: "请输入您要趋势分析的要求，例如预测周期、关注指标等",
  comparison: "请输入您要对比分析的要求，例如对比维度、关注的差异点等",
  template: "请输入您要模板分析的要求，例如套用模板的范围、目标月份等"
};
let defaultQuestionPlaceholder = null;

function askFollowup(type) {
  hideAskMenu();
  const preset = followupActionPresets[type];
  if (!preset) return;
  const baseTitle = resultTitle?.textContent?.trim() || currentAnswerTitle || "当前问题";
  setFollowupContext({ title: baseTitle, action: preset.action, prefill: preset.prefill });
}

function setFollowupContext(ctx) {
  const action = ctx.action || "qa";
  pendingFollowupContext = { title: ctx.title, action };
  if (followupChipTitle) followupChipTitle.textContent = ctx.title;
  followupContextChip?.classList.remove("hidden");
  const prefixText = FOLLOWUP_PREFIXES[action];
  if (followupPrefix) {
    if (prefixText) {
      followupPrefix.textContent = prefixText;
      followupPrefix.classList.remove("hidden");
    } else {
      followupPrefix.textContent = "";
      followupPrefix.classList.add("hidden");
    }
  }
  if (questionInput) {
    if (defaultQuestionPlaceholder === null) {
      defaultQuestionPlaceholder = questionInput.getAttribute("placeholder") || "";
    }
    const customPlaceholder = FOLLOWUP_PLACEHOLDERS[action];
    questionInput.setAttribute(
      "placeholder",
      customPlaceholder || defaultQuestionPlaceholder
    );
    questionInput.classList.toggle("has-followup-prefix", Boolean(prefixText));
    questionInput.value = ctx.prefill || "";
    questionInput.focus();
    if (ctx.prefill) {
      const pos = ctx.prefill.length;
      questionInput.setSelectionRange(pos, pos);
    }
    handleQuestionInput();
  }
  suggestPop?.classList.add("hidden");
  questionInput?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearFollowupContext() {
  pendingFollowupContext = null;
  followupContextChip?.classList.add("hidden");
  if (followupChipTitle) followupChipTitle.textContent = "";
  if (followupPrefix) {
    followupPrefix.textContent = "";
    followupPrefix.classList.add("hidden");
  }
  if (questionInput) {
    questionInput.classList.remove("has-followup-prefix");
    if (defaultQuestionPlaceholder !== null) {
      questionInput.setAttribute("placeholder", defaultQuestionPlaceholder);
    }
  }
}

function startTrendAnalysis() {
  if (isAnswering) {
    showToast("当前正在生成回答，稍后再试");
    return;
  }
  archiveCurrentMessageIfNeeded();
  const baseTitle = resultTitle?.textContent?.trim() || currentAnswerTitle || "当前问题";
  currentQuestionText = `基于"${baseTitle}"预测未来3个月的销售趋势`;
  currentAnswerTitle = `${baseTitle}-趋势分析`;
  showToast("正在生成趋势分析");
  startAnswerSimulation({
    mode: "trend",
    questionText: currentQuestionText,
    answerTitle: currentAnswerTitle
  });
}

if (questionInput) {
  questionInput.addEventListener("input", handleQuestionInput);
  questionInput.addEventListener("focus", () => {
    if (questionInput.value.trim()) handleQuestionInput();
  });
  questionInput.addEventListener("keydown", (event) => {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (isAnswering) return;
      suggestPop?.classList.add("hidden");
      runQuestion();
    }
  });
}

(function bindSuggestPopReposition() {
  const inputCard = document.querySelector(".input-card");
  if (!inputCard || !suggestPop) return;
  const reposition = () => {
    if (suggestPop.classList.contains("hidden")) return;
    positionSuggestPop();
  };
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(reposition);
    ro.observe(inputCard);
  }
  window.addEventListener("resize", reposition);
})();

document.addEventListener("click", (event) => {
  if (!event.target.closest("#suggestPop") && !event.target.closest("#questionInput")) {
    suggestPop?.classList.add("hidden");
  }
  if (!event.target.closest("#exportMenu") && !event.target.closest("#exportTrigger")) {
    hideExport();
  }
  if (!event.target.closest("#addMenu")) {
    hideAddMenu();
  }
  if (!event.target.closest("#askMenu")) {
    hideAskMenu();
  }
  if (!event.target.closest("#inlineAnalysisExportMenu") && !event.target.closest("#inlineAnalysisExportTrigger")) {
    hideInlineAnalysisExportMenu();
  }
  if (!event.target.closest(".side-context-menu")) {
    hideSideMenus();
  }
  if (!event.target.closest("#chartContextMenu")) {
    hideChartContextMenu();
  }
});

if (modalMask) {
  modalMask.addEventListener("click", closeModal);
}


if (imageUploadInput) {
  imageUploadInput.addEventListener("change", (event) => {
    handleUploadSelected("image", event.target.files?.[0]);
    event.target.value = "";
  });
}

if (fileUploadInput) {
  fileUploadInput.addEventListener("change", (event) => {
    handleUploadSelected("file", event.target.files?.[0]);
    event.target.value = "";
  });
}

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const text = chip.textContent.trim();
    if (!text) return;
    questionInput.value = questionInput.value.trim() ? `${questionInput.value.trim()} ${text}` : text;
    questionInput.focus();
    handleQuestionInput();
  });
});

// ==================== Word 导出 ====================
function exportWordReport(scope) {
  try {
    const root = (scope && scope.nodeType === 1)
      ? scope
      : document.querySelector(".current-chat-message");
    if (!root) {
      showToast("未找到可导出的对话内容");
      return;
    }
    showToast("Word 报告生成中…");
    setTimeout(() => {
      try {
        const mode = wordDetectMode(root);
        const title = wordExtractTitle(root);
        const html = wordBuildReportHTML(root, mode, title);
        const filename = wordSafeFilename(`${title}_${wordModeLabel(mode)}_${wordTimestampForFile()}.doc`);
        wordTriggerDownload(html, filename);
        showToast("Word 报告已导出");
      } catch (err) {
        console.error("[Word 导出] 失败：", err);
        showToast("Word 导出失败，请稍后重试");
      }
    }, 80);
  } catch (err) {
    console.error("[Word 导出] 失败：", err);
    showToast("Word 导出失败，请稍后重试");
  }
}

function wordDetectMode(root) {
  const candidates = [
    ["template", ".template-report-section"],
    ["comparison", ".comparison-report-section"],
    ["trend", ".trend-report-section"],
    ["attribution", ".attribution-report-section"],
    ["analysis", ".analysis-report-section"]
  ];
  for (const [mode, sel] of candidates) {
    const el = root.querySelector(sel);
    if (el && !el.classList.contains("hidden")) return mode;
  }
  return "qa";
}

function wordModeLabel(mode) {
  const labels = {
    qa: "数据问答",
    analysis: "数据分析报告",
    attribution: "归因分析报告",
    trend: "趋势分析报告",
    comparison: "对比分析报告",
    template: "月度分析报告"
  };
  return labels[mode] || "数据问答";
}

function wordExtractTitle(root) {
  const titleEl = root.querySelector(".result-title h2") || root.querySelector("h2");
  const t = titleEl?.textContent?.trim();
  if (t) return t;
  const bubble = root.querySelector(".bubble.user");
  return bubble?.textContent?.trim() || currentAnswerTitle || "智能问数报告";
}

function wordExtractMetaText(root) {
  const meta = root.querySelector(".result-title p");
  return meta?.textContent?.trim() || "";
}

function wordEsc(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wordSafeFilename(name) {
  return String(name).replace(/[\\/:*?"<>|]/g, "_").slice(0, 180);
}

function wordTimestampForFile() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function wordExportTimeText() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function wordTriggerDownload(html, filename) {
  const preamble = "<!DOCTYPE html>\uFEFF";
  const blob = new Blob([preamble + html], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function wordCanvasToImage(canvasDom) {
  if (!canvasDom || typeof echarts === "undefined") return "";
  try {
    const inst = echarts.getInstanceByDom(canvasDom);
    if (!inst) return "";
    return inst.getDataURL({ type: "png", pixelRatio: 1.5, backgroundColor: "#ffffff" });
  } catch (e) {
    console.warn("[Word 导出] 图表转图失败：", e);
    return "";
  }
}

function wordChartImageHTML(canvasDom, widthCm = 14) {
  const dataUrl = wordCanvasToImage(canvasDom);
  if (!dataUrl) return "";
  const widthPx = Math.round(widthCm * 37.8);
  return `<p style="text-align:center;margin:8pt 0;"><img src="${dataUrl}" width="${widthPx}" style="width:${widthCm}cm;border:0.75pt solid #e5e7eb;"/></p>`;
}

function wordCleanTable(tableEl) {
  if (!tableEl) return "";
  const clone = tableEl.cloneNode(true);
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  clone.querySelectorAll("svg").forEach((s) => s.remove());
  clone.querySelectorAll("*").forEach((el) => {
    el.removeAttribute("class");
    if (el.hasAttribute("style")) {
      const keep = el.getAttribute("style").split(";")
        .filter((s) => /text-align|color|background|font-weight/i.test(s))
        .join(";");
      if (keep) el.setAttribute("style", keep);
      else el.removeAttribute("style");
    }
  });
  // 给所有 td/th 加边框样式
  clone.querySelectorAll("th").forEach((th) => {
    th.setAttribute("style", "background:#f1f5f9;color:#1f2937;padding:6pt 8pt;border:0.75pt solid #cbd5e1;text-align:left;font-weight:600;");
  });
  clone.querySelectorAll("td").forEach((td) => {
    const isNum = td.textContent.trim().match(/^[+-]?[0-9,.\u00a0\s]+(%|pp|万|元|个|单)?\s*[▲▼]?$/);
    const align = isNum ? "right" : "left";
    let extra = "";
    const text = td.textContent || "";
    if (text.includes("▲") || /\+\d/.test(text)) extra = "color:#15803d;font-weight:600;";
    else if (text.includes("▼") || /^-\d/.test(text.trim())) extra = "color:#b91c1c;font-weight:600;";
    td.setAttribute("style", `padding:6pt 8pt;border:0.75pt solid #e2e8f0;text-align:${align};${extra}`);
  });
  clone.setAttribute("style", "border-collapse:collapse;width:100%;font-size:10.5pt;margin:8pt 0;");
  return clone.outerHTML;
}

function wordSectionTitle(text) {
  return `<h2 style="font-size:13pt;color:#0f172a;margin:18pt 0 8pt;font-weight:700;">${wordEsc(text)}</h2>`;
}

function wordSubTitle(text) {
  return `<h3 style="font-size:11.5pt;color:#1f2937;margin:12pt 0 6pt;font-weight:600;">${wordEsc(text)}</h3>`;
}

function createSectionCounter() {
  const cnNumbers = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四"];
  let index = 0;
  return {
    next: (title) => {
      index += 1;
      const cn = cnNumbers[index] || String(index);
      return wordSectionTitle(`${cn}、${title}`);
    },
    fixed: (title) => wordSubTitle(title)
  };
}

function wordParagraph(text) {
  if (!text) return "";
  return `<p style="font-size:10.5pt;line-height:1.7;color:#374151;margin:6pt 0;">${wordEsc(text)}</p>`;
}

function wordTagsRow(tags) {
  if (!tags || !tags.length) return "";
  const theme = getSmartQueryChartTheme();
  const items = tags.map((t) =>
    `<span style="display:inline-block;padding:2pt 8pt;margin:0 4pt 4pt 0;background:${theme.primarySoft};color:${theme.primary};font-size:9.5pt;border-radius:10pt;">${wordEsc(t)}</span>`
  ).join("");
  return `<p style="margin:6pt 0;">${items}</p>`;
}

function wordList(items, opts = {}) {
  const arr = items.filter(Boolean);
  if (!arr.length) return "";
  const tag = opts.ordered ? "ol" : "ul";
  const lis = arr.map((it) => `<li style="font-size:10.5pt;line-height:1.7;color:#374151;margin-bottom:3pt;">${wordEsc(it)}</li>`).join("");
  return `<${tag} style="margin:6pt 0 6pt 18pt;padding:0;">${lis}</${tag}>`;
}

// ============== 各通用区块提取 ==============
function wordRenderInsight(root, counter) {
  const insightBox = root.querySelector(".insight-box");
  if (!insightBox || insightBox.classList.contains("hidden")) return "";
  const conclusion = root.querySelector(".insight-box > p, #aiConclusion")?.textContent?.trim();
  if (!conclusion) return "";
  let html = "";
  html += counter ? counter.next("核心结论") : wordSectionTitle("一、核心结论");
  html += wordParagraph(conclusion);
  const tagsBox = root.querySelector(".insight-box .tag-row");
  if (tagsBox && !tagsBox.classList.contains("hidden")) {
    const tags = Array.from(tagsBox.querySelectorAll("span")).map((s) => s.textContent.trim()).filter(Boolean);
    html += wordTagsRow(tags);
  }
  return html;
}

function wordRenderTable(root, counter) {
  const tableWrap = root.querySelector(".inline-table");
  if (!tableWrap || tableWrap.classList.contains("hidden")) return "";
  const table = tableWrap.querySelector("table");
  if (!table) return "";
  let html = "";
  html += counter ? counter.next("数据明细") : wordSectionTitle("二、数据明细");
  html += wordCleanTable(table);
  return html;
}

function wordRenderMainChart(root, counter) {
  const chartCard = root.querySelector(".chart-card");
  if (!chartCard || chartCard.classList.contains("hidden")) return "";
  const canvas = chartCard.querySelector(".chart-canvas");
  const img = wordChartImageHTML(canvas);
  if (!img) return "";
  let html = "";
  html += counter ? counter.next("可视化图表") : wordSectionTitle("三、可视化图表");
  const chartTitle = chartCard.querySelector(".chart-top h3")?.textContent?.trim();
  if (chartTitle) html += wordParagraph(chartTitle);
  html += img;
  return html;
}

// ============== 数据分析报告 ==============
function wordRenderAnalysisReport(root, counter) {
  const sec = root.querySelector(".analysis-report-section");
  if (!sec || sec.classList.contains("hidden")) return "";
  let html = "";

  const block0 = sec.querySelector('[data-report-block="0"]');
  if (block0) {
    html += counter.next("分析报告核心结论");
    html += wordParagraph(block0.querySelector("p")?.textContent?.trim());
    const canvas = block0.querySelector(".report-chart-canvas");
    html += wordChartImageHTML(canvas);
  }
  const block1 = sec.querySelector('[data-report-block="1"]');
  if (block1) {
    html += counter.next("关键指标解读");
    const items = Array.from(block1.querySelectorAll("ul li")).map((li) => li.textContent?.trim()).filter(Boolean);
    html += wordList(items);
  }
  const block2 = sec.querySelector('[data-report-block="2"]');
  if (block2) {
    html += counter.next("外部因素关联");
    const items = Array.from(block2.querySelectorAll("ul li")).map((li) => li.textContent?.trim()).filter(Boolean);
    html += wordList(items);
  }
  const block3 = sec.querySelector('[data-report-block="3"]');
  if (block3) {
    html += counter.next("深度分析方向建议");
    const items = Array.from(block3.querySelectorAll("ul li")).map((li) => li.textContent?.trim()).filter(Boolean);
    html += wordList(items);
  }
  return html;
}

// ============== 归因分析报告 ==============
function wordRenderAttributionReport(root, counter) {
  const sec = root.querySelector(".attribution-report-section");
  if (!sec || sec.classList.contains("hidden")) return "";
  let html = "";

  const block0 = sec.querySelector('[data-attribution-block="0"]');
  if (block0) {
    html += counter.next("异常诊断结论");
    html += wordParagraph(block0.querySelector("p")?.textContent?.trim());
    const canvas = block0.querySelector(".report-chart-canvas");
    html += wordChartImageHTML(canvas);
  }
  const block1 = sec.querySelector('[data-attribution-block="1"]');
  if (block1) {
    html += counter.next("维度拆解贡献");
    const intro = block1.querySelector(".attribution-block-intro")?.textContent?.trim();
    if (intro) html += wordParagraph(intro);
    block1.querySelectorAll(".attribution-dim-card").forEach((card) => {
      const name = card.querySelector(".attribution-dim-head strong")?.textContent?.trim();
      const total = card.querySelector(".attribution-dim-head span")?.textContent?.trim();
      html += `<p style="font-size:10.5pt;color:#0f172a;margin:8pt 0 2pt;font-weight:600;">▌ ${wordEsc(name)} <span style="color:#64748b;font-weight:normal;">${wordEsc(total)}</span></p>`;
      const items = Array.from(card.querySelectorAll(".attribution-bar-list li")).map((li) => {
        const n = li.querySelector(".attribution-bar-name")?.textContent?.trim();
        const v = li.querySelector(".attribution-bar-value")?.textContent?.trim();
        return n && v ? `${n}：${v}` : (n || v || "");
      }).filter(Boolean);
      html += wordList(items);
    });
  }
  const subTitles = ["关键驱动因子", "可持续性判断", "后续行动建议"];
  ["2", "3", "4"].forEach((idx, i) => {
    const block = sec.querySelector(`[data-attribution-block="${idx}"]`);
    if (!block) return;
    html += counter.next(subTitles[i]);
    const items = Array.from(block.querySelectorAll("ul li")).map((li) => li.textContent?.trim()).filter(Boolean);
    html += wordList(items);
  });
  return html;
}

// ============== 趋势分析报告 ==============
function wordRenderTrendReport(root, counter) {
  const sec = root.querySelector(".trend-report-section");
  if (!sec || sec.classList.contains("hidden")) return "";
  let html = "";

  const block0 = sec.querySelector('[data-trend-block="0"]');
  if (block0) {
    html += counter.next("趋势分析概述");
    html += wordParagraph(block0.querySelector("#trendOverview, p")?.textContent?.trim());
    const canvas = block0.querySelector(".report-chart-canvas");
    html += wordChartImageHTML(canvas);
  }
  const block1 = sec.querySelector('[data-trend-block="1"]');
  if (block1) {
    html += counter.next("预测明细与置信区间");
    const intro = block1.querySelector(".trend-block-intro")?.textContent?.trim();
    if (intro) html += wordParagraph(intro);
    const table = block1.querySelector("table");
    if (table) html += wordCleanTable(table);
  }
  const block2 = sec.querySelector('[data-trend-block="2"]');
  if (block2) {
    html += counter.next("模型与依据");
    const meta = block2.querySelector(".trend-model-meta strong")?.textContent?.trim();
    if (meta) html += wordParagraph(meta);
    const conf = block2.querySelector(".trend-confidence-value")?.textContent?.trim();
    if (conf) html += wordParagraph(`综合置信度：${conf}`);
    const intro = block2.querySelector(".trend-model-intro")?.textContent?.trim();
    if (intro) html += wordParagraph(intro);
    const items = Array.from(block2.querySelectorAll(".trend-factor-list li")).map((li) => {
      const n = li.querySelector(".trend-factor-name")?.textContent?.trim();
      const v = li.querySelector(".trend-factor-value")?.textContent?.trim();
      return n && v ? `${n}：${v}` : (n || v || "");
    }).filter(Boolean);
    html += wordList(items);
  }
  const block3 = sec.querySelector('[data-trend-block="3"]');
  if (block3) {
    html += counter.next("关键风险与机会");
    const upItems = Array.from(block3.querySelectorAll(".trend-risk-card.up ul li")).map((li) => li.textContent?.trim()).filter(Boolean);
    const downItems = Array.from(block3.querySelectorAll(".trend-risk-card.down ul li")).map((li) => li.textContent?.trim()).filter(Boolean);
    if (upItems.length) {
      html += `<p style="font-size:10.5pt;color:#15803d;font-weight:600;margin:6pt 0 2pt;">↗ 上行机会</p>`;
      html += wordList(upItems);
    }
    if (downItems.length) {
      html += `<p style="font-size:10.5pt;color:#b91c1c;font-weight:600;margin:6pt 0 2pt;">↘ 下行风险</p>`;
      html += wordList(downItems);
    }
  }
  const block4 = sec.querySelector('[data-trend-block="4"]');
  if (block4) {
    html += counter.next("节奏与策略建议");
    const items = Array.from(block4.querySelectorAll(".trend-action-list li")).map((li) => {
      const tag = li.querySelector(".trend-action-tag")?.textContent?.trim();
      const txt = li.querySelector("span:not(.trend-action-tag)")?.textContent?.trim() || "";
      return tag ? `【${tag}】${txt}` : txt;
    }).filter(Boolean);
    html += wordList(items);
  }
  return html;
}

// ============== 对比分析报告 ==============
function wordRenderComparisonReport(root, counter) {
  const sec = root.querySelector(".comparison-report-section");
  if (!sec || sec.classList.contains("hidden")) return "";
  let html = "";

  const block0 = sec.querySelector('[data-comparison-block="0"]');
  if (block0) {
    html += counter.next("对比分析概述");
    const chip = block0.querySelector(".comparison-upload-chip");
    if (chip) {
      const name = chip.querySelector(".comparison-upload-name")?.textContent?.trim() || "";
      const meta = chip.querySelector(".comparison-upload-meta")?.textContent?.trim() || "";
      const status = chip.querySelector(".comparison-upload-status")?.textContent?.trim() || "";
      html += `<table style="border-collapse:collapse;margin:6pt 0;font-size:10pt;">
        <tr>
          <td style="background:#ccfbf1;color:#0f766e;padding:4pt 10pt;font-weight:600;border:0.75pt solid #99f6e4;">📎 ${wordEsc(name)}</td>
          <td style="padding:4pt 10pt;color:#64748b;border:0.75pt solid #99f6e4;">${wordEsc(meta)}</td>
          <td style="background:#dcfce7;color:#15803d;padding:4pt 10pt;font-weight:600;border:0.75pt solid #99f6e4;">${wordEsc(status)}</td>
        </tr>
      </table>`;
    }
    html += wordParagraph(block0.querySelector("#comparisonOverview, p:last-child")?.textContent?.trim());
  }
  const block1 = sec.querySelector('[data-comparison-block="1"]');
  if (block1) {
    html += counter.next("关键指标对比表");
    const intro = block1.querySelector(".comparison-block-intro")?.textContent?.trim();
    if (intro) html += wordParagraph(intro);
    const table = block1.querySelector("table");
    if (table) html += wordCleanTable(table);
  }
  const block2 = sec.querySelector('[data-comparison-block="2"]');
  if (block2) {
    html += counter.next("差异趋势对比图");
    const intro = block2.querySelector(".comparison-block-intro")?.textContent?.trim();
    if (intro) html += wordParagraph(intro);
    const canvas = block2.querySelector(".report-chart-canvas");
    html += wordChartImageHTML(canvas);
  }
  const block3 = sec.querySelector('[data-comparison-block="3"]');
  if (block3) {
    html += counter.next("差异原因分析");
    const intro = block3.querySelector(".comparison-block-intro")?.textContent?.trim();
    if (intro) html += wordParagraph(intro);
    block3.querySelectorAll(".comparison-driver-card").forEach((card) => {
      const name = card.querySelector(".comparison-driver-head strong")?.textContent?.trim();
      const pct = card.querySelector(".comparison-driver-percent")?.textContent?.trim();
      html += `<p style="font-size:10.5pt;color:#0f766e;margin:8pt 0 2pt;font-weight:600;">▌ ${wordEsc(name)} <span style="color:#0f766e;">${wordEsc(pct)}</span></p>`;
      const items = Array.from(card.querySelectorAll("ul li")).map((li) => li.textContent?.trim()).filter(Boolean);
      html += wordList(items);
    });
  }
  const block4 = sec.querySelector('[data-comparison-block="4"]');
  if (block4) {
    html += counter.next("行动建议");
    const items = Array.from(block4.querySelectorAll(".comparison-action-list li")).map((li) => {
      const tag = li.querySelector(".comparison-action-tag")?.textContent?.trim();
      const txt = li.querySelector("span:not(.comparison-action-tag)")?.textContent?.trim() || "";
      return tag ? `【${tag}】${txt}` : txt;
    }).filter(Boolean);
    html += wordList(items);
  }
  return html;
}

// ============== 模板月报 ==============
function wordRenderTemplateReport(root, counter) {
  const sec = root.querySelector(".template-report-section");
  if (!sec || sec.classList.contains("hidden")) return "";
  let html = "";

  const block0 = sec.querySelector('[data-template-block="0"]');
  if (block0) {
    html += counter.next("报告摘要");
    html += wordParagraph(block0.querySelector("p")?.textContent?.trim());
    const kpiCards = block0.querySelectorAll(".template-kpi-card");
    if (kpiCards.length) {
      const cells = Array.from(kpiCards).map((card) => {
        const label = card.querySelector(".template-kpi-label")?.textContent?.trim() || "";
        const valueEl = card.querySelector(".template-kpi-value");
        const valueText = valueEl?.firstChild?.textContent?.trim() || "";
        const unit = valueEl?.querySelector("span")?.textContent?.trim() || "";
        const target = card.querySelector(".template-kpi-target")?.textContent?.trim() || "";
        const up = card.querySelector(".template-kpi-up")?.textContent?.trim() || "";
        return `<td style="padding:8pt;border:0.75pt solid #e2e8f0;vertical-align:top;width:25%;">
          <div style="font-size:10pt;color:#64748b;margin-bottom:4pt;">${wordEsc(label)}</div>
          <div style="font-size:14pt;color:#0f172a;font-weight:700;margin-bottom:4pt;">${wordEsc(valueText)}<span style="font-size:10pt;color:#64748b;font-weight:normal;"> ${wordEsc(unit)}</span></div>
          <div style="font-size:9pt;color:#475569;">${wordEsc(target)}</div>
          <div style="font-size:9pt;color:#15803d;font-weight:600;">${wordEsc(up)}</div>
        </td>`;
      }).join("");
      html += `<table style="border-collapse:collapse;width:100%;margin:6pt 0;"><tr>${cells}</tr></table>`;
    }
  }
  const block1 = sec.querySelector('[data-template-block="1"]');
  if (block1) {
    html += counter.next("月度业绩概述");
    html += wordParagraph(block1.querySelector("p")?.textContent?.trim());
  }
  const block2 = sec.querySelector('[data-template-block="2"]');
  if (block2) {
    html += counter.next("核心指标完成情况");
    const intro = block2.querySelector(".template-block-intro")?.textContent?.trim();
    if (intro) html += wordParagraph(intro);
    const items = Array.from(block2.querySelectorAll(".template-progress-list li")).map((li) => {
      const n = li.querySelector(".template-progress-name")?.textContent?.trim();
      const v = li.querySelector(".template-progress-value")?.textContent?.trim();
      return n && v ? `${n}：${v}` : (n || v || "");
    }).filter(Boolean);
    html += wordList(items);
  }
  const block3 = sec.querySelector('[data-template-block="3"]');
  if (block3) {
    html += counter.next("区域与渠道贡献");
    const intro = block3.querySelector(".template-block-intro")?.textContent?.trim();
    if (intro) html += wordParagraph(intro);
    block3.querySelectorAll(".template-contribution-card").forEach((card) => {
      const head = card.querySelector(".template-contribution-head")?.textContent?.trim();
      html += `<p style="font-size:10.5pt;color:#0f172a;margin:8pt 0 2pt;font-weight:600;">▌ ${wordEsc(head)}</p>`;
      const items = Array.from(card.querySelectorAll("ul li")).map((li) => {
        const n = li.querySelector(".template-contribution-name")?.textContent?.trim();
        const v = li.querySelector(".template-contribution-value")?.textContent?.trim();
        return n && v ? `${n}：${v}` : (n || v || "");
      }).filter(Boolean);
      html += wordList(items);
    });
  }
  const block4 = sec.querySelector('[data-template-block="4"]');
  if (block4) {
    html += counter.next("风险预警与下月计划");
    const riskItems = Array.from(block4.querySelectorAll(".template-plan-card.warning ul li")).map((li) => li.textContent?.trim()).filter(Boolean);
    const planItems = Array.from(block4.querySelectorAll(".template-plan-card.next ul li")).map((li) => li.textContent?.trim()).filter(Boolean);
    if (riskItems.length) {
      html += `<p style="font-size:10.5pt;color:#b45309;font-weight:600;margin:6pt 0 2pt;">! 风险预警</p>`;
      html += wordList(riskItems);
    }
    if (planItems.length) {
      html += `<p style="font-size:10.5pt;color:${getSmartQueryChartTheme().primary};font-weight:600;margin:6pt 0 2pt;">→ 下月计划</p>`;
      html += wordList(planItems);
    }
  }
  return html;
}

// ============== HTML 包装 ==============
function wordBuildReportHTML(root, mode, title) {
  const meta = wordExtractMetaText(root);
  const exportTime = wordExportTimeText();
  const reportLabel = wordModeLabel(mode);

  let body = "";
  body += `<h1 style="text-align:center;font-size:18pt;color:#0f172a;margin:0 0 6pt;">${wordEsc(title)}</h1>`;
  body += `<p style="text-align:center;font-size:11pt;color:${getSmartQueryChartTheme().primary};margin:0 0 4pt;font-weight:600;">${wordEsc(reportLabel)}</p>`;
  if (meta) body += `<p style="text-align:center;font-size:9pt;color:#64748b;margin:0 0 4pt;">${wordEsc(meta)}</p>`;
  body += `<p style="text-align:center;font-size:9pt;color:#94a3b8;margin:0 0 14pt;">导出时间：${wordEsc(exportTime)}</p>`;
  body += `<hr style="border:none;border-top:0.75pt solid #e2e8f0;margin:0 0 12pt;"/>`;

  const counter = createSectionCounter();
  body += wordRenderInsight(root, counter);
  body += wordRenderTable(root, counter);
  body += wordRenderMainChart(root, counter);
  if (mode === "analysis") body += wordRenderAnalysisReport(root, counter);
  else if (mode === "attribution") body += wordRenderAttributionReport(root, counter);
  else if (mode === "trend") body += wordRenderTrendReport(root, counter);
  else if (mode === "comparison") body += wordRenderComparisonReport(root, counter);
  else if (mode === "template") body += wordRenderTemplateReport(root, counter);

  body += `<hr style="border:none;border-top:0.75pt solid #e2e8f0;margin:24pt 0 6pt;"/>`;
  body += `<p style="text-align:center;font-size:9pt;color:#94a3b8;margin:0;">报告由「智能问数」自动生成 · ${wordEsc(exportTime)}</p>`;

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8"/>
<title>${wordEsc(title)}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page WordSection1 { size: A4; margin: 1.8cm 2cm 1.8cm 2cm; mso-header-margin: 1cm; mso-footer-margin: 1cm; mso-paper-source: 0; }
div.WordSection1 { page: WordSection1; }
body { font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif; font-size: 10.5pt; color: #1f2937; line-height: 1.7; }
h1, h2, h3, h4, p, ul, ol, li, table { font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif; }
table { border-collapse: collapse; }
img { max-width: 100%; }
</style>
</head>
<body>
<div class="WordSection1">
${body}
</div>
</body>
</html>`;
}
