import React, { useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatInput({ onSend, disabled = false, placeholder = 'Message Aura…' }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const canSend = text.trim().length > 0 && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    const msg = text.trim();
    setText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(msg);
    // Keep keyboard open
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 8),
          paddingTop: 8,
          paddingHorizontal: 12,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.row,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: colors.foreground,
              fontFamily: 'Inter_400Regular',
            },
          ]}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={4000}
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          editable={!disabled}
          testID="chat-input"
        />
        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor: canSend ? colors.primary : colors.muted,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          testID="send-button"
        >
          <Feather name="arrow-up" size={18} color={canSend ? '#fff' : colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 120,
    minHeight: 36,
    paddingTop: 4,
    paddingBottom: 4,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 1,
  },
});
