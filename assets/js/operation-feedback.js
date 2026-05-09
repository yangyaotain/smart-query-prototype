(function () {
  var PAGE_SIZE_OPTIONS = [5, 10, 20];
  var RESULT_LABEL = { sql: "修正 SQL", metric: "沉淀指标", reply: "回复用户" };
  var TYPE_CLASS = {
    "数据不准确": "data",
    "SQL 执行失败": "sql",
    "结论不合理": "reason",
    "指标缺失": "metric",
    "图表不合适": "chart"
  };

  var DATA_SOURCE_TREE = [
    {
      id: "d_sales", name: "销售域", children: [
        { id: "ds_sales", name: "销售业务库", type: "MySQL" },
        { id: "ds_order_svc", name: "订单服务库", type: "MySQL" }
      ]
    },
    {
      id: "d_customer", name: "客户域", children: [
        { id: "ds_cdw", name: "客户数据仓库", type: "PostgreSQL" },
        { id: "ds_crm", name: "CRM 业务库", type: "PostgreSQL" }
      ]
    },
    {
      id: "d_inventory", name: "库存域", children: [
        { id: "ds_inventory", name: "库存分析库", type: "Oracle" }
      ]
    },
    {
      id: "d_finance", name: "财务域", children: [
        { id: "ds_finance", name: "财务核算库", type: "SQLServer" }
      ]
    },
    {
      id: "d_ops", name: "运营域", children: [
        { id: "ds_realtime", name: "实时分析库", type: "ClickHouse" },
        { id: "ds_metric", name: "运营指标库", type: "ClickHouse" }
      ]
    }
  ];

  var TABLES_BY_SRC = {
    ds_metric: [
      "non_bidding_project_info",
      "non_bidding_fee_detail",
      "bidding_project_info",
      "platform_service_fee_detail",
      "ca_fee_detail",
      "ecommerce_trade_detail"
    ],
    ds_sales: ["sales_order", "sales_order_item", "customer", "product", "channel"],
    ds_order_svc: ["order_pay", "order_refund", "pay_channel_dim"],
    ds_cdw: ["customer_master", "customer_tag", "customer_segment"],
    ds_crm: ["crm_lead", "crm_account", "crm_activity"],
    ds_inventory: ["inventory_log", "inventory_snapshot", "warehouse_dim", "sku_dim"],
    ds_finance: ["ar_master", "ap_master", "gl_detail"],
    ds_realtime: ["event_track", "page_view_daily", "campaign_dim"]
  };

  var FIELDS_BY_TABLE = {
    non_bidding_project_info: ["deal_amount_10k_yuan", "deal_notice_sent_date", "procurement_method", "project_name", "project_code"],
    non_bidding_fee_detail: ["service_fee_amount", "service_fee_payment_time", "procurement_method", "project_id"],
    bidding_project_info: ["bidding_amount", "bidding_method", "service_fee_collection_time", "project_id"],
    platform_service_fee_detail: ["service_fee_amount", "service_fee_collection_time", "project_id"],
    ca_fee_detail: ["ca_fee_amount", "payment_time", "cert_type"],
    ecommerce_trade_detail: ["trade_amount", "acceptance_time", "category"],
    sales_order: ["order_id", "sales_amount", "order_date", "customer_id", "channel_id"],
    sales_order_item: ["order_id", "product_id", "quantity", "price"],
    customer: ["customer_id", "customer_name", "register_date"],
    product: ["product_id", "product_name", "category"],
    channel: ["channel_id", "channel_name"],
    customer_master: ["customer_id", "customer_name", "level"],
    customer_tag: ["customer_id", "tag"],
    customer_segment: ["customer_id", "segment"],
    ar_master: ["ar_id", "amount", "due_date"],
    ap_master: ["ap_id", "amount", "due_date"],
    gl_detail: ["account_id", "amount", "period"],
    order_pay: ["pay_id", "order_id", "pay_amount", "pay_time", "pay_channel"],
    order_refund: ["refund_id", "order_id", "refund_amount", "refund_time"],
    pay_channel_dim: ["channel_id", "channel_name", "channel_type"],
    crm_lead: ["lead_id", "source", "owner_id", "created_at"],
    crm_account: ["account_id", "account_name", "industry", "region"],
    crm_activity: ["activity_id", "account_id", "activity_type", "activity_time"],
    inventory_log: ["log_id", "sku_id", "warehouse_id", "qty", "created_time"],
    inventory_snapshot: ["sku_id", "warehouse_id", "stock_qty", "snapshot_date"],
    warehouse_dim: ["warehouse_id", "warehouse_name", "city"],
    sku_dim: ["sku_id", "sku_name", "category"],
    event_track: ["event_id", "user_id", "event_name", "event_time"],
    page_view_daily: ["page_id", "visit_count", "biz_date"],
    campaign_dim: ["campaign_id", "campaign_name", "start_date"]
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
    sqlTheme: "light",
    drawer: { mode: null, item: null, draft: null }
  };

  var pendingItems = [
    {
      id: "fb001",
      question: "近 6 个月华东区销售额趋势为什么和看板不一致？",
      type: "数据不准确",
      desc: "问数结果里 4 月销售额明显偏低，看板中同口径数据没有下降。",
      reporter: "张三 / 销售运营部",
      createdAt: "2026-05-09 09:32",
      sql: "SELECT DATE_FORMAT(order_date, '%Y-%m') AS month,\n       SUM(pay_amount) AS sales_amount\nFROM sales_order\nWHERE region = '华东'\n  AND order_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)\nGROUP BY DATE_FORMAT(order_date, '%Y-%m')\nORDER BY month;",
      suggestedMechanism: "sql"
    },
    {
      id: "fb002",
      question: "客户复购率下降原因能不能直接看到？",
      type: "指标缺失",
      desc: "当前只能查订单数，复购率没有标准指标，业务需要按区域和客户等级拆分。",
      reporter: "李四 / 客户成功部",
      createdAt: "2026-05-09 10:18",
      sql: "SELECT customer_level,\n       COUNT(DISTINCT customer_id) AS customer_cnt,\n       COUNT(order_id) AS order_cnt\nFROM sales_order\nWHERE order_date >= '2026-01-01'\nGROUP BY customer_level;",
      suggestedMechanism: "metric"
    },
    {
      id: "fb003",
      question: "库存周转偏慢产品有哪些？",
      type: "结论不合理",
      desc: "系统回答只给了 SKU 列表，没有说明偏慢阈值，业务看不出判断依据。",
      reporter: "王五 / 供应链部",
      createdAt: "2026-05-08 17:46",
      sql: "SELECT sku_name,\n       AVG(stock_days) AS avg_stock_days\nFROM inventory_snapshot\nWHERE snapshot_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)\nGROUP BY sku_name\nORDER BY avg_stock_days DESC\nLIMIT 20;",
      suggestedMechanism: "reply"
    },
    {
      id: "fb004",
      question: "渠道转化率对比的图表不适合展示趋势",
      type: "图表不合适",
      desc: "结果用了饼图，想看各渠道近 8 周转化率变化。",
      reporter: "赵六 / 市场部",
      createdAt: "2026-05-08 15:21",
      sql: "SELECT channel,\n       COUNT(DISTINCT user_id) AS visit_users,\n       COUNT(DISTINCT buyer_id) AS buyers\nFROM channel_funnel\nWHERE event_date >= DATE_SUB(CURDATE(), INTERVAL 8 WEEK)\nGROUP BY channel;",
      suggestedMechanism: "sql"
    },
    {
      id: "fb005",
      question: "SQL 执行失败，提示 amount 字段不存在",
      type: "SQL 执行失败",
      desc: "用户问题是“本周 GMV”，后台生成 SQL 使用了旧字段 amount。",
      reporter: "钱七 / 数据运营部",
      createdAt: "2026-05-08 11:05",
      sql: "SELECT SUM(amount) AS gmv\nFROM trade_order\nWHERE paid_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY);",
      suggestedMechanism: "sql"
    },
    {
      id: "fb006",
      question: "新增客单价指标后问数可以直接识别吗？",
      type: "指标缺失",
      desc: "业务频繁问客单价，希望沉淀为标准衍生指标。",
      reporter: "孙八 / 电商运营部",
      createdAt: "2026-05-07 18:24",
      sql: "SELECT SUM(pay_amount) / COUNT(DISTINCT order_id) AS avg_order_value\nFROM sales_order\nWHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY);",
      suggestedMechanism: "metric"
    }
  ];

  var processedItems = [
    {
      id: "fb101",
      question: "华南区成交客户数为什么比 CRM 少？",
      type: "数据不准确",
      desc: "问数口径没有包含线下导入客户。",
      reporter: "周九 / 华南销售部",
      processor: "张三 / 运营管理员",
      createdAt: "2026-05-06 14:18",
      processedAt: "2026-05-06 16:03",
      sql: "SELECT COUNT(DISTINCT customer_id) AS deal_customers\nFROM sales_order\nWHERE region = '华南'\n  AND paid_status = 'paid';",
      result: "sql",
      detail: {
        correctedSql: "SELECT COUNT(DISTINCT customer_id) AS deal_customers\nFROM customer_deal_fact\nWHERE region = '华南'\n  AND deal_status = '成交'\n  AND source IN ('线上订单', '线下导入');"
      }
    },
    {
      id: "fb102",
      question: "服务费回款率能否作为常用指标？",
      type: "指标缺失",
      desc: "财务月报每月都需要查询服务费回款率。",
      reporter: "郑十 / 财务部",
      processor: "李四 / 运营管理员",
      createdAt: "2026-05-05 10:44",
      processedAt: "2026-05-05 15:12",
      sql: "SELECT SUM(received_fee) / SUM(payable_fee) AS collection_rate\nFROM platform_service_fee_detail;",
      result: "metric",
      detail: {
        metricName: "服务费回款率",
        metricType: "衍生指标",
        theme: "财务分析",
        dataSource: "运营指标库 / ClickHouse",
        formula: "已回款服务费 / 应回款服务费",
        desc: "衡量平台服务费在统计周期内的实际回款完成情况。"
      }
    },
    {
      id: "fb103",
      question: "为什么没有展示同比？",
      type: "结论不合理",
      desc: "用户问题未明确要求同比，但希望知道本次结果缺少同比的原因。",
      reporter: "吴一 / 经营分析部",
      processor: "王五 / 运营管理员",
      createdAt: "2026-05-04 16:08",
      processedAt: "2026-05-04 16:40",
      sql: "SELECT month, SUM(sales_amount) AS sales_amount\nFROM monthly_sales\nGROUP BY month;",
      result: "reply",
      detail: {
        reply: "本次问题未包含同比维度，系统默认返回近周期趋势。后续可直接提问“销售额趋势及同比变化”，系统会同时返回同比指标。"
      }
    }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHTML(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function attr(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function flattenSourceTree() {
    var arr = [];
    DATA_SOURCE_TREE.forEach(function (domain) {
      (domain.children || []).forEach(function (source) {
        arr.push({
          id: source.id,
          name: source.name,
          type: source.type,
          domainId: domain.id,
          domainName: domain.name
        });
      });
    });
    return arr;
  }

  function findSourceInTree(id) {
    for (var i = 0; i < DATA_SOURCE_TREE.length; i++) {
      var domain = DATA_SOURCE_TREE[i];
      var sources = domain.children || [];
      for (var j = 0; j < sources.length; j++) {
        if (sources[j].id === id) return { domain: domain, source: sources[j] };
      }
    }
    return null;
  }

  function dsName(id) {
    for (var i = 0; i < DATA_SOURCES.length; i++) {
      if (DATA_SOURCES[i].id === id) return DATA_SOURCES[i].name;
    }
    return "";
  }

  function dsPathName(id) {
    var found = findSourceInTree(id);
    return found ? (found.domain.name + " / " + found.source.name) : dsName(id);
  }

  function typeLabel(type) {
    return type === "atom" ? "原子指标" : type === "derived" ? "衍生指标" : type === "dim" ? "维度" : type || "";
  }

  function newIndicatorDraft() {
    return {
      id: "",
      groupId: "g_revenue_current",
      type: "atom",
      name: "",
      synonyms: "",
      desc: "",
      srcId: DATA_SOURCES[0].id,
      table: "",
      field: "",
      agg: "SUM",
      timeField: "",
      unit: "万元",
      formula: "",
      isTimeDim: false,
      timeTplKey: "",
      timeFormula: "",
      mappings: [],
      filterValues: []
    };
  }

  function init() {
    bindEvents();
    renderAll();
  }

  function bindEvents() {
    var mask = $("ofDrawerMask");
    if (mask) mask.addEventListener("click", closeDrawer);

    document.addEventListener("click", function (event) {
      var tabBtn = event.target.closest(".of-tab");
      if (tabBtn) {
        switchTab(tabBtn.getAttribute("data-tab"));
        return;
      }

      var sourceBtn = event.target.closest('[data-act="toggle-source-tree"]');
      if (sourceBtn) {
        event.stopPropagation();
        toggleSourcePicker(sourceBtn);
        return;
      }

      var domainRow = event.target.closest(".ki-source-tree-row.is-domain");
      if (domainRow) {
        event.stopPropagation();
        var domainNode = domainRow.closest(".ki-source-tree-node");
        if (domainNode) domainNode.classList.toggle("is-collapsed");
        return;
      }

      var sourceRow = event.target.closest(".ki-source-tree-row[data-src-id]");
      if (sourceRow && state.drawer.draft && state.drawer.draft.metric) {
        event.stopPropagation();
        selectMetricSource(sourceRow.getAttribute("data-src-id"));
        return;
      }

      var chip = event.target.closest(".ki-chip");
      if (chip && state.drawer.draft && state.drawer.draft.metric) {
        if (chip.hasAttribute("data-unit")) {
          state.drawer.draft.metric.unit = chip.getAttribute("data-unit");
          renderDrawer();
        } else if (chip.hasAttribute("data-tpl")) {
          setTimeTemplate(chip.getAttribute("data-tpl"));
        }
        return;
      }

      var action = event.target.closest("[data-act]");
      if (!action) return;
      var act = action.getAttribute("data-act");

      if (act === "search") {
        state.page[state.activeTab] = 1;
        renderAll();
      } else if (act === "reset-filter") {
        resetFilter(state.activeTab);
      } else if (act === "process") {
        openProcess(action.getAttribute("data-id"));
      } else if (act === "view") {
        openView(action.getAttribute("data-id"));
      } else if (act === "close-drawer" || act === "cancel") {
        closeDrawer();
      } else if (act === "set-mechanism") {
        setMechanism(action.getAttribute("data-value"));
      } else if (act === "confirm-process") {
        confirmProcess();
      } else if (act === "pg-prev") {
        turnPage(-1);
      } else if (act === "pg-next") {
        turnPage(1);
      } else if (act === "pg-page") {
        state.page[state.activeTab] = Number(action.getAttribute("data-page")) || 1;
        renderAll();
      } else if (act === "toggle-sql-theme") {
        toggleSqlTheme();
      } else if (act === "format-sql") {
        formatDrawerSQL(action);
      } else if (act === "add-mapping") {
        addMapping();
      } else if (act === "add-filter") {
        addFilter();
      } else if (act === "del-mapping") {
        var rowM = action.closest(".ki-row-grid");
        if (rowM) delMapping(parseInt(rowM.getAttribute("data-idx"), 10));
      } else if (act === "del-filter") {
        var rowF = action.closest(".ki-row-grid");
        if (rowF) delFilter(parseInt(rowF.getAttribute("data-idx"), 10));
      }
    });

    document.addEventListener("input", function (event) {
      var target = event.target;
      if (target.matches(".of-filter input")) {
        state.page[state.activeTab] = 1;
      }
      if (target.hasAttribute("data-field") || target.hasAttribute("data-metric") || target.hasAttribute("data-bind") || target.hasAttribute("data-row-bind")) {
        updateDraft(target);
      }
      if (target.classList.contains("ke-sql-input")) {
        syncSqlEditor(target);
      }
      if (target.getAttribute("data-field") === "reply") {
        renderReplyCount(target.value.length);
      }
    });

    document.addEventListener("change", function (event) {
      var target = event.target;
      if (target.matches(".of-filter select")) {
        state.page[state.activeTab] = 1;
      }
      if (target.hasAttribute("data-field") || target.hasAttribute("data-metric") || target.hasAttribute("data-bind") || target.hasAttribute("data-row-bind")) {
        updateDraft(target);
      }
      if (target.id === "ofPageSize") {
        state.pageSize[state.activeTab] = Number(target.value) || 5;
        state.page[state.activeTab] = 1;
        renderAll();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeDrawer();
      if (event.key === "Enter" && event.target.closest(".of-filter")) {
        state.page[state.activeTab] = 1;
        renderAll();
      }
    });

    bindDrawerResize();
  }

  function bindDrawerResize() {
    var handle = $("ofDrawerResize");
    var drawer = $("ofDrawer");
    if (!handle || !drawer) return;
    var resizing = false;
    handle.addEventListener("mousedown", function () {
      resizing = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    });
    document.addEventListener("mousemove", function (event) {
      if (!resizing) return;
      var nextWidth = Math.min(Math.max(window.innerWidth - event.clientX, 480), window.innerWidth * 0.9);
      drawer.style.width = nextWidth + "px";
    });
    document.addEventListener("mouseup", function () {
      if (!resizing) return;
      resizing = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    });
  }

  function switchTab(tab) {
    if (!tab || tab === state.activeTab) return;
    state.activeTab = tab;
    state.page[tab] = 1;
    renderAll();
  }

  function resetFilter(tab) {
    var ids = tab === "pending"
      ? ["ofPendingQuestion", "ofPendingType", "ofPendingReporter"]
      : ["ofProcessedQuestion", "ofProcessedType", "ofProcessedResult", "ofProcessedReporter"];
    ids.forEach(function (id) {
      var el = $(id);
      if (el) el.value = "";
    });
    state.page[tab] = 1;
    renderAll();
  }

  function renderAll() {
    renderCounts();
    renderTabs();
    renderFilters();
    renderTable();
  }

  function renderCounts() {
    $("ofPendingCount").textContent = pendingItems.length;
    $("ofProcessedCount").textContent = processedItems.length;
    $("ofPendingBadge").textContent = pendingItems.length;
    $("ofProcessedBadge").textContent = processedItems.length;
  }

  function renderTabs() {
    document.querySelectorAll(".of-tab").forEach(function (btn) {
      var active = btn.getAttribute("data-tab") === state.activeTab;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function renderFilters() {
    $("ofPendingFilter").classList.toggle("hidden", state.activeTab !== "pending");
    $("ofProcessedFilter").classList.toggle("hidden", state.activeTab !== "processed");
  }

  function getFilteredItems(tab) {
    if (tab === "pending") {
      var q = ($("ofPendingQuestion").value || "").trim();
      var type = $("ofPendingType").value;
      var reporter = ($("ofPendingReporter").value || "").trim();
      return pendingItems.filter(function (it) {
        return matchesText(it.question, q)
          && (!type || it.type === type)
          && matchesText(it.reporter, reporter);
      });
    }
    var pq = ($("ofProcessedQuestion").value || "").trim();
    var pt = $("ofProcessedType").value;
    var pr = $("ofProcessedResult").value;
    var pp = ($("ofProcessedReporter").value || "").trim();
    return processedItems.filter(function (it) {
      return matchesText(it.question, pq)
        && (!pt || it.type === pt)
        && (!pr || it.result === pr)
        && matchesText(it.reporter, pp);
    });
  }

  function matchesText(value, keyword) {
    if (!keyword) return true;
    return String(value || "").toLowerCase().indexOf(keyword.toLowerCase()) > -1;
  }

  function renderTable() {
    var items = getFilteredItems(state.activeTab);
    var size = state.pageSize[state.activeTab];
    var totalPages = Math.max(1, Math.ceil(items.length / size));
    if (state.page[state.activeTab] > totalPages) state.page[state.activeTab] = totalPages;
    var page = state.page[state.activeTab];
    var start = (page - 1) * size;
    var pageItems = items.slice(start, start + size);

    $("ofThead").innerHTML = state.activeTab === "pending" ? pendingHeadHTML() : processedHeadHTML();
    $("ofTbody").innerHTML = pageItems.length
      ? pageItems.map(state.activeTab === "pending" ? pendingRowHTML : processedRowHTML).join("")
      : emptyRowHTML(state.activeTab === "pending" ? 6 : 7);
    renderPager(items.length, page, totalPages, size);
  }

  function pendingHeadHTML() {
    return "<tr>"
      + '<th style="width:25%;">用户问题</th>'
      + '<th style="width:12%;">反馈类型</th>'
      + '<th style="width:24%;">反馈说明</th>'
      + '<th style="width:15%;">提出人</th>'
      + '<th style="width:14%;">提出时间</th>'
      + '<th style="width:10%;">操作</th>'
      + "</tr>";
  }

  function processedHeadHTML() {
    return "<tr>"
      + '<th style="width:21%;">用户问题</th>'
      + '<th style="width:11%;">反馈类型</th>'
      + '<th style="width:19%;">反馈说明</th>'
      + '<th style="width:11%;">处理结果</th>'
      + '<th style="width:15%;">提出/处理人</th>'
      + '<th style="width:15%;">提出/处理时间</th>'
      + '<th style="width:8%;">操作</th>'
      + "</tr>";
  }

  function pendingRowHTML(it) {
    return "<tr>"
      + '<td><span class="of-main-text of-clip" title="' + attr(it.question) + '">' + escapeHTML(it.question) + "</span></td>"
      + "<td>" + typeTag(it.type) + "</td>"
      + '<td><span class="of-muted-text of-clip" title="' + attr(it.desc) + '">' + escapeHTML(it.desc) + "</span></td>"
      + '<td><span class="of-sub-text">' + escapeHTML(it.reporter) + "</span></td>"
      + '<td><span class="of-sub-text">' + escapeHTML(it.createdAt) + "</span></td>"
      + '<td><button type="button" class="of-action-btn" data-act="process" data-id="' + attr(it.id) + '">处理</button></td>'
      + "</tr>";
  }

  function processedRowHTML(it) {
    return "<tr>"
      + '<td><span class="of-main-text of-clip" title="' + attr(it.question) + '">' + escapeHTML(it.question) + "</span></td>"
      + "<td>" + typeTag(it.type) + "</td>"
      + '<td><span class="of-muted-text of-clip" title="' + attr(it.desc) + '">' + escapeHTML(it.desc) + "</span></td>"
      + "<td>" + resultTag(it.result) + "</td>"
      + '<td><span class="of-sub-text">提：' + escapeHTML(it.reporter) + '</span><span class="of-sub-text">处：' + escapeHTML(it.processor) + "</span></td>"
      + '<td><span class="of-sub-text">提：' + escapeHTML(it.createdAt) + '</span><span class="of-sub-text">处：' + escapeHTML(it.processedAt) + "</span></td>"
      + '<td><button type="button" class="of-action-btn" data-act="view" data-id="' + attr(it.id) + '">查看</button></td>'
      + "</tr>";
  }

  function emptyRowHTML(colspan) {
    return '<tr><td class="of-empty" colspan="' + colspan + '">暂无匹配的反馈记录</td></tr>';
  }

  function typeTag(type) {
    var cls = TYPE_CLASS[type] || "data";
    return '<span class="of-tag is-' + cls + '">' + escapeHTML(type) + "</span>";
  }

  function resultTag(result) {
    return '<span class="of-result is-' + attr(result) + '">' + escapeHTML(RESULT_LABEL[result] || result) + "</span>";
  }

  function renderPager(total, page, totalPages, size) {
    var start = total ? (page - 1) * size + 1 : 0;
    var end = Math.min(page * size, total);
    var pages = "";
    for (var i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
        pages += '<button type="button" data-act="pg-page" data-page="' + i + '" class="' + (i === page ? "is-current" : "") + '">' + i + "</button>";
      } else if (pages.slice(-8) !== "...</span>") {
        pages += '<span style="padding:0 4px;">...</span>';
      }
    }
    $("ofPager").innerHTML = ''
      + '<div class="ki-pg-info">共 ' + total + ' 条，当前 ' + start + '-' + end + ' 条</div>'
      + '<div class="ki-pg-buttons">'
      + '<select class="ki-pg-size" id="ofPageSize">' + PAGE_SIZE_OPTIONS.map(function (opt) {
        return '<option value="' + opt + '"' + (opt === size ? " selected" : "") + ">" + opt + " 条/页</option>";
      }).join("") + "</select>"
      + '<button type="button" data-act="pg-prev"' + (page <= 1 ? " disabled" : "") + ">上一页</button>"
      + pages
      + '<button type="button" data-act="pg-next"' + (page >= totalPages ? " disabled" : "") + ">下一页</button>"
      + "</div>";
  }

  function turnPage(delta) {
    var items = getFilteredItems(state.activeTab);
    var totalPages = Math.max(1, Math.ceil(items.length / state.pageSize[state.activeTab]));
    var next = Math.min(Math.max(state.page[state.activeTab] + delta, 1), totalPages);
    if (next === state.page[state.activeTab]) return;
    state.page[state.activeTab] = next;
    renderAll();
  }

  function openProcess(id) {
    var item = pendingItems.find(function (it) { return it.id === id; });
    if (!item) return;
    state.drawer = {
      mode: "process",
      item: item,
      draft: {
        mechanism: item.suggestedMechanism || "sql",
        correctedSql: item.sql || "",
        metric: newIndicatorDraft(),
        reply: ""
      }
    };
    renderDrawer();
    showDrawer();
  }

  function openView(id) {
    var item = processedItems.find(function (it) { return it.id === id; });
    if (!item) return;
    state.drawer = { mode: "view", item: item, draft: clone(item.detail || {}) };
    renderDrawer();
    showDrawer();
  }

  function showDrawer() {
    $("ofDrawerMask").classList.remove("hidden");
    $("ofDrawer").classList.remove("hidden");
    $("ofDrawer").setAttribute("aria-hidden", "false");
    var input = $("ofDrawer").querySelector("input, textarea, select, button");
    if (input) input.focus();
  }

  function closeDrawer() {
    $("ofDrawerMask").classList.add("hidden");
    $("ofDrawer").classList.add("hidden");
    $("ofDrawer").setAttribute("aria-hidden", "true");
    state.drawer = { mode: null, item: null, draft: null };
  }

  function renderDrawer() {
    var item = state.drawer.item;
    var mode = state.drawer.mode;
    var chip = $("ofDrawerChip");
    if (mode === "process") {
      $("ofDrawerTitle").textContent = "处理反馈";
      $("ofDrawerSubtitle").textContent = "选择处理机制并完成本次运营动作";
      chip.textContent = "处理模式";
      chip.className = "ki-mode-chip is-edit";
      $("ofDrawerBody").innerHTML = baseInfoHTML(item) + processBodyHTML();
      $("ofDrawerFoot").innerHTML = '<button type="button" class="ghost-btn" data-act="cancel">取消</button>'
        + '<button type="button" class="primary-btn" data-act="confirm-process">确定</button>';
      syncAllSqlEditors();
      if (state.drawer.draft.mechanism === "reply") renderReplyCount(state.drawer.draft.reply.length);
    } else {
      $("ofDrawerTitle").textContent = "查看处理结果";
      $("ofDrawerSubtitle").textContent = "根据处理结果展示对应内容";
      chip.textContent = "查看模式";
      chip.className = "ki-mode-chip";
      $("ofDrawerBody").innerHTML = baseInfoHTML(item) + viewResultHTML(item);
      $("ofDrawerFoot").innerHTML = '<button type="button" class="ghost-btn" data-act="close-drawer">关闭</button>';
    }
  }

  function baseInfoHTML(item) {
    return '<div class="of-info-grid">'
      + infoCell("用户问题", item.question, true)
      + infoCell("执行 SQL", sqlEditor("originalSql", item.sql || "", true), true, true)
      + infoCell("反馈类型", typeTag(item.type), false, true)
      + infoCell("提出人", item.reporter)
      + infoCell("提出时间", item.createdAt)
      + infoCell("反馈说明", item.desc, true)
      + "</div>";
  }

  function infoCell(label, value, full, raw) {
    return '<div class="of-info-card' + (full ? " full" : "") + '">'
      + '<div class="of-label">' + escapeHTML(label) + "</div>"
      + '<div class="of-value">' + (raw ? value : escapeHTML(value || "—")) + "</div>"
      + "</div>";
  }

  function processBodyHTML() {
    var draft = state.drawer.draft;
    return '<div class="of-section-title"><h4>处理机制</h4></div>'
      + '<div class="of-segment">'
      + mechanismButton("sql", "修正 SQL", draft.mechanism)
      + mechanismButton("metric", "沉淀指标", draft.mechanism)
      + mechanismButton("reply", "回复用户", draft.mechanism)
      + "</div>"
      + mechanismFormHTML(draft);
  }

  function mechanismButton(value, label, active) {
    return '<button type="button" data-act="set-mechanism" data-value="' + value + '" class="' + (value === active ? "is-active" : "") + '">' + label + "</button>";
  }

  function mechanismFormHTML(draft) {
    if (draft.mechanism === "sql") {
      return '<div class="of-form-section full">'
        + sqlEditor("correctedSql", draft.correctedSql)
        + "</div>";
    }
    if (draft.mechanism === "metric") {
      return metricFormHTML(draft.metric);
    }
    return '<div class="of-form-section full">'
      + '<div class="of-form-row full">'
      + '<textarea class="of-textarea" data-field="reply" maxlength="500" rows="8" placeholder="请输入给用户的回复，500 字以内">' + escapeHTML(draft.reply || "") + "</textarea>"
      + '<div class="of-char-count" id="ofReplyCount">0/500</div>'
      + "</div>"
      + "</div>";
  }

  function metricFormHTML(m) {
    return '<div class="of-form-section full of-indicator-form">' + renderIndicatorFormBody(m) + "</div>";
  }

  function sourceTreeHTML(selectedId) {
    return DATA_SOURCE_TREE.map(function (domain) {
      var sources = domain.children || [];
      var hasSelected = sources.some(function (s) { return s.id === selectedId; });
      var sourceHTML = sources.map(function (s) {
        var active = s.id === selectedId ? " is-active" : "";
        return ""
          + '<div class="ki-source-tree-node is-leaf">'
          +   '<button type="button" class="ki-source-tree-row' + active + '" data-src-id="' + attr(s.id) + '">'
          +     '<span class="ki-source-tree-toggle is-empty"></span>'
          +     '<span class="ki-source-tree-icon is-source">'
          +       '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5V12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5.5"/><path d="M5 12v6.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V12"/></svg>'
          +     "</span>"
          +     '<span class="ki-source-tree-name">' + escapeHTML(s.name) + "</span>"
          +     '<span class="ki-source-tree-meta">' + escapeHTML(s.type || "") + "</span>"
          +   "</button>"
          + "</div>";
      }).join("");
      return ""
        + '<div class="ki-source-tree-node' + (hasSelected ? "" : " is-collapsed") + '" data-domain-id="' + attr(domain.id) + '">'
        +   '<button type="button" class="ki-source-tree-row is-domain" data-domain-id="' + attr(domain.id) + '">'
        +     '<span class="ki-source-tree-toggle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>'
        +     '<span class="ki-source-tree-icon">'
        +       '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/></svg>'
        +     "</span>"
        +     '<span class="ki-source-tree-name">' + escapeHTML(domain.name) + "</span>"
        +     '<span class="ki-source-tree-meta">' + sources.length + "</span>"
        +   "</button>"
        +   '<div class="ki-source-tree-children">' + sourceHTML + "</div>"
        + "</div>";
    }).join("");
  }

  function sourcePickerHTML(selectedId) {
    var label = dsPathName(selectedId);
    return ""
      + '<div class="ki-source-picker" data-role="source-picker">'
      +   '<button type="button" class="ki-source-picker-btn" data-act="toggle-source-tree" aria-haspopup="tree" aria-expanded="false">'
      +     '<span class="ki-source-picker-text' + (label ? "" : " is-placeholder") + '">' + escapeHTML(label || "请选择数据源") + "</span>"
      +     '<span class="ki-source-picker-arrow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>'
      +   "</button>"
      +   '<div class="ki-source-tree-pop" role="tree">' + sourceTreeHTML(selectedId) + "</div>"
      + "</div>";
  }

  function tableOptions(srcId, selected) {
    var arr = TABLES_BY_SRC[srcId] || [];
    return ['<option value="">请选择</option>'].concat(arr.map(function (t) {
      return '<option value="' + attr(t) + '"' + (t === selected ? " selected" : "") + ">" + escapeHTML(t) + "</option>";
    })).join("");
  }

  function fieldOptions(table, selected, includeEmpty) {
    var arr = FIELDS_BY_TABLE[table] || [];
    var head = includeEmpty ? '<option value="">请选择</option>' : "";
    return [head].concat(arr.map(function (f) {
      return '<option value="' + attr(f) + '"' + (f === selected ? " selected" : "") + ">" + escapeHTML(f) + "</option>";
    })).join("");
  }

  function aggOptions(selected) {
    return AGG_OPTIONS.map(function (a) {
      return '<option value="' + attr(a) + '"' + (a === selected ? " selected" : "") + ">" + escapeHTML(a) + "</option>";
    }).join("");
  }

  function unitChipsHTML(selected) {
    return UNIT_PRESETS.map(function (u) {
      return '<span class="ki-chip' + (selected === u ? " is-checked" : "") + '" data-unit="' + attr(u) + '">' + escapeHTML(u) + "</span>";
    }).join("");
  }

  function tplChipsHTML(selectedKey) {
    return TIME_TPL_PRESETS.map(function (t) {
      return '<span class="ki-chip' + (selectedKey === t.key ? " is-checked" : "") + '" data-tpl="' + attr(t.key) + '">' + escapeHTML(t.key) + "</span>";
    }).join("");
  }

  function renderIndicatorFormBody(d) {
    var common = ""
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">数据源</label>'
      +   sourcePickerHTML(d.srcId)
      + "</div>"
      + '<div class="ki-form-grid">'
      +   '<div class="ki-form-row">'
      +     '<label class="ki-form-label">名称</label>'
      +     '<input class="ki-input" data-bind="name" maxlength="40" value="' + attr(d.name) + '" />'
      +   "</div>"
      +   '<div class="ki-form-row">'
      +     '<label class="ki-form-label">类型</label>'
      +     '<select class="ki-select-form" data-bind="type">'
      +       '<option value="atom"' + (d.type === "atom" ? " selected" : "") + ">原子指标</option>"
      +       '<option value="derived"' + (d.type === "derived" ? " selected" : "") + ">衍生指标</option>"
      +       '<option value="dim"' + (d.type === "dim" ? " selected" : "") + ">维度</option>"
      +     "</select>"
      +   "</div>"
      + "</div>"
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">同义词</label>'
      +   '<input class="ki-input" data-bind="synonyms" placeholder="多个同义词用英文逗号分隔" value="' + attr(d.synonyms) + '" />'
      + "</div>"
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">描述</label>'
      +   '<textarea class="ki-textarea" data-bind="desc" maxlength="500" rows="4">' + escapeHTML(d.desc) + "</textarea>"
      + "</div>";

    var typeBlock = "";
    if (d.type === "atom") typeBlock = renderAtomBlock(d);
    else if (d.type === "derived") typeBlock = renderDerivedBlock(d);
    else typeBlock = renderDimBlock(d);

    return common + typeBlock;
  }

  function renderAtomBlock(d) {
    return ""
      + '<div class="ki-form-grid">'
      +   '<div class="ki-form-row">'
      +     '<label class="ki-form-label">物理表名</label>'
      +     '<select class="ki-select-form" data-bind="table">' + tableOptions(d.srcId, d.table) + "</select>"
      +   "</div>"
      +   '<div class="ki-form-row">'
      +     '<label class="ki-form-label">物理字段名</label>'
      +     '<select class="ki-select-form" data-bind="field">' + fieldOptions(d.table, d.field, true) + "</select>"
      +   "</div>"
      + "</div>"
      + '<div class="ki-form-grid">'
      +   '<div class="ki-form-row">'
      +     '<label class="ki-form-label">聚合方式</label>'
      +     '<select class="ki-select-form" data-bind="agg">' + aggOptions(d.agg) + "</select>"
      +   "</div>"
      +   '<div class="ki-form-row">'
      +     '<label class="ki-form-label">时间字段（兜底）<span class="ki-form-tip" title="该字段用于在没有显式时间维度时兜底过滤">?</span></label>'
      +     '<select class="ki-select-form" data-bind="timeField">' + fieldOptions(d.table, d.timeField, true) + "</select>"
      +   "</div>"
      + "</div>"
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">单位<span class="ki-form-tip" title="可点选预设，也可在下方文本框自定义">?</span></label>'
      +   '<div class="ki-unit-chips" data-role="unit-chips">' + unitChipsHTML(d.unit) + "</div>"
      +   '<input class="ki-input" data-bind="unit" maxlength="20" value="' + attr(d.unit || "") + '" placeholder="自定义单位" />'
      + "</div>";
  }

  function renderDerivedBlock(d) {
    return ""
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">计算公式</label>'
      +   '<textarea class="ki-textarea" data-bind="formula" rows="3" placeholder="例：销售额 / 订单量">' + escapeHTML(d.formula || "") + "</textarea>"
      +   '<div class="ki-form-hint">公式中的标识符必须是系统中已定义的原子指标名</div>'
      + "</div>"
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">单位</label>'
      +   '<div class="ki-unit-chips" data-role="unit-chips">' + unitChipsHTML(d.unit) + "</div>"
      +   '<input class="ki-input" data-bind="unit" maxlength="20" value="' + attr(d.unit || "") + '" placeholder="自定义单位" />'
      + "</div>";
  }

  function renderDimBlock(d) {
    var html = ""
      + '<div class="ki-form-row">'
      +   '<label class="ki-checkbox">'
      +     '<input type="checkbox" data-bind="isTimeDim"' + (d.isTimeDim ? " checked" : "") + " /> 是否时间维度"
      +     '<span class="ki-form-tip" title="勾选后将出现时间函数模板配置">?</span>'
      +   "</label>"
      + "</div>";

    if (d.isTimeDim) {
      html += ""
        + '<div class="ki-form-row">'
        +   '<label class="ki-form-label">时间函数模板<span class="ki-form-tip" title="选择预设可填充公式模板">?</span></label>'
        +   '<div class="ki-tpl-chips" data-role="tpl-chips">' + tplChipsHTML(d.timeTplKey) + "</div>"
        +   '<input class="ki-input" data-bind="timeFormula" placeholder="时间函数公式" value="' + attr(d.timeFormula || "") + '" />'
        + "</div>";
    }

    html += ""
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">关联表字段<span class="ki-form-tip" title="一个维度可以关联多张表的同一含义字段">?</span></label>'
      +   '<div class="ki-rows" data-role="mapping-rows">' + mappingRowsHTML(d) + "</div>"
      +   '<button type="button" class="ki-add-row" data-act="add-mapping" style="margin-top:8px;">'
      +     '<svg viewBox="0 0 24 24" width="12" height="12" style="fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;"><path d="M12 5v14"/><path d="M5 12h14"/></svg>'
      +     "添加关联"
      +   "</button>"
      + "</div>";

    html += ""
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">过滤值映射</label>'
      +   '<div class="ki-rows" data-role="filter-rows">' + filterRowsHTML(d) + "</div>"
      +   '<button type="button" class="ki-add-row" data-act="add-filter" style="margin-top:8px;">'
      +     '<svg viewBox="0 0 24 24" width="12" height="12" style="fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;"><path d="M12 5v14"/><path d="M5 12h14"/></svg>'
      +     "添加映射"
      +   "</button>"
      + "</div>";

    return html;
  }

  function mappingRowsHTML(d) {
    var arr = d.mappings || [];
    if (!arr.length) return '<div class="ki-empty-line">暂无关联，可新增。</div>';
    return arr.map(function (m, idx) {
      return ""
        + '<div class="ki-row-grid" data-idx="' + idx + '">'
        +   '<select class="ki-select-form" data-row-bind="table">' + tableOptions(d.srcId, m.table) + "</select>"
        +   '<select class="ki-select-form" data-row-bind="field">' + fieldOptions(m.table, m.field, true) + "</select>"
        +   '<button type="button" class="ki-row-del" data-act="del-mapping">删除</button>'
        + "</div>";
    }).join("");
  }

  function filterRowsHTML(d) {
    var arr = d.filterValues || [];
    if (!arr.length) return '<div class="ki-empty-line">暂无映射，可新增。</div>';
    return arr.map(function (m, idx) {
      return ""
        + '<div class="ki-row-grid" data-idx="' + idx + '">'
        +   '<input class="ki-input" data-row-bind="alias" value="' + attr(m.alias || "") + '" placeholder="别名" />'
        +   '<span class="ki-arrow">→</span>'
        +   '<input class="ki-input" data-row-bind="value" value="' + attr(m.value || "") + '" placeholder="数据库值" />'
        +   '<button type="button" class="ki-row-del" data-act="del-filter">删除</button>'
        + "</div>";
    }).join("");
  }

  function viewResultHTML(item) {
    var detail = item.detail || {};
    if (item.result === "sql") {
      return '<div class="of-section-title"><h4>处理结果</h4>' + resultTag(item.result) + "</div>"
        + '<div class="of-view-result">'
        + sqlEditor("viewSql", detail.correctedSql || "", true) + "</div>";
    }
    if (item.result === "metric") {
      return '<div class="of-section-title"><h4>处理结果</h4>' + resultTag(item.result) + "</div>"
        + '<div class="of-view-result">'
        + '<div class="of-detail-list">'
        + detailCell("指标名称", detail.metricName || detail.name)
        + detailCell("指标类型", detail.metricType || typeLabel(detail.type))
        + detailCell("所属主题", detail.theme || detail.groupId)
        + detailCell("数据源", detail.dataSource || dsPathName(detail.srcId))
        + detailCell("计算公式", detail.formula, true)
        + detailCell("指标描述", detail.desc, true)
        + "</div></div>";
    }
    return '<div class="of-section-title"><h4>处理结果</h4>' + resultTag(item.result) + "</div>"
      + '<div class="of-view-result">'
      + '<div class="of-value">' + escapeHTML(detail.reply || "—") + "</div></div>";
  }

  function detailCell(label, value, full) {
    return '<div class="' + (full ? "full" : "") + '">'
      + '<div class="of-label">' + escapeHTML(label) + "</div>"
      + '<div class="of-value">' + escapeHTML(value || "—") + "</div>"
      + "</div>";
  }

  function setMechanism(value) {
    if (!state.drawer.draft) return;
    state.drawer.draft.mechanism = value;
    renderDrawer();
  }

  function toggleSourcePicker(sourceBtn) {
    var drawer = $("ofDrawer");
    var sourceWrap = sourceBtn.closest(".ki-source-picker");
    if (!drawer || !sourceWrap) return;
    drawer.querySelectorAll(".ki-source-picker.is-open").forEach(function (el) {
      if (el !== sourceWrap) el.classList.remove("is-open");
    });
    var isOpen = !sourceWrap.classList.contains("is-open");
    sourceWrap.classList.toggle("is-open", isOpen);
    sourceBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function selectMetricSource(nextSrcId) {
    var metric = state.drawer.draft && state.drawer.draft.metric;
    if (!metric || metric.srcId === nextSrcId) return;
    metric.srcId = nextSrcId;
    metric.table = "";
    metric.field = "";
    metric.timeField = "";
    metric.mappings = (metric.mappings || []).map(function () { return { table: "", field: "" }; });
    renderDrawer();
  }

  function updateDraft(target) {
    var draft = state.drawer.draft;
    if (!draft) return;
    var field = target.getAttribute("data-field");
    var metric = target.getAttribute("data-metric");
    var bind = target.getAttribute("data-bind");
    var rowBind = target.getAttribute("data-row-bind");
    if (field) draft[field] = target.value;
    if (metric) draft.metric[metric] = target.value;
    if (bind && draft.metric) {
      updateMetricBind(bind, target);
      return;
    }
    if (rowBind && draft.metric) {
      updateMetricRowBind(rowBind, target);
    }
  }

  function updateMetricBind(bind, target) {
    var metric = state.drawer.draft.metric;
    if (target.type === "checkbox") {
      metric[bind] = !!target.checked;
      if (bind === "isTimeDim") renderDrawer();
      return;
    }
    metric[bind] = target.value;
    if (bind === "type") {
      normalizeMetricByType(metric);
      renderDrawer();
      return;
    }
    if (bind === "table") {
      metric.field = "";
      metric.timeField = "";
      renderDrawer();
      return;
    }
    if (bind === "unit") {
      renderDrawer();
    }
  }

  function updateMetricRowBind(rowBind, target) {
    var metric = state.drawer.draft.metric;
    var row = target.closest(".ki-row-grid");
    if (!row) return;
    var idx = parseInt(row.getAttribute("data-idx"), 10);
    var parent = row.parentElement;
    if (!parent || isNaN(idx)) return;
    var role = parent.getAttribute("data-role");
    if (role === "mapping-rows") {
      var mapping = metric.mappings[idx];
      if (!mapping) return;
      mapping[rowBind] = target.value;
      if (rowBind === "table") {
        mapping.field = "";
        renderDrawer();
      }
      return;
    }
    if (role === "filter-rows") {
      var filterValue = metric.filterValues[idx];
      if (filterValue) filterValue[rowBind] = target.value;
    }
  }

  function normalizeMetricByType(metric) {
    if (metric.type === "atom") {
      metric.formula = "";
      metric.isTimeDim = false;
      metric.timeFormula = "";
      metric.timeTplKey = "";
      metric.mappings = [];
      metric.filterValues = [];
      if (!metric.agg) metric.agg = "SUM";
    } else if (metric.type === "derived") {
      metric.table = "";
      metric.field = "";
      metric.agg = "";
      metric.timeField = "";
      metric.isTimeDim = false;
      metric.timeFormula = "";
      metric.timeTplKey = "";
      metric.mappings = [];
      metric.filterValues = [];
    } else {
      metric.formula = "";
      metric.table = "";
      metric.field = "";
      metric.agg = "";
      metric.timeField = "";
      metric.unit = "";
      if (!metric.mappings) metric.mappings = [];
      if (!metric.filterValues) metric.filterValues = [];
    }
  }

  function setTimeTemplate(key) {
    var metric = state.drawer.draft.metric;
    metric.timeTplKey = key;
    for (var i = 0; i < TIME_TPL_PRESETS.length; i++) {
      if (TIME_TPL_PRESETS[i].key === key) {
        metric.timeFormula = TIME_TPL_PRESETS[i].formula;
        break;
      }
    }
    renderDrawer();
  }

  function addMapping() {
    var metric = state.drawer.draft && state.drawer.draft.metric;
    if (!metric) return;
    if (!metric.mappings) metric.mappings = [];
    metric.mappings.push({ table: "", field: "" });
    renderDrawer();
  }

  function delMapping(idx) {
    var metric = state.drawer.draft && state.drawer.draft.metric;
    if (!metric || !metric.mappings || isNaN(idx)) return;
    metric.mappings.splice(idx, 1);
    renderDrawer();
  }

  function addFilter() {
    var metric = state.drawer.draft && state.drawer.draft.metric;
    if (!metric) return;
    if (!metric.filterValues) metric.filterValues = [];
    metric.filterValues.push({ alias: "", value: "" });
    renderDrawer();
  }

  function delFilter(idx) {
    var metric = state.drawer.draft && state.drawer.draft.metric;
    if (!metric || !metric.filterValues || isNaN(idx)) return;
    metric.filterValues.splice(idx, 1);
    renderDrawer();
  }

  function confirmProcess() {
    var item = state.drawer.item;
    var draft = state.drawer.draft;
    if (!item || !draft) return;

    if (draft.mechanism === "sql" && !String(draft.correctedSql || "").trim()) {
      showToast("请填写修正 SQL");
      return;
    }
    if (draft.mechanism === "metric" && !String(draft.metric.name || "").trim()) {
      showToast("请填写指标名称");
      return;
    }
    if (draft.mechanism === "reply" && !String(draft.reply || "").trim()) {
      showToast("请填写回复内容");
      return;
    }

    pendingItems = pendingItems.filter(function (it) { return it.id !== item.id; });
    processedItems.unshift({
      id: item.id,
      question: item.question,
      type: item.type,
      desc: item.desc,
      reporter: item.reporter,
      processor: "张三 / 运营管理员",
      createdAt: item.createdAt,
      processedAt: "2026-05-09 16:30",
      sql: item.sql,
      result: draft.mechanism,
      detail: draft.mechanism === "sql"
        ? { correctedSql: draft.correctedSql }
        : draft.mechanism === "metric"
          ? clone(draft.metric)
          : { reply: draft.reply }
    });
    closeDrawer();
    renderAll();
    showToast("反馈已处理");
  }

  function renderReplyCount(len) {
    var el = $("ofReplyCount");
    if (!el) return;
    el.textContent = len + "/500";
    el.classList.toggle("is-warn", len > 450);
  }

  function sqlEditor(field, value, readonly) {
    var formatted = formatSQL(value || "");
    var lines = Math.max(8, formatted.split("\n").length);
    var nextThemeText = state.sqlTheme === "dark" ? "浅色" : "深色";
    return '<div class="ke-sql-editor is-' + attr(state.sqlTheme) + (readonly ? " is-readonly" : "") + '" data-role="sql-editor">'
      + '<div class="ke-sql-toolbar">'
      + '<span class="ke-sql-dot"></span><span class="ke-sql-dot"></span><span class="ke-sql-dot"></span>'
      + "<strong>SQL Editor</strong>"
      + '<button type="button" class="ke-sql-theme" data-act="toggle-sql-theme">' + nextThemeText + "</button>"
      + '<button type="button" class="ke-sql-format" data-act="format-sql">格式化</button>'
      + "</div>"
      + '<div class="ke-sql-body">'
      + '<div class="ke-sql-lines" aria-hidden="true">' + lineNumbers(lines) + "</div>"
      + '<div class="ke-sql-code">'
      + '<pre class="ke-sql-highlight" aria-hidden="true">' + highlightSQL(formatted) + "</pre>"
      + '<textarea class="ke-sql-input" data-field="' + attr(field) + '" spellcheck="false" rows="' + lines + '"' + (readonly ? " readonly" : "") + ' placeholder="请输入修正 SQL">' + escapeHTML(formatted) + "</textarea>"
      + "</div></div></div>";
  }

  function lineNumbers(count) {
    var html = "";
    for (var i = 1; i <= count; i++) html += "<span>" + i + "</span>";
    return html;
  }

  function toggleSqlTheme() {
    state.sqlTheme = state.sqlTheme === "dark" ? "light" : "dark";
    renderDrawer();
  }

  function formatDrawerSQL(action) {
    var editor = action && action.closest(".ke-sql-editor");
    var inputEl = editor ? editor.querySelector(".ke-sql-input") : $("ofDrawer").querySelector(".ke-sql-input");
    if (!inputEl) return;
    inputEl.value = formatSQL(inputEl.value);
    if (!inputEl.readOnly) updateDraft(inputEl);
    syncSqlEditor(inputEl);
    showToast("SQL 已格式化");
  }

  function syncAllSqlEditors() {
    document.querySelectorAll(".ke-sql-input").forEach(syncSqlEditor);
  }

  function syncSqlEditor(inputEl) {
    var editor = inputEl.closest(".ke-sql-editor");
    if (!editor) return;
    var lines = Math.max(8, inputEl.value.split("\n").length);
    var lineEl = editor.querySelector(".ke-sql-lines");
    var high = editor.querySelector(".ke-sql-highlight");
    if (lineEl) lineEl.innerHTML = lineNumbers(lines);
    inputEl.rows = lines;
    if (high) high.innerHTML = highlightSQL(inputEl.value);
  }

  function highlightSQL(sql) {
    var html = escapeHTML(sql || "");
    html = html.replace(/('(?:''|[^'])*')/g, '<span class="ke-sql-str">$1</span>');
    html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="ke-sql-num">$1</span>');
    html = html.replace(/\b(SELECT|FROM|WHERE|AND|OR|GROUP BY|ORDER BY|LIMIT|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|ON|AS|SUM|COUNT|AVG|MIN|MAX|DISTINCT|DATE_FORMAT|DATE_SUB|CURDATE|INTERVAL|CASE|WHEN|THEN|ELSE|END|IN|NOT|NULL|IS|LIKE)\b/gi, function (m) {
      var upper = m.toUpperCase();
      var cls = /^(SUM|COUNT|AVG|MIN|MAX|DATE_FORMAT|DATE_SUB|CURDATE)$/.test(upper) ? "ke-sql-fn" : "ke-sql-kw";
      return '<span class="' + cls + '">' + m + "</span>";
    });
    return html;
  }

  function formatSQL(sql) {
    var value = String(sql || "").trim();
    if (!value) return "";
    value = value.replace(/\s+/g, " ");
    value = value.replace(/\s+(FROM|WHERE|GROUP BY|ORDER BY|LIMIT|HAVING)\b/gi, "\n$1");
    value = value.replace(/\s+(LEFT JOIN|RIGHT JOIN|INNER JOIN|JOIN)\b/gi, "\n$1");
    value = value.replace(/\s+(AND|OR)\b/gi, "\n  $1");
    value = value.replace(/,\s*/g, ",\n       ");
    value = value.replace(/\n\s*(FROM|WHERE|GROUP BY|ORDER BY|LIMIT|HAVING|LEFT JOIN|RIGHT JOIN|INNER JOIN|JOIN)\b/gi, function (_, kw) {
      return "\n" + kw.toUpperCase();
    });
    return value;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
