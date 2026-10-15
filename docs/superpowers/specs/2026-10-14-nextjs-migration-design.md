# Unigram — Next.js Frontend Migration Design

**Date:** 2026-10-14
**Author:** AI (Antigravity)
**Status:** Draft — awaiting human approval

---

## Intent & Why

Unigram is a campus social PWA for CRSU Jind students. It's currently a vanilla HTML/JS/CSS SPA served from `public/` on Vercel, with an Express API backend at `api/index.js`. The app has grown to 18 page modules, 2 CSS files (~1200 lines), and a custom hash-based router.

**Problems with the current setup:**
1. **Slow** — No code splitting by framework (manual lazy imports only), no SSR, no image optimization, no automatic bundling. Every page loads raw JS modules from `esm.sh` (Supabase SDK) with no build step.
2. **UI is broken in many places** — Hand-written CSS with no component library. Inconsistent styling across pages. No design system enforcement.
3. **Not scalable** — Adding a new feature means writing raw HTML strings in JS (`render()` returns template literals), manual event delegation, manual DOM updates. No component model, no state management, no type safety.

**Why Next.js:**
- App Router with React Server Components for fast initial load
- Built-in code splitting, image optimization, font optimization
- shadcn/ui + Tailwind CSS for a polished, consistent component library
- React component model makes features composable and testable
- Massive ecosystem for future features (React Query, Zustand, etc.)

---

## Goals

1. **Migrate all 18 frontend pages** to Next.js App Router with React components
2. **Drastically improve UI** using Tailwind CSS + shadcn/ui — X/Reddit-level clean design
3. **Keep the existing Express API backend untouched** — `api/`, `src/`, `api/index.js` stay exactly as they are
4. **Keep the admin panel untouched** — `admin.html` stays as standalone HTML
5. **Maintain PWA installability** — manifest, service worker, theme-color
6. **Dark mode as default** — same behavior as now
7. **Zero function breakage** — every feature that works today must work after migration

## Non-Goals

- NOT migrating backend to Next.js API routes
- NOT touching admin panel
- NOT adding new features (except where migration naturally improves UX)
- NOT changing the Supabase schema or RLS policies
- NOT doing SSR for authenticated pages (all pages require auth — CSR is fine)

## Anti-Goals (what would make this a failure even if it works)

- A migration that breaks any existing feature (delete, DM, anon posts, etc.)
- A migration that makes the app SLOWER than current vanilla JS
- A migration that loses the current design identity (navy + marigold + Space Grotesk)
- Half-migrated state where some pages are Next.js and some are old HTML

---

## Constraints

1. **Same Vercel deployment** — Next.js frontend + Express API must coexist on one Vercel project
2. **Same Supabase project** — same keys, same tables, same RLS
3. **Same domain** — `campusbuddy-ochre.vercel.app`
4. **Express API routing** — `/api/*` must continue to hit `api/index.js` (Express), not Next.js API routes
5. **Auth flow** — Supabase Auth (email+password and Google OAuth) with JWT passed to Express API
6. **admin.html** stays as a standalone static HTML page at `/admin.html`
7. **auth.html** needs to be recreated as a Next.js page (it's the login/signup flow)
8. **Legal pages** (privacy, terms, contact, guidelines) — recreated as Next.js static pages

---

## Architecture

### Deployment Structure (Same Vercel Project)

```
d:\CRSU APP\                     ← Vercel project root
├── api/                         ← Express serverless function (UNTOUCHED)
│   ├── index.js                 ← Main Express app
│   ├── lib/supabase.js
│   ├── middleware/
│   └── routes/
├── src/                         ← Backend route implementations (UNTOUCHED)
│   └── routes/
├── public/                      ← RENAMED to public-legacy/ (archived)
│   └── admin.html               ← KEEP — served as static file
├── app/                         ← Next.js App Router pages
├── components/                  ← React components
├── lib/                         ← Shared utilities (API client, auth, supabase)
├── hooks/                       ← React custom hooks
├── styles/                      ← Tailwind globals
├── next.config.js
├── tailwind.config.js
├── package.json
├── vercel.json                  ← Updated: Next.js framework + /api rewrite
└── tsconfig.json                ← TypeScript (optional but recommended)
```

### Key Architectural Decisions

#### 1. Next.js App Router (Client-Side Rendering for Auth Pages)

All authenticated pages use `"use client"` since they need:
- Supabase Auth session (client-side)
- Supabase Realtime subscriptions (client-side)
- Interactive UI (compose, vote, comment, DM)

Structure:
```
app/
├── layout.tsx                   ← Root layout: fonts, Tailwind, theme provider
├── (auth)/                      ← Auth group (no nav shell)
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── forgot-password/page.tsx
├── (main)/                      ← Main app group (with nav shell)
│   ├── layout.tsx               ← App shell: top nav, bottom nav, toast container
│   ├── feed/page.tsx
│   ├── anon/page.tsx
│   ├── dm/page.tsx
│   ├── dm/[conversationId]/page.tsx
│   ├── profile/page.tsx
│   ├── settings/page.tsx
│   ├── pyq/page.tsx
│   ├── notices/page.tsx
│   ├── timetable/page.tsx
│   ├── lost-found/page.tsx
│   ├── notes/page.tsx
│   ├── bookmarks/page.tsx
│   ├── about/page.tsx
│   ├── wall/page.tsx
│   └── notifications/page.tsx
├── privacy/page.tsx             ← Static legal pages (can be SSG)
├── terms/page.tsx
├── contact/page.tsx
└── guidelines/page.tsx
```

#### 2. Supabase Client (Client-Side)

Replace the current `esm.sh` import with npm package:
```ts
// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

#### 3. API Client (Talking to Express Backend)

The existing `API.get/post/patch/put/delete` pattern maps directly to a React-friendly wrapper:

```ts
// lib/api.ts
import { supabase } from './supabase'

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function request(method: string, path: string, body?: any) {
  const token = await getToken()
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json()
  if (!res.ok) throw Object.assign(new Error(data.error), { code: data.code, status: res.status })
  return data
}

export const api = {
  get:    (path: string) => request('GET', path),
  post:   (path: string, body: any) => request('POST', path, body),
  patch:  (path: string, body: any) => request('PATCH', path, body),
  put:    (path: string, body: any) => request('PUT', path, body),
  delete: (path: string) => request('DELETE', path),
}
```

#### 4. Auth Context (React Context replacing Auth module)

```ts
// lib/auth-context.tsx
"use client"
// React Context that provides user + profile to all components
// Replaces the imperative Auth module with declarative React patterns
// useAuth() hook for consuming
```

#### 5. Realtime (Custom Hook)

```ts
// hooks/use-realtime.ts
// Wraps Supabase realtime subscriptions in React lifecycle
// Handles visibility change teardown/restore
// useRealtimeNotifications(userId, onNotif)
// useRealtimeMessages(conversationId, onMessage)
```

#### 6. UI Component Library

**Tailwind CSS** for utility-first styling
**shadcn/ui** components used:
- `Button`, `Input`, `Textarea` — forms
- `Card` — post cards, profile cards, stats
- `Dialog`, `Sheet` — modals, bottom sheets
- `DropdownMenu` — post kebab menus (fixes the current body-append click bug!)
- `Avatar` — user avatars
- `Badge` — department chips, notification badges
- `Tabs` — settings sections
- `ScrollArea` — DM thread messages
- `Skeleton` — loading states
- `Toast` (sonner) — notifications
- `Separator` — dividers
- `Command` — search (future)

**Design Tokens** preserved from current app:
- Navy: `#1B2340` (primary text, dark surfaces)
- Marigold: `#D4AF37` / `#F2A93B` (accent)
- Fonts: Space Grotesk (headings), Inter (body), JetBrains Mono (numbers)
- Dark theme: `#0D1117` background (GitHub-inspired)

#### 7. Vercel Configuration

```json
{
  "framework": "nextjs",
  "functions": {
    "api/index.js": {
      "maxDuration": 10,
      "includeFiles": "src/**",
      "runtime": "nodejs20.x"
    }
  },
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/index.js" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    }
  ]
}
```

Key: The `/api/:path*` rewrite ensures Express backend handles all API calls, NOT Next.js.

#### 8. Environment Variables

```env
# .env.local (Next.js)
NEXT_PUBLIC_SUPABASE_URL=https://cqgijdpxbidamipjjuuf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_NAME=Unigram
NEXT_PUBLIC_UNIVERSITY=CRSU, Jind

# These stay in Vercel env vars for the Express backend:
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
FRONTEND_URL=...
```

---

## Page-by-Page Migration Map

| Current (Vanilla JS) | Next.js Route | Component Strategy |
|---|---|---|
| `index.html` + `router.js` | `app/(main)/layout.tsx` | App shell with nav, replaced by Next.js router |
| `auth.html` | `app/(auth)/login/page.tsx` | Full rewrite as React page |
| `pages/feed.js` (806 lines) | `app/(main)/feed/page.tsx` | Split into: `<PostCard>`, `<ComposeBox>`, `<CommentsSheet>`, `<PostMenu>` |
| `pages/anon.js` | `app/(main)/anon/page.tsx` | Reuse `<PostCard>` with anon variant prop |
| `pages/dm.js` (593 lines) | `app/(main)/dm/page.tsx` + `dm/[id]/page.tsx` | Split: `<ConversationList>`, `<MessageThread>`, `<MessageBubble>` |
| `pages/profile.js` | `app/(main)/profile/page.tsx` | `<ProfileCard>`, `<StatsGrid>`, `<UserPosts>` |
| `pages/settings.js` | `app/(main)/settings/page.tsx` | `<SettingsGroup>`, `<SettingsRow>` |
| `pages/pyq.js` | `app/(main)/pyq/page.tsx` | `<PYQCard>`, `<FilterBar>` |
| `pages/notices.js` | `app/(main)/notices/page.tsx` | `<NoticeCard>` |
| `pages/timetable.js` | `app/(main)/timetable/page.tsx` | `<TimetableGrid>` |
| `pages/lostfound.js` | `app/(main)/lost-found/page.tsx` | `<LostFoundCard>`, `<ComposeSheet>` |
| `pages/notes.js` | `app/(main)/notes/page.tsx` | `<NoteCard>`, `<UploadSheet>` |
| `pages/bookmarks.js` | `app/(main)/bookmarks/page.tsx` | Reuse `<PostCard>` |
| `pages/about.js` | `app/(main)/about/page.tsx` | Static content component |
| `pages/wall.js` | `app/(main)/wall/page.tsx` | `<ContributorCard>` |
| `pages/notifications.js` | `app/(main)/notifications/page.tsx` | `<NotificationItem>` |
| `privacy.html` | `app/privacy/page.tsx` | SSG static page |
| `terms.html` | `app/terms/page.tsx` | SSG static page |
| `contact.html` | `app/contact/page.tsx` | SSG static page |
| `guidelines.html` | `app/guidelines/page.tsx` | SSG static page |
| `admin.html` | stays as `/admin.html` static file | NOT migrated |

---

## Shared Components to Build

### Core UI Components (built on shadcn/ui)

1. **`<PostCard>`** — unified for feed + anon + bookmarks
   - Props: `post`, `variant: 'feed' | 'anon'`, `onVote`, `onComment`, `onDelete`, etc.
   - Uses shadcn `Card`, `Avatar`, `DropdownMenu`, `Badge`
   
2. **`<ComposeBox>`** — post composer
   - Props: `variant: 'feed' | 'anon'`, `onSubmit`
   - Image upload with compression (reuse `compressImage` logic from utils.js)

3. **`<CommentsSheet>`** — bottom sheet for comments
   - Uses shadcn `Sheet` (mobile) / `Dialog` (desktop)
   
4. **`<PostMenu>`** — kebab menu (copy link, report, delete)
   - Uses shadcn `DropdownMenu` — this FIXES the current body-append click bug permanently

5. **`<ConversationList>`** — DM sidebar/list
6. **`<MessageThread>`** — DM message area with realtime
7. **`<MessageBubble>`** — individual message
8. **`<ProfileCard>`** — profile header with cover photo
9. **`<StatsGrid>`** — 3-column stats display
10. **`<SettingsGroup>`** + **`<SettingsRow>`** — settings layout

### Utility Hooks

1. **`useAuth()`** — current user + profile from context
2. **`useApi()`** — wrapper around API client with loading/error states
3. **`useInfiniteScroll(fetchFn)`** — replaces manual IntersectionObserver
4. **`useRealtime(channel, config)`** — Supabase realtime with cleanup
5. **`useTheme()`** — dark/light toggle with localStorage persistence
6. **`useMediaUpload()`** — image compression + Supabase Storage upload

### Utility Functions (migrated from utils.js)

- `escHtml()` → use React's built-in JSX escaping (no longer needed)
- `timeAgo()` → keep as utility, or use `date-fns/formatDistanceToNow`
- `deptPill()` → `<DepartmentBadge>` component
- `compressImage()` → keep in `lib/image.ts`
- `showToast()` → replaced by `sonner` (shadcn toast)
- `showConfirm()` → replaced by shadcn `AlertDialog`
- `fmtNum()` → keep as utility

---

## Migration Strategy

### Phase 1: Scaffold (no feature work)
1. Install Next.js 15 + React 19 + Tailwind + shadcn/ui in the repo root
2. Move `public/` to `public-legacy/` (archive)
3. Copy static assets (icons, manifest, sw.js) to new `public/`
4. Keep `api/` and `src/` untouched
5. Set up `vercel.json` for Next.js + Express coexistence
6. Set up Supabase client, API client, auth context
7. Create root layout with fonts + theme provider

### Phase 2: App Shell + Auth
8. Build `(auth)` group: login, signup, forgot-password pages
9. Build `(main)` layout: top nav, bottom nav, "More" menu
10. Auth middleware: redirect unauthenticated users to `/login`

### Phase 3: Core Pages (Feed + Anon + DM)
11. Feed page with PostCard, ComposeBox, infinite scroll, comments, votes
12. Anonymous feed page (PostCard with anon variant)
13. DM list + thread pages with realtime messaging

### Phase 4: Secondary Pages
14. Profile page
15. Settings page
16. PYQ, Notices, Timetable, Lost & Found, Notes pages
17. Bookmarks page

### Phase 5: Static + Polish
18. About, Contribution Wall pages
19. Legal pages (privacy, terms, contact, guidelines)
20. Notifications page
21. PWA: manifest, service worker, theme-color meta
22. Final QA: all pages at 360/390/430px, light + dark, no console errors

### Phase 6: Cleanup + Deploy
23. Archive `public-legacy/`
24. Update README
25. Verify Vercel deployment: Next.js frontend + Express API + admin.html
26. Smoke test all features on production

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Express API routes conflict with Next.js API routes | Vercel rewrite `/api/*` → `api/index.js` takes priority. No `app/api/` directory in Next.js. |
| admin.html stops working | Keep it as static file in `public/admin.html`. Vercel serves static files from `public/` before Next.js routes. |
| Supabase realtime breaks in React | Custom hooks with proper cleanup in `useEffect` return. Same channel strategy as current code. |
| Dark mode flash (FOUC) | Next.js `<Script strategy="beforeInteractive">` for theme detection, same as current inline `<script>`. |
| Build size too large | shadcn/ui is copy-paste (not a library import) — only what's used is bundled. Tree-shaking by default. |
| PWA breaks | `next-pwa` handles service worker + manifest integration. |

---

## What's Left to the Builder

- Exact component file structure within `components/` (flat vs grouped)
- Whether to use TypeScript (recommended) or JavaScript
- React Query vs manual `useEffect` for data fetching (React Query recommended for feed/DM)
- Zustand vs Context for global state (Context is fine at this scale)
- Exact shadcn/ui component customization (theme colors mapped to CSS variables)
- Animation library choice (Framer Motion vs CSS transitions)

---

## Builder-Check Findings

After reviewing every frontend file, here are gaps and details the builder must know:

### Features the Design Must Cover (verified from source)

1. **auth.html is 1053 lines** — it's a complex standalone page with:
   - Hero banner with campus photo (fetched from `/api/config`)
   - 5 auth flows: Login, Signup (multi-step), Google OAuth callback, Forgot Password, Change Password (forced)
   - Pending approval screen
   - Rejected/banned screen
   - All in one file with custom CSS (not using main.css)
   - **Next.js migration must recreate all 5 flows** as `(auth)` group pages

2. **Profile page has**:
   - Avatar upload to Supabase Storage (`uploadToStorage('avatars', path, file)`)
   - Bio edit (max 200 chars)
   - Phone number edit
   - Change password modal
   - Cover photo fetched from `/api/config` (global app cover, not per-user)
   - Own profile vs other user's profile (`?id=xxx` query param)
   - Post history with infinite scroll
   - Stats grid (karma, posts, notes)

3. **storage.js** — `uploadToStorage(bucket, path, file)` and `deleteFromStorage(bucket, path)` — used by profile (avatars), PYQ, Notes, Lost & Found. Must become `lib/storage.ts`.

4. **All utility functions to migrate** (from utils.js, 342 lines):
   - `getDeptColorIndex()`, `deptPill()` → `<DepartmentBadge>` component
   - `avatarHtml()` → `<UserAvatar>` component
   - `timeAgo()`, `fullDateTime()` → `lib/date.ts`
   - `escHtml()` → NOT needed (React handles escaping)
   - `showToast()` → replaced by `sonner`
   - `showConfirm()` → replaced by shadcn `AlertDialog`
   - `skeletonPostCards()` → shadcn `Skeleton` components
   - `debounce()` → keep in `lib/utils.ts`
   - `Icons` object (25 SVG icons) → replace with `lucide-react` package
   - `validatePhone()`, `validateEmail()`, `validatePassword()` → `lib/validation.ts`
   - `compressImage()` → `lib/image.ts`
   - `fmtNum()`, `fmtBytes()` → `lib/format.ts`
   - `updateNavActive()` → NOT needed (Next.js `usePathname()` handles active nav)

5. **components.js** has these shared render functions:
   - `renderPostCard()` → `<PostCard>` component
   - `renderComment()` → `<Comment>` component
   - `renderComposeArea()` → `<ComposeBox>` component
   - `renderCommentsModal()` → `<CommentsSheet>` component
   - `renderReportModal()` → `<ReportDialog>` component
   - `renderEditModal()` → `<EditPostDialog>` component
   - `renderPostMenuItems()` → `<PostMenu>` (shadcn DropdownMenu)
   - `renderOptionsDropdown()` → NOT needed (shadcn DropdownMenu handles positioning)
   - `renderFeedHeader()` → part of feed page layout

### Critical Gotchas for Builder

1. **`/api/config` endpoint** — returns app-wide config including `cover_url` for profile page. This is fetched client-side. Must include in the migration.

2. **Profile page routing** — currently uses hash params `#/profile?id=xxx` for viewing other users. In Next.js: `/profile` = own, `/profile/[userId]` = other user. Update the design's route map.

3. **DM thread** — currently `#/dm` with state toggle (list vs thread). In Next.js: `/dm` = list, `/dm/[conversationId]` = thread. This is already in the design.

4. **Auth redirect flow** — all `window.location.href = '/auth.html'` calls must become `router.push('/login')` in Next.js.

5. **Supabase client import** — currently `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'` (CDN). In Next.js: `npm install @supabase/supabase-js @supabase/ssr`.

6. **CSS components.css** — contains ALL component styles (post cards, DM layout, profile cards, settings, modals, etc.). This is ~800+ lines that must be replicated in Tailwind. NOT a trivial task.

7. **admin.html** — links to `main.css` and `components.css` via `<link>` tags. After migration, these files won't exist at their current paths. The builder must either:
   - Keep copies of `main.css` and `components.css` in Next.js `public/css/` for admin.html
   - Or make admin.html self-contained with inline styles
   - **Recommended: Keep CSS files in `public/css/` for admin.html backward compatibility**

8. **Service Worker** — `sw.js` at root. Must be in Next.js `public/sw.js`. Use `next-pwa` or copy manually.

9. **Manifest.json** — currently at `public/manifest.json`. Must be at Next.js `public/manifest.json` with updated start_url, scope.

### Updated Route Map (corrections)

| Current Pattern | Next.js Route |
|---|---|
| `#/profile` (own) | `/profile` |
| `#/profile?id=xxx` (other) | `/profile/[userId]` |
| `#/dm` (list) | `/dm` |
| `#/dm` (thread via state) | `/dm/[conversationId]` |
| `auth.html` (login) | `/login` |
| `auth.html` (signup) | `/signup` |
| `auth.html` (forgot-pw) | `/forgot-password` |
| `auth.html` (change-pw) | `/change-password` |
| `auth.html` (pending) | `/pending` |

---

## Summary

This is a **full frontend rewrite** from vanilla JS to Next.js React, while keeping the Express backend and admin panel completely untouched. The migration preserves every existing feature, fixes known bugs (dropdown click delegation, broken menu items), and dramatically improves UI quality using Tailwind CSS + shadcn/ui.

**Estimated scope:** ~40-50 files to create, 0 backend files changed.
