// Map/Location Tracker Types for Adventure Visualization

import type { Encounter } from './index';

// ============================================================================
// Map Node Types
// ============================================================================

/**
 * Visual state of a map node
 */
export type MapNodeState =
    | 'current'    // Player is currently at this location
    | 'visited'    // Player has been here before
    | 'available'  // Player can travel here from current location
    | 'locked'     // Requirements not met (e.g., requiresVisitedEncounterId)
    | 'hidden';    // Not yet discovered

/**
 * A single node on the adventure map
 */
export interface MapNode {
    id: string;
    title: string;
    type: Encounter['type'];
    state: MapNodeState;
    position: {
        x: number;
        y: number;
    };
    connections: string[]; // IDs of nodes this connects to
    isRepeatable?: boolean;
    encounterData?: Encounter; // Reference to original encounter
}

/**
 * A connection between two map nodes
 */
export interface MapConnection {
    from: string;
    to: string;
    label?: string;
    isBidirectional?: boolean;
}

/**
 * Complete map layout for an adventure
 */
export interface MapLayout {
    nodes: MapNode[];
    connections: MapConnection[];
    width: number;
    height: number;
    centerX: number;
    centerY: number;
}

/**
 * Map display configuration
 */
export interface MapConfig {
    nodeRadius: number;
    nodeSpacingX: number;
    nodeSpacingY: number;
    showLabels: boolean;
    showConnections: boolean;
    animateTransitions: boolean;
}

export const DEFAULT_MAP_CONFIG: MapConfig = {
    nodeRadius: 24,
    nodeSpacingX: 150,
    nodeSpacingY: 100,
    showLabels: true,
    showConnections: true,
    animateTransitions: true,
};

// Node colors by state
export const NODE_COLORS: Record<MapNodeState, { fill: string; stroke: string; text: string }> = {
    current: {
        fill: 'rgb(234, 179, 8)',      // fantasy-gold
        stroke: 'rgb(253, 224, 71)',   // lighter gold
        text: 'rgb(0, 0, 0)'           // black text
    },
    visited: {
        fill: 'rgba(139, 92, 246, 0.4)', // fantasy-purple dimmed
        stroke: 'rgb(139, 92, 246)',     // fantasy-purple
        text: 'rgb(200, 200, 200)'       // light gray text
    },
    available: {
        fill: 'rgb(34, 197, 94)',      // green
        stroke: 'rgb(74, 222, 128)',   // lighter green
        text: 'rgb(255, 255, 255)'     // white text
    },
    locked: {
        fill: 'rgba(100, 100, 100, 0.3)', // gray dimmed
        stroke: 'rgb(100, 100, 100)',     // gray
        text: 'rgb(120, 120, 120)'        // dim gray text
    },
    hidden: {
        fill: 'transparent',
        stroke: 'rgba(100, 100, 100, 0.2)',
        text: 'transparent'
    },
};

// Node icons by encounter type
export const NODE_ICONS: Record<Encounter['type'], string> = {
    combat: '⚔️',
    skill: '🎯',
    social: '💬',
    exploration: '🔍',
    tutorial: '📖',
};
