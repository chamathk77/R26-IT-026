import { StyleSheet } from 'react-native';
import { fonts } from '../../../../constants/fonts';

export const productDemandStyles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
  sectionSubtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },

  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 13,
  },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 12,
  },
  retryBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },

  liveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  engineBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  engineBadgeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  refreshLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  refreshLiveBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },

  viewModeRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
    marginBottom: 14,
    gap: 4,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  viewModeBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewModeText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 12,
  },

  horizonPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  horizonPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  horizonPillText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 11,
  },

  productChipScroll: {
    marginBottom: 14,
  },
  productChipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  productChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  productChipText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 11,
  },

  chartCardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  chartTitle: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 15,
  },
  chartSubtitle: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    marginBottom: 12,
  },
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -16,
    marginBottom: 12,
  },
  chartLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chartLegendText: {
    fontFamily: fonts.PoppinsMedium,
    fontSize: 11,
  },

  chartStatRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  chartStatCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  chartStatValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 16,
  },
  chartStatLabel: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 10,
    marginTop: 2,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.PoppinsRegular,
    fontSize: 14,
    padding: 0,
  },
  resultsCount: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginBottom: 10,
  },
  downloadAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 14,
  },
  downloadAllBtnText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 13,
  },

  productCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  productTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  productIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  horizonCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  horizonLabel: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  horizonValue: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 17,
    marginTop: 4,
  },
  horizonRange: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 10,
    marginTop: 2,
  },
  productName: {
    flex: 1,
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 14,
  },
  demandHeadline: {
    fontFamily: fonts.PoppinsBold,
    fontSize: 30,
    marginTop: 4,
  },
  demandCaption: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 12,
    marginBottom: 14,
  },

  methodPill: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  methodPillText: {
    fontFamily: fonts.PoppinsSemiBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },

  footNote: {
    fontFamily: fonts.PoppinsRegular,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
});
