import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { CINEMATIC_ROLE_COLORS } from '@/lib/cinematic';
import { copyShareLink } from '@/lib/share';
import { useAuth } from '@/context/AuthContext';

type ScriptScene = {
  scene: number;
  description: string;
  dialogue?: string;
  duration_seconds?: number;
};

type ScriptOutput = {
  title: string;
  format?: string;
  total_duration_seconds?: number;
  hook?: string;
  close?: string;
  scenes: ScriptScene[];
  /** Set by the server when Scene 0 failed the sensory-hook quality check after one retry. */
  hookWarning?: boolean;
};

/** Result shape returned by POST /api/video-agent/regenerate-hook. */
type RegenerateHookResponse = {
  hook: string;
  scene: { description: string; dialogue?: string };
  hookWarning: boolean;
};

function getApiBaseUrl(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!domain) throw new Error('Server connection is unavailable right now.');
  return `https://${domain}`;
}

export function ScriptCard({ result }: { result: unknown }) {
  const colors = useColors();
  const { getToken } = useAuth();
  const [sharing, setSharing] = useState(false);
  const [regeneratingHook, setRegeneratingHook] = useState(false);
  const [hookOverride, setHookOverride] = useState<{
    hook?: string;
    scene0: { description: string; dialogue?: string };
    hookWarning: boolean;
  } | null>(null);
  const original = result as ScriptOutput;

  if (!original?.title || !Array.isArray(original.scenes) || original.scenes.length === 0) {
    return null;
  }

  // Apply the locally-regenerated hook (if any) on top of the original result,
  // so the card re-renders immediately without needing to touch the message store.
  const script: ScriptOutput = hookOverride
    ? {
        ...original,
        hook: hookOverride.hook ?? original.hook,
        hookWarning: hookOverride.hookWarning,
        scenes: original.scenes.map((scene, i) =>
          i === 0
            ? { ...scene, description: hookOverride.scene0.description, dialogue: hookOverride.scene0.dialogue }
            : scene,
        ),
      }
    : original;

  const hookColors = CINEMATIC_ROLE_COLORS.Hook;
  const closeColors = CINEMATIC_ROLE_COLORS.Close;
  const narrativeColors = CINEMATIC_ROLE_COLORS.Narrative;
  const hasHookWarning = Boolean(script.hookWarning);

  const durationLabel = script.total_duration_seconds
    ? `${script.total_duration_seconds}s`
    : null;
  const formatLabel = script.format ?? 'script';

  const handleShare = async () => {
    setSharing(true);
    try {
      await copyShareLink('script', script as unknown as Record<string, unknown>);
      Alert.alert('Link copied', 'Anyone with this link can view this script.');
    } catch (error) {
      Alert.alert(
        'Could not create link',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSharing(false);
    }
  };

  const handleRegenerateHook = async () => {
    setRegeneratingHook(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in to regenerate the hook.');

      const baseUrl = getApiBaseUrl();
      const currentScene0 = script.scenes[0];
      const res = await fetch(`${baseUrl}/api/video-agent/regenerate-hook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          topic: script.title,
          style: script.format,
          currentHook: script.hook,
          currentDescription: currentScene0?.description,
          remainingScenes: script.scenes.slice(1).map(s => ({ description: s.description, dialogue: s.dialogue })),
        }),
      });

      const data = (await res.json()) as RegenerateHookResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not regenerate the hook.');

      setHookOverride({
        hook: data.hook,
        scene0: data.scene,
        hookWarning: data.hookWarning,
      });
    } catch (error) {
      Alert.alert(
        'Could not regenerate hook',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setRegeneratingHook(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.headerIcon, { backgroundColor: 'rgba(168,85,247,0.15)' }]}>
          <Feather name="file-text" size={14} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {script.title}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {formatLabel}{durationLabel ? ` · ${durationLabel}` : ''} · Hook → Narrative → Close
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Copy script share link"
          accessibilityHint="Creates a public view-only link and copies it to your clipboard"
          disabled={sharing}
          onPress={() => void handleShare()}
          style={[
            styles.shareButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            sharing && styles.shareButtonDisabled,
          ]}
        >
          <Feather name={sharing ? 'loader' : 'share-2'} size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Hook banner */}
      {script.hook ? (
        <View style={[styles.banner, { backgroundColor: hookColors.bg, borderBottomColor: hookColors.border }]}>
          <View style={[styles.bannerBadge, { backgroundColor: hookColors.bg, borderColor: hookColors.border }]}>
            <Text style={[styles.bannerBadgeText, { color: hookColors.text }]}>HOOK</Text>
          </View>
          <Text style={[styles.bannerText, { color: colors.foreground }]}>{script.hook}</Text>
        </View>
      ) : null}

      {/* Scenes */}
      <View style={styles.scenes}>
        {script.scenes.map((scene, i) => {
          // Determine role for numbering context — middle scenes are Narrative
          const isFirst = i === 0;
          const isLast = i === script.scenes.length - 1;
          const role = isFirst ? 'Hook' : isLast ? 'Close' : 'Narrative';
          const roleColors = isFirst ? hookColors : isLast ? closeColors : narrativeColors;

          return (
            <View
              key={scene.scene}
              style={[
                styles.sceneRow,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              ]}
            >
              {/* Scene number column */}
              <View style={[styles.sceneNum, { backgroundColor: roleColors.bg, borderColor: roleColors.border }]}>
                <Text style={[styles.sceneNumText, { color: roleColors.text }]}>
                  {scene.scene}
                </Text>
              </View>

              <View style={styles.sceneBody}>
                {isFirst && hasHookWarning && (
                  <View style={[styles.hookWarningBox, { backgroundColor: 'rgba(234,179,8,0.12)', borderColor: 'rgba(234,179,8,0.4)' }]}>
                    <View style={styles.hookWarningRow}>
                      <Feather name="alert-triangle" size={11} color="#ca8a04" />
                      <Text style={[styles.hookWarningText, { color: '#ca8a04' }]}>
                        Opening may not be a strong sensory hook — consider regenerating
                      </Text>
                    </View>
                    <TouchableOpacity
                      accessibilityLabel="Regenerate hook"
                      accessibilityHint="Generates a new opening scene and replaces this one"
                      disabled={regeneratingHook}
                      onPress={() => void handleRegenerateHook()}
                      style={[
                        styles.regenerateButton,
                        { borderColor: 'rgba(202,138,4,0.5)' },
                        regeneratingHook && styles.regenerateButtonDisabled,
                      ]}
                    >
                      {regeneratingHook ? (
                        <ActivityIndicator size="small" color="#ca8a04" />
                      ) : (
                        <Feather name="refresh-cw" size={12} color="#ca8a04" />
                      )}
                      <Text style={[styles.regenerateButtonText, { color: '#ca8a04' }]}>
                        {regeneratingHook ? 'Regenerating…' : 'Regenerate hook'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                <Text style={[styles.sceneDesc, { color: colors.foreground }]}>
                  {scene.description}
                </Text>
                {scene.dialogue ? (
                  <View style={[styles.dialogueBox, { backgroundColor: colors.muted, borderLeftColor: colors.primary }]}>
                    <Text style={[styles.dialogueText, { color: colors.mutedForeground }]}>
                      "{scene.dialogue}"
                    </Text>
                  </View>
                ) : null}
                {scene.duration_seconds ? (
                  <Text style={[styles.duration, { color: colors.mutedForeground }]}>
                    {scene.duration_seconds}s
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {/* Close banner */}
      {script.close ? (
        <View style={[styles.banner, styles.closeBanner, { backgroundColor: closeColors.bg, borderTopColor: closeColors.border }]}>
          <View style={[styles.bannerBadge, { backgroundColor: closeColors.bg, borderColor: closeColors.border }]}>
            <Text style={[styles.bannerBadgeText, { color: closeColors.text }]}>CLOSE</Text>
          </View>
          <Text style={[styles.bannerText, { color: colors.foreground }]}>{script.close}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  shareButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonDisabled: {
    opacity: 0.55,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 18,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBanner: {
    borderBottomWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bannerBadge: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 1,
  },
  bannerBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
  },
  scenes: {
    paddingHorizontal: 14,
  },
  sceneRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  sceneNum: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sceneNumText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  sceneBody: {
    flex: 1,
    gap: 5,
  },
  sceneDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 17,
  },
  dialogueBox: {
    borderLeftWidth: 2,
    paddingLeft: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  dialogueText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  duration: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  hookWarningBox: {
    gap: 8,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  hookWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hookWarningText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 15,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  regenerateButtonDisabled: {
    opacity: 0.6,
  },
  regenerateButtonText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
});
