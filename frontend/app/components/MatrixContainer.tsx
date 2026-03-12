"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Activity, Maximize2 } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface MatrixCell {
  i: number;
  j: number;
  value: number;
}

interface MatrixContainerProps {
  matrix: number[][];
  seq1: string;
  seq2: string;
  maxDisplayRows?: number;
  maxDisplayCols?: number;
}

// =============================================================================
// MATRIX CONTAINER COMPONENT
// =============================================================================

export const MatrixContainer: React.FC<MatrixContainerProps> = ({
  matrix,
  seq1,
  seq2,
  maxDisplayRows = 50,
  maxDisplayCols = 50,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ i: number; j: number } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate max value for intensity
  const { maxVal, minVal } = useMemo(() => {
    const allValues = matrix.flat();
    return {
      maxVal: Math.max(...allValues),
      minVal: Math.min(...allValues.filter((v) => v > 0)) || 0,
    };
  }, [matrix]);

  // Calculate optimal path from a cell
  const calculatePath = (
    startI: number,
    startJ: number
  ): Array<{ i: number; j: number }> => {
    const path: Array<{ i: number; j: number }> = [];
    let i = startI;
    let j = startJ;

    while (i > 0 && j > 0 && matrix[i]?.[j] > 0) {
      path.push({ i, j });
      const current = matrix[i][j];
      const diag = matrix[i - 1]?.[j - 1] ?? -1;
      const up = matrix[i - 1]?.[j] ?? -1;
      const left = matrix[i]?.[j - 1] ?? -1;

      const diagScore = i > 0 && j > 0 ? (seq1[i - 1] === seq2[j - 1] ? 1 : -1) : -999;

      if (diag >= up && diag >= left && current === diag + diagScore) {
        i--;
        j--;
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

  // Determine display limits
  const displayRows = isExpanded ? matrix.length : Math.min(matrix.length, maxDisplayRows);
  const displayCols = isExpanded
    ? matrix[0]?.length || 0
    : Math.min(matrix[0]?.length || 0, maxDisplayCols);

  // Calculate path cells
  const pathCells = hoveredCell ? calculatePath(hoveredCell.i, hoveredCell.j) : [];
  const pathSet = new Set(pathCells.map((p) => `${p.i}-${p.j}`));

  // Determine if row/column is hovered
  const hoveredRow = hoveredCell?.i ?? null;
  const hoveredCol = hoveredCell?.j ?? null;

  // DOM Safeguard: Prevent browser freeze on massive sequences
  const sequenceLength = Math.max(seq1.length, seq2.length);
  if (sequenceLength > 200) {
    return (
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-mono text-white/40 uppercase tracking-widest">
              Smith-Waterman Matrix
            </span>
          </div>
          <span className="text-xs font-mono text-white/30">
            Max: <span className="text-violet-400">{maxVal}</span>
          </span>
        </div>

        {/* Safeguard Message */}
        <div className="p-8 text-center bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-white/50"
          >
            <Activity className="w-12 h-12 mx-auto mb-4 text-white/20" />
            <p className="text-lg font-light mb-2">Matrix Visualization Limited</p>
            <p className="text-sm text-white/40 font-mono">
              Sequence exceeds 200bp. Showing isolated hotspots above.
            </p>
            <p className="text-xs text-white/30 mt-4">
              ({sequenceLength} base pairs analyzed)
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: hoveredCell ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Activity className="w-4 h-4 text-violet-400" />
          </motion.div>
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">
            Smith-Waterman Matrix
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-white/30">
            Max: <span className="text-violet-400">{maxVal}</span>
          </span>
          {(matrix.length > maxDisplayRows || matrix[0]?.length > maxDisplayCols) && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-violet-500/40 transition-all"
            >
              <Maximize2 className="w-3 h-3 text-white/60" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Matrix Container with Custom Scrollbar */}
      <div
        className={`
          relative bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-sm
          ${isExpanded ? "max-h-[70vh]" : "max-h-[600px]"}
          overflow-auto
          matrix-scroll-container
        `}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(167, 139, 250, 0.3) transparent",
        }}
      >
        <LayoutGroup>
          {/* Grid */}
          <div
            className="inline-grid gap-[1px] p-4 min-w-full"
            style={{
              gridTemplateColumns: `repeat(${displayCols}, minmax(28px, 1fr))`,
            }}
          >
            {/* Column headers */}
            <div className="col-span-full grid grid-cols-subgrid">
              <div className="w-8 h-8" /> {/* Corner cell */}
              {Array.from(seq2.slice(0, displayCols - 1)).map((base: string, j: number) => (
                <motion.div
                  key={`col-${j}`}
                  className={`
                    w-7 h-7 flex items-center justify-center
                    text-[10px] font-mono font-bold
                    ${hoveredCol === j + 1 ? "text-violet-300 bg-violet-500/20" : "text-white/40"}
                  `}
                  animate={{
                    backgroundColor:
                      hoveredCol === j + 1 ? "rgba(167, 139, 250, 0.15)" : "transparent",
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {base}
                </motion.div>
              ))}
            </div>

            {/* Matrix rows */}
            {matrix.slice(0, displayRows).map((row, i) => (
              <div key={i} className="col-span-full grid grid-cols-subgrid">
                {/* Row header */}
                <motion.div
                  className={`
                    w-7 h-7 flex items-center justify-center
                    text-[10px] font-mono font-bold sticky left-0
                    ${hoveredRow === i ? "text-violet-300 bg-violet-500/20" : "text-white/40"}
                  `}
                  animate={{
                    backgroundColor:
                      hoveredRow === i ? "rgba(167, 139, 250, 0.15)" : "transparent",
                  }}
                  transition={{ duration: 0.2 }}
                  style={{ background: "#030303" }}
                >
                  {seq1[i] || ""}
                </motion.div>

                {/* Row cells */}
                {row.slice(0, displayCols - 1).map((val, j) => {
                  const actualJ = j + 1;
                  const isInPath = pathSet.has(`${i}-${actualJ}`);
                  const isHovered = hoveredCell?.i === i && hoveredCell?.j === actualJ;
                  const isInHoveredRow = hoveredRow === i;
                  const isInHoveredCol = hoveredCol === actualJ;

                  // Calculate intensity
                  const intensity =
                    maxVal > minVal ? (val - minVal) / (maxVal - minVal) : 0;

                  // Determine background color
                  let bgColor = "rgba(255,255,255,0.02)";
                  if (isInPath) {
                    bgColor = "rgba(34, 211, 238, 0.5)";
                  } else if (val > 0) {
                    bgColor = `rgba(167, 139, 250, ${0.1 + intensity * 0.4})`;
                  }

                  // Highlight row/column
                  if (isInHoveredRow || isInHoveredCol) {
                    bgColor = isInPath
                      ? "rgba(34, 211, 238, 0.7)"
                      : `rgba(167, 139, 250, ${0.2 + intensity * 0.3})`;
                  }

                  return (
                    <motion.div
                      key={`${i}-${actualJ}`}
                      layoutId={`matrix-cell-${i}-${actualJ}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: 1,
                        scale: isHovered ? 1.2 : isInPath ? 1.1 : 1,
                        backgroundColor: bgColor,
                      }}
                      transition={{
                        delay: (i * displayCols + actualJ) * 0.001,
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                      }}
                      onMouseEnter={() => setHoveredCell({ i, j: actualJ })}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`
                        w-7 h-7 flex items-center justify-center
                        text-[9px] font-mono cursor-crosshair rounded-sm
                        ${isInPath ? "text-white font-bold z-20" : val > 0 ? "text-white/60" : "text-white/20"}
                        ${isHovered ? "z-30" : ""}
                      `}
                      style={{
                        boxShadow: isInPath
                          ? "0 0 15px rgba(34, 211, 238, 0.6), inset 0 0 8px rgba(34, 211, 238, 0.3)"
                          : isHovered
                          ? "0 0 12px rgba(167, 139, 250, 0.8)"
                          : isInHoveredRow || isInHoveredCol
                          ? "0 0 4px rgba(167, 139, 250, 0.3)"
                          : val > maxVal * 0.8
                          ? `0 0 ${val * 0.2}px rgba(167, 139, 250, ${0.3 + intensity * 0.3})`
                          : "none",
                      }}
                    >
                      {val > 0 ? val : ""}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </LayoutGroup>

        {/* Neural Trace Line SVG Overlay */}
        <AnimatePresence>
          {pathCells.length > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none overflow-visible z-10"
              style={{
                width: "100%",
                height: "100%",
                padding: "16px",
              }}
            >
              <defs>
                <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="50%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <motion.path
                d={pathCells
                  .map((p, idx) => {
                    // Calculate position based on grid
                    const cellSize = 28; // w-7 = 28px
                    const gap = 1; // gap-[1px]
                    const offsetX = 28 + 16; // row header width + padding
                    const offsetY = 28 + 16; // col header height + padding
                    const x = offsetX + p.j * (cellSize + gap) + cellSize / 2;
                    const y = offsetY + p.i * (cellSize + gap) + cellSize / 2;
                    return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="url(#neuralGradient)"
                strokeWidth="2"
                filter="url(#glow)"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </svg>
          )}
        </AnimatePresence>

        {/* Dimension indicator */}
        {(matrix.length > displayRows || matrix[0]?.length > displayCols) && !isExpanded && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-[10px] font-mono text-white/40">
            {matrix.length}×{matrix[0]?.length} — Click expand for full view
          </div>
        )}
      </div>

      {/* Hover info */}
      <AnimatePresence>
        {hoveredCell && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 flex items-center justify-between text-xs font-mono"
          >
            <div className="flex items-center gap-4">
              <span className="text-white/30">
                Position: <span className="text-violet-400">[{hoveredCell.i}, {hoveredCell.j}]</span>
              </span>
              <span className="text-white/30">
                Score: <span className="text-cyan-400">{matrix[hoveredCell.i]?.[hoveredCell.j]}</span>
              </span>
            </div>
            <span className="text-white/20">{pathCells.length} cells in optimal path</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MatrixContainer;
