/* 智能问数右侧目录：仅控制主题目录、查询与悬浮详情，不修改问数流程。
 * 指标目录/基础信息对齐 knowledge-indicator.js 当前示例；维度取自分析主题的数据模型。
 * 后台当前未提供统一数据存储，以下主题关联仅用于本页静态原型展示。
 */
(function () {
  'use strict';

  const list = document.getElementById('themeIndicatorList');
  const form = document.getElementById('themeIndicatorSearchBox');
  const input = document.getElementById('themeIndicatorSearchInput');
  const clear = document.getElementById('themeIndicatorSearchClear');
  const status = document.getElementById('themeTreeStatus');
  const card = document.getElementById('themeDetailCard');
  if (!list || !form || !input || !clear || !status || !card) return;

  const directories = [
    { id: 'g_revenue', name: '收入指标', children: [
      { id: 'g_rev_sale', name: '销售收入' },
      { id: 'g_rev_service', name: '服务收入' },
      { id: 'g_rev_other', name: '其他收入' }
    ] },
    { id: 'g_cost', name: '成本指标', children: [
      { id: 'g_cost_direct', name: '直接成本' }, { id: 'g_cost_indirect', name: '间接成本' }
    ] },
    { id: 'g_efficiency', name: '运营效率', children: [
      { id: 'g_eff_conv', name: '转化率' }, { id: 'g_eff_cycle', name: '周期/时长' }
    ] }
  ];
  const indicators = [
    { id: 'i_non_bid_amt', groupId: 'g_rev_sale', name: '非招成交金额', synonyms: '非招成交金额', desc: '非招标项目的成交金额合计。', dimensions: ['统计时间', '采购方式', '项目'], example: '近6个月非招成交金额趋势如何？' },
    { id: 'i_bid_amt', groupId: 'g_rev_sale', name: '招标成交金额', synonyms: '招标项目成交金额', desc: '招标项目的成交金额合计。', dimensions: ['统计时间', '项目'], example: '本季度招标成交金额与上季度相比如何？' },
    { id: 'i_platform_fee', groupId: 'g_rev_service', name: '招标平台服务费', synonyms: '平台服务费收入', desc: '招标平台收取的服务费收入。', dimensions: ['统计时间', '项目'], example: '本月招标平台服务费收入是多少？' },
    { id: 'i_non_bid_fee', groupId: 'g_rev_service', name: '非招服务费', synonyms: '非招服务费收入', desc: '非招标项目的服务费收入。', dimensions: ['统计时间', '采购方式', '项目'], example: '近3个月非招服务费收入变化如何？' },
    { id: 'i_ca_income', groupId: 'g_rev_other', name: 'CA证书收入', synonyms: 'CA 证书', desc: 'CA 数字证书业务收入。', dimensions: ['统计时间'], example: '本季度CA证书收入是多少？' },
    { id: 'i_total_income', groupId: 'g_rev_sale', name: '总收入', synonyms: '总收入', desc: '统计周期内平台各项业务收入的合计金额，用于反映整体经营收入规模。', dimensions: ['统计时间', '收入类型'], example: '近6个月总收入趋势如何？' },
    { id: 'i_arpu', groupId: 'g_eff_conv', name: '客单价', synonyms: 'ARPU,人均客单', desc: '统计周期内每位成交客户贡献的平均收入金额。', dimensions: ['统计时间', '客户'], example: '近3个月客单价变化如何？' }
  ];
  // 与本页原有五个主题保持一致；未配置关联的主题展示明确空状态。
  const themeIndicatorIds = {
    '销售分析': ['i_non_bid_amt', 'i_bid_amt', 'i_platform_fee', 'i_non_bid_fee', 'i_ca_income', 'i_total_income', 'i_arpu'],
    '客户分析': ['i_arpu'],
    '库存分析': [],
    '财务分析': ['i_platform_fee', 'i_non_bid_fee', 'i_ca_income', 'i_total_income'],
    '经营概览': ['i_non_bid_amt', 'i_bid_amt', 'i_platform_fee', 'i_non_bid_fee', 'i_ca_income', 'i_total_income', 'i_arpu']
  };

  function dimension(id, name, synonyms, desc, example) {
    return { id, name, synonyms, desc, example, kind: 'dimension' };
  }
  const dimensionGroups = {
    time: { id: 'dim_time', name: '时间维度', children: [
      dimension('order_date', '订单日期', '下单日期,订单时间', '销售订单发生的日期，支持按年、季度、月、日进行分析。', '按月查看本年度销售趋势。')
    ] },
    region: { id: 'dim_region', name: '区域维度', children: [
      dimension('region_name', '销售区域', '区域,大区', '销售区域维度表中的区域名称，用于区域间的业绩对比。', '对比华东、华南和华北的销售表现。')
    ] },
    channel: { id: 'dim_channel', name: '渠道维度', children: [
      dimension('channel_name', '渠道名称', '销售渠道,渠道', '销售渠道名称，例如官网商城、天猫旗舰店和直营门店。', '各销售渠道的业绩贡献如何？'),
      dimension('channel_type', '渠道类型', '线上线下,渠道分类', '区分线上、线下等渠道类型。', '对比线上与线下渠道的销售表现。')
    ] },
    product: { id: 'dim_product', name: '产品维度', children: [
      dimension('product_name', '产品名称', '商品,产品', '产品维度中的产品名称，用于商品销售分析。', '查看本月销售排名前十的产品。'),
      dimension('category', '类目', '品类,产品分类', '产品所属类目，用于对比不同品类的业务表现。', '按类目查看销售收入分布。')
    ] },
    customer: { id: 'dim_customer', name: '客户维度', children: [
      dimension('customer_name', '客户名称', '客户,企业名称', '客户维度中的客户名称，用于分析客户贡献。', '本月重点客户的贡献排名如何？'),
      dimension('industry', '所属行业', '行业,客户行业', '客户所属行业，例如科技、贸易和制造。', '按所属行业查看客户贡献。'),
      dimension('city', '城市', '客户城市,所在城市', '客户所在城市，用于分析客户的地域分布。', '按城市查看客户分布。'),
      dimension('vip_level', 'VIP等级', '客户等级,会员等级', '客户的VIP等级，用于客户分层分析。', '不同VIP等级客户的贡献有何差异？')
    ] },
    inventory: { id: 'dim_inventory', name: '库存维度', children: [
      dimension('warehouse_name', '仓库名称', '仓库,库房', '库存余额模型关联的仓库名称。', '按仓库查看库存分布。'),
      dimension('item_name', '物料名称', '物料,存货', '库存模型中的物料名称，用于物料库存分析。', '查看各物料的库存数量。')
    ] },
    finance: { id: 'dim_finance', name: '财务维度', children: [
      dimension('bucket_name', '账期名称', '账期,账龄区间', '应收账款模型中的账期分类，例如0—30天、31—60天。', '按账期查看应收账款分布。'),
      dimension('account_name', '科目名称', '会计科目,科目', '总账明细模型关联的会计科目名称。', '按科目查看本月总账发生额。'),
      dimension('supplier_name', '供应商名称', '供应商,供货商', '应付账款模型关联的供应商名称。', '按供应商查看应付款分布。')
    ] }
  };
  const themeDimensionGroups = {
    '销售分析': ['time', 'region', 'channel', 'product', 'customer'],
    '客户分析': ['customer'],
    '库存分析': ['inventory'],
    '财务分析': ['finance'],
    '经营概览': ['time', 'region', 'channel', 'product', 'customer', 'inventory', 'finance']
  };

  let themes = ['销售分析'];
  let keyword = '';
  const collapsed = new Set();
  const searchCollapsed = new Set();
  const leafItems = new Map();
  let showTimer;
  let hideTimer;
  let activeAnchor;
  let insertTarget = null;
  let insertTargetKey = '';
  let composing = false;
  const escape = (value) => keywordHighlight.html(value, '');
  const icon = (kind) => `<svg viewBox="0 0 24 24" aria-hidden="true">${{
    theme: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z"/>',
    metric: '<path d="M5 20V10h4v10M10 20V4h4v16M15 20v-7h4v7"/>',
    dimension: '<path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>'
  }[kind] || ''}</svg>`;

  function metricTree(ids) {
    const selected = indicators.filter((item) => ids.includes(item.id));
    function walk(groups) {
      return groups.map((group) => {
        const children = [
          ...walk(group.children || []),
          ...selected.filter((item) => item.groupId === group.id).map((item) => ({ ...item, kind: 'metric' }))
        ];
        return { id: group.id, name: group.name, children };
      }).filter((group) => group.children.length);
    }
    return walk(directories);
  }

  function buildTree() {
    return themes.map((theme) => ({ id: theme, name: theme, kind: 'theme', children: [
      { id: 'metrics', name: '指标体系', children: metricTree(themeIndicatorIds[theme] || []), empty: '当前主题暂无关联指标' },
      { id: 'dimensions', name: '分析维度', children: (themeDimensionGroups[theme] || []).map((key) => dimensionGroups[key]), empty: '当前主题暂无分析维度' }
    ] }));
  }

  // 搜索保留祖先；目录命中时保留全部后代，不改变搜索前的展开状态。
  function filterTree(nodes, inherited = false) {
    return nodes.flatMap((node) => {
      const ownMatch = !keyword || [node.name, node.synonyms || ''].some((value) => value.toLowerCase().includes(keyword.toLowerCase()));
      const children = node.children ? filterTree(node.children, inherited || ownMatch) : undefined;
      return inherited || ownMatch || children?.length ? [{ ...node, children }] : [];
    });
  }

  function renderNodes(nodes, parentPath = [], depth = 0) {
    return nodes.map((node) => {
      const path = [...parentPath, node.id];
      const key = path.join('/');
      const branch = Array.isArray(node.children);
      const expanded = !(keyword ? searchCollapsed : collapsed).has(key);
      if (!branch) leafItems.set(key, node);
      const synonymHit = keyword && !node.name.toLowerCase().includes(keyword.toLowerCase()) && (node.synonyms || '').toLowerCase().includes(keyword.toLowerCase());
      return `<li class="sq-context-node${node.kind === 'theme' ? ' is-theme' : ''}">
        <button type="button" class="sq-context-row${branch ? ' is-directory' : ' is-leaf'}" data-node-key="${escape(key)}" ${branch ? `aria-expanded="${expanded}"` : ''} style="--tree-depth:${depth}">
          <span class="sq-context-caret${branch ? '' : ' is-empty'}" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m6 4 4 4-4 4"/></svg></span>
          <span class="sq-context-icon is-${node.kind || 'folder'}">${icon(node.kind || 'folder')}</span>
          <span class="sq-context-label">${keywordHighlight.html(node.name, keyword)}</span>
          ${node.kind === 'theme' ? '<span class="sq-context-badge">主题</span>' : ''}
          ${!branch ? `<span class="sq-context-type">${node.kind === 'metric' ? '指标' : '维度'}</span>` : ''}
        </button>
        ${synonymHit ? `<div class="sq-context-synonym" style="--tree-depth:${depth}">同义词：${keywordHighlight.html(node.synonyms, keyword)}</div>` : ''}
        ${branch ? `<ul class="sq-context-children"${expanded ? '' : ' hidden'}>${node.children.length ? renderNodes(node.children, path, depth + 1) : `<li class="sq-context-branch-empty">${escape(node.empty || '暂无数据')}</li>`}</ul>` : ''}
      </li>`;
    }).join('');
  }

  function render() {
    hideCard();
    leafItems.clear();
    const visible = filterTree(buildTree());
    list.innerHTML = visible.length ? `<ul class="sq-context-tree" aria-label="主题指标与分析维度目录">${renderNodes(visible)}</ul>` : '<div class="theme-indicator-empty" role="status"><strong>未找到匹配内容</strong><span>请尝试其他主题、目录、指标或维度关键词</span></div>';
    const count = [...leafItems.values()].filter((item) => item.kind === 'metric').length;
    status.textContent = keyword ? `“${keyword}”的搜索结果 · ${leafItems.size} 项` : `${themes.length} 个主题 · ${count} 个关联指标`;
    form.classList.toggle('is-searching', Boolean(keyword));
    clear.classList.toggle('hidden', !input.value);
  }

  function applySearch() {
    keyword = input.value.trim();
    searchCollapsed.clear();
    render();
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!composing) applySearch();
  });
  input.addEventListener('compositionstart', () => { composing = true; });
  input.addEventListener('compositionend', () => {
    composing = false;
    applySearch();
  });
  input.addEventListener('input', (event) => {
    clear.classList.toggle('hidden', !input.value);
    if (!composing && !event.isComposing && input.value.trim() !== keyword) applySearch();
  });
  clear.addEventListener('click', () => { composing = false; input.value = ''; applySearch(); input.focus(); });

  // 首次按下固定插入位置；第二次按下不受联想收起、焦点切换的影响。
  list.addEventListener('mousedown', (event) => {
    const row = event.target.closest('.sq-context-row.is-leaf');
    if (event.button !== 0 || !row) return;
    if (event.detail <= 1 || insertTargetKey !== row.dataset.nodeKey) {
      insertTarget = window.captureQuestionInsertTarget?.();
      insertTargetKey = row.dataset.nodeKey;
    }
    event.preventDefault();
  });
  list.addEventListener('dblclick', (event) => {
    // 高亮文字、名称和图标之间的双击可能以整行为共同目标。
    const row = event.target.closest('.sq-context-row.is-leaf');
    const item = row && leafItems.get(row.dataset.nodeKey);
    if (!item) return;
    event.preventDefault();
    hideCard();
    const target = insertTargetKey === row.dataset.nodeKey ? insertTarget : undefined;
    insertTarget = null;
    insertTargetKey = '';
    window.insertQuestionAtCaret?.(item.name, target);
  });

  list.addEventListener('click', (event) => {
    const row = event.target.closest('.sq-context-row');
    if (!row) return;
    if (row.hasAttribute('aria-expanded')) {
      const expanded = row.getAttribute('aria-expanded') === 'true';
      const keys = keyword ? searchCollapsed : collapsed;
      if (expanded) keys.add(row.dataset.nodeKey); else keys.delete(row.dataset.nodeKey);
      row.setAttribute('aria-expanded', String(!expanded));
      row.nextElementSibling.hidden = expanded;
      hideCard();
    } else showCard(row);
  });

  function hideCard() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    if (activeAnchor) activeAnchor.removeAttribute('aria-describedby');
    activeAnchor = null;
    card.hidden = true;
  }
  function delayHide() { clearTimeout(showTimer); hideTimer = setTimeout(hideCard, 180); }
  function showCard(row) {
    const item = leafItems.get(row.dataset.nodeKey);
    if (!item || !row.isConnected) return;
    hideCard();
    activeAnchor = row;
    row.setAttribute('aria-describedby', card.id);
    const dimensions = item.dimensions || [];
    card.innerHTML = `<div class="sq-context-detail-head"><span class="sq-context-icon is-${item.kind}">${icon(item.kind)}</span><span>${item.kind === 'metric' ? '指标详情' : '维度详情'}</span></div>
      <h4>${escape(item.name)}</h4>
      <dl><div><dt>同义词</dt><dd>${escape(item.synonyms || '暂无同义词')}</dd></div><div><dt>说明</dt><dd>${escape(item.desc || '暂无说明')}</dd></div>
      ${item.kind === 'metric' ? `<div><dt>相关维度</dt><dd class="sq-context-detail-tags">${dimensions.length ? dimensions.map((name) => `<span>${escape(name)}</span>`).join('') : '暂无相关维度'}</dd></div>` : ''}</dl>
      <div class="sq-context-detail-example"><span class="sq-context-example-label">示例问法</span><p>${escape(item.example || '暂无示例')}</p></div>
      <p class="sq-context-insert-hint">双击名称插入问题</p>`;
    card.hidden = false;
    const anchor = row.getBoundingClientRect();
    const width = card.getBoundingClientRect().width;
    const height = card.getBoundingClientRect().height;
    let left = anchor.left - width - 10;
    if (left < 12) left = anchor.right + 10;
    card.style.left = `${Math.max(12, Math.min(left, window.innerWidth - width - 12))}px`;
    card.style.top = `${Math.max(12, Math.min(anchor.top - 8, window.innerHeight - height - 12))}px`;
  }

  list.addEventListener('mouseover', (event) => {
    const row = event.target.closest('.is-leaf');
    if (!row || row.contains(event.relatedTarget)) return;
    if (activeAnchor === row && !card.hidden) {
      clearTimeout(hideTimer);
      return;
    }
    hideCard();
    showTimer = setTimeout(() => showCard(row), 240);
  });
  list.addEventListener('mouseout', (event) => {
    const row = event.target.closest('.is-leaf');
    if (row && !row.contains(event.relatedTarget)) delayHide();
  });
  list.addEventListener('focusin', (event) => {
    const row = event.target.closest('.is-leaf');
    if (row) showCard(row);
  });
  list.addEventListener('focusout', delayHide);
  card.addEventListener('mouseenter', () => { clearTimeout(hideTimer); });
  card.addEventListener('mouseleave', delayHide);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hideCard(); });
  document.addEventListener('pointerdown', (event) => {
    if (!card.contains(event.target) && !activeAnchor?.contains(event.target)) hideCard();
  });
  document.addEventListener('scroll', (event) => { if (!card.contains(event.target)) hideCard(); }, true);
  window.addEventListener('resize', hideCard);
  window.addEventListener('blur', hideCard);
  window.SmartQueryContext = {
    render(selected) {
      themes = [...selected];
      applySearch();
    }
  };
})();
