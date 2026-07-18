// Minify every .js file in a dist directory in place, preserving the directory
// structure (so subpath exports keep resolving). Used for the production build of
// hwplib-js, which is built structure-preserving by tsc rather than bundled.
import { build } from "esbuild";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { argv, exit } from "node:process";

const root = argv[2];
if (!root) {
  console.error("usage: node minify-dist.mjs <dist-dir>");
  exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".js")) out.push(p);
  }
  return out;
}

const entryPoints = walk(root);
await build({
  entryPoints,
  outdir: root,
  outbase: root,
  allowOverwrite: true,
  bundle: false,
  minify: true,
  format: "esm",
  sourcemap: true,
  logLevel: "error",
});
console.log(`minified ${entryPoints.length} files in ${root}`);
