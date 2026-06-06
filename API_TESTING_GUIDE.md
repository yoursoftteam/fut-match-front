# API Routes Testing & Setup Guide

**Status:** ✅ 5 production-ready API endpoints created

---

## 🔧 Setup Requirements

Before testing the API routes, ensure:

1. **Environment Variables Set**
   ```bash
   # .env (already checked in with public keys)
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   
   # .env.local (create this file locally - DO NOT CHECK IN)
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```

2. **Database Migrations Applied**
   ```bash
   supabase db push
   ```

3. **Seed Data Loaded**
   ```bash
   supabase db execute --file supabase/migrations/20260527_004_seed_fifa_2026.sql
   ```

4. **Development Server Running**
   ```bash
   npm run dev
   # Server runs at http://localhost:3000
   ```

---

## 🧪 Testing the API Routes

### Quick Start: Get Tournament ID

```bash
# 1. Open Supabase Dashboard
# 2. Go to SQL Editor → New Query
# 3. Run:
SELECT id, name, slug FROM bet_tournaments LIMIT 1;

# Copy the tournament ID for testing
```

### Test 1: GET /api/v1/bet/teams

```bash
# Request
curl "http://localhost:3000/api/v1/bet/teams"

# Expected Response (200)
# Array of 32 teams with flags
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Argentina",
      "fifa_code": "ARG",
      "flag_svg_url": "https://flagcdn.com/ar.svg",
      "created_at": "..."
    },
    ...
  ],
  "count": 32,
  "error": null
}

# ✅ Verify:
# - Returns exactly 32 teams
# - All have flag_svg_url pointing to flagcdn.com
# - Status code is 200
```

### Test 2: GET /api/v1/bet/matches

```bash
# Set environment variable
TOURNAMENT_ID="<paste-tournament-id-here>"

# Request (all matches)
curl "http://localhost:3000/api/v1/bet/matches?tournament_id=$TOURNAMENT_ID"

# Request (group stage only)
curl "http://localhost:3000/api/v1/bet/matches?tournament_id=$TOURNAMENT_ID&stage=group_stage"

# Request (group A only)
curl "http://localhost:3000/api/v1/bet/matches?tournament_id=$TOURNAMENT_ID&group_name=A"

# Expected Response (200)
{
  "success": true,
  "data": [
    {
      "id": "...",
      "stage": "group_stage",
      "group_name": "A",
      "kickoff_at": "2026-06-15T10:00:00Z",
      "home_team": {
        "id": "...",
        "name": "Argentina",
        "fifa_code": "ARG",
        "flag_svg_url": "https://flagcdn.com/ar.svg"
      },
      "away_team": {
        "id": "...",
        "name": "Peru",
        "fifa_code": "PER",
        "flag_svg_url": "https://flagcdn.com/pe.svg"
      },
      "status": "scheduled",
      ...
    },
    ...
  ],
  "count": 48,
  "error": null
}

# ✅ Verify:
# - Returns 48 matches for group_stage
# - Returns 6 matches for group_name=A
# - All matches have home_team and away_team denormalized
# - Sorted by kickoff_at (ascending)
# - Status code is 200
```

### Test 3: GET /api/v1/bet/matches/:id

```bash
# Get a match ID from previous test
MATCH_ID="<paste-match-id>"

# Request
curl "http://localhost:3000/api/v1/bet/matches/$MATCH_ID"

# Expected Response (200)
{
  "success": true,
  "data": {
    "id": "$MATCH_ID",
    "tournament_id": "...",
    "stage": "group_stage",
    "group_name": "A",
    "kickoff_at": "2026-06-15T10:00:00Z",
    "home_team": {...},
    "away_team": {...},
    "status": "scheduled",
    ...
  },
  "error": null
}

# ✅ Verify:
# - Returns single match object (not array)
# - Teams are fully populated
# - Status code is 200

# Test 404 error:
curl "http://localhost:3000/api/v1/bet/matches/invalid-uuid"

# Expected: 404 error response
```

### Test 4: POST /api/v1/bet/predictions (WITH AUTHENTICATION)

**Before you test:** You need a valid JWT token from Supabase.

#### Option A: Get Token from Browser

1. Open http://localhost:3000
2. Sign in (or sign up)
3. Open DevTools → Application → Local Storage
4. Find key `sb-${PROJECT_REF}-auth-token` (looks like `sb-abcd1234-auth-token`)
5. Copy the full value (it's a JSON object)
6. Extract the `access_token` field

#### Option B: Get Token via Supabase CLI

```bash
supabase functions deploy --verify-jwt
# This shows your JWT secret for testing
```

#### Now Test the Endpoint

```bash
JWT_TOKEN="<your-access-token>"
MATCH_ID="<match-id-from-test-2>"

# Create a prediction
curl -X POST "http://localhost:3000/api/v1/bet/predictions" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "match_id": "'$MATCH_ID'",
    "home_score_predicted": 2,
    "away_score_predicted": 1
  }'

# Expected Response (201 Created)
{
  "success": true,
  "data": {
    "id": "prediction-uuid",
    "user_id": "your-user-id",
    "match_id": "$MATCH_ID",
    "mode": "global",
    "pool_id": null,
    "home_score_predicted": 2,
    "away_score_predicted": 1,
    "points_earned": 0,
    "created_at": "...",
    "updated_at": "..."
  },
  "message": "Prediction created successfully",
  "error": null
}

# ✅ Verify:
# - Status code is 201
# - Returns the created prediction
# - mode is "global" (since no pool_id)
# - User ID matches your logged-in user
```

#### Test Updating a Prediction

```bash
# Call the same endpoint with different scores
curl -X POST "http://localhost:3000/api/v1/bet/predictions" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "match_id": "'$MATCH_ID'",
    "home_score_predicted": 3,
    "away_score_predicted": 0
  }'

# Expected Response (200 OK)
{
  "success": true,
  "data": {
    "id": "same-prediction-uuid",
    "home_score_predicted": 3,
    "away_score_predicted": 0,
    "updated_at": "..." // Updated timestamp
  },
  "message": "Prediction updated successfully",
  ...
}

# ✅ Verify:
# - Status code is 200 (not 201)
# - Same prediction ID
# - Scores are updated
```

#### Test Error Cases

```bash
# Test 1: Missing Authorization header
curl -X POST "http://localhost:3000/api/v1/bet/predictions" \
  -H "Content-Type: application/json" \
  -d '{"match_id": "'$MATCH_ID'", "home_score_predicted": 2, "away_score_predicted": 1}'

# Expected: 401 Unauthorized

# Test 2: Invalid score (> 20)
curl -X POST "http://localhost:3000/api/v1/bet/predictions" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"match_id": "'$MATCH_ID'", "home_score_predicted": 25, "away_score_predicted": 1}'

# Expected: 400 Invalid Score Range

# Test 3: Invalid JSON
curl -X POST "http://localhost:3000/api/v1/bet/predictions" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{this is not json}'

# Expected: 400 Invalid JSON
```

### Test 5: GET /api/v1/bet/leaderboard

```bash
# Global leaderboard
curl "http://localhost:3000/api/v1/bet/leaderboard?mode=global&limit=10"

# Expected Response (200)
{
  "success": true,
  "data": {
    "entries": [
      {
        "rank": 1,
        "user_id": "user-uuid",
        "user_email": "player@example.com",
        "points_total": 45,
        "accuracy_percentage": 85.5,
        "predictions_count": 12
      },
      ...
    ],
    "total_count": 156,
    "mode": "global",
    "pool_id": null
  },
  "error": null
}

# ✅ Verify:
# - Entries are sorted by points_total (descending)
# - Rank starts at 1
# - All users have predictions
# - Status code is 200

# Test pagination
curl "http://localhost:3000/api/v1/bet/leaderboard?mode=global&limit=5&offset=10"

# ✅ Verify:
# - Returns 5 entries
# - Starting at rank 11 (offset=10)
```

---

## 📋 Checklist: All Tests Passing?

- [ ] GET /api/v1/bet/teams returns 32 teams
- [ ] GET /api/v1/bet/matches returns 48 group stage matches
- [ ] GET /api/v1/bet/matches/:id returns single match with teams
- [ ] POST /api/v1/bet/predictions creates prediction (201)
- [ ] POST /api/v1/bet/predictions updates prediction (200)
- [ ] POST /api/v1/bet/predictions returns 400 for invalid scores
- [ ] POST /api/v1/bet/predictions returns 401 without token
- [ ] GET /api/v1/bet/leaderboard returns global rankings
- [ ] All endpoints use consistent error response format
- [ ] All endpoints validate input properly

---

## 🚀 Using Postman for Testing

### 1. Import as cURL

```
File → Import → Raw Text → Paste the curl commands above
```

### 2. Setup Variables

In Postman, create a collection with these variables:
- `{{base_url}}` = http://localhost:3000
- `{{tournament_id}}` = (paste from DB)
- `{{match_id}}` = (from matches list)
- `{{jwt_token}}` = (paste from browser)

### 3. Create Requests

```
GET {{base_url}}/api/v1/bet/teams

GET {{base_url}}/api/v1/bet/matches?tournament_id={{tournament_id}}

GET {{base_url}}/api/v1/bet/matches/{{match_id}}

POST {{base_url}}/api/v1/bet/predictions
Headers:
  Authorization: Bearer {{jwt_token}}
Body (raw JSON):
  {
    "match_id": "{{match_id}}",
    "home_score_predicted": 2,
    "away_score_predicted": 1
  }

GET {{base_url}}/api/v1/bet/leaderboard?mode=global
```

---

## 🔍 Debugging Tips

### Enable Request Logging

Add to `next.config.js`:
```javascript
module.exports = {
  logging: {
    fetches: {
      fullUrl: true,
      unhide: true,
    },
  },
}
```

### Check Server Logs

```bash
# Terminal where `npm run dev` is running should show:
# - API requests
# - Database queries
# - Any errors
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid/expired token | Get fresh token from browser |
| 404 Match not found | Match ID doesn't exist | Verify match ID in DB |
| 400 Invalid Score | Score outside 0-20 | Use valid score range |
| 500 Database Error | Missing env vars | Set `SUPABASE_SERVICE_ROLE_KEY` |
| CORS error | Cross-origin issue | Ensure localhost:3000 is origin |

---

## ✅ Next: Phase 1 UI Components

After API testing is verified, build:

1. **MatchCard.tsx**
   - Displays home vs away team
   - Shows flags + team names
   - Displays kickoff time
   - Shows lock countdown

2. **PredictionForm.tsx**
   - Score inputs with validation
   - Submit button
   - Error messages
   - Success feedback

3. **LeaderboardTable.tsx**
   - Rankings display
   - Sort by points/accuracy
   - Pagination
   - User highlights

4. **Pages:**
   - `/bet` - Tournament selector
   - `/bet/:tournament/matches` - Match list
   - `/bet/:tournament/leaderboard` - Rankings

---

**Last Updated:** 2026-05-27  
**API Status:** ✅ Production Ready  
**Testing Status:** ⏳ Pending user verification
