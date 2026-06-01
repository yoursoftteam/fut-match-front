"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { getMatchTitleFromLocation } from "@/lib/match-title"
import { getLocalTimeInputValue } from "@/lib/date-utils"
import { useAuth } from "@/hooks/useAuth"
import { useMatches } from "@/hooks/useMatches"
import type {
  MatchTemplate,
  MatchTemplateWithParticipants,
  CreateTemplateData,
} from "@/lib/match-schema"

export function useFrecuentes() {
  const { user } = useAuth()
  const { registerRentedGoalkeepers } = useMatches()
  const [templates, setTemplates] = useState<MatchTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTemplates = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("match_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error("Error fetching templates:", error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  useEffect(() => {
    const handler = () => fetchTemplates()
    window.addEventListener("frecuentes:changed", handler)
    return () => window.removeEventListener("frecuentes:changed", handler)
  }, [fetchTemplates])

  const getTemplateById = useCallback(async (
    id: string
  ): Promise<MatchTemplateWithParticipants | null> => {
    try {
      const { data: template, error: tmplError } = await supabase
        .from("match_templates")
        .select("*")
        .eq("id", id)
        .single()

      if (tmplError) throw tmplError

      const { data: participants, error: partError } = await supabase
        .from("match_template_participants")
        .select("*")
        .eq("template_id", id)
        .order("sort_order", { ascending: true })

      if (partError) throw partError

      return {
        ...template,
        participants: participants || [],
      }
    } catch (error) {
      console.error("Error fetching template:", error)
      return null
    }
  }, [])

  const getTemplateByMatchId = useCallback(async (
    matchId: string
  ): Promise<MatchTemplateWithParticipants | null> => {
    try {
      const { data: template, error: tmplError } = await supabase
        .from("match_templates")
        .select("*")
        .eq("match_id", matchId)
        .maybeSingle()

      if (tmplError) throw tmplError
      if (!template) return null

      const { data: participants, error: partError } = await supabase
        .from("match_template_participants")
        .select("*")
        .eq("template_id", template.id)
        .order("sort_order", { ascending: true })

      if (partError) throw partError

      return {
        ...template,
        participants: participants || [],
      }
    } catch (error) {
      console.error("Error fetching template by matchId:", error)
      return null
    }
  }, [])

  const deleteTemplateByMatchId = useCallback(
    async (matchId: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("match_templates")
          .delete()
          .eq("match_id", matchId)
          .eq("user_id", user?.id)

        if (error) throw error

        setTemplates((prev) => prev.filter((t) => t.match_id !== matchId))
        return true
      } catch (error) {
        console.error("Error deleting template by matchId:", error)
        return false
      }
    },
    [user]
  )

  const createTemplate = useCallback(
    async (data: CreateTemplateData): Promise<MatchTemplate | null> => {
      if (!user) return null
      try {
        const normalizedTime = /^\d{2}:\d{2}$/.test(data.time)
          ? data.time
          : data.match_date
            ? getLocalTimeInputValue(data.match_date)
            : "20:00"

        const baseTemplateData: Record<string, unknown> = {
          name: data.name,
          location: data.location,
          time: normalizedTime,
          players_per_team: data.players_per_team,
          has_rented_goalkeepers: data.has_rented_goalkeepers,
          rented_goalkeepers_count: data.rented_goalkeepers_count,
          field_cost: data.field_cost,
          rental_cost: data.rental_cost,
          save_participants: data.save_participants,
          updated_at: new Date().toISOString(),
        }
        if (data.match_id) {
          baseTemplateData.match_id = data.match_id
        }
        if (data.match_date) {
          baseTemplateData.match_date = data.match_date
        }

        let template: MatchTemplate | null = null

        if (data.match_id) {
          const { data: existingRows, error: existingError } = await supabase
            .from("match_templates")
            .select("*")
            .eq("user_id", user.id)
            .eq("match_id", data.match_id)
            .order("updated_at", { ascending: false })
            .limit(1)

          if (existingError) throw existingError

          const existing = existingRows?.[0]

          if (existing) {
            const { data: updatedTemplate, error: updateError } = await supabase
              .from("match_templates")
              .update(baseTemplateData)
              .eq("id", existing.id)
              .eq("user_id", user.id)
              .select()
              .single()

            if (updateError) throw new Error(updateError.message ?? JSON.stringify(updateError))
            template = updatedTemplate
          }
        }

        if (!template) {
          const insertData: Record<string, unknown> = {
            user_id: user.id,
            ...baseTemplateData,
          }

          const { data: createdTemplate, error: tmplError } = await supabase
            .from("match_templates")
            .insert(insertData)
            .select()
            .single()

          if (tmplError) throw new Error(tmplError.message ?? JSON.stringify(tmplError))
          template = createdTemplate
        }

        if (!template) {
          throw new Error("No se pudo persistir la plantilla")
        }

        const { error: deleteParticipantsError } = await supabase
          .from("match_template_participants")
          .delete()
          .eq("template_id", template.id)

        if (deleteParticipantsError) throw deleteParticipantsError

        if (data.save_participants && data.participants && data.participants.length > 0) {
          const participantRows = data.participants.map((p, i) => ({
            template_id: template.id,
            name: p.name,
            is_goalkeeper: p.is_goalkeeper,
            sort_order: i,
          }))

          const { error: partError } = await supabase
            .from("match_template_participants")
            .insert(participantRows)

          if (partError) throw partError
        }

        setTemplates((prev) => {
          const existingIndex = prev.findIndex((t) => t.id === template.id)

          if (existingIndex === -1) {
            return [template, ...prev]
          }

          const next = [...prev]
          next[existingIndex] = template
          return next
        })
        window.dispatchEvent(new CustomEvent("frecuentes:changed"))
        return template
      } catch (error) {
        const msg = error instanceof Error ? error.message : JSON.stringify(error)
        console.error("Error creating template:", msg, error)
        return null
      }
    },
    [user]
  )

  const updateTemplate = useCallback(
    async (id: string, updates: Partial<Pick<MatchTemplate, "name">>): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("match_templates")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", user?.id)

        if (error) throw error

        setTemplates((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        )
        return true
      } catch (error) {
        console.error("Error updating template:", error)
        return false
      }
    },
    [user]
  )

  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("match_templates")
          .delete()
          .eq("id", id)
          .eq("user_id", user?.id)

        if (error) throw error

        setTemplates((prev) => prev.filter((t) => t.id !== id))
        window.dispatchEvent(new CustomEvent("frecuentes:changed"))
        return true
      } catch (error) {
        console.error("Error deleting template:", error)
        return false
      }
    },
    [user]
  )

  const createMatchFromTemplate = useCallback(
    async (templateId: string, date: string, time: string, selectedParticipantIds: string[]) => {
      if (!user) return null

      try {
        const full = await getTemplateById(templateId)
        if (!full) throw new Error("Plantilla no encontrada")

        const matchData = {
          title: getMatchTitleFromLocation(full.location),
          location: full.location,
          date: `${date}T${time}:00`,
          max_players: full.players_per_team * 2,
          created_by: user.id,
          field_cost: full.field_cost,
          rental_cost: full.rental_cost,
          has_rented_goalkeepers: full.has_rented_goalkeepers,
          rented_goalkeepers_count: full.rented_goalkeepers_count,
          players_per_team: full.players_per_team,
          source_template_id: templateId,
        }

        const { data: newMatch, error: createError } = await supabase
          .from("matches")
          .insert([matchData])
          .select("id, title, location, date, max_players, created_by, created_at")
          .single()

        if (createError) throw createError

        if (full.has_rented_goalkeepers && full.rented_goalkeepers_count > 0) {
          await registerRentedGoalkeepers(newMatch.id, full.rented_goalkeepers_count)
        }

        if (selectedParticipantIds.length > 0) {
          const selected = full.participants.filter((p) =>
            selectedParticipantIds.includes(p.id)
          )

          for (const p of selected) {
            const { error: regError } = await supabase
              .from("match_registrations")
              .insert({
                match_id: newMatch.id,
                name: p.name,
                is_goalkeeper: p.is_goalkeeper,
              })

            if (regError) console.error(`Error registering ${p.name}:`, regError)
          }
        }

        await supabase
          .from("match_templates")
          .update({
            usage_count: full.usage_count + 1,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", templateId)

        setTemplates((prev) =>
          prev.map((t) =>
            t.id === templateId
              ? { ...t, usage_count: t.usage_count + 1, last_used_at: new Date().toISOString() }
              : t
          )
        )
        window.dispatchEvent(new CustomEvent("frecuentes:changed"))
        window.dispatchEvent(new CustomEvent("matches:changed"))

        return newMatch.id
      } catch (error) {
        console.error("Error creating match from template:", error)
        return null
      }
    },
    [user, getTemplateById, registerRentedGoalkeepers]
  )

  return {
    templates,
    loading,
    fetchTemplates,
    getTemplateById,
    getTemplateByMatchId,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    deleteTemplateByMatchId,
    createMatchFromTemplate,
  }
}
