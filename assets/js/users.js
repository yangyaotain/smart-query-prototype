(function () {
  "use strict";

  const roles = ["业务分析师", "运营管理员", "系统管理员"];
  const pageSizes = [5, 10, 20];

  const orgTree = [
    {
      id: "all",
      name: "全部组织",
      children: [
        {
          id: "dept.data",
          name: "数据中心",
          children: [
            { id: "dept.data.model", name: "模型管理部" },
            { id: "dept.data.ops", name: "数据运营部" }
          ]
        },
        {
          id: "dept.sales",
          name: "销售中心",
          children: [
            { id: "dept.sales.east", name: "华东销售部" },
            { id: "dept.sales.south", name: "华南销售部" },
            { id: "dept.sales.north", name: "华北销售部" }
          ]
        },
        {
          id: "dept.ops",
          name: "运营中心",
          children: [
            { id: "dept.ops.feedback", name: "反馈运营部" },
            { id: "dept.ops.metric", name: "指标运营部" }
          ]
        },
        {
          id: "dept.it",
          name: "信息中心",
          children: [
            { id: "dept.it.system", name: "系统管理部" }
          ]
        }
      ]
    }
  ];

  let users = [
    user("u001", "zhangsan", "张三", "dept.sales.east", "华东销售部", "normal", "业务分析师", "13800000001", "zhangsan@example.com", "负责华东销售经营分析"),
    user("u002", "lisi", "李四", "dept.data.ops", "数据运营部", "normal", ["运营管理员", "业务分析师"], "13800000002", "lisi@example.com", "负责问数运营和反馈处理"),
    user("u003", "wangwu", "王五", "dept.it.system", "系统管理部", "normal", ["系统管理员", "运营管理员"], "13800000003", "wangwu@example.com", "负责系统权限和基础配置"),
    user("u004", "zhaoliu", "赵六", "dept.sales.south", "华南销售部", "disabled", "业务分析师", "13800000004", "zhaoliu@example.com", "账号临时停用"),
    user("u005", "sunqi", "孙七", "dept.ops.feedback", "反馈运营部", "normal", "运营管理员", "13800000005", "sunqi@example.com", "负责反馈分派和处理跟踪"),
    user("u006", "zhouba", "周八", "dept.ops.metric", "指标运营部", "disabled", "运营管理员", "13800000006", "zhouba@example.com", "负责指标沉淀审核"),
    user("u007", "wujiumei", "吴九妹", "dept.data.model", "模型管理部", "normal", "运营管理员", "13800000007", "wujiu@example.com", "负责数据模型维护"),
    user("u008", "chenyi", "陈一", "dept.sales.north", "华北销售部", "normal", "业务分析师", "13800000008", "chenyi@example.com", "负责华北销售专题分析")
  ];

  const state = {
    activeOrgId: "all",
    collapsed: new Set(["dept.sales", "dept.ops"]),
    orgKeyword: "",
    filters: {
      status: "",
      account: "",
      name: "",
      role: ""
    },
    page: 1,
    pageSize: 5,
    selected: new Set(),
    drawer: {
      mode: null,
      id: null,
      draft: null
    },
    confirm: null,
    ctxOrgId: null
  };

  function user(id, account, name, deptId, dept, status, role, phone, email, remark) {
    return { id, account, name, deptId, dept, status, role, phone, email, remark };
  }

  function roleList(item) {
    const value = item && item.role;
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  }

  function roleText(item) {
    const list = roleList(item);
    return list.length ? list.join("、") : "-";
  }

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
      }[char];
    });
  }

  function escapeAttr(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function toast(text) {
    if (typeof window.showToast === "function") {
      window.showToast(text);
    } else {
      console.log(text);
    }
  }

  function chevronHTML() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  }

  function flattenOrgs(nodes, result) {
    (nodes || []).forEach(function (node) {
      result.push(node);
      flattenOrgs(node.children, result);
    });
    return result;
  }

  function leafOrgs() {
    return flattenOrgs(orgTree, []).filter(function (node) {
      return node.id !== "all";
    });
  }

  function findOrg(id, nodes) {
    const source = arguments.length < 2 ? orgTree : nodes;
    let found = null;
    (source || []).some(function (node) {
      if (node.id === id) {
        found = node;
        return true;
      }
      found = findOrg(id, node.children);
      return Boolean(found);
    });
    return found;
  }

  function findOrgWithParent(id, nodes, parent) {
    const source = arguments.length < 2 ? orgTree : nodes;
    let found = null;
    (source || []).some(function (node) {
      if (node.id === id) {
        found = { org: node, parent: parent || null };
        return true;
      }
      found = findOrgWithParent(id, node.children, node);
      return Boolean(found);
    });
    return found;
  }

  function orgDescendantIds(id) {
    if (id === "all") return new Set(leafOrgs().map(function (node) { return node.id; }));
    const node = findOrg(id);
    if (!node) return new Set();
    return new Set(flattenOrgs([node], []).map(function (item) {
      return item.id;
    }));
  }

  function countUsersInOrg(orgId) {
    const ids = orgDescendantIds(orgId);
    return users.filter(function (item) {
      return ids.has(item.deptId);
    }).length;
  }

  function nodeMatchesKeyword(node, keyword) {
    if (!keyword) return true;
    if (node.name.toLowerCase().indexOf(keyword) >= 0) return true;
    return Boolean((node.children || []).some(function (child) {
      return nodeMatchesKeyword(child, keyword);
    }));
  }

  function renderTree() {
    const root = $("umOrgTree");
    if (!root) return;
    const keyword = state.orgKeyword.trim().toLowerCase();
    const html = orgTree.map(function (node) {
      return renderTreeNode(node, 0, keyword);
    }).join("");
    root.innerHTML = html || '<div class="um-empty">暂无匹配组织</div>';
  }

  function renderTreeOnly() {
    renderTree();
  }

  function renderTreeNode(node, level, keyword) {
    if (!nodeMatchesKeyword(node, keyword)) return "";
    const hasChildren = Boolean(node.children && node.children.length);
    const active = state.activeOrgId === node.id ? " is-active" : "";
    const collapsed = state.collapsed.has(node.id) && !keyword ? " is-collapsed" : "";
    const nodeType = level === 0 ? " is-root" : (hasChildren ? " has-children" : " is-leaf");
    const childrenHTML = hasChildren
      ? '<div class="um-tree-children">' + node.children.map(function (child) {
          return renderTreeNode(child, level + 1, keyword);
        }).join("") + "</div>"
      : "";

    return [
      '<div class="um-tree-group' + collapsed + '" data-org-group="' + escapeAttr(node.id) + '" data-org-level="' + level + '">',
      '<div class="um-tree-row' + active + nodeType + '" data-org-id="' + escapeAttr(node.id) + '" style="padding-left:' + (8 + level * 18) + 'px">',
      '<span class="chev" data-org-toggle="' + escapeAttr(node.id) + '">' + (hasChildren ? chevronHTML() : "") + "</span>",
      '<span class="um-tree-icon" aria-hidden="true"></span>',
      '<span class="um-tree-name" title="' + escapeAttr(node.name) + '">' + escapeHTML(node.name) + "</span>",
      '<span class="um-tree-count">' + countUsersInOrg(node.id) + "</span>",
      "</div>",
      childrenHTML,
      "</div>"
    ].join("");
  }

  function syncFiltersFromDom() {
    state.filters.status = $("umStatusFilter") ? $("umStatusFilter").value : "";
    state.filters.account = $("umAccountFilter") ? $("umAccountFilter").value.trim() : "";
    state.filters.name = $("umNameFilter") ? $("umNameFilter").value.trim() : "";
    state.filters.role = $("umRoleFilter") ? $("umRoleFilter").value : "";
  }

  function filteredUsers() {
    const orgIds = orgDescendantIds(state.activeOrgId);
    return users.filter(function (item) {
      if (!orgIds.has(item.deptId)) return false;
      if (state.filters.status && item.status !== state.filters.status) return false;
      if (state.filters.account && item.account.toLowerCase().indexOf(state.filters.account.toLowerCase()) < 0) return false;
      if (state.filters.name && item.name.indexOf(state.filters.name) < 0) return false;
      if (state.filters.role && roleList(item).indexOf(state.filters.role) < 0) return false;
      return true;
    });
  }

  function renderTable() {
    const tbody = $("umTbody");
    const pager = $("umPager");
    if (!tbody || !pager) return;

    const list = filteredUsers();
    const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;

    const start = (state.page - 1) * state.pageSize;
    const pageItems = list.slice(start, start + state.pageSize);
    const pageIds = new Set(pageItems.map(function (item) { return item.id; }));

    tbody.innerHTML = pageItems.length ? pageItems.map(renderUserRow).join("") : [
      '<tr><td class="um-empty" colspan="9">暂无用户数据</td></tr>'
    ].join("");

    const checkAll = $("umCheckAll");
    if (checkAll) {
      checkAll.checked = pageItems.length > 0 && pageItems.every(function (item) {
        return state.selected.has(item.id);
      });
      checkAll.indeterminate = pageItems.some(function (item) {
        return state.selected.has(item.id);
      }) && !checkAll.checked;
      checkAll.dataset.pageIds = Array.from(pageIds).join(",");
    }

    pager.innerHTML = renderPager(list.length, totalPages);
  }

  function renderUserRow(item) {
    const disabled = item.status === "disabled";
    const statusText = disabled ? "已禁用" : "正常";
    const statusClass = disabled ? "is-disabled" : "is-normal";
    const toggleAct = disabled ? "enable" : "disable";
    const toggleText = disabled ? "启用" : "禁用";
    return [
      "<tr>",
      '<td><input type="checkbox" data-user-check="' + escapeAttr(item.id) + '"' + (state.selected.has(item.id) ? " checked" : "") + " /></td>",
      '<td><span class="um-main-text um-user-account" title="' + escapeAttr(item.account) + '">' + escapeHTML(item.account) + "</span></td>",
      '<td><span class="um-main-text um-user-name" title="' + escapeAttr(item.name) + '">' + escapeHTML(item.name) + "</span></td>",
      '<td><span class="um-main-text" title="' + escapeAttr(item.dept) + '">' + escapeHTML(item.dept) + "</span></td>",
      '<td><span class="um-main-text um-user-contact" title="' + escapeAttr(item.phone || "-") + '">' + escapeHTML(item.phone || "-") + "</span></td>",
      '<td><span class="um-main-text um-user-contact" title="' + escapeAttr(item.email || "-") + '">' + escapeHTML(item.email || "-") + "</span></td>",
      '<td><span class="um-status ' + statusClass + '">' + statusText + "</span></td>",
      '<td><span class="um-role-list">' + roleList(item).map(function (role) {
        return '<span class="um-role-tag">' + escapeHTML(role) + "</span>";
      }).join("") + "</span></td>",
      '<td><div class="um-row-actions">',
      '<button type="button" class="um-link-btn" data-act="view" data-id="' + escapeAttr(item.id) + '">查看</button>',
      '<button type="button" class="um-link-btn" data-act="edit" data-id="' + escapeAttr(item.id) + '">编辑</button>',
      '<button type="button" class="um-link-btn" data-act="reset-password" data-id="' + escapeAttr(item.id) + '">重置密码</button>',
      '<button type="button" class="um-link-btn" data-act="' + toggleAct + '" data-id="' + escapeAttr(item.id) + '">' + toggleText + "</button>",
      '<button type="button" class="um-link-btn is-danger" data-act="delete" data-id="' + escapeAttr(item.id) + '">删除</button>',
      "</div></td>",
      "</tr>"
    ].join("");
  }

  function renderPager(total, totalPages) {
    const pages = [];
    for (let page = 1; page <= totalPages; page += 1) {
      pages.push('<button type="button" data-act="page" data-page="' + page + '"' + (page === state.page ? ' class="is-current"' : "") + ">" + page + "</button>");
    }
    const start = total ? (state.page - 1) * state.pageSize + 1 : 0;
    const end = Math.min(total, state.page * state.pageSize);
    return [
      '<div class="um-pg-info">共 ' + total + " 条，当前 " + start + "-" + end + " 条</div>",
      '<div class="um-pg-buttons">',
      '<select id="umPageSize">' + pageSizes.map(function (size) {
        return '<option value="' + size + '"' + (size === state.pageSize ? " selected" : "") + ">" + size + " 条/页</option>";
      }).join("") + "</select>",
      '<button type="button" data-act="prev-page"' + (state.page <= 1 ? " disabled" : "") + ">上一页</button>",
      pages.join(""),
      '<button type="button" data-act="next-page"' + (state.page >= totalPages ? " disabled" : "") + ">下一页</button>",
      "</div>"
    ].join("");
  }

  function setActiveOrg(id) {
    state.activeOrgId = id;
    state.page = 1;
    state.selected.clear();
    renderTree();
    renderTable();
  }

  function resetFilters() {
    state.filters = { status: "", account: "", name: "", role: "" };
    if ($("umStatusFilter")) $("umStatusFilter").value = "";
    if ($("umAccountFilter")) $("umAccountFilter").value = "";
    if ($("umNameFilter")) $("umNameFilter").value = "";
    if ($("umRoleFilter")) $("umRoleFilter").value = "";
    state.page = 1;
    state.selected.clear();
    renderTable();
  }

  function openDrawer(mode, id) {
    let draft;
    if (mode === "create") {
      const defaultDept = leafOrgs()[0];
      draft = user("u" + Date.now(), "", "", defaultDept.id, defaultDept.name, "normal", "业务分析师", "", "", "");
    } else {
      const item = users.find(function (row) { return row.id === id; });
      if (!item) return;
      draft = clone(item);
    }

    state.drawer = { mode, id: id || draft.id, draft };
    renderDrawer();
    $("umDrawerMask").classList.remove("hidden");
    $("umDrawer").classList.remove("hidden");
    $("umDrawer").setAttribute("aria-hidden", "false");
  }

  function closeDrawer() {
    state.drawer = { mode: null, id: null, draft: null };
    if ($("umDrawerMask")) $("umDrawerMask").classList.add("hidden");
    if ($("umDrawer")) {
      $("umDrawer").classList.add("hidden");
      $("umDrawer").setAttribute("aria-hidden", "true");
    }
  }

  function renderDrawer() {
    const title = $("umDrawerTitle");
    const subtitle = $("umDrawerSubtitle");
    const body = $("umDrawerBody");
    const foot = $("umDrawerFoot");
    if (!title || !subtitle || !body || !foot) return;

    const mode = state.drawer.mode;
    const draft = state.drawer.draft;
    const isView = mode === "view";
    const titleMap = { create: "新增用户", edit: "编辑用户", view: "用户详情" };
    const subtitleMap = {
      create: "创建用户账号并绑定组织、角色与状态。",
      edit: "维护用户基础信息、组织归属与角色配置。",
      view: "查看用户账号、组织归属、角色和启停状态。"
    };

    title.textContent = titleMap[mode] || "用户详情";
    subtitle.textContent = subtitleMap[mode] || "查看与维护用户信息。";
    body.innerHTML = isView ? renderUserView(draft) : renderUserForm(draft);
    foot.innerHTML = isView
      ? '<button type="button" class="ghost-btn" data-act="close-drawer">关闭</button>'
      : '<button type="button" class="ghost-btn" data-act="cancel">取消</button><button type="button" class="primary-btn" data-act="save-user">' + (mode === "create" ? "确定新增" : "保存修改") + "</button>";
  }

  function renderUserView(item) {
    return [
      '<div class="um-form-grid">',
      viewCard("账号", item.account),
      viewCard("姓名", item.name),
      viewCard("所属部门", item.dept),
      viewCard("账号状态", item.status === "disabled" ? "已禁用" : "正常"),
      viewCard("手机号", item.phone || "-"),
      viewCard("邮箱", item.email || "-"),
      viewCard("角色", roleText(item), true),
      viewCard("备注", item.remark || "-", true),
      "</div>"
    ].join("");
  }

  function viewCard(label, value, full) {
    return [
      '<div class="um-view-card' + (full ? " full" : "") + '">',
      "<label>" + escapeHTML(label) + "</label>",
      "<div>" + escapeHTML(value) + "</div>",
      "</div>"
    ].join("");
  }

  function renderUserForm(item) {
    return [
      '<div class="um-form-grid">',
      field("账号", '<input type="text" data-drawer-field="account" value="' + escapeAttr(item.account) + '" placeholder="请输入账号" />'),
      field("姓名", '<input type="text" data-drawer-field="name" value="' + escapeAttr(item.name) + '" placeholder="请输入姓名" />'),
      field("所属部门", renderDeptSelect(item.deptId)),
      field("账号状态", renderStatusSelect(item.status)),
      field("手机号", '<input type="text" data-drawer-field="phone" value="' + escapeAttr(item.phone) + '" placeholder="请输入手机号" />'),
      field("邮箱", '<input type="email" data-drawer-field="email" value="' + escapeAttr(item.email) + '" placeholder="请输入邮箱" />'),
      field("角色", renderRoleChecks(item), true),
      field("备注", '<textarea data-drawer-field="remark" rows="4" placeholder="请输入备注">' + escapeHTML(item.remark) + "</textarea>", true),
      "</div>"
    ].join("");
  }

  function field(label, control, full) {
    return '<div class="field' + (full ? " full" : "") + '"><label>' + escapeHTML(label) + "</label>" + control + "</div>";
  }

  function renderDeptSelect(selected) {
    return [
      '<select data-drawer-field="deptId">',
      leafOrgs().map(function (node) {
        return '<option value="' + escapeAttr(node.id) + '"' + (node.id === selected ? " selected" : "") + ">" + escapeHTML(node.name) + "</option>";
      }).join(""),
      "</select>"
    ].join("");
  }

  function renderStatusSelect(selected) {
    return [
      '<select data-drawer-field="status">',
      '<option value="normal"' + (selected === "normal" ? " selected" : "") + ">正常</option>",
      '<option value="disabled"' + (selected === "disabled" ? " selected" : "") + ">已禁用</option>",
      "</select>"
    ].join("");
  }

  function renderRoleChecks(item) {
    const selected = roleList(item);
    return [
      '<div class="um-role-checks">',
      roles.map(function (role) {
        return '<label><input type="checkbox" data-role-option value="' + escapeAttr(role) + '"' + (selected.indexOf(role) >= 0 ? " checked" : "") + " /><span>" + escapeHTML(role) + "</span></label>";
      }).join(""),
      "</div>"
    ].join("");
  }

  function saveUser() {
    const draft = state.drawer.draft;
    if (!draft) return;
    if (!draft.account.trim() || !draft.name.trim()) {
      toast("账号和姓名不能为空");
      return;
    }
    if (!roleList(draft).length) {
      toast("请至少选择一个角色");
      return;
    }
    const dup = users.some(function (item) {
      return item.id !== draft.id && item.account === draft.account.trim();
    });
    if (dup) {
      toast("账号已存在");
      return;
    }

    draft.account = draft.account.trim();
    draft.name = draft.name.trim();
    const dept = findOrg(draft.deptId);
    draft.dept = dept ? dept.name : draft.dept;

    if (state.drawer.mode === "create") {
      users.unshift(clone(draft));
      toast("已新增用户");
    } else {
      users = users.map(function (item) {
        return item.id === draft.id ? clone(draft) : item;
      });
      toast("已保存修改");
    }
    closeDrawer();
    renderTree();
    renderTable();
  }

  function addOrg(parentId) {
    const node = { id: uid("dept."), name: "新建组织" };
    if (parentId && parentId !== "all") {
      const found = findOrg(parentId);
      if (!found) return;
      found.children = found.children || [];
      found.children.push(node);
      state.collapsed.delete(found.id);
    } else {
      const root = findOrg("all");
      if (!root) return;
      root.children = root.children || [];
      root.children.push(Object.assign(node, { children: [] }));
    }
    state.activeOrgId = node.id;
    state.page = 1;
    state.selected.clear();
    renderTree();
    renderTable();
    startRenameOrg(node.id);
  }

  function startRenameOrg(id) {
    if (id === "all") return;
    const found = findOrg(id);
    const row = document.querySelector('.um-tree-row[data-org-id="' + id + '"]');
    if (!found || !row) return;
    const nameEl = row.querySelector(".um-tree-name");
    if (!nameEl) return;
    const oldName = found.name;
    nameEl.innerHTML = '<input class="um-tree-edit-input" value="' + escapeAttr(oldName) + '" />';
    const input = nameEl.querySelector("input");
    input.focus();
    input.select();

    let done = false;
    function finish(save) {
      if (done) return;
      done = true;
      const value = input.value.trim();
      if (save && value) {
        found.name = value;
        users = users.map(function (item) {
          return item.deptId === id ? Object.assign({}, item, { dept: value }) : item;
        });
      }
      renderTree();
      renderTable();
    }

    input.addEventListener("blur", function () { finish(true); });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") finish(true);
      if (event.key === "Escape") finish(false);
    });
    input.addEventListener("click", function (event) { event.stopPropagation(); });
    input.addEventListener("contextmenu", function (event) { event.stopPropagation(); });
  }

  function deleteOrg(id) {
    if (!id || id === "all") return;
    const found = findOrgWithParent(id);
    if (!found) return;
    const removedIds = flattenOrgs([found.org], []).map(function (node) { return node.id; });
    const fallback = leafOrgs().find(function (node) {
      return removedIds.indexOf(node.id) < 0;
    });

    if (found.parent) {
      found.parent.children = (found.parent.children || []).filter(function (node) {
        return node.id !== id;
      });
    } else {
      const root = findOrg("all");
      root.children = (root.children || []).filter(function (node) {
        return node.id !== id;
      });
    }

    if (fallback) {
      users = users.map(function (item) {
        return removedIds.indexOf(item.deptId) >= 0 ? Object.assign({}, item, { deptId: fallback.id, dept: fallback.name }) : item;
      });
    }

    if (removedIds.indexOf(state.activeOrgId) >= 0) state.activeOrgId = "all";
    removedIds.forEach(function (orgId) { state.collapsed.delete(orgId); });
    state.selected.clear();
    state.page = 1;
    renderTree();
    renderTable();
    toast("组织已删除");
  }

  function hideOrgMenu() {
    const menu = $("umOrgCtxMenu");
    if (menu) menu.classList.add("hidden");
    document.querySelectorAll(".um-tree-row.context-active").forEach(function (row) {
      row.classList.remove("context-active");
    });
    state.ctxOrgId = null;
  }

  function openConfirm(type, id) {
    const item = users.find(function (row) { return row.id === id; });
    const org = findOrg(id);
    const textMap = {
      "reset-password": item ? "确定将「" + item.name + "」的密码重置为初始密码吗？" : "",
      disable: item ? "确定禁用「" + item.name + "」吗？禁用后该用户将无法登录。" : "",
      enable: item ? "确定启用「" + item.name + "」吗？" : "",
      delete: item ? "确定删除「" + item.name + "」吗？删除后列表将不再展示该用户。" : "",
      "batch-delete": "确定删除已选择的 " + state.selected.size + " 个用户吗？",
      "org-delete": org ? "确定删除「" + org.name + "」吗？该组织及下级组织会从目录树移除，已有用户将移至其他组织。" : ""
    };
    if (type === "batch-delete" && state.selected.size === 0) {
      toast("请先选择用户");
      return;
    }
    if (!textMap[type]) return;
    state.confirm = { type, id };
    $("umConfirmTitle").textContent = "操作确认";
    $("umConfirmText").textContent = textMap[type];
    $("umConfirmModal").classList.remove("hidden");
  }

  function closeConfirm() {
    state.confirm = null;
    if ($("umConfirmModal")) $("umConfirmModal").classList.add("hidden");
  }

  function runConfirm() {
    if (!state.confirm) return;
    const type = state.confirm.type;
    const id = state.confirm.id;

    if (type === "reset-password") {
      toast("密码已重置为初始密码");
    } else if (type === "disable" || type === "enable") {
      users = users.map(function (item) {
        if (item.id !== id) return item;
        return Object.assign({}, item, { status: type === "disable" ? "disabled" : "normal" });
      });
      toast(type === "disable" ? "已禁用用户" : "已启用用户");
    } else if (type === "delete") {
      users = users.filter(function (item) { return item.id !== id; });
      state.selected.delete(id);
      toast("已删除用户");
    } else if (type === "batch-delete") {
      users = users.filter(function (item) { return !state.selected.has(item.id); });
      state.selected.clear();
      toast("已删除所选用户");
    } else if (type === "org-delete") {
      deleteOrg(id);
    }

    closeConfirm();
    if (type !== "org-delete") {
      renderTree();
      renderTable();
    }
  }

  function updateDrawerField(target) {
    const draft = state.drawer.draft;
    if (!draft) return;
    const fieldName = target.getAttribute("data-drawer-field");
    draft[fieldName] = target.value;
    if (fieldName === "deptId") {
      const dept = findOrg(target.value);
      draft.dept = dept ? dept.name : "";
    }
  }

  function updateDrawerRoles() {
    const draft = state.drawer.draft;
    const drawer = $("umDrawer");
    if (!draft || !drawer) return;
    draft.role = Array.from(drawer.querySelectorAll("[data-role-option]:checked")).map(function (input) {
      return input.value;
    });
  }

  function bindEvents() {
    document.addEventListener("click", function (event) {
      const orgMenuAction = event.target.closest("#umOrgCtxMenu [data-act]");
      if (orgMenuAction) {
        const act = orgMenuAction.getAttribute("data-act");
        const orgId = state.ctxOrgId;
        hideOrgMenu();
        if (act === "org-new") addOrg(orgId);
        else if (act === "org-rename") startRenameOrg(orgId);
        else if (act === "org-delete") openConfirm("org-delete", orgId);
        return;
      }

      if (!event.target.closest("#umOrgCtxMenu")) hideOrgMenu();

      const toggle = event.target.closest("[data-org-toggle]");
      if (toggle && toggle.getAttribute("data-org-toggle")) {
        const id = toggle.getAttribute("data-org-toggle");
        if (state.collapsed.has(id)) state.collapsed.delete(id);
        else state.collapsed.add(id);
        renderTree();
        return;
      }

      const orgRow = event.target.closest("[data-org-id]");
      if (orgRow) {
        setActiveOrg(orgRow.getAttribute("data-org-id"));
        return;
      }

      const action = event.target.closest("[data-act]");
      if (!action) return;
      const act = action.getAttribute("data-act");
      const id = action.getAttribute("data-id");

      if (act === "create") openDrawer("create");
      else if (act === "view") openDrawer("view", id);
      else if (act === "edit") openDrawer("edit", id);
      else if (act === "close-drawer" || act === "cancel") closeDrawer();
      else if (act === "save-user") saveUser();
      else if (act === "reset-password" || act === "disable" || act === "enable" || act === "delete") openConfirm(act, id);
      else if (act === "batch-delete") openConfirm("batch-delete");
      else if (act === "search") {
        syncFiltersFromDom();
        state.page = 1;
        state.selected.clear();
        renderTable();
      } else if (act === "reset-filter") {
        resetFilters();
      } else if (act === "import") {
        toast("导入功能已触发");
      } else if (act === "export") {
        toast("导出功能已触发");
      } else if (act === "prev-page" && state.page > 1) {
        state.page -= 1;
        renderTable();
      } else if (act === "next-page") {
        state.page += 1;
        renderTable();
      } else if (act === "page") {
        state.page = Number(action.getAttribute("data-page")) || 1;
        renderTable();
      }
    });

    document.addEventListener("input", function (event) {
      if (event.target.id === "umOrgSearch") {
        state.orgKeyword = event.target.value;
        renderTree();
        return;
      }
      if (event.target.matches("[data-drawer-field]")) {
        updateDrawerField(event.target);
      }
    });

    document.addEventListener("change", function (event) {
      const target = event.target;
      if (target.matches("[data-role-option]")) {
        updateDrawerRoles();
        return;
      }
      if (target.matches("[data-drawer-field]")) {
        updateDrawerField(target);
        return;
      }
      if (target.id === "umStatusFilter" || target.id === "umRoleFilter") {
        syncFiltersFromDom();
        state.page = 1;
        state.selected.clear();
        renderTable();
        return;
      }
      if (target.id === "umPageSize") {
        state.pageSize = Number(target.value) || 5;
        state.page = 1;
        renderTable();
        return;
      }
      if (target.id === "umCheckAll") {
        const ids = (target.dataset.pageIds || "").split(",").filter(Boolean);
        ids.forEach(function (id) {
          if (target.checked) state.selected.add(id);
          else state.selected.delete(id);
        });
        renderTable();
        return;
      }
      if (target.matches("[data-user-check]")) {
        const id = target.getAttribute("data-user-check");
        if (target.checked) state.selected.add(id);
        else state.selected.delete(id);
        renderTable();
      }
    });

    ["umConfirmCancel", "umConfirmClose"].forEach(function (id) {
      const el = $(id);
      if (el) el.addEventListener("click", closeConfirm);
    });
    if ($("umConfirmOk")) $("umConfirmOk").addEventListener("click", runConfirm);
    if ($("umDrawerMask")) $("umDrawerMask").addEventListener("click", closeDrawer);

    const tree = $("umOrgTree");
    if (tree) {
      tree.addEventListener("contextmenu", function (event) {
        const row = event.target.closest(".um-tree-row[data-org-id]");
        if (!row) return;
        event.preventDefault();
        hideOrgMenu();
        row.classList.add("context-active");
        state.ctxOrgId = row.getAttribute("data-org-id");
        const menu = $("umOrgCtxMenu");
        if (!menu) return;
        const isRoot = state.ctxOrgId === "all";
        const newLabel = $("umOrgNewLabel");
        if (newLabel) newLabel.textContent = isRoot ? "新增一级组织" : "新增子组织";
        menu.querySelectorAll('[data-act="org-rename"], [data-act="org-delete"], .um-ctx-sep').forEach(function (item) {
          item.classList.toggle("hidden", isRoot);
        });
        menu.style.left = Math.min(event.clientX, window.innerWidth - 170) + "px";
        menu.style.top = Math.min(event.clientY, window.innerHeight - 130) + "px";
        menu.classList.remove("hidden");
      });
    }

    window.addEventListener("resize", hideOrgMenu);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        hideOrgMenu();
        closeDrawer();
        closeConfirm();
      }
    });
  }

  function init() {
    renderTree();
    renderTable();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
