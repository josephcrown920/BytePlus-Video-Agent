# Repository consolidation

`BytePlus-Video-Agent` is the destination for the three original repositories.
The root is one pnpm workspace with one shared API, dependency lockfile, and
development launcher. No original application has been discarded.

| Original component | Active location |
| --- | --- |
| ModelArk video application | `artifacts/byteplus-video-agent` |
| Cinematic and viral Studio | `artifacts/byteplus-studio` |
| Aura AI application | `artifacts/aura-ai` |
| Aura mobile application | `artifacts/aura-mobile` |
| Shared Express API, including Studio planning and director bridge | `artifacts/api-server` |
| Native Node CLI, REST server, web UI, pipeline and production bible | `tools/vidagent` |
| ModelArk production planning and workflow registry | `agent-core` |
| API contracts, generated clients, database package | `lib` |
| Supabase migrations | `supabase` |
| Standalone reference projects and media | `tools/vidagent/projects` |

The ModelArk API and generated contracts provide the broader API surface.
Studio's `/api/video/plan` and `/api/modelark-director` routes are added to it.
The workflow registry combines both preset maps, retaining input declarations.
The standalone server stays independently runnable so its original `/api/video`
and `/api/image` APIs retain their behavior without namespace collisions.

## Preservation

`preserved/<original-repository>/` holds an exact snapshot of every tracked file
at each original local HEAD. `preserved/manifest.json` records the source commit,
Git blob ID, executable mode and SHA-256 of each file. These snapshots are outside
the active pnpm package globs. Original conflicting implementations, lockfiles,
documentation, images, media and project files remain accessible there.

`preserved/git/*.bundle` contains complete original Git objects and all available
branches and tags fetched during consolidation. The merge commit connects all
three main histories. Unmerged branch tips are also recoverable from their source
bundle. Run `pnpm verify:preservation` to check snapshots and bundles against the
original Git trees. To inspect a backup independently:

```sh
git clone preserved/git/Byteplusvidagent.bundle /tmp/vidagent-recovery
```

These are Git/file backups. They do **not** back up GitHub issues, PR discussions,
releases or their separately uploaded assets, Actions history, repository secrets,
deployment settings, webhooks, access rules, or external Supabase/provider data.
Deleting a GitHub repository can destroy that information. The source repositories
must remain until that information is inventoried and any required migration or
backup is complete. Archiving them preserves their GitHub metadata.

## Integration repairs

- Fixed the standalone server's orphaned `else if` and director error fallthrough.
- Added the Draft Manager referenced by standalone routes but missing from Git.
- Fixed Studio's duplicate state fields, missing imports and queue tracking.
- Preserved both production-stage vocabularies and added missing narration state.
- Fixed the director bridge's unsafe access to an untyped error response.
- Unified React type resolution and rebuilt stale generated declarations.
- Added API proxying and one development command for the web applications.

Studio's render queue is a demonstration with simulated progress and example
assets. It is not evidence of real rendering or CDN delivery. The standalone
pipeline and ModelArk clients remain the implementations for real provider calls.
Live provider workflows still require valid credentials, activated models, and
their original service configuration; consolidation does not supply those.

## Validation

```sh
pnpm install --frozen-lockfile
pnpm verify:preservation
pnpm typecheck
pnpm test
pnpm build
```

`build` covers the shared API and all three production web applications. The
mobile app remains included and type checked; its Expo deployment build is a
separate platform-specific workflow. Mockup sandbox and preserved source snapshots
are not production build targets. The test command runs the original API and
agent-core tests plus unified route, standalone startup and draft persistence tests.

Use `pnpm dev`, `pnpm dev:studio` or `pnpm dev:aura` for a frontend plus shared API.
The launcher defaults to frontend port 3100 and API port 5100. Set `PORT` and
`API_PORT` to distinct values for concurrent frontends. Requests to `/api` are
proxied to the selected API. Use `pnpm dev:standalone` separately (default 3000).
