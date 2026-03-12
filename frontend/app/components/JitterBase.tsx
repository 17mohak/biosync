"use client";

import React from "react";
import { motion } from "framer-motion";

// =============================================================================
// TYPES
// =============================================================================

interface JitterBaseProps {
  base: string;
  index: number;
  isMatch?: boolean;
  isGap?: boolean;
  isMismatch?: boolean;
  isHotspot?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
}

// =============================================================================
// JITTER BASE COMPONENT
// =============================================================================

export const JitterBase: React.FC<JitterBaseProps> = ({
  base,
  index,
  isMatch,
  isGap,
  isMismatch,
  isHotspot,
  onHover,
  onLeave,
}) => {
  // Color mapping for DNA bases
  const baseColors: Record<string, string> = {
    A: "text-cyan-400",
    T: "text-violet-400",
    U: "text-violet-400",
    G: "text-emerald-400",
    C: "text-amber-400",
    "-": "text-white/20",
  };

  // Determine if this base should jitter (gap or mismatch)
  const shouldJitter = isGap || isMismatch;

  // Enhanced glow effects for unstable bases
  const getGlowStyle = (): React.CSSProperties => {
    if (isMatch) {
      return {
        textShadow: "0 0 10px rgba(34, 211, 238, 0.6), 0 0 20px rgba(34, 211, 238, 0.3)",
      };
    }
    if (isMismatch) {
      return {
        textShadow: "0 0 12px rgba(251, 113, 133, 0.8), 0 0 24px rgba(251, 113, 133, 0.4)",
      };
    }
    if (isGap) {
      return {
        textShadow: "0 0 8px rgba(255, 255, 255, 0.2)",
      };
    }
    return {};
  };

  return (
    <motion.span
      initial={{ opacity: 0, y: 20, scale: 0.5, rotateX: -90 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        x: shouldJitter ? [-1, 1, -1] : 0,
      }}
      transition={{
        opacity: { delay: index * 0.008, duration: 0.2 },
        y: { delay: index * 0.008, type: "spring", stiffness: 300, damping: 20 },
        scale: { delay: index * 0.008, type: "spring", stiffness: 300, damping: 20 },
        rotateX: { delay: index * 0.008, duration: 0.4 },
        x: shouldJitter ? { repeat: Infinity, duration: 0.2, ease: "linear", type: "tween" } : undefined,
      }}
      whileHover={{
        scale: 1.4,
        zIndex: 50,
        textShadow: shouldJitter
          ? "0 0 20px rgba(251, 113, 133, 1), 0 0 40px rgba(251, 113, 133, 0.6)"
          : "0 0 15px rgba(34, 211, 238, 0.8)",
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`
        inline-block font-mono text-sm md:text-base cursor-default
        ${baseColors[base.toUpperCase()] || "text-white/60"}
        ${isMatch ? "font-medium" : ""}
        ${isGap ? "text-white/30" : ""}
        ${isMismatch ? "font-bold" : ""}
        ${isHotspot ? "underline decoration-rose-400/50 decoration-2 underline-offset-4" : ""}
        mix-blend-screen
      `}
      style={{
        willChange: "transform",
        ...getGlowStyle(),
      }}
    >
      {/* Unstable indicator for gaps/mismatches */}
      {shouldJitter && (
        <motion.span
          className="absolute inset-0 pointer-events-none"
          animate={{
            opacity: [0, 0.3, 0],
          }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
          }}
          style={{
            background: "radial-gradient(circle, rgba(244,63,94,0.3) 0%, transparent 70%)",
            transform: "scale(1.5)",
          }}
        />
      )}
      {base}
    </motion.span>
  );
};

export default JitterBase;
