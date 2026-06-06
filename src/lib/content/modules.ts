/**
 * Learning modules catalog.
 *
 * Each module maps to one or more scenarios. Modules are pure data
 * (MDX-ready) and validated by Zod on load.
 */

import { z } from 'zod';

export const ModuleLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export type ModuleLevel = z.infer<typeof ModuleLevelSchema>;

export const LessonStepSchema = z.object({
  title: z.string(),
  body: z.string(), // MDX or markdown
});
export type LessonStep = z.infer<typeof LessonStepSchema>;

export const ModuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  level: ModuleLevelSchema,
  estMinutes: z.number().int().positive(),
  prerequisites: z.array(z.string()).default([]),
  standards: z.array(z.string()).default([]),
  learningObjectives: z.array(z.string()).default([]),
  lessons: z.array(LessonStepSchema).default([]),
  scenarioId: z.string().optional(),
});
export type Module = z.infer<typeof ModuleSchema>;

export const modules: Module[] = [
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
];

export function getModule(id: string): Module | undefined {
  return modules.find((m) => m.id === id);
}
