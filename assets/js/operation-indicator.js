(function () {
  var PAGE_SIZE_OPTIONS = [5, 10, 20];

  var DATA_SOURCE_TREE = [
    { id: "d_sales", name: "销售域", children: [
      { id: "ds_sales", name: "销售业务库", type: "MySQL" },
      { id: "ds_order_svc", name: "订单服务库", type: "MySQL" }
    ] },
    { id: "d_customer", name: "客户域", children: [
      { id: "ds_cdw", name: "客户数据仓库", type: "PostgreSQL" },
      { id: "ds_crm", name: "CRM 业务库", type: "PostgreSQL" }
    ] },
    { id: "d_inventory", name: "库存域", children: [
      { id: "ds_inventory", name: "库存分析库", type: "Oracle" }
    ] },
    { id: "d_finance", name: "财务域", children: [
      { id: "ds_finance", name: "财务核算库", type: "SQLServer" }
    ] },
    { id: "d_ops", name: "运营域", children: [
      { id: "ds_realtime", name: "实时分析库", type: "ClickHouse" },
      { id: "ds_metric", name: "运营指标库", type: "ClickHouse" }
    ] }
  ];

  var TABLES_BY_SRC = {
    ds_metric: ["non_bidding_project_info", "non_bidding_fee_detail", "bidding_project_info", "platform_service_fee_detail", "ca_fee_detail", "ecommerce_trade_detail"],
    ds_sales: ["sales_order", "sales_order_item", "customer", "product", "channel"],
    ds_order_svc: ["order_pay", "order_refund", "pay_channel_dim"],
    ds_cdw: ["customer_master", "customer_tag", "customer_segment"],
    ds_crm: ["crm_lead", "crm_account", "crm_activity"],
    ds_inventory: ["inventory_log", "inventory_snapshot", "warehouse_dim", "sku_dim"],
    ds_finance: ["ar_master", "ap_master", "gl_detail"],
    ds_realtime: ["event_track", "page_view_daily", "campaign_dim"]
  };

  var FIELDS_BY_TABLE = {
    sales_order: ["order_id", "sales_amount", "pay_amount", "order_date", "customer_id", "channel_id", "region"],
    sales_order_item: ["order_id", "product_id", "quantity", "price"],
    customer: ["customer_id", "customer_name", "register_date"],
    channel: ["channel_id", "channel_name"],
    customer_master: ["customer_id", "customer_name", "level"],
    customer_tag: ["customer_id", "tag"],
    inventory_snapshot: ["sku_id", "warehouse_id", "stock_qty", "snapshot_date"],
    warehouse_dim: ["warehouse_id", "warehouse_name", "city"],
    platform_service_fee_detail: ["service_fee_amount", "service_fee_collection_time", "project_id"],
    non_bidding_fee_detail: ["service_fee_amount", "service_fee_payment_time", "procurement_method", "project_id"],
    ecommerce_trade_detail: ["trade_amount", "acceptance_time", "category"],
    gl_detail: ["account_id", "amount", "period"],
    event_track: ["event_id", "user_id", "event_name", "event_time"]
  };

  var DATA_SOURCES = flattenSourceTree();
  var AGG_OPTIONS = ["SUM", "COUNT", "COUNT_DISTINCT", "AVG", "MAX", "MIN"];
  var UNIT_PRESETS = ["元", "万元", "亿元", "%", "件", "次", "人", "天"];
  var TIME_TPL_PRESETS = [
    { key: "按月", formula: "DATE_FORMAT(?, '%Y-%m')" },
    { key: "按日", formula: "DATE_FORMAT(?, '%Y-%m-%d')" },
    { key: "按年", formula: "YEAR(?)" },
    { key: "按季度", formula: "CONCAT(YEAR(?), '-Q', QUARTER(?))" },
    { key: "按周", formula: "DATE_FORMAT(?, '%x-W%v')" }
  ];

  var state = {
    activeTab: "pending",
    page: { pending: 1, processed: 1 },
    pageSize: { pending: 5, processed: 5 },
    sort: {
      pending: { field: "askCount", dir: "desc" },
      processed: { field: "processedAt", dir: "desc" }
    },
    sqlTheme: "light",
    drawer: { mode: null, item: null, draft: null }
  };

  var pendingItems = [
    {
      id: "ir001", question: "销售目标完成率怎么算？", theme: "销售分析", userCount: 46, askCount: 168, likeCount: 92, dislikeCount: 11,
      similarQuestions: ["本月销售目标达成率是多少？", "销售目标完成情况怎么计算？", "各区域目标完成率排名"],
      sql: "SELECT SUM(pay_amount) / SUM(target_amount) AS target_completion_rate\nFROM sales_target_fact\nWHERE biz_month = DATE_FORMAT(CURDATE(), '%Y-%m');"
    },
    {
      id: "ir002", question: "客户复购率下降原因", theme: "客户分析", userCount: 32, askCount: 126, likeCount: 68, dislikeCount: 19,
      similarQuestions: ["最近复购率为什么降低？", "客户重复购买比例下降怎么看？", "老客复购变化趋势分析"],
      sql: "SELECT customer_level,\n       COUNT(DISTINCT customer_id) AS customer_cnt,\n       COUNT(order_id) AS order_cnt\nFROM sales_order\nWHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)\nGROUP BY customer_level;"
    },
    {
      id: "ir003", question: "库存积压风险怎么识别？", theme: "库存分析", userCount: 29, askCount: 97, likeCount: 44, dislikeCount: 23,
      similarQuestions: ["哪些商品存在库存积压？", "库存周转异常怎么判断？", "高库存低动销商品清单"],
      sql: "SELECT sku_id,\n       AVG(stock_qty) AS avg_stock_qty,\n       AVG(stock_days) AS avg_stock_days\nFROM inventory_snapshot\nGROUP BY sku_id\nHAVING AVG(stock_days) > 45;"
    },
    {
      id: "ir004", question: "服务费回款率本月是多少？", theme: "财务分析", userCount: 21, askCount: 82, likeCount: 39, dislikeCount: 9,
      similarQuestions: ["本月服务费回款完成率", "平台服务费回款比例是多少？", "服务费应收已收对比"],
      sql: "SELECT SUM(received_fee) / SUM(payable_fee) AS collection_rate\nFROM platform_service_fee_detail\nWHERE service_fee_collection_time >= DATE_FORMAT(CURDATE(), '%Y-%m-01');"
    },
    {
      id: "ir005", question: "渠道转化率周环比", theme: "销售分析", userCount: 18, askCount: 73, likeCount: 55, dislikeCount: 6,
      similarQuestions: ["各渠道转化率本周变化", "渠道转化周环比怎么看？", "哪个渠道转化率提升最多"],
      sql: "SELECT channel,\n       COUNT(DISTINCT buyer_id) / COUNT(DISTINCT user_id) AS conversion_rate\nFROM channel_funnel\nWHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)\nGROUP BY channel;"
    },
    {
      id: "ir006", question: "新客户首单转化时长", theme: "客户分析", userCount: 16, askCount: 58, likeCount: 31, dislikeCount: 8,
      similarQuestions: ["新客从注册到首单平均多久？", "新客户首购周期分析", "首单转化时间趋势"],
      sql: "SELECT AVG(DATEDIFF(first_order_date, register_date)) AS first_order_days\nFROM customer_first_order_fact;"
    },
    {
      id: "ir007", question: "季度毛利率波动原因", theme: "财务分析", userCount: 13, askCount: 47, likeCount: 22, dislikeCount: 14,
      similarQuestions: ["本季度毛利率为什么下降？", "季度毛利率变化趋势", "毛利率异常波动分析"],
      sql: "SELECT quarter,\n       SUM(gross_profit) / SUM(revenue) AS gross_margin\nFROM finance_margin_monthly\nGROUP BY quarter;"
    }
  ];

  var processedItems = [
    {
      id: "ir101", question: "客单价趋势怎么看？", theme: "销售分析", userCount: 39, askCount: 145, likeCount: 88, dislikeCount: 7,
      similarQuestions: ["近 30 天客单价走势", "客单价环比变化怎么看？", "不同渠道客单价对比"],
      sql: "SELECT SUM(pay_amount) / COUNT(DISTINCT order_id) AS avg_order_value\nFROM sales_order\nWHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY);",
      processor: "张三", processedAt: "2026-05-09 15:40", metricName: "客单价",
      metric: { name: "客单价", type: "衍生指标", srcId: "ds_sales", formula: "销售额 / 订单量", desc: "统计周期内每笔订单的平均成交金额。", unit: "元" }
    },
    {
      id: "ir102", question: "服务费回款率能否作为常用指标？", theme: "财务分析", userCount: 27, askCount: 104, likeCount: 61, dislikeCount: 10,
      similarQuestions: ["服务费回款完成率怎么定义？", "平台服务费回款率统计", "应收服务费和已收服务费比例"],
      sql: "SELECT SUM(received_fee) / SUM(payable_fee) AS collection_rate\nFROM platform_service_fee_detail;",
      processor: "李四", processedAt: "2026-05-08 17:12", metricName: "服务费回款率",
      metric: { name: "服务费回款率", type: "衍生指标", srcId: "ds_metric", formula: "已回款服务费 / 应回款服务费", desc: "衡量平台服务费在统计周期内的回款完成情况。", unit: "%" }
    },
    {
      id: "ir103", question: "库存周转天数偏长商品", theme: "库存分析", userCount: 24, askCount: 91, likeCount: 46, dislikeCount: 12,
      similarQuestions: ["库存周转慢的商品有哪些？", "哪些 SKU 周转天数过长？", "库存周转天数排名"],
      sql: "SELECT sku_id,\n       AVG(stock_days) AS avg_stock_days\nFROM inventory_snapshot\nGROUP BY sku_id;",
      processor: "王五", processedAt: "2026-05-07 11:26", metricName: "库存周转天数",
      metric: { name: "库存周转天数", type: "原子指标", srcId: "ds_inventory", table: "inventory_snapshot", field: "stock_days", agg: "AVG", desc: "库存商品从入库到出库的平均周转耗时。", unit: "天" }
    }
  ];

  function $(id) { return document.getElementById(id); }
  function escapeHTML(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function attr(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function flattenSourceTree() {
    var arr = [];
    DATA_SOURCE_TREE.forEach(function (domain) {
      (domain.children || []).forEach(function (source) {
        arr.push({ id: source.id, name: source.name, type: source.type, domainId: domain.id, domainName: domain.name });
      });
    });
    return arr;
  }
  function findSourceInTree(id) {
    for (var i = 0; i < DATA_SOURCE_TREE.length; i++) {
      var domain = DATA_SOURCE_TREE[i];
      var sources = domain.children || [];
      for (var j = 0; j < sources.length; j++) if (sources[j].id === id) return { domain: domain, source: sources[j] };
    }
    return null;
  }
  function dsName(id) {
    for (var i = 0; i < DATA_SOURCES.length; i++) if (DATA_SOURCES[i].id === id) return DATA_SOURCES[i].name;
    return "";
  }
  function dsPathName(id) {
    var found = findSourceInTree(id);
    return found ? found.domain.name + " / " + found.source.name : dsName(id);
  }
  function typeLabel(type) {
    return type === "atom" ? "原子指标" : type === "derived" ? "衍生指标" : type === "dim" ? "维度" : type || "";
  }
  function newIndicatorDraft(item) {
    return {
      id: "", groupId: "g_revenue_current", type: "atom", name: guessMetricName(item.question), synonyms: "", desc: "",
      srcId: DATA_SOURCES[0].id, table: "", field: "", agg: "SUM", timeField: "", unit: "万元",
      formula: "", isTimeDim: false, timeTplKey: "", timeFormula: "", mappings: [], filterValues: []
    };
  }
  function guessMetricName(question) {
    if (question.indexOf("完成率") > -1) return "销售目标完成率";
    if (question.indexOf("复购率") > -1) return "客户复购率";
    if (question.indexOf("库存") > -1) return "库存周转天数";
    if (question.indexOf("回款率") > -1) return "服务费回款率";
    if (question.indexOf("转化率") > -1) return "渠道转化率";
    if (question.indexOf("客单价") > -1) return "客单价";
    return "";
  }

  function init() {
    bindEvents();
    renderAll();
  }

  function bindEvents() {
    var mask = $("oiDrawerMask");
    if (mask) mask.addEventListener("click", closeDrawer);
    document.addEventListener("click", function (event) {
      var tabBtn = event.target.closest(".oi-tab");
      if (tabBtn) { switchTab(tabBtn.getAttribute("data-tab")); return; }
      var sourceBtn = event.target.closest('[data-act="toggle-source-tree"]');
      if (sourceBtn) { event.stopPropagation(); toggleSourcePicker(sourceBtn); return; }
      var domainRow = event.target.closest(".ki-source-tree-row.is-domain");
      if (domainRow) { event.stopPropagation(); var node = domainRow.closest(".ki-source-tree-node"); if (node) node.classList.toggle("is-collapsed"); return; }
      var sourceRow = event.target.closest(".ki-source-tree-row[data-src-id]");
      if (sourceRow && state.drawer.draft) { event.stopPropagation(); selectMetricSource(sourceRow.getAttribute("data-src-id")); return; }
      var chip = event.target.closest(".ki-chip");
      if (chip && state.drawer.draft) {
        if (chip.hasAttribute("data-unit")) { state.drawer.draft.unit = chip.getAttribute("data-unit"); renderDrawer(); }
        else if (chip.hasAttribute("data-tpl")) setTimeTemplate(chip.getAttribute("data-tpl"));
        return;
      }
      var action = event.target.closest("[data-act]");
      if (!action) return;
      var act = action.getAttribute("data-act");
      if (act === "search") { state.page[state.activeTab] = 1; renderAll(); }
      else if (act === "reset-filter") resetFilter(state.activeTab);
      else if (act === "sort") sortBy(action.getAttribute("data-sort"));
      else if (act === "process") openProcess(action.getAttribute("data-id"));
      else if (act === "view") openView(action.getAttribute("data-id"));
      else if (act === "close-drawer" || act === "cancel") closeDrawer();
      else if (act === "confirm-process") confirmProcess();
      else if (act === "pg-prev") turnPage(-1);
      else if (act === "pg-next") turnPage(1);
      else if (act === "pg-page") { state.page[state.activeTab] = Number(action.getAttribute("data-page")) || 1; renderAll(); }
      else if (act === "toggle-sql-theme") toggleSqlTheme();
      else if (act === "format-sql") formatCurrentSQL(action);
      else if (act === "add-mapping") addMapping();
      else if (act === "add-filter") addFilter();
      else if (act === "del-mapping") { var rowM = action.closest(".ki-row-grid"); if (rowM) delMapping(parseInt(rowM.getAttribute("data-idx"), 10)); }
      else if (act === "del-filter") { var rowF = action.closest(".ki-row-grid"); if (rowF) delFilter(parseInt(rowF.getAttribute("data-idx"), 10)); }
    });
    document.addEventListener("input", function (event) {
      var t = event.target;
      if (t.matches(".oi-filter input")) state.page[state.activeTab] = 1;
      if (t.hasAttribute("data-bind") || t.hasAttribute("data-row-bind")) updateDraft(t);
      if (t.classList.contains("ke-sql-input")) syncSqlEditor(t);
    });
    document.addEventListener("change", function (event) {
      var t = event.target;
      if (t.matches(".oi-filter select")) { state.page[state.activeTab] = 1; renderAll(); }
      if (t.hasAttribute("data-bind") || t.hasAttribute("data-row-bind")) updateDraft(t);
      if (t.id === "oiPageSize") { state.pageSize[state.activeTab] = Number(t.value) || 5; state.page[state.activeTab] = 1; renderAll(); }
    });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeDrawer(); });
    bindDrawerResize();
  }

  function bindDrawerResize() {
    var handle = $("oiDrawerResize"), drawer = $("oiDrawer");
    if (!handle || !drawer) return;
    var resizing = false;
    handle.addEventListener("mousedown", function () { resizing = true; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; });
    document.addEventListener("mousemove", function (event) {
      if (!resizing) return;
      drawer.style.width = Math.min(Math.max(window.innerWidth - event.clientX, 520), window.innerWidth * .9) + "px";
    });
    document.addEventListener("mouseup", function () { if (!resizing) return; resizing = false; document.body.style.cursor = ""; document.body.style.userSelect = ""; });
  }

  function switchTab(tab) { if (!tab || tab === state.activeTab) return; state.activeTab = tab; state.page[tab] = 1; renderAll(); }
  function resetFilter(tab) {
    var ids = tab === "pending" ? ["oiPendingQuestion", "oiPendingTheme"] : ["oiProcessedQuestion", "oiProcessedTheme"];
    ids.forEach(function (id) { var el = $(id); if (el) el.value = ""; });
    state.page[tab] = 1;
    renderAll();
  }
  function sortBy(field) {
    if (!field) return;
    var current = state.sort[state.activeTab];
    if (current.field === field) current.dir = current.dir === "desc" ? "asc" : "desc";
    else {
      current.field = field;
      current.dir = "desc";
    }
    state.page[state.activeTab] = 1;
    renderAll();
  }
  function renderAll() { renderCounts(); renderTabs(); renderFilters(); renderTable(); }
  function renderCounts() {
    $("oiPendingCount").textContent = pendingItems.length; $("oiProcessedCount").textContent = processedItems.length;
    $("oiPendingBadge").textContent = pendingItems.length; $("oiProcessedBadge").textContent = processedItems.length;
  }
  function renderTabs() {
    document.querySelectorAll(".oi-tab").forEach(function (btn) {
      var active = btn.getAttribute("data-tab") === state.activeTab;
      btn.classList.toggle("is-active", active); btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }
  function renderFilters() {
    $("oiPendingFilter").classList.toggle("hidden", state.activeTab !== "pending");
    $("oiProcessedFilter").classList.toggle("hidden", state.activeTab !== "processed");
  }
  function getFilteredItems(tab) {
    var isPending = tab === "pending";
    var arr = (isPending ? pendingItems : processedItems).slice();
    var q = ($(isPending ? "oiPendingQuestion" : "oiProcessedQuestion").value || "").trim();
    var theme = $(isPending ? "oiPendingTheme" : "oiProcessedTheme").value;
    var sort = state.sort[tab];
    arr = arr.filter(function (it) { return (!q || it.question.toLowerCase().indexOf(q.toLowerCase()) > -1) && (!theme || it.theme === theme); });
    arr.sort(function (a, b) {
      var result = sort.field === "processedAt"
        ? String(a.processedAt || "").localeCompare(String(b.processedAt || ""))
        : (Number(a[sort.field]) || 0) - (Number(b[sort.field]) || 0);
      return sort.dir === "asc" ? result : -result;
    });
    return arr;
  }
  function renderTable() {
    var items = getFilteredItems(state.activeTab);
    var size = state.pageSize[state.activeTab];
    var totalPages = Math.max(1, Math.ceil(items.length / size));
    if (state.page[state.activeTab] > totalPages) state.page[state.activeTab] = totalPages;
    var page = state.page[state.activeTab], start = (page - 1) * size;
    var pageItems = items.slice(start, start + size);
    $("oiThead").innerHTML = state.activeTab === "pending" ? pendingHeadHTML() : processedHeadHTML();
    $("oiTbody").innerHTML = pageItems.length ? pageItems.map(state.activeTab === "pending" ? pendingRowHTML : processedRowHTML).join("") : emptyRowHTML(state.activeTab === "pending" ? 8 : 11);
    renderPager(items.length, page, totalPages, size);
  }
  function pendingHeadHTML() {
    return "<tr><th style='width:22%;'>用户问题</th><th style='width:9%;'>分析主题</th><th style='width:8%;'>提问人数</th>" + sortHeadHTML("askCount", "提问次数", "8%") + sortHeadHTML("likeCount", "喜欢", "7%") + sortHeadHTML("dislikeCount", "不喜欢", "7%") + "<th style='width:28%;'>执行SQL</th><th style='width:11%;'>操作</th></tr>";
  }
  function processedHeadHTML() {
    return "<tr><th style='width:17%;'>用户问题</th><th style='width:8%;'>分析主题</th><th style='width:7%;'>提问人数</th>" + sortHeadHTML("askCount", "提问次数", "7%") + sortHeadHTML("likeCount", "喜欢", "6%") + sortHeadHTML("dislikeCount", "不喜欢", "6%") + "<th style='width:20%;'>执行SQL</th><th style='width:7%;'>处理人</th>" + sortHeadHTML("processedAt", "处理时间", "9%") + "<th style='width:8%;'>沉淀指标</th><th style='width:5%;'>操作</th></tr>";
  }
  function sortHeadHTML(field, label, width) {
    var sort = state.sort[state.activeTab], active = sort.field === field;
    var arrows = "<span class='oi-sort-arrow" + (active && sort.dir === "asc" ? " is-on" : "") + "'>▲</span><span class='oi-sort-arrow" + (active && sort.dir === "desc" ? " is-on" : "") + "'>▼</span>";
    return "<th style='width:" + width + ";'><button type='button' class='oi-sort-head" + (active ? " is-active" : "") + "' data-act='sort' data-sort='" + attr(field) + "'><span>" + escapeHTML(label) + "</span><span class='oi-sort-arrows' aria-hidden='true'>" + arrows + "</span></button></th>";
  }
  function pendingRowHTML(it) {
    return "<tr><td><span class='oi-main-text' title='" + attr(it.question) + "'>" + escapeHTML(it.question) + "</span></td>"
      + "<td>" + themeTag(it.theme) + "</td><td><span class='oi-num'>" + it.userCount + "</span></td><td><span class='oi-num'>" + it.askCount + "</span></td><td><span class='oi-num'>" + it.likeCount + "</span></td><td><span class='oi-num'>" + it.dislikeCount + "</span></td>"
      + "<td><span class='oi-sql-pill' title='" + attr(it.sql) + "'>" + escapeHTML(it.sql) + "</span></td>"
      + "<td><button type='button' class='oi-action-btn' data-act='process' data-id='" + attr(it.id) + "'>处理</button></td></tr>";
  }
  function processedRowHTML(it) {
    return "<tr><td><span class='oi-main-text' title='" + attr(it.question) + "'>" + escapeHTML(it.question) + "</span></td>"
      + "<td>" + themeTag(it.theme) + "</td><td><span class='oi-num'>" + it.userCount + "</span></td><td><span class='oi-num'>" + it.askCount + "</span></td><td><span class='oi-num'>" + it.likeCount + "</span></td><td><span class='oi-num'>" + it.dislikeCount + "</span></td>"
      + "<td><span class='oi-sql-pill' title='" + attr(it.sql) + "'>" + escapeHTML(it.sql) + "</span></td><td>" + escapeHTML(it.processor) + "</td><td><span class='oi-sub-text'>" + escapeHTML(it.processedAt) + "</span></td><td><span class='oi-metric-tag'>" + escapeHTML(it.metricName) + "</span></td>"
      + "<td><button type='button' class='oi-action-btn' data-act='view' data-id='" + attr(it.id) + "'>查看</button></td></tr>";
  }
  function themeTag(theme) { return "<span class='oi-theme-tag'>" + escapeHTML(theme) + "</span>"; }
  function emptyRowHTML(colspan) { return "<tr><td class='oi-empty' colspan='" + colspan + "'>暂无匹配的问题记录</td></tr>"; }
  function renderPager(total, page, totalPages, size) {
    var start = total ? (page - 1) * size + 1 : 0, end = Math.min(page * size, total), pages = "";
    for (var i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages += "<button type='button' data-act='pg-page' data-page='" + i + "' class='" + (i === page ? "is-current" : "") + "'>" + i + "</button>";
      else if (pages.slice(-8) !== "...</span>") pages += "<span style='padding:0 4px;'>...</span>";
    }
    $("oiPager").innerHTML = "<div class='ki-pg-info'>共 " + total + " 条，当前 " + start + "-" + end + " 条</div><div class='ki-pg-buttons'>"
      + "<select class='ki-pg-size' id='oiPageSize'>" + PAGE_SIZE_OPTIONS.map(function (opt) { return "<option value='" + opt + "'" + (opt === size ? " selected" : "") + ">" + opt + " 条/页</option>"; }).join("") + "</select>"
      + "<button type='button' data-act='pg-prev'" + (page <= 1 ? " disabled" : "") + ">上一页</button>" + pages
      + "<button type='button' data-act='pg-next'" + (page >= totalPages ? " disabled" : "") + ">下一页</button></div>";
  }
  function turnPage(delta) {
    var totalPages = Math.max(1, Math.ceil(getFilteredItems(state.activeTab).length / state.pageSize[state.activeTab]));
    state.page[state.activeTab] = Math.min(Math.max(state.page[state.activeTab] + delta, 1), totalPages);
    renderAll();
  }

  function openProcess(id) {
    var item = pendingItems.find(function (it) { return it.id === id; });
    if (!item) return;
    state.drawer = { mode: "process", item: item, draft: newIndicatorDraft(item) };
    renderDrawer(); showDrawer();
  }
  function openView(id) {
    var item = processedItems.find(function (it) { return it.id === id; });
    if (!item) return;
    state.drawer = { mode: "view", item: item, draft: clone(item.metric || {}) };
    renderDrawer(); showDrawer();
  }
  function showDrawer() {
    $("oiDrawerMask").classList.remove("hidden"); $("oiDrawer").classList.remove("hidden"); $("oiDrawer").setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    $("oiDrawerMask").classList.add("hidden"); $("oiDrawer").classList.add("hidden"); $("oiDrawer").setAttribute("aria-hidden", "true");
    state.drawer = { mode: null, item: null, draft: null };
  }
  function renderDrawer() {
    var item = state.drawer.item, mode = state.drawer.mode, chip = $("oiDrawerChip");
    if (mode === "process") {
      $("oiDrawerTitle").textContent = "处理指标沉淀";
      $("oiDrawerSubtitle").textContent = "将高频问题沉淀为指标体系中的标准指标";
      chip.textContent = "处理模式"; chip.className = "ki-mode-chip is-edit";
      $("oiDrawerBody").innerHTML = baseInfoHTML(item) + sqlInfoHTML(item) + "<div class='oi-section-title'><h4>沉淀指标</h4></div><div class='oi-form-section full oi-indicator-form'>" + renderIndicatorFormBody(state.drawer.draft) + "</div>";
      $("oiDrawerFoot").innerHTML = "<button type='button' class='ghost-btn' data-act='cancel'>取消</button><button type='button' class='primary-btn' data-act='confirm-process'>确定</button>";
    } else {
      $("oiDrawerTitle").textContent = "查看沉淀结果";
      $("oiDrawerSubtitle").textContent = item.metricName || "查看已沉淀指标详情";
      chip.textContent = "查看模式"; chip.className = "ki-mode-chip";
      $("oiDrawerBody").innerHTML = baseInfoHTML(item) + sqlInfoHTML(item) + viewMetricHTML(item);
      $("oiDrawerFoot").innerHTML = "<button type='button' class='ghost-btn' data-act='close-drawer'>关闭</button>";
    }
  }
  function baseInfoHTML(item) {
    return "<div class='oi-info-grid'>"
      + infoCell("用户问题", questionDetailHTML(item), true, true)
      + infoCell("分析主题", themeTag(item.theme), false, true)
      + infoCell("提问人数", item.userCount)
      + infoCell("提问次数", item.askCount)
      + infoCell("喜欢 / 不喜欢", item.likeCount + " / " + item.dislikeCount)
      + "</div>";
  }
  function sqlInfoHTML(item) {
    return "<div class='oi-section-title'><h4>执行 SQL</h4></div><div class='oi-info-card full'>" + sqlEditor(item.sql, true) + "</div>";
  }
  function questionDetailHTML(item) {
    var similar = item.similarQuestions || [];
    return "<div class='oi-question-main'>" + escapeHTML(item.question) + "</div>"
      + "<div class='oi-similar-block'><div class='oi-similar-title'>同类问题</div>"
      + "<ul class='oi-similar-list'>"
      + (similar.length ? similar.map(function (q) { return "<li>" + escapeHTML(q) + "</li>"; }).join("") : "<li>暂无同类问题</li>")
      + "</ul></div>";
  }
  function infoCell(label, value, full, raw) {
    return "<div class='oi-info-card" + (full ? " full" : "") + "'><div class='oi-label'>" + escapeHTML(label) + "</div><div class='oi-value'>" + (raw ? value : escapeHTML(value || "—")) + "</div></div>";
  }
  function viewMetricHTML(item) {
    var m = item.metric || {};
    return "<div class='oi-section-title'><h4>沉淀指标</h4></div><div class='oi-view-section'><div class='oi-view-grid'>"
      + viewCell("指标名称", m.name || item.metricName)
      + viewCell("指标类型", m.type)
      + viewCell("数据源", dsPathName(m.srcId))
      + viewCell("单位", m.unit)
      + viewCell("物理表 / 字段", [m.table, m.field].filter(Boolean).join(" / "), true)
      + viewCell("计算公式", m.formula, true)
      + viewCell("描述", m.desc, true)
      + viewCell("处理人", item.processor)
      + viewCell("处理时间", item.processedAt)
      + "</div></div>";
  }
  function viewCell(label, value, full) {
    return "<div class='" + (full ? "full" : "") + "'><div class='oi-label'>" + escapeHTML(label) + "</div><div class='oi-value'>" + escapeHTML(value || "—") + "</div></div>";
  }

  function sourceTreeHTML(selectedId) {
    return DATA_SOURCE_TREE.map(function (domain) {
      var sources = domain.children || [], hasSelected = sources.some(function (s) { return s.id === selectedId; });
      var sourceHTML = sources.map(function (s) {
        return "<div class='ki-source-tree-node is-leaf'><button type='button' class='ki-source-tree-row" + (s.id === selectedId ? " is-active" : "") + "' data-src-id='" + attr(s.id) + "'><span class='ki-source-tree-toggle is-empty'></span><span class='ki-source-tree-icon is-source'><svg viewBox='0 0 24 24' aria-hidden='true'><ellipse cx='12' cy='5.5' rx='7' ry='2.5'/><path d='M5 5.5V12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5.5'/><path d='M5 12v6.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V12'/></svg></span><span class='ki-source-tree-name'>" + escapeHTML(s.name) + "</span><span class='ki-source-tree-meta'>" + escapeHTML(s.type || "") + "</span></button></div>";
      }).join("");
      return "<div class='ki-source-tree-node" + (hasSelected ? "" : " is-collapsed") + "'><button type='button' class='ki-source-tree-row is-domain'><span class='ki-source-tree-toggle'><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 9l6 6 6-6'/></svg></span><span class='ki-source-tree-icon'><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M4 7l8-4 8 4-8 4-8-4z'/><path d='M4 12l8 4 8-4'/><path d='M4 17l8 4 8-4'/></svg></span><span class='ki-source-tree-name'>" + escapeHTML(domain.name) + "</span><span class='ki-source-tree-meta'>" + sources.length + "</span></button><div class='ki-source-tree-children'>" + sourceHTML + "</div></div>";
    }).join("");
  }
  function sourcePickerHTML(selectedId) {
    var label = dsPathName(selectedId);
    return "<div class='ki-source-picker' data-role='source-picker'><button type='button' class='ki-source-picker-btn' data-act='toggle-source-tree' aria-haspopup='tree' aria-expanded='false'><span class='ki-source-picker-text" + (label ? "" : " is-placeholder") + "'>" + escapeHTML(label || "请选择数据源") + "</span><span class='ki-source-picker-arrow'><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M6 9l6 6 6-6'/></svg></span></button><div class='ki-source-tree-pop' role='tree'>" + sourceTreeHTML(selectedId) + "</div></div>";
  }
  function tableOptions(srcId, selected) {
    var arr = TABLES_BY_SRC[srcId] || [];
    return ["<option value=''>请选择</option>"].concat(arr.map(function (t) { return "<option value='" + attr(t) + "'" + (t === selected ? " selected" : "") + ">" + escapeHTML(t) + "</option>"; })).join("");
  }
  function fieldOptions(table, selected, includeEmpty) {
    var arr = FIELDS_BY_TABLE[table] || [], head = includeEmpty ? "<option value=''>请选择</option>" : "";
    return [head].concat(arr.map(function (f) { return "<option value='" + attr(f) + "'" + (f === selected ? " selected" : "") + ">" + escapeHTML(f) + "</option>"; })).join("");
  }
  function aggOptions(selected) { return AGG_OPTIONS.map(function (a) { return "<option value='" + attr(a) + "'" + (a === selected ? " selected" : "") + ">" + escapeHTML(a) + "</option>"; }).join(""); }
  function unitChipsHTML(selected) { return UNIT_PRESETS.map(function (u) { return "<span class='ki-chip" + (selected === u ? " is-checked" : "") + "' data-unit='" + attr(u) + "'>" + escapeHTML(u) + "</span>"; }).join(""); }
  function tplChipsHTML(selectedKey) { return TIME_TPL_PRESETS.map(function (t) { return "<span class='ki-chip" + (selectedKey === t.key ? " is-checked" : "") + "' data-tpl='" + attr(t.key) + "'>" + escapeHTML(t.key) + "</span>"; }).join(""); }
  function renderIndicatorFormBody(d) {
    var common = "<div class='ki-form-row'><label class='ki-form-label'>数据源</label>" + sourcePickerHTML(d.srcId) + "</div>"
      + "<div class='ki-form-grid'><div class='ki-form-row'><label class='ki-form-label'>名称</label><input class='ki-input' data-bind='name' maxlength='40' value='" + attr(d.name) + "' /></div>"
      + "<div class='ki-form-row'><label class='ki-form-label'>类型</label><select class='ki-select-form' data-bind='type'><option value='atom'" + (d.type === "atom" ? " selected" : "") + ">原子指标</option><option value='derived'" + (d.type === "derived" ? " selected" : "") + ">衍生指标</option><option value='dim'" + (d.type === "dim" ? " selected" : "") + ">维度</option></select></div></div>"
      + "<div class='ki-form-row'><label class='ki-form-label'>同义词</label><input class='ki-input' data-bind='synonyms' placeholder='多个同义词用英文逗号分隔' value='" + attr(d.synonyms) + "' /></div>"
      + "<div class='ki-form-row'><label class='ki-form-label'>描述</label><textarea class='ki-textarea' data-bind='desc' maxlength='500' rows='4'>" + escapeHTML(d.desc) + "</textarea></div>";
    return common + (d.type === "atom" ? renderAtomBlock(d) : d.type === "derived" ? renderDerivedBlock(d) : renderDimBlock(d));
  }
  function renderAtomBlock(d) {
    return "<div class='ki-form-grid'><div class='ki-form-row'><label class='ki-form-label'>物理表名</label><select class='ki-select-form' data-bind='table'>" + tableOptions(d.srcId, d.table) + "</select></div><div class='ki-form-row'><label class='ki-form-label'>物理字段名</label><select class='ki-select-form' data-bind='field'>" + fieldOptions(d.table, d.field, true) + "</select></div></div>"
      + "<div class='ki-form-grid'><div class='ki-form-row'><label class='ki-form-label'>聚合方式</label><select class='ki-select-form' data-bind='agg'>" + aggOptions(d.agg) + "</select></div><div class='ki-form-row'><label class='ki-form-label'>时间字段（兜底）<span class='ki-form-tip' title='该字段用于在没有显式时间维度时兜底过滤'>?</span></label><select class='ki-select-form' data-bind='timeField'>" + fieldOptions(d.table, d.timeField, true) + "</select></div></div>"
      + "<div class='ki-form-row'><label class='ki-form-label'>单位<span class='ki-form-tip' title='可点选预设，也可在下方文本框自定义'>?</span></label><div class='ki-unit-chips' data-role='unit-chips'>" + unitChipsHTML(d.unit) + "</div><input class='ki-input' data-bind='unit' maxlength='20' value='" + attr(d.unit || "") + "' placeholder='自定义单位' /></div>";
  }
  function renderDerivedBlock(d) {
    return "<div class='ki-form-row'><label class='ki-form-label'>计算公式</label><textarea class='ki-textarea' data-bind='formula' rows='3' placeholder='例：销售额 / 订单量'>" + escapeHTML(d.formula || "") + "</textarea><div class='ki-form-hint'>公式中的标识符必须是系统中已定义的原子指标名</div></div>"
      + "<div class='ki-form-row'><label class='ki-form-label'>单位</label><div class='ki-unit-chips' data-role='unit-chips'>" + unitChipsHTML(d.unit) + "</div><input class='ki-input' data-bind='unit' maxlength='20' value='" + attr(d.unit || "") + "' placeholder='自定义单位' /></div>";
  }
  function renderDimBlock(d) {
    var html = "<div class='ki-form-row'><label class='ki-checkbox'><input type='checkbox' data-bind='isTimeDim'" + (d.isTimeDim ? " checked" : "") + " /> 是否时间维度<span class='ki-form-tip' title='勾选后将出现时间函数模板配置'>?</span></label></div>";
    if (d.isTimeDim) html += "<div class='ki-form-row'><label class='ki-form-label'>时间函数模板<span class='ki-form-tip' title='选择预设可填充公式模板'>?</span></label><div class='ki-tpl-chips' data-role='tpl-chips'>" + tplChipsHTML(d.timeTplKey) + "</div><input class='ki-input' data-bind='timeFormula' placeholder='时间函数公式' value='" + attr(d.timeFormula || "") + "' /></div>";
    html += "<div class='ki-form-row'><label class='ki-form-label'>关联表字段<span class='ki-form-tip' title='一个维度可以关联多张表的同一含义字段'>?</span></label><div class='ki-rows' data-role='mapping-rows'>" + mappingRowsHTML(d) + "</div><button type='button' class='ki-add-row' data-act='add-mapping' style='margin-top:8px;'>添加关联</button></div>";
    html += "<div class='ki-form-row'><label class='ki-form-label'>过滤值映射</label><div class='ki-rows' data-role='filter-rows'>" + filterRowsHTML(d) + "</div><button type='button' class='ki-add-row' data-act='add-filter' style='margin-top:8px;'>添加映射</button></div>";
    return html;
  }
  function mappingRowsHTML(d) {
    var arr = d.mappings || [];
    if (!arr.length) return "<div class='ki-empty-line'>暂无关联，可新增。</div>";
    return arr.map(function (m, idx) { return "<div class='ki-row-grid' data-idx='" + idx + "'><select class='ki-select-form' data-row-bind='table'>" + tableOptions(d.srcId, m.table) + "</select><select class='ki-select-form' data-row-bind='field'>" + fieldOptions(m.table, m.field, true) + "</select><button type='button' class='ki-row-del' data-act='del-mapping'>删除</button></div>"; }).join("");
  }
  function filterRowsHTML(d) {
    var arr = d.filterValues || [];
    if (!arr.length) return "<div class='ki-empty-line'>暂无映射，可新增。</div>";
    return arr.map(function (m, idx) { return "<div class='ki-row-grid' data-idx='" + idx + "'><input class='ki-input' data-row-bind='alias' value='" + attr(m.alias || "") + "' placeholder='别名' /><span class='ki-arrow'>→</span><input class='ki-input' data-row-bind='value' value='" + attr(m.value || "") + "' placeholder='数据库值' /><button type='button' class='ki-row-del' data-act='del-filter'>删除</button></div>"; }).join("");
  }

  function toggleSourcePicker(sourceBtn) {
    var drawer = $("oiDrawer"), wrap = sourceBtn.closest(".ki-source-picker");
    if (!drawer || !wrap) return;
    drawer.querySelectorAll(".ki-source-picker.is-open").forEach(function (el) { if (el !== wrap) el.classList.remove("is-open"); });
    var isOpen = !wrap.classList.contains("is-open"); wrap.classList.toggle("is-open", isOpen); sourceBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }
  function selectMetricSource(nextSrcId) {
    var d = state.drawer.draft;
    if (!d || d.srcId === nextSrcId) return;
    d.srcId = nextSrcId; d.table = ""; d.field = ""; d.timeField = ""; d.mappings = (d.mappings || []).map(function () { return { table: "", field: "" }; });
    renderDrawer();
  }
  function updateDraft(target) {
    var d = state.drawer.draft; if (!d) return;
    var bind = target.getAttribute("data-bind"), rowBind = target.getAttribute("data-row-bind");
    if (bind) {
      if (target.type === "checkbox") { d[bind] = !!target.checked; if (bind === "isTimeDim") renderDrawer(); return; }
      d[bind] = target.value;
      if (bind === "type") { normalizeMetricByType(d); renderDrawer(); return; }
      if (bind === "table") { d.field = ""; d.timeField = ""; renderDrawer(); return; }
      if (bind === "unit") renderDrawer();
      return;
    }
    if (rowBind) updateMetricRowBind(rowBind, target);
  }
  function updateMetricRowBind(rowBind, target) {
    var d = state.drawer.draft, row = target.closest(".ki-row-grid");
    if (!d || !row) return;
    var idx = parseInt(row.getAttribute("data-idx"), 10), role = row.parentElement && row.parentElement.getAttribute("data-role");
    if (role === "mapping-rows" && d.mappings[idx]) { d.mappings[idx][rowBind] = target.value; if (rowBind === "table") { d.mappings[idx].field = ""; renderDrawer(); } }
    if (role === "filter-rows" && d.filterValues[idx]) d.filterValues[idx][rowBind] = target.value;
  }
  function normalizeMetricByType(d) {
    if (d.type === "atom") { d.formula = ""; d.isTimeDim = false; d.timeFormula = ""; d.timeTplKey = ""; d.mappings = []; d.filterValues = []; if (!d.agg) d.agg = "SUM"; }
    else if (d.type === "derived") { d.table = ""; d.field = ""; d.agg = ""; d.timeField = ""; d.isTimeDim = false; d.timeFormula = ""; d.timeTplKey = ""; d.mappings = []; d.filterValues = []; }
    else { d.formula = ""; d.table = ""; d.field = ""; d.agg = ""; d.timeField = ""; d.unit = ""; if (!d.mappings) d.mappings = []; if (!d.filterValues) d.filterValues = []; }
  }
  function setTimeTemplate(key) {
    var d = state.drawer.draft; d.timeTplKey = key;
    TIME_TPL_PRESETS.forEach(function (t) { if (t.key === key) d.timeFormula = t.formula; });
    renderDrawer();
  }
  function addMapping() { var d = state.drawer.draft; if (!d.mappings) d.mappings = []; d.mappings.push({ table: "", field: "" }); renderDrawer(); }
  function delMapping(idx) { var d = state.drawer.draft; if (!d.mappings || isNaN(idx)) return; d.mappings.splice(idx, 1); renderDrawer(); }
  function addFilter() { var d = state.drawer.draft; if (!d.filterValues) d.filterValues = []; d.filterValues.push({ alias: "", value: "" }); renderDrawer(); }
  function delFilter(idx) { var d = state.drawer.draft; if (!d.filterValues || isNaN(idx)) return; d.filterValues.splice(idx, 1); renderDrawer(); }
  function confirmProcess() {
    var item = state.drawer.item, draft = state.drawer.draft;
    if (!item || !draft) return;
    if (!String(draft.name || "").trim()) { showToast("请填写指标名称"); return; }
    pendingItems = pendingItems.filter(function (it) { return it.id !== item.id; });
    processedItems.unshift(Object.assign({}, item, { processor: "张三", processedAt: "2026-05-09 16:30", metricName: draft.name, metric: clone(draft) }));
    closeDrawer(); renderAll(); showToast("指标已沉淀");
  }

  function sqlEditor(value, readonly) {
    var formatted = formatSQL(value || ""), lines = Math.max(8, formatted.split("\n").length), nextTheme = state.sqlTheme === "dark" ? "浅色" : "深色";
    return "<div class='ke-sql-editor is-" + attr(state.sqlTheme) + (readonly ? " is-readonly" : "") + "' data-role='sql-editor'><div class='ke-sql-toolbar'><span class='ke-sql-dot'></span><span class='ke-sql-dot'></span><span class='ke-sql-dot'></span><strong>SQL Editor</strong><button type='button' class='ke-sql-theme' data-act='toggle-sql-theme'>" + nextTheme + "</button><button type='button' class='ke-sql-format' data-act='format-sql'>格式化</button></div><div class='ke-sql-body'><div class='ke-sql-lines' aria-hidden='true'>" + lineNumbers(lines) + "</div><div class='ke-sql-code'><pre class='ke-sql-highlight' aria-hidden='true'>" + highlightSQL(formatted) + "</pre><textarea class='ke-sql-input' spellcheck='false' rows='" + lines + "'" + (readonly ? " readonly" : "") + ">" + escapeHTML(formatted) + "</textarea></div></div></div>";
  }
  function lineNumbers(count) { var html = ""; for (var i = 1; i <= count; i++) html += "<span>" + i + "</span>"; return html; }
  function toggleSqlTheme() { state.sqlTheme = state.sqlTheme === "dark" ? "light" : "dark"; renderDrawer(); }
  function formatCurrentSQL(action) {
    var editor = action && action.closest(".ke-sql-editor"), input = editor && editor.querySelector(".ke-sql-input");
    if (!input) return;
    input.value = formatSQL(input.value); syncSqlEditor(input); showToast("SQL 已格式化");
  }
  function syncSqlEditor(input) {
    var editor = input.closest(".ke-sql-editor"), lines = Math.max(8, input.value.split("\n").length);
    if (!editor) return;
    var lineEl = editor.querySelector(".ke-sql-lines"), high = editor.querySelector(".ke-sql-highlight");
    if (lineEl) lineEl.innerHTML = lineNumbers(lines);
    input.rows = lines;
    if (high) high.innerHTML = highlightSQL(input.value);
  }
  function highlightSQL(sql) {
    var html = escapeHTML(sql || "");
    html = html.replace(/('(?:''|[^'])*')/g, "<span class='ke-sql-str'>$1</span>");
    html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, "<span class='ke-sql-num'>$1</span>");
    html = html.replace(/\b(SELECT|FROM|WHERE|AND|OR|GROUP BY|ORDER BY|LIMIT|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|ON|AS|SUM|COUNT|AVG|MIN|MAX|DISTINCT|DATE_FORMAT|DATE_SUB|CURDATE|INTERVAL|CASE|WHEN|THEN|ELSE|END|IN|NOT|NULL|IS|LIKE|HAVING)\b/gi, function (m) {
      var upper = m.toUpperCase(), cls = /^(SUM|COUNT|AVG|MIN|MAX|DATE_FORMAT|DATE_SUB|CURDATE)$/.test(upper) ? "ke-sql-fn" : "ke-sql-kw";
      return "<span class='" + cls + "'>" + m + "</span>";
    });
    return html;
  }
  function formatSQL(sql) {
    var value = String(sql || "").trim(); if (!value) return "";
    value = value.replace(/\s+/g, " ");
    value = value.replace(/\s+(FROM|WHERE|GROUP BY|ORDER BY|LIMIT|HAVING)\b/gi, "\n$1");
    value = value.replace(/\s+(LEFT JOIN|RIGHT JOIN|INNER JOIN|JOIN)\b/gi, "\n$1");
    value = value.replace(/\s+(AND|OR)\b/gi, "\n  $1");
    value = value.replace(/,\s*/g, ",\n       ");
    value = value.replace(/\n\s*(FROM|WHERE|GROUP BY|ORDER BY|LIMIT|HAVING|LEFT JOIN|RIGHT JOIN|INNER JOIN|JOIN)\b/gi, function (_, kw) { return "\n" + kw.toUpperCase(); });
    return value;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
