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
const chartArea = document.getElementById("chartArea");
const modalMask = document.getElementById("modalMask");
const saveModal = document.getElementById("saveModal");
const feedbackModal = document.getElementById("feedbackModal");
const attributionResult = document.getElementById("attributionResult");
const attributionReportTitle = document.getElementById("attributionReportTitle");
const trendResult = document.getElementById("trendResult");
const trendReportTitle = document.getElementById("trendReportTitle");
const deleteModal = document.getElementById("deleteModal");
const uploadModal = document.getElementById("uploadModal");
const exportMenu = document.getElementById("exportMenu");
const exportTrigger = document.getElementById("exportTrigger");
const addMenu = document.getElementById("addMenu");
const askMenu = document.getElementById("askMenu");
const chartContextMenu = document.getElementById("chartContextMenu");
const historyContextMenu = document.getElementById("historyContextMenu");
const favoriteContextMenu = document.getElementById("favoriteContextMenu");
const userMenu = document.getElementById("userMenu");
const imageUploadInput = document.getElementById("imageUploadInput");
const fileUploadInput = document.getElementById("fileUploadInput");
const attachmentPreviewList = document.getElementById("attachmentPreviewList");
const themeName = document.getElementById("themeName");
const themeDesc = document.getElementById("themeDesc");
const followupContextChip = document.getElementById("followupContextChip");
const followupChipTitle = document.getElementById("followupChipTitle");
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
let currentResultView = "line";

const resultChartData = [
  { name: "1月", value: 2180 },
  { name: "2月", value: 2360 },
  { name: "3月", value: 2510 },
  { name: "4月", value: 2890, anomaly: true, anomalyTip: "异常 +15.1%" },
  { name: "5月", value: 3120 },
  { name: "6月", value: 3248 }
];

const resultChartPalette = ["#1677ff", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"];

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

function toggleUserMenu(event) {
  event.stopPropagation();
  userMenu.classList.toggle("hidden");
  hideExport();
  hideAddMenu();
  hideAskMenu();
  hideSideMenus();
  hideChartContextMenu();
}

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
}

function toggleModelItem(item) {
  if (!item) return;
  item.classList.toggle("expanded");
}
window.toggleModelItem = toggleModelItem;

function renderThinkingTimeline(mode = "qa") {
  const timeline = thinkingBox?.querySelector(".timeline");
  if (!timeline) return;
  let steps;
  if (mode === "analysis") steps = analysisThinkingSteps;
  else if (mode === "attribution") steps = attributionThinkingSteps;
  else if (mode === "trend") steps = trendThinkingSteps;
  else steps = qaThinkingSteps;
  timeline.innerHTML = steps.map(([title, desc]) => (
    `<div class="step"><div class="step-dot loading">·</div><div><strong>${title}</strong><span>${desc}</span></div></div>`
  )).join("");
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
    submittedQuestion = `基于"${ctx.title}"${actionText}`;
    answerTitle = `${ctx.title}-${actionText}`;
    if (ctx.action === "analysis") mode = "analysis";
    else if (ctx.action === "attribution") mode = "attribution";
    else if (ctx.action === "trend") mode = "trend";
    else mode = "qa";
  } else {
    submittedQuestion = inputText || "近6个月华东区销售额趋势如何？";
    answerTitle = "华东区近6个月销售额趋势分析";
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
    startTypewriterConclusion();
  }, thinkingDurationMs);
}

function resetAnswerSimulation() {
  if (!thinkingBox || !resultCard) return;
  stopThinkingElapsedTimer();
  thinkingElapsedSeconds = 0;
  updateThinkingElapsed();
  thinkingTitle.textContent = "思考过程";
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
        lineStyle: { color: "#cfe4ff", width: 1, type: "dashed" }
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
      lineStyle: { width: 3, color: "#1677ff" },
      itemStyle: { color: "#1677ff", borderColor: "#fff", borderWidth: 2 },
      areaStyle: {
        color: {
          type: "linear",
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: "rgba(22, 119, 255, 0.32)" },
            { offset: 1, color: "rgba(22, 119, 255, 0)" }
          ]
        }
      },
      emphasis: {
        focus: "series",
        itemStyle: {
          borderWidth: 3,
          shadowBlur: 12,
          shadowColor: "rgba(22, 119, 255, 0.45)"
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
  const tasks = [
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
      lineStyle: { width: 2.5, color: "#1677ff" },
      itemStyle: {
        color: (params) => params.dataIndex === anomalyIndex ? "#f97316" : "#1677ff",
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
            { offset: 0, color: "rgba(22, 119, 255, 0.22)" },
            { offset: 1, color: "rgba(22, 119, 255, 0)" }
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
        { name: "实际", itemStyle: { color: "#1677ff" } },
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
        lineStyle: { width: 2.5, color: "#1677ff" },
        itemStyle: { color: "#1677ff", borderColor: "#fff", borderWidth: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(22, 119, 255, 0.22)" },
              { offset: 1, color: "rgba(22, 119, 255, 0)" }
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
  if (trendReportTitle) {
    trendReportTitle.textContent = `${currentAnswerTitle} · 趋势分析报告`;
  }
  trendResult?.classList.remove("hidden");
  scrollToAnswerBottom();
  setTimeout(startTrendReportTypewriter, 240);
}

function copyAnswerContent() {
  let text = aiConclusion?.textContent?.trim() || "";
  if (!text && currentAnswerMode === "analysis") {
    const reportSection = document.getElementById("analysisResult");
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
  const total = resultChartData.reduce((sum, item) => sum + item.value, 0);
  return {
    color: resultChartPalette,
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
          shadowColor: "rgba(22, 119, 255, 0.35)"
        }
      },
      data: resultChartData.map((d) => ({ name: d.name, value: d.value }))
    }]
  };
}

function buildAxisChartOption(type) {
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
    lineStyle: { width: 3, color: "#1677ff" },
    itemStyle: { color: "#1677ff", borderColor: "#fff", borderWidth: 2 },
    emphasis: {
      focus: "series",
      itemStyle: {
        borderWidth: 3,
        shadowBlur: 12,
        shadowColor: "rgba(22, 119, 255, 0.45)"
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
          { offset: 0, color: "rgba(22, 119, 255, 0.32)" },
          { offset: 1, color: "rgba(22, 119, 255, 0)" }
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
          { offset: 0, color: "#1677ff" },
          { offset: 1, color: "#9dd7ff" }
        ]
      }
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 14,
        shadowOffsetY: 6,
        shadowColor: "rgba(22, 119, 255, 0.32)"
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
        lineStyle: { color: "#cfe4ff", width: 1, type: "dashed" }
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
  modalMask.classList.remove("hidden");
  saveModal.classList.remove("hidden");

  const title = document.getElementById("saveTitle");
  const sub = document.getElementById("saveSub");
  const dashMode = document.getElementById("saveModeDashboard");
  const otherMode = document.getElementById("saveModeOther");

  if (type === "dashboard") {
    title.textContent = "添加到我的仪表盘";
    sub.textContent = "AI 已为你推荐保存目录";
    dashMode.classList.remove("hidden");
    otherMode.classList.add("hidden");
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
  otherMode.classList.remove("hidden");
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
    sub.textContent = "AI 已推荐报告和章节位置";
    tip.textContent = "AI 建议将该图表添加到「二季度销售复盘报告」的「区域销售表现」章节，并自动生成配套说明文字。";
    field1.textContent = "选择报告";
    field2.textContent = "添加章节";
    input1.value = "二季度销售复盘报告";
    input2.value = "区域销售表现";
    desc.value = "华东区近6个月销售额持续增长，6月销售额达到3248万元，较1月增长49.0%。其中4月至6月增长明显，说明华东区域销售动能增强。";
  }
}

function closeModal() {
  modalMask.classList.add("hidden");
  saveModal.classList.add("hidden");
  feedbackModal.classList.add("hidden");
  deleteModal.classList.add("hidden");
  uploadModal.classList.add("hidden");
  if (typeof closeDirPicker === "function") closeDirPicker();
}

function saveSuccess() {
  closeModal();
  showToast("已添加成功，内容保留来源标识");
}

function exportAction(type) {
  const exportLabelMap = {
    image: "导出图片",
    pdf: "导出 PDF",
    word: "导出 Word",
    excel: "导出 Excel"
  };
  hideExport();
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
  const menuWidth = menu.getBoundingClientRect().width || menu.scrollWidth || 0;
  menu.style.visibility = "";
  menu.classList.add("hidden");
  const left = Math.min(
    Math.max(8, triggerRect.right - menuWidth),
    window.innerWidth - menuWidth - 8
  );
  menu.style.left = `${left}px`;
  menu.style.top = `${triggerRect.bottom + 8}px`;
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
  interpret: { prefill: "进行数据解读", action: "analysis" },
  attribution: { prefill: "对4月异常增长进行归因分析", action: "attribution" },
  trend: { prefill: "预测未来3个月的销售趋势", action: "trend" }
};

function askFollowup(type) {
  hideAskMenu();
  const preset = followupActionPresets[type];
  if (!preset) return;
  const baseTitle = resultTitle?.textContent?.trim() || currentAnswerTitle || "当前问题";
  setFollowupContext({ title: baseTitle, action: preset.action, prefill: preset.prefill });
}

function setFollowupContext(ctx) {
  pendingFollowupContext = { title: ctx.title, action: ctx.action || "qa" };
  if (followupChipTitle) followupChipTitle.textContent = ctx.title;
  followupContextChip?.classList.remove("hidden");
  if (questionInput) {
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
  if (!event.target.closest(".user-trigger") && !event.target.closest("#userMenu")) {
    userMenu.classList.add("hidden");
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
