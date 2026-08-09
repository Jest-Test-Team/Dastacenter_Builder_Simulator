/**
 * Facility knowledge graph — ontology (pipeline stage 3).
 *
 * This file is the single source of truth for the graph's schema. Extractors,
 * the quality gate, the fusion pass, and the Graph tab UI all read these same
 * objects; nothing downstream may invent a type or a relation that is not
 * declared here.
 *
 * Two rules from the source discipline are enforced structurally:
 *  - every relation names a precise verb (`POWERS`, never `RELATED_TO`), and
 *  - every relation declares a domain and a range, so the gate can reject an
 *    edge whose endpoints are type-incompatible before it ever reaches the graph.
 *
 * Modeling decisions where two options were defensible are recorded at the
 * bottom of this file under MODELING_DECISIONS.
 */

/** Every entity type in the graph. */
export type EntityType =
  | 'Build'
  | 'Space'
  | 'Asset'
  | 'AssetType'
  | 'NetworkDevice'
  | 'Port'
  | 'Link'
  | 'SecurityZone'
  | 'SegmentationRule'
  | 'Intent'
  | 'PolicySetting'
  | 'Standard';

/** Event types. Events are first-class nodes, never flattened into edges. */
export type EventType = 'ScoreEvaluated' | 'IssueRaised' | 'LinkFailed' | 'IntentDeployed';

/** Any node label: an entity or an event. */
export type NodeType = EntityType | EventType;

/** Every relation type in the graph. */
export type RelationType =
  | 'PART_OF'
  | 'CONTAINS'
  | 'LOCATED_IN'
  | 'INSTANCE_OF'
  | 'POWERS'
  | 'COOLS'
  | 'ADJACENT_TO'
  | 'REALIZED_BY'
  | 'HOSTED_IN'
  | 'HAS_PORT'
  | 'TERMINATES'
  | 'CONTROLS'
  | 'IN_ZONE'
  | 'APPLIES_FROM'
  | 'APPLIES_TO'
  | 'ORIGINATES_AT'
  | 'TERMINATES_AT'
  | 'SCORED'
  | 'RAISED_IN'
  | 'VIOLATES'
  | 'CITES_STANDARD'
  | 'AFFECTS'
  | 'DEPLOYS'
  | 'SATISFIES';

export type Cardinality = '1:1' | '1:N' | 'N:1' | 'N:M';

export interface EntityTypeDef {
  /** One-line definition. */
  desc: string;
  /**
   * What uniquely identifies an instance, and the canonical form fusion
   * (stage 8) will enforce when it merges duplicates.
   */
  identity: string;
  /** Attributes that matter for querying. Not an exhaustive property list. */
  attributes: readonly string[];
  /** Real examples drawn from this project, not generic ones. */
  examples: readonly string[];
}

export interface RelationTypeDef {
  desc: string;
  domain: NodeType;
  range: NodeType;
  cardinality: Cardinality;
  /** True when (a)->(b) implies (b)->(a); the gate materializes both directions. */
  symmetric?: boolean;
  /**
   * True when the relation is a dependency edge: if the range node fails, the
   * domain node is impaired. `impactOf()` walks exactly these, in reverse.
   */
  dependency?: boolean;
}

export interface EventTypeDef {
  desc: string;
  /** What in the source data signals this event occurred. */
  trigger: string;
  /** Typed arguments carried as node attributes. */
  args: readonly string[];
  /** Relations this event uses to point at its participants. */
  edges: readonly RelationType[];
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export const ENTITY_TYPES: Record<EntityType, EntityTypeDef> = {
  Build: {
    desc: 'One saved data center design; the root every other node hangs from.',
    identity: 'buildId',
    attributes: ['buildId', 'name', 'scenarioId', 'updatedAt'],
    examples: ['demo-hyperscale', 'free'],
  },
  Space: {
    desc: 'A physical container in the site hierarchy: site, building, floor, room, hall, or rack.',
    identity: 'SpatialUnit.id; canonical name is the trimmed display name, case preserved',
    attributes: ['kind', 'name', 'floorLevel', 'bounds', 'visible'],
    examples: ['site-main', 'building-a', 'main-floor', 'main-floor-hall'],
  },
  Asset: {
    desc: 'A block instance physically placed in the world at a grid cell.',
    identity: 'BlockInstance.id',
    attributes: ['typeId', 'position', 'rotation', 'powerDraw', 'heatLoad'],
    examples: ['a placed server_rack', 'a placed ups'],
  },
  AssetType: {
    desc: 'A catalog entry from the block registry; the class an Asset instantiates.',
    identity: 'BlockDef.id',
    attributes: ['category', 'displayName', 'powerDraw', 'heatLoad', 'tierRole', 'standards'],
    examples: ['server_rack', 'crac', 'ups', 'generator'],
  },
  NetworkDevice: {
    desc: 'A node in the network plane: controller, router, firewall, spine, leaf, switch, server.',
    identity: 'NetworkNode.id',
    attributes: ['kind', 'name', 'managementIp', 'position'],
    examples: ['sdn-controller-1', 'spine-a', 'leaf-1'],
  },
  Port: {
    desc: 'A physical or logical interface on a NetworkDevice; the endpoint a Link attaches to.',
    identity: 'NetworkPort.id, which is already namespaced by its device id',
    attributes: ['kind', 'speedGbps', 'adminUp'],
    examples: ['spine-a-p0', 'leaf-1-p2'],
  },
  Link: {
    desc: 'A cable or logical adjacency joining two ports; fails and recovers independently.',
    identity: 'NetworkLink.id',
    attributes: ['medium', 'bandwidthGbps', 'vlanIds', 'vrf', 'vxlanVni', 'redundancyGroup', 'enabled'],
    examples: ['link-spine-a-leaf-1'],
  },
  SecurityZone: {
    desc: 'A named trust boundary that devices sit in and segmentation rules reference.',
    identity: 'zone name, lowercased and trimmed',
    attributes: ['name'],
    examples: ['dmz', 'trusted', 'management'],
  },
  SegmentationRule: {
    desc: 'An allow/deny rule between two security zones.',
    identity: 'NetworkPolicy.id',
    attributes: ['action', 'protocol', 'destinationPort', 'priority', 'enabled'],
    examples: ['deny dmz -> management'],
  },
  Intent: {
    desc: 'An SDN controller intent: a required path between two devices with capacity and redundancy demands.',
    identity: 'ControllerIntent.id',
    attributes: ['requiredBandwidthGbps', 'requireRedundancy', 'status'],
    examples: ['east-west 100G redundant'],
  },
  PolicySetting: {
    desc: 'A non-spatial governance toggle or value from the policy plane (deterrence, ESG, privacy).',
    identity: 'PolicyKey',
    attributes: ['key', 'value', 'group'],
    examples: ['physical.guard_patrols', 'esg.renewable_percent'],
  },
  Standard: {
    desc: 'An external standard a rule cites or a policy satisfies.',
    identity: 'standard code, uppercased (the rule-id prefix)',
    attributes: ['code'],
    examples: ['UPTIME', 'TIA-942', 'ASHRAE', 'NFPA', 'ISO27'],
  },
};

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const RELATION_TYPES: Record<RelationType, RelationTypeDef> = {
  PART_OF: {
    desc: 'A top-level space belongs to a build.',
    domain: 'Space',
    range: 'Build',
    cardinality: 'N:1',
  },
  CONTAINS: {
    desc: 'A space directly encloses a smaller space.',
    domain: 'Space',
    range: 'Space',
    cardinality: '1:N',
  },
  LOCATED_IN: {
    desc: 'An asset physically sits inside a space.',
    domain: 'Asset',
    range: 'Space',
    cardinality: 'N:1',
  },
  INSTANCE_OF: {
    desc: 'An asset is an instance of a catalog asset type.',
    domain: 'Asset',
    range: 'AssetType',
    cardinality: 'N:1',
  },
  POWERS: {
    desc: 'The domain asset supplies electrical power to the range asset.',
    domain: 'Asset',
    range: 'Asset',
    cardinality: 'N:M',
    dependency: true,
  },
  COOLS: {
    desc: 'The domain asset removes heat from the range asset.',
    domain: 'Asset',
    range: 'Asset',
    cardinality: 'N:M',
    dependency: true,
  },
  ADJACENT_TO: {
    desc: 'Two assets occupy neighbouring cells; used by clearance and blast-radius queries.',
    domain: 'Asset',
    range: 'Asset',
    cardinality: 'N:M',
    symmetric: true,
  },
  REALIZED_BY: {
    desc: 'A network device is realized by a physical block instance in the world.',
    domain: 'NetworkDevice',
    range: 'Asset',
    cardinality: '1:1',
    dependency: true,
  },
  HOSTED_IN: {
    desc: 'A network device is assigned to a space.',
    domain: 'NetworkDevice',
    range: 'Space',
    cardinality: 'N:1',
  },
  HAS_PORT: {
    desc: 'A network device exposes a port.',
    domain: 'NetworkDevice',
    range: 'Port',
    cardinality: '1:N',
  },
  TERMINATES: {
    desc: 'A port is one of the two endpoints of a link.',
    domain: 'Port',
    range: 'Link',
    cardinality: 'N:1',
  },
  CONTROLS: {
    desc: 'An SDN controller manages a network device.',
    domain: 'NetworkDevice',
    range: 'NetworkDevice',
    cardinality: '1:N',
  },
  IN_ZONE: {
    desc: 'A network device sits inside a security zone.',
    domain: 'NetworkDevice',
    range: 'SecurityZone',
    cardinality: 'N:1',
  },
  APPLIES_FROM: {
    desc: 'A segmentation rule governs traffic originating in this zone.',
    domain: 'SegmentationRule',
    range: 'SecurityZone',
    cardinality: 'N:1',
  },
  APPLIES_TO: {
    desc: 'A segmentation rule governs traffic destined for this zone.',
    domain: 'SegmentationRule',
    range: 'SecurityZone',
    cardinality: 'N:1',
  },
  ORIGINATES_AT: {
    desc: 'An intent starts at this device.',
    domain: 'Intent',
    range: 'NetworkDevice',
    cardinality: 'N:1',
  },
  TERMINATES_AT: {
    desc: 'An intent ends at this device.',
    domain: 'Intent',
    range: 'NetworkDevice',
    cardinality: 'N:1',
  },
  SCORED: {
    desc: 'A scoring evaluation applies to a build.',
    domain: 'ScoreEvaluated',
    range: 'Build',
    cardinality: 'N:1',
  },
  RAISED_IN: {
    desc: 'An issue was raised against a build.',
    domain: 'IssueRaised',
    range: 'Build',
    cardinality: 'N:1',
  },
  VIOLATES: {
    desc: 'An issue implicates a specific asset. Never collapse this into an asset attribute.',
    domain: 'IssueRaised',
    range: 'Asset',
    cardinality: 'N:M',
  },
  CITES_STANDARD: {
    desc: 'An issue is raised under a named standard.',
    domain: 'IssueRaised',
    range: 'Standard',
    cardinality: 'N:1',
  },
  AFFECTS: {
    desc: 'A link-failure event took a link out of service.',
    domain: 'LinkFailed',
    range: 'Link',
    cardinality: 'N:1',
  },
  DEPLOYS: {
    desc: 'A deployment event pushed an intent to the fabric.',
    domain: 'IntentDeployed',
    range: 'Intent',
    cardinality: 'N:1',
  },
  SATISFIES: {
    desc: 'An enabled policy setting contributes to compliance with a standard.',
    domain: 'PolicySetting',
    range: 'Standard',
    cardinality: 'N:M',
  },
};

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export const EVENT_TYPES: Record<EventType, EventTypeDef> = {
  ScoreEvaluated: {
    desc: 'The rule pack was run against the build and produced a rating.',
    trigger: 'a call to score(state) in src/lib/scoring/engine.ts',
    args: ['score', 'competitionScore', 'tier', 'level', 'pue', 'wue', 'rulePackVersion', 'at'],
    edges: ['SCORED'],
  },
  IssueRaised: {
    desc: 'A scoring rule reported a compliance problem.',
    trigger: 'an Issue emitted by a rule in src/lib/scoring/rules',
    args: ['ruleId', 'severity', 'message', 'hint', 'at'],
    edges: ['RAISED_IN', 'VIOLATES', 'CITES_STANDARD'],
  },
  LinkFailed: {
    desc: 'A link was taken out of service, by simulation or by admin state.',
    trigger: 'NetworkLink.enabled === false',
    args: ['linkId', 'reason', 'at'],
    edges: ['AFFECTS'],
  },
  IntentDeployed: {
    desc: 'A controller intent passed validation and was deployed.',
    trigger: "ControllerIntent.status === 'deployed'",
    args: ['intentId', 'message', 'at'],
    edges: ['DEPLOYS'],
  },
};

// ---------------------------------------------------------------------------
// Competency questions — the ontology's spec AND its test suite
// ---------------------------------------------------------------------------

export interface CompetencyQuestion {
  id: string;
  question: string;
  /** The traversal that answers it, as a relation path over the schema. */
  traversal: string;
  /** Minimum hops. Every question here is multi-hop; that is why this is a graph. */
  hops: number;
}

export const COMPETENCY_QUESTIONS: readonly CompetencyQuestion[] = [
  {
    id: 'CQ01',
    question: 'Which assets sit inside a given data hall, including nested spaces?',
    traversal: 'Space -CONTAINS*-> Space <-LOCATED_IN- Asset',
    hops: 2,
  },
  {
    id: 'CQ02',
    question: 'Which racks lose power if a given UPS fails?',
    traversal: 'Asset(ups) -POWERS*-> Asset, filtered to AssetType server_rack',
    hops: 2,
  },
  {
    id: 'CQ03',
    question: 'What cools a given rack, and is there more than one such unit?',
    traversal: 'Asset(rack) <-COOLS- Asset -INSTANCE_OF-> AssetType',
    hops: 2,
  },
  {
    id: 'CQ04',
    question: 'Which floor hosts the SDN controller?',
    traversal: 'NetworkDevice -HOSTED_IN-> Space <-CONTAINS*- Space(kind=floor)',
    hops: 2,
  },
  {
    id: 'CQ05',
    question: 'Which network devices become unreachable if a given link fails?',
    traversal: 'Link <-TERMINATES- Port <-HAS_PORT- NetworkDevice, over the surviving link set',
    hops: 3,
  },
  {
    id: 'CQ06',
    question: 'Which physical asset backs a given network device, and where is it?',
    traversal: 'NetworkDevice -REALIZED_BY-> Asset -LOCATED_IN-> Space',
    hops: 2,
  },
  {
    id: 'CQ07',
    question: 'Which standards does this build currently violate?',
    traversal: 'Build <-RAISED_IN- IssueRaised -CITES_STANDARD-> Standard',
    hops: 2,
  },
  {
    id: 'CQ08',
    question: 'Which asset caused a given issue, what type is it, and where does it sit?',
    traversal: 'IssueRaised -VIOLATES-> Asset -INSTANCE_OF-> AssetType, and -LOCATED_IN-> Space',
    hops: 2,
  },
  {
    id: 'CQ09',
    question: 'Which security zones are permitted to reach a given zone?',
    traversal: 'SecurityZone <-APPLIES_TO- SegmentationRule(action=allow) -APPLIES_FROM-> SecurityZone',
    hops: 2,
  },
  {
    id: 'CQ10',
    question: 'Which devices does a controller manage, and in which spaces do they sit?',
    traversal: 'NetworkDevice(controller) -CONTROLS-> NetworkDevice -HOSTED_IN-> Space',
    hops: 2,
  },
  {
    id: 'CQ11',
    question: 'Which intents depend on a given device as an endpoint?',
    traversal: 'NetworkDevice <-ORIGINATES_AT|TERMINATES_AT- Intent',
    hops: 1,
  },
  {
    id: 'CQ12',
    question: 'Which policy settings would satisfy the standards this build is violating?',
    traversal:
      'Build <-RAISED_IN- IssueRaised -CITES_STANDARD-> Standard <-SATISFIES- PolicySetting',
    hops: 3,
  },
];

// ---------------------------------------------------------------------------
// Derived helpers — the gate and the extractors use these, never string literals
// ---------------------------------------------------------------------------

export const ENTITY_TYPE_NAMES = Object.keys(ENTITY_TYPES) as EntityType[];
export const EVENT_TYPE_NAMES = Object.keys(EVENT_TYPES) as EventType[];
export const RELATION_TYPE_NAMES = Object.keys(RELATION_TYPES) as RelationType[];
export const NODE_TYPE_NAMES: NodeType[] = [...ENTITY_TYPE_NAMES, ...EVENT_TYPE_NAMES];

export function isEntityType(value: string): value is EntityType {
  return Object.prototype.hasOwnProperty.call(ENTITY_TYPES, value);
}

export function isEventType(value: string): value is EventType {
  return Object.prototype.hasOwnProperty.call(EVENT_TYPES, value);
}

export function isNodeType(value: string): value is NodeType {
  return isEntityType(value) || isEventType(value);
}

export function isRelationType(value: string): value is RelationType {
  return Object.prototype.hasOwnProperty.call(RELATION_TYPES, value);
}

/** Relation types whose reverse closure defines operational impact. */
export const DEPENDENCY_RELATIONS: RelationType[] = RELATION_TYPE_NAMES.filter(
  (name) => RELATION_TYPES[name].dependency === true,
);

/** Relation types that must be materialized in both directions. */
export const SYMMETRIC_RELATIONS: RelationType[] = RELATION_TYPE_NAMES.filter(
  (name) => RELATION_TYPES[name].symmetric === true,
);

/**
 * Checks a proposed edge against the ontology. Returns null when valid, or the
 * reason it is rejected. This is the single validation the quality gate applies
 * to every edge — the one step that removes most malformed structure.
 */
export function checkEdgeTypes(
  relation: string,
  sourceType: string,
  targetType: string,
): string | null {
  if (!isRelationType(relation)) return `unknown relation type "${relation}"`;
  const def = RELATION_TYPES[relation];
  if (sourceType !== def.domain)
    return `${relation} requires domain ${def.domain}, got ${sourceType}`;
  if (targetType !== def.range) return `${relation} requires range ${def.range}, got ${targetType}`;
  return null;
}

/**
 * Modeling decisions where two options were defensible, and why this one won.
 * Recorded here rather than in a doc so the reasoning stays next to the schema.
 */
export const MODELING_DECISIONS: readonly { decision: string; why: string }[] = [
  {
    decision: 'Site, Building, Floor, Room, Hall and Rack are one `Space` type with a `kind` attribute, not six types.',
    why: 'They are always queried together — every containment question walks the whole chain — and the rule is to merge types that are never queried apart. The source data already carries the discriminator as SpatialUnit.kind, so nothing is lost.',
  },
  {
    decision: '`Link` is an entity with `Port -TERMINATES-> Link` edges, rather than a single device-to-device edge with properties.',
    why: 'A link has its own relationships and its own lifecycle: it carries VLANs, belongs to a redundancy group, and is failed and restored independently. A LinkFailed event needs something to point at, and an edge cannot be the target of an edge. The cost is that device-level paths are two hops longer.',
  },
  {
    decision: 'Scoring issues are `IssueRaised` events, not attributes on the assets they implicate.',
    why: 'One issue can implicate several assets and cite a standard; flattening it into per-asset attributes loses which issue tied which assets together, and loses the time anchor.',
  },
  {
    decision: 'No type hierarchy — the schema is flat.',
    why: 'Subclassing is only worth its extraction cost when queries span the parent type. None of the twelve competency questions do; every one names a concrete type.',
  },
  {
    decision: 'Power and cooling are separate relations (`POWERS`, `COOLS`) rather than one `SUPPLIES` with a medium attribute.',
    why: 'Precise verbs. Every real query asks about one or the other, and the failure semantics differ — losing power is immediate, losing cooling is a thermal ramp.',
  },
];
