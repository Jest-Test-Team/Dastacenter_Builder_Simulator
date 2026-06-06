import Link from 'next/link';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. Acceptance',
    body: 'By accessing or using the Datacenter Builder Simulator ("Service"), you agree to be bound by these Terms. If you do not agree, do not use the Service.',
  },
  {
    title: '2. Eligibility',
    body: 'You must be at least 13 years old to use the Service. You are responsible for the wallet you connect and for any actions taken with that wallet.',
  },
  {
    title: '3. No professional advice',
    body: 'The Service is an educational simulator. The score, certificate, and any analysis it produces are not professional engineering, legal, financial, or compliance advice. Do not use the Service to make real-world design or compliance decisions without consulting a qualified professional.',
  },
  {
    title: '4. Wallet-only authentication',
    body: 'The Service does not use email or password accounts. Your wallet address is your identity. You are responsible for the security of your wallet and your private keys. We will never ask for your seed phrase or private key.',
  },
  {
    title: '5. User content',
    body: 'You retain ownership of any builds ("User Content") you create. By using the Service, you grant us a non-exclusive, royalty-free, worldwide license to host, transmit, and display your User Content solely to operate the Service. We will not sell or share your User Content with third parties except as required to publish a Credly badge at your explicit request.',
  },
  {
    title: '6. Acceptable use',
    body: 'You agree not to: (a) reverse-engineer the Service; (b) use it to attack or interfere with any system; (c) upload malicious content; (d) impersonate any person or entity; (e) use it to violate any applicable law.',
  },
  {
    title: '7. Intellectual property',
    body: 'The Service, its source code, the scoring engine, the block catalog, the curriculum, and all related content are owned by the operators of the Service and licensed to you under the MIT License for the open-source components (see LICENSE).',
  },
  {
    title: '8. Disclaimers',
    body: 'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
  },
  {
    title: '9. Limitation of liability',
    body: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE OPERATORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, OR GOODWILL.',
  },
  {
    title: '10. Termination',
    body: 'We may suspend or terminate access to the Service at any time, with or without cause, with or without notice. Upon termination, your right to use the Service will immediately cease.',
  },
  {
    title: '11. Changes',
    body: 'We may update these Terms from time to time. We will post the updated Terms on this page and update the "Last updated" date. Your continued use of the Service after any change constitutes acceptance.',
  },
  {
    title: '12. Governing law',
    body: 'These Terms are governed by the laws of the State of Delaware, United States, without regard to its conflict-of-laws principles.',
  },
  {
    title: '13. Contact',
    body: 'For questions about these Terms, email legal@datacenterbuilder.example.',
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen overflow-y-auto bg-bg">
      <header className="border-b border-border bg-bg-panel/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/" className="font-semibold">🖥️ Datacenter Builder</Link>
          <Link href="/build/free" className="btn text-sm">Build</Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-1 text-xs text-fg-muted">Last updated: 2026-01-15. This is a template; review by counsel before public release.</p>
        <div className="prose prose-invert mt-6 max-w-none text-sm">
          {SECTIONS.map((s) => (
            <section key={s.title} className="mt-6">
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="mt-1 text-fg-muted">{s.body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
