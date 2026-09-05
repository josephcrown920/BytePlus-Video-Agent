import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateModePlan, route, score, evaluateRetryAndDelivery, type Candidate } from "./production";
import { resolvePresetForMode } from "./video-agent-presets";
import { selectVideoSkills } from "./video-agent-skills";
import { prepareVideoRequest } from "./video-agent-runtime";

describe("Agent Core - Cinematic and Viral Modes", () => {
  it("generates a structured Cinematic mode shot plan", () => {
    const plan = generateModePlan("cinematic", "A neon space station arrival scene");
    assert.equal(plan.mode, "cinematic");
    assert.equal(plan.aspectRatio, "16:9");
    assert.equal(plan.shots.length, 3);
    assert.equal(plan.shots[0].beatType, "Establishing Atmosphere");
    assert.ok(plan.shots[0].camera);
  });

  it("generates a structured Viral mode shot plan", () => {
    const plan = generateModePlan("viral", "Top 5 AI tools in 2026");
    assert.equal(plan.mode, "viral");
    assert.equal(plan.aspectRatio, "9:16");
    assert.equal(plan.shots.length, 3);
    assert.equal(plan.shots[0].beatType, "Thumb-Stop Hook");
    assert.ok(plan.shots[0].captionText);
  });

  it("resolves mode-appropriate default presets", () => {
    assert.equal(resolvePresetForMode("", "cinematic"), "slow_push_in");
    assert.equal(resolvePresetForMode("", "viral"), "HOOK_THUMB_STOP");
    assert.equal(resolvePresetForMode("film noir mood", "cinematic"), "film_noir_key");
  });

  it("selects mode-specific skills", () => {
    const cinematicSkills = selectVideoSkills("movie trailer", "cinematic");
    assert.ok(cinematicSkills.includes("cinematic-director"));

    const viralSkills = selectVideoSkills("tiktok reel", "viral");
    assert.ok(viralSkills.includes("viral-growth-engine"));
  });

  it("scores candidates differently based on mode", () => {
    const candidate: Candidate = {
      id: "c1",
      provider: "modelark",
      model: "seedance-v1",
      score: 0,
      identity: 80,
      promptFit: 90,
      temporal: 85,
      camera: 95,
      anatomy: 80,
      lighting: 95,
      composition: 90,
      status: "generated",
    };

    const cinematicScored = score({ ...candidate }, "cinematic");
    const viralScored = score({ ...candidate }, "viral");

    assert.ok(cinematicScored.score > 0);
    assert.ok(viralScored.score > 0);
  });

  it("evaluates retry and delivery states for customer readiness", () => {
    const failedCandidate: Candidate = {
      id: "c2",
      provider: "modelark",
      model: "seedance-v1",
      score: 30,
      identity: 30,
      promptFit: 50,
      temporal: 30,
      camera: 50,
      anatomy: 30,
      lighting: 50,
      composition: 50,
      status: "generated",
      retryCount: 0,
    };

    const retryEval = evaluateRetryAndDelivery(failedCandidate, 3);
    assert.equal(retryEval.shouldRetry, true);
    assert.equal(retryEval.nextAttempt, 1);
    assert.equal(retryEval.status, "failed_retryable");

    const goodCandidate: Candidate = {
      id: "c3",
      provider: "modelark",
      model: "seedance-v1",
      score: 85,
      identity: 85,
      promptFit: 85,
      temporal: 85,
      camera: 85,
      anatomy: 85,
      lighting: 85,
      composition: 85,
      status: "generated",
    };

    const deliveryEval = evaluateRetryAndDelivery(goodCandidate, 3);
    assert.equal(deliveryEval.shouldRetry, false);
    assert.equal(deliveryEval.status, "delivered");
  });

  it("prepares a video request with mode directives", () => {
    const memory = {
      projectId: "proj-1",
      context: [],
      notebook: [],
      references: [],
      locks: [],
      acceptance: [],
      generations: [],
      continuity: [],
    };
    const req = prepareVideoRequest({
      instruction: "Create a cyberpunk scene",
      taskType: "VIDEO_SHOT_GENERATION",
      memory,
      mode: "cinematic",
    });

    assert.equal(req.mode, "cinematic");
    assert.ok(req.system.includes("CINEMATIC MODE ACTIVE"));
  });
});
