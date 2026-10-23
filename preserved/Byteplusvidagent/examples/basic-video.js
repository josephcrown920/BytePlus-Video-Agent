// Example: Basic video generation with Seedance
// Run with: node examples/basic-video.js

import { SeedanceClient } from "../src/index.js";

const client = new SeedanceClient();

async function main() {
  console.log("BytePlus Video Agent - Basic Video Generation Example\n");

  // Dry-run first to see what would be sent
  console.log("📝 Dry-run task preview:");
  const dryRun = client.dryRun({
    prompt: "A slow cinematic dolly shot through a neon-lit cyberpunk alley at night, rain reflections on wet pavement, cinematic color grading",
    version: "2.0",
    ratio: "21:9",
    duration: 5,
    resolution: "1080p",
  });
  console.log(JSON.stringify(dryRun, null, 2));

  console.log("\nℹ️  To actually generate a video, uncomment below and ensure ARK_API_KEY is set.");
  console.log("   Video generation may take several minutes.");
  console.log("\n   Example:");
  console.log("   export ARK_API_KEY=your-key-here");
  console.log("   node examples/basic-video.js\n");

  // Uncomment to actually generate (requires ARK_API_KEY):
  /*
  try {
    console.log("🎬 Submitting video generation task...");
    const result = await client.generate({
      prompt: "A slow cinematic dolly shot through a neon-lit cyberpunk alley at night",
      version: "2.0",
      ratio: "21:9",
      duration: 5,
      resolution: "1080p",
    });

    if (result.ok) {
      console.log("✅ Video generation successful!");
      console.log("Task ID:", result.task_id);
      const videoUrl = result.task?.content?.video_url || "Check task.content for video URL";
      console.log("Video URL:", videoUrl);
    } else {
      console.log("❌ Video generation failed:", result.status);
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error("❌ Generation failed:", error.message);
  }
  */
}

main();
