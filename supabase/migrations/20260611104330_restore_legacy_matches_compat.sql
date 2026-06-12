BEGIN;

CREATE TABLE IF NOT EXISTS public.matches (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	title TEXT NOT NULL,
	location TEXT NOT NULL,
	date TIMESTAMP WITH TIME ZONE NOT NULL,
	max_players INTEGER NOT NULL,
	created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	field_cost NUMERIC NOT NULL DEFAULT 0,
	rental_cost NUMERIC NOT NULL DEFAULT 0,
	has_rented_goalkeepers BOOLEAN NOT NULL DEFAULT FALSE,
	rented_goalkeepers_count INTEGER NOT NULL DEFAULT 0,
	players_per_team INTEGER NOT NULL DEFAULT 5,
	source_template_id UUID
);

ALTER TABLE public.matches
	ADD COLUMN IF NOT EXISTS title TEXT,
	ADD COLUMN IF NOT EXISTS location TEXT,
	ADD COLUMN IF NOT EXISTS date TIMESTAMP WITH TIME ZONE,
	ADD COLUMN IF NOT EXISTS max_players INTEGER,
	ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
	ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
	ADD COLUMN IF NOT EXISTS field_cost NUMERIC NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS rental_cost NUMERIC NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS has_rented_goalkeepers BOOLEAN NOT NULL DEFAULT FALSE,
	ADD COLUMN IF NOT EXISTS rented_goalkeepers_count INTEGER NOT NULL DEFAULT 0,
	ADD COLUMN IF NOT EXISTS players_per_team INTEGER NOT NULL DEFAULT 5,
	ADD COLUMN IF NOT EXISTS source_template_id UUID;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public'
			AND c.relname = 'match_templates'
			AND c.relkind = 'r'
	) THEN
		ALTER TABLE public.matches
			DROP CONSTRAINT IF EXISTS matches_source_template_id_fkey;

		ALTER TABLE public.matches
			ADD CONSTRAINT matches_source_template_id_fkey
			FOREIGN KEY (source_template_id)
			REFERENCES public.match_templates(id)
			ON DELETE SET NULL;
	END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matches_source_template_id
	ON public.matches (source_template_id);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own matches" ON public.matches;
DROP POLICY IF EXISTS "Authenticated users can create matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can delete their own matches" ON public.matches;

CREATE POLICY "Users can view their own matches" ON public.matches
	FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create matches" ON public.matches
	FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own matches" ON public.matches
	FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own matches" ON public.matches
	FOR DELETE USING (auth.uid() = created_by);

CREATE OR REPLACE FUNCTION public.get_public_match_by_id(p_match_id UUID)
RETURNS TABLE (
	id UUID,
	title TEXT,
	location TEXT,
	date TIMESTAMP WITH TIME ZONE,
	max_players INTEGER,
	created_by UUID,
	created_at TIMESTAMP WITH TIME ZONE,
	field_cost NUMERIC,
	rental_cost NUMERIC,
	has_rented_goalkeepers BOOLEAN,
	rented_goalkeepers_count INTEGER,
	players_per_team INTEGER,
	source_template_id UUID
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT
		m.id,
		m.title,
		m.location,
		m.date,
		m.max_players,
		m.created_by,
		m.created_at,
		m.field_cost,
		m.rental_cost,
		m.has_rented_goalkeepers,
		m.rented_goalkeepers_count,
		m.players_per_team,
		m.source_template_id
	FROM public.matches m
	WHERE m.id = p_match_id
	LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_match_by_id(UUID) TO anon, authenticated;

ALTER TABLE public.match_registrations
	DROP CONSTRAINT IF EXISTS match_registrations_match_id_fkey;

ALTER TABLE public.match_registrations
	ADD CONSTRAINT match_registrations_match_id_fkey
	FOREIGN KEY (match_id)
	REFERENCES public.matches(id)
	ON DELETE CASCADE;

COMMIT;
