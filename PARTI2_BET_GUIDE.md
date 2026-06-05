# Parti2 Bet Module - Implementation Guide

**Updated:** May 27, 2026  
**Module Status:** Specification Complete + Infrastructure Complete  
**Ready for:** Feature Development (Phase 1)

---

## Overview

The Parti2 Bet module is a **FIFA 2026 tournament betting pool system** built on Next.js 16, Supabase PostgreSQL, and Cloudflare Edge. Users can create custom scoring pools, make predictions match-by-match, and compete on global/pool leaderboards.

### Key Features Implemented (Backend)
- ✅ Complete database schema with RLS policies
- ✅ Atomic scoring engine (Postgres functions)
- ✅ Type-safe TypeScript interfaces
- ✅ Business logic utilities (scoring, standings, brackets)
- ✅ Comprehensive specification (12 sections)

### In Progress (Phase 1-2)
- 🔄 API Route Handlers (`/app/api/v1/bet/`)
- 🔄 React UI Components (pool creation, predictions)
- 🔄 Zustand store (state management)
- 🔄 Realtime leaderboard (Supabase Channels)

---

## Quick Start

### 1. Apply Database Migrations

```bash
# Ensure you're authenticated with Supabase
supabase link --project-ref your_project_id

# Apply all migrations (creates schema, functions, policies)
supabase db push

# Verify success
supabase db push --dry-run
```

**What gets created:**
- 10 tables (tournaments, matches, pools, predictions, etc.)
- 35+ indexes for performance
- 23 RLS policies for authorization
- 8 Postgres functions for scoring & maintenance

### 2. Seed Tournament Data (Optional)

```bash
# Create FIFA 2026 tournament and teams
supabase functions deploy seed_tournament
# Then call it or insert manually
```

### 3. Import Types in Your Code

```typescript
import {
  Tournament,
  Pool,
  MatchPrediction,
  LeaderboardEntry,
  PredictionMode,
  MatchStage,
  ErrorCode,
} from '@/types/bet';

import {
  calculateGlobalPoints,
  isPredictionLocked,
  calculateGroupStandings,
  generateKnockoutBracket,
  validatePredictionScores,
} from '@/lib/bet-utils';
```

---

## Database Schema Overview

### Entity Relationships

```
Tournament (1)
  ├── Matches (80-100)
  │   └── Predictions (1M+)
  ├── Teams (32)
  └── Pools (5K+) [user-created]
      ├── Pool Members (n)
      ├── Config Versions (history)
      └── Scores Aggregate (denormalized)
```

### Key Tables

#### `bet_tournaments`
```typescript
{
  id: UUID;
  name: "Copa Mundial de la FIFA 2026";
  slug: "fifa-2026";
  status: "draft" | "active" | "completed";
  kickoff_inaugural_at: "2026-06-15T14:00:00Z";
}
```

#### `bet_pools`
```typescript
{
  id: UUID;
  tournament_id: UUID;
  owner_id: UUID; // auth.users.id
  name: "Mi Polla Familiar";
  visibility: "public" | "private";
  invite_code: "ABC123XYZ0"; // 10 chars, unique
}
```

#### `bet_match_predictions`
```typescript
{
  id: UUID;
  mode: "pool" | "global"; // Which leaderboard
  user_id: UUID;
  pool_id: UUID | null; // If mode="pool", required
  match_id: UUID;
  home_score_predicted: 0-20;
  away_score_predicted: 0-20;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
}
```

#### `bet_scores_aggregate` (Denormalized)
```typescript
{
  id: UUID;
  mode: "pool" | "global";
  pool_id: UUID | null;
  user_id: UUID;
  points_total: number; // Indexed for fast leaderboard queries
  updated_at: TIMESTAMPTZ;
}
```

---

## Business Logic

### Scoring Engine

#### Global Mode (Fixed Rules)
```typescript
calculateGlobalPoints(
  homeScoreOfficial: 2,
  awayScoreOfficial: 1,
  homeScorePredicted: 2,
  awayScorePredicted: 1,
  stage: MatchStage.GROUP_STAGE
): 10; // Exact score

// Partial match (KO stage = 2x multiplier):
calculateGlobalPoints(2, 1, 2, 0, MatchStage.QUARTER_FINALS)
// 5 (winner correct) + 2 (home goals correct) = 7 * 2 = 14 points
```

#### Pool Mode (Custom Config)
```typescript
// Pool owner creates custom scoring rules:
const config: PoolConfigVersion = {
  pts_winner_selection: 4,    // Win/draw correct
  pts_exact_score: 3,         // Exact score
  pts_team_goals: 1,          // Individual team goals
  pts_goal_difference: 1,     // GD correct
  pts_qualified_round_2: 6,   // Team advances
  pts_champion: 20,           // Correct final winner
  // ... etc
};

calculatePoolPoints(2, 1, 2, 1, config): 4;
```

### Group Standings Calculation

```typescript
import { calculateGroupStandings, MatchStage } from '@/lib/bet-utils';

const groupMatches = [
  { 
    homeTeamId: "col", awayTeamId: "mex",
    homeScore: 1, awayScore: 0 
  },
  // ... more matches
];

const standings = calculateGroupStandings(groupMatches, teamsInGroup);
// Returns: teams sorted by FIFA rules (Points → GD → GF)
// standings.teams[0].points = 3 (winner)
```

### Knockout Bracket Generation

```typescript
import { generateKnockoutBracket } from '@/lib/bet-utils';

const bracketData = generateKnockoutBracket(groupStandings);
// Returns: 16 qualified teams + knockout bracket tree
// Pre-seeded per FIFA 2026 rules
```

### Prediction Lock Logic

```typescript
import { isPredictionLocked, getSecondsUntilLock } from '@/lib/bet-utils';

const kickoffAt = "2026-06-15T14:00:00Z";

isPredictionLocked(kickoffAt, 10); // true if within 10 min of kickoff

const secondsRemaining = getSecondsUntilLock(kickoffAt);
// Returns: time remaining (or 0 if already locked)
```

---

## API Routes (Next.js Implementation)

### Pool Management

#### Create Pool
```typescript
// POST /api/v1/bet/pools
const response = await fetch('/api/v1/bet/pools', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${session.access_token}` },
  body: JSON.stringify({
    tournament_id: "uuid",
    name: "Mi Polla",
    visibility: "private",
    config: {
      pts_winner_selection: 3,
      pts_exact_score: 2,
      // ... config fields
    }
  })
});

const pool = await response.json();
// Returns: { id, invite_code, owner_id, ... }
```

#### Get Pool
```typescript
// GET /api/v1/bet/pools/:id
const pool = await fetch(`/api/v1/bet/pools/${poolId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// Returns: Pool with member_count, config_active, etc.
```

### Predictions

#### Submit Prediction
```typescript
// POST /api/v1/bet/predictions
const response = await fetch('/api/v1/bet/predictions', {
  method: 'POST',
  body: JSON.stringify({
    mode: "global",
    match_id: "uuid",
    home_score_predicted: 2,
    away_score_predicted: 1
  })
});

// Response: { id, locked, time_until_lock_seconds, ... }
// Error: { code: "PREDICTION_LOCKED", status: 410 }
```

#### Get User Predictions
```typescript
// GET /api/v1/bet/predictions/user/uuid?mode=global
const predictions = await fetch(
  `/api/v1/bet/predictions/user/${userId}?mode=global`
).then(r => r.json());

// Returns: { predictions: [...], total_count: 64 }
```

### Admin: Register Result

```typescript
// POST /api/v1/bet/matches/:id/result (admin-only)
const response = await fetch(`/api/v1/bet/matches/${matchId}/result`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${adminToken}` },
  body: JSON.stringify({
    home_score_official: 2,
    away_score_official: 1,
    status: "finished"
  })
});

// Triggers fn_calculate_match_scores_v1() internally
// Response: { scores_calculated: true, total_predictions_evaluated: 342 }
```

### Leaderboards

```typescript
// GET /api/v1/bet/leaderboards/global?limit=100&offset=0
const global = await fetch('/api/v1/bet/leaderboards/global').then(r => r.json());

// Returns: [
//   { rank: 1, user_id: "uuid", points_total: 285, matches_predicted: 64 },
//   ...
// ]

// GET /api/v1/bet/pools/:id/leaderboard
const poolLeaderboard = await fetch(`/api/v1/bet/pools/${poolId}/leaderboard`)
  .then(r => r.json());
```

---

## TypeScript Types Reference

### Import All Types
```typescript
import * as Bet from '@/types/bet';

// Enums
Bet.TournamentStatus.ACTIVE;
Bet.MatchStage.GROUP_STAGE;
Bet.PredictionMode.GLOBAL;
Bet.ErrorCode.PREDICTION_LOCKED;

// Interfaces
const pool: Bet.Pool;
const pred: Bet.MatchPrediction;
const entry: Bet.LeaderboardEntry;

// Constants
Bet.DEFAULT_POOL_CONFIG;
Bet.MAX_SCORE; // 20
Bet.RATE_LIMIT_REQUESTS_PER_MINUTE; // 100
```

### Common Type Patterns
```typescript
// Request validation
import { validatePredictionScores, validatePoolConfig } from '@/lib/bet-utils';

const { valid, errors } = validatePredictionScores(home, away);
if (!valid) {
  console.error(errors); // ["Home score must be 0-20"]
}

// Error handling
const handleError = (error: Bet.ErrorResponse) => {
  switch (error.code) {
    case Bet.ErrorCode.PREDICTION_LOCKED:
      console.log("Prediction window closed");
      break;
    case Bet.ErrorCode.CONFIG_FROZEN:
      console.log("Pool rules are locked");
      break;
  }
};
```

---

## Security & RLS Policies

### Row-Level Security (Database Level)

All authorization happens at the **database layer** via RLS policies. This means:

1. ✅ **Public Pools** — Anyone can read (but must be authenticated to create pools)
2. ✅ **Private Pools** — Only owner + members can read
3. ✅ **Predictions** — RLS blocks INSERT/UPDATE after kickoff - 10 minutes
4. ✅ **Scores** — Only backend can write (users can only read)
5. ✅ **Audit Logs** — Immutable; users can only read their own

### Rate Limiting (Application Layer)

```typescript
// Implement in API route handlers:
const RATE_LIMITS = {
  predictions: { requests: 100, window: 60 }, // 100/min
  pool_creation: { requests: 5, window: 86400 }, // 5/day
};

// Use Redis or Vercel KV for state
```

### Token Security

- **PKCE flow** via `@supabase/ssr`
- **Access token:** 1 hour expiry
- **Refresh token:** 7 days
- **JWT claims:** Custom role for admin endpoints

---

## Zustand Store Pattern

```typescript
// src/store/bet.store.ts
import { create } from 'zustand';
import { FixturesSliceState, PredictionsDraftSliceState } from '@/types/bet';

// Fixtures (server data)
export const useFixtures = create<FixturesSliceState>((set) => ({
  matches: [],
  tournaments: [],
  teams: new Map(),
  loading: false,
  setMatches: (matches) => set({ matches }),
  // ...
}));

// Predictions (local draft)
export const usePredictionsDraft = create<PredictionsDraftSliceState>((set) => ({
  predictions: new Map(),
  dirty: new Set(),
  addPrediction: (pred) => set((state) => ({
    predictions: new Map(state.predictions).set(pred.match_id, pred),
  })),
  // ...
}));

// Leaderboard (realtime)
export const useLeaderboard = create<LeaderboardRealtimeSliceState>((set) => ({
  global_leaderboard: [],
  pool_leaderboards: new Map(),
  // ...
}));
```

### Usage in Components

```typescript
export function PredictionForm({ matchId }: { matchId: string }) {
  const { predictions, updatePrediction, markDirty } = usePredictionsDraft();
  const pred = predictions.get(matchId);

  const handleScoreChange = (home: number, away: number) => {
    updatePrediction(matchId, { home, away });
    markDirty(matchId); // Flag for backend sync
  };

  return (
    <div>
      <input value={pred?.home_score_predicted || ''} 
             onChange={(e) => handleScoreChange(Number(e.target.value), pred?.away_score_predicted || 0)} />
    </div>
  );
}
```

---

## Error Handling

### HTTP Status Codes
```typescript
const ErrorMap: Record<ErrorCode, number> = {
  [ErrorCode.PREDICTION_LOCKED]: 410,         // Gone
  [ErrorCode.CONFIG_FROZEN]: 403,             // Forbidden
  [ErrorCode.INVALID_SCORE_RANGE]: 400,       // Bad Request
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,       // Too Many Requests
  [ErrorCode.INTERNAL_CALCULATION_ERROR]: 500, // Internal Server Error
};
```

### Response Format
```typescript
// Error Response
{
  code: "PREDICTION_LOCKED",
  message: "This prediction cannot be edited. Match locked.",
  status: 410,
  timestamp: "2026-06-15T13:55:00Z",
  request_id: "req_123abc",
  details: { locked_at: "2026-06-15T13:50:00Z" }
}

// Success Response
{
  data: { id: "uuid", locked: true, ... },
  timestamp: "2026-06-15T13:55:00Z",
  request_id: "req_123abc"
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// tests/bet-utils.test.ts
import { calculateGlobalPoints, calculateGroupStandings } from '@/lib/bet-utils';

describe('Scoring Engine', () => {
  test('exact score returns 10 points', () => {
    expect(calculateGlobalPoints(2, 1, 2, 1, MatchStage.GROUP_STAGE)).toBe(10);
  });

  test('KO stage doubles points', () => {
    expect(calculateGlobalPoints(2, 1, 2, 0, MatchStage.QUARTER_FINALS))
      .toBe(14); // (5+2)*2
  });
});
```

### Integration Tests
```typescript
// tests/predictions.integration.test.ts
test('User can submit prediction → sees score → locked after kickoff', async () => {
  // 1. Create prediction
  const pred = await submitPrediction({...});
  expect(pred.locked).toBe(false);

  // 2. Wait for lock time (mocked)
  vi.setSystemTime(new Date(match.kickoff_at - 5 * 60 * 1000));

  // 3. Verify can still edit
  const updated = await updatePrediction(pred.id, {});
  expect(updated.locked).toBe(false);

  // 4. Pass lock time
  vi.setSystemTime(new Date(match.kickoff_at + 1 * 60 * 1000));

  // 5. Verify locked
  const response = await updatePrediction(pred.id, {});
  expect(response.status).toBe(410);
  expect(response.code).toBe('PREDICTION_LOCKED');
});
```

---

## Deployment Checklist

- [ ] Run `supabase db push` to create schema
- [ ] Verify RLS policies via Supabase dashboard
- [ ] Create `.env.local` with secrets:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
  SUPABASE_SERVICE_ROLE_KEY=xxx (keep secret!)
  RESEND_API_KEY=xxx
  ```
- [ ] Create `/app/api/v1/bet/` route handlers
- [ ] Test predictions before & after lock time
- [ ] Verify leaderboard updates realtime
- [ ] Setup Cloudflare Cron workers for notifications
- [ ] Performance test: 1000 concurrent predictions

---

## File Structure

```
fut-match-front/
├── supabase/migrations/
│   ├── 20260527_001_create_bet_tables.sql
│   ├── 20260527_002_create_rls_policies.sql
│   └── 20260527_003_create_scoring_functions.sql
│
├── src/
│   ├── types/
│   │   └── bet.ts (TypeScript interfaces)
│   ├── lib/
│   │   └── bet-utils.ts (Business logic)
│   ├── app/api/v1/bet/
│   │   ├── pools.ts (CRUD)
│   │   ├── predictions.ts
│   │   ├── leaderboards.ts
│   │   └── matches/[id]/result.ts (admin)
│   ├── store/
│   │   └── bet.store.ts (Zustand)
│   └── components/bet/
│       ├── PoolCreator.tsx
│       ├── PredictionForm.tsx
│       ├── Leaderboard.tsx
│       └── BracketViewer.tsx
│
└── specs/
    └── 001-parti2-bet/
        └── spec.md (Full specification)
```

---

## Support & Troubleshooting

### Q: How do I check if RLS is working?
A: In Supabase dashboard, SQL Editor → Run:
```sql
SELECT * FROM bet_pools WHERE visibility = 'private';
-- If authenticated: sees only your pools
-- If not authenticated: sees nothing
```

### Q: How do I test score calculation?
A: Use the utility function directly:
```typescript
import { calculateGlobalPoints } from '@/lib/bet-utils';
console.log(calculateGlobalPoints(2, 1, 2, 1, 'group_stage')); // 10
```

### Q: How do I debug predictions stuck as "locked"?
A: Check match kickoff time:
```sql
SELECT id, kickoff_at, (kickoff_at - interval '10 minutes') as lock_time, 
       now() as current_time FROM bet_matches WHERE id = '...';
```

### Q: How do notifications work?
A: Cloudflare Cron → Supabase RPC → Resend API
- Daily digest: 6 AM user timezone
- Last chance: 1 hour before match

---

## Next Steps

1. **Create API routes** in `/app/api/v1/bet/`
2. **Setup Zustand store** for state management
3. **Build React components** (pool creation, predictions, leaderboard)
4. **Implement realtime** with Supabase Channels
5. **Setup Cloudflare Cron** for notifications
6. **Write tests** for scoring engine
7. **Deploy** to staging → production

**Last Updated:** May 27, 2026  
**Status:** Infrastructure Complete → Ready for Phase 1 Development
