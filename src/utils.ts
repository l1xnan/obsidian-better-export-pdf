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

export function getHeadingTree(doc = document) {
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
export function modifyDest(doc: Document) {
  const data = new Map();
  doc.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading: HTMLElement, i) => {
    const link = document.createElement("a") as HTMLAnchorElement;
    const flag = `${heading.tagName.toLowerCase()}-${i}`;
    link.href = `af://${flag}`;
    link.className = "md-print-anchor";
    heading.appendChild(link);
    data.set(heading.dataset.heading, flag);
  });

  return data;
}

function convertMapKeysToLowercase(map: Map<string, string>) {
  return new Map(Array.from(map).map(([key, value]) => [key?.toLowerCase(), value]));
}

export function fixAnchors(doc: Document, dest: Map<string, string>, basename: string) {
  const lowerDest = convertMapKeysToLowercase(dest);

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
  const arr = [];
  for (const item of path.children) {
    arr.push(...traverseFolder(item as TFolder));
  }
  return arr;
}

// copy element attributes
export function copyAttributes(node: HTMLElement, attributes: NamedNodeMap) {
  Array.from(attributes).forEach((attr) => {
    node.setAttribute(attr.name, attr.value);
  });
}

export function render(tpl: string, data: Record<string, string>) {
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
