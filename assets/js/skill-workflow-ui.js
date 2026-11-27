(function (global) {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paths = { plus: 'M12 5v14M5 12h14', upload: 'M12 16V3M7 8l5-5 5 5M4 15v6h16v-6', back: 'M19 12H5M11 6l-6 6 6 6', save: 'M5 3h12l4 4v14H3V3h2M7 3v6h10V3M7 21v-8h10v8', edit: 'M14 5l5 5M4 20l4-1L21 6l-4-4L4 15v5', document: 'M6 3h9l4 4v14H6V3M14 3v5h5M9 12h7M9 16h7', run: 'M8 4v16l12-8L8 4', check: 'M5 12l4 4L20 5', close: 'M6 6l12 12M18 6L6 18', search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0', reset: 'M4 4v6h6M4 10a8 8 0 1 1 1 8', trash: 'M3 6h18M5 6l1 15h12l1-15M9 6V3h6v3', chat: 'M3 4h18v13H8l-5 4V4M7 9h10M7 13h6', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0', send: 'M3 3l18 9-18 9 4-9-4-9M7 12h14', list: 'M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1', download: 'M12 3v12M7 10l5 5 5-5M4 17v4h16v-4' };
  const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.document}"/></svg>`;
  const wordFileIcon = () => '<span class="word-file-icon" role="img" aria-label="Word 文档"><b>W</b></span>';
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
  function promptEditor(host, skill) {
    const Store = global.SkillCatalogStore;
    const editor = host.querySelector('#swUserPrompt');
    const toolbar = host.querySelector('#swPromptVariables');
    const count = host.querySelector('#swPromptCount');
    const variables = skill.promptVariables.map((variable) => ({ ...variable }));
    count.insertAdjacentHTML('afterend', '<div class="sw-note sw-prompt-variable-form hidden" id="swVariableForm"><label>变量名<input type="text" data-variable-label maxlength="40" placeholder="例如：采购品类" aria-describedby="swVariableHelp"></label><small id="swVariableHelp"></small><small class="sw-error hidden" data-variable-error role="alert"></small><div class="sw-prompt-variables">' + button('close', '取消', 'data-variable-cancel') + button('check', '应用变量', 'data-variable-apply', 'secondary-btn') + '</div></div>');
    const panel = host.querySelector('#swVariableForm');
    const labelInput = panel.querySelector('[data-variable-label]');
    const error = panel.querySelector('[data-variable-error]');
    let savedRange = null, editing = null;
    const value = () => String(editor.innerText || editor.textContent || '').replace(/\u00a0/g, ' ').trim();
    const activeVariables = () => {
      const labels = new Set(Store.promptLabels(value()));
      return variables.filter(({ label }) => labels.has(label));
    };
    function updateToken(chip, variable) {
      chip.dataset.promptKey = variable.key;
      chip.textContent = '【' + variable.label + '】';
      chip.title = variable.label;
      chip.setAttribute('aria-label', '编辑变量：' + chip.title);
    }
    function token(variable) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'sw-prompt-variable'; chip.contentEditable = 'false';
      updateToken(chip, variable);
      return chip;
    }
    function refresh() {
      const length = value().length;
      count.textContent = `${length} / 2000`;
      count.classList.toggle('sw-error', length > 2000);
      editor.setAttribute('aria-invalid', String(length > 2000));
      toolbar.innerHTML = variables.map(({ key, label }) => button('plus', esc(label), 'data-prompt-variable="' + esc(key) + '"')).join('') + button('plus', '新增变量', 'data-new-variable');
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
    function insert(variable) {
      let range = currentRange() || savedRange;
      if (!range || !editor.contains(range.commonAncestorContainer)) {
        range = document.createRange(); range.selectNodeContents(editor); range.collapse(false);
      }
      range.deleteContents();
      const chip = token(variable), after = document.createTextNode('');
      range.insertNode(chip); chip.after(after);
      editor.focus(); range.setStart(after, 0); range.collapse(true);
      selectRange(range); rememberRange(); refresh();
    }
    function openVariable(variable) {
      rememberRange();
      editing = variable || null;
      labelInput.value = editing?.label || '';
      panel.querySelector('#swVariableHelp').textContent = editing
        ? '保存配置时，会同步更新 SQL 中引用此变量的位置。'
        : '输入中文名，同一技能内的变量名不能重复。';
      error.classList.add('hidden');
      panel.classList.remove('hidden');
      labelInput.focus();
    }
    function applyVariable() {
      const label = labelInput.value.trim();
      let reason = '';
      if (!label || (label !== editing?.label && !/\p{Script=Han}/u.test(label))) reason = '请填写中文变量名，例如采购品类。';
      else if (!Store.validSqlVariableName(label)) reason = '变量名不能包含大括号、【】或换行。';
      else if (variables.some((variable) => variable !== editing && variable.label === label)) reason = '此变量名已存在。';
      if (reason) {
        error.textContent = reason;
        error.classList.remove('hidden');
        return false;
      }
      panel.classList.add('hidden');
      if (editing) {
        const chips = [...editor.querySelectorAll('[data-prompt-key]')].filter((chip) => chip.dataset.promptKey === editing.key);
        // Pasted occurrences share the same mapping as the inserted chips.
        const nodes = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
        const to = '【' + label + '】';
        while (nodes.nextNode()) {
          const node = nodes.currentNode;
          if (!node.parentElement.closest('[data-prompt-key]')) {
            const text = node.data.replace(/【([^【】\r\n]+)】/g, (token, name) => name.trim() === editing.label ? to : token);
            if (text !== node.data) node.data = text;
          }
        }
        editing.label = label;
        chips.forEach((chip) => updateToken(chip, editing));
        refresh();
        (chips[0] || editor).focus();
      } else {
        const variable = Store.createPromptVariable(label, variables);
        variables.push(variable);
        insert(variable);
      }
      return true;
    }
    const text = String(skill.userPrompt || ''), pattern = /【([^【】\r\n]+)】/g;
    let cursor = 0, match;
    while ((match = pattern.exec(text))) {
      const variable = variables.find(({ label }) => label === match[1].trim());
      editor.append(document.createTextNode(text.slice(cursor, match.index)), variable ? token(variable) : document.createTextNode(match[0]));
      cursor = match.index + match[0].length;
    }
    editor.append(document.createTextNode(text.slice(cursor)));
    editor.addEventListener('input', () => { rememberRange(); refresh(); });
    editor.addEventListener('keyup', rememberRange);
    editor.addEventListener('mouseup', rememberRange);
    editor.addEventListener('paste', (event) => {
      event.preventDefault();
      document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
      rememberRange(); refresh();
    });
    editor.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-prompt-key]');
      if (chip) openVariable(variables.find(({ key }) => key === chip.dataset.promptKey));
    });
    toolbar.addEventListener('mousedown', (event) => { if (event.target.closest('button')) event.preventDefault(); });
    toolbar.addEventListener('click', (event) => {
      const trigger = event.target.closest('button');
      if (!trigger) return;
      const variable = variables.find(({ key }) => key === trigger.dataset.promptVariable);
      if (variable) insert(variable);
      else openVariable();
    });
    panel.querySelector('[data-variable-cancel]').onclick = () => { panel.classList.add('hidden'); editor.focus(); };
    panel.querySelector('[data-variable-apply]').onclick = applyVariable;
    panel.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.isComposing || event.target.tagName !== 'INPUT') return;
      event.preventDefault(); applyVariable();
    });
    refresh();
    return {
      value,
      variables: activeVariables,
      validate() {
        if (!panel.classList.contains('hidden') && !applyVariable()) return false;
        const prompt = value();
        if (prompt && prompt.length <= 2000) {
          const unknown = Store.promptLabels(prompt).find((label) => !variables.some((variable) => variable.label === label));
          if (!unknown) return true;
          message('请通过“新增变量”添加「' + unknown + '」。');
          return false;
        }
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
    if (skill.analysisJob) return message('技能正在重新分析，请完成后再修改基本信息。');
    if (skill.enabled) return message('请先停用技能，再修改基本信息。');
    const form = `<form id="swBasicForm" class="sw-form"><div class="sw-note">名称、说明、分类与预置提示词由模板解析生成，可校正后保存。</div><label>技能名称 <em>*</em><input name="name" maxlength="60" required value="${esc(skill.name)}"></label><label>技能说明 <em>*</em><textarea name="desc" rows="3" maxlength="300" required>${esc(skill.desc)}</textarea></label><label>技能分类 <em>*</em><select name="category"><option ${skill.category === '经营报告' ? 'selected' : ''}>经营报告</option><option ${skill.category === '专项分析' ? 'selected' : ''}>专项分析</option></select></label><fieldset><legend>适用分析主题</legend><div class="ks-tag-list sw-theme-readonly">${skill.themes.map((theme) => `<span class="ks-tag">${esc(theme)}</span>`).join('') || '<span class="sw-muted">未设置适用分析主题</span>'}</div><small>主题范围由模板分析确定，可在技能列表通过【重新分析】调整。</small></fieldset><div class="sw-prompt-field"><label id="swPromptLabel">业务端预置提示词 <em>*</em></label><div id="swPromptVariables" class="sw-prompt-variables" role="group" aria-label="插入提示词变量"></div><div id="swUserPrompt" class="sw-prompt-editor" contenteditable="true" tabindex="0" role="textbox" aria-multiline="true" aria-required="true" aria-labelledby="swPromptLabel" aria-describedby="swPromptHelp swPromptCount" data-placeholder="填写选中技能后自动填入的默认任务，可插入变量" spellcheck="true"></div><div id="swPromptCount" class="sw-prompt-count"></div><small id="swPromptHelp">浅蓝色变量可点击修改、删除，也可通过上方按钮插入。选中技能后整段填入业务端输入框，用户可以自由修改。</small></div></form>`;
    const { host, close } = modal('基本信息', skill.reportTemplate?.name || skill.name, form, button('back', '取消', 'data-close') + button('save', '保存配置', 'id="swBasicSave"', 'primary-btn'), { drawer: true });
    const prompt = promptEditor(host, skill);
    host.querySelector('#swBasicSave').onclick = () => {
      const formEl = host.querySelector('form');
      if (!formEl.reportValidity()) return;
      const fd = new FormData(formEl);
      if (!prompt.validate()) return;
      try {
        let updatedParts = 0;
        Store.update(id, (s) => {
          if (s.enabled) throw new Error('技能已启用，请先停用后再修改基本信息。');
          if (s.analysisJob || s.contentVersion !== skill.contentVersion) throw new Error('技能已重新分析，请重新打开基本信息。');
          if (s.userPrompt !== skill.userPrompt || JSON.stringify(s.promptVariables) !== JSON.stringify(skill.promptVariables)) throw new Error('预置提示词已被其他窗口修改，请重新打开基本信息。');
          updatedParts = Store.updatePromptVariables(s, prompt.value(), prompt.variables());
          s.name = fd.get('name').trim(); s.desc = fd.get('desc').trim(); s.category = fd.get('category');
        });
        close(); onSaved?.();
        message(updatedParts ? `已保存，并更新 ${updatedParts} 项内容的 SQL，请重新测试确认。` : '基本信息已保存。');
      } catch (e) { message(e); }
    };
  }
  global.SkillWorkflowUI = { esc, icon, wordFileIcon, button, modal, basic, message };
})(window);
