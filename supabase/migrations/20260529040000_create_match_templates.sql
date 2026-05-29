-- Partidos Frecuentes - Match Templates
-- Date: 2026-05-29
-- Description: Creates match_templates and match_template_participants for saving frequent match configurations

BEGIN;

-- =============================================================================
-- MATCH TEMPLATES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.match_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'Por definir',
  time TEXT NOT NULL DEFAULT '20:00',
  players_per_team INT NOT NULL DEFAULT 7,
  has_rented_goalkeepers BOOLEAN NOT NULL DEFAULT false,
  rented_goalkeepers_count INT NOT NULL DEFAULT 0,
  field_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  rental_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  save_participants BOOLEAN NOT NULL DEFAULT false,
  usage_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  match_id UUID,
  match_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_players_per_team CHECK (players_per_team BETWEEN 6 AND 11),
  CONSTRAINT valid_rented_goalkeepers_count CHECK (rented_goalkeepers_count BETWEEN 0 AND 2),
  CONSTRAINT valid_field_cost CHECK (field_cost >= 0),
  CONSTRAINT valid_rental_cost CHECK (rental_cost >= 0)
);

CREATE INDEX IF NOT EXISTS idx_match_templates_user ON public.match_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_match_templates_match ON public.match_templates(match_id);
CREATE INDEX IF NOT EXISTS idx_match_templates_updated ON public.match_templates(updated_at DESC);

-- =============================================================================
-- MATCH TEMPLATE PARTICIPANTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.match_template_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.match_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_goalkeeper BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_name_length CHECK (char_length(btrim(name)) >= 2)
);

CREATE INDEX IF NOT EXISTS idx_match_template_participants_template ON public.match_template_participants(template_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE public.match_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_template_participants ENABLE ROW LEVEL SECURITY;

-- Templates are scoped to the owning user
CREATE POLICY "Users can view their own templates"
  ON public.match_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
  ON public.match_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.match_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.match_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Template participants follow the same scope via template ownership
CREATE POLICY "Users can view participants of their templates"
  ON public.match_template_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.match_templates
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage participants of their templates"
  ON public.match_template_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.match_templates
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update participants of their templates"
  ON public.match_template_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.match_templates
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete participants of their templates"
  ON public.match_template_participants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.match_templates
      WHERE id = template_id AND user_id = auth.uid()
    )
  );

COMMIT;
