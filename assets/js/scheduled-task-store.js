(function (global) {
  "use strict";

  const STORE_KEY = "smart-query-scheduled-runtime-v2";
  const HANDOFF_KEY = "smart-query-scheduled-handoff-v2";
  const CHAT_KEY = "smart-query-scheduled-chats-v1";
  const LEGACY_KEYS = ["smart-query-scheduled-tasks-v1", "smart-query-scheduled-tasks-seeded-20260914-v2", "smart-query-scheduled-records-seeded-20260914-v1", "smart-query-scheduled-conversation"];
  let memory = null;
  let handoff = null;
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function pad(value) { return String(value).padStart(2, "0"); }
  function dateKey(date) { return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()); }
  function dateTimeText(date) { return dateKey(date) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes()); }

  function seedTasks() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);
    const common = { interval: 1, customUnit: "day", onceDate: "", weekDays: [1], monthDay: 1, records: [] };
    return [
      Object.assign({}, common, { id: "task-sales-daily", name: "华东区每日销售简报", theme: "销售分析", skillId: "", skill: "", prompt: "分析华东区昨日销售额、订单量和客单价，与前一日对比，说明波动明显的城市及主要原因。", frequency: "daily", time: "09:00", status: "enabled", nextRun: dateTimeText(tomorrow), createdAt: "2026-09-01 10:18", records: [{ id: "run-sales-1", trigger: "定时执行", status: "success", plannedAt: dateKey(now) + " 09:00", startedAt: dateKey(now) + " 09:00", endedAt: dateKey(now) + " 09:01", duration: "1分08秒", summary: "华东区昨日销售额较前一日增长 6.2%，杭州和苏州贡献了主要增量。", conversationId: "conversation-sales-1" }] }),
      Object.assign({}, common, { id: "task-weekday-customer", name: "重点客户流失风险监测", theme: "客户分析", skillId: "", skill: "", prompt: "每次运行时识别最近一个工作日采购频次或金额明显下降的重点客户，分析流失风险并给出跟进优先级。", frequency: "weekdays", time: "08:30", status: "enabled", nextRun: dateTimeText(tomorrow), createdAt: "2026-08-22 14:36", records: [{ id: "run-customer-1", trigger: "定时执行", status: "failed", plannedAt: "2026-09-14 08:30", startedAt: "2026-09-14 08:30", endedAt: "2026-09-14 08:31", duration: "42秒", error: "客户活跃度指标数据源连接超时，请确认数据源恢复后重新执行。" }] }),
      Object.assign({}, common, { id: "task-monthly-report", name: "月度供应商绩效报告", theme: "供应商管理", skillId: "skill-supplier-monthly", skill: "供应商绩效月报", prompt: "生成上月全公司的供应商绩效报告，分析供应商参与、履约、异常及采购贡献情况，并给出重点跟进建议。", frequency: "monthly", monthDay: 3, time: "09:00", status: "enabled", nextRun: "2026-10-03 09:00", createdAt: "2026-07-03 11:20", records: [{ id: "run-monthly-1", trigger: "定时执行", status: "success", plannedAt: "2026-09-03 09:00", startedAt: "2026-09-03 09:00", endedAt: "2026-09-03 09:04", duration: "4分16秒", summary: "8 月重点供应商履约率为 96.8%，3 家供应商存在连续延期交付。", conversationId: "conversation-monthly-1" }] }),
      Object.assign({}, common, { id: "task-inventory", name: "库存周转异常监测", theme: "库存分析", skillId: "", skill: "", prompt: "检查最近30天库存周转异常商品，按库存金额排序，说明异常原因和建议处理动作。", frequency: "hourly", interval: 6, time: "09:00", status: "paused", nextRun: "", createdAt: "2026-08-01 16:42" }),
      Object.assign({}, common, { id: "task-campaign-ended", name: "中秋促销活动复盘", theme: "销售分析", skillId: "", skill: "", prompt: "复盘中秋促销活动的销售增长、渠道贡献、商品表现和投入产出，形成专项分析结论。", frequency: "once", onceDate: "2026-09-12", time: "10:00", status: "ended", nextRun: "", createdAt: "2026-09-10 09:12", records: [{ id: "run-campaign-1", trigger: "定时执行", status: "success", plannedAt: "2026-09-12 10:00", startedAt: "2026-09-12 10:00", endedAt: "2026-09-12 10:03", duration: "3分21秒", summary: "活动期销售额同比增长 18.6%，直营网点礼盒组合贡献最大。", conversationId: "conversation-campaign-1" }] })
    ];
  }

  function normalizeTask(task) {
    const normalized = Object.assign({ theme: "销售分析", skillId: "", skill: "", prompt: "", frequency: "daily", time: "09:00", interval: 1, customUnit: "day", onceDate: "", weekDays: [1], monthDay: 1, status: "enabled", nextRun: "", records: [] }, task);
    if (!normalized.skill && normalized.type === "skill") normalized.skill = "供应商绩效月报";
    return normalized;
  }

  function supplementalSalesRecords() {
    const now = new Date();
    const examples = [
      [1, "定时执行", "success", "58秒", "华东区销售额保持增长，南京和杭州订单量贡献较高。"],
      [2, "试运行", "success", "36秒", "试运行完成，核心指标口径和区域范围匹配正常。"],
      [3, "定时执行", "success", "1分02秒", "华东区客单价小幅回升，直营网点增长较明显。"],
      [4, "定时执行", "failed", "24秒", "销售订单明细数据源连接超时，请稍后重试。"],
      [5, "定时执行", "success", "55秒", "区域销售整体平稳，苏州订单量较前一日增长 4.8%。"],
      [6, "试运行", "success", "31秒", "任务指令验证完成，已生成区域销售趋势和异常说明。"],
      [7, "定时执行", "success", "1分11秒", "华东区销售额环比增长 3.6%，主要来自重点客户补货。"],
      [8, "定时执行", "success", "49秒", "销售额与订单量同步增长，客单价保持稳定。"],
      [9, "定时执行", "failed", "19秒", "客户区域映射数据暂未完成更新，本次任务执行失败。"],
      [10, "定时执行", "success", "57秒", "华东区域销售表现正常，未发现需要升级处理的异常。"],
      [11, "试运行", "success", "34秒", "试运行完成，分析主题、指标范围和任务指令均已正确应用。"]
    ];
    return examples.map(function (item, index) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - item[0]);
      const startedAt = dateKey(date) + " 09:00";
      return {
        id: "run-sales-history-" + (index + 1),
        trigger: item[1],
        status: item[2],
        plannedAt: startedAt,
        startedAt: startedAt,
        endedAt: dateKey(date) + " 09:01",
        duration: item[3],
        summary: item[2] === "success" ? item[4] : "",
        error: item[2] === "failed" ? item[4] : "",
        conversationId: item[2] === "success" ? "conversation-sales-history-" + (index + 1) : ""
      };
    });
  }


  function taskSnapshot(task) {
    const { records, configChanges, ...configuration } = task;
    return clone(configuration);
  }

  function normalizeRecords(task) {
    task.records = (task.records || []).map(function (record) {
      return Object.assign({}, record, {
        conversationId: record.conversationId || "conversation-" + task.id + "-" + record.id,
        taskSnapshot: record.taskSnapshot || taskSnapshot(task)
      });
    });
    return task;
  }

  function defaults() {
    const tasks = seedTasks();
    tasks[0].records = tasks[0].records.concat(supplementalSalesRecords());
    tasks.map(normalizeRecords);
    const sales = tasks[0];
    const before = taskSnapshot(sales);
    sales.frequency = "weekdays";
    sales.time = "08:30";
    sales.prompt = "分析华东区和华南区昨日销售额、订单量和客单价，与前一日及去年同期对比，说明波动明显的城市及主要原因。";
    const next = new Date();
    next.setHours(8, 30, 0, 0);
    if (next <= new Date()) next.setDate(next.getDate() + 1);
    while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1);
    sales.nextRun = dateTimeText(next);
    sales.configChanges = [{ id: "sales-config-change-1", conversationId: "conversation-sales-config", source: "智能问数", createdAt: dateKey(new Date()) + " 09:22", before: before, after: taskSnapshot(sales) }];
    tasks[1].records[0].plannedAt = dateKey(new Date()) + " 08:30";
    tasks[1].records[0].startedAt = dateKey(new Date()) + " 08:30";
    tasks[1].records[0].endedAt = dateKey(new Date()) + " 08:31";
    return tasks;
  }

  function save(tasks) {
    memory = clone(tasks.map(normalizeTask).map(normalizeRecords));
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(memory)); } catch (error) {}
  }

  function load() {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
      if (Array.isArray(stored)) memory = stored;
    } catch (error) {}
    return clone(memory);
  }

  function send(payload) {
    handoff = clone(payload);
    try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff)); } catch (error) {}
  }

  function take() {
    let payload = handoff;
    try {
      payload = JSON.parse(sessionStorage.getItem(HANDOFF_KEY) || "null") || payload;
      sessionStorage.removeItem(HANDOFF_KEY);
    } catch (error) {}
    handoff = null;
    return payload;
  }

  let conversations = {};
  function loadConversations() {
    try { conversations = JSON.parse(sessionStorage.getItem(CHAT_KEY) || "{}"); } catch (error) {}
    return clone(conversations);
  }
  function saveConversation(id, conversation) {
    loadConversations();
    conversations[id] = clone(conversation);
    try { sessionStorage.setItem(CHAT_KEY, JSON.stringify(conversations)); } catch (error) {}
  }

  // Only an actual reload resets this module; navigation and back/forward retain its temporary data.
  const navigation = global.performance?.getEntriesByType?.("navigation")?.[0];
  const reloaded = navigation ? navigation.type === "reload" : global.performance?.navigation?.type === 1;
  try {
    LEGACY_KEYS.forEach(function (key) { localStorage.removeItem(key); });
    if (reloaded) {
      sessionStorage.removeItem(STORE_KEY);
      sessionStorage.removeItem(HANDOFF_KEY);
      sessionStorage.removeItem(CHAT_KEY);
    }
    memory = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
  } catch (error) {}
  if (!Array.isArray(memory)) memory = defaults();
  save(memory);
  global.ScheduledTaskStore = { load: load, save: save, taskSnapshot: taskSnapshot, send: send, take: take, loadConversations: loadConversations, saveConversation: saveConversation };
})(window);
