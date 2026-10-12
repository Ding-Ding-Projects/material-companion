export type Language = "en" | "yue" | "bilingual";
export type Preferences = {
  version: 1;
  language: Language;
  theme: "light" | "dark";
  englishFunny: number;
  cantoneseFunny: number;
  emojis: boolean;
  reducedMotion: boolean;
};
export const defaults: Preferences = {
  version: 1,
  language: "en",
  theme: "light",
  englishFunny: 5,
  cantoneseFunny: 5,
  emojis: true,
  reducedMotion: false,
};
export const storeKey = "material-companion.website.preferences.v1";
export function validPreferences(x: unknown): x is Preferences {
  if (!x || typeof x !== "object") return false;
  const p = x as Preferences;
  return (
    p.version === 1 &&
    ["en", "yue", "bilingual"].includes(p.language) &&
    ["light", "dark"].includes(p.theme) &&
    [p.englishFunny, p.cantoneseFunny].every(
      (n) => Number.isInteger(n) && n >= 1 && n <= 5,
    ) &&
    typeof p.emojis === "boolean" &&
    typeof p.reducedMotion === "boolean"
  );
}
export function loadPreferences(): Preferences {
  try {
    const x = JSON.parse(localStorage.getItem(storeKey) || "null");
    return validPreferences(x) ? x : { ...defaults };
  } catch {
    return { ...defaults };
  }
}
export function safeRegex(pattern: string, flags: string): RegExp {
  if (
    pattern.length > 256 ||
    !/^(i?u?|u?i?)$/.test(flags) ||
    /\)[+*{?]|\\[1-9]|\(\?[=!<]|\{\d{4,}|\{\d+,\d{4,}/.test(pattern) ||
    (pattern.match(/(?<!\\)[+*]/g) || []).length > 1
  )
    throw new Error(
      "Use a short pattern without quantified groups, lookarounds, backreferences or multiple unlimited repetitions.",
    );
  return new RegExp(pattern, flags);
}
