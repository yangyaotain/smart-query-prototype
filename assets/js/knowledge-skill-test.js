(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const Store = window.SkillCatalogStore;
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("id");
  const THINKING_STEPS = [
    ["识别报告需求", "识别月度采购快报的报告期间、采购主体范围和输出重点。"],
    ["匹配数据口径", "对齐成交、节资、采购三率、供应商、采购效能和闲废处置口径。"],
    ["关联采购数据", "关联华润守正采购交易平台中的授权采购数据和指标维度。"],
    ["生成报告正文", "生成指标仪表盘、主体分布、核心发现、业务分析和明细表格。"],
    ["格式化与校对", "校验金额、比例、项目数和统计期间，输出 Web 端报告结果。"]
  ];
  const OPTIMIZATION_THINKING_STEPS = [
    ["读取上轮结果", "继承上一轮报告正文、指标口径和已确认的分析上下文。"],
    ["识别优化要求", "定位本轮需要调整的章节、分析重点、表达方式或展示结构。"],
    ["校验影响范围", "确认调整不会改变无关指标、统计期间和数据权限边界。"],
    ["更新报告内容", "基于本轮要求生成新的 Web 端报告结果，并保留可追溯对话。"],
    ["复核优化结果", "校验优化内容与用户要求一致，准备保存为技能配置草稿。"]
  ];

  if (!Store) {
    showToast("技能配置加载失败，请返回列表重试");
    return;
  }

  let skills = Store.load();
  let storedSkill = skills.find((item) => item.id === requestedId);
  if (!storedSkill) {
    showToast("未找到需要测试的技能");
    $("kstRun").disabled = true;
    return;
  }

  let testingDraft = Boolean(storedSkill.draftConfig);
  let skill = testingDraft
    ? {
        ...Store.clone(storedSkill),
        ...Store.clone(storedSkill.draftConfig),
        id: storedSkill.id
      }
    : Store.clone(storedSkill);
  let isRunning = false;
  let activeRun = null;
  let runVersion = Number(skill.lastTestVersion || storedSkill.lastTestVersion || 0);
  let attachments = [];
  let optimizationHistory = [];

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function formatTime(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function readPrompt() {
    const editor = $("kstPromptEditor");
    const readNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      if (node.matches("[data-skill-tag]")) return "";
      if (node.tagName === "BR") return "\n";
      const content = Array.from(node.childNodes).map(readNode).join("");
      return /^(DIV|P)$/.test(node.tagName) ? `${content}\n` : content;
    };
    return Array.from(editor.childNodes)
      .map(readNode)
      .join("")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function createSkillTag() {
    const tag = document.createElement("span");
    tag.className = "composer-skill-tag";
    tag.dataset.skillTag = skill.id;
    tag.contentEditable = "false";
    tag.textContent = skill.name || "当前技能";
    return tag;
  }

  function appendPromptContent(editor, text) {
    const source = String(text || "");
    const tokenPattern = /【([^【】\n]+)】/g;
    let cursor = 0;
    let match;
    while ((match = tokenPattern.exec(source))) {
      if (match.index > cursor) editor.appendChild(document.createTextNode(source.slice(cursor, match.index)));
      const hint = document.createElement("span");
      hint.className = "composer-prompt-hint";
      hint.dataset.promptHint = match[1];
      hint.textContent = match[1];
      editor.appendChild(hint);
      cursor = tokenPattern.lastIndex;
    }
    if (cursor < source.length) editor.appendChild(document.createTextNode(source.slice(cursor)));
  }

  function syncPromptEmptyState() {
    $("kstPromptEditor").dataset.empty = String(!readPrompt());
  }

  function ensureSkillTag() {
    const editor = $("kstPromptEditor");
    if (!editor.querySelector("[data-skill-tag]")) {
      editor.insertBefore(createSkillTag(), editor.firstChild);
    }
  }

  function writePrompt(text) {
    const editor = $("kstPromptEditor");
    editor.replaceChildren(createSkillTag());
    appendPromptContent(editor, text);
    syncPromptEmptyState();
  }

  function setTestState(status, label) {
    const state = $("kstTestState");
    const detail = $("kstDetailState");
    state.classList.remove("is-pending", "is-running", "is-passed", "is-stale");
    const map = {
      running: ["is-running", "测试执行中"],
      passed: ["is-passed", "测试已通过"],
      stale: ["is-stale", "配置更新待复测"],
      failed: ["is-stale", "测试失败"],
      untested: ["is-pending", "待测试"]
    };
    const meta = map[status] || map.untested;
    state.classList.add(meta[0]);
    state.innerHTML = `<i></i>${escapeHTML(label || meta[1])}`;
    if (detail) detail.textContent = label || meta[1];
  }

  function populatePage() {
    const versionLabel = testingDraft ? "草稿版本" : "正式版本";
    const template = skill.reportTemplate;
    const status = skill.testStatus || "untested";

    document.title = `测试执行 · ${skill.name} - 智能问数管理后台`;
    $("kstSkillName").textContent = skill.name || "未命名技能";
    $("kstComposerSkill").textContent = skill.name || "当前技能";
    $("kstSkillSelectText").textContent = skill.name || "当前技能";
    $("kstSkillSelectTrigger").title = `当前技能：${skill.name || "未命名技能"}，点击切换`;
    $("kstVersionBadge").textContent = versionLabel;
    $("kstVersionBadge").classList.toggle("is-draft", testingDraft);
    $("kstDetailVersion").textContent = versionLabel;
    $("kstIntroTemplate").textContent = template?.name || "尚未上传模板";
    $("kstIntroThemes").textContent = `${(skill.themes || []).length} 个授权主题`;
    $("kstTemplateName").textContent = template?.name || "尚未上传模板";
    $("kstTemplateType").textContent = template?.type || "—";
    $("kstTemplateStatus").textContent = template?.status === "parsing" ? "解析中" : (template?.name ? "解析完成" : "等待配置");
    $("kstThemeList").innerHTML = (skill.themes || []).map((theme) => `<span>${escapeHTML(theme)}</span>`).join("")
      || "<span>尚未配置主题</span>";
    $("kstUserPromptCount").textContent = `${String(skill.userPrompt || "").length} 字`;
    $("kstExecutionCount").textContent = `${String(skill.executionPrompt || "").length} 字`;
    $("kstContentCount").textContent = `${String(skill.reportContentPrompt || skill.reportPrompt || "").length} 字`;
    $("kstFormatCount").textContent = `${String(skill.reportFormatPrompt || "").length} 字`;
    $("kstLastTest").textContent = skill.lastTestAt || storedSkill.lastTestAt
      ? `最近测试：${skill.lastTestAt || storedSkill.lastTestAt}`
      : "尚无测试记录";
    $("kstResultVersion").textContent = runVersion ? `测试结果 v${runVersion}` : "尚未生成";
    renderSkillPicker();
    writePrompt(skill.userPrompt || `请使用“${skill.name || "当前技能"}”完成分析并生成报告。`);
    setTestState(status);
  }

  function renderSkillPicker() {
    const availableSkills = skills
      .filter((item) => item.enabled !== false || item.id === storedSkill.id)
      .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
    const groups = new Map();
    availableSkills.forEach((item) => {
      const group = item.category || "其他技能";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(item);
    });

    $("kstSkillPickerCount").textContent = `${availableSkills.length} 项可用`;
    $("kstSkillPickerList").innerHTML = Array.from(groups.entries()).map(([group, items]) => `
      <div class="kst-skill-picker-group">${escapeHTML(group)}</div>
      ${items.map((item) => `
        <button type="button" class="kst-skill-option skill-option${item.id === storedSkill.id ? " selected" : ""}" data-skill-id="${escapeHTML(item.id)}">
          <span class="kst-skill-option-icon skill-option-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>
          </span>
          <span class="kst-skill-option-main skill-option-main"><strong>${escapeHTML(item.name || "未命名技能")}</strong><em>${escapeHTML(item.desc || "使用已配置的提示词与模板执行测试")}</em></span>
          <span class="kst-skill-option-tag skill-option-tag">${item.reportTemplate?.name ? "模板" : "技能"}</span>
          <span class="kst-skill-option-check skill-option-check"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg></span>
        </button>
      `).join("")}
    `).join("");
  }

  function closeSkillPicker() {
    $("kstSkillPicker").classList.add("hidden");
    $("kstSkillSelectWrap").classList.remove("is-open");
    $("kstSkillSelectTrigger").setAttribute("aria-expanded", "false");
  }

  function toggleSkillPicker(event) {
    event?.stopPropagation();
    const picker = $("kstSkillPicker");
    const willOpen = picker.classList.contains("hidden");
    picker.classList.toggle("hidden", !willOpen);
    $("kstSkillSelectWrap").classList.toggle("is-open", willOpen);
    $("kstSkillSelectTrigger").setAttribute("aria-expanded", String(willOpen));
    closeExportMenus();
  }

  function validateSkill() {
    if (!skill.reportTemplate?.name) {
      showToast("当前技能尚未上传模板，请先编辑配置");
      return false;
    }
    if (skill.reportTemplate.status === "parsing") {
      showToast("模板仍在解析，请等待配置完成后再测试");
      return false;
    }
    const required = [
      ["业务端预置提示词", skill.userPrompt],
      ["系统执行指令", skill.executionPrompt],
      ["内容提示词", skill.reportContentPrompt || skill.reportPrompt],
      ["文档格式提示词", skill.reportFormatPrompt]
    ];
    const missing = required.find((item) => !String(item[1] || "").trim());
    if (missing) {
      showToast(`当前技能缺少${missing[0]}，请先编辑配置`);
      return false;
    }
    return true;
  }

  function isSaveCommand(text) {
    return /保存|写入(?:到|至)?(?:编辑)?配置|保留为(?:优化|规则|配置)/.test(String(text || ""));
  }

  function classifyOptimization(text) {
    const value = String(text || "");
    if (/字号|字体|颜色|排版|样式|格式|布局|表格|图表|分页|页边距|对齐/.test(value)) {
      return { field: "reportFormatPrompt", label: "文档格式提示词", source: "format" };
    }
    if (/口径|权限|校验|计算|关联|取数|数据源|执行|异常值|缺失数据/.test(value)) {
      return { field: "executionPrompt", label: "系统执行指令", source: "runtime" };
    }
    if (/默认任务|默认问题|业务端提问|预置提示/.test(value)) {
      return { field: "userPrompt", label: "业务端预置提示词", source: "runtime" };
    }
    return { field: "reportContentPrompt", label: "内容提示词", source: "content" };
  }

  function detectChangeOperation(text) {
    const value = String(text || "");
    if (/删除|去掉|移除|取消|不再保留/.test(value)) return "delete";
    if (/修改|改为|调整为|替换|更改|由.+变为/.test(value)) return "modify";
    if (/合并|拆分|重排|前置|后置|移动|排序|归并/.test(value)) return "other";
    return "add";
  }

  function operationLabel(operation) {
    return {
      add: "新增",
      modify: "修改",
      delete: "删除",
      other: "其他"
    }[operation] || "其他";
  }

  function cleanChangeText(text) {
    return String(text || "")
      .trim()
      .replace(/^[“”"'‘’\s]+|[“”"'‘’。；，,\s]+$/g, "")
      .trim();
  }

  function quotedChangeParts(text) {
    return Array.from(String(text || "").matchAll(/[“"‘']([^”"’']+)[”"’']/g))
      .map((match) => cleanChangeText(match[1]))
      .filter(Boolean);
  }

  function parseModificationPair(text) {
    const quoted = quotedChangeParts(text);
    if (quoted.length >= 2) return { before: quoted[0], after: quoted[1] };
    const value = String(text || "").trim();
    const match = value.match(/(?:将|把|由)\s*(.+?)\s*(?:修改为|调整为|更改为|替换为|改为|变为)\s*(.+?)(?:[。；]|$)/);
    if (!match) return { before: "", after: "" };
    return {
      before: cleanChangeText(match[1]),
      after: cleanChangeText(match[2])
    };
  }

  function parseDeleteTarget(text) {
    const quoted = quotedChangeParts(text);
    if (quoted.length) return quoted[0];
    return cleanChangeText(String(text || "")
      .replace(/^请?(?:把|将)?/, "")
      .replace(/(?:删除|去掉|移除|取消|不再保留)/, "")
      .replace(/(?:这部分|该部分|相关内容)$/, ""));
  }

  function applyOptimizationChange(currentValue, item) {
    const current = String(currentValue || "").trim();
    const operation = item.operation || detectChangeOperation(item.text);
    if (operation === "modify") {
      const pair = parseModificationPair(item.text);
      if (pair.before && pair.after && current.includes(pair.before)) {
        return {
          value: current.replace(pair.before, pair.after),
          operation,
          before: pair.before,
          after: pair.after,
          note: "已直接替换配置中的匹配内容。"
        };
      }
      return {
        value: appendOptimizationRules(current, [item]),
        operation,
        before: pair.before || "未指定可直接匹配的原配置内容",
        after: pair.after || item.text,
        note: "未匹配到可直接替换的完整原文，已将修改要求保存为明确规则。"
      };
    }
    if (operation === "delete") {
      const target = parseDeleteTarget(item.text);
      if (target && current.includes(target)) {
        return {
          value: current.replace(target, "").replace(/\n{3,}/g, "\n\n").trim(),
          operation,
          before: target,
          after: "已从配置中删除",
          note: "已直接删除配置中的匹配内容。"
        };
      }
      return {
        value: appendOptimizationRules(current, [item]),
        operation,
        before: target || "未指定可直接匹配的原配置内容",
        after: `已新增排除规则：${item.text}`,
        note: "未匹配到可直接删除的完整原文，已保存为排除规则，避免后续结果继续生成该内容。"
      };
    }
    if (operation === "other") {
      return {
        value: appendOptimizationRules(current, [item]),
        operation,
        before: "现有内容组织方式",
        after: item.text,
        note: "已将重排、合并或位置调整要求保存为配置规则。"
      };
    }
    return {
      value: appendOptimizationRules(current, [item]),
      operation: "add",
      before: "无",
      after: item.text,
      note: "已新增为配置规则。"
    };
  }

  function addOptimization(text) {
    const normalized = String(text || "")
      .replace(/\s+/g, " ")
      .replace(/^[，。；：:\s]+|[，。；\s]+$/g, "")
      .trim();
    if (!normalized) return null;
    const existing = optimizationHistory.find((item) => item.text === normalized);
    if (existing) return existing;
    const category = classifyOptimization(normalized);
    const item = {
      id: `opt-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      text: normalized,
      field: category.field,
      label: category.label,
      source: category.source,
      operation: detectChangeOperation(normalized),
      saved: false
    };
    optimizationHistory.push(item);
    return item;
  }

  function extractExplicitSaveRule(prompt) {
    const value = String(prompt || "").trim();
    const colonContent = value.match(/[：:]\s*(.+)$/);
    if (colonContent?.[1]) return colonContent[1].trim();
    const stripped = value
      .replace(/^请?(?:把|将)?/, "")
      .replace(/(?:保存|写入(?:到|至)?(?:编辑)?配置|保留为(?:优化|规则|配置))/g, "")
      .replace(/(?:到|至)?(?:当前)?(?:技能)?(?:编辑)?配置(?:中|里)?/g, "")
      .replace(/^[，。；：:\s]+|[，。；\s]+$/g, "")
      .trim();
    if (!stripped || /^(以上|上述|刚才|本轮|当前|这些)?(?:全部|所有)?(?:的)?(?:优化|修改|调整|内容|结果|规则)?$/.test(stripped)) {
      return "";
    }
    return stripped;
  }

  function appendOptimizationRules(currentValue, entries) {
    const existing = String(currentValue || "").trim();
    const newRules = entries
      .map((item) => item.text)
      .filter((text) => text && !existing.includes(text));
    if (!newRules.length) return existing;
    const prefix = existing ? `${existing}\n\n` : "";
    return `${prefix}# 测试优化规则\n${newRules.map((text) => `- ${text}`).join("\n")}`;
  }

  function combineReportPrompts(contentPrompt, formatPrompt) {
    return [contentPrompt, formatPrompt].filter(Boolean).join("\n\n");
  }

  function saveOptimizations(entries) {
    const candidates = (entries?.length ? entries : optimizationHistory.filter((item) => !item.saved))
      .filter((item) => !item.saved);
    if (!candidates.length) return [];

    const index = skills.findIndex((item) => item.id === storedSkill.id);
    const stored = index >= 0 ? skills[index] : storedSkill;
    const draft = Store.clone(stored.draftConfig || skill || stored);
    delete draft.draftConfig;

    const changes = candidates.map((item) => {
      const applied = applyOptimizationChange(draft[item.field], item);
      draft[item.field] = applied.value;
      return {
        ...item,
        operation: applied.operation,
        operationLabel: operationLabel(applied.operation),
        before: applied.before,
        after: applied.after,
        note: applied.note
      };
    });
    draft.reportPrompt = combineReportPrompts(draft.reportContentPrompt, draft.reportFormatPrompt);
    draft.configSources = { ...(draft.configSources || {}) };
    candidates.forEach((item) => {
      draft.configSources[item.source] = "manual";
    });
    draft.optimizationRecords = [
      ...(Array.isArray(draft.optimizationRecords) ? draft.optimizationRecords : []),
      ...changes.map((item) => ({
        id: item.id,
        field: item.field,
        label: item.label,
        text: item.text,
        operation: item.operation,
        operationLabel: item.operationLabel,
        before: item.before,
        after: item.after,
        note: item.note,
        savedAt: formatTime(new Date())
      }))
    ];
    draft.testStatus = "stale";
    draft.workflowStatus = stored.workflowStatus === "draft" && stored.enabled === false ? "draft" : stored.workflowStatus;
    draft.updated = "2026-07-19";

    let savedRecord;
    if (stored.workflowStatus === "draft" && stored.enabled === false) {
      savedRecord = {
        ...draft,
        id: stored.id,
        enabled: false,
        workflowStatus: "draft",
        draftConfig: Store.clone(draft)
      };
    } else {
      savedRecord = {
        ...stored,
        draftConfig: Store.clone(draft),
        updated: draft.updated
      };
    }
    if (index >= 0) skills[index] = savedRecord;
    else skills.push(savedRecord);
    skills = Store.save(skills);
    storedSkill = skills.find((item) => item.id === savedRecord.id) || savedRecord;
    testingDraft = true;
    skill = {
      ...Store.clone(storedSkill),
      ...Store.clone(storedSkill.draftConfig || draft),
      id: storedSkill.id
    };
    candidates.forEach((item) => { item.saved = true; });
    $("kstVersionBadge").textContent = "草稿版本";
    $("kstVersionBadge").classList.add("is-draft");
    $("kstDetailVersion").textContent = "草稿版本";
    setTestState("stale", "优化已保存，待复测");
    syncSaveButtons();
    return changes;
  }

  function syncSaveButtons() {
    const hasSaved = optimizationHistory.some((item) => item.saved);
    const hasPending = optimizationHistory.some((item) => !item.saved);
    const buttons = Array.from(document.querySelectorAll("[data-save-optimization]"));
    buttons.forEach((button, index) => {
      const label = button.querySelector("[data-save-label]");
      const isLatest = index === buttons.length - 1;
      button.disabled = !hasPending || !isLatest;
      button.classList.toggle("is-saved", !hasPending && hasSaved);
      if (label) {
        label.textContent = !hasPending && hasSaved
          ? "优化已保存"
          : (isLatest ? "保存优化" : "历史结果");
      }
    });
  }

  function appendSaveReceipt(entries) {
    const wrapper = document.createElement("div");
    wrapper.className = "chat-message current-chat-message";
    const hasEntries = entries.length > 0;
    wrapper.innerHTML = `
      <div class="ai-block">
        <span class="ai-avatar">AI</span>
        <div class="ai-content">
          <div class="kst-save-receipt${hasEntries ? "" : " is-empty"}">
            <div class="kst-save-receipt-head">
              <span class="kst-save-receipt-icon">${hasEntries ? "✓" : "i"}</span>
              <div><strong>${hasEntries ? "已保存相关优化内容" : "暂无待保存的优化内容"}</strong><p>${hasEntries ? "已写入当前技能的编辑配置草稿，可继续进入编辑配置调整。" : "请先通过多轮对话形成优化内容，再执行保存。"}</p></div>
            </div>
            ${hasEntries ? `
              <div class="kst-saved-rule-list">
                ${entries.map((item) => `
                  <div class="kst-saved-rule">
                    <div class="kst-saved-rule-meta">
                      <span class="kst-change-operation is-${escapeHTML(item.operation)}">${escapeHTML(item.operationLabel)}</span>
                      <span class="kst-change-field">${escapeHTML(item.label)}</span>
                    </div>
                    <div class="kst-saved-rule-body">
                      <div class="kst-change-row"><strong>保存指令</strong><p>${escapeHTML(item.text)}</p></div>
                      ${item.operation === "add" ? `
                        <div class="kst-change-row is-after"><strong>新增内容</strong><p>${escapeHTML(item.after)}</p></div>
                      ` : `
                        <div class="kst-change-row is-before"><strong>${item.operation === "delete" ? "删除内容" : "调整前"}</strong><p>${escapeHTML(item.before)}</p></div>
                        <div class="kst-change-row is-after"><strong>${item.operation === "delete" ? "处理结果" : "调整后"}</strong><p>${escapeHTML(item.after)}</p></div>
                      `}
                      <div class="kst-change-note">${escapeHTML(item.note)}</div>
                    </div>
                  </div>
                `).join("")}
              </div>
            ` : ""}
          </div>
        </div>
      </div>
    `;
    $("kstConversation").appendChild(wrapper);
    scrollToBottom();
  }

  function handleSaveCommand(prompt) {
    $("kstIntro").classList.add("hidden");
    appendUserMessage(prompt);
    const directRule = extractExplicitSaveRule(prompt);
    const directEntry = directRule ? addOptimization(directRule) : null;
    const saved = saveOptimizations(directEntry ? [directEntry] : null);
    appendSaveReceipt(saved);
    writePrompt("");
    attachments = [];
    renderAttachments();
  }

  function renderAttachments() {
    const list = $("kstAttachmentList");
    list.classList.toggle("hidden", attachments.length === 0);
    list.innerHTML = attachments.map((item) => `
      <span class="kst-attachment" data-id="${escapeHTML(item.id)}">
        <span>${escapeHTML(item.name)}</span>
        <button type="button" aria-label="移除附件">×</button>
      </span>
    `).join("");
  }

  function addAttachment(file) {
    if (!file) return;
    attachments.push({ id: `att-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, name: file.name });
    renderAttachments();
    showToast(`已添加附件：${file.name}`);
  }

  function appendUserMessage(prompt) {
    const attachmentText = attachments.length
      ? `<div class="kst-message-attachments">附件：${attachments.map((item) => escapeHTML(item.name)).join("、")}</div>`
      : "";
    const wrapper = document.createElement("div");
    wrapper.className = "chat-message current-chat-message";
    wrapper.innerHTML = `
      <div class="user-bubble">
        <div class="bubble user">${escapeHTML(prompt).replace(/\n/g, "<br>")}${attachmentText}</div>
        <span class="avatar">张</span>
      </div>
    `;
    $("kstConversation").appendChild(wrapper);
    return wrapper;
  }

  function createAssistantRun(wrapper, stepDefinitions) {
    const thinkingSteps = stepDefinitions?.length ? stepDefinitions : THINKING_STEPS;
    const message = wrapper || document.createElement("div");
    if (!wrapper) {
      message.className = "chat-message current-chat-message";
      $("kstConversation").appendChild(message);
    }
    message.insertAdjacentHTML("beforeend", `
      <div class="ai-block">
        <span class="ai-avatar">AI</span>
        <div class="ai-content">
          <div class="thinking-box" data-thinking-box>
            <div class="box-head" data-thinking-toggle role="button" tabindex="0" aria-expanded="true">
              <div class="thinking-pill">
                <span class="thinking-pill-icon">◌</span>
                <strong data-thinking-title>思考过程</strong>
                <span class="thinking-pill-time" data-elapsed>(用时0.0s)</span>
                <svg class="thinking-pill-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>
              </div>
            </div>
            <div class="timeline">
              ${thinkingSteps.map((step, index) => `
                <div class="step" data-step="${index}">
                  <div class="step-dot loading">·</div>
                  <div><strong>${escapeHTML(step[0])}</strong><span>${escapeHTML(step[1])}</span></div>
                </div>
              `).join("")}
            </div>
          </div>
          <div data-report-slot></div>
        </div>
      </div>
    `);
    const aiBlock = message.lastElementChild;
    return {
      wrapper: message,
      thinking: aiBlock.querySelector("[data-thinking-box]"),
      steps: Array.from(aiBlock.querySelectorAll("[data-step]")),
      elapsed: aiBlock.querySelector("[data-elapsed]"),
      reportSlot: aiBlock.querySelector("[data-report-slot]"),
      startedAt: Date.now(),
      timers: [],
      optimization: null
    };
  }

  function createOptimizationDetailHTML(optimization) {
    if (!optimization) return "";
    const text = optimization.text;
    let title = "优化后的分析重点";
    let items = [
      "已将本轮要求纳入核心指标、业务分析和结论建议的组织逻辑。",
      "保留原有统计期间、数据口径与指标值，不改变未涉及的报告内容。",
      "后续可继续追问调整，确认后再保存到技能编辑配置。"
    ];
    if (/风险|异常|预警|问题/.test(text)) {
      title = "优化后的风险关注";
      items = [
        "公开采购率为 20.33%，距 95% 目标仍有 74.67pp，作为高风险事项前置展示。",
        "新增黑名单供应商 19 家、环比增长 533.33%，补充原因核验与供应商管理建议。",
        "闲废处置溢价率数值较高，保留原始值并强化统计口径复核提示。"
      ];
    } else if (/供应商|黑名单|投标/.test(text)) {
      title = "优化后的供应商分析";
      items = [
        "突出平均投标供应商 8.79 家/项目及其环比变化，补充竞争充分性判断。",
        "将新增黑名单供应商 19 家作为重点风险，并关联平台拦截结果说明。",
        "明确供应商名称字段暂缺，不编造 TOP10 排名和集中度结论。"
      ];
    } else if (/效能|周期|时效|三率/.test(text)) {
      title = "优化后的采购效能结论";
      items = [
        "公开、集中、电子采购率统一按照年度累计口径与 95% 目标对比。",
        "平均采购周期 12.51 天、环比缩短 1.29 天，补充 P95 超期项目关注。",
        "将指标差距、变化方向和后续动作组织为可执行的效能提升建议。"
      ];
    } else if (/精简|简洁|摘要|结论先行/.test(text)) {
      title = "优化后的精简摘要";
      items = [
        "本月成交金额 17,689.63 万元，环比增长 39.73%，采购需求较上月集中释放。",
        "公开采购率明显低于目标，供应商黑名单新增数量上升，是本期主要风险。",
        "采购周期环比缩短，电子采购率达标，整体采购效能有所改善。"
      ];
    }
    return `
      <div class="analysis-report-block kst-optimized-block">
        <h5>${escapeHTML(title)}</h5>
        <ul>${items.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
      </div>
    `;
  }

  function createReportHTML(version, optimization) {
    const themeLabel = (skill.themes || []).slice(0, 2).join("、") || "采购经营分析";
    return `
      <article class="result-card kst-result-card">
        <div class="result-head">
          <div class="result-title">
            <h2>华润建材科技月度采购快报</h2>
            <p>分析主题：${escapeHTML(themeLabel)} · 报告日期：2026年7月16日 · 数据来源：华润守正采购交易平台 · 测试结果 v${version}</p>
          </div>
        </div>
        <div class="result-body">
          <section class="analysis-section template-report-section kst-web-report" aria-label="华润建材科技月度采购快报 Web 正文">
            <h4>月报摘要</h4>
            ${optimization ? `
              <div class="kst-optimization-summary">
                <span>本轮优化</span>
                <div><strong>已根据追问更新报告结果</strong><p>${escapeHTML(optimization.text)}</p></div>
              </div>
            ` : ""}
            ${createOptimizationDetailHTML(optimization)}
            <div class="analysis-report-block">
              <h5>本月核心指标仪表盘</h5>
              <div class="template-kpi-grid">
                <div class="template-kpi-card">
                  <div class="template-kpi-label">本月成交金额</div>
                  <div class="template-kpi-value">17,689.63<span>万元</span></div>
                  <div class="template-kpi-meta"><span class="template-kpi-target">年度累计 75,341.52 万元</span><span class="template-kpi-up">环比 +39.73%</span></div>
                </div>
                <div class="template-kpi-card">
                  <div class="template-kpi-label">本月成交项目数</div>
                  <div class="template-kpi-value">1,126<span>个</span></div>
                  <div class="template-kpi-meta"><span class="template-kpi-target">年度累计 6,177 个</span><span class="template-kpi-up">环比 +5.23%</span></div>
                </div>
                <div class="template-kpi-card">
                  <div class="template-kpi-label">本月节资金额</div>
                  <div class="template-kpi-value">3,201.49<span>万元</span></div>
                  <div class="template-kpi-meta"><span class="template-kpi-target">年度累计 12,279.93 万元</span><span class="template-kpi-up">环比 +38.07%</span></div>
                </div>
                <div class="template-kpi-card">
                  <div class="template-kpi-label">本月节资率</div>
                  <div class="template-kpi-value">15.32<span>%</span></div>
                  <div class="template-kpi-meta"><span class="template-kpi-target">年度累计 14.01%</span><span class="template-kpi-down">环比 -0.16pp</span></div>
                </div>
                <div class="template-kpi-card is-warning">
                  <div class="template-kpi-label">公开采购率</div>
                  <div class="template-kpi-value">20.33<span>%</span></div>
                  <div class="template-kpi-meta"><span class="template-kpi-target">目标 95% · 差距 74.67pp</span><span class="template-kpi-up">环比 +46.02pp</span></div>
                </div>
                <div class="template-kpi-card is-warning">
                  <div class="template-kpi-label">集中采购率</div>
                  <div class="template-kpi-value">83.06<span>%</span></div>
                  <div class="template-kpi-meta"><span class="template-kpi-target">目标 95% · 差距 11.94pp</span><span class="template-kpi-down">环比 -0.12pp</span></div>
                </div>
                <div class="template-kpi-card is-success">
                  <div class="template-kpi-label">电子采购率</div>
                  <div class="template-kpi-value">100.00<span>%</span></div>
                  <div class="template-kpi-meta"><span class="template-kpi-target">目标 95% · 已达标</span><span class="template-kpi-neutral">环比 0.00pp</span></div>
                </div>
                <div class="template-kpi-card">
                  <div class="template-kpi-label">闲废处置成交</div>
                  <div class="template-kpi-value">174<span>笔</span></div>
                  <div class="template-kpi-meta"><span class="template-kpi-target">年度累计 1,059 笔</span><span class="template-kpi-up">环比 +10.83%</span></div>
                </div>
              </div>
              <p class="kst-report-note">仪表盘数据为当月快照；三率指标展示本年度至当月累计值，三率目标值为 95%。同比数据暂缺。</p>
            </div>

            <div class="analysis-report-block">
              <h5>一、本月采购主体分布</h5>
              <p>本月各事业大区/事业部中，成交金额前三依次为：西南大区 5,805.34 万元（占比 32.82%）、华南大区 4,905.11 万元（占比 27.73%）、结构建材事业部 3,121.42 万元（占比 17.65%），三者合计占比 78.20%。</p>
              <div class="template-contribution-grid kst-subject-grid">
                <div class="template-contribution-card">
                  <div class="template-contribution-head">成交金额贡献 TOP3</div>
                  <ul>
                    <li><span class="template-contribution-name">西南大区</span><div class="template-contribution-bar"><span style="--w:32.82%"></span></div><span class="template-contribution-value">32.82%</span></li>
                    <li><span class="template-contribution-name">华南大区</span><div class="template-contribution-bar"><span style="--w:27.73%"></span></div><span class="template-contribution-value">27.73%</span></li>
                    <li><span class="template-contribution-name">结构建材</span><div class="template-contribution-bar"><span style="--w:17.65%"></span></div><span class="template-contribution-value">17.65%</span></li>
                  </ul>
                </div>
                <div class="template-plan-card next">
                  <div class="template-plan-head"><span class="template-plan-icon">↗</span><strong>环比变化</strong></div>
                  <ul>
                    <li>功能建材事业部环比增长 598.46%。</li>
                    <li>结构建材事业部环比增长 239.14%。</li>
                    <li>东南大区环比下降 50.31%，华中大区下降 25.64%。</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="analysis-report-block">
              <h5>二、本月核心发现及优化建议</h5>
              <div class="kst-finding-list">
                <article><span class="kst-risk-level is-low">低风险</span><div><strong>本月成交金额环比显著增长</strong><p>成交金额 17,689.63 万元，环比增长 39.73%；成交项目 1,126 个，环比增长 5.23%。建议结合各事业部实际采购需求，确认增长是否来自集中采购计划推进或一次性大额项目。</p></div></article>
                <article><span class="kst-risk-level is-high">高风险</span><div><strong>公开采购率偏低，距目标差距较大</strong><p>年累计公开采购率 20.33%，距 95% 目标差距 74.67pp；集中采购率 83.06%，距目标差距 11.94pp。建议重点推动公开采购比例提升，关注采购方式选择环节的合规性。</p></div></article>
                <article><span class="kst-risk-level is-medium">中风险</span><div><strong>新增黑名单供应商数量环比大幅增长</strong><p>本月新增黑名单供应商 19 家，环比增长 533.33%，平台拦截黑名单次数为 0。建议结合黑名单管理记录了解新增原因。</p></div></article>
                <article><span class="kst-risk-level is-low">低风险</span><div><strong>闲废处置活跃，溢价水平较高</strong><p>本月闲废成交 174 笔，环比增长 10.83%。竞价模式有效提升废旧物资回收价值，但当前汇总口径仍需进一步确认。</p></div></article>
                <article><span class="kst-risk-level is-low">低风险</span><div><strong>采购周期环比缩短，效能改善</strong><p>本月平均采购周期 12.51 天，环比缩短 1.29 天；中位数 10 天，P95 为 27 天。建议持续关注 P95 以上超期项目的具体原因。</p></div></article>
              </div>
            </div>

            <div class="analysis-report-block">
              <h5>三、采购方式及品类分析</h5>
              <p>本月采购方式以非招为主，成交金额 17,008.34 万元，占比 96.15%；招标成交金额 681.29 万元，占比 3.85%。非招项目数 1,123 个，招标项目 3 个。</p>
              <div class="inline-table kst-web-table">
                <table>
                  <thead><tr><th>采购方式</th><th class="num">项目数</th><th class="num">成交金额（万元）</th><th class="num">金额占比</th></tr></thead>
                  <tbody>
                    <tr><td>招标采购</td><td class="num">3</td><td class="num">681.29</td><td class="num">3.85%</td></tr>
                    <tr><td>非招采购</td><td class="num">1,123</td><td class="num">17,008.34</td><td class="num">96.15%</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="template-contribution-grid kst-analysis-cards">
                <div class="template-contribution-card"><div class="template-contribution-head">非招方式细分</div><ul><li><span class="template-contribution-name">询比采购</span><div class="template-contribution-bar"><span style="--w:89.13%"></span></div><span class="template-contribution-value">89.13%</span></li><li><span class="template-contribution-name">谈判采购</span><div class="template-contribution-bar"><span style="--w:9.28%"></span></div><span class="template-contribution-value">9.28%</span></li><li><span class="template-contribution-name">单源直采</span><div class="template-contribution-bar"><span style="--w:1.6%"></span></div><span class="template-contribution-value">1.60%</span></li></ul></div>
                <div class="template-contribution-card"><div class="template-contribution-head">采购大类分布</div><ul><li><span class="template-contribution-name">货物类</span><div class="template-contribution-bar"><span style="--w:59.01%"></span></div><span class="template-contribution-value">59.01%</span></li><li><span class="template-contribution-name">服务类</span><div class="template-contribution-bar"><span style="--w:35.88%"></span></div><span class="template-contribution-value">35.88%</span></li><li><span class="template-contribution-name">工程类</span><div class="template-contribution-bar"><span style="--w:5.12%"></span></div><span class="template-contribution-value">5.12%</span></li></ul></div>
                <div class="template-plan-card next"><div class="template-plan-head"><span class="template-plan-icon">1</span><strong>品类成交 TOP1</strong></div><p>普通货物道路运输服务成交 3,516.40 万元，占比 19.93%；TOP5 品类合计占比 45.92%。</p></div>
              </div>
            </div>

            <div class="analysis-report-block">
              <h5>四、供应商分析</h5>
              <p>本月单项目平均投标供应商数量 8.79 家，环比增长 3.62%（上月 8.48 家），供应商竞争程度略有提升。本月新增黑名单供应商 19 家，环比增长 533.33%，平台拦截黑名单次数为 0。</p>
              <div class="template-kpi-grid kst-compact-kpis">
                <div class="template-kpi-card"><div class="template-kpi-label">平均投标供应商</div><div class="template-kpi-value">8.79<span>家/项目</span></div><div class="template-kpi-meta"><span class="template-kpi-target">上月 8.48 家</span><span class="template-kpi-up">环比 +3.62%</span></div></div>
                <div class="template-kpi-card is-warning"><div class="template-kpi-label">新增黑名单供应商</div><div class="template-kpi-value">19<span>家</span></div><div class="template-kpi-meta"><span class="template-kpi-target">上月 3 家</span><span class="template-kpi-up">环比 +533.33%</span></div></div>
                <div class="template-kpi-card"><div class="template-kpi-label">黑名单拦截次数</div><div class="template-kpi-value">0<span>次</span></div><div class="template-kpi-meta"><span class="template-kpi-target">上月 0 次</span><span class="template-kpi-neutral">无变化</span></div></div>
              </div>
              <p class="kst-report-note">采购明细暂未包含供应商名称字段，供应商成交金额 TOP10 和集中度数据暂缺。</p>
            </div>

            <div class="analysis-report-block">
              <h5>五、采购效能分析</h5>
              <p>年累计公开采购率 20.33%，距 95% 目标差距 74.67pp；集中采购率 83.06%，距目标差距 11.94pp；电子采购率 100%，已达标。</p>
              <ul class="template-progress-list kst-rate-list">
                <li><span class="template-progress-name">公开采购率</span><div class="template-progress-bar"><span class="template-progress-fill is-warning" style="--w:20.33%"></span></div><span class="template-progress-value">20.33%</span></li>
                <li><span class="template-progress-name">集中采购率</span><div class="template-progress-bar"><span class="template-progress-fill" style="--w:83.06%"></span></div><span class="template-progress-value">83.06%</span></li>
                <li><span class="template-progress-name">电子采购率</span><div class="template-progress-bar"><span class="template-progress-fill is-success" style="--w:100%"></span></div><span class="template-progress-value">100.00%</span></li>
              </ul>
              <div class="inline-table kst-web-table">
                <table>
                  <thead><tr><th>采购大类</th><th class="num">节资金额（万元）</th><th class="num">节资率</th></tr></thead>
                  <tbody><tr><td>货物类</td><td class="num">1,555.21</td><td class="num">12.97%</td></tr><tr><td>服务类</td><td class="num">1,497.26</td><td class="num">19.09%</td></tr><tr><td>工程类</td><td class="num">149.10</td><td class="num">14.14%</td></tr></tbody>
                </table>
              </div>
              <div class="template-kpi-grid kst-compact-kpis">
                <div class="template-kpi-card"><div class="template-kpi-label">平均采购周期</div><div class="template-kpi-value">12.51<span>天</span></div><div class="template-kpi-meta"><span class="template-kpi-target">上月 13.80 天</span><span class="template-kpi-up">缩短 1.29 天</span></div></div>
                <div class="template-kpi-card"><div class="template-kpi-label">采购周期中位数</div><div class="template-kpi-value">10<span>天</span></div><div class="template-kpi-meta"><span class="template-kpi-target">P95 为 27 天</span><span class="template-kpi-neutral">整体效率改善</span></div></div>
                <div class="template-kpi-card is-success"><div class="template-kpi-label">项目采购成功率</div><div class="template-kpi-value">99.54<span>%</span></div><div class="template-kpi-meta"><span class="template-kpi-target">上月 99.68%</span><span class="template-kpi-down">环比 -0.13pp</span></div></div>
              </div>
              <p class="kst-report-note">P95 以上超期项目共 10 个，最长采购周期 124 天，主要集中在华南大区和西南大区。</p>
            </div>

            <div class="analysis-report-block">
              <h5>六、闲废处置业务</h5>
              <p>2026 年 6 月，闲废处置成交 174 笔，环比增长 10.83%，年度累计成交 1,059 笔。闲废处置以竞价方式为主，交易形式为自行处置，整体溢价水平较高。</p>
              <div class="inline-table kst-web-table">
                <table>
                  <thead><tr><th>指标名称</th><th class="num">本月数值</th><th class="num">环比变动</th><th class="num">年度累计</th></tr></thead>
                  <tbody>
                    <tr><td>处置成交笔数</td><td class="num">174 笔</td><td class="num up">+10.83%</td><td class="num">1,059 笔</td></tr>
                    <tr><td>起拍价</td><td class="num">168.91 万元</td><td class="num kst-down">-50.49%</td><td class="num">2,404.92 万元</td></tr>
                    <tr><td>成交金额</td><td class="num">2,274,750.00 万元</td><td class="num kst-down">-42.85%</td><td class="num">29,580,540.00 万元</td></tr>
                    <tr><td>溢价金额</td><td class="num">2,274,581.16 万元</td><td class="num kst-down">-42.85%</td><td class="num">29,578,135.08 万元</td></tr>
                    <tr><td>溢价率</td><td class="num">13,466.23%</td><td class="num up">+1799.10pp</td><td class="num">12,299.01%</td></tr>
                  </tbody>
                </table>
              </div>
              <p class="kst-report-note">典型案例包括废旧蓄电池、废枪线处置项目，废旧钢铁竞价项目和废旧物资年度处理项目；当前闲废统计指标来自明细层确定性汇总，需注意口径差异。</p>
            </div>

            <div class="analysis-report-foot revealed kst-export-only">
              <button type="button" class="action-dropdown-btn kst-save-optimization-btn" data-save-optimization>
                <svg viewBox="0 0 24 24"><path d="M5 4h12l2 2v14H5z"/><path d="M8 4v6h8V4"/><path d="M8 20v-6h8v6"/></svg>
                <span data-save-label>保存优化</span>
              </button>
              <div class="answer-action-right kst-report-action-group">
                <button type="button" class="action-dropdown-btn" data-report-action="export">
                <svg viewBox="0 0 24 24"><path d="M12 4v10"/><path d="M8.5 10.5L12 14l3.5-3.5"/><path d="M5 19h14"/></svg>
                <span>导出</span>
                  <svg class="caret" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg>
              </button>
                <div class="context-menu export-menu kst-export-menu hidden">
                <button type="button" data-result-export="image"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M7 15l3-3 2.5 2.5 2.5-3 2 3.5"/><path d="M9 9h.01"/></svg><span>导出图片</span></button>
                <button type="button" data-result-export="pdf"><svg viewBox="0 0 24 24"><path d="M7 4h7l4 4v12H7z"/><path d="M14 4v4h4"/><path d="M9 16h6"/></svg><span>导出 PDF</span></button>
                <button type="button" data-result-export="word"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9l1.5 6L12 9l2.5 6L16 9"/></svg><span>导出 Word</span></button>
                <button type="button" data-result-export="excel"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9l6 6"/><path d="M15 9l-6 6"/></svg><span>导出 Excel</span></button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </article>
    `;
  }

  function closeExportMenus(except) {
    document.querySelectorAll(".kst-export-menu").forEach((menu) => {
      if (menu !== except) menu.classList.add("hidden");
    });
  }

  function exportResult(type) {
    const labelMap = {
      image: "导出图片",
      pdf: "导出 PDF",
      word: "导出 Word",
      excel: "导出 Excel"
    };
    if (type === "word") {
      downloadUploadedTemplate();
      return;
    }
    showToast(`${labelMap[type] || "导出"}已开始`);
  }

  function downloadUploadedTemplate() {
    const template = skill.reportTemplate;
    const downloadUrl = String(template?.downloadUrl || "").trim();
    if (template?.source !== "uploaded" || !downloadUrl) {
      showToast("当前技能没有可导出的上传模板");
      return;
    }

    const reportTitle = String(
      document.querySelector(".kst-conversation .result-card:last-of-type .result-title h2")?.textContent
      || skill.name
      || "技能报告"
    ).trim();
    const filename = `${reportTitle.replace(/\.(doc|docx)$/i, "")}.docx`;
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = filename.replace(/[\\/:*?"<>|]/g, "_");
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    showToast(`已导出上传模板：${filename}`);
  }

  function positionExportMenu(button, menu) {
    menu.classList.remove("hidden");
    menu.style.visibility = "hidden";
    const buttonRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const gutter = 12;
    const left = Math.max(gutter, Math.min(buttonRect.right - menuRect.width, window.innerWidth - menuRect.width - gutter));
    const fitsBelow = buttonRect.bottom + 8 + menuRect.height <= window.innerHeight - gutter;
    const top = fitsBelow
      ? buttonRect.bottom + 8
      : Math.max(gutter, buttonRect.top - menuRect.height - 8);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.visibility = "";
  }

  function scrollToBottom() {
    const scroller = $("kstChatScroll");
    window.requestAnimationFrame(() => {
      scroller.scrollTop = scroller.scrollHeight;
    });
  }

  function updateThinkingStep(run, activeIndex) {
    run.steps.forEach((step, index) => {
      const dot = step.querySelector(".step-dot");
      if (!dot) return;
      if (index < activeIndex) {
        dot.classList.remove("loading");
        dot.textContent = "✓";
      } else {
        dot.classList.add("loading");
        dot.textContent = "·";
      }
    });
    scrollToBottom();
  }

  function clearRunTimers(run) {
    if (!run) return;
    run.timers.forEach((timer) => window.clearTimeout(timer));
    if (run.elapsedTimer) window.clearInterval(run.elapsedTimer);
    run.timers = [];
  }

  function markTestPassed() {
    const timestamp = formatTime(new Date());
    runVersion += 1;
    const index = skills.findIndex((item) => item.id === storedSkill.id);
    const record = index >= 0 ? skills[index] : storedSkill;
    if (testingDraft && record.draftConfig) {
      record.draftConfig = {
        ...record.draftConfig,
        testStatus: "passed",
        lastTestAt: timestamp,
        lastTestVersion: runVersion
      };
    } else {
      record.testStatus = "passed";
      record.lastTestAt = timestamp;
      record.lastTestVersion = runVersion;
    }
    record.lastTestAt = timestamp;
    record.lastTestVersion = runVersion;
    if (index >= 0) skills[index] = record;
    skills = Store.save(skills);
    storedSkill = skills.find((item) => item.id === record.id) || record;
    skill.testStatus = "passed";
    skill.lastTestAt = timestamp;
    skill.lastTestVersion = runVersion;
    $("kstLastTest").textContent = `最近测试：${timestamp}`;
    $("kstResultVersion").textContent = `测试结果 v${runVersion}`;
    setTestState("passed");
  }

  function completeRun(run, prompt) {
    clearRunTimers(run);
    run.steps.forEach((step) => {
      const dot = step.querySelector(".step-dot");
      dot.classList.remove("loading");
      dot.textContent = "✓";
    });
    run.thinking.classList.add("collapsed");
    run.thinking.querySelector("[data-thinking-toggle]").setAttribute("aria-expanded", "false");
    run.thinking.querySelector("[data-thinking-title]").textContent = "思考过程";
    run.elapsed.textContent = `(用时${((Date.now() - run.startedAt) / 1000).toFixed(1)}s)`;
    markTestPassed();
    run.reportSlot.innerHTML = createReportHTML(runVersion, run.optimization);
    isRunning = false;
    activeRun = null;
    $("kstRun").classList.remove("is-running");
    $("kstDetailState").textContent = "测试已通过";
    syncSaveButtons();
    showToast(`${skill.name}测试执行完成`);
    scrollToBottom();
  }

  function stopRun() {
    if (!isRunning || !activeRun) return;
    clearRunTimers(activeRun);
    activeRun.thinking.querySelector("[data-thinking-title]").textContent = "已停止生成";
    activeRun.elapsed.textContent = "（测试已由管理员停止）";
    activeRun.steps.forEach((step) => step.querySelector(".step-dot")?.classList.remove("loading"));
    isRunning = false;
    activeRun = null;
    $("kstRun").classList.remove("is-running");
    setTestState(skill.testStatus || "untested");
    showToast("已停止本次测试，不更新测试状态");
  }

  function runTest() {
    if (isRunning) return stopRun();
    const prompt = readPrompt();
    if (!prompt) {
      showToast("请输入本次测试任务");
      $("kstPromptEditor").focus();
      return;
    }
    if (isSaveCommand(prompt)) {
      handleSaveCommand(prompt);
      return;
    }
    if (!validateSkill()) return;

    $("kstIntro").classList.add("hidden");
    const isOptimizationRound = Boolean(document.querySelector(".kst-conversation .result-card"));
    const optimization = isOptimizationRound ? addOptimization(prompt) : null;
    const message = appendUserMessage(prompt);
    const run = createAssistantRun(message, isOptimizationRound ? OPTIMIZATION_THINKING_STEPS : THINKING_STEPS);
    run.optimization = optimization;
    activeRun = run;
    isRunning = true;
    $("kstRun").classList.add("is-running");
    setTestState("running");
    $("kstDetailState").textContent = "正在执行";
    writePrompt("");
    attachments = [];
    renderAttachments();
    scrollToBottom();

    run.elapsedTimer = window.setInterval(() => {
      run.elapsed.textContent = `(用时${((Date.now() - run.startedAt) / 1000).toFixed(1)}s)`;
    }, 100);

    run.steps.forEach((step, index) => {
      const timer = window.setTimeout(() => updateThinkingStep(run, index), 600 * index + 90);
      run.timers.push(timer);
    });
    run.timers.push(window.setTimeout(() => completeRun(run, prompt), 3000));
  }

  $("kstRun").addEventListener("click", runTest);
  $("kstPromptEditor").addEventListener("input", () => {
    ensureSkillTag();
    syncPromptEmptyState();
  });
  $("kstPromptEditor").addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    runTest();
  });
  $("kstPromptEditor").addEventListener("paste", (event) => {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
  });
  $("kstSkillSelectTrigger").addEventListener("click", toggleSkillPicker);
  $("kstSkillPickerList").addEventListener("click", (event) => {
    const option = event.target.closest("[data-skill-id]");
    if (!option) return;
    const nextId = option.dataset.skillId;
    closeSkillPicker();
    if (!nextId || nextId === storedSkill.id) return;
    window.location.href = `knowledge-skill-test.html?id=${encodeURIComponent(nextId)}`;
  });
  $("kstBack").addEventListener("click", () => { window.location.href = "knowledge-skill.html"; });
  $("kstEditSkill").addEventListener("click", () => {
    window.location.href = `knowledge-skill-edit.html?id=${encodeURIComponent(storedSkill.id)}`;
  });
  $("kstUploadImage").addEventListener("click", () => $("kstImageInput").click());
  $("kstUploadFile").addEventListener("click", () => $("kstFileInput").click());
  $("kstImageInput").addEventListener("change", (event) => {
    addAttachment(event.target.files?.[0]);
    event.target.value = "";
  });
  $("kstFileInput").addEventListener("change", (event) => {
    addAttachment(event.target.files?.[0]);
    event.target.value = "";
  });
  $("kstAttachmentList").addEventListener("click", (event) => {
    const item = event.target.closest(".kst-attachment");
    if (!item || !event.target.closest("button")) return;
    attachments = attachments.filter((attachment) => attachment.id !== item.dataset.id);
    renderAttachments();
  });
  $("kstConversation").addEventListener("click", (event) => {
    const thinkingToggle = event.target.closest("[data-thinking-toggle]");
    if (thinkingToggle) {
      const box = thinkingToggle.closest("[data-thinking-box]");
      const collapsed = box.classList.toggle("collapsed");
      thinkingToggle.setAttribute("aria-expanded", String(!collapsed));
      return;
    }
    const saveButton = event.target.closest("[data-save-optimization]");
    if (saveButton) {
      const saved = saveOptimizations();
      appendSaveReceipt(saved);
      return;
    }
    const exportOption = event.target.closest("[data-result-export]");
    if (exportOption) {
      closeExportMenus();
      exportResult(exportOption.dataset.resultExport);
      return;
    }
    const button = event.target.closest('[data-report-action="export"]');
    if (!button) return;
    const menu = button.parentElement.querySelector(".kst-export-menu");
    const opening = menu.classList.contains("hidden");
    closeExportMenus(menu);
    if (opening) positionExportMenu(button, menu);
    else menu.classList.add("hidden");
  });
  $("kstConversation").addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const thinkingToggle = event.target.closest("[data-thinking-toggle]");
    if (!thinkingToggle) return;
    event.preventDefault();
    thinkingToggle.click();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".kst-report-action-group")) closeExportMenus();
    if (!event.target.closest(".kst-skill-select-wrap")) closeSkillPicker();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeSkillPicker();
    closeExportMenus();
  });
  window.addEventListener("resize", () => closeExportMenus());
  $("kstChatScroll").addEventListener("scroll", () => closeExportMenus(), { passive: true });

  window.addEventListener("beforeunload", () => clearRunTimers(activeRun));

  populatePage();
})();
