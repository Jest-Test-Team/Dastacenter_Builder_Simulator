import { describe, expect, it } from 'vitest';
import {
  COMPETENCY_QUESTIONS,
  DEPENDENCY_RELATIONS,
  ENTITY_TYPES,
  ENTITY_TYPE_NAMES,
  EVENT_TYPES,
  EVENT_TYPE_NAMES,
  MODELING_DECISIONS,
  NODE_TYPE_NAMES,
  RELATION_TYPES,
  RELATION_TYPE_NAMES,
  SYMMETRIC_RELATIONS,
  checkEdgeTypes,
  isEntityType,
  isEventType,
  isNodeType,
  isRelationType,
} from '@/lib/kg/ontology';

/** Relation names that describe nothing. An ontology containing these is a word cloud with arrows. */
const VAGUE_VERBS = [
  'RELATED_TO',
  'HAS_LINK',
  'LINKED_TO',
  'ASSOCIATED_WITH',
  'CONNECTED',
  'REFERENCES',
  'HAS',
  'IS',
];

describe('ontology: shape', () => {
  it('stays inside the recommended size envelope', () => {
    expect(ENTITY_TYPE_NAMES.length).toBeGreaterThanOrEqual(5);
    expect(ENTITY_TYPE_NAMES.length).toBeLessThanOrEqual(15);
    expect(RELATION_TYPE_NAMES.length).toBeGreaterThanOrEqual(10);
    expect(RELATION_TYPE_NAMES.length).toBeLessThanOrEqual(30);
  });

  it('has no name collision between entity and event types', () => {
    const overlap = ENTITY_TYPE_NAMES.filter((name) => (EVENT_TYPE_NAMES as string[]).includes(name));
    expect(overlap).toEqual([]);
    expect(NODE_TYPE_NAMES.length).toBe(ENTITY_TYPE_NAMES.length + EVENT_TYPE_NAMES.length);
  });
});

describe('ontology: entity definitions', () => {
  it.each(ENTITY_TYPE_NAMES)('%s declares a definition, an identity rule and examples', (name) => {
    const def = ENTITY_TYPES[name];
    expect(def.desc.length).toBeGreaterThan(10);
    expect(def.identity.length).toBeGreaterThan(0);
    expect(def.attributes.length).toBeGreaterThan(0);
    expect(def.examples.length).toBeGreaterThan(0);
  });
});

describe('ontology: relation definitions', () => {
  it.each(RELATION_TYPE_NAMES)('%s declares a domain and range that are real node types', (name) => {
    const def = RELATION_TYPES[name];
    expect(def.desc.length).toBeGreaterThan(10);
    expect(isNodeType(def.domain)).toBe(true);
    expect(isNodeType(def.range)).toBe(true);
  });

  it('uses precise verbs everywhere', () => {
    const offenders = RELATION_TYPE_NAMES.filter((name) => VAGUE_VERBS.includes(name));
    expect(offenders).toEqual([]);
  });

  it('names every relation in SCREAMING_SNAKE_CASE', () => {
    for (const name of RELATION_TYPE_NAMES) expect(name).toMatch(/^[A-Z]+(_[A-Z]+)*$/);
  });

  it('marks the dependency and symmetric relations that traversal code relies on', () => {
    expect(DEPENDENCY_RELATIONS).toContain('POWERS');
    expect(DEPENDENCY_RELATIONS).toContain('COOLS');
    expect(SYMMETRIC_RELATIONS).toEqual(['ADJACENT_TO']);
  });

  it('gives every event type at least one relation to point at its participants', () => {
    for (const name of EVENT_TYPE_NAMES) {
      const def = EVENT_TYPES[name];
      expect(def.edges.length).toBeGreaterThan(0);
      expect(def.args.length).toBeGreaterThan(0);
      expect(def.trigger.length).toBeGreaterThan(0);
      for (const relation of def.edges) {
        expect(isRelationType(relation)).toBe(true);
        // An event's own edges must originate at the event.
        expect(RELATION_TYPES[relation].domain).toBe(name);
      }
    }
  });

  it('leaves no node type stranded — every type participates in a relation', () => {
    const used = new Set<string>();
    for (const name of RELATION_TYPE_NAMES) {
      used.add(RELATION_TYPES[name].domain);
      used.add(RELATION_TYPES[name].range);
    }
    const stranded = NODE_TYPE_NAMES.filter((name) => !used.has(name));
    expect(stranded).toEqual([]);
  });
});

describe('ontology: type guards', () => {
  it('recognises declared types and rejects undeclared ones', () => {
    expect(isEntityType('Asset')).toBe(true);
    expect(isEntityType('ScoreEvaluated')).toBe(false);
    expect(isEventType('ScoreEvaluated')).toBe(true);
    expect(isRelationType('POWERS')).toBe(true);
    expect(isRelationType('RELATED_TO')).toBe(false);
  });

  it('does not treat inherited Object properties as declared types', () => {
    expect(isEntityType('toString')).toBe(false);
    expect(isRelationType('constructor')).toBe(false);
  });
});

describe('ontology: checkEdgeTypes', () => {
  it('accepts an edge whose endpoints match domain and range', () => {
    expect(checkEdgeTypes('LOCATED_IN', 'Asset', 'Space')).toBeNull();
    expect(checkEdgeTypes('POWERS', 'Asset', 'Asset')).toBeNull();
  });

  it('rejects an unknown relation', () => {
    expect(checkEdgeTypes('RELATED_TO', 'Asset', 'Space')).toMatch(/unknown relation/);
  });

  it('rejects a domain violation', () => {
    expect(checkEdgeTypes('LOCATED_IN', 'Space', 'Space')).toMatch(/requires domain Asset/);
  });

  it('rejects a range violation', () => {
    expect(checkEdgeTypes('LOCATED_IN', 'Asset', 'AssetType')).toMatch(/requires range Space/);
  });

  it('rejects a reversed edge that would otherwise look plausible', () => {
    expect(checkEdgeTypes('HAS_PORT', 'Port', 'NetworkDevice')).not.toBeNull();
  });
});

describe('ontology: competency questions', () => {
  it('declares at least ten, each uniquely identified', () => {
    expect(COMPETENCY_QUESTIONS.length).toBeGreaterThanOrEqual(10);
    const ids = COMPETENCY_QUESTIONS.map((cq) => cq.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('phrases every question as a question and pairs it with a traversal', () => {
    for (const cq of COMPETENCY_QUESTIONS) {
      expect(cq.question).toMatch(/\?$/);
      expect(cq.traversal.length).toBeGreaterThan(0);
      expect(cq.hops).toBeGreaterThanOrEqual(1);
    }
  });

  it('only names relations the ontology declares', () => {
    for (const cq of COMPETENCY_QUESTIONS) {
      const mentioned = cq.traversal.match(/[A-Z]+(?:_[A-Z]+)+/g) ?? [];
      for (const token of mentioned) {
        expect(
          isRelationType(token),
          `${cq.id} references undeclared relation ${token}`,
        ).toBe(true);
      }
    }
  });

  it('covers every plane of the model', () => {
    const all = COMPETENCY_QUESTIONS.map((cq) => cq.traversal).join(' ');
    for (const relation of ['CONTAINS', 'POWERS', 'COOLS', 'TERMINATES', 'CITES_STANDARD'])
      expect(all).toContain(relation);
  });
});

describe('ontology: recorded decisions', () => {
  it('documents each defensible-alternative decision with its reasoning', () => {
    expect(MODELING_DECISIONS.length).toBeGreaterThanOrEqual(3);
    for (const entry of MODELING_DECISIONS) {
      expect(entry.decision.length).toBeGreaterThan(20);
      expect(entry.why.length).toBeGreaterThan(40);
    }
  });
});
