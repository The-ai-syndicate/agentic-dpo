'use client'

import React from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from 'recharts'

// ──────────────────────────────────────────────
// Shared chart container with title and metadata
// ──────────────────────────────────────────────

interface ChartContainerProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

export function ChartContainer({ title, subtitle, children, className = '', action }: ChartContainerProps) {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 md:p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────────

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  icon?: React.ReactNode
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  loading?: boolean
}

export function KPICard({ title, value, change, icon, subtitle, trend, loading }: KPICardProps) {
  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 md:p-6 animate-pulse">
        <div className="h-3 w-24 bg-muted rounded mb-3" />
        <div className="h-7 w-32 bg-muted rounded mb-2" />
        <div className="h-3 w-20 bg-muted rounded" />
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-6 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        {icon && <div className="text-primary/70">{icon}</div>}
      </div>
      <p className="text-2xl md:text-3xl font-bold text-foreground mt-2">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {change !== undefined && (
          <span className={`text-xs font-medium ${
            trend === 'up' ? 'text-green-500' :
            trend === 'down' ? 'text-red-500' :
            'text-muted-foreground'
          }`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Line Chart
// ──────────────────────────────────────────────

interface LineChartWidgetProps {
  data: { date: string; value: number; [key: string]: any }[]
  lines: { dataKey: string; color: string; name?: string }[]
  height?: number
  showGrid?: boolean
  showTooltip?: boolean
  xAxisDataKey?: string
}

export function LineChartWidget({
  data,
  lines,
  height = 250,
  showGrid = true,
  showTooltip = true,
  xAxisDataKey = 'date',
}: LineChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />}
        <XAxis
          dataKey={xAxisDataKey}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
        />
        {showTooltip && (
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
          />
        )}
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            name={line.name || line.dataKey}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

// ──────────────────────────────────────────────
// Area Chart
// ──────────────────────────────────────────────

interface AreaChartWidgetProps {
  data: { date: string; value: number; [key: string]: any }[]
  areas: { dataKey: string; color: string; name?: string }[]
  height?: number
}

export function AreaChartWidget({ data, areas, height = 250 }: AreaChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <defs>
          {areas.map((area) => (
            <linearGradient key={area.dataKey} id={`gradient-${area.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={area.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={area.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        {areas.map((area) => (
          <Area
            key={area.dataKey}
            type="monotone"
            dataKey={area.dataKey}
            stroke={area.color}
            strokeWidth={2}
            fill={`url(#gradient-${area.dataKey})`}
            name={area.name || area.dataKey}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ──────────────────────────────────────────────
// Bar Chart
// ──────────────────────────────────────────────

interface BarChartWidgetProps {
  data: { name: string; value: number; color?: string }[]
  height?: number
  horizontal?: boolean
  showValues?: boolean
}

const DEFAULT_COLORS = [
  'hsl(var(--primary))',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
]

export function BarChartWidget({ data, height = 250, horizontal = false, showValues = false }: BarChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={120} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
          ))}
        </Bar>
        {showValues && (
          <text>Values</text>
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ──────────────────────────────────────────────
// Pie Chart
// ──────────────────────────────────────────────

interface PieChartWidgetProps {
  data: { name: string; value: number; color?: string }[]
  height?: number
  innerRadius?: number
  outerRadius?: number
  showLegend?: boolean
}

export function PieChartWidget({
  data,
  height = 280,
  innerRadius = 60,
  outerRadius = 90,
  showLegend = false,
}: PieChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={true}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
          ))}
        </Pie>
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => <span style={{ color: 'hsl(var(--foreground))', fontSize: '12px' }}>{value}</span>}
          />
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ──────────────────────────────────────────────
// Severity Badge
// ──────────────────────────────────────────────

interface SeverityBadgeProps {
  severity: 'low' | 'medium' | 'high' | 'critical' | 'info' | 'warning'
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const colors = {
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    info: 'bg-primary/10 text-primary border-primary/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[severity]}`}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  )
}

// ──────────────────────────────────────────────
// Stat Card (smaller variant)
// ──────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  change?: number
  icon?: React.ReactNode
}

export function StatCard({ label, value, change, icon }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
      {icon && <div className="text-primary/60">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </div>
      {change !== undefined && (
        <span className={`text-xs font-medium ${
          change >= 0 ? 'text-green-500' : 'text-red-500'
        }`}>
          {change >= 0 ? '+' : ''}{change}%
        </span>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Trend Indicator
// ──────────────────────────────────────────────

interface TrendIndicatorProps {
  value: number
  label?: string
}

export function TrendIndicator({ value, label }: TrendIndicatorProps) {
  const isUp = value > 0
  const isDown = value < 0
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
      isUp ? 'text-green-500' : isDown ? 'text-red-500' : 'text-muted-foreground'
    }`}>
      {isUp ? '↑' : isDown ? '↓' : '→'}
      {Math.abs(value).toFixed(1)}%
      {label && <span className="text-muted-foreground ml-1">{label}</span>}
    </span>
  )
}

// ──────────────────────────────────────────────
// Loading Skeleton for Charts
// ──────────────────────────────────────────────

export function ChartSkeleton({ height = 250 }: { height?: number }) {
  return (
    <div className="animate-pulse bg-card border border-border rounded-xl p-4 md:p-6">
      <div className="h-3 w-32 bg-muted rounded mb-4" />
      <div className="h-3 w-24 bg-muted rounded mb-6" />
      <div style={{ height }} className="bg-muted/50 rounded-lg" />
    </div>
  )
}
