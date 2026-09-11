'use client'

import React, { useEffect, useState } from 'react'
import { getActivityFeed } from '@/lib/admin/analytics-service'
import type { ActivityEvent } from '@/lib/admin/types'
import { ChartContainer } from '../components/chart-container'
import { Activity, FileText, HelpCircle, BarChart3, BookOpen, Shield, RefreshCw } from 'lucide-react'

const categoryIcons: Record<string, React.ReactNode> = {
  document: <FileText className="w-4 h-4" />,
  question: <HelpCircle className="w-4 h-4" />,
  report: <BarChart3 className="w-4 h-4" />,
  training: <BookOpen className="w-4 h-4" />,
  compliance: <Shield className="w-4 h-4" />,
}

const categoryColors: Record<string, string> = {
  document: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  question: 'bg-primary/10 text-primary border-primary/20',
  report: 'bg-green-500/10 text-green-500 border-green-500/20',
  training: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  compliance: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const loadData = async () => {
    try {
      const data = await getActivityFeed(50)
      setActivities(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">📡 Live Activity Feed</h1>
          <p className="text-sm text-muted-foreground mt-1">Anonymised, aggregated events across the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              autoRefresh
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={loadData}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">🔒 Fully Anonymised</p>
            <p className="text-xs text-muted-foreground mt-1">
              This feed displays only anonymised event types. No organisation names, personal data, 
              individual identities, or conversation contents are ever displayed. All events are aggregated 
              and stripped of identifying information before presentation.
            </p>
          </div>
        </div>
      </div>

      {/* Activity Stream */}
      <div className="bg-card border border-border rounded-xl">
        {loading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="w-2 h-2 bg-muted rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-1" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activities.map((event, i) => (
              <div key={event.id} className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {categoryIcons[event.category] || <Activity className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${categoryColors[event.category] || ''}`}>
                      {event.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-1">{event.description}</p>
                </div>
                <div className="flex-shrink-0 text-[10px] text-muted-foreground">
                  {i === 0 ? 'Just now' : `${Math.floor(i * 2 + 2)}m ago`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
