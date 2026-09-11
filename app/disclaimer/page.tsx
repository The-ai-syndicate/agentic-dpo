import ContentLayout from '../content-layout'
import { Scale, AlertTriangle, FileCheck, Gavel, Bot, Shield } from 'lucide-react'

export const metadata = {
  title: 'Disclaimer | Agentic DPO',
  description:
    'Legal disclaimers for Agentic DPO — AI output limitations, no legal advice, warranty disclaimers, third-party content and endorsement information.',
}

const pillars = [
  {
    icon: Gavel,
    title: 'Not legal advice',
    body: 'Agentic DPO uses artificial intelligence to summarise and explain the Botswana Data Protection Act and related guidance in plain language. Our outputs are general educational summaries only. They are not legal opinions, compliance certificates, advice from an admitted legal practitioner, and do not create an attorney–client or solicitor–client privilege relationship.',
  },
  {
    icon: Bot,
    title: 'AI limitations & accuracy',
    body: 'Generative AI systems, including Agentic DPO, are probabilistic and can produce hallucinations, outdated statements, omissions or incorrect citations. The law may be amended, or authoritative guidance issued by the Data Protection Commissioner, after our last knowledge update. We do not warrant that any output is complete, current, accurate or authoritative.',
  },
  {
    icon: FileCheck,
    title: 'Verification required',
    body: 'It is your sole responsibility to verify the correctness of every response against: (1) the authoritative printed or electronic copy of the Data Protection Act and its regulations; (2) binding guidance, notices and enforcement decisions published by the Office of the Data Protection Commissioner; and (3) where necessary, independent advice from a duly admitted legal practitioner of Botswana.',
  },
  {
    icon: Shield,
    title: 'No guarantee of compliance outcome',
    body: 'Using Agentic DPO to research or draft compliance steps does not guarantee that your organisation will be found compliant by the Data Protection Commissioner, a court, or any regulator. Each organisation\'s facts, sector and processing context differ materially — our guidance cannot substitute for a tailored compliance assessment.',
  },
  {
    icon: AlertTriangle,
    title: 'Reportable events',
    body: 'If you are investigating a suspected personal data breach, DPO registration, enforcement notice, subject-access request response or other time-sensitive or reportable matter under the DPA, you must not rely solely on Agentic DPO outputs. You should engage qualified legal or compliance assistance immediately.',
  },
]

export default function DisclaimerPage() {
  return (
    <ContentLayout>
      <div className="space-y-12">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 shadow-lg shadow-amber-500/20">
            <Scale className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Disclaimer
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-white/50 md:text-base">
            Please read this important notice before relying on any Agentic DPO output.
          </p>
        </header>

        <section className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-200 md:text-xl">
                Important — read this first
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-amber-100/80 md:text-[15px]">
                Agentic DPO is an educational tool, not a law firm, not a substitute for a
                registered Data Protection Officer, and not a substitute for independent
                legal advice. Nothing you read in a response from Agentic DPO shall be
                treated as a legal opinion or relied upon as such.
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-5">
          {pillars.map((p, i) => {
            const Icon = p.icon
            return (
              <section
                key={i}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-white md:text-xl">{p.title}</h2>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/70 md:text-[15px]">
                  {p.body}
                </p>
              </section>
            )
          })}
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-lg font-semibold text-white md:text-xl">
            Third-party content & trademarks
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 md:text-[15px]">
            References in Agentic DPO outputs to statutes, regulators, organisations,
            products or services are for informational purposes only and do not constitute
            endorsement, sponsorship or affiliation unless explicitly stated. All
            trademarks, trade-names and insignia belong to their respective owners. The
            Botswana coat of arms, the Data Protection Act and other public legal texts
            are public materials of the Republic of Botswana and remain the property of
            the Republic.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-lg font-semibold text-white md:text-xl">
            Updates to this disclaimer
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 md:text-[15px]">
            We may revise this disclaimer from time to time to reflect changes in the law,
            product features or regulatory interpretation. The &quot;Last updated&quot;
            date at the top of this page indicates the most recent material change. Your
            continued use of the Service after such updates constitutes acceptance of the
            revised disclaimer.
          </p>
          <p className="mt-4 text-xs text-white/45 md:text-[13px]">
            Last updated: {new Date().toLocaleDateString('en-BW', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </section>
      </div>
    </ContentLayout>
  )
}
