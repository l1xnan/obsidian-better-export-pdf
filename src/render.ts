export async function renderMermaid(doc: Document) {
  doc.querySelectorAll(".language-mermaid").forEach(async (element: HTMLElement, i: number) => {
    const code = element.querySelector("code")?.innerText;

    // @ts-ignore
    const { svg, bindFunctions } = await mermaid.render("mermaid-" + i, code);

    element.outerHTML = `<div class="mermaid">${svg}</div>`;
    bindFunctions(element);

    // if (element.parentElement) {
    //   element.parentElement.outerHTML = `<div class="mermaid">${svg}</div>`;
    //   bindFunctions(element.parentElement);
    // }
  });
}
