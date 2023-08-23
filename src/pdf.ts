import { PDFDocument, PDFName, PDFDict, PDFArray } from "pdf-lib";
import { TreeNode } from "./utils";
import { TPDFNode, TPDFOutLineMaker, TPDFAnalyst, TPDFPageMode } from "./pdf-designer/pdf-designer";

interface TPosition {
  [key: string]: number[];
}

export async function getHeadingPosition(buffer: ArrayBuffer | Uint8Array): Promise<TPosition> {
  const pdfDoc = await PDFDocument.load(buffer);
  const pages = pdfDoc.getPages();
  const pageHeight = pages[0].getHeight();
  const links: TPosition = {};

  pages.forEach((page, pageIndex) => {
    const annotations = page.node.Annots();
    if (!annotations) {
      return;
    }
    const numAnnotations = annotations?.size() ?? 0;

    for (let annotIndex = 0; annotIndex < numAnnotations; annotIndex++) {
      try {
        const annotation = annotations.lookup(annotIndex, PDFDict);
        const subtype = annotation.get(PDFName.of("Subtype"));
        if (subtype?.toString() === "/Link") {
          const linkDict = annotation.get(PDFName.of("A")) as PDFDict;
          const uri = linkDict?.get(PDFName.of("URI")).toString();
          console.log("uri", uri);
          const regexMatch = /^\(af:\/\/(.+)\)$/.exec(uri || "");

          if (regexMatch) {
            const rect = (annotation.get(PDFName.of("Rect")) as PDFArray)?.asRectangle();
            const linkUrl = regexMatch[1];
            const yPos = pageHeight - rect.height - rect.y;
            links[linkUrl] = [pageIndex + 1, yPos];
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  });

  return links;
}

export function addBookmarks(buffer: Uint8Array, root: TreeNode, positions: TPosition) {
  console.log(root, positions);
  const PDFOutLineMaker = new TPDFOutLineMaker();
  const PDFAnalyst = new TPDFAnalyst();

  PDFAnalyst.LoadFromStream(buffer);
  PDFOutLineMaker.View.PageMode = TPDFPageMode.pmUseOutlines;

  const addRoot = (title: string, pageIdx: number, pos: number) => {
    return PDFOutLineMaker.OutLine.AddRoot(title, pageIdx, pos, "", false, false, null);
  };

  const generateOutline = (node: TreeNode, outline: TPDFNode) => {
    for (const item of node.children) {
      const [pageIdx, pos] = positions[item.key];
      const child = outline.AddChild(item.title, pageIdx, pos, "", false, false, null);
      generateOutline(item, child);
    }
  };

  for (const item of root.children) {
    const position = positions[item.key];
    if (!position) {
      console.error(`${item.key} not find position`);
      continue;
    }
    const [pageIdx, pos] = position;
    const child = addRoot(item.title, pageIdx, pos);
    generateOutline(item, child);
  }

  const stream = PDFOutLineMaker.Save(PDFAnalyst);
  return stream;
}
