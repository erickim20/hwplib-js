import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import * as BitFlag from "../src/util/binary/BitFlag.js";
import { Compressor } from "../src/util/binary/Compressor.js";
import { Obfuscation } from "../src/util/binary/Obfuscation.js";
import { FileVersion } from "../src/object/fileheader/FileVersion.js";
import { StreamReader } from "../src/util/compoundFile/reader/StreamReader.js";
import { StreamWriter } from "../src/util/compoundFile/writer/StreamWriter.js";
import { CompoundFileReader } from "../src/util/compoundFile/reader/CompoundFileReader.js";
import { CompoundFileWriter } from "../src/util/compoundFile/writer/CompoundFileWriter.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => new Uint8Array(readFileSync(join(here, "fixtures", name)));

describe("BitFlag (safe arithmetic, correct above bit 31)", () => {
  it("get / getRange", () => {
    expect(BitFlag.get(0x1, 0)).toBe(true);
    expect(BitFlag.get(0x2, 0)).toBe(false);
    expect(BitFlag.get(0x80000000, 31)).toBe(true); // bit 31 — would break with 32-bit ops
    expect(BitFlag.getRange(0x05000202, 24, 31)).toBe(5);
    expect(BitFlag.getRange(0xfff00000, 20, 31)).toBe(4095); // record size field, bit 31 set
  });

  it("set / setRange round-trip a record header", () => {
    let header = 0;
    header = BitFlag.setRange(header, 0, 9, 66); // tagID
    header = BitFlag.setRange(header, 10, 19, 3); // level
    header = BitFlag.setRange(header, 20, 31, 4095); // size
    expect(BitFlag.getRange(header, 0, 9)).toBe(66);
    expect(BitFlag.getRange(header, 10, 19)).toBe(3);
    expect(BitFlag.getRange(header, 20, 31)).toBe(4095);
    expect(BitFlag.set(0, 31, true)).toBe(2 ** 31);
  });
});

describe("FileVersion", () => {
  it("packs/unpacks and stringifies like hwplib", () => {
    const fv = new FileVersion();
    fv.setVersion(0x05000202);
    expect(fv.toString()).toBe("5.0.2.2.");
    expect(fv.getMM()).toBe(5);
    expect(fv.getVersion()).toBe(0x05000202);
  });

  it("isOver is over-or-equal", () => {
    const fv = new FileVersion();
    fv.setVersion(0x05000202);
    expect(fv.isOver(5, 0, 2, 2)).toBe(true); // equal
    expect(fv.isOver(5, 0, 0, 0)).toBe(true);
    expect(fv.isOver(5, 0, 2, 3)).toBe(false);
  });
});

describe("Compressor (raw deflate + hwplib trailer)", () => {
  it("round-trips and appends the 8-byte trailer", () => {
    const original = new Uint8Array(1000).map((_, i) => (i * 37) & 0xff);
    const compressed = Compressor.compress(original);
    // last 4 bytes = original length, little-endian
    const trailerLen = new DataView(compressed.buffer).getUint32(compressed.length - 4, true);
    expect(trailerLen).toBe(original.length);
    const back = Compressor.decompress(compressed);
    expect(Array.from(back)).toEqual(Array.from(original));
  });

  it("inflates the real DocInfo stream from a fixture", () => {
    const cfr = new CompoundFileReader(fixture("blank.hwp"));
    const sr = cfr.getChildStreamReader("DocInfo", true, null);
    expect(sr.getSize()).toBeGreaterThan(0);
  });
});

describe("Obfuscation", () => {
  it("is a no-op unless the block is exactly 256 bytes", () => {
    const short = new Uint8Array(10).fill(0xaa);
    Obfuscation.transform(short);
    expect(short.every((b) => b === 0xaa)).toBe(true);
  });

  it("leaves the first 4 (seed) bytes intact and is deterministic", () => {
    const a = new Uint8Array(256).map((_, i) => (i * 7) & 0xff);
    const b = a.slice();
    Obfuscation.transform(a);
    Obfuscation.transform(b);
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Array.from(a.subarray(0, 4))).toEqual([0, 7, 14, 21]);
  });
});

describe("StreamWriter -> StreamReader round-trip", () => {
  it("preserves every scalar type", () => {
    const w = new StreamWriter("t", false, null);
    w.writeSInt1(-5);
    w.writeUInt1(200);
    w.writeSInt2(-1000);
    w.writeUInt2(60000);
    w.writeSInt4(-100000);
    w.writeUInt4(4000000000);
    w.writeFloat(1.5);
    w.writeDouble(3.14159);
    w.writeUTF16LEString("가나다ABC");
    w.writeRecordHeader(66, 10);

    const r = new StreamReader(w.getData(), null);
    expect(r.readSInt1()).toBe(-5);
    expect(r.readUInt1()).toBe(200);
    expect(r.readSInt2()).toBe(-1000);
    expect(r.readUInt2()).toBe(60000);
    expect(r.readSInt4()).toBe(-100000);
    expect(r.readUInt4()).toBe(4000000000);
    expect(r.readFloat()).toBeCloseTo(1.5, 5);
    expect(r.readDouble()).toBeCloseTo(3.14159, 5);
    expect(r.readUTF16LEString()).toBe("가나다ABC");
    const h = r.readRecordHeader();
    expect(h.getTagID()).toBe(66);
    expect(h.getSize()).toBe(10);
  });
});

describe("CompoundFileReader on a real HWP fixture", () => {
  it("reads the FileHeader: signature, version, flags", () => {
    const cfr = new CompoundFileReader(fixture("blank.hwp"));
    const sr = cfr.getChildStreamReader("FileHeader", false, null);
    const sig = new TextDecoder("latin1").decode(sr.readBytes(32));
    expect(sig.startsWith("HWP Document File")).toBe(true);

    const fv = new FileVersion();
    fv.setVersion(sr.readUInt4());
    expect(fv.toString()).toBe("5.0.3.4."); // version BlankFileMaker stamps

    const flags = sr.readUInt4();
    expect(BitFlag.get(flags, 0)).toBe(true); // compressed
    expect(BitFlag.get(flags, 2)).toBe(false); // not distribution
  });

  it("navigates BodyText and reads the first Section0 record header", () => {
    const cfr = new CompoundFileReader(fixture("blank.hwp"));
    const names = cfr.listChildNames();
    expect(names).toContain("FileHeader");
    expect(names).toContain("DocInfo");
    expect(names).toContain("BodyText");

    cfr.moveChildStorage("BodyText");
    expect(cfr.isChildStream("Section0")).toBe(true);
    const sr = cfr.getChildStreamReader("Section0", true, null);
    const h = sr.readRecordHeader();
    expect(h.getTagID()).toBeGreaterThan(0);
    expect(h.getSize()).toBeGreaterThan(0);
    expect(sr.getCurrentPosition()).toBeLessThanOrEqual(sr.getSize());
  });
});

describe("CompoundFileWriter -> CompoundFileReader round-trip", () => {
  it("preserves stream bytes across nested storages", () => {
    const fileHeader = new Uint8Array(256).map((_, i) => i & 0xff);
    const section = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

    const w = new CompoundFileWriter();
    w.addStream("FileHeader", fileHeader);
    w.addStream("BodyText/Section0", section);
    const bytes = w.write();

    const r = new CompoundFileReader(bytes);
    expect(Array.from(r.getChildStreamData("FileHeader"))).toEqual(Array.from(fileHeader));
    r.moveChildStorage("BodyText");
    expect(Array.from(r.getChildStreamData("Section0"))).toEqual(Array.from(section));
  });
});
