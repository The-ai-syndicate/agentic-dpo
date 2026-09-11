import ContentLayout from '../content-layout'
import { Cookie, Cookie as CookieIcon, Cpu, Search, Eye, ToggleLeft, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'Cookie Policy | Agentic DPO',
  description:
    'Agentic DPO Cookie Policy — what cookies and local storage we use, the purposes they serve, and how to opt out or delete them.',
}

const categories = [
  {
    icon: ShieldCheck,
    name: 'Strictly necessary cookies',
    duration: 'Session / 30 days',
    alwaysOn: true,
    body: 'Required for the service to function. Examples: session IDs for chat history, CSRF tokens for form submissions, and authentication state. These cannot be disabled.',
    examples: [
      { name: 'session_id', purpose: 'Maintains continuity of your chat history.' },
      { name: 'csrf_token', purpose: 'Prevents cross-site request forgery.' },
      { name: 'rate-limit-key', purpose: 'Stops abuse of our API endpoints.' },
    ],
  },
  {
    icon: Cpu,
    name: 'Preference & functional cookies',
    duration: '12 months',
    alwaysOn: false,
    body: 'Remember your UI preferences so you don\'t have to set them every visit: colour theme, font-size, sidebar collapsed state, preferred language.',
    examples: [
      { name: 'theme', purpose: 'Stores light/dark/contrast theme choice.' },
      { name: 'sidebar-state', purpose: 'Remembers whether the sidebar is open or collapsed.' },
      { name: 'language', purpose: 'Saves your preferred interface language.' },
    ],
  },
  {
    icon: Search,
    name: 'Analytics cookies',
    duration: '14 months',
    alwaysOn: false,
    body: 'Aggregated, anonymised statistics that tell us which parts of the product are working well and where we need to improve. No personal identifiers are exported; raw data never leaves our infrastructure.',
    examples: [
      { name: '_ga', purpose: 'Google Analytics 4 — aggregated session counts (used only if you opt in).' },
      { name: 'usage-pulse', purpose: 'First-party counter for feature-usage heatmaps.' },
    ],
  },
  {
    icon: Eye,
    name: 'Third-party cookies',
    duration: 'Varies by provider',
    alwaysOn: false,
    body: 'We do not use advertising cookies, third-party trackers, or social-media remarketing pixels by default. If you enable share-to-social or embedded integrations in the future, those providers may set their own cookies subject to their policies.',
    examples: [],
  },
]

export default function CookiesPage() {
  return (
    <ContentLayout>
      <div className="space-y-12">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 shadow-lg shadow-teal-500/20">
            <Cookie className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Cookie Policy
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-white/50 md:text-base">
            Last updated: {new Date().toLocaleDateString('en-BW', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' • '}
            Transparent. No hidden trackers.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <p className="text-sm leading-relaxed text-white/70 md:text-[15px]">
            This Cookie Policy explains how Agentic DPO (&quot;we&quot;, &quot;us&quot;)
            uses cookies and similar storage technologies on{' '}
            <span className="font-mono text-teal-300">agenticdpo.cloud</span>. By using the
            Service you consent to the cookies described in this policy, in accordance
            with the Electronic Communications and Transactions Act and the Data Protection
            Act of Botswana.
          </p>
        </section>

        <div className="space-y-5">
          {categories.map((cat, i) => {
            const Icon = cat.icon
            return (
              <section
                key={i}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/20">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white md:text-xl">{cat.name}</h2>
                      <p className="mt-1 text-xs text-white/40">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 ring-1 ring-white/10">
                          <CookieIcon className="h-3 w-3" />
                          Retention: {cat.duration}
                        </span>
                        {cat.alwaysOn && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-teal-500/15 px-2 py-0.5 text-teal-300 ring-1 ring-teal-500/20">
                            <ToggleLeft className="h-3 w-3" /> Always active
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/70 md:text-[15px]">
                  {cat.body}
                </p>
                {cat.examples.length > 0 && (
                  <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-white/40">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Cookie name</th>
                          <th className="px-4 py-2.5 font-medium">Purpose</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {cat.examples.map((ex, j) => (
                          <tr key={j}>
                            <td className="px-4 py-3 font-mono text-[12px] text-teal-300">
                              {ex.name}
                            </td>
                            <td className="px-4 py-3 text-[13px] text-white/65">{ex.purpose}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-teal-500/10 via-slate-900/0 to-slate-900/0 p-6 md:p-8">
          <h2 className="text-xl font-semibold text-white">How to manage or delete cookies</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 md:text-[15px]">
            You can control cookies directly from your browser:
          </p>
          <ul className="mt-4 space-y-2 pl-1 text-sm text-white/65 md:text-[15px]">
            <li className="flex gap-2">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400/60" />
              <span>
                <strong className="text-white/85">Chrome / Edge:</strong> Settings → Privacy and security → Cookies and other site data.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400/60" />
              <span>
                <strong className="text-white/85">Safari:</strong> Settings → Privacy → Manage Website Data.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400/60" />
              <span>
                <strong className="text-white/85">Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400/60" />
              <span>
                <strong className="text-white/85">iOS:</strong> Settings → Safari → Block All Cookies.
              </span>
            </li>
          </ul>
          <p className="mt-5 text-sm text-white/55 md:text-[15px]">
            Disabling necessary cookies may prevent parts of Agentic DPO (such as chat history
            persistence) from working correctly.
          </p>
        </section>

        <footer className="text-center text-xs text-white/40 md:text-[13px]">
          Questions about our cookie practices? Email{' '}
          <a href="mailto:privacy@agenticdpo.cloud" className="text-teal-400 hover:underline">
            privacy@agenticdpo.cloud
          </a>
          .
        </footer>
      </div>
    </ContentLayout>
  )
}
