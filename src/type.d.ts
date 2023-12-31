import { MarkdownView, App, MarkdownRenderer } from "obsidian";

export type SelectionType = {
  rendered: boolean;
  height: number;
  computed: boolean;
  lines: number;
  lineStart: number;
  lineEnd: number;
  used: boolean;
  highlightRanges: number;
  level: number;
  headingCollapsed: boolean;
  shown: boolean;
  usesFrontMatter: boolean;
  html: string;
  el: HTMLElement;

  /**
    function() {
      if (!this.rendered) {
          var e = TM(this.html);
          this.el.appendChild(e),
          this.rendered = !0,
          this.computed = !1
      }
    }
  */
  render: () => void;
};

// Extend the existing type definition for MarkdownView
declare module "obsidian" {
  interface MarkdownPreviewView {
    renderer: {
      queueRender: () => void; // Typing for queueRender() method
      sections: SelectionType[]; // Typing for sections property
      text: string;
      owner: MarkdownPreviewView;
    };
    postProcess: (section, promisses, frontmatter) => unknown;
  }

  declare class MarkdownRenderer extends MarkdownRenderer {
    /**
    {
        docId: string // Xe(16),
        sourcePath: string
        frontmatter: any,
        promises: any[],
        addChild: function(e) {
            return t.addChild(e)
        },
        getSectionInfo: function() {
            return null
        },
        containerEl: i,
        el: i,
        displayMode: !0
    }
     */
    static postProcess: (app: App, param: any) => any;
  }
}
