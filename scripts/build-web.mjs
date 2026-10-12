import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  rename,
  stat,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  cwd: root,
  encoding: "utf8",
  windowsHide: true,
})
  .split("\0")
  .filter(Boolean);
async function inputs() {
  const rows = [];
  for (const p of tracked) {
    if (
      p.startsWith("docs/") ||
      p.startsWith("website/") ||
      p === "scripts/build-web.mjs" ||
      p === "build.bat"
    )
      rows.push({
        path: p,
        sha256: createHash("sha256")
          .update(await readFile(path.join(root, p)))
          .digest("hex"),
      });
  }
  return {
    source: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
  windowsHide: true,
    }).trim(),
    files: rows,
  };
}
const before = await inputs();
const wiki = JSON.parse(await readFile(path.join(root, "docs/wiki-source.json"), "utf8"));
if (wiki.schemaVersion !== 1 || wiki.state !== "source-unavailable" || typeof wiki.reason !== "string") throw new Error("Invalid wiki source availability record.");
const articles = [];
async function scan(dir) {
  for (const e of await readdir(path.join(root, dir), {
    withFileTypes: true,
  })) {
    const p = dir + "/" + e.name;
    if (e.isDirectory()) await scan(p);
    else if (e.name.endsWith(".md")) {
      const markdown = await readFile(path.join(root, p), "utf8");
      articles.push({
        id: p.replace(/\.md$/, ""),
        source: p,
        title: markdown.match(/^#\s+(.+)$/m)?.[1] || e.name,
        category: p.split("/").slice(0, -1).join("/"),
        markdown,
        sha256: createHash("sha256").update(markdown).digest("hex"),
      });
    }
  }
}
await scan("docs");
let source = "unavailable",
  updated = "unavailable";
try {
  source = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  windowsHide: true,
  }).trim();
  updated = execFileSync("git", ["show", "-s", "--format=%cI", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  windowsHide: true,
  }).trim();
} catch {}
await mkdir(path.join(root, "website/src/generated"), { recursive: true });
await writeFile(
  path.join(root, "website/src/generated/content.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      version: "0.1.0",
      source,
      updated,
      articles,
      wiki,
    },
    null,
    2,
  ),
);
if (process.argv.includes("--prepare-content-only")) {
  console.log(`Prepared ${articles.length} complete articles without a build.`);
  process.exit(0);
}
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const staging = path.join(root, ".cache", "website-producers", randomUUID());
await mkdir(staging, { recursive: true });
for (const args of [
  ["ci", "--no-audit", "--no-fund"],
  ["run", "build"],
]) {
  const p = spawnSync(npm, args, {
    cwd: path.join(root, "website"),
    stdio: "inherit",
    windowsHide: true,
    shell: process.platform === "win32",
    env:{...process.env,MATERIAL_COMPANION_WEB_OUTDIR:staging},
  });
  if (p.status !== 0) process.exit(p.status || 1);
}
const after = await inputs();
if (JSON.stringify(before) !== JSON.stringify(after))
  throw new Error(
    "Website source changed during the producer; output is not accepted.",
  );
const outputs = [];
async function outputInventory(dir, prefix = "") {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = prefix + e.name;
    if (e.isDirectory()) await outputInventory(path.join(dir, e.name), p + "/");
    else
      outputs.push({
        path: p,
        sha256: createHash("sha256")
          .update(await readFile(path.join(dir, e.name)))
          .digest("hex"),
      });
  }
}
await outputInventory(staging);
const dist = path.join(root, "website", "dist");
try {
  await stat(dist);
  await rename(
    dist,
    path.join(root, ".cache", "website-producers", "previous-" + randomUUID()),
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
await rename(staging, dist);
await writeFile(
  path.join(root, "website/dist/build-receipt.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      source,
      updated,
      version: "0.1.0",
      articles: articles.map(({ id, source, sha256 }) => ({
        id,
        source,
        sha256,
      })),
      wiki,
      inputs: before,
      files: outputs,
      sourceFrozen: true,
    },
    null,
    2,
  ),
);
console.log(
  `Website build: ${articles.length} complete articles, source ${source}; wiki source unavailable; completeness unresolved.`,
);
