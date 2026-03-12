"use client";

import React from "react";
import { motion } from "framer-motion";
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
// DNA SEQUENCE STREAM COMPONENT - OPTIMIZED FOR PERFORMANCE
// =============================================================================

export const DNASequenceStream: React.FC<DNASequenceStreamProps> = ({
  sequence,
  alignment,
  label,
  hotspots,
  onHoverIndex,
  showIcon = true,
}) => {
  const alignmentChars = alignment?.split("") || [];

  // Check if index is within a hotspot
  const isHotspot = (i: number): boolean => {
    return hotspots.some((h) => i >= h.start && i < h.end);
  };

  // Get hotspot info for an index
  const getHotspotInfo = (i: number): MutationHotspot | null => {
    return hotspots.find((h) => i >= h.start && i < h.end) || null;
  };

  // ✅ OPTIMIZED: Chunk consecutive matching bases, only wrap mutations/gaps
  const renderOptimizedSequence = (seq: string, alignmentChars: string[]) => {
    const elements: React.ReactNode[] = [];
    let currentChunk = "";
    let chunkStart = 0;

    for (let i = 0; i < seq.length; i++) {
      const base = seq[i];
      const alignedBase = alignmentChars[i];
      const isGap = base === "-";
      const isMismatch = !!(
        alignedBase &&
        base !== alignedBase &&
        base !== "-" &&
        alignedBase !== "-"
      );

      if (isMismatch || isGap) {
        // Flush accumulated normal chunk
        if (currentChunk) {
          elements.push(
            <span key={`chunk-${chunkStart}`} className="text-white/70">
              {currentChunk}
            </span>
          );
          currentChunk = "";
        }
        // Wrap mismatch/gap in span with Tailwind
        const hotspotInfo = getHotspotInfo(i);
        const isHotspotPos = isHotspot(i) && (isMismatch || isGap);

        elements.push(
          <motion.span
            key={`mutation-${i}`}
            className={`${
              isMismatch
                ? "text-rose-400 font-bold"
                : "text-amber-400/70"
            } ${isHotspotPos ? "animate-pulse" : ""}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.0005, duration: 0.1 }}
            onMouseEnter={() => onHoverIndex?.(i)}
            onMouseLeave={() => onHoverIndex?.(null)}
          >
            {base}
            {isHotspotPos && (
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-rose-500/50" />
            )}
          </motion.span>
        );
      } else {
        // Accumulate matching bases
        if (!currentChunk) chunkStart = i;
        currentChunk += base;
      }
    }

    // Flush remaining chunk
    if (currentChunk) {
      elements.push(
        <span key={`chunk-${chunkStart}`} className="text-white/70">
          {currentChunk}
        </span>
      );
    }

    return elements;
  };

  // For very long sequences, show simplified view
  const isLongSequence = sequence.length > 1000;

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
          {sequence.length.toLocaleString()} bp
          {isLongSequence && (
            <span className="ml-2 text-amber-400/60">(optimized view)</span>
          )}
        </motion.span>
      </div>

      {/* Sequence with Optimized Rendering */}
      <div className="relative pl-28">
        <div className="font-mono text-sm leading-relaxed tracking-wide break-all">
          {renderOptimizedSequence(sequence, alignmentChars)}
        </div>

        {/* Position markers for long sequences */}
        {sequence.length > 50 && (
          <div className="flex justify-between mt-2 text-[10px] font-mono text-white/20">
            <span>0</span>
            <span>{Math.floor(sequence.length / 2).toLocaleString()}</span>
            <span>{sequence.length.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DNASequenceStream;
