# 智能问数产品高保真静态原型

本目录用于维护智能问数产品原型。当前原型包含 PC 业务端和 PC 管理后台，页面、菜单与可演示交互保持一致。

## 目录结构

```text
smart-query-prototype/
├── index.html                    # 原型入口，跳转到业务端登录页
├── assets/
│   ├── css/
│   │   ├── theme.css             # 全局变量、按钮、通用组件
│   │   ├── login.css             # 登录页样式
│   │   ├── business.css          # PC 业务端通用样式
│   │   └── admin.css             # PC 管理后台通用样式
│   └── js/
│       ├── common.js             # 通用交互
│       ├── login.js              # 登录页交互
│       ├── smart-query.js        # 智能问数页交互
│       └── ...                   # 各管理模块页面脚本
└── pages/
    ├── business/
    │   ├── login.html            # PC 业务端登录页
    │   ├── forgot-password.html  # 找回密码
    │   ├── smart-query.html      # PC 业务端智能问数页
    │   ├── query-export.html     # 问数结果导出
    │   ├── dashboard.html        # 我的仪表盘
    │   ├── board.html            # 我的看板
    │   ├── board-edit.html       # 看板编辑
    │   ├── report.html           # 我的报告
    │   └── report-edit.html      # 报告编辑
    └── admin/                    # 数据、知识库、运营和系统管理页面
```

## 当前已完成

- PC 业务端登录页
- PC 业务端智能问数页
- PC 业务端我的仪表盘
- PC 业务端我的看板与看板编辑
- PC 业务端我的报告与报告编辑
- PC 管理后台数据源、数据模型、分析主题管理
- PC 管理后台指标体系、示例库、行业知识、技能管理、自定义指令
- PC 管理后台反馈管理、指标沉淀、用户管理、角色管理、系统配置

## 后续扩展顺序

当前页面均从正式入口、公共菜单或页面内交互可达。后续新增或废弃功能时，同步维护入口、页面文件和本说明，避免文档描述与原型不一致。
