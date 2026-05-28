# Parti2 Bet - API Routes (MVP Phase 1)

**Status:** ✅ 5 routes implemented and ready for testing

---

## 📂 Directory Structure

```
src/app/api/v1/bet/
├── teams/
│   └── route.ts              # GET /api/v1/bet/teams
├── matches/
│   ├── route.ts              # GET /api/v1/bet/matches
│   └── [id]/
│       └── route.ts          # GET /api/v1/bet/matches/:id
├── predictions/
│   └── route.ts              # POST /api/v1/bet/predictions
└── leaderboard/
    └── route.ts              # GET /api/v1/bet/leaderboard
```

---

## 📌 API Endpoints Overview

| Endpoint | Method | Purpose | Auth | Status |
|----------|--------|---------|------|--------|
| `/api/v1/bet/teams` | GET | List all FIFA 2026 teams | ❌ | ✅ |
| `/api/v1/bet/matches` | GET | List matches by tournament/stage/group | ❌ | ✅ |
| `/api/v1/bet/matches/:id` | GET | Get match details with teams | ❌ | ✅ |
| `/api/v1/bet/predictions` | POST | Create/update prediction for match | ✅ JWT | ✅ |
| `/api/v1/bet/leaderboard` | GET | Get global or pool leaderboard | ❌ | ✅ |

---

## 🔍 Detailed Endpoint Documentation

### 1️⃣ GET `/api/v1/bet/teams`

**Description:** Fetch all FIFA 2026 teams

**Query Parameters:**
- `tournament_id` (optional): Filter by tournament UUID

**Example Request:**
```bash
curl "http://localhost:3000/api/v1/bet/teams?tournament_id=<uuid>"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "team-uuid-1",
      "name": "Argentina",
      "fifa_code": "ARG",
      "flag_svg_url": "https://flagcdn.com/ar.svg",
      "created_at": "2026-05-27T00:00:00Z"
    },
    {
      "id": "team-uuid-2",
      "name": "Brazil",
      "fifa_code": "BRA",
      "flag_svg_url": "https://flagcdn.com/br.svg",
      "created_at": "2026-05-27T00:00:00Z"
    }
  ],
  "count": 32,
  "error": null
}
```

**Error Response (500):**
```json
{
  "success": false,
  "data": null,
  "count": 0,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to fetch teams"
  }
}
```

---

### 2️⃣ GET `/api/v1/bet/matches`

**Description:** Fetch matches for a tournament with optional filters

**Query Parameters:**
- `tournament_id` (required): Tournament UUID
- `stage` (optional): `group_stage`, `round_of_32`, `round_of_16`, `quarter_finals`, `semi_finals`, `third_place`, `final`
- `group_name` (optional): `A`, `B`, `C`, `D`, `E`, `F`, `G`, `H`
- `status` (optional): `scheduled`, `live`, `finished`

**Example Requests:**
```bash
# All matches for FIFA 2026 group stage
curl "http://localhost:3000/api/v1/bet/matches?tournament_id=<uuid>&stage=group_stage"

# Matches for Group A only
curl "http://localhost:3000/api/v1/bet/matches?tournament_id=<uuid>&group_name=A"

# Finished matches in knockout stage
curl "http://localhost:3000/api/v1/bet/matches?tournament_id=<uuid>&stage=quarter_finals&status=finished"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "match-uuid-1",
      "tournament_id": "tournament-uuid",
      "stage": "group_stage",
      "group_name": "A",
      "kickoff_at": "2026-06-15T10:00:00Z",
      "home_team_id": "team-uuid-1",
      "away_team_id": "team-uuid-2",
      "home_score_official": null,
      "away_score_official": null,
      "status": "scheduled",
      "created_at": "2026-05-27T00:00:00Z",
      "updated_at": "2026-05-27T00:00:00Z",
      "home_team": {
        "id": "team-uuid-1",
        "name": "Argentina",
        "fifa_code": "ARG",
        "flag_svg_url": "https://flagcdn.com/ar.svg"
      },
      "away_team": {
        "id": "team-uuid-2",
        "name": "Peru",
        "fifa_code": "PER",
        "flag_svg_url": "https://flagcdn.com/pe.svg"
      }
    }
  ],
  "count": 6,
  "error": null
}
```

**Error Responses:**
- 400 (Missing tournament_id)
- 500 (Database error)

---

### 3️⃣ GET `/api/v1/bet/matches/:id`

**Description:** Fetch a specific match by ID with denormalized team data

**Path Parameters:**
- `id` (required): Match UUID

**Example Request:**
```bash
curl "http://localhost:3000/api/v1/bet/matches/match-uuid-1"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "match-uuid-1",
    "tournament_id": "tournament-uuid",
    "stage": "group_stage",
    "group_name": "A",
    "kickoff_at": "2026-06-15T10:00:00Z",
    "home_team_id": "team-uuid-1",
    "away_team_id": "team-uuid-2",
    "home_score_official": null,
    "away_score_official": null,
    "status": "scheduled",
    "created_at": "2026-05-27T00:00:00Z",
    "updated_at": "2026-05-27T00:00:00Z",
    "home_team": {
      "id": "team-uuid-1",
      "name": "Argentina",
      "fifa_code": "ARG",
      "flag_svg_url": "https://flagcdn.com/ar.svg"
    },
    "away_team": {
      "id": "team-uuid-2",
      "name": "Peru",
      "fifa_code": "PER",
      "flag_svg_url": "https://flagcdn.com/pe.svg"
    }
  },
  "error": null
}
```

**Error Responses:**
- 404 (Match not found)
- 500 (Database error)

---

### 4️⃣ POST `/api/v1/bet/predictions`

**Description:** Create or update a match prediction

**Authentication:** ✅ Required (Bearer JWT token in Authorization header)

**Request Headers:**
```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "match_id": "match-uuid-1",
  "home_score_predicted": 2,
  "away_score_predicted": 1,
  "pool_id": null
}
```

**Parameters:**
- `match_id` (required): Match UUID
- `home_score_predicted` (required): Integer 0-20
- `away_score_predicted` (required): Integer 0-20
- `pool_id` (optional): Pool UUID for pool-mode predictions (if omitted = global mode)

**Example Request:**
```bash
# Create global prediction
curl -X POST "http://localhost:3000/api/v1/bet/predictions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "match_id": "match-uuid-1",
    "home_score_predicted": 2,
    "away_score_predicted": 1
  }'

# Create pool prediction
curl -X POST "http://localhost:3000/api/v1/bet/predictions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "match_id": "match-uuid-1",
    "home_score_predicted": 2,
    "away_score_predicted": 1,
    "pool_id": "pool-uuid-1"
  }'
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "prediction-uuid-1",
    "user_id": "user-uuid",
    "match_id": "match-uuid-1",
    "mode": "global",
    "pool_id": null,
    "home_score_predicted": 2,
    "away_score_predicted": 1,
    "points_earned": 0,
    "created_at": "2026-05-27T12:34:56Z",
    "updated_at": "2026-05-27T12:34:56Z"
  },
  "message": "Prediction created successfully",
  "error": null
}
```

**Success Response (200 Updated):**
```json
{
  "success": true,
  "data": {
    "id": "prediction-uuid-1",
    "user_id": "user-uuid",
    "match_id": "match-uuid-1",
    "mode": "global",
    "pool_id": null,
    "home_score_predicted": 2,
    "away_score_predicted": 0,
    "points_earned": 0,
    "created_at": "2026-05-27T12:34:56Z",
    "updated_at": "2026-05-27T12:35:20Z"
  },
  "message": "Prediction updated successfully",
  "error": null
}
```

**Error Responses:**

- 400 (Missing required fields):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required fields: match_id, home_score_predicted, away_score_predicted"
  }
}
```

- 400 (Invalid score range):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_SCORE_RANGE",
    "message": "Home score must be integer between 0 and 20"
  }
}
```

- 400 (Prediction locked):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "PREDICTION_LOCKED",
    "message": "Prediction is locked (10 minutes before kickoff)"
  }
}
```

- 401 (Unauthorized):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

- 403 (Not pool member):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED_POOL_ACCESS",
    "message": "You are not a member of this pool"
  }
}
```

- 404 (Match not found):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "MATCH_NOT_FOUND",
    "message": "Match with ID match-uuid-1 not found"
  }
}
```

---

### 5️⃣ GET `/api/v1/bet/leaderboard`

**Description:** Fetch leaderboard for global or pool predictions

**Query Parameters:**
- `mode` (optional, default=`global`): `global` or `pool`
- `pool_id` (required if mode=`pool`): Pool UUID
- `tournament_id` (optional): Filter by tournament
- `limit` (optional, default=100, max=500): Results per page
- `offset` (optional, default=0): Pagination offset

**Example Requests:**
```bash
# Global leaderboard
curl "http://localhost:3000/api/v1/bet/leaderboard?mode=global&limit=10"

# Pool leaderboard
curl "http://localhost:3000/api/v1/bet/leaderboard?mode=pool&pool_id=pool-uuid-1&limit=10"

# With tournament filter and pagination
curl "http://localhost:3000/api/v1/bet/leaderboard?mode=global&tournament_id=tournament-uuid&limit=20&offset=0"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "rank": 1,
        "user_id": "user-uuid-1",
        "user_email": "player1@example.com",
        "points_total": 125,
        "accuracy_percentage": 87.5,
        "predictions_count": 24
      },
      {
        "rank": 2,
        "user_id": "user-uuid-2",
        "user_email": "player2@example.com",
        "points_total": 110,
        "accuracy_percentage": 84.2,
        "predictions_count": 24
      }
    ],
    "total_count": 156,
    "mode": "global",
    "pool_id": null
  },
  "error": null
}
```

**Pool Leaderboard Response (200):**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "rank": 1,
        "user_id": "user-uuid-5",
        "user_email": "player5@example.com",
        "points_total": 95,
        "accuracy_percentage": 91.2,
        "predictions_count": 22
      }
    ],
    "total_count": 8,
    "mode": "pool",
    "pool_id": "pool-uuid-1"
  },
  "error": null
}
```

**Error Responses:**
- 400 (Invalid mode)
- 400 (Missing pool_id for pool mode)
- 404 (Pool not found)
- 500 (Database error)

---

## 🔐 Authentication

### How to Get a JWT Token

1. **Sign up or sign in with Supabase:**
   ```bash
   # This happens in the React app via supabase.auth.signInWithPassword()
   # The token is automatically stored in localStorage
   ```

2. **Get token from browser:**
   - Open DevTools → Application → Local Storage
   - Find `sb-<project-id>-auth-token`
   - Copy the `access_token` value

3. **Use in API requests:**
   ```bash
   curl -X POST "http://localhost:3000/api/v1/bet/predictions" \
     -H "Authorization: Bearer <access_token>" \
     -H "Content-Type: application/json" \
     -d '{...}'
   ```

### Token Validation

- All JWT tokens are validated against Supabase's public key
- Expired tokens return 401 Unauthorized
- Invalid tokens return 401 Unauthorized

---

## ✅ Testing Checklist

Before Phase 1 is complete, verify:

### GET /api/v1/bet/teams
- [ ] Returns 32 teams
- [ ] Each team has id, name, fifa_code, flag_svg_url
- [ ] Flags are valid CDN URLs (flagcdn.com)

### GET /api/v1/bet/matches
- [ ] Returns 48 group stage matches (when stage=group_stage)
- [ ] Matches are sorted by kickoff_at (ascending)
- [ ] Each match has home_team and away_team denormalized
- [ ] Filtering by group_name works (e.g., group_name=A returns 6 matches)

### GET /api/v1/bet/matches/:id
- [ ] Returns single match with full team data
- [ ] 404 when match doesn't exist
- [ ] Teams are properly denormalized

### POST /api/v1/bet/predictions
- [ ] Creates prediction with valid JWT
- [ ] Returns 400 for invalid scores (< 0 or > 20)
- [ ] Returns 400 when prediction is locked (< 10 min before kickoff)
- [ ] Updates existing prediction when called twice with same match
- [ ] Creates pool predictions when pool_id is provided
- [ ] Returns 401 without Authorization header
- [ ] Returns 403 when user is not pool member

### GET /api/v1/bet/leaderboard
- [ ] Returns global leaderboard (mode=global)
- [ ] Returns pool leaderboard (mode=pool with pool_id)
- [ ] Entries are sorted by points_total (descending)
- [ ] Pagination works (limit/offset)
- [ ] Rank numbers are correct (1, 2, 3, ...)
- [ ] 404 when pool doesn't exist

---

## 🚀 Testing with Postman/curl

### 1. Setup Environment Variables

```bash
# Save these for easy testing
TOURNAMENT_ID="<paste-from-db>"
POOL_ID="<paste-from-db>"
JWT_TOKEN="<paste-from-browser-devtools>"
```

### 2. Test Endpoints

```bash
# 1. Get teams
curl "http://localhost:3000/api/v1/bet/teams"

# 2. Get group stage matches
curl "http://localhost:3000/api/v1/bet/matches?tournament_id=$TOURNAMENT_ID&stage=group_stage"

# 3. Get specific match
curl "http://localhost:3000/api/v1/bet/matches/[MATCH_ID]"

# 4. Create prediction (requires JWT)
curl -X POST "http://localhost:3000/api/v1/bet/predictions" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "match_id": "[MATCH_ID]",
    "home_score_predicted": 2,
    "away_score_predicted": 1
  }'

# 5. Get leaderboard
curl "http://localhost:3000/api/v1/bet/leaderboard?mode=global"
```

---

## 📊 Response Format

All API responses follow this consistent format:

**Success:**
```json
{
  "success": true,
  "data": {...},
  "count": 32,
  "error": null
}
```

**Error:**
```json
{
  "success": false,
  "data": null,
  "count": 0,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

---

## 🔧 Database Dependencies

These endpoints require the following tables and migrations:
- ✅ `bet_tournaments`
- ✅ `bet_teams`
- ✅ `bet_matches`
- ✅ `bet_match_predictions`
- ✅ `bet_pools`
- ✅ `bet_pool_members`
- ✅ `bet_scores_aggregate` (for leaderboard)

All created by migrations 20260527_001-004.

---

## 📝 Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `INVALID_REQUEST` | 400 | Missing required fields |
| `MISSING_PARAMETER` | 400 | Missing query parameter |
| `INVALID_MODE` | 400 | Invalid mode value |
| `INVALID_SCORE_RANGE` | 400 | Score outside 0-20 range |
| `PREDICTION_LOCKED` | 400 | Prediction locked (< 10 min to kickoff) |
| `UNAUTHORIZED` | 401 | No valid JWT token |
| `INVALID_JSON` | 400 | Request body is not valid JSON |
| `UNAUTHORIZED_POOL_ACCESS` | 403 | User not pool member |
| `MATCH_NOT_FOUND` | 404 | Match doesn't exist |
| `POOL_NOT_FOUND` | 404 | Pool doesn't exist |
| `DATABASE_ERROR` | 500 | Query/database error |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## ⚡ Next Steps

After API testing is complete:

1. **Build React Components:**
   - MatchCard (displays home vs away with flags)
   - PredictionForm (score inputs with validation)
   - LeaderboardTable (rankings display)

2. **Create Pages:**
   - `/bet/[tournament-slug]` - Tournament overview
   - `/bet/[tournament-slug]/matches` - All matches
   - `/bet/[tournament-slug]/leaderboard` - Rankings

3. **Setup Realtime Updates:**
   - Subscribe to `bet_match_predictions` changes
   - Auto-update leaderboard when scores change
   - Broadcast match results to subscribed users

---

**Created:** 2026-05-27  
**API Version:** v1  
**Status:** ✅ Ready for testing
