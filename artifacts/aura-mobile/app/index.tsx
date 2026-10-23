import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function IndexScreen() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    if (loading) return;
    if (session) {
      router.replace('/threads');
    } else {
      router.replace('/sign-in');
    }
  }, [session, loading]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
