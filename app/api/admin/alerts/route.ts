import { NextResponse } from 'next/server'
import { getEarlyWarnings } from '@/lib/admin/analytics-service'

export async function GET() {
  try {
    const data = await getEarlyWarnings()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Admin alerts API error:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}
