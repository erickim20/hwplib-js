import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as CFB from "cfb";
import { inflateSync } from "fflate";
import { HWPLIB_JS_VERSION } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(join(here, "fixtures", name));

describe("scaffold", () => {
  it("exposes a version", () => {
    expect(typeof HWPLIB_JS_VERSION).toBe("string");
  });

  it("cfb can open a real HWP fixture and list HWP v5 streams", () => {
    const cf = CFB.read(new Uint8Array(fixture("blank.hwp")), { type: "buffer" });
    const names = cf.FullPaths.map((p) => p.replace(/^[^/]*\//, "")).filter(Boolean);
    expect(names).toContain("FileHeader");
    expect(names).toContain("DocInfo");
    expect(names).toContain("BodyText/Section0");
  });

  it("fflate raw-inflates the DocInfo stream", () => {
    const cf = CFB.read(new Uint8Array(fixture("blank.hwp")), { type: "buffer" });
    const docInfo = CFB.find(cf, "DocInfo");
    expect(docInfo).toBeTruthy();
    const inflated = inflateSync(new Uint8Array(docInfo!.content as Uint8Array));
    expect(inflated.length).toBeGreaterThan(docInfo!.content.length);
  });
});
