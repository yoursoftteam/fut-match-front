import { NextRequest, NextResponse } from 'next/server'
import { getAnonClient } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = getAnonClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MISSING_ENV', message: 'Server configuration error' } },
        { status: 500 }
      )
    }
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'MISSING_PARAMETER',
            message: 'slug is required',
          },
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('bet_tournaments')
      .select('id, name, slug, status, kickoff_inaugural_at, created_at, updated_at')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch tournament',
          },
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'NOT_FOUND',
            message: 'Tournament not found',
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data,
        error: null,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Unexpected error in GET /api/v1/bet/tournaments:', error)
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}