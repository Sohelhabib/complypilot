import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { theme } from '../src/utils/theme';

export default function LoginScreen() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/(tabs)/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    // Always use window.location.origin dynamically to ensure correct redirect across all environments
    const redirectUrl = window.location.origin + '/auth-callback';
    
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    
    if (Platform.OS === 'web') {
      window.location.href = authUrl;
    } else {
      Linking.openURL(authUrl);
    }
  };

  if (loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="shield-checkmark" size={64} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>ComplyPilot</Text>
          <Text style={styles.subtitle}>UK Compliance Made Simple</Text>
          <Text style={styles.tagline}>
            GDPR & Cyber Essentials compliance for UK small businesses
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <FeatureCard
            icon="clipboard-outline"
            title="Compliance Health Check"
            description="Assess your GDPR and Cyber Essentials readiness with our guided questionnaire"
          />
          <FeatureCard
            icon="document-text-outline"
            title="Policy Analysis"
            description="AI-powered analysis of your policies against regulatory requirements"
          />
          <FeatureCard
            icon="warning-outline"
            title="Risk Register"
            description="Generate and manage a tailored risk register for your business type"
          />
          <FeatureCard
            icon="analytics-outline"
            title="Compliance Dashboard"
            description="Track your compliance score and monitor recommended actions"
          />
        </View>

        {/* Login Section */}
        <View style={styles.loginSection}>
          <Card style={styles.loginCard}>
            <Text style={styles.loginTitle}>Get Started</Text>
            <Text style={styles.loginSubtitle}>
              Sign in to access your compliance dashboard
            </Text>
            <Button
              title="Sign in with Google"
              onPress={handleGoogleLogin}
              size="large"
              icon={<Ionicons name="logo-google" size={20} color="#fff" />}
              style={styles.googleButton}
            />
            <Text style={styles.trustText}>
              <Ionicons name="lock-closed" size={12} color={theme.colors.textMuted} />
              {' '}Trusted by UK SMEs. Enterprise-grade security.
            </Text>
          </Card>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Designed for UK businesses with 5-50 employees</Text>
          <Text style={styles.footerText}>GDPR & Cyber Essentials Certified Guidance</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <Card style={styles.featureCard}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon as any} size={28} color={theme.colors.primary} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.md,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  tagline: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  featuresSection: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  loginSection: {
    marginBottom: theme.spacing.xl,
  },
  loginCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  loginSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  googleButton: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  trustText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: theme.spacing.xl,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
});
