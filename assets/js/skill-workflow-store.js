(function (global) {
  'use strict';
  const KEY = 'smart-query-skill-catalog-v2';
  const STATUS_SAMPLE_MARKER = `${KEY}-status-samples-20260914`;
  const STATUS_LAYOUT_MARKER = `${KEY}-status-layout-20260914`;
  const PUBLISHED_SAMPLE_MARKER = `${KEY}-published-samples-20260914`;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const themes = ['成交与节资', '采购方式与品类', '供应商管理', '采购效能与闲废', '销售分析', '客户分析', '库存分析', '活动分析'];
  const today = () => new Date().toLocaleDateString('sv-SE');
  const parameterSQL = 'WHERE report_month = :report_month\n  AND org_name = :org_name';
  const tableCatalog = {
    procurement_transactions: { label: '采购交易明细', databaseName: '运营指标库', databaseType: 'ClickHouse' },
    non_bidding_project_info: { label: '非招项目信息', databaseName: '运营指标库', databaseType: 'ClickHouse' },
    bidding_project_info: { label: '招标项目信息', databaseName: '运营指标库', databaseType: 'ClickHouse' },
    platform_service_fee_detail: { label: '平台服务费明细', databaseName: '运营指标库', databaseType: 'ClickHouse' },
    sales_order: { label: '销售订单', databaseName: '销售业务库', databaseType: 'MySQL' },
    inventory_snapshot: { label: '库存快照', databaseName: '库存分析库', databaseType: 'Oracle' }
  };
  function sqlTables(sql) {
    const tables = [], pattern = /\b(?:FROM|JOIN)\s+([`"\[]?[a-zA-Z_]\w*(?:\.[`"\[]?[a-zA-Z_]\w*)?[`"\]]?)/ig;
    for (const match of String(sql || '').matchAll(pattern)) {
      const physicalName = match[1].replace(/[`"\[\]]/g, '');
      const name = physicalName.split('.').pop();
      if (!tables.some((table) => table.physicalName === physicalName)) tables.push({ physicalName, name });
    }
    return tables;
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
      if (part) { delete part.executionSource; part.managedIndicators = []; }
      return part;
    }
    const storedTables = part.executionSource?.tables || [];
    const tables = sqlTables(part.sql).map((table) => {
      const catalog = tableCatalog[table.name];
      const stored = storedTables.find((item) => item.physicalName === table.physicalName || item.name === table.name);
      return { ...table, label: catalog?.label || stored?.label || table.name };
    });
    const catalogSource = tables.map((table) => tableCatalog[table.name]).find(Boolean);
    const sameStoredTables = tables.length && tables.every((table) => storedTables.some((item) => item.physicalName === table.physicalName || item.name === table.name));
    part.executionSource = {
      databaseName: catalogSource?.databaseName || (sameStoredTables ? part.executionSource?.databaseName : '') || '待识别执行库',
      databaseType: catalogSource?.databaseType || (sameStoredTables ? part.executionSource?.databaseType : '') || '',
      tables
    };
    if (refreshIndicators || !Array.isArray(part.managedIndicators) || !part.managedIndicators.length) part.managedIndicators = inferredManagedIndicators(part);
    else part.managedIndicators = part.managedIndicators.map((indicator) => ({ ...indicator, aggregation: sqlAggregation(part.sql), definition: indicator.definition || part.definition }));
    return part;
  }
  function preparePart(part, index = 0) {
    const type = part.type || 'metric';
    const sql = type === 'chart'
      ? `SELECT procurement_method AS category,\n  SUM(transaction_amount) / 10000 AS value\nFROM procurement_transactions\n${parameterSQL}\nGROUP BY procurement_method\nORDER BY value DESC;`
      : `SELECT ${/项目|数量/.test(part.name) ? 'COUNT(*)' : /率|占比|环比/.test(part.name) ? 'AVG(rate_value)' : 'SUM(transaction_amount) / 10000'} AS value\nFROM procurement_transactions\n${parameterSQL};`;
    const prepared = {
      id: part.id || `part-${index + 1}`, type, name: part.name || '待识别内容', theme: themes[0],
      definition: `按报告月份和组织范围统计${part.name || '当前指标'}。`, sql: type === 'analysis' ? '' : sql,
      prompt: type === 'metric' ? '按 SQL 查询结果回填当前指标，沿用原文单位和数值格式，仅输出指标值。' : type === 'chart' ? '按采购方式展示成交金额，按金额降序排列；沿用模板图表类型、配色和尺寸。' : '结合当前内容前文已配置的指标和图表结果，解释本期采购表现、主要变化与需关注的问题。只使用已提供的数据，缺失依据时明确说明，不推断无依据的原因。控制在 200 字以内。',
      field: 'value', categoryField: 'category', unit: part.unit || '', decimals: 2,
      confirmed: false, revision: 1, messages: [], result: null, ...clone(part)
    };
    return syncPartMetadata(prepared);
  }
  function coverDatePart() {
    return preparePart({ id: 'cover-generated-date', type: 'analysis', name: '报告生成日期', sourceText: '2026 年 7 月 16 日', prompt: '使用本次报告的生成日期，按“YYYY 年 M 月 D 日”格式输出，仅输出日期。', anchor: { kind: 'page', page: 1, x: 48.4, y: 73.8, w: 18.8, h: 1.9 } });
  }
  const usesGenerationDate = (part) => part.type === 'analysis' && /(?:报告|本次).*生成(?:时间|日期)|生成(?:时间|日期)/.test(part.prompt || '');
  const parameterCatalog = {
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
    const labels = [...String(skill?.userPrompt || '').matchAll(/【([^【】\r\n]+)】/g)].map((match) => match[1].trim()).filter(Boolean);
    [...new Set(labels)].forEach((label, index) => add(parameterKey(label, index), label, '业务端变量'));
    (skill?.parts || []).forEach((part) => {
      for (const match of String(part.sql || '').matchAll(/:([a-zA-Z_]\w*)/g)) add(match[1], parameterCatalog[match[1]]?.label || match[1], `SQL :${match[1]}`);
    });
    if ((skill?.parts || []).some(usesGenerationDate)) add('generated_at', parameterCatalog.generated_at.label, '内容生成');
    const saved = Array.isArray(current) ? current : [];
    return [...definitions.values()].map((definition) => {
      const previous = saved.find((item) => item.key === definition.key) || saved.find((item) => item.label === definition.label);
      return { ...definition, value: previous?.value ?? parameterDefault(definition.key) };
    });
  }
  function generationDate(params) {
    const date = params.generatedAt ? new Date(params.generatedAt) : new Date();
    if (Number.isNaN(date.getTime())) throw new Error('报告生成日期无效，请重新测试。');
    return date;
  }
  function sampleParts() {
    const parts = (global.SkillTemplateSample || []).map(preparePart);
    const pending = new Set();
    for (const part of parts) {
      part.confirmed = pending.has(part.type);
      pending.add(part.type);
    }
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
    return s.parseStatus === 'completed' && !!s.name?.trim() && !!s.desc?.trim() && !!s.category && !!s.userPrompt?.trim() && s.themes?.length > 0 && s.parts?.length > 0 && s.parts.every((p) => p.confirmed && p.prompt?.trim());
  }
  function normalizeSkill(source) {
    const result = clone(source);
    ['executionPrompt', 'reportContentPrompt', 'reportFormatPrompt', 'reportPrompt', 'configSources', 'draftConfig', 'workflowStatus'].forEach((key) => delete result[key]);
    if (result.reportTemplate) ['generatedContentPrompt', 'generatedFormatPrompt', 'generatedPrompt'].forEach((key) => delete result.reportTemplate[key]);
    result.parts = (result.parts || []).map((part) => {
      const prepared = preparePart(part);
      delete prepared.dependencies;
      delete prepared.missingDependencies;
      if (prepared.type === 'analysis' && /^依据引用数据/.test(prepared.prompt || '')) prepared.prompt = prepared.prompt.replace(/^依据引用数据/, '结合当前内容前文已配置的指标和图表结果');
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
    return result;
  }
  function save(skills) {
    const normalized = skills.map(normalizeSkill);
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
  function load() {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) return migrateStatusSampleLayout(seedPublishedSamples(seedStatusSamples(JSON.parse(raw).map(normalizeSkill))));
    const legacyRaw = localStorage.getItem('smart-query-skill-catalog-v1');
    if (legacyRaw) return migrateStatusSampleLayout(seedPublishedSamples(seedStatusSamples(save(JSON.parse(legacyRaw).map((old) => {
      const data = { ...old, ...(old.draftConfig || {}) };
      const isSample = data.id === 'skill-monthly' && /monthly-procurement|采购快报/.test(`${data.reportTemplate?.name} ${data.reportTemplate?.downloadUrl}`);
      return isSample ? { ...data, reportTemplate: defaultSkill().reportTemplate, parts: sampleParts(), parseStatus: 'completed', enabled: false }
        : { ...data, parts: [], parseStatus: 'failed', parseError: '旧技能尚未绑定可解析的 Word 原文件，请重新导入模板。', enabled: false };
    })))));
    const defaults = save(defaultSkills());
    localStorage.setItem(STATUS_SAMPLE_MARKER, '1');
    localStorage.setItem(STATUS_LAYOUT_MARKER, '1');
    localStorage.setItem(PUBLISHED_SAMPLE_MARKER, '1');
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
    return usesGenerationDate(part) ? JSON.stringify([part.revision, generationDate(params).toLocaleDateString('sv-SE'), params.question || '']) : JSON.stringify([part.revision, params]);
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
  function runDemo(part, params, parts) {
    if (!part.name.trim() || !part.theme) throw new Error('请补充内容名称和分析主题。');
    if (!part.prompt.trim()) throw new Error('请先补充当前内容的提示词。');
    if (usesGenerationDate(part)) {
      const date = generationDate(params), year = date.getFullYear(), month = date.getMonth() + 1, day = date.getDate();
      const format = [...part.prompt.matchAll(/YYYY-MM-DD|YYYY\s*年\s*M+\s*月(?:\s*D+\s*日)?/g)].pop()?.[0] || '';
      const text = format === 'YYYY-MM-DD' ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : format && !/D/.test(format) ? `${year} 年 ${month} 月` : `${year} 年 ${month} 月 ${day} 日`;
      return { ok: true, demo: true, rows: [], text, at: date.toISOString(), params: clone(params), signature: signature(part, params, parts), stale: false };
    }
    const requiredKeys = new Set(params.requiredKeys || ['report_month', 'org_name']);
    if (requiredKeys.has('report_month') && !/^\d{4}-\d{2}$/.test(params.month)) throw new Error('请填写格式正确的报告月份。');
    if (requiredKeys.has('org_name') && !params.org?.trim()) throw new Error('请填写组织范围。');
    if (part.type !== 'analysis') {
      if (!/^\s*SELECT\b/i.test(part.sql) || !/\bFROM\b/i.test(part.sql)) throw new Error('SQL 应包含 SELECT 和 FROM，请修改后重新测试。');
      if (!/:report_month\b/.test(part.sql) || !/:org_name\b/.test(part.sql)) throw new Error('SQL 缺少 :report_month 或 :org_name 参数绑定。');
      if (!/^[a-zA-Z_]\w*$/.test(part.field) || !new RegExp(`\\bAS\\s+${part.field}\\b`, 'i').test(part.sql)) throw new Error('查询结果中未找到回填字段，请核对 SQL 别名。');
    }
    let value = Number(part.sampleValue ?? 17689.63);
    if (/status\s*<>\s*'cancelled'/i.test(part.sql)) value *= 0.96;
    const precision = [...part.prompt.matchAll(/([0-6零一二两三四五六])\s*位小数/g)].pop();
    const requestedDecimals = precision ? ('零一二三四五六'.includes(precision[1]) ? '零一二三四五六'.indexOf(precision[1]) : precision[1] === '两' ? 2 : Number(precision[1])) : part.decimals;
    const decimals = Math.max(0, Math.min(6, Number(requestedDecimals) || 0));
    const textValue = Number(value.toFixed(decimals)).toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + (part.unit ? ` ${part.unit}` : '');
    const rows = part.type === 'chart' ? [{ category: '公开招标', value: 5805.34 }, { category: '询比采购', value: 4905.11 }, { category: '竞争性谈判', value: 3821.60 }, { category: '直接采购', value: 3157.58 }] : [{ value }];
    let text = textValue;
    if (part.type === 'analysis') {
      const currentIndex = parts.findIndex((p) => p.id === part.id);
      const available = parts.filter((p, index) => p.id !== part.id && p.type !== 'analysis' && (currentIndex < 0 || index < currentIndex));
      const named = available.filter((p) => part.prompt.includes(p.name));
      const contextParts = (named.length ? named : available.slice(-3)).slice(0, 6);
      const evidence = contextParts.map((p) => { const r = runDemo(p, params, parts); return `${p.name}为${p.type === 'metric' ? r.text : r.rows.map((row) => `${row.category} ${row.value}`).join('、')}`; });
      text = `${params.month}，${params.org}的${part.name}：${evidence.length ? evidence.join('；') + '。' : ''}${/下降|降低/.test(part.prompt) ? '缺少可比较的上期口径，暂不能判断下降幅度及原因。' : '建议结合上期同口径数据核实变化，持续跟踪主要采购类别。目前数据不足以直接判断变化原因。'}`;
      const limit = [...part.prompt.matchAll(/(\d{2,4})\s*字/g)].pop();
      if (limit && text.length > Number(limit[1])) text = text.slice(0, Math.max(30, Number(limit[1])) - 1) + '。';
    }
    if (part.type === 'chart') {
      if (!/^[a-zA-Z_]\w*$/.test(part.categoryField) || !new RegExp(`\\bAS\\s+${part.categoryField}\\b`, 'i').test(part.sql)) throw new Error('SQL 中未找到图表分类字段，请核对字段映射。');
      if (/ORDER BY\s+\w+\s+ASC/i.test(part.sql)) rows.reverse();
      const limit = part.sql.match(/LIMIT\s+(\d+)/i);
      if (limit) rows.splice(Number(limit[1]));
    }
    return { ok: true, demo: true, rows, text, at: new Date().toISOString(), params: clone(params), signature: signature(part, params, parts), stale: false };
  }
  function aiEdit(part, request) {
    const next = clone(part);
    if (part.type === 'metric') {
      if (/取消|作废/.test(request)) next.sql = next.sql.replace(/;\s*$/, '') + (/status\s*<>/.test(next.sql) ? ';' : "\n  AND status <> 'cancelled';");
      else if (/平均|均值/.test(request)) next.sql = next.sql.replace(/SUM\(/ig, 'AVG(');
      else if (/求和|合计|总额/.test(request)) next.sql = next.sql.replace(/AVG\(/ig, 'SUM(');
      else if (/小数|精度/.test(request)) { const m = request.match(/([0-6一二两三四五六零])\s*位/); next.decimals = m ? ('零一二三四五六'.includes(m[1]) ? '零一二三四五六'.indexOf(m[1]) : m[1] === '两' ? 2 : Number(m[1])) : 2; }
      else if (/SQL|修复|报错|错误/.test(request)) next.sql = preparePart({ name: part.name, type: part.type }).sql;
      next.prompt = `${part.prompt}\n调整要求：${request}`;
    } else {
      next.prompt = `${part.prompt}\n调整要求：${request}`;
      if (part.type === 'chart' && /升序|降序/.test(request)) next.sql = next.sql.replace(/ORDER BY[^;]+/i, `ORDER BY value ${/升序/.test(request) ? 'ASC' : 'DESC'}`);
      if (part.type === 'chart' && /前\s*(\d+|十)/.test(request)) { const m = request.match(/前\s*(\d+|十)/); next.sql = next.sql.replace(/\s+LIMIT\s+\d+/i, '').replace(/;?\s*$/, `\nLIMIT ${m[1] === '十' ? 10 : Math.min(100, Number(m[1]))};`); }
    }
    return { next: syncPartMetadata(next, true), reply: `已更新${part.type === 'analysis' ? '提示词' : '提示词及相关配置'}并回填到上方配置。请重新测试，查看结果后确认此项。` };
  }
  global.SkillCatalogStore = { key: KEY, load, save, update, clone, themes, isReady, preparePart, syncPartMetadata, normalizeSkill, normalizeTestParams, invalidate, signature, runDemo, aiEdit, sampleParts, sampleOutline, usesGenerationDate, removePart };
})(window);
