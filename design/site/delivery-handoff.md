# Documentation and build delivery handoff

## Scoped decision

Reuse the existing documentation design and implementation from commit 3d3ba273, preserving the editorial blue/teal Material Design 3 shell, complete article reader, preferences, privacy and separate verdict routes. Do not redesign the desktop or browser extension. The current request explicitly authorizes build/package automation and GitHub Pages deployment, and defers installer release publication. No release publisher is included.

## Baseline and content

The implementation baseline is f25522a5c5bfd68d7044b501af6c7ee01ed64100. Seven local main commits ahead of origin/main are preserved in this lane. Every docs/**/*.md article, category index and in-repository wiki mirror is embedded with its full Markdown and source hash. Internal relative links and headings stay within the reader. The wiki endpoint currently returns repository-not-found while has_wiki is true; this means unavailable or uninitialized, not verified empty. Render that exact unresolved state, never fabricate wiki content. A later verified wiki mirror can join the same article pipeline.

## Delivery automation

Add one Windows 2022 workflow for every branch push and manual dispatch. Use separate native-package and documentation jobs so native packaging cannot withhold the documentation build. Native production invokes exact root build.bat and build-installer.bat with silent flags. Package outputs remain the existing native-only unsigned Squirrel payload, with no claim that the desktop shell or registration is included. The documentation job invokes exact build.bat --web-only. Only main may deploy GitHub Pages; other branches retain build artifacts. No tests, lint, standalone type checking or release publication runs in CI. Defensive always-run collection records actual source/run/job facts and uploads only explicit safe output paths with bounded retention.

No repository self-hosted runners were listed at inspection. Use windows-2022 cloud runners, explicitly acquire Node, CMake/Ninja and verify MSVC before native work; the pinned Qt acquisition remains the project's verified download route. Fresh hosted bootstrap is unverified until the actual workflow runs.

## Design states and acceptance

Retain design/site/inventory.json as the reference tuple inventory. Normal 1440x960 and minimum 320px-wide surfaces cover English, Cantonese and bilingual modes, light/dark, and 100/125/150/200 percent scale. The public surface includes Overview, Documentation, complete article and category routes, Wiki, Preferences, Privacy and Current verdicts. No installer button is added without verified release assets. Existing broad feature gaps remain explicit in the acceptance article.

This document is a design/implementation handoff, not runtime or publication evidence. Independent review must precede implementation. Local content/link/privacy checks, an exact root build, genuine isolated built-surface inspection, deployment, live article/asset checks and exact About homepage readback remain separate pending verdicts.
