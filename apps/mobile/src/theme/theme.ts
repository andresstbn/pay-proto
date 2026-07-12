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

// Hanken Grotesk (DESIGN.md). Con fuentes custom en RN el fontWeight no sintetiza
// la variante: cada peso es una familia distinta. `Txt` mapea fontWeight → familia.
export const fonts = {
  regular: 'HankenGrotesk_400Regular',
  semibold: 'HankenGrotesk_600SemiBold',
  bold: 'HankenGrotesk_700Bold',
  extrabold: 'HankenGrotesk_800ExtraBold',
} as const;

export const typography = {
  display: { fontSize: 32, fontFamily: fonts.bold },
  title: { fontSize: 22, fontFamily: fonts.bold },
  subtitle: { fontSize: 17, fontFamily: fonts.semibold },
  body: { fontSize: 15, fontFamily: fonts.regular },
  caption: { fontSize: 13, fontFamily: fonts.regular },
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
