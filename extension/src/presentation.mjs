export function validateVocabulary(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== "entries,schemaVersion" ||
    value.schemaVersion !== 1
  )
    throw new TypeError("Unsupported presentation file");
  const entries = value.entries;
  if (
    !entries ||
    typeof entries !== "object" ||
    Array.isArray(entries) ||
    Object.keys(entries).length > 4096
  )
    throw new TypeError("Invalid entry inventory");
  for (const [key, text] of Object.entries(entries)) {
    if (
      !key ||
      key.length > 256 ||
      typeof text !== "string" ||
      !text ||
      text.length > 512 ||
      /[\u0000-\u001f\u007f]/.test(key + text) ||
      ["__proto__", "constructor", "prototype"].includes(key)
    )
      throw new TypeError("Invalid presentation entry");
  }
  if (JSON.stringify(value).length > 1048576)
    throw new TypeError("Presentation file exceeds limit");
  return structuredClone(value);
}
export function loadVocabulary(raw) {
  if (typeof raw !== "string" || raw.length > 1048576)
    throw new TypeError("Presentation file exceeds limit");
  return validateVocabulary(JSON.parse(raw));
}
export function ownedLabel(label, vocabulary) {
  return vocabulary?.entries[label] ?? label;
}
export class PresentationStore {
  constructor(storage) {
    this.storage = storage;
    this.current = undefined;
  }
  async restore() {
    const value = (await this.storage.get("vocabulary")).vocabulary;
    if (value === undefined) return "original";
    try {
      this.current = validateVocabulary(value);
      return "loaded";
    } catch {
      await this.clear();
      return "corrupt-cache-cleared";
    }
  }
  async replace(raw) {
    const validated = loadVocabulary(raw);
    await this.storage.set({ vocabulary: validated });
    this.current = validated;
    return "loaded";
  }
  async clear() {
    await this.storage.remove("vocabulary");
    this.current = undefined;
    return "original";
  }
}
export function boundedSearch(query, regex = false) {
  if (typeof query !== "string" || query.length > 256)
    throw new TypeError("Query exceeds limit");
  if (!regex)
    return (text) =>
      String(text)
        .slice(0, 2048)
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase());
  const unescaped = query.replace(/\\[.^$*+?{}()[\]|\\]/g, "");
  if (/[()*+?{}|]|\\[1-9]/.test(unescaped))
    throw new TypeError("Pattern exceeds safe search subset");
  const r = new RegExp(query, "iu");
  return (text) => r.test(String(text).slice(0, 2048));
}
