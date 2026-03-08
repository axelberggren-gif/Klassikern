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
│   ├── login/page.tsx      # Email + password login
│   ├── onboarding/page.tsx # New user onboarding flow
│   ├── log/page.tsx        # Log a training session
│   ├── plan/page.tsx       # Weekly training plan
│   ├── progress/page.tsx   # Personal stats & progress
│   ├── group/page.tsx      # Group leaderboard, activity feed, settings
│   └── profile/page.tsx    # Profile & settings (editable goals, sign out)
├── components/
│   ├── AppShell.tsx         # Layout wrapper (safe area + bottom nav)
│   ├── BottomNav.tsx        # 5-tab bottom navigation
│   ├── SessionReward.tsx    # Post-session EP reward animation
│   └── dashboard/           # Dashboard-specific components
│       ├── ActivityFeed.tsx
│       ├── ExpeditionProgress.tsx
│       ├── StreakBadge.tsx
│       ├── TodayCard.tsx
│       └── WeekSummary.tsx
├── lib/
│   ├── auth.ts              # useAuth() hook → { user, profile, loading, signOut }
│   ├── supabase.ts          # Browser Supabase client (createClient)
│   ├── supabase-server.ts   # Server Supabase client
│   ├── store.ts             # All async data functions (Supabase queries)
│   ├── ep-calculator.ts     # EP calculation logic
│   ├── sport-config.ts      # Sport types, icons, colors
│   ├── training-plan.ts     # Static 12-week training plan
│   └── mock-data.ts         # Legacy mock data (not used in production)
├── types/
│   └── database.ts          # All Supabase types, convenience aliases
├── middleware.ts             # Auth session refresh + route protection
supabase/
└── migrations/
    ├── 001_initial_schema.sql  # All tables, indexes, functions
    └── 002_rls_policies.sql    # Row-level security policies
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
- Protected routes: everything except `/login` and `/onboarding`
- **No self-registration** — users are created manually in Supabase dashboard: Authentication → Users → Add user
- **IMPORTANT**: The `useAuth` hook must use `getUser()` (server call) instead of `getSession()` (cookie-only) for the initial auth check. Using `getSession()` causes "stuck on loading" on Vercel preview deployments because Vercel Deployment Protection, the @serwist/next service worker, and Supabase's `navigator.locks` interfere with cookie-based session reads. This is a recurring issue — do NOT switch back to `getSession()`.

### Data Layer (src/lib/store.ts)
All data goes through async functions in `store.ts`. Never use localStorage.
- **Profile**: `updateCurrentUser(userId, updates)`
- **Group**: `getGroupMembers(userId)`, `getUserGroupId(userId)`, `getGroupDetails(groupId)`, `joinGroupByCode(userId, code)`, `leaveGroup(userId, groupId)`, `regenerateInviteCode(groupId)`, `createGroup(userId, name)`
- **Sessions**: `getUserSessions(userId)`, `logSession({...})`
- **Feed**: `getActivityFeed(groupId)`
- **Stats**: `getUserStats(userId)`, `getWeekCompletionStats(weekNumber, userId)`

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

- **Vercel preview "stuck on loading" after login**: Caused by `getSession()` (cookie-only reads) failing on preview deployments due to Vercel Deployment Protection + @serwist service worker + Supabase `navigator.locks` interference. Fix: use `getUser()` (makes a server call) in `useAuth` hook instead. If this recurs, also try: clearing the service worker in DevTools → Application → Service Workers, or testing in incognito mode.

## Important Notes

- Always run `npm run build` after changes to verify TypeScript compiles
- The `middleware.ts` file uses the deprecated convention (Next.js 16 warns about "proxy") — this is fine for now
- When adding new Supabase query functions, add them to `src/lib/store.ts`
- When adding new types, add them to `src/types/database.ts`
- The `User` type is a legacy alias for `Profile & { group_id }` — prefer using `Profile` directly
- When adding Supabase Edge Functions (Deno), add the functions directory to `tsconfig.json` `exclude` to prevent Deno imports from breaking the Next.js build
