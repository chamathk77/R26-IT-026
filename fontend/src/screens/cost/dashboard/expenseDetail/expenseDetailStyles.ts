import { Platform, StyleSheet } from 'react-native';
import { fonts } from '../../../../constants/fonts';

export function expenseDetailShadow(resolvedTheme: 'light' | 'dark') {
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

export const expenseDetailStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 8,
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -50,
    right: -40,
    opacity: 0.35,
  },
  heroAccentSecondary: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    bottom: -20,
    left: -20,
    opacity: 0.18,
  },
  heroEyebrow: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroBody: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 20,
    lineHeight: 26,
  },
  heroSubtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  typeBadgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },
  amountPanel: {
    marginTop: 18,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  amountValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 24,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statChip: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    minHeight: 88,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
  },
  statValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  proofCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  proofImageWrap: {
    position: 'relative',
  },
  proofImage: {
    width: '100%',
    height: 200,
  },
  proofOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  proofOverlayText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
    color: '#ffffff',
  },
  proofEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 10,
  },
  proofEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofEmptyTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  proofEmptySub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
  },
});
