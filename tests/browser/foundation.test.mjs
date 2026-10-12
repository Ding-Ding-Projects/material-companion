import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  canonicalScope,
  scopeMatches,
  validateProject,
  validateInput,
  AdapterRegistry,
} from "../../adapter-kit/index.mjs";
import {
  loadVocabulary,
  ownedLabel,
  boundedSearch,
  PresentationStore,
} from "../../extension/src/presentation.mjs";
const fixture = async (name) =>
  JSON.parse(
    await readFile(
      new URL(`../../fixtures/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
test("two independent descriptor inventories validate without identifier assumptions", async () => {
  for (const name of ["material-system-care", "conformance-project"])
    assert.ok(validateProject(await fixture(name)).surfaces.length);
});
test("scope excludes siblings, lookalike origins, subframes and encoded ambiguity", () => {
  const s = canonicalScope("https://example.github.io", "/lab/");
  assert.ok(scopeMatches(s, "https://example.github.io/lab/catalogue/?q=x"));
  for (const u of [
    "https://example.github.io/laboratory/",
    "https://example.github.io.evil.test/lab/",
    "https://example.github.io/lab/%2e%2e/",
    "https://example.github.io/lab%2fsecret/",
    "https://example.github.io/lab\\secret/",
  ])
    assert.equal(scopeMatches(s, u), false);
  assert.equal(scopeMatches(s, "https://example.github.io/lab/", 1), false);
  for (const path of ["/lab", "/lab/../", "/lab/%61/", "//lab/", "/lab/?x"])
    assert.throws(() => canonicalScope(s.origin, path));
});
test("negative descriptor mutations reject executable fields, duplicate identifiers, missing links and hierarchy cycles", async () => {
  const base = await fixture("conformance-project");
  for (const mutate of [
    (p) => (p.script = "alert(1)"),
    (p) => (p.surfaces[0].elements[1].id = p.surfaces[0].elements[0].id),
    (p) => (p.surfaces[0].elements[1].actions = ["missing"]),
    (p) => (p.surfaces[0].elements[0].parentId = "catalogue.quantity"),
    (p) => (p.surfaces[0].route = "/outside/"),
    (p) => (p.actions[0].effect = "shell"),
    (p) => (p.schemaVersion = 2),
  ]) {
    const p = structuredClone(base);
    mutate(p);
    assert.throws(() => validateProject(p));
  }
});
test("input schema bounds actual invocation", async () => {
  const p = await fixture("conformance-project");
  assert.equal(validateInput(p.actions[0], 50), 50);
  assert.throws(() => validateInput(p.actions[0], 51));
  const kit = new AdapterRegistry();
  kit.register(p, { "quantity.double": (x) => x * 2 });
  assert.equal(kit.discover("https://example.github.io/lab/").length, 1);
  assert.equal(kit.discover("https://example.github.io/lab/", 2).length, 0);
  const operation = await kit.invoke(p.id, "quantity.double", 3, {
    url: "https://example.github.io/lab/",
  });
  assert.equal((await operation.promise).result, 6);
  await assert.rejects(
    kit.invoke(p.id, "quantity.double", 3, {
      url: "https://example.github.io/other/",
    }),
  );
});
test("navigation invalidation aborts stale operation and suppresses progress", async () => {
  const p = await fixture("conformance-project"),
    kit = new AdapterRegistry();
  let release;
  const wait = new Promise((r) => {
    release = r;
  });
  const progress = [];
  kit.register(p, {
    "quantity.double": async (x, ctx) => {
      await wait;
      ctx.progress(1);
      return x * 2;
    },
  });
  const op = await kit.invoke(p.id, "quantity.double", 3, {
    url: "https://example.github.io/lab/",
    progress: (x) => progress.push(x),
  });
  kit.invalidate();
  release();
  await assert.rejects(op.promise);
  assert.deepEqual(progress, []);
});
test("cancel only works when declared and native action never invokes local handler", async () => {
  const p = await fixture("material-system-care"),
    kit = new AdapterRegistry();
  kit.register(p, {
    "summary.length": (x) => x.length,
    "text.sha256": () => assert.fail("native handler must not run"),
  });
  await assert.rejects(
    kit.invoke(p.id, "text.sha256", "x", {
      url: p.scope.origin + p.scope.path,
    }),
  );
});
test("personal presentation validates atomically and never mutates source labels", () => {
  const v = loadVocabulary(
    '{"schemaVersion":1,"entries":{"Projects":"Collections"}}',
  );
  assert.equal(ownedLabel("Projects", v), "Collections");
  assert.equal(ownedLabel("Other", v), "Other");
  assert.equal(ownedLabel("Projects", undefined), "Projects");
  for (const raw of [
    "{}",
    '{"schemaVersion":2,"entries":{}}',
    '{"schemaVersion":1,"entries":{"x":5}}',
    '{"schemaVersion":1,"entries":{"__proto__":"x"}}',
    '{"schemaVersion":1,"entries":{},"script":"x"}',
  ])
    assert.throws(() => loadVocabulary(raw));
});
test("bounded anchored search rejects unsafe patterns and preserves literal mode", () => {
  assert.ok(boundedSearch("^abc$", true)("abc"));
  assert.equal(boundedSearch("^abc$", true)("abcdef"), false);
  assert.ok(boundedSearch("a.b", false)("a.b"));
  for (const pattern of ["(a+)+", "(?=a)", "(a)\\1", "a{1,}"])
    assert.throws(() => boundedSearch(pattern, true));
  assert.throws(() => boundedSearch("x".repeat(257)));
});
test("presentation replacement persists atomically, invalid replacement keeps prior, clear restores and corrupt cache recovers", async () => {
  const cache = {};
  const storage = {
    get: async (key) => ({ [key]: cache[key] }),
    set: async (value) => Object.assign(cache, structuredClone(value)),
    remove: async (key) => {
      delete cache[key];
    },
  };
  const first = new PresentationStore(storage);
  assert.equal(await first.restore(), "original");
  await first.replace(
    '{"schemaVersion":1,"entries":{"Projects":"Collections"}}',
  );
  const second = new PresentationStore(storage);
  assert.equal(await second.restore(), "loaded");
  assert.equal(ownedLabel("Projects", second.current), "Collections");
  await assert.rejects(second.replace('{"entries":{}}'));
  assert.equal(ownedLabel("Projects", second.current), "Collections");
  await second.replace('{"schemaVersion":1,"entries":{"Projects":"Records"}}');
  assert.equal(ownedLabel("Projects", second.current), "Records");
  await second.clear();
  assert.equal(ownedLabel("Projects", second.current), "Projects");
  cache.vocabulary = { schemaVersion: 100, entries: {} };
  assert.equal(await second.restore(), "corrupt-cache-cleared");
  assert.equal(cache.vocabulary, undefined);
});
test("declared cancellation aborts a running handler and yields no successful result", async () => {
  const p = await fixture("conformance-project"),
    kit = new AdapterRegistry();
  let release;
  const wait = new Promise((r) => {
    release = r;
  });
  kit.register(p, {
    "quantity.double": async (x) => {
      await wait;
      return x * 2;
    },
  });
  const op = await kit.invoke(p.id, "quantity.double", 5, {
    url: p.scope.origin + p.scope.path,
  });
  kit.cancel(op.operationId);
  release();
  await assert.rejects(op.promise);
});
test("nonstandard origin ports and absent native grant inventory are rejected", async () => {
  assert.throws(() => canonicalScope("https://example.github.io:444", "/lab/"));
  const p = await fixture("material-system-care");
  p.capabilities = [];
  assert.throws(() => validateProject(p));
});
test("portable schema retains all four strict versioned descriptor definitions", async () => {
  const schema = JSON.parse(await readFile(new URL("../../adapter-kit/descriptors.schema.json", import.meta.url), "utf8"));
  assert.equal(schema.$ref, "#/$defs/ProjectDescriptor");
  for (const name of ["ProjectDescriptor", "SurfaceDescriptor", "ElementDescriptor", "ActionDescriptor"]) {
    assert.equal(schema.$defs[name].additionalProperties, false);
    assert.ok(schema.$defs[name].required.includes("id"));
  }
  assert.equal(schema.$defs.ProjectDescriptor.properties.schemaVersion.const, 1);
});
