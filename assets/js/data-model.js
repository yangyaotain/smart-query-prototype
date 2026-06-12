/* =====================================================================
 * 数据模型管理（data-model.html）
 *  - 左侧数据源目录树
 *  - 右侧顶部信息条 + 工具栏 + ER 拓扑画布
 *  - 表节点拖动 / 选中
 *  - 连线点击编辑 JOIN 类型 + 关联字段映射
 *  - 右侧属性抽屉，可拖动调整宽度
 *  - 模块化为多个 step 函数，便于排查
 * ===================================================================== */
(function () {
  // ===================================================================
  // 1) 数据层：mock 数据源 + 表字段 + 关联关系
  // ===================================================================
  const NODE_W = 180;
  const ROW_H = 22;
  const HEAD_H = 28;
  const NODE_PAD_H = 0;

  function getThemeColors() {
    return typeof window.getSmartQueryThemeColors === 'function'
      ? window.getSmartQueryThemeColors()
      : {
          primary: 'var(--primary)',
          primaryAccentStrong: 'var(--primary-accent-strong)',
          primaryBorder: 'var(--primary-border)',
          heading: 'var(--heading)'
        };
  }

  /** 表字段：name / alias / type / pk / fk(true) */
  function f(name, alias, type, opts) {
    return Object.assign({ name, alias, type, pk: false, fk: false, nn: false }, opts || {});
  }

  /** 关联关系节点位置：x/y 为节点左上角；fields 顺序决定字段在节点内 y 偏移 */
  const DM_DATA = [
    {
      id: 'd_sales',
      name: '销售域',
      sources: [
        {
          id: 's_sales_prod',
          name: '销售业务库',
          type: 'MySQL',
          addr: 'sales-prod.internal',
          status: 'ok',
          sync: '今日 08:00',
          tables: [
            {
              name: 'sales_order', alias: '销售订单', comment: '销售订单主表', type: 'fact', rows: 1200000,
              pos: { x: 60, y: 180 },
              fields: [
                f('order_id', '订单ID', 'BIGINT', { pk: true, nn: true }),
                f('customer_id', '客户ID', 'BIGINT', { fk: true, nn: true }),
                f('product_id', '产品ID', 'BIGINT', { fk: true, nn: true }),
                f('channel_id', '渠道ID', 'BIGINT', { fk: true }),
                f('order_date', '订单日期', 'DATE', { nn: true }),
                f('region', '销售区域', 'VARCHAR(32)'),
                f('sales_amount', '销售金额', 'DECIMAL(12,2)'),
                f('quantity', '数量', 'INT')
              ],
              preview: [
                ['SO20260501001', 1001, 'P-301', 'C-01', '2026-05-01', '华东', 1280.00, 2],
                ['SO20260501002', 1002, 'P-205', 'C-02', '2026-05-01', '华南', 980.50, 1],
                ['SO20260502001', 1003, 'P-309', 'C-01', '2026-05-02', '华东', 4500.00, 5],
                ['SO20260502002', 1004, 'P-118', 'C-03', '2026-05-02', '华北', 760.00, 1],
                ['SO20260503001', 1005, 'P-205', 'C-01', '2026-05-03', '华东', 980.50, 1]
              ]
            },
            {
              name: 'sales_order_item', alias: '订单明细', comment: '销售订单明细', type: 'fact', rows: 5400000,
              pos: { x: 420, y: 320 },
              fields: [
                f('item_id', '明细ID', 'BIGINT', { pk: true, nn: true }),
                f('order_id', '订单ID', 'BIGINT', { fk: true, nn: true }),
                f('product_id', '产品ID', 'BIGINT', { fk: true, nn: true }),
                f('price', '单价', 'DECIMAL(12,2)'),
                f('qty', '数量', 'INT'),
                f('amount', '金额', 'DECIMAL(12,2)')
              ],
              preview: [
                ['IT001', 'SO20260501001', 'P-301', 640.00, 2, 1280.00],
                ['IT002', 'SO20260501002', 'P-205', 980.50, 1, 980.50],
                ['IT003', 'SO20260502001', 'P-309', 900.00, 5, 4500.00]
              ]
            },
            {
              name: 'customer', alias: '客户', comment: '客户主表', type: 'dim', rows: 86000,
              pos: { x: 420, y: 80 },
              fields: [
                f('customer_id', '客户ID', 'BIGINT', { pk: true, nn: true }),
                f('customer_name', '客户名称', 'VARCHAR(64)', { nn: true }),
                f('industry', '所属行业', 'VARCHAR(32)'),
                f('city', '城市', 'VARCHAR(32)'),
                f('vip_level', 'VIP等级', 'VARCHAR(8)'),
                f('register_date', '注册日期', 'DATE')
              ],
              preview: [
                [1001, 'A 科技公司', '科技', '上海', 'V3', '2024-03-12'],
                [1002, 'B 贸易公司', '贸易', '广州', 'V2', '2024-05-20'],
                [1003, 'C 制造公司', '制造', '杭州', 'V4', '2023-11-01']
              ]
            },
            {
              name: 'product', alias: '产品', comment: '产品维度', type: 'dim', rows: 12000,
              pos: { x: 780, y: 80 },
              fields: [
                f('product_id', '产品ID', 'VARCHAR(16)', { pk: true, nn: true }),
                f('product_name', '产品名称', 'VARCHAR(64)', { nn: true }),
                f('category', '类目', 'VARCHAR(32)'),
                f('unit_price', '标准单价', 'DECIMAL(12,2)')
              ],
              preview: [
                ['P-301', '智能音箱 Pro', '电子', 640.00],
                ['P-205', '便携蓝牙耳机', '电子', 980.50],
                ['P-309', '工业打印机', '设备', 900.00]
              ]
            },
            {
              name: 'channel', alias: '渠道', comment: '销售渠道维度', type: 'dim', rows: 36,
              pos: { x: 780, y: 240 },
              fields: [
                f('channel_id', '渠道ID', 'VARCHAR(16)', { pk: true, nn: true }),
                f('channel_name', '渠道名称', 'VARCHAR(32)', { nn: true }),
                f('channel_type', '渠道类型', 'VARCHAR(16)')
              ],
              preview: [
                ['C-01', '官网商城', '线上'],
                ['C-02', '天猫旗舰店', '线上'],
                ['C-03', '直营门店', '线下']
              ]
            },
            {
              name: 'region_dim', alias: '销售区域', comment: '销售区域维度', type: 'dim', rows: 36,
              pos: { x: 1080, y: 200 },
              fields: [
                f('region_code', '区域编码', 'VARCHAR(8)', { pk: true, nn: true }),
                f('region_name', '区域名称', 'VARCHAR(32)', { nn: true }),
                f('manager', '区域负责人', 'VARCHAR(32)')
              ],
              preview: [
                ['EAST', '华东', '李华'],
                ['SOUTH', '华南', '王刚'],
                ['NORTH', '华北', '张敏']
              ]
            },
            {
              name: 'order_promotion_bridge', alias: '订单促销桥接', comment: '订单与促销活动多对多桥接表', type: 'bridge', rows: 280000,
              pos: { x: 1080, y: 380 },
              fields: [
                f('order_id', '订单ID', 'BIGINT', { pk: true, fk: true, nn: true }),
                f('promotion_id', '促销ID', 'VARCHAR(32)', { pk: true, nn: true }),
                f('product_id', '产品ID', 'VARCHAR(16)', { fk: true }),
                f('allocation_amount', '分摊金额', 'DECIMAL(12,2)'),
                f('applied_at', '生效时间', 'DATETIME')
              ],
              preview: [
                ['SO20260501001', 'PROMO-MAY-01', 'P-301', 128.00, '2026-05-01 10:18'],
                ['SO20260501002', 'PROMO-MAY-02', 'P-205', 98.05, '2026-05-01 11:02'],
                ['SO20260502001', 'PROMO-VIP-01', 'P-309', 450.00, '2026-05-02 15:26']
              ]
            },
            {
              name: 'sync_task_log', alias: '同步任务日志', comment: '模型同步与质量校验日志', type: 'other', rows: 180000,
              pos: { x: 60, y: 500 },
              fields: [
                f('log_id', '日志ID', 'BIGINT', { pk: true, nn: true }),
                f('task_name', '任务名称', 'VARCHAR(64)', { nn: true }),
                f('source_table', '来源表', 'VARCHAR(64)'),
                f('status', '执行状态', 'VARCHAR(16)'),
                f('start_time', '开始时间', 'DATETIME'),
                f('duration_ms', '耗时毫秒', 'INT'),
                f('message', '说明', 'VARCHAR(256)')
              ],
              preview: [
                [90001, '销售订单日同步', 'sales_order', 'SUCCESS', '2026-05-20 08:00:01', 4820, '增量同步完成'],
                [90002, '订单明细质量校验', 'sales_order_item', 'SUCCESS', '2026-05-20 08:05:13', 3610, '主键重复率 0%'],
                [90003, '促销桥接表同步', 'order_promotion_bridge', 'WARN', '2026-05-20 08:08:42', 5290, '存在 2 条延迟到达数据']
              ]
            }
          ],
          // 关系：from/to = 表 name；fromField/toField = 字段 name；join = inner|left|right|full
          relations: [
            { id: 'r1', from: 'sales_order', to: 'customer', join: 'left', mappings: [{ fromField: 'customer_id', toField: 'customer_id' }] },
            { id: 'r2', from: 'sales_order', to: 'product', join: 'left', mappings: [{ fromField: 'product_id', toField: 'product_id' }] },
            { id: 'r3', from: 'sales_order', to: 'channel', join: 'inner', mappings: [{ fromField: 'channel_id', toField: 'channel_id' }] },
            { id: 'r4', from: 'sales_order_item', to: 'sales_order', join: 'inner', mappings: [{ fromField: 'order_id', toField: 'order_id' }] },
            { id: 'r5', from: 'sales_order_item', to: 'product', join: 'left', mappings: [{ fromField: 'product_id', toField: 'product_id' }] }
          ]
        },
        {
          id: 's_order_svc',
          name: '订单服务库',
          type: 'MySQL',
          addr: 'order-svc.internal',
          status: 'ok',
          sync: '今日 08:30',
          tables: [
            {
              name: 'order_pay', alias: '订单支付', comment: '订单支付流水', type: 'fact', rows: 3800000,
              pos: { x: 80, y: 100 },
              fields: [
                f('pay_id', '支付ID', 'BIGINT', { pk: true, nn: true }),
                f('order_id', '订单ID', 'BIGINT', { fk: true, nn: true }),
                f('pay_channel', '支付渠道', 'VARCHAR(16)', { fk: true }),
                f('pay_amount', '支付金额', 'DECIMAL(12,2)'),
                f('pay_time', '支付时间', 'DATETIME')
              ],
              preview: [
                ['PAY001', 'SO20260501001', 'WX', 1280.00, '2026-05-01 10:21'],
                ['PAY002', 'SO20260501002', 'ALIPAY', 980.50, '2026-05-01 11:05']
              ]
            },
            {
              name: 'pay_channel_dim', alias: '支付渠道', comment: '支付渠道维度', type: 'dim', rows: 24,
              pos: { x: 480, y: 100 },
              fields: [
                f('channel_code', '渠道编码', 'VARCHAR(16)', { pk: true, nn: true }),
                f('channel_name', '渠道名称', 'VARCHAR(32)', { nn: true })
              ],
              preview: [
                ['WX', '微信支付'],
                ['ALIPAY', '支付宝'],
                ['UNION', '银联']
              ]
            }
          ],
          relations: [
            { id: 'r1', from: 'order_pay', to: 'pay_channel_dim', join: 'left', mappings: [{ fromField: 'pay_channel', toField: 'channel_code' }] }
          ]
        }
      ]
    },
    {
      id: 'd_customer',
      name: '客户域',
      sources: [
        {
          id: 's_customer_dw',
          name: '客户数据仓库',
          type: 'PostgreSQL',
          addr: 'customer-dw.internal',
          status: 'ok',
          sync: '昨日 23:00',
          tables: [
            {
              name: 'customer', alias: '客户', comment: '客户主表', type: 'dim', rows: 860000,
              pos: { x: 80, y: 100 },
              fields: [
                f('customer_id', '客户ID', 'BIGINT', { pk: true, nn: true }),
                f('customer_name', '客户名称', 'VARCHAR(64)', { nn: true }),
                f('industry', '行业', 'VARCHAR(32)'),
                f('register_date', '注册日期', 'DATE')
              ],
              preview: [
                [1001, 'A 科技公司', '科技', '2024-03-12'],
                [1002, 'B 贸易公司', '贸易', '2024-05-20']
              ]
            },
            {
              name: 'customer_tag', alias: '客户标签', comment: '客户标签桥接表', type: 'bridge', rows: 5600000,
              pos: { x: 480, y: 80 },
              fields: [
                f('customer_id', '客户ID', 'BIGINT', { pk: true, fk: true, nn: true }),
                f('tag_code', '标签编码', 'VARCHAR(32)', { pk: true, nn: true }),
                f('tag_value', '标签值', 'VARCHAR(64)')
              ],
              preview: [
                [1001, 'GMV_LEVEL', 'TOP10'],
                [1001, 'INDUSTRY', '科技'],
                [1002, 'GMV_LEVEL', 'NORMAL']
              ]
            },
            {
              name: 'customer_segment', alias: '客户分群', comment: '客户分群', type: 'dim', rows: 24,
              pos: { x: 480, y: 320 },
              fields: [
                f('segment_id', '分群ID', 'INT', { pk: true, nn: true }),
                f('segment_name', '分群名称', 'VARCHAR(32)', { nn: true }),
                f('description', '分群描述', 'VARCHAR(128)')
              ],
              preview: [
                [1, '高价值客户', 'GMV 排名 TOP 10%'],
                [2, '潜力客户', '近 30 天活跃度上升']
              ]
            }
          ],
          relations: [
            { id: 'r1', from: 'customer_tag', to: 'customer', join: 'left', mappings: [{ fromField: 'customer_id', toField: 'customer_id' }] }
          ]
        }
      ]
    }
  ];

  // 初始化 inCanvas：默认只把"参与了关联关系"的表放上画布
  DM_DATA.forEach(function (d) {
    d.sources.forEach(function (s) {
      var used = {};
      (s.relations || []).forEach(function (r) {
        used[r.from] = true;
        used[r.to] = true;
      });
      s.tables.forEach(function (t) {
        t.inCanvas = !!used[t.name];
      });
    });
  });

  // 暴露到全局，供后续步骤渲染
  window.__DM = {
    DATA: DM_DATA,
    NODE_W,
    ROW_H,
    HEAD_H,
    NODE_PAD_H,
    activeSourceId: DM_DATA[0].sources[0].id,
    treeKeyword: '',
    tableKeyword: '',
    selection: null,         // { type:'table'|'edge', id }
    focusTable: null,        // 聚焦模式下的表名
    viewport: null,          // { x, y, w, h } svg viewBox
    _contentBox: null,       // 内容外接框 { w, h }
    _fitOnNextRender: false  // 下一帧渲染时强制将 viewport 重置为内容
  };

  // 工具函数
  window.__DM.escapeHTML = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  window.__DM.findSource = function (id) {
    for (var i = 0; i < DM_DATA.length; i++) {
      var d = DM_DATA[i];
      for (var j = 0; j < d.sources.length; j++) {
        if (d.sources[j].id === id) return { domain: d, source: d.sources[j] };
      }
    }
    return null;
  };

  window.__DM.findTable = function (source, name) {
    if (!source) return null;
    for (var i = 0; i < source.tables.length; i++) {
      if (source.tables[i].name === name) return source.tables[i];
    }
    return null;
  };

  /** 取该表所有"参与关联关系"的字段名集合（按表内原顺序输出）。
   *  仅统计两端都在画布上、且在当前可见集合内的关系。 */
  window.__DM.getVisibleFields = function (table, source) {
    if (!table || !source) return [];
    var rels = source.relations || [];
    var used = {};
    var byName = {};
    source.tables.forEach(function (t) { byName[t.name] = t; });
    var focusName = window.__DM.focusTable;
    rels.forEach(function (rel) {
      var a = byName[rel.from];
      var b = byName[rel.to];
      if (!a || !b || !a.inCanvas || !b.inCanvas) return;
      if (focusName && rel.from !== focusName && rel.to !== focusName) return;
      if (rel.from === table.name) {
        (rel.mappings || []).forEach(function (m) {
          if (m.fromField) used[m.fromField] = true;
        });
      }
      if (rel.to === table.name) {
        (rel.mappings || []).forEach(function (m) {
          if (m.toField) used[m.toField] = true;
        });
      }
    });
    return table.fields.filter(function (f) { return used[f.name]; });
  };

  window.__DM.nodeHeight = function (table, source) {
    var vis = source ? window.__DM.getVisibleFields(table, source) : table.fields;
    var rows = Math.max(1, vis.length);
    return HEAD_H + (rows * ROW_H) + NODE_PAD_H;
  };

  // ===================================================================
  // 2) 渲染：左侧目录树
  // ===================================================================
  var ICONS = {
    domain: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/></svg>',
    source: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5V12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5.5"/><path d="M5 12v6.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V12"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    table: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 3v18"/></svg>'
  };

  function tableMatches(table, keyword) {
    if (!keyword) return true;
    var k = keyword.toLowerCase();
    return (table.name + ' ' + (table.alias || '') + ' ' + (table.comment || '')).toLowerCase().indexOf(k) >= 0;
  }

  function getTableTypeMeta(type) {
    var typeMap = {
      dim: { key: 'dim', label: '维度表' },
      fact: { key: 'fact', label: '事实表' },
      bridge: { key: 'bridge', label: '桥接表' },
      other: { key: 'other', label: '其它表' }
    };
    return typeMap[type] || typeMap.other;
  }

  function renderTree() {
    var DM = window.__DM;
    var tree = document.getElementById('dmTree');
    if (!tree) return;

    var keyword = (DM.treeKeyword || '').trim().toLowerCase();

    var html = DM.DATA.map(function (domain) {
      var sourcesHTML = domain.sources.map(function (s) {
        var matchedTables = (s.tables || []).filter(function (t) { return tableMatches(t, keyword); });
        var sourceMatched = !keyword
          || domain.name.toLowerCase().indexOf(keyword) >= 0
          || s.name.toLowerCase().indexOf(keyword) >= 0;
        var hasMatchedTables = matchedTables.length > 0;
        if (keyword && !sourceMatched && !hasMatchedTables) return '';

        var tablesToShow = (keyword && !sourceMatched) ? matchedTables : (s.tables || []);
        var sourceActive = s.id === DM.activeSourceId;
        var sourceCls = sourceActive ? 'dmt-row active' : 'dmt-row';

        // 数据源默认折叠：仅当当前选中或有匹配关键词时展开
        var srcCollapsed = (sourceActive || keyword) ? false : true;

        var tablesHTML = tablesToShow.map(function (t) {
          var inCanvas = !!t.inCanvas;
          var typeMeta = getTableTypeMeta(t.type);
          var rowCls = 'dmt-row dmt-table-row' + (inCanvas ? ' is-in-canvas' : ' is-not-in-canvas');
          var typeBadge = '<span class="dmt-type dmt-type-' + typeMeta.key + '" title="' + typeMeta.label + '">' + typeMeta.label + '</span>';
          var canvasTitle = inCanvas ? '已添加到画布' : '未添加到画布';
          return ''
            + '<div class="dmt-node leaf dmt-table-node" data-source-id="' + s.id + '" data-table-name="' + DM.escapeHTML(t.name) + '" draggable="true">'
            +   '<div class="' + rowCls + '" data-source-id="' + s.id + '" data-table-name="' + DM.escapeHTML(t.name) + '" title="' + DM.escapeHTML(t.name) + (t.alias ? ' · ' + DM.escapeHTML(t.alias) : '') + ' · ' + typeMeta.label + ' · ' + canvasTitle + '">'
            +     '<span class="dmt-toggle empty"></span>'
            +     '<span class="dmt-icon">' + ICONS.table + '</span>'
            +     '<span class="dmt-label">' + DM.escapeHTML(t.alias || t.name) + '</span>'
            +     typeBadge
            +   '</div>'
            + '</div>';
        }).join('');

        return ''
          + '<div class="dmt-node' + (srcCollapsed ? ' collapsed' : '') + '" data-source-id="' + s.id + '">'
          +   '<div class="' + sourceCls + '" data-source-id="' + s.id + '">'
          +     '<span class="dmt-toggle">' + ICONS.chevron + '</span>'
          +     '<span class="dmt-icon">' + ICONS.source + '</span>'
          +     '<span class="dmt-label">' + DM.escapeHTML(s.name) + '</span>'
          +     '<span class="dmt-meta">' + (s.tables || []).length + '</span>'
          +   '</div>'
          +   '<div class="dmt-children">' + tablesHTML + '</div>'
          + '</div>';
      }).join('');

      var domainMatched = !keyword || domain.name.toLowerCase().indexOf(keyword) >= 0;
      // 关键词过滤后若整个分组没有可展示内容则跳过
      if (keyword && !domainMatched && !sourcesHTML.replace(/\s/g, '')) return '';

      var domainHasActive = domain.sources.some(function (s) { return s.id === DM.activeSourceId; });
      var domainCollapsed = !!keyword ? false : !domainHasActive && DM.DATA[0].id !== domain.id;

      return ''
        + '<div class="dmt-node' + (domainCollapsed ? ' collapsed' : '') + '" data-domain-id="' + domain.id + '">'
        +   '<div class="dmt-row" data-domain-id="' + domain.id + '">'
        +     '<span class="dmt-toggle">' + ICONS.chevron + '</span>'
        +     '<span class="dmt-icon">' + ICONS.domain + '</span>'
        +     '<span class="dmt-label">' + DM.escapeHTML(domain.name) + '</span>'
        +     '<span class="dmt-meta">' + domain.sources.length + '</span>'
        +   '</div>'
        +   '<div class="dmt-children">' + sourcesHTML + '</div>'
        + '</div>';
    }).filter(Boolean).join('');

    tree.innerHTML = html || '<div class="dmt-empty">没有匹配的数据源</div>';
  }

  function selectSource(id) {
    var DM = window.__DM;
    if (DM.activeSourceId === id) return;
    DM.activeSourceId = id;
    DM.selection = null;
    DM.focusTable = null;
    DM.viewport = null;
    DM._fitOnNextRender = true;
    closeDrawer();
    renderTree();
    renderHeader();
    renderTopology();
  }

  // ===================================================================
  // 3) 渲染：右侧顶部信息条
  // ===================================================================
  function renderHeader() {
    var DM = window.__DM;
    var found = DM.findSource(DM.activeSourceId);
    if (!found) return;
    var src = found.source;

    var titleEl = document.getElementById('dmTitle');
    var typeEl = document.getElementById('dmTagType');
    var statusEl = document.getElementById('dmTagStatus');
    var addrEl = document.getElementById('dmAddr');

    if (titleEl) titleEl.textContent = src.name;
    if (typeEl) typeEl.textContent = src.type;
    if (statusEl) {
      statusEl.textContent = src.status === 'ok' ? '连接正常' : '待同步';
      statusEl.className = 'ds-tag ' + (src.status === 'ok' ? 'ok' : 'warn');
    }
    if (addrEl) {
      var cnt = src.tables.filter(function (t) { return t.inCanvas; }).length;
      addrEl.textContent = src.addr + ' · ' + src.tables.length + ' 张表（已加入画布 ' + cnt + '）· 最近同步 ' + src.sync;
    }
  }

  // ===================================================================
  // 4) 渲染：ER 拓扑（节点 + 连线）
  // ===================================================================
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var XHTML_NS = 'http://www.w3.org/1999/xhtml';

  var ICON_TABLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 3v18"/></svg>';
  var ICON_KEY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 7a4 4 0 1 1-3.9 5H6l-2 2 2 2H4l-1-1v-2l1-1h6.1A4 4 0 0 1 14 7z"/></svg>';

  function clearChildren(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  /** 在"可见字段"中查找行号，没找到返回 0 */
  function fieldRowIndex(table, fieldName, source) {
    var vis = (source && window.__DM.getVisibleFields)
      ? window.__DM.getVisibleFields(table, source)
      : table.fields;
    for (var i = 0; i < vis.length; i++) {
      if (vis[i].name === fieldName) return i;
    }
    return 0;
  }

  /** 计算连线锚点：根据 from/to 节点中心位置，决定从左/右出 */
  function calcEdgePoints(fromTable, toTable, fromFieldIdx, toFieldIdx) {
    var DM = window.__DM;
    var fromX = fromTable.pos.x;
    var fromY = fromTable.pos.y;
    var toX = toTable.pos.x;
    var toY = toTable.pos.y;

    var fromCenterX = fromX + DM.NODE_W / 2;
    var toCenterX = toX + DM.NODE_W / 2;

    var fromYAnchor = fromY + DM.HEAD_H + fromFieldIdx * DM.ROW_H + DM.ROW_H / 2;
    var toYAnchor = toY + DM.HEAD_H + toFieldIdx * DM.ROW_H + DM.ROW_H / 2;

    var fromOnLeft = fromCenterX <= toCenterX;
    var x1 = fromOnLeft ? (fromX + DM.NODE_W) : fromX;
    var x2 = fromOnLeft ? toX : (toX + DM.NODE_W);

    return { x1: x1, y1: fromYAnchor, x2: x2, y2: toYAnchor, fromOnLeft: fromOnLeft };
  }

  function buildBezierPath(p) {
    var dx = Math.max(40, Math.abs(p.x2 - p.x1) * 0.45);
    var c1x = p.fromOnLeft ? (p.x1 + dx) : (p.x1 - dx);
    var c2x = p.fromOnLeft ? (p.x2 - dx) : (p.x2 + dx);
    return 'M ' + p.x1 + ' ' + p.y1
         + ' C ' + c1x + ' ' + p.y1 + ', ' + c2x + ' ' + p.y2 + ', ' + p.x2 + ' ' + p.y2;
  }

  var JOIN_LABELS = {
    inner: 'INNER',
    left: 'LEFT',
    right: 'RIGHT',
    full: 'FULL'
  };

  function renderTopology() {
    var DM = window.__DM;
    var found = DM.findSource(DM.activeSourceId);
    if (!found) return;
    var src = found.source;

    var svg = document.getElementById('dmCanvas');
    var nodeLayer = document.getElementById('dmNodeLayer');
    var edgeLayer = document.getElementById('dmEdgeLayer');
    if (!svg || !nodeLayer || !edgeLayer) return;

    clearChildren(nodeLayer);
    clearChildren(edgeLayer);

    // ---- 计算画布大小（按节点最远位置撑开，铺满容器以避免出现滚动条） ----
    var wrapEl = document.getElementById('dmCanvasWrap');
    var minW = wrapEl ? wrapEl.clientWidth : 800;
    var minH = wrapEl ? wrapEl.clientHeight : 500;

    // 聚焦模式：仅展示焦点表 + 与其直接关联的表
    var focusName = DM.focusTable;
    var focusSet = null;
    if (focusName) {
      focusSet = {};
      focusSet[focusName] = true;
      (src.relations || []).forEach(function (r) {
        if (r.from === focusName) focusSet[r.to] = true;
        if (r.to === focusName) focusSet[r.from] = true;
      });
    }

    var canvasTables = src.tables.filter(function (t) {
      if (!t.inCanvas) return false;
      if (focusSet && !focusSet[t.name]) return false;
      return true;
    });

    // 计算所有可见节点的"内容包围盒"（带 padding）
    var pad = 60;
    var bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    canvasTables.forEach(function (t) {
      bx0 = Math.min(bx0, t.pos.x);
      by0 = Math.min(by0, t.pos.y);
      bx1 = Math.max(bx1, t.pos.x + DM.NODE_W);
      by1 = Math.max(by1, t.pos.y + DM.nodeHeight(t, src));
    });
    if (!isFinite(bx0)) { bx0 = 0; by0 = 0; bx1 = minW; by1 = minH; }
    bx0 -= pad; by0 -= pad; bx1 += pad; by1 += pad;
    if (bx0 < 0) bx0 = 0;
    if (by0 < 0) by0 = 0;

    // 内容外接矩形（minimap 显示用，固定从原点起算 → 含 0,0 直到右下角）
    DM._contentBox = {
      w: Math.max(minW, bx1),
      h: Math.max(minH, by1)
    };

    // 自适应 viewport：内容小于视口 → 居中放置（多余空间均匀分给左右/上下）
    function computeFitViewport() {
      var contentW = bx1 - bx0;
      var contentH = by1 - by0;
      var vpW = Math.max(minW, contentW);
      var vpH = Math.max(minH, contentH);
      var vpX = bx0;
      var vpY = by0;
      if (vpW > contentW) vpX = bx0 - (vpW - contentW) / 2;
      if (vpH > contentH) vpY = by0 - (vpH - contentH) / 2;
      return { x: vpX, y: vpY, w: vpW, h: vpH };
    }

    if (!DM.viewport || DM._fitOnNextRender) {
      DM.viewport = computeFitViewport();
      DM._fitOnNextRender = false;
    }
    var vp = DM.viewport;
    svg.setAttribute('viewBox', vp.x + ' ' + vp.y + ' ' + vp.w + ' ' + vp.h);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.minWidth = '';
    svg.style.minHeight = '';

    // 显示 / 隐藏"返回整体视图"按钮
    var backBtn = document.getElementById('dmFocusBack');
    if (backBtn) backBtn.classList.toggle('hidden', !focusName);

    // ---- 渲染连线（两端都需要在画布上 + 聚焦表必须在两端之一） ----
    (src.relations || []).forEach(function (rel) {
      var fromTable = DM.findTable(src, rel.from);
      var toTable = DM.findTable(src, rel.to);
      if (!fromTable || !toTable) return;
      if (!fromTable.inCanvas || !toTable.inCanvas) return;
      if (focusName && rel.from !== focusName && rel.to !== focusName) return;

      var firstMap = (rel.mappings && rel.mappings[0]) || { fromField: '', toField: '' };
      var fIdx = fieldRowIndex(fromTable, firstMap.fromField, src);
      var tIdx = fieldRowIndex(toTable, firstMap.toField, src);
      var pts = calcEdgePoints(fromTable, toTable, fIdx, tIdx);
      var d = buildBezierPath(pts);

      var g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'dm-edge-group');
      g.setAttribute('data-edge-id', rel.id);

      // 隐形粗线（增大点击范围）
      var hit = document.createElementNS(SVG_NS, 'path');
      hit.setAttribute('class', 'dm-edge-hit');
      hit.setAttribute('d', d);
      g.appendChild(hit);

      // 实线
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('class', 'dm-edge join-' + (rel.join || 'inner'));
      path.setAttribute('d', d);
      path.setAttribute('marker-end', 'url(#dm-arrow-' + (rel.join || 'inner') + ')');
      g.appendChild(path);

      // 中点标签
      var midX = (pts.x1 + pts.x2) / 2;
      var midY = (pts.y1 + pts.y2) / 2;
      var label = JOIN_LABELS[rel.join] || 'INNER';

      var bg = document.createElementNS(SVG_NS, 'rect');
      var bgW = label.length * 7 + 14;
      bg.setAttribute('class', 'dm-edge-label-bg');
      bg.setAttribute('x', midX - bgW / 2);
      bg.setAttribute('y', midY - 9);
      bg.setAttribute('width', bgW);
      bg.setAttribute('height', 18);
      bg.setAttribute('rx', 4);
      bg.setAttribute('ry', 4);
      g.appendChild(bg);

      var text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('class', 'dm-edge-label');
      text.setAttribute('x', midX);
      text.setAttribute('y', midY + 4);
      text.setAttribute('text-anchor', 'middle');
      text.textContent = label;
      g.appendChild(text);

      // 选中态
      if (DM.selection && DM.selection.type === 'edge' && DM.selection.id === rel.id) {
        g.classList.add('is-active');
        path.classList.add('is-active');
      }

      edgeLayer.appendChild(g);
    });

    // ---- 渲染节点（仅 inCanvas 的表） ----
    var FO_PAD = 10; // foreignObject 比节点本身大一圈，给锚点预留空间
    canvasTables.forEach(function (t) {
      var visible = DM.getVisibleFields(t, src);
      var h = DM.nodeHeight(t, src);
      var fo = document.createElementNS(SVG_NS, 'foreignObject');
      fo.setAttribute('class', 'dm-node');
      fo.setAttribute('data-table-name', t.name);
      fo.setAttribute('x', t.pos.x - FO_PAD);
      fo.setAttribute('y', t.pos.y - FO_PAD);
      fo.setAttribute('width', DM.NODE_W + FO_PAD * 2);
      fo.setAttribute('height', h + FO_PAD * 2);

      var outer = document.createElementNS(XHTML_NS, 'div');
      outer.setAttribute('class', 'dm-node-outer');
      var wrap = document.createElementNS(XHTML_NS, 'div');
      wrap.setAttribute('class', 'dm-node-wrap');
      if (DM.selection && DM.selection.type === 'table' && DM.selection.id === t.name) {
        wrap.classList.add('is-active');
      }
      var kw = (DM.tableKeyword || '').trim().toLowerCase();
      if (kw) {
        var matchKw = (t.name + (t.alias || '') + (t.comment || '')).toLowerCase().indexOf(kw) >= 0;
        if (!matchKw) wrap.classList.add('dim');
      }

      var head = document.createElementNS(XHTML_NS, 'div');
      head.setAttribute('class', 'dm-node-head');
      head.innerHTML = ''
        + '<span class="dm-node-ico">' + ICON_TABLE + '</span>'
        + '<span class="dm-node-name" title="' + DM.escapeHTML(t.name) + (t.alias ? ' · ' + DM.escapeHTML(t.alias) : '') + '">' + DM.escapeHTML(t.alias || t.name) + '</span>'
        + '<span class="dm-node-alias" title="' + DM.escapeHTML(t.name) + '">' + DM.escapeHTML(t.name) + '</span>';
      wrap.appendChild(head);

      // 左右锚点
      var anchorL = document.createElementNS(XHTML_NS, 'div');
      anchorL.setAttribute('class', 'dm-anchor dm-anchor-l');
      anchorL.setAttribute('title', '从这里拖出连线');
      wrap.appendChild(anchorL);
      var anchorR = document.createElementNS(XHTML_NS, 'div');
      anchorR.setAttribute('class', 'dm-anchor dm-anchor-r');
      anchorR.setAttribute('title', '从这里拖出连线');
      wrap.appendChild(anchorR);

      var body = document.createElementNS(XHTML_NS, 'div');
      body.setAttribute('class', 'dm-node-fields');
      if (!visible.length) {
        body.innerHTML = '<div class="dm-node-empty">暂无关联字段</div>';
      } else {
        body.innerHTML = visible.map(function (fld) {
          var cls = 'dm-node-field';
          if (fld.pk) cls += ' is-pk';
          else if (fld.fk) cls += ' is-fk';
          var keyHtml = (fld.pk || fld.fk)
            ? '<span class="fld-key">' + ICON_KEY + '</span>'
            : '<span class="fld-key empty">' + ICON_KEY + '</span>';
          return ''
            + '<div class="' + cls + '" data-field="' + DM.escapeHTML(fld.name) + '">'
            +   keyHtml
            +   '<span class="fld-name" title="' + DM.escapeHTML(fld.name) + (fld.alias ? ' · ' + DM.escapeHTML(fld.alias) : '') + '">' + DM.escapeHTML(fld.name) + '</span>'
            +   '<span class="fld-type">' + DM.escapeHTML(fld.type) + '</span>'
            + '</div>';
        }).join('');
      }
      wrap.appendChild(body);

      outer.appendChild(wrap);
      fo.appendChild(outer);
      nodeLayer.appendChild(fo);
    });

    // 同步缩放 UI / 缩略图
    if (window.__DM.renderMinimap) window.__DM.renderMinimap();
    if (window.__DM.applyViewportToSvg) {
      // applyViewportToSvg 会更新 zoom 百分比 + minimap viewport 框
      var DM2 = window.__DM;
      var pctEl = document.getElementById('dmZoomPct');
      if (pctEl) {
        var z = DM2._contentBox && DM2.viewport ? Math.round((DM2._contentBox.w / DM2.viewport.w) * 100) : 100;
        pctEl.textContent = z + '%';
      }
    }
  }

  // ===================================================================
  // 5) 表节点拖动 + 选中
  // ===================================================================
  function svgPoint(svg, evt) {
    var rect = svg.getBoundingClientRect();
    var vb = svg.viewBox && svg.viewBox.baseVal;
    var w = (vb && vb.width) || rect.width;
    var h = (vb && vb.height) || rect.height;
    var sx = w / rect.width;
    var sy = h / rect.height;
    return {
      x: (evt.clientX - rect.left) * sx,
      y: (evt.clientY - rect.top) * sy
    };
  }

  /** 仅更新与某张表相关的连线位置（避免整图重渲带来的拖动卡顿） */
  function updateEdgesOfTable(tableName) {
    var DM = window.__DM;
    var found = DM.findSource(DM.activeSourceId);
    if (!found) return;
    var src = found.source;
    var edgeLayer = document.getElementById('dmEdgeLayer');
    if (!edgeLayer) return;

    (src.relations || []).forEach(function (rel) {
      if (rel.from !== tableName && rel.to !== tableName) return;
      var fromTable = DM.findTable(src, rel.from);
      var toTable = DM.findTable(src, rel.to);
      if (!fromTable || !toTable) return;

      var firstMap = (rel.mappings && rel.mappings[0]) || { fromField: '', toField: '' };
      var fIdx = fieldRowIndex(fromTable, firstMap.fromField, src);
      var tIdx = fieldRowIndex(toTable, firstMap.toField, src);
      var pts = calcEdgePoints(fromTable, toTable, fIdx, tIdx);
      var d = buildBezierPath(pts);

      var g = edgeLayer.querySelector('g.dm-edge-group[data-edge-id="' + rel.id + '"]');
      if (!g) return;
      var paths = g.querySelectorAll('path');
      paths.forEach(function (p) { p.setAttribute('d', d); });

      var midX = (pts.x1 + pts.x2) / 2;
      var midY = (pts.y1 + pts.y2) / 2;
      var bg = g.querySelector('rect.dm-edge-label-bg');
      if (bg) {
        var bgW = parseFloat(bg.getAttribute('width')) || 50;
        bg.setAttribute('x', midX - bgW / 2);
        bg.setAttribute('y', midY - 9);
      }
      var text = g.querySelector('text.dm-edge-label');
      if (text) {
        text.setAttribute('x', midX);
        text.setAttribute('y', midY + 4);
      }
    });
  }

  function setNodePosition(fo, x, y) {
    fo.setAttribute('x', x);
    fo.setAttribute('y', y);
  }

  function bindNodeDrag() {
    var nodeLayer = document.getElementById('dmNodeLayer');
    var svg = document.getElementById('dmCanvas');
    if (!nodeLayer || !svg) return;

    var dragState = null;

    nodeLayer.addEventListener('mousedown', function (e) {
      // 锚点拖动单独处理 → 此处忽略
      if (e.target.closest && e.target.closest('.dm-anchor')) return;
      var fo = e.target.closest && e.target.closest('foreignObject.dm-node');
      if (!fo) return;
      // 仅头部及节点空白处发起拖动；点击字段行不触发拖动
      var head = e.target.closest('.dm-node-head');
      var wrap = e.target.closest('.dm-node-wrap');
      if (!head && !wrap) return;

      var DM = window.__DM;
      var found = DM.findSource(DM.activeSourceId);
      if (!found) return;
      var name = fo.getAttribute('data-table-name');
      var table = DM.findTable(found.source, name);
      if (!table) return;

      var pt = svgPoint(svg, e);
      dragState = {
        fo: fo,
        table: table,
        startX: table.pos.x,
        startY: table.pos.y,
        cursorX: pt.x,
        cursorY: pt.y,
        moved: false
      };
      var w = fo.querySelector('.dm-node-wrap');
      if (w) w.classList.add('dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragState) return;
      var pt = svgPoint(svg, e);
      var dx = pt.x - dragState.cursorX;
      var dy = pt.y - dragState.cursorY;
      if (!dragState.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) dragState.moved = true;
      var nx = Math.max(0, dragState.startX + dx);
      var ny = Math.max(0, dragState.startY + dy);
      dragState.table.pos.x = nx;
      dragState.table.pos.y = ny;
      setNodePosition(dragState.fo, nx, ny);
      updateEdgesOfTable(dragState.table.name);
    });

    document.addEventListener('mouseup', function (e) {
      if (!dragState) return;
      var w = dragState.fo.querySelector('.dm-node-wrap');
      if (w) w.classList.remove('dragging');
      var moved = dragState.moved;
      var name = dragState.table.name;
      dragState = null;
      // 拖动后没有明显位移 → 视为点击
      if (!moved) {
        if (window.__DM.selectTable) window.__DM.selectTable(name);
      }
    });
  }

  // ===================================================================
  // 5b) 从左侧目录树拖拽表 → 画布
  // ===================================================================
  function bindTreeDragToCanvas() {
    var tree = document.getElementById('dmTree');
    var wrap = document.getElementById('dmCanvasWrap');
    var svg = document.getElementById('dmCanvas');
    if (!tree || !wrap || !svg) return;

    // dragstart：在表行上启动 HTML5 拖拽
    tree.addEventListener('dragstart', function (e) {
      var node = e.target.closest && e.target.closest('.dmt-table-node');
      if (!node) return;
      var srcId = node.getAttribute('data-source-id');
      var tName = node.getAttribute('data-table-name');
      // 仅允许当前激活数据源的表拖入画布
      if (srcId !== window.__DM.activeSourceId) {
        e.preventDefault();
        if (typeof showToast === 'function') showToast('请先选中该数据源后再拖入');
        return;
      }
      var found = window.__DM.findSource(srcId);
      var table = found && window.__DM.findTable(found.source, tName);
      if (!table) return;
      if (table.inCanvas) {
        e.preventDefault();
        if (typeof showToast === 'function') showToast('该表已在画布上');
        return;
      }
      e.dataTransfer.effectAllowed = 'copy';
      try { e.dataTransfer.setData('text/plain', tName); } catch (err) {}
      window.__DM._dragTable = { sourceId: srcId, name: tName };
      var row = node.querySelector('.dmt-row');
      if (row) row.classList.add('dragging');
    });

    tree.addEventListener('dragend', function () {
      window.__DM._dragTable = null;
      tree.querySelectorAll('.dmt-row.dragging').forEach(function (el) {
        el.classList.remove('dragging');
      });
      wrap.classList.remove('dm-canvas-drop-over');
    });

    // dragover：必须 preventDefault 才能 drop
    wrap.addEventListener('dragover', function (e) {
      if (!window.__DM._dragTable) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      wrap.classList.add('dm-canvas-drop-over');
    });

    wrap.addEventListener('dragleave', function (e) {
      if (e.target === wrap) wrap.classList.remove('dm-canvas-drop-over');
    });

    wrap.addEventListener('drop', function (e) {
      if (!window.__DM._dragTable) return;
      e.preventDefault();
      wrap.classList.remove('dm-canvas-drop-over');

      var DM = window.__DM;
      var found = DM.findSource(DM._dragTable.sourceId);
      if (!found) return;
      var table = DM.findTable(found.source, DM._dragTable.name);
      if (!table) return;

      // 鼠标点对应到 svg viewBox 坐标
      var pt = svgPoint(svg, e);
      table.pos = { x: Math.max(0, pt.x - DM.NODE_W / 2), y: Math.max(0, pt.y - DM.HEAD_H / 2) };
      table.inCanvas = true;
      DM._dragTable = null;

      renderTopology();
      renderTree();
      renderHeader();
      if (typeof showToast === 'function') showToast('已添加到画布：' + (table.alias || table.name));
    });
  }

  // ===================================================================
  // 5c) 锚点连线：从节点左右锚点拖出 → 落到另一节点 → 创建关系
  // ===================================================================
  function bindAnchorDrag() {
    var nodeLayer = document.getElementById('dmNodeLayer');
    var edgeLayer = document.getElementById('dmEdgeLayer');
    var svg = document.getElementById('dmCanvas');
    if (!nodeLayer || !edgeLayer || !svg) return;

    var st = null;

    function clearHover() {
      document.querySelectorAll('.dm-node-wrap.is-target').forEach(function (el) {
        el.classList.remove('is-target');
      });
    }

    nodeLayer.addEventListener('mousedown', function (e) {
      var anchor = e.target.closest && e.target.closest('.dm-anchor');
      if (!anchor) return;
      e.stopPropagation();
      e.preventDefault();

      var fo = anchor.closest('foreignObject.dm-node');
      if (!fo) return;
      var name = fo.getAttribute('data-table-name');
      var found = window.__DM.findSource(window.__DM.activeSourceId);
      var fromTable = found && window.__DM.findTable(found.source, name);
      if (!fromTable) return;

      var DM = window.__DM;
      var side = anchor.classList.contains('dm-anchor-r') ? 'r' : 'l';
      var startX = side === 'r' ? (fromTable.pos.x + DM.NODE_W) : fromTable.pos.x;
      var startY = fromTable.pos.y + DM.HEAD_H / 2;

      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('class', 'dm-edge-temp');
      edgeLayer.appendChild(path);

      st = {
        fromTable: fromTable,
        side: side,
        startX: startX,
        startY: startY,
        tempPath: path
      };
    });

    document.addEventListener('mousemove', function (e) {
      if (!st) return;
      var pt = svgPoint(svg, e);
      var dx = Math.max(40, Math.abs(pt.x - st.startX) * 0.5);
      var fromOnLeft = st.side === 'r';
      var c1x = fromOnLeft ? (st.startX + dx) : (st.startX - dx);
      var d = 'M ' + st.startX + ' ' + st.startY
            + ' C ' + c1x + ' ' + st.startY + ', ' + pt.x + ' ' + pt.y + ', ' + pt.x + ' ' + pt.y;
      st.tempPath.setAttribute('d', d);

      // hover 高亮目标节点
      clearHover();
      var hoverEl = document.elementFromPoint(e.clientX, e.clientY);
      var hoverFo = hoverEl && hoverEl.closest && hoverEl.closest('foreignObject.dm-node');
      if (hoverFo) {
        var hoverName = hoverFo.getAttribute('data-table-name');
        if (hoverName !== st.fromTable.name) {
          var w2 = hoverFo.querySelector('.dm-node-wrap');
          if (w2) w2.classList.add('is-target');
        }
      }
    });

    document.addEventListener('mouseup', function (e) {
      if (!st) return;
      var localSt = st;
      st = null;
      if (localSt.tempPath && localSt.tempPath.parentNode) {
        localSt.tempPath.parentNode.removeChild(localSt.tempPath);
      }
      clearHover();

      var dropEl = document.elementFromPoint(e.clientX, e.clientY);
      var dropFo = dropEl && dropEl.closest && dropEl.closest('foreignObject.dm-node');
      if (!dropFo) return;
      var toName = dropFo.getAttribute('data-table-name');
      if (!toName || toName === localSt.fromTable.name) return;

      var DM = window.__DM;
      var found = DM.findSource(DM.activeSourceId);
      if (!found) return;

      // 不重复创建相同两表的关系
      var dup = (found.source.relations || []).some(function (r) {
        return (r.from === localSt.fromTable.name && r.to === toName)
          || (r.from === toName && r.to === localSt.fromTable.name);
      });
      if (dup) {
        if (typeof showToast === 'function') showToast('两表之间已存在关联关系');
        return;
      }

      var newRel = {
        id: 'r_' + Date.now().toString(36) + Math.random().toString(16).slice(2, 5),
        from: localSt.fromTable.name,
        to: toName,
        join: 'inner',
        mappings: [{ fromField: '', toField: '' }]
      };
      found.source.relations = found.source.relations || [];
      found.source.relations.push(newRel);
      DM.selection = { type: 'edge', id: newRel.id };

      renderTopology();
      var g = document.querySelector('g.dm-edge-group[data-edge-id="' + newRel.id + '"]');
      if (g) {
        g.classList.add('is-active');
        var p = g.querySelector('path.dm-edge');
        if (p) p.classList.add('is-active');
      }
      if (DM.renderEdgeDrawer) DM.renderEdgeDrawer(newRel);
      if (DM.openDrawer) DM.openDrawer();
      if (typeof showToast === 'function') showToast('已创建连线，请在右侧设置关联字段');
    });
  }

  window.__DM.bindAnchorDrag = bindAnchorDrag;

  // ===================================================================
  // 5e) 画布缩放：viewport / Ctrl+wheel / 工具按钮 / 适应画布
  // ===================================================================
  var ZOOM_MIN = 0.3;
  var ZOOM_MAX = 3;

  function getCurrentZoom() {
    var DM = window.__DM;
    if (!DM.viewport || !DM._contentBox) return 1;
    return DM._contentBox.w / DM.viewport.w;
  }

  function applyViewportToSvg() {
    var DM = window.__DM;
    var svg = document.getElementById('dmCanvas');
    if (!svg || !DM.viewport) return;
    var vp = DM.viewport;
    svg.setAttribute('viewBox', vp.x + ' ' + vp.y + ' ' + vp.w + ' ' + vp.h);
    updateZoomUI();
    renderMinimapViewport();
  }

  function updateZoomUI() {
    var pct = Math.round(getCurrentZoom() * 100);
    var el = document.getElementById('dmZoomPct');
    if (el) el.textContent = pct + '%';
  }

  function setZoom(scale, centerCanvasPt) {
    var DM = window.__DM;
    if (!DM.viewport || !DM._contentBox) return;
    var curZoom = getCurrentZoom();
    var nextZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scale));
    if (Math.abs(nextZoom - curZoom) < 1e-4) return;
    var box = DM._contentBox;
    var newW = box.w / nextZoom;
    var newH = box.h / nextZoom;
    var vp = DM.viewport;
    var center = centerCanvasPt || { x: vp.x + vp.w / 2, y: vp.y + vp.h / 2 };
    // 让 center 在新 viewport 中保持原相对位置
    var relX = (center.x - vp.x) / vp.w;
    var relY = (center.y - vp.y) / vp.h;
    DM.viewport = {
      x: center.x - relX * newW,
      y: center.y - relY * newH,
      w: newW,
      h: newH
    };
    applyViewportToSvg();
  }

  function zoomBy(factor, centerCanvasPt) {
    setZoom(getCurrentZoom() * factor, centerCanvasPt);
  }

  function fitView() {
    var DM = window.__DM;
    DM._fitOnNextRender = true;
    renderTopology();
  }

  function bindZoom() {
    var wrap = document.getElementById('dmCanvasWrap');
    var svg = document.getElementById('dmCanvas');
    var btnIn = document.getElementById('dmBtnZoomIn');
    var btnOut = document.getElementById('dmBtnZoomOut');
    var btnFit = document.getElementById('dmBtnZoomFit');
    if (!wrap || !svg) return;

    if (btnIn) btnIn.addEventListener('click', function () { zoomBy(1.2); });
    if (btnOut) btnOut.addEventListener('click', function () { zoomBy(1 / 1.2); });
    if (btnFit) btnFit.addEventListener('click', fitView);

    // Ctrl + 滚轮缩放（围绕鼠标点）
    wrap.addEventListener('wheel', function (e) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      var pt = svgPoint(svg, e);
      var factor = e.deltaY < 0 ? 1.12 : (1 / 1.12);
      zoomBy(factor, pt);
    }, { passive: false });
  }
  window.__DM.bindZoom = bindZoom;
  window.__DM.fitView = fitView;
  window.__DM.applyViewportToSvg = applyViewportToSvg;

  /** 在画布空白处按住鼠标 → 整体平移视图 */
  function bindPan() {
    var wrap = document.getElementById('dmCanvasWrap');
    var svg = document.getElementById('dmCanvas');
    if (!wrap || !svg) return;

    var dragging = false;
    var startCx = 0, startCy = 0;
    var startVp = null;
    var pxPerUnitX = 1, pxPerUnitY = 1;
    var moved = false;

    wrap.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      // 只在"画布空白处"触发：避开节点、锚点、连线、缩放/缩略图工具栏、返回按钮、分析遮罩
      if (
        e.target.closest('foreignObject.dm-node') ||
        e.target.closest('.dm-anchor') ||
        e.target.closest('g.dm-edge-group') ||
        e.target.closest('.dm-bottom-right') ||
        e.target.closest('.dm-focus-back') ||
        e.target.closest('.dm-analyze-mask')
      ) return;

      var DM = window.__DM;
      if (!DM.viewport) return;
      dragging = true;
      moved = false;
      startCx = e.clientX;
      startCy = e.clientY;
      startVp = { x: DM.viewport.x, y: DM.viewport.y, w: DM.viewport.w, h: DM.viewport.h };
      var rect = svg.getBoundingClientRect();
      pxPerUnitX = rect.width / startVp.w;
      pxPerUnitY = rect.height / startVp.h;
      wrap.classList.add('dm-canvas-panning');
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging || !startVp) return;
      var dxPx = e.clientX - startCx;
      var dyPx = e.clientY - startCy;
      if (!moved && (Math.abs(dxPx) > 2 || Math.abs(dyPx) > 2)) moved = true;
      // 鼠标向右拖 → viewport 向左移（让画布跟手）
      var DM = window.__DM;
      DM.viewport = {
        x: startVp.x - dxPx / pxPerUnitX,
        y: startVp.y - dyPx / pxPerUnitY,
        w: startVp.w,
        h: startVp.h
      };
      applyViewportToSvg();
    });

    document.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      startVp = null;
      wrap.classList.remove('dm-canvas-panning');
    });
  }
  window.__DM.bindPan = bindPan;

  // ===================================================================
  // 5f) 缩略图：完整布局缩略 + 当前 viewport 框（可拖动平移）
  // ===================================================================
  function renderMinimap() {
    var DM = window.__DM;
    var svg = document.getElementById('dmMinimapSvg');
    var box = DM._contentBox;
    if (!svg || !box) return;
    var theme = getThemeColors();
    svg.setAttribute('viewBox', '0 0 ' + box.w + ' ' + box.h);
    var found = DM.findSource(DM.activeSourceId);
    if (!found) { svg.innerHTML = ''; return; }
    var src = found.source;

    var focusName = DM.focusTable;
    var focusSet = null;
    if (focusName) {
      focusSet = {};
      focusSet[focusName] = true;
      (src.relations || []).forEach(function (r) {
        if (r.from === focusName) focusSet[r.to] = true;
        if (r.to === focusName) focusSet[r.from] = true;
      });
    }

    var html = '';
    // 连线
    (src.relations || []).forEach(function (rel) {
      var a = DM.findTable(src, rel.from);
      var b = DM.findTable(src, rel.to);
      if (!a || !b || !a.inCanvas || !b.inCanvas) return;
      if (focusSet && (!focusSet[a.name] || !focusSet[b.name])) return;
      var x1 = a.pos.x + DM.NODE_W / 2;
      var y1 = a.pos.y + DM.HEAD_H / 2;
      var x2 = b.pos.x + DM.NODE_W / 2;
      var y2 = b.pos.y + DM.HEAD_H / 2;
      html += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2
            + '" stroke="' + theme.primaryBorder + '" stroke-width="2"/>';
    });
    // 节点
    src.tables.forEach(function (t) {
      if (!t.inCanvas) return;
      if (focusSet && !focusSet[t.name]) return;
      var h = DM.nodeHeight(t, src);
      var fill = (DM.selection && DM.selection.type === 'table' && DM.selection.id === t.name)
        ? '#fbbf24' : theme.primaryAccentStrong;
      html += '<rect x="' + t.pos.x + '" y="' + t.pos.y + '" width="' + DM.NODE_W
            + '" height="' + h + '" rx="3" ry="3" fill="' + fill + '" opacity=".82"/>';
    });
    svg.innerHTML = html;

    renderMinimapViewport();
  }

  function renderMinimapViewport() {
    var DM = window.__DM;
    var box = DM._contentBox;
    var vp = DM.viewport;
    var mini = document.getElementById('dmMinimap');
    var vpEl = document.getElementById('dmMinimapViewport');
    if (!mini || !vpEl || !box || !vp) return;
    var miniW = mini.clientWidth;
    var miniH = mini.clientHeight;
    var sx = miniW / box.w;
    var sy = miniH / box.h;
    var x = Math.max(0, vp.x * sx);
    var y = Math.max(0, vp.y * sy);
    var w = Math.min(miniW - x, vp.w * sx);
    var h = Math.min(miniH - y, vp.h * sy);
    vpEl.style.left = x + 'px';
    vpEl.style.top = y + 'px';
    vpEl.style.width = Math.max(8, w) + 'px';
    vpEl.style.height = Math.max(8, h) + 'px';
  }

  function bindMinimap() {
    var mini = document.getElementById('dmMinimap');
    var vpEl = document.getElementById('dmMinimapViewport');
    if (!mini || !vpEl) return;

    var dragging = false;
    var startCx = 0;
    var startCy = 0;
    var startVp = null;

    function panViewportToMini(mx, my) {
      var DM = window.__DM;
      var box = DM._contentBox;
      var vp = DM.viewport;
      if (!box || !vp) return;
      var miniW = mini.clientWidth;
      var miniH = mini.clientHeight;
      var sx = miniW / box.w;
      var sy = miniH / box.h;
      // mini 上点 (mx,my) 对应到 canvas (mx/sx, my/sy)，让 viewport 中心对齐它
      var cx = mx / sx;
      var cy = my / sy;
      DM.viewport = {
        x: cx - vp.w / 2,
        y: cy - vp.h / 2,
        w: vp.w,
        h: vp.h
      };
      applyViewportToSvg();
    }

    mini.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      dragging = true;
      vpEl.classList.add('dragging');
      startCx = e.clientX;
      startCy = e.clientY;
      var DM = window.__DM;
      startVp = DM.viewport ? { x: DM.viewport.x, y: DM.viewport.y, w: DM.viewport.w, h: DM.viewport.h } : null;
      // 如果点击在 viewport 框外，立刻平移到该位置
      if (!e.target.closest('.dm-minimap-viewport')) {
        var rect = mini.getBoundingClientRect();
        panViewportToMini(e.clientX - rect.left, e.clientY - rect.top);
        startVp = window.__DM.viewport
          ? { x: window.__DM.viewport.x, y: window.__DM.viewport.y, w: window.__DM.viewport.w, h: window.__DM.viewport.h }
          : null;
      }
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging || !startVp) return;
      var DM = window.__DM;
      var box = DM._contentBox;
      if (!box) return;
      var miniW = mini.clientWidth;
      var miniH = mini.clientHeight;
      var sx = miniW / box.w;
      var sy = miniH / box.h;
      var dx = (e.clientX - startCx) / sx;
      var dy = (e.clientY - startCy) / sy;
      DM.viewport = {
        x: startVp.x + dx,
        y: startVp.y + dy,
        w: startVp.w,
        h: startVp.h
      };
      applyViewportToSvg();
    });

    document.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      vpEl.classList.remove('dragging');
      startVp = null;
    });
  }
  window.__DM.bindMinimap = bindMinimap;
  window.__DM.renderMinimap = renderMinimap;
  window.__DM.renderMinimapViewport = renderMinimapViewport;

  // ===================================================================
  // 5g) 导入 / 导出 关联关系 (Excel)
  // ===================================================================
  var IMPORT_MAX_BYTES = 50 * 1024 * 1024;
  var IMPORT_TPL_HEADERS = ['源表', '源字段', '目标表', '目标字段', '关联类型(inner|left|right|full)'];

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

  function downloadImportTemplate() {
    var DM = window.__DM;
    var found = DM.findSource(DM.activeSourceId);
    var sample = [
      ['sales_order', 'customer_id', 'customer', 'customer_id', 'left'],
      ['sales_order_item', 'order_id', 'sales_order', 'order_id', 'inner'],
      ['sales_order', 'product_id', 'product', 'product_id', 'left']
    ];
    var html = buildXlsHtml(IMPORT_TPL_HEADERS, sample);
    var blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel' });
    var srcName = found && found.source ? found.source.name : '关联关系';
    triggerDownload(blob, srcName + '_关联关系模板.xls');
    if (typeof showToast === 'function') showToast('模板已开始下载');
  }

  function exportRelations() {
    var DM = window.__DM;
    var found = DM.findSource(DM.activeSourceId);
    if (!found) {
      if (typeof showToast === 'function') showToast('没有可导出的数据源');
      return;
    }
    var src = found.source;
    var rels = src.relations || [];
    var rows = [];
    rels.forEach(function (rel) {
      (rel.mappings || []).forEach(function (m) {
        rows.push([rel.from, m.fromField || '', rel.to, m.toField || '', rel.join || 'left']);
      });
      if (!rel.mappings || rel.mappings.length === 0) {
        rows.push([rel.from, '', rel.to, '', rel.join || 'left']);
      }
    });
    var html = buildXlsHtml(IMPORT_TPL_HEADERS, rows);
    var blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel' });
    triggerDownload(blob, src.name + '_关联关系.xls');
    if (typeof showToast === 'function') {
      showToast('已导出 ' + rows.length + ' 条关联关系');
    }
  }

  // —— 弹窗状态 ——
  var importState = {
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

  function refreshImportUI() {
    var emptyEl = document.getElementById('dmiDropzoneEmpty');
    var fileEl = document.getElementById('dmiDropzoneFile');
    var nameEl = document.getElementById('dmiFileName');
    var sizeEl = document.getElementById('dmiFileSize');
    var okBtn = document.getElementById('dmiOkBtn');
    if (importState.file) {
      if (emptyEl) emptyEl.classList.add('hidden');
      if (fileEl) fileEl.classList.remove('hidden');
      if (nameEl) nameEl.textContent = importState.file.name;
      if (sizeEl) sizeEl.textContent = formatFileSize(importState.file.size);
      if (okBtn) okBtn.disabled = importState.importing;
    } else {
      if (emptyEl) emptyEl.classList.remove('hidden');
      if (fileEl) fileEl.classList.add('hidden');
      if (okBtn) okBtn.disabled = true;
    }
  }

  function setImportFile(file) {
    if (!file) { importState.file = null; refreshImportUI(); return; }
    if (!isExcelFile(file.name)) {
      if (typeof showToast === 'function') showToast('仅支持 Excel 格式（.xls / .xlsx）');
      return;
    }
    if (file.size > IMPORT_MAX_BYTES) {
      if (typeof showToast === 'function') showToast('文件过大，单个文件不能超过 50M');
      return;
    }
    importState.file = file;
    refreshImportUI();
  }

  function resetImportProgress() {
    var prog = document.getElementById('dmiProgress');
    var fill = document.getElementById('dmiProgressFill');
    var pct = document.getElementById('dmiProgressPct');
    var label = document.getElementById('dmiProgressLabel');
    if (prog) {
      prog.classList.add('hidden');
      prog.classList.remove('is-success', 'is-error');
    }
    if (fill) fill.style.width = '0%';
    if (pct) pct.textContent = '0%';
    if (label) label.textContent = '正在导入…';
  }

  function openImportModal() {
    importState.file = null;
    importState.importing = false;
    var input = document.getElementById('dmiFileInput');
    if (input) input.value = '';
    resetImportProgress();
    refreshImportUI();
    var mask = document.getElementById('dmImportMask');
    var modal = document.getElementById('dmImportModal');
    if (mask) mask.classList.remove('hidden');
    if (modal) modal.classList.remove('hidden');
  }

  function closeImportModal() {
    if (importState.importing) return;
    var mask = document.getElementById('dmImportMask');
    var modal = document.getElementById('dmImportModal');
    if (mask) mask.classList.add('hidden');
    if (modal) modal.classList.add('hidden');
  }

  function startImport() {
    if (importState.importing || !importState.file) return;
    importState.importing = true;

    var prog = document.getElementById('dmiProgress');
    var fill = document.getElementById('dmiProgressFill');
    var pct = document.getElementById('dmiProgressPct');
    var label = document.getElementById('dmiProgressLabel');
    var okBtn = document.getElementById('dmiOkBtn');
    var cancelBtn = document.getElementById('dmiCancelBtn');
    if (prog) {
      prog.classList.remove('hidden', 'is-success', 'is-error');
    }
    if (label) label.textContent = '正在解析文件…';
    if (okBtn) { okBtn.disabled = true; okBtn.textContent = '导入中…'; }
    if (cancelBtn) cancelBtn.disabled = true;

    var current = 0;
    // 90% 之前模拟"解析+校验"，90% 之后模拟"写入"
    function step() {
      // 接近终点会变慢，更真实
      var inc = current < 60 ? (4 + Math.random() * 6)
              : current < 85 ? (2 + Math.random() * 3)
              : (0.6 + Math.random() * 1.2);
      current = Math.min(100, current + inc);
      if (fill) fill.style.width = current + '%';
      if (pct) pct.textContent = Math.round(current) + '%';
      if (current >= 60 && current < 85 && label) label.textContent = '正在校验关联字段…';
      if (current >= 85 && current < 100 && label) label.textContent = '正在写入关联关系…';

      if (current < 100) {
        setTimeout(step, 120);
      } else {
        finishImport();
      }
    }
    step();
  }

  function finishImport() {
    var prog = document.getElementById('dmiProgress');
    var label = document.getElementById('dmiProgressLabel');
    var okBtn = document.getElementById('dmiOkBtn');
    var cancelBtn = document.getElementById('dmiCancelBtn');

    // 模拟：99% 成功（演示用，几乎一定成功）；通过文件名包含"fail/错误"触发失败用例
    var fname = importState.file ? importState.file.name.toLowerCase() : '';
    var forceFail = fname.indexOf('fail') >= 0 || fname.indexOf('错误') >= 0;
    var success = !forceFail;

    if (success) {
      // 真实"导入"行为：复用自动关联分析的核心逻辑追加关系
      var added = 0;
      if (window.__DM.runAutoAnalyzeCore) {
        added = window.__DM.runAutoAnalyzeCore() || 0;
      }
      if (prog) prog.classList.add('is-success');
      if (label) label.textContent = '导入成功' + (added > 0 ? '，新增 ' + added + ' 条关系' : '，未发现新关系');
      if (typeof showToast === 'function') {
        showToast('导入成功' + (added > 0 ? '：新增 ' + added + ' 条关联关系' : ''));
      }
      // 刷新拓扑
      if (window.__DM.renderTopology) window.__DM.renderTopology();
      if (window.__DM.renderTree) window.__DM.renderTree();
      if (window.__DM.renderHeader) window.__DM.renderHeader();
    } else {
      if (prog) prog.classList.add('is-error');
      if (label) label.textContent = '导入失败：文件解析异常，请使用模板格式后重试';
      if (typeof showToast === 'function') showToast('导入失败：请使用模板格式后重试');
    }

    importState.importing = false;
    if (okBtn) {
      okBtn.disabled = false;
      okBtn.textContent = success ? '完成' : '重试';
    }
    if (cancelBtn) cancelBtn.disabled = false;

    // 成功时延时自动关闭
    if (success) {
      setTimeout(function () {
        closeImportModal();
      }, 1100);
    }
  }

  function bindImportModal() {
    var mask = document.getElementById('dmImportMask');
    var modal = document.getElementById('dmImportModal');
    var input = document.getElementById('dmiFileInput');
    var dropzone = document.getElementById('dmiDropzone');
    var clearBtn = document.getElementById('dmiFileClear');
    var tplBtn = document.getElementById('dmiTplBtn');
    if (!modal) return;

    if (mask) mask.addEventListener('click', closeImportModal);

    modal.addEventListener('click', function (e) {
      var act = e.target.closest && e.target.closest('[data-act]');
      if (!act) return;
      var role = act.getAttribute('data-act');
      if (role === 'cancel') {
        closeImportModal();
      } else if (role === 'ok') {
        if (!importState.file) {
          if (typeof showToast === 'function') showToast('请先选择 Excel 文件');
          return;
        }
        // 已完成态再次点 → 关闭
        if (act.textContent.indexOf('完成') >= 0) {
          closeImportModal();
          return;
        }
        startImport();
      }
    });

    if (tplBtn) {
      tplBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        downloadImportTemplate();
      });
    }

    if (input) {
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        if (f) setImportFile(f);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (importState.importing) return;
        importState.file = null;
        if (input) input.value = '';
        resetImportProgress();
        refreshImportUI();
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
        if (f) setImportFile(f);
      });
    }
  }

  window.__DM.openImportModal = openImportModal;
  window.__DM.closeImportModal = closeImportModal;
  window.__DM.exportRelations = exportRelations;
  window.__DM.bindImportModal = bindImportModal;

  // ===================================================================
  // 5d) 通用确认弹窗 + Delete 键删除（表 / 连线）
  // ===================================================================
  function showDmConfirm(opts) {
    var o = Object.assign({
      title: '删除确认',
      subtitle: '删除后将无法恢复（仅原型示例数据）。',
      message: '确定要删除该项吗？',
      okText: '确认删除',
      cancelText: '取消'
    }, opts || {});
    var mask = document.getElementById('dmConfirmMask');
    var modal = document.getElementById('dmConfirmModal');
    var titleEl = document.getElementById('dmConfirmTitle');
    var subEl = document.getElementById('dmConfirmSubtitle');
    var msgEl = document.getElementById('dmConfirmMessage');
    if (!mask || !modal || !titleEl || !msgEl) return;

    titleEl.textContent = o.title;
    if (subEl) subEl.textContent = o.subtitle;
    msgEl.innerHTML = o.message;

    var okBtn = modal.querySelector('.modal-foot [data-act="ok"]');
    var cancelBtn = modal.querySelector('.modal-foot [data-act="cancel"]');
    var closeBtn = modal.querySelector('.modal-head [data-act="cancel"]');
    if (okBtn) okBtn.textContent = o.okText;
    if (cancelBtn) cancelBtn.textContent = o.cancelText;

    mask.classList.remove('hidden');
    modal.classList.remove('hidden');

    function cleanup() {
      mask.classList.add('hidden');
      modal.classList.add('hidden');
      if (okBtn) okBtn.onclick = null;
      if (cancelBtn) cancelBtn.onclick = null;
      if (closeBtn) closeBtn.onclick = null;
      mask.onclick = null;
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); cleanup(); }
      else if (e.key === 'Enter') { e.preventDefault(); cleanup(); if (o.onConfirm) o.onConfirm(); }
    }
    if (okBtn) okBtn.onclick = function () { cleanup(); if (o.onConfirm) o.onConfirm(); };
    if (cancelBtn) cancelBtn.onclick = cleanup;
    if (closeBtn) closeBtn.onclick = cleanup;
    mask.onclick = cleanup;
    document.addEventListener('keydown', onKey);
  }
  window.__DM.showDmConfirm = showDmConfirm;

  function deleteSelectedTable() {
    var DM = window.__DM;
    var found = DM.findSource(DM.activeSourceId);
    if (!found || !DM.selection || DM.selection.type !== 'table') return;
    var tName = DM.selection.id;
    var table = DM.findTable(found.source, tName);
    if (!table) return;

    var related = (found.source.relations || []).filter(function (r) {
      return r.from === tName || r.to === tName;
    });
    var subtitle = related.length > 0
      ? '该表参与了 ' + related.length + ' 条关联关系，将一同从画布上移除（不会删除底层表数据）。'
      : '将把该表从画布上移除（不会删除底层表数据）。';

    showDmConfirm({
      title: '从画布移除表',
      subtitle: subtitle,
      message: '确定要把表「<strong style="color:var(--heading);">' + DM.escapeHTML(table.alias || table.name) + '</strong>」从画布上移除吗？',
      onConfirm: function () {
        table.inCanvas = false;
        found.source.relations = (found.source.relations || []).filter(function (r) {
          return r.from !== tName && r.to !== tName;
        });
        DM.selection = null;
        if (DM.closeDrawer) DM.closeDrawer();
        renderTopology();
        renderTree();
        renderHeader();
        if (typeof showToast === 'function') showToast('已从画布移除：' + (table.alias || table.name));
      }
    });
  }

  function deleteSelectedEdge() {
    var DM = window.__DM;
    var found = DM.findSource(DM.activeSourceId);
    if (!found || !DM.selection || DM.selection.type !== 'edge') return;
    var edgeId = DM.selection.id;
    var rel = (found.source.relations || []).filter(function (r) { return r.id === edgeId; })[0];
    if (!rel) return;

    showDmConfirm({
      title: '删除关联关系',
      subtitle: '删除后该连线消失，两端表仍保留在画布上。',
      message: '确定删除「<strong style="color:var(--heading);">' + DM.escapeHTML(rel.from) + '</strong>」与「<strong style="color:var(--heading);">' + DM.escapeHTML(rel.to) + '</strong>」之间的关联关系吗？',
      onConfirm: function () {
        found.source.relations = (found.source.relations || []).filter(function (r) { return r.id !== edgeId; });
        DM.selection = null;
        if (DM.closeDrawer) DM.closeDrawer();
        renderTopology();
        if (typeof showToast === 'function') showToast('已删除关联关系');
      }
    });
  }

  window.__DM.bindDeleteKey = function () {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.target && e.target.isContentEditable) return;

      var DM = window.__DM;
      if (!DM.selection) return;
      e.preventDefault();
      if (DM.selection.type === 'table') deleteSelectedTable();
      else if (DM.selection.type === 'edge') deleteSelectedEdge();
    });
  };

  // ===================================================================
  // 自动布局：恢复初始位置（保存初始 pos 副本）
  // ===================================================================
  function snapshotInitialPos() {
    window.__DM.DATA.forEach(function (d) {
      d.sources.forEach(function (s) {
        s.tables.forEach(function (t) {
          if (!t._initPos) t._initPos = { x: t.pos.x, y: t.pos.y };
        });
      });
    });
  }
  snapshotInitialPos();

  // ===================================================================
  // 自动关联分析：根据"同名字段 / 一方含主键"自动推断连线
  // ===================================================================
  function genRelId() {
    return 'r_' + Date.now().toString(36) + Math.random().toString(16).slice(2, 5);
  }

  /** 真正的关联分析算法：扫描所有表，发现"同名字段 + 一方含主键"的组合，新增 left join 关系 */
  function runAutoAnalyzeCore() {
    var DM = window.__DM;
    var found = DM.findSource(DM.activeSourceId);
    if (!found) return 0;
    var src = found.source;
    var existing = {};
    (src.relations || []).forEach(function (r) {
      existing[r.from + '|' + r.to] = true;
      existing[r.to + '|' + r.from] = true;
    });

    var added = 0;
    for (var i = 0; i < src.tables.length; i++) {
      for (var j = 0; j < src.tables.length; j++) {
        if (i === j) continue;
        var ta = src.tables[i];
        var tb = src.tables[j];
        var key2 = ta.name + '|' + tb.name;
        if (existing[key2]) continue;

        var match = null;
        for (var x = 0; x < ta.fields.length; x++) {
          for (var y = 0; y < tb.fields.length; y++) {
            var fa = ta.fields[x];
            var fb = tb.fields[y];
            if (fa.name === fb.name && fb.pk && (fa.fk || !fa.pk)) {
              match = { fromField: fa.name, toField: fb.name };
              break;
            }
          }
          if (match) break;
        }
        if (match) {
          src.relations = src.relations || [];
          src.relations.push({
            id: genRelId(),
            from: ta.name,
            to: tb.name,
            join: 'left',
            mappings: [match]
          });
          // 推断出来的关联两端，自动加入画布
          ta.inCanvas = true;
          tb.inCanvas = true;
          existing[key2] = true;
          existing[tb.name + '|' + ta.name] = true;
          added++;
        }
      }
    }
    return added;
  }

  /** 在拓扑画布上覆盖遮罩 + 进度条，模拟分析过程，然后执行核心算法并刷新 */
  function showAutoAnalyzeOverlay() {
    var wrap = document.getElementById('dmCanvasWrap');
    if (!wrap) return null;
    if (wrap.querySelector('.dm-analyze-mask')) return null; // 已在分析中
    var mask = document.createElement('div');
    mask.className = 'dm-analyze-mask';
    mask.innerHTML = ''
      + '<div class="dm-analyze-card">'
      +   '<div class="dm-analyze-spinner">'
      +     '<svg viewBox="0 0 50 50" aria-hidden="true">'
      +       '<circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="4"/>'
      +     '</svg>'
      +   '</div>'
      +   '<div class="dm-analyze-title">正在自动分析关联关系…</div>'
      +   '<div class="dm-analyze-step" data-role="step">扫描表结构与字段</div>'
      +   '<div class="dm-analyze-bar"><div class="dm-analyze-bar-fill" data-role="fill" style="width:0%"></div></div>'
      +   '<div class="dm-analyze-pct"><span data-role="pct">0</span>%</div>'
      + '</div>';
    wrap.appendChild(mask);
    return mask;
  }

  function hideAutoAnalyzeOverlay(mask) {
    if (!mask) return;
    mask.classList.add('is-leaving');
    setTimeout(function () {
      if (mask && mask.parentNode) mask.parentNode.removeChild(mask);
    }, 220);
  }

  window.__DM.runAutoAnalyzeCore = runAutoAnalyzeCore;

  var _analyzing = false;
  window.__DM.autoAnalyze = function () {
    if (_analyzing) return;
    _analyzing = true;

    var btn = document.getElementById('dmBtnAuto');
    if (btn) btn.disabled = true;

    var mask = showAutoAnalyzeOverlay();
    var fillEl = mask && mask.querySelector('[data-role="fill"]');
    var pctEl = mask && mask.querySelector('[data-role="pct"]');
    var stepEl = mask && mask.querySelector('[data-role="step"]');

    // 模拟阶段：每个阶段对应进度区间 + 文案
    var STAGES = [
      { to: 25,  text: '扫描表结构与字段',   delay: 280 },
      { to: 55,  text: '匹配主键 / 外键候选', delay: 320 },
      { to: 80,  text: '推断字段映射关系',   delay: 320 },
      { to: 95,  text: '生成关联连线',       delay: 260 },
      { to: 100, text: '完成',               delay: 180 }
    ];

    var stageIdx = 0;
    var current = 0;

    function tick() {
      if (stageIdx >= STAGES.length) {
        // 真正执行分析 + 刷新
        var added = runAutoAnalyzeCore();
        renderTopology();
        renderTree();
        renderHeader();
        hideAutoAnalyzeOverlay(mask);
        if (btn) btn.disabled = false;
        _analyzing = false;
        if (typeof showToast === 'function') {
          showToast(added > 0 ? ('已新增 ' + added + ' 条关联关系') : '未发现可推断的新关联');
        }
        return;
      }
      var stage = STAGES[stageIdx];
      if (stepEl) stepEl.textContent = stage.text;

      // 进度从 current → stage.to，按帧推进
      var start = current;
      var end = stage.to;
      var startTs = performance.now();
      var dur = stage.delay;
      function frame(now) {
        var t = Math.min(1, (now - startTs) / dur);
        // ease-out
        var p = 1 - Math.pow(1 - t, 2);
        current = start + (end - start) * p;
        var pct = Math.round(current);
        if (fillEl) fillEl.style.width = pct + '%';
        if (pctEl) pctEl.textContent = pct;
        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          stageIdx++;
          tick();
        }
      }
      requestAnimationFrame(frame);
    }
    tick();
  };

  // ===================================================================
  // 新增关系：弹出简易选择器（两表 + 字段 + JOIN）
  // ===================================================================
  window.__DM.startAddRelation = function () {
    var DM = window.__DM;
    var found = DM.findSource(DM.activeSourceId);
    if (!found) return;
    var src = found.source;
    if (src.tables.length < 2) {
      if (typeof showToast === 'function') showToast('当前数据源至少需要 2 张表');
      return;
    }

    // 借用抽屉来配置：选择两张表，默认创建 inner join + 空映射，然后进入连线属性编辑
    var firstTwo = src.tables.slice(0, 2);
    var newRel = {
      id: genRelId(),
      from: firstTwo[0].name,
      to: firstTwo[1].name,
      join: 'inner',
      mappings: [{ fromField: '', toField: '' }]
    };
    src.relations = src.relations || [];
    src.relations.push(newRel);
    renderTopology();
    DM.selection = { type: 'edge', id: newRel.id };
    var g = document.querySelector('g.dm-edge-group[data-edge-id="' + newRel.id + '"]');
    if (g) {
      g.classList.add('is-active');
      var p = g.querySelector('path.dm-edge');
      if (p) p.classList.add('is-active');
    }
    renderEdgeDrawer(newRel);
    openDrawer();
    if (typeof showToast === 'function') showToast('已新增连线，请在右侧编辑表与字段');
  };

  window.__DM.resetLayout = function () {
    var DM = window.__DM;
    var found = DM.findSource(DM.activeSourceId);
    if (!found) return;
    found.source.tables.forEach(function (t) {
      if (t._initPos) {
        t.pos.x = t._initPos.x;
        t.pos.y = t._initPos.y;
      }
    });
    renderTopology();
    if (typeof showToast === 'function') showToast('已自动整理画布布局');
  };

  // ===================================================================
  // 6) 抽屉：打开 / 关闭 / 渲染（表属性 / 连线属性）
  // ===================================================================
  function openDrawer() {
    var drawer = document.getElementById('dmDrawer');
    var mask = document.getElementById('dmDrawerMask');
    if (drawer) {
      drawer.classList.remove('hidden');
      drawer.setAttribute('aria-hidden', 'false');
    }
    if (mask) mask.classList.remove('hidden');
  }

  function closeDrawer() {
    var DM = window.__DM;
    var drawer = document.getElementById('dmDrawer');
    var mask = document.getElementById('dmDrawerMask');
    if (drawer) {
      drawer.classList.add('hidden');
      drawer.setAttribute('aria-hidden', 'true');
    }
    if (mask) mask.classList.add('hidden');
    DM.selection = null;
    // 清除节点 / 连线高亮
    document.querySelectorAll('.dm-node-wrap.is-active').forEach(function (el) {
      el.classList.remove('is-active');
    });
    document.querySelectorAll('.dm-edge-group.is-active').forEach(function (el) {
      el.classList.remove('is-active');
    });
    document.querySelectorAll('.dm-edge.is-active').forEach(function (el) {
      el.classList.remove('is-active');
    });
  }

  /** 只设置 selection 并在画布上高亮该表，不打开抽屉 */
  function highlightTable(name) {
    var DM = window.__DM;
    var found = DM.findSource(DM.activeSourceId);
    if (!found) return;
    var table = DM.findTable(found.source, name);
    if (!table || !table.inCanvas) return;

    DM.selection = { type: 'table', id: name };

    // 清掉旧高亮
    document.querySelectorAll('.dm-node-wrap.is-active').forEach(function (el) {
      el.classList.remove('is-active');
    });
    document.querySelectorAll('.dm-edge-group.is-active').forEach(function (el) {
      el.classList.remove('is-active');
    });
    document.querySelectorAll('.dm-edge.is-active').forEach(function (el) {
      el.classList.remove('is-active');
    });
    var fo = document.querySelector('foreignObject.dm-node[data-table-name="' + name + '"]');
    if (fo) {
      var w = fo.querySelector('.dm-node-wrap');
      if (w) w.classList.add('is-active');
    }
  }

  function selectTable(name) {
    var DM = window.__DM;
    var found = DM.findSource(DM.activeSourceId);
    if (!found) return;
    var table = DM.findTable(found.source, name);
    if (!table) return;
    highlightTable(name);
    renderTableDrawer(table);
    openDrawer();
  }

  window.__DM.highlightTable = highlightTable;

  // ---- 聚焦模式：双击表节点 → 仅展示该表及其关联 ----
  function enterFocus(name) {
    var DM = window.__DM;
    DM.focusTable = name;
    DM._fitOnNextRender = true;  // 重置 viewport 以铺满
    highlightTable(name);
    renderTopology();
    // 双击进入聚焦模式后再补一次高亮（renderTopology 会重渲，is-active class 会丢）
    var fo = document.querySelector('foreignObject.dm-node[data-table-name="' + name + '"]');
    if (fo) {
      var w = fo.querySelector('.dm-node-wrap');
      if (w) w.classList.add('is-active');
    }
  }
  function exitFocus() {
    var DM = window.__DM;
    if (!DM.focusTable) return;
    DM.focusTable = null;
    DM._fitOnNextRender = true;
    renderTopology();
    if (DM.selection && DM.selection.type === 'table') {
      highlightTable(DM.selection.id);
    }
  }
  window.__DM.enterFocus = enterFocus;
  window.__DM.exitFocus = exitFocus;

  function selectEdge(id) {
    var DM = window.__DM;
    var found = DM.findSource(DM.activeSourceId);
    if (!found) return;
    var rel = (found.source.relations || []).filter(function (r) { return r.id === id; })[0];
    if (!rel) return;

    DM.selection = { type: 'edge', id: id };
    document.querySelectorAll('.dm-node-wrap.is-active').forEach(function (el) {
      el.classList.remove('is-active');
    });
    document.querySelectorAll('.dm-edge-group.is-active').forEach(function (el) {
      el.classList.remove('is-active');
    });
    document.querySelectorAll('.dm-edge.is-active').forEach(function (el) {
      el.classList.remove('is-active');
    });
    var g = document.querySelector('g.dm-edge-group[data-edge-id="' + id + '"]');
    if (g) {
      g.classList.add('is-active');
      var p = g.querySelector('path.dm-edge');
      if (p) p.classList.add('is-active');
    }

    renderEdgeDrawer(rel);
    openDrawer();
  }

  var FACT_FIELD_BIZ_OPTIONS = [
    { key: 'dimension', label: '维度' },
    { key: 'measure', label: '度量' },
    { key: 'stat_time', label: '统计时间' },
    { key: 'time', label: '时间' }
  ];

  var DIM_FIELD_BIZ_OPTIONS = [
    { key: 'dim_code', label: '维度编码' },
    { key: 'dim_name', label: '维度名称' },
    { key: 'parent_code', label: '父类编码' },
    { key: 'dim_attr', label: '维度属性' }
  ];

  var TIME_FORMATS = ['yyyy', 'yyyyMM', 'yyyyMMdd', 'yyyyMMdd HH', 'yyyyMMdd HH:mm', 'yyyyMMdd HH:mm:ss', 'yyyy-MM', 'yyyy-MM-dd', 'yyyy-MM-dd HH:mm:ss'];
  function optionLabel(options, key) {
    for (var i = 0; i < options.length; i++) {
      if (options[i].key === key) return options[i].label;
    }
    return key || '-';
  }

  function buildOptions(options, selected) {
    var DM = window.__DM;
    return options.map(function (opt) {
      return '<option value="' + DM.escapeHTML(opt.key) + '"' + (opt.key === selected ? ' selected' : '') + '>' + DM.escapeHTML(opt.label) + '</option>';
    }).join('');
  }

  function makeDimensionRef(sourceId, tableName) {
    return sourceId + '::' + tableName;
  }

  function getDimensionTables() {
    var DM = window.__DM;
    var dims = [];
    DM.DATA.forEach(function (domain) {
      domain.sources.forEach(function (source) {
        (source.tables || []).forEach(function (table) {
          if (table.type !== 'dim') return;
          dims.push({
            domain: domain,
            source: source,
            table: table,
            ref: makeDimensionRef(source.id, table.name)
          });
        });
      });
    });
    return dims;
  }

  function findDimensionByRef(ref) {
    if (!ref) return null;
    var parts = String(ref).split('::');
    if (parts.length !== 2) return null;
    var found = window.__DM.findSource(parts[0]);
    if (!found) return null;
    var table = window.__DM.findTable(found.source, parts[1]);
    if (!table || table.type !== 'dim') return null;
    return { domain: found.domain, source: found.source, table: table, ref: ref };
  }

  function getDimensionLabel(ref) {
    var item = findDimensionByRef(ref);
    if (!item) return '';
    return item.table.alias || item.table.name;
  }

  function dimMatches(item, keywords) {
    var haystack = (item.table.name + ' ' + (item.table.alias || '') + ' ' + (item.table.comment || '') + ' ' + item.source.name + ' ' + item.domain.name).toLowerCase();
    return keywords.some(function (kw) { return haystack.indexOf(kw) >= 0; });
  }

  function getDefaultDimensionRef(fld) {
    var raw = (fld.name + ' ' + (fld.alias || '')).toLowerCase();
    var keywordGroups = [];
    if (/customer|客户/.test(raw)) keywordGroups.push(['customer', '客户']);
    if (/product|产品/.test(raw)) keywordGroups.push(['product', '产品']);
    if (/pay|支付/.test(raw)) keywordGroups.push(['pay', '支付']);
    if (/channel|渠道/.test(raw)) keywordGroups.push(['channel', '渠道']);
    if (/region|area|区域|地区/.test(raw)) keywordGroups.push(['region', '区域', '地区']);
    if (/segment|分群/.test(raw)) keywordGroups.push(['segment', '分群']);
    if (/tag|标签/.test(raw)) keywordGroups.push(['tag', '标签']);

    var dims = getDimensionTables();
    var activeSourceId = window.__DM.activeSourceId;
    for (var g = 0; g < keywordGroups.length; g++) {
      var preferred = dims.filter(function (item) {
        return item.source.id === activeSourceId && dimMatches(item, keywordGroups[g]);
      })[0];
      if (preferred) return preferred.ref;

      var any = dims.filter(function (item) {
        return dimMatches(item, keywordGroups[g]);
      })[0];
      if (any) return any.ref;
    }
    return '';
  }

  function getDefaultFactBizType(fld) {
    var raw = (fld.name + ' ' + (fld.alias || '') + ' ' + (fld.type || '')).toLowerCase();
    var text = fld.name + ' ' + (fld.alias || '');
    if (/date|time|日期|时间/.test(raw)) return /create|update|pay_time|applied|start|end|创建|更新|支付|生效|开始|结束/.test(raw) ? 'time' : 'stat_time';
    if (fld.fk || /customer|product|channel|region|city|industry|segment|tag|客户|产品|渠道|区域|城市|行业|分群|标签/.test(raw)) return 'dimension';
    if (/amount|price|qty|quantity|count|num|rate|sales|duration|金额|单价|数量|销量|销售|耗时|比率/.test(raw)) return 'measure';
    if (fld.pk || /(^|_)id$|code$|编号|编码/.test(text.toLowerCase())) return 'dimension';
    return 'dimension';
  }

  function getDefaultDimBizType(fld) {
    var raw = (fld.name + ' ' + (fld.alias || '')).toLowerCase();
    if (/parent|pid|父/.test(raw)) return 'parent_code';
    if (/name|title|名称|名字/.test(raw)) return 'dim_name';
    if (/(^|_)id$|code$|编码|编号/.test(raw)) return 'dim_code';
    return 'dim_attr';
  }

  function getDefaultBusinessExtra(table, fld, bizType) {
    var raw = (fld.name + ' ' + (fld.alias || '')).toLowerCase();
    if (table.type === 'fact') {
      if (bizType === 'dimension') {
        return getDefaultDimensionRef(fld);
      }
      if (bizType === 'stat_time') return fld.type && /datetime|timestamp/i.test(fld.type) ? 'yyyyMMdd HH:mm:ss' : 'yyyyMMdd';
      if (bizType === 'time') {
        if (fld.type && /datetime|timestamp/i.test(fld.type)) return 'yyyy-MM-dd HH:mm:ss';
        return fld.type && /date/i.test(fld.type) ? 'yyyy-MM-dd' : 'yyyyMMdd';
      }
    }
    return '';
  }

  function ensureFieldBusinessMeta(table) {
    if (!table || !table.fields) return;
    var factKeys = FACT_FIELD_BIZ_OPTIONS.map(function (o) { return o.key; });
    var dimKeys = DIM_FIELD_BIZ_OPTIONS.map(function (o) { return o.key; });
    table.fields.forEach(function (fld) {
      if (table.type === 'fact') {
        if (factKeys.indexOf(fld.bizType) < 0) fld.bizType = getDefaultFactBizType(fld);
        if (fld.bizType === 'dimension') {
          if (!findDimensionByRef(fld.bizExtra)) fld.bizExtra = getDefaultBusinessExtra(table, fld, fld.bizType);
        } else if (fld.bizExtra == null) {
          fld.bizExtra = getDefaultBusinessExtra(table, fld, fld.bizType);
        }
      } else if (table.type === 'dim') {
        if (dimKeys.indexOf(fld.bizType) < 0) fld.bizType = getDefaultDimBizType(fld);
        fld.bizExtra = '';
      } else {
        fld.bizExtra = '';
      }
    });
  }

  function findFieldByName(table, fieldName) {
    if (!table || !table.fields) return null;
    for (var i = 0; i < table.fields.length; i++) {
      if (table.fields[i].name === fieldName) return table.fields[i];
    }
    return null;
  }

  function buildDimensionPicker(value, fieldName) {
    var DM = window.__DM;
    var selected = findDimensionByRef(value);
    var treeHtml = DM.DATA.map(function (domain) {
      var sourceHtml = domain.sources.map(function (source) {
        var tableHtml = (source.tables || []).filter(function (table) {
          return table.type === 'dim';
        }).map(function (table) {
          var ref = makeDimensionRef(source.id, table.name);
          var active = ref === value ? ' active' : '';
          var label = table.alias || table.name;
          return ''
            + '<button type="button" class="dmd-biz-tree-table' + active + '" data-role="biz-picker-option" data-field-name="' + DM.escapeHTML(fieldName) + '" data-kind="dimension" data-value="' + DM.escapeHTML(ref) + '" data-label="' + DM.escapeHTML(label) + '">'
            +   '<span class="dmd-biz-tree-name">' + DM.escapeHTML(label) + '</span>'
            +   '<span class="dmd-biz-tree-code">' + DM.escapeHTML(table.name) + '</span>'
            + '</button>';
        }).join('');
        if (!tableHtml) return '';
        return ''
          + '<div class="dmd-biz-tree-source">'
          +   '<span class="dmd-biz-tree-caret"></span>'
          +   '<span class="dmd-biz-tree-icon source"></span>'
          +   '<span class="dmd-biz-tree-label">' + DM.escapeHTML(source.name) + '</span>'
          + '</div>'
          + '<div class="dmd-biz-tree-children">' + tableHtml + '</div>';
      }).join('');
      if (!sourceHtml.replace(/\s/g, '')) return '';
      return ''
        + '<div class="dmd-biz-tree-domain">'
        +   '<span class="dmd-biz-tree-caret"></span>'
        +   '<span class="dmd-biz-tree-icon domain"></span>'
        +   '<span class="dmd-biz-tree-label">' + DM.escapeHTML(domain.name) + '</span>'
        + '</div>'
        + '<div class="dmd-biz-tree-children">' + sourceHtml + '</div>';
    }).join('');
    if (!treeHtml.replace(/\s/g, '')) treeHtml = '<div class="dmd-biz-menu-empty">暂无可选维度表</div>';
    return ''
      + '<div class="dmd-biz-picker-wrap" data-role="biz-picker" data-field-name="' + DM.escapeHTML(fieldName) + '" data-kind="dimension">'
      +   '<button type="button" class="dmd-biz-picker" data-role="biz-picker-trigger">'
      +     '<span>' + DM.escapeHTML(selected ? (selected.table.alias || selected.table.name) : '请选择维度') + '</span>'
      +     '<i></i>'
      +   '</button>'
      +   '<div class="dmd-biz-menu dmd-biz-tree-menu hidden">'
      +     '<div class="dmd-biz-menu-title">来源数据模型</div>'
      +     treeHtml
      +   '</div>'
      + '</div>';
  }

  function buildFactBusinessExtra(table, fld) {
    var DM = window.__DM;
    var fieldName = fld.name;
    if (fld.bizType === 'measure') {
      return '<span class="dmd-biz-muted">无需配置</span>';
    }
    if (fld.bizType === 'dimension') {
      return buildDimensionPicker(fld.bizExtra, fieldName);
    }
    if (fld.bizType === 'stat_time' || fld.bizType === 'time') {
      var selected = fld.bizExtra || getDefaultBusinessExtra(table, fld, fld.bizType);
      var opts = TIME_FORMATS.map(function (fmt) {
        return '<option value="' + DM.escapeHTML(fmt) + '"' + (fmt === selected ? ' selected' : '') + '>' + DM.escapeHTML(fmt) + '</option>';
      }).join('');
      return '<select class="dmd-biz-extra-select" data-role="field-biz-extra" data-field-name="' + DM.escapeHTML(fieldName) + '">' + opts + '</select>';
    }
    return '';
  }

  function buildBusinessCell(table, fld) {
    var DM = window.__DM;
    ensureFieldBusinessMeta(table);
    if (table.type === 'fact') {
      return ''
        + '<div class="dmd-biz-cell">'
        +   '<select class="dmd-biz-select" data-role="field-biz-type" data-field-name="' + DM.escapeHTML(fld.name) + '">' + buildOptions(FACT_FIELD_BIZ_OPTIONS, fld.bizType) + '</select>'
        +   '<span class="dmd-biz-extra" data-role="field-biz-extra-wrap">' + buildFactBusinessExtra(table, fld) + '</span>'
        + '</div>';
    }
    if (table.type === 'dim') {
      return ''
        + '<div class="dmd-biz-cell dmd-biz-cell-compact">'
        +   '<select class="dmd-biz-select" data-role="field-biz-type" data-field-name="' + DM.escapeHTML(fld.name) + '">' + buildOptions(DIM_FIELD_BIZ_OPTIONS, fld.bizType) + '</select>'
        + '</div>';
    }
    return '<span class="dmd-biz-disabled">--</span>';
  }

  // ---- 表属性渲染 ----
  function renderTableDrawer(table) {
    var DM = window.__DM;
    var found = DM.findSource(DM.activeSourceId);
    var titleEl = document.getElementById('dmDrawerTitle');
    var subEl = document.getElementById('dmDrawerSubtitle');
    var bodyEl = document.getElementById('dmDrawerBody');
    if (!titleEl || !bodyEl) return;

    titleEl.textContent = (table.alias ? table.alias + ' · ' : '') + table.name;
    subEl.textContent = '所属数据源：' + (found ? found.source.name : '-') + ' · ' + (table.comment || '');
    ensureFieldBusinessMeta(table);

    var TYPE_OPTIONS = [
      { key: 'fact', label: '事实表' },
      { key: 'dim', label: '维度表' },
      { key: 'bridge', label: '桥接表' },
      { key: 'other', label: '其它表' }
    ];
    var curType = table.type || 'fact';
    table.type = curType;
    var typeOptionsHtml = TYPE_OPTIONS.map(function (o) {
      return '<option value="' + o.key + '"' + (o.key === curType ? ' selected' : '') + '>' + o.label + '</option>';
    }).join('');

    var attrsHtml = ''
      + '<div class="dmd-section">'
      +   '<h4>基本信息</h4>'
      +   '<div class="dmd-meta-grid">'
      +     '<span class="lbl">表名</span><span class="val">' + DM.escapeHTML(table.name) + '</span>'
      +     '<span class="lbl">别名</span><span class="val">' + DM.escapeHTML(table.alias || '-') + '</span>'
      +     '<span class="lbl">注释</span><span class="val">' + DM.escapeHTML(table.comment || '-') + '</span>'
      +     '<span class="lbl">类型</span>'
      +     '<span class="val">'
      +       '<select class="dmd-meta-select" data-role="table-type">' + typeOptionsHtml + '</select>'
      +     '</span>'
      +     '<span class="lbl">字段数</span><span class="val">' + table.fields.length + '</span>'
      +     '<span class="lbl">记录数</span><span class="val">' + (table.rows != null ? table.rows.toLocaleString() : '-') + '</span>'
      +   '</div>'
      + '</div>';

    var tabsHtml = ''
      + '<div class="dmd-tabs" data-role="dmd-tabs">'
      +   '<button type="button" class="dmd-tab active" data-tab="schema">表结构</button>'
      +   '<button type="button" class="dmd-tab" data-tab="preview">数据预览</button>'
      + '</div>';

    var schemaRows = table.fields.map(function (fld) {
      var attrs = [];
      if (fld.pk) attrs.push('<span class="dmd-attr dmd-attr-pk">PK</span>');
      if (fld.fk) attrs.push('<span class="dmd-attr dmd-attr-fk">FK</span>');
      if (fld.nn && !fld.pk) attrs.push('<span class="dmd-attr dmd-attr-nn">NN</span>');
      return ''
        + '<tr>'
        +   '<td>' + DM.escapeHTML(fld.name) + '</td>'
        +   '<td>' + DM.escapeHTML(fld.alias || '-') + '</td>'
        +   '<td>' + DM.escapeHTML(fld.type) + '</td>'
        +   '<td>' + (attrs.join('') || '-') + '</td>'
        +   '<td>' + buildBusinessCell(table, fld) + '</td>'
        + '</tr>';
    }).join('');

    var schemaHtml = ''
      + '<div class="dmd-tab-pane" data-pane="schema">'
      +   '<div class="dmd-schema-wrap">'
      +     '<table class="dmd-table dmd-schema-table">'
      +       '<thead><tr><th>字段名</th><th>别名</th><th>类型</th><th>技术属性</th><th>业务属性</th></tr></thead>'
      +       '<tbody>' + schemaRows + '</tbody>'
      +     '</table>'
      +   '</div>'
      + '</div>';

    var previewHead = '<tr>' + table.fields.map(function (f) {
      return '<th>' + DM.escapeHTML(f.alias || f.name) + '</th>';
    }).join('') + '</tr>';
    var previewBody = (table.preview || []).map(function (row) {
      return '<tr>' + row.map(function (cell) {
        return '<td>' + DM.escapeHTML(cell == null ? '' : String(cell)) + '</td>';
      }).join('') + '</tr>';
    }).join('') || '<tr><td colspan="' + table.fields.length + '" style="text-align:center;color:#9ca3af;padding:24px 0;">暂无样例数据</td></tr>';

    var previewHtml = ''
      + '<div class="dmd-tab-pane hidden" data-pane="preview">'
      +   '<div class="dmd-preview-wrap">'
      +     '<table class="dmd-table">'
      +       '<thead>' + previewHead + '</thead>'
      +       '<tbody>' + previewBody + '</tbody>'
      +     '</table>'
      +   '</div>'
      + '</div>';

    bodyEl.innerHTML = attrsHtml + tabsHtml + schemaHtml + previewHtml;
  }

  // ---- 连线属性渲染：JOIN 类型 + 字段映射 ----
  var JOIN_OPTIONS = [
    { key: 'left',  title: 'LEFT JOIN',  desc: '保留左表全部记录，未匹配的右表字段为 NULL' },
    { key: 'right', title: 'RIGHT JOIN', desc: '保留右表全部记录，未匹配的左表字段为 NULL' },
    { key: 'inner', title: 'INNER JOIN', desc: '仅保留两表均匹配上的记录' },
    { key: 'full',  title: 'FULL JOIN',  desc: '保留两表全部记录，未匹配处填 NULL' }
  ];

  function buildFieldOptions(table, selected) {
    if (!table) return '<option value="">-</option>';
    return ['<option value="">请选择字段</option>'].concat(
      table.fields.map(function (fld) {
        var sel = (fld.name === selected) ? ' selected' : '';
        var label = fld.name + (fld.alias ? ' (' + fld.alias + ')' : '') + ' · ' + fld.type;
        return '<option value="' + window.__DM.escapeHTML(fld.name) + '"' + sel + '>'
             + window.__DM.escapeHTML(label) + '</option>';
      })
    ).join('');
  }

  function renderEdgeDrawer(rel) {
    var DM = window.__DM;
    var bodyEl = document.getElementById('dmDrawerBody');
    var titleEl = document.getElementById('dmDrawerTitle');
    var subEl = document.getElementById('dmDrawerSubtitle');
    if (!bodyEl) return;

    var found = DM.findSource(DM.activeSourceId);
    if (!found) return;
    var src = found.source;
    var fromTable = DM.findTable(src, rel.from);
    var toTable = DM.findTable(src, rel.to);

    if (titleEl) titleEl.textContent = '表关联关系';
    if (subEl) subEl.textContent = '配置左右表的关联类型与字段映射，编辑后立即生效。';

    var tableOpts = function (selected) {
      return src.tables.map(function (t) {
        var sel = (t.name === selected) ? ' selected' : '';
        var lbl = t.name + (t.alias ? ' (' + t.alias + ')' : '');
        return '<option value="' + DM.escapeHTML(t.name) + '"' + sel + '>' + DM.escapeHTML(lbl) + '</option>';
      }).join('');
    };

    var bannerHtml = ''
      + '<div class="dmd-rel-banner">'
      +   '<select class="fld-sel" data-role="rel-from" style="flex:1;min-width:0;">' + tableOpts(rel.from) + '</select>'
      +   '<span class="rel-arrow">'
      +     '<svg viewBox="0 0 22 14" aria-hidden="true"><path d="M1 7h18"/><path d="M14 2l5 5-5 5"/></svg>'
      +   '</span>'
      +   '<select class="fld-sel" data-role="rel-to" style="flex:1;min-width:0;">' + tableOpts(rel.to) + '</select>'
      + '</div>';

    var joinHtml = ''
      + '<div class="dmd-section">'
      +   '<h4>关联类型</h4>'
      +   '<div class="dmd-join-grid" data-role="join-grid">'
      +     JOIN_OPTIONS.map(function (opt) {
              var active = rel.join === opt.key ? ' active' : '';
              return ''
                + '<div class="dmd-join-card' + active + '" data-join="' + opt.key + '">'
                +   '<span class="join-radio"></span>'
                +   '<h5>' + opt.title + '</h5>'
                +   '<p>' + opt.desc + '</p>'
                + '</div>';
            }).join('')
      +   '</div>'
      + '</div>';

    var mappings = (rel.mappings && rel.mappings.length) ? rel.mappings : [{ fromField: '', toField: '' }];
    var mapRowsHtml = mappings.map(function (m, idx) {
      return ''
        + '<tr data-row-idx="' + idx + '">'
        +   '<td>'
        +     '<select class="fld-sel" data-side="from" data-row-idx="' + idx + '">'
        +       buildFieldOptions(fromTable, m.fromField)
        +     '</select>'
        +   '</td>'
        +   '<td class="col-eq">=</td>'
        +   '<td>'
        +     '<select class="fld-sel" data-side="to" data-row-idx="' + idx + '">'
        +       buildFieldOptions(toTable, m.toField)
        +     '</select>'
        +   '</td>'
        +   '<td class="col-act">'
        +     '<button type="button" class="dmd-row-del" data-role="del-mapping" data-row-idx="' + idx + '" title="删除该字段映射">'
        +       '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>'
        +     '</button>'
        +   '</td>'
        + '</tr>';
    }).join('');

    var mapHtml = ''
      + '<div class="dmd-section">'
      +   '<h4>字段映射</h4>'
      +   '<table class="dmd-fields-table" data-role="map-table">'
      +     '<thead><tr><th>左表字段（' + DM.escapeHTML(rel.from) + '）</th><th></th><th>右表字段（' + DM.escapeHTML(rel.to) + '）</th><th></th></tr></thead>'
      +     '<tbody data-role="map-body">' + mapRowsHtml + '</tbody>'
      +   '</table>'
      +   '<button type="button" class="dmd-add-row" data-role="add-mapping">'
      +     '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>'
      +     '新增字段映射'
      +   '</button>'
      + '</div>';

    var footHtml = ''
      + '<div class="dmd-foot-bar">'
      +   '<button type="button" class="dmd-danger-btn" data-role="del-rel">'
      +     '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>'
      +     '删除关联关系'
      +   '</button>'
      + '</div>';

    bodyEl.innerHTML = bannerHtml + joinHtml + mapHtml + footHtml;

    // 把当前 rel 暂存到 body data 上，事件代理时读取
    bodyEl.setAttribute('data-edge-id', rel.id);
  }

  // ---- 抽屉内（连线属性）的事件 —— 字段映射编辑、JOIN 切换、删除关联关系 ----
  function bindEdgeDrawerEvents() {
    var bodyEl = document.getElementById('dmDrawerBody');
    if (!bodyEl) return;

    bodyEl.addEventListener('click', function (e) {
      var DM = window.__DM;
      if (!DM.selection || DM.selection.type !== 'edge') return;
      var found = DM.findSource(DM.activeSourceId);
      if (!found) return;
      var rel = (found.source.relations || []).filter(function (r) { return r.id === DM.selection.id; })[0];
      if (!rel) return;

      // 1) JOIN 切换
      var joinCard = e.target.closest && e.target.closest('.dmd-join-card');
      if (joinCard) {
        var nextJoin = joinCard.getAttribute('data-join');
        if (nextJoin && nextJoin !== rel.join) {
          rel.join = nextJoin;
          renderTopology();
          renderEdgeDrawer(rel);
          // 重新高亮
          var g = document.querySelector('g.dm-edge-group[data-edge-id="' + rel.id + '"]');
          if (g) {
            g.classList.add('is-active');
            var p = g.querySelector('path.dm-edge');
            if (p) p.classList.add('is-active');
          }
          if (typeof showToast === 'function') showToast('已更新关联类型为 ' + nextJoin.toUpperCase());
        }
        return;
      }

      // 2) 新增字段映射
      var addBtn = e.target.closest && e.target.closest('[data-role="add-mapping"]');
      if (addBtn) {
        if (!rel.mappings) rel.mappings = [];
        rel.mappings.push({ fromField: '', toField: '' });
        renderEdgeDrawer(rel);
        return;
      }

      // 3) 删除字段映射
      var delMapBtn = e.target.closest && e.target.closest('[data-role="del-mapping"]');
      if (delMapBtn) {
        var idx = parseInt(delMapBtn.getAttribute('data-row-idx'), 10);
        if (rel.mappings && rel.mappings.length > idx) {
          rel.mappings.splice(idx, 1);
          if (rel.mappings.length === 0) rel.mappings.push({ fromField: '', toField: '' });
          renderTopology();
          renderEdgeDrawer(rel);
          var g2 = document.querySelector('g.dm-edge-group[data-edge-id="' + rel.id + '"]');
          if (g2) {
            g2.classList.add('is-active');
            var p2 = g2.querySelector('path.dm-edge');
            if (p2) p2.classList.add('is-active');
          }
        }
        return;
      }

      // 4) 删除整条关联关系
      var delRelBtn = e.target.closest && e.target.closest('[data-role="del-rel"]');
      if (delRelBtn) {
        var src = found.source;
        src.relations = (src.relations || []).filter(function (r) { return r.id !== rel.id; });
        DM.selection = null;
        closeDrawer();
        renderTopology();
        if (typeof showToast === 'function') showToast('已删除关联关系');
        return;
      }

    });

    bodyEl.addEventListener('change', function (e) {
      var DM = window.__DM;
      if (!DM.selection || DM.selection.type !== 'edge') return;
      var found = DM.findSource(DM.activeSourceId);
      if (!found) return;
      var rel = (found.source.relations || []).filter(function (r) { return r.id === DM.selection.id; })[0];
      if (!rel) return;

      var sel = e.target.closest && e.target.closest('select.fld-sel');
      if (!sel) return;

      // 顶部 banner：左/右表切换
      var role = sel.getAttribute('data-role');
      if (role === 'rel-from' || role === 'rel-to') {
        var newName = sel.value;
        var otherName = (role === 'rel-from') ? rel.to : rel.from;
        if (newName === otherName) {
          if (typeof showToast === 'function') showToast('左右表不能相同');
          renderEdgeDrawer(rel);
          return;
        }
        if (role === 'rel-from') rel.from = newName;
        else rel.to = newName;
        // 切换表后字段映射可能不再有效 → 清空首行（保留行结构方便用户重选）
        rel.mappings = [{ fromField: '', toField: '' }];
        renderTopology();
        renderEdgeDrawer(rel);
        var g = document.querySelector('g.dm-edge-group[data-edge-id="' + rel.id + '"]');
        if (g) {
          g.classList.add('is-active');
          var p = g.querySelector('path.dm-edge');
          if (p) p.classList.add('is-active');
        }
        return;
      }

      // 字段映射 select
      var idx = parseInt(sel.getAttribute('data-row-idx'), 10);
      var side = sel.getAttribute('data-side');
      if (!rel.mappings || !rel.mappings[idx]) return;

      if (side === 'from') rel.mappings[idx].fromField = sel.value;
      else rel.mappings[idx].toField = sel.value;

      // 字段集合变化 → 重绘节点（节点字段只展示参与关联的字段）
      renderTopology();
      // 重新高亮该连线
      var g3 = document.querySelector('g.dm-edge-group[data-edge-id="' + rel.id + '"]');
      if (g3) {
        g3.classList.add('is-active');
        var p3 = g3.querySelector('path.dm-edge');
        if (p3) p3.classList.add('is-active');
      }
    });
  }
  window.__DM.bindEdgeDrawerEvents = bindEdgeDrawerEvents;

  // ===================================================================
  // 7) 抽屉宽度拖动
  // ===================================================================
  window.__DM.bindDrawerResize = function () {
    var resizer = document.getElementById('dmDrawerResizer');
    var drawer = document.getElementById('dmDrawer');
    if (!resizer || !drawer) return;

    var dragging = false;
    var startX = 0;
    var startW = 0;

    resizer.addEventListener('mousedown', function (e) {
      dragging = true;
      resizer.classList.add('dragging');
      startX = e.clientX;
      startW = drawer.getBoundingClientRect().width;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = startX - e.clientX;
      var nextW = Math.max(760, Math.min(window.innerWidth * 0.92, startW + dx));
      drawer.style.width = nextW + 'px';
    });

    document.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove('dragging');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    });
  };

  // ---- 暴露 ----
  window.__DM.openDrawer = openDrawer;
  window.__DM.closeDrawer = closeDrawer;
  window.__DM.selectTable = selectTable;
  window.__DM.selectEdge = selectEdge;
  window.__DM.renderTableDrawer = renderTableDrawer;
  window.__DM.renderEdgeDrawer = renderEdgeDrawer;

  // ---- 抽屉内 Tab 切换 / 关闭按钮 / 蒙层点击 ----
  window.__DM.bindDrawer = function () {
    var drawerBody = document.getElementById('dmDrawerBody');
    var closeBtn = document.getElementById('dmDrawerClose');
    var mask = document.getElementById('dmDrawerMask');

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (mask) mask.addEventListener('click', closeDrawer);

    if (drawerBody) {
      drawerBody.addEventListener('click', function (e) {
        var pickerOption = e.target.closest && e.target.closest('[data-role="biz-picker-option"]');
        if (pickerOption) {
          var DM = window.__DM;
          if (!DM.selection || DM.selection.type !== 'table') return;
          var found = DM.findSource(DM.activeSourceId);
          var table = found && DM.findTable(found.source, DM.selection.id);
          var fieldName = pickerOption.getAttribute('data-field-name');
          var field = table && findFieldByName(table, fieldName);
          if (!field) return;
          field.bizExtra = pickerOption.getAttribute('data-value') || '';
          var pickerWrap = pickerOption.closest('[data-role="biz-picker"]');
          if (pickerWrap) {
            var label = pickerWrap.querySelector('.dmd-biz-picker span');
            var menu = pickerWrap.querySelector('.dmd-biz-menu');
            var selectedLabel = pickerOption.getAttribute('data-label') || getDimensionLabel(field.bizExtra) || '请选择维度';
            if (label) label.textContent = selectedLabel;
            if (menu) {
              menu.querySelectorAll('.dmd-biz-tree-table.active').forEach(function (item) {
                item.classList.remove('active');
              });
              pickerOption.classList.add('active');
            }
            if (menu) menu.classList.add('hidden');
          }
          return;
        }

        var pickerTrigger = e.target.closest && e.target.closest('[data-role="biz-picker-trigger"]');
        if (pickerTrigger) {
          var currentWrap = pickerTrigger.closest('[data-role="biz-picker"]');
          var currentMenu = currentWrap && currentWrap.querySelector('.dmd-biz-menu');
          drawerBody.querySelectorAll('.dmd-biz-menu').forEach(function (menu) {
            if (menu !== currentMenu) menu.classList.add('hidden');
          });
          if (currentMenu) currentMenu.classList.toggle('hidden');
          return;
        }

        if (!e.target.closest || !e.target.closest('[data-role="biz-picker"]')) {
          drawerBody.querySelectorAll('.dmd-biz-menu').forEach(function (menu) {
            menu.classList.add('hidden');
          });
        }

        var tabBtn = e.target.closest && e.target.closest('.dmd-tab');
        if (tabBtn) {
          var key = tabBtn.getAttribute('data-tab');
          var tabs = drawerBody.querySelectorAll('.dmd-tab');
          var panes = drawerBody.querySelectorAll('.dmd-tab-pane');
          tabs.forEach(function (b) { b.classList.toggle('active', b === tabBtn); });
          panes.forEach(function (p) {
            p.classList.toggle('hidden', p.getAttribute('data-pane') !== key);
          });
          return;
        }
      });

      // 表属性 - 类型
      drawerBody.addEventListener('change', function (e) {
        var DM = window.__DM;
        if (!DM.selection || DM.selection.type !== 'table') return;
        var found = DM.findSource(DM.activeSourceId);
        var table = found && DM.findTable(found.source, DM.selection.id);
        if (!table) return;

        var sel = e.target.closest && e.target.closest('select[data-role="table-type"]');
        if (!sel) return;
        table.type = sel.value;
        ensureFieldBusinessMeta(table);
        renderTree();
        renderTableDrawer(table);
        if (typeof showToast === 'function') {
          var labelMap = { fact: '事实表', dim: '维度表', bridge: '桥接表', other: '其它表' };
          showToast('表类型已更新为 ' + (labelMap[sel.value] || sel.value));
        }
        return;
      });

      // 表结构 - 业务属性联动
      drawerBody.addEventListener('change', function (e) {
        var DM = window.__DM;
        if (!DM.selection || DM.selection.type !== 'table') return;
        var found = DM.findSource(DM.activeSourceId);
        var table = found && DM.findTable(found.source, DM.selection.id);
        if (!table) return;

        var bizSel = e.target.closest && e.target.closest('select[data-role="field-biz-type"]');
        if (bizSel) {
          var fieldName = bizSel.getAttribute('data-field-name');
          var fld = findFieldByName(table, fieldName);
          if (!fld) return;
          fld.bizType = bizSel.value;
          fld.bizExtra = getDefaultBusinessExtra(table, fld, fld.bizType);
          var cell = bizSel.closest('.dmd-biz-cell');
          var extraWrap = cell && cell.querySelector('[data-role="field-biz-extra-wrap"]');
          if (extraWrap) extraWrap.innerHTML = buildFactBusinessExtra(table, fld);
          if (typeof showToast === 'function') {
            var opts = table.type === 'dim' ? DIM_FIELD_BIZ_OPTIONS : FACT_FIELD_BIZ_OPTIONS;
            showToast('业务属性已更新为 ' + optionLabel(opts, fld.bizType));
          }
          return;
        }

        var extraSel = e.target.closest && e.target.closest('select[data-role="field-biz-extra"]');
        if (extraSel) {
          var extraFieldName = extraSel.getAttribute('data-field-name');
          var extraFld = findFieldByName(table, extraFieldName);
          if (!extraFld) return;
          extraFld.bizExtra = extraSel.value;
        }
      });
    }

    // ESC 关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  };

  // ---- 画布点击：连线（节点的点击通过拖动 mouseup 处理，已在第 7 步） ----
  window.__DM.bindCanvasClick = function () {
    var edgeLayer = document.getElementById('dmEdgeLayer');
    var nodeLayer = document.getElementById('dmNodeLayer');
    if (edgeLayer) {
      edgeLayer.addEventListener('click', function (e) {
        var g = e.target.closest && e.target.closest('g.dm-edge-group');
        if (!g) return;
        var id = g.getAttribute('data-edge-id');
        if (id) selectEdge(id);
      });
    }

    // 双击表节点 → 聚焦
    if (nodeLayer) {
      nodeLayer.addEventListener('dblclick', function (e) {
        if (e.target.closest && e.target.closest('.dm-anchor')) return;
        var fo = e.target.closest && e.target.closest('foreignObject.dm-node');
        if (!fo) return;
        var name = fo.getAttribute('data-table-name');
        if (name) enterFocus(name);
      });
    }

    // 返回按钮
    var backBtn = document.getElementById('dmFocusBack');
    if (backBtn) backBtn.addEventListener('click', exitFocus);
  };

  // ===================================================================
  // 顶部工具栏：搜索 / 自动关联分析 / 自动布局 / 新增关系
  // ===================================================================
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'dmTableSearch') {
      window.__DM.tableKeyword = e.target.value || '';
      if (window.__DM.applyTableKeyword) window.__DM.applyTableKeyword();
    }
  });

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;

    if (e.target.closest('#dmBtnAuto')) {
      if (window.__DM.autoAnalyze) window.__DM.autoAnalyze();
    } else if (e.target.closest('#dmBtnReset')) {
      if (window.__DM.resetLayout) window.__DM.resetLayout();
    } else if (e.target.closest('#dmBtnAddRel')) {
      if (window.__DM.startAddRelation) window.__DM.startAddRelation();
    } else if (e.target.closest('#dmBtnImport')) {
      if (window.__DM.openImportModal) window.__DM.openImportModal();
    } else if (e.target.closest('#dmBtnExport')) {
      if (window.__DM.exportRelations) window.__DM.exportRelations();
    }
  });

  // 应用搜索关键字（仅刷新画布即可，让未命中表 dim 显示）
  window.__DM.applyTableKeyword = function () { renderTopology(); };

  // 暴露给外部，供后面 step 覆盖
  window.__DM.renderTree = renderTree;
  window.__DM.selectSource = selectSource;
  window.__DM.renderHeader = renderHeader;
  window.__DM.renderTopology = renderTopology;
  window.__DM.closeDrawer = closeDrawer;

  // ===================================================================
  // 事件绑定（左侧树 + 搜索框）
  // ===================================================================
  document.addEventListener('DOMContentLoaded', function () {
    renderTree();
    var DM = window.__DM;
    if (DM.renderHeader) DM.renderHeader();
    if (DM.renderTopology) DM.renderTopology();
    bindNodeDrag();
    if (DM.bindCanvasClick) DM.bindCanvasClick();
    if (DM.bindDrawer) DM.bindDrawer();
    if (DM.bindEdgeDrawerEvents) DM.bindEdgeDrawerEvents();
    if (DM.bindDrawerResize) DM.bindDrawerResize();
    bindTreeDragToCanvas();
    if (DM.bindAnchorDrag) DM.bindAnchorDrag();
    if (DM.bindDeleteKey) DM.bindDeleteKey();
    if (DM.bindZoom) DM.bindZoom();
    if (DM.bindMinimap) DM.bindMinimap();
    if (DM.bindPan) DM.bindPan();
    if (DM.bindImportModal) DM.bindImportModal();
  });

  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;

    // 1) 表行：切换数据源（如有）+ 若已在画布则只高亮（不开抽屉）
    var tableRow = e.target.closest('.dmt-row.dmt-table-row');
    if (tableRow) {
      var srcId = tableRow.getAttribute('data-source-id');
      var tName = tableRow.getAttribute('data-table-name');
      if (srcId && srcId !== window.__DM.activeSourceId) {
        window.__DM.selectSource(srcId);
      }
      var found = window.__DM.findSource(window.__DM.activeSourceId);
      var t = found && window.__DM.findTable(found.source, tName);
      if (t && t.inCanvas && window.__DM.highlightTable) {
        window.__DM.highlightTable(tName);
      }
      return;
    }

    // 2) 数据源行：点击切换数据源（同时让该数据源展开 / 折叠）
    var sourceRow = e.target.closest('.dmt-row[data-source-id]');
    if (sourceRow) {
      var sid = sourceRow.getAttribute('data-source-id');
      var node = sourceRow.parentElement;
      if (sid === window.__DM.activeSourceId) {
        if (node) node.classList.toggle('collapsed');
      } else {
        window.__DM.selectSource(sid);
        // 切换后默认让该数据源展开
        if (node) node.classList.remove('collapsed');
      }
      return;
    }

    // 3) 分组行：折叠
    var domainRow = e.target.closest('.dmt-row[data-domain-id]');
    if (domainRow) {
      var dnode = domainRow.parentElement;
      if (dnode) dnode.classList.toggle('collapsed');
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'dmTreeSearch') {
      window.__DM.treeKeyword = e.target.value || '';
      renderTree();
    }
  });
})();
