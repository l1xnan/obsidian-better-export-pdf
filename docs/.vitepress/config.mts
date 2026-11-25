import { defineConfig } from "vitepress";

const searchZh = {
  provider: "local" as const,
  options: {
    translations: {
      button: {
        buttonText: "搜索",
        buttonAriaLabel: "搜索",
      },
      modal: {
        noResultsText: "没有找到结果",
        resetButtonTitle: "清除",
        footer: {
          selectText: "选择",
          navigateText: "切换",
          closeText: "关闭",
        },
      },
    },
  },
};

export default defineConfig({
  title: "Better Export PDF",
  description:
    "Export preview, outline bookmarks, headers, footers, and merged PDFs for Obsidian.",
  lang: "en-US",
  base: "/obsidian-better-export-pdf/",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    search: { provider: "local" },
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/l1xnan/obsidian-better-export-pdf",
      },
    ],
    outline: { level: [2, 3] },
  },
  locales: {
    root: {
      label: "English",
      lang: "en-US",
      description:
        "Export preview, outline bookmarks, headers, footers, and merged PDFs for Obsidian.",
      themeConfig: {
        nav: [
          { text: "Export", link: "/export" },
          { text: "Folder", link: "/folder" },
          { text: "CLI", link: "/cli" },
          { text: "FAQ", link: "/faq" },
        ],
        sidebar: [
          {
            text: "Guide",
            items: [
              { text: "Export one note", link: "/export" },
              { text: "Header, footer, and metadata", link: "/header-footer" },
              { text: "Style, background, and page breaks", link: "/style" },
              { text: "Folder export", link: "/folder" },
              { text: "Command line", link: "/cli" },
              { text: "Limits", link: "/limits" },
              { text: "Questions from issues", link: "/faq" },
            ],
          },
        ],
        outline: { label: "On this page", level: [2, 3] },
        docFooter: { prev: "Previous", next: "Next" },
        lastUpdated: { text: "Last updated" },
        returnToTopLabel: "Back to top",
        sidebarMenuLabel: "Menu",
        langMenuLabel: "Language",
      },
    },
    zh: {
      label: "中文",
      lang: "zh-CN",
      link: "/zh/",
      description: "Obsidian PDF 导出增强：预览、大纲书签、页眉页脚和合并导出。",
      markdown: {
        codeCopyButton: {
          tooltipText: "复制代码",
          copiedText: "已复制",
        },
      },
      themeConfig: {
        nav: [
          { text: "导出", link: "/zh/export" },
          { text: "文件夹", link: "/zh/folder" },
          { text: "命令行", link: "/zh/cli" },
          { text: "问答", link: "/zh/faq" },
        ],
        sidebar: [
          {
            text: "使用",
            items: [
              { text: "导出一篇笔记", link: "/zh/export" },
              { text: "页眉页脚与元数据", link: "/zh/header-footer" },
              { text: "样式、背景与分页", link: "/zh/style" },
              { text: "文件夹导出", link: "/zh/folder" },
              { text: "命令行", link: "/zh/cli" },
              { text: "限制", link: "/zh/limits" },
              { text: "来自 Issue 的问题", link: "/zh/faq" },
            ],
          },
        ],
        outline: { label: "本页目录", level: [2, 3] },
        docFooter: { prev: "上一页", next: "下一页" },
        lastUpdated: { text: "最后更新" },
        darkModeSwitchLabel: "主题",
        lightModeSwitchTitle: "切换到浅色模式",
        darkModeSwitchTitle: "切换到深色模式",
        sidebarMenuLabel: "菜单",
        returnToTopLabel: "回到顶部",
        langMenuLabel: "语言",
        search: searchZh,
      },
    },
  },
});
