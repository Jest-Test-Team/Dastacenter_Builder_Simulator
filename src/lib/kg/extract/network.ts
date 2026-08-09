/**
 * Network extractor (stage 5) — the logical plane.
 *
 * Source: `BuildState.network` (nodes, links, policies, intents). This is a
 * straight mapping of an existing graph into the ontology's vocabulary; the one
 * structural change is that a NetworkLink becomes a first-class Link node with
 * two `Port -TERMINATES-> Link` edges rather than a single device-to-device
 * edge, so that a LinkFailed event has something to point at.
 */

import type { BuildState } from '@/lib/blocks';
import { emptyExtraction, type ExtractionResult } from '../types';
import { canonicalZone, makeEdge, makeNode, nodeId, provenance, type ExtractContext } from './common';

const EXTRACTOR = 'network';

export function extractNetwork(state: BuildState, ctx: ExtractContext): ExtractionResult {
  const result = emptyExtraction();
  const network = state.network;
  if (!network) return result;

  const zones = new Set<string>();
  const declareZone = (raw: string, source: string) => {
    const zone = canonicalZone(raw);
    if (!zone || zones.has(zone)) return zone;
    zones.add(zone);
    result.nodes.push(
      makeNode('SecurityZone', zone, zone, { name: zone }, provenance(EXTRACTOR, source, ctx)),
    );
    return zone;
  };

  for (const device of Object.values(network.nodes)) {
    const source = `network/nodes/${device.id}`;
    const prov = provenance(EXTRACTOR, source, ctx);
    const self = nodeId('NetworkDevice', device.id);
    result.nodes.push(
      makeNode(
        'NetworkDevice',
        device.id,
        device.name.trim(),
        { kind: device.kind, managementIp: device.managementIp, position: device.position },
        prov,
      ),
    );

    if (network.spaces[device.spaceId])
      result.edges.push(makeEdge('HOSTED_IN', self, nodeId('Space', device.spaceId), prov));

    // The network plane and the physical plane are joined here. Without this
    // edge, "which rack backs this switch" is unanswerable.
    if (device.blockInstanceId && state.voxels[device.blockInstanceId])
      result.edges.push(
        makeEdge('REALIZED_BY', self, nodeId('Asset', device.blockInstanceId), prov),
      );

    if (device.controllerId && network.nodes[device.controllerId])
      result.edges.push(
        makeEdge('CONTROLS', nodeId('NetworkDevice', device.controllerId), self, prov),
      );

    for (const port of device.ports) {
      result.nodes.push(
        makeNode(
          'Port',
          port.id,
          port.name,
          { kind: port.kind, speedGbps: port.speedGbps, adminUp: port.adminUp },
          provenance(EXTRACTOR, `${source}/ports/${port.id}`, ctx),
        ),
      );
      result.edges.push(makeEdge('HAS_PORT', self, nodeId('Port', port.id), prov));
    }
  }

  for (const link of Object.values(network.links)) {
    const source = `network/links/${link.id}`;
    const prov = provenance(EXTRACTOR, source, ctx);
    const self = nodeId('Link', link.id);
    result.nodes.push(
      makeNode(
        'Link',
        link.id,
        link.id,
        {
          medium: link.medium,
          bandwidthGbps: link.bandwidthGbps,
          vlanIds: link.vlanIds,
          vrf: link.vrf,
          vxlanVni: link.vxlanVni,
          redundancyGroup: link.redundancyGroup,
          enabled: link.enabled,
        },
        prov,
      ),
    );

    // Only terminate on ports that actually exist; a dangling endpoint is left
    // for the quality gate to report rather than quietly invented here.
    for (const portId of [link.sourcePortId, link.targetPortId]) {
      const owner = Object.values(network.nodes).find((device) =>
        device.ports.some((port) => port.id === portId),
      );
      if (!owner) continue;
      result.edges.push(makeEdge('TERMINATES', nodeId('Port', portId), self, prov));
    }

    if (link.securityZone) {
      const zone = declareZone(link.securityZone, source);
      const device = network.nodes[link.sourceNodeId];
      if (device && zone)
        result.edges.push(
          makeEdge('IN_ZONE', nodeId('NetworkDevice', device.id), nodeId('SecurityZone', zone), prov),
        );
    }
  }

  for (const policy of Object.values(network.policies)) {
    const source = `network/policies/${policy.id}`;
    const prov = provenance(EXTRACTOR, source, ctx);
    const self = nodeId('SegmentationRule', policy.id);
    result.nodes.push(
      makeNode(
        'SegmentationRule',
        policy.id,
        policy.name.trim(),
        {
          action: policy.action,
          protocol: policy.protocol,
          destinationPort: policy.destinationPort,
          priority: policy.priority,
          enabled: policy.enabled,
        },
        prov,
      ),
    );
    const from = declareZone(policy.sourceZone, source);
    const to = declareZone(policy.destinationZone, source);
    if (from) result.edges.push(makeEdge('APPLIES_FROM', self, nodeId('SecurityZone', from), prov));
    if (to) result.edges.push(makeEdge('APPLIES_TO', self, nodeId('SecurityZone', to), prov));
  }

  for (const intent of Object.values(network.intents)) {
    const source = `network/intents/${intent.id}`;
    const prov = provenance(EXTRACTOR, source, ctx);
    const self = nodeId('Intent', intent.id);
    result.nodes.push(
      makeNode(
        'Intent',
        intent.id,
        intent.name.trim(),
        {
          requiredBandwidthGbps: intent.requiredBandwidthGbps,
          requireRedundancy: intent.requireRedundancy,
          status: intent.status,
          lastMessage: intent.lastMessage,
        },
        prov,
      ),
    );
    if (network.nodes[intent.sourceNodeId])
      result.edges.push(
        makeEdge('ORIGINATES_AT', self, nodeId('NetworkDevice', intent.sourceNodeId), prov),
      );
    if (network.nodes[intent.destinationNodeId])
      result.edges.push(
        makeEdge('TERMINATES_AT', self, nodeId('NetworkDevice', intent.destinationNodeId), prov),
      );
  }

  return result;
}
