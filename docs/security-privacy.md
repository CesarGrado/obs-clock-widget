# Security and privacy model

Configuration is a closed version-1 schema in the URL fragment. The fragment is public to anyone holding the URL but is not included in HTTP requests. Inputs are bounded and allowlisted, unknown/duplicate/prototype keys fail to defaults, formatting uses a tiny non-executable token grammar, and the renderer creates fixed text nodes and property-specific styles.

There are no accounts, identifiers, cookies, web storage, IndexedDB, analytics, telemetry, backend APIs, or service workers. The CDN may retain ordinary access metadata for static document/assets according to its operator policy; fragment settings are absent from that metadata by protocol.

CSP disables connections and all executable/resource classes except same-origin scripts, styles and fonts plus same-origin/data images. Widget embedding remains allowed intentionally for OBS.
