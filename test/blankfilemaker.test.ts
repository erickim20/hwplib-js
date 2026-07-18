import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BlankFileMaker } from "../src/tool/blankfilemaker/BlankFileMaker.js";
import { HWPReader } from "../src/reader/HWPReader.js";
import { HWPWriter } from "../src/writer/HWPWriter.js";
import type { HWPFile } from "../src/object/HWPFile.js";

const here = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(join(here, "golden", "blank.golden.json"), "utf8")) as {
  version: string;
  docInfo: Record<string, number>;
  sectionCount: number;
  sections: { paragraphCount: number; paragraphs: string[] }[];
};

function docInfoCounts(hwp: HWPFile): Record<string, number> {
  const di = hwp.getDocInfo();
  const faceName =
    di.getHangulFaceNameList().length +
    di.getEnglishFaceNameList().length +
    di.getHanjaFaceNameList().length +
    di.getJapaneseFaceNameList().length +
    di.getEtcFaceNameList().length +
    di.getSymbolFaceNameList().length +
    di.getUserFaceNameList().length;
  return {
    binData: di.getBinDataList().length,
    faceName,
    borderFill: di.getBorderFillList().length,
    charShape: di.getCharShapeList().length,
    tabDef: di.getTabDefList().length,
    numbering: di.getNumberingList().length,
    bullet: di.getBulletList().length,
    paraShape: di.getParaShapeList().length,
    style: di.getStyleList().length,
  };
}

describe("BlankFileMaker.make() matches Java hwplib", () => {
  it("builds the same DocInfo table structure as Java", () => {
    const blank = BlankFileMaker.make();
    expect(blank.getFileHeader().getVersion().toString()).toBe(golden.version); // 5.0.3.4.
    expect(blank.getFileHeader().isCompressed()).toBe(true);
    expect(docInfoCounts(blank)).toEqual(golden.docInfo);
    expect(blank.getBodyText().getSectionList().length).toBe(golden.sectionCount);
  });

  it("produces a writable file that re-reads as the same blank document", () => {
    const written = HWPWriter.toBytes(BlankFileMaker.make());
    expect(written.length).toBeGreaterThan(0);
    const reread = HWPReader.fromBytes(written);

    expect(reread.getFileHeader().getVersion().toString()).toBe(golden.version);
    expect(docInfoCounts(reread)).toEqual(golden.docInfo);

    const sections = reread.getBodyText().getSectionList();
    expect(sections.length).toBe(golden.sectionCount);
    const paras = sections[0]!.getParagraphs();
    expect(paras.length).toBe(golden.sections[0]!.paragraphCount);
    expect(paras[0]!.getNormalString() ?? "").toBe(golden.sections[0]!.paragraphs[0]);
  });
});
