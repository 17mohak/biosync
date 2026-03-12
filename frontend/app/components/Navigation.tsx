"use client";

import React from "react";
import { motion } from "framer-motion";
import { Dna, Activity } from "lucide-react";

export const Navigation: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#030303]/90 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          {/* Glowing DNA Logo */}
          <motion.div
            className="relative"
            animate={{ rotate: [0, 5, 0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 bg-cyan-500/30 blur-lg rounded-full" />
            <Dna className="w-8 h-8 text-cyan-400 relative z-10" />
          </motion.div>
          
          <div className="flex flex-col">
            <span className="text-xl font-light tracking-tight text-white">
              BioSync
            </span>
            <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
              Genomic Command Center
            </span>
          </div>
        </div>

        {/* Sync Status Indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-emerald-400"
            animate={{ 
              opacity: [1, 0.4, 1],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-xs font-mono text-white/50">Synced</span>
          
          {/* Pulsing Activity Icon */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Activity className="w-4 h-4 text-violet-400" />
          </motion.div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
