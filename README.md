# BytePlus Unified Video Agent

One repository for the ModelArk video application, cinematic/viral Studio,
Aura AI, Aura mobile, and the standalone BytePlus video CLI and production pipeline.

## Quick start

Requires Node.js 24 and pnpm 10.32.1.

```sh
pnpm install --frozen-lockfile
pnpm dev                 # Video application + shared API
# Alternatives: pnpm dev:studio, pnpm dev:aura
```

The frontend defaults to port 3100 and the shared API to port 5100. Set `PORT` and
`API_PORT` to select different ports. The launcher builds the API and starts both
processes, with frontend API proxying enabled.

```sh
pnpm dev:standalone      # Native Node server + original standalone web UI
pnpm --filter byteplus-vidagent cli image generate --prompt "A cinematic landscape" --version 5.0
```

For direct CLI arguments, use `pnpm --filter byteplus-vidagent cli image generate
--prompt "A cinematic landscape" --version 5.0`. Generation is a dry run unless
`--confirmed` is supplied. Real generation requires a server-side `ARK_API_KEY`
and activated models. Original app integrations retain their existing Supabase,
provider, Replit connector and optional MCP configuration requirements. Never put
credentials in source control. Studio rendering remains a demonstration using
simulated progress and example media, not actual provider execution.

## Checks

```sh
pnpm verify:preservation
pnpm typecheck
pnpm test
pnpm build
```

The mobile app is preserved and type checked; mobile deployment remains a separate
Expo workflow. `pnpm build` builds the shared API and the three production web apps.

See [consolidation and recovery](docs/CONSOLIDATION.md) for the component map,
original snapshots, Git-history backups, integration changes and validation scope.
Original README files and all conflicting source versions are retained under
`preserved/`. No original GitHub repository should be deleted until GitHub metadata
and external settings have also been inventoried and preserved.
