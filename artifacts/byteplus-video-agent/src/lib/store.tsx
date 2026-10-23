import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type TaskStatus = "queued" | "processing" | "completed" | "failed" | "cancelled" | "requires_api";
export type TaskType = "image" | "video" | "upscale" | "multi-shot";
export type PresetKind = "image" | "video";

export interface GeneratorSettings {
  prompt: string;
  negativePrompt?: string;
  ratio: string;
  model: string;
  style?: string;
  duration?: string;
  camera?: string;
  motion?: number;
}

export interface Shot {
  id: string;
  type: "image" | "video";
  prompt: string;
  duration: number;
  camera: string;
  ratio: string;
  continuityNotes: string;
  status: "draft" | "ready" | "requires_api";
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  imageSettings: GeneratorSettings;
  videoSettings: GeneratorSettings;
  shots: Shot[];
}

export interface Preset {
  id: string;
  name: string;
  kind: PresetKind;
  settings: GeneratorSettings;
  createdAt: number;
}

export interface GenerationTask {
  id: string;
  type: TaskType;
  prompt: string;
  status: TaskStatus;
  progress: number;
  createdAt: number;
  projectId?: string;
  metadata?: Partial<GeneratorSettings> & { projectName?: string; shots?: Shot[] };
  generationId?: string;
  queuePosition?: number;
  logs?: string[];
  resultUrl?: string;
  error?: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  referenceImageUrl?: string;
  tags: string[];
}

interface WorkspaceState {
  version: 2;
  tasks: GenerationTask[];
  characters: Character[];
  projects: Project[];
  activeProjectId: string;
  presets: Preset[];
}

interface WorkspaceContextType extends WorkspaceState {
  activeProject: Project;
  lastSavedAt: number | null;
  createProject: (name?: string) => string;
  openProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  duplicateProject: (id: string) => void;
  deleteProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  updateGeneratorSettings: (kind: PresetKind, settings: Partial<GeneratorSettings>) => void;
  addShot: (type: Shot["type"]) => void;
  updateShot: (id: string, updates: Partial<Shot>) => void;
  duplicateShot: (id: string) => void;
  removeShot: (id: string) => void;
  moveShot: (id: string, direction: -1 | 1) => void;
  addPreset: (kind: PresetKind, name: string, settings: GeneratorSettings) => void;
  deletePreset: (id: string) => void;
  duplicatePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
  addTask: (task: Omit<GenerationTask, "id" | "createdAt" | "status" | "progress"> & Partial<Pick<GenerationTask, "status" | "progress">>) => string;
  updateTask: (id: string, updates: Partial<GenerationTask>) => void;
  removeTask: (id: string) => void;
  clearTasks: () => void;
  addCharacter: (character: Omit<Character, "id">) => void;
  exportProject: (id: string) => void;
  exportWorkspace: () => void;
  importWorkspace: (file: File, mode: "merge" | "replace") => Promise<number>;
}

const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
const now = () => Date.now();
const IMAGE_MODELS = ["seedream-4.5", "flux-dev", "nano-banana-pro"] as const;
const VIDEO_MODELS = ["seedance-2.5", "wan-2.5"] as const;
const defaultImage = (): GeneratorSettings => ({ prompt: "", negativePrompt: "", ratio: "16:9", model: "seedream-4.5", style: "cinematic" });
const defaultVideo = (): GeneratorSettings => ({ prompt: "", ratio: "16:9", model: "seedance-2.5", duration: "5s", camera: "static", motion: 50 });
const starterShots = (): Shot[] => [
  { id: uid(), type: "image", prompt: "Establishing shot of a neon-lit city alleyway.", duration: 2, camera: "static", ratio: "16:9", continuityNotes: "Introduce the environment.", status: "ready" },
  { id: uid(), type: "video", prompt: "Camera pans down to reveal the lead character.", duration: 4, camera: "pan_right", ratio: "16:9", continuityNotes: "Match the lighting and wardrobe.", status: "ready" },
];
const createDefaultProject = (name = "Neon Pursuit"): Project => ({
  id: uid(), name, createdAt: now(), updatedAt: now(), imageSettings: defaultImage(), videoSettings: defaultVideo(), shots: starterShots(),
});
const initialProject = createDefaultProject();
const initialState: WorkspaceState = {
  version: 2,
  tasks: [],
  characters: [{ id: uid(), name: "Cipher", description: "Cybernetic operative with neon implants", tags: ["sci-fi", "protagonist"], referenceImageUrl: "hero-placeholder" }],
  projects: [initialProject],
  activeProjectId: initialProject.id,
  presets: [
    { id: uid(), name: "Cinematic Night", kind: "image", settings: { ...defaultImage(), style: "cinematic" }, createdAt: now() },
    { id: uid(), name: "Slow Reveal", kind: "video", settings: { ...defaultVideo(), camera: "zoom_in", motion: 35 }, createdAt: now() },
  ],
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);
const STORAGE_KEY = "byteplus_workspace_v2";

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<Project>;
  return typeof p.id === "string"
    && typeof p.name === "string"
    && typeof p.createdAt === "number"
    && typeof p.updatedAt === "number"
    && isSettings(p.imageSettings)
    && isSettings(p.videoSettings)
    && Array.isArray(p.shots)
    && p.shots.every(isShot);
}

function isSettings(value: unknown): value is GeneratorSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Partial<GeneratorSettings>;
  return typeof settings.prompt === "string"
    && typeof settings.ratio === "string"
    && (settings.model === undefined || typeof settings.model === "string");
}

function isImageSettings(value: unknown): value is GeneratorSettings {
  if (!isSettings(value)) return false;
  const settings = value as GeneratorSettings;
  return typeof settings.style === "string"
    && (settings.model === undefined || IMAGE_MODELS.includes(settings.model as typeof IMAGE_MODELS[number]))
    && (settings.negativePrompt === undefined || typeof settings.negativePrompt === "string");
}

function isVideoSettings(value: unknown): value is GeneratorSettings {
  if (!isSettings(value)) return false;
  const settings = value as GeneratorSettings;
  return typeof settings.duration === "string"
    && (settings.model === undefined || VIDEO_MODELS.includes(settings.model as typeof VIDEO_MODELS[number]))
    && typeof settings.camera === "string"
    && typeof settings.motion === "number"
    && Number.isFinite(settings.motion)
    && settings.motion >= 0
    && settings.motion <= 100;
}

function isShot(value: unknown): value is Shot {
  if (!value || typeof value !== "object") return false;
  const shot = value as Partial<Shot>;
  return typeof shot.id === "string"
    && (shot.type === "image" || shot.type === "video")
    && typeof shot.prompt === "string"
    && typeof shot.duration === "number"
    && Number.isFinite(shot.duration)
    && shot.duration >= 1
    && shot.duration <= 30
    && typeof shot.camera === "string"
    && typeof shot.ratio === "string"
    && typeof shot.continuityNotes === "string"
    && ["draft", "ready", "requires_api"].includes(shot.status ?? "");
}

function isCharacter(value: unknown): value is Character {
  if (!value || typeof value !== "object") return false;
  const character = value as Partial<Character>;
  return typeof character.id === "string" && typeof character.name === "string" && typeof character.description === "string" && Array.isArray(character.tags) && character.tags.every(tag => typeof tag === "string");
}

function isPreset(value: unknown): value is Preset {
  if (!value || typeof value !== "object") return false;
  const preset = value as Partial<Preset>;
  return typeof preset.id === "string" && typeof preset.name === "string" && (preset.kind === "image" || preset.kind === "video") && typeof preset.createdAt === "number" && isSettings(preset.settings);
}

function isTask(value: unknown): value is GenerationTask {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<GenerationTask>;
  return typeof task.id === "string"
    && ["image", "video", "upscale", "multi-shot"].includes(task.type ?? "")
    && typeof task.prompt === "string"
    && ["queued", "processing", "completed", "failed", "cancelled", "requires_api"].includes(task.status ?? "")
    && typeof task.progress === "number"
    && typeof task.createdAt === "number";
}

function downloadJson(data: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<WorkspaceState>;
        if (parsed.version === 2 && Array.isArray(parsed.projects) && parsed.projects.some(isProject)) {
          const projects = parsed.projects.filter(isProject).map(project => ({
            ...project,
            imageSettings: {
              ...defaultImage(),
              ...project.imageSettings,
              model: IMAGE_MODELS.includes(project.imageSettings.model as typeof IMAGE_MODELS[number])
                ? project.imageSettings.model
                : "seedream-4.5",
            },
            videoSettings: {
              ...defaultVideo(),
              ...project.videoSettings,
              model: VIDEO_MODELS.includes(project.videoSettings.model as typeof VIDEO_MODELS[number])
                ? project.videoSettings.model
                : "seedance-2.5",
              duration: ["4s", "5s", "8s", "10s"].includes(project.videoSettings.duration ?? "")
                ? project.videoSettings.duration
                : "5s",
            },
          }));
          setState({ ...initialState, ...parsed, projects, activeProjectId: projects.some(p => p.id === parsed.activeProjectId) ? parsed.activeProjectId! : projects[0].id } as WorkspaceState);
        }
      } catch {
        console.error("Failed to parse workspace state");
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setLastSavedAt(now());
  }, [state, hydrated]);

  const activeProject = useMemo(
    () => state.projects.find(project => project.id === state.activeProjectId) ?? state.projects[0],
    [state.projects, state.activeProjectId],
  );

  const mutateProject = (id: string, mutate: (project: Project) => Project) =>
    setState(prev => ({ ...prev, projects: prev.projects.map(project => project.id === id ? { ...mutate(project), updatedAt: now() } : project) }));

  const createProject = (name = "Untitled Production") => {
    const project = createDefaultProject(name);
    setState(prev => ({ ...prev, projects: [project, ...prev.projects], activeProjectId: project.id }));
    return project.id;
  };
  const openProject = (id: string) => setState(prev => ({ ...prev, activeProjectId: id }));
  const renameProject = (id: string, name: string) => mutateProject(id, p => ({ ...p, name: name.trim() || p.name }));
  const duplicateProject = (id: string) => setState(prev => {
    const source = prev.projects.find(p => p.id === id);
    if (!source) return prev;
    const copy = { ...source, id: uid(), name: `${source.name} Copy`, createdAt: now(), updatedAt: now(), shots: source.shots.map(s => ({ ...s, id: uid() })) };
    return { ...prev, projects: [copy, ...prev.projects], activeProjectId: copy.id };
  });
  const deleteProject = (id: string) => setState(prev => {
    if (prev.projects.length === 1) return prev;
    const projects = prev.projects.filter(p => p.id !== id);
    return { ...prev, projects, activeProjectId: prev.activeProjectId === id ? projects[0].id : prev.activeProjectId, tasks: prev.tasks.filter(t => t.projectId !== id) };
  });
  const updateProject = (id: string, updates: Partial<Project>) => mutateProject(id, p => ({ ...p, ...updates }));
  const updateGeneratorSettings = (kind: PresetKind, settings: Partial<GeneratorSettings>) =>
    mutateProject(activeProject.id, p => ({ ...p, [kind === "image" ? "imageSettings" : "videoSettings"]: { ...p[kind === "image" ? "imageSettings" : "videoSettings"], ...settings } }));
  const addShot = (type: Shot["type"]) => mutateProject(activeProject.id, p => ({ ...p, shots: [...p.shots, { id: uid(), type, prompt: "", duration: type === "video" ? 4 : 2, camera: "static", ratio: "16:9", continuityNotes: "", status: "draft" }] }));
  const updateShot = (id: string, updates: Partial<Shot>) => mutateProject(activeProject.id, p => ({
    ...p,
    shots: p.shots.map(s => s.id === id
      ? { ...s, ...updates, status: updates.status ?? (updates.prompt !== undefined ? (updates.prompt.trim() ? "ready" : "draft") : s.status) }
      : s),
  }));
  const duplicateShot = (id: string) => mutateProject(activeProject.id, p => {
    const index = p.shots.findIndex(s => s.id === id);
    if (index < 0) return p;
    const shots = [...p.shots];
    shots.splice(index + 1, 0, { ...shots[index], id: uid() });
    return { ...p, shots };
  });
  const removeShot = (id: string) => mutateProject(activeProject.id, p => ({ ...p, shots: p.shots.filter(s => s.id !== id) }));
  const moveShot = (id: string, direction: -1 | 1) => mutateProject(activeProject.id, p => {
    const index = p.shots.findIndex(s => s.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= p.shots.length) return p;
    const shots = [...p.shots];
    [shots[index], shots[target]] = [shots[target], shots[index]];
    return { ...p, shots };
  });
  const addPreset = (kind: PresetKind, name: string, settings: GeneratorSettings) => setState(prev => ({ ...prev, presets: [{ id: uid(), kind, name: name.trim() || "Untitled Preset", settings, createdAt: now() }, ...prev.presets] }));
  const deletePreset = (id: string) => setState(prev => ({ ...prev, presets: prev.presets.filter(p => p.id !== id) }));
  const duplicatePreset = (id: string) => setState(prev => {
    const source = prev.presets.find(p => p.id === id);
    return source ? { ...prev, presets: [{ ...source, id: uid(), name: `${source.name} Copy`, createdAt: now() }, ...prev.presets] } : prev;
  });
  const renamePreset = (id: string, name: string) => setState(prev => ({ ...prev, presets: prev.presets.map(p => p.id === id ? { ...p, name: name.trim() || p.name } : p) }));
  const addTask = (task: Omit<GenerationTask, "id" | "createdAt" | "status" | "progress"> & Partial<Pick<GenerationTask, "status" | "progress">>) => {
    const id = uid();
    setState(prev => ({
      ...prev,
      tasks: [{
        ...task,
        projectId: task.projectId ?? prev.activeProjectId,
        id,
        createdAt: now(),
        status: task.status ?? "requires_api",
        progress: task.progress ?? 0,
        error: task.error ?? (task.status ? undefined : "Server-side BytePlus connection required"),
      }, ...prev.tasks],
    }));
    return id;
  };
  const updateTask = (id: string, updates: Partial<GenerationTask>) =>
    setState(prev => ({ ...prev, tasks: prev.tasks.map(task => task.id === id ? { ...task, ...updates } : task) }));
  const removeTask = (id: string) => setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
  const clearTasks = () => setState(prev => ({ ...prev, tasks: [] }));
  const addCharacter = (character: Omit<Character, "id">) => setState(prev => ({ ...prev, characters: [...prev.characters, { ...character, id: uid() }] }));
  const exportProject = (id: string) => {
    const project = state.projects.find(p => p.id === id);
    if (project) downloadJson({ version: 2, kind: "byteplus-project", project }, `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`);
  };
  const exportWorkspace = () => downloadJson({ ...state, kind: "byteplus-workspace" }, "byteplus-workspace.json");
  const importWorkspace = async (file: File, mode: "merge" | "replace") => {
    if (file.size > 2_000_000) throw new Error("File exceeds the 2 MB import limit.");
    const data = JSON.parse(await file.text()) as Record<string, unknown>;
    if (data.version !== 2 || (data.kind !== "byteplus-project" && data.kind !== "byteplus-workspace")) throw new Error("This is not a valid BytePlus v2 export.");
    const imported = data.kind === "byteplus-project" ? [data.project] : data.projects;
    if (!Array.isArray(imported) || !imported.length || !imported.every(isProject)) throw new Error("The export contains malformed project data.");
    const workspacePayload = data.kind === "byteplus-workspace";
    if (workspacePayload && (!Array.isArray(data.tasks) || !data.tasks.every(isTask) || !Array.isArray(data.presets) || !data.presets.every(isPreset) || !Array.isArray(data.characters) || !data.characters.every(isCharacter))) {
      throw new Error("The export contains malformed workspace data.");
    }
    if (workspacePayload) {
      const projectIds = new Set(imported.map(project => project.id));
      const tasks = data.tasks as GenerationTask[];
      const invalidTask = tasks.some(task => {
        if (typeof task.projectId !== "string" || !projectIds.has(task.projectId)) return true;
        if (task.type === "image") return !isImageSettings(task.metadata);
        if (task.type === "video") return !isVideoSettings(task.metadata);
        if (task.type === "upscale") return !isSettings(task.metadata);
        return !task.metadata
          || typeof task.metadata.projectName !== "string"
          || !Array.isArray(task.metadata.shots)
          || task.metadata.shots.length === 0
          || !task.metadata.shots.every(isShot);
      });
      if (invalidTask) throw new Error("The export contains an invalid or orphaned saved plan.");
    }
    const idMap = new Map<string, string>();
    const normalized = imported.map(project => {
      const id = uid();
      idMap.set(project.id, id);
      return {
        ...project,
        id,
        name: state.projects.some(p => p.name === project.name) ? `${project.name} (Imported)` : project.name,
        imageSettings: {
          ...defaultImage(),
          ...project.imageSettings,
          model: IMAGE_MODELS.includes(project.imageSettings.model as typeof IMAGE_MODELS[number]) ? project.imageSettings.model : "seedream-4.5",
        },
        videoSettings: {
          ...defaultVideo(),
          ...project.videoSettings,
          model: VIDEO_MODELS.includes(project.videoSettings.model as typeof VIDEO_MODELS[number]) ? project.videoSettings.model : "seedance-2.5",
        },
        shots: project.shots.map(s => ({ ...s, id: uid(), duration: Math.min(30, Math.max(1, s.duration)) })),
        updatedAt: now(),
      };
    });
    const importedTasks = workspacePayload ? (data.tasks as GenerationTask[]).map(task => ({ ...task, id: uid(), projectId: task.projectId ? idMap.get(task.projectId) : undefined })) : [];
    const importedPresets = workspacePayload ? (data.presets as Preset[]).map(preset => ({ ...preset, id: uid() })) : [];
    const importedCharacters = workspacePayload ? (data.characters as Character[]).map(character => ({ ...character, id: uid() })) : [];
    setState(prev => mode === "replace"
      ? { version: 2, projects: normalized, activeProjectId: normalized[0].id, tasks: importedTasks, presets: importedPresets, characters: importedCharacters }
      : { ...prev, projects: [...normalized, ...prev.projects], activeProjectId: normalized[0].id, tasks: [...importedTasks, ...prev.tasks], presets: [...importedPresets, ...prev.presets], characters: [...importedCharacters, ...prev.characters] });
    return normalized.length;
  };

  return (
    <WorkspaceContext.Provider value={{ ...state, activeProject, lastSavedAt, createProject, openProject, renameProject, duplicateProject, deleteProject, updateProject, updateGeneratorSettings, addShot, updateShot, duplicateShot, removeShot, moveShot, addPreset, deletePreset, duplicatePreset, renamePreset, addTask, updateTask, removeTask, clearTasks, addCharacter, exportProject, exportWorkspace, importWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return context;
}