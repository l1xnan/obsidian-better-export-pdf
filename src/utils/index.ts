import { TFile, TFolder } from "obsidian";

export class TreeNode {
  // h2-1, h3-2, etc
  key: string;
  title: string;
  level: number;
  children: TreeNode[] = [];
  parent: TreeNode;
  constructor(key: string, title: string, level: number) {
    this.key = key;
    this.title = title;
    this.level = level;
    this.children = [];
  }
}
/**
 * h1 1
 *   h2 1.1
 *     h3 1.1.1
 *       h4 1.1.2.1
 *       h4 1.1.2.2
 *   h2 1.2
 *   h2 1.3
 */

export function getHeadingTree(doc: Document | HTMLDivElement = document) {
  const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
  const root = new TreeNode("", "Root", 0);
  let prev = root;

  headings.forEach((heading: HTMLElement) => {
    if (heading.style.display == "none") {
      return;
    }
    const level = parseInt(heading.tagName.slice(1));

    const link = heading.querySelector("a.md-print-anchor") as HTMLLinkElement;
    const regexMatch = /^af:\/\/(.+)$/.exec(link?.href ?? "");
    if (!regexMatch) {
      return;
    }
    const newNode = new TreeNode(regexMatch[1], heading.innerText, level);

    while (prev.level >= level) {
      prev = prev.parent;
    }
    // 保证 prev.level < level, 即 prev 是 curr 的父节点
    prev.children.push(newNode);
    newNode.parent = prev;
    prev = newNode;
  });

  return root;
}

// modify heading/block, and get heading/block flag
// Enhanced to support both Obsidian wikilinks and standard markdown anchor links
export function modifyDest(doc: Document | HTMLDivElement) {
  const data = new Map();
  doc.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading: HTMLElement, i) => {
    const link = document.createElement("a");
    const flag = `${heading.tagName.toLowerCase()}-${i}`;
    link.href = `af://${flag}`;
    link.className = "md-print-anchor";
    heading.appendChild(link);

    // Map both the dataset.heading and the text content for different link types
    if (heading.dataset.heading) {
      data.set(heading.dataset.heading, flag);
    }

    // Also map the heading text content (for standard markdown links)
    const headingText = heading.textContent?.trim();
    if (headingText) {
      data.set(headingText, flag);
      // Also map URL-encoded version and common variations
      data.set(encodeURIComponent(headingText), flag);
      // Map space-to-dash version (common in many markdown processors)
      data.set(headingText.replace(/\s+/g, "-"), flag);
      // Map space-to-dash-lowercase version
      data.set(headingText.toLowerCase().replace(/\s+/g, "-"), flag);
      // Map version with special characters removed (common in some processors)
      const cleanText = headingText.replace(/[^\w\s-]/g, "").trim();
      if (cleanText && cleanText !== headingText) {
        data.set(cleanText, flag);
        data.set(cleanText.replace(/\s+/g, "-"), flag);
        data.set(cleanText.toLowerCase().replace(/\s+/g, "-"), flag);
      }
    }

    // Map the heading ID if it exists
    if (heading.id) {
      data.set(heading.id, flag);
    }
  });

  return data;
}

function convertMapKeysToLowercase(map: Map<string, string>) {
  return new Map(Array.from(map).map(([key, value]) => [key?.toLowerCase(), value]));
}

export function fixAnchors(doc: Document | HTMLDivElement, dest: Map<string, string>, basename: string) {
  const lowerDest = convertMapKeysToLowercase(dest);

  // Handle Obsidian internal links (wikilink-style)
  doc.querySelectorAll("a.internal-link").forEach((el: HTMLAnchorElement, i) => {
    const [title, anchor] = el.dataset.href?.split("#") ?? [];

    if (anchor?.startsWith("^")) {
      el.href = el.dataset.href?.toLowerCase() as string;
    }

    if (anchor?.length > 0) {
      if (title?.length > 0 && title != basename) {
        return;
      }

      const flag = dest.get(anchor) || lowerDest.get(anchor?.toLowerCase());
      if (flag && !anchor.startsWith("^")) {
        el.href = `an://${flag}`;
      }
    }
  });

  // Handle standard markdown anchor links like [text](#heading)
  doc.querySelectorAll("a[href^='#']").forEach((el: HTMLAnchorElement) => {
    const href = el.getAttribute("href");
    if (!href) return;

    // Extract the anchor part (without the #)
    const anchor = href.substring(1);
    if (!anchor) return;

    // Skip if this is already an internal-link (already processed above)
    if (el.classList.contains("internal-link")) return;

    // Skip block references (they start with ^)
    if (anchor.startsWith("^")) return;

    // Try multiple variations of the anchor text to find a match
    const variations = [
      anchor, // Original anchor
      decodeURIComponent(anchor), // URL decoded
      anchor.replace(/-/g, " "), // Dash to space
      decodeURIComponent(anchor).replace(/-/g, " "), // Both
      anchor.toLowerCase(), // Lowercase
      decodeURIComponent(anchor).toLowerCase(), // URL decoded + lowercase
      anchor.toLowerCase().replace(/-/g, " "), // Lowercase + dash to space
      decodeURIComponent(anchor).toLowerCase().replace(/-/g, " "), // All transformations
    ];

    // Try to find a matching heading using any of the variations
    let flag = null;
    for (const variation of variations) {
      flag = dest.get(variation) || lowerDest.get(variation.toLowerCase());
      if (flag) break;
    }

    if (flag) {
      el.href = `an://${flag}`;
    }
  });
}

/**
 * 等待函数，轮询检查条件是否满足，可设置超时时间。
 * @param cond 条件函数，返回布尔值表示条件是否满足。
 * @param timeout 超时时间（可选，默认为0，表示没有超时时间限制）。
 * @returns 返回一个 Promise 对象，当条件满足时解决为 true，超时或发生错误时拒绝。
 */

export function waitFor(cond: (...args: unknown[]) => boolean, timeout = 0) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const poll = () => {
      if (cond()) {
        resolve(true);
      } else if (timeout > 0 && Date.now() - startTime >= timeout) {
        reject(new Error("Timeout exceeded"));
      } else {
        setTimeout(poll, 100);
      }
    };

    poll();
  });
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const px2mm = (px: number) => {
  return Math.round(px * 0.26458333333719);
};
export const mm2px = (mm: number) => {
  return Math.round(mm * 3.779527559);
};

export function traverseFolder(path: TFolder | TFile): TFile[] {
  if (path instanceof TFile) {
    if (path.extension == "md") {
      return [path];
    } else {
      return [];
    }
  }
  const arr: TFile[] = [];
  for (const item of path.children) {
    arr.push(...traverseFolder(item as TFolder));
  }
  arr.sort((a, b) => a.name.localeCompare(b.name));
  return arr;
}

// copy element attributes
export function copyAttributes(node: HTMLElement, attributes: NamedNodeMap) {
  Array.from(attributes).forEach((attr) => {
    node.setAttribute(attr.name, attr.value);
  });
}

export function renderTemplate(tpl: string, data: Record<string, string>) {
  return tpl.replace(/\{\{(.*?)\}\}/g, (match, key) => data[key.trim()]);
}

export function isNumber(str: string) {
  return !isNaN(parseFloat(str));
}

export function safeParseInt(str?: string, default_ = 0) {
  try {
    const num = parseInt(String(str));
    return isNaN(num) ? default_ : num;
  } catch (e) {
    return default_;
  }
}
export function safeParseFloat(str?: string, default_ = 0.0) {
  try {
    const num = parseFloat(String(str));
    return isNaN(num) ? default_ : num;
  } catch (e) {
    return default_;
  }
}

/**
 * 获取在暗色主题中定义，但在亮色主题中缺失重构的衍生变量公式
 * @returns {Object} 缺失的衍生变量键值对，例如: { "--table-header-color": "var(--text-normal)" }
 */
export function getDerivedLightVars() {
  const lightVars = new Set();
  const derivedDarkVars: Record<string, string> = {};

  try {
    for (const sheet of document.styleSheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;

        for (const rule of rules) {
          if (rule.type !== CSSRule.STYLE_RULE) continue;

          const selector = rule.selectorText;

          // 1. 收集 .theme-light 中主动声明的变量
          if (selector.includes(".theme-light")) {
            const style = rule.style;
            for (let i = 0; i < style.length; i++) {
              const prop = style[i];
              if (prop.startsWith("--")) {
                lightVars.add(prop);
              }
            }
          }

          // 2. 收集 body 或 .theme-dark 中声明的衍生变量（含有 var( 的变量）
          if (selector.includes("body") || selector.includes(".theme-dark")) {
            const style = rule.style;
            for (let i = 0; i < style.length; i++) {
              const prop = style[i];
              if (prop.startsWith("--")) {
                const rawVal = style.getPropertyValue(prop).trim();
                // 筛选包含 var( 的衍生变量
                if (rawVal.includes("var(")) {
                  derivedDarkVars[prop] = rawVal;
                }
              }
            }
          }
        }
      } catch (e) {
        // 忽略跨域样式表 (CORS 限制) 导致的报错
      }
    }
  } catch (e) {
    console.error("读取全局样式表时出错:", e);
  }

  // 3. 过滤并求差集：只保留亮色主题中没有定义的衍生变量
  const missingVars: Record<string, string> = {};
  for (const [prop, rawVal] of Object.entries(derivedDarkVars)) {
    if (!lightVars.has(prop)) {
      missingVars[prop] = rawVal;
    }
  }

  return missingVars;
}

/**
 * 把暗色主题里才会声明的衍生变量写到打印根节点上，让它们在 `.theme-light` 作用域里重新计算。
 * 自定义属性在继承前会先在声明它的元素上计算，所以必须写在 `.print.theme-light` 自身，
 * 不能依赖从 `body.theme-dark` 继承下来的已经算好的值。
 */
/** Dialog margin keys are "0" None, "1" Default, "2" Small, "3" Custom. */
export function normalizeMarginType(value: unknown): "0" | "1" | "2" | "3" {
  switch (String(value ?? "1").trim().toLowerCase()) {
    case "0":
    case "none":
      return "0";
    case "2":
    case "small":
      return "2";
    case "3":
    case "custom":
      return "3";
    default:
      return "1";
  }
}

export function applyLightVars(el: HTMLElement) {
  const vars = getDerivedLightVars();
  if (Object.keys(vars).length === 0) {
    return;
  }
  el.setCssProps(vars);
}
