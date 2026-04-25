// theme.ts
import { MD3LightTheme, MD3DarkTheme, MD3Theme } from 'react-native-paper';

const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...(MD3LightTheme.colors as any),
    // Palette derived from your brand colors (light mode)
    primary: '#C26144',
    onPrimary: '#FFFFFF',
    primaryContainer: '#F6E1DA',
    onPrimaryContainer: '#4F2315',

    secondary: '#926F65',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E9DFDB',
    onSecondaryContainer: '#3E2C27',

    tertiary: '#90733B',
    neutral: '#78716C',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#ECE3D2',
    onTertiaryContainer: '#403116',

    background: '#F8F6F4',
    onBackground: '#1F1B18',
    surface: '#FFFCFA',
    onSurface: '#1F1B18',
    surfaceVariant: '#E9E2DE',
    onSurfaceVariant: '#4F4742',
    outline: '#817872',

    error: '#DC2626',
    errorContainer: '#FEE2E2',
    onErrorContainer: '#7F1D1D',
    onSurfaceDisabled: '#A1A1AA',

    // Success palette
    success: '#15803D',
    successContainer: '#DCFCE7',
    onSuccessContainer: '#14532D',
  } as any,
};

const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...(MD3DarkTheme.colors as any),
    // Palette derived from your brand colors (dark mode)
    primary: '#C26144',
    onPrimary: '#2F140C',
    primaryContainer: '#6E3A29',
    onPrimaryContainer: '#F6E1DA',

    secondary: '#926F65',
    onSecondary: '#251A17',
    secondaryContainer: '#5A453E',
    onSecondaryContainer: '#E9DFDB',

    tertiary: '#90733B',
    neutral: '#78716C',
    onTertiary: '#221A0D',
    tertiaryContainer: '#5A4825',
    onTertiaryContainer: '#ECE3D2',

    background: '#171311',
    onBackground: '#EAE3DF',
    surface: '#221D1B',
    onSurface: '#EAE3DF',
    surfaceVariant: '#3A322F',
    onSurfaceVariant: '#CEC4BE',
    outline: '#9A908A',

    error: '#F87171',
    errorContainer: '#7F1D1D',
    onErrorContainer: '#FEE2E2',
    onSurfaceDisabled: '#71717A',

    // Success palette
    success: '#4ADE80',
    successContainer: '#14532D',
    onSuccessContainer: '#DCFCE7',
  } as any,
};

export type ThemeMode = 'light' | 'dark' | 'system';

export const getTheme = (mode: 'light' | 'dark'): MD3Theme => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

export { lightTheme, darkTheme };
