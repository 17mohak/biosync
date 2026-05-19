"use client";

import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid3X3,
  Crosshair,
  Activity,
  Maximize2,
  Info,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface TracebackCell {
  x: number;
  y: number;
}

interface HoveredCell {
  x: number;
  y: number;
  score: number;
}

interface ExpandedMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  matrix: number[][];
  tracebackPath: TracebackCell[];
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Convert a score into RGBA components for canvas fillStyle.
 */
const scoreToHeatRGBA = (
  score: number,
  maxScore: number
): [number, number, number, number] => {
  if (maxScore <= 0 || score <= 0) return [139, 92, 246, 0.03];
  const t = Math.min(score / maxScore, 1);
  const opacity = 0.06 + t * 0.79;
  const r = Math.round(139 + t * 80);
  const g = Math.round(92 - t * 40);
  const b = Math.round(246 - t * 30);
  return [r, g, b, opacity];
};

/**
 * Build a lookup Set for O(1) traceback membership tests.
 */
const buildTracebackSet = (path: TracebackCell[]): Set<string> => {
  const set = new Set<string>();
  for (const cell of path) {
    set.add(`${cell.y},${cell.x}`);
  }
  return set;
};

// =============================================================================
// ZOOM CONTROLS
// =============================================================================

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 4.0;
const ZOOM_STEP = 0.25;

const ZoomControls: React.FC<{
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}> = ({ scale, onZoomIn, onZoomOut, onReset }) => (
  <div className="flex items-center gap-1.5">
    <motion.button
      onClick={onZoomOut}
      disabled={scale <= ZOOM_MIN}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="p-1.5 rounded-md bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      title="Zoom Out"
    >
      <ZoomOut className="w-4 h-4" />
    </motion.button>

    <div className="px-3 py-1 rounded-md bg-white/5 border border-white/10 min-w-[60px] text-center">
      <span className="text-xs font-mono text-white/70">
        {Math.round(scale * 100)}%
      </span>
    </div>

    <motion.button
      onClick={onZoomIn}
      disabled={scale >= ZOOM_MAX}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="p-1.5 rounded-md bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      title="Zoom In"
    >
      <ZoomIn className="w-4 h-4" />
    </motion.button>

    <motion.button
      onClick={onReset}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="p-1.5 rounded-md bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all ml-1"
      title="Reset Zoom"
    >
      <RotateCcw className="w-4 h-4" />
    </motion.button>
  </div>
);

// =============================================================================
// CELL INSPECTOR SIDEBAR
// =============================================================================

const CellInspector: React.FC<{
  hoveredCell: HoveredCell | null;
  maxScore: number;
  isTraceback: boolean;
}> = ({ hoveredCell, maxScore, isTraceback }) => (
  <div className="p-4 bg-white/[0.02] border border-white/10 rounded-lg">
    <div className="flex items-center gap-2 mb-3">
      <Crosshair className="w-4 h-4 text-cyan-400" />
      <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
        Cell Inspector
      </span>
    </div>

    {hoveredCell ? (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-md bg-white/[0.03] border border-white/5">
            <p className="text-[10px] font-mono text-white/40 uppercase">Row (Y)</p>
            <p className="text-lg font-light text-violet-400 mt-0.5">
              {hoveredCell.y}
            </p>
          </div>
          <div className="p-2 rounded-md bg-white/[0.03] border border-white/5">
            <p className="text-[10px] font-mono text-white/40 uppercase">Col (X)</p>
            <p className="text-lg font-light text-violet-400 mt-0.5">
              {hoveredCell.x}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-md bg-white/[0.03] border border-white/5">
          <p className="text-[10px] font-mono text-white/40 uppercase">Score</p>
          <p className="text-2xl font-light text-white mt-0.5">
            {hoveredCell.score}
          </p>
          {maxScore > 0 && (
            <div className="mt-2">
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min((hoveredCell.score / maxScore) * 100, 100)}%`,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              </div>
              <p className="text-[10px] font-mono text-white/30 mt-1 text-right">
                {((hoveredCell.score / maxScore) * 100).toFixed(1)}% of peak
              </p>
            </div>
          )}
        </div>

        {isTraceback && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-3 py-2 rounded-md bg-cyan-500/10 border border-cyan-500/30"
          >
            <p className="text-xs font-mono text-cyan-400">
              ✦ On Traceback Path
            </p>
          </motion.div>
        )}
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center mb-3">
          <Crosshair className="w-5 h-5 text-white/20" />
        </div>
        <p className="text-xs text-white/30 font-mono">Hover to inspect</p>
        <p className="text-[10px] text-white/20 font-mono mt-1">
          Move cursor over any cell
        </p>
      </div>
    )}
  </div>
);

// =============================================================================
// STATISTICS SIDEBAR
// =============================================================================

const StatisticsSidebar: React.FC<{
  matrix: number[][];
  maxScore: number;
  tracebackLength: number;
  hoveredCell: HoveredCell | null;
  isHoveredOnTraceback: boolean;
}> = ({ matrix, maxScore, tracebackLength, hoveredCell, isHoveredOnTraceback }) => {
  const rows = matrix.length;
  const cols = rows > 0 ? matrix[0].length : 0;

  return (
    <div className="w-64 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
      {/* Algorithm info */}
      <div className="p-4 bg-white/[0.02] border border-white/10 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
            Matrix Statistics
          </span>
        </div>

        <div className="space-y-2.5">
          {[
            { label: "Algorithm", value: "Smith-Waterman", color: "text-emerald-400" },
            { label: "Peak Score", value: String(maxScore), color: "text-cyan-400" },
            { label: "Dimensions", value: `${rows} × ${cols}`, color: "text-violet-400" },
            { label: "Total Cells", value: (rows * cols).toLocaleString(), color: "text-amber-400" },
            { label: "Traceback Length", value: String(tracebackLength), color: "text-rose-400" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0"
            >
              <span className="text-xs font-mono text-white/40">{stat.label}</span>
              <span className={`text-xs font-mono ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cell inspector */}
      <CellInspector
        hoveredCell={hoveredCell}
        maxScore={maxScore}
        isTraceback={isHoveredOnTraceback}
      />

      {/* Legend */}
      <div className="p-4 bg-white/[0.02] border border-white/10 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-white/40" />
          <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
            Legend
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-violet-500/80 to-fuchsia-500/80 border border-violet-400/30" />
            <span className="text-xs text-white/40 font-mono">High score</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-violet-500/10 border border-white/5" />
            <span className="text-xs text-white/40 font-mono">Low score</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-cyan-400/50 border border-cyan-400/40 shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
            <span className="text-xs text-white/40 font-mono">Traceback path</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// CANVAS MATRIX RENDERER
// =============================================================================

const CanvasMatrix: React.FC<{
  matrix: number[][];
  maxScore: number;
  tracebackSet: Set<string>;
  onCellHover: (cell: HoveredCell | null) => void;
  scale: number;
  isVisible: boolean;
}> = ({ matrix, maxScore, tracebackSet, onCellHover, scale, isVisible }) => {
  const constraintRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rows = matrix.length;
  const cols = rows > 0 ? matrix[0].length : 0;

  // Dynamic cell size based on matrix density
  const cellSize = useMemo(() => {
    if (cols > 200 || rows > 200) return 5;
    if (cols > 100 || rows > 100) return 6;
    if (cols > 50 || rows > 50) return 8;
    return 10;
  }, [rows, cols]);

  const canvasWidth = cols * cellSize;
  const canvasHeight = rows * cellSize;

  // Paint the matrix onto the canvas — deferred to unblock the animation thread
  useEffect(() => {
    if (!isVisible || !canvasRef.current || rows === 0 || cols === 0) return;

    const handle = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw each cell
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const score = matrix[y][x];
          const isTraceback = tracebackSet.has(`${y},${x}`);

          if (isTraceback) {
            // Bright cyan for traceback path
            ctx.fillStyle = "rgba(34, 211, 238, 0.55)";
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

            // Glow border for traceback cells
            ctx.strokeStyle = "rgba(34, 211, 238, 0.7)";
            ctx.lineWidth = 1;
            ctx.strokeRect(
              x * cellSize + 0.5,
              y * cellSize + 0.5,
              cellSize - 1,
              cellSize - 1
            );
          } else {
            const [r, g, b, a] = scoreToHeatRGBA(score, maxScore);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }

      // Draw subtle grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 0.5;
      for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(canvasWidth, y * cellSize);
        ctx.stroke();
      }
      for (let x = 0; x <= cols; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, canvasHeight);
        ctx.stroke();
      }
    });

    return () => cancelAnimationFrame(handle);
  }, [isVisible, matrix, maxScore, tracebackSet, rows, cols, cellSize, canvasWidth, canvasHeight]);

  // Handle mouse hover — compute cell from cursor position
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      // Account for CSS scaling from the parent transform
      const cssScaleX = rect.width / canvas.width;
      const cssScaleY = rect.height / canvas.height;

      const mouseX = (e.clientX - rect.left) / cssScaleX;
      const mouseY = (e.clientY - rect.top) / cssScaleY;

      const cellX = Math.floor(mouseX / cellSize);
      const cellY = Math.floor(mouseY / cellSize);

      if (cellX >= 0 && cellX < cols && cellY >= 0 && cellY < rows) {
        onCellHover({ x: cellX, y: cellY, score: matrix[cellY][cellX] });
      } else {
        onCellHover(null);
      }
    },
    [cellSize, cols, rows, matrix, onCellHover]
  );

  const handleMouseLeave = useCallback(() => {
    onCellHover(null);
  }, [onCellHover]);

  return (
    <div
      ref={constraintRef}
      className="flex-1 overflow-hidden relative rounded-lg border border-white/5 bg-black/30"
    >
      {/* Corner fade overlays for depth */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#08080a] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#08080a] to-transparent" />
        <div className="absolute top-0 bottom-0 left-0 w-6 bg-gradient-to-r from-[#08080a] to-transparent" />
        <div className="absolute top-0 bottom-0 right-0 w-6 bg-gradient-to-l from-[#08080a] to-transparent" />
      </div>

      {/* Pannable / zoomable surface */}
      <motion.div
        drag
        dragConstraints={constraintRef}
        dragElastic={0.1}
        dragMomentum={false}
        className="cursor-grab active:cursor-grabbing p-4"
        style={{
          transformOrigin: "top left",
          width: "fit-content",
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair rounded-sm"
          style={{
            width: canvasWidth * scale,
            height: canvasHeight * scale,
            imageRendering: "pixelated",
          }}
        />
      </motion.div>
    </div>
  );
};

// =============================================================================
// MAIN MODAL COMPONENT
// =============================================================================

export const ExpandedMatrixModal: React.FC<ExpandedMatrixModalProps> = ({
  isOpen,
  onClose,
  matrix,
  tracebackPath,
}) => {
  const [scale, setScale] = useState(1);
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  // Reset canvas readiness when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Delay canvas paint so Framer Motion entry animation plays unblocked
      const timer = setTimeout(() => setIsCanvasReady(true), 250);
      return () => clearTimeout(timer);
    } else {
      setIsCanvasReady(false);
      setScale(1);
      setHoveredCell(null);
    }
  }, [isOpen]);

  // Derived values
  const maxScore = useMemo(() => {
    let peak = 0;
    for (const row of matrix) {
      for (const val of row) {
        if (val > peak) peak = val;
      }
    }
    return peak;
  }, [matrix]);

  const tracebackSet = useMemo(
    () => buildTracebackSet(tracebackPath),
    [tracebackPath]
  );

  const isHoveredOnTraceback = useMemo(() => {
    if (!hoveredCell) return false;
    return tracebackSet.has(`${hoveredCell.y},${hoveredCell.x}`);
  }, [hoveredCell, tracebackSet]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + ZOOM_STEP, ZOOM_MAX));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - ZOOM_STEP, ZOOM_MIN));
  }, []);

  const handleZoomReset = useCallback(() => {
    setScale(1);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="matrix-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="matrix-modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-6xl h-[85vh] bg-[#08080a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* ============================================================= */}
            {/* HEADER                                                        */}
            {/* ============================================================= */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
                  <Grid3X3 className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-white/90">
                    Alignment Score Matrix
                  </h2>
                  <p className="text-[10px] font-mono text-white/40 mt-0.5">
                    Smith-Waterman Local Alignment &bull; Canvas Renderer
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <ZoomControls
                  scale={scale}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onReset={handleZoomReset}
                />

                <div className="w-px h-6 bg-white/10" />

                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* ============================================================= */}
            {/* BODY                                                          */}
            {/* ============================================================= */}
            <div className="flex-1 flex gap-4 p-4 min-h-0">
              {/* Sidebar */}
              <StatisticsSidebar
                matrix={matrix}
                maxScore={maxScore}
                tracebackLength={tracebackPath.length}
                hoveredCell={hoveredCell}
                isHoveredOnTraceback={isHoveredOnTraceback}
              />

              {/* Canvas matrix */}
              <CanvasMatrix
                matrix={matrix}
                maxScore={maxScore}
                tracebackSet={tracebackSet}
                onCellHover={setHoveredCell}
                scale={scale}
                isVisible={isCanvasReady}
              />
            </div>

            {/* ============================================================= */}
            {/* FOOTER STATUS BAR                                             */}
            {/* ============================================================= */}
            <div className="flex items-center justify-between px-6 py-2.5 border-t border-white/[0.06] bg-white/[0.01]">
              <div className="flex items-center gap-4 text-[10px] font-mono text-white/30">
                <span>
                  {matrix.length} × {matrix[0]?.length || 0} matrix
                </span>
                <span>•</span>
                <span>
                  Traceback: {tracebackPath.length} cells
                </span>
                <span>•</span>
                <span>
                  Peak: {maxScore}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-white/30">
                <Maximize2 className="w-3 h-3" />
                <span>Drag to pan &bull; Zoom controls above</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExpandedMatrixModal;
