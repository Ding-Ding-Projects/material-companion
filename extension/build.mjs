import { build } from "esbuild";
import { copyFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { createOutputStage, publishOutput } from "./output.mjs";
const stage = await createOutputStage(process.cwd());
await build({
  entryPoints: ["src/workspace.ts", "src/background.ts"],
  outdir: stage,
  bundle: true,
  format: "esm",
  target: "chrome120",
  sourcemap: false,
  legalComments: "eof",
});
for (const name of ["manifest.json", "workspace.html"])
  await copyFile(name, join(stage, name));
await writeFile(
  join(stage, "build.json"),
  JSON.stringify({
    version: "0.1.0",
    builtAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
  }),
);
await publishOutput(process.cwd(), stage);
console.log("Extension built: dist (unpacked Manifest V3 package)");
