import React, { useEffect } from 'react';
import { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

const TOOL_LABELS: Record<string, string> = {
  generate_image: 'Generating image',
  generate_video: 'Creating video',
  web_search: 'Searching the web',
  fetch_url: 'Fetching page',
  generate_script: 'Writing script',
  generate_captions: 'Creating captions',
  storyboard: 'Creating storyboard',
  remember: 'Saving memory',
  recall_memories: 'Recalling memories',
};

const TOOL_ICONS: Record<string, ComponentProps<typeof Feather>['name']> = {
  generate_image: 'image',
  generate_video: 'film',
  web_search: 'search',
  fetch_url: 'globe',
  generate_script: 'file-text',
  generate_captions: 'type',
  storyboard: 'layers',
  remember: 'bookmark',
  recall_memories: 'database',
};

type Props = {
  toolName: string;
};

export function ToolActivityBadge({ toolName }: Props) {
  const colors = useColors();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.5, { duration: 600 }),
      ),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const label = TOOL_LABELS[toolName] ?? toolName.replace(/_/g, ' ');
  const icon: ComponentProps<typeof Feather>['name'] = TOOL_ICONS[toolName] ?? 'zap';

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 4, alignItems: 'flex-start' }}>
      <Animated.View
        style={[
          animStyle,
          {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
          },
        ]}
      >
        <Feather name={icon} size={12} color={colors.primary} style={{ marginRight: 6 }} />
        <Text
          style={{
            fontSize: 12,
            color: colors.mutedForeground,
            fontFamily: 'Inter_400Regular',
          }}
        >
          {label}…
        </Text>
      </Animated.View>
    </View>
  );
}
