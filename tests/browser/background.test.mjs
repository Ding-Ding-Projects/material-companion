import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { fileURLToPath } from "node:url";
import { build } from "../../extension/node_modules/esbuild/lib/main.js";
const source = await build({
  entryPoints: [
    fileURLToPath(
      new URL("../../extension/src/background.ts", import.meta.url),
    ),
  ],
  bundle: true,
  format: "iife",
  write: false,
  platform: "browser",
});
const descriptor = JSON.parse(
  await readFile(
    new URL("../../fixtures/conformance-project.json", import.meta.url),
    "utf8",
  ),
);
function host() {
  const events = {},
    outgoing = [],
    store = { scopes: [{ ...descriptor.scope, enabled: true }] };
  let permission = true;
  const tab = { id: 7, url: "https://example.github.io/lab/" };
  const event = (name) => ({
    addListener: (fn) => {
      events[name] = fn;
    },
  });
  const nativePort = {
    onMessage: event("nativeMessage"),
    onDisconnect: event("nativeDisconnect"),
    postMessage: (message) => outgoing.push(message),
    disconnect: () => events.nativeDisconnect?.(),
  };
  const chrome = {
    storage: {
      local: {
        get: async (key) => ({ [key]: store[key] }),
        set: async (data) => Object.assign(store, data),
      },
    },
    tabs: {
      query: async () => [tab],
      onUpdated: event("updated"),
      onRemoved: event("removed"),
    },
    permissions: { contains: async () => permission },
    scripting: {
      executeScript: async (target) => {
        assert.deepEqual(JSON.parse(JSON.stringify(target.target)), {
          tabId: 7,
          frameIds: [0],
        });
        return [
          { result: JSON.stringify(descriptor), documentId: "document-one" },
        ];
      },
    },
    runtime: {
      id: "test-extension",
      getURL: (path) => "chrome-extension://test-extension/" + path,
      connectNative: () => nativePort,
      onMessage: event("message"),
    },
    sidePanel: { setPanelBehavior: async () => {} },
  };
  runInNewContext(source.outputFiles[0].text, {
    chrome,
    URL,
    crypto: webcrypto,
    structuredClone,
    setTimeout: () => 0,
    console,
  });
  const sender = {
    id: "test-extension",
    url: "chrome-extension://test-extension/workspace.html",
  };
  const send = (message, customSender = sender) =>
    new Promise((resolve) => {
      if (!events.message(message, customSender, resolve)) resolve("ignored");
    });
  return {
    send,
    events,
    outgoing,
    store,
    tab,
    setPermission: (value) => {
      permission = value;
    },
  };
}
test("background rejects page senders and discovers only exact enabled top-frame scope", async () => {
  const h = host();
  assert.equal(
    await h.send(
      { type: "discover" },
      {
        id: "test-extension",
        url: "https://example.github.io/lab/",
        tab: { id: 7 },
      },
    ),
    "ignored",
  );
  assert.equal((await h.send({ type: "discover" })).state, "ready");
  h.tab.url = "https://example.github.io/lab-other/";
  assert.equal((await h.send({ type: "discover" })).state, "out-of-scope");
  h.tab.url = "https://example.github.io/lab/";
  h.setPermission(false);
  assert.equal(
    (await h.send({ type: "discover" })).state,
    "permission-required",
  );
});
test("background navigation invalidates native document and hello cannot imply available review transport", async () => {
  const h = host();
  const d = await h.send({ type: "discover" });
  await h.send({ type: "native-connect" });
  assert.deepEqual(JSON.parse(JSON.stringify(h.outgoing[0])), {
    method: "hello",
    request: {},
    version: 1,
  });
  h.events.nativeMessage({
    version: 1,
    state: "ready",
    capabilities: ["text.sha256"],
    reviewTransport: "unavailable",
  });
  assert.equal(
    (await h.send({ type: "native-state" })).reviewTransport,
    "unavailable",
  );
  assert.equal(
    (
      await h.send({
        type: "native-submit",
        documentId: d.documentId,
        text: "ordinary text",
        grantGeneration: 1,
      })
    ).state,
    "native-review-transport-unavailable",
  );
  h.events.updated(7, { status: "loading" });
  assert.equal(
    (
      await h.send({
        type: "native-submit",
        documentId: d.documentId,
        text: "ordinary text",
        grantGeneration: 1,
      })
    ).state,
    "stale-document",
  );
  assert.equal(h.outgoing.length, 1);
});
test("incompatible native protocol keeps its reason after disconnect", async () => {
  const h = host();
  await h.send({ type: "native-connect" });
  h.events.nativeMessage({ version: 2, state: "ready" });
  assert.equal((await h.send({ type: "native-state" })).state, "incompatible");
});
