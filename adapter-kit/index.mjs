const ID = /^[a-z][a-z0-9.-]{0,95}$/;
const roles = new Set(["group", "text", "boolean", "number", "choice"]);
const states = new Set(["ready", "loading", "disabled", "stale", "error"]);
const effects = new Set(["read", "local", "native"]);
function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}
function record(value, keys, name) {
  assert(
    value && typeof value === "object" && !Array.isArray(value),
    `${name}: expected object`,
  );
  assert(
    Object.keys(value).every((k) => keys.includes(k)),
    `${name}: unknown field`,
  );
}
function string(value, name, max = 512) {
  assert(
    typeof value === "string" &&
      value.length > 0 &&
      value.length <= max &&
      !/[\u0000-\u001f]/.test(value),
    `${name}: invalid string`,
  );
}
function id(value, name) {
  assert(
    typeof value === "string" && ID.test(value),
    `${name}: invalid identifier`,
  );
}
function list(value, name, max = 128) {
  assert(
    Array.isArray(value) && value.length <= max,
    `${name}: bounded array required`,
  );
}
export function canonicalScope(origin, path) {
  string(origin, "origin", 255);
  string(path, "path", 512);
  const u = new URL(origin);
  assert(
    u.protocol === "https:" &&
      /^[a-z0-9-]+\.github\.io$/.test(u.hostname) &&
      !u.port &&
      u.origin === origin &&
      u.pathname === "/" &&
      !u.search &&
      !u.hash &&
      !u.username &&
      !u.password,
    "Exact HTTPS GitHub Pages origin required",
  );
  assert(
    path.startsWith("/") &&
      path.endsWith("/") &&
      !/[\\%?#]/.test(path) &&
      !path.includes("//") &&
      !path.split("/").some((p) => p === "." || p === "..") &&
      /^\/[A-Za-z0-9._~/-]*$/.test(path),
    "Unambiguous absolute project path ending in / required",
  );
  return { origin: u.origin, path };
}
export function scopeMatches(scope, rawUrl, frameId = 0) {
  if (frameId !== 0 || typeof rawUrl !== "string" || /[\\%]/.test(rawUrl))
    return false;
  try {
    const s = canonicalScope(scope.origin, scope.path),
      u = new URL(rawUrl);
    return (
      !u.username &&
      !u.password &&
      u.origin === s.origin &&
      (u.pathname === s.path.slice(0, -1) || u.pathname.startsWith(s.path))
    );
  } catch {
    return false;
  }
}
export function validateElement(e) {
  record(
    e,
    [
      "id",
      "parentId",
      "role",
      "label",
      "value",
      "options",
      "min",
      "max",
      "state",
      "help",
      "actions",
    ],
    "element",
  );
  id(e.id, "element.id");
  string(e.label, "element.label");
  assert(roles.has(e.role), "Unknown element role");
  assert(states.has(e.state), "Unknown element state");
  string(e.help, "element.help", 2048);
  list(e.actions, "element.actions");
  e.actions.forEach((a) => id(a, "action reference"));
  if (e.parentId !== undefined) id(e.parentId, "parentId");
  if (e.role === "boolean")
    assert(typeof e.value === "boolean", "Boolean value required");
  if (e.role === "number") {
    assert(
      Number.isFinite(e.value) &&
        Number.isFinite(e.min) &&
        Number.isFinite(e.max) &&
        e.min <= e.value &&
        e.value <= e.max,
      "Invalid numeric range",
    );
  }
  if (e.role === "text")
    assert(
      typeof e.value === "string" && e.value.length <= 8192,
      "Bounded text value required",
    );
  if (e.role === "choice") {
    list(e.options, "options", 64);
    assert(
      e.options.every((x) => typeof x === "string" && x.length <= 256) &&
        e.options.includes(e.value),
      "Invalid choice",
    );
  }
  return e;
}
export function validateAction(a) {
  record(
    a,
    [
      "id",
      "label",
      "effect",
      "input",
      "requiredGrant",
      "reviewRequired",
      "cancellable",
      "retryable",
    ],
    "action",
  );
  id(a.id, "action.id");
  string(a.label, "action.label");
  assert(effects.has(a.effect), "Unknown effect");
  record(a.input, ["type", "maxLength", "min", "max", "options"], "input");
  assert(
    ["none", "text", "number", "boolean", "choice"].includes(a.input.type),
    "Unsupported input type",
  );
  assert(
    typeof a.reviewRequired === "boolean" &&
      typeof a.cancellable === "boolean" &&
      typeof a.retryable === "boolean",
    "Explicit action semantics required",
  );
  if (a.effect === "native") {
    id(a.requiredGrant, "requiredGrant");
    assert(a.reviewRequired, "Native operation requires review");
  } else
    assert(
      a.requiredGrant === undefined && !a.reviewRequired,
      "Local action cannot request native grant",
    );
  if (a.input.type === "text")
    assert(
      Number.isInteger(a.input.maxLength) &&
        a.input.maxLength >= 1 &&
        a.input.maxLength <= 8192,
      "Text bound required",
    );
  if (a.input.type === "number")
    assert(
      Number.isFinite(a.input.min) &&
        Number.isFinite(a.input.max) &&
        a.input.min <= a.input.max,
      "Number range required",
    );
  if (a.input.type === "choice") {
    list(a.input.options, "input.options", 64);
    assert(
      a.input.options.length > 0 &&
        a.input.options.every((x) => typeof x === "string" && x.length <= 256),
      "Invalid input options",
    );
  }
  return a;
}
export function validateProject(p) {
  record(
    p,
    [
      "schemaVersion",
      "id",
      "name",
      "adapterVersion",
      "scope",
      "capabilities",
      "surfaces",
      "actions",
    ],
    "project",
  );
  assert(p.schemaVersion === 1, "Unsupported descriptor schema");
  id(p.id, "project.id");
  string(p.name, "project.name");
  assert(/^\d+\.\d+\.\d+$/.test(p.adapterVersion), "Invalid adapter version");
  record(p.scope, ["origin", "path"], "scope");
  canonicalScope(p.scope.origin, p.scope.path);
  list(p.capabilities, "capabilities", 64);
  p.capabilities.forEach((x) => id(x, "capability"));
  list(p.surfaces, "surfaces", 32);
  list(p.actions, "actions");
  p.actions.forEach(validateAction);
  const actionIds = new Set(p.actions.map((a) => a.id));
  assert(actionIds.size === p.actions.length, "Duplicate action identifier");
  assert(
    p.actions.every(
      (a) => a.effect !== "native" || p.capabilities.includes(a.requiredGrant),
    ),
    "Native grant missing from capability inventory",
  );
  const surfaceIds = new Set();
  for (const s of p.surfaces) {
    record(
      s,
      ["id", "route", "owner", "state", "revision", "elements"],
      "surface",
    );
    id(s.id, "surface.id");
    assert(!surfaceIds.has(s.id), "Duplicate surface identifier");
    surfaceIds.add(s.id);
    id(s.owner, "surface.owner");
    assert(s.owner === p.id, "Surface owner mismatch");
    assert(
      typeof s.route === "string" &&
        s.route.startsWith("/") &&
        !/[\\%?#]/.test(s.route) &&
        !s.route.split("/").some((x) => x === "." || x === ".."),
      "Invalid route",
    );
    assert(
      scopeMatches(p.scope, p.scope.origin + s.route),
      "Surface outside project scope",
    );
    assert(states.has(s.state), "Invalid surface state");
    assert(
      Number.isSafeInteger(s.revision) && s.revision >= 0,
      "Invalid revision",
    );
    list(s.elements, "elements");
    s.elements.forEach(validateElement);
    const ids = new Set(s.elements.map((e) => e.id));
    assert(ids.size === s.elements.length, "Duplicate element identifier");
    for (const e of s.elements) {
      assert(!e.parentId || ids.has(e.parentId), "Missing parent");
      assert(
        e.actions.every((x) => actionIds.has(x)),
        "Missing action",
      );
      const visited = new Set([e.id]);
      let parent = e.parentId;
      while (parent) {
        assert(!visited.has(parent), "Hierarchy cycle");
        visited.add(parent);
        parent = s.elements.find((x) => x.id === parent)?.parentId;
      }
    }
  }
  assert(JSON.stringify(p).length <= 131072, "Descriptor exceeds size limit");
  return structuredClone(p);
}
export function validateInput(action, input) {
  const t = action.input;
  assert(
    t.type === "none"
      ? input === undefined
      : t.type === "text"
        ? typeof input === "string" && input.length <= t.maxLength
        : t.type === "number"
          ? Number.isFinite(input) && input >= t.min && input <= t.max
          : t.type === "boolean"
            ? typeof input === "boolean"
            : t.options.includes(input),
    "Invalid action input",
  );
  return input;
}
export class AdapterRegistry {
  #projects = new Map();
  #operations = new Map();
  #generation = 0;
  register(descriptor, handlers) {
    const d = validateProject(descriptor);
    assert(!this.#projects.has(d.id), "Already registered");
    assert(
      d.actions.every((a) => typeof handlers[a.id] === "function"),
      "Missing handler",
    );
    this.#projects.set(d.id, { descriptor: d, handlers });
    return () => this.#projects.delete(d.id);
  }
  discover(url, frameId = 0) {
    return [...this.#projects.values()]
      .filter((p) => scopeMatches(p.descriptor.scope, url, frameId))
      .map((p) => structuredClone(p.descriptor));
  }
  invalidate() {
    this.#generation++;
    for (const op of this.#operations.values()) op.controller.abort();
    this.#operations.clear();
  }
  async invoke(
    projectId,
    actionId,
    input,
    { url, frameId = 0, progress = () => {} },
  ) {
    const p = this.#projects.get(projectId);
    assert(p && scopeMatches(p.descriptor.scope, url, frameId), "Out of scope");
    const action = p.descriptor.actions.find((a) => a.id === actionId);
    assert(action, "Unknown action");
    assert(action.effect !== "native", "Native actions require host review");
    validateInput(action, input);
    const operationId = crypto.randomUUID(),
      controller = new AbortController(),
      generation = this.#generation;
    this.#operations.set(operationId, { controller, action });
    const promise = Promise.resolve()
      .then(() =>
        p.handlers[actionId](input, {
          signal: controller.signal,
          progress: (value) => {
            assert(
              Number.isFinite(value) && value >= 0 && value <= 1,
              "Invalid progress",
            );
            if (generation === this.#generation && !controller.signal.aborted)
              progress({ operationId, value });
          },
        }),
      )
      .then((result) => {
        assert(
          generation === this.#generation && !controller.signal.aborted,
          "Document changed or operation cancelled",
        );
        assert(
          JSON.stringify(result ?? null).length <= 65536,
          "Result too large",
        );
        return { operationId, result };
      })
      .finally(() => this.#operations.delete(operationId));
    return { operationId, promise };
  }
  cancel(operationId) {
    const op = this.#operations.get(operationId);
    assert(op && op.action.cancellable, "Operation cannot be cancelled");
    op.controller.abort();
  }
}
