import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { healthCheckAPI } from '../../src/services/api';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { ScoreCircle } from '../../src/components/ScoreCircle';
import { RiskBadge } from '../../src/components/RiskBadge';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { theme } from '../../src/utils/theme';

interface QuestionResponse {
  question_id: string;
  answer: boolean;
  notes?: string;
}

export default function HealthCheckScreen() {
  const queryClient = useQueryClient();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, QuestionResponse>>({});
  const [isAssessing, setIsAssessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

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
    onSuccess: (data) => {
      setResults(data);
      setShowResults(true);
      setIsAssessing(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['latest-health-check'] });
    },
    onError: (error: any) => {
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

    // Auto-advance to next question
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

  // Show results screen
  if (showResults && results) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.resultsHeader}>
            <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
            <Text style={styles.resultsTitle}>Assessment Complete</Text>
          </View>

          <Card style={styles.scoreCard}>
            <View style={styles.scoresRow}>
              <ScoreCircle score={results.compliance_score || 0} label="Overall" size={100} />
              <View style={styles.subScoresColumn}>
                <View style={styles.subScoreItem}>
                  <Text style={styles.subScoreLabel}>GDPR</Text>
                  <Text style={styles.subScoreValue}>{results.gdpr_score || 0}%</Text>
                </View>
                <View style={styles.subScoreItem}>
                  <Text style={styles.subScoreLabel}>Cyber Essentials</Text>
                  <Text style={styles.subScoreValue}>{results.cyber_essentials_score || 0}%</Text>
                </View>
              </View>
            </View>
            <View style={styles.riskContainer}>
              <Text style={styles.riskLabel}>Risk Level:</Text>
              <RiskBadge level={results.risk_level} />
            </View>
          </Card>

          {results.gaps && results.gaps.length > 0 && (
            <Card style={styles.gapsCard}>
              <Text style={styles.sectionTitle}>Compliance Gaps ({results.gaps.length})</Text>
              {results.gaps.slice(0, 10).map((gap: any, index: number) => (
                <View key={index} style={styles.gapItem}>
                  <View style={styles.gapHeader}>
                    <View style={[
                      styles.priorityDot,
                      { backgroundColor: gap.priority === 'high' ? theme.colors.danger : gap.priority === 'medium' ? theme.colors.warning : theme.colors.success }
                    ]} />
                    <Text style={styles.gapCategory}>{gap.subcategory}</Text>
                  </View>
                  <Text style={styles.gapQuestion}>{gap.question}</Text>
                  <Text style={styles.gapGuidance}>{gap.guidance}</Text>
                </View>
              ))}
            </Card>
          )}

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
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {answeredCount} of {totalQuestions} questions answered
            </Text>
          </View>

          {/* Question Navigation */}
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

          {/* Question Card */}
          <Card style={styles.questionCard}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{currentQuestion.category}</Text>
              <Text style={styles.subcategoryText}>{currentQuestion.subcategory}</Text>
            </View>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
            <Text style={styles.guidanceText}>{currentQuestion.guidance}</Text>

            {/* Answer Buttons */}
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

          {/* Submit Button */}
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

  // Show initial screen with latest results or start button
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {latestCheck ? (
          <>
            <Card style={styles.lastCheckCard}>
              <Text style={styles.sectionTitle}>Last Assessment</Text>
              <Text style={styles.lastCheckDate}>
                {new Date(latestCheck.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <View style={styles.scoresRow}>
                <ScoreCircle score={latestCheck.compliance_score || 0} label="Overall" size={100} />
                <View style={styles.subScoresColumn}>
                  <View style={styles.subScoreItem}>
                    <Text style={styles.subScoreLabel}>GDPR</Text>
                    <Text style={styles.subScoreValue}>{latestCheck.gdpr_score || 0}%</Text>
                  </View>
                  <View style={styles.subScoreItem}>
                    <Text style={styles.subScoreLabel}>Cyber Essentials</Text>
                    <Text style={styles.subScoreValue}>{latestCheck.cyber_essentials_score || 0}%</Text>
                  </View>
                </View>
              </View>
              <View style={styles.riskContainer}>
                <Text style={styles.riskLabel}>Risk Level:</Text>
                <RiskBadge level={latestCheck.risk_level} />
              </View>
            </Card>

            <Text style={styles.gapsTitle}>Top Compliance Gaps</Text>
            {latestCheck.gaps && latestCheck.gaps.slice(0, 5).map((gap: any, index: number) => (
              <Card key={index} style={styles.gapCard}>
                <View style={styles.gapHeader}>
                  <View style={[
                    styles.priorityDot,
                    { backgroundColor: gap.priority === 'high' ? theme.colors.danger : gap.priority === 'medium' ? theme.colors.warning : theme.colors.success }
                  ]} />
                  <Text style={styles.gapCategory}>{gap.category} - {gap.subcategory}</Text>
                </View>
                <Text style={styles.gapQuestion}>{gap.question}</Text>
              </Card>
            ))}
          </>
        ) : (
          <Card style={styles.welcomeCard}>
            <Ionicons name="clipboard-outline" size={64} color={theme.colors.primary} />
            <Text style={styles.welcomeTitle}>Compliance Health Check</Text>
            <Text style={styles.welcomeText}>
              Assess your organisation's compliance with GDPR and Cyber Essentials requirements.
            </Text>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={theme.colors.info} />
              <Text style={styles.infoText}>
                This assessment contains {totalQuestions} questions across data protection and cyber security domains.
              </Text>
            </View>
          </Card>
        )}

        <Button
          title={latestCheck ? 'Start New Assessment' : 'Begin Assessment'}
          onPress={startAssessment}
          size="large"
          style={styles.startButton}
          icon={<Ionicons name="play" size={20} color="#fff" />}
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
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  scoreCard: {
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
    color: theme.colors.text,
  },
  riskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  riskLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  gapsCard: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
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
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gapCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
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
  returnButton: {
    marginTop: theme.spacing.md,
  },
  // Initial screen styles
  lastCheckCard: {
    marginBottom: theme.spacing.md,
  },
  lastCheckDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
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
  welcomeCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  welcomeText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    maxWidth: 300,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.infoLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.info,
  },
  startButton: {
    marginTop: theme.spacing.md,
  },
});
