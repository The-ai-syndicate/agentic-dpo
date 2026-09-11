import { AppMenu } from './components/app-menu'
import type React from 'react'

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="border-b border-white/5 bg-white/[0.02] backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3 md:px-6">
          <AppMenu />
          <div className="flex flex-1 items-center justify-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">Agentic DPO</span>
            <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-semibold text-white">
              pro
            </span>
          </div>
          <div className="w-9 md:w-10" />
        </div>
      </div>
      <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14">{children}</main>
    </div>
  )
}
