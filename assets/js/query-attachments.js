/* File 本体仅保存在页面会话中；固定示例由本地资源提供。 */
window.QueryAttachments = (() => {
  const files = new Map();
  const pending = new Map();
  const list = document.getElementById("attachmentPreviewList");
  const overlay = document.getElementById("attachmentPreviewOverlay");
  const content = document.getElementById("attachmentPreviewContent");
  const tools = document.getElementById("attachmentImageTools");
  const scripts = new Map();
  const isFilePage = document.body?.dataset.attachmentFilePage === "true";
  const previewTabs = new Map();
  const uploadSession = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let sequence = 0;
  let activeFiles = [];
  let activeIndex = 0;
  let zoom = 1;
  let baseWidth = 0;
  let renderToken = 0;
  let returnFocus = null;
  let bodyOverflow = "";
  const icon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  const openIcon = icon('<path d="M14 3h7v7M21 3l-9 9M10 5H5v14h14v-5"/>');
  const closeIcon = icon('<path d="m6 6 12 12M18 6 6 18"/>');
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const extension = (file) => (file.name.split(".").pop() || "file").toLowerCase();
  const sizeText = (size) => size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
  const typeLabel = (file) => file.type === "image" ? "图片" : ({ docx: "Word", doc: "Word", xlsx: "Excel", xls: "Excel", pptx: "PPT", ppt: "PPT" }[extension(file)] || extension(file).toUpperCase());

  function register(file) {
    if (!file.id) file.id = `query-attachment-${uploadSession}-${++sequence}`;
    if (!files.has(file.id)) files.set(file.id, file);
    return files.get(file.id);
  }

  function makeButton(file) {
    file = register(file);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `question-attachment ${file.type === "image" ? "question-image" : "question-file"}`;
    button.dataset.attachmentId = file.id;
    button.title = `${file.name} · ${file.type === "image" ? "点击查看图片" : "新标签页打开文件"}`;
    button.setAttribute("aria-label", `打开${file.type === "image" ? "图片" : "文件"}：${file.name}`);
    button.innerHTML = file.type === "image"
      ? `<img src="${escape(file.url)}" alt="${escape(file.name)}" loading="lazy" />`
      : `<span class="query-file-type is-${escape(extension(file))}">${escape(typeLabel(file))}</span><span class="question-file-copy"><strong>${escape(file.name)}</strong><small>${escape(file.meta || typeLabel(file))}</small><em>${openIcon}打开文件</em></span>`;
    return button;
  }

  function add(type, file) {
    if (!file) return;
    const image = type === "image" || file.type.startsWith("image/");
    const entry = register({ type: image ? "image" : "file", file, name: file.name, size: file.size, url: URL.createObjectURL(file), meta: `${image ? "图片" : (file.name.split(".").pop() || "文件").toUpperCase()} · ${sizeText(file.size)}` });
    pending.set(entry.id, entry);
    renderPending();
  }

  function renderPending() {
    list.replaceChildren();
    list.classList.toggle("hidden", !pending.size);
    pending.forEach((file) => {
      const chip = document.createElement("div");
      chip.className = "attachment-chip";
      chip.appendChild(makeButton(file));
      const remove = document.createElement("button");
      remove.className = "attachment-remove";
      remove.type = "button";
      remove.title = `移除 ${file.name}`;
      remove.setAttribute("aria-label", remove.title);
      remove.innerHTML = closeIcon;
      remove.addEventListener("click", () => {
        pending.delete(file.id);
        files.delete(file.id);
        URL.revokeObjectURL(file.url);
        renderPending();
      });
      chip.appendChild(remove);
      list.appendChild(chip);
    });
    list.dispatchEvent(new Event("attachmentschange"));
  }

  function clearPending(discard = false) {
    if (discard) pending.forEach((file) => { URL.revokeObjectURL(file.url); files.delete(file.id); });
    pending.clear();
    renderPending();
  }

  function restorePending(attachments) {
    pending.clear();
    attachments.forEach((file) => pending.set(file.id, register(file)));
    renderPending();
  }

  function renderMessage(stack, attachments) {
    stack.querySelector(".question-attachments")?.remove();
    if (!attachments?.length) return;
    const group = document.createElement("div");
    group.className = "question-attachments";
    attachments.forEach((file) => group.appendChild(makeButton(file)));
    stack.prepend(group);
  }

  // 委托事件可覆盖 cloneNode 产生的历史消息，不依赖克隆前的事件监听器。
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-attachment-id]");
    if (!button) return;
    const file = files.get(button.dataset.attachmentId);
    if (!file) return;
    if (file.type !== "image") { openFilePage(file); return; }
    const group = button.closest(".question-attachments, .attachment-preview-list");
    const images = Array.from(group?.querySelectorAll("[data-attachment-id]") || [])
      .map((item) => files.get(item.dataset.attachmentId)).filter((item) => item?.type === "image");
    activeFiles = file.type === "image" ? images : [file];
    activeIndex = Math.max(0, activeFiles.indexOf(file));
    returnFocus = button;
    bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    overlay.classList.remove("hidden");
    renderPreview();
    overlay.querySelector('[data-preview-action="close"]').focus();
  });

  function close() {
    if (isFilePage) { window.close(); return; }
    if (overlay.classList.contains("hidden")) return;
    renderToken += 1;
    overlay.classList.add("hidden");
    content.replaceChildren();
    document.body.style.overflow = bodyOverflow;
    activeFiles = [];
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }

  function openFilePage(file) {
    // 在点击调用栈内同步开页，上传的 File 等新页就绪后再结构化传递。
    const token = `${Date.now()}-${++sequence}`;
    const query = file.file ? `transfer=${encodeURIComponent(token)}` : `file=${encodeURIComponent(file.id)}`;
    const page = overlay.dataset.filePreview || "query-attachment-preview.html";
    const tab = window.open(`${page}?${query}`, "_blank");
    if (tab && file.file) {
      for (const [key, entry] of previewTabs) if (entry.tab.closed) previewTabs.delete(key);
      previewTabs.set(token, { tab, file });
    }
    if (!tab && typeof showToast === "function") showToast("未能打开预览页，请允许本站打开新标签页后重试");
  }

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "query-attachment-ready") return;
    const entry = previewTabs.get(data.token);
    if (!entry || event.source !== entry.tab || event.origin !== window.location.origin) return;
    entry.tab.postMessage({ type: "query-attachment-file", token: data.token, file: entry.file }, event.origin === "null" ? "*" : event.origin);
  });

  function fallback(file, message) {
    content.innerHTML = `<div class="attachment-fallback"><span class="query-file-type is-${escape(extension(file))}">${escape(typeLabel(file))}</span><h4>${escape(file.name)}</h4><p>${escape(message)}</p><p>可点击上方“下载文件”，使用本地应用打开。</p></div>`;
  }

  function renderTable(rows, note) {
    content.innerHTML = `<p class="attachment-preview-note">${escape(note)}</p><div class="attachment-table-wrap"><table class="data-table"><thead><tr>${(rows[0] || []).map((cell) => `<th>${escape(cell)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1, 201).map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [], value = "", quoted = false;
    text = text.replace(/^\uFEFF/, "");
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (char === '"') {
        if (quoted && text[i + 1] === '"') { value += '"'; i += 1; }
        else quoted = !quoted;
      } else if (char === "," && !quoted) { row.push(value); value = ""; }
      else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && text[i + 1] === "\n") i += 1;
        row.push(value); rows.push(row); row = []; value = "";
      } else value += char;
    }
    if (value || row.length) { row.push(value); rows.push(row); }
    return rows;
  }

  function loadScript(path) {
    if (!scripts.has(path)) scripts.set(path, new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = path;
      script.onload = resolve;
      script.onerror = () => { scripts.delete(path); script.remove(); reject(new Error("预览组件加载失败")); };
      document.head.appendChild(script);
    }));
    return scripts.get(path);
  }

  async function readWorkbook(file) {
    await loadScript("../../assets/vendor/docx-preview/jszip.min.js");
    const zip = await JSZip.loadAsync(file.file);
    const xml = async (path) => {
      const item = zip.file(path);
      if (!item) throw new Error("工作簿内容不完整");
      const doc = new DOMParser().parseFromString(await item.async("string"), "application/xml");
      if (doc.querySelector("parsererror")) throw new Error("工作簿内容无法读取");
      return doc;
    };
    const workbook = await xml("xl/workbook.xml");
    const sheet = workbook.getElementsByTagName("sheet")[0];
    if (!sheet) throw new Error("工作簿没有工作表");
    const rels = await xml("xl/_rels/workbook.xml.rels");
    const rel = Array.from(rels.getElementsByTagName("Relationship")).find((item) => item.getAttribute("Id") === sheet.getAttribute("r:id"));
    if (!rel) throw new Error("工作表无法定位");
    const target = rel.getAttribute("Target");
    const sheetPath = new URL(target, "https://workbook.local/xl/workbook.xml").pathname.slice(1);
    const strings = zip.file("xl/sharedStrings.xml") ? Array.from((await xml("xl/sharedStrings.xml")).getElementsByTagName("si"), (item) => item.textContent) : [];
    const doc = await xml(sheetPath);
    const sourceRows = Array.from(doc.getElementsByTagName("row"));
    const rows = sourceRows.slice(0, 201).map((row) => {
      const values = [];
      Array.from(row.getElementsByTagName("c")).forEach((cell) => {
        const letters = (cell.getAttribute("r") || "A").replace(/\d/g, "");
        const column = Array.from(letters).reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1;
        if (column < 0 || column > 99) return;
        while (values.length <= column) values.push("");
        const value = cell.getElementsByTagName("v")[0]?.textContent || "";
        values[column] = cell.getAttribute("t") === "s" ? strings[Number(value)] || "" : cell.getAttribute("t") === "inlineStr" ? cell.getElementsByTagName("is")[0]?.textContent || "" : value;
      });
      return values;
    });
    const width = Math.max(0, ...rows.map((row) => row.length));
    rows.forEach((row) => { while (row.length < width) row.push(""); });
    return { rows, note: `${sheet.getAttribute("name")} · 只读预览 · 首张工作表，最多显示 200 行数据、100 列；数值按文件存储值展示` };
  }

  async function renderPreview() {
    const file = activeFiles[activeIndex];
    if (!file) return;
    const token = ++renderToken;
    zoom = 1;
    content.className = `attachment-preview-content${file.type === "image" ? " is-image" : ""}`;
    content.scrollTop = 0;
    content.scrollLeft = 0;
    document.getElementById("attachmentPreviewName").textContent = file.name;
    document.getElementById("attachmentPreviewMeta").textContent = `${file.meta || typeLabel(file)} · 只读预览`;
    const download = overlay.querySelector('[data-preview-action="download"]');
    download.disabled = !file.url;
    tools?.classList.toggle("hidden", file.type !== "image");
    if (file.type === "image") {
      overlay.querySelector('[data-preview-action="previous"]').disabled = activeIndex === 0;
      overlay.querySelector('[data-preview-action="next"]').disabled = activeIndex >= activeFiles.length - 1;
      document.getElementById("attachmentImageCount").textContent = `${activeIndex + 1} / ${activeFiles.length}`;
      content.innerHTML = `<div class="attachment-image-stage"><img alt="${escape(file.name)}" /></div>`;
      const img = content.querySelector("img");
      img.onload = () => {
        if (token !== renderToken) return;
        const availableWidth = Math.max(100, content.clientWidth - 48);
        const availableHeight = Math.max(100, content.clientHeight - 48);
        baseWidth = Math.min(img.naturalWidth, availableWidth, availableHeight * img.naturalWidth / img.naturalHeight);
        updateZoom();
      };
      img.onerror = () => { if (token === renderToken) fallback(file, "图片暂时无法加载，请下载原图查看。"); };
      img.src = file.url;
      document.getElementById("attachmentZoomValue").textContent = "100%";
      return;
    }
    content.innerHTML = '<div class="attachment-fallback"><p role="status">正在加载文件内容…</p></div>';
    try {
      if (file.pages || file.slides) {
        const pages = file.pages || file.slides;
        content.innerHTML = `<div class="attachment-document-pages${file.slides ? " is-slides" : ""}">${pages.map((src, index) => `<figure><img src="${escape(src)}" alt="${escape(file.name)} 第 ${index + 1} 页" loading="lazy"/><figcaption>第 ${index + 1} / ${pages.length} 页</figcaption></figure>`).join("")}</div>`;
        return;
      }
      if (typeof file.text === "string") {
        const pre = document.createElement("pre"); pre.className = "attachment-text"; pre.textContent = file.text; content.replaceChildren(pre); return;
      }
      if (file.rows) { renderTable(file.rows, file.note || "只读预览"); return; }
      const ext = extension(file);
      if (ext === "pdf" && file.url) {
        content.innerHTML = `<iframe class="attachment-pdf-frame" title="${escape(file.name)}" src="${escape(file.url)}#view=FitH"></iframe>`;
      } else if (["txt", "csv"].includes(ext) && file.file) {
        if (file.size > 10 * 1024 * 1024) { fallback(file, "文件较大，暂不提供在线文本预览。"); return; }
        const text = await file.file.text();
        if (token !== renderToken) return;
        if (ext === "csv") renderTable(parseCsv(text), "CSV · 只读预览 · 最多显示 200 行数据");
        else { const pre = document.createElement("pre"); pre.className = "attachment-text"; pre.textContent = text; content.replaceChildren(pre); }
      } else if (ext === "xlsx" && file.file) {
        if (file.size > 20 * 1024 * 1024) { fallback(file, "文件较大，暂不提供在线表格预览。"); return; }
        const table = await readWorkbook(file);
        if (token === renderToken) renderTable(table.rows, table.note);
      } else if (ext === "docx" && file.file) {
        if (file.size > 20 * 1024 * 1024) { fallback(file, "文件较大，暂不提供在线文档预览。"); return; }
        await loadScript("../../assets/vendor/docx-preview/jszip.min.js");
        await loadScript("../../assets/vendor/docx-preview/docx-preview.min.js");
        if (token !== renderToken) return;
        const stage = document.createElement("div");
        stage.className = "attachment-word-content";
        await docx.renderAsync(file.file, stage, undefined, { breakPages: true, ignoreWidth: true, renderAltChunks: false });
        if (token === renderToken) content.replaceChildren(stage);
      } else fallback(file, "当前格式暂不支持在线预览。");
    } catch (error) {
      if (token === renderToken) fallback(file, "文件内容暂时无法预览，文件可能使用了暂不支持的格式或编码。");
    }
  }

  function updateZoom() {
    const img = content.querySelector(".attachment-image-stage img");
    if (!img) return;
    img.style.width = `${baseWidth * zoom}px`;
    img.style.height = "auto";
    document.getElementById("attachmentZoomValue").textContent = `${Math.round(zoom * 100)}%`;
    overlay.querySelector('[data-preview-action="zoom-out"]').disabled = zoom <= .5;
    overlay.querySelector('[data-preview-action="zoom-in"]').disabled = zoom >= 3;
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) { close(); return; }
    const button = event.target.closest("[data-preview-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.previewAction;
    if (action === "close") close();
    else if (action === "download") {
      const file = activeFiles[activeIndex];
      if (!file?.url) return;
      const anchor = document.createElement("a"); anchor.href = file.url; anchor.download = file.name; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    } else if (action === "previous" || action === "next") { activeIndex += action === "previous" ? -1 : 1; renderPreview(); }
    else { zoom = action === "reset" ? 1 : Math.min(3, Math.max(.5, Number((zoom + (action === "zoom-in" ? .25 : -.25)).toFixed(2)))); updateZoom(); }
  });
  document.addEventListener("keydown", (event) => {
    if (overlay.classList.contains("hidden")) {
      if (["Enter", " "].includes(event.key) && event.target.matches('[data-attachment-history], [data-attachment-id][role="button"]')) {
        event.preventDefault();
        event.target.click();
      }
      return;
    }
    if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); close(); }
    else if (event.key === "Tab" && !isFilePage) {
      const focusable = Array.from(overlay.querySelectorAll("button:not(:disabled), iframe")).filter((element) => element.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    } else if (activeFiles[activeIndex]?.type === "image" && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      const next = activeIndex + (event.key === "ArrowLeft" ? -1 : 1);
      if (next >= 0 && next < activeFiles.length) { activeIndex = next; renderPreview(); }
    }
  }, true);
  window.addEventListener("beforeunload", () => { files.forEach((file) => { if (file.file) URL.revokeObjectURL(file.url); }); });

  const rows = [
    ["区域", "4月销售额（万元）", "5月销售额（万元）", "6月销售额（万元）", "二季度合计（万元）", "目标完成率"],
    ["华东", "2870", "3100", "3248", "9218", "108.4%"],
    ["华南", "2250", "2340", "2510", "7100", "101.4%"],
    ["华北", "1980", "2020", "2100", "6100", "95.3%"],
    ["西部", "1320", "1380", "1482", "4182", "92.9%"],
    ["合计", "8420", "8840", "9340", "26600", "100.8%"]
  ];
  const spreadsheet = register({ id: "sample-sales-xlsx", type: "file", name: "2026年二季度区域销售明细.xlsx", meta: "Excel · 5.4 KB", url: "../../assets/docs/query-attachments/regional-sales-q2.xlsx", rows, note: "区域销售明细 · 只读预览 · 2026 年二季度 · 金额单位：万元" });
  const pdf = register({ id: "sample-sales-pdf", type: "file", name: "2026年二季度销售经营分析报告.pdf", meta: "PDF · 5.4 KB · 2 页", url: "../../assets/docs/query-attachments/sales-review-q2.pdf" });
  const word = register({ id: "sample-procurement-word", type: "file", name: "华润建材科技月度采购快报.docx", meta: "Word · 21 页", url: "../../assets/docs/monthly-procurement-report.docx", pages: Array.from({ length: 21 }, (_, i) => `../../assets/docs/monthly-procurement-pages/page-${String(i + 1).padStart(2, "0")}.png`) });
  const ppt = register({ id: "sample-sales-ppt", type: "file", name: "二季度销售经营汇报.pptx", meta: "PPT · 3 页", url: "../../assets/docs/query-attachments/sales-review-q2.pptx", slides: ["overview", "regions", "detail"].map((key) => `../../assets/docs/query-attachments/sales-${key}.png`) });
  const txt = register({ id: "sample-sales-txt", type: "file", name: "二季度销售分析要点.txt", meta: "TXT · UTF-8", url: "../../assets/docs/query-attachments/sales-notes-q2.txt", text: "二季度销售分析要点\n\n统计周期：2026年4月至6月\n金额单位：万元\n\n季度销售额：26,600\n季度目标：26,400\n目标完成率：100.8%\n\n区域表现\n华东：9,218，完成率108.4%\n华南：7,100，完成率101.4%\n华北：6,100，完成率95.3%，缺口300\n西部：4,182，完成率92.9%，缺口318\n\n建议：优先跟进华北重点客户订单与西部渠道转化。\n\n说明：本文件为智能问数原型固定示例数据。\n" });
  const images = [
    ["overview", "二季度销售经营总览.png"], ["regions", "区域销售对比.png"], ["detail", "区域销售明细.png"]
  ].map(([key, name]) => register({ id: `sample-sales-${key}`, type: "image", name, meta: "PNG · 1280 × 720", url: `../../assets/docs/query-attachments/sales-${key}.png` }));
  const context = (attachments) => ({ themes: ["销售分析"], references: [], attachments, followup: null });
  const scenarios = {
    attachmentFormats: { mode: "qa", question: "请整理这些销售经营资料和采购报告，分别列出每份附件的内容。", answerTitle: "经营资料附件概览", context: context([pdf, spreadsheet, word, ppt, txt]), attachmentSummary: "已按附件整理：\nPDF：二季度销售经营分析报告，包含经营概览、区域表现与建议。\nExcel：二季度区域销售明细，可查看各月销售额和目标完成率。\nWord：华润建材科技月度采购快报，包含采购成交、节资及相关指标。\nPPT：三页销售经营汇报，展示总览、区域对比和明细。\nTXT：销售分析要点，汇总关键数字和关注建议。\n点击任一文件卡片，在新标签页查看对应内容。" },
    attachmentImages: { mode: "qa", question: "根据这三张销售看板截图，分析二季度各区域的业绩差异，指出需要关注的区域。", answerTitle: "二季度区域销售差异分析", context: context(images), attachmentSummary: "二季度销售额合计 26,600 万元，目标完成率 100.8%。\n华东销售额 9,218 万元，占比 34.7%，目标完成率 108.4%，是主要增长贡献区域；华南完成率 101.4%，整体稳定。\n华北和西部的目标完成率分别为 95.3% 和 92.9%，建议优先关注西部的目标缺口，并跟进华北重点客户的订单转化。" },
    attachmentPdf: { mode: "qa", question: "请解读这份二季度销售经营分析报告，概括经营表现和需要关注的问题。", answerTitle: "二季度销售经营报告解读", context: context([pdf]), attachmentSummary: "报告显示，二季度销售额为 26,600 万元，整体达到季度目标，6 月销售额较 4 月增长 10.9%。\n区域表现存在分化：华东、华南超额完成目标；华北缺口 300 万元，西部缺口 318 万元。\n建议优先跟进西部的渠道转化和华北重点客户订单，同时复用华东成熟客户的经营方式。具体数据可点击上方 PDF 核对。" },
    attachmentMixed: { mode: "qa", question: "对照销售明细和经营报告，核对二季度各区域销售额与目标完成情况是否一致。", answerTitle: "销售明细与经营报告核对", context: context([spreadsheet, pdf]), attachmentSummary: "已按季度、区域和金额单位核对两个附件，销售额及目标完成率一致。\n华东 9,218 万元、华南 7,100 万元、华北 6,100 万元、西部 4,182 万元，合计 26,600 万元。\n整体目标完成率 100.8%；华北、西部仍有目标缺口。以上为固定示例数据，可分别打开 Excel 和 PDF 查看原始明细与报告。" }
  };
  const comparisonRows = [["月份", "2025年销售额（万元）"], ["1月", "1860"], ["2月", "1930"], ["3月", "2050"], ["4月", "2180"], ["5月", "2260"], ["6月", "2360"], ["合计", "12640"]];
  const comparisonFile = register({ id: "sample-comparison-xlsx", type: "file", name: "2025年1-6月华东区销售明细.xlsx", meta: "Excel · 5.2 KB", url: "../../assets/docs/query-attachments/east-sales-2025.xlsx", rows: comparisonRows, note: "同期销售汇总 · 只读预览 · 2025 年 1-6 月 · 金额单位：万元" });
  if (isFilePage) {
    const params = new URLSearchParams(window.location.search);
    const transfer = params.get("transfer");
    const showFile = (file) => {
      activeFiles = [register(file)]; activeIndex = 0;
      document.title = `${file.name} - 文件预览`;
      renderPreview();
    };
    const missing = () => {
      document.getElementById("attachmentPreviewName").textContent = "文件暂时无法打开";
      overlay.querySelector('[data-preview-action="download"]').disabled = true;
      content.innerHTML = '<div class="attachment-fallback"><h4>未找到可预览的文件</h4><p>请返回智能问数，重新点击附件卡片打开。</p></div>';
    };
    if (transfer && window.opener) {
      const timeout = setTimeout(missing, 8000);
      window.addEventListener("message", (event) => {
        if (event.source !== window.opener || event.origin !== window.location.origin || event.data?.type !== "query-attachment-file" || event.data.token !== transfer || !event.data.file?.file) return;
        clearTimeout(timeout);
        const received = { ...event.data.file, url: URL.createObjectURL(event.data.file.file) };
        const previous = files.get(received.id);
        if (previous?.file) URL.revokeObjectURL(previous.url);
        files.delete(received.id);
        showFile(received);
      });
      window.opener.postMessage({ type: "query-attachment-ready", token: transfer }, window.location.origin === "null" ? "*" : window.location.origin);
    } else {
      const file = files.get(params.get("file"));
      if (file?.type === "file") showFile(file); else missing();
    }
  }
  return { add, clearPending, restorePending, getPending: () => Array.from(pending.values()), get: (id) => files.get(id), renderMessage, close, scenarios, comparisonFile, parseCsv };
})();
