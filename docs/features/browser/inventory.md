# Initial owned element and state inventory

| Stable identity | Component | Action | States and acceptance |
| --- | --- | --- | --- |
| extension.scope-header | Surface composition and Material buttons | Refresh declared current project; open full workspace | Not inspected, out of scope, permission required, absent/invalid descriptor, ready; runtime pending |
| extension.tabs | Specification-backed tab composition | Activate a persisted destination | Selected, unselected, horizontal overflow; keyboard roving/reorder/pin/edge docking pending |
| projects.import | Material outlined field and filled button | Validate and store a descriptor | Empty, invalid, stored; Node validator verified |
| projects.scope | Material fields, switch and filled button | Enable exact scope with optional permission | Invalid, disabled, permission rejected, enabled; runtime pending |
| search.builder | Material fields and checkboxes | Build escaped anchored query | Literal, regex, invalid, cleared; bounded matcher verified |
| surface.* and project.* | Surface composition | Inspect actual imported records | Empty, ready, stale; runtime pending |
| action.* | Surface composition | Inspect declared side effects and limitations | Local declaration, native grant/review required; execution UI pending |
| tools.text | Material field/buttons | Count local text, cancel and explicitly copy result | Empty, running, cancelled, completed, input limit; runtime pending |
| settings.appearance | Official Material selects, sliders and switch | Persist theme, language, two humor values and motion preference | Light, dark, system; English/Cantonese/bilingual; runtime pending |
| settings.presentation | Native semantic file picker with owned label and Material clear button | Validate, replace and clear local display file | Original, loaded, invalid, corrupt cache; schema verified, persistence runtime pending |
| settings.native | Material filled button | Attempt native connection | Disconnected, connecting, absent, incompatible, rejected, ready; runtime pending |

This handwritten inventory is deliberately separate from the generated DOM registry. Full element appearance and animation editors, locks, notification history, multi-scope bulk controls, tab groups/pinning/docking, all tab discovery searches, complete language coverage, comprehensive native requests, command palette, conversion/PDF, model and server management remain unimplemented. Presence of foundation controls does not establish full feature parity.
