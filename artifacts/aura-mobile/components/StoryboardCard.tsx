import React, { useState, useCallback } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { cinematicSceneRole, CINEMATIC_ROLE_COLORS } from '@/lib/cinematic';

type Scene = {
  scene: number;
  title: string;
  description: string;
  image_prompt: string;
  imageUrl?: string | null;
};

type StoryboardOutput = {
  title: string;
  concept?: string;
  scenes: Scene[];
};

type ImageState = 'loading' | 'loaded' | 'error';

function SceneImage({ scene }: { scene: Scene }) {
  const colors = useColors();
  const [state, setState] = useState<ImageState>(scene.imageUrl ? 'loading' : 'error');

  if (!scene.imageUrl || state === 'error') {
    return (
      <View style={[styles.thumb, { backgroundColor: colors.muted }]}>
        <Feather name="image" size={18} color={colors.mutedForeground} />
      </View>
    );
  }

  return (
    <View style={[styles.thumb, { backgroundColor: colors.muted }]}>
      <Image
        source={{ uri: scene.imageUrl }}
        style={styles.thumbImg}
        resizeMode="cover"
        onLoad={() => setState('loaded')}
        onError={() => setState('error')}
      />
      {state === 'loading' && (
        <View style={[StyleSheet.absoluteFill, styles.thumbSkeleton, { backgroundColor: colors.muted }]} />
      )}
      <View style={styles.thumbLabel}>
        <Text style={styles.thumbLabelText}>Frame {scene.scene}</Text>
      </View>
    </View>
  );
}

export function StoryboardCard({ result }: { result: unknown }) {
  const colors = useColors();
  const board = result as StoryboardOutput;

  if (!board?.title || !Array.isArray(board.scenes) || board.scenes.length === 0) {
    return null;
  }

  const total = board.scenes.length;

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={[styles.headerIcon, { backgroundColor: `rgba(168,85,247,0.15)` }]}>
          <Feather name="layers" size={14} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {board.title}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {total}-scene storyboard · Hook → Narrative → Close
          </Text>
        </View>
      </View>

      {/* Scenes */}
      {board.scenes.map((scene, i) => {
        const role = cinematicSceneRole(i, total);
        const roleColors = CINEMATIC_ROLE_COLORS[role];

        return (
          <View
            key={scene.scene}
            style={[
              styles.sceneRow,
              { borderTopColor: colors.border },
              i > 0 && styles.sceneRowBorder,
            ]}
          >
            <SceneImage scene={scene} />

            <View style={styles.sceneInfo}>
              {/* Role badge */}
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: roleColors.bg,
                    borderColor: roleColors.border,
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: roleColors.text }]}>
                  {role.toUpperCase()}
                </Text>
              </View>

              <Text style={[styles.sceneTitle, { color: colors.foreground }]} numberOfLines={2}>
                {scene.title}
              </Text>
              <Text style={[styles.sceneDesc, { color: colors.mutedForeground }]} numberOfLines={3}>
                {scene.description}
              </Text>
            </View>
          </View>
        );
      })}
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
  sceneRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sceneRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 90,
    height: 90,
    borderRadius: 10,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbSkeleton: {
    opacity: 0.6,
  },
  thumbLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  thumbLabelText: {
    fontSize: 9,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.9)',
  },
  sceneInfo: {
    flex: 1,
    gap: 5,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.8,
  },
  sceneTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 17,
  },
  sceneDesc: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
});
