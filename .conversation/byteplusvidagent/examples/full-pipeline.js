// Example: Full cinematic pipeline - character, storyboard, video
// Run with: node examples/full-pipeline.js

import { CinematicPipeline } from "../src/index.js";

async function main() {
  console.log("BytePlus Video Agent - Full Cinematic Pipeline Example\n");

  const pipeline = new CinematicPipeline({
    onProgress: (progress) => {
      console.log(`[${progress.stage.toUpperCase()}] ${progress.message}`);
    },
  });

  // Initialize the project
  console.log("🎬 Initializing production pipeline...");
  const summary = await pipeline.init({
    style: {
      colorPalette: "neon cyan and magenta, deep blacks, high contrast",
      lighting: "dramatic neon lighting, volumetric fog, moody",
      lens: "anamorphic lens, 35mm equivalent, shallow depth of field",
      filmGrain: "subtle 35mm film grain",
      overall: "cinematic cyberpunk aesthetic, Blade Runner 2049 style",
    },
    narrative: {
      logline: "A detective navigates a neon-soaked dystopian city in search of a missing android.",
      genre: "sci-fi, cyberpunk, neo-noir",
      tone: "moody, atmospheric, contemplative",
    },
  });

  console.log("\n📋 Project initialized:");
  console.log(JSON.stringify(summary, null, 2));

  console.log("\nℹ️  To run the full pipeline with actual generation:");
  console.log("   1. Set ARK_API_KEY in your environment");
  console.log("   2. Uncomment the generation steps below");
  console.log("   3. Run: node examples/full-pipeline.js");
  console.log("\n   NOTE: Generation can incur API charges.\n");

  // Uncomment to generate character designs:
  /*
  console.log("🎨 Generating character design...");
  const characterResult = await pipeline.generateCharacterDesign(
    "Detective K",
    "A weary male detective in his late 30s, sharp features, dark hair with grey streaks, wearing a worn trench coat over a dark suit, cybernetic left eye implant, stubble, tired expression, standing in a rain-soaked alley"
  );
  console.log("Character design generated:", characterResult.data?.length, "images");
  */

  // Uncomment to generate storyboard:
  /*
  console.log("🎬 Generating storyboard...");
  const storyboardResult = await pipeline.generateStoryboard("scene-1", [
    {
      prompt: "Wide establishing shot: a neon-lit city skyline at night, rain pouring down, flying vehicles weaving between skyscrapers, Blade Runner aesthetic",
      character: null,
    },
    {
      prompt: "Medium shot: Detective K stands in a rain-soaked alley, the neon signs reflecting in puddles around him, cigarette smoke curling in the rain",
      character: "Detective K",
    },
    {
      prompt: "Close-up on Detective K's cybernetic eye implant as it glows blue, scanning the alley for clues, shallow depth of field",
      character: "Detective K",
    },
  ]);
  console.log("Storyboard generated:", storyboardResult.length, "shots");
  */

  // Uncomment to generate video:
  /*
  console.log("🎥 Generating video sequence...");
  const videoResult = await pipeline.generateVideo("scene-1", "shot-1",
    "Slow establishing shot of a neon-lit cyberpunk city skyline at night, rain pouring down, flying vehicles moving between towering skyscrapers, cinematic camera slowly panning across the cityscape, Blade Runner 2049 aesthetic",
    {
      version: "2.0",
      ratio: "21:9",
      duration: 8,
      resolution: "1080p",
    }
  );
  console.log("Video result:", videoResult.status);
  */

  // Show final status
  const status = pipeline.getStatus();
  console.log("\n📊 Final project status:");
  console.log(JSON.stringify(status, null, 2));
}

main().catch((err) => {
  console.error("\n❌ Pipeline error:", err.message);
  process.exit(1);
});
