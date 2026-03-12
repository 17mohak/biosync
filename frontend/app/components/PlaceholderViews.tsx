"use client";

import React from "react";
import { motion } from "framer-motion";
import { PieChart, Scissors, Hexagon, LineChart, Dna, Atom } from "lucide-react";

// =============================================================================
// GC & Analytics Placeholder
// =============================================================================

export const GCAnalyticsView: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-[70vh] flex items-center justify-center p-6"
    >
      <div className="relative max-w-md w-full p-8 rounded-2xl overflow-hidden">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-cyan-500/5 to-transparent backdrop-blur-3xl" />
        <div className="absolute inset-0 border border-white/10 rounded-2xl" />

        {/* Content */}
        <div className="relative z-10 text-center">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-violet-500/10 mb-6"
          >
            <PieChart className="w-10 h-10 text-violet-400" />
          </motion.div>

          <h2 className="text-2xl font-light text-white/90 mb-2">
            GC & Sequence Analytics Engine
          </h2>
          <p className="text-sm text-white/40 font-mono mb-6">
            Module loading... Please select a sequence to analyze.
          </p>

          {/* Pulsing line chart indicator */}
          <div className="flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-violet-400/50 rounded-full"
                animate={{ height: [20, 40, 20] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        </div>

        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/20 to-transparent rounded-bl-full" />
      </div>
    </motion.div>
  );
};

// =============================================================================
// Restriction Mapping Placeholder
// =============================================================================

export const RestrictionMappingView: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-[70vh] flex items-center justify-center p-6"
    >
      <div className="relative max-w-md w-full p-8 rounded-2xl overflow-hidden">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-orange-500/5 to-transparent backdrop-blur-3xl" />
        <div className="absolute inset-0 border border-white/10 rounded-2xl" />

        {/* Content */}
        <div className="relative z-10 text-center">
          <motion.div
            animate={{ rotate: [0, 45, 0, -45, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-500/10 mb-6"
          >
            <Scissors className="w-10 h-10 text-rose-400" />
          </motion.div>

          <h2 className="text-2xl font-light text-white/90 mb-2">
            Restriction Enzyme Mapper
          </h2>
          <p className="text-sm text-white/40 font-mono mb-6">
            Analyzing restriction sites... Upload a sequence to begin.
          </p>

          {/* DNA strand animation */}
          <div className="flex items-center justify-center gap-2">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full bg-rose-400/30"
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0.8, 0.3]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>
        </div>

        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-500/20 to-transparent rounded-bl-full" />
      </div>
    </motion.div>
  );
};

// =============================================================================
// 3D Protein Viewer Placeholder
// =============================================================================

export const ProteinViewerView: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-[70vh] flex items-center justify-center p-6"
    >
      <div className="relative max-w-md w-full p-8 rounded-2xl overflow-hidden">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent backdrop-blur-3xl" />
        <div className="absolute inset-0 border border-white/10 rounded-2xl" />

        {/* Content */}
        <div className="relative z-10 text-center">
          <motion.div
            animate={{ 
              rotateY: [0, 180, 360],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyan-500/10 mb-6"
            style={{ perspective: "1000px" }}
          >
            <Hexagon className="w-10 h-10 text-cyan-400" />
          </motion.div>

          <h2 className="text-2xl font-light text-white/90 mb-2">
            3D Protein Structure Viewer
          </h2>
          <p className="text-sm text-white/40 font-mono mb-6">
            Initializing WebGL renderer... Import PDB file to visualize.
          </p>

          {/* Atom/hex grid animation */}
          <div className="grid grid-cols-3 gap-2 max-w-[120px] mx-auto">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="w-8 h-8 rounded-lg bg-cyan-400/20 flex items-center justify-center"
                animate={{ 
                  opacity: [0.2, 0.6, 0.2],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              >
                <Atom className="w-4 h-4 text-cyan-400/60" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/20 to-transparent rounded-bl-full" />
      </div>
    </motion.div>
  );
};

// Export all placeholders
export const PlaceholderViews = {
  GCAnalytics: GCAnalyticsView,
  RestrictionMapping: RestrictionMappingView,
  ProteinViewer: ProteinViewerView,
};

export default PlaceholderViews;
