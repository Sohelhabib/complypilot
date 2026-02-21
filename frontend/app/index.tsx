import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { theme } from '../src/utils/theme';

const PRIVACY_POLICY = `PRIVACY POLICY — COMPLYPILOT
Last updated: 21 February 2026

IMPORTANT NOTICE
ComplyPilot provides automated compliance guidance for informational purposes only and does not constitute legal advice. Users should seek qualified professional advice for formal compliance obligations.

---

1. WHO WE ARE

ComplyPilot ("we", "us", "our") is an AI-powered compliance assessment tool designed for UK small and medium-sized businesses.

If you have any questions about this Privacy Policy, you may contact us at:
Email: support@complypilot.co.uk

---

2. DATA WE COLLECT

We may collect and process the following categories of personal data:

2.1 Account Information
• Name (if provided)
• Email address
• Authentication provider details (e.g., Google login)

2.2 Usage Data
• Responses to compliance questionnaires
• Interaction with the platform
• Device and browser information
• IP address and approximate location

2.3 Uploaded Documents
If you choose to upload policies or documents, we process the content solely to provide automated analysis.

IMPORTANT: Users should avoid uploading highly sensitive personal data unless necessary.

---

3. HOW WE USE YOUR DATA

We use your data to:

• Provide compliance health checks
• Generate automated risk assessments
• Improve platform functionality
• Maintain platform security
• Communicate service updates
• Monitor usage and prevent abuse

We do NOT sell your personal data.

---

4. AI PROCESSING

ComplyPilot uses third-party AI service providers (such as OpenAI) to analyse user inputs and uploaded documents.

By using the service, you acknowledge that:

• Your submitted content may be processed by secure third-party AI providers
• Processing occurs solely to generate your requested analysis
• Outputs are automated and may not be fully accurate

---

5. LEGAL BASIS (UK GDPR)

Under the UK GDPR, our lawful bases for processing are:

• Contract — to provide the requested service
• Legitimate interests — to improve and secure the platform
• Consent — where required for optional features

---

6. DATA SHARING

We may share data with:

• Cloud hosting providers
• AI processing providers
• Analytics providers
• Legal or regulatory authorities where required by law

All processors are required to implement appropriate security measures.

We do NOT sell personal data to third parties.

---

7. INTERNATIONAL TRANSFERS

Some of our service providers may process data outside the United Kingdom or European Economic Area.

Where this occurs, we implement appropriate safeguards such as:

• Standard contractual clauses
• Adequacy decisions
• Equivalent data protection measures

---

8. DATA RETENTION

We retain personal data only as long as necessary to:

• Provide the service
• Comply with legal obligations
• Resolve disputes
• Enforce agreements

Users may request deletion of their data at any time (see Section 11).

---

9. SECURITY

We implement reasonable technical and organisational measures to protect your data.

However, no internet transmission or storage system can be guaranteed 100% secure. Users upload information at their own risk.

---

10. YOUR RIGHTS (UK USERS)

Under UK GDPR, you have the right to:

• Access your personal data
• Correct inaccurate data
• Request deletion ("right to be forgotten")
• Restrict processing
• Object to processing
• Data portability
• Lodge a complaint with the UK Information Commissioner's Office (ICO)

To exercise your rights, contact: support@complypilot.co.uk

---

11. DATA DELETION REQUESTS

To request deletion of your data, email: support@complypilot.co.uk

We will respond within the timeframes required under applicable data protection law.

---

12. CHILDREN'S PRIVACY

ComplyPilot is not intended for individuals under 18 years of age. We do not knowingly collect personal data from children.

---

13. CHANGES TO THIS POLICY

We may update this Privacy Policy from time to time. The updated version will be posted on this page with a revised "Last updated" date.

---

14. DISCLAIMER

ComplyPilot provides automated compliance guidance only. The platform does not guarantee regulatory compliance and is not a substitute for professional legal, cybersecurity, or compliance advice.

---

END OF POLICY`;

export default function LoginScreen() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/(tabs)/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  const handleGoogleLogin = () => {
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
          <Text style={styles.brandName}>ComplyPilot</Text>
          <Text style={styles.heroTitle}>AI Compliance Health Check for UK Small Businesses</Text>
          <Text style={styles.heroSubtitle}>
            Assess your GDPR and Cyber Essentials readiness in under 3 minutes. Built for UK SMEs.
          </Text>
          
          {/* Primary CTA */}
          <Button
            title="Get My Compliance Score"
            onPress={handleGoogleLogin}
            size="large"
            icon={<Ionicons name="checkmark-circle" size={20} color="#fff" />}
            style={styles.primaryCTA}
          />
        </View>

        {/* Trust Bullets */}
        <View style={styles.trustBulletsSection}>
          <TrustBullet icon="business" text="Built for UK SMEs" />
          <TrustBullet icon="shield-checkmark" text="GDPR & Cyber Essentials focused" />
          <TrustBullet icon="chatbubble-ellipses" text="No legal jargon — simple guidance" />
          <TrustBullet icon="lock-closed" text="Secure and confidential" />
        </View>

        {/* Features Section */}
        <Text style={styles.sectionTitle}>How ComplyPilot Helps</Text>
        <View style={styles.featuresSection}>
          <FeatureCard
            icon="clipboard-outline"
            title="Compliance Health Check"
            description="Answer simple questions to assess your GDPR and Cyber Essentials readiness"
          />
          <FeatureCard
            icon="document-text-outline"
            title="AI Policy Analysis"
            description="Upload your policies and get AI-powered gap analysis against UK regulations"
          />
          <FeatureCard
            icon="warning-outline"
            title="Risk Register"
            description="Generate a tailored risk register based on your business type"
          />
          <FeatureCard
            icon="analytics-outline"
            title="Actionable Insights"
            description="Get clear, numbered action plans to improve your compliance posture"
          />
        </View>

        {/* Secondary CTA */}
        <View style={styles.secondaryCTASection}>
          <Card style={styles.ctaCard}>
            <Ionicons name="rocket" size={32} color={theme.colors.primary} />
            <Text style={styles.ctaTitle}>Ready to check your compliance?</Text>
            <Text style={styles.ctaSubtitle}>
              Sign in with Google to get started. Free compliance assessment.
            </Text>
            <Button
              title="Sign in with Google"
              onPress={handleGoogleLogin}
              size="large"
              icon={<Ionicons name="logo-google" size={20} color="#fff" />}
              style={styles.googleButton}
            />
            <Text style={styles.ctaTrust}>
              <Ionicons name="lock-closed" size={12} color={theme.colors.textMuted} />
              {' '}Enterprise-grade security. Your data stays confidential.
            </Text>
          </Card>
        </View>

        {/* Professional Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerDivider}>|</Text>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerDivider}>|</Text>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Contact</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.footerDisclaimer}>
            ComplyPilot provides automated guidance only and does not constitute legal advice. 
            Organisations should seek professional advice for formal compliance certification.
          </Text>
          
          <View style={styles.footerBottom}>
            <Text style={styles.footerCopyright}>© 2026 ComplyPilot</Text>
            <Text style={styles.footerLocation}>Based in the United Kingdom</Text>
            <Text style={styles.builtByText}>Built by Cybersecurity Student at BPP University</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TrustBullet({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.trustBullet}>
      <Ionicons name={icon as any} size={18} color={theme.colors.success} />
      <Text style={styles.trustBulletText}>{text}</Text>
    </View>
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
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
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
  brandName: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
    maxWidth: 340,
  },
  primaryCTA: {
    width: '100%',
    maxWidth: 300,
  },
  trustBulletsSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  trustBullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  trustBulletText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
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
  secondaryCTASection: {
    marginBottom: theme.spacing.xl,
  },
  ctaCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
    maxWidth: 280,
  },
  googleButton: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  ctaTrust: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    flexWrap: 'wrap',
  },
  footerLink: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  footerDivider: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginHorizontal: theme.spacing.sm,
  },
  footerDisclaimer: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  footerBottom: {
    alignItems: 'center',
    gap: 4,
  },
  footerCopyright: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  footerLocation: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  builtByText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
    marginTop: theme.spacing.sm,
  },
});
