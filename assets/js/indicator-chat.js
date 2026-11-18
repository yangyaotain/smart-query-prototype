/* 指标维护自然语言原型：业务操作全部使用会话输入，消息仅展示只读摘要。 */
(function (global) {
  'use strict';
  const store = global.IndicatorStore, dict = store.dictionaries, copy = store.copy;
  let bridge;
  const uid = () => 'indicator_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const active = (plan) => plan && ['pending', 'missing', 'ambiguous', 'scope', 'blocked', 'stale'].includes(plan.status);
  const aliases = (item) => [item.name, ...String(item.synonyms || '').split(/[,，、]/).map((value) => value.trim()).filter(Boolean)];
  const themesOf = (item, data) => Object.keys(data.themes).filter((theme) => data.themes[theme].includes(item.id));
  const fresh = (action, text) => ({ token: uid(), action, status: 'pending', sourceText: text, themes: [], errors: [], revision: 1 });
  function locate(text, data) {
    const matches = data.indicators.filter((item) => aliases(item).some((name) => text.includes(name)));
    const exact = matches.filter((item) => text.includes(item.name));
    const found = exact.length ? exact : matches;
    return found.filter((item) => !found.some((other) => other.id !== item.id && other.name.length > item.name.length && other.name.includes(item.name) && text.includes(other.name)));
  }
  function nextPlan(previous, text) {
    const next = copy(previous);
    next.token = uid(); next.revision = (next.revision || 0) + 1; next.sourceText = (next.sourceText || '') + '\n' + text;
    delete next.confirmRequested; delete next.historyData; delete next.historyExample;
    next.reply = ''; next.notice = ''; next.message = ''; next.awaiting = null;
    return next;
  }
  function property(text, name) {
    const prefix = '(?:' + name + ')(?:里|中)?(?:再|还是|仍然)?(?:增加|添加|补充|改成|改为|设为|使用|用|是|为|叫|：|:)?\\s*';
    const quoted = text.match(new RegExp(prefix + '[「“"\']([^」”"\']+)[」”"\']'));
    if (quoted) return quoted[1].trim();
    const match = text.match(new RegExp(prefix + '([^，,。；;]+)'));
    return match ? match[1].replace(/^(?:增加|添加|补充)/, '').trim() : '';
  }
  function expression(text, data) {
    const names = data.indicators.flatMap((item) => aliases(item).map((name) => ({ name, actual: item.name }))).sort((a, b) => b.name.length - a.name.length);
    const protectedNames = [];
    let rest = text.replace(/[「」“”"']/g, ''), result = '';
    while (rest) {
      const found = names.find((item) => rest.startsWith(item.name));
      if (found) { result += '__METRIC' + protectedNames.length + '__'; protectedNames.push(found.actual); rest = rest.slice(found.name.length); }
      else { result += rest[0]; rest = rest.slice(1); }
    }
    return result.replace(/加上|加/g, ' + ').replace(/减去|减/g, ' - ').replace(/乘以/g, ' * ').replace(/除以/g, ' / ')
      .replace(/（/g, '(').replace(/）/g, ')').replace(/__METRIC(\d+)__/g, (_, index) => protectedNames[Number(index)]).trim();
  }
  function ask(plan, kind, question, choices = []) {
    plan.status = kind === 'metric' ? 'ambiguous' : kind === 'scope' ? 'scope' : 'missing';
    plan.awaiting = { kind, question, choices }; return plan;
  }
  function choose(text, choices) {
    const normalized = text.replace(/^(?:我选|选择|选|按|用|是)/, '').replace(/[「」“”"'。！!\s]/g, '');
    const ordinal = normalized.split(/[，,；;]/)[0].match(/^(?:第)?([一二两三四五六七八九十\d]+)(?:个|项|种|条)?$/);
    if (ordinal) {
      const numbers = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
      return choices[(numbers[ordinal[1]] || Number(ordinal[1])) - 1] || null;
    }
    const matches = choices.filter((item) => [item.label, item.name, item.path, item.id, ...(item.aliases || [])].filter(Boolean).some((name) => normalized === name || (name.length > 1 && normalized.includes(name))));
    return matches.length === 1 ? matches[0] : null;
  }
  function attach(plan, item, data) {
    plan.draft = copy(item); plan.base = copy(item); plan.original = copy(item);
    plan.themes = themesOf(item, data); plan.baseThemes = copy(plan.themes); return plan;
  }
  function modelChoices(text) {
    text = text.replace(/(?:新增|新建|创建)(?:一个|一项)?(?:原子指标|衍生指标|指标)?\s*[「“"'][^」”"']+[」”"']/, '');
    const models = store.models();
    const explicit = models.filter((model) => text.includes(model.table) || text.includes(model.name + '模型') || text.includes(model.name + '里') || text.includes('使用' + model.name) || text.includes('按' + model.name));
    let found = explicit.length ? explicit : models.filter((model) => text.includes(model.name));
    if (!found.length && /订单/.test(text)) found = models.filter((model) => /订单|支付/.test(model.name));
    if (!found.length && /客户档案/.test(text)) found = models.filter((model) => /客户主数据|客户$/.test(model.name));
    found = found.filter((model) => !['客户', '产品', '渠道'].includes(model.name) || new RegExp(model.name + '(?:模型|档案|记录)|(?:来自|使用)' + model.name).test(text));
    found = found.filter((model) => !found.some((other) => other.ref !== model.ref && other.name.length > model.name.length && other.name.includes(model.name)));
    return found.map((model) => ({ ...model, id: model.ref, label: model.path, aliases: [model.name, model.table] }));
  }
  function setModel(item, model) {
    if (item.table !== model.table || item.srcId !== model.srcId) { item.field = ''; item.timeField = ''; item.functionExpr = ''; }
    item.modelRef = model.ref; item.srcId = model.srcId; item.table = model.table;
  }
  const atomExpression = (item) => item.agg === 'COUNT_DISTINCT' ? `COUNT(DISTINCT ${item.field})` : `${item.agg}(${item.field})`;
  function applyText(plan, text, data, lockModel = false) {
    const item = plan.draft;
    if (!item) return;
    const name = property(text, '名称|名字') || property(text, '重命名|改名');
    if (name && !/不改|原来|保持/.test(name)) item.name = name.replace(/^为/, '');
    const synonym = property(text, '同义词|别名');
    if (/清空同义词|去掉所有同义词|不设置同义词/.test(text)) item.synonyms = '';
    else if (synonym) {
      const incoming = synonym.split(/[,，、]/).map((value) => value.trim()).filter(Boolean), old = String(item.synonyms || '').split(/[,，、]/).filter(Boolean);
      item.synonyms = /(?:删除|去掉|移除|取消)(?:同义词|别名)/.test(text) ? old.filter((value) => !incoming.includes(value)).join(',')
        : /同义词改|别名改|替换同义词/.test(text) ? incoming.join(',') : [...new Set([...old, ...incoming])].join(',');
    }
    const description = property(text, '描述|说明');
    if (description) item.desc = /补充/.test(text) ? [item.desc, description].filter(Boolean).join('；') : description;
    const unit = property(text, '单位') || (text.match(/^(?:还是|仍然)?用(元|万元|亿元|人|单|件|次|天|%)$/) || [])[1] || (dict.UNIT_PRESETS.includes(text) ? text : '');
    if (unit) item.unit = unit;
    if (dict.UNIT_PRESETS.includes(text.trim())) item.unit = text.trim();
    const formula = property(text, '公式') || (text.match(/等于\s*(.+?)(?=[，,。；;]|放到|放入|加入|$)/) || [])[1];
    if (formula) { item.type = 'derived'; item.formula = expression(formula, data); }
    if (/原子指标/.test(text)) item.type = 'atom';
    if (/衍生指标/.test(text)) item.type = 'derived';
    const groups = store.groups(data).filter((group) => text.includes(group.name));
    if (groups.length && /目录|放到|放入|移到|归到|归入/.test(text)) { item.groupId = groups.at(-1).id; plan.unknownDirectory = false; }
    else if (/放到|放入|移到|归到|归入/.test(text) && /目录/.test(text)) plan.unknownDirectory = true;
    if (/不关联任何主题|取消所有主题关联|不加入任何主题/.test(text)) plan.themes = [];
    else Object.keys(data.themes).forEach((theme) => {
      if (!text.includes(theme)) return;
      if (/不加入|不关联|移出|取消关联/.test(text)) plan.themes = plan.themes.filter((name) => name !== theme);
      else if (/加入|关联/.test(text) && !plan.themes.includes(theme)) plan.themes.push(theme);
    });
    if (item.type === 'atom') {
      const models = modelChoices(text);
      if (!lockModel && models.length === 1 && /模型|来自|订单|档案|主数据|明细|使用/.test(text)) setModel(item, models[0]);
      else if (!lockModel && models.length > 1 && /模型|来自|使用/.test(text)) plan.modelCandidates = models;
      const fields = dict.FIELDS_BY_TABLE[item.table] || [];
      const matches = fields.filter((field) => text.includes(field) || text.includes(dict.FIELD_LABELS[field] || '\u0000'));
      const time = matches.find((field) => /date|time|period/.test(field));
      let measure = matches.find((field) => !/date|time|period/.test(field));
      if (!measure && /客户/.test(text) && fields.includes('customer_id')) measure = 'customer_id';
      if (!measure && /订单(?:数量|数|量)/.test(text) && fields.includes('order_id')) measure = 'order_id';
      if (!measure && /销售额|销售金额/.test(text) && fields.includes('sales_amount')) measure = 'sales_amount';
      if (measure) item.field = measure;
      if (time) item.timeField = time;
      else if (/下单时间|下单日期|订单发生时间/.test(text) && fields.includes('order_date')) item.timeField = 'order_date';
      else if (/支付时间/.test(text)) item.timeField = fields.find((field) => /pay_time|payment_time/.test(field)) || item.timeField;
      if (/去重|不同客户|每位客户只算一次|每个客户只算一次/.test(text)) item.agg = 'COUNT_DISTINCT';
      else if (/平均|均值/.test(text) && !/描述|说明/.test(text)) item.agg = 'AVG';
      else if (/最大值/.test(text)) item.agg = 'MAX';
      else if (/最小值/.test(text)) item.agg = 'MIN';
      else if (/计数|条数|笔数|订单数量/.test(text)) item.agg = 'COUNT';
      else if (/求和|合计|汇总|金额总和/.test(text)) item.agg = 'SUM';
      if (!item.unit && item.field === 'customer_id' && /COUNT/.test(item.agg)) item.unit = '人';
      if (!item.unit && item.field === 'order_id' && /COUNT/.test(item.agg)) item.unit = '单';
      if (!item.unit && /amount|fee|price/.test(item.field)) item.unit = item.field.includes('10k') ? '万元' : '元';
      if (/只统计非招标项目|只算非招标项目/.test(text)) {
        if (fields.includes('procurement_method')) { item.defaultFilterSql = "procurement_method = '非招标'"; item.businessFilter = '仅统计非招标项目'; }
        else plan.semanticError = '当前业务数据中没有采购方式，暂时无法限定非招标项目。请说明另一种可用的业务筛选口径。';
      }
      if (/取消过滤|去掉过滤|不加过滤|取消筛选/.test(text)) { item.defaultFilterSql = ''; item.businessFilter = ''; plan.semanticError = ''; }
      if (item.agg && item.field && item.agg !== 'CUSTOM') item.functionExpr = atomExpression(item);
    } else if (item.formula) {
      const refs = store.formulaInfo(item.formula, data.indicators).refs, items = data.indicators.filter((other) => refs.includes(other.id));
      if (!item.unit && items.length && new Set(items.map((other) => other.unit)).size === 1) item.unit = items[0].unit;
      if (!item.srcId && items.length) item.srcId = items[0].srcId;
    }
    const rollback = { name: '名称|名字', synonyms: '同义词|别名', desc: '说明|描述', formula: '公式', unit: '单位' };
    for (const [key, words] of Object.entries(rollback)) {
      if (new RegExp('(?:不改(?:' + words + ')了?|(?:' + words + ')(?:不改了?|保持原来|恢复原来)|取消(?:' + words + ')修改)').test(text)) item[key] = (plan.base || plan.original || {})[key] || '';
    }
    const money = { 元: 1, 万元: 10000, 亿元: 100000000 }, base = plan.base;
    if (base && money[base.unit] && money[item.unit] && (unit || /单位.*原来|不改单位/.test(text))) {
      const ratio = money[base.unit] / money[item.unit];
      if (item.type === 'atom') {
        item.agg = ratio === 1 ? base.agg : 'CUSTOM';
        item.functionExpr = ratio === 1 ? (base.functionExpr || atomExpression(base)) : '(' + (base.functionExpr || atomExpression(base)) + ') * ' + ratio;
      } else if (!formula) item.formula = ratio === 1 ? base.formula : '(' + base.formula + ') * ' + ratio;
    }
  }
  function refresh(plan, data = store.snapshot()) {
    if (!plan.draft) return plan;
    plan.awaiting = null; plan.status = 'pending';
    const item = plan.draft;
    if (!data.historyReplay && !store.can(plan.action === 'view' ? 'view' : plan.action)) { plan.status = 'blocked'; plan.errors = ['当前用户可以查看指标，尚未获得这项维护操作的权限。']; return plan; }
    if (plan.action === 'delete') {
      plan.dependencies = store.dependents(item.id, data).map((other) => ({ id: other.id, name: other.name, formula: other.formula }));
      plan.errors = plan.dependencies.length ? ['「' + item.name + '」仍被' + plan.dependencies.map((other) => '「' + other.name + '」').join('、') + '引用，当前不能删除。'] : [];
      if (plan.errors.length) plan.status = 'blocked'; return plan;
    }
    if (!['create', 'edit'].includes(plan.action)) { plan.status = 'done'; plan.errors = []; return plan; }
    plan.errors = store.validate(item, data);
    if (plan.action === 'edit') plan.affected = store.dependents(item.id, data).map((other) => other.name);
    if (plan.semanticError) { plan.errors.push(plan.semanticError); return ask(plan, 'business', plan.semanticError); }
    if (!item.name) return ask(plan, 'name', '这个指标叫什么名字？可以直接告诉我业务名称。');
    if (plan.unknownDirectory || !store.groups(data).some((group) => group.id === item.groupId)) return ask(plan, 'directory', '这个指标要放在哪个目录？请回复目录名称或完整路径。', store.groups(data).map((group) => ({ id: group.id, label: group.path, aliases: [group.name] })));
    if (item.type === 'atom') {
      if (!item.table || !item.srcId || plan.modelCandidates?.length) {
        const choices = plan.modelCandidates?.length ? plan.modelCandidates : modelChoices(plan.sourceText);
        return ask(plan, 'model', '这个指标应从哪一类业务记录统计？请说明业务来源，例如销售订单或客户档案。', choices.length ? choices : store.models().slice(0, 8).map((model) => ({ ...model, id: model.ref, label: model.path, aliases: [model.name] })));
      }
      if (!item.field) return ask(plan, 'field', '在这些业务记录中，要统计什么内容？请回复业务名称。', (dict.FIELDS_BY_TABLE[item.table] || []).filter((field) => !/date|time|period/.test(field)).map((field) => ({ id: field, label: dict.FIELD_LABELS[field] || field })));
      if (!item.agg) return ask(plan, 'agg', '同一对象出现多次时怎么统计？例如每位客户只算一次、按记录条数统计，或汇总金额。', [{ id: 'COUNT_DISTINCT', label: '每个对象只算一次', aliases: ['去重', '只算一次'] }, { id: 'COUNT', label: '按记录条数统计', aliases: ['计数', '条数'] }, { id: 'SUM', label: '汇总金额', aliases: ['求和', '合计'] }, { id: 'AVG', label: '计算平均值', aliases: ['平均值', '平均'] }]);
    } else if (!item.formula) return ask(plan, 'formula', '这个指标怎么计算？直接说明需要使用哪些已有指标、如何相加或相除即可。');
    if (!item.unit) return ask(plan, 'unit', '结果用什么单位展示？例如元、万元、人或百分比。');
    if (plan.errors.length) { plan.status = 'missing'; plan.reply = '这份口径还需要调整：' + plan.errors.join(' '); }
    return plan;
  }
  function confirmation(text) {
    if (/[，,；;]|并把|并将|同时|名称改|单位改|公式改/.test(text)) return '';
    if (/^确认删除/.test(text)) return 'delete';
    if (/^确认(?:新增|创建)/.test(text)) return 'create';
    if (/^确认修改/.test(text)) return 'edit';
    if (/^(?:确认(?:保存)?|保存(?:吧)?|按(?:照)?(?:这个|此|刚才|以上|这)[^，,。；;]*(?:保存|执行)|刚才[^，,。；;]*保存|就按[^，,。；;]*保存)$/.test(text)) return 'save';
    return '';
  }
  function resolvedChoice(plan, text, data) {
    const pending = plan.awaiting, selected = choose(text, pending.choices || []), next = nextPlan(plan, text);
    if (pending.kind === 'scope') {
      if (/仅本次|本次查询|只用于这次|只改这次/.test(text)) { next.status = 'canceled'; next.reply = '已保留公共指标定义，本次展示要求仅用于当前问数。可以继续告诉我需要查询的时间和范围。'; next.temporary = true; return next; }
      if (/公共|指标体系|长期|以后/.test(text)) return resolve(plan.sourceText.replace(/本次|这次|临时/g, '') + '，修改公共指标定义', null, [], data);
    }
    if (pending.kind === 'metric' && selected) {
      const item = data.indicators.find((other) => other.id === selected.id);
      if (!item) { next.status = 'blocked'; next.errors = ['该指标已不存在，请重新描述要维护的指标。']; return next; }
      attach(next, item, data); applyText(next, plan.sourceText + '\n' + text, data); return refresh(next, data);
    }
    if (pending.kind === 'model') {
      const models = modelChoices(text), model = selected || (models.length === 1 ? models[0] : null);
      if (model) { setModel(next.draft, model); (plan.sourceText + '\n' + text).split('\n').forEach((line) => applyText(next, line, data, true)); delete next.modelCandidates; return refresh(next, data); }
    }
    if (pending.kind === 'field' && selected) next.draft.field = selected.id;
    else if (pending.kind === 'agg' && selected) next.draft.agg = selected.id;
    else if (pending.kind === 'directory' && selected) { next.draft.groupId = selected.id; next.unknownDirectory = false; }
    else if (pending.kind === 'name' && !/确认|保存/.test(text)) next.draft.name = text.replace(/^[「“"']|[」”"']$/g, '');
    else if (pending.kind === 'unit' && /元|人|单|件|次|天|%|百分比/.test(text)) next.draft.unit = text === '百分比' ? '%' : text.replace(/^用|展示为|还是用/g, '');
    else if (pending.kind === 'formula' && !/公式|等于/.test(text)) next.draft.formula = expression(text, data);
    else if (!selected) return null;
    applyText(next, text, data); return refresh(next, data);
  }
  function resolve(raw, previous, themes = [], data = store.snapshot()) {
    const text = raw.trim().replace(/[。！!？?]+$/, '');
    if (!text) return null;
    const head = text.split(/[，,。；;]/)[0];
    if (/报告|看板|附件|技能|定时任务/.test(head) && !/指标/.test(head)) return null;
    const confirmed = confirmation(text);
    if (previous?.resume && /^(?:继续|恢复)(?:刚才的?|之前的?)?(?:修改|维护|方案|操作)$/.test(text)) {
      const next = nextPlan(previous.resume, text); next.reply = '已恢复刚才尚未保存的维护方案。请核对摘要，继续修改或明确确认。'; return refresh(next, data);
    }
    if (previous?.resume && /^(?:取消|取消刚才的维护|不保存了)$/.test(text)) return resolve('取消', previous.resume, themes, data);
    if (previous?.resume && confirmed) {
      const next = nextPlan(previous, text); next.status = 'done'; next.reply = '当前展示的是查询口径。请先说“继续刚才的修改”，核对维护摘要后再确认。'; return next;
    }
    if (previous?.action === 'list' && previous.candidates?.length && /第[一二两三四五六七八九十\d]+个/.test(text)) {
      const ordinal = text.match(/第[一二两三四五六七八九十\d]+个/)[0];
      const item = choose(ordinal, previous.candidates.map((candidate) => ({ ...candidate, label: candidate.name })));
      if (item) return resolve(/查看|修改|删除/.test(text) ? text.replace(ordinal, '「' + item.name + '」') : '查看指标「' + item.name + '」的口径', null, themes, data);
    }
    if (previous?.historyExample && confirmed) {
      const next = nextPlan(previous, text); next.status = 'done'; next.reply = '这是历史示例的处理记录。若要在当前指标体系中操作，可以说“按这个示例新增指标”，或直接描述要修改、删除的指标。'; return next;
    }
    if (previous && /按(?:这个|该|此)示例新增指标/.test(text)) {
      const next = fresh('create', text); next.draft = copy(previous.draft); next.draft.id = ''; next.themes = copy(previous.themes || []); next.original = copy(next.draft); return refresh(next, data);
    }
    if (active(previous) && /^(?:取消|不保存(?:了)?|暂不保存|放弃(?:这次修改)?|取消保存|取消删除|(?:这个指标)?先保留|不用修改了|不改了|算了)$/.test(text)) {
      const next = nextPlan(previous, text); next.status = 'canceled'; next.errors = []; next.reply = previous.action === 'delete' ? '已取消删除，指标及主题关联均保留。' : '已取消本次维护，待保存的调整没有写入指标体系。'; return next;
    }
    if (confirmed && previous && !previous.historyExample) {
      const next = nextPlan(previous, text);
      if (!active(previous)) { next.status = previous.status; next.reply = '这项操作已经结束，不会重复执行。可以继续描述下一项维护需求。'; return next; }
      if (!previous.draft) { next.awaiting = copy(previous.awaiting); next.status = previous.status; next.reply = '请先明确具体指标及操作范围，再确认执行。'; return next; }
      if ((confirmed !== 'save' && confirmed !== previous.action) || (previous.action === 'delete' && confirmed !== 'delete')) {
        next.status = previous.status; next.reply = previous.action === 'delete' ? '请明确回复“确认删除' + previous.draft.name + '”，或说“这个指标先保留”。' : '请按摘要确认相应的新增或修改操作。'; return next;
      }
      const named = text.match(/^确认(?:删除|新增|创建|修改)(?:指标)?(.*)$/);
      const targetName = named?.[1].replace(/[「」“”"'\s]/g, '').replace(/(?:这个指标|该指标)$/, '');
      if ((previous.action === 'delete' && !targetName) || (targetName && !aliases(previous.draft).includes(targetName))) {
        next.status = previous.status; next.reply = '当前待确认的指标是「' + previous.draft.name + '」。请明确回复“确认' + (previous.action === 'delete' ? '删除' : previous.action === 'create' ? '新增' : '修改') + previous.draft.name + '”。'; return next;
      }
      refresh(next, data); if (next.status === 'pending' && !next.errors.length) next.confirmRequested = true; return next;
    }
    const lookup = /查看|查找|搜索|有哪些|列出|怎么算|怎么计算|计算口径|指标口径|详情|查询.*(?:指标|口径|目录)/.test(text);
    const creationIntent = /^(?:请|帮我|请帮我)?(?:新增|新建|创建)/.test(text) && !/同义词|别名/.test(text);
    const newAction = (creationIntent || /^(?:请|帮我|请帮我)?(?:删除|修改指标|维护指标)/.test(text)) && !/删除(?:同义词|别名)/.test(text);
    if (active(previous) && !previous.historyExample && /重新读取|读取最新|重新核对/.test(text)) {
      const item = data.indicators.find((other) => other.id === previous.draft?.id), next = nextPlan(previous, text);
      if (!item) { next.status = 'blocked'; next.errors = ['该指标已不存在，请重新发起维护。']; return next; }
      const delta = Object.fromEntries(Object.entries(previous.draft).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(previous.base?.[key])));
      const latestThemes = themesOf(item, data), oldThemes = previous.baseThemes || [];
      const removed = oldThemes.filter((theme) => !previous.themes.includes(theme)), added = previous.themes.filter((theme) => !oldThemes.includes(theme));
      next.baseThemes = copy(latestThemes); next.themes = [...new Set([...latestThemes.filter((theme) => !removed.includes(theme)), ...added])];
      next.base = copy(item); next.draft = { ...copy(item), ...delta }; next.notice = '已按最新指标定义重新核对，请核对本轮摘要后再确认。'; return refresh(next, data);
    }
    if (active(previous) && !previous.historyExample && previous.awaiting && !lookup && !newAction) {
      const selected = resolvedChoice(previous, text, data); if (selected) return selected;
    }
    const changes = /同义词|别名|名称|名字|描述|说明|单位|公式|等于|加入|关联|移出|目录|模型|字段|统计|原子|衍生|去重|求和|过滤|筛选|不改|改成|改为|只算一次|^(?:还是|仍然)?用(?:元|万元|亿元|人|单|件|次|天|%)$/.test(text) || dict.UNIT_PRESETS.includes(text);
    if (active(previous) && previous.draft && !previous.historyExample && !lookup && !newAction && changes && previous.status !== 'blocked') {
      const next = nextPlan(previous, text); applyText(next, text, data); return refresh(next, data);
    }
    if (/^(?:请)?(?:管理指标|指标维护)$/.test(text)) return { ...fresh('help', text), status: 'done', themes };
    const candidates = locate(text, data);
    const last = previous?.draft && (data.indicators.find((item) => item.id === previous.draft.id) || (!previous.historyExample ? previous.draft : null));
    if (last && /趋势/.test(text) && (/这个指标|该指标|刚才的指标/.test(text) || candidates.some((item) => item.id === last.id))) return { ...fresh('analyze', text), status: 'done', draft: copy(last) };
    let action = /删除/.test(text) && !/删除(?:同义词|别名)/.test(text) ? 'delete' : creationIntent ? 'create' : /修改|维护|调整|同义词|别名|改名|重命名|改成|改为|移到|移入/.test(text) ? 'edit' : lookup ? 'view' : '';
    if (!action && previous?.draft && changes && /这个指标|该指标|加入|关联|名称|单位/.test(text)) action = 'edit';
    const partial = text.replace(/请|帮我|修改|删除|维护|查看|指标|[「」“”"'\s]/g, '');
    const fuzzy = partial.length >= 2 && data.indicators.some((item) => aliases(item).some((name) => name.includes(partial)));
    if (!action || (!/指标|同义词|别名|等于|公式/.test(text) && !candidates.length && !fuzzy && !(last && changes))) {
      if (active(previous) && !previous.historyExample) {
        const next = nextPlan(previous, text); next.status = previous.status; next.awaiting = copy(previous.awaiting || null);
        next.reply = /^(好的|好|知道了|嗯)$/.test(text) ? '当前操作尚未执行。请继续补充口径，或明确回复确认指令；也可以说“取消”。' : '我还没有理解这次补充。请直接说明要改的业务口径，例如“单位还是用元”“名称不改了”，或说“取消”。'; return next;
      }
      return null;
    }
    if (/本次|这次|临时/.test(text) && action !== 'view' && !/公共|指标体系|永久|以后|定义/.test(text)) return ask(fresh(action, text), 'scope', '仅调整本次查询的口径，还是修改指标体系中的公共定义？请直接说明。');
    const plan = fresh(action, text);
    if (action === 'create') {
      const match = text.match(/(?:新增|新建|创建)(?:一个|一项)?(?:原子指标|衍生指标|指标)?\s*[「“"']?(.+?)(?=[」”"'，,。；;]|等于|放到|放入|$)/);
      plan.draft = { id: '', name: match ? match[1].trim() : '', type: /等于|公式|衍生/.test(text) ? 'derived' : 'atom', groupId: '__uncategorized__', synonyms: '', desc: '', unit: '', formula: '', srcId: '', table: '', field: '', agg: '', timeField: '', defaultFilterSql: '' };
      applyText(plan, text, data); if (!plan.draft.desc && plan.draft.formula) plan.draft.desc = '统计周期内的' + plan.draft.name + '。';
      plan.original = copy(plan.draft); return refresh(plan, data);
    }
    const targetText = text.split(/等于|公式|同义词|别名|重命名为|改名为|名称改/)[0];
    let targets = locate(targetText, data);
    if (!targets.length && last && (/刚才|这个指标|该指标/.test(text) || (!lookup && changes && previous?.draft))) targets = [last];
    if (action === 'view') {
      if (active(previous) && !previous.historyExample) {
        plan.resume = copy(previous);
        plan.notice = '刚才的维护方案已保留，可以说“继续刚才的修改”。';
      } else if (previous?.resume) plan.resume = copy(previous.resume);
      if (!targets.length && last && /这个指标|该指标/.test(text)) targets = [last];
      if (targets.length === 1) { attach(plan, targets[0], data); plan.status = 'done'; return plan; }
      const groups = store.groups(data).filter((group) => text.includes(group.name));
      const groupIds = new Set(store.groups(data).filter((group) => groups.some((parent) => group.path === parent.path || group.path.startsWith(parent.path + ' / '))).map((group) => group.id));
      const keyword = text.replace(/请|查看|查询|查找|搜索|有哪些|列出|指标|的|口径|详情|[「」“”"'？?\s]/g, '');
      plan.action = 'list'; plan.status = 'done'; plan.candidates = candidates.length ? candidates : data.indicators.filter((item) => groups.length ? groupIds.has(item.groupId) : !keyword || aliases(item).some((name) => name.includes(keyword))); return plan;
    }
    if (targets.length !== 1) {
      const term = targetText.replace(/请|帮我|给|把|修改|删除|维护|指标|[「」“”"'，,\s]/g, '');
      const options = targets.length ? targets : data.indicators.filter((item) => !term || aliases(item).some((name) => name.includes(term)));
      return ask(plan, 'metric', options.length ? '你要维护的是哪一个指标？可以回复名称、完整目录或“第二个”。' : '没有找到这个指标，请告诉我更准确的名称或所属目录。', options.map((item) => ({ id: item.id, name: item.name, label: item.name + ' · ' + (store.groups(data).find((group) => group.id === item.groupId)?.path || '未分类'), aliases: aliases(item) })));
    }
    attach(plan, targets[0], data); if (action === 'edit') applyText(plan, text, data); return refresh(plan, data);
  }
  function definition(item, data) {
    const model = store.models().find((entry) => entry.srcId === item.srcId && entry.table === item.table);
    const aggregation = { SUM: '求和', COUNT: '按记录计数', COUNT_DISTINCT: '去重计数', AVG: '计算平均值', MAX: '取最大值', MIN: '取最小值', CUSTOM: '按已确认的换算口径计算' };
    let filter = item.businessFilter || item.defaultFilterSql || '无额外筛选';
    if (!item.businessFilter && item.defaultFilterSql) {
      Object.entries(dict.FIELD_LABELS).sort((a, b) => b[0].length - a[0].length).forEach(([field, label]) => { filter = filter.split(field).join(label); });
      filter = filter.replace(/IS NOT NULL/gi, '有值').replace(/\bAND\b/gi, '且').replace(/=/g, '为').replace(/'/g, '');
    }
    return {
      name: ['名称', item.name], type: ['类型', item.type === 'derived' ? '衍生指标' : '原子指标'], groupId: ['目录', store.groups(data).find((group) => group.id === item.groupId)?.path || '未分类'],
      synonyms: ['同义词', item.synonyms || '未设置'], desc: ['业务说明', item.desc || '未设置'],
      ...(item.type === 'derived' ? { formula: ['计算口径', item.formula || '尚待说明'] } : { modelRef: ['业务来源', model?.path || '尚待说明'], field: ['统计对象', dict.FIELD_LABELS[item.field] || '尚待说明'], agg: ['统计方式', aggregation[item.agg] || '尚待说明'], timeField: ['统计时间', dict.FIELD_LABELS[item.timeField] || '沿用查询时间要求'], defaultFilterSql: ['业务筛选', filter] }),
      unit: ['单位', item.unit || '尚待说明']
    };
  }
  function summary(plan, data) {
    if (!plan.draft) return '';
    const values = definition(plan.draft, data), old = plan.base && definition(plan.base, data);
    const entries = Object.entries(values).filter(([key, pair]) => plan.action !== 'edit' || !old || pair[1] !== old[key]?.[1]);
    const lines = entries.map(([key, pair]) => `<li><strong>${esc(pair[0])}：</strong>${plan.action === 'edit' ? `<span class="ic-before">${esc(old?.[key]?.[1] || '未设置')}</span><span aria-hidden="true"> → </span>` : ''}${esc(pair[1])}</li>`);
    if (plan.action === 'edit' && !lines.length) lines.push('<li>当前尚未设置定义变更，可以直接告诉我要改什么。</li>');
    lines.push('<li><strong>' + (plan.action === 'delete' ? '涉及主题' : '关联主题') + '：</strong>' + esc(plan.themes?.join('、') || '未关联主题') + '</li>');
    return '<ul class="ic-summary">' + lines.join('') + '</ul>';
  }
  function render(container, plan) {
    if (!container || !plan) return;
    container.classList.remove('hidden');
    const data = plan.historyData || store.snapshot();
    const names = { create: '新增指标', edit: '修改指标', delete: '删除指标', view: '指标口径', list: '查找指标', help: '指标维护', analyze: '指标查询' };
    const statuses = { pending: '待回复确认', missing: '待补充', ambiguous: '待澄清', scope: '待澄清', blocked: '操作受阻', stale: '待重新核对', saved: plan.action === 'delete' ? '已删除' : '已保存', canceled: '已取消', superseded: '方案已更新', done: '已回复' };
    let body = '';
    if (plan.action === 'help') {
      body = '<p class="ic-intro">直接告诉我指标的业务口径。我会通过对话补齐信息，给出只读摘要；你明确回复确认后再保存。</p><ul class="ic-examples"><li>“新增平台服务费合计，等于招标平台服务费加非招服务费，放到服务收入目录。”</li><li>“给非招服务费增加同义词‘非招业务服务收入’。”</li><li>“单位还是用元，名称不改了。”</li><li>“加入销售分析主题。”</li><li>“按刚才这三项修改保存。”</li><li>“确认删除招标成交金额”或“这个指标先保留”。</li></ul>';
    } else if (plan.action === 'analyze') {
      body = `<p class="ic-intro">已定位「${esc(plan.draft.name)}」。以下为近六个月的原型示例数据，单位：${esc(plan.draft.unit)}。</p><div class="ic-table-wrap"><table class="ic-table"><thead><tr><th>月份</th><th>${esc(plan.draft.name)}</th></tr></thead><tbody>${Array.from({ length: 6 }, (_, index) => { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - 5 + index); return `<tr><td>${date.getFullYear()}年${date.getMonth() + 1}月</td><td>${(18000 + (index + 1) * 3200).toLocaleString('zh-CN')}</td></tr>`; }).join('')}</tbody></table></div>`;
    } else {
      if (plan.reply) body += `<p class="ic-intro">${esc(plan.reply)}</p>`;
      if (plan.draft) body += summary(plan, data);
      if (plan.action === 'list') body += plan.candidates?.length ? '<ol class="ic-options">' + plan.candidates.map((item) => '<li><strong>' + esc(item.name) + '</strong> · ' + esc(store.groups(data).find((group) => group.id === item.groupId)?.path || '未分类') + '<p>' + esc(item.desc) + '</p></li>').join('') + '</ol><p class="ic-note">可以继续说“查看第二个的口径”，或直接说明要维护的指标名称。</p>' : '<p class="ic-note">没有找到匹配指标，请换一个名称或目录描述。</p>';
      if (plan.awaiting) { body += `<p class="ic-followup">${esc(plan.awaiting.question)}</p>`; if (plan.awaiting.choices?.length) body += '<ol class="ic-options">' + plan.awaiting.choices.map((choice) => '<li>' + esc(choice.label || choice.name) + '</li>').join('') + '</ol>'; }
      if (plan.errors?.length && !plan.awaiting) body += '<div class="ic-validation is-error" role="status">' + plan.errors.map((error) => '<p>' + esc(error.replace(/请填写/g, '请告诉我').replace(/请选择/g, '请说明')) + '</p>').join('') + '</div>';
      if (plan.dependencies?.length) body += '<ul class="ic-dependencies">' + plan.dependencies.map((item) => '<li><strong>' + esc(item.name) + '：</strong>' + esc(item.formula) + '</li>').join('') + '</ul><p class="ic-note">可以继续问“查看' + esc(plan.dependencies[0].name) + '的计算口径”。处理引用关系后，再重新发起删除。</p>';
      if (plan.affected?.length && plan.status !== 'canceled') body += '<p class="ic-note">' + (plan.status === 'saved' ? '已同步相关指标引用：' : '将影响后续查询及相关指标：') + esc(plan.affected.join('、')) + '。历史结果保留。</p>';
      if (plan.status === 'pending' && !plan.errors?.length) body += plan.action === 'delete'
        ? `<p class="ic-delete-note">删除会移除公共指标及其主题关联，历史会话保留原结果。请回复“确认删除${esc(plan.draft.name)}”，或说“这个指标先保留”。</p>`
        : '<p class="ic-followup">' + (plan.action === 'create' ? '可以继续补充口径、目录或关联主题；核对后回复“确认新增”。' : '本轮摘要包含此前尚未保存的调整。可以继续修改，核对后回复“确认修改”或“按刚才这几项修改保存”。') + '</p>';
      if (plan.status === 'saved') body += `<p class="ic-validation" role="status">${plan.historyExample ? '示例处理结果：' : ''}${plan.action === 'delete' ? '已删除指标并清理主题关联。' : '已保存到指标体系，已关联主题的目录同步更新。'}</p>`;
      if (plan.notice) body += `<p class="ic-note">${esc(plan.notice)}</p>`;
      if (plan.message) body += `<p class="ic-validation is-error" role="alert">${esc(plan.message)}</p>`;
    }
    container.dataset.indicatorToken = plan.token;
    container.innerHTML = `<header class="ic-head"><strong><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10h4v10M10 20V4h4v16M15 20v-7h4v7"/></svg>${esc(names[plan.action] || '指标维护')}</strong><span class="ic-status is-${esc(plan.status)}">${plan.historyExample ? '示例 · ' : ''}${esc(statuses[plan.status] || '已回复')}</span></header>${body}`;
  }
  function confirm(plan) {
    delete plan.confirmRequested;
    if (plan.historyExample || plan.status !== 'pending') return;
    const data = store.snapshot(); refresh(plan, data);
    if (plan.status !== 'pending' || plan.errors.length) return;
    if (plan.base && JSON.stringify((plan.baseThemes || []).slice().sort()) !== JSON.stringify(themesOf(plan.base, data).slice().sort())) {
      plan.status = 'stale'; plan.message = '该指标的主题关联已发生变化，请先重新核对影响范围。'; plan.notice = '请回复“重新读取最新口径”，核对本轮摘要后再确认。'; return;
    }
    if (plan.action === 'edit' && JSON.stringify(definition(plan.draft, data)) === JSON.stringify(definition(plan.base, data)) && JSON.stringify(plan.themes.slice().sort()) === JSON.stringify((plan.baseThemes || themesOf(plan.base, data)).slice().sort())) { plan.reply = '当前没有需要保存的变更。请直接告诉我要调整的业务内容。'; return; }
    try {
      if (plan.action === 'delete') store.remove(plan.draft.id, plan.base);
      else plan.draft = store.save(plan.draft, { base: plan.base, themes: plan.themes });
      plan.status = 'saved'; plan.errors = []; plan.reply = plan.action === 'delete' ? '已按你的明确确认删除「' + plan.draft.name + '」。' : '已按本轮确认保存「' + plan.draft.name + '」。';
    } catch (error) {
      plan.message = error.message;
      if (/已被|已在其他|重新读取/.test(error.message)) { plan.status = 'stale'; plan.notice = '请回复“重新读取最新口径”，核对更新后的摘要再确认。'; }
    }
  }
  function invalidate(plan) {
    if (!active(plan) || plan.status === 'blocked' || plan.historyExample) return;
    plan.status = 'superseded';
    document.querySelectorAll('[data-indicator-token]').forEach((card) => { if (card.dataset.indicatorToken === plan.token) render(card, plan); });
  }
  function prefill(text) { if (bridge && !bridge.busy()) bridge.prefill(text); }
  function history(kind) {
    // 示例确认只修改内存副本；回看历史绝不重放公共目录写入。
    const data = copy(store.snapshot());
    const fixtures = [
      { id: 'i_platform_fee', name: '招标平台服务费', type: 'atom', groupId: 'g_rev_service', srcId: 'ds_metric', table: 'platform_service_fee_detail', field: 'service_fee_amount', agg: 'SUM', timeField: 'service_fee_collection_time', unit: '元', synonyms: '平台服务费收入', desc: '招标平台收取的服务费收入。' },
      { id: 'i_non_bid_fee', name: '非招服务费', type: 'atom', groupId: 'g_rev_service', srcId: 'ds_metric', table: 'non_bidding_fee_detail', field: 'service_fee_amount', agg: 'SUM', timeField: 'service_fee_payment_time', unit: '元', synonyms: '非招服务费收入', desc: '非招标项目的服务费收入。' },
      { id: 'i_bid_amt', name: '招标成交金额', type: 'atom', groupId: 'g_rev_sale', srcId: 'ds_metric', table: 'bidding_project_info', field: 'bidding_amount', agg: 'SUM', timeField: 'service_fee_collection_time', unit: '万元', synonyms: '招标项目成交金额', desc: '招标项目的成交金额合计。' },
      { id: 'i_total_income', name: '总收入', type: 'derived', groupId: 'g_rev_sale', formula: '招标平台服务费 + 非招服务费', unit: '元', desc: '平台服务收入合计。' }
    ];
    data.historyReplay = true;
    data.indicators = copy(fixtures);
    data.groups = [{ id: 'g_revenue', name: '收入指标', children: [{ id: 'g_rev_service', name: '服务收入' }, { id: 'g_rev_sale', name: '销售收入' }] }];
    data.themes = { '销售分析': fixtures.map((item) => item.id), '财务分析': ['i_platform_fee', 'i_non_bid_fee', 'i_total_income'], '客户分析': [], '库存分析': [], '经营概览': fixtures.map((item) => item.id) };
    const sequences = {
      create: ['新增指标「平台服务费合计」，等于招标平台服务费加非招服务费，放到服务收入目录', '加入销售分析主题', '确认新增'],
      edit: ['给非招服务费增加同义词「非招业务服务收入」', '描述改为「非招标项目的服务费收入（按服务费支付时间统计）」', '名称改为「非招业务服务费」', '按刚才这三项修改保存'],
      delete: ['删除指标「招标成交金额」', '这个指标先保留', '删除指标「招标成交金额」', '确认删除招标成交金额'],
      dependency: ['删除指标「非招服务费」', '查看总收入的计算口径']
    };
    const endMinute = { create: 40, edit: 38, delete: 36, dependency: 34 }[kind];
    const turns = []; let previous = null;
    (sequences[kind] || []).forEach((question, index) => {
      const plan = resolve(question, previous, ['销售分析'], data);
      if (plan.confirmRequested && plan.status === 'pending' && !plan.errors.length) {
        delete plan.confirmRequested;
        if (plan.action === 'delete') {
          data.indicators = data.indicators.filter((item) => item.id !== plan.draft.id);
          Object.keys(data.themes).forEach((theme) => { data.themes[theme] = data.themes[theme].filter((id) => id !== plan.draft.id); });
        } else {
          if (plan.base && plan.base.name !== plan.draft.name) store.dependents(plan.base.id, data).forEach((dependent) => { dependent.formula = dependent.formula.split(plan.base.name).join(plan.draft.name); });
          if (!plan.draft.id) plan.draft.id = 'i_history_' + kind;
          data.indicators = data.indicators.filter((item) => item.id !== plan.draft.id).concat(copy(plan.draft));
          Object.keys(data.themes).forEach((theme) => {
            data.themes[theme] = data.themes[theme].filter((id) => id !== plan.draft.id);
            if (plan.themes.includes(theme)) data.themes[theme].push(plan.draft.id);
          });
        }
        plan.status = 'saved'; plan.reply = plan.action === 'delete' ? '已按你的确认删除该指标，并清理主题关联。' : '已按刚才确认的口径保存，后续问数可以复用。';
      }
      previous = copy(plan); plan.historyExample = true; plan.historyData = copy(data);
      turns.push({ question, mode: 'indicator', sentAt: '09:' + String(endMinute - sequences[kind].length + 1 + index).padStart(2, '0'), answerTitle: '指标维护与管理', indicator: plan, context: { themes: ['销售分析'], references: [], attachments: [], followup: null }, guides: [] });
    });
    return turns;
  }
  global.IndicatorChat = { configure(value) { bridge = value; }, resolve, render, prefill, invalidate, confirm, history };
})(window);
