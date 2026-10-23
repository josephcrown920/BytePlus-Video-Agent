/**
 * Aura color tokens — synced from artifacts/aura-ai/src/index.css.
 * oklch values converted to hex. The app uses dark mode exclusively.
 */

const colors = {
  light: {
    // Aura is dark-only — same values as dark so it always looks correct
    text: '#F5F5FA',
    tint: '#A855F7',
    background: '#06060B',
    foreground: '#F5F5FA',
    card: '#10101A',
    cardForeground: '#F5F5FA',
    primary: '#A855F7',
    primaryForeground: '#FFFFFF',
    secondary: '#1A1A26',
    secondaryForeground: '#F5F5FA',
    muted: '#202030',
    mutedForeground: '#68688A',
    accent: '#A855F7',
    accentForeground: '#FFFFFF',
    destructive: '#E03E20',
    destructiveForeground: '#FFFFFF',
    border: '#1E1E2E',
    input: '#1A1A28',
    surface: '#0D0D18',
    surfaceElevated: '#14141F',
    glow: '#A855F7',
    glowFade: 'rgba(168,85,247,0.18)',
  },
  dark: {
    text: '#F5F5FA',
    tint: '#A855F7',
    background: '#06060B',
    foreground: '#F5F5FA',
    card: '#10101A',
    cardForeground: '#F5F5FA',
    primary: '#A855F7',
    primaryForeground: '#FFFFFF',
    secondary: '#1A1A26',
    secondaryForeground: '#F5F5FA',
    muted: '#202030',
    mutedForeground: '#68688A',
    accent: '#A855F7',
    accentForeground: '#FFFFFF',
    destructive: '#E03E20',
    destructiveForeground: '#FFFFFF',
    border: '#1E1E2E',
    input: '#1A1A28',
    surface: '#0D0D18',
    surfaceElevated: '#14141F',
    glow: '#A855F7',
    glowFade: 'rgba(168,85,247,0.18)',
  },
  radius: 12,
};

export default colors;
