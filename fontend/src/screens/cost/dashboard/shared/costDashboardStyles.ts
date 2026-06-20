import { Platform, StyleSheet } from 'react-native';
import { fonts } from '../../../../constants/fonts';

export function costCardShadow(resolvedTheme: 'light' | 'dark') {
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

export const costDashboardStyles = StyleSheet.create({
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
  welcomeCard: {
    marginBottom: 12,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  welcomeAccent: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -40,
    right: -20,
    opacity: 0.25,
  },
  welcomeEyebrow: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  welcomeTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 20,
    lineHeight: 26,
  },
  welcomeBrand: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
    marginTop: 6,
  },
  quickActionsWrap: {
    marginBottom: 12,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 14,
  },
  sectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },
  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  dateFilterRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  clearRangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginLeft: 2,
  },
  clearRangeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
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
  totalCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  totalLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    opacity: 0.9,
  },
  totalAmount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 32,
    marginTop: 6,
    marginBottom: 4,
  },
  totalHint: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  statLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
  },
  actionBtnPrimary: {
    borderWidth: 0,
  },
  actionBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  listCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listBody: { flex: 1, minWidth: 0 },
  listTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  listSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginTop: 2,
  },
  listAmount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },
});
