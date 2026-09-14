(function (global) {
  'use strict';
  const Store = global.SkillCatalogStore;
  function database() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('smart-query-word-templates', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('files');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('无法打开本地模板存储，请检查浏览器存储权限。'));
    });
  }
  async function fileAction(id, file, remove = false) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('files', file || remove ? 'readwrite' : 'readonly');
      const table = transaction.objectStore('files');
      const request = remove ? table.delete(id) : file ? table.put(file, id) : table.get(id);
      transaction.oncomplete = () => { db.close(); resolve(request.result); };
      transaction.onerror = transaction.onabort = () => { db.close(); reject(new Error('模板存储失败，请检查本地存储空间。')); };
    });
  }
  const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const child = (node, name) => [...(node?.children || [])].find((item) => item.localName === name);
  const valueOf = (node) => node?.getAttributeNS(wordNamespace, 'val') || node?.getAttribute('w:val') || node?.getAttribute('val') || '';
  const textOf = (paragraph) => [...paragraph.getElementsByTagNameNS('*', 't')].map((node) => node.textContent).join('');
  function xmlDocument(xml, errorText) {
    const documentXML = new DOMParser().parseFromString(xml, 'application/xml');
    if (documentXML.querySelector('parsererror')) throw new Error(errorText);
    return documentXML;
  }
  async function parseOutline(zip, documentXML) {
    const stylesEntry = zip.file('word/styles.xml');
    const styles = new Map();
    if (stylesEntry) {
      const stylesXML = xmlDocument(await stylesEntry.async('string'), 'Word 标题样式读取失败，请另存文档后重新导入。');
      [...stylesXML.getElementsByTagNameNS('*', 'style')].forEach((style) => {
        if ((valueOf(child(style, 'type')) || style.getAttributeNS(wordNamespace, 'type')) === 'character') return;
        const id = style.getAttributeNS(wordNamespace, 'styleId') || style.getAttribute('w:styleId') || style.getAttribute('styleId');
        if (!id) return;
        const pPr = child(style, 'pPr');
        styles.set(id, { name: valueOf(child(style, 'name')), basedOn: valueOf(child(style, 'basedOn')), outline: valueOf(child(pPr, 'outlineLvl')), quick: !!child(style, 'qFormat') });
      });
    }
    function styleLevel(styleId) {
      const visited = new Set();
      let current = styleId;
      while (current && !visited.has(current)) {
        visited.add(current);
        const style = styles.get(current);
        const named = (style?.name || '').match(/(?:heading|标题)\s*([1-9])/i) || String(current).match(/heading\s*([1-9])/i);
        if (named) return Number(named[1]);
        const explicit = Number(style?.outline);
        if (style?.quick && style.outline !== '' && Number.isInteger(explicit) && explicit >= 0 && explicit <= 8) return explicit + 1;
        current = style?.basedOn;
      }
      return null;
    }
    const outline = [], occurrences = new Map();
    [...documentXML.getElementsByTagNameNS('*', 'p')].forEach((paragraph) => {
      const pPr = child(paragraph, 'pPr');
      const directOutline = valueOf(child(pPr, 'outlineLvl'));
      const directLevel = directOutline !== '' && Number.isInteger(Number(directOutline)) ? Number(directOutline) + 1 : null;
      const level = directLevel || styleLevel(valueOf(child(pPr, 'pStyle')));
      const text = textOf(paragraph).replace(/\s+/g, ' ').trim();
      if (!level || level > 9 || !text || text.length > 160) return;
      const occurrence = occurrences.get(text) || 0;
      occurrences.set(text, occurrence + 1);
      outline.push({ id: `outline-${outline.length + 1}`, level, text, occurrence });
    });
    return outline;
  }
  async function readWord(file) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entry = zip.file('word/document.xml');
    if (!entry) throw new Error('文件不是有效的 Word 文档，或文件已损坏。');
    const xml = await entry.async('string');
    if (xml.length > 8 * 1024 * 1024) throw new Error('模板内容过大，请精简后重新导入。');
    return { zip, documentXML: xmlDocument(xml, 'Word 内容读取失败，请另存文档后重新导入。') };
  }
  async function parseFile(file) {
    if (!/\.docx$/i.test(file.name)) throw new Error('仅支持 Word .docx 模板；.doc 文件请先另存为 .docx。');
    if (!file.size || file.size > 50 * 1024 * 1024) throw new Error('请选择非空且不超过 50 MB 的 Word 文件。');
    const { zip, documentXML } = await readWord(file);
    const paragraphs = [...documentXML.getElementsByTagNameNS('*', 'p')];
    const outline = await parseOutline(zip, documentXML);
    const parts = [];
    let precedingText = '';
    let previous = '', chartIndex = 0;
    paragraphs.forEach((p, index) => {
      const rawText = textOf(p);
      const text = rawText.trim();
      const before = precedingText + rawText.slice(0, rawText.indexOf(text));
      precedingText += rawText;
      const occurrenceOf = (token, prefix = before) => prefix.split(token).length - 1;
      if (p.getElementsByTagNameNS('*', 'drawing').length) {
        parts.push(Store.preparePart({ type: 'chart', name: previous.slice(0, 32) || `图表 ${chartIndex + 1}`, sourceText: '模板图表', anchor: { kind: 'drawing', index: chartIndex++ } }, parts.length));
      }
      if (text.length > 70 && /分析|增长|下降|占比|建议|集中|成交|本月|采购|风险/.test(text)) {
        const occurrence = occurrenceOf(text);
        parts.push(Store.preparePart({ type: 'analysis', name: previous.slice(0, 26) || `自定义内容 ${index + 1}`, sourceText: text, anchor: { kind: 'text', text, occurrence } }, parts.length));
      } else {
        for (const match of text.matchAll(/(?:[+\-]?\d[\d,]*\.\d+(?:%|pp)?|\d+(?:%|亿元|万元|元|项|天)|\{\{[^{}]+\}\})/g)) {
          const token = match[0];
          const occurrence = occurrenceOf(token, before + text.slice(0, match.index));
          const prefix = text.slice(Math.max(0, match.index - 22), match.index).trim();
          const name = prefix || previous.slice(0, 24) || `指标 ${parts.length + 1}`;
          const unit = token.match(/%|pp|亿元|万元|元|项|天/)?.[0] || '';
          parts.push(Store.preparePart({ name, sourceText: token, unit, sampleValue: Number(token.replace(/[^\d.\-]/g, '')) || 0, anchor: { kind: 'text', text: token, occurrence } }, parts.length));
        }
      }
      if (text && text.length < 60 && !/^[\d,%.\s]+$/.test(text)) previous = text;
    });
    const name = file.name.replace(/\.docx$/i, '');
    const procurement = /采购|成交|节资|供应商/.test(paragraphs.map(textOf).join(' '));
    return {
      name, desc: `根据${name}的指标、图表及自定义内容，查询数据并回填原 Word 模板。`, category: /专项|专题/.test(name) ? '专项分析' : '经营报告',
      themes: procurement ? Store.themes.slice(0, 4) : ['销售分析'],
      userPrompt: `请生成【报告月份】【组织范围】的${name}，按模板更新指标、图表及分析内容。`,
      parts: parts.map((part) => ({ ...part, theme: procurement ? Store.themes[0] : '销售分析' })), outline
    };
  }
  async function outline(file) {
    const { zip, documentXML } = await readWord(file);
    return parseOutline(zip, documentXML);
  }
  global.SkillTemplateIO = { put: (id, file) => fileAction(id, file), get: (id) => fileAction(id), remove: (id) => fileAction(id, null, true), parseFile, outline };
})(window);
