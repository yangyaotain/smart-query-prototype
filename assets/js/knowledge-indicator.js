/* ======================================================================
 * 知识库 / 指标体系（admin/knowledge-indicator.html）
 *  - 左：指标目录树（一级 / 二级，右键新增/重命名/删除）
 *  - 右：查询条件 + 指标列表 + 分页
 *  - 抽屉：查看 / 编辑 / 新增（原子 / 衍生 / 派生 三种表单动态切换）
 * ====================================================================== */
(function () {
  'use strict';

  function getThemeColors() {
    return typeof window.getSmartQueryThemeColors === 'function'
      ? window.getSmartQueryThemeColors()
      : { primary: 'var(--primary)' };
  }

  // ---------- 1) Mock 字典 ----------
  var DATA_SOURCE_TREE = [
    {
      id: 'd_sales', name: '销售域', children: [
        { id: 'ds_sales', name: '销售业务库', type: 'MySQL' },
        { id: 'ds_order_svc', name: '订单服务库', type: 'MySQL' }
      ]
    },
    {
      id: 'd_customer', name: '客户域', children: [
        { id: 'ds_cdw', name: '客户数据仓库', type: 'PostgreSQL' },
        { id: 'ds_crm', name: 'CRM 业务库', type: 'PostgreSQL' }
      ]
    },
    {
      id: 'd_inventory', name: '库存域', children: [
        { id: 'ds_inventory', name: '库存分析库', type: 'Oracle' }
      ]
    },
    {
      id: 'd_finance', name: '财务域', children: [
        { id: 'ds_finance', name: '财务核算库', type: 'SQLServer' }
      ]
    },
    {
      id: 'd_ops', name: '运营域', children: [
        { id: 'ds_realtime', name: '实时分析库', type: 'ClickHouse' },
        { id: 'ds_metric', name: '运营指标库', type: 'ClickHouse' }
      ]
    }
  ];

  var DATA_SOURCES = flattenSourceTree();

  // 物理表（按数据源分组）
  var TABLES_BY_SRC = {
    ds_metric: [
      'non_bidding_project_info',
      'non_bidding_fee_detail',
      'bidding_project_info',
      'platform_service_fee_detail',
      'ca_fee_detail',
      'ecommerce_trade_detail'
    ],
    ds_sales: ['sales_order', 'sales_order_item', 'customer', 'product', 'channel'],
    ds_order_svc: ['order_pay', 'order_refund', 'pay_channel_dim'],
    ds_cdw: ['customer_master', 'customer_tag', 'customer_segment'],
    ds_crm: ['crm_lead', 'crm_account', 'crm_activity'],
    ds_inventory: ['inventory_log', 'inventory_snapshot', 'warehouse_dim', 'sku_dim'],
    ds_finance: ['ar_master', 'ap_master', 'gl_detail'],
    ds_realtime: ['event_track', 'page_view_daily', 'campaign_dim']
  };

  var TABLE_LABELS = {
    non_bidding_project_info: '非招项目信息',
    non_bidding_fee_detail: '非招服务费明细',
    bidding_project_info: '招标项目信息',
    platform_service_fee_detail: '平台服务费明细',
    ca_fee_detail: 'CA 费用明细',
    ecommerce_trade_detail: '电商交易明细',
    sales_order: '销售订单',
    sales_order_item: '订单明细',
    customer: '客户',
    product: '产品',
    channel: '渠道',
    order_pay: '订单支付',
    order_refund: '订单退款',
    pay_channel_dim: '支付渠道',
    customer_master: '客户主数据',
    customer_tag: '客户标签',
    customer_segment: '客户分群',
    crm_lead: 'CRM 线索',
    crm_account: 'CRM 客户',
    crm_activity: 'CRM 跟进活动',
    inventory_log: '库存流水',
    inventory_snapshot: '库存快照',
    warehouse_dim: '仓库维度',
    sku_dim: 'SKU 维度',
    ar_master: '应收主表',
    ap_master: '应付主表',
    gl_detail: '总账明细',
    event_track: '事件埋点',
    page_view_daily: '页面访问日表',
    campaign_dim: '活动维度'
  };

  // 物理字段（按表）
  var FIELDS_BY_TABLE = {
    non_bidding_project_info: [
      'deal_amount_10k_yuan', 'deal_notice_sent_date', 'procurement_method', 'project_name', 'project_code'
    ],
    non_bidding_fee_detail: [
      'service_fee_amount', 'service_fee_payment_time', 'procurement_method', 'project_id'
    ],
    bidding_project_info: [
      'bidding_amount', 'bidding_method', 'service_fee_collection_time', 'project_id'
    ],
    platform_service_fee_detail: [
      'service_fee_amount', 'service_fee_collection_time', 'project_id'
    ],
    ca_fee_detail: [
      'ca_fee_amount', 'payment_time', 'cert_type'
    ],
    ecommerce_trade_detail: [
      'trade_amount', 'acceptance_time', 'category'
    ],
    sales_order: ['order_id', 'sales_amount', 'order_date', 'customer_id', 'channel_id'],
    sales_order_item: ['order_id', 'product_id', 'quantity', 'price'],
    customer: ['customer_id', 'customer_name', 'register_date'],
    product: ['product_id', 'product_name', 'category'],
    channel: ['channel_id', 'channel_name'],
    customer_master: ['customer_id', 'customer_name', 'level'],
    customer_tag: ['customer_id', 'tag'],
    customer_segment: ['customer_id', 'segment'],
    ar_master: ['ar_id', 'amount', 'due_date'],
    ap_master: ['ap_id', 'amount', 'due_date'],
    gl_detail: ['account_id', 'amount', 'period'],
    order_pay: ['pay_id', 'order_id', 'pay_amount', 'pay_time', 'pay_channel'],
    order_refund: ['refund_id', 'order_id', 'refund_amount', 'refund_time'],
    pay_channel_dim: ['channel_id', 'channel_name', 'channel_type'],
    crm_lead: ['lead_id', 'source', 'owner_id', 'created_at'],
    crm_account: ['account_id', 'account_name', 'industry', 'region'],
    crm_activity: ['activity_id', 'account_id', 'activity_type', 'activity_time'],
    inventory_log: ['log_id', 'sku_id', 'warehouse_id', 'qty', 'created_time'],
    inventory_snapshot: ['sku_id', 'warehouse_id', 'stock_qty', 'snapshot_date'],
    warehouse_dim: ['warehouse_id', 'warehouse_name', 'city'],
    sku_dim: ['sku_id', 'sku_name', 'category'],
    event_track: ['event_id', 'user_id', 'event_name', 'event_time'],
    page_view_daily: ['page_id', 'visit_count', 'biz_date'],
    campaign_dim: ['campaign_id', 'campaign_name', 'start_date']
  };

  var FIELD_LABELS = {
    deal_amount_10k_yuan: '成交金额',
    deal_notice_sent_date: '成交通知发出日期',
    procurement_method: '采购方式',
    project_name: '项目名称',
    project_code: '项目编码',
    service_fee_amount: '服务费金额',
    service_fee_payment_time: '服务费支付时间',
    project_id: '项目ID',
    bidding_amount: '招标成交金额',
    bidding_method: '招标方式',
    service_fee_collection_time: '服务费收取时间',
    ca_fee_amount: 'CA费用金额',
    payment_time: '支付时间',
    cert_type: '证书类型',
    trade_amount: '交易金额',
    acceptance_time: '受理时间',
    category: '品类',
    order_id: '订单ID',
    sales_amount: '销售额',
    order_date: '下单日期',
    customer_id: '客户ID',
    channel_id: '渠道ID',
    product_id: '产品ID',
    quantity: '数量',
    price: '单价',
    customer_name: '客户名称',
    register_date: '注册日期',
    product_name: '产品名称',
    channel_name: '渠道名称',
    level: '客户等级',
    tag: '标签',
    segment: '分群',
    ar_id: '应收ID',
    ap_id: '应付ID',
    amount: '金额',
    due_date: '到期日期',
    account_id: '账户ID',
    period: '会计期间',
    pay_id: '支付ID',
    pay_amount: '支付金额',
    pay_time: '支付时间',
    pay_channel: '支付渠道',
    refund_id: '退款ID',
    refund_amount: '退款金额',
    refund_time: '退款时间',
    channel_type: '渠道类型',
    lead_id: '线索ID',
    source: '线索来源',
    owner_id: '负责人ID',
    created_at: '创建时间',
    account_name: '客户名称',
    industry: '行业',
    region: '区域',
    activity_id: '活动ID',
    activity_type: '活动类型',
    activity_time: '活动时间',
    log_id: '流水ID',
    sku_id: 'SKU ID',
    warehouse_id: '仓库ID',
    qty: '数量',
    created_time: '创建时间',
    stock_qty: '库存数量',
    snapshot_date: '快照日期',
    warehouse_name: '仓库名称',
    city: '城市',
    sku_name: 'SKU名称',
    event_id: '事件ID',
    user_id: '用户ID',
    event_name: '事件名称',
    event_time: '事件时间',
    page_id: '页面ID',
    visit_count: '访问次数',
    biz_date: '业务日期',
    campaign_id: '活动ID',
    campaign_name: '活动名称',
    start_date: '开始日期'
  };

  var CUSTOM_AGG_KEY = 'CUSTOM';
  var AGG_OPTIONS = [
    { key: 'SUM', label: 'SUM（求和）' },
    { key: 'COUNT', label: 'COUNT（计数）' },
    { key: 'COUNT_DISTINCT', label: 'COUNT_DISTINCT（去重计数）' },
    { key: 'AVG', label: 'AVG（平均值）' },
    { key: 'MAX', label: 'MAX（最大值）' },
    { key: 'MIN', label: 'MIN（最小值）' },
    { key: CUSTOM_AGG_KEY, label: '自定义' }
  ];
  var UNIT_PRESETS = ['元', '万元', '亿元', '%', '件', '次', '人', '天'];
  var TIME_TPL_PRESETS = [
    { key: '按月',   formula: "DATE_FORMAT(?, '%Y-%m')" },
    { key: '按日',   formula: "DATE_FORMAT(?, '%Y-%m-%d')" },
    { key: '按年',   formula: 'YEAR(?)' },
    { key: '按季度', formula: "CONCAT(YEAR(?), '-Q', QUARTER(?))" },
    { key: '按周',   formula: "DATE_FORMAT(?, '%x-W%v')" }
  ];

  // ---------- 2) 目录树 ----------
  var TREE = [
    {
      id: 'g_revenue', name: '收入指标', expanded: true,
      children: [
        { id: 'g_rev_sale', name: '销售收入' },
        { id: 'g_rev_service', name: '服务收入' },
        { id: 'g_rev_other', name: '其他收入' }
      ]
    },
    {
      id: 'g_cost', name: '成本指标', expanded: true,
      children: [
        { id: 'g_cost_direct', name: '直接成本' },
        { id: 'g_cost_indirect', name: '间接成本' }
      ]
    },
    {
      id: 'g_efficiency', name: '运营效率', expanded: true,
      children: [
        { id: 'g_eff_conv', name: '转化率' },
        { id: 'g_eff_cycle', name: '周期/时长' }
      ]
    }
  ];

  // ---------- 3) Mock 指标数据 ----------
  var INDICATORS = [
    {
      id: 'i_non_bid_amt', groupId: 'g_rev_sale', type: 'atom',
      name: '非招成交金额', synonyms: '非招成交金额',
      desc: '非招标项目的成交金额合计。',
      srcId: 'ds_metric',
      table: 'non_bidding_project_info',
      field: 'deal_amount_10k_yuan',
      agg: 'SUM',
      timeField: 'deal_notice_sent_date',
      defaultFilterSql: "procurement_method = '非招标'\nAND deal_notice_sent_date IS NOT NULL",
      unit: '万元',
      updatedAt: '2026-05-04'
    },
    {
      id: 'i_bid_amt', groupId: 'g_rev_sale', type: 'atom',
      name: '招标成交金额', synonyms: '招标项目成交金额',
      desc: '招标项目的成交金额合计。',
      srcId: 'ds_metric',
      table: 'bidding_project_info',
      field: 'bidding_amount',
      agg: 'SUM',
      timeField: 'service_fee_collection_time',
      defaultFilterSql: 'service_fee_collection_time IS NOT NULL',
      unit: '万元',
      updatedAt: '2026-05-03'
    },
    {
      id: 'i_platform_fee', groupId: 'g_rev_service', type: 'atom',
      name: '招标平台服务费', synonyms: '平台服务费收入',
      desc: '招标平台收取的服务费收入。',
      srcId: 'ds_metric',
      table: 'platform_service_fee_detail',
      field: 'service_fee_amount',
      agg: 'SUM',
      timeField: 'service_fee_collection_time',
      defaultFilterSql: 'service_fee_collection_time IS NOT NULL',
      unit: '元',
      updatedAt: '2026-05-02'
    },
    {
      id: 'i_non_bid_fee', groupId: 'g_rev_service', type: 'atom',
      name: '非招服务费', synonyms: '非招服务费收入',
      desc: '非招标项目的服务费收入。',
      srcId: 'ds_metric',
      table: 'non_bidding_fee_detail',
      field: 'service_fee_amount',
      agg: 'SUM',
      timeField: 'service_fee_payment_time',
      defaultFilterSql: "procurement_method = '非招标'\nAND service_fee_payment_time IS NOT NULL",
      unit: '元',
      updatedAt: '2026-04-29'
    },
    {
      id: 'i_ca_income', groupId: 'g_rev_other', type: 'atom',
      name: 'CA证书收入', synonyms: 'CA 证书',
      desc: 'CA 数字证书业务收入。',
      srcId: 'ds_metric',
      table: 'ca_fee_detail',
      field: 'ca_fee_amount',
      agg: 'SUM',
      timeField: 'payment_time',
      defaultFilterSql: 'payment_time IS NOT NULL',
      unit: '元',
      updatedAt: '2026-04-25'
    },
    {
      id: 'i_total_income', groupId: 'g_rev_sale', type: 'derived',
      name: '总收入', synonyms: '总收入',
      desc: '统计周期内平台各项业务收入的合计金额，用于反映整体经营收入规模。',
      srcId: 'ds_metric',
      formula: '招标平台服务费 + 非招服务费 + CA证书收入 + 销售金额 * 0.015',
      unit: '元',
      updatedAt: '2026-05-05'
    },
    {
      id: 'i_arpu', groupId: 'g_eff_conv', type: 'derived',
      name: '客单价', synonyms: 'ARPU,人均客单',
      desc: '统计周期内每位成交客户贡献的平均收入金额。',
      srcId: 'ds_metric',
      formula: '总收入 / 成交客户数',
      unit: '元',
      updatedAt: '2026-04-22'
    }
  ];

  // ---------- 4) 工具 ----------
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function uid(p) { return p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3); }

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

  function findGroupById(id) {
    for (var i = 0; i < TREE.length; i++) {
      if (TREE[i].id === id) return { parent: null, group: TREE[i], path: [TREE[i]] };
      var c = TREE[i].children || [];
      for (var j = 0; j < c.length; j++) {
        if (c[j].id === id) return { parent: TREE[i], group: c[j], path: [TREE[i], c[j]] };
      }
    }
    return null;
  }
  function findIndicatorById(id) {
    for (var i = 0; i < INDICATORS.length; i++) {
      if (INDICATORS[i].id === id) return INDICATORS[i];
    }
    return null;
  }
  function dsName(id) {
    for (var i = 0; i < DATA_SOURCES.length; i++) if (DATA_SOURCES[i].id === id) return DATA_SOURCES[i].name;
    return '';
  }
  function dsPathName(id) {
    var found = findSourceInTree(id);
    return found ? (found.domain.name + ' / ' + found.source.name) : dsName(id);
  }
  function tableLabel(name) {
    return TABLE_LABELS[name] || name || '';
  }
  function fieldLabel(name) {
    return FIELD_LABELS[name] || name || '';
  }
  function fieldTag(name, atom) {
    var f = String(name || '').toLowerCase();
    if (atom && atom.timeField === name) return '统计时间';
    if (/(_date|_time|time$|date$|period|month|year|day|created_at|created_time|snapshot_date|biz_date)/.test(f)) return '时间';
    if (/(amount|fee|price|qty|quantity|count|stock|income|revenue|sales)/.test(f)) return '度量';
    return '维度';
  }
  function fieldTagClass(tag) {
    return tag === '度量' ? 'measure' : tag === '统计时间' ? 'stat-time' : tag === '时间' ? 'time' : 'dimension';
  }
  function makeModelRef(srcId, table) {
    return (srcId && table) ? (srcId + '::' + table) : '';
  }
  function splitModelRef(ref) {
    var parts = String(ref || '').split('::');
    return { srcId: parts[0] || '', table: parts[1] || '' };
  }
  function effectiveModelRef(d) {
    return d ? (d.modelRef || makeModelRef(d.srcId, d.table)) : '';
  }
  function findModelInfo(ref) {
    var p = splitModelRef(ref);
    var tables = TABLES_BY_SRC[p.srcId] || [];
    if (!p.srcId || !p.table || tables.indexOf(p.table) < 0) return null;
    return { ref: makeModelRef(p.srcId, p.table), srcId: p.srcId, table: p.table, label: tableLabel(p.table) };
  }
  function modelPathName(ref) {
    var info = findModelInfo(ref);
    return info ? (dsPathName(info.srcId) + ' / ' + info.label) : '';
  }
  function aggLabel(key) {
    for (var i = 0; i < AGG_OPTIONS.length; i++) {
      if (AGG_OPTIONS[i].key === key) return AGG_OPTIONS[i].label;
    }
    return key || '';
  }
  function aggExpression(agg, field) {
    var f = field || '字段';
    if (agg === 'COUNT_DISTINCT') return 'COUNT(DISTINCT ' + f + ')';
    if (agg === CUSTOM_AGG_KEY) return '';
    return (agg || 'SUM') + '(' + f + ')';
  }
  function atomFunctionExpr(d) {
    if (!d) return '';
    return d.agg === CUSTOM_AGG_KEY ? (d.functionExpr || '') : aggExpression(d.agg || 'SUM', d.field);
  }
  function syncAtomFunctionExpr(d) {
    if (d && d.agg !== CUSTOM_AGG_KEY) d.functionExpr = atomFunctionExpr(d);
  }
  function typeLabel(t) {
    return t === 'atom' ? '原子指标' : t === 'derived' ? '衍生指标' : '';
  }
  function typeAbbr(t)  {
    return t === 'atom' ? '原' : t === 'derived' ? '衍' : '';
  }
  function isFormulaMetricType(t) {
    return t === 'derived';
  }
  function findAtomIndicatorById(id) {
    var it = findIndicatorById(id);
    return it && it.type === 'atom' ? it : null;
  }
  function atomMetricLabel(id) {
    var it = findAtomIndicatorById(id);
    return it ? it.name : '';
  }
  function atomMetricPathName(id) {
    var it = findAtomIndicatorById(id);
    if (!it) return '';
    var info = findGroupById(it.groupId);
    var path = info ? info.path.map(function (g) { return g.name; }).join(' / ') : '';
    return (path ? path + ' / ' : '') + it.name;
  }
  function derivativeModifierText(d) {
    return d ? (d.modifier || d.formula || '') : '';
  }
  function modifierSummaryText(text) {
    return String(text || '').replace(/\s*[\r\n]+\s*/g, '；').replace(/\s*；\s*/g, '；').replace(/；{2,}/g, '；');
  }
  function derivativeDisplayText(d) {
    var modifier = modifierSummaryText(derivativeModifierText(d));
    var atomName = atomMetricLabel(d && d.relatedAtomId);
    return [modifier, atomName].filter(Boolean).join(' · ');
  }

  // 计算所有节点（含全部）每个的指标数（含子分组聚合）
  function countByGroup() {
    var map = {};
    INDICATORS.forEach(function (it) { map[it.groupId] = (map[it.groupId] || 0) + 1; });
    // 父节点统计 = 自己 + 子节点之和
    TREE.forEach(function (g) {
      var sum = map[g.id] || 0;
      (g.children || []).forEach(function (c) { sum += (map[c.id] || 0); });
      map['_total_' + g.id] = sum;
    });
    var all = INDICATORS.length;
    map._all = all;
    return map;
  }

  // 取某分组下的"包含子分组"的所有指标
  function indicatorsInGroup(gid) {
    if (!gid || gid === '__all__') return INDICATORS.slice();
    var info = findGroupById(gid);
    if (!info) return [];
    if (!info.parent) {
      // 一级分组：包含自身 + 所有子级
      var ids = {};
      ids[info.group.id] = true;
      (info.group.children || []).forEach(function (c) { ids[c.id] = true; });
      return INDICATORS.filter(function (it) { return ids[it.groupId]; });
    }
    return INDICATORS.filter(function (it) { return it.groupId === gid; });
  }

  // ---------- 5) 状态 ----------
  var state = {
    activeGroupId: '__all__',
    keyword: '',
    typeFilter: '',
    page: 1,
    pageSize: 10,
    drawer: { mode: null, indicatorId: null, draft: null },  // mode: view | edit | create
    ctx: { type: null, groupId: null }                       // 右键菜单上下文
  };

  // ---------- 6) 渲染左目录树 ----------
  function renderTree() {
    var box = $('#kiTree'); if (!box) return;
    var counts = countByGroup();
    var kw = (state.searchTreeKw || '').trim().toLowerCase();

    var topAllActive = state.activeGroupId === '__all__' ? ' is-active' : '';
    var html = !kw ? ''
      + '<div class="ki-tree-row' + topAllActive + '" data-gid="__all__" oncontextmenu="return false;">'
      +   '<span class="chev"></span>'
      +   '<span class="ki-tr-name">全部指标</span>'
      +   '<span class="ki-tr-cnt">' + counts._all + '</span>'
      + '</div>' : '';

    TREE.forEach(function (g) {
      // 关键字过滤：名称匹配，或子节点匹配
      var matched = !kw || g.name.toLowerCase().indexOf(kw) >= 0
        || (g.children || []).some(function (c) { return c.name.toLowerCase().indexOf(kw) >= 0; });
      if (!matched) return;
      var collapsed = !kw && g.expanded === false ? ' is-collapsed' : '';
      var active = state.activeGroupId === g.id ? ' is-active' : '';
      var children = (g.children || []).filter(function (c) {
        return !kw || g.name.toLowerCase().indexOf(kw) >= 0 || c.name.toLowerCase().indexOf(kw) >= 0;
      });
      var childHTML = children.map(function (c) {
        var actC = state.activeGroupId === c.id ? ' is-active' : '';
        var cnt = counts[c.id] || 0;
        return ''
          + '<div class="ki-tree-row' + actC + '" data-gid="' + escapeHTML(c.id) + '" data-parent="' + escapeHTML(g.id) + '">'
          +   '<span class="ki-tr-name">' + keywordHighlight.html(c.name, kw) + '</span>'
          +   '<span class="ki-tr-cnt">' + cnt + '</span>'
          + '</div>';
      }).join('');
      html += ''
        + '<div class="ki-tree-group' + collapsed + '" data-gid="' + escapeHTML(g.id) + '">'
        +   '<div class="ki-tree-row' + active + '" data-gid="' + escapeHTML(g.id) + '">'
        +     '<span class="chev"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span>'
        +     '<span class="ki-tr-name">' + keywordHighlight.html(g.name, kw) + '</span>'
        +     '<span class="ki-tr-cnt">' + (counts['_total_' + g.id] || 0) + '</span>'
        +   '</div>'
        +   '<div class="ki-tree-children">' + childHTML + '</div>'
        + '</div>';
    });

    box.innerHTML = html || '<div class="ki-empty">未找到匹配目录</div>';
  }

  // ---------- 7) 渲染列表 ----------
  function getFilteredList() {
    var list = indicatorsInGroup(state.activeGroupId);
    var kw = (state.keyword || '').trim().toLowerCase();
    if (kw) {
      list = list.filter(function (it) {
        return (it.name || '').toLowerCase().indexOf(kw) >= 0
          || (it.synonyms || '').toLowerCase().indexOf(kw) >= 0;
      });
    }
    if (state.typeFilter) {
      list = list.filter(function (it) { return it.type === state.typeFilter; });
    }
    return list;
  }

  function renderBread() {
    var b = $('#kiBreadText'); if (!b) return;
    var info = state.activeGroupId === '__all__' ? null : findGroupById(state.activeGroupId);
    if (!info) {
      b.textContent = '全部指标';
    } else {
      b.textContent = info.path.map(function (g) { return g.name; }).join(' / ');
    }
    var c = $('#kiBreadCount');
    if (c) c.textContent = String(getFilteredList().length);
  }

  function renderList() {
    var tbody = $('#kiTbody'); if (!tbody) return;
    var list = getFilteredList();
    var totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * state.pageSize;
    var rows = list.slice(start, start + state.pageSize);

    if (!rows.length) {
      tbody.innerHTML = ''
        + '<tr><td colspan="6">'
        +   '<div class="ki-empty">'
        +     '<div class="ki-empty-ico"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></div>'
        +     '没有匹配的指标，可右上角"新增指标"添加'
        +   '</div>'
        + '</td></tr>';
      renderPager(0, 1);
      return;
    }

    tbody.innerHTML = rows.map(function (it) {
      var formula = '';
      if (it.type === 'atom') {
        var modelName = modelPathName(effectiveModelRef(it)) || tableLabel(it.table);
        formula = atomFunctionExpr(it) + (modelName ? ' · ' + modelName : '');
      } else if (isFormulaMetricType(it.type)) {
        formula = it.formula || '';
      } else {
        formula = (it.mappings || []).length + ' 个表字段映射';
      }
      var typeKey = it.type;
      return ''
        + '<tr data-id="' + escapeHTML(it.id) + '">'
        +   '<td>'
        +     '<div class="ki-name">'
        +       '<span class="ki-name-ico is-' + typeKey + '">' + typeAbbr(typeKey) + '</span>'
        +       '<div class="ki-name-text">'
        +         '<button type="button" class="ki-name-title" data-act="view" title="查看指标详情">' + keywordHighlight.html(it.name, state.keyword) + '</button>'
        +         '<span>' + escapeHTML(dsName(it.srcId)) + '</span>'
        +       '</div>'
        +     '</div>'
        +   '</td>'
        +   '<td><span class="ki-type-tag is-' + typeKey + '">' + typeLabel(typeKey) + '</span></td>'
        +   '<td><span class="ki-formula" title="' + escapeHTML(formula) + '">' + escapeHTML(formula) + '</span></td>'
        +   '<td><span class="ki-syn" title="' + escapeHTML(it.synonyms || '') + '">' + keywordHighlight.excerptHTML(it.synonyms || '-', state.keyword, 20) + '</span></td>'
        +   '<td><span class="ki-desc" title="' + escapeHTML(it.desc || '') + '">' + escapeHTML(it.desc || '-') + '</span></td>'
        +   '<td>'
        +     '<div class="ki-row-act">'
        +       '<button type="button" class="ki-icon-btn" title="查看" data-act="view"><svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg></button>'
        +       '<button type="button" class="ki-icon-btn" title="编辑" data-act="edit"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></button>'
        +       '<button type="button" class="ki-icon-btn is-danger" title="删除" data-act="delete"><svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>'
        +     '</div>'
        +   '</td>'
        + '</tr>';
    }).join('');

    renderPager(list.length, totalPages);
  }

  function renderPager(total, totalPages) {
    var pg = $('#kiPager'); if (!pg) return;
    var start = total === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
    var end = Math.min(total, state.page * state.pageSize);
    pg.innerHTML = ''
      + '<div class="ki-pg-info">共 ' + total + ' 条，第 ' + start + ' - ' + end + ' 条</div>'
      + '<div class="ki-pg-buttons">'
      +   '<button type="button" data-pg="prev"' + (state.page <= 1 ? ' disabled' : '') + '>上一页</button>'
      +   pageButtonsHTML(totalPages)
      +   '<button type="button" data-pg="next"' + (state.page >= totalPages ? ' disabled' : '') + '>下一页</button>'
      + '</div>'
      + '<select class="ki-pg-size" id="kiPgSize">'
      +   ['10', '20', '50'].map(function (n) {
            return '<option value="' + n + '"' + (String(state.pageSize) === n ? ' selected' : '') + '>' + n + ' 条/页</option>';
          }).join('')
      + '</select>';
  }

  function pageButtonsHTML(totalPages) {
    var html = '';
    var max = Math.min(totalPages, 7);
    var pages = [];
    if (totalPages <= 7) {
      for (var i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages = [1];
      var s = Math.max(2, state.page - 2);
      var e = Math.min(totalPages - 1, state.page + 2);
      if (s > 2) pages.push('...');
      for (var k = s; k <= e; k++) pages.push(k);
      if (e < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    pages.forEach(function (p) {
      if (p === '...') {
        html += '<button type="button" disabled>...</button>';
      } else {
        html += '<button type="button" data-pg="' + p + '"' + (p === state.page ? ' class="is-current"' : '') + '>' + p + '</button>';
      }
    });
    return html;
  }

  // ---------- 8) 抽屉 ----------
  function openDrawer(mode, indicatorId, presetGroupId) {
    state.drawer.mode = mode;
    state.drawer.indicatorId = indicatorId || null;
    var it = indicatorId ? findIndicatorById(indicatorId) : null;
    if (mode === 'create') {
      state.drawer.draft = newIndicatorDraft(presetGroupId || state.activeGroupId);
    } else {
      // view / edit：编辑时拷贝一份，避免直接改源数据
      state.drawer.draft = it ? deepClone(it) : null;
    }
    $('#kiDrawerMask').classList.remove('hidden');
    var d = $('#kiDrawer');
    d.classList.remove('hidden');
    d.setAttribute('aria-hidden', 'false');
    renderDrawer();
  }

  function closeDrawer() {
    $('#kiDrawerMask').classList.add('hidden');
    var d = $('#kiDrawer');
    d.classList.add('hidden');
    d.setAttribute('aria-hidden', 'true');
    state.drawer.mode = null;
    state.drawer.indicatorId = null;
    state.drawer.draft = null;
  }

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function newIndicatorDraft(groupId) {
    if (!groupId || groupId === '__all__') {
      // 找一个二级
      for (var i = 0; i < TREE.length; i++) {
        var c = TREE[i].children || [];
        if (c.length) { groupId = c[0].id; break; }
      }
    }
    return {
      id: '',
      groupId: groupId,
      type: 'atom',
      name: '',
      synonyms: '',
      desc: '',
      srcId: DATA_SOURCES[0].id,
      modelRef: '',
      table: '',
      field: '',
      agg: 'SUM',
      functionExpr: '',
      timeField: '',
      defaultFilterSql: '',
      unit: '万元',
      formula: '',
      modifier: '',
      relatedAtomId: '',
      isTimeDim: false,
      timeTplKey: '',
      timeFormula: '',
      mappings: [],
      filterValues: []
    };
  }

  function renderDrawer() {
    var titleEl = $('#kiDrawerTitle');
    var subEl = $('#kiDrawerSubtitle');
    var chip = $('#kiModeChip');
    var body = $('#kiDrawerBody');
    var foot = $('#kiDrawerFoot');
    if (!body) return;

    var d = state.drawer;
    var mode = d.mode;
    var draft = d.draft;
    if (!draft) return;

    // 头部文案
    if (mode === 'view') {
      titleEl.textContent = '指标详情';
      subEl.textContent = '查看 ' + (draft.name || '') + ' 的配置';
      chip.classList.remove('hidden', 'is-edit', 'is-create');
      chip.textContent = '查看模式';
    } else if (mode === 'edit') {
      titleEl.textContent = '编辑指标';
      subEl.textContent = '修改 ' + (draft.name || '') + ' 的字段';
      chip.classList.remove('hidden', 'is-create');
      chip.classList.add('is-edit');
      chip.textContent = '编辑模式';
    } else {
      titleEl.textContent = '新增指标';
      subEl.textContent = '根据类型选择"原子指标 / 衍生指标"配置不同字段';
      chip.classList.remove('hidden', 'is-edit');
      chip.classList.add('is-create');
      chip.textContent = '新增模式';
    }

    // 内容
    if (mode === 'view') {
      body.innerHTML = renderViewBody(draft);
    } else {
      body.innerHTML = renderFormBody(draft);
    }

    // 底部按钮
    if (mode === 'view') {
      foot.innerHTML = ''
        + '<button type="button" class="ghost-btn" data-act="close">关闭</button>'
        + '<button type="button" class="primary-btn" data-act="switch-edit">'
        +   '<svg viewBox="0 0 24 24" width="14" height="14" style="fill:none;stroke:#fff;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>'
        +   '编辑'
        + '</button>';
    } else {
      foot.innerHTML = ''
        + '<button type="button" class="ghost-btn" data-act="cancel">取消</button>'
        + '<button type="button" class="primary-btn" data-act="save">保存修改</button>';
    }
  }

  // ---------- 8a) 抽屉 - 查看模式 HTML ----------
  function defaultFilterEditorHTML(d, readonly) {
    var value = d.defaultFilterSql || '';
    if (window.SmartQuerySqlEditor && typeof window.SmartQuerySqlEditor.render === 'function') {
      return window.SmartQuerySqlEditor.render({
        value: value,
        bind: readonly ? '' : 'defaultFilterSql',
        readonly: !!readonly,
        minLines: readonly ? 4 : 6,
        title: 'SQL Editor',
        ariaLabel: '默认过滤条件 SQL',
        placeholder: readonly ? '未配置默认过滤条件' : "例如：status = '已完成'\nAND is_deleted = 0"
      });
    }
    return '<textarea class="ki-textarea" data-bind="defaultFilterSql" rows="6"'
      + (readonly ? ' readonly' : '')
      + ' placeholder="请输入默认过滤条件">' + escapeHTML(value) + '</textarea>';
  }

  function renderViewBody(d) {
    function v(x) { return (x == null || x === '') ? '<span class="ki-view-value empty">—</span>' : '<div class="ki-view-value">' + escapeHTML(x) + '</div>'; }
    var srcN = dsName(d.srcId);
    var typeT = typeLabel(d.type);

    var html = ''
      + '<div class="ki-view-grid">'
      +   '<div class="ki-view-cell"><div class="ki-view-label">数据源</div>' + v(srcN) + '</div>'
      +   '<div class="ki-view-cell"><div class="ki-view-label">类型</div><div class="ki-view-value"><span class="ki-type-tag is-' + d.type + '">' + typeT + '</span></div></div>'
      +   '<div class="ki-view-cell"><div class="ki-view-label">名称</div>' + v(d.name) + '</div>'
      +   '<div class="ki-view-cell"><div class="ki-view-label">同义词</div>' + v(d.synonyms) + '</div>'
      +   '<div class="ki-view-cell full"><div class="ki-view-label">描述</div>' + v(d.desc) + '</div>'
      + '</div>';

    if (d.type === 'atom') {
      html += ''
        + '<div class="ki-view-section">'
        +   '<h4>指标配置</h4>'
        +   '<div class="ki-view-grid">'
        +     '<div class="ki-view-cell full"><div class="ki-view-label">数据模型</div>' + v(modelPathName(effectiveModelRef(d)) || tableLabel(d.table)) + '</div>'
        +     '<div class="ki-view-cell"><div class="ki-view-label">字段选择</div>' + v(d.field) + '</div>'
        +     '<div class="ki-view-cell"><div class="ki-view-label">聚合方式</div>' + v(aggLabel(d.agg)) + '</div>'
        +     '<div class="ki-view-cell full"><div class="ki-view-label">函数表达式</div>' + v(atomFunctionExpr(d)) + '</div>'
        +     '<div class="ki-view-cell full"><div class="ki-view-label">默认过滤条件</div>' + defaultFilterEditorHTML(d, true) + '</div>'
        +     '<div class="ki-view-cell"><div class="ki-view-label">单位</div>' + v(d.unit) + '</div>'
        +   '</div>'
        + '</div>';
    } else if (isFormulaMetricType(d.type)) {
      html += ''
        + '<div class="ki-view-section">'
        +   '<h4>计算公式</h4>'
        +   '<div class="ki-view-value" style="font-family:ui-monospace,Consolas,monospace;background:#f8fafc;padding:10px 12px;border-radius:8px;">'
        +     escapeHTML(d.formula || '—')
        +   '</div>'
        +   '<div class="ki-form-hint">直接使用指标名称和运算符配置计算公式</div>'
        + '</div>';
      if (d.unit) {
        html += '<div class="ki-view-section"><h4>单位</h4>' + v(d.unit) + '</div>';
      }
    }
    return html;
  }

  // ---------- 8b) 抽屉 - 表单模式 HTML ----------
  function sourceTreeHTML(selectedId, keyword) {
    return DATA_SOURCE_TREE.map(function (domain) {
      var sources = (domain.children || []).filter(function (source) {
        return !keyword || normalizePickerKw(domain.name + ' ' + source.name).includes(keyword);
      });
      if (!sources.length) return '';
      var expanded = keyword || sources.some(function (s) { return s.id === selectedId; });
      var sourceHTML = sources.map(function (s) {
        var active = s.id === selectedId ? ' is-active' : '';
        return ''
          + '<div class="ki-source-tree-node is-leaf">'
          +   '<button type="button" class="ki-source-tree-row' + active + '" data-src-id="' + escapeHTML(s.id) + '">'
          +     '<span class="ki-source-tree-toggle is-empty"></span>'
          +     '<span class="ki-source-tree-icon is-source">'
          +       '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5V12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5.5"/><path d="M5 12v6.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V12"/></svg>'
          +     '</span>'
          +     '<span class="ki-source-tree-name">' + escapeHTML(s.name) + '</span>'
          +     '<span class="ki-source-tree-meta">' + escapeHTML(s.type || '') + '</span>'
          +   '</button>'
          + '</div>';
      }).join('');
      return ''
        + '<div class="ki-source-tree-node' + (expanded ? '' : ' is-collapsed') + '" data-domain-id="' + escapeHTML(domain.id) + '">'
        +   '<button type="button" class="ki-source-tree-row is-domain" data-domain-id="' + escapeHTML(domain.id) + '">'
        +     '<span class="ki-source-tree-toggle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>'
        +     '<span class="ki-source-tree-icon">'
        +       '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/></svg>'
        +     '</span>'
        +     '<span class="ki-source-tree-name">' + escapeHTML(domain.name) + '</span>'
        +     '<span class="ki-source-tree-meta">' + sources.length + '</span>'
        +   '</button>'
        +   '<div class="ki-source-tree-children">' + sourceHTML + '</div>'
        + '</div>';
    }).join('');
  }

  function sourcePickerHTML(selectedId) {
    var label = dsPathName(selectedId);
    return ''
      + '<div class="ki-source-picker" data-role="source-picker">'
      +   '<button type="button" class="ki-source-picker-btn" id="kiAnalysisSourceTrigger" data-act="toggle-source-tree" aria-labelledby="kiAnalysisSourceLabel kiAnalysisSourceTrigger" aria-expanded="false">'
      +     '<span class="ki-source-picker-text' + (label ? '' : ' is-placeholder') + '">' + escapeHTML(label || '请选择数据源') + '</span>'
      +     '<span class="ki-source-picker-arrow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>'
      +   '</button>'
      +   '<div class="ki-source-tree-pop">'
      +     '<div class="ki-picker-search"><input class="ki-input ki-picker-search-input" data-role="analysis-source-search" aria-label="搜索业务域或数据源" placeholder="搜索业务域 / 数据源" /></div>'
      +     '<div class="ki-source-tree-list">' + sourceTreeHTML(selectedId) + '</div>'
      +     '<div class="ki-picker-empty hidden" role="status">没有匹配的数据源</div>'
      +   '</div>'
      + '</div>';
  }

  function modelTreeHTML(selectedRef) {
    var selectedInfo = findModelInfo(selectedRef);
    return DATA_SOURCE_TREE.map(function (domain) {
      var sources = domain.children || [];
      var hasSelected = !!(selectedInfo && sources.some(function (s) { return s.id === selectedInfo.srcId; }));
      var sourceHTML = sources.map(function (s) {
        var tables = TABLES_BY_SRC[s.id] || [];
        var sourceSelected = !!(selectedInfo && selectedInfo.srcId === s.id);
        var tableHTML = tables.map(function (t) {
          var ref = makeModelRef(s.id, t);
          var active = selectedInfo && selectedInfo.ref === ref ? ' is-active' : '';
          var searchText = [domain.name, s.name, s.type || '', tableLabel(t), t].join(' ');
          return ''
            + '<div class="ki-source-tree-node is-leaf">'
            +   '<button type="button" class="ki-source-tree-row is-table' + active + '" data-model-ref="' + escapeHTML(ref) + '" data-search="' + escapeHTML(searchText) + '" title="' + escapeHTML(tableLabel(t) + ' / ' + t) + '">'
            +     '<span class="ki-source-tree-toggle is-empty"></span>'
            +     '<span class="ki-source-tree-icon is-table">'
            +       '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16"/><path d="M10 4v16"/></svg>'
            +     '</span>'
            +     '<span class="ki-source-tree-name">'
            +       '<span class="ki-source-tree-title">' + escapeHTML(tableLabel(t)) + '</span>'
            +       '<span class="ki-source-tree-code">' + escapeHTML(t) + '</span>'
            +     '</span>'
            +     '<span class="ki-source-tree-meta">表</span>'
            +   '</button>'
            + '</div>';
        }).join('');
        return ''
          + '<div class="ki-source-tree-node' + (sourceSelected ? '' : ' is-collapsed') + '" data-model-source-id="' + escapeHTML(s.id) + '">'
          +   '<button type="button" class="ki-source-tree-row is-domain is-source-domain" data-model-source-id="' + escapeHTML(s.id) + '">'
          +     '<span class="ki-source-tree-toggle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>'
          +     '<span class="ki-source-tree-icon is-source">'
          +       '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5V12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5.5"/><path d="M5 12v6.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V12"/></svg>'
          +     '</span>'
          +     '<span class="ki-source-tree-name" data-source-type="' + escapeHTML(s.type || '') + '">' + escapeHTML(s.name) + '</span>'
          +     '<span class="ki-source-tree-meta">' + tables.length + '</span>'
          +   '</button>'
          +   '<div class="ki-source-tree-children">' + tableHTML + '</div>'
          + '</div>';
      }).join('');
      return ''
        + '<div class="ki-source-tree-node' + (hasSelected ? '' : ' is-collapsed') + '" data-domain-id="' + escapeHTML(domain.id) + '">'
        +   '<button type="button" class="ki-source-tree-row is-domain" data-domain-id="' + escapeHTML(domain.id) + '">'
        +     '<span class="ki-source-tree-toggle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>'
        +     '<span class="ki-source-tree-icon">'
        +       '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/></svg>'
        +     '</span>'
        +     '<span class="ki-source-tree-name">' + escapeHTML(domain.name) + '</span>'
        +     '<span class="ki-source-tree-meta">' + sources.length + '</span>'
        +   '</button>'
        +   '<div class="ki-source-tree-children">' + sourceHTML + '</div>'
        + '</div>';
    }).join('');
  }

  function modelPickerHTML(d) {
    var ref = effectiveModelRef(d);
    var label = modelPathName(ref);
    return ''
      + '<div class="ki-source-picker ki-model-picker" data-role="model-picker">'
      +   '<button type="button" class="ki-source-picker-btn" data-act="toggle-model-tree" aria-haspopup="tree" aria-expanded="false">'
      +     '<span class="ki-source-picker-text' + (label ? '' : ' is-placeholder') + '">' + escapeHTML(label || '请选择数据模型') + '</span>'
      +     '<span class="ki-source-picker-arrow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>'
      +   '</button>'
      +   '<div class="ki-source-tree-pop" role="tree">'
      +     '<div class="ki-picker-search"><input class="ki-input ki-picker-search-input" data-role="model-search" placeholder="搜索领域 / 数据源 / 表名" /></div>'
      +     '<div class="ki-source-tree-list">' + modelTreeHTML(ref) + '</div>'
      +     '<div class="ki-picker-empty hidden">暂无匹配数据模型</div>'
      +   '</div>'
      + '</div>';
  }

  function fieldPickerHTML(d) {
    var table = (findModelInfo(effectiveModelRef(d)) || {}).table || d.table;
    var fields = FIELDS_BY_TABLE[table] || [];
    var label = d.field || '';
    var list = '';
    if (!table) {
      list = '<div class="ki-empty-line">请先选择数据模型</div>';
    } else if (!fields.length) {
      list = '<div class="ki-empty-line">当前模型暂无字段</div>';
    } else {
      list = fields.map(function (f) {
        var active = f === d.field ? ' is-active' : '';
        return ''
          + '<button type="button" class="ki-field-option' + active + '" data-field="' + escapeHTML(f) + '" data-search="' + escapeHTML(f) + '">'
          +   '<span class="ki-field-option-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h10"/></svg></span>'
          +   '<span class="ki-field-option-name">' + escapeHTML(f) + '</span>'
          + '</button>';
      }).join('');
    }
    return ''
      + '<div class="ki-source-picker ki-field-picker" data-role="field-picker">'
      +   '<button type="button" class="ki-source-picker-btn" data-act="toggle-field-picker" aria-haspopup="listbox" aria-expanded="false"' + (!table ? ' disabled' : '') + '>'
      +     '<span class="ki-source-picker-text' + (label ? '' : ' is-placeholder') + '">' + escapeHTML(label || (table ? '请选择字段' : '请先选择数据模型')) + '</span>'
      +     '<span class="ki-source-picker-arrow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>'
      +   '</button>'
      +   '<div class="ki-source-tree-pop" role="listbox">'
      +     '<div class="ki-picker-search"><input class="ki-input ki-picker-search-input" data-role="field-search" placeholder="搜索字段" ' + (!table || !fields.length ? 'disabled' : '') + ' /></div>'
      +     '<div class="ki-field-list">' + list + '</div>'
      +     '<div class="ki-picker-empty hidden">暂无匹配字段</div>'
      +   '</div>'
      + '</div>';
  }

  function atomMetricTreeHTML(selectedId) {
    function atomRows(groupId) {
      return INDICATORS.filter(function (it) {
        return it.type === 'atom' && it.groupId === groupId;
      }).map(function (it) {
        var active = it.id === selectedId ? ' is-active' : '';
        var searchText = [it.name, it.synonyms || '', it.desc || '', groupPathName(it.groupId)].join(' ');
        return ''
          + '<div class="ki-source-tree-node is-leaf">'
          +   '<button type="button" class="ki-source-tree-row is-atom-metric' + active + '" data-atom-id="' + escapeHTML(it.id) + '" data-search="' + escapeHTML(searchText) + '" data-match-detail="' + escapeHTML(it.desc || '') + '" title="' + escapeHTML(atomMetricPathName(it.id)) + '">'
          +     '<span class="ki-source-tree-toggle is-empty"></span>'
          +     '<span class="ki-source-tree-icon is-atom-metric"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-4"/></svg></span>'
          +     '<span class="ki-source-tree-name">'
          +       '<span class="ki-source-tree-title">' + escapeHTML(it.name) + '</span>'
          +       '<span class="ki-source-tree-code">' + escapeHTML(it.synonyms || '原子指标') + '</span>'
          +     '</span>'
          +     '<span class="ki-source-tree-meta">原</span>'
          +   '</button>'
          + '</div>';
      }).join('');
    }

    return TREE.map(function (group) {
      var childHTML = (group.children || []).map(function (child) {
        var rows = atomRows(child.id);
        if (!rows) return '';
        var hasSelectedChild = !!(selectedId && rows.indexOf('data-atom-id="' + escapeHTML(selectedId) + '"') >= 0);
        return ''
          + '<div class="ki-source-tree-node' + (hasSelectedChild ? '' : ' is-collapsed') + '" data-atom-group-id="' + escapeHTML(child.id) + '">'
          +   '<button type="button" class="ki-source-tree-row is-domain" data-atom-group-id="' + escapeHTML(child.id) + '">'
          +     '<span class="ki-source-tree-toggle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>'
          +     '<span class="ki-source-tree-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h7l2 2h9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></span>'
          +     '<span class="ki-source-tree-name">' + escapeHTML(child.name) + '</span>'
          +     '<span class="ki-source-tree-meta">' + (INDICATORS.filter(function (it) { return it.type === 'atom' && it.groupId === child.id; }).length) + '</span>'
          +   '</button>'
          +   '<div class="ki-source-tree-children">' + rows + '</div>'
          + '</div>';
      }).join('');
      var directRows = atomRows(group.id);
      var selectedInGroup = !!(selectedId && (childHTML + directRows).indexOf('data-atom-id="' + escapeHTML(selectedId) + '"') >= 0);
      var count = indicatorsInGroup(group.id).filter(function (it) { return it.type === 'atom'; }).length;
      if (!count) return '';
      return ''
        + '<div class="ki-source-tree-node' + (selectedInGroup ? '' : ' is-collapsed') + '" data-atom-group-id="' + escapeHTML(group.id) + '">'
        +   '<button type="button" class="ki-source-tree-row is-domain" data-atom-group-id="' + escapeHTML(group.id) + '">'
        +     '<span class="ki-source-tree-toggle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>'
        +     '<span class="ki-source-tree-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/></svg></span>'
        +     '<span class="ki-source-tree-name">' + escapeHTML(group.name) + '</span>'
        +     '<span class="ki-source-tree-meta">' + count + '</span>'
        +   '</button>'
        +   '<div class="ki-source-tree-children">' + directRows + childHTML + '</div>'
        + '</div>';
    }).join('');
  }

  function atomMetricPickerHTML(d) {
    var label = atomMetricPathName(d.relatedAtomId);
    return ''
      + '<div class="ki-source-picker ki-atom-picker" data-role="atom-picker">'
      +   '<button type="button" class="ki-source-picker-btn" data-act="toggle-atom-picker" aria-haspopup="tree" aria-expanded="false">'
      +     '<span class="ki-source-picker-text' + (label ? '' : ' is-placeholder') + '">' + escapeHTML(label || '请选择关联原子指标') + '</span>'
      +     '<span class="ki-source-picker-arrow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>'
      +   '</button>'
      +   '<div class="ki-source-tree-pop" role="tree">'
      +     '<div class="ki-picker-search"><input class="ki-input ki-picker-search-input" data-role="atom-search" placeholder="搜索目录 / 原子指标" /></div>'
      +     '<div class="ki-source-tree-list">' + atomMetricTreeHTML(d.relatedAtomId) + '</div>'
      +     '<div class="ki-picker-empty hidden">暂无匹配原子指标</div>'
      +   '</div>'
      + '</div>';
  }

  function tableOptions(srcId, selected) {
    var arr = TABLES_BY_SRC[srcId] || [];
    return ['<option value="">请选择</option>'].concat(arr.map(function (t) {
      return '<option value="' + escapeHTML(t) + '"' + (t === selected ? ' selected' : '') + '>' + escapeHTML(t) + '</option>';
    })).join('');
  }

  function fieldOptions(table, selected, includeEmpty) {
    var arr = FIELDS_BY_TABLE[table] || [];
    var head = includeEmpty ? '<option value="">请选择</option>' : '';
    return [head].concat(arr.map(function (f) {
      return '<option value="' + escapeHTML(f) + '"' + (f === selected ? ' selected' : '') + '>' + escapeHTML(f) + '</option>';
    })).join('');
  }

  function aggOptions(selected) {
    return AGG_OPTIONS.map(function (a) {
      return '<option value="' + escapeHTML(a.key) + '"' + (a.key === selected ? ' selected' : '') + '>' + escapeHTML(a.label) + '</option>';
    }).join('');
  }

  function unitChipsHTML(selected) {
    return UNIT_PRESETS.map(function (u) {
      return '<span class="ki-chip' + (selected === u ? ' is-checked' : '') + '" data-unit="' + escapeHTML(u) + '">' + escapeHTML(u) + '</span>';
    }).join('');
  }

  function tplChipsHTML(selectedKey) {
    return TIME_TPL_PRESETS.map(function (t) {
      return '<span class="ki-chip' + (selectedKey === t.key ? ' is-checked' : '') + '" data-tpl="' + escapeHTML(t.key) + '">' + escapeHTML(t.key) + '</span>';
    }).join('');
  }

  var FORMULA_OPERATOR_TOOLS = [
    { label: '+', value: '+' },
    { label: '-', value: '-' },
    { label: '*', value: '*' },
    { label: '/', value: '/' },
    { label: '()', value: '()' },
    { label: '[]', value: '[]' }
  ];
  var FORMULA_OPERATORS = ['+', '-', '*', '/', '(', ')', '[', ']'];
  var FORMULA_NUMERIC_FUNCTIONS = ['ROUND()', 'ABS()', 'CEIL()', 'FLOOR()'];
  var FORMULA_LOGIC_FUNCTIONS = ['IF()', 'COALESCE()'];
  var FORMULA_FUNCTIONS = FORMULA_NUMERIC_FUNCTIONS.concat(FORMULA_LOGIC_FUNCTIONS);

  function formulaAtomOptions() {
    return INDICATORS.filter(function (it) { return it.type === 'atom'; });
  }

  function formulaAtomByName(name) {
    return formulaAtomOptions().find(function (it) { return it.name === name; });
  }

  function isFormulaFunctionToken(value) {
    var upper = String(value || '').toUpperCase();
    return FORMULA_FUNCTIONS.some(function (fn) { return fn.toUpperCase() === upper; });
  }

  function isFormulaNumberToken(value) {
    return /^-?\d+(\.\d+)?%?$/.test(String(value || '').trim());
  }

  function isFormulaMetricToken(value) {
    var text = String(value || '').trim();
    return !!text && !isFormulaNumberToken(text) && !isFormulaFunctionToken(text) && FORMULA_OPERATORS.indexOf(text) < 0
      && /[\u4e00-\u9fa5]/.test(text);
  }

  function formulaParts(formula) {
    var functionPattern = FORMULA_FUNCTIONS.map(function (fn) {
      return fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('|');
    var re = new RegExp('(?:' + functionPattern + ')|[+\\-*/()\\[\\]]|[^\\s+\\-*/()\\[\\]]+', 'gi');
    return (String(formula || '').match(re) || [])
      .map(function (p) { return p.trim(); })
      .filter(Boolean);
  }

  function joinFormulaParts(parts) {
    return parts.filter(Boolean).join(' ')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/\[\s+/g, '[')
      .replace(/\s+\]/g, ']')
      .replace(/\s+,/g, ',');
  }

  function formulaEditorHTML(formula) {
    var parts = formulaParts(formula);
    if (!parts.length) {
      return '<span class="ki-formula-placeholder">输入 @ 搜索指标，或直接输入公式 / 点击上方符号</span>';
    }
    return parts.map(function (part, idx) {
      var atom = formulaAtomByName(part);
      if (atom || isFormulaMetricToken(part)) {
        return ''
          + '<span class="ki-formula-token" contenteditable="false" data-formula-part-index="' + idx + '" data-formula-token="' + escapeHTML(part) + '">'
          +   escapeHTML(part)
          +   '<button type="button" class="ki-formula-token-remove" data-act="remove-formula-part" data-formula-part-index="' + idx + '" aria-label="删除' + escapeHTML(part) + '">x</button>'
          + '</span>';
      }
      if (FORMULA_OPERATORS.indexOf(part) >= 0) {
        return '<span class="ki-formula-op" data-formula-token="' + escapeHTML(part) + '">' + escapeHTML(part) + '</span>';
      }
      if (isFormulaFunctionToken(part)) {
        return '<span class="ki-formula-fn" data-formula-token="' + escapeHTML(part) + '">' + escapeHTML(part.replace('()', '')) + '</span>';
      }
      return '<span class="ki-formula-text" data-formula-token="' + escapeHTML(part) + '">' + escapeHTML(part) + '</span>';
    }).join('');
  }

  function formulaAtomListHTML() {
    return formulaAtomOptions().map(function (it) {
      var code = it.synonyms || it.field || '原子指标';
      var searchText = [it.name, it.synonyms || '', it.desc || '', groupPathName(it.groupId)].join(' ');
      return ''
        + '<button type="button" class="ki-formula-atom-option" data-formula-atom-id="' + escapeHTML(it.id) + '" data-search="' + escapeHTML(searchText) + '" data-match-detail="' + escapeHTML([it.desc, groupPathName(it.groupId)].filter(Boolean).join(' · ')) + '">'
        +   '<span>' + escapeHTML(it.name) + '</span>'
        +   '<em>' + escapeHTML(code) + '</em>'
        + '</button>';
    }).join('');
  }

  function formulaBuilderHTML(d) {
    return ''
      + '<div class="ki-formula-builder">'
      +   '<div class="ki-formula-toolbar">'
      +     '<div class="ki-formula-tool-group" aria-label="运算符">'
      +       FORMULA_OPERATOR_TOOLS.map(function (op) {
                return '<button type="button" class="ki-formula-tool" data-act="insert-formula-op" data-formula-value="' + escapeHTML(op.value) + '">' + escapeHTML(op.label) + '</button>';
              }).join('')
      +     '</div>'
      +     '<div class="ki-formula-tool-group" aria-label="数值函数">'
      +       FORMULA_NUMERIC_FUNCTIONS.map(function (fn) {
                return '<button type="button" class="ki-formula-tool" data-act="insert-formula-fn" data-formula-value="' + escapeHTML(fn) + '">' + escapeHTML(fn.replace('()', '')) + '</button>';
              }).join('')
      +     '</div>'
      +     '<div class="ki-formula-tool-group" aria-label="逻辑函数">'
      +       FORMULA_LOGIC_FUNCTIONS.map(function (fn) {
                return '<button type="button" class="ki-formula-tool" data-act="insert-formula-fn" data-formula-value="' + escapeHTML(fn) + '">' + escapeHTML(fn.replace('()', '')) + '</button>';
              }).join('')
      +     '</div>'
      +     '<button type="button" class="ki-formula-clear" data-act="clear-formula">清空</button>'
      +   '</div>'
      +   '<div class="ki-formula-editor-wrap">'
      +     '<div class="ki-formula-editor" data-role="formula-editor" contenteditable="true" spellcheck="false">'
      +       formulaEditorHTML(d.formula)
      +     '</div>'
      +     '<div class="ki-formula-suggest hidden" data-role="formula-suggest">'
      +       formulaAtomListHTML()
      +       '<div class="ki-formula-empty hidden">暂无匹配原子指标</div>'
      +     '</div>'
      +   '</div>'
      +   '<input type="hidden" data-bind="formula" value="' + escapeHTML(d.formula || '') + '" />'
      +   '<div class="ki-formula-help">'
      +     '<span>输入 @ 可搜索并插入指标</span>'
      +     '<span>点击上方符号 / 函数会插入到当前光标位置</span>'
      +     '<span>工具栏没有的运算符号，可以自定义输入</span>'
      +   '</div>'
      + '</div>';
  }

  function renderFormBody(d) {
    // 通用：名称、类型、同义词、描述
    var common = ''
      + '<div class="ki-form-grid">'
      +   '<div class="ki-form-row">'
      +     '<label class="ki-form-label">名称</label>'
      +     '<input class="ki-input" data-bind="name" maxlength="40" value="' + escapeHTML(d.name) + '" />'
      +   '</div>'
      +   '<div class="ki-form-row">'
      +     '<label class="ki-form-label">类型</label>'
      +     '<select class="ki-select-form" data-bind="type">'
      +       '<option value="atom"' + (d.type === 'atom' ? ' selected' : '') + '>原子指标</option>'
      +       '<option value="derived"' + (d.type === 'derived' ? ' selected' : '') + '>衍生指标</option>'
      +     '</select>'
      +   '</div>'
      + '</div>'
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">同义词</label>'
      +   '<input class="ki-input" data-bind="synonyms" placeholder="多个同义词用英文逗号分隔" value="' + escapeHTML(d.synonyms) + '" />'
      + '</div>'
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">描述</label>'
      +   '<textarea class="ki-textarea" data-bind="desc" maxlength="500" rows="4" placeholder="请输入该指标的业务口径、业务含义等相关描述">' + escapeHTML(d.desc) + '</textarea>'
      + '</div>';

    var typeBlock = '';
    if (d.type === 'atom') typeBlock = renderAtomBlock(d);
    else typeBlock = renderDerivedBlock(d);

    return common + typeBlock;
  }

  function renderAtomBlock(d) {
    return ''
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">数据模型</label>'
      +   modelPickerHTML(d)
      + '</div>'
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">字段选择</label>'
      +   fieldPickerHTML(d)
      + '</div>'
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">聚合方式</label>'
      +   '<select class="ki-select-form" data-bind="agg">' + aggOptions(d.agg) + '</select>'
      + '</div>'
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">函数表达式</label>'
      +   '<input class="ki-input" data-bind="functionExpr" value="' + escapeHTML(atomFunctionExpr(d)) + '" placeholder="' + (d.agg === CUSTOM_AGG_KEY ? '请输入自定义函数表达式' : '选择字段后自动生成') + '"' + (d.agg === CUSTOM_AGG_KEY ? '' : ' readonly') + ' />'
      +   '<div class="ki-form-hint">' + (d.agg === CUSTOM_AGG_KEY ? '自定义时可填写完整聚合函数或 SQL 片段。' : '随聚合方式和字段自动生成，不支持手动修改。') + '</div>'
      + '</div>'
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">默认过滤条件<span class="ki-form-tip" title="指标查询时自动追加的 SQL 条件">?</span></label>'
      +   defaultFilterEditorHTML(d, false)
      +   '<div class="ki-form-hint">用于指标查询时自动追加过滤条件，仅填写 WHERE 后的条件表达式；不配置时不做默认过滤。</div>'
      + '</div>'
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">单位<span class="ki-form-tip" title="可点选预设，也可在下方文本框自定义">?</span></label>'
      +   '<div class="ki-unit-chips" data-role="unit-chips">' + unitChipsHTML(d.unit) + '</div>'
      +   '<input class="ki-input" data-bind="unit" maxlength="20" value="' + escapeHTML(d.unit || '') + '" placeholder="自定义单位" />'
      + '</div>';
  }

  function renderDerivedBlock(d) {
    return ''
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">计算公式</label>'
      +   '<textarea class="ki-textarea ki-natural-formula-input" data-bind="formula" maxlength="500" rows="5" placeholder="例如：招标平台服务费 + 非招服务费 + CA证书收入 + 销售金额 * 0.015">' + escapeHTML(d.formula || '') + '</textarea>'
      +   '<div class="ki-form-hint">直接输入中文指标名称，支持使用 +、-、*、/、括号及 ROUND、ABS、SQRT、LOG 等常用函数组合计算公式。</div>'
      + '</div>'
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">单位</label>'
      +   '<div class="ki-unit-chips" data-role="unit-chips">' + unitChipsHTML(d.unit) + '</div>'
      +   '<input class="ki-input" data-bind="unit" maxlength="20" value="' + escapeHTML(d.unit || '') + '" placeholder="自定义单位" />'
      + '</div>';
  }

  function derivativeFieldRowsHTML(d) {
    var atom = findAtomIndicatorById(d.relatedAtomId);
    if (!atom) {
      return '<div class="ki-empty-line">请先选择关联原子指标，系统会带出该原子指标所在事实表字段。</div>';
    }
    var fields = FIELDS_BY_TABLE[atom.table] || [];
    if (!fields.length) {
      return '<div class="ki-empty-line">当前事实表暂无可配置字段。</div>';
    }
    return fields.map(function (field) {
      var label = fieldLabel(field);
      var tag = fieldTag(field, atom);
      return ''
        + '<button type="button" class="ki-derivative-field" data-mod-field="' + escapeHTML(label) + '" data-mod-code="' + escapeHTML(field) + '">'
        +   '<span class="ki-derivative-field-main">'
        +     '<span class="ki-derivative-field-code">' + escapeHTML(field) + '</span>'
        +     '<span class="ki-derivative-field-name">' + escapeHTML(label) + '</span>'
        +   '</span>'
        +   '<span class="ki-field-tag is-' + fieldTagClass(tag) + '">' + escapeHTML(tag) + '</span>'
        + '</button>';
    }).join('');
  }

  function modifierExamplesHTML(d) {
    var atom = findAtomIndicatorById(d.relatedAtomId);
    var examples = [
      { title: '直营门店-电子产品-销售额', text: '渠道名称=直营门店；\n产品名称=电子产品' },
      { title: '华东区域-重点客户-收入', text: '区域=华东；\n客户等级=重点客户' },
      { title: '企业证书-上月收入', text: '证书类型=企业证书；\n支付时间=上月' }
    ];
    if (atom && atom.table === 'non_bidding_project_info') {
      examples = [
        { title: '询比采购-智慧园区-成交金额', text: '采购方式=询比采购；\n项目名称=智慧园区改造' },
        { title: '直营门店-电子产品-销售额', text: '渠道名称=直营门店；\n产品名称=电子产品' },
        { title: '本月-重点项目-成交金额', text: '成交通知发出日期=本月；\n项目编码=PJ-2026-042' }
      ];
    } else if (atom && atom.table === 'platform_service_fee_detail') {
      examples = [
        { title: '本月重点项目-服务费', text: '项目ID=PJ-2026-042；\n服务费收取时间=本月' },
        { title: '直营门店-电子产品-销售额', text: '渠道名称=直营门店；\n产品名称=电子产品' },
        { title: '上周到账-平台服务费', text: '服务费收取时间=上周；\n项目ID=PJ-2026-018' }
      ];
    } else if (atom && atom.table === 'ca_fee_detail') {
      examples = [
        { title: '企业证书-上月收入', text: '证书类型=企业证书；\n支付时间=上月' },
        { title: '个人证书-本月收入', text: '证书类型=个人证书；\n支付时间=本月' },
        { title: '直营门店-电子产品-销售额', text: '渠道名称=直营门店；\n产品名称=电子产品' }
      ];
    }
    return examples.map(function (item) {
      return '<button type="button" class="ki-modifier-example" data-mod-example="' + escapeHTML(item.text).replace(/\n/g, '&#10;') + '">' + escapeHTML(item.title) + '</button>';
    }).join('');
  }

  function derivativeModifierConfigHTML(d) {
    var atom = findAtomIndicatorById(d.relatedAtomId);
    var title = atom ? ('待配置字段 · ' + tableLabel(atom.table)) : '待配置字段';
    var desc = atom ? (atom.name + ' 的事实表字段') : '选择关联原子指标后显示';
    return ''
      + '<div class="ki-modifier-config">'
      +   '<div class="ki-modifier-panel">'
      +     '<div class="ki-modifier-panel-head">'
      +       '<span>' + escapeHTML(title) + '</span>'
      +       '<em>' + escapeHTML(desc) + '</em>'
      +     '</div>'
      +     '<div class="ki-modifier-field-list">' + derivativeFieldRowsHTML(d) + '</div>'
      +   '</div>'
      +   '<div class="ki-modifier-panel">'
      +     '<div class="ki-modifier-panel-head">'
      +       '<span>修饰词</span>'
      +       '<em>字段=限定值</em>'
      +     '</div>'
      +     '<textarea class="ki-textarea ki-modifier-textarea" data-bind="modifier" maxlength="240" rows="8" placeholder="例：渠道名称=直营门店；&#10;产品名称=电子产品">' + escapeHTML(derivativeModifierText(d)) + '</textarea>'
      +     '<div class="ki-modifier-examples">' + modifierExamplesHTML(d) + '</div>'
      +   '</div>'
      + '</div>';
  }

  function renderDerivativeBlock(d) {
    return ''
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">关联原子指标</label>'
      +   atomMetricPickerHTML(d)
      + '</div>'
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">修饰词配置</label>'
      +   derivativeModifierConfigHTML(d)
      + '</div>'
      + '<div class="ki-form-row">'
      +   '<label class="ki-form-label">单位</label>'
      +   '<div class="ki-unit-chips" data-role="unit-chips">' + unitChipsHTML(d.unit) + '</div>'
      +   '<input class="ki-input" data-bind="unit" maxlength="20" value="' + escapeHTML(d.unit || '') + '" placeholder="自定义单位" />'
      + '</div>';
  }

  function mappingRowsHTML(d) {
    var arr = d.mappings || [];
    if (!arr.length) return '<div class="ki-empty-line">暂无关联，可新增。</div>';
    return arr.map(function (m, idx) {
      return ''
        + '<div class="ki-row-grid" data-idx="' + idx + '">'
        +   '<select class="ki-select-form" data-row-bind="table">' + tableOptions(d.srcId, m.table) + '</select>'
        +   '<select class="ki-select-form" data-row-bind="field">' + fieldOptions(m.table, m.field, true) + '</select>'
        +   '<button type="button" class="ki-row-del" data-act="del-mapping">删除</button>'
        + '</div>';
    }).join('');
  }

  function filterRowsHTML(d) {
    var arr = d.filterValues || [];
    if (!arr.length) return '<div class="ki-empty-line">暂无映射，可新增。</div>';
    return arr.map(function (m, idx) {
      return ''
        + '<div class="ki-row-grid" data-idx="' + idx + '">'
        +   '<input class="ki-input" data-row-bind="alias" value="' + escapeHTML(m.alias || '') + '" placeholder="别名" />'
        +   '<span class="ki-arrow">→</span>'
        +   '<input class="ki-input" data-row-bind="value" value="' + escapeHTML(m.value || '') + '" placeholder="数据库值" />'
        +   '<button type="button" class="ki-row-del" data-act="del-filter">删除</button>'
        + '</div>';
    }).join('');
  }

  function normalizePickerKw(value) {
    return String(value || '').trim().toLowerCase();
  }

  function highlightIndicatorOption(row, kw, titleSelector, detailSelector) {
    var title = $(titleSelector, row);
    var detail = $(detailSelector, row);
    keywordHighlight.apply(title, kw);
    if (!detail) return;
    var original = detail.dataset.keywordLabel ?? detail.textContent;
    detail.dataset.keywordLabel = original;
    var extra = row.dataset.matchDetail || '';
    detail.innerHTML = kw && extra.toLowerCase().includes(kw)
      && !original.toLowerCase().includes(kw) && !title.textContent.toLowerCase().includes(kw)
      ? keywordHighlight.excerptHTML(extra, kw, 24) : keywordHighlight.excerptHTML(original, kw, 24);
  }

  function filterModelPicker(input) {
    var picker = input && input.closest ? input.closest('.ki-model-picker') : null;
    if (!picker) return;
    var kw = normalizePickerKw(input.value);
    var any = false;
    $$('.ki-source-tree-row[data-model-ref]', picker).forEach(function (row) {
      var leaf = row.closest('.ki-source-tree-node');
      var hay = normalizePickerKw(row.getAttribute('data-search') || row.textContent);
      var show = !kw || hay.indexOf(kw) >= 0;
      if (leaf) leaf.classList.toggle('is-filter-hidden', !show);
      highlightIndicatorOption(row, kw, '.ki-source-tree-title', '.ki-source-tree-code');
      if (show) any = true;
    });
    $$('.ki-source-tree-node[data-model-source-id]', picker).forEach(function (node) {
      var hasVisibleTable = $$('.ki-source-tree-row[data-model-ref]', node).some(function (row) {
        var leaf = row.closest('.ki-source-tree-node');
        return !leaf || !leaf.classList.contains('is-filter-hidden');
      });
      node.classList.toggle('is-filter-hidden', !!kw && !hasVisibleTable);
      if (kw && hasVisibleTable) node.classList.remove('is-collapsed');
      var label = $(':scope > button .ki-source-tree-name', node);
      if (label) {
        var name = label.dataset.keywordLabel ?? label.textContent;
        var type = label.dataset.sourceType || '';
        label.dataset.keywordLabel = name;
        label.innerHTML = keywordHighlight.html(name + (kw && type.toLowerCase().includes(kw) ? ' · ' + type : ''), kw);
      }
    });
    $$('.ki-source-tree-node[data-domain-id]', picker).forEach(function (node) {
      var hasVisibleSource = $$('.ki-source-tree-node[data-model-source-id]', node).some(function (sourceNode) {
        return !sourceNode.classList.contains('is-filter-hidden');
      });
      node.classList.toggle('is-filter-hidden', !!kw && !hasVisibleSource);
      if (kw && hasVisibleSource) node.classList.remove('is-collapsed');
      keywordHighlight.apply($(':scope > button .ki-source-tree-name', node), kw);
    });
    var empty = $('.ki-picker-empty', picker);
    if (empty) empty.classList.toggle('hidden', !kw || any);
  }

  function filterFieldPicker(input) {
    var picker = input && input.closest ? input.closest('.ki-field-picker') : null;
    if (!picker) return;
    var kw = normalizePickerKw(input.value);
    var any = false;
    $$('.ki-field-option', picker).forEach(function (row) {
      var hay = normalizePickerKw(row.getAttribute('data-search') || row.textContent);
      var show = !kw || hay.indexOf(kw) >= 0;
      row.classList.toggle('hidden', !show);
      keywordHighlight.apply($('.ki-field-option-name', row), kw);
      if (show) any = true;
    });
    var empty = $('.ki-picker-empty', picker);
    if (empty) empty.classList.toggle('hidden', !kw || any);
  }

  function filterAtomPicker(input) {
    var picker = input && input.closest ? input.closest('.ki-atom-picker') : null;
    if (!picker) return;
    var kw = normalizePickerKw(input.value);
    var any = false;
    $$('.ki-source-tree-row[data-atom-id]', picker).forEach(function (row) {
      var leaf = row.closest('.ki-source-tree-node');
      var hay = normalizePickerKw(row.getAttribute('data-search') || row.textContent);
      var show = !kw || hay.indexOf(kw) >= 0;
      if (leaf) leaf.classList.toggle('is-filter-hidden', !show);
      highlightIndicatorOption(row, kw, '.ki-source-tree-title', '.ki-source-tree-code');
      if (show) any = true;
    });
    $$('.ki-source-tree-node[data-atom-group-id]', picker).forEach(function (node) {
      var hasVisibleAtom = $$('.ki-source-tree-row[data-atom-id]', node).some(function (row) {
        var leaf = row.closest('.ki-source-tree-node');
        return !leaf || !leaf.classList.contains('is-filter-hidden');
      });
      node.classList.toggle('is-filter-hidden', !!kw && !hasVisibleAtom);
      if (kw && hasVisibleAtom) node.classList.remove('is-collapsed');
      keywordHighlight.apply($(':scope > button .ki-source-tree-name', node), kw);
    });
    var empty = $('.ki-picker-empty', picker);
    if (empty) empty.classList.toggle('hidden', !kw || any);
  }

  function syncFormulaHiddenInput() {
    var input = $('#kiDrawer input[data-bind="formula"]');
    if (input && state.drawer.draft) input.value = state.drawer.draft.formula || '';
  }

  function refreshFormulaBuilder() {
    var editor = $('#kiDrawer .ki-formula-editor');
    if (!editor || !state.drawer.draft) return;
    editor.innerHTML = formulaEditorHTML(state.drawer.draft.formula);
    syncFormulaHiddenInput();
  }

  function selectionInsideFormulaEditor(editor) {
    var sel = window.getSelection && window.getSelection();
    return !!(sel && sel.rangeCount && editor && editor.contains(sel.anchorNode));
  }

  function setCaretAfterNode(node) {
    if (!node || !window.getSelection) return;
    var range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function setFormulaCaretToEnd(editor) {
    if (!editor || !window.getSelection) return;
    editor.focus();
    var range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function setFormulaCaretToStart(editor) {
    if (!editor || !window.getSelection) return;
    editor.focus();
    var range = document.createRange();
    range.setStart(editor, 0);
    range.collapse(true);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function formulaContentNodes(editor) {
    return Array.prototype.slice.call(editor.childNodes || []).filter(function (node) {
      if (node.nodeType === 3) return String(node.textContent || '').trim();
      return !(node.classList && node.classList.contains('ki-formula-placeholder'));
    });
  }

  function setFormulaCaretFromPoint(editor, event) {
    if (!editor || !event || !window.getSelection) return;
    editor.focus();
    var contentNodes = formulaContentNodes(editor);
    if (contentNodes.length) {
      var firstRect = contentNodes[0].getBoundingClientRect && contentNodes[0].getBoundingClientRect();
      var lastNode = contentNodes[contentNodes.length - 1];
      var lastRect = lastNode.getBoundingClientRect && lastNode.getBoundingClientRect();
      if (firstRect && event.clientX <= firstRect.left) {
        setFormulaCaretToStart(editor);
        return;
      }
      if (lastRect && (event.clientX >= lastRect.right || event.clientY > lastRect.bottom)) {
        setFormulaCaretToEnd(editor);
        return;
      }
    }
    var range = null;
    if (document.caretPositionFromPoint) {
      var pos = document.caretPositionFromPoint(event.clientX, event.clientY);
      if (pos && editor.contains(pos.offsetNode)) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
      }
    } else if (document.caretRangeFromPoint) {
      var pointRange = document.caretRangeFromPoint(event.clientX, event.clientY);
      if (pointRange && editor.contains(pointRange.startContainer)) {
        range = pointRange;
      }
    }
    if (!range) {
      setFormulaCaretToEnd(editor);
      return;
    }
    range.collapse(true);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function createFormulaNode(value, isAtom) {
    var span = document.createElement('span');
    span.setAttribute('data-formula-token', value);
    if (isAtom || isFormulaMetricToken(value)) {
      span.className = 'ki-formula-token';
      span.contentEditable = 'false';
      span.appendChild(document.createTextNode(value));
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ki-formula-token-remove';
      btn.setAttribute('data-act', 'remove-formula-part');
      btn.setAttribute('aria-label', '删除' + value);
      btn.textContent = 'x';
      span.appendChild(btn);
    } else if (FORMULA_OPERATORS.indexOf(value) >= 0 || value === '()' || value === '[]') {
      span.className = 'ki-formula-op';
      span.textContent = value;
    } else if (isFormulaFunctionToken(value)) {
      span.className = 'ki-formula-fn';
      span.textContent = value.replace('()', '');
    } else {
      span.className = 'ki-formula-text';
      span.textContent = value;
    }
    return span;
  }

  function removeFormulaPlaceholder(editor) {
    var placeholder = editor && editor.querySelector('.ki-formula-placeholder');
    if (placeholder) placeholder.remove();
  }

  function syncFormulaFromEditor(editor) {
    if (!state.drawer.draft || !editor) return;
    state.drawer.draft.formula = formulaFromEditor(editor);
    syncFormulaHiddenInput();
  }

  function formulaTextBeforeCaretFromFragment(editor) {
    var sel = window.getSelection && window.getSelection();
    if (!sel || !sel.rangeCount || !selectionInsideFormulaEditor(editor)) return '';
    var range = sel.getRangeAt(0).cloneRange();
    var pre = range.cloneRange();
    pre.selectNodeContents(editor);
    pre.setEnd(range.endContainer, range.endOffset);
    return pre.toString().replace(/\u00a0/g, ' ');
  }

  function setFormulaCaretAfterTokenIndex(editor, index) {
    var nodes = formulaContentNodes(editor);
    if (!nodes.length) {
      setFormulaCaretToEnd(editor);
      return;
    }
    var node = nodes[Math.max(0, Math.min(index, nodes.length - 1))];
    setCaretAfterNode(node);
  }

  function normalizeFormulaEditor(editor) {
    if (!editor || !state.drawer.draft) return;
    if (currentFormulaTrigger(editor)) return;
    var beforeText = formulaTextBeforeCaretFromFragment(editor);
    var formula = formulaFromEditor(editor);
    state.drawer.draft.formula = formula;
    editor.innerHTML = formulaEditorHTML(formula);
    syncFormulaHiddenInput();
    var beforeCount = formulaParts(beforeText).length;
    if (beforeCount <= 0) setFormulaCaretToStart(editor);
    else setFormulaCaretAfterTokenIndex(editor, beforeCount - 1);
  }

  function insertFormulaPart(value, isAtom) {
    if (!state.drawer.draft || !value) return;
    var editor = $('#kiDrawer .ki-formula-editor');
    if (!editor) {
      var parts = formulaParts(state.drawer.draft.formula);
      parts.push(value);
      state.drawer.draft.formula = joinFormulaParts(parts);
      return;
    }
    editor.focus();
    removeFormulaPlaceholder(editor);
    var node = createFormulaNode(value, !!isAtom);
    var spacer = document.createTextNode(' ');
    var frag = document.createDocumentFragment();
    frag.appendChild(node);
    frag.appendChild(spacer);
    var sel = window.getSelection && window.getSelection();
    var range;
    if (selectionInsideFormulaEditor(editor)) {
      range = sel.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    range.deleteContents();
    range.insertNode(frag);
    setCaretAfterNode(spacer);
    syncFormulaFromEditor(editor);
  }

  function appendFormulaPart(value) {
    insertFormulaPart(value, !!formulaAtomByName(value));
  }

  function removeFormulaPart(index) {
    if (!state.drawer.draft) return;
    var parts = formulaParts(state.drawer.draft.formula);
    parts.splice(index, 1);
    state.drawer.draft.formula = joinFormulaParts(parts);
    refreshFormulaBuilder();
  }

  function formulaFromEditor(editor) {
    var parts = [];
    Array.prototype.slice.call(editor.childNodes || []).forEach(function (node) {
      if (node.nodeType === 3) {
        formulaParts(node.textContent || '').forEach(function (part) { parts.push(part); });
        return;
      }
      if (node.nodeType !== 1) return;
      if (node.classList && node.classList.contains('ki-formula-placeholder')) return;
      var token = node.getAttribute && node.getAttribute('data-formula-token');
      if (token) {
        parts.push(token);
        return;
      }
      formulaParts(node.textContent || '').forEach(function (part) {
        if (part && part !== 'x') parts.push(part);
      });
    });
    return joinFormulaParts(parts);
  }

  function formulaTextBeforeCaret(editor) {
    var sel = window.getSelection && window.getSelection();
    if (!sel || !sel.rangeCount || !selectionInsideFormulaEditor(editor)) return '';
    var range = sel.getRangeAt(0).cloneRange();
    var pre = range.cloneRange();
    pre.selectNodeContents(editor);
    pre.setEnd(range.endContainer, range.endOffset);
    return pre.toString().replace(/\u00a0/g, ' ');
  }

  function currentFormulaTrigger(editor) {
    var before = formulaTextBeforeCaret(editor);
    var explicit = before.match(/@([\u4e00-\u9fa5a-zA-Z0-9_]*)$/);
    if (explicit) {
      return { query: explicit[1], length: explicit[0].length, explicit: true };
    }
    return null;
  }

  function formulaCaretRect(editor) {
    var sel = window.getSelection && window.getSelection();
    if (!sel || !sel.rangeCount || !selectionInsideFormulaEditor(editor)) return null;
    var range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);
    var rect = range.getClientRects()[0] || range.getBoundingClientRect();
    if (rect && (rect.width || rect.height)) return rect;
    var marker = document.createElement('span');
    marker.textContent = '\u200b';
    range.insertNode(marker);
    rect = marker.getBoundingClientRect();
    marker.remove();
    return rect;
  }

  function positionFormulaSuggest(editor, suggest) {
    if (!editor || !suggest) return;
    var wrap = editor.closest('.ki-formula-editor-wrap');
    var wrapRect = wrap ? wrap.getBoundingClientRect() : editor.getBoundingClientRect();
    var rect = formulaCaretRect(editor) || editor.getBoundingClientRect();
    var maxLeft = Math.max(8, wrapRect.width - 372);
    var left = Math.max(8, Math.min(rect.left - wrapRect.left, maxLeft));
    var top = Math.max(40, rect.bottom - wrapRect.top + 6);
    suggest.style.left = left + 'px';
    suggest.style.right = 'auto';
    suggest.style.top = top + 'px';
  }

  function visibleFormulaOptions(suggest) {
    return $$('.ki-formula-atom-option', suggest).filter(function (row) {
      return !row.classList.contains('hidden');
    });
  }

  function setFormulaSuggestActive(suggest, nextIndex) {
    var rows = visibleFormulaOptions(suggest);
    rows.forEach(function (row) { row.classList.remove('is-active'); });
    if (!rows.length) return;
    var index = ((nextIndex % rows.length) + rows.length) % rows.length;
    rows[index].classList.add('is-active');
    rows[index].scrollIntoView({ block: 'nearest' });
  }

  function activeFormulaOption(suggest) {
    return $('.ki-formula-atom-option.is-active:not(.hidden)', suggest) || visibleFormulaOptions(suggest)[0] || null;
  }

  function filterFormulaSuggest(editor) {
    if (!editor) return;
    var suggest = editor.parentElement && $('[data-role="formula-suggest"]', editor.parentElement);
    if (!suggest) return;
    var trigger = currentFormulaTrigger(editor);
    if (!trigger || (!trigger.explicit && !trigger.query)) {
      suggest.classList.add('hidden');
      return;
    }
    suggest.classList.remove('hidden');
    positionFormulaSuggest(editor, suggest);
    var kw = normalizePickerKw(trigger.query);
    var visible = 0;
    $$('.ki-formula-atom-option', suggest).forEach(function (row) {
      var hay = normalizePickerKw(row.getAttribute('data-search') || row.textContent);
      var show = !kw || hay.indexOf(kw) >= 0;
      row.classList.toggle('hidden', !show);
      highlightIndicatorOption(row, kw, 'span', 'em');
      if (show) visible++;
    });
    var empty = $('.ki-formula-empty', suggest);
    if (empty) empty.classList.toggle('hidden', visible > 0);
    setFormulaSuggestActive(suggest, 0);
  }

  function removeFormulaTriggerText(editor) {
    var trigger = currentFormulaTrigger(editor);
    var sel = window.getSelection && window.getSelection();
    if (!trigger || !sel || !sel.rangeCount || !selectionInsideFormulaEditor(editor)) return;
    var node = sel.anchorNode;
    if (!node || node.nodeType !== 3) return;
    var offset = sel.anchorOffset;
    var start = Math.max(0, offset - trigger.length);
    node.textContent = node.textContent.slice(0, start) + node.textContent.slice(offset);
    var range = document.createRange();
    range.setStart(node, start);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function insertFormulaAtomFromSuggest(atom) {
    var editor = $('#kiDrawer .ki-formula-editor');
    if (!editor || !atom) return;
    removeFormulaTriggerText(editor);
    insertFormulaPart(atom.name, true);
    var suggest = editor.parentElement && $('[data-role="formula-suggest"]', editor.parentElement);
    if (suggest) suggest.classList.add('hidden');
  }

  // ---------- 8c) 抽屉事件 ----------
  function bindDrawer() {
    var drawer = $('#kiDrawer');
    var mask = $('#kiDrawerMask');
    if (!drawer) return;
    if (mask) mask.addEventListener('click', function () {
      // 编辑/新增有未保存内容时不直接关闭
      if (state.drawer.mode === 'edit' || state.drawer.mode === 'create') {
        // 简化：直接关闭（原型）
      }
      closeDrawer();
    });

    drawer.addEventListener('click', function (e) {
      var formulaRemove = e.target.closest && e.target.closest('[data-act="remove-formula-part"]');
      if (formulaRemove) {
        e.preventDefault();
        e.stopPropagation();
        var tokenEl = formulaRemove.closest('.ki-formula-token');
        var editorEl = formulaRemove.closest('.ki-formula-editor');
        if (tokenEl) tokenEl.remove();
        syncFormulaFromEditor(editorEl || $('#kiDrawer .ki-formula-editor'));
        return;
      }

      var formulaAtom = e.target.closest && e.target.closest('.ki-formula-atom-option[data-formula-atom-id]');
      if (formulaAtom) {
        e.preventDefault();
        var atom = findAtomIndicatorById(formulaAtom.getAttribute('data-formula-atom-id'));
        if (atom) {
          insertFormulaAtomFromSuggest(atom);
        }
        return;
      }

      var formulaTool = e.target.closest && e.target.closest('[data-act="insert-formula-op"], [data-act="insert-formula-fn"]');
      if (formulaTool) {
        e.preventDefault();
        appendFormulaPart(formulaTool.getAttribute('data-formula-value') || '');
        return;
      }

      var clearFormula = e.target.closest && e.target.closest('[data-act="clear-formula"]');
      if (clearFormula) {
        e.preventDefault();
        if (state.drawer.draft) {
          state.drawer.draft.formula = '';
          refreshFormulaBuilder();
        }
        return;
      }

      var formulaEditor = e.target.closest && e.target.closest('[data-role="formula-editor"]');
      if (formulaEditor) {
        if (!e.target.closest('.ki-formula-token') && !e.target.closest('.ki-formula-token-remove')) {
          setFormulaCaretFromPoint(formulaEditor, e);
        }
        removeFormulaPlaceholder(formulaEditor);
        filterFormulaSuggest(formulaEditor);
      }

      var sourceBtn = e.target.closest && e.target.closest('[data-act="toggle-source-tree"], [data-act="toggle-model-tree"], [data-act="toggle-field-picker"], [data-act="toggle-atom-picker"]');
      if (sourceBtn) {
        e.stopPropagation();
        var sourceWrap = sourceBtn.closest('.ki-source-picker');
        $$('.ki-source-picker.is-open', drawer).forEach(function (el) {
          if (el !== sourceWrap) el.classList.remove('is-open');
        });
        if (sourceWrap) {
          var isOpen = !sourceWrap.classList.contains('is-open');
          sourceWrap.classList.toggle('is-open', isOpen);
          sourceBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
        return;
      }

      var sourceToggle = e.target.closest && e.target.closest('.ki-source-tree-row.is-domain, .ki-source-tree-toggle');
      if (sourceToggle) {
        var domainRow = e.target.closest('.ki-source-tree-row.is-domain');
        if (domainRow) {
          e.stopPropagation();
          var domainNode = domainRow.closest('.ki-source-tree-node');
          if (domainNode) domainNode.classList.toggle('is-collapsed');
          return;
        }
      }

      var sourceRow = e.target.closest && e.target.closest('.ki-source-tree-row[data-src-id]');
      if (sourceRow && state.drawer.draft) {
        e.stopPropagation();
        var nextSrcId = sourceRow.getAttribute('data-src-id');
        var dft = state.drawer.draft;
        if (dft.srcId !== nextSrcId) {
          dft.srcId = nextSrcId;
          dft.modelRef = '';
          dft.table = '';
          dft.field = '';
          dft.timeField = '';
          dft.functionExpr = dft.agg === CUSTOM_AGG_KEY ? '' : aggExpression(dft.agg || 'SUM', dft.field);
          dft.mappings = (dft.mappings || []).map(function () { return { table: '', field: '' }; });
        }
        renderDrawer();
        return;
      }

      var modelRow = e.target.closest && e.target.closest('.ki-source-tree-row[data-model-ref]');
      if (modelRow && state.drawer.draft) {
        e.stopPropagation();
        var modelInfo = findModelInfo(modelRow.getAttribute('data-model-ref'));
        if (modelInfo) {
          var draft = state.drawer.draft;
          draft.modelRef = modelInfo.ref;
          draft.srcId = modelInfo.srcId;
          draft.table = modelInfo.table;
          draft.field = '';
          draft.timeField = '';
          draft.functionExpr = draft.agg === CUSTOM_AGG_KEY ? '' : aggExpression(draft.agg || 'SUM', draft.field);
          renderDrawer();
        }
        return;
      }

      var fieldRow = e.target.closest && e.target.closest('.ki-field-option[data-field]');
      if (fieldRow && state.drawer.draft) {
        e.stopPropagation();
        var field = fieldRow.getAttribute('data-field');
        state.drawer.draft.field = field;
        syncAtomFunctionExpr(state.drawer.draft);
        renderDrawer();
        return;
      }

      var atomRow = e.target.closest && e.target.closest('.ki-source-tree-row[data-atom-id]');
      if (atomRow && state.drawer.draft) {
        e.stopPropagation();
        var atom = findAtomIndicatorById(atomRow.getAttribute('data-atom-id'));
        if (atom) {
          state.drawer.draft.relatedAtomId = atom.id;
          state.drawer.draft.srcId = atom.srcId || state.drawer.draft.srcId;
          state.drawer.draft.unit = atom.unit || state.drawer.draft.unit || '';
          renderDrawer();
        }
        return;
      }

      var modifierField = e.target.closest && e.target.closest('.ki-derivative-field[data-mod-field]');
      if (modifierField && state.drawer.draft) {
        e.stopPropagation();
        var fieldName = modifierField.getAttribute('data-mod-field') || '';
        if (fieldName) {
          var current = derivativeModifierText(state.drawer.draft).trim();
          var nextLine = fieldName + '=';
          state.drawer.draft.modifier = current ? (current.replace(/[；;]?\s*$/, '；\n') + nextLine) : nextLine;
          renderDrawer();
          var modifierInput = drawer.querySelector('textarea[data-bind="modifier"]');
          if (modifierInput) {
            modifierInput.focus();
            modifierInput.setSelectionRange(modifierInput.value.length, modifierInput.value.length);
          }
        }
        return;
      }

      var modifierExample = e.target.closest && e.target.closest('.ki-modifier-example[data-mod-example]');
      if (modifierExample && state.drawer.draft) {
        e.stopPropagation();
        state.drawer.draft.modifier = modifierExample.getAttribute('data-mod-example') || '';
        renderDrawer();
        return;
      }

      if (!(e.target.closest && e.target.closest('.ki-source-picker'))) {
        $$('.ki-source-picker.is-open', drawer).forEach(function (el) { el.classList.remove('is-open'); });
      }
      if (!(e.target.closest && e.target.closest('.ki-formula-builder'))) {
        $$('.ki-formula-suggest', drawer).forEach(function (el) { el.classList.add('hidden'); });
      }

      var act = e.target.closest && e.target.closest('[data-act]');
      if (act) {
        var role = act.getAttribute('data-act');
        if (role === 'close' || role === 'cancel') { closeDrawer(); return; }
        if (role === 'switch-edit') {
          state.drawer.mode = 'edit';
          renderDrawer();
          return;
        }
        if (role === 'save') { saveDraft(); return; }
        if (role === 'add-mapping') { addMapping(); return; }
        if (role === 'add-filter') { addFilter(); return; }
        if (role === 'del-mapping') {
          var rowM = act.closest('.ki-row-grid');
          if (rowM) delMapping(parseInt(rowM.getAttribute('data-idx'), 10));
          return;
        }
        if (role === 'del-filter') {
          var rowF = act.closest('.ki-row-grid');
          if (rowF) delFilter(parseInt(rowF.getAttribute('data-idx'), 10));
          return;
        }
      }
      // chip 点击
      var chip = e.target.closest && e.target.closest('.ki-chip');
      if (chip) {
        if (chip.hasAttribute('data-unit')) {
          state.drawer.draft.unit = chip.getAttribute('data-unit');
          renderDrawer();
        } else if (chip.hasAttribute('data-tpl')) {
          var key = chip.getAttribute('data-tpl');
          state.drawer.draft.timeTplKey = key;
          var preset = null;
          for (var i = 0; i < TIME_TPL_PRESETS.length; i++) {
            if (TIME_TPL_PRESETS[i].key === key) { preset = TIME_TPL_PRESETS[i]; break; }
          }
          if (preset) state.drawer.draft.timeFormula = preset.formula;
          renderDrawer();
        }
      }
    });

    drawer.addEventListener('mousedown', function (e) {
      if (e.target.closest && e.target.closest('.ki-formula-toolbar button')) {
        e.preventDefault();
      }
    });

    drawer.addEventListener('keydown', function (e) {
      var formulaEditor = e.target.closest && e.target.closest('[data-role="formula-editor"]');
      if (!formulaEditor) return;
      var suggest = formulaEditor.parentElement && $('[data-role="formula-suggest"]', formulaEditor.parentElement);
      if (!suggest || suggest.classList.contains('hidden')) return;
      var rows = visibleFormulaOptions(suggest);
      if (!rows.length && e.key !== 'Escape') return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var current = rows.findIndex(function (row) { return row.classList.contains('is-active'); });
        setFormulaSuggestActive(suggest, current + (e.key === 'ArrowDown' ? 1 : -1));
        return;
      }
      if (e.key === 'Enter') {
        var option = activeFormulaOption(suggest);
        if (!option) return;
        e.preventDefault();
        var atom = findAtomIndicatorById(option.getAttribute('data-formula-atom-id'));
        if (atom) insertFormulaAtomFromSuggest(atom);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        suggest.classList.add('hidden');
      }
    });

    // input/change 双向绑定
    drawer.addEventListener('input', function (e) {
      handleBindInput(e);
    });
    drawer.addEventListener('change', function (e) {
      handleBindInput(e);
    });
    drawer.addEventListener('focusout', function (e) {
      var formulaEditor = e.target.closest && e.target.closest('[data-role="formula-editor"]');
      if (formulaEditor && state.drawer.draft) {
        state.drawer.draft.formula = formulaFromEditor(formulaEditor);
        normalizeFormulaEditor(formulaEditor);
      }
    });

    bindIndicatorDrawerResize(drawer, $('#kiDrawerResize'), 420);
  }

  function bindIndicatorDrawerResize(drawer, grip, minWidth) {
    if (!grip) return;
    var drag = null;
    grip.addEventListener('pointerdown', function (event) {
      if (drag || !event.isPrimary || event.button !== 0) return;
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: drawer.getBoundingClientRect().width,
        cursor: document.body.style.cursor,
        userSelect: document.body.style.userSelect
      };
      grip.setPointerCapture(drag.pointerId);
      grip.classList.add('dragging');
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      event.preventDefault();
    });
    grip.addEventListener('pointermove', function (event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      var width = drag.startWidth + drag.startX - event.clientX;
      drawer.style.width = Math.min(window.innerWidth * 0.92, Math.max(minWidth, width)) + 'px';
    });
    grip.addEventListener('lostpointercapture', function (event) {
      if (!drag || event.pointerId !== drag.pointerId) return;
      grip.classList.remove('dragging');
      document.body.style.cursor = drag.cursor;
      document.body.style.userSelect = drag.userSelect;
      drag = null;
    });
  }

  function handleBindInput(e) {
    var el = e.target;
    if (!el || !state.drawer.draft) return;
    var role = el.getAttribute && el.getAttribute('data-role');
    if (role === 'model-search') {
      filterModelPicker(el);
      return;
    }
    if (role === 'field-search') {
      filterFieldPicker(el);
      return;
    }
    if (role === 'atom-search') {
      filterAtomPicker(el);
      return;
    }
    if (role === 'formula-editor') {
      removeFormulaPlaceholder(el);
      state.drawer.draft.formula = formulaFromEditor(el);
      syncFormulaHiddenInput();
      filterFormulaSuggest(el);
      return;
    }
    var d = state.drawer.draft;
    var bind = el.getAttribute && el.getAttribute('data-bind');
    if (bind) {
      if (el.type === 'checkbox') {
        d[bind] = !!el.checked;
        if (bind === 'isTimeDim') renderDrawer();
        return;
      }
      var val = el.value;
      d[bind] = val;
      if (bind === 'type') {
        // 类型切换：保留通用字段，重置类型特定字段
        normalizeDraftByType(d);
        renderDrawer();
        return;
      }
      if (bind === 'srcId') {
        // 数据源切换：清空表/字段，重新刷新表选项
        d.modelRef = '';
        d.table = '';
        d.field = '';
        d.timeField = '';
        d.functionExpr = d.agg === CUSTOM_AGG_KEY ? '' : aggExpression(d.agg || 'SUM', d.field);
        d.mappings = (d.mappings || []).map(function () { return { table: '', field: '' }; });
        renderDrawer();
        return;
      }
      if (bind === 'table') {
        if (d.type === 'atom') d.modelRef = makeModelRef(d.srcId, d.table);
        d.field = '';
        d.timeField = '';
        d.functionExpr = d.agg === CUSTOM_AGG_KEY ? '' : aggExpression(d.agg || 'SUM', d.field);
        renderDrawer();
        return;
      }
      if (bind === 'field') {
        syncAtomFunctionExpr(d);
        renderDrawer();
        return;
      }
      if (bind === 'agg') {
        d.functionExpr = val === CUSTOM_AGG_KEY ? '' : aggExpression(val, d.field);
        renderDrawer();
        return;
      }
      if (bind === 'functionExpr') {
        if (d.agg !== CUSTOM_AGG_KEY) syncAtomFunctionExpr(d);
        return;
      }
      if (bind === 'unit') {
        // 同步 chip 选中态
        renderDrawer();
        return;
      }
      return;
    }
    // 行级：mapping / filter
    var row = el.closest && el.closest('.ki-row-grid');
    if (row) {
      var idx = parseInt(row.getAttribute('data-idx'), 10);
      var rb = el.getAttribute && el.getAttribute('data-row-bind');
      var parent = row.parentElement;
      if (!parent || !rb) return;
      var role = parent.getAttribute('data-role');
      if (role === 'mapping-rows') {
        var m = d.mappings[idx];
        if (!m) return;
        m[rb] = el.value;
        if (rb === 'table') { m.field = ''; renderDrawer(); }
        return;
      }
      if (role === 'filter-rows') {
        var fv = d.filterValues[idx];
        if (!fv) return;
        fv[rb] = el.value;
      }
    }
  }

  function normalizeDraftByType(d) {
    if (d.type === 'atom') {
      d.formula = '';
      d.modifier = '';
      d.relatedAtomId = '';
      d.isTimeDim = false;
      d.timeFormula = '';
      d.timeTplKey = '';
      d.mappings = [];
      d.filterValues = [];
      if (typeof d.defaultFilterSql !== 'string') d.defaultFilterSql = '';
      if (!d.agg) d.agg = 'SUM';
      if (!d.modelRef && d.srcId && d.table) d.modelRef = makeModelRef(d.srcId, d.table);
      syncAtomFunctionExpr(d);
    } else if (d.type === 'derived') {
      d.modifier = '';
      d.relatedAtomId = '';
      d.modelRef = '';
      d.table = '';
      d.field = '';
      d.agg = '';
      d.functionExpr = '';
      d.timeField = '';
      d.isTimeDim = false;
      d.timeFormula = '';
      d.timeTplKey = '';
      d.mappings = [];
      d.filterValues = [];
      d.defaultFilterSql = '';
    } else {
      d.formula = '';
      d.modelRef = '';
      d.table = '';
      d.field = '';
      d.agg = '';
      d.functionExpr = '';
      d.timeField = '';
      d.isTimeDim = false;
      d.timeFormula = '';
      d.timeTplKey = '';
      d.mappings = [];
      d.filterValues = [];
      d.defaultFilterSql = '';
    }
  }

  function addMapping() {
    var d = state.drawer.draft;
    if (!d.mappings) d.mappings = [];
    d.mappings.push({ table: '', field: '' });
    renderDrawer();
  }
  function delMapping(idx) {
    var d = state.drawer.draft;
    if (!d.mappings || isNaN(idx)) return;
    d.mappings.splice(idx, 1);
    renderDrawer();
  }
  function addFilter() {
    var d = state.drawer.draft;
    if (!d.filterValues) d.filterValues = [];
    d.filterValues.push({ alias: '', value: '' });
    renderDrawer();
  }
  function delFilter(idx) {
    var d = state.drawer.draft;
    if (!d.filterValues || isNaN(idx)) return;
    d.filterValues.splice(idx, 1);
    renderDrawer();
  }

  function saveDraft() {
    var d = state.drawer.draft;
    if (!d) return;
    if (!(d.name || '').trim()) {
      if (typeof showToast === 'function') showToast('请输入指标名称');
      return;
    }
    if (d.type !== 'atom' && d.type !== 'derived') {
      d.type = 'derived';
    }
    normalizeDraftByType(d);
    if (d.type === 'atom') {
      var modelInfo = findModelInfo(effectiveModelRef(d));
      if (!modelInfo) {
        if (typeof showToast === 'function') showToast('请选择数据模型');
        return;
      }
      d.modelRef = modelInfo.ref;
      d.srcId = modelInfo.srcId;
      d.table = modelInfo.table;
      if (!d.field) {
        if (typeof showToast === 'function') showToast('请选择字段');
        return;
      }
      if (d.agg === CUSTOM_AGG_KEY && !(d.functionExpr || '').trim()) {
        if (typeof showToast === 'function') showToast('请输入函数表达式');
        return;
      }
      syncAtomFunctionExpr(d);
    } else if (!(d.formula || '').trim()) {
      if (typeof showToast === 'function') showToast('请输入计算公式');
      return;
    }
    if (state.drawer.mode === 'create') {
      d.id = uid('i');
      d.updatedAt = todayStr();
      INDICATORS.push(d);
      if (typeof showToast === 'function') showToast('已新增：' + d.name);
    } else {
      var orig = findIndicatorById(state.drawer.indicatorId);
      if (orig) {
        Object.keys(d).forEach(function (k) { orig[k] = d[k]; });
        orig.updatedAt = todayStr();
      }
      if (typeof showToast === 'function') showToast('已保存：' + d.name);
    }
    closeDrawer();
    renderTree();
    renderBread();
    renderList();
  }

  function todayStr() {
    var d = new Date();
    function pad(n) { return n < 10 ? '0' + n : n; }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // ---------- 自动指标分析 ----------
  // 原型推荐规则使用指标编辑器同一份表字段字典。
  var indicatorAnalysisRules = {
    ds_sales: [
      ['销售额', 'sales_order', 'sales_amount', 'SUM', '元'],
      ['销售订单数', 'sales_order', 'order_id', 'COUNT_DISTINCT', '单', 'order_date'],
      ['成交客户数', 'sales_order', 'customer_id', 'COUNT_DISTINCT', '个', 'order_date'],
      ['商品销售数量', 'sales_order_item', 'quantity', 'SUM', '件'],
      ['成交商品数', 'sales_order_item', 'product_id', 'COUNT_DISTINCT', '种'],
      ['出单渠道数', 'sales_order', 'channel_id', 'COUNT_DISTINCT', '个', 'order_date'],
      ['注册客户数', 'customer', 'customer_id', 'COUNT_DISTINCT', '人', 'register_date']
    ],
    ds_order_svc: [
      ['订单支付金额', 'order_pay', 'pay_amount', 'SUM', '元', 'pay_time'],
      ['支付订单数', 'order_pay', 'order_id', 'COUNT_DISTINCT', '单', 'pay_time'],
      ['订单退款金额', 'order_refund', 'refund_amount', 'SUM', '元', 'refund_time'],
      ['退款订单数', 'order_refund', 'order_id', 'COUNT_DISTINCT', '单', 'refund_time'],
      ['支付流水笔数', 'order_pay', 'pay_id', 'COUNT_DISTINCT', '笔', 'pay_time'],
      ['退款流水笔数', 'order_refund', 'refund_id', 'COUNT_DISTINCT', '笔', 'refund_time'],
      ['发生支付的渠道数', 'order_pay', 'pay_channel', 'COUNT_DISTINCT', '个', 'pay_time']
    ],
    ds_cdw: [
      ['客户总数', 'customer_master', 'customer_id', 'COUNT_DISTINCT', '个'],
      ['已打标客户数', 'customer_tag', 'customer_id', 'COUNT_DISTINCT', '个'],
      ['已分群客户数', 'customer_segment', 'customer_id', 'COUNT_DISTINCT', '个'],
      ['客户标签关联记录数', 'customer_tag', 'customer_id', 'COUNT', '条'],
      ['客户分群归属记录数', 'customer_segment', 'customer_id', 'COUNT', '条'],
      ['已使用的标签数', 'customer_tag', 'tag', 'COUNT_DISTINCT', '个'],
      ['有归属记录的分群数', 'customer_segment', 'segment', 'COUNT_DISTINCT', '个']
    ],
    ds_crm: [
      ['新增线索数', 'crm_lead', 'lead_id', 'COUNT_DISTINCT', '条', 'created_at'],
      ['CRM 客户数', 'crm_account', 'account_id', 'COUNT_DISTINCT', '个'],
      ['客户跟进次数', 'crm_activity', 'activity_id', 'COUNT_DISTINCT', '次', 'activity_time'],
      ['已跟进客户数', 'crm_activity', 'account_id', 'COUNT_DISTINCT', '个', 'activity_time'],
      ['线索负责人数', 'crm_lead', 'owner_id', 'COUNT_DISTINCT', '人', 'created_at'],
      ['线索来源渠道数', 'crm_lead', 'source', 'COUNT_DISTINCT', '个', 'created_at'],
      ['跟进活动类型数', 'crm_activity', 'activity_type', 'COUNT_DISTINCT', '种', 'activity_time']
    ],
    ds_inventory: [
      ['库存流水笔数', 'inventory_log', 'log_id', 'COUNT_DISTINCT', '笔', 'created_time'],
      ['库存变动数量', 'inventory_log', 'qty', 'SUM', '件', 'created_time'],
      ['有库存记录的 SKU 数', 'inventory_snapshot', 'sku_id', 'COUNT_DISTINCT', '种', 'snapshot_date'],
      ['有库存变动的 SKU 数', 'inventory_log', 'sku_id', 'COUNT_DISTINCT', '种', 'created_time'],
      ['发生库存变动的仓库数', 'inventory_log', 'warehouse_id', 'COUNT_DISTINCT', '座', 'created_time'],
      ['有库存记录的仓库数', 'inventory_snapshot', 'warehouse_id', 'COUNT_DISTINCT', '座', 'snapshot_date'],
      ['库存管理仓库数', 'warehouse_dim', 'warehouse_id', 'COUNT_DISTINCT', '座']
    ],
    ds_finance: [
      ['应收金额', 'ar_master', 'amount', 'SUM', '元', 'due_date'],
      ['应付金额', 'ap_master', 'amount', 'SUM', '元', 'due_date'],
      ['入账账户数', 'gl_detail', 'account_id', 'COUNT_DISTINCT', '个', 'period'],
      ['应收记录数', 'ar_master', 'ar_id', 'COUNT_DISTINCT', '笔', 'due_date'],
      ['应付记录数', 'ap_master', 'ap_id', 'COUNT_DISTINCT', '笔', 'due_date'],
      ['总账金额合计', 'gl_detail', 'amount', 'SUM', '元', 'period'],
      ['入账会计期间数', 'gl_detail', 'period', 'COUNT_DISTINCT', '期', 'period']
    ],
    ds_realtime: [
      ['埋点事件数', 'event_track', 'event_id', 'COUNT_DISTINCT', '次', 'event_time'],
      ['访问用户数', 'event_track', 'user_id', 'COUNT_DISTINCT', '人', 'event_time'],
      ['页面访问次数', 'page_view_daily', 'visit_count', 'SUM', '次', 'biz_date'],
      ['有访问记录的页面数', 'page_view_daily', 'page_id', 'COUNT_DISTINCT', '个', 'biz_date'],
      ['有访问记录的天数', 'page_view_daily', 'biz_date', 'COUNT_DISTINCT', '天', 'biz_date'],
      ['活跃埋点事件类型数', 'event_track', 'event_name', 'COUNT_DISTINCT', '种', 'event_time'],
      ['启动活动数', 'campaign_dim', 'campaign_id', 'COUNT_DISTINCT', '个', 'start_date']
    ],
    ds_metric: [
      ['非招成交金额', 'non_bidding_project_info', 'deal_amount_10k_yuan', 'SUM', '万元', 'deal_notice_sent_date', "procurement_method = '非招标'\nAND deal_notice_sent_date IS NOT NULL"],
      ['招标成交金额', 'bidding_project_info', 'bidding_amount', 'SUM', '万元', 'service_fee_collection_time', 'service_fee_collection_time IS NOT NULL\nAND bidding_amount > 0'],
      ['非招成交项目数', 'non_bidding_project_info', 'project_code', 'COUNT_DISTINCT', '个', 'deal_notice_sent_date', "procurement_method = '非招标'\nAND deal_notice_sent_date IS NOT NULL"],
      ['招标项目数', 'bidding_project_info', 'project_id', 'COUNT_DISTINCT', '个', 'service_fee_collection_time', 'service_fee_collection_time IS NOT NULL'],
      ['非招服务费项目数', 'non_bidding_fee_detail', 'project_id', 'COUNT_DISTINCT', '个', 'service_fee_payment_time'],
      ['招标平台服务费项目数', 'platform_service_fee_detail', 'project_id', 'COUNT_DISTINCT', '个', 'service_fee_collection_time'],
      ['电商交易金额', 'ecommerce_trade_detail', 'trade_amount', 'SUM', '元', 'acceptance_time'],
      ['电商交易笔数', 'ecommerce_trade_detail', 'trade_amount', 'COUNT', '笔', 'acceptance_time'],
      ['电商交易品类数', 'ecommerce_trade_detail', 'category', 'COUNT_DISTINCT', '类', 'acceptance_time'],
      ['CA 付费记录数', 'ca_fee_detail', 'ca_fee_amount', 'COUNT', '笔', 'payment_time'],
      ['CA 付费证书类型数', 'ca_fee_detail', 'cert_type', 'COUNT_DISTINCT', '种', 'payment_time']
    ]
  };

  var indicatorDerivedRules = {
    ds_sales: [
      ['销售客单价', 'ROUND(销售额 / 销售订单数, 2)', ['销售额', '销售订单数'], '元/单', '每笔销售订单的平均金额。'],
      ['成交客户平均销售额', 'ROUND(销售额 / 成交客户数, 2)', ['销售额', '成交客户数'], '元/人', '每位成交客户贡献的平均销售额。'],
      ['成交客户平均下单量', 'ROUND(销售订单数 / 成交客户数, 2)', ['销售订单数', '成交客户数'], '单/人', '统计期内每位成交客户平均下单数。'],
      ['出单渠道平均销售额', 'ROUND(销售额 / 出单渠道数, 2)', ['销售额', '出单渠道数'], '元/渠道', '统计期内每个出单渠道贡献的平均销售额。']
    ],
    ds_order_svc: [
      ['退款订单占比', 'ROUND(退款订单数 / 支付订单数 * 100, 2)', ['退款订单数', '支付订单数'], '%', '统计期内退款订单数占支付订单数的比例。'],
      ['笔均支付金额', 'ROUND(订单支付金额 / 支付流水笔数, 2)', ['订单支付金额', '支付流水笔数'], '元/笔', '每笔支付流水的平均金额。'],
      ['笔均退款金额', 'ROUND(订单退款金额 / 退款流水笔数, 2)', ['订单退款金额', '退款流水笔数'], '元/笔', '每笔退款流水的平均金额。'],
      ['支付净额', '订单支付金额 - 订单退款金额', ['订单支付金额', '订单退款金额'], '元', '同一统计期内的支付金额减去退款金额。']
    ],
    ds_cdw: [
      ['客户打标覆盖率', 'ROUND(已打标客户数 / 客户总数 * 100, 2)', ['已打标客户数', '客户总数'], '%', '有标签记录的客户占客户总数的比例。'],
      ['客户分群覆盖率', 'ROUND(已分群客户数 / 客户总数 * 100, 2)', ['已分群客户数', '客户总数'], '%', '已纳入分群的客户占客户总数的比例。'],
      ['已打标客户平均标签量', 'ROUND(客户标签关联记录数 / 已打标客户数, 2)', ['客户标签关联记录数', '已打标客户数'], '条/人', '每位已打标客户平均关联的标签记录数。']
    ],
    ds_crm: [
      ['客户跟进覆盖率', 'ROUND(已跟进客户数 / CRM 客户数 * 100, 2)', ['已跟进客户数', 'CRM 客户数'], '%', '统计期内有跟进记录的客户占客户总数的比例。'],
      ['已跟进客户平均跟进次数', 'ROUND(客户跟进次数 / 已跟进客户数, 2)', ['客户跟进次数', '已跟进客户数'], '次/客户', '每个已跟进客户的平均跟进次数。'],
      ['人均新增线索量', 'ROUND(新增线索数 / 线索负责人数, 2)', ['新增线索数', '线索负责人数'], '条/人', '统计期内新增线索总量按有线索记录的负责人均摊。']
    ],
    ds_inventory: [
      ['单仓平均库存流水', 'ROUND(库存流水笔数 / 发生库存变动的仓库数, 2)', ['库存流水笔数', '发生库存变动的仓库数'], '笔/仓', '每个发生库存变动的仓库平均产生的流水笔数。'],
      ['单 SKU 平均库存流水', 'ROUND(库存流水笔数 / 有库存变动的 SKU 数, 2)', ['库存流水笔数', '有库存变动的 SKU 数'], '笔/SKU', '每种有库存变动的 SKU 平均产生的流水笔数。'],
      ['仓库库存记录覆盖率', 'ROUND(有库存记录的仓库数 / 库存管理仓库数 * 100, 2)', ['有库存记录的仓库数', '库存管理仓库数'], '%', '有库存快照记录的仓库占管理仓库的比例。']
    ],
    ds_finance: [
      ['笔均应收金额', 'ROUND(应收金额 / 应收记录数, 2)', ['应收金额', '应收记录数'], '元/笔', '每笔应收记录的平均金额。'],
      ['笔均应付金额', 'ROUND(应付金额 / 应付记录数, 2)', ['应付金额', '应付记录数'], '元/笔', '每笔应付记录的平均金额。'],
      ['应收应付净额', '应收金额 - 应付金额', ['应收金额', '应付金额'], '元', '同一统计期内的应收金额减去应付金额。']
    ],
    ds_realtime: [
      ['用户平均触发事件数', 'ROUND(埋点事件数 / 访问用户数, 2)', ['埋点事件数', '访问用户数'], '次/人', '有访问记录的用户平均触发的埋点事件次数。'],
      ['页面平均访问次数', 'ROUND(页面访问次数 / 有访问记录的页面数, 2)', ['页面访问次数', '有访问记录的页面数'], '次/页', '有访问记录的页面平均获得的访问次数。'],
      ['有访问记录日均 PV', 'ROUND(页面访问次数 / 有访问记录的天数, 2)', ['页面访问次数', '有访问记录的天数'], '次/天', '按有页面访问记录的日期计算的日均访问次数。']
    ],
    ds_metric: [
      ['非招成交金额（元）', '非招成交金额 * 10000', ['非招成交金额'], '元', '将非招成交金额由万元换算为元。'],
      ['招标项目平均成交金额', 'ROUND(招标成交金额 / 招标项目数, 2)', ['招标成交金额', '招标项目数'], '万元/个', '每个招标成交项目的平均成交金额。'],
      ['非招项目平均成交金额', 'ROUND(非招成交金额 / 非招成交项目数, 2)', ['非招成交金额', '非招成交项目数'], '万元/个', '每个非招标成交项目的平均成交金额。'],
      ['电商笔均交易金额', 'ROUND(电商交易金额 / 电商交易笔数, 2)', ['电商交易金额', '电商交易笔数'], '元/笔', '有金额记录的电商交易平均每笔金额。']
    ]
  };

  var indicatorAnalysisSynonyms = {
    '销售额': '销售金额、销售总额',
    '销售订单数': '订单量、销售单量',
    '成交客户数': '成交客户量',
    '销售客单价': '平均订单金额、单均销售额',
    '成交客户平均销售额': '客户人均销售额',
    '订单支付金额': '订单实付金额',
    '退款订单占比': '订单退款率',
    '客户总数': '客户量',
    '新增线索数': '新增商机线索量',
    '页面访问次数': 'PV、页面浏览量',
    '招标项目平均成交金额': '招标项目单均成交额'
  };

  var indicatorAnalysisStatuses = {
    new: { label: '新增', style: 'status-blue' },
    existing: { label: '已存在', style: 'status-ok' },
    modify: { label: '推荐修改', style: 'status-warn' }
  };
  function collectIndicatorRecommendations(srcId, reference) {
    var rules = indicatorAnalysisRules[srcId] || [];
    var candidates = rules.flatMap(function ([name, table, field, agg, unit, timeField, defaultFilterSql]) {
      var fields = FIELDS_BY_TABLE[table] || [];
      if (!(TABLES_BY_SRC[srcId] || []).includes(table) || !fields.includes(field)) return [];
      var draft = {
        name: name, type: 'atom', srcId: srcId, table: table, field: field, agg: agg, unit: unit,
        synonyms: indicatorAnalysisSynonyms[name] || '',
        modelRef: makeModelRef(srcId, table),
        timeField: fields.includes(timeField) ? timeField : '',
        defaultFilterSql: defaultFilterSql || '',
        desc: '对' + tableLabel(table) + '的' + fieldLabel(field)
          + (agg === 'SUM' ? '求和。' : agg === 'COUNT' ? '统计非空记录数。' : '去重计数。')
      };
      return { draft: draft, reason: '数据源 · ' + tableLabel(table) + ' / ' + fieldLabel(field) };
    });

    (indicatorDerivedRules[srcId] || []).forEach(function ([name, formula, requiredAtoms, unit, desc]) {
      candidates.push({
        draft: { name: name, type: 'derived', srcId: srcId, unit: unit, formula: formula, desc: desc,
          synonyms: indicatorAnalysisSynonyms[name] || '' },
        requiredAtoms: requiredAtoms,
        reason: '引用原子指标 · ' + requiredAtoms.join('、')
      });
    });
    return reference ? applyIndicatorDocumentRules(candidates, reference) : candidates;
  }

  function applyIndicatorDocumentRules(candidates, reference) {
    var lines = reference.text.split(/\r?\n/);
    var unmappedAtoms = new Set();
    return candidates.filter(function (candidate, index) {
      var draft = candidate.draft;
      if (draft.type === 'derived') {
        return !candidate.requiredAtoms.some(function (name) { return unmappedAtoms.has(name); });
      }
      var fields = FIELDS_BY_TABLE[draft.table];
      var line = (lines.find(function (text) { return text.includes(draft.name); }) || '').trim();
      if (reference.mock && index === 0) {
        var date = fields.find(function (field) { return fieldTag(field) === '时间'; });
        var parts = [draft.name];
        if (date) parts.push('按' + fieldLabel(date) + '统计');
        if (draft.agg === 'SUM') parts.push('仅统计正数');
        line = parts.length > 1 ? parts.join('，') : '';
      }
      if (!line) return true;
      var dateClause = line.match(/按([^，。；;、]{1,28}?)统计/);
      var timeField = fields.find(function (field) {
        return fieldTag(field) === '时间' && (dateClause
          ? [field, fieldLabel(field)].includes(dateClause[1].trim())
          : line.includes(field) || line.includes(fieldLabel(field)));
      });
      var positive = /仅统计正数|大于\s*0(?![\d.])/.test(line);
      if ((dateClause && !timeField) || (positive && draft.agg !== 'SUM') || (!timeField && !positive)) {
        unmappedAtoms.add(draft.name);
        return false;
      }
      if (timeField) draft.timeField = timeField;
      var positiveCondition = draft.field + ' > 0';
      if (positive && !draft.defaultFilterSql.split('\nAND ').includes(positiveCondition)) {
        draft.defaultFilterSql = [draft.defaultFilterSql, positiveCondition].filter(Boolean).join('\nAND ');
      }
      draft.desc = line.slice(0, 160);
      candidate.hasDocumentRule = true;
      candidate.reason += ' · ' + (reference.mock ? '文档示例口径' : '参考文档');
      return true;
    });
  }

  function compareIndicatorRecommendation(candidate, availableAtoms) {
    var draft = candidate.draft;
    var saved = candidate.appliedId && findIndicatorById(candidate.appliedId);
    if (saved) return { status: 'existing', item: saved };
    var requiredAtoms = candidate.requiredAtoms || [];
    var savedAtoms = INDICATORS.filter(function (item) {
      return item.srcId === draft.srcId && item.type === 'atom' && requiredAtoms.includes(item.name);
    });
    if (new Set(savedAtoms.map(function (item) { return item.name; })).size !== savedAtoms.length) return null;
    var missing = requiredAtoms.filter(function (name) {
      return !savedAtoms.some(function (item) { return item.name === name; });
    });
    if (missing.some(function (name) { return !availableAtoms || !availableAtoms.has(name); })) {
      return null;
    }
    var matches = INDICATORS.filter(function (item) {
      return item.srcId === draft.srcId && item.type === draft.type && normalizePickerKw(item.name) === normalizePickerKw(draft.name);
    });
    if (!matches.length) return { status: 'new', missingAtoms: missing };
    var fields = draft.type === 'atom'
      ? { table: '来源表', field: '字段', agg: '聚合方式', timeField: '统计时间', defaultFilterSql: '过滤条件', unit: '单位' }
      : { formula: '计算公式', unit: '单位' };
    if (candidate.hasDocumentRule) fields.desc = '业务口径';
    var comparisons = matches.map(function (item) {
      var diff = Object.keys(fields).flatMap(function (key) {
        var before = String(key === 'agg' ? (item.agg || 'SUM') : (item[key] || ''));
        var after = String(draft[key] || '');
        if (key === 'timeField' && !after && (FIELDS_BY_TABLE[draft.table] || []).includes(before)) return [];
        if (key === 'defaultFilterSql' && !after && item.table === draft.table) return [];
        if (before === after) return [];
        return [fields[key] + '：' + (before.replace(/\s+/g, ' ') || '未设置') + ' → ' + (after.replace(/\s+/g, ' ') || '未设置')];
      });
      return { item: item, diff: diff };
    });
    var identical = comparisons.filter(function (row) { return !row.diff.length; });
    if (identical.length) return { status: 'existing', item: identical.length === 1 ? identical[0].item : null };
    if (comparisons.length > 1) return null;
    return { status: 'modify', item: comparisons[0].item, diff: comparisons[0].diff, missingAtoms: missing };
  }

  function recommendedIndicatorGroup(draft) {
    var directoryByTable = {
      order_refund: 'g_cost_direct',
      ap_master: 'g_cost_direct',
      ar_master: 'g_rev_other',
      non_bidding_fee_detail: 'g_rev_service',
      platform_service_fee_detail: 'g_rev_service'
    };
    var revenueSource = ['ds_sales', 'ds_order_svc', 'ds_metric'].includes(draft.srcId);
    var preferred = directoryByTable[draft.table]
      || (revenueSource && draft.name !== '退款订单占比' ? 'g_rev_sale' : 'g_efficiency');
    var parent = preferred.startsWith('g_rev_') ? 'g_revenue'
      : preferred.startsWith('g_cost_') ? 'g_cost' : preferred;
    if (findGroupById(preferred)) return preferred;
    return findGroupById(parent) ? parent : '__uncategorized__';
  }

  function indicatorRecommendationDraft(candidate, row) {
    var draft = candidate.draft;
    if (!row.item) return Object.assign(newIndicatorDraft(recommendedIndicatorGroup(draft)), draft);
    var changes = {};
    if (row.status === 'modify') {
      changes = Object.assign({}, draft);
      delete changes.name;
      delete changes.synonyms;
      if (!candidate.hasDocumentRule) delete changes.desc;
      if (!changes.timeField && (FIELDS_BY_TABLE[draft.table] || []).includes(row.item.timeField)) delete changes.timeField;
      if (!changes.defaultFilterSql && row.item.table === draft.table) delete changes.defaultFilterSql;
    }
    return Object.assign({}, row.item, changes);
  }

  function saveIndicatorRecommendation(candidate, row) {
    var item = indicatorRecommendationDraft(candidate, row);
    item.updatedAt = todayStr();
    if (row.status === 'new') {
      item.id = uid('i');
      normalizeDraftByType(item);
      INDICATORS.unshift(item);
    } else if (row.status === 'modify') {
      if (item.type === 'atom') syncAtomFunctionExpr(item);
      Object.assign(row.item, item);
    }
    candidate.appliedId = item.id;
  }

  function analysisAvailableAtoms(candidates) {
    return new Set(candidates.filter(function (candidate) {
      if (candidate.draft.type !== 'atom') return false;
      var row = compareIndicatorRecommendation(candidate);
      return row && row.status === 'new';
    }).map(function (candidate) { return candidate.draft.name; }));
  }

  function seedIndicatorAnalysisExamples() {
    var examples = {
      ds_sales: ['销售额', '商品销售数量', { agg: 'COUNT' }],
      ds_order_svc: ['订单支付金额', '退款订单数', { unit: '笔' }],
      ds_cdw: ['客户总数', '已使用的标签数', { agg: 'COUNT' }],
      ds_crm: ['新增线索数', '跟进活动类型数', { agg: 'COUNT' }],
      ds_inventory: ['库存流水笔数', '库存变动数量', { timeField: '' }],
      ds_finance: ['应收金额', '总账金额合计', { timeField: '' }],
      ds_realtime: ['埋点事件数', '活跃埋点事件类型数', { agg: 'COUNT' }]
    };
    Object.entries(examples).forEach(function ([srcId, [existingName, modifyName, previousConfig]]) {
      collectIndicatorRecommendations(srcId).forEach(function (candidate) {
        var draft = candidate.draft;
        if (draft.name !== existingName && draft.name !== modifyName) return;
        var same = draft.name === existingName;
        var item = Object.assign(indicatorRecommendationDraft(candidate, {}), same ? {} : previousConfig, {
          id: 'i_example_' + srcId + (same ? '_existing' : '_modify'),
          updatedAt: '2026-05-05'
        });
        if (!same && previousConfig.agg) item.desc = '统计' + tableLabel(draft.table) + '中的' + fieldLabel(draft.field) + '。';
        normalizeDraftByType(item);
        INDICATORS.push(item);
      });
    });
  }

  function indicatorAnalysisRowHTML(candidate, row, index, keyword) {
    var draft = indicatorRecommendationDraft(candidate, row);
    var status = indicatorAnalysisStatuses[row.status];
    var actionable = row.status === 'new' || row.status === 'modify';
    var apply = actionable ? '<button type="button" class="ghost-btn" data-analysis-row="' + index + '">'
      + '<svg class="btn-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg> 应用</button>' : '—';
    var meta = function (value) {
      return value ? '<span class="dm-analysis-meta">' + escapeHTML(value) + '</span>' : '';
    };
    var formula = formulaText(draft);
    var mapping = draft.type === 'atom' && draft.table ? meta(draft.table + '.' + draft.field)
      + meta(draft.timeField && '统计时间 · ' + fieldLabel(draft.timeField))
      + meta(draft.defaultFilterSql && '过滤条件 · ' + draft.defaultFilterSql.replace(/\s+/g, ' ')) : '';
    var type = draft.type ? '<span class="ki-type-tag is-' + draft.type + '">' + typeLabel(draft.type) + '</span>' : '—';
    return '<tr><td><div class="ki-name">'
      + (draft.type ? '<span class="ki-name-ico is-' + draft.type + '">' + typeAbbr(draft.type) + '</span>' : '')
      + '<div class="ki-name-text"><strong>' + keywordHighlight.html(draft.name, keyword) + '</strong>' + meta(dsName(draft.srcId)) + '</div></div>'
      + '</td><td>' + type
      + '</td><td><span class="ki-formula">' + escapeHTML(draft.type ? formula || '—' : '—') + '</span>' + mapping + meta(draft.unit && '单位 · ' + draft.unit)
      + '</td><td><span class="ki-syn">' + keywordHighlight.excerptHTML(draft.synonyms || '—', keyword, 20) + '</span>'
      + '</td><td><span class="ki-desc">' + escapeHTML(draft.desc || '—') + '</span>' + meta(candidate.reason)
      + (row.diff || []).map(function (line) { return '<span class="dm-analysis-diff">' + escapeHTML(line) + '</span>'; }).join('')
      + '</td><td>' + escapeHTML(draft.groupId ? groupPathName(draft.groupId) : '—')
      + '</td><td><span class="' + status.style + '">' + status.label
      + '</span></td><td>' + apply + '</td></tr>';
  }

  function bindIndicatorAnalysis() {
    var scope = $('#kiAnalysisScope');
    var drawer = $('#kiAnalysisDrawer');
    var trigger = $('#kiAnalysisButton');
    var sourcePicker = $('#kiAnalysisSourcePicker');
    var fileInput = $('#kiAnalysisFile');
    var upload = $('#kiAnalysisUpload');
    var filters = $('#kiAnalysisFilters');
    var scopeDraft = { srcId: '', file: null };
    var run = null;
    var selectingScope = false;
    var pageSize = 10;
    bindIndicatorDrawerResize(drawer, $('#kiAnalysisResize'), 810);

    function toggleOverlay(panel, maskId, open) {
      panel.classList.toggle('hidden', !open);
      $(maskId).classList.toggle('hidden', !open);
    }

    function setPickerOpen(picker, open) {
      picker.classList.toggle('is-open', open);
      $('.ki-source-picker-btn', picker).setAttribute('aria-expanded', String(open));
      if (open) $('.ki-picker-search-input', picker).focus();
    }

    function renderScopeSource() {
      sourcePicker.innerHTML = sourcePickerHTML(scopeDraft.srcId);
      $('#kiAnalysisStart').disabled = !scopeDraft.srcId;
    }

    function updateFile(file, error) {
      scopeDraft.file = file;
      fileInput.value = '';
      $('#kiAnalysisFileName').textContent = file ? file.name : '';
      $('#kiAnalysisFileName').classList.toggle('hidden', !file);
      $('#kiAnalysisUploadHint').classList.toggle('hidden', !!file);
      $('#kiAnalysisRemoveFile').classList.toggle('hidden', !file);
      $('#kiAnalysisPickFileLabel').textContent = file ? '替换文档' : '选择文档';
      $('#kiAnalysisFileError').textContent = error || '';
      $('#kiAnalysisFileError').classList.toggle('hidden', !error);
    }

    function chooseFile(file) {
      if (!file) return;
      var error = '';
      if (!/\.(docx?|pdf|txt|md)$/i.test(file.name)) error = '请选择 Word、PDF、TXT 或 Markdown 文档。';
      else if (!file.size || file.size > 20 * 1024 * 1024) error = '请选择非空且不超过 20 MB 的文档。';
      updateFile(error ? scopeDraft.file : file, error);
    }

    function openScope() {
      selectingScope = true;
      scopeDraft.srcId = run ? run.srcId : '';
      renderScopeSource();
      updateFile(run ? run.file : null);
      openDrawerAnalysis();
      $('#kiAnalysisSourceTrigger').focus();
    }

    function closeScope() {
      selectingScope = false;
      if (run) {
        renderAnalysis();
        $('#kiAnalysisAgain').focus();
      } else {
        closeDrawerAnalysis();
      }
    }

    function openDrawerAnalysis() {
      toggleOverlay(drawer, '#kiAnalysisMask', true);
      renderAnalysis();
      $('#kiAnalysisTitle').focus();
    }

    function closeDrawerAnalysis() {
      var openPicker = $('.ki-source-picker.is-open', drawer);
      if (openPicker) setPickerOpen(openPicker, false);
      selectingScope = false;
      toggleOverlay(drawer, '#kiAnalysisMask', false);
      trigger.focus();
    }

    function elapsedText(milliseconds) {
      var seconds = Math.floor(milliseconds / 1000);
      return seconds + ' 秒';
    }

    function startAnalysis() {
      var task = {
        srcId: scopeDraft.srcId,
        file: scopeDraft.file,
        startedAt: performance.now(),
        step: 0,
        running: true,
        page: 1,
        keyword: '',
        status: '',
        candidates: []
      };
      run = task;
      var reference = task.file && (/\.(txt|md)$/i.test(task.file.name)
        ? task.file.text().then(function (value) { return { text: value }; }).catch(function () { return null; })
        : Promise.resolve({ text: '', mock: true }));
      selectingScope = false;
      filters.reset();
      $('#kiAnalysisTableWrap').scrollTop = 0;
      trigger.classList.add('is-analyzing');
      $('#kiAnalysisButtonLabel').textContent = 'AI 分析中';
      openDrawerAnalysis();

      var timer = setInterval(function () {
        $('#kiAnalysisElapsed').textContent = elapsedText(performance.now() - task.startedAt);
      }, 1000);
      function advance() {
        task.step += 1;
        if (task.step < 4) {
          renderAnalysis();
          setTimeout(advance, 850);
          return;
        }
        Promise.resolve(reference).then(function (doc) {
          task.candidates = collectIndicatorRecommendations(task.srcId, doc);
          task.running = false;
          task.elapsed = elapsedText(performance.now() - task.startedAt);
          clearInterval(timer);
          trigger.classList.remove('is-analyzing');
          $('#kiAnalysisButtonLabel').textContent = '查看指标推荐';
          if (!drawer.classList.contains('hidden')) renderAnalysis();
        });
      }
      setTimeout(advance, 850);
    }

    function renderAnalysis() {
      scope.classList.toggle('hidden', !selectingScope);
      $('#kiAnalysisScopeActions').classList.toggle('hidden', !selectingScope);
      if (selectingScope) {
        $('#kiAnalysisTitle').textContent = '确认分析范围';
        $('#kiAnalysisContext').textContent = '选择一个数据源，可补充业务口径文档作为指标推荐的参考。';
        ['#kiAnalysisProcess', '#kiAnalysisResults', '#kiAnalysisPagination', '#kiAnalysisSummary'].forEach(function (id) {
          $(id).classList.add('hidden');
        });
        return;
      }
      $('#kiAnalysisTitle').textContent = run.running ? '自动指标分析' : '指标推荐';
      $('#kiAnalysisContext').textContent = dsPathName(run.srcId) + ' · ' + (TABLES_BY_SRC[run.srcId] || []).length + ' 张表'
        + (run.file ? ' · 参考文档 ' + run.file.name : '');
      $('#kiAnalysisProcess').classList.toggle('hidden', !run.running);
      $('#kiAnalysisResults').classList.toggle('hidden', run.running);
      $('#kiAnalysisPagination').classList.toggle('hidden', run.running);
      $('#kiAnalysisSummary').classList.toggle('hidden', run.running);
      if (!run.running) {
        renderResults();
        return;
      }
      var steps = ['扫描数据源表与字段', run.file ? '匹配文档口径与表字段' : '识别可统计的字段与聚合方式', '生成指标口径与字段映射', '比对指标体系并生成推荐'];
      var progress = [10, 34, 62, 86, 96][run.step];
      $('#kiAnalysisProcessNote').textContent = run.file ? '结合参考文档与所选数据源生成候选指标。' : '根据所选数据源的表和字段生成候选指标。';
      $('#kiAnalysisElapsed').textContent = elapsedText(performance.now() - run.startedAt);
      $('#kiAnalysisPercent').textContent = progress + '%';
      $('#kiAnalysisProgress').setAttribute('aria-valuenow', progress);
      $('#kiAnalysisFill').style.width = progress + '%';
      $('#kiAnalysisSteps').innerHTML = steps.map(function (step, index) {
        var done = index < run.step;
        var current = index === run.step;
        return '<li class="' + (done ? 'is-done' : current ? 'is-current' : '') + '"'
          + (current ? ' aria-current="step"' : '') + '><span class="dm-analysis-step-marker" aria-hidden="true">'
          + (done ? '✓' : index + 1) + '</span><span>' + step + '</span><small class="dm-analysis-step-status">'
          + (done ? '已完成' : current ? '进行中' : '待开始') + '</small></li>';
      }).join('');
    }

    function renderResults() {
      var counts = { new: 0, modify: 0, existing: 0 };
      var availableAtoms = analysisAvailableAtoms(run.candidates);
      var rows = run.candidates.flatMap(function (candidate, index) {
        var row = compareIndicatorRecommendation(candidate, availableAtoms);
        if (!row) return [];
        counts[row.status] += 1;
        return { candidate: candidate, row: row, index: index, draft: row.item || candidate.draft };
      });
      var derivedCount = rows.filter(function (entry) { return entry.draft.type === 'derived'; }).length;
      var actionable = counts.new + counts.modify;
      $('#kiAnalysisApplyAll').disabled = !actionable;
      $('#kiAnalysisApplyAllLabel').textContent = '全部应用' + (actionable ? '（' + actionable + '）' : '');
      $('#kiAnalysisSummary').textContent = [
        rows.length + ' 条推荐（衍生指标 ' + derivedCount + ' 条）', '新增 ' + counts.new, '已存在 ' + counts.existing,
        '推荐修改 ' + counts.modify, '用时 ' + run.elapsed
      ].join(' · ');
      var visible = rows.filter(function (entry) {
        return (!run.status || entry.row.status === run.status)
          && [entry.draft.name, entry.draft.synonyms].some(function (value) { return normalizePickerKw(value).includes(run.keyword); });
      }).sort(function (a, b) {
        return Number(b.draft.type === 'derived') - Number(a.draft.type === 'derived') || a.index - b.index;
      });
      var totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
      run.page = Math.min(run.page, totalPages);
      var offset = (run.page - 1) * pageSize;
      $('#kiAnalysisRows').innerHTML = visible.slice(offset, offset + pageSize).map(function (entry) {
        return indicatorAnalysisRowHTML(entry.candidate, entry.row, entry.index, run.keyword);
      }).join('') || '<tr><td class="dm-analysis-empty" colspan="8">'
        + (rows.length ? '没有符合查询条件的指标' : '当前数据源暂无可推荐指标') + '</td></tr>';
      $('#kiAnalysisPageInfo').textContent = '共 ' + visible.length + ' 条'
        + (totalPages > 1 ? ' · 第 ' + run.page + ' / ' + totalPages + ' 页' : '');
      $('#kiAnalysisPrev').disabled = run.page === 1;
      $('#kiAnalysisNext').disabled = run.page === totalPages;
    }

    function applyRecommendations(candidates, bulk, button) {
      var task = run;
      var availableAtoms = analysisAvailableAtoms(task.candidates);
      var prerequisites = [];
      if (!bulk) {
        var recommendation = compareIndicatorRecommendation(candidates[0], availableAtoms);
        if (!recommendation || recommendation.status === 'existing') return;
        prerequisites = task.candidates.filter(function (candidate) {
          return candidate.draft.type === 'atom' && recommendation.missingAtoms.includes(candidate.draft.name);
        });
      }
      var rows = prerequisites.concat(candidates).flatMap(function (candidate) {
        var row = compareIndicatorRecommendation(candidate, availableAtoms);
        return row ? [{ candidate: candidate, row: row }] : [];
      });
      var additions = rows.filter(function (entry) { return entry.row.status === 'new'; });
      var modifications = rows.filter(function (entry) { return entry.row.status === 'modify'; });
      if (!additions.length && !modifications.length) return;
      function apply() {
        if (run !== task) return;
        var added = 0;
        var modified = 0;
        rows.forEach(function (entry) {
          if (entry.row.status !== 'new' && entry.row.status !== 'modify') return;
          var row = compareIndicatorRecommendation(entry.candidate);
          if (!row || row.status !== entry.row.status || row.item !== entry.row.item) return;
          saveIndicatorRecommendation(entry.candidate, row);
          if (row.status === 'new') added += 1;
          else modified += 1;
        });
        if (added) state.page = 1;
        renderTree();
        renderBread();
        renderList();
        renderResults();
        if (!drawer.contains(document.activeElement) || document.activeElement.disabled) $('#kiAnalysisTitle').focus();
        showToast('应用完成，新增 ' + added + ' 条，修改 ' + modified + ' 条');
      }

      if (!bulk && !modifications.length && !prerequisites.length) {
        apply();
        return;
      }
      var summary = '本次将新增 ' + additions.length + ' 条、修改 ' + modifications.length + ' 条。'
        + (additions.length ? '\n新增指标将按各自的推荐目录保存。' : '');
      if (prerequisites.length) {
        summary += '\n将先应用依赖的原子指标：' + prerequisites.map(function (candidate) {
          return candidate.draft.name;
        }).join('、') + '。';
      }
      var changes = modifications.map(function (entry) {
        return entry.candidate.draft.name + '\n' + entry.row.diff.join('\n');
      });
      showConfirm({
        title: bulk ? '确认全部应用' : prerequisites.length ? '确认应用衍生指标' : '确认修改指标',
        subtitle: bulk ? '应用本次分析的全部推荐，包含筛选范围外的结果。'
          : prerequisites.length ? '所选衍生指标与依赖的原子指标将一并应用。' : '确认后按推荐口径更新现有指标。',
        message: [summary].concat(changes).join('\n\n'),
        okText: '确认应用',
        danger: false,
        returnFocus: button,
        onOk: apply
      });
    }

    trigger.addEventListener('click', function () {
      if (run) openDrawerAnalysis();
      else openScope();
    });
    $('#kiAnalysisAgain').addEventListener('click', openScope);
    $('#kiAnalysisMask').addEventListener('click', closeDrawerAnalysis);
    $('#kiAnalysisClose').addEventListener('click', closeDrawerAnalysis);
    $('#kiAnalysisCancelScope').addEventListener('click', closeScope);
    scope.addEventListener('submit', function (event) {
      event.preventDefault();
      if (findSourceInTree(scopeDraft.srcId) && !(run && run.running)) startAnalysis();
    });

    sourcePicker.addEventListener('click', function (event) {
      var picker = $('.ki-source-picker', sourcePicker);
      if (event.target.closest('#kiAnalysisSourceTrigger')) {
        setPickerOpen(picker, !picker.classList.contains('is-open'));
        return;
      }
      var domain = event.target.closest('.ki-source-tree-row.is-domain');
      if (domain) domain.parentElement.classList.toggle('is-collapsed');
      var source = event.target.closest('[data-src-id]');
      if (source) {
        scopeDraft.srcId = source.dataset.srcId;
        renderScopeSource();
        $('#kiAnalysisSourceTrigger').focus();
      }
    });
    sourcePicker.addEventListener('input', function (event) {
      var keyword = normalizePickerKw(event.target.value);
      var results = sourceTreeHTML(scopeDraft.srcId, keyword);
      $('.ki-source-tree-list', sourcePicker).innerHTML = results;
      $('.ki-picker-empty', sourcePicker).classList.toggle('hidden', !!results);
    });
    sourcePicker.addEventListener('keydown', function (event) {
      if (event.target.matches('input') && event.key === 'Enter') event.preventDefault();
    });
    $('#kiAnalysisPickFile').addEventListener('click', function () { fileInput.click(); });
    $('#kiAnalysisRemoveFile').addEventListener('click', function () {
      updateFile(null);
      $('#kiAnalysisPickFile').focus();
    });
    fileInput.addEventListener('change', function () { chooseFile(fileInput.files[0]); });
    upload.addEventListener('dragover', function (event) {
      event.preventDefault();
      upload.classList.add('is-drag-over');
    });
    upload.addEventListener('dragleave', function (event) {
      if (!upload.contains(event.relatedTarget)) upload.classList.remove('is-drag-over');
    });
    upload.addEventListener('drop', function (event) {
      event.preventDefault();
      upload.classList.remove('is-drag-over');
      if (event.dataTransfer.files.length > 1) updateFile(scopeDraft.file, '每次分析可上传一份文档。');
      else chooseFile(event.dataTransfer.files[0]);
    });

    function query(event) {
      event.preventDefault();
      run.keyword = normalizePickerKw($('#kiAnalysisKeyword').value);
      run.status = $('#kiAnalysisStatus').value;
      run.page = 1;
      $('#kiAnalysisTableWrap').scrollTop = 0;
      renderResults();
    }
    filters.addEventListener('submit', query);
    $('#kiAnalysisStatus').addEventListener('change', query);
    $('#kiAnalysisRows').addEventListener('click', function (event) {
      var button = event.target.closest('[data-analysis-row]');
      if (button) applyRecommendations([run.candidates[Number(button.dataset.analysisRow)]], false, button);
    });
    $('#kiAnalysisApplyAll').addEventListener('click', function (event) {
      applyRecommendations(run.candidates, true, event.currentTarget);
    });
    ['#kiAnalysisPrev', '#kiAnalysisNext'].forEach(function (selector, index) {
      $(selector).addEventListener('click', function () {
        run.page += index ? 1 : -1;
        $('#kiAnalysisTableWrap').scrollTop = 0;
        renderResults();
        if ($(selector).disabled) $(index ? '#kiAnalysisPrev' : '#kiAnalysisNext').focus();
      });
    });

    document.addEventListener('click', function (event) {
      $$('.ki-source-picker.is-open', scope).forEach(function (picker) {
        if (!picker.contains(event.target)) setPickerOpen(picker, false);
      });
    }, true);
    document.addEventListener('keydown', function (event) {
      if (drawer.classList.contains('hidden') || event.defaultPrevented) return;
      var confirm = $('#kiConfirmModal');
      var panel = confirm.classList.contains('hidden') ? drawer : confirm;
      if (event.key === 'Escape') {
        event.preventDefault();
        var picker = $('.ki-source-picker.is-open', panel);
        if (picker) {
          setPickerOpen(picker, false);
          $('.ki-source-picker-btn', picker).focus();
        } else if (panel === confirm) closeConfirm();
        else if (selectingScope) closeScope();
        else closeDrawerAnalysis();
      } else if (event.key === 'Tab') {
        var controls = $$('button:not(:disabled), input:not(:disabled), select, [tabindex="0"]', panel).filter(function (el) {
          return el.getClientRects().length > 0;
        });
        var first = controls[0];
        var last = controls[controls.length - 1];
        if (first && (!panel.contains(document.activeElement) || document.activeElement === (event.shiftKey ? first : last))) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    });
  }

  // ---------- 8b) 导入 / 导出指标体系 (Excel) ----------
  var KI_IMPORT_MAX_BYTES = 50 * 1024 * 1024;
  var KI_IMPORT_HEADERS = [
    '指标名称',
    '指标类型(atom|derived)',
    '所属目录',
    '数据源',
    '物理表',
    '物理字段',
    '聚合方式',
    '计算公式',
    '单位',
    '同义词',
    '描述',
    '时间字段',
    '字段映射',
    '过滤值映射'
  ];

  function escapeXmlOrHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function buildXlsHtml(headers, rows) {
    var theme = getThemeColors();
    var head = '<tr>' + headers.map(function (h) {
      return '<th style="background:' + theme.primary + ';color:#fff;font-weight:bold;">' + escapeXmlOrHtml(h) + '</th>';
    }).join('') + '</tr>';
    var body = rows.map(function (r) {
      return '<tr>' + r.map(function (c) {
        return '<td>' + escapeXmlOrHtml(c) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return ''
      + '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">'
      + '<head><meta charset="UTF-8"></head>'
      + '<body><table border="1">' + head + body + '</table></body></html>';
  }

  function triggerDownload(blob, filename) {
    var a = document.createElement('a');
    var url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  function safeFileName(s) {
    return String(s || '指标体系').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
  }

  function groupPathName(gid) {
    if (!gid || gid === '__all__') return '全部指标';
    if (gid === '__uncategorized__') return '未分类';
    var info = findGroupById(gid);
    return info ? info.path.map(function (g) { return g.name; }).join(' / ') : gid;
  }

  function formulaText(it) {
    if (!it) return '';
    if (it.type === 'atom') return atomFunctionExpr(it);
    if (isFormulaMetricType(it.type)) return it.formula || '';
    return (it.mappings || []).length + ' 个表字段映射';
  }

  function mappingsText(it) {
    return (it.mappings || []).map(function (m) {
      if (!m.table && !m.field) return '';
      return [m.table || '', m.field || ''].filter(Boolean).join('.');
    }).filter(Boolean).join('; ');
  }

  function filterValuesText(it) {
    return (it.filterValues || []).map(function (m) {
      return (m.alias || '') + '=' + (m.value || '');
    }).filter(function (s) { return s !== '='; }).join('; ');
  }

  function indicatorExportRow(it) {
    return [
      it.name || '',
      it.type || '',
      groupPathName(it.groupId),
      dsPathName(it.srcId),
      it.table || '',
      it.field || '',
      it.agg || '',
      formulaText(it),
      it.unit || '',
      it.synonyms || '',
      it.desc || '',
      it.timeField || '',
      mappingsText(it),
      filterValuesText(it)
    ];
  }

  function downloadIndicatorTemplate() {
    var sample = [
      [
        '非招成交金额',
        'atom',
        '收入指标 / 销售收入',
        '运营域 / 运营指标库',
        'non_bidding_project_info',
        'deal_amount_10k_yuan',
        'SUM',
        '',
        '万元',
        '非招成交金额',
        '非招标项目的成交金额合计。',
        'deal_notice_sent_date',
        '',
        ''
      ],
      [
        '总收入',
        'derived',
        '收入指标 / 销售收入',
        '运营域 / 运营指标库',
        '',
        '',
        '',
        '招标平台服务费 + 非招服务费 + CA证书收入',
        '元',
        '总收入',
        '核心收入类指标汇总。',
        '',
        '',
        ''
      ]
    ];
    var html = buildXlsHtml(KI_IMPORT_HEADERS, sample);
    var blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel' });
    triggerDownload(blob, '指标体系导入模板.xls');
    if (typeof showToast === 'function') showToast('模板已开始下载');
  }

  function exportIndicators() {
    var list = getFilteredList();
    if (!list.length) {
      if (typeof showToast === 'function') showToast('没有可导出的指标');
      return;
    }
    var rows = list.map(indicatorExportRow);
    var html = buildXlsHtml(KI_IMPORT_HEADERS, rows);
    var blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel' });
    var bread = $('#kiBreadText');
    var name = bread ? bread.textContent : '指标体系';
    triggerDownload(blob, '指标体系_' + safeFileName(name) + '.xls');
    if (typeof showToast === 'function') showToast('已导出 ' + list.length + ' 条指标');
  }

  var indicatorImportState = {
    file: null,
    importing: false
  };

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  function isExcelFile(name) {
    if (!name) return false;
    var lower = name.toLowerCase();
    return lower.endsWith('.xlsx') || lower.endsWith('.xls');
  }

  function refreshIndicatorImportUI() {
    var emptyEl = $('#kiiDropzoneEmpty');
    var fileEl = $('#kiiDropzoneFile');
    var nameEl = $('#kiiFileName');
    var sizeEl = $('#kiiFileSize');
    var okBtn = $('#kiiOkBtn');
    if (indicatorImportState.file) {
      if (emptyEl) emptyEl.classList.add('hidden');
      if (fileEl) fileEl.classList.remove('hidden');
      if (nameEl) nameEl.textContent = indicatorImportState.file.name;
      if (sizeEl) sizeEl.textContent = formatFileSize(indicatorImportState.file.size);
      if (okBtn) okBtn.disabled = indicatorImportState.importing;
    } else {
      if (emptyEl) emptyEl.classList.remove('hidden');
      if (fileEl) fileEl.classList.add('hidden');
      if (okBtn) okBtn.disabled = true;
    }
  }

  function setIndicatorImportFile(file) {
    if (!file) {
      indicatorImportState.file = null;
      refreshIndicatorImportUI();
      return;
    }
    if (!isExcelFile(file.name)) {
      if (typeof showToast === 'function') showToast('仅支持 Excel 格式（.xls / .xlsx）');
      return;
    }
    if (file.size > KI_IMPORT_MAX_BYTES) {
      if (typeof showToast === 'function') showToast('文件过大，单个文件不能超过 50M');
      return;
    }
    indicatorImportState.file = file;
    refreshIndicatorImportUI();
  }

  function resetIndicatorImportProgress() {
    var prog = $('#kiiProgress');
    var fill = $('#kiiProgressFill');
    var pct = $('#kiiProgressPct');
    var label = $('#kiiProgressLabel');
    if (prog) {
      prog.classList.add('hidden');
      prog.classList.remove('is-success', 'is-error');
    }
    if (fill) fill.style.width = '0%';
    if (pct) pct.textContent = '0%';
    if (label) label.textContent = '正在导入…';
  }

  function openIndicatorImportModal() {
    indicatorImportState.file = null;
    indicatorImportState.importing = false;
    var input = $('#kiiFileInput');
    var okBtn = $('#kiiOkBtn');
    var cancelBtn = $('#kiiCancelBtn');
    if (input) input.value = '';
    if (okBtn) okBtn.textContent = '确定';
    if (cancelBtn) cancelBtn.disabled = false;
    resetIndicatorImportProgress();
    refreshIndicatorImportUI();
    var mask = $('#kiImportMask');
    var modal = $('#kiImportModal');
    if (mask) mask.classList.remove('hidden');
    if (modal) modal.classList.remove('hidden');
  }

  function closeIndicatorImportModal() {
    if (indicatorImportState.importing) return;
    var mask = $('#kiImportMask');
    var modal = $('#kiImportModal');
    if (mask) mask.classList.add('hidden');
    if (modal) modal.classList.add('hidden');
  }

  function resolveImportGroupId() {
    var gid = state.activeGroupId;
    if (gid && gid !== '__all__') {
      var info = findGroupById(gid);
      if (info) {
        if (info.parent) return info.group.id;
        if ((info.group.children || []).length) return info.group.children[0].id;
        return info.group.id;
      }
    }
    for (var i = 0; i < TREE.length; i++) {
      if ((TREE[i].children || []).length) return TREE[i].children[0].id;
    }
    return TREE[0] ? TREE[0].id : '__uncategorized__';
  }

  function appendImportedIndicators() {
    var gid = resolveImportGroupId();
    var now = todayStr();
    var rows = [
      {
        type: 'atom',
        name: '导入-有效商机数',
        synonyms: '有效线索, 商机数',
        desc: 'CRM 中已达到有效状态的商机数量。',
        srcId: 'ds_crm',
        table: 'crm_lead',
        field: 'lead_id',
        agg: 'COUNT_DISTINCT',
        timeField: 'created_at',
        unit: '个',
        formula: '',
        isTimeDim: false,
        timeTplKey: '',
        timeFormula: '',
        mappings: [],
        filterValues: []
      },
      {
        type: 'derived',
        name: '导入-商机成交转化率',
        synonyms: '商机转化率, 线索转化',
        desc: '用于观察销售漏斗从有效商机到成交客户的转化效率。',
        srcId: 'ds_metric',
        table: '',
        field: '',
        agg: '',
        timeField: '',
        unit: '%',
        formula: '成交客户数 / 有效商机数',
        isTimeDim: false,
        timeTplKey: '',
        timeFormula: '',
        mappings: [],
        filterValues: []
      }
    ];
    rows.forEach(function (row) {
      row.id = uid('imp');
      row.groupId = gid;
      row.updatedAt = now;
      INDICATORS.unshift(row);
    });
    state.activeGroupId = gid;
    state.page = 1;
    renderTree();
    renderBread();
    renderList();
    return rows.length;
  }

  function startIndicatorImport() {
    if (indicatorImportState.importing || !indicatorImportState.file) return;
    indicatorImportState.importing = true;
    var prog = $('#kiiProgress');
    var fill = $('#kiiProgressFill');
    var pct = $('#kiiProgressPct');
    var label = $('#kiiProgressLabel');
    var okBtn = $('#kiiOkBtn');
    var cancelBtn = $('#kiiCancelBtn');
    if (prog) prog.classList.remove('hidden', 'is-success', 'is-error');
    if (label) label.textContent = '正在解析文件…';
    if (okBtn) { okBtn.disabled = true; okBtn.textContent = '导入中…'; }
    if (cancelBtn) cancelBtn.disabled = true;

    var current = 0;
    function step() {
      var inc = current < 60 ? (4 + Math.random() * 6)
        : current < 85 ? (2 + Math.random() * 3)
        : (0.6 + Math.random() * 1.2);
      current = Math.min(100, current + inc);
      if (fill) fill.style.width = current + '%';
      if (pct) pct.textContent = Math.round(current) + '%';
      if (current >= 60 && current < 85 && label) label.textContent = '正在校验指标口径…';
      if (current >= 85 && current < 100 && label) label.textContent = '正在写入指标体系…';
      if (current < 100) setTimeout(step, 120);
      else finishIndicatorImport();
    }
    step();
  }

  function finishIndicatorImport() {
    var prog = $('#kiiProgress');
    var label = $('#kiiProgressLabel');
    var okBtn = $('#kiiOkBtn');
    var cancelBtn = $('#kiiCancelBtn');
    var fname = indicatorImportState.file ? indicatorImportState.file.name.toLowerCase() : '';
    var forceFail = fname.indexOf('fail') >= 0 || fname.indexOf('错误') >= 0;
    var success = !forceFail;

    if (success) {
      var added = appendImportedIndicators();
      if (prog) prog.classList.add('is-success');
      if (label) label.textContent = '导入成功，新增 ' + added + ' 条指标';
      if (typeof showToast === 'function') showToast('导入成功：新增 ' + added + ' 条指标');
    } else {
      if (prog) prog.classList.add('is-error');
      if (label) label.textContent = '导入失败：字段缺失或模板格式不正确';
      if (typeof showToast === 'function') showToast('导入失败：请使用模板格式后重试');
    }

    indicatorImportState.importing = false;
    if (okBtn) {
      okBtn.disabled = false;
      okBtn.textContent = success ? '完成' : '重试';
    }
    if (cancelBtn) cancelBtn.disabled = false;

    if (success) {
      setTimeout(function () {
        closeIndicatorImportModal();
      }, 1100);
    }
  }

  function bindIndicatorImportModal() {
    var mask = $('#kiImportMask');
    var modal = $('#kiImportModal');
    var input = $('#kiiFileInput');
    var dropzone = $('#kiiDropzone');
    var clearBtn = $('#kiiFileClear');
    var tplBtn = $('#kiiTplBtn');
    if (!modal) return;

    if (mask) mask.addEventListener('click', closeIndicatorImportModal);

    modal.addEventListener('click', function (e) {
      var act = e.target.closest && e.target.closest('[data-act]');
      if (!act) return;
      var role = act.getAttribute('data-act');
      if (role === 'cancel') {
        closeIndicatorImportModal();
      } else if (role === 'ok') {
        if (!indicatorImportState.file) {
          if (typeof showToast === 'function') showToast('请先选择 Excel 文件');
          return;
        }
        if (act.textContent.indexOf('完成') >= 0) {
          closeIndicatorImportModal();
          return;
        }
        startIndicatorImport();
      }
    });

    if (tplBtn) {
      tplBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        downloadIndicatorTemplate();
      });
    }

    if (input) {
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        if (f) setIndicatorImportFile(f);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (indicatorImportState.importing) return;
        indicatorImportState.file = null;
        if (input) input.value = '';
        resetIndicatorImportProgress();
        refreshIndicatorImportUI();
      });
    }

    if (dropzone) {
      ['dragenter', 'dragover'].forEach(function (ev) {
        dropzone.addEventListener(ev, function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
          dropzone.classList.add('is-drag-over');
        });
      });
      ['dragleave', 'dragend'].forEach(function (ev) {
        dropzone.addEventListener(ev, function (e) {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('is-drag-over');
        });
      });
      dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('is-drag-over');
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) setIndicatorImportFile(f);
      });
    }
  }

  // ---------- 9) 通用确认弹窗 ----------
  var confirmCb = null;
  var confirmReturnFocus = null;
  function showConfirm(opts) {
    opts = opts || {};
    $('#kiConfirmTitle').textContent = opts.title || '操作确认';
    $('#kiConfirmSubtitle').textContent = opts.subtitle || '操作不可恢复（仅原型示例数据）。';
    $('#kiConfirmMessage').textContent = opts.message || '确定执行该操作吗？';
    var ok = $('#kiConfirmOk');
    if (ok) {
      $('#kiConfirmOkLabel').textContent = opts.okText || '确认';
      if (opts.danger === false) { ok.style.background = ''; ok.style.boxShadow = ''; }
      else {
        ok.style.background = '#ef4444';
        ok.style.boxShadow = '0 8px 20px rgba(239,68,68,.22)';
      }
    }
    $('#kiConfirmMask').classList.remove('hidden');
    $('#kiConfirmModal').classList.remove('hidden');
    confirmCb = opts.onOk || null;
    confirmReturnFocus = opts.returnFocus || null;
    if (confirmReturnFocus) ok.focus();
  }
  function closeConfirm() {
    $('#kiConfirmMask').classList.add('hidden');
    $('#kiConfirmModal').classList.add('hidden');
    confirmCb = null;
    if (confirmReturnFocus && confirmReturnFocus.isConnected) confirmReturnFocus.focus();
    confirmReturnFocus = null;
  }
  function bindConfirm() {
    var modal = $('#kiConfirmModal');
    var mask = $('#kiConfirmMask');
    if (!modal) return;
    if (mask) mask.addEventListener('click', closeConfirm);
    modal.addEventListener('click', function (e) {
      var act = e.target.closest && e.target.closest('[data-act]');
      if (!act) return;
      if (act.getAttribute('data-act') === 'cancel') closeConfirm();
      else {
        var cb = confirmCb; closeConfirm();
        if (typeof cb === 'function') cb();
      }
    });
  }

  // ---------- 10) 目录行内编辑（新增/重命名目录） ----------
  function getTreeRow(gid) {
    var tree = $('#kiTree');
    if (!tree) return null;
    var rows = $$('.ki-tree-row', tree);
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].getAttribute('data-gid') === gid) return rows[i];
    }
    return null;
  }

  function enterTreeEdit(labelEl, initial, onCommit) {
    if (!labelEl) return;
    var original = labelEl.textContent;
    var input = document.createElement('input');
    input.className = 'ki-tree-edit-input';
    input.value = initial || original || '';
    input.maxLength = 30;
    labelEl.textContent = '';
    labelEl.appendChild(input);
    setTimeout(function () { input.focus(); input.select(); }, 0);

    var finished = false;
    function finish(commit) {
      if (finished) return;
      finished = true;
      var v = (input.value || '').trim();
      var ok = commit && !!v;
      var next = ok ? v : original;
      if (input.parentElement) input.parentElement.removeChild(input);
      labelEl.textContent = next;
      if (typeof onCommit === 'function') onCommit(next, ok);
    }

    input.addEventListener('blur', function () { finish(true); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('click', function (e) { e.stopPropagation(); });
    input.addEventListener('contextmenu', function (e) { e.stopPropagation(); });
  }

  // ---------- 11) 右键菜单 ----------
  function bindContextMenu() {
    var menu = $('#kiCtxMenu');
    var tree = $('#kiTree');
    if (!menu || !tree) return;

    tree.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      var row = e.target.closest && e.target.closest('.ki-tree-row');
      if (!row) {
        state.ctx = { type: null, groupId: null };
        return;
      }
      var gid = row.getAttribute('data-gid');
      if (gid === '__all__') {
        // 仅"新增一级目录"
        state.ctx = { type: 'root', groupId: null };
      } else {
        state.ctx = { type: row.getAttribute('data-parent') ? 'child' : 'parent', groupId: gid };
        selectGroup(gid);
        row = getTreeRow(gid) || row;
      }
      $$('.ki-tree-row.context-active', tree).forEach(function (el) { el.classList.remove('context-active'); });
      row.classList.add('context-active');
      var x = e.clientX, y = e.clientY;
      menu.classList.remove('hidden');
      var vw = window.innerWidth, vh = window.innerHeight;
      menu.style.left = Math.min(x, vw - 170) + 'px';
      menu.style.top = Math.min(y, vh - 130) + 'px';

      // 调整菜单可用项
      var allowDelete = state.ctx.type !== 'root';
      var allowRename = state.ctx.type !== 'root';
      var allowNew = state.ctx.type !== 'child';
      $$('.ki-ctx-item', menu).forEach(function (b) {
        var act = b.getAttribute('data-act');
        var enabled = true;
        if (act === 'delete') enabled = allowDelete;
        else if (act === 'rename') enabled = allowRename;
        else if (act === 'new') enabled = allowNew;
        b.disabled = !enabled;
        b.style.opacity = enabled ? '' : '.45';
        b.style.cursor = enabled ? '' : 'not-allowed';
      });
    });

    function hideMenu() {
      menu.classList.add('hidden');
      $$('.ki-tree-row.context-active', tree).forEach(function (el) { el.classList.remove('context-active'); });
    }

    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target)) hideMenu();
    });
    window.addEventListener('blur', hideMenu);
    window.addEventListener('resize', hideMenu);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hideMenu();
    });

    menu.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.ki-ctx-item');
      if (!btn || btn.disabled) return;
      hideMenu();
      var act = btn.getAttribute('data-act');
      if (act === 'new') addGroup(state.ctx.type === 'root' ? null : state.ctx.groupId);
      else if (act === 'rename') renameGroup(state.ctx.groupId);
      else if (act === 'delete') confirmDeleteGroup(state.ctx.groupId);
    });
  }

  function addGroup(parentId) {
    var isRoot = !parentId;
    var id = uid('g');
    var draftName = isRoot ? '新建目录' : '新建子目录';

    if (isRoot) {
      TREE.push({ id: id, name: draftName, expanded: true, children: [] });
    } else {
      var info = findGroupById(parentId);
      if (!info || info.parent) {
        if (typeof showToast === 'function') showToast('当前目录不允许新增子级');
        return;
      }
      info.group.children = info.group.children || [];
      info.group.children.push({ id: id, name: draftName });
      info.group.expanded = true;
    }

    state.activeGroupId = id;
    renderTree();
    renderBread();
    renderList();

    var row = getTreeRow(id);
    var label = row ? row.querySelector('.ki-tr-name') : null;
    enterTreeEdit(label, draftName, function (name, ok) {
      if (!ok || !name) {
        if (isRoot) {
          TREE = TREE.filter(function (g) { return g.id !== id; });
        } else {
          var p = findGroupById(parentId);
          if (p) p.group.children = (p.group.children || []).filter(function (c) { return c.id !== id; });
        }
        state.activeGroupId = isRoot ? '__all__' : parentId;
        renderTree();
        renderBread();
        renderList();
        return;
      }
      var created = findGroupById(id);
      if (created) created.group.name = name;
      renderTree();
      renderBread();
      renderList();
      if (typeof showToast === 'function') showToast('已新增：' + name);
    });
  }

  function renameGroup(gid) {
    var info = findGroupById(gid); if (!info) return;
    var row = getTreeRow(gid);
    var label = row ? row.querySelector('.ki-tr-name') : null;
    enterTreeEdit(label, info.group.name, function (name, ok) {
      if (!ok || !name) {
        renderTree();
        return;
      }
      info.group.name = name;
      renderTree();
      renderBread();
      if (typeof showToast === 'function') showToast('已重命名为：' + name);
    });
  }

  function confirmDeleteGroup(gid) {
    var info = findGroupById(gid); if (!info) return;
    var subCount = (info.group.children || []).length;
    var indCount = INDICATORS.filter(function (it) {
      if (it.groupId === gid) return true;
      // 一级：检查所有子级
      if (!info.parent) {
        return (info.group.children || []).some(function (c) { return c.id === it.groupId; });
      }
      return false;
    }).length;
    showConfirm({
      title: '删除目录',
      subtitle: '删除目录将一并清空其下子目录的归属（指标本身保留，可在"全部指标"中找到）。',
      message: '确定要删除目录"' + info.group.name + '"吗？'
        + (subCount ? '\n该目录下还有 ' + subCount + ' 个子目录。' : '')
        + (indCount ? '\n影响指标：' + indCount + ' 个，将归到"未分类"。' : ''),
      okText: '确认删除',
      onOk: function () { doDeleteGroup(gid); }
    });
  }

  function doDeleteGroup(gid) {
    var info = findGroupById(gid); if (!info) return;
    var name = info.group.name;
    // 收集要被影响的指标 id（一级含全子级）
    var affectedGids = [info.group.id];
    if (!info.parent) (info.group.children || []).forEach(function (c) { affectedGids.push(c.id); });
    INDICATORS.forEach(function (it) {
      if (affectedGids.indexOf(it.groupId) >= 0) it.groupId = '__uncategorized__';
    });

    if (info.parent) {
      info.parent.children = (info.parent.children || []).filter(function (c) { return c.id !== gid; });
    } else {
      var idx = -1;
      for (var i = 0; i < TREE.length; i++) if (TREE[i].id === gid) { idx = i; break; }
      if (idx >= 0) TREE.splice(idx, 1);
    }
    if (state.activeGroupId === gid) state.activeGroupId = '__all__';
    renderTree();
    renderBread();
    renderList();
    if (typeof showToast === 'function') showToast('已删除：' + name);
  }

  function selectGroup(gid) {
    if (state.activeGroupId === gid) return;
    state.activeGroupId = gid;
    state.page = 1;
    renderTree();
    renderBread();
    renderList();
  }

  // ---------- 12) 列表行操作 / 杂项绑定 ----------
  function bindMisc() {
    // 左侧目录树点击
    var tree = $('#kiTree');
    if (tree) tree.addEventListener('click', function (e) {
      var chev = e.target.closest && e.target.closest('.chev');
      var row = e.target.closest && e.target.closest('.ki-tree-row');
      if (!row) return;
      var gid = row.getAttribute('data-gid');
      if (chev && row.parentElement && row.parentElement.classList.contains('ki-tree-group')) {
        // 折叠/展开
        e.stopPropagation();
        row.parentElement.classList.toggle('is-collapsed');
        var info = findGroupById(gid);
        if (info) info.group.expanded = !row.parentElement.classList.contains('is-collapsed');
        return;
      }
      selectGroup(gid);
    });

    // 左侧搜索
    var ts = $('#kiTreeSearch');
    if (ts) ts.addEventListener('input', function () {
      state.searchTreeKw = ts.value || '';
      renderTree();
    });

    // 左侧 + 按钮（新增一级目录）
    var addG = $('#kiBtnNewGroup');
    if (addG) addG.addEventListener('click', function () { addGroup(null); });

    // 顶部 新增指标
    var addI = $('#kiBtnNewIndicator');
    if (addI) addI.addEventListener('click', function () { openDrawer('create', null, state.activeGroupId); });
    var importBtn = $('#kiBtnImport');
    if (importBtn) importBtn.addEventListener('click', openIndicatorImportModal);
    var exportBtn = $('#kiBtnExport');
    if (exportBtn) exportBtn.addEventListener('click', exportIndicators);

    // 查询框 / 类型筛选 / 重置
    var kw = $('#kiKwInput');
    if (kw) kw.addEventListener('input', function () { state.keyword = kw.value || ''; state.page = 1; renderBread(); renderList(); });
    var tf = $('#kiTypeFilter');
    if (tf) tf.addEventListener('change', function () { state.typeFilter = tf.value || ''; state.page = 1; renderBread(); renderList(); });
    var rs = $('#kiBtnReset');
    if (rs) rs.addEventListener('click', function () {
      state.keyword = ''; state.typeFilter = ''; state.page = 1;
      if (kw) kw.value = ''; if (tf) tf.value = '';
      renderBread(); renderList();
    });

    // 列表行操作
    var tbody = $('#kiTbody');
    if (tbody) tbody.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-act]');
      if (!btn) return;
      var tr = btn.closest('tr');
      if (!tr) return;
      var id = tr.getAttribute('data-id');
      var act = btn.getAttribute('data-act');
      if (act === 'view') openDrawer('view', id);
      else if (act === 'edit') openDrawer('edit', id);
      else if (act === 'delete') confirmDeleteIndicator(id);
    });

    // 分页
    var pager = $('#kiPager');
    if (pager) pager.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('button[data-pg]');
      if (!btn || btn.disabled) return;
      var v = btn.getAttribute('data-pg');
      var list = getFilteredList();
      var totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
      if (v === 'prev') state.page = Math.max(1, state.page - 1);
      else if (v === 'next') state.page = Math.min(totalPages, state.page + 1);
      else state.page = parseInt(v, 10) || 1;
      renderList();
    });
    if (pager) pager.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'kiPgSize') {
        state.pageSize = parseInt(e.target.value, 10) || 10;
        state.page = 1;
        renderList();
      }
    });
  }

  function confirmDeleteIndicator(id) {
    var it = findIndicatorById(id); if (!it) return;
    showConfirm({
      title: '删除指标',
      subtitle: '指标删除后将不可恢复，可能影响已绑定该指标的看板和问数。',
      message: '确定要删除指标"' + it.name + '"吗？',
      okText: '确认删除',
      onOk: function () {
        var idx = -1;
        for (var i = 0; i < INDICATORS.length; i++) if (INDICATORS[i].id === id) { idx = i; break; }
        if (idx >= 0) INDICATORS.splice(idx, 1);
        renderTree();
        renderBread();
        renderList();
        if (typeof showToast === 'function') showToast('已删除：' + it.name);
      }
    });
  }

  // ---------- 13) 启动 ----------
  document.addEventListener('DOMContentLoaded', function () {
    seedIndicatorAnalysisExamples();
    renderTree();
    renderBread();
    renderList();
    bindMisc();
    bindContextMenu();
    bindDrawer();
    bindConfirm();
    bindIndicatorAnalysis();
    bindIndicatorImportModal();
  });

  // 控制台调试
  window.__KI = {
    TREE: TREE, INDICATORS: INDICATORS, state: state,
    open: openDrawer,
    openImport: openIndicatorImportModal,
    exportIndicators: exportIndicators
  };
})();
