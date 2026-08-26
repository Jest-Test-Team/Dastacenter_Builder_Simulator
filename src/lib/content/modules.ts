/**
 * Learning modules catalog.
 *
 * Each module maps to one or more scenarios. Modules are pure data
 * (MDX-ready) and validated by Zod on load.
 */

import { z } from 'zod';
import {
  LEDGER,
  MINT_CERTIFICATE,
  NOIR_MAIN,
  OPEN_COMMITMENT,
  PRAGMA,
  PROVE_THRESHOLD,
  REGISTRY,
  WITNESSES,
} from './compact-source';

export const ModuleLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type ModuleLevel = z.infer<typeof ModuleLevelSchema>;

/**
 * A source excerpt shown inside a lesson.
 *
 * `source` must be quoted verbatim from a file in the repo — see
 * `tests/unit/module-code-excerpts.test.ts`, which re-reads the real file and
 * fails if an excerpt drifts. Teaching material that has silently diverged from
 * the contract it claims to explain is worse than none.
 */
export const CodeBlockSchema = z.object({
  language: z.enum(['compact', 'noir', 'ts']),
  /** Repo-relative path the excerpt was taken from, shown as the caption. */
  file: z.string(),
  source: z.string(),
  /** Zero-based line indexes within `source` to call out. */
  highlight: z.array(z.number().int().nonnegative()).default([]),
  caption: z.string().optional(),
});
export type CodeBlock = z.infer<typeof CodeBlockSchema>;

export const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2),
  answerIndex: z.number().int().nonnegative(),
  /** Shown after answering, right or wrong. The reason is the lesson. */
  because: z.string(),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const LessonStepSchema = z.object({
  title: z.string(),
  body: z.string(), // MDX or markdown
  code: z.array(CodeBlockSchema).default([]),
});
export type LessonStep = z.infer<typeof LessonStepSchema>;

/** Which curriculum a module belongs to. Modules without one are `facility`. */
export const ModuleTrackSchema = z.enum(['facility', 'privacy']);
export type ModuleTrack = z.infer<typeof ModuleTrackSchema>;

export const ModuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  track: ModuleTrackSchema.default('facility'),
  level: ModuleLevelSchema,
  estMinutes: z.number().int().positive(),
  prerequisites: z.array(z.string()).default([]),
  standards: z.array(z.string()).default([]),
  learningObjectives: z.array(z.string()).default([]),
  lessons: z.array(LessonStepSchema).default([]),
  quiz: z.array(QuizQuestionSchema).default([]),
  scenarioId: z.string().optional(),
});
export type Module = z.infer<typeof ModuleSchema>;

/**
 * Raw catalog, typed as the schema's *input* so a module may omit anything the
 * schema defaults. `modules` below is the parsed, fully-populated form.
 */
const rawModules: z.input<typeof ModuleSchema>[] = [
  {
    id: 'site-selection',
    title: 'Site Selection',
    summary: 'Choose a safe site. Avoid flood zones, fault lines, and flight paths.',
    level: 'beginner',
    estMinutes: 20,
    prerequisites: [],
    standards: ['EN 50600-2-1', 'Eurocode 8'],
    learningObjectives: [
      'Identify natural hazards (flood, fault, weather)',
      'Recognize man-made risks (airports, chemical plants, HV lines)',
      'Pick a site that meets zoning and connectivity needs',
    ],
    lessons: [
      {
        title: 'Natural hazards',
        body: 'Data centers should be sited away from **flood zones**, **active fault lines**, **wildfire risk areas**, and **air corridors**. Local building codes (e.g. FEMA flood maps in the US, Eurocode 8 in the EU) provide hard constraints.',
      },
      {
        title: 'Man-made risks',
        body: 'Avoid proximity to **airports** (vibration, fuel risk), **chemical plants**, **ammunition depots**, and **high-voltage transmission corridors**. Buffer distances are typically defined by local regulations.',
      },
      {
        title: 'Utilities and connectivity',
        body: 'A good site has **two independent utility feeds** from different substations, and **multiple fiber routes** with low latency to the operator\'s customer base. This is the foundation of Tier III/IV reliability.',
      },
    ],
    scenarioId: 'site-selection',
  },
  {
    id: 'uptime-tiers',
    title: 'Uptime Tiers I → IV',
    summary: 'Evolve the same site from Tier I (basic) to Tier IV (fault tolerant).',
    level: 'intermediate',
    estMinutes: 45,
    prerequisites: ['site-selection'],
    standards: ['Uptime Tier I-IV', 'TIA-942'],
    learningObjectives: [
      'Differentiate Tier I, II, III, IV by redundancy and concurrent maintainability',
      'Add N+1, then 2N power and cooling paths',
      'Recognize SPOFs and remove them',
    ],
    lessons: [
      {
        title: 'Tier I — basic',
        body: 'Tier I has a single utility feed, no redundancy. 99.671% availability. Downtime: <28.8 hrs/yr. Suitable for SMBs, dev environments.',
      },
      {
        title: 'Tier II — N+1',
        body: 'Tier II adds **redundant components** (N+1). One UPS, one generator, plus a spare. 99.749% availability. Downtime: <22 hrs/yr.',
      },
      {
        title: 'Tier III — concurrently maintainable',
        body: 'Tier III allows **planned maintenance without shutdown**. Requires two utility feeds, dual UPS/generator, redundant cooling. 99.982% availability. Downtime: <1.6 hrs/yr.',
      },
      {
        title: 'Tier IV — fault tolerant',
        body: 'Tier IV is **2N**: two fully independent power and cooling paths that can survive a single fault during maintenance. 99.995% availability. Downtime: <26 min/yr.',
      },
    ],
    scenarioId: 'tier-iv',
  },
  {
    id: 'power-distribution',
    title: 'Power Distribution Path',
    summary: 'Trace power from utility to the chip on the server.',
    level: 'intermediate',
    estMinutes: 35,
    prerequisites: ['uptime-tiers'],
    standards: ['TIA-942', 'Uptime Tier I-IV'],
    learningObjectives: [
      'Trace the single-line diagram',
      'Size transformers, switchgear, UPS, generator, PDU',
      'Understand the role of busway and feeders',
    ],
    lessons: [
      {
        title: 'Utility → Transformer',
        body: 'The grid feeds medium-voltage AC. A **transformer** steps it down to 480V (US) or 400V (EU) three-phase for distribution.',
      },
      {
        title: 'Switchgear → UPS → Generator',
        body: '**Switchgear** distributes power. A **UPS** (uninterruptible power supply) provides ride-through during transients and bridges to a **diesel generator** for sustained outages.',
      },
      {
        title: 'PDU → Rack',
        body: 'A **PDU** (power distribution unit) is the final step before the rack. A/B PDUs are the canonical Tier IV pattern.',
      },
    ],
    scenarioId: 'power-path',
  },
  {
    id: 'cooling-architecture',
    title: 'Cooling Architecture',
    summary: 'Match cooling to IT load. Stay inside ASHRAE A1.',
    level: 'intermediate',
    estMinutes: 40,
    prerequisites: ['power-distribution'],
    standards: ['ASHRAE TC 9.9', 'TIA-942'],
    learningObjectives: [
      'Calculate heat load from IT power',
      'Choose CRAC, in-row, CDU, or immersion',
      'Design hot/cold aisle containment',
    ],
    lessons: [
      {
        title: 'Heat load basics',
        body: 'Every watt of IT power becomes a watt of heat. A 5 kW rack needs to dissipate 5 kW. ASHRAE A1 specifies an inlet temperature range of **18–27°C** with a maximum of **60% RH**.',
      },
      {
        title: 'Air cooling',
        body: '**CRAC** (computer room air conditioning) supplies cold air. **In-row coolers** sit between racks, enabling higher density (up to ~30 kW/rack).',
      },
      {
        title: 'Liquid cooling',
        body: '**CDU** (coolant distribution unit) and **immersion tanks** handle densities >50 kW/rack, required for modern AI/ML workloads. ASHRAE H1 (2024) is the new high-density liquid class.',
      },
    ],
    scenarioId: 'cooling',
  },
  {
    id: 'fire-protection',
    title: 'Fire Protection (NFPA 75 / 2001)',
    summary: 'Detect early, suppress cleanly, cut power fast.',
    level: 'intermediate',
    estMinutes: 25,
    prerequisites: ['cooling-architecture'],
    standards: ['NFPA 75', 'NFPA 2001'],
    learningObjectives: [
      'Place VESDA in every IT zone',
      'Use clean agent (FM-200 / Novec 1230) for suppression',
      'Make EPO reachable within seconds',
    ],
    lessons: [
      {
        title: 'Early detection',
        body: '**VESDA** (very early smoke detection apparatus) detects combustion particles before visible smoke. NFPA 75 requires it in IT areas.',
      },
      {
        title: 'Clean suppression',
        body: '**FM-200** or **Novec 1230** suppress fire without damaging electronics. They are stored under pressure and released on alarm. NFPA 2001 covers the design.',
      },
      {
        title: 'EPO',
        body: 'An **Emergency Power Off** button cuts IT power when smoke or water is detected. It must be reachable within seconds from any point in the data hall.',
      },
    ],
    scenarioId: 'fire',
  },
  {
    id: 'security-framework',
    title: '5-Function Security Framework',
    summary: 'Deterrence → Preventive → Detective → Corrective → Recovery, with Compensating.',
    level: 'advanced',
    estMinutes: 50,
    prerequisites: ['fire-protection'],
    standards: ['ISO 27001', 'NIST CSF', 'EN 50600-2-5'],
    learningObjectives: [
      'Place physical preventive controls (mantrap, biometric)',
      'Enable detective controls (SIEM, IDS)',
      'Configure recovery (immutable backups, IaC)',
    ],
    lessons: [
      {
        title: 'Deterrence',
        body: '**Physical**: CCTV, lighting, fences. **Logical**: login banners, WAFs, honeypots. **Administrative**: AUPs, NDAs, sanctions. Goal: raise the perceived cost of attack.',
      },
      {
        title: 'Prevention',
        body: '**Mantraps**, **MFA**, **biometric readers** at the data hall. **Firewalls** and **micro-segmentation** on the network. **Zero trust** defaults.',
      },
      {
        title: 'Detection',
        body: '**SIEM** correlation. **IDS/IPS** on the wire. **Environmental sensors** (temp, humidity, leak).',
      },
      {
        title: 'Correction & recovery',
        body: '**Auto-isolation** on malware. **IPS auto-drop**. **Immutable backups** that ransomware can\'t encrypt. **IaC** to rebuild clean.',
      },
    ],
    scenarioId: 'security',
  },
  {
    id: 'esg-efficiency',
    title: 'ESG & Efficiency (PUE / WUE)',
    summary: 'Meet the EU EED, German EnEfG, Singapore DIA, and China PUE rules.',
    level: 'advanced',
    estMinutes: 30,
    prerequisites: ['cooling-architecture'],
    standards: ['EU EED 2023/1791', 'DE EnEfG', 'SG DIA', 'CN PUE'],
    learningObjectives: [
      'Calculate PUE and WUE',
      'Enable heat recovery and renewables',
      'Pick a target that matches your jurisdiction',
    ],
    lessons: [
      {
        title: 'PUE',
        body: '**PUE = Total Facility Energy / IT Equipment Energy**. Closer to 1 is better. Modern hyperscale: ~1.1. Legacy: ~2.0.',
      },
      {
        title: 'WUE',
        body: '**WUE = liters of water / kWh of IT energy**. Waterless designs (immersion) score 0.',
      },
      {
        title: 'Regulations',
        body: '**EU EED 2024**: >500 kW must report PUE/WUE. >1 MW must recover heat. **DE EnEfG 2026**: new DCs PUE ≤ 1.2. 2027: 100% renewable. **CN**: new DCs PUE ≤ 1.3 (1.25 in hubs).',
      },
    ],
    scenarioId: 'esg',
  },
  {
    id: 'network-sdn',
    title: 'Network & SDN',
    summary: 'Build a leaf-spine fabric with SDN, segmentation, and WAF.',
    level: 'advanced',
    estMinutes: 35,
    prerequisites: ['power-distribution'],
    standards: ['TIA-942', 'ISO 27001 A.8'],
    learningObjectives: [
      'Build leaf-spine',
      'Place SDN controller for orchestration',
      'Segment workloads with VLANs and WAF',
    ],
    lessons: [
      {
        title: 'Leaf-spine',
        body: '**Leaf switches** at the rack. **Spine switches** between rows. Every leaf connects to every spine. Predictable latency, easy scaling.',
      },
      {
        title: 'SDN',
        body: 'A **software-defined networking controller** programs the fabric. Enables micro-segmentation, dynamic routing, and zero-touch provisioning.',
      },
      {
        title: 'Edge protection',
        body: 'A **WAF** (web application firewall) and **firewall** at the edge. Internal segmentation between customer zones.',
      },
    ],
    scenarioId: 'network',
  },

  // --------------------------------------------------------------------------
  // Privacy track.
  //
  // Taught from `circuits/datacenter-score.compact` — the contract this app
  // ships — rather than from a toy counter. Every excerpt is quoted verbatim
  // and checked against the real file by tests/unit/compact-excerpts.test.ts.
  // --------------------------------------------------------------------------
  {
    id: 'why-privacy',
    title: 'Why a Good Score Is a Secret',
    summary:
      'A facility\'s real PUE and layout are trade secrets. Publishing them to earn a credential is not an option.',
    track: 'privacy',
    level: 'beginner',
    estMinutes: 15,
    prerequisites: [],
    standards: ['EU EED', 'ISO/IEC 27001'],
    learningObjectives: [
      'Explain why an operator will not publish a real PUE or floor layout',
      'State the one sentence a threshold proof asserts, and what it withholds',
      'Distinguish what a verifier learns from what a verifier can infer',
    ],
    lessons: [
      {
        title: 'The bind',
        body: `An operator wants the credential. Regulators, customers and insurers all reward a certified Tier III facility, and the EU Energy Efficiency Directive increasingly requires reporting at all.

But the inputs to that certification — the real **PUE**, the cooling topology, the rack counts, where the generators sit relative to the fuel store — are exactly what a competitor would want and exactly what an attacker would use. Publishing them to earn a badge trades a durable secret for a static image.

The usual escape is a trusted auditor: show one party everything, and let them vouch. That works, and it costs a retainer, a scheduling window and an NDA. It also means the claim is only as good as the auditor.`,
      },
      {
        title: 'One sentence, and nothing more',
        body: `A zero-knowledge threshold proof replaces "show me" with "prove it". The circuit in this repo proves exactly one sentence:

> I know a facility design whose knowledge-graph digest is D, which rule pack V scored at or above the threshold T.

- **Public** — a blinded commitment to the digest, the rule pack version, and the threshold that was cleared.
- **Private** — the digest itself and therefore the whole design; the exact score, PUE, layout, rack counts, cooling topology, every asset and every edge.

The certificate this app mints carries \`Score: >= 85\`, not \`Score: 91\`. The gap between those two strings is the entire product.`,
      },
      {
        title: 'Why the threshold is public',
        body: `It is tempting to hide the bar as well. Do not. A claim of "I cleared the threshold" is meaningless when the threshold is unknown — the prover could have set it to zero.

The same logic applies to the rule pack. Without pinning **which** rule pack judged the design, a proof earned under a lax pack could be replayed as though it had cleared a strict one. So the bar and the ruler are public, and only the measurement is not.

There is one more thing that must be private, for a non-obvious reason: the **blinding factor**. Without it, the commitment is just a hash of the digest, and anyone holding a guess at the design could confirm that guess by recomputing it. A hash of a low-entropy secret is not a secret.`,
      },
    ],
    quiz: [
      {
        question: 'Why is the threshold published rather than kept private?',
        options: [
          'The proving system cannot handle private integers',
          'A claim of "I cleared the bar" says nothing when the bar is unknown',
          'Regulators require it',
          'It makes the proof smaller',
        ],
        answerIndex: 1,
        because:
          'A prover who chooses a secret threshold can choose zero. Publishing the bar is what makes the claim mean something; the score behind it stays private.',
      },
      {
        question: 'What does the blinding factor protect against?',
        options: [
          'A verifier who tampers with the proof bytes',
          'A prover who inflates their score',
          'An observer who guesses the design and confirms it by recomputing the hash',
          'Replaying a proof under a different rule pack',
        ],
        answerIndex: 2,
        because:
          'Commitments to low-entropy values are guessable. Blinding adds the entropy that makes the commitment hiding rather than merely opaque.',
      },
    ],
  },
  {
    id: 'compact-basics',
    title: 'Compact: Ledger, Witness, Circuit',
    summary:
      'The three declarations that make up a Compact contract, read from the contract this app ships.',
    track: 'privacy',
    level: 'intermediate',
    estMinutes: 25,
    prerequisites: ['why-privacy'],
    standards: ['Compact 0.23', 'Midnight'],
    learningObjectives: [
      'Read a Compact source file and identify its public and private surfaces',
      'Declare ledger state, witnesses, and an exported circuit',
      'Explain why the language version is pinned in the source itself',
    ],
    lessons: [
      {
        title: 'The header',
        body: `Every Compact file opens by pinning the language version it was written against, then importing the standard library.

The pin is not ceremony. Compact is young, and the compiler, the runtime and the ledger move in generations that must line up — this project has a whole document about a version gap that stopped a proof from being produced at all. A file that does not say which language it speaks is a file that will silently mean something else next year.`,
        code: [
          {
            language: 'compact',
            file: 'circuits/datacenter-score.compact',
            source: PRAGMA,
            caption: 'The version pin is the first line of the contract, not a build flag.',
          },
        ],
      },
      {
        title: 'ledger — the public surface',
        body: `\`ledger\` declares state that lives on-chain, in the open. Anything here is world-readable forever.

That is the right home for the ruler and the bar — the rule pack version and the threshold — and for the blinded commitment. It is emphatically not the home for the digest, the score, or anything derived from the design.

Read a Compact contract by reading its \`ledger\` block first. It is a complete, enforced list of everything the contract can ever make public.`,
        code: [
          {
            language: 'compact',
            file: 'circuits/datacenter-score.compact',
            source: LEDGER,
            highlight: [2, 6, 10],
            caption: 'Three public values. The design is not among them.',
          },
        ],
      },
      {
        title: 'witness — the private surface',
        body: `A \`witness\` is an input the prover supplies locally and never transmits. The declaration is only a signature: it says "at proving time, something on this machine will hand me a \`Bytes<32>\`". In this app that something is the browser, which computes the knowledge-graph digest from the build before any proving begins.

Note what the three witnesses are. The digest stands in for the entire design. The score is the real number, not the threshold. The blinding is the entropy from the previous module. All three are the secret.`,
        code: [
          {
            language: 'compact',
            file: 'circuits/datacenter-score.compact',
            source: WITNESSES,
            highlight: [2, 3, 4],
            caption: 'Three private inputs, supplied locally, never sent.',
          },
        ],
      },
      {
        title: 'circuit — where the two meet',
        body: `An \`export circuit\` is the callable entry point. Its named parameters are **public** arguments — a caller and a verifier both see them — while anything it pulls from a \`witness()\` call is private.

So a circuit is precisely the place where private and public sit in the same scope. That is useful and it is dangerous, and it is why the next module is about a single keyword.`,
      },
    ],
    quiz: [
      {
        question: 'You are handed an unfamiliar Compact contract. What do you read first to learn everything it can make public?',
        options: [
          'Every circuit body, in order',
          'The `witness` declarations',
          'The `ledger` declarations',
          'The `pragma language_version` line',
        ],
        answerIndex: 2,
        because:
          'Ledger state is the contract\'s complete public surface, and the compiler enforces that nothing reaches it by accident. It is the fastest honest summary of what a contract leaks.',
      },
      {
        question: 'What does a `witness` declaration actually contain?',
        options: [
          'The secret value, embedded in the contract',
          'Only a signature — the value is supplied locally at proving time',
          'A commitment to the secret value',
          'An encrypted copy of the secret value',
        ],
        answerIndex: 1,
        because:
          'The witness is a hole the local prover fills. Nothing secret lives in the contract source, which is itself public.',
      },
    ],
  },
  {
    id: 'compact-disclose',
    title: 'disclose: Making Leakage Deliberate',
    summary:
      'Compact will not let a private value reach public state unless you say so, by name, at the line where it happens.',
    track: 'privacy',
    level: 'advanced',
    estMinutes: 35,
    prerequisites: ['compact-basics'],
    standards: ['Compact 0.23', 'Midnight'],
    learningObjectives: [
      'Explain what `disclose` does and, more importantly, what it is for',
      'Trace every value that crosses from witness to ledger in `proveThreshold`',
      'Contrast proving to everyone with revealing to one auditor',
    ],
    lessons: [
      {
        title: 'The keyword',
        body: `In most languages, leaking a secret looks exactly like not leaking one. You assign a variable. The bug is invisible at the call site and invisible in review, and it is only found later, by someone else, in production.

Compact refuses. A value derived from a witness cannot be written to ledger state unless it is wrapped in \`disclose(...)\`. The compiler tracks the taint for you; you cannot forget.

What makes this good design is not the safety. It is that \`disclose\` turns every leak into a **grep-able, reviewable, one-word annotation**. Auditing "what does this contract reveal?" stops being a data-flow analysis and becomes a search.`,
      },
      {
        title: 'Reading proveThreshold',
        body: `Read this circuit as three movements.

**Collect.** Three witness calls pull the digest, the real score and the blinding into scope. Nothing has been decided yet.

**Assert.** \`assert(achieved >= claimedThreshold)\` is the entire claim. There is no branch and no output for the failing case: if the score is below the bar, no proof exists. That is stronger than a check that returns false, because a false is something you can lie about later and an absent proof is not.

**Disclose.** Exactly three values cross the boundary, and each says so. The commitment — blinded, so it hides the digest. The threshold. The rule pack. \`digest\` and \`achieved\` are in scope on every one of those lines and neither is disclosed, which is the whole design stated in code.`,
        code: [
          {
            language: 'compact',
            file: 'circuits/datacenter-score.compact',
            source: PROVE_THRESHOLD,
            highlight: [10, 22, 23, 24],
            caption:
              'One assert carries the claim; three disclose calls are the complete public output.',
          },
        ],
      },
      {
        title: 'Binding the commitment',
        body: `The commitment is not \`hash(digest)\`. It is a hash of four things: the digest, the blinding, the rule pack version, and a domain string \`"datacenter-score/v1"\`.

Each has a job. The **blinding** makes it hiding. The **rule pack** stops a proof earned under a lax pack from being replayed as a strict one. The **domain** stops a commitment from this circuit being mistaken for a commitment from some other protocol that happens to hash the same fields — the cross-protocol replay that keeps catching people out.

The cost of adding a field to that hash is nothing. The cost of omitting one is a class of attack.`,
      },
      {
        title: 'The other direction: revealing to one',
        body: `Proving to everyone is the default. Occasionally somebody is entitled to more — a regulator, an insurer, an acquirer's diligence team, under NDA.

\`openCommitment\` is the escape hatch. The holder hands over the digest and the blinding; the auditor re-derives the commitment and checks it matches the one on the ledger. If it matches, the holder cannot have been holding a different design, because they would have had to find a hash collision.

Note what this is not. It is not a back door and it is not a key held by the protocol. The holder chooses, per auditor, per disclosure, and the data was never public in the first place. **Prove to everyone, reveal to one** — that pair is the whole privacy argument, and it fits in two circuits.`,
        code: [
          {
            language: 'compact',
            file: 'circuits/datacenter-score.compact',
            source: OPEN_COMMITMENT,
            caption: 'Selective disclosure: the same hash, re-derived by someone who was told.',
          },
        ],
      },
    ],
    quiz: [
      {
        question: 'What is the main practical benefit of requiring `disclose` at every leak site?',
        options: [
          'It encrypts the value before writing it',
          'It makes the proof faster to generate',
          'It turns "what does this contract reveal?" into a text search instead of a data-flow analysis',
          'It prevents the contract from being deployed with bugs',
        ],
        answerIndex: 2,
        because:
          'The compiler safety matters, but the reviewability is what changes how contracts get audited. Every leak is one grep-able word at the exact line it happens.',
      },
      {
        question: 'Why is the domain string included in the commitment hash?',
        options: [
          'To make the hash output longer',
          'So a commitment from this circuit cannot be mistaken for one from another protocol hashing the same fields',
          'Because Compact requires a fourth argument',
          'To identify the operator who produced it',
        ],
        answerIndex: 1,
        because:
          'Domain separation is the cheap defence against cross-protocol replay. Adding the field costs nothing; omitting it opens a class of attack.',
      },
      {
        question: 'What happens in `proveThreshold` when the score is below the threshold?',
        options: [
          'The circuit returns false and the caller decides',
          'The commitment is published with a failure flag',
          'No proof exists — the assert makes it unsatisfiable',
          'The threshold is lowered to match',
        ],
        answerIndex: 2,
        because:
          'An absent proof cannot be misrepresented later. A returned false can be. That asymmetry is why the claim lives in an assert.',
      },
    ],
  },
  {
    id: 'compact-ledger-state',
    title: 'Public Registries on a Private Chain',
    summary:
      'Counter, Map, and the judgement call of what deserves to be public unshielded state.',
    track: 'privacy',
    level: 'advanced',
    estMinutes: 25,
    prerequisites: ['compact-disclose'],
    standards: ['Compact 0.23', 'Midnight'],
    learningObjectives: [
      'Use `Counter` and `Map` ledger types to hold contract state',
      'Justify why a certificate registry is public while the design is not',
      'Make a circuit idempotent against a repeated call',
    ],
    lessons: [
      {
        title: 'Not everything should be private',
        body: `A privacy chain is not a chain where everything is hidden. It is a chain where you choose, and the interesting work is in choosing well.

A certificate that nobody can look up is not a certificate. The point of minting one is that a customer, an insurer or a regulator can later check the claim without contacting the operator at all. So the registry — which commitments have been certified, at what threshold, under which rule pack — is deliberately **public, unshielded** ledger state.

The design behind each entry remains a witness. What became public is only the fact that *some* design cleared the bar. That is exactly the granularity a credential needs and no more.`,
        code: [
          {
            language: 'compact',
            file: 'circuits/datacenter-score.compact',
            source: REGISTRY,
            highlight: [1, 4, 7],
            caption: 'A counter and two maps keyed by the blinded commitment.',
          },
        ],
      },
      {
        title: 'Counter and Map',
        body: `\`Counter\` is a ledger type with an \`increment\` operation rather than a plain integer, because concurrent increments have to merge sanely. \`Map<Bytes<32>, Uint<16>>\` is a persistent key-value map with \`member\` and \`insert\`.

The key here is the blinded commitment. That choice does two things at once: entries are addressable by anyone holding a certificate, and the key itself reveals nothing about the design it stands for.`,
      },
      {
        title: 'Idempotence',
        body: `\`mintCertificate\` is \`proveThreshold\` plus a registry write. The registry write is where a bug would live, so read the guard closely.

The counter advances only when the commitment is **not already a member**. Re-minting the same design overwrites its own entry instead of double-counting it. Without that guard, an operator could inflate the registry's certificate count by re-submitting one design, and the counter — which doubles as the next token id — would drift.

The general rule: a public write that can be triggered twice will be triggered twice. Decide what the second call means before someone else decides for you.`,
        code: [
          {
            language: 'compact',
            file: 'circuits/datacenter-score.compact',
            source: MINT_CERTIFICATE,
            highlight: [27, 28, 29],
            caption: 'The membership check is what makes a re-mint harmless.',
          },
        ],
      },
    ],
    quiz: [
      {
        question: 'Why is the certificate registry public rather than shielded?',
        options: [
          'Shielded maps are not supported by Compact',
          'A credential nobody can look up independently is not a credential',
          'Public state is cheaper to prove',
          'The registry holds no data worth hiding, since it holds the design',
        ],
        answerIndex: 1,
        because:
          'The registry publishes only that *some* design cleared the bar, keyed by a blinded commitment. That is the granularity a verifiable credential needs — and the design itself stays a witness.',
      },
      {
        question: 'What breaks if the `member` check before `tokenCounter.increment(1)` is removed?',
        options: [
          'Nothing — insert already overwrites',
          'The commitment would leak the design',
          'Re-minting one design inflates the certificate count and drifts the next token id',
          'The proof would fail to verify',
        ],
        answerIndex: 2,
        because:
          'The inserts are idempotent on their own; the counter is not. A public write that can be triggered twice will be, so the second call needs a defined meaning.',
      },
    ],
  },

  {
    id: 'noir-vs-compact',
    title: 'The Same Claim, Twice',
    summary:
      'The identical threshold proof written in Compact and in Noir — what each language makes easy, and what both had to get right.',
    track: 'privacy',
    level: 'advanced',
    estMinutes: 30,
    prerequisites: ['compact-ledger-state'],
    standards: ['Compact 0.23', 'Noir 1.0.0-beta.20', 'Midnight'],
    learningObjectives: [
      'Compare a contract-shaped ZK language with a circuit-shaped one',
      'Explain why the commitment is a public output rather than a public input',
      'Explain why a 256-bit digest is split into halves instead of truncated',
    ],
    lessons: [
      {
        title: 'Two shapes of the same idea',
        body: `This repo proves the same sentence in two languages, and the pair is more instructive than either alone.

**Compact is contract-shaped.** It has ledger state, a registry, and circuits that write to it. Privacy is a property of the *language*: witnesses are private by construction and \`disclose\` is the only door.

**Noir is circuit-shaped.** There is one \`main\` function; parameters are private unless marked \`pub\`, and the proof is a value you hand to whoever wants it. There is no chain in the picture at all.

Neither is better. They answer different questions: Compact answers "what does this contract publish?", Noir answers "what does this proof assert?".`,
        code: [
          {
            language: 'noir',
            file: 'circuits/noir/src/main.nr',
            source: NOIR_MAIN,
            highlight: [10, 11, 12, 15, 20],
            caption: 'The whole claim in Noir: private by default, `pub` marks the exceptions.',
          },
        ],
      },
      {
        title: 'The commitment is an output, not an input',
        body: `Look at the Noir signature: the commitment does not appear in the parameter list. It is the **return value**, and returns are \`pub\`.

The alternative — taking the commitment as a public input and asserting it inside — looks equivalent and is not. As an input, the prover supplies it, and a verifier who only checks "the proof verifies" has no way to know it corresponds to the witness that was proved about. As an output, the verifier reads the commitment the circuit itself derived. There is nothing to disagree with.

Compact reaches the same place by a different road: \`commitment = disclose(bound)\` writes a value the circuit computed to ledger state. Same property, expressed as an assignment rather than a return.

The general lesson: **make the verifier read what the circuit computed, never what the prover claimed.**`,
      },
      {
        title: 'The field is smaller than the hash',
        body: `The knowledge-graph digest is a 256-bit SHA-256 output. Noir's native \`Field\` over BN254 holds 254 bits. Two bits short.

The lazy fix is to truncate. It compiles, it proves, every test passes, and the binding is now weaker than the 256-bit hash everyone assumes it is — silently, in a way no failing test will ever tell you.

So the circuit carries the digest as two 128-bit halves, \`digest_hi\` and \`digest_lo\`, and hashes both. Compact avoids the question entirely with a native \`Bytes<32>\`, which is one concrete reason a contract-shaped language is pleasant to write in.

This is the kind of detail that separates a demo from a system. A cryptographic weakness that produces correct-looking output is the worst failure mode there is, because nothing ever reports it.`,
      },
      {
        title: 'Why this app proves with Noir',
        body: `The honest answer is toolchain generations, not preference.

The Compact contract compiles and its prover keys are in the repo, but the released compiler emits a runtime generation the current proof server does not accept — the gap is documented in \`docs/MIDNIGHT_ZK.md\` with the evidence. Rather than fake a proof, the app proves with Noir and Barretenberg UltraHonk, in the browser, in about 1.4 seconds, and says in the certificate metadata which prover produced it.

Keep that habit. A simulated proof presented as a cryptographic one is a lie that is very easy to tell by accident and very hard to walk back.`,
      },
    ],
    quiz: [
      {
        question: 'Why is the commitment a public *output* of the circuit rather than a public input?',
        options: [
          'Outputs are cheaper to verify than inputs',
          'So a prover cannot publish a commitment that disagrees with the witness they proved about',
          'Because Noir does not allow Field inputs to be public',
          'To keep the proof size below 16 KB',
        ],
        answerIndex: 1,
        because:
          'As an input, the commitment is a claim by the prover. As an output, it is a derivation by the circuit. Make the verifier read what the circuit computed.',
      },
      {
        question: 'What goes wrong if a 256-bit digest is truncated into a 254-bit field?',
        options: [
          'The proof fails to verify',
          'The circuit will not compile',
          'Everything works, but the binding is quietly weaker than advertised',
          'The commitment becomes non-hiding',
        ],
        answerIndex: 2,
        because:
          'Nothing reports it. Correct-looking output from a weakened primitive is the worst failure mode, which is why the digest is carried as two 128-bit halves.',
      },
    ],
  },

  {
    id: 'prove-it-yourself',
    title: 'Capstone: Prove It Yourself',
    summary:
      'Build a design, clear the bar, and generate a real zero-knowledge proof in your own browser. The proof is the assessment.',
    track: 'privacy',
    level: 'advanced',
    estMinutes: 40,
    prerequisites: ['noir-vs-compact'],
    standards: ['Noir 1.0.0-beta.20', 'Uptime Tier I-IV', 'EN 50600'],
    learningObjectives: [
      'Produce a real threshold proof from a design you built',
      'Read a proving console and say which step happens where',
      'Check the certificate publishes a threshold rather than a score',
    ],
    lessons: [
      {
        title: 'What you are about to do',
        body: `Everything up to here has been reading. This module is the doing, and it is the only assessment in the track that cannot be passed by recognising the right multiple-choice option.

You will build a data center that scores at or above **85**, then generate a zero-knowledge proof of exactly that and nothing more. The proof runs in your browser — roughly 1.4 seconds once the WASM is warm, about 30 seconds on the first call while it compiles.

- Open the [free build](/build/free) and place blocks until the score panel clears 85. The [facility track](/learn) is there if you get stuck on the engineering.
- Go to the certificate page for that build and start the proof.
- Watch the proving console. It names each stage as it happens.`,
      },
      {
        title: 'Reading the console',
        body: `The console is not decoration. It exists so you can see the privacy boundary rather than take it on faith. Four stages matter:

- **Graph** — your build is turned into a knowledge graph and hashed into a 256-bit digest. Local.
- **Witness** — the digest, your real score and a fresh blinding factor are assembled. Local. This is the moment the secret exists in one place, and that place is your machine.
- **Proving** — Barretenberg builds an UltraHonk proof. Local, in WASM.
- **Verifying** — your own machine checks the proof before anything is submitted. A proof your own machine will not accept has no business being relayed anywhere.

Only after all four does anything leave: the finished proof, its public inputs, and nothing else. Not the digest, not the score, not a single block coordinate.`,
      },
      {
        title: 'Check the certificate',
        body: `When the mint completes, read the metadata rather than the badge.

The \`Score\` attribute says \`>= 85\`, not your actual figure. The description states the design was not disclosed. And the metadata records **which prover produced the proof**, so a simulated proof can never be published as a cryptographic one — this app treats that as a non-negotiable, and it is written down as a non-goal in the roadmap.

If you want the sharper version of the exercise: score well above the bar, then check that nothing published anywhere reveals by how much. That gap is the product.`,
      },
      {
        title: 'What you have actually shown',
        body: `You now hold a credential that a third party can check without you, and without your design.

Be precise about what it does and does not assert. It asserts: *a design whose blinded commitment is C was scored at or above 85 by rule pack V*. It does not assert that the design is well-formed, or that the score was computed honestly — a circuit cannot re-run the rule pack without ingesting the whole private build, which would defeat the purpose. Those properties are attested by the scoring engine that produced the witness.

Knowing exactly where your proof's guarantee stops is not a caveat on the skill. It is the skill.`,
      },
    ],
  },
];

/** Parsed at module load: a malformed catalog fails the build, not a page view. */
export const modules: Module[] = rawModules.map((m) => ModuleSchema.parse(m));

export function getModule(id: string): Module | undefined {
  return modules.find((m) => m.id === id);
}

/** Modules of one track, in catalog order. */
export function modulesInTrack(track: ModuleTrack): Module[] {
  return modules.filter((m) => m.track === track);
}

/**
 * The module to read after this one: the next in the same track that lists it as
 * a prerequisite, falling back to the next in catalog order. Tracks are authored
 * in reading order, so the fallback is meaningful rather than arbitrary.
 */
export function nextModule(id: string): Module | undefined {
  const current = getModule(id);
  if (!current) return undefined;
  const track = modulesInTrack(current.track);
  const byPrereq = track.find((m) => m.prerequisites.includes(id));
  if (byPrereq) return byPrereq;
  const index = track.findIndex((m) => m.id === id);
  return index >= 0 ? track[index + 1] : undefined;
}

/** The module this one lists first as a prerequisite, if any. */
export function previousModule(id: string): Module | undefined {
  const first = getModule(id)?.prerequisites[0];
  return first ? getModule(first) : undefined;
}
