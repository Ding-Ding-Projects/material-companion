# Build and documentation automation

The delivery workflow runs on every branch push and manual dispatch. Its independent Windows 2022 jobs build the native/extension package and the documentation. Only main deploys documentation through GitHub Pages. Installer release publication is explicitly deferred to a later session.

## Exact commands and boundaries

- Native build: `build.bat -Silent`.
- Existing native-only unsigned Squirrel package: `build-installer.bat -Silent`.
- Documentation: `build.bat --web-only`.

The workflow runs no tests, lint or standalone type checking. In CI the extension producer invokes its esbuild compilation directly; local builds retain their existing TypeScript check. Website compilation uses Vite; `npm run check` remains available locally. No successful workflow implies behavioral, security, accessibility, installer or visual acceptance. A source whose local checks would fail can still produce build outputs.

## Job and dependency inventory

| Job | Required tools | Acquisition or discovery |
| --- | --- | --- |
| native-package | Windows 2022 x64, Git, PowerShell, MSVC x64 and redistributable, tar | Hosted image, with explicit tool discovery. Missing MSVC is a named failure; fresh-machine MSVC installation remains pending. |
| native-package | Node 24 and npm | actions/setup-node; locked extension packages through npm ci |
| native-package | Python 3.12, CMake, Ninja | actions/setup-python; compatible installed tools reused, missing CMake 3.31.6/Ninja 1.11.1.3 acquired through PyPI |
| native-package | Qt 6.8.3 with Core, Network, Sql, Quick, QuickControls2 and ShaderTools | scripts/ensure-qt.ps1, official pinned metadata/archive checks and exact cache receipt |
| native-package | NuGet 6.11.1, Squirrel.Windows 2.0.1 | Exact packaging entrypoint, official NuGet download/signature and pinned NuGet package |
| documentation | Windows 2022, Git, Node 24, npm, locked website packages | checkout/setup-node, npm ci and exact web-only entrypoint |
| deploy-documentation | GitHub Pages configuration, uploaded static output, OIDC | configure-pages and deploy-pages; Pages must be enabled for Actions by the repository owner |

The repository runner inventory was empty during preparation. Organization runner inventory was inaccessible with the current permission. No private host is targeted. A successful hosted run is evidence for that run, not proof of fresh-user-installation bootstrap. Missing MSVC acquisition and full fresh-environment acceptance stay open.

## Safe outputs after failure

Both producer jobs run defensive collection and upload with `always()`, `continue-on-error: true`, a 14-day retention bound, and `if-no-files-found: warn`. The collector copies only explicitly listed package outputs, public source-bound receipts and compiled documentation assets. It never copies source directories, tool caches, dependency directories or environment dumps. The collection receipt records actual run/source/job facts and hashes for files that exist. Collection cannot turn the producer result green.

The documentation deployment depends only on the documentation build. Native packaging failure does not suppress a valid documentation deployment. Deployment and the repository's exact About homepage must be verified separately.

## Local verification and pending hosted proof

The handoff records actual local checks and source state. Hosted production, live routes/assets, the complete visual matrix and exact About homepage readback are separate pending verdicts until their evidence is recorded. Wiki source availability is likewise separate from complete checked-in article embedding.

See [installer continuation handoff](installer-handoff.md) for the next session's scoped work.
