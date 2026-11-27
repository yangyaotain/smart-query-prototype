(function (global) {
  "use strict";

  const store = global.ScheduledTaskStore;
  const fields = ["name", "theme", "skillId", "skill", "prompt", "frequency", "time", "onceDate", "interval", "customUnit", "weekDays", "monthDay"];
  const copy = value => JSON.parse(JSON.stringify(value));
  const token = () => "task-change-" + Date.now() + "-" + Math.random().toString(16).slice(2, 8);
  let themes = ["销售分析", "客户分析", "库存分析", "经营分析", "供应商管理", "采购分析"];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const icons = {
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>'
  };

  function configuration(task) { return Object.fromEntries(fields.map(key => [key, copy(task[key] ?? (key === "weekDays" ? [] : ""))])); }
  function equal(a, b) { return JSON.stringify(configuration(a)) === JSON.stringify(configuration(b)); }
  function getTask(id) { return store.load().find(task => task.id === id); }
  function skills() { return global.SkillCatalogStore?.load() || []; }
  function ready(skill) { return skill.enabled !== false && global.SkillCatalogStore.isReady(skill); }
  function number(text) {
    if (/^\d+$/.test(text)) return Number(text);
    const digits = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    if (text.includes("十")) { const [tens, ones] = text.split("十"); return (digits[tens] || 1) * 10 + (digits[ones] || 0); }
    return digits[text];
  }
  function delta(plan) {
    const describe = task => global.ScheduledTaskForm.describeSchedule(task);
    return [
      ["任务名称", plan.base.name, plan.draft.name], ["分析主题", plan.base.theme, plan.draft.theme],
      ["技能", plan.base.skill || "通用问数", plan.draft.skill || "通用问数"],
      ["任务指令", plan.base.prompt, plan.draft.prompt], ["执行计划", describe(plan.base), describe(plan.draft)]
    ].filter(row => row[1] !== row[2]);
  }
  function validate(plan) {
    const task = plan.draft;
    const errors = [];
    if (!task.name || task.name.length > 40) errors.push("任务名称需为 1–40 个字符。");
    if (!themes.includes(task.theme)) errors.push("请选择可用的分析主题。");
    if (!task.prompt.trim()) errors.push("请补充任务指令。");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(task.time)) errors.push("执行时间需为有效的 24 小时时间。");
    if (!['once', 'hourly', 'daily', 'weekdays', 'weekly', 'monthly', 'custom'].includes(task.frequency)) errors.push("请选择有效的执行频率。");
    if (task.frequency === 'weekly' && (!task.weekDays.length || task.weekDays.some(day => day < 0 || day > 6))) errors.push("请说明每周需要执行的星期。");
    if (task.frequency === 'monthly' && (!Number.isInteger(task.monthDay) || task.monthDay < 1 || task.monthDay > 32)) errors.push("每月执行日应为 1–31 日或月末。");
    if (['hourly', 'custom'].includes(task.frequency) && (!Number.isInteger(task.interval) || task.interval < 1 || task.interval > 99)) errors.push("重复间隔需为 1–99 的整数。");
    if (task.frequency === 'custom' && !['hour', 'day', 'week', 'month'].includes(task.customUnit)) errors.push("请选择有效的重复间隔单位。");
    if (task.frequency === 'once') {
      const date = new Date(task.onceDate + 'T' + task.time);
      const parts = task.onceDate.split('-').map(Number);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(task.onceDate) || Number.isNaN(date.getTime()) || date.getFullYear() !== parts[0] || date.getMonth() + 1 !== parts[1] || date.getDate() !== parts[2] || date <= new Date()) errors.push("单次任务需设置有效的未来执行日期和时间。");
    }
    if (task.skill && !skills().some(skill => (skill.id === task.skillId || skill.name === task.skill) && ready(skill))) errors.push("所选技能已停用或存在待确认内容，请重新选择。");
    return errors;
  }
  function planFor(task, previous) {
    const continuing = previous && ['pending', 'invalid'].includes(previous.status) && previous.taskId === task.id;
    return { token: token(), taskId: task.id, base: copy(continuing ? previous.base : store.taskSnapshot(task)), draft: copy(continuing ? previous.draft : store.taskSnapshot(task)), status: 'pending', errors: [], round: continuing ? previous.round + 1 : 1 };
  }
  function finish(plan) {
    plan.errors = [...new Set(plan.errors.concat(validate(plan)))];
    if (plan.errors.length) plan.status = 'invalid';
    else if (!delta(plan).length) { plan.status = 'view'; plan.reply = '当前配置已符合该要求，可以继续说明需要调整的内容。'; }
    return plan;
  }
  function missing(taskId) { return { token: token(), taskId, status: 'missing', errors: [], reply: '该任务已删除，无法继续修改。可返回任务列表查看其他任务。' }; }

  function resolve(raw, taskId, previous) {
    const text = String(raw || '').trim();
    const confirm = /^(?:确认修改|确认保存|保存(?:本轮|这些)?修改|按.*(?:修改|调整)保存)[。！!]*$/.test(text);
    const cancel = /^(?:取消修改|取消本轮修改|先不改了?|暂不修改)[。！!]*$/.test(text);
    const view = /(?:查看|打开|看看|编辑)(?:这个|当前)?(?:定时)?任务配置/.test(text);
    const intention = /改|调整|设置|增加|补充|取消技能|不用技能/.test(text) && /任务|执行|调度|频率|时间|计划|分析范围|范围|同比|环比|技能|主题|指令|名称|命名/.test(text);
    if (!confirm && !cancel && !view && !intention) return null;
    let task = getTask(taskId || previous?.taskId);
    const named = store.load().filter(item => text.includes(item.name));
    if (named.length === 1) task = named[0];
    if (!task) {
      if (taskId || previous?.taskId) return missing(taskId || previous.taskId);
      if (!/任务/.test(text)) return null;
      return { token: token(), status: 'missing', errors: [], reply: '请先从定时任务会话打开需要修改的任务，或在消息中写出完整任务名称。' };
    }
    if (confirm || cancel) {
      if (!previous || previous.taskId !== task.id || !['pending', 'invalid'].includes(previous.status)) {
        const plan = planFor(task); plan.status = 'view'; plan.reply = '当前没有待保存的修改，请先说明需要调整的配置。'; return plan;
      }
      const plan = copy(previous); plan.token = token();
      if (cancel) { plan.status = 'canceled'; plan.reply = '本轮修改已取消，任务继续使用原配置。'; }
      else plan.confirmRequested = true;
      return plan;
    }
    const plan = planFor(task, previous);
    if (view && !intention) {
      if (previous?.taskId === task.id && ['pending', 'invalid'].includes(previous.status)) {
        plan.reply = '以下为本轮待保存配置，可继续补充调整，核对后确认修改。';
        return finish(plan);
      }
      plan.status = 'view'; plan.reply = '以下为任务当前配置，可直接输入修改要求，或打开编辑配置。'; return plan;
    }
    let recognized = false;
    let match;
    const scheduleText = text.replace(/(?:任务名称|名称|命名|分析主题|主题|技能)(?:改为|改成|修改为|调整为|设为|设置为|叫做|叫)[^，。；;]+/g, '').replace(/(?:任务指令|分析指令)(?:改为|改成|设为|设置为|调整为)[\s\S]+$/, '');
    if ((match = text.match(/(?:任务名称|名称|命名)(?:\s*(?:改为|改成|修改为|调整为|设为|设置为|叫做|叫|为|成))\s*[“「"]?([^，。；;”」"]+)/))) {
      plan.draft.name = match[1].trim(); recognized = true;
    }
    if (/每(?:个)?工作日|周一至周五|周一到周五/.test(scheduleText)) { plan.draft.frequency = 'weekdays'; recognized = true; }
    else if (/每天|每日/.test(scheduleText)) { plan.draft.frequency = 'daily'; recognized = true; }
    else if (/每小时/.test(scheduleText)) { plan.draft.frequency = 'hourly'; plan.draft.interval = 1; recognized = true; }
    else if (/仅执行一次|只执行一次|单次执行/.test(scheduleText)) { plan.draft.frequency = 'once'; recognized = true; }
    else if ((match = scheduleText.match(/每周([一二三四五六日天、和至到\-]+)/))) {
      const days = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
      const range = match[1].match(/^([一二三四五六日天])[至到\-]([一二三四五六日天])$/);
      if (range) { const start = days[range[1]] || 7, end = days[range[2]] || 7; plan.draft.weekDays = Array.from({ length: (end - start + 7) % 7 + 1 }, (_, i) => (start + i) % 7); }
      else plan.draft.weekDays = [...new Set([...match[1]].filter(char => char in days).map(char => days[char]))];
      plan.draft.frequency = 'weekly'; recognized = true;
    } else if ((match = scheduleText.match(/每月(?:的)?(月末|最后一天|\d{1,2}|[一二三四五六七八九十]{1,3})(?:日|号)?/))) {
      plan.draft.frequency = 'monthly'; plan.draft.monthDay = /月末|最后/.test(match[1]) ? 32 : number(match[1]); recognized = true;
    } else if ((match = scheduleText.match(/每(?:隔)?\s*(\d+)\s*(?:个)?(小时|天|周|月)/))) {
      plan.draft.frequency = match[2] === '小时' && [1, 2, 3, 4, 6, 12].includes(Number(match[1])) ? 'hourly' : 'custom'; plan.draft.interval = Number(match[1]);
      plan.draft.customUnit = { 小时: 'hour', 天: 'day', 周: 'week', 月: 'month' }[match[2]]; recognized = true;
    } else if (/每周|每月/.test(scheduleText)) plan.errors.push('请明确每周执行的星期或每月执行日期。');
    if ((match = scheduleText.match(/(\d{4})[-年/](\d{1,2})[-月/](\d{1,2})日?/))) {
      plan.draft.onceDate = match[1] + '-' + match[2].padStart(2, '0') + '-' + match[3].padStart(2, '0');
      plan.draft.frequency = 'once'; recognized = true;
    }
    if ((match = scheduleText.match(/([零一二三四五六七八九十两\d]{1,3})(?:[:：](\d{1,2})|[点时](半|一刻|三刻|[零一二三四五六七八九十两\d]{1,3}分?)?)/))) {
      let hour = number(match[1]); const minuteText = match[2] || match[3] || '0';
      const minute = ({ 半: 30, 一刻: 15, 三刻: 45 })[minuteText] ?? number(minuteText.replace(/分$/, ''));
      if (/下午|晚上|傍晚/.test(scheduleText) && hour < 12) hour += 12;
      if (/凌晨/.test(scheduleText) && hour === 12) hour = 0;
      plan.draft.time = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0'); recognized = true;
    }
    if ((match = text.match(/(?:分析主题|主题)(?:改为|改成|设为|设置为|调整为)\s*[“「"]?([^，。；;”」"]+)/))) {
      const theme = themes.find(item => match[1].trim() === item);
      if (theme) plan.draft.theme = theme; else plan.errors.push('未找到该分析主题，请使用编辑配置选择可用主题。');
      recognized = true;
    }
    if (/取消技能|不用技能|(?:技能|改为|改成|使用).{0,6}通用问数/.test(text)) { plan.draft.skill = ''; plan.draft.skillId = ''; recognized = true; }
    else if ((match = text.match(/(?:技能)(?:改为|改成|设为|设置为|调整为|使用)\s*[“「"]?([^，。；;”」"]+)/))) {
      const skill = skills().find(item => item.name === match[1].trim());
      if (skill && ready(skill)) { plan.draft.skill = skill.name; plan.draft.skillId = skill.id; }
      else plan.errors.push('未找到可用的指定技能，请通过编辑配置选择。');
      recognized = true;
    }
    if ((match = text.match(/(?:任务指令|分析指令)(?:改为|改成|设为|设置为|调整为)[：:\s]*[“「"]?([\s\S]+)/))) {
      plan.draft.prompt = match[1].replace(/[”」"]$/, '').trim(); recognized = true;
    } else {
      if ((match = text.match(/(?:分析范围|范围)(?:改为|改成|调整为|扩大到|增加到)[：:\s]*([^，。；;]+)/))) {
        const regionPattern = /华东区?|华南区?|华北区?|华中区?|西南区?|西北区?|东北区?|全国/g;
        const regions = [...new Set((match[1].match(regionPattern) || []).map(region => region === '全国' || region.endsWith('区') ? region : region + '区'))];
        if (regions.length) {
          const oldRegions = /(?:华东区?|华南区?|华北区?|华中区?|西南区?|西北区?|东北区?|全国)(?:[、和及与](?:华东区?|华南区?|华北区?|华中区?|西南区?|西北区?|东北区?|全国))*/;
          plan.draft.prompt = oldRegions.test(plan.draft.prompt) ? plan.draft.prompt.replace(oldRegions, regions.join('和')) : plan.draft.prompt.replace(/[。；]$/, '') + '；分析范围为' + regions.join('和') + '。';
        } else plan.errors.push('请通过编辑配置填写完整的分析范围和任务指令。');
        recognized = true;
      }
      for (const metric of ['同比', '环比']) {
        if (new RegExp('(?:增加|补充|加入|加上|包含)' + metric).test(text)) {
          const already = metric === '同比' ? /同比|去年同期/.test(plan.draft.prompt) : /环比|前一日/.test(plan.draft.prompt);
          if (!already) plan.draft.prompt = plan.draft.prompt.replace(/[。；]$/, '') + '，增加' + metric + '分析。';
          recognized = true;
        } else if (new RegExp('(?:取消|去掉|不需要|删除)' + metric).test(text)) {
          plan.draft.prompt = plan.draft.prompt.replace(new RegExp('(?:，?增加)?' + metric + '分析[。]?|(?:及|与)?' + (metric === '同比' ? '去年同期' : '前一日') + '(?:对比)?', 'g'), '').replace(/。$/, '') + '。'; recognized = true;
        }
      }
    }
    if (!recognized && !plan.errors.length) plan.errors.push('请明确要修改的配置和值，也可通过编辑配置核对后保存。');
    return finish(plan);
  }

  function confirm(plan, conversationId) {
    delete plan.confirmRequested;
    if (!['pending', 'invalid'].includes(plan.status)) return plan;
    const tasks = store.load(), index = tasks.findIndex(task => task.id === plan.taskId);
    if (index < 0) return Object.assign(plan, missing(plan.taskId));
    plan.errors = [...new Set((plan.errors || []).concat(validate(plan)))];
    if (plan.errors.length) { plan.status = 'invalid'; return plan; }
    const current = tasks[index];
    if (!equal(current, plan.base)) { plan.status = 'stale'; plan.reply = '任务配置已发生变化，请打开编辑配置读取最新内容，再核对保存。'; return plan; }
    if (!delta(plan).length) { plan.status = 'view'; plan.reply = '当前没有需要保存的修改。'; return plan; }
    const nextTask = Object.assign({}, current, configuration(plan.draft));
    const next = global.ScheduledTaskForm.nextRun(nextTask);
    nextTask.nextRun = nextTask.status === 'enabled' && next ? global.ScheduledTaskForm.dateTimeText(next) : '';
    const now = global.ScheduledTaskForm.dateTimeText(new Date());
    nextTask.configChanges = (current.configChanges || []).concat([{ id: token(), conversationId, source: '智能问数', createdAt: now, before: copy(plan.base), after: store.taskSnapshot(nextTask) }]);
    tasks[index] = nextTask; store.save(tasks);
    plan.status = 'saved'; plan.savedAt = now; plan.nextRun = nextTask.nextRun; plan.draft = store.taskSnapshot(nextTask);
    plan.reply = '任务配置已更新，将应用于后续执行。历史执行结果保持不变。';
    return plan;
  }
  function fromForm(taskId, draft, previous) {
    const task = getTask(taskId);
    if (!task) return missing(taskId);
    const plan = planFor(task, previous);
    Object.assign(plan.draft, configuration(draft));
    return finish(plan);
  }
  function recordTurn(task, record) {
    const configuration = record.taskSnapshot;
    return {
      ...(record.turn || {}), taskId: task.id, mode: record.turn?.mode || 'qa',
      question: record.turn?.question || configuration.prompt,
      sentAt: record.turn?.sentAt || record.startedAt.replace(' ', 'T') + ':00+08:00',
      context: record.turn?.context || { themes: [configuration.theme], references: [], attachments: [], followup: null },
      scheduledRecord: { taskId: task.id, name: configuration.name, status: record.status, trigger: record.trigger, startedAt: record.startedAt, duration: record.duration, summary: record.summary, error: record.error, hasAnswer: Boolean(record.turn) }
    };
  }
  function history(kind) {
    const task = getTask(kind === 'failed' ? 'task-weekday-customer' : 'task-sales-daily');
    const context = { themes: [task?.theme || '销售分析'], references: [], attachments: [], followup: null };
    if (!task) return [{ question: '查看关联定时任务', mode: 'scheduled', context, scheduledChange: missing(kind === 'failed' ? 'task-weekday-customer' : 'task-sales-daily') }];
    if (kind !== 'edit') return task.records.length ? [recordTurn(task, task.records.find(record => record.id === (kind === 'failed' ? 'run-customer-1' : 'run-sales-1')) || task.records[0])] : [];
    const change = task.configChanges?.find(item => item.id === 'sales-config-change-1');
    if (!change) return [{ question: '查看定时任务配置', taskId: task.id, mode: 'scheduled', context, scheduledChange: { ...planFor(task), status: 'view' } }];
    const first = copy(change.before); first.frequency = 'weekdays'; first.time = '08:30';
    return [
      ['把这个任务改为每个工作日早上 8:30 执行。', first, 'superseded', '已调整执行计划，尚未保存。'],
      ['分析范围改成华东和华南，增加同比分析。', change.after, 'superseded', '已累计调整执行计划和任务指令，等待确认。'],
      ['确认修改', change.after, 'saved', '任务配置已更新，将应用于后续执行。历史执行结果保持不变。']
    ].map((item, index) => ({ taskId: task.id, question: item[0], mode: 'scheduled', context: copy(context), sentAt: change.createdAt.replace(' ', 'T') + ':00+08:00', scheduledChange: { token: 'sales-config-history-' + index, taskId: task.id, base: copy(change.before), draft: copy(item[1]), status: item[2], reply: item[3], errors: [], round: index + 1, savedAt: index === 2 ? change.createdAt : '', nextRun: change.after.nextRun } }));
  }
  function render(container, plan) {
    if (!container || !plan) return;
    const labels = { pending: '待保存', invalid: '待补充', saved: '已保存', superseded: '后续已有更新', canceled: '已取消', view: '当前配置', missing: '任务不可用', stale: '待重新核对' };
    const rows = plan.base && plan.draft ? delta(plan) : [];
    let body = plan.reply ? '<p class="ic-intro">' + esc(plan.reply) + '</p>' : '';
    if (plan.draft) {
      body += '<p class="ic-note">关联任务：' + esc(plan.draft.name) + ' · ' + esc(plan.draft.theme) + '</p>';
      const entries = rows.length ? rows : [['任务名称', '', plan.draft.name], ['分析主题', '', plan.draft.theme], ['技能', '', plan.draft.skill || '通用问数'], ['任务指令', '', plan.draft.prompt], ['执行计划', '', global.ScheduledTaskForm.describeSchedule(plan.draft)]];
      body += '<ul class="ic-summary">' + entries.map(row => '<li><strong>' + esc(row[0]) + '：</strong>' + (rows.length ? '<span class="ic-before">' + esc(row[1]) + '</span><span aria-hidden="true"> → </span>' : '') + esc(row[2]) + '</li>').join('') + '</ul>';
    }
    if (plan.errors?.length) body += '<div class="ic-validation is-error" role="status">' + plan.errors.map(error => '<p>' + esc(error) + '</p>').join('') + '</div>';
    if (plan.status === 'pending') body += '<p class="ic-followup">本轮变更尚未保存，可继续补充调整；核对后点击【确认修改】或回复“确认修改”。</p>';
    if (plan.status === 'saved') body += '<p class="ic-validation" role="status">保存时间：' + esc(plan.savedAt) + ' · 下次执行：' + esc(plan.nextRun || (plan.draft.status === 'paused' ? '任务已暂停' : '任务已结束')) + '</p>';
    function button(action, label, icon, primary) { return '<button type="button" class="' + (primary ? 'primary-btn' : 'ghost-btn') + '" data-scheduled-action="' + action + '">' + icons[icon] + '<span>' + label + '</span></button>'; }
    let actions = '';
    if (plan.status === 'pending') actions += button('confirm', '确认修改', 'check', true);
    if (['pending', 'invalid'].includes(plan.status)) actions += button('cancel', '取消修改', 'close');
    container.classList.remove('hidden');
    container.dataset.scheduledToken = plan.token;
    container.innerHTML = '<header class="ic-head"><strong>' + icons.clock + '定时任务配置</strong><span class="ic-status is-' + esc(plan.status) + '">' + esc(labels[plan.status] || '') + '</span></header>' + body + (actions ? '<div class="scheduled-chat-actions">' + actions + '</div>' : '');
  }
  global.ScheduledTaskChat = { configure(options) { themes = [...new Set(themes.concat(options.themes || []))]; }, resolve, confirm, fromForm, history, recordTurn, render, equal };
})(window);
