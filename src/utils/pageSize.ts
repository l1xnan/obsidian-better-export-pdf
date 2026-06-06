import { PageSize } from "../constant";
import { mm2px, safeParseFloat } from ".";
import type { ExportConfigType } from "../modal";

export class PageSizeCalculator {
  private config: ExportConfigType;
  private onResize?: () => void;
  private observer?: ResizeObserver;

  constructor(config: ExportConfigType, onResize?: () => void) {
    this.config = config;
    this.onResize = onResize;
  }

  /** 计算缩放比例，使预览宽度匹配目标页面宽度 */
  calc(previewEl: HTMLDivElement): number {
    const { pageSize, pageWidth } = this.config;
    const width = PageSize?.[pageSize as string]?.[0] ?? safeParseFloat(pageWidth as string, 210);
    return Math.floor((mm2px(width) / previewEl.offsetWidth) * 100) / 100;
  }

  /** 挂载 ResizeObserver，组件 onMount 时调用 */
  startObserver(el: HTMLDivElement) {
    this.observer = new ResizeObserver(() => {
      this.onResize?.();
    });
    this.observer.observe(el);
  }

  /** 组件销毁时调用 */
  stopObserver() {
    this.observer?.disconnect();
  }
}
