# Material Companion

A Windows desktop workspace and opt-in Edge/Chrome extension for project documentation sites.

## Current status

The reviewed architecture and interface specification are recorded in [design/foundation.md](design/foundation.md). The reviewed native core, bounded Qt workspace and browser foundation are integrated. Local native-only build/package checks and three desktop capture states passed; combined packaging, browser review delivery and full visual acceptance remain in progress. This repository does not yet provide a verified installable product.

The native desktop uses C++20 and Qt Quick/QML with local SQLite records. The browser extension uses Manifest V3, TypeScript, Lit and bundled Material Web controls. Each project is enabled separately by HTTPS origin and path. Page adapters describe allowlisted data and actions.

Public documentation works without the extension. Browser-local settings work without the desktop. Desktop-backed actions require the companion, an authorized capability and an explicit native review when consequential.

See [ROADMAP.md](ROADMAP.md), [HANDOFF.md](HANDOFF.md) and the [design specification](design/foundation.md) for implementation and verification boundaries. No installer release or browser-store submission is included in the current pass.

## Documentation and build delivery

The documentation website source is in website/ and builds through build.bat --web-only. The delivery workflow builds every pushed branch, retains bounded build/package artifacts and deploys documentation from main. Live delivery is verified separately from source. Read [build automation](docs/features/release/automation.md) and [installer continuation handoff](docs/features/release/installer-handoff.md). Installer completion belongs to the next session; current packaging remains native-only and no installer release is published.
