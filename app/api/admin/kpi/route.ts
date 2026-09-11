import { NextResponse } from 'next/server'
import { getKPI } from '@/lib/admin/analytics-service'

export async function GET() {
  try {
    const data = await getKPI()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Admin KPI API error:', error)
    return NextResponse.json({ error: 'Failed to fetch KPIs' }, { status: 500 })
  }
}
