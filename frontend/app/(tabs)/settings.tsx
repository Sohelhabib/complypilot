import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userAPI, subscriptionAPI } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { theme } from '../../src/utils/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [companyName, setCompanyName] = useState(user?.company_name || '');
  const [employeeCount, setEmployeeCount] = useState(user?.employee_count?.toString() || '');

  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionAPI.get,
  });

  const { data: plansData } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: subscriptionAPI.getPlans,
  });

  const updateProfileMutation = useMutation({
    mutationFn: userAPI.updateProfile,
    onSuccess: () => {
      refreshUser();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update profile');
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      company_name: companyName || undefined,
      employee_count: employeeCount ? parseInt(employeeCount) : undefined,
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const currentPlan = subscription?.plan_type || 'free';
  const plans = plansData?.plans || [];
  const currentPlanDetails = plans.find((p: any) => p.id === currentPlan);

  if (!user) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              {user.picture ? (
                <View style={styles.avatarImage}>
                  <Text style={styles.avatarText}>
                    {user.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              ) : (
                <View style={styles.avatarImage}>
                  <Text style={styles.avatarText}>
                    {user.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsEditing(!isEditing)}
              style={styles.editButton}
            >
              <Ionicons
                name={isEditing ? 'close' : 'pencil'}
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Company Name</Text>
                <TextInput
                  style={styles.input}
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="Enter company name"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Number of Employees</Text>
                <TextInput
                  style={styles.input}
                  value={employeeCount}
                  onChangeText={setEmployeeCount}
                  placeholder="e.g., 25"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>
              <Button
                title="Save Changes"
                onPress={handleSaveProfile}
                loading={updateProfileMutation.isPending}
                style={styles.saveButton}
              />
            </View>
          ) : (
            <View style={styles.profileDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="business" size={18} color={theme.colors.textSecondary} />
                <Text style={styles.detailText}>
                  {user.company_name || 'No company name set'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="people" size={18} color={theme.colors.textSecondary} />
                <Text style={styles.detailText}>
                  {user.employee_count ? `${user.employee_count} employees` : 'Employee count not set'}
                </Text>
              </View>
              {user.business_type && (
                <View style={styles.detailRow}>
                  <Ionicons name="briefcase" size={18} color={theme.colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {user.business_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Subscription Section */}
        <Text style={styles.sectionTitle}>Subscription</Text>
        <Card style={styles.subscriptionCard}>
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>{currentPlanDetails?.name || 'Free'} Plan</Text>
              <Text style={styles.planStatus}>Active</Text>
            </View>
            {currentPlan !== 'free' && (
              <Text style={styles.planPrice}>
                £{currentPlanDetails?.price}/month
              </Text>
            )}
          </View>

          {currentPlanDetails?.features && (
            <View style={styles.featuresSection}>
              <Text style={styles.featuresTitle}>Your Plan Includes:</Text>
              <View style={styles.featuresList}>
                <FeatureItem
                  label="Health Checks"
                  value={currentPlanDetails.features.health_checks_per_month === -1 ? 'Unlimited' : `${currentPlanDetails.features.health_checks_per_month}/month`}
                />
                <FeatureItem
                  label="Document Analyses"
                  value={currentPlanDetails.features.document_analyses_per_month === -1 ? 'Unlimited' : `${currentPlanDetails.features.document_analyses_per_month}/month`}
                />
                <FeatureItem
                  label="Risk Register"
                  value={currentPlanDetails.features.risk_register ? 'Included' : 'Not Included'}
                  included={currentPlanDetails.features.risk_register}
                />
                <FeatureItem
                  label="Export Reports"
                  value={currentPlanDetails.features.export_reports ? 'Included' : 'Not Included'}
                  included={currentPlanDetails.features.export_reports}
                />
                <FeatureItem
                  label="Priority Support"
                  value={currentPlanDetails.features.priority_support ? 'Included' : 'Not Included'}
                  included={currentPlanDetails.features.priority_support}
                />
              </View>
            </View>
          )}

          {currentPlan === 'free' && (
            <View style={styles.upgradeSection}>
              <Text style={styles.upgradeText}>Upgrade to unlock more features</Text>
              <Button
                title="View Plans"
                onPress={() => Alert.alert('Coming Soon', 'Payment integration coming soon!')}
                variant="outline"
                size="small"
              />
            </View>
          )}
        </Card>

        {/* Available Plans */}
        {currentPlan === 'free' && plans.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Available Plans</Text>
            {plans.filter((p: any) => p.id !== 'free').map((plan: any) => (
              <Card key={plan.id} style={styles.planCard}>
                <View style={styles.planCardHeader}>
                  <Text style={styles.planCardName}>{plan.name}</Text>
                  <Text style={styles.planCardPrice}>£{plan.price}<Text style={styles.planCardPeriod}>/month</Text></Text>
                </View>
                <Text style={styles.planCardDescription}>{plan.description}</Text>
                <Button
                  title="Coming Soon"
                  onPress={() => Alert.alert('Coming Soon', 'Payment integration coming soon!')}
                  variant="outline"
                  size="small"
                  style={styles.planCardButton}
                />
              </Card>
            ))}
          </>
        )}

        {/* Support Section */}
        <Text style={styles.sectionTitle}>Support</Text>
        <Card style={styles.supportCard}>
          <TouchableOpacity style={styles.supportItem}>
            <Ionicons name="help-circle-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.supportText}>Help Centre</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportItem}>
            <Ionicons name="document-text-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.supportText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportItem}>
            <Ionicons name="shield-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.supportText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Logout Button */}
        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="outline"
          icon={<Ionicons name="log-out-outline" size={20} color={theme.colors.primary} />}
          style={styles.logoutButton}
        />

        <Text style={styles.versionText}>ComplyPilot v1.0.0</Text>
        <Text style={styles.builtByText}>Built by Cybersecurity Student at BPP University</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ label, value, included = true }: { label: string; value: string; included?: boolean }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons
        name={included ? 'checkmark-circle' : 'close-circle'}
        size={18}
        color={included ? theme.colors.success : theme.colors.textMuted}
      />
      <Text style={styles.featureLabel}>{label}</Text>
      <Text style={[styles.featureValue, !included && styles.featureValueDisabled]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  profileCard: {
    marginBottom: theme.spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: theme.spacing.md,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  profileEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  editButton: {
    padding: theme.spacing.sm,
  },
  profileDetails: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  editForm: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  saveButton: {
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  subscriptionCard: {
    marginBottom: theme.spacing.lg,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  planStatus: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '500',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  featuresSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  featuresList: {
    gap: theme.spacing.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  featureLabel: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  featureValue: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  featureValueDisabled: {
    color: theme.colors.textMuted,
  },
  upgradeSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'center',
  },
  upgradeText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  planCard: {
    marginBottom: theme.spacing.sm,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  planCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  planCardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  planCardPeriod: {
    fontSize: 12,
    fontWeight: '400',
    color: theme.colors.textSecondary,
  },
  planCardDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  planCardButton: {
    alignSelf: 'flex-start',
  },
  supportCard: {
    marginBottom: theme.spacing.lg,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  supportText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },
  logoutButton: {
    marginBottom: theme.spacing.md,
  },
  versionText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
});
