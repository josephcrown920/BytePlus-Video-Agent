#!/usr/bin/env node
// BytePlus Video Agent - Main CLI

import { SeedreamClient } from "../core/seedream-client.js";
import { SeedanceClient } from "../core/seedance-client.js";
import { CinematicPipeline } from "../pipeline/cinematic-pipeline.js";
import { ProductionBible } from "../bible/production-bible.js";
import { CINEMATIC_PRESETS } from "../core/config.js";

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-/g, "_");
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args.flags[key] = next;
        i++;
      } else {
        args.flags[key] = true;
      }
    } else {
      args._.push(arg);
    }
  }
  return args;
}

function printHelp() {
  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║          BytePlus Video Agent (vidagent)                ║
  ║          Cinematic AI Video Production                  ║
  ╚══════════════════════════════════════════════════════════╝

  USAGE:
    vidagent <command> [options]

  COMMANDS:
    image     Generate images with Seedream
    video     Generate videos with Seedance
    pipeline  Run full cinematic production pipeline
    bible     Manage the Production Bible
    status    Show project status
    presets   List cinematic presets
    help      Show this help message

  IMAGE COMMANDS:
    vidagent image generate --prompt "..." [options]
    vidagent image series --prompt "..." --count N [options]
    vidagent image dry-run --prompt "..."

    Options:
      --version 4.0|4.5|5.0    Seedream model version (default: 4.0)
      --size 2K                Image size (default: 2K)
      --seed INTEGER           Random seed
      --image URL              Reference image (repeatable)
      --output-format png|jpeg Output format (5.0 only)
      --confirmed              Confirm billable generation

  VIDEO COMMANDS:
    vidagent video generate --prompt "..." [options]
    vidagent video poll --task-id ID
    vidagent video dry-run --prompt "..."

    Options:
      --version 1.5-pro|2.0|2.0-fast  Seedance model version (default: 2.0)
      --ratio 16:9|9:16|21:9|...      Aspect ratio (default: 16:9)
      --duration SECONDS              Video duration
      --resolution 480p|720p|1080p    Resolution (default: 1080p)
      --first-frame URL               First frame image URL
      --last-frame URL                Last frame image URL
      --reference-image URL           Reference image (repeatable)
      --generate-audio                Include synchronized audio
      --preset NAME                   Use a cinematic preset
      --seed INTEGER                  Random seed
      --confirmed                     Confirm billable generation

  PIPELINE COMMANDS:
    vidagent pipeline init
    vidagent pipeline scene --id SCENE_ID --prompt "..."
    vidagent pipeline character --name NAME --description "..."

  BIBLE COMMANDS:
    vidagent bible show
    vidagent bible add-character --name "..." --description "..."
    vidagent bible set-style --style "..."
    vidagent bible check --text "..."

  EXAMPLES:
    vidagent image generate --prompt "A cinematic mountain landscape" --version 5.0 --confirmed
    vidagent video generate --prompt "A slow dolly shot through a neon city" --preset cinematic-wide --confirmed
    vidagent pipeline init
    vidagent presets
`);
}

function printPresets() {
  console.log("\n  Available Cinematic Presets:\n");
  for (const [name, preset] of Object.entries(CINEMATIC_PRESETS)) {
    console.log(`  ${name.padEnd(20)} ${preset.description}`);
    console.log(`    ${`ratio: ${preset.ratio}`.padEnd(15)} ${`res: ${preset.resolution}`.padEnd(12)} ${`dur: ${preset.duration}s`.padEnd(10)} model: ${preset.version}`);
    console.log();
  }
}

async function handleImageCommand(args) {
  const subcmd = args._[1] || "help";
  const client = new SeedreamClient();

  switch (subcmd) {
    case "generate": {
      if (!args.flags.prompt) {
        console.error("Error: --prompt is required");
        process.exit(1);
      }
      if (!args.flags.confirmed) {
        // Show preview/dry-run
        const dry = client.dryRun({
          prompt: args.flags.prompt,
          version: args.flags.version,
          size: args.flags.size,
        });
        console.log(JSON.stringify(dry, null, 2));
        console.log("\n⚠️  This is a dry-run. Generation can incur API charges.");
        console.log("   Add --confirmed to generate.");
        return;
      }
      const result = await client.generateImage(args.flags.prompt, {
        version: args.flags.version,
        size: args.flags.size,
        seed: args.flags.seed ? Number(args.flags.seed) : undefined,
        images: args.flags.image ? [args.flags.image] : undefined,
        outputFormat: args.flags.output_format,
      });
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "series": {
      if (!args.flags.prompt) {
        console.error("Error: --prompt is required");
        process.exit(1);
      }
      const count = args.flags.count ? Number(args.flags.count) : 3;
      if (!args.flags.confirmed) {
        const dry = client.dryRun({
          prompt: args.flags.prompt,
          version: args.flags.version,
          sequential: "auto",
        });
        console.log(JSON.stringify(dry, null, 2));
        console.log(`\n⚠️  Series of ${count} images. Generation can incur API charges.`);
        console.log("   Add --confirmed to generate.");
        return;
      }
      const result = await client.generateSeries(args.flags.prompt, count, {
        version: args.flags.version,
        size: args.flags.size,
        seed: args.flags.seed ? Number(args.flags.seed) : undefined,
      });
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "dry-run": {
      if (!args.flags.prompt) {
        console.error("Error: --prompt is required");
        process.exit(1);
      }
      const dry = client.dryRun({
        prompt: args.flags.prompt,
        version: args.flags.version,
        size: args.flags.size,
      });
      console.log(JSON.stringify(dry, null, 2));
      break;
    }
    default:
      console.log("Image subcommands: generate, series, dry-run");
  }
}

async function handleVideoCommand(args) {
  const subcmd = args._[1] || "help";
  const client = new SeedanceClient();

  switch (subcmd) {
    case "generate": {
      if (!args.flags.prompt) {
        console.error("Error: --prompt is required");
        process.exit(1);
      }

      const videoOptions = {
        version: args.flags.version,
        ratio: args.flags.ratio,
        duration: args.flags.duration ? Number(args.flags.duration) : undefined,
        resolution: args.flags.resolution,
        firstFrame: args.flags.first_frame,
        lastFrame: args.flags.last_frame,
        referenceImages: args.flags.reference_image ? [args.flags.reference_image] : undefined,
        generateAudio: !!args.flags.generate_audio,
        seed: args.flags.seed ? Number(args.flags.seed) : undefined,
      };

      // Apply preset
      if (args.flags.preset) {
        const preset = CINEMATIC_PRESETS[args.flags.preset];
        if (!preset) {
          console.error(`Error: Unknown preset '${args.flags.preset}'. Run 'vidagent presets' to see available presets.`);
          process.exit(1);
        }
        if (!videoOptions.version) videoOptions.version = preset.version;
        if (!videoOptions.ratio) videoOptions.ratio = preset.ratio;
        if (!videoOptions.duration) videoOptions.duration = preset.duration;
        if (!videoOptions.resolution) videoOptions.resolution = preset.resolution;
      }

      if (!args.flags.confirmed) {
        const dry = client.dryRun({
          prompt: args.flags.prompt,
          ...videoOptions,
        });
        console.log(JSON.stringify(dry, null, 2));
        console.log("\n⚠️  This is a dry-run. Video generation can incur API charges and may take several minutes.");
        console.log("   Add --confirmed to submit the task.");
        return;
      }

      const result = await client.generate({
        prompt: args.flags.prompt,
        ...videoOptions,
      });
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "poll": {
      if (!args.flags.task_id) {
        console.error("Error: --task-id is required");
        process.exit(1);
      }
      const result = await client.poll(args.flags.task_id, {
        maxWait: args.flags.max_wait ? Number(args.flags.max_wait) : undefined,
        pollInterval: args.flags.poll_interval ? Number(args.flags.poll_interval) : undefined,
      });
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "dry-run": {
      if (!args.flags.prompt) {
        console.error("Error: --prompt is required");
        process.exit(1);
      }
      const dry = client.dryRun({
        prompt: args.flags.prompt,
        version: args.flags.version,
        ratio: args.flags.ratio,
        duration: args.flags.duration,
        resolution: args.flags.resolution,
      });
      console.log(JSON.stringify(dry, null, 2));
      break;
    }
    default:
      console.log("Video subcommands: generate, poll, dry-run");
  }
}

async function handlePipelineCommand(args) {
  const subcmd = args._[1] || "help";
  const pipeline = new CinematicPipeline({
    onProgress: (p) => console.log(`[${p.stage}] ${p.message}`),
  });

  switch (subcmd) {
    case "init": {
      const summary = await pipeline.init();
      console.log("\n  🎬 Production pipeline initialized!\n");
      console.log(JSON.stringify(summary, null, 2));
      break;
    }
    case "character": {
      if (!args.flags.name || !args.flags.description) {
        console.error("Error: --name and --description are required");
        process.exit(1);
      }
      await pipeline.init();
      const result = await pipeline.generateCharacterDesign(
        args.flags.name,
        args.flags.description,
        { confirmed: !!args.flags.confirmed }
      );
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case "scene": {
      if (!args.flags.id || !args.flags.prompt) {
        console.error("Error: --id and --prompt are required");
        process.exit(1);
      }
      await pipeline.init();
      const result = await pipeline.generateConceptArt(
        args.flags.id,
        args.flags.prompt,
        { confirmed: !!args.flags.confirmed }
      );
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    default:
      console.log("Pipeline subcommands: init, character, scene");
  }
}

async function handleBibleCommand(args) {
  const subcmd = args._[1] || "show";
  const bible = new ProductionBible();
  bible.load();

  switch (subcmd) {
    case "show": {
      const summary = bible.exportSummary();
      console.log("\n  📖 Production Bible\n");
      console.log(`  Characters: ${summary.characters.join(", ") || "none"}`);
      console.log(`  Scenes:     ${summary.scenes.join(", ") || "none"}`);
      console.log(`  References: ${summary.referenceCount}`);
      if (summary.style && Object.keys(summary.style).length > 0) {
        console.log(`  Style:      ${JSON.stringify(summary.style)}`);
      }
      console.log();
      break;
    }
    case "add-character": {
      if (!args.flags.name || !args.flags.description) {
        console.error("Error: --name and --description are required");
        process.exit(1);
      }
      bible.addCharacter(args.flags.name, {
        visualDescription: args.flags.description,
      });
      bible.save();
      console.log(`Added character: ${args.flags.name}`);
      break;
    }
    case "set-style": {
      if (!args.flags.style) {
        console.error("Error: --style is required");
        process.exit(1);
      }
      bible.setStyle({ overall: args.flags.style });
      bible.save();
      console.log("Style updated");
      break;
    }
    case "check": {
      if (!args.flags.text) {
        console.error("Error: --text is required");
        process.exit(1);
      }
      const result = bible.checkContinuity("text", args.flags.text);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    default:
      console.log("Bible subcommands: show, add-character, set-style, check");
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const command = args._[0] || "help";

  switch (command) {
    case "image":
      await handleImageCommand(args);
      break;
    case "video":
      await handleVideoCommand(args);
      break;
    case "pipeline":
      await handlePipelineCommand(args);
      break;
    case "bible":
      await handleBibleCommand(args);
      break;
    case "presets":
      printPresets();
      break;
    case "status": {
      const pipeline = new CinematicPipeline();
      const status = pipeline.getStatus();
      console.log(JSON.stringify(status, null, 2));
      break;
    }
    case "help":
    case "--help":
    case "-h":
      printHelp();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n  ❌ Error: ${err.message}\n`);
  process.exit(1);
});
