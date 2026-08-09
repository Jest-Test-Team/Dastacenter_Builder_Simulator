# Enterprise SDN and spatial modeling

The builder includes a synchronized facility and network model. Open a build and select **Network** to launch the SDN workspace.

## Spatial hierarchy

Network assets can be assigned to a `site → building → floor → room → hall → rack` hierarchy. Every space has metric bounds and independent visibility. Floor, room, and hall bounds appear in the 3D scene; the Spaces tab controls them and can create racks.

## Nodes, ports, and links

Connections are first-class saved entities. A node contains typed physical/logical ports and an optional management address/controller. A link references exact source and target ports and stores medium, bandwidth, redundancy group, VLANs, VRF, VXLAN VNI, security zone, state, and optional routed 3D points.

The Topology tab is synchronized with the 3D scene: selecting either representation selects the same node; adding nodes or links updates both views; clicking a topology link toggles it for failure testing.

Use **Load reference fabric** to add a controller, edge firewall, dual spines, dual leaves, two servers, redundant paths, a segmentation policy, and an SDN intent.

## Logical overlays

The Overlays tab switches 3D link colors between physical, VLAN, VRF, VXLAN, and security views. It summarizes configured identifiers and policies. Policies record source/destination zones, action, protocol, destination port, priority, and enabled state.

## Path and failure simulation

The Paths tab performs path discovery over enabled links, reports bottleneck capacity, and searches for a link-disjoint backup. Highlighted paths appear in 3D. Links can be failed and restored; discovery reroutes or reports lost connectivity.

## SDN controller workflow

An intent names its controller, endpoints, minimum bandwidth, and redundancy requirement. **Validate** checks connectivity, bottleneck capacity, and a link-disjoint backup. **Deploy intent** records `deployed` only after successful validation. The same tab detects missing spaces, disconnected nodes, missing nodes, and missing ports.

## Persistence and compatibility

The network graph is part of `BuildSnapshot`, IndexedDB autosave, JSON export/import, share decoding, and undo history. Older builds without a graph load with the default hierarchy. Empty default graphs are omitted from compact URL shares to retain the existing URL-size limit.

## Verification

```sh
npm test -- --run tests/unit/network-topology.test.ts tests/unit/persistence.test.ts tests/unit/share.test.ts
npm run typecheck
npm run build:next
```

## Related

The network plane described here is one source for the facility knowledge graph: nodes, ports, links,
policies and intents are extracted into typed graph entities, and the spatial hierarchy becomes the
`Space` containment tree. See [KNOWLEDGE_GRAPH.md](KNOWLEDGE_GRAPH.md). Note that fusion merges the
legacy `room-network` and `hall-a` aliases described above into their `main-floor-*` equivalents, so
graph queries see one space where the default hierarchy ships two.
