(function (global) {
  'use strict';
  const KEY = 'smart-query-skill-catalog-v2';
  const STATUS_SAMPLE_MARKER = `${KEY}-status-samples-20260914`;
  const STATUS_LAYOUT_MARKER = `${KEY}-status-layout-20260914`;
  const PUBLISHED_SAMPLE_MARKER = `${KEY}-published-samples-20260914`;
  const FAILED_SAMPLE_TRIM_MARKER = `${KEY}-failed-samples-20260916`;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const ThemeCatalog = global.AnalysisThemeCatalog;
  const themes = ['成交与节资', '采购方式与品类', '供应商管理', '采购效能与闲废', '销售分析', '客户分析', '库存分析', '活动分析'];
  const today = () => new Date().toLocaleDateString('sv-SE');
  const DEFAULT_ANALYSIS_PROMPT = '结合当前内容前文已配置的指标和图表结果，解释本期采购表现、主要变化与需关注的问题。只使用已提供的数据，缺失依据时明确说明，不推断无依据的原因。控制在 200 字以内。';
  const MULTI_SQL_PROMPT = '请结合各 SQL 查询返回的成交金额、成交项目数和平均项目金额，综合分析本期采购规模和项目金额特征，并给出两条后续关注建议。仅使用查询结果，不将缺失数据视为 0；没有上期或目标数据时，不判断增长、下降或是否达标，不推断变化原因。控制在 200 字以内。';
  // Recognize only the previous built-in example when upgrading saved prototype data.
  const LEGACY_MULTI_SQL_PROMPT = '请基于成交金额 {{成交金额.value}} 万元、成交项目数 {{成交项目数.value}} 项、平均项目金额 {{平均项目金额.value}} 万元/项，综合分析本期采购规模和项目金额特征，并给出两条后续关注建议。仅使用查询结果，不将缺失数据视为 0；没有上期或目标数据时，不判断增长、下降或是否达标，不推断变化原因。控制在 200 字以内。';
  function analysisSqlExamples(variables) {
    const filter = reportSqlFilter(variables);
    return [
      { id: 'sql-amount', name: '成交金额', unit: '万元', sql: `SELECT ROUND(SUM(transaction_amount) / 10000, 2) AS value\nFROM procurement_transactions${filter};` },
      { id: 'sql-count', name: '成交项目数', unit: '项', sql: `SELECT COUNT(*) AS value\nFROM procurement_transactions${filter};` },
      { id: 'sql-average', name: '平均项目金额', unit: '万元/项', sql: `SELECT ROUND(SUM(transaction_amount) / NULLIF(COUNT(*), 0) / 10000, 2) AS value\nFROM procurement_transactions${filter};` }
    ];
  }
  function analysisQueries(part) {
    if (part.type !== 'analysis') return [];
    if (Array.isArray(part.sqlQueries)) return part.sqlQueries;
    return String(part.sql || '').trim() ? [{ id: 'sql-legacy', name: '查询结果', sql: part.sql, unit: part.unit || '' }] : [];
  }
  function validateAnalysisQueries(part) {
    const queries = analysisQueries(part), names = new Set();
    queries.forEach((query, index) => {
      const name = query.name.trim(), label = name || `SQL ${index + 1}`;
      if (!name) throw new Error(`SQL Tab「${label}」：指标名称不能为空。`);
      if (names.has(name)) throw new Error(`SQL Tab「${name}」：指标名称重复，请修改后重新测试。`);
      names.add(name);
      try {
        validateQuerySql(query.sql);
        validateExecutionTheme(query);
      } catch (error) { throw new Error(`SQL「${label}」：${error.message}`); }
      if (!/\bAS\s+value\b/i.test(query.sql)) throw new Error(`SQL Tab「${label}」：查询结果需使用 AS value 作为指标值别名。`);
    });
  }
  const LEGACY_CHART_PROMPT = '按采购方式展示成交金额，按金额降序排列；沿用模板图表类型、配色和尺寸。';
  const DEFAULT_CHART_PROMPT = `图表类型：纵向柱状图。
X轴：采购方式名称，对应分类字段 category。
Y轴：成交金额，对应数值字段 value，单位为万元，从 0 开始。
数据范围：按成交金额从高到低排序，最多展示前 10 项；无数据分类不展示。
数据标签：显示在柱体顶部，使用千分位并保留 2 位小数。
样式：柱体使用蓝色 #2F6BFF，悬浮状态使用深蓝色 #1D4ED8；背景为白色，保留浅灰色横向网格线。
图例与尺寸：单系列不显示图例；宽度占满内容区域，高度 320px；X轴名称过长时旋转 30° 并完整显示。
空状态：查询无结果时显示“暂无图表数据”。`;
  const chartPromptCatalog = {
    'part-24': `图表类型：柱线组合图。
X轴：事业大区或事业部名称，按成交金额从高到低排列。
左Y轴：成交金额，单位为万元，从 0 开始；使用柱状系列。
右Y轴：环比变化率，单位为 %，保留 2 位小数；使用折线系列并保留 0% 基准线。
数据标签：柱顶显示成交金额，折线节点显示环比；负增长使用橙色标识。
样式：成交金额柱使用 #2F6BFF，环比折线使用 #F59E0B；白色背景，保留浅灰横向网格线，图例置于顶部。
尺寸：宽度占满内容区域，高度 340px；X轴名称过长时旋转 30°。
空状态：无数据组织不展示，查询无结果时显示“暂无图表数据”。`,
    'part-48': `图表类型：堆叠柱状图。
X轴：事业大区或事业部名称。
Y轴：成交金额，单位为万元，从 0 开始。
系列：按公开招标、询比采购、竞争性谈判、单源直接采购等采购方式分组并堆叠。
排序与标签：按各组织成交总额从高到低排列；柱顶显示总金额，悬浮时显示各采购方式金额及占比。
样式：各采购方式使用固定区分色，图例置于顶部；白色背景，保留浅灰横向网格线。
尺寸：宽度占满内容区域，高度 340px；X轴名称过长时旋转 30°。
空状态：无数据系列不进入图例，查询无结果时显示“暂无图表数据”。`,
    'part-50': `图表类型：环形图。
分类维度：采购大类，包括货物、服务、工程及其他分类。
数值：成交金额，单位为万元；扇区按成交金额从高到低排列。
标签：显示“采购大类名称、成交金额、占比”，占比保留 2 位小数；小于 3% 的标签通过引导线显示。
样式：货物类使用 #2F6BFF、服务类使用 #14B8A6、工程类使用 #F59E0B，其他分类使用 #94A3B8；圆环中心显示成交总额。
图例与尺寸：图例置于右侧；宽度占满内容区域，高度 320px，内外半径比例为 55%/78%。
空状态：金额为 0 的分类不展示，查询无结果时显示“暂无图表数据”。`,
    'part-52': `图表类型：横向柱状图。
Y轴：采购品类名称，按成交金额从高到低排列。
X轴：成交金额，单位为万元，从 0 开始。
数据范围：仅展示成交金额前 10 名品类。
数据标签：显示在柱体右侧，使用千分位并保留 2 位小数；同时显示该品类成交金额占比。
样式：柱体使用蓝色渐变 #2F6BFF 至 #60A5FA；不显示图例，保留浅灰纵向网格线。
尺寸：宽度占满内容区域，高度 380px；品类名称最多显示两行，超长内容使用省略号并在悬浮时完整展示。
空状态：查询无结果时显示“暂无图表数据”。`,
    'part-54': `图表类型：堆叠柱状图。
X轴：事业大区或事业部名称。
Y轴：成交金额，单位为万元，从 0 开始。
系列：按主要采购品类分组并堆叠，成交金额占比不足 3% 的品类合并为“其他”。
排序与标签：按各组织成交总额从高到低排列；柱顶显示总金额，悬浮时显示品类金额及占比。
样式：不同品类使用固定区分色，图例置于顶部并支持换行；白色背景，保留浅灰横向网格线。
尺寸：宽度占满内容区域，高度 350px；X轴名称过长时旋转 30°。
空状态：查询无结果时显示“暂无图表数据”。`,
    'part-84': `图表类型：100% 堆叠柱状图。
X轴：成交金额 TOP10 采购品类，按品类成交总额从高到低排列。
Y轴：各采购方式金额占比，范围为 0% 至 100%。
系列：公开招标、询比采购、竞争性谈判、单源直接采购等采购方式。
数据标签：占比不低于 8% 的区段显示百分比，保留 1 位小数；悬浮时显示采购方式、成交金额及占比。
样式：采购方式使用固定区分色，图例置于顶部；保留 0%、25%、50%、75%、100% 网格线。
尺寸：宽度占满内容区域，高度 350px；X轴品类名称旋转 30°。
空状态：无数据系列不进入图例，查询无结果时显示“暂无图表数据”。`,
    'part-93': `图表类型：多系列折线图。
X轴：统计月份，按时间从早到晚排列，格式为 YYYY-MM。
Y轴：采购率，单位为 %，范围为 0% 至 100%。
系列：公开采购率、集中采购率、电子采购率；各系列使用独立颜色和圆形节点。
参考线：公开采购率和集中采购率显示 95% 目标线，使用灰色虚线并标注“目标值”。
数据标签：默认显示最新月份数值，悬浮时显示全部系列当月数值，保留 2 位小数。
样式：图例置于顶部；白色背景，保留浅灰横向网格线。
尺寸：宽度占满内容区域，高度 330px；无数据月份保留断点，不使用 0 补齐。
空状态：查询无结果时显示“暂无图表数据”。`,
    'part-95': `图表类型：分组柱状图。
X轴：事业大区或事业部名称。
Y轴：采购率，单位为 %，范围为 0% 至 100%。
系列：公开采购率、集中采购率、电子采购率，每个组织并列展示三根柱体。
排序与标签：按公开采购率从高到低排列；柱顶显示百分比，保留 2 位小数。
样式：公开采购率使用 #2F6BFF、集中采购率使用 #14B8A6、电子采购率使用 #8B5CF6；图例置于顶部，保留浅灰横向网格线。
尺寸：宽度占满内容区域，高度 350px；X轴名称过长时旋转 30°。
空状态：缺失指标不以 0 补齐，查询无结果时显示“暂无图表数据”。`,
    'part-99': `图表类型：柱线组合图。
X轴：采购大类名称，包括货物、服务、工程及其他分类。
左Y轴：节资金额，单位为万元，从 0 开始；使用柱状系列。
右Y轴：节资率，单位为 %，保留 2 位小数；使用折线系列。
排序与标签：按节资金额从高到低排列；柱顶显示节资金额，折线节点显示节资率。
样式：节资金额柱使用 #2F6BFF，节资率折线使用 #F59E0B；双轴标题和图例置于顶部，保留浅灰横向网格线。
尺寸：宽度占满内容区域，高度 330px。
空状态：缺失节资率不连接折线，查询无结果时显示“暂无图表数据”。`,
    'part-100': `图表类型：柱线组合图。
X轴：事业大区或事业部名称。
左Y轴：节资金额，单位为万元，从 0 开始；使用柱状系列。
右Y轴：节资率，单位为 %，保留 2 位小数；使用折线系列。
排序与标签：按节资金额从高到低排列；柱顶显示节资金额，折线节点显示节资率，负值使用橙色标识。
样式：节资金额柱使用 #2F6BFF，节资率折线使用 #14B8A6；图例置于顶部，白色背景并保留浅灰横向网格线。
尺寸：宽度占满内容区域，高度 350px；X轴名称过长时旋转 30°。
空状态：缺失节资率不连接折线，查询无结果时显示“暂无图表数据”。`,
    'part-129': `图表类型：折线图。
X轴：统计月份，按时间从早到晚排列，格式为 YYYY-MM。
Y轴：项目采购成功率，单位为 %，显示范围为 98% 至 100%。
系列：仅展示项目采购成功率，使用圆形节点连接；同时显示 99.5% 参考线。
数据标签：每个节点显示成功率，保留 2 位小数；悬浮时补充当月关闭项目数和异常关闭项目数。
样式：折线使用 #2F6BFF，参考线使用 #F59E0B 橙色虚线；单系列不显示图例，保留浅灰横向网格线。
尺寸：宽度占满内容区域，高度 300px。
空状态：无数据月份保留断点，不使用 0 补齐；查询无结果时显示“暂无图表数据”。`
  };
  function chartPrompt(part) { return chartPromptCatalog[part?.id] || DEFAULT_CHART_PROMPT; }
  function sqlTables(sql) {
    const identifier = '(?:`[^`]+`|"[^"]+"|\\[[^\\]]+\\]|[a-zA-Z_]\\w*)';
    const tableIdentifier = `${identifier}(?:\\s*\\.\\s*${identifier})*`;
    const pattern = new RegExp(`\\b(?:FROM|JOIN)\\s+(${tableIdentifier})`, 'ig');
    const nextTable = new RegExp(`^\\s*(?:(?:AS\\s+)?${identifier}\\s*)?,\\s*(${tableIdentifier})`, 'i');
    const query = String(sql || '').replace(/'(?:''|\\[\s\S]|[^'\\])*'|--[^\r\n]*|\/\*[\s\S]*?\*\//g, ' ');
    const tables = [];
    for (const source of query.matchAll(pattern)) {
      let rest = query.slice(source.index + source[0].length);
      for (let match = source; match; match = rest.match(nextTable)) {
        const physicalName = match[1].replace(/[`"\[\]]/g, '').replace(/\s*\.\s*/g, '.');
        const name = physicalName.split('.').pop();
        if (!tables.some((table) => table.physicalName === physicalName)) tables.push({ physicalName, name });
        if (match !== source) rest = rest.slice(match[0].length);
      }
    }
    return tables;
  }
  function executionThemeOptions() {
    return ThemeCatalog.executionThemes();
  }
  function executionTheme(query) {
    return executionThemeOptions().find((theme) => theme.id === query.executionThemeId);
  }
  function missingThemeTables(theme, tables) {
    const names = new Set(theme.tables.map((table) => table.name.toLowerCase()));
    return tables.filter((table) => !names.has(table.name.toLowerCase()));
  }
  function suggestExecutionTheme(query, part) {
    const tables = sqlTables(query.sql);
    if (!tables.length) return '';
    const candidates = executionThemeOptions().filter((theme) => theme.database && theme.status !== 'disabled' && !missingThemeTables(theme, tables).length);
    if (candidates.length === 1) return candidates[0].id;
    const scored = candidates.map((theme) => {
      const keywords = theme.keywords.split('|').filter(Boolean);
      const scoreTitle = (value) => {
        const title = String(value || '');
        return keywords.filter((word) => title.includes(word)).length + (title.includes(theme.name) ? 3 : 0);
      };
      return { theme, score: scoreTitle(part.name) + (query === part ? 0 : 3 * scoreTitle(query.name)) };
    });
    const best = Math.max(0, ...scored.map(({ score }) => score));
    const likely = best ? scored.filter(({ score }) => score === best).map(({ theme }) => theme) : candidates;
    if (likely.length === 1) return likely[0].id;
    return likely.find((theme) => theme.name === part.theme)?.id || '';
  }
  function syncExecutionTheme(query, part, sqlChanged = false) {
    if (!Object.hasOwn(query, 'executionThemeId') || (sqlChanged && !query.executionThemeManual)) {
      query.executionThemeId = suggestExecutionTheme(query, part);
    }
  }
  function validateExecutionTheme(query) {
    if (!query.executionThemeId) throw new Error('请选择执行主题。');
    const theme = executionTheme(query);
    if (!theme) throw new Error('已选执行主题已删除，请重新选择。');
    if (theme.status === 'disabled') throw new Error(`执行主题「${theme.name}」已禁用，请重新选择。`);
    if (!theme.database) throw new Error(`执行主题「${theme.name}」未绑定执行库，请调整主题。`);
    const missing = missingThemeTables(theme, sqlTables(query.sql));
    if (missing.length) throw new Error(`执行主题「${theme.name}」的关联模型不包含表 ${missing.map((table) => table.physicalName).join('、')}。`);
  }
  function executionSnapshot(part) {
    return (part.type === 'analysis' ? analysisQueries(part) : [part]).map((query) => {
      const theme = executionTheme(query);
      const available = !!theme?.database && theme.status !== 'disabled';
      const missing = available ? missingThemeTables(theme, sqlTables(query.sql)).map((table) => table.physicalName) : [];
      return [query.executionThemeId || '', available ? theme.database.id : '', missing];
    });
  }
  function executionReady(snapshot) {
    return snapshot.every(([themeId, databaseId, missing]) => themeId && databaseId && !missing.length);
  }
  function sqlAggregation(sql) {
    const match = String(sql || '').match(/\b(SUM|COUNT|AVG|MAX|MIN)\s*\(/i);
    return match ? match[1].toUpperCase() : '直接取值';
  }
  function indicatorName(part) {
    const name = String(part.name || '').replace(/分析$/, '').trim();
    if (part.type === 'chart') {
      if (/数量|项目数/.test(name) || /COUNT\s*\(/i.test(part.sql || '')) return '成交项目数';
      if (/节资率/.test(name)) return '节资率';
      if (/节资/.test(name)) return '节资金额';
      return '成交金额';
    }
    return name && name !== '待识别内容' ? name : '';
  }
  function inferredManagedIndicators(part) {
    const name = indicatorName(part);
    if (!name || part.type === 'analysis') return [];
    return [{
      name,
      type: /率|占比|环比|同比/.test(name) ? '衍生指标' : '原子指标',
      unit: part.unit || (/金额/.test(name) ? '万元' : /数量|项目数/.test(name) ? '项' : ''),
      aggregation: sqlAggregation(part.sql),
      definition: part.definition || `按报告月份和组织范围统计${name}。`
    }];
  }
  function syncPartMetadata(part, refreshIndicators = false) {
    if (!part || part.type === 'analysis') {
      if (part) {
        analysisQueries(part).forEach((query) => syncExecutionTheme(query, part));
        delete part.executionSource;
        part.managedIndicators = [];
      }
      return part;
    }
    syncExecutionTheme(part, part);
    const theme = executionTheme(part);
    part.executionSource = {
      databaseName: theme?.database?.name || '待识别执行库',
      databaseType: theme?.database?.type || '',
      tables: sqlTables(part.sql).map((table) => ({ ...table, label: theme?.tables.find((item) => item.name.toLowerCase() === table.name.toLowerCase())?.alias || table.name }))
    };
    if (refreshIndicators || !Array.isArray(part.managedIndicators) || !part.managedIndicators.length) part.managedIndicators = inferredManagedIndicators(part);
    else part.managedIndicators = part.managedIndicators.map((indicator) => ({ ...indicator, aggregation: sqlAggregation(part.sql), definition: indicator.definition || part.definition }));
    return part;
  }
  function preparePart(part, index = 0, variables) {
    const type = part.type || 'metric';
    const filter = reportSqlFilter(variables);
    const sql = type === 'chart'
      ? `SELECT procurement_method AS category,\n  SUM(transaction_amount) / 10000 AS value\nFROM procurement_transactions${filter}\nGROUP BY procurement_method\nORDER BY value DESC;`
      : `SELECT ${/项目|数量/.test(part.name) ? 'COUNT(*)' : /率|占比|环比/.test(part.name) ? 'AVG(rate_value)' : 'SUM(transaction_amount) / 10000'} AS value\nFROM procurement_transactions${filter};`;
    const prepared = {
      id: part.id || `part-${index + 1}`, type, name: part.name || '待识别内容', theme: themes[0],
      definition: `按报告月份和组织范围统计${part.name || '当前指标'}。`, sql: type === 'analysis' ? '' : sql,
      prompt: type === 'metric' ? '按 SQL 查询结果回填当前指标，沿用原文单位和数值格式，仅输出指标值。' : type === 'chart' ? chartPrompt(part) : DEFAULT_ANALYSIS_PROMPT,
      field: 'value', categoryField: 'category', unit: part.unit || '', decimals: 2,
      confirmed: false, revision: 1, messages: [], result: null, ...clone(part)
    };
    if (type === 'analysis') {
      prepared.sqlQueries = analysisQueries(prepared).map((query, queryIndex) => ({
        id: String(query.id || `sql-${queryIndex + 1}`), name: String(query.name ?? `SQL ${queryIndex + 1}`), sql: String(query.sql || ''), unit: String(query.unit || ''),
        ...(typeof query.executionThemeId === 'string' ? { executionThemeId: query.executionThemeId } : {}),
        ...(query.executionThemeManual ? { executionThemeManual: true } : {})
      }));
      prepared.sql = '';
    }
    return syncPartMetadata(prepared);
  }
  function coverDatePart() {
    return preparePart({ id: 'cover-generated-date', type: 'analysis', name: '报告生成日期', sourceText: '2026 年 7 月 16 日', prompt: '使用本次报告的生成日期，按“YYYY 年 M 月 D 日”格式输出，仅输出日期。', anchor: { kind: 'page', page: 1, x: 48.4, y: 73.8, w: 18.8, h: 1.9 } });
  }
  const usesGenerationDate = (part) => part.type === 'analysis' && /(?:报告|本次).*生成(?:时间|日期)|生成(?:时间|日期)/.test(part.prompt || '');
  const hasAnalysisSql = (part) => analysisQueries(part).length > 0;
  const parameterCatalog = {
    __proto__: null,
    report_month: { label: '报告月份', type: 'month', runtimeKey: 'month', hint: '最近有数据月份' },
    org_name: { label: '组织范围', type: 'text', runtimeKey: 'org', hint: '当前业务组织' },
    generated_at: { label: '报告生成时间', type: 'date', runtimeKey: 'generatedAt', hint: '当前日期' }
  };
  function previousMonth() {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  function parameterKey(label, index = 0) {
    if (/报告月份|统计月份|数据月份|年月|统计周期/.test(label)) return 'report_month';
    if (/组织|主体范围|公司|机构|部门/.test(label)) return 'org_name';
    if (/(?:生成|报告).*(?:时间|日期)|报告日期/.test(label)) return 'generated_at';
    let hash = 0;
    for (const character of label) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    return `custom_${hash || index + 1}`;
  }
  function parameterDefault(key) {
    if (key === 'report_month') return previousMonth();
    if (key === 'org_name') return '华润建材科技';
    if (key === 'generated_at') return today();
    return '';
  }
  function promptLabels(prompt) {
    return [...new Set([...String(prompt || '').matchAll(/【([^【】\r\n]+)】/g)].map((match) => match[1].trim()).filter(Boolean))];
  }
  function sqlVariableToken(name) {
    return '${' + name + '}';
  }
  function validSqlVariableName(name) {
    return !!name && name === name.trim() && !/[{}【】\p{Cc}\u2028\u2029]/u.test(name);
  }
  function reportSqlFilter(variables) {
    const conditions = ['report_month', 'org_name'].map((key) => {
      const name = variables?.find((variable) => variable.key === key)?.label;
      return key + ' = ' + sqlVariableToken(validSqlVariableName(name) ? name : parameterCatalog[key].label);
    });
    return '\nWHERE ' + conditions.join('\n  AND ');
  }
  function availableParameterKey(label, used, index) {
    const base = parameterKey(label, index);
    let key = base;
    for (let suffix = 2; used.has(key); suffix++) key = `${base}_${suffix}`;
    return key;
  }
  function createPromptVariable(label, variables) {
    return { label, key: availableParameterKey(label, new Set(variables.map(({ key }) => key)), variables.length) };
  }
  function normalizePromptVariables(skill) {
    const labels = promptLabels(skill.userPrompt);
    const saved = new Map((Array.isArray(skill.promptVariables) ? skill.promptVariables : []).map(({ key, label }) => [label, key]));
    const used = new Set(labels.map((label) => saved.get(label)).filter(Boolean));
    return labels.map((label, index) => {
      let key = saved.get(label);
      if (!key) {
        key = availableParameterKey(label, used, index);
        used.add(key);
      }
      return { key, label };
    });
  }
  const legacySqlVariableName = /^[A-Za-z_]\w*$/;
  function sqlVariableLookup(variables) {
    const names = new Map(variables.map((variable) => [variable.key, variable]));
    variables.forEach((variable) => {
      if (!names.has(variable.label)) names.set(variable.label, variable);
    });
    return names;
  }
  function findSqlVariable(name, legacy, lookup) {
    const variable = lookup.get(name);
    return legacy && variable?.key !== name ? undefined : variable;
  }
  // Consume quoted literals, identifiers, and comments before looking for value placeholders.
  const sqlTokens = () => /--[^\r\n]*|#[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)|'(?:''|\\[\s\S]|[^'\\])*'|"(?:""|\\[\s\S]|[^"\\])*"|`(?:``|[^`])*`|\$\{([^}\r\n]*)(\}|(?=\r?\n|$))|(?<!:):([A-Za-z_]\w*)/g;
  function sqlReferences(sql) {
    const references = [];
    for (const [token, name, closing, legacyKey] of String(sql || '').matchAll(sqlTokens())) {
      const quoted = /^(['"`])\$\{([^{}\r\n]+)\}\1$/.exec(token);
      if (quoted) references.push({ token, name: quoted[2], quoted: true, valid: validSqlVariableName(quoted[2]) });
      else if (name !== undefined || legacyKey) references.push({
        token, name: legacyKey || name, legacy: !!legacyKey, valid: !!legacyKey || (!!closing && validSqlVariableName(name))
      });
    }
    return references;
  }
  function rewritePartSql(part, lookup, targetByKey, targetLookup = lookup) {
    const queries = part.type === 'analysis' ? analysisQueries(part) : [part];
    let changed = false, previousSignature;
    for (const query of queries) {
      if (!query.sql) continue;
      const sql = query.sql.replace(sqlTokens(), (token, name, closing, legacyKey) => {
        if (!legacyKey && (!closing || !validSqlVariableName(name))) return token;
        const variable = findSqlVariable(legacyKey || name, !!legacyKey, lookup);
        if (!variable) return token;
        const target = targetByKey.get(variable.key);
        return validSqlVariableName(target) && findSqlVariable(target, false, targetLookup)?.key === variable.key
          ? sqlVariableToken(target)
          : token;
      });
      if (sql === query.sql) continue;
      if (!changed && part.type === 'analysis' && part.result?.params) previousSignature = signature(part, part.result.params);
      query.sql = sql;
      changed = true;
    }
    if (previousSignature && part.result.signature === previousSignature) part.result.signature = signature(part, part.result.params);
    return changed;
  }
  function partQueries(part) {
    return part.type === 'analysis' ? analysisQueries(part) : [{ name: '', sql: part.sql }];
  }
  function sqlVariableUsages(parts, key, lookup) {
    return parts.flatMap((part) => partQueries(part).filter((query) => sqlReferences(query.sql).some(({ valid, quoted, name, legacy }) =>
      valid && !quoted && findSqlVariable(name, legacy, lookup)?.key === key))
      .map((query) => query.name ? `${part.name} / ${query.name}` : part.name));
  }
  function updatePromptVariables(skill, prompt, variables) {
    const lookup = sqlVariableLookup(skill.promptVariables);
    const nextNames = new Map(variables.map(({ key, label }) => [key, label]));
    const renamed = new Map();
    for (const { key, label } of skill.promptVariables) {
      const nextName = nextNames.get(key);
      if (nextName) {
        if (nextName !== label) renamed.set(key, nextName);
        continue;
      }
      const usages = sqlVariableUsages(skill.parts, key, lookup);
      if (usages.length) throw new Error(`「${label}」仍被以下 SQL 引用：${usages.join('、')}`);
    }
    let updatedParts = 0;
    if (renamed.size) {
      const targetLookup = sqlVariableLookup(variables);
      skill.parts.forEach((part) => {
        if (!rewritePartSql(part, lookup, renamed, targetLookup)) return;
        invalidate(skill, part.id);
        updatedParts++;
      });
    }
    skill.userPrompt = prompt;
    skill.promptVariables = variables;
    return updatedParts;
  }
  function normalizeTestParams(skill, current = skill?.testParams) {
    const definitions = new Map();
    const add = (key, label, usage) => {
      const known = parameterCatalog[key] || {};
      const existing = definitions.get(key);
      if (existing) {
        existing.usage = [...new Set([...existing.usage, usage])];
        if (usage === '业务端变量') existing.label = label;
        return;
      }
      definitions.set(key, { key, label: label || known.label || key, type: known.type || 'text', runtimeKey: known.runtimeKey || key, hint: known.hint || '请填写测试值', required: true, usage: [usage] });
    };
    const promptVariables = normalizePromptVariables(skill);
    const lookup = sqlVariableLookup(promptVariables);
    promptVariables.forEach(({ key, label }) => add(key, label, '业务端变量'));
    (skill.parts || []).flatMap(partQueries).forEach(({ sql }) => {
      for (const { token, name, legacy, valid, quoted } of sqlReferences(sql)) {
        if (!valid || quoted) continue;
        const variable = findSqlVariable(name, legacy, lookup);
        if (variable || legacySqlVariableName.test(name)) {
          const key = variable?.key || name;
          add(key, variable?.label || parameterCatalog[key]?.label || key, `SQL ${token}`);
        }
      }
    });
    if ((skill?.parts || []).some(usesGenerationDate)) add('generated_at', parameterCatalog.generated_at.label, '内容生成');
    const saved = Array.isArray(current) ? current : [];
    return [...definitions.values()].map((definition) => {
      const previous = saved.find((item) => item.key === definition.key) || saved.find((item) => item.label === definition.label);
      return { ...definition, value: previous?.value ?? parameterDefault(definition.key) };
    });
  }
  function parameterSettings(definitions, readValue, question) {
    const settings = { month: '', org: '', generatedAt: '', variables: Object.create(null), requiredKeys: [], question, sqlValues: Object.create(null) };
    definitions.forEach((parameter) => {
      const { key, label, usage } = parameter;
      const value = String(readValue(parameter) ?? '').trim();
      const runtimeKey = parameterCatalog[key]?.runtimeKey;
      if (runtimeKey) settings[runtimeKey] = value;
      else if (!Object.hasOwn(settings, key)) Object.defineProperty(settings, key, { value, enumerable: true });
      settings.variables[label] = value;
      settings.sqlValues[key] = { label, value };
      if (!usage || usage.includes('业务端变量')) settings.requiredKeys.push(key);
    });
    return settings;
  }
  function generationDate(params) {
    const date = params.generatedAt ? new Date(params.generatedAt) : new Date();
    if (Number.isNaN(date.getTime())) throw new Error('报告生成日期无效，请重新测试。');
    return date;
  }
  function sampleParts() {
    const parts = (global.SkillTemplateSample || []).map((part, index) => preparePart(part, index));
    const pending = new Set();
    for (const part of parts) {
      part.confirmed = pending.has(part.type);
      pending.add(part.type);
    }
    const example = parts.find((part) => part.id === 'part-25' && part.type === 'analysis');
    if (example) Object.assign(example, { name: '采购规模综合分析（多 SQL 示例）', sqlQueries: analysisSqlExamples(), prompt: MULTI_SQL_PROMPT, confirmed: false });
    return [coverDatePart(), ...parts];
  }
  function sampleOutline() {
    const entries = [
      [1, '本月核心指标仪表盘', 2], [2, '成交统计', 2], [2, '预算节资统计', 3], [2, '采购三率统计', 3], [2, '闲废处置统计', 4],
      [1, '本月采购主体分布', 4], [1, '采购方式及品类分析', 7], [2, '采购方式分析', 7], [3, '招标方式细分', 7], [3, '非招方式细分', 7],
      [3, '事业大区与采购方式分析', 8], [2, '采购品类分析', 8], [3, '采购大类分析', 8], [3, '当月品类成交TOP10', 9], [3, '事业大区品类成交TOP3分析', 10],
      [3, '品类成交及采购方式分析', 12], [2, '供应商分析', 13], [3, '供应商数量与投标分析', 13], [3, '黑名单供应商', 13], [3, '成交金额TOP10供应商', 14],
      [1, '采购效能分析', 14], [2, '采购「三率」指标分析', 14], [3, '三率月度走势情况', 15], [3, '事业群采购三率分析', 15], [2, '节资率分析', 16],
      [3, '按采购大类节资率', 16], [3, '按事业群节资率', 17], [2, '采购时效分析', 17], [2, '采购成功率分析', 19], [1, '闲废处置业务', 21],
      [2, '月度概况', 21], [2, '典型案例', 21]
    ];
    return entries.map(([level, text, page], index) => ({ id: `outline-${index + 1}`, level, text, page }));
  }
  function defaultSkill() {
    return {
      id: 'skill-monthly', kind: 'monthly', code: 'report_monthly', name: '月度采购快报',
      desc: '根据采购业务数据，按原 Word 模板生成成交、节资、采购结构和供应商分析快报。',
      category: '经营报告', themes: themes.slice(0, 4),
      userPrompt: '请生成【报告月份】【组织范围】的月度采购快报，重点分析成交金额、节资情况、采购结构及主要变化。',
      reportTemplate: { name: '华润建材科技月度采购快报_格式调整版.docx', type: 'DOCX', source: 'sample', pages: 21, pageImageBase: '../../assets/docs/monthly-procurement-pages/page-', downloadUrl: '../../assets/docs/monthly-procurement-report.docx' },
      outline: sampleOutline(),
      parts: sampleParts(), parseStatus: 'completed', enabled: false, sort: 10, updated: today(), schemaVersion: 2
    };
  }
  function completedStatusSkill({ id, code, name, desc, category, themes: skillThemes, userPrompt, templateName, enabled, updated, sort }) {
    const base = defaultSkill();
    return {
      ...base, id, code, name, desc, category, themes: skillThemes, userPrompt, enabled, updated, sort,
      reportTemplate: { ...base.reportTemplate, name: templateName },
      parts: base.parts.map((part) => ({ ...part, confirmed: true, confirmedAt: `${updated}T09:30:00.000Z` }))
    };
  }
  function additionalPublishedSkills() {
    return [
      completedStatusSkill({
        id: 'skill-procurement-efficiency-monthly', code: 'procurement_efficiency_monthly', name: '采购效能月报',
        desc: '按月分析采购执行效率、周期变化及重点环节改进情况。', category: '经营报告', themes: ['采购效能与闲废', '采购方式与品类'],
        userPrompt: '请生成【报告月份】【组织范围】的采购效能月报，重点分析采购周期、执行效率及主要变化。',
        templateName: '采购效能月报模板.docx', enabled: true, updated: '2026-09-13', sort: 25
      }),
      completedStatusSkill({
        id: 'skill-key-category-analysis', code: 'key_category_analysis', name: '重点品类采购分析',
        desc: '分析重点采购品类的成交结构、节资表现及采购方式分布。', category: '专项分析', themes: ['采购方式与品类', '成交与节资'],
        userPrompt: '请生成【报告月份】【组织范围】的重点品类采购分析，说明成交结构、节资表现和采购方式变化。',
        templateName: '重点品类采购分析模板.docx', enabled: true, updated: '2026-09-11', sort: 26
      })
    ];
  }
  function defaultSkills() {
    return [
      defaultSkill(),
      completedStatusSkill({
        id: 'skill-supplier-monthly', code: 'supplier_monthly', name: '供应商绩效月报',
        desc: '按月分析供应商参与、履约、异常及采购贡献情况。', category: '专项分析', themes: ['供应商管理', '采购效能与闲废'],
        userPrompt: '请生成【报告月份】【组织范围】的供应商绩效月报，分析供应商参与、履约与异常情况。',
        templateName: '供应商绩效月报模板.docx', enabled: true, updated: '2026-09-12', sort: 20
      }),
      ...additionalPublishedSkills(),
      completedStatusSkill({
        id: 'skill-cost-reduction-monthly', code: 'cost_reduction_monthly', name: '采购降本月度分析',
        desc: '分析采购节资、成交价格变化及重点降本机会。', category: '专项分析', themes: ['成交与节资', '采购方式与品类'],
        userPrompt: '请生成【报告月份】【组织范围】的采购降本分析，重点说明节资表现和主要变化。',
        templateName: '采购降本月度分析模板.docx', enabled: false, updated: '2026-09-10', sort: 30
      }),
      {
        id: 'skill-compliance-region', kind: 'monthly', code: 'compliance_region', name: '区域采购合规专项报告',
        desc: '', category: '', themes: [], userPrompt: '', parts: [], parseStatus: 'parsing', enabled: false,
        updated: today(), sort: 40, reportTemplate: { name: '区域采购合规专项报告模板.docx', type: 'DOCX', source: 'preset-status', size: 2846720 }
      },
      {
        id: 'skill-inventory-turnover', kind: 'monthly', code: 'inventory_turnover', name: '库存周转专项分析',
        desc: '', category: '', themes: [], userPrompt: '', parts: [], parseStatus: 'failed', parseError: '未识别到有效的 Word 正文结构，请检查模板后重新导入。', enabled: false,
        updated: '2026-09-08', sort: 50, reportTemplate: { name: '库存周转专项分析模板.docx', type: 'DOCX', source: 'preset-status', size: 1763840 }
      }
    ];
  }
  function isReady(s) {
    return s.parseStatus === 'completed' && !!s.name?.trim() && !!s.desc?.trim() && !!s.category && !!s.userPrompt?.trim() && s.themes?.length > 0 && s.parts?.length > 0 && s.parts.every((p) => p.confirmed && p.prompt?.trim() && executionReady(executionSnapshot(p)));
  }
  function normalizeSkill(source, onSqlMigration) {
    const result = clone(source);
    const migrateSampleChartPrompt = result.reportTemplate?.source === 'sample';
    result.promptVariables = normalizePromptVariables(result);
    const variableNames = new Map(result.promptVariables.map(({ key, label }) => [key, label]));
    const lookup = sqlVariableLookup(result.promptVariables);
    let sqlMigrated = false;
    ['executionPrompt', 'reportContentPrompt', 'reportFormatPrompt', 'reportPrompt', 'configSources', 'draftConfig', 'workflowStatus'].forEach((key) => delete result[key]);
    if (result.reportTemplate) ['generatedContentPrompt', 'generatedFormatPrompt', 'generatedPrompt'].forEach((key) => delete result.reportTemplate[key]);
    result.parts = (result.parts || []).map((part) => {
      const prepared = preparePart(part, 0, result.promptVariables);
      if (migrateSampleChartPrompt && !result.enabled && prepared.id === 'part-25' && !Array.isArray(part.sqlQueries) && !String(part.sql || '').trim() && prepared.prompt === DEFAULT_ANALYSIS_PROMPT) {
        Object.assign(prepared, { name: '采购规模综合分析（多 SQL 示例）', sqlQueries: analysisSqlExamples(result.promptVariables), prompt: MULTI_SQL_PROMPT, confirmed: false, result: null, revision: prepared.revision + 1 });
      }
      if (prepared.type === 'analysis' && prepared.prompt === LEGACY_MULTI_SQL_PROMPT) {
        Object.assign(prepared, { prompt: MULTI_SQL_PROMPT, confirmed: false, result: null, revision: prepared.revision + 1 });
      }
      if (prepared.result) delete prepared.result.resolvedPrompt;
      if (migrateSampleChartPrompt && prepared.type === 'chart' && prepared.prompt === LEGACY_CHART_PROMPT) prepared.prompt = chartPrompt(prepared);
      delete prepared.dependencies;
      delete prepared.missingDependencies;
      if (prepared.type === 'analysis' && /^依据引用数据/.test(prepared.prompt || '')) prepared.prompt = prepared.prompt.replace(/^依据引用数据/, '结合当前内容前文已配置的指标和图表结果');
      if (variableNames.size && rewritePartSql(prepared, lookup, variableNames)) sqlMigrated = true;
      syncPartMetadata(prepared);
      const execution = executionSnapshot(prepared);
      if (execution.length || part.executionContext) {
        prepared.executionContext = execution.length ? JSON.stringify(execution) : '';
        if (part.executionContext !== prepared.executionContext) {
          sqlMigrated = true;
          if (part.executionContext !== undefined || prepared.result || !executionReady(execution)) {
            prepared.revision += 1;
            prepared.confirmed = false;
            if (prepared.result) prepared.result.stale = true;
          }
        }
      }
      return prepared;
    });
    if (!result.contentConfigVersion) {
      result.parts.forEach((p) => { if (p.type === 'metric' && !p.prompt?.trim()) p.prompt = preparePart({ type: 'metric' }).prompt; });
      if (result.reportTemplate?.source === 'sample' && !result.parts.some((p) => p.id === 'cover-generated-date')) result.parts.unshift(coverDatePart());
      result.contentConfigVersion = 2;
    } else if (result.contentConfigVersion < 2) {
      result.contentConfigVersion = 2;
    }
    result.themes = Array.isArray(result.themes) ? result.themes : [];
    result.outline = Array.isArray(result.outline) ? result.outline : result.reportTemplate?.source === 'sample' ? sampleOutline() : [];
    result.testParams = normalizeTestParams(result, result.testParams);
    result.schemaVersion = 2;
    if (!isReady(result)) result.enabled = false;
    if (sqlMigrated) onSqlMigration?.();
    return result;
  }
  function save(skills) {
    const normalized = skills.map((skill) => normalizeSkill(skill));
    localStorage.setItem(KEY, JSON.stringify(normalized));
    return normalized;
  }
  function seedStatusSamples(skills) {
    if (localStorage.getItem(STATUS_SAMPLE_MARKER) === '1') return skills;
    const existing = new Set(skills.map((skill) => skill.id));
    const additions = defaultSkills().filter((skill) => !existing.has(skill.id));
    const result = additions.length ? save([...skills, ...additions]) : skills;
    localStorage.setItem(STATUS_SAMPLE_MARKER, '1');
    return result;
  }
  function seedPublishedSamples(skills) {
    if (localStorage.getItem(PUBLISHED_SAMPLE_MARKER) === '1') return skills;
    const existing = new Set(skills.map((skill) => skill.id));
    const additions = additionalPublishedSkills().filter((skill) => !existing.has(skill.id));
    let result = skills;
    if (additions.length) {
      result = [...skills];
      const supplierIndex = result.findIndex((skill) => skill.id === 'skill-supplier-monthly');
      result.splice(supplierIndex >= 0 ? supplierIndex + 1 : result.length, 0, ...additions);
      result = save(result);
    }
    localStorage.setItem(PUBLISHED_SAMPLE_MARKER, '1');
    return result;
  }
  function migrateStatusSampleLayout(skills) {
    if (localStorage.getItem(STATUS_LAYOUT_MARKER) === '1') return skills;
    const parsingSample = skills.find((skill) => skill.id === 'skill-compliance-region' && skill.reportTemplate?.source === 'preset-status');
    let changed = false;
    if (parsingSample?.parseStatus === 'failed' && /未找到已导入的 Word 原文件/.test(parsingSample.parseError || '')) {
      parsingSample.parseStatus = 'parsing';
      delete parsingSample.parseError;
      changed = true;
    }
    const result = changed ? save(skills) : skills;
    localStorage.setItem(STATUS_LAYOUT_MARKER, '1');
    return result;
  }
  function trimFailedStatusSamples(skills) {
    if (localStorage.getItem(FAILED_SAMPLE_TRIM_MARKER) === '1') return skills;
    const failures = skills.filter((skill) => skill.parseStatus === 'failed' && skill.reportTemplate?.source === 'preset-status');
    const retained = failures.find((skill) => skill.id === 'skill-inventory-turnover') || failures[0];
    const result = failures.length > 1 ? save(skills.filter((skill) => skill.parseStatus !== 'failed' || skill.reportTemplate?.source !== 'preset-status' || skill.id === retained.id)) : skills;
    localStorage.setItem(FAILED_SAMPLE_TRIM_MARKER, '1');
    return result;
  }
  function load() {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) {
      let sqlMigrated = false;
      const normalized = JSON.parse(raw).map((skill) => normalizeSkill(skill, () => { sqlMigrated = true; }));
      if (sqlMigrated && localStorage.getItem(KEY) === raw) localStorage.setItem(KEY, JSON.stringify(normalized));
      return trimFailedStatusSamples(migrateStatusSampleLayout(seedPublishedSamples(seedStatusSamples(normalized))));
    }
    const legacyRaw = localStorage.getItem('smart-query-skill-catalog-v1');
    if (legacyRaw) return trimFailedStatusSamples(migrateStatusSampleLayout(seedPublishedSamples(seedStatusSamples(save(JSON.parse(legacyRaw).map((old) => {
      const data = { ...old, ...(old.draftConfig || {}) };
      const isSample = data.id === 'skill-monthly' && /monthly-procurement|采购快报/.test(`${data.reportTemplate?.name} ${data.reportTemplate?.downloadUrl}`);
      return isSample ? { ...data, reportTemplate: defaultSkill().reportTemplate, parts: sampleParts(), parseStatus: 'completed', enabled: false }
        : { ...data, parts: [], parseStatus: 'failed', parseError: '旧技能尚未绑定可解析的 Word 原文件，请重新导入模板。', enabled: false };
    }))))));
    const defaults = save(defaultSkills());
    localStorage.setItem(STATUS_SAMPLE_MARKER, '1');
    localStorage.setItem(STATUS_LAYOUT_MARKER, '1');
    localStorage.setItem(PUBLISHED_SAMPLE_MARKER, '1');
    localStorage.setItem(FAILED_SAMPLE_TRIM_MARKER, '1');
    return defaults;
  }
  function update(id, mutate) {
    const skills = load();
    const skill = skills.find((entry) => entry.id === id);
    if (!skill) throw new Error('技能已被删除，请返回列表。');
    mutate(skill); skill.updated = today(); save(skills);
    return normalizeSkill(skill);
  }
  function signature(part, params, parts) {
    // Existing test signatures already include the variable names and values.
    const { sqlValues, ...settings } = params;
    if (part.type !== 'analysis') return JSON.stringify([part.revision, settings, part.executionContext]);
    const configuration = [analysisQueries(part), part.prompt];
    if (hasAnalysisSql(part)) configuration.push(part.executionContext);
    return usesGenerationDate(part) && !hasAnalysisSql(part) ? JSON.stringify([part.revision, generationDate(params).toLocaleDateString('sv-SE'), params.question || '', configuration]) : JSON.stringify([part.revision, settings, configuration]);
  }
  function removePart(skill, id) {
    const part = skill.parts.find((p) => p.id === id);
    if (!part) throw new Error('该标注项已被删除，请刷新后查看。');
    skill.parts = skill.parts.filter((p) => p.id !== id);
    skill.enabled = false;
  }
  function invalidate(skill, id) {
    skill.parts.forEach((part) => {
      if (part.id !== id) return;
      part.confirmed = false; part.revision += 1;
      if (part.result) part.result.stale = true;
    });
    skill.enabled = false;
    return skill.parts.some((part) => part.id === id) ? 1 : 0;
  }
  function validateQuerySql(sql) {
    if (!/^\s*SELECT\b(?!\s+FROM\b)[\s\S]+?\bFROM\s+[^\s;]/i.test(sql)) throw new Error('SQL 应包含 SELECT 查询字段和 FROM 数据来源，请修改后重新测试。');
  }
  function normalizeReportMonth(value) {
    const match = /^(\d{4})\s*[-/年]\s*(0?[1-9]|1[0-2])\s*月?$/.exec(value);
    return match ? `${match[1]}-${match[2].padStart(2, '0')}` : '';
  }
  function bindingVariables(params) {
    if (params.promptVariables) return params.promptVariables;
    if (params.sqlValues) {
      return (params.requiredKeys || []).map((key) => ({ key, label: params.sqlValues[key]?.label || key }));
    }
    return Object.entries(parameterCatalog)
      .filter(([key, { runtimeKey }]) => params.requiredKeys?.includes(key) ?? Object.hasOwn(params, runtimeKey))
      .map(([key, { label }]) => ({ key, label }));
  }
  function bindSql(sql, params, context = '') {
    const lookup = sqlVariableLookup(bindingVariables(params));
    const bindings = sqlReferences(sql).map(({ token, name, legacy, valid, quoted }) => {
      if (quoted) throw new Error(`${context}请移除 SQL 变量 ${token} 外的引号。`);
      if (!valid) throw new Error(`${context}SQL 变量 ${token} 格式有误，请使用 ` + '${变量名}。');
      const variable = findSqlVariable(name, legacy, lookup);
      const legacyName = legacy || legacySqlVariableName.test(name);
      if (!variable && !legacyName) throw new Error(`${context}SQL 变量 ${token} 未在业务端预置提示词中配置。`);
      const key = variable?.key || name;
      const mapped = params.sqlValues && Object.hasOwn(params.sqlValues, key) ? params.sqlValues[key] : null;
      const known = parameterCatalog[key];
      const runtimeKey = known?.runtimeKey || key;
      const hasRuntimeValue = Object.hasOwn(params, runtimeKey);
      // Plain-text report callers still supply built-in values directly.
      const plainRuntime = !!known && !params.sqlValues && hasRuntimeValue;
      const label = variable?.label || mapped?.label || known?.label || name;
      const value = mapped?.value ?? ((legacyName || plainRuntime) && hasRuntimeValue ? String(params[runtimeKey] ?? '').trim() : '');
      if (!value) throw new Error(`${context}请填写变量「${label}」(${token})。`);
      const boundValue = key === 'report_month' ? normalizeReportMonth(value) : value;
      if (!boundValue) throw new Error(`${context}「${label}」请填写有效月份，例如 2026-10。`);
      return { key, label, value: boundValue };
    });
    // Keep runtime values separate from the query text, including strings with quotes.
    const statement = String(sql || '').replace(sqlTokens(), (token, variable, closing, legacy) => variable !== undefined || legacy ? '?' : token);
    return { statement, bindings };
  }
  function validateSkillSqlParams(parts, params) {
    parts.forEach((part) => partQueries(part).forEach((query) => {
      bindSql(query.sql, params, `「${part.name}${query.name ? ` / ${query.name}` : ''}」：`);
    }));
  }
  function simulateAnalysisQuery(query, params) {
    const { statement, bindings } = bindSql(query.sql, params, `SQL「${query.name}」：`);
    // Static prototype: simulate the demonstrated aggregate expressions only.
    const expression = statement.slice(0, statement.search(/\bFROM\b/i));
    let amount = 176896300, count = 1126, value;
    if (/status\s*<>\s*'cancelled'/i.test(statement)) { amount *= 0.96; count = 1081; }
    if (/SUM\s*\(\s*transaction_amount\s*\)/i.test(expression)) {
      value = amount;
      if (/COUNT\s*\(\s*\*\s*\)/i.test(expression)) value /= count;
    } else if (/AVG\s*\(\s*transaction_amount\s*\)/i.test(expression)) value = amount / count;
    else if (/COUNT\s*\(\s*\*\s*\)/i.test(expression)) value = count;
    else {
      const literal = expression.match(/^\s*SELECT\s+(-?\d+(?:\.\d+)?)\s+AS\s+value\b/i);
      if (!literal) throw new Error(`SQL Tab「${query.name}」：当前静态原型支持示例金额、项目数及平均金额查询，请使用示例表达式演示。`);
      value = Number(literal[1]);
    }
    if (/\/\s*10000\b/.test(expression)) value /= 10000;
    const round = expression.match(/,\s*([0-6])\s*\)\s+AS\s+value\b/i);
    const decimals = round ? Number(round[1]) : Number.isInteger(value) ? 0 : 2;
    value = Number(value.toFixed(decimals));
    const text = value.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + (query.unit ? ` ${query.unit}` : '');
    return { id: query.id, name: query.name.trim(), value, unit: query.unit, text, bindings };
  }
  function runDemo(part, params, parts) {
    if (!part.name.trim()) throw new Error('请补充内容名称。');
    if (!part.prompt.trim()) throw new Error('请先补充当前内容的提示词。');
    const analysisSql = hasAnalysisSql(part);
    if (part.type === 'analysis') validateAnalysisQueries(part);
    if (usesGenerationDate(part) && !analysisSql) {
      const generatedAt = generationDate(params);
      const rows = [], date = generatedAt;
      const year = date.getFullYear(), month = date.getMonth() + 1, day = date.getDate();
      const format = [...part.prompt.matchAll(/YYYY-MM-DD|YYYY\s*年\s*M+\s*月(?:\s*D+\s*日)?/g)].pop()?.[0] || '';
      const text = format === 'YYYY-MM-DD' ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : format && !/D/.test(format) ? `${year} 年 ${month} 月` : `${year} 年 ${month} 月 ${day} 日`;
      return { ok: true, demo: true, rows, text, at: date.toISOString(), params: clone(params), signature: signature(part, params, parts), stale: false };
    }
    let sql = part.sql, bindings = [];
    if (part.type !== 'analysis') {
      validateQuerySql(sql);
      validateExecutionTheme(part);
      ({ statement: sql, bindings } = bindSql(sql, params));
      if (!/^[a-zA-Z_]\w*$/.test(part.field) || !new RegExp(`\\bAS\\s+${part.field}\\b`, 'i').test(sql)) throw new Error('查询结果中未找到回填字段，请核对 SQL 别名。');
    }
    let value = Number(part.sampleValue ?? 17689.63);
    if (/status\s*<>\s*'cancelled'/i.test(sql)) value *= 0.96;
    const precision = [...part.prompt.matchAll(/([0-6零一二两三四五六])\s*位小数/g)].pop();
    const requestedDecimals = precision ? ('零一二三四五六'.includes(precision[1]) ? '零一二三四五六'.indexOf(precision[1]) : precision[1] === '两' ? 2 : Number(precision[1])) : part.decimals;
    const decimals = Math.max(0, Math.min(6, Number(requestedDecimals) || 0));
    const rows = part.type === 'chart' ? [{ category: '公开招标', value: 5805.34 }, { category: '询比采购', value: 4905.11 }, { category: '竞争性谈判', value: 3821.60 }, { category: '直接采购', value: 3157.58 }] : [{ value }];
    const outputValue = part.type === 'chart' ? value : rows[0].value;
    let text = Number(outputValue.toFixed(decimals)).toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + (part.unit ? ` ${part.unit}` : '');
    let queryResults = [];
    if (part.type === 'analysis') {
      let evidence;
      if (analysisSql) {
        queryResults = analysisQueries(part).map((query) => simulateAnalysisQuery(query, params));
        bindings = queryResults.flatMap((query) => query.bindings);
        evidence = queryResults.map((query) => `${query.name}为${query.text}`);
      } else {
        const currentIndex = parts.findIndex((p) => p.id === part.id);
        const available = parts.filter((p, index) => p.id !== part.id && p.type !== 'analysis' && (currentIndex < 0 || index < currentIndex));
        const named = available.filter((p) => part.prompt.includes(p.name));
        const contextParts = (named.length ? named : available.slice(-3)).slice(0, 6);
        evidence = contextParts.map((p) => { const r = runDemo(p, params, parts); return `${p.name}为${p.type === 'metric' ? r.text : r.rows.map((row) => `${row.category} ${row.value}`).join('、')}`; });
      }
      const advice = analysisSql ? '建议：①分层关注大额项目，核查采购执行情况；②补充同口径上期数据，持续跟踪规模与项目金额变化。缺少上期及目标数据，暂不判断趋势或达标情况。' : /下降|降低/.test(part.prompt) ? '缺少可比较的上期口径，暂不能判断下降幅度及原因。' : '建议结合上期同口径数据核实变化，持续跟踪主要采购类别。目前数据不足以直接判断变化原因。';
      text = `${[params.month, params.org].filter(Boolean).join('，')}${params.month || params.org ? '：' : ''}${evidence.length ? evidence.join('；') + '。' : ''}${advice}`;
      const limit = [...part.prompt.matchAll(/(\d{2,4})\s*字/g)].pop();
      if (limit && text.length > Number(limit[1])) text = text.slice(0, Math.max(30, Number(limit[1])) - 1) + '。';
    }
    if (part.type === 'chart') {
      if (!/^[a-zA-Z_]\w*$/.test(part.categoryField) || !new RegExp(`\\bAS\\s+${part.categoryField}\\b`, 'i').test(sql)) throw new Error('SQL 中未找到图表分类字段，请核对字段映射。');
      if (/ORDER BY\s+\w+\s+ASC/i.test(sql)) rows.reverse();
      const limit = sql.match(/LIMIT\s+(\d+)/i);
      if (limit) rows.splice(Number(limit[1]));
    }
    return { ok: true, demo: true, rows: analysisSql ? queryResults.map(({ value }) => ({ value })) : rows, queryResults, bindings, text, at: new Date().toISOString(), params: clone(params), signature: signature(part, params, parts), stale: false };
  }
  function aiEdit(part, request, variables) {
    const next = clone(part);
    if (part.type === 'metric') {
      if (/取消|作废/.test(request)) next.sql = next.sql.replace(/;\s*$/, '') + (/status\s*<>/.test(next.sql) ? ';' : "\n  AND status <> 'cancelled';");
      else if (/平均|均值/.test(request)) next.sql = next.sql.replace(/SUM\(/ig, 'AVG(');
      else if (/求和|合计|总额/.test(request)) next.sql = next.sql.replace(/AVG\(/ig, 'SUM(');
      else if (/小数|精度/.test(request)) { const m = request.match(/([0-6一二两三四五六零])\s*位/); next.decimals = m ? ('零一二三四五六'.includes(m[1]) ? '零一二三四五六'.indexOf(m[1]) : m[1] === '两' ? 2 : Number(m[1])) : 2; }
      else if (/SQL|修复|报错|错误/.test(request)) next.sql = preparePart({ name: part.name, type: part.type }, 0, variables).sql;
      next.prompt = `${part.prompt}\n调整要求：${request}`;
    } else {
      next.prompt = `${part.prompt}\n调整要求：${request}`;
      if (part.type === 'chart' && /升序|降序/.test(request)) next.sql = next.sql.replace(/ORDER BY[^;]+/i, `ORDER BY value ${/升序/.test(request) ? 'ASC' : 'DESC'}`);
      if (part.type === 'chart' && /前\s*(\d+|十)/.test(request)) { const m = request.match(/前\s*(\d+|十)/); next.sql = next.sql.replace(/\s+LIMIT\s+\d+/i, '').replace(/;?\s*$/, `\nLIMIT ${m[1] === '十' ? 10 : Math.min(100, Number(m[1]))};`); }
    }
    if (next.sql !== part.sql) syncExecutionTheme(next, next, true);
    return { next: syncPartMetadata(next, true), reply: `已更新${part.type === 'analysis' ? '提示词' : '提示词及相关配置'}并回填到上方配置。请重新测试，查看结果后确认此项。` };
  }
  global.SkillCatalogStore = { key: KEY, load, save, update, clone, themes, isReady, preparePart, syncPartMetadata, normalizeSkill, normalizeTestParams, promptLabels, createPromptVariable, updatePromptVariables, validSqlVariableName, sqlVariableToken, parameterSettings, validateSkillSqlParams, normalizeReportMonth, invalidate, signature, runDemo, aiEdit, sampleParts, sampleOutline, usesGenerationDate, hasAnalysisSql, analysisQueries, analysisSqlExamples, removePart, executionThemeOptions, executionTheme, syncExecutionTheme };
})(window);
