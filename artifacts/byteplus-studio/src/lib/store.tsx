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

export interface RenderJob {
  id: string;
  prompt: string;
  status: JobStatus;
  progress: number;
  createdAt: Date;
  sourceFrame: string;
  resultImage?: string;
  duration?: string;
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
  queue: RenderJob[];
  addJob: (prompt: string) => void;
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
  queue: [],
  addJob: () => {},
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
    { id: 'q1', prompt: 'High speed chase through asteroid field', status: 'completed', progress: 100, createdAt: new Date(Date.now() - 3600000), sourceFrame: desertShot, resultImage: renderFinalPlate, duration: '45s' },
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

  const addJob = useCallback((prompt: string) => {
    const sourcePool = [cyberpunkShot, astronautShot, desertShot];
    const newJob: RenderJob = {
      id: Math.random().toString(36).substring(7),
      prompt,
      status: 'queued',
      progress: 0,
      createdAt: new Date(),
      sourceFrame: sourcePool[Math.floor(Math.random() * sourcePool.length)],
    };
    
    setQueue(prev => [newJob, ...prev]);

    // Simulate rendering process
    setTimeout(() => {
      setQueue(prev => prev.map(j => j.id === newJob.id ? { ...j, status: 'rendering' } : j));
      
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setQueue(prev => prev.map(j => j.id === newJob.id ? { 
            ...j, 
            status: 'completed', 
            progress: 100,
            resultImage: renderFinalPlate,
            duration: '1m 12s'
          } : j));
        } else {
          setQueue(prev => prev.map(j => j.id === newJob.id ? { ...j, progress } : j));
        }
      }, 500);
    }, 1500);
  }, []);

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
      queue,
      addJob,
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
