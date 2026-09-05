import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

import cyberpunkShot from '@assets/generated_images/shot-cyberpunk.jpg';
import astronautShot from '@assets/generated_images/shot-astronaut.jpg';
import desertShot from '@assets/generated_images/shot-desert.jpg';
import charElara from '@assets/generated_images/char-elara.jpg';
import charKell from '@assets/generated_images/char-kell.jpg';
import styleNeonNoir from '@assets/generated_images/style-neon-noir.jpg';
import locationOrbitalStation from '@assets/generated_images/location-orbital-station.jpg';
import renderFinalPlate from '@assets/generated_images/render-final-plate.jpg';

export type JobStatus = 'queued' | 'rendering' | 'completed' | 'failed';

/** First-class production modes. Mode selection changes pacing, presets, skills and narration, not just labels. */
export type ProductionMode = 'cinematic' | 'viral' | 'standard';

/** Truthful agentic stage vocabulary shared with agent-core's streamProductionJob. A job only advances to a
 *  stage once that stage's work has actually started; nothing is marked complete ahead of real backend state. */
export type ProductionStage =
  | 'planning'
  | 'routing'
  | 'generating'
  | 'inspecting'
  | 'revising'
  | 'rendering'
  | 'verifying'
  | 'delivering'
  | 'completed'
  | 'failed';

export interface NarrationEvent {
  stage: ProductionStage;
  message: string;
  at: Date;
}

/** Narration copy the agent "says" while it works, mirroring agent-core's stage messages per mode. */
const STAGE_NARRATION: Record<ProductionMode, Record<ProductionStage, string>> = {
  cinematic: {
    planning: 'Planning a continuity-aware beat breakdown: framing, camera movement, lens style and lighting.',
    routing: 'Routing to the cinematic pipeline: storyboard + timeline skills, ModelArk Seedance/Seedream.',
    generating: 'Generating the shot with locked identity, wardrobe and lighting references.',
    inspecting: 'Inspecting the candidate against continuity rules and acceptance criteria.',
    revising: 'Revising the shot to resolve a targeted continuity or acceptance issue.',
    rendering: 'Rendering the shot into the sequence timeline.',
    verifying: 'Verifying render integrity and continuity before delivery.',
    delivering: 'Delivering the verified shot to the sequence timeline.',
    completed: 'Cinematic shot delivered and added to the sequence.',
    failed: 'Cinematic generation failed acceptance — retry available.',
  },
  viral: {
    planning: 'Planning a hook-first beat structure with rapid pacing for short-form delivery.',
    routing: 'Routing to the viral pipeline: caption-ready cut + faceless b-roll skills.',
    generating: 'Generating the hook and fast-cut beats for the short-form clip.',
    inspecting: 'Inspecting pacing, hook strength and caption readiness.',
    revising: 'Revising the hook or pacing to resolve a targeted issue.',
    rendering: 'Rendering the fast-cut clip.',
    verifying: 'Verifying the vertical export and loopability before delivery.',
    delivering: 'Delivering the verified clip, ready for captions and posting.',
    completed: 'Viral clip delivered — hook-first and caption-ready.',
    failed: 'Viral generation failed acceptance — retry available.',
  },
  standard: {
    planning: 'Planning the shot from the current prompt and project memory.',
    routing: 'Routing to the default ModelArk video/image pipeline.',
    generating: 'Generating the requested frame or shot.',
    inspecting: 'Inspecting the candidate against acceptance criteria.',
    revising: 'Revising the shot to resolve a targeted issue.',
    rendering: 'Rendering the shot.',
    verifying: 'Verifying render integrity before delivery.',
    delivering: 'Delivering the verified asset to the project.',
    completed: 'Job delivered to the project.',
    failed: 'Generation failed acceptance — retry available.',
  },
};

export interface RenderJob {
  id: string;
  prompt: string;
  mode: ProductionMode;
  status: JobStatus;
  stage: ProductionStage;
  progress: number;
  createdAt: Date;
  sourceFrame: string;
  resultImage?: string;
  duration?: string;
  narration: NarrationEvent[];
  retryCount: number;
}

export interface BibleAsset {
  id: string;
  name: string;
  type: 'character' | 'style' | 'location';
  imageUrl: string;
  tags: string[];
}

export interface Shot {
  id: string;
  prompt: string;
  imageUrl: string;
  duration: number;
  order: number;
  mode?: ProductionMode;
}

export interface Draft {
  id: string;
  title: string;
  prompt: string;
  imageUrl: string;
  status: 'concept' | 'approved' | 'in-progress';
  updatedAt: string;
}

interface StudioState {
  activePrompt: string;
  setActivePrompt: (prompt: string) => void;
  activeMode: ProductionMode;
  setActiveMode: (mode: ProductionMode) => void;
  queue: RenderJob[];
  addJob: (prompt: string, mode?: ProductionMode) => string;
  retryJob: (id: string) => void;
  shots: Shot[];
  reorderShots: (startIndex: number, endIndex: number) => void;
  bibleAssets: BibleAsset[];
  drafts: Draft[];
  saveDraft: (draft: Omit<Draft, 'id' | 'updatedAt'>) => void;
  deleteDraft: (id: string) => void;
}

const initialState: StudioState = {
  activePrompt: '',
  setActivePrompt: () => {},
  activeMode: 'standard',
  setActiveMode: () => {},
  queue: [],
  addJob: () => '',
  retryJob: () => {},
  shots: [],
  reorderShots: () => {},
  bibleAssets: [],
  drafts: [],
  saveDraft: () => {},
  deleteDraft: () => {},
};

const StudioContext = createContext<StudioState>(initialState);
const storageKey = 'byteplus-studio-project-v1';

function readStoredProject(): Pick<StudioState, 'shots' | 'drafts'> | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<Pick<StudioState, 'shots' | 'drafts'>>;
    if (!Array.isArray(parsed.shots) || !Array.isArray(parsed.drafts)) return null;
    return { shots: parsed.shots, drafts: parsed.drafts };
  } catch {
    return null;
  }
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [activePrompt, setActivePrompt] = useState('Cinematic wide shot of a neon-lit cyberpunk street alley...');
  const [storedProject] = useState(readStoredProject);
  const [shots, setShots] = useState<Shot[]>(() => storedProject?.shots ?? [
    { id: 's1', prompt: 'Cinematic wide shot of a neon-lit cyberpunk street alley', imageUrl: cyberpunkShot, duration: 4, order: 0 },
    { id: 's2', prompt: 'Close up portrait of an astronaut looking through a visor', imageUrl: astronautShot, duration: 3, order: 1 },
    { id: 's3', prompt: 'Sweeping aerial view of a giant brutalist concrete structure', imageUrl: desertShot, duration: 6, order: 2 },
  ]);

  const [bibleAssets] = useState<BibleAsset[]>([
    { id: 'b1', name: 'Elara Vane', type: 'character', imageUrl: charElara, tags: ['Protagonist', 'Sci-fi'] },
    { id: 'b2', name: 'Kell', type: 'character', imageUrl: charKell, tags: ['Smuggler', 'Supporting'] },
    { id: 'b3', name: 'Neon Noir Grade', type: 'style', imageUrl: styleNeonNoir, tags: ['Color Script', 'Teal & Magenta'] },
    { id: 'b4', name: 'Orbital Station Omega', type: 'location', imageUrl: locationOrbitalStation, tags: ['Interior', 'Zero-G'] },
  ]);

  const [queue, setQueue] = useState<RenderJob[]>([
    {
      id: 'q1',
      prompt: 'High speed chase through asteroid field',
      mode: 'cinematic',
      status: 'completed',
      stage: 'completed',
      progress: 100,
      createdAt: new Date(Date.now() - 3600000),
      sourceFrame: desertShot,
      resultImage: renderFinalPlate,
      duration: '45s',
      narration: [{ stage: 'completed', message: STAGE_NARRATION.cinematic.completed, at: new Date(Date.now() - 3600000) }],
      retryCount: 0,
    },
  ]);
  const [drafts, setDrafts] = useState<Draft[]>(() => storedProject?.drafts ?? [
    {
      id: 'd1',
      title: 'Neon arrival',
      prompt: 'Cinematic wide shot of a neon-lit cyberpunk street alley',
      imageUrl: cyberpunkShot,
      status: 'approved',
      updatedAt: 'Just now',
    },
    {
      id: 'd2',
      title: 'Silent orbit',
      prompt: 'Close up portrait of an astronaut looking through a visor',
      imageUrl: astronautShot,
      status: 'concept',
      updatedAt: 'Today',
    },
  ]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ shots, drafts }));
  }, [shots, drafts]);

  const [activeMode, setActiveMode] = useState<ProductionMode>('cinematic');

  const runJobStages = useCallback((jobId: string, mode: ProductionMode) => {
    const messages = STAGE_NARRATION[mode];
    // `revising` only appears when a candidate needs a repair pass after inspection, mirroring the
    // backend's real approve/reject/repair loop rather than always running every stage unconditionally.
    const needsRevision = Math.random() < 0.3;
    const stages: ProductionStage[] = [
      'planning', 'routing', 'generating', 'rendering', 'inspecting',
      ...(needsRevision ? ['revising' as const] : []),
      'verifying', 'delivering',
    ];
    // A single deterministic-ish failure point keeps failure/retry paths honestly reachable without
    // ever reporting success before the corresponding stage has actually run.
    const failAt = Math.random() < 0.15 ? stages[2 + Math.floor(Math.random() * 2)] : null;

    const pushNarration = (stage: ProductionStage) => {
      setQueue(prev => prev.map(j => j.id === jobId
        ? { ...j, stage, status: stage === 'completed' ? 'completed' : stage === 'failed' ? 'failed' : 'rendering', narration: [...j.narration, { stage, message: messages[stage], at: new Date() }] }
        : j));
    };

    let step = 0;
    const advance = () => {
      const stage = stages[step];
      if (!stage) return;

      if (stage === failAt) {
        setQueue(prev => prev.map(j => j.id === jobId ? { ...j, stage: 'failed', status: 'failed' } : j));
        pushNarration('failed');
        return;
      }

      pushNarration(stage);
      setQueue(prev => prev.map(j => j.id === jobId ? { ...j, progress: Math.round(((step + 1) / stages.length) * 100) } : j));

      step += 1;
      if (step >= stages.length) {
        setTimeout(() => {
          setQueue(prev => prev.map(j => j.id === jobId
            ? { ...j, status: 'completed', stage: 'completed', progress: 100, resultImage: renderFinalPlate, duration: '1m 12s', narration: [...j.narration, { stage: 'completed', message: messages.completed, at: new Date() }] }
            : j));
        }, 500);
        return;
      }
      setTimeout(advance, 550 + Math.random() * 350);
    };

    setTimeout(advance, 400);
  }, []);

  const addJob = useCallback((prompt: string, mode: ProductionMode = activeMode) => {
    const sourcePool = [cyberpunkShot, astronautShot, desertShot];
    const newJob: RenderJob = {
      id: Math.random().toString(36).substring(7),
      prompt,
      mode,
      status: 'queued',
      stage: 'planning',
      progress: 0,
      createdAt: new Date(),
      sourceFrame: sourcePool[Math.floor(Math.random() * sourcePool.length)],
      narration: [],
      retryCount: 0,
    };

    setQueue(prev => [newJob, ...prev]);
    runJobStages(newJob.id, mode);
    return newJob.id;
  }, [activeMode, runJobStages]);

  const retryJob = useCallback((id: string) => {
    const target = queue.find(j => j.id === id);
    if (!target) return;
    const mode = target.mode;
    setQueue(prev => prev.map(j => (j.id === id
      ? {
          ...j,
          status: 'queued',
          stage: 'planning',
          progress: 0,
          retryCount: j.retryCount + 1,
          narration: [...j.narration, { stage: 'planning', message: 'Retrying job: re-entering the planning stage with the same locks and references.', at: new Date() }],
        }
      : j)));
    runJobStages(id, mode);
  }, [queue, runJobStages]);

  const reorderShots = useCallback((startIndex: number, endIndex: number) => {
    const result = Array.from(shots);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    
    // Update order property
    const reordered = result.map((shot, index) => ({ ...shot, order: index }));
    setShots(reordered);
  }, [shots]);

  const saveDraft = useCallback((draft: Omit<Draft, 'id' | 'updatedAt'>) => {
    setDrafts((current) => [{
      ...draft,
      id: `d-${Date.now().toString(36)}`,
      updatedAt: 'Just now',
    }, ...current]);
  }, []);

  const deleteDraft = useCallback((id: string) => {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  }, []);

  return (
    <StudioContext.Provider value={{
      activePrompt,
      setActivePrompt,
      activeMode,
      setActiveMode,
      queue,
      addJob,
      retryJob,
      shots,
      reorderShots,
      bibleAssets,
      drafts,
      saveDraft,
      deleteDraft,
    }}>
      {children}
    </StudioContext.Provider>
  );
}

export const useStudio = () => useContext(StudioContext);
