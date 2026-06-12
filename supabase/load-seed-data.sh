#!/bin/bash

# Parti2 Bet - Load FIFA 2026 Seed Data
# This script loads the tournament, 32 teams, and group stage matches

set -e

echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  Loading FIFA 2026 Seed Data into Supabase"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

# Check if Supabase project is linked
if [ ! -f ".env.local" ]; then
  echo "❌ Error: .env.local not found"
  echo "Please ensure your Supabase project is linked."
  echo ""
  echo "Run: supabase link --project-ref <your_project_ref>"
  exit 1
fi

echo "📦 Loading seed data..."
echo ""

# Execute the seed migration
supabase db execute --file supabase/migrations/20260527_004_seed_fifa_2026.sql

echo ""
echo "✅ Seed data loaded successfully!"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  Verification"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""

# Verify counts
supabase sql --file /dev/stdin <<EOF
SELECT 'Tournament' as entity, COUNT(*)::text as count FROM bet_tournaments WHERE slug = 'fifa-2026'
UNION ALL
SELECT 'Teams', COUNT(*)::text FROM bet_teams
UNION ALL
SELECT 'Group Stage Matches', COUNT(*)::text FROM bet_matches WHERE stage = 'group_stage'
ORDER BY entity;
EOF

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "  Next Steps"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "1. Verify data in Supabase Dashboard:"
echo "   → Database → Tables → bet_teams (should show 32 teams)"
echo "   → Database → Tables → bet_matches (should show 48 group stage matches)"
echo ""
echo "2. Test predictions with these teams:"
echo "   POST /api/v1/bet/predictions"
echo "   { \"match_id\": \"<match_uuid>\", \"home_score_predicted\": 2, \"away_score_predicted\": 1 }"
echo ""
echo "3. View all matches by group:"
echo "   SELECT * FROM bet_matches WHERE stage = 'group_stage' ORDER BY kickoff_at;"
echo ""
