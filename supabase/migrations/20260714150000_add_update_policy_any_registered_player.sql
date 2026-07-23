-- Allow any player registered in the match to update any registration's position.
-- Mirrors the existing DELETE policy (any registered player OR match creator).

CREATE POLICY "Any registered player can update registrations"
  ON public.match_registrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.match_registrations r2
      WHERE r2.match_id = match_id
        AND r2.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.match_registrations r2
      WHERE r2.match_id = match_id
        AND r2.user_id = auth.uid()
    )
  );
