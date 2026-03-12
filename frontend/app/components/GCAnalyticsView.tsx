"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PieChart, Flame, Dna, Activity, Loader2, AlertCircle } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface GCAnalyticsData {
  sequence_length: number;
  gc_content: number;
  melting_temp: number;
  base_distribution: {
    A: number;
    T: number;
    C: number;
    G: number;
  };
  sliding_window: Array<{
    position: number;
    gc_percentage: number;
  }>;
}

interface GCAnalyticsViewProps {
  sequence?: string;
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subtext,
  color,
  delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6"
  >
    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${color} to-transparent opacity-20 rounded-bl-full`} />
    
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg bg-white/5 ${color.replace('from-', 'text-').split(' ')[0]}`}>
          {icon}
        </div>
        <span className="text-xs font-mono text-white/40 uppercase tracking-wider">
          {label}
        </span>
      </div>
      
      <div className="text-3xl font-light text-white/90 mb-1">
        {value}
      </div>
      
      {subtext && (
        <div className="text-xs font-mono text-white/30">
          {subtext}
        </div>
      )}
    </div>
  </motion.div>
);

// =============================================================================
// BASE DISTRIBUTION BAR
// =============================================================================

const BaseDistributionBar: React.FC<{
  distribution: { A: number; T: number; C: number; G: number };
}> = ({ distribution }) => {
  const safeDistribution = {
    A: distribution?.A || 0,
    T: distribution?.T || 0,
    C: distribution?.C || 0,
    G: distribution?.G || 0,
  };
  const total = Math.max(1, safeDistribution.A + safeDistribution.T + safeDistribution.C + safeDistribution.G);
  const percentages = {
    A: ((safeDistribution.A / total) * 100).toFixed(1),
    T: ((safeDistribution.T / total) * 100).toFixed(1),
    C: ((safeDistribution.C / total) * 100).toFixed(1),
    G: ((safeDistribution.G / total) * 100).toFixed(1),
  };

  return (
    <div className="space-y-3">
      {Object.entries(percentages).map(([base, pct], i) => (
        <div key={base} className="flex items-center gap-3">
          <span className="text-xs font-mono text-white/50 w-4">{base}</span>
          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
              className={`h-full rounded-full ${
                base === 'A' ? 'bg-cyan-500' :
                base === 'T' ? 'bg-violet-500' :
                base === 'C' ? 'bg-emerald-500' :
                'bg-rose-500'
              }`}
            />
          </div>
          <span className="text-xs font-mono text-white/40 w-10 text-right">
            {pct}%
          </span>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// CUSTOM TOOLTIP
// =============================================================================

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg px-4 py-3 shadow-2xl">
        <p className="text-xs font-mono text-white/40 mb-1">
          Position: <span className="text-cyan-400">{label}</span>
        </p>
        <p className="text-sm font-medium text-white/90">
          GC Content: <span className="text-emerald-400">{payload[0].value.toFixed(1)}%</span>
        </p>
      </div>
    );
  }
  return null;
};

// =============================================================================
// MAIN GC ANALYTICS VIEW
// =============================================================================

export const GCAnalyticsView: React.FC<GCAnalyticsViewProps> = ({ sequence }) => {
  const [data, setData] = useState<GCAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      // Use provided sequence or default demo sequence
      const seqToAnalyze = sequence || 
        "ATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCG";
      
      if (seqToAnalyze.length < 10) {
        setError("Sequence too short for analysis (min 10bp)");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("http://localhost:8000/api/analytics/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sequence: seqToAnalyze }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch analytics");
        }

        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
        // Fallback to demo data if backend unavailable
        setData({
          sequence_length: seqToAnalyze.length,
          gc_content: 42.5,
          melting_temp: 78.3,
          base_distribution: { A: 25, T: 25, C: 25, G: 25 },
          sliding_window: Array.from({ length: 50 }, (_, i) => ({
            position: i * 20,
            gc_percentage: 30 + Math.random() * 40,
          })),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [sequence]);

  // Strict loading guard
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8 text-cyan-400" />
        </motion.div>
        <span className="ml-3 text-white/50 font-mono">Loading Analytics...</span>
      </div>
    );
  }

  // No data guard
  if (!data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <PieChart className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-mono">No sequence data available</p>
          <p className="text-white/30 font-mono text-xs mt-2">
            Please fetch a sequence first
          </p>
        </div>
      </div>
    );
  }

  // Validate data structure
  const isValidData = 
    typeof data.sequence_length === 'number' &&
    typeof data.gc_content === 'number' &&
    typeof data.melting_temp === 'number' &&
    data.base_distribution &&
    data.sliding_window &&
    Array.isArray(data.sliding_window);

  if (!isValidData) {
    return (
      <div className="p-8 font-mono text-sm overflow-auto h-full">
        <h3 className="text-rose-500 mb-4 text-xl flex items-center gap-2">
          <AlertCircle className="w-6 h-6" /> API Contract Mismatch
        </h3>
        <p className="text-white/50 mb-4">Kimi expected: <span className="text-cyan-400">sequence_length, gc_content, melting_temp, base_distribution, sliding_window</span></p>
        <p className="text-white/50 mb-2">But the backend actually sent:</p>
        <pre className="bg-[#0a0a0a] p-6 rounded-xl border border-rose-500/30 text-amber-400 whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <PieChart className="w-6 h-6 text-violet-400" />
          <h1 className="text-2xl font-light text-white/90">GC & Sequence Analytics</h1>
        </div>
        <p className="text-sm font-mono text-white/40">
          Comprehensive nucleotide composition analysis
        </p>
        {error && (
          <p className="text-xs font-mono text-amber-400 mt-2">
            Note: Using demo data (backend unavailable)
          </p>
        )}
      </motion.div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Sequence Length */}
        <StatCard
          icon={<Dna className="w-5 h-5" />}
          label="Sequence Length"
          value={data?.sequence_length?.toLocaleString?.() || "0"}
          subtext="base pairs"
          color="from-cyan-500"
          delay={0}
        />

        {/* GC Content */}
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="GC Content"
          value={`${data?.gc_content?.toFixed?.(1) || "0"}%`}
          subtext={(data?.gc_content || 0) > 60 ? "High stability" : (data?.gc_content || 0) > 40 ? "Moderate stability" : "Low stability"}
          color="from-emerald-500"
          delay={0.1}
        />

        {/* Melting Temperature */}
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Est. Melting Temp"
          value={`${data?.melting_temp?.toFixed?.(1) || "0"}°C`}
          subtext="Tm calculation"
          color="from-rose-500"
          delay={0.2}
        />

        {/* Base Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-violet-500 to-transparent opacity-20 rounded-bl-full" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-white/5 text-violet-400">
                <PieChart className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono text-white/40 uppercase tracking-wider">
                Base Distribution
              </span>
            </div>
            
            <BaseDistributionBar distribution={data?.base_distribution || { A: 0, T: 0, C: 0, G: 0 }} />
          </div>
        </motion.div>
      </div>

      {/* Main Chart */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="relative rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 overflow-hidden"
      >
        {/* Chart Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-white/90 mb-1">
              GC Content Distribution
            </h3>
            <p className="text-xs font-mono text-white/40">
              Sliding window analysis across sequence
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500" />
              <span className="text-white/40">High GC</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
              <span className="text-white/40">Low GC</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data?.sliding_window || []}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gcGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8} />
                  <stop offset="50%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              
              <XAxis
                dataKey="position"
                stroke="rgba(255,255,255,0.1)"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 12, fontFamily: "monospace" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                label={{ 
                  value: "Sequence Position", 
                  position: "insideBottom", 
                  offset: -5,
                  fill: "rgba(255,255,255,0.3)",
                  fontSize: 12,
                  fontFamily: "monospace"
                }}
              />
              
              <YAxis
                domain={[0, 100]}
                stroke="rgba(255,255,255,0.1)"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 12, fontFamily: "monospace" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickFormatter={(value) => `${value}%`}
                label={{ 
                  value: "GC %", 
                  angle: -90, 
                  position: "insideLeft",
                  fill: "rgba(255,255,255,0.3)",
                  fontSize: 12,
                  fontFamily: "monospace"
                }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Area
                type="monotone"
                dataKey="gc_percentage"
                stroke="#06b6d4"
                strokeWidth={2}
                fill="url(#gcGradient)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Decorative glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gradient-to-t from-cyan-500/10 to-transparent pointer-events-none" />
      </motion.div>
    </div>
  );
};

export default GCAnalyticsView;
