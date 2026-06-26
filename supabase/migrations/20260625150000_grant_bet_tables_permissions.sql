-- Grant table-level permissions on bet_* tables for PostgREST REST API access.
-- RLS policies handle row-level filtering; these grants just enable the role to reach the table.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- anon: read-only (public browsing)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;

-- authenticated: full CRUD (RLS governs what each user can do)
GRANT INSERT, SELECT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, SELECT, UPDATE, DELETE ON TABLES TO authenticated;
