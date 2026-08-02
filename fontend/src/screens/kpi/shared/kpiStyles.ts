import { Platform, StyleSheet } from 'react-native';
import { fonts } from '../../../constants/fonts';

export function kpiCardShadow(resolvedTheme: 'light' | 'dark') {
  if (Platform.OS === 'android') {
    return { elevation: resolvedTheme === 'dark' ? 2 : 3 };
  }
  return {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: resolvedTheme === 'dark' ? 0.2 : 0.08,
    shadowRadius: 12,
  };
}

export const kpiStyles = StyleSheet.create({
  safe: { flex: 1 },
  shell: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 48,
  },
  topBarSide: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 14,
  },
  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  periodChipText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  dateFilterRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  sectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginLeft: 2,
  },
});
