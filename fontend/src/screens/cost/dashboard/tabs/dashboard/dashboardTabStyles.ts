import { Platform, StyleSheet } from 'react-native';
import { fonts } from '../../../../../constants/fonts';

export function dashboardTabShadow(resolvedTheme: 'light' | 'dark') {
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

export const dashboardTabStyles = StyleSheet.create({
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
  },
  overviewHero: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 16,
  },
  heroAccent: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -60,
    right: -50,
    opacity: 0.35,
  },
  heroAccentSecondary: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    bottom: -30,
    left: -20,
    opacity: 0.2,
  },
  heroEyebrow: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTitleBlock: {
    flex: 1,
    gap: 4,
  },
  heroMonth: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 22,
    lineHeight: 28,
  },
  heroSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroAmountPanel: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroAmountLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  heroAmountValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statChip: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statChipLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
  },
  statChipValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 20,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginLeft: 2,
    marginRight: 2,
  },
  categorySectionTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  categorySectionBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categorySectionBadgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  categoryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  categoryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  categoryBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  categoryName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  categoryMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  categoryAmount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
    textAlign: 'right',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressPercent: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  progressShare: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
