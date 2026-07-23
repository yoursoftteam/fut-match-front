-- Fix RLS policies for match_registrations to prevent unauthorized access.
--
-- CRITICAL VULNERABILITY: The old policies allowed ANY authenticated (or anon)
-- user to DELETE or UPDATE any registration. A malicious user could delete
-- registrations of other players or tamper with payment/position data.
--
-- New policies:
--   DELETE – any player registered in the match (r2.user_id = auth.uid())
--            OR the match creator can delete any registration in that match.
--   UPDATE – only the match creator can update registrations (position,
--            payment status, etc.).
--   INSERT – unchanged (any authenticated user can register, enforced by
--            the validate_match_registration trigger).

-- Drop permissive old policies
DROP POLICY IF EXISTS "Anyone can unregister from matches" ON public.match_registrations;
DROP POLICY IF EXISTS "Only authorized users can update registrations" ON public.match_registrations;
DROP POLICY IF EXISTS "Anyone can register for matches" ON public.match_registrations;

-- DELETE: any registered player in the match OR match creator
DROP POLICY IF EXISTS "Registration owner or match owner can delete" ON public.match_registrations;
DROP POLICY IF EXISTS "Any registered player or match owner can delete" ON public.match_registrations;
CREATE POLICY "Any registered player or match owner can delete"
  ON public.match_registrations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.match_registrations r2
      WHERE r2.match_id = match_id
        AND r2.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = match_id AND created_by = auth.uid()
    )
  );

-- UPDATE: only match owner (position, payment status, etc.)
DROP POLICY IF EXISTS "Only match owner can update registrations" ON public.match_registrations;
CREATE POLICY "Only match owner can update registrations"
  ON public.match_registrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = match_id AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = match_id AND created_by = auth.uid()
    )
  );

-- Re-create the INSERT policy (restricted to authenticated users via GRANT)
DROP POLICY IF EXISTS "Anyone can register for matches" ON public.match_registrations;
CREATE POLICY "Anyone can register for matches"
  ON public.match_registrations
  FOR INSERT
  WITH CHECK (true);
