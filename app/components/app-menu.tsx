'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import {
  Menu,
  Home,
  ShieldCheck,
  FileText,
  Info,
  Mail,
  Cookie,
  HelpCircle,
  Share2,
  BookOpen,
  Scale,
  Sparkles,
  X,
  Plus,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  external?: boolean
  description?: string
  action?: 'new-chat'
}

const primaryNav: NavItem[] = [
  { label: 'New chat', href: '/', icon: Plus, action: 'new-chat', description: 'Start a fresh conversation' },
  { label: 'Home', href: '/', icon: Home, description: 'Back to chat' },
  { label: 'About', href: '/about', icon: Info, description: 'About Agentic DPO' },
  { label: 'DPA Guide', href: '/guide', icon: BookOpen, description: 'Botswana DPA overview' },
]

const legalNav: NavItem[] = [
  { label: 'Privacy Policy', href: '/privacy', icon: ShieldCheck, description: 'How we handle your data' },
  { label: 'Terms of Service', href: '/terms', icon: FileText, description: 'Usage terms & conditions' },
  { label: 'Cookie Policy', href: '/cookies', icon: Cookie, description: 'Cookie usage details' },
  { label: 'Disclaimer', href: '/disclaimer', icon: Scale, description: 'Legal & AI limitations' },
]

const supportNav: NavItem[] = [
  { label: 'Help Center', href: '/help', icon: HelpCircle, description: 'FAQ & how-to guides' },
  { label: 'Contact', href: '/contact', icon: Mail, description: 'Get in touch with us' },
  {
    label: 'Share',
    href: 'https://agenticdpo.cloud',
    icon: Share2,
    external: true,
    description: 'Share Agentic DPO',
  },
]

export function AppMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname?.startsWith(href)
  }

  const renderGroup = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      <div className="px-2 pt-3 pb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
          {title}
        </span>
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon
          const active = !item.external && isActive(item.href)
          const content = (
            <>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  active
                    ? 'bg-teal-500/15 text-teal-400'
                    : 'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white/80'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span
                  className={`truncate text-sm font-medium ${
                    active ? 'text-white' : 'text-white/75 group-hover:text-white'
                  }`}
                >
                  {item.label}
                </span>
                {item.description && (
                  <span className="truncate text-[11px] text-white/35">
                    {item.description}
                  </span>
                )}
              </span>
              {item.external && (
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-white/25 group-hover:text-white/50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              )}
            </>
          )

          const baseCls =
            'group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 transition-all duration-200 hover:bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/40'

          if (item.external) {
            return (
              <li key={item.label}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={baseCls}
                  onClick={() => setOpen(false)}
                >
                  {content}
                </a>
              </li>
            )
          }

          return (
            <li key={item.label}>
              <SheetClose asChild>
                <Link
                  href={item.href}
                  className={`${baseCls} ${active ? 'bg-white/[0.04]' : ''}`}
                  onClick={() => {
                    if (item.action === 'new-chat') {
                      // Notify the chat interface to reset to a fresh conversation.
                      window.dispatchEvent(new CustomEvent('new-chat'))
                    }
                  }}
                >
                  {content}
                </Link>
              </SheetClose>
            </li>
          )
        })}
      </ul>
    </div>
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative z-40 h-9 w-9 shrink-0 rounded-xl text-white/60 transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:ring-1 focus-visible:ring-teal-500/40 md:h-10 md:w-10"
          aria-label="Open menu"
        >
          <Menu className="h-[18px] w-[18px]" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[85vw] max-w-[320px] border-0 border-r border-white/10 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-0 text-white shadow-2xl sm:max-w-sm"
      >
        <SheetTitle className="sr-only">Site navigation menu</SheetTitle>
        <div className="flex h-full flex-col">
          <div className="relative flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 shadow-lg shadow-teal-500/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[15px] font-bold tracking-tight text-white">
                  Agentic DPO
                </span>
                <span className="text-[11px] text-white/40">
                  Botswana DPA Expert
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Separator className="mx-5 h-px border-0 bg-white/10" />

          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
            {renderGroup('Main', primaryNav)}
            {renderGroup('Legal', legalNav)}
            {renderGroup('Support', supportNav)}
          </div>

          <div className="mt-auto shrink-0 border-t border-white/10 bg-white/[0.02] px-5 py-4">
            <p className="text-[11px] leading-relaxed text-white/40">
              © {new Date().getFullYear()} Agentic DPO — Built by{' '}
              <a
                href="https://obokengmakwati.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 underline decoration-white/20 underline-offset-2 transition-colors hover:text-teal-400 hover:decoration-teal-400/40"
              >
                Obokeng Makwati
              </a>
              . Botswana 🇧🇼
            </p>
            <p className="mt-1.5 text-[10px] text-white/25">
              AI-generated content. Not legal advice.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
