-- Update get_public_match_by_id to include rules column

DROP FUNCTION IF EXISTS public.get_public_match_by_id(UUID);

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
	source_template_id UUID,
	rules TEXT
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
		m.source_template_id,
		m.rules
	FROM public.matches m
	WHERE m.id = p_match_id
	LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_match_by_id(UUID) TO anon, authenticated;
