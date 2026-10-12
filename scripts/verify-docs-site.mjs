import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(
  await readFile(path.join(root, "website/src/generated/content.json"), "utf8"),
);
const paths = [];
async function walk(p) {
  for (const e of await readdir(path.join(root, p), { withFileTypes: true })) {
    const f = p + "/" + e.name;
    if (e.isDirectory()) await walk(f);
    else if (f.endsWith(".md")) paths.push(f);
  }
}
await walk("docs");
assert.deepEqual(
  data.articles.map((a) => a.source).sort(),
  paths.sort(),
  "Article inventory must match every current Markdown article.",
);
for (const a of data.articles) {
  const raw = await readFile(path.join(root, a.source), "utf8");
  assert.equal(a.markdown, raw);
  assert.equal(a.sha256, createHash("sha256").update(raw).digest("hex"));
}
const index = await readFile(
  path.join(root, "website/dist/index.html"),
  "utf8",
);
assert(!/https?:\/\//.test(index), "No remote bootstrap dependency.");
assert(index.includes("companion-docs"));
assert.equal(data.wiki.state, "source-unavailable");
assert.equal(data.wiki.inventoryComplete, false);
assert.deepEqual(data.wiki, JSON.parse(await readFile(path.join(root,"docs/wiki-source.json"),"utf8")));
const assets = await readdir(path.join(root, "website/dist/assets"));
assert(assets.some((a) => a.endsWith(".js")));
assert(assets.some((a) => a.endsWith(".css")));
const receipt=JSON.parse(await readFile(path.join(root,'website/dist/build-receipt.json'),'utf8'));
const actual=[];async function outputs(dir,prefix=''){for(const e of await readdir(dir,{withFileTypes:true})){const p=prefix+e.name;if(e.isDirectory())await outputs(path.join(dir,e.name),p+'/');else if(p!=='build-receipt.json')actual.push(p);}}await outputs(path.join(root,'website/dist'));
assert.deepEqual(actual.sort(),receipt.files.map(f=>f.path).sort(),'Exact output inventory must match producer receipt.');
assert(actual.every(p=>p==='index.html'||p==='component-registry.json'||/^assets\/index-[\w-]+\.(css|js)$/.test(p)),'Unexpected output file is forbidden.');
for(const f of receipt.files)assert.equal(createHash('sha256').update(await readFile(path.join(root,'website/dist',f.path))).digest('hex'),f.sha256,'Output hash mismatch.');
assert.equal(receipt.sourceFrozen,true);
console.log(
  `PASS website inventory: ${paths.length} complete articles; offline bootstrap assets; explicit unavailable wiki source.`,
);
