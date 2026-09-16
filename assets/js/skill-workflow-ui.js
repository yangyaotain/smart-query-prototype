(function (global) {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paths = { plus: 'M12 5v14M5 12h14', upload: 'M12 16V3M7 8l5-5 5 5M4 15v6h16v-6', back: 'M19 12H5M11 6l-6 6 6 6', save: 'M5 3h12l4 4v14H3V3h2M7 3v6h10V3M7 21v-8h10v8', edit: 'M14 5l5 5M4 20l4-1L21 6l-4-4L4 15v5', document: 'M6 3h9l4 4v14H6V3M14 3v5h5M9 12h7M9 16h7', run: 'M8 4v16l12-8L8 4', check: 'M5 12l4 4L20 5', close: 'M6 6l12 12M18 6L6 18', search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0', reset: 'M4 4v6h6M4 10a8 8 0 1 1 1 8', trash: 'M3 6h18M5 6l1 15h12l1-15M9 6V3h6v3', chat: 'M3 4h18v13H8l-5 4V4M7 9h10M7 13h6', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0', send: 'M3 3l18 9-18 9 4-9-4-9M7 12h14', list: 'M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1', download: 'M12 3v12M7 10l5 5 5-5M4 17v4h16v-4' };
  const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.document}"/></svg>`;
  const button = (name, text, attrs = '', style = 'ghost-btn') => `<button type="button" class="${style} sw-button" ${attrs}>${icon(name)}${text}</button>`;
  function message(error) { global.showToast(error?.message || String(error)); }
  let activeClose = null;
  function modal(title, subtitle, body, footer, { drawer = false, onClose } = {}) {
    activeClose?.();
    const lastFocus = document.activeElement;
    const host = document.createElement('div'); host.className = 'sw-modal-host';
    host.innerHTML = `<div class="modal-mask"></div><section class="modal sw-modal ${drawer ? 'sw-drawer' : ''}" role="dialog" aria-modal="true" aria-labelledby="swModalTitle"><div class="modal-head"><div><h3 id="swModalTitle">${esc(title)}</h3><p>${esc(subtitle)}</p></div>${button('close', '关闭', 'data-close')}</div><div class="modal-body">${body}</div><div class="modal-foot">${footer}</div></section>`;
    document.body.append(host);
    const close = () => { if (onClose && onClose() === false) return; host.remove(); document.removeEventListener('keydown', keyboard); activeClose = null; lastFocus?.focus(); };
    function keyboard(e) {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab') return;
      const nodes = [...host.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea, select, a[href], [contenteditable="true"]:not([tabindex="-1"])')].filter((n) => n.offsetParent !== null);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
    host.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    host.querySelector('.modal-mask').addEventListener('click', close);
    document.addEventListener('keydown', keyboard); activeClose = close;
    host.querySelector('input:not([type=file]),textarea,button')?.focus();
    return { host, close };
  }
  function promptEditor(host, initialValue) {
    const editor = host.querySelector('#swUserPrompt');
    const toolbar = host.querySelector('#swPromptVariables');
    const count = host.querySelector('#swPromptCount');
    let savedRange = null;
    const value = () => String(editor.innerText || editor.textContent || '').replace(/\u00a0/g, ' ').trim();
    function token(label) {
      const chip = document.createElement('span');
      chip.className = 'sw-prompt-variable'; chip.contentEditable = 'false';
      const text = document.createElement('span');
      text.className = 'sw-prompt-variable-text'; text.contentEditable = 'true'; text.tabIndex = -1; text.spellcheck = false;
      text.textContent = label.trim() || '自定义';
      text.setAttribute('aria-label', '变量名称');
      chip.append(document.createTextNode('【'), text, document.createTextNode('】'));
      return chip;
    }
    function refresh() {
      const length = value().length;
      count.textContent = `${length} / 2000`;
      count.classList.toggle('sw-error', length > 2000);
      editor.setAttribute('aria-invalid', String(length > 2000));
      const labels = [...new Set([...editor.querySelectorAll('.sw-prompt-variable-text')].map((el) => el.textContent.trim()).filter(Boolean))];
      toolbar.innerHTML = labels.map((label) => button('plus', esc(label), `data-prompt-variable="${esc(label)}"`)).join('') + button('plus', '新增变量', 'data-new-variable');
    }
    function currentRange() {
      const selection = global.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (!range || !editor.contains(range.commonAncestorContainer)) return null;
      const element = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
      const chip = element.closest?.('.sw-prompt-variable');
      const safe = range.cloneRange();
      if (chip) { safe.setStartAfter(chip); safe.collapse(true); }
      return safe;
    }
    function rememberRange() { savedRange = currentRange() || savedRange; }
    function selectRange(range) {
      const selection = global.getSelection();
      selection?.removeAllRanges(); selection?.addRange(range);
    }
    function insert(label, edit) {
      let range = currentRange() || savedRange;
      if (!range || !editor.contains(range.commonAncestorContainer)) {
        range = document.createRange(); range.selectNodeContents(editor); range.collapse(false);
      }
      range.deleteContents();
      const chip = token(label), after = document.createTextNode('');
      range.insertNode(chip); chip.after(after);
      if (edit) {
        const text = chip.querySelector('.sw-prompt-variable-text');
        text.focus(); range.selectNodeContents(text);
      } else {
        editor.focus(); range.setStart(after, 0); range.collapse(true);
      }
      selectRange(range); rememberRange(); refresh();
    }
    const text = String(initialValue || ''), pattern = /【([^【】\r\n]+)】/g;
    let cursor = 0, match;
    while ((match = pattern.exec(text))) {
      editor.append(document.createTextNode(text.slice(cursor, match.index)), token(match[1]));
      cursor = match.index + match[0].length;
    }
    editor.append(document.createTextNode(text.slice(cursor)));
    editor.addEventListener('input', () => { rememberRange(); refresh(); });
    editor.addEventListener('keyup', rememberRange);
    editor.addEventListener('mouseup', rememberRange);
    editor.addEventListener('paste', (event) => {
      event.preventDefault();
      const insideVariable = event.target.closest?.('.sw-prompt-variable-text');
      const pasted = event.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, insideVariable ? pasted.replace(/[【】\r\n]/g, '') : pasted);
      rememberRange(); refresh();
    });
    editor.addEventListener('keydown', (event) => {
      const text = event.target.closest?.('.sw-prompt-variable-text');
      if (!text || event.key !== 'Enter' || event.isComposing) return;
      event.preventDefault();
      const chip = text.closest('.sw-prompt-variable');
      let after = chip.nextSibling;
      if (!after || after.nodeType !== Node.TEXT_NODE) { after = document.createTextNode(''); chip.after(after); }
      editor.focus();
      const range = document.createRange(); range.setStart(after, 0); range.collapse(true);
      selectRange(range); rememberRange();
    });
    editor.addEventListener('focusout', (event) => {
      const text = event.target.closest?.('.sw-prompt-variable-text');
      if (!text) return;
      text.textContent = text.textContent.replace(/[【】\r\n]/g, '').trim() || '自定义';
      refresh();
    });
    toolbar.addEventListener('mousedown', (event) => { if (event.target.closest('button')) event.preventDefault(); });
    toolbar.addEventListener('click', (event) => {
      const trigger = event.target.closest('button');
      if (trigger) insert(trigger.dataset.promptVariable || '自定义', trigger.hasAttribute('data-new-variable'));
    });
    refresh();
    return {
      value,
      validate() {
        const prompt = value();
        if (prompt && prompt.length <= 2000) return true;
        editor.setAttribute('aria-invalid', 'true'); editor.focus();
        message(prompt ? '业务端预置提示词不能超过 2000 字。' : '请填写业务端预置提示词。');
        return false;
      }
    };
  }
  function basic(id, onSaved) {
    const Store = global.SkillCatalogStore;
    const skill = Store.load().find((s) => s.id === id);
    if (!skill || skill.parseStatus !== 'completed') return message('请等待模板解析完成。');
    if (skill.enabled) return message('请先停用技能，再修改基本信息。');
    const form = `<form id="swBasicForm" class="sw-form"><div class="sw-note">以下配置由模板解析生成，可校正后保存。</div><label>技能名称 <em>*</em><input name="name" maxlength="60" required value="${esc(skill.name)}"></label><label>技能说明 <em>*</em><textarea name="desc" rows="3" maxlength="300" required>${esc(skill.desc)}</textarea></label><label>技能分类 <em>*</em><select name="category"><option ${skill.category === '经营报告' ? 'selected' : ''}>经营报告</option><option ${skill.category === '专项分析' ? 'selected' : ''}>专项分析</option></select></label><fieldset><legend>适用分析主题 <em>*</em></legend><input type="search" id="swThemeSearch" placeholder="搜索分析主题"><div class="sw-options">${Store.themes.map((t) => `<label data-theme="${esc(t)}"><input type="checkbox" name="themes" value="${esc(t)}" ${skill.themes.includes(t) ? 'checked' : ''}>${esc(t)}</label>`).join('')}</div><p class="hidden" id="swThemeEmpty">未找到匹配的分析主题</p></fieldset><div class="sw-prompt-field"><label id="swPromptLabel">业务端预置提示词 <em>*</em></label><div id="swPromptVariables" class="sw-prompt-variables" role="group" aria-label="插入提示词变量"></div><div id="swUserPrompt" class="sw-prompt-editor" contenteditable="true" tabindex="0" role="textbox" aria-multiline="true" aria-required="true" aria-labelledby="swPromptLabel" aria-describedby="swPromptHelp swPromptCount" data-placeholder="填写选中技能后自动填入的默认任务，可插入变量" spellcheck="true"></div><div id="swPromptCount" class="sw-prompt-count"></div><small id="swPromptHelp">浅蓝色变量可点击修改、删除，也可通过上方按钮插入。选中技能后整段填入业务端输入框，用户可以自由修改。</small></div></form>`;
    const { host, close } = modal('基本信息', skill.reportTemplate?.name || skill.name, form, button('back', '取消', 'data-close') + button('save', '保存配置', 'id="swBasicSave"', 'primary-btn'), { drawer: true });
    const prompt = promptEditor(host, skill.userPrompt);
    host.querySelector('#swThemeSearch').addEventListener('input', (e) => {
      let visible = 0;
      host.querySelectorAll('[data-theme]').forEach((el) => { const match = el.dataset.theme.includes(e.target.value.trim()); el.classList.toggle('hidden', !match); if (match) visible++; });
      host.querySelector('#swThemeEmpty').classList.toggle('hidden', visible > 0);
    });
    host.querySelector('#swBasicSave').onclick = () => {
      const formEl = host.querySelector('form');
      if (!formEl.reportValidity()) return;
      const fd = new FormData(formEl), selected = fd.getAll('themes');
      if (!selected.length) return message('请至少选择一个分析主题。');
      if (!prompt.validate()) return;
      try {
        Store.update(id, (s) => {
          if (s.enabled) throw new Error('技能已启用，请先停用后再修改基本信息。');
          s.name = fd.get('name').trim(); s.desc = fd.get('desc').trim(); s.category = fd.get('category'); s.userPrompt = prompt.value();
          s.testParams = Store.normalizeTestParams(s, s.testParams);
          const changed = JSON.stringify(s.themes) !== JSON.stringify(selected);
          s.themes = selected;
          if (changed) s.parts.forEach((p) => { if (!selected.includes(p.theme)) { p.theme = selected[0]; Store.invalidate(s, p.id); } });
        });
        close(); onSaved?.(); message('基本信息已保存。');
      } catch (e) { message(e); }
    };
  }
  global.SkillWorkflowUI = { esc, icon, button, modal, basic, message };
})(window);
