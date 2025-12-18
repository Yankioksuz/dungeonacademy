// Adventure Map Component - Full SVG-based map visualization

import { useState, useRef, useEffect, useMemo } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';
import type { Encounter } from '@/types';
import type { MapNode, MapLayout } from '@/types/mapTypes';
import { NODE_COLORS, NODE_ICONS } from '@/types/mapTypes';
import { buildMapFromEncounters } from '@/utils/mapUtils';

interface AdventureMapProps {
    encounters: Encounter[];
    currentEncounterId: string;
    visitedEncounterIds: string[];
    isOpen: boolean;
    onClose: () => void;
    onNavigate?: (encounterId: string) => void;
    activeQuestIds?: string[];
}

export function AdventureMap({
    encounters,
    currentEncounterId,
    visitedEncounterIds,
    isOpen,
    onClose,
    onNavigate,
    activeQuestIds = [],
}: AdventureMapProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [hoveredNode, setHoveredNode] = useState<MapNode | null>(null);

    // Build the map layout
    const layout: MapLayout = useMemo(() => {
        return buildMapFromEncounters(encounters, currentEncounterId, visitedEncounterIds);
    }, [encounters, currentEncounterId, visitedEncounterIds]);

    // Center on current node when opening - only initialize once when modal opens
    const hasInitialized = useRef(false);
    useEffect(() => {
        if (isOpen && !hasInitialized.current && layout.nodes.length > 0) {
            hasInitialized.current = true;
            const containerWidth = window.innerWidth * 0.8;
            const containerHeight = window.innerHeight * 0.8;
            const currentNode = layout.nodes.find(n => n.id === currentEncounterId);
            if (currentNode) {
                setPan({
                    x: containerWidth / 2 - currentNode.position.x,
                    y: containerHeight / 2 - currentNode.position.y + 50,
                });
            }
            setZoom(1);
        }
        if (!isOpen) {
            hasInitialized.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Mouse handlers for panning
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) { // Left click only
            setIsDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 3));
    const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.3));
    const handleResetView = () => {
        setZoom(1);
        // Center the current node in the viewport (using approximate container size)
        const containerWidth = window.innerWidth * 0.8; // max-w-5xl is roughly 80%
        const containerHeight = window.innerHeight * 0.8; // max-h-[80vh]
        const currentNode = layout.nodes.find(n => n.id === currentEncounterId);
        if (currentNode) {
            setPan({
                x: containerWidth / 2 - currentNode.position.x,
                y: containerHeight / 2 - currentNode.position.y + 50, // offset for header
            });
        } else if (layout.nodes.length > 0) {
            // If no current node, center on first visible node
            const firstNode = layout.nodes.find(n => n.state === 'current' || n.state === 'visited') || layout.nodes[0];
            setPan({
                x: containerWidth / 2 - firstNode.position.x,
                y: containerHeight / 2 - firstNode.position.y + 50,
            });
        } else {
            setPan({ x: containerWidth / 2, y: containerHeight / 2 });
        }
    };

    if (!isOpen) return null;

    const nodeRadius = 24;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="relative w-full h-full max-w-5xl max-h-[80vh] m-4 bg-fantasy-dark-card border border-fantasy-purple/40 rounded-lg overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between px-4">
                    <h2 className="text-lg font-fantasy text-fantasy-gold">Adventure Map</h2>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={handleZoomOut} className="text-white/70 hover:text-white">
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-white/50 w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <Button variant="ghost" size="sm" onClick={handleZoomIn} className="text-white/70 hover:text-white">
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleResetView} className="text-white/70 hover:text-white">
                            <Maximize2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onClose} className="text-white/70 hover:text-white">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Map SVG */}
                <svg
                    ref={svgRef}
                    className="w-full h-full cursor-grab active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Background pattern */}
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(139, 92, 246, 0.1)" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Pannable and zoomable group */}
                    <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                        {/* Connection lines */}
                        {layout.connections.map((conn, idx) => {
                            const fromNode = layout.nodes.find(n => n.id === conn.from);
                            const toNode = layout.nodes.find(n => n.id === conn.to);
                            if (!fromNode || !toNode) return null;

                            // Only show connections between visited/current nodes (true fog of war)
                            const fromVisible = fromNode.state === 'current' || fromNode.state === 'visited';
                            const toVisible = toNode.state === 'current' || toNode.state === 'visited';
                            if (!fromVisible || !toVisible) return null;

                            const isActive = fromNode.state === 'current' || toNode.state === 'current';
                            const isVisited = fromNode.state === 'visited' && toNode.state === 'visited';

                            return (
                                <line
                                    key={`conn-${idx}`}
                                    x1={fromNode.position.x}
                                    y1={fromNode.position.y}
                                    x2={toNode.position.x}
                                    y2={toNode.position.y}
                                    stroke={isActive ? 'rgb(234, 179, 8)' : isVisited ? 'rgba(139, 92, 246, 0.5)' : 'rgba(100, 100, 100, 0.3)'}
                                    strokeWidth={isActive ? 3 : 2}
                                    strokeDasharray={toNode.state === 'locked' ? '5,5' : undefined}
                                    className="transition-all duration-300"
                                />
                            );
                        })}

                        {/* Nodes - only show visited and current (true fog of war) */}
                        {layout.nodes
                            .filter(node => node.state === 'current' || node.state === 'visited')
                            .map(node => {
                                const colors = NODE_COLORS[node.state];
                                const icon = NODE_ICONS[node.type];
                                const isHovered = hoveredNode?.id === node.id;
                                // Can navigate to visited nodes that are repeatable, or that have connections from current
                                const canNavigate = node.state === 'visited' && node.isRepeatable && onNavigate;

                                const handleNodeClick = () => {
                                    if (canNavigate) {
                                        onNavigate(node.id);
                                        onClose();
                                    }
                                };

                                // Check for active quest
                                const encounter = encounters.find(e => e.id === node.id);
                                const isQuestObjective = encounter?.questId && activeQuestIds.includes(encounter.questId);

                                return (
                                    <g
                                        key={node.id}
                                        transform={`translate(${node.position.x}, ${node.position.y})`}
                                        onMouseEnter={() => setHoveredNode(node)}
                                        onMouseLeave={() => setHoveredNode(null)}
                                        onClick={handleNodeClick}
                                        className={canNavigate ? "cursor-pointer" : node.state === 'current' ? "cursor-default" : "cursor-not-allowed opacity-90"}
                                    >
                                        {/* Glow effect for current node */}
                                        {node.state === 'current' && (
                                            <circle
                                                r={nodeRadius + 8}
                                                fill="none"
                                                stroke="rgb(234, 179, 8)"
                                                strokeWidth="2"
                                                opacity="0.5"
                                                className="animate-pulse"
                                            />
                                        )}

                                        {/* Quest Marker Pulse */}
                                        {isQuestObjective && (
                                            <circle
                                                r={nodeRadius + 6}
                                                fill="none"
                                                stroke="#ef4444"
                                                strokeWidth="2"
                                                opacity="0.6"
                                                className="animate-pulse"
                                            />
                                        )}

                                        {/* Node circle */}
                                        <circle
                                            r={isHovered ? nodeRadius + 4 : nodeRadius}
                                            fill={colors.fill}
                                            stroke={isQuestObjective ? '#ef4444' : colors.stroke}
                                            strokeWidth={node.state === 'current' || isQuestObjective ? 3 : 2}
                                            className="transition-all duration-200"
                                        />

                                        {/* Quest Icon Overlay */}
                                        {isQuestObjective && (
                                            <g transform="translate(10, -20)">
                                                <circle r="8" fill="#ef4444" stroke="white" strokeWidth="1.5" />
                                                <text textAnchor="middle" dominantBaseline="central" fill="white" fontSize="10" fontWeight="bold">!</text>
                                            </g>
                                        )}

                                        {/* Icon */}
                                        <text
                                            textAnchor="middle"
                                            dominantBaseline="central"
                                            fontSize="18"
                                            className="pointer-events-none select-none"
                                        >
                                            {icon}
                                        </text>

                                        {/* Label below node - Only show if it's the primary node at this position */}
                                        {(() => {
                                            // Find all visible nodes at this exact position
                                            const nodesAtPosition = layout.nodes.filter(n =>
                                                (n.state === 'current' || n.state === 'visited') &&
                                                Math.abs(n.position.x - node.position.x) < 1 &&
                                                Math.abs(n.position.y - node.position.y) < 1
                                            );

                                            // Determine which node should show the label
                                            // Priority: Current > Highest Priority Quest > First in list
                                            const primaryNode = nodesAtPosition.find(n => n.state === 'current') || nodesAtPosition[0];
                                            const shouldShowLabel = primaryNode.id === node.id;

                                            if (!shouldShowLabel || node.state === 'hidden') return null;

                                            return (
                                                <text
                                                    y={nodeRadius + 20}
                                                    textAnchor="middle"
                                                    fill={isQuestObjective ? '#fca5a5' : "#ffffff"}
                                                    fontSize="13"
                                                    fontWeight={node.state === 'current' || isQuestObjective ? '600' : '500'}
                                                    className="pointer-events-none select-none"
                                                    style={{
                                                        textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)',
                                                        letterSpacing: '0.02em'
                                                    }}
                                                >
                                                    {node.title.length > 18 ? node.title.slice(0, 16) + '...' : node.title}
                                                </text>
                                            );
                                        })()}

                                        {/* Repeatable indicator */}
                                        {node.isRepeatable && node.state === 'visited' && (
                                            <circle
                                                cx={nodeRadius - 4}
                                                cy={-nodeRadius + 4}
                                                r={6}
                                                fill="rgb(59, 130, 246)"
                                                stroke="white"
                                                strokeWidth="1"
                                            />
                                        )}
                                    </g>
                                );
                            })}
                    </g>
                </svg>

                {/* Tooltip */}
                {hoveredNode && (
                    <div
                        className="absolute bg-black/95 border border-fantasy-gold/40 rounded-lg p-3 pointer-events-none z-20 max-w-xs shadow-xl"
                        style={{
                            left: Math.min(window.innerWidth - 250, pan.x + hoveredNode.position.x * zoom + 40),
                            top: Math.min(window.innerHeight - 150, pan.y + hoveredNode.position.y * zoom - 20),
                        }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{NODE_ICONS[hoveredNode.type]}</span>
                            <span className="font-semibold text-fantasy-gold text-base">{hoveredNode.title}</span>
                        </div>
                        <div className="text-sm text-white/80 capitalize font-medium">
                            {hoveredNode.type === 'combat' && '⚔️ Combat Encounter'}
                            {hoveredNode.type === 'social' && '💬 Social Encounter'}
                            {hoveredNode.type === 'exploration' && '🔍 Exploration'}
                            {hoveredNode.type === 'skill' && '🎯 Skill Challenge'}
                            {hoveredNode.type === 'tutorial' && '📖 Tutorial'}
                        </div>

                        {/* Quest Info */}
                        {encounters.find(e => e.id === hoveredNode.id)?.questId &&
                            activeQuestIds.includes(encounters.find(e => e.id === hoveredNode.id)!.questId!) && (
                                <div className="mt-2 pt-2 border-t border-red-500/30">
                                    <span className="text-red-400 font-bold text-xs flex items-center gap-1">
                                        <span>!</span>
                                        QUEST OBJECTIVE
                                    </span>
                                </div>
                            )}

                        <div className="text-xs mt-2 space-y-1">
                            {hoveredNode.state === 'current' && <div className="text-yellow-400">📍 You are here</div>}
                            {hoveredNode.state === 'visited' && hoveredNode.isRepeatable && (
                                <div className="text-green-400">🔄 Click to return here</div>
                            )}
                            {hoveredNode.state === 'visited' && !hoveredNode.isRepeatable && (
                                <div className="text-purple-400/70">✓ Visited (cannot revisit)</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-black/80 border border-fantasy-gold/30 rounded-lg p-3 text-xs shadow-lg">
                    <div className="font-semibold mb-2 text-fantasy-gold">Map Legend</div>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500 ring-2 ring-yellow-500/50" />
                            <span className="text-white/90">Current Location</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500/60 border border-purple-400" />
                            <span className="text-white/70">Visited</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/10 text-white/50">
                        <span className="text-fantasy-gold">{layout.nodes.filter(n => n.state === 'current' || n.state === 'visited').length}</span> locations discovered
                    </div>
                </div>
            </div>
        </div>
    );
}
