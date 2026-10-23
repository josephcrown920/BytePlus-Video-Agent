// Production Bible - The single source of truth for all creative decisions

import fs from "fs";
import path from "path";

export class ProductionBible {
  constructor(basePath = "production-bible") {
    this.basePath = basePath;
    this.characters = {};
    this.style = {};
    this.scenes = {};
    this.narrative = {};
    this.references = [];
    this.history = [];
  }

  // Initialize from existing files or create new
  load() {
    const files = [
      { key: "characters", file: "character-bible.json", default: {} },
      { key: "style", file: "style-bible.json", default: {} },
      { key: "scenes", file: "scene-bible.json", default: {} },
      { key: "narrative", file: "narrative-bible.json", default: {} },
      { key: "references", file: "reference-library.json", default: [] },
      { key: "history", file: "history.json", default: [] },
    ];

    for (const { key, file, default: def } of files) {
      const filePath = path.join(this.basePath, file);
      try {
        if (fs.existsSync(filePath)) {
          this[key] = JSON.parse(fs.readFileSync(filePath, "utf8"));
        } else {
          this[key] = def;
        }
      } catch (e) {
        this[key] = def;
      }
    }

    return this;
  }

  save() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }

    const files = [
      { key: "characters", file: "character-bible.json" },
      { key: "style", file: "style-bible.json" },
      { key: "scenes", file: "scene-bible.json" },
      { key: "narrative", file: "narrative-bible.json" },
      { key: "references", file: "reference-library.json" },
      { key: "history", file: "history.json" },
    ];

    for (const { key, file } of files) {
      const filePath = path.join(this.basePath, file);
      fs.writeFileSync(filePath, JSON.stringify(this[key], null, 2));
    }

    return this;
  }

  // Character management
  addCharacter(name, details) {
    if (this.characters[name]) {
      this._log(`Updated character: ${name}`);
    } else {
      this._log(`Added character: ${name}`);
    }
    this.characters[name] = {
      name,
      createdAt: new Date().toISOString(),
      ...details,
    };
    return this;
  }

  getCharacter(name) {
    return this.characters[name] || null;
  }

  listCharacters() {
    return Object.keys(this.characters);
  }

  // Style management
  setStyle(styleConfig) {
    this.style = {
      updatedAt: new Date().toISOString(),
      ...styleConfig,
    };
    this._log("Updated style bible");
    return this;
  }

  // Scene management
  addScene(sceneId, details) {
    if (this.scenes[sceneId]) {
      this._log(`Updated scene: ${sceneId}`);
    } else {
      this._log(`Added scene: ${sceneId}`);
    }
    this.scenes[sceneId] = {
      id: sceneId,
      createdAt: new Date().toISOString(),
      ...details,
    };
    return this;
  }

  getScene(sceneId) {
    return this.scenes[sceneId] || null;
  }

  listScenes() {
    return Object.keys(this.scenes);
  }

  // Narrative management
  setNarrative(narrativeConfig) {
    this.narrative = {
      updatedAt: new Date().toISOString(),
      ...narrativeConfig,
    };
    this._log("Updated narrative bible");
    return this;
  }

  // Reference management
  addReference(type, url, metadata = {}) {
    const ref = {
      id: `ref-${Date.now()}`,
      type,
      url,
      addedAt: new Date().toISOString(),
      ...metadata,
    };
    this.references.push(ref);
    this._log(`Added ${type} reference`);
    return ref;
  }

  listReferences(type) {
    if (type) {
      return this.references.filter((r) => r.type === type);
    }
    return this.references;
  }

  // Build a comprehensive prompt with character/style consistency
  buildPrompt(basePrompt, options = {}) {
    let enhanced = basePrompt;
    const parts = [];

    // Add style guide
    if (options.includeStyle && this.style && Object.keys(this.style).length > 0) {
      if (this.style.colorPalette) parts.push(`Color palette: ${this.style.colorPalette}`);
      if (this.style.lighting) parts.push(`Lighting: ${this.style.lighting}`);
      if (this.style.lens) parts.push(`Shot on: ${this.style.lens}`);
      if (this.style.filmGrain) parts.push(`Film grain: ${this.style.filmGrain}`);
      if (this.style.overall) parts.push(this.style.overall);
    }

    // Add character descriptions
    if (options.character && this.characters[options.character]) {
      const char = this.characters[options.character];
      parts.push(`${char.name}: ${char.visualDescription || char.description || ""}`);
    }

    if (parts.length > 0) {
      enhanced = `${basePrompt}. ${parts.join(". ")}`;
    }

    return enhanced;
  }

  // Continuity check - returns any issues found
  checkContinuity(assetType, description) {
    const issues = [];
    const warnings = [];

    // Check character mentions against known characters
    for (const [name, char] of Object.entries(this.characters)) {
      if (description.toLowerCase().includes(name.toLowerCase())) {
        if (char.visualDescription && !description.toLowerCase().includes(char.visualDescription.toLowerCase().split(",")[0].toLowerCase())) {
          warnings.push(`Character '${name}' mentioned but description may not match visual reference`);
        }
      }
    }

    return { issues, warnings, passed: issues.length === 0 };
  }

  _log(message) {
    this.history.push({
      timestamp: new Date().toISOString(),
      message,
    });
  }

  // Export the full bible as a summary document
  exportSummary() {
    return {
      characters: this.listCharacters(),
      scenes: this.listScenes(),
      style: this.style,
      narrative: this.narrative,
      referenceCount: this.references.length,
      history: this.history.slice(-20),
    };
  }
}
