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
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  loadingText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    overflow: 'hidden',
    gap: 12,
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
  heroAccentSecondary: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    bottom: -20,
    left: -10,
    opacity: 0.12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTitleBlock: {
    flex: 1,
    gap: 4,
  },
  heroEyebrow: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  heroSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAmountPanel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  heroAmountLabel: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
  },
  heroAmountValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statChip: {
    flexGrow: 1,
    minWidth: '47%',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
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
    fontSize: 12,
  },
  statChipValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  sectionCount: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 12,
  },
  teamSection: {
    gap: 12,
    marginTop: 4,
  },
  teamSectionHeader: {
    gap: 4,
    paddingHorizontal: 2,
  },
  teamSectionTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 16,
  },
  teamSectionSub: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  personCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  personCardInner: {
    padding: 14,
    gap: 12,
  },
  personTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  personRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personRankText: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 13,
  },
  personAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  personBody: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  personName: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  personMeta: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  personAmountBlock: {
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 88,
  },
  personAmount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  personAmountLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
  },
  personStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  personStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  personStatDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    marginHorizontal: 8,
  },
  personStatLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginLeft: 'auto',
  },
  personStatValue: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },
  unassignedSection: {
    gap: 12,
    marginTop: 4,
  },
  unassignedOrderCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  unassignedOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unassignedOrderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unassignedOrderId: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  unassignedOrderTrailing: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 72,
  },
  unassignedOrderAmount: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
});
