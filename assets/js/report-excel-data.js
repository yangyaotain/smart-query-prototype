(function () {
  const STORAGE_PREFIX = 'smart-query-report-excel-';

  const WORKBOOKS = {
    r7: {
      title: '客户分层运营报告',
      fileName: '客户分层运营报告.xlsx',
      sheets: [
        {
          name: '客户分层运营明细',
          columns: ['客户编号', '客户名称', '客户层级', '累计金额', '最近消费', '复购状态', '预警等级', '负责人'],
          rows: [
            ['KH-10028', '华东智联科技', '核心客户', '¥1,286,400', '2026-06-28', '稳定复购', '低', '王敏'],
            ['KH-10216', '南方商贸集团', '重要客户', '¥768,200', '2026-06-24', '稳定复购', '低', '李波'],
            ['KH-11005', '新域数字商业', '重要客户', '¥526,900', '2026-06-18', '复购放缓', '中', '赵静'],
            ['KH-10587', '北辰零售有限公司', '普通客户', '¥126,800', '2026-05-16', '待跟进', '中', '陈峰'],
            ['KH-10832', '远洋供应链', '流失客户', '¥98,600', '2025-11-08', '召回中', '高', '王敏'],
            ['KH-11126', '中诚渠道', '流失客户', '¥182,300', '2025-12-14', '召回中', '高', '李波'],
            ['KH-11308', '德润实业', '普通客户', '¥76,500', '2026-02-06', '待唤醒', '中', '赵静'],
            ['KH-11567', '海纳商贸', '普通客户', '¥63,200', '2026-02-22', '待唤醒', '中', '陈峰']
          ]
        }
      ]
    },
    r10: {
      title: '5月销售经营明细',
      fileName: '2026年5月销售经营明细.xlsx',
      sheets: [
        {
          name: '5月销售经营明细',
          columns: ['订单编号', '日期', '区域', '渠道', '产品线', '客户', '销售额', '异常状态'],
          rows: [
            ['SO-260501-018', '2026-05-01', '华东', '线上电商', '智能设备', '华东智联科技', '¥86,400', '正常'],
            ['SO-260503-126', '2026-05-03', '华南', '大客户直销', '企业服务', '南方商贸集团', '¥128,600', '正常'],
            ['SO-260508-227', '2026-05-08', '华北', '经销商', '智能设备', '北辰零售有限公司', '¥52,800', '客户等级待复核'],
            ['SO-260512-356', '2026-05-12', '华东', '线下门店', '消费电子', '新域数字商业', '¥73,500', '渠道归属待确认'],
            ['SO-260518-482', '2026-05-18', '西南', '线上电商', '智能设备', '云岭商贸', '¥46,900', '正常'],
            ['SO-260521-583', '2026-05-21', '华北', '大客户直销', '企业服务', '中诚渠道', '¥96,800', '高折扣待审批'],
            ['SO-260526-705', '2026-05-26', '华东', '大客户直销', '企业服务', '远洋供应链', '¥156,300', '正常'],
            ['SO-260528-762', '2026-05-28', '华南', '经销商', '智能设备', '海纳商贸', '¥68,200', '区域编码已修复']
          ]
        }
      ]
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeWorkbook(workbook, fallback) {
    const source = workbook && Array.isArray(workbook.sheets) && workbook.sheets.length === 1 ? workbook : fallback;
    const normalized = clone(source || WORKBOOKS.r10);
    normalized.sheets = (normalized.sheets || []).slice(0, 1);
    return normalized;
  }

  function readStored(reportId) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + reportId);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  window.ReportExcelData = {
    has: function (reportId) {
      return Boolean(WORKBOOKS[reportId] || readStored(reportId));
    },
    get: function (reportId) {
      const stored = readStored(reportId);
      const fallback = WORKBOOKS[reportId] || WORKBOOKS.r10;
      return normalizeWorkbook(stored && stored.workbook, fallback);
    },
    getSavedMeta: function (reportId) {
      const stored = readStored(reportId);
      return stored ? { version: Number(stored.version) || 1, savedAt: stored.savedAt || '' } : null;
    },
    save: function (reportId, workbook, version) {
      const payload = {
        workbook: normalizeWorkbook(workbook, WORKBOOKS[reportId] || WORKBOOKS.r10),
        version: Number(version) || 1,
        savedAt: new Date().toLocaleString('zh-CN', { hour12: false })
      };
      try {
        localStorage.setItem(STORAGE_PREFIX + reportId, JSON.stringify(payload));
      } catch (e) {}
      return payload;
    },
    cloneTo: function (sourceId, targetId) {
      if (!this.has(sourceId)) return;
      const meta = this.getSavedMeta(sourceId);
      this.save(targetId, this.get(sourceId), meta ? meta.version : 1);
    }
  };
})();
