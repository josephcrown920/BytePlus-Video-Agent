import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { MessagePart } from '@/lib/supabase';

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; url: string; alt: string };

function parseTextContent(raw: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const mdImageRegex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mdImageRegex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      const slice = raw.slice(lastIndex, match.index).trim();
      if (slice) parts.push({ type: 'text', text: slice });
    }
    parts.push({ type: 'image', url: match[2], alt: match[1] });
    lastIndex = match.index + match[0].length;
  }

  const remaining = raw.slice(lastIndex).trim();
  if (remaining) parts.push({ type: 'text', text: remaining });
  if (parts.length === 0 && raw.trim()) parts.push({ type: 'text', text: raw.trim() });
  return parts;
}

function getMessageText(parts: MessagePart[]): string {
  return parts.filter(p => p.type === 'text').map(p => p.text ?? '').join('');
}

function getToolImageUrls(parts: MessagePart[]): string[] {
  const urls: string[] = [];
  for (const part of parts) {
    if (part.type === 'tool-invocation' && part.toolInvocation?.state === 'result') {
      const result = part.toolInvocation.result;
      if (typeof result === 'string' && result.startsWith('http')) {
        urls.push(result);
      } else if (result !== null && typeof result === 'object' && 'url' in result) {
        urls.push(String((result as { url: unknown }).url));
      }
    }
  }
  return urls;
}

type Props = {
  role: 'user' | 'assistant' | string;
  /** Parts from Supabase stored message */
  parts?: MessagePart[];
  /** Streaming text (overrides parts while streaming) */
  streamText?: string;
};

export function MessageBubble({ role, parts = [], streamText }: Props) {
  const colors = useColors();
  const isUser = role === 'user';

  const rawText = streamText !== undefined ? streamText : getMessageText(parts);
  const toolImageUrls = streamText !== undefined ? [] : getToolImageUrls(parts);
  const contentParts = rawText ? parseTextContent(rawText) : [];

  const allImageUrls = new Set([
    ...contentParts.filter(p => p.type === 'image').map(p => (p as { type: 'image'; url: string }).url),
    ...toolImageUrls,
  ]);
  const textOnlyParts = contentParts.filter(p => p.type === 'text') as { type: 'text'; text: string }[];

  if (rawText === '' && allImageUrls.size === 0) return null;

  return (
    <View style={[styles.container, { alignItems: isUser ? 'flex-end' : 'flex-start' }]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? colors.primary : colors.surfaceElevated,
            borderWidth: isUser ? 0 : 1,
            borderColor: isUser ? 'transparent' : colors.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        {textOnlyParts.map((p, i) => (
          <Text key={i} style={[styles.text, { color: isUser ? '#FFFFFF' : colors.foreground }]}>
            {p.text}
          </Text>
        ))}
        {[...allImageUrls].map((url, i) => (
          <Image
            key={i}
            source={{ uri: url }}
            style={[styles.image, { backgroundColor: colors.muted }]}
            resizeMode="cover"
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },
  image: {
    width: 260,
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
});
