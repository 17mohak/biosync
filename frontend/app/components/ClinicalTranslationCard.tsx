"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Info } from "lucide-react";

interface ClinicalTranslationCardProps {
  translation: string;
  confidenceScore: number;
}

export const ClinicalTranslationCard: React.FC<ClinicalTranslationCardProps> = ({
  translation,
  confidenceScore,
}) => {
  // Determine confidence color
  const confidenceColor = 
    confidenceScore >= 80 ? "text-emerald-400" :
    confidenceScore >= 50 ? "text-amber-400" : "text-rose-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="relative overflow-hidden rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-cyan-500/5 to-transparent"
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-5 h-5 text-violet-400" />
          </motion.div>
          <h3 className="text-sm font-mono uppercase tracking-wider text-white/70">
            AI Translation
          </h3>
          <span className="text-xs text-white/30 font-mono">(What this means)</span>
        </div>

        {/* Translation Text */}
        <p className="text-base leading-relaxed text-white/90 font-light">
          {translation}
        </p>

        {/* Confidence Badge */}
        <div className="mt-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-white/40" />
          <span className="text-xs text-white/40 font-mono">
            Confidence Score:
          </span>
          <span className={`text-sm font-mono font-medium ${confidenceColor}`}>
            {confidenceScore.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Decorative corner gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/20 to-transparent rounded-bl-full" />
    </motion.div>
  );
};

export default ClinicalTranslationCard;
