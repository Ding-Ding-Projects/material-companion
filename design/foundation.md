# Material Companion: design proposal and implementation handoff

Status: design proposal for independent review. No product implementation, component conformance, runtime behavior, packaging, security boundary, accessibility interaction, or visual acceptance is verified by this document. The inventories below define required work; they do not describe completed features.

## Product and surface boundaries

Material Companion is a productive, independently usable Windows 11 x64 desktop workspace built with C++20, Qt 6 Quick/QML, CMake/MSVC, and SQLite. A separate Manifest V3 extension uses TypeScript, Lit, and official Material Web components. Its side panel and full-page workspace provide browser-local capabilities without requiring the native host. The public GitHub Pages website provides complete documentation and supported browser-local capabilities without requiring the extension.

The extension operates only on explicitly enabled origin and path pairs. Native operations pass through a C++ native-messaging host and current-user IPC boundary with identity, version, grant, replay, and size checks. Consequential operations require review in the native workspace. Declarative adapters never authorize arbitrary shell commands, executable page scripts, QML, or JavaScript expressions.

Private personal-vocabulary files affect only native and extension-owned presentation. They never change page DOM, adapter messages, external records, public source, installed identity, diagnostics, history, exports, or telemetry. The adapter channel must never transmit their contents or source-file metadata.

No release publication, store submission, purchase flow, real-profile automation, host power action, or retrofit of unrelated products is part of this handoff.

## Design direction

Use compact, task-centered layouts with real records, contextual actions, and explicit empty states. The initial desktop view is a working workspace, not a marketing landing page, command catalogue, or feature-card grid. Marketing belongs on the separate public website.

Use registered Material Design 3 primitives and specification-backed compositions. A Qt theme selection alone is not evidence of Material Design 3 conformance. Each native composition requires a recorded component specification, anatomy, state model, accessibility behavior, styling, and renderer consumer. Extension controls use official Material Web components where available; any composition needs an explicit audited registration. Generic lookalike controls are not accepted substitutes.

## Shared shell and navigation

The normal native client area is proposed as 1440 by 960 logical pixels; the minimum is 960 by 640. These are design targets, not verified supported dimensions.

- A 48-pixel custom title bar contains the presentation logo, display name, current workspace, build provenance, and functional minimize, maximize/restore, and close controls. Window dragging, resizing, keyboard operation, and maximize behavior remain intact.
- The default left tab strip is 224 pixels wide, with a 72-pixel collapsed mode. It has stable pinned and grouped regions, overflow, new-tab creation, context actions, and discoverable full accessible names.
- The context toolbar contains the project/surface breadcrumb, local query and regex-builder action, and relevant actions.
- The main region contains an actual table, tree, queue, or editor. An optional resizable inspector initially uses 320 pixels and opens only when useful to selected content.
- At minimum width, collapse the tab strip and place inspector content in a bounded secondary panel. Do not shrink controls below their required target sizes.
- A notification stack occupies a screen corner without covering the originating action. Notification history preserves dismissed information. Warnings and failures remain until dismissed.

Destinations are Workspace, Projects, Inspector, Appearance, Operations, Tools, History, Settings, and Help. These open real browser-style tabs. Tabs dock at any edge, default left, and support grouping, pinning, reordering, overflow, locks, per-tab appearance, and persisted arrangement. Settings and inspectors with multiple sections use the same tab model.

All four tab-discovery searches are required: current strip, current group, group names, and all owned windows/workspaces. Each search has its own query-bound regex builder. Search controls, filters, and descriptive statistics can collapse, but active filters remain visibly disclosed.

## Initial workspace: element inventory

| Stable element ID | Composition and data | Action and outcome | Required states |
| --- | --- | --- | --- |
| `shell.title` | Custom Material title bar; stored display name plus stable product identity | Drag and window actions; rename through settings | normal, inactive, maximized, high contrast, renamed |
| `shell.provenance` | Accessible compact version and updated-at text | Open build details without replacing the front-screen values | verified metadata, unavailable metadata, invalid metadata |
| `shell.tabs` | Browser-style tab strip with grouped/pinned regions | Activate, reorder, pin, group, close, dock, search | empty, selected, overflow, collapsed group, pinned, locked, unsaved |
| `workspace.project-list` | Virtualized record list from actual local projects | Select project; open its inspector | empty, loading, populated, no match, unavailable store |
| `workspace.create` | Filled action and optional guidance above it | Create a real local project from validated input | ready, validation error, submitting, completed, failed |
| `workspace.open` | Tonal action with native file picker | Validate and open a project descriptor | ready, cancelled, malformed, incompatible, opened |
| `workspace.search` | Text field, clear action, adjacent regex builder | Filter visible project records without hidden query state | plain, regex, invalid pattern, empty, active filter |
| `workspace.selection` | Contextual selection bar | Open, export permitted fields, or review a bulk operation | none, single, multiple, protected selection |
| `workspace.active-operations` | Current operation list with genuine progress | Open operation detail, pause/cancel when supported | none, running, paused, cancel requested, interrupted |
| `workspace.pending-reviews` | Native review queue | Open exact immutable review | none, pending, expired, withdrawn |
| `workspace.empty` | Honest empty-state composition | Create/open a project or open a local tool | first use, cleared workspace |
| `workspace.notifications` | Snackbar stack and notification history | Dismiss, retry, undo, or inspect supported outcomes | information, warning, error, action pending |

Do not seed sample projects or simulate operation counts. Default construction must produce truthful empty lists and usable create/open paths.

## Projects and grants: element inventory

| Stable element ID | Composition and data | Action and outcome | Required states |
| --- | --- | --- | --- |
| `projects.list` | Project table with name, adapter version, enabled scope, contact state | Select, open, inspect, bulk-manage within declared scope | empty, loading, populated, stale, no match |
| `projects.scope-list` | Structured origin/path records with exact matching semantics | Add, edit, enable, disable, or remove an explicit scope | valid, invalid origin, invalid path, overlap warning, disabled |
| `projects.scope-preview` | Matched and excluded URL examples supplied for review | Explain the scope before saving | matching, excluded, ambiguous input, unavailable preview |
| `projects.adapter` | Schema/version, capabilities, compatibility explanation | Import and validate a descriptor; inspect unsupported capabilities | supported, incompatible, malformed, unknown capability |
| `projects.grants` | Typed grant rows with purpose, target, and current status | Review, grant, revoke, inspect consequences | absent, requested, active, revoked, expired |
| `projects.connection` | Separately sourced host identity/version/contact state | Connect, retry, inspect setup guidance | missing host, disconnected, connecting, identity rejected, incompatible, ready |
| `projects.capabilities` | Capability table with exact unmet conditions | Open contextual setup or detail; invoke only supported operations | supported, implemented unverified, unavailable, incomplete |
| `projects.save` | Validated action with operation history | Persist only the reviewed configuration | unchanged, valid, invalid, saving, saved, failed |
| `projects.remove` | Native destructive review of exact records | Remove only reviewed project data and grants | review required, cancelled, running, partial, completed |

Connection state, grant state, and operation readiness are separate facts. A connected host does not imply authority to execute an action. Enabling one path must never silently enable its entire origin. Grant changes invalidate dependent pending reviews.

## Operations and native review: element inventory

| Stable element ID | Composition and data | Action and outcome | Required states |
| --- | --- | --- | --- |
| `operations.queue` | Virtualized persistent operation records | Select, filter, inspect, resume eligible work | empty, active, interrupted, no match |
| `operations.filters` | Text/regex, action, date, and state controls | Compose filters without changing the underlying queue | collapsed inactive, collapsed active, expanded, invalid input |
| `review.target` | Exact project, surface, action, target identity, and adapter version | Inspect target facts | current, changed, unavailable |
| `review.parameters` | Typed, readable immutable parameter summary | Return to editing and produce a new review | valid, invalid, superseded |
| `review.effects` | Concrete affected data, side effects, execution location, recovery | Expand exact consequences | reversible, destructive, partial recovery, no rollback |
| `review.authorize` | Native action for the exact request | Authorize only the bound operation | pending, expired, approved, declined |
| `review.destructive` | Two independently operated keys and full-range slider | Execute only after both keys and full slider completion | untouched, one key, two keys, partial slider, authorized, cancelled |
| `review.cancel` | Always-available cancel/Escape path | Withdraw pending review; restore focus | ready, withdrawn, already executing |
| `operation.progress` | Actual phase, completed/total units when known, bytes/rate where relevant | Inspect details without inventing percent or ETA | determinate, indeterminate, stalled evidence, reconnecting |
| `operation.controls` | Capability-bound pause/resume/cancel controls | Change the real operation through the same validation path | enabled, unsupported, requesting, acknowledged, failed |
| `operation.outcome` | Per-item and aggregate result with evidence | Open result, recover, retry eligible items, export redacted record | succeeded, skipped, cancelled, partial, failed, unknown |

The visible flow is select action, enter typed parameters, validate, review exact effects, authorize natively, execute, and report actual outcome. Pending reviews expire when target identity, adapter version, grant generation, parameters, or relevant source state changes. Browser dismissal does not cancel an executing native operation without acknowledged cancellation.

Submitting controls prevent re-entry throughout execution. Real progress remains visible where the work began, as well as in the operations queue. Recovery actions appear beside the failure. Destructive confirmations retain exact facts at every language and humor setting.

## Foundation contract: durable acceptance and recovery

The native service owns each durable job identifier. A browser request identifier is a correlation and deduplication key, never an authorization or a replacement for the native job record. Before review, canonicalize and validate the bounded request with the versioned protocol's deterministic serialization, then compute its digest. Reject ambiguous encodings, duplicate fields, unknown mandatory fields, unsupported schema versions, and invalid typed values before hashing. Canonicalization must preserve the meaning and ordering of semantically ordered values; it must not discard a field that affects authorization or execution.

Every native review binds all of these fields:

- Canonical request digest and request ID.
- Project ID and the exact enabled HTTPS origin/path scope.
- Adapter and protocol versions.
- Action ID and all validated typed parameters.
- Scoped file-grant IDs, with the permitted operation and resource binding.
- Target identity and reviewed target revision.
- Capability-grant generation.
- Review expiry and current native session identity.

Page-supplied content cannot create, approve, refresh, consume, or enlarge a native authorization. Native review displays validated authoritative values rather than trusting page-authored descriptions of their effects. Private personal-vocabulary data, mappings, source-file metadata, and presentation replacements are excluded from the request, digest input, review binding, messages, job records, journal, history, exports, and telemetry.

### Acceptance transaction

Acceptance and revocation serialize through the native service's SQLite transaction boundary. In one atomic transaction, the service checks for an existing request identity, revalidates review expiry and session, rechecks the current capability-grant generation, scoped file grants, exact scope, target identity/revision and operation preconditions, consumes the review once, and persists the accepted job plus its request-to-job mapping. Acknowledgment is sent only after that transaction commits.

The target identity/revision comparison must use an operation-specific authoritative check. When the target cannot participate atomically in the SQLite transaction, execution must perform the required final identity/precondition check before effects and use appropriate resource locking or compare-and-set behavior where available. A mismatch invalidates execution instead of silently authorizing a different target. The database transaction alone does not prove atomicity with an external process, file, or network target.

Within the stable caller/project scope, the same request ID with the same canonical digest returns the original job ID and its recorded status, subject to current authorization to read that record. The same request ID with a different digest is rejected. A consumed review never creates a second job, including when presented under another request ID. Retain a durable deduplication record or tombstone for the documented request-validity horizon; requests outside that horizon are rejected as stale rather than treated as new work. Retrying an already accepted request never revives its old review or executes it again.

Revocation advances the applicable grant generation in the same serialized acceptance boundary. If revocation commits first, acceptance rejects the stale review. If acceptance commits first, the job remains an accepted historical fact; revocation invalidates pending reviews, prevents further unauthorized steps, and requests cancellation of accepted running work only where the operation supports it. Record whether cancellation was requested, whether the executor accepted that request, and the actual terminal outcome. Do not describe an unsupported or rejected cancellation as successful cancellation, and do not imply completed effects were rolled back.

### Unknown acknowledgment, interruption, and retry

After a connection loss or unknown acknowledgment, the client queries the original request ID or native job ID. It does not silently issue another request ID, submit another operation, or treat lack of acknowledgment as proof of nonexecution. If the native service cannot establish the original outcome, the interface keeps an explicit unknown state and offers operation-specific reconciliation.

Before beginning side effects, persist the running state and an operation-specific recovery journal with the bounded intent, relevant preconditions, execution phase, and reconciliation references. Record subsequent durable phase boundaries as needed. Never place private vocabulary, credentials, unrelated paths, or document contents into the journal. Use scoped resource identifiers and the minimum metadata needed for safe recovery.

On restart, previously in-flight work becomes interrupted or unknown until its operation-specific reconciliation establishes what actually happened. An operation may resume only where its adapter documents and verifies a safe resumption point. A retry that could repeat consequential effects requires fresh review and explicit operation-specific handling. There is no blanket exactly-once execution claim, automatic risky retry, or inference that a committed acceptance record proves successful effects.

The visible states distinguish `accepted`, `running`, `cancellation-requested`, `cancellation-accepted`, `interrupted`, `unknown`, `reconciling`, and terminal `succeeded`, `cancelled`, `partial`, or `failed`. Cancellation acceptance is not a terminal outcome. Result records state completed effects, remaining work, and recovery limitations.

## Foundation contract: exact page scope and navigation identity

An enabled scope is a tuple of a normalized HTTPS origin and an explicit case-sensitive path-segment prefix. It is not a substring, textual URL prefix, wildcard host, registrable-domain grant, or implicit grant to sibling paths. Reject credentials in URLs, opaque origins, non-HTTPS schemes, invalid hosts, and wildcard scope syntax. Parse with a standards-compliant URL implementation, normalize scheme and host case, normalize internationalized hostnames consistently to their ASCII form, and treat omitted HTTPS port and explicit port 443 as the same origin. Preserve every other explicit port as a distinct origin. Reject trailing-dot host spellings as ambiguous rather than silently broadening an existing grant. Display the resulting canonical origin and path before enabling the scope.

Validate the supplied path representation before any parser normalization can erase suspicious syntax. Require an absolute path. Reject malformed percent escapes, literal backslashes, encoded slashes or backslashes, control characters, repeated path separators, and literal or encoded dot/dot-dot segments. Reject encoded percent escapes that could introduce separators or dot traversal through a later decoding pass. Apply the same validation to registered scopes and candidate navigation URLs. If the adapter cannot establish an unambiguous path interpretation, it does not match the scope. Adapters must not perform an additional decoding or normalization step that widens this decision.

For paths passing validation, split into segments on literal `/`, decode permitted percent-encoded UTF-8 exactly once with invalid sequences rejected, and compare segment sequences case-sensitively without Unicode normalization or filesystem-style case folding. The root prefix `/` deliberately matches the entire origin only when that root scope was explicitly enabled. A prefix `/project` matches `/project`, `/project/`, and descendants such as `/project/docs`; it does not match `/projects`, `/project-other`, or another origin. Normalize a final trailing separator as the same segment-prefix boundary. Query and fragment values do not enlarge path authority; an action that depends on them must additionally validate and bind those parameters in its descriptor and reviewed request.

Obtain the actual top-level URL, tab identity, frame identity, and current document/navigation identity from trusted browser APIs, not from a page message or page DOM. Bind each adapter interaction and native request to that identity and the applicable scope/grant generation. Reevaluate on committed navigation, document replacement, same-document URL changes, redirects, tab replacement, and before forwarding a privileged request. When the current document leaves the enabled match, revoke its active adapter binding, invalidate pending reviews and document grants, reject stale messages, and apply the accepted-job cancellation rules above. Returning to a matching URL establishes a fresh document binding, never revives stale authorization.

Use top-level-document scope by default. Subframes receive no authority from a matching parent; any supported frame workflow requires its own explicit validated frame scope and identity. A page-provided URL, origin claim, action label, hidden field, or approval message cannot establish scope or approve a desktop operation. Browser-local and native-owned presentation remain usable independently when page bindings are revoked. Private personal-vocabulary data never enters page DOM or any page/adapter message during matching, navigation, review, execution, or recovery.

Required negative cases include sibling-path confusion, encoded separators, encoded dot traversal, malformed UTF-8, repeated decoding, redirected/out-of-scope navigation, stale-document messages, subframe escalation, request-ID digest mismatch, consumed-review reuse, expiry, grant-generation changes, acceptance/revocation races, lost acknowledgments, native restart, journal interruption, unsupported cancellation, and uncertain partial effects. These cases are required acceptance work, not verified behavior in this proposal.

## Extension side panel: element inventory

Normal dimensions are proposed as 360 by 800 CSS pixels, with 320 by 568 minimum. Full-page mode uses 1280 by 900 normally and the same narrow-width minimum.

| Stable element ID | Composition and data | Action and outcome | Required states |
| --- | --- | --- | --- |
| `extension.scope-header` | Current project and explicit origin/path scope | Inspect scope or open scope management | recognized enabled, recognized disabled, out of scope, unsupported page |
| `extension.native-status` | Host state distinct from permissions | Open setup, retry connection, inspect incompatibility | absent, disconnected, connecting, rejected, incompatible, ready |
| `extension.tabs` | Compact browser-style tabs | Navigate surface, tools, operations, settings, help | expanded, collapsed edge, overflow, locked |
| `extension.surface-tree` | Declared surface and element hierarchy | Select a declared element and reveal its owned inspector | empty, loading, ready, stale, descriptor invalid |
| `extension.element-inspector` | Role, typed value, capability, help, allowed actions | Edit only explicitly permitted owned data | readable, editable, disabled with reason, locked, stale |
| `extension.action-form` | Descriptor-driven rich controls with optional guidance | Validate and submit a bounded action request | valid, invalid, missing grant, local ready, native review required |
| `extension.review-status` | Native review identity and factual state | Open corresponding native review when supported | pending, expired, withdrawn, approved, unavailable |
| `extension.local-tools` | Browser-local functional workspace | Use supported tools without native connection | ready, unsupported capability, resource bound exceeded |
| `extension.expand` | Open full-page workspace | Preserve current record, draft, query, tab, and operation identity | ready, opening, opened, failed |
| `extension.vocabulary` | Local JSON picker and generic status, replace, clear | Validate entire file; apply only to extension-owned presentation | no file, loading, loaded, invalid, replaced, cleared, corrupt cache |

When the host is absent, browser-local functionality stays usable. Native capabilities remain visibly unavailable with the exact reason and contextual setup route. The full-page workspace is the same operation model with more room, not a second disconnected configuration store.

## Descriptor contracts and independent adapters

Use versioned `ProjectDescriptor`, `SurfaceDescriptor`, `ElementDescriptor`, and `ActionDescriptor` records with stable identifiers.

- Project: identity, adapter version, origin/path scope, grants, capability inventory.
- Surface: route, owner, readiness, element hierarchy, freshness.
- Element: role, name source, value type, options/range/default provenance, states, help identifier, appearance capabilities.
- Action: typed input, side-effect class, required grant, native-review requirement, cancellation/retry semantics, bounded result schema.

Treat imported text as data. Unsupported fields and capabilities require precise handling rather than executable fallbacks. Test both the Material System Care website adapter and an independent fixture with unrelated identifiers, hierarchy, path rules, and actions. One successful adapter does not establish general adapter compatibility.

## Appearance, guidance, focus, and motion

Every rendered owned element has a stable identity, component registration, contextual explanation, applicable optional guidance above the control, appearance entry, lock entry, keyboard route, and state contract. Genuine platform limitations require explicit inventory rows and tested accessible equivalents.

The anchored element editor has real tabs for Target and states; Typography; Paint and effects; Layers and masks; Geometry and layout; Animation and transition; Access and history. The selected target breadcrumb and selected state stay visible. Required states include normal, hover, focus, pressed, selected, disabled, dragged, validation, loading, success, warning, and error where supported.

Focus order is shell, active tab, workspace toolbar, main content, and optional inspector. Lists use row navigation with explicit entry into inline controls. Closing an overlay restores focus to its origin. Every overlay paints its own surface, remains bounded, scrolls when necessary, and preserves its anchor. Panels support accessible resizing; floating panels also support bounded movement.

Every editable text field has a clear action. Native path fields also have a semantic browse action. Each search field, settings surface, menu, picker, and tab-discovery search has an independently bound full regex builder. Menu shortcuts come from the actual registered bindings. The global command palette uses `Ctrl+Shift+F`, offers real inline controls, and focuses exact target elements.

Motion is restrained and tied to actual state transitions. Reduced motion preserves authored settings while rendering stable equivalents. Outcome animation never substitutes for execution proof. Narration and optional action sounds start disabled. Accessible names preserve exact technical identifiers and factual external records.

## Required wider capabilities, all unimplemented and unverified

These are complete delivery requirements, not optional future polish or implied exemptions:

- Full per-element appearance editing: word-processing typography depth; layered nondestructive image-editing depth; selections, masks, effects, geometry, inheritance, preview, resets, undo/redo, presets, and portable validated import/export.
- Full animation/transition authoring: tracks, properties, keyframes, timing/easing, timelines, playback, triggers, interruption, composition, history, presets, and reduced-motion alternatives. Unsupported renderer capabilities remain visible with precise reasons.
- Continuous color picker and translator, contrast/gamut diagnostics, alpha preservation, and a safely represented animated-color option with shared timing and reduced-motion behavior.
- English, Cantonese, and bilingual presentation; two independent humor controls; dialog emoji option; locally supplied personal vocabulary; shared School mode behavior; display-name and logo customization; ADHD modes; narration; scheduled and external settings.
- Local file conversion: categorized installed-adapter inventory, honest unavailable formats, bounded isolation, loss disclosures, atomic output, output validation, persistent streaming queues, pause/resume/cancel, and per-file outcomes. PDF inspect, split, merge, extract, reorder, rotate, and metadata tools require real verified implementations.
- Local Ollama management: health and recovery, exhaustive verified catalogue and variants, conservative hardware-fit evidence, batch pulls, installed/running models, and genuine generation/chat/capability workflows.
- Minecraft server management: independently inventoried local Windows process, local Docker, SSH process, and SSH Docker targets; complete version discovery; edition/flavor/runtime compatibility; creation/adoption; lifecycle and scheduling; typed configuration; worlds/backups/restores; players/permissions; plugin/mod/pack management; transactional updates and recovery.
- Per-element user-experience locks with independent credential policies, disclosure and recovery; authenticator; appropriate unlock ladder; local support workflow; append-only protected local history with redacted exports and restore previews.
- Notification history, bulk actions, comprehensive exports, external-editor handoff, full local documentation, factual changelog, complete command-palette indexing, and required status integration.

Static browser surfaces cannot claim direct ownership of native processes, SSH credentials, or a Docker daemon. Record the exact boundary and provide an authorized locally mediated equivalent where applicable. Presence on another surface does not silently satisfy missing functionality here.

## Deterministic reference and acceptance plan

Later target-owned design files should include `design/README.md`, `product-structure.md`, `components.json`, `screens.json`, `states.json`, `elements.json`, `actions.json`, `capability-matrix.json`, `accessibility-focus.md`, `motion-contract.md`, `privacy-boundaries.md`, `reference-tuples.json`, framework-specific reference files, and `handoff.md`.

Reference selectors address exact screen, state, theme, language, viewport, and scale. Control timestamps, animation position, randomness, and fixture contents. Developer fixtures never become default product records. A framework-appropriate reference viewer renders the checked-in references directly.

The acceptance matrix covers normal/minimum sizes, English/Cantonese/bilingual, light/dark, and 100/125/150/200 percent display scales. Include long labels; empty/loading/ready/unavailable/invalid/locked/review/running/partial states; every tab edge; expanded/collapsed groups; and overlays near viewport edges.

Native Qt Quick verification needs actual item bounds, ancestor bounds, visibility, clipping, text metrics, effective style, focus, and accessibility measurements. Do not describe a QML probe as DOM evidence. Extension and website verification use actual DOM measurements. Bind every result to exact source and built-artifact identities. Preserve genuine reference/runtime screenshots, labeled comparisons, and machine-readable differences under identical tuples.

Required independent review examines scope, action wiring, trust boundaries, component provenance, guidance completeness, focus, responsive behavior, and explicit unimplemented requirements before implementation. Runtime acceptance, security checks, accessibility interaction, visual parity, and packaged behavior remain entirely unverified at this handoff.
