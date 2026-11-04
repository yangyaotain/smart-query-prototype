// 报告预览和 Word 编辑器使用相同的图表配置。
(function () {
  'use strict';

  window.buildReportChartOption = function(type, title) {
    const theme = window.getSmartQueryThemeColors();
    const COLOR = [theme.primary, '#36cfc9', '#ffa940', '#ff7875', '#9254de', '#52c41a', '#13c2c2', '#fadb14'];
    const baseTextStyle = { color: '#475569', fontSize: 11 };
    const baseGrid = { left: 50, right: 24, top: 30, bottom: 28 };
    const t = title || '';

    // —— 趋势 / 折线
    if (type === 'line') {
      // 不同 title 用不同 mock 数据
      let xAxis = ['1月', '2月', '3月', '4月', '5月', '6月'];
      let series = [{ name: '销售额', type: 'line', smooth: true, data: [2180, 2360, 2510, 2890, 3120, 3248], areaStyle: { opacity: 0.18 }, lineStyle: { width: 2.5 }, symbolSize: 7 }];
      if (/新品/.test(t)) {
        xAxis = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
        series = [
          { name: '智能 Pro', type: 'line', smooth: true, data: [120, 180, 260, 350, 420, 460, 510, 540], lineStyle: { width: 2 }, symbolSize: 6 },
          { name: '家居 X', type: 'line', smooth: true, data: [80, 130, 180, 220, 260, 280, 305, 330], lineStyle: { width: 2 }, symbolSize: 6 },
          { name: '办公 S', type: 'line', smooth: true, data: [60, 90, 130, 175, 220, 260, 300, 320], lineStyle: { width: 2 }, symbolSize: 6 }
        ];
      } else if (/月度|本月|核心|KPI/.test(t)) {
        xAxis = ['1月', '2月', '3月', '4月', '5月', '6月'];
        series = [
          { name: '销售额', type: 'line', smooth: true, data: [2180, 2360, 2510, 2890, 3120, 3248], lineStyle: { width: 2.5 }, symbolSize: 7 },
          { name: '订单量', type: 'line', smooth: true, data: [11200, 12100, 13200, 15360, 16800, 17260], yAxisIndex: 1, lineStyle: { width: 2 }, symbolSize: 6 }
        ];
      }
      const yAxisArr = series.length > 1 && series.some((s) => s.yAxisIndex === 1)
        ? [
            { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } }, axisLabel: baseTextStyle },
            { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: baseTextStyle }
          ]
        : { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } }, axisLabel: baseTextStyle };
      return {
        color: COLOR,
        grid: baseGrid,
        tooltip: { trigger: 'axis' },
        legend: { top: 0, right: 0, icon: 'roundRect', textStyle: baseTextStyle, itemWidth: 10, itemHeight: 6 },
        xAxis: { type: 'category', data: xAxis, axisLine: { lineStyle: { color: '#dbe2ec' } }, axisLabel: baseTextStyle },
        yAxis: yAxisArr,
        series: series
      };
    }

    // —— 柱状图（垂直）
    if (type === 'bar') {
      let xAxis = ['华东', '华南', '华北', '西南', '华中', '东北'];
      let data = [3248, 2156, 1053, 982, 896, 923];
      if (/华东.*城市|城市/.test(t)) {
        xAxis = ['上海', '杭州', '苏州', '南京', '其他'];
        data = [1668, 1205, 675, 228, 1044];
      } else if (/产品线|毛利/.test(t)) {
        xAxis = ['高端系列', '主推新品', '老品维稳', '长尾产品'];
        return {
          color: COLOR,
          grid: { left: 50, right: 24, top: 30, bottom: 28 },
          tooltip: { trigger: 'axis' },
          legend: { top: 0, right: 0, icon: 'roundRect', textStyle: baseTextStyle, itemWidth: 10, itemHeight: 6 },
          xAxis: { type: 'category', data: xAxis, axisLine: { lineStyle: { color: '#dbe2ec' } }, axisLabel: baseTextStyle },
          yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } }, axisLabel: baseTextStyle },
          series: [
            { name: '销售占比 %', type: 'bar', barWidth: 14, itemStyle: { borderRadius: [6, 6, 0, 0] }, data: [35, 35, 22, 8] },
            { name: '毛利贡献 %', type: 'bar', barWidth: 14, itemStyle: { borderRadius: [6, 6, 0, 0] }, data: [42.4, 36.9, 17.4, 3.3] }
          ]
        };
      } else if (/下月|专项|目标拆解/.test(t)) {
        xAxis = ['北区促销', '库存改善', '客户挽回', '新品贡献'];
        data = [260, 180, 320, 220];
      }
      return {
        color: COLOR,
        grid: baseGrid,
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: xAxis, axisLine: { lineStyle: { color: '#dbe2ec' } }, axisLabel: baseTextStyle },
        yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } }, axisLabel: baseTextStyle },
        series: [{ name: title || '数值', type: 'bar', barWidth: 18, itemStyle: { borderRadius: [6, 6, 0, 0] }, data: data }]
      };
    }

    // —— 横向条形
    if (type === 'bar-h') {
      let yAxis = ['上海伟业', '北京华信', '深圳鼎盛', '广州益丰', '杭州凯越', '成都领航', '南京晨光', '苏州博远', '武汉博通', '西安兴达'];
      let data = [320, 285, 264, 232, 218, 196, 184, 172, 158, 144];
      if (/流失原因/.test(t)) {
        yAxis = ['竞品价格优势', '产品体验问题', '售后不满意', '服务响应慢', '其他'];
        data = [35, 22, 15, 12, 16];
      }
      return {
        color: COLOR,
        grid: { left: 90, right: 30, top: 28, bottom: 24 },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } }, axisLabel: baseTextStyle },
        yAxis: { type: 'category', data: yAxis.slice().reverse(), axisLine: { lineStyle: { color: '#dbe2ec' } }, axisLabel: baseTextStyle },
        series: [{ name: title || '数值', type: 'bar', barWidth: 12, itemStyle: { borderRadius: [0, 6, 6, 0] }, data: data.slice().reverse() }]
      };
    }

    // —— 堆叠柱
    if (type === 'stacked-bar') {
      const xAxis = ['1月', '2月', '3月', '4月', '5月', '6月'];
      if (/4 月销售额/.test(t) && /拆解|结构/.test(t)) {
        return {
          color: COLOR,
          grid: baseGrid,
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          legend: { top: 0, right: 0, icon: 'roundRect', textStyle: baseTextStyle, itemWidth: 10, itemHeight: 6 },
          xAxis: { type: 'category', data: ['基础', '促销贡献', '新品贡献', '渠道扩张', '自然增长', '4 月合计'], axisLine: { lineStyle: { color: '#dbe2ec' } }, axisLabel: baseTextStyle },
          yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } }, axisLabel: baseTextStyle },
          series: [{ name: '增量（万）', type: 'bar', barWidth: 22, itemStyle: { borderRadius: [6, 6, 0, 0] }, data: [2510, 156, 113, 60, 51, 2890] }]
        };
      }
      return {
        color: COLOR,
        grid: baseGrid,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { top: 0, right: 0, icon: 'roundRect', textStyle: baseTextStyle, itemWidth: 10, itemHeight: 6 },
        xAxis: { type: 'category', data: xAxis, axisLine: { lineStyle: { color: '#dbe2ec' } }, axisLabel: baseTextStyle },
        yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } }, axisLabel: baseTextStyle },
        series: [
          { name: '高端系列', type: 'bar', stack: 'total', barWidth: 20, data: [820, 880, 940, 1080, 1180, 1240] },
          { name: '主推新品', type: 'bar', stack: 'total', barWidth: 20, data: [560, 620, 680, 760, 820, 868] },
          { name: '老品维稳', type: 'bar', stack: 'total', barWidth: 20, data: [800, 860, 890, 1050, 1120, 1140] }
        ]
      };
    }

    // —— 饼图
    if (type === 'pie') {
      let data = [
        { name: '线上电商', value: 38 },
        { name: '门店零售', value: 26 },
        { name: '大客户直销', value: 18 },
        { name: '经销商分销', value: 12 },
        { name: '其他', value: 6 }
      ];
      if (/客户分层/.test(t)) {
        data = [
          { name: '核心客户', value: 12 },
          { name: '重要客户', value: 18 },
          { name: '普通客户', value: 46 },
          { name: '流失客户', value: 24 }
        ];
      }
      return {
        color: COLOR,
        tooltip: { trigger: 'item', formatter: '{b}<br/>{c}% ({d}%)' },
        legend: { orient: 'vertical', left: 'right', top: 'center', icon: 'roundRect', textStyle: baseTextStyle, itemWidth: 10, itemHeight: 6 },
        series: [{
          name: title || '占比', type: 'pie', radius: ['38%', '70%'], center: ['38%', '52%'],
          avoidLabelOverlap: true, itemStyle: { borderColor: '#fff', borderWidth: 2 },
          label: { show: true, formatter: '{b}\n{d}%', fontSize: 11, color: '#475569' },
          labelLine: { length: 8, length2: 6 }, data: data
        }]
      };
    }

    // —— 漏斗图
    if (type === 'funnel') {
      return {
        color: COLOR,
        tooltip: { trigger: 'item', formatter: '{b}: {c}' },
        legend: { top: 0, right: 0, icon: 'roundRect', textStyle: baseTextStyle, itemWidth: 10, itemHeight: 6 },
        series: [{
          name: title || '转化',
          type: 'funnel',
          left: '12%', right: '12%', top: 30, bottom: 8,
          minSize: '20%', maxSize: '100%',
          sort: 'descending', gap: 4,
          label: { show: true, position: 'inside', color: '#fff', fontSize: 12, fontWeight: 600 },
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
          data: [
            { value: 1260000, name: '访问 1,260,000' },
            { value: 231840, name: '加购 231,840 (18.4%)' },
            { value: 97605, name: '下单 97,605 (42.1%)' },
            { value: 85404, name: '支付 85,404 (87.5%)' }
          ]
        }]
      };
    }

    // —— 雷达图
    if (type === 'radar') {
      return {
        color: COLOR,
        tooltip: {},
        legend: { top: 0, right: 0, icon: 'roundRect', textStyle: baseTextStyle, itemWidth: 10, itemHeight: 6 },
        radar: {
          center: ['50%', '54%'], radius: '62%',
          indicator: [
            { name: '渠道结构', max: 100 }, { name: '客户集中度', max: 100 },
            { name: '新品贡献', max: 100 }, { name: '库存周转', max: 100 },
            { name: '增长率', max: 100 }
          ],
          name: { textStyle: { color: '#475569', fontSize: 11 } },
          splitLine: { lineStyle: { color: '#dbe2ec' } },
          axisLine: { lineStyle: { color: '#dbe2ec' } },
          splitArea: { areaStyle: { color: [theme.primaryRgba(0.04), theme.primaryRgba(0.08)] } }
        },
        series: [{
          name: title || '区域对比', type: 'radar',
          data: [
            { name: '华东', value: [88, 92, 80, 86, 82], areaStyle: { opacity: 0.18 } },
            { name: '华南', value: [78, 70, 70, 72, 76], areaStyle: { opacity: 0.12 } },
            { name: '华北', value: [62, 58, 55, 65, 60], areaStyle: { opacity: 0.10 } },
            { name: '西南', value: [60, 55, 50, 60, 65], areaStyle: { opacity: 0.10 } }
          ]
        }]
      };
    }

    // —— 热力图
    if (type === 'heatmap') {
      const xAxis = ['销售额', '订单量', '客单价', '完成率', '毛利率', '库存周转'];
      const yAxis = /客户/.test(t) ? ['上海伟业', '北京华信', '深圳鼎盛', '广州益丰', '杭州凯越', '成都领航']
                                      : ['华东', '华南', '华北', '西南', '华中', '东北'];
      const data = [];
      for (let y = 0; y < yAxis.length; y++) {
        for (let x = 0; x < xAxis.length; x++) {
          const v = Math.round(20 + Math.abs(Math.sin((x + 1) * (y + 1.3)) * 80));
          data.push([x, y, v]);
        }
      }
      return {
        tooltip: { position: 'top' },
        grid: { left: 70, right: 30, top: 30, bottom: 56 },
        xAxis: { type: 'category', data: xAxis, splitArea: { show: true }, axisLabel: baseTextStyle, axisLine: { lineStyle: { color: '#dbe2ec' } } },
        yAxis: { type: 'category', data: yAxis, splitArea: { show: true }, axisLabel: baseTextStyle, axisLine: { lineStyle: { color: '#dbe2ec' } } },
        visualMap: { min: 0, max: 100, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: theme.heatmapPalette }, textStyle: baseTextStyle },
        series: [{ name: title || '热力', type: 'heatmap', data: data, label: { show: true, fontSize: 10, color: '#fff' }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } } }]
      };
    }

    // 默认占位
    return { title: { text: title, left: 'center', top: 'middle', textStyle: { color: '#94a3b8', fontSize: 13, fontWeight: 'normal' } } };
  };
})();
