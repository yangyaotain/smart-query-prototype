/* 指标体系公共原型数据。业务会话、右侧目录与管理端共用同一个 localStorage 目录。 */
(function (global) {
  'use strict';
  const KEY = 'smart-query-indicator-catalog-v1';
  const copy = (value) => JSON.parse(JSON.stringify(value));
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


  function flattenSourceTree() {
    return DATA_SOURCE_TREE.flatMap((domain) => domain.children.map((source) => ({ ...source, domainId: domain.id, domainName: domain.name })));
  }
  const themeIds = {
    '销售分析': INDICATORS.map((item) => item.id), '客户分析': ['i_arpu'], '库存分析': [],
    '财务分析': ['i_platform_fee', 'i_non_bid_fee', 'i_ca_income', 'i_total_income'],
    '经营概览': INDICATORS.map((item) => item.id)
  };
  const presentation = {
    i_non_bid_amt: { dimensions: ['统计时间', '采购方式', '项目'], example: '近6个月非招成交金额趋势如何？' },
    i_bid_amt: { dimensions: ['统计时间', '项目'], example: '本季度招标成交金额与上季度相比如何？' },
    i_platform_fee: { dimensions: ['统计时间', '项目'], example: '本月招标平台服务费收入是多少？' },
    i_non_bid_fee: { dimensions: ['统计时间', '采购方式', '项目'], example: '近3个月非招服务费收入变化如何？' },
    i_ca_income: { dimensions: ['统计时间'], example: '本季度CA证书收入是多少？' },
    i_total_income: { dimensions: ['统计时间', '收入类型'], example: '近6个月总收入趋势如何？' },
    i_arpu: { dimensions: ['统计时间', '客户'], example: '近3个月客单价变化如何？' }
  };
  function initial() { return { version: 1, revision: 0, groups: copy(TREE), indicators: INDICATORS.map((item) => ({ ...copy(item), ...copy(presentation[item.id] || {}) })), themes: copy(themeIds), adminSeeded: false }; }
  let readError = '';
  function snapshot() {
    try {
      const raw = global.localStorage.getItem(KEY);
      if (!raw) { readError = ''; return initial(); }
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.groups) || !Array.isArray(data.indicators) || !data.themes) throw new Error();
      readError = '';
      return data;
    } catch (_) {
      readError = '无法读取已保存的指标目录，请检查浏览器存储后重试；当前展示默认指标。';
      return initial();
    }
  }
  function write(data, origin) {
    if (readError) throw new Error(readError);
    data.revision += 1;
    try { global.localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (_) { throw new Error('保存失败，浏览器存储不可用或空间不足。待保存内容已保留，请重试。'); }
    global.dispatchEvent(new CustomEvent('indicator-catalog-change', { detail: { origin, revision: data.revision } }));
    return copy(data);
  }
  function groups(data = snapshot()) {
    const result = [{ id: '__uncategorized__', name: '未分类', path: '未分类' }];
    function walk(nodes, path) { nodes.forEach((node) => { const names = [...path, node.name]; result.push({ ...node, path: names.join(' / ') }); walk(node.children || [], names); }); }
    walk(data.groups, []);
    return result;
  }
  function models() {
    return DATA_SOURCES.flatMap((source) => (TABLES_BY_SRC[source.id] || []).map((table) => ({
      ref: source.id + '::' + table, srcId: source.id, table,
      name: TABLE_LABELS[table] || table, path: source.domainName + ' / ' + source.name + ' / ' + (TABLE_LABELS[table] || table)
    })));
  }
  // 只解析指标表达式，不执行用户输入。按最长指标名称匹配，避免包含关系造成误引用。
  function formulaInfo(formula, items) {
    const names = items.slice().sort((a, b) => b.name.length - a.name.length);
    const refs = new Set();
    let text = String(formula || '').trim();
    let normalized = '';
    while (text) {
      const whitespace = text.match(/^\s+/);
      if (whitespace) { text = text.slice(whitespace[0].length); continue; }
      const metric = names.find((item) => text.startsWith(item.name));
      if (metric) { refs.add(metric.id); normalized += 'v'; text = text.slice(metric.name.length); continue; }
      const token = text.match(/^(?:\d+(?:\.\d+)?|ROUND\b|ABS\b|SQRT\b|LOG\b|[+\-*/(),])/i);
      if (!token) return { refs: [...refs], error: '公式存在未匹配的指标或不支持的内容：' + text.slice(0, 24) };
      normalized += token[0]; text = text.slice(token[0].length);
    }
    // 递归下降校验运算符、括号和函数参数，不使用 eval / Function。
    const tokens = normalized.match(/ROUND|ABS|SQRT|LOG|\d+(?:\.\d+)?|v|[+\-*/(),]/gi) || [];
    let pos = 0;
    function expression() { term(); while (['+', '-'].includes(tokens[pos])) { pos++; term(); } }
    function term() { factor(); while (['*', '/'].includes(tokens[pos])) { pos++; factor(); } }
    function factor() {
      if (['+', '-'].includes(tokens[pos])) { pos++; factor(); return; }
      const token = tokens[pos++];
      if (token === '(') { expression(); if (tokens[pos++] !== ')') throw new Error(); }
      else if (/^(ROUND|ABS|SQRT|LOG)$/i.test(token || '')) {
        if (tokens[pos++] !== '(') throw new Error(); expression();
        let count = 1; while (tokens[pos] === ',') { pos++; expression(); count++; }
        if (tokens[pos++] !== ')' || (token.toUpperCase() === 'ROUND' ? count < 1 || count > 2 : count !== 1)) throw new Error();
      } else if (!/^(v|\d+(?:\.\d+)?)$/.test(token || '')) throw new Error();
    }
    try { expression(); if (pos !== tokens.length) throw new Error(); }
    catch (_) { return { refs: [...refs], error: '计算公式不完整，请检查运算符、括号和函数参数。' }; }
    return { refs: [...refs], error: '' };
  }
  function dependents(id, data = snapshot()) {
    return data.indicators.filter((item) => item.type === 'derived' && item.id !== id && formulaInfo(item.formula, data.indicators).refs.includes(id));
  }
  function validate(item, data = snapshot()) {
    const errors = [];
    if (!String(item.name || '').trim()) errors.push('请填写指标名称。');
    if ((item.name || '').length > 40) errors.push('指标名称不能超过 40 字。');
    if (!groups(data).some((group) => group.id === item.groupId)) errors.push('请选择有效的指标目录。');
    const aliases = (value) => String(value || '').split(/[,，、]/).map((name) => name.trim()).filter(Boolean);
    const ownNames = [item.name, ...aliases(item.synonyms)];
    if (data.indicators.some((other) => other.id !== item.id && [other.name, ...aliases(other.synonyms)].some((name) => ownNames.includes(name)))) errors.push('名称或同义词与已有指标重复，请调整。');
    if (!String(item.unit || '').trim()) errors.push('请明确指标单位。');
    if (item.type === 'atom') {
      if (!models().some((model) => model.srcId === item.srcId && model.table === item.table)) errors.push('请选择有效的数据模型。');
      if (!(FIELDS_BY_TABLE[item.table] || []).includes(item.field)) errors.push('请选择数据模型中的度量字段。');
      if (!AGG_OPTIONS.some((agg) => agg.key === item.agg)) errors.push('请选择聚合方式。');
      if (item.agg === 'CUSTOM' && !String(item.functionExpr || '').trim()) errors.push('请填写函数表达式。');
      if (item.timeField && !(FIELDS_BY_TABLE[item.table] || []).includes(item.timeField)) errors.push('统计时间字段不属于当前模型。');
    } else if (item.type === 'derived') {
      const items = data.indicators.filter((other) => other.id !== item.id).concat(item);
      const info = formulaInfo(item.formula, items);
      if (info.error) errors.push(info.error);
      if (!info.refs.length) errors.push('衍生指标至少需要引用一个已有指标。');
      function circular(id, path) {
        if (path.has(id)) return true;
        const metric = items.find((other) => other.id === id);
        if (!metric || metric.type !== 'derived') return false;
        const next = new Set(path); next.add(id);
        return formulaInfo(metric.formula, items).refs.some((ref) => circular(ref, next));
      }
      if (circular(item.id, new Set())) errors.push('公式存在循环引用，请调整。');
      const units = new Set(info.refs.map((id) => items.find((other) => other.id === id)?.unit));
      if (units.size > 1 && /[+\-]/.test(item.formula) && !/10000|100000000/.test(item.formula)) errors.push('参与加减的指标单位不一致，请先补充换算倍率。');
    } else errors.push('请选择原子指标或衍生指标。');
    const old = data.indicators.find((other) => other.id === item.id);
    if (old && old.unit !== item.unit && old.type === 'atom' && item.type === 'atom' && old.agg !== 'CUSTOM' && item.agg !== 'CUSTOM') errors.push('原子指标不能仅更改单位标签，请使用自定义函数表达式配置换算倍率。');
    return [...new Set(errors)];
  }
  function can(action) {
    try {
      const role = JSON.parse(global.localStorage.getItem('smart-query-user-profile') || '{}').role || '业务分析师';
      return action === 'view' || !/只读|访客/.test(role);
    } catch (_) { return action === 'view'; }
  }
  function save(item, options = {}) {
    const data = snapshot();
    const current = data.indicators.find((other) => other.id === item.id);
    if (!can(current ? 'edit' : 'create')) throw new Error('当前用户没有指标维护权限。');
    if (options.base && JSON.stringify(current) !== JSON.stringify(options.base)) throw new Error('指标已被其他操作修改或删除，请重新读取最新定义后确认。');
    const next = copy(item);
    if (!next.id) next.id = 'i_chat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    next.name = String(next.name || '').trim();
    const errors = validate(next, data);
    if (errors.length) throw new Error(errors.join('\n'));
    next.updatedAt = new Date().toLocaleDateString('sv-SE');
    next.updatedBy = options.origin === 'admin' ? '管理端维护' : '业务会话维护';
    // 重命名时按原公式的 token 更新依赖，保持引用同一个指标对象。
    if (current && current.name !== next.name) {
      if (next.example) next.example = next.example.split(current.name).join(next.name);
      const names = data.indicators.slice().sort((a, b) => b.name.length - a.name.length);
      dependents(current.id, data).forEach((dependent) => {
        let rest = dependent.formula, formula = '';
        while (rest) {
          const metric = names.find((other) => rest.startsWith(other.name));
          formula += metric ? (metric.id === current.id ? next.name : metric.name) : rest[0];
          rest = rest.slice(metric ? metric.name.length : 1);
        }
        dependent.formula = formula;
      });
    }
    const index = data.indicators.findIndex((other) => other.id === next.id);
    if (index < 0) data.indicators.unshift(next); else data.indicators[index] = next;
    if (Array.isArray(options.themes)) Object.entries(data.themes).forEach(([theme, ids]) => {
      data.themes[theme] = ids.filter((id) => id !== next.id);
      if (options.themes.includes(theme)) data.themes[theme].push(next.id);
    });
    write(data, options.origin || 'business');
    return copy(next);
  }
  function remove(id, base, origin = 'business') {
    const data = snapshot(), item = data.indicators.find((other) => other.id === id);
    if (!can('delete')) throw new Error('当前用户没有删除指标的权限。');
    if (!item || (base && JSON.stringify(item) !== JSON.stringify(base))) throw new Error('指标已被修改或删除，请重新读取后确认。');
    const refs = dependents(id, data);
    if (refs.length) throw new Error('无法删除，以下指标仍有引用：' + refs.map((other) => other.name).join('、'));
    data.indicators = data.indicators.filter((other) => other.id !== id);
    Object.keys(data.themes).forEach((theme) => { data.themes[theme] = data.themes[theme].filter((ref) => ref !== id); });
    return write(data, origin);
  }
  function commitCatalog(catalog, revision) {
    const data = snapshot();
    if (data.revision !== revision) throw new Error('指标目录已在其他窗口更新，本次未保存。请刷新最新目录后重试。');
    data.groups = copy(catalog.groups); data.indicators = copy(catalog.indicators); data.adminSeeded = true;
    Object.keys(data.themes).forEach((theme) => { data.themes[theme] = data.themes[theme].filter((id) => data.indicators.some((item) => item.id === id)); });
    return write(data, 'admin');
  }
  global.IndicatorStore = {
    snapshot, groups, models, validate, formulaInfo, dependents, save, remove, commitCatalog, can, copy,
    dictionaries: { DATA_SOURCE_TREE, DATA_SOURCES, TABLES_BY_SRC, TABLE_LABELS, FIELDS_BY_TABLE, FIELD_LABELS, CUSTOM_AGG_KEY, AGG_OPTIONS, UNIT_PRESETS, TIME_TPL_PRESETS }
  };
  global.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) global.dispatchEvent(new CustomEvent('indicator-catalog-change', { detail: { origin: 'storage' } }));
  });
})(window);
