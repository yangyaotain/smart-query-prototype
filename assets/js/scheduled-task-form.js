(function (global) {
  "use strict";

  const DEFAULT_THEMES = ["销售分析", "客户分析", "库存分析", "经营分析", "供应商管理", "采购分析"];
  const GENERAL_SKILL = global.SkillPicker.generalSkill;
  let current = null;
  let selectedSkillKey = "general";
  let skillItems = [];

  function pad(value) { return String(value).padStart(2, "0"); }
  function dateKey(date) { return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()); }
  function dateTimeText(date) { return dateKey(date) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes()); }
  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
  function uid() { return "task-" + Date.now() + "-" + Math.random().toString(16).slice(2, 8); }
  function combineDate(datePart, timePart) {
    if (!datePart) return null;
    const dateBits = datePart.split("-").map(Number);
    const timeBits = (timePart || "09:00").split(":").map(Number);
    return new Date(dateBits[0], dateBits[1] - 1, dateBits[2], timeBits[0], timeBits[1], 0, 0);
  }
  function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }

  function availableSkills() {
    const store = global.SkillCatalogStore;
    if (!store || typeof store.load !== "function") return [];
    return store.load().filter(function (item) { return item.enabled !== false && store.isReady(item); }).map(function (item, index) {
      return Object.assign({}, item, { pickerKey: String(item.id || item.code || index) });
    });
  }

  function ensureModal() {
    if (document.getElementById("scheduledTaskFormModal")) return;
    const root = document.createElement("div");
    root.id = "scheduledTaskFormRoot";
    root.innerHTML = [
      '<div id="scheduledTaskFormMask" class="schedule-form-mask hidden"></div>',
      '<section id="scheduledTaskFormModal" class="schedule-form-modal hidden" role="dialog" aria-modal="true" aria-labelledby="scheduledTaskFormTitle">',
      '<div class="schedule-form-head"><div><h2 id="scheduledTaskFormTitle">创建定时任务</h2><p>任务将按保存的内容和时间计划自动运行</p></div><button id="scheduledTaskFormClose" type="button" aria-label="关闭">×</button></div>',
      '<div class="schedule-form-body">',
      '<label class="schedule-form-field"><span>任务名称 <em>*</em></span><input id="stfName" maxlength="40" placeholder="请输入任务名称"/><small><b id="stfNameCount">0</b>/40</small></label>',
      '<div class="schedule-form-row">',
      '<label class="schedule-form-field"><span>分析主题 <em>*</em></span><select id="stfTheme"></select></label>',
      '<div class="schedule-form-field"><span>技能 <em>*</em></span>',
      '<div class="skill-select-wrap schedule-form-skill" id="stfSkillWrap">',
      '<button type="button" class="skill-select-trigger" id="stfSkillTrigger" aria-haspopup="dialog" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z"/><path d="M18.5 14l1 2.5L22 17.5l-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5z"/></svg><span id="stfSkillText">通用问数</span><svg class="skill-select-caret" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg></button>',
      '<div class="skill-picker hidden" id="stfSkillPicker"><div class="skill-picker-head"><div><strong>选择技能</strong><span>选择后插入技能标签和可修改的任务提示</span></div><span class="skill-picker-count" id="stfSkillCount">0 个技能</span></div><div class="skill-picker-list" id="stfSkillList"></div><div class="skill-picker-foot"><span>仅展示已启用且内容已确认的技能。</span></div></div>',
      '</div></div></div>',
      '<div class="schedule-form-field schedule-prompt-field"><span>任务指令 <em>*</em></span><div id="stfPrompt" class="schedule-prompt-editor" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="说明每次运行需要完成的分析，可包含业务范围、数据期间和输出要求"></div><small class="schedule-field-hint">业务范围、数据期间和输出要求统一写在任务指令中。</small></div>',
      '<div class="schedule-divider"></div>',
      '<div class="schedule-plan-title"><div><strong>执行计划</strong><span>参考 Codex 计划任务的自然语言频率设置</span></div><em>北京时间（UTC+8）</em></div>',
      '<div class="schedule-form-row schedule-plan-row"><label class="schedule-form-field"><span>频率 <em>*</em></span><select id="stfFrequency"><option value="once">仅执行一次</option><option value="hourly">每小时</option><option value="daily">每天</option><option value="weekdays">每个工作日</option><option value="weekly">每周</option><option value="monthly">每月</option><option value="custom">自定义</option></select></label><label id="stfTimeField" class="schedule-form-field"><span>执行时间 <em>*</em></span><input id="stfTime" type="time" value="09:00"/></label></div>',
      '<div id="stfOnceFields" class="schedule-form-row schedule-dynamic-row"><label class="schedule-form-field"><span>执行日期 <em>*</em></span><input id="stfOnceDate" type="date"/></label></div>',
      '<div id="stfHourlyFields" class="schedule-form-row schedule-dynamic-row hidden"><label class="schedule-form-field"><span>时间间隔 <em>*</em></span><select id="stfHourlyInterval"><option value="1">每 1 小时</option><option value="2">每 2 小时</option><option value="3">每 3 小时</option><option value="4">每 4 小时</option><option value="6">每 6 小时</option><option value="12">每 12 小时</option></select></label></div>',
      '<div id="stfWeekFields" class="schedule-dynamic-row hidden"><span class="schedule-dynamic-label">执行星期 <em>*</em></span><div class="week-options" id="stfWeekOptions"><label><input type="checkbox" value="1" checked/><b>一</b></label><label><input type="checkbox" value="2"/><b>二</b></label><label><input type="checkbox" value="3"/><b>三</b></label><label><input type="checkbox" value="4"/><b>四</b></label><label><input type="checkbox" value="5"/><b>五</b></label><label><input type="checkbox" value="6"/><b>六</b></label><label><input type="checkbox" value="0"/><b>日</b></label></div></div>',
      '<div id="stfMonthFields" class="schedule-form-row schedule-dynamic-row hidden"><label class="schedule-form-field"><span>每月执行日 <em>*</em></span><select id="stfMonthDay"></select><small class="schedule-field-hint">当月没有所选日期时，在当月最后一天执行。</small></label></div>',
      '<div id="stfCustomFields" class="schedule-form-row schedule-dynamic-row hidden"><label class="schedule-form-field"><span>重复间隔 <em>*</em></span><div class="schedule-custom-interval"><span>每</span><input id="stfCustomInterval" type="number" min="1" max="99" value="2"/><select id="stfCustomUnit"><option value="hour">小时</option><option value="day">天</option><option value="week">周</option><option value="month">月</option></select></div></label></div>',
      '<div class="schedule-next-run"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle><path d="M12 7v5l3 2"></path></svg><span id="stfScheduleSummary">请选择执行计划</span></div>',
      '</div>',
      '<div class="schedule-form-foot"><button id="stfCancel" class="ghost-btn" type="button">取消</button><button id="stfSave" class="primary-btn" type="button"><svg viewBox="0 0 24 24"><path d="M5 4h12l2 2v14H5z"></path><path d="M8 4v6h8V4"></path></svg><span>创建任务</span></button></div>',
      '</section>'
    ].join("");
    document.body.appendChild(root);
    document.getElementById("scheduledTaskFormMask").addEventListener("click", close);
    document.getElementById("scheduledTaskFormClose").addEventListener("click", close);
    document.getElementById("stfCancel").addEventListener("click", close);
    document.getElementById("stfSave").addEventListener("click", save);
    document.getElementById("stfName").addEventListener("input", updateNameCount);
    document.getElementById("stfFrequency").addEventListener("change", syncSchedule);
    ["stfTime", "stfOnceDate", "stfHourlyInterval", "stfMonthDay", "stfCustomInterval", "stfCustomUnit"].forEach(function (id) { document.getElementById(id).addEventListener("change", syncSchedule); });
    document.querySelectorAll("#stfWeekOptions input").forEach(function (input) { input.addEventListener("change", syncSchedule); });
    document.getElementById("stfSkillTrigger").addEventListener("click", toggleSkillPicker);
    document.getElementById("stfSkillList").addEventListener("click", function (event) {
      const option = event.target.closest("[data-skill]");
      if (option) selectSkill(option.dataset.skill);
    });
    document.getElementById("stfPrompt").addEventListener("input", syncPromptState);
    document.addEventListener("click", function (event) { if (!event.target.closest("#stfSkillWrap")) closeSkillPicker(); });
  }

  function initializeMonthDays() {
    const select = document.getElementById("stfMonthDay");
    if (select.options.length) return;
    select.innerHTML = Array.from({ length: 31 }, function (_, index) { return '<option value="' + (index + 1) + '">' + (index + 1) + " 日</option>"; }).join("") + '<option value="32">月末</option>';
  }

  function renderThemes(selected, extraThemes) {
    const themes = Array.from(new Set(DEFAULT_THEMES.concat(extraThemes || []).concat(selected ? [selected] : [])));
    const select = document.getElementById("stfTheme");
    select.innerHTML = themes.map(function (theme) { return '<option value="' + escapeHTML(theme) + '">' + escapeHTML(theme) + "</option>"; }).join("");
    select.value = selected || themes[0];
  }

  function renderSkillPicker() {
    global.SkillPicker.render({ container: document.getElementById("stfSkillList"), items: skillItems, selectedKey: selectedSkillKey, general: GENERAL_SKILL, ariaLabel: "定时任务可用技能" });
    document.getElementById("stfSkillCount").textContent = skillItems.length + " 个技能";
    const selected = selectedSkillKey === "general" ? GENERAL_SKILL : skillItems.find(function (item) { return item.pickerKey === selectedSkillKey; });
    document.getElementById("stfSkillText").textContent = selected ? selected.name : "通用问数";
    document.getElementById("stfSkillTrigger").classList.toggle("has-skill", selectedSkillKey !== "general");
  }

  function readPrompt() {
    const editor = document.getElementById("stfPrompt");
    return Array.from(editor.childNodes).map(function readNode(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
      if (node.nodeType !== Node.ELEMENT_NODE || node.matches("[data-skill-tag]")) return "";
      if (node.tagName === "BR") return "\n";
      return Array.from(node.childNodes).map(readNode).join("") + (/^(DIV|P)$/.test(node.tagName) ? "\n" : "");
    }).join("").replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }

  function skillTag(item) {
    const tag = document.createElement("span");
    tag.className = "composer-skill-tag"; tag.dataset.skillTag = item.pickerKey; tag.contentEditable = "false";
    tag.innerHTML = '<span>' + escapeHTML(item.name) + '</span><button type="button" class="composer-skill-remove" aria-label="取消技能">×</button>';
    tag.querySelector("button").addEventListener("click", function () { selectSkill("general"); });
    return tag;
  }

  function setPrompt(text) {
    const editor = document.getElementById("stfPrompt");
    editor.replaceChildren();
    const selected = skillItems.find(function (item) { return item.pickerKey === selectedSkillKey; });
    if (selected) editor.appendChild(skillTag(selected));
    if (text) editor.appendChild(document.createTextNode(text));
    syncPromptState();
  }
  function syncPromptState() { document.getElementById("stfPrompt").dataset.empty = String(!readPrompt()); }

  function selectSkill(key) {
    const previous = skillItems.find(function (item) { return item.pickerKey === selectedSkillKey; });
    const previousPrompt = readPrompt();
    selectedSkillKey = key === "general" || skillItems.some(function (item) { return item.pickerKey === key; }) ? key : "general";
    const selected = skillItems.find(function (item) { return item.pickerKey === selectedSkillKey; });
    const shouldReplace = !previousPrompt || (previous && previousPrompt === previous.userPrompt);
    setPrompt(shouldReplace && selected ? selected.userPrompt || "" : previousPrompt);
    renderSkillPicker(); closeSkillPicker();
  }
  function toggleSkillPicker(event) { event.stopPropagation(); const picker = document.getElementById("stfSkillPicker"); const open = picker.classList.contains("hidden"); picker.classList.toggle("hidden", !open); document.getElementById("stfSkillWrap").classList.toggle("is-open", open); document.getElementById("stfSkillTrigger").setAttribute("aria-expanded", String(open)); }
  function closeSkillPicker() { const picker = document.getElementById("stfSkillPicker"); if (!picker) return; picker.classList.add("hidden"); document.getElementById("stfSkillWrap").classList.remove("is-open"); document.getElementById("stfSkillTrigger").setAttribute("aria-expanded", "false"); }

  function scheduleValue() {
    return {
      frequency: document.getElementById("stfFrequency").value,
      time: document.getElementById("stfTime").value || "09:00",
      onceDate: document.getElementById("stfOnceDate").value,
      interval: Number(document.getElementById("stfFrequency").value === "hourly" ? document.getElementById("stfHourlyInterval").value : document.getElementById("stfCustomInterval").value) || 1,
      customUnit: document.getElementById("stfCustomUnit").value,
      weekDays: Array.from(document.querySelectorAll("#stfWeekOptions input:checked")).map(function (input) { return Number(input.value); }),
      monthDay: Number(document.getElementById("stfMonthDay").value || 1)
    };
  }

  function describeSchedule(task) {
    const weekNames = ["日", "一", "二", "三", "四", "五", "六"];
    if (task.frequency === "once") return (task.onceDate || "待选择日期") + " " + task.time;
    if (task.frequency === "hourly") return "每 " + (task.interval || 1) + " 小时";
    if (task.frequency === "daily") return "每天 " + task.time;
    if (task.frequency === "weekdays") return "每个工作日 " + task.time;
    if (task.frequency === "weekly") return "每周" + (task.weekDays || []).map(function (day) { return weekNames[day]; }).join("、") + " " + task.time;
    if (task.frequency === "monthly") return "每月" + (task.monthDay === 32 ? "月末" : task.monthDay + " 日") + " " + task.time;
    const unitNames = { hour: "小时", day: "天", week: "周", month: "月" };
    return "每 " + (task.interval || 1) + " " + unitNames[task.customUnit || "day"] + ((task.customUnit || "day") === "hour" ? "" : "，" + task.time);
  }

  function nextRun(task) {
    const now = new Date();
    if (task.frequency === "once") { const run = combineDate(task.onceDate, task.time); return run && run > now ? run : null; }
    if (task.frequency === "hourly" || (task.frequency === "custom" && task.customUnit === "hour")) return new Date(now.getTime() + (task.interval || 1) * 60 * 60 * 1000);
    for (let offset = 0; offset < 740; offset += 1) {
      const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, Number(task.time.split(":")[0]), Number(task.time.split(":")[1]));
      if (candidate <= now) continue;
      if (task.frequency === "daily" || (task.frequency === "custom" && task.customUnit === "day" && offset % (task.interval || 1) === 0)) return candidate;
      if (task.frequency === "weekdays" && candidate.getDay() >= 1 && candidate.getDay() <= 5) return candidate;
      if (task.frequency === "weekly" && task.weekDays.includes(candidate.getDay())) return candidate;
      if (task.frequency === "monthly") { const day = task.monthDay === 32 ? daysInMonth(candidate.getFullYear(), candidate.getMonth()) : Math.min(task.monthDay, daysInMonth(candidate.getFullYear(), candidate.getMonth())); if (candidate.getDate() === day) return candidate; }
      if (task.frequency === "custom" && task.customUnit === "week" && offset % (7 * (task.interval || 1)) === 0) return candidate;
      if (task.frequency === "custom" && task.customUnit === "month") { const months = (candidate.getFullYear() - now.getFullYear()) * 12 + candidate.getMonth() - now.getMonth(); if (months >= 0 && months % (task.interval || 1) === 0 && candidate.getDate() === Math.min(now.getDate(), daysInMonth(candidate.getFullYear(), candidate.getMonth()))) return candidate; }
    }
    return null;
  }

  function syncSchedule() {
    const value = scheduleValue();
    const customTime = value.frequency === "custom" && value.customUnit !== "hour";
    document.getElementById("stfTimeField").classList.toggle("hidden", value.frequency === "hourly" || (value.frequency === "custom" && !customTime));
    document.getElementById("stfOnceFields").classList.toggle("hidden", value.frequency !== "once");
    document.getElementById("stfHourlyFields").classList.toggle("hidden", value.frequency !== "hourly");
    document.getElementById("stfWeekFields").classList.toggle("hidden", value.frequency !== "weekly");
    document.getElementById("stfMonthFields").classList.toggle("hidden", value.frequency !== "monthly");
    document.getElementById("stfCustomFields").classList.toggle("hidden", value.frequency !== "custom");
    const next = nextRun(value);
    document.getElementById("stfScheduleSummary").textContent = describeSchedule(value) + (next ? " · 下次运行 " + dateTimeText(next).replace(/-/g, "/") : " · 请完善执行时间") + " · 北京时间";
  }

  function updateNameCount() { document.getElementById("stfNameCount").textContent = document.getElementById("stfName").value.length; }
  function populate(initial) {
    initializeMonthDays(); skillItems = availableSkills();
    document.getElementById("stfName").value = initial.name || "";
    renderThemes(initial.theme || "销售分析", current.themes);
    const matchedSkill = skillItems.find(function (item) { return item.id === initial.skillId || item.name === initial.skill; });
    selectedSkillKey = matchedSkill ? matchedSkill.pickerKey : "general";
    renderSkillPicker(); setPrompt(initial.prompt || "");
    document.getElementById("stfFrequency").value = initial.frequency || "daily";
    document.getElementById("stfTime").value = initial.time || "09:00";
    document.getElementById("stfOnceDate").value = initial.onceDate || dateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
    document.getElementById("stfHourlyInterval").value = String(initial.frequency === "hourly" ? initial.interval || 1 : 1);
    document.getElementById("stfCustomInterval").value = String(initial.interval || 2);
    document.getElementById("stfCustomUnit").value = initial.customUnit || "day";
    document.querySelectorAll("#stfWeekOptions input").forEach(function (input) { input.checked = (initial.weekDays || [1]).includes(Number(input.value)); });
    document.getElementById("stfMonthDay").value = String(initial.monthDay || 1);
    updateNameCount(); syncSchedule();
  }

  function save() {
    const initial = current.initial || {};
    const skill = skillItems.find(function (item) { return item.pickerKey === selectedSkillKey; });
    const task = Object.assign({}, initial, scheduleValue(), {
      id: initial.id || uid(), name: document.getElementById("stfName").value.trim(), theme: document.getElementById("stfTheme").value,
      skillId: skill ? skill.id : "", skill: skill ? skill.name : "", prompt: readPrompt(), status: initial.status || "enabled",
      records: initial.records || [], createdAt: initial.createdAt || dateTimeText(new Date())
    });
    if (!task.name) { global.showToast("请填写任务名称"); return; }
    if (!task.theme) { global.showToast("请选择分析主题"); return; }
    if (!task.prompt) { global.showToast("请填写任务指令"); return; }
    if (task.frequency === "once" && !task.onceDate) { global.showToast("请选择执行日期"); return; }
    if (task.frequency === "once" && !nextRun(task)) { global.showToast("单次任务的执行时间必须晚于当前时间"); return; }
    if (task.frequency === "weekly" && !task.weekDays.length) { global.showToast("请至少选择一个执行星期"); return; }
    const next = nextRun(task); task.nextRun = task.status === "enabled" && next ? dateTimeText(next) : "";
    const onSave = current.onSave; close(); if (typeof onSave === "function") onSave(task);
  }

  function close() {
    const modal = document.getElementById("scheduledTaskFormModal"); if (!modal) return;
    modal.classList.add("hidden"); document.getElementById("scheduledTaskFormMask").classList.add("hidden"); document.body.classList.remove("drawer-open"); closeSkillPicker(); current = null;
  }

  function open(options) {
    ensureModal();
    current = { mode: options && options.mode || "create", initial: Object.assign({}, options && options.initial || {}), themes: options && options.themes || [], onSave: options && options.onSave };
    populate(current.initial);
    const focusId = current.initial.prompt ? "stfName" : "stfPrompt";
    document.getElementById("scheduledTaskFormTitle").textContent = current.mode === "edit" ? "编辑定时任务" : "创建定时任务";
    document.querySelector("#stfSave span").textContent = current.mode === "edit" ? "保存" : "创建任务";
    document.getElementById("scheduledTaskFormMask").classList.remove("hidden"); document.getElementById("scheduledTaskFormModal").classList.remove("hidden"); document.body.classList.add("drawer-open");
    window.setTimeout(function () { document.getElementById(focusId)?.focus(); }, 0);
  }

  global.ScheduledTaskForm = { open: open, close: close, describeSchedule: describeSchedule, nextRun: nextRun, dateTimeText: dateTimeText };
})(window);
