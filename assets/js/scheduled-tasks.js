(function () {
  "use strict";

  const taskStore = window.ScheduledTaskStore;
  const THEMES = ["销售分析", "客户分析", "库存分析", "经营分析", "供应商管理", "采购分析"];
  const GENERAL_SKILL = window.SkillPicker.generalSkill;
  const SVG = {
    query: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2 2h14a2 2 0 0 1 2 2z"></path><path d="M8 9h8"></path><path d="M8 13h5"></path></svg>',
    skill: '<svg viewBox="0 0 24 24"><path d="M12 3l2.3 5.4L20 11l-5.7 2.3L12 19l-2.3-5.7L4 11l5.7-2.6L12 3z"></path></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M14 5l5 5"></path><path d="M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z"></path></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>',
    view: '<svg viewBox="0 0 24 24"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14"></path><path d="M16 5v14"></path></svg>',
    resume: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="M7 7l1 13h8l1-13"></path></svg>'
  };

  let tasks = [];
  let appliedKeyword = "";
  let currentTaskId = null;
  let workspaceBaseline = "";
  let workspaceHydrating = false;
  let workspaceDirty = false;
  let workspaceSkillKey = "general";
  let workspaceSkillItems = [];
  let currentWorkspaceTab = "config";
  let currentRecordPage = 1;
  let pendingConfirmAction = null;

  function pad(value) { return String(value).padStart(2, "0"); }
  function dateKey(date) { return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()); }
  function dateTimeText(date) { return dateKey(date) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes()); }
  function displayDateTime(value) { return value ? String(value).replace(/-/g, "/") : "—"; }
  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
  function uid(prefix) { return (prefix || "id") + "-" + Date.now() + "-" + Math.random().toString(16).slice(2, 8); }
  function latestRecord(task) { return task.records && task.records.length ? task.records[0] : null; }
  function statusLabel(status) { return { enabled: "已启用", paused: "已暂停", ended: "已结束" }[status] || status; }
  function resultLabel(status) { return { success: "成功", failed: "失败", running: "执行中", skipped: "已跳过", none: "尚未执行" }[status] || status; }
  function skillLabel(task) { return task.skill || "通用问数"; }
  function scheduleLabel(task) { return window.ScheduledTaskForm.describeSchedule(task); }

  function loadTasks() { tasks = taskStore.load(); }
  function saveTasks() { taskStore.save(tasks); }
  function getTask(id) { return tasks.find(function (task) { return task.id === id; }); }

  function renderOverview() {
    const records = tasks.reduce(function (all, task) { return all.concat(task.records || []); }, []);
    document.getElementById("overviewEnabled").textContent = tasks.filter(function (task) { return task.status === "enabled"; }).length;
    document.getElementById("overviewSuccess").textContent = records.filter(function (record) { return record.status === "success"; }).length;
    document.getElementById("overviewFailed").textContent = records.filter(function (record) { return record.status === "failed"; }).length;
    document.getElementById("overviewPending").textContent = tasks.filter(function (task) { return task.status === "enabled" && task.nextRun && task.nextRun.slice(0, 10) === dateKey(new Date()); }).length;
  }

  window.renderTaskList = function () {
    const keyword = appliedKeyword;
    const type = document.getElementById("taskTypeFilter").value;
    const status = document.getElementById("taskStatusFilter").value;
    const result = document.getElementById("taskResultFilter").value;
    const filtered = tasks.filter(function (task) {
      const latest = latestRecord(task);
      const taskType = task.skill ? "skill" : "general";
      return (!keyword || [task.name, task.prompt].some((text) => String(text ?? "").toLowerCase().includes(keyword))) &&
        (type === "all" || taskType === type) &&
        (status === "all" || task.status === status) &&
        (result === "all" || (latest ? latest.status : "none") === result);
    });
    document.getElementById("taskTableBody").innerHTML = filtered.map(function (task) {
      const latest = latestRecord(task);
      const latestStatus = latest ? latest.status : "none";
      const isSkill = !!task.skill;
      const nextText = task.status === "paused" ? "已暂停调度" : task.status === "ended" ? "任务已结束" : displayDateTime(task.nextRun);
      return '<tr><td><div class="task-name-cell"><span class="task-type-icon ' + (isSkill ? "skill" : "") + '">' + SVG[isSkill ? "skill" : "query"] + '</span><div class="task-name-copy"><button type="button" onclick="openTaskWorkspace(\'' + task.id + '\')" title="' + escapeHTML(task.name) + '">' + keywordHighlight.html(task.name, keyword) + '</button><span title="' + escapeHTML(task.prompt) + '">' + keywordHighlight.excerptHTML(task.prompt, keyword, 32) + "</span></div></div></td>" +
        "<td><strong>" + escapeHTML(task.theme) + '</strong><span class="cell-secondary">' + escapeHTML(skillLabel(task)) + "</span></td>" +
        '<td><div class="task-plan"><strong>' + escapeHTML(scheduleLabel(task)) + '</strong><span class="cell-secondary">北京时间</span></div></td>' +
        '<td><span class="task-badge ' + task.status + '">' + statusLabel(task.status) + "</span></td><td><strong>" + escapeHTML(nextText) + "</strong></td>" +
        '<td><div class="task-last"><strong>' + (latest ? displayDateTime(latest.startedAt) : "—") + '</strong><span class="last-result ' + latestStatus + '">' + resultLabel(latestStatus) + "</span></div></td>" +
        '<td><div class="task-row-actions"><button class="task-row-action" type="button" onclick="trialTask(\'' + task.id + '\')">' + SVG.play + '<span>试运行</span></button><button class="task-row-action" type="button" onclick="openTaskWorkspace(\'' + task.id + '\')">' + SVG.view + '<span>查看</span></button><button class="task-row-action" type="button" onclick="openTaskWorkspace(\'' + task.id + '\')">' + SVG.edit + '<span>编辑</span></button>' + (task.status === "ended" ? "" : '<button class="task-row-action" type="button" onclick="toggleTaskStatus(\'' + task.id + '\')">' + (task.status === "enabled" ? SVG.pause + "<span>暂停</span>" : SVG.resume + "<span>恢复</span>") + "</button>") + '<button class="task-row-action danger" type="button" onclick="confirmDeleteTask(\'' + task.id + '\')">' + SVG.trash + '<span>删除</span></button></div></td></tr>';
    }).join("");
    document.getElementById("taskEmpty").classList.toggle("hidden", filtered.length > 0);
    document.getElementById("taskCountText").textContent = "共 " + filtered.length + " 条任务";
    renderOverview();
  };

  window.resetTaskFilters = function () {
    document.getElementById("taskKeyword").value = "";
    ["taskTypeFilter", "taskStatusFilter", "taskResultFilter"].forEach(function (id) { document.getElementById(id).value = "all"; });
    applyTaskQuery();
  };

  function applyTaskQuery() {
    appliedKeyword = document.getElementById("taskKeyword").value.trim().toLowerCase();
    window.renderTaskList();
  }

  function availableSkills() {
    const store = window.SkillCatalogStore;
    if (!store || typeof store.load !== "function") return [];
    return store.load().filter(function (item) {
      return item.enabled !== false && store.isReady(item);
    }).map(function (item, index) {
      return Object.assign({}, item, { pickerKey: String(item.id || item.code || index) });
    });
  }

  function initializeWorkspaceOptions() {
    document.getElementById("taskTheme").innerHTML = THEMES.map(function (theme) {
      return '<option value="' + escapeHTML(theme) + '">' + escapeHTML(theme) + "</option>";
    }).join("");
    const monthDay = document.getElementById("taskMonthDay");
    if (!monthDay.options.length) {
      monthDay.innerHTML = Array.from({ length: 31 }, function (_, index) {
        return '<option value="' + (index + 1) + '">' + (index + 1) + " 日</option>";
      }).join("") + '<option value="32">月末</option>';
    }
  }

  function renderWorkspaceSkillPicker() {
    window.SkillPicker.render({
      container: document.getElementById("workspaceSkillList"),
      items: workspaceSkillItems,
      selectedKey: workspaceSkillKey,
      general: GENERAL_SKILL,
      ariaLabel: "定时任务可用技能"
    });
    document.getElementById("workspaceSkillCount").textContent = workspaceSkillItems.length + " 个技能";
    const selected = workspaceSkillKey === "general" ? GENERAL_SKILL : workspaceSkillItems.find(function (item) { return item.pickerKey === workspaceSkillKey; });
    document.getElementById("workspaceSkillText").textContent = selected ? selected.name : GENERAL_SKILL.name;
    document.getElementById("workspaceSkillTrigger").classList.toggle("has-skill", workspaceSkillKey !== "general");
  }

  function readWorkspacePrompt() {
    const editor = document.getElementById("taskPrompt");
    return Array.from(editor.childNodes).map(function readNode(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
      if (node.nodeType !== Node.ELEMENT_NODE || node.matches("[data-skill-tag]")) return "";
      if (node.tagName === "BR") return "\n";
      return Array.from(node.childNodes).map(readNode).join("") + (/^(DIV|P)$/.test(node.tagName) ? "\n" : "");
    }).join("").replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }

  function createWorkspaceSkillTag(item) {
    const tag = document.createElement("span");
    tag.className = "composer-skill-tag";
    tag.dataset.skillTag = item.pickerKey;
    tag.contentEditable = "false";
    tag.innerHTML = "<span>" + escapeHTML(item.name) + '</span><button type="button" class="composer-skill-remove" aria-label="取消技能">×</button>';
    tag.querySelector("button").addEventListener("click", function () { selectWorkspaceSkill("general"); });
    return tag;
  }

  function setWorkspacePrompt(text) {
    const editor = document.getElementById("taskPrompt");
    editor.replaceChildren();
    const selected = workspaceSkillItems.find(function (item) { return item.pickerKey === workspaceSkillKey; });
    if (selected) editor.appendChild(createWorkspaceSkillTag(selected));
    if (text) editor.appendChild(document.createTextNode(text));
    editor.dataset.empty = String(!readWorkspacePrompt());
  }

  function closeWorkspaceSkillPicker() {
    document.getElementById("workspaceSkillPicker").classList.add("hidden");
    document.getElementById("workspaceSkillWrap").classList.remove("is-open");
    document.getElementById("workspaceSkillTrigger").setAttribute("aria-expanded", "false");
  }

  function toggleWorkspaceSkillPicker(event) {
    event.stopPropagation();
    const picker = document.getElementById("workspaceSkillPicker");
    const open = picker.classList.contains("hidden");
    picker.classList.toggle("hidden", !open);
    document.getElementById("workspaceSkillWrap").classList.toggle("is-open", open);
    document.getElementById("workspaceSkillTrigger").setAttribute("aria-expanded", String(open));
  }

  function selectWorkspaceSkill(key) {
    const previous = workspaceSkillItems.find(function (item) { return item.pickerKey === workspaceSkillKey; });
    const previousPrompt = readWorkspacePrompt();
    workspaceSkillKey = key === "general" || workspaceSkillItems.some(function (item) { return item.pickerKey === key; }) ? key : "general";
    const selected = workspaceSkillItems.find(function (item) { return item.pickerKey === workspaceSkillKey; });
    const shouldReplace = !previousPrompt || (previous && previousPrompt === previous.userPrompt);
    setWorkspacePrompt(shouldReplace && selected ? selected.userPrompt || "" : previousPrompt);
    renderWorkspaceSkillPicker();
    syncWorkspaceTypeIcon();
    closeWorkspaceSkillPicker();
    markWorkspaceDirty();
  }

  function workspaceScheduleValue() {
    const frequency = document.getElementById("taskFrequency").value;
    return {
      frequency: frequency,
      time: document.getElementById("taskTime").value || "09:00",
      onceDate: document.getElementById("taskOnceDate").value,
      interval: Number(frequency === "hourly" ? document.getElementById("taskHourlyInterval").value : document.getElementById("taskCustomInterval").value) || 1,
      customUnit: document.getElementById("taskCustomUnit").value,
      weekDays: Array.from(document.querySelectorAll("#taskWeekOptions input:checked")).map(function (input) { return Number(input.value); }),
      monthDay: Number(document.getElementById("taskMonthDay").value || 1)
    };
  }

  function syncWorkspaceSchedule() {
    const value = workspaceScheduleValue();
    const customTime = value.frequency === "custom" && value.customUnit !== "hour";
    document.getElementById("taskTimeField").classList.toggle("hidden", value.frequency === "hourly" || (value.frequency === "custom" && !customTime));
    document.getElementById("taskOnceFields").classList.toggle("hidden", value.frequency !== "once");
    document.getElementById("taskHourlyFields").classList.toggle("hidden", value.frequency !== "hourly");
    document.getElementById("taskWeekFields").classList.toggle("hidden", value.frequency !== "weekly");
    document.getElementById("taskMonthFields").classList.toggle("hidden", value.frequency !== "monthly");
    document.getElementById("taskCustomFields").classList.toggle("hidden", value.frequency !== "custom");
    const next = window.ScheduledTaskForm.nextRun(value);
    document.getElementById("taskScheduleSummary").textContent = window.ScheduledTaskForm.describeSchedule(value) + (next ? " · 下次运行 " + displayDateTime(window.ScheduledTaskForm.dateTimeText(next)) : " · 请完善执行时间") + " · 北京时间";
    markWorkspaceDirty();
  }

  function workspaceValue() {
    const skill = workspaceSkillItems.find(function (item) { return item.pickerKey === workspaceSkillKey; });
    return Object.assign({}, workspaceScheduleValue(), {
      name: document.getElementById("taskName").value.trim(),
      theme: document.getElementById("taskTheme").value,
      skillId: skill ? skill.id : "",
      skill: skill ? skill.name : "",
      prompt: readWorkspacePrompt()
    });
  }

  function workspaceFingerprint() { return JSON.stringify(workspaceValue()); }

  function updateWorkspaceDirtyState(dirty) {
    workspaceDirty = dirty;
    const isNew = !currentTaskId;
    const save = document.getElementById("workspaceSaveBtn");
    const reset = document.getElementById("workspaceResetBtn");
    save.disabled = !isNew && !dirty;
    save.classList.toggle("is-disabled", !isNew && !dirty);
    reset.classList.toggle("hidden", isNew || !dirty);
    if (!isNew) document.getElementById("workspaceSubtitle").textContent = dirty ? "配置已有修改，保存后将应用于后续运行。" : "任务配置与执行记录集中展示，可直接修改并保存。";
  }

  function markWorkspaceDirty() {
    if (workspaceHydrating) return;
    const isNew = !currentTaskId;
    updateWorkspaceDirtyState(isNew || workspaceFingerprint() !== workspaceBaseline);
    const typedName = document.getElementById("taskName").value.trim();
    document.getElementById("workspaceTitle").textContent = typedName || (isNew ? "新建定时任务" : "未命名任务");
    document.getElementById("taskNameCount").textContent = document.getElementById("taskName").value.length;
    document.getElementById("taskPrompt").dataset.empty = String(!readWorkspacePrompt());
  }

  function renderWorkspaceSummary(task) {
    const latest = task ? latestRecord(task) : null;
    document.getElementById("summaryStatus").textContent = task ? statusLabel(task.status) : "尚未创建";
    document.getElementById("summaryNextRun").textContent = task ? (task.nextRun ? displayDateTime(task.nextRun) : task.status === "paused" ? "已暂停调度" : "暂无后续计划") : "保存后计算";
    document.getElementById("summaryLatestRun").textContent = latest ? displayDateTime(latest.startedAt) + " · " + resultLabel(latest.status) : "尚未执行";
    document.getElementById("summaryCreatedAt").textContent = task ? displayDateTime(task.createdAt) : "保存后生成";
  }

  function syncWorkspaceTypeIcon() {
    const isSkill = workspaceSkillKey !== "general";
    const typeIcon = document.getElementById("workspaceTypeIcon");
    typeIcon.className = "detail-type-icon " + (isSkill ? "skill" : "");
    typeIcon.innerHTML = SVG[isSkill ? "skill" : "query"];
  }

  function renderWorkspaceHeader(task) {
    const isNew = !task;
    syncWorkspaceTypeIcon();
    document.getElementById("workspaceTitle").textContent = task?.name || "新建定时任务";
    const status = document.getElementById("workspaceStatus");
    status.className = "task-badge " + (task?.status || "enabled") + (isNew ? " hidden" : "");
    status.textContent = task ? statusLabel(task.status) : "";
    ["workspaceDeleteBtn", "workspaceTrialBtn"].forEach(function (id) { document.getElementById(id).classList.toggle("hidden", isNew); });
    const toggle = document.getElementById("workspaceToggleBtn");
    toggle.classList.toggle("hidden", isNew || task?.status === "ended");
    if (!isNew && task.status !== "ended") {
      toggle.innerHTML = task.status === "enabled" ? SVG.pause + "<span>暂停任务</span>" : SVG.resume + "<span>恢复任务</span>";
    }
    const recordsTab = document.getElementById("taskRecordsTab");
    recordsTab.disabled = isNew;
    recordsTab.classList.toggle("is-disabled", isNew);
    recordsTab.title = isNew ? "创建任务后可查看执行记录" : "查看执行记录";
    document.querySelector("#workspaceSaveBtn span").textContent = isNew ? "创建任务" : "保存修改";
  }

  function renderRecords(task) {
    const records = task?.records || [];
    document.getElementById("detailRecordCount").textContent = records.length;
    const status = document.getElementById("recordStatusFilter").value;
    const trigger = document.getElementById("recordTriggerFilter").value;
    const startDate = document.getElementById("recordStartDate").value;
    const endDate = document.getElementById("recordEndDate").value;
    const filtered = records.filter(function (record) {
      const recordDate = String(record.startedAt || "").slice(0, 10);
      return (status === "all" || record.status === status) &&
        (trigger === "all" || record.trigger === trigger) &&
        (!startDate || recordDate >= startDate) &&
        (!endDate || recordDate <= endDate);
    });
    const pageSize = Number(document.getElementById("recordPageSize").value || 10);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    currentRecordPage = Math.min(Math.max(currentRecordPage, 1), totalPages);
    const pageRecords = filtered.slice((currentRecordPage - 1) * pageSize, currentRecordPage * pageSize);

    document.getElementById("recordTableBody").innerHTML = pageRecords.map(function (record) {
      const resultText = record.error || record.summary || (record.status === "running" ? "正在新的智能问数会话中执行任务。" : "本次运行没有生成结果。");
      return '<tr><td><strong>' + escapeHTML(displayDateTime(record.startedAt)) + '</strong></td><td>' + escapeHTML(record.trigger) + '</td><td><span class="record-status ' + record.status + '">' + resultLabel(record.status) + '</span></td><td>' + escapeHTML(record.duration || "—") + '</td><td><p title="' + escapeHTML(resultText) + '">' + escapeHTML(resultText) + '</p></td><td><button type="button" onclick="openTaskRecordConversation(\'' + task.id + "','" + record.id + '\')">' + SVG.query + "<span>打开会话</span>" + "</button></td></tr>";
    }).join("");
    document.getElementById("recordEmpty").classList.toggle("hidden", filtered.length > 0);
    document.querySelector(".record-table").classList.toggle("hidden", filtered.length === 0);
    document.getElementById("recordCountText").textContent = "共 " + filtered.length + " 条记录";
    document.getElementById("recordPrevBtn").disabled = currentRecordPage <= 1;
    document.getElementById("recordNextBtn").disabled = currentRecordPage >= totalPages;
    document.getElementById("recordPageNumbers").innerHTML = Array.from({ length: totalPages }, function (_, index) {
      const page = index + 1;
      return '<button type="button" class="' + (page === currentRecordPage ? "active" : "") + '" onclick="goToRecordPage(' + page + ')">' + page + "</button>";
    }).join("");
  }

  function clearRecordFilters() {
    document.getElementById("recordStatusFilter").value = "all";
    document.getElementById("recordTriggerFilter").value = "all";
    document.getElementById("recordStartDate").value = "";
    document.getElementById("recordEndDate").value = "";
    currentRecordPage = 1;
  }

  window.resetRecordFilters = function () {
    clearRecordFilters();
    renderRecords(getTask(currentTaskId));
  };

  window.changeRecordPage = function (offset) {
    currentRecordPage += Number(offset) || 0;
    renderRecords(getTask(currentTaskId));
  };

  window.goToRecordPage = function (page) {
    currentRecordPage = Number(page) || 1;
    renderRecords(getTask(currentTaskId));
  };

  window.switchWorkspaceTab = function (tab) {
    if (tab === "records" && !currentTaskId) return;
    currentWorkspaceTab = tab === "records" ? "records" : "config";
    const records = currentWorkspaceTab === "records";
    const configTab = document.getElementById("taskConfigTab");
    const recordsTab = document.getElementById("taskRecordsTab");
    configTab.classList.toggle("active", !records);
    recordsTab.classList.toggle("active", records);
    configTab.setAttribute("aria-selected", String(!records));
    recordsTab.setAttribute("aria-selected", String(records));
    document.getElementById("taskConfigPanel").classList.toggle("hidden", records);
    document.getElementById("taskRecordsPanel").classList.toggle("hidden", !records);
    if (records) renderRecords(getTask(currentTaskId));
  };

  function populateWorkspace(task) {
    workspaceHydrating = true;
    currentTaskId = task?.id || null;
    workspaceSkillItems = availableSkills();
    const initial = task || { name: "", theme: "销售分析", skillId: "", skill: "", prompt: "", frequency: "daily", time: "09:00", onceDate: dateKey(new Date(Date.now() + 86400000)), interval: 2, customUnit: "day", weekDays: [1], monthDay: 1 };
    document.getElementById("taskName").value = initial.name || "";
    if (!THEMES.includes(initial.theme)) {
      const option = document.createElement("option");
      option.value = initial.theme;
      option.textContent = initial.theme;
      document.getElementById("taskTheme").appendChild(option);
    }
    document.getElementById("taskTheme").value = initial.theme || "销售分析";
    const matchedSkill = workspaceSkillItems.find(function (item) { return item.id === initial.skillId || item.name === initial.skill; });
    workspaceSkillKey = matchedSkill ? matchedSkill.pickerKey : "general";
    renderWorkspaceSkillPicker();
    setWorkspacePrompt(initial.prompt || "");
    document.getElementById("taskFrequency").value = initial.frequency || "daily";
    document.getElementById("taskTime").value = initial.time || "09:00";
    document.getElementById("taskOnceDate").value = initial.onceDate || dateKey(new Date(Date.now() + 86400000));
    document.getElementById("taskHourlyInterval").value = String(initial.frequency === "hourly" ? initial.interval || 1 : 1);
    document.getElementById("taskCustomInterval").value = String(initial.frequency === "custom" ? initial.interval || 2 : 2);
    document.getElementById("taskCustomUnit").value = initial.customUnit || "day";
    document.querySelectorAll("#taskWeekOptions input").forEach(function (input) { input.checked = (initial.weekDays || [1]).includes(Number(input.value)); });
    document.getElementById("taskMonthDay").value = String(initial.monthDay || 1);
    document.getElementById("taskNameCount").textContent = (initial.name || "").length;
    syncWorkspaceSchedule();
    renderWorkspaceHeader(task);
    renderWorkspaceSummary(task);
    renderRecords(task);
    workspaceHydrating = false;
    workspaceBaseline = workspaceFingerprint();
    updateWorkspaceDirtyState(!task);
  }

  window.openNewTask = function () {
    clearRecordFilters();
    populateWorkspace(null);
    window.switchWorkspaceTab("config");
    document.getElementById("taskListView").classList.add("hidden");
    document.getElementById("taskWorkspaceView").classList.remove("hidden");
    window.scrollTo(0, 0);
    document.getElementById("taskName").focus();
  };

  window.openTaskWorkspace = function (taskId) {
    const task = getTask(taskId);
    if (!task) return;
    clearRecordFilters();
    populateWorkspace(task);
    window.switchWorkspaceTab("config");
    document.getElementById("taskListView").classList.add("hidden");
    document.getElementById("taskWorkspaceView").classList.remove("hidden");
    window.scrollTo(0, 0);
  };

  window.closeTaskWorkspace = function () {
    currentTaskId = null;
    workspaceBaseline = "";
    workspaceDirty = false;
    closeWorkspaceSkillPicker();
    document.getElementById("taskWorkspaceView").classList.add("hidden");
    document.getElementById("taskListView").classList.remove("hidden");
    window.renderTaskList();
    window.scrollTo(0, 0);
  };

  window.resetWorkspaceChanges = function () {
    const task = getTask(currentTaskId);
    if (!task) return;
    populateWorkspace(task);
    showToast("已取消未保存的修改");
  };

  window.saveTaskWorkspace = function () {
    const value = workspaceValue();
    if (!value.name) { showToast("请填写任务名称"); document.getElementById("taskName").focus(); return; }
    if (!value.theme) { showToast("请选择分析主题"); return; }
    if (!value.prompt) { showToast("请填写任务指令"); document.getElementById("taskPrompt").focus(); return; }
    if (value.frequency === "once" && !value.onceDate) { showToast("请选择执行日期"); return; }
    if (value.frequency === "once" && !window.ScheduledTaskForm.nextRun(value)) { showToast("单次任务的执行时间必须晚于当前时间"); return; }
    if (value.frequency === "weekly" && !value.weekDays.length) { showToast("请至少选择一个执行星期"); return; }

    const existing = getTask(currentTaskId);
    const task = Object.assign({}, existing || {}, value, {
      id: existing?.id || uid("task"),
      status: existing?.status || "enabled",
      records: existing?.records || [],
      createdAt: existing?.createdAt || dateTimeText(new Date())
    });
    const next = window.ScheduledTaskForm.nextRun(task);
    task.nextRun = task.status === "enabled" && next ? window.ScheduledTaskForm.dateTimeText(next) : "";
    if (existing) tasks[tasks.findIndex(function (item) { return item.id === existing.id; })] = task;
    else tasks.unshift(task);
    saveTasks();
    populateWorkspace(task);
    showToast(existing ? "任务配置已保存" : "定时任务已创建");
  };

  function skillAvailable(task) {
    if (!task.skill) return true;
    const store = window.SkillCatalogStore;
    return !!store && store.load().some(function (item) {
      return (item.id === task.skillId || item.name === task.skill) && item.enabled !== false && store.isReady(item);
    });
  }

  window.trialTask = function (taskId) {
    const task = getTask(taskId);
    if (!task) return;
    if (!skillAvailable(task)) { showToast("当前技能已停用或存在待确认内容，请先修改任务"); return; }
    const record = { id: uid("trial"), trigger: "试运行", status: "running", plannedAt: dateTimeText(new Date()), startedAt: dateTimeText(new Date()), endedAt: "", duration: "执行中", conversationId: uid("conversation"), taskSnapshot: taskStore.taskSnapshot(task) };
    task.records = task.records || [];
    task.records.unshift(record);
    saveTasks();
    taskStore.send({ mode: "trial", taskId: task.id, recordId: record.id, conversationId: record.conversationId, ...record.taskSnapshot });
    goTo("smart-query.html");
  };

  window.trialCurrentTask = function () {
    if (!currentTaskId) return;
    if (workspaceDirty) { showToast("请先保存当前修改，再进行试运行"); return; }
    window.trialTask(currentTaskId);
  };

  window.toggleTaskStatus = function (taskId) {
    const task = getTask(taskId);
    if (!task || task.status === "ended") return;
    const resume = task.status !== "enabled";
    openTaskConfirm({
      title: resume ? "确认恢复任务？" : "确认暂停任务？",
      text: resume
        ? "恢复“" + task.name + "”后，将按原执行计划继续自动调度。"
        : "暂停“" + task.name + "”后，将停止后续自动调度，已有执行记录不受影响。",
      actionText: resume ? "确认恢复" : "确认暂停",
      actionClass: resume ? "primary-btn" : "danger-btn",
      action: function () {
        task.status = resume ? "enabled" : "paused";
        const next = window.ScheduledTaskForm.nextRun(task);
        task.nextRun = task.status === "enabled" && next ? window.ScheduledTaskForm.dateTimeText(next) : "";
        saveTasks();
        window.closeTaskConfirm();
        window.renderTaskList();
        if (currentTaskId === task.id) populateWorkspace(task);
        showToast(task.status === "enabled" ? "任务已恢复" : "任务已暂停");
      }
    });
  };

  window.toggleCurrentTaskStatus = function () {
    if (!currentTaskId) return;
    if (workspaceDirty) { showToast("请先保存当前修改，再调整任务状态"); return; }
    window.toggleTaskStatus(currentTaskId);
  };

  function openTaskConfirm(options) {
    document.getElementById("confirmTitle").textContent = options.title;
    document.getElementById("confirmText").textContent = options.text;
    const actionButton = document.getElementById("confirmActionBtn");
    actionButton.textContent = options.actionText;
    actionButton.className = options.actionClass || "primary-btn";
    pendingConfirmAction = options.action;
    actionButton.onclick = function () { if (pendingConfirmAction) pendingConfirmAction(); };
    document.getElementById("confirmMask").classList.remove("hidden");
    document.getElementById("confirmModal").classList.remove("hidden");
  }

  window.confirmDeleteTask = function (taskId) {
    const task = getTask(taskId);
    if (!task) return;
    openTaskConfirm({
      title: "确认删除任务？",
      text: "删除“" + task.name + "”后将停止后续调度并移除执行记录。",
      actionText: "确认删除",
      actionClass: "danger-btn",
      action: function () {
      tasks = tasks.filter(function (item) { return item.id !== taskId; });
      saveTasks();
      window.closeTaskConfirm();
      if (currentTaskId === taskId) window.closeTaskWorkspace();
      else window.renderTaskList();
      showToast("任务已删除");
      }
    });
  };

  window.deleteCurrentTask = function () { if (currentTaskId) window.confirmDeleteTask(currentTaskId); };
  window.closeTaskConfirm = function () {
    pendingConfirmAction = null;
    document.getElementById("confirmMask").classList.add("hidden");
    document.getElementById("confirmModal").classList.add("hidden");
  };

  window.openTaskRecordConversation = function (taskId, recordId) {
    const task = getTask(taskId);
    const record = task && (task.records || []).find(function (item) { return item.id === recordId; });
    if (!task || !record) return;
    taskStore.send({
      ...record.taskSnapshot,
      mode: "record", taskId: task.id, recordId: record.id,
      conversationId: record.conversationId, record: record
    });
    goTo("smart-query.html");
  };

  function bindEvents() {
    ["taskTypeFilter", "taskStatusFilter", "taskResultFilter"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", applyTaskQuery);
    });
    document.getElementById("taskQuery").addEventListener("click", applyTaskQuery);
    document.getElementById("taskKeyword").addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.isComposing) applyTaskQuery();
    });
    document.getElementById("workspaceSkillTrigger").addEventListener("click", toggleWorkspaceSkillPicker);
    document.getElementById("workspaceSkillList").addEventListener("click", function (event) {
      const option = event.target.closest("[data-skill]");
      if (option) selectWorkspaceSkill(option.dataset.skill);
    });
    document.getElementById("taskName").addEventListener("input", markWorkspaceDirty);
    document.getElementById("taskPrompt").addEventListener("input", markWorkspaceDirty);
    document.getElementById("taskTheme").addEventListener("change", markWorkspaceDirty);
    ["recordStatusFilter", "recordTriggerFilter", "recordStartDate", "recordEndDate"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", function () {
        currentRecordPage = 1;
        renderRecords(getTask(currentTaskId));
      });
    });
    document.getElementById("recordPageSize").addEventListener("change", function () {
      currentRecordPage = 1;
      renderRecords(getTask(currentTaskId));
    });
    ["taskFrequency", "taskTime", "taskOnceDate", "taskHourlyInterval", "taskMonthDay", "taskCustomInterval", "taskCustomUnit"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", syncWorkspaceSchedule);
    });
    document.querySelectorAll("#taskWeekOptions input").forEach(function (input) { input.addEventListener("change", syncWorkspaceSchedule); });
    document.addEventListener("click", function (event) {
      if (!event.target.closest("#workspaceSkillWrap")) closeWorkspaceSkillPicker();
    });
  }

  function init() {
    initializeWorkspaceOptions();
    loadTasks();
    bindEvents();
    window.renderTaskList();
  }

  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    loadTasks();
    window.renderTaskList();
    if (currentTaskId) {
      const task = getTask(currentTaskId);
      if (!task) window.closeTaskWorkspace();
      else if (!workspaceDirty) {
        populateWorkspace(task);
        window.switchWorkspaceTab(currentWorkspaceTab);
      }
    }
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
