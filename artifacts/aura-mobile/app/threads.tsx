import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { ThreadItem } from '@/components/ThreadItem';
import { supabase } from '@/lib/supabase';
import type { Thread } from '@/lib/supabase';

async function fetchThreads(): Promise<Thread[]> {
  const { data, error } = await supabase
    .from('threads')
    .select('id, title, updated_at, created_at, user_id')
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as Thread[];
}

export default function ThreadsScreen() {
  const colors = useColors();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [creatingThread, setCreatingThread] = useState(false);

  const { data: threads = [], isLoading, refetch } = useQuery<Thread[]>({
    queryKey: ['threads'],
    queryFn: fetchThreads,
  });

  const handleNewChat = useCallback(async () => {
    if (!user) return;
    setCreatingThread(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { data, error } = await supabase
        .from('threads')
        .insert({ user_id: user.id, title: 'New conversation' })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
      router.push(`/chat/${data.id}`);
    } catch (e) {
      Alert.alert('Error', 'Could not create a new conversation.');
    } finally {
      setCreatingThread(false);
    }
  }, [user]);

  const handleDeleteThread = useCallback((threadId: string) => {
    Alert.alert('Delete conversation', 'Are you sure you want to delete this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('threads').delete().eq('id', threadId);
            queryClient.setQueryData<Thread[]>(['threads'], prev =>
              prev ? prev.filter(t => t.id !== threadId) : [],
            );
          } catch {
            Alert.alert('Error', 'Could not delete the conversation.');
          }
        },
      },
    ]);
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/sign-in');
        },
      },
    ]);
  }, [signOut]);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Aura
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
            testID="sign-out-button"
          >
            <Feather name="log-out" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            onPress={handleNewChat}
            disabled={creatingThread}
            style={({ pressed }) => [
              styles.iconBtn,
              styles.newChatBtn,
              { backgroundColor: colors.primary, opacity: pressed || creatingThread ? 0.8 : 1 },
            ]}
            testID="new-chat-button"
          >
            {creatingThread ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="edit-2" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : threads.length === 0 ? (
        <View style={styles.center}>
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            ]}
          >
            <Feather name="message-square" size={28} color={colors.mutedForeground} />
          </View>
          <Text
            style={[
              styles.emptyTitle,
              { color: colors.foreground, fontFamily: 'Inter_600SemiBold' },
            ]}
          >
            No conversations yet
          </Text>
          <Text
            style={[
              styles.emptySubtitle,
              { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
            ]}
          >
            Tap the edit icon to start chatting with Aura
          </Text>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ThreadItem
              thread={item}
              onPress={t => router.push(`/chat/${t.id}`)}
              onDelete={handleDeleteThread}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetch}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 16 },
          ]}
          scrollEnabled={threads.length > 0}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBtn: {},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {},
});
