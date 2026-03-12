"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Activity, ZoomOut } from "lucide-react";

interface MatrixContainerProps {
  matrix: number[][];
  seq1: string;
  seq2: string;
  matrix_compressed?: boolean;
}

export const MatrixContainer: React.FC<MatrixContainerProps> = ({
  matrix,
  seq1,
  seq2,
  matrix_compressed = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const [hoveredCell, setHoveredCell] = useState<{ i: number; j: number; value: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Find max value for color scaling
  const maxVal = Math.max(...matrix.flat().map(Math.abs), 1);
  const minDisplayDimension = 50; // Don't show text if matrix is larger than this
  const shouldShowText = matrix.length <= minDisplayDimension && (matrix[0]?.length || 0) <= minDisplayDimension;

  // Color interpolation function
  const getHeatmapColor = (value: number, intensity: number): string => {
    const normalized = Math.abs(value) / maxVal;
    
    if (normalized === 0) {
      return `rgba(255, 255, 255, ${0.02 * intensity})`;
    }
    
    // Define color stops for heatmap
    // 0.0 - 0.3: Deep Violet (139, 92, 246)
    // 0.3 - 0.7: Cyan (6, 182, 212)  
    // 0.7 - 1.0: Glowing Emerald (16, 185, 129)
    
    let r, g, b, a;
    
    if (normalized <= 0.3) {
      // Violet range with varying alpha
      const t = normalized / 0.3;
      r = 139;
      g = 92;
      b = 246;
      a = 0.1 + t * 0.3;
    } else if (normalized <= 0.7) {
      // Cyan range
      const t = (normalized - 0.3) / 0.4;
      r = Math.round(139 + (6 - 139) * t);
      g = Math.round(92 + (182 - 92) * t);
      b = Math.round(246 + (212 - 246) * t);
      a = 0.4 + t * 0.3;
    } else {
      // Emerald range
      const t = (normalized - 0.7) / 0.3;
      r = Math.round(6 + (16 - 6) * t);
      g = Math.round(182 + (185 - 182) * t);
      b = Math.round(212 + (129 - 212) * t);
      a = 0.7 + t * 0.3;
    }
    
    // Apply intensity boost for flashlight effect
    a = Math.min(1, a * intensity);
    
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  // Main draw function
  const drawMatrix = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    // Set canvas dimensions accounting for DPR
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale context for DPR
    ctx.scale(dpr, dpr);
    
    // Set display size
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    if (!matrix || matrix.length === 0) return;
    
    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;
    
    // Calculate cell size
    const cellWidth = rect.width / cols;
    const cellHeight = rect.height / rows;
    const cellSize = Math.min(cellWidth, cellHeight);
    
    // Center the matrix
    const offsetX = (rect.width - cols * cellSize) / 2;
    const offsetY = (rect.height - rows * cellSize) / 2;
    
    const mouseX = mouseRef.current.x;
    const mouseY = mouseRef.current.y;
    const flashlightRadius = 100;
    
    // Draw each cell
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const value = matrix[i][j];
        const x = offsetX + j * cellSize;
        const y = offsetY + i * cellSize;
        
        // Calculate distance to mouse for flashlight effect
        const cellCenterX = x + cellSize / 2;
        const cellCenterY = y + cellSize / 2;
        const distance = Math.sqrt(
          Math.pow(mouseX - cellCenterX, 2) + 
          Math.pow(mouseY - cellCenterY, 2)
        );
        
        // Calculate intensity boost based on distance
        let intensity = 1;
        if (distance < flashlightRadius) {
          const t = 1 - distance / flashlightRadius;
          intensity = 1 + t * 2; // Boost up to 3x brightness
        }
        
        // Draw cell background
        ctx.fillStyle = getHeatmapColor(value, intensity);
        ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
        
        // Draw text if matrix is small enough and cell is large enough
        if (shouldShowText && cellSize > 20 && value !== 0) {
          ctx.fillStyle = intensity > 1.5 ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.5)";
          ctx.font = `${Math.min(12, cellSize * 0.5)}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(value.toString(), x + cellSize / 2, y + cellSize / 2);
        }
      }
    }
    
    // Draw grid lines (subtle)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 0.5;
    
    // Vertical lines
    for (let j = 0; j <= cols; j++) {
      const x = offsetX + j * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + rows * cellSize);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 0; i <= rows; i++) {
      const y = offsetY + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + cols * cellSize, y);
      ctx.stroke();
    }
  }, [matrix, maxVal, shouldShowText]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const rect = canvas.getBoundingClientRect();
    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;
    
    // Calculate cell size (same as in draw)
    const cellWidth = rect.width / cols;
    const cellHeight = rect.height / rows;
    const cellSize = Math.min(cellWidth, cellHeight);
    
    // Calculate offsets (same as in draw)
    const offsetX = (rect.width - cols * cellSize) / 2;
    const offsetY = (rect.height - rows * cellSize) / 2;
    
    // Update mouse position
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    // Calculate hovered cell
    const relativeX = mouseRef.current.x - offsetX;
    const relativeY = mouseRef.current.y - offsetY;
    
    const j = Math.floor(relativeX / cellSize);
    const i = Math.floor(relativeY / cellSize);
    
    if (i >= 0 && i < rows && j >= 0 && j < cols) {
      setHoveredCell({ i, j, value: matrix[i][j] });
    } else {
      setHoveredCell(null);
    }
    
    // Trigger redraw
    requestAnimationFrame(drawMatrix);
  }, [matrix, drawMatrix]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -1000, y: -1000 };
    setHoveredCell(null);
    requestAnimationFrame(drawMatrix);
  }, [drawMatrix]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
        requestAnimationFrame(drawMatrix);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [drawMatrix]);

  // Initial draw
  useEffect(() => {
    requestAnimationFrame(drawMatrix);
  }, [drawMatrix, dimensions]);

  // If matrix is empty, show placeholder
  if (!matrix || matrix.length === 0) {
    return (
      <div className="p-6 text-center text-white/40 font-mono text-sm">
        No matrix data available
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
            Smith-Waterman Matrix
          </span>
        </div>

        {/* Compression Badge */}
        {matrix_compressed && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full"
          >
            <ZoomOut className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-mono text-amber-400">
              Downsampled
            </span>
          </motion.div>
        )}
      </div>

      {/* Premium Canvas Container */}
      <div 
        ref={containerRef}
        className="relative w-full aspect-square md:aspect-video rounded-2xl overflow-hidden border border-white/10 bg-[#030303] shadow-[0_0_50px_rgba(16,185,129,0.1)]"
      >
        {/* Hardware Accelerated Badge */}
        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-mono text-cyan-400 flex items-center gap-2 z-10">
          <Activity className="w-3 h-3" />
          Hardware Accelerated
        </div>

        {/* Matrix Info Badge */}
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-[10px] font-mono text-white/50 z-10">
          {matrix.length} × {matrix[0]?.length || 0} cells
        </div>

        {/* The Canvas */}
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="absolute inset-0 cursor-crosshair"
          style={{ touchAction: "none" }}
        />

        {/* Hover Info Overlay */}
        {hoveredCell && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-4 left-4 px-3 py-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono z-10"
          >
            <span className="text-white/50">Position: </span>
            <span className="text-violet-400">[{hoveredCell.i}, {hoveredCell.j}]</span>
            <span className="text-white/50 mx-2">|</span>
            <span className="text-white/50">Score: </span>
            <span className="text-cyan-400">{hoveredCell.value}</span>
          </motion.div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-emerald-500/80" />
            <span className="text-[10px] font-mono text-white/40">High Score</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-cyan-500/60" />
            <span className="text-[10px] font-mono text-white/40">Medium Score</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-violet-500/40" />
            <span className="text-[10px] font-mono text-white/40">Low Score</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <p className="mt-3 text-[10px] font-mono text-white/30 text-center">
        Hover to reveal the flashlight effect • Colors indicate score intensity
      </p>
    </div>
  );
};

export default MatrixContainer;
