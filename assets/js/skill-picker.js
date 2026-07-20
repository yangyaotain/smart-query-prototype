(function (global) {
  "use strict";

  const ICONS = {
    general: '<path d="M5 5h14v11H9l-4 4V5z"/><path d="M8 9h8"/><path d="M8 12h5"/>',
    monthly: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M4 10h16"/><path d="M8 14h3"/>',
    quarterly: '<path d="M5 4h14v16H5z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>',
    annual: '<path d="M4 19V8"/><path d="M10 19V4"/><path d="M16 19v-7"/><path d="M22 19H2"/>',
    campaign: '<path d="M4 13h3l9 5V6l-9 5H4v2z"/><path d="M7 13l1 6h3"/><path d="M19 9c1.3 1.7 1.3 4.3 0 6"/>',
    default: '<path d="M5 4h14v16H5z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>'
  };

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function iconMarkup(kind) {
    const normalizedKind = ICONS[kind] ? kind : "default";
    const className = normalizedKind === "default" ? "" : ` is-${normalizedKind}`;
    return `<span class="skill-option-icon${className}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[normalizedKind]}</svg></span>`;
  }

  function optionMarkup(item, selectedKey) {
    const key = String(item.pickerKey || item.id || item.code || "");
    const selected = key === String(selectedKey || "");
    const tag = item.pickerTag || (item.reportTemplate?.name ? "报告" : "技能");
    return `
      <button type="button" class="skill-option${selected ? " selected" : ""}" data-skill="${escapeHTML(key)}" role="option" aria-selected="${selected}">
        ${iconMarkup(item.kind)}
        <span class="skill-option-main"><strong>${escapeHTML(item.name || "未命名技能")}</strong><em>${escapeHTML(item.desc || "使用已配置的提示词与模板执行任务")}</em></span>
        <span class="skill-option-tag">${escapeHTML(tag)}</span>
        <span class="skill-option-check"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg></span>
      </button>
    `;
  }

  function render(options) {
    const container = options?.container;
    if (!container) return;

    const items = Array.isArray(options.items) ? options.items : [];
    const groups = new Map();
    items.forEach((item) => {
      const group = item.category || "其他技能";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(item);
    });

    const sections = [];
    if (options.general) {
      sections.push(`<div class="skill-picker-group">${escapeHTML(options.general.category || "默认模式")}</div>`);
      sections.push(optionMarkup(options.general, options.selectedKey));
    }
    groups.forEach((groupItems, group) => {
      sections.push(`<div class="skill-picker-group">${escapeHTML(group)}</div>`);
      sections.push(groupItems.map((item) => optionMarkup(item, options.selectedKey)).join(""));
    });

    container.setAttribute("role", "listbox");
    container.setAttribute("aria-label", options.ariaLabel || "可用技能");
    container.innerHTML = sections.join("");
  }

  global.SkillPicker = {
    render
  };
})(window);
