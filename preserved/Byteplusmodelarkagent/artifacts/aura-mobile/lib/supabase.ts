import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Thread = {
  id: string;
  title: string;
  updated_at: string;
  created_at: string;
  user_id: string;
};

export type StoredMessage = {
  id: string;
  role: string;
  parts: MessagePart[];
  created_at: string;
};

/** Simplified union that represents the relevant part types stored in Supabase. */
export type MessagePart = {
  type: string;
  /** Present when type === 'text' */
  text?: string;
  /** Present when type === 'tool-invocation' */
  toolInvocation?: ToolInvocation;
};

export type ToolInvocation = {
  toolInvocationId: string;
  toolName: string;
  state: 'partial-call' | 'call' | 'result';
  args?: unknown;
  result?: unknown;
};
