-- Reset bet_scores_aggregate: elimina todos los cálculos de puntos
-- para recalcular desde cero ejecutando las funciones de scoring.
-- Ejecutar en Supabase SQL Editor.

TRUNCATE TABLE bet_scores_aggregate;

-- Verificación
SELECT COUNT(*) AS remaining_rows FROM bet_scores_aggregate;
