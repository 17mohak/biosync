"use client";

import React from "react";
import { motion } from "framer-motion";
import { Dna, Activity, PieChart, Scissors, Hexagon } from "lucide-react";

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const MENU_ITEMS = [
  { id: "alignment", label: "Sequence Alignment", icon: Activity },
  { id: "gc-analytics", label: "GC & Analytics", icon: PieChart },
  { id: "restriction", label: "Restriction Mapping", icon: Scissors },
  { id: "protein", label: "3D Protein Viewer", icon: Hexagon },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const handleSelect = (viewId: string) => {
    setActiveView(viewId);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isMobileOpen ? 0 : -100 + "%",
          opacity: isMobileOpen ? 1 : 0,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-[250px] bg-[#030303]/95 backdrop-blur-3xl
          border-r border-white/5
          flex flex-col
          lg:translate-x-0 lg:opacity-100
        `}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-white/5">
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
              <span className="text-lg font-light tracking-tight text-white">
                BioSync
              </span>
              <span className="text-[9px] font-mono text-white/40 tracking-widest uppercase">
                Bioinformatics Suite
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-6 px-3">
          <div className="space-y-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200 text-left
                    ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500"
                        : "text-white/50 hover:text-white/80 hover:bg-white/5"
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-emerald-400" : ""}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute right-0 w-0.5 h-8 bg-emerald-500 rounded-l-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2 px-4 py-2">
            <motion.div
              className="w-2 h-2 rounded-full bg-emerald-400"
              animate={{
                opacity: [1, 0.4, 1],
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xs font-mono text-white/40">System Online</span>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
