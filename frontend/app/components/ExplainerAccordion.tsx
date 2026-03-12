"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Dna, GitCompare, Brain, ChevronDown } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface ExplainerStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
}

// =============================================================================
// EXPLAINER ACCORDION COMPONENT
// =============================================================================

export const ExplainerAccordion: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const steps: ExplainerStep[] = [
    {
      id: "blueprint",
      title: "The Blueprint",
      subtitle: "DNA is the source code of life.",
      description:
        "Just as computer code uses binary (0s and 1s), life uses a four-letter alphabet: A, T, G, and C. These nucleotides form the genetic instructions for building every living organism on Earth.",
      icon: <Dna className="w-5 h-5" />,
      gradient: "from-cyan-400 to-blue-500",
    },
    {
      id: "spellcheck",
      title: "The Spellcheck",
      subtitle: "Our Precision Alignment Engine compares healthy DNA against mutated variants.",
      description:
        "We use dynamic programming algorithms (Smith-Waterman & Needleman-Wunsch) to compare sequences. Like a spell-checker finding typos, we locate insertions, deletions, and substitutions.",
      icon: <GitCompare className="w-5 h-5" />,
      gradient: "from-violet-400 to-purple-500",
    },
    {
      id: "prediction",
      title: "The Prediction",
      subtitle: "Our ML model scores the 'typos' to predict if the mutation is a dangerous anomaly.",
      description:
        "Our machine learning model analyzes the mutations to predict if they are stable or dangerous anomalies. We identify mutation hotspots and calculate confidence scores for genetic stability.",
      icon: <Brain className="w-5 h-5" />,
      gradient: "from-emerald-400 to-teal-500",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="mb-12"
    >
      {/* Accordion Header */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white/[0.02] backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all group"
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <BookOpen className="w-5 h-5 text-cyan-400" />
          </motion.div>
          <span className="text-sm font-mono text-white/60 uppercase tracking-wider">
            How it Works (For Non-Scientists)
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <ChevronDown className="w-5 h-5 text-white/40 group-hover:text-white/60" />
        </motion.div>
      </motion.button>

      {/* Accordion Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 150, damping: 20 }}
            className="overflow-hidden"
          >
            <div className="pt-4 grid md:grid-cols-3 gap-4">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, type: "spring" }}
                  onMouseEnter={() => setActiveStep(step.id)}
                  onMouseLeave={() => setActiveStep(null)}
                  className={`
                    relative p-5 bg-white/[0.02] backdrop-blur-sm border border-white/5
                    hover:border-white/20 transition-all cursor-default overflow-hidden
                    ${activeStep === step.id ? "bg-white/[0.04]" : ""}
                  `}
                >
                  {/* Gradient glow on hover */}
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${step.gradient} opacity-0`}
                    animate={{ opacity: activeStep === step.id ? 0.05 : 0 }}
                    transition={{ duration: 0.3 }}
                  />

                  {/* Step number */}
                  <div className="absolute top-3 right-3 text-[10px] font-mono text-white/20">
                    STEP {String(index + 1).padStart(2, "0")}
                  </div>

                  {/* Icon - Using tween for complex animations to avoid Spring crashes */}
                  <motion.div
                    className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${step.gradient} bg-opacity-10 mb-3`}
                    animate={{
                      scale: activeStep === step.id ? 1.1 : 1,
                      rotate: activeStep === step.id ? [0, -10, 10, -5, 5, 0] : 0,
                    }}
                    transition={{ 
                      scale: { type: "spring", stiffness: 300 },
                      rotate: { duration: 0.5, type: "tween" }
                    }}
                  >
                    <div className="text-white">{step.icon}</div>
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-lg font-medium text-white/90 mb-1">{step.title}</h3>
                  <p className={`text-xs font-mono bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent mb-3`}>
                    {step.subtitle}
                  </p>
                  <p className="text-sm text-white/50 leading-relaxed">{step.description}</p>

                  {/* Bottom accent line */}
                  <motion.div
                    className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${step.gradient}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: activeStep === step.id ? 1 : 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ExplainerAccordion;
