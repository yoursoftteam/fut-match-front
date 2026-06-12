export const runtime = "edge";

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-admin'

interface TournamentPick {
  team_id: string
  team_name: string
  fifa_code: string
  flag_svg_url: string | null
}

interface UserTournamentPredictions {
  user_id: string
  name: string
  predictions: {
    champion: TournamentPick | null
    subchampion: TournamentPick | null
    third_place: TournamentPick | null
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MISSING_ENV', message: 'Server configuration error' } },
        { status: 500 }
      )
    }

    const { id: poolId } = await params

    const { data: predictions, error: predError } = await supabase
      .from('bet_tournament_predictions')
      .select('*, team:team_id(id, name, fifa_code, flag_svg_url)')
      .eq('pool_id', poolId)

    if (predError) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'DATABASE_ERROR', message: 'Failed to fetch tournament predictions' } },
        { status: 500 }
      )
    }

    const safePredictions = predictions ?? []
    const userIds = [...new Set(safePredictions.map((p) => p.user_id))]

    const userMetaMap = new Map<string, string>()
    await Promise.all(
      userIds.map((uid) =>
        supabase.auth.admin.getUserById(uid)
          .then(({ data: { user: u } }) => {
            if (u) {
              const meta = u.user_metadata as Record<string, unknown> | undefined
              const fullName = (typeof meta?.full_name === 'string' && meta.full_name.trim())
                ? meta.full_name.trim()
                : null
              const name = fullName ?? (u.email?.split('@')[0].replace(/[._-]/g, ' ') ?? 'Unknown')
              userMetaMap.set(u.id, name)
            }
          })
      )
    )

    const predictionsByUser = new Map<string, UserTournamentPredictions>()

    for (const pred of safePredictions) {
      if (!predictionsByUser.has(pred.user_id)) {
        predictionsByUser.set(pred.user_id, {
          user_id: pred.user_id,
          name: userMetaMap.get(pred.user_id) ?? 'Unknown',
          predictions: { champion: null, subchampion: null, third_place: null },
        })
      }

      const team = pred.team as unknown as { id: string; name: string; fifa_code: string; flag_svg_url: string | null } | null
      if (team && pred.category in ['champion', 'subchampion', 'third_place']) {
        const entry = predictionsByUser.get(pred.user_id)!
        entry.predictions[pred.category as 'champion' | 'subchampion' | 'third_place'] = {
          team_id: team.id,
          team_name: team.name,
          fifa_code: team.fifa_code,
          flag_svg_url: team.flag_svg_url ?? null,
        }
      }
    }

    const entries = Array.from(predictionsByUser.values())

    return NextResponse.json({
      success: true,
      data: { predictions: entries, total_participants: entries.length },
      error: null,
    })
  } catch (err) {
    console.error('Error in GET /api/v1/bet/pools/[id]/tournament-predictions:', err)
    return NextResponse.json(
      { success: false, data: null, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
