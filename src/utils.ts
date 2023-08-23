export class TreeNode {
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
 * h2 1.1
 * h3 1.1.1
 * h4 1.1.2.1
 * h4 1.1.2.2
 * h2 1.2
 * h2 1.3
 */

export function getHeadingTree(doc = document) {
  const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
  const root = new TreeNode("", "Root", 0);
  let prev = root;

  headings.forEach((heading: HTMLElement) => {
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

export function modifyHeadings(doc: Document) {
  const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
  headings.forEach((heading, i) => {
    const link = document.createElement("a") as HTMLAnchorElement;
    link.href = `af://n${i}`;
    link.className = "md-print-anchor";
    heading.appendChild(link);
  });
}
