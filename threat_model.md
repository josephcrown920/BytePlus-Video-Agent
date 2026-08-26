# Threat Model

## Project Overview
Aura is a public, autoscaled Express 5 API with a React/TanStack web client and an Expo/React Native mobile client. Authenticated users manage Supabase-backed conversations, memories, generated content, images, and share snapshots. The API also calls OpenAI-compatible AI integrations, DuckDuckGo, Pollinations, ElevenLabs, and HeyGen; generated media is stored in Supabase Storage. The mockup sandbox is design-only unless separately deployed.

## Assets
- **Supabase accounts, bearer sessions, threads, messages, memories, and content items** — private user data and durable user preferences.
- **Generated images, videos, voiceovers, and scripts** — potentially proprietary creative work; signed URLs and share snapshots may intentionally disclose selected output.
- **Provider credentials and billing/quota** — server-side AI, HeyGen, ElevenLabs, and database/Supabase credentials must not be exposed or abused.
- **Public share links** — intentionally public immutable snapshots, but must not expose anything beyond the creator-selected snapshot or enable script injection.

## Trust Boundaries
- **Web/mobile client to Express API and Supabase** — clients are attacker-controlled; every protected operation must validate the Supabase access token and enforce user/object ownership server-side.
- **Express to Supabase database/storage** — the API uses publishable Supabase credentials plus user tokens and relies on Supabase RLS; queries and storage paths must remain user-scoped.
- **Express to external services** — user/LLM-influenced prompts and URLs cross into OpenAI-compatible services, DuckDuckGo, Pollinations, ElevenLabs, and HeyGen. Responses and redirects are untrusted; internal network addresses must not be reachable through fetch helpers.
- **Authenticated to public sharing** — `/api/share/:id` intentionally exposes a selected snapshot by UUID. Share data is later rendered by the browser and must be treated as untrusted.
- **User to local browser storage** — video-agent projects and URLs are stored in client localStorage; storage must be isolated between accounts where private work is expected.

## Scan Anchors
- Production API entry: `artifacts/api-server/src/app.ts`, `src/index.ts`, `src/routes/index.ts`.
- Highest-risk routes/tools: `src/routes/chat.ts`, `src/routes/video-agent.ts`, `src/routes/content.ts`, `src/routes/images.ts`, `src/routes/share.ts`; shared renderer `src/lib/animatic.ts`.
- Public surfaces: health, HeyGen capability probe, public share reads, and mobile static server. Authenticated surfaces: chat, content, image generation, video-agent generation/catalog/status, and share creation.
- Client surfaces: `artifacts/aura-ai/src` and `artifacts/aura-mobile`; `artifacts/mockup-sandbox` is dev/design-only.

## Threat Categories

### Spoofing
Supabase bearer tokens are the authentication boundary for API operations. Tokens must be validated with Supabase before protected data, generation, provider calls, or signed URLs are returned. OAuth redirect handling must not accept an attacker-controlled callback. Provider credentials must remain server-side.

### Tampering
Thread IDs, content IDs, user-scoped storage paths, HeyGen session IDs, and generated content are untrusted identifiers or data. Every mutation and provider operation must be tied to the authenticated user and must not accept mass-assigned ownership or privileged fields. LLM output and user prompts must not be treated as authorization data.

### Information Disclosure
Conversation, memory, content, and generated media responses must not cross user boundaries. Public share links are the sole intentional unauthenticated data path and must expose only the stored snapshot. Provider responses, internal errors, tokens, and secrets must not reach clients. Arbitrary server-side URL fetching must not expose metadata services, localhost APIs, or private network data.

### Denial of Service
Authenticated generation endpoints can consume AI/HeyGen quota and CPU/FFmpeg resources. Request bodies, prompt sizes, scene counts, concurrent generations, response sizes, and external fetches need bounded behavior and timeouts. Public probes and share reads should remain inexpensive.

### Elevation of Privilege
Object-level authorization is required for every thread, content item, artifact, and provider job. A caller who knows another user's opaque identifier must not retrieve its status, media URL, or data. Provider API keys grant shared account privileges and must never be used to authorize an arbitrary caller's job without an application-level ownership check.

### Repudiation
Sensitive generation, sharing, deletion, and account actions should be attributable to a validated user in server logs without logging bearer tokens or provider secrets. Current request logging redacts authorization and cookies.

### Injection
All database operations must remain parameterized/scoped. URLs supplied to server-side fetches need scheme, host, IP, redirect, and response controls. User/LLM text rendered in the web/mobile clients must remain text or sanitized media URLs; no raw HTML should become executable markup.
