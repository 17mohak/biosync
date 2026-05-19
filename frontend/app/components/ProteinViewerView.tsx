"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hexagon,
  Play,
  Loader2,
  Dna,
  Weight,
  Hash,
  Info,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  Html,
  Trail,
  Float,
  MeshDistortMaterial,
  Environment,
  Lightformer,
  ContactShadows
} from "@react-three/drei";
import * as THREE from "three";

// =============================================================================
// TYPES
// =============================================================================

interface ProteinTranslationResponse {
  amino_acid_sequence: string;
  total_residues: number;
  total_weight_kda: number;
  stop_codon_found: boolean;
  stop_codon: string | null;
  leftover_bases: number;
}

interface ProteinViewerViewProps {
  sequence?: string;
}

// =============================================================================
// AMINO ACID COLOR MAPPING
// =============================================================================

// Amino acid properties for coloring
const AMINO_ACID_PROPERTIES: Record<string, { type: string; color: string; name: string }> = {
  // Nonpolar, aliphatic
  A: { type: "nonpolar", color: "#10b981", name: "Alanine" },      // emerald
  G: { type: "nonpolar", color: "#34d399", name: "Glycine" },      // emerald-light
  I: { type: "nonpolar", color: "#059669", name: "Isoleucine" },   // emerald-dark
  L: { type: "nonpolar", color: "#047857", name: "Leucine" },      // emerald-darker
  M: { type: "nonpolar", color: "#6ee7b7", name: "Methionine" },   // emerald-lightest
  V: { type: "nonpolar", color: "#22c55e", name: "Valine" },       // green
  // Aromatic
  F: { type: "aromatic", color: "#8b5cf6", name: "Phenylalanine" }, // violet
  W: { type: "aromatic", color: "#7c3aed", name: "Tryptophan" },   // violet-dark
  Y: { type: "aromatic", color: "#a78bfa", name: "Tyrosine" },     // violet-light
  // Polar, uncharged
  S: { type: "polar", color: "#06b6d4", name: "Serine" },          // cyan
  T: { type: "polar", color: "#22d3ee", name: "Threonine" },       // cyan-light
  C: { type: "polar", color: "#14b8a6", name: "Cysteine" },        // teal
  N: { type: "polar", color: "#67e8f9", name: "Asparagine" },      // cyan-lighter
  Q: { type: "polar", color: "#5eead4", name: "Glutamine" },       // teal-light
  // Positively charged (basic)
  H: { type: "basic", color: "#f472b6", name: "Histidine" },       // pink
  K: { type: "basic", color: "#ec4899", name: "Lysine" },          // pink-dark
  R: { type: "basic", color: "#db2777", name: "Arginine" },        // pink-darker
  // Negatively charged (acidic)
  D: { type: "acidic", color: "#ef4444", name: "Aspartate" },      // red
  E: { type: "acidic", color: "#dc2626", name: "Glutamate" },      // red-dark
  // Special
  P: { type: "special", color: "#fbbf24", name: "Proline" },       // amber
  // Stop codon
  "*": { type: "stop", color: "#f43f5e", name: "Stop" },           // rose
};

const getAminoAcidColor = (aa: string): string => {
  return AMINO_ACID_PROPERTIES[aa]?.color || "#22d3ee"; // Default cyan
};

const getAminoAcidName = (aa: string): string => {
  return AMINO_ACID_PROPERTIES[aa]?.name || aa;
};

// =============================================================================
// 3D PROTEIN CHAIN COMPONENT - CINEMATIC VOLUMETRIC RIBBON
// =============================================================================

interface ProteinChainProps {
  residues: number;
  sequence: string;
}

// Organic protein folding algorithm using spherical coordinates and sine waves
// Creates alpha-helix like secondary structures with realistic coiling
const generateProteinFold = (residues: number, sequence: string): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];
  const numNodes = Math.min(residues, 150);

  // Base parameters for the protein fold
  const helixRadius = 2.5;
  const helixRise = 0.45; // Rise per residue (angstrom-like units)
  const helixTurns = Math.max(2, numNodes / 7); // ~3.6 residues per turn (alpha helix)

  for (let i = 0; i < numNodes; i++) {
    const t = i / Math.max(1, numNodes - 1);
    const aa = sequence[i] || "A";
    const aaType = AMINO_ACID_PROPERTIES[aa]?.type || "nonpolar";

    // Base alpha-helix spiral
    const angle = (i / 3.6) * Math.PI * 2; // 3.6 residues per helix turn

    // Modify folding based on amino acid properties
    let foldTightness = 1.0;
    let sideChainBulk = 1.0;

    switch (aaType) {
      case "nonpolar": // Hydrophobic - tight packing
        foldTightness = 1.1;
        sideChainBulk = 1.3;
        break;
      case "aromatic": // Bulky side chains - push outward
        foldTightness = 0.9;
        sideChainBulk = 1.6;
        break;
      case "polar": // Surface exposed
        foldTightness = 0.95;
        sideChainBulk = 1.1;
        break;
      case "acidic": // Negative charge - repulsion
      case "basic": // Positive charge - repulsion
        foldTightness = 0.85;
        sideChainBulk = 1.2;
        break;
      case "special": // Proline - kink in helix
        foldTightness = 0.7;
        sideChainBulk = 1.0;
        break;
    }

    // Calculate base helix position
    const baseRadius = helixRadius * foldTightness;
    const baseX = Math.cos(angle) * baseRadius;
    const baseZ = Math.sin(angle) * baseRadius;
    const baseY = (i * helixRise) - (numNodes * helixRise) / 2;

    // Add secondary structure variations
    // Beta-sheet like oscillation
    const sheetWave = Math.sin(t * Math.PI * helixTurns * 2) * 0.8;

    // Tertiary structure - overall protein fold
    const foldWave1 = Math.sin(t * Math.PI * 3) * 3;
    const foldWave2 = Math.cos(t * Math.PI * 2.5) * 2.5;
    const foldWave3 = Math.sin(t * Math.PI * 4) * 2;

    // Add "wobble" for thermal motion effect
    const wobble = Math.sin(i * 0.5) * 0.15;

    // Combine all effects for final position
    const x = baseX + sheetWave * 0.3 + foldWave1 + wobble;
    const y = baseY + foldWave2 * 0.5 + Math.cos(angle * 0.5) * sideChainBulk * 0.3;
    const z = baseZ + foldWave3 + sheetWave * 0.2;

    points.push(new THREE.Vector3(x, y, z));
  }

  return points;
};

// Smooth volumetric ribbon using CatmullRomCurve3
const MolecularRibbon: React.FC<{ points: THREE.Vector3[]; sequence: string }> = ({ points, sequence }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create smooth curve through all points
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
  }, [points]);

  // Create geometry with high tubular segments for smoothness
  const geometry = useMemo(() => {
    const tubularSegments = Math.min(points.length * 4, 600);
    const radius = 0.12;
    const radialSegments = 12;
    return new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  }, [curve, points.length]);

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle pulse in the material
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 0.8) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#0ea5e9"
        emissive="#0284c7"
        emissiveIntensity={0.3}
        roughness={0.3}
        metalness={0.7}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
};

// Volumetric amino acid residue sphere
interface ResidueSphereProps {
  position: THREE.Vector3;
  color: string;
  aa: string;
  index: number;
  totalResidues: number;
}

const ResidueSphere: React.FC<ResidueSphereProps> = ({ position, color, aa, index, totalResidues }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Determine sphere size based on amino acid type (simulating side chain bulk)
  const sphereSize = useMemo(() => {
    const aaType = AMINO_ACID_PROPERTIES[aa]?.type;
    switch (aaType) {
      case "aromatic": return 0.35; // Bulky aromatic rings
      case "nonpolar": return 0.30; // Aliphatic chains
      case "basic": return 0.32;    // Charged side chains
      case "acidic": return 0.28;
      case "polar": return 0.25;    // Smaller polar groups
      case "special": return 0.27;  // Proline
      default: return 0.25;
    }
  }, [aa]);

  // Is this a significant residue (every 10th or specific types)
  const isSignificant = index % 10 === 0 || aa === "P" || aa === "W" || aa === "C";

  useFrame((state) => {
    if (meshRef.current && glowRef.current) {
      // Breathing animation
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.5 + index * 0.2) * 0.05;
      const hoverScale = hovered ? 1.4 : 1.0;
      const finalScale = sphereSize * breathe * hoverScale;

      meshRef.current.scale.setScalar(finalScale);

      // Glow halo scales with main sphere
      const glowScale = isSignificant ? 2.5 : 1.8;
      glowRef.current.scale.setScalar(finalScale * glowScale);

      // Update emissive intensity on hover
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = hovered ? 0.9 : 0.4;
    }
  });

  return (
    <group position={position}>
      {/* Main residue sphere */}
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          roughness={0.15}
          metalness={0.85}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Outer glow halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isSignificant ? 0.15 : 0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Specular highlight for extra shine */}
      {isSignificant && (
        <mesh position={[sphereSize * 0.3, sphereSize * 0.3, sphereSize * 0.2]}>
          <sphereGeometry args={[sphereSize * 0.2, 8, 8]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* Hover label */}
      {hovered && (
        <Html distanceFactor={8} center>
          <div className="bg-black/90 backdrop-blur-md border border-white/20 px-3 py-2 rounded-lg shadow-2xl pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-cyan-400">Residue {index + 1}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm font-medium text-white">{getAminoAcidName(aa)}</span>
              <span className="text-xs text-white/50 font-mono">({aa})</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// Side chain representation (simplified as small protrusions)
const SideChain: React.FC<{
  position: THREE.Vector3;
  nextPosition: THREE.Vector3;
  color: string;
  aa: string;
}> = ({ position, nextPosition, color, aa }) => {
  const aaType = AMINO_ACID_PROPERTIES[aa]?.type;

  // Only render side chains for certain residue types
  if (!["aromatic", "nonpolar", "basic", "acidic"].includes(aaType || "")) {
    return null;
  }

  // Calculate direction vector to next residue
  const direction = new THREE.Vector3().subVectors(nextPosition, position).normalize();

  // Side chain protrudes perpendicular to backbone
  const sideDirection = new THREE.Vector3(
    -direction.y + Math.random() * 0.2,
    direction.x + Math.random() * 0.2,
    direction.z + 0.5
  ).normalize();

  const sideLength = aaType === "aromatic" ? 0.6 : 0.4;
  const sidePosition = position.clone().add(sideDirection.multiplyScalar(sideLength * 0.5));

  return (
    <mesh position={sidePosition}>
      <capsuleGeometry args={[0.06, sideLength, 4, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.2}
        roughness={0.4}
        metalness={0.6}
        transparent
        opacity={0.7}
      />
    </mesh>
  );
};

// Main protein structure component
const ProteinStructure: React.FC<ProteinChainProps> = ({ residues, sequence }) => {
  const groupRef = useRef<THREE.Group>(null);
  const points = useMemo(() => generateProteinFold(residues, sequence), [residues, sequence]);

  // Gentle auto-rotation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.08;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.05) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Smooth ribbon backbone */}
      <MolecularRibbon points={points} sequence={sequence} />

      {/* Amino acid residue spheres */}
      {points.map((point, i) => {
        const aa = sequence[i] || "A";
        const color = getAminoAcidColor(aa);

        return (
          <ResidueSphere
            key={i}
            position={point}
            color={color}
            aa={aa}
            index={i}
            totalResidues={points.length}
          />
        );
      })}

      {/* Side chains */}
      {points.map((point, i) => {
        if (i >= points.length - 1) return null;
        const aa = sequence[i] || "A";
        const color = getAminoAcidColor(aa);

        return (
          <SideChain
            key={`side-${i}`}
            position={point}
            nextPosition={points[i + 1]}
            color={color}
            aa={aa}
          />
        );
      })}
    </group>
  );
};

// Enhanced lighting setup
const SceneLighting: React.FC = () => {
  return (
    <>
      {/* Soft ambient base */}
      <ambientLight intensity={0.15} color="#1e293b" />

      {/* Key light - cyan from upper right */}
      <directionalLight
        position={[10, 12, 8]}
        intensity={1.2}
        color="#22d3ee"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      />

      {/* Fill light - violet from lower left */}
      <directionalLight
        position={[-8, -6, -5]}
        intensity={0.6}
        color="#8b5cf6"
      />

      {/* Rim light - warm from behind */}
      <directionalLight
        position={[0, 5, -10]}
        intensity={0.8}
        color="#f472b6"
      />

      {/* Point lights for specular highlights */}
      <pointLight position={[5, 5, 5]} intensity={0.5} color="#22d3ee" distance={20} decay={2} />
      <pointLight position={[-5, -3, 3]} intensity={0.4} color="#a78bfa" distance={15} decay={2} />
      <pointLight position={[0, -5, 8]} intensity={0.3} color="#34d399" distance={12} decay={2} />

      {/* Central glow */}
      <pointLight position={[0, 0, 0]} intensity={0.3} color="#0ea5e9" distance={25} decay={1.5} />
    </>
  );
};

// Scene setup with cinematic environment
const Scene: React.FC<{ residues: number; sequence: string }> = ({ residues, sequence }) => {
  return (
    <>
      {/* Lighting */}
      <SceneLighting />

      {/* Atmospheric stars */}
      <Stars
        radius={80}
        depth={60}
        count={800}
        factor={3}
        saturation={0.6}
        fade
        speed={0.5}
      />

      {/* Protein structure with float animation */}
      <Float
        speed={0.8}
        rotationIntensity={0.05}
        floatIntensity={0.3}
        floatingRange={[-0.3, 0.3]}
      >
        <ProteinStructure residues={residues} sequence={sequence} />
      </Float>

      {/* Environment reflections */}
      <Environment>
        <Lightformer
          intensity={0.8}
          color="#22d3ee"
          position={[0, 5, 0]}
          scale={[10, 1, 1]}
        />
        <Lightformer
          intensity={0.5}
          color="#8b5cf6"
          position={[-5, 0, 5]}
          scale={[5, 5, 1]}
        />
      </Environment>

      {/* Fog for depth */}
      <fog attach="fog" args={['#030303', 15, 50]} />

      {/* Interactive controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={false}
        minDistance={8}
        maxDistance={40}
        enableDamping={true}
        dampingFactor={0.05}
      />
    </>
  );
};

// Loading fallback for 3D canvas
const CanvasLoader: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      className="relative"
    >
      <div className="w-16 h-16 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Hexagon className="w-6 h-6 text-cyan-400" />
      </div>
    </motion.div>
  </div>
);

// =============================================================================
// AMINO ACID RIBBON COMPONENT
// =============================================================================

interface AminoAcidRibbonProps {
  sequence: string;
}

const AminoAcidRibbon: React.FC<AminoAcidRibbonProps> = ({ sequence }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Group sequence into sets of 10 for easier reading
  const groupedSequence = useMemo(() => {
    const groups: { index: number; aa: string }[][] = [];
    for (let i = 0; i < sequence.length; i += 10) {
      const group: { index: number; aa: string }[] = [];
      for (let j = i; j < Math.min(i + 10, sequence.length); j++) {
        group.push({ index: j, aa: sequence[j] });
      }
      groups.push(group);
    }
    return groups;
  }, [sequence]);

  return (
    <div className="bg-black/40 border border-white/10 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Dna className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
            Amino Acid Sequence
          </span>
        </div>
        <span className="text-xs font-mono text-white/40">
          {sequence.length} residues
        </span>
      </div>

      {/* Sequence display */}
      <div
        ref={scrollRef}
        className="overflow-x-auto premium-scroll py-4 px-4"
      >
        <div className="flex gap-6 min-w-max">
          {groupedSequence.map((group, groupIdx) => (
            <div key={groupIdx} className="flex flex-col gap-1">
              {/* Position marker */}
              <span className="text-[10px] font-mono text-white/30 text-center">
                {groupIdx * 10 + 1}
              </span>

              {/* Amino acids */}
              <div className="flex gap-0.5">
                {group.map(({ index, aa }) => {
                  const color = getAminoAcidColor(aa);
                  const isHovered = hoveredIndex === index;

                  return (
                    <motion.button
                      key={index}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      whileHover={{ scale: 1.2 }}
                      className="relative w-6 h-8 flex items-center justify-center rounded"
                      style={{
                        backgroundColor: isHovered ? color : `${color}20`,
                        boxShadow: isHovered ? `0 0 10px ${color}50` : 'none',
                      }}
                    >
                      <span
                        className="text-sm font-mono font-bold"
                        style={{ color: isHovered ? '#000' : color }}
                      >
                        {aa}
                      </span>

                      {/* Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 border border-white/20 px-2 py-1 rounded text-[10px] whitespace-nowrap z-10">
                          <span className="text-cyan-400">{index + 1}</span>
                          <span className="text-white/60 ml-1">{getAminoAcidName(aa)}</span>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-white/5 bg-white/[0.02] flex-wrap">
        <span className="text-[10px] font-mono text-white/40">Legend:</span>
        {[
          { type: "Nonpolar", color: "#10b981" },
          { type: "Polar", color: "#06b6d4" },
          { type: "Basic", color: "#ec4899" },
          { type: "Acidic", color: "#ef4444" },
          { type: "Aromatic", color: "#8b5cf6" },
          { type: "Special", color: "#fbbf24" },
        ].map(({ type, color }) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-mono text-white/50">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, unit, icon, color, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="relative group"
    >
      {/* Glassmorphism card */}
      <div
        className="relative p-5 rounded-xl border backdrop-blur-xl overflow-hidden"
        style={{
          backgroundColor: `${color}08`,
          borderColor: `${color}30`,
        }}
      >
        {/* Glow effect */}
        <div
          className="absolute -top-10 -right-10 w-20 h-20 rounded-full opacity-20 blur-xl transition-opacity group-hover:opacity-40"
          style={{ backgroundColor: color }}
        />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-white/50 uppercase tracking-wider">{label}</span>
            <div style={{ color }}>{icon}</div>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-light" style={{ color }}>{value}</span>
            {unit && <span className="text-sm text-white/40 font-mono">{unit}</span>}
          </div>
        </div>

        {/* Border glow on hover */}
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            boxShadow: `inset 0 0 20px ${color}20`,
          }}
        />
      </div>
    </motion.div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ProteinViewerView: React.FC<ProteinViewerViewProps> = ({ sequence }) => {
  const [translationData, setTranslationData] = useState<ProteinTranslationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const translateSequence = async () => {
    if (!sequence || sequence.length < 3) {
      setError("Please provide a valid DNA sequence (at least 3 bases)");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Clean the sequence (remove non-DNA characters)
      const cleanSequence = sequence.replace(/[^ACGTacgt]/g, "").toUpperCase();

      if (cleanSequence.length < 3) {
        setError("Sequence must contain at least 3 valid DNA bases (A, C, G, T)");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/protein/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequence: cleanSequence }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Translation failed");
      }

      const data: ProteinTranslationResponse = await response.json();
      setTranslationData(data);
    } catch (err: any) {
      setError(err.message || "Failed to translate sequence");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[calc(100vh-140px)] p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-light text-white/90"
          >
            3D Protein Viewer
          </motion.h2>
          <p className="text-sm font-mono text-white/40 mt-1">
            Translate DNA to protein and visualize the molecular structure
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Help button */}
          <motion.button
            onClick={() => setShowHelp(!showHelp)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
          >
            <Info className="w-5 h-5" />
          </motion.button>

          {/* Translate button */}
          <motion.button
            onClick={translateSequence}
            disabled={isLoading || !sequence}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 hover:from-cyan-500/30 hover:to-violet-500/30 border border-cyan-500/30 hover:border-violet-500/40 rounded-lg text-white font-mono text-sm tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 text-cyan-400" />
            )}
            <span>Translate to Protein</span>
          </motion.button>
        </div>
      </div>

      {/* Help panel */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
              <h3 className="text-sm font-mono text-cyan-400 mb-2">How to use the Protein Viewer</h3>
              <ul className="text-sm text-white/60 space-y-1 list-disc list-inside">
                <li>Load a DNA sequence from the Alignment view or upload a FASTA file</li>
                <li>Click "Translate to Protein" to convert DNA to amino acids</li>
                <li>The 3D viewer shows a procedurally generated protein structure</li>
                <li>Drag to rotate, scroll to zoom, right-click to pan</li>
                <li>Hover over amino acids in the ribbon to see their names</li>
                <li>Colors indicate amino acid properties (polar, nonpolar, charged, etc.)</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg"
          >
            <p className="text-sm text-rose-400 font-mono">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!translationData && !isLoading && !error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24"
        >
          <motion.div
            animate={{
              rotateY: [0, 180, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center mb-6"
            style={{ perspective: "1000px" }}
          >
            <Hexagon className="w-12 h-12 text-cyan-400" />
          </motion.div>

          <h3 className="text-xl font-light text-white/80 mb-2">
            {sequence ? "Ready to Translate" : "No Sequence Loaded"}
          </h3>
          <p className="text-sm text-white/40 font-mono text-center max-w-md">
            {sequence
              ? "Click 'Translate to Protein' to analyze your DNA sequence and generate a 3D protein visualization."
              : "Load a sequence from the Alignment view first, then return here to translate and visualize the protein structure."
            }
          </p>
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {translationData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label="Molecular Weight"
                value={translationData.total_weight_kda.toFixed(2)}
                unit="kDa"
                icon={<Weight className="w-5 h-5" />}
                color="#22d3ee"
                delay={0}
              />
              <StatCard
                label="Total Residues"
                value={translationData.total_residues}
                icon={<Hash className="w-5 h-5" />}
                color="#8b5cf6"
                delay={0.1}
              />
              <StatCard
                label="Stop Codon"
                value={translationData.stop_codon_found ? (translationData.stop_codon || "Yes") : "None"}
                icon={<Dna className="w-5 h-5" />}
                color={translationData.stop_codon_found ? "#f43f5e" : "#10b981"}
                delay={0.2}
              />
            </div>

            {/* Amino Acid Ribbon */}
            <AminoAcidRibbon sequence={translationData.amino_acid_sequence} />

            {/* 3D Viewer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              {/* Viewer header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Hexagon className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
                    3D Structure Visualization
                  </span>
                </div>
                <div className="flex items-center gap-2 text-white/40">
                  <span className="text-xs font-mono">Drag to rotate • Scroll to zoom</span>
                </div>
              </div>

              {/* 3D Canvas Container */}
              <div className="w-full h-[600px] bg-[#030303] border border-white/10 rounded-xl overflow-hidden relative shadow-2xl">
                {/* Grid background */}
                <div className="absolute inset-0 z-0 opacity-20">
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: `
                        linear-gradient(rgba(34,211,238,0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(34,211,238,0.1) 1px, transparent 1px)
                      `,
                      backgroundSize: '50px 50px',
                    }}
                  />
                </div>

                {/* 3D Canvas */}
                <Canvas
                  camera={{ position: [0, 0, 18], fov: 45 }}
                  dpr={[1, 2]}
                  gl={{ antialias: true, alpha: true }}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}
                >
                  <Suspense fallback={null}>
                    <Scene
                      residues={translationData.total_residues}
                      sequence={translationData.amino_acid_sequence}
                    />
                  </Suspense>
                </Canvas>

                {/* Overlay controls */}
                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg">
                    <span className="text-xs font-mono text-white/60">
                      {Math.min(translationData.total_residues, 150)} / {translationData.total_residues} residues shown
                    </span>
                  </div>
                  {translationData.total_residues > 150 && (
                    <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <span className="text-xs font-mono text-amber-400">
                        Large protein - showing subset
                      </span>
                    </div>
                  )}
                </div>

                {/* Loading overlay */}
                <Suspense fallback={<CanvasLoader />}>
                  {null}
                </Suspense>
              </div>

              {/* Sequence info footer */}
              <div className="mt-3 flex items-center justify-between text-xs font-mono text-white/40">
                <div className="flex items-center gap-4">
                  {translationData.leftover_bases > 0 && (
                    <span className="text-amber-400/70">
                      {translationData.leftover_bases} base{translationData.leftover_bases > 1 ? 's' : ''} truncated
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span>First 10 AA: {translationData.amino_acid_sequence.slice(0, 10)}...</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProteinViewerView;
