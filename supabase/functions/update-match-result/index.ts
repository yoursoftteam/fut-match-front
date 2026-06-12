import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, x-api-key, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método no permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    )

    const apiKey = req.headers.get("x-api-key") ?? req.headers.get("apikey")
    const apiKeySecret = Deno.env.get("API_KEY")

    if (apiKey && apiKeySecret && apiKey === apiKeySecret) {
      // API key match — skip JWT validation
    } else {
      const authHeader = req.headers.get("Authorization")
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "No autorizado" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }

      const token = authHeader.slice(7)
      const adminSecret = Deno.env.get("ADMIN_SECRET")

      if (token === adminSecret) {
        // Admin secret match — skip JWT validation
      } else {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
          return new Response(
            JSON.stringify({ error: "Token inválido o expirado" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          )
        }

        const adminUserId = Deno.env.get("ADMIN_USER_ID")
        if (user.id !== adminUserId) {
          return new Response(
            JSON.stringify({ error: "Solo el administrador puede actualizar marcadores" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          )
        }
      }
    }

    const body = await req.json()
    const { match_id, home_score, away_score } = body

    if (!match_id || home_score === undefined || away_score === undefined) {
      return new Response(
        JSON.stringify({ error: "Faltan campos requeridos: match_id, home_score, away_score" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    if (
      !Number.isInteger(home_score) || home_score < 0 || home_score > 20 ||
      !Number.isInteger(away_score) || away_score < 0 || away_score > 20
    ) {
      return new Response(
        JSON.stringify({ error: "Los marcadores deben ser enteros entre 0 y 20" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const { data, error } = await supabase.rpc("fn_update_match_result", {
      p_match_id: match_id,
      p_home_score: home_score,
      p_away_score: away_score,
    })

    if (error) {
      return new Response(
        JSON.stringify({ error: `Error al actualizar marcador: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }
})
