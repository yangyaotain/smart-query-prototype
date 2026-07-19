(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const Store = window.SkillCatalogStore;
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("id");
  const ALLOWED_EXTENSIONS = ["DOC", "DOCX", "PDF", "XLS", "XLSX", "PPT", "PPTX", "PNG", "JPG", "JPEG", "SVG"];
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const PARSE_PHASES = [
    {
      percent: 12,
      title: "读取并校验文件",
      detail: "正在识别文件类型、大小和可解析结构…"
    },
    {
      percent: 30,
      title: "提取模板结构",
      detail: "正在提取标题、段落、工作表、表格和图片对象…"
    },
    {
      percent: 48,
      title: "理解业务内容",
      detail: "正在识别业务主题、字段、指标和数据范围…"
    },
    {
      percent: 67,
      title: "生成报告提示词",
      detail: "正在形成内容提示词和文档格式提示词…"
    },
    {
      percent: 84,
      title: "生成技能配置",
      detail: "正在生成基础信息、适用主题和执行配置…"
    },
    {
      percent: 100,
      title: "校验并自动回填",
      detail: "正在校验生成结果并回填左右配置区域…"
    }
  ];
  const PROMPT_OPTIMIZE_PHASES = [
    {
      percent: 18,
      title: "正在理解任务目标",
      detail: "识别使用场景、业务目标、数据范围和输出要求。"
    },
    {
      percent: 46,
      title: "正在检查提示词质量",
      detail: "检查重复内容、表达歧义、遗漏约束和执行边界。"
    },
    {
      percent: 74,
      title: "正在形成调整方案",
      detail: "确定需要删除、改写和新增的内容，并校验调整影响。"
    },
    {
      percent: 100,
      title: "正在生成对比结果",
      detail: "重组提示词并生成可确认替换的左右对比版本。"
    }
  ];

  if (!Store) {
    showToast("技能配置加载失败，请返回列表重试");
    return;
  }

  let skills = Store.load();
  let isCreate = !requestedId || params.get("mode") === "create";
  const existing = isCreate ? null : skills.find((item) => item.id === requestedId);
  const editableExisting = existing?.draftConfig
    ? {
        ...Store.clone(existing),
        ...Store.clone(existing.draftConfig),
        id: existing.id,
        enabled: existing.enabled,
        draftConfig: Store.clone(existing.draftConfig)
      }
    : (existing ? Store.clone(existing) : null);
  let current = isCreate
    ? Store.createBlank(Math.max(...skills.map((item) => Number(item.sort) || 0), 0) + 10)
    : editableExisting;
  let persistedRecord = existing ? Store.clone(existing) : null;
  let dirty = false;
  let allowLeave = false;
  let isPopulating = false;
  let templateParseToken = 0;
  let parseTimers = [];
  let parseElapsedTimer = null;
  let parseStartedAt = 0;
  let parseDetailsExpanded = false;
  let structureDetailsExpanded = false;
  let structureDetailsTouched = false;
  let structureAutoCollapseTimer = null;
  let activePromptTab = "content";
  let activeRuntimeTab = "business";
  let contentPromptSnapshot = "";
  let formatPromptSnapshot = "";
  let promptOptimizeTimers = [];
  let promptOptimizeElapsedTimer = null;
  let promptOptimizeStartedAt = 0;
  let pendingPromptOptimization = null;
  const markdownEditors = new Map();

  function mountMarkdownEditors() {
    if (!window.MarkdownEditor) return;
    [
      "ksFormReportContentPrompt",
      "ksFormReportFormatPrompt",
      "ksFormExecutionPrompt"
    ].forEach((id) => {
      const field = $(id);
      const editor = window.MarkdownEditor.mount(field, {
        variant: "compact",
        allowSplit: false,
        onSave: () => saveSkill("draft")
      });
      if (editor) markdownEditors.set(id, editor);
    });
  }

  function markdownEditorFor(target) {
    const field = typeof target === "string" ? $(target) : target;
    return field ? markdownEditors.get(field.id) || null : null;
  }

  function setMarkdownValue(target, value, options = {}) {
    const field = typeof target === "string" ? $(target) : target;
    const editor = markdownEditorFor(field);
    if (!field) return;
    if (!editor) {
      field.value = value || "";
      return;
    }
    editor.setValue(value || "", {
      dispatchInput: false,
      recordHistory: options.resetHistory ? false : options.recordHistory !== false,
      resetHistory: Boolean(options.resetHistory),
      selectionStart: options.selectionStart == null ? 0 : options.selectionStart,
      selectionEnd: options.selectionEnd == null ? 0 : options.selectionEnd
    });
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function combineReportPrompts(contentPrompt, formatPrompt) {
    return `# 内容提示词\n\n${contentPrompt}\n\n# 文档格式提示词\n\n${formatPrompt}`;
  }

  function formatFileSize(bytes) {
    const value = Number(bytes) || 0;
    if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
    if (value >= 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${value || 1} B`;
  }

  function extensionOf(name) {
    return String(name || "").split(".").pop().toUpperCase();
  }

  function inferTemplateName(name) {
    return String(name || "")
      .replace(/\.(doc|docx|pdf|xls|xlsx|ppt|pptx|png|jpg|jpeg|svg)$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/格式调整版|模板|最终版|定稿版/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim() || "报告生成技能";
  }

  function ensureSources() {
    current.configSources = {
      basic: "system",
      runtime: "system",
      content: "system",
      format: "system",
      ...(current.configSources || {})
    };
    return current.configSources;
  }

  function sourceMeta(source) {
    if (source === "template") return { label: "模板解析生成", className: "is-generated" };
    if (source === "manual") return { label: "人工已修改", className: "is-manual" };
    return { label: "系统默认", className: "" };
  }

  function updateSourceBadge(id, source) {
    const node = $(id);
    if (!node) return;
    const meta = sourceMeta(source);
    node.textContent = meta.label;
    node.classList.remove("is-generated", "is-manual");
    if (meta.className) node.classList.add(meta.className);
  }

  function renderSources() {
    const sources = ensureSources();
    updateSourceBadge("ksBasicSource", sources.basic);
    updateSourceBadge("ksRuntimeSource", sources.runtime);
    updateSourceBadge("ksContentPromptSource", sources.content);
    updateSourceBadge("ksFormatPromptSource", sources.format);
  }

  function markSource(type, source) {
    ensureSources()[type] = source;
    renderSources();
  }

  function setDirty(value) {
    dirty = Boolean(value);
    renderHeaderState();
  }

  function markTestStale() {
    if (current.testStatus && current.testStatus !== "untested") current.testStatus = "stale";
  }

  function markChanged(sourceType) {
    if (sourceType) markSource(sourceType, "manual");
    markTestStale();
    setDirty(true);
  }

  function renderHeaderState() {
    $("kseTopTitle").textContent = isCreate ? "新增技能" : "编辑技能";
    document.title = `${isCreate ? "新增" : "编辑"}技能 - 智能问数管理后台`;
  }

  function setPromptTab(type, focusTab) {
    activePromptTab = type === "format" ? "format" : "content";
    document.querySelectorAll("[data-prompt-tab]").forEach((button) => {
      const active = button.dataset.promptTab === activePromptTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focusTab) button.focus();
    });
    document.querySelectorAll("[data-prompt-panel]").forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.promptPanel !== activePromptTab);
    });
    window.requestAnimationFrame(() => {
      markdownEditorFor(activePromptTab === "format" ? "ksFormReportFormatPrompt" : "ksFormReportContentPrompt")?.refresh();
    });
  }

  function setRuntimeTab(type, focusTab) {
    activeRuntimeTab = type === "execution" ? "execution" : "business";
    document.querySelectorAll("[data-runtime-tab]").forEach((button) => {
      const active = button.dataset.runtimeTab === activeRuntimeTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focusTab) button.focus();
    });
    document.querySelectorAll("[data-runtime-panel]").forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.runtimePanel !== activeRuntimeTab);
    });
    if (activeRuntimeTab === "execution") {
      window.requestAnimationFrame(() => markdownEditorFor("ksFormExecutionPrompt")?.refresh());
    }
  }

  function selectedThemes() {
    return Array.from(document.querySelectorAll('#ksThemeChecks input[type="checkbox"]:checked')).map((checkbox) => checkbox.value);
  }

  function renderThemeSelectValue() {
    const themes = selectedThemes();
    $("ksThemeSelectedText").textContent = themes.length
      ? (themes.length <= 2 ? themes.join("、") : `${themes.slice(0, 2).join("、")} 等 ${themes.length} 项`)
      : "请选择适用分析主题";
    $("ksThemeSelectedCount").textContent = `已选 ${themes.length} 项`;
    $("ksThemeSelectedCount").classList.toggle("hidden", themes.length === 0);
    $("ksThemeDropdownCount").textContent = themes.length;
    document.querySelectorAll("[data-theme-option]").forEach((option) => {
      option.setAttribute("aria-selected", String(option.querySelector("input").checked));
    });
  }

  function filterThemeOptions(keyword) {
    const query = String(keyword || "").trim().toLowerCase();
    let visibleCount = 0;
    document.querySelectorAll("[data-theme-option]").forEach((option) => {
      const visible = !query || option.textContent.trim().toLowerCase().includes(query);
      option.classList.toggle("hidden", !visible);
      if (visible) visibleCount += 1;
    });
    $("ksThemeEmpty").classList.toggle("hidden", visibleCount > 0);
  }

  function setThemeDropdownOpen(open) {
    const isOpen = Boolean(open);
    $("ksThemeChecks").classList.toggle("is-open", isOpen);
    $("ksThemeDropdown").classList.toggle("hidden", !isOpen);
    $("ksThemeTrigger").setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      window.setTimeout(() => $("ksThemeSearch").focus(), 0);
      return;
    }
    $("ksThemeSearch").value = "";
    filterThemeOptions("");
  }

  function appendPromptTemplate(container, template) {
    const text = String(template || "");
    const pattern = /【([^【】\n]+)】/g;
    let cursor = 0;
    let match;
    container.replaceChildren();
    while ((match = pattern.exec(text))) {
      if (match.index > cursor) container.appendChild(document.createTextNode(text.slice(cursor, match.index)));
      container.appendChild(createUserPromptHint(match[1]));
      cursor = match.index + match[0].length;
    }
    if (cursor < text.length) container.appendChild(document.createTextNode(text.slice(cursor)));
  }

  function createUserPromptHint(label) {
    const hint = document.createElement("span");
    hint.className = "kse-editor-hint";
    hint.contentEditable = "false";
    hint.appendChild(document.createTextNode("【"));

    const editable = document.createElement("span");
    editable.className = "kse-editor-hint-text";
    editable.contentEditable = "true";
    editable.spellcheck = false;
    editable.textContent = String(label || "自定义").trim() || "自定义";
    hint.appendChild(editable);
    hint.appendChild(document.createTextNode("】"));
    return hint;
  }

  function serializeUserPrompt() {
    return String($("ksFormUserPrompt").innerText || $("ksFormUserPrompt").textContent || "")
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function updateCounts() {
    $("ksUserPromptCount").textContent = serializeUserPrompt().length;
    $("ksExecutionPromptCount").textContent = $("ksFormExecutionPrompt").value.length;
    $("ksReportContentPromptCount").textContent = $("ksFormReportContentPrompt").value.length;
    $("ksReportFormatPromptCount").textContent = $("ksFormReportFormatPrompt").value.length;
  }

  function userPromptHintLabels() {
    const labels = Array.from($("ksFormUserPrompt").querySelectorAll(".kse-editor-hint-text"))
      .map((node) => String(node.textContent || "").trim())
      .filter(Boolean);
    return [...new Set(labels)];
  }

  function renderUserPromptHints() {
    const container = $("ksUserPromptHintTools");
    const hints = userPromptHintLabels();
    container.innerHTML = [
      ...hints.map((hint) => `<button type="button" data-user-hint="${escapeHTML(hint)}">+ ${escapeHTML(hint)}</button>`),
      '<button type="button" class="is-add" data-add-user-hint>+ 新增</button>'
    ].join("");
  }

  function currentUserPromptRange() {
    const editor = $("ksFormUserPrompt");
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!range || !(range.commonAncestorContainer === editor || editor.contains(range.commonAncestorContainer))) return null;

    const commonElement = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
    const activeHint = commonElement?.closest?.(".kse-editor-hint");
    if (!activeHint) return range.cloneRange();

    const safeRange = document.createRange();
    safeRange.setStartAfter(activeHint);
    safeRange.collapse(true);
    return safeRange;
  }

  function insertUserHint(hint, options = {}) {
    const editor = $("ksFormUserPrompt");
    const selection = window.getSelection();
    let range = currentUserPromptRange();
    const isEditorRange = range && (range.commonAncestorContainer === editor || editor.contains(range.commonAncestorContainer));

    if (!isEditorRange) {
      range = document.createRange();
      const prompt = serializeUserPrompt();
      if (prompt && !/\s$/.test(editor.textContent || "")) {
        editor.appendChild(document.createTextNode(" "));
      }
      range.selectNodeContents(editor);
      range.collapse(false);
    } else {
      range.deleteContents();
    }

    const token = createUserPromptHint(hint);
    range.insertNode(token);

    const textAfterToken = document.createTextNode("");
    token.after(textAfterToken);

    if (options.edit) {
      const editable = token.querySelector(".kse-editor-hint-text");
      editable.focus();
      range.selectNodeContents(editable);
    } else {
      editor.focus();
      range.setStart(textAfterToken, 0);
      range.collapse(true);
    }
    selection?.removeAllRanges();
    selection?.addRange(range);

    updateCounts();
    renderUserPromptHints();
    markChanged("runtime");
  }

  function placeCaretOutsideHint(hint, after) {
    const editor = $("ksFormUserPrompt");
    let textNode = after ? hint.nextSibling : hint.previousSibling;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
      textNode = document.createTextNode("");
      if (after) hint.after(textNode);
      else hint.before(textNode);
    }
    editor.focus();
    const range = document.createRange();
    range.setStart(textNode, after ? 0 : textNode.textContent.length);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function inferThemes(text) {
    const rules = [
      { pattern: /成交|节资|采购/, value: "成交与节资" },
      { pattern: /采购方式|品类|招标|非招/, value: "采购方式与品类" },
      { pattern: /供应商|黑名单|投标/, value: "供应商管理" },
      { pattern: /效能|三率|闲废|采购周期/, value: "采购效能与闲废" },
      { pattern: /销售|渠道|产品/, value: "销售分析" },
      { pattern: /客户|客群|复购/, value: "客户分析" },
      { pattern: /库存|周转|积压/, value: "库存分析" },
      { pattern: /活动|转化|ROI/i, value: "活动分析" }
    ];
    const matches = rules.filter((rule) => rule.pattern.test(text)).map((rule) => rule.value);
    return [...new Set(matches.length ? matches : ["销售分析"])];
  }

  function structureForType(type) {
    if (["XLS", "XLSX"].includes(type)) {
      return {
        sections: 6, tables: 18, charts: 8, rules: 28,
        outline: ["数据封面", "指标工作表", "业务明细", "汇总透视", "图表看板", "口径说明"]
      };
    }
    if (["PPT", "PPTX"].includes(type)) {
      return {
        sections: 8, tables: 6, charts: 12, rules: 32,
        outline: ["封面", "目录", "核心结论", "指标概览", "结构分析", "风险建议"]
      };
    }
    if (["PNG", "JPG", "JPEG", "SVG"].includes(type)) {
      return {
        sections: 5, tables: 2, charts: 6, rules: 21,
        outline: ["主视觉", "标题区域", "指标信息", "图表区域", "说明信息"]
      };
    }
    return {
      sections: 7, tables: 14, charts: 11, rules: 36,
      outline: ["封面", "报告摘要", "核心指标", "结构分析", "效能分析", "风险与建议"]
    };
  }

  function isMonthlyProcurementTemplate(template) {
    const marker = `${template?.name || ""} ${template?.previewUrl || ""} ${template?.downloadUrl || ""}`;
    return /华润建材科技.*月度采购快报|monthly-procurement/i.test(marker);
  }

  function generateContentPrompt(template) {
    if (isMonthlyProcurementTemplate(template) && Store.procurementContentPrompt) {
      return Store.procurementContentPrompt;
    }
    const skillName = inferTemplateName(template.name);
    const outline = (template.analysisSummary?.outline || structureForType(template.type).outline).join("、");
    return `# 任务目标

根据授权业务数据生成“${skillName}”，并沿用上传模板识别出的内容结构。

# 报告结构

默认包含：${outline}。可以根据用户最终任务要求调整章节顺序或增删内容。

# 分析要求

- 结论前置，关键判断必须提供数据依据。
- 统一时间、组织、金额、数量和比例口径。
- 重点识别结构变化、异常问题、风险影响和改进建议。
- 信息不足时明确标记“数据暂缺”，不得编造数据。
- 固定月份和示例数值不写入长期提示词。`;
  }

  function generateFormatPrompt(template) {
    const type = template.type;
    const typeRule = ["XLS", "XLSX"].includes(type)
      ? "保留工作表层级、表头、冻结区域、数字格式和图表主题；明细数据与汇总区域清晰分离。"
      : (["PNG", "JPG", "JPEG", "SVG"].includes(type)
        ? "参考图片模板的版面比例、信息层级、对齐关系和视觉主题，不直接拉伸或裁切关键内容。"
        : "优先沿用模板的页面尺寸、标题层级、表格、图表、页眉页脚和分页规则。");
    return `# 模板适用原则

- 以“${template.name}”作为默认输出格式。
- ${typeRule}
- 用户明确调整篇幅、格式或呈现方式时，以用户最终要求为准。

# 页面与版式

- 保持信息层级清晰，标题、正文、表格和图表对齐稳定。
- 中文显示正常，元素不重叠、不溢出，跨页内容保持连续。
- 表格数字单位统一，图表标题、图例、单位和数据来源表达完整。
- 输出前检查页面结构、文字截断、异常留白和对象越界。`;
  }

  function buildUserPrompt(name, themes) {
    const focus = themes.slice(0, 3).join("、") || "经营表现";
    return `请生成一份【报告期间】【分析范围】的${name}。

重点分析${focus}，提炼有数据依据的核心结论、风险问题和改进建议。`;
  }

  function buildExecutionPrompt(name, themes) {
    return `# 角色

你是一名${name}生成助手，负责根据授权数据和用户最终任务要求完成分析。

# 执行优先级

1. 数据权限与安全边界。
2. 用户最终编辑的自然语言要求。
3. 内容提示词。
4. 文档格式提示词。

# 执行规则

- 适用分析主题：${themes.join("、")}。
- 校验时间、组织、指标、金额和比例口径。
- 所有结论必须有数据依据，信息不足时明确说明。
- 不得展示或推断用户权限范围外的数据。
- 用户修改默认任务后，以用户最终表达为准。`;
  }

  function canReplaceGenerated(type) {
    return ensureSources()[type] !== "manual";
  }

  function applyTemplateAnalysis(template) {
    const sources = ensureSources();
    const name = inferTemplateName(template.name);
    const themes = inferThemes(`${template.name} ${(template.analysisSummary?.outline || []).join(" ")}`);
    const generatedContent = generateContentPrompt(template);
    const generatedFormat = generateFormatPrompt(template);
    const preserved = [];

    template.generatedContentPrompt = generatedContent;
    template.generatedFormatPrompt = generatedFormat;
    template.generatedPrompt = combineReportPrompts(generatedContent, generatedFormat);

    if (canReplaceGenerated("content")) {
      setMarkdownValue("ksFormReportContentPrompt", generatedContent);
      sources.content = "template";
    } else {
      preserved.push("内容提示词");
    }

    if (canReplaceGenerated("format")) {
      setMarkdownValue("ksFormReportFormatPrompt", generatedFormat);
      sources.format = "template";
    } else {
      preserved.push("文档格式提示词");
    }

    if (canReplaceGenerated("basic")) {
      $("ksFormName").value = name;
      current.desc = `基于“${name}”模板，自动完成数据分析、内容生成和报告输出。`;
      $("ksFormCategory").value = /活动|专项/.test(name) ? "专项分析" : "经营报告";
      document.querySelectorAll('#ksThemeChecks input[type="checkbox"]').forEach((checkbox) => {
        checkbox.checked = themes.includes(checkbox.value);
      });
      renderThemeSelectValue();
      sources.basic = "template";
    } else {
      preserved.push("基础信息");
    }

    if (canReplaceGenerated("runtime")) {
      appendPromptTemplate(
        $("ksFormUserPrompt"),
        buildPromptOptimizationResult("business", buildUserPrompt(name, themes))
      );
      setMarkdownValue("ksFormExecutionPrompt", buildPromptOptimizationResult(
        "execution",
        buildExecutionPrompt(name, themes)
      ));
      sources.runtime = "template";
    } else {
      preserved.push("执行配置");
    }

    contentPromptSnapshot = generatedContent;
    formatPromptSnapshot = generatedFormat;
    updateCounts();
    renderUserPromptHints();
    renderSources();
    renderHeaderState();
    showToast(preserved.length
      ? `模板解析完成，已自动优化可更新配置，并保留人工修改的${preserved.join("、")}`
      : "模板解析完成，已自动优化并回填全部配置");
  }

  function clearParseTimers() {
    parseTimers.forEach((timer) => window.clearTimeout(timer));
    parseTimers = [];
    if (parseElapsedTimer) window.clearInterval(parseElapsedTimer);
    parseElapsedTimer = null;
  }

  function updateParseElapsed() {
    const elapsed = parseStartedAt ? (performance.now() - parseStartedAt) / 1000 : 0;
    $("ksParsingElapsed").textContent = `用时 ${elapsed.toFixed(1)}s`;
  }

  function startParseElapsed() {
    if (parseElapsedTimer) window.clearInterval(parseElapsedTimer);
    parseStartedAt = performance.now();
    updateParseElapsed();
    parseElapsedTimer = window.setInterval(updateParseElapsed, 100);
  }

  function stopParseElapsed() {
    if (parseElapsedTimer) window.clearInterval(parseElapsedTimer);
    parseElapsedTimer = null;
    updateParseElapsed();
  }

  function setParseDetailsExpanded(expanded) {
    parseDetailsExpanded = Boolean(expanded);
    $("ksParsingSteps").classList.toggle("hidden", !parseDetailsExpanded);
    $("ksParsingToggle").classList.toggle("is-expanded", parseDetailsExpanded);
    $("ksParsingToggle").setAttribute("aria-expanded", String(parseDetailsExpanded));
    $("ksParsingToggle").childNodes[0].nodeValue = parseDetailsExpanded ? "收起步骤" : "展开步骤";
  }

  function setStructureDetailsExpanded(expanded, userAction) {
    structureDetailsExpanded = Boolean(expanded);
    if (userAction) {
      structureDetailsTouched = true;
      if (structureAutoCollapseTimer) window.clearTimeout(structureAutoCollapseTimer);
      structureAutoCollapseTimer = null;
    }
    $("ksStructureDetail").classList.toggle("hidden", !structureDetailsExpanded);
    $("ksStructureToggle").classList.toggle("is-expanded", structureDetailsExpanded);
    $("ksStructureToggle").setAttribute("aria-expanded", String(structureDetailsExpanded));
    const label = $("ksStructureToggle").querySelector(":scope > em");
    if (label) label.childNodes[0].nodeValue = structureDetailsExpanded ? "收起详情" : "查看详情";
  }

  function templateParseFindings(template) {
    const resolvedTemplate = template || {};
    const summary = resolvedTemplate.analysisSummary || structureForType(resolvedTemplate.type);
    const themes = inferThemes(`${resolvedTemplate.name || ""} ${(summary.outline || []).join(" ")}`).slice(0, 3);
    return [
      `已确认 ${resolvedTemplate.type || "模板"} 文件可正常读取，文件基础校验通过`,
      `识别到 ${summary.sections} 个章节、${summary.tables} 个表格区域和 ${summary.charts} 个图表对象`,
      `识别到${themes.join("、") || "核心业务分析"}主题，并提取指标与数据范围`,
      "已形成内容提示词和文档格式提示词，并完成完整性校验",
      "已生成技能名称、分类、适用主题和系统执行配置",
      "全部生成结果已通过一致性检查，并完成左右配置自动回填"
    ];
  }

  function updateParseUI(stepIndex) {
    const safeIndex = Math.max(0, Math.min(stepIndex, PARSE_PHASES.length - 1));
    const phase = PARSE_PHASES[safeIndex];
    const template = current.reportTemplate || {};
    const findings = templateParseFindings(template);
    $("ksParsingTitle").textContent = "AI 模板解析过程";
    $("ksParsingText").textContent = phase.detail;
    $("ksParsingStepCount").textContent = `${safeIndex + 1} / ${PARSE_PHASES.length}`;
    $("ksParsingPercent").textContent = `${phase.percent}%`;
    $("ksParsingProgress").style.width = `${phase.percent}%`;
    document.querySelectorAll("[data-parse-step]").forEach((step, index) => {
      step.classList.toggle("is-complete", index < safeIndex);
      step.classList.toggle("is-active", index === safeIndex);
      step.querySelector("strong").textContent = PARSE_PHASES[index].title;
      const detail = step.querySelector("[data-parse-step-detail]");
      detail.textContent = index < safeIndex
        ? findings[index]
        : (index === safeIndex ? PARSE_PHASES[index].detail.replace(/^正在/, "") : "等待 AI 处理");
    });
    const activeStep = document.querySelector(`[data-parse-step="${safeIndex}"]`);
    if (parseDetailsExpanded && activeStep) {
      $("ksParsingSteps").scrollTo({
        top: Math.max(0, activeStep.offsetTop - $("ksParsingSteps").offsetTop - 8),
        behavior: "smooth"
      });
    }
  }

  function setTemplateIcon(type) {
    const icon = $("ksTemplateTypeIcon");
    icon.classList.remove("is-pdf", "is-sheet", "is-image", "is-slide");
    if (type === "PDF") icon.classList.add("is-pdf");
    if (["XLS", "XLSX"].includes(type)) icon.classList.add("is-sheet");
    if (["PNG", "JPG", "JPEG", "SVG"].includes(type)) icon.classList.add("is-image");
    if (["PPT", "PPTX"].includes(type)) icon.classList.add("is-slide");
  }

  function renderStructureSummary(template) {
    const summary = template.analysisSummary || structureForType(template.type);
    const findings = templateParseFindings(template);
    $("ksStructureSectionCount").textContent = summary.sections;
    $("ksStructureTableCount").textContent = summary.tables;
    $("ksStructureChartCount").textContent = summary.charts;
    $("ksStructureRuleCount").textContent = summary.rules;
    $("ksStructureOutline").innerHTML = summary.outline.map((item) => `<i>${escapeHTML(item)}</i>`).join("");
    $("ksTemplateSummaryText").textContent = `${summary.sections} 个章节 · ${summary.tables} 个表格 · ${summary.charts} 个图表 · ${summary.rules} 条规则`;
    $("ksCompleteParsingElapsed").textContent = template.parseDuration
      ? `已完成 · 用时 ${template.parseDuration}s`
      : "解析已完成";
    document.querySelectorAll("[data-complete-parse-step]").forEach((step, index) => {
      step.querySelector("strong").textContent = PARSE_PHASES[index].title;
      step.querySelector("[data-complete-parse-detail]").textContent = findings[index];
    });
  }

  function renderTemplate() {
    const template = current.reportTemplate;
    const hasTemplate = Boolean(template?.name);
    const isParsing = Boolean(hasTemplate && template.status === "parsing");
    const isComplete = Boolean(hasTemplate && !isParsing);

    $("ksTemplateEmpty").classList.toggle("hidden", hasTemplate);
    $("ksTemplateFileCard").classList.toggle("hidden", !hasTemplate);
    $("ksBtnReplaceTemplate").classList.toggle("hidden", !hasTemplate);
    $("ksTemplateParsing").classList.toggle("hidden", !isParsing);
    $("ksTemplateSummary").classList.toggle("hidden", !isComplete);
    $("kseSave").disabled = isParsing;
    document.body.classList.toggle("kse-is-parsing", isParsing);

    if (!hasTemplate) return;

    const type = template.type || extensionOf(template.name);
    $("ksTemplateName").textContent = template.name;
    $("ksTemplateMeta").textContent = `${type} · ${template.size || "文件大小未知"}`;
    $("ksTemplateStatus").textContent = isParsing ? "智能解析中" : "解析完成";
    $("ksTemplateStatus").classList.toggle("is-complete", isComplete);
    $("ksTemplateDownload").href = template.downloadUrl || "../../assets/docs/monthly-procurement-report.docx";
    $("ksTemplateDownload").setAttribute("download", template.name);
    setTemplateIcon(type);
    if (isParsing) {
      updateParseUI(0);
      setParseDetailsExpanded(parseDetailsExpanded);
    }
    if (isComplete) {
      renderStructureSummary(template);
      setStructureDetailsExpanded(structureDetailsExpanded, false);
    }
  }

  function handleTemplateFile(file) {
    if (!file) return;
    const extension = extensionOf(file.name);
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      showToast("请选择 Word、PDF、Excel、PPT 或图片模板文件");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast("模板文件不能超过 50 MB");
      return;
    }

    clearParseTimers();
    if (structureAutoCollapseTimer) window.clearTimeout(structureAutoCollapseTimer);
    structureAutoCollapseTimer = null;
    structureDetailsTouched = false;
    structureDetailsExpanded = false;
    setParseDetailsExpanded(true);
    const parseToken = ++templateParseToken;
    const objectUrl = URL.createObjectURL(file);
    const summary = structureForType(extension);
    current.reportTemplate = {
      name: file.name,
      type: extension,
      size: formatFileSize(file.size),
      source: "uploaded",
      status: "parsing",
      previewUrl: objectUrl,
      downloadUrl: objectUrl,
      analysisSummary: summary,
      parseDuration: "",
      generatedContentPrompt: "",
      generatedFormatPrompt: "",
      generatedPrompt: ""
    };
    markTestStale();
    setDirty(true);
    renderTemplate();
    startParseElapsed();
    showToast("模板已上传，正在智能解析结构与配置");

    PARSE_PHASES.forEach((phase, index) => {
      const timer = window.setTimeout(() => {
        if (parseToken !== templateParseToken || current.reportTemplate?.status !== "parsing") return;
        updateParseUI(index);
        if (index !== PARSE_PHASES.length - 1) return;

        document.querySelectorAll("[data-parse-step]").forEach((step) => {
          step.classList.remove("is-active");
          step.classList.add("is-complete");
        });
        current.reportTemplate.parseDuration = Math.max(
          0.1,
          (performance.now() - parseStartedAt) / 1000
        ).toFixed(1);
        stopParseElapsed();
        current.reportTemplate.status = "completed";
        applyTemplateAnalysis(current.reportTemplate);
        renderTemplate();
        setStructureDetailsExpanded(false, false);
        setDirty(true);
      }, index === 0 ? 80 : 520 * index + 160);
      parseTimers.push(timer);
    });
  }

  function removeTemplate() {
    clearParseTimers();
    if (structureAutoCollapseTimer) window.clearTimeout(structureAutoCollapseTimer);
    structureAutoCollapseTimer = null;
    templateParseToken += 1;
    structureDetailsExpanded = false;
    structureDetailsTouched = false;
    setParseDetailsExpanded(false);
    current.reportTemplate = null;
    ensureSources().content = "manual";
    ensureSources().format = "manual";
    markTestStale();
    setDirty(true);
    renderTemplate();
    renderSources();
    showToast("已移除模板，当前提示词和其他配置仍保留");
  }

  function openTemplatePreview() {
    const template = current.reportTemplate;
    if (!template?.name) return;
    const query = new URLSearchParams({
      name: template.name,
      type: template.type || extensionOf(template.name),
      src: template.previewUrl || template.downloadUrl || "",
      download: template.downloadUrl || template.previewUrl || ""
    });
    window.open(`knowledge-skill-template-preview.html?${query.toString()}`, "_blank", "noopener");
  }

  function promptOptimizationMeta(type) {
    const meta = {
      content: {
        label: "内容提示词",
        field: $("ksFormReportContentPrompt"),
        original: $("ksFormReportContentPrompt").value.trim(),
        summary: "已强化报告结构、数据锚点、异常分析和建议动作要求。"
      },
      format: {
        label: "文档格式提示词",
        field: $("ksFormReportFormatPrompt"),
        original: $("ksFormReportFormatPrompt").value.trim(),
        summary: "已强化标题层级、图表表达、表格跨页和版式稳定要求。"
      },
      business: {
        label: "业务端预置提示词",
        field: $("ksFormUserPrompt"),
        original: serializeUserPrompt(),
        summary: "已补充填写引导、分析重点和输出要求，业务端仍可继续编辑。"
      },
      execution: {
        label: "系统执行指令",
        field: $("ksFormExecutionPrompt"),
        original: $("ksFormExecutionPrompt").value.trim(),
        summary: "已补充执行顺序、数据边界、质量校验和异常处理要求。"
      }
    };
    return meta[type];
  }

  function stripGeneratedTail(value, marker) {
    const original = String(value || "").trim().replace(/\n{3,}/g, "\n\n");
    const markerIndex = original.lastIndexOf(marker);
    return markerIndex >= 0 ? original.slice(0, markerIndex).trim() : original;
  }

  function promptOptimizationRules(type, themes) {
    const rules = {
      content: {
        marker: "# 智能优化补充",
        modifyPatterns: [/关键结论必须有数据依据/, /^根据用户最终/, /核心结论前置/],
        deletePatterns: [/参考模板表达方式/, /不能只替换数字/, /正文重点解释结构变化/],
        guard: "同时标注统计期间、适用范围、指标口径和数据来源",
        suffix: "；同时标注统计期间、适用范围、指标口径和数据来源。",
        addition: `# 智能优化补充

- 保持报告结构完整，从封面、核心指标到专项分析和管理建议逐层展开。
- 核心结论前置，并为每项判断补充期间、范围、指标值和对比值等数据锚点。
- 明确区分事实、分析判断和行动建议，避免无依据推断或机械复述表格。
- 对异常指标补充影响范围、风险等级和可执行建议；信息不足时标记“数据暂缺”。`
      },
      format: {
        marker: "# 智能优化补充",
        modifyPatterns: [/检查内容准确、中文正常/, /页面使用 A4/, /正文使用 Normal/],
        deletePatterns: [/标题和正文默认使用黑色/, /优先复用上传模板已有的主题/],
        guard: "并逐页校验跨页、对齐、截断和对象边界",
        suffix: "；并逐页校验跨页、对齐、截断和对象边界。",
        addition: `# 智能优化补充

- 保持封面、标题、正文、表格、图表和题注的层级与间距一致。
- 图表必须完整展示标题、单位、图例、坐标轴和数据来源，沿用模板主题。
- 长表格跨页时重复表头，避免文字、图片或图表截断、重叠和越界。
- 输出前检查分页、分节、对象对齐和异常留白，保证打印与预览稳定。`
      },
      business: {
        marker: "【智能优化补充】",
        modifyPatterns: [/^请生成/, /^请基于授权数据生成/],
        deletePatterns: [/^重点分析/],
        guard: "并在生成前确认报告期间、分析范围和重点指标",
        suffix: "，并在生成前确认报告期间、分析范围和重点指标。",
        addition: `【智能优化补充】
重点围绕${themes}形成结论；对异常变化说明数据依据、影响范围和建议动作。生成结果时保持重点清晰、表达简洁，缺少信息时明确提示需要补充的内容。`
      },
      execution: {
        marker: "# 智能优化执行补充",
        modifyPatterns: [/你是一名/, /^请以用户最终/, /负责根据授权数据/],
        deletePatterns: [/^4\. 文档格式提示词/, /用户删除或改写默认任务/],
        guard: "执行前必须确认任务目标、授权范围和输出格式",
        suffix: "；执行前必须确认任务目标、授权范围和输出格式。",
        addition: `# 智能优化执行补充

- 先识别用户最终任务中的分析期间、业务范围、重点指标和输出要求，再执行数据查询与报告生成。
- 严格限制在当前用户授权范围内取数，统一时间、组织、金额、数量、比例及同比环比口径。
- 所有结论必须提供数据依据；缺少数据时标记“数据暂缺”，发现异常值时保留原值并标记“待核验”。
- 输出前校验正文、表格和图表口径一致，确保风险判断与建议能够对应具体数据问题。`
      }
    };
    return rules[type] || rules.execution;
  }

  function buildPromptOptimizationResult(type, original) {
    const themes = selectedThemes().slice(0, 4).join("、") || "核心业务指标";
    const rules = promptOptimizationRules(type, themes);
    const base = stripGeneratedTail(original, rules.marker);
    const lines = base.replace(/\r/g, "").split("\n");
    const candidates = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.trim() && !/^#{1,6}\s/.test(line.trim()) && line.trim() !== rules.marker);
    const findCandidate = (patterns, excludedIndex) => candidates.find(({ line, index }) => (
      index !== excludedIndex && patterns.some((pattern) => pattern.test(line.trim()))
    ));
    const alreadyOptimized = base.includes(rules.guard);
    const modifyCandidate = alreadyOptimized
      ? null
      : (findCandidate(rules.modifyPatterns, -1) || candidates[0] || null);
    const deleteCandidate = alreadyOptimized
      ? null
      : (
        findCandidate(rules.deletePatterns, modifyCandidate?.index)
        || [...candidates].reverse().find(({ index }) => index !== modifyCandidate?.index)
        || null
      );

    if (modifyCandidate) {
      const source = lines[modifyCandidate.index].trim().replace(/[。；，]+$/, "");
      lines[modifyCandidate.index] = `${source}${rules.suffix}`;
    }
    if (deleteCandidate) lines.splice(deleteCandidate.index, 1);

    const optimizedBase = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    return `${optimizedBase}\n\n${rules.addition}`.trim();
  }

  function buildLineDiff(original, output) {
    const beforeLines = String(original || "").replace(/\r/g, "").split("\n");
    const afterLines = String(output || "").replace(/\r/g, "").split("\n");
    const rows = beforeLines.length + 1;
    const columns = afterLines.length + 1;
    const lcs = Array.from({ length: rows }, () => new Uint16Array(columns));

    for (let beforeIndex = beforeLines.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
      for (let afterIndex = afterLines.length - 1; afterIndex >= 0; afterIndex -= 1) {
        lcs[beforeIndex][afterIndex] = beforeLines[beforeIndex] === afterLines[afterIndex]
          ? lcs[beforeIndex + 1][afterIndex + 1] + 1
          : Math.max(lcs[beforeIndex + 1][afterIndex], lcs[beforeIndex][afterIndex + 1]);
      }
    }

    const operations = [];
    let beforeIndex = 0;
    let afterIndex = 0;
    while (beforeIndex < beforeLines.length || afterIndex < afterLines.length) {
      if (
        beforeIndex < beforeLines.length
        && afterIndex < afterLines.length
        && beforeLines[beforeIndex] === afterLines[afterIndex]
      ) {
        operations.push({ type: "equal", line: beforeLines[beforeIndex] });
        beforeIndex += 1;
        afterIndex += 1;
      } else if (
        afterIndex >= afterLines.length
        || (
          beforeIndex < beforeLines.length
          && lcs[beforeIndex + 1][afterIndex] >= lcs[beforeIndex][afterIndex + 1]
        )
      ) {
        operations.push({ type: "delete", line: beforeLines[beforeIndex] });
        beforeIndex += 1;
      } else {
        operations.push({ type: "insert", line: afterLines[afterIndex] });
        afterIndex += 1;
      }
    }

    const rawSegments = [];
    operations.forEach((operation) => {
      const previous = rawSegments[rawSegments.length - 1];
      if (operation.type === "equal") {
        if (previous?.type === "equal") previous.lines.push(operation.line);
        else rawSegments.push({ type: "equal", lines: [operation.line] });
        return;
      }

      let change = previous;
      if (!change || change.type !== "change") {
        change = { type: "change", deleted: [], added: [] };
        rawSegments.push(change);
      }
      if (operation.type === "delete") change.deleted.push(operation.line);
      else change.added.push(operation.line);
    });

    const segments = [];
    let changeIndex = 0;
    let hasModification = false;
    const appendChange = (kind, deleted, added) => {
      const cleanDeleted = deleted.filter((line) => line.trim());
      const cleanAdded = added.filter((line) => line.trim());
      if (!cleanDeleted.length && !cleanAdded.length) return;
      changeIndex += 1;
      segments.push({
        type: "change",
        kind,
        index: changeIndex,
        deleted: cleanDeleted,
        added: cleanAdded
      });
    };

    rawSegments.forEach((segment) => {
      if (segment.type === "equal") {
        segments.push(segment);
        return;
      }
      const deleted = segment.deleted.filter((line) => line.trim());
      const added = segment.added.filter((line) => line.trim());
      if (deleted.length && added.length && !hasModification) {
        appendChange("modify", deleted.slice(0, 1), added.slice(0, 1));
        hasModification = true;
        appendChange("delete", deleted.slice(1), []);
        appendChange("add", [], added.slice(1));
        return;
      }
      if (deleted.length && added.length) {
        appendChange("delete", deleted, []);
        appendChange("add", [], added);
        return;
      }
      if (deleted.length) appendChange("delete", deleted, []);
      if (added.length) appendChange("add", [], added);
    });
    return segments;
  }

  function renderDiffChange(segment, side) {
    const isBefore = side === "before";
    const lines = isBefore ? segment.deleted : segment.added;
    const hasContent = lines.length > 0;
    const stateClass = hasContent ? (isBefore ? "is-deleted" : "is-added") : "is-placeholder";
    const labels = {
      modify: isBefore ? "修改前" : "修改后",
      delete: isBefore ? "删除内容" : "优化后已删除",
      add: isBefore ? "原文无对应内容" : "新增内容"
    };
    const actionLabel = labels[segment.kind] || (isBefore ? "调整前" : "调整后");
    const detail = hasContent
      ? `${lines.length} 行`
      : (segment.kind === "add" ? "右侧新增" : "左侧已标出");
    const content = hasContent
      ? escapeHTML(lines.join("\n"))
      : escapeHTML(segment.kind === "add"
        ? "原提示词中没有对应内容"
        : "该内容已从优化结果中移除");
    return `
      <section class="kse-diff-change ${stateClass}">
        <div class="kse-diff-change-head">
          <b>调整 ${segment.index} · ${actionLabel}</b>
          <span>${detail}</span>
        </div>
        <div class="kse-diff-change-body">${content}</div>
      </section>
    `;
  }

  function renderPromptDiff(original, output) {
    const segments = buildLineDiff(original, output);
    const renderSide = (side) => segments.map((segment) => {
      if (segment.type === "equal") {
        return `<div class="kse-diff-unchanged">${escapeHTML(segment.lines.join("\n"))}</div>`;
      }
      return renderDiffChange(segment, side);
    }).join("");

    const before = $("kseOptimizeOriginal");
    const after = $("kseOptimizeOutput");
    before.innerHTML = renderSide("before");
    after.innerHTML = renderSide("after");
    before.scrollTop = 0;
    after.scrollTop = 0;
  }

  function promptDiffStats(original, output) {
    return buildLineDiff(original, output).reduce((stats, segment) => {
      if (segment.type !== "change") return stats;
      stats[segment.kind] += 1;
      stats.total += 1;
      return stats;
    }, { add: 0, modify: 0, delete: 0, total: 0 });
  }

  function clearPromptOptimizeTimers() {
    promptOptimizeTimers.forEach((timer) => window.clearTimeout(timer));
    promptOptimizeTimers = [];
    if (promptOptimizeElapsedTimer) window.clearInterval(promptOptimizeElapsedTimer);
    promptOptimizeElapsedTimer = null;
  }

  function updatePromptOptimizeElapsed() {
    const elapsed = promptOptimizeStartedAt ? (performance.now() - promptOptimizeStartedAt) / 1000 : 0;
    $("kseOptimizeElapsed").textContent = `用时 ${elapsed.toFixed(1)}s`;
  }

  function startPromptOptimizeElapsed() {
    if (promptOptimizeElapsedTimer) window.clearInterval(promptOptimizeElapsedTimer);
    promptOptimizeStartedAt = performance.now();
    updatePromptOptimizeElapsed();
    promptOptimizeElapsedTimer = window.setInterval(updatePromptOptimizeElapsed, 100);
  }

  function stopPromptOptimizeElapsed() {
    if (promptOptimizeElapsedTimer) window.clearInterval(promptOptimizeElapsedTimer);
    promptOptimizeElapsedTimer = null;
    updatePromptOptimizeElapsed();
  }

  function promptOptimizeFinding(index) {
    const pending = pendingPromptOptimization;
    const stats = pending?.diffStats || { add: 0, modify: 0, delete: 0, total: 0 };
    const findings = [
      `已识别${pending?.label || "当前提示词"}的任务目标、使用场景和约束边界`,
      `发现 ${stats.delete} 处可删除内容、${stats.modify} 处表达待改写，并识别 ${stats.add} 组缺失规则`,
      `已形成删除 ${stats.delete} 处、修改 ${stats.modify} 处、新增 ${stats.add} 组的调整方案`,
      `已生成 ${stats.total} 组差异，新增、修改和删除内容均已建立左右对应标记`
    ];
    return findings[index] || "处理完成";
  }

  function setPromptOptimizePhase(index) {
    const phase = PROMPT_OPTIMIZE_PHASES[index];
    if (!phase || !pendingPromptOptimization) return;
    $("kseOptimizeStatus").textContent = phase.title;
    $("kseOptimizeStatusDetail").textContent = phase.detail;
    $("kseOptimizeBar").style.width = `${phase.percent}%`;
    $("kseOptimizeProgressText").textContent = `${phase.percent}%`;
    document.querySelectorAll("[data-optimize-step]").forEach((step, stepIndex) => {
      step.classList.toggle("is-active", stepIndex === index);
      step.classList.toggle("is-complete", stepIndex < index);
      const finding = step.querySelector("[data-optimize-finding]");
      finding.textContent = stepIndex < index
        ? promptOptimizeFinding(stepIndex)
        : (stepIndex === index ? PROMPT_OPTIMIZE_PHASES[stepIndex].detail : "等待 AI 处理");
    });
    if (index === PROMPT_OPTIMIZE_PHASES.length - 1) {
      promptOptimizeTimers.push(window.setTimeout(showPromptOptimizationResult, 460));
    }
  }

  function showPromptOptimizationResult() {
    if (!pendingPromptOptimization) return;
    pendingPromptOptimization.ready = true;
    document.querySelectorAll("[data-optimize-step]").forEach((step) => {
      step.classList.remove("is-active");
      step.classList.add("is-complete");
      const stepIndex = Number(step.querySelector("i")?.textContent || 1) - 1;
      step.querySelector("[data-optimize-finding]").textContent = promptOptimizeFinding(stepIndex);
    });
    stopPromptOptimizeElapsed();
    $("kseOptimizeProgress").classList.add("hidden");
    $("kseOptimizeResult").classList.remove("hidden");
    renderPromptDiff(pendingPromptOptimization.original, pendingPromptOptimization.output);
    const stats = pendingPromptOptimization.diffStats;
    $("kseOptimizeSummary").textContent = `${pendingPromptOptimization.summary} 本次包含新增 ${stats.add} 组、修改 ${stats.modify} 处、删除 ${stats.delete} 处。`;
    $("kseOptimizeSubtitle").textContent = "优化结果已生成，确认后将替换当前内容。";
    $("kseOptimizeFootNote").textContent = "取消返回不会修改当前内容";
    $("kseOptimizeConfirm").disabled = false;
  }

  function openPromptOptimization(type) {
    const meta = promptOptimizationMeta(type);
    if (!meta.original) {
      showToast(`请先填写${meta.label}`);
      meta.field.focus();
      return;
    }

    clearPromptOptimizeTimers();
    const output = buildPromptOptimizationResult(type, meta.original);
    pendingPromptOptimization = {
      type,
      label: meta.label,
      original: meta.original,
      output,
      diffStats: promptDiffStats(meta.original, output),
      summary: meta.summary,
      ready: false
    };

    $("kseOptimizeTitle").textContent = `智能优化 · ${meta.label}`;
    $("kseOptimizeSubtitle").textContent = "正在理解当前提示词并生成优化结果。";
    $("kseOptimizeOriginal").innerHTML = "";
    $("kseOptimizeOutput").innerHTML = "";
    $("kseOptimizeProgress").classList.remove("hidden");
    $("kseOptimizeResult").classList.add("hidden");
    $("kseOptimizeBar").style.width = "0";
    $("kseOptimizeProgressText").textContent = "0%";
    $("kseOptimizeStatus").textContent = "正在准备智能优化";
    $("kseOptimizeStatusDetail").textContent = "正在读取当前内容，请稍候。";
    $("kseOptimizeFootNote").textContent = "优化过程中不会修改当前内容";
    $("kseOptimizeConfirm").disabled = true;
    document.querySelectorAll("[data-optimize-step]").forEach((step) => {
      step.classList.remove("is-active", "is-complete");
      step.querySelector("[data-optimize-finding]").textContent = "等待 AI 处理";
    });
    $("kseOptimizeMask").classList.remove("hidden");
    $("kseOptimizeModal").classList.remove("hidden");
    startPromptOptimizeElapsed();

    [120, 780, 1450, 2120].forEach((delay, index) => {
      promptOptimizeTimers.push(window.setTimeout(() => setPromptOptimizePhase(index), delay));
    });
  }

  function closePromptOptimization() {
    clearPromptOptimizeTimers();
    pendingPromptOptimization = null;
    $("kseOptimizeMask").classList.add("hidden");
    $("kseOptimizeModal").classList.add("hidden");
  }

  function confirmPromptOptimization() {
    if (!pendingPromptOptimization?.ready) return;
    const { type, label, output } = pendingPromptOptimization;
    const meta = promptOptimizationMeta(type);
    const target = meta.field;
    if (type === "business") {
      appendPromptTemplate(target, output);
      renderUserPromptHints();
    } else {
      setMarkdownValue(target, output);
    }
    updateCounts();
    markChanged(["content", "format"].includes(type) ? type : "runtime");
    closePromptOptimization();
    target.focus();
    showToast(`${label}已替换为智能优化结果`);
  }

  function resetPrompt(type) {
    const isFormat = type === "format";
    const field = isFormat ? $("ksFormReportFormatPrompt") : $("ksFormReportContentPrompt");
    const snapshot = isFormat ? formatPromptSnapshot : contentPromptSnapshot;
    if (!snapshot) {
      showToast("当前没有可恢复的模板解析版本");
      return;
    }
    setMarkdownValue(field, snapshot);
    ensureSources()[type] = current.reportTemplate?.source === "uploaded" ? "template" : "system";
    markTestStale();
    setDirty(true);
    updateCounts();
    renderSources();
    showToast(`已恢复${isFormat ? "文档格式" : "内容"}提示词的解析版本`);
  }

  function populateForm() {
    isPopulating = true;
    $("ksFormName").value = current.name || "";
    $("ksFormCategory").value = current.category || "经营报告";
    document.querySelectorAll('#ksThemeChecks input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = (current.themes || []).includes(checkbox.value);
    });
    renderThemeSelectValue();
    appendPromptTemplate($("ksFormUserPrompt"), current.userPrompt || "");
    setMarkdownValue("ksFormExecutionPrompt", current.executionPrompt || "", { resetHistory: true });
    setMarkdownValue("ksFormReportContentPrompt", current.reportContentPrompt || current.reportPrompt || "", { resetHistory: true });
    setMarkdownValue("ksFormReportFormatPrompt", current.reportFormatPrompt || "", { resetHistory: true });
    contentPromptSnapshot = current.reportTemplate?.generatedContentPrompt || current.reportContentPrompt || current.reportPrompt || "";
    formatPromptSnapshot = current.reportTemplate?.generatedFormatPrompt || current.reportFormatPrompt || "";
    ensureSources();
    updateCounts();
    renderUserPromptHints();
    renderTemplate();
    renderSources();
    setDirty(false);
    isPopulating = false;
  }

  function collectCurrent() {
    const reportContentPrompt = $("ksFormReportContentPrompt").value.trim();
    const reportFormatPrompt = $("ksFormReportFormatPrompt").value.trim();
    const name = $("ksFormName").value.trim();
    return {
      id: current.id || "",
      kind: current.kind || "monthly",
      name,
      code: current.code || `custom_skill_${Date.now()}`,
      desc: current.desc || (name ? `用于完成${name}相关的数据分析与报告生成。` : ""),
      category: $("ksFormCategory").value || "经营报告",
      themes: selectedThemes(),
      userPrompt: serializeUserPrompt(),
      executionPrompt: $("ksFormExecutionPrompt").value.trim(),
      reportContentPrompt,
      reportFormatPrompt,
      reportPrompt: combineReportPrompts(reportContentPrompt, reportFormatPrompt),
      reportTemplate: current.reportTemplate ? Store.clone(current.reportTemplate) : null,
      sampleVersion: current.sampleVersion || "",
      configSources: { ...ensureSources() },
      testStatus: current.testStatus || "untested",
      workflowStatus: current.workflowStatus || "draft",
      enabled: isCreate ? false : current.enabled !== false,
      sort: Number(current.sort) || Math.max(...skills.map((item) => Number(item.sort) || 0), 0) + 10,
      updated: "2026-07-19"
    };
  }

  function validationError(message, element) {
    showToast(message);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => element?.focus(), 220);
    return false;
  }

  function validateForPublish(data) {
    if (!data.reportTemplate?.name) return validationError("请先上传模板文件", $("ksTemplateEmpty"));
    if (data.reportTemplate.status === "parsing") return validationError("模板仍在解析，请稍候", $("ksTemplateParsing"));
    if (!data.reportContentPrompt) {
      setPromptTab("content");
      return validationError("请填写内容提示词", $("ksFormReportContentPrompt"));
    }
    if (!data.reportFormatPrompt) {
      setPromptTab("format");
      return validationError("请填写文档格式提示词", $("ksFormReportFormatPrompt"));
    }
    if (!data.name) return validationError("请填写技能名称", $("ksFormName"));
    if (!data.category) return validationError("请选择技能分类", $("ksFormCategory"));
    if (!data.themes.length) {
      setThemeDropdownOpen(true);
      return validationError("请至少选择一个适用分析主题", $("ksThemeTrigger"));
    }
    if (!data.userPrompt) {
      setRuntimeTab("business");
      return validationError("请填写业务端预置提示词", $("ksFormUserPrompt"));
    }
    if (!data.executionPrompt) {
      setRuntimeTab("execution");
      return validationError("请填写系统执行指令", $("ksFormExecutionPrompt"));
    }
    return true;
  }

  function saveSkill(mode) {
    const publish = mode === "publish";
    const data = collectCurrent();
    if (publish && !validateForPublish(data)) return;

    if (!data.name) {
      data.name = current.reportTemplate?.name ? inferTemplateName(current.reportTemplate.name) : "未命名技能草稿";
      $("ksFormName").value = data.name;
    }

    let savedRecord;
    if (isCreate) {
      data.id = `skill-${Date.now()}`;
      savedRecord = publish
        ? { ...data, workflowStatus: "published", draftConfig: null }
        : { ...data, enabled: false, workflowStatus: "draft", draftConfig: Store.clone(data) };
      skills.push(savedRecord);
      isCreate = false;
      window.history.replaceState({}, "", `knowledge-skill-edit.html?id=${encodeURIComponent(data.id)}`);
    } else {
      const index = skills.findIndex((item) => item.id === current.id);
      const stored = index >= 0 ? skills[index] : (persistedRecord || {});
      if (publish) {
        savedRecord = { ...data, id: current.id, workflowStatus: "published", draftConfig: null };
      } else if (stored.workflowStatus === "draft" && !stored.enabled) {
        savedRecord = { ...data, id: current.id, enabled: false, workflowStatus: "draft", draftConfig: Store.clone(data) };
      } else {
        savedRecord = {
          ...stored,
          id: current.id,
          draftConfig: Store.clone(data),
          updated: data.updated
        };
      }
      if (index >= 0) skills[index] = savedRecord;
      else skills.push(savedRecord);
    }

    skills = Store.save(skills);
    persistedRecord = Store.clone(skills.find((item) => item.id === data.id) || savedRecord);
    current = publish
      ? Store.clone(persistedRecord)
      : { ...Store.clone(data), id: persistedRecord.id, draftConfig: Store.clone(data) };
    contentPromptSnapshot = current.reportTemplate?.generatedContentPrompt || current.reportContentPrompt;
    formatPromptSnapshot = current.reportTemplate?.generatedFormatPrompt || current.reportFormatPrompt;
    setDirty(false);
    renderTemplate();
    renderSources();
    updateCounts();
    showToast(publish
      ? `技能“${data.name}”已保存`
      : `技能“${data.name}”草稿已保存，正式版本未变更`);
  }

  function openLeaveModal() {
    $("kseLeaveMask").classList.remove("hidden");
    $("kseLeaveModal").classList.remove("hidden");
  }

  function closeLeaveModal() {
    $("kseLeaveMask").classList.add("hidden");
    $("kseLeaveModal").classList.add("hidden");
  }

  function returnToList() {
    if (dirty) return openLeaveModal();
    allowLeave = true;
    window.location.href = "knowledge-skill.html";
  }

  function confirmReturnToList() {
    allowLeave = true;
    window.location.href = "knowledge-skill.html";
  }

  function sourceTypeForElement(target) {
    if (target === $("ksFormReportContentPrompt")) return "content";
    if (target === $("ksFormReportFormatPrompt")) return "format";
    if (target === $("ksFormExecutionPrompt") || target === $("ksFormUserPrompt") || $("ksFormUserPrompt").contains(target)) return "runtime";
    if (target === $("ksFormName") || target === $("ksFormCategory") || target.closest?.("#ksThemeChecks")) return "basic";
    return "";
  }

  document.querySelector(".kse-editor-main").addEventListener("input", (event) => {
    if (isPopulating) return;
    if (event.target === $("ksThemeSearch")) return;
    const isPrompt = event.target === $("ksFormUserPrompt") || $("ksFormUserPrompt").contains(event.target);
    if (!event.target.matches("input, textarea, select") && !isPrompt) return;
    updateCounts();
    if (event.target === $("ksFormName")) renderHeaderState();
    if (isPrompt) renderUserPromptHints();
    markChanged(sourceTypeForElement(event.target));
  });

  document.querySelector(".kse-editor-main").addEventListener("change", (event) => {
    if (isPopulating || !event.target.matches("input, textarea, select")) return;
    if (event.target === $("ksThemeSearch")) return;
    markChanged(sourceTypeForElement(event.target));
  });

  $("ksFormUserPrompt").addEventListener("paste", (event) => {
    event.preventDefault();
    const isHintText = event.target.closest?.(".kse-editor-hint-text");
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, isHintText ? text.replace(/[【】\r\n]/g, "") : text);
  });
  $("ksFormUserPrompt").addEventListener("keydown", (event) => {
    const editable = event.target.closest?.(".kse-editor-hint-text");
    if (!editable || event.key !== "Enter") return;
    event.preventDefault();
    placeCaretOutsideHint(editable.closest(".kse-editor-hint"), true);
  });
  $("ksFormUserPrompt").addEventListener("focusout", (event) => {
    const editable = event.target.closest?.(".kse-editor-hint-text");
    if (!editable || editable.textContent.trim()) return;
    editable.textContent = "自定义";
    updateCounts();
    renderUserPromptHints();
    markChanged("runtime");
  });

  $("ksUserPromptHintTools").addEventListener("click", (event) => {
    const button = event.target.closest("[data-user-hint]");
    if (button) {
      insertUserHint(button.dataset.userHint);
      return;
    }
    if (event.target.closest("[data-add-user-hint]")) insertUserHint("自定义", { edit: true });
  });
  $("ksUserPromptHintTools").addEventListener("mousedown", (event) => {
    if (event.target.closest("[data-user-hint], [data-add-user-hint]")) event.preventDefault();
  });

  document.querySelector(".kse-prompt-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-prompt-tab]");
    if (button) setPromptTab(button.dataset.promptTab);
  });
  document.querySelector(".kse-prompt-tabs").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    setPromptTab(activePromptTab === "content" ? "format" : "content", true);
  });
  document.querySelector(".kse-runtime-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-runtime-tab]");
    if (button) setRuntimeTab(button.dataset.runtimeTab);
  });
  document.querySelector(".kse-runtime-tabs").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    setRuntimeTab(activeRuntimeTab === "business" ? "execution" : "business", true);
  });

  $("ksThemeTrigger").addEventListener("click", () => {
    setThemeDropdownOpen($("ksThemeDropdown").classList.contains("hidden"));
  });
  $("ksThemeSearch").addEventListener("input", (event) => filterThemeOptions(event.target.value));
  $("ksThemeChecks").addEventListener("change", (event) => {
    if (event.target.matches('input[type="checkbox"]')) renderThemeSelectValue();
  });
  $("ksThemeClear").addEventListener("click", () => {
    const checked = document.querySelectorAll('#ksThemeChecks input[type="checkbox"]:checked');
    if (!checked.length) return;
    checked.forEach((checkbox) => {
      checkbox.checked = false;
    });
    renderThemeSelectValue();
    markChanged("basic");
  });

  $("ksTemplateEmpty").addEventListener("click", () => $("ksTemplateFile").click());
  $("ksBtnReplaceTemplate").addEventListener("click", () => $("ksTemplateFile").click());
  $("ksTemplateFile").addEventListener("change", (event) => {
    handleTemplateFile(event.target.files?.[0]);
    event.target.value = "";
  });
  $("ksTemplateEmpty").addEventListener("dragover", (event) => {
    event.preventDefault();
    $("ksTemplateEmpty").classList.add("is-dragover");
  });
  $("ksTemplateEmpty").addEventListener("dragleave", () => $("ksTemplateEmpty").classList.remove("is-dragover"));
  $("ksTemplateEmpty").addEventListener("drop", (event) => {
    event.preventDefault();
    $("ksTemplateEmpty").classList.remove("is-dragover");
    handleTemplateFile(event.dataTransfer?.files?.[0]);
  });
  $("ksTemplatePreview").addEventListener("click", openTemplatePreview);
  $("ksBtnRemoveTemplate").addEventListener("click", removeTemplate);
  $("ksParsingToggle").addEventListener("click", () => setParseDetailsExpanded(!parseDetailsExpanded));
  $("ksStructureToggle").addEventListener("click", () => setStructureDetailsExpanded(!structureDetailsExpanded, true));
  $("ksTemplateDownload").addEventListener("click", (event) => {
    if ($("ksTemplateDownload").getAttribute("href") === "#") {
      event.preventDefault();
      showToast("当前模板暂无可下载文件");
    }
  });

  $("ksBtnOptimizeContentPrompt").addEventListener("click", () => openPromptOptimization("content"));
  $("ksBtnOptimizeFormatPrompt").addEventListener("click", () => openPromptOptimization("format"));
  $("ksBtnOptimizeBusinessPrompt").addEventListener("click", () => openPromptOptimization("business"));
  $("ksBtnOptimizeExecutionPrompt").addEventListener("click", () => openPromptOptimization("execution"));
  $("ksBtnResetContentPrompt").addEventListener("click", () => resetPrompt("content"));
  $("ksBtnResetFormatPrompt").addEventListener("click", () => resetPrompt("format"));
  $("kseOptimizeClose").addEventListener("click", closePromptOptimization);
  $("kseOptimizeCancel").addEventListener("click", closePromptOptimization);
  $("kseOptimizeMask").addEventListener("click", closePromptOptimization);
  $("kseOptimizeConfirm").addEventListener("click", confirmPromptOptimization);
  $("kseCancel").addEventListener("click", returnToList);
  $("kseSaveDraft").addEventListener("click", () => saveSkill("draft"));
  $("kseSave").addEventListener("click", () => saveSkill("publish"));
  $("kseLeaveClose").addEventListener("click", closeLeaveModal);
  $("kseLeaveCancel").addEventListener("click", closeLeaveModal);
  $("kseLeaveMask").addEventListener("click", closeLeaveModal);
  $("kseLeaveOk").addEventListener("click", confirmReturnToList);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("kseOptimizeModal").classList.contains("hidden")) {
      closePromptOptimization();
      return;
    }
    if (!$("kseLeaveModal").classList.contains("hidden")) {
      closeLeaveModal();
      return;
    }
    if (!$("ksThemeDropdown").classList.contains("hidden")) {
      setThemeDropdownOpen(false);
      $("ksThemeTrigger").focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("#ksThemeChecks")) setThemeDropdownOpen(false);
  });

  window.addEventListener("beforeunload", (event) => {
    if (!dirty || allowLeave) return;
    event.preventDefault();
    event.returnValue = "";
  });

  mountMarkdownEditors();
  populateForm();
})();
