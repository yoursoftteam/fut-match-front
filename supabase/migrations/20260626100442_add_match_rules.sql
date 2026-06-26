-- Add rules text column to matches table
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS rules TEXT;
