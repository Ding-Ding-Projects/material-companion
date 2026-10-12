import {
  canonicalScope,
  scopeMatches,
  validateProject,
} from "../../adapter-kit/index.mjs";
const HOST = "org.material_companion.host";
let nativePort: chrome.runtime.Port | undefined;
let nativeState = "disconnected";
let reviewTransport = "unavailable";
function canonicalObject(value: any): any {
  if (Array.isArray(value)) return value.map(canonicalObject);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalObject(value[key])]),
    );
  return value;
}
const pending = new Map<string, (value: unknown) => void>();
const documents = new Map<
  number,
  { id: string; url: string; descriptor: any }
>();
async function scopes() {
  return (await chrome.storage.local.get("scopes")).scopes ?? [];
}
async function active() {
  return (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
}
function connect() {
  if (nativePort) nativePort.disconnect();
  nativeState = "connecting";
  reviewTransport = "unavailable";
  try {
    const port = chrome.runtime.connectNative(HOST);
    nativePort = port;
    port.onMessage.addListener((reply) => {
      if (nativePort !== port) return;
      if (reply?.version !== 1) {
        nativeState = "incompatible";
        port.disconnect();
        return;
      }
      if (nativeState === "connecting") {
        nativeState = reply.state === "ready" ? "ready" : "rejected";
        reviewTransport = reply.reviewTransport ?? "unavailable";
      }
      const id = reply.requestId;
      if (typeof id === "string") {
        pending.get(id)?.(reply);
        pending.delete(id);
      }
    });
    port.onDisconnect.addListener(() => {
      if (nativePort !== port) return;
      if (nativeState !== "incompatible" && nativeState !== "rejected")
        nativeState = chrome.runtime.lastError ? "absent" : "disconnected";
      nativePort = undefined;
      reviewTransport = "unavailable";
      for (const resolve of pending.values())
        resolve({ version: 1, state: nativeState });
      pending.clear();
    });
    port.postMessage({ method: "hello", request: {}, version: 1 });
  } catch {
    nativeState = "absent";
  }
}
async function discover() {
  const tab = await active();
  if (!tab?.id || !tab.url) return { state: "unsupported-page" };
  const permitted = (await scopes()).find(
    (s: any) => s.enabled && scopeMatches(s, tab.url, 0),
  );
  if (!permitted) return { state: "out-of-scope", url: tab.url };
  if (
    !(await chrome.permissions.contains({ origins: [permitted.origin + "/*"] }))
  )
    return { state: "permission-required", url: tab.url };
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      func: () => {
        const node = document.querySelector(
          'script[type="application/json"][data-material-companion]',
        );
        if (!node) return null;
        const text = node.textContent ?? "";
        return text.length <= 131072 ? text : null;
      },
    });
    const result = results[0];
    if (!result?.result) return { state: "descriptor-absent", url: tab.url };
    const descriptor = validateProject(JSON.parse(result.result));
    if (
      descriptor.scope.origin !== permitted.origin ||
      descriptor.scope.path !== permitted.path
    )
      return { state: "descriptor-scope-mismatch", url: tab.url };
    const id = result.documentId ?? crypto.randomUUID();
    documents.set(tab.id, { id, url: tab.url, descriptor });
    return {
      state: "ready",
      url: tab.url,
      documentId: id,
      tabId: tab.id,
      descriptor,
    };
  } catch {
    return { state: "descriptor-invalid", url: tab.url };
  }
}
chrome.tabs.onUpdated.addListener((id, change) => {
  if (change.status === "loading" || change.url) documents.delete(id);
});
chrome.tabs.onRemoved.addListener((id) => documents.delete(id));
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (
    sender.id !== chrome.runtime.id ||
    sender.tab ||
    !sender.url?.startsWith(chrome.runtime.getURL(""))
  )
    return false;
  (async () => {
    if (message?.type === "discover") return discover();
    if (message?.type === "native-state")
      return { state: nativeState, reviewTransport };
    if (message?.type === "native-connect") {
      connect();
      return { state: nativeState };
    }
    if (message?.type === "scope-save") {
      const scope = canonicalScope(message.origin, message.path);
      const list = await scopes();
      const index = list.findIndex(
        (s: any) => s.origin === scope.origin && s.path === scope.path,
      );
      const item = { ...scope, enabled: message.enabled === true };
      if (index < 0) list.push(item);
      else list[index] = item;
      if (list.length > 64) throw new Error("Scope limit reached");
      await chrome.storage.local.set({ scopes: list });
      return { state: "saved" };
    }
    if (message?.type === "scope-list") return { scopes: await scopes() };
    if (message?.type === "native-submit") {
      const tab = await active(),
        doc = tab?.id ? documents.get(tab.id) : undefined;
      if (!doc || doc.id !== message.documentId || doc.url !== tab?.url)
        return { state: "stale-document" };
      if (nativeState !== "ready" || !nativePort) return { state: nativeState };
      if (reviewTransport === "unavailable")
        return { state: "native-review-transport-unavailable" };
      if (
        typeof message.text !== "string" ||
        message.text.length > 8192 ||
        !Number.isSafeInteger(message.grantGeneration) ||
        message.grantGeneration < 1
      )
        return { state: "invalid-input" };
      const requestId = crypto.randomUUID();
      const request = {
        actionId: "text.sha256",
        adapterVersion: "1",
        documentId: doc.id,
        frameId: "0",
        grantGeneration: message.grantGeneration,
        projectId: doc.descriptor.id,
        requestId,
        scope: doc.descriptor.scope.origin + doc.descriptor.scope.path,
        text: message.text,
        tabId: String(tab!.id),
        targetId: "submitted-data",
        targetRevision: "1",
        url: doc.url,
      };
      return new Promise((resolve) => {
        pending.set(requestId, resolve);
        nativePort!.postMessage(
          canonicalObject({ method: "submit", request, version: 1 }),
        );
        setTimeout(() => {
          if (pending.delete(requestId))
            resolve({ state: "timeout", requestId });
        }, 10000);
      });
    }
    throw new Error("Unsupported request");
  })().then(respond, () => respond({ state: "invalid-request" }));
  return true;
});
