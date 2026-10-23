/**
 * Cinematic Viralist scene-role helpers for React Native.
 * Mirrors artifacts/aura-ai/src/lib/video-agent-skills.ts
 * but uses hex/rgba colour values instead of Tailwind class names.
 */

export type CinematicRole = 'Hook' | 'Narrative' | 'Close';

/**
 * Returns the scene role for the Cinematic Viralist 3-step structure.
 * - index 0            → "Hook"
 * - index total-1      → "Close"
 * - everything between → "Narrative"
 */
export function cinematicSceneRole(index: number, total: number): CinematicRole {
  if (index === 0) return 'Hook';
  if (index === total - 1) return 'Close';
  return 'Narrative';
}

/** Per-role colour tokens (hex / rgba) for React Native StyleSheet use. */
export const CINEMATIC_ROLE_COLORS: Record<
  CinematicRole,
  { bg: string; text: string; border: string }
> = {
  Hook: {
    bg: 'rgba(249,115,22,0.15)',
    text: '#FB923C',
    border: 'rgba(249,115,22,0.25)',
  },
  Narrative: {
    bg: 'rgba(168,85,247,0.12)',
    text: '#A855F7',
    border: 'rgba(168,85,247,0.25)',
  },
  Close: {
    bg: 'rgba(139,92,246,0.15)',
    text: '#A78BFA',
    border: 'rgba(139,92,246,0.25)',
  },
};
