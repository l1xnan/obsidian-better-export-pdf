import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef, PDFHexString } from "pdf-lib";

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
          // @ts-ignore
          const uri = linkDict?.get(PDFName.of("URI")).toString();
          console.log("uri", uri);
          const regexMatch = /^\(af:\/\/(.+)\)$/.exec(uri || "");

          if (regexMatch) {
            const rect = (annotation.get(PDFName.of("Rect")) as PDFArray)?.asRectangle();
            const linkUrl = regexMatch[1];
            // const yPos = pageHeight - rect.height - rect.y;
            const yPos = rect.y;
            links[linkUrl] = [pageIndex, yPos];
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

export function generate(root: TreeNode, positions: TPosition) {
  console.log(root, positions);
  const _outline = (node: TreeNode) => {
    const [pageIdx, pos] = positions?.[node.key] ?? [0, 0];
    const outline: PDFOutline = {
      title: node.title,
      to: [pageIdx, 0, pos],
      open: false,
      children: [],
    };
    if (node.children?.length > 0) {
      for (const item of node.children) {
        const child = _outline(item);
        if (child) {
          outline.children.push(child);
        }
      }
    }
    return outline;
  };

  return _outline(root)?.children ?? [];
}
// --- Outline ---

type PDFOutlineTo =
  // | string
  number | [pageIndex: number, xPercentage: number, yPercentage: number];

export interface PDFOutlineItem {
  title: string;
  to: PDFOutlineTo;
  italic?: boolean;
  bold?: boolean;
}

export interface PDFOutlineItemWithChildren extends Omit<PDFOutlineItem, "to"> {
  to?: PDFOutlineTo;
  children: PDFOutline[];
  open: boolean;
}

export type PDFOutline = PDFOutlineItem | PDFOutlineItemWithChildren;

const walk = (
  outlines: readonly PDFOutline[],
  callback: (outline: PDFOutline) => void | boolean, // stop walking to children if returned false
) => {
  for (const outline of outlines) {
    const ret = callback(outline);
    if ("children" in outline && ret !== false) walk(outline.children, callback);
  }
};

const flatten = (outlines: readonly PDFOutline[]) => {
  const result: PDFOutline[] = [];

  walk(outlines, (outline) => void result.push(outline));
  return result;
};

const getOpeningCount = (outlines: readonly PDFOutline[]) => {
  let count = 0;

  walk(outlines, (outline) => {
    count += 1;
    return !("open" in outline && !outline.open);
  });

  return count;
};

export const setOutline = async (doc: PDFDocument, outlines: readonly PDFOutline[]) => {
  // Refs
  const rootRef = doc.context.nextRef();
  const refMap = new WeakMap<PDFOutline, PDFRef>();

  for (const outline of flatten(outlines)) {
    refMap.set(outline, doc.context.nextRef());
  }

  const pageRefs = (() => {
    const refs: PDFRef[] = [];

    doc.catalog.Pages().traverse((kid, ref) => {
      if (kid.get(kid.context.obj("Type"))?.toString() === "/Page") {
        refs.push(ref);
      }
    });

    return refs;
  })();

  // Outlines
  const createOutline = (outlines: readonly PDFOutline[], parent: PDFRef) => {
    const { length } = outlines;

    for (let i = 0; i < length; i += 1) {
      const outline = outlines[i];
      const outlineRef = refMap.get(outline)!;

      const destOrAction = (() => {
        // if (typeof outline.to === 'string') {
        //   // URL
        //   return { A: { S: 'URI', URI: PDFHexString.fromText(outline.to) } }
        // } else
        if (typeof outline.to === "number") {
          return { Dest: [pageRefs[outline.to], "Fit"] };
        } else if (Array.isArray(outline.to)) {
          // const page = doc.getPage(outline.to[0]);
          // const width = page.getWidth() * outline.to[1];
          // const height = page.getHeight()* outline.to[2];

          return {
            Dest: [pageRefs[outline.to[0]], "XYZ", outline.to[1], outline.to[2], null],
          };
        }
        return {};
      })();

      const childrenDict = (() => {
        if ("children" in outline && outline.children.length > 0) {
          createOutline(outline.children, outlineRef);

          return {
            First: refMap.get(outline.children[0])!,
            Last: refMap.get(outline.children[outline.children.length - 1])!,
            Count: getOpeningCount(outline.children) * (outline.open ? 1 : -1),
          };
        }
        return {};
      })();

      doc.context.assign(
        outlineRef,
        doc.context.obj({
          Title: PDFHexString.fromText(outline.title),
          Parent: parent,
          ...(i > 0 ? { Prev: refMap.get(outlines[i - 1])! } : {}),
          ...(i < length - 1 ? { Next: refMap.get(outlines[i + 1])! } : {}),
          ...childrenDict,
          ...destOrAction,
          F: (outline.italic ? 1 : 0) | (outline.bold ? 2 : 0),
        }),
      );
    }
  };

  createOutline(outlines, rootRef);

  // Root
  const rootCount = getOpeningCount(outlines);

  doc.context.assign(
    rootRef,
    doc.context.obj({
      Type: "Outlines",
      ...(rootCount > 0
        ? {
            First: refMap.get(outlines[0])!,
            Last: refMap.get(outlines[outlines.length - 1])!,
          }
        : {}),
      Count: rootCount,
    }),
  );

  doc.catalog.set(doc.context.obj("Outlines"), rootRef);
};
