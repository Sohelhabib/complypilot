import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Picker } from '@react-native-picker/picker';
import { riskRegisterAPI, userAPI } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { theme } from '../../src/utils/theme';

const BUSINESS_TYPES = [
  { label: 'Select business type...', value: '' },
  { label: 'Retail', value: 'retail' },
  { label: 'Professional Services', value: 'professional_services' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Technology', value: 'technology' },
  { label: 'Manufacturing', value: 'manufacturing' },
  { label: 'General', value: 'general' },
];

const RISK_STATUS_OPTIONS = [
  { label: 'Identified', value: 'identified', color: theme.colors.warning },
  { label: 'Mitigating', value: 'mitigating', color: theme.colors.info },
  { label: 'Resolved', value: 'resolved', color: theme.colors.success },
  { label: 'Accepted', value: 'accepted', color: theme.colors.secondary },
];

export default function RiskRegisterScreen() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBusinessType, setSelectedBusinessType] = useState(user?.business_type || '');
  const [selectedRisk, setSelectedRisk] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const { data: riskRegister, isLoading, refetch } = useQuery({
    queryKey: ['risk-register'],
    queryFn: riskRegisterAPI.get,
  });

  const generateMutation = useMutation({
    mutationFn: riskRegisterAPI.generate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-register'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refreshUser();
      Alert.alert('Success', 'Risk register generated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to generate risk register');
    },
  });

  const updateRiskMutation = useMutation({
    mutationFn: ({ riskId, status }: { riskId: string; status: string }) =>
      riskRegisterAPI.updateRisk(riskId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-register'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setShowStatusModal(false);
      setSelectedRisk(null);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to update risk');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleGenerate = () => {
    if (!selectedBusinessType) {
      Alert.alert('Select Business Type', 'Please select your business type to generate a risk register');
      return;
    }
    generateMutation.mutate({ business_type: selectedBusinessType });
  };

  const handleUpdateStatus = () => {
    if (selectedRisk && newStatus) {
      updateRiskMutation.mutate({ riskId: selectedRisk.risk_id, status: newStatus });
    }
  };

  const openStatusModal = (risk: any) => {
    setSelectedRisk(risk);
    setNewStatus(risk.status);
    setShowStatusModal(true);
  };

  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case 'high': return theme.colors.danger;
      case 'medium': return theme.colors.warning;
      case 'low': return theme.colors.success;
      default: return theme.colors.secondary;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return theme.colors.danger;
      case 'medium': return theme.colors.warning;
      case 'low': return theme.colors.success;
      default: return theme.colors.secondary;
    }
  };

  const getStatusOption = (status: string) => {
    return RISK_STATUS_OPTIONS.find(opt => opt.value === status) || RISK_STATUS_OPTIONS[0];
  };

  if (isLoading) {
    return <LoadingScreen message="Loading risk register..." />;
  }

  const risks = riskRegister?.risks || [];

  // Group risks by status
  const risksByStatus = {
    identified: risks.filter((r: any) => r.status === 'identified'),
    mitigating: risks.filter((r: any) => r.status === 'mitigating'),
    resolved: risks.filter((r: any) => r.status === 'resolved'),
    accepted: risks.filter((r: any) => r.status === 'accepted'),
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Generate Section */}
        {!riskRegister && (
          <Card style={styles.generateCard}>
            <Ionicons name="warning-outline" size={48} color={theme.colors.warning} />
            <Text style={styles.generateTitle}>Generate Risk Register</Text>
            <Text style={styles.generateText}>
              Create a tailored risk register based on your business type and industry.
            </Text>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Business Type</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedBusinessType}
                  onValueChange={setSelectedBusinessType}
                  style={styles.picker}
                >
                  {BUSINESS_TYPES.map(type => (
                    <Picker.Item key={type.value} label={type.label} value={type.value} />
                  ))}
                </Picker>
              </View>
            </View>

            <Button
              title="Generate Risk Register"
              onPress={handleGenerate}
              loading={generateMutation.isPending}
              disabled={!selectedBusinessType}
              icon={<Ionicons name="create" size={20} color="#fff" />}
              style={styles.generateButton}
            />
          </Card>
        )}

        {/* Risk Register Header */}
        {riskRegister && (
          <>
            <Card style={styles.headerCard}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.headerTitle}>Risk Register</Text>
                  <Text style={styles.headerSubtitle}>
                    {riskRegister.business_type} • {risks.length} Risks
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Regenerate Risk Register',
                      'This will replace your current risk register. Continue?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Regenerate', onPress: () => generateMutation.mutate({ business_type: selectedBusinessType || riskRegister.business_type }) },
                      ]
                    );
                  }}
                  style={styles.regenerateButton}
                >
                  <Ionicons name="refresh" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Status Summary */}
              <View style={styles.statusSummary}>
                {RISK_STATUS_OPTIONS.map(status => (
                  <View key={status.value} style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                    <Text style={styles.statusCount}>
                      {risksByStatus[status.value as keyof typeof risksByStatus].length}
                    </Text>
                    <Text style={styles.statusLabel}>{status.label}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Risk List */}
            {risks.map((risk: any) => (
              <Card key={risk.risk_id} style={styles.riskCard}>
                <View style={styles.riskHeader}>
                  <View style={styles.riskCategory}>
                    <Ionicons
                      name={risk.category === 'Cyber Security' ? 'shield' : risk.category === 'GDPR Compliance' ? 'document-lock' : 'business'}
                      size={20}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.categoryText}>{risk.category}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => openStatusModal(risk)}
                    style={[styles.statusBadge, { backgroundColor: getStatusOption(risk.status).color + '20' }]}
                  >
                    <View style={[styles.statusDotSmall, { backgroundColor: getStatusOption(risk.status).color }]} />
                    <Text style={[styles.statusBadgeText, { color: getStatusOption(risk.status).color }]}>
                      {getStatusOption(risk.status).label}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={getStatusOption(risk.status).color} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.riskTitle}>{risk.title}</Text>
                <Text style={styles.riskDescription}>{risk.description}</Text>

                <View style={styles.riskMetrics}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Likelihood</Text>
                    <View style={[styles.metricBadge, { backgroundColor: getLikelihoodColor(risk.likelihood) + '20' }]}>
                      <Text style={[styles.metricValue, { color: getLikelihoodColor(risk.likelihood) }]}>
                        {risk.likelihood?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Impact</Text>
                    <View style={[styles.metricBadge, { backgroundColor: getImpactColor(risk.impact) + '20' }]}>
                      <Text style={[styles.metricValue, { color: getImpactColor(risk.impact) }]}>
                        {risk.impact?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.mitigationSection}>
                  <Text style={styles.mitigationLabel}>Mitigation Strategy</Text>
                  <Text style={styles.mitigationText}>{risk.mitigation}</Text>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      {/* Status Update Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Risk Status</Text>
            <Text style={styles.modalRiskTitle}>{selectedRisk?.title}</Text>

            <View style={styles.statusOptions}>
              {RISK_STATUS_OPTIONS.map(status => (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.statusOption,
                    newStatus === status.value && styles.statusOptionSelected,
                    { borderColor: status.color }
                  ]}
                  onPress={() => setNewStatus(status.value)}
                >
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                  <Text style={[
                    styles.statusOptionText,
                    newStatus === status.value && { color: status.color, fontWeight: '600' }
                  ]}>
                    {status.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setShowStatusModal(false)}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Update"
                onPress={handleUpdateStatus}
                loading={updateRiskMutation.isPending}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  generateCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  generateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  generateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    maxWidth: 280,
  },
  pickerContainer: {
    width: '100%',
    marginTop: theme.spacing.lg,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  pickerWrapper: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  picker: {
    height: 50,
  },
  generateButton: {
    marginTop: theme.spacing.lg,
  },
  headerCard: {
    marginBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  regenerateButton: {
    padding: theme.spacing.sm,
  },
  statusSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusCount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statusLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  riskCard: {
    marginBottom: theme.spacing.md,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  riskCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  riskDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  riskMetrics: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  metricBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  mitigationSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  mitigationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  mitigationText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  modalRiskTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  statusOptions: {
    gap: theme.spacing.sm,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  statusOptionSelected: {
    borderWidth: 2,
  },
  statusOptionText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
});
