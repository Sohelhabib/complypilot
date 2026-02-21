import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { Card } from '../../src/components/Card';
import { ScoreCircle } from '../../src/components/ScoreCircle';
import { RiskBadge } from '../../src/components/RiskBadge';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { theme } from '../../src/utils/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardAPI.get,
    retry: 2,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  const hasComplianceData = data?.compliance_score !== null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          {user?.company_name && (
            <Text style={styles.companyName}>{user.company_name}</Text>
          )}
        </View>

        {/* Compliance Score Section */}
        {hasComplianceData ? (
          <Card style={styles.scoreCard}>
            <Text style={styles.sectionTitle}>Compliance Score</Text>
            <View style={styles.scoresContainer}>
              <ScoreCircle score={data.compliance_score || 0} label="Overall" />
              <View style={styles.subScores}>
                <ScoreRow label="GDPR" score={data.gdpr_score || 0} />
                <ScoreRow label="Cyber Essentials" score={data.cyber_essentials_score || 0} />
              </View>
            </View>
            {data.risk_level && (
              <View style={styles.riskLevelContainer}>
                <Text style={styles.riskLevelLabel}>Risk Level:</Text>
                <RiskBadge level={data.risk_level} />
              </View>
            )}
            <Text style={styles.lastCheck}>
              Last assessment: {data.last_health_check ? new Date(data.last_health_check).toLocaleDateString('en-GB') : 'N/A'}
            </Text>
          </Card>
        ) : (
          <Card style={styles.noDataCard}>
            <Ionicons name="clipboard-outline" size={48} color={theme.colors.primary} />
            <Text style={styles.noDataTitle}>No Compliance Data Yet</Text>
            <Text style={styles.noDataText}>
              Complete your first health check to see your compliance score
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push('/(tabs)/health-check')}
            >
              <Text style={styles.ctaButtonText}>Start Health Check</Text>
              <Ionicons name="arrow-forward" size={18} color={theme.colors.textOnPrimary} />
            </TouchableOpacity>
          </Card>
        )}

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Ionicons name="document-text" size={24} color={theme.colors.primary} />
            <Text style={styles.statNumber}>{data?.total_documents || 0}</Text>
            <Text style={styles.statLabel}>Documents</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            <Text style={styles.statNumber}>{data?.analyzed_documents || 0}</Text>
            <Text style={styles.statLabel}>Analysed</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="warning" size={24} color={theme.colors.warning} />
            <Text style={styles.statNumber}>{data?.risk_stats?.total || 0}</Text>
            <Text style={styles.statLabel}>Risks</Text>
          </Card>
        </View>

        {/* Risk Stats */}
        {data?.risk_stats && data.risk_stats.total > 0 && (
          <Card style={styles.riskStatsCard}>
            <Text style={styles.sectionTitle}>Risk Status</Text>
            <View style={styles.riskStatsGrid}>
              <RiskStatItem
                label="Identified"
                count={data.risk_stats.identified || 0}
                color={theme.colors.warning}
              />
              <RiskStatItem
                label="Mitigating"
                count={data.risk_stats.mitigating || 0}
                color={theme.colors.info}
              />
              <RiskStatItem
                label="Resolved"
                count={data.risk_stats.resolved || 0}
                color={theme.colors.success}
              />
              <RiskStatItem
                label="Accepted"
                count={data.risk_stats.accepted || 0}
                color={theme.colors.secondary}
              />
            </View>
          </Card>
        )}

        {/* Priority Actions */}
        {data?.priority_actions && data.priority_actions.length > 0 && (
          <Card style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>Priority Actions</Text>
            {data.priority_actions.slice(0, 5).map((action: any, index: number) => (
              <ActionItem key={index} action={action} />
            ))}
          </Card>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickActionButton
            icon="clipboard"
            label="Health Check"
            onPress={() => router.push('/(tabs)/health-check')}
          />
          <QuickActionButton
            icon="cloud-upload"
            label="Upload Policy"
            onPress={() => router.push('/(tabs)/documents')}
          />
          <QuickActionButton
            icon="list"
            label="Risk Register"
            onPress={() => router.push('/(tabs)/risk-register')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreRow({ label, score }: { label: string; score: number }) {
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreRowLabel}>{label}</Text>
      <View style={styles.scoreBarContainer}>
        <View style={[styles.scoreBar, { width: `${score}%` }]} />
      </View>
      <Text style={styles.scoreRowValue}>{score}%</Text>
    </View>
  );
}

function RiskStatItem({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={styles.riskStatItem}>
      <Text style={[styles.riskStatCount, { color }]}>{count}</Text>
      <Text style={styles.riskStatLabel}>{label}</Text>
    </View>
  );
}

function ActionItem({ action }: { action: any }) {
  const priorityColors = {
    high: theme.colors.danger,
    medium: theme.colors.warning,
    low: theme.colors.success,
  };

  return (
    <View style={styles.actionItem}>
      <View style={[styles.actionPriority, { backgroundColor: priorityColors[action.priority as keyof typeof priorityColors] || theme.colors.secondary }]} />
      <View style={styles.actionContent}>
        <Text style={styles.actionCategory}>{action.category}</Text>
        <Text style={styles.actionDescription} numberOfLines={2}>
          {action.description}
        </Text>
      </View>
    </View>
  );
}

function QuickActionButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickActionButton} onPress={onPress}>
      <View style={styles.quickActionIcon}>
        <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
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
  welcomeSection: {
    marginBottom: theme.spacing.lg,
  },
  welcomeText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  companyName: {
    fontSize: 14,
    color: theme.colors.primary,
    marginTop: 2,
  },
  scoreCard: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  scoresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  subScores: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  scoreRowLabel: {
    width: 100,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  scoreBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  scoreRowValue: {
    width: 40,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'right',
  },
  riskLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  riskLevelLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  lastCheck: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  noDataCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  noDataText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  ctaButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  riskStatsCard: {
    marginBottom: theme.spacing.md,
  },
  riskStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  riskStatItem: {
    alignItems: 'center',
  },
  riskStatCount: {
    fontSize: 24,
    fontWeight: '700',
  },
  riskStatLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  actionsCard: {
    marginBottom: theme.spacing.md,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  actionPriority: {
    width: 4,
    height: '100%',
    minHeight: 40,
    borderRadius: 2,
    marginRight: theme.spacing.sm,
  },
  actionContent: {
    flex: 1,
  },
  actionCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text,
    textAlign: 'center',
  },
});
