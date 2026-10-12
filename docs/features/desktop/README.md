# Native workspace foundation

The C++20 Qt Quick workspace opens directly on local project records. The QML surface declares controls; C++ validates projects, owns settings and calls the shared native Core. No sample projects or fabricated operation records are seeded.

## Implemented workflows

Create a named project with an exact HTTPS origin/path. Select its active grant, enter at most 64 KiB of UTF-8 text, inspect an immutable review and authorize SHA-256 locally. Authorization accepts the immutable request and executes that same request through Core, reporting the actual terminal state and digest. Revocation invalidates pending desktop review. A review expires after 120 seconds in Core. Text remains in memory and is removed from the desktop request after completion or dismissal. History enumerates operation results directly from Core's SQLite store; it does not create another job database or rely on QSettings correlation records. Accepted records whose content is unavailable after restart require honest native recovery states, never automatic replay of fabricated input.

The frameless title bar has functional minimize, maximize/restore, close and drag controls. Five destinations persist the last active selection. Local language mode, theme, reduced-motion preference and independent English/Cantonese humor settings affect renderer presentation. Humor uses five distinct levels, defaults to 5 and has separate reset actions. Accessible control names use the same language/display-wording path. Every single-line text field has a clear control; the text editor has a separate clear action. Review cancellation restores focus to its initiating control. Closing an already completed review restores focus without overwriting its outcome notice.

Expected native exceptions are caught at construction, grant changes, review and execution boundaries. Notices expose only allowlisted validation codes, never arbitrary database error text. Execution exceptions clear the busy state, preserve durable accepted identity and show an uncertain outcome until history proves its state.

The optional local display JSON accepts exactly `{ "version": 1, "entries": [{ "from": "Example", "to": "Sample" }] }`, bounded to 256 KiB and 1,000 entries. Invalid replacement retains current wording. Clear restores originals. It is session-only, never affects operation history, browser DOM or transport. This first generic schema has not been verified against any separately maintained personal file format.

## Handwritten element and state inventory

| Identity | Composition / actions | States and current limitations |
| --- | --- | --- |
| `shell.window`, `shell.title` | 48px title chrome, drag, window actions | Normal, maximized, minimized; edge resizing and high contrast unverified |
| `shell.tabs` | Persistent destination selection, Material buttons | Selected/unselected; grouping, pinning, reorder, all-edge docking absent |
| `projects.name`, `projects.scope`, `projects.create` | Outlined field composition with clear, explicit grant action | Empty, valid, invalid, active/revoked records; descriptor import absent |
| `tools.text`, `review.prepare` | Bounded text editor, clear, exact review action | Empty, ready, invalid size, unavailable grant, busy |
| `review.dialog` | Bounded modal surface, immutable effects, authorize/cancel | Pending, expired rejection, dismissed, executing; actual keyboard/accessibility acceptance unverified |
| `workspace.notifications` | Non-blocking bottom status with explicit dismissal | Information, rejected request, result; persistent notification history absent |
| Operation rows | Read-through Core records and result | Empty, succeeded, rejected/unknown; pause/cancel UI absent for this synchronous bounded operation |
| Settings controls | Language, theme, motion, two independent sliders, local JSON picker/reset | Persisted settings, local loaded/replaced/cleared/invalid JSON; settings search and regex builders absent |

Material Controls supplies baseline focus and interaction behavior. The implementation is not a claim of complete Material Design 3 conformance: component anatomy, motion transitions, all stable per-element registrations and the full design matrix require built inspection. The opacity transition declaration is currently not driven by an outcome state change and therefore is not accepted motion evidence.

## Verification and remaining acceptance

Focused Qt tests are available with `COMPANION_DESKTOP_TESTS=ON`: real digest execution, native history after settings removal/restart, outcome preservation, invalid review/store exception handling, and independent humor/language behavior. These tests remain unrun until the exact root `build.bat` builds the integrated source. Packaged launch, genuine hidden-desktop captures, native bounds/focus/accessibility probes and the normal/minimum, three-language, theme and scaling matrix remain unverified until actual receipts are recorded.

Browser connection is truthfully disconnected. Browser pending reviews are not delivered into this native UI yet. Full appearance editing, locks, search/regex builders, bulk operations, export, persistent tab arrangements, notification history, model tools, file conversion, server tools and authenticated status reporting are not implemented by this foundation. They remain required delivery gaps, not disabled capabilities counted as complete.
