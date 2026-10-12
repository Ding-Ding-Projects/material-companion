import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { build } from "../../extension/node_modules/esbuild/lib/main.js";
import {
  OperationLedger,
  reconcileOperations,
} from "../../extension/src/operations.mjs";
const source = await build({
  entryPoints: [
    fileURLToPath(new URL("../../extension/src/workspace.ts", import.meta.url)),
  ],
  bundle: true,
  format: "cjs",
  write: false,
  external: ["lit", "@material/web/*"],
});
function view() {
  let Klass;
  const timers = [];
  const chrome = {
    storage: {
      local: {
        get: async () => ({}),
        set: async () => {},
        remove: async () => {},
      },
      onChanged: { addListener() {}, removeListener() {} },
    },
  };
  runInNewContext(source.outputFiles[0].text, {
    module: { exports: {} },
    exports: {},
    require: (name) =>
      name === "lit"
        ? { LitElement: class {}, html: () => {}, css: () => {} }
        : {},
    chrome,
    customElements: {
      define: (name, k) => {
        Klass = k;
      },
    },
    crypto: webcrypto,
    AbortController,
    structuredClone,
    setTimeout: (fn) => timers.push(fn),
  });
  const instance = new Klass();
  instance.value = () => "one two";
  instance.save = async () => {};
  instance.persistOperation = async (operation) => {
    instance.operations = instance.operations.map((o) =>
      o.id === operation.id ? operation : o,
    );
    if (!instance.operations.some((o) => o.id === operation.id))
      instance.operations = [...instance.operations, operation];
  };
  return { instance, timers };
}
test("overlapping counts retain each captured cancellation controller", async () => {
  const { instance, timers } = view();
  const first = instance.countText();
  const firstController = instance.abort;
  const second = instance.countText();
  firstController.abort();
  await new Promise((r) => setImmediate(r));
  timers.shift()();
  timers.shift()();
  await Promise.all([first, second]);
  assert.equal(instance.operations[0].state, "cancelled");
  assert.equal(instance.operations[1].state, "completed");
});
test("storage-event replacement cannot regress a terminal operation", () => {
  const { instance } = view();
  const terminal = {
    id: "operation-one",
    kind: "text-count",
    state: "completed",
    createdAt: "2026-10-11T00:00:00Z",
  };
  instance.operations = [terminal];
  instance.storageChanged(
    { operations: { newValue: [{ ...terminal, state: "running" }] } },
    "local",
  );
  assert.equal(instance.operations[0].state, "completed");
});
test("authoritative ledger serializes concurrent view updates and preserves terminal records", async () => {
  let cache = [];
  const storage = {
    get: async () => ({ operations: structuredClone(cache) }),
    set: async (value) => {
      await new Promise((r) => setImmediate(r));
      cache = structuredClone(value.operations);
    },
  };
  const ledger = new OperationLedger(storage);
  const first = {
      id: "operation-first",
      kind: "text-count",
      state: "running",
      createdAt: "2026-10-11T00:00:00Z",
    },
    second = { ...first, id: "operation-second" };
  await Promise.all([ledger.update(first), ledger.update(second)]);
  await Promise.all([
    ledger.update({ ...first, state: "cancelled" }),
    ledger.update({ ...second, state: "completed" }),
    ledger.update(first),
  ]);
  assert.equal(cache.find((o) => o.id === first.id).state, "cancelled");
  assert.equal(cache.find((o) => o.id === second.id).state, "completed");
  const otherView = reconcileOperations([], cache);
  assert.deepEqual(reconcileOperations(otherView, [first]), otherView);
});
test("terminal updates target stable ID after a cloned collection replaces running objects", async () => {
  const { instance, timers } = view();
  const count = instance.countText();
  await new Promise((r) => setImmediate(r));
  instance.storageChanged(
    { operations: { newValue: structuredClone(instance.operations) } },
    "local",
  );
  timers.shift()();
  await count;
  assert.equal(instance.operations.length, 1);
  assert.equal(instance.operations[0].state, "completed");
});
test("Cancel falls back to the newest remaining active count after a later count finishes", async () => {
  const { instance, timers } = view();
  const first = instance.countText();
  const firstId = instance.operations[0].id;
  const second = instance.countText();
  await new Promise((r) => setImmediate(r));
  timers.splice(1, 1)[0]();
  await second;
  instance.abort.abort();
  timers.shift()();
  await first;
  assert.equal(
    instance.operations.find((op) => op.id === firstId).state,
    "cancelled",
  );
  assert.equal(instance.abort, undefined);
});
