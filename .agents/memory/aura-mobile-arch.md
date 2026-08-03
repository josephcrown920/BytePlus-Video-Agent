---
name: Aura Mobile architecture
description: Key decisions and integration patterns for the Expo mobile artifact (artifacts/aura-mobile)
---

# Aura Mobile — Key Decisions

## Auth
- Supabase client initialized in `lib/supabase.ts` with AsyncStorage for session persistence
- Env vars: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (set as shared env vars, same values as `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`)
- AuthContext (`context/AuthContext.tsx`) wraps the app; useAuth() exposes session, signIn, signUp, signOut, getToken
- Only email/password auth implemented; Google OAuth deferred (requires expo-web-browser deep link flow)

## API connectivity
- `setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`)` called at module level in `app/_layout.tsx`
- `setAuthTokenGetter` supplies Supabase access_token from the live session for all API client requests
- Chat uses raw `fetch` from `expo/fetch` (not the generated client) because it needs streaming

## Stream format
- API server (`/api/chat`) uses Vercel AI SDK `toUIMessageStreamResponse` which emits lines like `0:"text"` (text delta), `9:{toolInvocation}` (tool call), `a:{toolResult}`, `d:{done}`
- Mobile parses this with `parseStreamLine()` in `app/chat/[threadId].tsx` — splits on first `:`, JSON.parses the payload
- After streaming completes, messages are reloaded from Supabase to get persisted parts (tool results, images)

## Database access
- Threads and messages queried directly via Supabase client (no API endpoint needed — RLS protects data)
- Thread creation: `supabase.from('threads').insert({ user_id, title: 'New conversation' })`
- Messages: `parts` column is JSON array of `MessagePart` objects (type: 'text' | 'tool-invocation')

**Why:** Adding backend routes for read operations would duplicate the Supabase client query logic already used by the web app. Direct Supabase queries from mobile are safe because RLS policies enforce user ownership.

## Image rendering
- Images embedded by AI as markdown `![alt](url)` in text parts
- `parseTextContent()` in `MessageBubble.tsx` splits text on markdown image syntax and renders `<Image>` components
- Tool invocation results with HTTP URLs also rendered as images
- Full storyboard / video rendering deferred as a follow-up task

## Navigation
- No tabs — stack-based (sign-in → threads → chat) like ChatGPT mobile
- `app/(tabs)/` directory was removed; `headerShown: false` on all Stack screens with custom headers
