// ComplyPilot UK Corporate Theme - Blue/White
export const theme = {
  colors: {
    primary: '#1E40AF',       // Deep blue - main brand color
    primaryLight: '#3B82F6',  // Bright blue - buttons, links
    primaryDark: '#1E3A8A',   // Darker blue - pressed states
    secondary: '#64748B',     // Slate - secondary text
    
    background: '#F8FAFC',    // Light grey-white background
    surface: '#FFFFFF',       // White cards/surfaces
    surfaceAlt: '#F1F5F9',    // Alternate surface
    
    text: '#1E293B',          // Dark slate - primary text
    textSecondary: '#64748B', // Slate - secondary text
    textMuted: '#94A3B8',     // Light slate - muted text
    textOnPrimary: '#FFFFFF', // White text on primary
    
    success: '#10B981',       // Green - success states
    successLight: '#D1FAE5',  // Light green background
    warning: '#F59E0B',       // Amber - warning states
    warningLight: '#FEF3C7',  // Light amber background
    danger: '#EF4444',        // Red - error/danger states
    dangerLight: '#FEE2E2',   // Light red background
    info: '#0EA5E9',          // Sky blue - info states
    infoLight: '#E0F2FE',     // Light sky blue background
    
    border: '#E2E8F0',        // Light border
    borderDark: '#CBD5E1',    // Darker border
    
    // Risk level colors
    riskLow: '#10B981',
    riskMedium: '#F59E0B',
    riskHigh: '#F97316',
    riskCritical: '#EF4444',
    
    // Score colors
    scoreExcellent: '#10B981',
    scoreGood: '#22C55E',
    scoreFair: '#F59E0B',
    scorePoor: '#EF4444',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  typography: {
    h1: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
  },
};

export type Theme = typeof theme;
