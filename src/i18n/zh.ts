import type { Lang } from ".";

export default {
  exportCurrentFile: "导出当前文件为PDF",
  exportCurrentFileWithPrevious: "使用上一次设置导出为PDF",

  exportDialog: {
    filenameAsTitle: "将笔记名作为标题",
    pageSize: "纸张尺寸",
    margin: "页边距",
    downscalePercent: "缩放",
    landscape: "横向打印",
    displayHeader: "页眉",
    displayFooter: "页脚",
    openAfterExport: "导出后打开",
    cssSnippets: "CSS代码片段",
  },

  settings: {
    showTitle: "将笔记名作为标题",
    displayHeader: "显示页眉",
    displayFooter: "显示页脚",
    printBackground: "打印背景",
    maxLevel: "最大标题级别",
    displayMetadata: "PDF元数据",
    headerTemplate: "页眉模板",
    footerTemplate: "页脚模板",
    isTimestamp: "文件名添加时间戳",
    enabledCss: "启用CSS片段选择",
    concurrency: "限制并发数",
    debugMode: "调试模式",
  },
} satisfies Lang;
