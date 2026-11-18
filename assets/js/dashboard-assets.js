// 仪表盘与组件看板共用资产、目录和展示配置。静态原型数据在当前会话中保存。
(function () {
  'use strict';
  const KEY = 'smart-query-dashboard-assets-v1';
  const DIR_KEY = 'smart-query-dashboard-directories-v1';
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function read(key, fallback) {
    try { const value = JSON.parse(sessionStorage.getItem(key) || 'null'); return Array.isArray(value) ? value : clone(fallback); }
    catch (error) { return clone(fallback); }
  }
  function write(key, value) { sessionStorage.setItem(key, JSON.stringify(value)); }
  const DEFAULT_DIRECTORIES = [
    { id: 'n1', name: '销售分析', children: [
      { id: 'n1-1', name: '区域销售', children: [{ id: 'n1-1-1', name: '华东大区' }, { id: 'n1-1-2', name: '华北大区' }, { id: 'n1-1-3', name: '华南大区' }] },
      { id: 'n1-2', name: '渠道转化', children: [{ id: 'n1-2-1', name: '线上渠道' }, { id: 'n1-2-2', name: '线下渠道' }] },
      { id: 'n1-3', name: '目标达成' }
    ] },
    { id: 'n2', name: '客户分析', children: [
      { id: 'n2-1', name: '客户画像', children: [{ id: 'n2-1-1', name: '行业分布' }, { id: 'n2-1-2', name: '等级分布' }] },
      { id: 'n2-2', name: '客户复购' }
    ] },
    { id: 'n3', name: '库存分析', children: [{ id: 'n3-1', name: '仓库分布', children: [{ id: 'n3-1-1', name: '华东仓' }, { id: 'n3-1-2', name: '华北仓' }] }] },
    { id: 'n4', name: '财务分析' }
  ];
  const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
  const definitions = [
    ['d1', '近6个月销售额趋势', 'line', 'n1-1-1', '万元', months, [2180, 2360, 2510, 2890, 3120, 3248]],
    ['d2', '各大区订单量对比', 'bars', 'n1-1-1', '单', ['华东', '华南', '华北', '华中', '西南', '西北'], [18520, 15360, 12780, 10940, 9260, 7820]],
    ['d3', '客户行业分布TOP10', 'pie', 'n2-1-1', '%', ['电子产品', '制造业', '零售', '金融', '互联网', '物流', '医疗', '教育', '能源', '其他'], [32, 24, 18, 7, 5, 4, 3, 3, 2, 2]],
    ['d4', '月度销售目标完成度', 'line', 'n1-3', '%', months, [72, 76, 79, 81, 84, 86]],
    ['d5', 'TOP10客户贡献排行', 'bars', 'n1-1-2', '万元', ['上海伟业', '杭州凯越', '南京晨光', '苏州博远', '宁波海创', '合肥智达', '福州恒信', '南昌联盛', '无锡新科', '温州启航'], [320, 286, 264, 238, 216, 194, 176, 164, 152, 141]],
    ['d6', '渠道转化率分析', 'line', 'n1-2-1', '%', months, [8.2, 8.6, 9.4, 10.1, 10.8, 11.4]],
    ['d7', '库存周转率走势', 'bars', 'n3-1-1', '次', months, [3.4, 3.6, 4.1, 4.5, 4.9, 5.2]],
    ['d8', '产品线毛利率TOP榜', 'table', 'n4', '%', ['产品线', '毛利率', '环比'], [['高端系列', '32.6%', '+2.1 pct'], ['智能设备', '29.8%', '+1.4 pct'], ['配件类', '24.3%', '+0.8 pct'], ['服务类', '21.5%', '+0.5 pct']]],
    ['d9', '新老客户复购对比', 'pie', 'n2-2', '%', ['老客户', '新客户'], [62, 38]],
    ['d10', '城市订单量明细', 'table', 'n1-1', '单 / 万元', ['城市', '订单量', '销售额（万元）', '环比', '同比'], [['上海', '18,520', '2,840', '+12.4%', '+18.2%'], ['北京', '15,360', '2,460', '+9.8%', '+15.6%'], ['深圳', '12,780', '2,120', '+8.6%', '+13.4%'], ['广州', '10,940', '1,860', '+6.2%', '+10.8%']]],
    ['d11', '产品线销售占比', 'pie', 'n1-2-2', '%', ['高端系列', '新品', '标准系列', '其他'], [42, 28, 22, 8]],
    ['d12', '关键经营指标KPI总览', 'table', 'n4', '', ['指标', '当前值', '目标值', '状态'], [['销售额', '3,248 万元', '3,600 万元', '待达成'], ['订单量', '18,520 单', '18,000 单', '已达成'], ['客单价', '1,754 元', '1,700 元', '已达成'], ['目标完成率', '86%', '100%', '待达成']]]
  ];
  const seedMetadata = [
    ['张三', '2026-04-22 18:18:28'], ['李四', '2026-04-22 17:16:25'],
    ['王五', '2026-04-21 17:43:17'], ['张三', '2026-04-20 17:16:40'],
    ['李四', '2026-04-20 11:17:00'], ['赵六', '2026-04-19 17:17:28'],
    ['王五', '2026-04-18 09:32:45'], ['张三', '2026-04-17 14:08:12'],
    ['李四', '2026-04-16 16:55:33'], ['赵六', '2026-04-15 10:24:50'],
    ['王五', '2026-04-14 19:42:18'], ['张三', '2026-04-13 18:18:28']
  ];
  const defaults = definitions.map(([id, name, thumb, directoryId, unit, labels, values], index) => ({
    id, name, thumb, directoryId, unit, source: '智能问数', subject: id === 'd7' ? '库存分析' : ['d3', 'd9'].includes(id) ? '客户分析' : id === 'd8' ? '财务分析' : '销售分析',
    period: '近6个月', modifier: seedMetadata[index][0], time: seedMetadata[index][1],
    ...(thumb === 'table' ? { headers: labels, rows: values } : { labels, values })
  }));
  function list(includeDeleted = false) { return read(KEY, defaults).filter((asset) => includeDeleted || !asset.deleted); }
  function get(id, includeDeleted = false) { return list(includeDeleted).find((asset) => asset.id === id) || null; }
  function add(asset) {
    const saved = { ...clone(asset), id: 'd-saved-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), modifier: '当前用户', time: new Date().toLocaleString('sv-SE'), source: '智能问数' };
    write(KEY, [...list(true), saved]);
    return saved;
  }
  function remove(ids) { write(KEY, list(true).map((asset) => ids.includes(asset.id) ? { ...asset, deleted: true } : asset)); }
  function directories() { return read(DIR_KEY, DEFAULT_DIRECTORIES); }
  function flatten(items = directories(), parentPath = []) {
    return items.flatMap((item) => { const path = [...parentPath, item.name]; return [{ ...item, path: path.join(' / ') }, ...flatten(item.children || [], path)]; });
  }
  function inDirectory(asset, id) {
    if (!id) return true;
    const node = flatten().find((item) => item.id === id);
    return !!node && [node.id, ...flatten(node.children || []).map((item) => item.id)].includes(asset.directoryId);
  }
  function editorTree() {
    const assets = list();
    const walk = (nodes) => nodes.map((node) => ({ ...node, children: walk(node.children || []), charts: assets.filter((asset) => asset.directoryId === node.id).map((asset) => asset.id) }));
    return walk(directories());
  }
  function option(asset) {
    if (!asset || asset.thumb === 'table') return null;
    if (asset.option) return clone(asset.option);
    const theme = window.getSmartQueryThemeColors();
    const colors = [theme.primary, theme.primaryAccent, theme.focusBorder, theme.primaryBorder, '#fbbf24', '#f59e0b'];
    if (asset.thumb === 'pie') return {
      color: colors, tooltip: { trigger: 'item', formatter: '{b}：{c}' + (asset.unit || '') + ' ({d}%)' },
      legend: { bottom: 0, type: 'scroll', textStyle: { fontSize: 12 } },
      series: [{ type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'], label: { show: false }, data: asset.labels.map((name, i) => ({ name, value: asset.values[i] })) }]
    };
    return {
      color: colors, tooltip: { trigger: 'axis' }, grid: { top: 30, left: 60, right: 24, bottom: 42 },
      xAxis: { type: 'category', data: asset.labels, axisLabel: { fontSize: 12, interval: asset.labels.length > 6 ? 'auto' : 0 } },
      yAxis: { type: 'value', name: asset.unit || '', splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } } },
      series: [{ name: asset.name, type: asset.thumb === 'bars' ? 'bar' : 'line', smooth: true, barMaxWidth: 32, data: asset.values }]
    };
  }
  function tableHTML(asset) {
    if (!asset?.headers?.length) return '<div class="saved-query-empty">暂无表格数据</div>';
    return '<div class="inline-table"><table><thead><tr>' + asset.headers.map((cell) => '<th>' + escapeHTML(cell) + '</th>').join('') + '</tr></thead><tbody>' + (asset.rows || []).map((row) => '<tr>' + row.map((cell) => '<td>' + escapeHTML(cell) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }
  function meta(asset) { return '实时数据' + (asset.period ? ' · 统计周期：' + asset.period : '') + (asset.unit ? ' · 单位：' + asset.unit : '') + (asset.dataUpdatedAt ? ' · 数据截至：' + asset.dataUpdatedAt : ''); }
  // 兼容旧版本中尚未结束的手动更新任务，升级后不再恢复任务。
  ['smart-query-dashboard-preview-update-task', 'smart-query-board-update-task'].forEach((key) => { try { localStorage.removeItem(key); } catch (error) {} });
  window.DashboardAssets = { list, get, add, remove, directories, flatten, inDirectory, editorTree, option, tableHTML, meta, escapeHTML, setDirectories: (items) => write(DIR_KEY, items) };
})();
