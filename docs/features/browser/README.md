# Browser foundation

The Manifest V3 extension contains one shared Lit workspace for its side panel and full-page view. Controls bundle official Material Web components locally. Projects, scopes, settings and operation metadata remain in browser-local storage. No native host is needed for text counts, descriptor imports or presentation settings.

- [Descriptors and adapter lifecycle](descriptors.md)
- [Browser privacy and scope](privacy.md)
- [Initial owned element inventory](inventory.md)

Build from `extension/` with `npm ci` and `npm run build`. Root build integration invokes this script. Load `extension/dist` as an unpacked extension for development. No store submission or installer release is performed by this foundation.

Verification: Node tests cover descriptor rejection, exact top-frame scopes, document invalidation, native-action rejection, local presentation validation and bounded search. A bundle build proves compilation only. Browser interaction, accessibility, visual layout, native review delivery and installation acceptance require independent runtime evidence.
