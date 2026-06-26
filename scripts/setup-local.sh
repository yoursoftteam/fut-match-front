#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Setting up local development environment..."

# 1. Check required tools
for cmd in node npx supabase; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌ Missing required command: $cmd"
    exit 1
  fi
done

# 2. Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# 3. Start Supabase local
echo "🔧 Starting Supabase local..."
npx supabase start 2>/dev/null || npx supabase start

# 4. Wait for Supabase to be ready
echo "⏳ Waiting for Supabase to be ready..."
for i in $(seq 1 30); do
  if curl -s http://127.0.0.1:54321 > /dev/null 2>&1; then
    echo "✅ Supabase is ready!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "❌ Supabase did not start in time. Check supabase status."
    exit 1
  fi
  sleep 1
done

# 5. Apply migrations
echo "🗄️  Applying database migrations..."
npx supabase db reset

# 6. Create .env.local (won't overwrite existing)
if [ ! -f .env.local ]; then
  echo "📝 Creating .env.local..."
  cat > .env.local << 'EOF'
# Local Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
# Obtén tu UUID: SELECT id FROM auth.users LIMIT 1;
NEXT_PUBLIC_ADMIN_USER_ID=your-admin-user-id-here
EOF
  echo "✅ .env.local created"
else
  echo "⏭️  .env.local already exists, skipping"
fi

echo ""
echo "🎉 Setup complete! Run:"
echo "   npm run dev"
echo ""
echo "📧 Mailpit (email catcher): http://127.0.0.1:54324"
echo "🛢️  Supabase Studio:          http://127.0.0.1:54323"
echo ""
echo "⚠️  If migration 20260618003000 fails (pg_cron), that's expected locally."
