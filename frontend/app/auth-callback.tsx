import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { theme } from '../src/utils/theme';

export default function AuthCallback() {
  const router = useRouter();
  const { login, setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use useRef to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Get session_id from URL hash
        let sessionId: string | null = null;
        
        if (typeof window !== 'undefined') {
          const hash = window.location.hash;
          const params = new URLSearchParams(hash.replace('#', ''));
          sessionId = params.get('session_id');
        }

        if (!sessionId) {
          console.error('No session_id found in URL');
          router.replace('/');
          return;
        }

        // Exchange session_id for session_token
        await login(sessionId);
        
        // Clean up URL and redirect to dashboard
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        
        router.replace('/(tabs)/dashboard');
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/');
      }
    };

    processAuth();
  }, [login, router]);

  return (
    <View style={styles.container}>
      <LoadingScreen message="Completing sign in..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
