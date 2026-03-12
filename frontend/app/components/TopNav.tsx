"use client";

import React from "react";
import { motion } from "framer-motion";
import { Dna, Activity, PieChart, Scissors, Hexagon } from "lucide-react";

interface TopNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const MENU_ITEMS = [
  { id: "alignment", label: "Alignment", icon: Activity },
  { id: "gc-analytics", label: "GC & Analytics", icon: PieChart },
  { id: "restriction", label: "Restriction", icon: Scissors },
  { id: "protein", label: "Protein", icon: Hexagon },
];

export const TopNav: React.FC<TopNavProps> = ({ activeView, setActiveView }) => {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Logo - Centered */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-3">
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
        </div>

        {/* Navigation Tabs - Centered, pill-shaped */}
        <nav className="flex justify-center">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <motion.button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full
                    text-sm font-medium whitespace-nowrap
                    transition-all duration-200
                    ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "text-white/50 hover:text-white/80 hover:bg-white/5"
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : ""}`} />
                  <span>{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default TopNav;
