// MiniMap Component - Compact corner map widget

import { useMemo } from 'react';
import { Map } from 'lucide-react';
import type { Encounter } from '@/types';
import type { MapLayout } from '@/types/mapTypes';
import { NODE_COLORS } from '@/types/mapTypes';
import { buildMapFromEncounters } from '@/utils/mapUtils';

interface MiniMapProps {
    encounters: Encounter[];
    currentEncounterId: string;
    visitedEncounterIds: string[];
    onClick: () => void;
}

export function MiniMap({
    encounters,
    currentEncounterId,
    visitedEncounterIds,
    onClick,
}: MiniMapProps) {
    // Build the map layout
    const layout: MapLayout = useMemo(() => {
        return buildMapFromEncounters(encounters, currentEncounterId, visitedEncounterIds);
    }, [encounters, currentEncounterId, visitedEncounterIds]);

    // Calculate scale to fit in mini view
    const miniWidth = 120;
    const miniHeight = 80;
    const padding = 10;

    // Find bounds
    const bounds = useMemo(() => {
        if (layout.nodes.length === 0) {
            return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
        }
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const node of layout.nodes) {
            minX = Math.min(minX, node.position.x);
            maxX = Math.max(maxX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxY = Math.max(maxY, node.position.y);
        }
        return { minX, maxX, minY, maxY };
    }, [layout.nodes]);

    const scaleX = (miniWidth - padding * 2) / Math.max(bounds.maxX - bounds.minX, 1);
    const scaleY = (miniHeight - padding * 2) / Math.max(bounds.maxY - bounds.minY, 1);
    const scale = Math.min(scaleX, scaleY, 1);

    const transformX = (x: number) => padding + (x - bounds.minX) * scale;
    const transformY = (y: number) => padding + (y - bounds.minY) * scale;

    const nodeRadius = 4;

    return (
        <button
            onClick={onClick}
            className="group relative bg-black/60 backdrop-blur-sm border border-fantasy-purple/40 rounded-lg overflow-hidden hover:border-fantasy-gold/60 transition-all cursor-pointer shadow-lg"
            style={{ width: miniWidth, height: miniHeight }}
            title="Click to view full map"
        >
            {/* SVG Map */}
            <svg width={miniWidth} height={miniHeight} className="absolute inset-0">
                {/* Connections */}
                {layout.connections.map((conn, idx) => {
                    const fromNode = layout.nodes.find(n => n.id === conn.from);
                    const toNode = layout.nodes.find(n => n.id === conn.to);
                    if (!fromNode || !toNode) return null;

                    // Only show connections between visited/current nodes (true fog of war)
                    const fromVisible = fromNode.state === 'current' || fromNode.state === 'visited';
                    const toVisible = toNode.state === 'current' || toNode.state === 'visited';
                    if (!fromVisible || !toVisible) return null;

                    return (
                        <line
                            key={`mini-conn-${idx}`}
                            x1={transformX(fromNode.position.x)}
                            y1={transformY(fromNode.position.y)}
                            x2={transformX(toNode.position.x)}
                            y2={transformY(toNode.position.y)}
                            stroke="rgba(139, 92, 246, 0.4)"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Nodes - only show visited and current (true fog of war) */}
                {layout.nodes
                    .filter(n => n.state === 'current' || n.state === 'visited')
                    .map(node => {
                        const colors = NODE_COLORS[node.state];
                        const x = transformX(node.position.x);
                        const y = transformY(node.position.y);

                        return (
                            <g key={`mini-${node.id}`}>
                                {/* Pulse effect for current */}
                                {node.state === 'current' && (
                                    <circle
                                        cx={x}
                                        cy={y}
                                        r={nodeRadius + 3}
                                        fill="none"
                                        stroke="rgb(234, 179, 8)"
                                        strokeWidth="1"
                                        opacity="0.6"
                                        className="animate-pulse"
                                    />
                                )}
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={nodeRadius}
                                    fill={colors.fill}
                                    stroke={colors.stroke}
                                    strokeWidth="1"
                                />
                            </g>
                        );
                    })}
            </svg>

            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                <Map className="h-5 w-5 text-fantasy-gold" />
            </div>

            {/* Label - only count visible nodes */}
            <div className="absolute bottom-1 left-1 right-1 text-[8px] text-center text-white/60 truncate">
                {layout.nodes.filter(n => n.state === 'visited' || n.state === 'current').length} discovered
            </div>
        </button>
    );
}
