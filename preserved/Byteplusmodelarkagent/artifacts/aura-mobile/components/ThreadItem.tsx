import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import type { Thread } from '@/lib/supabase';

type Props = {
  thread: Thread;
  onPress: (thread: Thread) => void;
  onDelete: (threadId: string) => void;
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (days === 1) return 'Yesterday';
    if (days < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function ThreadItem({ thread, onPress, onDelete }: Props) {
  const colors = useColors();

  return (
    <Pressable
      onPress={() => onPress(thread)}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDelete(thread.id);
      }}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? colors.muted : 'transparent',
          borderBottomColor: colors.border,
        },
      ]}
      testID={`thread-${thread.id}`}
    >
      <View style={styles.icon}>
        <Feather name="message-square" size={18} color={colors.mutedForeground} />
      </View>
      <View style={styles.content}>
        <Text
          style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}
          numberOfLines={1}
        >
          {thread.title || 'New conversation'}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {formatDate(thread.updated_at)}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(168,85,247,0.08)',
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
  },
});
