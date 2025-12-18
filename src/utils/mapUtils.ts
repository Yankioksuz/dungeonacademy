// Map Utilities for Adventure Visualization
// Builds and manages the map graph from encounters

import type { Encounter } from '@/types';
import type { MapNode, MapConnection, MapLayout, MapNodeState } from '@/types/mapTypes';
import { DEFAULT_MAP_CONFIG } from '@/types/mapTypes';

/**
 * Extract all connections from an encounter's options
 */
function getEncounterConnections(encounter: Encounter): string[] {
    const connections = new Set<string>();

    if (encounter.options && Array.isArray(encounter.options)) {
        for (const option of encounter.options) {
            // Standard next encounter
            if (option.nextEncounterId && option.nextEncounterId !== encounter.id) {
                connections.add(option.nextEncounterId);
            }
            // Success/failure branching
            if (option.successNextEncounterId) {
                connections.add(option.successNextEncounterId);
            }
            if (option.failureNextEncounterId) {
                connections.add(option.failureNextEncounterId);
            }
            // First time vs repeat
            if (option.firstTimeEncounterId) {
                connections.add(option.firstTimeEncounterId);
            }
        }
    }

    // Also check for direct skill check transitions on the encounter itself
    if (encounter.skillCheck) {
        if (encounter.skillCheck.successNextEncounterId) {
            connections.add(encounter.skillCheck.successNextEncounterId);
        }
        if (encounter.skillCheck.failureNextEncounterId) {
            connections.add(encounter.skillCheck.failureNextEncounterId);
        }
    }

    return Array.from(connections);
}

/**
 * Determine the visual state of a map node
 * Implements fog of war: only show nodes that are current, visited, or adjacent to a visited node
 */
export function getNodeState(
    encounterId: string,
    currentEncounterId: string,
    visitedEncounterIds: string[],
    availableFromCurrent: string[],
    allAdjacentToVisited: Set<string> = new Set()
): MapNodeState {
    if (encounterId === currentEncounterId) {
        return 'current';
    }
    if (visitedEncounterIds.includes(encounterId)) {
        return 'visited';
    }
    if (availableFromCurrent.includes(encounterId)) {
        return 'available';
    }
    // Fog of war: if this node is adjacent to any visited node, show as locked
    // Otherwise, hide it completely
    if (allAdjacentToVisited.has(encounterId)) {
        return 'locked';
    }
    // Hidden - not yet discovered
    return 'hidden';
}

/**
 * Calculate positions for map nodes
 * Uses mapPosition from encounters if available, otherwise falls back to BFS-based auto-layout
 */
function calculateNodePositions(
    encounters: Encounter[],
    startId: string,
    config: typeof DEFAULT_MAP_CONFIG
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    // First, check if any encounters have manual positions
    const hasManualPositions = encounters.some(enc => enc.mapPosition);

    // If manual positions exist, use them (with fallback for missing ones)
    if (hasManualPositions) {
        // Use manual positions where available
        for (const enc of encounters) {
            if (enc.mapPosition) {
                positions.set(enc.id, { x: enc.mapPosition.x, y: enc.mapPosition.y });
            }
        }

        // For encounters without positions, place them relative to connected nodes
        const unpositioned = encounters.filter(enc => !enc.mapPosition);
        const padding = 60;
        let fallbackY = padding;

        for (const enc of unpositioned) {
            // Try to find a connected node that has a position
            const connections = getEncounterConnections(enc);
            let foundPos = false;

            for (const connId of connections) {
                const connPos = positions.get(connId);
                if (connPos) {
                    // Place below and slightly offset from connected node
                    positions.set(enc.id, {
                        x: connPos.x + config.nodeSpacingX * 0.5,
                        y: connPos.y + config.nodeSpacingY
                    });
                    foundPos = true;
                    break;
                }
            }

            if (!foundPos) {
                // Fallback: place in a column on the right
                positions.set(enc.id, { x: 500, y: fallbackY });
                fallbackY += config.nodeSpacingY;
            }
        }

        return positions;
    }

    // No manual positions - use BFS-based auto-layout
    const visited = new Set<string>();
    const layers: string[][] = [];

    // Build adjacency map
    const adjacency = new Map<string, string[]>();
    for (const enc of encounters) {
        adjacency.set(enc.id, getEncounterConnections(enc));
    }

    // BFS to assign layers
    const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];
    visited.add(startId);

    while (queue.length > 0) {
        const { id, depth } = queue.shift()!;

        // Ensure layer exists
        while (layers.length <= depth) {
            layers.push([]);
        }
        layers[depth].push(id);

        // Add children
        const children = adjacency.get(id) || [];
        for (const childId of children) {
            if (!visited.has(childId)) {
                visited.add(childId);
                queue.push({ id: childId, depth: depth + 1 });
            }
        }
    }

    // Add any unvisited nodes (disconnected) to the last layer
    for (const enc of encounters) {
        if (!visited.has(enc.id)) {
            if (layers.length === 0) {
                layers.push([]);
            }
            layers[layers.length - 1].push(enc.id);
        }
    }

    // Calculate positions based on layers
    const padding = 80; // Start at 2 grid units
    const gridSize = 40; // Match the SVG grid pattern

    // Helper to snap to grid
    const snapToGrid = (value: number) => Math.round(value / gridSize) * gridSize;

    for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
        const layer = layers[layerIdx];
        // Snap Y to grid, with spacing of 3 grid units between layers
        const y = snapToGrid(padding + layerIdx * gridSize * 3);

        // Center nodes horizontally within the layer, snap to grid
        const startX = snapToGrid(padding + (layer.length > 1 ? 0 : gridSize * 2));

        for (let nodeIdx = 0; nodeIdx < layer.length; nodeIdx++) {
            // Snap X to grid, with spacing of 4 grid units between nodes
            const x = snapToGrid(startX + nodeIdx * gridSize * 4);
            positions.set(layer[nodeIdx], { x, y });
        }
    }

    return positions;
}

/**
 * Build a complete map layout from adventure encounters
 */
export function buildMapFromEncounters(
    encounters: Encounter[],
    currentEncounterId: string,
    visitedEncounterIds: string[] = [],
    config: typeof DEFAULT_MAP_CONFIG = {
        nodeRadius: 24,
        nodeSpacingX: 150,
        nodeSpacingY: 100,
        showLabels: true,
        showConnections: true,
        animateTransitions: true,
    }
): MapLayout {
    if (encounters.length === 0) {
        return { nodes: [], connections: [], width: 0, height: 0, centerX: 0, centerY: 0 };
    }

    // Find the starting encounter (first one, or "intro" if exists)
    const startEncounter = encounters.find(e => e.id === 'intro') || encounters[0];

    // Get connections from current encounter
    const currentEncounter = encounters.find(e => e.id === currentEncounterId);
    const availableFromCurrent = currentEncounter ? getEncounterConnections(currentEncounter) : [];

    // Build adjacency map for all encounters
    const adjacencyMap = new Map<string, string[]>();
    for (const enc of encounters) {
        adjacencyMap.set(enc.id, getEncounterConnections(enc));
    }

    // Fog of war: Calculate all nodes that are adjacent to any visited node (including current)
    // These nodes will be shown as "locked" if not directly available
    const allVisited = new Set([...visitedEncounterIds, currentEncounterId]);
    const allAdjacentToVisited = new Set<string>();
    for (const visitedId of allVisited) {
        const adjacent = adjacencyMap.get(visitedId) || [];
        for (const adjId of adjacent) {
            if (!allVisited.has(adjId)) {
                allAdjacentToVisited.add(adjId);
            }
        }
    }

    // Calculate positions
    const positions = calculateNodePositions(encounters, startEncounter.id, config);

    // Build nodes
    const nodes: MapNode[] = encounters.map(encounter => {
        const pos = positions.get(encounter.id) || { x: 0, y: 0 };
        return {
            id: encounter.id,
            title: encounter.title,
            type: encounter.type,
            state: getNodeState(encounter.id, currentEncounterId, visitedEncounterIds, availableFromCurrent, allAdjacentToVisited),
            position: pos,
            connections: getEncounterConnections(encounter),
            isRepeatable: encounter.repeatable,
            encounterData: encounter,
        };
    });

    // Build connections
    const connectionSet = new Set<string>();
    const connections: MapConnection[] = [];

    for (const node of nodes) {
        for (const targetId of node.connections) {
            // Create unique key for connection (sorted to avoid duplicates)
            const key = [node.id, targetId].sort().join('->');
            if (!connectionSet.has(key)) {
                connectionSet.add(key);
                connections.push({
                    from: node.id,
                    to: targetId,
                    isBidirectional: false,
                });
            }
        }
    }

    // Calculate bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const node of nodes) {
        minX = Math.min(minX, node.position.x);
        maxX = Math.max(maxX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxY = Math.max(maxY, node.position.y);
    }

    const padding = config.nodeRadius * 3;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    return {
        nodes,
        connections,
        width: Math.max(width, 400),
        height: Math.max(height, 300),
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
    };
}

/**
 * Get nodes that are available to travel to from the current node
 */
export function getAvailableNodes(
    currentNodeId: string,
    nodes: MapNode[]
): MapNode[] {
    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (!currentNode) return [];

    return nodes.filter(n => currentNode.connections.includes(n.id));
}

/**
 * Get the path from start to a target node (for highlighting)
 */
export function findPathToNode(
    startId: string,
    targetId: string,
    nodes: MapNode[]
): string[] {
    const visited = new Set<string>();
    const queue: { id: string; path: string[] }[] = [{ id: startId, path: [startId] }];

    while (queue.length > 0) {
        const { id, path } = queue.shift()!;

        if (id === targetId) {
            return path;
        }

        if (visited.has(id)) continue;
        visited.add(id);

        const node = nodes.find(n => n.id === id);
        if (!node) continue;

        for (const connId of node.connections) {
            if (!visited.has(connId)) {
                queue.push({ id: connId, path: [...path, connId] });
            }
        }
    }

    return []; // No path found
}
