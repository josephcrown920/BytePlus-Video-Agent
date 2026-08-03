import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import type { MessagePart, StoredMessage } from '@/lib/supabase';

// Module-level counter for unique message IDs
let msgCounter = 0;
function genId(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  /** Only set during streaming */
  streamText?: string;
};

async function loadThreadMessages(threadId: string): Promise<{
  title: string;
  messages: ChatMessage[];
}> {
  const [{ data: thread }, { data: rows }] = await Promise.all([
    supabase
      .from('threads')
      .select('title')
      .eq('id', threadId)
      .maybeSingle(),
    supabase
      .from('messages')
      .select('id, role, parts, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true }),
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

export default function ChatScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const colors = useColors();
  const { getToken } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadTitle, setThreadTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [activeToolName, setActiveToolName] = useState<string | null>(null);

  const initializedRef = useRef(false);

  // Load existing messages on mount
  useEffect(() => {
    if (!threadId || initializedRef.current) return;
    initializedRef.current = true;

    loadThreadMessages(threadId)
      .then(({ title, messages: loaded }) => {
        setThreadTitle(title);
        setMessages(loaded);
      })
      .catch(() => {
        Alert.alert('Error', 'Could not load conversation.');
      })
      .finally(() => setLoading(false));
  }, [threadId]);

  const handleSend = useCallback(
    async (text: string) => {
      if (streaming || !threadId) return;

      // Capture current messages BEFORE state update (avoid stale closure)
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

      // Build the UIMessage array to send to the API
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

      try {
        const token = await getToken();
        const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
        const response = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ messages: uiMessages, id: threadId }),
        });

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
              // Text delta
              fullText += payload;
              setActiveToolName(null);

              if (!assistantAdded) {
                setShowTyping(false);
                setMessages(prev => [
                  ...prev,
                  {
                    id: assistantId,
                    role: 'assistant',
                    parts: [],
                    streamText: fullText,
                  },
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
              // Tool invocation
              const invocation = payload as { toolName?: string; state?: string };
              if (invocation.state === 'call' || invocation.state === 'partial-call') {
                setShowTyping(false);
                setActiveToolName(invocation.toolName ?? null);
              }
            } else if (type === 'a') {
              // Tool result — clear activity
              setActiveToolName(null);
            } else if (type === 'd') {
              // Stream finished
              break;
            }
          }
        }

        // Finalize: replace streamText with a proper text part and reload from Supabase
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

        // Reload fresh from Supabase to get persisted messages (with images, tool results etc.)
        try {
          const { messages: fresh, title } = await loadThreadMessages(threadId);
          if (title) setThreadTitle(title);
          setMessages(fresh);
        } catch {
          // Ignore reload errors — we already have the text in state
        }
      } catch (err) {
        setShowTyping(false);
        setActiveToolName(null);
        const errorId = genId();
        setMessages(prev => [
          ...prev,
          {
            id: errorId,
            role: 'assistant',
            parts: [{ type: 'text', text: 'Sorry, something went wrong. Please try again.' }],
          },
        ]);
      } finally {
        setStreaming(false);
        setShowTyping(false);
        setActiveToolName(null);
      }
    },
    [messages, streaming, threadId, getToken],
  );

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

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Custom header */}
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={reversedMessages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              role={item.role}
              parts={item.parts}
              streamText={item.streamText}
            />
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
});
