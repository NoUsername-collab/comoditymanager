<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Architecture

Read **[ARCHITECTURE.md](./ARCHITECTURE.md)** before adding modules or cross-layer imports.
Layer rules are enforced by `src/lib/architecture/__tests__/import-boundaries.test.ts`.
