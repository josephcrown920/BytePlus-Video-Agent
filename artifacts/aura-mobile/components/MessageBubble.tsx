import React from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { MessagePart } from '@/lib/supabase';

// ─── Tool result shapes ───────────────────────────────────────────────────────

type ToolResult = Record<string, unknown>;

interface ImageResult extends ToolResult {
  imageUrl: string;
}
interface VideoResult extends ToolResult {
  videoUrl: string;
}
interface SceneItem {
  scene: number;
  imageUrl?: string | null;
  title?: string;
  description?: string;
}
interface ScenicResult extends ToolResult {
  title?: string;
  videoUrl?: string;
  scenes: SceneItem[];
}

function isImageResult(r: ToolResult): r is ImageResult {
  return typeof r.imageUrl === 'string' && r.imageUrl.startsWith('http');
}
function isVideoResult(r: ToolResult): r is VideoResult {
  return typeof r.videoUrl === 'string' && r.videoUrl.startsWith('http') && !('scenes' in r);
}
function isScenicResult(r: ToolResult): r is ScenicResult {
  return Array.isArray(r.scenes) && (r.scenes as unknown[]).length > 0;
}

// ─── Text + markdown image parsing ───────────────────────────────────────────

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; url: string; alt: string };

function parseTextContent(raw: string): ContentPart[] {
  const parts: ContentPart[] = [];
  // Strip <video ...> HTML tags (already shown as a VideoCard)
  const cleaned = raw.replace(/<video\b[^>]*>[\s\S]*?<\/video>/gi, '').trim();
  const mdImageRegex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mdImageRegex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      const slice = cleaned.slice(lastIndex, match.index).trim();
      if (slice) parts.push({ type: 'text', text: slice });
    }
    parts.push({ type: 'image', url: match[2], alt: match[1] });
    lastIndex = match.index + match[0].length;
  }

  const remaining = cleaned.slice(lastIndex).trim();
  if (remaining) parts.push({ type: 'text', text: remaining });
  if (parts.length === 0 && cleaned) parts.push({ type: 'text', text: cleaned });
  return parts;
}

function getMessageText(parts: MessagePart[]): string {
  return parts.filter(p => p.type === 'text').map(p => p.text ?? '').join('');
}

// ─── Tool result extraction ───────────────────────────────────────────────────

type ExtractedMedia = {
  images: string[];        // standalone image URLs
  videos: string[];        // standalone video URLs (no scenes)
  scenic: ScenicResult[];  // storyboard / previs results (scenes + optional video)
};

function extractMedia(parts: MessagePart[]): ExtractedMedia {
  const images: string[] = [];
  const videos: string[] = [];
  const scenic: ScenicResult[] = [];
  const seenUrls = new Set<string>();

  for (const part of parts) {
    if (part.type !== 'tool-invocation') continue;
    const inv = part.toolInvocation;
    if (!inv || inv.state !== 'result') continue;

    const result = inv.result;
    if (!result || typeof result !== 'object') continue;
    const r = result as ToolResult;

    if (isScenicResult(r)) {
      scenic.push(r);
    } else if (isImageResult(r) && !seenUrls.has(r.imageUrl)) {
      seenUrls.add(r.imageUrl);
      images.push(r.imageUrl);
    } else if (isVideoResult(r) && !seenUrls.has(r.videoUrl)) {
      seenUrls.add(r.videoUrl);
      videos.push(r.videoUrl);
    }
  }

  return { images, videos, scenic };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VideoCard({ url, label }: { url: string; label?: string }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      style={({ pressed }) => [
        styles.videoCard,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.videoIconWrap, { backgroundColor: colors.primary + '22' }]}>
        <Feather name="play-circle" size={36} color={colors.primary} />
      </View>
      <View style={styles.videoInfo}>
        <Text style={[styles.videoLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          {label ?? 'Generated Video'}
        </Text>
        <Text style={[styles.videoSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Tap to play
        </Text>
      </View>
      <Feather name="external-link" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function SceneStrip({ result }: { result: ScenicResult }) {
  const colors = useColors();
  const validScenes = result.scenes.filter(s => s.imageUrl);

  return (
    <View style={styles.sceneBlock}>
      {result.title ? (
        <Text style={[styles.sceneTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          {result.title}
        </Text>
      ) : null}

      {/* Previs video link if present */}
      {result.videoUrl ? (
        <VideoCard url={result.videoUrl} label={result.title ?? 'Previs'} />
      ) : null}

      {/* Horizontal scene image strip */}
      {validScenes.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sceneStrip}
        >
          {validScenes.map((scene) => (
            <View key={scene.scene} style={styles.sceneThumb}>
              <Image
                source={{ uri: scene.imageUrl! }}
                style={[styles.sceneImage, { backgroundColor: colors.muted }]}
                contentFit="cover"
                transition={200}
              />
              <Text
                style={[styles.sceneNum, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}
                numberOfLines={1}
              >
                {scene.title ?? `Scene ${scene.scene}`}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  role: 'user' | 'assistant' | string;
  parts?: MessagePart[];
  streamText?: string;
};

export function MessageBubble({ role, parts = [], streamText }: Props) {
  const colors = useColors();
  const isUser = role === 'user';

  const rawText = streamText !== undefined ? streamText : getMessageText(parts);
  const media = streamText !== undefined
    ? { images: [], videos: [], scenic: [] }
    : extractMedia(parts);

  const contentParts = rawText ? parseTextContent(rawText) : [];
  const textOnlyParts = contentParts.filter(p => p.type === 'text') as { type: 'text'; text: string }[];

  // Markdown-embedded images (deduplicated against tool results)
  const toolImageSet = new Set(media.images);
  const mdImages = contentParts
    .filter(p => p.type === 'image')
    .map(p => (p as { type: 'image'; url: string }).url)
    .filter(u => !toolImageSet.has(u));

  const hasContent =
    textOnlyParts.length > 0 ||
    mdImages.length > 0 ||
    media.images.length > 0 ||
    media.videos.length > 0 ||
    media.scenic.length > 0;

  if (!hasContent) return null;

  return (
    <View style={[styles.container, { alignItems: isUser ? 'flex-end' : 'flex-start' }]}>
      {/* Text bubble */}
      {(textOnlyParts.length > 0 || (isUser && mdImages.length === 0 && media.images.length === 0)) && (
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
        </View>
      )}

      {/* Markdown-embedded images (not duplicated from tool results) */}
      {mdImages.map((url, i) => (
        <Image
          key={`md-${i}`}
          source={{ uri: url }}
          style={[styles.image, { backgroundColor: colors.muted }]}
          contentFit="cover"
          transition={300}
        />
      ))}

      {/* Tool: standalone images */}
      {media.images.map((url, i) => (
        <Image
          key={`img-${i}`}
          source={{ uri: url }}
          style={[styles.image, { backgroundColor: colors.muted }]}
          contentFit="cover"
          transition={300}
        />
      ))}

      {/* Tool: standalone videos (generate_video) */}
      {media.videos.map((url, i) => (
        <VideoCard key={`vid-${i}`} url={url} />
      ))}

      {/* Tool: storyboard / previs scenes */}
      {media.scenic.map((result, i) => (
        <SceneStrip key={`scene-${i}`} result={result} />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
    gap: 8,
  },
  bubble: {
    maxWidth: '82%',
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
    borderRadius: 12,
  },
  // Video card
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 300,
  },
  videoIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: { flex: 1 },
  videoLabel: { fontSize: 14, marginBottom: 2 },
  videoSub: { fontSize: 12 },
  // Scene strip
  sceneBlock: { gap: 8, maxWidth: '100%' },
  sceneTitle: { fontSize: 13, marginBottom: 2 },
  sceneStrip: { gap: 8, paddingVertical: 2 },
  sceneThumb: { width: 110, gap: 4 },
  sceneImage: { width: 110, height: 70, borderRadius: 8 },
  sceneNum: { fontSize: 11, textAlign: 'center' },
});
