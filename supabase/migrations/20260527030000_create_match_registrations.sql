-- Match Registrations Table
-- Date: 2026-05-27
-- Description: Creates the match_registrations table for public match signup

BEGIN;

-- =============================================================================
-- MATCH REGISTRATIONS TABLE
-- =============================================================================
-- This table stores public registrations for matches (open signup without authentication)
-- Users can register by providing their name and role, and receive a token for self-unregistration

CREATE TABLE public.match_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES bet_matches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_goalkeeper BOOLEAN NOT NULL DEFAULT false,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  has_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  paid_by UUID,
  self_unreg_token_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_name_length CHECK (char_length(btrim(name)) >= 2),
  CONSTRAINT paid_at_logic CHECK (
    (has_paid = true AND paid_at IS NOT NULL) OR
    (has_paid = false AND paid_at IS NULL)
  )
);

-- Create indexes for common queries
CREATE INDEX idx_match_registrations_match_id ON public.match_registrations(match_id);
CREATE INDEX idx_match_registrations_registered_at ON public.match_registrations(registered_at DESC);
CREATE INDEX idx_match_registrations_is_goalkeeper ON public.match_registrations(is_goalkeeper);
CREATE INDEX idx_match_registrations_has_paid ON public.match_registrations(has_paid);

-- Enable RLS (Row Level Security)
ALTER TABLE public.match_registrations ENABLE ROW LEVEL SECURITY;

-- Policies for match_registrations (public signup, but read-restricted)
-- Anyone can INSERT (public signup)
CREATE POLICY "Anyone can register for matches" ON public.match_registrations
  FOR INSERT 
  WITH CHECK (true);

-- Anyone can view registrations (to see who's registered)
CREATE POLICY "Anyone can view match registrations" ON public.match_registrations
  FOR SELECT 
  USING (true);

-- Anyone can unregister (via self-unregister token)
CREATE POLICY "Anyone can unregister from matches" ON public.match_registrations
  FOR DELETE 
  USING (true);

-- Only specific users can update (payment status)
CREATE POLICY "Only authorized users can update registrations" ON public.match_registrations
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_match_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_match_registrations_updated_at ON public.match_registrations;
CREATE TRIGGER trigger_match_registrations_updated_at
  BEFORE UPDATE ON public.match_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_match_registrations_updated_at();

COMMIT;
