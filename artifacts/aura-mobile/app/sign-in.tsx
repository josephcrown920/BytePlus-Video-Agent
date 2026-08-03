import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

export default function SignInScreen() {
  const colors = useColors();
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (mode === 'signUp' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signIn') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, name.trim());
        Alert.alert(
          'Check your email',
          'We sent you a confirmation link. Please verify your email before signing in.',
        );
        setMode('signIn');
        return;
      }
      router.replace('/threads');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Background glow */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={['rgba(168,85,247,0.22)', 'transparent']}
          style={{ height: 420, position: 'absolute', top: 0, left: 0, right: 0 }}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={[
            styles.content,
            { paddingTop: topPadding + 48, paddingBottom: (Platform.OS === 'web' ? 34 : insets.bottom) + 24 },
          ]}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <LinearGradient
              colors={['#A855F7', '#EC4899']}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="zap" size={28} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={[styles.appName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            Aura
          </Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {mode === 'signIn' ? 'Sign in to continue' : 'Create your account'}
          </Text>

          {/* Form */}
          <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {mode === 'signUp' && (
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    fontFamily: 'Inter_400Regular',
                  },
                ]}
                placeholder="Full name"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                testID="name-input"
              />
            )}
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  fontFamily: 'Inter_400Regular',
                },
              ]}
              placeholder="Email"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              testID="email-input"
            />
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  fontFamily: 'Inter_400Regular',
                  marginBottom: 0,
                },
              ]}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              testID="password-input"
            />
          </View>

          {error ? (
            <Text style={[styles.errorText, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>
              {error}
            </Text>
          ) : null}

          {/* Submit button */}
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: colors.primary, opacity: pressed || loading ? 0.85 : 1 },
            ]}
            testID="submit-button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[styles.submitText, { fontFamily: 'Inter_600SemiBold' }]}>
                {mode === 'signIn' ? 'Sign in' : 'Create account'}
              </Text>
            )}
          </Pressable>

          {/* Toggle mode */}
          <Pressable
            onPress={() => {
              setMode(m => (m === 'signIn' ? 'signUp' : 'signIn'));
              setError(null);
            }}
            style={styles.toggleBtn}
          >
            <Text style={[styles.toggleText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {mode === 'signIn' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={{ color: colors.primary }}>
                {mode === 'signIn' ? 'Sign up' : 'Sign in'}
              </Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoWrap: {
    marginBottom: 16,
  },
  logoGradient: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 32,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    marginBottom: 36,
  },
  form: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  submitBtn: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
  },
  toggleBtn: {
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
  },
});
