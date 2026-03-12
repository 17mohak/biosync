"use client";

import React from "react";
import { motion } from "framer-motion";
import { JitterBase } from "./JitterBase";
import { Dna } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface MutationHotspot {
  start: number;
  end: number;
  window_instability?: number;
  dominant_type?: string;
}

interface DNASequenceStreamProps {
  sequence: string;
  alignment?: string;
  label: string;
  hotspots: MutationHotspot[];
  onHoverIndex?: (index: number | null) => void;
  showIcon?: boolean;
}

// =============================================================================
// DNA SEQUENCE STREAM COMPONENT
// =============================================================================

export const DNASequenceStream: React.FC<DNASequenceStreamProps> = ({
  sequence,
  alignment,
  label,
  hotspots,
  onHoverIndex,
  showIcon = true,
}) => {
  const chars = sequence.split("");
  const alignmentChars = alignment?.split("") || [];

  // Check if index is within a hotspot
  const isHotspot = (i: number): boolean => {
    return hotspots.some((h) => i >= h.start && i < h.end);
  };

  // Get hotspot info for an index
  const getHotspotInfo = (i: number): MutationHotspot | null => {
    return hotspots.find((h) => i >= h.start && i < h.end) || null;
  };

  return (
    <div className="mb-6 group">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {showIcon && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <Dna className="w-4 h-4 text-cyan-400" />
          </motion.div>
        )}
        <span className="text-xs font-mono text-white/40 uppercase tracking-widest w-24">
          {label}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
        <motion.span
          className="text-xs font-mono text-white/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {chars.length} bp
        </motion.span>
      </div>

      {/* Sequence with Jitter Effect */}
      <div className="relative pl-28">
        {/* Sequence container */}
        <div className="flex flex-wrap gap-[2px] font-mono leading-relaxed">
          {chars.map((char, i) => {
            const isMatch = !!(
              alignmentChars[i] && char === alignmentChars[i] && char !== "-"
            );
            const isGap = char === "-";
            const isMismatch = !!(
              alignmentChars[i] &&
              char !== alignmentChars[i] &&
              char !== "-" &&
              alignmentChars[i] !== "-"
            );
            const hotspotInfo = getHotspotInfo(i);

            return (
              <motion.div
                key={`${label}-${i}`}
                className="relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.005 }}
              >
                {/* Hotspot indicator line */}
                {hotspotInfo && (isMismatch || isGap) && (
                  <motion.div
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-rose-500/50"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.5 + i * 0.01 }}
                  />
                )}

                <JitterBase
                  base={char}
                  index={i}
                  isMatch={isMatch}
                  isGap={isGap}
                  isMismatch={isMismatch}
                  isHotspot={isHotspot(i)}
                  onHover={() => onHoverIndex?.(i)}
                  onLeave={() => onHoverIndex?.(null)}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Position markers for long sequences */}
        {chars.length > 50 && (
          <div className="flex justify-between mt-2 text-[10px] font-mono text-white/20">
            <span>0</span>
            <span>{Math.floor(chars.length / 2)}</span>
            <span>{chars.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DNASequenceStream;
