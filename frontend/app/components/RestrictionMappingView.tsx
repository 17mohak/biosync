"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Loader2, AlertCircle, Dna, Zap, FlaskConical } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// =============================================================================
// TYPES
// =============================================================================

interface CutSite {
  enzyme_name: string;
  recognition_sequence: string;
  cut_position: number;
}

interface RestrictionMapResult {
  cut_sites: CutSite[];
  fragment_sizes: number[];
  total_cuts: number;
  sequence_length: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const AVAILABLE_ENZYMES = [
  { name: "EcoRI", sequence: "GAATTC" },
  { name: "BamHI", sequence: "GGATCC" },
  { name: "HindIII", sequence: "AAGCTT" },
  { name: "TaqI", sequence: "TCGA" },
  { name: "NotI", sequence: "GCGGCCGC" },
];

const ENZYME_COLORS: Record<string, { border: string; bg: string; text: string; glow: string; marker: string }> = {
  EcoRI:   { border: "border-cyan-500/50",   bg: "bg-cyan-500/10",   text: "text-cyan-400",   glow: "shadow-cyan-500/20",   marker: "#22d3ee" },
  BamHI:   { border: "border-emerald-500/50", bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "shadow-emerald-500/20", marker: "#34d399" },
  HindIII: { border: "border-violet-500/50",  bg: "bg-violet-500/10",  text: "text-violet-400",  glow: "shadow-violet-500/20",  marker: "#a78bfa" },
  TaqI:    { border: "border-rose-500/50",    bg: "bg-rose-500/10",    text: "text-rose-400",    glow: "shadow-rose-500/20",    marker: "#fb7185" },
  NotI:    { border: "border-amber-500/50",   bg: "bg-amber-500/10",   text: "text-amber-400",   glow: "shadow-amber-500/20",   marker: "#fbbf24" },
};

const DEFAULT_SEQUENCE =
  "ATGAATTCGGATCCAAGCTTGCGGCCGCTCGAATGAATTCAAGCTTGGATCCGCGGCCGCTCGAATCGATCG";

// =============================================================================
// ENZYME TOGGLE BUTTON
// =============================================================================

const EnzymeToggle: React.FC<{
  enzyme: { name: string; sequence: string };
  isSelected: boolean;
  onToggle: (name: string) => void;
}> = ({ enzyme, isSelected, onToggle }) => {
  const colors = ENZYME_COLORS[enzyme.name] || ENZYME_COLORS.EcoRI;

  return (
    <motion.button
      onClick={() => onToggle(enzyme.name)}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      className={`
        relative px-4 py-3 rounded-xl border backdrop-blur-xl
        transition-all duration-300 overflow-hidden
        ${isSelected
          ? `${colors.border} ${colors.bg} shadow-lg ${colors.glow}`
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20"
        }
      `}
    >
      {/* Active glow background */}
      {isSelected && (
        <motion.div
          layoutId={`enzyme-glow-${enzyme.name}`}
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at center, ${colors.marker}33 0%, transparent 70%)`,
          }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <Scissors className={`w-3.5 h-3.5 ${isSelected ? colors.text : "text-white/30"}`} />
          <span className={`text-sm font-medium ${isSelected ? colors.text : "text-white/60"}`}>
            {enzyme.name}
          </span>
        </div>
        <span className={`text-[10px] font-mono ${isSelected ? "text-white/50" : "text-white/25"}`}>
          {enzyme.sequence}
        </span>
      </div>
    </motion.button>
  );
};

// =============================================================================
// DNA RULER / LINEAR VISUALIZER
// =============================================================================

const DNARuler: React.FC<{
  result: RestrictionMapResult;
}> = ({ result }) => {
  const [hoveredSite, setHoveredSite] = useState<CutSite | null>(null);
  const seqLen = result.sequence_length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="relative rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-white/90 mb-1">Linear Restriction Map</h3>
          <p className="text-xs font-mono text-white/40">
            {seqLen.toLocaleString()} bp · {result.total_cuts} cut site{result.total_cuts !== 1 ? "s" : ""} identified
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs font-mono text-white/30">
          <Dna className="w-4 h-4" />
          <span>5&apos; → 3&apos;</span>
        </div>
      </div>

      {/* The ruler */}
      <div className="relative mx-4 mb-8">
        {/* Base DNA strand line */}
        <div className="relative h-16 flex items-center">
          {/* Main strand */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 via-violet-500/15 to-emerald-500/20" />
          {/* Glow effect */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 rounded-full bg-gradient-to-r from-cyan-500/10 via-violet-500/8 to-emerald-500/10 blur-sm" />

          {/* Start marker */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/20 border border-white/30" />
          <span className="absolute left-0 -bottom-1 -translate-x-1/2 text-[9px] font-mono text-white/30">0</span>

          {/* End marker */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/20 border border-white/30" />
          <span className="absolute right-0 -bottom-1 translate-x-1/2 text-[9px] font-mono text-white/30">{seqLen}</span>

          {/* Cut site markers */}
          {result.cut_sites.map((site, i) => {
            const pct = (site.cut_position / seqLen) * 100;
            const colors = ENZYME_COLORS[site.enzyme_name] || ENZYME_COLORS.EcoRI;
            const isHovered = hoveredSite === site;

            return (
              <motion.div
                key={`${site.enzyme_name}-${site.cut_position}-${i}`}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.4, type: "spring" }}
                className="absolute top-0 bottom-0 flex flex-col items-center cursor-pointer"
                style={{ left: `${pct}%` }}
                onMouseEnter={() => setHoveredSite(site)}
                onMouseLeave={() => setHoveredSite(null)}
              >
                {/* Vertical cut line */}
                <div
                  className="w-0.5 h-full transition-all duration-200"
                  style={{
                    backgroundColor: colors.marker,
                    opacity: isHovered ? 1 : 0.7,
                    boxShadow: isHovered ? `0 0 12px ${colors.marker}` : `0 0 6px ${colors.marker}66`,
                  }}
                />

                {/* Glowing dot at intersection */}
                <motion.div
                  animate={isHovered ? { scale: 1.5 } : { scale: 1 }}
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: colors.marker,
                    boxShadow: `0 0 8px ${colors.marker}`,
                  }}
                />

                {/* Tooltip on hover */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      className="absolute -top-16 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg px-3 py-2 whitespace-nowrap z-20 shadow-2xl"
                    >
                      <p className="text-xs font-medium" style={{ color: colors.marker }}>
                        {site.enzyme_name}
                      </p>
                      <p className="text-[10px] font-mono text-white/50">
                        @ {site.cut_position} bp · <span className="text-white/30">{site.recognition_sequence}</span>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* Tick marks every 10% */}
          {Array.from({ length: 9 }, (_, i) => (i + 1) * 10).map((pct) => (
            <div
              key={`tick-${pct}`}
              className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-white/10"
              style={{ left: `${pct}%` }}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-white/5">
        {Object.entries(ENZYME_COLORS)
          .filter(([name]) => result.cut_sites.some((s) => s.enzyme_name === name))
          .map(([name, colors]) => {
            const count = result.cut_sites.filter((s) => s.enzyme_name === name).length;
            return (
              <div key={name} className="flex items-center gap-2 text-xs font-mono">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.marker, boxShadow: `0 0 6px ${colors.marker}66` }} />
                <span className="text-white/50">
                  {name} <span className="text-white/30">({count})</span>
                </span>
              </div>
            );
          })}
      </div>

      {/* Decorative glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-gradient-to-t from-violet-500/5 to-transparent pointer-events-none" />
    </motion.div>
  );
};

// =============================================================================
// FRAGMENT TABLE
// =============================================================================

const FragmentTable: React.FC<{
  result: RestrictionMapResult;
}> = ({ result }) => {
  const fragments = result.fragment_sizes;
  const maxFragment = Math.max(...fragments, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="relative rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-white/5 text-emerald-400">
          <FlaskConical className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white/90">Fragment Analysis</h3>
          <p className="text-xs font-mono text-white/40">
            {fragments.length} fragment{fragments.length !== 1 ? "s" : ""} generated
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-[10px] font-mono text-white/40 uppercase tracking-wider py-3 px-4">
                Fragment
              </th>
              <th className="text-right text-[10px] font-mono text-white/40 uppercase tracking-wider py-3 px-4">
                Size (bp)
              </th>
              <th className="text-left text-[10px] font-mono text-white/40 uppercase tracking-wider py-3 px-4 w-1/2">
                Relative Size
              </th>
              <th className="text-right text-[10px] font-mono text-white/40 uppercase tracking-wider py-3 px-4">
                % of Total
              </th>
            </tr>
          </thead>
          <tbody>
            {fragments.map((size, i) => {
              const pct = ((size / result.sequence_length) * 100);
              const barPct = (size / maxFragment) * 100;

              return (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.06, duration: 0.3 }}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-white/70 group-hover:text-white/90 transition-colors">
                      Fragment {i + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-mono text-cyan-400 font-medium">
                      {size.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ delay: 0.6 + i * 0.06, duration: 0.8 }}
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-500"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-xs font-mono text-white/40">
                      {pct.toFixed(1)}%
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-white/30">
        <span>Total: {result.sequence_length.toLocaleString()} bp</span>
        <span>
          Largest fragment: {Math.max(...fragments).toLocaleString()} bp · 
          Smallest: {Math.min(...fragments).toLocaleString()} bp
        </span>
      </div>

      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none" />
    </motion.div>
  );
};

// =============================================================================
// CUT SITES TABLE
// =============================================================================

const CutSitesTable: React.FC<{
  sites: CutSite[];
}> = ({ sites }) => {
  if (sites.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="relative rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 overflow-hidden"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-white/5 text-rose-400">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-white/90">Cut Site Details</h3>
          <p className="text-xs font-mono text-white/40">
            Individual recognition site positions
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-[10px] font-mono text-white/40 uppercase tracking-wider py-3 px-4">#</th>
              <th className="text-left text-[10px] font-mono text-white/40 uppercase tracking-wider py-3 px-4">Enzyme</th>
              <th className="text-left text-[10px] font-mono text-white/40 uppercase tracking-wider py-3 px-4">Recognition Seq</th>
              <th className="text-right text-[10px] font-mono text-white/40 uppercase tracking-wider py-3 px-4">Position (bp)</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site, i) => {
              const colors = ENZYME_COLORS[site.enzyme_name] || ENZYME_COLORS.EcoRI;
              return (
                <motion.tr
                  key={`${site.enzyme_name}-${site.cut_position}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-4 text-xs font-mono text-white/30">{i + 1}</td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-medium ${colors.text}`}>
                      {site.enzyme_name}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <code className="text-xs font-mono text-white/50 bg-white/5 px-2 py-1 rounded">
                      {site.recognition_sequence}
                    </code>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-mono text-white/70">{site.cut_position.toLocaleString()}</span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// =============================================================================
// MAIN RESTRICTION MAPPING VIEW
// =============================================================================

export const RestrictionMappingView: React.FC = () => {
  const [sequence, setSequence] = useState(DEFAULT_SEQUENCE);
  const [selectedEnzymes, setSelectedEnzymes] = useState<string[]>(["EcoRI", "BamHI", "HindIII"]);
  const [result, setResult] = useState<RestrictionMapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleEnzyme = useCallback((name: string) => {
    setSelectedEnzymes((prev) =>
      prev.includes(name) ? prev.filter((e) => e !== name) : [...prev, name]
    );
  }, []);

  const analyzeSequence = useCallback(async () => {
    if (!sequence.trim() || selectedEnzymes.length === 0) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/restriction/map`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sequence: sequence.trim(),
          enzymes: selectedEnzymes,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.detail || `Request failed (${response.status})`);
      }

      const data: RestrictionMapResult = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze sequence");
    } finally {
      setLoading(false);
    }
  }, [sequence, selectedEnzymes]);

  return (
    <div className="h-full overflow-y-auto px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            animate={{ rotate: [0, 15, 0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Scissors className="w-6 h-6 text-rose-400" />
          </motion.div>
          <h1 className="text-2xl font-light text-white/90">Restriction Enzyme Mapper</h1>
        </div>
        <p className="text-sm font-mono text-white/40">
          Select molecular scissors and analyze cut sites across your DNA sequence
        </p>
      </motion.div>

      {/* ── Control Panel ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 mb-6 overflow-hidden"
      >
        {/* Glassmorphism bg glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-rose-500/10 via-violet-500/5 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative z-10">
          {/* Sequence Input */}
          <div className="mb-6">
            <label className="text-xs font-mono text-white/40 uppercase tracking-wider mb-2 block">
              DNA Sequence
            </label>
            <textarea
              value={sequence}
              onChange={(e) => setSequence(e.target.value.toUpperCase())}
              placeholder="Enter DNA sequence (A, C, G, T)..."
              rows={3}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl
                text-sm font-mono text-white/80 placeholder:text-white/20
                focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/20
                transition-all resize-none"
            />
            <p className="text-[10px] font-mono text-white/25 mt-1">
              {sequence.replace(/\s/g, "").length.toLocaleString()} characters
            </p>
          </div>

          {/* Enzyme Selector */}
          <div className="mb-6">
            <label className="text-xs font-mono text-white/40 uppercase tracking-wider mb-3 block">
              Restriction Enzymes · <span className="text-white/20">{selectedEnzymes.length} selected</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_ENZYMES.map((enzyme) => (
                <EnzymeToggle
                  key={enzyme.name}
                  enzyme={enzyme}
                  isSelected={selectedEnzymes.includes(enzyme.name)}
                  onToggle={toggleEnzyme}
                />
              ))}
            </div>
          </div>

          {/* Analyze Button */}
          <motion.button
            onClick={analyzeSequence}
            disabled={loading || selectedEnzymes.length === 0 || !sequence.trim()}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="
              w-full py-3.5 rounded-xl font-mono text-sm font-medium
              bg-gradient-to-r from-rose-500/20 via-violet-500/20 to-cyan-500/20
              hover:from-rose-500/30 hover:via-violet-500/30 hover:to-cyan-500/30
              border border-rose-500/30 hover:border-violet-500/40
              text-white/80 hover:text-white
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-300
              flex items-center justify-center gap-3
              relative overflow-hidden
            "
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 -translate-x-full"
              animate={{ translateX: ["0%", "200%"] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
              }}
            />
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Scissors className="w-4 h-4" />
            )}
            <span className="relative z-10">
              {loading ? "Analyzing Cut Sites..." : "Analyze Cut Sites"}
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 flex items-center gap-3 p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 backdrop-blur-xl"
          >
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <p className="text-sm font-mono text-rose-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results ────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Summary stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Cuts", value: result.total_cuts.toString(), color: "text-rose-400" },
                { label: "Fragments", value: result.fragment_sizes.length.toString(), color: "text-emerald-400" },
                { label: "Sequence", value: `${result.sequence_length.toLocaleString()} bp`, color: "text-cyan-400" },
                { label: "Enzymes Used", value: [...new Set(result.cut_sites.map((s) => s.enzyme_name))].length.toString(), color: "text-violet-400" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:bg-white/[0.04] transition-colors"
                >
                  <p className="text-[10px] font-mono text-white/40 uppercase">{stat.label}</p>
                  <p className={`text-2xl font-light mt-1 ${stat.color}`}>{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* DNA Ruler */}
            {result.cut_sites.length > 0 && <DNARuler result={result} />}

            {/* Tables row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Fragment Analysis */}
              {result.fragment_sizes.length > 0 && <FragmentTable result={result} />}

              {/* Cut Sites Detail */}
              {result.cut_sites.length > 0 && <CutSitesTable sites={result.cut_sites} />}
            </div>

            {/* No cuts message */}
            {result.cut_sites.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Scissors className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-white/40 font-mono text-sm">
                  No cut sites found for the selected enzymes in this sequence.
                </p>
                <p className="text-white/20 font-mono text-xs mt-2">
                  Try selecting different enzymes or using a longer sequence.
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {!result && !loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center py-20"
        >
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Scissors className="w-16 h-16 text-white/10 mx-auto mb-4" />
          </motion.div>
          <p className="text-white/30 font-mono text-sm">
            Select enzymes and click &quot;Analyze Cut Sites&quot; to begin
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default RestrictionMappingView;
