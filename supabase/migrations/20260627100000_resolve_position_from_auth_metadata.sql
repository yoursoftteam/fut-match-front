CREATE OR REPLACE FUNCTION resolve_registration_positions(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, "position" text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id, raw_user_meta_data->>'position'
  FROM auth.users
  WHERE id = ANY(p_user_ids)
    AND raw_user_meta_data->>'position' IS NOT NULL
$$;
