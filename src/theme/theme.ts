// Tokens de DESIGN.md — no inventar valores fuera de aquí.
export const colors = {
  navy900: '#0B1436',
  navy700: '#16204F',
  blue600: '#3057FF',
  blue500: '#4A6BFF',
  cyan400: '#5AD8F0',
  yellow300: '#F6D98F',
  yellow100: '#FBF0D6',
  white: '#FFFFFF',
  gray50: '#F7F8FC',
  gray100: '#EEF1F8',
  gray200: '#E1E5F0',
  gray500: '#6B7280',
  gray900: '#111827',
  green500: '#2FB673',
  red500: '#E5484D',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  card: 16,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '700' as const },
  title: { fontSize: 22, fontWeight: '700' as const },
  subtitle: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
};

export const shadow = {
  card: {
    shadowColor: colors.navy900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
};
