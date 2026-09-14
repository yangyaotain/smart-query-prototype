(function () {
  'use strict';
  const Store = window.SkillCatalogStore, UI = window.SkillWorkflowUI, IO = window.SkillTemplateIO;
  const { esc, button, message } = UI;
  const $ = (id) => document.getElementById(id);
  const id = new URLSearchParams(location.search).get('id');
  const names = { metric: '指标', chart: '图表', analysis: '自定义' };
  let skill, draft, selectedId, dirty = false, busy = false, documentReady = false;
  let singleTest = null, globalTest = null, lastGlobalTestStatus = '';
  const executionRuns = new Map();
  const runIcon = 'M8 4v16l12-8L8 4', stopIcon = 'M7 7h10v10H7z';
  let searchTerm = '';
  let failurePanel = null, failureSearchTerm = '';
  let drawingMode = false, drag = null;
  let outlineEntries = [], activeOutlineId = '', outlineOpen = true, outlineFrame = null;
  const missingAnchors = new Set();
  const fail = (e) => { message(e); };
  function createExecutionControl(kind) {
    return { id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, kind, stopRequested: false, waits: new Set() };
  }
  function waitForExecution(milliseconds, control) {
    return new Promise((resolve) => {
      if (!control) { setTimeout(() => resolve(true), milliseconds); return; }
      if (control.stopRequested) { resolve(false); return; }
      const pending = { timer: null, finish: null };
      pending.finish = (completed) => {
        if (!control.waits.has(pending)) return;
        control.waits.delete(pending); clearTimeout(pending.timer); resolve(completed);
      };
      pending.timer = setTimeout(() => pending.finish(true), milliseconds);
      control.waits.add(pending);
    });
  }
  function requestExecutionStop(control) {
    if (!control || control.stopRequested) return false;
    control.stopRequested = true;
    [...control.waits].forEach((pending) => pending.finish(false));
    return true;
  }
  try { skill = Store.load().find((s) => s.id === id); } catch (e) { fail(e); }
  if (!skill || skill.parseStatus !== 'completed') {
    $('swWorkbench').innerHTML = '<div class="sw-empty">当前技能不存在或模板尚未解析完成，请返回列表查看。</div>';
    return;
  }
  function promptParameters() {
    return (skill.testParams || []).filter((parameter) => (parameter.usage || []).includes('业务端变量'));
  }
  function promptParameterNode(key) {
    return [...$('swTestPrompt').querySelectorAll('[data-test-param]')].find((node) => node.dataset.testParam === key);
  }
  function createTestSkillTag() {
    const tag = document.createElement('span');
    tag.className = 'sw-context-skill-tag'; tag.dataset.skillTag = skill.id; tag.contentEditable = 'false'; tag.textContent = skill.name;
    return tag;
  }
  function ensureTestSkillTag() {
    const editor = $('swTestPrompt');
    if (!editor.querySelector('[data-skill-tag]')) editor.insertBefore(createTestSkillTag(), editor.firstChild);
  }
  function parameterValue(parameter) {
    if (!(parameter.usage || []).includes('业务端变量')) return String(parameter.value ?? '').trim();
    const node = promptParameterNode(parameter.key);
    if (!node) return '';
    const value = String(node.textContent || '').replace(/\u00a0/g, ' ').trim();
    return value === node.dataset.placeholder ? '' : value;
  }
  function readTestQuestion() {
    const editor = $('swTestPrompt');
    const readNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || '';
      if (node.nodeType !== Node.ELEMENT_NODE || node.matches('[data-skill-tag]')) return '';
      if (node.tagName === 'BR') return '\n';
      const content = [...node.childNodes].map(readNode).join('');
      return /^(DIV|P)$/.test(node.tagName) ? `${content}\n` : content;
    };
    return [...editor.childNodes].map(readNode).join('').replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function params() {
    const settings = { month: '', org: '', generatedAt: '', variables: {}, requiredKeys: [], question: readTestQuestion() };
    (skill.testParams || []).forEach((parameter) => {
      const value = parameterValue(parameter);
      settings[parameter.runtimeKey || parameter.key] = value;
      settings.variables[parameter.label] = value;
      if (parameter.required && (parameter.usage || []).includes('业务端变量')) settings.requiredKeys.push(parameter.key);
    });
    return settings;
  }
  function missingTestParams() {
    return promptParameters().filter((parameter) => parameter.required && !parameterValue(parameter));
  }
  function renderTestParamStatus(markInvalid = false) {
    const missing = missingTestParams();
    $('swTestPrompt').querySelectorAll('[data-test-param]').forEach((node) => {
      const value = String(node.textContent || '').replace(/\u00a0/g, ' ').trim();
      const invalid = markInvalid && missing.some((parameter) => parameter.key === node.dataset.testParam);
      node.classList.toggle('is-filled', !!value && value !== node.dataset.placeholder);
      node.classList.toggle('is-missing', invalid);
      node.setAttribute('aria-invalid', String(invalid));
    });
    $('swTestPromptState').textContent = missing.length ? `待补充 ${missing.length} 个变量` : '当前提问可用于测试';
    $('swTestPromptState').classList.toggle('is-incomplete', missing.length > 0);
  }
  function updateTestParamLock() {
    const editor = $('swTestPrompt'), locked = busy || !!globalTest;
    editor.contentEditable = String(!locked);
    editor.classList.toggle('is-disabled', locked);
    editor.setAttribute('aria-disabled', String(locked));
  }
  function renderTestContext() {
    const editor = $('swTestPrompt'), text = String(skill.userPrompt || '');
    editor.replaceChildren();
    editor.appendChild(createTestSkillTag());
    const pattern = /【([^【】\r\n]+)】/g;
    let cursor = 0, match;
    while ((match = pattern.exec(text))) {
      if (match.index > cursor) editor.appendChild(document.createTextNode(text.slice(cursor, match.index)));
      const label = match[1].trim();
      const parameter = promptParameters().find((item) => item.label === label);
      const variable = document.createElement('span');
      variable.className = 'sw-context-variable'; variable.dataset.testParam = parameter?.key || '';
      variable.dataset.placeholder = label; variable.title = `变量：${label}`;
      variable.textContent = parameter?.value || label;
      variable.classList.toggle('is-filled', !!parameter?.value);
      editor.appendChild(variable);
      cursor = pattern.lastIndex;
    }
    if (cursor < text.length) editor.appendChild(document.createTextNode(text.slice(cursor)));
    if (!text) editor.appendChild(document.createTextNode('请在基本信息中配置业务端预置提示词'));
    $('swTestParamError').classList.add('hidden');
    renderTestParamStatus();
    if (!missingTestParams().length) $('swTestPromptState').textContent = '使用业务端预置提示词';
    updateTestParamLock();
  }
  function validateTestParams() {
    const missing = missingTestParams();
    if (!missing.length) { $('swTestParamError').classList.add('hidden'); renderTestParamStatus(); return true; }
    const labels = missing.map((parameter) => parameter.label).join('、');
    $('swTestParamError').textContent = `请先填写：${labels}`;
    $('swTestParamError').classList.remove('hidden');
    renderTestParamStatus(true);
    (promptParameterNode(missing[0].key) || $('swTestPrompt')).focus();
    message(`请先填写提问变量“${missing[0].label}”。`);
    return false;
  }
  function settingsText(settings) {
    const values = Object.entries(settings.variables || {}).filter(([, value]) => value).map(([label, value]) => `${label} ${value}`);
    return values.length ? values.join('，') : '未设置测试参数';
  }
  function setupResize() {
    const workbench = $('swWorkbench'), handle = $('swResizeHandle'), value = $('swResizeValue');
    const storageKey = 'smart-query-skill-content-split-v1';
    let ratio = 0.57;
    try {
      const stored = Number(localStorage.getItem(storageKey));
      if (stored >= 0.3 && stored <= 0.7) ratio = stored;
    } catch (_) { /* Use the default split when browser storage is unavailable. */ }
    function apply(nextRatio, persist = false) {
      if (innerWidth <= 1000) return;
      const width = workbench.getBoundingClientRect().width;
      if (!width) return;
      const compact = innerWidth <= 1250;
      const minPreview = compact ? 330 : 380, minConfig = compact ? 360 : 395;
      const reserved = 24;
      const left = Math.max(minPreview, Math.min(width - minConfig - reserved, width * nextRatio));
      ratio = left / width;
      workbench.style.setProperty('--sw-preview-width', `${left}px`);
      handle.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
      if (handle.classList.contains('is-dragging')) value.textContent = `预览 ${Math.round(ratio * 100)}% · 配置 ${100 - Math.round(ratio * 100)}%`;
      if (persist) try { localStorage.setItem(storageKey, String(ratio)); } catch (_) { /* The current split remains usable. */ }
    }
    handle.addEventListener('pointerdown', (event) => {
      if (innerWidth <= 1000 || event.button !== 0) return;
      event.preventDefault(); handle.classList.add('is-dragging'); document.body.classList.add('sw-resizing');
      value.textContent = `预览 ${Math.round(ratio * 100)}% · 配置 ${100 - Math.round(ratio * 100)}%`;
      handle.setPointerCapture?.(event.pointerId);
    });
    handle.addEventListener('pointermove', (event) => {
      if (!handle.classList.contains('is-dragging') || !handle.hasPointerCapture?.(event.pointerId)) return;
      const rect = workbench.getBoundingClientRect();
      apply((event.clientX - rect.left) / rect.width);
    });
    function finish(event) {
      if (!handle.classList.contains('is-dragging')) return;
      if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      handle.classList.remove('is-dragging'); document.body.classList.remove('sw-resizing'); apply(ratio, true);
      value.textContent = '左右拖动调整宽度';
    }
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
    handle.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || innerWidth <= 1000) return;
      event.preventDefault();
      const width = workbench.getBoundingClientRect().width || 1;
      apply(ratio + (event.key === 'ArrowLeft' ? -24 : 24) / width, true);
    });
    window.addEventListener('resize', () => apply(ratio));
    apply(ratio);
  }
  function numberedOutline(source) {
    if (!Array.isArray(source) || !source.length) return [];
    const base = Math.max(1, Math.min(...source.map((entry) => Number(entry.level) || 1)));
    const counters = Array(10).fill(0);
    let previousLevel = 1;
    return source.map((entry, index) => {
      const requested = Math.max(1, Math.min(9, (Number(entry.level) || base) - base + 1));
      const level = Math.min(requested, previousLevel + 1);
      counters[level] += 1;
      counters.fill(0, level + 1);
      previousLevel = level;
      return { ...entry, id: entry.id || `outline-${index + 1}`, level, number: counters.slice(1, level + 1).join('.') };
    });
  }
  function outlineTree(entries) {
    const roots = [], stack = [];
    entries.forEach((entry) => {
      const node = { ...entry, children: [] };
      while (stack.length >= entry.level) stack.pop();
      (stack.length ? stack[stack.length - 1].children : roots).push(node);
      stack.push(node);
    });
    return roots;
  }
  function outlineNodes(nodes) {
    return `<ul class="sw-outline-list">${nodes.map((node) => {
      const children = node.children.length ? `<button type="button" class="sw-outline-toggle" data-outline-toggle aria-expanded="true" aria-label="收起${esc(node.text)}的下级标题"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9l5 5 5-5"/></svg></button>` : '<span class="sw-outline-toggle-placeholder"></span>';
      const label = /^(?:\d+(?:\.\d+)*[.、]?|第[一二三四五六七八九十百]+章)\s*/.test(node.text) ? node.text : `${node.number}. ${node.text}`;
      return `<li class="sw-outline-node" data-outline-node="${esc(node.id)}" data-level="${node.level}"><div class="sw-outline-node-row">${children}<button type="button" class="sw-outline-item" data-outline-id="${esc(node.id)}" title="${esc(label)}"><span>${esc(label)}</span></button></div>${node.children.length ? outlineNodes(node.children) : ''}</li>`;
    }).join('')}</ul>`;
  }
  function setOutlineOpen(open, persist = false) {
    outlineOpen = !!open && outlineEntries.length > 0;
    $('swPreviewBody').classList.toggle('is-outline-open', outlineOpen);
    $('swOutline').setAttribute('aria-hidden', String(!outlineOpen));
    $('swOutlineOpen').classList.toggle('hidden', outlineOpen || !outlineEntries.length);
    if (persist) try { localStorage.setItem('smart-query-word-outline-open-v1', outlineOpen ? '1' : '0'); } catch (_) { /* The current outline state remains usable. */ }
  }
  function renderOutline() {
    outlineEntries = numberedOutline(skill.outline);
    $('swPreviewBody').classList.toggle('is-outline-empty', !outlineEntries.length);
    $('swOutlineTree').innerHTML = outlineEntries.length ? outlineNodes(outlineTree(outlineEntries)) : '';
    setOutlineOpen(outlineOpen);
    updateOutlineActive();
  }
  function outlineTarget(entry) {
    if (!entry) return null;
    return skill.reportTemplate.source === 'sample'
      ? $('swDocument').querySelector(`.sw-word-page[data-page="${Number(entry.page)}"]`)
      : $('swDocument').querySelector(`[data-outline-id="${CSS.escape(entry.id)}"]`);
  }
  function activateOutline(id) {
    if (!id || id === activeOutlineId) return;
    activeOutlineId = id;
    $('swOutlineTree').querySelectorAll('[data-outline-id]').forEach((item) => {
      const active = item.dataset.outlineId === id;
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'location'); else item.removeAttribute('aria-current');
    });
    const active = $('swOutlineTree').querySelector(`[data-outline-id="${CSS.escape(id)}"]`);
    if (outlineOpen && active) {
      const tree = $('swOutlineTree'), top = active.offsetTop, bottom = top + active.offsetHeight;
      if (top < tree.scrollTop) tree.scrollTop = Math.max(0, top - 8);
      else if (bottom > tree.scrollTop + tree.clientHeight) tree.scrollTop = bottom - tree.clientHeight + 8;
    }
  }
  function updateOutlineActive() {
    if (!outlineEntries.length || !documentReady) return;
    const scroll = $('swDocumentScroll'), scrollRect = scroll.getBoundingClientRect();
    const threshold = scrollRect.top + Math.min(120, scrollRect.height * .2);
    let current = outlineEntries.find((entry) => outlineTarget(entry));
    outlineEntries.forEach((entry) => {
      const target = outlineTarget(entry);
      if (target && target.getBoundingClientRect().top <= threshold) current = entry;
    });
    if (current) activateOutline(current.id);
  }
  function anchorImportedOutline() {
    const blocks = [...$('swDocument').querySelectorAll('p,h1,h2,h3,h4,h5,h6')];
    let cursor = 0;
    outlineEntries.forEach((entry) => {
      const wanted = entry.text.replace(/\s+/g, ' ').trim();
      let target = null;
      for (let index = cursor; index < blocks.length; index++) {
        const actual = blocks[index].textContent.replace(/\s+/g, ' ').trim();
        if (actual === wanted || actual.endsWith(wanted)) { target = blocks[index]; cursor = index + 1; break; }
      }
      if (target) target.dataset.outlineId = entry.id;
    });
  }
  function setupOutline() {
    try { outlineOpen = localStorage.getItem('smart-query-word-outline-open-v1') !== '0'; } catch (_) { outlineOpen = true; }
    $('swOutlineClose').onclick = () => setOutlineOpen(false, true);
    $('swOutlineOpen').onclick = () => setOutlineOpen(true, true);
    $('swOutlineTree').onclick = (event) => {
      const toggle = event.target.closest('[data-outline-toggle]');
      if (toggle) {
        const node = toggle.closest('.sw-outline-node'), collapsed = node.classList.toggle('is-collapsed');
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.setAttribute('aria-label', `${collapsed ? '展开' : '收起'}${outlineEntries.find((entry) => entry.id === node.dataset.outlineNode)?.text || '当前标题'}的下级标题`);
        return;
      }
      const item = event.target.closest('[data-outline-id]');
      if (!item) return;
      if (drawingMode) setDrawingMode(false);
      const entry = outlineEntries.find((candidate) => candidate.id === item.dataset.outlineId), target = outlineTarget(entry);
      if (!target) return message('当前标题在 Word 预览中尚未匹配位置。');
      activateOutline(entry.id);
      target.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
    };
    $('swDocumentScroll').addEventListener('scroll', () => {
      if (outlineFrame !== null) return;
      outlineFrame = requestAnimationFrame(() => { outlineFrame = null; updateOutlineActive(); });
    }, { passive: true });
  }
  function renderHeader() {
    $('swSkillName').textContent = skill.name;
    $('swSkillName').title = skill.name;
    $('swTotalCount').textContent = `共 ${skill.parts.length} 项`;
    $('swTypeCounts').innerHTML = Object.entries(names).map(([type, label]) => `<span class="is-${type}">${label} ${skill.parts.filter((p) => p.type === type).length}</span>`).join('');
    const count = skill.parts.filter((p) => p.confirmed && !(dirty && p.id === selectedId)).length;
    $('swConfirmedCount').textContent = `✓ 已确认 ${count} · ○ 未确认 ${skill.parts.length - count}`;
    renderConfirmAll(); renderFailureTrigger();
  }
  function confirmationIssue(part, settings, parts = skill.parts) {
    if (missingAnchors.has(part.id)) return 'anchor';
    if (!part.result) return 'untested';
    if (!part.result.ok) return 'failed';
    if (part.result.stale || part.result.signature !== Store.signature(part, settings, parts)) return 'stale';
    return '';
  }
  function confirmationSummary() {
    const settings = params();
    const issues = { anchor: 0, untested: 0, failed: 0, stale: 0 };
    skill.parts.forEach((part) => {
      const issue = confirmationIssue(part, settings);
      if (issue) issues[issue] += 1;
    });
    const confirmed = skill.parts.filter((part) => part.confirmed && !(dirty && part.id === selectedId)).length;
    const blockers = Object.values(issues).reduce((sum, count) => sum + count, 0);
    return { settings, issues, blockers, confirmed, remaining: skill.parts.length - confirmed, total: skill.parts.length };
  }
  function confirmationDisabledReason(summary) {
    if (globalTest) return '全局测试仍在执行，请完成后再确认';
    if (busy) return '当前操作正在执行，请稍候';
    if (!summary.total) return '当前没有可确认的内容项';
    if (!documentReady) return 'Word 原文预览尚未就绪';
    if (dirty) return '请先保存当前配置并重新测试';
    const missing = missingTestParams();
    if (missing.length) return `请先填写提问变量：${missing.map((parameter) => parameter.label).join('、')}`;
    if (summary.issues.anchor) return `还有 ${summary.issues.anchor} 项原文位置尚未匹配`;
    if (summary.issues.failed) return `还有 ${summary.issues.failed} 项测试未通过`;
    if (summary.issues.stale) return `还有 ${summary.issues.stale} 项测试结果已过期`;
    if (summary.issues.untested) return `还有 ${summary.issues.untested} 项尚未测试`;
    if (!summary.remaining) return '所有内容已确认';
    return '确认全部配置项的最新测试结果';
  }
  function renderConfirmAll() {
    const confirmButton = $('swConfirmAll'), confirmText = $('swConfirmAllText');
    if (!confirmButton || !confirmText) return;
    const summary = confirmationSummary();
    const ready = !busy && !globalTest && documentReady && !dirty && !missingTestParams().length && !summary.blockers && summary.remaining > 0;
    confirmButton.disabled = !ready;
    confirmText.textContent = !summary.remaining && !summary.blockers ? '已全部确认' : '全部确认';
    confirmButton.title = confirmationDisabledReason(summary);
  }
  function globalFailureEntry(part, settings = params()) {
    const meta = skill.lastGlobalTest;
    if (!meta?.failedIds?.includes(part.id)) return null;
    const validResult = !(dirty && part.id === selectedId) && part.result && !part.result.stale && part.result.signature === Store.signature(part, settings, skill.parts);
    if (validResult && part.result.ok) return null;
    const trace = executionRuns.get(part.id) || part.result?.trace;
    const failedStep = trace?.steps?.find((step) => step.status === 'error');
    const pending = !validResult;
    return {
      part,
      state: pending ? 'pending' : 'failed',
      step: pending ? '配置已变化' : failedStep?.label || '执行校验',
      reason: pending ? '配置已修改，请重新测试并确认结果。' : part.result?.error || failedStep?.detail || '测试执行失败，请查看执行过程。'
    };
  }
  function globalFailures() {
    const settings = params();
    return (skill.lastGlobalTest?.failedIds || []).map((partId) => skill.parts.find((part) => part.id === partId)).filter(Boolean).map((part) => globalFailureEntry(part, settings)).filter(Boolean);
  }
  function globalRunRecord(run, status) {
    return {
      runId: run.id, status, total: run.total, completed: run.done, passed: run.passed, failed: run.failed, skipped: run.skipped,
      failedIds: [...run.failedIds], startedAt: run.startedAt, finishedAt: status === 'running' ? '' : new Date().toISOString()
    };
  }
  function storedGlobalTestStatus(meta = skill.lastGlobalTest) {
    if (!meta) return '';
    if (meta.status === 'running') return '上次全局测试未正常结束，请重新执行。';
    if (meta.status === 'interrupted') return '全局测试中断，请重新执行。';
    const resolved = meta.failed > 0 && !meta.failedIds?.length ? ' · 失败项已处理' : '';
    if (meta.status === 'stopped') return `全局测试已停止 · 完成 ${meta.completed}/${meta.total} · 成功 ${meta.passed} · 未执行 ${Math.max(0, meta.total - meta.completed)}${meta.skipped ? ` · ${meta.skipped} 项配置已变化` : ''}${resolved}`;
    return `全局测试完成 · 成功 ${meta.passed}${meta.skipped ? ` · ${meta.skipped} 项配置已变化` : ''}${resolved}`;
  }
  function closeFailurePanel() {
    if (!failurePanel) return;
    const { host, outside, keyboard, position } = failurePanel;
    host.remove(); document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', keyboard); document.removeEventListener('scroll', position, true); window.removeEventListener('resize', position);
    failurePanel = null; $('swFailureTrigger').setAttribute('aria-expanded', 'false');
  }
  function positionFailurePanel() {
    if (!failurePanel) return;
    const trigger = $('swFailureTrigger'), host = failurePanel.host, rect = trigger.getBoundingClientRect();
    const width = Math.min(460, innerWidth - 24), height = host.offsetHeight;
    const left = Math.max(12, Math.min(innerWidth - width - 12, rect.right - width));
    const above = rect.top - height - 8, top = above >= 12 ? above : Math.min(innerHeight - height - 12, rect.bottom + 8);
    host.style.left = `${left}px`; host.style.top = `${Math.max(12, top)}px`;
  }
  function failurePanelSignature(entries = globalFailures()) {
    return JSON.stringify([failureSearchTerm, entries.map(({ part, state, step, reason }) => [part.id, state, step, reason])]);
  }
  function syncFailurePanelSelection(ensureVisible = false) {
    if (!failurePanel) return;
    let active = null;
    failurePanel.host.querySelectorAll('[data-failure-id]').forEach((row) => {
      const selected = row.dataset.failureId === selectedId;
      row.classList.toggle('is-active', selected);
      if (selected) active = row;
    });
    if (ensureVisible && active) active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  }
  function locateGlobalFailure(partId, ensureListVisible = false) {
    const entry = globalFailures().find((failure) => failure.part.id === partId);
    if (!entry) return;
    const trace = executionRuns.get(partId) || (entry.part.result?.trace ? Store.clone(entry.part.result.trace) : null);
    if (trace) { trace.expanded = true; executionRuns.set(partId, trace); }
    selectPart(partId, true);
    if (selectedId !== partId) return;
    const mark = $('swDocument').querySelector(`[data-part-id="${CSS.escape(partId)}"]`);
    if (mark) { mark.classList.remove('is-failure-located'); void mark.offsetWidth; mark.classList.add('is-failure-located'); setTimeout(() => mark.classList.remove('is-failure-located'), 1200); }
    syncFailurePanelSelection(ensureListVisible);
  }
  function renderFailurePanel() {
    if (!failurePanel) return;
    const previousList = failurePanel.host.querySelector('.sw-failure-list');
    const previousScrollTop = previousList ? previousList.scrollTop : failurePanel.scrollTop || 0;
    const focusedFailureId = document.activeElement?.closest?.('[data-failure-id]')?.dataset.failureId || '';
    const searchFocused = document.activeElement?.matches?.('#swFailureSearch input') || false;
    const entries = globalFailures();
    if (!entries.length) { closeFailurePanel(); return; }
    const term = failureSearchTerm.trim().toLowerCase();
    const filtered = term ? entries.filter(({ part, step, reason }) => `${part.name} ${names[part.type]} ${step} ${reason}`.toLowerCase().includes(term)) : entries;
    const rowMarkup = filtered.length ? filtered.map(({ part, state, step, reason }, index) => `<button type="button" class="sw-failure-item ${part.id === selectedId ? 'is-active' : ''}" data-failure-id="${esc(part.id)}"><span class="sw-failure-item-main"><span class="sw-failure-item-title"><span class="sw-failure-type">${esc(names[part.type])}</span><strong>${esc(part.name)}</strong><span class="sw-failure-state ${state === 'pending' ? 'is-pending' : ''}">${state === 'pending' ? '待重测' : '测试失败'}</span></span><span class="sw-failure-item-meta">${part.anchor?.page ? `第 ${part.anchor.page} 页 · ` : ''}${esc(step)}</span><span class="sw-failure-item-error" title="${esc(reason)}">${esc(reason)}</span></span><span class="sw-failure-item-locate"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>定位查看</span></button>`).join('') : '<div class="sw-failure-empty">没有匹配的失败项</div>';
    const searchMarkup = entries.length > 10 ? `<form class="sw-failure-search" id="swFailureSearch"><input type="search" value="${esc(failureSearchTerm)}" placeholder="输入配置项名称或失败原因" aria-label="搜索失败项"><button type="submit" class="secondary-btn sw-button"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M15 15l6 6"/></svg>搜索</button></form>` : '';
    failurePanel.host.innerHTML = `<div class="sw-failure-popover-head"><div><strong>全局测试失败项</strong><small>${entries.length} 项待处理${filtered.length !== entries.length ? ` · 当前显示 ${filtered.length} 项` : ''}</small></div><div class="sw-failure-popover-nav"><button type="button" class="ghost-btn sw-button" data-failure-prev ${filtered.length ? '' : 'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>上一项</button><button type="button" class="ghost-btn sw-button" data-failure-next ${filtered.length ? '' : 'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>下一项</button><button type="button" class="ghost-btn sw-button" data-failure-close aria-label="关闭失败项列表"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>关闭</button></div></div>${searchMarkup}<div class="sw-failure-list">${rowMarkup}</div>`;
    const list = failurePanel.host.querySelector('.sw-failure-list');
    list.scrollTop = previousScrollTop; failurePanel.scrollTop = previousScrollTop;
    failurePanel.host.querySelectorAll('[data-failure-id]').forEach((row) => { row.onclick = () => locateGlobalFailure(row.dataset.failureId); });
    const move = (offset) => { if (!filtered.length) return; const activeIndex = filtered.findIndex(({ part }) => part.id === selectedId); const index = activeIndex < 0 ? offset > 0 ? 0 : filtered.length - 1 : (activeIndex + offset + filtered.length) % filtered.length; locateGlobalFailure(filtered[index].part.id, true); };
    failurePanel.host.querySelector('[data-failure-prev]').onclick = () => move(-1);
    failurePanel.host.querySelector('[data-failure-next]').onclick = () => move(1);
    failurePanel.host.querySelector('[data-failure-close]').onclick = closeFailurePanel;
    const search = failurePanel.host.querySelector('#swFailureSearch');
    if (search) search.onsubmit = (event) => { event.preventDefault(); failureSearchTerm = search.querySelector('input').value.trim(); list.scrollTop = 0; failurePanel.scrollTop = 0; renderFailurePanel(); failurePanel?.host.querySelector('#swFailureSearch input')?.focus(); };
    const focusTarget = focusedFailureId ? failurePanel.host.querySelector(`[data-failure-id="${CSS.escape(focusedFailureId)}"]`) : searchFocused ? failurePanel.host.querySelector('#swFailureSearch input') : null;
    if (focusTarget) { try { focusTarget.focus({ preventScroll: true }); } catch (_) { focusTarget.focus(); } list.scrollTop = previousScrollTop; }
    failurePanel.signature = failurePanelSignature(entries);
    positionFailurePanel();
  }
  function openFailurePanel() {
    if (failurePanel || !globalFailures().length || globalTest || busy) return;
    const host = document.createElement('section'); host.className = 'sw-failure-popover'; host.setAttribute('role', 'dialog'); host.setAttribute('aria-label', '全局测试失败项'); document.body.append(host);
    const outside = (event) => { if (failurePanel && !host.contains(event.target) && !$('swFailureTrigger').contains(event.target)) closeFailurePanel(); };
    const keyboard = (event) => { if (event.key === 'Escape') closeFailurePanel(); };
    const position = () => positionFailurePanel();
    failurePanel = { host, outside, keyboard, position }; failureSearchTerm = ''; $('swFailureTrigger').setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', keyboard); document.addEventListener('scroll', position, true); window.addEventListener('resize', position);
    renderFailurePanel();
  }
  function renderFailureTrigger() {
    const trigger = $('swFailureTrigger'), triggerText = $('swFailureTriggerText');
    if (!trigger || !triggerText) return;
    const failures = globalFailures();
    trigger.classList.toggle('hidden', !failures.length);
    trigger.disabled = !!globalTest || busy;
    triggerText.textContent = `失败 ${failures.length} 项`;
    trigger.title = failures.length ? `查看并定位 ${failures.length} 个待处理失败项` : '';
    if (!failures.length) closeFailurePanel();
    else if (failurePanel) {
      if (failurePanel.signature !== failurePanelSignature(failures)) renderFailurePanel();
      else syncFailurePanelSelection(false);
    }
  }
  function renderTestAction() {
    const button = $('swRun'), buttonText = $('swRunText');
    if (!button || !buttonText) return;
    const stopping = !!singleTest;
    button.classList.toggle('is-stop-action', stopping);
    button.querySelector('path')?.setAttribute('d', stopping ? stopIcon : runIcon);
    buttonText.textContent = stopping ? singleTest.stopRequested ? '正在停止…' : '停止测试' : globalTest ? '全局测试中' : '测试';
    button.disabled = stopping ? singleTest.stopRequested : busy || !!globalTest || !draft;
    const missing = missingTestParams();
    button.title = stopping ? singleTest.stopRequested ? '正在停止当前测试' : '停止当前内容项测试' : globalTest ? '全局测试执行期间不能单独测试' : missing.length ? `请先填写提问变量：${missing.map((parameter) => parameter.label).join('、')}` : '使用当前提问执行当前内容项';
  }
  function renderGlobalTest() {
    const button = $('swRunAll'), buttonText = $('swRunAllText'), statusText = $('swGlobalTestStatus');
    if (!button || !buttonText || !statusText) return;
    if (globalTest) {
      button.classList.add('is-stop-action');
      button.querySelector('path')?.setAttribute('d', stopIcon);
      buttonText.textContent = globalTest.stopRequested ? '正在停止…' : '停止全局测试';
      statusText.textContent = `已完成 ${globalTest.done}/${globalTest.total} · 成功 ${globalTest.passed} · 失败 ${globalTest.failed}`;
      button.disabled = globalTest.stopRequested;
      button.title = globalTest.stopRequested ? '正在停止全局测试' : '停止本次全局测试';
    } else {
      button.classList.remove('is-stop-action');
      button.querySelector('path')?.setAttribute('d', runIcon);
      buttonText.textContent = '全局测试';
      statusText.textContent = lastGlobalTestStatus || storedGlobalTestStatus();
      button.disabled = busy || !skill.parts.length;
      const missing = missingTestParams();
      button.title = missing.length ? `请先填写提问变量：${missing.map((parameter) => parameter.label).join('、')}` : '使用当前提问执行全部内容项';
    }
    updateTestParamLock();
    renderTestAction();
    renderConfirmAll();
    renderFailureTrigger();
  }
  function executionSteps(part, settings) {
    if (Store.usesGenerationDate(part)) return [
      { label: '读取当前标注配置', detail: `自定义：${part.name}` },
      { label: '解析提示词与测试参数', detail: `已读取 ${part.prompt.length} 字提示词；${settingsText(settings)}` },
      { label: '读取报告生成时间', detail: `本次测试值 ${settings.generatedAt}` },
      { label: '生成日期内容', detail: '按提示词指定格式转换日期' },
      { label: '检查输出格式', detail: '保持原文档位置与格式，仅替换内容' }
    ];
    if (part.type === 'metric') return [
      { label: '读取当前标注配置', detail: `指标：${part.name}` },
      { label: '解析提示词与查询参数', detail: settingsText(settings) },
      { label: '校验 SQL 与字段映射', detail: `检查回填字段 ${part.field || 'value'}` },
      { label: '执行数据查询', detail: '等待查询结果返回' },
      { label: '格式化指标结果', detail: `按提示词处理单位和数值格式` }
    ];
    if (part.type === 'chart') return [
      { label: '读取当前标注配置', detail: `图表：${part.name}` },
      { label: '解析提示词与查询参数', detail: settingsText(settings) },
      { label: '校验并执行 SQL', detail: '检查分类字段和数值字段' },
      { label: '整理图表数据', detail: '按提示词处理排序和展示数量' },
      { label: '生成图表预览', detail: '沿用模板中的图表位置和尺寸' }
    ];
    return [
      { label: '读取当前标注配置', detail: `自定义：${part.name}` },
      { label: '解析提示词与测试参数', detail: `已读取 ${part.prompt.length} 字提示词；${settingsText(settings)}` },
      { label: '识别所需业务内容', detail: '根据提示词识别已配置的指标和图表结果' },
      { label: '生成文字内容', detail: '依据提示词组织分析结果' },
      { label: '检查输出格式', detail: '检查长度和内容完整性' }
    ];
  }
  function createExecution(part, settings, state = 'queued') {
    return { status: state, startedAt: null, durationMs: 0, expanded: state === 'running', steps: executionSteps(part, settings).map((step) => ({ ...step, status: 'waiting' })) };
  }
  function durationText(milliseconds) {
    if (!milliseconds) return '';
    return milliseconds < 1000 ? `${milliseconds} 毫秒` : `${(milliseconds / 1000).toFixed(1)} 秒`;
  }
  function executionDelays(part, mode = 'single') {
    if (mode === 'global') return [90, 120, 140, 220, 130];
    const full = Store.usesGenerationDate(part) ? [350, 550, 450, 650, 450]
      : part.type === 'metric' ? [400, 750, 850, 1400, 600]
        : part.type === 'chart' ? [450, 800, 1000, 1200, 850]
          : [450, 850, 850, 1800, 700];
    return full;
  }
  function failureStep(trace, error) {
    const text = String(error?.message || error || '执行失败');
    const pattern = /SQL|SELECT|FROM|参数|字段|查询/.test(text) ? /SQL|查询/ : /提示词|名称|主题/.test(text) ? /提示词|配置/ : /日期|时间/.test(text) ? /日期|时间/ : /生成|格式/;
    const index = trace.steps.findIndex((step) => pattern.test(step.label));
    return index >= 0 ? index : trace.steps.length - 1;
  }
  function enrichExecution(trace, part, result) {
    if (!result?.ok) return;
    if (Store.usesGenerationDate(part)) {
      trace.steps[2].detail = `已读取 ${new Date(result.at).toLocaleString('zh-CN', { hour12: false })}`;
      trace.steps[3].detail = `生成结果：${result.text}`;
    } else if (part.type === 'metric') {
      trace.steps[3].detail = `查询完成，返回 ${result.rows.length} 条数据`;
      trace.steps[4].detail = `生成结果：${result.text}`;
    } else if (part.type === 'chart') {
      trace.steps[2].detail = `查询完成，返回 ${result.rows.length} 条数据`;
      trace.steps[3].detail = `已整理 ${result.rows.length} 个图表数据点`;
    } else {
      trace.steps[3].detail = `已生成 ${result.text.length} 字内容`;
      trace.steps[4].detail = '输出内容校验通过';
    }
  }
  function renderExecutionTrace() {
    const host = $('swTestStatus');
    if (!draft) { host.innerHTML = ''; return; }
    const trace = executionRuns.get(draft.id) || draft.result?.trace;
    if (!trace) { host.innerHTML = ''; return; }
    const resultStale = dirty || draft.result?.stale || (draft.result && draft.result.signature !== Store.signature(draft, params(), skill.parts));
    const state = resultStale && !['running', 'queued', 'stopped', 'cancelled'].includes(trace.status) ? 'stale' : trace.status;
    const completed = trace.steps.filter((step) => step.status === 'success').length;
    const failedIndex = trace.steps.findIndex((step) => step.status === 'error');
    const titles = { queued: '等待 AI 执行', running: 'AI 正在执行', success: 'AI 执行完成', error: 'AI 执行失败', stale: '上次 AI 执行过程已失效', stopped: 'AI 执行已停止', cancelled: '本次全局测试未执行' };
    const meta = state === 'queued' || state === 'cancelled' ? `共 ${trace.steps.length} 个步骤` : state === 'running' || state === 'stopped' ? `${completed}/${trace.steps.length} 个步骤${trace.durationMs ? ` · ${durationText(trace.durationMs)}` : ''}` : state === 'error' ? `第 ${failedIndex + 1} 步 · ${durationText(trace.durationMs)}` : `${trace.steps.length} 个步骤${trace.durationMs ? ` · ${durationText(trace.durationMs)}` : ''}`;
    const open = trace.expanded ?? (state === 'running' || state === 'error');
    const summaryIcon = state === 'success' ? '✓' : state === 'error' || state === 'stale' ? '!' : state === 'stopped' || state === 'cancelled' ? '■' : '';
    host.innerHTML = `<details class="sw-trace is-${state}" ${open ? 'open' : ''}><summary><span class="sw-trace-summary-icon">${summaryIcon}</span><span class="sw-trace-summary-text">${titles[state] || '执行过程'}</span><span class="sw-trace-summary-meta">${meta}</span><svg class="sw-trace-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></summary><div class="sw-trace-body">${trace.steps.map((step, index) => `<div class="sw-trace-step is-${step.status}"><span class="sw-trace-step-icon">${step.status === 'success' ? '✓' : step.status === 'error' ? '!' : step.status === 'stopped' ? '■' : step.status === 'waiting' ? index + 1 : ''}</span><div><strong>${esc(step.label)}</strong><small>${esc(step.detail || '')}</small></div></div>`).join('')}</div></details>`;
    host.querySelector('details').addEventListener('toggle', (event) => { trace.expanded = event.currentTarget.open; });
  }
  async function executePart(part, settings, parts, mode = 'single', control) {
    const queued = executionRuns.get(part.id);
    const trace = queued?.status === 'queued' ? queued : createExecution(part, settings);
    executionRuns.set(part.id, trace);
    trace.status = 'running'; trace.mode = mode; trace.runId = control?.id || ''; trace.startedAt = Date.now(); trace.durationMs = 0; trace.expanded = true;
    trace.steps.forEach((step) => { step.status = 'waiting'; });
    let result, error;
    try { result = Store.runDemo(part, settings, parts); }
    catch (caught) { error = caught; result = { ok: false, error: caught.message, params: settings, signature: Store.signature(part, settings, parts) }; }
    enrichExecution(trace, part, result);
    const failedAt = error ? failureStep(trace, error) : -1;
    const delays = executionDelays(part, mode);
    for (let index = 0; index < trace.steps.length; index += 1) {
      const step = trace.steps[index];
      if (failedAt >= 0 && index > failedAt) { step.status = 'skipped'; continue; }
      step.status = 'running';
      if (selectedId === part.id) renderExecutionTrace();
      const completed = await waitForExecution(delays[index], control);
      if (!completed) {
        step.status = 'stopped'; step.detail = '已响应停止操作，本步骤未完成';
        trace.steps.slice(index + 1).forEach((next) => { if (next.status === 'waiting') next.status = 'skipped'; });
        trace.durationMs = Date.now() - trace.startedAt; trace.status = 'stopped'; trace.expanded = true;
        if (selectedId === part.id) renderExecutionTrace();
        return { stopped: true, trace: Store.clone(trace) };
      }
      if (index === failedAt) { step.status = 'error'; step.detail = error.message; break; }
      step.status = 'success';
      if (selectedId === part.id) renderExecutionTrace();
    }
    trace.durationMs = Date.now() - trace.startedAt;
    trace.status = error ? 'error' : 'success'; trace.expanded = !!error;
    result.mode = mode; result.runId = control?.id || '';
    result.trace = Store.clone(trace);
    if (selectedId === part.id) renderExecutionTrace();
    return result;
  }
  function renderIndex() {
    const matches = searchMatches();
    const index = matches.findIndex((p) => p.id === selectedId);
    $('swSearchStatus').textContent = !searchTerm ? '' : !matches.length ? '无匹配标注' : index >= 0 ? `${index + 1} / ${matches.length} 处` : `共 ${matches.length} 处`;
  }
  function searchMatches() {
    return searchTerm ? skill.parts.filter((p) => `${p.name} ${p.sourceText}`.toLowerCase().includes(searchTerm)) : [];
  }
  function searchDocument(event) {
    event.preventDefault();
    if (busy) return message('当前操作正在执行，请稍候。');
    if (!saveDraft()) return;
    const nextTerm = $('swPartSearch').value.trim().toLowerCase();
    const repeated = nextTerm === searchTerm;
    searchTerm = nextTerm;
    const matches = searchMatches();
    if (matches.length) {
      const current = repeated ? matches.findIndex((p) => p.id === selectedId) : -1;
      selectPart(matches[(current + 1) % matches.length].id);
    } else { renderIndex(); syncMarks(); }
  }
  function syncMarks() {
    $('swDocument').querySelectorAll('[data-part-id]').forEach((el) => {
      const part = skill.parts.find((p) => p.id === el.dataset.partId);
      if (!part) {
        if (el.tagName === 'BUTTON') el.remove();
        else el.replaceWith(...el.childNodes);
        return;
      }
      const confirmed = part.confirmed && !(dirty && part.id === selectedId);
      const trackedFailure = globalFailureEntry(part);
      const failed = !!trackedFailure && trackedFailure.state === 'failed';
      const failurePending = !!trackedFailure && trackedFailure.state === 'pending';
      el.classList.toggle('is-selected', part?.id === selectedId);
      el.classList.toggle('is-confirmed', !!confirmed);
      el.classList.toggle('is-failed', failed);
      el.classList.toggle('is-failure-pending', failurePending);
      el.classList.toggle('is-search-match', !!searchTerm && `${part?.name} ${part?.sourceText}`.toLowerCase().includes(searchTerm));
      el.dataset.markType = names[part.type];
      el.dataset.markSymbol = failed ? '!' : confirmed ? '✓' : '○';
      el.dataset.markLabel = `${names[part.type]} · ${failed ? '测试失败' : failurePending ? '待重新测试' : confirmed ? '已确认' : '未确认'}`;
      el.title = `${names[part.type]}：${part.name} · ${failed ? `测试失败 · ${trackedFailure.reason}` : failurePending ? '配置已修改，待重新测试' : confirmed ? '已确认' : '未确认'}`;
      el.setAttribute('aria-label', el.title);
    });
  }
  function field(label, key, value, options = {}) {
    const control = options.select ? `<select data-field="${key}">${options.select.map((v) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>` : options.textarea ? `<textarea data-field="${key}" rows="${options.rows || 4}" maxlength="6000">${esc(value)}</textarea>` : `<input data-field="${key}" value="${esc(value)}" ${options.number ? 'type="number" min="0" max="6" step="1"' : 'maxlength="100"'}>`;
    return `<label class="sw-field">${label}${control}</label>`;
  }
  function sqlMetadataMarkup(part) {
    const current = Store.syncPartMetadata(Store.clone(part));
    const source = current.executionSource || {};
    const tables = Array.isArray(source.tables) ? source.tables : [];
    const indicators = Array.isArray(current.managedIndicators) ? current.managedIndicators : [];
    const databaseUnresolved = !source.databaseName || source.databaseName === '待识别执行库';
    return `<div class="sw-sql-meta" id="swSqlMetadata" aria-label="SQL 执行与指标信息">
      <div class="sw-sql-meta-row">
        <span class="sw-sql-meta-label">执行库</span>
        <div class="sw-sql-meta-value${databaseUnresolved ? ' is-unresolved' : ''}">
          <strong>${esc(source.databaseName || '待识别执行库')}</strong>
          ${source.databaseType ? `<span class="sw-sql-engine">${esc(source.databaseType)}</span>` : ''}
        </div>
      </div>
      <div class="sw-sql-meta-row">
        <span class="sw-sql-meta-label">涉及表</span>
        <div class="sw-sql-meta-value sw-sql-table-list">
          ${tables.length ? tables.map((table) => `<span class="sw-sql-table"><strong>${esc(table.label || table.name || table.physicalName)}</strong><code>${esc(table.physicalName || table.name)}</code></span>`).join('') : '<span class="sw-sql-unresolved">未从 SQL 中识别到数据表</span>'}
        </div>
      </div>
      <div class="sw-sql-meta-row">
        <span class="sw-sql-meta-label">关联指标</span>
        <div class="sw-sql-meta-value sw-managed-indicator-list">
          ${indicators.length ? indicators.map((indicator) => `<div class="sw-managed-indicator">
            <div><span class="sw-indicator-type ${indicator.type === '衍生指标' ? 'is-derived' : 'is-atom'}">${esc(indicator.type || '指标')}</span><strong>${esc(indicator.name)}</strong></div>
            <p>${[indicator.unit ? `单位：${indicator.unit}` : '', indicator.aggregation ? `聚合：${indicator.aggregation}` : ''].filter(Boolean).join(' · ')}</p>
            <small title="${esc(indicator.definition || '')}">口径：${esc(indicator.definition || '待补充')}</small>
          </div>`).join('') : '<span class="sw-sql-unresolved">未关联指标体系指标</span>'}
        </div>
      </div>
    </div>`;
  }
  function renderSqlMetadata() {
    const host = $('swSqlMetadata');
    if (host && draft) host.outerHTML = sqlMetadataMarkup(draft);
  }
  function renderFields() {
    if (!draft) return;
    $('swPartType').className = `sw-type is-${draft.type}`;
    $('swPartType').textContent = `标注对象 · ${names[draft.type]}${draft.anchor?.page ? ` · 第 ${draft.anchor.page} 页` : ''}`;
    $('swPartTitle').textContent = draft.name;
    $('swPartTitle').title = draft.name;
    let html = '';
    if (draft.type !== 'analysis') {
      html += '<div class="sw-field"><span>SQL 配置</span>' + SmartQuerySqlEditor.render({ value: draft.sql, bind: 'sql', minLines: 6, title: '查询 SQL', ariaLabel: '当前内容 SQL' }) + sqlMetadataMarkup(draft) + '</div>';
    }
    html += field('提示词', 'prompt', draft.prompt, { textarea: true, rows: 5 });
    $('swConfigFields').innerHTML = html;
    $('swAIInput').value = '';
    $('swAIInput').placeholder = draft.type === 'metric' ? '例如：排除已取消订单，并保留两位小数' : draft.type === 'chart' ? '例如：按成交金额降序，展示前十项' : Store.usesGenerationDate(draft) ? '例如：将生成日期改为 YYYY-MM-DD 格式' : '例如：重点解释节资率下降，控制在 200 字以内';
    renderChat(); renderResult(); status();
  }
  function status() {
    if (!draft) return;
    const confirmed = draft.confirmed && !dirty;
    const currentResult = draft.result && !draft.result.stale && draft.result.signature === Store.signature(draft, params(), skill.parts);
    const failedResult = currentResult && !draft.result.ok;
    const trackedFailure = globalFailureEntry(draft);
    $('swPartStatus').className = `sw-status ${failedResult ? 'is-error' : trackedFailure?.state === 'pending' ? 'is-pending' : confirmed ? 'is-confirmed' : 'is-pending'}`;
    $('swPartStatus').textContent = failedResult ? '! 测试失败 · 未确认' : trackedFailure?.state === 'pending' ? '○ 待重新测试' : confirmed ? '✓ 已确认' : '○ 未确认';
    const validResult = currentResult && draft.result.ok;
    const testing = !!singleTest || !!globalTest?.pending.has(draft.id);
    $('swConfirmPart').disabled = busy || testing || dirty || confirmed || !validResult || !documentReady || missingAnchors.has(draft.id);
    $('swConfirmPart').title = missingAnchors.has(draft.id) ? '原文位置尚未匹配，请先核对模板' : validResult ? '确认当前配置与测试结果' : '先测试当前配置，检查结果后确认';
    $('swSave').title = dirty ? '有未保存修改' : '配置已保存';
    renderTestAction();
  }
  function renderResult() {
    const result = draft?.result;
    renderExecutionTrace();
    const testing = !!draft && !!globalTest?.pending.has(draft.id);
    const trace = draft ? executionRuns.get(draft.id) : null;
    if (!result) {
      const emptyText = trace?.status === 'stopped' ? '测试已停止，本次未生成结果' : trace?.status === 'cancelled' ? '本次全局测试未执行此项' : testing ? '当前项正在等待或执行全局测试' : '测试后在这里预览回填结果';
      $('swResult').innerHTML = `<div class="sw-empty">${emptyText}</div>`; return;
    }
    if (!result.stale && result.signature !== Store.signature(draft, params(), skill.parts)) { $('swResult').innerHTML = '<div class="sw-empty">测试提问已变更，请使用当前内容重新测试。</div>'; return; }
    if (!result.ok) { $('swResult').innerHTML = `<div class="sw-empty sw-error">${esc(result.error)}</div>`; return; }
    let html = trace?.status === 'stopped' ? '<div class="sw-result-state-note">本次测试已停止，以下为上次测试结果。</div>' : trace?.status === 'cancelled' ? '<div class="sw-result-state-note">本次全局测试未执行此项，以下为上次测试结果。</div>' : '';
    if (draft.type === 'metric') html += `<div class="sw-fill-value"><small>回填值</small>${esc(result.text)}</div>`;
    else if (draft.type === 'chart') {
      const max = Math.max(...result.rows.map((r) => r.value), 1);
      html += `<div class="sw-chart-bars">${result.rows.map((r) => `<div class="sw-chart-row"><span>${esc(r.category)}</span><i style="width:${r.value / max * 100}%"></i><span>${esc(r.value)}</span></div>`).join('')}</div>`;
    } else html += `<div class="sw-analysis-result">${esc(result.text)}</div>`;
    $('swResult').innerHTML = html;
  }
  function renderChat() {
    $('swChat').innerHTML = draft.messages.length ? draft.messages.map((m) => `<div class="sw-chat-message is-${m.role}"><strong>${m.role === 'user' ? '你' : 'AI 助手'}</strong>${esc(m.text)}${m.context ? `<details><summary>本次携带的上下文</summary>${esc(m.context)}</details>` : ''}</div>`).join('') : '<div class="sw-chat-message is-assistant"><strong>AI 助手</strong>测试后可直接描述问题，我会基于当前内容项调整配置。修改后请重新测试并确认。</div>';
    $('swChat').scrollTop = $('swChat').scrollHeight;
  }
  function saveDraft() {
    if (!draft || !dirty) return true;
    if (!draft.name.trim() || !draft.theme) { message('请填写内容名称并选择分析主题。'); return false; }
    if (draft.type === 'metric' && (!Number.isInteger(Number(draft.decimals)) || draft.decimals < 0 || draft.decimals > 6)) { message('小数位应为 0 至 6 的整数。'); return false; }
    try {
      const edited = Store.clone(draft);
      skill = Store.update(id, (s) => {
        const index = s.parts.findIndex((p) => p.id === selectedId);
        if (index < 0 || s.parts[index].revision !== edited.revision) throw new Error('当前配置已被其他窗口更新，请刷新后再修改。');
        s.parts[index] = Store.syncPartMetadata(edited);
        Store.invalidate(s, selectedId);
      });
      draft = Store.clone(skill.parts.find((p) => p.id === selectedId)); dirty = false;
      renderHeader(); renderIndex(); syncMarks(); renderResult(); status(); return true;
    } catch (e) { fail(e); return false; }
  }
  function selectPart(partId, locate = true) {
    if (busy) return message('当前操作正在执行，请稍候。');
    if (!saveDraft()) return;
    selectedId = partId;
    draft = Store.clone(skill.parts.find((p) => p.id === partId));
    ['swAISend', 'swSave', 'swNext', 'swDeletePart', 'swAIInput'].forEach((key) => $(key).disabled = false);
    renderFields(); renderIndex(); syncMarks();
    $('swConfigScroll').scrollTop = 0;
    if (locate) {
      const target = $('swDocument').querySelector(`[data-part-id="${CSS.escape(partId)}"]`);
      if (target) {
        // Lazy page images keep their aspect ratio, so the target position is stable.
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
      }
      else if (documentReady) message('当前内容在浏览器预览中尚未匹配位置，请核对原 Word 文档。');
    }
  }
  function lock(value) {
    if (value && drawingMode) setDrawingMode(false);
    busy = value;
    $('swConfigFields').querySelectorAll('input,textarea,select,button').forEach((el) => el.disabled = value);
    ['swRun', 'swRunAll', 'swConfirmAll', 'swAISend', 'swSave', 'swAIInput', 'swNext', 'swDeletePart'].forEach((key) => $(key).disabled = value);
    $('swDrawRegion').disabled = value || !documentReady;
    status(); renderGlobalTest(); updateTestParamLock();
  }
  async function test() {
    if (busy || globalTest || !draft || !saveDraft() || !validateTestParams()) return;
    const captured = Store.clone(draft), settings = params();
    const wasGlobalFailure = !!skill.lastGlobalTest?.failedIds?.includes(captured.id);
    const control = createExecutionControl('single'); singleTest = control;
    lock(true);
    try {
      const result = await executePart(captured, settings, skill.parts, 'single', control);
      if (result.stopped) { renderResult(); message('当前项测试已停止，本次结果未保存。'); return; }
      skill = Store.update(id, (s) => {
        const p = s.parts.find((p) => p.id === captured.id);
        if (!p || Store.signature(p, settings, s.parts) !== Store.signature(captured, settings, skill.parts)) throw new Error('测试期间配置已变化，请重新执行。');
        p.result = result;
        if (result.ok && wasGlobalFailure && s.lastGlobalTest?.failedIds) s.lastGlobalTest.failedIds = s.lastGlobalTest.failedIds.filter((partId) => partId !== captured.id);
        if (!result.ok) { p.confirmed = false; s.enabled = false; }
      });
      draft = Store.clone(skill.parts.find((p) => p.id === selectedId)); renderResult(); renderHeader(); renderIndex(); syncMarks();
      if (result.ok && wasGlobalFailure) {
        const remainingFailures = globalFailures().length;
        message(remainingFailures ? `当前失败项已通过，剩余 ${remainingFailures} 项待处理。` : '全局测试失败项已全部处理。');
      }
    } catch (e) { fail(e); }
    finally { if (singleTest === control) singleTest = null; lock(false); renderResult(); }
  }
  function stopSingleTest() {
    if (requestExecutionStop(singleTest)) renderTestAction();
  }
  function stopGlobalTest() {
    if (requestExecutionStop(globalTest)) renderGlobalTest();
  }
  async function testAll() {
    if (busy || globalTest) return;
    if (!skill.parts.length) return message('当前没有可测试的内容项。');
    if (!saveDraft() || !validateTestParams()) return;
    const settings = params();
    const snapshots = skill.parts.map(Store.clone);
    const run = Object.assign(createExecutionControl('global'), { total: snapshots.length, done: 0, passed: 0, failed: 0, skipped: 0, failedIds: new Set(), startedAt: new Date().toISOString(), pending: new Set(snapshots.map((part) => part.id)) });
    globalTest = run; lastGlobalTestStatus = '';
    closeFailurePanel();
    snapshots.forEach((part) => executionRuns.set(part.id, createExecution(part, settings, 'queued')));
    try {
      skill = Store.update(id, (s) => { s.lastGlobalTest = globalRunRecord(run, 'running'); });
      renderGlobalTest(); renderHeader(); renderResult(); syncMarks(); status();
      for (let start = 0; start < snapshots.length; start += 12) {
        if (run.stopRequested) break;
        const batch = snapshots.slice(start, start + 12);
        const completed = await Promise.all(batch.map(async (captured) => ({ captured, result: await executePart(captured, settings, snapshots, 'global', run) })));
        const applied = new Map();
        const finished = completed.filter(({ result }) => !result.stopped);
        if (finished.length) {
          skill = Store.update(id, (s) => {
            finished.forEach(({ captured, result }) => {
              const part = s.parts.find((entry) => entry.id === captured.id);
              if (!part || part.revision !== captured.revision) return;
              part.result = result; part.confirmed = false; s.enabled = false;
              applied.set(captured.id, result.ok);
            });
          });
        }
        completed.forEach(({ captured, result }) => {
          run.pending.delete(captured.id);
          if (result.stopped) return;
          run.done += 1;
          if (!applied.has(captured.id)) {
            run.skipped += 1;
            const trace = executionRuns.get(captured.id);
            if (trace) { trace.status = 'stale'; trace.expanded = false; }
          }
          else if (applied.get(captured.id)) run.passed += 1;
          else { run.failed += 1; run.failedIds.add(captured.id); }
        });
        skill = Store.update(id, (s) => { s.lastGlobalTest = globalRunRecord(run, 'running'); });
        if (draft && !dirty && !busy) {
          const current = skill.parts.find((part) => part.id === selectedId);
          if (current) { draft = Store.clone(current); renderResult(); status(); }
        }
        renderHeader(); syncMarks(); renderGlobalTest();
        if (run.stopRequested) break;
      }
      const stopped = run.stopRequested && run.done < run.total;
      if (stopped) {
        run.pending.forEach((partId) => {
          const trace = executionRuns.get(partId);
          if (trace?.status === 'queued') {
            trace.status = 'cancelled'; trace.expanded = false;
            trace.steps.forEach((step) => { if (step.status === 'waiting') step.status = 'skipped'; });
          }
        });
        run.pending.clear();
        skill = Store.update(id, (s) => { s.lastGlobalTest = globalRunRecord(run, 'stopped'); });
        lastGlobalTestStatus = storedGlobalTestStatus();
        message('全局测试已停止，未完成项目未写入本次结果。');
      } else {
        skill = Store.update(id, (s) => { s.lastGlobalTest = globalRunRecord(run, 'completed'); });
        lastGlobalTestStatus = storedGlobalTestStatus();
        message(run.failed || run.skipped ? '全局测试已完成，请逐项检查失败或配置变化的内容。' : '全局测试已完成，请逐项检查并确认。');
      }
    } catch (e) {
      try { skill = Store.update(id, (s) => { s.lastGlobalTest = globalRunRecord(run, 'interrupted'); }); } catch (_) { /* Preserve the original execution error. */ }
      lastGlobalTestStatus = '全局测试中断，请重新执行。'; fail(e);
    } finally {
      globalTest = null;
      if (draft && !dirty && !busy) {
        const current = skill.parts.find((part) => part.id === selectedId);
        if (current) { draft = Store.clone(current); renderResult(); status(); }
      }
      renderGlobalTest(); renderHeader(); syncMarks();
    }
  }
  async function sendAI() {
    const request = $('swAIInput').value.trim();
    if (!request || !draft || busy || !saveDraft()) return;
    const captured = Store.clone(draft);
    const context = `${captured.name}\n分析主题：${captured.theme}\nSQL：${captured.sql || '无'}\n提示词：${captured.prompt || '无'}\n参数：${JSON.stringify(params())}\n测试结果：${captured.result ? captured.result.ok ? captured.result.text : captured.result.error : '尚未测试'}\n数据口径：${captured.definition}`;
    lock(true); $('swAIInput').value = '';
    draft.messages.push({ role: 'user', text: request, context }); renderChat();
    $('swChat').insertAdjacentHTML('beforeend', '<div class="sw-chat-message is-assistant">正在理解问题并修改配置…</div>');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const response = Store.aiEdit(captured, request);
      skill = Store.update(id, (s) => {
        const index = s.parts.findIndex((p) => p.id === captured.id);
        if (index < 0 || s.parts[index].revision !== captured.revision) throw new Error('当前配置已变化，本次 AI 修改未写入，请重新发送。');
        const messages = [...s.parts[index].messages, { role: 'user', text: request, context }, { role: 'assistant', text: response.reply }].slice(-20);
        if (response.next) { s.parts[index] = { ...response.next, messages }; Store.invalidate(s, captured.id); }
        else s.parts[index].messages = messages;
      });
      draft = Store.clone(skill.parts.find((p) => p.id === selectedId)); dirty = false;
      renderFields(); renderHeader(); renderIndex(); syncMarks();
      if (response.next) message('AI 修改已保存，请重新测试；关联内容也需重新确认。');
    } catch (e) { fail(e); draft = captured; renderChat(); $('swAIInput').value = request; }
    finally { lock(false); }
  }
  function confirmPart() {
    if (busy || !draft || dirty || $('swConfirmPart').disabled) return;
    try {
      skill = Store.update(id, (s) => {
        const p = s.parts.find((p) => p.id === selectedId);
        if (!p?.result?.ok || p.result.stale || p.result.signature !== Store.signature(p, params(), s.parts)) throw new Error('配置已更新，请重新测试后确认。');
        p.confirmed = true; p.confirmedAt = new Date().toISOString();
      });
      draft = Store.clone(skill.parts.find((p) => p.id === selectedId));
      renderHeader(); renderIndex(); syncMarks(); status();
      message(skill.parts.every((p) => p.confirmed) ? '全部内容已确认，可返回列表启用技能。' : '当前内容已确认。');
    } catch (e) { fail(e); }
  }
  function confirmAllParts() {
    if (busy || globalTest) return;
    if (!saveDraft()) return;
    const summary = confirmationSummary();
    if (confirmationDisabledReason(summary) !== '确认全部配置项的最新测试结果') return message(confirmationDisabledReason(summary));
    const typeCounts = Object.keys(names).map((type) => `<span><strong>${skill.parts.filter((part) => part.type === type).length}</strong>${esc(names[type])}</span>`).join('');
    const body = `<div class="sw-confirm-all-summary" data-content-modal><p>本次将确认 <strong>${summary.remaining}</strong> 项，已确认的 ${summary.confirmed} 项保持不变。</p><div class="sw-confirm-all-counts">${typeCounts}</div><div class="sw-confirm-all-note">后续修改任一配置，相关配置项将重新变为未确认状态；全部确认后仍需返回技能管理手动启用技能。</div></div>`;
    const { host, close } = UI.modal('确认全部配置项', `当前 ${summary.total} 个配置项均已通过最新测试。`, body, button('back', '取消', 'data-close') + button('check', '确认全部', 'id="swConfirmAllSubmit"', 'primary-btn'));
    const submit = host.querySelector('#swConfirmAllSubmit');
    submit.onclick = () => {
      if (submit.disabled) return;
      submit.disabled = true;
      try {
        if (!documentReady || missingTestParams().length || skill.parts.some((part) => missingAnchors.has(part.id))) throw new Error('确认条件已变化，请核对后重新操作。');
        const settings = params();
        const expectedTestParams = JSON.stringify(skill.testParams || []);
        const expected = new Map(skill.parts.map((part) => [part.id, { revision: part.revision, signature: Store.signature(part, settings, skill.parts) }]));
        skill = Store.update(id, (s) => {
          if (JSON.stringify(s.testParams || []) !== expectedTestParams) throw new Error('测试提问已发生变化，请重新测试后确认。');
          if (s.parts.length !== expected.size) throw new Error('配置项已发生变化，请刷新后重新确认。');
          s.parts.forEach((part) => {
            const snapshot = expected.get(part.id);
            if (!snapshot || snapshot.revision !== part.revision || snapshot.signature !== Store.signature(part, settings, s.parts)) throw new Error('配置项已发生变化，请刷新后重新确认。');
            if (confirmationIssue(part, settings, s.parts)) throw new Error('存在未通过最新测试的配置项，请重新测试后确认。');
          });
          const confirmedAt = new Date().toISOString();
          s.parts.forEach((part) => {
            if (!part.confirmed) { part.confirmed = true; part.confirmedAt = confirmedAt; }
          });
        });
        if (draft && !dirty) draft = Store.clone(skill.parts.find((part) => part.id === selectedId));
        close(); renderHeader(); renderIndex(); syncMarks(); status(); renderGlobalTest();
        message('全部配置项已确认，可返回技能管理启用技能。');
      } catch (e) { submit.disabled = false; fail(e); }
    };
  }
  function emptyPart() {
    draft = null; selectedId = null; dirty = false;
    $('swPartType').textContent = ''; $('swPartTitle').textContent = '请选择内容项';
    $('swPartStatus').textContent = ''; $('swPartStatus').className = 'sw-status';
    $('swConfigFields').innerHTML = '<div class="sw-empty">点击“框选新增”，在文档中补充内容项。</div>';
    $('swResult').innerHTML = '<div class="sw-empty">选择标注项后测试并预览结果</div>';
    $('swChat').innerHTML = ''; $('swTestStatus').innerHTML = ''; $('swAIInput').value = '';
    ['swRun', 'swAISend', 'swSave', 'swNext', 'swDeletePart', 'swConfirmPart', 'swAIInput'].forEach((key) => $(key).disabled = true);
    renderGlobalTest();
  }
  function deletePart() {
    if (busy || !draft) return;
    const captured = Store.clone(draft), index = skill.parts.findIndex((p) => p.id === captured.id);
    const body = `<div data-content-modal><p>确定删除“${esc(captured.name)}”的标注和配置？原 Word 中的文字、图表及格式保留。</p>${dirty ? '<p class="sw-help">当前项尚未保存的修改也将删除。</p>' : ''}</div>`;
    const { host, close } = UI.modal('删除此项', '删除后，该位置不再自动替换内容。', body, button('back', '取消', 'data-close') + button('trash', '确认删除', 'id="swDeleteConfirm"', 'ghost-btn sw-danger'));
    host.querySelector('#swDeleteConfirm').onclick = () => {
      try {
        skill = Store.update(id, (s) => {
          const current = s.parts.find((p) => p.id === captured.id);
          if (!current || current.revision !== captured.revision) throw new Error('当前配置已被其他窗口更新，请刷新后再删除。');
          Store.removePart(s, captured.id);
          if (s.lastGlobalTest?.failedIds) s.lastGlobalTest.failedIds = s.lastGlobalTest.failedIds.filter((partId) => partId !== captured.id);
        });
        dirty = false; draft = null; missingAnchors.delete(captured.id); executionRuns.delete(captured.id);
        close(); syncMarks(); renderHeader();
        const next = skill.parts[Math.min(index, skill.parts.length - 1)];
        if (next) selectPart(next.id, false); else emptyPart();
        renderIndex();
        message('标注及配置已删除，原文内容保留。');
      } catch (e) { fail(e); }
    };
  }
  async function preview() {
    const template = skill.reportTemplate;
    try {
      if (template.source === 'sample') {
        $('swDocument').innerHTML = Array.from({ length: template.pages }, (_, i) => {
          const page = i + 1;
          const marks = skill.parts.filter((p) => p.anchor?.page === page).map((p) => { const a = p.anchor; return `<button type="button" class="sw-mark is-${p.type}" data-part-id="${esc(p.id)}" style="left:${a.x}%;top:${a.y}%;width:${a.w}%;height:${a.h}%" title="${esc(names[p.type] + ' · ' + p.name)}"></button>`; }).join('');
          return `<div class="sw-word-page" data-page="${page}"><img src="${esc(template.pageImageBase)}${String(page).padStart(2, '0')}.png" width="993" height="1404" alt="原 Word 模板第 ${page} 页" ${page > 3 ? 'loading="lazy"' : ''}>${marks}</div>`;
        }).join('');
        $('swPageInfo').textContent = `原模板 · 共 ${template.pages} 页`;
      } else {
        const file = await IO.get(id);
        if (!file) throw new Error('本地原文件不可用，请返回列表重新导入模板。');
        if (!skill.outline.length && IO.outline) {
          const extracted = await IO.outline(file);
          if (extracted.length) skill = Store.update(id, (current) => { current.outline = extracted; });
        }
        $('swDocument').innerHTML = '';
        await docx.renderAsync(await file.arrayBuffer(), $('swDocument'), $('swDocxStyles'), { inWrapper: true, ignoreLastRenderedPageBreak: false, renderAltChunks: false, renderComments: false, useBase64URL: true });
        $('swDocument').querySelectorAll('a').forEach((a) => a.removeAttribute('href'));
        renderOutline();
        anchorImportedOutline();
        markImportedDocument();
        $('swPageInfo').textContent = 'Word 原文件预览';
      }
      if (template.source === 'sample') renderOutline();
      documentReady = true; renderManualMarks(); syncMarks(); status(); renderConfirmAll(); updateOutlineActive();
      $('swDrawRegion').disabled = false;
      const selected = $('swDocument').querySelector(`[data-part-id="${CSS.escape(selectedId || '')}"]`);
      if (selected) selected.scrollIntoView({ block: 'center', inline: 'nearest' });
    } catch (e) { $('swDocument').innerHTML = `<div class="sw-empty sw-error">${esc(e.message || '模板预览失败，请检查 Word 文件。')}</div>`; documentReady = false; $('swDrawRegion').disabled = true; renderOutline(); status(); renderConfirmAll(); }
  }
  function markImportedDocument() {
    const nodes = [], ranges = [];
    const walker = document.createTreeWalker($('swDocument'), NodeFilter.SHOW_TEXT);
    let node, full = '';
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('style,script')) continue;
      nodes.push({ node, start: full.length, end: full.length + node.textContent.length }); full += node.textContent;
    }
    const drawings = [...$('swDocument').querySelectorAll('article img, article svg')];
    skill.parts.forEach((p) => {
      if (p.anchor.kind === 'region') return;
      if (p.anchor.kind === 'drawing') {
        const target = drawings[p.anchor.index];
        if (target) {
          const wrapper = document.createElement('span');
          wrapper.className = `sw-mark sw-drawing-mark is-${p.type}`;
          wrapper.dataset.partId = p.id; wrapper.tabIndex = 0; wrapper.setAttribute('role', 'button');
          target.replaceWith(wrapper); wrapper.appendChild(target);
        }
        else missingAnchors.add(p.id);
        return;
      }
      let index = -1, from = 0;
      for (let i = 0; i <= p.anchor.occurrence; i++) { index = full.indexOf(p.anchor.text, from); if (index < 0) break; from = index + p.anchor.text.length; }
      const start = nodes.find((n) => n.start <= index && n.end > index);
      const end = nodes.find((n) => n.start < index + p.anchor.text.length && n.end >= index + p.anchor.text.length);
      if (index < 0 || !start || !end) { missingAnchors.add(p.id); return; }
      const range = document.createRange(); range.setStart(start.node, index - start.start); range.setEnd(end.node, index + p.anchor.text.length - end.start);
      ranges.push({ range, p, index });
    });
    ranges.sort((a, b) => b.index - a.index).forEach(({ range, p }) => {
      try {
        const mark = document.createElement('mark'); mark.className = `sw-mark is-${p.type}`; mark.dataset.partId = p.id; mark.title = `${names[p.type]} · ${p.name}`; mark.tabIndex = 0; mark.setAttribute('role', 'button');
        mark.appendChild(range.extractContents()); range.insertNode(mark);
      } catch (_) { missingAnchors.add(p.id); }
    });
  }
  function regionPages() {
    return [...$('swDocument').querySelectorAll(skill.reportTemplate.source === 'sample' ? '.sw-word-page' : 'section.docx')];
  }
  function positionRegion(el, anchor) {
    el.style.left = `${anchor.x}%`; el.style.top = `${anchor.y}%`;
    el.style.width = `${anchor.w}%`; el.style.height = `${anchor.h}%`;
  }
  function renderManualMarks() {
    const pages = regionPages();
    skill.parts.filter((p) => p.anchor?.kind === 'region').forEach((p) => {
      if ($('swDocument').querySelector(`[data-part-id="${CSS.escape(p.id)}"]`)) return;
      const page = pages[p.anchor.page - 1];
      if (!page) { missingAnchors.add(p.id); return; }
      const mark = document.createElement('button');
      mark.type = 'button'; mark.className = `sw-mark sw-manual-mark is-${p.type}`; mark.dataset.partId = p.id;
      positionRegion(mark, p.anchor); page.appendChild(mark); missingAnchors.delete(p.id);
    });
  }
  function cancelDrag() {
    if (!drag) return;
    const previous = drag; drag = null; previous.box.remove();
    if (previous.page.hasPointerCapture?.(previous.pointerId)) previous.page.releasePointerCapture(previous.pointerId);
  }
  function setDrawingMode(enabled) {
    cancelDrag(); drawingMode = enabled;
    $('swDocument').classList.toggle('is-drawing', enabled);
    $('swDrawHint').classList.toggle('hidden', !enabled);
    $('swDrawRegion').setAttribute('aria-pressed', String(enabled));
    $('swDrawRegion').innerHTML = enabled ? UI.icon('close') + '取消框选' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M12 8v8M8 12h8"/></svg>框选新增';
  }
  function pointInPage(event, page) {
    const rect = page.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return { x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) };
  }
  function updateDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const point = pointInPage(event, drag.page); if (!point) return;
    drag.anchor = { kind: 'region', page: drag.pageNumber, x: Math.min(drag.start.x, point.x), y: Math.min(drag.start.y, point.y), w: Math.abs(drag.start.x - point.x), h: Math.abs(drag.start.y - point.y) };
    positionRegion(drag.box, drag.anchor);
  }
  function configureRegion(anchor, box) {
    let saving = false;
    const form = `<form id="swRegionForm" class="sw-form"><label>内容类型<select id="swRegionType"><option value="metric">指标</option><option value="chart">图表</option><option value="analysis">自定义</option></select></label><label>标注名称<input id="swRegionName" required maxlength="100" placeholder="例如：本月节资金额"></label><p class="sw-help">已框选第 ${anchor.page} 页区域。添加后在右侧配置 SQL 或提示词，并测试确认。</p></form>`;
    const { host, close } = UI.modal('新增标注项', '补充模板中遗漏的指标、图表或自定义内容。', form, button('back', '取消', 'data-close') + button('plus', '添加并配置', 'id="swRegionAdd"', 'primary-btn'), { onClose: () => { if (saving) return false; box.remove(); return true; } });
    host.querySelector('#swRegionName').focus();
    host.querySelector('form').onsubmit = (event) => { event.preventDefault(); host.querySelector('#swRegionAdd').click(); };
    host.querySelector('#swRegionAdd').onclick = () => {
      if (saving || !host.querySelector('form').reportValidity()) return;
      const name = host.querySelector('#swRegionName').value.trim();
      if (!name) return message('请填写标注名称。');
      const type = host.querySelector('#swRegionType').value;
      const partId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      saving = true;
      try {
        skill = Store.update(id, (s) => {
          s.parts.push(Store.preparePart({ id: partId, type, name, theme: s.themes[0] || Store.themes[0], source: 'manual', sourceText: `第 ${anchor.page} 页手动框选区域`, anchor, confirmed: false, result: null, messages: [] }));
          s.enabled = false;
        });
        saving = false; close();
        renderManualMarks(); renderHeader(); selectPart(partId, false);
        message('标注已添加，请配置并测试确认。');
      } catch (e) { saving = false; fail(e); }
    };
  }
  $('swDrawRegion').onclick = () => {
    if (busy || !documentReady) return;
    if (!drawingMode && !saveDraft()) return;
    setDrawingMode(!drawingMode);
  };
  $('swDocument').addEventListener('pointerdown', (event) => {
    if (!drawingMode || busy || event.button !== 0 || drag) return;
    const page = event.target.closest('.sw-word-page,section.docx');
    if (!page || !$('swDocument').contains(page)) return;
    const start = pointInPage(event, page); if (!start) return;
    event.preventDefault(); event.stopPropagation();
    const box = document.createElement('div'); box.className = 'sw-region-selection'; page.appendChild(box);
    drag = { page, pageNumber: regionPages().indexOf(page) + 1, box, start, pointerId: event.pointerId };
    positionRegion(box, { ...start, w: 0, h: 0 });
    page.setPointerCapture?.(event.pointerId);
  }, true);
  $('swDocument').addEventListener('pointermove', (event) => { if (drag) { event.preventDefault(); updateDrag(event); } });
  $('swDocument').addEventListener('pointerup', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault(); updateDrag(event);
    const completed = drag; drag = null;
    if (completed.page.hasPointerCapture?.(event.pointerId)) completed.page.releasePointerCapture(event.pointerId);
    const rect = completed.page.getBoundingClientRect(), a = completed.anchor;
    if (!a || a.w * rect.width / 100 < 8 || a.h * rect.height / 100 < 8) { completed.box.remove(); message('框选区域过小，请拖动框选完整内容。'); return; }
    setDrawingMode(false); configureRegion(a, completed.box);
  });
  $('swDocument').addEventListener('pointercancel', cancelDrag);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && drawingMode) { event.preventDefault(); setDrawingMode(false); } });
  $('swConfigFields').addEventListener('input', (e) => {
    const key = e.target.dataset.field || e.target.dataset.bind;
    if (!draft || !['sql', 'prompt'].includes(key)) return;
    draft[key] = e.target.value;
    dirty = true;
    if (key === 'sql') renderSqlMetadata();
    status(); renderResult(); syncMarks(); renderHeader();
  });
  $('swTestPrompt').addEventListener('input', () => {
    if (busy || globalTest) return;
    try {
      ensureTestSkillTag();
      const values = new Map(promptParameters().map((parameter) => [parameter.key, parameterValue(parameter)]));
      skill = Store.update(id, (current) => {
        current.testParams.forEach((parameter) => {
          if (values.has(parameter.key)) parameter.value = values.get(parameter.key);
        });
      });
      lastGlobalTestStatus = '测试提问已变更，请重新执行全局测试';
      $('swTestParamError').classList.add('hidden');
      renderTestParamStatus();
      if (!missingTestParams().length) $('swTestPromptState').textContent = '已调整本次测试提问';
      renderResult(); status(); renderGlobalTest();
    } catch (error) { fail(error); }
  });
  $('swSearchForm').onsubmit = searchDocument;
  $('swPartSearch').oninput = () => { if (!$('swPartSearch').value.trim()) { searchTerm = ''; renderIndex(); syncMarks(); } };
  $('swDocument').onclick = (e) => { if (drawingMode || document.querySelector('#swRegionForm')) { e.preventDefault(); return; } const target = e.target.closest('[data-part-id]'); if (target && !$('swDocument').classList.contains('hide-marks')) { e.preventDefault(); selectPart(target.dataset.partId, false); } };
  $('swDocument').onkeydown = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.partId) { e.preventDefault(); selectPart(e.target.dataset.partId, false); } };
  $('swSave').onclick = () => { if (saveDraft()) message('当前配置已保存。'); };
  $('swRun').onclick = () => singleTest ? stopSingleTest() : test();
  $('swRunAll').onclick = () => globalTest ? stopGlobalTest() : testAll();
  $('swFailureTrigger').onclick = () => failurePanel ? closeFailurePanel() : openFailurePanel();
  $('swConfirmAll').onclick = confirmAllParts; $('swAISend').onclick = sendAI; $('swConfirmPart').onclick = confirmPart;
  $('swDeletePart').onclick = deletePart;
  $('swAIInput').onkeydown = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendAI(); } };
  $('swNext').onclick = () => {
    if (!saveDraft()) return;
    const start = skill.parts.findIndex((p) => p.id === selectedId);
    const next = [...skill.parts.slice(start + 1), ...skill.parts.slice(0, start + 1)].find((p) => !p.confirmed);
    if (next) selectPart(next.id); else message('全部内容已确认。');
  };
  $('swBack').onclick = (e) => { if (busy || globalTest || !saveDraft()) { e.preventDefault(); if (busy || globalTest) message(globalTest ? '全局测试仍在执行，请完成后返回。' : '当前操作正在执行，请稍候。'); } };
  window.addEventListener('beforeunload', (e) => { if (dirty || busy || globalTest) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('storage', (e) => {
    if (e.key !== Store.key) return;
    if (dirty || busy || globalTest || drawingMode || document.querySelector('#swRegionForm,[data-content-modal]')) { message('其他窗口已更新技能；当前修改保留，请完成操作后核对。'); return; }
    const next = Store.load().find((s) => s.id === id);
    if (!next) { message('技能已在其他窗口删除。'); location.href = 'knowledge-skill.html'; return; }
    skill = next; renderManualMarks(); renderTestContext();
    const current = skill.parts.find((p) => p.id === selectedId) || skill.parts[0];
    if (current) selectPart(current.id, false);
    else emptyPart();
    renderHeader(); renderIndex(); syncMarks();
  });
  setupResize(); setupOutline(); renderHeader(); renderIndex(); renderTestContext(); renderGlobalTest();
  if (skill.parts.length) selectPart(skill.parts.find((p) => !p.confirmed)?.id || skill.parts[0].id, false);
  else emptyPart();
  preview();
})();
