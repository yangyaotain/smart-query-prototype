(function (global) {
  "use strict";
  const catalogKey = "smart-query-report-reference-catalog";
  const eventKey = "smart-query-report-version-events";
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const esc = (value) => String(value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function read(key) {
    try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value : []; }
    catch (error) { return []; }
  }
  function sectionPattern(id) {
    const safeId = String(id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp('(<h2\\b[^>]*\\bid=["\']' + safeId + '["\'][^>]*>[\\s\\S]*?<\\/h2>)([\\s\\S]*?)(?=<h2\\b|$)', 'i');
  }
  function applyChanges(body, changes) {
    let result = String(body || "");
    (changes || []).forEach((change) => {
      const pattern = sectionPattern(change.sectionId);
      if (pattern.test(result)) result = result.replace(pattern, (match, heading) => heading + change.html);
      else result += '<h2 id="' + esc(change.sectionId) + '">' + esc(change.heading) + '</h2>' + change.html;
    });
    return result;
  }
  function applySnapshot(snapshot, event) {
    const result = clone(snapshot);
    result.body = typeof event.body === "string" ? event.body : applyChanges(result.body, event.changes);
    if (typeof event.wordDocument === "boolean") result.wordDocument = event.wordDocument;
    if (event.sections) result.sections = clone(event.sections);
    if (event.workbook) result.workbook = clone(event.workbook);
    if (event.pdfData) result.pdfData = clone(event.pdfData);
    if (result.pdfData && event.changes?.length) {
      event.changes.forEach((change) => {
        const name = change.heading.replace(/^[一二三四五六七八九十\d]+[、.．\s]*/, "");
        let page = result.pdfData.pages.find((item) => !item.cover && item.label.includes(name));
        if (!page) {
          page = { label: change.heading, html: "" };
          result.pdfData.pages.push(page);
        }
        page.html = change.html;
      });
    }
    result.version = Number(event.version) || result.version;
    return result;
  }
  function getSnapshot(reference) {
    const key = typeof reference === "string" ? reference : reference.key;
    let snapshot = read(catalogKey).find((item) => item.key === key);
    if (!snapshot) return null;
    snapshot = clone(snapshot);
    read(eventKey).filter((event) => (event.key ? event.key === key : event.name === snapshot.name) && Number(event.version) > snapshot.version)
      .sort((a, b) => a.version - b.version).forEach((event) => { snapshot = applySnapshot(snapshot, event); });
    return snapshot;
  }
  function saveManualVersion(snapshot, content) {
    const latest = getSnapshot(snapshot.key);
    if (!latest || latest.version !== snapshot.version) return null;
    const version = latest.version + 1;
    const events = read(eventKey);
    events.unshift({
      key: latest.key, reportId: latest.reportId, name: latest.name, version,
      time: new Date().toLocaleString("zh-CN", { hour12: false }),
      source: "人工编辑",
      summary: latest.fileType === "excel" ? "在 Excel 编辑器中修改并保存工作簿。" : "在 Word 编辑器中修改并保存文档。",
      ...content
    });
    localStorage.setItem(eventKey, JSON.stringify(events.slice(0, 40)));
    return version;
  }
  function buildWordPages(snapshot) {
    const temp = document.createElement("template");
    temp.innerHTML = snapshot.body || "";
    const pages = [];
    let html = snapshot.wordDocument ? "" :
      "<h1>" + esc(snapshot.name) + '</h1><p class="report-meta">生成时间：' +
      esc(snapshot.generatedAt) + " · 报告类型：" + esc(snapshot.type) + "</p>";
    let hasSection = false;
    for (const node of temp.content.childNodes) {
      if (node.nodeName === "H2") {
        if (hasSection && html.trim()) {
          pages.push(html);
          html = "";
        }
        hasSection = true;
      }
      html += node.nodeType === 1 ? node.outerHTML : esc(node.textContent);
    }
    pages.push(html);
    return pages.map((page, index) =>
      '<section class="report-doc-page" data-page-index="' + (index + 1) + '">' + page +
      '<div class="report-page-number" contenteditable="false">第 ' + (index + 1) + " / " + pages.length + " 页</div></section>"
    ).join("");
  }
  function buildDraft(reference, question, prior, append) {
    const snapshot = prior || getSnapshot(reference) || {
      key: reference.key, name: reference.name, fileType: reference.fileType || "word",
      version: Number(reference.meta?.match(/V(\d+)/)?.[1]) || 13,
      sections: reference.key === "report:r1" ? [
        { id: "s1", name: "一、经营概览" }, { id: "s2", name: "二、区域销售表现" },
        { id: "s3", name: "三、异常增长归因" }, { id: "s4", name: "四、问题与风险" }, { id: "s5", name: "五、经营建议" }
      ] : [], body: ""
    };
    const sections = snapshot.sections || [];
    const ordinal = question.match(/第([一二三四五六七八九十\d]+)章/)?.[1];
    const index = ordinal ? (Number(ordinal) || "一二三四五六七八九十".indexOf(ordinal) + 1) - 1 : -1;
    const named = sections.find((section) => question.includes(section.name.replace(/^[一二三四五六七八九十\d]+[、.．\s]*/, "")));
    const wantsAdvice = /改进建议|经营建议|行动建议|应对措施|改进措施/.test(question);
    const section = (ordinal && (sections.find((item) => item.id === "s" + (index + 1)) || sections[index])) || named
      || sections.find((item) => wantsAdvice ? /建议|措施|计划/.test(item.name) : /风险|问题/.test(item.name)) || sections[sections.length - 1]
      || { id: "s1", name: "分析说明" };
    const previous = String(snapshot.body || "").match(sectionPattern(section.id))?.[2] || "";
    let html;
    if (reference.key === "report:r1" && /风险|问题/.test(section.name)) {
      html = '<p>本季度重点关注区域目标达成、库存周转、客户集中度与毛利承压四类风险。</p>'
        + '<h3>1. 区域目标达成</h3><p>华北、东北目标完成率分别为 79% 和 76%，应拆解重点客户与渠道的目标缺口。</p>'
        + '<h3>2. 库存周转与资金占用</h3><p>库存周转天数由 38 天上升至 42 天，部分长尾 SKU 超过 90 天。积压库存增加资金占用，后续促销清理可能压低毛利，并影响新品备货和现金回笼。</p>'
        + '<h3>3. 客户集中度</h3><p>TOP10 客户贡献 67%，其中 3 家客户近 90 天订单频次下降至少 30%，需提前开展客户回访。</p>'
        + '<h3>4. 毛利风险</h3><p>综合毛利率为 26.8%，环比下降 0.6 个百分点，应结合促销折扣与库存处置同步评估利润影响。</p>';
      html += previous.match(/<div class="asset-preview"[\s\S]*?<\/div><\/div>/)?.[0] || "";
    } else if (wantsAdvice) {
      const inventory = /库存/.test(question);
      const advice = inventory
        ? '<h3>库存风险改进建议</h3><ul><li>供应链团队梳理周转超过 90 天的长尾 SKU，按滞销原因和库存账龄制定分批处置计划。</li><li>销售团队联动区域负责人复核需求与可售库存，优先进行跨区域调拨，减少重复采购。</li><li>财务团队每周跟踪库存资金占用、回款及处置毛利，经营会议复核措施执行效果。</li></ul>'
        : '<h3>经营改进建议</h3><ul><li>按业务优先级建立问题清单，明确责任人与完成时间。</li><li>对异常指标复核来源及统计口径，逐项跟进影响因素。</li><li>在经营例会中对照措施检查结果，形成持续跟踪记录。</li></ul>';
      html = previous.replace(/<h3>(?:库存风险改进建议|经营改进建议)<\/h3>[\s\S]*$/, '') + advice;
    } else {
      html = previous + '<h3>重点分析与跟进</h3><p>结合当前报告的指标和业务范围，按主要变化、影响因素和后续动作梳理分析结论；对异常项目逐项复核数据口径，并明确跟进责任与复核周期。</p>';
    }
    if (append && !wantsAdvice) html = previous + '<h3>补充分析结论</h3><p>当前分析提示应关注区域贡献、客户变化与库存保障，按业务优先级跟进重点问题，并在下一次经营复盘中核验执行效果。</p>';
    const change = { sectionId: section.id, heading: section.name, html };
    const changes = (prior?.changes || []).filter((item) => item.sectionId !== section.id).concat(change);
    const draft = { ...clone(snapshot), changes, round: (prior?.round || 0) + 1, baseVersion: prior?.baseVersion || snapshot.version };
    draft.sections = sections.length ? sections : [section];
    draft.body = applyChanges(snapshot.body, changes);
    draft.scope = changes.map((item) => item.heading).join("、");
    if (snapshot.fileType === "excel" && snapshot.workbook) {
      const sheet = draft.workbook.sheets[0];
      let column = sheet.columns.indexOf("分析建议");
      if (column < 0) { column = sheet.columns.length; sheet.columns.push("分析建议"); }
      sheet.rows.forEach((row) => {
        row[column] = /异常|待|高|流失|放缓/.test(row.slice(0, column).join(" ")) ? "优先复核异常原因，明确负责人并跟进处理结果" : "维持常规跟踪，定期复核经营变化";
      });
      if (draft.workbook.spreadSnapshot) draft.workbook.analysisColumn = column;
      if (draft.workbook.cellEdits) draft.workbook.cellEdits = draft.workbook.cellEdits.filter((edit) => edit.column !== column);
      draft.scope = "业务明细表 · 分析建议列";
    }
    return draft;
  }
  global.ReportReference = { readCatalog: () => read(catalogKey), readEvents: () => read(eventKey), getSnapshot, saveManualVersion, buildWordPages, buildDraft, applyChanges, applySnapshot,
    saveCatalog: (items) => localStorage.setItem(catalogKey, JSON.stringify(items)), escapeHTML: esc };
})(window);
