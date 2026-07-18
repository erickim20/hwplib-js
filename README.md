# hwplib-js

Isomorphic TypeScript engine for reading and writing **HWP** (Hangul Word Processor, `.hwp` v5)
files. One pure-JS codebase, no native addons — runs unchanged in the **browser**, **Electron**,
and **Node**. `Uint8Array` in, `Uint8Array` out.

> **This is a JavaScript/TypeScript port of [`hwplib`](https://github.com/neolord0/hwplib) by
> [neolord0](https://github.com/neolord0)** — a faithful, structure-preserving port of **hwplib
> 1.1.10** (Apache-2.0). The object model, reader, writer, and `BlankFileMaker` are ported 1:1
> from the original Java. Where the original bundles Apache POI for the OLE2/CFB container and
> DEFLATE, this port delegates those to [`cfb`](https://github.com/SheetJS/js-cfb) and
> [`fflate`](https://github.com/101arrowz/fflate). See [`NOTICE`](NOTICE) for full attribution.

## Install

```bash
npm install hwplib-js
```

## Usage

```ts
import { HWPReader, HWPWriter, BlankFileMaker } from "hwplib-js";

const file = HWPReader.fromBytes(bytes);      // parse a .hwp (Uint8Array)
const text = file
  .getBodyText()
  .getSectionList()[0]
  .getParagraphs()
  .map((p) => p.getNormalString() ?? "")
  .join("\n");

const out = HWPWriter.toBytes(file);          // serialize back to .hwp bytes
const blank = BlankFileMaker.make();          // a valid empty document

// Deep imports mirror the original Java package path:
import { Alignment } from "hwplib-js/object/docinfo/parashape/Alignment";
```

The engine speaks only `Uint8Array` — it never touches `fs`, `File`, or the DOM, so the same
build runs everywhere. Environment-specific concerns (file pickers, `fs`, HTML) belong in thin
adapters at the edges of your app.

## Status

Ported and validated against Java hwplib: reads and writes real `.hwp` files with golden
round-trip fidelity, and builds documents from scratch via `BlankFileMaker`. The public test
suite here exercises the binary primitives, object model, CFB container, and a self-generated
read → write → re-read round-trip.

## Development

```bash
npm install
npm run build       # tsc (structure-preserving) + esbuild minify → dist/
npm run typecheck
npm test            # vitest
```

The production build compiles with `tsc` preserving the directory structure (so the
`hwplib-js/*` subpath exports keep resolving) and then minifies each emitted file in place.

## Relationship to hwplib

`hwplib-js` tracks the public [`hwplib`](https://github.com/neolord0/hwplib) object model closely
so that behavior and file compatibility match the reference implementation. It is an independent
port maintained separately from the upstream Java project; issues and PRs about the port belong
here, not upstream.

## License

[Apache-2.0](LICENSE) — as a derivative work of hwplib (Apache-2.0). See [`NOTICE`](NOTICE).
