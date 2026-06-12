/* ======================================================================
 * 分析主题（admin/theme.html）
 *  - 左侧：分析主题列表（拖排序 / 右键菜单 / 新建图标）
 *  - 右侧：当前主题信息 + 关联数据模型表（搜索、按数据源筛选、添加、移除）
 *  - 弹窗 1：新建/编辑主题
 *  - 弹窗 2：选择数据模型（左数据源 / 右模型多选）
 *  - 弹窗 3：通用确认（删除）
 * ====================================================================== */
(function () {
  'use strict';

  // ---------- 1) Mock 数据 ----------
  // 数据源（按业务域分组）
  var DOMAINS = [
    {
      key: 'sales', name: '销售域',
      sources: [
        { id: 's_sales_main', name: '销售业务库', type: 'MySQL' },
        { id: 's_order_svc', name: '订单服务库', type: 'MySQL' }
      ]
    },
    {
      key: 'customer', name: '客户域',
      sources: [
        { id: 's_cdw', name: '客户数据仓库', type: 'TiDB' }
      ]
    },
    {
      key: 'finance', name: '财务域',
      sources: [
        { id: 's_finance', name: '财务核算库', type: 'Oracle' }
      ]
    },
    {
      key: 'supply', name: '供应链域',
      sources: [
        { id: 's_inventory', name: '库存管理库', type: 'PostgreSQL' },
        { id: 's_logistics', name: '物流配送库', type: 'PostgreSQL' }
      ]
    }
  ];

  // ---- 字段 / 表的工厂方法（与 data-model 保持一致的字段结构） ----
  function f(name, alias, type, attrs) {
    return Object.assign({ name: name, alias: alias, type: type }, attrs || {});
  }
  function tbl(name, alias, comment, type, rows, fields, preview) {
    return {
      name: name, alias: alias, comment: comment,
      type: type || 'fact', rows: rows || 0,
      fields: fields || [],
      preview: preview || []
    };
  }

  // 数据模型库（id 全局唯一）
  // 每个模型包含若干张表，tables 中的 fields/preview 用于右侧抽屉渲染（与数据模型抽屉一致）
  var MODELS = [
    // ============== 销售 ==============
    {
      id: 'm_sales_order', name: '销售订单模型', code: 'sales_order_model',
      srcId: 's_sales_main', updatedAt: '2026-05-04',
      desc: '覆盖销售订单主单 + 明细 + 客户 + 产品 + 渠道 + 区域，用于销售经营分析。',
      tables: [
        tbl('sales_order', '销售订单', '销售订单主表', 'fact', 1200000, [
          f('order_id', '订单ID', 'BIGINT', { pk: true, nn: true }),
          f('customer_id', '客户ID', 'BIGINT', { fk: true, nn: true }),
          f('product_id', '产品ID', 'BIGINT', { fk: true, nn: true }),
          f('channel_id', '渠道ID', 'BIGINT', { fk: true }),
          f('order_date', '订单日期', 'DATE', { nn: true }),
          f('region', '销售区域', 'VARCHAR(32)'),
          f('sales_amount', '销售金额', 'DECIMAL(12,2)'),
          f('quantity', '数量', 'INT')
        ], [
          ['SO20260501001', 1001, 'P-301', 'C-01', '2026-05-01', '华东', 1280.00, 2],
          ['SO20260501002', 1002, 'P-205', 'C-02', '2026-05-01', '华南', 980.50, 1],
          ['SO20260502001', 1003, 'P-309', 'C-01', '2026-05-02', '华东', 4500.00, 5],
          ['SO20260502002', 1004, 'P-118', 'C-03', '2026-05-02', '华北', 760.00, 1]
        ]),
        tbl('sales_order_item', '订单明细', '销售订单明细', 'fact', 5400000, [
          f('item_id', '明细ID', 'BIGINT', { pk: true, nn: true }),
          f('order_id', '订单ID', 'BIGINT', { fk: true, nn: true }),
          f('product_id', '产品ID', 'BIGINT', { fk: true, nn: true }),
          f('price', '单价', 'DECIMAL(12,2)'),
          f('qty', '数量', 'INT'),
          f('amount', '金额', 'DECIMAL(12,2)')
        ], [
          ['IT001', 'SO20260501001', 'P-301', 640.00, 2, 1280.00],
          ['IT002', 'SO20260501002', 'P-205', 980.50, 1, 980.50],
          ['IT003', 'SO20260502001', 'P-309', 900.00, 5, 4500.00]
        ]),
        tbl('customer', '客户', '客户维度', 'dim', 86000, [
          f('customer_id', '客户ID', 'BIGINT', { pk: true, nn: true }),
          f('customer_name', '客户名称', 'VARCHAR(64)', { nn: true }),
          f('industry', '所属行业', 'VARCHAR(32)'),
          f('city', '城市', 'VARCHAR(32)'),
          f('vip_level', 'VIP等级', 'VARCHAR(8)')
        ], [
          [1001, 'A 科技公司', '科技', '上海', 'V3'],
          [1002, 'B 贸易公司', '贸易', '广州', 'V2'],
          [1003, 'C 制造公司', '制造', '杭州', 'V4']
        ]),
        tbl('product', '产品', '产品维度', 'dim', 12000, [
          f('product_id', '产品ID', 'VARCHAR(16)', { pk: true, nn: true }),
          f('product_name', '产品名称', 'VARCHAR(64)', { nn: true }),
          f('category', '类目', 'VARCHAR(32)'),
          f('unit_price', '标准单价', 'DECIMAL(12,2)')
        ], [
          ['P-301', '智能音箱 Pro', '电子', 640.00],
          ['P-205', '便携蓝牙耳机', '电子', 980.50],
          ['P-309', '工业打印机', '设备', 900.00]
        ]),
        tbl('channel', '渠道', '销售渠道', 'dim', 36, [
          f('channel_id', '渠道ID', 'VARCHAR(16)', { pk: true, nn: true }),
          f('channel_name', '渠道名称', 'VARCHAR(32)', { nn: true }),
          f('channel_type', '渠道类型', 'VARCHAR(16)')
        ], [
          ['C-01', '官网商城', '线上'],
          ['C-02', '天猫旗舰店', '线上'],
          ['C-03', '直营门店', '线下']
        ]),
        tbl('region_dim', '销售区域', '销售区域维度', 'dim', 36, [
          f('region_code', '区域编码', 'VARCHAR(8)', { pk: true, nn: true }),
          f('region_name', '区域名称', 'VARCHAR(32)', { nn: true }),
          f('manager', '负责人', 'VARCHAR(32)')
        ], [
          ['EAST', '华东', '李华'],
          ['SOUTH', '华南', '王刚'],
          ['NORTH', '华北', '张敏']
        ])
      ]
    },
    {
      id: 'm_sales_item', name: '订单明细模型', code: 'sales_order_item_model',
      srcId: 's_sales_main', updatedAt: '2026-05-03',
      desc: '订单明细 + 产品 + 类目 + 价格策略，支撑商品销售分析。',
      tables: [
        tbl('sales_order_item', '订单明细', '销售订单明细', 'fact', 5400000, [
          f('item_id', '明细ID', 'BIGINT', { pk: true, nn: true }),
          f('order_id', '订单ID', 'BIGINT', { fk: true, nn: true }),
          f('product_id', '产品ID', 'BIGINT', { fk: true, nn: true }),
          f('price', '单价', 'DECIMAL(12,2)'),
          f('qty', '数量', 'INT'),
          f('discount', '折扣', 'DECIMAL(5,2)'),
          f('amount', '金额', 'DECIMAL(12,2)')
        ], [
          ['IT001', 'SO20260501001', 'P-301', 640.00, 2, 0.00, 1280.00],
          ['IT002', 'SO20260501002', 'P-205', 980.50, 1, 0.05, 931.48]
        ]),
        tbl('product', '产品', '产品维度', 'dim', 12000, [
          f('product_id', '产品ID', 'VARCHAR(16)', { pk: true, nn: true }),
          f('product_name', '产品名称', 'VARCHAR(64)', { nn: true }),
          f('category_id', '类目ID', 'VARCHAR(16)', { fk: true })
        ], [
          ['P-301', '智能音箱 Pro', 'CT-01'],
          ['P-205', '便携蓝牙耳机', 'CT-01']
        ]),
        tbl('product_category', '产品类目', '产品类目维度', 'dim', 320, [
          f('category_id', '类目ID', 'VARCHAR(16)', { pk: true, nn: true }),
          f('category_name', '类目名称', 'VARCHAR(32)', { nn: true }),
          f('parent_id', '上级类目', 'VARCHAR(16)')
        ], [
          ['CT-01', '电子产品', 'CT-00'],
          ['CT-02', '办公设备', 'CT-00']
        ])
      ]
    },
    {
      id: 'm_sales_channel', name: '销售渠道维度', code: 'channel_dim',
      srcId: 's_sales_main', updatedAt: '2026-04-29',
      desc: '销售渠道及渠道层级维度。',
      tables: [
        tbl('channel', '渠道', '销售渠道维度', 'dim', 36, [
          f('channel_id', '渠道ID', 'VARCHAR(16)', { pk: true, nn: true }),
          f('channel_name', '渠道名称', 'VARCHAR(32)', { nn: true }),
          f('channel_type', '渠道类型', 'VARCHAR(16)'),
          f('manager', '负责人', 'VARCHAR(32)')
        ], [
          ['C-01', '官网商城', '线上', '李华'],
          ['C-02', '天猫旗舰店', '线上', '王刚']
        ]),
        tbl('channel_level', '渠道层级', '渠道层级维度', 'dim', 12, [
          f('level_code', '层级编码', 'VARCHAR(8)', { pk: true, nn: true }),
          f('level_name', '层级名称', 'VARCHAR(32)', { nn: true })
        ], [
          ['L1', '一级渠道'],
          ['L2', '二级渠道']
        ])
      ]
    },
    {
      id: 'm_sales_region', name: '销售区域维度', code: 'region_dim',
      srcId: 's_sales_main', updatedAt: '2026-04-29',
      desc: '销售区域、城市层级维度。',
      tables: [
        tbl('region_dim', '销售区域', '销售区域维度', 'dim', 36, [
          f('region_code', '区域编码', 'VARCHAR(8)', { pk: true, nn: true }),
          f('region_name', '区域名称', 'VARCHAR(32)', { nn: true }),
          f('manager', '负责人', 'VARCHAR(32)')
        ], [
          ['EAST', '华东', '李华'],
          ['SOUTH', '华南', '王刚']
        ]),
        tbl('city_dim', '城市', '城市维度', 'dim', 380, [
          f('city_code', '城市编码', 'VARCHAR(8)', { pk: true, nn: true }),
          f('city_name', '城市名称', 'VARCHAR(32)', { nn: true }),
          f('region_code', '所属区域', 'VARCHAR(8)', { fk: true })
        ], [
          ['SH', '上海', 'EAST'],
          ['GZ', '广州', 'SOUTH']
        ])
      ]
    },
    {
      id: 'm_pay_order', name: '支付订单模型', code: 'pay_order_model',
      srcId: 's_order_svc', updatedAt: '2026-05-02',
      desc: '订单支付流水 + 支付渠道，用于支付分析与对账。',
      tables: [
        tbl('order_pay', '订单支付', '订单支付流水', 'fact', 3800000, [
          f('pay_id', '支付ID', 'BIGINT', { pk: true, nn: true }),
          f('order_id', '订单ID', 'BIGINT', { fk: true, nn: true }),
          f('pay_channel', '支付渠道', 'VARCHAR(16)', { fk: true }),
          f('pay_amount', '支付金额', 'DECIMAL(12,2)'),
          f('pay_time', '支付时间', 'DATETIME'),
          f('status', '状态', 'VARCHAR(16)')
        ], [
          ['PAY001', 'SO20260501001', 'WX', 1280.00, '2026-05-01 10:21', 'SUCCESS'],
          ['PAY002', 'SO20260501002', 'ALIPAY', 980.50, '2026-05-01 11:05', 'SUCCESS']
        ]),
        tbl('pay_channel_dim', '支付渠道', '支付渠道维度', 'dim', 24, [
          f('channel_code', '渠道编码', 'VARCHAR(16)', { pk: true, nn: true }),
          f('channel_name', '渠道名称', 'VARCHAR(32)', { nn: true })
        ], [
          ['WX', '微信支付'],
          ['ALIPAY', '支付宝']
        ])
      ]
    },
    {
      id: 'm_refund', name: '退款单模型', code: 'refund_model',
      srcId: 's_order_svc', updatedAt: '2026-04-22',
      desc: '售后退款单与原因分类，用于售后分析。',
      tables: [
        tbl('refund', '退款单', '订单退款主表', 'fact', 280000, [
          f('refund_id', '退款单ID', 'BIGINT', { pk: true, nn: true }),
          f('order_id', '原订单ID', 'BIGINT', { fk: true, nn: true }),
          f('reason_code', '原因编码', 'VARCHAR(16)', { fk: true }),
          f('refund_amount', '退款金额', 'DECIMAL(12,2)'),
          f('refund_time', '退款时间', 'DATETIME'),
          f('status', '状态', 'VARCHAR(16)')
        ], [
          ['RF001', 'SO20260501001', 'R001', 200.00, '2026-05-04 09:21', 'DONE']
        ]),
        tbl('refund_reason', '退款原因', '退款原因维度', 'dim', 36, [
          f('reason_code', '原因编码', 'VARCHAR(16)', { pk: true, nn: true }),
          f('reason_name', '原因名称', 'VARCHAR(32)', { nn: true }),
          f('category', '类别', 'VARCHAR(16)')
        ], [
          ['R001', '商品质量问题', '质量'],
          ['R002', '尺码不合适', '商品']
        ])
      ]
    },

    // ============== 客户 ==============
    {
      id: 'm_customer', name: '客户主数据模型', code: 'customer_master',
      srcId: 's_cdw', updatedAt: '2026-05-05',
      desc: '客户主数据 + 联系人 + 地址 + 行业，统一客户视图。',
      tables: [
        tbl('customer', '客户', '客户主表', 'dim', 860000, [
          f('customer_id', '客户ID', 'BIGINT', { pk: true, nn: true }),
          f('customer_name', '客户名称', 'VARCHAR(64)', { nn: true }),
          f('industry', '行业', 'VARCHAR(32)'),
          f('register_date', '注册日期', 'DATE')
        ], [
          [1001, 'A 科技公司', '科技', '2024-03-12'],
          [1002, 'B 贸易公司', '贸易', '2024-05-20']
        ]),
        tbl('contact', '联系人', '客户联系人', 'dim', 1240000, [
          f('contact_id', '联系人ID', 'BIGINT', { pk: true, nn: true }),
          f('customer_id', '客户ID', 'BIGINT', { fk: true, nn: true }),
          f('name', '姓名', 'VARCHAR(32)'),
          f('phone', '电话', 'VARCHAR(20)'),
          f('email', '邮箱', 'VARCHAR(64)')
        ], [
          [200001, 1001, '张先生', '13800001111', 'zhang@a.com']
        ]),
        tbl('address', '地址', '客户收货地址', 'dim', 1860000, [
          f('addr_id', '地址ID', 'BIGINT', { pk: true, nn: true }),
          f('customer_id', '客户ID', 'BIGINT', { fk: true, nn: true }),
          f('province', '省份', 'VARCHAR(16)'),
          f('city', '城市', 'VARCHAR(16)'),
          f('detail', '详细地址', 'VARCHAR(128)')
        ], [
          [300001, 1001, '上海', '上海', '徐汇区漕溪北路']
        ])
      ]
    },
    {
      id: 'm_customer_tag', name: '客户标签模型', code: 'customer_tag_model',
      srcId: 's_cdw', updatedAt: '2026-04-30',
      desc: '客户与标签的多对多关系，支持标签洞察。',
      tables: [
        tbl('customer_tag', '客户标签', '客户标签桥接表', 'bridge', 5600000, [
          f('customer_id', '客户ID', 'BIGINT', { pk: true, fk: true, nn: true }),
          f('tag_code', '标签编码', 'VARCHAR(32)', { pk: true, nn: true }),
          f('tag_value', '标签值', 'VARCHAR(64)')
        ], [
          [1001, 'GMV_LEVEL', 'TOP10'],
          [1002, 'INDUSTRY', '贸易']
        ]),
        tbl('tag_dim', '标签字典', '标签字典维度', 'dim', 280, [
          f('tag_code', '标签编码', 'VARCHAR(32)', { pk: true, nn: true }),
          f('tag_name', '标签名称', 'VARCHAR(64)', { nn: true }),
          f('category', '标签类别', 'VARCHAR(32)')
        ], [
          ['GMV_LEVEL', 'GMV 等级', '价值'],
          ['INDUSTRY', '行业', '基础']
        ])
      ]
    },
    {
      id: 'm_customer_segment', name: '客户分群模型', code: 'customer_segment_model',
      srcId: 's_cdw', updatedAt: '2026-04-25',
      desc: '客户分群结果与分群定义。',
      tables: [
        tbl('customer_segment', '客户分群', '客户分群结果', 'fact', 860000, [
          f('customer_id', '客户ID', 'BIGINT', { pk: true, fk: true, nn: true }),
          f('segment_id', '分群ID', 'VARCHAR(16)', { pk: true, nn: true }),
          f('score', '匹配分', 'DECIMAL(5,2)')
        ], [
          [1001, 'SEG_VIP', 92.50],
          [1002, 'SEG_NEW', 78.00]
        ]),
        tbl('segment_dim', '分群字典', '分群定义', 'dim', 32, [
          f('segment_id', '分群ID', 'VARCHAR(16)', { pk: true, nn: true }),
          f('segment_name', '分群名称', 'VARCHAR(32)', { nn: true }),
          f('description', '描述', 'VARCHAR(255)')
        ], [
          ['SEG_VIP', '高价值客户', 'GMV 排名前 10%'],
          ['SEG_NEW', '新客户', '近 30 天注册']
        ])
      ]
    },
    {
      id: 'm_customer_journey', name: '客户旅程模型', code: 'customer_journey_model',
      srcId: 's_cdw', updatedAt: '2026-04-18',
      desc: '客户阶段、行为事件、触点与活动响应。',
      tables: [
        tbl('journey_event', '旅程事件', '客户行为事件', 'fact', 9800000, [
          f('event_id', '事件ID', 'BIGINT', { pk: true, nn: true }),
          f('customer_id', '客户ID', 'BIGINT', { fk: true, nn: true }),
          f('event_type', '事件类型', 'VARCHAR(32)'),
          f('event_time', '事件时间', 'DATETIME'),
          f('channel', '触点', 'VARCHAR(16)')
        ], [
          [1, 1001, 'VISIT', '2026-05-01 09:01', 'WEB'],
          [2, 1001, 'PAY', '2026-05-01 10:21', 'WEB']
        ]),
        tbl('journey_stage', '旅程阶段', '阶段维度', 'dim', 12, [
          f('stage_code', '阶段编码', 'VARCHAR(16)', { pk: true, nn: true }),
          f('stage_name', '阶段名称', 'VARCHAR(32)', { nn: true })
        ], [
          ['AWARE', '认知'],
          ['CONVERT', '转化']
        ])
      ]
    },

    // ============== 财务 ==============
    {
      id: 'm_ar', name: '应收账款模型', code: 'ar_model',
      srcId: 's_finance', updatedAt: '2026-05-01',
      desc: '应收账款主表 + 客户 + 账期定义。',
      tables: [
        tbl('ar_invoice', '应收发票', '应收发票流水', 'fact', 480000, [
          f('inv_id', '发票ID', 'BIGINT', { pk: true, nn: true }),
          f('customer_id', '客户ID', 'BIGINT', { fk: true, nn: true }),
          f('amount', '金额', 'DECIMAL(14,2)'),
          f('due_date', '到期日', 'DATE'),
          f('status', '状态', 'VARCHAR(16)')
        ], [
          ['AR001', 1001, 12800.00, '2026-06-01', 'OPEN']
        ]),
        tbl('aging_bucket', '账期', '账期维度', 'dim', 8, [
          f('bucket_code', '账期编码', 'VARCHAR(8)', { pk: true, nn: true }),
          f('bucket_name', '账期名称', 'VARCHAR(16)', { nn: true })
        ], [
          ['B30', '0-30 天'],
          ['B60', '31-60 天']
        ])
      ]
    },
    {
      id: 'm_ap', name: '应付账款模型', code: 'ap_model',
      srcId: 's_finance', updatedAt: '2026-04-28',
      desc: '应付账款主表 + 供应商 + 付款计划。',
      tables: [
        tbl('ap_invoice', '应付发票', '应付发票流水', 'fact', 320000, [
          f('inv_id', '发票ID', 'BIGINT', { pk: true, nn: true }),
          f('supplier_id', '供应商ID', 'BIGINT', { fk: true, nn: true }),
          f('amount', '金额', 'DECIMAL(14,2)'),
          f('due_date', '到期日', 'DATE')
        ], [
          ['AP001', 5001, 26000.00, '2026-05-30']
        ]),
        tbl('supplier', '供应商', '供应商维度', 'dim', 5600, [
          f('supplier_id', '供应商ID', 'BIGINT', { pk: true, nn: true }),
          f('supplier_name', '供应商名称', 'VARCHAR(64)', { nn: true })
        ], [
          [5001, '甲供应公司']
        ])
      ]
    },
    {
      id: 'm_gl', name: '总账明细模型', code: 'gl_detail_model',
      srcId: 's_finance', updatedAt: '2026-05-03',
      desc: '总账分录、科目、组织、项目、币种。',
      tables: [
        tbl('gl_entry', '总账分录', '总账明细', 'fact', 12000000, [
          f('entry_id', '分录ID', 'BIGINT', { pk: true, nn: true }),
          f('account_code', '科目编码', 'VARCHAR(32)', { fk: true, nn: true }),
          f('debit', '借方', 'DECIMAL(16,2)'),
          f('credit', '贷方', 'DECIMAL(16,2)'),
          f('post_date', '过账日期', 'DATE')
        ], [
          ['E001', '1001', 1200.00, 0.00, '2026-05-01']
        ]),
        tbl('account', '会计科目', '科目维度', 'dim', 800, [
          f('account_code', '科目编码', 'VARCHAR(32)', { pk: true, nn: true }),
          f('account_name', '科目名称', 'VARCHAR(64)', { nn: true })
        ], [
          ['1001', '库存现金']
        ])
      ]
    },

    // ============== 供应链 ==============
    {
      id: 'm_inventory', name: '库存余额模型', code: 'inventory_balance',
      srcId: 's_inventory', updatedAt: '2026-05-04',
      desc: '库存余额快照 + 仓库 + 物料。',
      tables: [
        tbl('inv_balance', '库存余额', '库存余额', 'fact', 680000, [
          f('warehouse_id', '仓库ID', 'VARCHAR(16)', { pk: true, fk: true, nn: true }),
          f('item_id', '物料ID', 'VARCHAR(16)', { pk: true, fk: true, nn: true }),
          f('qty', '数量', 'DECIMAL(14,2)'),
          f('snap_date', '快照日期', 'DATE', { pk: true, nn: true })
        ], [
          ['WH-001', 'M-100', 1200.00, '2026-05-04']
        ]),
        tbl('warehouse', '仓库', '仓库维度', 'dim', 120, [
          f('warehouse_id', '仓库ID', 'VARCHAR(16)', { pk: true, nn: true }),
          f('warehouse_name', '仓库名称', 'VARCHAR(32)', { nn: true }),
          f('region', '所属区域', 'VARCHAR(32)')
        ], [
          ['WH-001', '上海中心仓', '华东']
        ]),
        tbl('item', '物料', '物料维度', 'dim', 16000, [
          f('item_id', '物料ID', 'VARCHAR(16)', { pk: true, nn: true }),
          f('item_name', '物料名称', 'VARCHAR(64)', { nn: true }),
          f('category', '类目', 'VARCHAR(32)')
        ], [
          ['M-100', '原材料 A', '原料']
        ])
      ]
    },
    {
      id: 'm_inv_move', name: '库存动账模型', code: 'inventory_move',
      srcId: 's_inventory', updatedAt: '2026-04-30',
      desc: '出入库流水 + 业务类型。',
      tables: [
        tbl('inv_move', '库存动账', '出入库流水', 'fact', 4800000, [
          f('move_id', '动账ID', 'BIGINT', { pk: true, nn: true }),
          f('warehouse_id', '仓库ID', 'VARCHAR(16)', { fk: true, nn: true }),
          f('item_id', '物料ID', 'VARCHAR(16)', { fk: true, nn: true }),
          f('qty', '数量', 'DECIMAL(14,2)'),
          f('biz_type', '业务类型', 'VARCHAR(16)'),
          f('move_time', '时间', 'DATETIME')
        ], [
          ['MV001', 'WH-001', 'M-100', 100.00, 'IN', '2026-05-01 09:00']
        ]),
        tbl('biz_type', '业务类型', '业务类型维度', 'dim', 16, [
          f('biz_code', '编码', 'VARCHAR(16)', { pk: true, nn: true }),
          f('biz_name', '名称', 'VARCHAR(32)', { nn: true })
        ], [
          ['IN', '入库'],
          ['OUT', '出库']
        ])
      ]
    },
    {
      id: 'm_purchase', name: '采购订单模型', code: 'purchase_order',
      srcId: 's_inventory', updatedAt: '2026-04-26',
      desc: '采购订单 + 供应商 + 物料。',
      tables: [
        tbl('po', '采购订单', '采购订单主表', 'fact', 240000, [
          f('po_id', '采购单ID', 'BIGINT', { pk: true, nn: true }),
          f('supplier_id', '供应商ID', 'BIGINT', { fk: true, nn: true }),
          f('total_amount', '总金额', 'DECIMAL(14,2)'),
          f('po_date', '下单日期', 'DATE'),
          f('status', '状态', 'VARCHAR(16)')
        ], [
          ['PO001', 5001, 38000.00, '2026-04-20', 'DONE']
        ]),
        tbl('po_item', '采购明细', '采购订单明细', 'fact', 980000, [
          f('po_item_id', '明细ID', 'BIGINT', { pk: true, nn: true }),
          f('po_id', '采购单ID', 'BIGINT', { fk: true, nn: true }),
          f('item_id', '物料ID', 'VARCHAR(16)', { fk: true, nn: true }),
          f('qty', '数量', 'DECIMAL(14,2)'),
          f('price', '单价', 'DECIMAL(14,2)')
        ], [
          ['PI001', 'PO001', 'M-100', 200.00, 190.00]
        ])
      ]
    },
    {
      id: 'm_logistics', name: '物流配送模型', code: 'logistics_model',
      srcId: 's_logistics', updatedAt: '2026-05-02',
      desc: '运单 + 承运商 + 配送站点 + 时效。',
      tables: [
        tbl('shipment', '运单', '物流运单', 'fact', 1800000, [
          f('shipment_id', '运单号', 'VARCHAR(32)', { pk: true, nn: true }),
          f('order_id', '订单ID', 'BIGINT', { fk: true, nn: true }),
          f('carrier_code', '承运商', 'VARCHAR(16)', { fk: true }),
          f('ship_time', '发出时间', 'DATETIME'),
          f('arrive_time', '到达时间', 'DATETIME'),
          f('status', '状态', 'VARCHAR(16)')
        ], [
          ['SH001', 'SO20260501001', 'SF', '2026-05-01 14:00', '2026-05-02 11:00', 'DELIVERED']
        ]),
        tbl('carrier', '承运商', '承运商维度', 'dim', 32, [
          f('carrier_code', '编码', 'VARCHAR(16)', { pk: true, nn: true }),
          f('carrier_name', '名称', 'VARCHAR(32)', { nn: true })
        ], [
          ['SF', '顺丰速运'],
          ['JD', '京东物流']
        ])
      ]
    }
  ];

  // ---- 统一从 tables 派生表数 / 字段数（保证表格列与抽屉展示一致） ----
  MODELS.forEach(function (m) {
    m.tables = m.tables || [];
    m.tableCount = m.tables.length;
    m.fieldCount = m.tables.reduce(function (sum, t) {
      return sum + (t.fields ? t.fields.length : 0);
    }, 0);
  });

  var INDICATOR_GROUPS = [
    { id: 'g_revenue', name: '收入指标', children: [
      { id: 'g_rev_sale', name: '销售收入' },
      { id: 'g_rev_service', name: '服务收入' }
    ]},
    { id: 'g_customer_metric', name: '客户指标', children: [
      { id: 'g_cust_growth', name: '客户增长' },
      { id: 'g_cust_value', name: '客户价值' }
    ]},
    { id: 'g_inventory_metric', name: '供应链指标', children: [
      { id: 'g_inv_eff', name: '库存效率' },
      { id: 'g_logistics_eff', name: '物流履约' }
    ]},
    { id: 'g_finance_metric', name: '财务指标', children: [
      { id: 'g_ar_ap', name: '应收应付' },
      { id: 'g_profit', name: '利润分析' }
    ]}
  ];

  var INDICATORS = [
    { id: 'i_sales_amount', groupId: 'g_rev_sale', type: 'atom', name: '销售额', synonyms: '销售收入,成交金额,GMV', desc: '订单实付金额合计。', srcId: 's_sales_main', table: 'sales_order', field: 'sales_amount', agg: 'SUM', unit: '元', updatedAt: '2026-05-04' },
    { id: 'i_order_count', groupId: 'g_rev_sale', type: 'atom', name: '订单量', synonyms: '订单数,成交单数', desc: '已支付订单数量。', srcId: 's_order_svc', table: 'order_pay', field: 'order_id', agg: 'COUNT_DISTINCT', unit: '单', updatedAt: '2026-05-03' },
    { id: 'i_customer_count', groupId: 'g_cust_growth', type: 'atom', name: '成交客户数', synonyms: '购买客户,支付客户', desc: '发生支付行为的去重客户数。', srcId: 's_cdw', table: 'customer_event', field: 'customer_id', agg: 'COUNT_DISTINCT', unit: '人', updatedAt: '2026-05-02' },
    { id: 'i_new_customer', groupId: 'g_cust_growth', type: 'atom', name: '新增客户数', synonyms: '新客数,新增会员', desc: '统计周期内首次注册或首次成交客户数。', srcId: 's_cdw', table: 'customer', field: 'customer_id', agg: 'COUNT_DISTINCT', unit: '人', updatedAt: '2026-04-30' },
    { id: 'i_inventory_amount', groupId: 'g_inv_eff', type: 'atom', name: '库存金额', synonyms: '库存余额,存货金额', desc: '期末库存数量乘以成本价。', srcId: 's_inventory', table: 'inventory_balance', field: 'stock_amount', agg: 'SUM', unit: '元', updatedAt: '2026-04-29' },
    { id: 'i_delivery_rate', groupId: 'g_logistics_eff', type: 'atom', name: '准时履约率', synonyms: '准时发货率,准时送达率', desc: '准时履约订单数 / 应履约订单数。', srcId: 's_logistics', table: 'logistics_order', field: 'on_time_flag', agg: 'AVG', unit: '%', updatedAt: '2026-04-28' },
    { id: 'i_receivable_amount', groupId: 'g_ar_ap', type: 'atom', name: '应收余额', synonyms: '应收账款余额,AR余额', desc: '当前未核销应收金额。', srcId: 's_finance', table: 'ar_balance', field: 'balance_amount', agg: 'SUM', unit: '元', updatedAt: '2026-04-27' },
    { id: 'i_profit_amount', groupId: 'g_profit', type: 'atom', name: '毛利额', synonyms: '毛利润,销售毛利', desc: '销售额扣减销售成本后的金额。', srcId: 's_finance', table: 'profit_detail', field: 'gross_profit', agg: 'SUM', unit: '元', updatedAt: '2026-04-26' },
    { id: 'i_avg_order_value', groupId: 'g_cust_value', type: 'derived', name: '客单价', synonyms: 'AOV,平均订单金额', desc: '销售额 / 订单量。', srcId: 's_sales_main', formula: '销售额 / 订单量', unit: '元', updatedAt: '2026-05-05' },
    { id: 'i_repurchase_rate', groupId: 'g_cust_value', type: 'derived', name: '复购率', synonyms: '重复购买率,老客复购', desc: '复购客户数 / 成交客户数。', srcId: 's_cdw', formula: '复购客户数 / 成交客户数', unit: '%', updatedAt: '2026-05-01' }
  ];

  // 分析主题（含 modelIds / indicatorIds 引用）
  var THEMES = [
    {
      id: 'th_sales', name: '销售分析',
      desc: '覆盖销售额、订单量、渠道转化、区域业绩、产品销售等核心经营指标，支撑销售管理层日常经营复盘。',
      modelIds: ['m_sales_order', 'm_sales_item', 'm_sales_channel', 'm_customer', 'm_pay_order'],
      indicatorIds: ['i_sales_amount', 'i_order_count', 'i_customer_count', 'i_avg_order_value']
    },
    {
      id: 'th_customer', name: '客户分析',
      desc: '客户新增、复购、价值分层、流失预警等经营主题，结合客户标签与分群进行洞察。',
      modelIds: ['m_customer', 'm_customer_tag', 'm_customer_segment', 'm_customer_journey'],
      indicatorIds: ['i_customer_count', 'i_new_customer', 'i_repurchase_rate', 'i_avg_order_value']
    },
    {
      id: 'th_inventory', name: '库存分析',
      desc: '库存金额、周转天数、滞销品、缺货风险与采购建议，支撑供应链与运营决策。',
      modelIds: ['m_inventory', 'm_inv_move', 'm_purchase', 'm_logistics'],
      indicatorIds: ['i_inventory_amount', 'i_delivery_rate']
    },
    {
      id: 'th_finance', name: '财务分析',
      desc: '应收应付动态、回款风险、账期结构、损益和总账明细分析。',
      modelIds: ['m_ar', 'm_ap', 'm_gl'],
      indicatorIds: ['i_receivable_amount', 'i_profit_amount']
    },
    {
      id: 'th_marketing', name: '营销活动分析',
      desc: '活动触达人数、订单转化、ROI、券核销与人群效率，对接销售与客户主题。',
      modelIds: ['m_sales_order', 'm_customer_segment', 'm_customer_tag'],
      indicatorIds: ['i_sales_amount', 'i_customer_count', 'i_repurchase_rate']
    }
  ];

  // ---------- 2) 通用工具 ----------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function findThemeById(id) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === id) return THEMES[i];
    }
    return null;
  }

  function findModelById(id) {
    for (var i = 0; i < MODELS.length; i++) {
      if (MODELS[i].id === id) return MODELS[i];
    }
    return null;
  }

  function findSourceById(id) {
    for (var i = 0; i < DOMAINS.length; i++) {
      var srcs = DOMAINS[i].sources;
      for (var j = 0; j < srcs.length; j++) {
        if (srcs[j].id === id) return { domain: DOMAINS[i], source: srcs[j] };
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

  function indicatorTypeText(type) {
    return type === 'atom' ? '原子指标' : type === 'derived' ? '衍生指标' : '-';
  }

  function indicatorFormulaText(it) {
    if (!it) return '-';
    if (it.type === 'derived') return it.formula || it.desc || '-';
    var agg = it.agg || 'SUM';
    var field = it.field || '-';
    return agg + '(' + field + ')';
  }

  function indicatorGroupName(id) {
    for (var i = 0; i < INDICATOR_GROUPS.length; i++) {
      var g = INDICATOR_GROUPS[i];
      if (g.id === id) return g.name;
      var children = g.children || [];
      for (var j = 0; j < children.length; j++) {
        if (children[j].id === id) return children[j].name;
      }
    }
    return '';
  }

  function nameInitials(name) {
    if (!name) return 'M';
    var s = String(name).trim();
    return s.length >= 2 ? s.substr(0, 1) : s.substr(0, 1);
  }

  function uid(prefix) {
    return prefix + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  }

  // ---------- 3) 状态 ----------
  var state = {
    activeThemeId: THEMES[0] ? THEMES[0].id : null,
    activeRelationTab: 'models',
    themeKeyword: '',
    modelKeyword: '',
    modelSrcFilter: '',
    indicatorKeyword: '',
    indicatorTypeFilter: '',
    ctxThemeId: null,
    pickerSelected: {},     // 弹窗内选中的 modelId 集合（不含已添加）
    pickerActiveSrc: '',    // 当前选中的数据源 id
    pickerSourceKw: '',
    pickerModelKw: '',
    indicatorPickerSelected: {},
    indicatorPickerActiveGroup: '',
    indicatorPickerGroupKw: '',
    indicatorPickerKw: '',
    editingThemeId: null,   // 表单弹窗：null=新建，否则=编辑
    activeModelId: null,    // 抽屉中正在查看的模型
    drawerActiveTab: 'schema',
    drawerActiveTableIdx: 0
  };

  // ---------- 4) 渲染 - 左侧主题列表 ----------
  function renderThemeList() {
    var list = $('#atThemeList');
    if (!list) return;
    var kw = (state.themeKeyword || '').trim().toLowerCase();
    var filtered = THEMES.filter(function (t) {
      if (!kw) return true;
      return (t.name || '').toLowerCase().indexOf(kw) >= 0;
    });

    if (!filtered.length) {
      list.innerHTML = ''
        + '<div class="at-empty">'
        +   '<div class="at-empty-ico"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></div>'
        +   '没有匹配的分析主题'
        + '</div>';
      return;
    }

    list.innerHTML = filtered.map(function (t) {
      var active = t.id === state.activeThemeId ? ' is-active' : '';
      var cnt = (t.modelIds || []).length + (t.indicatorIds || []).length;
      return ''
        + '<div class="at-theme-item' + active + '" draggable="true" data-id="' + escapeHTML(t.id) + '" oncontextmenu="return false;">'
        +   '<span class="at-drag" title="拖动排序"><svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg></span>'
        +   '<span class="at-th-name">' + escapeHTML(t.name) + '</span>'
        +   '<span class="at-th-count">' + cnt + '</span>'
        + '</div>';
    }).join('');
  }

  // ---------- 5) 渲染 - 右侧：当前主题信息 ----------
  function renderDetail() {
    var card = $('#atDetailCard');
    if (!card) return;
    var t = findThemeById(state.activeThemeId);
    if (!t) {
      card.innerHTML = ''
        + '<div class="at-detail-meta">'
        +   '<h2>未选择主题</h2>'
        +   '<p>请在左侧选择或新建一个分析主题。</p>'
        + '</div>';
      return;
    }
    var mids = t.modelIds || [];
    var iids = t.indicatorIds || [];
    var srcSet = {};
    var fieldSum = 0;
    var tableSum = 0;
    mids.forEach(function (id) {
      var m = findModelById(id);
      if (!m) return;
      srcSet[m.srcId] = true;
      fieldSum += (m.fieldCount || 0);
      tableSum += (m.tableCount || 0);
    });
    iids.forEach(function (id) {
      var it = findIndicatorById(id);
      if (it && it.srcId) srcSet[it.srcId] = true;
    });
    var srcCnt = Object.keys(srcSet).length;

    var enabled = t.status !== 'disabled';
    var badgeCls = enabled ? 'at-detail-badge is-on' : 'at-detail-badge is-off';
    var badgeText = enabled ? '已启用' : '已禁用';
    var badgeIcon = enabled
      ? '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>'
      : '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>';

    card.innerHTML = ''
      + '<div class="at-detail-meta">'
      +   '<h2>' + escapeHTML(t.name)
      +     '<button type="button" class="' + badgeCls + '" data-act="toggle-status" title="点击切换启用 / 禁用状态">'
      +       '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" style="fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;">'
      +         badgeIcon
      +       '</svg>'
      +       badgeText
      +     '</button>'
      +   '</h2>'
      +   '<p>' + escapeHTML(t.desc || '') + '</p>'
      + '</div>'
      + '<div class="at-detail-stats">'
      +   '<div class="at-stat"><strong>' + mids.length + '</strong><span>数据模型</span></div>'
      +   '<div class="at-stat"><strong>' + iids.length + '</strong><span>指标</span></div>'
      +   '<div class="at-stat"><strong>' + srcCnt + '</strong><span>数据源</span></div>'
      +   '<div class="at-stat"><strong>' + fieldSum + '</strong><span>字段</span></div>'
      + '</div>';
  }

  function renderRelationTabs() {
    var t = findThemeById(state.activeThemeId);
    var modelCount = t ? (t.modelIds || []).length : 0;
    var indicatorCount = t ? (t.indicatorIds || []).length : 0;
    var mt = $('#atModelsTabCount'); if (mt) mt.textContent = String(modelCount);
    var it = $('#atIndicatorsTabCount'); if (it) it.textContent = String(indicatorCount);
    $$('.at-tab').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-tab') === state.activeRelationTab);
    });
    $$('.at-tab-panel').forEach(function (panel) {
      panel.classList.toggle('is-active', panel.getAttribute('data-panel') === state.activeRelationTab);
    });
  }

  // ---------- 6) 渲染 - 关联数据模型表 ----------
  function renderModels() {
    var tbody = $('#atModelsTbody');
    var cntEl = $('#atModelsCount');
    var srcSel = $('#atModelFilterSrc');
    if (!tbody) return;
    var t = findThemeById(state.activeThemeId);
    var mids = t ? (t.modelIds || []) : [];
    var modelsAll = mids.map(findModelById).filter(Boolean);

    // 数据源筛选下拉
    if (srcSel) {
      var present = {};
      modelsAll.forEach(function (m) { present[m.srcId] = true; });
      var opts = ['<option value="">全部数据源</option>'];
      Object.keys(present).forEach(function (sid) {
        var found = findSourceById(sid);
        if (found) {
          var sel = state.modelSrcFilter === sid ? ' selected' : '';
          opts.push('<option value="' + escapeHTML(sid) + '"' + sel + '>' + escapeHTML(found.source.name) + '</option>');
        }
      });
      srcSel.innerHTML = opts.join('');
    }

    var kw = (state.modelKeyword || '').trim().toLowerCase();
    var rows = modelsAll.filter(function (m) {
      if (state.modelSrcFilter && m.srcId !== state.modelSrcFilter) return false;
      if (!kw) return true;
      var found = findSourceById(m.srcId);
      var srcName = found ? found.source.name.toLowerCase() : '';
      return (m.name || '').toLowerCase().indexOf(kw) >= 0
          || (m.code || '').toLowerCase().indexOf(kw) >= 0
          || srcName.indexOf(kw) >= 0;
    });

    if (cntEl) cntEl.textContent = String(rows.length) + (rows.length !== modelsAll.length ? ' / ' + modelsAll.length : '');
    renderRelationTabs();

    if (!rows.length) {
      tbody.innerHTML = ''
        + '<tr><td colspan="5">'
        +   '<div class="at-empty">'
        +     '<div class="at-empty-ico"><svg viewBox="0 0 24 24"><ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5V12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5.5"/><path d="M5 12v6.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V12"/></svg></div>'
        +     (modelsAll.length === 0 ? '该主题尚未关联任何数据模型，点击右上角"添加"开始绑定' : '没有匹配的数据模型')
        +   '</div>'
        + '</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (m) {
      var found = findSourceById(m.srcId);
      var srcName = found ? found.source.name : '-';
      var srcType = found ? found.source.type : '';
      var active = state.activeModelId === m.id ? ' is-active' : '';
      return ''
        + '<tr data-mid="' + escapeHTML(m.id) + '" class="at-model-row' + active + '">'
        +   '<td>'
        +     '<div class="at-mname is-clickable" data-act="open-model" data-mid="' + escapeHTML(m.id) + '" title="点击查看模型详情">'
        +       '<span class="at-mname-ico">' + escapeHTML(nameInitials(m.name)) + '</span>'
        +       '<div class="at-mname-text">'
        +         '<strong>' + escapeHTML(m.name) + '</strong>'
        +         '<span>' + escapeHTML(m.code || '') + '</span>'
        +       '</div>'
        +     '</div>'
        +   '</td>'
        +   '<td><span class="at-src-chip" title="' + escapeHTML(srcType) + '">' + escapeHTML(srcName) + '</span></td>'
        +   '<td>' + (m.fieldCount || 0) + '</td>'
        +   '<td style="color:#64748b;">' + escapeHTML(m.updatedAt || '') + '</td>'
        +   '<td>'
        +     '<div class="at-row-act">'
        +       '<button type="button" class="at-icon-btn" title="移除关联" data-act="remove-model" data-mid="' + escapeHTML(m.id) + '">'
        +         '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>'
        +       '</button>'
        +     '</div>'
        +   '</td>'
        + '</tr>';
    }).join('');
  }

  function renderIndicators() {
    var tbody = $('#atIndicatorsTbody');
    var cntEl = $('#atIndicatorsCount');
    if (!tbody) return;
    var t = findThemeById(state.activeThemeId);
    var ids = t ? (t.indicatorIds || []) : [];
    var indicatorsAll = ids.map(findIndicatorById).filter(Boolean);
    var kw = (state.indicatorKeyword || '').trim().toLowerCase();
    var rows = indicatorsAll.filter(function (it) {
      if (state.indicatorTypeFilter && it.type !== state.indicatorTypeFilter) return false;
      if (!kw) return true;
      var found = findSourceById(it.srcId);
      var srcName = found ? found.source.name.toLowerCase() : '';
      return (it.name || '').toLowerCase().indexOf(kw) >= 0
        || (it.synonyms || '').toLowerCase().indexOf(kw) >= 0
        || srcName.indexOf(kw) >= 0;
    });

    if (cntEl) cntEl.textContent = String(rows.length) + (rows.length !== indicatorsAll.length ? ' / ' + indicatorsAll.length : '');
    renderRelationTabs();

    if (!rows.length) {
      tbody.innerHTML = ''
        + '<tr><td colspan="6">'
        +   '<div class="at-empty">'
        +     '<div class="at-empty-ico"><svg viewBox="0 0 24 24"><path d="M4 19h16"/><path d="M7 16V8"/><path d="M12 16V5"/><path d="M17 16v-6"/></svg></div>'
        +     (indicatorsAll.length === 0 ? '该主题尚未关联任何指标，点击右上角"添加"开始绑定' : '没有匹配的指标')
        +   '</div>'
        + '</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(function (it) {
      var found = findSourceById(it.srcId);
      var srcName = found ? found.source.name : '-';
      var srcType = found ? found.source.type : '';
      var typeCls = it.type === 'derived' ? ' is-derived' : '';
      var formula = indicatorFormulaText(it);
      return ''
        + '<tr data-iid="' + escapeHTML(it.id) + '">'
        +   '<td>'
        +     '<div class="at-mname">'
        +       '<span class="at-mname-ico">' + escapeHTML(nameInitials(it.name)) + '</span>'
        +       '<div class="at-mname-text">'
        +         '<strong>' + escapeHTML(it.name) + '</strong>'
        +         '<span>' + escapeHTML(it.synonyms || indicatorGroupName(it.groupId) || '') + '</span>'
        +       '</div>'
        +     '</div>'
        +   '</td>'
        +   '<td><span class="at-type-chip' + typeCls + '">' + indicatorTypeText(it.type) + '</span></td>'
        +   '<td><span class="at-src-chip" title="' + escapeHTML(srcType) + '">' + escapeHTML(srcName) + '</span></td>'
        +   '<td><div class="at-formula-cell" title="' + escapeHTML(formula) + '">' + escapeHTML(formula) + '</div></td>'
        +   '<td style="color:#64748b;">' + escapeHTML(it.updatedAt || '') + '</td>'
        +   '<td>'
        +     '<div class="at-row-act">'
        +       '<button type="button" class="at-icon-btn" title="移除关联" data-act="remove-indicator" data-iid="' + escapeHTML(it.id) + '">'
        +         '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>'
        +       '</button>'
        +     '</div>'
        +   '</td>'
        + '</tr>';
    }).join('');
  }

  // ---------- 6.5) 模型详情抽屉（参考"数据模型-右侧表抽屉"风格） ----------
  function openModelDrawer(mid) {
    var m = findModelById(mid);
    if (!m) return;
    state.activeModelId = mid;
    state.drawerActiveTab = state.drawerActiveTab || 'schema';
    state.drawerActiveTableIdx = 0;

    var drawer = $('#atModelDrawer');
    var mask = $('#atModelDrawerMask');
    if (!drawer || !mask) return;

    drawer.classList.remove('hidden');
    mask.classList.remove('hidden');
    drawer.setAttribute('aria-hidden', 'false');

    renderModelDrawer();
    // 高亮当前行
    renderModels();
  }

  function closeModelDrawer() {
    var drawer = $('#atModelDrawer');
    var mask = $('#atModelDrawerMask');
    if (drawer) { drawer.classList.add('hidden'); drawer.setAttribute('aria-hidden', 'true'); }
    if (mask) mask.classList.add('hidden');
    state.activeModelId = null;
    renderModels();
  }

  // 抽屉展示内容与"数据模型-表抽屉"完全一致：
  //   标题       = {alias} · {name}
  //   副标题     = 所属数据源：{srcName} · {comment}
  //   基本信息   = 表名 / 别名 / 注释 / 类型(select) / 字段数 / 记录数
  //   Tabs       = 表结构 / 数据预览
  //   表结构 pane = 字段名 / 别名 / 类型 / 属性(PK/FK/NN)
  //   预览 pane  = 字段别名为列头 + 预览数据
  // 由于一个"模型"包含多张表，仅在顶部增加一个表切换器（chips），
  // 切换后下面的内容（标题/副标题/基本信息/Tab）完全按数据模型抽屉渲染。
  function renderModelDrawer() {
    var m = findModelById(state.activeModelId);
    if (!m) return;
    var titleEl = $('#atModelDrawerTitle');
    var subEl = $('#atModelDrawerSubtitle');
    var bodyEl = $('#atModelDrawerBody');
    if (!titleEl || !bodyEl) return;

    var tables = m.tables || [];
    var curTable = tables[state.drawerActiveTableIdx] || tables[0];
    var found = findSourceById(m.srcId);
    var srcName = found ? found.source.name : '-';

    if (!curTable) {
      titleEl.textContent = m.name;
      subEl.textContent = '所属数据源：' + srcName + ' · ' + (m.desc || '');
      bodyEl.innerHTML = '<div class="at-empty" style="padding:24px 0;">该模型暂未配置表结构</div>';
      return;
    }

    // 标题 / 副标题（与数据模型抽屉一致）
    titleEl.textContent = (curTable.alias ? curTable.alias + ' · ' : '') + curTable.name;
    subEl.textContent = '所属数据源：' + srcName + ' · ' + (curTable.comment || '');

    // ---- 基本信息（字段与数据模型抽屉完全一致；类型改为只读展示） ----
    var TYPE_LABEL_MAP = { fact: '事实表', dim: '维度表', bridge: '桥接表' };
    var curType = curTable.type || 'fact';
    var typeLabel = TYPE_LABEL_MAP[curType] || '-';

    var attrsHtml = ''
      + '<div class="dmd-section">'
      +   '<h4>基本信息</h4>'
      +   '<div class="dmd-meta-grid">'
      +     '<span class="lbl">表名</span><span class="val">' + escapeHTML(curTable.name) + '</span>'
      +     '<span class="lbl">别名</span><span class="val">' + escapeHTML(curTable.alias || '-') + '</span>'
      +     '<span class="lbl">注释</span><span class="val">' + escapeHTML(curTable.comment || '-') + '</span>'
      +     '<span class="lbl">类型</span><span class="val">' + escapeHTML(typeLabel) + '</span>'
      +     '<span class="lbl">字段数</span><span class="val">' + (curTable.fields ? curTable.fields.length : 0) + '</span>'
      +     '<span class="lbl">记录数</span><span class="val">' + (curTable.rows != null ? curTable.rows.toLocaleString() : '-') + '</span>'
      +   '</div>'
      + '</div>';

    // ---- Tabs（与数据模型抽屉一致） ----
    var tabsHtml = ''
      + '<div class="dmd-tabs" data-role="dmd-tabs">'
      +   '<button type="button" class="dmd-tab' + (state.drawerActiveTab === 'schema' ? ' active' : '') + '" data-tab="schema">表结构</button>'
      +   '<button type="button" class="dmd-tab' + (state.drawerActiveTab === 'preview' ? ' active' : '') + '" data-tab="preview">数据预览</button>'
      + '</div>';

    // ---- 表结构 pane ----
    var schemaRows = (curTable.fields || []).map(function (fld) {
      var attrs = [];
      if (fld.pk) attrs.push('<span class="dmd-attr dmd-attr-pk">PK</span>');
      if (fld.fk) attrs.push('<span class="dmd-attr dmd-attr-fk">FK</span>');
      if (fld.nn && !fld.pk) attrs.push('<span class="dmd-attr dmd-attr-nn">NN</span>');
      return ''
        + '<tr>'
        +   '<td>' + escapeHTML(fld.name) + '</td>'
        +   '<td>' + escapeHTML(fld.alias || '-') + '</td>'
        +   '<td>' + escapeHTML(fld.type) + '</td>'
        +   '<td>' + (attrs.join('') || '-') + '</td>'
        + '</tr>';
    }).join('');

    var schemaHtml = ''
      + '<div class="dmd-tab-pane' + (state.drawerActiveTab === 'schema' ? '' : ' hidden') + '" data-pane="schema">'
      +   '<table class="dmd-table">'
      +     '<thead><tr><th>字段名</th><th>别名</th><th>类型</th><th>属性</th></tr></thead>'
      +     '<tbody>' + schemaRows + '</tbody>'
      +   '</table>'
      + '</div>';

    // ---- 数据预览 pane ----
    var previewHead = '<tr>' + (curTable.fields || []).map(function (fld) {
      return '<th>' + escapeHTML(fld.alias || fld.name) + '</th>';
    }).join('') + '</tr>';
    var previewBody = (curTable.preview || []).map(function (row) {
      return '<tr>' + row.map(function (cell) {
        return '<td>' + escapeHTML(cell == null ? '' : String(cell)) + '</td>';
      }).join('') + '</tr>';
    }).join('') || '<tr><td colspan="' + (curTable.fields || []).length + '" style="text-align:center;color:#9ca3af;padding:24px 0;">暂无样例数据</td></tr>';

    var previewHtml = ''
      + '<div class="dmd-tab-pane' + (state.drawerActiveTab === 'preview' ? '' : ' hidden') + '" data-pane="preview">'
      +   '<div class="dmd-preview-wrap">'
      +     '<table class="dmd-table">'
      +       '<thead>' + previewHead + '</thead>'
      +       '<tbody>' + previewBody + '</tbody>'
      +     '</table>'
      +   '</div>'
      + '</div>';

    bodyEl.innerHTML = attrsHtml + tabsHtml + schemaHtml + previewHtml;
  }

  // 抽屉内事件绑定（Tab 切换 / 表切换 / 关闭）
  function bindModelDrawer() {
    var drawer = $('#atModelDrawer');
    var mask = $('#atModelDrawerMask');
    var closeBtn = $('#atModelDrawerClose');
    var bodyEl = $('#atModelDrawerBody');
    if (!drawer || !bodyEl) return;

    if (closeBtn) closeBtn.addEventListener('click', closeModelDrawer);
    if (mask) mask.addEventListener('click', closeModelDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.classList.contains('hidden')) closeModelDrawer();
    });

    bodyEl.addEventListener('click', function (e) {
      // Tab 切换
      var tabBtn = e.target.closest && e.target.closest('.dmd-tab');
      if (tabBtn) {
        var tab = tabBtn.getAttribute('data-tab');
        if (tab && tab !== state.drawerActiveTab) {
          state.drawerActiveTab = tab;
          renderModelDrawer();
        }
        return;
      }
    });

    // 抽屉拖动改变宽度
    bindDrawerResize();
  }

  function bindDrawerResize() {
    var resizer = $('#atModelDrawerResizer');
    var drawer = $('#atModelDrawer');
    if (!resizer || !drawer) return;

    var dragging = false;
    var startX = 0;
    var startW = 0;

    resizer.addEventListener('mousedown', function (e) {
      dragging = true;
      startX = e.clientX;
      startW = drawer.getBoundingClientRect().width;
      resizer.classList.add('dragging');
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = startX - e.clientX;
      var nw = startW + dx;
      // 最小宽度参考 dm-drawer 的 min-width: 320px
      if (nw < 320) nw = 320;
      var maxW = window.innerWidth * 0.9;
      if (nw > maxW) nw = maxW;
      drawer.style.width = nw + 'px';
    });

    document.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove('dragging');
      document.body.style.userSelect = '';
    });
  }

  // ---------- 7) 选中主题 ----------
  function selectTheme(id) {
    if (state.activeThemeId === id) return;
    state.activeThemeId = id;
    state.modelKeyword = '';
    state.modelSrcFilter = '';
    state.indicatorKeyword = '';
    state.indicatorTypeFilter = '';
    var ms = $('#atModelSearch'); if (ms) ms.value = '';
    var sel = $('#atModelFilterSrc'); if (sel) sel.value = '';
    var is = $('#atIndicatorSearch'); if (is) is.value = '';
    var its = $('#atIndicatorTypeFilter'); if (its) its.value = '';
    // 切换主题后关闭可能已打开的模型抽屉，避免显示与当前主题无关的内容
    if (state.activeModelId) closeModelDrawer();
    renderThemeList();
    renderDetail();
    renderModels();
    renderIndicators();
  }

  // ---------- 8) 拖动排序 ----------
  function bindThemeListDrag() {
    var list = $('#atThemeList');
    if (!list) return;
    var dragId = null;

    list.addEventListener('dragstart', function (e) {
      var item = e.target.closest && e.target.closest('.at-theme-item');
      if (!item) return;
      dragId = item.getAttribute('data-id');
      item.classList.add('is-dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragId); } catch (err) {}
      }
    });

    list.addEventListener('dragover', function (e) {
      var item = e.target.closest && e.target.closest('.at-theme-item');
      if (!item || !dragId) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      var rect = item.getBoundingClientRect();
      var before = (e.clientY - rect.top) < rect.height / 2;
      $$('.at-theme-item.is-drop-before, .at-theme-item.is-drop-after', list).forEach(function (el) {
        el.classList.remove('is-drop-before', 'is-drop-after');
      });
      if (item.getAttribute('data-id') === dragId) return;
      item.classList.add(before ? 'is-drop-before' : 'is-drop-after');
    });

    list.addEventListener('dragleave', function (e) {
      var item = e.target.closest && e.target.closest('.at-theme-item');
      if (item) item.classList.remove('is-drop-before', 'is-drop-after');
    });

    list.addEventListener('drop', function (e) {
      var item = e.target.closest && e.target.closest('.at-theme-item');
      if (!item || !dragId) return;
      e.preventDefault();
      var targetId = item.getAttribute('data-id');
      var rect = item.getBoundingClientRect();
      var before = (e.clientY - rect.top) < rect.height / 2;
      reorderThemes(dragId, targetId, before);
    });

    list.addEventListener('dragend', function () {
      dragId = null;
      $$('.at-theme-item.is-dragging, .at-theme-item.is-drop-before, .at-theme-item.is-drop-after', list).forEach(function (el) {
        el.classList.remove('is-dragging', 'is-drop-before', 'is-drop-after');
      });
    });
  }

  function reorderThemes(srcId, dstId, before) {
    if (srcId === dstId) return;
    var srcIdx = -1, dstIdx = -1;
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === srcId) srcIdx = i;
      if (THEMES[i].id === dstId) dstIdx = i;
    }
    if (srcIdx < 0 || dstIdx < 0) return;
    var item = THEMES.splice(srcIdx, 1)[0];
    if (srcIdx < dstIdx) dstIdx--;
    var insertAt = before ? dstIdx : dstIdx + 1;
    THEMES.splice(insertAt, 0, item);
    renderThemeList();
    if (typeof showToast === 'function') showToast('已调整主题顺序');
  }

  // ---------- 9) 右键菜单 ----------
  function bindContextMenu() {
    var menu = $('#atCtxMenu');
    var list = $('#atThemeList');
    if (!menu || !list) return;

    list.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      var item = e.target.closest && e.target.closest('.at-theme-item');
      state.ctxThemeId = item ? item.getAttribute('data-id') : null;
      // 当点空白处时，部分按钮置灰
      var hasItem = !!state.ctxThemeId;
      $$('.at-ctx-item[data-act="edit"], .at-ctx-item[data-act="delete"]', menu).forEach(function (b) {
        b.disabled = !hasItem;
        b.style.opacity = hasItem ? '' : '.45';
        b.style.cursor = hasItem ? '' : 'not-allowed';
      });
      // 如果点击的是一个具体主题，先选中它
      if (hasItem && state.ctxThemeId !== state.activeThemeId) {
        selectTheme(state.ctxThemeId);
      }
      // 定位
      menu.classList.remove('hidden');
      var x = e.clientX, y = e.clientY;
      // 防越界
      var vw = window.innerWidth, vh = window.innerHeight;
      menu.style.left = (Math.min(x, vw - 170)) + 'px';
      menu.style.top = (Math.min(y, vh - 130)) + 'px';
    });

    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target)) menu.classList.add('hidden');
    });
    window.addEventListener('blur', function () { menu.classList.add('hidden'); });
    window.addEventListener('resize', function () { menu.classList.add('hidden'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') menu.classList.add('hidden');
    });

    menu.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.at-ctx-item');
      if (!btn || btn.disabled) return;
      var act = btn.getAttribute('data-act');
      menu.classList.add('hidden');
      if (act === 'new') openThemeForm(null);
      else if (act === 'edit') openThemeForm(state.ctxThemeId);
      else if (act === 'delete') confirmDeleteTheme(state.ctxThemeId);
    });
  }

  // ---------- 10) 主题表单弹窗 ----------
  function openThemeForm(id) {
    state.editingThemeId = id;
    var t = id ? findThemeById(id) : null;
    var titleEl = $('#atThemeFormTitle');
    var nameEl = $('#atThemeName');
    var descEl = $('#atThemeDesc');
    var nameCnt = $('#atThemeNameCount');
    var descCnt = $('#atThemeDescCount');
    var nameErr = $('#atThemeNameErr');
    if (titleEl) titleEl.textContent = t ? '编辑分析主题' : '新建分析主题';
    if (nameEl) nameEl.value = t ? t.name : '';
    if (descEl) descEl.value = t ? (t.desc || '') : '';
    if (nameCnt) nameCnt.textContent = nameEl ? nameEl.value.length : 0;
    if (descCnt) descCnt.textContent = descEl ? descEl.value.length : 0;
    if (nameErr) nameErr.classList.add('hidden');

    $('#atThemeFormMask').classList.remove('hidden');
    $('#atThemeFormModal').classList.remove('hidden');
    setTimeout(function () { if (nameEl) nameEl.focus(); }, 60);
  }

  function closeThemeForm() {
    $('#atThemeFormMask').classList.add('hidden');
    $('#atThemeFormModal').classList.add('hidden');
    state.editingThemeId = null;
  }

  function submitThemeForm() {
    var nameEl = $('#atThemeName');
    var descEl = $('#atThemeDesc');
    var nameErr = $('#atThemeNameErr');
    var name = (nameEl && nameEl.value || '').trim();
    var desc = (descEl && descEl.value || '').trim();
    if (!name) {
      if (nameErr) { nameErr.textContent = '请输入主题名称'; nameErr.classList.remove('hidden'); }
      if (nameEl) nameEl.focus();
      return;
    }
    if (name.length > 50) {
      if (nameErr) { nameErr.textContent = '主题名称不超过 50 字'; nameErr.classList.remove('hidden'); }
      if (nameEl) nameEl.focus();
      return;
    }
    if (desc.length > 500) {
      if (typeof showToast === 'function') showToast('主题描述不超过 500 字');
      return;
    }
    if (state.editingThemeId) {
      var t = findThemeById(state.editingThemeId);
      if (t) { t.name = name; t.desc = desc; }
      if (typeof showToast === 'function') showToast('已保存主题');
    } else {
      var nt = { id: uid('th'), name: name, desc: desc, modelIds: [], indicatorIds: [] };
      THEMES.push(nt);
      state.activeThemeId = nt.id;
      if (typeof showToast === 'function') showToast('已新建主题：' + name);
    }
    closeThemeForm();
    renderThemeList();
    renderDetail();
    renderModels();
    renderIndicators();
  }

  function bindThemeForm() {
    var modal = $('#atThemeFormModal');
    var mask = $('#atThemeFormMask');
    var nameEl = $('#atThemeName');
    var descEl = $('#atThemeDesc');
    if (!modal) return;

    if (mask) mask.addEventListener('click', closeThemeForm);
    modal.addEventListener('click', function (e) {
      var act = e.target.closest && e.target.closest('[data-act]');
      if (!act) return;
      var role = act.getAttribute('data-act');
      if (role === 'cancel') closeThemeForm();
      else if (role === 'ok') submitThemeForm();
    });

    if (nameEl) {
      nameEl.addEventListener('input', function () {
        var v = nameEl.value || '';
        if (v.length > 50) { nameEl.value = v.slice(0, 50); }
        var c = $('#atThemeNameCount'); if (c) c.textContent = nameEl.value.length;
        var err = $('#atThemeNameErr'); if (err) err.classList.add('hidden');
      });
      nameEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submitThemeForm(); }
      });
    }
    if (descEl) {
      descEl.addEventListener('input', function () {
        var v = descEl.value || '';
        if (v.length > 500) { descEl.value = v.slice(0, 500); }
        var c = $('#atThemeDescCount'); if (c) c.textContent = descEl.value.length;
      });
    }
  }

  // ---------- 11) 通用确认弹窗 ----------
  function showConfirm(opts) {
    opts = opts || {};
    $('#atConfirmTitle').textContent = opts.title || '操作确认';
    $('#atConfirmSubtitle').textContent = opts.subtitle || '操作不可恢复（仅原型示例数据）。';
    $('#atConfirmMessage').textContent = opts.message || '确定执行该操作吗？';
    var ok = $('#atConfirmOk');
    if (ok) {
      ok.textContent = opts.okText || '确认';
      if (opts.danger === false) {
        ok.style.background = ''; ok.style.boxShadow = '';
      } else {
        ok.style.background = '#ef4444';
        ok.style.boxShadow = '0 8px 20px rgba(239,68,68,.22)';
      }
    }
    $('#atConfirmMask').classList.remove('hidden');
    $('#atConfirmModal').classList.remove('hidden');
    confirmCallback = opts.onOk || null;
  }

  function closeConfirm() {
    $('#atConfirmMask').classList.add('hidden');
    $('#atConfirmModal').classList.add('hidden');
    confirmCallback = null;
  }

  var confirmCallback = null;

  function bindConfirm() {
    var modal = $('#atConfirmModal');
    var mask = $('#atConfirmMask');
    if (!modal) return;
    if (mask) mask.addEventListener('click', closeConfirm);
    modal.addEventListener('click', function (e) {
      var act = e.target.closest && e.target.closest('[data-act]');
      if (!act) return;
      var role = act.getAttribute('data-act');
      if (role === 'cancel') closeConfirm();
      else if (role === 'ok') {
        var cb = confirmCallback;
        closeConfirm();
        if (typeof cb === 'function') cb();
      }
    });
  }

  function confirmDeleteTheme(id) {
    var t = findThemeById(id);
    if (!t) return;
    showConfirm({
      title: '删除分析主题',
      subtitle: '主题删除后，其关联模型不会被删除，但本主题将不可恢复。',
      message: '确定要删除主题"' + t.name + '"吗？',
      okText: '确认删除',
      onOk: function () { deleteTheme(id); }
    });
  }

  function toggleThemeStatus(id) {
    var t = findThemeById(id);
    if (!t) return;
    var enabled = t.status !== 'disabled';
    if (enabled) {
      // 启用 → 禁用：弹确认
      showConfirm({
        title: '禁用分析主题',
        subtitle: '禁用后此主题将不会出现在前台问数与可见列表中，可随时再次启用。',
        message: '确定要禁用主题"' + t.name + '"吗？',
        okText: '确认禁用',
        onOk: function () {
          t.status = 'disabled';
          renderDetail();
          if (typeof showToast === 'function') showToast('已禁用：' + t.name);
        }
      });
    } else {
      // 禁用 → 启用：直接切换
      t.status = 'enabled';
      renderDetail();
      if (typeof showToast === 'function') showToast('已启用：' + t.name);
    }
  }

  function deleteTheme(id) {
    var idx = -1;
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === id) { idx = i; break; }
    }
    if (idx < 0) return;
    var t = THEMES.splice(idx, 1)[0];
    if (state.activeThemeId === id) {
      state.activeThemeId = THEMES[0] ? THEMES[0].id : null;
    }
    renderThemeList();
    renderDetail();
    renderModels();
    renderIndicators();
    if (typeof showToast === 'function') showToast('已删除主题：' + t.name);
  }

  function confirmRemoveModel(mid) {
    var t = findThemeById(state.activeThemeId);
    var m = findModelById(mid);
    if (!t || !m) return;
    showConfirm({
      title: '移除关联数据模型',
      subtitle: '仅从当前主题移除此模型，模型本身不会被删除。',
      message: '确定要从"' + t.name + '"移除模型"' + m.name + '"吗？',
      okText: '确认移除',
      onOk: function () {
        t.modelIds = (t.modelIds || []).filter(function (x) { return x !== mid; });
        renderThemeList();
        renderDetail();
        renderModels();
        if (typeof showToast === 'function') showToast('已移除：' + m.name);
      }
    });
  }

  function confirmRemoveIndicator(iid) {
    var t = findThemeById(state.activeThemeId);
    var it = findIndicatorById(iid);
    if (!t || !it) return;
    showConfirm({
      title: '移除关联指标',
      subtitle: '仅从当前主题移除此指标，指标体系中的指标不会被删除。',
      message: '确定要从"' + t.name + '"移除指标"' + it.name + '"吗？',
      okText: '确认移除',
      onOk: function () {
        t.indicatorIds = (t.indicatorIds || []).filter(function (x) { return x !== iid; });
        renderThemeList();
        renderDetail();
        renderIndicators();
        if (typeof showToast === 'function') showToast('已移除：' + it.name);
      }
    });
  }

  // ---------- 12) 数据模型选择弹窗 ----------
  function openPicker() {
    var t = findThemeById(state.activeThemeId);
    if (!t) {
      if (typeof showToast === 'function') showToast('请先选择一个主题');
      return;
    }
    state.pickerSelected = {};
    state.pickerActiveSrc = '';
    state.pickerSourceKw = '';
    state.pickerModelKw = '';
    var sSearch = $('#atpSourceSearch'); if (sSearch) sSearch.value = '';
    var mSearch = $('#atpModelSearch'); if (mSearch) mSearch.value = '';
    renderPickerSources();
    renderPickerModels();
    updatePickerMeta();
    $('#atPickerMask').classList.remove('hidden');
    $('#atPickerModal').classList.remove('hidden');
  }

  function closePicker() {
    $('#atPickerMask').classList.add('hidden');
    $('#atPickerModal').classList.add('hidden');
  }

  function renderPickerSources() {
    var box = $('#atpSourceList');
    if (!box) return;
    var kw = (state.pickerSourceKw || '').trim().toLowerCase();
    var html = DOMAINS.map(function (d) {
      var sources = (d.sources || []).filter(function (s) {
        if (!kw) return true;
        return s.name.toLowerCase().indexOf(kw) >= 0
          || (s.type || '').toLowerCase().indexOf(kw) >= 0;
      });
      if (!sources.length) return '';
      var children = sources.map(function (s) {
        var cnt = MODELS.filter(function (m) { return m.srcId === s.id; }).length;
        var active = state.pickerActiveSrc === s.id ? ' is-active' : '';
        return ''
          + '<div class="atp-source-item' + active + '" data-sid="' + escapeHTML(s.id) + '">'
          +   '<span>' + escapeHTML(s.name) + '</span>'
          +   '<span class="atp-src-cnt">' + cnt + '</span>'
          + '</div>';
      }).join('');
      return ''
        + '<div class="atp-domain" data-key="' + escapeHTML(d.key) + '">'
        +   '<div class="atp-domain-head">'
        +     '<span class="chev"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span>'
        +     '<span>' + escapeHTML(d.name) + '</span>'
        +   '</div>'
        +   '<div class="atp-domain-children">' + children + '</div>'
        + '</div>';
    }).join('');
    box.innerHTML = html || '<div class="at-empty" style="padding:24px 12px;font-size:12.5px;">未找到匹配的数据源</div>';
  }

  function renderPickerModels() {
    var box = $('#atpModelsList');
    if (!box) return;
    var t = findThemeById(state.activeThemeId);
    var existing = {};
    (t && t.modelIds ? t.modelIds : []).forEach(function (id) { existing[id] = true; });

    var kw = (state.pickerModelKw || '').trim().toLowerCase();
    var rows = MODELS.filter(function (m) {
      if (state.pickerActiveSrc && m.srcId !== state.pickerActiveSrc) return false;
      if (!kw) return true;
      return (m.name || '').toLowerCase().indexOf(kw) >= 0
        || (m.code || '').toLowerCase().indexOf(kw) >= 0;
    });

    if (!rows.length) {
      box.innerHTML = ''
        + '<div class="at-empty" style="grid-column: 1 / -1;">'
        +   '<div class="at-empty-ico"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></div>'
        +   '没有匹配的数据模型'
        + '</div>';
      return;
    }

    box.innerHTML = rows.map(function (m) {
      var added = !!existing[m.id];
      var checked = !!state.pickerSelected[m.id];
      var found = findSourceById(m.srcId);
      var srcName = found ? found.source.name : '-';
      var onlineName = m.code || (m.tables && m.tables[0] ? m.tables[0].name : '');
      var clsList = ['atp-model-card'];
      if (added) clsList.push('is-disabled');
      else if (checked) clsList.push('is-checked');
      return ''
        + '<div class="' + clsList.join(' ') + '" data-mid="' + escapeHTML(m.id) + '"' + (added ? ' aria-disabled="true"' : '') + '>'
        +   '<div class="atp-model-head">'
        +     '<span class="atp-model-check"><svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg></span>'
        +     '<span class="atp-model-name" title="' + escapeHTML(m.code || '') + '">' + escapeHTML(m.name) + '</span>'
        +     '<span class="atp-model-tag atp-model-code" title="' + escapeHTML(onlineName || '') + '">' + escapeHTML((onlineName || '-').slice(0, 16)) + '</span>'
        +   '</div>'
        +   '<div class="atp-model-meta">'
        +     '<span>' + escapeHTML(srcName) + '</span>'
        +     '<span>' + (m.fieldCount || 0) + ' 字段</span>'
        +     (added ? '<span class="atp-model-tag is-added">已添加</span>' : '')
        +   '</div>'
        + '</div>';
    }).join('');
  }

  function updatePickerMeta() {
    var n = Object.keys(state.pickerSelected).length;
    var el = $('#atpSelectedCount'); if (el) el.textContent = String(n);
  }

  function bindPicker() {
    var modal = $('#atPickerModal');
    var mask = $('#atPickerMask');
    if (!modal) return;

    if (mask) mask.addEventListener('click', closePicker);

    modal.addEventListener('click', function (e) {
      var act = e.target.closest && e.target.closest('[data-act]');
      if (act) {
        var role = act.getAttribute('data-act');
        if (role === 'cancel') { closePicker(); return; }
        if (role === 'ok') { savePicker(); return; }
      }
      // 数据源点击
      var srcItem = e.target.closest && e.target.closest('.atp-source-item');
      if (srcItem) {
        var sid = srcItem.getAttribute('data-sid');
        state.pickerActiveSrc = state.pickerActiveSrc === sid ? '' : sid;
        renderPickerSources();
        renderPickerModels();
        return;
      }
      // 域折叠/展开
      var dHead = e.target.closest && e.target.closest('.atp-domain-head');
      if (dHead) {
        var d = dHead.parentElement;
        if (d) d.classList.toggle('is-collapsed');
        return;
      }
      // 模型卡选中
      var card = e.target.closest && e.target.closest('.atp-model-card');
      if (card && !card.classList.contains('is-disabled')) {
        var mid = card.getAttribute('data-mid');
        if (state.pickerSelected[mid]) delete state.pickerSelected[mid];
        else state.pickerSelected[mid] = true;
        renderPickerModels();
        updatePickerMeta();
        return;
      }
      // 清空
      if (e.target.id === 'atpClearAll') {
        state.pickerSelected = {};
        renderPickerModels();
        updatePickerMeta();
      }
    });

    var sSearch = $('#atpSourceSearch');
    if (sSearch) sSearch.addEventListener('input', function () {
      state.pickerSourceKw = sSearch.value || '';
      renderPickerSources();
    });
    var mSearch = $('#atpModelSearch');
    if (mSearch) mSearch.addEventListener('input', function () {
      state.pickerModelKw = mSearch.value || '';
      renderPickerModels();
    });
  }

  function savePicker() {
    var t = findThemeById(state.activeThemeId);
    if (!t) { closePicker(); return; }
    var ids = Object.keys(state.pickerSelected);
    if (!ids.length) {
      if (typeof showToast === 'function') showToast('请先勾选要添加的数据模型');
      return;
    }
    t.modelIds = (t.modelIds || []).slice();
    var added = 0;
    ids.forEach(function (id) {
      if (t.modelIds.indexOf(id) < 0) { t.modelIds.push(id); added++; }
    });
    closePicker();
    renderThemeList();
    renderDetail();
    renderModels();
    if (typeof showToast === 'function') showToast('已添加 ' + added + ' 个数据模型');
  }

  // ---------- 12.5) 指标选择弹窗 ----------
  function indicatorGroupIds(gid) {
    if (!gid) return null;
    for (var i = 0; i < INDICATOR_GROUPS.length; i++) {
      var g = INDICATOR_GROUPS[i];
      if (g.id === gid) {
        var ids = [g.id];
        (g.children || []).forEach(function (c) { ids.push(c.id); });
        return ids;
      }
      var children = g.children || [];
      for (var j = 0; j < children.length; j++) {
        if (children[j].id === gid) return [gid];
      }
    }
    return [gid];
  }

  function indicatorCountByGroup(gid) {
    var ids = indicatorGroupIds(gid);
    if (!ids) return INDICATORS.length;
    var map = {};
    ids.forEach(function (id) { map[id] = true; });
    return INDICATORS.filter(function (it) { return !!map[it.groupId]; }).length;
  }

  function openIndicatorPicker() {
    var t = findThemeById(state.activeThemeId);
    if (!t) {
      if (typeof showToast === 'function') showToast('请先选择一个主题');
      return;
    }
    state.indicatorPickerSelected = {};
    state.indicatorPickerActiveGroup = '';
    state.indicatorPickerGroupKw = '';
    state.indicatorPickerKw = '';
    var gSearch = $('#atiGroupSearch'); if (gSearch) gSearch.value = '';
    var iSearch = $('#atiIndicatorSearch'); if (iSearch) iSearch.value = '';
    renderIndicatorPickerGroups();
    renderIndicatorPickerItems();
    updateIndicatorPickerMeta();
    $('#atIndicatorPickerMask').classList.remove('hidden');
    $('#atIndicatorPickerModal').classList.remove('hidden');
  }

  function closeIndicatorPicker() {
    $('#atIndicatorPickerMask').classList.add('hidden');
    $('#atIndicatorPickerModal').classList.add('hidden');
  }

  function renderIndicatorPickerGroups() {
    var box = $('#atiGroupList');
    if (!box) return;
    var kw = (state.indicatorPickerGroupKw || '').trim().toLowerCase();
    var allActive = state.indicatorPickerActiveGroup === '';
    var html = ''
      + '<div class="atp-indicator-group' + (allActive ? ' is-active' : '') + '" data-gid="">'
      +   '<span>全部指标</span><span class="atp-src-cnt">' + INDICATORS.length + '</span>'
      + '</div>';

    html += INDICATOR_GROUPS.map(function (g) {
      var children = (g.children || []).filter(function (c) {
        if (!kw) return true;
        return g.name.toLowerCase().indexOf(kw) >= 0 || c.name.toLowerCase().indexOf(kw) >= 0;
      });
      if (kw && g.name.toLowerCase().indexOf(kw) < 0 && !children.length) return '';
      var childHtml = children.map(function (c) {
        var active = state.indicatorPickerActiveGroup === c.id ? ' is-active' : '';
        return ''
          + '<div class="atp-indicator-group' + active + '" data-gid="' + escapeHTML(c.id) + '">'
          +   '<span>' + escapeHTML(c.name) + '</span><span class="atp-src-cnt">' + indicatorCountByGroup(c.id) + '</span>'
          + '</div>';
      }).join('');
      var groupActive = state.indicatorPickerActiveGroup === g.id ? ' is-active' : '';
      return ''
        + '<div class="atp-domain">'
        +   '<div class="atp-domain-head">'
        +     '<span class="chev"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span>'
        +     '<span>' + escapeHTML(g.name) + '</span>'
        +   '</div>'
        +   '<div class="atp-domain-children">'
        +     '<div class="atp-indicator-group' + groupActive + '" data-gid="' + escapeHTML(g.id) + '">'
        +       '<span>全部' + escapeHTML(g.name) + '</span><span class="atp-src-cnt">' + indicatorCountByGroup(g.id) + '</span>'
        +     '</div>'
        +     childHtml
        +   '</div>'
        + '</div>';
    }).join('');
    box.innerHTML = html || '<div class="at-empty" style="padding:24px 12px;font-size:12.5px;">未找到匹配的指标目录</div>';
  }

  function renderIndicatorPickerItems() {
    var box = $('#atiIndicatorsList');
    if (!box) return;
    var t = findThemeById(state.activeThemeId);
    var existing = {};
    (t && t.indicatorIds ? t.indicatorIds : []).forEach(function (id) { existing[id] = true; });
    var groupIds = indicatorGroupIds(state.indicatorPickerActiveGroup);
    var groupMap = null;
    if (groupIds) {
      groupMap = {};
      groupIds.forEach(function (id) { groupMap[id] = true; });
    }
    var kw = (state.indicatorPickerKw || '').trim().toLowerCase();
    var rows = INDICATORS.filter(function (it) {
      if (groupMap && !groupMap[it.groupId]) return false;
      if (!kw) return true;
      return (it.name || '').toLowerCase().indexOf(kw) >= 0
        || (it.synonyms || '').toLowerCase().indexOf(kw) >= 0;
    });

    if (!rows.length) {
      box.innerHTML = ''
        + '<div class="at-empty" style="grid-column: 1 / -1;">'
        +   '<div class="at-empty-ico"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></div>'
        +   '没有匹配的指标'
        + '</div>';
      return;
    }

    box.innerHTML = rows.map(function (it) {
      var added = !!existing[it.id];
      var checked = !!state.indicatorPickerSelected[it.id];
      var found = findSourceById(it.srcId);
      var srcName = found ? found.source.name : '-';
      var clsList = ['atp-model-card'];
      if (added) clsList.push('is-disabled');
      else if (checked) clsList.push('is-checked');
      return ''
        + '<div class="' + clsList.join(' ') + '" data-iid="' + escapeHTML(it.id) + '"' + (added ? ' aria-disabled="true"' : '') + '>'
        +   '<div class="atp-model-head">'
        +     '<span class="atp-model-check"><svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg></span>'
        +     '<span class="atp-model-name" title="' + escapeHTML(it.synonyms || '') + '">' + escapeHTML(it.name) + '</span>'
        +     '<span class="atp-model-tag">' + indicatorTypeText(it.type) + '</span>'
        +   '</div>'
        +   '<div class="atp-model-meta">'
        +     '<span>' + escapeHTML(srcName) + '</span>'
        +     '<span>' + escapeHTML(indicatorFormulaText(it)) + '</span>'
        +     (added ? '<span class="atp-model-tag is-added">已添加</span>' : '')
        +   '</div>'
        + '</div>';
    }).join('');
  }

  function updateIndicatorPickerMeta() {
    var n = Object.keys(state.indicatorPickerSelected).length;
    var el = $('#atiSelectedCount'); if (el) el.textContent = String(n);
  }

  function bindIndicatorPicker() {
    var modal = $('#atIndicatorPickerModal');
    var mask = $('#atIndicatorPickerMask');
    if (!modal) return;
    if (mask) mask.addEventListener('click', closeIndicatorPicker);
    modal.addEventListener('click', function (e) {
      var act = e.target.closest && e.target.closest('[data-act]');
      if (act) {
        var role = act.getAttribute('data-act');
        if (role === 'cancel') { closeIndicatorPicker(); return; }
        if (role === 'ok') { saveIndicatorPicker(); return; }
      }
      var groupItem = e.target.closest && e.target.closest('.atp-indicator-group');
      if (groupItem) {
        state.indicatorPickerActiveGroup = groupItem.getAttribute('data-gid') || '';
        renderIndicatorPickerGroups();
        renderIndicatorPickerItems();
        return;
      }
      var dHead = e.target.closest && e.target.closest('.atp-domain-head');
      if (dHead) {
        var d = dHead.parentElement;
        if (d) d.classList.toggle('is-collapsed');
        return;
      }
      var card = e.target.closest && e.target.closest('.atp-model-card[data-iid]');
      if (card && !card.classList.contains('is-disabled')) {
        var iid = card.getAttribute('data-iid');
        if (state.indicatorPickerSelected[iid]) delete state.indicatorPickerSelected[iid];
        else state.indicatorPickerSelected[iid] = true;
        renderIndicatorPickerItems();
        updateIndicatorPickerMeta();
        return;
      }
      if (e.target.id === 'atiClearAll') {
        state.indicatorPickerSelected = {};
        renderIndicatorPickerItems();
        updateIndicatorPickerMeta();
      }
    });
    var gSearch = $('#atiGroupSearch');
    if (gSearch) gSearch.addEventListener('input', function () {
      state.indicatorPickerGroupKw = gSearch.value || '';
      renderIndicatorPickerGroups();
    });
    var iSearch = $('#atiIndicatorSearch');
    if (iSearch) iSearch.addEventListener('input', function () {
      state.indicatorPickerKw = iSearch.value || '';
      renderIndicatorPickerItems();
    });
  }

  function saveIndicatorPicker() {
    var t = findThemeById(state.activeThemeId);
    if (!t) { closeIndicatorPicker(); return; }
    var ids = Object.keys(state.indicatorPickerSelected);
    if (!ids.length) {
      if (typeof showToast === 'function') showToast('请先勾选要添加的指标');
      return;
    }
    t.indicatorIds = (t.indicatorIds || []).slice();
    var added = 0;
    ids.forEach(function (id) {
      if (t.indicatorIds.indexOf(id) < 0) { t.indicatorIds.push(id); added++; }
    });
    closeIndicatorPicker();
    renderThemeList();
    renderDetail();
    renderIndicators();
    if (typeof showToast === 'function') showToast('已添加 ' + added + ' 个指标');
  }

  // ---------- 13) 顶部 / 列表 等其它绑定 ----------
  function bindMisc() {
    var tabs = document.querySelector('.at-tabs-bar');
    if (tabs) tabs.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.at-tab');
      if (!btn) return;
      var tab = btn.getAttribute('data-tab');
      if (!tab || tab === state.activeRelationTab) return;
      state.activeRelationTab = tab;
      renderRelationTabs();
    });

    // 左侧主题点击
    var list = $('#atThemeList');
    if (list) {
      list.addEventListener('click', function (e) {
        var item = e.target.closest && e.target.closest('.at-theme-item');
        if (!item) return;
        selectTheme(item.getAttribute('data-id'));
      });
    }

    // 左侧搜索
    var ts = $('#atThemeSearch');
    if (ts) ts.addEventListener('input', function () {
      state.themeKeyword = ts.value || '';
      renderThemeList();
    });

    // 左侧 + 按钮
    var addThemeBtn = $('#atBtnNewTheme');
    if (addThemeBtn) addThemeBtn.addEventListener('click', function () { openThemeForm(null); });

    // 详情卡：状态切换（已启用 ↔ 已禁用）
    var detail = $('#atDetailCard');
    if (detail) detail.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-act="toggle-status"]');
      if (!btn) return;
      toggleThemeStatus(state.activeThemeId);
    });

    // 模型表 - 搜索 / 数据源筛选 / 添加 / 移除
    var ms = $('#atModelSearch');
    if (ms) ms.addEventListener('input', function () {
      state.modelKeyword = ms.value || '';
      renderModels();
    });
    var sel = $('#atModelFilterSrc');
    if (sel) sel.addEventListener('change', function () {
      state.modelSrcFilter = sel.value || '';
      renderModels();
    });
    var addBtn = $('#atBtnAddModel');
    if (addBtn) addBtn.addEventListener('click', openPicker);

    var ikw = $('#atIndicatorSearch');
    if (ikw) ikw.addEventListener('input', function () {
      state.indicatorKeyword = ikw.value || '';
      renderIndicators();
    });
    var itf = $('#atIndicatorTypeFilter');
    if (itf) itf.addEventListener('change', function () {
      state.indicatorTypeFilter = itf.value || '';
      renderIndicators();
    });
    var addIndicatorBtn = $('#atBtnAddIndicator');
    if (addIndicatorBtn) addIndicatorBtn.addEventListener('click', openIndicatorPicker);

    var tbody = $('#atModelsTbody');
    if (tbody) tbody.addEventListener('click', function (e) {
      // 移除按钮（注意要在打开抽屉之前判断，避免冒泡到行点击）
      var rmBtn = e.target.closest && e.target.closest('[data-act="remove-model"]');
      if (rmBtn) {
        e.stopPropagation();
        confirmRemoveModel(rmBtn.getAttribute('data-mid'));
        return;
      }
      // 点击模型名称 → 打开模型详情抽屉
      var nameBtn = e.target.closest && e.target.closest('[data-act="open-model"]');
      if (nameBtn) {
        var mid = nameBtn.getAttribute('data-mid');
        // 如果已经是当前打开的模型，则关闭抽屉
        if (state.activeModelId === mid) closeModelDrawer();
        else openModelDrawer(mid);
      }
    });

    var indicatorsTbody = $('#atIndicatorsTbody');
    if (indicatorsTbody) indicatorsTbody.addEventListener('click', function (e) {
      var rmBtn = e.target.closest && e.target.closest('[data-act="remove-indicator"]');
      if (!rmBtn) return;
      e.stopPropagation();
      confirmRemoveIndicator(rmBtn.getAttribute('data-iid'));
    });
  }

  // ---------- 14) 启动 ----------
  document.addEventListener('DOMContentLoaded', function () {
    renderThemeList();
    renderDetail();
    renderModels();
    renderIndicators();
    bindThemeListDrag();
    bindContextMenu();
    bindThemeForm();
    bindConfirm();
    bindPicker();
    bindIndicatorPicker();
    bindMisc();
    bindModelDrawer();
  });

  // 暴露给控制台调试
  window.__AT = {
    THEMES: THEMES,
    MODELS: MODELS,
    DOMAINS: DOMAINS,
    INDICATOR_GROUPS: INDICATOR_GROUPS,
    INDICATORS: INDICATORS,
    state: state,
    select: selectTheme,
    openPicker: openPicker,
    openForm: openThemeForm,
    openModelDrawer: openModelDrawer,
    closeModelDrawer: closeModelDrawer
  };
})();
