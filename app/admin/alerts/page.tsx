'use client'

import React, { useEffect, useState } from 'react'
import { getEarlyWarnings, getRecommendations } from '@/lib/admin/analytics-service'
import type { Alert } from '@/lib/admin/types'
import { ChartContainer, LineChartWidget, SeverityBadge, ChartSkeleton } from '../components/chart-container'
import { AlertTriangle, Bell, Shield, TrendingUp, Eye, EyeOff } from 'lucide-react'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [alertData, recData] = await Promise.all([
          getEarlyWarnings(),
          getRecommendations(),
        ])
        setAlerts(alertData)
        setRecommendations(recData)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const visibleAlerts = alerts.filter(a => !dismissed.includes(a.id))

  const totalCritical = alerts.filter(a => a.severity === 'critical').length
  const totalHigh = alerts.filter(a => a.severity === 'high').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">⚠️ Early Warning System</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time detection of unusual increases in privacy- and security-related topics
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Alerts</p>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{visibleAlerts.length}</p>
        </div>
        <div className="bg-card border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Critical</p>
          </div>
          <p className="text-2xl font-bold text-red-500 mt-2">{totalCritical}</p>
        </div>
        <div className="bg-card border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">High</p>
          </div>
          <p className="text-2xl font-bold text-orange-500 mt-2">{totalHigh}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Monitored Keywords</p>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">23</p>
        </div>
      </div>

      {loading ? (
        <ChartSkeleton height={400} />
      ) : (
        <>
          {/* Alerts */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Active Alerts</h2>
            {visibleAlerts.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Shield className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active alerts. All monitored topics are within normal ranges.</p>
              </div>
            ) : (
              visibleAlerts.map(alert => (
                <div key={alert.id} className={`bg-card border rounded-xl p-4 md:p-6 ${
                  alert.severity === 'critical' ? 'border-red-500/30' :
                  alert.severity === 'high' ? 'border-orange-500/30' :
                  alert.severity === 'medium' ? 'border-yellow-500/30' :
                  'border-blue-500/30'
                }`}>
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <SeverityBadge severity={alert.severity} />
                      <h3 className="text-lg font-semibold text-foreground">{alert.topic}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {alert.timePeriod}
                      </span>
                      <button
                        onClick={() => setDismissed([...dismissed, alert.id])}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
                        title="Dismiss"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Increase</p>
                      <p className="text-xl font-bold text-red-500">+{alert.increasePercentage}%</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Questions</p>
                      <p className="text-xl font-bold text-foreground">{alert.questionsCount}</p>
                      <p className="text-xs text-muted-foreground">Baseline: {alert.baselineCount}/day</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Detection Confidence</p>
                      <p className="text-xl font-bold text-foreground">{alert.confidence}%</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Recommended Action</p>
                      <p className="text-sm text-foreground">{alert.recommendedAction}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-muted-foreground mb-2">7-Day Trend</p>
                    <LineChartWidget
                      data={alert.trendData}
                      lines={[{ dataKey: 'value', color: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'high' ? '#f97316' : '#f59e0b' }]}
                      height={120}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Dismissed */}
          {dismissed.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Dismissed Alerts</h3>
              {alerts.filter(a => dismissed.includes(a.id)).map(alert => (
                <div key={alert.id} className="bg-muted/30 border border-border rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-sm text-muted-foreground line-through">{alert.topic}</span>
                  </div>
                  <button
                    onClick={() => setDismissed(dismissed.filter(id => id !== alert.id))}
                    className="text-xs text-primary hover:underline"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Privacy Notice */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Privacy Protection Active</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This early warning system operates on fully anonymised, aggregated data. 
                  No organisation names, individual identities, or conversation contents are examined.
                  All detection is based on topic pattern analysis across all users combined.
                  The purpose is trend detection for national awareness, not surveillance.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
