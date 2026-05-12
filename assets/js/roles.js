(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const functionGroups = [
    {
      id: "group.biz",
      scope: "biz",
      title: "业务端",
      menus: [
        menu("biz.query", "智能问数", [
          ["biz.query.new", "新建问数"],
          ["biz.query.uploadImage", "上传图片"],
          ["biz.query.uploadFile", "上传附件"],
          ["biz.query.feedback", "提交反馈"],
          ["biz.query.followup", "追问"],
          ["biz.query.interpret", "数据解读"],
          ["biz.query.reason", "归因分析"],
          ["biz.query.trend", "趋势分析"],
          ["biz.query.compare", "对比分析"],
          ["biz.query.template", "模板分析"],
          ["biz.query.exportExcel", "导出 Excel"]
        ]),
        menu("biz.dashboard", "我的仪表盘", [
          ["biz.dashboard.view", "查看"],
          ["biz.dashboard.create", "新建"],
          ["biz.dashboard.edit", "编辑"],
          ["biz.dashboard.delete", "删除"],
          ["biz.dashboard.save", "保存"],
          ["biz.dashboard.exportImage", "导出图片"],
          ["biz.dashboard.exportPdf", "导出 PDF"]
        ]),
        menu("biz.board", "我的看板", [
          ["biz.board.view", "查看"],
          ["biz.board.create", "新建"],
          ["biz.board.edit", "编辑"],
          ["biz.board.delete", "删除"],
          ["biz.board.share", "分享"],
          ["biz.board.publish", "发布"]
        ]),
        menu("biz.report", "我的报告", [
          ["biz.report.view", "查看"],
          ["biz.report.create", "新建"],
          ["biz.report.edit", "编辑"],
          ["biz.report.delete", "删除"],
          ["biz.report.exportWord", "导出 Word"],
          ["biz.report.exportPdf", "导出 PDF"],
          ["biz.report.addQuery", "添加问数结果"]
        ]),
        menu("biz.feedback", "我的反馈", [
          ["biz.feedback.view", "查看"],
          ["biz.feedback.search", "查询"],
          ["biz.feedback.submit", "提交反馈"]
        ])
      ]
    },
    {
      id: "group.data",
      scope: "admin",
      title: "数据管理",
      menus: [
        menu("admin.datasource", "数据源", [
          ["admin.datasource.view", "查看"],
          ["admin.datasource.create", "新增"],
          ["admin.datasource.edit", "编辑"],
          ["admin.datasource.delete", "删除"],
          ["admin.datasource.sync", "同步元数据"],
          ["admin.datasource.preview", "数据预览"]
        ]),
        menu("admin.datamodel", "数据模型", [
          ["admin.datamodel.view", "查看"],
          ["admin.datamodel.register", "模型注册"],
          ["admin.datamodel.edit", "编辑"],
          ["admin.datamodel.delete", "删除"],
          ["admin.datamodel.topology", "拓扑配置"],
          ["admin.datamodel.import", "导入"],
          ["admin.datamodel.export", "导出"]
        ]),
        menu("admin.theme", "分析主题", [
          ["admin.theme.view", "查看"],
          ["admin.theme.create", "新增"],
          ["admin.theme.edit", "编辑"],
          ["admin.theme.delete", "删除"],
          ["admin.theme.bindModel", "关联模型"]
        ])
      ]
    },
    {
      id: "group.knowledge",
      scope: "admin",
      title: "知识管理",
      menus: [
        menu("admin.indicator", "指标体系", [
          ["admin.indicator.view", "查看"],
          ["admin.indicator.create", "新增指标"],
          ["admin.indicator.edit", "编辑指标"],
          ["admin.indicator.delete", "删除"],
          ["admin.indicator.catalog", "目录维护"]
        ]),
        menu("admin.example", "示例库", [
          ["admin.example.view", "查看"],
          ["admin.example.create", "新增"],
          ["admin.example.edit", "编辑"],
          ["admin.example.delete", "删除"],
          ["admin.example.import", "导入"]
        ]),
        menu("admin.industry", "行业知识", [
          ["admin.industry.view", "查看"],
          ["admin.industry.create", "新增"],
          ["admin.industry.edit", "编辑"],
          ["admin.industry.delete", "删除"]
        ])
      ]
    },
    {
      id: "group.operation",
      scope: "admin",
      title: "运营管理",
      menus: [
        menu("admin.feedback", "反馈管理", [
          ["admin.feedback.search", "查询"],
          ["admin.feedback.process", "处理"],
          ["admin.feedback.view", "查看"]
        ]),
        menu("admin.deposit", "指标沉淀", [
          ["admin.deposit.search", "查询"],
          ["admin.deposit.process", "处理"],
          ["admin.deposit.view", "查看"]
        ])
      ]
    },
    {
      id: "group.system",
      scope: "admin",
      title: "系统管理",
      menus: [
        menu("admin.user", "用户管理", [
          ["admin.user.search", "查询"],
          ["admin.user.create", "新增用户"],
          ["admin.user.edit", "编辑用户"],
          ["admin.user.disable", "禁用用户"],
          ["admin.user.bindRole", "绑定角色"]
        ]),
        menu("admin.role", "角色管理", [
          ["admin.role.view", "查看"],
          ["admin.role.create", "新增角色"],
          ["admin.role.rename", "重命名"],
          ["admin.role.delete", "删除角色"],
          ["admin.role.save", "保存权限"]
        ])
      ]
    }
  ];

  const functionBlocks = [
    {
      id: "block.biz",
      title: "业务端",
      children: functionGroups.filter((group) => group.scope === "biz")
    },
    {
      id: "block.admin",
      title: "管理后台",
      children: functionGroups.filter((group) => group.scope === "admin")
    }
  ];

  function menu(id, name, actions) {
    return { id, name, actions };
  }

  const topics = [
    { id: "topic.sales", name: "销售分析", desc: "销售额、订单量、区域、渠道与商品销售表现", models: 4 },
    { id: "topic.customer", name: "客户分析", desc: "客户分层、复购、留存、行业与区域分布", models: 3 },
    { id: "topic.inventory", name: "库存分析", desc: "库存快照、周转、滞销、仓库与 SKU 结构", models: 3 },
    { id: "topic.finance", name: "财务分析", desc: "应收、回款、服务费、账期与财务期间", models: 2 },
    { id: "topic.management", name: "经营概览", desc: "经营指标、趋势对比、关键问题追踪", models: 5 },
    { id: "topic.purchase", name: "采购分析", desc: "采购订单、供应商、到货及时率与采购成本", models: 2 }
  ];

  const dimensionCatalog = [
    multiDimension("dim.region", "地区维度", "数据模型 / 销售区域维度", ["大区", "省份", "城市"], [
      node("dim.region.east", "华东大区", [
        node("dim.region.east.sh", "上海市", [node("dim.region.east.sh.pudong", "浦东新区"), node("dim.region.east.sh.minhang", "闵行区")]),
        node("dim.region.east.zj", "浙江省", [node("dim.region.east.zj.hz", "杭州市"), node("dim.region.east.zj.nb", "宁波市")]),
        node("dim.region.east.js", "江苏省", [node("dim.region.east.js.nj", "南京市"), node("dim.region.east.js.sz", "苏州市")])
      ]),
      node("dim.region.south", "华南大区", [
        node("dim.region.south.gd", "广东省", [node("dim.region.south.gd.gz", "广州市"), node("dim.region.south.gd.sz", "深圳市")]),
        node("dim.region.south.fj", "福建省", [node("dim.region.south.fj.fz", "福州市"), node("dim.region.south.fj.xm", "厦门市")])
      ]),
      node("dim.region.north", "华北大区", [
        node("dim.region.north.bj", "北京市", [node("dim.region.north.bj.cy", "朝阳区"), node("dim.region.north.bj.hd", "海淀区")]),
        node("dim.region.north.tj", "天津市", [node("dim.region.north.tj.hp", "和平区"), node("dim.region.north.tj.bh", "滨海新区")])
      ])
    ]),
    multiDimension("dim.org", "组织架构", "指标体系 / 组织维度", ["集团", "中心", "部门", "小组"], [
      node("dim.org.group", "集团总部", [
        node("dim.org.data", "数据中心", [
          node("dim.org.data.model", "模型管理部", [node("dim.org.data.model.a", "模型一组"), node("dim.org.data.model.b", "模型二组")]),
          node("dim.org.data.ops", "数据运营部", [node("dim.org.data.ops.a", "运营一组"), node("dim.org.data.ops.b", "运营二组")])
        ]),
        node("dim.org.sales", "销售中心", [
          node("dim.org.sales.east", "华东销售部", [node("dim.org.sales.east.a", "华东一组"), node("dim.org.sales.east.b", "华东二组")]),
          node("dim.org.sales.south", "华南销售部", [node("dim.org.sales.south.a", "华南一组"), node("dim.org.sales.south.b", "华南二组")])
        ])
      ])
    ]),
    singleDimension("dim.channel", "渠道类型", "数据模型 / 渠道维度", [
      ["dim.channel.official", "官网商城"],
      ["dim.channel.tmall", "天猫旗舰店"],
      ["dim.channel.store", "直营门店"],
      ["dim.channel.partner", "经销商"],
      ["dim.channel.live", "直播渠道"],
      ["dim.channel.app", "移动 App"]
    ]),
    singleDimension("dim.customerLevel", "客户等级", "指标体系 / 客户等级维度", [
      ["dim.customerLevel.v1", "V1 普通客户"],
      ["dim.customerLevel.v2", "V2 成长客户"],
      ["dim.customerLevel.v3", "V3 重点客户"],
      ["dim.customerLevel.v4", "V4 战略客户"],
      ["dim.customerLevel.v5", "V5 核心客户"]
    ]),
    multiDimension("dim.category", "商品类目", "数据模型 / 产品维度", ["一级类目", "二级类目", "三级类目"], [
      node("dim.category.electronics", "电子产品", [
        node("dim.category.electronics.audio", "音频设备", [node("dim.category.electronics.audio.speaker", "智能音箱"), node("dim.category.electronics.audio.headset", "蓝牙耳机")]),
        node("dim.category.electronics.office", "办公设备", [node("dim.category.electronics.office.printer", "打印机"), node("dim.category.electronics.office.projector", "投影仪")])
      ]),
      node("dim.category.service", "服务产品", [
        node("dim.category.service.support", "技术支持", [node("dim.category.service.support.standard", "标准支持"), node("dim.category.service.support.vip", "专属支持")]),
        node("dim.category.service.training", "培训服务", [node("dim.category.service.training.online", "线上培训"), node("dim.category.service.training.offline", "线下培训")])
      ])
    ])
  ];

  function singleDimension(id, name, source, values) {
    return { id, name, source, type: "single", values: values.map((item) => ({ id: item[0], name: item[1] })) };
  }

  function multiDimension(id, name, source, levels, tree) {
    return { id, name, source, type: "multi", levels, tree };
  }

  function node(id, name, children) {
    return { id, name, children: children || [] };
  }

  function buildDimensionConfigs(ids) {
    return ids.reduce((map, id) => {
      const dim = findDimension(id);
      if (dim) map[id] = createDimensionConfig(dim, true);
      return map;
    }, {});
  }

  function createDimensionConfig(dim, checked) {
    return {
      id: dim.id,
      level: dim.type === "multi" ? dim.levels.length : 1,
      selected: new Set(checked ? getDimensionValueIds(dim) : [])
    };
  }

  function findDimension(id) {
    return dimensionCatalog.find((dim) => dim.id === id) || null;
  }

  function getDimensionValueIds(dim) {
    if (!dim) return [];
    if (dim.type === "single") return dim.values.map((item) => item.id);
    return flattenDimensionNodes(dim.tree).map((item) => item.id);
  }

  function flattenDimensionNodes(nodes, level) {
    return (nodes || []).flatMap((item) => [
      { id: item.id, name: item.name, level: level || 1, children: item.children || [] },
      ...flattenDimensionNodes(item.children || [], (level || 1) + 1)
    ]);
  }

  const modelDomains = [
    {
      id: "d_sales",
      name: "销售域",
      sources: [
        {
          id: "s_sales_prod",
          name: "销售业务库",
          type: "MySQL",
          tables: [
            table("s_sales_prod.sales_order", "sales_order", "销售订单", "销售订单主表", "fact", [
              field("s_sales_prod.sales_order.order_id", "order_id", "订单ID", "BIGINT", "pk"),
              field("s_sales_prod.sales_order.customer_id", "customer_id", "客户ID", "BIGINT", "fk"),
              field("s_sales_prod.sales_order.product_id", "product_id", "产品ID", "BIGINT", "fk"),
              field("s_sales_prod.sales_order.channel_id", "channel_id", "渠道ID", "BIGINT", "fk"),
              field("s_sales_prod.sales_order.order_date", "order_date", "订单日期", "DATE"),
              field("s_sales_prod.sales_order.region", "region", "销售区域", "VARCHAR(32)"),
              field("s_sales_prod.sales_order.sales_amount", "sales_amount", "销售金额", "DECIMAL(12,2)"),
              field("s_sales_prod.sales_order.quantity", "quantity", "数量", "INT")
            ]),
            table("s_sales_prod.sales_order_item", "sales_order_item", "订单明细", "销售订单明细", "fact", [
              field("s_sales_prod.sales_order_item.item_id", "item_id", "明细ID", "BIGINT", "pk"),
              field("s_sales_prod.sales_order_item.order_id", "order_id", "订单ID", "BIGINT", "fk"),
              field("s_sales_prod.sales_order_item.product_id", "product_id", "产品ID", "BIGINT", "fk"),
              field("s_sales_prod.sales_order_item.price", "price", "单价", "DECIMAL(12,2)"),
              field("s_sales_prod.sales_order_item.qty", "qty", "数量", "INT"),
              field("s_sales_prod.sales_order_item.amount", "amount", "金额", "DECIMAL(12,2)")
            ]),
            table("s_sales_prod.customer", "customer", "客户", "客户主表", "dim", [
              field("s_sales_prod.customer.customer_id", "customer_id", "客户ID", "BIGINT", "pk"),
              field("s_sales_prod.customer.customer_name", "customer_name", "客户名称", "VARCHAR(64)"),
              field("s_sales_prod.customer.industry", "industry", "所属行业", "VARCHAR(32)"),
              field("s_sales_prod.customer.city", "city", "城市", "VARCHAR(32)"),
              field("s_sales_prod.customer.vip_level", "vip_level", "VIP等级", "VARCHAR(8)"),
              field("s_sales_prod.customer.register_date", "register_date", "注册日期", "DATE")
            ]),
            table("s_sales_prod.product", "product", "产品", "产品维度", "dim", [
              field("s_sales_prod.product.product_id", "product_id", "产品ID", "VARCHAR(16)", "pk"),
              field("s_sales_prod.product.product_name", "product_name", "产品名称", "VARCHAR(64)"),
              field("s_sales_prod.product.category", "category", "类目", "VARCHAR(32)"),
              field("s_sales_prod.product.unit_price", "unit_price", "标准单价", "DECIMAL(12,2)")
            ]),
            table("s_sales_prod.channel", "channel", "渠道", "销售渠道维度", "dim", [
              field("s_sales_prod.channel.channel_id", "channel_id", "渠道ID", "VARCHAR(16)", "pk"),
              field("s_sales_prod.channel.channel_name", "channel_name", "渠道名称", "VARCHAR(32)"),
              field("s_sales_prod.channel.channel_type", "channel_type", "渠道类型", "VARCHAR(16)")
            ]),
            table("s_sales_prod.region_dim", "region_dim", "销售区域", "销售区域维度", "dim", [
              field("s_sales_prod.region_dim.region_code", "region_code", "区域编码", "VARCHAR(8)", "pk"),
              field("s_sales_prod.region_dim.region_name", "region_name", "区域名称", "VARCHAR(32)"),
              field("s_sales_prod.region_dim.manager", "manager", "区域负责人", "VARCHAR(32)")
            ])
          ]
        },
        {
          id: "s_order_svc",
          name: "订单服务库",
          type: "MySQL",
          tables: [
            table("s_order_svc.order_pay", "order_pay", "订单支付", "订单支付流水", "fact", [
              field("s_order_svc.order_pay.pay_id", "pay_id", "支付ID", "BIGINT", "pk"),
              field("s_order_svc.order_pay.order_id", "order_id", "订单ID", "BIGINT", "fk"),
              field("s_order_svc.order_pay.pay_channel", "pay_channel", "支付渠道", "VARCHAR(16)", "fk"),
              field("s_order_svc.order_pay.pay_amount", "pay_amount", "支付金额", "DECIMAL(12,2)"),
              field("s_order_svc.order_pay.pay_time", "pay_time", "支付时间", "DATETIME")
            ]),
            table("s_order_svc.pay_channel_dim", "pay_channel_dim", "支付渠道", "支付渠道维度", "dim", [
              field("s_order_svc.pay_channel_dim.channel_code", "channel_code", "渠道编码", "VARCHAR(16)", "pk"),
              field("s_order_svc.pay_channel_dim.channel_name", "channel_name", "渠道名称", "VARCHAR(32)")
            ])
          ]
        }
      ]
    },
    {
      id: "d_customer",
      name: "客户域",
      sources: [
        {
          id: "s_customer_dw",
          name: "客户数据仓库",
          type: "PostgreSQL",
          tables: [
            table("s_customer_dw.customer", "customer", "客户", "客户主表", "dim", [
              field("s_customer_dw.customer.customer_id", "customer_id", "客户ID", "BIGINT", "pk"),
              field("s_customer_dw.customer.customer_name", "customer_name", "客户名称", "VARCHAR(64)"),
              field("s_customer_dw.customer.industry", "industry", "行业", "VARCHAR(32)"),
              field("s_customer_dw.customer.register_date", "register_date", "注册日期", "DATE")
            ]),
            table("s_customer_dw.customer_tag", "customer_tag", "客户标签", "客户标签桥接表", "bridge", [
              field("s_customer_dw.customer_tag.customer_id", "customer_id", "客户ID", "BIGINT", "pk"),
              field("s_customer_dw.customer_tag.tag_code", "tag_code", "标签编码", "VARCHAR(32)", "pk"),
              field("s_customer_dw.customer_tag.tag_value", "tag_value", "标签值", "VARCHAR(64)")
            ]),
            table("s_customer_dw.customer_segment", "customer_segment", "客户分群", "客户分群", "dim", [
              field("s_customer_dw.customer_segment.segment_id", "segment_id", "分群ID", "INT", "pk"),
              field("s_customer_dw.customer_segment.segment_name", "segment_name", "分群名称", "VARCHAR(32)"),
              field("s_customer_dw.customer_segment.description", "description", "分群描述", "VARCHAR(128)")
            ])
          ]
        }
      ]
    },
    {
      id: "d_inventory",
      name: "库存域",
      sources: [
        {
          id: "s_inventory",
          name: "库存分析库",
          type: "Oracle",
          tables: [
            table("s_inventory.inventory_snapshot", "inventory_snapshot", "库存快照", "库存快照事实表", "fact", [
              field("s_inventory.inventory_snapshot.sku_id", "sku_id", "SKU", "VARCHAR(32)", "fk"),
              field("s_inventory.inventory_snapshot.warehouse_id", "warehouse_id", "仓库ID", "VARCHAR(32)", "fk"),
              field("s_inventory.inventory_snapshot.stock_qty", "stock_qty", "库存数量", "DECIMAL(12,2)"),
              field("s_inventory.inventory_snapshot.stock_days", "stock_days", "库存天数", "INT"),
              field("s_inventory.inventory_snapshot.snapshot_date", "snapshot_date", "快照日期", "DATE")
            ]),
            table("s_inventory.warehouse_dim", "warehouse_dim", "仓库维度", "仓库维度表", "dim", [
              field("s_inventory.warehouse_dim.warehouse_id", "warehouse_id", "仓库ID", "VARCHAR(32)", "pk"),
              field("s_inventory.warehouse_dim.warehouse_name", "warehouse_name", "仓库名称", "VARCHAR(64)"),
              field("s_inventory.warehouse_dim.city", "city", "城市", "VARCHAR(32)")
            ])
          ]
        }
      ]
    },
    {
      id: "d_finance",
      name: "财务域",
      sources: [
        {
          id: "s_finance",
          name: "财务核算库",
          type: "SQLServer",
          tables: [
            table("s_finance.platform_service_fee_detail", "platform_service_fee_detail", "平台服务费明细", "平台服务费明细表", "fact", [
              field("s_finance.platform_service_fee_detail.project_id", "project_id", "项目ID", "VARCHAR(32)", "fk"),
              field("s_finance.platform_service_fee_detail.service_fee_amount", "service_fee_amount", "服务费金额", "DECIMAL(12,2)"),
              field("s_finance.platform_service_fee_detail.received_fee", "received_fee", "已回款服务费", "DECIMAL(12,2)"),
              field("s_finance.platform_service_fee_detail.payable_fee", "payable_fee", "应回款服务费", "DECIMAL(12,2)"),
              field("s_finance.platform_service_fee_detail.service_fee_collection_time", "service_fee_collection_time", "回款时间", "DATETIME")
            ]),
            table("s_finance.gl_detail", "gl_detail", "总账明细", "总账明细表", "fact", [
              field("s_finance.gl_detail.account_id", "account_id", "科目ID", "VARCHAR(32)", "fk"),
              field("s_finance.gl_detail.amount", "amount", "金额", "DECIMAL(12,2)"),
              field("s_finance.gl_detail.period", "period", "财务期间", "VARCHAR(16)")
            ])
          ]
        }
      ]
    }
  ];

  function table(id, name, alias, comment, type, fields) {
    return { id, name, alias, comment, type, fields };
  }

  function field(id, name, alias, type, tag) {
    return { id, name, alias, type, tag: tag || "" };
  }

  const modelTree = modelDomains.flatMap((domain) => domain.sources);

  const allFunctionIds = functionGroups.flatMap((group) => functionGroupIds(group));
  const businessFunctionIds = functionGroups
    .filter((group) => group.scope === "biz")
    .flatMap((group) => functionGroupIds(group));
  const allTopicIds = topics.map((topic) => topic.id);
  const allModelIds = modelTree.flatMap((db) => [
    db.id,
    ...db.tables.flatMap((table) => [table.id, ...table.fields.map((field) => field.id)])
  ]);

  function functionGroupIds(group) {
    return [
      group.id,
      ...group.menus.flatMap((item) => [item.id, ...item.actions.map((action) => action[0])])
    ];
  }

  function functionBlockIds(block) {
    return [
      block.id,
      ...block.children.flatMap((group) => functionGroupIds(group))
    ];
  }

  let roleSeq = 4;
  let roles = [
    makeRole("r1", "业务分析师", "业务端完整使用权限", 18, businessFunctionIds, allTopicIds.slice(0, 4), allModelIds, ["dim.region", "dim.channel", "dim.customerLevel"]),
    makeRole("r2", "运营管理员", "运营后台与业务端权限", 4, allFunctionIds, allTopicIds, allModelIds, ["dim.region", "dim.org", "dim.channel", "dim.customerLevel", "dim.category"]),
    makeRole("r3", "系统管理员", "系统配置与全域权限", 2, allFunctionIds, allTopicIds, allModelIds, ["dim.region", "dim.org", "dim.channel", "dim.customerLevel", "dim.category"])
  ];
  let activeRoleId = "r1";
  let activeTab = "function";
  let modelView = {
    sourceId: "s_sales_prod",
    tableId: "s_sales_prod.sales_order",
    sourceQuery: "",
    tableQuery: "",
    fieldQuery: ""
  };
  const collapsedDomains = new Set(["d_customer", "d_inventory", "d_finance"]);
  let activeDimensionId = "dim.region";
  let dimensionFilters = { name: "", status: "all" };
  let pendingDimensionDeleteId = null;
  let ctxRoleId = null;
  let deleteRoleId = null;

  function makeRole(id, name, desc, users, functions, topicPerms, models, dimensionIds) {
    return {
      id,
      name,
      desc,
      users,
      functions: new Set(functions),
      topics: new Set(topicPerms),
      models: new Set(models),
      dimensions: buildDimensionConfigs(dimensionIds || [])
    };
  }

  function escapeHTML(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function currentRole() {
    return roles.find((role) => role.id === activeRoleId) || roles[0];
  }

  function roleInitial(name) {
    return String(name || "新").trim().slice(0, 1) || "新";
  }

  function renderRoles(editRoleId) {
    const list = $("roleList");
    if (!list) return;
    list.innerHTML = roles.map((role) => {
      const active = role.id === activeRoleId ? " is-active" : "";
      const nameHTML = editRoleId === role.id
        ? '<input class="role-name-input" data-role-name-input="' + role.id + '" value="' + escapeHTML(role.name) + '" />'
        : '<span class="role-name" title="' + escapeHTML(role.name) + '">' + escapeHTML(role.name) + '</span>';
      return [
        '<button type="button" class="role-item' + active + '" data-role-id="' + role.id + '">',
        '<span class="role-avatar">' + escapeHTML(roleInitial(role.name)) + '</span>',
        '<span class="role-meta">',
        nameHTML,
        '<span class="role-desc" title="' + escapeHTML(role.desc) + '">' + escapeHTML(role.desc) + '</span>',
        '</span>',
        '<span class="role-badge">' + role.users + '人</span>',
        '</button>'
      ].join("");
    }).join("");

    if (editRoleId) {
      const input = list.querySelector('[data-role-name-input="' + editRoleId + '"]');
      if (input) {
        input.focus();
        input.select();
      }
    }
  }

  function renderAll(editRoleId) {
    const role = currentRole();
    const roleName = $("selectedRoleName");
    if (roleName) roleName.textContent = role ? role.name : "";
    renderRoles(editRoleId);
    renderPermission();
  }

  function renderPermission() {
    const body = $("rolePermBody");
    if (!body) return;
    const role = currentRole();
    if (!role) {
      body.innerHTML = "";
      return;
    }
    if (activeTab === "function") body.innerHTML = renderFunction(role);
    if (activeTab === "theme") body.innerHTML = renderTopics(role);
    if (activeTab === "model") body.innerHTML = renderModels(role);
    if (activeTab === "dimension") body.innerHTML = renderDimension();
  }

  function renderFunction(role) {
    return '<div class="function-permission-list">' + functionBlocks.map((block) => {
      return [
        '<section class="function-block">',
        '<label class="function-block-head">',
        '<input type="checkbox" data-perm-kind="function" data-perm-id="' + block.id + '"' + (isFunctionChecked(role, block.id) ? " checked" : "") + ' />',
        '<strong>' + escapeHTML(block.title) + '</strong>',
        '</label>',
        '<div class="function-block-body">',
        block.id === "block.biz"
          ? '<div class="function-menu-list is-flat">' + block.children.flatMap((group) => group.menus).map((item) => renderFunctionMenu(role, item)).join("") + '</div>'
          : block.children.map((group) => renderFunctionGroup(role, group)).join(""),
        '</div>',
        '</section>'
      ].join("");
    }).join("") + '</div>';
  }

  function renderFunctionGroup(role, group) {
    return [
      '<div class="function-group">',
      '<label class="function-group-head">',
      '<span class="function-caret">' + chevronIconHTML() + '</span>',
      '<input type="checkbox" data-perm-kind="function" data-perm-id="' + group.id + '"' + (isFunctionChecked(role, group.id) ? " checked" : "") + ' />',
      '<strong>' + escapeHTML(group.title) + '</strong>',
      '</label>',
      '<div class="function-menu-list">',
      group.menus.map((item) => renderFunctionMenu(role, item)).join(""),
      '</div>',
      '</div>'
    ].join("");
  }

  function renderFunctionMenu(role, item) {
    return [
      '<div class="function-menu-row">',
      '<label class="function-menu-check">',
      '<input type="checkbox" data-perm-kind="function" data-perm-id="' + item.id + '"' + (isFunctionChecked(role, item.id) ? " checked" : "") + ' />',
      '<span title="' + escapeHTML(item.name) + '">' + escapeHTML(item.name) + '</span>',
      '</label>',
      '<div class="function-action-list">',
      item.actions.map((action) => {
        return [
          '<label class="function-action-check">',
          '<input type="checkbox" data-perm-kind="function" data-perm-id="' + action[0] + '"' + (role.functions.has(action[0]) ? " checked" : "") + ' />',
          '<span title="' + escapeHTML(action[1]) + '">' + escapeHTML(action[1]) + '</span>',
          '</label>'
        ].join("");
      }).join(""),
      '</div>',
      '</div>'
    ].join("");
  }

  function isFunctionChecked(role, id) {
    const ids = findFunctionBranchIds(id);
    return ids.length ? ids.every((itemId) => role.functions.has(itemId)) : role.functions.has(id);
  }

  function renderTopics(role) {
    return '<div class="topic-list">' + topics.map((topic) => {
      return [
        '<label class="topic-row">',
        '<span>',
        '<h3 title="' + escapeHTML(topic.name) + '">' + escapeHTML(topic.name) + '</h3>',
        '<p>' + escapeHTML(topic.desc) + '</p>',
        '<span class="topic-meta">关联模型 ' + topic.models + ' 个</span>',
        '</span>',
        '<input type="checkbox" data-perm-kind="theme" data-perm-id="' + topic.id + '"' + (role.topics.has(topic.id) ? " checked" : "") + ' />',
        '</label>'
      ].join("");
    }).join("") + '</div>';
  }

  function renderModels(role) {
    ensureModelSelection();
    return [
      '<div class="model-permission-board">',
      renderModelColumn("source", "数据源", renderSourceTree(role)),
      renderModelColumn("table", "表", renderTableList(role)),
      renderModelColumn("field", "字段", renderFieldList(role)),
      '</div>'
    ].join("");
  }

  function renderModelColumn(kind, title, content) {
    return [
      '<section class="model-perm-col">',
      '<div class="model-perm-title"><span></span><strong>' + escapeHTML(title) + '</strong></div>',
      '<div class="model-perm-search">',
      '<button type="button">全部</button>',
      '<input type="text" data-model-filter="' + kind + '" value="' + escapeHTML(modelView[kind + "Query"] || "") + '" />',
      '<button type="button" class="model-search-btn" aria-label="查询">查</button>',
      '</div>',
      '<div class="model-perm-list model-perm-' + kind + '-list">' + content + '</div>',
      '</section>'
    ].join("");
  }

  function renderSourceTree(role) {
    const query = modelView.sourceQuery.trim().toLowerCase();
    const html = modelDomains.map((domain) => {
      const sources = domain.sources.filter((source) => !query || source.name.toLowerCase().indexOf(query) > -1 || domain.name.toLowerCase().indexOf(query) > -1);
      if (!sources.length && query) return "";
      const collapsed = collapsedDomains.has(domain.id) && !query;
      return [
        '<div class="model-domain' + (collapsed ? " is-collapsed" : "") + '">',
        '<button type="button" class="model-domain-row" data-model-domain="' + domain.id + '">',
        '<span class="model-caret">' + chevronIconHTML() + '</span><span class="dmt-icon">' + domainIconHTML() + '</span><span class="model-domain-name">' + escapeHTML(domain.name) + '</span>',
        '</button>',
        '<div class="model-source-children">',
        sources.map((source) => renderSourceRow(role, source)).join(""),
        '</div>',
        '</div>'
      ].join("");
    }).join("");
    return html || emptyModelList("暂无数据源");
  }

  function renderSourceRow(role, source) {
    const active = source.id === modelView.sourceId ? " is-active" : "";
    return [
      '<div class="model-source-row' + active + '" data-model-source="' + source.id + '">',
      '<div class="model-check" title="' + escapeHTML(source.name) + '">',
      '<input type="checkbox" data-perm-kind="model" data-perm-id="' + source.id + '"' + (role.models.has(source.id) ? " checked" : "") + ' />',
      '<span class="dmt-icon">' + sourceIconHTML() + '</span>',
      '<span class="model-source-name">' + escapeHTML(source.name) + '</span>',
      '<span class="model-source-type">' + escapeHTML(source.type || "") + '</span>',
      '</div>',
      '</div>'
    ].join("");
  }

  function renderTableList(role) {
    const source = findModelSource(modelView.sourceId);
    const query = modelView.tableQuery.trim().toLowerCase();
    if (!source) return emptyModelList("请选择数据源");
    const tables = source.tables.filter((tableItem) => !query || tableItem.name.toLowerCase().indexOf(query) > -1 || String(tableItem.comment || "").toLowerCase().indexOf(query) > -1);
    return tables.map((tableItem) => {
      const active = tableItem.id === modelView.tableId ? " is-active" : "";
      return [
        '<div class="model-flat-row' + active + '" data-model-table="' + tableItem.id + '">',
        '<div class="model-check" title="' + escapeHTML(tableLabel(tableItem)) + '">',
        '<input type="checkbox" data-perm-kind="model" data-perm-id="' + tableItem.id + '"' + (role.models.has(tableItem.id) ? " checked" : "") + ' />',
        '<span class="dmt-icon">' + tableIconHTML() + '</span>',
        '<span class="model-row-text">' + escapeHTML(tableLabel(tableItem)) + '</span>',
        '<span class="model-table-type">' + escapeHTML(tableItem.type) + '</span>',
        '</div>',
        '</div>'
      ].join("");
    }).join("") || emptyModelList("暂无表");
  }

  function renderFieldList(role) {
    const tableItem = findModelTable(modelView.tableId);
    const query = modelView.fieldQuery.trim().toLowerCase();
    if (!tableItem) return emptyModelList("请选择表");
    const fields = tableItem.fields.filter((fieldItem) => {
      const label = fieldLabel(fieldItem);
      return !query || label.toLowerCase().indexOf(query) > -1;
    });
    return fields.map((fieldItem) => {
      return [
        '<div class="model-flat-row">',
        '<div class="model-check" title="' + escapeHTML(fieldLabel(fieldItem)) + '">',
        '<input type="checkbox" data-perm-kind="model" data-perm-id="' + fieldItem.id + '"' + (role.models.has(fieldItem.id) ? " checked" : "") + ' />',
        '<span class="model-field-tag ' + (fieldItem.tag ? "is-" + fieldItem.tag : "") + '">' + escapeHTML(fieldItem.tag ? fieldItem.tag.toUpperCase() : "F") + '</span>',
        '<span class="model-row-text">' + escapeHTML(fieldLabel(fieldItem)) + '</span>',
        '<span class="model-field-type">' + escapeHTML(fieldItem.type) + '</span>',
        '</div>',
        '</div>'
      ].join("");
    }).join("") || emptyModelList("暂无字段");
  }

  function tableLabel(tableItem) {
    return tableItem.name + "（" + (tableItem.alias || tableItem.comment || tableItem.name) + "）";
  }

  function fieldLabel(fieldItem) {
    return fieldItem.name + "（" + (fieldItem.alias || fieldItem.name) + "）";
  }

  function sourceIconHTML() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5V12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5.5"/><path d="M5 12v6.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V12"/></svg>';
  }

  function domainIconHTML() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/></svg>';
  }

  function chevronIconHTML() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  }

  function tableIconHTML() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16"/><path d="M9 5v14"/></svg>';
  }

  function emptyModelList(text) {
    return '<div class="model-empty">' + escapeHTML(text) + '</div>';
  }

  function ensureModelSelection() {
    const source = findModelSource(modelView.sourceId) || modelTree[0];
    if (!source) return;
    modelView.sourceId = source.id;
    if (!source.tables.some((tableItem) => tableItem.id === modelView.tableId)) {
      modelView.tableId = source.tables[0] ? source.tables[0].id : "";
    }
  }

  function findModelSource(id) {
    return modelTree.find((source) => source.id === id) || null;
  }

  function findModelTable(id) {
    for (const source of modelTree) {
      const tableItem = source.tables.find((table) => table.id === id);
      if (tableItem) return tableItem;
    }
    return null;
  }

  function renderDimension() {
    const role = currentRole();
    const dimIds = Object.keys(role.dimensions || {});
    if (!dimIds.includes(activeDimensionId)) activeDimensionId = dimIds[0] || "";
    const activeDim = findDimension(activeDimensionId);
    const activeConfig = activeDim && role.dimensions[activeDim.id];
    return [
      '<div class="dimension-layout">',
      '<aside class="dimension-list-panel">',
      '<div class="dimension-list-head"><div><h3>维度列表</h3><p>来自指标体系中的维度数据</p></div><button type="button" class="primary-btn" data-act="open-dim-add">新增</button></div>',
      '<div class="dimension-list">',
      dimIds.length ? dimIds.map((id) => renderDimensionListItem(id)).join("") : '<div class="dimension-empty">暂无维度，请新增</div>',
      '</div>',
      '</aside>',
      '<section class="dimension-config-panel">',
      activeDim && activeConfig ? renderDimensionConfig(activeDim, activeConfig) : renderDimensionEmptyConfig(),
      '</section>',
      '</div>',
    ].join("");
  }

  function renderDimensionListItem(id) {
    const dim = findDimension(id);
    if (!dim) return "";
    return [
      '<button type="button" class="dimension-item' + (id === activeDimensionId ? " is-active" : "") + '" data-dim-id="' + id + '">',
      '<span class="dimension-item-main"><strong title="' + escapeHTML(dim.name) + '">' + escapeHTML(dim.name) + '</strong><em>' + escapeHTML(dim.source) + '</em></span>',
      '<span class="dimension-type-tag">' + (dim.type === "multi" ? "多维度" : "单维度") + '</span>',
      '<span class="dimension-delete" data-act="delete-dim" data-dim-id="' + id + '" title="删除">×</span>',
      '</button>'
    ].join("");
  }

  function renderDimensionEmptyConfig() {
    return '<div class="empty-permission"><div><h3>请选择维度</h3><p>点击左侧维度，或新增一个维度后进行数据授权。</p></div></div>';
  }

  function renderDimensionConfig(dim, config) {
    const total = getDimensionValueIds(dim).length;
    const checkedCount = config.selected.size;
    return [
      '<div class="dimension-config-head">',
      '<div><span class="eyebrow">维度数据配置</span><h3>' + escapeHTML(dim.name) + '</h3><p>' + escapeHTML(dim.source) + ' · ' + (dim.type === "multi" ? "多维度" : "单维度") + ' · 已选 ' + checkedCount + '/' + total + '</p></div>',
      '<label class="dimension-select-all"><input type="checkbox" data-perm-kind="dimension-all" data-perm-id="' + dim.id + '"' + (checkedCount && checkedCount === total ? " checked" : "") + ' /> 全选</label>',
      '</div>',
      '<div class="dimension-filter">',
      '<div class="dimension-field"><label>维度名称</label><input type="text" data-dim-filter="name" value="' + escapeHTML(dimensionFilters.name) + '" placeholder="输入维度名称" /></div>',
      '<div class="dimension-field"><label>状态</label><select data-dim-filter="status"><option value="all"' + (dimensionFilters.status === "all" ? " selected" : "") + '>全部</option><option value="checked"' + (dimensionFilters.status === "checked" ? " selected" : "") + '>已选</option><option value="unchecked"' + (dimensionFilters.status === "unchecked" ? " selected" : "") + '>未选</option></select></div>',
      dim.type === "multi" ? '<div class="dimension-field"><label>控制级别</label><select data-dim-level="' + dim.id + '">' + dim.levels.map((label, idx) => '<option value="' + (idx + 1) + '"' + (config.level === idx + 1 ? " selected" : "") + '>' + escapeHTML(label) + '</option>').join("") + '</select></div>' : '',
      '</div>',
      dim.type === "multi" ? renderDimensionTree(dim, config) : renderSingleDimensionValues(dim, config)
    ].join("");
  }

  function renderSingleDimensionValues(dim, config) {
    const keyword = dimensionFilters.name.trim().toLowerCase();
    const items = dim.values.filter((item) => filterDimensionNode(item.id, item.name, config, keyword));
    return '<div class="dimension-value-grid">' + (items.length ? items.map((item) => {
      return '<label class="dimension-value-card"><input type="checkbox" data-perm-kind="dimension" data-perm-id="' + dim.id + '::' + item.id + '"' + (config.selected.has(item.id) ? " checked" : "") + ' /><span title="' + escapeHTML(item.name) + '">' + escapeHTML(item.name) + '</span></label>';
    }).join("") : '<div class="dimension-empty full">暂无匹配数据</div>') + '</div>';
  }

  function renderDimensionTree(dim, config) {
    const keyword = dimensionFilters.name.trim().toLowerCase();
    const html = renderDimensionTreeNodes(dim.tree, dim, config, 1, keyword);
    return '<div class="dimension-tree">' + (html || '<div class="dimension-empty">暂无匹配数据</div>') + '</div>';
  }

  function renderDimensionTreeNodes(nodes, dim, config, level, keyword) {
    if (level > config.level) return "";
    return (nodes || []).map((item) => {
      const childHTML = renderDimensionTreeNodes(item.children || [], dim, config, level + 1, keyword);
      const matched = filterDimensionNode(item.id, item.name, config, keyword);
      if (!matched && !childHTML) return "";
      const hasChildren = !!childHTML;
      return [
        '<div class="dimension-tree-node">',
        '<label class="dimension-tree-row" style="--depth:' + (level - 1) + '">',
        '<span class="dimension-tree-caret">' + (hasChildren ? chevronIconHTML() : '') + '</span>',
        '<input type="checkbox" data-perm-kind="dimension" data-perm-id="' + dim.id + '::' + item.id + '"' + (config.selected.has(item.id) ? " checked" : "") + ' />',
        '<span title="' + escapeHTML(item.name) + '">' + escapeHTML(item.name) + '</span><em>' + escapeHTML(dim.levels[level - 1] || ("第" + level + "级")) + '</em>',
        '</label>',
        hasChildren ? '<div class="dimension-tree-children">' + childHTML + '</div>' : '',
        '</div>'
      ].join("");
    }).join("");
  }

  function filterDimensionNode(id, name, config, keyword) {
    const status = dimensionFilters.status;
    const textOk = !keyword || String(name || "").toLowerCase().indexOf(keyword) > -1;
    const checked = config.selected.has(id);
    const statusOk = status === "all" || (status === "checked" && checked) || (status === "unchecked" && !checked);
    return textOk && statusOk;
  }

  function renderCheck(kind, id, label, checked, className) {
    return [
      '<label class="' + (className || "permission-check") + '">',
      '<input type="checkbox" data-perm-kind="' + kind + '" data-perm-id="' + id + '"' + (checked ? " checked" : "") + ' />',
      '<span title="' + escapeHTML(label) + '">' + escapeHTML(label) + '</span>',
      '</label>'
    ].join("");
  }

  function checkedCount(set, items) {
    return items.reduce((count, item) => count + (set.has(item[0]) ? 1 : 0), 0);
  }

  function selectRole(roleId) {
    activeRoleId = roleId;
    renderAll();
  }

  function addRole() {
    const id = "r" + roleSeq++;
    const role = makeRole(id, "新建角色", "自定义权限角色", 0, [], [], []);
    roles.push(role);
    activeRoleId = id;
    renderAll(id);
  }

  function beginRename(roleId) {
    activeRoleId = roleId;
    hideCtx();
    renderAll(roleId);
  }

  function saveRename(input) {
    const roleId = input.getAttribute("data-role-name-input");
    const role = roles.find((item) => item.id === roleId);
    if (!role) return;
    const nextName = input.value.trim() || role.name;
    role.name = nextName;
    renderAll();
  }

  function openDelete(roleId) {
    const role = roles.find((item) => item.id === roleId);
    if (!role) return;
    deleteRoleId = roleId;
    hideCtx();
    const text = $("roleDeleteText");
    if (text) text.textContent = "确定删除“" + role.name + "”吗？删除后，该角色的权限配置将一并移除。";
    showModal("roleDeleteModal");
  }

  function confirmDelete() {
    if (!deleteRoleId || roles.length <= 1) {
      closeDeleteModal();
      return;
    }
    const index = roles.findIndex((role) => role.id === deleteRoleId);
    roles = roles.filter((role) => role.id !== deleteRoleId);
    if (activeRoleId === deleteRoleId) {
      const next = roles[Math.max(0, index - 1)] || roles[0];
      activeRoleId = next.id;
    }
    closeDeleteModal();
    renderAll();
  }

  function closeDeleteModal() {
    deleteRoleId = null;
    hideModal("roleDeleteModal");
  }

  function openDimensionAddModal() {
    const role = currentRole();
    const available = dimensionCatalog.filter((dim) => !role.dimensions[dim.id]);
    const list = $("roleDimAddList");
    if (list) {
      list.innerHTML = available.length ? available.map((dim, idx) => {
        return [
          '<label class="dimension-pick-row">',
          '<input type="radio" name="roleDimPick" value="' + dim.id + '"' + (idx === 0 ? " checked" : "") + ' />',
          '<span><strong>' + escapeHTML(dim.name) + '</strong><em>' + escapeHTML(dim.source) + '</em></span>',
          '<b>' + (dim.type === "multi" ? "多维度" : "单维度") + '</b>',
          '</label>'
        ].join("");
      }).join("") : '<div class="dimension-empty">暂无可新增维度</div>';
    }
    showModal("roleDimAddModal");
  }

  function confirmDimensionAdd() {
    const role = currentRole();
    const picked = document.querySelector('input[name="roleDimPick"]:checked');
    if (!picked) return;
    const dim = findDimension(picked.value);
    if (!dim || role.dimensions[dim.id]) return;
    role.dimensions[dim.id] = createDimensionConfig(dim, false);
    activeDimensionId = dim.id;
    dimensionFilters = { name: "", status: "all" };
    hideModal("roleDimAddModal");
    renderPermission();
  }

  function openDimensionDelete(dimId) {
    const dim = findDimension(dimId);
    if (!dim) return;
    pendingDimensionDeleteId = dimId;
    const text = $("roleDimDeleteText");
    if (text) text.textContent = "确定删除“" + dim.name + "”吗？删除后，该维度的数据权限配置将一并移除。";
    showModal("roleDimDeleteModal");
  }

  function confirmDimensionDelete() {
    const role = currentRole();
    if (pendingDimensionDeleteId && role.dimensions[pendingDimensionDeleteId]) {
      delete role.dimensions[pendingDimensionDeleteId];
      const ids = Object.keys(role.dimensions);
      activeDimensionId = ids[0] || "";
    }
    pendingDimensionDeleteId = null;
    hideModal("roleDimDeleteModal");
    renderPermission();
  }

  function showModal(id) {
    const modal = $(id);
    if (modal) modal.classList.remove("hidden");
  }

  function hideModal(id) {
    const modal = $(id);
    if (modal) modal.classList.add("hidden");
  }

  function showCtx(event, roleId) {
    const menu = $("roleCtxMenu");
    if (!menu) return;
    ctxRoleId = roleId;
    activeRoleId = roleId;
    renderAll();
    const width = 132;
    const height = 118;
    const left = Math.min(event.clientX, window.innerWidth - width - 8);
    const top = Math.min(event.clientY, window.innerHeight - height - 8);
    menu.style.left = Math.max(8, left) + "px";
    menu.style.top = Math.max(8, top) + "px";
    menu.classList.remove("hidden");
  }

  function hideCtx() {
    const menu = $("roleCtxMenu");
    if (menu) menu.classList.add("hidden");
  }

  function togglePermission(kind, id, checked) {
    const role = currentRole();
    if (!role) return;
    if (kind === "function") {
      updateFunctionPermission(role, id, checked);
      renderPermission();
    }
    if (kind === "theme") updateSet(role.topics, id, checked);
    if (kind === "model") {
      updateModelPermission(role, id, checked);
      renderPermission();
    }
    if (kind === "dimension") {
      updateDimensionPermission(role, id, checked);
      renderPermission();
    }
    if (kind === "dimension-all") {
      updateDimensionAll(role, id, checked);
      renderPermission();
    }
  }

  function updateSet(set, id, checked) {
    if (checked) set.add(id);
    else set.delete(id);
  }

  function updateFunctionPermission(role, id, checked) {
    const ids = findFunctionBranchIds(id);
    (ids.length ? ids : [id]).forEach((itemId) => updateSet(role.functions, itemId, checked));
  }

  function findFunctionBranchIds(id) {
    for (const block of functionBlocks) {
      if (block.id === id) return functionBlockIds(block);
    }
    for (const group of functionGroups) {
      if (group.id === id) return functionGroupIds(group);
      for (const item of group.menus) {
        if (item.id === id) return [item.id, ...item.actions.map((action) => action[0])];
        if (item.actions.some((action) => action[0] === id)) return [id];
      }
    }
    return [id];
  }

  function updateModelPermission(role, id, checked) {
    const ids = findModelBranchIds(id);
    ids.forEach((itemId) => updateSet(role.models, itemId, checked));
  }

  function findModelBranchIds(id) {
    for (const db of modelTree) {
      if (db.id === id) {
        return [db.id, ...db.tables.flatMap((table) => [table.id, ...table.fields.map((fieldItem) => fieldItem.id)])];
      }
      for (const table of db.tables) {
        if (table.id === id) return [table.id, ...table.fields.map((fieldItem) => fieldItem.id)];
        if (table.fields.some((fieldItem) => fieldItem.id === id)) return [id];
      }
    }
    return [id];
  }

  function updateDimensionPermission(role, payload, checked) {
    const parts = String(payload || "").split("::");
    const dimId = parts[0], nodeId = parts[1];
    const config = role.dimensions[dimId];
    const dim = findDimension(dimId);
    if (!config || !dim || !nodeId) return;
    const ids = dim.type === "multi" ? findDimensionBranchIds(dim, nodeId, config.level) : [nodeId];
    ids.forEach((id) => updateSet(config.selected, id, checked));
  }

  function updateDimensionAll(role, dimId, checked) {
    const config = role.dimensions[dimId];
    const dim = findDimension(dimId);
    if (!config || !dim) return;
    getDimensionValueIds(dim).forEach((id) => updateSet(config.selected, id, checked));
  }

  function findDimensionBranchIds(dim, nodeId, maxLevel) {
    const found = findDimensionNodePath(dim.tree, nodeId, 1);
    if (!found) return [nodeId];
    return flattenDimensionNodes([found.node], found.level)
      .filter((item) => item.level <= maxLevel)
      .map((item) => item.id);
  }

  function findDimensionNodePath(nodes, nodeId, level) {
    for (const item of nodes || []) {
      if (item.id === nodeId) return { node: item, level };
      const child = findDimensionNodePath(item.children || [], nodeId, level + 1);
      if (child) return child;
    }
    return null;
  }

  function bindEvents() {
    const addBtn = $("roleAddBtn");
    if (addBtn) addBtn.addEventListener("click", addRole);

    const roleList = $("roleList");
    if (roleList) {
      roleList.addEventListener("click", (event) => {
        const input = event.target.closest(".role-name-input");
        if (input) return;
        const item = event.target.closest(".role-item");
        if (item) selectRole(item.getAttribute("data-role-id"));
      });
      roleList.addEventListener("contextmenu", (event) => {
        const item = event.target.closest(".role-item");
        if (!item) return;
        event.preventDefault();
        showCtx(event, item.getAttribute("data-role-id"));
      });
      roleList.addEventListener("blur", (event) => {
        if (event.target.matches(".role-name-input")) saveRename(event.target);
      }, true);
      roleList.addEventListener("keydown", (event) => {
        if (!event.target.matches(".role-name-input")) return;
        if (event.key === "Enter") event.target.blur();
        if (event.key === "Escape") renderAll();
      });
    }

    const ctx = $("roleCtxMenu");
    if (ctx) {
      ctx.addEventListener("click", (event) => {
        const btn = event.target.closest("button[data-action]");
        if (!btn) return;
        const action = btn.getAttribute("data-action");
        if (action === "add") addRole();
        if (action === "rename" && ctxRoleId) beginRename(ctxRoleId);
        if (action === "delete" && ctxRoleId) openDelete(ctxRoleId);
      });
    }

    document.addEventListener("click", (event) => {
      if (!event.target.closest("#roleCtxMenu")) hideCtx();
    });

    document.querySelectorAll(".permission-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.getAttribute("data-tab");
        document.querySelectorAll(".permission-tab").forEach((item) => {
          const isActive = item === btn;
          item.classList.toggle("is-active", isActive);
          item.setAttribute("aria-selected", isActive ? "true" : "false");
        });
        renderPermission();
      });
    });

    const body = $("rolePermBody");
    if (body) {
      body.addEventListener("click", (event) => {
        if (event.target.closest("input[type='checkbox']")) return;
        const dimAdd = event.target.closest('[data-act="open-dim-add"]');
        if (dimAdd) { openDimensionAddModal(); return; }
        const dimDelete = event.target.closest('[data-act="delete-dim"]');
        if (dimDelete) {
          openDimensionDelete(dimDelete.getAttribute("data-dim-id"));
          return;
        }
        const dimItem = event.target.closest("[data-dim-id].dimension-item");
        if (dimItem) {
          activeDimensionId = dimItem.getAttribute("data-dim-id");
          dimensionFilters = { name: "", status: "all" };
          renderPermission();
          return;
        }
        const domainBtn = event.target.closest("[data-model-domain]");
        if (domainBtn) {
          const domainId = domainBtn.getAttribute("data-model-domain");
          if (collapsedDomains.has(domainId)) collapsedDomains.delete(domainId);
          else collapsedDomains.add(domainId);
          renderPermission();
          return;
        }
        const sourceRow = event.target.closest("[data-model-source]");
        if (sourceRow) {
          const sourceId = sourceRow.getAttribute("data-model-source");
          if (sourceId !== modelView.sourceId) {
            modelView.sourceId = sourceId;
            const source = findModelSource(sourceId);
            modelView.tableId = source && source.tables[0] ? source.tables[0].id : "";
            modelView.tableQuery = "";
            modelView.fieldQuery = "";
            renderPermission();
          }
          return;
        }
        const tableRow = event.target.closest("[data-model-table]");
        if (tableRow) {
          const tableId = tableRow.getAttribute("data-model-table");
          if (tableId !== modelView.tableId) {
            modelView.tableId = tableId;
            modelView.fieldQuery = "";
            renderPermission();
          }
        }
      });
      body.addEventListener("change", (event) => {
        const input = event.target.closest("input[type='checkbox'][data-perm-kind]");
        if (!input) return;
        togglePermission(input.getAttribute("data-perm-kind"), input.getAttribute("data-perm-id"), input.checked);
      });
      body.addEventListener("change", (event) => {
        const level = event.target.closest("select[data-dim-level]");
        if (level) {
          const role = currentRole();
          const dimId = level.getAttribute("data-dim-level");
          if (role.dimensions[dimId]) role.dimensions[dimId].level = Number(level.value) || 1;
          renderPermission();
          return;
        }
        const filter = event.target.closest("select[data-dim-filter]");
        if (filter) {
          dimensionFilters[filter.getAttribute("data-dim-filter")] = filter.value;
          renderPermission();
        }
      });
      body.addEventListener("input", (event) => {
        const input = event.target.closest("input[data-model-filter]");
        if (!input) return;
        const kind = input.getAttribute("data-model-filter");
        modelView[kind + "Query"] = input.value;
        renderPermission();
        const next = $("rolePermBody").querySelector('input[data-model-filter="' + kind + '"]');
        if (next) {
          next.focus();
          const len = next.value.length;
          next.setSelectionRange(len, len);
        }
      });
      body.addEventListener("input", (event) => {
        const input = event.target.closest("input[data-dim-filter]");
        if (!input) return;
        const kind = input.getAttribute("data-dim-filter");
        dimensionFilters[kind] = input.value;
        renderPermission();
        const next = $("rolePermBody").querySelector('input[data-dim-filter="' + kind + '"]');
        if (next) {
          next.focus();
          const len = next.value.length;
          next.setSelectionRange(len, len);
        }
      });
    }

    const closeBtn = $("roleDeleteClose");
    const cancelBtn = $("roleDeleteCancel");
    const confirmBtn = $("roleDeleteConfirm");
    if (closeBtn) closeBtn.addEventListener("click", closeDeleteModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeDeleteModal);
    if (confirmBtn) confirmBtn.addEventListener("click", confirmDelete);

    const dimAddClose = $("roleDimAddClose");
    const dimAddCancel = $("roleDimAddCancel");
    const dimAddConfirm = $("roleDimAddConfirm");
    if (dimAddClose) dimAddClose.addEventListener("click", () => hideModal("roleDimAddModal"));
    if (dimAddCancel) dimAddCancel.addEventListener("click", () => hideModal("roleDimAddModal"));
    if (dimAddConfirm) dimAddConfirm.addEventListener("click", confirmDimensionAdd);

    const dimDeleteClose = $("roleDimDeleteClose");
    const dimDeleteCancel = $("roleDimDeleteCancel");
    const dimDeleteConfirm = $("roleDimDeleteConfirm");
    if (dimDeleteClose) dimDeleteClose.addEventListener("click", () => hideModal("roleDimDeleteModal"));
    if (dimDeleteCancel) dimDeleteCancel.addEventListener("click", () => hideModal("roleDimDeleteModal"));
    if (dimDeleteConfirm) dimDeleteConfirm.addEventListener("click", confirmDimensionDelete);

    const saveBtn = $("savePermissionBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        saveBtn.textContent = "已保存";
        window.setTimeout(() => {
          saveBtn.textContent = "保存权限";
        }, 1200);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    renderAll();
  });
})();
