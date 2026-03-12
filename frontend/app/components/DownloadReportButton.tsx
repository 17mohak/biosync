"use client";

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileDown, Sparkles, Check, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";

// =============================================================================
// TYPES
// =============================================================================

interface DownloadReportButtonProps {
  jobId: number;
  variant?: "default" | "minimal" | "premium";
  className?: string;
}

type DownloadState = "idle" | "loading" | "success" | "error";

// =============================================================================
// CONFETTI EFFECT
// =============================================================================

const triggerSuccessConfetti = (originX: number, originY: number) => {
  // Primary burst - center
  confetti({
    particleCount: 60,
    spread: 80,
    origin: { x: originX, y: originY },
    colors: ["#22d3ee", "#a78bfa", "#34d399", "#fbbf24"],
    startVelocity: 45,
    gravity: 0.8,
    scalar: 1.2,
    drift: 0,
    ticks: 200,
  });

  // Secondary burst - left fan
  setTimeout(() => {
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { x: originX - 0.1, y: originY + 0.05 },
      colors: ["#22d3ee", "#34d399"],
      angle: 120,
      startVelocity: 35,
      gravity: 1,
    });
  }, 100);

  // Secondary burst - right fan
  setTimeout(() => {
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { x: originX + 0.1, y: originY + 0.05 },
      colors: ["#a78bfa", "#fbbf24"],
      angle: 60,
      startVelocity: 35,
      gravity: 1,
    });
  }, 200);

  // Final sparkle burst
  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 100,
      origin: { x: originX, y: originY },
      colors: ["#ffffff", "#22d3ee", "#a78bfa"],
      startVelocity: 30,
      gravity: 0.5,
      scalar: 0.8,
      shapes: ["circle"],
      ticks: 150,
    });
  }, 300);
};

// =============================================================================
// DOWNLOAD REPORT BUTTON COMPONENT
// =============================================================================

export const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({
  jobId,
  variant = "premium",
  className = "",
}) => {
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleDownload = useCallback(async () => {
    if (downloadState === "loading" || downloadState === "success") return;

    setDownloadState("loading");

    try {
      const response = await fetch(`http://localhost:8000/api/export/${jobId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a blob URL
      const url = window.URL.createObjectURL(blob);

      // Create and trigger hidden anchor download
      const link = document.createElement("a");
      link.href = url;
      link.download = `genomic_analysis_job_${jobId}.pdf`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      window.URL.revokeObjectURL(url);

      // Trigger success state
      setDownloadState("success");

      // Trigger confetti from button position
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const originX = (rect.left + rect.width / 2) / window.innerWidth;
        const originY = (rect.top + rect.height / 2) / window.innerHeight;
        triggerSuccessConfetti(originX, originY);
      }

      // Reset to idle after delay
      setTimeout(() => {
        setDownloadState("idle");
      }, 3000);
    } catch (error) {
      console.error("Download failed:", error);
      setDownloadState("error");

      setTimeout(() => {
        setDownloadState("idle");
      }, 3000);
    }
  }, [jobId, downloadState]);

  // Variant styles
  const variantStyles = {
    default: `
      px-4 py-2
      bg-cyan-500/10 hover:bg-cyan-500/20
      border border-cyan-500/30 hover:border-cyan-500/50
      text-cyan-300
      font-mono text-sm
      rounded
      transition-all duration-300
      flex items-center gap-2
      disabled:opacity-50
    `,
    minimal: `
      p-2
      rounded-full
      bg-white/5 hover:bg-cyan-500/20
      border border-white/10 hover:border-cyan-500/50
      transition-all
    `,
    premium: `
      relative overflow-hidden
      px-6 py-3
      bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-emerald-500/10
      hover:from-cyan-500/20 hover:via-violet-500/20 hover:to-emerald-500/20
      border border-cyan-500/30 hover:border-violet-500/50
      text-white font-mono text-sm tracking-wide
      transition-all duration-500
      flex items-center gap-3
      group
    `,
  };

  const buttonContent = {
    idle: (
      <>
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {variant === "premium" ? (
            <FileDown className="w-4 h-4 text-cyan-400 group-hover:text-violet-400 transition-colors" />
          ) : variant === "minimal" ? (
            <Download className="w-4 h-4 text-white/60 group-hover:text-cyan-400" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </motion.div>
        {variant !== "minimal" && (
          <span className={variant === "premium" ? "relative z-10" : ""}>
            {variant === "premium" ? "Export Report" : "Download"}
          </span>
        )}
      </>
    ),
    loading: (
      <>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Download className="w-4 h-4 text-cyan-400" />
        </motion.div>
        {variant !== "minimal" && (
          <span className="text-cyan-400">Processing...</span>
        )}
      </>
    ),
    success: (
      <>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
        </motion.div>
        {variant !== "minimal" && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-emerald-400"
          >
            Downloaded!
          </motion.span>
        )}
      </>
    ),
    error: (
      <>
        <AlertCircle className="w-4 h-4 text-rose-400" />
        {variant !== "minimal" && (
          <span className="text-rose-400">Failed</span>
        )}
      </>
    ),
  };

  return (
    <motion.button
      ref={buttonRef}
      onClick={handleDownload}
      disabled={downloadState === "loading"}
      whileHover={variant === "premium" ? { scale: 1.02 } : { scale: 1.05 }}
      whileTap={variant === "premium" ? { scale: 0.98 } : { scale: 0.95 }}
      className={`
        ${variantStyles[variant]}
        ${downloadState === "success" ? "border-emerald-500/50 bg-emerald-500/10" : ""}
        ${downloadState === "error" ? "border-rose-500/50 bg-rose-500/10" : ""}
        ${className}
      `}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={downloadState}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2"
        >
          {buttonContent[downloadState]}
        </motion.span>
      </AnimatePresence>

      {/* Premium variant shimmer effect */}
      {variant === "premium" && downloadState === "idle" && (
        <motion.div
          className="absolute inset-0 -translate-x-full"
          animate={{ translateX: ["0%", "200%"] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "easeInOut",
          }}
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
          }}
        />
      )}
    </motion.button>
  );
};

export default DownloadReportButton;
