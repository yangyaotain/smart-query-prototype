(function (global) {
  "use strict";

  const STORE_KEY = "smart-query-skill-catalog-v1";
  const PROCUREMENT_SAMPLE_VERSION = "monthly-procurement-v3";

  const PROCUREMENT_USER_PROMPT = `请生成一份【报告月份】【采购主体范围】的月度采购快报。

重点分析成交与节资表现、采购方式与品类结构、供应商情况、采购效能和闲废处置业务，并给出有数据依据的风险判断和改进建议。`;

  const PROCUREMENT_EXECUTION_PROMPT = `# 角色

你是一名采购经营分析助手，负责根据授权数据生成月度采购快报。

# 执行优先级

1. 数据权限和安全边界。
2. 用户最终编辑的任务要求。
3. 内容提示词。
4. 文档格式提示词。

# 数据处理规则

- 只读取当前用户有权限访问的数据，不展示或推断越权信息。
- 校验报告月份、表格期间和数据统计口径是否一致。
- 校验金额、比例、数量的单位和数量级。
- 不编造缺失数据；信息不足时明确标记“数据暂缺”。
- 发现异常时保留原始值，并标记“待核验”，不得自行猜测修正。
- 用户删除或改写默认任务后，仍保持当前技能选中，并以用户最终表达为准。`;

  const PROCUREMENT_CONTENT_PROMPT = `# 任务目标与生成边界

根据用户最终选择的报告月份、采购主体范围和授权采购数据，生成《华润建材科技月度采购快报》。严格沿用上传模板的封面、章节顺序、指标组合、分析逻辑、表格字段和图表类型；报告日期、统计期间、组织名称、排名、金额、数量、占比、环比、同比、年度累计、风险等级和建议必须根据本次数据重新计算。

模板中的“17,689.63 万元”“西南大区 5,805.34 万元”等数值仅用于说明内容结构和表达方式，不得作为固定结果。不能只替换数字：主体排名、合计占比、增长或下降判断、风险结论和建议必须随数据同步更新。

# 独立封面

- 主标题固定为“华润建材科技月度采购快报”，位于封面上部并居中。
- 页面下部依次展示“报告日期：\${报告日期}”和“数据来源：华润守正采购交易平台”。
- 封面作为独立页面，不在标题与日期之间重复报告月份；正文从下一页开始。

# 1. 月报摘要

以核心指标仪表盘呈现本月与年度累计采购表现，先给指标，再进入结构分析。

## 1.1. 成交统计

- 使用指标卡，一行两张、左右分布。
- 第一行展示“本月成交金额”和“本月成交项目数”。金额单位统一为万元；两个指标分别展示本月值、环比和同比。
- 第一行指标下方合并说明本月境内金额占比、境外金额占比、招标金额占比和非招金额占比。例如模板中的“境内 99.05%、境外 0.95%；招标 3.85%、非招 96.15%”仅为结构示例。
- 第二行展示“本年度累计成交金额”和“本年度累计成交项目数”，同时展示同比。
- 第二行指标下方说明年度累计口径的境内/境外、招标/非招金额占比。
- 环比、同比缺少可比期间时显示“数据暂缺”，不得使用 0 代替缺失值。

## 1.2. 预算节资统计

- 使用两列指标卡展示本月节资金额、本月节资率、本年度累计节资金额和本年度累计节资率。
- 本月指标展示环比和同比，年度累计指标展示同比；金额单位为万元，节资率保留百分比口径。
- 校验节资金额、预算金额、成交金额和节资率之间的计算关系，异常值标记“待核验”。

## 1.3. 采购三率统计

- 同一行展示公开采购率、集中采购率、电子采购率三张指标卡。
- 三率采用本年度截至报告月份的累计口径，分别展示实际值、目标值、距目标差距、环比和同比。
- 目标值默认按模板采用 95%；达标状态直接写“已达标”，未达标时写明差距，比例变化统一使用百分点 pp。
- 发现负值、超过合理范围或口径异常时保留原值并标记“待核验”，不得自行修正。

## 1.4. 闲废处置统计

- 使用两列指标卡，依次展示本月成交金额、本月成交项目数、本月溢价金额、本月溢价率，以及对应的年度累计指标。
- 本月指标展示环比和同比，年度累计指标展示同比；同时展示起拍价、处置笔数等必要辅助指标。
- 对金额数量级和溢价率进行专项校验，出现模板示例中的超高溢价率时必须说明口径并标记是否需要核验。
- 仪表盘末尾注明：本月数据为当月快照，三率为年度累计值；环比为上期对比，同比为去年同期对比。

# 2. 本月采购主体分布

- 按成交金额对事业大区/事业部降序排名，正文写明前三名主体、各自成交金额与占比，并计算前三名合计占比。
- 识别环比增长幅度最大的主体和下降最明显的主体；主体名称、金额、占比和变化方向必须根据当期数据动态生成。
- 必须增加事业部采购需求维度分析，判断变化是否来自集中采购计划推进、一次性大额项目、采购品类变化、采购方式调整或需求集中释放。数据无法证明原因时使用“建议进一步确认”，不得将推测写成事实。
- 配置“采购主体金额分布”横向条形图：Y 轴为事业大区/事业部，X 轴为成交金额，按金额降序排列，沿用模板蓝色主题，显示单位、数据标签和图题。
- 参考模板表达方式生成概括段，但不能固定沿用“西南大区、华南大区、结构建材事业部”等示例排名。

## 本月核心发现及优化建议

- 从成交增长、三率达标、供应商风险、闲废处置和采购时效中提炼 3 至 5 项最重要发现。
- 每项严格按“结论标题—数据锚点—风险等级—关注建议”四段组织。
- 数据锚点至少包含期间、指标值、对比值和涉及主体；风险等级使用 low、medium、high。
- 关注建议必须对应数据问题并可执行，避免只复述指标。涉及事业部增长时，必须建议结合实际采购需求核实集中采购计划或一次性项目影响。

# 3. 采购方式及品类分析

先说明采购方式选择对采购效率、竞争充分性和合规性的影响，再按采购方式、品类和供应商逐层展开。

## 3.1. 采购方式分析

- 汇总招标与非招成交金额、金额占比和项目数，说明当前采购方式结构及需要关注的合规问题。
- 3.1.1 招标方式细分：按公开招标等方式展示项目数、金额、金额占比、环比和同比，并生成统计表。
- 3.1.2 非招方式细分：至少覆盖询比采购、谈判采购、单源直接采购，展示项目数、金额、占比、环比和同比，并生成统计表。
- 3.1.3 事业大区与采购方式分析：按事业大区拆分公开招标、询比、谈判、单源直接采购金额，识别各主体的主导采购方式和异常集中情况；使用横向分组或堆叠条形图展示金额结构。

## 3.2. 采购品类分析

- 3.2.1 采购大类分析：展示货物、服务、工程的成交金额、占比和环比，使用环形图呈现金额结构。
- 3.2.2 当月品类成交 TOP10：按成交金额排名，展示金额、占比和必要的对比信息；使用横向条形图，正文概括 TOP3 与 TOP5 合计占比。
- 3.2.3 事业大区品类成交 TOP3：逐个事业大区展示 TOP1、TOP2、TOP3 品类及金额占比，并生成“事业大区 TOP3 品类成交占比”明细表；正文提炼主要品类结构差异。
- 3.2.4 品类成交及采购方式分析：分析 TOP10 品类分别采用招标、询比、谈判、单源等方式的占比，使用横向堆叠条形图识别采购方式过度集中的品类。

## 3.3. 供应商分析

- 3.3.1 供应商数量与投标分析：展示单项目平均投标供应商家次、本月值、上月值、环比、去年同月和同比，并判断竞争充分性。
- 3.3.2 黑名单供应商：展示本月新增黑名单数量、平台拦截次数及环比同比，结合新增原因和拦截情况给出风险提示。
- 3.3.3 成交金额 TOP10 供应商：展示排名、供应商、成交金额、当月占比、中标项目数、涉及品类和涉及事业群，并分析供应商集中度。
- 缺少供应商名称等必要字段时，保留章节和表头，明确说明无法生成排名的字段原因，不编造供应商。

# 4. 采购效能分析

## 4.1. 采购“三率”指标分析

- 4.1.1 三率月度走势：按月份展示公开采购率、集中采购率、电子采购率及 95% 目标线，使用折线图；说明最新月份变化、年度累计结果和目标差距。
- 4.1.2 事业群采购三率：按事业大区/事业部展示三率，使用分级着色表或热力表突出达标、接近目标和异常值，并分析主体差异。

## 4.2. 节资率分析

- 4.2.1 按采购大类节资率：分别展示货物、服务、工程的节资金额和节资率，使用柱线组合图比较金额与比率。
- 4.2.2 按事业群节资率：展示各事业群节资金额和节资率，使用横向条形图，识别节资金额最高、节资率最高和最低的主体。

## 4.3. 采购时效分析

- 先说明采购周期统计起止点和适用项目范围。
- “当月采购时效总览”展示项目数、平均周期、集团均值、中位数、上月平均、环比、去年同期和同比，并形成统计表。
- “周期过长项目清单”以当月采购周期 P95 为阈值，列出项目名称、事业群、采购方式、周期、超期程度和成交金额；正文概括超期数量、主要集中主体、采购方式和最长周期。
- 超期程度统一为 P95～P99 一般超期、P99～P99.9 严重超期、超过 P99.9 极端超期。

## 4.4. 采购成功率分析

- 展示本月项目采购成功率、环比、上月值和月度趋势，判断是否稳定达标。
- 分析关闭项目数、异常关闭项目数和主要原因。
- 生成异常关闭原因表，字段包括关闭原因、项目数、占比、涉及金额、主要品类和主要事业群；无异常关闭时明确显示“本月无异常关闭项目”。

# 5. 闲废处置业务

## 5.1. 月度概况

- 展示处置成交笔数、起拍价、成交金额、溢价金额和溢价率的本月值、环比、年度累计和同比，并生成月度概况表。
- 说明处置方式、交易形式、竞价效果和数据统计层级；汇总层与明细层口径不一致时必须提示。

## 5.2. 典型案例

- 按成交金额或溢价表现筛选 2 至 5 个典型案例，说明处置标的、起拍价、成交金额、溢价率和业务价值。
- 案例必须来自本期数据，不得固定沿用模板中的废旧蓄电池、废旧钢铁等示例。

# 数据与表达规则

- 报告期间使用用户最终指定的 \${报告月份}；分析范围使用 \${采购主体范围}，只读取当前用户有权限访问的数据。
- 金额默认使用万元并统一千分位；数量注明个、项、笔或家；占比使用 %；比率差异使用 pp。
- 环比、同比和年度累计必须使用一致的统计期间、组织范围和指标口径。
- 排名、合计占比、TOPN、增长下降、风险等级和建议必须基于本次结果重新计算，正文、表格、图表必须相互一致。
- 关键结论必须有数据依据；无法验证的原因使用审慎表达，不将相关性写成因果关系。
- 缺少数据时显示“数据暂缺”，缺少关键字段时说明原因并保留章节，不编造数据、排名、主体或案例。
- 正文重点解释结构变化、异常问题和管理影响，不机械重复表格中已经清晰呈现的全部数值。`;

  const PROCUREMENT_FORMAT_PROMPT = `# 适用优先级

- 本提示词采用《Word 输出格式规范》作为全局默认要求。
- 如果当前上传模板、本次项目要求或用户明确要求与本规范冲突，以当前明确要求优先。
- 优先复用上传模板已有的主题、表格和图表样式，不随意改变业务含义。

# 一、页面与整体原则

- 页面使用 A4 纵向，尺寸为 21.0 cm × 29.7 cm。
- 页边距：上、下 2.54 cm，左、右 3.17 cm。
- 页眉距边界 1.50 cm，页脚距边界 1.75 cm。
- 中文字体默认使用宋体；西文和数字沿用文档主题字体。
- 标题和正文默认使用黑色，不额外添加颜色、边框、横线、阴影或装饰。
- 使用真实 Word 样式、段落属性、分页符和分节符，不用手工空格、伪标题、假编号、连续空行或偶然换行模拟版式。

# 二、封面与首页

- 封面作为独立首节和独立页面，末尾使用“分节符（下一页）”进入正文。
- 主标题位于页面上部并水平居中，默认宋体 28 pt、加粗。
- 标题与下方信息区之间保留稳定留白。
- 页面下部居中显示“报告日期：YYYY 年 M 月 D 日”和“数据来源：……”两行，默认宋体 12 pt、常规字重。
- 不在标题和报告日期之间重复显示报告月份。
- 封面不显示页眉、页脚和页码。

# 三、正文

- 正文使用 Normal 样式，宋体 12 pt、两端对齐。
- 首行缩进 24 pt，1.5 倍行距，段前 0 pt、段后 0 pt。
- 每个逻辑段落使用真实段落标记，不使用手动换行符串联多个逻辑段落。
- “数据锚点”“关注建议”等内容拆成独立段落后应用正文格式。
- 正文默认不加粗、不斜体、不加下划线，仅对必要关键词或数值进行克制强调。

# 四、标题

- 所有标题使用真实 Word Heading 1–9 样式，不使用正文加粗模拟标题。
- Heading 1：22 pt、加粗、段前 18 pt、段后 8 pt、1.2 倍行距。
- Heading 2：16 pt、加粗、段前 14 pt、段后 6 pt、1.2 倍行距。
- Heading 3：16 pt、加粗、段前 12 pt、段后 5 pt、1.2 倍行距。
- Heading 4–5：14 pt、加粗、段前 10 pt、段后 4 pt、1.2 倍行距。
- Heading 6–8：12 pt、加粗、段前 8 pt、段后 3 pt、1.2 倍行距。
- Heading 9：10.5 pt、加粗、段前 8 pt、段后 3 pt、1.2 倍行距。
- 标题启用“与下段同页”和“段中不分页”，大纲级别与 Heading 层级一致。

# 五、表格

- 表格单元格内所有段落显式设置首行缩进 0，左、右缩进默认为 0，不继承正文的 24 pt 首行缩进。
- 数字、日期、状态和短文本水平居中；长文本按内容左对齐；单元格内容垂直居中。
- 行高允许自动扩展，不使用可能截断文字的固定行高。
- 跨页表格重复显示表头，避免表头单独出现在页尾；表格与题注尽量保持在一起。
- 优先沿用上传模板的蓝色表头和商务表格主题。
- 无数据时显示“数据暂缺”，不保留完全空白的表格。

# 六、图片、图表与题注

- 图片和图表水平居中，宽度不超过正文版心，保持原始纵横比。
- 图表字体、颜色和线条沿用上传模板主题，保证中文正常和打印清晰。
- 图题、表题使用真实 Caption 样式，默认黑体 10 pt、居中、1.5 倍行距，段前和段后约 8 pt。
- 图、表编号使用可更新的 Word SEQ 域并保持连续。
- 图表与题注尽量保持同页，避免题注孤立、对象越界或异常大空白。

# 七、分页与稳定性

- 避免标题单独留在页尾、表头孤悬、图片与题注分离。
- 长表自然跨页并重复表头；普通段落按内容自然分页。
- 封面、正文、不同方向页面或特殊版式之间使用正确的分页符或分节符。

# 八、输出检查

- 检查内容准确、中文正常、样式层级清晰，表格和图片不重叠、不溢出。
- 检查页面尺寸和页边距、封面独立性、正文缩进、标题样式、表格零缩进、图表题注、字段编号和分页。
- Word 文件生成后执行可读取检查；涉及版式时逐页渲染检查，确认无缺字、错位、裁切和异常空白。
- 不修改原始模板文件，输出为独立的新版本文件。`;

  const DEFAULT_SKILLS = [
    {
      id: "skill-monthly", kind: "monthly", name: "月度采购快报", code: "report_monthly",
      desc: "基于采购业务数据生成成交、节资、采购结构、供应商、采购效能和闲废处置月度快报。", category: "经营报告",
      themes: ["成交与节资", "采购方式与品类", "供应商管理", "采购效能与闲废"],
      userPrompt: PROCUREMENT_USER_PROMPT,
      executionPrompt: PROCUREMENT_EXECUTION_PROMPT,
      reportContentPrompt: PROCUREMENT_CONTENT_PROMPT,
      reportFormatPrompt: PROCUREMENT_FORMAT_PROMPT,
      reportPrompt: PROCUREMENT_CONTENT_PROMPT,
      reportTemplate: {
        name: "华润建材科技月度采购快报_格式调整版.docx",
        type: "DOCX",
        size: "576 KB",
        source: "uploaded",
        status: "completed",
        pages: 21,
        previewUrl: "../../assets/docs/monthly-procurement-report.pdf",
        pageImageBase: "../../assets/docs/monthly-procurement-pages/page-",
        downloadUrl: "../../assets/docs/monthly-procurement-report.docx",
        generatedContentPrompt: PROCUREMENT_CONTENT_PROMPT,
        generatedFormatPrompt: PROCUREMENT_FORMAT_PROMPT
      },
      sampleVersion: PROCUREMENT_SAMPLE_VERSION,
      enabled: true, sort: 10, updated: "2026-07-17"
    },
    {
      id: "skill-quarterly", kind: "quarterly", name: "季度经营复盘", code: "report_quarterly",
      desc: "复盘季度目标完成、结构变化、重点问题及下一季度改进动作。", category: "经营报告",
      themes: ["销售分析", "客户分析"],
      userPrompt: "请生成一份关于【报告季度】【分析范围】的季度经营复盘报告，重点分析目标完成、结构变化和问题归因，并给出下一季度改进建议。",
      executionPrompt: "你是一名季度经营复盘助手。请理解用户最终修改后的任务要求，在授权数据范围内统一季度累计、同比和环比口径，识别增长来源、目标差距及关键问题，并形成可执行的下一季度行动建议。不得编造数据，无法验证的判断需标明依据不足。",
      reportPrompt: "默认生成季度经营复盘报告，重点呈现季度结论、目标完成情况、经营结构变化、问题归因和下一季度行动。以结论和证据为主，章节可根据用户最终要求自由增删调整。",
      reportTemplate: { name: "季度经营复盘默认模板.docx", type: "DOCX", size: "92 KB", source: "system" },
      enabled: true, sort: 20, updated: "2026-07-17"
    },
    {
      id: "skill-annual", kind: "annual", name: "年度经营总结", code: "report_annual",
      desc: "总结年度目标、增长结构、重点成果、经营问题与下一年度规划。", category: "经营报告",
      themes: ["销售分析", "客户分析", "库存分析"],
      userPrompt: "请生成一份关于【报告年度】【分析范围】的年度经营总结，重点呈现目标完成、增长结构、重点成果和核心问题，并提出下一年度经营规划。",
      executionPrompt: "你是一名年度经营总结助手。请以用户最终编辑内容为任务依据，在授权范围内统一全年指标和组织口径，分析年度趋势、增长结构、成果与问题，并提出下一年度规划。所有结论必须能够由数据支撑，信息不足时清晰说明。",
      reportPrompt: "默认生成年度经营总结报告，优先包含年度摘要、目标完成、区域渠道产品结构、年度成果、关键问题和下一年度规划。允许用户通过自然语言重新指定篇幅、重点与章节，不要求完全遵循默认结构。",
      reportTemplate: { name: "年度经营总结默认模板.docx", type: "DOCX", size: "104 KB", source: "system" },
      enabled: true, sort: 30, updated: "2026-07-17"
    },
    {
      id: "skill-campaign", kind: "campaign", name: "营销活动复盘", code: "analysis_campaign",
      desc: "分析活动目标、转化漏斗、ROI、客群和商品表现并形成优化建议。", category: "专项分析",
      themes: ["活动分析", "销售分析", "客户分析"],
      userPrompt: "请对【活动名称】【活动周期】进行复盘，重点分析活动目标、转化漏斗、渠道与客群贡献、投入产出和低效环节，并给出优化建议。",
      executionPrompt: "你是一名营销活动复盘助手。请以用户最终编辑的活动要求为准，在授权数据范围内统一触达、转化、成交、成本和ROI口径，拆解渠道、人群、商品表现，定位目标差距并给出优化建议。不得将相关性直接表述为因果关系。",
      reportPrompt: "默认生成营销活动复盘报告，重点呈现活动结论、目标完成、转化漏斗、渠道人群商品贡献、问题诊断和优化建议。用户可自由修改分析重点和报告结构。",
      reportTemplate: { name: "营销活动复盘默认模板.docx", type: "DOCX", size: "78 KB", source: "system" },
      enabled: true, sort: 40, updated: "2026-07-17"
    }
  ];

  const LEGACY_DEFAULT_USER_PROMPTS = {
    report_monthly: "请生成一份2026年6月全公司经营分析报告，结合销售和客户数据，分析目标完成情况、同比环比、区域与渠道贡献、主要风险，并提出下月重点行动。",
    report_quarterly: "请复盘2026年第二季度全公司的经营情况，结合销售和客户数据分析季度目标完成、同比环比、区域渠道贡献、重点问题及下一季度改进动作。",
    report_annual: "请总结2026年度全公司的经营表现，结合销售、客户和库存数据，呈现年度目标完成、增长结构、重点成果、核心问题以及下一年度经营规划。",
    analysis_campaign: "请对618年中促销活动进行复盘，结合活动周期内的触达、转化、成交、ROI、客群和商品数据，分析目标完成情况、低效环节与优化建议。"
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function withoutTestStatus(config) {
    if (!config) return null;
    const {
      testStatus: _testStatus,
      lastTestAt: _lastTestAt,
      lastTestVersion: _lastTestVersion,
      ...rest
    } = config;
    return rest;
  }

  function combineReportPrompts(contentPrompt, formatPrompt) {
    return `# 内容提示词\n\n${contentPrompt}\n\n# 文档格式提示词\n\n${formatPrompt}`;
  }

  function legacyUserPrompt(item) {
    const defaults = DEFAULT_SKILLS.find((skill) => skill.code === item.code);
    if (defaults) return defaults.userPrompt;
    return `请使用“${item.name || "当前技能"}”完成分析。你可以继续修改这段内容，补充分析范围、时间、重点和输出要求。`;
  }

  function legacyExecutionPrompt(item) {
    if (Array.isArray(item.steps) && item.steps.length) {
      return `请以用户最终编辑的自然语言要求为准，在授权数据范围内完成任务。默认处理要求：${item.steps.join("；")}。不得编造数据，用户的最新补充优先于默认要求。`;
    }
    return "请以用户最终编辑的自然语言要求为准，在用户有权限访问的数据范围内完成分析。校验指标口径，所有结论需有数据依据，信息不足时明确说明。";
  }

  function legacyReportPrompt(item) {
    if (Array.isArray(item.sections) && item.sections.length) {
      return `默认可参考以下内容组织报告：${item.sections.join("、")}。这是建议结构，不是固定格式；如果用户明确调整重点或章节，应按用户最终要求生成。`;
    }
    return "根据用户最终要求生成清晰、可读的分析报告。默认突出核心结论、数据证据、风险问题和行动建议，允许用户自由调整结构与篇幅。";
  }

  function normalizeUserPrompt(source, matchedDefault) {
    const prompt = String(source.userPrompt || "").trim();
    if (matchedDefault && prompt === LEGACY_DEFAULT_USER_PROMPTS[source.code]) {
      return matchedDefault.userPrompt;
    }
    return prompt || matchedDefault?.userPrompt || legacyUserPrompt(source);
  }

  function normalizeSkill(item, index) {
    const source = item || {};
    const {
      params: _legacyParams,
      steps: _legacySteps,
      sections: _legacySections,
      testStatus: _testStatus,
      lastTestAt: _lastTestAt,
      lastTestVersion: _lastTestVersion,
      ...base
    } = source;
    const matchedDefault = DEFAULT_SKILLS.find((skill) => skill.code === source.code);
    const reportContentPrompt = source.reportContentPrompt || source.reportPrompt || matchedDefault?.reportPrompt || legacyReportPrompt(source);
    const reportFormatPrompt = source.reportFormatPrompt || matchedDefault?.reportFormatPrompt || PROCUREMENT_FORMAT_PROMPT;
    const enabled = source.enabled !== false;
    const generatedSource = source.reportTemplate?.source === "uploaded" ? "template" : "system";
    return {
      ...base,
      id: source.id || `skill-${Date.now()}-${index || 0}`,
      kind: source.kind || matchedDefault?.kind || "monthly",
      name: source.name || "未命名技能",
      code: source.code || `custom_skill_${Date.now()}_${index || 0}`,
      desc: source.desc || "",
      category: source.category || matchedDefault?.category || "经营报告",
      themes: Array.isArray(source.themes) && source.themes.length ? source.themes : ["销售分析"],
      userPrompt: normalizeUserPrompt(source, matchedDefault),
      executionPrompt: source.executionPrompt || matchedDefault?.executionPrompt || legacyExecutionPrompt(source),
      reportContentPrompt,
      reportFormatPrompt,
      reportPrompt: combineReportPrompts(reportContentPrompt, reportFormatPrompt),
      reportTemplate: source.reportTemplate === undefined ? (matchedDefault?.reportTemplate || null) : source.reportTemplate,
      configSources: {
        basic: generatedSource,
        runtime: generatedSource,
        content: generatedSource,
        format: generatedSource,
        ...(source.configSources || {})
      },
      workflowStatus: source.workflowStatus || (enabled ? "published" : "draft"),
      draftConfig: withoutTestStatus(source.draftConfig),
      enabled,
      sort: Number(source.sort) || (index + 1) * 10,
      updated: source.updated || "2026-07-17"
    };
  }

  function isManagedProcurementTemplate(template) {
    const marker = `${template?.name || ""} ${template?.previewUrl || ""} ${template?.downloadUrl || ""}`;
    return /华润建材科技.*月度采购快报|monthly-procurement/i.test(marker);
  }

  function refreshProcurementTemplate(template) {
    if (!template || !isManagedProcurementTemplate(template)) return template;
    const next = clone(template);
    next.generatedContentPrompt = PROCUREMENT_CONTENT_PROMPT;
    next.generatedPrompt = combineReportPrompts(
      PROCUREMENT_CONTENT_PROMPT,
      next.generatedFormatPrompt || PROCUREMENT_FORMAT_PROMPT
    );
    return next;
  }

  function migrateMonthlySample(skill, index) {
    const next = clone(skill || DEFAULT_SKILLS[0]);
    const managedTemplate = isManagedProcurementTemplate(next.reportTemplate);
    const contentIsManual = next.configSources?.content === "manual";

    if (managedTemplate) {
      next.reportTemplate = refreshProcurementTemplate(next.reportTemplate);
      if (!contentIsManual) next.reportContentPrompt = PROCUREMENT_CONTENT_PROMPT;
    }

    if (next.draftConfig) {
      const draft = clone(next.draftConfig);
      const managedDraftTemplate = isManagedProcurementTemplate(draft.reportTemplate);
      const draftContentIsManual = draft.configSources?.content === "manual";
      if (managedDraftTemplate) {
        draft.reportTemplate = refreshProcurementTemplate(draft.reportTemplate);
        if (!draftContentIsManual) draft.reportContentPrompt = PROCUREMENT_CONTENT_PROMPT;
        draft.reportPrompt = combineReportPrompts(
          draft.reportContentPrompt || PROCUREMENT_CONTENT_PROMPT,
          draft.reportFormatPrompt || PROCUREMENT_FORMAT_PROMPT
        );
      }
      next.draftConfig = draft;
    }

    next.sampleVersion = PROCUREMENT_SAMPLE_VERSION;
    return normalizeSkill(next, index);
  }

  function save(skills) {
    const next = (Array.isArray(skills) ? skills : []).map((skill, index) => {
      if (skill?.id === "skill-monthly" && skill.sampleVersion !== PROCUREMENT_SAMPLE_VERSION) {
        return migrateMonthlySample(skill, index);
      }
      return normalizeSkill(skill, index);
    });
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch (error) {
      // 静态原型允许存储不可用，页面仍使用当前内存数据。
    }
    return next;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return save(parsed);
      }
    } catch (error) {
      // 存储异常时回退至默认目录。
    }
    return save(clone(DEFAULT_SKILLS));
  }

  function createBlank(sort) {
    return normalizeSkill({
      id: "", kind: "monthly", name: "", code: "", desc: "", category: "经营报告",
      themes: ["销售分析"],
      userPrompt: "请生成一份关于【报告月份】【分析范围】的经营分析报告，重点说明经营表现、主要问题和后续建议。",
      executionPrompt: "请以用户最终编辑的自然语言要求为准，在用户有权限访问的数据范围内完成分析。先识别任务目标和数据范围，再校验指标口径、形成结论并给出建议。不得编造数据，信息不足时应明确说明。",
      reportContentPrompt: "根据用户最终要求生成清晰、可读的分析报告。默认突出核心结论、数据证据、风险问题和行动建议，允许用户自由调整报告内容和章节。",
      reportFormatPrompt: PROCUREMENT_FORMAT_PROMPT,
      reportTemplate: null,
      configSources: { basic: "system", runtime: "system", content: "system", format: "system" },
      workflowStatus: "draft",
      enabled: true, sort: sort || 10, updated: "2026-07-17"
    }, 0);
  }

  global.SkillCatalogStore = {
    key: STORE_KEY,
    load,
    save,
    clone,
    createBlank,
    normalizeSkill,
    procurementContentPrompt: PROCUREMENT_CONTENT_PROMPT
  };
})(window);
