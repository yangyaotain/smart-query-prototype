(function (global) {
  "use strict";

  const instances = new WeakMap();

  function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function getMaximumLength(textarea) {
    return Number(textarea.maxLength) > 0 ? Number(textarea.maxLength) : Infinity;
  }

  function renderSyntaxInline(value) {
    const source = String(value || "");
    const pattern = /!\[[^\]\n]*\]\([^)]+\)|`[^`\n]+`|~~[^~\n]+~~|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|\[[^\]\n]+\]\([^)]+\)/g;
    let result = "";
    let cursor = 0;
    source.replace(pattern, (token, offset) => {
      let className = "md-syntax-link";
      result += escapeHTML(source.slice(cursor, offset));
      if (token.indexOf("![") === 0) className = "md-syntax-image";
      else if (token.charAt(0) === "`") className = "md-syntax-code";
      else if (token.indexOf("~~") === 0) className = "md-syntax-strike";
      else if (token.indexOf("**") === 0 || token.indexOf("__") === 0) className = "md-syntax-bold";
      else if (token.charAt(0) === "*" || token.charAt(0) === "_") className = "md-syntax-italic";
      result += `<span class="${className}">${escapeHTML(token)}</span>`;
      cursor = offset + token.length;
      return token;
    });
    return result + escapeHTML(source.slice(cursor));
  }

  function renderSyntaxMarkdown(value, placeholder) {
    const source = String(value || "");
    if (!source) {
      return `<span class="markdown-editor__placeholder">${escapeHTML(placeholder || "# 开始编写 Markdown 内容")}</span>`;
    }
    let inCodeBlock = false;
    return source.split("\n").map((line) => {
      const fenceMatch = line.match(/^(\s*)(```.*)$/);
      let headingMatch;
      let taskMatch;
      let listMatch;
      let quoteMatch;
      if (fenceMatch) {
        inCodeBlock = !inCodeBlock;
        return `${escapeHTML(fenceMatch[1])}<span class="md-syntax-fence">${escapeHTML(fenceMatch[2])}</span>`;
      }
      if (inCodeBlock) return `<span class="md-syntax-code-line">${escapeHTML(line || " ")}</span>`;
      headingMatch = line.match(/^(\s*)(#{1,6})(\s+)(.*)$/);
      if (headingMatch) {
        return escapeHTML(headingMatch[1])
          + `<span class="md-syntax-heading"><span class="md-syntax-heading-mark">${escapeHTML(headingMatch[2])}</span>`
          + `${escapeHTML(headingMatch[3])}${renderSyntaxInline(headingMatch[4])}</span>`;
      }
      if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
        return `<span class="md-syntax-rule">${escapeHTML(line)}</span>`;
      }
      if (/^\s*\|.*\|\s*$/.test(line)) {
        return renderSyntaxInline(line).replace(/\|/g, '<span class="md-syntax-table">|</span>');
      }
      taskMatch = line.match(/^(\s*)([-+*])(\s+)(\[[ xX]\])(\s+)(.*)$/);
      if (taskMatch) {
        return escapeHTML(taskMatch[1])
          + `<span class="md-syntax-list-mark">${escapeHTML(taskMatch[2])}</span>`
          + `${escapeHTML(taskMatch[3])}<span class="md-syntax-task">${escapeHTML(taskMatch[4])}</span>`
          + `${escapeHTML(taskMatch[5])}${renderSyntaxInline(taskMatch[6])}`;
      }
      listMatch = line.match(/^(\s*)([-+*]|\d+\.)(\s+)(.*)$/);
      if (listMatch) {
        return escapeHTML(listMatch[1])
          + `<span class="md-syntax-list-mark">${escapeHTML(listMatch[2])}</span>`
          + escapeHTML(listMatch[3]) + renderSyntaxInline(listMatch[4]);
      }
      quoteMatch = line.match(/^(\s*)(>)(\s+)(.*)$/);
      if (quoteMatch) {
        return escapeHTML(quoteMatch[1])
          + '<span class="md-syntax-quote"><span class="md-syntax-quote-mark">&gt;</span>'
          + `${escapeHTML(quoteMatch[3])}${renderSyntaxInline(quoteMatch[4])}</span>`;
      }
      return line ? renderSyntaxInline(line) : " ";
    }).join("\n") + (source.slice(-1) === "\n" ? " " : "");
  }

  function renderPreviewInline(value) {
    const source = String(value || "");
    const pattern = /!\[[^\]\n]*\]\([^)]+\)|`[^`\n]+`|~~[^~\n]+~~|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|\[[^\]\n]+\]\([^)]+\)/g;
    let result = "";
    let cursor = 0;
    source.replace(pattern, (token, offset) => {
      result += escapeHTML(source.slice(cursor, offset));
      if (token.indexOf("![") === 0) {
        const imageSplit = token.indexOf("](");
        const alt = token.slice(2, imageSplit);
        const src = token.slice(imageSplit + 2, -1).trim();
        if (/^(https?:\/\/|\/(?!\/)|\.{1,2}\/)/i.test(src)) {
          result += `<img src="${escapeHTML(src)}" alt="${escapeHTML(alt)}" loading="lazy">`;
        } else {
          result += `<span class="md-image-placeholder">图片：${escapeHTML(alt || "未命名")}</span>`;
        }
      } else if (token.charAt(0) === "`") {
        result += `<code>${escapeHTML(token.slice(1, -1))}</code>`;
      } else if (token.indexOf("~~") === 0) {
        result += `<del>${escapeHTML(token.slice(2, -2))}</del>`;
      } else if (token.indexOf("**") === 0 || token.indexOf("__") === 0) {
        result += `<strong>${escapeHTML(token.slice(2, -2))}</strong>`;
      } else if (token.charAt(0) === "*" || token.charAt(0) === "_") {
        result += `<em>${escapeHTML(token.slice(1, -1))}</em>`;
      } else {
        const linkSplit = token.indexOf("](");
        const linkText = token.slice(1, linkSplit);
        let href = token.slice(linkSplit + 2, -1).trim();
        if (!/^(https?:\/\/|mailto:|#|\/(?!\/))/i.test(href)) href = "#";
        result += `<a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer">${escapeHTML(linkText)}</a>`;
      }
      cursor = offset + token.length;
      return token;
    });
    return result + escapeHTML(source.slice(cursor));
  }

  function renderMarkdownPreview(value) {
    const lines = String(value || "").split("\n");
    const html = [];
    let paragraph = [];
    let codeLines = [];
    let listType = "";
    let inCodeBlock = false;
    let codeLanguage = "";
    let skipUntil = -1;

    function flushParagraph() {
      if (!paragraph.length) return;
      html.push(`<p>${paragraph.map(renderPreviewInline).join("<br>")}</p>`);
      paragraph = [];
    }

    function closeList() {
      if (!listType) return;
      html.push(`</${listType === "task" ? "ul" : listType}>`);
      listType = "";
    }

    function flushCodeBlock() {
      const languageAttr = codeLanguage ? ` data-language="${escapeHTML(codeLanguage)}"` : "";
      html.push(`<pre><code${languageAttr}>${escapeHTML(codeLines.join("\n"))}</code></pre>`);
      codeLines = [];
      codeLanguage = "";
    }

    function parseTableCells(line) {
      let normalized = String(line || "").trim();
      if (normalized.charAt(0) === "|") normalized = normalized.slice(1);
      if (normalized.slice(-1) === "|") normalized = normalized.slice(0, -1);
      return normalized.split("|").map((cell) => cell.trim());
    }

    function isTableSeparator(line) {
      if (!line || line.indexOf("|") < 0) return false;
      const cells = parseTableCells(line);
      return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
    }

    lines.forEach((line, lineIndex) => {
      const fenceMatch = line.match(/^\s*```([\w-]*)\s*$/);
      let headingMatch;
      let taskMatch;
      let unorderedMatch;
      let orderedMatch;
      let quoteMatch;
      if (lineIndex <= skipUntil) return;
      if (fenceMatch) {
        flushParagraph();
        closeList();
        if (inCodeBlock) flushCodeBlock();
        else codeLanguage = fenceMatch[1] || "";
        inCodeBlock = !inCodeBlock;
        return;
      }
      if (inCodeBlock) {
        codeLines.push(line);
        return;
      }
      if (line.indexOf("|") >= 0 && isTableSeparator(lines[lineIndex + 1])) {
        flushParagraph();
        closeList();
        const tableHeaders = parseTableCells(line);
        const tableRows = [];
        let rowIndex = lineIndex + 2;
        while (rowIndex < lines.length && lines[rowIndex].trim() && lines[rowIndex].indexOf("|") >= 0) {
          tableRows.push(parseTableCells(lines[rowIndex]));
          rowIndex += 1;
        }
        skipUntil = rowIndex - 1;
        html.push(
          '<div class="md-table-wrap"><table><thead><tr>'
          + tableHeaders.map((cell) => `<th>${renderPreviewInline(cell)}</th>`).join("")
          + "</tr></thead><tbody>"
          + tableRows.map((row) => "<tr>" + tableHeaders.map((_, cellIndex) => (
            `<td>${renderPreviewInline(row[cellIndex] || "")}</td>`
          )).join("") + "</tr>").join("")
          + "</tbody></table></div>"
        );
        return;
      }
      if (!line.trim()) {
        flushParagraph();
        closeList();
        return;
      }
      headingMatch = line.match(/^\s*(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        closeList();
        html.push(`<h${headingMatch[1].length}>${renderPreviewInline(headingMatch[2])}</h${headingMatch[1].length}>`);
        return;
      }
      if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
        flushParagraph();
        closeList();
        html.push("<hr>");
        return;
      }
      quoteMatch = line.match(/^\s*>\s?(.*)$/);
      if (quoteMatch) {
        flushParagraph();
        closeList();
        html.push(`<blockquote>${renderPreviewInline(quoteMatch[1])}</blockquote>`);
        return;
      }
      taskMatch = line.match(/^\s*[-+*]\s+\[([ xX])\]\s+(.+)$/);
      if (taskMatch) {
        flushParagraph();
        if (listType !== "task") {
          closeList();
          listType = "task";
          html.push('<ul class="md-task-list">');
        }
        html.push(`<li><input type="checkbox" disabled${String(taskMatch[1]).toLowerCase() === "x" ? " checked" : ""}> ${renderPreviewInline(taskMatch[2])}</li>`);
        return;
      }
      unorderedMatch = line.match(/^\s*[-+*]\s+(.+)$/);
      orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
      if (unorderedMatch || orderedMatch) {
        flushParagraph();
        const nextListType = orderedMatch ? "ol" : "ul";
        if (listType !== nextListType) {
          closeList();
          listType = nextListType;
          html.push(`<${listType}>`);
        }
        html.push(`<li>${renderPreviewInline((orderedMatch || unorderedMatch)[1])}</li>`);
        return;
      }
      closeList();
      paragraph.push(line);
    });

    flushParagraph();
    closeList();
    if (inCodeBlock || codeLines.length) flushCodeBlock();
    return html.length ? html.join("") : '<div class="markdown-editor__empty">暂无可预览的内容</div>';
  }

  const ICONS = {
    undo: '<svg viewBox="0 0 24 24"><path d="M9 7l-5 5 5 5"/><path d="M5 12h8a6 6 0 0 1 6 6"/></svg>',
    redo: '<svg viewBox="0 0 24 24"><path d="M15 7l5 5-5 5"/><path d="M19 12h-8a6 6 0 0 0-6 6"/></svg>',
    bold: '<svg viewBox="0 0 24 24"><path d="M7 4h6a4 4 0 0 1 0 8H7z"/><path d="M7 12h7a4 4 0 0 1 0 8H7z"/></svg>',
    italic: '<svg viewBox="0 0 24 24"><path d="M10 4h8"/><path d="M6 20h8"/><path d="M14 4L10 20"/></svg>',
    strike: '<svg viewBox="0 0 24 24"><path d="M6 5h12"/><path d="M8 5c0 7 8 3 8 9 0 3-2 5-5 5-2.1 0-3.8-.7-5-2"/><path d="M4 12h16"/></svg>',
    unordered: '<svg viewBox="0 0 24 24"><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/><path d="M8 6h12"/><path d="M8 12h12"/><path d="M8 18h12"/></svg>',
    ordered: '<svg viewBox="0 0 24 24"><path d="M3 5h2v4"/><path d="M3 9h3"/><path d="M3 13h2.5L3 17h3"/><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/></svg>',
    task: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="5" height="5" rx="1"/><path d="M4.5 6.5L6 8l3-3"/><rect x="3" y="15" width="5" height="5" rx="1"/><path d="M12 6h9"/><path d="M12 17h9"/></svg>',
    quote: '<svg viewBox="0 0 24 24"><path d="M6 7h5v5H7v4H4v-6a3 3 0 0 1 2-3z"/><path d="M15 7h5v5h-4v4h-3v-6a3 3 0 0 1 2-3z"/></svg>',
    inlineCode: '<svg viewBox="0 0 24 24"><path d="M8 9l-3 3 3 3"/><path d="M16 9l3 3-3 3"/><path d="M14 5l-4 14"/></svg>',
    codeBlock: '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M7 9l2 2-2 2"/><path d="M11 14h4"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 13a4 4 0 0 0 5.7.1l2.2-2.2a4 4 0 0 0-5.7-5.7L11 6.4"/><path d="M14 11a4 4 0 0 0-5.7-.1l-2.2 2.2a4 4 0 0 0 5.7 5.7l1.2-1.2"/></svg>',
    image: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M4 17l5-5 4 4 2-2 5 5"/></svg>',
    table: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18"/><path d="M9 4v16"/><path d="M15 4v16"/></svg>',
    rule: '<svg viewBox="0 0 24 24"><path d="M4 12h16"/></svg>',
    help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.5 2.5 0 1 1 3.8 2.1c-1 .6-1.6 1.1-1.6 2.4"/><path d="M12 17h.01"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4l11-11-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    split: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/></svg>',
    preview: '<svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    caret: '<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg>'
  };

  function toolButton(action, icon, label, title, extra = "") {
    return `<button type="button" class="markdown-editor__tool" data-md-action="${action}" title="${title}" ${extra}>${icon}<span>${label}</span></button>`;
  }

  function editorTemplate() {
    const headings = [
      ["0", "正文", "普通段落"],
      ["1", "H1", "一级标题"],
      ["2", "H2", "二级标题"],
      ["3", "H3", "三级标题"],
      ["4", "H4", "四级标题"],
      ["5", "H5", "五级标题"],
      ["6", "H6", "六级标题"]
    ].map(([level, mark, label]) => (
      `<button type="button" data-heading-level="${level}" role="menuitem"><b>${mark}</b><span>${label}</span></button>`
    )).join("");
    return `
      <div class="markdown-editor__toolbar" role="toolbar" aria-label="Markdown 格式工具">
        <div class="markdown-editor__tools">
          ${toolButton("undo", ICONS.undo, "撤销", "撤销（Ctrl+Z）", "disabled")}
          ${toolButton("redo", ICONS.redo, "重做", "重做（Ctrl+Y）", "disabled")}
          <span class="markdown-editor__divider" aria-hidden="true"></span>
          <div class="markdown-editor__heading">
            <button type="button" class="markdown-editor__tool" data-role="heading-toggle" title="标题级别" aria-haspopup="menu" aria-expanded="false"><b data-role="heading-label">正文</b><span>标题</span>${ICONS.caret}</button>
            <div class="markdown-editor__heading-menu hidden" data-role="heading-menu" role="menu">${headings}</div>
          </div>
          ${toolButton("bold", ICONS.bold, "加粗", "加粗（Ctrl+B）")}
          ${toolButton("italic", ICONS.italic, "斜体", "斜体（Ctrl+I）")}
          ${toolButton("strikethrough", ICONS.strike, "删除线", "删除线")}
          <span class="markdown-editor__divider" aria-hidden="true"></span>
          ${toolButton("unordered", ICONS.unordered, "无序列表", "无序列表")}
          ${toolButton("ordered", ICONS.ordered, "有序列表", "有序列表")}
          ${toolButton("task", ICONS.task, "任务列表", "任务列表")}
          <span class="markdown-editor__divider" aria-hidden="true"></span>
          ${toolButton("quote", ICONS.quote, "引用", "引用")}
          ${toolButton("inlineCode", ICONS.inlineCode, "行内代码", "行内代码")}
          ${toolButton("codeBlock", ICONS.codeBlock, "代码块", "代码块")}
          <span class="markdown-editor__divider" aria-hidden="true"></span>
          ${toolButton("link", ICONS.link, "链接", "插入链接（Ctrl+K）")}
          ${toolButton("image", ICONS.image, "图片", "插入图片链接")}
          ${toolButton("table", ICONS.table, "表格", "插入表格")}
          ${toolButton("horizontalRule", ICONS.rule, "分割线", "插入分割线")}
          <div class="markdown-editor__help">
            <button type="button" class="markdown-editor__tool" data-role="help-toggle" title="Markdown 语法帮助" aria-haspopup="true" aria-expanded="false">${ICONS.help}<span>语法帮助</span></button>
            <div class="markdown-editor__help-panel hidden" data-role="help-panel">
              <strong>常用 Markdown 语法</strong>
              <div class="markdown-editor__help-grid">
                <span>标题 <code># H1</code></span><span>粗体 <code>**文本**</code></span>
                <span>斜体 <code>*文本*</code></span><span>删除线 <code>~~文本~~</code></span>
                <span>任务 <code>- [ ]</code></span><span>引用 <code>&gt; 文本</code></span>
                <span>行内代码 <code>\`代码\`</code></span><span>分割线 <code>---</code></span>
                <span>图片 <code>![说明](地址)</code></span><span>表格 <code>| 列 |</code></span>
              </div>
            </div>
          </div>
        </div>
        <div class="markdown-editor__mode" role="tablist" aria-label="Markdown 查看模式">
          <button type="button" class="is-active" data-md-mode="edit" role="tab" aria-selected="true">${ICONS.edit}编辑</button>
          <button type="button" data-md-mode="split" role="tab" aria-selected="false">${ICONS.split}分屏</button>
          <button type="button" data-md-mode="preview" role="tab" aria-selected="false">${ICONS.preview}预览</button>
        </div>
      </div>
      <div class="markdown-editor__workbench" data-role="workbench">
        <div class="markdown-editor__source" data-role="source">
          <div class="markdown-editor__gutter" aria-hidden="true"><div class="markdown-editor__lines" data-role="lines"></div></div>
          <div class="markdown-editor__code" data-role="code"><pre class="markdown-editor__highlight" data-role="highlight" aria-hidden="true"></pre></div>
        </div>
        <article class="markdown-editor__preview hidden" data-role="preview" aria-label="Markdown 预览"></article>
      </div>`;
  }

  class MarkdownEditor {
    constructor(textarea, options = {}) {
      if (!(textarea instanceof HTMLElement) || textarea.tagName !== "TEXTAREA") {
        throw new Error("MarkdownEditor requires a textarea element.");
      }
      this.textarea = textarea;
      this.options = options;
      this.history = [];
      this.historyIndex = -1;
      this.mode = options.allowSplit === false && options.defaultMode === "split"
        ? "edit"
        : (options.defaultMode || "edit");
      this.build();
      this.bind();
      this.resetHistory();
      this.setMode(this.mode, { focus: false });
      this.refresh();
      instances.set(textarea, this);
    }

    build() {
      const shell = document.createElement("div");
      shell.className = `markdown-editor markdown-editor--${this.options.variant === "compact" ? "compact" : "full"}`;
      shell.innerHTML = editorTemplate();
      if (this.options.allowSplit === false) {
        shell.querySelector('[data-md-mode="split"]')?.remove();
      }
      this.textarea.parentNode.insertBefore(shell, this.textarea);
      shell.querySelector('[data-role="code"]').appendChild(this.textarea);
      this.textarea.classList.add("markdown-editor__input");
      this.textarea.setAttribute("wrap", "off");
      this.textarea.spellcheck = false;
      this.root = shell;
      this.workbench = shell.querySelector('[data-role="workbench"]');
      this.source = shell.querySelector('[data-role="source"]');
      this.preview = shell.querySelector('[data-role="preview"]');
      this.highlight = shell.querySelector('[data-role="highlight"]');
      this.lines = shell.querySelector('[data-role="lines"]');
      this.undoButton = shell.querySelector('[data-md-action="undo"]');
      this.redoButton = shell.querySelector('[data-md-action="redo"]');
      this.headingToggle = shell.querySelector('[data-role="heading-toggle"]');
      this.headingLabel = shell.querySelector('[data-role="heading-label"]');
      this.headingMenu = shell.querySelector('[data-role="heading-menu"]');
      this.helpToggle = shell.querySelector('[data-role="help-toggle"]');
      this.helpPanel = shell.querySelector('[data-role="help-panel"]');
    }

    bind() {
      this.textarea.addEventListener("input", (event) => {
        if (!event.markdownEditorInternal) this.recordHistory();
        this.refresh();
        this.updateHeadingIndicator();
        if (typeof this.options.onInput === "function") this.options.onInput(this.getValue(), this);
      });
      this.textarea.addEventListener("scroll", () => this.syncScroll());
      ["keyup", "click", "select"].forEach((type) => {
        this.textarea.addEventListener(type, () => this.updateHeadingIndicator());
      });
      this.textarea.addEventListener("keydown", (event) => this.handleKeydown(event));
      this.root.querySelectorAll("[data-md-action]").forEach((button) => {
        button.addEventListener("click", () => this.applyFormat(button.dataset.mdAction));
      });
      this.root.querySelectorAll("[data-heading-level]").forEach((button) => {
        button.addEventListener("click", () => {
          this.formatHeading(Number(button.dataset.headingLevel));
          this.closePopovers();
        });
      });
      this.root.querySelectorAll("[data-md-mode]").forEach((button) => {
        button.addEventListener("click", () => this.setMode(button.dataset.mdMode));
      });
      this.headingToggle.addEventListener("click", () => {
        const willOpen = this.headingMenu.classList.contains("hidden");
        this.headingMenu.classList.toggle("hidden", !willOpen);
        this.helpPanel.classList.add("hidden");
        this.headingToggle.setAttribute("aria-expanded", String(willOpen));
      });
      this.helpToggle.addEventListener("click", () => {
        const willOpen = this.helpPanel.classList.contains("hidden");
        this.helpPanel.classList.toggle("hidden", !willOpen);
        this.headingMenu.classList.add("hidden");
        this.helpToggle.setAttribute("aria-expanded", String(willOpen));
      });
      document.addEventListener("click", (event) => {
        if (!this.root.contains(event.target)) this.closePopovers();
      });
    }

    closePopovers() {
      this.headingMenu.classList.add("hidden");
      this.helpPanel.classList.add("hidden");
      this.headingToggle.setAttribute("aria-expanded", "false");
      this.helpToggle.setAttribute("aria-expanded", "false");
    }

    getValue() {
      return this.textarea.value || "";
    }

    setValue(value, options = {}) {
      const maximumLength = getMaximumLength(this.textarea);
      const sourceValue = String(value || "");
      const nextValue = maximumLength === Infinity ? sourceValue : sourceValue.slice(0, maximumLength);
      this.textarea.value = nextValue;
      const selectionStart = options.selectionStart == null ? 0 : options.selectionStart;
      const selectionEnd = options.selectionEnd == null ? selectionStart : options.selectionEnd;
      this.textarea.setSelectionRange(selectionStart, selectionEnd);
      if (options.resetHistory) this.resetHistory();
      else if (options.recordHistory !== false) this.recordHistory();
      this.refresh();
      this.updateHeadingIndicator();
      if (options.dispatchInput !== false) this.dispatchInput();
      return this;
    }

    focus() {
      this.textarea.focus();
      return this;
    }

    refresh() {
      const value = this.getValue();
      const totalLines = value.split("\n").length;
      this.highlight.innerHTML = renderSyntaxMarkdown(value, this.textarea.getAttribute("placeholder"));
      this.lines.innerHTML = Array.from({ length: totalLines }, (_, index) => `<span>${index + 1}</span>`).join("");
      if (!this.preview.classList.contains("hidden")) this.preview.innerHTML = renderMarkdownPreview(value);
      this.syncScroll();
      return this;
    }

    syncScroll() {
      this.highlight.style.transform = `translate(${-this.textarea.scrollLeft}px,${-this.textarea.scrollTop}px)`;
      this.lines.style.transform = `translateY(${-this.textarea.scrollTop}px)`;
    }

    setMode(mode, options = {}) {
      const availableModes = this.options.allowSplit === false
        ? ["edit", "preview"]
        : ["edit", "split", "preview"];
      const normalized = availableModes.includes(mode) ? mode : "edit";
      this.mode = normalized;
      const isEdit = normalized === "edit";
      const isSplit = normalized === "split";
      const isPreview = normalized === "preview";
      this.workbench.classList.toggle("is-split", isSplit);
      this.source.classList.toggle("hidden", isPreview);
      this.preview.classList.toggle("hidden", isEdit);
      this.root.querySelectorAll("[data-md-mode]").forEach((button) => {
        const isActive = button.dataset.mdMode === normalized;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
      });
      if (!isEdit) this.preview.innerHTML = renderMarkdownPreview(this.getValue());
      if (!isPreview) {
        this.refresh();
        if (options.focus !== false) this.focus();
      }
      return this;
    }

    dispatchInput() {
      const event = new Event("input", { bubbles: true });
      event.markdownEditorInternal = true;
      this.textarea.dispatchEvent(event);
    }

    captureHistory() {
      return {
        value: this.getValue(),
        selectionStart: this.textarea.selectionStart || 0,
        selectionEnd: this.textarea.selectionEnd || 0
      };
    }

    resetHistory() {
      this.history = [this.captureHistory()];
      this.historyIndex = 0;
      this.updateHistoryButtons();
    }

    recordHistory() {
      const nextState = this.captureHistory();
      const currentState = this.history[this.historyIndex];
      if (currentState && currentState.value === nextState.value) {
        currentState.selectionStart = nextState.selectionStart;
        currentState.selectionEnd = nextState.selectionEnd;
        return;
      }
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push(nextState);
      if (this.history.length > 100) this.history.shift();
      this.historyIndex = this.history.length - 1;
      this.updateHistoryButtons();
    }

    updateHistoryButtons() {
      this.undoButton.disabled = this.historyIndex <= 0;
      this.redoButton.disabled = this.historyIndex < 0 || this.historyIndex >= this.history.length - 1;
    }

    restoreHistory(offset) {
      const nextIndex = this.historyIndex + offset;
      if (nextIndex < 0 || nextIndex >= this.history.length) return;
      this.historyIndex = nextIndex;
      const state = this.history[this.historyIndex];
      this.textarea.value = state.value;
      this.textarea.setSelectionRange(state.selectionStart, state.selectionEnd);
      this.refresh();
      this.updateHeadingIndicator();
      this.updateHistoryButtons();
      this.dispatchInput();
      this.focus();
    }

    replaceValue(value, selectionStart, selectionEnd) {
      const maximumLength = getMaximumLength(this.textarea);
      if (value.length > maximumLength) {
        if (typeof global.showToast === "function") global.showToast(`内容不能超过 ${maximumLength} 个字符`);
        return;
      }
      this.textarea.value = value;
      this.textarea.setSelectionRange(selectionStart, selectionEnd);
      this.recordHistory();
      this.refresh();
      this.updateHeadingIndicator();
      this.dispatchInput();
      this.focus();
    }

    wrapSelection(before, after, placeholder) {
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const selected = this.getValue().slice(start, end) || placeholder;
      const nextValue = this.getValue().slice(0, start) + before + selected + after + this.getValue().slice(end);
      this.replaceValue(nextValue, start + before.length, start + before.length + selected.length);
    }

    insertBlock(content, selectStartOffset, selectEndOffset) {
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const value = this.getValue();
      const prefix = start > 0 && value.charAt(start - 1) !== "\n" ? "\n" : "";
      const suffix = end < value.length && value.charAt(end) !== "\n" ? "\n" : "";
      const replacement = prefix + content + suffix;
      const selectionStart = start + prefix.length + (selectStartOffset || 0);
      const selectionEnd = start + prefix.length + (selectEndOffset == null ? content.length : selectEndOffset);
      this.replaceValue(value.slice(0, start) + replacement + value.slice(end), selectionStart, selectionEnd);
    }

    updateHeadingIndicator() {
      const value = this.getValue();
      const lineStart = value.lastIndexOf("\n", this.textarea.selectionStart - 1) + 1;
      let lineEnd = value.indexOf("\n", this.textarea.selectionStart);
      if (lineEnd < 0) lineEnd = value.length;
      const headingMatch = value.slice(lineStart, lineEnd).match(/^\s*(#{1,6})\s+/);
      const level = headingMatch ? headingMatch[1].length : 0;
      this.headingLabel.textContent = level ? `H${level}` : "正文";
      this.root.querySelectorAll("[data-heading-level]").forEach((button) => {
        button.classList.toggle("is-active", Number(button.dataset.headingLevel) === level);
      });
    }

    formatHeading(level) {
      const value = this.getValue();
      const selectionStart = this.textarea.selectionStart;
      const selectionEnd = this.textarea.selectionEnd;
      const blockStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      let blockEnd = value.indexOf("\n", selectionEnd);
      if (blockEnd < 0) blockEnd = value.length;
      const transformed = value.slice(blockStart, blockEnd).split("\n").map((line) => {
        if (!line.trim()) return line;
        const indent = (line.match(/^\s*/) || [""])[0];
        const body = line.slice(indent.length).replace(/^#{1,6}\s+/, "");
        return indent + (level ? "#".repeat(level) + " " : "") + body;
      }).join("\n");
      this.replaceValue(value.slice(0, blockStart) + transformed + value.slice(blockEnd), blockStart, blockStart + transformed.length);
    }

    formatSelectedLines(action) {
      const value = this.getValue();
      const selectionStart = this.textarea.selectionStart;
      const selectionEnd = this.textarea.selectionEnd;
      const blockStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      let blockEnd = value.indexOf("\n", selectionEnd);
      if (blockEnd < 0) blockEnd = value.length;
      const selectedLines = value.slice(blockStart, blockEnd).split("\n");
      const nonEmptyLines = selectedLines.filter((line) => line.trim());
      let isActive;
      let orderedIndex = 1;
      if (action === "unordered") {
        isActive = nonEmptyLines.length && nonEmptyLines.every((line) => /^\s*[-+*]\s+(?!\[[ xX]\]\s)/.test(line));
      } else if (action === "ordered") {
        isActive = nonEmptyLines.length && nonEmptyLines.every((line) => /^\s*\d+\.\s+/.test(line));
      } else if (action === "task") {
        isActive = nonEmptyLines.length && nonEmptyLines.every((line) => /^\s*[-+*]\s+\[[ xX]\]\s+/.test(line));
      } else {
        isActive = nonEmptyLines.length && nonEmptyLines.every((line) => /^\s*>\s+/.test(line));
      }
      const transformed = selectedLines.map((line) => {
        if (!line.trim()) return line;
        const indent = (line.match(/^\s*/) || [""])[0];
        let body = line.slice(indent.length);
        if (action === "unordered") {
          body = body.replace(/^(?:[-+*]\s+\[[ xX]\]|[-+*]|\d+\.)\s+/, "");
          return isActive ? indent + body : indent + "- " + body;
        }
        if (action === "ordered") {
          body = body.replace(/^(?:[-+*]\s+\[[ xX]\]|[-+*]|\d+\.)\s+/, "");
          return isActive ? indent + body : indent + `${orderedIndex++}. ${body}`;
        }
        if (action === "task") {
          body = body.replace(/^(?:[-+*]\s+\[[ xX]\]|[-+*]|\d+\.)\s+/, "");
          return isActive ? indent + body : indent + "- [ ] " + body;
        }
        body = body.replace(/^>\s+/, "");
        return isActive ? indent + body : indent + "> " + body;
      }).join("\n");
      this.replaceValue(value.slice(0, blockStart) + transformed + value.slice(blockEnd), blockStart, blockStart + transformed.length);
    }

    indentSelectedLines(outdent) {
      const value = this.getValue();
      const selectionStart = this.textarea.selectionStart;
      const selectionEnd = this.textarea.selectionEnd;
      if (selectionStart === selectionEnd && !outdent) {
        this.wrapSelection("  ", "", "");
        return;
      }
      const blockStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      let blockEnd = value.indexOf("\n", selectionEnd);
      if (blockEnd < 0) blockEnd = value.length;
      const transformed = value.slice(blockStart, blockEnd).split("\n").map((line) => (
        outdent ? line.replace(/^ {1,2}/, "") : "  " + line
      )).join("\n");
      this.replaceValue(value.slice(0, blockStart) + transformed + value.slice(blockEnd), blockStart, blockStart + transformed.length);
    }

    continueMarkdownLine() {
      const value = this.getValue();
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      let lineEnd = value.indexOf("\n", start);
      if (lineEnd < 0) lineEnd = value.length;
      const beforeCaret = value.slice(lineStart, start);
      const taskMatch = beforeCaret.match(/^(\s*)[-+*]\s+\[[ xX]\]\s+(.*)$/);
      const orderedMatch = beforeCaret.match(/^(\s*)(\d+)\.\s+(.*)$/);
      const unorderedMatch = beforeCaret.match(/^(\s*)[-+*]\s+(.*)$/);
      const quoteMatch = beforeCaret.match(/^(\s*)>\s+(.*)$/);
      let body;
      let prefix;
      if (taskMatch) {
        body = taskMatch[2];
        prefix = taskMatch[1] + "- [ ] ";
      } else if (orderedMatch) {
        body = orderedMatch[3];
        prefix = orderedMatch[1] + (Number(orderedMatch[2]) + 1) + ". ";
      } else if (unorderedMatch) {
        body = unorderedMatch[2];
        prefix = unorderedMatch[1] + unorderedMatch[0].trim().charAt(0) + " ";
      } else if (quoteMatch) {
        body = quoteMatch[2];
        prefix = quoteMatch[1] + "> ";
      } else {
        return false;
      }
      if (!body.trim() && !value.slice(start, lineEnd).trim()) {
        this.replaceValue(value.slice(0, lineStart) + value.slice(lineEnd), lineStart, lineStart);
        return true;
      }
      this.replaceValue(value.slice(0, start) + "\n" + prefix + value.slice(end), start + prefix.length + 1, start + prefix.length + 1);
      return true;
    }

    applyFormat(action) {
      if (action === "undo") return this.restoreHistory(-1);
      if (action === "redo") return this.restoreHistory(1);
      if (this.source.classList.contains("hidden")) this.setMode("edit");
      else this.focus();
      if (["unordered", "ordered", "task", "quote"].includes(action)) return this.formatSelectedLines(action);
      if (action === "bold") return this.wrapSelection("**", "**", "加粗文本");
      if (action === "italic") return this.wrapSelection("*", "*", "斜体文本");
      if (action === "strikethrough") return this.wrapSelection("~~", "~~", "删除线文本");
      if (action === "inlineCode") return this.wrapSelection("`", "`", "代码");
      if (action === "codeBlock") {
        const selected = this.getValue().slice(this.textarea.selectionStart, this.textarea.selectionEnd) || "代码内容";
        return this.insertBlock(`\`\`\`\n${selected}\n\`\`\``, 4, 4 + selected.length);
      }
      if (action === "table") {
        return this.insertBlock("| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |", 2, 5);
      }
      if (action === "horizontalRule") return this.insertBlock("---", 3, 3);
      if (action === "link") {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const label = this.getValue().slice(start, end) || "链接文字";
        const replacement = `[${label}](https://)`;
        const linkStart = start + label.length + 3;
        return this.replaceValue(this.getValue().slice(0, start) + replacement + this.getValue().slice(end), linkStart, linkStart + 8);
      }
      if (action === "image") {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const alt = this.getValue().slice(start, end) || "图片说明";
        const replacement = `![${alt}](https://)`;
        const sourceStart = start + alt.length + 4;
        return this.replaceValue(this.getValue().slice(0, start) + replacement + this.getValue().slice(end), sourceStart, sourceStart + 8);
      }
    }

    handleKeydown(event) {
      const key = String(event.key || "").toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "s") {
        event.preventDefault();
        if (typeof this.options.onSave === "function") this.options.onSave(this.getValue(), this);
      } else if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        this.restoreHistory(event.shiftKey ? 1 : -1);
      } else if ((event.ctrlKey || event.metaKey) && key === "y") {
        event.preventDefault();
        this.restoreHistory(1);
      } else if ((event.ctrlKey || event.metaKey) && key === "b") {
        event.preventDefault();
        this.applyFormat("bold");
      } else if ((event.ctrlKey || event.metaKey) && key === "i") {
        event.preventDefault();
        this.applyFormat("italic");
      } else if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        this.applyFormat("link");
      } else if (key === "tab") {
        event.preventDefault();
        this.indentSelectedLines(event.shiftKey);
      } else if (key === "enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (this.continueMarkdownLine()) event.preventDefault();
      } else if (key === "escape") {
        this.closePopovers();
      }
    }

    static mount(target, options = {}) {
      const textarea = typeof target === "string" ? document.querySelector(target) : target;
      if (!textarea) return null;
      return instances.get(textarea) || new MarkdownEditor(textarea, options);
    }

    static get(target) {
      const textarea = typeof target === "string" ? document.querySelector(target) : target;
      return textarea ? instances.get(textarea) || null : null;
    }
  }

  MarkdownEditor.renderPreview = renderMarkdownPreview;
  MarkdownEditor.renderSyntax = renderSyntaxMarkdown;
  global.MarkdownEditor = MarkdownEditor;
})(window);
