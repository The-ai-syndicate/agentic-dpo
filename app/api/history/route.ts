import { NextRequest, NextResponse } from 'next/server'
import { supabase, initializeDatabase } from '@/lib/supabase'
import { getClientIP } from '@/lib/rate-limit'
import { z } from 'zod'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_HISTORY_MESSAGES = 500

const SessionIdSchema = z.string().regex(UUID_REGEX, 'Invalid session ID format')

let dbInitialized = false

async function ensureDb() {
  if (dbInitialized) return
  try {
    await supabase.from('chat_sessions').select('id').limit(1)
    dbInitialized = true
  } catch {
    console.log('⚙️ Initializing database tables...')
    await initializeDatabase()
    dbInitialized = true
  }
}

export async function GET(request: NextRequest) {
  const ip = getClientIP(request)
  try {
    const sessionIdParam = request.nextUrl.searchParams.get('sessionId')

    if (!sessionIdParam) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const parsed = SessionIdSchema.safeParse(sessionIdParam)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      )
    }
    const sessionId = parsed.data

    await ensureDb()

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(MAX_HISTORY_MESSAGES)

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      )
    }

    return NextResponse.json({ messages: data || [] })
  } catch (error) {
    console.error(`[${ip}] History API error:`, error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const ip = getClientIP(request)
  try {
    const sessionIdParam = request.nextUrl.searchParams.get('sessionId')

    if (!sessionIdParam) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const parsed = SessionIdSchema.safeParse(sessionIdParam)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      )
    }
    const sessionId = parsed.data

    await ensureDb()

    const { error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', sessionId)

    if (messagesError) {
      console.error('Supabase delete messages error:', messagesError)
      return NextResponse.json(
        { error: 'Failed to delete messages' },
        { status: 500 }
      )
    }

    const { error: sessionError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('session_id', sessionId)

    if (sessionError) {
      console.error('Supabase delete session error:', sessionError)
      return NextResponse.json(
        { error: 'Failed to delete session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Session deleted successfully' })
  } catch (error) {
    console.error(`[${ip}] Delete session error:`, error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    const schema = z.object({ sessionId: SessionIdSchema })
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid or missing session ID' },
        { status: 400 }
      )
    }
    const { sessionId } = parsed.data

    await ensureDb()

    const { data, error } = await supabase
      .from('chat_sessions')
      .upsert({
        session_id: sessionId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'session_id' })
      .select()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ session: data?.[0] })
  } catch (error) {
    console.error(`[${ip}] Session creation error:`, error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
