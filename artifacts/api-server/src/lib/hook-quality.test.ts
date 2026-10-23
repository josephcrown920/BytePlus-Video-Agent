import { describe, it, expect } from "vitest";
import { isWeakHook, WEAK_HOOK_PATTERNS, HOOK_MAX_WORDS } from "./hook-quality.js";

// ── Pattern detection ────────────────────────────────────────────────────────

describe("isWeakHook — prohibited pattern detection", () => {
  const clean = "";

  it("flags 'title card' in scene description", () => {
    expect(isWeakHook("A title card fades in showing the brand name", clean)).toBe(true);
  });

  it("flags 'logo' in scene description", () => {
    expect(isWeakHook("The company logo animates into view against a white background", clean)).toBe(true);
  });

  it("flags 'establishing' in scene description", () => {
    expect(isWeakHook("An establishing shot of the city skyline at golden hour", clean)).toBe(true);
  });

  it("flags 'introduction' in scene description", () => {
    expect(isWeakHook("This scene serves as an introduction to the product", clean)).toBe(true);
  });

  it("flags 'fade in' in scene description", () => {
    expect(isWeakHook("The screen fades in from black to reveal a mountain landscape", clean)).toBe(true);
  });

  it("flags 'fade from black' in scene description", () => {
    expect(isWeakHook("Camera fades from black, slowly revealing the hero", clean)).toBe(true);
  });

  it("flags 'text overlay' in scene description", () => {
    expect(isWeakHook("A text overlay appears in the centre of the frame", clean)).toBe(true);
  });

  it("flags 'title screen' in scene description", () => {
    expect(isWeakHook("Full title screen with product name in bold", clean)).toBe(true);
  });

  it("flags 'opening shot' in scene description", () => {
    expect(isWeakHook("Opening shot of a sunlit meadow stretching to the horizon", clean)).toBe(true);
  });

  it("flags 'wide establishing shot' in scene description", () => {
    expect(isWeakHook("Wide establishing shot of downtown Manhattan at dawn", clean)).toBe(true);
  });

  it("flags sentence starting with 'The video opens with'", () => {
    expect(isWeakHook("The video opens with a slow zoom into the studio", clean)).toBe(true);
  });

  it("flags 'company logo' in scene description", () => {
    expect(isWeakHook("A company logo rotates on a dark background", clean)).toBe(true);
  });

  it("flags 'brand reveal' in scene description", () => {
    expect(isWeakHook("A brand reveal sequence with metallic sheen", clean)).toBe(true);
  });

  it("flags prohibited word in the hook field even when description looks clean", () => {
    expect(isWeakHook("Extreme close-up: water droplets hit a hot pan", "Title card: The Story Begins")).toBe(true);
  });

  it("flags case-insensitively (LOGO, Title Card, ESTABLISHING)", () => {
    expect(isWeakHook("LOGO animation on a black background", clean)).toBe(true);
    expect(isWeakHook("Title Card introduces the product", clean)).toBe(true);
    expect(isWeakHook("ESTABLISHING wide shot of warehouse", clean)).toBe(true);
  });
});

// ── Word-count ceiling ───────────────────────────────────────────────────────

describe("isWeakHook — word-count ceiling", () => {
  it(`flags descriptions over ${HOOK_MAX_WORDS} words`, () => {
    const longDesc = "word ".repeat(HOOK_MAX_WORDS + 1).trim();
    expect(isWeakHook(longDesc, "")).toBe(true);
  });

  it(`passes descriptions at exactly ${HOOK_MAX_WORDS} words`, () => {
    const exactDesc = "visceral ".repeat(HOOK_MAX_WORDS).trim();
    expect(isWeakHook(exactDesc, "")).toBe(false);
  });
});

// ── Clean hooks that must pass ───────────────────────────────────────────────

describe("isWeakHook — clean hooks pass through", () => {
  it("passes a visceral extreme close-up", () => {
    expect(isWeakHook(
      "Extreme macro close-up: a single droplet of black ink explodes in slow motion against white paper",
      "Ink droplet detonates in silence"
    )).toBe(false);
  });

  it("passes a fast-cut kinetic opener", () => {
    expect(isWeakHook(
      "Rapid-fire montage: five jump-cuts of hands assembling a circuit board at 3× speed, orange sparks",
      "Five cuts in one second — hands, sparks, circuit"
    )).toBe(false);
  });

  it("passes a bold question hook", () => {
    expect(isWeakHook(
      "A single line of white text on pitch black: 'What if you never had to sleep again?'",
      "What if you never had to sleep again?"
    )).toBe(false);
  });

  it("passes a nature sensory shock", () => {
    expect(isWeakHook(
      "POV shot hurtling toward a frozen waterfall at 60 mph, ice shards flying into lens",
      "60 mph toward a frozen wall"
    )).toBe(false);
  });

  it("passes when both description and hook are empty strings", () => {
    // Edge case: no content shouldn't crash or false-positive
    expect(isWeakHook("", "")).toBe(false);
  });
});

// ── WEAK_HOOK_PATTERNS and HOOK_MAX_WORDS are exported constants ─────────────

describe("exports", () => {
  it("exports WEAK_HOOK_PATTERNS as a non-empty array of RegExp", () => {
    expect(Array.isArray(WEAK_HOOK_PATTERNS)).toBe(true);
    expect(WEAK_HOOK_PATTERNS.length).toBeGreaterThan(0);
    WEAK_HOOK_PATTERNS.forEach((p) => expect(p).toBeInstanceOf(RegExp));
  });

  it("exports HOOK_MAX_WORDS as a positive integer", () => {
    expect(typeof HOOK_MAX_WORDS).toBe("number");
    expect(HOOK_MAX_WORDS).toBeGreaterThan(0);
    expect(Number.isInteger(HOOK_MAX_WORDS)).toBe(true);
  });
});
