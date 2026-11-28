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
    saveNextToNote: "保存到笔记所在文件夹",
    enabledCss: "启用CSS片段选择",
    concurrency: "限制并发数",
    debugMode: "调试模式",
    version: "引擎版本",
    versionDesc: "v1 打印网页预览。v2 在主窗口打印预览。v3 公测按官方方式，在隐藏窗口里打印。切换后重新打开导出窗口。",
    versions: {
      "1": "v1",
      "2": "v2",
      "3": "v3 beta",
    },
  },
} satisfies Lang;
