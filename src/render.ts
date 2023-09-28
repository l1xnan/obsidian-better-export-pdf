
export async function renderMermaid(doc: Document) {
  doc.querySelectorAll(".language-mermaid").forEach(async (element: HTMLElement) => {
    const code = element.innerText;

    // @ts-ignore
    const { svg, bindFunctions } = await mermaid.render("mermaid-" + i, code);

    if (element.parentElement) {
      element.parentElement.outerHTML = `<div class="mermaid">${svg}</div>`;
      bindFunctions(element.parentElement);
    }
  });
}