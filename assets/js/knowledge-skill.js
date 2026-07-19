(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const Store = window.SkillCatalogStore;
  const FILTER_STORE_KEY = "smart-query-skill-list-filters-v1";
  const ICONS = {
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>',
    test: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V3h6v3"/></svg>'
  };

  let skills = Store.load();
  let pendingDeleteId = null;

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function skillIcon(kind) {
    if (kind === "campaign") return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h3l9 5V6l-9 5H4v2z"/><path d="M7 13l1 6h3"/><path d="M19 9c1.3 1.7 1.3 4.3 0 6"/></svg>';
    if (kind === "annual") return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V8"/><path d="M10 19V4"/><path d="M16 19v-7"/><path d="M22 19H2"/></svg>';
    if (kind === "quarterly") return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/><path d="M8 14h3"/></svg>';
  }

  function iconClass(kind) {
    if (kind === "quarterly") return " is-purple";
    if (kind === "annual") return " is-green";
    if (kind === "campaign") return " is-orange";
    return "";
  }

  function getSkill(id) {
    return skills.find((item) => item.id === id) || null;
  }

  function saveFilters() {
    try {
      sessionStorage.setItem(FILTER_STORE_KEY, JSON.stringify({
        keyword: $("ksKeyword").value,
        category: $("ksCategoryFilter").value,
        theme: $("ksThemeFilter").value,
        status: $("ksStatusFilter").value
      }));
    } catch (error) {
      // 筛选状态存储失败不影响列表使用。
    }
  }

  function restoreFilters() {
    try {
      const state = JSON.parse(sessionStorage.getItem(FILTER_STORE_KEY) || "null");
      if (!state) return;
      $("ksKeyword").value = state.keyword || "";
      $("ksCategoryFilter").value = state.category || "";
      $("ksThemeFilter").value = state.theme || "";
      $("ksStatusFilter").value = state.status || "";
    } catch (error) {
      // 使用默认筛选状态。
    }
  }

  function editableSkill(item) {
    return item?.draftConfig
      ? { ...item, ...item.draftConfig, id: item.id, enabled: item.enabled }
      : item;
  }

  function configStatusMeta(item) {
    if (item.workflowStatus === "draft" && !item.enabled) {
      return { label: "配置未完成", className: " is-draft" };
    }
    if (item.draftConfig) {
      return { label: "有草稿", className: " is-stale" };
    }
    return { label: "已发布", className: " is-passed" };
  }

  function testStatusMeta(item) {
    const editing = editableSkill(item);
    const status = editing?.testStatus || "untested";
    if (status === "failed") return { label: "测试失败", className: " is-failed" };
    if (status === "stale") return { label: "配置更新待复测", className: " is-stale" };
    if (status === "passed") return { label: "测试已通过", className: " is-passed" };
    return { label: "待测试", className: " is-draft" };
  }

  function navigateToEditor(id) {
    saveFilters();
    window.location.href = id
      ? `knowledge-skill-edit.html?id=${encodeURIComponent(id)}`
      : "knowledge-skill-edit.html?mode=create";
  }

  function navigateToTest(id) {
    saveFilters();
    window.location.href = `knowledge-skill-test.html?id=${encodeURIComponent(id)}`;
  }

  function getFilteredSkills() {
    const keyword = ($("ksKeyword").value || "").trim().toLowerCase();
    const category = $("ksCategoryFilter").value;
    const theme = $("ksThemeFilter").value;
    const status = $("ksStatusFilter").value;
    return skills
      .filter((item) => {
        const editing = editableSkill(item);
        return !keyword || `${editing.name} ${editing.code}`.toLowerCase().includes(keyword);
      })
      .filter((item) => !category || editableSkill(item).category === category)
      .filter((item) => !theme || editableSkill(item).themes.includes(theme))
      .filter((item) => !status || (status === "enabled" ? item.enabled : !item.enabled))
      .sort((a, b) => a.sort - b.sort);
  }

  function renderSkills() {
    const rows = getFilteredSkills();
    $("ksTableBody").innerHTML = rows.map((item) => {
      const editing = editableSkill(item);
      const workflow = configStatusMeta(item);
      const testState = testStatusMeta(item);
      const skillThemes = editing.themes || [];
      const themes = skillThemes.slice(0, 2).map((theme) => `<span class="ks-tag">${escapeHTML(theme)}</span>`).join("")
        + (skillThemes.length > 2 ? `<span class="ks-tag">+${skillThemes.length - 2}</span>` : "");
      const templateText = editing.reportTemplate?.source === "uploaded" ? "自定义模板" : "系统默认";
      return `
        <tr data-id="${escapeHTML(item.id)}">
          <td><div class="ks-skill-cell"><span class="ks-skill-icon${iconClass(editing.kind)}">${skillIcon(editing.kind)}</span><div><strong title="${escapeHTML(editing.name)}">${escapeHTML(editing.name)}</strong><span title="${escapeHTML(editing.code)}">${escapeHTML(editing.code)}</span></div></div></td>
          <td><span class="ks-tag">${escapeHTML(editing.category)}</span></td>
          <td><div class="ks-tag-list">${themes}</div></td>
          <td><span class="ks-param-count${workflow.className}">${workflow.label}</span></td>
          <td><span class="ks-param-count${testState.className}">${testState.label}</span></td>
          <td><span class="ks-type-tag" title="${escapeHTML(editing.reportTemplate?.name || "系统默认报告样式")}">${templateText}</span></td>
          <td>
            <button type="button" class="ks-status-switch${item.enabled ? " is-on" : ""}" data-action="toggle" data-id="${escapeHTML(item.id)}" role="switch" aria-checked="${item.enabled ? "true" : "false"}" aria-label="${item.enabled ? "停用" : "启用"}${escapeHTML(editing.name)}">
              <i aria-hidden="true"></i><span>${item.enabled ? "启用" : "停用"}</span>
            </button>
          </td>
          <td><span class="ks-date">${escapeHTML(editing.updated)}</span></td>
          <td><div class="ks-actions">
            <button type="button" class="ks-action" data-action="edit" data-id="${escapeHTML(item.id)}">${ICONS.edit}编辑</button>
            <button type="button" class="ks-action is-test-action" data-action="test" data-id="${escapeHTML(item.id)}">${ICONS.test}测试执行</button>
            <button type="button" class="ks-action" data-action="more" data-id="${escapeHTML(item.id)}" aria-label="更多操作">${ICONS.more}</button>
            <div class="ks-more-menu hidden" data-menu="${escapeHTML(item.id)}">
              <button type="button" data-action="copy" data-id="${escapeHTML(item.id)}">${ICONS.copy}复制技能</button>
              <button type="button" class="danger" data-action="delete" data-id="${escapeHTML(item.id)}">${ICONS.trash}删除技能</button>
            </div>
          </div></td>
        </tr>`;
    }).join("");
    $("ksEmpty").classList.toggle("hidden", rows.length > 0);
    $("ksTableBody").closest("table").classList.toggle("hidden", rows.length === 0);
    $("ksListCount").textContent = `共 ${rows.length} 项技能`;
    $("ksTotalCount").textContent = skills.length;
    $("ksEnabledCount").textContent = skills.filter((item) => item.enabled).length;
  }

  function closeMoreMenus(exceptId) {
    document.querySelectorAll(".ks-more-menu").forEach((menu) => {
      if (menu.dataset.menu !== exceptId) menu.classList.add("hidden");
    });
    document.querySelectorAll('[data-action="more"]').forEach((button) => {
      if (button.dataset.id !== exceptId) button.classList.remove("is-open");
    });
  }

  function copySkill(id) {
    const source = getSkill(id);
    if (!source) return;
    const copy = Store.clone(source);
    delete copy.draftConfig;
    copy.id = `skill-${Date.now()}`;
    copy.name = `${source.name}（副本）`;
    let code = `${source.code}_copy`;
    let suffix = 2;
    while (skills.some((item) => item.code === code)) code = `${source.code}_copy${suffix++}`;
    copy.code = code;
    copy.enabled = false;
    copy.testStatus = "untested";
    copy.workflowStatus = "draft";
    copy.sort = Math.max(...skills.map((item) => item.sort), 0) + 10;
    copy.updated = "2026-07-17";
    skills.push(copy);
    Store.save(skills);
    renderSkills();
    showToast(`已复制技能：${copy.name}`);
  }

  function toggleSkill(id) {
    const item = getSkill(id);
    if (!item) return;
    if (!item.enabled && item.workflowStatus === "draft") {
      showToast("请先进入编辑页保存正式配置");
      navigateToEditor(id);
      return;
    }
    item.enabled = !item.enabled;
    item.updated = "2026-07-17";
    Store.save(skills);
    renderSkills();
    showToast(`${item.name}已${item.enabled ? "启用" : "停用"}`);
  }

  function openDelete(id) {
    const item = getSkill(id);
    if (!item) return;
    pendingDeleteId = id;
    $("ksConfirmMessage").innerHTML = `确定删除“<strong>${escapeHTML(item.name)}</strong>”吗？删除后业务端将无法继续选择该技能，历史报告不受影响。`;
    $("ksConfirmMask").classList.remove("hidden");
    $("ksConfirmModal").classList.remove("hidden");
  }

  function closeDelete() {
    pendingDeleteId = null;
    $("ksConfirmMask").classList.add("hidden");
    $("ksConfirmModal").classList.add("hidden");
  }

  function confirmDelete() {
    const item = getSkill(pendingDeleteId);
    if (!item) return closeDelete();
    skills = skills.filter((skill) => skill.id !== pendingDeleteId);
    Store.save(skills);
    closeDelete();
    renderSkills();
    showToast(`已删除技能：${item.name}`);
  }

  $("ksTableBody").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === "more") {
      event.stopPropagation();
      const menu = document.querySelector(`.ks-more-menu[data-menu="${id}"]`);
      const willOpen = menu?.classList.contains("hidden");
      closeMoreMenus(willOpen ? id : null);
      menu?.classList.toggle("hidden", !willOpen);
      button.classList.toggle("is-open", Boolean(willOpen));
      return;
    }
    closeMoreMenus();
    if (action === "edit") navigateToEditor(id);
    if (action === "test") navigateToTest(id);
    if (action === "copy") copySkill(id);
    if (action === "toggle") toggleSkill(id);
    if (action === "delete") openDelete(id);
  });

  $("ksBtnNew").addEventListener("click", () => navigateToEditor());
  $("ksKeyword").addEventListener("input", renderSkills);
  ["ksCategoryFilter", "ksThemeFilter", "ksStatusFilter"].forEach((id) => $(id).addEventListener("change", renderSkills));
  $("ksBtnReset").addEventListener("click", () => {
    $("ksKeyword").value = "";
    $("ksCategoryFilter").value = "";
    $("ksThemeFilter").value = "";
    $("ksStatusFilter").value = "";
    renderSkills();
  });

  $("ksConfirmClose").addEventListener("click", closeDelete);
  $("ksConfirmCancel").addEventListener("click", closeDelete);
  $("ksConfirmMask").addEventListener("click", closeDelete);
  $("ksConfirmOk").addEventListener("click", confirmDelete);
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".ks-actions")) closeMoreMenus();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeMoreMenus();
    if (!$("ksConfirmModal").classList.contains("hidden")) closeDelete();
  });

  restoreFilters();
  renderSkills();
})();
