import { StyleSheet } from 'react-native';
import { fonts } from '../../../../constants/fonts';

export const summaryTabStyles = StyleSheet.create({
  emptyState: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    overflow: 'hidden',
    gap: 6,
  },
  heroAccent: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -36,
    right: -24,
    opacity: 0.2,
  },
  heroEyebrow: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 24,
    letterSpacing: -0.4,
  },
  heroSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
  },
  statLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
  },
  statValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  pendingText: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
  },
});
