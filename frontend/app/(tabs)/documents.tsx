import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { documentAPI } from '../../src/services/api';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { theme } from '../../src/utils/theme';

export default function DocumentsScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [isAnalyzingDocument, setIsAnalyzingDocument] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: documentAPI.list,
  });

  const uploadMutation = useMutation({
    mutationFn: documentAPI.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      Alert.alert('Success', 'Document uploaded successfully');
    },
    onError: (error: any) => {
      Alert.alert('Upload Failed', error.message || 'Failed to upload document');
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: documentAPI.analyze,
    onMutate: () => {
      setIsAnalyzingDocument(true);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSelectedDocument({ ...selectedDocument, analysis_result: data.analysis });
      setAnalyzingId(null);
      setIsAnalyzingDocument(false);
      Alert.alert('Analysis Complete', 'Document has been analysed successfully');
    },
    onError: (error: any) => {
      setAnalyzingId(null);
      setIsAnalyzingDocument(false);
      Alert.alert('Analysis Failed', error.message || 'Failed to analyse document');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: documentAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setSelectedDocument(null);
      Alert.alert('Success', 'Document deleted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Delete Failed', error.message || 'Failed to delete document');
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        uploadMutation.mutate({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        });
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to select document');
    }
  };

  const handleAnalyze = (documentId: string) => {
    setAnalyzingId(documentId);
    analyzeMutation.mutate(documentId);
  };

  const handleDelete = (documentId: string) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(documentId) },
      ]
    );
  };

  const documents = data?.documents || [];

  if (isLoading) {
    return <LoadingScreen message="Loading documents..." />;
  }

  // Show analyzing full-screen state
  if (isAnalyzingDocument) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.analyzingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.analyzingTitle}>Analysing your compliance posture...</Text>
          <Text style={styles.analyzingSubtitle}>This usually takes 10–20 seconds.</Text>
          <View style={styles.analyzingSteps}>
            <Text style={styles.analyzingStep}>Reading document content...</Text>
            <Text style={styles.analyzingStep}>Checking GDPR requirements...</Text>
            <Text style={styles.analyzingStep}>Evaluating Cyber Essentials controls...</Text>
            <Text style={styles.analyzingStep}>Generating recommendations...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Document detail view
  if (selectedDocument) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedDocument(null)}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
            <Text style={styles.backText}>Back to Documents</Text>
          </TouchableOpacity>

          <Card style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Ionicons name="document-text" size={40} color={theme.colors.primary} />
              <View style={styles.detailInfo}>
                <Text style={styles.detailFilename}>{selectedDocument.filename}</Text>
                <Text style={styles.detailMeta}>
                  {(selectedDocument.file_size / 1024).toFixed(1)} KB
                </Text>
                <Text style={styles.detailMeta}>
                  Uploaded: {new Date(selectedDocument.created_at).toLocaleDateString('en-GB')}
                </Text>
              </View>
            </View>

            <View style={styles.statusBadge}>
              <View style={[
                styles.statusDot,
                { backgroundColor: selectedDocument.analysis_status === 'completed' ? theme.colors.success : 
                  selectedDocument.analysis_status === 'pending' ? theme.colors.warning : theme.colors.danger }
              ]} />
              <Text style={styles.statusText}>
                {selectedDocument.analysis_status === 'completed' ? 'Analysed' :
                 selectedDocument.analysis_status === 'pending' ? 'Pending Analysis' : 'Analysis Failed'}
              </Text>
            </View>
          </Card>

          {selectedDocument.analysis_status === 'pending' && (
            <Button
              title="Analyse Document"
              onPress={() => handleAnalyze(selectedDocument.id)}
              loading={analyzingId === selectedDocument.id}
              icon={<Ionicons name="analytics" size={20} color="#fff" />}
              style={styles.analyzeButton}
            />
          )}

          {selectedDocument.analysis_result && (
            <Card style={styles.analysisCard}>
              <Text style={styles.sectionTitle}>Analysis Results</Text>
              
              <View style={styles.analysisSection}>
                <Text style={styles.analysisLabel}>Document Type</Text>
                <Text style={styles.analysisValue}>{selectedDocument.analysis_result.document_type}</Text>
              </View>

              <View style={styles.analysisSection}>
                <Text style={styles.analysisLabel}>Overall Assessment</Text>
                <Text style={styles.analysisText}>{selectedDocument.analysis_result.overall_assessment}</Text>
              </View>

              {/* GDPR Compliance */}
              <View style={styles.complianceSection}>
                <Text style={styles.complianceTitle}>GDPR Compliance</Text>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Score:</Text>
                  <Text style={[
                    styles.scoreValue,
                    { color: selectedDocument.analysis_result.gdpr_compliance.score >= 70 ? theme.colors.success : 
                             selectedDocument.analysis_result.gdpr_compliance.score >= 40 ? theme.colors.warning : theme.colors.danger }
                  ]}>
                    {selectedDocument.analysis_result.gdpr_compliance.score}%
                  </Text>
                </View>
                
                {selectedDocument.analysis_result.gdpr_compliance.gaps?.length > 0 && (
                  <>
                    <Text style={styles.subSectionTitle}>Gaps Found:</Text>
                    {selectedDocument.analysis_result.gdpr_compliance.gaps.map((gap: string, i: number) => (
                      <View key={i} style={styles.listItem}>
                        <Ionicons name="alert-circle" size={16} color={theme.colors.warning} />
                        <Text style={styles.listText}>{gap}</Text>
                      </View>
                    ))}
                  </>
                )}

                {selectedDocument.analysis_result.gdpr_compliance.recommendations?.length > 0 && (
                  <>
                    <Text style={styles.subSectionTitle}>Recommendations:</Text>
                    {selectedDocument.analysis_result.gdpr_compliance.recommendations.map((rec: string, i: number) => (
                      <View key={i} style={styles.listItem}>
                        <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                        <Text style={styles.listText}>{rec}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>

              {/* Cyber Essentials Compliance */}
              <View style={styles.complianceSection}>
                <Text style={styles.complianceTitle}>Cyber Essentials Compliance</Text>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Score:</Text>
                  <Text style={[
                    styles.scoreValue,
                    { color: selectedDocument.analysis_result.cyber_essentials_compliance.score >= 70 ? theme.colors.success : 
                             selectedDocument.analysis_result.cyber_essentials_compliance.score >= 40 ? theme.colors.warning : theme.colors.danger }
                  ]}>
                    {selectedDocument.analysis_result.cyber_essentials_compliance.score}%
                  </Text>
                </View>

                {selectedDocument.analysis_result.cyber_essentials_compliance.gaps?.length > 0 && (
                  <>
                    <Text style={styles.subSectionTitle}>Gaps Found:</Text>
                    {selectedDocument.analysis_result.cyber_essentials_compliance.gaps.map((gap: string, i: number) => (
                      <View key={i} style={styles.listItem}>
                        <Ionicons name="alert-circle" size={16} color={theme.colors.warning} />
                        <Text style={styles.listText}>{gap}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>

              {/* Priority Actions */}
              {selectedDocument.analysis_result.priority_actions?.length > 0 && (
                <View style={styles.complianceSection}>
                  <Text style={styles.complianceTitle}>Priority Actions</Text>
                  {selectedDocument.analysis_result.priority_actions.map((action: any, i: number) => (
                    <View key={i} style={styles.actionItem}>
                      <View style={[
                        styles.priorityBadge,
                        { backgroundColor: action.priority === 'high' ? theme.colors.dangerLight : 
                                          action.priority === 'medium' ? theme.colors.warningLight : theme.colors.successLight }
                      ]}>
                        <Text style={[
                          styles.priorityText,
                          { color: action.priority === 'high' ? theme.colors.danger : 
                                   action.priority === 'medium' ? theme.colors.warning : theme.colors.success }
                        ]}>{action.priority.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.actionText}>{action.action}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Risk Summary */}
              {selectedDocument.analysis_result.risk_summary && (
                <View style={styles.riskSummary}>
                  <Text style={styles.subSectionTitle}>Risk Summary</Text>
                  <Text style={styles.riskText}>{selectedDocument.analysis_result.risk_summary}</Text>
                </View>
              )}
            </Card>
          )}

          <Button
            title="Delete Document"
            onPress={() => handleDelete(selectedDocument.id)}
            variant="danger"
            loading={deleteMutation.isPending}
            icon={<Ionicons name="trash" size={20} color="#fff" />}
            style={styles.deleteButton}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Upload Section */}
        <Card style={styles.uploadCard}>
          <Ionicons name="cloud-upload" size={48} color={theme.colors.primary} />
          <Text style={styles.uploadTitle}>Upload Policy Documents</Text>
          <Text style={styles.uploadText}>
            Upload your policies for AI-powered compliance analysis against GDPR and Cyber Essentials requirements.
          </Text>
          <Text style={styles.supportedFormats}>Supported: PDF, TXT, DOC, DOCX</Text>
          
          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Ionicons name="lock-closed" size={14} color={theme.colors.success} />
            <Text style={styles.securityText}>
              Your documents are processed securely and are not shared with third parties.
            </Text>
          </View>
          
          <Button
            title="Select Document"
            onPress={handleUpload}
            loading={uploadMutation.isPending}
            icon={<Ionicons name="add" size={20} color="#fff" />}
            style={styles.uploadButton}
          />
        </Card>

        {/* Documents List */}
        <Text style={styles.sectionTitle}>
          Your Documents ({documents.length})
        </Text>

        {documents.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>No documents uploaded yet</Text>
          </Card>
        ) : (
          documents.map((doc: any) => (
            <TouchableOpacity
              key={doc.id}
              onPress={() => setSelectedDocument(doc)}
            >
              <Card style={styles.documentCard}>
                <View style={styles.documentRow}>
                  <Ionicons
                    name={doc.file_type?.includes('pdf') ? 'document' : 'document-text'}
                    size={32}
                    color={theme.colors.primary}
                  />
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentName} numberOfLines={1}>
                      {doc.filename}
                    </Text>
                    <Text style={styles.documentMeta}>
                      {(doc.file_size / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString('en-GB')}
                    </Text>
                  </View>
                  <View style={styles.documentStatus}>
                    {doc.analysis_status === 'completed' ? (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                    ) : doc.analysis_status === 'pending' ? (
                      analyzingId === doc.id ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            handleAnalyze(doc.id);
                          }}
                          style={styles.analyzeSmallButton}
                        >
                          <Ionicons name="analytics" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                      )
                    ) : (
                      <Ionicons name="alert-circle" size={24} color={theme.colors.danger} />
                    )}
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
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
  uploadCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  uploadText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    maxWidth: 280,
  },
  supportedFormats: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  uploadButton: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  documentCard: {
    marginBottom: theme.spacing.sm,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  documentMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  documentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  analyzeSmallButton: {
    padding: 4,
  },
  // Detail view styles
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  backText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  detailCard: {
    marginBottom: theme.spacing.md,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  detailInfo: {
    flex: 1,
  },
  detailFilename: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  detailMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  analyzeButton: {
    marginBottom: theme.spacing.md,
  },
  analysisCard: {
    marginBottom: theme.spacing.md,
  },
  analysisSection: {
    marginBottom: theme.spacing.md,
  },
  analysisLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  analysisValue: {
    fontSize: 14,
    color: theme.colors.text,
    marginTop: 4,
  },
  analysisText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginTop: 4,
  },
  complianceSection: {
    backgroundColor: theme.colors.surfaceAlt,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  complianceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  scoreLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  listText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  actionItem: {
    marginBottom: theme.spacing.sm,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  riskSummary: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warningLight,
    borderRadius: theme.borderRadius.md,
  },
  riskText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  deleteButton: {
    marginTop: theme.spacing.md,
  },
});
