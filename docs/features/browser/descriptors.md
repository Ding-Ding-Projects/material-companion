# Declarative descriptors

`adapter-kit/index.d.ts` defines versioned ProjectDescriptor, SurfaceDescriptor, ElementDescriptor and ActionDescriptor types. `descriptors.schema.json` provides portable structural JSON Schema definitions. `index.mjs` performs authoritative runtime validation, including semantic cross-record and exact scope checks beyond JSON Schema, without dynamic code evaluation. Unknown fields, malformed identifiers, duplicate records, cyclic hierarchy, missing references, invalid ranges, unsupported effects and oversized inventories are rejected. Native actions require an explicit grant identifier and review flag.

A public page can include an inert `script[type="application/json"][data-material-companion]` descriptor. Public content works normally without the extension. Discovery reads only the current top-frame descriptor after the user enables its exact origin/path pair. Stored descriptors are snapshots, and refreshing the page replaces its local snapshot.

AdapterRegistry registers trusted application-owned handlers, discovers by scope, validates invocation input, emits bounded progress, cancels declared cancellable operations and invalidates all outstanding operations when a document changes. Page-provided scripts are never registered or executed. The initial extension exposes page actions as inspectable declarations; it does not invoke page handlers.

The fixtures describe two independent projects with distinct identifiers, hierarchies, action inputs and routes. They are developer fixtures and are never seeded into default user storage.

The native bridge uses canonical version-1 `method/request/version` envelopes with lexicographic object keys. Scope is the exact origin plus path string, not an object. Native submit is restricted to the documented text digest operation and current document identity. Browser requests do not authorize review approval. The hello probe reports actual connection separately from review transport. The current native foundation reports review transport unavailable, so submit remains disabled even when connection is ready. Grant-generation discovery and native request UI are pending coordinated runtime acceptance.
