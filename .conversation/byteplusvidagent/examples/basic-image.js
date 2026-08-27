// Example: Basic image generation with Seedream
// Run with: node examples/basic-image.js

import { SeedreamClient } from "../src/index.js";

const client = new SeedreamClient();

async function main() {
  console.log("BytePlus Video Agent - Basic Image Generation Example\n");

  // Dry-run first to see what would be sent
  console.log("📝 Dry-run request preview:");
  const dryRun = client.dryRun({
    prompt: "A cinematic landscape of misty mountains at golden hour",
    version: "5.0",
    size: "2K",
  });
  console.log(JSON.stringify(dryRun, null, 2));

  console.log("\nℹ️  To actually generate, uncomment the generation code below and add --confirmed flag logic.");
  console.log("   Make sure ARK_API_KEY is set in your environment.");
  console.log("\n   Example:");
  console.log("   export ARK_API_KEY=your-key-here");
  console.log("   node examples/basic-image.js\n");

  // Uncomment to actually generate (requires ARK_API_KEY):
  /*
  try {
    const result = await client.generateImage(
      "A cinematic landscape of misty mountains at golden hour, epic scale, dramatic lighting, photorealistic",
      { version: "5.0", size: "2K" }
    );
    console.log("✅ Generation successful!");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Generation failed:", error.message);
  }
  */
}

main();
