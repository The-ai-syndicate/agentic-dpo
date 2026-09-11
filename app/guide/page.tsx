import ContentLayout from '../content-layout'
import { BookOpen, Scale, Users, Gavel, FileKey, ShieldAlert, Factory, Landmark, AlertTriangle } from 'lucide-react'

export const metadata = {
  title: 'DPA Quick Guide | Botswana Data Protection Act Overview',
  description:
    'A concise, structured overview of the Botswana Data Protection Act — key parts, rights, obligations, penalties and regulator in one place.',
}

const parts = [
  {
    icon: Scale,
    number: 'Part I – III',
    title: 'Preliminary & Interpretation',
    body: 'Defines key terms such as "personal data", "special personal data", "data subject", "data controller", "data processor", and "processing". Establishes the territorial scope: the DPA applies to processing done in Botswana, or processing outside Botswana of data subjects located in Botswana.',
  },
  {
    icon: Landmark,
    number: 'Part IV',
    title: 'Office of the Data Protection Commissioner',
    body: 'Establishes the Data Protection Commissioner (DPC) as the independent regulator. The DPC oversees compliance, handles complaints, issues codes of practice, conducts investigations and imposes administrative penalties. Funded by Parliament and accountable through an Advisory Council.',
  },
  {
    icon: FileKey,
    number: 'Part V',
    title: 'Lawful processing principles',
    body: 'The heart of the DPA: processing must be lawful, fair and transparent; collected for specified, legitimate purposes; adequate, relevant and not excessive; accurate and up-to-date; kept no longer than necessary; processed in accordance with data subject rights; secured appropriately; and transfer records maintained. Controllers must be able to demonstrate compliance (accountability).',
  },
  {
    icon: ShieldAlert,
    number: 'Part VI',
    title: 'Lawful bases for processing',
    body: 'Processing is lawful only if at least one basis applies: (a) consent of the data subject; (b) performance of a contract; (c) compliance with a legal obligation; (d) protection of vital interests; (e) performance of a public task; (f) legitimate interests of the controller/third party (balanced against the data subject\'s rights). Special personal data (race, health, religion, biometrics, etc.) has stricter, additional conditions.',
  },
  {
    icon: Users,
    number: 'Part VII',
    title: 'Rights of data subjects',
    body: 'Confers the core rights: (1) Right to be informed; (2) Right of access / subject access request (SAR); (3) Right to rectification; (4) Right to erasure ("right to be forgotten"); (5) Right to restriction of processing; (6) Right to data portability; (7) Right to object to processing, including automated individual decision-making and profiling; (8) Right to compensation for damage caused by non-compliant processing.',
  },
  {
    icon: Factory,
    number: 'Part VIII – XI',
    title: 'Controllers, processors & international transfers',
    body: 'DPO appointment is mandatory for certain categories of controllers/processors (high-volume, special data, public bodies). Obligations include maintaining a processing register, conducting data protection impact assessments (DPIAs) for high-risk processing, signing data processing agreements with processors, and securing cross-border transfers on the basis of adequacy, appropriate safeguards, binding corporate rules or specific derogations.',
  },
  {
    icon: Gavel,
    number: 'Part XII – XIV',
    title: 'Enforcement, offences & penalties',
    body: 'The DPC may serve enforcement notices, information notices, audit notices and penalty notices. Summary and indictable offences include unlawful processing, unlawful disclosure, breach of confidentiality, failure to notify a breach, and obstruction of the Commissioner. Maximum penalties reach P500,000 and/or up to 5 years\' imprisonment, depending on the offence. Data subjects may also bring civil proceedings.',
  },
  {
    icon: AlertTriangle,
    number: 'Breach reporting',
    title: 'Personal data breaches',
    body: 'A controller must notify the DPC of a personal data breach "without undue delay" and in any event not later than 72 hours after becoming aware of it, unless the breach is unlikely to result in a risk to the rights and freedoms of data subjects. Where the breach is likely to result in a "high risk", the data subject must also be notified without undue delay.',
  },
]

export default function GuidePage() {
  return (
    <ContentLayout>
      <div className="space-y-12">
        <header className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-700 shadow-lg shadow-teal-500/20">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Botswana DPA — Quick Guide
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-white/55 md:text-base">
            A plain-language overview of the Act. This page is a summary and not legal
            advice — always check the authoritative DPA text or your legal advisor for
            compliance-critical decisions.
          </p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-teal-500/10 via-slate-900/0 to-slate-900/0 p-6 md:p-8">
          <h2 className="text-xl font-semibold text-white md:text-2xl">
            In a nutshell
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 md:text-[15px]">
            The Botswana <em>Data Protection Act</em> is a comprehensive, modern privacy
            statute modelled on global best practice (aligned in many respects with the
            EU GDPR and South Africa&apos;s POPIA). It governs the <strong>collection,
            use, storage and sharing of personal data</strong>, creates the independent{' '}
            <strong>Office of the Data Protection Commissioner</strong>, confers
            enforceable rights on data subjects, mandates registration of controllers and
            processors, imposes DPIAs and breach-reporting duties, and carries criminal
            penalties up to{' '}
            <span className="font-semibold text-teal-300">P500,000 / 5 years&apos; imprisonment</span>
            {' '}for the most serious offences.
          </p>
        </section>

        <section>
          <h2 className="mb-5 text-xl font-semibold text-white md:text-2xl">
            Structure of the Act
          </h2>
          <div className="space-y-4">
            {parts.map((p, i) => {
              const Icon = p.icon
              return (
                <article
                  key={i}
                  className="group grid gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-teal-500/30 hover:bg-white/[0.045] md:grid-cols-[220px_1fr] md:p-7"
                >
                  <div className="flex items-start gap-3 md:flex-col md:gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 ring-1 ring-teal-500/20">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col md:flex-col md:gap-0.5">
                      <p className="font-mono text-[11px] uppercase tracking-wider text-teal-400">
                        {p.number}
                      </p>
                      <h3 className="text-[15px] font-semibold text-white">
                        {p.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-white/70 md:text-[15px]">
                    {p.body}
                  </p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border-2 border-amber-500/30 bg-amber-500/5 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-amber-200 md:text-base">
                ⚠️ Practical next-steps for every organisation
              </h3>
              <ol className="mt-3 space-y-2 text-sm leading-relaxed text-amber-100/85 md:text-[15px]">
                <li>
                  <strong className="text-amber-200">1. Map your data:</strong> build a
                  processing register showing what personal data you hold, why, legal
                  basis, retention period and cross-border flows.
                </li>
                <li>
                  <strong className="text-amber-200">2. Review consents & notices:</strong>{' '}
                  update privacy notices, website banners, HR forms and supplier
                  contracts to meet Part V and Part VI requirements.
                </li>
                <li>
                  <strong className="text-amber-200">3. Appoint a DPO:</strong> if you
                  process special data or process at large scale, designate a Data
                  Protection Officer and publish their contact details.
                </li>
                <li>
                  <strong className="text-amber-200">4. Breach plan:</strong> create a
                  breach-response playbook that can deliver the 72-hour notification to
                  the DPC.
                </li>
                <li>
                  <strong className="text-amber-200">5. Chat with Agentic DPO:</strong>{' '}
                  return to the home page and ask &quot;I run a 40-person retail company
                  in Gaborone — what do I need to do to get DPA compliant by end of
                  quarter?&quot;
                </li>
              </ol>
            </div>
          </div>
        </section>

        <footer className="text-center text-xs text-white/40 md:text-[13px]">
          This guide is for educational convenience. For the authoritative copy of the
          DPA, refer to the Government Printer or the Office of the Data Protection
          Commissioner.
        </footer>
      </div>
    </ContentLayout>
  )
}
