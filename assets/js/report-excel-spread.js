(function () {
  function spreadNamespace() {
    return window.GC && window.GC.Spread && window.GC.Spread.Sheets;
  }

  function isAvailable() {
    const Sheets = spreadNamespace();
    return Boolean(Sheets && Sheets.Workbook);
  }

  function applySingleSheetOptions(spread) {
    if (!spread) return;
    while (spread.getSheetCount() > 1) spread.removeSheet(spread.getSheetCount() - 1);
    if (!spread.getSheetCount()) spread.setSheetCount(1);
    spread.options.tabStripVisible = false;
    spread.options.newTabVisible = false;
    spread.options.tabEditable = false;
    spread.options.allowSheetReorder = false;
    spread.options.allSheetsListVisible = 0;
    spread.options.tabNavigationVisible = false;
    spread.options.showScrollTip = 3;
    spread.options.showResizeTip = 3;
  }

  function valueForSpread(value) {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (/^[-+]?\d+(?:\.\d+)?%$/.test(trimmed)) return Number(trimmed.slice(0, -1)) / 100;
    if (/^¥\s*[-+]?\d[\d,]*(?:\.\d+)?$/.test(trimmed)) return Number(trimmed.replace(/[¥,\s]/g, ''));
    return value;
  }

  function initializeLegacy(spread, workbook) {
    const Sheets = spreadNamespace();
    const source = workbook && workbook.sheets && workbook.sheets[0] ? workbook.sheets[0] : {};
    const columns = Array.isArray(source.columns) ? source.columns : [];
    const rows = Array.isArray(source.rows) ? source.rows : [];
    const matrix = [columns].concat(rows).map((row) => row.map(valueForSpread));
    const rowCount = Math.max(50, matrix.length + 12);
    const columnCount = Math.max(12, columns.length || 1);

    spread.setSheetCount(1);
    const sheet = spread.getActiveSheet();
    sheet.name(source.name || workbook.title || '业务明细');
    sheet.setRowCount(rowCount);
    sheet.setColumnCount(columnCount);
    sheet.defaults.rowHeight = 25;
    sheet.defaults.colWidth = 110;

    if (matrix.length && columns.length) {
      sheet.setArray(0, 0, matrix);
      const table = sheet.tables.add('BusinessData', 0, 0, matrix.length, columns.length, 'medium4');
      table.showHeader(true);
      table.bandRows(true);
      sheet.frozenRowCount(1);
      sheet.setRowHeight(0, 30);
      sheet.getRange(0, 0, 1, columns.length).font('bold 11pt Microsoft YaHei');
      sheet.getRange(1, 0, Math.max(rows.length, 1), columns.length).font('10pt Microsoft YaHei');

      columns.forEach((column, index) => {
        const configuredWidth = Number((source.columnWidths || [])[index]);
        const width = Number.isFinite(configuredWidth)
          ? configuredWidth
          : Math.min(210, Math.max(105, String(column || '').length * 15 + 44));
        sheet.setColumnWidth(index, width);

        const values = rows.map((row) => row[index]);
        if (values.some((value) => typeof value === 'string' && /^¥/.test(value.trim()))) {
          sheet.getRange(1, index, Math.max(rows.length, 1), 1).formatter('¥#,##0');
        } else if (values.some((value) => typeof value === 'string' && /%$/.test(value.trim()))) {
          sheet.getRange(1, index, Math.max(rows.length, 1), 1).formatter('0.00%');
        }
      });
    }

    sheet.setActiveCell(0, 0);
    sheet.options.gridline = { showVerticalGridline: true, showHorizontalGridline: true };
    sheet.options.isProtected = false;
    applySingleSheetOptions(spread);
    spread.refresh();
  }

  async function load(spread, workbook) {
    if (!isAvailable()) throw new Error('SpreadJS is unavailable');
    spread.suspendPaint();
    try {
      if (workbook && workbook.spreadSnapshot) {
        await spread.fromJSON(workbook.spreadSnapshot);
        applySingleSheetOptions(spread);
        const sheet = spread.getActiveSheet();
        if (sheet) sheet.options.isProtected = false;
      } else {
        initializeLegacy(spread, workbook || {});
      }
    } finally {
      spread.resumePaint();
      spread.refresh();
    }
    return spread;
  }

  function serialize(spread, workbook) {
    const Sheets = spreadNamespace();
    const base = JSON.parse(JSON.stringify(workbook || {}));
    const sheet = spread.getActiveSheet();
    const used = sheet.getUsedRange(Sheets.UsedRangeType.data | Sheets.UsedRangeType.formula);
    const rowCount = used ? Math.max(1, used.row + used.rowCount) : 1;
    const columnCount = used ? Math.max(1, used.col + used.colCount) : 1;
    const matrix = sheet.getArray(0, 0, rowCount, columnCount) || [[]];
    const columns = (matrix[0] || []).map((value, index) => value == null || value === '' ? '字段' + (index + 1) : String(value));
    const rows = matrix.slice(1).map((row) => columns.map((column, index) => row[index] == null ? '' : row[index]));
    const columnWidths = columns.map((column, index) => Math.round(sheet.getColumnWidth(index)));

    base.sheets = [{
      name: sheet.name() || base.title || '业务明细',
      columns: columns,
      rows: rows,
      columnWidths: columnWidths
    }];
    base.spreadSnapshot = spread.toJSON();
    return base;
  }

  function setReadOnly(spread) {
    if (!spread) return;
    applySingleSheetOptions(spread);
    spread.options.allowContextMenu = false;
    spread.options.allowUserDragDrop = false;
    spread.options.allowUserDragFill = false;
    spread.options.allowUndo = false;
    const sheet = spread.getActiveSheet();
    if (!sheet) return;
    sheet.options.isProtected = true;
    sheet.options.protectionOptions = {
      allowSelectLockedCells: true,
      allowSelectUnlockedCells: true,
      allowFilter: true,
      allowSort: true,
      allowResizeRows: true,
      allowResizeColumns: true
    };
  }

  function getDimensions(workbook) {
    const sheet = workbook && workbook.sheets && workbook.sheets[0] ? workbook.sheets[0] : {};
    return {
      rows: Array.isArray(sheet.rows) ? sheet.rows.length : 0,
      columns: Array.isArray(sheet.columns) ? sheet.columns.length : 0
    };
  }

  window.ReportExcelSpread = {
    isAvailable: isAvailable,
    applySingleSheetOptions: applySingleSheetOptions,
    load: load,
    serialize: serialize,
    setReadOnly: setReadOnly,
    getDimensions: getDimensions
  };
})();
