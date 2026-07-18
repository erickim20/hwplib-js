import { describe, expect, it } from "vitest";
import { Alignment } from "../src/object/docinfo/parashape/Alignment.js";
import { BorderType } from "../src/object/docinfo/borderfill/BorderType.js";
import { CharShape } from "../src/object/docinfo/CharShape.js";
import { ParaShape } from "../src/object/docinfo/ParaShape.js";
import { ParaText } from "../src/object/bodytext/paragraph/text/ParaText.js";
import { HWPChar } from "../src/object/bodytext/paragraph/text/HWPChar.js";
import { HWPCharType } from "../src/object/bodytext/paragraph/text/HWPCharType.js";

describe("valued enums (namespace-merge at runtime)", () => {
  it("Alignment.valueOf maps values and falls back to the Java default", () => {
    expect(Alignment.valueOf(3)).toBe(Alignment.Center);
    expect(Alignment.valueOf(0)).toBe(Alignment.Justify);
    expect(Alignment.valueOf(99)).toBe(Alignment.Justify); // unknown -> default
    expect(Alignment.getValue(Alignment.Right)).toBe(2);
  });

  it("BorderType.valueOf falls back to Solid", () => {
    expect(BorderType.valueOf(1)).toBe(BorderType.Solid);
    expect(BorderType.valueOf(8)).toBe(BorderType.Double);
    expect(BorderType.valueOf(99)).toBe(BorderType.Solid); // unknown -> default
  });
});

describe("data classes instantiate and expose accessors", () => {
  it("CharShape / ParaShape construct without throwing", () => {
    const cs = new CharShape();
    const ps = new ParaShape();
    expect(cs).toBeInstanceOf(CharShape);
    expect(ps).toBeInstanceOf(ParaShape);
  });
});

describe("HWPChar.type classification (drives text parsing)", () => {
  it("classifies codes exactly like hwplib", () => {
    expect(HWPChar.type(65)).toBe(HWPCharType.Normal); // 'A'
    expect(HWPChar.type(0xac00)).toBe(HWPCharType.Normal); // 가
    expect(HWPChar.type(13)).toBe(HWPCharType.ControlChar); // para break
    expect(HWPChar.type(10)).toBe(HWPCharType.ControlChar); // line break
    expect(HWPChar.type(2)).toBe(HWPCharType.ControlExtend); // section/column define
    expect(HWPChar.type(9)).toBe(HWPCharType.ControlInline); // tab
  });
});

describe("ParaText normal-char extraction (the golden text path)", () => {
  it("builds Korean text from code units via getNormalString", () => {
    const pt = new ParaText();
    for (const code of [0xac00, 0xb098, 0xb2e4, 0x41, 0x42]) {
      // 가 나 다 A B
      pt.addNewNormalChar().setCode(code);
    }
    expect(pt.getNormalString(0)).toBe("가나다AB");
    expect(pt.getCharList().length).toBe(5);
  });
});
