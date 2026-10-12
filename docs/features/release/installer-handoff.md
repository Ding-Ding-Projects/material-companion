# Installer continuation handoff

## Explicit scope

Installer completion is assigned to the next implementation session. This delivery repair builds the existing declared package where possible, preserves its evidence and publishes documentation. It does not publish a release, submit a browser-store package or claim a complete installable product.

## Current payload

The root build.bat produces the C++ native service and messaging host, the Qt desktop executable, and an unpacked browser extension with a ZIP. The root build-installer.bat invokes scripts/package-native.ps1, which currently stages only companion-host.exe, companion-service.exe, their Qt/MSVC runtime files, the SQLite plugin and build receipt. Its package description explicitly excludes the desktop shell and browser-host registration.

The genuine unsigned Squirrel.Windows output is Setup.exe, RELEASES and MaterialCompanion-0.1.0-full.nupkg. Those names identify expected producer outputs, not verified release assets. The unsigned package can trigger an unknown-publisher or SmartScreen warning. No public trust or signature-verification claim is made.

## Source and existing evidence

The starting source is f25522a5c5bfd68d7044b501af6c7ee01ed64100. HANDOFF.md records earlier native-only build/package checks and bounded desktop checks. Those historical checks do not establish the combined installer, registration, installation, updates or removal. A new workflow artifact receipt identifies the exact source and run that produced its own files; absence of an artifact is never success.

## Next implementation steps

1. Review build/native/build-receipt.json and artifacts/extension/build-receipt.json from an exact root build at the selected immutable source. Keep the producer source and inputs unchanged while it runs.
2. Extend the genuine Squirrel payload to include the real desktop executable and complete deployed Qt/QML/plugins/runtime tree. Bind every packaged output to the same source and verify exact file/hash inventories. Do not rename a ZIP as an installer.
3. Implement current-user native messaging host registration for the explicitly approved Edge/Chrome extension identities. Verify identity, exact project scope and capability grants through the existing native boundary.
4. Verify install, launch, browser registration, repair, update download/staging, user-approved application restart, uninstall and recovery on an isolated Windows environment. Never initiate a host power action. Keep original user data and unrelated profiles untouched.
5. Verify browser-to-native review delivery, cancellation/revocation, reconnect and failure recovery. The page or browser must not approve consequential native work.
6. Complete fresh-machine dependency acquisition for every supported prerequisite and prove the exact root entrypoints on that environment. Hosted Windows runner success alone is not a fresh-user-installation receipt.
7. Update the handoff and roadmap with exact source, artifact hashes, actual checks, limitations and genuine captures. Obtain the separately scoped release direction before adding publication.

## Commands for the next session

Run from a reviewed, clean checkout on Windows using the supported isolated background route:

```bat
build.bat -Silent
build-installer.bat -Silent
```

The scripts accept an explicit -QtRoot for an already verified read-only Qt 6.8.3 cache. Missing Node, MSVC, CMake or Ninja remains a local entrypoint-bootstrap gap unless the next session implements and verifies acquisition. The hosted workflow supplies its own explicit tools but does not repair that wider local installation contract.

## Pending verdicts

- [ ] Complete desktop payload and native-host registration.
- [ ] Exact combined installer inventory and source binding.
- [ ] Isolated installation, launch, update, repair and removal evidence.
- [ ] Full browser-to-native review acceptance.
- [ ] Genuine fresh-environment entrypoint bootstrap.
- [ ] Separately authorized release publication and asset readback.
