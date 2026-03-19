# Klassikern Webapp

A mobile-first fitness tracking webapp for "En Svensk Klassiker" — a Swedish challenge where participants complete four endurance races (cycling, swimming, running, cross-country skiing) within a year. Groups of friends train together, track progress, earn EP (effort points), and compete on leaderboards.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript, React 19
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Auth**: Email + password via `@supabase/ssr@^0.8.0` (users created manually in Supabase dashboard)
- **Icons**: lucide-react
- **Deploy**: Vercel

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Dashboard (home)
│   ├── layout.tsx          # Root layout
│   ├── login/page.tsx      # User picker + password login
│   ├── log/page.tsx        # Log a training session
│   ├── plan/page.tsx       # Weekly training plan
│   ├── progress/page.tsx   # Personal stats & progress
│   ├── group/page.tsx      # Group leaderboard, activity feed, settings
│   └── profile/page.tsx    # Profile & settings (editable goals, sign out)
├── components/
│   ├── AppShell.tsx         # Layout wrapper (safe area + bottom nav)
│   ├── BottomNav.tsx        # 5-tab bottom navigation
│   ├── SessionReward.tsx    # Post-session EP reward animation
│   ├── BadgeUnlockModal.tsx # Badge reveal animation
│   ├── StravaConnect.tsx    # Strava auth UI
│   ├── dashboard/           # Dashboard-specific components
│   │   ├── ActivityFeed.tsx
│   │   ├── ExpeditionMap.tsx
│   │   ├── ExpeditionProgress.tsx
│   │   ├── StreakBadge.tsx
│   │   ├── TodayCard.tsx
│   │   └── WeekSummary.tsx
│   └── group/               # Group page components (extracted)
│       ├── BossBattleTab.tsx
│       ├── GroupSettingsTab.tsx
│       ├── Leaderboard.tsx
│       └── NoGroupView.tsx
├── lib/
│   ├── auth.ts              # useAuth() hook → { user, profile, loading, signOut }
│   ├── supabase.ts          # Browser Supabase client (createClient)
│   ├── supabase-server.ts   # Server Supabase client
│   ├── store/               # Data layer (split by domain)
│   │   ├── index.ts         # Re-exports all store functions
│   │   ├── profiles.ts      # Profile queries
│   │   ├── groups.ts        # Group membership & invites
│   │   ├── sessions.ts      # Session logging & queries
│   │   ├── feed.ts          # Activity feed
│   │   ├── stats.ts         # User stats & week completion
│   │   ├── badges.ts        # Badge definitions & user badges
│   │   ├── boss.ts          # Boss battle system
│   │   └── strava.ts        # Strava connection
│   ├── date-utils.ts        # Centralized date/week calculations
│   ├── expedition-waypoints.ts # Waypoint data for the progress map
│   ├── ep-calculator.ts     # EP calculation logic
│   ├── boss-engine.ts       # Boss damage calculations
│   ├── badge-checker.ts     # Badge unlock logic
│   ├── sport-config.ts      # Sport types, icons, colors
│   ├── training-plan.ts     # Static 12-week training plan
│   └── mock-data.ts         # Legacy mock data (not used in production)
├── types/
│   └── database.ts          # All Supabase types, convenience aliases
├── middleware.ts             # Auth session refresh + route protection
supabase/
└── migrations/
    ├── 001_initial_schema.sql  # All tables, indexes, functions
    ├── 002_rls_policies.sql    # Row-level security policies
    ├── 003_login_redesign.sql  # User picker login, anon RLS, email backfill
    ├── 006_boss_battles.sql    # Boss battle tables + 30 boss seed data
    └── 007_boss_rls_policies.sql # RLS policies for boss tables
```

## Key Patterns

### Page Pattern
Every page follows this structure:
```tsx
'use client';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/auth';

export default function MyPage() {
  const { user, profile, loading, signOut } = useAuth();
  // Load data in useEffect with async store functions

  if (loading || !profile) return null;

  return (
    <AppShell>
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Page Title</h1>
      </div>
      {/* Content */}
      <div className="flex flex-col gap-4 px-4 py-4">
        {/* Cards with: rounded-2xl bg-white border border-gray-200 shadow-sm p-5 */}
      </div>
    </AppShell>
  );
}
```

### Auth
- `useAuth()` from `src/lib/auth.ts` provides the authenticated user and their profile
- Middleware at `src/middleware.ts` handles session refresh and redirects unauthenticated users to `/login`
- Protected routes: everything except `/login`
- **No self-registration** — users are created manually in Supabase dashboard: Authentication → Users → Add user
- **IMPORTANT**: The `useAuth` hook must use `getUser()` (server call) instead of `getSession()` (cookie-only) for the initial auth check. Using `getSession()` causes "stuck on loading" on Vercel preview deployments because Vercel Deployment Protection, the @serwist/next service worker, and Supabase's `navigator.locks` interfere with cookie-based session reads. This is a recurring issue — do NOT switch back to `getSession()`.

### Data Layer (src/lib/store/)
All data goes through async functions in `store/`. Import from `@/lib/store` (the index re-exports everything). Never use localStorage.
- **Profile** (`store/profiles.ts`): `updateCurrentUser(userId, updates)`, `getLoginProfiles()`
- **Group** (`store/groups.ts`): `getGroupMembers(userId)`, `getUserGroupId(userId)`, `getGroupDetails(groupId)`, `joinGroupByCode(userId, code)`, `leaveGroup(userId, groupId)`, `regenerateInviteCode(groupId)`, `createGroup(userId, name)`
- **Sessions** (`store/sessions.ts`): `getUserSessions(userId)`, `logSession({...})`
- **Feed** (`store/feed.ts`): `getActivityFeed(groupId)`
- **Stats** (`store/stats.ts`): `getUserStats(userId)`, `getWeekCompletionStats(weekNumber, userId)`
- **Badges** (`store/badges.ts`): `getAllBadges()`, `getUserBadges(userId)`
- **Boss** (`store/boss.ts`): `getActiveBossEncounter(groupId)`, `getBossAttacks(encounterId)`, `attackBoss({...})`, `getBossHistory(groupId)`
- **Strava** (`store/strava.ts`): `getStravaConnection(userId)`, `disconnectStrava(userId)`

### Database Types (src/types/database.ts)
- All table types follow `Database['public']['Tables'][name]['Row']` pattern
- Convenience aliases: `Profile`, `Session`, `Group`, `GroupMember`, etc.
- Important: `Relationships: []` on all table types (required for supabase-js v2.98)
- Extended types: `GroupDetails`, `GroupMemberWithProfile`, `ActivityFeedItemWithUser`

## Design System

- **Language**: Swedish (all user-facing text)
- **Theme**: Orange/amber accent (`orange-500` = #f97316)
- **Cards**: `rounded-2xl bg-white border border-gray-200 shadow-sm`
- **Gradient cards**: `bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100`
- **Icons**: lucide-react, 14-20px
- **Mobile-first**: designed for phone screens, bottom navigation

## Database Tables

11 tables defined in `supabase/migrations/001_initial_schema.sql`:
- `profiles` — user profile (display_name, goals, EP, streaks)
- `groups` — training groups (name, invite_code)
- `group_members` — membership with roles (owner/admin/member)
- `sessions` — logged training sessions
- `planned_sessions` — weekly plan template
- `activity_feed` — group activity events
- `feed_reactions` — emoji reactions on feed items
- `badges` / `user_badges` — achievement system
- `weekly_challenges` — group challenges
- `expedition_waypoints` — gamified progress map

RLS policies in `002_rls_policies.sql` — users can only access their own data and their group's data.

### RLS Gotchas

- **Anon + recursive policies = infinite recursion.** PostgreSQL evaluates ALL permissive RLS policies (OR'd together), even if one already grants access. If a policy on `profiles` joins `group_members`, and `group_members` has a self-referencing policy, anon queries will trigger infinite recursion (`"infinite recursion detected in policy for relation"`).
- **Fix:** Any RLS policy that joins other RLS-protected tables (e.g. `group_members`) must use `TO authenticated` — never `TO public` (which includes `anon`). Anon-facing policies should be simple `USING (true)` without subqueries on other protected tables.
- **After adding new columns**, run `NOTIFY pgrst, 'reload schema';` in the SQL Editor so PostgREST picks up the schema change.

## Notion Backlog

The project backlog is managed in Notion:
- **Database URL**: `https://www.notion.so/742f29cbaef049d4aa7d7a135590bd31?v=81688d014e1a4f31a1f0f99be5e89690`
- **Data source ID**: `ece4883e-00c9-4c7a-b3aa-bfd673713592`
- **Properties**: Task (title), Description, Status (Backlog/Ready/In Progress/Done/Blocked), Sprint (v1.0 MVP/v1.1/v1.2/v2.0/Backlog/Ideer), Priority (Critical/High/Medium/Low), Effort (XS/S/M/L/XL), Epic

### Workflow for executing Notion tasks
1. Fetch the backlog: `notion-fetch` on the database URL
2. Pick a task, update Status to "In Progress"
3. Implement using a Task agent with `isolation: "worktree"` for larger features
4. Run `npm run build` to verify
5. Update Notion Status to "Done"

## Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build (use to verify TypeScript)
npm run lint     # ESLint
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Known Issues

- **Vercel preview "stuck on loading" after login**: The @serwist/next service worker caches JS chunks (CacheFirst) and pages (NetworkFirst), serving stale code from previous deployments on preview URLs. This prevents React from hydrating properly — auth hooks never execute, no Supabase API calls are made after login. Fix: the SW is now disabled on preview via `VERCEL_ENV === "preview"` in `next.config.ts`. If this recurs on a user's browser, they must **unregister the service worker** (DevTools → Application → Service Workers → Unregister) and hard-refresh (Cmd+Shift+R), or use incognito mode. The `useAuth` hook also uses `getUser()` (server call) instead of `getSession()` (cookie-only) for additional resilience.

## Worktree & Branching Rules

**CRITICAL: These rules exist because a full-file rewrite in a worktree once caused 5 merge conflicts and nearly overwrote weeks of progress on main.**

### Before Starting Work
1. **Always `git fetch origin main`** and check `git log --oneline origin/main...HEAD` to understand what main has that this branch doesn't.
2. **Read files before modifying them.** Understand the current state — main may have evolved significantly since the branch was created.

### While Working
3. **NEVER use the `Write` tool to rewrite an existing file.** Use `Edit` for targeted changes. Full-file rewrites via `Write` destroy any concurrent changes from other branches/PRs that have been merged to main. This is the #1 cause of merge conflicts.
4. **If a file needs many changes**, make multiple `Edit` calls instead of one `Write`. Each edit should be a surgical change that preserves surrounding code.
5. **Before modifying any function or module**, run `/gitnexus-impact-analysis` to understand the blast radius and ensure you're not breaking callers or dependents.

### Before Committing
6. **Run `npm run build`** to verify TypeScript compiles.
7. **Run `git diff origin/main -- <file>` on heavily modified files** to verify you haven't accidentally removed code that main added.
8. **If merging main into your branch**, always use `git merge` (not rebase) to preserve both sides, and carefully resolve conflicts by keeping main's progress and layering your changes on top.

## Important Notes

- Always run `npm run build` after changes to verify TypeScript compiles
- The `middleware.ts` file uses the deprecated convention (Next.js 16 warns about "proxy") — this is fine for now
- When adding new Supabase query functions, add them to the appropriate file in `src/lib/store/` and re-export from `store/index.ts`
- When adding new types, add them to `src/types/database.ts`
- The `User` type is a legacy alias for `Profile & { group_id }` — prefer using `Profile` directly
- When adding Supabase Edge Functions (Deno), add the functions directory to `tsconfig.json` `exclude` to prevent Deno imports from breaking the Next.js build

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Klassikern webapp** (492 symbols, 1273 relationships, 38 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run `/gitnexus-impact-analysis` (the skill) before editing any symbol.** This is a BLOCKING requirement — do not skip it. Before modifying a function, class, or method, invoke the `gitnexus-impact-analysis` skill to understand the blast radius. If the skill is unavailable, manually run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/Klassikern webapp/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Klassikern webapp/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Klassikern webapp/clusters` | All functional areas |
| `gitnexus://repo/Klassikern webapp/processes` | All execution flows |
| `gitnexus://repo/Klassikern webapp/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## CLI

- Re-index: `npx gitnexus analyze`
- Check freshness: `npx gitnexus status`
- Generate docs: `npx gitnexus wiki`

<!-- gitnexus:end -->
