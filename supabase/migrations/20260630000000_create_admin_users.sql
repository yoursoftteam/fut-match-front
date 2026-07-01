CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(user_id)
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_admin_status"
  ON admin_users FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "service_role_manage_admin_users"
  ON admin_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON admin_users TO authenticated;
GRANT ALL ON admin_users TO service_role;

-- Seed the initial admin (from .env). Silently skips if the user doesn't exist yet.
INSERT INTO admin_users (user_id, created_by)
SELECT 'c12dfbb2-35d2-42b7-b168-be5a16e8b163', 'c12dfbb2-35d2-42b7-b168-be5a16e8b163'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = 'c12dfbb2-35d2-42b7-b168-be5a16e8b163');
