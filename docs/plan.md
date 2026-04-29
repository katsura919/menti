# Menti MVP — Build Plan

## Stack
- Next.js 16 (App Router)
- Supabase (Auth + Postgres + Realtime)
- Tailwind CSS + shadcn/ui
- TypeScript

## Scope
Single-tenant. No multi-org. Two question types: **poll** and **open-ended**.

---

## Database Schema

### `auth.users` (Supabase managed)
Admin accounts only. Single-tenant = 1–2 admins max.

### `presentations`
```sql
id            uuid PK default gen_random_uuid()
title         text NOT NULL
join_code     text UNIQUE NOT NULL  -- 6-char alphanumeric
is_active     boolean default false
current_slide_index  integer default 0
created_by    uuid FK → auth.users(id)
created_at    timestamptz default now()
```

### `slides`
```sql
id              uuid PK default gen_random_uuid()
presentation_id uuid FK → presentations(id) ON DELETE CASCADE
order_index     integer NOT NULL
type            text CHECK (type IN ('poll', 'open_ended'))
question        text NOT NULL
options         jsonb  -- array of strings for poll, null for open_ended
created_at      timestamptz default now()
```

### `participants`
```sql
id              uuid PK default gen_random_uuid()
presentation_id uuid FK → presentations(id) ON DELETE CASCADE
display_name    text  -- optional nickname
session_id      uuid NOT NULL  -- stored in participant's localStorage
joined_at       timestamptz default now()
```

### `responses`
```sql
id             uuid PK default gen_random_uuid()
slide_id       uuid FK → slides(id) ON DELETE CASCADE
participant_id uuid FK → participants(id) ON DELETE CASCADE
answer         text NOT NULL
created_at     timestamptz default now()
UNIQUE(slide_id, participant_id)  -- one response per slide per participant
```

---

## RLS Policies (Row Level Security)

- `presentations`: admin full CRUD, public read by join_code (for active only)
- `slides`: admin full CRUD, public read if presentation is active
- `participants`: insert by anyone (join), read by admin
- `responses`: insert by anyone, read by admin + own participant

---

## Routes

### Admin (protected, requires auth)
| Route | Purpose |
|-------|---------|
| `/` | Dashboard — list presentations |
| `/presentations/new` | Create presentation + slides |
| `/presentations/[id]/edit` | Edit slides |
| `/presentations/[id]/present` | Presenter view — controls + live results |

### Public (no auth)
| Route | Purpose |
|-------|---------|
| `/join` | Enter join code + optional nickname |
| `/join/[code]` | Audience view — current slide, submit answer |

---

## Key Features Per Phase

### Phase 1 — Foundation
- [ ] Supabase project setup (schema + RLS)
- [ ] Next.js Supabase auth (admin login/logout)
- [ ] Admin dashboard (list presentations)
- [ ] Create/edit presentation with slides

### Phase 2 — Core Session Flow
- [ ] Generate join code on presentation create
- [ ] `/join` page → participant joins, stored in DB + localStorage
- [ ] Audience view shows current slide (poll or open-ended)
- [ ] Submit response (blocked if already answered)
- [ ] Supabase Realtime: `presentations.current_slide_index` → audience slide updates

### Phase 3 — Live Results
- [ ] Presenter view shows results live via Supabase Realtime on `responses`
- [ ] Poll → bar chart (recharts)
- [ ] Open-ended → scrolling card feed
- [ ] Participant count badge (realtime on `participants`)
- [ ] Host controls: next slide, prev slide, end session

### Phase 4 — Polish
- [ ] Waiting screen for participants (before session starts)
- [ ] End screen for participants (after session ends)
- [ ] Basic mobile-responsive audience view
- [ ] Prevent re-join with same session_id

---

## Component Structure

```
app/
  (admin)/
    layout.tsx              -- auth guard
    page.tsx                -- dashboard
    presentations/
      new/page.tsx
      [id]/
        edit/page.tsx
        present/page.tsx    -- presenter view
  join/
    page.tsx                -- enter code
    [code]/
      page.tsx              -- audience view
  auth/
    login/page.tsx

components/
  slides/
    PollSlide.tsx           -- poll UI for audience
    OpenEndedSlide.tsx      -- text input for audience
    PollResults.tsx         -- bar chart for presenter
    OpenEndedResults.tsx    -- card feed for presenter
  ui/                       -- shadcn components

lib/
  supabase/
    client.ts               -- browser client
    server.ts               -- server client
    middleware.ts
  types.ts                  -- DB types
```

---

## Realtime Subscriptions

| Channel | Table | Event | Who listens |
|---------|-------|-------|-------------|
| slide-advance | presentations | UPDATE current_slide_index | Audience |
| live-responses | responses | INSERT | Presenter |
| participant-joined | participants | INSERT | Presenter |

---

## Notes
- `session_id` = uuid generated client-side, stored in localStorage key `menti_session`
- Join code = 6-char uppercase alphanumeric, generated server-side
- No participant auth — anonymous join
- Admin auth = Supabase email/password
- Recharts for poll bar chart (add to deps when needed)
