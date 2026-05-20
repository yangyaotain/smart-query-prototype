function showToast(text) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast hidden";
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.remove("hidden");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.add("hidden"), 1800);
}

function goTo(path) {
  window.location.href = path;
}

/* ============================================================
 * 用户下拉菜单 + 个人信息修改 / 密码修改 弹窗（全局公共能力）
 * - 适用所有引入了 common.js 且 topbar 中含 .user-trigger 的页面
 * - 自动接管旧版 .user-trigger 的 click 行为（如 onclick="goTo('profile.html')"）
 * - 自动注入 user-menu DOM、个人信息弹窗、密码修改弹窗
 * ============================================================ */
(function setupUserMenuModule() {
  const ARROW_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  const USER_PROFILE_KEY = "smart-query-user-profile";
  const DEFAULT_PROFILE = {
    avatar: "张",
    name: "张三",
    account: "zhangsan",
    role: "业务分析师",
    dept: "销售运营部",
    email: "zhangsan@company.com",
    phone: "138 0000 1234",
    signature: ""
  };

  function loadProfile() {
    try {
      const raw = localStorage.getItem(USER_PROFILE_KEY);
      if (!raw) return Object.assign({}, DEFAULT_PROFILE);
      return Object.assign({}, DEFAULT_PROFILE, JSON.parse(raw));
    } catch (e) {
      return Object.assign({}, DEFAULT_PROFILE);
    }
  }

  function saveProfile(profile) {
    try {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {}
  }

  function escapeHTML(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[c]));
  }

  function escapeAttr(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildUserMenuHTML(profile) {
    return [
      '<div class="user-menu-head">',
      '<div class="avatar">' + escapeHTML(profile.avatar) + "</div>",
      "<div>",
      "<strong>" + escapeHTML(profile.name) + "</strong>",
      "<span>" + escapeHTML(profile.dept) + "</span>",
      "</div>",
      "</div>",
      '<div class="user-menu-row"><span>账号</span><strong>' +
        escapeHTML(profile.account) +
        "</strong></div>",
      '<div class="user-menu-row"><span>角色</span><strong>' +
        escapeHTML(profile.role) +
        "</strong></div>",
      '<div class="user-menu-divider"></div>',
      '<button type="button" class="user-menu-item" onclick="openUserProfileModal()">',
      '<span class="um-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg></span>',
      "用户信息修改",
      "</button>",
      '<button type="button" class="user-menu-item" onclick="openUserPasswordModal()">',
      '<span class="um-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="11" width="15" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/></svg></span>',
      "密码修改",
      "</button>",
      '<div class="user-menu-divider"></div>',
      '<button type="button" class="user-menu-action" onclick="logoutFromUserMenu()">',
      '<span class="um-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg></span>',
      "退出登录",
      "</button>"
    ].join("");
  }

  function ensureUserMenuDOM(trigger) {
    const topActions = trigger.parentElement;
    if (!topActions) return null;
    const computed = getComputedStyle(topActions);
    if (computed.position === "static") {
      topActions.style.position = "relative";
    }
    let menu = document.getElementById("userMenu");
    if (!menu) {
      menu = document.createElement("div");
      menu.id = "userMenu";
      menu.className = "user-menu hidden";
      topActions.appendChild(menu);
    } else if (!topActions.contains(menu)) {
      topActions.appendChild(menu);
    }
    return menu;
  }

  function refreshUserMenuContent() {
    const menu = document.getElementById("userMenu");
    if (!menu) return;
    const profile = loadProfile();
    menu.innerHTML = buildUserMenuHTML(profile);
    const trigger = document.querySelector(".user-trigger");
    if (trigger) {
      const avatar = trigger.querySelector(".avatar");
      const nameEl = trigger.querySelector("strong");
      if (avatar) avatar.textContent = profile.avatar;
      if (nameEl) nameEl.textContent = profile.name;
    }
  }

  function fixDropdownArrow(trigger) {
    let arrow = trigger.querySelector(".dropdown-arrow");
    if (!arrow) {
      arrow = document.createElement("span");
      arrow.className = "dropdown-arrow";
      trigger.appendChild(arrow);
    }
    if (!arrow.querySelector("svg")) {
      arrow.innerHTML = ARROW_SVG;
    }
  }

  function bindTriggerClick(trigger) {
    trigger.removeAttribute("onclick");
    trigger.addEventListener("click", function (event) {
      event.stopPropagation();
      window.toggleUserMenu(event);
    });
  }

  function ensureModals() {
    if (document.getElementById("userModalRoot")) return;
    const root = document.createElement("div");
    root.id = "userModalRoot";
    root.innerHTML = [
      '<div id="userModalMask" class="modal-mask hidden" onclick="closeAllUserModals()"></div>',
      '<div id="userProfileModal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="upmTitle">',
      '<div class="modal-head">',
      '<div><h3 id="upmTitle">用户信息修改</h3><p>更新个人资料后将同步到顶部展示。</p></div>',
      '<button type="button" class="close" onclick="closeAllUserModals()" aria-label="关闭">×</button>',
      "</div>",
      '<div class="modal-body">',
      '<div class="form-grid">',
      '<div class="field"><label>姓名</label><input id="upmName" type="text" placeholder="请输入姓名" /></div>',
      '<div class="field"><label>账号</label><input id="upmAccount" type="text" disabled /></div>',
      '<div class="field"><label>所属部门</label><input id="upmDept" type="text" placeholder="如：销售运营部" /></div>',
      '<div class="field"><label>角色</label><input id="upmRole" type="text" placeholder="如：业务分析师" /></div>',
      '<div class="field"><label>邮箱</label><input id="upmEmail" type="email" placeholder="name@company.com" /></div>',
      '<div class="field"><label>手机号</label><input id="upmPhone" type="text" placeholder="138 0000 0000" /></div>',
      '<div class="field full"><label>个人简介</label><textarea id="upmSignature" rows="3" placeholder="一句话介绍自己（可选）"></textarea></div>',
      "</div>",
      "</div>",
      '<div class="modal-foot">',
      '<button type="button" class="ghost-btn" onclick="closeAllUserModals()">取消</button>',
      '<button type="button" class="primary-btn" onclick="saveUserProfile()">保存</button>',
      "</div>",
      "</div>",
      '<div id="userPasswordModal" class="modal small hidden" role="dialog" aria-modal="true" aria-labelledby="upwTitle">',
      '<div class="modal-head">',
      '<div><h3 id="upwTitle">密码修改</h3><p>为了账户安全，新密码需至少 8 位且包含字母与数字。</p></div>',
      '<button type="button" class="close" onclick="closeAllUserModals()" aria-label="关闭">×</button>',
      "</div>",
      '<div class="modal-body">',
      '<div class="form-grid" style="grid-template-columns:1fr;">',
      '<div class="field full"><label>当前密码</label><input id="upwOld" type="password" placeholder="请输入当前密码" autocomplete="current-password" /></div>',
      '<div class="field full"><label>新密码</label><input id="upwNew" type="password" placeholder="至少 8 位，含字母 + 数字" autocomplete="new-password" /></div>',
      '<div class="field full"><label>确认新密码</label><input id="upwConfirm" type="password" placeholder="再次输入新密码" autocomplete="new-password" /></div>',
      '<div id="upwHint" class="upm-hint" style="font-size:12.5px;color:#6b7280;line-height:1.6;">建议使用大小写字母 + 数字 + 符号的组合，避免使用与账号相关的弱口令。</div>',
      "</div>",
      "</div>",
      '<div class="modal-foot">',
      '<button type="button" class="ghost-btn" onclick="closeAllUserModals()">取消</button>',
      '<button type="button" class="primary-btn" onclick="changeUserPassword()">确认修改</button>',
      "</div>",
      "</div>"
    ].join("");
    document.body.appendChild(root);
  }

  function openModal(modalId) {
    ensureModals();
    closeUserMenu();
    const mask = document.getElementById("userModalMask");
    const modal = document.getElementById(modalId);
    if (!mask || !modal) return;
    mask.classList.remove("hidden");
    modal.classList.remove("hidden");
  }

  window.toggleUserMenu = function (event) {
    if (event && typeof event.stopPropagation === "function") event.stopPropagation();
    const menu = document.getElementById("userMenu");
    const trigger = document.querySelector(".user-trigger");
    if (!menu || !trigger) return;
    const willOpen = menu.classList.contains("hidden");
    if (willOpen) refreshUserMenuContent();
    menu.classList.toggle("hidden");
    trigger.classList.toggle("is-open", !menu.classList.contains("hidden"));
    if (willOpen) {
      try {
        document.dispatchEvent(new CustomEvent("user-menu-open"));
      } catch (e) {}
    }
  };

  window.closeUserMenu = function () {
    const menu = document.getElementById("userMenu");
    const trigger = document.querySelector(".user-trigger");
    if (menu) menu.classList.add("hidden");
    if (trigger) trigger.classList.remove("is-open");
  };

  window.openUserProfileModal = function () {
    ensureModals();
    const profile = loadProfile();
    const $ = (id) => document.getElementById(id);
    if ($("upmName")) $("upmName").value = profile.name || "";
    if ($("upmAccount")) $("upmAccount").value = profile.account || "";
    if ($("upmDept")) $("upmDept").value = profile.dept || "";
    if ($("upmRole")) $("upmRole").value = profile.role || "";
    if ($("upmEmail")) $("upmEmail").value = profile.email || "";
    if ($("upmPhone")) $("upmPhone").value = profile.phone || "";
    if ($("upmSignature")) $("upmSignature").value = profile.signature || "";
    openModal("userProfileModal");
  };

  window.openUserPasswordModal = function () {
    ensureModals();
    ["upwOld", "upwNew", "upwConfirm"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    openModal("userPasswordModal");
  };

  window.closeAllUserModals = function () {
    const mask = document.getElementById("userModalMask");
    const profileModal = document.getElementById("userProfileModal");
    const passwordModal = document.getElementById("userPasswordModal");
    if (mask) mask.classList.add("hidden");
    if (profileModal) profileModal.classList.add("hidden");
    if (passwordModal) passwordModal.classList.add("hidden");
  };

  window.saveUserProfile = function () {
    const $ = (id) => document.getElementById(id);
    const name = ($("upmName") && $("upmName").value.trim()) || "";
    const dept = ($("upmDept") && $("upmDept").value.trim()) || "";
    const role = ($("upmRole") && $("upmRole").value.trim()) || "";
    const email = ($("upmEmail") && $("upmEmail").value.trim()) || "";
    const phone = ($("upmPhone") && $("upmPhone").value.trim()) || "";
    const signature = ($("upmSignature") && $("upmSignature").value.trim()) || "";
    if (!name) {
      showToast("请填写姓名");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast("邮箱格式不正确");
      return;
    }
    const next = Object.assign(loadProfile(), {
      name,
      dept,
      role,
      email,
      phone,
      signature,
      avatar: name.slice(0, 1) || "我"
    });
    saveProfile(next);
    refreshUserMenuContent();
    closeAllUserModals();
    showToast("用户信息已更新");
  };

  window.logoutFromUserMenu = function () {
    const path = (window.location && window.location.pathname) || "";
    if (/\/pages\/admin\//.test(path)) {
      goTo("../business/login.html");
    } else {
      goTo("login.html");
    }
  };

  window.changeUserPassword = function () {
    const $ = (id) => document.getElementById(id);
    const oldPwd = ($("upwOld") && $("upwOld").value) || "";
    const newPwd = ($("upwNew") && $("upwNew").value) || "";
    const confirmPwd = ($("upwConfirm") && $("upwConfirm").value) || "";
    if (!oldPwd) {
      showToast("请输入当前密码");
      return;
    }
    if (newPwd.length < 8) {
      showToast("新密码长度至少 8 位");
      return;
    }
    if (!/[A-Za-z]/.test(newPwd) || !/\d/.test(newPwd)) {
      showToast("新密码需包含字母与数字");
      return;
    }
    if (newPwd === oldPwd) {
      showToast("新密码不能与当前密码相同");
      return;
    }
    if (newPwd !== confirmPwd) {
      showToast("两次输入的新密码不一致");
      return;
    }
    closeAllUserModals();
    showToast("密码修改成功，下次登录请使用新密码");
  };

  function init() {
    const trigger = document.querySelector(".user-trigger");
    if (trigger) {
      fixDropdownArrow(trigger);
      bindTriggerClick(trigger);
      ensureUserMenuDOM(trigger);
      refreshUserMenuContent();
      ensureModals();

      document.addEventListener("click", function (event) {
        const t = event.target;
        if (!t.closest(".user-trigger") && !t.closest("#userMenu")) {
          closeUserMenu();
        }
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          closeUserMenu();
          closeAllUserModals();
        }
      });
    }

    setupAdminSidebar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ===========================================================
 * 管理后台 - 一级 + 二级 折叠菜单注入（自动接管 .admin-menu）
 * =========================================================== */
(function exposeAdminSidebar() {
  const ADMIN_MENU = [
    {
      key: "data",
      title: "数据管理",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5V12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5.5"/><path d="M5 12v6.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V12"/></svg>',
      children: [
        { name: "数据源", href: "data-source.html", match: ["data-source", "data-source-edit", "data-source-preview", "data-source-preview-refresh", "data-source-tables", "data-source-ops"] },
        { name: "数据模型", href: "data-model.html", match: ["data-model", "data-model-topology"] },
        { name: "分析主题", href: "theme.html", match: ["theme", "theme-edit"] }
      ]
    },
    {
      key: "knowledge",
      title: "知识库管理",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h11v16H6a2 2 0 0 0-2 2V5z"/><path d="M17 3l3 1.6V21l-3-1.6"/><path d="M8 8h6"/><path d="M8 12h6"/></svg>',
      children: [
        { name: "指标体系", href: "knowledge-indicator.html", match: ["knowledge.html", "knowledge-indicator", "knowledge-indicator-create"] },
        { name: "示例库", href: "knowledge-example.html", match: ["knowledge-example"] },
        { name: "行业知识", href: "knowledge-faq.html", match: ["knowledge-faq"] },
        { name: "自定义指令", href: "knowledge-instructions.html", match: ["knowledge-instructions"] }
      ]
    },
    {
      key: "operation",
      title: "运营管理",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v17a1 1 0 0 0 1 1h17"/><path d="M7 15l4-4 3 3 5-6"/><path d="M16 8h3v3"/></svg>',
      children: [
        { name: "反馈管理", href: "operation-feedback.html", match: ["operation.html", "operation-feedback"] },
        { name: "指标沉淀", href: "operation-indicator.html", match: ["operation-indicator"] }
      ]
    },
    {
      key: "system",
      title: "系统管理",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="18" cy="6" r="1.5"/></svg>',
      children: [
        { name: "用户管理", href: "users.html", match: ["users", "user-edit", "user-disable"] },
        { name: "角色管理", href: "roles.html", match: ["roles", "role-edit"] },
        { name: "系统配置", href: "system-config.html", match: ["system-config"] }
      ]
    }
  ];

  const CHEVRON_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  function getCurrentAdminFile() {
    const path = (window.location && window.location.pathname) || "";
    if (!/\/pages\/admin\//.test(path)) return null;
    const file = (path.split("/").pop() || "").toLowerCase();
    return file.replace(/\.html$/i, "");
  }

  function escapeHTMLLocal(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[c]));
  }

  function findActive(currentFile) {
    if (!currentFile) return { groupKey: null, childHref: null };
    for (const g of ADMIN_MENU) {
      for (const c of g.children) {
        const matchKeys = (c.match || []).map((m) => m.toLowerCase().replace(/\.html$/i, ""));
        if (matchKeys.includes(currentFile)) {
          return { groupKey: g.key, childHref: c.href };
        }
      }
    }
    return { groupKey: null, childHref: null };
  }

  function renderAdminMenu(nav, currentFile) {
    const { groupKey, childHref } = findActive(currentFile);
    nav.classList.add("admin-menu-tree");
    nav.innerHTML = ADMIN_MENU.map((g) => {
      const isActiveGroup = g.key === groupKey;
      const childrenHTML = g.children
        .map((c) => {
          const cls = c.href === childHref ? "adm-item active" : "adm-item";
          return (
            '<a class="' +
            cls +
            '" href="' +
            escapeHTMLLocal(c.href) +
            '">' +
            escapeHTMLLocal(c.name) +
            "</a>"
          );
        })
        .join("");
      return [
        '<div class="adm-group',
        isActiveGroup ? " is-open is-active" : "",
        '" data-key="',
        escapeHTMLLocal(g.key),
        '">',
        '<button type="button" class="adm-group-head">',
        '<span class="adm-group-ico">' + g.icon + "</span>",
        '<span class="adm-group-title">' + escapeHTMLLocal(g.title) + "</span>",
        '<span class="adm-chevron">' + CHEVRON_SVG + "</span>",
        "</button>",
        '<div class="adm-children">',
        childrenHTML,
        "</div>",
        "</div>"
      ].join("");
    }).join("");
  }

  function bindToggle(nav) {
    nav.addEventListener("click", function (event) {
      const head = event.target.closest(".adm-group-head");
      if (!head) return;
      const group = head.parentElement;
      if (!group) return;
      group.classList.toggle("is-open");
    });
  }

  window.setupAdminSidebar = function setupAdminSidebar() {
    const sidebar = document.querySelector(".admin-sidebar");
    if (!sidebar) return;
    const nav = sidebar.querySelector(".admin-menu");
    if (!nav) return;
    const currentFile = getCurrentAdminFile();
    renderAdminMenu(nav, currentFile);
    bindToggle(nav);
  };
})();

