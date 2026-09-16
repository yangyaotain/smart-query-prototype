(function () {
  'use strict';
  const Store = window.SkillCatalogStore, UI = window.SkillWorkflowUI, IO = window.SkillTemplateIO;
  const { esc, button, icon, message } = UI;
  const $ = (id) => document.getElementById(id);
  const parsing = new Set();
  let appliedKeyword = '', lastSnapshot = '', currentPage = 1, pageSize = 10;
  function paginationItems(totalPages) {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const items = [1];
    if (currentPage > 4) items.push('ellipsis-before');
    for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page += 1) items.push(page);
    if (currentPage < totalPages - 3) items.push('ellipsis-after');
    items.push(totalPages);
    return items;
  }
  function renderPagination(total, totalPages) {
    $('ksPagination').classList.toggle('hidden', total === 0);
    $('ksPrevPage').disabled = currentPage <= 1;
    $('ksNextPage').disabled = currentPage >= totalPages;
    $('ksPageNumbers').innerHTML = paginationItems(totalPages).map((item) => typeof item === 'number'
      ? `<button type="button" class="ks-page-number${item === currentPage ? ' is-active' : ''}" data-page="${item}" ${item === currentPage ? 'aria-current="page"' : ''}>${item}</button>`
      : '<button type="button" class="ks-page-number" disabled aria-hidden="true">…</button>').join('');
  }
  function render() {
    try {
      const skills = Store.load(); lastSnapshot = localStorage.getItem(Store.key);
      const orderedSkills = [...skills.filter((s) => s.parseStatus === 'parsing'), ...skills.filter((s) => s.parseStatus !== 'parsing')];
      const rows = orderedSkills.filter((s) => `${s.name} ${s.code}`.toLowerCase().includes(appliedKeyword.toLowerCase()))
        .filter((s) => !$('ksCategoryFilter').value || s.category === $('ksCategoryFilter').value)
        .filter((s) => !$('ksThemeFilter').value || s.themes.includes($('ksThemeFilter').value))
        .filter((s) => !$('ksStatusFilter').value || s.enabled === ($('ksStatusFilter').value === 'enabled'));
      const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
      currentPage = Math.min(Math.max(1, currentPage), totalPages);
      const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
      $('ksTableBody').innerHTML = pageRows.map((s) => {
        const confirmed = s.parts.filter((p) => p.confirmed).length;
        const complete = s.parseStatus === 'completed';
        const progress = s.parseStatus === 'parsing' ? '<span class="sw-status is-parsing"><i class="sw-spinner"></i>解析中</span><small>识别模板内容与执行配置</small>' : s.parseStatus === 'failed' ? `<span class="sw-status is-error">解析失败</span><small title="${esc(s.parseError)}">${esc(s.parseError)}</small>` : `<span class="sw-status ${confirmed === s.parts.length && s.parts.length ? 'is-confirmed' : 'is-pending'}">${confirmed === s.parts.length && s.parts.length ? '已确认' : '待确认'} · ${confirmed}/${s.parts.length} 项</span><div class="sw-progress"><i style="width:${s.parts.length ? confirmed / s.parts.length * 100 : 0}%"></i></div>`;
        const enabledStatus = `<span class="sw-status ${s.enabled ? 'is-enabled' : 'is-disabled'}">${s.enabled ? '已启用' : '已停用'}</span>`;
        const actions = s.enabled
          ? button('close', '停用', `data-action="status" data-id="${esc(s.id)}"`, 'sw-status-action is-disable-action')
          : complete
            ? button('edit', '基本信息', `data-action="basic" data-id="${esc(s.id)}"`, 'sw-link') + button('document', '内容配置', `data-action="content" data-id="${esc(s.id)}"`, 'sw-link') + (Store.isReady(s) ? button('check', '启用', `data-action="status" data-id="${esc(s.id)}"`, 'sw-status-action is-enable-action') : '')
            : s.parseStatus === 'failed' ? button('reset', '重新导入', `data-action="retry" data-id="${esc(s.id)}"`, 'sw-link') : '';
        const deleteAction = s.enabled ? '' : button('trash', '删除', `data-action="delete" data-id="${esc(s.id)}"`, 'sw-link sw-danger');
        return `<tr><td><div class="ks-skill-cell"><span class="ks-skill-icon">${icon('document')}</span><div><strong>${esc(s.name)}</strong><span title="${esc(s.reportTemplate?.name)}">${esc(s.reportTemplate?.name || '待导入 Word 模板')}</span></div></div></td><td>${esc(s.category || '解析后生成')}</td><td><div class="ks-tag-list">${s.themes.slice(0, 2).map((t) => `<span class="ks-tag">${esc(t)}</span>`).join('')}${s.themes.length > 2 ? `<span class="ks-tag" title="${esc(s.themes.join('、'))}">+${s.themes.length - 2}</span>` : ''}</div></td><td class="sw-parse-cell">${progress}</td><td>${enabledStatus}</td><td>${esc(s.updated)}</td><td><div class="sw-row-actions">${actions}${deleteAction}</div></td></tr>`;
      }).join('');
      $('ksEmpty').classList.toggle('hidden', rows.length > 0);
      $('ksListCount').textContent = `共 ${rows.length} 项技能`;
      renderPagination(rows.length, totalPages);
      skills.filter((s) => s.parseStatus === 'parsing' && s.reportTemplate?.source === 'uploaded').forEach((s) => resumeParse(s.id));
    } catch (e) { message(e); }
  }
  async function resumeParse(id) {
    if (parsing.has(id)) return;
    parsing.add(id);
    try {
      const file = await IO.get(id);
      if (!file) throw new Error('未找到已导入的 Word 原文件，请重新导入。');
      const started = Date.now();
      const parsed = await IO.parseFile(file);
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, 2200 - (Date.now() - started))));
      Store.update(id, (s) => { if (s.parseStatus !== 'parsing') return; Object.assign(s, parsed); s.parseStatus = 'completed'; delete s.parseError; });
    } catch (e) {
      if (Store.load().some((s) => s.id === id)) {
        try { Store.update(id, (s) => { s.parseStatus = 'failed'; s.parseError = e.message || '文档解析失败，请重新导入。'; }); } catch (saveError) { message(saveError); }
      }
    } finally { parsing.delete(id); render(); }
  }
  function upload(retryId) {
    let selected = null, busy = false;
    const { host, close } = UI.modal(retryId ? '重新导入模板' : '新增技能', '导入 Word 模板，提交后自动解析并生成技能配置。', `<label class="sw-upload" id="swDrop"><input type="file" id="swFile" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"><span class="sw-upload-icon">${icon('upload')}</span><strong id="swFileLabel">点击选择或拖拽 Word 模板</strong><span>支持 .docx，单个文件不超过 50 MB</span></label><div class="sw-note">名称、分类、分析主题与预置提示词在解析完成后自动生成，可在基本信息中修改。</div><p id="swUploadError" class="sw-error" role="alert"></p>`, button('back', '取消', 'data-close') + button('upload', '提交', 'id="swUploadSubmit" disabled', 'primary-btn'), { onClose: () => !busy });
    function select(file) {
      const error = !file ? '请选择模板。' : !/\.docx$/i.test(file.name) ? '仅支持 .docx；旧版 Word .doc 请另存为 .docx 后导入。' : !file.size || file.size > 50 * 1024 * 1024 ? '请选择非空且不超过 50 MB 的文件。' : '';
      selected = error ? null : file;
      host.querySelector('#swUploadError').textContent = error;
      host.querySelector('#swFileLabel').textContent = selected ? file.name : '点击选择或拖拽 Word 模板';
      host.querySelector('#swUploadSubmit').disabled = !selected;
    }
    host.querySelector('#swFile').onchange = (e) => select(e.target.files[0]);
    const drop = host.querySelector('#swDrop');
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('is-dragging'); };
    drop.ondragleave = () => drop.classList.remove('is-dragging');
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('is-dragging'); select(e.dataTransfer.files[0]); };
    host.querySelector('#swUploadSubmit').onclick = async () => {
      if (!selected || busy) return;
      busy = true; host.querySelector('#swUploadSubmit').disabled = true;
      const id = retryId || `skill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      try {
        await IO.put(id, selected);
        const skills = Store.load();
        const record = { id, kind: 'monthly', code: `word_${Date.now()}`, name: selected.name.replace(/\.docx$/i, ''), desc: '', category: '', themes: [], userPrompt: '', parts: [], parseStatus: 'parsing', enabled: false, updated: new Date().toLocaleDateString('sv-SE'), sort: Date.now(), reportTemplate: { name: selected.name, type: 'DOCX', source: 'uploaded', size: selected.size } };
        const index = skills.findIndex((s) => s.id === id);
        if (index >= 0) skills[index] = record; else skills.unshift(record);
        Store.save(skills); busy = false; close(); render();
      } catch (e) { busy = false; host.querySelector('#swUploadSubmit').disabled = false; host.querySelector('#swUploadError').textContent = e.message; }
    };
  }
  $('ksBtnNew').onclick = () => upload();
  function query() { appliedKeyword = $('ksKeyword').value.trim(); currentPage = 1; render(); }
  $('ksBtnQuery').onclick = query;
  $('ksKeyword').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); query(); } };
  ['ksCategoryFilter', 'ksThemeFilter', 'ksStatusFilter'].forEach((id) => $(id).onchange = query);
  $('ksBtnReset').onclick = () => { ['ksKeyword', 'ksCategoryFilter', 'ksThemeFilter', 'ksStatusFilter'].forEach((id) => $(id).value = ''); query(); };
  $('ksPageSize').onchange = () => { pageSize = Number($('ksPageSize').value) || 10; currentPage = 1; render(); };
  $('ksPrevPage').onclick = () => { if (currentPage > 1) { currentPage -= 1; render(); } };
  $('ksNextPage').onclick = () => { currentPage += 1; render(); };
  $('ksPageNumbers').onclick = (e) => {
    const target = e.target.closest('[data-page]'); if (!target) return;
    currentPage = Number(target.dataset.page); render();
  };
  $('ksTableBody').onclick = (e) => {
    const b = e.target.closest('[data-action]'); if (!b) return;
    const { action, id } = b.dataset;
    const skill = Store.load().find((s) => s.id === id); if (!skill) return render();
    if (action === 'basic' || action === 'content') {
      if (skill.enabled) return message('请先停用技能，再修改配置。');
      if (skill.parseStatus !== 'completed') return message('请等待模板解析完成。');
      if (action === 'basic') return UI.basic(id, render);
      location.href = `knowledge-skill-edit.html?id=${encodeURIComponent(id)}`; return;
    }
    if (action === 'retry') return skill.enabled || skill.parseStatus !== 'failed' ? render() : upload(id);
    if (action === 'delete' && skill.enabled) return message('请先停用技能，再删除。');
    if (action === 'status' && !skill.enabled && !Store.isReady(skill)) return message('请补全基本信息，并在内容配置中测试、确认所有内容后再启用。');
    if (action !== 'delete' && action !== 'status') return;
    const isDelete = action === 'delete';
    const { host, close } = UI.modal(isDelete ? '删除技能' : skill.enabled ? '停用技能' : '启用技能', '请确认本次操作。', `<p>确定${isDelete ? '删除' : skill.enabled ? '停用' : '启用'}“${esc(skill.name)}”吗？</p><p class="sw-muted">${isDelete ? '技能配置和本地导入文件将被移除，历史报告不受影响。' : '启用状态将同步影响业务端技能列表。'}</p>`, button('back', '取消', 'data-close') + button(isDelete ? 'trash' : 'check', '确认', 'id="swConfirm"', 'primary-btn'));
    host.querySelector('#swConfirm').onclick = async () => {
      try {
        const latest = Store.load().find((s) => s.id === id);
        if (!latest) throw new Error('技能已被删除，请刷新列表。');
        if (isDelete) {
          if (latest.enabled) throw new Error('技能已启用，请先停用后再删除。');
          await IO.remove(id); Store.save(Store.load().filter((s) => s.id !== id));
        } else Store.update(id, (s) => {
          if (s.enabled !== skill.enabled) throw new Error('启用状态已变化，请刷新列表后重试。');
          if (!s.enabled && !Store.isReady(s)) throw new Error('配置尚未全部确认，无法启用。');
          s.enabled = !s.enabled;
        });
        close(); render();
      } catch (err) { message(err); }
    };
  };
  window.addEventListener('storage', (e) => { if (e.key === Store.key) render(); });
  window.addEventListener('pageshow', () => { if (lastSnapshot !== localStorage.getItem(Store.key)) render(); });
  render();
})();
