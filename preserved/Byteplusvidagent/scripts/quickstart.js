#!/usr/bin/env node
// Quickstart script - sets up and verifies the video agent installation

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function step(title, fn) {
  console.log(`\n  ▶ ${title}`);
  try {
    fn();
    console.log(`    ✅ OK`);
  } catch (e) {
    console.log(`    ❌ ${e.message}`);
  }
}

console.log(`
  ╔═══════════════════════════════════════════╗
  ║   BytePlus Video Agent - Quickstart      ║
  ╚═══════════════════════════════════════════╝
`);

// Check Node.js version
step("Checking Node.js version", () => {
  const major = parseInt(process.version.slice(1));
  if (major < 18) throw new Error(`Node.js ${process.version} detected, requires 18+`);
  console.log(`    Node ${process.version}`);
});

// Check API key
step("Checking ARK_API_KEY environment variable", () => {
  if (!process.env.ARK_API_KEY) {
    throw new Error("ARK_API_KEY not set. Export it with: export ARK_API_KEY=your-key");
  }
  console.log(`    Key found (length: ${process.env.ARK_API_KEY.length})`);
});

// Verify source files
step("Verifying source files", () => {
  const required = [
    "src/index.js",
    "src/cli/index.js",
    "src/core/config.js",
    "src/core/seedream-client.js",
    "src/core/seedance-client.js",
    "src/pipeline/cinematic-pipeline.js",
    "src/bible/production-bible.js",
    "package.json",
    "README.md",
  ];
  const missing = required.filter((f) => !fs.existsSync(path.join(projectRoot, f)));
  if (missing.length > 0) throw new Error(`Missing files: ${missing.join(", ")}`);
  console.log(`    All ${required.length} required files present`);
});

// Verify module imports
step("Verifying module imports", async () => {
  try {
    const { SeedreamClient, SeedanceClient, ProductionBible, CinematicPipeline } =
      await import(path.join(projectRoot, "src/index.js"));
    if (!SeedreamClient || !SeedanceClient || !ProductionBible || !CinematicPipeline) {
      throw new Error("Some exports missing");
    }
    console.log("    All modules import successfully");
  } catch (e) {
    throw new Error(`Import failed: ${e.message}`);
  }
});

// Verify dry-run works
step("Verifying Seedream dry-run", async () => {
  try {
    const { SeedreamClient } = await import(path.join(projectRoot, "src/index.js"));
    const client = new SeedreamClient();
    const result = client.dryRun({ prompt: "test", version: "5.0" });
    if (!result.ok || !result.dry_run) throw new Error("Dry-run failed");
    console.log("    Seedream dry-run works correctly");
  } catch (e) {
    throw new Error(`Seedream dry-run failed: ${e.message}`);
  }
});

step("Verifying Seedance dry-run", async () => {
  try {
    const { SeedanceClient } = await import(path.join(projectRoot, "src/index.js"));
    const client = new SeedanceClient();
    const result = client.dryRun({ prompt: "test", version: "2.0" });
    if (!result.ok || !result.dry_run) throw new Error("Dry-run failed");
    console.log("    Seedance dry-run works correctly");
  } catch (e) {
    throw new Error(`Seedance dry-run failed: ${e.message}`);
  }
});

// Verify production bible
step("Verifying Production Bible", async () => {
  try {
    const { ProductionBible } = await import(path.join(projectRoot, "src/index.js"));
    const bible = new ProductionBible(path.join(projectRoot, "production-bible"));
    bible.load();
    bible.addCharacter("TestCharacter", { visualDescription: "a test character" });
    bible.setStyle({ overall: "cinematic" });
    const enhanced = bible.buildPrompt("a scene", { includeStyle: true, character: "TestCharacter" });
    if (!enhanced.includes("TestCharacter")) throw new Error("Character not in enhanced prompt");
    console.log("    Production Bible works correctly");
  } catch (e) {
    throw new Error(`Production Bible failed: ${e.message}`);
  }
});

console.log(`
  ╔═══════════════════════════════════════════╗
  ║   Setup complete! 🎬                      ║
  ╚═══════════════════════════════════════════╝

  Next steps:
    1. Try the CLI:
       node src/cli/index.js image generate --prompt "A cinematic test" --version 5.0
       node src/cli/index.js video generate --prompt "A cinematic test" --preset cinematic-wide

    2. Run the examples:
       node examples/basic-image.js
       node examples/basic-video.js
       node examples/full-pipeline.js

    3. Initialize a production pipeline:
       node src/cli/index.js pipeline init

    4. View all commands:
       node src/cli/index.js help

  Documentation: README.md
`);
