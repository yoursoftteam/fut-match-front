CREATE POLICY "Anyone can view telegram links" ON public.match_telegram_groups FOR SELECT USING (true);
