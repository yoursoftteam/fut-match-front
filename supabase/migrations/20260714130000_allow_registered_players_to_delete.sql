-- Allow any registered player in the match to delete any registration in that match.
-- This replaces the previous policy that only allowed the registration owner to delete.
--
-- Reasoning: in group-registration flows (one person registers multiple players),
-- all registrations share the same user_id. Any registered player should be able
-- to manage the match roster.

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
