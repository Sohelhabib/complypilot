import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';

interface RiskBadgeProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  size?: 'small' | 'medium';
}

export function RiskBadge({ level, size = 'medium' }: RiskBadgeProps) {
  const colors = {
    low: { bg: theme.colors.successLight, text: theme.colors.riskLow },
    medium: { bg: theme.colors.warningLight, text: theme.colors.riskMedium },
    high: { bg: '#FED7AA', text: theme.colors.riskHigh },
    critical: { bg: theme.colors.dangerLight, text: theme.colors.riskCritical },
  };

  const labels = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
    critical: 'Critical Risk',
  };

  return (
    <View
      style={[
        styles.badge,
        size === 'small' && styles.badgeSmall,
        { backgroundColor: colors[level].bg },
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'small' && styles.textSmall,
          { color: colors[level].text },
        ]}
      >
        {labels[level]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
  },
  badgeSmall: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 12,
  },
});
