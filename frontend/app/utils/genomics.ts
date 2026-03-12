/**
 * Genomic Utilities for BioSync
 * 
 * Helper functions for DNA sequence manipulation and mutation generation.
 */

/**
 * Generates a dynamically mutated variant of a DNA sequence.
 * Creates a concentrated mutation hotspot to demonstrate anomaly detection.
 * 
 * @param originalSequence - The original DNA sequence to mutate
 * @returns A mutated sequence with a scrambled window of bases
 */
export const generateDynamicVariant = (originalSequence: string): string => {
  if (!originalSequence || originalSequence.length < 20) return originalSequence;

  const seqArray = originalSequence.split('');
  const seqLength = seqArray.length;

  // Determine a hotspot size (e.g., 5% of the sequence, max 30bp, min 5bp)
  const mutationWindow = Math.max(5, Math.min(30, Math.floor(seqLength * 0.05)));

  // Pick a random starting index for the mutation cluster
  const startIndex = Math.floor(Math.random() * (seqLength - mutationWindow));

  const bases = ['A', 'C', 'G', 'T'];

  // Scramble the bases in the targeted window
  for (let i = startIndex; i < startIndex + mutationWindow; i++) {
    const currentBase = seqArray[i];
    const possibleMutations = bases.filter(b => b !== currentBase);
    const randomMutation = possibleMutations[Math.floor(Math.random() * possibleMutations.length)];
    seqArray[i] = randomMutation;
  }

  return seqArray.join('');
};

/**
 * Validates if a string is a valid DNA sequence (contains only A, T, C, G)
 * 
 * @param sequence - The sequence to validate
 * @returns boolean indicating if sequence is valid DNA
 */
export const isValidDNASequence = (sequence: string): boolean => {
  return /^[ATCGatcg]+$/.test(sequence);
};

/**
 * Calculates GC content percentage of a DNA sequence
 * 
 * @param sequence - The DNA sequence
 * @returns GC content as a percentage (0-100)
 */
export const calculateGCContent = (sequence: string): number => {
  if (!sequence || sequence.length === 0) return 0;
  
  const gcCount = (sequence.match(/[GCgc]/g) || []).length;
  return (gcCount / sequence.length) * 100;
};
