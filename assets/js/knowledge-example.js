/* ======================================================================
 * 知识库 / 示例库（admin/knowledge-example.html）
 *  - 左：示例目录树（一级 / 二级，右键新增 / 重命名 / 删除）
 *  - 右：查询条件 + 示例列表 + 分页
 *  - 抽屉：查看 / 编辑 / 新增
 * ====================================================================== */
(function () {
  'use strict';

  var TYPE_LABEL = {
    single: '单表查询',
    stat: '统计查询',
    join: '联表查询',
    schema: '表结构'
  };

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

  var SOURCE_OPTIONS = flattenSourceTree();

  var TREE = [
    {
      id: 'g_sales', name: '销售分析示例', expanded: true,
      children: [
        { id: 'g_sales_order', name: '订单明细查询' },
        { id: 'g_sales_stat', name: '销售统计分析' },
        { id: 'g_sales_join', name: '客户订单联查' }
      ]
    },
    {
      id: 'g_customer', name: '客户分析示例', expanded: true,
      children: [
        { id: 'g_customer_profile', name: '客户画像查询' },
        { id: 'g_customer_retention', name: '复购与留存' }
      ]
    },
    {
      id: 'g_model', name: '模型结构示例', expanded: true,
      children: [
        { id: 'g_model_schema', name: '表结构问法' },
        { id: 'g_model_relation', name: '关联关系说明' }
      ]
    }
  ];

  var EXAMPLES = [
    {
      id: 'e_sales_month', groupId: 'g_sales_stat', name: '近6个月销售额趋势', type: 'stat',
      desc: '按月份聚合销售订单实付金额，输出趋势数据。',
      keywords: '销售额,趋势,月份',
      question: '近6个月销售额趋势如何？',
      srcId: 'ds_sales',
      tables: 'sales_order',
      sql: "SELECT DATE_FORMAT(order_date, '%Y-%m') AS month, SUM(sales_amount) AS total_sales FROM sales_order WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(order_date, '%Y-%m') ORDER BY month;"
    },
    {
      id: 'e_order_detail', groupId: 'g_sales_order', name: '订单明细查询', type: 'single',
      desc: '查询指定区域、时间范围内的订单明细。',
      keywords: '订单,明细,区域',
      question: '查询华东区本月订单明细',
      srcId: 'ds_sales',
      tables: 'sales_order',
      sql: "SELECT order_id, customer_id, region, sales_amount, order_date FROM sales_order WHERE region = '华东' AND order_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01');"
    },
    {
      id: 'e_customer_top', groupId: 'g_sales_join', name: 'TOP客户贡献排行', type: 'join',
      desc: '关联客户主数据与订单表，统计客户销售贡献。',
      keywords: '客户,排行,贡献',
      question: '本季度贡献最高的10个客户是谁？',
      srcId: 'ds_sales',
      tables: 'sales_order, customer',
      sql: "SELECT c.customer_name, SUM(o.sales_amount) AS total_sales FROM sales_order o JOIN customer c ON o.customer_id = c.customer_id WHERE o.order_date >= DATE_FORMAT(CURDATE(), '%Y-01-01') GROUP BY c.customer_name ORDER BY total_sales DESC LIMIT 10;"
    },
    {
      id: 'e_channel_rate', groupId: 'g_sales_stat', name: '渠道转化率分析', type: 'stat',
      desc: '按渠道统计访问、下单和转化率。',
      keywords: '渠道,转化率,统计',
      question: '各渠道近30天转化率是多少？',
      srcId: 'ds_metric',
      tables: 'event_track, sales_order',
      sql: "SELECT channel_name, COUNT(DISTINCT visitor_id) AS visitors, COUNT(DISTINCT order_id) AS orders, COUNT(DISTINCT order_id) / COUNT(DISTINCT visitor_id) AS conversion_rate FROM channel_conversion_daily WHERE biz_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY channel_name;"
    },
    {
      id: 'e_customer_profile', groupId: 'g_customer_profile', name: '客户画像查询', type: 'join',
      desc: '组合客户基础信息、标签和分层结果。',
      keywords: '客户画像,标签,分层',
      question: '查询重点客户的画像标签',
      srcId: 'ds_cdw',
      tables: 'customer_master, customer_tag, customer_segment',
      sql: "SELECT m.customer_name, s.segment, GROUP_CONCAT(t.tag) AS tags FROM customer_master m LEFT JOIN customer_segment s ON m.customer_id = s.customer_id LEFT JOIN customer_tag t ON m.customer_id = t.customer_id WHERE m.level = '重点客户' GROUP BY m.customer_name, s.segment;"
    },
    {
      id: 'e_repeat_rate', groupId: 'g_customer_retention', name: '客户复购率', type: 'stat',
      desc: '统计有多次下单记录的客户占比。',
      keywords: '复购率,客户,留存',
      question: '最近90天客户复购率是多少？',
      srcId: 'ds_sales',
      tables: 'sales_order',
      sql: "SELECT COUNT(CASE WHEN order_cnt > 1 THEN customer_id END) / COUNT(customer_id) AS repeat_rate FROM (SELECT customer_id, COUNT(*) AS order_cnt FROM sales_order WHERE order_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY) GROUP BY customer_id) t;"
    },
    {
      id: 'e_sales_schema', groupId: 'g_model_schema', name: '销售订单表结构', type: 'schema',
      desc: '说明销售订单表中的关键字段含义。',
      keywords: '表结构,字段,销售订单',
      question: 'sales_order 表有哪些字段？',
      srcId: 'ds_sales',
      tables: 'sales_order',
      sql: 'DESCRIBE sales_order;'
    },
    {
      id: 'e_inventory_stock', groupId: 'g_model_relation', name: '库存快照关联', type: 'join',
      desc: '说明库存快照与仓库、SKU 维表的关联查询。',
      keywords: '库存,关联,SKU',
      question: '查询各仓库各品类当前库存',
      srcId: 'ds_inventory',
      tables: 'inventory_snapshot, warehouse_dim, sku_dim',
      sql: "SELECT w.warehouse_name, s.category, SUM(i.stock_qty) AS stock_qty FROM inventory_snapshot i JOIN warehouse_dim w ON i.warehouse_id = w.warehouse_id JOIN sku_dim s ON i.sku_id = s.sku_id WHERE i.snapshot_date = CURDATE() GROUP BY w.warehouse_name, s.category;"
    }
  ];

  var state = {
    activeGroupId: '__all__',
    treeKeyword: '',
    filters: { name: '', desc: '', keyword: '', type: '' },
    page: 1,
    pageSize: 5,
    sqlTheme: 'light',
    drawer: { mode: null, exampleId: null, draft: null },
    ctxGroupId: null,
    confirm: null
  };

  function $(id) { return document.getElementById(id); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function escapeHTML(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function attr(s) { return escapeHTML(s).replace(/'/g, '&#39;'); }
  function uid(prefix) { return prefix + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1000); }

  function findGroup(id) {
    for (var i = 0; i < TREE.length; i++) {
      if (TREE[i].id === id) return { group: TREE[i], parent: null };
      var children = TREE[i].children || [];
      for (var j = 0; j < children.length; j++) {
        if (children[j].id === id) return { group: children[j], parent: TREE[i] };
      }
    }
    return null;
  }

  function groupName(id) {
    if (id === '__all__') return '全部示例';
    var found = findGroup(id);
    return found ? found.group.name : '全部示例';
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

  function sourceName(id) {
    for (var i = 0; i < SOURCE_OPTIONS.length; i++) {
      if (SOURCE_OPTIONS[i].id === id) return SOURCE_OPTIONS[i].name;
    }
    return id || '-';
  }

  function sourcePathName(id) {
    for (var i = 0; i < SOURCE_OPTIONS.length; i++) {
      if (SOURCE_OPTIONS[i].id === id) {
        return SOURCE_OPTIONS[i].domainName + ' / ' + SOURCE_OPTIONS[i].name;
      }
    }
    return '';
  }

  function examplesInGroup(gid) {
    if (gid === '__all__') return EXAMPLES.slice();
    var found = findGroup(gid);
    if (!found) return [];
    if (!found.parent) {
      var childIds = (found.group.children || []).map(function (c) { return c.id; });
      childIds.push(gid);
      return EXAMPLES.filter(function (x) { return childIds.indexOf(x.groupId) >= 0; });
    }
    return EXAMPLES.filter(function (x) { return x.groupId === gid; });
  }

  function getFilteredExamples() {
    var list = examplesInGroup(state.activeGroupId);
    var f = state.filters;
    return list.filter(function (x) {
      var hitName = !f.name || x.name.indexOf(f.name) >= 0;
      var hitDesc = !f.desc || x.desc.indexOf(f.desc) >= 0;
      var hitKeyword = !f.keyword || x.keywords.indexOf(f.keyword) >= 0;
      var hitType = !f.type || x.type === f.type;
      return hitName && hitDesc && hitKeyword && hitType;
    });
  }

  function renderTree() {
    var box = $('keTree');
    if (!box) return;
    var kw = state.treeKeyword.trim();
    var topActive = state.activeGroupId === '__all__' ? ' is-active' : '';
    var html = '<div class="ki-tree-row' + topActive + '" data-gid="__all__" oncontextmenu="return false;">'
      + '<span class="chev"></span><span class="ki-tr-name">全部示例</span>'
      + '<span class="ki-tr-cnt">' + EXAMPLES.length + '</span></div>';

    TREE.forEach(function (g) {
      var childHTML = '';
      (g.children || []).forEach(function (c) {
        if (kw && c.name.indexOf(kw) < 0 && g.name.indexOf(kw) < 0) return;
        var active = state.activeGroupId === c.id ? ' is-active' : '';
        childHTML += '<div class="ki-tree-row' + active + '" data-gid="' + attr(c.id) + '">'
          + '<span class="ki-tr-name">' + escapeHTML(c.name) + '</span>'
          + '<span class="ki-tr-cnt">' + examplesInGroup(c.id).length + '</span></div>';
      });
      if (kw && g.name.indexOf(kw) < 0 && !childHTML) return;
      var active = state.activeGroupId === g.id ? ' is-active' : '';
      var collapsed = g.expanded ? '' : ' is-collapsed';
      html += '<div class="ki-tree-group' + collapsed + '" data-gid="' + attr(g.id) + '">'
        + '<div class="ki-tree-row' + active + '" data-gid="' + attr(g.id) + '">'
        + '<span class="chev"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>'
        + '<span class="ki-tr-name">' + escapeHTML(g.name) + '</span>'
        + '<span class="ki-tr-cnt">' + examplesInGroup(g.id).length + '</span></div>'
        + '<div class="ki-tree-children">' + childHTML + '</div></div>';
    });
    box.innerHTML = html;
  }

  function renderBread() {
    var list = getFilteredExamples();
    if ($('keBreadText')) $('keBreadText').textContent = groupName(state.activeGroupId);
    if ($('keBreadCount')) $('keBreadCount').textContent = list.length;
  }

  function renderList() {
    var tbody = $('keTbody');
    if (!tbody) return;
    var list = getFilteredExamples();
    var totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    var start = (state.page - 1) * state.pageSize;
    var rows = list.slice(start, start + state.pageSize);
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9"><div class="ki-empty">暂无匹配示例</div></td></tr>';
      renderPager(list.length, totalPages);
      return;
    }
    tbody.innerHTML = rows.map(function (x) {
      return '<tr>'
        + '<td><button type="button" class="ki-name-title" data-act="view" data-id="' + attr(x.id) + '">' + escapeHTML(x.name) + '</button></td>'
        + '<td><span class="ke-type-tag is-' + attr(x.type) + '">' + escapeHTML(TYPE_LABEL[x.type]) + '</span></td>'
        + '<td><span class="ke-clip" title="' + attr(x.desc) + '">' + escapeHTML(x.desc) + '</span></td>'
        + '<td><span class="ke-clip" title="' + attr(x.keywords) + '">' + escapeHTML(x.keywords) + '</span></td>'
        + '<td><span class="ke-clip" title="' + attr(x.question) + '">' + escapeHTML(x.question) + '</span></td>'
        + '<td><span class="ke-clip" title="' + attr(sourceName(x.srcId)) + '">' + escapeHTML(sourceName(x.srcId)) + '</span></td>'
        + '<td><span class="ke-clip" title="' + attr(x.tables) + '">' + escapeHTML(x.tables) + '</span></td>'
        + '<td><span class="ke-clip ke-sql" title="' + attr(x.sql) + '">' + highlightSQL(x.sql) + '</span></td>'
        + '<td><span class="ki-row-act">'
        + iconButton('view', x.id, '查看', eyeSvg())
        + iconButton('edit', x.id, '编辑', editSvg())
        + iconButton('delete', x.id, '删除', trashSvg(), true)
        + '</span></td>'
        + '</tr>';
    }).join('');
    renderPager(list.length, totalPages);
  }

  function iconButton(act, id, title, svg, danger) {
    return '<button type="button" class="ki-icon-btn' + (danger ? ' is-danger' : '') + '" data-act="' + act + '" data-id="' + attr(id) + '" title="' + title + '">' + svg + '</button>';
  }
  function eyeSvg() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'; }
  function editSvg() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>'; }
  function trashSvg() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>'; }

  function renderPager(total, totalPages) {
    var pg = $('kePager');
    if (!pg) return;
    pg.innerHTML = '<div class="ki-pg-info">共 ' + total + ' 条，每页 '
      + '<select class="ki-pg-size" id="kePageSize"><option value="5">5</option><option value="10">10</option><option value="20">20</option></select>'
      + ' 条</div>'
      + '<div class="ki-pg-buttons">'
      + '<button type="button" data-page="' + (state.page - 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '>上一页</button>'
      + pagesHTML(totalPages)
      + '<button type="button" data-page="' + (state.page + 1) + '"' + (state.page >= totalPages ? ' disabled' : '') + '>下一页</button>'
      + '</div>';
    var size = $('kePageSize');
    if (size) size.value = String(state.pageSize);
  }

  function pagesHTML(totalPages) {
    var html = '';
    for (var i = 1; i <= totalPages; i++) {
      html += '<button type="button" class="' + (i === state.page ? 'is-current' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    return html;
  }

  function renderAll() {
    renderTree();
    renderBread();
    renderList();
  }

  function findExample(id) {
    return EXAMPLES.filter(function (x) { return x.id === id; })[0] || null;
  }

  function openDrawer(mode, id, presetGroupId) {
    var it = id ? findExample(id) : null;
    state.drawer.mode = mode;
    state.drawer.exampleId = id || null;
    state.drawer.draft = it ? Object.assign({}, it) : {
      id: null,
      groupId: presetGroupId && presetGroupId !== '__all__' ? presetGroupId : firstChildGroupId(),
      name: '',
      type: 'single',
      desc: '',
      keywords: '',
      question: '',
      srcId: SOURCE_OPTIONS[0].id,
      tables: '',
      sql: ''
    };
    var mask = $('keDrawerMask');
    var drawer = $('keDrawer');
    if (mask) mask.classList.remove('hidden');
    if (drawer) {
      drawer.classList.remove('hidden');
      drawer.setAttribute('aria-hidden', 'false');
    }
    renderDrawer();
  }

  function firstChildGroupId() {
    return TREE[0] && TREE[0].children && TREE[0].children[0] ? TREE[0].children[0].id : TREE[0].id;
  }

  function closeDrawer() {
    var mask = $('keDrawerMask');
    var drawer = $('keDrawer');
    if (mask) mask.classList.add('hidden');
    if (drawer) {
      drawer.classList.add('hidden');
      drawer.setAttribute('aria-hidden', 'true');
    }
  }

  function renderDrawer() {
    var mode = state.drawer.mode;
    var d = state.drawer.draft || {};
    var title = mode === 'create' ? '新增示例' : mode === 'edit' ? '编辑示例' : '示例详情';
    var chip = mode === 'create' ? '新增模式' : mode === 'edit' ? '编辑模式' : '查看模式';
    $('keDrawerTitle').textContent = title;
    $('keDrawerSubtitle').textContent = d.name || '维护问数示例、适用问题和对应 SQL';
    var chipEl = $('keModeChip');
    if (chipEl) {
      chipEl.textContent = chip;
      chipEl.className = 'ki-mode-chip ' + (mode === 'create' ? 'is-create' : mode === 'edit' ? 'is-edit' : '');
    }
    $('keDrawerBody').innerHTML = mode === 'view' ? viewBody(d) : formBody(d);
    $('keDrawerFoot').innerHTML = mode === 'view'
      ? '<button type="button" class="ghost-btn" data-act="close">关闭</button><button type="button" class="primary-btn" data-act="switch-edit">编辑</button>'
      : '<button type="button" class="ghost-btn" data-act="close">取消</button><button type="button" class="primary-btn" data-act="save">保存</button>';
  }

  function viewBody(d) {
    var kws = (d.keywords || '').split(',').filter(Boolean).map(function (k) {
      return '<span>' + escapeHTML(k.trim()) + '</span>';
    }).join('');
    return '<div class="ki-view-grid">'
      + viewCell('名称', d.name)
      + viewCell('类型', TYPE_LABEL[d.type])
      + viewCell('描述', d.desc, true)
      + viewCell('关键词', '<div class="ke-keyword-list">' + (kws || '<span>无</span>') + '</div>', true, true)
      + viewCell('示例问题', d.question, true)
      + viewCell('数据源', sourcePathName(d.srcId) || sourceName(d.srcId))
      + viewCell('相关表', d.tables)
      + '</div>'
      + '<div class="ki-view-section ke-sql-view-section is-' + attr(state.sqlTheme) + '">'
      + '<div class="ke-sql-section-head"><h4>对应SQL</h4><button type="button" class="ke-sql-theme" data-act="toggle-sql-theme">' + (state.sqlTheme === 'dark' ? '浅色' : '深色') + '</button></div>'
      + '<pre class="ke-view-sql is-' + attr(state.sqlTheme) + '">' + highlightSQL(formatSQL(d.sql || '')) + '</pre></div>';
  }

  function viewCell(label, value, full, raw) {
    return '<div class="ki-view-cell' + (full ? ' full' : '') + '"><div class="ki-view-label">' + label + '</div><div class="ki-view-value' + (!value ? ' empty' : '') + '">' + (raw ? value : escapeHTML(value || '未填写')) + '</div></div>';
  }

  function formBody(d) {
    return '<div class="ki-form-grid">'
      + field('名称', input('name', d.name, '请输入示例名称'))
      + field('类型', select('type', d.type, [
        ['single', '单表查询'], ['stat', '统计查询'], ['join', '联表查询'], ['schema', '表结构']
      ]))
      + '</div>'
      + field('描述', textarea('desc', d.desc, '说明示例适用场景'), true)
      + field('关键词', input('keywords', d.keywords, '多个关键词用逗号分隔'), true)
      + field('示例问题', textarea('question', d.question, '请输入业务用户可能提出的问题'), true)
      + '<div class="ki-form-grid">'
      + field('数据源', sourcePickerHTML(d.srcId))
      + field('所属目录', select('groupId', d.groupId, groupOptions()))
      + '</div>'
      + field('相关表', input('tables', d.tables, '如：sales_order, customer'), true)
      + field('对应SQL', sqlEditor(d.sql), true);
  }

  function field(label, control) {
    return '<div class="ki-form-row"><label class="ki-form-label">' + label + '</label>' + control + '</div>';
  }
  function input(name, value, ph) {
    return '<input class="ki-input" data-field="' + name + '" value="' + attr(value || '') + '" placeholder="' + attr(ph || '') + '" />';
  }
  function textarea(name, value, ph) {
    return '<textarea class="ki-textarea" data-field="' + name + '" placeholder="' + attr(ph || '') + '">' + escapeHTML(value || '') + '</textarea>';
  }
  function sourceTreeHTML(selectedId) {
    return DATA_SOURCE_TREE.map(function (domain) {
      var sources = domain.children || [];
      var hasSelected = sources.some(function (s) { return s.id === selectedId; });
      var sourceHTML = sources.map(function (s) {
        var active = s.id === selectedId ? ' is-active' : '';
        return ''
          + '<div class="ki-source-tree-node is-leaf">'
          + '<button type="button" class="ki-source-tree-row' + active + '" data-src-id="' + attr(s.id) + '">'
          + '<span class="ki-source-tree-toggle is-empty"></span>'
          + '<span class="ki-source-tree-icon is-source">'
          + '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5V12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5.5"/><path d="M5 12v6.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V12"/></svg>'
          + '</span>'
          + '<span class="ki-source-tree-name">' + escapeHTML(s.name) + '</span>'
          + '<span class="ki-source-tree-meta">' + escapeHTML(s.type || '') + '</span>'
          + '</button>'
          + '</div>';
      }).join('');
      return ''
        + '<div class="ki-source-tree-node' + (hasSelected ? '' : ' is-collapsed') + '" data-domain-id="' + attr(domain.id) + '">'
        + '<button type="button" class="ki-source-tree-row is-domain" data-domain-id="' + attr(domain.id) + '">'
        + '<span class="ki-source-tree-toggle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>'
        + '<span class="ki-source-tree-icon">'
        + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/></svg>'
        + '</span>'
        + '<span class="ki-source-tree-name">' + escapeHTML(domain.name) + '</span>'
        + '<span class="ki-source-tree-meta">' + sources.length + '</span>'
        + '</button>'
        + '<div class="ki-source-tree-children">' + sourceHTML + '</div>'
        + '</div>';
    }).join('');
  }

  function sourcePickerHTML(selectedId) {
    var label = sourcePathName(selectedId);
    return ''
      + '<div class="ki-source-picker" data-role="source-picker">'
      + '<button type="button" class="ki-source-picker-btn" data-act="toggle-source-tree" aria-haspopup="tree" aria-expanded="false">'
      + '<span class="ki-source-picker-text' + (label ? '' : ' is-placeholder') + '">' + escapeHTML(label || '请选择数据源') + '</span>'
      + '<span class="ki-source-picker-arrow"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span>'
      + '</button>'
      + '<div class="ki-source-tree-pop" role="tree">' + sourceTreeHTML(selectedId) + '</div>'
      + '</div>';
  }

  function sqlEditor(value) {
    var formatted = formatSQL(value || '');
    var lines = Math.max(6, formatted.split('\n').length);
    var nextThemeText = state.sqlTheme === 'dark' ? '浅色' : '深色';
    return '<div class="ke-sql-editor is-' + attr(state.sqlTheme) + '" data-role="sql-editor">'
      + '<div class="ke-sql-toolbar">'
      + '<span class="ke-sql-dot"></span><span class="ke-sql-dot"></span><span class="ke-sql-dot"></span>'
      + '<strong>SQL Editor</strong>'
      + '<button type="button" class="ke-sql-theme" data-act="toggle-sql-theme">' + nextThemeText + '</button>'
      + '<button type="button" class="ke-sql-format" data-act="format-sql">格式化</button>'
      + '</div>'
      + '<div class="ke-sql-body">'
      + '<div class="ke-sql-lines" aria-hidden="true">' + lineNumbers(lines) + '</div>'
      + '<div class="ke-sql-code">'
      + '<pre class="ke-sql-highlight" aria-hidden="true">' + highlightSQL(formatted) + '</pre>'
      + '<textarea class="ke-sql-input" data-field="sql" spellcheck="false" rows="' + lines + '" placeholder="请输入对应 SQL">' + escapeHTML(formatted) + '</textarea>'
      + '</div>'
      + '</div>'
      + '</div>';
  }
  function lineNumbers(count) {
    var html = '';
    for (var i = 1; i <= count; i++) html += '<span>' + i + '</span>';
    return html;
  }
  function select(name, value, opts) {
    return '<select class="ki-select-form" data-field="' + name + '">' + opts.map(function (o) {
      return '<option value="' + attr(o[0]) + '"' + (String(o[0]) === String(value) ? ' selected' : '') + '>' + escapeHTML(o[1]) + '</option>';
    }).join('') + '</select>';
  }
  function groupOptions() {
    var opts = [];
    TREE.forEach(function (g) {
      opts.push([g.id, g.name]);
      (g.children || []).forEach(function (c) { opts.push([c.id, '　' + c.name]); });
    });
    return opts;
  }

  function saveDrawer() {
    var d = state.drawer.draft || {};
    if (!d.name.trim()) { showToast('请填写名称'); return; }
    if (!d.question.trim()) { showToast('请填写示例问题'); return; }
    if (!d.sql.trim()) { showToast('请填写对应SQL'); return; }
    if (state.drawer.mode === 'create') {
      d.id = uid('e');
      EXAMPLES.unshift(Object.assign({}, d));
      state.activeGroupId = d.groupId;
      showToast('已新增示例');
    } else {
      for (var i = 0; i < EXAMPLES.length; i++) {
        if (EXAMPLES[i].id === state.drawer.exampleId) EXAMPLES[i] = Object.assign({}, d, { id: state.drawer.exampleId });
      }
      showToast('已保存修改');
    }
    closeDrawer();
    renderAll();
  }

  function addGroup(parentId) {
    var node = { id: uid('g'), name: '新建目录' };
    if (parentId) {
      var found = findGroup(parentId);
      var target = found && (found.parent ? found.parent : found.group);
      if (target) {
        target.children = target.children || [];
        target.children.push(node);
        target.expanded = true;
      }
    } else {
      node.expanded = true;
      node.children = [];
      TREE.push(node);
    }
    state.activeGroupId = node.id;
    renderAll();
    startRename(node.id);
  }

  function deleteGroup(id) {
    var found = findGroup(id);
    if (!found) return;
    var count = examplesInGroup(id).length;
    openConfirm('删除目录', '确定删除“' + found.group.name + '”吗？该目录下 ' + count + ' 条示例会移动到全部示例中展示。', function () {
      var removedIds = [id].concat((found.group.children || []).map(function (c) { return c.id; }));
      if (found.parent) {
        found.parent.children = (found.parent.children || []).filter(function (c) { return c.id !== id; });
      } else {
        TREE = TREE.filter(function (g) { return g.id !== id; });
      }
      EXAMPLES.forEach(function (x) {
        if (removedIds.indexOf(x.groupId) >= 0) x.groupId = firstChildGroupId();
      });
      state.activeGroupId = '__all__';
      renderAll();
      showToast('目录已删除');
    });
  }

  function startRename(id) {
    var row = document.querySelector('.ki-tree-row[data-gid="' + id + '"]');
    var found = findGroup(id);
    if (!row || !found) return;
    var nameEl = row.querySelector('.ki-tr-name');
    var old = found.group.name;
    nameEl.innerHTML = '<input class="ki-tree-edit-input" value="' + attr(old) + '" />';
    var inputEl = nameEl.querySelector('input');
    inputEl.focus();
    inputEl.select();
    var done = false;
    function finish(save) {
      if (done) return;
      done = true;
      var val = inputEl.value.trim();
      if (save && val) found.group.name = val;
      renderAll();
    }
    inputEl.addEventListener('blur', function () { finish(true); });
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') finish(true);
      if (e.key === 'Escape') finish(false);
    });
    inputEl.addEventListener('click', function (e) { e.stopPropagation(); });
    inputEl.addEventListener('contextmenu', function (e) { e.stopPropagation(); });
  }

  function openConfirm(title, msg, onOk) {
    state.confirm = onOk;
    $('keConfirmTitle').textContent = title;
    $('keConfirmMessage').textContent = msg;
    $('keConfirmMask').classList.remove('hidden');
    $('keConfirmModal').classList.remove('hidden');
  }
  function closeConfirm() {
    state.confirm = null;
    $('keConfirmMask').classList.add('hidden');
    $('keConfirmModal').classList.add('hidden');
  }

  function deleteExample(id) {
    var it = findExample(id);
    if (!it) return;
    openConfirm('删除示例', '确定删除“' + it.name + '”吗？', function () {
      EXAMPLES = EXAMPLES.filter(function (x) { return x.id !== id; });
      renderAll();
      showToast('示例已删除');
    });
  }

  function hideMenu() {
    var menu = $('keCtxMenu');
    if (menu) menu.classList.add('hidden');
    $$('.ki-tree-row.context-active').forEach(function (el) { el.classList.remove('context-active'); });
    state.ctxGroupId = null;
  }

  function bindEvents() {
    var tree = $('keTree');
    tree.addEventListener('click', function (e) {
      var row = e.target.closest('.ki-tree-row[data-gid]');
      if (!row) return;
      var gid = row.getAttribute('data-gid');
      if (e.target.closest('.chev') && gid !== '__all__') {
        var found = findGroup(gid);
        if (found && !found.parent) {
          found.group.expanded = !found.group.expanded;
          renderTree();
          return;
        }
      }
      state.activeGroupId = gid;
      state.page = 1;
      renderAll();
    });
    tree.addEventListener('contextmenu', function (e) {
      var row = e.target.closest('.ki-tree-row[data-gid]');
      if (!row || row.getAttribute('data-gid') === '__all__') return;
      e.preventDefault();
      hideMenu();
      row.classList.add('context-active');
      state.ctxGroupId = row.getAttribute('data-gid');
      var menu = $('keCtxMenu');
      menu.style.left = Math.min(e.clientX, window.innerWidth - 170) + 'px';
      menu.style.top = Math.min(e.clientY, window.innerHeight - 120) + 'px';
      menu.classList.remove('hidden');
    });
    $('keCtxMenu').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      var gid = state.ctxGroupId;
      hideMenu();
      if (act === 'new') addGroup(gid);
      if (act === 'rename') startRename(gid);
      if (act === 'delete') deleteGroup(gid);
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#keCtxMenu')) hideMenu();
    });
    window.addEventListener('resize', hideMenu);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hideMenu(); closeDrawer(); closeConfirm(); }
    });

    $('keTreeSearch').addEventListener('input', function () { state.treeKeyword = this.value || ''; renderTree(); });
    $('keBtnNewGroup').addEventListener('click', function () { addGroup(null); });
    $('keBtnNewExample').addEventListener('click', function () { openDrawer('create', null, state.activeGroupId); });

    [
      ['keNameInput', 'name'], ['keDescInput', 'desc'], ['keKeywordInput', 'keyword']
    ].forEach(function (pair) {
      $(pair[0]).addEventListener('input', function () {
        state.filters[pair[1]] = this.value || '';
        state.page = 1;
        renderBread();
        renderList();
      });
    });
    $('keTypeFilter').addEventListener('change', function () {
      state.filters.type = this.value || '';
      state.page = 1;
      renderBread();
      renderList();
    });
    $('keBtnReset').addEventListener('click', function () {
      state.filters = { name: '', desc: '', keyword: '', type: '' };
      $('keNameInput').value = '';
      $('keDescInput').value = '';
      $('keKeywordInput').value = '';
      $('keTypeFilter').value = '';
      state.page = 1;
      renderBread();
      renderList();
    });

    $('keTbody').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act][data-id]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      var id = btn.getAttribute('data-id');
      if (act === 'view') openDrawer('view', id);
      if (act === 'edit') openDrawer('edit', id);
      if (act === 'delete') deleteExample(id);
    });
    $('kePager').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-page]');
      if (!btn || btn.disabled) return;
      state.page = Number(btn.getAttribute('data-page')) || 1;
      renderList();
    });
    $('kePager').addEventListener('change', function (e) {
      if (e.target.id === 'kePageSize') {
        state.pageSize = Number(e.target.value) || 5;
        state.page = 1;
        renderList();
      }
    });

    $('keDrawerMask').addEventListener('click', closeDrawer);
    $('keDrawer').addEventListener('click', function (e) {
      var sourceBtn = e.target.closest && e.target.closest('[data-act="toggle-source-tree"]');
      if (sourceBtn) {
        e.stopPropagation();
        var sourceWrap = sourceBtn.closest('.ki-source-picker');
        $$('.ki-source-picker.is-open', $('keDrawer')).forEach(function (el) {
          if (el !== sourceWrap) el.classList.remove('is-open');
        });
        if (sourceWrap) {
          var isOpen = !sourceWrap.classList.contains('is-open');
          sourceWrap.classList.toggle('is-open', isOpen);
          sourceBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
        return;
      }

      var domainRow = e.target.closest && e.target.closest('.ki-source-tree-row.is-domain');
      if (domainRow) {
        e.stopPropagation();
        var domainNode = domainRow.closest('.ki-source-tree-node');
        if (domainNode) domainNode.classList.toggle('is-collapsed');
        return;
      }

      var sourceRow = e.target.closest && e.target.closest('.ki-source-tree-row[data-src-id]');
      if (sourceRow && state.drawer.draft) {
        e.stopPropagation();
        state.drawer.draft.srcId = sourceRow.getAttribute('data-src-id');
        renderDrawer();
        return;
      }

      if (!(e.target.closest && e.target.closest('.ki-source-picker'))) {
        $$('.ki-source-picker.is-open', $('keDrawer')).forEach(function (el) { el.classList.remove('is-open'); });
      }

      var actBtn = e.target.closest('[data-act]');
      if (!actBtn) return;
      var act = actBtn.getAttribute('data-act');
      if (act === 'close') closeDrawer();
      if (act === 'switch-edit') openDrawer('edit', state.drawer.exampleId);
      if (act === 'format-sql') formatDrawerSQL();
      if (act === 'toggle-sql-theme') toggleSqlTheme();
      if (act === 'save') saveDrawer();
    });
    $('keDrawer').addEventListener('input', function (e) {
      var field = e.target.getAttribute('data-field');
      if (field && state.drawer.draft) state.drawer.draft[field] = e.target.value;
      if (field === 'sql') syncSqlLines(e.target);
    });
    $('keDrawer').addEventListener('scroll', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('ke-sql-input')) syncSqlScroll(e.target);
    }, true);
    $('keDrawer').addEventListener('change', function (e) {
      var field = e.target.getAttribute('data-field');
      if (field && state.drawer.draft) state.drawer.draft[field] = e.target.value;
    });

    var grip = $('keDrawerResize');
    var resizing = false;
    if (grip) {
      grip.addEventListener('mousedown', function (e) {
        resizing = true;
        e.preventDefault();
      });
      document.addEventListener('mousemove', function (e) {
        if (!resizing) return;
        var drawer = $('keDrawer');
        var width = Math.min(Math.max(window.innerWidth - e.clientX, 420), window.innerWidth * 0.9);
        drawer.style.width = width + 'px';
      });
      document.addEventListener('mouseup', function () { resizing = false; });
    }

    $('keConfirmMask').addEventListener('click', closeConfirm);
    $('keConfirmModal').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'cancel') closeConfirm();
      if (act === 'ok') {
        var fn = state.confirm;
        closeConfirm();
        if (typeof fn === 'function') fn();
      }
    });
  }

  function formatDrawerSQL() {
    var inputEl = $('keDrawer').querySelector('.ke-sql-input');
    if (!inputEl || !state.drawer.draft) return;
    inputEl.value = formatSQL(inputEl.value);
    state.drawer.draft.sql = inputEl.value;
    syncSqlLines(inputEl);
    showToast('SQL 已格式化');
  }

  function toggleSqlTheme() {
    state.sqlTheme = state.sqlTheme === 'dark' ? 'light' : 'dark';
    var editor = $('keDrawer').querySelector('.ke-sql-editor');
    var viewSql = $('keDrawer').querySelector('.ke-view-sql');
    $$('#keDrawer [data-act="toggle-sql-theme"]').forEach(function (btn) {
      btn.textContent = state.sqlTheme === 'dark' ? '浅色' : '深色';
    });
    [editor, viewSql].forEach(function (el) {
      if (!el) return;
      el.classList.toggle('is-dark', state.sqlTheme === 'dark');
      el.classList.toggle('is-light', state.sqlTheme === 'light');
    });
    var viewSection = $('keDrawer').querySelector('.ke-sql-view-section');
    if (viewSection) {
      viewSection.classList.toggle('is-dark', state.sqlTheme === 'dark');
      viewSection.classList.toggle('is-light', state.sqlTheme === 'light');
    }
  }

  function syncSqlLines(inputEl) {
    var editor = inputEl.closest('.ke-sql-editor');
    if (!editor) return;
    var lines = Math.max(6, inputEl.value.split('\n').length);
    var lineBox = editor.querySelector('.ke-sql-lines');
    if (lineBox) lineBox.innerHTML = lineNumbers(lines);
    inputEl.rows = lines;
    var highlight = editor.querySelector('.ke-sql-highlight');
    if (highlight) highlight.innerHTML = highlightSQL(inputEl.value);
    syncSqlScroll(inputEl);
  }

  function syncSqlScroll(inputEl) {
    var editor = inputEl.closest('.ke-sql-editor');
    if (!editor) return;
    var highlight = editor.querySelector('.ke-sql-highlight');
    if (highlight) {
      highlight.style.transform = 'translate(' + (-inputEl.scrollLeft) + 'px, ' + (-inputEl.scrollTop) + 'px)';
    }
  }

  function highlightSQL(sql) {
    var html = escapeHTML(sql || '');
    var multiKeywords = ['GROUP BY', 'ORDER BY', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'UNION ALL'];
    multiKeywords.forEach(function (kw) {
      var re = new RegExp('\\b' + kw.replace(/\s+/g, '\\s+') + '\\b', 'ig');
      html = html.replace(re, function (m) { return '<span class="ke-sql-kw">' + m.toUpperCase() + '</span>'; });
    });
    html = html.replace(/\b(SELECT|FROM|WHERE|HAVING|JOIN|ON|AS|AND|OR|LIMIT|UNION|DISTINCT|CASE|WHEN|THEN|ELSE|END|DESC|ASC|INTERVAL)\b/ig, function (m) {
      return '<span class="ke-sql-kw">' + m.toUpperCase() + '</span>';
    });
    html = html.replace(/\b(SUM|COUNT|AVG|MAX|MIN|DATE_FORMAT|DATE_SUB|CURDATE|YEAR|QUARTER|GROUP_CONCAT)\b/ig, function (m) {
      return '<span class="ke-sql-fn">' + m.toUpperCase() + '</span>';
    });
    html = html.replace(/('[^']*')/g, '<span class="ke-sql-str">$1</span>');
    html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="ke-sql-num">$1</span>');
    return html;
  }

  function formatSQL(sql) {
    var text = String(sql || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    var keywords = [
      'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING',
      'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'JOIN', 'LIMIT', 'UNION ALL', 'UNION'
    ];
    keywords.forEach(function (kw) {
      var re = new RegExp('\\s+' + kw.replace(/\s+/g, '\\s+') + '\\s+', 'ig');
      text = text.replace(re, '\n' + kw + ' ');
    });
    text = text.replace(/\s+(AND|OR)\s+/ig, '\n  $1 ');
    text = text.replace(/,\s*/g, ',\n  ');
    text = text.replace(/^\n+/, '');
    return text.split('\n').map(function (line) {
      return line.replace(/\s+$/g, '');
    }).join('\n');
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderAll();
    bindEvents();
  });
})();
