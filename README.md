# 智能问数产品高保真静态原型

本目录用于维护智能问数产品原型。后续按“端 / 菜单 / 页面”逐步扩展，避免所有内容堆在单个 `index.html` 中。

## 目录结构

```text
smart-query-prototype/
├── index.html                    # 原型入口与页面导航
├── assets/
│   ├── css/
│   │   ├── theme.css             # 全局变量、按钮、通用组件
│   │   ├── login.css             # 登录页样式
│   │   ├── business.css          # PC 业务端通用样式
│   │   ├── admin.css             # PC 管理后台通用样式
│   │   └── mobile.css            # 移动端通用样式
│   └── js/
│       ├── common.js             # 通用交互
│       ├── login.js              # 登录页交互
│       └── smart-query.js        # 智能问数页交互
└── pages/
    ├── business/
    │   ├── login.html            # PC 业务端登录页
    │   ├── smart-query.html      # PC 业务端智能问数页
    │   ├── dashboard.html        # 我的仪表盘
    │   ├── board.html            # 我的看板
    │   ├── board-edit.html       # 看板编辑
    │   ├── report.html           # 我的报告
    │   └── report-edit.html      # 报告编辑
    ├── admin/                    # PC 管理后台页面
    └── mobile/                   # 移动端 APP 页面
```

## 当前已完成

- PC 业务端登录页
- PC 业务端智能问数页
- PC 业务端我的仪表盘
- PC 业务端我的看板与看板编辑
- PC 业务端我的报告与报告编辑
- PC 管理后台 7 个菜单页面 + 10 个详情/编辑子页面
- 移动端登录页 + APP 四个 Tab 页面

## 后续扩展顺序

第一版全量页面已完成，后续进入逐页细节优化。
