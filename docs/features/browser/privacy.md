# Browser privacy and exact scopes

Only exact HTTPS GitHub Pages origins with a single account hostname are accepted. Project paths are absolute, end with `/`, and reject percent encoding, backslashes, query fragments, doubled separators and dot segments. `/project/` matches its own route and descendants, not `/project-other/`. Subframes never inherit a top-frame scope. Browser host permission is origin-wide because that is the browser API boundary; extension inspection additionally requires the exact saved project path. Navigation removes document bindings before later native requests.

Personal presentation JSON uses `{ "schemaVersion": 1, "entries": { "original label": "replacement" } }`. It accepts up to 4,096 bounded string pairs and a 1 MiB file. Validation is atomic; invalid files retain the previous active import. Replace persists the new valid file locally, clear removes it, and a corrupt cached import restores original wording. Mappings affect only extension-owned display labels and corresponding accessibility names. They do not alter page DOM, descriptor messages, native messages, project names or descriptor values, operation history, exports, product installation identity or telemetry. The extension implements no telemetry.

The local text counter returns character, word and line counts. Only operation identity, kind, timestamp and factual state persist. Text contents and result text are not written to operation history. Clipboard copying is an explicit user action.

The current search regex accepts escaped literals, anchors and character matches without repetition. It rejects groups, alternation, lookaround, backreferences and quantifiers to avoid unbounded backtracking. More complete regex authoring and engine isolation remain pending.
