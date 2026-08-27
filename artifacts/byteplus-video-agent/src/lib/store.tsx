import React, { createContext, useContext, useState, useEffect } from 'react';

export type TaskStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'requires_api';
export type TaskType = 'image' | 'video' | 'upscale' | 'multi-shot';

export interface GenerationTask {
  id: string;
  type: TaskType;
  prompt: string;
  status: TaskStatus;
  progress: number;
  createdAt: number;
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
  tasks: GenerationTask[];
  characters: Character[];
}

interface WorkspaceContextType extends WorkspaceState {
  addTask: (task: Omit<GenerationTask, 'id' | 'createdAt' | 'status' | 'progress'>) => void;
  updateTask: (id: string, updates: Partial<GenerationTask>) => void;
  removeTask: (id: string) => void;
  clearTasks: () => void;
  addCharacter: (character: Omit<Character, 'id'>) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkspaceState>({
    tasks: [],
    characters: [
      { id: '1', name: 'Cipher', description: 'Cybernetic operative with neon implants', tags: ['sci-fi', 'protagonist'], referenceImageUrl: 'hero-placeholder' }
    ],
  });

  // Hydrate from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('byteplus_workspace');
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse workspace state');
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('byteplus_workspace', JSON.stringify(state));
  }, [state]);

  const addTask = (task: Omit<GenerationTask, 'id' | 'createdAt' | 'status' | 'progress'>) => {
    const newTask: GenerationTask = {
      ...task,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: Date.now(),
      status: 'requires_api',
      progress: 0,
      error: 'Server-side BytePlus connection required'
    };

    setState(prev => ({
      ...prev,
      tasks: [newTask, ...prev.tasks]
    }));
  };

  const updateTask = (id: string, updates: Partial<GenerationTask>) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  };

  const removeTask = (id: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id)
    }));
  };

  const clearTasks = () => {
    setState(prev => ({ ...prev, tasks: [] }));
  };

  const addCharacter = (character: Omit<Character, 'id'>) => {
    setState(prev => ({
      ...prev,
      characters: [...prev.characters, { ...character, id: Math.random().toString(36).substring(2, 9) }]
    }));
  };

  return (
    <WorkspaceContext.Provider value={{
      ...state,
      addTask,
      updateTask,
      removeTask,
      clearTasks,
      addCharacter
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}