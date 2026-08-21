# Cloudflare Pages

Provider-neutral output is in `dist/`.

- Build command: `npm run build`
- Output directory: `dist`
- Node: 22

`public/_headers` applies CSP, privacy/security headers, immutable hashed-asset caching, and HTML revalidation. `frame-ancestors *` is intentional: the render route must remain usable as an OBS browser source. Do not add `X-Frame-Options`.

Deployment, DNS, production smoke tests, actual OBS verification, and rollback promotion are deliberately not automated from this repository. Promote only the exact artifact that passed CI and manual OBS gates; retain the previous Pages deployment for rollback.
