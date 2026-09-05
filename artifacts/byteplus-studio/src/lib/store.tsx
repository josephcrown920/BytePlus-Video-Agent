import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

import cyberpunkShot from '@assets/generated_images/shot-cyberpunk.jpg';
import astronautShot from '@assets/generated_images/shot-astronaut.jpg';
import desertShot from '@assets/generated_images/shot-desert.jpg';
import charElara from '@assets/generated_images/char-elara.jpg';
import charKell from '@assets/generated_images/char-kell.jpg';
import styleNeonNoir from '@assets/generated_images/style-neon-noir.jpg';
import locationOrbitalStation from '@assets/generated_images/location-orbital-station.jpg';
import renderFinalPlate from '@assets/generated_images/render-final-plate.jpg';

export type VideoMode = 'cinematic' | 'viral' | 'standard';
export type SceneTemplate =
  | 'promo'
  | 'ad'
  | 'reel'
  | 'explainer'
  | 'social_clip'
  | 'cinematic_trailer'
  | 'faceless_short';

export type JobStatus = 'queued' | 'rendering' | 'completed' | 'failed';
export type DeliveryStatus = 'queued' | 'rendering' | 'qa_verified' | 'delivered' | 'failed_retryable';

export interface RenderJob {
  id: string;
  prompt: string;
  status: JobStatus;
  progress: number;
  createdAt: Date;
  sourceFrame: string;
  resultImage?: string;
  duration?: string;
  mode?: VideoMode;
  deliveryStatus?: DeliveryStatus;
  deliveryUrl?: string;
  retryCount?: number;
  failureReason?: string;
  stage?: string;
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
  beatType?: string;
  cameraFraming?: string;
  cameraMovement?: string;
  lensStyle?: string;
  lightingMood?: string;
  transition?: string;
  captionText?: string;
  status?: 'draft' | 'rendering' | 'approved' | 'failed';
}

export interface Draft {
  id: string;
  title: string;
  prompt: string;
  imageUrl: string;
  status: 'concept' | 'approved' | 'in-progress';
  updatedAt: string;
  mode?: VideoMode;
}

export interface CinematicOptions {
  lens: string;
  lighting: string;
  framing: string;
  movement: string;
}

export interface ViralOptions {
  hookType: string;
  pacing: string;
  captionStyle: string;
  faceless: boolean;
}

interface StudioState {
  mode: VideoMode;
  setMode: (mode: VideoMode) => void;
  selectedTemplate: SceneTemplate;
  applyTemplate: (template: SceneTemplate) => void;
  activePrompt: string;
  setActivePrompt: (prompt: string) => void;
  cinematicOptions: CinematicOptions;
  updateCinematicOptions: (opts: Partial<CinematicOptions>) => void;
  viralOptions: ViralOptions;
  updateViralOptions: (opts: Partial<ViralOptions>) => void;
  queue: RenderJob[];
  addJob: (prompt: string) => void;
  retryJob: (id: string) => void;
  deliverJob: (id: string) => void;
  shots: Shot[];
  reorderShots: (startIndex: number, endIndex: number) => void;
  updateShot: (id: string, updates: Partial<Shot>) => void;
  addShot: (shot?: Partial<Shot>) => void;
  deleteShot: (id: string) => void;
  bibleAssets: BibleAsset[];
  drafts: Draft[];
  saveDraft: (draft: Omit<Draft, 'id' | 'updatedAt'>) => void;
  deleteDraft: (id: string) => void;
}

const initialState: StudioState = {
  mode: 'cinematic',
  setMode: () => {},
  selectedTemplate: 'cinematic_trailer',
  applyTemplate: () => {},
  activePrompt: '',
  setActivePrompt: () => {},
  cinematicOptions: {
    lens: 'Anamorphic 2.39:1',
    lighting: 'Film Noir Key + Volumetric Rim',
    framing: 'Medium Close-up',
    movement: 'Slow Push In',
  },
  updateCinematicOptions: () => {},
  viralOptions: {
    hookType: 'Thumb-Stop Visual Shock',
    pacing: '1.5s Rapid Cut',
    captionStyle: 'Bold Pop Karaoke',
    faceless: true,
  },
  updateViralOptions: () => {},
  queue: [],
  addJob: () => {},
  retryJob: () => {},
  deliverJob: () => {},
  shots: [],
  reorderShots: () => {},
  updateShot: () => {},
  addShot: () => {},
  deleteShot: () => {},
  bibleAssets: [],
  drafts: [],
  saveDraft: () => {},
  deleteDraft: () => {},
};

const StudioContext = createContext<StudioState>(initialState);
const storageKey = 'byteplus-studio-project-v2';

function readStoredProject(): Pick<StudioState, 'shots' | 'drafts' | 'mode'> | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<Pick<StudioState, 'shots' | 'drafts' | 'mode'>>;
    if (!Array.isArray(parsed.shots) || !Array.isArray(parsed.drafts)) return null;
    return { shots: parsed.shots, drafts: parsed.drafts, mode: parsed.mode ?? 'cinematic' };
  } catch {
    return null;
  }
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [storedProject] = useState(readStoredProject);
  const [mode, setModeState] = useState<VideoMode>(storedProject?.mode ?? 'cinematic');
  const [selectedTemplate, setSelectedTemplate] = useState<SceneTemplate>('cinematic_trailer');
  const [activePrompt, setActivePrompt] = useState('Cinematic wide shot of a neon-lit cyberpunk street alley...');

  const [cinematicOptions, setCinematicOptions] = useState<CinematicOptions>({
    lens: 'Anamorphic 2.39:1',
    lighting: 'Film Noir Key + Volumetric Rim',
    framing: 'Medium Close-up',
    movement: 'Slow Push In',
  });

  const [viralOptions, setViralOptions] = useState<ViralOptions>({
    hookType: 'Thumb-Stop Visual Shock',
    pacing: '1.5s Rapid Cut',
    captionStyle: 'Bold Pop Karaoke',
    faceless: true,
  });

  const [shots, setShots] = useState<Shot[]>(() => storedProject?.shots ?? [
    {
      id: 's1',
      prompt: 'Cinematic wide shot establishing neon-lit cyberpunk street alley',
      imageUrl: cyberpunkShot,
      duration: 4,
      order: 0,
      beatType: 'Establishing Atmosphere',
      cameraFraming: 'Wide Shot',
      cameraMovement: 'Slow Push In',
      lensStyle: 'Anamorphic 2.39:1',
      lightingMood: 'Volumetric Neon',
      transition: 'Dissolve',
      captionText: '2026: Neo-Shanghai Sub-Level 4',
      status: 'approved',
    },
    {
      id: 's2',
      prompt: 'Close up portrait of an astronaut looking through a visor reflection',
      imageUrl: astronautShot,
      duration: 3,
      order: 1,
      beatType: 'Character Focus Beat',
      cameraFraming: 'Close-Up',
      cameraMovement: 'Parallax Tracking',
      lensStyle: '35mm Prime',
      lightingMood: 'Cold Key + Blue Rim',
      transition: 'Match Cut',
      captionText: 'They thought the orbital lock was secure...',
      status: 'approved',
    },
    {
      id: 's3',
      prompt: 'Sweeping aerial view of a giant brutalist concrete monolith structure',
      imageUrl: desertShot,
      duration: 5,
      order: 2,
      beatType: 'Climax & Reveal',
      cameraFraming: 'Extreme Wide',
      cameraMovement: 'Vertigo Zoom / Crane Rise',
      lensStyle: 'Macro Lens',
      lightingMood: 'Golden Hour Dust',
      transition: 'Fade to Black',
      captionText: 'Until the signal woke up.',
      status: 'approved',
    },
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
      status: 'completed',
      progress: 100,
      createdAt: new Date(Date.now() - 3600000),
      sourceFrame: desertShot,
      resultImage: renderFinalPlate,
      duration: '45s',
      mode: 'cinematic',
      deliveryStatus: 'delivered',
      deliveryUrl: 'https://cdn.byteplus.media/exports/job-q1-final.mp4',
      stage: 'delivered',
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
      mode: 'cinematic',
    },
    {
      id: 'd2',
      title: 'Silent orbit',
      prompt: 'Close up portrait of an astronaut looking through a visor',
      imageUrl: astronautShot,
      status: 'concept',
      updatedAt: 'Today',
      mode: 'viral',
    },
  ]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ shots, drafts, mode }));
  }, [shots, drafts, mode]);

  const setMode = useCallback((newMode: VideoMode) => {
    setModeState(newMode);
    if (newMode === 'cinematic') {
      setActivePrompt('Cinematic wide shot of a neon-lit cyberpunk street alley with anamorphic lens flare...');
    } else if (newMode === 'viral') {
      setActivePrompt('STOP SCROLLING! High energy visual shock hook of an AI secret you must know...');
    } else {
      setActivePrompt('Clean explainer intro: 3 key features of the new video studio app...');
    }
  }, []);

  const updateCinematicOptions = useCallback((opts: Partial<CinematicOptions>) => {
    setCinematicOptions((prev) => ({ ...prev, ...opts }));
  }, []);

  const updateViralOptions = useCallback((opts: Partial<ViralOptions>) => {
    setViralOptions((prev) => ({ ...prev, ...opts }));
  }, []);

  const addJob = useCallback((prompt: string) => {
    const sourcePool = [cyberpunkShot, astronautShot, desertShot];
    const newJob: RenderJob = {
      id: Math.random().toString(36).substring(7),
      prompt,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
      sourceFrame: sourcePool[Math.floor(Math.random() * sourcePool.length)],
      mode,
      deliveryStatus: 'queued',
      stage: 'storyboard',
      retryCount: 0,
    };

    setQueue((prev) => [newJob, ...prev]);

    setTimeout(() => {
      setQueue((prev) =>
        prev.map((j) => (j.id === newJob.id ? { ...j, status: 'rendering', deliveryStatus: 'rendering', stage: 'sequence_assembly' } : j))
      );

      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setQueue((prev) =>
            prev.map((j) =>
              j.id === newJob.id
                ? {
                    ...j,
                    status: 'completed',
                    progress: 100,
                    resultImage: renderFinalPlate,
                    duration: mode === 'viral' ? '12s' : '1m 12s',
                    deliveryStatus: 'delivered',
                    deliveryUrl: `https://cdn.byteplus.media/exports/job-${j.id}.mp4`,
                    stage: 'delivered',
                  }
                : j
            )
          );
        } else {
          const currentStage = progress > 75 ? 'final_render' : progress > 45 ? 'audio_synthesis' : 'sequence_assembly';
          setQueue((prev) =>
            prev.map((j) => (j.id === newJob.id ? { ...j, progress, stage: currentStage } : j))
          );
        }
      }, 500);
    }, 1200);
  }, [mode]);

  const retryJob = useCallback((id: string) => {
    setQueue((prev) =>
      prev.map((j) => {
        if (j.id !== id) return j;
        const nextRetry = (j.retryCount ?? 0) + 1;
        return {
          ...j,
          status: 'rendering',
          progress: 10,
          deliveryStatus: 'rendering',
          stage: 'sequence_assembly',
          retryCount: nextRetry,
          failureReason: undefined,
        };
      })
    );

    let progress = 10;
    const interval = setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        clearInterval(interval);
        setQueue((prev) =>
          prev.map((j) =>
            j.id === id
              ? {
                  ...j,
                  status: 'completed',
                  progress: 100,
                  resultImage: renderFinalPlate,
                  deliveryStatus: 'delivered',
                  deliveryUrl: `https://cdn.byteplus.media/exports/job-${id}-retry.mp4`,
                  stage: 'delivered',
                }
              : j
          )
        );
      } else {
        setQueue((prev) => prev.map((j) => (j.id === id ? { ...j, progress } : j)));
      }
    }, 400);
  }, []);

  const deliverJob = useCallback((id: string) => {
    setQueue((prev) =>
      prev.map((j) =>
        j.id === id ? { ...j, deliveryStatus: 'delivered', stage: 'delivered' } : j
      )
    );
  }, []);

  const applyTemplate = useCallback((template: SceneTemplate) => {
    setSelectedTemplate(template);

    if (template === 'promo' || template === 'ad') {
      setShots([
        { id: 't1', prompt: 'High impact visual hook showcasing problem/desire', imageUrl: cyberpunkShot, duration: 2, order: 0, beatType: 'Hook', transition: 'Glitch Cut', captionText: 'Tired of slow video editing?' },
        { id: 't2', prompt: 'Sleek UI demonstration of automated BytePlus video agent', imageUrl: astronautShot, duration: 4, order: 1, beatType: 'Solution', transition: 'Dissolve', captionText: 'Meet your autonomous AI director' },
        { id: 't3', prompt: 'Split screen social proof and customer rating callout', imageUrl: desertShot, duration: 3, order: 2, beatType: 'CTA', transition: 'Snap', captionText: 'Try BytePlus Agent today 🚀' },
      ]);
    } else if (template === 'reel' || template === 'faceless_short') {
      setModeState('viral');
      setShots([
        { id: 'v1', prompt: 'Thumb-stop visual shock: glowing cyberpunk artefact reveal', imageUrl: cyberpunkShot, duration: 2, order: 0, beatType: 'Thumb-Stop Hook', transition: 'Whip Pan', captionText: 'NEVER EDIT VIDEOS MANUALLY AGAIN 🚨' },
        { id: 'v2', prompt: 'Rapid 1.5s cut faceless motion B-roll showing fast rendering', imageUrl: astronautShot, duration: 3, order: 1, beatType: 'Fast Cut B-Roll', transition: 'Zoom Flash', captionText: 'Step 1: Pick Cinematic or Viral Mode' },
        { id: 'v3', prompt: 'High contrast graphic CTA overlay with energetic sound effect', imageUrl: desertShot, duration: 2, order: 2, beatType: 'Call To Action', transition: 'Snap', captionText: 'Link in bio to deploy! ⚡' },
      ]);
    } else if (template === 'cinematic_trailer') {
      setModeState('cinematic');
      setShots([
        { id: 'c1', prompt: 'Cinematic wide shot of orbital space station at dusk', imageUrl: cyberpunkShot, duration: 5, order: 0, beatType: 'Atmospheric Opening', cameraFraming: 'Wide Shot', cameraMovement: 'Slow Push In', lensStyle: 'Anamorphic 2.39:1', transition: 'Dissolve', captionText: 'IN A WORLD OF INFINITE SYNTHESIS...' },
        { id: 'c2', prompt: 'Close up portrait of protagonist with intense key lighting', imageUrl: charElara, duration: 4, order: 1, beatType: 'Rising Action', cameraFraming: 'Close-Up', cameraMovement: 'Parallax Tracking', lensStyle: '35mm Prime', transition: 'Match Cut', captionText: 'ONE AGENT STANDS ALONE' },
        { id: 'c3', prompt: 'Dramatic low-angle tracking shot of monolith reveal', imageUrl: desertShot, duration: 6, order: 2, beatType: 'Climax Beat', cameraFraming: 'Extreme Wide', cameraMovement: 'Crane Rise', lensStyle: 'Macro Lens', transition: 'Fade to Black', captionText: 'BYTEPLUS VIDEO AGENT V2' },
      ]);
    }
  }, []);

  const reorderShots = useCallback((startIndex: number, endIndex: number) => {
    setShots((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result.map((shot, index) => ({ ...shot, order: index }));
    });
  }, []);

  const updateShot = useCallback((id: string, updates: Partial<Shot>) => {
    setShots((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const addShot = useCallback((shot?: Partial<Shot>) => {
    setShots((prev) => {
      const newOrder = prev.length;
      const newShot: Shot = {
        id: `s-${Date.now().toString(36)}`,
        prompt: shot?.prompt || 'New cinematic scene beat',
        imageUrl: cyberpunkShot,
        duration: shot?.duration || 4,
        order: newOrder,
        beatType: shot?.beatType || 'Story Beat',
        transition: shot?.transition || 'Dissolve',
        captionText: shot?.captionText || '',
        status: 'draft',
        ...shot,
      };
      return [...prev, newShot];
    });
  }, []);

  const deleteShot = useCallback((id: string) => {
    setShots((prev) => prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i })));
  }, []);

  const saveDraft = useCallback((draft: Omit<Draft, 'id' | 'updatedAt'>) => {
    setDrafts((current) => [
      {
        ...draft,
        id: `d-${Date.now().toString(36)}`,
        updatedAt: 'Just now',
        mode: draft.mode ?? mode,
      },
      ...current,
    ]);
  }, [mode]);

  const deleteDraft = useCallback((id: string) => {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  }, []);

  return (
    <StudioContext.Provider
      value={{
        mode,
        setMode,
        selectedTemplate,
        applyTemplate,
        activePrompt,
        setActivePrompt,
        cinematicOptions,
        updateCinematicOptions,
        viralOptions,
        updateViralOptions,
        queue,
        addJob,
        retryJob,
        deliverJob,
        shots,
        reorderShots,
        updateShot,
        addShot,
        deleteShot,
        bibleAssets,
        drafts,
        saveDraft,
        deleteDraft,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}

export const useStudio = () => useContext(StudioContext);

