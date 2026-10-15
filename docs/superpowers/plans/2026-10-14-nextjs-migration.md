# Unigram Next.js Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Unigram's frontend from vanilla HTML/JS/CSS to Next.js 15 App Router with Tailwind CSS + shadcn/ui, keeping the Express backend and admin panel untouched.

**Architecture:** Next.js client-side rendered app (all auth pages and main app pages are `"use client"` since they need Supabase Auth + Realtime). Express API stays at `/api/*` via Vercel rewrite. TypeScript throughout. shadcn/ui components for consistent, polished UI.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, @supabase/supabase-js, @supabase/ssr, lucide-react, sonner, next-pwa

**Spec:** `docs/superpowers/specs/2026-10-14-nextjs-migration-design.md`

## Global Constraints

- Node.js >= 20 (currently v24.16.0)
- Express backend (`api/`, `src/`) — ZERO changes. Not even formatting.
- `admin.html` — ZERO changes. Keep CSS files in `public/css/` for it.
- Supabase credentials: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Dark mode is the default theme
- Same Vercel project, same domain
- All pages require auth except: login, signup, forgot-password, legal pages
- App name: Unigram. University: CRSU, Jind, Haryana.
- Fonts: Space Grotesk (headings), Inter (body), JetBrains Mono (mono/numbers)
- Accent color: Marigold `#D4AF37` / `#F2A93B`

## Review Focus

1. **Auth redirect loops** — if Supabase session expires mid-use, the middleware should redirect to `/login` once, not loop. Test: clear session cookie, visit `/feed`, expect single redirect to `/login`.
2. **Express API coexistence** — `/api/health` must hit Express, not Next.js. Test: `curl /api/health` returns `{ status: 'ok' }` after migration.
3. **admin.html CSS** — after migration, `admin.html` must still render correctly with its CSS links. Test: visit `/admin.html`, confirm no broken styles.
4. **Supabase Realtime cleanup** — channel subscriptions must be torn down on page unmount. Test: navigate to DM thread, navigate away, check no leaked subscriptions in Supabase dashboard.
5. **Dark mode FOUC** — page must not flash white on load in dark mode. Test: hard refresh on `/feed` in dark mode, observe no white flash.

---

### Task 1: Project Scaffold & Configuration

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `postcss.config.mjs`
- Create: `.env.local`
- Modify: `vercel.json`
- Move: `public/` → `public-legacy/`
- Create: `public/` (new — icons, manifest, sw.js, css/ for admin)

**Interfaces:**
- Produces: Working Next.js dev server at `localhost:3000`, Tailwind configured with Unigram design tokens, all static assets served

- [ ] **Step 1: Archive old frontend**

```bash
git mv public public-legacy
mkdir public
```

Copy static assets needed by Next.js and admin.html:
```bash
cp -r public-legacy/icons public/icons
cp public-legacy/favicon.ico public/
cp public-legacy/manifest.json public/
cp public-legacy/sw.js public/
cp -r public-legacy/css public/css
cp public-legacy/admin.html public/
cp public-legacy/auth.html public/  # keep temporarily for fallback
cp public-legacy/guidelines.html public/
cp public-legacy/privacy.html public/
cp public-legacy/terms.html public/
cp public-legacy/contact.html public/
```

- [ ] **Step 2: Initialize Next.js**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --no-turbopack
```

If it fails because directory is not empty, manually install:
```bash
npm install next@latest react@latest react-dom@latest
npm install -D typescript @types/react @types/react-dom @types/node
npm install -D tailwindcss @tailwindcss/postcss postcss
```

- [ ] **Step 3: Configure `next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Don't let Next.js handle /api routes — Express handles them
  async rewrites() {
    return []  // vercel.json handles /api/* rewrite in production
  },
  // Allow Supabase storage images
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // Exclude api/ directory from Next.js build
  experimental: {
    serverComponentsExternalPackages: [],
  },
}

export default nextConfig
```

- [ ] **Step 4: Configure Tailwind with Unigram design tokens**

Create `src/app/globals.css` with Tailwind imports and CSS custom properties matching `public-legacy/css/main.css` (lines 9-101 for light, 502-541 for dark). Map all `--bg`, `--surface`, `--ink-*`, `--accent-*`, `--border-*`, `--shadow-*`, `--font-*` variables.

- [ ] **Step 5: Set up `.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=https://cqgijdpxbidamipjjuuf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZ2lqZHB4YmlkYW1pcGpqdXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTg0OTIsImV4cCI6MjEwMDc3NDQ5Mn0.LORzqP76qFf8_jHisrRXRc93oTnKnYe0H-VB_kdQYTI
NEXT_PUBLIC_APP_NAME=Unigram
```

- [ ] **Step 6: Update `vercel.json`**

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
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

- [ ] **Step 7: Install shadcn/ui + dependencies**

```bash
npx shadcn@latest init
npm install sonner lucide-react
npx shadcn@latest add button card input textarea avatar badge dialog sheet dropdown-menu separator skeleton scroll-area tabs alert-dialog tooltip
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```

Visit `localhost:3000` — should show Next.js default page. Visit `localhost:3000/admin.html` — should show admin panel (served from `public/`).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 + Tailwind + shadcn/ui"
```

---

### Task 2: Core Library — Supabase Client, API Client, Auth Context

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/api.ts`
- Create: `src/lib/auth-context.tsx`
- Create: `src/lib/utils.ts`
- Create: `src/lib/date.ts`
- Create: `src/lib/format.ts`
- Create: `src/lib/validation.ts`
- Create: `src/lib/image.ts`
- Create: `src/lib/storage.ts`

**Interfaces:**
- Produces:
  - `supabase` — Supabase browser client (`createBrowserClient`)
  - `api.get/post/patch/put/delete(path, body?)` — Express API wrapper
  - `AuthProvider` — React Context provider component
  - `useAuth()` — hook returning `{ user, profile, isLoggedIn, isActive, isAdmin, signOut, refreshProfile }`
  - `timeAgo(ts: string): string`, `fullDateTime(ts: string): string`
  - `fmtNum(n: number): string`, `fmtBytes(n: number): string`
  - `validatePhone(p: string): string | null`, `validateEmail(e: string): boolean`, `validatePassword(pw: string): string | null`
  - `compressImage(file: File, maxWidth?, targetKB?): Promise<Blob>`
  - `uploadToStorage(bucket, path, file): Promise<string>`, `deleteFromStorage(bucket, path): Promise<void>`
  - `cn(...classes): string` — Tailwind class merger (from shadcn)
  - `debounce(fn, ms): Function`

- [ ] **Step 1: Create `src/lib/supabase.ts`**

Port `public-legacy/js/supabase.js` — use `@supabase/ssr`'s `createBrowserClient`. Same auth options (persistSession, autoRefreshToken, detectSessionInUrl, storageKey `cw_auth_token`). Same realtime params.

- [ ] **Step 2: Create `src/lib/api.ts`**

Port `public-legacy/js/api.js` — same token caching (50s TTL), same `request()` function, same error shape. Export `api` object with `get/post/patch/put/delete`. Path prefix: `/api`.

- [ ] **Step 3: Create `src/lib/auth-context.tsx`**

Port `public-legacy/js/auth.js` as React Context:
- `AuthProvider` wraps the app, runs `supabase.auth.getSession()` on mount, fetches profile via `api.get('/auth/status')`, sets up `onAuthStateChange`.
- `useAuth()` hook returns `{ user, profile, isLoading, isLoggedIn, isActive, isAdmin, isSuperAdmin, needsProfile, mustChangePassword, isGoogleOnly, signOut, refreshProfile, signInWithEmail, signInWithGoogle, signUpWithEmail, completeProfile, forgotPassword, changePassword }`.
- Profile cached in localStorage key `cw_profile`.
- All functions map 1:1 from `Auth` module methods.

- [ ] **Step 4: Create utility modules**

- `src/lib/utils.ts` — `cn()` (from shadcn), `debounce()`, `getDeptColorIndex()`
- `src/lib/date.ts` — `timeAgo()`, `fullDateTime()` — port from utils.js lines 39-64
- `src/lib/format.ts` — `fmtNum()`, `fmtBytes()` — port from utils.js lines 248-260
- `src/lib/validation.ts` — `validatePhone()`, `validateEmail()`, `validatePassword()` — port from utils.js lines 179-195
- `src/lib/image.ts` — `compressImage()` — port from utils.js lines 203-233
- `src/lib/storage.ts` — `uploadToStorage()`, `deleteFromStorage()` — port from storage.js

- [ ] **Step 5: Verify imports compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: core lib — supabase, api, auth context, utilities"
```

---

### Task 3: Shared UI Components

**Files:**
- Create: `src/components/user-avatar.tsx`
- Create: `src/components/department-badge.tsx`
- Create: `src/components/post-card.tsx`
- Create: `src/components/post-menu.tsx`
- Create: `src/components/compose-box.tsx`
- Create: `src/components/comments-sheet.tsx`
- Create: `src/components/report-dialog.tsx`
- Create: `src/components/edit-post-dialog.tsx`
- Create: `src/components/confirm-dialog.tsx`
- Create: `src/components/splash-screen.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `api`, `timeAgo()`, `fmtNum()`, `compressImage()`, `uploadToStorage()`, shadcn components
- Produces:
  - `<UserAvatar name imgUrl size />` — avatar with image or initials
  - `<DepartmentBadge department />` — colored pill
  - `<PostCard post variant="feed"|"anon" currentUserId onVote onComment onBookmark onDelete onReport onEdit />` — full post card
  - `<PostMenu postId isOwn isAdmin onCopyLink onReport onDelete />` — dropdown using shadcn DropdownMenu
  - `<ComposeBox variant="feed"|"anon" onSubmit />` — post composer with image upload
  - `<CommentsSheet postId open onClose />` — bottom sheet for comments
  - `<ReportDialog postId open onClose />` — report modal
  - `<EditPostDialog post open onClose onSave />` — edit post modal
  - `<ConfirmDialog open message confirmLabel type onConfirm onCancel />` — replaces native confirm()
  - `<SplashScreen />` — premium loading splash (port from index.html)

- [ ] **Step 1: Create `<UserAvatar>`**

Port `avatarHtml()` from utils.js. Use shadcn `Avatar` component with `AvatarImage` + `AvatarFallback` (initials). Props: `name: string`, `imgUrl?: string`, `size?: 'sm' | 'md' | 'lg' | 'xl'`.

- [ ] **Step 2: Create `<DepartmentBadge>`**

Port `deptPill()` from utils.js. Use shadcn `Badge` with deterministic color from `getDeptColorIndex()`. Truncate long names at 24 chars.

- [ ] **Step 3: Create `<PostMenu>`**

Use shadcn `DropdownMenu` with `DropdownMenuTrigger` (kebab icon) + `DropdownMenuContent`. Items: Copy Link, Report, Delete (danger, only if `isOwn || isAdmin`). This permanently fixes the body-append click delegation bug.

- [ ] **Step 4: Create `<PostCard>`**

Port `renderPostCard()` from components.js. Structure: header (UserAvatar + name + DepartmentBadge + time + PostMenu), content (text + optional image), action bar (vote buttons + comment count + bookmark). Support `variant="anon"` for anonymous styling. Wire up vote handlers with optimistic UI.

- [ ] **Step 5: Create `<ComposeBox>`**

Port `renderComposeArea()` + compose logic from feed.js. TextArea with char counter, image upload button, submit button. Image compression via `compressImage()`. Variant prop for anon styling.

- [ ] **Step 6: Create `<CommentsSheet>`**

Port `renderCommentsModal()` from components.js + comment logic from feed.js. Use shadcn `Sheet` (bottom drawer on mobile). Fetch comments from `/api/feed/{postId}/comments`, render list, compose new comment.

- [ ] **Step 7: Create `<ReportDialog>`, `<EditPostDialog>`, `<ConfirmDialog>`**

- ReportDialog: shadcn `Dialog` with reason selection + submit to `/api/reports`
- EditPostDialog: shadcn `Dialog` with TextArea, pre-filled content, save to `PATCH /api/feed/{id}`
- ConfirmDialog: shadcn `AlertDialog` replacing the custom `showConfirm()` — danger/warning variants

- [ ] **Step 8: Create `<SplashScreen>`**

Port splash HTML/CSS from `index.html` lines 29-133. Logo pulse animation, wordmark letter-by-letter, wave bars. Renders on top during auth init, fades out when app is ready.

- [ ] **Step 9: Verify all components compile**

```bash
npx tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: shared UI components — PostCard, ComposeBox, CommentsSheet, etc."
```

---

### Task 4: Root Layout + App Shell + Theme

**Files:**
- Create: `src/app/layout.tsx` — root layout
- Create: `src/app/(main)/layout.tsx` — authenticated app shell
- Create: `src/components/top-nav.tsx`
- Create: `src/components/bottom-nav.tsx`
- Create: `src/components/more-menu.tsx`
- Create: `src/components/theme-provider.tsx`
- Create: `src/hooks/use-theme.ts`
- Create: `src/middleware.ts` — auth redirect middleware

**Interfaces:**
- Consumes: `AuthProvider`, `useAuth()`, `SplashScreen`, shadcn components
- Produces:
  - Root layout with fonts (Space Grotesk, Inter, JetBrains Mono), metadata, theme script
  - `(main)` layout with TopNav, BottomNav, MoreMenu, AuthProvider
  - `useTheme()` hook — `{ theme, setTheme, toggleTheme }`
  - Auth middleware — redirects unauthenticated users to `/login`

- [ ] **Step 1: Create `src/app/layout.tsx`**

Root layout: `<html>` with dark theme default script (inline `<Script strategy="beforeInteractive">`), font loading via `next/font/google` (Space Grotesk, Inter, JetBrains Mono), `globals.css` import, `<meta name="theme-color">`, Toaster from sonner.

- [ ] **Step 2: Create theme provider + hook**

`ThemeProvider` reads `localStorage.getItem('unigram_theme')`, defaults to `'dark'`. Sets `data-theme` attribute on `<html>`. `useTheme()` returns `{ theme, setTheme, toggleTheme }`.

- [ ] **Step 3: Create `<TopNav>`**

Port desktop nav from `index.html` lines 138-185. Logo + wordmark + nav links (Feed, Anonymous, PYQs, Notices, Timetable, Lost & Found, Notes) + DM icon with badge + avatar dropdown (Profile, Sign Out). Use `usePathname()` for active state.

- [ ] **Step 4: Create `<BottomNav>`**

Port mobile nav from `index.html` lines 188-211. 5 items: Feed, Anon, DMs, Me, More. Badge on DMs. Use `usePathname()` for active state. `useRouter()` for navigation.

- [ ] **Step 5: Create `<MoreMenu>`**

Port more-menu from `index.html` lines 213-271. Use shadcn `Sheet` (bottom drawer). Items: PYQs, Notices, Timetable, Lost & Found, Notes, Bookmarks, Sign Out.

- [ ] **Step 6: Create `(main)/layout.tsx`**

Wrap children with `AuthProvider`. Show `SplashScreen` while auth is loading. Once loaded, render TopNav + main content + BottomNav. If not authenticated, redirect to `/login`. If not active (pending/banned), redirect to `/pending`.

- [ ] **Step 7: Create `src/middleware.ts`**

Next.js middleware for auth protection. Check for Supabase session cookie. If missing on protected routes, redirect to `/login`. Protected = everything under `/(main)/*`. Public = `/login`, `/signup`, `/forgot-password`, `/privacy`, `/terms`, `/contact`, `/guidelines`, `/admin.html`.

- [ ] **Step 8: Verify app shell renders**

```bash
npm run dev
```

Visit `localhost:3000` — should show splash → app shell with nav. Should redirect to `/login` if not authenticated.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: app shell — layout, nav, theme, auth middleware"
```

---

### Task 5: Auth Pages (Login, Signup, Forgot Password)

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/app/(auth)/change-password/page.tsx`
- Create: `src/app/(auth)/pending/page.tsx`

**Interfaces:**
- Consumes: `useAuth()` — `signInWithEmail`, `signInWithGoogle`, `signUpWithEmail`, `forgotPassword`, `changePassword`
- Produces: Complete auth flow matching `public-legacy/auth.html` (1053 lines, 5 flows)

- [ ] **Step 1: Create `(auth)/layout.tsx`**

Auth layout: centered card, no app nav. Hero banner area (gradient background, could add campus photo later via `/api/config`). AuthProvider for auth context.

- [ ] **Step 2: Create Login page**

Port login flow from auth.html. Email + password form, Google OAuth button, "Forgot Password" link, "Create Account" link. Handle: successful login → redirect to `/feed`, pending account → redirect to `/pending`, must_change_password → redirect to `/change-password`.

- [ ] **Step 3: Create Signup page**

Port multi-step signup from auth.html. Step 1: Email + Password (or Google). Step 2: Profile details (Full Name, Roll Number, Department dropdown, Phone Number). Call `signUpWithEmail()` or `completeProfile()`. On success → redirect to `/pending`.

- [ ] **Step 4: Create Forgot Password page**

Port forgot-password from auth.html. Roll Number + Phone Number form. Submit to `forgotPassword()`. Show success message.

- [ ] **Step 5: Create Change Password page**

Port forced change-password from auth.html. New password + confirm. Validation (8+ chars, letter + number). Submit to `changePassword()`. On success → redirect to `/feed`.

- [ ] **Step 6: Create Pending page**

Port pending approval screen from auth.html. Clock icon, "Your account is under review" message, sign out button. Also handle rejected/banned states with appropriate messages.

- [ ] **Step 7: Test all auth flows**

- Login with email → verify redirect to feed
- Signup → verify profile creation → pending screen
- Google OAuth → verify redirect handling
- Forgot password → verify form submission
- Visit `/feed` without auth → verify redirect to `/login`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: auth pages — login, signup, forgot-password, pending"
```

---

### Task 6: Feed Page

**Files:**
- Create: `src/app/(main)/feed/page.tsx`
- Create: `src/hooks/use-infinite-scroll.ts`
- Create: `src/hooks/use-realtime.ts`

**Interfaces:**
- Consumes: `<PostCard>`, `<ComposeBox>`, `<CommentsSheet>`, `api`, `useAuth()`, `supabase`
- Produces:
  - Feed page with compose, infinite scroll, vote/comment/bookmark/delete/report/edit
  - `useInfiniteScroll(fetchFn)` — hook replacing manual IntersectionObserver
  - `useRealtime(channel, table, filter, onInsert)` — hook for Supabase postgres_changes

- [ ] **Step 1: Create `useInfiniteScroll` hook**

Generic infinite scroll hook. Takes a `fetchFn(cursor)` that returns `{ items, nextCursor, hasMore }`. Uses IntersectionObserver on a sentinel div. Returns `{ items, isLoading, hasMore, sentinelRef }`.

- [ ] **Step 2: Create `useRealtime` hook**

Generic Supabase Realtime hook. Takes channel name, table, filter, event type, callback. Handles subscribe/unsubscribe on mount/unmount. Handles visibility change teardown/restore (port from `realtime.js` lines 42-48).

- [ ] **Step 3: Create Feed page**

Port `public-legacy/js/pages/feed.js` (806 lines). Structure:
- Feed header (app bar with search icon)
- `<ComposeBox variant="feed">`
- Post list using `useInfiniteScroll` with `api.get('/feed?cursor=...')`
- Map posts to `<PostCard variant="feed">` components
- Handle vote (`POST /api/feed/{id}/vote`), bookmark (`POST /api/feed/{id}/bookmark`), comment, delete, report, edit
- Realtime subscription for new posts via `useRealtime`
- Skeleton loading states

- [ ] **Step 4: Test feed functionality**

- Compose a post → appears in feed
- Vote → count updates optimistically
- Comment → opens sheet, can add comment
- Delete own post → removed from feed
- Infinite scroll → loads more posts
- Image upload → compresses and uploads

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: feed page with compose, infinite scroll, voting, comments"
```

---

### Task 7: Anonymous Feed Page

**Files:**
- Create: `src/app/(main)/anon/page.tsx`

**Interfaces:**
- Consumes: `<PostCard variant="anon">`, `<ComposeBox variant="anon">`, `useInfiniteScroll`, `useRealtime`, `api`
- Produces: Anon feed with purple-tinted UI, no author reveal

- [ ] **Step 1: Create Anon page**

Port `public-legacy/js/pages/anon.js`. Same structure as feed but:
- `<ComposeBox variant="anon">` with anon styling
- `<PostCard variant="anon">` — ghost avatar, "Anonymous" name, purple accent
- "You" tag on own posts (matched by `user_id === currentUser.id`)
- "3 posts/day" limit chip in header
- Info button with anonymous posting rules
- API: `/api/anon` (same endpoints pattern as feed)
- PostMenu: Copy Link, Report, Delete (no "Reveal Author" — was explicitly removed)

- [ ] **Step 2: Test anon feed**

- Compose anon post → appears with ghost avatar
- Own post shows "You" tag
- Delete own anon post → removed
- No author identity revealed

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: anonymous feed page"
```

---

### Task 8: DM Pages (List + Thread)

**Files:**
- Create: `src/app/(main)/dm/page.tsx` — conversation list
- Create: `src/app/(main)/dm/[conversationId]/page.tsx` — message thread
- Create: `src/components/conversation-item.tsx`
- Create: `src/components/message-bubble.tsx`

**Interfaces:**
- Consumes: `api`, `useAuth()`, `useRealtime`, `supabase`, `<UserAvatar>`, `<DepartmentBadge>`
- Produces:
  - DM list page — all conversations, search, "New" button
  - DM thread page — messages, realtime, composer
  - `<ConversationItem>` — single conversation row
  - `<MessageBubble>` — sent/received message bubble

- [ ] **Step 1: Create `<ConversationItem>`**

Port conversation row from dm.js. Avatar 48px, name (title-case), preview line (truncated), time, unread badge. Click navigates to `/dm/[conversationId]`.

- [ ] **Step 2: Create `<MessageBubble>`**

Port message rendering from dm.js. Sent = accent bg + dark text (right-aligned). Received = surface bg + text color (left-aligned). Timestamp below. Read receipt on last sent message.

- [ ] **Step 3: Create DM list page**

Port conversation list from dm.js. Header "Messages" + "New" button. Search input. Fetch conversations from `api.get('/dm')`. Render `<ConversationItem>` list. "New Conversation" dialog — search users by name/roll, select, navigate to thread.

- [ ] **Step 4: Create DM thread page**

Port thread view from dm.js. Header: back arrow + avatar + name + dept. Message list with `<MessageBubble>`. Composer at bottom (input + send button). Realtime subscription for new messages via `useRealtime`. "Load older" button at top. Day separators ("Today", "Yesterday", date). Mark messages as read. Bottom nav hidden in thread (CSS or layout conditional).

- [ ] **Step 5: Test DM functionality**

- Open conversation → messages load
- Send message → appears in real-time
- Receive message → appears in real-time
- New conversation → create and navigate
- Back button → returns to list
- Unread badge → shows count

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: DM pages — conversation list + message thread with realtime"
```

---

### Task 9: Profile Page

**Files:**
- Create: `src/app/(main)/profile/page.tsx` — own profile
- Create: `src/app/(main)/profile/[userId]/page.tsx` — other user profile
- Create: `src/components/stats-grid.tsx`
- Create: `src/components/edit-profile-dialog.tsx`
- Create: `src/components/change-password-dialog.tsx`

**Interfaces:**
- Consumes: `api`, `useAuth()`, `<UserAvatar>`, `<DepartmentBadge>`, `<PostCard>`, `useInfiniteScroll`, `uploadToStorage`, `compressImage`
- Produces: Profile page with cover, avatar, stats, bio, post history, edit profile, change password

- [ ] **Step 1: Create `<StatsGrid>`**

3-column grid: Karma (bolt icon), Posts (pen icon), Notes (book icon). Number in mono font, label below. Dividers between columns.

- [ ] **Step 2: Create `<EditProfileDialog>`**

shadcn Dialog: avatar upload (click avatar → file picker → compress → upload to `avatars` bucket), bio textarea (200 chars), phone input. Save via `api.patch('/profile', data)`.

- [ ] **Step 3: Create `<ChangePasswordDialog>`**

shadcn Dialog: new password + confirm. Validation. Submit to `api.post('/auth/change-password', { new_password })`. Show/hide toggle.

- [ ] **Step 4: Create own profile page (`/profile`)**

Port `public-legacy/js/pages/profile.js`. Cover photo from `/api/config`. Avatar overlapping cover. Name, roll number (mono), department badge, "Joined" date. StatsGrid. Edit button → EditProfileDialog. Change password button → ChangePasswordDialog. Post history with infinite scroll using PostCard.

- [ ] **Step 5: Create other user profile page (`/profile/[userId]`)**

Same layout but read-only. No edit buttons. Fetch profile from `/api/profile/{userId}`. Show "Send Message" button → navigate to DM.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: profile page — own + other user, edit, change password"
```

---

### Task 10: Settings Page

**Files:**
- Create: `src/app/(main)/settings/page.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `useTheme()`, `api`
- Produces: Settings page with all sections from current settings.js

- [ ] **Step 1: Create Settings page**

Port `public-legacy/js/pages/settings.js`. Sections:
- **Account**: Profile (→ /profile), Change Password dialog
- **Preferences**: Theme toggle (dark/light), Notifications (placeholder)
- **Community**: Contribution Wall (→ /wall)
- **Legal & Info**: About Unigram (→ /about), Privacy Policy (→ /privacy), Terms (→ /terms), Community Guidelines (→ /guidelines), Grievance (→ /contact)
- **Danger Zone**: Sign Out button

Each section as a card with rows. Rows have icon, label, subtitle, chevron.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: settings page"
```

---

### Task 11: Secondary Pages (PYQ, Notices, Timetable, Lost & Found, Notes, Bookmarks)

**Files:**
- Create: `src/app/(main)/pyq/page.tsx`
- Create: `src/app/(main)/notices/page.tsx`
- Create: `src/app/(main)/timetable/page.tsx`
- Create: `src/app/(main)/lost-found/page.tsx`
- Create: `src/app/(main)/notes/page.tsx`
- Create: `src/app/(main)/bookmarks/page.tsx`

**Interfaces:**
- Consumes: `api`, `useAuth()`, `useInfiniteScroll`, `uploadToStorage`, `<PostCard>`, shadcn components
- Produces: All 6 secondary feature pages

- [ ] **Step 1: Create PYQ page**

Port `public-legacy/js/pages/pyq.js`. Filter bar (department, year, subject). PYQ card list. Upload PYQ dialog. Download links. Department defaults to `'General'` if null (bug fix already applied).

- [ ] **Step 2: Create Notices page**

Port `public-legacy/js/pages/notices.js`. Notice cards with title, content, date, department badge.

- [ ] **Step 3: Create Timetable page**

Port `public-legacy/js/pages/timetable.js`. Department selector. Weekly grid view. Editable slots.

- [ ] **Step 4: Create Lost & Found page**

Port `public-legacy/js/pages/lostfound.js`. "Lost" / "Found" tabs. Post card with image. Compose dialog. Contact button.

- [ ] **Step 5: Create Notes page**

Port `public-legacy/js/pages/notes.js`. Filter by department/subject. Note card with title, file size, download. Upload dialog.

- [ ] **Step 6: Create Bookmarks page**

Port `public-legacy/js/pages/bookmarks.js`. Fetch bookmarked posts from `/api/bookmarks`. Render with `<PostCard>`. Remove bookmark action.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: secondary pages — PYQ, notices, timetable, lost&found, notes, bookmarks"
```

---

### Task 12: Static Pages + PWA + Final Polish

**Files:**
- Create: `src/app/(main)/about/page.tsx`
- Create: `src/app/(main)/wall/page.tsx`
- Create: `src/app/(main)/notifications/page.tsx`
- Create: `src/app/privacy/page.tsx`
- Create: `src/app/terms/page.tsx`
- Create: `src/app/contact/page.tsx`
- Create: `src/app/guidelines/page.tsx`
- Modify: `public/manifest.json`
- Create: `src/app/not-found.tsx`

**Interfaces:**
- Consumes: `api`, `useAuth()`, `<UserAvatar>`
- Produces: All remaining pages, PWA config, 404 page

- [ ] **Step 1: Create About page**

Port `public-legacy/js/pages/about.js`. App info: logo, name, tagline, story, features grid, tech stack, version footer.

- [ ] **Step 2: Create Contribution Wall page**

Port `public-legacy/js/pages/wall.js`. Fetch contributors from `/api/contributors`. Contributor cards with avatar initials, name, role, detail.

- [ ] **Step 3: Create Notifications page**

Port `public-legacy/js/pages/notifications.js`. Notification list from `/api/notifications`. Types: dm, mention, vote, etc. Mark as read.

- [ ] **Step 4: Create legal pages (static)**

Port privacy.html, terms.html, contact.html, guidelines.html as simple React pages. These can be Server Components (no auth needed). Consistent styling with back button.

- [ ] **Step 5: Update `manifest.json`**

Update `start_url` to `/feed`, `scope` to `/`. Verify icons paths still work.

- [ ] **Step 6: Create 404 page**

`src/app/not-found.tsx` — Unigram-branded 404 with link to feed.

- [ ] **Step 7: Verify PWA installability**

Chrome DevTools → Application → Manifest. Check all icons load. Check service worker registers.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: static pages, PWA, notifications, 404"
```

---

### Task 13: Realtime Keepalive + Final Integration

**Files:**
- Modify: `src/app/(main)/layout.tsx` — add keepalive + realtime init
- Create: `src/hooks/use-keepalive.ts`

**Interfaces:**
- Consumes: `supabase`, `useAuth()`, `useRealtime`
- Produces: Global realtime subscriptions (DM notifications), keepalive ping, badge updates

- [ ] **Step 1: Create `useKeepalive` hook**

Port keepalive from index.html lines 429-446. Ping `/api/health` every 4 minutes when tab is visible. Skip when hidden.

- [ ] **Step 2: Wire up global realtime in `(main)/layout.tsx`**

Port realtime init from index.html lines 407-419. Subscribe to notifications channel. On DM notification → show toast + update badge count. Visibility change handling.

- [ ] **Step 3: Full integration test**

- Start dev server
- Login → feed loads
- Compose post → appears
- Navigate to DM → conversations load
- Send message → realtime delivery
- Navigate to anon → anon feed loads
- Navigate to profile → profile loads with stats
- Toggle theme → dark/light switch works
- Visit `/admin.html` → admin panel renders correctly
- Visit `/api/health` → Express responds with `{ status: 'ok' }`
- Check console → no errors

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: realtime, keepalive, final integration"
```

---

### Task 14: Cleanup + Deploy

**Files:**
- Modify: `vercel.json` — final config
- Create/Update: `README.md`
- Remove: `public/auth.html` (if still there as fallback)

- [ ] **Step 1: Build check**

```bash
npm run build
```

Fix any TypeScript or build errors.

- [ ] **Step 2: Remove legacy fallback files**

Remove `public/auth.html` (replaced by `/login`). Keep `public/admin.html`, `public/css/` (needed by admin).

- [ ] **Step 3: Update README**

Update README.md with new dev instructions (`npm run dev` instead of direct HTML serving).

- [ ] **Step 4: Final build + push**

```bash
npm run build
git add -A
git commit -m "chore: cleanup, build verify, ready for deploy"
git push origin main
```

- [ ] **Step 5: Verify Vercel deployment**

- Visit production URL → app loads
- `/api/health` → Express responds
- `/admin.html` → admin panel works
- Login → full flow works
- All pages render correctly

