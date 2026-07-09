ALTER TABLE tournament_team_players
  ADD COLUMN document_type text,
  ADD COLUMN document_number text,
  ADD COLUMN blood_type text,
  ADD COLUMN emergency_contact_name text,
  ADD COLUMN emergency_contact_phone text;
