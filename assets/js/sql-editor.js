/* ======================================================================
 * 公共 SQL 编辑器
 * 使用 SmartQuerySqlEditor.render(options) 生成编辑器，并自动处理：
 * 高亮、行号、滚动同步、格式化、明暗主题和 Tab 缩进。
 * ====================================================================== */
(function () {
  'use strict';

  var preferredTheme = 'light';
  var KEYWORDS = {
    SELECT: true, FROM: true, WHERE: true, HAVING: true, JOIN: true,
    LEFT: true, RIGHT: true, INNER: true, OUTER: true, FULL: true,
    CROSS: true, ON: true, AS: true, AND: true, OR: true, NOT: true,
    IS: true, NULL: true, IN: true, LIKE: true, BETWEEN: true, EXISTS: true,
    GROUP: true, BY: true, ORDER: true, LIMIT: true, OFFSET: true,
    UNION: true, ALL: true, DISTINCT: true, CASE: true, WHEN: true,
    THEN: true, ELSE: true, END: true, DESC: true, ASC: true,
    INTERVAL: true, TRUE: true, FALSE: true
  };
  var FUNCTIONS = {
    SUM: true, COUNT: true, AVG: true, MAX: true, MIN: true,
    ROUND: true, ABS: true, SQRT: true, LOG: true, CONCAT: true,
    COALESCE: true, IFNULL: true, DATE_FORMAT: true, DATE_SUB: true,
    CURDATE: true, YEAR: true, QUARTER: true, GROUP_CONCAT: true
  };

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clampLines(value, minLines) {
    return Math.max(minLines, String(value || '').split('\n').length);
  }

  function lineNumbers(count) {
    var html = '';
    for (var i = 1; i <= count; i++) html += '<span>' + i + '</span>';
    return html;
  }

  function highlightSQL(sql) {
    var source = String(sql || '');
    var tokenPattern = /(--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g;
    var html = '';
    var lastIndex = 0;
    var match;

    while ((match = tokenPattern.exec(source))) {
      html += escapeHTML(source.slice(lastIndex, match.index));
      var token = match[0];
      var upper = token.toUpperCase();
      var className = '';

      if (/^(--|\/\*)/.test(token)) className = 'sq-sql-comment';
      else if (/^['"]/.test(token)) className = 'sq-sql-str';
      else if (/^\d/.test(token)) className = 'sq-sql-num';
      else if (FUNCTIONS[upper]) className = 'sq-sql-fn';
      else if (KEYWORDS[upper]) className = 'sq-sql-kw';

      html += className
        ? '<span class="' + className + '">' + escapeHTML(token) + '</span>'
        : escapeHTML(token);
      lastIndex = tokenPattern.lastIndex;
    }

    return html + escapeHTML(source.slice(lastIndex));
  }

  function formatSQL(sql) {
    var text = String(sql || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';

    [
      'UNION ALL', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN',
      'GROUP BY', 'ORDER BY', 'SELECT', 'FROM', 'WHERE', 'HAVING',
      'JOIN', 'LIMIT', 'OFFSET', 'UNION'
    ].forEach(function (keyword) {
      var pattern = keyword.replace(/\s+/g, '\\s+');
      text = text.replace(new RegExp('\\s+' + pattern + '\\s+', 'ig'), '\n' + keyword + ' ');
    });

    text = text.replace(/\s+(AND|OR)\s+/ig, '\n  $1 ');
    text = text.replace(/,\s*/g, ',\n  ');
    return text.replace(/^\n+/, '').split('\n').map(function (line) {
      return line.replace(/\s+$/g, '');
    }).join('\n');
  }

  function themeIcon(theme) {
    return theme === 'dark'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.41M17.66 6.34l1.41-1.41"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  function formatIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h13"/><path d="M18 9l2 2 2-2"/></svg>';
  }

  function render(options) {
    var opts = options || {};
    var value = String(opts.value || '');
    var minLines = Math.max(3, parseInt(opts.minLines, 10) || 6);
    var lines = clampLines(value, minLines);
    var theme = opts.theme === 'dark' ? 'dark' : (opts.theme === 'light' ? 'light' : preferredTheme);
    var readonly = !!opts.readonly;
    var bindAttr = opts.bind ? ' data-bind="' + escapeHTML(opts.bind) + '"' : '';
    var title = escapeHTML(opts.title || 'SQL Editor');
    var placeholder = escapeHTML(opts.placeholder || '请输入 SQL');
    var ariaLabel = escapeHTML(opts.ariaLabel || opts.title || 'SQL 编辑器');
    var themeText = theme === 'dark' ? '浅色' : '深色';

    return ''
      + '<div class="sq-sql-editor is-' + theme + (readonly ? ' is-readonly' : '') + '" data-role="sql-editor" data-sql-min-lines="' + minLines + '">'
      +   '<div class="sq-sql-toolbar">'
      +     '<span class="sq-sql-dot"></span><span class="sq-sql-dot"></span><span class="sq-sql-dot"></span>'
      +     '<strong>' + title + '</strong>'
      +     '<span class="sq-sql-toolbar-spacer"></span>'
      +     '<button type="button" class="sq-sql-action" data-sql-action="theme">' + themeIcon(theme) + '<span>' + themeText + '</span></button>'
      +     (readonly ? '' : '<button type="button" class="sq-sql-action" data-sql-action="format">' + formatIcon() + '<span>格式化</span></button>')
      +   '</div>'
      +   '<div class="sq-sql-body">'
      +     '<div class="sq-sql-lines" aria-hidden="true"><div class="sq-sql-lines-inner">' + lineNumbers(lines) + '</div></div>'
      +     '<div class="sq-sql-code">'
      +       '<pre class="sq-sql-highlight" aria-hidden="true">' + highlightSQL(value) + '</pre>'
      +       '<textarea class="sq-sql-input"' + bindAttr + ' rows="' + lines + '" wrap="off" spellcheck="false" aria-label="' + ariaLabel + '" placeholder="' + placeholder + '"' + (readonly ? ' readonly' : '') + '>' + escapeHTML(value) + '</textarea>'
      +     '</div>'
      +   '</div>'
      + '</div>';
  }

  function sync(input) {
    var editor = input && input.closest ? input.closest('.sq-sql-editor') : null;
    if (!editor) return;
    var minLines = Math.max(3, parseInt(editor.getAttribute('data-sql-min-lines'), 10) || 6);
    var lines = clampLines(input.value, minLines);
    var lineBox = editor.querySelector('.sq-sql-lines-inner');
    var highlight = editor.querySelector('.sq-sql-highlight');
    if (lineBox) lineBox.innerHTML = lineNumbers(lines);
    if (highlight) highlight.innerHTML = highlightSQL(input.value);
    input.rows = lines;
    syncScroll(input);
  }

  function syncScroll(input) {
    var editor = input && input.closest ? input.closest('.sq-sql-editor') : null;
    if (!editor) return;
    var highlight = editor.querySelector('.sq-sql-highlight');
    var lineBox = editor.querySelector('.sq-sql-lines-inner');
    if (highlight) {
      highlight.style.transform = 'translate(' + (-input.scrollLeft) + 'px, ' + (-input.scrollTop) + 'px)';
    }
    if (lineBox) lineBox.style.transform = 'translateY(' + (-input.scrollTop) + 'px)';
  }

  function toggleTheme(editor) {
    if (!editor) return;
    var nextTheme = editor.classList.contains('is-dark') ? 'light' : 'dark';
    preferredTheme = nextTheme;
    editor.classList.toggle('is-dark', nextTheme === 'dark');
    editor.classList.toggle('is-light', nextTheme === 'light');
    var button = editor.querySelector('[data-sql-action="theme"]');
    if (button) {
      button.innerHTML = themeIcon(nextTheme) + '<span>' + (nextTheme === 'dark' ? '浅色' : '深色') + '</span>';
    }
  }

  function formatInput(input) {
    if (!input || input.readOnly) return;
    input.value = formatSQL(input.value);
    sync(input);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    if (typeof window.showToast === 'function') window.showToast('SQL 已格式化');
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest && event.target.closest('[data-sql-action]');
    if (!button) return;
    var editor = button.closest('.sq-sql-editor');
    if (!editor) return;
    var action = button.getAttribute('data-sql-action');
    if (action === 'theme') toggleTheme(editor);
    if (action === 'format') formatInput(editor.querySelector('.sq-sql-input'));
  });

  document.addEventListener('input', function (event) {
    if (event.target && event.target.classList && event.target.classList.contains('sq-sql-input')) {
      sync(event.target);
    }
  });

  document.addEventListener('scroll', function (event) {
    if (event.target && event.target.classList && event.target.classList.contains('sq-sql-input')) {
      syncScroll(event.target);
    }
  }, true);

  document.addEventListener('keydown', function (event) {
    var input = event.target;
    if (!input || !input.classList || !input.classList.contains('sq-sql-input') || input.readOnly) return;
    if (event.key !== 'Tab') return;
    event.preventDefault();
    var start = input.selectionStart;
    var end = input.selectionEnd;
    input.value = input.value.slice(0, start) + '  ' + input.value.slice(end);
    input.selectionStart = input.selectionEnd = start + 2;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  window.SmartQuerySqlEditor = {
    render: render,
    format: formatSQL,
    highlight: highlightSQL,
    sync: sync
  };
})();
