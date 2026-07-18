import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { HWPReader } from "../src/reader/HWPReader.js";
import { HWPWriter } from "../src/writer/HWPWriter.js";
import type { HWPFile } from "../src/object/HWPFile.js";

// Round-trip fidelity, driven from a self-generated document (blank.hwp, produced by this
// engine's own BlankFileMaker) so the public test suite ships no third-party HWP content.
// Driving from the serialized bytes — rather than the in-memory builder object — is what the
// read -> write -> read guarantee actually covers for arbitrary files.

const here = dirname(fileURLToPath(import.meta.url));

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

function paragraphTexts(hwp: HWPFile): string[][] {
  return hwp
    .getBodyText()
    .getSectionList()
    .map((s) => s.getParagraphs().map((p) => p.getNormalString() ?? ""));
}

describe("round-trip: blank.hwp (read -> write -> re-read is stable)", () => {
  const bytes = new Uint8Array(readFileSync(join(here, "fixtures", "blank.hwp")));
  const original = HWPReader.fromBytes(bytes);
  const written = HWPWriter.toBytes(original);
  const reread = HWPReader.fromBytes(written);

  it("produces a valid CFB that re-reads with the same header", () => {
    expect(written.length).toBeGreaterThan(0);
    expect(reread.getFileHeader().getVersion().toString()).toBe(
      original.getFileHeader().getVersion().toString(),
    );
    expect(reread.getFileHeader().isCompressed()).toBe(original.getFileHeader().isCompressed());
  });

  it("preserves DocInfo record counts through the write", () => {
    expect(docInfoCounts(reread)).toEqual(docInfoCounts(original));
  });

  it("preserves section + per-paragraph text through the write", () => {
    expect(paragraphTexts(reread)).toEqual(paragraphTexts(original));
  });

  it("is stable across a second write cycle (read->write->read->write->read)", () => {
    const written2 = HWPWriter.toBytes(reread);
    const reread2 = HWPReader.fromBytes(written2);
    expect(paragraphTexts(reread2)).toEqual(paragraphTexts(reread));
    expect(docInfoCounts(reread2)).toEqual(docInfoCounts(reread));
  });
});
