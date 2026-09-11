import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase, supabase } from '@/lib/supabase'
import { getClientIP } from '@/lib/rate-limit'

const SETUP_ALLOWED_IPS = (process.env.SETUP_ALLOWED_IPS || '').split(',').map(s => s.trim()).filter(Boolean)
const SETUP_TOKEN = process.env.SETUP_API_TOKEN || ''

export async function GET(request: NextRequest) {
  const ip = getClientIP(request)

  if (SETUP_ALLOWED_IPS.length > 0 && !SETUP_ALLOWED_IPS.includes(ip)) {
    return NextResponse.json(
      { error: 'Access denied', message: 'Setup endpoint is restricted.' },
      { status: 403 }
    )
  }

  if (SETUP_TOKEN) {
    const provided =
      request.headers.get('x-setup-token') ||
      request.nextUrl.searchParams.get('token')
    if (provided !== SETUP_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  const results: { step: string; status: string; message?: string }[] = []

  results.push({
    step: 'Environment Check',
    status: supabase ? '✅ OK' : '❌ FAIL',
    message: 'Supabase client initialized'
  })

  try {
    const { data: sessionsCheck } = await supabase
      .from('chat_sessions')
      .select('id')
      .limit(1)

    results.push({
      step: 'chat_sessions table',
      status: '✅ Exists',
      message: sessionsCheck ? `Query returned ${sessionsCheck.length} rows` : 'Empty table'
    })
  } catch {
    results.push({
      step: 'chat_sessions table',
      status: '❌ Missing',
      message: 'Table does not exist. Running initialization...'
    })

    await initializeDatabase()

    try {
      await supabase.from('chat_sessions').select('id').limit(1)
      results.push({
        step: 'Initialization',
        status: '✅ Success',
        message: 'Tables created successfully'
      })
    } catch {
      results.push({
        step: 'Initialization',
        status: '❌ Failed',
        message: 'Could not create tables. Run supabase/migrations/001_create_chat_tables.sql manually.'
      })
    }
  }

  try {
    const { data: messagesCheck } = await supabase
      .from('chat_messages')
      .select('id')
      .limit(1)

    results.push({
      step: 'chat_messages table',
      status: '✅ Exists',
      message: messagesCheck ? `Query returned ${messagesCheck.length} rows` : 'Empty table'
    })
  } catch {
    results.push({
      step: 'chat_messages table',
      status: '❌ Missing',
      message: 'Table does not exist'
    })
  }

  if (results.some(r => r.status.includes('✅ Exists'))) {
    try {
      const testId = `test-${Date.now()}`
      await supabase.from('chat_sessions').insert({
        session_id: testId
      }).select()

      await supabase.from('chat_messages').insert({
        session_id: testId,
        role: 'user',
        content: 'Test message'
      })

      await supabase.from('chat_messages').delete().eq('session_id', testId)
      await supabase.from('chat_sessions').delete().eq('session_id', testId)

      results.push({
        step: 'Write Test',
        status: '✅ Passed',
        message: 'Successfully wrote and deleted a test message'
      })
    } catch (error: any) {
      results.push({
        step: 'Write Test',
        status: '❌ Failed',
        message: error?.message || 'Could not write test message'
      })
    }
  }

  const allOk = results.every(r => r.status.includes('✅'))

  return NextResponse.json({
    status: allOk ? '✅ All systems operational' : '⚠️ Some checks failed',
    timestamp: new Date().toISOString(),
    checks: results,
    manual_fix: !allOk ? 'Run the SQL in supabase/migrations/001_create_chat_tables.sql.' : undefined
  })
}
