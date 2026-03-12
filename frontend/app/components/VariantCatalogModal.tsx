"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Dna, Droplets, Activity, Microscope, AlertTriangle } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface GeneVariant {
  id: string;
  name: string;
  description: string;
  accession: string;
  category: "virology" | "oncology" | "hereditary";
  icon: React.ReactNode;
  gradient: string;
}

interface VariantCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVariant: (accession: string) => void;
}

// =============================================================================
// VARIANT CATALOG DATA
// =============================================================================

const VARIANTS: GeneVariant[] = [
  // Virology
  {
    id: "sarscov2",
    name: "SARS-CoV-2",
    description: "Severe acute respiratory syndrome coronavirus 2",
    accession: "NC_045512.2",
    category: "virology",
    icon: <AlertTriangle className="w-6 h-6" />,
    gradient: "from-rose-500 to-orange-500",
  },
  {
    id: "h1n1",
    name: "H1N1 Influenza",
    description: "Influenza A virus subtype H1N1",
    accession: "NC_026433.1",
    category: "virology",
    icon: <AlertTriangle className="w-6 h-6" />,
    gradient: "from-orange-400 to-amber-500",
  },
  {
    id: "ebola",
    name: "Ebola Virus",
    description: "Zaire ebolavirus",
    accession: "NC_002549.1",
    category: "virology",
    icon: <AlertTriangle className="w-6 h-6" />,
    gradient: "from-red-500 to-rose-600",
  },
  // Oncology
  {
    id: "brca1",
    name: "BRCA1",
    description: "Breast Cancer Type 1 Susceptibility Protein",
    accession: "NM_007294.4",
    category: "oncology",
    icon: <Activity className="w-6 h-6" />,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    id: "tp53",
    name: "TP53",
    description: "Tumor Protein p53 - Guardian of the Genome",
    accession: "NM_000546.6",
    category: "oncology",
    icon: <Activity className="w-6 h-6" />,
    gradient: "from-violet-500 to-purple-600",
  },
  {
    id: "egfr",
    name: "EGFR",
    description: "Epidermal Growth Factor Receptor",
    accession: "NM_005228.5",
    category: "oncology",
    icon: <Activity className="w-6 h-6" />,
    gradient: "from-cyan-500 to-blue-600",
  },
  // Hereditary
  {
    id: "cftr",
    name: "CFTR",
    description: "Cystic Fibrosis Transmembrane Conductance Regulator",
    accession: "NM_000492.3",
    category: "hereditary",
    icon: <Dna className="w-6 h-6" />,
    gradient: "from-emerald-400 to-teal-500",
  },
  {
    id: "hbb",
    name: "HBB",
    description: "Sickle Cell Disease - Beta Globin",
    accession: "NM_000518.5",
    category: "hereditary",
    icon: <Droplets className="w-6 h-6" />,
    gradient: "from-red-400 to-pink-500",
  },
];

const CATEGORIES = [
  { id: "virology", label: "🦠 Virology", icon: <AlertTriangle className="w-5 h-5" />, color: "text-rose-400" },
  { id: "oncology", label: "🧬 Oncology", icon: <Microscope className="w-5 h-5" />, color: "text-violet-400" },
  { id: "hereditary", label: "🔬 Hereditary", icon: <Dna className="w-5 h-5" />, color: "text-emerald-400" },
] as const;

// =============================================================================
// VARIANT CATALOG MODAL COMPONENT
// =============================================================================

export const VariantCatalogModal: React.FC<VariantCatalogModalProps> = ({
  isOpen,
  onClose,
  onSelectVariant,
}) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [hoveredVariant, setHoveredVariant] = useState<string | null>(null);

  const filteredVariants = activeCategory
    ? VARIANTS.filter((v) => v.category === activeCategory)
    : VARIANTS;

  const handleSelect = (accession: string) => {
    onSelectVariant(accession);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 bg-[#0a0a0a]/95 backdrop-blur-3xl border border-white/10 z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, type: "tween" }}
                >
                  <BookOpen className="w-7 h-7 text-cyan-400" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-light text-white">Variant Catalog</h2>
                  <p className="text-sm text-white/40 font-mono">
                    Select a gene to analyze from our curated database
                  </p>
                </div>
              </div>

              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </motion.button>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 p-4 border-b border-white/5 overflow-x-auto">
              <motion.button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-mono whitespace-nowrap transition-all ${
                  activeCategory === null
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
                whileTap={{ scale: 0.95 }}
              >
                All Categories
              </motion.button>
              {CATEGORIES.map((cat) => (
                <motion.button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-mono whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeCategory === cat.id
                      ? "bg-white/20 text-white"
                      : "bg-white/5 text-white/50 hover:bg-white/10"
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {cat.icon}
                  {cat.label}
                </motion.button>
              ))}
            </div>

            {/* Variants Grid */}
            <div className="flex-1 overflow-y-auto p-6 premium-scroll">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVariants.map((variant, index) => (
                  <motion.button
                    key={variant.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, type: "spring" }}
                    onClick={() => handleSelect(variant.accession)}
                    onMouseEnter={() => setHoveredVariant(variant.id)}
                    onMouseLeave={() => setHoveredVariant(null)}
                    className="relative group text-left p-5 bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all overflow-hidden"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Gradient glow on hover */}
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-br ${variant.gradient} opacity-0`}
                      animate={{ opacity: hoveredVariant === variant.id ? 0.1 : 0 }}
                      transition={{ duration: 0.3 }}
                    />

                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <motion.div
                          className={`p-2.5 rounded-lg bg-gradient-to-br ${variant.gradient}`}
                          animate={{
                            scale: hoveredVariant === variant.id ? 1.1 : 1,
                          }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          <div className="text-white">{variant.icon}</div>
                        </motion.div>
                        <span className="text-[10px] font-mono text-white/30 uppercase">
                          {variant.accession}
                        </span>
                      </div>

                      {/* Content */}
                      <h3 className={`text-lg font-medium bg-gradient-to-r ${variant.gradient} bg-clip-text text-transparent mb-1`}>
                        {variant.name}
                      </h3>
                      <p className="text-sm text-white/50 mb-3">{variant.description}</p>

                      {/* Category badge */}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono capitalize ${
                          variant.category === "virology" ? "text-rose-400" :
                          variant.category === "oncology" ? "text-violet-400" :
                          "text-emerald-400"
                        }`}>
                          {variant.category}
                        </span>
                      </div>
                    </div>

                    {/* Bottom accent */}
                    <motion.div
                      className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${variant.gradient}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: hoveredVariant === variant.id ? 1 : 0 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 text-center">
              <p className="text-xs text-white/30 font-mono">
                Data sourced from NCBI GenBank. Click any variant to fetch and analyze.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VariantCatalogModal;
