"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  motion,
  useSpring,
  useMotionValue,
  useScroll,
  useTransform,
  AnimatePresence,
  useAnimation,
  LayoutGroup,
} from "framer-motion";
import { Download, Dna, Sparkles, History, ChevronRight, Zap, Activity, Microscope } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface FastaRecord {
  id: string;
  description: string;
  sequence: string;
  length: number;
}

interface AlignmentResult {
  alignment_1?: string;
  alignment_2?: string;
  local_alignment_1?: string;
  local_alignment_2?: string;
  optimal_score?: number;
  local_score?: number;
  score_matrix: number[][];
  algorithm: string;
}

interface StabilityResult {
  confidence_score: number;
  raw_instability: number;
  mutation_hotspots: Array<{
    start: number;
    end: number;
    window_instability: number;
    dominant_type: string;
  }>;
  gc_content_seq1: number;
  gc_content_seq2: number;
  total_positions: number;
  match_count: number;
  mismatch_count: number;
  gap_count: number;
  position_breakdown: Array<{
    position: number;
    base_1: string;
    base_2: string;
    position_type: string;
    instability: number;
  }>;
}

interface JobRecord {
  id: number;
  job_type: string;
  input_data: Record<string, unknown>;
  result_data: Record<string, unknown>;
  notes: string | null;
  created_at: string;
}

// =============================================================================
// CUSTOM HOOKS
// =============================================================================

function useMousePosition() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return { mouseX, mouseY };
}

function useMouseSpotlight() {
  const { mouseX, mouseY } = useMousePosition();
  const springConfig = { stiffness: 150, damping: 20, mass: 0.5 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);
  return { springX, springY, mouseX, mouseY };
}

function useScrollParallax() {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 150, damping: 20 });
  const y1 = useTransform(smoothProgress, [0, 1], [0, -30]);
  const y2 = useTransform(smoothProgress, [0, 1], [0, -60]);
  const y3 = useTransform(smoothProgress, [0, 1], [0, -90]);
  const opacity = useTransform(smoothProgress, [0, 0.15], [0, 1]);
  return { y1, y2, y3, opacity, scrollYProgress };
}

// =============================================================================
// PARTICLE BACKGROUND (Client-only)
// =============================================================================

interface ParticleData {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

const ParticleField: React.FC<{ mouseX: any; mouseY: any }> = ({ mouseX, mouseY }) => {
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Generate particles only on client to avoid hydration mismatch
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  // Don't render anything during SSR
  if (!isClient || particles.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <Particle key={p.id} {...p} mouseX={mouseX} mouseY={mouseY} />
      ))}
    </div>
  );
};

const Particle: React.FC<{
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  mouseX: any;
  mouseY: any;
}> = ({ x, y, size, delay, mouseX, mouseY }) => {
  const positionX = useMotionValue(x);
  const positionY = useMotionValue(y);
  const springX = useSpring(positionX, { stiffness: 100, damping: 30 });
  const springY = useSpring(positionY, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleMouseMove = () => {
      const latestX = mouseX.get();
      const latestY = mouseY.get();
      const screenX = (x / 100) * window.innerWidth;
      const screenY = (y / 100) * window.innerHeight;
      const diffX = screenX - latestX;
      const diffY = screenY - latestY;
      
      let newX = x;
      let newY = y;
      
      if (Math.abs(diffX) < 150) {
        newX = x + (diffX / 150) * 8;
      }
      if (Math.abs(diffY) < 150) {
        newY = y + (diffY / 150) * 8;
      }
      
      positionX.set(newX);
      positionY.set(newY);
    };

    const unsubscribeX = mouseX.on("change", handleMouseMove);
    const unsubscribeY = mouseY.on("change", handleMouseMove);
    
    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [mouseX, mouseY, x, y, positionX, positionY]);

  // Use transform to convert percentage to vw/vh units for smoother animation
  const leftPos = useTransform(springX, (v) => `${v}vw`);
  const topPos = useTransform(springY, (v) => `${v}vh`);

  return (
    <motion.div
      className="absolute rounded-full bg-white/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.15, 0.4, 0.15] }}
      transition={{
        opacity: { duration: 4, repeat: Infinity, delay },
      }}
      style={{
        left: leftPos,
        top: topPos,
        width: size,
        height: size,
      }}
    />
  );
};

// =============================================================================
// SCANLINE EFFECT
// =============================================================================

const Scanline: React.FC = () => {
  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-40"
      style={{
        background: "linear-gradient(to bottom, transparent 50%, rgba(34,211,238,0.015) 50%)",
        backgroundSize: "100% 4px",
      }}
    >
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
        animate={{
          top: ["0%", "100%"],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </motion.div>
  );
};

// =============================================================================
// KINETIC MATRIX (Smith-Waterman Visualization)
// =============================================================================

const KineticMatrix: React.FC<{
  matrix: number[][];
  seq1: string;
  seq2: string;
  hoveredCell: { i: number; j: number } | null;
  onHoverCell: (cell: { i: number; j: number } | null) => void;
}> = ({ matrix, seq1, seq2, hoveredCell, onHoverCell }) => {
  const maxVal = Math.max(...matrix.flat());
  const minVal = Math.min(...matrix.flat().filter((v) => v > 0));

  // Calculate optimal path from a cell
  const calculatePath = (startI: number, startJ: number): Array<{ i: number; j: number }> => {
    const path: Array<{ i: number; j: number }> = [];
    let i = startI;
    let j = startJ;

    while (i > 0 && j > 0 && matrix[i][j] > 0) {
      path.push({ i, j });
      const current = matrix[i][j];
      const diag = matrix[i - 1]?.[j - 1] ?? -1;
      const up = matrix[i - 1]?.[j] ?? -1;
      const left = matrix[i]?.[j - 1] ?? -1;

      const diagScore = i > 0 && j > 0 ? (seq1[i - 1] === seq2[j - 1] ? 1 : -1) : -999;

      if (diag >= up && diag >= left && current === diag + diagScore) {
        i--; j--;
      } else if (up >= left && current === up - 2) {
        i--;
      } else if (current === left - 2) {
        j--;
      } else {
        break;
      }
    }
    return path;
  };

  const pathCells = hoveredCell ? calculatePath(hoveredCell.i, hoveredCell.j) : [];
  const pathSet = new Set(pathCells.map((p) => `${p.i}-${p.j}`));

  // Limit display
  const displayRows = Math.min(matrix.length, 16);
  const displayCols = Math.min(matrix[0]?.length || 0, 20);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">
            Scoring Matrix
          </span>
        </div>
        <span className="text-xs font-mono text-white/30">
          Max Score: {maxVal}
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          className="inline-grid gap-[2px]"
          style={{
            gridTemplateColumns: `repeat(${displayCols}, minmax(24px, 1fr))`,
          }}
        >
          {matrix.slice(0, displayRows).map((row, i) =>
            row.slice(0, displayCols).map((val, j) => {
              const intensity = maxVal > 0 ? (val - minVal) / (maxVal - minVal) : 0;
              const isInPath = pathSet.has(`${i}-${j}`);
              const isHovered = hoveredCell?.i === i && hoveredCell?.j === j;

              return (
                <motion.div
                  key={`${i}-${j}`}
                  layoutId={`cell-${i}-${j}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: 1,
                    scale: isHovered ? 1.3 : isInPath ? 1.1 : 1,
                    backgroundColor: isInPath
                      ? "rgba(34, 211, 238, 0.6)"
                      : val > 0
                      ? `rgba(167, 139, 250, ${0.1 + intensity * 0.5})`
                      : "rgba(255,255,255,0.03)",
                  }}
                  transition={{
                    delay: (i * displayCols + j) * 0.003,
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                  onMouseEnter={() => onHoverCell({ i, j })}
                  onMouseLeave={() => onHoverCell(null)}
                  className={`
                    aspect-square flex items-center justify-center
                    text-[9px] font-mono cursor-crosshair
                    ${isInPath ? "text-white font-bold z-10" : val > 0 ? "text-white/50" : "text-white/20"}
                  `}
                  style={{
                    boxShadow: isInPath
                      ? "0 0 15px rgba(34, 211, 238, 0.8), inset 0 0 10px rgba(34, 211, 238, 0.4)"
                      : isHovered
                      ? "0 0 10px rgba(167, 139, 250, 0.6)"
                      : val > maxVal * 0.8
                      ? `0 0 ${val * 0.3}px rgba(167, 139, 250, ${0.3 + intensity * 0.4})`
                      : "none",
                  }}
                >
                  {val > 0 ? val : ""}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Neural Trace Line */}
      <AnimatePresence>
        {pathCells.length > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none overflow-visible"
            style={{ width: "100%", height: "100%" }}
          >
            <motion.path
              d={pathCells
                .map((p, idx) => {
                  const x = p.j * 26 + 12;
                  const y = p.i * 26 + 12;
                  return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// MUTATION HEATMAP
// =============================================================================

const MutationHeatmap: React.FC<{
  positionBreakdown: StabilityResult["position_breakdown"];
  hotspots: StabilityResult["mutation_hotspots"];
}> = ({ positionBreakdown, hotspots }) => {
  const maxInstability = Math.max(...positionBreakdown.map((p) => p.instability), 0.1);

  const getColor = (type: string, instability: number) => {
    const intensity = instability / maxInstability;
    if (type === "match") {
      return `rgba(52, 211, 153, ${0.3 + intensity * 0.7})`; // Emerald
    } else if (type === "mismatch") {
      return `rgba(251, 113, 133, ${0.4 + intensity * 0.6})`; // Crimson
    }
    return `rgba(255, 255, 255, ${0.1 + intensity * 0.3})`;
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">
            Instability Heatmap
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded bg-emerald-400/50" />
          <span className="text-white/30">Stable</span>
          <span className="w-3 h-3 rounded bg-rose-400/50 ml-2" />
          <span className="text-white/30">Unstable</span>
        </div>
      </div>

      <div className="relative h-8 bg-white/5 rounded-sm overflow-hidden">
        <div className="absolute inset-0 flex">
          {positionBreakdown.map((pos, i) => {
            const isHotspot = hotspots.some((h) => i >= h.start && i < h.end);

            return (
              <motion.div
                key={i}
                className="flex-1 origin-bottom"
                initial={{ scaleY: 0 }}
                animate={{
                  scaleY: 1,
                  backgroundColor: getColor(pos.position_type, pos.instability),
                }}
                transition={{
                  delay: i * 0.003,
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                }}
              >
                {isHotspot && (
                  <motion.div
                    className="w-full h-full"
                    animate={{
                      opacity: [0.5, 1, 0.5],
                      x: [-0.5, 0.5, -0.5],
                    }}
                    transition={{
                      duration: 0.15,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(251,113,133,0.5), transparent)",
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Hotspot markers */}
        {hotspots.map((hotspot, idx) => {
          const left = (hotspot.start / positionBreakdown.length) * 100;
          const width = ((hotspot.end - hotspot.start) / positionBreakdown.length) * 100;
          return (
            <motion.div
              key={idx}
              className="absolute top-0 bottom-0 border-x border-rose-400/50"
              style={{ left: `${left}%`, width: `${width}%` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-rose-400 whitespace-nowrap">
                HOTSPOT
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-between mt-2 text-xs font-mono text-white/30">
        <span>5&apos;</span>
        <span>{positionBreakdown.length} bp</span>
        <span>3&apos;</span>
      </div>
    </div>
  );
};

// =============================================================================
// DNA BASE COMPONENT
// =============================================================================

const DNABase: React.FC<{
  base: string;
  index: number;
  isMatch?: boolean;
  isGap?: boolean;
  isMismatch?: boolean;
  isHotspot?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
}> = ({ base, index, isMatch, isGap, isMismatch, isHotspot, onHover, onLeave }) => {
  const baseColors: Record<string, string> = {
    A: "text-cyan-400",
    T: "text-violet-400",
    U: "text-violet-400",
    G: "text-emerald-400",
    C: "text-amber-400",
    "-": "text-white/20",
  };

  return (
    <motion.span
      initial={{ opacity: 0, y: 20, scale: 0.5 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        x: isHotspot ? [0, -1, 1, 0] : 0,
      }}
      transition={{
        opacity: { delay: index * 0.008, duration: 0.2 },
        y: { delay: index * 0.008, type: "spring", stiffness: 300, damping: 20 },
        scale: { delay: index * 0.008, type: "spring", stiffness: 300, damping: 20 },
        x: isHotspot ? { duration: 0.1, repeat: Infinity, repeatDelay: 0.5 } : undefined,
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`
        inline-block font-mono text-sm md:text-base cursor-default
        ${baseColors[base.toUpperCase()] || "text-white/60"}
        ${isMatch ? "drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" : ""}
        ${isGap ? "text-white/30" : ""}
        ${isMismatch ? "text-rose-400 drop-shadow-[0_0_12px_rgba(251,113,133,0.9)]" : ""}
        ${isHotspot ? "font-bold" : ""}
        transition-all duration-200
        hover:scale-125 hover:z-10
        mix-blend-screen
      `}
      style={{ willChange: "transform" }}
    >
      {base}
    </motion.span>
  );
};

// =============================================================================
// DNA SEQUENCE STREAM
// =============================================================================

const DNASequenceStream: React.FC<{
  sequence: string;
  alignment?: string;
  label: string;
  hotspots: Array<{ start: number; end: number }>;
  onHoverIndex: (index: number | null) => void;
}> = ({ sequence, alignment, label, hotspots, onHoverIndex }) => {
  const chars = sequence.split("");
  const alignmentChars = alignment?.split("") || [];

  const isHotspot = (i: number) => hotspots.some((h) => i >= h.start && i < h.end);

  return (
    <div className="mb-6 group">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-mono text-white/40 uppercase tracking-widest w-24">
          {label}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
        <span className="text-xs font-mono text-white/30">{chars.length} bp</span>
      </div>
      <div className="flex flex-wrap gap-[2px] font-mono leading-relaxed pl-24">
        {chars.map((char, i) => {
          const isMatch = alignmentChars[i] && char === alignmentChars[i] && char !== "-";
          const isGap = char === "-";
          const isMismatch = alignmentChars[i] && char !== alignmentChars[i] && char !== "-" && alignmentChars[i] !== "-";

          return (
            <DNABase
              key={`${label}-${i}`}
              base={char}
              index={i}
              isMatch={isMatch}
              isGap={isGap}
              isMismatch={isMismatch}
              isHotspot={isHotspot(i)}
              onHover={() => onHoverIndex(i)}
              onLeave={() => onHoverIndex(null)}
            />
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// DROP ZONE
// =============================================================================

const DropZone: React.FC<{
  onDrop: (text: string) => void;
  isLoading: boolean;
  isDocked: boolean;
}> = ({ onDrop, isLoading, isDocked }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [shatterFragments, setShatterFragments] = useState<string[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file || (!file.name.endsWith(".fasta") && !file.name.endsWith(".txt"))) {
      return;
    }

    const text = await file.text();
    const fragments = text.slice(0, 100).split("").filter((_, i) => i % 3 === 0);
    setShatterFragments(fragments);

    setTimeout(() => {
      setShatterFragments([]);
      onDrop(text);
    }, 800);
  };

  if (isDocked) {
    return (
      <motion.div
        layoutId="dropzone"
        initial={false}
        animate={{ height: 60 }}
        className="fixed top-0 left-0 right-0 z-30 bg-[#030303]/90 backdrop-blur-xl border-b border-white/5"
      >
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-4">
            <Microscope className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-mono text-white/60">
              Analysis Active
            </span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-xs font-mono text-white/40 hover:text-white/80 transition-colors"
          >
            New Analysis →
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layoutId="dropzone"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      animate={{
        borderColor: isDragging ? "rgba(34, 211, 238, 0.5)" : "rgba(255,255,255,0.08)",
        backgroundColor: isDragging ? "rgba(34, 211, 238, 0.03)" : "rgba(255,255,255,0.01)",
      }}
      className="
        relative border-2 border-dashed border-white/10
        p-20 md:p-32
        text-center
        backdrop-blur-sm
        cursor-pointer
        overflow-hidden
      "
    >
      <AnimatePresence>
        {shatterFragments.map((frag, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{
              opacity: 0,
              x: (Math.random() - 0.5) * 300,
              y: (Math.random() - 0.5) * 300,
              scale: 0,
              rotate: Math.random() * 720 - 360,
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 text-cyan-400 font-mono text-lg font-bold pointer-events-none"
          >
            {frag}
          </motion.span>
        ))}
      </AnimatePresence>

      <motion.div animate={{ scale: isDragging ? 1.1 : 1 }} transition={{ type: "spring", stiffness: 400 }}>
        <Dna className={`w-16 h-16 mx-auto mb-6 ${isDragging ? "text-cyan-400" : "text-white/20"}`} />
      </motion.div>

      <h3 className={`text-2xl font-light mb-2 ${isDragging ? "text-cyan-300" : "text-white/70"}`}>
        {isLoading ? "Processing Sequence..." : "Drop FASTA File"}
      </h3>
      <p className="text-white/40 font-mono text-sm">.fasta or .txt formats</p>

      {isDragging && (
        <motion.div
          layoutId="glow"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, rgba(34,211,238,0.1) 0%, transparent 60%)",
          }}
        />
      )}
    </motion.div>
  );
};

// =============================================================================
// SPATIAL DATA CANVAS
// =============================================================================

const SpatialDataCanvas: React.FC<{
  alignment: AlignmentResult;
  stability: StabilityResult | null;
  fastaRecords: FastaRecord[];
  onSave: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
}> = ({ alignment, stability, fastaRecords, onSave, isSaving, saveSuccess }) => {
  const [hoveredMatrixCell, setHoveredMatrixCell] = useState<{ i: number; j: number } | null>(null);
  const [hoveredSeqIndex, setHoveredSeqIndex] = useState<number | null>(null);

  const seq1 = alignment.local_alignment_1 || alignment.alignment_1 || "";
  const seq2 = alignment.local_alignment_2 || alignment.alignment_2 || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen pt-24 px-6 md:px-12 lg:px-24"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
        <div>
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-light text-white/90"
          >
            Spatial Analysis
          </motion.h2>
          <p className="text-sm font-mono text-white/40 mt-1">
            {alignment.algorithm === "smith-waterman" ? "Local" : "Global"} Alignment | 
            Score: {alignment.local_score || alignment.optimal_score} | 
            {fastaRecords[0]?.id} vs {fastaRecords[1]?.id}
          </p>
        </div>

        <motion.button
          onClick={onSave}
          disabled={isSaving}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="
            px-6 py-3
            bg-cyan-500/10 hover:bg-cyan-500/20
            border border-cyan-500/30 hover:border-cyan-500/50
            text-cyan-300
            font-mono text-sm
            transition-all duration-300
            flex items-center gap-2
            disabled:opacity-50
          "
        >
          <AnimatePresence mode="wait">
            {saveSuccess ? (
              <motion.span
                key="success"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Saved
              </motion.span>
            ) : (
              <motion.span
                key="save"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Save Analysis
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-5 gap-8">
        {/* Left: Sequences */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 p-6">
            <DNASequenceStream
              sequence={seq1}
              alignment={seq2}
              label="Sequence 1"
              hotspots={stability?.mutation_hotspots || []}
              onHoverIndex={setHoveredSeqIndex}
            />
            <DNASequenceStream
              sequence={seq2}
              alignment={seq1}
              label="Sequence 2"
              hotspots={stability?.mutation_hotspots || []}
              onHoverIndex={setHoveredSeqIndex}
            />

            {stability && (
              <MutationHeatmap
                positionBreakdown={stability.position_breakdown}
                hotspots={stability.mutation_hotspots}
              />
            )}
          </div>

          {/* Stats */}
          {stability && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-4 gap-3"
            >
              {[
                { label: "Confidence", value: `${stability.confidence_score.toFixed(1)}%`, color: "text-cyan-400" },
                { label: "Matches", value: stability.match_count, color: "text-emerald-400" },
                { label: "Mismatches", value: stability.mismatch_count, color: "text-rose-400" },
                { label: "Gaps", value: stability.gap_count, color: "text-amber-400" },
              ].map((stat, i) => (
                <div key={stat.label} className="bg-white/[0.02] border border-white/5 p-4">
                  <p className="text-[10px] font-mono text-white/40 uppercase">{stat.label}</p>
                  <p className={`text-2xl font-light mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Right: Matrix */}
        <div className="lg:col-span-2">
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 p-6 sticky top-24">
            <KineticMatrix
              matrix={alignment.score_matrix}
              seq1={seq1}
              seq2={seq2}
              hoveredCell={hoveredMatrixCell}
              onHoverCell={setHoveredMatrixCell}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// =============================================================================
// HISTORY SECTION
// =============================================================================

const HistorySection: React.FC<{
  jobs: JobRecord[];
  onLoadJob: (job: JobRecord) => void;
}> = ({ jobs, onLoadJob }) => {
  const { y1, y2, y3, opacity } = useScrollParallax();
  const [downloadSuccess, setDownloadSuccess] = useState<number | null>(null);

  const handleDownload = async (jobId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`http://localhost:8000/api/export/${jobId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `job_${jobId}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        setDownloadSuccess(jobId);
        setTimeout(() => setDownloadSuccess(null), 2000);
      }
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <motion.section style={{ opacity }} className="mt-32 px-6 md:px-12 lg:px-24 pb-24">
      <motion.div style={{ y: y1 }} className="mb-12">
        <div className="flex items-center gap-4">
          <History className="w-6 h-6 text-violet-400" />
          <h2 className="text-3xl md:text-4xl font-light tracking-tight text-white/90">
            Analysis History
          </h2>
        </div>
      </motion.div>

      <div className="space-y-3">
        {jobs.map((job, index) => (
          <motion.div
            key={job.id}
            style={{ y: index % 2 === 0 ? y2 : y3 }}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08, type: "spring", stiffness: 150, damping: 20 }}
            onClick={() => onLoadJob(job)}
            className="group flex items-center justify-between p-5 bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-sm border border-white/5 hover:border-white/10 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-6">
              <span className="text-xs font-mono text-white/30">
                #{job.id.toString().padStart(4, "0")}
              </span>
              <div>
                <h3 className="text-lg font-medium text-white/80 group-hover:text-white">
                  {job.job_type.toUpperCase()}
                </h3>
                <p className="text-sm font-mono text-white/40">
                  {new Date(job.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={(e) => handleDownload(job.id, e)}
                className="p-2 rounded-full bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/50 transition-all"
              >
                {downloadSuccess === job.id ? (
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Download className="w-4 h-4 text-white/60 group-hover:text-cyan-400" />
                )}
              </button>
              <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
};

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function CinematicGenomicCommandCenter() {
  const { springX, springY, mouseX, mouseY } = useMouseSpotlight();
  const [fastaRecords, setFastaRecords] = useState<FastaRecord[]>([]);
  const [alignment, setAlignment] = useState<AlignmentResult | null>(null);
  const [stability, setStability] = useState<StabilityResult | null>(null);
  const [history, setHistory] = useState<JobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [view, setView] = useState<"dropzone" | "analysis">("dropzone");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/history?limit=10");
      if (response.ok) {
        const data = await response.json();
        setHistory(data.records);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const handleFastaDrop = async (text: string) => {
    setIsLoading(true);
    try {
      // Parse FASTA
      const parseResponse = await fetch("http://localhost:8000/api/fasta/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fasta_text: text }),
      });

      if (!parseResponse.ok) throw new Error("Parse failed");
      const parseData = await parseResponse.json();
      setFastaRecords(parseData.records);

      if (parseData.records.length >= 2) {
        // Run alignment
        const alignResponse = await fetch("http://localhost:8000/api/align/local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sequence_1: parseData.records[0].sequence.slice(0, 80),
            sequence_2: parseData.records[1].sequence.slice(0, 80),
          }),
        });

        if (!alignResponse.ok) throw new Error("Alignment failed");
        const alignData = await alignResponse.json();
        setAlignment(alignData);

        // Run stability analysis
        const stabilityResponse = await fetch("http://localhost:8000/api/analyze/stability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alignment_1: alignData.local_alignment_1 || alignData.alignment_1,
            alignment_2: alignData.local_alignment_2 || alignData.alignment_2,
          }),
        });

        if (!stabilityResponse.ok) throw new Error("Stability analysis failed");
        const stabilityData = await stabilityResponse.json();
        setStability(stabilityData);

        // Transition to analysis view
        setView("analysis");
      }
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveJob = async () => {
    if (!alignment) return;
    setIsSaving(true);

    try {
      const response = await fetch("http://localhost:8000/api/history/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_type: alignment.algorithm === "smith-waterman" ? "local" : "global",
          input_data: { sequences: fastaRecords.map((r) => r.id) },
          result_data: { alignment, stability },
          notes: "Cinematic Command Center Analysis",
        }),
      });

      if (response.ok) {
        setSaveSuccess(true);
        fetchHistory();
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <LayoutGroup>
      <main className="min-h-screen bg-[#030303] text-white overflow-x-hidden">
        {/* Background Effects */}
        <ParticleField mouseX={mouseX} mouseY={mouseY} />
        <Scanline />

        {/* Mouse Spotlight */}
        <motion.div
          className="fixed pointer-events-none z-50"
          style={{
            x: springX,
            y: springY,
            translateX: "-50%",
            translateY: "-50%",
          }}
        >
          <div
            className="w-[800px] h-[800px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(34,211,238,0.12) 0%, rgba(167,139,250,0.06) 40%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {view === "dropzone" ? (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -100 }}
              transition={{ duration: 0.5 }}
            >
              {/* Hero */}
              <section className="relative px-6 md:px-12 lg:px-24 pt-32 pb-16">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.h1
                    className="text-5xl md:text-7xl lg:text-8xl font-extralight tracking-tighter text-white/90"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    Genomic
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400">
                      Command Center
                    </span>
                  </motion.h1>
                  <p className="mt-6 text-lg md:text-xl text-white/40 font-mono max-w-2xl">
                    Advanced sequence alignment and mutation stability analysis powered by 
                    Smith-Waterman algorithms and ML prediction models.
                  </p>
                </motion.div>
              </section>

              {/* Drop Zone */}
              <section className="px-6 md:px-12 lg:px-24 mb-32">
                <DropZone
                  onDrop={handleFastaDrop}
                  isLoading={isLoading}
                  isDocked={false}
                />
              </section>

              {/* History */}
              <HistorySection jobs={history} onLoadJob={() => {}} />
            </motion.div>
          ) : (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <DropZone onDrop={() => {}} isLoading={false} isDocked={true} />
              {alignment && (
                <SpatialDataCanvas
                  alignment={alignment}
                  stability={stability}
                  fastaRecords={fastaRecords}
                  onSave={handleSaveJob}
                  isSaving={isSaving}
                  saveSuccess={saveSuccess}
                />
              )}
              <HistorySection jobs={history} onLoadJob={() => {}} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="px-6 md:px-12 lg:px-24 py-12 border-t border-white/5">
          <div className="flex justify-between items-center">
            <p className="text-white/30 font-mono text-xs">
              Cinematic Genomic Command Center v2.0
            </p>
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-white/40 font-mono text-xs">System Online</span>
            </div>
          </div>
        </footer>
      </main>
    </LayoutGroup>
  );
}
