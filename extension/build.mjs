import { build } from "esbuild";
import { mkdir, copyFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
await mkdir("dist", { recursive: true });
await build({
  entryPoints: ["src/workspace.ts", "src/background.ts"],
  outdir: "dist",
  bundle: true,
  format: "esm",
  target: "chrome120",
  sourcemap: false,
  legalComments: "eof",
});
for (const name of ["manifest.json", "workspace.html"])
  await copyFile(name, `dist/${name}`);
await writeFile(
  "dist/build.json",
  JSON.stringify({
    version: "0.1.0",
    builtAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
  }),
);
console.log("Extension built: dist (unpacked Manifest V3 package)");
