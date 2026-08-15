import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { CINEMATIC_ROLE_COLORS } from '@/lib/cinematic';

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
};

export function ScriptCard({ result }: { result: unknown }) {
  const colors = useColors();
  const script = result as ScriptOutput;

  if (!script?.title || !Array.isArray(script.scenes) || script.scenes.length === 0) {
    return null;
  }

  const hookColors = CINEMATIC_ROLE_COLORS.Hook;
  const closeColors = CINEMATIC_ROLE_COLORS.Close;
  const narrativeColors = CINEMATIC_ROLE_COLORS.Narrative;

  const durationLabel = script.total_duration_seconds
    ? `${script.total_duration_seconds}s`
    : null;
  const formatLabel = script.format ?? 'script';

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
});
