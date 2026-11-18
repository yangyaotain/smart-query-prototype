/* 静态原型：使用名称词典和注释规则模拟 AI 推荐，不调用外部服务。 */
(function () {
  'use strict';

  const TABLE_TERMS = {
    sales_order: '销售订单', sales_order_item: '销售订单明细', sales_target: '月度销售目标',
    sales_promotion: '促销活动', channel_sales_daily: '渠道日销售汇总', region_dim: '销售区域',
    order_pay: '订单支付', order_refund: '订单退款', pay_channel_dim: '支付渠道',
    customer: '客户', customer_tag: '客户标签', customer_event: '客户行为事件', customer_segment: '客户分群',
    crm_lead: '销售线索', crm_account: '客户档案', inventory_log: '库存流水',
    event_track: '埋点事件', page_view_daily: '每日页面访问', campaign_dim: '活动',
    metric_daily: '每日运营指标', metric_dim: '指标维度'
  };
  const FIELD_TERMS = {
    order_id: '订单编号', order_no: '订单号', order_date: '订单日期', customer_id: '客户编号',
    customer_name: '客户名称', sales_amount: '销售金额', discount: '优惠金额', region: '销售区域',
    channel: '销售渠道', status: '状态', created_at: '创建时间', updated_at: '更新时间',
    created_time: '发生时间', level: '客户等级', phone: '联系电话', email: '邮箱', city: '城市', tags: '客户标签',
    log_id: '日志编号', sku_id: 'SKU 编号', warehouse_id: '仓库编号', type: '操作类型', qty: '数量',
    operator: '操作人', category: '分类', value: '指标值', biz_date: '业务日期', item_id: '明细编号',
    product_id: '产品编号', channel_id: '渠道编号', region_id: '区域编号', price: '单价', amount: '金额',
    quantity: '数量', target_id: '目标编号', target_month: '目标月份', target_amount: '目标金额',
    target_qty: '目标销量', owner: '负责人'
  };

  function cleanComment(comment, kind) {
    let text = String(comment || '').trim().replace(/（[^）]*）|\([^)]*\)/g, '').split(/[。；;\n]/)[0].trim();
    text = text.replace(/唯一编号/g, '编号');
    if (kind === 'table') {
      text = text.replace(/主表$|大表$|配置表$|维度表$|表$/g, '');
      text = text.replace(/^(.+)月度$/, '月度$1');
    }
    // 长说明和中英文混杂的占位注释不直接作为业务别名。
    return /^[\u3400-\u9fff][\u3400-\u9fff\d、/\s-]{0,19}$/.test(text) ? text : '';
  }

  function recommend(kind, item, table) {
    const comment = cleanComment(item.comment, kind);
    const dictionary = kind === 'table' ? TABLE_TERMS : FIELD_TERMS;
    const known = Object.prototype.hasOwnProperty.call(dictionary, item.name) ? dictionary[item.name] : '';
    let alias = '';
    let reason = '';
    if (kind === 'table') {
      alias = comment || known;
      reason = comment ? '优先根据表注释提炼业务对象，并结合表名核对语义。' : '根据表名识别业务对象，统一中文命名。';
    } else {
      const context = cleanComment(table.comment, 'table')
        || (Object.prototype.hasOwnProperty.call(TABLE_TERMS, table.name) ? TABLE_TERMS[table.name] : '');
      if ((item.name === 'id' || item.name === 'name') && context && (!comment || /^(主键|名称)$/.test(comment))) {
        alias = context + (item.name === 'id' ? '编号' : '名称');
        reason = '结合所属表的业务对象，补充字段语义。';
      } else {
        const semanticComment = comment && !/[、/]/.test(comment) ? comment : '';
        alias = semanticComment || known;
        reason = semanticComment ? '优先根据字段注释提取业务名称，结合字段名及所属表核对语义。' : '结合字段名及所属表语境，统一中文业务用语。';
      }
    }
    return alias ? { alias: alias, reason: reason }
      : { alias: '', reason: '名称缩写及注释不足以确定业务含义，请补充别名。' };
  }

  function validAlias(value) {
    return Boolean(value.trim()) && value.trim().length <= 50;
  }

  function classify(row, current) {
    if (!validAlias(row.draft)) return '';
    if (row.draft.trim() === String(current || '').trim()) return 'existing';
    return String(current || '').trim() ? 'modify' : 'new';
  }

  function collectRows(source, readFields) {
    const rows = [];
    source.tables.forEach(function (table) {
      function add(kind, item) {
        const suggestion = recommend(kind, item, table);
        rows.push({
          id: rows.length, kind: kind, tableName: table.name, name: item.name,
          comment: item.comment || '', draft: suggestion.alias, reason: suggestion.reason,
          edited: false
        });
      }
      add('table', table);
      readFields(source.id, table.name).forEach(function (field) { add('field', field); });
    });
    return rows;
  }

  // ---- 视图与交互：复用管理端的分析抽屉、按钮、表格及状态样式 ----
  const data = window.SmartQueryAliasData;
  if (!data) return;
  const el = function (id) { return document.getElementById(id); };
  const drawer = el('dsAliasDrawer');
  const trigger = el('dsBtnAlias');
  const states = new Map();
  const pageSize = 10;
  const steps = ['读取表、字段名称及注释', '识别业务含义和命名缩写', '生成中文别名并统一业务用语', '比对现有别名并生成推荐'];
  const progress = [10, 34, 62, 86, 100];
  const statusLabels = {
    new: ['新增', 'status-blue'], existing: ['已存在', 'status-ok'], modify: ['推荐修改', 'status-warn']
  };
  let openedSourceId = null;
  let pendingApply = null;
  let confirmReturnFocus = null;
  let dragCleanup = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function icon(kind) {
    const path = kind === 'edit' ? 'm14 6 4 4M4 20l4-1L20 7l-4-4L4 15z' : 'm5 12 4 4L19 6';
    return '<svg class="btn-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="' + path + '"/></svg> ';
  }

  function currentState() { return states.get(openedSourceId); }
  function targetFor(state, row) {
    const source = data.sourceById(state.sourceId);
    const table = source && source.tables.find(function (item) { return item.name === row.tableName; });
    if (!table) return null;
    return row.kind === 'table' ? table : data.fields(source.id, table.name).find(function (field) { return field.name === row.name; });
  }
  function rowStatus(state, row) {
    const target = targetFor(state, row);
    return target ? classify(row, target.alias) : '';
  }
  function actionable(state, row) { return ['new', 'modify'].includes(rowStatus(state, row)); }
  function elapsed(ms) { return Math.floor(ms / 1000) + ' 秒'; }

  function refresh() {
    const source = data.activeSource();
    const state = source && states.get(source.id);
    const running = Boolean(state && state.running);
    trigger.disabled = !source || !source.tables.length;
    trigger.title = trigger.disabled ? '当前数据源暂无可分析的表' : '分析当前数据源下所有表和字段的别名';
    trigger.classList.toggle('is-analyzing', running);
    el('dsAliasButtonLabel').textContent = running ? 'AI 分析中' : '自动填充别名';
    if (openedSourceId && (!source || source.id !== openedSourceId)) closeDrawer();
  }

  function beginAnalysis(source) {
    const state = {
      sourceId: source.id, sourceName: source.name, running: true, startedAt: performance.now(), elapsedMs: 0,
      step: 0, rows: collectRows(source, data.fields), collapsedTables: new Set(), page: 1,
      filters: { table: '', field: '', status: '' }
    };
    states.set(source.id, state);
    restoreFilters(state);
    refresh();
    render(state);
    const timer = setInterval(function () {
      if (states.get(source.id) !== state || !data.sourceById(source.id)) {
        clearInterval(timer);
        if (states.get(source.id) === state) states.delete(source.id);
        refresh();
        return;
      }
      state.elapsedMs = performance.now() - state.startedAt;
      state.step = Math.min(steps.length, Math.floor(state.elapsedMs / 900));
      if (state.step === steps.length) {
        state.running = false;
        clearInterval(timer);
        refresh();
      }
      if (openedSourceId === source.id && !drawer.classList.contains('hidden')) render(state);
    }, 300);
    el('dsAliasClose').focus();
  }

  function render(state) {
    const tableCount = state.rows.filter(function (row) { return row.kind === 'table'; }).length;
    el('dsAliasScope').textContent = state.sourceName + ' · 全部 ' + tableCount + ' 张表 / '
      + (state.rows.length - tableCount) + ' 个字段 · 不受数据列表筛选影响';
    el('dsAliasTitle').textContent = state.running ? '自动填充别名' : '别名推荐';
    el('dsAliasProcess').classList.toggle('hidden', !state.running);
    el('dsAliasResults').classList.toggle('hidden', state.running);
    el('dsAliasPagination').classList.toggle('hidden', state.running);
    if (!state.running) { renderResults(state); return; }
    el('dsAliasElapsed').textContent = elapsed(state.elapsedMs);
    el('dsAliasPct').textContent = progress[state.step] + '%';
    el('dsAliasFill').style.width = progress[state.step] + '%';
    el('dsAliasProgress').setAttribute('aria-valuenow', progress[state.step]);
    el('dsAliasSteps').innerHTML = steps.map(function (label, index) {
      const done = index < state.step;
      const current = index === state.step;
      return '<li class="' + (done ? 'is-done' : current ? 'is-current' : '') + '"'
        + (current ? ' aria-current="step"' : '') + '><span class="dm-analysis-step-marker" aria-hidden="true">'
        + (done ? '✓' : index + 1) + '</span><span>' + label + '</span><small class="dm-analysis-step-status">'
        + (done ? '已完成' : current ? '进行中' : '待开始') + '</small></li>';
    }).join('');
  }

  function updateSummary(state) {
    const counts = { new: 0, existing: 0, modify: 0 };
    state.rows.forEach(function (row) { const status = rowStatus(state, row); if (status) counts[status]++; });
    el('dsAliasSummary').textContent = '共 ' + state.rows.length + ' 项 · 新增 ' + counts.new
      + ' · 已存在 ' + counts.existing + ' · 推荐修改 ' + counts.modify + ' · 用时 ' + elapsed(state.elapsedMs);
    const available = counts.new + counts.modify;
    el('dsAliasApplyAll').disabled = !available;
    el('dsAliasApplyLabel').textContent = '全部应用' + (available ? '（' + available + '）' : '');
  }

  function contains(value, query) { return String(value || '').toLowerCase().includes(query.toLowerCase()); }
  function filteredRows(state) {
    const source = data.sourceById(state.sourceId);
    if (!source) return [];
    const filters = state.filters;
    const tableDrafts = new Map(state.rows.filter(function (row) { return row.kind === 'table'; })
      .map(function (row) { return [row.tableName, row.draft]; }));
    return state.rows.filter(function (row) {
      const table = source.tables.find(function (item) { return item.name === row.tableName; });
      const target = targetFor(state, row);
      return table && target
        && (!filters.table || [table.name, table.alias, tableDrafts.get(table.name)].some(function (value) { return contains(value, filters.table); }))
        && (!filters.field || (row.kind === 'field' && [row.name, target.alias, row.draft].some(function (value) { return contains(value, filters.field); })))
        && (!filters.status || rowStatus(state, row) === filters.status);
    });
  }

  // 先筛选实际命中的对象，再补齐父表作为归属上下文；按表分页不拆分字段。
  function filteredGroups(state) {
    const matches = new Set(filteredRows(state).map(function (row) { return row.id; }));
    const groups = new Map();
    state.rows.forEach(function (row) {
      if (row.kind === 'table' && targetFor(state, row)) {
        groups.set(row.tableName, { table: row, fields: [], totalFields: 0, tableMatched: matches.has(row.id) });
      }
    });
    state.rows.forEach(function (row) {
      if (row.kind !== 'field') return;
      const group = groups.get(row.tableName);
      if (!group) return;
      group.totalFields++;
      if (matches.has(row.id)) group.fields.push(row);
    });
    return Array.from(groups.values()).filter(function (group) { return group.tableMatched || group.fields.length; });
  }

  function statusHtml(status) {
    const item = statusLabels[status];
    return item ? '<span class="' + item[1] + '">' + item[0] + '</span>' : '<span class="dsa-current">—</span>';
  }
  function actionHtml(state, row) {
    const status = rowStatus(state, row);
    return actionable(state, row) ? '<button class="ghost-btn" type="button" data-alias-apply="' + row.id + '">'
      + icon(status === 'modify' ? 'edit' : 'check') + (status === 'modify' ? '应用修改' : '应用') + '</button>' : '—';
  }
  function treeNameHtml(state, row, group) {
    if (row.kind === 'field') {
      return '<span class="dsa-tree-name dsa-field-name"><svg class="btn-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4v12h5M15 6v12m-4-8h8m-8 4h8"/></svg>'
        + '<span class="dsa-name">' + esc(row.name) + '</span></span>';
    }
    const expanded = !state.collapsedTables.has(row.tableName);
    const hasFields = group.fields.length > 0;
    const controls = group.fields.map(function (field) { return 'dsAliasFieldRow' + field.id; }).join(' ');
    const label = (expanded ? '收起' : '展开') + row.name + ' 的字段';
    return '<div class="dsa-tree-table-name">'
      + (hasFields ? '<button type="button" class="dsa-tree-toggle" id="dsAliasToggle' + row.id + '" data-alias-toggle="' + row.id
        + '" aria-expanded="' + expanded + '" aria-controls="' + controls + '" aria-label="' + esc(label) + '" title="' + esc(label) + '">'
        + '<svg class="btn-ico dsa-tree-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>' : '<span class="dsa-tree-name dsa-tree-no-fields">')
      + '<svg class="btn-ico dsa-table-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/></svg>'
      + '<span class="dsa-name">' + esc(row.name) + '</span>' + (hasFields ? '</button>' : '</span>')
      + '<span class="dm-analysis-meta dsa-field-count">'
      + (group.fields.length === group.totalFields ? group.totalFields + ' 个字段' : '匹配 ' + group.fields.length + ' / ' + group.totalFields + ' 个字段')
      + (!group.tableMatched ? ' · 所属表' : '') + '</span></div>';
  }

  function renderRow(state, row, group) {
    const target = targetFor(state, row);
    const status = rowStatus(state, row);
    const invalid = row.edited && !validAlias(row.draft);
    const isField = row.kind === 'field';
    const collapsed = isField && state.collapsedTables.has(row.tableName);
    const aliasLabel = (row.kind === 'field' ? row.tableName + '.' : '') + row.name + ' 的推荐别名';
    return '<tr class="' + (isField ? 'dsa-field-row' : 'dsa-table-row') + (collapsed ? ' hidden' : '') + '" data-alias-row="' + row.id + '"'
      + (isField ? ' id="dsAliasFieldRow' + row.id + '"' : '') + '>'
      + '<td>' + treeNameHtml(state, row, group) + '</td><td>' + esc(row.comment || '—') + '</td>'
      + '<td class="dsa-current' + (status === 'modify' ? ' dsa-overwrite' : '') + '">' + esc(target.alias || '未设置') + '</td>'
      + '<td><input class="dsa-alias-input" data-alias-draft="' + row.id + '" maxlength="50" value="' + esc(row.draft)
      + '" placeholder="请输入推荐别名" aria-label="' + esc(aliasLabel) + '" aria-invalid="' + invalid + '" aria-describedby="dsAliasValidation' + row.id + '" />'
      + '<span class="dsa-validation' + (invalid ? '' : ' hidden') + '" id="dsAliasValidation' + row.id + '">请输入 1–50 个字符的别名</span></td>'
      + '<td data-alias-cell="status">' + statusHtml(status) + '</td>'
      + '<td data-alias-cell="reason">' + esc(row.edited ? '已人工调整推荐别名，请核对后应用。' : row.reason) + '</td>'
      + '<td data-alias-cell="action">' + actionHtml(state, row) + '</td></tr>';
  }

  function renderResults(state) {
    updateSummary(state);
    const heads = ['表名 / 字段名', '注释', '当前别名', '推荐别名', '状态', '推荐说明', '操作'];
    const widths = [23, 12, 11, 17, 10, 16, 11];
    el('dsAliasCols').innerHTML = widths.map(function (width) { return '<col style="width:' + width + '%;" />'; }).join('');
    el('dsAliasHead').innerHTML = '<tr>' + heads.map(function (title) { return '<th scope="col">' + title + '</th>'; }).join('') + '</tr>';
    const groups = filteredGroups(state);
    const pages = Math.max(1, Math.ceil(groups.length / pageSize));
    state.page = Math.min(state.page, pages);
    const offset = (state.page - 1) * pageSize;
    el('dsAliasRows').innerHTML = groups.slice(offset, offset + pageSize).map(function (group) {
      return renderRow(state, group.table, group) + group.fields.map(function (row) { return renderRow(state, row, group); }).join('');
    }).join('')
      || '<tr><td class="dsa-empty" colspan="' + heads.length + '">'
      + (state.rows.length ? '没有符合查询条件的别名推荐，请调整筛选条件。' : '当前数据源暂无可分析的表和字段。') + '</td></tr>';
    el('dsAliasPageInfo').textContent = '共 ' + groups.length + ' 张表 · 匹配 ' + filteredRows(state).length
      + ' 项 · 每页 ' + pageSize + ' 张表 · 第 ' + state.page + ' / ' + pages + ' 页';
    el('dsAliasPrev').disabled = state.page === 1;
    el('dsAliasNext').disabled = state.page === pages;
  }

  function restoreFilters(state) {
    el('dsAliasTableQuery').value = state.filters.table;
    el('dsAliasFieldQuery').value = state.filters.field;
    el('dsAliasStatus').value = state.filters.status;
  }

  function openDrawer() {
    const source = data.activeSource();
    if (!source || !source.tables.length) return;
    openedSourceId = source.id;
    el('dsAliasMask').classList.remove('hidden');
    drawer.classList.remove('hidden');
    trigger.setAttribute('aria-expanded', 'true');
    const state = states.get(source.id);
    if (state) { restoreFilters(state); render(state); }
    else beginAnalysis(source);
    el('dsAliasClose').focus();
  }

  function closeDrawer() {
    closeConfirm(false);
    if (dragCleanup) dragCleanup();
    drawer.classList.add('hidden');
    el('dsAliasMask').classList.add('hidden');
    trigger.setAttribute('aria-expanded', 'false');
    openedSourceId = null;
    if (!trigger.disabled) trigger.focus();
  }

  function query(event) {
    if (event) event.preventDefault();
    const state = currentState();
    if (!state || state.running) return;
    state.filters = {
      table: el('dsAliasTableQuery').value.trim(), field: el('dsAliasFieldQuery').value.trim(), status: el('dsAliasStatus').value
    };
    state.page = 1;
    if (state.filters.table || state.filters.field || state.filters.status) {
      filteredGroups(state).forEach(function (group) {
        if (group.fields.length) state.collapsedTables.delete(group.table.tableName);
      });
    }
    el('dsAliasTableWrap').scrollTop = 0;
    renderResults(state);
  }

  function closeConfirm(restoreFocus) {
    const wasOpen = !el('dsAliasConfirm').classList.contains('hidden');
    el('dsAliasConfirm').classList.add('hidden');
    el('dsAliasConfirmMask').classList.add('hidden');
    pendingApply = null;
    if (restoreFocus && wasOpen) {
      const focus = confirmReturnFocus;
      if (focus && focus.isConnected && !focus.disabled) focus.focus();
      else el('dsAliasTitle').focus();
    }
  }

  function applyChanges(state, entries) {
    const active = data.activeSource();
    if (!active || active.id !== state.sourceId || states.get(state.sourceId) !== state) return;
    const stale = entries.some(function (entry) {
      const target = targetFor(state, entry.row);
      return !target || String(target.alias || '') !== entry.before || entry.row.draft.trim() !== entry.next;
    });
    if (stale) {
      window.showToast('别名或推荐已变化，请重新核对后应用');
      renderResults(state);
      return;
    }
    let filled = 0;
    let modified = 0;
    entries.forEach(function (entry) {
      if (!actionable(state, entry.row)) return;
      const target = targetFor(state, entry.row);
      if (String(target.alias || '').trim()) modified++; else filled++;
      target.alias = entry.next;
      entry.row.draft = entry.next;
    });
    data.refresh();
    renderResults(state);
    el('dsAliasTitle').focus();
    window.showToast('应用完成：新增 ' + filled + ' 项，修改 ' + modified + ' 项别名');
  }

  function requestApply(rows, bulk) {
    const state = currentState();
    if (!state || state.running) return;
    const entries = rows.filter(function (row) { return actionable(state, row); }).map(function (row) {
      return { row: row, before: String(targetFor(state, row).alias || ''), next: row.draft.trim() };
    });
    if (!entries.length) return;
    const modifications = entries.filter(function (entry) { return entry.before.trim(); }).length;
    if (!bulk && !modifications) { applyChanges(state, entries); return; }
    const tables = entries.filter(function (entry) { return entry.row.kind === 'table'; }).length;
    el('dsAliasConfirmTitle').textContent = bulk ? '确认全部应用别名' : '确认修改别名';
    el('dsAliasConfirmMessage').innerHTML = '<strong>' + esc(state.sourceName) + '</strong><br>'
      + (bulk ? '范围：当前数据源全部可用的表和字段推荐，包含收起的字段、其他页及筛选范围外的结果。<br>' : '对象：' + esc(entries[0].row.tableName)
        + (entries[0].row.kind === 'field' ? '.' + esc(entries[0].row.name) : '') + '<br>')
      + '本次将应用 <strong>' + tables + '</strong> 个表别名、<strong>' + (entries.length - tables) + '</strong> 个字段别名。<br>'
      + '填充空别名 <strong>' + (entries.length - modifications) + '</strong> 项，覆盖已有别名 <strong>' + modifications + '</strong> 项。'
      + (!bulk ? '<br>当前：' + esc(entries[0].before) + ' → 推荐：<strong>' + esc(entries[0].next) + '</strong>' : '')
      + '<span class="dsa-overwrite">' + (modifications ? '覆盖后将以推荐别名替换原别名。' : '本次仅填充空别名。')
      + '已存在及无有效推荐值的项不参与本次应用。</span>';
    pendingApply = { state: state, entries: entries };
    confirmReturnFocus = document.activeElement;
    el('dsAliasConfirmMask').classList.remove('hidden');
    el('dsAliasConfirm').classList.remove('hidden');
    el('dsAliasConfirmApply').focus();
  }

  function toggleTable(row) {
    const state = currentState();
    if (!state || state.running) return;
    if (state.collapsedTables.has(row.tableName)) state.collapsedTables.delete(row.tableName);
    else state.collapsedTables.add(row.tableName);
    const scrollTop = el('dsAliasTableWrap').scrollTop;
    const scrollLeft = el('dsAliasTableWrap').scrollLeft;
    renderResults(state);
    el('dsAliasTableWrap').scrollTop = scrollTop;
    el('dsAliasTableWrap').scrollLeft = scrollLeft;
    el('dsAliasToggle' + row.id).focus();
  }

  trigger.addEventListener('click', openDrawer);
  el('dsAliasClose').addEventListener('click', closeDrawer);
  el('dsAliasMask').addEventListener('click', closeDrawer);
  el('dsAliasFilters').addEventListener('submit', query);
  el('dsAliasFilters').addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
      if (event.isComposing) return;
      event.preventDefault();
      query();
    }
  });
  el('dsAliasStatus').addEventListener('change', query);
  el('dsAliasAgain').addEventListener('click', function () {
    const source = data.sourceById(openedSourceId);
    if (source) beginAnalysis(source);
  });
  el('dsAliasApplyAll').addEventListener('click', function () {
    const state = currentState();
    if (state && !state.running) requestApply(state.rows, true);
  });
  ['dsAliasPrev', 'dsAliasNext'].forEach(function (id, index) {
    el(id).addEventListener('click', function () {
      const state = currentState();
      if (!state || state.running || el(id).disabled) return;
      state.page += index ? 1 : -1;
      el('dsAliasTableWrap').scrollTop = 0;
      renderResults(state);
      if (el(id).disabled) el('dsAliasTitle').focus();
    });
  });
  el('dsAliasRows').addEventListener('input', function (event) {
    const input = event.target.closest('[data-alias-draft]');
    const state = currentState();
    if (!input || !state || state.running) return;
    const row = state.rows.find(function (item) { return item.id === Number(input.dataset.aliasDraft); });
    if (!row) return;
    row.draft = input.value;
    row.edited = true;
    const tr = input.closest('tr');
    const invalid = !validAlias(row.draft);
    input.setAttribute('aria-invalid', invalid);
    el('dsAliasValidation' + row.id).classList.toggle('hidden', !invalid);
    tr.querySelector('[data-alias-cell="status"]').innerHTML = statusHtml(rowStatus(state, row));
    tr.querySelector('[data-alias-cell="action"]').innerHTML = actionHtml(state, row);
    tr.querySelector('[data-alias-cell="reason"]').textContent = invalid ? '请输入有效别名后再应用。' : '已人工调整推荐别名，请核对后应用。';
    updateSummary(state);
  });
  el('dsAliasRows').addEventListener('click', function (event) {
    const state = currentState();
    if (!state || state.running) return;
    const toggle = event.target.closest('[data-alias-toggle]');
    if (toggle) {
      const tableRow = state.rows.find(function (item) { return item.kind === 'table' && item.id === Number(toggle.dataset.aliasToggle); });
      if (tableRow) toggleTable(tableRow);
      return;
    }
    const button = event.target.closest('[data-alias-apply]');
    if (!button) return;
    const row = state.rows.find(function (item) { return item.id === Number(button.dataset.aliasApply); });
    if (row) requestApply([row], false);
  });
  el('dsAliasRows').addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && event.target.matches('[data-alias-draft]')) {
      if (event.isComposing) return;
      event.preventDefault();
      const button = event.target.closest('tr').querySelector('[data-alias-apply]');
      if (button) button.click();
    }
  });
  document.querySelectorAll('[data-alias-cancel]').forEach(function (button) {
    button.addEventListener('click', function () { closeConfirm(true); });
  });
  el('dsAliasConfirmMask').addEventListener('click', function () { closeConfirm(true); });
  el('dsAliasConfirmApply').addEventListener('click', function () {
    if (!pendingApply) return;
    const request = pendingApply;
    closeConfirm(false);
    applyChanges(request.state, request.entries);
  });

  document.addEventListener('keydown', function (event) {
    if (drawer.classList.contains('hidden')) return;
    const confirming = !el('dsAliasConfirm').classList.contains('hidden');
    if (event.key === 'Escape' && !event.isComposing) {
      event.preventDefault();
      if (confirming) closeConfirm(true); else closeDrawer();
      return;
    }
    if (event.key !== 'Tab') return;
    const modal = confirming ? el('dsAliasConfirm') : drawer;
    const controls = Array.from(modal.querySelectorAll('button:not(:disabled), input, select, [tabindex="0"]'))
      .filter(function (node) { return node.getClientRects().length && node.tabIndex >= 0; });
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first) return;
    if (!modal.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  });

  el('dsAliasResizer').addEventListener('pointerdown', function (event) {
    if (event.button !== 0 || pendingApply) return;
    if (dragCleanup) dragCleanup();
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = drawer.getBoundingClientRect().width;
    const oldCursor = document.body.style.cursor;
    const oldSelect = document.body.style.userSelect;
    el('dsAliasResizer').classList.add('dragging');
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    function move(moveEvent) {
      const max = window.innerWidth * .92;
      drawer.style.width = Math.min(max, Math.max(Math.min(900, max), startWidth + startX - moveEvent.clientX)) + 'px';
    }
    function finish() {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      window.removeEventListener('blur', finish);
      document.body.style.cursor = oldCursor;
      document.body.style.userSelect = oldSelect;
      el('dsAliasResizer').classList.remove('dragging');
      dragCleanup = null;
    }
    dragCleanup = finish;
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
    window.addEventListener('blur', finish);
  });
  window.addEventListener('resize', function () {
    if (drawer.style.width) drawer.style.width = Math.min(parseFloat(drawer.style.width), window.innerWidth * .92) + 'px';
  });
  window.SmartQueryAliasUI = { refresh: refresh };
  refresh();
})();
