"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap, Activity } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface PositionBreakdown {
  position: number;
  base_1: string;
  base_2: string;
  position_type: string;
  instability: number;
}

interface MutationHotspot {
  start: number;
  end: number;
  window_instability: number;
  dominant_type: string;
}

interface StabilityHeatmapProps {
  positionBreakdown: PositionBreakdown[];
  hotspots: MutationHotspot[];
  confidenceScore?: number;
}

// =============================================================================
// STABILITY HEATMAP COMPONENT
// =============================================================================

export const StabilityHeatmap: React.FC<StabilityHeatmapProps> = ({
  positionBreakdown,
  hotspots,
  confidenceScore,
}) => {
  // Calculate statistics for display
  const matches = positionBreakdown.filter((p) => p.position_type === "match").length;
  const mismatches = positionBreakdown.filter((p) => p.position_type === "mismatch").length;
  const gaps = positionBreakdown.filter((p) => p.position_type === "gap").length;

  // Determine color for each position segment
  const getSegmentColor = (type: string): string => {
    switch (type) {
      case "match":
        return "bg-emerald-500";
      case "mismatch":
        return "bg-rose-500";
      case "gap":
        return "bg-rose-500";
      default:
        return "bg-white/20";
    }
  };

  // Determine glow intensity based on type
  const getGlowStyle = (type: string): React.CSSProperties => {
    switch (type) {
      case "match":
        return {
          boxShadow: "0 0 12px rgba(16, 185, 129, 0.6), 0 0 24px rgba(16, 185, 129, 0.3)",
        };
      case "mismatch":
      case "gap":
        return {
          boxShadow: "0 0 12px rgba(244, 63, 94, 0.6), 0 0 24px rgba(244, 63, 94, 0.3)",
        };
      default:
        return {};
    }
  };

  // Check if position is within a hotspot
  const isHotspotPosition = (index: number): boolean => {
    return hotspots.some((h) => index >= h.start && index < h.end);
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Header with Confidence Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Zap className="w-4 h-4 text-emerald-400" />
          </motion.div>
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">
            ML Stability Ribbon
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-4 h-4 rounded bg-emerald-500"
              animate={{
                boxShadow: [
                  "0 0 8px rgba(16, 185, 129, 0.4)",
                  "0 0 16px rgba(16, 185, 129, 0.8)",
                  "0 0 8px rgba(16, 185, 129, 0.4)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-white/40">MATCH ({matches})</span>
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              className="w-4 h-4 rounded bg-rose-500"
              animate={{
                boxShadow: [
                  "0 0 8px rgba(244, 63, 94, 0.4)",
                  "0 0 16px rgba(244, 63, 94, 0.8)",
                  "0 0 8px rgba(244, 63, 94, 0.4)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            />
            <span className="text-white/40">MISMATCH/GAP ({mismatches + gaps})</span>
          </div>
        </div>
      </div>

      {/* Main Gradient Ribbon */}
      <div className="relative">
        {/* Background track */}
        <div className="h-6 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
          {/* Animated segments */}
          <div className="absolute inset-0 flex rounded-full overflow-hidden">
            {positionBreakdown.map((pos, i) => {
              const isHotspot = isHotspotPosition(i);
              const segmentWidth = `${100 / positionBreakdown.length}%`;

              return (
                <motion.div
                  key={i}
                  className={`h-full ${getSegmentColor(pos.position_type)}`}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{
                    scaleY: 1,
                    opacity: 1,
                  }}
                  transition={{
                    delay: i * 0.002,
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                  }}
                  style={{
                    width: segmentWidth,
                    ...getGlowStyle(pos.position_type),
                  }}
                >
                  {/* Hotspot vibration overlay */}
                  {isHotspot && pos.position_type !== "match" && (
                    <motion.div
                      className="w-full h-full"
                      animate={{
                        opacity: [0.4, 0.8, 0.4],
                        x: [-1, 1, -1],
                      }}
                      transition={{
                        duration: 0.2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                      }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Glossy overlay effect */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)",
            }}
          />
        </div>

        {/* Hotspot markers */}
        {hotspots.map((hotspot, idx) => {
          const left = (hotspot.start / positionBreakdown.length) * 100;
          const width = ((hotspot.end - hotspot.start) / positionBreakdown.length) * 100;

          return (
            <motion.div
              key={idx}
              className="absolute top-0 bottom-0 border-x-2 border-rose-400/60"
              style={{ left: `${left}%`, width: `${width}%` }}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ delay: 0.5 + idx * 0.1, type: "spring" }}
            >
              <motion.div
                className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-rose-500/20 border border-rose-500/40 rounded text-[10px] font-mono text-rose-400 whitespace-nowrap backdrop-blur-sm"
                animate={{
                  y: [0, -2, 0],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                HOTSPOT
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Position indicators */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-white/30">5&apos;</span>
          <div className="flex items-center gap-2 text-[10px] font-mono text-white/20">
            <Activity className="w-3 h-3" />
            <span>{positionBreakdown.length} bp analyzed</span>
          </div>
        </div>

        {confidenceScore !== undefined && (
          <motion.div
            className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-[10px] font-mono text-cyan-400/60 uppercase">Confidence</span>
            <span className="text-sm font-mono text-cyan-400 font-semibold">
              {confidenceScore.toFixed(1)}%
            </span>
          </motion.div>
        )}

        <span className="text-xs font-mono text-white/30">3&apos;</span>
      </div>
    </div>
  );
};

export default StabilityHeatmap;
