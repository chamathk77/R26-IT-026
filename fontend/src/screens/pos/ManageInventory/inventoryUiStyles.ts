import { Platform, StyleSheet } from 'react-native';
import { fonts } from '../../../constants/fonts';

export function softShadow(resolvedTheme: 'light' | 'dark') {
  if (Platform.OS === 'android') {
    return { elevation: resolvedTheme === 'dark' ? 2 : 4 };
  }
  return {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: resolvedTheme === 'dark' ? 0.22 : 0.1,
    shadowRadius: 16,
  };
}

export const inventoryUi = StyleSheet.create({
  sectionEyebrow: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 13,
    marginBottom: 8,
  },
  fieldInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 15,
    marginBottom: 14,
  },
  fieldInputLast: {
    marginBottom: 0,
  },
});
