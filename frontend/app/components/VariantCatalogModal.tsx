"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Dna, Bug, Brain, Heart } from "lucide-react";

interface VariantCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVariant: (accessionId: string) => void;
}

const VARIANT_CATALOG = {
  virology: {
    icon: Bug,
    title: "🦠 Virology",
    color: "from-rose-500/20 to-orange-500/20",
    borderColor: "border-rose-500/30",
    variants: [
      { name: "SARS-CoV-2", accession: "NC_045512.2", description: "COVID-19 reference genome" },
      { name: "H1N1 Influenza", accession: "NC_026433.1", description: "Swine influenza A" },
      { name: "Ebola", accession: "NC_002549.1", description: "Ebola virus genome" },
    ],
  },
  oncology: {
    icon: Heart,
    title: "🧬 Oncology",
    color: "from-fuchsia-500/20 to-purple-500/20",
    borderColor: "border-fuchsia-500/30",
    variants: [
      { name: "BRCA1 Breast Cancer", accession: "NM_007294.4", description: "Hereditary breast/ovarian cancer" },
      { name: "TP53 Tumor Suppressor", accession: "NM_000546.6", description: "Li-Fraumeni syndrome" },
      { name: "EGFR Lung Cancer", accession: "NM_005228.5", description: "Epidermal growth factor receptor" },
    ],
  },
  hereditary: {
    icon: Dna,
    title: "🔬 Hereditary",
    color: "from-cyan-500/20 to-blue-500/20",
    borderColor: "border-cyan-500/30",
    variants: [
      { name: "CFTR Cystic Fibrosis", accession: "NM_000492.3", description: "CFTR gene mutations" },
      { name: "Sickle Cell Anemia", accession: "NM_000518.5", description: "HBB hemoglobin beta" },
      { name: "HTT Huntington's", accession: "NM_002111.8", description: "Huntington disease protein" },
    ],
  },
  metabolic: {
    icon: Brain,
    title: "🧠 Metabolic/Neuro",
    color: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/30",
    variants: [
      { name: "APOE Alzheimer's", accession: "NM_000041.4", description: "Apolipoprotein E" },
      { name: "INS Human Insulin", accession: "NM_000207.3", description: "Insulin gene" },
    ],
  },
};

export const VariantCatalogModal: React.FC<VariantCatalogModalProps> = ({
  isOpen,
  onClose,
  onSelectVariant,
}) => {
  const handleSelect = (accession: string) => {
    onClose();
    onSelectVariant(accession);
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[80vh] bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-medium text-white/90">Variant Catalog</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
              <div className="grid gap-6">
                {Object.entries(VARIANT_CATALOG).map(([key, category]) => {
                  const Icon = category.icon;
                  return (
                    <div key={key}>
                      {/* Category Header */}
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-5 h-5 text-white/60" />
                        <h3 className="text-sm font-mono text-white/60 uppercase tracking-wider">
                          {category.title}
                        </h3>
                      </div>

                      {/* Variant Cards */}
                      <div className="grid gap-2">
                        {category.variants.map((variant) => (
                          <motion.button
                            key={variant.accession}
                            onClick={() => handleSelect(variant.accession)}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className={`w-full p-3 text-left bg-gradient-to-r ${category.color} border ${category.borderColor} rounded-lg hover:border-white/30 transition-all group`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-white/90 group-hover:text-white">
                                  {variant.name}
                                </p>
                                <p className="text-xs text-white/40 font-mono mt-0.5">
                                  {variant.accession}
                                </p>
                              </div>
                              <p className="text-xs text-white/30 max-w-[150px] text-right">
                                {variant.description}
                              </p>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VariantCatalogModal;
