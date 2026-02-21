import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { healthCheckAPI } from '../../src/services/api';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { ScoreCircle } from '../../src/components/ScoreCircle';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { theme } from '../../src/utils/theme';

interface QuestionResponse {
  question_id: string;
  answer: boolean;
  notes?: string;
}

// Risk level helpers
const getRiskLevel = (score: number): 'high' | 'medium' | 'low' => {
  if (score <= 40) return 'high';
  if (score <= 70) return 'medium';
  return 'low';
};

const getRiskColor = (level: string) => {
  switch (level) {
    case 'high':
    case 'critical':
      return theme.colors.danger;
    case 'medium':
      return theme.colors.warning;
    case 'low':
      return theme.colors.success;
    default:
      return theme.colors.secondary;
  }
};

const getRiskBgColor = (level: string) => {
  switch (level) {
    case 'high':
    case 'critical':
      return theme.colors.dangerLight;
    case 'medium':
      return theme.colors.warningLight;
    case 'low':
      return theme.colors.successLight;
    default:
      return theme.colors.surfaceAlt;
  }
};

const getRiskLabel = (level: string) => {
  switch (level) {
    case 'high':
    case 'critical':
      return 'HIGH RISK';
    case 'medium':
      return 'MEDIUM RISK';
    case 'low':
      return 'LOW RISK';
    default:
      return 'UNKNOWN';
  }
};

// Generate recommended next steps based on gaps
const generateNextSteps = (gaps: any[], score: number) => {
  const steps: { priority: string; action: string; category: string }[] = [];
  
  // Add general steps based on score
  if (score < 40) {
    steps.push({
      priority: 'critical',
      action: 'Conduct an urgent review of your data protection practices with a qualified DPO or consultant',
      category: 'General'
    });
  }
  
  // Add steps based on specific gaps
  const gdprGaps = gaps.filter(g => g.category === 'GDPR');
  const ceGaps = gaps.filter(g => g.category === 'Cyber Essentials');
  
  // GDPR-specific recommendations
  if (gdprGaps.some(g => g.subcategory === 'Data Inventory')) {
    steps.push({
      priority: 'high',
      action: 'Create a comprehensive Record of Processing Activities (ROPA) documenting all personal data you collect and process',
      category: 'GDPR'
    });
  }
  
  if (gdprGaps.some(g => g.subcategory === 'Privacy Notice')) {
    steps.push({
      priority: 'high',
      action: 'Draft or update your Privacy Notice to clearly explain how you collect, use, and protect personal data',
      category: 'GDPR'
    });
  }
  
  if (gdprGaps.some(g => g.subcategory === 'Data Subject Rights')) {
    steps.push({
      priority: 'high',
      action: 'Implement procedures to handle Subject Access Requests (SARs) within the 30-day statutory deadline',
      category: 'GDPR'
    });
  }
  
  if (gdprGaps.some(g => g.subcategory === 'Breach Response')) {
    steps.push({
      priority: 'critical',
      action: 'Develop a Data Breach Response Plan including 72-hour ICO notification procedures',
      category: 'GDPR'
    });
  }
  
  if (gdprGaps.some(g => g.subcategory === 'Third Parties')) {
    steps.push({
      priority: 'medium',
      action: 'Review and update Data Processing Agreements (DPAs) with all third-party processors',
      category: 'GDPR'
    });
  }
  
  if (gdprGaps.some(g => g.subcategory === 'Staff Training')) {
    steps.push({
      priority: 'medium',
      action: 'Schedule GDPR awareness training for all staff who handle personal data',
      category: 'GDPR'
    });
  }
  
  // Cyber Essentials recommendations
  if (ceGaps.some(g => g.subcategory === 'Firewalls')) {
    steps.push({
      priority: 'high',
      action: 'Review and document firewall configurations, ensuring all rules are necessary and up-to-date',
      category: 'Cyber Essentials'
    });
  }
  
  if (ceGaps.some(g => g.subcategory === 'Access Control')) {
    steps.push({
      priority: 'high',
      action: 'Implement Multi-Factor Authentication (MFA) for all cloud services and remote access',
      category: 'Cyber Essentials'
    });
  }
  
  if (ceGaps.some(g => g.subcategory === 'Patch Management')) {
    steps.push({
      priority: 'critical',
      action: 'Enable automatic updates for all operating systems and apply critical patches within 14 days',
      category: 'Cyber Essentials'
    });
  }
  
  if (ceGaps.some(g => g.subcategory === 'Malware Protection')) {
    steps.push({
      priority: 'high',
      action: 'Deploy endpoint protection software on all devices with automatic updates and real-time scanning',
      category: 'Cyber Essentials'
    });
  }
  
  if (ceGaps.some(g => g.subcategory === 'Secure Configuration')) {
    steps.push({
      priority: 'medium',
      action: 'Change all default passwords and remove unnecessary user accounts and software',
      category: 'Cyber Essentials'
    });
  }
  
  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  steps.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);
  
  return steps.slice(0, 8); // Return top 8 steps
};

export default function HealthCheckScreen() {
  const queryClient = useQueryClient();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>({});
  const [isAssessing, setIsAssessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: questionsData, isLoading: loadingQuestions } = useQuery({
    queryKey: ['health-check-questions'],
    queryFn: healthCheckAPI.getQuestions,
  });

  const { data: latestCheck, isLoading: loadingLatest } = useQuery({
    queryKey: ['latest-health-check'],
    queryFn: healthCheckAPI.getLatest,
    enabled: !isAssessing,
  });

  const submitMutation = useMutation({
    mutationFn: healthCheckAPI.submit,
    onMutate: () => {
      setIsAnalyzing(true);
    },
    onSuccess: (data) => {
      setResults(data);
      setShowResults(true);
      setIsAssessing(false);
      setIsAnalyzing(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['latest-health-check'] });
    },
    onError: (error: any) => {
      setIsAnalyzing(false);
      Alert.alert('Error', error.message || 'Failed to submit health check');
    },
  });

  const questions = questionsData?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(responses).length;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const handleAnswer = (answer: boolean) => {
    if (!currentQuestion) return;
    
    setResponses(prev => ({
      ...prev,
      [currentQuestion.id]: {
        question_id: currentQuestion.id,
        answer,
      },
    }));

    if (currentQuestionIndex < totalQuestions - 1) {
      setTimeout(() => setCurrentQuestionIndex(prev => prev + 1), 300);
    }
  };

  const handleSubmit = () => {
    const allResponses = Object.values(responses);
    
    if (allResponses.length < totalQuestions) {
      Alert.alert(
        'Incomplete Assessment',
        `You have answered ${allResponses.length} of ${totalQuestions} questions. Do you want to submit anyway?`,
        [
          { text: 'Continue Answering', style: 'cancel' },
          { text: 'Submit', onPress: () => submitMutation.mutate(allResponses) },
        ]
      );
    } else {
      submitMutation.mutate(allResponses);
    }
  };

  const startAssessment = () => {
    setIsAssessing(true);
    setShowResults(false);
    setResponses({});
    setCurrentQuestionIndex(0);
    setResults(null);
  };

  if (loadingQuestions || loadingLatest) {
    return <LoadingScreen message="Loading compliance questions..." />;
  }

  // Show analyzing state
  if (isAnalyzing) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.analyzingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.analyzingTitle}>Analysing your compliance posture...</Text>
          <Text style={styles.analyzingSubtitle}>This usually takes 10–20 seconds.</Text>
          <View style={styles.analyzingSteps}>
            <Text style={styles.analyzingStep}>Evaluating GDPR compliance...</Text>
            <Text style={styles.analyzingStep}>Checking Cyber Essentials controls...</Text>
            <Text style={styles.analyzingStep}>Generating risk assessment...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show results screen
  if (showResults && results) {
    const riskLevel = results.risk_level || getRiskLevel(results.compliance_score || 0);
    const nextSteps = generateNextSteps(results.gaps || [], results.compliance_score || 0);
    
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Results Header */}
          <View style={styles.resultsHeader}>
            <Ionicons name="document-text" size={48} color={theme.colors.primary} />
            <Text style={styles.resultsTitle}>Compliance Assessment Report</Text>
            <Text style={styles.resultsDate}>
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>

          {/* Risk Badge - Prominent */}
          <View style={[styles.riskBadgeLarge, { backgroundColor: getRiskBgColor(riskLevel) }]}>
            <Ionicons 
              name={riskLevel === 'low' ? 'shield-checkmark' : riskLevel === 'medium' ? 'warning' : 'alert-circle'} 
              size={32} 
              color={getRiskColor(riskLevel)} 
            />
            <Text style={[styles.riskBadgeText, { color: getRiskColor(riskLevel) }]}>
              {getRiskLabel(riskLevel)}
            </Text>
          </View>

          {/* Score Card */}
          <Card style={styles.scoreCard}>
            <Text style={styles.sectionTitle}>Compliance Scores</Text>
            <View style={styles.scoresRow}>
              <ScoreCircle score={results.compliance_score || 0} label="Overall" size={100} />
              <View style={styles.subScoresColumn}>
                <View style={styles.scoreBarItem}>
                  <View style={styles.scoreBarHeader}>
                    <Text style={styles.scoreBarLabel}>GDPR</Text>
                    <Text style={styles.scoreBarValue}>{results.gdpr_score || 0}%</Text>
                  </View>
                  <View style={styles.scoreBarBg}>
                    <View style={[
                      styles.scoreBarFill, 
                      { width: `${results.gdpr_score || 0}%`, backgroundColor: getRiskColor(getRiskLevel(results.gdpr_score || 0)) }
                    ]} />
                  </View>
                </View>
                <View style={styles.scoreBarItem}>
                  <View style={styles.scoreBarHeader}>
                    <Text style={styles.scoreBarLabel}>Cyber Essentials</Text>
                    <Text style={styles.scoreBarValue}>{results.cyber_essentials_score || 0}%</Text>
                  </View>
                  <View style={styles.scoreBarBg}>
                    <View style={[
                      styles.scoreBarFill, 
                      { width: `${results.cyber_essentials_score || 0}%`, backgroundColor: getRiskColor(getRiskLevel(results.cyber_essentials_score || 0)) }
                    ]} />
                  </View>
                </View>
              </View>
            </View>
          </Card>

          {/* Recommended Next Steps */}
          {nextSteps.length > 0 && (
            <Card style={styles.nextStepsCard}>
              <View style={styles.nextStepsHeader}>
                <Ionicons name="list-outline" size={24} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Recommended Next Steps</Text>
              </View>
              <Text style={styles.nextStepsSubtitle}>
                Prioritised action plan to improve your compliance posture
              </Text>
              {nextSteps.map((step, index) => (
                <View key={index} style={styles.nextStepItem}>
                  <View style={[
                    styles.stepNumber,
                    { backgroundColor: step.priority === 'critical' ? theme.colors.danger : 
                                       step.priority === 'high' ? theme.colors.warning : theme.colors.primary }
                  ]}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <View style={styles.stepHeader}>
                      <Text style={[
                        styles.stepPriority,
                        { color: step.priority === 'critical' ? theme.colors.danger : 
                                 step.priority === 'high' ? theme.colors.warning : theme.colors.primary }
                      ]}>
                        {step.priority.toUpperCase()}
                      </Text>
                      <Text style={styles.stepCategory}>{step.category}</Text>
                    </View>
                    <Text style={styles.stepAction}>{step.action}</Text>
                  </View>
                </View>
              ))}
            </Card>
          )}

          {/* Compliance Gaps */}
          {results.gaps && results.gaps.length > 0 && (
            <Card style={styles.gapsCard}>
              <Text style={styles.sectionTitle}>Identified Compliance Gaps ({results.gaps.length})</Text>
              {results.gaps.slice(0, 8).map((gap: any, index: number) => (
                <View key={index} style={styles.gapItem}>
                  <View style={styles.gapHeader}>
                    <View style={[
                      styles.priorityBadge,
                      { backgroundColor: gap.priority === 'high' ? theme.colors.dangerLight : 
                                         gap.priority === 'medium' ? theme.colors.warningLight : theme.colors.successLight }
                    ]}>
                      <Text style={[
                        styles.priorityBadgeText,
                        { color: gap.priority === 'high' ? theme.colors.danger : 
                                 gap.priority === 'medium' ? theme.colors.warning : theme.colors.success }
                      ]}>
                        {gap.priority.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.gapCategory}>{gap.category} • {gap.subcategory}</Text>
                  </View>
                  <Text style={styles.gapQuestion}>{gap.question}</Text>
                  <Text style={styles.gapGuidance}>{gap.guidance}</Text>
                </View>
              ))}
            </Card>
          )}

          {/* Upgrade Teaser */}
          <Card style={styles.upgradeCard}>
            <Ionicons name="star" size={24} color={theme.colors.warning} />
            <Text style={styles.upgradeTitle}>Unlock Full Compliance Report</Text>
            <Text style={styles.upgradeText}>
              Get detailed remediation guides, policy templates, and export your report as PDF
            </Text>
            <Button
              title="Coming Soon"
              onPress={() => Alert.alert('Coming Soon', 'Premium features will be available soon!')}
              variant="outline"
              size="small"
            />
          </Card>

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.disclaimerText}>
              ComplyPilot provides automated guidance only and does not constitute legal advice. 
              Organisations should seek professional advice for formal compliance certification.
            </Text>
          </View>

          <Button
            title="Return to Dashboard"
            onPress={() => {
              setShowResults(false);
              setIsAssessing(false);
            }}
            style={styles.returnButton}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show assessment screen
  if (isAssessing && currentQuestion) {
    const currentResponse = responses[currentQuestion.id];
    
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.assessmentContainer}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {answeredCount} of {totalQuestions} questions answered
            </Text>
          </View>

          <View style={styles.questionNav}>
            <TouchableOpacity
              onPress={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
            >
              <Ionicons name="chevron-back" size={24} color={currentQuestionIndex === 0 ? theme.colors.textMuted : theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.questionNumber}>
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </Text>
            <TouchableOpacity
              onPress={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
              disabled={currentQuestionIndex === totalQuestions - 1}
              style={[styles.navButton, currentQuestionIndex === totalQuestions - 1 && styles.navButtonDisabled]}
            >
              <Ionicons name="chevron-forward" size={24} color={currentQuestionIndex === totalQuestions - 1 ? theme.colors.textMuted : theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <Card style={styles.questionCard}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{currentQuestion.category}</Text>
              <Text style={styles.subcategoryText}>{currentQuestion.subcategory}</Text>
            </View>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
            <Text style={styles.guidanceText}>{currentQuestion.guidance}</Text>

            <View style={styles.answerButtons}>
              <TouchableOpacity
                style={[
                  styles.answerButton,
                  styles.yesButton,
                  currentResponse?.answer === true && styles.answerButtonSelected,
                ]}
                onPress={() => handleAnswer(true)}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={currentResponse?.answer === true ? '#fff' : theme.colors.success}
                />
                <Text style={[
                  styles.answerButtonText,
                  currentResponse?.answer === true && styles.answerButtonTextSelected,
                ]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.answerButton,
                  styles.noButton,
                  currentResponse?.answer === false && styles.answerButtonSelectedNo,
                ]}
                onPress={() => handleAnswer(false)}
              >
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={currentResponse?.answer === false ? '#fff' : theme.colors.danger}
                />
                <Text style={[
                  styles.answerButtonText,
                  currentResponse?.answer === false && styles.answerButtonTextSelected,
                ]}>No</Text>
              </TouchableOpacity>
            </View>
          </Card>

          <View style={styles.submitContainer}>
            <Button
              title={`Submit Assessment (${answeredCount}/${totalQuestions})`}
              onPress={handleSubmit}
              loading={submitMutation.isPending}
              disabled={answeredCount === 0}
              style={styles.submitButton}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Show initial screen with latest results or empty state
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {latestCheck ? (
          <>
            <Card style={styles.lastCheckCard}>
              <Text style={styles.sectionTitle}>Latest Assessment</Text>
              <Text style={styles.lastCheckDate}>
                {new Date(latestCheck.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              
              {/* Risk Badge */}
              <View style={[styles.riskBadgeMedium, { backgroundColor: getRiskBgColor(latestCheck.risk_level) }]}>
                <Text style={[styles.riskBadgeTextMedium, { color: getRiskColor(latestCheck.risk_level) }]}>
                  {getRiskLabel(latestCheck.risk_level)}
                </Text>
              </View>
              
              <View style={styles.scoresRow}>
                <ScoreCircle score={latestCheck.compliance_score || 0} label="Overall" size={100} />
                <View style={styles.subScoresColumn}>
                  <View style={styles.subScoreItem}>
                    <Text style={styles.subScoreLabel}>GDPR</Text>
                    <Text style={[styles.subScoreValue, { color: getRiskColor(getRiskLevel(latestCheck.gdpr_score || 0)) }]}>
                      {latestCheck.gdpr_score || 0}%
                    </Text>
                  </View>
                  <View style={styles.subScoreItem}>
                    <Text style={styles.subScoreLabel}>Cyber Essentials</Text>
                    <Text style={[styles.subScoreValue, { color: getRiskColor(getRiskLevel(latestCheck.cyber_essentials_score || 0)) }]}>
                      {latestCheck.cyber_essentials_score || 0}%
                    </Text>
                  </View>
                </View>
              </View>
            </Card>

            <Text style={styles.gapsTitle}>Top Compliance Gaps</Text>
            {latestCheck.gaps && latestCheck.gaps.slice(0, 5).map((gap: any, index: number) => (
              <Card key={index} style={styles.gapCard}>
                <View style={styles.gapHeader}>
                  <View style={[
                    styles.priorityBadgeSmall,
                    { backgroundColor: gap.priority === 'high' ? theme.colors.dangerLight : 
                                       gap.priority === 'medium' ? theme.colors.warningLight : theme.colors.successLight }
                  ]}>
                    <Text style={[
                      styles.priorityBadgeTextSmall,
                      { color: gap.priority === 'high' ? theme.colors.danger : 
                               gap.priority === 'medium' ? theme.colors.warning : theme.colors.success }
                    ]}>
                      {gap.priority.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.gapCategory}>{gap.category} • {gap.subcategory}</Text>
                </View>
                <Text style={styles.gapQuestion}>{gap.question}</Text>
              </Card>
            ))}
          </>
        ) : (
          <Card style={styles.emptyStateCard}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="clipboard-outline" size={64} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyStateTitle}>No Assessment Yet</Text>
            <Text style={styles.emptyStateText}>
              Run your first compliance check to see your readiness score.
            </Text>
            <View style={styles.emptyStateInfo}>
              <Ionicons name="time-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.emptyStateInfoText}>Takes under 3 minutes</Text>
            </View>
            <View style={styles.emptyStateInfo}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.emptyStateInfoText}>{totalQuestions} questions covering GDPR & Cyber Essentials</Text>
            </View>
          </Card>
        )}

        <Button
          title={latestCheck ? 'Start New Assessment' : 'Get My Compliance Score'}
          onPress={startAssessment}
          size="large"
          style={styles.startButton}
          icon={<Ionicons name={latestCheck ? 'refresh' : 'play'} size={20} color="#fff" />}
        />
      </ScrollView>
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
  assessmentContainer: {
    flex: 1,
    padding: theme.spacing.md,
  },
  // Analyzing state
  analyzingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  analyzingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  analyzingSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  analyzingSteps: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  analyzingStep: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  // Progress
  progressContainer: {
    marginBottom: theme.spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  questionNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  navButton: {
    padding: theme.spacing.sm,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  questionCard: {
    flex: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    backgroundColor: theme.colors.infoLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  subcategoryText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.text,
    lineHeight: 26,
    marginBottom: theme.spacing.md,
  },
  guidanceText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
    fontStyle: 'italic',
  },
  answerButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  answerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    gap: theme.spacing.sm,
  },
  yesButton: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.successLight,
  },
  noButton: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerLight,
  },
  answerButtonSelected: {
    backgroundColor: theme.colors.success,
  },
  answerButtonSelectedNo: {
    backgroundColor: theme.colors.danger,
  },
  answerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  answerButtonTextSelected: {
    color: '#fff',
  },
  submitContainer: {
    marginTop: theme.spacing.lg,
  },
  submitButton: {
    width: '100%',
  },
  // Results styles
  resultsHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  resultsDate: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  riskBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  riskBadgeText: {
    fontSize: 20,
    fontWeight: '700',
  },
  riskBadgeMedium: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.md,
  },
  riskBadgeTextMedium: {
    fontSize: 12,
    fontWeight: '700',
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
  scoresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  subScoresColumn: {
    flex: 1,
    gap: theme.spacing.md,
  },
  scoreBarItem: {
    gap: 4,
  },
  scoreBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreBarLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  scoreBarValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  scoreBarBg: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  subScoreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subScoreLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  subScoreValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Next steps
  nextStepsCard: {
    marginBottom: theme.spacing.md,
  },
  nextStepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  nextStepsSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  nextStepItem: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  stepPriority: {
    fontSize: 10,
    fontWeight: '700',
  },
  stepCategory: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  stepAction: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  // Gaps
  gapsCard: {
    marginBottom: theme.spacing.md,
  },
  gapItem: {
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  gapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  priorityBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  priorityBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  priorityBadgeTextSmall: {
    fontSize: 9,
    fontWeight: '700',
  },
  gapCategory: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  gapQuestion: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },
  gapGuidance: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  // Upgrade teaser
  upgradeCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.warningLight,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    marginBottom: theme.spacing.md,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  upgradeText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginVertical: theme.spacing.sm,
    maxWidth: 280,
  },
  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  returnButton: {
    marginTop: theme.spacing.sm,
  },
  // Initial screen
  lastCheckCard: {
    marginBottom: theme.spacing.md,
  },
  lastCheckDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  gapsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  gapCard: {
    marginBottom: theme.spacing.sm,
  },
  // Empty state
  emptyStateCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    maxWidth: 280,
  },
  emptyStateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  emptyStateInfoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  startButton: {
    marginTop: theme.spacing.md,
  },
});
