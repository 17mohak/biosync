"use client";

import React from "react";
import { motion } from "framer-motion";
import { Grid3X3, ZoomOut } from "lucide-react";

interface MatrixContainerProps {
  matrix: number[][];
  seq1: string;
  seq2: string;
  matrix_compressed?: boolean;
  maxDisplayRows?: number;
  maxDisplayCols?: number;
}

export const MatrixContainer: React.FC<MatrixContainerProps> = ({
  matrix,
  seq1,
  seq2,
  matrix_compressed = false,
  maxDisplayRows = 20,
  maxDisplayCols = 24,
}) => {
  // If matrix is empty, show placeholder
  if (!matrix || matrix.length === 0) {
    return (
      <div className="p-6 text-center text-white/40 font-mono text-sm">
        No matrix data available
      </div>
    );
  }

  // Calculate display dimensions
  const displayRows = Math.min(matrix.length, maxDisplayRows);
  const displayCols = Math.min(matrix[0]?.length || 0, maxDisplayCols);

  // Find max value for color scaling
  const flatMatrix = matrix.flat();
  const maxVal = Math.max(...flatMatrix.map(Math.abs), 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative"
    >
      {/* Header with badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-white/50" />
          <span className="text-xs font-mono text-white/50 uppercase tracking-wider">
            Scoring Matrix
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
              Downsampled View
            </span>
          </motion.div>
        )}
      </div>

      {/* Matrix Grid - Using CSS Grid */}
      <div 
        className="grid gap-[1px] bg-white/5 p-1 rounded-lg overflow-auto max-h-[400px]"
        style={{
          gridTemplateColumns: `repeat(${displayCols}, minmax(0, 1fr))`,
        }}
      >
        {matrix.slice(0, displayRows).map((row, i) => (
          row.slice(0, displayCols).map((cell, j) => {
            // Calculate color intensity
            const intensity = Math.abs(cell) / maxVal;
            const isPositive = cell >= 0;
            
            return (
              <div
                key={`${i}-${j}`}
                className="w-3 h-3 rounded-sm transition-colors duration-200 hover:scale-110"
                style={{
                  backgroundColor: isPositive
                    ? `rgba(34, 211, 238, ${intensity * 0.8})`
                    : `rgba(244, 63, 94, ${intensity * 0.8})`,
                }}
                title={`[${i}, ${j}]: ${cell}`}
              />
            );
          })
        ))}
      </div>

      {/* Matrix dimensions info */}
      <div className="mt-2 text-[10px] font-mono text-white/30 flex items-center justify-between">
        <span>Showing {displayRows}×{displayCols} of {matrix.length}×{matrix[0]?.length || 0}</span>
        {matrix_compressed && (
          <span>Original downsampled via max pooling</span>
        )}
      </div>
    </motion.div>
  );
};

export default MatrixContainer;
