// Tokens de DESIGN.md — no inventar valores fuera de aquí.
export const colors = {
  brown700: '#964900', // primario: botones, links, texto de marca, inicio del gradiente
  brown500: '#86522B', // hover/estado secundario de brown700
  orange500: '#FF851B', // naranja Propi: fin del gradiente, acentos de marca, logo
  orange400: '#FFB787', // acento suave: bordes activos, glow, detalles sobre fondo oscuro
  peach300: '#FFBB8B', // CTA cálido, badges destacados
  peach100: '#FFDCC7', // fondo de badge/estado sobre peach300
  white: '#FFFFFF',
  gray50: '#FCF9F8',
  gray100: '#F0EDED',
  gray200: '#E5E2E1',
  gray500: '#574236',
  gray900: '#1C1B1B',
  green500: '#2FB673',
  red500: '#BA1A1A',
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
    shadowColor: colors.brown700,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
};
