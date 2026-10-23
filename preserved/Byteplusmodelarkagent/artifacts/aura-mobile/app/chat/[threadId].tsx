import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetch } from 'expo/fetch';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { MessageBubble } from '@/components/MessageBubble';
import { TypingIndicator } from '@/components/TypingIndicator';
import { ToolActivityBadge } from '@/components/ToolActivityBadge';
import { ChatInput } from '@/components/ChatInput';
import { supabase } from '@/lib/supabase';
import type { MessagePart } from '@/lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

/** If no bytes arrive for this many ms, the stream is considered stalled. */
const STREAM_STALL_MS = 30_000;

// ─── ID generator ────────────────────────────────────────────────────────────

let msgCounter = 0;
function genId(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  /** Only set during streaming */
  streamText?: string;
};

// ─── Data helpers ─────────────────────────────────────────────────────────────

/** Timeout (ms) applied to Supabase queries when loading messages. */
const LOAD_TIMEOUT_MS = 15_000;

async function loadThreadMessages(threadId: string): Promise<{
  title: string;
  messages: ChatMessage[];
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);

  try {
    // .throwOnError() converts both network errors and Supabase abort signals
    // into thrown exceptions so the catch in doLoad() sets loadError = true.
    const [{ data: thread }, { data: rows }] = await Promise.all([
      supabase
        .from('threads')
        .select('title')
        .eq('id', threadId)
        .abortSignal(controller.signal)
        .maybeSingle()
        .throwOnError(),
      supabase
        .from('messages')
        .select('id, role, parts, created_at')
        .eq('thread_id', threadId)
        .abortSignal(controller.signal)
        .order('created_at', { ascending: true })
        .throwOnError(),
    ]);

    const messages: ChatMessage[] = (rows ?? []).map(row => ({
      id: row.id,
      role: (row.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      parts: Array.isArray(row.parts) ? (row.parts as MessagePart[]) : [],
    }));

    return {
      title: thread?.title || 'Conversation',
      messages,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse one line of the Vercel AI SDK UIMessage stream format.
 * Each line is: <type_char>:<json_payload>
 */
function parseStreamLine(line: string): { type: string; payload: unknown } | null {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return null;
  const type = line.slice(0, colonIdx);
  const jsonStr = line.slice(colonIdx + 1);
  try {
    const payload = JSON.parse(jsonStr);
    return { type, payload };
  } catch {
    return null;
  }
}

/** Classify an error thrown during streaming into a user-friendly message. */
function classifyStreamError(err: unknown, statusCode?: number): {
  message: string;
  isAuth: boolean;
  isNetwork: boolean;
} {
  if (statusCode === 401 || statusCode === 403) {
    return { message: 'Session expired. Please sign in again.', isAuth: true, isNetwork: false };
  }
  if (statusCode != null && statusCode >= 500) {
    return { message: 'The server encountered an error. Please try again.', isAuth: false, isNetwork: false };
  }
  if (err instanceof Error) {
    if (err.name === 'AbortError') {
      return { message: 'Response timed out after 30 seconds. Please try again.', isAuth: false, isNetwork: false };
    }
    const msg = err.message.toLowerCase();
    if (
      msg.includes('network request failed') ||
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound')
    ) {
      return { message: 'No internet connection. Check your connection and retry.', isAuth: false, isNetwork: true };
    }
  }
  return { message: 'Something went wrong. Please try again.', isAuth: false, isNetwork: false };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const colors = useColors();
  const { getToken } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadTitle, setThreadTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  /** Banner shown above the input for stream-level errors */
  const [streamError, setStreamError] = useState<string | null>(null);

  const initializedRef = useRef(false);

  // ── Load messages ───────────────────────────────────────────────────────────

  const doLoad = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const { title, messages: loaded } = await loadThreadMessages(threadId);
      setThreadTitle(title);
      setMessages(loaded);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    if (!threadId || initializedRef.current) return;
    initializedRef.current = true;
    doLoad();
  }, [threadId, doLoad]);

  // ── Send / stream ───────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (text: string) => {
      if (streaming || !threadId) return;
      setStreamError(null);

      const currentMessages = [...messages];
      const userMsgId = genId();
      const userMessage: ChatMessage = {
        id: userMsgId,
        role: 'user',
        parts: [{ type: 'text', text }],
      };

      setMessages(prev => [...prev, userMessage]);
      setStreaming(true);
      setShowTyping(true);
      setActiveToolName(null);

      const uiMessages = [
        ...currentMessages.map(m => ({
          id: m.id,
          role: m.role,
          parts: m.parts,
          content: m.parts
            .filter((p): p is { type: 'text'; text: string } => p?.type === 'text')
            .map(p => p.text)
            .join(''),
        })),
        {
          id: userMsgId,
          role: 'user' as const,
          parts: [{ type: 'text', text }],
          content: text,
        },
      ];

      // AbortController with a sliding 30-second stall timeout.
      const controller = new AbortController();
      let stallTimer: ReturnType<typeof setTimeout> | null = null;

      const resetStallTimer = () => {
        if (stallTimer) clearTimeout(stallTimer);
        stallTimer = setTimeout(() => controller.abort(), STREAM_STALL_MS);
      };

      const clearStallTimer = () => {
        if (stallTimer) {
          clearTimeout(stallTimer);
          stallTimer = null;
        }
      };

      let statusCode: number | undefined;

      try {
        const token = await getToken();
        const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

        resetStallTimer(); // Start the stall timer before connecting

        const response = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ messages: uiMessages, id: threadId }),
          signal: controller.signal,
        });

        statusCode = response.status;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let assistantAdded = false;
        const assistantId = genId();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Each received chunk resets the stall timer
          resetStallTimer();

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const parsed = parseStreamLine(trimmed);
            if (!parsed) continue;

            const { type, payload } = parsed;

            if (type === '0' && typeof payload === 'string') {
              fullText += payload;
              setActiveToolName(null);

              if (!assistantAdded) {
                setShowTyping(false);
                setMessages(prev => [
                  ...prev,
                  { id: assistantId, role: 'assistant', parts: [], streamText: fullText },
                ]);
                assistantAdded = true;
              } else {
                setMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.id === assistantId) {
                    updated[updated.length - 1] = { ...last, streamText: fullText };
                  }
                  return updated;
                });
              }
            } else if (type === '9') {
              const invocation = payload as { toolName?: string; state?: string };
              if (invocation.state === 'call' || invocation.state === 'partial-call') {
                setShowTyping(false);
                setActiveToolName(invocation.toolName ?? null);
              }
            } else if (type === 'a') {
              setActiveToolName(null);
            } else if (type === 'd') {
              break;
            }
          }
        }

        clearStallTimer();

        // Finalize streaming message
        if (assistantAdded) {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.id === assistantId) {
              updated[updated.length - 1] = {
                ...last,
                parts: [{ type: 'text', text: fullText }],
                streamText: undefined,
              };
            }
            return updated;
          });
        }

        // Reload from Supabase to pick up persisted tool results (images, videos, etc.)
        try {
          const { messages: fresh, title } = await loadThreadMessages(threadId);
          if (title) setThreadTitle(title);
          setMessages(fresh);
        } catch {
          // Ignore reload failures — we already have the text in state
        }
      } catch (err) {
        clearStallTimer();
        setShowTyping(false);
        setActiveToolName(null);

        const { message, isAuth, isNetwork } = classifyStreamError(err, statusCode);

        if (isAuth) {
          // Token expired — drop back to sign-in
          router.replace('/sign-in');
          return;
        }

        if (isNetwork) {
          // Show persistent banner so the user can retry without re-typing
          setStreamError(message);
        } else {
          // Show inline error bubble for non-network failures
          setMessages(prev => [
            ...prev,
            {
              id: genId(),
              role: 'assistant',
              parts: [{ type: 'text', text: message }],
            },
          ]);
        }
      } finally {
        setStreaming(false);
        setShowTyping(false);
        setActiveToolName(null);
      }
    },
    [messages, streaming, threadId, getToken, router],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const reversedMessages = [...messages].reverse();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: topPadding + 4, borderBottomColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="chevron-left" size={26} color={colors.foreground} />
          </Pressable>
          <Text
            style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}
            numberOfLines={1}
          >
            Conversation
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Error state */}
        <View style={styles.center}>
          <View
            style={[
              styles.errorIcon,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            ]}
          >
            <Feather name="wifi-off" size={28} color={colors.mutedForeground} />
          </View>
          <Text
            style={[styles.errorTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}
          >
            Couldn't load messages
          </Text>
          <Text
            style={[styles.errorSubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
          >
            Check your connection and try again.
          </Text>
          <Pressable
            onPress={doLoad}
            style={({ pressed }) => [
              styles.retryBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="refresh-cw" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={[styles.retryText, { fontFamily: 'Inter_600SemiBold' }]}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 4,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          testID="back-button"
        >
          <Feather name="chevron-left" size={26} color={colors.foreground} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}
          numberOfLines={1}
        >
          {threadTitle || 'Conversation'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        {/* "No connection" banner */}
        {streamError ? (
          <Pressable
            onPress={() => setStreamError(null)}
            style={[styles.errorBanner, { backgroundColor: colors.destructive }]}
          >
            <Feather name="wifi-off" size={14} color="#fff" />
            <Text style={[styles.errorBannerText, { fontFamily: 'Inter_400Regular' }]}>
              {streamError}
            </Text>
            <Feather name="x" size={14} color="#fff" />
          </Pressable>
        ) : null}

        <FlatList
          data={reversedMessages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MessageBubble role={item.role} parts={item.parts} streamText={item.streamText} />
          )}
          inverted={messages.length > 0}
          ListHeaderComponent={
            <>
              {activeToolName && <ToolActivityBadge toolName={activeToolName} />}
              {showTyping && <TypingIndicator />}
            </>
          }
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            messages.length === 0 && !streaming ? (
              <View style={styles.emptyState}>
                <Text
                  style={[
                    styles.emptyText,
                    { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
                  ]}
                >
                  What can Aura help you create today?
                </Text>
              </View>
            ) : null
          }
        />
        <ChatInput onSend={handleSend} disabled={streaming} />
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  // Load error state
  errorIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  errorTitle: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
  },
  // Stream error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorBannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },
});
