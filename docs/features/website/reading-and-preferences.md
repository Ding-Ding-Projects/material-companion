# Reading, search and preferences

## Content and navigation

The TypeScript and Lit shell uses locally bundled official Material Web buttons, fields, switches, sliders and selectors. The reviewed design is implemented through a top app bar, left navigation, reading surface, article lists and grouped preference compositions registered in `component-registry.json`. Narrow navigation scrolls inside its strip; code and tables scroll within their own bounds.

The build discovers every Markdown article below `docs/`, records SHA-256 source hashes and embeds full article contents. Hash routes distinguish overview, documentation, categories, articles, wiki, preferences, privacy and current verdicts. Unknown articles produce an explicit unavailable state. Article links resolve internally. Source headings receive internal anchor identifiers. Markdown is rendered through Marked and sanitized by DOMPurify; scripts, embedded frames, style blocks and forms are forbidden.

## Search

Search matches the complete article title and body on this device. Clear resets the query. The adjacent regular-expression builder supports escaped literal text, whole-text anchors, grouping and case sensitivity. Patterns are limited to 256 characters and reject nested repetition and backreferences. Invalid patterns do not silently become literal searches. This restriction reduces expensive matching but does not establish a general arbitrary-regex execution guarantee.

## Local preferences

English, Hong Kong Cantonese and bilingual shell modes are available. English and Cantonese funny levels each persist independently from 1 through 5 and reset independently. They change preference confirmation wording; complete message-category coverage remains pending. A message-symbol setting changes confirmation presentation without modifying labels. Light/dark and reduced motion persist. Operating-system reduced-motion preferences also disable transitions.

Only the versioned ordinary preference record is stored in this origin's local storage. Search stays in memory. Corrupt preference data is discarded in favor of defaults. Storage refusal produces an explicit session-only state. Cross-tab storage events update the displayed preferences. Reset removes the stored preference record.

## Privacy and unavailable capabilities

The personal wording file chooser remains visible and disabled with the actual reason: a public static website has no authenticated private presentation boundary. File selection or a checkbox is not authentication. No private file is parsed, applied, cached or transmitted. Original wording remains active.

Optional desktop pairing has not been implemented in this website build. No handshake is attempted, no page message is sent and no connection success is inferred. Documentation and browser-local preferences remain usable without installation. No installer download is shown without verified release metadata.

## Build and verification

The root `build.bat` invokes `node scripts/build-web.mjs`. The script installs the pinned lockfile, runs TypeScript checking and Vite bundling, and writes `website/dist/build-receipt.json`. Revision and update time come from the source commit, not launch time. `node scripts/verify-docs-site.mjs` validates the generated complete inventory and offline bundled output. Focused website checks run locally, never in the deployment workflow. Production captures and the full language/theme/scale matrix remain separate acceptance evidence.
