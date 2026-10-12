const terminal = new Set(["completed", "cancelled", "failed"]);
export function validateOperation(op) {
  if (
    !op ||
    typeof op !== "object" ||
    Array.isArray(op) ||
    Object.keys(op).sort().join(",") !== "createdAt,id,kind,state" ||
    typeof op.id !== "string" ||
    op.id.length > 96 ||
    !op.id ||
    op.kind !== "text-count" ||
    !["running", ...terminal].includes(op.state) ||
    typeof op.createdAt !== "string" ||
    !Number.isFinite(Date.parse(op.createdAt))
  )
    throw new TypeError("Invalid local operation");
  return structuredClone(op);
}
export function reconcileOperations(current, incoming) {
  const records = new Map();
  for (const raw of [...current, ...incoming]) {
    let op;
    try {
      op = validateOperation(raw);
    } catch {
      continue;
    }
    const prior = records.get(op.id);
    if (prior && terminal.has(prior.state)) continue;
    records.set(op.id, op);
  }
  return [...records.values()]
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    )
    .slice(-100);
}
export class OperationLedger {
  constructor(storage) {
    this.storage = storage;
    this.tail = Promise.resolve();
  }
  update(raw) {
    const operation = validateOperation(raw);
    const result = this.tail.then(async () => {
      const current = (await this.storage.get("operations")).operations ?? [];
      const operations = reconcileOperations(current, [operation]);
      await this.storage.set({ operations });
      return operations;
    });
    this.tail = result.catch(() => {});
    return result;
  }
}
