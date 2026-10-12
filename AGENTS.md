# Material Companion

## Product contract

Material Companion targets Windows 11 x64 with C++20, Qt 6 Quick/QML, CMake, MSVC, and SQLite. Its Manifest V3 Edge/Chrome extension uses TypeScript, Lit, and locally bundled official Material Web components. Browser integration is opt-in for exact GitHub Pages project origin and path scopes. Public pages and browser-local functions remain usable without the desktop companion. Native operations require validated extension identity and explicit project capability grants. Adapters are declarative and cannot supply executable scripts or arbitrary shell commands.

The desktop is a productive workspace with task records and contextual actions. All owned visible elements use registered Material Design 3 controls or specification-backed compositions. QML declares presentation; C++ owns operations and persistence. Private display imports stay local to owned surfaces and never enter page DOM, messages, exports, telemetry or installed identity.

This implementation pass excludes installer release publication, browser-store submission, and retrofitting unrelated projects. Root build and installer entrypoints are build.bat and build-installer.bat. Design references and required behavior are in design/foundation.md. Implementation, behavior, visuals and delivery each retain separate verdicts.

## Agent conversation vocabulary

Agents working in this repository use the shared private conversation vocabulary defined in
the maintainer's canonical agent instructions for every reply, including chat prose, visible
reasoning, status lines, and task or session titles. Read those instructions and apply them
in full. They are deliberately not restated here, because this file is part of this
repository's public record.

That vocabulary never appears in anything published. Keep it out of commit messages, branch
names, code, code comments, test names, documentation, this file, issues, pull requests,
discussions, release notes, published sites, logs, and every other file in this repository.
Published writing uses ordinary professional English, and exact technical identifiers always
keep their literal spelling. The single documented public-safe exception is named in those
canonical instructions; do not infer any other.

Scan any text bound for a public surface against that vocabulary before publishing it. A
reviewer cannot tell a correct release note from a leaking one by reading it, so the scan is
a step, not a habit.
