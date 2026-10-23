/**
 * Hook quality guard
 *
 * Detects when Scene 0 is a title-card or establishing-shot opener rather
 * than the genuine 0-3 s sensory shock mandated by the Cinematic Viralist
 * blueprint.  Exported so it can be unit-tested independently.
 */

/** Regex patterns that reliably signal a prohibited opener. */
export const WEAK_HOOK_PATTERNS: RegExp[] = [
  /\btitle\s+card\b/i,
  /\blogo\b/i,
  /\bestablishing\b/i,
  /\bintroduction\b/i,
  /\bintro\s+shot\b/i,
  /\bfades?\s+(?:in|from\s+black)\b/i,
  /\btext\s+overlay\b/i,
  /\btitle\s+screen\b/i,
  /\bopening\s+(?:shot|frame|scene)\b/i,
  /\bwide\s+(?:establishing|shot|angle)\b/i,
  /^the\s+video\s+opens\s+with\b/i,
  /\bcompany\s+logo\b/i,
  /\bbrand\s+reveal\b/i,
];

/**
 * Maximum word count for a valid Scene-0 visual description.
 * A hook that needs a wall of text to explain itself is probably an
 * establishing shot in disguise.
 */
export const HOOK_MAX_WORDS = 80;

/**
 * Returns `true` when Scene 0 looks like a title card / establishing shot
 * rather than a genuine sensory shock.
 *
 * Checks both the scene's visual description and the top-level `hook` field
 * (one-line opener summary) for prohibited patterns.
 */
export function isWeakHook(scene0Description: string, hookLine: string): boolean {
  const combined = `${scene0Description} ${hookLine}`;
  for (const pattern of WEAK_HOOK_PATTERNS) {
    if (pattern.test(combined)) return true;
  }
  // A hook description that exceeds HOOK_MAX_WORDS is almost certainly an
  // establishing shot that failed to compress into a visceral moment.
  const wordCount = scene0Description.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > HOOK_MAX_WORDS) return true;
  return false;
}
