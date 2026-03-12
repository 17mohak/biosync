"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  motion,
  useSpring,
  useMotionValue,
  useScroll,
  useTransform,
  AnimatePresence,
  LayoutGroup,
} from "framer-motion";
import {
  Dna,
  History,
  ChevronRight,
  Microscope,
  Database,
  Loader2,
  Play,
  Globe,
  BookOpen,
} from "lucide-react";

// Import components
import {
  StabilityHeatmap,
  MatrixContainer,
  DownloadReportButton,
  DNASequenceStream,
  ExplainerAccordion,
  VariantCatalogModal,
  ClinicalTranslationCard,
} from "./components";

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
  matrix_compressed: boolean; // 🆕 CHANGED: matrix always available, downsampled if large
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
  breakdown_truncated: boolean;
  clinical_translation: string; // 🆕 NEW FIELD
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
// PARTICLE BACKGROUND
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
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  if (!isClient || particles.length === 0) return null;

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

      if (Math.abs(diffX) < 150) newX = x + (diffX / 150) * 8;
      if (Math.abs(diffY) < 150) newY = y + (diffY / 150) * 8;

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

  const leftPos = useTransform(springX, (v) => `${v}vw`);
  const topPos = useTransform(springY, (v) => `${v}vh`);

  return (
    <motion.div
      className="absolute rounded-full bg-white/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0.15, 0.4, 0.15] }}
      transition={{ opacity: { duration: 4, repeat: Infinity, delay } }}
      style={{ left: leftPos, top: topPos, width: size, height: size }}
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
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
    </motion.div>
  );
};

// =============================================================================
// GENBANK IMPORT COMPONENT
// =============================================================================

const GenBankImport: React.FC<{
  accessionId: string;
  setAccessionId: (id: string) => void;
  onFetch: (fastaText: string) => void;
  isLoading: boolean;
}> = ({ accessionId, setAccessionId, onFetch, isLoading }) => {
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    if (!accessionId.trim()) return;
    setError(null);

    try {
      const response = await fetch(`http://localhost:8000/api/ncbi/fetch/${accessionId.trim()}`);
      if (!response.ok) throw new Error("Failed to fetch from NCBI");
      const data = await response.json();
      
      // Extract the original sequence and create a synthetic variant
      const originalFasta = data.fasta_text;
      const lines = originalFasta.split('\n');
      const header = lines[0]; // >accession description
      const sequence = lines.slice(1).join('');
      
      // Create a synthetic mutated variant (~5% mutation rate)
      const bases = ['A', 'T', 'C', 'G'];
      let mutatedSequence = '';
      for (let i = 0; i < sequence.length; i++) {
        const base = sequence[i];
        if (Math.random() < 0.05) {
          // Mutate this base
          const otherBases = bases.filter(b => b !== base.toUpperCase());
          mutatedSequence += otherBases[Math.floor(Math.random() * otherBases.length)];
        } else {
          mutatedSequence += base;
        }
      }
      
      // Create a 2-sequence FASTA file
      const syntheticFasta = `${header}
${sequence}
>${accessionId.trim()}_VARIANT Synthetic mutated variant
${mutatedSequence}`;
      
      onFetch(syntheticFasta);
    } catch (err: any) {
      setError(`Fetch failed: ${err.message}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white/[0.02] backdrop-blur-sm border border-white/10 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Globe className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-mono text-white/50 uppercase tracking-wider">Import from GenBank</span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={accessionId}
          onChange={(e) => setAccessionId(e.target.value)}
          placeholder="e.g., NM_001302135.1"
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-white text-sm font-mono placeholder:text-white/30 focus:border-cyan-500/50 focus:outline-none transition-colors"
        />
        <motion.button
          onClick={handleFetch}
          disabled={isLoading || !accessionId.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-mono disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          Fetch
        </motion.button>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-xs text-rose-400 font-mono"
        >
          {error}
        </motion.p>
      )}

      <p className="mt-2 text-[10px] text-white/30 font-mono">
        Enter a GenBank accession ID to fetch sequence data from NCBI
      </p>
    </motion.div>
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
            <span className="text-sm font-mono text-white/60">Analysis Active</span>
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
      className="relative border-2 border-dashed border-white/10 p-16 md:p-24 text-center backdrop-blur-sm cursor-pointer overflow-hidden"
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
// SPATIAL DATA CANVAS (Results View)
// =============================================================================

const SpatialDataCanvas: React.FC<{
  alignment: AlignmentResult;
  stability: StabilityResult | null;
  fastaRecords: FastaRecord[];
  jobId?: number;
}> = ({ alignment, stability, fastaRecords, jobId }) => {
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

        {jobId && <DownloadReportButton jobId={jobId} variant="premium" />}
      </div>

      {/* AI Translation Card */}
      {stability && (
        <div className="mb-6">
          <ClinicalTranslationCard 
            translation={stability.clinical_translation}
            confidenceScore={stability.confidence_score}
          />
        </div>
      )}

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

            {/* ML Stability Ribbon */}
            {stability && (
              <StabilityHeatmap
                positionBreakdown={stability.position_breakdown}
                hotspots={stability.mutation_hotspots}
                confidenceScore={stability.confidence_score}
                breakdown_truncated={stability.breakdown_truncated}
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
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  className="bg-white/[0.02] border border-white/5 p-4"
                  whileHover={{ scale: 1.02, borderColor: "rgba(255,255,255,0.1)" }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <p className="text-[10px] font-mono text-white/40 uppercase">{stat.label}</p>
                  <p className={`text-2xl font-light mt-1 ${stat.color}`}>{stat.value}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Right: Matrix */}
        <div className="lg:col-span-2">
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 p-6 sticky top-24">
            <MatrixContainer
              matrix={alignment.score_matrix}
              seq1={seq1}
              seq2={seq2}
              maxDisplayRows={20}
              maxDisplayCols={24}
              matrix_compressed={alignment.matrix_compressed}
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
              <DownloadReportButton jobId={job.id} variant="minimal" />
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

export default function BioSyncCommandCenter() {
  const { springX, springY, mouseX, mouseY } = useMouseSpotlight();
  const [fastaRecords, setFastaRecords] = useState<FastaRecord[]>([]);
  const [alignment, setAlignment] = useState<AlignmentResult | null>(null);
  const [stability, setStability] = useState<StabilityResult | null>(null);
  const [history, setHistory] = useState<JobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"dropzone" | "analysis">("dropzone");
  const [currentJobId, setCurrentJobId] = useState<number | undefined>(undefined);
  const [accessionId, setAccessionId] = useState("");
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

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

  const runAnalysis = async (fastaText: string) => {
    setIsLoading(true);
    try {
      // Parse FASTA
      const parseResponse = await fetch("http://localhost:8000/api/fasta/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fasta_text: fastaText }),
      });

      if (!parseResponse.ok) throw new Error("Parse failed");
      const parseData = await parseResponse.json();
      setFastaRecords(parseData.records);

      if (parseData.records.length >= 2) {
        // Run alignment with full sequences (backend handles truncation)
        const alignResponse = await fetch("http://localhost:8000/api/align/local", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sequence_1: parseData.records[0].sequence,
            sequence_2: parseData.records[1].sequence,
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

        // Save job
        const saveResponse = await fetch("http://localhost:8000/api/history/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_type: alignData.algorithm === "smith-waterman" ? "local" : "global",
            input_data: { sequences: parseData.records.map((r: FastaRecord) => r.id) },
            result_data: { alignment: alignData, stability: stabilityData },
            notes: "BioSync Command Center Analysis",
          }),
        });

        if (saveResponse.ok) {
          const saveData = await saveResponse.json();
          setCurrentJobId(saveData.id);
          fetchHistory();
        }

        setView("analysis");
      }
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFastaDrop = async (text: string) => {
    await runAnalysis(text);
  };

  const handleCatalogSelect = async (accession: string) => {
    setAccessionId(accession);
    setIsLoading(true);
    try {
      // Fetch the NCBI sequence
      const response = await fetch(`http://localhost:8000/api/ncbi/fetch/${accession}`);
      if (!response.ok) throw new Error("Failed to fetch from NCBI");
      const data = await response.json();
      
      // Extract the original sequence and create a synthetic variant
      const originalFasta = data.fasta_text;
      const lines = originalFasta.split('\n');
      const header = lines[0]; // >accession description
      const sequence = lines.slice(1).join('');
      
      // Create a synthetic mutated variant (~5% mutation rate)
      const bases = ['A', 'T', 'C', 'G'];
      let mutatedSequence = '';
      for (let i = 0; i < sequence.length; i++) {
        const base = sequence[i];
        if (Math.random() < 0.05) {
          // Mutate this base
          const otherBases = bases.filter(b => b !== base.toUpperCase());
          mutatedSequence += otherBases[Math.floor(Math.random() * otherBases.length)];
        } else {
          mutatedSequence += base;
        }
      }
      
      // Create a 2-sequence FASTA file
      const syntheticFasta = `${header}
${sequence}
>${accession}_VARIANT Synthetic mutated variant
${mutatedSequence}`;
      
      // Create a File object (required by runAnalysis)
      const file = new File([syntheticFasta], `${accession}_paired.fasta`, { type: 'text/plain' });
      
      // Convert File to text for runAnalysis
      const text = await file.text();
      await runAnalysis(text);
    } catch (err: any) {
      console.error("Catalog fetch error:", err);
      alert(`Fetch failed: ${err.message}`);
    } finally {
      setIsLoading(false);
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
              background:
                "radial-gradient(circle, rgba(34,211,238,0.12) 0%, rgba(167,139,250,0.06) 40%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
        </motion.div>

        {/* Variant Catalog Modal */}
        <VariantCatalogModal
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          onSelectVariant={handleCatalogSelect}
        />

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
              {/* Hero Section */}
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
                    Decoding the
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400">
                      Language of Life
                    </span>
                  </motion.h1>
                  <p className="mt-6 text-lg md:text-xl text-white/40 font-mono max-w-2xl">
                    Fetch real-world variants from GenBank or upload custom sequences. 
                    Detect microscopic mutations and predict the impact of structural anomalies in real-time.
                  </p>
                </motion.div>
              </section>

              {/* Explainer Accordion */}
              <section className="px-6 md:px-12 lg:px-24">
                <ExplainerAccordion />
              </section>

              {/* Input Engine */}
              <section className="px-6 md:px-12 lg:px-24 mb-32">
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Drop Zone */}
                  <div className="lg:col-span-2">
                    <DropZone onDrop={handleFastaDrop} isLoading={isLoading} isDocked={false} />
                  </div>

                  {/* Side Panel: GenBank + Browse Catalog */}
                  <div className="space-y-4">
                    <GenBankImport
                      accessionId={accessionId}
                      setAccessionId={setAccessionId}
                      onFetch={handleFastaDrop}
                      isLoading={isLoading}
                    />
                    
                    {/* Browse Catalog Button */}
                    <motion.button
                      onClick={() => setIsCatalogOpen(true)}
                      disabled={isLoading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-emerald-500/10 hover:from-cyan-500/20 hover:via-violet-500/20 hover:to-emerald-500/20 border border-cyan-500/30 hover:border-violet-500/50 text-white font-mono text-sm tracking-wide transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
                    >
                      <motion.div
                        className="absolute inset-0 -translate-x-full"
                        animate={{ translateX: ["0%", "200%"] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                        style={{
                          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
                        }}
                      />
                      <BookOpen className="w-5 h-5 text-cyan-400 group-hover:text-violet-400 transition-colors" />
                      <span className="relative z-10">Browse Catalog</span>
                      <Play className="w-4 h-4 text-emerald-400" />
                    </motion.button>
                  </div>
                </div>
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
                  jobId={currentJobId}
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
              BioSync Cinematic Command Center v2.0
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
